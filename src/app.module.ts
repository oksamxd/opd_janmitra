import { Module } from '@nestjs/common';
import { HealthcareModule } from './healthcare/healthcare.module';

@Module({
  imports: [HealthcareModule],
})
export class AppModule {}