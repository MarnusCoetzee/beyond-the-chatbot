import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Session } from '@consensus-lab/shared-types';
import { ReplayTimelineComponent } from '../../components/replay-timeline/replay-timeline';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-replay-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReplayTimelineComponent],
  templateUrl: './replay-page.html',
})
export class ReplayPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionService = inject(SessionService);

  readonly session = signal<Session | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing session id');
      return;
    }

    this.sessionService.get(id).subscribe({
      next: (session) => this.session.set(session),
      error: (error: { message?: string }) => this.error.set(error.message ?? 'Failed to load session'),
    });
  }
}
