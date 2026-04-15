import { Controller, Post, Body, Param, Get, Res } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OutcomeActions } from '../actions/outcome.actions';
import { OpdState, transition } from '../engine/state-machine';
import * as express from 'express';
import { join } from 'path';

@Controller('doctor')
export class DoctorController {
  constructor(
    private prisma: PrismaService,
    private outcomeActions: OutcomeActions,
  ) {}

  @Get('dashboard')
  async getDashboard(@Res() res: express.Response) {
    return res.sendFile(join(process.cwd(), 'frontend', 'doctor-panel.html'));
  }

  @Get('active-cases')
  async getActiveCases() {
    const sessions = await this.prisma.opd_sessions.findMany({
      where: {
        opd_state: {
          in: [OpdState.CONSULTATION_IN_PROGRESS, OpdState.TEST_COMPLETED],
        },
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map(s => ({
      sessionId: s.session_id,
      state: s.opd_state,
      createdAt: s.created_at,
      inputs: s.collected_inputs,
    }));
  }

  @Get('case-details/:sessionId')
  async getCaseDetails(@Param('sessionId') sessionId: string) {
    const session = await this.prisma.opd_sessions.findUnique({
      where: { session_id: sessionId },
    });
    if (!session) throw new Error('Session not found');

    const inputs = session.collected_inputs as any;
    const caseId = inputs['caseId'] as string;
    let caseData: any = null;
    
    if (caseId) {
      caseData = await this.prisma.cases.findUnique({
        where: { case_id: caseId },
        include: {
          test_orders: true,
          prescriptions: { include: { items: true } },
        },
      });
    }

    return {
      sessionId: session.session_id,
      state: session.opd_state,
      inputs: session.collected_inputs,
      history: session.ai_history,
      case: caseData,
    };
  }

  @Post('submit-outcomes/:sessionId')
  async submitOutcomes(
    @Param('sessionId') sessionId: string,
    @Body() body: {
      caseId: string;
      doctorId: string;
      consultationNote: string;
      diagnosis: string;
      prescriptions: { medicine: string; dosage: string; frequency: string; duration: string }[];
      testOrders: string[];
      referralSpecialty: string;
    }
  ) {
    const session = await this.prisma.opd_sessions.findUnique({ where: { session_id: sessionId } });
    if (!session) throw new Error('Session not found');

    const inputs = session.collected_inputs as any;
    inputs.consultationNote = body.consultationNote;
    inputs.diagnosis = body.diagnosis;

    inputs.outcomes = inputs.outcomes || {};

    // Save Prescriptions
    if (body.prescriptions && body.prescriptions.length > 0) {
      const p = await this.outcomeActions.generatePrescription(
        body.caseId,
        body.doctorId,
        body.diagnosis,
        body.consultationNote || 'Follow medication.',
        body.prescriptions.map(p => ({
          name: p.medicine,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration.toString() + ' days',
          instructions: 'Take after meals',
        }))
      );
      inputs.hasPrescription = true;
      inputs.outcomes.prescription = {
        diagnosis: body.diagnosis,
        medications: body.prescriptions.map(p => ({
          name: p.medicine,
          frequency: p.frequency,
        })),
      };
    }

    // Save Tests
    if (body.testOrders && body.testOrders.length > 0) {
      await this.outcomeActions.createTestOrders(
        body.caseId,
        body.testOrders.map(t => ({ name: t, type: 'ROUTINE' }))
      );
      inputs.hasTests = true;
      inputs.outcomes.testOrders = body.testOrders.map(t => ({ name: t, type: 'ROUTINE' }));
    }

    // Save Referral
    if (body.referralSpecialty && body.referralSpecialty !== 'None') {
      await this.outcomeActions.createReferral(
        body.caseId,
        body.referralSpecialty,
        `Referred from Doctor ${body.doctorId || 'Internal'}`
      );
      inputs.hasReferrals = true;
      inputs.outcomes.referrals = [{
        specialty: body.referralSpecialty,
        reason: `Referred from Doctor ${body.doctorId || 'Internal'}`,
      }];
    }

    // Force transition to OUTCOME_GENERATED
    // We skip CONSULTATION_COMPLETED because we have already generated outcomes manually!
    const newState = OpdState.OUTCOME_GENERATED;

    await this.prisma.opd_sessions.update({
      where: { session_id: sessionId },
      data: {
        opd_state: newState,
        collected_inputs: inputs as any,
      },
    });

    // Create an event for the context UI
    const eventParts: string[] = [];
    if (inputs.hasPrescription) eventParts.push('medicines prescribed');
    if (inputs.hasTests) eventParts.push('diagnostic tests ordered');
    if (inputs.hasReferrals) eventParts.push('specialist referral');
    const eventSummary = eventParts.length > 0 ? eventParts.join(', ') : 'review completed';

    // Fetch the patient's name for personalization
    const caseData = await this.prisma.cases.findUnique({
      where: { case_id: body.caseId },
      include: { members: true },
    });
    const patientName = caseData?.members?.full_name || 'you';

    await this.prisma.case_events.create({
      data: {
        case_id: body.caseId,
        event_type: 'DOCTOR_CONSULTATION_SUBMITTED',
        actor_type: 'DOCTOR',
        payload: {
          message: `Clinical update for ${patientName}: Dr. ${body.doctorId} has completed the review. Outcome: ${eventSummary}. Please open your chat to proceed.`,
        },
      },
    });

    return { success: true, newState };
  }
}
