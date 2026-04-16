import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [forwardRef(() => OrchestrationModule)],
  controllers: [SessionController],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}
