export type AgentRole = 'pragmatist' | 'performance' | 'dx' | 'skeptic';

export interface AgentConfig {
  agentId: string;
  displayName: string;
  role: AgentRole;
  lens: string;
  systemPrompt: string;
}
