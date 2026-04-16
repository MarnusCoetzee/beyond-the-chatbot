import { Module, forwardRef } from '@nestjs/common';
import { ResearchModule } from '../research/research.module';
import { AgentsModule } from '../agents/agents.module';
import { JudgeModule } from '../judge/judge.module';
import { SessionModule } from '../session/session.module';
import { OrchestrationService } from './orchestration.service';

@Module({
  imports: [ResearchModule, AgentsModule, JudgeModule, forwardRef(() => SessionModule)],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
