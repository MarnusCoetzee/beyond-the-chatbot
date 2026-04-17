import { Module, forwardRef } from '@nestjs/common';
import { LlmService } from './llm.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [forwardRef(() => SessionModule)],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
