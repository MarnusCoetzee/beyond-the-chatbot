import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { LlmConfig, LlmTrace } from '@consensus-lab/shared-types';
import { TraceRepository } from '../session/trace.repository';

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

export interface TraceContext {
  sessionId: string;
  stage: string;
  actorId?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    @Optional()
    @Inject(forwardRef(() => TraceRepository))
    private readonly traceRepo?: TraceRepository,
  ) {}

  async complete(
    config: LlmConfig,
    request: LlmRequest,
    trace?: TraceContext,
  ): Promise<LlmResponse<string>> {
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

    this.persistTrace(trace, config, request, content, usage, undefined);

    return { result: content, usage };
  }

  async completeJson<T>(
    config: LlmConfig,
    request: LlmRequest,
    trace?: TraceContext,
  ): Promise<LlmResponse<T>> {
    const systemWithJsonInstruction = `${request.system}\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation.`;

    const client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemWithJsonInstruction },
        { role: 'user', content: request.user },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });

    const rawContent = response.choices[0]?.message?.content ?? '';
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

    const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as T;

    this.persistTrace(
      trace,
      config,
      { system: systemWithJsonInstruction, user: request.user },
      rawContent,
      usage,
      parsed,
    );

    return { result: parsed, usage };
  }

  private persistTrace(
    trace: TraceContext | undefined,
    config: LlmConfig,
    request: { system: string; user: string },
    rawResponse: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined,
    parsedOutput: unknown,
  ): void {
    if (!trace || !this.traceRepo) return;

    try {
      const record: LlmTrace = {
        id: randomUUID(),
        sessionId: trace.sessionId,
        stage: trace.stage,
        actorId: trace.actorId,
        systemPrompt: request.system,
        userPrompt: request.user,
        rawResponse,
        parsedOutput,
        model: config.model,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        createdAt: new Date().toISOString(),
      };
      this.traceRepo.save(record);
    } catch (err) {
      this.logger.warn(
        `Failed to persist trace for stage ${trace.stage}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
