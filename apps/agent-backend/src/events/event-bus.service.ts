import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';
import { SessionEvent, SseStateChanged, SseStageMetadata, SseDone, SseHeartbeat } from '@consensus-lab/shared-types';

export type SseEvent =
  | { type: 'session.event'; sessionId: string; data: SessionEvent }
  | { type: 'session.state_changed'; sessionId: string; data: SseStateChanged }
  | { type: 'session.stage_metadata'; sessionId: string; data: SseStageMetadata }
  | { type: 'session.heartbeat'; sessionId: string; data: SseHeartbeat }
  | { type: 'session.done'; sessionId: string; data: SseDone };

@Injectable()
export class EventBusService {
  private readonly events$ = new Subject<SseEvent>();

  emit(event: SseEvent): void {
    this.events$.next(event);
  }

  getSessionEvents(sessionId: string): Observable<SseEvent> {
    return this.events$.pipe(filter((e) => e.sessionId === sessionId));
  }
}
