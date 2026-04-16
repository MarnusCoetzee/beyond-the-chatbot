import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Source } from '@consensus-lab/shared-types';

@Component({
  selector: 'app-source-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './source-card.html',
  styleUrl: './source-card.css',
})
export class SourceCardComponent {
  @Input({ required: true }) source!: Source;

  get domain(): string {
    try {
      return new URL(this.source.url).hostname.replace('www.', '');
    } catch {
      return this.source.url;
    }
  }
}
