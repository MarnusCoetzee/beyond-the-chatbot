import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import { PipelineStatusComponent } from '../pipeline-status/pipeline-status';
import { TelemetryStripComponent } from '../telemetry-strip/telemetry-strip';

@Component({
  selector: 'app-deliberation-view',
  standalone: true,
  imports: [CommonModule, PipelineStatusComponent, TelemetryStripComponent],
  templateUrl: './deliberation-view.html',
  styleUrl: './deliberation-view.css',
})
export class DeliberationViewComponent {
  readonly sessionState = inject(SessionStateService);

  get activeColumn(): number {
    const status = this.sessionState.currentSession?.status;
    if (!status) return 0;
    if (['IDLE', 'RESEARCHING', 'PACKET_READY'].includes(status)) return 1;
    if (['AGENTS_ANALYZING'].includes(status)) return 2;
    if (['JUDGE_REVIEWING', 'REBUTTAL_ROUND', 'FINAL_VERDICT'].includes(status)) return 3;
    return 0;
  }
}
