import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { SessionStateService } from '../../services/session-state.service';
import { Subscription } from 'rxjs';
import type { PipelineState } from '@consensus-lab/shared-types';

interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

@Component({
  selector: 'app-pipeline-graph',
  standalone: true,
  imports: [CommonModule, NgxGraphModule],
  templateUrl: './pipeline-graph.html',
  styleUrl: './pipeline-graph.css',
})
export class PipelineGraphComponent implements OnInit, OnDestroy {
  readonly sessionState = inject(SessionStateService);
  private subscription?: Subscription;

  nodes: GraphNode[] = [
    { id: 'question', label: 'Question' },
    { id: 'research', label: 'Research' },
    { id: 'packet', label: 'Packet' },
    { id: 'pragmatist', label: 'Pragmatist' },
    { id: 'performance', label: 'Performance' },
    { id: 'dx', label: 'DX Advocate' },
    { id: 'skeptic', label: 'Skeptic' },
    { id: 'judge', label: 'Judge' },
    { id: 'rebuttal', label: 'Rebuttal' },
    { id: 'verdict', label: 'Verdict' },
  ];

  links: GraphEdge[] = [
    { id: 'e1', source: 'question', target: 'research' },
    { id: 'e2', source: 'research', target: 'packet' },
    { id: 'e3', source: 'packet', target: 'pragmatist' },
    { id: 'e4', source: 'packet', target: 'performance' },
    { id: 'e5', source: 'packet', target: 'dx' },
    { id: 'e6', source: 'packet', target: 'skeptic' },
    { id: 'e7', source: 'pragmatist', target: 'judge' },
    { id: 'e8', source: 'performance', target: 'judge' },
    { id: 'e9', source: 'dx', target: 'judge' },
    { id: 'e10', source: 'skeptic', target: 'judge' },
    { id: 'e11', source: 'judge', target: 'rebuttal' },
    { id: 'e12', source: 'rebuttal', target: 'verdict' },
  ];

  private readonly stageOrder: PipelineState[] = [
    'IDLE', 'RESEARCHING', 'PACKET_READY', 'AGENTS_ANALYZING',
    'JUDGE_REVIEWING', 'REBUTTAL_ROUND', 'FINAL_VERDICT', 'COMPLETE',
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

  ngOnInit(): void {
    this.subscription = this.sessionState.session$.subscribe();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getNodeClass(nodeId: string): string {
    const currentStatus = this.sessionState.currentSession?.status;
    if (!currentStatus) return 'idle';

    const nodeStage = this.nodeStageMap[nodeId];
    if (!nodeStage) return 'idle';

    const currentIdx = this.stageOrder.indexOf(currentStatus);
    const nodeIdx = this.stageOrder.indexOf(nodeStage);

    if (currentStatus === nodeStage) return 'active';
    if (currentIdx > nodeIdx) return 'complete';
    if (currentStatus === 'COMPLETE') return 'complete';
    if (currentStatus === 'ERROR') {
      if (currentIdx >= nodeIdx) return 'error';
    }
    return 'idle';
  }

  getEdgeClass(edge: GraphEdge): string {
    const sourceClass = this.getNodeClass(edge.source);
    const targetClass = this.getNodeClass(edge.target);
    if (targetClass === 'active') return 'active-edge';
    if (sourceClass === 'complete' && targetClass === 'complete') return 'complete-edge';
    return '';
  }
}
