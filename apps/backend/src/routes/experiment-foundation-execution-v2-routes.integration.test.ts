import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import type {
  ProviderPayloadV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import {
  ExperimentFoundationExecutionV2Controller,
  type ExperimentFoundationExecutionV2UseCase,
} from '../controllers/experiment-foundation-execution-v2-controller.js';
import { registerExperimentFoundationExecutionV2Routes } from './experiment-foundation-execution-v2-routes.js';

test('Pack B routes expose only typed workflow-simulation and control surfaces', async () => {
  const calls: Array<{ operation: string; id: string }> = [];
  let startCount = 0;
  const service = {
    async startWorkflowSimulation(runId) {
      calls.push({ operation: 'start', id: runId });
      startCount += 1;
      return {
        run_id: runId,
        run_manifest_hash: hash('run'),
        business_idempotency_key: 'workflow-1',
        provider_payloads: [providerPayload()],
        execution_attempts: [attempt('attempt-1')],
        replayed: startCount > 1,
        workflow_simulation_status: status(runId),
      };
    },
    async cancelExecutionAttempt(attemptId) {
      calls.push({ operation: 'cancel', id: attemptId });
      return attempt(attemptId);
    },
    async reconcileExecutionAttempt(attemptId) {
      calls.push({ operation: 'reconcile', id: attemptId });
      return attempt(attemptId);
    },
    async getExecutionAttempt(attemptId) {
      calls.push({ operation: 'get', id: attemptId });
      return attempt(attemptId);
    },
    async getWorkflowSimulationStatus(runId) {
      calls.push({ operation: 'status', id: runId });
      return status(runId);
    },
  } satisfies ExperimentFoundationExecutionV2UseCase;
  const app = Fastify({ logger: false });
  await registerExperimentFoundationExecutionV2Routes(
    app,
    new ExperimentFoundationExecutionV2Controller(service),
  );

  const start = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/runs/run-1/workflow-simulations',
    payload: { business_idempotency_key: 'workflow-1' },
  });
  assert.equal(start.statusCode, 201);
  assert.equal(start.json().provider_payloads.length, 1);
  assert.equal(start.json().execution_attempts.length, 1);
  assert.deepEqual(calls.shift(), { operation: 'start', id: 'run-1' });

  const replay = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/runs/run-1/workflow-simulations',
    payload: { business_idempotency_key: 'workflow-1' },
  });
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.json().replayed, true);
  assert.deepEqual(calls.shift(), { operation: 'start', id: 'run-1' });

  const cancel = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/execution-attempts/attempt-1/cancel',
    payload: {
      business_idempotency_key: 'cancel-1',
      reason_code: 'operator_cancelled',
    },
  });
  assert.equal(cancel.statusCode, 202);
  assert.equal(cancel.json().execution_attempt.execution_attempt_id, 'attempt-1');

  const reconcile = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/execution-attempts/attempt-1/reconcile',
    payload: {
      business_idempotency_key: 'reconcile-1',
      reason_code: 'manual_reconcile',
    },
  });
  assert.equal(reconcile.statusCode, 202);
  assert.equal(reconcile.json().execution_attempt.execution_attempt_id, 'attempt-1');

  const get = await app.inject({
    method: 'GET',
    url: '/experiment-foundation/v2/execution-attempts/attempt-1',
  });
  assert.equal(get.statusCode, 200);
  assert.equal(get.json().execution_attempt.execution_attempt_id, 'attempt-1');

  const getStatus = await app.inject({
    method: 'GET',
    url: '/experiment-foundation/v2/runs/run-1/workflow-simulation-status',
  });
  assert.equal(getStatus.statusCode, 200);
  assert.equal(getStatus.json().run_id, 'run-1');
  assert.deepEqual(calls, [
    { operation: 'cancel', id: 'attempt-1' },
    { operation: 'reconcile', id: 'attempt-1' },
    { operation: 'get', id: 'attempt-1' },
    { operation: 'status', id: 'run-1' },
  ]);
  await app.close();
});

test('Pack B routes return the standard error envelope for schema and handler failures', async () => {
  const service = new Proxy({}, {
    get() {
      return async () => {
        throw new Error('sensitive internal failure');
      };
    },
  }) as ExperimentFoundationExecutionV2UseCase;
  const app = Fastify({ logger: false });
  await registerExperimentFoundationExecutionV2Routes(
    app,
    new ExperimentFoundationExecutionV2Controller(service),
  );

  const invalid = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/runs/run-1/workflow-simulations',
    payload: {},
  });
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.json(), {
    error: {
      code: 'INVALID_PAYLOAD',
      message: 'Request payload failed schema validation.',
      details: { reason_code: 'PROVIDER_PAYLOAD_INVALID' },
    },
  });

  const unexpected = await app.inject({
    method: 'GET',
    url: '/experiment-foundation/v2/execution-attempts/attempt-1',
  });
  assert.equal(unexpected.statusCode, 500);
  assert.deepEqual(unexpected.json(), {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation execution v2 failure.',
    },
  });
  assert.equal(unexpected.body.includes('sensitive internal failure'), false);
  await app.close();
});

test('Pack B routes reject caller-authored payload, hash, provider and scientific authority', async () => {
  let callCount = 0;
  const unreachable = new Proxy({}, {
    get() {
      return async () => {
        callCount += 1;
        throw new Error('service must not be reached');
      };
    },
  }) as ExperimentFoundationExecutionV2UseCase;
  const app = Fastify({ logger: false });
  await registerExperimentFoundationExecutionV2Routes(
    app,
    new ExperimentFoundationExecutionV2Controller(unreachable),
  );

  for (const forbidden of [
    { payload_hash: hash('caller') },
    { provider_payload: { command: 'caller-owned' } },
    { external_job_ref: 'provider-job' },
    { scientific_execution_status: 'succeeded' },
  ]) {
    const response = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/v2/runs/run-1/workflow-simulations',
      payload: {
        business_idempotency_key: 'workflow-1',
        ...forbidden,
      },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_PAYLOAD');
  }
  assert.equal(callCount, 0);
  await app.close();
});

function hash(seed: string): string {
  return `sha256:${seed.charCodeAt(0).toString(16).padStart(64, '0')}`;
}

function status(runId: string) {
  return {
    run_id: runId,
    run_manifest_hash: hash('run'),
    workflow_simulation_status: 'not_started' as const,
    required_cell_count: 1,
    terminal_cell_count: 0,
    collected_cell_count: 0,
    cells: [{
      run_cell_id: 'run-cell-1',
      cell_key: 'cell-1',
      latest_execution_attempt_id: null,
      latest_attempt_state: null,
      latest_collection_state: null,
    }],
    scientific_execution_status: 'not_started' as const,
    evidence_eligibility: false as const,
    derived_at: '2026-07-13T00:00:00.000Z',
  };
}

function providerPayload(): ProviderPayloadV2 {
  const sourceBinding = {
    run_id: 'run-1',
    run_manifest_hash: hash('run'),
    run_cell_id: 'run-cell-1',
    cell_key: 'cell-1',
    training_task_spec_id: 'task-1',
    training_task_spec_hash: hash('task'),
  };
  return {
    provider_payload_id: 'payload-1',
    materialization_key: 'run-cell-1:profile-v1',
    ...sourceBinding,
    payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1' as const,
    adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1' as const,
    execution_mode: 'simulation' as const,
    provenance: 'non_production_fake_provider' as const,
    provider_profile_version: 'profile-v1',
    redacted_manifest: {
      manifest_schema_version: 'v1' as const,
      payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1' as const,
      adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1' as const,
      simulation_profile_version: 'profile-v1',
      job_name: 'fake-job-1',
      source_binding: sourceBinding,
      command_summary: { command: 'python', argument_count: 2 },
      resource_summary: { cpu_cores: 2, memory_mb: 4096 },
      input_keys: ['dataset'],
      output_keys: ['simulation_lifecycle_trace'],
      redacted_fields: ['credentials'],
    },
    payload_hash: hash('payload'),
    payload_byte_size: 1024,
    created_at: '2026-07-13T00:00:00.000Z',
  };
}

function attempt(id: string) {
  return {
    execution_attempt_id: id,
    external_pi_implementation_project_id: 'project-1',
    external_pi_validation_cycle_id: 'cycle-1',
    external_pi_branch_id: 'branch-1',
    external_pi_work_order_revision_id: 'revision-1',
    external_pi_work_order_revision_hash: hash('revision'),
    external_pi_revision_sequence: 1,
    run_id: 'run-1',
    run_manifest_hash: hash('run'),
    run_cell_id: 'run-cell-1',
    cell_key: 'cell-1',
    training_task_spec_id: 'task-1',
    training_task_spec_hash: hash('task'),
    provider_payload_id: 'payload-1',
    provider_payload_hash: hash('payload'),
    head_acknowledgement_inbox_id: 'ack-1',
    attempt_sequence: 1,
    workflow_business_key: 'workflow-1',
    workflow_request_hash: hash('workflow'),
    execution_mode: 'simulation' as const,
    provenance: 'non_production_fake_provider' as const,
    provider_idempotency_key: 'provider-key-1',
    lifecycle_state: 'prepared' as const,
    state_version: 0,
    terminal_reason_code: null,
    external_job_ref: null,
    external_job_ref_hash: null,
    created_at: '2026-07-13T00:00:00.000Z',
    updated_at: '2026-07-13T00:00:00.000Z',
    terminal_at: null,
  };
}
