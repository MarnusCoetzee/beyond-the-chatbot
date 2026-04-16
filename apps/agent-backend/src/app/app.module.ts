import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LlmModule } from '../llm/llm.module';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';
import { ResearchModule } from '../research/research.module';
import { AgentsModule } from '../agents/agents.module';
import { JudgeModule } from '../judge/judge.module';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [
    EventsModule,
    LlmModule,
    SessionModule,
    ResearchModule,
    AgentsModule,
    JudgeModule,
    OrchestrationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
