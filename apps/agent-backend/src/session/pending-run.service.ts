import { Injectable } from '@nestjs/common';
import type { LlmConfig, SearchConfig } from '@consensus-lab/shared-types';

export interface PendingRun {
  llmConfig: LlmConfig;
  searchConfig?: SearchConfig;
}

@Injectable()
export class PendingRunService {
  private readonly pending = new Map<string, PendingRun>();

  store(sessionId: string, llmConfig: LlmConfig, searchConfig?: SearchConfig): void {
    this.pending.set(sessionId, { llmConfig, searchConfig });
  }

  take(sessionId: string): PendingRun | undefined {
    const run = this.pending.get(sessionId);
    if (run) this.pending.delete(sessionId);
    return run;
  }
}
