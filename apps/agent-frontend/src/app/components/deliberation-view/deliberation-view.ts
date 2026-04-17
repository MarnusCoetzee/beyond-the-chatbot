import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import type { RebuttalResponse } from '@consensus-lab/shared-types';
import { SessionStateService } from '../../services/session-state.service';
import { PipelineStatusComponent } from '../pipeline-status/pipeline-status';
import { TelemetryStripComponent } from '../telemetry-strip/telemetry-strip';
import { ResearchPacketPanelComponent } from '../research-packet-panel/research-packet-panel';
import { AgentCardComponent } from '../agent-card/agent-card';
import { JudgePanelComponent } from '../judge-panel/judge-panel';
import { PipelineGraphComponent } from '../pipeline-graph/pipeline-graph';
import { ReplayTimelineComponent } from '../replay-timeline/replay-timeline';

@Component({
  selector: 'app-deliberation-view',
  standalone: true,
  imports: [CommonModule, PipelineStatusComponent, TelemetryStripComponent, ResearchPacketPanelComponent, AgentCardComponent, JudgePanelComponent, PipelineGraphComponent, ReplayTimelineComponent],
  templateUrl: './deliberation-view.html',
  styleUrl: './deliberation-view.css',
})
export class DeliberationViewComponent implements OnInit, OnDestroy {
  readonly sessionState = inject(SessionStateService);
  readonly replayMode = signal(false);
  private readonly cdr = inject(ChangeDetectorRef);
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.sessionState.session$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get activeColumn(): number {
    const status = this.sessionState.currentSession?.status;
    if (!status) return 0;
    if (['IDLE', 'RESEARCHING', 'PACKET_READY'].includes(status)) return 1;
    if (['AGENTS_ANALYZING'].includes(status)) return 2;
    if (['JUDGE_REVIEWING', 'REBUTTAL_ROUND', 'FINAL_VERDICT'].includes(status)) return 3;
    return 0;
  }

  get canReplay(): boolean {
    return this.sessionState.currentSession?.status === 'COMPLETE';
  }

  toggleReplayMode(): void {
    this.replayMode.update((value) => !value);
  }

  getRebuttal(agentId: string): RebuttalResponse | undefined {
    return this.sessionState.currentSession?.rebuttals.find((r) => r.agentId === agentId);
  }
}
