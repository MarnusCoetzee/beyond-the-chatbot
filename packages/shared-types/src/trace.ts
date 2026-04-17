export interface LlmTrace {
  id: string;
  sessionId: string;
  stage: string;
  actorId?: string;
  systemPrompt: string;
  userPrompt: string;
  rawResponse: string;
  parsedOutput?: unknown;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  createdAt: string;
}
