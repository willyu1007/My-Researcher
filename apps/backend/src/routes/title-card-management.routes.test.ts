import test from 'node:test';
import assert from 'node:assert/strict';

import Fastify from 'fastify';

import { TitleCardManagementController } from '../controllers/title-card-management.controller.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { registerTitleCardManagementRoutes } from './title-card-management.js';
import { TitleCardManagementService } from '../services/title-card-management.service.js';
import type { TitleCardListResponse } from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import { TopicSelectionResearchCheckpointController } from '../controllers/topic-selection-research-checkpoint-controller.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from '../services/topic-selection-research-checkpoint-service.js';
import { registerTopicSelectionResearchCheckpointRoutes } from './topic-selection-research-checkpoint-routes.js';

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
  const checkpoints = new TopicSelectionResearchCheckpointService(
    new InMemoryTopicSelectionResearchCheckpointRepository(),
    new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository()),
  );
  const service = new TitleCardManagementService(repository, paperProjects, {
    findLiteratureById: (literatureId) => literatureRepository.findLiteratureById(literatureId),
    listLiteratures: () => literatureRepository.listLiteratures(),
    listSourcesByLiteratureId: (literatureId) => literatureRepository.listSourcesByLiteratureId(literatureId),
    listPipelineStatesByLiteratureIds: (literatureIds) => literatureRepository.listPipelineStatesByLiteratureIds(literatureIds),
  }, checkpoints);
  const controller = new TitleCardManagementController(service);
  const app = Fastify();
  await registerTitleCardManagementRoutes(app, controller);
  await registerTopicSelectionResearchCheckpointRoutes(app, new TopicSelectionResearchCheckpointController(checkpoints));
  return { app, repository, paperCalls, service, checkpoints };
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

test('Human checkpoint rejection is shared by title list, detail and research status without affecting a replacement card', async () => {
  const { app, checkpoints, repository } = await makeApp();
  try {
    const create = async (workingTitle: string) => {
      const response = await app.inject({ method: 'POST', url: '/title-cards', payload: {
        working_title: workingTitle, brief: 'Rejection and replacement fixture', status: 'active',
      } });
      assert.equal(response.statusCode, 201, response.body);
      return response.json<{ title_card_id: string }>().title_card_id;
    };
    const rejectedId = await create('Rejected research');
    await repository.createPackage(rejectedId, {
      research_question_id: 'historical_question', value_assessment_id: 'historical_value',
      title_candidates: ['Historical package'], research_background: 'Existing management record',
      contribution_summary: 'Prior proposal', candidate_methods: [], evaluation_plan: 'Prior plan',
      selected_literature_evidence_ids: [],
    });
    assert.equal((await app.inject({ method: 'GET', url: '/title-cards' })).json().summary.pending_promotion_cards, 1);
    const checkpoint = await checkpoints.materializeCheckpoint({
      title_card_id: rejectedId,
      checkpoint_kind: 'evidence_landscape',
      target_ref: { ref_type: 'evidence_map', ref_id: 'evidence_rejected', title_card_id: rejectedId },
      target_snapshot_hash: 'a'.repeat(64),
      allowed_actions: ['advance', 'reject', 'hold', 'loopback'],
      packet_payload: {},
    });
    const rejectRequest = {
      method: 'POST' as const,
      url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/decisions`,
      payload: {
        decision_key: 'reject_original_topic', decision: 'reject',
        actor: { actor_type: 'human', actor_id: 'reviewer_1' },
        confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
        rationale: 'Existing work already answers this question.',
        review_payload: {
          review_kind: 'evidence_landscape', nearest_work_reviewed: true,
          disconfirming_evidence_reviewed: true, source_quality_reviewed: true, limitations: [],
        },
      },
    };
    const decision = await app.inject(rejectRequest);
    assert.equal(decision.statusCode, 201, decision.body);
    const replacementId = await create('Independent replacement research');
    const detail = await app.inject({ method: 'GET', url: `/title-cards/${rejectedId}` });
    const list = await app.inject({ method: 'GET', url: '/title-cards' });
    const status = await app.inject({ method: 'GET', url: `/topic-selection/title-cards/${rejectedId}/research-status` });
    for (const response of [detail, list, status]) assert.equal(response.statusCode, 200, response.body);
    const rejection = detail.json().research_rejection;
    assert.equal(rejection.decision_ref.ref_id, decision.json().research_checkpoint_decision_id);
    assert.equal(rejection.rationale, rejectRequest.payload.rationale);
    assert.deepEqual(status.json().research_rejection, rejection);
    const body = list.json<TitleCardListResponse>();
    assert.deepEqual(body.items.find((item) => item.title_card_id === rejectedId)?.research_rejection, rejection);
    assert.equal(body.items.find((item) => item.title_card_id === replacementId)?.research_rejection, null);
    assert.equal(body.summary.active_title_cards, 1);
    assert.equal(body.summary.total_title_cards, 2);
    assert.equal(body.summary.pending_promotion_cards, 0);
    assert.equal(detail.json().package_count, 1);
    assert.equal(detail.json().status, 'active');
    assert.equal((await repository.getTitleCard(rejectedId))?.status, 'active');
    assert.deepEqual((await app.inject(rejectRequest)).json(), decision.json());
    assert.equal((await checkpoints.listCheckpoints(replacementId)).length, 0);
  } finally {
    await app.close();
  }
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
