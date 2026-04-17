import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import type { LlmRequest } from '../llm/llm.service';
import type {
  AgentConfig,
  LlmConfig,
  ResearchPacket,
  AgentAnalysis,
  ChallengePrompt,
  RebuttalResponse,
} from '@consensus-lab/shared-types';

@Injectable()
export class AgentRunnerService {
  constructor(private readonly llm: LlmService) {}

  async analyze(
    sessionId: string,
    agentConfig: AgentConfig,
    packet: ResearchPacket,
    llmConfig: LlmConfig,
  ): Promise<AgentAnalysis> {
    const request: LlmRequest = {
      system: agentConfig.systemPrompt,
      user: `Analyze this research packet and provide your recommendation.\n\n${JSON.stringify(packet, null, 2)}`,
      temperature: 0.7,
      metadata: { stage: 'agent-analysis', agentId: agentConfig.agentId },
    };

    const response = await this.llm.completeJson<AgentAnalysis>(
      llmConfig,
      request,
      {
        sessionId,
        stage: 'agent-analysis',
        actorId: agentConfig.agentId,
      },
    );
    return {
      ...response.result,
      agentId: agentConfig.agentId,
      role: agentConfig.role,
      round: 1,
    };
  }

  async rebut(
    sessionId: string,
    agentConfig: AgentConfig,
    packet: ResearchPacket,
    challenge: ChallengePrompt,
    originalAnalysis: AgentAnalysis,
    llmConfig: LlmConfig,
  ): Promise<RebuttalResponse> {
    const request: LlmRequest = {
      system: `${agentConfig.systemPrompt}

You previously recommended: ${originalAnalysis.recommendation} (confidence: ${originalAnalysis.confidence}/100).

You are now being challenged by the Judge. You MUST choose one action:
- "defend": Stand by your recommendation and explain why the challenge doesn't change your view
- "revise": Update your recommendation based on the challenge
- "concede": Acknowledge the challenge is correct and withdraw your recommendation

Return valid JSON:
{
  "agentId": "${agentConfig.agentId}",
  "round": 2,
  "action": "defend" | "revise" | "concede",
  "response": "Your detailed response to the challenge",
  "revisedRecommendation": "Only if action is revise",
  "revisedConfidence": 50
}`,
      user: `Challenge from the Judge:\n${challenge.prompt}\n\nOriginal research packet:\n${JSON.stringify(packet, null, 2)}`,
      temperature: 0.7,
      metadata: { stage: 'agent-rebuttal', agentId: agentConfig.agentId },
    };

    const response = await this.llm.completeJson<RebuttalResponse>(
      llmConfig,
      request,
      {
        sessionId,
        stage: 'agent-rebuttal',
        actorId: agentConfig.agentId,
      },
    );
    return {
      ...response.result,
      agentId: agentConfig.agentId,
      round: 2,
    };
  }
}
