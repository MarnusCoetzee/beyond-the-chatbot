import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus, ConflictException, NotFoundException } from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { v4 as uuidv4 } from 'uuid';
import type { Session, CreateSessionResponse, SessionListItem } from '@consensus-lab/shared-types';

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
