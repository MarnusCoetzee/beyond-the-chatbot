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
    expect(retrieved?.question).toBe('React vs Angular?');
    expect(retrieved?.status).toBe('IDLE');
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
    expect(retrieved?.status).toBe('RESEARCHING');
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
    expect(retrieved?.events.length).toBe(1);
    expect(retrieved?.events[0].type).toBe('research_started');
  });
});
