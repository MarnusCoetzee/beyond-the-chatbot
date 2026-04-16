# Consensus Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-agent AI deliberation system where a user asks an engineering question, a Research Agent gathers evidence, specialist agents debate from different perspectives, a Judge arbitrates, and the process is visualized as a live animated decision graph.

**Architecture:** Nx 22 monorepo. NestJS 11 backend with 7 modules (LLM, Research, Agents, Judge, Orchestration, Session, Events). Angular 21 frontend with standalone components, custom SCSS design system, and @swimlane/ngx-graph for pipeline visualization. Shared types in `packages/shared-types`. SSE for real-time updates. SQLite for persistence.

**Tech Stack:** Angular 21, NestJS 11, OpenAI SDK (provider-agnostic), better-sqlite3, SSE, @swimlane/ngx-graph, RxJS, custom SCSS design tokens

**Spec:** `docs/superpowers/specs/2026-04-16-consensus-lab-prd.md`

---

## File Structure

### Shared Types — `packages/shared-types/`

```
packages/shared-types/
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
└── src/
    ├── index.ts                          # barrel export
    ├── pipeline-state.ts                 # PipelineState, ConfidenceLevel
    ├── agent-config.ts                   # AgentRole, AgentConfig
    ├── research-packet.ts                # Source, ResearchClaim, OptionSummary, ResearchPacket
    ├── evidence-ref.ts                   # EvidenceRef
    ├── agent-analysis.ts                 # AgentAnalysis
    ├── disagreement.ts                   # Disagreement
    ├── judge.ts                          # ChallengePrompt, RebuttalResponse
    ├── verdict.ts                        # Verdict
    ├── session-event.ts                  # SessionEvent, SessionEventType
    ├── stage-metadata.ts                 # StageMetadata
    ├── session.ts                        # Session, SessionError
    └── api.ts                            # CreateSessionRequest, CreateSessionResponse, SessionListItem, SseEventTypes
```

### Backend — `apps/agent-backend/src/`

```
apps/agent-backend/src/
├── main.ts                               # (modify) add CORS, ValidationPipe
├── app/
│   ├── app.module.ts                     # (modify) import all feature modules
│   ├── app.controller.ts                 # (modify) health endpoint
│   └── app.service.ts                    # (delete or keep for health)
├── llm/
│   ├── llm.module.ts
│   ├── llm.service.ts                    # complete(), completeJson()
│   └── llm.service.spec.ts
├── research/
│   ├── research.module.ts
│   ├── search-provider.service.ts        # Brave search abstraction
│   ├── research-extraction.service.ts    # raw results -> claims
│   ├── packet-builder.service.ts         # claims -> ResearchPacket
│   ├── research.service.ts               # orchestrates the 3 layers
│   └── research.service.spec.ts
├── agents/
│   ├── agents.module.ts
│   ├── agent-configs.ts                  # AgentConfig[] for 4 specialists
│   ├── agent-runner.service.ts           # analyze(), rebut()
│   └── agent-runner.service.spec.ts
├── judge/
│   ├── judge.module.ts
│   ├── judge.service.ts                  # review(), synthesize()
│   └── judge.service.spec.ts
├── orchestration/
│   ├── orchestration.module.ts
│   ├── orchestration.service.ts          # state machine, run()
│   └── orchestration.service.spec.ts
├── session/
│   ├── session.module.ts
│   ├── session.controller.ts             # REST endpoints
│   ├── session.repository.ts             # SQLite persistence
│   ├── session.repository.spec.ts
│   └── dto/
│       └── create-session.dto.ts         # validation with class-validator
├── events/
│   ├── events.module.ts
│   ├── event-bus.service.ts              # EventEmitter wrapper
│   └── events.controller.ts             # SSE endpoint
└── util/
    └── concurrency.ts                    # concurrency-limited Promise.all
```

### Frontend — `apps/agent-frontend/src/`

```
apps/agent-frontend/src/
├── main.ts                               # (no change)
├── styles.css                            # (replace) global design tokens + ambient background
├── app/
│   ├── app.ts                            # (modify) remove NxWelcome, add shell
│   ├── app.html                          # (modify) app shell template
│   ├── app.css                           # (modify) app shell styles
│   ├── app.config.ts                     # (modify) add provideHttpClient
│   ├── app.routes.ts                     # (no change — no routing)
│   ├── services/
│   │   ├── session.service.ts            # HTTP calls
│   │   ├── sse.service.ts                # EventSource -> Observable
│   │   ├── session-state.service.ts      # BehaviorSubject state management
│   │   └── settings.service.ts           # localStorage config
│   ├── components/
│   │   ├── control-bar/
│   │   │   ├── control-bar.ts
│   │   │   ├── control-bar.html
│   │   │   └── control-bar.css
│   │   ├── question-input/
│   │   │   ├── question-input.ts
│   │   │   ├── question-input.html
│   │   │   └── question-input.css
│   │   ├── settings-dialog/
│   │   │   ├── settings-dialog.ts
│   │   │   ├── settings-dialog.html
│   │   │   └── settings-dialog.css
│   │   ├── deliberation-view/
│   │   │   ├── deliberation-view.ts
│   │   │   ├── deliberation-view.html
│   │   │   └── deliberation-view.css
│   │   ├── pipeline-status/
│   │   │   ├── pipeline-status.ts
│   │   │   ├── pipeline-status.html
│   │   │   └── pipeline-status.css
│   │   ├── telemetry-strip/
│   │   │   ├── telemetry-strip.ts
│   │   │   ├── telemetry-strip.html
│   │   │   └── telemetry-strip.css
│   │   ├── research-packet-panel/
│   │   │   ├── research-packet-panel.ts
│   │   │   ├── research-packet-panel.html
│   │   │   └── research-packet-panel.css
│   │   ├── source-card/
│   │   │   ├── source-card.ts
│   │   │   ├── source-card.html
│   │   │   └── source-card.css
│   │   ├── claim-card/
│   │   │   ├── claim-card.ts
│   │   │   ├── claim-card.html
│   │   │   └── claim-card.css
│   │   ├── agent-card/
│   │   │   ├── agent-card.ts
│   │   │   ├── agent-card.html
│   │   │   └── agent-card.css
│   │   ├── judge-panel/
│   │   │   ├── judge-panel.ts
│   │   │   ├── judge-panel.html
│   │   │   └── judge-panel.css
│   │   ├── disagreement-card/
│   │   │   ├── disagreement-card.ts
│   │   │   ├── disagreement-card.html
│   │   │   └── disagreement-card.css
│   │   ├── verdict-card/
│   │   │   ├── verdict-card.ts
│   │   │   ├── verdict-card.html
│   │   │   └── verdict-card.css
│   │   ├── pipeline-graph/
│   │   │   ├── pipeline-graph.ts
│   │   │   ├── pipeline-graph.html
│   │   │   └── pipeline-graph.css
│   │   └── session-history/
│   │       ├── session-history.ts
│   │       ├── session-history.html
│   │       └── session-history.css
```

---

## Task 1: Shared Types Package

Create the `packages/shared-types` library with all interfaces from the PRD. This is the foundation everything else imports.

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/tsconfig.lib.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/pipeline-state.ts`
- Create: `packages/shared-types/src/agent-config.ts`
- Create: `packages/shared-types/src/research-packet.ts`
- Create: `packages/shared-types/src/evidence-ref.ts`
- Create: `packages/shared-types/src/agent-analysis.ts`
- Create: `packages/shared-types/src/disagreement.ts`
- Create: `packages/shared-types/src/judge.ts`
- Create: `packages/shared-types/src/verdict.ts`
- Create: `packages/shared-types/src/session-event.ts`
- Create: `packages/shared-types/src/stage-metadata.ts`
- Create: `packages/shared-types/src/session.ts`
- Create: `packages/shared-types/src/api.ts`
- Modify: `tsconfig.base.json` — add path alias `@consensus-lab/shared-types`

- [ ] **Step 1: Create package.json for shared-types**

```json
{
  "name": "@consensus-lab/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create tsconfig.lib.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

- [ ] **Step 4: Create all type files**

`packages/shared-types/src/pipeline-state.ts`:
```typescript
export type PipelineState =
  | 'IDLE'
  | 'RESEARCHING'
  | 'PACKET_READY'
  | 'AGENTS_ANALYZING'
  | 'JUDGE_REVIEWING'
  | 'REBUTTAL_ROUND'
  | 'FINAL_VERDICT'
  | 'COMPLETE'
  | 'ERROR'
  | 'CANCELLED';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
```

`packages/shared-types/src/agent-config.ts`:
```typescript
export type AgentRole = 'pragmatist' | 'performance' | 'dx' | 'skeptic';

export interface AgentConfig {
  agentId: string;
  displayName: string;
  role: AgentRole;
  lens: string;
  systemPrompt: string;
}
```

`packages/shared-types/src/research-packet.ts`:
```typescript
import { ConfidenceLevel } from './pipeline-state';

export interface Source {
  id: string;
  title: string;
  url: string;
  type: 'docs' | 'blog' | 'benchmark' | 'forum' | 'other';
}

export interface ResearchClaim {
  id: string;
  option: string;
  criterion: string;
  claim: string;
  supportLevel: 'strong' | 'moderate' | 'weak';
  sourceRefs: string[];
}

export interface OptionSummary {
  pros: string[];
  cons: string[];
  evidenceClaimIds: string[];
  confidence: ConfidenceLevel;
}

export interface ResearchPacket {
  question: string;
  options: string[];
  evaluationCriteria: string[];
  claims: ResearchClaim[];
  optionSummaries: Record<string, OptionSummary>;
  webSources: Source[];
  gaps: string[];
}
```

`packages/shared-types/src/evidence-ref.ts`:
```typescript
export interface EvidenceRef {
  sourceId: string;
  claimId: string;
  excerpt?: string;
}
```

`packages/shared-types/src/agent-analysis.ts`:
```typescript
import { AgentRole } from './agent-config';
import { EvidenceRef } from './evidence-ref';

export interface AgentAnalysis {
  agentId: string;
  role: AgentRole;
  round: number;
  recommendation: string;
  topReasons: string[];
  risks: string[];
  confidence: number;
  strongestCounterargument: string;
  evidenceRefs: EvidenceRef[];
}
```

`packages/shared-types/src/disagreement.ts`:
```typescript
export interface Disagreement {
  topic: string;
  agentsInConflict: string[];
  summary: string;
  severity: 'low' | 'medium' | 'high';
}
```

`packages/shared-types/src/judge.ts`:
```typescript
export interface ChallengePrompt {
  id: string;
  round: number;
  targetAgentIds: string[];
  topic: string;
  prompt: string;
}

export interface RebuttalResponse {
  agentId: string;
  round: number;
  action: 'defend' | 'revise' | 'concede';
  response: string;
  revisedRecommendation?: string;
  revisedConfidence?: number;
}
```

`packages/shared-types/src/verdict.ts`:
```typescript
import { EvidenceRef } from './evidence-ref';

export interface Verdict {
  decisionType: 'single_winner' | 'contextual' | 'tie';
  primaryRecommendation: string;
  ranking?: string[];
  reasoning: string;
  tradeoffs: string[];
  whenAlternativeIsBetter: string[];
  evidenceUsed: EvidenceRef[];
  finalConfidence: number;
}
```

`packages/shared-types/src/session-event.ts`:
```typescript
export type SessionEventType =
  | 'question_received'
  | 'research_started'
  | 'source_fetched'
  | 'claim_extracted'
  | 'packet_completed'
  | 'agent_started'
  | 'agent_analysis_completed'
  | 'judge_review_started'
  | 'disagreement_found'
  | 'challenge_issued'
  | 'rebuttal_completed'
  | 'verdict_completed'
  | 'error';

export interface SessionEvent {
  id: string;
  timestamp: string;
  type: SessionEventType;
  actorId?: string;
  payload?: Record<string, unknown>;
}
```

`packages/shared-types/src/stage-metadata.ts`:
```typescript
import { PipelineState } from './pipeline-state';

export interface StageMetadata {
  stage: PipelineState;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  };
  estimatedCostUsd?: number;
  provider?: string;
  model?: string;
}
```

`packages/shared-types/src/session.ts`:
```typescript
import { PipelineState } from './pipeline-state';
import { ResearchPacket } from './research-packet';
import { AgentAnalysis } from './agent-analysis';
import { Disagreement } from './disagreement';
import { ChallengePrompt, RebuttalResponse } from './judge';
import { Verdict } from './verdict';
import { SessionEvent } from './session-event';
import { StageMetadata } from './stage-metadata';

export interface SessionError {
  message: string;
  stage?: PipelineState;
  code?: string;
}

export interface Session {
  id: string;
  question: string;
  status: PipelineState;
  researchPacket?: ResearchPacket;
  analyses: AgentAnalysis[];
  disagreements: Disagreement[];
  challengePrompts: ChallengePrompt[];
  rebuttals: RebuttalResponse[];
  verdict?: Verdict;
  events: SessionEvent[];
  stageMetadata: StageMetadata[];
  error?: SessionError;
  createdAt: string;
}
```

`packages/shared-types/src/api.ts`:
```typescript
import { PipelineState } from './pipeline-state';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface SearchConfig {
  provider: 'firecrawl' | 'brave';
  apiKey: string;
}

export interface CreateSessionRequest {
  question: string;
  llmConfig: LlmConfig;
  searchConfig?: SearchConfig;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: PipelineState;
  createdAt: string;
}

export interface SessionListItem {
  id: string;
  question: string;
  status: PipelineState;
  createdAt: string;
  durationMs?: number;
}

export interface SseStateChanged {
  state: PipelineState;
  previousState: PipelineState;
}

export interface SseStageMetadata {
  stage: PipelineState;
  durationMs: number;
  tokenUsage?: { input?: number; output?: number; total?: number };
}

export interface SseDone {
  sessionId: string;
  finalStatus: 'COMPLETE' | 'ERROR' | 'CANCELLED';
}

export interface SseHeartbeat {
  timestamp: string;
}
```

`packages/shared-types/src/index.ts`:
```typescript
export * from './pipeline-state';
export * from './agent-config';
export * from './research-packet';
export * from './evidence-ref';
export * from './agent-analysis';
export * from './disagreement';
export * from './judge';
export * from './verdict';
export * from './session-event';
export * from './stage-metadata';
export * from './session';
export * from './api';
```

- [ ] **Step 5: Add path alias to tsconfig.base.json**

Add to `tsconfig.base.json` `compilerOptions`:
```json
"paths": {
  "@consensus-lab/shared-types": ["packages/shared-types/src/index.ts"]
}
```

- [ ] **Step 6: Verify TypeScript resolves the package**

Run: `npx tsc --project packages/shared-types/tsconfig.lib.json --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/shared-types/ tsconfig.base.json
git commit -m "feat: add shared-types package with all PRD interfaces"
```

---

## Task 2: Install Backend Dependencies

Install OpenAI SDK, better-sqlite3, class-validator, class-transformer, uuid.

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install production dependencies**

Run: `npm install openai better-sqlite3 class-validator class-transformer uuid`

- [ ] **Step 2: Install dev type packages**

Run: `npm install -D @types/better-sqlite3 @types/uuid`

- [ ] **Step 3: Verify installs**

Run: `npx nx typecheck agent-backend`
Expected: Passes (existing code still compiles).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install backend deps (openai, better-sqlite3, class-validator, uuid)"
```

---

## Task 3: Install Frontend Dependencies

Install @swimlane/ngx-graph, @angular/cdk, and fonts.

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install frontend dependencies**

Run: `npm install @swimlane/ngx-graph @angular/cdk`

- [ ] **Step 2: Verify installs**

Run: `npx nx typecheck agent-frontend`
Expected: Passes.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install frontend deps (ngx-graph, angular cdk)"
```

---

## Task 4: Backend — LlmModule

The only module that talks to an LLM provider. Provider-agnostic via OpenAI SDK with configurable baseUrl.

**Files:**
- Create: `apps/agent-backend/src/llm/llm.module.ts`
- Create: `apps/agent-backend/src/llm/llm.service.ts`
- Create: `apps/agent-backend/src/llm/llm.service.spec.ts`

- [ ] **Step 1: Write the LlmService test**

`apps/agent-backend/src/llm/llm.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { LlmConfig } from '@consensus-lab/shared-types';

// Mock the openai module
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test agent-backend -- --testPathPattern=llm.service`
Expected: FAIL — `llm.service.ts` does not exist yet.

- [ ] **Step 3: Implement LlmService**

`apps/agent-backend/src/llm/llm.service.ts`:
```typescript
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
```

- [ ] **Step 4: Create LlmModule**

`apps/agent-backend/src/llm/llm.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';

@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx nx test agent-backend -- --testPathPattern=llm.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agent-backend/src/llm/
git commit -m "feat(backend): add LlmModule with provider-agnostic OpenAI SDK wrapper"
```

---

## Task 5: Backend — EventBusService + EventsModule

Internal event bus and SSE endpoint. Other modules depend on this for emitting events.

**Files:**
- Create: `apps/agent-backend/src/events/event-bus.service.ts`
- Create: `apps/agent-backend/src/events/events.controller.ts`
- Create: `apps/agent-backend/src/events/events.module.ts`
- Create: `apps/agent-backend/src/util/concurrency.ts`

- [ ] **Step 1: Create EventBusService**

`apps/agent-backend/src/events/event-bus.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';
import { SessionEvent, SseStateChanged, SseStageMetadata, SseDone, SseHeartbeat } from '@consensus-lab/shared-types';

export type SseEvent =
  | { type: 'session.event'; sessionId: string; data: SessionEvent }
  | { type: 'session.state_changed'; sessionId: string; data: SseStateChanged }
  | { type: 'session.stage_metadata'; sessionId: string; data: SseStageMetadata }
  | { type: 'session.heartbeat'; sessionId: string; data: SseHeartbeat }
  | { type: 'session.done'; sessionId: string; data: SseDone };

@Injectable()
export class EventBusService {
  private readonly events$ = new Subject<SseEvent>();

  emit(event: SseEvent): void {
    this.events$.next(event);
  }

  getSessionEvents(sessionId: string): Observable<SseEvent> {
    return this.events$.pipe(filter((e) => e.sessionId === sessionId));
  }
}
```

- [ ] **Step 2: Create SSE EventsController**

`apps/agent-backend/src/events/events.controller.ts`:
```typescript
import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { EventBusService } from './event-bus.service';
import { Subscription } from 'rxjs';

@Controller('sessions')
export class EventsController {
  constructor(private readonly eventBus: EventBusService) {}

  @Get(':id/events')
  streamEvents(@Param('id') sessionId: string, @Res() res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(HttpStatus.OK);
    res.flushHeaders();

    const subscription: Subscription = this.eventBus
      .getSessionEvents(sessionId)
      .subscribe((event) => {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }
}
```

- [ ] **Step 3: Create EventsModule**

`apps/agent-backend/src/events/events.module.ts`:
```typescript
import { Module, Global } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { EventsController } from './events.controller';

@Global()
@Module({
  controllers: [EventsController],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
```

- [ ] **Step 4: Create concurrency utility**

`apps/agent-backend/src/util/concurrency.ts`:
```typescript
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((e) => e === p),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/agent-backend/src/events/ apps/agent-backend/src/util/
git commit -m "feat(backend): add EventsModule with SSE streaming and event bus"
```

---

## Task 6: Backend — SessionModule (Persistence + REST)

SQLite persistence via better-sqlite3 and the REST controller for sessions.

**Files:**
- Create: `apps/agent-backend/src/session/session.repository.ts`
- Create: `apps/agent-backend/src/session/session.repository.spec.ts`
- Create: `apps/agent-backend/src/session/dto/create-session.dto.ts`
- Create: `apps/agent-backend/src/session/session.controller.ts`
- Create: `apps/agent-backend/src/session/session.module.ts`

- [ ] **Step 1: Write the SessionRepository test**

`apps/agent-backend/src/session/session.repository.spec.ts`:
```typescript
import { SessionRepository } from './session.repository';
import { Session } from '@consensus-lab/shared-types';

describe('SessionRepository', () => {
  let repo: SessionRepository;

  beforeEach(() => {
    repo = new SessionRepository(':memory:');
  });

  it('should create and retrieve a session', () => {
    const session: Session = {
      id: 'test-1',
      question: 'React vs Angular?',
      status: 'IDLE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      createdAt: new Date().toISOString(),
    };
    repo.create(session);
    const retrieved = repo.getById('test-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.question).toBe('React vs Angular?');
    expect(retrieved!.status).toBe('IDLE');
  });

  it('should list sessions', () => {
    const session: Session = {
      id: 'test-2',
      question: 'Monorepo or polyrepo?',
      status: 'COMPLETE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      createdAt: new Date().toISOString(),
    };
    repo.create(session);
    const list = repo.list();
    expect(list.length).toBe(1);
    expect(list[0].question).toBe('Monorepo or polyrepo?');
  });

  it('should update status', () => {
    const session: Session = {
      id: 'test-3',
      question: 'Test?',
      status: 'IDLE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      createdAt: new Date().toISOString(),
    };
    repo.create(session);
    repo.updateStatus('test-3', 'RESEARCHING');
    const retrieved = repo.getById('test-3');
    expect(retrieved!.status).toBe('RESEARCHING');
  });

  it('should append events', () => {
    const session: Session = {
      id: 'test-4',
      question: 'Test?',
      status: 'IDLE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      createdAt: new Date().toISOString(),
    };
    repo.create(session);
    repo.appendEvent('test-4', {
      id: 'evt-1',
      timestamp: new Date().toISOString(),
      type: 'research_started',
    });
    const retrieved = repo.getById('test-4');
    expect(retrieved!.events.length).toBe(1);
    expect(retrieved!.events[0].type).toBe('research_started');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test agent-backend -- --testPathPattern=session.repository`
Expected: FAIL — `session.repository.ts` does not exist.

- [ ] **Step 3: Implement SessionRepository**

`apps/agent-backend/src/session/session.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import {
  Session,
  SessionEvent,
  SessionListItem,
  PipelineState,
  ResearchPacket,
  AgentAnalysis,
  Disagreement,
  ChallengePrompt,
  RebuttalResponse,
  Verdict,
  StageMetadata,
  SessionError,
} from '@consensus-lab/shared-types';

@Injectable()
export class SessionRepository {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath ?? 'consensus-lab.db');
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
  }

  create(session: Session): void {
    this.db.prepare('INSERT INTO sessions (id, data) VALUES (?, ?)').run(
      session.id,
      JSON.stringify(session),
    );
  }

  getById(id: string): Session | undefined {
    const row = this.db.prepare('SELECT data FROM sessions WHERE id = ?').get(id) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as Session) : undefined;
  }

  list(): SessionListItem[] {
    const rows = this.db
      .prepare('SELECT data FROM sessions ORDER BY json_extract(data, \'$.createdAt\') DESC')
      .all() as { data: string }[];
    return rows.map((row) => {
      const session = JSON.parse(row.data) as Session;
      const totalDuration = session.stageMetadata.reduce((sum, m) => sum + (m.durationMs ?? 0), 0);
      return {
        id: session.id,
        question: session.question,
        status: session.status,
        createdAt: session.createdAt,
        durationMs: totalDuration || undefined,
      };
    });
  }

  updateStatus(id: string, status: PipelineState): void {
    const session = this.getById(id);
    if (!session) return;
    session.status = status;
    this.save(session);
  }

  saveResearchPacket(id: string, packet: ResearchPacket): void {
    const session = this.getById(id);
    if (!session) return;
    session.researchPacket = packet;
    this.save(session);
  }

  saveAnalyses(id: string, analyses: AgentAnalysis[]): void {
    const session = this.getById(id);
    if (!session) return;
    session.analyses = analyses;
    this.save(session);
  }

  saveDisagreements(id: string, disagreements: Disagreement[]): void {
    const session = this.getById(id);
    if (!session) return;
    session.disagreements = disagreements;
    this.save(session);
  }

  saveChallengePrompts(id: string, challengePrompts: ChallengePrompt[]): void {
    const session = this.getById(id);
    if (!session) return;
    session.challengePrompts = challengePrompts;
    this.save(session);
  }

  saveRebuttals(id: string, rebuttals: RebuttalResponse[]): void {
    const session = this.getById(id);
    if (!session) return;
    session.rebuttals = rebuttals;
    this.save(session);
  }

  saveVerdict(id: string, verdict: Verdict): void {
    const session = this.getById(id);
    if (!session) return;
    session.verdict = verdict;
    this.save(session);
  }

  appendEvent(id: string, event: SessionEvent): void {
    const session = this.getById(id);
    if (!session) return;
    session.events.push(event);
    this.save(session);
  }

  saveStageMetadata(id: string, metadata: StageMetadata): void {
    const session = this.getById(id);
    if (!session) return;
    session.stageMetadata.push(metadata);
    this.save(session);
  }

  saveError(id: string, error: SessionError): void {
    const session = this.getById(id);
    if (!session) return;
    session.error = error;
    session.status = 'ERROR';
    this.save(session);
  }

  private save(session: Session): void {
    this.db.prepare('UPDATE sessions SET data = ? WHERE id = ?').run(
      JSON.stringify(session),
      session.id,
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test agent-backend -- --testPathPattern=session.repository`
Expected: PASS.

- [ ] **Step 5: Create the DTO**

`apps/agent-backend/src/session/dto/create-session.dto.ts`:
```typescript
import { IsString, IsUrl, IsNotEmpty, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LlmConfigDto {
  @IsUrl({}, { message: 'baseUrl must be a valid URL' })
  baseUrl!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;
}

class SearchConfigDto {
  @IsIn(['firecrawl', 'brave'])
  provider!: 'firecrawl' | 'brave';

  @IsString()
  @IsNotEmpty()
  apiKey!: string;
}

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ValidateNested()
  @Type(() => LlmConfigDto)
  llmConfig!: LlmConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SearchConfigDto)
  searchConfig?: SearchConfigDto;
}
```

- [ ] **Step 6: Create SessionController**

`apps/agent-backend/src/session/session.controller.ts`:
```typescript
import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, ConflictException, NotFoundException } from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { v4 as uuidv4 } from 'uuid';
import { Session, CreateSessionResponse, SessionListItem } from '@consensus-lab/shared-types';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionRepo: SessionRepository) {}

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

    // Orchestration is triggered separately — the controller returns immediately
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

  @Post(':id/cancel')
  cancelSession(@Param('id') id: string): { status: string } {
    const session = this.sessionRepo.getById(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (['COMPLETE', 'ERROR', 'CANCELLED'].includes(session.status)) {
      throw new ConflictException(`Session is already in terminal state: ${session.status}`);
    }
    this.sessionRepo.updateStatus(id, 'CANCELLED');
    return { status: 'CANCELLED' };
  }
}
```

- [ ] **Step 7: Create SessionModule**

`apps/agent-backend/src/session/session.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';

@Module({
  controllers: [SessionController],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/agent-backend/src/session/
git commit -m "feat(backend): add SessionModule with SQLite persistence and REST endpoints"
```

---

## Task 7: Backend — ResearchModule

Three-layer research pipeline: search -> extraction -> packet building.

**Files:**
- Create: `apps/agent-backend/src/research/search-provider.service.ts`
- Create: `apps/agent-backend/src/research/research-extraction.service.ts`
- Create: `apps/agent-backend/src/research/packet-builder.service.ts`
- Create: `apps/agent-backend/src/research/research.service.ts`
- Create: `apps/agent-backend/src/research/research.service.spec.ts`
- Create: `apps/agent-backend/src/research/research.module.ts`

- [ ] **Step 1: Create SearchProviderService**

`apps/agent-backend/src/research/search-provider.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SearchConfig } from '@consensus-lab/shared-types';

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
}

@Injectable()
export class SearchProviderService {
  private readonly logger = new Logger(SearchProviderService.name);

  async search(query: string, config: SearchConfig): Promise<RawSearchResult[]> {
    if (config.provider === 'brave') {
      return this.searchBrave(query, config.apiKey);
    }
    if (config.provider === 'firecrawl') {
      return this.searchFirecrawl(query, config.apiKey);
    }
    return [];
  }

  private async searchBrave(query: string, apiKey: string): Promise<RawSearchResult[]> {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
    const response = await fetch(url, {
      headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    });
    if (!response.ok) {
      this.logger.warn(`Brave search failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    return (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  }

  private async searchFirecrawl(query: string, apiKey: string): Promise<RawSearchResult[]> {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, limit: 10 }),
    });
    if (!response.ok) {
      this.logger.warn(`Firecrawl search failed: ${response.status}`);
      return [];
    }
    const data = (await response.json()) as { data?: Array<{ title?: string; url: string; description?: string }> };
    return (data.data ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url,
      snippet: r.description ?? '',
    }));
  }
}
```

- [ ] **Step 2: Create ResearchExtractionService**

`apps/agent-backend/src/research/research-extraction.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { LlmService, LlmRequest } from '../llm/llm.service';
import { LlmConfig, ResearchClaim } from '@consensus-lab/shared-types';
import { RawSearchResult } from './search-provider.service';

@Injectable()
export class ResearchExtractionService {
  constructor(private readonly llm: LlmService) {}

  async extractClaims(
    question: string,
    searchResults: RawSearchResult[],
    config: LlmConfig,
  ): Promise<ResearchClaim[]> {
    const sourceSummary = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
      .join('\n\n');

    const request: LlmRequest = {
      system: `You are a research analyst. Extract structured claims from the provided search results about the given question.

For each claim, provide:
- id: a unique short identifier like "claim-1"
- option: which technology/option the claim is about
- criterion: what evaluation criterion it addresses (e.g. "performance", "ecosystem", "hiring")
- claim: the factual claim itself
- supportLevel: "strong", "moderate", or "weak" based on evidence quality
- sourceRefs: array of source indices like ["src-1", "src-2"]

Return a JSON array of claims.`,
      user: `Question: ${question}\n\nSearch Results:\n${sourceSummary}`,
      temperature: 0.3,
      metadata: { stage: 'research-extraction' },
    };

    const response = await this.llm.completeJson<ResearchClaim[]>(config, request);
    return response.result;
  }
}
```

- [ ] **Step 3: Create PacketBuilderService**

`apps/agent-backend/src/research/packet-builder.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { LlmService, LlmRequest } from '../llm/llm.service';
import { LlmConfig, ResearchPacket, ResearchClaim, Source } from '@consensus-lab/shared-types';
import { RawSearchResult } from './search-provider.service';

@Injectable()
export class PacketBuilderService {
  constructor(private readonly llm: LlmService) {}

  async buildPacket(
    question: string,
    claims: ResearchClaim[],
    rawResults: RawSearchResult[],
    config: LlmConfig,
  ): Promise<ResearchPacket> {
    const sources: Source[] = rawResults.map((r, i) => ({
      id: `src-${i + 1}`,
      title: r.title,
      url: r.url,
      type: this.inferSourceType(r.url),
    }));

    const request: LlmRequest = {
      system: `You are a research packet builder. Given a question and extracted claims, produce a structured research packet.

Return JSON with this exact shape:
{
  "question": "the original question",
  "options": ["Option A", "Option B", ...],
  "evaluationCriteria": ["criterion1", "criterion2", ...],
  "optionSummaries": {
    "Option A": { "pros": [...], "cons": [...], "evidenceClaimIds": [...], "confidence": "high"|"medium"|"low" },
    ...
  },
  "gaps": ["gap1", "gap2", ...]
}`,
      user: `Question: ${question}\n\nClaims:\n${JSON.stringify(claims, null, 2)}`,
      temperature: 0.3,
      metadata: { stage: 'packet-building' },
    };

    const response = await this.llm.completeJson<Omit<ResearchPacket, 'claims' | 'webSources'>>(config, request);

    return {
      ...response.result,
      claims,
      webSources: sources,
    };
  }

  async buildPacketFromKnowledge(question: string, config: LlmConfig): Promise<ResearchPacket> {
    const request: LlmRequest = {
      system: `You are a research analyst. Given an engineering question, produce a comprehensive research packet using your training knowledge.

Return JSON with this exact shape:
{
  "question": "the original question",
  "options": ["Option A", "Option B", ...],
  "evaluationCriteria": ["criterion1", "criterion2", ...],
  "claims": [
    { "id": "claim-1", "option": "...", "criterion": "...", "claim": "...", "supportLevel": "strong"|"moderate"|"weak", "sourceRefs": [] }
  ],
  "optionSummaries": {
    "Option A": { "pros": [...], "cons": [...], "evidenceClaimIds": [...], "confidence": "high"|"medium"|"low" },
    ...
  },
  "webSources": [],
  "gaps": ["gap1", "gap2", ...]
}

Be thorough. Include at least 3 options, 5+ evaluation criteria, and 10+ claims.`,
      user: question,
      temperature: 0.5,
      metadata: { stage: 'packet-building-knowledge' },
    };

    return (await this.llm.completeJson<ResearchPacket>(config, request)).result;
  }

  private inferSourceType(url: string): Source['type'] {
    if (url.includes('github.com')) return 'docs';
    if (url.includes('benchmark') || url.includes('perf')) return 'benchmark';
    if (url.includes('reddit.com') || url.includes('stackoverflow')) return 'forum';
    if (url.includes('blog') || url.includes('medium.com') || url.includes('dev.to')) return 'blog';
    return 'other';
  }
}
```

- [ ] **Step 4: Create ResearchService (orchestrates the 3 layers)**

`apps/agent-backend/src/research/research.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { LlmConfig, SearchConfig, ResearchPacket } from '@consensus-lab/shared-types';
import { SearchProviderService } from './search-provider.service';
import { ResearchExtractionService } from './research-extraction.service';
import { PacketBuilderService } from './packet-builder.service';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly searchProvider: SearchProviderService,
    private readonly extraction: ResearchExtractionService,
    private readonly packetBuilder: PacketBuilderService,
  ) {}

  async research(
    question: string,
    llmConfig: LlmConfig,
    searchConfig?: SearchConfig,
  ): Promise<ResearchPacket> {
    if (!searchConfig) {
      this.logger.log('Search disabled — building packet from LLM knowledge');
      return this.packetBuilder.buildPacketFromKnowledge(question, llmConfig);
    }

    this.logger.log(`Searching via ${searchConfig.provider}...`);
    const rawResults = await this.searchProvider.search(question, searchConfig);

    if (rawResults.length === 0) {
      this.logger.warn('No search results — falling back to LLM knowledge');
      return this.packetBuilder.buildPacketFromKnowledge(question, llmConfig);
    }

    this.logger.log(`Extracting claims from ${rawResults.length} results...`);
    const claims = await this.extraction.extractClaims(question, rawResults, llmConfig);

    this.logger.log(`Building packet from ${claims.length} claims...`);
    return this.packetBuilder.buildPacket(question, claims, rawResults, llmConfig);
  }
}
```

- [ ] **Step 5: Create ResearchModule**

`apps/agent-backend/src/research/research.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ResearchService } from './research.service';
import { SearchProviderService } from './search-provider.service';
import { ResearchExtractionService } from './research-extraction.service';
import { PacketBuilderService } from './packet-builder.service';

@Module({
  imports: [LlmModule],
  providers: [ResearchService, SearchProviderService, ResearchExtractionService, PacketBuilderService],
  exports: [ResearchService],
})
export class ResearchModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/agent-backend/src/research/
git commit -m "feat(backend): add ResearchModule with search, extraction, and packet building"
```

---

## Task 8: Backend — AgentsModule

Config-driven specialist agents with analyze and rebut methods.

**Files:**
- Create: `apps/agent-backend/src/agents/agent-configs.ts`
- Create: `apps/agent-backend/src/agents/agent-runner.service.ts`
- Create: `apps/agent-backend/src/agents/agents.module.ts`

- [ ] **Step 1: Create agent configs**

`apps/agent-backend/src/agents/agent-configs.ts`:
```typescript
import { AgentConfig } from '@consensus-lab/shared-types';

export const SPECIALIST_AGENTS: AgentConfig[] = [
  {
    agentId: 'pragmatist',
    displayName: 'The Pragmatist',
    role: 'pragmatist',
    lens: 'speed, maintainability, hiring, time to market',
    systemPrompt: `You are The Pragmatist — a senior engineering lead who optimizes for practical outcomes.

Your evaluation lens: speed to market, maintainability, hiring pool, ecosystem maturity, and time-to-value.

You favor technologies that are battle-tested, well-documented, and easy to hire for. You are skeptical of bleeding-edge tools unless the tradeoff clearly pays off.

When analyzing a research packet, you MUST return valid JSON with this exact shape:
{
  "agentId": "pragmatist",
  "role": "pragmatist",
  "round": 1,
  "recommendation": "Your recommended option",
  "topReasons": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2"],
  "confidence": 75,
  "strongestCounterargument": "The best argument against your recommendation",
  "evidenceRefs": [{"sourceId": "src-1", "claimId": "claim-1"}]
}`,
  },
  {
    agentId: 'performance',
    displayName: 'The Performance Engineer',
    role: 'performance',
    lens: 'runtime performance, bundle size, scalability, architecture',
    systemPrompt: `You are The Performance Engineer — a systems-minded architect who optimizes for technical excellence.

Your evaluation lens: runtime performance, bundle size, memory efficiency, scalability, and architectural soundness.

You favor technologies with strong performance characteristics and clean architectural patterns. You care about benchmarks, profiling data, and real-world performance under load.

When analyzing a research packet, you MUST return valid JSON with this exact shape:
{
  "agentId": "performance",
  "role": "performance",
  "round": 1,
  "recommendation": "Your recommended option",
  "topReasons": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2"],
  "confidence": 75,
  "strongestCounterargument": "The best argument against your recommendation",
  "evidenceRefs": [{"sourceId": "src-1", "claimId": "claim-1"}]
}`,
  },
  {
    agentId: 'dx-advocate',
    displayName: 'The DX Advocate',
    role: 'dx',
    lens: 'developer experience, onboarding, ecosystem quality, debugging',
    systemPrompt: `You are The DX Advocate — a developer experience champion who optimizes for team happiness and productivity.

Your evaluation lens: developer experience, learning curve, onboarding speed, tooling quality, debugging experience, and documentation.

You favor technologies that make developers productive and happy. You care about IDE support, error messages, documentation quality, and community health.

When analyzing a research packet, you MUST return valid JSON with this exact shape:
{
  "agentId": "dx-advocate",
  "role": "dx",
  "round": 1,
  "recommendation": "Your recommended option",
  "topReasons": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2"],
  "confidence": 75,
  "strongestCounterargument": "The best argument against your recommendation",
  "evidenceRefs": [{"sourceId": "src-1", "claimId": "claim-1"}]
}`,
  },
  {
    agentId: 'skeptic',
    displayName: 'The Skeptic',
    role: 'skeptic',
    lens: 'weak evidence, stale assumptions, hidden tradeoffs, hype vs reality',
    systemPrompt: `You are The Skeptic — a critical thinker who challenges assumptions and looks for hidden tradeoffs.

Your evaluation lens: evidence quality, recency of data, hidden costs, unstated assumptions, hype-vs-reality, and long-term risks.

You challenge the research packet itself. You look for weak evidence, stale benchmarks, popularity bias, and conclusions that don't follow from the data. You may recommend differently from the others.

When analyzing a research packet, you MUST return valid JSON with this exact shape:
{
  "agentId": "skeptic",
  "role": "skeptic",
  "round": 1,
  "recommendation": "Your recommended option",
  "topReasons": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2"],
  "confidence": 75,
  "strongestCounterargument": "The best argument against your recommendation",
  "evidenceRefs": [{"sourceId": "src-1", "claimId": "claim-1"}]
}`,
  },
];
```

- [ ] **Step 2: Create AgentRunnerService**

`apps/agent-backend/src/agents/agent-runner.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { LlmService, LlmRequest } from '../llm/llm.service';
import {
  AgentConfig,
  LlmConfig,
  ResearchPacket,
  AgentAnalysis,
  ChallengePrompt,
  RebuttalResponse,
} from '@consensus-lab/shared-types';

@Injectable()
export class AgentRunnerService {
  constructor(private readonly llm: LlmService) {}

  async analyze(
    agentConfig: AgentConfig,
    packet: ResearchPacket,
    llmConfig: LlmConfig,
  ): Promise<AgentAnalysis> {
    const request: LlmRequest = {
      system: agentConfig.systemPrompt,
      user: `Analyze this research packet and provide your recommendation.\n\n${JSON.stringify(packet, null, 2)}`,
      temperature: 0.7,
      metadata: { stage: 'agent-analysis', agentId: agentConfig.agentId },
    };

    const response = await this.llm.completeJson<AgentAnalysis>(llmConfig, request);
    return {
      ...response.result,
      agentId: agentConfig.agentId,
      role: agentConfig.role,
      round: 1,
    };
  }

  async rebut(
    agentConfig: AgentConfig,
    packet: ResearchPacket,
    challenge: ChallengePrompt,
    originalAnalysis: AgentAnalysis,
    llmConfig: LlmConfig,
  ): Promise<RebuttalResponse> {
    const request: LlmRequest = {
      system: `${agentConfig.systemPrompt}

You previously recommended: ${originalAnalysis.recommendation} (confidence: ${originalAnalysis.confidence}/100).

You are now being challenged by the Judge. You MUST choose one action:
- "defend": Stand by your recommendation and explain why the challenge doesn't change your view
- "revise": Update your recommendation based on the challenge
- "concede": Acknowledge the challenge is correct and withdraw your recommendation

Return valid JSON:
{
  "agentId": "${agentConfig.agentId}",
  "round": 2,
  "action": "defend" | "revise" | "concede",
  "response": "Your detailed response to the challenge",
  "revisedRecommendation": "Only if action is revise",
  "revisedConfidence": 50
}`,
      user: `Challenge from the Judge:\n${challenge.prompt}\n\nOriginal research packet:\n${JSON.stringify(packet, null, 2)}`,
      temperature: 0.7,
      metadata: { stage: 'agent-rebuttal', agentId: agentConfig.agentId },
    };

    const response = await this.llm.completeJson<RebuttalResponse>(llmConfig, request);
    return {
      ...response.result,
      agentId: agentConfig.agentId,
      round: 2,
    };
  }
}
```

- [ ] **Step 3: Create AgentsModule**

`apps/agent-backend/src/agents/agents.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AgentRunnerService } from './agent-runner.service';

@Module({
  imports: [LlmModule],
  providers: [AgentRunnerService],
  exports: [AgentRunnerService],
})
export class AgentsModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/agent-backend/src/agents/
git commit -m "feat(backend): add AgentsModule with config-driven specialist agents"
```

---

## Task 9: Backend — JudgeModule

Disagreement detection, challenge generation, and verdict synthesis.

**Files:**
- Create: `apps/agent-backend/src/judge/judge.service.ts`
- Create: `apps/agent-backend/src/judge/judge.module.ts`

- [ ] **Step 1: Create JudgeService**

`apps/agent-backend/src/judge/judge.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { LlmService, LlmRequest } from '../llm/llm.service';
import {
  LlmConfig,
  ResearchPacket,
  AgentAnalysis,
  Disagreement,
  ChallengePrompt,
  RebuttalResponse,
  Verdict,
} from '@consensus-lab/shared-types';

interface JudgeReviewResult {
  disagreements: Disagreement[];
  challengePrompts: ChallengePrompt[];
}

@Injectable()
export class JudgeService {
  constructor(private readonly llm: LlmService) {}

  async review(
    packet: ResearchPacket,
    analyses: AgentAnalysis[],
    llmConfig: LlmConfig,
  ): Promise<JudgeReviewResult> {
    const request: LlmRequest = {
      system: `You are the Judge — an impartial arbitrator evaluating specialist agent analyses.

Your job:
1. Compare all agent recommendations
2. Identify disagreements (where agents conflict)
3. Score evidence quality
4. Generate targeted challenge prompts for agents whose positions need defending

Return valid JSON:
{
  "disagreements": [
    { "topic": "...", "agentsInConflict": ["agent1", "agent2"], "summary": "...", "severity": "low"|"medium"|"high" }
  ],
  "challengePrompts": [
    { "id": "challenge-1", "round": 1, "targetAgentIds": ["agent1"], "topic": "...", "prompt": "Specific challenge question..." }
  ]
}

Make challenge prompts specific and targeted. Do not ask generic questions. Reference specific claims and contradictions.`,
      user: `Research Packet:\n${JSON.stringify(packet, null, 2)}\n\nAgent Analyses:\n${JSON.stringify(analyses, null, 2)}`,
      temperature: 0.5,
      metadata: { stage: 'judge-review' },
    };

    return (await this.llm.completeJson<JudgeReviewResult>(llmConfig, request)).result;
  }

  async synthesize(
    packet: ResearchPacket,
    analyses: AgentAnalysis[],
    rebuttals: RebuttalResponse[],
    disagreements: Disagreement[],
    llmConfig: LlmConfig,
  ): Promise<Verdict> {
    const request: LlmRequest = {
      system: `You are the Judge delivering a final verdict after a deliberation round.

You have seen:
- The original research packet
- Initial agent analyses
- Disagreements you identified
- Agent rebuttals (defend/revise/concede)

Now synthesize a final verdict. Consider:
- Which arguments held up under challenge?
- Which agents conceded or revised?
- What does the evidence best support?

Return valid JSON:
{
  "decisionType": "single_winner" | "contextual" | "tie",
  "primaryRecommendation": "The recommended option",
  "ranking": ["1st", "2nd", "3rd"],
  "reasoning": "Why this recommendation won",
  "tradeoffs": ["tradeoff 1", "tradeoff 2"],
  "whenAlternativeIsBetter": ["scenario where another option wins"],
  "evidenceUsed": [{"sourceId": "src-1", "claimId": "claim-1"}],
  "finalConfidence": 82
}

Be nuanced. If the answer is genuinely context-dependent, say so.`,
      user: `Research Packet:\n${JSON.stringify(packet, null, 2)}\n\nAnalyses:\n${JSON.stringify(analyses, null, 2)}\n\nDisagreements:\n${JSON.stringify(disagreements, null, 2)}\n\nRebuttals:\n${JSON.stringify(rebuttals, null, 2)}`,
      temperature: 0.5,
      metadata: { stage: 'judge-verdict' },
    };

    return (await this.llm.completeJson<Verdict>(llmConfig, request)).result;
  }
}
```

- [ ] **Step 2: Create JudgeModule**

`apps/agent-backend/src/judge/judge.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { JudgeService } from './judge.service';

@Module({
  imports: [LlmModule],
  providers: [JudgeService],
  exports: [JudgeService],
})
export class JudgeModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/agent-backend/src/judge/
git commit -m "feat(backend): add JudgeModule with review and verdict synthesis"
```

---

## Task 10: Backend — OrchestrationModule

The state machine that drives the full pipeline.

**Files:**
- Create: `apps/agent-backend/src/orchestration/orchestration.service.ts`
- Create: `apps/agent-backend/src/orchestration/orchestration.module.ts`

- [ ] **Step 1: Create OrchestrationService**

`apps/agent-backend/src/orchestration/orchestration.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  LlmConfig,
  SearchConfig,
  PipelineState,
  SessionEvent,
  StageMetadata,
} from '@consensus-lab/shared-types';
import { SessionRepository } from '../session/session.repository';
import { EventBusService } from '../events/event-bus.service';
import { ResearchService } from '../research/research.service';
import { AgentRunnerService } from '../agents/agent-runner.service';
import { SPECIALIST_AGENTS } from '../agents/agent-configs';
import { JudgeService } from '../judge/judge.service';
import { runWithConcurrency } from '../util/concurrency';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);
  private readonly cancelledSessions = new Set<string>();

  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly eventBus: EventBusService,
    private readonly researchService: ResearchService,
    private readonly agentRunner: AgentRunnerService,
    private readonly judgeService: JudgeService,
  ) {}

  cancelSession(sessionId: string): void {
    this.cancelledSessions.add(sessionId);
  }

  async run(sessionId: string, llmConfig: LlmConfig, searchConfig?: SearchConfig): Promise<void> {
    try {
      this.emitEvent(sessionId, 'question_received');

      // Stage: RESEARCHING
      if (this.isCancelled(sessionId)) return this.finishCancelled(sessionId);
      await this.runStage(sessionId, 'RESEARCHING', async () => {
        this.emitEvent(sessionId, 'research_started');
        const packet = await this.researchService.research(
          this.sessionRepo.getById(sessionId)!.question,
          llmConfig,
          searchConfig,
        );
        this.sessionRepo.saveResearchPacket(sessionId, packet);
        this.emitEvent(sessionId, 'packet_completed');
      }, llmConfig);

      // Stage: AGENTS_ANALYZING
      if (this.isCancelled(sessionId)) return this.finishCancelled(sessionId);
      await this.runStage(sessionId, 'AGENTS_ANALYZING', async () => {
        const session = this.sessionRepo.getById(sessionId)!;
        const analyses = await runWithConcurrency(
          SPECIALIST_AGENTS.map((config) => async () => {
            this.emitEvent(sessionId, 'agent_started', config.agentId);
            const analysis = await this.agentRunner.analyze(config, session.researchPacket!, llmConfig);
            this.emitEvent(sessionId, 'agent_analysis_completed', config.agentId, { analysis });
            return analysis;
          }),
          4,
        );
        this.sessionRepo.saveAnalyses(sessionId, analyses);
      }, llmConfig);

      // Stage: JUDGE_REVIEWING
      if (this.isCancelled(sessionId)) return this.finishCancelled(sessionId);
      await this.runStage(sessionId, 'JUDGE_REVIEWING', async () => {
        const session = this.sessionRepo.getById(sessionId)!;
        this.emitEvent(sessionId, 'judge_review_started');
        const { disagreements, challengePrompts } = await this.judgeService.review(
          session.researchPacket!,
          session.analyses,
          llmConfig,
        );
        this.sessionRepo.saveDisagreements(sessionId, disagreements);
        this.sessionRepo.saveChallengePrompts(sessionId, challengePrompts);
        for (const d of disagreements) {
          this.emitEvent(sessionId, 'disagreement_found', undefined, { disagreement: d });
        }
        for (const c of challengePrompts) {
          this.emitEvent(sessionId, 'challenge_issued', undefined, { challenge: c });
        }
      }, llmConfig);

      // Stage: REBUTTAL_ROUND
      if (this.isCancelled(sessionId)) return this.finishCancelled(sessionId);
      await this.runStage(sessionId, 'REBUTTAL_ROUND', async () => {
        const session = this.sessionRepo.getById(sessionId)!;
        const challengedAgentIds = new Set(session.challengePrompts.flatMap((c) => c.targetAgentIds));
        const rebuttals = await runWithConcurrency(
          SPECIALIST_AGENTS.filter((a) => challengedAgentIds.has(a.agentId)).map((config) => async () => {
            const challenge = session.challengePrompts.find((c) => c.targetAgentIds.includes(config.agentId))!;
            const originalAnalysis = session.analyses.find((a) => a.agentId === config.agentId)!;
            const rebuttal = await this.agentRunner.rebut(
              config,
              session.researchPacket!,
              challenge,
              originalAnalysis,
              llmConfig,
            );
            this.emitEvent(sessionId, 'rebuttal_completed', config.agentId, { rebuttal });
            return rebuttal;
          }),
          4,
        );
        this.sessionRepo.saveRebuttals(sessionId, rebuttals);
      }, llmConfig);

      // Stage: FINAL_VERDICT
      if (this.isCancelled(sessionId)) return this.finishCancelled(sessionId);
      await this.runStage(sessionId, 'FINAL_VERDICT', async () => {
        const session = this.sessionRepo.getById(sessionId)!;
        const verdict = await this.judgeService.synthesize(
          session.researchPacket!,
          session.analyses,
          session.rebuttals,
          session.disagreements,
          llmConfig,
        );
        this.sessionRepo.saveVerdict(sessionId, verdict);
        this.emitEvent(sessionId, 'verdict_completed');
      }, llmConfig);

      // COMPLETE
      this.sessionRepo.updateStatus(sessionId, 'COMPLETE');
      this.emitStateChanged(sessionId, 'COMPLETE', 'FINAL_VERDICT');
      this.eventBus.emit({
        type: 'session.done',
        sessionId,
        data: { sessionId, finalStatus: 'COMPLETE' },
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Pipeline failed for session ${sessionId}: ${message}`);
      const session = this.sessionRepo.getById(sessionId);
      this.sessionRepo.saveError(sessionId, {
        message,
        stage: session?.status,
        code: 'PIPELINE_ERROR',
      });
      this.emitEvent(sessionId, 'error', undefined, { message });
      this.eventBus.emit({
        type: 'session.done',
        sessionId,
        data: { sessionId, finalStatus: 'ERROR' },
      });
    }
  }

  private async runStage(
    sessionId: string,
    state: PipelineState,
    work: () => Promise<void>,
    llmConfig: LlmConfig,
  ): Promise<void> {
    const previousState = this.sessionRepo.getById(sessionId)!.status;
    this.sessionRepo.updateStatus(sessionId, state);
    this.emitStateChanged(sessionId, state, previousState);

    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    await work();
    const durationMs = Date.now() - startMs;

    const metadata: StageMetadata = {
      stage: state,
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs,
      provider: new URL(llmConfig.baseUrl).hostname,
      model: llmConfig.model,
    };
    this.sessionRepo.saveStageMetadata(sessionId, metadata);
    this.eventBus.emit({
      type: 'session.stage_metadata',
      sessionId,
      data: { stage: state, durationMs, tokenUsage: undefined },
    });
  }

  private isCancelled(sessionId: string): boolean {
    return this.cancelledSessions.has(sessionId);
  }

  private finishCancelled(sessionId: string): void {
    this.cancelledSessions.delete(sessionId);
    this.sessionRepo.updateStatus(sessionId, 'CANCELLED');
    this.eventBus.emit({
      type: 'session.done',
      sessionId,
      data: { sessionId, finalStatus: 'CANCELLED' },
    });
  }

  private emitEvent(
    sessionId: string,
    type: SessionEvent['type'],
    actorId?: string,
    payload?: Record<string, unknown>,
  ): void {
    const event: SessionEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      actorId,
      payload,
    };
    this.sessionRepo.appendEvent(sessionId, event);
    this.eventBus.emit({ type: 'session.event', sessionId, data: event });
  }

  private emitStateChanged(sessionId: string, state: PipelineState, previousState: PipelineState): void {
    this.eventBus.emit({
      type: 'session.state_changed',
      sessionId,
      data: { state, previousState },
    });
  }
}
```

- [ ] **Step 2: Create OrchestrationModule**

`apps/agent-backend/src/orchestration/orchestration.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ResearchModule } from '../research/research.module';
import { AgentsModule } from '../agents/agents.module';
import { JudgeModule } from '../judge/judge.module';
import { SessionModule } from '../session/session.module';
import { OrchestrationService } from './orchestration.service';

@Module({
  imports: [ResearchModule, AgentsModule, JudgeModule, SessionModule],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/agent-backend/src/orchestration/
git commit -m "feat(backend): add OrchestrationModule with full pipeline state machine"
```

---

## Task 11: Backend — Wire Everything Together

Connect all modules into AppModule, update main.ts with CORS and ValidationPipe, wire orchestration into session creation.

**Files:**
- Modify: `apps/agent-backend/src/app/app.module.ts`
- Modify: `apps/agent-backend/src/app/app.controller.ts`
- Modify: `apps/agent-backend/src/main.ts`
- Modify: `apps/agent-backend/src/session/session.controller.ts` — trigger orchestration
- Delete: `apps/agent-backend/src/app/app.service.ts`

- [ ] **Step 1: Update AppModule to import all feature modules**

`apps/agent-backend/src/app/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LlmModule } from '../llm/llm.module';
import { EventsModule } from '../events/events.module';
import { SessionModule } from '../session/session.module';
import { ResearchModule } from '../research/research.module';
import { AgentsModule } from '../agents/agents.module';
import { JudgeModule } from '../judge/judge.module';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [
    EventsModule,
    LlmModule,
    SessionModule,
    ResearchModule,
    AgentsModule,
    JudgeModule,
    OrchestrationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 2: Update AppController to be a health endpoint**

`apps/agent-backend/src/app/app.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

- [ ] **Step 3: Delete app.service.ts**

Delete `apps/agent-backend/src/app/app.service.ts` — no longer needed.

- [ ] **Step 4: Update main.ts with CORS and ValidationPipe**

`apps/agent-backend/src/main.ts`:
```typescript
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
```

- [ ] **Step 5: Update SessionController to trigger orchestration**

Add to `apps/agent-backend/src/session/session.controller.ts` — inject OrchestrationService and fire the pipeline asynchronously after creating the session:

In the constructor, add `private readonly orchestration: OrchestrationService` (import from `'../orchestration/orchestration.service'`).

In the `createSession` method, after `this.sessionRepo.create(session)`, add:
```typescript
// Fire and forget — orchestration runs in the background
this.orchestration.run(session.id, dto.llmConfig, dto.searchConfig);
```

In the `cancelSession` method, before updating the repo, add:
```typescript
this.orchestration.cancelSession(id);
```

Update `SessionModule` to import `OrchestrationModule`:
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [forwardRef(() => OrchestrationModule)],
  controllers: [SessionController],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}
```

And update `OrchestrationModule` to use `forwardRef` for SessionModule:
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { ResearchModule } from '../research/research.module';
import { AgentsModule } from '../agents/agents.module';
import { JudgeModule } from '../judge/judge.module';
import { SessionModule } from '../session/session.module';
import { OrchestrationService } from './orchestration.service';

@Module({
  imports: [ResearchModule, AgentsModule, JudgeModule, forwardRef(() => SessionModule)],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
```

- [ ] **Step 6: Verify backend builds**

Run: `npx nx build agent-backend`
Expected: Successful build.

- [ ] **Step 7: Commit**

```bash
git add apps/agent-backend/src/
git commit -m "feat(backend): wire all modules together, add CORS, ValidationPipe, health endpoint"
```

---

## Task 12: Frontend — Design System + Global Styles

Set up the SCSS design tokens, fonts, and ambient background.

**Files:**
- Modify: `apps/agent-frontend/src/styles.css` (rename to .scss or use CSS custom properties)
- Modify: `apps/agent-frontend/src/index.html` — add font imports

- [ ] **Step 1: Add font links to index.html**

Add to `<head>` in `apps/agent-frontend/src/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Replace styles.css with design token system**

`apps/agent-frontend/src/styles.css`:
```css
/* === Consensus Lab Design Tokens === */
:root {
  /* Palette */
  --bg-deep: #060816;
  --surface-1: #0b1220;
  --surface-2: #101a2b;
  --glass: rgba(17, 25, 40, 0.72);
  --border: rgba(130, 170, 255, 0.14);
  --text-primary: #e8f0ff;
  --text-secondary: #9eb0d0;
  --text-muted: #6f7f9e;

  /* Semantic accents */
  --accent-active: #4cc9f0;
  --accent-judge: #9b5cff;
  --accent-success: #36d399;
  --accent-warning: #ffb84d;
  --accent-error: #ff6b81;

  /* Agent accents */
  --agent-pragmatist: #4c8cf0;
  --agent-performance: #36d399;
  --agent-dx: #ffb84d;
  --agent-skeptic: #f06c8c;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;

  /* Radii */
  --radius-panel: 24px;
  --radius-card: 18px;
  --radius-chip: 999px;

  /* Typography */
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* === Global Reset === */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  font-family: var(--font-body);
  background: var(--bg-deep);
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* === Ambient Background === */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(76, 201, 240, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(155, 92, 255, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(54, 211, 153, 0.02) 0%, transparent 50%);
}

/* === Faint Grid === */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(rgba(130, 170, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(130, 170, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* === Glass Panel Mixin (applied via class) === */
.glass-panel {
  background: var(--glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-5);
}

/* === Typography Utilities === */
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
}

.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
}

/* === Scrollbar === */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(130, 170, 255, 0.15);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(130, 170, 255, 0.25);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/agent-frontend/src/styles.css apps/agent-frontend/src/index.html
git commit -m "feat(frontend): add design token system, fonts, ambient background"
```

---

## Task 13: Frontend — Services

Create all Angular services: settings, HTTP session, SSE, and reactive state.

**Files:**
- Create: `apps/agent-frontend/src/app/services/settings.service.ts`
- Create: `apps/agent-frontend/src/app/services/session.service.ts`
- Create: `apps/agent-frontend/src/app/services/sse.service.ts`
- Create: `apps/agent-frontend/src/app/services/session-state.service.ts`
- Modify: `apps/agent-frontend/src/app/app.config.ts` — add `provideHttpClient`

- [ ] **Step 1: Update app.config.ts to add HttpClient**

`apps/agent-frontend/src/app/app.config.ts`:
```typescript
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(),
  ],
};
```

- [ ] **Step 2: Create SettingsService**

`apps/agent-frontend/src/app/services/settings.service.ts`:
```typescript
import { Injectable } from '@angular/core';
import { LlmConfig, SearchConfig } from '@consensus-lab/shared-types';

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
```

- [ ] **Step 3: Create SessionService (HTTP)**

`apps/agent-frontend/src/app/services/session.service.ts`:
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  SessionListItem,
  Session,
} from '@consensus-lab/shared-types';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  create(request: CreateSessionRequest): Observable<CreateSessionResponse> {
    return this.http.post<CreateSessionResponse>(`${this.baseUrl}/sessions`, request);
  }

  list(): Observable<SessionListItem[]> {
    return this.http.get<SessionListItem[]>(`${this.baseUrl}/sessions`);
  }

  get(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/sessions/${id}`);
  }

  cancel(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/sessions/${id}/cancel`, {});
  }
}
```

- [ ] **Step 4: Create SseService**

`apps/agent-frontend/src/app/services/sse.service.ts`:
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SseStateChanged, SseStageMetadata, SseDone, SseHeartbeat, SessionEvent } from '@consensus-lab/shared-types';

export type SseMessage =
  | { type: 'session.event'; data: SessionEvent }
  | { type: 'session.state_changed'; data: SseStateChanged }
  | { type: 'session.stage_metadata'; data: SseStageMetadata }
  | { type: 'session.heartbeat'; data: SseHeartbeat }
  | { type: 'session.done'; data: SseDone };

@Injectable({ providedIn: 'root' })
export class SseService {
  connect(sessionId: string): Observable<SseMessage> {
    return new Observable((subscriber) => {
      const url = `http://localhost:3000/api/sessions/${sessionId}/events`;
      const eventSource = new EventSource(url);

      const eventTypes = [
        'session.event',
        'session.state_changed',
        'session.stage_metadata',
        'session.heartbeat',
        'session.done',
      ] as const;

      for (const type of eventTypes) {
        eventSource.addEventListener(type, (event: MessageEvent) => {
          subscriber.next({ type, data: JSON.parse(event.data) } as SseMessage);
          if (type === 'session.done') {
            eventSource.close();
            subscriber.complete();
          }
        });
      }

      eventSource.onerror = () => {
        eventSource.close();
        subscriber.complete();
      };

      return () => eventSource.close();
    });
  }
}
```

- [ ] **Step 5: Create SessionStateService**

`apps/agent-frontend/src/app/services/session-state.service.ts`:
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Session,
  PipelineState,
  SessionEvent,
  StageMetadata,
  AgentAnalysis,
  Disagreement,
  ChallengePrompt,
  RebuttalResponse,
  Verdict,
  ResearchPacket,
  Source,
  ResearchClaim,
} from '@consensus-lab/shared-types';
import { SseMessage } from './sse.service';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  private readonly sessionSubject = new BehaviorSubject<Session | null>(null);
  private readonly connectedSubject = new BehaviorSubject<boolean>(false);

  readonly session$ = this.sessionSubject.asObservable();
  readonly connected$ = this.connectedSubject.asObservable();

  get currentSession(): Session | null {
    return this.sessionSubject.value;
  }

  initSession(session: Partial<Session> & { id: string; question: string; createdAt: string }): void {
    this.sessionSubject.next({
      status: 'IDLE',
      analyses: [],
      disagreements: [],
      challengePrompts: [],
      rebuttals: [],
      events: [],
      stageMetadata: [],
      ...session,
    });
  }

  setConnected(connected: boolean): void {
    this.connectedSubject.next(connected);
  }

  handleSseMessage(message: SseMessage): void {
    const session = this.currentSession;
    if (!session) return;

    switch (message.type) {
      case 'session.state_changed':
        this.update({ status: message.data.state });
        break;
      case 'session.event':
        this.handleSessionEvent(message.data);
        break;
      case 'session.stage_metadata':
        this.update({
          stageMetadata: [...session.stageMetadata, message.data as unknown as StageMetadata],
        });
        break;
      case 'session.done':
        this.update({ status: message.data.finalStatus as PipelineState });
        this.setConnected(false);
        break;
      case 'session.heartbeat':
        break;
    }
  }

  private handleSessionEvent(event: SessionEvent): void {
    const session = this.currentSession;
    if (!session) return;

    const events = [...session.events, event];
    const updates: Partial<Session> = { events };

    if (event.type === 'agent_analysis_completed' && event.payload?.['analysis']) {
      updates.analyses = [...session.analyses, event.payload['analysis'] as AgentAnalysis];
    }
    if (event.type === 'disagreement_found' && event.payload?.['disagreement']) {
      updates.disagreements = [...session.disagreements, event.payload['disagreement'] as Disagreement];
    }
    if (event.type === 'challenge_issued' && event.payload?.['challenge']) {
      updates.challengePrompts = [...session.challengePrompts, event.payload['challenge'] as ChallengePrompt];
    }
    if (event.type === 'rebuttal_completed' && event.payload?.['rebuttal']) {
      updates.rebuttals = [...session.rebuttals, event.payload['rebuttal'] as RebuttalResponse];
    }
    if (event.type === 'verdict_completed' && event.payload?.['verdict']) {
      updates.verdict = event.payload['verdict'] as Verdict;
    }

    this.update(updates);
  }

  loadSession(session: Session): void {
    this.sessionSubject.next(session);
  }

  clear(): void {
    this.sessionSubject.next(null);
    this.connectedSubject.next(false);
  }

  private update(partial: Partial<Session>): void {
    const current = this.currentSession;
    if (current) {
      this.sessionSubject.next({ ...current, ...partial });
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/agent-frontend/src/app/services/ apps/agent-frontend/src/app/app.config.ts
git commit -m "feat(frontend): add services (settings, session HTTP, SSE, reactive state)"
```

---

## Task 14: Frontend — App Shell + Control Bar + Question Input

The top-level app shell with control bar and landing view question input.

**Files:**
- Modify: `apps/agent-frontend/src/app/app.ts`
- Modify: `apps/agent-frontend/src/app/app.html`
- Modify: `apps/agent-frontend/src/app/app.css`
- Create: `apps/agent-frontend/src/app/components/control-bar/control-bar.ts`
- Create: `apps/agent-frontend/src/app/components/control-bar/control-bar.html`
- Create: `apps/agent-frontend/src/app/components/control-bar/control-bar.css`
- Create: `apps/agent-frontend/src/app/components/question-input/question-input.ts`
- Create: `apps/agent-frontend/src/app/components/question-input/question-input.html`
- Create: `apps/agent-frontend/src/app/components/question-input/question-input.css`
- Create: `apps/agent-frontend/src/app/components/settings-dialog/settings-dialog.ts`
- Create: `apps/agent-frontend/src/app/components/settings-dialog/settings-dialog.html`
- Create: `apps/agent-frontend/src/app/components/settings-dialog/settings-dialog.css`

This is a large task. Implement the app shell that switches between landing view and deliberation view based on session state, the control bar with product name / status / timer, the question input with example chips, and the settings dialog for LLM + search config.

- [ ] **Step 1: Implement all component files listed above**

The app shell uses `@if (sessionState.currentSession)` to toggle between landing view and deliberation view. Control bar shows `Consensus Lab` branding, session status chip, and settings button. Question input has a text area, example prompt chips, and submit button. Settings dialog manages LLM config (baseUrl, apiKey, model) and search toggle.

Follow the design tokens from `styles.css`. Use glass-panel class for outer containers. Use the palette and typography from the PRD.

- [ ] **Step 2: Delete nx-welcome.ts**

Remove `apps/agent-frontend/src/app/nx-welcome.ts`.

- [ ] **Step 3: Verify the frontend builds**

Run: `npx nx build agent-frontend`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add apps/agent-frontend/src/app/
git commit -m "feat(frontend): add app shell, control bar, question input, settings dialog"
```

---

## Task 15: Frontend — Deliberation View + Column 1 (Pipeline Status + Telemetry)

The 4-column grid shell and the mission launcher column.

**Files:**
- Create: `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.ts`
- Create: `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.html`
- Create: `apps/agent-frontend/src/app/components/deliberation-view/deliberation-view.css`
- Create: `apps/agent-frontend/src/app/components/pipeline-status/pipeline-status.ts`
- Create: `apps/agent-frontend/src/app/components/pipeline-status/pipeline-status.html`
- Create: `apps/agent-frontend/src/app/components/pipeline-status/pipeline-status.css`
- Create: `apps/agent-frontend/src/app/components/telemetry-strip/telemetry-strip.ts`
- Create: `apps/agent-frontend/src/app/components/telemetry-strip/telemetry-strip.html`
- Create: `apps/agent-frontend/src/app/components/telemetry-strip/telemetry-strip.css`

- [ ] **Step 1: Implement deliberation-view as CSS Grid with 4 columns**

Use `grid-template-columns: 0.9fr 1.2fr 1.2fr 1.1fr` for desktop. Each column is a `glass-panel`. Implement focus mode: the active column gets full opacity, others dim to `opacity: 0.6` based on current `PipelineState`.

- [ ] **Step 2: Implement pipeline-status as vertical rail**

Show each pipeline stage as a step in a vertical progress rail. Active stage pulses cyan. Completed stages show emerald checkmark. Stage timing in JetBrains Mono.

- [ ] **Step 3: Implement telemetry-strip**

Display model name, source count, elapsed time (live counter), total tokens, estimated cost. All in mono font.

- [ ] **Step 4: Verify build**

Run: `npx nx build agent-frontend`
Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add apps/agent-frontend/src/app/components/deliberation-view/ apps/agent-frontend/src/app/components/pipeline-status/ apps/agent-frontend/src/app/components/telemetry-strip/
git commit -m "feat(frontend): add deliberation view grid, pipeline status rail, telemetry strip"
```

---

## Task 16: Frontend — Column 2 (Research Packet Panel)

Source cards, claim cards, and gaps display.

**Files:**
- Create: `apps/agent-frontend/src/app/components/research-packet-panel/research-packet-panel.ts`
- Create: `apps/agent-frontend/src/app/components/research-packet-panel/research-packet-panel.html`
- Create: `apps/agent-frontend/src/app/components/research-packet-panel/research-packet-panel.css`
- Create: `apps/agent-frontend/src/app/components/source-card/source-card.ts`
- Create: `apps/agent-frontend/src/app/components/source-card/source-card.html`
- Create: `apps/agent-frontend/src/app/components/source-card/source-card.css`
- Create: `apps/agent-frontend/src/app/components/claim-card/claim-card.ts`
- Create: `apps/agent-frontend/src/app/components/claim-card/claim-card.html`
- Create: `apps/agent-frontend/src/app/components/claim-card/claim-card.css`

- [ ] **Step 1: Implement research-packet-panel**

Shows sources, claims grouped by option, and gaps. Uses streaming visual state (cyan shimmer) when RESEARCHING.

- [ ] **Step 2: Implement source-card**

Dossier tile: title, type pill badge, domain extracted from URL, snippet. Type badge uses color coding.

- [ ] **Step 3: Implement claim-card**

Shows claim text, option, criterion. Signal-strength bars: 3 bars for strong (bright), 2 for moderate, 1 for weak (faint).

- [ ] **Step 4: Commit**

```bash
git add apps/agent-frontend/src/app/components/research-packet-panel/ apps/agent-frontend/src/app/components/source-card/ apps/agent-frontend/src/app/components/claim-card/
git commit -m "feat(frontend): add research packet panel with source and claim cards"
```

---

## Task 17: Frontend — Column 3 (Agent Cards)

The specialist station cards with confidence rings and rebuttal badges.

**Files:**
- Create: `apps/agent-frontend/src/app/components/agent-card/agent-card.ts`
- Create: `apps/agent-frontend/src/app/components/agent-card/agent-card.html`
- Create: `apps/agent-frontend/src/app/components/agent-card/agent-card.css`

- [ ] **Step 1: Implement agent-card**

Inputs: `AgentAnalysis`, `AgentConfig`, agent visual state (waiting/analyzing/complete/challenged/rebutting).

Shows: agent name + role label with agent-specific accent color, status strip (pulsing when active), SVG confidence ring (0-100), recommendation headline, expandable reasons list, expandable risks list, rebuttal action badge (Defend green / Revise amber / Concede red).

Cards slide in with Angular `@trigger` animation when analysis completes. Challenged state shows amber border glow.

- [ ] **Step 2: Commit**

```bash
git add apps/agent-frontend/src/app/components/agent-card/
git commit -m "feat(frontend): add agent card with confidence ring and rebuttal badges"
```

---

## Task 18: Frontend — Column 4 (Judge Panel + Verdict)

Disagreement cards, challenge directives, and the verdict panel.

**Files:**
- Create: `apps/agent-frontend/src/app/components/judge-panel/judge-panel.ts`
- Create: `apps/agent-frontend/src/app/components/judge-panel/judge-panel.html`
- Create: `apps/agent-frontend/src/app/components/judge-panel/judge-panel.css`
- Create: `apps/agent-frontend/src/app/components/disagreement-card/disagreement-card.ts`
- Create: `apps/agent-frontend/src/app/components/disagreement-card/disagreement-card.html`
- Create: `apps/agent-frontend/src/app/components/disagreement-card/disagreement-card.css`
- Create: `apps/agent-frontend/src/app/components/verdict-card/verdict-card.ts`
- Create: `apps/agent-frontend/src/app/components/verdict-card/verdict-card.html`
- Create: `apps/agent-frontend/src/app/components/verdict-card/verdict-card.css`

- [ ] **Step 1: Implement judge-panel container**

Violet accent theme. Contains disagreement cards, challenge prompt display, and verdict card. Taller, cleaner visual treatment than other columns.

- [ ] **Step 2: Implement disagreement-card**

Shows topic, conflicting agents (with their accent colors), summary, severity badge (low/medium/high with heat colors).

- [ ] **Step 3: Implement verdict-card**

Decision type badge, primary recommendation (large text), ranking if available, reasoning, tradeoffs section, "when to choose differently" section, confidence meter. Ceremonial finish: violet sweep animation on entry, sealed transition feel.

- [ ] **Step 4: Commit**

```bash
git add apps/agent-frontend/src/app/components/judge-panel/ apps/agent-frontend/src/app/components/disagreement-card/ apps/agent-frontend/src/app/components/verdict-card/
git commit -m "feat(frontend): add judge panel, disagreement cards, and verdict display"
```

---

## Task 19: Frontend — Pipeline Graph

The animated DAG visualization using @swimlane/ngx-graph.

**Files:**
- Create: `apps/agent-frontend/src/app/components/pipeline-graph/pipeline-graph.ts`
- Create: `apps/agent-frontend/src/app/components/pipeline-graph/pipeline-graph.html`
- Create: `apps/agent-frontend/src/app/components/pipeline-graph/pipeline-graph.css`

- [ ] **Step 1: Implement pipeline-graph**

Uses `@swimlane/ngx-graph` with dagre layout. Define nodes: Question, Research, Packet, Pragmatist, Performance, DX, Skeptic, Judge, Rebuttal, Verdict. Define edges connecting the flow.

Custom node template: rounded capsule with icon, title, and state-based styling (idle graphite, active cyan pulse, complete emerald, challenged amber, error red).

Custom edge template: thin curved lines, animated glow particles when active (CSS animation on stroke-dashoffset).

Graph background panel: faint grid, soft radial centre highlight.

Node states update reactively from `SessionStateService.session$` — map `PipelineState` to which nodes are active/complete.

- [ ] **Step 2: Commit**

```bash
git add apps/agent-frontend/src/app/components/pipeline-graph/
git commit -m "feat(frontend): add animated pipeline graph with custom node/edge templates"
```

---

## Task 20: Frontend — Session History

Past sessions sidebar/modal.

**Files:**
- Create: `apps/agent-frontend/src/app/components/session-history/session-history.ts`
- Create: `apps/agent-frontend/src/app/components/session-history/session-history.html`
- Create: `apps/agent-frontend/src/app/components/session-history/session-history.css`

- [ ] **Step 1: Implement session-history**

A sidebar or modal showing past sessions from `GET /api/sessions`. Each item shows question (truncated), status badge, creation date, duration. Clicking loads the full session via `GET /api/sessions/:id` and hydrates `SessionStateService`.

- [ ] **Step 2: Commit**

```bash
git add apps/agent-frontend/src/app/components/session-history/
git commit -m "feat(frontend): add session history panel"
```

---

## Task 21: Integration — End-to-End Smoke Test

Verify the full pipeline works with both apps running.

**Files:**
- Modify: `e2e/agent-backend-e2e/src/agent-backend/agent-backend.spec.ts`
- Modify: `apps/agent-frontend/src/app/app.spec.ts`

- [ ] **Step 1: Update backend e2e test**

`e2e/agent-backend-e2e/src/agent-backend/agent-backend.spec.ts`:
```typescript
import axios from 'axios';

describe('Consensus Lab API', () => {
  it('GET /api/health should return ok', async () => {
    const res = await axios.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  it('GET /api/sessions should return empty array initially', async () => {
    const res = await axios.get('/api/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});
```

- [ ] **Step 2: Start both apps and verify manually**

Run: `npm start`
Expected: Frontend at :4200 shows the Consensus Lab landing page. Backend at :3000/api/health returns `{ status: "ok" }`.

- [ ] **Step 3: Commit**

```bash
git add e2e/ apps/agent-frontend/src/app/app.spec.ts
git commit -m "test: update e2e tests for Consensus Lab endpoints"
```

---

## Task 22: Update .example.env and README

Update environment documentation for the new config approach.

**Files:**
- Modify: `.example.env`
- Modify: `CLAUDE.md` (if needed)

- [ ] **Step 1: Update .example.env**

```env
# Consensus Lab does not use server-side env vars for LLM config.
# Users provide their own API keys via the Settings dialog in the frontend.
# The keys below are only used if you want to set defaults.
LLM_API_KEY=your-api-key-here
PORT=3000
```

- [ ] **Step 2: Commit**

```bash
git add .example.env
git commit -m "docs: update .example.env with Consensus Lab config notes"
```
