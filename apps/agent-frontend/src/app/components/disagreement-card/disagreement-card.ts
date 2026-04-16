import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Disagreement } from '@consensus-lab/shared-types';

@Component({
  selector: 'app-disagreement-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disagreement-card.html',
  styleUrl: './disagreement-card.css',
})
export class DisagreementCardComponent {
  @Input({ required: true }) disagreement!: Disagreement;

  get severityClass(): string {
    return `severity-${this.disagreement.severity}`;
  }
}
