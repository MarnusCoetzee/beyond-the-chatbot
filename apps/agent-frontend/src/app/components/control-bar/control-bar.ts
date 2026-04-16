import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import { SettingsDialogComponent } from '../settings-dialog/settings-dialog';

@Component({
  selector: 'app-control-bar',
  standalone: true,
  imports: [CommonModule, SettingsDialogComponent],
  templateUrl: './control-bar.html',
  styleUrl: './control-bar.css',
})
export class ControlBarComponent {
  readonly sessionState = inject(SessionStateService);
  showSettings = false;

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

  newSession(): void {
    this.sessionState.clear();
  }
}
