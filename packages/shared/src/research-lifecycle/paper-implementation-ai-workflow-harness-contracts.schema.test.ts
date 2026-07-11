import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import * as harnessContracts from './paper-implementation-ai-workflow-harness-contracts.js';
import * as researchLifecycleContracts from './index.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function ref(refType: string, refId: string, versionId: string | null = null) {
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

async function validateStrictWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
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

function validPolicyPack() {
  return {
    context_policy_version_id: 'context_policy_v1',
    trace_policy_version_id: 'trace_policy_v1',
    evidence_policy_version_id: 'evidence_policy_v1',
    experiment_policy_version_id: 'experiment_policy_v1',
    retention_policy_version_id: 'retention_policy_v1',
    evaluation_policy_version_id: 'evaluation_policy_v1',
  };
}

function validRuntimeBindings() {
  return {
    control_plane_id: 'implementation_control_plane_v1',
    artifact_store_ref: ref('artifact_store', 'artifact_store_001'),
    evidence_ledger_ref: ref('evidence_ledger', 'evidence_ledger_001'),
    work_order_broker_ref: ref('work_order_broker', 'work_order_broker_001'),
    run_monitor_ref: ref('run_monitor', 'run_monitor_001'),
  };
}

function validInvariants() {
  return {
    require_input_snapshot: true,
    require_trace_manifest: true,
    require_artifact_refs: true,
    forbid_untraced_claims: true,
    forbid_memo_as_evidence: true,
    retain_failed_runs: true,
    separate_exploratory_and_confirmatory: true,
  };
}

function emptyIncludedContext() {
  return {
    motive_version_refs: [],
    board_version_refs: [],
    assertion_refs: [],
    evidence_binding_refs: [],
    route_refs: [],
    probe_refs: [],
    experiment_plan_refs: [],
    work_order_refs: [],
    run_evidence_refs: [],
    result_packet_refs: [],
    accepted_risk_refs: [],
    human_decision_refs: [],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
  };
}

function validSnapshotRequest() {
  return {
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    workflow_type: 'validation_cycle_planning',
    context_policy_version_id: 'context_policy_v1',
    included_context: emptyIncludedContext(),
    excluded_context: {
      excluded_refs: [ref('evidence_unit', 'stale_evidence_001')],
      exclusion_reasons: ['stale evidence excluded by policy'],
    },
    freshness_constraints: {
      exclude_stale_evidence: true,
      exclude_invalidated_refs: true,
    },
    evidence_rules: {
      memo_as_evidence_forbidden: true,
      citation_requires_source_locator: true,
    },
    source_hashes: ['sha256:source_hash_001'],
  };
}

function validSpec() {
  return {
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'v1',
    input_policy: {
      required_input_snapshot: true,
      allowed_context_types: ['motive', 'evidence_board', 'trace'],
      forbidden_context_types: ['raw_unscoped_history', 'llm_memo_as_evidence'],
      max_context_tokens: 12000,
    },
    prompt_policy: {
      prompt_template_version_id: 'prompt_template_v1',
      system_instruction_version_id: 'system_instruction_v1',
      output_schema_version_id: 'validation_cycle_planning_output_v1',
    },
    model_policy: {
      model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
      temperature: 0,
      allowed_tools: [],
    },
    output_policy: {
      required_schema: 'validation_cycle_planning_output_v1',
      natural_language_field_contract_version_id: 'nl_field_roles_v1',
      required_ref_fields: ['trace_manifest_refs'],
      forbidden_outputs: ['direct_state_mutation', 'unsupported_claim'],
    },
    validation_policy: {
      schema_validation: true,
      reference_validation: true,
      trace_validation: true,
      claim_boundary_validation: true,
    },
    retry_policy: {
      max_retries: 1,
      retry_on_schema_failure: true,
      retry_on_missing_refs: true,
    },
    audit_policy: {
      save_prompt: true,
      save_input_snapshot: true,
      save_raw_output: true,
      save_parsed_output: true,
      save_validator_results: true,
    },
  };
}

function validHarnessRunRequest() {
  return {
    harness_id: 'implementation_harness_001',
    input_snapshot_id: 'implementation_input_snapshot_001',
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'v1',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
    prompt_template_version_id: 'prompt_template_v1',
    output_schema_version_id: 'validation_cycle_planning_output_v1',
    raw_output_artifact_ref: ref('artifact', 'raw_output_001'),
    parsed_output_artifact_ref: ref('artifact', 'parsed_output_001'),
    spec: validSpec(),
    proposal_artifacts: [
      {
        artifact_kind: 'proposal_object',
        target_ref: ref('validation_cycle', 'validation_cycle_draft_001'),
        artifact_ref: ref('artifact', 'proposal_artifact_001'),
        source_refs: [ref('core_motive_version', 'core_motive_version_001')],
        trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
        payload: { proposed_cycle: true },
      },
    ],
  };
}

function validHarnessRunResponse() {
  return {
    harness_run: {
      harness_run_id: 'agent_workflow_harness_run_001',
      implementation_project_id: 'implementation_project_001',
      harness_id: 'implementation_harness_001',
      input_snapshot_id: 'implementation_input_snapshot_001',
      workflow_type: 'validation_cycle_planning',
      workflow_version: 'v1',
      run_mode: 'mock',
      execution_mode: 'mocked_llm',
      model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
      prompt_template_version_id: 'prompt_template_v1',
      output_schema_version_id: 'validation_cycle_planning_output_v1',
      raw_output_artifact_ref: ref('artifact', 'raw_output_001'),
      parsed_output_artifact_ref: ref('artifact', 'parsed_output_001'),
      schema_validation_status: 'passed',
      reference_validation_status: 'passed',
      trace_validation_status: 'passed',
      nl_field_role_validation_status: 'passed',
      memo_as_evidence_detected: false,
      direct_state_mutation_detected: false,
      blocked_reasons: [],
      run_status: 'completed',
      proposal_artifact_ids: ['proposal_artifact_001'],
      quality_signal_ids: [],
      gate_result_id: 'gate_result_001',
      transition_attempt_id: 'transition_attempt_001',
      created_by: 'system',
      created_at: '2026-05-21T10:00:00.000Z',
    },
    proposal_artifacts: [{
      proposal_artifact_id: 'proposal_artifact_001',
      implementation_project_id: 'implementation_project_001',
      harness_run_id: 'agent_workflow_harness_run_001',
      artifact_kind: 'proposal_object',
      target_ref: ref('validation_cycle', 'validation_cycle_draft_001'),
      artifact_ref: ref('artifact', 'proposal_artifact_001'),
      source_refs: [ref('core_motive_version', 'core_motive_version_001')],
      trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
      payload: { proposed_cycle: true },
      proposal_status: 'proposed',
      created_by: 'system',
      created_at: '2026-05-21T10:00:00.000Z',
    }],
    quality_signals: [],
    gate_result: {
      gate_result_id: 'gate_result_001',
      implementation_project_id: 'implementation_project_001',
      gate_type: 'paper_implementation_agent_workflow_harness',
      target_ref: ref('validation_cycle', 'validation_cycle_draft_001'),
      result: 'pass',
      checks: [{
        check_id: 'proposal_only_trace_ready',
        check_name: 'Proposal-only output is trace-ready',
        result: 'pass',
        message: 'AI workflow harness output stayed proposal-only and trace-ready.',
        blocking: false,
      }],
      blockers: [],
      warnings: [],
      accepted_risk_refs: [],
      required_actions: [],
      policy_version_id: 'context_policy_v1',
      created_at: '2026-05-21T10:00:00.000Z',
    },
    transition_attempt: {
      transition_id: 'transition_attempt_001',
      implementation_project_id: 'implementation_project_001',
      transition_key: 'agent_workflow_harness.validation_cycle_planning',
      target_ref: ref('validation_cycle', 'validation_cycle_draft_001'),
      input_refs: [
        ref('implementation_harness', 'implementation_harness_001'),
        ref('implementation_input_snapshot', 'implementation_input_snapshot_001'),
      ],
      output_refs: [ref('implementation_proposal_artifact', 'proposal_artifact_001')],
      actor_type: 'system',
      actor_id: null,
      transition_policy_version_id: 'context_policy_v1',
      context_policy_version_id: 'context_policy_v1',
      trace_policy_version_id: 'trace_policy_v1',
      gate_result_refs: [ref('implementation_gate_result', 'gate_result_001')],
      outcome: 'pass',
      blockers: [],
      accepted_risk_refs: [],
      harness_run_refs: [ref('agent_workflow_harness_run', 'agent_workflow_harness_run_001')],
      trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
      created_at: '2026-05-21T10:00:00.000Z',
    },
    queue_items: [],
  };
}

test('paper-implementation AI workflow harness schemas load through direct and aggregate exports', () => {
  assert.ok(harnessContracts.createImplementationHarnessRequestSchema);
  assert.ok(harnessContracts.createImplementationInputSnapshotRequestSchema);
  assert.ok(harnessContracts.createAgentWorkflowHarnessRunRequestSchema);
  assert.ok(harnessContracts.decisionWorkQueueItemSchema);
  assert.ok(researchLifecycleContracts.createImplementationHarnessRequestSchema);
  assert.ok(researchLifecycleContracts.agentWorkflowHarnessRunSchema);
});

test('implementation harness schema requires policy runtime bindings and invariants', async () => {
  const payload = {
    policy_pack: validPolicyPack(),
    runtime_bindings: validRuntimeBindings(),
    invariants: validInvariants(),
  };
  assert.equal(
    await validateWithSchema(harnessContracts.createImplementationHarnessRequestSchema, payload),
    200,
  );

  const missingInvariant = structuredClone(payload);
  delete (missingInvariant.invariants as Partial<ReturnType<typeof validInvariants>>).forbid_memo_as_evidence;
  assert.equal(
    await validateWithSchema(harnessContracts.createImplementationHarnessRequestSchema, missingInvariant),
    400,
  );
});

test('input snapshot schema requires controlled context freshness and evidence rules', async () => {
  const payload = validSnapshotRequest();
  assert.equal(
    await validateWithSchema(harnessContracts.createImplementationInputSnapshotRequestSchema, payload),
    200,
  );

  const missingHashes = validSnapshotRequest();
  missingHashes.source_hashes = [];
  assert.equal(
    await validateWithSchema(harnessContracts.createImplementationInputSnapshotRequestSchema, missingHashes),
    400,
  );
});

test('agent workflow harness run schema requires snapshot, provenance, spec, and proposal artifacts', async () => {
  const payload = validHarnessRunRequest();
  assert.equal(
    await validateWithSchema(harnessContracts.createAgentWorkflowHarnessRunRequestSchema, payload),
    200,
  );

  const missingSnapshot = validHarnessRunRequest();
  delete (missingSnapshot as Partial<ReturnType<typeof validHarnessRunRequest>>).input_snapshot_id;
  assert.equal(
    await validateWithSchema(harnessContracts.createAgentWorkflowHarnessRunRequestSchema, missingSnapshot),
    400,
  );

  const invalidKind = validHarnessRunRequest();
  invalidKind.proposal_artifacts[0]!.artifact_kind = 'authority_write';
  assert.equal(
    await validateWithSchema(harnessContracts.createAgentWorkflowHarnessRunRequestSchema, invalidKind),
    400,
  );
});

test('decision work queue resolve schema keeps W4 reflow fields optional and bounded', async () => {
  assert.equal(
    await validateWithSchema(
      harnessContracts.resolveDecisionWorkQueueItemRequestSchema,
      { status: 'resolved' },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      harnessContracts.resolveDecisionWorkQueueItemRequestSchema,
      { status: 'resolved', re_advance: true, retry_budget_override: 3 },
    ),
    200,
  );
  // An override can only raise a budget — negative values are rejected at
  // the contract boundary. (0 is not asserted here: fastify's default ajv
  // coerceTypes maps 0 onto the nullable branch, which the repository then
  // treats as "no override".)
  assert.equal(
    await validateWithSchema(
      harnessContracts.resolveDecisionWorkQueueItemRequestSchema,
      { status: 'resolved', retry_budget_override: -1 },
    ),
    400,
  );
});

test('agent workflow harness response schema rejects persistence-only spec leakage', async () => {
  const payload = validHarnessRunResponse();
  assert.equal(
    await validateStrictWithSchema(harnessContracts.createAgentWorkflowHarnessRunResponseSchema, payload),
    200,
  );

  const leaked = {
    ...validHarnessRunResponse(),
    spec: validSpec(),
  };
  assert.equal(
    await validateStrictWithSchema(harnessContracts.createAgentWorkflowHarnessRunResponseSchema, leaked),
    400,
  );
});
