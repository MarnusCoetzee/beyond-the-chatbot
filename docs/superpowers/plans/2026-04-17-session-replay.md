# Session Replay & LLM Trace Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture every LLM call made during a pipeline run and expose a vertical-timeline replay UI that lets users drill into the exact prompts, responses, and parsed outputs of a completed session.

**Architecture:** Add a new `llm_traces` SQLite table and `TraceRepository`. Extend `LlmService` to accept an optional `traceContext` and persist each call. Add a `GET /api/sessions/:id/traces` endpoint. On the frontend, add a `ReplayTimelineComponent` available at `/sessions/:id/replay` and via a "Replay mode" toggle on the deliberation view for completed sessions.

**Tech Stack:** NestJS 11 (backend), Angular 21 standalone components (frontend), better-sqlite3, Jest + TestBed.

---

## File Structure

**Backend — create:**

- `apps/agent-backend/src/session/trace.repository.ts`
- `apps/agent-backend/src/session/trace.repository.spec.ts`

**Backend — modify:**

- `packages/shared-types/src/trace.ts` (new file)
- `packages/shared-types/src/index.ts` (add one re-export)
- `apps/agent-backend/src/llm/llm.service.ts` (accept `traceContext`, save trace)
- `apps/agent-backend/src/llm/llm.service.spec.ts` (cover trace capture)
- `apps/agent-backend/src/llm/llm.module.ts` (wire in `TraceRepository`)
- `apps/agent-backend/src/session/session.module.ts` (export `TraceRepository`)
- `apps/agent-backend/src/session/session.controller.ts` (add `GET :id/traces`)
- `apps/agent-backend/src/research/packet-builder.service.ts` (pass trace ctx)
- `apps/agent-backend/src/research/research-extraction.service.ts` (pass trace ctx)
- `apps/agent-backend/src/research/research.service.ts` (thread sessionId)
- `apps/agent-backend/src/agents/agent-runner.service.ts` (pass trace ctx)
- `apps/agent-backend/src/judge/judge.service.ts` (pass trace ctx)
- `apps/agent-backend/src/orchestration/orchestration.service.ts` (thread sessionId into calls)

**Frontend — create:**

- `apps/agent-frontend/src/app/services/trace.service.ts`
- `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.ts`
- `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.html`
- `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.css`
- `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.spec.ts`
- `apps/agent-frontend/src/app/pages/replay-page/replay-page.ts`
- `apps/agent-frontend/src/app/pages/replay-page/replay-page.html`

**Frontend — modify:**

- `apps/agent-frontend/src/app/app.routes.ts` (register route)
- `apps/agent-frontend/src/app/services/session.service.ts` (no change — `getBySession` is separate)
- `apps/agent-frontend/src/app/components/session-history/session-history.html` (add replay link)
- `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.ts` (replay mode toggle state)
- `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.html` (swap grid for timeline when replay mode on)
- `apps/agent-frontend/src/app/components/control-bar/control-bar.ts` (replay toggle button visible on complete)
- `apps/agent-frontend/src/app/components/control-bar/control-bar.html` (toggle markup)

---

## Task 1: Add `LlmTrace` shared type

**Files:**

- Create: `packages/shared-types/src/trace.ts`
- Modify: `packages/shared-types/src/index.ts`

- [ ] **Step 1: Create the type file**

Create `packages/shared-types/src/trace.ts` with:

```ts
export interface LlmTrace {
  id: string;
  sessionId: string;
  stage: string;
  actorId?: string;
  systemPrompt: string;
  userPrompt: string;
  rawResponse: string;
  parsedOutput?: unknown;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  createdAt: string;
}
```

- [ ] **Step 2: Export from the barrel**

Edit `packages/shared-types/src/index.ts`. Add as a new line at the end:

```ts
export * from './trace';
```

- [ ] **Step 3: Typecheck both projects**

Run: `./node_modules/.bin/nx run-many -t typecheck -p agent-backend,agent-frontend`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/src/trace.ts packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add LlmTrace type"
```

---

## Task 2: `TraceRepository` — create + test

**Files:**

- Create: `apps/agent-backend/src/session/trace.repository.ts`
- Test: `apps/agent-backend/src/session/trace.repository.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `apps/agent-backend/src/session/trace.repository.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `./node_modules/.bin/nx test agent-backend --testPathPattern=trace.repository.spec`
Expected: FAIL — "Cannot find module './trace.repository'"

- [ ] **Step 3: Implement `TraceRepository`**

Create `apps/agent-backend/src/session/trace.repository.ts`:

```ts
import { Injectable, Optional, Inject } from '@nestjs/common';
import Database from 'better-sqlite3';
import type { LlmTrace } from '@consensus-lab/shared-types';

export const TRACE_DB_TOKEN = 'TRACE_DB';

interface TraceRow {
  id: string;
  sessionId: string;
  stage: string;
  actorId: string | null;
  systemPrompt: string;
  userPrompt: string;
  rawResponse: string;
  parsedOutput: string | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

@Injectable()
export class TraceRepository {
  private readonly db: Database.Database;

  constructor(@Optional() @Inject(TRACE_DB_TOKEN) db?: Database.Database) {
    this.db = db ?? new Database('consensus-lab.db');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS llm_traces (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        stage TEXT NOT NULL,
        actorId TEXT,
        systemPrompt TEXT NOT NULL,
        userPrompt TEXT NOT NULL,
        rawResponse TEXT NOT NULL,
        parsedOutput TEXT,
        model TEXT,
        promptTokens INTEGER,
        completionTokens INTEGER,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_llm_traces_session ON llm_traces(sessionId);
    `);
  }

  save(trace: LlmTrace): void {
    this.db
      .prepare(
        `INSERT INTO llm_traces
         (id, sessionId, stage, actorId, systemPrompt, userPrompt, rawResponse, parsedOutput, model, promptTokens, completionTokens, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        trace.id,
        trace.sessionId,
        trace.stage,
        trace.actorId ?? null,
        trace.systemPrompt,
        trace.userPrompt,
        trace.rawResponse,
        trace.parsedOutput === undefined
          ? null
          : JSON.stringify(trace.parsedOutput),
        trace.model ?? null,
        trace.promptTokens ?? null,
        trace.completionTokens ?? null,
        trace.createdAt,
      );
  }

  listBySession(sessionId: string): LlmTrace[] {
    const rows = this.db
      .prepare(
        `SELECT id, sessionId, stage, actorId, systemPrompt, userPrompt, rawResponse, parsedOutput, model, promptTokens, completionTokens, createdAt
         FROM llm_traces WHERE sessionId = ? ORDER BY createdAt ASC`,
      )
      .all(sessionId) as TraceRow[];

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      stage: row.stage,
      actorId: row.actorId ?? undefined,
      systemPrompt: row.systemPrompt,
      userPrompt: row.userPrompt,
      rawResponse: row.rawResponse,
      parsedOutput:
        row.parsedOutput === null ? undefined : JSON.parse(row.parsedOutput),
      model: row.model ?? undefined,
      promptTokens: row.promptTokens ?? undefined,
      completionTokens: row.completionTokens ?? undefined,
      createdAt: row.createdAt,
    }));
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `./node_modules/.bin/nx test agent-backend --testPathPattern=trace.repository.spec`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/agent-backend/src/session/trace.repository.ts apps/agent-backend/src/session/trace.repository.spec.ts
git commit -m "feat(backend): add TraceRepository for LLM trace persistence"
```

---

## Task 3: Wire `TraceRepository` into `SessionModule`

**Files:**

- Modify: `apps/agent-backend/src/session/session.module.ts`

- [ ] **Step 1: Add the provider + export**

Edit `apps/agent-backend/src/session/session.module.ts` — replace the file with:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';
import { PendingRunService } from './pending-run.service';
import { TraceRepository } from './trace.repository';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [forwardRef(() => OrchestrationModule)],
  controllers: [SessionController],
  providers: [SessionRepository, PendingRunService, TraceRepository],
  exports: [SessionRepository, PendingRunService, TraceRepository],
})
export class SessionModule {}
```

- [ ] **Step 2: Build the backend to verify wiring compiles**

Run: `./node_modules/.bin/nx run agent-backend:build`
Expected: "webpack compiled successfully"

- [ ] **Step 3: Commit**

```bash
git add apps/agent-backend/src/session/session.module.ts
git commit -m "feat(backend): expose TraceRepository from SessionModule"
```

---

## Task 4: Extend `LlmService` to capture traces

**Files:**

- Modify: `apps/agent-backend/src/llm/llm.service.ts`
- Modify: `apps/agent-backend/src/llm/llm.service.spec.ts`
- Modify: `apps/agent-backend/src/llm/llm.module.ts`

- [ ] **Step 1: Update the module to import SessionModule**

Edit `apps/agent-backend/src/llm/llm.module.ts` — replace with:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { LlmService } from './llm.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [forwardRef(() => SessionModule)],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
```

- [ ] **Step 2: Write a failing test for trace capture**

Edit `apps/agent-backend/src/llm/llm.service.spec.ts`. Add this test inside the existing `describe('LlmService', ...)` block (append after the last test):

```ts
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
```

- [ ] **Step 3: Run the specs to verify they fail**

Run: `./node_modules/.bin/nx test agent-backend --testPathPattern=llm.service.spec`
Expected: FAIL — constructor takes no args, trace methods don't exist

- [ ] **Step 4: Implement trace capture**

Replace `apps/agent-backend/src/llm/llm.service.ts` with:

````ts
import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
    const client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
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
      this.logger.log(
        `LLM call [${request.metadata['stage'] ?? 'unknown'}]: ${usage?.totalTokens ?? '?'} tokens`,
      );
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

    // Inline a minimal copy of `complete` so we can record the raw response AND the parsed output in a single trace row.
    const client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
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
      this.logger.log(
        `LLM call [${request.metadata['stage'] ?? 'unknown'}]: ${usage?.totalTokens ?? '?'} tokens`,
      );
    }

    const cleaned = rawContent
      .replace(/```json?\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
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
    usage:
      | { promptTokens: number; completionTokens: number; totalTokens: number }
      | undefined,
    parsedOutput: unknown,
  ): void {
    if (!trace || !this.traceRepo) return;
    try {
      const record: LlmTrace = {
        id: uuidv4(),
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
````

- [ ] **Step 5: Run the specs to verify they pass**

Run: `./node_modules/.bin/nx test agent-backend --testPathPattern=llm.service.spec`
Expected: PASS (all existing tests + 4 new trace tests)

- [ ] **Step 6: Commit**

```bash
git add apps/agent-backend/src/llm/llm.service.ts apps/agent-backend/src/llm/llm.service.spec.ts apps/agent-backend/src/llm/llm.module.ts
git commit -m "feat(backend): capture LLM traces in LlmService"
```

---

## Task 5: Thread `sessionId` + traceContext through callers

**Files:**

- Modify: `apps/agent-backend/src/research/packet-builder.service.ts`
- Modify: `apps/agent-backend/src/research/research-extraction.service.ts`
- Modify: `apps/agent-backend/src/research/research.service.ts`
- Modify: `apps/agent-backend/src/agents/agent-runner.service.ts`
- Modify: `apps/agent-backend/src/judge/judge.service.ts`
- Modify: `apps/agent-backend/src/orchestration/orchestration.service.ts`

- [ ] **Step 1: Update `ResearchService.research` to accept `sessionId`**

Edit `apps/agent-backend/src/research/research.service.ts`. Change the signature and forward to callees:

```ts
  async research(
    sessionId: string,
    question: string,
    llmConfig: LlmConfig,
    searchConfig?: SearchConfig,
  ): Promise<ResearchPacket> {
    if (!searchConfig) {
      this.logger.log('Search disabled — building packet from LLM knowledge');
      return this.packetBuilder.buildPacketFromKnowledge(sessionId, question, llmConfig);
    }

    this.logger.log(`Searching via ${searchConfig.provider}...`);
    const rawResults = await this.searchProvider.search(question, searchConfig);

    if (rawResults.length === 0) {
      this.logger.warn('No search results — falling back to LLM knowledge');
      return this.packetBuilder.buildPacketFromKnowledge(sessionId, question, llmConfig);
    }

    this.logger.log(`Extracting claims from ${rawResults.length} results...`);
    const claims = await this.extraction.extractClaims(sessionId, question, rawResults, llmConfig);

    this.logger.log(`Building packet from ${claims.length} claims...`);
    return this.packetBuilder.buildPacket(sessionId, question, claims, rawResults, llmConfig);
  }
```

- [ ] **Step 2: Update `PacketBuilderService` methods**

Edit `apps/agent-backend/src/research/packet-builder.service.ts`. Add `sessionId: string` as the first parameter of both `buildPacket` and `buildPacketFromKnowledge`. At every call to `this.llm.completeJson(...)` or `this.llm.complete(...)`, pass as a third arg:

```ts
{ sessionId, stage: 'packet-building' }   // for buildPacket
{ sessionId, stage: 'packet-building-knowledge' }  // for buildPacketFromKnowledge
```

- [ ] **Step 3: Update `ResearchExtractionService.extractClaims`**

Edit `apps/agent-backend/src/research/research-extraction.service.ts`. Add `sessionId: string` as the first parameter and pass `{ sessionId, stage: 'claim-extraction' }` to the LLM call.

- [ ] **Step 4: Update `AgentRunnerService.analyze` and `rebut`**

Edit `apps/agent-backend/src/agents/agent-runner.service.ts`. Add `sessionId: string` as the first parameter of both `analyze(sessionId, config, packet, llmConfig)` and `rebut(sessionId, config, packet, challenge, original, llmConfig)`. Pass this as traceContext:

```ts
{ sessionId, stage: 'agent-analysis', actorId: config.agentId }  // analyze
{ sessionId, stage: 'agent-rebuttal', actorId: config.agentId }  // rebut
```

- [ ] **Step 5: Update `JudgeService.review` and `synthesize`**

Edit `apps/agent-backend/src/judge/judge.service.ts`. Add `sessionId: string` as the first parameter of both methods. Pass traceContext:

```ts
{ sessionId, stage: 'judge-review' }   // review
{ sessionId, stage: 'judge-verdict' }  // synthesize
```

- [ ] **Step 6: Update `OrchestrationService` to pass `sessionId`**

Edit `apps/agent-backend/src/orchestration/orchestration.service.ts`. Wherever it currently calls the services above, prepend `sessionId` as the first argument. Concretely:

- `this.researchService.research(session.question, llmConfig, searchConfig)` → `this.researchService.research(sessionId, session.question, llmConfig, searchConfig)` (line ~43)
- `this.agentRunner.analyze(config, session.researchPacket!, llmConfig)` → `this.agentRunner.analyze(sessionId, config, session.researchPacket!, llmConfig)` (line ~59)
- `this.judgeService.review(session.researchPacket!, session.analyses, llmConfig)` → `this.judgeService.review(sessionId, session.researchPacket!, session.analyses, llmConfig)` (line ~73)
- `this.agentRunner.rebut(config, session.researchPacket!, challenge, originalAnalysis, llmConfig)` → `this.agentRunner.rebut(sessionId, config, session.researchPacket!, challenge, originalAnalysis, llmConfig)` (line ~97)
- `this.judgeService.synthesize(session.researchPacket!, session.analyses, session.rebuttals, session.disagreements, llmConfig)` → `this.judgeService.synthesize(sessionId, session.researchPacket!, session.analyses, session.rebuttals, session.disagreements, llmConfig)` (line ~116)

- [ ] **Step 7: Build the backend**

Run: `./node_modules/.bin/nx run agent-backend:build`
Expected: "webpack compiled successfully"

- [ ] **Step 8: Run the full backend test suite**

Run: `./node_modules/.bin/nx test agent-backend`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/agent-backend/src/research apps/agent-backend/src/agents apps/agent-backend/src/judge apps/agent-backend/src/orchestration
git commit -m "feat(backend): thread sessionId + traceContext through pipeline services"
```

---

## Task 6: `GET /api/sessions/:id/traces` endpoint

**Files:**

- Modify: `apps/agent-backend/src/session/session.controller.ts`

- [ ] **Step 1: Add the route handler**

Edit `apps/agent-backend/src/session/session.controller.ts`. Add `TraceRepository` to the imports and to the constructor; add a new handler. Final file:

```ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { PendingRunService } from './pending-run.service';
import { TraceRepository } from './trace.repository';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { v4 as uuidv4 } from 'uuid';
import type {
  Session,
  CreateSessionResponse,
  SessionListItem,
  LlmTrace,
} from '@consensus-lab/shared-types';

@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly pendingRuns: PendingRunService,
    private readonly traceRepo: TraceRepository,
    @Inject(forwardRef(() => OrchestrationService))
    private readonly orchestration: OrchestrationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() dto: CreateSessionDto): CreateSessionResponse {
    const now = new Date().toISOString();
    const session: Session = {
      id: uuidv4(),
      question: dto.question,
      status: 'IDLE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      createdAt: now,
    };
    this.sessionRepo.create(session);
    this.pendingRuns.store(session.id, dto.llmConfig, dto.searchConfig);
    return { sessionId: session.id, status: session.status, createdAt: now };
  }

  @Get()
  listSessions(): SessionListItem[] {
    return this.sessionRepo.list();
  }

  @Get(':id')
  getSession(@Param('id') id: string): Session {
    const session = this.sessionRepo.getById(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  @Get(':id/traces')
  getTraces(@Param('id') id: string): LlmTrace[] {
    const session = this.sessionRepo.getById(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return this.traceRepo.listBySession(id);
  }

  @Post(':id/cancel')
  cancelSession(@Param('id') id: string): { status: string } {
    const session = this.sessionRepo.getById(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (['COMPLETE', 'ERROR', 'CANCELLED'].includes(session.status)) {
      throw new ConflictException(
        `Session is already in terminal state: ${session.status}`,
      );
    }
    this.orchestration.cancelSession(id);
    this.sessionRepo.updateStatus(id, 'CANCELLED');
    return { status: 'CANCELLED' };
  }
}
```

- [ ] **Step 2: Build to verify compilation**

Run: `./node_modules/.bin/nx run agent-backend:build`
Expected: "webpack compiled successfully"

- [ ] **Step 3: Smoke-test the endpoint**

In one terminal: `npm start`
In another: `curl -s http://localhost:3000/api/sessions/nonexistent/traces -w '\n%{http_code}'`
Expected: `{"message":"Session nonexistent not found", ...}` with HTTP 404

Stop the backend after verification.

- [ ] **Step 4: Commit**

```bash
git add apps/agent-backend/src/session/session.controller.ts
git commit -m "feat(backend): add GET /sessions/:id/traces endpoint"
```

---

## Task 7: Frontend `TraceService`

**Files:**

- Create: `apps/agent-frontend/src/app/services/trace.service.ts`

- [ ] **Step 1: Create the service**

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { LlmTrace } from '@consensus-lab/shared-types';

@Injectable({ providedIn: 'root' })
export class TraceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  getBySession(sessionId: string): Observable<LlmTrace[]> {
    return this.http.get<LlmTrace[]>(
      `${this.baseUrl}/sessions/${sessionId}/traces`,
    );
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/nx typecheck agent-frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/agent-frontend/src/app/services/trace.service.ts
git commit -m "feat(frontend): add TraceService for fetching LLM traces"
```

---

## Task 8: `ReplayTimelineComponent`

**Files:**

- Create: `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.ts`
- Create: `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.html`
- Create: `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.css`
- Create: `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.spec.ts`:

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ReplayTimelineComponent } from './replay-timeline';
import type { Session, LlmTrace } from '@consensus-lab/shared-types';

const fixtureSession: Session = {
  id: 'sess-1',
  question: 'Angular vs React?',
  status: 'COMPLETE',
  createdAt: '2026-04-17T10:00:00.000Z',
  events: [],
  stageMetadata: [],
  researchPacket: {
    question: 'Angular vs React?',
    options: ['Angular', 'React'],
    evaluationCriteria: [],
    claims: [],
    optionSummaries: {},
    webSources: [],
    gaps: [],
  },
  analyses: [
    {
      agentId: 'pragmatist',
      role: 'pragmatist',
      round: 1,
      recommendation: 'React',
      topReasons: ['r1'],
      risks: [],
      confidence: 80,
      strongestCounterargument: 'c',
      evidenceRefs: [],
    },
  ],
  disagreements: [],
  challengePrompts: [],
  rebuttals: [],
  verdict: {
    decisionType: 'single_winner',
    primaryRecommendation: 'React',
    reasoning: 'because',
    tradeoffs: [],
    whenAlternativeIsBetter: [],
    evidenceUsed: [],
    finalConfidence: 85,
  },
};

describe('ReplayTimelineComponent', () => {
  let fixture: ComponentFixture<ReplayTimelineComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReplayTimelineComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplayTimelineComponent);
    fixture.componentRef.setInput('session', fixtureSession);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders a stage card for research, each analysis, and the verdict', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Research');
    expect(el.textContent).toContain('pragmatist');
    expect(el.textContent).toContain('Final Verdict');
  });

  it('fetches traces lazily on first expand and caches them', () => {
    const component = fixture.componentInstance;

    component.expandTrace('agent-analysis', 'pragmatist');

    const req = httpMock.expectOne(
      'http://localhost:3000/api/sessions/sess-1/traces',
    );
    const trace: LlmTrace = {
      id: 'tr-1',
      sessionId: 'sess-1',
      stage: 'agent-analysis',
      actorId: 'pragmatist',
      systemPrompt: 'sys',
      userPrompt: 'usr',
      rawResponse: 'raw',
      parsedOutput: { recommendation: 'React' },
      model: 'm',
      createdAt: '2026-04-17T10:00:01.000Z',
    };
    req.flush([trace]);

    expect(component.getTrace('agent-analysis', 'pragmatist')).toEqual(trace);

    // Second expand should NOT trigger another HTTP call
    component.expandTrace('agent-analysis', 'pragmatist');
    httpMock.expectNone('http://localhost:3000/api/sessions/sess-1/traces');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `./node_modules/.bin/nx test agent-frontend --testPathPattern=replay-timeline`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the component**

Create `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.ts`:

```ts
import { Component, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Session, LlmTrace } from '@consensus-lab/shared-types';
import { TraceService } from '../../services/trace.service';

export interface TimelineCard {
  kind: 'research' | 'analysis' | 'judge-review' | 'rebuttal' | 'verdict';
  stage: string;
  actorId?: string;
  title: string;
  subtitle?: string;
}

@Component({
  selector: 'app-replay-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './replay-timeline.html',
  styleUrl: './replay-timeline.css',
})
export class ReplayTimelineComponent {
  private readonly traceService = inject(TraceService);

  @Input({ required: true }) session!: Session;

  private readonly traces = signal<LlmTrace[] | null>(null);
  private readonly loadingTraces = signal(false);
  private readonly expandedKeys = signal<Set<string>>(new Set());

  readonly cards = computed<TimelineCard[]>(() =>
    this.buildCards(this.session),
  );

  private buildCards(session: Session): TimelineCard[] {
    const cards: TimelineCard[] = [];
    if (session.researchPacket) {
      cards.push({
        kind: 'research',
        stage: 'packet-building-knowledge',
        title: 'Research',
      });
    }
    for (const a of session.analyses) {
      cards.push({
        kind: 'analysis',
        stage: 'agent-analysis',
        actorId: a.agentId,
        title: a.agentId,
        subtitle: `confidence ${a.confidence}`,
      });
    }
    if (
      session.disagreements.length > 0 ||
      session.challengePrompts.length > 0
    ) {
      cards.push({
        kind: 'judge-review',
        stage: 'judge-review',
        title: 'Judge Review',
      });
    }
    for (const r of session.rebuttals) {
      cards.push({
        kind: 'rebuttal',
        stage: 'agent-rebuttal',
        actorId: r.agentId,
        title: `${r.agentId} rebuttal`,
        subtitle: r.action,
      });
    }
    if (session.verdict) {
      cards.push({
        kind: 'verdict',
        stage: 'judge-verdict',
        title: 'Final Verdict',
      });
    }
    return cards;
  }

  analysisFor(agentId: string) {
    return this.session.analyses.find((a) => a.agentId === agentId);
  }

  rebuttalFor(agentId: string) {
    return this.session.rebuttals.find((r) => r.agentId === agentId);
  }

  stageMetadata(stage: string) {
    return this.session.stageMetadata.find((m) =>
      m.stage.toLowerCase().includes(stage.split('-')[0]),
    );
  }

  isExpanded(stage: string, actorId?: string): boolean {
    return this.expandedKeys().has(this.keyOf(stage, actorId));
  }

  expandTrace(stage: string, actorId?: string): void {
    const next = new Set(this.expandedKeys());
    next.add(this.keyOf(stage, actorId));
    this.expandedKeys.set(next);

    if (this.traces() === null && !this.loadingTraces()) {
      this.loadingTraces.set(true);
      this.traceService.getBySession(this.session.id).subscribe({
        next: (list) => {
          this.traces.set(list);
          this.loadingTraces.set(false);
        },
        error: () => {
          this.traces.set([]);
          this.loadingTraces.set(false);
        },
      });
    }
  }

  collapseTrace(stage: string, actorId?: string): void {
    const next = new Set(this.expandedKeys());
    next.delete(this.keyOf(stage, actorId));
    this.expandedKeys.set(next);
  }

  getTrace(stage: string, actorId?: string): LlmTrace | undefined {
    const list = this.traces();
    if (!list) return undefined;
    return list.find(
      (t) => t.stage === stage && (t.actorId ?? undefined) === actorId,
    );
  }

  tracesLoaded(): boolean {
    return this.traces() !== null;
  }

  tracesLoading(): boolean {
    return this.loadingTraces();
  }

  private keyOf(stage: string, actorId?: string): string {
    return actorId ? `${stage}::${actorId}` : stage;
  }
}
```

Create `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.html`:

```html
<div class="timeline">
  @for (card of cards(); track card.stage + (card.actorId ?? '')) {
  <div class="timeline-card">
    <div class="card-header">
      <h3 class="card-title">{{ card.title }}</h3>
      @if (card.subtitle) {
      <p class="card-subtitle mono">{{ card.subtitle }}</p>
      }
    </div>

    <div class="card-body">
      @switch (card.kind) { @case ('research') {
      <p>Options: {{ session.researchPacket?.options?.join(', ') }}</p>
      <p>Claims: {{ session.researchPacket?.claims?.length ?? 0 }}</p>
      } @case ('analysis') { @if (analysisFor(card.actorId!); as a) {
      <p><strong>Recommendation:</strong> {{ a.recommendation }}</p>
      <p><strong>Top reasons:</strong></p>
      <ul>
        @for (r of a.topReasons; track r) {
        <li>{{ r }}</li>
        }
      </ul>
      } } @case ('judge-review') {
      <p>Disagreements: {{ session.disagreements.length }}</p>
      <p>Challenges: {{ session.challengePrompts.length }}</p>
      } @case ('rebuttal') { @if (rebuttalFor(card.actorId!); as r) {
      <p><strong>Action:</strong> {{ r.action }}</p>
      <p>{{ r.response }}</p>
      } } @case ('verdict') { @if (session.verdict; as v) {
      <p>
        <strong>{{ v.primaryRecommendation }}</strong> ({{ v.finalConfidence }}%
        confidence)
      </p>
      <p>{{ v.reasoning }}</p>
      } } }
    </div>

    <div class="trace-section">
      @if (!isExpanded(card.stage, card.actorId)) {
      <button
        class="trace-toggle"
        (click)="expandTrace(card.stage, card.actorId)"
      >
        Show LLM Trace
      </button>
      } @else {
      <button
        class="trace-toggle"
        (click)="collapseTrace(card.stage, card.actorId)"
      >
        Hide LLM Trace
      </button>
      @if (tracesLoading()) {
      <p class="mono">Loading traces…</p>
      } @else if (getTrace(card.stage, card.actorId); as trace) {
      <div class="trace-panel">
        <h4 class="label">System Prompt</h4>
        <pre class="trace-pre">{{ trace.systemPrompt }}</pre>
        <h4 class="label">User Prompt</h4>
        <pre class="trace-pre">{{ trace.userPrompt }}</pre>
        <h4 class="label">Raw Response</h4>
        <pre class="trace-pre">{{ trace.rawResponse }}</pre>
        <p class="mono">
          {{ trace.model }} · {{ trace.promptTokens ?? '?' }} + {{
          trace.completionTokens ?? '?' }} tokens
        </p>
      </div>
      } @else if (tracesLoaded()) {
      <p class="mono">Traces not available for this session.</p>
      } }
    </div>
  </div>
  }
</div>
```

Create `apps/agent-frontend/src/app/components/replay-timeline/replay-timeline.css`:

```css
.timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.timeline-card {
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 1rem;
  background: #141414;
}

.card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  text-transform: capitalize;
}

.card-subtitle {
  margin: 0;
  color: #888;
  font-size: 0.875rem;
}

.card-body {
  font-size: 0.9rem;
  color: #ccc;
}

.trace-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #2a2a2a;
}

.trace-toggle {
  background: transparent;
  color: #7aa;
  border: 1px solid #2a4a4a;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.trace-toggle:hover {
  background: #1a2a2a;
}

.trace-panel {
  margin-top: 0.5rem;
}

.trace-pre {
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  padding: 0.5rem;
  overflow-x: auto;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8rem;
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.7rem;
  color: #888;
  margin: 0.75rem 0 0.25rem;
}

.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `./node_modules/.bin/nx test agent-frontend --testPathPattern=replay-timeline`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/agent-frontend/src/app/components/replay-timeline
git commit -m "feat(frontend): add ReplayTimelineComponent with lazy trace loading"
```

---

## Task 9: Replay page + route

**Files:**

- Create: `apps/agent-frontend/src/app/pages/replay-page/replay-page.ts`
- Create: `apps/agent-frontend/src/app/pages/replay-page/replay-page.html`
- Modify: `apps/agent-frontend/src/app/app.routes.ts`
- Modify: `apps/agent-frontend/src/app/app.html`

- [ ] **Step 1: Create the page component**

Create `apps/agent-frontend/src/app/pages/replay-page/replay-page.ts`:

```ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Session } from '@consensus-lab/shared-types';
import { SessionService } from '../../services/session.service';
import { ReplayTimelineComponent } from '../../components/replay-timeline/replay-timeline';

@Component({
  selector: 'app-replay-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ReplayTimelineComponent],
  templateUrl: './replay-page.html',
})
export class ReplayPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionService = inject(SessionService);

  readonly session = signal<Session | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing session id');
      return;
    }
    this.sessionService.get(id).subscribe({
      next: (s) => this.session.set(s),
      error: (e) => this.error.set(e.message ?? 'Failed to load session'),
    });
  }
}
```

Create `apps/agent-frontend/src/app/pages/replay-page/replay-page.html`:

```html
<div class="replay-page">
  <header>
    <a routerLink="/">← Back</a>
    <h1>Session Replay</h1>
  </header>

  @if (error(); as err) {
  <p class="error">{{ err }}</p>
  } @else if (session(); as s) {
  <p class="question">{{ s.question }}</p>
  <app-replay-timeline [session]="s" />
  } @else {
  <p>Loading…</p>
  }
</div>
```

- [ ] **Step 2: Register the route**

Edit `apps/agent-frontend/src/app/app.routes.ts`:

```ts
import { Route } from '@angular/router';
import { ReplayPageComponent } from './pages/replay-page/replay-page';

export const appRoutes: Route[] = [
  { path: 'sessions/:id/replay', component: ReplayPageComponent },
];
```

- [ ] **Step 3: Ensure the router outlet is rendered**

Edit `apps/agent-frontend/src/app/app.html` — replace the file with:

```html
<app-control-bar />

<main class="app-main">
  @if ((sessionState.session$ | async) === null) {
  <div class="landing-view">
    <div class="landing-hero">
      <h1 class="landing-title">Consensus Lab</h1>
      <p class="landing-subtitle">
        Multi-agent AI deliberation for engineering decisions
      </p>
    </div>
    <app-question-input />
  </div>
  } @else {
  <app-deliberation-view />
  }

  <router-outlet />
</main>
```

Also update `apps/agent-frontend/src/app/app.ts` to import `RouterOutlet`:

```ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
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
}
```

- [ ] **Step 4: Build + serve, visit the URL**

Run: `npm start`
Visit `http://localhost:4200/sessions/<existing-session-id>/replay` in the browser.
Expected: page loads, timeline cards render, "Show LLM Trace" works on each card for a session created after Task 6.

Stop the dev servers after verification.

- [ ] **Step 5: Commit**

```bash
git add apps/agent-frontend/src/app/pages apps/agent-frontend/src/app/app.routes.ts apps/agent-frontend/src/app/app.html apps/agent-frontend/src/app/app.ts
git commit -m "feat(frontend): add /sessions/:id/replay route"
```

---

## Task 10: "Replay" link in session history

**Files:**

- Modify: `apps/agent-frontend/src/app/components/session-history/session-history.html`

- [ ] **Step 1: Add the link**

Open `apps/agent-frontend/src/app/components/session-history/session-history.html`. Find the rendered row for each session (look for the session-item container). Inside the container, add this after the existing content, visible only when the session is complete:

```html
@if (session.status === 'COMPLETE') {
<a class="replay-link" [routerLink]="['/sessions', session.id, 'replay']"
  >Replay</a
>
}
```

Also ensure `session-history.ts` imports `RouterLink` and adds it to the component's `imports` array. Read the current file first to see the exact import list, then append `RouterLink` from `@angular/router`.

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/nx typecheck agent-frontend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/agent-frontend/src/app/components/session-history
git commit -m "feat(frontend): add Replay link in session history for completed sessions"
```

---

## Task 11: Replay mode toggle on deliberation view

**Files:**

- Modify: `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.ts`
- Modify: `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.html`

- [ ] **Step 1: Add replay mode state**

Edit `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.ts`. Add:

```ts
import {
  Component,
  inject,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
```

Inside the class, add:

```ts
  readonly replayMode = signal(false);

  toggleReplayMode(): void {
    this.replayMode.update((v) => !v);
  }

  get canReplay(): boolean {
    return this.sessionState.currentSession?.status === 'COMPLETE';
  }
```

Also add `ReplayTimelineComponent` to the `imports` array:

```ts
import { ReplayTimelineComponent } from '../replay-timeline/replay-timeline';
...
imports: [CommonModule, PipelineStatusComponent, TelemetryStripComponent, ResearchPacketPanelComponent, AgentCardComponent, JudgePanelComponent, PipelineGraphComponent, ReplayTimelineComponent],
```

- [ ] **Step 2: Add the toggle + swap in the template**

Edit `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.html`. Replace the file content with:

```html
@if (canReplay) {
<div class="replay-toggle-bar">
  <button class="replay-toggle" (click)="toggleReplayMode()">
    {{ replayMode() ? 'Back to deliberation view' : 'Replay mode' }}
  </button>
</div>
} @if (replayMode() && sessionState.currentSession) {
<app-replay-timeline [session]="sessionState.currentSession" />
} @else {
<div class="deliberation-grid">
  <div
    class="column col-1"
    [class.focused]="activeColumn === 1"
    [class.dimmed]="activeColumn > 0 && activeColumn !== 1"
  >
    <div class="column-header">
      <h2 class="label">Mission Control</h2>
    </div>
    <app-pipeline-status />
    <app-telemetry-strip />
  </div>

  <div
    class="column col-2"
    [class.focused]="activeColumn === 1"
    [class.dimmed]="activeColumn > 0 && activeColumn !== 1"
  >
    <div class="column-header">
      <h2 class="label">Research Packet</h2>
    </div>
    <app-research-packet-panel />
  </div>

  <div
    class="column col-3"
    [class.focused]="activeColumn === 2"
    [class.dimmed]="activeColumn > 0 && activeColumn !== 2"
  >
    <div class="column-header">
      <h2 class="label">Specialist Agents</h2>
    </div>
    @if (sessionState.currentSession?.analyses?.length) {
    <div class="agent-cards">
      @for (analysis of sessionState.currentSession!.analyses; track
      analysis.agentId) {
      <app-agent-card
        [analysis]="analysis"
        [rebuttal]="getRebuttal(analysis.agentId)"
      />
      }
    </div>
    } @else if (sessionState.currentSession?.status === 'AGENTS_ANALYZING') {
    <div class="analyzing-state">
      <p class="mono">Agents are analyzing...</p>
    </div>
    } @else {
    <div class="placeholder-content">
      <p class="mono">Waiting for agent analysis</p>
    </div>
    }
  </div>

  <div
    class="column col-4"
    [class.focused]="activeColumn === 3"
    [class.dimmed]="activeColumn > 0 && activeColumn !== 3"
  >
    <div class="column-header">
      <h2 class="label">Judge & Verdict</h2>
    </div>
    <app-judge-panel />
  </div>
</div>
<app-pipeline-graph />
}
```

- [ ] **Step 3: Typecheck**

Run: `./node_modules/.bin/nx typecheck agent-frontend`
Expected: PASS

- [ ] **Step 4: Manual verification**

Run: `npm start`
Create a new session, wait for it to complete, click "Replay mode" → view swaps to the vertical timeline; click "Back to deliberation view" → original grid returns.

Stop dev servers after verification.

- [ ] **Step 5: Commit**

```bash
git add apps/agent-frontend/src/app/components/deliberation-view
git commit -m "feat(frontend): add replay-mode toggle on deliberation view"
```

---

## Task 12: End-to-end verification

**Files:** None.

- [ ] **Step 1: Full test sweep**

Run: `./node_modules/.bin/nx run-many -t lint test build typecheck`
Expected: all green.

- [ ] **Step 2: Manual smoke test**

Start both apps (`npm start`), run a fresh session end-to-end, wait for COMPLETE. Then:

1. On the deliberation view, click "Replay mode" — timeline renders with all expected cards.
2. Click "Show LLM Trace" on an agent card — system prompt, user prompt, raw response visible.
3. Navigate to `http://localhost:4200/sessions/<id>/replay` — same timeline, standalone page.
4. From the session history list, click "Replay" on the completed session — navigates to the replay page.

- [ ] **Step 3: Commit any final tweaks and merge**

```bash
git log --oneline -20
```

Inspect the log; if everything looks good, the feature is ready for review or merge.

---

## Self-Review Checklist

**Spec coverage** — every spec requirement maps to at least one task:

- Capture prompts/responses/parsed output → Task 4
- `llm_traces` table + `TraceRepository` → Task 2
- `GET /sessions/:id/traces` → Task 6
- Route `/sessions/:id/replay` → Task 9
- Replay toggle on deliberation view → Task 11
- Replay link in session history → Task 10
- Vertical timeline with lazy trace loading → Task 8
- Show/hide LLM trace panels → Task 8
- Pre-feature sessions show "Traces not available" → Task 8 (handled by empty `traces` array)
- Tests for `TraceRepository`, `LlmService`, timeline component → Tasks 2, 4, 8
- Error handling (save failure logged, pipeline continues) → Task 4
