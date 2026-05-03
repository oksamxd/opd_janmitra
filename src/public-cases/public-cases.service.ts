import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PublicCasesService {
  constructor(private prisma: PrismaService) {}

  async createCase(data: any) {
    if (!data.memberId || !data.serviceId) {
      throw new BadRequestException('memberId and serviceId are required');
    }

    const newCase = await this.prisma.cases.create({
      data: {
        member_id: data.memberId,
        service_id: data.serviceId,
        status: 'open',
        description: data.firstMessage?.text || null,
      },
    });

    return {
      caseId: newCase.case_id,
      status: 'created',
    };
  }
}

