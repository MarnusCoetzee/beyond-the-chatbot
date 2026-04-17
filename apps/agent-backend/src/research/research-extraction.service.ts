import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import type { LlmConfig, ResearchClaim } from '@consensus-lab/shared-types';
import type { LlmRequest } from '../llm/llm.service';
import type { RawSearchResult } from './search-provider.service';

@Injectable()
export class ResearchExtractionService {
  constructor(private readonly llm: LlmService) {}

  async extractClaims(
    sessionId: string,
    question: string,
    searchResults: RawSearchResult[],
    config: LlmConfig,
  ): Promise<ResearchClaim[]> {
    const sourceSummary = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
      .join('\n\n');

    const request: LlmRequest = {
      system: `You are a research analyst. Extract structured claims from the provided search results about the given question.

For each claim, provide:
- id: a unique short identifier like "claim-1"
- option: which technology/option the claim is about
- criterion: what evaluation criterion it addresses (e.g. "performance", "ecosystem", "hiring")
- claim: the factual claim itself
- supportLevel: "strong", "moderate", or "weak" based on evidence quality
- sourceRefs: array of source indices like ["src-1", "src-2"]

Return a JSON array of claims.`,
      user: `Question: ${question}\n\nSearch Results:\n${sourceSummary}`,
      temperature: 0.3,
      metadata: { stage: 'claim-extraction' },
    };

    const response = await this.llm.completeJson<ResearchClaim[]>(config, request, {
      sessionId,
      stage: 'claim-extraction',
    });
    return response.result;
  }
}
