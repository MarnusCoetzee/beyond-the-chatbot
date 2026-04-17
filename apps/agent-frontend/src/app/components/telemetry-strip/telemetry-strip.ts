import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';

@Component({
  selector: 'app-telemetry-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './telemetry-strip.html',
  styleUrl: './telemetry-strip.css',
})
export class TelemetryStripComponent implements OnInit, OnDestroy {
  readonly sessionState = inject(SessionStateService);
  elapsed = '0.0s';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private startTime: number | null = null;

  ngOnInit(): void {
    this.startTime = Date.now();
    this.timerId = setInterval(() => {
      if (this.startTime) {
        const ms = Date.now() - this.startTime;
        this.elapsed = `${(ms / 1000).toFixed(1)}s`;
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  get sourceCount(): number {
    return (
      this.sessionState.currentSession?.researchPacket?.webSources?.length ?? 0
    );
  }

  get totalTokens(): number {
    const metadata = this.sessionState.currentSession?.stageMetadata ?? [];
    return metadata.reduce((sum, m) => sum + (m.tokenUsage?.total ?? 0), 0);
  }

  get model(): string {
    const metadata = this.sessionState.currentSession?.stageMetadata ?? [];
    return metadata[0]?.model ?? '—';
  }
}
