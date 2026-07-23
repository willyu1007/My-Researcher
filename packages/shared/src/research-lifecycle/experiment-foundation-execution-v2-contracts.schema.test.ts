import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
  attemptEventV2Schema,
  collectionAttemptV2Schema,
  controlExecutionAttemptV2RequestSchema,
  executionAttemptV2EnvelopeSchema,
  executionAttemptV2Schema,
  experimentFoundationExecutionV2ErrorResponseSchema,
  providerCommandV2Schema,
  providerPayloadV2Schema,
  provisionalOutputV2Schema,
  startWorkflowSimulationV2RequestSchema,
  startWorkflowSimulationV2ResponseSchema,
  workflowSimulationStatusV2Schema,
} from './experiment-foundation-execution-v2-contracts.js';
import {
  EXPERIMENT_V2_HASH_PROFILES,
  serverHashExperimentV2SemanticContent,
} from './experiment-v2-canonical-hash.js';
import { EXPERIMENT_V2_REASON_CODES } from './paper-implementation-experiment-v2-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

const timestamp = '2026-07-13T00:00:00.000Z';
const hash = (value: string): string => `sha256:${value.repeat(64)}`;

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({ method: 'POST', url: '/validate', payload: payload as object });
  await app.close();
  return response.statusCode === 200;
}

function externalJobRef() {
  return { ref_type: 'fake_aliyun_pai_dlc_job', ref_id: 'fake-job-001' } as const;
}

function providerPayload() {
  const sourceBinding = {
    run_id: 'run-001',
    run_manifest_hash: hash('a'),
    run_cell_id: 'run-cell-001',
    cell_key: 'cell-a',
    training_task_spec_id: 'task-spec-001',
    training_task_spec_hash: hash('b'),
  };
  return {
    provider_payload_id: 'provider-payload-001',
    materialization_key: 'payload:run-cell-001:profile-v1',
    ...sourceBinding,
    payload_schema: EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
    adapter_identity: EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    provider_profile_version: 'profile-v1',
    redacted_manifest: {
      manifest_schema_version: 'v1',
      payload_schema: EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
      adapter_identity: EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
      simulation_profile_version: 'profile-v1',
      job_name: 'fake-d19-cell-a',
      source_binding: sourceBinding,
      command_summary: { command: 'python', argument_count: 2 },
      resource_summary: { cpu_cores: 2, memory_mb: 4096 },
      input_keys: ['dataset'],
      output_keys: ['simulation_lifecycle_trace'],
      redacted_fields: ['credentials'],
    },
    payload_hash: hash('c'),
    payload_byte_size: 1024,
    created_at: timestamp,
  } as const;
}

function executionAttempt() {
  return {
    execution_attempt_id: 'attempt-001',
    external_pi_implementation_project_id: 'project-001',
    external_pi_validation_cycle_id: 'cycle-001',
    external_pi_branch_id: 'branch-001',
    external_pi_work_order_revision_id: 'revision-001',
    external_pi_work_order_revision_hash: hash('d'),
    external_pi_revision_sequence: 1,
    run_id: 'run-001',
    run_manifest_hash: hash('a'),
    run_cell_id: 'run-cell-001',
    cell_key: 'cell-a',
    training_task_spec_id: 'task-spec-001',
    training_task_spec_hash: hash('b'),
    provider_payload_id: 'provider-payload-001',
    provider_payload_hash: hash('c'),
    head_acknowledgement_inbox_id: 'head-ack-001',
    attempt_sequence: 1,
    workflow_business_key: 'workflow-001',
    workflow_request_hash: hash('e'),
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    provider_idempotency_key: 'fake-provider-idempotency-001',
    lifecycle_state: 'running',
    state_version: 2,
    terminal_reason_code: null,
    external_job_ref: externalJobRef(),
    external_job_ref_hash: hash('f'),
    created_at: timestamp,
    updated_at: timestamp,
    terminal_at: null,
  } as const;
}

function attemptEvent() {
  return {
    attempt_event_id: 'attempt-event-001',
    execution_attempt_id: 'attempt-001',
    event_sequence: 2,
    event_type: 'running',
    prior_state: 'submitted',
    next_state: 'running',
    provider_command_id: 'provider-command-001',
    provider_payload_hash: hash('c'),
    external_job_ref: externalJobRef(),
    external_job_ref_hash: hash('f'),
    event_snapshot: {
      snapshot_schema_version: 'v1',
      reason_code: null,
      observed_provider_state: 'RUNNING',
      note: null,
    },
    event_hash: hash('1'),
    occurred_at: timestamp,
  } as const;
}

function providerCommand() {
  return {
    provider_command_id: 'provider-command-001',
    execution_attempt_id: 'attempt-001',
    collection_attempt_id: null,
    command_sequence: 2,
    operation: 'sync',
    command_snapshot: {
      command_schema_version: 'v1',
      operation: 'sync',
      provider_payload_id: 'provider-payload-001',
      provider_payload_hash: hash('c'),
      external_job_ref: externalJobRef(),
      cancellation_reason: null,
    },
    command_hash: hash('2'),
    response_hash: hash('3'),
    provider_idempotency_key: 'fake-provider-idempotency-001:sync:2',
    provider_payload_hash: hash('c'),
    external_job_ref: externalJobRef(),
    external_job_ref_hash: hash('f'),
    command_state: 'succeeded',
    lease_version: 1,
    lease_owner: null,
    lease_expires_at: null,
    heartbeat_at: timestamp,
    attempt_count: 1,
    next_attempt_at: null,
    last_error_code: null,
    created_at: timestamp,
    updated_at: timestamp,
    terminal_at: timestamp,
  } as const;
}

function collectionAttempt() {
  return {
    collection_attempt_id: 'collection-001',
    execution_attempt_id: 'attempt-001',
    business_idempotency_key: 'collect-001',
    collection_request_hash: hash('4'),
    provider_payload_id: 'provider-payload-001',
    provider_payload_hash: hash('c'),
    external_job_ref: externalJobRef(),
    external_job_ref_hash: hash('f'),
    collection_state: 'collected',
    state_version: 2,
    prepared_at: timestamp,
    updated_at: timestamp,
    collected_at: timestamp,
  } as const;
}

function provisionalOutput() {
  return {
    provisional_output_id: 'provisional-output-001',
    collection_attempt_id: 'collection-001',
    ordinal: 1,
    output_kind: 'simulation_lifecycle_trace',
    output_class: 'diagnostic_only',
    manifest: {
      manifest_schema_version: 'v1',
      output_class: 'diagnostic_only',
      output_kind: 'simulation_lifecycle_trace',
      media_type: 'application/json',
      redacted_locator: 'memory://simulation/trace-001',
    },
    output_hash: hash('5'),
    created_at: timestamp,
  } as const;
}

function workflowStatus() {
  return {
    run_id: 'run-001',
    run_manifest_hash: hash('a'),
    workflow_simulation_status: 'workflow_simulation_passed',
    required_cell_count: 1,
    terminal_cell_count: 1,
    collected_cell_count: 1,
    cells: [{
      run_cell_id: 'run-cell-001',
      cell_key: 'cell-a',
      latest_execution_attempt_id: 'attempt-001',
      latest_attempt_state: 'succeeded',
      latest_collection_state: 'collected',
    }],
    scientific_execution_status: 'not_started',
    evidence_eligibility: false,
    derived_at: timestamp,
  } as const;
}

test('Pack B execution schemas accept the exact simulation-only records', async () => {
  const schemasAndPayloads: Array<[JsonSchema, unknown]> = [
    [providerPayloadV2Schema, providerPayload()],
    [executionAttemptV2Schema, executionAttempt()],
    [attemptEventV2Schema, attemptEvent()],
    [providerCommandV2Schema, providerCommand()],
    [collectionAttemptV2Schema, collectionAttempt()],
    [provisionalOutputV2Schema, provisionalOutput()],
    [workflowSimulationStatusV2Schema, workflowStatus()],
    [startWorkflowSimulationV2RequestSchema, { business_idempotency_key: 'workflow-001' }],
    [controlExecutionAttemptV2RequestSchema, {
      business_idempotency_key: 'cancel-001',
      reason_code: 'operator_cancelled',
    }],
    [executionAttemptV2EnvelopeSchema, {
      execution_attempt: executionAttempt(),
    }],
    [experimentFoundationExecutionV2ErrorResponseSchema, {
      error: {
        code: 'GATE_CONSTRAINT_FAILED',
        message: 'Exact execution scope has drifted.',
        details: { reason_code: 'EXECUTION_SCOPE_DRIFT' },
      },
    }],
    [experimentFoundationExecutionV2ErrorResponseSchema, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected failure.',
      },
    }],
    [startWorkflowSimulationV2ResponseSchema, {
      run_id: 'run-001',
      run_manifest_hash: hash('a'),
      business_idempotency_key: 'workflow-001',
      provider_payloads: [providerPayload()],
      execution_attempts: [executionAttempt()],
      replayed: false,
      workflow_simulation_status: workflowStatus(),
    }],
  ];

  for (const [schema, payload] of schemasAndPayloads) {
    assert.equal(await validates(schema, payload), true);
  }
});

test('Pack B provider manifests reject unknown, duplicate, and fourth output keys', async () => {
  const exact = providerPayload();
  const withOutputKeys = (outputKeys: string[]) => ({
    ...exact,
    redacted_manifest: {
      ...exact.redacted_manifest,
      output_keys: outputKeys,
    },
  });
  assert.equal(await validates(providerPayloadV2Schema, withOutputKeys([
    'simulation_lifecycle_trace',
    'simulation_provider_metadata',
    'simulation_collection_log',
  ])), true);
  assert.equal(await validates(providerPayloadV2Schema, withOutputKeys([
    'simulation_lifecycle_trace',
    'simulation_provider_metadata',
    'simulation_collection_log',
    'simulation_lifecycle_trace',
  ])), false);
  assert.equal(await validates(providerPayloadV2Schema, withOutputKeys([
    'simulation_lifecycle_trace',
    'unknown_diagnostic',
  ])), false);
  assert.equal(await validates(providerPayloadV2Schema, withOutputKeys([
    'simulation_lifecycle_trace',
    'simulation_lifecycle_trace',
  ])), false);
});

test('Pack B request schemas reject caller-authored execution authority', async () => {
  const authorityFields = [
    ['provider_payload', {}],
    ['payload_hash', hash('a')],
    ['adapter_identity', EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2],
    ['provider_ref', externalJobRef()],
    ['provenance', 'non_production_fake_provider'],
    ['scientific_execution_status', 'not_started'],
  ] as const;
  for (const [field, value] of authorityFields) {
    assert.equal(await validates(startWorkflowSimulationV2RequestSchema, {
      business_idempotency_key: 'workflow-001',
      [field]: value,
    }), false, field);
  }
});

test('Pack B schemas fail closed on non-simulation and scientific upgrades', async () => {
  assert.equal(await validates(providerPayloadV2Schema, {
    ...providerPayload(),
    adapter_identity: 'real_aliyun_pai_dlc@v1',
  }), false);
  assert.equal(await validates(providerPayloadV2Schema, {
    ...providerPayload(),
    provenance: 'production_provider',
  }), false);
  assert.equal(await validates(workflowSimulationStatusV2Schema, {
    ...workflowStatus(),
    scientific_execution_status: 'succeeded',
  }), false);
  assert.equal(await validates(provisionalOutputV2Schema, {
    ...provisionalOutput(),
    output_class: 'scientific_result',
  }), false);
  assert.equal(await validates(controlExecutionAttemptV2RequestSchema, {
    business_idempotency_key: 'cancel-001',
    reason_code: 'free_form_reason',
  }), false);
  assert.equal(await validates(collectionAttemptV2Schema, {
    ...collectionAttempt(),
    collection_state: 'collecting',
  }), false);
  assert.equal(await validates(attemptEventV2Schema, {
    ...attemptEvent(),
    event_type: 'reconciled',
  }), false);
  assert.equal(await validates(executionAttemptV2Schema, {
    ...executionAttempt(),
    lifecycle_state: 'failed',
    terminal_reason_code: 'collection_failed',
    terminal_at: timestamp,
  }), false);
});

test('Pack B closed hash profiles are deterministic, tamper-evident, and domain separated', () => {
  const profiles = [
    'ef-provider-payload-json@v1',
    'ef-execution-attempt-event-json@v1',
    'ef-provider-command-json@v1',
  ] as const;
  for (const profile of profiles) {
    assert.equal(EXPERIMENT_V2_HASH_PROFILES.includes(profile), true);
  }
  const content = { run_id: 'run-001', ordinal: 1 };
  const payloadHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationProviderPayloadV2',
    schema_version: 'v1',
    hash_profile: profiles[0],
    content,
  });
  assert.equal(payloadHash, serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationProviderPayloadV2',
    schema_version: 'v1',
    hash_profile: profiles[0],
    content: { ordinal: 1, run_id: 'run-001' },
  }));
  assert.notEqual(payloadHash, serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationProviderPayloadV2',
    schema_version: 'v1',
    hash_profile: profiles[0],
    content: { ...content, ordinal: 2 },
  }));
  assert.notEqual(payloadHash, serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationProviderCommandV2',
    schema_version: 'v1',
    hash_profile: profiles[2],
    content,
  }));
});

test('Pack B reason-code extension is exact and additive', () => {
  const reasonCodes = [
    'EF_V2_WORKFLOW_SIMULATION_DISABLED',
    'EXECUTION_HEAD_ACK_REQUIRED',
    'EXECUTION_RUN_NOT_CURRENT_HEAD',
    'EXECUTION_SCOPE_DRIFT',
    'EXECUTION_READINESS_DRIFT',
    'EXECUTION_ATTEMPT_NOT_FOUND',
    'PROVIDER_PAYLOAD_INVALID',
    'PROVIDER_PAYLOAD_CONFLICT',
    'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
    'EXECUTION_ATTEMPT_LIMIT_EXHAUSTED',
    'EXECUTION_ATTEMPT_STATE_CONFLICT',
    'PROVIDER_COMMAND_LEASE_CONFLICT',
    'PROVIDER_RESPONSE_INVALID',
    'COLLECTION_ATTEMPT_CONFLICT',
  ] as const;
  for (const reasonCode of reasonCodes) {
    assert.equal(EXPERIMENT_V2_REASON_CODES.includes(reasonCode), true, reasonCode);
  }
  assert.equal(reasonCodes.length, 14);
});
