import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryTitleCardManagementRepository } from './title-card-management.repository.js';
import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';

function makeEvidenceRef() {
  return [{ literature_id: 'lit_001', source_type: 'abstract' as const, note: 'seed evidence' }];
}

function makeTitleCardInput(): CreateTitleCardRequest {
  return {
    working_title: 'Robust Retrieval for Literature Reasoning',
    brief: 'A reusable title card for robust retrieval investigation.',
  };
}

function makeNeedInput(): CreateNeedReviewRequest {
  return {
    need_statement: 'Existing methods degrade sharply under long-context retrieval settings.',
    who_needs_it: 'RAG researchers',
    scenario: 'Long-context retrieval and answer synthesis for CS literature tasks.',
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

function makeQuestionInput(): CreateResearchQuestionRequest {
  return {
    main_question: 'How can retrieval remain stable under long-context literature reasoning?',
    research_slice: 'robust long-context retrieval',
    contribution_hypothesis: 'method',
    source_need_ids: ['need_001'],
    judgement_summary: 'Question derived from validated robustness need.',
    confidence: 0.81,
  };
}

function makeValueInput(): CreateValueAssessmentRequest {
  const gate = { pass: true, reason: 'Passes current threshold.' };
  const dim = { score: 4, reason: 'Competitive and defensible.', confidence: 0.8 };
  return {
    research_question_id: 'research_question_001',
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

function makePackageInput(): CreatePackageRequest {
  return {
    research_question_id: 'research_question_001',
    value_assessment_id: 'value_001',
    title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
    research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
    contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
    candidate_methods: ['adaptive retrieval', 'context compression'],
    evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
    selected_literature_evidence_ids: ['lit_001'],
  };
}

test('in-memory repository stores title cards and evidence basket separately', async () => {
  const repo = new InMemoryTitleCardManagementRepository();

  const card = await repo.createTitleCard(makeTitleCardInput());
  await repo.updateEvidenceBasket(card.title_card_id, { add_literature_ids: ['lit_001'] });

  const cards = await repo.listTitleCards();
  const basket = await repo.getEvidenceBasket(card.title_card_id);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].title_card_id, card.title_card_id);
  assert.deepEqual(basket.items.map((item) => item.literature_id), ['lit_001']);
  assert.equal(typeof basket.items[0]?.selected_at, 'string');
});

test('in-memory repository stores promotion decisions with promoted paper id', async () => {
  const repo = new InMemoryTitleCardManagementRepository();
  const card = await repo.createTitleCard(makeTitleCardInput());

  const decision = await repo.createPromotionDecision(card.title_card_id, {
    research_question_id: 'research_question_001',
    value_assessment_id: 'value_001',
    package_id: 'package_001',
    decision: 'promote',
    reason_summary: 'All gates pass and package is aligned.',
    target_paper_title: 'Robust Retrieval Paper',
    created_by: 'hybrid',
    promoted_paper_id: 'paper_123',
  } satisfies CreatePromotionDecisionRequest & { promoted_paper_id?: string });

  assert.equal(decision.promoted_paper_id, 'paper_123');
  assert.equal(decision.decision, 'promote');
});

test('in-memory repository stores and retrieves value assessments and packages under title card', async () => {
  const repo = new InMemoryTitleCardManagementRepository();
  const card = await repo.createTitleCard(makeTitleCardInput());
  const question = await repo.createResearchQuestion(card.title_card_id, makeQuestionInput());
  const value = await repo.createValueAssessment(card.title_card_id, {
    ...makeValueInput(),
    research_question_id: question.research_question_id,
  });
  const pkg = await repo.createPackage(card.title_card_id, {
    ...makePackageInput(),
    research_question_id: question.research_question_id,
    value_assessment_id: value.value_assessment_id,
  });

  const fetchedValue = await repo.getValueAssessment(card.title_card_id, value.value_assessment_id);
  const fetchedPackage = await repo.getPackage(card.title_card_id, pkg.package_id);

  assert.ok(fetchedValue);
  assert.ok(fetchedPackage);
  assert.deepEqual(fetchedPackage?.selected_literature_evidence_ids, ['lit_001']);
  assert.equal((await repo.listPackages(card.title_card_id)).length, 1);
});

test('in-memory repository isolates need reviews by title card', async () => {
  const repo = new InMemoryTitleCardManagementRepository();
  const cardA = await repo.createTitleCard({ working_title: 'A', brief: 'a' });
  const cardB = await repo.createTitleCard({ working_title: 'B', brief: 'b' });

  await repo.createNeedReview(cardA.title_card_id, makeNeedInput());
  await repo.createNeedReview(cardB.title_card_id, { ...makeNeedInput(), literature_ids: ['lit_002'] });

  const cardANeeds = await repo.listNeedReviews(cardA.title_card_id);
  assert.equal(cardANeeds.length, 1);
  assert.equal(cardANeeds[0].title_card_id, cardA.title_card_id);
});
