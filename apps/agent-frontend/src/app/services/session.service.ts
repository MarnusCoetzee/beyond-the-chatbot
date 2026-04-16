import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  SessionListItem,
  Session,
} from '@consensus-lab/shared-types';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  create(request: CreateSessionRequest): Observable<CreateSessionResponse> {
    return this.http.post<CreateSessionResponse>(`${this.baseUrl}/sessions`, request);
  }

  list(): Observable<SessionListItem[]> {
    return this.http.get<SessionListItem[]>(`${this.baseUrl}/sessions`);
  }

  get(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/sessions/${id}`);
  }

  cancel(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/sessions/${id}/cancel`, {});
  }
}
