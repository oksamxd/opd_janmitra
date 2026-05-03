import { Module } from '@nestjs/common';
import { HealthcareModule } from './healthcare/healthcare.module';
import { MembersModule } from './members/members.module';
import { PublicCasesModule } from './public-cases/public-cases.module';

@Module({
  imports: [HealthcareModule, MembersModule, PublicCasesModule],
})
export class AppModule {}

