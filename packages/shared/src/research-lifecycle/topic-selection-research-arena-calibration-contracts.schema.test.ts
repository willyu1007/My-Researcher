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

test('calibration create contracts reject historical v1 writes and authority fields', async () => {
  const dataset = {
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
    workspace_id: null,
    dataset_key: 't147-phase10a-current-corpus',
    dataset_version: 'v1',
    description: 'Current support-only Arena calibration corpus.',
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema, dataset)).statusCode,
    400,
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
    400,
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

test('phase 10B contracts pre-register a closed six-slot protocol and exact member recipes before execution', async () => {
  const functionalRef = (refType: string, refId: string, titleCardId: string, versionId = HASH) => ({
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  });
  const member = (
    memberRole: 'baseline' | 'preferred' | 'control' | 'variant' | 'subject',
    suffix: string,
    loopDelta: null | { classification: 'causal' | 'irrelevant'; ref: ReturnType<typeof functionalRef> } = null,
  ) => {
    const titleCardId = `title_${suffix}`;
    return {
      member_role: memberRole,
      session_key: `arena-session-${suffix}`,
      title_card_id: titleCardId,
      input_snapshot_ref: functionalRef('input_snapshot', `snapshot_${suffix}`, titleCardId),
      candidate_refs: [functionalRef('need_candidate', `candidate_${suffix}`, titleCardId, 'v1')],
      evidence_refs: [functionalRef('evidence_map', `evidence_${suffix}`, titleCardId, 'v1')],
      label_slot_key: `label-${suffix}`,
      label_actor: { actor_type: 'human', actor_id: 'researcher_1' },
      loop_delta: loopDelta ? {
        delta_type: 'evidence',
        ref: loopDelta.ref,
        classification: loopDelta.classification,
        rationale: `Apply the declared ${loopDelta.classification} evidence delta only.`,
      } : null,
    };
  };
  const causalDelta = functionalRef('evidence_map', 'evidence_causal_delta', 'title_causal', 'v2');
  const irrelevantDelta = functionalRef('evidence_map', 'evidence_irrelevant_delta', 'title_irrelevant', 'v2');
  const protocol = {
    schema_version: 'TopicSelectionResearchArenaCalibrationProtocol@v2',
    slots: [
      {
        slot_key: 'dominance-1',
        case_type: 'arena_dominance_pair',
        tranche: 'first',
        members: [member('baseline', 'dominance_1_baseline'), member('preferred', 'dominance_1_preferred')],
        expected_relation: {
          relation_kind: 'dominance',
          rationale: 'The preferred framing has the declared mechanism advantage.',
          dominance_axes: ['mechanism_identifiability'],
          sole_delta_ref: null,
        },
        work_avoided_stage_keys: [],
      },
      {
        slot_key: 'causal-perturbation',
        case_type: 'arena_causal_perturbation',
        tranche: 'first',
        members: [
          member('control', 'causal_control'),
          member('variant', 'causal_variant', { classification: 'causal', ref: causalDelta }),
        ],
        expected_relation: {
          relation_kind: 'causal_perturbation',
          rationale: 'The added mechanism evidence should change the disposition.',
          dominance_axes: [],
          sole_delta_ref: causalDelta,
        },
        work_avoided_stage_keys: [],
      },
      {
        slot_key: 'non-advance',
        case_type: 'arena_successful_non_advance',
        tranche: 'first',
        members: [member('subject', 'non_advance')],
        expected_relation: {
          relation_kind: 'successful_non_advance',
          rationale: 'A justified stop avoids downstream topic construction.',
          dominance_axes: [],
          sole_delta_ref: null,
        },
        work_avoided_stage_keys: ['research_question', 'value_feasibility', 'topic_package', 'promotion_review'],
      },
      {
        slot_key: 'dominance-2',
        case_type: 'arena_dominance_pair',
        tranche: 'second',
        members: [member('baseline', 'dominance_2_baseline'), member('preferred', 'dominance_2_preferred')],
        expected_relation: {
          relation_kind: 'dominance',
          rationale: 'The second preferred framing has the declared evidence advantage.',
          dominance_axes: ['evidence_resolution'],
          sole_delta_ref: null,
        },
        work_avoided_stage_keys: [],
      },
      {
        slot_key: 'irrelevant-perturbation',
        case_type: 'arena_irrelevant_perturbation',
        tranche: 'second',
        members: [
          member('control', 'irrelevant_control'),
          member('variant', 'irrelevant_variant', { classification: 'irrelevant', ref: irrelevantDelta }),
        ],
        expected_relation: {
          relation_kind: 'irrelevant_perturbation',
          rationale: 'The unrelated evidence should not change the disposition.',
          dominance_axes: [],
          sole_delta_ref: irrelevantDelta,
        },
        work_avoided_stage_keys: [],
      },
      {
        slot_key: 'advancing',
        case_type: 'arena_advancing_case',
        tranche: 'second',
        members: [member('subject', 'advancing')],
        expected_relation: {
          relation_kind: 'advancing',
          rationale: 'The new process-selected lineage should produce one advancing disposition.',
          dominance_axes: [],
          sole_delta_ref: null,
        },
        work_avoided_stage_keys: [],
      },
    ],
    selection_rule: 'ordered_exact_member_recipes',
    measurement_window: {
      start_event: 'case_registration_before_role_output',
      end_event: 'calibration_run_evaluation',
    },
    accounting_sources: {
      runtime: 'arena_transcript',
      authorization_pause: 'designated_advisory_review_operation_group',
      work_avoided: 'research_stage_manifest',
    },
    decision_difference_rule: 'advisory_outcome_changed',
    override_categories: [
      'explained_repair',
      'human_objective_difference',
      'possible_false_drop',
      'possible_false_continue',
    ],
    stop_rules: {
      hard_blocker: 'stop_immediately',
      first_tranche_redundancy: 'stop_when_no_decision_difference_and_no_work_avoided',
    },
    budgets: {
      max_case_count: 6,
      max_session_count: 10,
      max_role_invocation_count: 20,
      max_review_points_per_tranche: 2,
    },
    support_only: true,
  };
  const dataset = {
    schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
    workspace_id: null,
    dataset_key: 't147-phase10b-product-v2',
    dataset_version: 'v2',
    description: 'Pre-registered Phase 10B protocol.',
    protocol_manifest: protocol,
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationDatasetCreateRequestSchema, dataset)).statusCode,
    200,
  );

  const calibrationCase = {
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: 'dataset_1',
    case_key: 'phase10b-dominance-1',
    slot_key: 'dominance-1',
    tags: ['phase10b', 'tranche-1'],
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationCaseCreateRequestSchema, calibrationCase)).statusCode,
    200,
  );
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaCalibrationCaseCreateRequestSchema, {
      ...calibrationCase,
      observed_output: { preferred: 'selected' },
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
