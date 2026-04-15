/**
 * Doctor Actions — Doctor matching, assignment, slot retrieval
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';
import { mapSymptomsToSpecialty } from '../engine/rule-engine';

@Injectable()
export class DoctorActions {
  private readonly logger = new Logger(DoctorActions.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  /**
   * Get doctors matching the symptoms via rule engine specialty mapping.
   */
  async getDoctorsBySymptoms(symptomsText: string) {
    const { specialty, matchedKeywords } = mapSymptomsToSpecialty(symptomsText);

    this.logger.log(`Symptom mapping: "${symptomsText}" → ${specialty} (matched: ${matchedKeywords.join(', ')})`);

    const doctors = await this.prisma.associates.findMany({
      where: {
        role: 'DOCTOR',
        specialty,
        is_available: true,
      },
    });

    // Fallback to General Medicine if no specialty match
    if (doctors.length === 0) {
      const fallback = await this.prisma.associates.findMany({
        where: {
          role: 'DOCTOR',
          specialty: 'General Medicine',
          is_available: true,
        },
      });

      if (fallback.length === 0) {
        // Last resort: any available doctor
        const anyDoctor = await this.prisma.associates.findMany({
          where: { role: 'DOCTOR', is_available: true },
        });
        return { doctors: anyDoctor, specialty: 'General Medicine', matchedKeywords };
      }

      return { doctors: fallback, specialty: 'General Medicine', matchedKeywords };
    }

    return { doctors, specialty, matchedKeywords };
  }

  /**
   * Assign a doctor to a case.
   */
  async assignDoctor(caseId: string, doctorId: string) {
    const doctor = await this.prisma.associates.findUnique({
      where: { associate_id: doctorId },
    });

    if (!doctor) throw new Error(`Doctor not found: ${doctorId}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.cases.update({
        where: { case_id: caseId },
        data: { associate_id: doctorId },
      });

      // Update service
      const service = await tx.case_services.findFirst({
        where: { case_id: caseId, service_name: 'DOCTOR_CONSULTATION' },
      });

      if (service) {
        await tx.case_services.update({
          where: { case_service_id: service.case_service_id },
          data: { provider_id: doctorId, status: 'ASSIGNED' },
        });
      }

      // Event log - Silenced per user request (First clinical message should be APPOINTMENT_BOOKED in orchestrator)
      /*
      await tx.case_events.create({
        data: {
          case_id: caseId,
          event_type: 'DOCTOR_ASSIGNED',
          actor_type: 'SYSTEM',
          actor_id: doctorId,
          payload: { doctorName: doctor.full_name, specialty: doctor.specialty },
        },
      });
      */
    });

    await this.audit.log('DOCTOR_ACTIONS', 'ASSIGN_DOCTOR', 'cases', caseId, {
      doctorId,
      doctorName: doctor.full_name,
    });

    return doctor;
  }

  /**
   * Get available time slots for a doctor.
   */
  async getAvailableSlots(doctorId: string) {
    return this.prisma.doctor_availability.findMany({
      where: {
        doctor_id: doctorId,
        is_booked: false,
        start_time: { gte: new Date() },
      },
      orderBy: { start_time: 'asc' },
    });
  }
}
