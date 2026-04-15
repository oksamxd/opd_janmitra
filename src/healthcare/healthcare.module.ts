import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Controllers
import { JanaController } from './controllers/jana.controller';
import { OpdController } from '../api/opd.controller';
import { DoctorController } from '../api/doctor.controller';
import { VoiceController } from '../api/voice.controller';
import { LabController } from '../api/lab.controller';
import { PharmacyController } from '../api/pharmacy.controller';
import { EventsController } from '../api/events.controller';

// Engine
import { AuditLogger } from '../engine/audit-logger';
import { TriggerEngine } from '../engine/trigger-engine';

// Actions
import { MemberActions } from '../actions/member.actions';
import { CaseActions } from '../actions/case.actions';
import { DoctorActions } from '../actions/doctor.actions';
import { AppointmentActions } from '../actions/appointment.actions';
import { OutcomeActions } from '../actions/outcome.actions';
import { DeliveryActions } from '../actions/delivery.actions';

// Services
import { AiService } from './services/ai.service';
import { JanaOrchestratorService } from '../orchestrator/jana-orchestrator.service';

@Module({
  controllers: [
    JanaController,
    OpdController,
    DoctorController,
    VoiceController,
    LabController,
    PharmacyController,
    EventsController,
  ],
  providers: [
    PrismaService,

    // Engine
    AuditLogger,
    TriggerEngine,

    // Actions
    MemberActions,
    CaseActions,
    DoctorActions,
    AppointmentActions,
    OutcomeActions,
    DeliveryActions,

    // Services
    AiService,
    JanaOrchestratorService,
  ],
})
export class HealthcareModule {}