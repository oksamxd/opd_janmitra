/**
 * OPD REST API Controller — All required endpoints
 */

import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MemberActions } from '../actions/member.actions';
import { CaseActions } from '../actions/case.actions';
import { DoctorActions } from '../actions/doctor.actions';
import { AppointmentActions } from '../actions/appointment.actions';
import { OutcomeActions } from '../actions/outcome.actions';
import { DeliveryActions } from '../actions/delivery.actions';
import { TriggerEngine } from '../engine/trigger-engine';
import { AuditLogger } from '../engine/audit-logger';

@Controller('opd')
export class OpdController {
  constructor(
    private memberActions: MemberActions,
    private caseActions: CaseActions,
    private doctorActions: DoctorActions,
    private appointmentActions: AppointmentActions,
    private outcomeActions: OutcomeActions,
    private deliveryActions: DeliveryActions,
    private triggers: TriggerEngine,
    private audit: AuditLogger,
  ) {}

  /**
   * POST /api/verify-member
   */
  @Post('verify-member')
  async verifyMember(@Body() body: { memberId: string }) {
    const member = await this.memberActions.verifyMember(body.memberId);
    if (!member) {
      return { success: false, message: 'Member not found' };
    }
    return { success: true, data: member };
  }

  /**
   * POST /api/create-case
   */
  @Post('create-case')
  async createCase(
    @Body()
    body: {
      memberId: string;
      description: string;
      triageData?: any;
      consultationType?: string;
    },
  ) {
    const result = await this.triggers.caseCrationTrigger({
      memberId: body.memberId,
      description: body.description,
      triageData: body.triageData || {},
      consultationType: body.consultationType || 'IN_PERSON',
    });
    return { success: true, data: result };
  }

  /**
   * POST /api/assign-doctor
   */
  @Post('assign-doctor')
  async assignDoctor(@Body() body: { caseId: string; doctorId: string }) {
    const doctor = await this.doctorActions.assignDoctor(
      body.caseId,
      body.doctorId,
    );
    return { success: true, data: doctor };
  }

  /**
   * POST /api/book-appointment
   */
  @Post('book-appointment')
  async bookAppointment(
    @Body() body: { caseId: string; doctorId: string; slotId: string },
  ) {
    const result = await this.triggers.appointmentBookedTrigger({
      caseId: body.caseId,
      doctorId: body.doctorId,
      slotId: body.slotId,
    });
    return { success: true, data: result };
  }

  /**
   * POST /api/create-prescription
   */
  @Post('create-prescription')
  async createPrescription(
    @Body()
    body: {
      caseId: string;
      doctorId: string;
      diagnosis: string;
      advice: string;
      medications: {
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
      }[];
    },
  ) {
    const result = await this.outcomeActions.generatePrescription(
      body.caseId,
      body.doctorId,
      body.diagnosis,
      body.advice,
      body.medications,
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/create-test-order
   */
  @Post('create-test-order')
  async createTestOrder(
    @Body() body: { caseId: string; tests: { name: string; type: string }[] },
  ) {
    const result = await this.outcomeActions.createTestOrders(
      body.caseId,
      body.tests,
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/create-referral
   */
  @Post('create-referral')
  async createReferral(
    @Body() body: { caseId: string; specialty: string; reason: string },
  ) {
    const result = await this.outcomeActions.createReferral(
      body.caseId,
      body.specialty,
      body.reason,
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/schedule-diagnostic
   */
  @Post('schedule-diagnostic')
  async scheduleDiagnostic(
    @Body() body: { testOrderId: string; scheduledAt: string },
  ) {
    const result = await this.deliveryActions.scheduleDiagnostic(
      body.testOrderId,
      new Date(body.scheduledAt),
    );
    return { success: true, data: result };
  }

  /**
   * POST /api/arrange-delivery
   */
  @Post('arrange-delivery')
  async arrangeDelivery(
    @Body() body: { prescriptionId: string; address: string },
  ) {
    const result = await this.deliveryActions.arrangeDelivery(
      body.prescriptionId,
      body.address,
    );
    return { success: true, data: result };
  }

  /**
   * GET /api/case/:id — Full case details
   */
  @Get('case/:id')
  async getCase(@Param('id') caseId: string) {
    const result = await this.caseActions.getFullCase(caseId);
    if (!result) {
      return { success: false, message: 'Case not found' };
    }
    return { success: true, data: result };
  }

  /**
   * GET /api/history/:memberId
   * Fetch all past cases and medical history for a member.
   */
  @Get('history/:memberId')
  async getMemberHistory(@Param('memberId') memberId: string) {
    return this.caseActions.getMemberCases(memberId);
  }
}
