import test from 'node:test';
import assert from 'node:assert/strict';

import Fastify from 'fastify';

import { TitleCardManagementController } from '../controllers/title-card-management.controller.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { registerTitleCardManagementRoutes } from './title-card-management.js';
import { TitleCardManagementService } from '../services/title-card-management.service.js';

async function makeApp() {
  const repository = new InMemoryTitleCardManagementRepository();
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
  const service = new TitleCardManagementService(repository, paperProjects, {
    findLiteratureById: (literatureId) => literatureRepository.findLiteratureById(literatureId),
    listLiteratures: () => literatureRepository.listLiteratures(),
    listSourcesByLiteratureId: (literatureId) => literatureRepository.listSourcesByLiteratureId(literatureId),
    listPipelineStatesByLiteratureIds: (literatureIds) => literatureRepository.listPipelineStatesByLiteratureIds(literatureIds),
  });
  const controller = new TitleCardManagementController(service);
  const app = Fastify();
  await registerTitleCardManagementRoutes(app, controller);
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

test('legacy semantic routes reject valid writes before creating PaperProject authority', async () => {
  const { app, paperCalls } = await makeApp();
  await app.ready();
  const titleCard = await createTitleCard(app);

  const needResponse = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/needs`,
    payload: needPayload(),
  });
  assert.equal(needResponse.statusCode, 409);
  assert.deepEqual(needResponse.json().error.details, {
    canonical_recovery: '/topic-selection/title-cards/{titleCardId}/research-status',
    disabled_capability: 'need',
  });

  const promoteResponse = await app.inject({
    method: 'POST',
    url: `/title-cards/${titleCard.title_card_id}/promote-to-paper-project`,
    payload: {
      research_question_id: 'research_question_001',
      value_assessment_id: 'value_001',
      package_id: 'package_001',
      title: 'Robust Retrieval for Literature Reasoning',
      created_by: 'hybrid',
    },
  });
  assert.equal(promoteResponse.statusCode, 409);
  assert.deepEqual(promoteResponse.json().error.details, {
    canonical_recovery: '/topic-selection/title-cards/{titleCardId}/research-status',
    disabled_capability: 'promotion',
  });
  assert.equal(paperCalls.length, 0);
  await app.close();
});
