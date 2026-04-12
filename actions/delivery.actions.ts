/**
 * Delivery Actions — Diagnostic scheduling and medicine delivery
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogger } from '../engine/audit-logger';

@Injectable()
export class DeliveryActions {
  private readonly logger = new Logger(DeliveryActions.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogger,
  ) {}

  /**
   * Schedule a diagnostic test.
   */
  async scheduleDiagnostic(testOrderId: string, scheduledAt: Date) {
    const updated = await this.prisma.test_orders.update({
      where: { test_order_id: testOrderId },
      data: {
        scheduled_at: scheduledAt,
        status: 'SCHEDULED',
      },
    });

    await this.audit.log('DELIVERY_ACTIONS', 'SCHEDULE_DIAGNOSTIC', 'test_orders', testOrderId, { scheduledAt });
    return updated;
  }

  /**
   * Arrange medicine delivery.
   */
  async arrangeDelivery(prescriptionId: string, address: string) {
    // Check for existing delivery
    const existing = await this.prisma.deliveries.findFirst({
      where: { prescription_id: prescriptionId, status: { not: 'CANCELLED' } },
    });

    if (existing) {
      return { delivery: existing, isNew: false };
    }

    const eta = new Date();
    eta.setHours(eta.getHours() + 2); // Simulated 2-hour ETA

    const delivery = await this.prisma.deliveries.create({
      data: {
        prescription_id: prescriptionId,
        address,
        status: 'PROCESSING',
        eta,
      },
    });

    await this.audit.log('DELIVERY_ACTIONS', 'ARRANGE_DELIVERY', 'deliveries', delivery.delivery_id, {
      prescriptionId,
      address,
      eta,
    });

    return { delivery, isNew: true };
  }

  /**
   * Get delivery status.
   */
  async getDeliveryStatus(deliveryId: string) {
    return this.prisma.deliveries.findUnique({
      where: { delivery_id: deliveryId },
      include: {
        prescription: {
          include: { items: true },
        },
      },
    });
  }
}
