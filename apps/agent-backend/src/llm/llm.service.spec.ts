import { Test } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { LlmConfig } from '@consensus-lab/shared-types';

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'test response' } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        },
      },
    })),
  };
});

describe('LlmService', () => {
  let service: LlmService;
  const testConfig: LlmConfig = {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKey: 'test-key',
    model: 'meta/llama-3.1-8b-instruct',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [LlmService],
    }).compile();
    service = module.get(LlmService);
  });

  it('should return a completion result with usage', async () => {
    const result = await service.complete(testConfig, {
      system: 'You are a helpful assistant.',
      user: 'Hello',
    });
    expect(result.result).toBe('test response');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('should parse JSON responses', async () => {
    const OpenAI = (await import('openai')).default;
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '{"name":"test"}' } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        },
      },
    }));

    const result = await service.completeJson<{ name: string }>(testConfig, {
      system: 'Return JSON.',
      user: 'Give me an object.',
    });
    expect(result.result).toEqual({ name: 'test' });
  });

  describe('trace capture', () => {
    it('saves a trace via TraceRepository when traceContext is provided', async () => {
      const OpenAI = (await import('openai')).default as unknown as jest.Mock;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'hello world' } }],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            }),
          },
        },
      }));

      const save = jest.fn();
      const traceRepo = {
        save,
      } as unknown as import('../session/trace.repository').TraceRepository;
      const service = new (await import('./llm.service')).LlmService(traceRepo);

      await service.complete(
        testConfig,
        { system: 'sys', user: 'usr' },
        { sessionId: 's1', stage: 'agent-analysis', actorId: 'pragmatist' },
      );

      expect(save).toHaveBeenCalledTimes(1);
      const trace = save.mock.calls[0][0];
      expect(trace.sessionId).toBe('s1');
      expect(trace.stage).toBe('agent-analysis');
      expect(trace.actorId).toBe('pragmatist');
      expect(trace.systemPrompt).toBe('sys');
      expect(trace.userPrompt).toBe('usr');
      expect(trace.rawResponse).toBe('hello world');
      expect(trace.promptTokens).toBe(10);
      expect(trace.completionTokens).toBe(5);
      expect(trace.parsedOutput).toBeUndefined();
      expect(typeof trace.id).toBe('string');
      expect(typeof trace.createdAt).toBe('string');
    });

    it('saves the parsed JSON as parsedOutput for completeJson', async () => {
      const OpenAI = (await import('openai')).default as unknown as jest.Mock;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: '{"answer":42}' } }],
            }),
          },
        },
      }));

      const save = jest.fn();
      const traceRepo = {
        save,
      } as unknown as import('../session/trace.repository').TraceRepository;
      const service = new (await import('./llm.service')).LlmService(traceRepo);

      await service.completeJson(
        testConfig,
        { system: 'sys', user: 'usr' },
        { sessionId: 's1', stage: 'judge-review' },
      );

      const trace = save.mock.calls[0][0];
      expect(trace.parsedOutput).toEqual({ answer: 42 });
      expect(trace.rawResponse).toBe('{"answer":42}');
    });

    it('does not call TraceRepository when traceContext is omitted', async () => {
      const OpenAI = (await import('openai')).default as unknown as jest.Mock;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'ok' } }],
            }),
          },
        },
      }));

      const save = jest.fn();
      const traceRepo = {
        save,
      } as unknown as import('../session/trace.repository').TraceRepository;
      const service = new (await import('./llm.service')).LlmService(traceRepo);

      await service.complete(testConfig, { system: 'sys', user: 'usr' });

      expect(save).not.toHaveBeenCalled();
    });

    it('does not throw when trace save fails', async () => {
      const OpenAI = (await import('openai')).default as unknown as jest.Mock;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'ok' } }],
            }),
          },
        },
      }));

      const save = jest.fn().mockImplementation(() => {
        throw new Error('db down');
      });
      const traceRepo = {
        save,
      } as unknown as import('../session/trace.repository').TraceRepository;
      const service = new (await import('./llm.service')).LlmService(traceRepo);

      await expect(
        service.complete(
          testConfig,
          { system: 'sys', user: 'usr' },
          { sessionId: 's1', stage: 'agent-analysis' },
        ),
      ).resolves.toBeDefined();
    });
  });
});
