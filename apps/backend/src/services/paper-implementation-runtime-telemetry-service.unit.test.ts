import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryPaperImplementationRuntimeTelemetryRepository } from '../repositories/in-memory-paper-implementation-runtime-telemetry-repository.js';
import type { PaperImplementationRuntimeTelemetryRepository } from '../repositories/paper-implementation-runtime-telemetry.repository.js';
import {
  PaperImplementationRuntimeTelemetryService,
  type PaperImplementationRuntimeProviderCallResultLike,
  type RecordPaperImplementationRuntimeProviderCallInput,
} from './paper-implementation-runtime-telemetry-service.js';

function providerResult(overrides: {
  executionMode?: string;
  provider?: string | null;
  modelOption?: string | null;
  telemetry?: {
    elapsed_ms?: number | null;
    input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    cost_usd?: number | null;
  } | null;
} = {}): PaperImplementationRuntimeProviderCallResultLike {
  return {
    provenance: {
      execution_mode: overrides.executionMode ?? 'provider_llm',
      provider_id: overrides.provider ?? 'openai',
      model_option_id: overrides.modelOption ?? 'gpt-strong',
      telemetry: overrides.telemetry === undefined
        ? { elapsed_ms: 1200, input_tokens: 400, output_tokens: 90, total_tokens: 490, cost_usd: 0.012 }
        : overrides.telemetry,
    },
  };
}

function serviceWith(repository: PaperImplementationRuntimeTelemetryRepository) {
  let seq = 0;
  return new PaperImplementationRuntimeTelemetryService({
    repository,
    idFactory: (prefix) => `${prefix}_${(seq += 1).toString().padStart(4, '0')}`,
    now: () => `2026-07-15T00:00:${(seq).toString().padStart(2, '0')}.000Z`,
  });
}

function call(
  overrides: Partial<RecordPaperImplementationRuntimeProviderCallInput>,
): RecordPaperImplementationRuntimeProviderCallInput {
  return {
    implementationProjectId: 'project_a',
    runId: 'run_1',
    slotId: 'route_architecture',
    roleSlotId: 'route_architecture.route_candidates',
    callIndex: 1,
    executionMode: 'provider_llm',
    result: providerResult(),
    outcome: 'passed',
    retryKind: null,
    compressionApplied: false,
    shadowTier: null,
    ...overrides,
  };
}

test('records a provider call, extracting cost/latency/tokens from the result', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  await service.recordProviderCall(call({}));

  const [record] = await repository.listRuntimeTelemetryRecordsByProject('project_a');
  assert.equal(record.provider, 'openai');
  assert.equal(record.model_option, 'gpt-strong');
  assert.equal(record.latency_ms, 1200);
  assert.equal(record.prompt_tokens, 400);
  assert.equal(record.completion_tokens, 90);
  assert.equal(record.total_tokens, 490);
  assert.equal(record.cost_usd, 0.012);
  assert.equal(record.outcome, 'passed');
});

test('non-provider execution nulls provider fields', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  await service.recordProviderCall(call({
    executionMode: 'mocked_llm',
    result: providerResult({ executionMode: 'mocked_llm', telemetry: null }),
  }));

  const [record] = await repository.listRuntimeTelemetryRecordsByProject('project_a');
  assert.equal(record.provider, null);
  assert.equal(record.cost_usd, null);
  assert.equal(record.latency_ms, null);
});

test('recording is fail-open — a repository error never throws', async () => {
  const failing: PaperImplementationRuntimeTelemetryRepository = {
    appendRuntimeTelemetryRecord: async () => {
      throw new Error('boom');
    },
    listRuntimeTelemetryRecordsByProject: async () => [],
    listRuntimeTelemetryRecordsByRun: async () => [],
  };
  const service = serviceWith(failing);
  await assert.doesNotReject(() => service.recordProviderCall(call({})));
});

test('run summary derives total cost, repaid cost from retried calls, and rate', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  // FA-3 call_index semantics: the retried attempt records call_index 1 and
  // its replacement attempt records call_index 2 — every provider attempt has
  // a unique index, so only the retried attempt's cost is repaid.
  await service.recordProviderCall(call({
    callIndex: 1,
    outcome: 'retried',
    retryKind: 'technical',
    result: providerResult({ telemetry: { cost_usd: 0.02, elapsed_ms: 10, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));
  await service.recordProviderCall(call({
    callIndex: 2,
    outcome: 'passed',
    result: providerResult({ telemetry: { cost_usd: 0.03, elapsed_ms: 10, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));

  const [summary] = await service.listProjectRunSummaries('project_a');
  assert.equal(summary.provider_call_count, 2);
  assert.equal(summary.total_cost_usd, 0.05);
  assert.equal(summary.repaid_cost_usd, 0.02);
  assert.equal(summary.repaid_cost_rate, 0.4);
});

test('duplicate (slot, role, call_index) replays count as repaid (resume re-run)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  const base = { callIndex: 1, outcome: 'passed' as const };
  await service.recordProviderCall(call({
    ...base,
    result: providerResult({ telemetry: { cost_usd: 0.04, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));
  // Same run_id + slot + role + call_index re-run (D9 resume replay).
  await service.recordProviderCall(call({
    ...base,
    result: providerResult({ telemetry: { cost_usd: 0.04, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));

  const detail = await service.getRunDetail('project_a', 'run_1');
  assert.equal(detail.total_cost_usd, 0.08);
  assert.equal(detail.repaid_cost_usd, 0.04);
  assert.equal(detail.per_slot.length, 1);
  assert.equal(detail.per_slot[0].slot_id, 'route_architecture');
  assert.equal(detail.records.length, 2);
});

test('project repaid rate aggregates across runs and slots', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  await service.recordProviderCall(call({
    runId: 'run_1',
    slotId: 'route_architecture',
    outcome: 'retried',
    retryKind: 'technical',
    result: providerResult({ telemetry: { cost_usd: 0.01, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));
  await service.recordProviderCall(call({
    runId: 'run_2',
    slotId: 'trace_integrity_review',
    roleSlotId: 'trace_integrity_review.skeptic_challenge',
    outcome: 'passed',
    shadowTier: 'standard',
    result: providerResult({ telemetry: { cost_usd: 0.03, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));

  const aggregate = await service.getProjectRepaidRate('project_a');
  assert.equal(aggregate.run_count, 2);
  assert.equal(aggregate.provider_call_count, 2);
  assert.equal(aggregate.total_cost_usd, 0.04);
  assert.equal(aggregate.repaid_cost_usd, 0.01);
  assert.equal(aggregate.repaid_cost_rate, 0.25);
  assert.equal(aggregate.per_slot.length, 2);
});

test('zero-cost run reports a repaid rate of 0 (no division by zero)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  await service.recordProviderCall(call({
    executionMode: 'mocked_llm',
    result: providerResult({ executionMode: 'mocked_llm', telemetry: null }),
  }));
  const [summary] = await service.listProjectRunSummaries('project_a');
  assert.equal(summary.total_cost_usd, 0);
  assert.equal(summary.repaid_cost_rate, 0);
});

// ---------------------------------------------------------------------------
// S4 复审 FA-3 regression: a debate-slot technical retry must be repaid ONCE
// (the retried attempt's cost), never rate 1.0 — the pre-FA-3 shared
// call_index made the replacement attempt a duplicate and double-counted it.
// ---------------------------------------------------------------------------

test('debate-slot single retry repays only the retried attempt cost (cost ratio, not 1.0)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  const debate = {
    slotId: 'trace_integrity_review',
    roleSlotId: 'trace_integrity_review.skeptic_challenge',
  };
  // Attempt 1 times out and is retried; attempt 2 (unique call_index) passes.
  await service.recordProviderCall(call({
    ...debate,
    callIndex: 1,
    outcome: 'retried',
    retryKind: 'technical',
    result: providerResult({ telemetry: { cost_usd: 0.02, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));
  await service.recordProviderCall(call({
    ...debate,
    callIndex: 2,
    outcome: 'passed',
    result: providerResult({ telemetry: { cost_usd: 0.03, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 } }),
  }));

  const [summary] = await service.listProjectRunSummaries('project_a');
  assert.equal(summary.total_cost_usd, 0.05);
  assert.equal(summary.repaid_cost_usd, 0.02);
  // Cost-ratio repaid rate (0.02 / 0.05); the double-count bug reported 1.0.
  assert.equal(summary.repaid_cost_rate, 0.4);
});

// ---------------------------------------------------------------------------
// S4 复审 FA-4: coordinator re-advance runs (fresh run_id per attempt) are
// repaid at the project level via the node_attempt_id naming convention.
// ---------------------------------------------------------------------------

function costResult(costUsd: number) {
  return providerResult({
    telemetry: { cost_usd: costUsd, elapsed_ms: 1, input_tokens: 1, output_tokens: 1, total_tokens: 2 },
  });
}

test('coordinator re-advance run (attempt >= 1) is fully repaid at the project level', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  // First execution of step 0 (attempt-0, coordinator numbers attempts from 0).
  await service.recordProviderCall(call({
    runId: 'pi_coordinator_run_1.step-0.attempt-0_a1',
    outcome: 'passed',
    result: costResult(0.05),
  }));
  // Re-advance replay of the same step: fresh run_id, attempt-1.
  await service.recordProviderCall(call({
    runId: 'pi_coordinator_run_1.step-0.attempt-1_b2',
    outcome: 'passed',
    result: costResult(0.04),
  }));

  const aggregate = await service.getProjectRepaidRate('project_a');
  assert.equal(aggregate.run_count, 2);
  assert.equal(aggregate.total_cost_usd, 0.09);
  assert.equal(aggregate.repaid_cost_usd, 0.04);
  assert.equal(aggregate.repaid_cost_rate, Math.round((0.04 / 0.09) * 1e6) / 1e6);
  // The slot breakdown attributes the re-advance repaid spend too.
  assert.equal(aggregate.per_slot.length, 1);
  assert.equal(aggregate.per_slot[0].repaid_cost_usd, 0.04);

  // Run summaries keep the run-local view: the re-advance run alone has no
  // internal retries, so its own summary reports zero repaid spend.
  const runs = await service.listProjectRunSummaries('project_a');
  const reAdvance = runs.find((run) => run.run_id === 'pi_coordinator_run_1.step-0.attempt-1_b2');
  assert.ok(reAdvance);
  assert.equal(reAdvance.repaid_cost_usd, 0);
});

test('non-coordinator run_ids and attempt-0 runs are not re-advance repaid', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  // Ordinary run_id — untouched by the convention.
  await service.recordProviderCall(call({
    runId: 'run_1',
    outcome: 'passed',
    result: costResult(0.05),
  }));
  // Coordinator first attempt (attempt-0) — the original payment, not repaid.
  await service.recordProviderCall(call({
    runId: 'pi_coordinator_run_1.step-2.attempt-0_c3',
    outcome: 'passed',
    result: costResult(0.03),
  }));
  // Convention-looking but non-numeric attempt — parse failure, ordinary run.
  await service.recordProviderCall(call({
    runId: 'pi_coordinator_run_1.step-2.attempt-x_d4',
    outcome: 'passed',
    result: costResult(0.02),
  }));

  const aggregate = await service.getProjectRepaidRate('project_a');
  assert.equal(aggregate.repaid_cost_usd, 0);
  assert.equal(aggregate.repaid_cost_rate, 0);
});

// ---------------------------------------------------------------------------
// S4 复审 FA-6: merged single-fetch overview.
// ---------------------------------------------------------------------------

test('project telemetry overview merges run summaries and the project aggregate in one shape', async () => {
  const repository = new InMemoryPaperImplementationRuntimeTelemetryRepository();
  const service = serviceWith(repository);
  await service.recordProviderCall(call({
    runId: 'run_1',
    outcome: 'retried',
    retryKind: 'technical',
    result: costResult(0.01),
  }));
  await service.recordProviderCall(call({
    runId: 'run_1',
    callIndex: 2,
    outcome: 'passed',
    result: costResult(0.03),
  }));
  await service.recordProviderCall(call({
    runId: 'pi_coordinator_run_1.step-0.attempt-1_e5',
    slotId: 'trace_integrity_review',
    roleSlotId: 'trace_integrity_review.skeptic_challenge',
    outcome: 'passed',
    result: costResult(0.06),
  }));

  const overview = await service.getProjectTelemetryOverview('project_a');
  assert.equal(overview.implementation_project_id, 'project_a');
  assert.equal(overview.runs.length, 2);
  const run1 = overview.runs.find((run) => run.run_id === 'run_1');
  assert.ok(run1);
  assert.equal(run1.repaid_cost_usd, 0.01);
  // Project aggregate applies both repaid semantics: run-local retry (0.01)
  // plus the whole re-advance run (0.06).
  assert.equal(overview.project_repaid_rate.total_cost_usd, 0.1);
  assert.equal(overview.project_repaid_rate.repaid_cost_usd, 0.07);
  assert.equal(overview.project_repaid_rate.repaid_cost_rate, 0.7);
  // per_slot is hoisted from the aggregate for direct rendering.
  assert.deepEqual(overview.per_slot, overview.project_repaid_rate.per_slot);
  assert.equal(overview.per_slot.length, 2);
});
