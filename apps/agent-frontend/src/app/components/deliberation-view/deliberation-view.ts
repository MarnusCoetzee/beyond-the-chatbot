import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RebuttalResponse } from '@consensus-lab/shared-types';
import { SessionStateService } from '../../services/session-state.service';
import { PipelineStatusComponent } from '../pipeline-status/pipeline-status';
import { TelemetryStripComponent } from '../telemetry-strip/telemetry-strip';
import { ResearchPacketPanelComponent } from '../research-packet-panel/research-packet-panel';
import { AgentCardComponent } from '../agent-card/agent-card';

@Component({
  selector: 'app-deliberation-view',
  standalone: true,
  imports: [CommonModule, PipelineStatusComponent, TelemetryStripComponent, ResearchPacketPanelComponent, AgentCardComponent],
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

  getRebuttal(agentId: string): RebuttalResponse | undefined {
    return this.sessionState.currentSession?.rebuttals.find(r => r.agentId === agentId);
  }
}
