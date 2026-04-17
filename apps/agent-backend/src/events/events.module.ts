import { Module, Global, forwardRef } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { EventsController } from './events.controller';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { SessionModule } from '../session/session.module';

@Global()
@Module({
  imports: [forwardRef(() => OrchestrationModule), forwardRef(() => SessionModule)],
  controllers: [EventsController],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
