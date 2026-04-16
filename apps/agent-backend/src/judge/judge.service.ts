import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import type { LlmRequest } from '../llm/llm.service';
import type {
  LlmConfig,
  ResearchPacket,
  AgentAnalysis,
  Disagreement,
  ChallengePrompt,
  RebuttalResponse,
  Verdict,
} from '@consensus-lab/shared-types';

interface JudgeReviewResult {
  disagreements: Disagreement[];
  challengePrompts: ChallengePrompt[];
}

@Injectable()
export class JudgeService {
  constructor(private readonly llm: LlmService) {}

  async review(
    packet: ResearchPacket,
    analyses: AgentAnalysis[],
    llmConfig: LlmConfig,
  ): Promise<JudgeReviewResult> {
    const request: LlmRequest = {
      system: `You are the Judge — an impartial arbitrator evaluating specialist agent analyses.

Your job:
1. Compare all agent recommendations
2. Identify disagreements (where agents conflict)
3. Score evidence quality
4. Generate targeted challenge prompts for agents whose positions need defending

Return valid JSON:
{
  "disagreements": [
    { "topic": "...", "agentsInConflict": ["agent1", "agent2"], "summary": "...", "severity": "low"|"medium"|"high" }
  ],
  "challengePrompts": [
    { "id": "challenge-1", "round": 1, "targetAgentIds": ["agent1"], "topic": "...", "prompt": "Specific challenge question..." }
  ]
}

Make challenge prompts specific and targeted. Do not ask generic questions. Reference specific claims and contradictions.`,
      user: `Research Packet:\n${JSON.stringify(packet, null, 2)}\n\nAgent Analyses:\n${JSON.stringify(analyses, null, 2)}`,
      temperature: 0.5,
      metadata: { stage: 'judge-review' },
    };

    return (await this.llm.completeJson<JudgeReviewResult>(llmConfig, request)).result;
  }

  async synthesize(
    packet: ResearchPacket,
    analyses: AgentAnalysis[],
    rebuttals: RebuttalResponse[],
    disagreements: Disagreement[],
    llmConfig: LlmConfig,
  ): Promise<Verdict> {
    const request: LlmRequest = {
      system: `You are the Judge delivering a final verdict after a deliberation round.

You have seen:
- The original research packet
- Initial agent analyses
- Disagreements you identified
- Agent rebuttals (defend/revise/concede)

Now synthesize a final verdict. Consider:
- Which arguments held up under challenge?
- Which agents conceded or revised?
- What does the evidence best support?

Return valid JSON:
{
  "decisionType": "single_winner" | "contextual" | "tie",
  "primaryRecommendation": "The recommended option",
  "ranking": ["1st", "2nd", "3rd"],
  "reasoning": "Why this recommendation won",
  "tradeoffs": ["tradeoff 1", "tradeoff 2"],
  "whenAlternativeIsBetter": ["scenario where another option wins"],
  "evidenceUsed": [{"sourceId": "src-1", "claimId": "claim-1"}],
  "finalConfidence": 82
}

Be nuanced. If the answer is genuinely context-dependent, say so.`,
      user: `Research Packet:\n${JSON.stringify(packet, null, 2)}\n\nAnalyses:\n${JSON.stringify(analyses, null, 2)}\n\nDisagreements:\n${JSON.stringify(disagreements, null, 2)}\n\nRebuttals:\n${JSON.stringify(rebuttals, null, 2)}`,
      temperature: 0.5,
      metadata: { stage: 'judge-verdict' },
    };

    return (await this.llm.completeJson<Verdict>(llmConfig, request)).result;
  }
}
