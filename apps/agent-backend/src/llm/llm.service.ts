import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmConfig } from '@consensus-lab/shared-types';

export interface LlmRequest {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, string>;
}

export interface LlmResponse<T = string> {
  result: T;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async complete(config: LlmConfig, request: LlmRequest): Promise<LlmResponse<string>> {
    const client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    if (request.metadata) {
      this.logger.log(`LLM call [${request.metadata['stage'] ?? 'unknown'}]: ${usage?.totalTokens ?? '?'} tokens`);
    }

    return { result: content, usage };
  }

  async completeJson<T>(config: LlmConfig, request: LlmRequest): Promise<LlmResponse<T>> {
    const systemWithJsonInstruction = `${request.system}\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.`;
    const response = await this.complete(config, { ...request, system: systemWithJsonInstruction });

    const cleaned = response.result.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as T;
    return { result: parsed, usage: response.usage };
  }
}
