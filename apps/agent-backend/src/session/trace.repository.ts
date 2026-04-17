import { Inject, Injectable, Optional } from '@nestjs/common';
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
        trace.parsedOutput === undefined ? null : JSON.stringify(trace.parsedOutput),
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
      parsedOutput: row.parsedOutput === null ? undefined : JSON.parse(row.parsedOutput),
      model: row.model ?? undefined,
      promptTokens: row.promptTokens ?? undefined,
      completionTokens: row.completionTokens ?? undefined,
      createdAt: row.createdAt,
    }));
  }
}
