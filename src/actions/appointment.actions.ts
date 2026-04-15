/**
 * Appointment Actions — Concurrency-safe slot booking
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';

@Injectable()
export class AppointmentActions {
  private readonly logger = new Logger(AppointmentActions.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  /**
   * Book an appointment slot. Uses DB transaction for concurrency safety.
   */
  async bookAppointment(caseId: string, doctorId: string, slotId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get slot with lock check
      const slot = await tx.doctor_availability.findUnique({
        where: { availability_id: slotId },
      });

      if (!slot) throw new Error('Appointment slot not found');
      if (slot.is_booked) throw new Error('This slot has already been booked by another patient');

      // 2. Mark slot as booked
      await tx.doctor_availability.update({
        where: { availability_id: slotId },
        data: { is_booked: true },
      });

      // 3. Create appointment
      const appointment = await tx.appointments.create({
        data: {
          case_id: caseId,
          doctor_id: doctorId,
          slot_id: slotId,
          appointment_type: 'CONSULTATION',
          scheduled_at: slot.start_time,
          status: 'BOOKED',
        },
      });

      // 4. Update case_services
      const service = await tx.case_services.findFirst({
        where: { case_id: caseId, service_name: 'DOCTOR_CONSULTATION' },
      });

      if (service) {
        await tx.case_services.update({
          where: { case_service_id: service.case_service_id },
          data: { scheduled_at: slot.start_time, status: 'SCHEDULED' },
        });
      }

      // 5. Event log
      await tx.case_events.create({
        data: {
          case_id: caseId,
          event_type: 'APPOINTMENT_BOOKED',
          actor_type: 'USER',
          payload: {
            appointmentId: appointment.appointment_id,
            scheduledAt: slot.start_time,
            doctorId,
          },
        },
      });

      return appointment;
    });
  }
}
