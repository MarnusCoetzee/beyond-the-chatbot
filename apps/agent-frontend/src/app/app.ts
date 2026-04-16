import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlBarComponent } from './components/control-bar/control-bar';
import { QuestionInputComponent } from './components/question-input/question-input';
import { SessionStateService } from './services/session-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ControlBarComponent, QuestionInputComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  readonly sessionState = inject(SessionStateService);
}
