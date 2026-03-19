import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  createNeedReviewRequestSchema,
  createTopicPromotionDecisionRequestSchema,
  createTopicQuestionRequestSchema,
} from './topic-management-contracts.js';
import * as autoPullContracts from './auto-pull-contracts.js';
import * as compatibilityBarrel from './interface-field-contracts.js';
import * as literatureContracts from './literature-contracts.js';
import * as paperProjectContracts from './paper-project-contracts.js';
import * as researchLifecycleCoreContracts from './research-lifecycle-core-contracts.js';
import type {
  CreateAutoPullRunRequest,
  LiteraturePipelineRunDTO,
  PaperLiteratureLinkView,
  ReleaseGateReviewResponse,
  StageGateVerifyRequest,
  TopicProfileDTO,
  UpdatePaperLiteratureLinkResponse,
} from './interface-field-contracts.js';

const compatTypeSmoke:
  | [
      StageGateVerifyRequest,
      ReleaseGateReviewResponse,
      PaperLiteratureLinkView,
      UpdatePaperLiteratureLinkResponse,
      CreateAutoPullRunRequest,
      TopicProfileDTO,
      LiteraturePipelineRunDTO,
    ]
  | null = null;

void compatTypeSmoke;

test('topic management schema loads', () => {
  assert.ok(createTopicQuestionRequestSchema);
  assert.ok(createTopicPromotionDecisionRequestSchema);
});

test('validate with trivial schema', async () => {
  const app = Fastify();
  app.post('/v', { schema: { body: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } } }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({ method: 'POST', url: '/v', payload: { x: 'ok' } });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('need review schema accepts payload without evidence_review_refs', async () => {
  const app = Fastify();
  app.post('/v', { schema: createNeedReviewRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
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
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('question schema requires at least one upstream source array', async () => {
  const app = Fastify();
  app.post('/v', { schema: createTopicQuestionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      judgement_summary: 'Question derived from validated robustness need.',
      confidence: 0.81,
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('promotion decision schema requires package_id and target_paper_title for promote verdict', async () => {
  const app = Fastify();
  app.post('/v', { schema: createTopicPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      question_id: 'question_001',
      value_assessment_id: 'value_001',
      decision: 'promote',
      reason_summary: 'All gates pass.',
      created_by: 'hybrid',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('promotion decision schema requires loopback_target for loopback verdict', async () => {
  const app = Fastify();
  app.post('/v', { schema: createTopicPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      question_id: 'question_001',
      value_assessment_id: 'value_001',
      decision: 'loopback',
      reason_summary: 'Need more evidence.',
      created_by: 'llm',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('promotion decision schema accepts valid promote payload', async () => {
  const app = Fastify();
  app.post('/v', { schema: createTopicPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      question_id: 'question_001',
      value_assessment_id: 'value_001',
      package_id: 'package_001',
      decision: 'promote',
      reason_summary: 'All gates pass and the package is aligned.',
      target_paper_title: 'Robust Retrieval for Literature Reasoning',
      created_by: 'hybrid',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('interface-field-contracts barrel re-exports the runtime value surface of split modules', () => {
  const expectedKeys = new Set([
    ...Object.keys(researchLifecycleCoreContracts),
    ...Object.keys(paperProjectContracts),
    ...Object.keys(literatureContracts),
    ...Object.keys(autoPullContracts),
  ]);

  assert.deepEqual(Object.keys(compatibilityBarrel).sort(), [...expectedKeys].sort());
});

test('interface-field-contracts barrel keeps key contract helpers and schemas reachable', () => {
  assert.equal([...compatibilityBarrel.AUTO_PULL_SOURCES].includes('ZOTERO'), true);
  assert.equal([...compatibilityBarrel.LITERATURE_PIPELINE_STAGE_CODES].includes('INDEXED'), true);
  assert.equal(
    compatibilityBarrel.validateNoM6OverrideContext({
      candidate_node_ids: ['node-1'],
      config_version: 'cfg-1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
      override_context: {
        skip_m6_reason: 'manual policy override',
        training_claim_allowed: false,
      },
    }).ok,
    true,
  );
  assert.ok(compatibilityBarrel.createPaperProjectRequestSchema);
  assert.ok(compatibilityBarrel.literatureImportRequestSchema);
  assert.ok(compatibilityBarrel.createAutoPullRuleRequestSchema);
});
