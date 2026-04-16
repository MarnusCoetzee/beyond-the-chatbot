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
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
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
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
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
});
