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

  const datasetResponse = await app.inject({
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
  assert.equal(datasetResponse.statusCode, 201);
  assert.equal(datasetResponse.json().stage, 'research_arena');

  const caseResponse = await app.inject({
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
  assert.equal(caseResponse.statusCode, 201);
  assert.equal(caseResponse.json().case_type, 'arena_successful_non_advance');

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
