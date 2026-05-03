/**
 * Trigger Engine — Event-driven trigger system
 *
 * All triggers are IDEMPOTENT: check-before-create.
 * Prevents duplicate entity creation on retry.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from './audit-logger';

@Injectable()
export class TriggerEngine {
  private readonly logger = new Logger(TriggerEngine.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  // ──────────────────────────────────────────────────────────
  // 1. CASE_CREATION_TRIGGER
  // ──────────────────────────────────────────────────────────
  async caseCrationTrigger(params: {
    memberId: string;
    description: string;
    triageData: any;
    consultationType: string;
  }) {
    // IDEMPOTENCY: Check if an open case already exists for this member
    const existing = await this.prisma.cases.findFirst({
      where: {
        member_id: params.memberId,
        status: 'OPEN',
      },
    });

    if (existing) {
      this.logger.warn(
        `IDEMPOTENT: Case already exists for member ${params.memberId}: ${existing.case_id}`,
      );
      await this.audit.log(
        'TRIGGER_ENGINE',
        'CASE_CREATION_TRIGGER_SKIPPED',
        'cases',
        existing.case_id,
        { reason: 'IDEMPOTENT' },
      );
      return { case: existing, isNew: false };
    }

    const DEFAULT_SERVICE_ID = 'OPD_CONSULTATION';

    const newCase = await this.prisma.$transaction(async (tx) => {
      const c = await tx.cases.create({
        data: {
          member_id: params.memberId,
          service_id: DEFAULT_SERVICE_ID,
          description: params.description,
          status: 'OPEN',
          opd_state: 'CASE_CREATED',
          triage_data: params.triageData,
        },
      });

      // Create the doctor consultation service
      await tx.case_services.create({
        data: {
          case_id: c.case_id,
          service_name: 'DOCTOR_CONSULTATION',
          service_type: params.consultationType,
          status: 'PENDING',
        },
      });

      // Event log - Silenced per user request (Too early for clinical journey)
      /*
      await tx.case_events.create({
        data: {
          case_id: c.case_id,
          event_type: 'CASE_CREATED',
          actor_type: 'SYSTEM',
          payload: { trigger: 'CASE_CREATION_TRIGGER', consultationType: params.consultationType },
        },
      });
      */

      // Status history
      await tx.case_status_history.create({
        data: {
          case_id: c.case_id,
          old_status: null,
          new_status: 'OPEN',
          remarks: 'Case created by CASE_CREATION_TRIGGER',
        },
      });

      // Triage Event - Silenced per user request (Too early for clinical journey)
      /*
      await tx.case_events.create({
        data: {
          case_id: c.case_id,
          event_type: 'TRIAGE_COMPLETED',
          actor_type: 'SYSTEM',
          payload: {
            message: 'Patient triage assessment completed successfully.',
            severity: params.triageData?.severity || 'MODERATE',
            symptoms: params.triageData?.symptoms?.join(', ') || 'N/A'
          },
        },
      });
      */

      return c;
    });

    await this.audit.log(
      'TRIGGER_ENGINE',
      'CASE_CREATION_TRIGGER',
      'cases',
      newCase.case_id,
      params,
    );
    this.logger.log(
      `✅ CASE_CREATION_TRIGGER: Created case ${newCase.case_id}`,
    );

    return { case: newCase, isNew: true };
  }

  // ──────────────────────────────────────────────────────────
  // 2. APPOINTMENT_BOOKED_TRIGGER
  // ──────────────────────────────────────────────────────────
  async appointmentBookedTrigger(params: {
    caseId: string;
    doctorId: string;
    slotId: string;
  }) {
    // IDEMPOTENCY: Check if appointment already exists
    const existing = await this.prisma.appointments.findFirst({
      where: {
        case_id: params.caseId,
        doctor_id: params.doctorId,
        status: 'BOOKED',
      },
    });

    if (existing) {
      this.logger.warn(
        `IDEMPOTENT: Appointment already booked for case ${params.caseId}`,
      );
      await this.audit.log(
        'TRIGGER_ENGINE',
        'APPOINTMENT_BOOKED_TRIGGER_SKIPPED',
        'appointments',
        existing.appointment_id,
        { reason: 'IDEMPOTENT' },
      );
      return { appointment: existing, isNew: false };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Get and validate slot
      const slot = await tx.doctor_availability.findUnique({
        where: { availability_id: params.slotId },
      });

      if (!slot) throw new Error('Slot not found');
      if (slot.is_booked)
        throw new Error('Slot already booked — concurrency conflict');

      // 2. Book the slot (optimistic locking via is_booked check)
      await tx.doctor_availability.update({
        where: { availability_id: params.slotId },
        data: { is_booked: true },
      });

      // 3. Create appointment
      const appointment = await tx.appointments.create({
        data: {
          case_id: params.caseId,
          doctor_id: params.doctorId,
          slot_id: params.slotId,
          appointment_type: 'CONSULTATION',
          scheduled_at: slot.start_time,
          status: 'BOOKED',
        },
      });

      // 4. Update case service
      const service = await tx.case_services.findFirst({
        where: {
          case_id: params.caseId,
          service_name: 'DOCTOR_CONSULTATION',
        },
      });

      if (service) {
        await tx.case_services.update({
          where: { case_service_id: service.case_service_id },
          data: {
            scheduled_at: slot.start_time,
            status: 'SCHEDULED',
          },
        });
      }

      // 5. Event log
      await tx.case_events.create({
        data: {
          case_id: params.caseId,
          event_type: 'APPOINTMENT_BOOKED',
          actor_type: 'SYSTEM',
          payload: {
            trigger: 'APPOINTMENT_BOOKED_TRIGGER',
            doctorId: params.doctorId,
            slotId: params.slotId,
            scheduledAt: slot.start_time,
          },
        },
      });

      return appointment;
    });

    await this.audit.log(
      'TRIGGER_ENGINE',
      'APPOINTMENT_BOOKED_TRIGGER',
      'appointments',
      result.appointment_id,
      params,
    );
    this.logger.log(
      `✅ APPOINTMENT_BOOKED_TRIGGER: Booked appointment ${result.appointment_id}`,
    );

    return { appointment: result, isNew: true };
  }

  // ──────────────────────────────────────────────────────────
  // 3. DOCTOR_OUTCOME_TRIGGER
  // ──────────────────────────────────────────────────────────
  async doctorOutcomeTrigger(params: {
    caseId: string;
    doctorId: string;
    outcomes: {
      prescription?: {
        diagnosis: string;
        advice: string;
        medications: {
          name: string;
          dosage: string;
          frequency: string;
          duration: string;
          instructions?: string;
        }[];
      };
      testOrders?: { name: string; type: string }[];
      referrals?: { specialty: string; reason: string }[];
    };
  }) {
    const results: any = { prescription: null, testOrders: [], referrals: [] };

    await this.prisma.$transaction(async (tx) => {
      // ─── PRESCRIPTION ───
      if (params.outcomes.prescription) {
        // Idempotency check
        const existingRx = await tx.prescriptions.findFirst({
          where: { case_id: params.caseId, status: 'ACTIVE' },
        });

        if (!existingRx) {
          const rx = await tx.prescriptions.create({
            data: {
              case_id: params.caseId,
              doctor_id: params.doctorId,
              diagnosis: params.outcomes.prescription.diagnosis,
              advice: params.outcomes.prescription.advice,
              status: 'ACTIVE',
            },
          });

          for (const med of params.outcomes.prescription.medications) {
            await tx.prescription_items.create({
              data: {
                prescription_id: rx.prescription_id,
                medicine_name: med.name,
                dosage: med.dosage,
                frequency: med.frequency,
                duration: med.duration,
                instructions: med.instructions || null,
              },
            });
          }

          results.prescription = rx;
        }
      }

      // ─── TEST ORDERS ───
      if (params.outcomes.testOrders && params.outcomes.testOrders.length > 0) {
        for (const test of params.outcomes.testOrders) {
          // Idempotency: skip if same test already ordered
          const existingTest = await tx.test_orders.findFirst({
            where: {
              case_id: params.caseId,
              test_name: test.name,
              status: { not: 'CANCELLED' },
            },
          });

          if (!existingTest) {
            const order = await tx.test_orders.create({
              data: {
                case_id: params.caseId,
                test_name: test.name,
                test_type: test.type,
                status: 'ORDERED',
              },
            });
            results.testOrders.push(order);
          }
        }
      }

      // ─── REFERRALS ───
      if (params.outcomes.referrals && params.outcomes.referrals.length > 0) {
        for (const ref of params.outcomes.referrals) {
          const existingRef = await tx.referrals.findFirst({
            where: {
              case_id: params.caseId,
              specialty: ref.specialty,
              status: 'PENDING',
            },
          });

          if (!existingRef) {
            const referral = await tx.referrals.create({
              data: {
                case_id: params.caseId,
                specialty: ref.specialty,
                reason: ref.reason,
                status: 'PENDING',
              },
            });
            results.referrals.push(referral);
          }
        }
      }

      // Event
      await tx.case_events.create({
        data: {
          case_id: params.caseId,
          event_type: 'DOCTOR_OUTCOME_GENERATED',
          actor_type: 'DOCTOR',
          actor_id: params.doctorId,
          payload: {
            trigger: 'DOCTOR_OUTCOME_TRIGGER',
            hasPrescription: !!params.outcomes.prescription,
            testCount: params.outcomes.testOrders?.length || 0,
            referralCount: params.outcomes.referrals?.length || 0,
          },
        },
      });
    });

    await this.audit.log(
      'TRIGGER_ENGINE',
      'DOCTOR_OUTCOME_TRIGGER',
      'cases',
      params.caseId,
      {
        prescription: !!results.prescription,
        tests: results.testOrders.length,
        referrals: results.referrals.length,
      },
    );

    this.logger.log(
      `✅ DOCTOR_OUTCOME_TRIGGER: Generated outcomes for case ${params.caseId}`,
    );
    return results;
  }

  // ──────────────────────────────────────────────────────────
  // 4. DIAGNOSTIC_BOOKING_TRIGGER
  // ──────────────────────────────────────────────────────────
  async diagnosticBookingTrigger(params: {
    testOrderId: string;
    scheduledAt: Date;
  }) {
    const order = await this.prisma.test_orders.findUnique({
      where: { test_order_id: params.testOrderId },
    });

    if (!order) throw new Error('Test order not found');
    if (order.status === 'SCHEDULED') {
      return { testOrder: order, isNew: false };
    }

    const updated = await this.prisma.test_orders.update({
      where: { test_order_id: params.testOrderId },
      data: {
        scheduled_at: params.scheduledAt,
        status: 'SCHEDULED',
      },
    });

    await this.prisma.case_events.create({
      data: {
        case_id: order.case_id,
        event_type: 'LAB_TEST_SCHEDULED',
        actor_type: 'SYSTEM',
        payload: {
          message: `${order.test_name} has been scheduled for ${params.scheduledAt.toLocaleDateString()}`,
          testOrderId: order.test_order_id,
        },
      },
    });

    await this.audit.log(
      'TRIGGER_ENGINE',
      'DIAGNOSTIC_BOOKING_TRIGGER',
      'test_orders',
      params.testOrderId,
      params,
    );
    return { testOrder: updated, isNew: true };
  }

  // ──────────────────────────────────────────────────────────
  // 5. MEDICINE_DELIVERY_TRIGGER
  // ──────────────────────────────────────────────────────────
  async medicineDeliveryTrigger(params: {
    prescriptionId: string;
    address: string;
  }) {
    // Idempotency
    const existing = await this.prisma.deliveries.findFirst({
      where: {
        prescription_id: params.prescriptionId,
        status: { not: 'CANCELLED' },
      },
    });

    if (existing) {
      return { delivery: existing, isNew: false };
    }

    const eta = new Date();
    eta.setHours(eta.getHours() + 2); // 2-hour ETA

    const delivery = await this.prisma.deliveries.create({
      data: {
        prescription_id: params.prescriptionId,
        address: params.address,
        status: 'PROCESSING',
        eta,
      },
    });

    // We need the associated case_id
    const rx = await this.prisma.prescriptions.findUnique({
      where: { prescription_id: params.prescriptionId },
      select: { case_id: true },
    });

    if (rx) {
      await this.prisma.case_events.create({
        data: {
          case_id: rx.case_id,
          event_type: 'MEDICINE_DELIVERY_BOOKED',
          actor_type: 'SYSTEM',
          payload: {
            message: `Delivery scheduled to ${params.address}. ETA: within 2 hours.`,
            deliveryId: delivery.delivery_id,
          },
        },
      });
    }

    await this.audit.log(
      'TRIGGER_ENGINE',
      'MEDICINE_DELIVERY_TRIGGER',
      'deliveries',
      delivery.delivery_id,
      params,
    );
    return { delivery, isNew: true };
  }

  // ──────────────────────────────────────────────────────────
  // 6. SPECIALIST_BOOKING_TRIGGER
  // ──────────────────────────────────────────────────────────
  async specialistBookingTrigger(params: {
    caseId: string;
    referralId: string;
    doctorId: string;
    slotId: string;
  }) {
    const existing = await this.prisma.appointments.findFirst({
      where: {
        case_id: params.caseId,
        doctor_id: params.doctorId,
        appointment_type: 'SPECIALIST_REFERRAL',
        status: 'BOOKED',
      },
    });

    if (existing) {
      return { appointment: existing, isNew: false };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.doctor_availability.findUnique({
        where: { availability_id: params.slotId },
      });

      if (!slot || slot.is_booked) throw new Error('Slot not available');

      await tx.doctor_availability.update({
        where: { availability_id: params.slotId },
        data: { is_booked: true },
      });

      const appointment = await tx.appointments.create({
        data: {
          case_id: params.caseId,
          doctor_id: params.doctorId,
          slot_id: params.slotId,
          appointment_type: 'SPECIALIST_REFERRAL',
          scheduled_at: slot.start_time,
          status: 'BOOKED',
        },
      });

      await tx.referrals.update({
        where: { referral_id: params.referralId },
        data: {
          referred_to: params.doctorId,
          status: 'BOOKED',
        },
      });

      return appointment;
    });

    await this.audit.log(
      'TRIGGER_ENGINE',
      'SPECIALIST_BOOKING_TRIGGER',
      'appointments',
      result.appointment_id,
      params,
    );
    return { appointment: result, isNew: true };
  }
}
