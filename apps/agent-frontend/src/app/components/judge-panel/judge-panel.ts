import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import { DisagreementCardComponent } from '../disagreement-card/disagreement-card';
import { VerdictCardComponent } from '../verdict-card/verdict-card';

@Component({
  selector: 'app-judge-panel',
  standalone: true,
  imports: [CommonModule, DisagreementCardComponent, VerdictCardComponent],
  templateUrl: './judge-panel.html',
  styleUrl: './judge-panel.css',
})
export class JudgePanelComponent {
  readonly sessionState = inject(SessionStateService);

  get isReviewing() {
    const s = this.sessionState.currentSession?.status;
    return (
      s === 'JUDGE_REVIEWING' || s === 'REBUTTAL_ROUND' || s === 'FINAL_VERDICT'
    );
  }
}
