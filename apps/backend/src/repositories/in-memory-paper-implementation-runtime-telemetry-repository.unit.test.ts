import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
  type PaperImplementationRuntimeTelemetryRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRuntimeTelemetryRepository } from './in-memory-paper-implementation-runtime-telemetry-repository.js';

function record(
  overrides: Partial<PaperImplementationRuntimeTelemetryRecord> = {},
): PaperImplementationRuntimeTelemetryRecord {
  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
    record_id: 'pi_runtime_telemetry_1',
    created_at: '2026-07-15T00:00:00.000Z',
    implementation_project_id: 'project_a',
    run_id: 'run_1',
    slot_id: 'route_architecture',
    role_slot_id: 'route_architecture.route_candidates',
    call_index: 1,
    execution_mode: 'provider_llm',
    provider: 'openai',
    model_option: 'gpt-strong',
    latency_ms: 1000,
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
    cost_usd: 0.01,
    outcome: 'passed',
    retry_kind: null,
    compression_applied: false,
    shadow_tier: null,
    ...overrides,
  };
}

test('appends records and lists them by project', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await repository.appendRuntimeTelemetryRecord(record({ record_id: 'r1', run_id: 'run_1' }));
  await repository.appendRuntimeTelemetryRecord(record({ record_id: 'r2', run_id: 'run_2' }));
  await repository.appendRuntimeTelemetryRecord(
    record({ record_id: 'r3', run_id: 'run_1', implementation_project_id: 'project_b' }),
  );

  const projectA = await repository.listRuntimeTelemetryRecordsByProject('project_a');
  assert.deepEqual(projectA.map((row) => row.record_id).sort(), ['r1', 'r2']);
});

test('lists records scoped to a single run', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await repository.appendRuntimeTelemetryRecord(record({ record_id: 'r1', run_id: 'run_1' }));
  await repository.appendRuntimeTelemetryRecord(record({ record_id: 'r2', run_id: 'run_2' }));

  const run1 = await repository.listRuntimeTelemetryRecordsByRun('project_a', 'run_1');
  assert.deepEqual(run1.map((row) => row.record_id), ['r1']);
});

test('rejects a duplicate record id (append-only)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await repository.appendRuntimeTelemetryRecord(record({ record_id: 'dup' }));
  await assert.rejects(
    () => repository.appendRuntimeTelemetryRecord(record({ record_id: 'dup' })),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
});

test('rejects an unexpected schema version', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await assert.rejects(
    () => repository.appendRuntimeTelemetryRecord(
      record({ schema_version: 'PaperImplementationRuntimeTelemetryRecord@v2' as never }),
    ),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});

test('returns cloned records (mutating a result does not corrupt the store)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await repository.appendRuntimeTelemetryRecord(record({ record_id: 'r1' }));
  const [first] = await repository.listRuntimeTelemetryRecordsByProject('project_a');
  first.cost_usd = 999;
  const [reread] = await repository.listRuntimeTelemetryRecordsByProject('project_a');
  assert.equal(reread.cost_usd, 0.01);
});
