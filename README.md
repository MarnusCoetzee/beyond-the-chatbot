# Consensus Lab

Consensus Lab is a multi-agent AI deliberation demo built for honours-level teaching and peer presentations.

A user asks a technical or engineering question. The system then:

1. gathers evidence,
2. builds a shared research packet,
3. sends that packet to multiple specialist agents,
4. lets a judge identify disagreements,
5. runs a rebuttal round when needed, and
6. produces a final verdict with tradeoffs and confidence.

The result is not just a chatbot answer. It is a visible, inspectable decision pipeline.

---

## Table of contents

- [Why this project exists](#why-this-project-exists)
- [Core experience](#core-experience)
- [Feature highlights](#feature-highlights)
- [Architecture overview](#architecture-overview)
- [Specialist roles](#specialist-roles)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Running the project](#running-the-project)
- [How to use the demo](#how-to-use-the-demo)
- [Backend API overview](#backend-api-overview)
- [Data model summary](#data-model-summary)
- [Quality and verification](#quality-and-verification)
- [Teaching value](#teaching-value)
- [Current limitations](#current-limitations)

---

## Why this project exists

This repository was designed as a teaching demo for topics such as:

- AI orchestration
- multi-agent systems
- evidence-grounded reasoning
- system design and tradeoff analysis
- observable pipelines and replayable execution
- full-stack application architecture with Angular, NestJS, and Nx

It is intentionally opinionated, visual, and discussion-friendly so students can watch reasoning unfold rather than only seeing a final answer.

---

## Core experience

A typical session looks like this:

- A student asks a question such as:
  - Should a startup choose Angular or React in 2026?
  - Is a monorepo better than a polyrepo for a growing engineering team?
  - Should an AI-first product adopt TypeScript everywhere?
- The backend creates a research packet from web search results and model reasoning.
- Specialist agents evaluate the question through different lenses.
- A judge compares their positions and highlights meaningful disagreement.
- Agents defend, revise, or concede.
- The UI shows live state transitions, event telemetry, agent output, and the final verdict.
- Completed sessions can be replayed with a timeline and stored LLM traces.

---

## Feature highlights

### Deliberative multi-agent pipeline

- Research stage with optional external search
- Shared evidence packet used by all agents
- Specialist roles with different reasoning lenses
- Judge-led arbitration and rebuttal loop
- Final decision with tradeoffs and confidence

### Rich demo UI

- premium dark interface
- live progress states
- visual pipeline graph
- research packet panel
- specialist analysis cards
- judge output panel
- session history drawer
- replay mode for completed runs

### Replay and observability

- session event timeline
- stage duration metadata
- persisted LLM traces by session
- verdict playback for live demos or post-run analysis

### Clean monorepo workflow

- Nx-powered task orchestration
- shared TypeScript models between frontend and backend
- isolated test targets for apps and e2e suites

---

## Architecture overview

### Applications

- **agent-frontend** — Angular 21 standalone frontend
- **agent-backend** — NestJS 11 API and orchestration server
- **agent-frontend-e2e** — Playwright end-to-end tests
- **agent-backend-e2e** — backend e2e support and validation

### Shared package

- **@consensus-lab/shared-types** — canonical shared models for packets, events, sessions, verdicts, traces, and API contracts

### High-level pipeline

```text
User Question
   -> Research
   -> Research Packet
   -> Specialist Agents
   -> Judge Review
   -> Rebuttal Round
   -> Final Verdict
   -> Replay + Trace Inspection
```

### Backend module breakdown

The backend is organized into focused NestJS modules:

- **llm** — provider-facing completion layer for OpenAI-compatible APIs
- **research** — search integration, extraction, and packet building
- **agents** — specialist prompt execution and rebuttal handling
- **judge** — conflict analysis, challenge generation, and final synthesis
- **orchestration** — stage transitions, concurrency, and pipeline coordination
- **events** — live event streaming for the frontend
- **session** — session persistence, status snapshots, history, and trace retrieval

This split keeps the codebase easy to explain during demos and easy to extend for future honours work.

---

## Specialist roles

The default specialist panel includes:

- **Pragmatist** — delivery speed, maintainability, hiring, and time-to-market
- **Performance Engineer** — runtime efficiency, scale, architecture, and technical rigor
- **DX Advocate** — developer experience, onboarding, tooling, and ergonomics
- **Skeptic** — weak assumptions, stale evidence, blind spots, and counterarguments

These roles all consume the same research packet, which makes the demo more grounded and easier to explain in class.

---

## Tech stack

### Frontend

- Angular 21
- standalone components
- RxJS
- Angular router
- custom live pipeline visualization

### Backend

- NestJS 11
- OpenAI-compatible LLM client integration
- SQLite via better-sqlite3
- SSE-driven live session updates

### Tooling

- Nx 22 monorepo
- TypeScript in strict mode
- ESLint + Prettier
- Vitest-style Angular unit testing
- Jest for backend tests
- Playwright for browser e2e support

---

## Repository layout

```text
apps/
  agent-frontend/        Angular UI
  agent-backend/         NestJS API and orchestration
packages/
  shared-types/          shared contracts and domain models
e2e/
  agent-frontend-e2e/    Playwright project
  agent-backend-e2e/     backend e2e project
docs/
  superpowers/           product plans and design notes
```

---

## Getting started

### Prerequisites

Make sure you have:

- Node.js 20 or newer
- npm
- a compatible LLM API key
- optionally, a Brave Search or Firecrawl key if you want live web research

### Installation

```bash
npm install
cp .example.env .env
```

### Environment

The backend only needs a small local environment file:

```env
LLM_API_KEY=your-api-key-here
PORT=3000
```

> In practice, LLM and search settings are provided through the frontend settings dialog and stored locally in the browser for the demo. They are not intended to be persisted server-side.

---

## Running the project

### Start both apps

```bash
npm start
```

This starts:

- frontend on http://localhost:4200
- backend on http://localhost:3000

### Run apps individually

```bash
npx nx serve agent-frontend
npx nx serve agent-backend
```

---

## Common Nx commands

### Build

```bash
npx nx build agent-frontend
npx nx build agent-backend
```

### Test

```bash
npx nx test agent-frontend
npx nx test agent-backend
```

### Typecheck

```bash
npx nx typecheck agent-frontend
npx nx typecheck agent-backend
```

### Lint

```bash
npx nx lint agent-frontend
npx nx lint agent-backend
```

### Run everything important

```bash
npx nx run-many -t lint test build typecheck
```

### Troubleshooting

If something is not working during setup, these are the first checks to make:

- confirm the backend is running on port 3000
- confirm the frontend is running on port 4200
- re-open the settings dialog and verify the base URL, model name, and API key
- disable search temporarily if your Brave or Firecrawl key is invalid
- run the full Nx verification command to catch config or typing regressions quickly

---

## How to use the demo

1. Start the frontend and backend.
2. Open the app in the browser.
3. Click the settings icon.
4. Enter:
   - model base URL
   - API key
   - model name
   - optional search provider configuration
5. Ask an engineering question.
6. Watch the pipeline move through research, analysis, review, rebuttal, and verdict.
7. Open history to replay completed sessions and inspect LLM traces.

### Good demo prompts

- Angular vs React for a structured enterprise dashboard
- Monorepo or polyrepo for a scaling product team
- Best stack for an AI-first startup MVP
- Should a small team adopt strict TypeScript immediately
- Best frontend approach for long-term maintainability in 2026

---

## Backend API overview

The NestJS server exposes a small session-focused API under the global API prefix.

### Main endpoints

- `POST /api/sessions` — create a new session
- `GET /api/sessions` — list previous sessions
- `GET /api/sessions/:id` — fetch the full session snapshot
- `GET /api/sessions/:id/traces` — fetch persisted LLM traces for replay
- `POST /api/sessions/:id/cancel` — cancel an in-flight session

The live run experience is powered by server-sent events and incremental session updates.

---

## Data model summary

Important domain objects include:

- **ResearchPacket** — shared evidence packet used by all agents
- **AgentAnalysis** — recommendation, reasons, risks, confidence, and evidence refs
- **Disagreement** — meaningful conflicts flagged by the judge
- **ChallengePrompt** — focused rebuttal instructions from the judge
- **RebuttalResponse** — defend, revise, or concede response from an agent
- **Verdict** — final recommendation and tradeoff explanation
- **SessionEvent** — timeline events for live UI and replay
- **LlmTrace** — stored request and response traces for observability

These models live in the shared package so both applications stay consistent.

---

## Quality and verification

This workspace is set up to support a polished demo workflow:

- strict TypeScript configuration
- linted frontend and backend code
- backend unit tests
- frontend component tests
- e2e project support
- shared type-safe contracts across the stack

A full verification pass can be run with:

```bash
NX_TASKS_RUNNER_DYNAMIC_OUTPUT=false CI=1 npx nx run-many -t lint test build typecheck --skipNxCache --parallel=1
```

---

## Teaching value

This project works well in class because it makes hidden AI-system behavior visible:

- evidence gathering is separated from reasoning
- different agent lenses produce meaningful disagreement
- arbitration is inspectable instead of magical
- the replay view makes it easy to revisit a run step by step
- students can discuss where confidence came from and where assumptions failed

It is especially useful for lectures or demos on:

- AI agents
- orchestration patterns
- trustworthy AI interfaces
- human-in-the-loop decision support
- modern monorepo application design

---

## Current limitations

A few things are intentionally lightweight because this is a teaching demo rather than a production SaaS platform:

- API keys are configured locally for convenience
- persistence is SQLite-based for simplicity
- search quality depends on the configured external provider and model
- concurrency and orchestration are optimized for clarity and demo stability over maximum throughput

---

## Suggested next improvements

Potential extensions if you want to keep developing the project:

- add citation previews with highlighted source excerpts
- export full session reports as PDF or markdown
- add configurable agent panels from the UI
- support multiple judges or voting strategies
- add scoring dashboards for evidence quality and disagreement severity
- add classroom-friendly preset prompts and saved demo scenarios

---

## License

MIT

---

## Acknowledgements

Built as an honours lecture demo using Angular, NestJS, Nx, and shared TypeScript contracts to showcase observable multi-agent reasoning.
