import test from 'node:test';
import assert from 'node:assert/strict';

import Fastify from 'fastify';

import { TopicManagementController } from '../controllers/topic-management.controller.js';
import { InMemoryTopicManagementRepository } from '../repositories/topic-management.repository.js';
import { registerTopicManagementRoutes } from './topic-management.js';
import { TopicManagementService } from '../services/topic-management.service.js';

async function makeApp() {
  const repository = new InMemoryTopicManagementRepository();
  const paperCalls: unknown[] = [];
  const paperProjects = {
    async createPaperProject(input: unknown) {
      paperCalls.push(input);
      return { paper_id: 'paper_001' };
    },
  };
  const service = new TopicManagementService(repository, paperProjects);
  const controller = new TopicManagementController(service);
  const app = Fastify();
  await registerTopicManagementRoutes(app, controller);
  return { app, repository, paperCalls };
}

function needPayload() {
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
    evidence_refs: [{ literature_id: 'lit_001', source_type: 'abstract' }],
  };
}

function valuePayload() {
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
    evidence_refs: [{ literature_id: 'lit_001', source_type: 'abstract' }],
  };
}

test('POST /topics/:topicId/questions rejects payload without upstream sources at schema layer', async () => {
  const { app } = await makeApp();
  await app.ready();

  const response = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/questions',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      judgement_summary: 'Question derived from validated robustness need.',
      confidence: 0.81,
    },
  });

  assert.equal(response.statusCode, 400);
  await app.close();
});

test('POST /topics/:topicId/promotion-decisions rejects loopback without loopback_target', async () => {
  const { app } = await makeApp();
  await app.ready();

  const response = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/promotion-decisions',
    payload: {
      question_id: 'question_001',
      value_assessment_id: 'value_001',
      decision: 'loopback',
      reason_summary: 'Need to return to an earlier stage.',
      created_by: 'llm',
    },
  });

  assert.equal(response.statusCode, 400);
  await app.close();
});

test('full HTTP flow can promote a topic to paper project', async () => {
  const { app, paperCalls } = await makeApp();
  await app.ready();

  const needRes = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/need-reviews',
    payload: needPayload(),
  });
  assert.equal(needRes.statusCode, 201);
  const need = needRes.json() as { record_id: string };

  const questionRes = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/questions',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_need_review_ids: [need.record_id],
      judgement_summary: 'Question derived from validated robustness need.',
      confidence: 0.81,
    },
  });
  assert.equal(questionRes.statusCode, 201);
  const question = questionRes.json() as { record_id: string };

  const valueRes = await app.inject({
    method: 'POST',
    url: `/topics/topic_001/questions/${question.record_id}/value-assessments`,
    payload: valuePayload(),
  });
  assert.equal(valueRes.statusCode, 201);
  const value = valueRes.json() as { record_id: string };

  const packageRes = await app.inject({
    method: 'POST',
    url: `/topics/topic_001/questions/${question.record_id}/value-assessments/${value.record_id}/topic-package`,
    payload: {
      title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
      research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
      contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
      candidate_methods: ['adaptive retrieval', 'context compression'],
      evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
      selected_literature_evidence_ids: ['evidence_001'],
    },
  });
  assert.equal(packageRes.statusCode, 201);
  const pkg = packageRes.json() as { record_id: string };

  const promoteRes = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/promote-to-paper-project',
    payload: {
      question_id: question.record_id,
      value_assessment_id: value.record_id,
      package_id: pkg.record_id,
      title: 'Robust Retrieval for Literature Reasoning',
      created_by: 'hybrid',
    },
  });

  assert.equal(promoteRes.statusCode, 201);
  const promoted = promoteRes.json() as { paper_id: string; decision_id: string };
  assert.equal(promoted.paper_id, 'paper_001');
  assert.ok(promoted.decision_id);
  assert.equal(paperCalls.length, 1);

  await app.close();
});

test('service invariant failures are surfaced as 400 responses', async () => {
  const { app } = await makeApp();
  await app.ready();

  const needRes = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/need-reviews',
    payload: needPayload(),
  });
  const need = needRes.json() as { record_id: string };

  const questionRes = await app.inject({
    method: 'POST',
    url: '/topics/topic_001/questions',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_need_review_ids: [need.record_id],
      judgement_summary: 'Question derived from validated robustness need.',
      confidence: 0.81,
    },
  });
  const question = questionRes.json() as { record_id: string };

  const valueRes = await app.inject({
    method: 'POST',
    url: `/topics/topic_001/questions/${question.record_id}/value-assessments`,
    payload: valuePayload(),
  });
  const value = valueRes.json() as { record_id: string };

  const packageRes = await app.inject({
    method: 'POST',
    url: `/topics/topic_001/questions/question_other/value-assessments/${value.record_id}/topic-package`,
    payload: {
      title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
      research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
      contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
      candidate_methods: ['adaptive retrieval', 'context compression'],
      evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
      selected_literature_evidence_ids: ['evidence_001'],
    },
  });
  assert.equal(packageRes.statusCode, 400);
  assert.match(packageRes.body, /same question/i);

  await app.close();
});
