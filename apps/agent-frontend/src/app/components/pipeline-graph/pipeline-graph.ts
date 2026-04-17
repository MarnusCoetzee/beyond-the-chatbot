import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import type { PipelineState } from '@consensus-lab/shared-types';

@Component({
  selector: 'app-pipeline-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipeline-graph.html',
  styleUrl: './pipeline-graph.css',
})
export class PipelineGraphComponent {
  readonly sessionState = inject(SessionStateService);

  private readonly stageOrder: PipelineState[] = [
    'IDLE',
    'RESEARCHING',
    'PACKET_READY',
    'AGENTS_ANALYZING',
    'JUDGE_REVIEWING',
    'REBUTTAL_ROUND',
    'FINAL_VERDICT',
    'COMPLETE',
  ];

  private readonly nodeStageMap: Record<string, PipelineState> = {
    question: 'IDLE',
    research: 'RESEARCHING',
    packet: 'PACKET_READY',
    pragmatist: 'AGENTS_ANALYZING',
    performance: 'AGENTS_ANALYZING',
    dx: 'AGENTS_ANALYZING',
    skeptic: 'AGENTS_ANALYZING',
    judge: 'JUDGE_REVIEWING',
    rebuttal: 'REBUTTAL_ROUND',
    verdict: 'FINAL_VERDICT',
  };

  getNodeClass(nodeId: string): string {
    const currentStatus = this.sessionState.currentSession?.status;
    if (!currentStatus) return 'idle';
    if (currentStatus === 'ERROR') return 'error';
    if (currentStatus === 'COMPLETE') return 'complete';

    const nodeStage = this.nodeStageMap[nodeId];
    if (!nodeStage) return 'idle';

    const currentIdx = this.stageOrder.indexOf(currentStatus);
    const nodeIdx = this.stageOrder.indexOf(nodeStage);

    if (currentStatus === nodeStage) return 'active';
    if (currentIdx > nodeIdx) return 'complete';
    return 'idle';
  }

  getConnectorClass(sourceId: string, targetId: string): string {
    const sourceClass = this.getNodeClass(sourceId);
    const targetClass = this.getNodeClass(targetId);

    if (sourceClass === 'error' || targetClass === 'error') return 'error';
    if (targetClass === 'active' || sourceClass === 'active') return 'active';
    if (sourceClass === 'complete' && targetClass === 'complete')
      return 'complete';
    return 'idle';
  }
}
