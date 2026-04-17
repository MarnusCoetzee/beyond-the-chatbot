import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';
import { PendingRunService } from './pending-run.service';
import { TraceRepository } from './trace.repository';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [forwardRef(() => OrchestrationModule)],
  controllers: [SessionController],
  providers: [SessionRepository, PendingRunService, TraceRepository],
  exports: [SessionRepository, PendingRunService, TraceRepository],
})
export class SessionModule {}
