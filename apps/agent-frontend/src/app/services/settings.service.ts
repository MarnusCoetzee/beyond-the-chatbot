import { Injectable } from '@angular/core';
import type { LlmConfig, SearchConfig } from '@consensus-lab/shared-types';

const LLM_CONFIG_KEY = 'consensus-lab-llm-config';
const SEARCH_CONFIG_KEY = 'consensus-lab-search-config';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  getLlmConfig(): LlmConfig | null {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    return raw ? (JSON.parse(raw) as LlmConfig) : null;
  }

  saveLlmConfig(config: LlmConfig): void {
    localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
  }

  getSearchConfig(): SearchConfig | null {
    const raw = localStorage.getItem(SEARCH_CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SearchConfig) : null;
  }

  saveSearchConfig(config: SearchConfig | null): void {
    if (config) {
      localStorage.setItem(SEARCH_CONFIG_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(SEARCH_CONFIG_KEY);
    }
  }
}
