import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import type { PipelineState } from '@consensus-lab/shared-types';

interface StageStep {
  state: PipelineState;
  label: string;
}

@Component({
  selector: 'app-pipeline-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipeline-status.html',
  styleUrl: './pipeline-status.css',
})
export class PipelineStatusComponent {
  readonly sessionState = inject(SessionStateService);

  readonly stages: StageStep[] = [
    { state: 'RESEARCHING', label: 'Research' },
    { state: 'PACKET_READY', label: 'Packet Ready' },
    { state: 'AGENTS_ANALYZING', label: 'Agent Analysis' },
    { state: 'JUDGE_REVIEWING', label: 'Judge Review' },
    { state: 'REBUTTAL_ROUND', label: 'Rebuttal' },
    { state: 'FINAL_VERDICT', label: 'Verdict' },
  ];

  private readonly stageOrder: PipelineState[] = [
    'IDLE', 'RESEARCHING', 'PACKET_READY', 'AGENTS_ANALYZING',
    'JUDGE_REVIEWING', 'REBUTTAL_ROUND', 'FINAL_VERDICT', 'COMPLETE',
  ];

  getStageClass(stage: PipelineState): string {
    const current = this.sessionState.currentSession?.status;
    if (!current) return 'pending';
    if (current === stage) return 'active';
    const currentIdx = this.stageOrder.indexOf(current);
    const stageIdx = this.stageOrder.indexOf(stage);
    if (currentIdx > stageIdx) return 'complete';
    if (current === 'COMPLETE' || current === 'ERROR' || current === 'CANCELLED') {
      if (stageIdx <= this.stageOrder.indexOf('FINAL_VERDICT')) return 'complete';
    }
    return 'pending';
  }

  getStageDuration(stage: PipelineState): string | null {
    const metadata = this.sessionState.currentSession?.stageMetadata.find(m => m.stage === stage);
    if (!metadata?.durationMs) return null;
    return `${(metadata.durationMs / 1000).toFixed(1)}s`;
  }
}
