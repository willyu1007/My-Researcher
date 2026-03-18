import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryTopicManagementRepository } from '../repositories/topic-management.repository.js';
import { TopicManagementInvariantError, TopicManagementService } from './topic-management.service.js';
import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
} from '@paper-engineering-assistant/shared';

function makeEvidenceRef() {
  return [{ literature_id: 'lit_001', source_type: 'abstract' as const, note: 'seed evidence' }];
}

function makeNeedInput(overrides: Partial<CreateNeedReviewRequest> = {}): CreateNeedReviewRequest {
  return {
    need_statement: 'Existing methods degrade sharply under long-context retrieval settings.',
    who_needs_it: 'RAG researchers',
    scenario: 'Long-context retrieval and answer synthesis for CS literature tasks.',
    evidence_review_refs: [{ record_id: 'er_001', record_type: 'evidence_review' }],
    literature_ids: ['lit_001'],
    unmet_need_category: 'robustness',
    falsification_verdict: 'validated',
    significance_score: 4,
    measurability_score: 4,
    feasibility_signal: 'medium',
    validated_need: true,
    judgement_summary: 'The need is measurable and not already fully solved.',
    confidence: 0.82,
    evidence_refs: makeEvidenceRef(),
    ...overrides,
  };
}

function makeQuestionInput(overrides: Partial<CreateTopicQuestionRequest> = {}): CreateTopicQuestionRequest {
  return {
    main_question: 'How can retrieval remain stable under long-context literature reasoning?',
    research_slice: 'robust long-context retrieval',
    contribution_hypothesis: 'method',
    source_need_review_ids: ['need_001'],
    judgement_summary: 'Question derived from validated robustness need.',
    confidence: 0.81,
    ...overrides,
  };
}

function makeValueInput(overrides: Partial<CreateTopicValueAssessmentRequest> = {}): CreateTopicValueAssessmentRequest {
  const gate = { pass: true, reason: 'Passes current threshold.' };
  const dim = { score: 4, reason: 'Competitive and defensible.', confidence: 0.8 };
  return {
    strongest_claim_if_success: 'The method improves long-context retrieval robustness under realistic baselines.',
    hard_gates: {
      significance: gate,
      originality: gate,
      answerability: gate,
      feasibility: gate,
      venue_fit: gate,
    },
    scored_dimensions: {
      significance: dim,
      originality: dim,
      claim_strength: dim,
      answerability: dim,
      venue_fit: dim,
      strategic_leverage: dim,
    },
    risk_penalty: {
      data_risk: 1,
      compute_risk: 1,
      baseline_risk: 2,
      execution_risk: 2,
      ethics_risk: 0,
      penalty_summary: 'Manageable implementation risk.',
    },
    ceiling_case: 'Strong workshop or findings paper.',
    base_case: 'Useful empirical paper.',
    floor_case: 'Internal benchmark asset.',
    verdict: 'promote',
    total_score: 82,
    judgement_summary: 'Value is sufficient for promotion if package aligns.',
    confidence: 0.78,
    evidence_refs: makeEvidenceRef(),
    ...overrides,
  };
}

function makePackageInput(overrides: Partial<CreateTopicPackageRequest> = {}): CreateTopicPackageRequest {
  return {
    title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
    research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
    contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
    candidate_methods: ['adaptive retrieval', 'context compression'],
    evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
    selected_literature_evidence_ids: ['evidence_001'],
    ...overrides,
  };
}

function createService() {
  const repository = new InMemoryTopicManagementRepository();
  const calls: Array<{ topic_id: string; title: string; initial_context: { literature_evidence_ids: string[] } }> = [];
  const paperProjects = {
    async createPaperProject(input: {
      topic_id: string;
      title: string;
      research_direction?: string;
      created_by: 'human' | 'hybrid';
      initial_context: { literature_evidence_ids: string[] };
    }) {
      calls.push({ topic_id: input.topic_id, title: input.title, initial_context: input.initial_context });
      return { paper_id: 'paper_001' };
    },
  };

  return {
    service: new TopicManagementService(repository, paperProjects),
    repository,
    calls,
  };
}

test('createNeedReview rejects empty literature_ids', async () => {
  const { service } = createService();

  await assert.rejects(
    () => service.createNeedReview('topic_001', makeNeedInput({ literature_ids: [] })),
    (error: unknown) =>
      error instanceof TopicManagementInvariantError && error.message.includes('at least one literature record'),
  );
});

test('createQuestion rejects when no upstream sources are provided', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.createQuestion('topic_001', makeQuestionInput({ source_need_review_ids: [], source_evidence_review_ids: [] })),
    (error: unknown) =>
      error instanceof TopicManagementInvariantError && error.message.includes('must reference at least one upstream'),
  );
});

test('createValueAssessment rejects promote verdict when any hard gate fails', async () => {
  const { service } = createService();
  const input = makeValueInput({
    hard_gates: {
      significance: { pass: true, reason: 'ok' },
      originality: { pass: false, reason: 'not sufficiently distinct' },
      answerability: { pass: true, reason: 'ok' },
      feasibility: { pass: true, reason: 'ok' },
      venue_fit: { pass: true, reason: 'ok' },
    },
  });

  await assert.rejects(
    () => service.createValueAssessment('topic_001', 'question_001', input),
    (error: unknown) =>
      error instanceof TopicManagementInvariantError && error.message.includes('cannot be promote'),
  );
});

test('createTopicPackage rejects when value assessment is not aligned to the same question', async () => {
  const { service } = createService();
  const question = await service.createQuestion('topic_001', makeQuestionInput());
  const value = await service.createValueAssessment('topic_001', question.record_id, makeValueInput());

  await assert.rejects(
    () => service.createTopicPackage('topic_001', 'question_other', value.record_id, makePackageInput()),
    (error: unknown) =>
      error instanceof TopicManagementInvariantError && error.message.includes('same question'),
  );
});

test('promoteTopicToPaperProject forwards literature evidence ids and persists promotion decision', async () => {
  const { service, repository, calls } = createService();
  const need = await service.createNeedReview('topic_001', makeNeedInput());
  const question = await service.createQuestion('topic_001', makeQuestionInput({ source_need_review_ids: [need.record_id] }));
  const value = await service.createValueAssessment('topic_001', question.record_id, makeValueInput());
  const pkg = await service.createTopicPackage('topic_001', question.record_id, value.record_id, makePackageInput());

  const result = await service.promoteTopicToPaperProject('topic_001', {
    question_id: question.record_id,
    value_assessment_id: value.record_id,
    package_id: pkg.record_id,
    title: 'Robust Retrieval for Literature Reasoning',
    created_by: 'hybrid',
  });

  assert.equal(result.paper_id, 'paper_001');
  assert.match(result.decision_id, /^decision_/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].initial_context.literature_evidence_ids, ['evidence_001']);

  const decision = await repository.createPromotionDecision('topic_001', {
    question_id: question.record_id,
    value_assessment_id: value.record_id,
    package_id: pkg.record_id,
    decision: 'hold',
    reason_summary: 'sanity check direct repository access',
    created_by: 'human',
  });
  assert.equal(decision.decision, 'hold');
});

test('promoteTopicToPaperProject rejects when selected evidence ids are empty', async () => {
  const { service } = createService();
  const need = await service.createNeedReview('topic_001', makeNeedInput());
  const question = await service.createQuestion('topic_001', makeQuestionInput({ source_need_review_ids: [need.record_id] }));
  const value = await service.createValueAssessment('topic_001', question.record_id, makeValueInput());
  const pkg = await service.createTopicPackage(
    'topic_001',
    question.record_id,
    value.record_id,
    makePackageInput({ selected_literature_evidence_ids: [] }),
  );

  await assert.rejects(
    () =>
      service.promoteTopicToPaperProject('topic_001', {
        question_id: question.record_id,
        value_assessment_id: value.record_id,
        package_id: pkg.record_id,
        title: 'Robust Retrieval for Literature Reasoning',
        created_by: 'human',
      }),
    (error: unknown) =>
      error instanceof TopicManagementInvariantError &&
      error.message.includes('at least one selected literature evidence id'),
  );
});
