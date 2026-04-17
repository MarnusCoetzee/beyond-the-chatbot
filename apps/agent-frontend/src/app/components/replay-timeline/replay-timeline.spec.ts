import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReplayTimelineComponent } from './replay-timeline';
import type { Session, LlmTrace } from '@consensus-lab/shared-types';

const fixtureSession: Session = {
  id: 'sess-1',
  question: 'Angular vs React?',
  status: 'COMPLETE',
  createdAt: '2026-04-17T10:00:00.000Z',
  events: [],
  stageMetadata: [],
  researchPacket: {
    question: 'Angular vs React?',
    options: ['Angular', 'React'],
    evaluationCriteria: [],
    claims: [],
    optionSummaries: {},
    webSources: [],
    gaps: [],
  },
  analyses: [
    {
      agentId: 'pragmatist',
      role: 'pragmatist',
      round: 1,
      recommendation: 'React',
      topReasons: ['r1'],
      risks: [],
      confidence: 80,
      strongestCounterargument: 'c',
      evidenceRefs: [],
    },
  ],
  disagreements: [],
  challengePrompts: [],
  rebuttals: [],
  verdict: {
    decisionType: 'single_winner',
    primaryRecommendation: 'React',
    reasoning: 'because',
    tradeoffs: [],
    whenAlternativeIsBetter: [],
    evidenceUsed: [],
    finalConfidence: 85,
  },
};

describe('ReplayTimelineComponent', () => {
  let fixture: ComponentFixture<ReplayTimelineComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReplayTimelineComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplayTimelineComponent);
    fixture.componentRef.setInput('session', fixtureSession);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders a stage card for research, each analysis, and the verdict', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Research');
    expect(el.textContent).toContain('pragmatist');
    expect(el.textContent).toContain('Final Verdict');
  });

  it('fetches traces lazily on first expand and caches them', () => {
    const component = fixture.componentInstance;

    component.expandTrace('agent-analysis', 'pragmatist');

    const req = httpMock.expectOne('http://localhost:3000/api/sessions/sess-1/traces');
    const trace: LlmTrace = {
      id: 'tr-1',
      sessionId: 'sess-1',
      stage: 'agent-analysis',
      actorId: 'pragmatist',
      systemPrompt: 'sys',
      userPrompt: 'usr',
      rawResponse: 'raw',
      parsedOutput: { recommendation: 'React' },
      model: 'm',
      createdAt: '2026-04-17T10:00:01.000Z',
    };
    req.flush([trace]);

    expect(component.getTrace('agent-analysis', 'pragmatist')).toEqual(trace);

    component.expandTrace('agent-analysis', 'pragmatist');
    httpMock.expectNone('http://localhost:3000/api/sessions/sess-1/traces');
  });
});
