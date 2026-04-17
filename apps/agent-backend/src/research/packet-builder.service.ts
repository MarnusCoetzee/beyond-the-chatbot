import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import type { LlmConfig, ResearchPacket, ResearchClaim, Source } from '@consensus-lab/shared-types';
import type { LlmRequest } from '../llm/llm.service';
import type { RawSearchResult } from './search-provider.service';

@Injectable()
export class PacketBuilderService {
  constructor(private readonly llm: LlmService) {}

  async buildPacket(
    sessionId: string,
    question: string,
    claims: ResearchClaim[],
    rawResults: RawSearchResult[],
    config: LlmConfig,
  ): Promise<ResearchPacket> {
    const sources: Source[] = rawResults.map((r, i) => ({
      id: `src-${i + 1}`,
      title: r.title,
      url: r.url,
      type: this.inferSourceType(r.url),
    }));

    const request: LlmRequest = {
      system: `You are a research packet builder. Given a question and extracted claims, produce a structured research packet.

Return JSON with this exact shape:
{
  "question": "the original question",
  "options": ["Option A", "Option B", ...],
  "evaluationCriteria": ["criterion1", "criterion2", ...],
  "optionSummaries": {
    "Option A": { "pros": [...], "cons": [...], "evidenceClaimIds": [...], "confidence": "high"|"medium"|"low" },
    ...
  },
  "gaps": ["gap1", "gap2", ...]
}`,
      user: `Question: ${question}\n\nClaims:\n${JSON.stringify(claims, null, 2)}`,
      temperature: 0.3,
      metadata: { stage: 'packet-building' },
    };

    const response = await this.llm.completeJson<Omit<ResearchPacket, 'claims' | 'webSources'>>(
      config,
      request,
      { sessionId, stage: 'packet-building' },
    );

    return {
      ...response.result,
      claims,
      webSources: sources,
    };
  }

  async buildPacketFromKnowledge(
    sessionId: string,
    question: string,
    config: LlmConfig,
  ): Promise<ResearchPacket> {
    const request: LlmRequest = {
      system: `You are a research analyst. Given an engineering question, produce a comprehensive research packet using your training knowledge.

Return JSON with this exact shape:
{
  "question": "the original question",
  "options": ["Option A", "Option B", ...],
  "evaluationCriteria": ["criterion1", "criterion2", ...],
  "claims": [
    { "id": "claim-1", "option": "...", "criterion": "...", "claim": "...", "supportLevel": "strong"|"moderate"|"weak", "sourceRefs": [] }
  ],
  "optionSummaries": {
    "Option A": { "pros": [...], "cons": [...], "evidenceClaimIds": [...], "confidence": "high"|"medium"|"low" },
    ...
  },
  "webSources": [],
  "gaps": ["gap1", "gap2", ...]
}

Be thorough. Include at least 3 options, 5+ evaluation criteria, and 10+ claims.`,
      user: question,
      temperature: 0.5,
      metadata: { stage: 'packet-building-knowledge' },
    };

    return (
      await this.llm.completeJson<ResearchPacket>(config, request, {
        sessionId,
        stage: 'packet-building-knowledge',
      })
    ).result;
  }

  private inferSourceType(url: string): Source['type'] {
    if (url.includes('github.com')) return 'docs';
    if (url.includes('benchmark') || url.includes('perf')) return 'benchmark';
    if (url.includes('reddit.com') || url.includes('stackoverflow')) return 'forum';
    if (url.includes('blog') || url.includes('medium.com') || url.includes('dev.to')) return 'blog';
    return 'other';
  }
}
