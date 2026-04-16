import { Injectable, Logger } from '@nestjs/common';
import type { LlmConfig, SearchConfig, ResearchPacket } from '@consensus-lab/shared-types';
import { SearchProviderService } from './search-provider.service';
import { ResearchExtractionService } from './research-extraction.service';
import { PacketBuilderService } from './packet-builder.service';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly searchProvider: SearchProviderService,
    private readonly extraction: ResearchExtractionService,
    private readonly packetBuilder: PacketBuilderService,
  ) {}

  async research(
    question: string,
    llmConfig: LlmConfig,
    searchConfig?: SearchConfig,
  ): Promise<ResearchPacket> {
    if (!searchConfig) {
      this.logger.log('Search disabled — building packet from LLM knowledge');
      return this.packetBuilder.buildPacketFromKnowledge(question, llmConfig);
    }

    this.logger.log(`Searching via ${searchConfig.provider}...`);
    const rawResults = await this.searchProvider.search(question, searchConfig);

    if (rawResults.length === 0) {
      this.logger.warn('No search results — falling back to LLM knowledge');
      return this.packetBuilder.buildPacketFromKnowledge(question, llmConfig);
    }

    this.logger.log(`Extracting claims from ${rawResults.length} results...`);
    const claims = await this.extraction.extractClaims(question, rawResults, llmConfig);

    this.logger.log(`Building packet from ${claims.length} claims...`);
    return this.packetBuilder.buildPacket(question, claims, rawResults, llmConfig);
  }
}
