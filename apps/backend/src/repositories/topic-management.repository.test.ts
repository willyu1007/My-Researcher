import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryTopicManagementRepository } from './topic-management.repository.js';
import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
} from '@paper-engineering-assistant/shared';

function makeEvidenceRef() {
  return [{ literature_id: 'lit_001', source_type: 'abstract' as const, note: 'seed evidence' }];
}

function makeNeedInput(): CreateNeedReviewRequest {
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
  };
}

function makeQuestionInput(): CreateTopicQuestionRequest {
  return {
    main_question: 'How can retrieval remain stable under long-context literature reasoning?',
    research_slice: 'robust long-context retrieval',
    contribution_hypothesis: 'method',
    source_need_review_ids: ['need_001'],
    judgement_summary: 'Question derived from validated robustness need.',
    confidence: 0.81,
  };
}

function makeValueInput(): CreateTopicValueAssessmentRequest {
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
  };
}

function makePackageInput(): CreateTopicPackageRequest {
  return {
    title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
    research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
    contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
    candidate_methods: ['adaptive retrieval', 'context compression'],
    evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
    selected_literature_evidence_ids: ['evidence_001'],
  };
}

test('in-memory repository isolates need reviews by topic', async () => {
  const repo = new InMemoryTopicManagementRepository();

  await repo.createNeedReview('topic_A', makeNeedInput());
  await repo.createNeedReview('topic_B', { ...makeNeedInput(), literature_ids: ['lit_002'] });

  const topicA = await repo.listNeedReviews('topic_A');
  assert.equal(topicA.length, 1);
  assert.equal(topicA[0].topic_id, 'topic_A');
});

test('in-memory repository stores promotion decisions with promoted paper id', async () => {
  const repo = new InMemoryTopicManagementRepository();

  const decision = await repo.createPromotionDecision('topic_A', {
    question_id: 'question_001',
    value_assessment_id: 'value_001',
    package_id: 'package_001',
    decision: 'promote',
    reason_summary: 'All gates pass and package is aligned.',
    target_paper_title: 'Robust Retrieval Paper',
    created_by: 'hybrid',
    promotedPaperId: 'paper_123',
  } satisfies CreateTopicPromotionDecisionRequest & { promotedPaperId?: string });

  assert.equal(decision.promoted_paper_id, 'paper_123');
  assert.equal(decision.decision, 'promote');
});

test('in-memory repository stores and retrieves value assessments and topic packages', async () => {
  const repo = new InMemoryTopicManagementRepository();
  const question = await repo.createQuestion('topic_A', makeQuestionInput());
  const value = await repo.createValueAssessment('topic_A', question.record_id, makeValueInput());
  const pkg = await repo.createTopicPackage('topic_A', question.record_id, value.record_id, makePackageInput());

  const fetchedValue = await repo.getValueAssessment('topic_A', value.record_id);
  const fetchedPackage = await repo.getTopicPackage('topic_A', pkg.record_id);

  assert.ok(fetchedValue);
  assert.ok(fetchedPackage);
  assert.deepEqual(fetchedPackage?.selected_literature_evidence_ids, ['evidence_001']);
});
