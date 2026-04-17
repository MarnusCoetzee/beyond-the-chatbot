import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService } from '../../services/session-state.service';
import { SourceCardComponent } from '../source-card/source-card';
import { ClaimCardComponent } from '../claim-card/claim-card';

@Component({
  selector: 'app-research-packet-panel',
  standalone: true,
  imports: [CommonModule, SourceCardComponent, ClaimCardComponent],
  templateUrl: './research-packet-panel.html',
  styleUrl: './research-packet-panel.css',
})
export class ResearchPacketPanelComponent {
  readonly sessionState = inject(SessionStateService);

  get packet() {
    return this.sessionState.currentSession?.researchPacket;
  }
  get isResearching() {
    return this.sessionState.currentSession?.status === 'RESEARCHING';
  }
}
