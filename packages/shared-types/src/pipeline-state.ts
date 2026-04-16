export type PipelineState =
  | 'IDLE'
  | 'RESEARCHING'
  | 'PACKET_READY'
  | 'AGENTS_ANALYZING'
  | 'JUDGE_REVIEWING'
  | 'REBUTTAL_ROUND'
  | 'FINAL_VERDICT'
  | 'COMPLETE'
  | 'ERROR'
  | 'CANCELLED';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
