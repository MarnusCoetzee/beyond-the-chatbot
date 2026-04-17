import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { SessionStateService } from '../../services/session-state.service';
import type { SessionListItem } from '@consensus-lab/shared-types';

@Component({
  selector: 'app-session-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './session-history.html',
  styleUrl: './session-history.css',
})
export class SessionHistoryComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  private readonly sessionService = inject(SessionService);
  private readonly sessionState = inject(SessionStateService);

  sessions: SessionListItem[] = [];
  loading = true;

  ngOnInit(): void {
    this.sessionService.list().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadSession(id: string): void {
    this.sessionService.get(id).subscribe({
      next: (session) => {
        this.sessionState.loadSession(session);
        this.closed.emit();
      },
    });
  }

  getStatusClass(status: string): string {
    if (status === 'COMPLETE') return 'complete';
    if (['ERROR', 'CANCELLED'].includes(status)) return 'error';
    return 'active';
  }

  formatDuration(ms?: number): string {
    if (!ms) return '—';
    return `${(ms / 1000).toFixed(1)}s`;
  }

  truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) + '...' : text;
  }
}
