export interface Disagreement {
  topic: string;
  agentsInConflict: string[];
  summary: string;
  severity: 'low' | 'medium' | 'high';
}
