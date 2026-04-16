import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-dialog.html',
  styleUrl: './settings-dialog.css',
})
export class SettingsDialogComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private readonly settings = inject(SettingsService);

  baseUrl = 'https://integrate.api.nvidia.com/v1';
  apiKey = '';
  model = 'meta/llama-3.1-8b-instruct';

  searchEnabled = false;
  searchProvider: 'brave' | 'firecrawl' = 'brave';
  searchApiKey = '';

  ngOnInit(): void {
    const llm = this.settings.getLlmConfig();
    if (llm) {
      this.baseUrl = llm.baseUrl;
      this.apiKey = llm.apiKey;
      this.model = llm.model;
    }
    const search = this.settings.getSearchConfig();
    if (search) {
      this.searchEnabled = true;
      this.searchProvider = search.provider;
      this.searchApiKey = search.apiKey;
    }
  }

  save(): void {
    this.settings.saveLlmConfig({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
    });

    if (this.searchEnabled && this.searchApiKey) {
      this.settings.saveSearchConfig({
        provider: this.searchProvider,
        apiKey: this.searchApiKey,
      });
    } else {
      this.settings.saveSearchConfig(null);
    }

    this.close.emit();
  }
}
