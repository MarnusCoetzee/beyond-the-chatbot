import { ConfidenceLevel } from './pipeline-state';

export interface Source {
  id: string;
  title: string;
  url: string;
  type: 'docs' | 'blog' | 'benchmark' | 'forum' | 'other';
}

export interface ResearchClaim {
  id: string;
  option: string;
  criterion: string;
  claim: string;
  supportLevel: 'strong' | 'moderate' | 'weak';
  sourceRefs: string[];
}

export interface OptionSummary {
  pros: string[];
  cons: string[];
  evidenceClaimIds: string[];
  confidence: ConfidenceLevel;
}

export interface ResearchPacket {
  question: string;
  options: string[];
  evaluationCriteria: string[];
  claims: ResearchClaim[];
  optionSummaries: Record<string, OptionSummary>;
  webSources: Source[];
  gaps: string[];
}
