import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type {
  Session,
  PipelineState,
  SessionEvent,
  StageMetadata,
  AgentAnalysis,
  Disagreement,
  ChallengePrompt,
  RebuttalResponse,
  Verdict,
} from '@consensus-lab/shared-types';
import type { SseMessage } from './sse.service';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private readonly sessionSubject = new BehaviorSubject<Session | null>(null);
  private readonly connectedSubject = new BehaviorSubject<boolean>(false);

  readonly session$ = this.sessionSubject.asObservable();
  readonly connected$ = this.connectedSubject.asObservable();

  get currentSession(): Session | null {
    return this.sessionSubject.value;
  }

  initSession(session: Partial<Session> & { id: string; question: string; createdAt: string }): void {
    this.sessionSubject.next({
      status: 'IDLE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      ...session,
    });
  }

  setConnected(connected: boolean): void {
    this.connectedSubject.next(connected);
  }

  handleSseMessage(message: SseMessage): void {
    const session = this.currentSession;
    if (!session) return;

    switch (message.type) {
      case 'session.state_changed':
        this.update({ status: message.data.state });
        break;
      case 'session.event':
        this.handleSessionEvent(message.data);
        break;
      case 'session.stage_metadata':
        this.update({
          stageMetadata: [...session.stageMetadata, message.data as unknown as StageMetadata],
        });
        break;
      case 'session.done':
        this.update({ status: message.data.finalStatus as PipelineState });
        this.setConnected(false);
        break;
      case 'session.heartbeat':
        break;
    }
  }

  private handleSessionEvent(event: SessionEvent): void {
    const session = this.currentSession;
    if (!session) return;

    const events = [...session.events, event];
    const updates: Partial<Session> = { events };

    if (event.type === 'agent_analysis_completed' && event.payload?.['analysis']) {
      updates.analyses = [...session.analyses, event.payload['analysis'] as AgentAnalysis];
    }
    if (event.type === 'disagreement_found' && event.payload?.['disagreement']) {
      updates.disagreements = [...session.disagreements, event.payload['disagreement'] as Disagreement];
    }
    if (event.type === 'challenge_issued' && event.payload?.['challenge']) {
      updates.challengePrompts = [...session.challengePrompts, event.payload['challenge'] as ChallengePrompt];
    }
    if (event.type === 'rebuttal_completed' && event.payload?.['rebuttal']) {
      updates.rebuttals = [...session.rebuttals, event.payload['rebuttal'] as RebuttalResponse];
    }
    if (event.type === 'verdict_completed' && event.payload?.['verdict']) {
      updates.verdict = event.payload['verdict'] as Verdict;
    }

    this.update(updates);
  }

  loadSession(session: Session): void {
    this.sessionSubject.next(session);
  }

  clear(): void {
    this.sessionSubject.next(null);
    this.connectedSubject.next(false);
  }

  private update(partial: Partial<Session>): void {
    const current = this.currentSession;
    if (current) {
      this.sessionSubject.next({ ...current, ...partial });
    }
  }
}
