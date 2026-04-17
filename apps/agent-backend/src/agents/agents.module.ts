import { Module, forwardRef } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AgentRunnerService } from './agent-runner.service';

@Module({
  imports: [forwardRef(() => LlmModule)],
  providers: [AgentRunnerService],
  exports: [AgentRunnerService],
})
export class AgentsModule {}
