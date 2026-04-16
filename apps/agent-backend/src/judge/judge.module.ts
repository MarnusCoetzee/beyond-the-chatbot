import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { JudgeService } from './judge.service';

@Module({
  imports: [LlmModule],
  providers: [JudgeService],
  exports: [JudgeService],
})
export class JudgeModule {}
