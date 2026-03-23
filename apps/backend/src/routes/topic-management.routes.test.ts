import test from 'node:test';
import assert from 'node:assert/strict';

import Fastify from 'fastify';

import { TopicManagementController } from '../controllers/topic-management.controller.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTopicManagementRepository } from '../repositories/topic-management.repository.js';
import { registerTopicManagementRoutes } from './topic-management.js';
import { TopicManagementService } from '../services/topic-management.service.js';

async function makeApp() {
  const repository = new InMemoryTopicManagementRepository();
  const literatureRepository = new InMemoryLiteratureRepository();
  const paperCalls: unknown[] = [];
  const paperProjects = {
    async createPaperProject(input: unknown) {
      paperCalls.push(input);
      return { paper_id: 'paper_001' };
    },
    async deletePaperProject() {},
  };
  await literatureRepository.createLiterature({
    id: 'lit_001',
    title: 'Seed literature',
    abstractText: 'Seed abstract',
    keyContentDigest: null,
    authors: ['Author A'],
    year: 2024,
    doiNormalized: '10.1000/seed',
    arxivId: null,
    normalizedTitle: 'seed literature',
    titleAuthorsYearHash: null,
    rightsClass: 'OA',
    tags: ['rag'],
    activeEmbeddingVersionId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const service = new TopicManagementService(repository, paperProjects, {
    findLiteratureById: (literatureId) => literatureRepository.findLiteratureById(literatureId),
    listLiteratures: () => literatureRepository.listLiteratures(),
    listSourcesByLiteratureId: (literatureId) => literatureRepository.listSourcesByLiteratureId(literatureId),
    listPipelineStatesByLiteratureIds: (literatureIds) => literatureRepository.listPipelineStatesByLiteratureIds(literatureIds),
  });
  const controller = new TopicManagementController(service);
  const app = Fastify();
  await registerTopicManagementRoutes(app, controller);
  return { app, repository, paperCalls, service };
}

function needPayload() {
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
    evidence_refs: [{ literature_id: 'lit_001', source_type: 'abstract' }],
  };
}

function valuePayload(researchQuestionId: string) {
  const gate = { pass: true, reason: 'Passes current threshold.' };
  const dim = { score: 4, reason: 'Competitive and defensible.', confidence: 0.8 };
  return {
    research_question_id: researchQuestionId,
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

async function createTitleCard(app: Awaited<ReturnType<typeof makeApp>>['app']) {
  const titleCardRes = await app.inject({
    method: 'POST',
    url: '/title-cards',
    payload: {
      working_title: 'Robust Retrieval for Literature Reasoning',
      brief: 'A working title card.',
    },
  });
  assert.equal(titleCardRes.statusCode, 201);
  const titleCard = titleCardRes.json() as { title_card_id: string };

  const basketRes = await app.inject({
    method: 'PATCH',
    url: `/title-cards/${titleCard.title_card_id}/evidence-basket`,
    payload: { add_literature_ids: ['lit_001'] },
  });
  assert.equal(basketRes.statusCode, 200);
  return titleCard;
}

test('GET /title-cards/:titleCardId rejects short id', async () => {
  const { app } = await makeApp();
  await app.ready();
  const response = await app.inject({ method: 'GET', url: '/title-cards/ab' });
  assert.equal(response.statusCode, 400);
  await app.close();
});

test('GET evidence candidates returns items array', async () => {
  const { app } = await makeApp();
  await app.ready();
  const titleCard = await createTitleCard(app);
  const response = await app.inject({
    method: 'GET',
    url: `/title-cards/${titleCard.title_card_id}/evidence-candidates?selection_state=selected`,
  });
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray((response.json() as { items: unknown }).items));
  await app.close();
});

test('POST /title-cards/:titleCardId/research-questions rejects payload without upstream sources at schema layer', async () => {
  const { app } = await makeApp();
  await app.ready();
  const titleCard = await createTitleCard(app);

  const response = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/research-questions`,
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

test('POST /title-cards/:titleCardId/promotion-decisions rejects loopback without loopback_target', async () => {
  const { app } = await makeApp();
  await app.ready();
  const titleCard = await createTitleCard(app);

  const response = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/promotion-decisions`,
    payload: {
      research_question_id: 'research_question_001',
      value_assessment_id: 'value_001',
      decision: 'loopback',
      reason_summary: 'Need to return to an earlier stage.',
      created_by: 'llm',
    },
  });

  assert.equal(response.statusCode, 400);
  await app.close();
});

test('full HTTP flow can promote a title card to paper project', async () => {
  const { app, paperCalls } = await makeApp();
  await app.ready();
  const titleCard = await createTitleCard(app);

  const needRes = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/needs`,
    payload: needPayload(),
  });
  assert.equal(needRes.statusCode, 201);
  const need = needRes.json() as { need_id: string };

  const questionRes = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/research-questions`,
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_need_ids: [need.need_id],
      judgement_summary: 'Question derived from validated robustness need.',
      confidence: 0.81,
    },
  });
  assert.equal(questionRes.statusCode, 201);
  const question = questionRes.json() as { research_question_id: string };

  const valueRes = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/value-assessments`,
    payload: valuePayload(question.research_question_id),
  });
  assert.equal(valueRes.statusCode, 201);
  const value = valueRes.json() as { value_assessment_id: string };

  const packageRes = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/packages`,
    payload: {
      research_question_id: question.research_question_id,
      value_assessment_id: value.value_assessment_id,
      title_candidates: ['Robust Long-Context Retrieval for Literature Reasoning'],
      research_background: 'Prior work does not adequately stabilize retrieval under long-context reasoning workflows.',
      contribution_summary: 'A robust retrieval approach plus targeted evaluation.',
      candidate_methods: ['adaptive retrieval', 'context compression'],
      evaluation_plan: 'Compare against strong retrieval baselines on long-context literature QA.',
      selected_literature_evidence_ids: ['lit_001'],
    },
  });
  assert.equal(packageRes.statusCode, 201);
  const pkg = packageRes.json() as { package_id: string };

  const promoteRes = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/promote-to-paper-project`,
    payload: {
      research_question_id: question.research_question_id,
      value_assessment_id: value.value_assessment_id,
      package_id: pkg.package_id,
      title: 'Robust Retrieval for Literature Reasoning',
      created_by: 'hybrid',
    },
  });
  assert.equal(promoteRes.statusCode, 201);
  const promoteBody = promoteRes.json() as { paper_id: string; decision_id: string };
  assert.ok(promoteBody.paper_id);
  assert.ok(promoteBody.decision_id);
  assert.equal(paperCalls.length, 1);
  await app.close();
});
