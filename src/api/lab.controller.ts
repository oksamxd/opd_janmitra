import { Controller, Post, Body, Param, Get, Res } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as express from 'express';
import { join } from 'path';
import { JanaOrchestratorService } from '../orchestrator/jana-orchestrator.service';
import { OpdState } from '../engine/state-machine';

@Controller('lab')
export class LabController {
  constructor(
    private prisma: PrismaService,
    private janaService: JanaOrchestratorService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Res() res: express.Response) {
    return res.sendFile(join(process.cwd(), 'frontend', 'lab-panel.html'));
  }

  @Get('active-orders')
  async getActiveOrders() {
    // Grouped by Case
    const casesWithTests = await this.prisma.cases.findMany({
      where: {
        test_orders: {
          some: { status: 'ORDERED' },
        },
      },
      include: {
        test_orders: {
          where: { status: 'ORDERED' },
        },
      },
    });

    return casesWithTests.map((c) => ({
      caseId: c.case_id,
      tests: c.test_orders.map((t) => ({
        id: t.test_order_id,
        name: t.test_name,
      })),
    }));
  }

  @Get('case-orders/:caseId')
  async getCaseOrders(@Param('caseId') caseId: string) {
    const caseData = await this.prisma.cases.findUnique({
      where: { case_id: caseId },
      include: {
        members: true,
        test_orders: {
          where: { status: 'ORDERED' },
        },
      },
    });

    if (!caseData) throw new Error('Case not found');

    return {
      caseId: caseData.case_id,
      memberName: caseData.members?.full_name,
      tests: caseData.test_orders.map((t) => ({
        id: t.test_order_id,
        name: t.test_name,
        status: t.status,
      })),
    };
  }

  @Post('submit-results')
  async submitResults(
    @Body()
    body: {
      caseId: string;
      results: { id: string; result: string }[];
      notes?: string;
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      // 1. Fetch metadata for cases/members for better logging
      const caseData = await tx.cases.findUnique({
        where: { case_id: body.caseId },
        include: { members: true },
      });
      const patientName = caseData?.members?.full_name || 'Patient';

      // 2. Update each test order and log events
      for (const res of body.results) {
        // Fetch test name first
        const order = await tx.test_orders.findUnique({
          where: { test_order_id: res.id },
        });
        const testName = order?.test_name || 'Unknown Test';

        await tx.test_orders.update({
          where: { test_order_id: res.id },
          data: {
            status: 'COMPLETED',
            result: { report: res.result },
            completed_at: new Date(),
          },
        });

        // Log specific event for this test
        await tx.case_events.create({
          data: {
            case_id: body.caseId,
            event_type: 'TEST_COMPLETED',
            actor_type: 'LAB_TECHNICIAN',
            payload: {
              message: `Medical Update: Your ${testName} report is ready. Result: ${res.result.length > 50 ? res.result.slice(0, 50) + '...' : res.result}.`,
              testName: testName,
              report: res.result,
              note: body.notes,
            },
          },
        });
      }

      // 3. Force State Transition for the entire session
      const session = await tx.opd_sessions.findFirst({
        where: {
          collected_inputs: {
            path: ['caseId'],
            equals: body.caseId,
          },
          is_active: true,
        },
      });

      if (session) {
        await tx.opd_sessions.update({
          where: { session_id: session.session_id },
          data: { opd_state: 'TEST_COMPLETED' },
        });

        // ─── TRIGGER MILESTONE ────────────────────────────────────────────
        await this.janaService.triggerMilestone(session, OpdState.TEST_COMPLETED);
      }
    });

    return { success: true };
  }
}
