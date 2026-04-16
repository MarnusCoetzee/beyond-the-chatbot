export type SessionEventType =
  | 'question_received'
  | 'research_started'
  | 'source_fetched'
  | 'claim_extracted'
  | 'packet_completed'
  | 'agent_started'
  | 'agent_analysis_completed'
  | 'judge_review_started'
  | 'disagreement_found'
  | 'challenge_issued'
  | 'rebuttal_completed'
  | 'verdict_completed'
  | 'error';

export interface SessionEvent {
  id: string;
  timestamp: string;
  type: SessionEventType;
  actorId?: string;
  payload?: Record<string, unknown>;
}
