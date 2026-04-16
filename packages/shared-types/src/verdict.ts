import { EvidenceRef } from './evidence-ref';

export interface Verdict {
  decisionType: 'single_winner' | 'contextual' | 'tie';
  primaryRecommendation: string;
  ranking?: string[];
  reasoning: string;
  tradeoffs: string[];
  whenAlternativeIsBetter: string[];
  evidenceUsed: EvidenceRef[];
  finalConfidence: number;
}
