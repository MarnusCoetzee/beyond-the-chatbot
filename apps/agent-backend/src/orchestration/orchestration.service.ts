import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
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
