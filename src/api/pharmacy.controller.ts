import { Controller, Post, Body, Param, Get, Res } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as express from 'express';
import { join } from 'path';

@Controller('pharmacy')
export class PharmacyController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async getDashboard(@Res() res: express.Response) {
    return res.sendFile(join(process.cwd(), 'frontend', 'pharmacy-panel.html'));
  }

  @Get('active-orders')
  async getActiveOrders() {
    // Deliveries mapped to prescriptions
    const prescriptions = await this.prisma.prescriptions.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        items: true,
      },
      orderBy: { created_at: 'asc' },
    });

    return prescriptions.map(p => ({
      prescriptionId: p.prescription_id,
      caseId: p.case_id,
      items: p.items,
      status: p.status,
      createdAt: p.created_at,
    }));
  }

  @Post('dispatch/:prescriptionId')
  async dispatchMedicine(
    @Param('prescriptionId') prescriptionId: string,
    @Body() body: { notes: string; caseId: string }
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Update prescription
      await tx.prescriptions.update({
        where: { prescription_id: prescriptionId },
        data: {
          status: 'DISPATCHED',
        },
      });

      // Also create a delivery object just in case
      await tx.deliveries.create({
        data: {
          prescription_id: prescriptionId,
          address: 'Patient registered address',
          status: 'DISPATCHED',
          eta: new Date(Date.now() + 24 * 60 * 60 * 1000), // ETA tomorrow
        },
      });

      // Fetch patient's name for personalization
      const caseRecord = await tx.cases.findUnique({
        where: { case_id: body.caseId },
        include: { members: true },
      });
      const patientName = caseRecord?.members?.full_name || 'you';

      // Create an event for the context UI
      await tx.case_events.create({
        data: {
          case_id: body.caseId,
          event_type: 'PHARMACY_DISPATCH',
          actor_type: 'PHARMACIST',
          payload: {
            title: 'Medicines Dispatched',
            message: `Hi ${patientName}, your prescribed medicines have been dispatched and will arrive soon. ${body.notes || ''}`,
          },
        },
      });
    });

    return { success: true };
  }
}
