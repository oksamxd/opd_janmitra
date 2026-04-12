/**
 * Jana Orchestrator Service — Master Controller
 *
 * This is the BRAIN of the OPD system. It:
 * 1. Receives user messages
 * 2. Loads/creates persistent sessions from DB
 * 3. Gets current state from the state machine
 * 4. Routes to the right conversational handler
 * 5. Transitions state deterministically
 * 6. Returns structured JanaResponse with type + options
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { AiService } from '../healthcare/services/ai.service';
import { AuditLogger } from '../engine/audit-logger';
import { TriggerEngine } from '../engine/trigger-engine';
import { MemberActions } from '../actions/member.actions';
import { CaseActions } from '../actions/case.actions';
import { DoctorActions } from '../actions/doctor.actions';
import { AppointmentActions } from '../actions/appointment.actions';
import { OutcomeActions } from '../actions/outcome.actions';
import { DeliveryActions } from '../actions/delivery.actions';
import {
  OpdState,
  STATE_LABELS,
  STATE_EXPECTATIONS,
  transition,
  getProgressPercent,
  getAllStatesOrdered,
} from '../engine/state-machine';
import {
  isEmergency,
  assessSeverity,
  decideOutcome,
  mapSymptomsToSpecialty,
  getRecommendedMedicines,
  getRecommendedTests,
} from '../engine/rule-engine';

// ─── RESPONSE CONTRACT ──────────────────────────────────────────────────────

export interface JanaOption {
  label: string;
  value: string;
}

export interface JanaResponse {
  message: string;
  type: 'text' | 'options' | 'input' | 'date' | 'slots' | 'doctors';
  options?: JanaOption[];
  meta?: any;
  action: string;
  data: any;
  state: string;
  stateLabel: string;
  progress: number;
  sessionId: string;
  autoAdvance?: boolean;
}

// ─── SERVICE ────────────────────────────────────────────────────────────────

@Injectable()
export class JanaOrchestratorService {
  private readonly logger = new Logger(JanaOrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private audit: AuditLogger,
    private triggers: TriggerEngine,
    private memberActions: MemberActions,
    private caseActions: CaseActions,
    private doctorActions: DoctorActions,
    private appointmentActions: AppointmentActions,
    private outcomeActions: OutcomeActions,
    private deliveryActions: DeliveryActions,
  ) {}

  // ─── MAIN ENTRY POINT ────────────────────────────────────────────────────

  async handleMessage(sessionId: string, message: string, language: string = 'English'): Promise<JanaResponse> {
    try {
      let session = await this.loadSession(sessionId);
      if (!session) session = await this.createSession(sessionId);

      // Save language preference in inputs if provided
      const inputs = (session.collected_inputs as any) || {};
      inputs.language = language;

      const currentState = session.opd_state as OpdState;
      this.logger.log(`[${sessionId}] State: ${currentState} | Language: ${language} | Msg: "${message}"`);

      const result = await this.processState(session, currentState, message, language);
      await this.saveSession(session.session_id, result.newState, result.inputs, result.aiHistory);
      return this.buildResponse(session.session_id, result);

    } catch (error) {
      this.logger.error(`Orchestrator error: ${error}`);
      await this.audit.logError('ORCHESTRATOR', 'HANDLE_MESSAGE', 'opd_sessions', sessionId, error as Error);
      return {
        message: 'I apologize for the inconvenience. Something went wrong. Could you please repeat your last response?',
        type: 'text',
        action: 'ERROR_RECOVERY',
        data: { error: (error as Error).message },
        state: 'ERROR',
        stateLabel: 'Error',
        progress: 0,
        sessionId,
      };
    }
  }

  // ─── SESSION RESUME ──────────────────────────────────────────────────────

  async getSessionStatus(sessionId: string): Promise<JanaResponse | null> {
    const session = await this.loadSession(sessionId);
    if (!session) return null;
    const state = session.opd_state as OpdState;
    const expectation = STATE_EXPECTATIONS[state];
    const inputs = session.collected_inputs as any;

    const message = await this.aiService.formatResponse({
      currentState: state,
      stateLabel: STATE_LABELS[state],
      systemPrompt: `The patient has returned to their session. They were at the "${STATE_LABELS[state]}" step. ${expectation.prompt}. Welcome them back and remind them where they left off.`,
      data: inputs,
      language: inputs.language,
    });

    const options = this.buildOptions(expectation.options || []);
    return {
      message,
      type: options.length > 0 ? 'options' : 'text',
      options,
      action: 'SESSION_RESUMED',
      data: { currentState: state, inputs },
      state,
      stateLabel: STATE_LABELS[state],
      progress: getProgressPercent(state),
      sessionId,
    };
  }

  // ─── MAIN STATE ROUTER ───────────────────────────────────────────────────

  private async processState(session: any, currentState: OpdState, message: string, language: string) {
    const inputs = (session.collected_inputs as any) || {};
    const aiHistory = (session.ai_history as any) || [];

    switch (currentState) {
      // Member identification
      case OpdState.NEW:               return this.handleNew(session, message, inputs, aiHistory);
      case OpdState.CHECK_MEMBER:      return this.handleCheckMember(session, message, inputs, aiHistory);
      case OpdState.CREATE_MEMBER:     return this.handleCreateMember(session, message, inputs, aiHistory);
      case OpdState.ASK_NAME:          return this.handleAskName(session, message, inputs, aiHistory);
      case OpdState.ASK_AGE:           return this.handleAskAge(session, message, inputs, aiHistory);
      case OpdState.ASK_GENDER:        return this.handleAskGender(session, message, inputs, aiHistory);
      case OpdState.ASK_HEIGHT:        return this.handleAskHeight(session, message, inputs, aiHistory);
      case OpdState.ASK_WEIGHT:        return this.handleAskWeight(session, message, inputs, aiHistory);
      case OpdState.ASK_BLOOD_GROUP:   return this.handleAskBloodGroup(session, message, inputs, aiHistory);

      // Legacy registration (kept for compatibility)
      case OpdState.REGISTERING_NAME:  return this.handleRegisteringName(session, message, inputs, aiHistory);
      case OpdState.REGISTERING_EMAIL: return this.handleRegisteringEmail(session, message, inputs, aiHistory);

      // Triage + clinical
      case OpdState.ID_VERIFIED:              return this.handleTriage(session, message, inputs, aiHistory);
      case OpdState.TRIAGED:                  return this.handleEmergencyCheck(session, message, inputs, aiHistory);
      case OpdState.EMERGENCY_CHECKED:        return this.handleMedicalRecord(session, message, inputs, aiHistory);
      case OpdState.MEDICAL_RECORD_READY:     return this.handleConsultationDecision(session, message, inputs, aiHistory);
      case OpdState.CONSULTATION_DECIDED:     return this.handleCaseCreation(session, message, inputs, aiHistory);

      // Guided appointment booking
      case OpdState.CASE_CREATED:             return this.handleAppointmentInit(session, message, inputs, aiHistory);
      case OpdState.APPOINTMENT_INIT:         return this.handleAskTimePreference(session, message, inputs, aiHistory);
      case OpdState.ASK_TIME_PREFERENCE:      return this.handleAskDoctorPreference(session, message, inputs, aiHistory);
      case OpdState.ASK_DOCTOR_PREFERENCE:    return this.handleShowDoctors(session, message, inputs, aiHistory);
      case OpdState.SHOW_DOCTORS:             return this.handleSelectDoctor(session, message, inputs, aiHistory);
      case OpdState.SELECT_DOCTOR:            return this.handleAskDate(session, message, inputs, aiHistory);
      case OpdState.ASK_DATE:                 return this.handleShowSlots(session, message, inputs, aiHistory);
      case OpdState.SHOW_SLOTS:               return this.handleConfirmBooking(session, message, inputs, aiHistory);
      case OpdState.CONFIRM_BOOKING:          return this.handleBookingConfirmed(session, message, inputs, aiHistory);
      case OpdState.DOCTOR_ASSIGNED:          return this.handleFinalizeAppointment(session, message, inputs, aiHistory);

      // Consultation pipeline
      case OpdState.APPOINTMENT_BOOKED:       return this.handlePreConsultation(session, message, inputs, aiHistory);
      case OpdState.PRE_CONSULTATION:         return this.handleStartConsultation(session, message, inputs, aiHistory);
      case OpdState.CONSULTATION_IN_PROGRESS: return this.handleConsultation(session, message, inputs, aiHistory);
      case OpdState.CONSULTATION_COMPLETED:   return this.handleOutcomeGeneration(session, message, inputs, aiHistory);
      case OpdState.OUTCOME_GENERATED:        return this.handleOutcomeGenerated(session, message, inputs, aiHistory);
      case OpdState.SCHEDULE_TESTS:           return this.handleScheduleTests(session, message, inputs, aiHistory);
      case OpdState.ASK_DELIVERY_CONSENT:     return this.handleAskDeliveryConsent(session, message, inputs, aiHistory);
      case OpdState.ASK_DELIVERY_ADDRESS:     return this.handleAskDeliveryAddress(session, message, inputs, aiHistory);
      case OpdState.FOLLOWUP_PENDING:         return this.handleFollowup(session, message, inputs, aiHistory);
      case OpdState.TEST_COMPLETED:           return this.handleTestCompleted(session, message, inputs, aiHistory);
      case OpdState.CLOSED:                   return this.handleClosed(session, message, inputs, aiHistory);

      default:
        return {
          newState: currentState,
          responseMessage: 'I seem to have lost track. Let me restart your session.',
          type: 'text' as const,
          options: [] as JanaOption[],
          actionName: 'UNKNOWN_STATE',
          data: {},
          inputs,
          aiHistory,
        };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEMBER IDENTIFICATION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleNew(session: any, message: string, inputs: any, aiHistory: any[]) {
    const memberId = message.trim();

    // Route to member creation
    if (memberId === 'CREATE_NEW_MEMBER' || memberId.toLowerCase().includes('create') || memberId.toLowerCase().includes('new')) {
      const newState = transition(OpdState.NEW, OpdState.CREATE_MEMBER);
      return {
        newState,
        responseMessage: "I couldn't find an existing account for you. Would you like to create a new one? It only takes a minute! 😊",
        type: 'options' as const,
        options: [
          { label: '✅ Yes, create my account', value: 'yes_create' },
          { label: '❌ No, I have a Member ID', value: 'no_have_id' },
        ],
        actionName: 'PROMPT_CREATE_MEMBER',
        data: {},
        inputs,
        aiHistory,
      };
    }

    // Handle initialization signal or invalid input
    if (memberId === '__INIT__' || !memberId || memberId.length < 5) {
      return {
        newState: OpdState.NEW,
        responseMessage: "Welcome to Jana AI! 👋 How can I help you today? Do you already have a **Member ID** or would you like to **create a new medical record**?",
        type: 'options' as const,
        options: [
          { label: '🔑 I have a Member ID', value: 'no_have_id' },
          { label: '🆕 Create New account', value: 'CREATE_NEW_MEMBER' },
        ],
        actionName: 'AWAITING_MEMBER_ID',
        data: {},
        inputs,
        aiHistory,
      };
    }

    // Patient clicked "I have a Member ID"
    if (memberId === 'no_have_id') {
      return {
        newState: OpdState.NEW,
        responseMessage: "Please enter your **Member ID** below so I can retrieve your records.",
        type: 'text' as const,
        options: [] as JanaOption[],
        actionName: 'ENTER_MEMBER_ID',
        data: {},
        inputs,
        aiHistory,
      };
    }

    // Verify member
    const member = await this.memberActions.verifyMember(memberId);
    if (!member) {
      return {
        newState: OpdState.NEW,
        responseMessage: `I couldn't find a member with that ID. Please double-check and try again, or create a new account below.`,
        type: 'options' as const,
        options: [{ label: '🆕 Create New Member', value: 'CREATE_NEW_MEMBER' }],
        actionName: 'MEMBER_NOT_FOUND',
        data: { attemptedId: memberId },
        inputs,
        aiHistory,
      };
    }

    // Verified!
    inputs.memberId = memberId;
    inputs.memberName = member.full_name;
    const newState = transition(OpdState.NEW, OpdState.ID_VERIFIED);

    // Log Event - Silenced per user request (Too early for clinical log)
    // await this.addCaseEvent(inputs.caseId || 'SESSION_' + session.session_id, 'MEMBER_VERIFIED', { memberName: member.full_name, memberId });

    const msg = await this.aiService.formatResponse({
      currentState: newState,
      stateLabel: STATE_LABELS[newState],
      systemPrompt: `Member verified: ${member.full_name}. Welcome them warmly by first name and ask them to describe their symptoms, how long they've had them, and the severity (mild, moderate, severe).`,
      data: { memberName: member.full_name },
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    await this.audit.logStateTransition(session.session_id, OpdState.NEW, newState);

    return {
      newState,
      responseMessage: msg,
      type: 'text' as const,
      options: [] as JanaOption[],
      actionName: 'MEMBER_VERIFIED',
      data: { member: { id: member.member_id, name: member.full_name } },
      inputs,
      aiHistory,
    };
  }

  private async handleCheckMember(session: any, message: string, inputs: any, aiHistory: any[]) {
    // Re-route same as handleNew
    return this.handleNew(session, message, inputs, aiHistory);
  }

  private async handleCreateMember(session: any, message: string, inputs: any, aiHistory: any[]) {
    const lower = message.toLowerCase();
    // User opted in
    if (lower.includes('yes') || lower.includes('create') || lower === 'yes_create') {
      const newState = transition(OpdState.CREATE_MEMBER, OpdState.ASK_NAME);
      return {
        newState,
        responseMessage: "Great! Let's get you set up. 🎉 What's your **full name**?",
        type: 'input' as const,
        options: [] as JanaOption[],
        actionName: 'ASK_NAME',
        data: {},
        inputs,
        aiHistory,
      };
    }
    // User opted out
    return {
      newState: OpdState.NEW,
      responseMessage: "No problem! Please enter your **Member ID** to continue.",
      type: 'text' as const,
      options: [] as JanaOption[],
      actionName: 'BACK_TO_ID',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskName(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberName = message.trim();
    const newState = transition(OpdState.ASK_NAME, OpdState.ASK_AGE);
    return {
      newState,
      responseMessage: `Nice to meet you, **${inputs.newMemberName}**! 😊 How old are you?`,
      type: 'input' as const,
      options: [] as JanaOption[],
      actionName: 'COLLECTED_NAME',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskAge(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberAge = message.trim();
    const newState = transition(OpdState.ASK_AGE, OpdState.ASK_GENDER);
    return {
      newState,
      responseMessage: `Got it! Last question — what's your gender?`,
      type: 'options' as const,
      options: [
        { label: '👨 Male', value: 'male' },
        { label: '👩 Female', value: 'female' },
        { label: '🌈 Other', value: 'other' },
        { label: '🤐 Prefer not to say', value: 'unspecified' },
      ],
      actionName: 'COLLECTED_AGE',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskGender(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberGender = message.trim();
    const newState = transition(OpdState.ASK_GENDER, OpdState.ASK_HEIGHT);
    return {
      newState,
      responseMessage: `Thanks! What is your height (e.g., 5'10" or 178cm)?`,
      type: 'input' as const,
      options: [] as JanaOption[],
      actionName: 'COLLECTED_GENDER',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskHeight(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberHeight = message.trim();
    const newState = transition(OpdState.ASK_HEIGHT, OpdState.ASK_WEIGHT);
    return {
      newState,
      responseMessage: `Got it! And what is your weight in kg?`,
      type: 'input' as const,
      options: [] as JanaOption[],
      actionName: 'COLLECTED_HEIGHT',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskWeight(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberWeight = message.trim();
    const newState = transition(OpdState.ASK_WEIGHT, OpdState.ASK_BLOOD_GROUP);
    return {
      newState,
      responseMessage: `Almost done. What is your blood group?`,
      type: 'options' as const,
      options: [
        { label: '🩸 A+', value: 'A+' }, { label: '🩸 A-', value: 'A-' },
        { label: '🩸 B+', value: 'B+' }, { label: '🩸 B-', value: 'B-' },
        { label: '🩸 AB+', value: 'AB+' }, { label: '🩸 AB-', value: 'AB-' },
        { label: '🩸 O+', value: 'O+' }, { label: '🩸 O-', value: 'O-' },
        { label: '❓ I don\'t know', value: 'Unknown' },
      ],
      actionName: 'COLLECTED_WEIGHT',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskBloodGroup(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberBloodGroup = message.trim();

    // Create the member AND the medical record in DB
    const newMember = await this.memberActions.createMemberWithMedicalRecord({
      full_name: inputs.newMemberName,
      phone: inputs.newMemberPhone,
      age: parseInt(inputs.newMemberAge) || null,
      gender: inputs.newMemberGender,
      height: inputs.newMemberHeight,
      weight: inputs.newMemberWeight,
      blood_group: inputs.newMemberBloodGroup,
    });

    inputs.memberId = newMember.member_id;
    inputs.memberName = newMember.full_name;
    const newState = transition(OpdState.ASK_BLOOD_GROUP, OpdState.ID_VERIFIED);

    // Log Event - Silenced per user request (Too early for clinical log)
    // await this.addCaseEvent('NEW_MEMBER_' + newMember.member_id, 'MEMBER_CREATED', { name: newMember.full_name, memberId: newMember.member_id });

    const msg = await this.aiService.formatResponse({
      currentState: newState,
      stateLabel: STATE_LABELS[newState],
      systemPrompt: `Registration complete! Their new Member ID is ${newMember.member_id}. Welcome ${newMember.full_name} warmly and let them know their account and medical record has been created successfully. Then ask them to describe their symptoms, duration, and severity.`,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });

    return {
      newState,
      responseMessage: msg,
      type: 'text' as const,
      options: [] as JanaOption[],
      actionName: 'MEMBER_AND_RECORD_CREATED',
      data: { member: { id: newMember.member_id, name: newMember.full_name } },
      inputs,
      aiHistory,
    };
  }

  // ─── LEGACY REGISTRATION ─────────────────────────────────────────────────

  private async handleRegisteringName(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberName = message.trim();
    const newState = transition(OpdState.REGISTERING_NAME, OpdState.REGISTERING_EMAIL);
    const msg = await this.aiService.formatResponse({
      currentState: newState,
      stateLabel: STATE_LABELS[newState],
      systemPrompt: `Patient's name is ${inputs.newMemberName}. Ask for their email address.`,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    return { newState, responseMessage: msg, type: 'input' as const, options: [] as JanaOption[], actionName: 'COLLECTED_NAME', data: {}, inputs, aiHistory };
  }

  private async handleRegisteringEmail(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.newMemberEmail = message.trim();
    const newMember = await this.memberActions.createMemberWithMedicalRecord({ full_name: inputs.newMemberName, email: inputs.newMemberEmail });
    inputs.memberId = newMember.member_id;
    inputs.memberName = newMember.full_name;
    const newState = transition(OpdState.REGISTERING_EMAIL, OpdState.ID_VERIFIED);
    const msg = await this.aiService.formatResponse({
      currentState: newState,
      stateLabel: STATE_LABELS[newState],
      systemPrompt: `Registration complete. Member ID: ${newMember.member_id}. Welcome ${newMember.full_name}. Ask for symptoms, duration, severity.`,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'MEMBER_REGISTERED', data: { member: { id: newMember.member_id, name: newMember.full_name } }, inputs, aiHistory };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIAGE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleTriage(session: any, message: string, inputs: any, aiHistory: any[]) {
    const triage = await this.aiService.parseTriage(message);
    const severity = assessSeverity(message, triage.duration);
    const { specialty, matchedKeywords } = mapSymptomsToSpecialty(message);

    inputs.triageInput = message;
    inputs.triage = { symptoms: triage.symptoms, duration: triage.duration, severity, specialty, matchedKeywords, rawText: triage.rawText };

    const newState = transition(OpdState.ID_VERIFIED, OpdState.TRIAGED);
    aiHistory.push({ role: 'user', content: message });
    const msg = await this.aiService.formatResponse({
      currentState: newState,
      stateLabel: STATE_LABELS[newState],
      systemPrompt: `Triage done. Symptoms: ${triage.symptoms.join(', ')}. Duration: ${triage.duration}. Severity: ${severity}. Specialty: ${specialty}. Reassure the patient and say we're checking for any urgent issues.`,
      data: inputs.triage,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });

    // Log triage event - Silenced per user request (Too early for clinical log)
    // await this.addCaseEvent('PENDING_' + session.session_id, 'TRIAGE_COMPLETED', { symptoms: triage.symptoms, severity });

    return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'TRIAGE_COMPLETE', autoAdvance: true, data: { triage: inputs.triage }, inputs, aiHistory };
  }

  private async handleEmergencyCheck(session: any, message: string, inputs: any, aiHistory: any[]) {
    const emergency = isEmergency(inputs.triageInput || '');
    inputs.isEmergency = emergency;
    const newState = transition(OpdState.TRIAGED, OpdState.EMERGENCY_CHECKED);

    if (emergency) {
      const msg = await this.aiService.formatResponse({
        currentState: newState,
        stateLabel: STATE_LABELS[newState],
        systemPrompt: '⚠️ EMERGENCY. Patient has critical symptoms. Ask for their current address immediately for emergency dispatch. Be urgent but calm.',
        data: { emergency: true },
        history: aiHistory,
        language: inputs.language,
      });
      inputs.emergencyFlow = true;
      aiHistory.push({ role: 'assistant', content: msg });
      return { newState, responseMessage: msg, type: 'input' as const, options: [] as JanaOption[], actionName: 'EMERGENCY_DETECTED', data: { isEmergency: true }, inputs, aiHistory };
    }

    const msg = await this.aiService.formatResponse({
      currentState: newState,
      stateLabel: STATE_LABELS[newState],
      systemPrompt: 'No emergency detected. Inform the patient their symptoms are being processed and their medical record is being prepared.',
      data: { emergency: false },
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'NO_EMERGENCY', autoAdvance: true, data: { isEmergency: false }, inputs, aiHistory };
  }

  private async handleMedicalRecord(session: any, message: string, inputs: any, aiHistory: any[]) {
    if (inputs.emergencyFlow) {
      inputs.emergencyAddress = message;
      const closedState = transition(OpdState.EMERGENCY_CHECKED, OpdState.CLOSED);
      const msg = await this.aiService.formatResponse({
        currentState: closedState, stateLabel: STATE_LABELS[closedState],
        systemPrompt: `Emergency address: "${message}". Services notified. Advise to stay calm. Helpline: 108.`,
        history: aiHistory,
        language: inputs.language,
      });
      return { newState: closedState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'EMERGENCY_DISPATCHED', data: { address: message, helpline: '108' }, inputs, aiHistory };
    }

    const record = await this.memberActions.ensureMedicalRecord(inputs.memberId);
    inputs.medicalRecordId = record.medicalRecordId;
    const newState = transition(OpdState.EMERGENCY_CHECKED, OpdState.MEDICAL_RECORD_READY);

    const msg = await this.aiService.formatResponse({
      currentState: newState, stateLabel: STATE_LABELS[newState],
      systemPrompt: `Medical record ${record.isNew ? 'created' : 'found'}. Now ask what type of consultation they prefer: In-Person or Teleconsultation.`,
      data: record, history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });

    return {
      newState, responseMessage: msg, type: 'options' as const,
      options: [
        { label: '🏥 In-Person Consultation', value: 'IN_PERSON' },
        { label: '💻 Teleconsultation', value: 'TELECONSULTATION' },
      ],
      actionName: 'MEDICAL_RECORD_READY', data: { medicalRecord: record }, inputs, aiHistory,
    };
  }

  private async handleConsultationDecision(session: any, message: string, inputs: any, aiHistory: any[]) {
    const consultationType = message.toUpperCase().includes('TELE') ? 'TELECONSULTATION' : 'IN_PERSON';
    inputs.consultationType = consultationType;
    const newState = transition(OpdState.MEDICAL_RECORD_READY, OpdState.CONSULTATION_DECIDED);
    aiHistory.push({ role: 'user', content: message });

    const msg = await this.aiService.formatResponse({
      currentState: newState, stateLabel: STATE_LABELS[newState],
      systemPrompt: `${consultationType === 'TELECONSULTATION' ? 'Teleconsultation' : 'In-person'} selected. Say their case is being created and a doctor will be matched.`,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });

    return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'CONSULTATION_TYPE_SELECTED', autoAdvance: true, data: { consultationType }, inputs, aiHistory };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleCaseCreation(session: any, message: string, inputs: any, aiHistory: any[]) {
    const result = await this.triggers.caseCrationTrigger({
      memberId: inputs.memberId,
      description: inputs.triageInput || 'OPD Consultation',
      triageData: inputs.triage || {},
      consultationType: inputs.consultationType || 'IN_PERSON',
    });

    inputs.caseId = result.case.case_id;
    await this.prisma.opd_sessions.update({ where: { session_id: session.session_id }, data: { case_id: result.case.case_id } });

    // Log event - Silenced per user request (First message should start at APPOINTMENT_BOOKED)
    // await this.addCaseEvent(inputs.caseId, 'CASE_CREATED', { description: inputs.triageInput });

    const newState = transition(OpdState.CONSULTATION_DECIDED, OpdState.CASE_CREATED);
    const msg = await this.aiService.formatResponse({
      currentState: newState, stateLabel: STATE_LABELS[newState],
      systemPrompt: `Case created: ${result.case.case_id}. Tell the patient their case is set up and we're now booking an appointment. Keep it brief and friendly.`,
      data: { caseId: result.case.case_id }, history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });

    return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'CASE_CREATED', autoAdvance: true, data: { caseId: result.case.case_id }, inputs, aiHistory };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GUIDED APPOINTMENT BOOKING FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleAppointmentInit(session: any, message: string, inputs: any, aiHistory: any[]) {
    const newState = transition(OpdState.CASE_CREATED, OpdState.APPOINTMENT_INIT);
    // Auto-advance immediately
    return {
      newState,
      responseMessage: "You're almost done! 🎉 Let's book your appointment. I'll guide you step by step.",
      type: 'text' as const,
      options: [] as JanaOption[],
      actionName: 'APPOINTMENT_INIT',
      autoAdvance: true,
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskTimePreference(session: any, message: string, inputs: any, aiHistory: any[]) {
    const newState = transition(OpdState.APPOINTMENT_INIT, OpdState.ASK_TIME_PREFERENCE);
    return {
      newState,
      responseMessage: "What time of day works best for you? 🕐",
      type: 'options' as const,
      options: [
        { label: '🌅 Morning (8AM–12PM)', value: 'morning' },
        { label: '☀️ Afternoon (12PM–4PM)', value: 'afternoon' },
        { label: '🌆 Evening (4PM–8PM)', value: 'evening' },
      ],
      actionName: 'ASK_TIME_PREFERENCE',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleAskDoctorPreference(session: any, message: string, inputs: any, aiHistory: any[]) {
    // Collect time preference from previous step
    inputs.timePreference = message.toLowerCase();
    const newState = transition(OpdState.ASK_TIME_PREFERENCE, OpdState.ASK_DOCTOR_PREFERENCE);
    return {
      newState,
      responseMessage: "Would you like to choose a specific doctor, or should I recommend the best match for your symptoms? 🩺",
      type: 'options' as const,
      options: [
        { label: '📋 Show me available doctors', value: 'show_doctors' },
        { label: '⭐ Recommend the best match', value: 'recommend' },
      ],
      actionName: 'ASK_DOCTOR_PREFERENCE',
      data: {},
      inputs,
      aiHistory,
    };
  }

  private async handleShowDoctors(session: any, message: string, inputs: any, aiHistory: any[]) {
    inputs.doctorPreference = message.toLowerCase();
    const symptomsText = inputs.triageInput || '';
    const { doctors, specialty } = await this.doctorActions.getDoctorsBySymptoms(symptomsText);

    if (doctors.length === 0) {
      return {
        newState: OpdState.ASK_DOCTOR_PREFERENCE,
        responseMessage: "Sorry, no doctors are available right now. Please try again in a moment.",
        type: 'options' as const,
        options: [{ label: '🔄 Try Again', value: 'show_doctors' }],
        actionName: 'NO_DOCTORS_AVAILABLE',
        data: { specialty },
        inputs,
        aiHistory,
      };
    }

    // If recommend → auto-select best doctor, then ask date
    if (inputs.doctorPreference.includes('recommend') || inputs.doctorPreference === 'recommend') {
      const doctor = doctors[0];
      inputs.selectedDoctorId = doctor.associate_id;
      inputs.doctorId = doctor.associate_id;
      inputs.doctorName = doctor.full_name.startsWith('Dr.') ? doctor.full_name : `Dr. ${doctor.full_name}`;
      inputs.doctorSpecialty = doctor.specialty;
      // Validate transitions (SHOW_DOCTORS → SELECT_DOCTOR → ASK_DATE)
      transition(OpdState.ASK_DOCTOR_PREFERENCE, OpdState.SHOW_DOCTORS);
      transition(OpdState.SHOW_DOCTORS, OpdState.SELECT_DOCTOR);
      // Skip to asking the date (now based on this doctor's real availability)
      return this.handleAskDateForDoctor(inputs, aiHistory, OpdState.SELECT_DOCTOR);
    }

    const newState = transition(OpdState.ASK_DOCTOR_PREFERENCE, OpdState.SHOW_DOCTORS);
    return {
      newState,
      responseMessage: `Here are the available doctors matching your symptoms (${specialty}). Please select one:`,
      type: 'doctors' as const,
      options: doctors.slice(0, 5).map((d) => ({
        label: `Dr. ${d.full_name} — ${d.specialty}`,
        value: d.associate_id,
      })),
      actionName: 'SHOW_DOCTORS',
      data: { doctors: doctors.slice(0, 5).map((d) => ({ id: d.associate_id, name: d.full_name, specialty: d.specialty })), specialty },
      inputs,
      aiHistory,
    };
  }

  private async handleSelectDoctor(session: any, message: string, inputs: any, aiHistory: any[]) {
    // message = doctorId
    inputs.selectedDoctorId = message.trim();
    inputs.doctorId = message.trim();

    // Fetch doctor details
    const doctor = await this.prisma.associates.findUnique({ where: { associate_id: inputs.doctorId } });
    if (doctor) {
      inputs.doctorName = doctor.full_name.startsWith('Dr.') ? doctor.full_name : `Dr. ${doctor.full_name}`;
      inputs.doctorSpecialty = doctor.specialty;
    }

    const newState = transition(OpdState.SHOW_DOCTORS, OpdState.SELECT_DOCTOR);
    // Immediately move to show available dates for THIS doctor
    return this.handleAskDateForDoctor(inputs, aiHistory, newState);
  }

  private async handleAskDate(session: any, message: string, inputs: any, aiHistory: any[]) {
    // If we reach here as a state (e.g. from an auto-advance), show the date chips
    return this.handleAskDateForDoctor(inputs, aiHistory, OpdState.SELECT_DOCTOR);
  }

  /**
   * Fetches actual available dates for the selected doctor and presents them as option chips.
   * Called from both handleSelectDoctor and the recommend path in handleShowDoctors.
   */
  private async handleAskDateForDoctor(inputs: any, aiHistory: any[], fromState: OpdState) {
    const doctorId = inputs.selectedDoctorId || inputs.doctorId;
    const allSlots = await this.doctorActions.getAvailableSlots(doctorId);

    // Filter by time preference if set
    const pref = (inputs.timePreference || '').toLowerCase();
    const prefFiltered = pref ? allSlots.filter((s) => {
      const hour = new Date(s.start_time).getHours();
      if (pref.includes('morning'))   return hour >= 8  && hour < 12;
      if (pref.includes('afternoon')) return hour >= 12 && hour < 16;
      if (pref.includes('evening'))   return hour >= 16 && hour < 20;
      return true;
    }) : allSlots;

    const workingSlots = prefFiltered.length > 0 ? prefFiltered : allSlots;

    // Build distinct date list
    const dateMap = new Map<string, Date>();
    for (const s of workingSlots) {
      const d = new Date(s.start_time);
      const key = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (!dateMap.has(key)) dateMap.set(key, d);
    }

    const newState = transition(fromState, OpdState.ASK_DATE);
    inputs.allSlotsForDoctor = allSlots; // cache for next step

    if (dateMap.size === 0) {
      return {
        newState: OpdState.ASK_DOCTOR_PREFERENCE,
        responseMessage: `Dr. ${inputs.doctorName} has no available slots${pref ? ' in that time range' : ''}. Please choose a different doctor or time preference.`,
        type: 'options' as const,
        options: [
          { label: '📋 Show me other doctors', value: 'show_doctors' },
          { label: '⭐ Recommend another doctor', value: 'recommend' },
        ],
        actionName: 'NO_DATES_AVAILABLE',
        data: {},
        inputs,
        aiHistory,
      };
    }

    const dateOptions = Array.from(dateMap.entries()).map(([key, d]) => ({
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
      value: key, // YYYY-MM-DD
    }));

    return {
      newState,
      responseMessage: `Dr. ${inputs.doctorName} is available on the following dates. Which works best for you? 📅`,
      type: 'options' as const,
      options: dateOptions,
      actionName: 'ASK_DATE',
      data: { doctorName: inputs.doctorName, availableDates: dateOptions },
      inputs,
      aiHistory,
    };
  }

  private async handleShowSlots(session: any, message: string, inputs: any, aiHistory: any[]) {
    // message = selected date (YYYY-MM-DD)
    inputs.preferredDate = message.trim();

    const doctorId = inputs.selectedDoctorId || inputs.doctorId;
    const allSlots = inputs.allSlotsForDoctor || await this.doctorActions.getAvailableSlots(doctorId);

    // Filter slots to the chosen date
    const selectedDate = inputs.preferredDate; // YYYY-MM-DD
    const slotsForDate = allSlots.filter((s: any) => {
      const d = new Date(s.start_time);
      return d.toLocaleDateString('en-CA') === selectedDate;
    });

    // Additionally filter by time preference if set
    const pref = (inputs.timePreference || '').toLowerCase();
    const filtered = pref ? slotsForDate.filter((s: any) => {
      const hour = new Date(s.start_time).getHours();
      if (pref.includes('morning'))   return hour >= 8  && hour < 12;
      if (pref.includes('afternoon')) return hour >= 12 && hour < 16;
      if (pref.includes('evening'))   return hour >= 16 && hour < 20;
      return true;
    }) : slotsForDate;

    const displaySlots = (filtered.length > 0 ? filtered : slotsForDate).slice(0, 8);
    inputs.availableSlots = displaySlots;

    const newState = transition(OpdState.ASK_DATE, OpdState.SHOW_SLOTS);

    if (displaySlots.length === 0) {
      // No slots on that date — re-show available dates
      return this.handleAskDateForDoctor(inputs, aiHistory, OpdState.SELECT_DOCTOR);
    }

    return {
      newState,
      responseMessage: `Here are the available time slots for **Dr. ${inputs.doctorName}** on ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. Pick a time! ⏰`,
      type: 'slots' as const,
      options: displaySlots.map((s: any) => {
        const d = new Date(s.start_time);
        return {
          label: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          value: s.availability_id,
        };
      }),
      actionName: 'SHOW_SLOTS',
      data: {
        slots: displaySlots.map((s: any) => ({ id: s.availability_id, time: s.start_time, end: s.end_time })),
        doctorName: inputs.doctorName,
        date: selectedDate,
      },
      inputs,
      aiHistory,
    };
  }

  private async handleConfirmBooking(session: any, message: string, inputs: any, aiHistory: any[]) {
    // message = slotId (availability_id)
    const slotId = message.trim();
    inputs.selectedSlotId = slotId;

    // Find slot details from cached or DB
    const slot = (inputs.availableSlots || []).find((s: any) => s.availability_id === slotId) ||
      await this.prisma.doctor_availability.findUnique({ where: { availability_id: slotId } });

    if (!slot) {
      // Re-show date picker for this doctor
      return this.handleAskDateForDoctor(inputs, aiHistory, OpdState.SELECT_DOCTOR);
    }

    const date = new Date(slot.start_time);
    inputs.pendingSlotId = slotId;
    inputs.pendingSlotTime = slot.start_time;

    const newState = transition(OpdState.SHOW_SLOTS, OpdState.CONFIRM_BOOKING);
    return {
      newState,
      responseMessage: `Almost there! 🎉 Please confirm your appointment:\n\n🩺 **${inputs.doctorName}** (${inputs.doctorSpecialty})\n📅 **${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}**\n⏰ **${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}**`,
      type: 'options' as const,
      options: [
        { label: '✅ Confirm Booking', value: 'confirm' },
        { label: '🔄 Choose Different Date', value: 'change_date' },
        { label: '🕑 Choose Different Time', value: 'change_time' },
      ],
      actionName: 'CONFIRM_BOOKING',
      data: { slot: { id: slotId, time: slot.start_time }, doctorName: inputs.doctorName },
      inputs,
      aiHistory,
    };
  }

  private async handleBookingConfirmed(session: any, message: string, inputs: any, aiHistory: any[]) {
    const lower = message.toLowerCase();

    // Change date → go back to date selection for this doctor
    if (lower.includes('change_date') || lower.includes('date')) {
      return this.handleAskDateForDoctor(inputs, aiHistory, OpdState.SELECT_DOCTOR);
    }

    // Change time → re-show slots for the same date
    if (lower.includes('change_time') || lower.includes('time')) {
      return this.handleShowSlots(session, inputs.preferredDate, inputs, aiHistory);
    }

    // Confirm
    await this.doctorActions.assignDoctor(inputs.caseId, inputs.doctorId);

    // Log Event
    await this.addCaseEvent(inputs.caseId, 'APPOINTMENT_BOOKED', { doctor: inputs.doctorName, date: inputs.preferredDate });

    const newState = transition(OpdState.CONFIRM_BOOKING, OpdState.DOCTOR_ASSIGNED);
    return {
      newState,
      responseMessage: 'Doctor confirmed! Finalizing your appointment... ⏳',
      type: 'text' as const,
      options: [] as JanaOption[],
      actionName: 'DOCTOR_ASSIGNED',
      autoAdvance: true,
      data: { doctorId: inputs.doctorId, doctorName: inputs.doctorName },
      inputs,
      aiHistory,
    };
  }

  private async handleFinalizeAppointment(session: any, message: string, inputs: any, aiHistory: any[]) {
    const slotId = inputs.pendingSlotId;

    try {
      const apptResult = await this.triggers.appointmentBookedTrigger({
        caseId: inputs.caseId,
        doctorId: inputs.doctorId,
        slotId,
      });

      inputs.appointmentId = apptResult.appointment.appointment_id;
      inputs.scheduledAt = apptResult.appointment.scheduled_at;

      const newState = transition(OpdState.DOCTOR_ASSIGNED, OpdState.APPOINTMENT_BOOKED);
      const date = new Date(apptResult.appointment.scheduled_at);
      const msg = await this.aiService.formatResponse({
        currentState: newState, stateLabel: STATE_LABELS[newState],
        systemPrompt: `Appointment booked! Dr. ${inputs.doctorName} on ${date.toLocaleDateString('en-IN')} at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Celebrate with the patient briefly and say we'll prepare their pre-consultation info.`,
        data: { scheduledAt: date, doctorName: inputs.doctorName }, history: aiHistory,
        language: inputs.language,
      });
      aiHistory.push({ role: 'assistant', content: msg });

      return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'APPOINTMENT_BOOKED', autoAdvance: true, data: { appointmentId: apptResult.appointment.appointment_id, scheduledAt: apptResult.appointment.scheduled_at, doctorName: inputs.doctorName }, inputs, aiHistory };
    } catch (error) {
      return {
        newState: OpdState.SHOW_SLOTS,
        responseMessage: `The slot you selected was just taken. Please choose a different time. 🙏`,
        type: 'slots' as const,
        options: (inputs.availableSlots || []).slice(0, 8).map((s: any) => {
          const d = new Date(s.start_time);
          return { label: `${d.toLocaleDateString('en-IN')} at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, value: s.availability_id };
        }),
        actionName: 'BOOKING_FAILED',
        data: { error: (error as Error).message },
        inputs,
        aiHistory,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTATION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async handlePreConsultation(session: any, message: string, inputs: any, aiHistory: any[]) {
    const newState = transition(OpdState.APPOINTMENT_BOOKED, OpdState.PRE_CONSULTATION);
    await this.delay(1000);
    const date = new Date(inputs.scheduledAt);
    const msg = await this.aiService.formatResponse({
      currentState: newState, stateLabel: STATE_LABELS[newState],
      systemPrompt: `Appointment with Dr. ${inputs.doctorName} on ${date.toLocaleDateString('en-IN')} at ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Give pre-consultation tips (bring reports, arrive early). Ask if they're ready to begin.`,
      data: { doctorName: inputs.doctorName, scheduledAt: date }, history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });

    return {
      newState, responseMessage: msg, type: 'options' as const,
      options: [{ label: '▶️ Start Consultation', value: 'start' }],
      actionName: 'PRE_CONSULTATION_REMINDER',
      data: { doctorName: inputs.doctorName, specialty: inputs.doctorSpecialty, scheduledAt: inputs.scheduledAt },
      inputs, aiHistory,
    };
  }

  private async handleStartConsultation(session: any, message: string, inputs: any, aiHistory: any[]) {
    const newState = transition(OpdState.PRE_CONSULTATION, OpdState.CONSULTATION_IN_PROGRESS);
    const msg = await this.aiService.formatResponse({
      currentState: newState, stateLabel: STATE_LABELS[newState],
      systemPrompt: `Consultation started with Dr. ${inputs.doctorName}. Doctor is reviewing symptoms. Ask patient to wait.`,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    return { newState, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'CONSULTATION_STARTED', autoAdvance: false, data: { doctorName: inputs.doctorName, caseId: inputs.caseId }, inputs, aiHistory };
  }

  private async handleConsultation(session: any, message: string, inputs: any, aiHistory: any[]) {
    // Check if the doctor has already submitted outcomes via the Doctor Panel.
    // If the session was advanced to OUTCOME_GENERATED by the doctor controller,
    // we would not reach here. But if the patient sends a message while still
    // CONSULTATION_IN_PROGRESS, we tell them to wait.
    const msg = await this.aiService.formatResponse({
      currentState: OpdState.CONSULTATION_IN_PROGRESS, stateLabel: STATE_LABELS[OpdState.CONSULTATION_IN_PROGRESS],
      systemPrompt: `The consultation with Dr. ${inputs.doctorName || 'your doctor'} is currently in progress. The doctor is reviewing your symptoms and medical history. Please be patient — you will receive a notification here as soon as the doctor completes their review. There is nothing you need to do right now.`,
      history: aiHistory,
      language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    return { newState: OpdState.CONSULTATION_IN_PROGRESS, responseMessage: msg, type: 'text' as const, options: [] as JanaOption[], actionName: 'AWAITING_DOCTOR', autoAdvance: false, data: { doctorName: inputs.doctorName, caseId: inputs.caseId }, inputs, aiHistory };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTCOME HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── OUTCOME_GENERATED ──────────────────────────────────────────────────
  // This state is entered when the Doctor Panel submits outcomes.
  // The doctor controller sets opd_state = OUTCOME_GENERATED and stores
  // outcomes in collected_inputs. When the patient next sends any message,
  // we land here and present the doctor's findings conversationally.
  // ───────────────────────────────────────────────────────────────────────

  private async handleOutcomeGeneration(session: any, message: string, inputs: any, aiHistory: any[]) {
    // This is the CONSULTATION_COMPLETED handler — but since the doctor panel
    // now handles outcomes, we should never auto-generate. Just pass through.
    // If somehow we reach here, just present the outcomes that the doctor already saved.
    return this.handleOutcomeGenerated(session, message, inputs, aiHistory);
  }

  private async handleOutcomeGenerated(session: any, message: string, inputs: any, aiHistory: any[]) {
    // Doctor has submitted outcomes via the Doctor Panel.
    const diagnosis = inputs.diagnosis || 'General consultation';
    const consultationNote = inputs.consultationNote || '';
    const outcomes = inputs.outcomes || {};

    const outcomeParts: string[] = [];
    let medDetails = 'None';
    if (outcomes.prescription || inputs.hasPrescription) {
      const meds = outcomes.prescription?.medications || [];
      medDetails = meds.map((m: any) => `${m.name} (${m.frequency})${m.duration ? ` for ${m.duration}` : ''}${m.instructions ? ` - ${m.instructions}` : ''}`).join(', ');
      outcomeParts.push(`prescribed medicines: ${medDetails}`);
    }
    if (outcomes.testOrders?.length > 0 || inputs.hasTests) {
      const tests = outcomes.testOrders || [];
      outcomeParts.push(`recommended diagnostic tests: ${tests.map((t: any) => t.name).join(', ')}`);
    }

    const summaryText = outcomeParts.length > 0 ? outcomeParts.join('. ') : 'completed the review';

    // Check: do we need to ask about tests?
    if ((outcomes.testOrders?.length > 0 || inputs.hasTests) && !inputs.testsHandled) {
      const testNames = (outcomes.testOrders || []).map((t: any) => t.name).join(', ');
      const msg = await this.aiService.formatResponse({
        currentState: OpdState.OUTCOME_GENERATED, stateLabel: STATE_LABELS[OpdState.OUTCOME_GENERATED],
        systemPrompt: `Dr. ${inputs.doctorName || 'Your doctor'} has completed the consultation. 
Diagnosis: ${diagnosis}. ${consultationNote ? `Note: ${consultationNote}.` : ''}
The doctor has ${summaryText}.

CRITICAL: You must explicitly and comprehensively list EVERY detail from the doctor. 
Specifically, list all medicines, their frequencies, and any special instructions: ${medDetails}.
Then, ask if the patient wants Janmitra (Jana AI) to schedule these diagnostic tests: ${testNames}.`,
        history: aiHistory, language: inputs.language,
      });
      aiHistory.push({ role: 'assistant', content: msg });

      return {
        newState: OpdState.SCHEDULE_TESTS, responseMessage: msg, type: 'options' as const,
        options: [
          { label: '✅ Yes, schedule my tests', value: 'yes_schedule' },
          { label: '❌ No, I\'ll handle it myself', value: 'no_skip_tests' },
        ],
        actionName: 'ASK_SCHEDULE_TESTS', data: { diagnosis, testNames }, inputs, aiHistory,
      };
    }

    // No tests — check if prescription exists, ask about delivery
    if ((outcomes.prescription || inputs.hasPrescription) && !inputs.deliveryHandled) {
      const msg = await this.aiService.formatResponse({
        currentState: OpdState.OUTCOME_GENERATED, stateLabel: STATE_LABELS[OpdState.OUTCOME_GENERATED],
        systemPrompt: `Dr. ${inputs.doctorName || 'Your doctor'} has completed the consultation with the following summary: ${summaryText}.
Diagnosis: ${diagnosis}. ${consultationNote ? `Note: ${consultationNote}.` : ''}

CRITICAL: You must read out the full list of medications, frequencies, and instructions provided: ${medDetails}.
Then, ask the patient if they would like Janmitra to deliver these medicines to their door.`,
        history: aiHistory, language: inputs.language,
      });
      aiHistory.push({ role: 'assistant', content: msg });

      return {
        newState: OpdState.ASK_DELIVERY_CONSENT, responseMessage: msg, type: 'options' as const,
        options: [
          { label: '🚚 Deliver to my door', value: 'yes_deliver' },
          { label: '🚶 I will pick it up', value: 'no_self' },
        ],
        actionName: 'ASK_DELIVERY_CONSENT', data: { diagnosis }, inputs, aiHistory,
      };
    }

    // Nothing to process — just close
    return this.skipToFollowup(session, message, inputs, aiHistory);
  }

  private async handleScheduleTests(session: any, message: string, inputs: any, aiHistory: any[]) {
    const choice = message.toLowerCase();

    // Context for AI
    const testNames = (inputs.outcomes?.testOrders || []).map((t: any) => t.name).join(', ');
    const meds = inputs.outcomes?.prescription?.medications || [];
    const medDetails = meds.map((m: any) => `${m.name} (${m.frequency})${m.duration ? ` for ${m.duration}` : ''}`).join(', ');

    // 1. Initial Choice: YES
    if (choice.includes('yes_schedule') || (choice.includes('yes') && !choice.includes('morning') && !choice.includes('afternoon'))) {
      const msg = await this.aiService.formatResponse({
        currentState: OpdState.SCHEDULE_TESTS, stateLabel: STATE_LABELS[OpdState.SCHEDULE_TESTS],
        systemPrompt: `The user wants to schedule their diagnostic tests (${testNames}). Ask for their preference: Tomorrow Morning (9 AM) or Tomorrow Afternoon (2 PM).`,
        history: aiHistory, language: inputs.language,
      });
      aiHistory.push({ role: 'assistant', content: msg });
      return {
        newState: OpdState.SCHEDULE_TESTS, responseMessage: msg, type: 'options' as const,
        options: [{ label: '🌅 Tomorrow Morning (9 AM)', value: 'time_morning' }, { label: '☀️ Tomorrow Afternoon (2 PM)', value: 'time_afternoon' }],
        actionName: 'ASK_TEST_TIME', data: {}, inputs, aiHistory,
      };
    }

    // 2. Time Selection
    if (choice.includes('time_morning') || choice.includes('time_afternoon') || choice.includes('9 am') || choice.includes('2 pm')) {
      const testOrders = await this.prisma.test_orders.findMany({ where: { case_id: inputs.caseId, status: 'ORDERED' } });
      const scheduledDate = new Date(); scheduledDate.setDate(scheduledDate.getDate() + 1); 
      const isMorning = choice.includes('morning') || choice.includes('9 am');
      scheduledDate.setHours(isMorning ? 9 : 14, 0, 0, 0);

      for (const order of testOrders) {
        await this.triggers.diagnosticBookingTrigger({ testOrderId: order.test_order_id, scheduledAt: scheduledDate });
      }

      inputs.testsHandled = true;
      const msg = await this.aiService.formatResponse({
        currentState: OpdState.SCHEDULE_TESTS, stateLabel: STATE_LABELS[OpdState.SCHEDULE_TESTS],
        systemPrompt: `Scheduled ${testNames} for ${scheduledDate.toLocaleDateString('en-IN')} at ${isMorning ? '9 AM' : '2 PM'}. Tell the patient and confirm. Also remind them about the prescribed medicines: ${medDetails}.`,
        history: aiHistory, language: inputs.language,
      });
      aiHistory.push({ role: 'assistant', content: msg });

      if ((inputs.outcomes?.prescription || inputs.hasPrescription) && !inputs.deliveryHandled) {
        return {
          newState: OpdState.ASK_DELIVERY_CONSENT, responseMessage: msg, type: 'options' as const,
          options: [{ label: '🚚 Deliver to my door', value: 'yes_deliver' }, { label: '🚶 I will get it myself', value: 'no_self' }],
          actionName: 'TESTS_SCHEDULED_ASK_DELIVERY', data: { tests: testOrders }, inputs, aiHistory,
        };
      }
      return { newState: OpdState.FOLLOWUP_PENDING, responseMessage: msg, type: 'text' as const, options: [], actionName: 'TESTS_SCHEDULED', autoAdvance: true, data: {}, inputs, aiHistory };
    }

    // 3. Reject Scheduling
    if (choice.includes('no') || choice.includes('skip')) {
      inputs.testsHandled = true;
      if ((inputs.outcomes?.prescription || inputs.hasPrescription) && !inputs.deliveryHandled) {
        return this.handleAskDeliveryConsent(session, message, inputs, aiHistory, OpdState.ASK_DELIVERY_CONSENT);
      }
      return this.skipToFollowup(session, message, inputs, aiHistory);
    }

    // 4. Natural Language / Default (Handles user questions like "what medicine")
    const msg = await this.aiService.formatResponse({
      currentState: OpdState.SCHEDULE_TESTS, stateLabel: STATE_LABELS[OpdState.SCHEDULE_TESTS],
      systemPrompt: `The user has not yet made a choice about scheduling the diagnostic tests (${testNames}). 
If the user asks a question, answer it. Prescribed medicines are: ${medDetails}.
Always bring the conversation back to whether they want you to schedule the tests for them.`,
      history: aiHistory, language: inputs.language,
    });
    aiHistory.push({ role: 'assistant', content: msg });
    return {
      newState: OpdState.SCHEDULE_TESTS, responseMessage: msg, type: 'options' as const,
      options: [{ label: '✅ Yes, schedule tests', value: 'yes_schedule' }, { label: '❌ No, I\'ll handle it', value: 'no_skip_tests' }],
      actionName: 'ENHANCED_RE_PROMPT_TESTS', data: {}, inputs, aiHistory,
    };
  }

  private async handleAskDeliveryConsent(session: any, message: string, inputs: any, aiHistory: any[], directNewState?: OpdState) {
    // If message is one of the options, process it
    const choice = message.toLowerCase();
    
    if (choice.includes('yes_deliver')) {
      inputs.deliveryHandled = true;
      const newState = transition(OpdState.ASK_DELIVERY_CONSENT, OpdState.ASK_DELIVERY_ADDRESS);
      return { 
        newState, responseMessage: "Great! Please provide your full delivery address.", type: 'input' as const, options: [], 
        actionName: 'AWAITING_DELIVERY_ADDRESS', data: {}, inputs, aiHistory 
      };
    } else if (choice.includes('no_self')) {
      inputs.deliveryHandled = true;
      return this.skipToFollowup(session, message, inputs, aiHistory);
    }

    // Default entry or Answer questioning
    const newState = directNewState || OpdState.ASK_DELIVERY_CONSENT;
    const meds = inputs.outcomes?.prescription?.medications || [];
    const medDetails = meds.map((m: any) => `${m.name} (${m.frequency})`).join(', ');

    const msg = await this.aiService.formatResponse({ 
      currentState: newState, stateLabel: STATE_LABELS[newState], 
      systemPrompt: `The doctor has prescribed some medicines: ${medDetails}. 
Tell the patient explicitly what was prescribed.
If they ask a question, answer it. 
Then, ask if they would like Janmitra to deliver the medicines securely to their door, or if they will pick them up themselves.`, 
      history: aiHistory, language: inputs.language 
    });
    aiHistory.push({ role: 'assistant', content: msg });
    
    return { 
      newState, responseMessage: msg, type: 'options' as const, 
      options: [{ label: '🚚 Deliver to my door', value: 'yes_deliver' }, { label: '🚶 I will get it myself', value: 'no_self' }], 
      actionName: 'ASK_DELIVERY_CONSENT', data: {}, inputs, aiHistory 
    };
  }

  private async handleAskDeliveryAddress(session: any, message: string, inputs: any, aiHistory: any[]) {
    // User has entered their address
    const address = message.trim();
    if (address.length < 5) {
      return { 
        newState: OpdState.ASK_DELIVERY_ADDRESS, 
        responseMessage: "That seems like a short address. Could you provide your full address for accurate delivery?", 
        type: 'input' as const, options: [], actionName: 'INVALID_ADDRESS', data: {}, inputs, aiHistory 
      };
    }

    inputs.deliveryAddress = address;
    const prescription = await this.prisma.prescriptions.findFirst({ 
      where: { case_id: inputs.caseId, status: 'ACTIVE' },
      orderBy: { created_at: 'desc' }
    });

    if (prescription) {
      await this.triggers.medicineDeliveryTrigger({ 
        prescriptionId: prescription.prescription_id, 
        address: address 
      });

      // Log event
      await this.addCaseEvent(inputs.caseId, 'MEDICINE_DELIVERY_BOOKED', { address, prescriptionId: prescription.prescription_id });

      const msg = await this.aiService.formatResponse({
        currentState: OpdState.ASK_DELIVERY_ADDRESS, stateLabel: STATE_LABELS[OpdState.ASK_DELIVERY_ADDRESS],
        systemPrompt: `Medicine delivery has been booked for ${address}. It will arrive within 2 hours. Inform the patient and then proceed to close the case.`,
        data: { address }, history: aiHistory, language: inputs.language
      });
      aiHistory.push({ role: 'assistant', content: msg });

      // Auto-advance to closure/followup
      return { 
        newState: OpdState.FOLLOWUP_PENDING, responseMessage: msg, type: 'text' as const, 
        options: [], actionName: 'DELIVERY_BOOKED', autoAdvance: true, data: { address }, inputs, aiHistory 
      };
    }

    // No prescription found? Fall back to closure
    return this.skipToFollowup(session, message, inputs, aiHistory);
  }

  private async handleTestCompleted(session: any, message: string, inputs: any, aiHistory: any[]) {
    const choice = message.toLowerCase();
    const caseId = inputs.caseId;

    // Fetch the latest completed test results
    const completedTests = await this.prisma.test_orders.findMany({
      where: { case_id: caseId, status: 'COMPLETED' },
      orderBy: { completed_at: 'desc' }
    });

    if (choice.includes('review') || choice.includes('report')) {
      const reportSummary = completedTests.map(t => {
        const res = t.result as any;
        return `${t.test_name}: ${res?.report || 'N/A'}`;
      }).join('\n');
      
      const msg = await this.aiService.formatResponse({
        currentState: OpdState.TEST_COMPLETED, stateLabel: STATE_LABELS[OpdState.TEST_COMPLETED],
        systemPrompt: `The patient wants to review their lab reports. 
        Reports: ${reportSummary}.
        Explain the results in simple, reassuring terms. If anything is abnormal, suggest a follow-up consultation with their doctor.`,
        data: { reports: completedTests }, history: aiHistory, language: inputs.language
      });
      aiHistory.push({ role: 'assistant', content: msg });

      return {
        newState: OpdState.TEST_COMPLETED, responseMessage: msg, type: 'options' as const,
        options: [{ label: '📅 Schedule Follow-up with Doctor', value: 'schedule_followup' }, { label: '✅ I\'m done, thank you', value: 'close_case' }],
        actionName: 'REPORT_REVIEWED', data: { reports: completedTests }, inputs, aiHistory
      };
    }

    if (choice.includes('followup') || choice.includes('schedule_followup')) {
      // Transition back to appointment init for a follow-up
      const newState = transition(OpdState.TEST_COMPLETED, OpdState.APPOINTMENT_INIT);
      return {
        newState, responseMessage: "I'll help you book a follow-up appointment to discuss these results. Let's find a suitable time.",
        type: 'text' as const, options: [], actionName: 'START_FOLLOWUP_BOOKING', data: {}, inputs, aiHistory
      };
    }

    if (choice.includes('close') || choice.includes('done')) {
      return this.skipToFollowup(session, message, inputs, aiHistory);
    }

    // Default entrance: Inform about results
    const testNames = completedTests.map(t => t.test_name).join(', ');
    const msg = await this.aiService.formatResponse({
      currentState: OpdState.TEST_COMPLETED, stateLabel: STATE_LABELS[OpdState.TEST_COMPLETED],
      systemPrompt: `The laboratory has uploaded results for: ${testNames}. 
      Proactively inform the patient that their reports are ready and ask if they would like to review them now or schedule a follow-up with the doctor.`,
      history: aiHistory, language: inputs.language
    });
    aiHistory.push({ role: 'assistant', content: msg });

    return {
      newState: OpdState.TEST_COMPLETED, responseMessage: msg, type: 'options' as const,
      options: [
        { label: '📊 Review My Reports', value: 'review_reports' },
        { label: '📅 Schedule Follow-up', value: 'schedule_followup' }
      ],
      actionName: 'RESULTS_READY_PROMPT', data: { testNames }, inputs, aiHistory
    };
  }

  private async skipToFollowup(session: any, message: string, inputs: any, aiHistory: any[]) {
     const newState = OpdState.FOLLOWUP_PENDING;
     // Hack transitioning internally
     this.prisma.opd_sessions.update({ where: { session_id: session.session_id }, data: { opd_state: newState } }).catch(e=>null);
     
     const msg = await this.aiService.formatResponse({ 
       currentState: newState, stateLabel: STATE_LABELS[newState], 
       systemPrompt: `The case logistics are finalized. Ask the patient if they want to schedule a courtesy follow-up next week or close the case now.`, 
       history: aiHistory, language: inputs.language 
     });
     aiHistory.push({ role: 'assistant', content: msg });
     return { 
       newState, responseMessage: msg, type: 'options' as const, 
       options: [{ label: '📅 Schedule Follow-up', value: 'followup' }, { label: '✅ Close Case', value: 'close' }], 
       actionName: 'PROCEED_TO_CLOSE', data: {}, inputs, aiHistory 
     };
  }

  private async handleFollowup(session: any, message: string, inputs: any, aiHistory: any[]) {
    // If they were auto-advanced into followup reading from handleAskDeliveryAddress:
    if (message === '__auto_advance__') {
       return this.skipToFollowup(session, message, inputs, aiHistory);
    }

    if (message.toLowerCase().includes('follow') || message.toLowerCase().includes('schedule')) {
      const followupDate = new Date(); followupDate.setDate(followupDate.getDate() + 7);
      inputs.followupDate = followupDate;
    }
    await this.caseActions.closeCase(inputs.caseId, 'Normal closure after outcome processing');
    const newState = transition(OpdState.FOLLOWUP_PENDING, OpdState.CLOSED);

    // Log Event
    await this.addCaseEvent(inputs.caseId, 'CASE_CLOSED', { summary: 'Patient healthcare journey completed.' });

    const msg = await this.aiService.formatResponse({ currentState: newState, stateLabel: STATE_LABELS[newState], systemPrompt: 'Case closed. Thank patient warmly, wish speedy recovery, remind to take meds. Say they can start a new session anytime.', history: aiHistory, language: inputs.language });
    await this.prisma.opd_sessions.update({ where: { session_id: session.session_id }, data: { is_active: false } });
    return { newState, responseMessage: msg, type: 'options' as const, options: [{ label: '🔄 Start New Session', value: 'new_session' }], actionName: 'CASE_CLOSED', data: { caseId: inputs.caseId }, inputs, aiHistory };
  }

  private async handleClosed(session: any, message: string, inputs: any, aiHistory: any[]) {
    const newSession = await this.createSession(randomUUID());
    return { newState: OpdState.NEW, responseMessage: 'Welcome back to Jana AI! 🏥 Please enter your Member ID or create a new account to begin.', type: 'options' as const, options: [{ label: '🆕 Create New Member', value: 'CREATE_NEW_MEMBER' }], actionName: 'NEW_SESSION', data: { newSessionId: newSession.session_id }, inputs: {}, aiHistory: [] };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadSession(sessionId: string) {
    return this.prisma.opd_sessions.findFirst({ where: { session_id: sessionId, is_active: true } });
  }

  private async createSession(sessionId: string) {
    const existing = await this.prisma.opd_sessions.findFirst({ where: { session_id: sessionId } });
    if (existing) {
      return this.prisma.opd_sessions.update({ where: { session_id: existing.session_id }, data: { is_active: true, opd_state: 'NEW', collected_inputs: {}, trigger_history: [], ai_history: [] } });
    }
    return this.prisma.opd_sessions.create({ data: { session_id: sessionId, opd_state: 'NEW', collected_inputs: {}, trigger_history: [], ai_history: [] } });
  }

  private async saveSession(sessionId: string, state: OpdState, inputs: any, aiHistory: any[]) {
    await this.prisma.opd_sessions.update({ where: { session_id: sessionId }, data: { opd_state: state, collected_inputs: inputs, ai_history: aiHistory.slice(-20) } });
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private buildOptions(labels: string[]): JanaOption[] {
    return labels.map((l) => ({ label: l, value: l.toLowerCase().replace(/\s+/g, '_') }));
  }

  private buildResponse(sessionId: string, result: any): JanaResponse {
    return {
      message: result.responseMessage,
      type: result.type ?? 'text',
      options: result.options ?? [],
      meta: result.meta,
      action: result.actionName,
      data: result.data || {},
      state: result.newState,
      stateLabel: STATE_LABELS[result.newState as OpdState] || result.newState,
      progress: getProgressPercent(result.newState as OpdState),
      sessionId,
      autoAdvance: result.autoAdvance || false,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Universal Case Event Logger
   * Ensures every milestone is recorded in the case_events table for the context panel log.
   */
  private async addCaseEvent(caseId: string, eventType: string, payload: any) {
    // If the caseId is just a placeholder (SESSION_, NEW_MEMBER_, PENDING_), do not log to DB
    // as case_id is a required UUID in the schema.
    if (caseId.startsWith('SESSION_') || caseId.startsWith('NEW_MEMBER_') || caseId.startsWith('PENDING_')) {
      this.logger.debug(`[EVENT] Skipping DB log for placeholder caseId: ${caseId}`);
      return;
    }

    try {
      await this.prisma.case_events.create({
        data: {
          case_id: caseId,
          event_type: eventType,
          actor_type: 'JANA_AI',
          payload: {
            ...payload,
            timestamp: new Date().toISOString(),
          },
        },
      });
      this.logger.log(`[EVENT] ${eventType} logged for case ${caseId}`);
    } catch (e) {
      this.logger.error(`Failed to log case event: ${e.message}`);
    }
  }
}
