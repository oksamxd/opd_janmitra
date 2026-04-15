/**
 * Jana Controller — Main chat endpoint
 */

import { Controller, Post, Get, Body, Headers, Query } from '@nestjs/common';
import { JanaOrchestratorService } from '../../orchestrator/jana-orchestrator.service';
import { randomUUID } from 'crypto';

@Controller('jana')
export class JanaController {
  constructor(private janaService: JanaOrchestratorService) {}

  /**
   * POST /jana/message — Main chat endpoint
   */
  @Post('message')
  async handleMessage(
    @Body() body: { message: string; sessionId?: string; language?: string },
    @Headers('x-session-id') headerSessionId: string,
  ) {
    const sessionId = body.sessionId || headerSessionId || randomUUID();
    const message = body.message || '';
    const language = body.language || 'English';

    return this.janaService.handleMessage(sessionId, message, language);
  }

  /**
   * GET /jana/session?sessionId=xxx — Resume session (drop-off recovery)
   */
  @Get('session')
  async getSession(@Query('sessionId') sessionId: string) {
    if (!sessionId) {
      return { message: 'Session ID required', action: 'ERROR' };
    }

    const status = await this.janaService.getSessionStatus(sessionId);
    if (!status) {
      return {
        message: 'Welcome to Jana AI! 🏥 Please provide your Member ID to begin.',
        options: [],
        action: 'NEW_SESSION',
        data: {},
        state: 'NEW',
        stateLabel: 'Welcome',
        progress: 0,
        sessionId,
      };
    }

    return status;
  }
}