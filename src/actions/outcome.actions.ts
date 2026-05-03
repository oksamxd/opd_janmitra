/**
 * Outcome Actions — Prescription, test order, and referral creation
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';

@Injectable()
export class OutcomeActions {
  private readonly logger = new Logger(OutcomeActions.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  /**
   * Generate a prescription with medication items.
   */
  async generatePrescription(
    caseId: string,
    doctorId: string,
    diagnosis: string,
    advice: string,
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const prescription = await tx.prescriptions.create({
        data: {
          case_id: caseId,
          doctor_id: doctorId,
          diagnosis,
          advice,
          status: 'ACTIVE',
        },
      });

      for (const med of medications) {
        await tx.prescription_items.create({
          data: {
            prescription_id: prescription.prescription_id,
            medicine_name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions || null,
          },
        });
      }

      await this.audit.log(
        'OUTCOME_ACTIONS',
        'GENERATE_PRESCRIPTION',
        'prescriptions',
        prescription.prescription_id,
        {
          caseId,
          medCount: medications.length,
        },
      );

      return prescription;
    });
  }

  /**
   * Create test orders.
   */
  async createTestOrders(
    caseId: string,
    tests: { name: string; type: string }[],
  ) {
    const orders: any[] = [];

    for (const test of tests) {
      const order = await this.prisma.test_orders.create({
        data: {
          case_id: caseId,
          test_name: test.name,
          test_type: test.type,
          status: 'ORDERED',
        },
      });
      orders.push(order);
    }

    await this.audit.log(
      'OUTCOME_ACTIONS',
      'CREATE_TEST_ORDERS',
      'test_orders',
      caseId,
      {
        testCount: tests.length,
      },
    );

    return orders;
  }

  /**
   * Create a specialist referral.
   */
  async createReferral(caseId: string, specialty: string, reason: string) {
    const referral = await this.prisma.referrals.create({
      data: {
        case_id: caseId,
        specialty,
        reason,
        status: 'PENDING',
      },
    });

    await this.audit.log(
      'OUTCOME_ACTIONS',
      'CREATE_REFERRAL',
      'referrals',
      referral.referral_id,
      {
        caseId,
        specialty,
      },
    );

    return referral;
  }

  /**
   * Get all outcomes for a case.
   */
  async getCaseOutcomes(caseId: string) {
    const [prescriptions, testOrders, referrals] = await Promise.all([
      this.prisma.prescriptions.findMany({
        where: { case_id: caseId },
        include: { items: true, deliveries: true },
      }),
      this.prisma.test_orders.findMany({
        where: { case_id: caseId },
      }),
      this.prisma.referrals.findMany({
        where: { case_id: caseId },
      }),
    ]);

    return { prescriptions, testOrders, referrals };
  }
}
