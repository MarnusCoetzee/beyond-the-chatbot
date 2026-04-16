import { PipelineState } from './pipeline-state';
import { ResearchPacket } from './research-packet';
import { AgentAnalysis } from './agent-analysis';
import { Disagreement } from './disagreement';
import { ChallengePrompt, RebuttalResponse } from './judge';
import { Verdict } from './verdict';
import { SessionEvent } from './session-event';
import { StageMetadata } from './stage-metadata';

export interface SessionError {
  message: string;
  stage?: PipelineState;
  code?: string;
}

export interface Session {
  id: string;
  question: string;
  status: PipelineState;
  researchPacket?: ResearchPacket;
  analyses: AgentAnalysis[];
  disagreements: Disagreement[];
  challengePrompts: ChallengePrompt[];
  rebuttals: RebuttalResponse[];
  verdict?: Verdict;
  events: SessionEvent[];
  stageMetadata: StageMetadata[];
  error?: SessionError;
  createdAt: string;
}
