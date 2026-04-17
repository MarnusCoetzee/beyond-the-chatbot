import { Injectable, Optional, Inject } from '@nestjs/common';
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

export const DB_PATH_TOKEN = 'DB_PATH';

@Injectable()
export class SessionRepository {
  private db: Database.Database;

  constructor(@Optional() @Inject(DB_PATH_TOKEN) dbPath?: string) {
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
    this.db
      .prepare('INSERT INTO sessions (id, data) VALUES (?, ?)')
      .run(session.id, JSON.stringify(session));
  }

  getById(id: string): Session | undefined {
    const row = this.db
      .prepare('SELECT data FROM sessions WHERE id = ?')
      .get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Session) : undefined;
  }

  list(): SessionListItem[] {
    const rows = this.db
      .prepare(
        "SELECT data FROM sessions ORDER BY json_extract(data, '$.createdAt') DESC",
      )
      .all() as { data: string }[];
    return rows.map((row) => {
      const session = JSON.parse(row.data) as Session;
      const totalDuration = session.stageMetadata.reduce(
        (sum, m) => sum + (m.durationMs ?? 0),
        0,
      );
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
    this.db
      .prepare('UPDATE sessions SET data = ? WHERE id = ?')
      .run(JSON.stringify(session), session.id);
  }
}
