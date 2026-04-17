import { Module, forwardRef } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ResearchService } from './research.service';
import { SearchProviderService } from './search-provider.service';
import { ResearchExtractionService } from './research-extraction.service';
import { PacketBuilderService } from './packet-builder.service';

@Module({
  imports: [forwardRef(() => LlmModule)],
  providers: [ResearchService, SearchProviderService, ResearchExtractionService, PacketBuilderService],
  exports: [ResearchService],
})
export class ResearchModule {}
