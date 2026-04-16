import { PipelineState } from './pipeline-state';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface SearchConfig {
  provider: 'firecrawl' | 'brave';
  apiKey: string;
}

export interface CreateSessionRequest {
  question: string;
  llmConfig: LlmConfig;
  searchConfig?: SearchConfig;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: PipelineState;
  createdAt: string;
}

export interface SessionListItem {
  id: string;
  question: string;
  status: PipelineState;
  createdAt: string;
  durationMs?: number;
}

export interface SseStateChanged {
  state: PipelineState;
  previousState: PipelineState;
}

export interface SseStageMetadata {
  stage: PipelineState;
  durationMs: number;
  tokenUsage?: { input?: number; output?: number; total?: number };
}

export interface SseDone {
  sessionId: string;
  finalStatus: 'COMPLETE' | 'ERROR' | 'CANCELLED';
}

export interface SseHeartbeat {
  timestamp: string;
}
