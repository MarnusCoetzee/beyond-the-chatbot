import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  AgentAnalysis,
  RebuttalResponse,
} from '@consensus-lab/shared-types';

const AGENT_DISPLAY: Record<string, { name: string; color: string }> = {
  pragmatist: { name: 'The Pragmatist', color: 'var(--agent-pragmatist)' },
  performance: {
    name: 'The Performance Engineer',
    color: 'var(--agent-performance)',
  },
  'dx-advocate': { name: 'The DX Advocate', color: 'var(--agent-dx)' },
  skeptic: { name: 'The Skeptic', color: 'var(--agent-skeptic)' },
};

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-card.html',
  styleUrl: './agent-card.css',
})
export class AgentCardComponent {
  @Input({ required: true }) analysis!: AgentAnalysis;
  @Input() rebuttal?: RebuttalResponse;

  showReasons = false;
  showRisks = false;

  get display() {
    return (
      AGENT_DISPLAY[this.analysis.agentId] ?? {
        name: this.analysis.agentId,
        color: 'var(--text-muted)',
      }
    );
  }
  get confidencePercent() {
    return Math.round(this.analysis.confidence);
  }
  get circumference() {
    return 2 * Math.PI * 36;
  }
  get dashOffset() {
    return this.circumference * (1 - this.confidencePercent / 100);
  }

  get rebuttalClass(): string {
    if (!this.rebuttal) return '';
    return this.rebuttal.action;
  }

  get rebuttalLabel(): string {
    if (!this.rebuttal) return '';
    const labels: Record<string, string> = {
      defend: 'Defended',
      revise: 'Revised',
      concede: 'Conceded',
    };
    return labels[this.rebuttal.action] ?? this.rebuttal.action;
  }

  toggleReasons() {
    this.showReasons = !this.showReasons;
  }
  toggleRisks() {
    this.showRisks = !this.showRisks;
  }
}
