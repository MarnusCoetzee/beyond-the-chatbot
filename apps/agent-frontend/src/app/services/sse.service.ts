import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { SseStateChanged, SseStageMetadata, SseDone, SseHeartbeat, SessionEvent } from '@consensus-lab/shared-types';

export type SseMessage =
  | { type: 'session.event'; data: SessionEvent }
  | { type: 'session.state_changed'; data: SseStateChanged }
  | { type: 'session.stage_metadata'; data: SseStageMetadata }
  | { type: 'session.heartbeat'; data: SseHeartbeat }
  | { type: 'session.done'; data: SseDone };

@Injectable({ providedIn: 'root' })
export class SseService {
  connect(sessionId: string): Observable<SseMessage> {
    return new Observable((subscriber) => {
      const url = `http://localhost:3000/api/sessions/${sessionId}/events`;
      const eventSource = new EventSource(url);

      const eventTypes = [
        'session.event',
        'session.state_changed',
        'session.stage_metadata',
        'session.heartbeat',
        'session.done',
      ] as const;

      for (const type of eventTypes) {
        eventSource.addEventListener(type, (event: MessageEvent) => {
          subscriber.next({ type, data: JSON.parse(event.data) } as SseMessage);
          if (type === 'session.done') {
            eventSource.close();
            subscriber.complete();
          }
        });
      }

      eventSource.onerror = () => {
        eventSource.close();
        subscriber.complete();
      };

      return () => eventSource.close();
    });
  }
}
