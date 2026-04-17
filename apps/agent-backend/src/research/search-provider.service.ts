import { Injectable, Logger } from '@nestjs/common';
import type { SearchConfig } from '@consensus-lab/shared-types';

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
}

@Injectable()
export class SearchProviderService {
  private readonly logger = new Logger(SearchProviderService.name);

  async search(
    query: string,
    config: SearchConfig,
  ): Promise<RawSearchResult[]> {
    if (config.provider === 'brave') {
      return this.searchBrave(query, config.apiKey);
    }
    if (config.provider === 'firecrawl') {
      return this.searchFirecrawl(query, config.apiKey);
    }
    return [];
  }

  private async searchBrave(
    query: string,
    apiKey: string,
  ): Promise<RawSearchResult[]> {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
    const response = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    });
    if (!response.ok) {
      this.logger.warn(`Brave search failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as {
      web?: {
        results?: Array<{ title: string; url: string; description: string }>;
      };
    };
    return (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  }

  private async searchFirecrawl(
    query: string,
    apiKey: string,
  ): Promise<RawSearchResult[]> {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit: 10 }),
    });
    if (!response.ok) {
      this.logger.warn(`Firecrawl search failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as {
      data?: Array<{ title?: string; url: string; description?: string }>;
    };
    return (data.data ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url,
      snippet: r.description ?? '',
    }));
  }
}
