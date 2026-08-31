import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type { TopicSelectionResearchArenaCalibrationService } from '../services/topic-selection-research-arena-calibration-service.js';
import { TopicSelectionResearchArenaCalibrationController } from '../controllers/topic-selection-research-arena-calibration-controller.js';
import { registerTopicSelectionResearchArenaCalibrationRoutes } from './topic-selection-research-arena-calibration-routes.js';

const NOW = '2026-08-31T07:00:00.000Z';
const HASH = 'a'.repeat(64);
const dataset = {
  offline_evaluation_dataset_id: 'dataset_1',
  workspace_id: null,
  dataset_key: 'phase10a-current-corpus',
  dataset_version: 'v1',
  stage: 'research_arena' as const,
  source: 'frozen_snapshot' as const,
  status: 'active' as const,
  description: 'Current Arena corpus.',
  case_count: 1,
  case_type_coverage: ['arena_successful_non_advance' as const],
  payload: { support_only: true },
  created_by: 'system' as const,
  created_at: NOW,
  updated_at: NOW,
};
const calibrationCase = {
  offline_evaluation_case_id: 'case_1',
  workspace_id: null,
  dataset_id: dataset.offline_evaluation_dataset_id,
  title_card_id: 'title_1',
  case_key: 'successful-stop',
  case_type: 'arena_successful_non_advance' as const,
  status: 'active' as const,
  frozen_input_bundle: {
    stage: 'research_arena' as const,
    frozen_at: NOW,
    source_refs: [],
    artifact_refs: [],
    stage_snapshots: {},
    payload: {},
  },
  gold_expectation: {
    expected_unmet_need: false,
    expected_key_evidence_refs: [],
    expected_counter_evidence_refs: [],
    expected_blocker_codes: [],
    required_trace_refs: [],
    expected_recheck_action_refs: [],
    expected_negative_memory_refs: [],
    expected_downstream_rework_causes: [],
    notes: [],
  },
  tags: ['phase10a'],
  created_at: NOW,
  updated_at: NOW,
};
const run = {
  offline_evaluation_run_id: 'run_1',
  workspace_id: null,
  dataset_id: dataset.offline_evaluation_dataset_id,
  run_key: 'phase10a-current-corpus-v1',
  status: 'completed' as const,
  workflow_profile_key: 'topic-selection-research-arena-calibration',
  workflow_profile_version: 'v1',
  model_profile_key: null,
  search_profile_key: null,
  policy_version_id: null,
  metric_keys: ['arena_replay_integrity_rate' as const],
  case_count: 1,
  run_payload: { support_only: true },
  created_by: 'system' as const,
  started_at: NOW,
  finished_at: NOW,
};
const report = {
  schema_version: 'TopicSelectionResearchArenaCalibrationReport@v1' as const,
  dataset_ref: { ref_type: 'offline_evaluation_dataset', ref_id: 'dataset_1' },
  run_ref: { ref_type: 'offline_evaluation_run', ref_id: 'run_1' },
  recommendation: 'insufficient_evidence' as const,
  case_type_counts: { arena_successful_non_advance: 1 },
  product_v2_member_count: 0,
  human_label_counts: { accept: 0, override: 0, defer: 0, non_advance: 0 },
  coverage_gaps: ['MISSING_PRODUCT_V2_EXECUTION' as const],
  hard_blockers: [],
  metric_results: [],
  case_results: [],
  technical_trace_hash: HASH,
  human_markdown: '# 校准结论\n\n当前证据不足。',
  llm_working_set: { schema_version: 'TopicSelectionResearchArenaCalibrationWorkingSet@v1' },
  support_only: true as const,
};

const httpRef = (refType: string, refId: string, titleCardId: string, versionId = 'v1') => ({
  ref_type: refType,
  ref_id: refId,
  version_id: versionId,
  title_card_id: titleCardId,
});

function phase10bHttpProtocol() {
  const member = (
    memberRole: 'baseline' | 'preferred' | 'control' | 'variant' | 'subject',
    key: string,
    titleCardId = `title_${key}`,
    evidenceRefs = [httpRef('evidence_map', `evidence_${key}`, titleCardId)],
    loopDelta: null | { classification: 'causal' | 'irrelevant'; ref: ReturnType<typeof httpRef> } = null,
  ) => ({
    member_role: memberRole,
    session_key: `session-${key}`,
    title_card_id: titleCardId,
    input_snapshot_ref: httpRef('input_snapshot', `snapshot_${key}`, titleCardId, HASH),
    candidate_refs: [httpRef('need_candidate', `candidate_${titleCardId}`, titleCardId)],
    evidence_refs: evidenceRefs,
    label_slot_key: `label-${key}`,
    label_actor: { actor_type: 'human', actor_id: 'researcher_1' },
    loop_delta: loopDelta ? {
      delta_type: 'evidence',
      ref: loopDelta.ref,
      classification: loopDelta.classification,
      rationale: `Apply the ${loopDelta.classification} delta only.`,
    } : null,
  });
  const causalTitle = 'title_causal';
  const causalControlEvidence = httpRef('evidence_map', 'evidence_causal_control', causalTitle);
  const causalDelta = httpRef('evidence_map', 'evidence_causal_delta', causalTitle, 'v2');
  const irrelevantTitle = 'title_irrelevant';
  const irrelevantControlEvidence = httpRef('evidence_map', 'evidence_irrelevant_control', irrelevantTitle);
  const irrelevantDelta = httpRef('evidence_map', 'evidence_irrelevant_delta', irrelevantTitle, 'v2');
  return {
    schema_version: 'TopicSelectionResearchArenaCalibrationProtocol@v2',
    slots: [{
      slot_key: 'dominance-1',
      case_type: 'arena_dominance_pair',
      tranche: 'first',
      members: [member('baseline', 'dominance-1-baseline'), member('preferred', 'dominance-1-preferred')],
      expected_relation: {
        relation_kind: 'dominance',
        rationale: 'First declared dominance relation.',
        dominance_axes: ['mechanism'],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'causal',
      case_type: 'arena_causal_perturbation',
      tranche: 'first',
      members: [
        member('control', 'causal-control', causalTitle, [causalControlEvidence]),
        member('variant', 'causal-variant', causalTitle, [causalControlEvidence, causalDelta], {
          classification: 'causal', ref: causalDelta,
        }),
      ],
      expected_relation: {
        relation_kind: 'causal_perturbation',
        rationale: 'Declared causal evidence relation.',
        dominance_axes: [],
        sole_delta_ref: causalDelta,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'non-advance',
      case_type: 'arena_successful_non_advance',
      tranche: 'first',
      members: [member('subject', 'non-advance')],
      expected_relation: {
        relation_kind: 'successful_non_advance',
        rationale: 'Accepted stop relation.',
        dominance_axes: [],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: ['research_question', 'value_feasibility', 'topic_package', 'promotion_review'],
    }, {
      slot_key: 'dominance-2',
      case_type: 'arena_dominance_pair',
      tranche: 'second',
      members: [member('baseline', 'dominance-2-baseline'), member('preferred', 'dominance-2-preferred')],
      expected_relation: {
        relation_kind: 'dominance',
        rationale: 'Second declared dominance relation.',
        dominance_axes: ['evidence'],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'irrelevant',
      case_type: 'arena_irrelevant_perturbation',
      tranche: 'second',
      members: [
        member('control', 'irrelevant-control', irrelevantTitle, [irrelevantControlEvidence]),
        member('variant', 'irrelevant-variant', irrelevantTitle, [irrelevantControlEvidence, irrelevantDelta], {
          classification: 'irrelevant', ref: irrelevantDelta,
        }),
      ],
      expected_relation: {
        relation_kind: 'irrelevant_perturbation',
        rationale: 'Declared irrelevant evidence relation.',
        dominance_axes: [],
        sole_delta_ref: irrelevantDelta,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'advancing',
      case_type: 'arena_advancing_case',
      tranche: 'second',
      members: [member('subject', 'advancing')],
      expected_relation: {
        relation_kind: 'advancing',
        rationale: 'Declared advancing relation.',
        dominance_axes: [],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }],
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
}

test('research Arena calibration routes expose strict create, evaluate, and report reads', async () => {
  const service = {
    createDataset: async () => dataset,
    addCase: async () => calibrationCase,
    startRun: async () => run,
    evaluateRun: async () => report,
    getReport: async () => report,
  } satisfies Pick<
    TopicSelectionResearchArenaCalibrationService,
    'createDataset' | 'addCase' | 'startRun' | 'evaluateRun' | 'getReport'
  >;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchArenaCalibrationRoutes(
    app,
    new TopicSelectionResearchArenaCalibrationController(service),
  );

  const legacyDatasetResponse = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/datasets',
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v1',
      workspace_id: null,
      dataset_key: dataset.dataset_key,
      dataset_version: dataset.dataset_version,
      description: dataset.description,
    },
  });
  assert.equal(legacyDatasetResponse.statusCode, 400);

  const legacyCaseResponse = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/cases',
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v1',
      dataset_id: dataset.offline_evaluation_dataset_id,
      case_key: calibrationCase.case_key,
      case_type: calibrationCase.case_type,
      members: [{
        member_role: 'subject',
        arena_session_id: 'arena_1',
        research_checkpoint_id: null,
      }],
      tags: ['phase10a'],
    },
  });
  assert.equal(legacyCaseResponse.statusCode, 400);

  const protocol = phase10bHttpProtocol();
  const phase10bDatasetResponse = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/datasets',
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
      workspace_id: null,
      dataset_key: 'phase10b-preregistered',
      dataset_version: 'v2',
      description: 'Pre-registered bounded matrix.',
      protocol_manifest: protocol,
    },
  });
  assert.equal(phase10bDatasetResponse.statusCode, 201);
  assert.equal(phase10bDatasetResponse.json().stage, 'research_arena');

  const phase10bCase = {
    schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2',
    dataset_id: dataset.offline_evaluation_dataset_id,
    case_key: 'dominance-1',
    slot_key: 'dominance-1',
    tags: ['phase10b'],
  };
  const phase10bCaseResponse = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/cases',
    payload: phase10bCase,
  });
  assert.equal(phase10bCaseResponse.statusCode, 201);
  assert.equal(phase10bCaseResponse.json().case_type, 'arena_successful_non_advance');
  const postHocMembers = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/cases',
    payload: { ...phase10bCase, members: [{ arena_session_id: 'observed-session' }] },
  });
  assert.equal(postHocMembers.statusCode, 400);

  const runResponse = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/runs',
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
      dataset_id: dataset.offline_evaluation_dataset_id,
      run_key: run.run_key,
    },
  });
  assert.equal(runResponse.statusCode, 201);

  const evaluateResponse = await app.inject({
    method: 'POST',
    url: `/topic-selection/research/arena/calibration/runs/${run.offline_evaluation_run_id}/evaluate`,
  });
  assert.equal(evaluateResponse.statusCode, 200);
  assert.equal(evaluateResponse.json().recommendation, 'insufficient_evidence');

  const reportResponse = await app.inject({
    method: 'GET',
    url: `/topic-selection/research/arena/calibration/runs/${run.offline_evaluation_run_id}/report`,
  });
  assert.equal(reportResponse.statusCode, 200);
  assert.equal(reportResponse.json().support_only, true);

  const forbiddenAuthority = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/calibration/runs',
    payload: {
      schema_version: 'TopicSelectionResearchArenaCalibrationRunCreateRequest@v1',
      dataset_id: dataset.offline_evaluation_dataset_id,
      run_key: run.run_key,
      activate_policy: true,
    },
  });
  assert.equal(forbiddenAuthority.statusCode, 400);
  await app.close();
});
