import { TraceRepository } from './trace.repository';
import type { LlmTrace } from '@consensus-lab/shared-types';
import Database from 'better-sqlite3';

describe('TraceRepository', () => {
  let db: Database.Database;
  let repo: TraceRepository;

  const buildTrace = (overrides: Partial<LlmTrace> = {}): LlmTrace => ({
    id: 't1',
    sessionId: 's1',
    stage: 'agent-analysis',
    actorId: 'pragmatist',
    systemPrompt: 'you are an agent',
    userPrompt: 'analyze this',
    rawResponse: '{"recommendation":"React"}',
    parsedOutput: { recommendation: 'React' },
    model: 'meta/llama-3.1-8b-instruct',
    promptTokens: 100,
    completionTokens: 50,
    createdAt: '2026-04-17T10:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    db = new Database(':memory:');
    repo = new TraceRepository(db);
  });

  it('saves and lists traces by session ordered by createdAt', () => {
    repo.save(buildTrace({ id: 't2', createdAt: '2026-04-17T10:00:02.000Z' }));
    repo.save(buildTrace({ id: 't1', createdAt: '2026-04-17T10:00:01.000Z' }));
    repo.save(buildTrace({ id: 'other', sessionId: 'other-session' }));

    const result = repo.listBySession('s1');

    expect(result.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('returns an empty array when a session has no traces', () => {
    expect(repo.listBySession('unknown')).toEqual([]);
  });

  it('round-trips parsedOutput as an object', () => {
    const complex = { a: 1, b: [true, 'x'] };
    repo.save(buildTrace({ parsedOutput: complex }));

    const [out] = repo.listBySession('s1');

    expect(out.parsedOutput).toEqual(complex);
  });

  it('stores null parsedOutput when undefined', () => {
    repo.save(buildTrace({ parsedOutput: undefined }));

    const [out] = repo.listBySession('s1');

    expect(out.parsedOutput).toBeUndefined();
  });
});
