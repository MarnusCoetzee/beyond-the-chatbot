import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { ControlBarComponent } from './components/control-bar/control-bar';
import { QuestionInputComponent } from './components/question-input/question-input';
import { DeliberationViewComponent } from './components/deliberation-view/deliberation-view';
import { SessionStateService } from './services/session-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ControlBarComponent,
    QuestionInputComponent,
    DeliberationViewComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  readonly sessionState = inject(SessionStateService);
  readonly router = inject(Router);

  get isReplayRoute(): boolean {
    return this.router.url.includes('/replay');
  }
}
