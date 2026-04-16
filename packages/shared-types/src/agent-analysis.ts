import { AgentRole } from './agent-config';
import { EvidenceRef } from './evidence-ref';

export interface AgentAnalysis {
  agentId: string;
  role: AgentRole;
  round: number;
  recommendation: string;
  topReasons: string[];
  risks: string[];
  confidence: number;
  strongestCounterargument: string;
  evidenceRefs: EvidenceRef[];
}
