import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  createNeedReviewRequestSchema,
  createPromotionDecisionRequestSchema,
  createResearchQuestionRequestSchema,
  createTitleCardRequestSchema,
} from './title-card-management-contracts.js';
import * as autoPullContracts from './auto-pull-contracts.js';
import * as literatureContracts from './literature-contracts.js';
import * as paperProjectContracts from './paper-project-contracts.js';
import * as researchArgumentContracts from './research-argument-contracts.js';
import * as researchLifecycleContracts from './index.js';
import * as researchLifecycleCoreContracts from './research-lifecycle-core-contracts.js';
import * as titleCardManagementContracts from './title-card-management-contracts.js';
import type {
  ReleaseGateReviewResponse,
  StageGateVerifyRequest,
} from './paper-project-contracts.js';
import type {
  LiteratureContentProcessingRunDTO,
  PaperLiteratureLinkView,
  UpdatePaperLiteratureLinkResponse,
} from './literature-contracts.js';
import type {
  CreateAutoPullRunRequest,
  TopicProfileDTO,
} from './auto-pull-contracts.js';
import type {
  ReadinessVerifyRequest,
  SubmissionRiskReport,
  WritingEntryPacket,
} from './research-argument-contracts.js';

const directModuleTypeSmoke:
  | [
      StageGateVerifyRequest,
      ReleaseGateReviewResponse,
      PaperLiteratureLinkView,
      UpdatePaperLiteratureLinkResponse,
      CreateAutoPullRunRequest,
      TopicProfileDTO,
      LiteratureContentProcessingRunDTO,
      ReadinessVerifyRequest,
      WritingEntryPacket,
      SubmissionRiskReport,
    ]
  | null = null;

void directModuleTypeSmoke;

test('title-card management schemas load', () => {
  assert.ok(createTitleCardRequestSchema);
  assert.ok(createResearchQuestionRequestSchema);
  assert.ok(createPromotionDecisionRequestSchema);
});

test('research-argument bridge schemas load', () => {
  assert.ok(researchArgumentContracts.seedWorkspaceFromTitleCardRequestSchema);
  assert.ok(researchArgumentContracts.readinessVerifyRequestSchema);
  assert.ok(researchArgumentContracts.decisionActionRequestSchema);
  assert.ok(researchArgumentContracts.promoteToPaperProjectRequestSchema);
  assert.ok(researchArgumentContracts.writingEntryPacketSchema);
  assert.ok(researchArgumentContracts.submissionRiskReportSchema);
});

test('validate with trivial schema', async () => {
  const app = Fastify();
  app.post('/v', { schema: { body: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } } }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({ method: 'POST', url: '/v', payload: { x: 'ok' } });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('title-card create schema accepts working_title and brief', async () => {
  const app = Fastify();
  app.post('/v', { schema: createTitleCardRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      working_title: 'Robust Retrieval for Literature Reasoning',
      brief: 'A working title card for robust retrieval direction.',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('research-argument readiness verify schema accepts canonical workspace_id', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.readinessVerifyRequestSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      workspace_id: 'raw_001',
      branch_id: 'branch_001',
      requested_by: 'human',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('research-argument readiness verify schema rejects legacy project_id', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.readinessVerifyRequestSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      project_id: 'raw_001',
      branch_id: 'branch_001',
      requested_by: 'human',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('writing entry packet schema accepts canonical payload', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.writingEntryPacketSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      packet_id: 'packet_001',
      workspace_id: 'raw_001',
      branch_id: 'branch_001',
      title_card_id: 'title_card_001',
      claim_summary: [
        {
          claim_id: 'claim_001',
          claim_text: 'The method improves retrieval robustness.',
          claim_strength: 'moderate',
          evidence_requirement_ids: ['er_001'],
          boundary_ids: ['boundary_001'],
        },
      ],
      evidence_summary: {
        evidence_item_ids: ['evidence_001'],
        mandatory_requirement_ids: ['er_001'],
        missing_requirement_ids: [],
      },
      baseline_protocol_repro_summary: {
        baseline_set_ids: ['baseline_001'],
        protocol_ids: ['protocol_001'],
        repro_item_ids: ['repro_001'],
        run_ids: ['run_001'],
        artifact_ids: ['artifact_001'],
      },
      source_trace_refs: [
        {
          source_kind: 'title_card',
          source_id: 'title_card_001',
        },
      ],
      object_pointers: [
        {
          pointer_kind: 'claim',
          object_id: 'claim_001',
        },
      ],
      report_pointers: [
        {
          report_kind: 'writing_entry',
          report_id: 'packet_001',
        },
      ],
      audit_ref: 'AUD-PACKET-001',
      created_at: '2026-03-31T00:00:00.000Z',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('writing entry packet schema rejects unsupported claim_strength', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.writingEntryPacketSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      packet_id: 'packet_001',
      workspace_id: 'raw_001',
      branch_id: 'branch_001',
      title_card_id: 'title_card_001',
      claim_summary: [
        {
          claim_id: 'claim_001',
          claim_text: 'The method improves retrieval robustness.',
          claim_strength: 'unsupported_strength',
          evidence_requirement_ids: ['er_001'],
          boundary_ids: ['boundary_001'],
        },
      ],
      evidence_summary: {
        evidence_item_ids: ['evidence_001'],
        mandatory_requirement_ids: ['er_001'],
        missing_requirement_ids: [],
      },
      baseline_protocol_repro_summary: {
        baseline_set_ids: ['baseline_001'],
        protocol_ids: ['protocol_001'],
        repro_item_ids: ['repro_001'],
        run_ids: ['run_001'],
        artifact_ids: ['artifact_001'],
      },
      source_trace_refs: [
        {
          source_kind: 'title_card',
          source_id: 'title_card_001',
        },
      ],
      object_pointers: [
        {
          pointer_kind: 'claim',
          object_id: 'claim_001',
        },
      ],
      report_pointers: [
        {
          report_kind: 'writing_entry',
          report_id: 'packet_001',
        },
      ],
      audit_ref: 'AUD-PACKET-001',
      created_at: '2026-03-31T00:00:00.000Z',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('submission risk report schema accepts canonical payload', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.submissionRiskReportSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      report_id: 'risk_001',
      workspace_id: 'raw_001',
      branch_id: 'branch_001',
      dimension_summary: [
        {
          dimension_name: 'EvaluationSoundness',
          level: 'Partial',
          score: 62,
          confidence: 0.8,
        },
      ],
      blockers: [
        {
          blocker_id: 'blocker_001',
          severity: 'high',
          summary: 'Strong baseline missing.',
        },
      ],
      missing_items: ['strong baseline'],
      findings: [
        {
          finding_id: 'finding_001',
          finding_group: 'evaluation_fairness',
          severity: 'high',
          detail: 'Strong baseline comparison is missing.',
          pointers: [
            {
              pointer_kind: 'baseline_set',
              object_id: 'baseline_001',
            },
          ],
        },
      ],
      report_pointers: [
        {
          report_kind: 'submission_risk',
          report_id: 'risk_001',
        },
      ],
      audit_ref: 'AUD-RISK-001',
      created_at: '2026-03-31T00:00:00.000Z',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('submission risk report schema rejects missing grouped risk vocabulary', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.submissionRiskReportSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      report_id: 'risk_001',
      workspace_id: 'raw_001',
      branch_id: 'branch_001',
      dimension_summary: [
        {
          dimension_name: 'EvaluationSoundness',
          level: 'Partial',
          score: 62,
          confidence: 0.8,
        },
      ],
      blockers: [
        {
          blocker_id: 'blocker_001',
          severity: 'high',
          summary: 'Strong baseline missing.',
        },
      ],
      missing_items: ['strong baseline'],
      findings: [
        {
          finding_id: 'finding_001',
          severity: 'high',
          detail: 'Strong baseline comparison is missing.',
          pointers: [
            {
              pointer_kind: 'baseline_set',
              object_id: 'baseline_001',
            },
          ],
        },
      ],
      report_pointers: [
        {
          report_kind: 'submission_risk',
          report_id: 'risk_001',
        },
      ],
      audit_ref: 'AUD-RISK-001',
      created_at: '2026-03-31T00:00:00.000Z',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('promote to paper-project response schema rejects mismatched sidecar report kinds', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: researchArgumentContracts.promoteToPaperProjectResponseSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      paper_id: 'paper_001',
      workspace_id: 'raw_001',
      branch_id: 'branch_001',
      packet_ref: {
        report_kind: 'coverage',
        report_id: 'packet_001',
      },
      report_ref: {
        report_kind: 'decision_timeline',
        report_id: 'risk_001',
      },
      audit_ref: 'AUD-PROMOTE-001',
      promoted_at: '2026-03-31T00:00:00.000Z',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
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

test('research question schema requires at least one upstream source array', async () => {
  const app = Fastify();
  app.post('/v', { schema: createResearchQuestionRequestSchema }, async () => ({ ok: true }));
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

test('research question schema accepts canonical literature evidence ids and rejects legacy field name', async () => {
  const app = Fastify();
  app.post('/v', { schema: createResearchQuestionRequestSchema }, async () => ({ ok: true }));
  await app.ready();

  const canonicalRes = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_literature_evidence_ids: ['lit_001'],
      judgement_summary: 'Question grounded in selected literature evidence.',
      confidence: 0.81,
    },
  });

  const legacyRes = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_evidence_review_ids: ['lit_001'],
      judgement_summary: 'Question grounded in selected literature evidence.',
      confidence: 0.81,
    },
  });

  await app.close();
  assert.equal(canonicalRes.statusCode, 200);
  assert.equal(legacyRes.statusCode, 400);
});

test('promotion decision schema requires package_id and target_paper_title for promote verdict', async () => {
  const app = Fastify();
  app.post('/v', { schema: createPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_question_id: 'research_question_001',
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
  app.post('/v', { schema: createPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_question_id: 'research_question_001',
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
  app.post('/v', { schema: createPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_question_id: 'research_question_001',
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

test('research-lifecycle barrel re-exports the runtime value surface of split modules', () => {
  const expectedKeys = new Set([
    ...Object.keys(researchLifecycleCoreContracts),
    ...Object.keys(paperProjectContracts),
    ...Object.keys(literatureContracts),
    ...Object.keys(autoPullContracts),
    ...Object.keys(titleCardManagementContracts),
    ...Object.keys(researchArgumentContracts),
  ]);

  assert.deepEqual(Object.keys(researchLifecycleContracts).sort(), [...expectedKeys].sort());
});

test('research-lifecycle barrel keeps key contract helpers and schemas reachable', () => {
  assert.equal([...researchLifecycleContracts.AUTO_PULL_SOURCES].includes('ZOTERO'), true);
  assert.equal([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_STAGE_CODES].includes('INDEXED'), true);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_STAGE_CODES], [
    'CITATION_NORMALIZED',
    'ABSTRACT_READY',
    'FULLTEXT_PREPROCESSED',
    'KEY_CONTENT_READY',
    'CHUNKED',
    'EMBEDDED',
    'INDEXED',
  ]);
  assert.equal([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES].includes('STALE'), true);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_ACTION_CODES], [
    'process_content',
    'process_to_retrievable',
    'rebuild_index',
    'reextract',
    'retry_failed',
    'view_reason',
  ]);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS], ['openai']);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_EMBEDDING_PROFILE_IDS], ['default', 'economy']);
  assert.ok(researchLifecycleContracts.updateLiteratureContentProcessingSettingsRequestSchema);
  assert.equal(
    researchLifecycleContracts.validateNoM6OverrideContext({
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
  assert.ok(researchLifecycleContracts.createPaperProjectRequestSchema);
  assert.ok(researchLifecycleContracts.literatureCollectionImportRequestSchema);
  assert.ok(researchLifecycleContracts.createAutoPullRuleRequestSchema);
  assert.ok(researchLifecycleContracts.createResearchQuestionRequestSchema);
  assert.ok(researchLifecycleContracts.readinessVerifyRequestSchema);
  assert.ok(researchLifecycleContracts.writingEntryPacketSchema);
  assert.ok(researchLifecycleContracts.submissionRiskReportSchema);
});
