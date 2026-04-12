import { Injectable, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

@Injectable()
export class PublicCasesService {

  pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'janmitra_db',
    password: 'admin',
    port: 5432,
  });

  async createCase(data: any) {

    if (!data.memberId || !data.serviceId) {
      throw new BadRequestException('memberId and serviceId are required');
    }

    const caseId = randomUUID();

    const client = await this.pool.connect();

    try {

      await client.query(
        `INSERT INTO cases
        (case_id, member_id, associate_id, service_id, status, priority, description, created_at, updated_at)
        VALUES ($1,$2,NULL,$3,$4,$5,$6,NOW(),NOW())`,
        [
          caseId,
          data.memberId,
          data.serviceId,
          'open',
          'normal',
          data.firstMessage?.text || null
        ]
      );

      return {
        caseId,
        status: 'created'
      };

    } finally {
      client.release();
    }
  }
}