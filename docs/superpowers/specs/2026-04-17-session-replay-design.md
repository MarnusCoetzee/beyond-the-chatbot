# Session Replay & LLM Trace Capture — Design

**Date:** 2026-04-17
**Status:** Approved for implementation planning

## Problem

Consensus Lab runs a multi-agent deliberation pipeline, but once a session completes there is no way to inspect _how_ each stage arrived at its output. Users see the final verdict and the agent cards, but they cannot:

- Walk back through the pipeline stage by stage
- See exactly what prompt each LLM call received and what the model returned
- Compare the raw LLM response against the structured data that was parsed out of it
- Revisit a previous session's reasoning for a post-mortem or demo

This feature adds a _session replay_ capability: a timeline-based UI that lets a user step through a completed session and drill into the exact LLM traces behind each stage.

## Goals

1. Capture and persist every LLM interaction (system prompt, user prompt, raw response, parsed output) during a pipeline run.
2. Expose the captured traces via an API endpoint that supports lazy loading.
3. Provide a vertical-timeline replay UI accessible both as a dedicated route and as a toggle on the existing deliberation view.
4. Keep the existing pipeline behaviour unchanged — tracing is a side effect, not a gate.

## Non-goals

- Retrofitting traces onto sessions created before this feature ships (those sessions show a disabled "Show LLM Trace" button).
- Cross-session analytics, search, or aggregation over trace data.
- Editing or re-running traces.

## Architecture Overview

```
┌─────────────────────┐       ┌──────────────────────┐
│  Agent/Judge/etc.   │──────▶│   LlmService         │
└─────────────────────┘       │   (captures trace)   │
                              └──────────┬───────────┘
                                         │ saves
                                         ▼
                              ┌──────────────────────┐
                              │  TraceRepository     │
                              │  (llm_traces table)  │
                              └──────────┬───────────┘
                                         │ GET /sessions/:id/traces
                                         ▼
                              ┌──────────────────────┐
                              │  ReplayTimeline (FE) │
                              └──────────────────────┘
```

The `LlmService` is the single point through which every LLM call flows. Trace capture happens there — after a successful call, a trace row is written to SQLite via a new `TraceRepository`. Sessions remain lean; traces are fetched on demand when the user expands a stage in the replay UI.

## Backend

### Data model

New SQLite table `llm_traces`:

| Column             | Type    | Notes                                                                                                                           |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | TEXT PK | uuid                                                                                                                            |
| `sessionId`        | TEXT    | FK-equivalent to `sessions.id`; indexed                                                                                         |
| `stage`            | TEXT    | e.g. `packet-building`, `agent-analysis`, `judge-review`, `agent-rebuttal`, `judge-verdict` (actor identity lives in `actorId`) |
| `actorId`          | TEXT    | agentId when applicable, null otherwise                                                                                         |
| `systemPrompt`     | TEXT    | not null                                                                                                                        |
| `userPrompt`       | TEXT    | not null                                                                                                                        |
| `rawResponse`      | TEXT    | not null — the model's unparsed string output                                                                                   |
| `parsedOutput`     | TEXT    | JSON string of the parsed typed result, or null for plain-text completions                                                      |
| `model`            | TEXT    | from `LlmConfig.model`                                                                                                          |
| `promptTokens`     | INTEGER | nullable                                                                                                                        |
| `completionTokens` | INTEGER | nullable                                                                                                                        |
| `createdAt`        | TEXT    | ISO timestamp; defines trace ordering                                                                                           |

Indexed on `sessionId` for fast lookup.

### New shared type

In `libs/shared-types`:

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

### `TraceRepository`

Location: `apps/agent-backend/src/session/trace.repository.ts`.

Public API:

- `save(trace: LlmTrace): void`
- `listBySession(sessionId: string): LlmTrace[]` — ordered by `createdAt` ASC

Uses the same `better-sqlite3` instance as `SessionRepository`. The table is created idempotently on startup (`CREATE TABLE IF NOT EXISTS`), matching the existing pattern.

### `LlmService` changes

Add an optional `traceContext` parameter to `complete()` and `completeJson()`:

```ts
interface TraceContext {
  sessionId: string;
  stage: string;
  actorId?: string;
}

async complete(config: LlmConfig, request: LlmRequest, trace?: TraceContext): Promise<LlmResponse<string>>;
async completeJson<T>(config: LlmConfig, request: LlmRequest, trace?: TraceContext): Promise<LlmResponse<T>>;
```

When `traceContext` is provided and the call succeeds, the service builds an `LlmTrace` and calls `traceRepository.save()`. For `completeJson`, `parsedOutput` is set to the parsed JSON; for `complete`, it stays undefined.

If saving the trace throws, log the error but do not rethrow — tracing must never break the pipeline.

### Callers

Update every caller of `LlmService` to pass a `traceContext`:

- `PacketBuilderService.buildPacket` / `buildPacketFromKnowledge` → `stage: 'packet-building'` (or `packet-building-knowledge`)
- `ResearchExtractionService.extractClaims` → `stage: 'claim-extraction'`
- `AgentRunnerService.analyze` → `stage: 'agent-analysis'`, `actorId: config.agentId`
- `AgentRunnerService.rebut` → `stage: 'agent-rebuttal'`, `actorId: config.agentId`
- `JudgeService.review` → `stage: 'judge-review'`
- `JudgeService.synthesize` → `stage: 'judge-verdict'`

The `sessionId` must be threaded through — most of these services already accept `llmConfig` but not the session id, so their method signatures gain a `sessionId` parameter. The `OrchestrationService` already has the session id in scope.

### New endpoint

`GET /api/sessions/:id/traces` — returns `LlmTrace[]` for the session, ordered by `createdAt`. 404 if the session does not exist. Empty array if the session has no traces (pre-feature sessions).

Added to `SessionController`.

## Frontend

### New route

`/sessions/:id/replay` renders `ReplayTimelineComponent`. Wired into `app.routes.ts`.

The session history list gains a "Replay" link next to each completed session.

### Toggle on deliberation view

When the current session's status is `COMPLETE`, show a "Replay mode" toggle in the existing control bar. Flipping it swaps the deliberation grid for the same `ReplayTimelineComponent`, reusing the current session from `SessionStateService`.

### `ReplayTimelineComponent`

Location: `apps/agent-frontend/src/app/components/replay-timeline/`.

Renders a vertical timeline with one card per pipeline stage, in this order:

1. **Research** — one card, shows the `ResearchPacket`
2. **Agent Analyses** — one card per agent (four total), shows the `AgentAnalysis`
3. **Judge Review** — one card, shows disagreements + challenge prompts
4. **Rebuttals** — one card per rebutting agent, shows the `RebuttalResponse`
5. **Final Verdict** — one card, shows the `Verdict`

Each card contains:

- **Header**: stage name, actor (if applicable), duration (from `stageMetadata`), token counts
- **Parsed output section** (collapsed by default, expandable): the structured data — e.g. for an agent card, the recommendation, reasons, risks, confidence ring, matching the look of the existing `AgentCardComponent` where possible
- **"Show LLM Trace" button**: on first click for the session, the component fetches `GET /api/sessions/:id/traces` once and caches the result in a signal. The relevant trace is found by matching `stage` and (when applicable) `actorId`. Three expandable panels display:
  - System prompt (monospace, wrappable, scrollable if tall)
  - User prompt (same)
  - Raw response (same)

If traces have been fetched but no match exists for this card (pre-feature session), the button is disabled with tooltip "Traces not available for this session."

### Trace fetching service

New `TraceService` (`apps/agent-frontend/src/app/services/trace.service.ts`) with a single method `getBySession(sessionId: string): Observable<LlmTrace[]>`. The `ReplayTimelineComponent` owns the cache (one cached Observable per mounted session).

## Data Flow

1. Pipeline runs as today. Every LLM call now includes a `traceContext`, so a trace row is written to SQLite for each call.
2. User navigates to `/sessions/:id/replay` or toggles replay mode on a complete session.
3. `ReplayTimelineComponent` reads the session from `SessionStateService` (already loaded by the parent route or the existing deliberation view).
4. Timeline renders from the session's stored data — no extra network call yet.
5. When the user clicks "Show LLM Trace" on any card, the component triggers a single `GET /sessions/:id/traces` call. Subsequent clicks on other cards reuse the cached result.

## Error handling

- **LLM call fails**: existing error path in the orchestrator handles it. No trace is written for the failed call (the service only saves after a successful response).
- **Trace save fails**: logged as a warning, pipeline continues. The card will show "Traces not available for this session." for that stage.
- **GET /traces fails**: the button shows an error state with a retry affordance.
- **Pre-feature sessions**: the traces list is empty, so every "Show LLM Trace" button ends up disabled. Acceptable.

## Testing

**Backend:**

- `TraceRepository` unit tests: insert a trace, query by session id, verify ordering.
- `LlmService` unit tests: call with `traceContext` → verify `TraceRepository.save` is called with the right shape; call without → verify it is not.
- Controller test: `GET /sessions/:id/traces` returns the stored traces.

**Frontend:**

- `ReplayTimelineComponent` test: renders a timeline from a fixture session, verifies the correct number of cards and correct header content.
- Trace-expansion test: click "Show LLM Trace", service call resolves with a fixture array, the matching prompt/response panels render.

## Out of scope (explicitly)

- Cross-session trace search, filtering, or analytics.
- Editing or re-running traces.
- Token-cost calculation improvements.
- Streaming traces during an in-progress session (replay is for completed sessions; the live deliberation view is unchanged).
