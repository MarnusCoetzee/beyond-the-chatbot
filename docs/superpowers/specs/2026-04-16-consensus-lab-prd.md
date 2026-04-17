# Consensus Lab — Product Requirements Document

A multi-agent AI deliberation system built as an honours lecture demo. A user asks an engineering question, a Research Agent gathers evidence, specialist agents analyze a shared research packet from different perspectives, a Judge arbitrates disagreements and triggers a rebuttal round, and the entire process is visualized as a live animated decision graph.

**North star:** A premium dark command interface with restrained glass surfaces, semantic glow, and live orchestration telemetry.

---

## 1. Core Data Model

The Research Packet is the shared ground truth all agents reason over. All types live in a shared `packages/shared-types` library consumed by both frontend and backend.

### Pipeline State

```typescript
type PipelineState =
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

type ConfidenceLevel = 'high' | 'medium' | 'low';
```

### Agent Configuration

Extensible by config — adding an agent means adding an object to an array, no code changes.

```typescript
type AgentRole = 'pragmatist' | 'performance' | 'dx' | 'skeptic';

interface AgentConfig {
  agentId: string;
  displayName: string;
  role: AgentRole;
  lens: string; // e.g. "speed, maintainability, hiring, time to market"
  systemPrompt: string;
}
```

Default panel: Pragmatist, Performance Engineer, DX Advocate, Skeptic.

### Research Layer (3-tier: Sources -> Claims -> Summaries)

```typescript
interface Source {
  id: string;
  title: string;
  url: string;
  type: 'docs' | 'blog' | 'benchmark' | 'forum' | 'other';
}

interface ResearchClaim {
  id: string;
  option: string;
  criterion: string;
  claim: string;
  supportLevel: 'strong' | 'moderate' | 'weak';
  sourceRefs: string[]; // Source.id references
}

interface OptionSummary {
  pros: string[];
  cons: string[];
  evidenceClaimIds: string[]; // ResearchClaim.id references
  confidence: ConfidenceLevel;
}

interface ResearchPacket {
  question: string;
  options: string[];
  evaluationCriteria: string[];
  claims: ResearchClaim[];
  optionSummaries: Record<string, OptionSummary>;
  webSources: Source[];
  gaps: string[];
}
```

### Structured Evidence References

```typescript
interface EvidenceRef {
  sourceId: string;
  claimId: string;
  excerpt?: string;
}
```

### Agent Analysis (with round tracking)

```typescript
interface AgentAnalysis {
  agentId: string;
  role: AgentRole;
  round: number;
  recommendation: string;
  topReasons: string[];
  risks: string[];
  confidence: number; // 0-100
  strongestCounterargument: string;
  evidenceRefs: EvidenceRef[];
}
```

### Disagreement Tracking

```typescript
interface Disagreement {
  topic: string;
  agentsInConflict: string[];
  summary: string;
  severity: 'low' | 'medium' | 'high';
}
```

### Judge Outputs

```typescript
interface ChallengePrompt {
  id: string;
  round: number;
  targetAgentIds: string[];
  topic: string;
  prompt: string;
}

interface RebuttalResponse {
  agentId: string;
  round: number;
  action: 'defend' | 'revise' | 'concede';
  response: string;
  revisedRecommendation?: string;
  revisedConfidence?: number;
}
```

### Verdict (supports nuanced outcomes)

```typescript
interface Verdict {
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

### Session Event Log (powers graph view + timeline)

```typescript
interface SessionEvent {
  id: string;
  timestamp: string;
  type:
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
  actorId?: string;
  payload?: Record<string, unknown>;
}
```

### Stage Metadata (observability)

```typescript
interface StageMetadata {
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

### Session

```typescript
interface Session {
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
  error?: {
    message: string;
    stage?: PipelineState;
    code?: string;
  };
  createdAt: Date;
}
```

**Data access semantics:**

- Full session object = canonical latest snapshot (use for normal page loads)
- `events[]` = execution history (use for replay animation)
- Live run = build incrementally from SSE stream

---

## 2. Backend Architecture

Seven NestJS modules. Orchestration is first-class. Persistence is incremental. API keys are never stored.

### LlmModule

The only provider-facing layer. Wraps the OpenAI SDK with user-provided `baseUrl`, `apiKey`, and `model` passed per-call (never persisted).

```typescript
interface LlmClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface LlmRequest {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, string>; // e.g. { stage: 'research', agentId: 'pragmatist' }
}

interface LlmResponse<T = string> {
  result: T;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// LlmService
complete(config: LlmClientConfig, request: LlmRequest): Promise<LlmResponse<string>>;
completeJson<T>(config: LlmClientConfig, request: LlmRequest): Promise<LlmResponse<T>>;
```

Provider-agnostic: works with any OpenAI-compatible endpoint (NVIDIA NIM, OpenRouter, Anthropic, OpenAI, local models). Retry and timeout logic lives here. Centralized token/cost logging.

### ResearchModule

Three internal layers:

1. **SearchProviderService** — abstracts Firecrawl vs Brave behind `search(query): Promise<RawResult[]>`. Adding a provider = one new implementation.
2. **ResearchExtractionService** — takes raw results + LLM, extracts normalized `ResearchClaim[]`.
3. **PacketBuilderService** — assembles claims + summaries into the final `ResearchPacket`.

If search is disabled, step 1 is skipped. LLM generates claims from training knowledge alone. Same `ResearchPacket` output shape either way.

### AgentsModule

Agent definitions are a config array (`AgentConfig[]`). `AgentRunnerService` has two methods:

- `analyze(config, packet): Promise<AgentAnalysis>` — initial round 1 analysis
- `rebut(config, packet, challenge): Promise<RebuttalResponse>` — rebuttal round

Orchestrator runs all 4 in parallel via a concurrency-limited utility (default 4, adjustable for rate-limited providers or larger panels).

### JudgeModule

Two-phase:

- `review(packet, analyses): Promise<{ disagreements, challengePrompts }>` — identifies conflicts, generates targeted challenges
- `synthesize(packet, analyses, rebuttals, disagreements): Promise<Verdict>` — final verdict

Judge gets its own system prompt focused on evidence quality evaluation and conflict resolution.

### OrchestrationModule

The heart of the system. Owns the state machine, lifecycle coordination, and cancellation. Does not own persistence or HTTP endpoints.

```
POST /api/sessions (SessionController)
  -> OrchestrationService.run(session, llmConfig, searchConfig)
    -> RESEARCHING      -> ResearchModule -> persist packet -> emit events
    -> PACKET_READY     -> persist + emit
    -> AGENTS_ANALYZING -> AgentsModule (parallel) -> persist analyses -> emit
    -> JUDGE_REVIEWING  -> JudgeModule.review -> persist disagreements + challenges -> emit
    -> REBUTTAL_ROUND   -> AgentsModule.rebut (targeted) -> persist rebuttals -> emit
    -> FINAL_VERDICT    -> JudgeModule.synthesize -> persist verdict -> emit
    -> COMPLETE         -> final persist
```

Each transition: persists incrementally via `SessionRepository`, emits a `SessionEvent` through `EventBusService`, and records `StageMetadata`.

**Cancellation:** Orchestrator checks a `cancelled` flag before each stage transition. If set, moves to `CANCELLED` and stops. Cancellation is best-effort — in-flight provider calls may complete, but their outputs are discarded if the session has been cancelled.

### SessionModule

Persistence and HTTP surface only.

**SessionRepository** abstraction over `better-sqlite3`:

- `create(session)` / `getById(id)` / `list()`
- `updateStatus(id, status)`
- `saveResearchPacket(id, packet)`
- `saveAnalyses(id, analyses)`
- `saveDisagreements(id, disagreements)`
- `saveRebuttals(id, rebuttals)`
- `saveVerdict(id, verdict)`
- `appendEvent(id, event)`
- `saveStageMetadata(id, metadata)`
- `saveError(id, error)`

Session stored as JSON column in SQLite. API keys are never persisted.

### EventsModule

SSE connections + event bus.

- **EventBusService** — injectable `EventEmitter` wrapper. Orchestrator pushes `SessionEvent` objects.
- SSE controller forwards events to connected clients.
- Completed sessions replay from persisted `events[]` array.
- **Heartbeat** event emitted every ~15s during long steps to keep the connection alive and indicate "connected" status.

### Config Validation

`CreateSessionRequest` validated with class-validator:

- URL format for `baseUrl`
- Non-empty `apiKey` and `model`
- `searchConfig` optional but complete when present (provider enum + apiKey)

---

## 3. Frontend Architecture + Visual Design

Angular 21, standalone components, no NgModules.

### Views

Two views. No router navigation — the deliberation view replaces the input when a session starts.

1. **Landing view** — question input, example prompt chips, settings
2. **Deliberation view** — 4-column mission control + pipeline graph

### Visual Language: AI Deliberation Observatory

A premium dark command interface with restrained glass surfaces, semantic glow, and live orchestration telemetry.

### Palette

| Token              | Value                       | Purpose                     |
| ------------------ | --------------------------- | --------------------------- |
| `--bg-deep`        | `#060816`                   | Base background             |
| `--surface-1`      | `#0b1220`                   | Elevated panels             |
| `--surface-2`      | `#101a2b`                   | Card surfaces               |
| `--glass`          | `rgba(17, 25, 40, 0.72)`    | Glass tint                  |
| `--border`         | `rgba(130, 170, 255, 0.14)` | Subtle borders              |
| `--text-primary`   | `#e8f0ff`                   | Primary text                |
| `--text-secondary` | `#9eb0d0`                   | Secondary text              |
| `--text-muted`     | `#6f7f9e`                   | Muted text                  |
| `--accent-active`  | `#4cc9f0`                   | Cyan: active reasoning      |
| `--accent-judge`   | `#9b5cff`                   | Violet: arbitration         |
| `--accent-success` | `#36d399`                   | Emerald: complete/grounded  |
| `--accent-warning` | `#ffb84d`                   | Amber: disagreement/caution |
| `--accent-error`   | `#ff6b81`                   | Crimson: error/conflict     |

Agent-specific subtle accents: Pragmatist (blue), Performance Engineer (emerald), DX Advocate (amber), Skeptic (rose), Judge (violet).

### Design Tokens

Spacing: `--space-1: 4px` through `--space-7: 32px`.

Radii: `--radius-panel: 24px`, `--radius-card: 18px`, `--radius-chip: 999px`.

### Typography

- UI/body: **Inter** or **Manrope**
- Telemetry/metadata: **JetBrains Mono**
- Scale: title 28-36px, panel headers 16-18px, body 14-15px, metadata 12-13px mono, state labels 11-12px uppercase tracked

### Glass Depth Hierarchy

- Outer panel shells: glass (translucent, backdrop blur 14px)
- Inner cards: more solid tinted surfaces
- Critical focus surfaces: slightly brighter elevation

This prevents the "foggy aquarium" problem where everything is equally translucent.

### Visual States

| State      | Treatment                                      |
| ---------- | ---------------------------------------------- |
| Idle       | Muted graphite                                 |
| Active     | Cyan pulse                                     |
| Streaming  | Cyan shimmer, left-to-right sweep, moving dots |
| Complete   | Emerald glow                                   |
| Challenged | Amber halo                                     |
| Error      | Red glow                                       |

### Focus Mode

When the system is in a pipeline stage, the relevant column brightens and others dim 5-10%. Active panel header animates slightly. Creates directional attention during live demos.

### Layout

CSS Grid, 4-column desktop:

```
| Input/Status (0.9fr) | Research Packet (1.2fr) | Deliberation (1.2fr) | Judge (1.1fr) |
```

Max width 1600-1800px. Padding 24-32px. Column gap 20px. Sticky headers per column. Pipeline graph spans full width below.

### Top Control Bar

Spans full width above columns:

- `Consensus Lab` product name (left)
- Session status chip
- Live SSE connection indicator
- Current pipeline phase
- Elapsed timer
- Settings button (right)

### Column 1: Mission Launcher

- Question display (read-only "mission summary" card when running)
- Vertical pipeline progress rail with stage timing in mono
- Telemetry strip: model, source count, elapsed time, tokens, estimated cost, current round
- Settings summary
- Cancel button (low-profile danger control)

### Column 2: Intel Acquisition

- Source cards as mini dossier tiles (title, type pill, domain, snippet, claim linkage)
- Claims grouped by option in accordion clusters
- Evidence strength as signal bars (3 bright / 2 medium / 1 faint)
- Gaps in a dimmer "unknowns" box
- Sources animate in one-by-one via SSE (streaming visual state)

### Column 3: Specialist Stations

Agent cards as living units:

- Icon, role label, agent-specific accent
- Status strip (pulsing when active)
- Confidence ring/meter
- Recommendation headline
- Expandable reasons/risks
- Rebuttal action badge: Defend / Revise / Concede

Cards animate in on completion. Challenge state shows highlighted edge + amber glow. Concede state softens badge + drops confidence visually.

### Column 4: Command Adjudicator

Taller, cleaner cards. Violet accent throughout.

- Disagreement cards with severity heat
- Challenge prompts styled as official directives (target agent highlighted)
- Verdict panel:
  - Decision type badge (single winner / contextual / tie)
  - Primary recommendation (large)
  - Ranking if applicable
  - Reasoning
  - Tradeoffs
  - "When to choose differently" section
  - Final confidence score
  - Ceremonial finish: violet sweep, sealed transition, confidence meter settles last

### Pipeline Graph (Full Width, Bottom)

Built with **@swimlane/ngx-graph** (Angular-native, dagre layout, custom node/edge templates).

**Nodes:** Question -> Research -> Packet -> Agent A/B/C/D -> Judge -> Rebuttal -> Verdict. Rounded capsules with icon + title + state.

**Node states:** idle (muted graphite), active (cyan pulse), complete (emerald glow), challenged (amber halo), error (red glow).

**Edges:** Thin, slightly curved, animated moving light particles when active, brighter when traversed, dim when idle.

**Graph background:** Own panel with faint technical grid, soft radial centre highlight, tiny data-speck noise.

### Ambient Background

Faint grid + drifting gradient blobs + tiny particle field. Subliminal, not decorative.

### Motion Language

Animations are signal propagation, not decoration:

- Node pulse when active
- Edge glow particles moving along graph paths
- Agent cards slide in on completion
- Confidence bars fill
- Source cards appear one-by-one
- Disagreement cards flash softly on detection
- Verdict "lock-in" effect with violet sweep

### Responsive Degradation

- **Desktop** (>1200px): full 4-column layout + graph
- **Tablet** (768-1200px): 2x2 grid, graph collapses to tab or accordion below
- **Mobile** (<768px): timeline-first layout, each stage as a section card, graph as simplified mini-map or hidden behind toggle

### Components

| Component                      | Purpose                                               |
| ------------------------------ | ----------------------------------------------------- |
| `QuestionInputComponent`       | Mission prompt input, example chips, settings trigger |
| `SettingsDialogComponent`      | LLM config + search toggle (CDK dialog)               |
| `ControlBarComponent`          | Top app bar: name, status, phase, timer, settings     |
| `DeliberationViewComponent`    | 4-column grid shell, SSE subscription                 |
| `PipelineStatusComponent`      | Vertical progress rail + stage timing                 |
| `TelemetryStripComponent`      | Model, tokens, cost, elapsed time                     |
| `ResearchPacketPanelComponent` | Sources, claims, gaps                                 |
| `SourceCardComponent`          | Dossier tile with type badge                          |
| `ClaimCardComponent`           | Claim with signal-strength bars                       |
| `AgentCardComponent`           | Living agent unit with confidence ring                |
| `JudgePanelComponent`          | Disagreements, challenges, verdict                    |
| `DisagreementCardComponent`    | Severity-heat conflict card                           |
| `VerdictCardComponent`         | Sealed verdict display                                |
| `PipelineGraphComponent`       | Animated DAG with custom node/edge templates          |
| `SessionHistoryComponent`      | Past sessions list (sidebar/modal)                    |

### Services

| Service               | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `SessionService`      | HTTP: create, list, get, cancel                          |
| `SseService`          | `EventSource` -> `Observable<SessionEvent>`              |
| `SessionStateService` | `BehaviorSubject`-based reactive state, updated from SSE |
| `SettingsService`     | LLM + search config in `localStorage`                    |

### State Management

No NgRx. Plain RxJS `BehaviorSubject`s + `async` pipe. Single-session focus makes global state management overkill.

### Styling Stack

- Custom SCSS with design tokens
- CSS Grid for layout
- Angular animations for transitions
- `@swimlane/ngx-graph` with custom node/edge templates
- CDK primitives where useful (dialogs, overlays)
- No default Angular Material visual styling

---

## 4. API Contract

### Endpoints

| Method | Path                       | Purpose                        |
| ------ | -------------------------- | ------------------------------ |
| `GET`  | `/api/health`              | Health check                   |
| `POST` | `/api/sessions`            | Create session, start pipeline |
| `GET`  | `/api/sessions`            | List past sessions             |
| `GET`  | `/api/sessions/:id`        | Full session data              |
| `POST` | `/api/sessions/:id/cancel` | Cancel a running session       |
| `GET`  | `/api/sessions/:id/events` | SSE stream                     |

### Request/Response Shapes

**Create:**

```typescript
// POST /api/sessions — 201
interface CreateSessionRequest {
  question: string;
  llmConfig: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  searchConfig?: {
    provider: 'firecrawl' | 'brave';
    apiKey: string;
  };
}

interface CreateSessionResponse {
  sessionId: string;
  status: PipelineState;
  createdAt: string;
}
```

**List:**

```typescript
// GET /api/sessions — 200
interface SessionListItem {
  id: string;
  question: string;
  status: PipelineState;
  createdAt: string;
  durationMs?: number;
}
```

**Get:**

```typescript
// GET /api/sessions/:id — 200
// Returns full Session object (minus API keys)
```

**Cancel:**

```typescript
// POST /api/sessions/:id/cancel — 200
// Response: { status: 'CANCELLED' }
// 409 if already COMPLETE/ERROR/CANCELLED
```

Cancellation is best-effort. In-flight provider calls may complete, but their outputs are discarded if the session has been cancelled.

### SSE Event Stream

```typescript
// GET /api/sessions/:id/events

// Pipeline events
event: session.event
data: { "id": "...", "timestamp": "...", "type": "research_started", "actorId": null, "payload": {} }

// State transitions
event: session.state_changed
data: { "state": "JUDGE_REVIEWING", "previousState": "AGENTS_ANALYZING" }

// Stage observability
event: session.stage_metadata
data: { "stage": "RESEARCHING", "durationMs": 4200, "tokenUsage": { "input": 1200, "output": 800, "total": 2000 } }

// Keepalive (every ~15s during long steps)
event: session.heartbeat
data: { "timestamp": "..." }

// Terminal
event: session.done
data: { "sessionId": "...", "finalStatus": "COMPLETE" }
// finalStatus is one of: COMPLETE | ERROR | CANCELLED
```

---

## 5. End-to-End Flow

1. User enters question + config on landing page -> `POST /api/sessions`
2. Frontend receives `sessionId`, opens SSE stream, switches to deliberation view
3. **RESEARCHING** — Column 2 lights up (focus mode). Sources animate in one-by-one (streaming state). Claims appear as extracted. Packet assembles live.
4. **PACKET_READY** — Research packet finalized. Column 2 settles to complete state.
5. **AGENTS_ANALYZING** — Column 3 lights up. 4 agent cards appear in "analyzing" state (pulsing). Each completes independently — card fills in with recommendation, confidence ring, reasons. Graph edges animate from Packet to each Agent node.
6. **JUDGE_REVIEWING** — Column 4 lights up (violet). Disagreement cards appear with severity. Challenge prompts styled as directives with target agents highlighted.
7. **REBUTTAL_ROUND** — Column 3 re-activates. Challenged agents glow amber. Rebuttal badges animate in (Defend / Revise / Concede). Graph shows edges from Judge back to targeted Agents.
8. **FINAL_VERDICT** — Column 4 glows violet. Verdict card animates in with ceremonial finish (violet sweep, sealed transition, confidence settles). Graph edge from Rebuttal to Verdict illuminates.
9. **COMPLETE** — All columns return to neutral. Graph shows full completed path in emerald. Telemetry strip shows final stats (total time, total tokens, estimated cost).

**Replaying a past session:** `GET /api/sessions/:id` returns the full `events[]` array. The frontend can replay events in sequence with original timing to re-animate the entire deliberation. Normal historical loads hydrate directly from the full session snapshot.

---

## 6. Technical Decisions

| Decision              | Choice                                                                   | Rationale                                                    |
| --------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| LLM provider          | Provider-agnostic (OpenAI SDK with configurable baseUrl)                 | Works with NIM, OpenRouter, Anthropic, OpenAI, local models  |
| Research enhancement  | Optional Firecrawl or Brave, user-provided keys, "disable search" toggle | Self-contained by default, enhanced when keys available      |
| Real-time transport   | SSE (server-sent events)                                                 | Flow is server-driven, simpler than WebSockets               |
| Specialist panel      | Fixed 4 agents, extensible by config array                               | Focused demo, easy to extend without code changes            |
| Rebuttal rounds       | Single round (Defend / Revise / Concede)                                 | Snappy for lectures, lower token cost                        |
| Persistence           | SQLite via better-sqlite3, JSON column                                   | Zero-config, no migrations, students clone and run           |
| State management (FE) | RxJS BehaviorSubjects                                                    | Single-session focus, no NgRx overhead                       |
| Graph visualization   | @swimlane/ngx-graph                                                      | Angular-native, dagre layout, custom templates               |
| Styling               | Custom SCSS + design tokens, no Material defaults                        | Premium dark command interface requires custom visual system |
| Scenario selector     | None                                                                     | User's question provides sufficient context                  |

---

## 7. Out of Scope

- User authentication / multi-tenancy
- Scenario selector (student project, enterprise, startup, etc.)
- Multiple concurrent sessions per server
- Production database (Postgres, MongoDB)
- Multiple rebuttal rounds (judge-controlled looping)
- Agent creation UI (agents are config-driven, edited in code)
- Chat / conversational follow-ups after verdict
- Export / PDF generation of verdicts
