import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import type {
  ResearchWorkOrder,
  ResearchWorkOrderHarnessRun,
  RunMonitorIntakeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { PrismaPaperImplementationWorkOrderRepository } from './prisma-paper-implementation-workorder-repository.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';
const WORK_ORDER_ID = 'research_work_order_001';

type StoredRow = Record<string, unknown> & { id: string };

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeWorkOrder(): ResearchWorkOrder {
  return {
    work_order_id: WORK_ORDER_ID,
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    experiment_plan_light_id: 'experiment_plan_light_001',
    run_type: 'confirmatory',
    work_order_status: 'admitted',
    run_policy: {
      run_policy_id: 'run_policy_001',
      retry_budget: 0,
      compute_limit_ref: ref('compute_limit', 'compute_limit_001'),
      stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled',
    },
    experiment_bridge: {
      run_recipe_ref: ref('experiment_run_recipe', 'run_recipe_001', 'v1'),
      run_recipe_hash: 'run_recipe_hash_001',
      version_lock_hash: 'version_lock_hash_001',
      config_snapshot_hash: 'config_snapshot_hash_001',
      training_task_spec_ref: ref('training_task_spec', 'training_task_spec_001'),
      training_task_spec_hash: 'training_task_spec_hash_001',
      result_validation_policy_ref: ref('result_validation_policy', 'result_validation_policy_001'),
    },
    motive_refs: [ref('core_motive_version', 'core_motive_version_001', '1')],
    assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_work_order_001'),
    trace_manifest_id: 'trace_manifest_work_order_001',
    admission_gate_result_id: 'work_order_gate_result_001',
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    admitted_at: NOW,
  };
}

function makeHarnessRun(): ResearchWorkOrderHarnessRun {
  return {
    harness_run_id: 'work_order_harness_run_001',
    implementation_project_id: PROJECT_ID,
    work_order_id: WORK_ORDER_ID,
    run_status: 'submitted',
    run_attempt: 1,
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
    submitted_at: NOW,
    completed_at: null,
    created_by: 'system',
    created_at: NOW,
  };
}

function makeMonitorIntake(): RunMonitorIntakeRecord {
  return {
    monitor_intake_id: 'run_monitor_intake_001',
    implementation_project_id: PROJECT_ID,
    work_order_id: WORK_ORDER_ID,
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
    monitor_event_kind: 'failed',
    run_status: 'failed',
    trust_status: 'trusted',
    result_ref: null,
    result_hash: null,
    result_validation_report_ref: null,
    result_validation_report_hash: null,
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    failure_summary: 'The run failed before producing result artifacts.',
    raw_payload: {
      callback_id: 'callback_001',
    },
    received_at: NOW,
    created_by: 'system',
  };
}

function normalizeRow(row: StoredRow): StoredRow {
  const normalized: StoredRow = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if ((key.endsWith('At') || key === 'submittedAt' || key === 'receivedAt') && typeof value === 'string') {
      normalized[key] = new Date(value);
    }
  }
  return normalized;
}

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      rows.push(normalizeRow(data));
      return rows.at(-1);
    },
    findFirst: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where }: { where?: Partial<StoredRow> }) =>
      rows.filter((row) => matchesWhere(row, where ?? {})),
    update: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
      const index = rows.findIndex((row) => matchesWhere(row, where));
      if (index < 0) {
        throw new Error('row not found');
      }
      rows[index] = normalizeRow({ ...rows[index], ...data });
      return rows[index];
    },
  };
}

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(): {
  client: PrismaClient;
  legacyRunEvidenceRows: StoredRow[];
} {
  const legacyRunEvidenceRows: StoredRow[] = [];
  const client = {
    paperImplementationResearchWorkOrder: makeModel([]),
    paperImplementationWorkOrderHarnessRun: makeModel([]),
    paperImplementationRunMonitorIntake: makeModel([]),
    paperImplementationRunEvidenceUnit: makeModel(legacyRunEvidenceRows),
  };
  return {
    client: {
      ...client,
      $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
    } as unknown as PrismaClient,
    legacyRunEvidenceRows,
  };
}

test('Prisma PaperImplementationWorkOrder repository persists monitor intake with zero legacy REU writes', async () => {
  const { client, legacyRunEvidenceRows } = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationWorkOrderRepository(client);
  const workOrder = await repository.createWorkOrder(makeWorkOrder());
  assert.equal(workOrder.work_order_id, WORK_ORDER_ID);
  assert.equal(workOrder.experiment_bridge.run_recipe_hash, 'run_recipe_hash_001');
  assert.equal((await repository.findWorkOrderById(PROJECT_ID, WORK_ORDER_ID))?.run_policy.compute_limit_ref?.ref_id, 'compute_limit_001');
  assert.equal((await repository.listWorkOrders(PROJECT_ID))[0]?.dataset_version_refs[0]?.ref_id, 'dataset_version_001');

  await repository.updateWorkOrder({
    ...workOrder,
    validation_cycle_id: 'validation_cycle_mutated',
    work_order_status: 'cancelled',
    created_at: '2026-05-20T00:00:00.000Z',
    updated_at: '2026-05-21T00:30:00.000Z',
  });
  const immutableUpdateCheck = await repository.findWorkOrderById(PROJECT_ID, WORK_ORDER_ID);
  assert.equal(immutableUpdateCheck?.validation_cycle_id, 'validation_cycle_001');
  assert.equal(immutableUpdateCheck?.created_at, NOW);
  assert.equal(immutableUpdateCheck?.work_order_status, 'cancelled');
  assert.equal(immutableUpdateCheck?.updated_at, '2026-05-21T00:30:00.000Z');

  const harnessRun = await repository.createHarnessRun(makeHarnessRun(), {
    ...workOrder,
    work_order_status: 'running',
    updated_at: '2026-05-21T01:00:00.000Z',
    experiment_bridge: {
      ...workOrder.experiment_bridge,
      external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
      external_job_hash: 'experiment_run_hash_001',
    },
  });
  assert.equal(harnessRun.external_job_hash, 'experiment_run_hash_001');
  assert.equal((await repository.listHarnessRuns(PROJECT_ID, WORK_ORDER_ID))[0]?.idempotency_key, 'work_order_attempt_001');

  const persistence = await repository.recordMonitorIngestion({
    monitor_intake: makeMonitorIntake(),
    work_order: {
      ...workOrder,
      work_order_status: 'failed',
      updated_at: NOW,
    },
  });
  assert.equal(persistence.monitor_intake.trust_status, 'trusted');
  assert.equal('run_evidence_unit' in persistence, false);
  assert.equal(legacyRunEvidenceRows.length, 0);
  assert.deepEqual(await repository.listRunEvidenceUnits(PROJECT_ID), []);
  assert.equal(await repository.findRunEvidenceUnitById(PROJECT_ID, 'run_evidence_unit_001'), null);
});

test('workorder migration declares queryable work order monitor and run evidence indexes', async () => {
  const sql = await readFile(
    new URL('../../../../../prisma/migrations/20260521180000_add_paper_implementation_workorder_experiment_bridge/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'pirwo_cycle_idx',
    'pirwo_plan_idx',
    'pirwo_run_type_idx',
    'pirwo_status_idx',
    'pirwo_recipe_idx',
    'pirwo_trace_manifest_idx',
    'pirwo_external_job_idx',
    'piwohr_work_order_idx',
    'pirmi_work_order_idx',
    'pirmi_run_status_idx',
    'pirmi_trust_idx',
    'pirmi_external_job_idx',
    'pireu_work_order_idx',
    'pireu_cycle_idx',
    'pireu_run_type_idx',
    'pireu_run_status_idx',
    'pireu_validation_report_idx',
    'pireu_trace_manifest_idx',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
});
