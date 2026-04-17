import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { SessionService } from '../../services/session.service';
import { SseService } from '../../services/sse.service';
import { SessionStateService } from '../../services/session-state.service';

@Component({
  selector: 'app-question-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-input.html',
  styleUrl: './question-input.css',
})
export class QuestionInputComponent {
  private readonly settings = inject(SettingsService);
  private readonly sessionService = inject(SessionService);
  private readonly sseService = inject(SseService);
  private readonly sessionState = inject(SessionStateService);

  question = '';
  isSubmitting = false;
  error = '';

  readonly examplePrompts = [
    'What frontend framework is best for a startup in 2026?',
    'Angular vs React vs Vue for a large enterprise dashboard?',
    'Should a small team adopt TypeScript everywhere?',
    'PostgreSQL directly or Supabase for an MVP?',
    'Monorepo or polyrepo for a growing product team?',
  ];

  useExample(prompt: string): void {
    this.question = prompt;
  }

  submit(): void {
    if (!this.question.trim() || this.isSubmitting) return;

    const llmConfig = this.settings.getLlmConfig();
    if (!llmConfig) {
      this.error =
        'Please configure your LLM settings first (click ⚙ in the top bar)';
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    const searchConfig = this.settings.getSearchConfig();

    this.sessionService
      .create({
        question: this.question.trim(),
        llmConfig,
        searchConfig: searchConfig ?? undefined,
      })
      .subscribe({
        next: (response) => {
          this.sessionState.initSession({
            id: response.sessionId,
            question: this.question.trim(),
            status: response.status,
            createdAt: response.createdAt,
          });

          // Connect SSE
          this.sessionState.setConnected(true);
          this.sseService.connect(response.sessionId).subscribe({
            next: (msg) => this.sessionState.handleSseMessage(msg),
            complete: () => this.sessionState.setConnected(false),
          });

          this.isSubmitting = false;
          this.question = '';
        },
        error: (err) => {
          this.error = err.message || 'Failed to create session';
          this.isSubmitting = false;
        },
      });
  }
}
