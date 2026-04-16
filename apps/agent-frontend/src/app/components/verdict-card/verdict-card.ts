import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Verdict } from '@consensus-lab/shared-types';

@Component({
  selector: 'app-verdict-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verdict-card.html',
  styleUrl: './verdict-card.css',
})
export class VerdictCardComponent {
  @Input({ required: true }) verdict!: Verdict;

  get decisionLabel(): string {
    const labels: Record<string, string> = {
      single_winner: 'Clear Winner',
      contextual: 'Context-Dependent',
      tie: 'Tie',
    };
    return labels[this.verdict.decisionType] ?? this.verdict.decisionType;
  }
}
