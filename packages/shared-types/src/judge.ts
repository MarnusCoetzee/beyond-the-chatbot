export interface ChallengePrompt {
  id: string;
  round: number;
  targetAgentIds: string[];
  topic: string;
  prompt: string;
}

export interface RebuttalResponse {
  agentId: string;
  round: number;
  action: 'defend' | 'revise' | 'concede';
  response: string;
  revisedRecommendation?: string;
  revisedConfidence?: number;
}
