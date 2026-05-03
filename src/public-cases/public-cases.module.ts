import { Module } from '@nestjs/common';
import { PublicCasesService } from './public-cases.service';
import { PublicCasesController } from './public-cases.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PublicCasesService, PrismaService],
  controllers: [PublicCasesController],
})
export class PublicCasesModule {}

