import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import type { LlmTrace, Session } from '@consensus-lab/shared-types';
import { TraceService } from '../../services/trace.service';

export interface TimelineCard {
  kind: 'research' | 'analysis' | 'judge-review' | 'rebuttal' | 'verdict';
  stage: string;
  actorId?: string;
  title: string;
  subtitle?: string;
}

@Component({
  selector: 'app-replay-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './replay-timeline.html',
  styleUrl: './replay-timeline.css',
})
export class ReplayTimelineComponent {
  private readonly traceService = inject(TraceService);

  @Input({ required: true }) session!: Session;

  private readonly traces = signal<LlmTrace[] | null>(null);
  private readonly loadingTraces = signal(false);
  private readonly expandedKeys = signal<Set<string>>(new Set());

  readonly cards = computed<TimelineCard[]>(() =>
    this.buildCards(this.session),
  );

  analysisFor(agentId: string) {
    return this.session.analyses.find((a) => a.agentId === agentId);
  }

  rebuttalFor(agentId: string) {
    return this.session.rebuttals.find((r) => r.agentId === agentId);
  }

  isExpanded(stage: string, actorId?: string): boolean {
    return this.expandedKeys().has(this.keyOf(stage, actorId));
  }

  expandTrace(stage: string, actorId?: string): void {
    const next = new Set(this.expandedKeys());
    next.add(this.keyOf(stage, actorId));
    this.expandedKeys.set(next);

    if (this.traces() === null && !this.loadingTraces()) {
      this.loadingTraces.set(true);
      this.traceService.getBySession(this.session.id).subscribe({
        next: (list) => {
          this.traces.set(list);
          this.loadingTraces.set(false);
        },
        error: () => {
          this.traces.set([]);
          this.loadingTraces.set(false);
        },
      });
    }
  }

  collapseTrace(stage: string, actorId?: string): void {
    const next = new Set(this.expandedKeys());
    next.delete(this.keyOf(stage, actorId));
    this.expandedKeys.set(next);
  }

  getTrace(stage: string, actorId?: string): LlmTrace | undefined {
    const list = this.traces();
    if (!list) return undefined;

    const stages =
      stage === 'packet-building-knowledge'
        ? ['packet-building-knowledge', 'packet-building']
        : [stage];

    return list.find(
      (t) => stages.includes(t.stage) && (t.actorId ?? undefined) === actorId,
    );
  }

  tracesLoaded(): boolean {
    return this.traces() !== null;
  }

  tracesLoading(): boolean {
    return this.loadingTraces();
  }

  private buildCards(session: Session): TimelineCard[] {
    const cards: TimelineCard[] = [];

    if (session.researchPacket) {
      cards.push({
        kind: 'research',
        stage:
          session.researchPacket.webSources.length > 0
            ? 'packet-building'
            : 'packet-building-knowledge',
        title: 'Research',
      });
    }

    for (const analysis of session.analyses) {
      cards.push({
        kind: 'analysis',
        stage: 'agent-analysis',
        actorId: analysis.agentId,
        title: analysis.agentId,
        subtitle: `confidence ${analysis.confidence}`,
      });
    }

    if (
      session.disagreements.length > 0 ||
      session.challengePrompts.length > 0
    ) {
      cards.push({
        kind: 'judge-review',
        stage: 'judge-review',
        title: 'Judge Review',
      });
    }

    for (const rebuttal of session.rebuttals) {
      cards.push({
        kind: 'rebuttal',
        stage: 'agent-rebuttal',
        actorId: rebuttal.agentId,
        title: `${rebuttal.agentId} rebuttal`,
        subtitle: rebuttal.action,
      });
    }

    if (session.verdict) {
      cards.push({
        kind: 'verdict',
        stage: 'judge-verdict',
        title: 'Final Verdict',
      });
    }

    return cards;
  }

  private keyOf(stage: string, actorId?: string): string {
    return actorId ? `${stage}::${actorId}` : stage;
  }
}
