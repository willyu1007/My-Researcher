import assert from 'node:assert/strict';
import test from 'node:test';

import { PrismaClient } from '@prisma/client';

import {
  PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
  type PaperImplementationRuntimeTelemetryProjectOverview,
  type PaperImplementationRuntimeTelemetryProjectRepaidRate,
  type PaperImplementationRuntimeTelemetryRecord,
  type PaperImplementationRuntimeTelemetryRunDetail,
  type PaperImplementationRuntimeTelemetryRunSummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';

import { buildApp } from '../app.js';
import { InMemoryPaperImplementationRuntimeTelemetryRepository } from '../repositories/in-memory-paper-implementation-runtime-telemetry-repository.js';
import { PrismaPaperImplementationRuntimeTelemetryRepository } from '../repositories/prisma/prisma-paper-implementation-runtime-telemetry-repository.js';

// S4-A: the additive migration is written but NOT applied; the prisma
// persistence round-trip is env-gated behind the shared runtime prisma-smoke
// flag (same convention as the T-114 runtime prisma smoke).
function shouldRunRuntimePrismaSmoke(): boolean {
  return process.env.T114_RUNTIME_PRISMA_SMOKE === '1';
}

const PROJECT_ID = 'impl_project_telemetry';

function record(
  overrides: Partial<PaperImplementationRuntimeTelemetryRecord>,
): PaperImplementationRuntimeTelemetryRecord {
  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
    record_id: 'r0',
    created_at: '2026-07-15T00:00:00.000Z',
    implementation_project_id: PROJECT_ID,
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
    cost_usd: 0.02,
    outcome: 'passed',
    retry_kind: null,
    compression_applied: false,
    shadow_tier: null,
    ...overrides,
  };
}

async function seededApp() {
  const telemetryRepository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await telemetryRepository.appendRuntimeTelemetryRecord(record({
    record_id: 'r1',
    run_id: 'run_1',
    created_at: '2026-07-15T00:00:01.000Z',
    outcome: 'retried',
    retry_kind: 'technical',
    cost_usd: 0.02,
  }));
  await telemetryRepository.appendRuntimeTelemetryRecord(record({
    record_id: 'r2',
    run_id: 'run_1',
    call_index: 2,
    created_at: '2026-07-15T00:00:02.000Z',
    outcome: 'passed',
    cost_usd: 0.03,
  }));
  await telemetryRepository.appendRuntimeTelemetryRecord(record({
    record_id: 'r3',
    run_id: 'run_2',
    slot_id: 'trace_integrity_review',
    role_slot_id: 'trace_integrity_review.skeptic_challenge',
    created_at: '2026-07-15T00:00:03.000Z',
    outcome: 'passed',
    shadow_tier: 'standard',
    cost_usd: 0.05,
  }));
  const app = buildApp({ paperImplementationRuntimeTelemetryRepository: telemetryRepository });
  return app;
}

test('GET runtime-telemetry/runs returns per-run cost + repaid-rate summaries', async () => {
  const app = await seededApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-telemetry/runs`,
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { runs: PaperImplementationRuntimeTelemetryRunSummary[] };
    assert.equal(body.runs.length, 2);
    const run1 = body.runs.find((run) => run.run_id === 'run_1');
    assert.ok(run1);
    assert.equal(run1.provider_call_count, 2);
    assert.equal(run1.total_cost_usd, 0.05);
    assert.equal(run1.repaid_cost_usd, 0.02);
    assert.equal(run1.repaid_cost_rate, 0.4);
  } finally {
    await app.close();
  }
});

test('GET runtime-telemetry/runs/:run_id returns the run detail with per-slot + records', async () => {
  const app = await seededApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-telemetry/runs/run_1`,
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as PaperImplementationRuntimeTelemetryRunDetail;
    assert.equal(body.run_id, 'run_1');
    assert.equal(body.records.length, 2);
    assert.equal(body.per_slot.length, 1);
    assert.equal(body.per_slot[0]?.slot_id, 'route_architecture');
    assert.equal(body.per_slot[0]?.total_cost_usd, 0.05);
    assert.equal(body.per_slot[0]?.repaid_cost_usd, 0.02);
  } finally {
    await app.close();
  }
});

test('GET runtime-telemetry/repaid-rate aggregates the whole project', async () => {
  const app = await seededApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-telemetry/repaid-rate`,
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as PaperImplementationRuntimeTelemetryProjectRepaidRate;
    assert.equal(body.run_count, 2);
    assert.equal(body.provider_call_count, 3);
    assert.equal(body.total_cost_usd, 0.1);
    assert.equal(body.repaid_cost_usd, 0.02);
    assert.equal(body.repaid_cost_rate, 0.2);
    assert.equal(body.per_slot.length, 2);
  } finally {
    await app.close();
  }
});

// S4 复审 FA-6: merged single-fetch overview endpoint (additive; the two
// legacy endpoints above stay).
test('GET runtime-telemetry/overview merges runs + project aggregate + per-slot in one response', async () => {
  const telemetryRepository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  await telemetryRepository.appendRuntimeTelemetryRecord(record({
    record_id: 'r1',
    run_id: 'run_1',
    created_at: '2026-07-15T00:00:01.000Z',
    outcome: 'retried',
    retry_kind: 'technical',
    cost_usd: 0.02,
  }));
  await telemetryRepository.appendRuntimeTelemetryRecord(record({
    record_id: 'r2',
    run_id: 'run_1',
    call_index: 2,
    created_at: '2026-07-15T00:00:02.000Z',
    outcome: 'passed',
    cost_usd: 0.03,
  }));
  // Coordinator re-advance run (FA-4): attempt >= 1 → whole run repaid at the
  // project level, while its own run summary stays run-local (zero repaid).
  await telemetryRepository.appendRuntimeTelemetryRecord(record({
    record_id: 'r3',
    run_id: 'pi_coordinator_run_9.step-0.attempt-1_x1',
    slot_id: 'trace_integrity_review',
    role_slot_id: 'trace_integrity_review.skeptic_challenge',
    created_at: '2026-07-15T00:00:03.000Z',
    outcome: 'passed',
    cost_usd: 0.05,
  }));
  const app = buildApp({ paperImplementationRuntimeTelemetryRepository: telemetryRepository });
  try {
    const response = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-telemetry/overview`,
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as PaperImplementationRuntimeTelemetryProjectOverview;
    assert.equal(body.implementation_project_id, PROJECT_ID);
    assert.equal(body.runs.length, 2);
    const run1 = body.runs.find((run) => run.run_id === 'run_1');
    assert.ok(run1);
    assert.equal(run1.repaid_cost_usd, 0.02);
    const reAdvance = body.runs.find((run) => run.run_id === 'pi_coordinator_run_9.step-0.attempt-1_x1');
    assert.ok(reAdvance);
    assert.equal(reAdvance.repaid_cost_usd, 0);
    assert.equal(body.project_repaid_rate.run_count, 2);
    assert.equal(body.project_repaid_rate.total_cost_usd, 0.1);
    assert.equal(body.project_repaid_rate.repaid_cost_usd, 0.07);
    assert.equal(body.project_repaid_rate.repaid_cost_rate, 0.7);
    assert.deepEqual(body.per_slot, body.project_repaid_rate.per_slot);
    assert.equal(body.per_slot.length, 2);
  } finally {
    await app.close();
  }
});

test('empty project reports zero runs and a zero repaid rate', async () => {
  const app = buildApp({
    paperImplementationRuntimeTelemetryRepository: new InMemoryPaperImplementationRuntimeTelemetryRepository(),
  });
  try {
    const runs = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-telemetry/runs`,
    });
    assert.equal(runs.statusCode, 200);
    assert.deepEqual((runs.json() as { runs: unknown[] }).runs, []);

    const repaid = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(PROJECT_ID)}/runtime-telemetry/repaid-rate`,
    });
    assert.equal(repaid.statusCode, 200);
    const body = repaid.json() as PaperImplementationRuntimeTelemetryProjectRepaidRate;
    assert.equal(body.run_count, 0);
    assert.equal(body.repaid_cost_rate, 0);
  } finally {
    await app.close();
  }
});

test(
  'S4-A Prisma telemetry sink persists and queries a runtime telemetry record',
  {
    skip: shouldRunRuntimePrismaSmoke()
      ? false
      : 'set T114_RUNTIME_PRISMA_SMOKE=1 with DATABASE_URL and the S4 telemetry migration applied',
    timeout: 120_000,
  },
  async () => {
    const client = new PrismaClient();
    const repository = new PrismaPaperImplementationRuntimeTelemetryRepository(client);
    const runId = `pi_runtime_telemetry_prisma_smoke_${Date.now()}`;
    const recordId = `${runId}_r1`;
    try {
      await repository.appendRuntimeTelemetryRecord(record({
        record_id: recordId,
        run_id: runId,
        outcome: 'retried',
        retry_kind: 'technical',
        shadow_tier: 'full',
        cost_usd: 0.0123,
      }));
      const byRun = await repository.listRuntimeTelemetryRecordsByRun(PROJECT_ID, runId);
      assert.equal(byRun.length, 1);
      assert.equal(byRun[0]?.record_id, recordId);
      assert.equal(byRun[0]?.outcome, 'retried');
      assert.equal(byRun[0]?.retry_kind, 'technical');
      assert.equal(byRun[0]?.shadow_tier, 'full');
      assert.equal(byRun[0]?.cost_usd, 0.0123);
      const byProject = await repository.listRuntimeTelemetryRecordsByProject(PROJECT_ID);
      assert.ok(byProject.some((row) => row.record_id === recordId));
    } finally {
      await client.paperImplementationRuntimeTelemetryRecord.deleteMany({ where: { runId } });
      await client.$disconnect();
    }
  },
);
