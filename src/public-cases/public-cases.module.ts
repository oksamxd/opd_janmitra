import { Module } from '@nestjs/common';
import { PublicCasesService } from './public-cases.service';
import { PublicCasesController } from './public-cases.controller';

@Module({
  providers: [PublicCasesService],
  controllers: [PublicCasesController]
})
export class PublicCasesModule {}
