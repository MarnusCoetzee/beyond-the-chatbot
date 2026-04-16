import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ResearchClaim } from '@consensus-lab/shared-types';

@Component({
  selector: 'app-claim-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './claim-card.html',
  styleUrl: './claim-card.css',
})
export class ClaimCardComponent {
  @Input({ required: true }) claim!: ResearchClaim;

  get strengthBars(): boolean[] {
    const level = this.claim.supportLevel;
    if (level === 'strong') return [true, true, true];
    if (level === 'moderate') return [true, true, false];
    return [true, false, false];
  }
}
