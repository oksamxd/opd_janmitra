import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  create(data: { full_name: string; email?: string; phone?: string; address?: string }) {
    return this.prisma.members.create({ data });
  }

  findAll() {
    return this.prisma.members.findMany();
  }

  findOne(member_id: string) {
    return this.prisma.members.findUnique({ where: { member_id } });
  }
}
