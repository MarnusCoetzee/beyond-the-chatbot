# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Consensus Lab" — a multi-agent AI deliberation system built as an honours lecture demo. A user asks an engineering question, a Research Agent gathers evidence via tools (Firecrawl), specialist agents (Pragmatist, Performance Engineer, DX Advocate, Skeptic) analyze a shared research packet, a Judge arbitrates disagreements and triggers rebuttal rounds, and the process is visualized as a live decision graph. See `idea.md` for the full design spec.

## Architecture

Nx 22 monorepo with npm workspaces. Two apps:

- **agent-frontend** (`apps/agent-frontend/`) — Angular 21, standalone components (no NgModules), vitest-angular for unit tests, Playwright for e2e
- **agent-backend** (`apps/agent-backend/`) — NestJS 11 on Express, webpack build, global API prefix `/api`, default port 3000

E2E projects live in `e2e/`. Shared packages go in `packages/` (npm workspaces).

## Common Commands

```bash
# Start both apps (frontend :4200, backend :3000)
npm start

# Individual app tasks
npx nx serve agent-frontend
npx nx serve agent-backend
npx nx build agent-frontend
npx nx build agent-backend

# Testing
npx nx test agent-frontend              # vitest-angular unit tests
npx nx e2e agent-frontend-e2e           # Playwright e2e
npx nx e2e agent-backend-e2e            # Jest e2e

# Linting & formatting
npx nx lint agent-frontend
npx nx lint agent-backend
npx nx format:check
npx nx format:write

# Type checking
npx nx typecheck agent-frontend
npx nx typecheck agent-backend

# Run across all projects
npx nx run-many -t lint test build typecheck
npx nx affected -t lint test build       # Only changed projects
```

Always run tasks through `npx nx`, never raw `ng`, `nest`, `tsc`, etc.

## Environment Variables

Copy `.example.env` to `.env` at workspace root. Required:

- `LLM_API_KEY` — API key for the LLM provider
- `PORT` — Backend port (default: 3000)

## Conventions

- **Angular selectors**: elements prefixed `app-` (kebab-case), directives prefixed `app` (camelCase)
- **TypeScript**: strict mode everywhere, single quotes (Prettier), ES2022 target
- **ESLint**: flat config format (`eslint.config.mjs`), Nx module boundary rules enforced
- **Build output**: `dist/apps/<project-name>/`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
