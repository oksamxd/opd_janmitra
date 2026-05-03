/**
 * Case Actions — Case management and state updates
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';

@Injectable()
export class CaseActions {
  private readonly logger = new Logger(CaseActions.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  /**
   * Update case OPD state with history tracking.
   */
  async updateCaseState(caseId: string, newState: string, remarks?: string) {
    const current = await this.prisma.cases.findUnique({
      where: { case_id: caseId },
    });

    if (!current) throw new Error(`Case not found: ${caseId}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.cases.update({
        where: { case_id: caseId },
        data: { opd_state: newState },
      });

      await tx.case_status_history.create({
        data: {
          case_id: caseId,
          old_status: current.opd_state,
          new_status: newState,
          remarks:
            remarks || `State transition: ${current.opd_state} → ${newState}`,
        },
      });
    });

    await this.audit.logStateTransition(
      caseId,
      current.opd_state,
      newState,
      caseId,
    );
    return { caseId, oldState: current.opd_state, newState };
  }

  /**
   * Get full case details with all related data.
   */
  async getFullCase(caseId: string) {
    return this.prisma.cases.findUnique({
      where: { case_id: caseId },
      include: {
        case_services: true,
        appointments: {
          include: { doctor: true },
        },
        prescriptions: {
          include: { items: true, deliveries: true },
        },
        test_orders: true,
        referrals: true,
        case_status_history: {
          orderBy: { changed_at: 'desc' },
        },
        associate: true,
      },
    });
  }

  /**
   * Get all cases for a specific member.
   */
  async getMemberCases(memberId: string) {
    return this.prisma.cases.findMany({
      where: { member_id: memberId },
      include: {
        prescriptions: { include: { items: true, deliveries: true } },
        appointments: { include: { doctor: true } },
        case_services: true,
        test_orders: true,
        referrals: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Close a case.
   */
  async closeCase(caseId: string, reason?: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.cases.update({
        where: { case_id: caseId },
        data: { status: 'CLOSED', opd_state: 'CLOSED' },
      });

      await tx.case_events.create({
        data: {
          case_id: caseId,
          event_type: 'CASE_CLOSED',
          actor_type: 'SYSTEM',
          payload: { reason: reason || 'Normal closure' },
        },
      });
    });

    await this.audit.log('CASE_ACTIONS', 'CLOSE_CASE', 'cases', caseId, {
      reason,
    });
    return { caseId, status: 'CLOSED' };
  }
}
