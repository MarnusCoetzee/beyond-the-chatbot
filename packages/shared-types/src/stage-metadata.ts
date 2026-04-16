import { PipelineState } from './pipeline-state';

export interface StageMetadata {
  stage: PipelineState;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  };
  estimatedCostUsd?: number;
  provider?: string;
  model?: string;
}
