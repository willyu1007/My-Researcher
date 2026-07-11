import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as workOrderContracts from './paper-implementation-workorder-contracts.js';
import * as researchLifecycleContracts from './index.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function functionalRef(refType: string, refId: string, versionId: string | null = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

async function validateWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload,
  });
  await app.close();
  return response.statusCode;
}

function validPolicy() {
  return {
    run_policy_id: 'run_policy_001',
    retry_budget: 0,
    compute_limit_ref: functionalRef('compute_limit', 'local_cpu'),
    stop_condition_refs: [functionalRef('stop_rule', 'stop_rule_001')],
    allowed_mutation_refs: [],
    autotune_policy: 'disabled',
  };
}

function validBridge() {
  return {
    run_recipe_ref: functionalRef('run_recipe', 'run_recipe_001'),
    run_recipe_hash: 'sha256:run_recipe_001',
    version_lock_hash: 'sha256:version_lock_001',
    config_snapshot_hash: 'sha256:config_snapshot_001',
    materialization_result_ref: functionalRef('training_task_materialization_result', 'materialization_result_001'),
    materialization_result_hash: 'sha256:materialization_result_001',
    training_task_spec_ref: functionalRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training_task_spec_001',
  };
}

function validWorkOrderDraft() {
  return {
    work_order_id: 'research_work_order_001',
    validation_cycle_id: 'validation_cycle_001',
    experiment_plan_light_id: 'experiment_plan_light_001',
    run_type: 'confirmatory',
    run_policy: validPolicy(),
    experiment_bridge: validBridge(),
    motive_refs: [functionalRef('core_motive_version', 'core_motive_version_001', '1')],
    assertion_refs: [functionalRef('motive_assertion', 'motive_assertion_001')],
    dataset_version_refs: [functionalRef('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [functionalRef('baseline_version', 'baseline_version_001')],
    code_version_refs: [functionalRef('code_version', 'code_version_001')],
    config_refs: [functionalRef('config', 'config_001')],
    trace_manifest_id: 'trace_manifest_work_order_001',
  };
}

test('paper-implementation workorder schemas load through direct and aggregate exports', () => {
  assert.ok(workOrderContracts.createResearchWorkOrderDraftRequestSchema);
  assert.ok(workOrderContracts.admitResearchWorkOrderRequestSchema);
  assert.ok(workOrderContracts.submitResearchWorkOrderHarnessRunRequestSchema);
  assert.ok(workOrderContracts.recordRunMonitorIntakeRequestSchema);
  assert.ok(workOrderContracts.runEvidenceUnitSchema);
  assert.ok(researchLifecycleContracts.createResearchWorkOrderDraftRequestSchema);
  assert.ok(researchLifecycleContracts.runEvidenceUnitSchema);
});

test('work order draft requires explicit id, validation cycle, run policy, recipe ref/hash, and trace manifest', async () => {
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      validWorkOrderDraft(),
    ),
    200,
  );
  const missingWorkOrderId = validWorkOrderDraft();
  delete (missingWorkOrderId as Record<string, unknown>).work_order_id;
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      missingWorkOrderId,
    ),
    400,
  );
  const missingRecipeHash = validWorkOrderDraft();
  delete (missingRecipeHash.experiment_bridge as Record<string, unknown>).run_recipe_hash;
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      missingRecipeHash,
    ),
    400,
  );
  const missingStopRule = validWorkOrderDraft();
  (missingStopRule.run_policy as { stop_condition_refs: unknown[] }).stop_condition_refs = [];
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      missingStopRule,
    ),
    400,
  );
});

test('work order draft accepts optional acceptance-bridge lineage and rejects malformed lineage', async () => {
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      {
        ...validWorkOrderDraft(),
        source_proposal_artifact_ref: functionalRef('paper_implementation_runtime_artifact', 'runtime_artifact_001'),
        source_proposal_artifact_hash: 'a'.repeat(64),
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      {
        ...validWorkOrderDraft(),
        source_proposal_artifact_ref: null,
        source_proposal_artifact_hash: null,
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      {
        ...validWorkOrderDraft(),
        source_proposal_artifact_ref: 'runtime_artifact_001',
        source_proposal_artifact_hash: 'a'.repeat(64),
      },
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      workOrderContracts.createResearchWorkOrderDraftRequestSchema,
      {
        ...validWorkOrderDraft(),
        source_proposal_artifact_ref: functionalRef('paper_implementation_runtime_artifact', 'runtime_artifact_001'),
        source_proposal_artifact_hash: { nested: 'not-a-hash' },
      },
    ),
    400,
  );
});

test('harness and monitor schemas separate trusted linkage from raw callback payload', async () => {
  assert.equal(
    await validateWithSchema(
      workOrderContracts.submitResearchWorkOrderHarnessRunRequestSchema,
      {
        idempotency_key: 'work_order_001_attempt_1',
        external_job_ref: functionalRef('external_training_job', 'external_job_001'),
        external_job_hash: 'sha256:external_job_001',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      workOrderContracts.recordRunMonitorIntakeRequestSchema,
      {
        monitor_event_kind: 'failed',
        run_status: 'failed',
        run_evidence_unit_id: 'run_evidence_unit_001',
        run_evidence_trace_manifest_id: 'trace_manifest_run_evidence_001',
        failure_summary: 'Dataset unavailable.',
        raw_payload: {
          adapter_status: 'failed',
        },
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      workOrderContracts.recordRunMonitorIntakeRequestSchema,
      {
        monitor_event_kind: 'failed',
        run_status: 'unknown_status',
      },
    ),
    400,
  );
});
