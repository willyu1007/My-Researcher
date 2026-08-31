import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_OFFLINE_EVALUATION_STAGES,
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS,
} from './topic-selection-offline-evaluation-replay-contracts.js';
import {
  topicSelectionResearchArenaCalibrationCaseCreateRequestSchema,
  topicSelectionResearchArenaCalibrationCaseResultSchema,
  topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema,
  topicSelectionResearchArenaCalibrationReportSchema,
  topicSelectionResearchArenaCalibrationRunCreateRequestSchema,
} from './topic-selection-research-arena-calibration-contracts.js';

const HASH = 'a'.repeat(64);

async function injectRequest(schema: object, payload: object) {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/', { schema: { body: schema } }, async () => ({ ok: true }));
  const response = await app.inject({ method: 'POST', url: '/', payload });
  await app.close();
  return response;
}

async function injectResponse(schema: object, payload: object) {
  const app = Fastify();
  app.get('/', { schema: { response: { 200: schema } } }, async () => payload);
  const response = await app.inject({ method: 'GET', url: '/' });
  await app.close();
  return response;
}

test('offline evaluation admits the research arena stage with its bounded case and metric vocabulary', () => {
  assert.deepEqual(TOPIC_SELECTION_OFFLINE_EVALUATION_STAGES, [
    'v1a',
    'v1b',
    'v1c',
    'research_arena',
  ]);
  assert.deepEqual(TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES, [
    'arena_dominance_pair',
    'arena_causal_perturbation',
    'arena_irrelevant_perturbation',
    'arena_successful_non_advance',
    'arena_advancing_case',
  ]);
  assert.deepEqual(TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS, [
    'arena_evidence_grounding_rate',
    'arena_execution_independence_rate',
    'arena_replay_integrity_rate',
    'arena_human_label_coverage_rate',
    'arena_cost_latency_accounting_rate',
    'arena_work_avoided_rate',
  ]);
});

test('calibration create contracts freeze arena members without accepting observed outputs or authority writes', async () => {
  const dataset = {
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 't147-phase10a-current-corpus',
    dataset_version: 'v1',
    description: 'Current support-only Arena calibration corpus.',
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema, dataset)).statusCode,
    200,
  );

  const calibrationCase = {
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
    dataset_id: 'dataset_1',
    case_key: 'dominance-pair-1',
    case_type: 'arena_dominance_pair',
    members: [
      {
        member_role: 'baseline',
        arena_session_id: 'arena_baseline',
        research_checkpoint_id: null,
      },
      {
        member_role: 'preferred',
        arena_session_id: 'arena_preferred',
        research_checkpoint_id: 'checkpoint_preferred',
      },
    ],
    tags: ['phase10a'],
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationCaseCreateRequestSchema, calibrationCase)).statusCode,
    200,
  );
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationCaseCreateRequestSchema, {
      ...calibrationCase,
      observed_output: { outcome: 'selected' },
    })).statusCode,
    400,
  );

  const run = {
    schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
    dataset_id: 'dataset_1',
    run_key: 'phase10a-current-corpus-v1',
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationRunCreateRequestSchema, run)).statusCode,
    200,
  );
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationRunCreateRequestSchema, {
      ...run,
      activate_policy: true,
    })).statusCode,
    400,
  );
});

test('calibration report keeps concise human Markdown and a larger support-only LLM working set', async () => {
  const report = {
    schema_version: 'TopicSelectionResearchArenaCalibrationReport@v1',
    dataset_ref: { ref_type: 'offline_evaluation_dataset', ref_id: 'dataset_1' },
    run_ref: { ref_type: 'offline_evaluation_run', ref_id: 'run_1' },
    recommendation: 'insufficient_evidence',
    case_type_counts: { arena_dominance_pair: 1 },
    product_v2_member_count: 0,
    human_label_counts: { accept: 0, override: 0, defer: 0, non_advance: 0 },
    coverage_gaps: ['MISSING_SECOND_DOMINANCE_PAIR', 'MISSING_PRODUCT_V2_EXECUTION'],
    hard_blockers: [],
    metric_results: [],
    case_results: [],
    technical_trace_hash: HASH,
    human_markdown: '# 校准结论\n\n当前证据不足，Arena 保持建议模式。',
    llm_working_set: {
      schema_version: 'TopicSelectionResearchArenaCalibrationWorkingSet@v1',
      recommendation: 'insufficient_evidence',
      exact_source_refs: [],
      coverage_gaps: ['MISSING_SECOND_DOMINANCE_PAIR', 'MISSING_PRODUCT_V2_EXECUTION'],
    },
    support_only: true,
  };
  assert.equal(
    (await injectResponse(topicSelectionResearchArenaCalibrationReportSchema, report)).statusCode,
    200,
  );
  const { support_only: _supportOnly, ...authorityAmbiguousReport } = report;
  assert.equal(
    (await injectResponse(
      topicSelectionResearchArenaCalibrationReportSchema,
      authorityAmbiguousReport,
    )).statusCode,
    500,
  );
});

test('calibration case results are closed, source-bound support evidence', async () => {
  const functionalRef = (refType: string, refId: string) => ({
    ref_type: refType,
    ref_id: refId,
    version_id: null,
    title_card_id: 'title_1',
  });
  const member = {
    member_role: 'subject',
    arena_session_ref: functionalRef('research_arena_session', 'arena_1'),
    input_snapshot_ref: functionalRef('input_snapshot', 'snapshot_1'),
    transcript_ref: functionalRef('artifact_ref', 'transcript_1'),
    role_execution_refs: [functionalRef('research_arena_role_execution', 'execution_1')],
    evidence_packet_refs: [functionalRef('artifact_ref', 'packet_1')],
    agent_invocation_audit_refs: [],
    human_review_refs: [],
    human_confirmed_decision_refs: [],
    advisory_outcome: 'evidence_expansion_required',
    product_v2_verified: false,
    evidence_grounding_passed: true,
    execution_independence_passed: false,
    replay_integrity_passed: true,
    human_label_responses: [],
    cost_latency_accounting_passed: true,
    work_avoided_stage_count: 0,
    execution_accounting: {
      non_provider_role_invocation_count: 2,
      provider_call_count: 0,
      retrieval_run_count: 2,
      retrieval_hit_count: 2,
      evidence_excerpt_chars: 128,
      duration_ms: 25,
      work_avoided_stage_count: null,
      authorization_pause_count: null,
    },
    source_hash: HASH,
    issues: ['MISSING_PRODUCT_V2_EXECUTION'],
    hard_blockers: [],
  };
  const caseResult = {
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseObservation@v1',
    case_ref: functionalRef('offline_evaluation_case', 'case_1'),
    case_type: 'arena_successful_non_advance',
    relation_passed: true,
    members: [member],
    hard_blockers: [],
  };

  assert.equal(
    (await injectResponse(topicSelectionResearchArenaCalibrationCaseResultSchema, caseResult)).statusCode,
    200,
  );
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationCaseResultSchema, {
      ...caseResult,
      activate_policy: true,
    })).statusCode,
    400,
  );
});
