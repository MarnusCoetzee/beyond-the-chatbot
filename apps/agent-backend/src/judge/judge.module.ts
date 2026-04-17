import { Module, forwardRef } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { JudgeService } from './judge.service';

@Module({
  imports: [forwardRef(() => LlmModule)],
  providers: [JudgeService],
  exports: [JudgeService],
})
export class JudgeModule {}
