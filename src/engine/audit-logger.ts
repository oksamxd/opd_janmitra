/**
 * Audit Logger — Enterprise audit trail
 * 
 * Logs every trigger, state change, error, and API call.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event.
   */
  async log(
    actor: string,
    action: string,
    entity: string,
    entityId?: string,
    payload?: any,
    result?: string,
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.audit_logs.create({
        data: {
          actor,
          action,
          entity,
          entity_id: entityId || null,
          payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
          result: result || 'SUCCESS',
          error: error || null,
        },
      });

      if (error) {
        this.logger.error(`[AUDIT] ${actor} | ${action} | ${entity}:${entityId} | ERROR: ${error}`);
      } else {
        this.logger.log(`[AUDIT] ${actor} | ${action} | ${entity}:${entityId || 'N/A'}`);
      }
    } catch (e) {
      // Audit logging should never crash the system
      this.logger.error(`Failed to write audit log: ${e}`);
    }
  }

  /**
   * Convenience: log a state transition.
   */
  async logStateTransition(
    sessionId: string,
    oldState: string,
    newState: string,
    caseId?: string,
  ): Promise<void> {
    await this.log(
      'STATE_MACHINE',
      'STATE_TRANSITION',
      'opd_sessions',
      sessionId,
      { oldState, newState, caseId },
    );
  }

  /**
   * Convenience: log an error.
   */
  async logError(
    actor: string,
    action: string,
    entity: string,
    entityId: string,
    error: Error | string,
  ): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : error;
    await this.log(actor, action, entity, entityId, null, 'FAILURE', errorMsg);
  }
}
