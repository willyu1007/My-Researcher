import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationTrainingTaskSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import { canonicalizeExperimentV2Json } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  DeterministicFakeAliyunPaiDlcTransport,
  DeterministicFakeProviderFault,
  type ExperimentFoundationV2FakeProviderRequest,
  type ExperimentFoundationV2FakeProviderResponse,
} from './experiment-foundation-v2-deterministic-fake-provider.js';
import {
  DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY,
  EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES,
  ExperimentFoundationV2ProviderPayloadService,
  getCodeOwnedSimulationProfile,
  hashCanonicalPayloadBytes,
  type ExperimentFoundationV2ProviderPayloadPrerequisite,
} from './experiment-foundation-v2-provider-payload-service.js';

const timestamp = '2026-07-13T12:00:00.000Z';
const hash = (character: string) => `sha256:${character.repeat(64)}`;

function prerequisite(
  overrides: Partial<ExperimentFoundationV2ProviderPayloadPrerequisite> = {},
): ExperimentFoundationV2ProviderPayloadPrerequisite {
  const run: ExperimentFoundationRunV2 = {
    run_id: 'ef_run_v2_001',
    external_pi_work_order_revision_id: 'pi_revision_v2_001',
    external_pi_work_order_revision_hash: hash('1'),
    external_pi_branch_revision_sequence: 1,
    run_manifest_hash: hash('2'),
    cell_count: 2,
    frozen_at: timestamp,
  };
  const runCell: ExperimentFoundationRunCellV2 = {
    run_cell_id: 'ef_run_cell_v2_001',
    run_id: run.run_id,
    ordinal: 1,
    cell_key: 'retriever-top-k-5',
    external_pi_cell_id: 'pi_cell_v2_001',
    external_pi_cell_hash: hash('3'),
    training_task_spec_id: 'ef_task_spec_v2_001',
    training_task_spec_hash: hash('4'),
    seed: 7,
    repeat_index: 0,
  };
  const taskSpec: ExperimentFoundationTrainingTaskSpecV2 = {
    training_task_spec_id: runCell.training_task_spec_id,
    materialization_key: 'materialization:cell:1',
    run_recipe_id: 'ef_run_recipe_v2_001',
    external_pi_work_order_revision_id: run.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: run.external_pi_work_order_revision_hash,
    external_pi_cell_id: runCell.external_pi_cell_id,
    external_pi_cell_hash: runCell.external_pi_cell_hash,
    command_snapshot: {
      command: 'experiment-foundation-v2:materialize-cell',
      arguments: ['retriever-top-k-5', '--diagnostic-token=must-not-persist'],
    },
    io_snapshot: {
      input_keys: ['version_lock', 'admitted_cell'],
      output_keys: [
        'simulation_lifecycle_trace',
        'simulation_provider_metadata',
      ],
    },
    resource_snapshot: { cpu_cores: 1, memory_mb: 512 },
    retry_snapshot: { max_attempts: 2 },
    task_spec_hash: runCell.training_task_spec_hash,
    created_at: timestamp,
  };
  return {
    run,
    run_cell: runCell,
    task_spec: taskSpec,
    head_acknowledgement: {
      inbox_id: 'ef_head_ack_inbox_v2_001',
      source_event_id: 'branch_head_advanced_event_v2_001',
      run_id: run.run_id,
      run_manifest_hash: run.run_manifest_hash,
      payload_hash: hash('5'),
      processed_at: timestamp,
    },
    ...overrides,
  };
}

function assertPayloadReason(
  action: () => unknown,
  reasonCode: 'PROVIDER_PAYLOAD_INVALID' | 'PROVIDER_PAYLOAD_CONFLICT',
): void {
  assert.throws(
    action,
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.details?.reason_code, reasonCode);
      assert.equal(error.statusCode, reasonCode === 'PROVIDER_PAYLOAD_INVALID' ? 400 : 409);
      assert.equal(
        error.errorCode,
        reasonCode === 'PROVIDER_PAYLOAD_INVALID' ? 'INVALID_PAYLOAD' : 'VERSION_CONFLICT',
      );
      return true;
    },
  );
}

function transportRequest(
  materialized: ReturnType<ExperimentFoundationV2ProviderPayloadService['materialize']>,
  overrides: Partial<ExperimentFoundationV2FakeProviderRequest> = {},
): ExperimentFoundationV2FakeProviderRequest {
  return {
    canonical_payload_bytes: materialized.canonical_payload_bytes,
    payload_hash: materialized.record.payload_hash,
    provider_idempotency_key: 'pack-b-provider-idempotency-cell-001',
    ...overrides,
  };
}

function response(value: unknown): ExperimentFoundationV2FakeProviderResponse {
  assert.equal(typeof value, 'object');
  assert.ok(value);
  return value as ExperimentFoundationV2FakeProviderResponse;
}

test('PB01 materializes deterministic canonical bytes and a persistence-safe redacted record', () => {
  const service = new ExperimentFoundationV2ProviderPayloadService();
  const first = service.materialize(prerequisite());
  const reordered = prerequisite();
  reordered.task_spec = {
    ...reordered.task_spec,
    resource_snapshot: {
      memory_mb: reordered.task_spec.resource_snapshot.memory_mb,
      cpu_cores: reordered.task_spec.resource_snapshot.cpu_cores,
    },
  };
  const second = service.materialize(reordered);

  assert.equal(first.canonical_payload_bytes, second.canonical_payload_bytes);
  assert.equal(first.record.payload_hash, second.record.payload_hash);
  assert.equal(first.record.materialization_key, second.record.materialization_key);
  assert.equal(
    first.record.payload_byte_size,
    Buffer.byteLength(first.canonical_payload_bytes, 'utf8'),
  );
  assert.ok(first.record.payload_byte_size < EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES);
  assert.equal(first.record.adapter_identity, DETERMINISTIC_FAKE_ALIYUN_PAI_DLC_ADAPTER_IDENTITY);
  assert.equal(first.record.execution_mode, 'simulation');
  assert.equal(first.record.provenance, 'non_production_fake_provider');
  assert.deepEqual(first.record.redacted_manifest.redacted_fields, [
    'canonical_payload_bytes',
    'profile.workspace_id',
    'simulated_job.arguments',
  ]);
  assert.equal(first.record.payload_schema, 'FakeAliyunPaiDlcSubmitPayload@v1');
  assert.equal(first.record.provider_profile_version, 'v1');

  const persistedJson = JSON.stringify(first.record);
  assert.equal(Object.hasOwn(first.record, 'canonical_payload_bytes'), false);
  assert.equal(persistedJson.includes('must-not-persist'), false);
  assert.equal(persistedJson.includes('ExperimentResult'), false);
  assert.equal(persistedJson.includes('EvidenceCandidate'), false);
  assert.deepEqual(service.rematerializeAndVerify(prerequisite(), first.record), first);
});

test('PB01 rejects caller authority, exact-scope drift, tamper, and oversized payloads', () => {
  const service = new ExperimentFoundationV2ProviderPayloadService();
  const exact = prerequisite();
  const callerPayload = {
    ...exact,
    payload_hash: hash('9'),
    canonical_payload_bytes: '{}',
  } as unknown as ExperimentFoundationV2ProviderPayloadPrerequisite;
  assertPayloadReason(() => service.materialize(callerPayload), 'PROVIDER_PAYLOAD_INVALID');

  const drifted = prerequisite();
  drifted.task_spec = {
    ...drifted.task_spec,
    task_spec_hash: hash('8'),
  };
  assertPayloadReason(() => service.materialize(drifted), 'PROVIDER_PAYLOAD_INVALID');

  const materialized = service.materialize(exact);
  assertPayloadReason(
    () => service.rematerializeAndVerify(exact, {
      ...materialized.record,
      payload_hash: hash('7'),
    }),
    'PROVIDER_PAYLOAD_CONFLICT',
  );
  assertPayloadReason(
    () => service.toPersistenceRecord({
      id: 'persisted-payload-tampered-manifest',
      ...materialized.record,
      redacted_manifest: {
        ...materialized.record.redacted_manifest,
        source_binding: {
          run_id: 42,
        },
      },
      created_at: timestamp,
    }),
    'PROVIDER_PAYLOAD_CONFLICT',
  );

  const oversized = prerequisite();
  oversized.task_spec = {
    ...oversized.task_spec,
    command_snapshot: {
      ...oversized.task_spec.command_snapshot,
      arguments: ['x'.repeat(EXPERIMENT_FOUNDATION_V2_PROVIDER_PAYLOAD_MAX_BYTES)],
    },
  };
  assertPayloadReason(() => service.materialize(oversized), 'PROVIDER_PAYLOAD_INVALID');

  for (const outputKeys of [
    [
      'simulation_lifecycle_trace',
      'simulation_provider_metadata',
      'simulation_collection_log',
      'simulation_lifecycle_trace',
    ],
    ['unknown_diagnostic'],
  ]) {
    const invalidOutputs = prerequisite();
    invalidOutputs.task_spec = {
      ...invalidOutputs.task_spec,
      io_snapshot: {
        ...invalidOutputs.task_spec.io_snapshot,
        output_keys: outputKeys as never,
      },
    };
    assertPayloadReason(
      () => service.materialize(invalidOutputs),
      'PROVIDER_PAYLOAD_INVALID',
    );
  }
});

test('PB01 code-owned profile cannot be overridden through a returned clone', () => {
  const mutable = getCodeOwnedSimulationProfile() as unknown as Record<string, unknown>;
  mutable.workspace_id = 'caller-workspace';
  mutable.credential_surface = true;

  const next = getCodeOwnedSimulationProfile();
  assert.equal(next.workspace_id, 'simulation-workspace');
  assert.equal(next.credential_surface, false);
});

test('PB08 all fake operations receive the same canonical bytes, hash, and idempotency identity with zero network', async () => {
  const service = new ExperimentFoundationV2ProviderPayloadService();
  const materialized = service.materialize(prerequisite());
  const fake = new DeterministicFakeAliyunPaiDlcTransport();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('NETWORK_FORBIDDEN');
  }) as typeof fetch;
  try {
    const base = transportRequest(materialized);
    const submitted = response(await fake.submit(base));
    const bound = { ...base, external_job_ref: submitted.external_job_ref };
    const synced = response(await fake.sync(bound));
    const reconciled = response(await fake.reconcile(bound));
    const cancelled = response(await fake.cancel({
      ...bound,
      cancel_reason_code: 'PACK_B_TEST_CANCEL',
    }));
    const collected = response(await fake.collect(bound));
    const collectedReplay = response(await fake.collect(bound));

    assert.equal(submitted.provider_status, 'submitted');
    assert.equal(synced.provider_status, 'running');
    assert.equal(reconciled.provider_status, 'succeeded');
    assert.equal(cancelled.provider_status, 'cancelled');
    assert.equal(collected.provider_status, 'succeeded');
    assert.deepEqual(collectedReplay, collected);
    assert.equal(collected.provisional_outputs.length, 2);
    assert.ok(collected.provisional_outputs.every(
      (output) => output.diagnostic_manifest.classification === 'diagnostic_only',
    ));
    assert.equal(fetchCalls, 0);
    assert.deepEqual(fake.getNetworkCensus(), {
      real_network_request_count: 0,
      create_job_call_count: 0,
    });

    const ledger = fake.getOperationLedger();
    assert.equal(ledger.length, 6);
    assert.deepEqual(
      ledger.map((entry) => entry.operation),
      ['submit', 'sync', 'reconcile', 'cancel', 'collect', 'collect'],
    );
    assert.ok(ledger.every((entry) => (
      entry.payload_hash === materialized.record.payload_hash
      && entry.payload_byte_size === materialized.record.payload_byte_size
      && entry.provider_idempotency_key === base.provider_idempotency_key
      && entry.real_network_request_count === 0
      && entry.create_job_call_count === 0
    )));
    assert.equal(JSON.stringify(ledger).includes('canonical_payload_bytes'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PB07 accepted-response-loss replay preserves one deterministic fake job identity', async () => {
  const materialized = new ExperimentFoundationV2ProviderPayloadService()
    .materialize(prerequisite());
  const fake = new DeterministicFakeAliyunPaiDlcTransport([{
    operation: 'submit',
    invocation: 1,
    kind: 'retryable_after_acceptance',
  }]);
  const request = transportRequest(materialized);

  let lostRef = '';
  await assert.rejects(
    () => fake.submit(request),
    (error) => {
      assert.ok(error instanceof DeterministicFakeProviderFault);
      assert.equal(error.retryable, true);
      assert.equal(error.accepted, true);
      lostRef = error.externalJobRef;
      return true;
    },
  );
  const replay = response(await fake.submit(request));
  assert.equal(replay.external_job_ref, lostRef);
  assert.deepEqual(
    fake.getOperationLedger().map((entry) => ({
      external_job_ref: entry.external_job_ref,
      outcome: entry.outcome,
    })),
    [
      { external_job_ref: lostRef, outcome: 'fault_after_acceptance' },
      { external_job_ref: lostRef, outcome: 'responded' },
    ],
  );
});

test('fake-provider evidence ledger is bounded while invocation counters remain monotonic', async () => {
  const materialized = new ExperimentFoundationV2ProviderPayloadService()
    .materialize(prerequisite());
  const fake = new DeterministicFakeAliyunPaiDlcTransport(
    [{ operation: 'sync', invocation: 5, kind: 'malformed_response' }],
    { maxLedgerEntries: 3 },
  );
  const request = transportRequest(materialized);
  const submitted = response(await fake.submit(request));
  const bound = { ...request, external_job_ref: submitted.external_job_ref };
  for (let invocation = 1; invocation <= 5; invocation += 1) {
    const result = await fake.sync(bound);
    if (invocation === 5) {
      assert.deepEqual(result, {
        malformed: true,
        operation: 'sync',
        payload_hash: materialized.record.payload_hash,
      });
    }
  }

  const retained = fake.getOperationLedger();
  assert.deepEqual(retained.map((entry) => entry.sequence), [4, 5, 6]);
  assert.deepEqual(retained.map((entry) => entry.operation_invocation), [3, 4, 5]);
  assert.deepEqual(retained.map((entry) => entry.outcome), [
    'responded',
    'responded',
    'malformed_response',
  ]);
});

test('PB09 supports retryable and malformed fault responses without changing payload identity', async () => {
  const materialized = new ExperimentFoundationV2ProviderPayloadService()
    .materialize(prerequisite());
  const fake = new DeterministicFakeAliyunPaiDlcTransport([
    { operation: 'submit', invocation: 1, kind: 'retryable_before_response' },
    { operation: 'sync', invocation: 1, kind: 'malformed_response' },
  ]);
  const request = transportRequest(materialized);

  await assert.rejects(
    () => fake.submit(request),
    (error) => error instanceof DeterministicFakeProviderFault
      && error.retryable
      && !error.accepted,
  );
  const submitted = response(await fake.submit(request));
  const malformed = await fake.sync({ ...request, external_job_ref: submitted.external_job_ref });
  assert.deepEqual(malformed, {
    malformed: true,
    operation: 'sync',
    payload_hash: materialized.record.payload_hash,
  });
  assert.deepEqual(
    fake.getOperationLedger().map((entry) => entry.outcome),
    ['fault_before_response', 'responded', 'malformed_response'],
  );
});

test('PB08 transport rejects tampered bytes/hash, wrong job identity, and operation-specific field drift', async () => {
  const materialized = new ExperimentFoundationV2ProviderPayloadService()
    .materialize(prerequisite());
  const fake = new DeterministicFakeAliyunPaiDlcTransport();
  const request = transportRequest(materialized);

  await assert.rejects(
    () => fake.submit({ ...request, payload_hash: hash('9') }),
    (error) => error instanceof DeterministicFakeProviderFault
      && error.errorCode === 'PROVIDER_RESPONSE_INVALID',
  );
  await assert.rejects(
    () => fake.sync({ ...request, external_job_ref: 'caller-authored-job' }),
    (error) => error instanceof DeterministicFakeProviderFault
      && error.errorCode === 'PROVIDER_RESPONSE_INVALID',
  );
  await assert.rejects(
    () => fake.collect({ ...request, cancel_reason_code: 'NOT_ALLOWED' }),
    (error) => error instanceof DeterministicFakeProviderFault
      && error.errorCode === 'PROVIDER_RESPONSE_INVALID',
  );
  const callerExtended = {
    ...(JSON.parse(request.canonical_payload_bytes) as Record<string, unknown>),
    scientific_status: 'validated',
  };
  const callerExtendedBytes = canonicalizeExperimentV2Json(callerExtended);
  await assert.rejects(
    () => fake.submit({
      ...request,
      canonical_payload_bytes: callerExtendedBytes,
      payload_hash: hashCanonicalPayloadBytes(callerExtendedBytes),
    }),
    (error) => error instanceof DeterministicFakeProviderFault
      && error.errorCode === 'PROVIDER_RESPONSE_INVALID',
  );
  for (const outputKeys of [
    [
      'simulation_lifecycle_trace',
      'simulation_provider_metadata',
      'simulation_collection_log',
      'simulation_lifecycle_trace',
    ],
    ['unknown_diagnostic'],
  ]) {
    const invalidOutputPayload = JSON.parse(
      request.canonical_payload_bytes,
    ) as Record<string, unknown> & {
      simulated_job: Record<string, unknown>;
    };
    invalidOutputPayload.simulated_job.output_keys = outputKeys;
    const invalidOutputBytes = canonicalizeExperimentV2Json(invalidOutputPayload);
    await assert.rejects(
      () => fake.submit({
        ...request,
        canonical_payload_bytes: invalidOutputBytes,
        payload_hash: hashCanonicalPayloadBytes(invalidOutputBytes),
      }),
      (error) => error instanceof DeterministicFakeProviderFault
        && error.errorCode === 'PROVIDER_RESPONSE_INVALID',
    );
  }
  assert.equal(fake.getOperationLedger().length, 0);
});
