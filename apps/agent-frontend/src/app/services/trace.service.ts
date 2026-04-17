import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { LlmTrace } from '@consensus-lab/shared-types';

@Injectable({ providedIn: 'root' })
export class TraceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  getBySession(sessionId: string): Observable<LlmTrace[]> {
    return this.http.get<LlmTrace[]>(`${this.baseUrl}/sessions/${sessionId}/traces`);
  }
}
