import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import { SettingsDialogComponent } from '../settings-dialog/settings-dialog';
import { SessionHistoryComponent } from '../session-history/session-history';

@Component({
  selector: 'app-control-bar',
  standalone: true,
  imports: [CommonModule, SettingsDialogComponent, SessionHistoryComponent],
  templateUrl: './control-bar.html',
  styleUrl: './control-bar.css',
})
export class ControlBarComponent {
  readonly sessionState = inject(SessionStateService);
  showSettings = false;
  showHistory = false;

  get statusLabel(): string {
    const session = this.sessionState.currentSession;
    if (!session) return 'Ready';
    return session.status.replace(/_/g, ' ');
  }

  get statusClass(): string {
    const session = this.sessionState.currentSession;
    if (!session) return 'idle';
    if (['COMPLETE'].includes(session.status)) return 'complete';
    if (['ERROR', 'CANCELLED'].includes(session.status)) return 'error';
    return 'active';
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  newSession(): void {
    this.sessionState.clear();
  }
}
