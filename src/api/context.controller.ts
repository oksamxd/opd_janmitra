/**
 * Context Controller
 *
 * Provides rich context data for the UI:
 * - Member profile + medical summary + case snapshot (for member context header)
 * - Notifications (per member / session)
 * - Janmitra handoff endpoints
 * - Appointment dashboard (upcoming/past/cancelled)
 * - Reschedule endpoint
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';
import { JanaOrchestratorService } from '../orchestrator/jana-orchestrator.service';

@Controller('context')
export class ContextController {
  private readonly logger = new Logger(ContextController.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
    private orchestrator: JanaOrchestratorService,
  ) {}

  // ─── 1. SESSION CONTEXT (Member Header + Case Snapshot) ───────────────────

  @Get('session/:sessionId')
  async getSessionContext(@Param('sessionId') sessionId: string) {
    const session = await this.prisma.opd_sessions.findFirst({
      where: { session_id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const inputs = (session.collected_inputs as any) || {};
    const memberId = session.member_id || inputs.memberId;

    // Member profile
    let member: any = null;
    let medicalRecord: any = null;
    if (memberId) {
      member = await this.prisma.members.findUnique({
        where: { member_id: memberId },
        include: { medical_record: true },
      });
      medicalRecord = member?.medical_record || null;
    }

    // Case + appointments + test orders
    let caseData: any = null;
    let nextAppointment: any = null;
    let assignedDoctor: any = null;
    let activeTestOrders: any[] = [];
    let prescriptions: any[] = [];

    const caseId = session.case_id || inputs.caseId;
    if (caseId) {
      caseData = await this.prisma.cases.findUnique({
        where: { case_id: caseId },
      });

      nextAppointment = await this.prisma.appointments.findFirst({
        where: { case_id: caseId, status: 'BOOKED' },
        orderBy: { scheduled_at: 'asc' },
        include: { doctor: true },
      });

      if (nextAppointment) {
        assignedDoctor = nextAppointment.doctor;
      } else if (inputs.doctorId) {
        assignedDoctor = await this.prisma.associates.findUnique({
          where: { associate_id: inputs.doctorId },
        });
      }

      activeTestOrders = await this.prisma.test_orders.findMany({
        where: { case_id: caseId },
        orderBy: { created_at: 'desc' },
        take: 5,
      });

      prescriptions = await this.prisma.prescriptions.findMany({
        where: { case_id: caseId, status: 'ACTIVE' },
        include: { items: true },
        orderBy: { created_at: 'desc' },
        take: 3,
      });
    }

    // Compute risk indicator from triage
    const triage = inputs.triage || {};
    let riskLevel = 'UNKNOWN';
    if (triage.severity === 'severe' || inputs.isEmergency) riskLevel = 'HIGH';
    else if (triage.severity === 'moderate') riskLevel = 'MEDIUM';
    else if (triage.severity === 'mild') riskLevel = 'LOW';

    return {
      session: {
        sessionId,
        state: session.opd_state,
        controlledBy: (session as any).controlled_by || 'AI',
        languagePreference: (session as any).language_preference || 'English',
      },
      member: member
        ? {
            memberId: member.member_id,
            fullName: member.full_name,
            email: member.email,
            phone: member.phone,
            dateOfBirth: member.date_of_birth,
            age: medicalRecord?.age || inputs.newMemberAge || null,
            gender: inputs.newMemberGender || null,
            bloodGroup: medicalRecord?.blood_group || null,
            height: medicalRecord?.height || null,
            weight: medicalRecord?.weight || null,
            avatarUrl: null, // future: link to storage
          }
        : null,
      medicalSummary: medicalRecord
        ? {
            allergies: medicalRecord.allergies || 'None recorded',
            chronicConditions: null, // extend schema in future
            currentMedications:
              prescriptions
                .map((p) => p.items.map((i: any) => i.medicine_name).join(', '))
                .join('; ') || 'None',
          }
        : null,
      riskIndicators: {
        level: riskLevel,
        isEmergency: inputs.isEmergency || false,
        flags: [
          ...(medicalRecord?.allergies
            ? [`⚠️ Allergies: ${medicalRecord.allergies}`]
            : []),
          ...(inputs.isEmergency ? ['🚨 Emergency case'] : []),
          ...(triage.severity === 'severe' ? ['🔴 Severe symptoms'] : []),
        ],
      },
      caseSnapshot: caseData
        ? {
            caseId: caseData.case_id,
            status: caseData.status,
            opdState: session.opd_state,
            description: caseData.description,
            assignedDoctor: assignedDoctor
              ? {
                  doctorId: assignedDoctor.associate_id,
                  name: assignedDoctor.full_name,
                  specialty: assignedDoctor.specialty,
                  phone: assignedDoctor.email || null,
                }
              : null,
            nextAppointment: nextAppointment
              ? {
                  appointmentId: nextAppointment.appointment_id,
                  scheduledAt: nextAppointment.scheduled_at,
                  type: nextAppointment.appointment_type,
                  status: nextAppointment.status,
                }
              : null,
            activeTests: activeTestOrders.map((t) => ({
              testId: t.test_order_id,
              name: t.test_name,
              status: t.status,
              scheduledAt: t.scheduled_at,
              result: t.result,
            })),
          }
        : null,
      doctorContext: assignedDoctor
        ? {
            doctor: {
              doctorId: assignedDoctor.associate_id,
              name: assignedDoctor.full_name.startsWith('Dr.')
                ? assignedDoctor.full_name
                : `Dr. ${assignedDoctor.full_name}`,
              specialty: assignedDoctor.specialty,
              callNumber: `+91-${Math.floor(9000000000 + Math.random() * 999999999)}`, // simulated
              callAction: 'SIMULATED',
            },
            triageSummary: {
              symptoms: triage.symptoms || [],
              duration: triage.duration || null,
              severity: triage.severity || null,
              specialty: triage.specialty || null,
            },
          }
        : null,
    };
  }

  // ─── 2. NOTIFICATIONS ──────────────────────────────────────────────────────

  @Get('notifications/:memberId')
  async getNotifications(@Param('memberId') memberId: string) {
    const notifications = await this.prisma.notifications.findMany({
      where: { member_id: memberId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    return { notifications };
  }

  @Get('notifications/session/:sessionId')
  async getSessionNotifications(@Param('sessionId') sessionId: string) {
    const notifications = await this.prisma.notifications.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    const unreadCount = notifications.filter(
      (n) => n.status === 'PENDING',
    ).length;
    return { notifications, unreadCount };
  }

  @Patch('notifications/:notificationId/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('notificationId') notificationId: string) {
    const updated = await this.prisma.notifications.update({
      where: { notification_id: notificationId },
      data: { status: 'READ', read_at: new Date() },
    });
    return { success: true, notification: updated };
  }

  @Patch('notifications/:sessionId/read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@Param('sessionId') sessionId: string) {
    await this.prisma.notifications.updateMany({
      where: { session_id: sessionId, status: 'PENDING' },
      data: { status: 'READ', read_at: new Date() },
    });
    return { success: true };
  }

  // ─── 3. JANMITRA HANDOFF ───────────────────────────────────────────────────

  @Post('handoff/to-human/:sessionId')
  @HttpCode(HttpStatus.OK)
  async handoffToHuman(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: string },
  ) {
    const session = await this.prisma.opd_sessions.findFirst({
      where: { session_id: sessionId, is_active: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    // Find an available Janmitra associate
    const janmitra = await this.prisma.janmitra_associates.findFirst({
      where: { is_available: true },
    });

    await this.prisma.opd_sessions.update({
      where: { session_id: sessionId },
      data: {
        controlled_by: 'HUMAN',
        janmitra_id: janmitra?.janmitra_id || null,
      } as any,
    });

    // Create notification for session
    const inputs = (session.collected_inputs as any) || {};
    await this.prisma.notifications.create({
      data: {
        member_id: session.member_id,
        case_id: session.case_id,
        session_id: sessionId,
        type: 'HANDOFF',
        title: '👨‍💼 Janmitra Associate is now assisting you',
        message: janmitra
          ? `${janmitra.full_name} has taken over your session. They can help you complete your healthcare journey.`
          : 'A Janmitra Associate has been notified and will join shortly.',
        status: 'PENDING',
      } as any,
    });

    await this.audit.log(
      'SYSTEM',
      'HANDOFF_TO_HUMAN',
      'opd_sessions',
      sessionId,
      {
        reason: body.reason || 'User requested human help',
        janmitraId: janmitra?.janmitra_id,
      },
    );

    return {
      success: true,
      controlledBy: 'HUMAN',
      janmitra: janmitra
        ? {
            janmitraId: janmitra.janmitra_id,
            fullName: janmitra.full_name,
            role: janmitra.role,
            avatarUrl: janmitra.avatar_url,
            phone: janmitra.phone,
            callAction: 'SIMULATED',
          }
        : null,
      message: janmitra
        ? `${janmitra.full_name} is now assisting this session.`
        : 'A Janmitra Associate will be assigned shortly.',
    };
  }

  @Post('handoff/to-ai/:sessionId')
  @HttpCode(HttpStatus.OK)
  async handoffToAi(@Param('sessionId') sessionId: string) {
    const session = await this.prisma.opd_sessions.findFirst({
      where: { session_id: sessionId, is_active: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.opd_sessions.update({
      where: { session_id: sessionId },
      data: { controlled_by: 'AI', janmitra_id: null } as any,
    });

    await this.prisma.notifications.create({
      data: {
        member_id: session.member_id,
        case_id: session.case_id,
        session_id: sessionId,
        type: 'HANDOFF',
        title: '🤖 Jana AI has resumed control',
        message:
          'The Janmitra Associate has handed control back to Jana AI. Please continue your session.',
        status: 'PENDING',
      } as any,
    });

    return { success: true, controlledBy: 'AI' };
  }

  @Post('handoff/janmitra-message/:sessionId')
  @HttpCode(HttpStatus.OK)
  async janmitraSendMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string; janmitraId?: string; janmitraName?: string },
  ) {
    if (!body.message?.trim())
      throw new BadRequestException('Message is required');

    const session = await this.prisma.opd_sessions.findFirst({
      where: { session_id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const caseId = session.case_id;

    // Persist as a case_event so it flows through the member's SSE stream
    await this.orchestrator.addCaseEvent(
      caseId || 'PENDING_' + sessionId,
      'JANMITRA_MESSAGE',
      {
        message: body.message.trim(),
        janmitraName: body.janmitraName || 'Janmitra Associate',
        janmitraId: body.janmitraId,
        timestamp: new Date().toISOString(),
      },
      'JANMITRA',
      sessionId,
    );

    // Also store as notification for the member
    if (session.member_id) {
      await this.prisma.notifications.create({
        data: {
          member_id: session.member_id,
          case_id: caseId,
          session_id: sessionId,
          type: 'HANDOFF',
          title: `💬 ${body.janmitraName || 'Janmitra Associate'} says:`,
          message: body.message.trim(),
          status: 'PENDING',
        } as any,
      });
    }

    return {
      success: true,
      message: body.message.trim(),
      sessionId,
      sender: 'janmitra',
      janmitraId: body.janmitraId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('handoff/janmitra-trigger/:sessionId')
  @HttpCode(HttpStatus.OK)
  async janmitraTriggerAction(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string; janmitraId?: string; janmitraName?: string },
  ) {
    if (!body.message?.trim())
      throw new BadRequestException('Trigger message is required');

    const session = await this.prisma.opd_sessions.findFirst({
      where: { session_id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const caseId = session.case_id;

    // 1. Process the message through the orchestrator with bypassHumanCheck=true
    const response = await this.orchestrator.handleMessage(
      sessionId,
      body.message.trim(),
      (session as any).language_preference || 'English',
      true, // bypassHumanCheck
    );

    // 2. Persist the response as a case event so it flows through the SSE stream
    await this.orchestrator.addCaseEvent(
      caseId || 'PENDING_' + sessionId,
      'AI_RESPONSE',
      {
        ...response,
        triggeredBy: 'JANMITRA',
        janmitraName: body.janmitraName || 'Janmitra Associate',
      },
      'JANMITRA',
      sessionId,
    );

    return {
      success: true,
      response,
      sessionId,
      triggeredBy: 'JANMITRA',
    };
  }


  // ─── ACTIVE SESSIONS (for Associate Dashboard) ───────────────────────────

  @Get('sessions/active')
  async getActiveSessions() {
    const sessions = await this.prisma.opd_sessions.findMany({
      where: { is_active: true },
      orderBy: { updated_at: 'desc' },
      take: 50,
    });

    return {
      sessions: sessions.map((s) => {
        const inputs = (s.collected_inputs as any) || {};
        return {
          sessionId: s.session_id,
          caseId: s.case_id,
          opdState: s.opd_state,
          controlledBy: (s as any).controlled_by || 'AI',
          janmitraId: (s as any).janmitra_id || null,
          memberName: inputs.memberName || 'New Member',
          memberId: s.member_id,
          symptoms: inputs.triage?.symptoms || [],
          severity: inputs.triage?.severity || null,
          consultationType: inputs.consultationType || null,
          doctorName: inputs.doctorName || null,
          language: inputs.language || 'English',
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        };
      }),
    };
  }

  // ─── CHAT HISTORY (for Associate Dashboard) ───────────────────────────────

  @Get('sessions/:sessionId/history')
  async getSessionHistory(@Param('sessionId') sessionId: string) {
    const session = await this.prisma.opd_sessions.findUnique({
      where: { session_id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const history = (session.ai_history as any[]) || [];
    const inputs = (session.collected_inputs as any) || {};

    let caseEvents: any[] = [];
    if (session.case_id) {
      caseEvents = await this.prisma.case_events.findMany({
        where: { case_id: session.case_id },
        orderBy: { created_at: 'asc' },
      });
    }

    return {
      sessionId,
      caseId: session.case_id,
      opdState: session.opd_state,
      controlledBy: (session as any).controlled_by || 'AI',
      memberName: inputs.memberName || 'Member',
      history,
      caseEvents,
    };
  }

  // ─── 4. APPOINTMENT DASHBOARD ──────────────────────────────────────────────

  @Get('appointments/:memberId')
  async getAppointmentDashboard(@Param('memberId') memberId: string) {
    const cases = await this.prisma.cases.findMany({
      where: { members_member_id: memberId },
      select: { case_id: true },
    });
    const caseIds = cases.map((c) => c.case_id);

    if (caseIds.length === 0) return { upcoming: [], past: [], cancelled: [] };

    const all = await this.prisma.appointments.findMany({
      where: { case_id: { in: caseIds } },
      include: { doctor: true, case: true },
      orderBy: { scheduled_at: 'asc' },
    });

    const now = new Date();
    const upcoming = all.filter(
      (a) => new Date(a.scheduled_at) >= now && a.status === 'BOOKED',
    );
    const past = all.filter(
      (a) => new Date(a.scheduled_at) < now && a.status !== 'CANCELLED',
    );
    const cancelled = all.filter((a) => a.status === 'CANCELLED');

    const mapAppt = (a: any) => ({
      appointmentId: a.appointment_id,
      caseId: a.case_id,
      doctor: {
        name: a.doctor.full_name.startsWith('Dr.')
          ? a.doctor.full_name
          : `Dr. ${a.doctor.full_name}`,
        specialty: a.doctor.specialty,
        phone: `+91-${Math.floor(9000000000 + Math.random() * 999999999)}`,
      },
      type: a.appointment_type,
      scheduledAt: a.scheduled_at,
      status: a.status,
      notes: a.notes,
    });

    return {
      upcoming: upcoming.map(mapAppt),
      past: past.map(mapAppt),
      cancelled: cancelled.map(mapAppt),
    };
  }

  // ─── 5. RESCHEDULE APPOINTMENT ────────────────────────────────────────────

  @Post('appointments/:appointmentId/reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { newSlotId: string },
  ) {
    if (!body.newSlotId) throw new BadRequestException('newSlotId is required');

    const existing = await this.prisma.appointments.findUnique({
      where: { appointment_id: appointmentId },
    });
    if (!existing) throw new NotFoundException('Appointment not found');

    // Release old slot
    if (existing.slot_id) {
      await this.prisma.doctor_availability
        .update({
          where: { availability_id: existing.slot_id },
          data: { is_booked: false },
        })
        .catch(() => null);
    }

    // Book new slot
    const newSlot = await this.prisma.doctor_availability.findUnique({
      where: { availability_id: body.newSlotId },
    });
    if (!newSlot) throw new NotFoundException('New slot not found');
    if (newSlot.is_booked)
      throw new BadRequestException('Slot is already booked');

    await this.prisma.doctor_availability.update({
      where: { availability_id: body.newSlotId },
      data: { is_booked: true },
    });

    const updated = await this.prisma.appointments.update({
      where: { appointment_id: appointmentId },
      data: {
        slot_id: body.newSlotId,
        scheduled_at: newSlot.start_time,
        status: 'BOOKED',
        notes: `Rescheduled at ${new Date().toISOString()}`,
      },
    });

    // Create notification
    await this.prisma.notifications.create({
      data: {
        case_id: existing.case_id,
        type: 'APPOINTMENT_REMINDER',
        title: '📅 Appointment Rescheduled',
        message: `Your appointment has been rescheduled to ${newSlot.start_time.toLocaleDateString('en-IN')} at ${newSlot.start_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`,
        status: 'PENDING',
        scheduled_at: newSlot.start_time,
      } as any,
    });

    return { success: true, appointment: updated };
  }

  @Post('appointments/:appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(@Param('appointmentId') appointmentId: string) {
    const existing = await this.prisma.appointments.findUnique({
      where: { appointment_id: appointmentId },
    });
    if (!existing) throw new NotFoundException('Appointment not found');

    // Release slot
    if (existing.slot_id) {
      await this.prisma.doctor_availability
        .update({
          where: { availability_id: existing.slot_id },
          data: { is_booked: false },
        })
        .catch(() => null);
    }

    const updated = await this.prisma.appointments.update({
      where: { appointment_id: appointmentId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, appointment: updated };
  }

  // ─── 6. JANMITRA ASSOCIATES LIST ─────────────────────────────────────────

  @Get('janmitra/available')
  async getAvailableJanmitra() {
    const associates = await this.prisma.janmitra_associates.findMany({
      where: { is_available: true },
      take: 5,
    });
    return { associates };
  }

  // ─── 7. CLICK-TO-CALL (Simulated) ────────────────────────────────────────

  @Post('call/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateCall(
    @Body() body: { targetType: string; targetId: string; sessionId?: string },
  ) {
    // Simulated: return call metadata only
    const labelMap: Record<string, string> = {
      doctor: '🩺 Doctor',
      janmitra: '👨‍💼 Janmitra Associate',
      pharmacy: '💊 Pharmacy',
      diagnostic: '🔬 Diagnostic Center',
    };

    return {
      success: true,
      callId: `CALL-${Date.now()}`,
      status: 'SIMULATED',
      targetType: body.targetType,
      targetId: body.targetId,
      displayLabel: labelMap[body.targetType] || 'Support',
      callUrl: `tel:+91-1800-JANA-${Math.floor(1000 + Math.random() * 9000)}`,
      message: `Connecting you to ${labelMap[body.targetType] || 'support'}... (Simulated)`,
      startedAt: new Date().toISOString(),
    };
  }
}
