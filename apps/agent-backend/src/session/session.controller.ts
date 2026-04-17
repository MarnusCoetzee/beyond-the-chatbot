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
    // Store config — pipeline starts when SSE client connects
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
