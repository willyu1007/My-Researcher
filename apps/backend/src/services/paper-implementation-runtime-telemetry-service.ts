import crypto from 'node:crypto';

import {
  PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
  type PaperImplementationAgentExecutionMode,
  type PaperImplementationDebateComplexityTier,
  type PaperImplementationRuntimeTelemetryOutcome,
  type PaperImplementationRuntimeTelemetryProjectOverview,
  type PaperImplementationRuntimeTelemetryProjectRepaidRate,
  type PaperImplementationRuntimeTelemetryRecord,
  type PaperImplementationRuntimeTelemetryRetryKind,
  type PaperImplementationRuntimeTelemetryRunDetail,
  type PaperImplementationRuntimeTelemetryRunSummary,
  type PaperImplementationRuntimeTelemetrySlotBreakdown,
  type PaperImplementationRuntimeTelemetryTierMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';

import type {
  PaperImplementationRuntimeTelemetryRepository,
} from '../repositories/paper-implementation-runtime-telemetry.repository.js';
import { derivePaperImplementationRuntimeTelemetryTierMode } from './paper-implementation-runtime-utils.js';

/**
 * Minimal structural view of an orchestrator invocation result the collector
 * reads. Kept decoupled from the topic-selection contract so callers can pass
 * the real `TopicSelectionAgentInvocationResult` (structurally assignable) and
 * unit tests can pass a plain object.
 */
export interface PaperImplementationRuntimeProviderCallTelemetry {
  elapsed_ms?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  cost_usd?: number | null;
}

export interface PaperImplementationRuntimeProviderCallProvenance {
  execution_mode: string;
  model_option_id?: string | null;
  provider_id?: string | null;
  telemetry?: PaperImplementationRuntimeProviderCallTelemetry | null;
}

export interface PaperImplementationRuntimeProviderCallResultLike {
  provenance: PaperImplementationRuntimeProviderCallProvenance;
}

export interface RecordPaperImplementationRuntimeProviderCallInput {
  implementationProjectId: string;
  runId: string;
  slotId: string;
  roleSlotId: string | null;
  callIndex: number;
  executionMode: PaperImplementationAgentExecutionMode;
  result: PaperImplementationRuntimeProviderCallResultLike;
  outcome: PaperImplementationRuntimeTelemetryOutcome;
  retryKind: PaperImplementationRuntimeTelemetryRetryKind | null;
  compressionApplied: boolean;
  shadowTier: PaperImplementationDebateComplexityTier | null;
  /**
   * D2 复审 (B#6/C#3): tier-context discriminator for `shadowTier`, decided once
   * in the shared runtime telemetry helper. `null` when there is no tier context.
   */
  tierMode: PaperImplementationRuntimeTelemetryTierMode | null;
}

/**
 * Narrow write-only surface injected into the eleven runtime slot services.
 * Deliberately exposes ONLY `recordProviderCall` so a slot service can never
 * read or aggregate telemetry through this handle.
 */
export interface PaperImplementationRuntimeTelemetryCollector {
  recordProviderCall(input: RecordPaperImplementationRuntimeProviderCallInput): Promise<void>;
}

function nonNegativeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function nonNegativeInteger(value: number | null | undefined): number | null {
  const parsed = nonNegativeNumber(value);
  return parsed === null ? null : Math.floor(parsed);
}

/**
 * S4-A runtime telemetry collector + read-model service.
 *
 * `recordProviderCall` is FAIL-OPEN: any build or persistence error is logged
 * (`console.warn`) and swallowed so telemetry can never break a run. The read
 * methods derive run/project cost and repaid-rate aggregates from the
 * append-only sink.
 */
export class PaperImplementationRuntimeTelemetryService
implements PaperImplementationRuntimeTelemetryCollector {
  private readonly repository: PaperImplementationRuntimeTelemetryRepository;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: {
    repository: PaperImplementationRuntimeTelemetryRepository;
    idFactory?: (prefix: string) => string;
    now?: () => string;
  }) {
    this.repository = options.repository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async recordProviderCall(
    input: RecordPaperImplementationRuntimeProviderCallInput,
  ): Promise<void> {
    try {
      const record = this.buildRecord(input);
      await this.repository.appendRuntimeTelemetryRecord(record);
    } catch (error) {
      // Fail-open: telemetry must never affect a run.
      console.warn(
        `[pi-runtime-telemetry] failed to record provider call for run ${input.runId} `
        + `slot ${input.slotId}; run is unaffected.`,
        error,
      );
    }
  }

  private buildRecord(
    input: RecordPaperImplementationRuntimeProviderCallInput,
  ): PaperImplementationRuntimeTelemetryRecord {
    const provenance = input.result.provenance;
    const telemetry = provenance.telemetry ?? null;
    const isProvider = input.executionMode === 'provider_llm';
    return {
      schema_version: PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
      record_id: this.idFactory('pi_runtime_telemetry'),
      created_at: this.now(),
      implementation_project_id: input.implementationProjectId,
      run_id: input.runId,
      slot_id: input.slotId,
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      execution_mode: input.executionMode,
      provider: isProvider ? provenance.provider_id ?? null : null,
      model_option: provenance.model_option_id ?? null,
      latency_ms: nonNegativeNumber(telemetry?.elapsed_ms),
      prompt_tokens: nonNegativeInteger(telemetry?.input_tokens),
      completion_tokens: nonNegativeInteger(telemetry?.output_tokens),
      total_tokens: nonNegativeInteger(telemetry?.total_tokens),
      cost_usd: nonNegativeNumber(telemetry?.cost_usd),
      outcome: input.outcome,
      retry_kind: input.retryKind,
      compression_applied: input.compressionApplied,
      shadow_tier: input.shadowTier,
      tier_mode: input.tierMode,
    };
  }

  // Read model note (S4 复审 FA-6): all read methods materialize the project's
  // (or run's) records in memory and aggregate in JS. At the current scale
  // (tens of runs × tens of calls) this is fine; pushing the groupBy/sum down
  // to the DB and paginating `records` are REGISTERED follow-up optimizations,
  // deliberately not implemented here.

  async listProjectRunSummaries(
    implementationProjectId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRunSummary[]> {
    const records = await this.repository.listRuntimeTelemetryRecordsByProject(implementationProjectId);
    return this.computeProjectAccounting(implementationProjectId, records).runs;
  }

  async getRunDetail(
    implementationProjectId: string,
    runId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRunDetail> {
    // FA-6 single pass: one sort + one accounting, shared by the summary and
    // the per-slot breakdown (previously each was computed twice).
    const records = sortRecords(
      await this.repository.listRuntimeTelemetryRecordsByRun(implementationProjectId, runId),
    );
    const accounting = computeRunAccounting(records);
    return {
      ...runSummaryFromAccounting(implementationProjectId, runId, records, accounting),
      per_slot: accounting.perSlot,
      // D2 复审 (B#6/C#3) storage note: `tier_mode` is NOT a stored column — it
      // is a total function of the persisted `slot_id` + `shadow_tier`, so no
      // schema migration is needed. The write path stamps it (fail-open) and
      // this read model reconstructs it for any record whose repository dropped
      // it (a column-backed store persists only the mapped columns). `??`
      // preserves an already-carried value and rebuilds a missing one.
      records: records.map((record) => ({
        ...record,
        tier_mode: record.tier_mode
          ?? derivePaperImplementationRuntimeTelemetryTierMode(record.slot_id, record.shadow_tier),
      })),
    };
  }

  async getProjectRepaidRate(
    implementationProjectId: string,
  ): Promise<PaperImplementationRuntimeTelemetryProjectRepaidRate> {
    const records = await this.repository.listRuntimeTelemetryRecordsByProject(implementationProjectId);
    return this.computeProjectAccounting(implementationProjectId, records).aggregate;
  }

  /**
   * S4 复审 FA-6: single-fetch overview — run summaries + project aggregate +
   * hoisted per-slot totals from ONE repository read and one accounting pass,
   * so desktop/runner consumers stop chaining the `runs` and `repaid-rate`
   * endpoints (both of which remain for compatibility).
   */
  async getProjectTelemetryOverview(
    implementationProjectId: string,
  ): Promise<PaperImplementationRuntimeTelemetryProjectOverview> {
    const records = await this.repository.listRuntimeTelemetryRecordsByProject(implementationProjectId);
    const { runs, aggregate } = this.computeProjectAccounting(implementationProjectId, records);
    return {
      implementation_project_id: implementationProjectId,
      runs,
      project_repaid_rate: aggregate,
      per_slot: aggregate.per_slot,
    };
  }

  /**
   * One pass over a project's records: groups by run, accounts each run once,
   * and derives BOTH the per-run summaries (run-local repaid semantics) and
   * the project aggregate. The project aggregate additionally applies the
   * coordinator re-advance convention (S4 复审 FA-4): a run whose run_id
   * parses as `{coordinator_run_id}.step-{i}.attempt-{n}[_suffix]` with
   * n >= 1 is a re-advance replay of an earlier attempt of the same step —
   * its ENTIRE cost is repaid at the project level (the per-run duplicate
   * detection can never see it because each attempt gets a fresh run_id).
   * Run summaries deliberately keep the run-local view.
   */
  private computeProjectAccounting(
    implementationProjectId: string,
    records: PaperImplementationRuntimeTelemetryRecord[],
  ): {
    runs: PaperImplementationRuntimeTelemetryRunSummary[];
    aggregate: PaperImplementationRuntimeTelemetryProjectRepaidRate;
  } {
    const byRun = groupByRun(records);
    const runs: PaperImplementationRuntimeTelemetryRunSummary[] = [];
    let providerCallCount = 0;
    let totalCost = 0;
    let repaidCost = 0;
    const slotTotals = new Map<string, PaperImplementationRuntimeTelemetrySlotBreakdown>();
    // Duplicate detection is per-run (resume replays reuse the same run_id), so
    // account each run independently and then sum project-wide.
    for (const [runId, runRecords] of byRun.entries()) {
      const sorted = sortRecords(runRecords);
      const accounting = computeRunAccounting(sorted);
      runs.push(runSummaryFromAccounting(implementationProjectId, runId, sorted, accounting));
      const wholeRunRepaid = isCoordinatorReAdvanceRunId(runId);
      providerCallCount += accounting.providerCallCount;
      totalCost += accounting.totalCost;
      repaidCost += wholeRunRepaid ? accounting.totalCost : accounting.repaidCost;
      for (const slot of accounting.perSlot) {
        const existing = slotTotals.get(slot.slot_id) ?? {
          slot_id: slot.slot_id,
          provider_call_count: 0,
          total_cost_usd: 0,
          repaid_cost_usd: 0,
        };
        existing.provider_call_count += slot.provider_call_count;
        existing.total_cost_usd = roundCost(existing.total_cost_usd + slot.total_cost_usd);
        existing.repaid_cost_usd = roundCost(
          existing.repaid_cost_usd + (wholeRunRepaid ? slot.total_cost_usd : slot.repaid_cost_usd),
        );
        slotTotals.set(slot.slot_id, existing);
      }
    }
    runs.sort((left, right) =>
      (right.last_call_at ?? '').localeCompare(left.last_call_at ?? '')
      || left.run_id.localeCompare(right.run_id));
    return {
      runs,
      aggregate: {
        implementation_project_id: implementationProjectId,
        run_count: byRun.size,
        provider_call_count: providerCallCount,
        total_cost_usd: roundCost(totalCost),
        repaid_cost_usd: roundCost(repaidCost),
        repaid_cost_rate: repaidRate(totalCost, repaidCost),
        per_slot: sortSlots([...slotTotals.values()]),
      },
    };
  }
}

/**
 * S4 复审 FA-4: coordinator re-advance run_id convention. The run coordinator
 * hands every slot a run_id equal to its node_attempt_id:
 * `idFactory("{coordinator_run_id}.step-{stepIndex}.attempt-{attemptSequence}")`
 * — the default idFactory appends `_{uuid}` to that prefix, and
 * `attemptSequence` counts existing steps for the index, i.e. the FIRST
 * execution is `attempt-0`. An attempt sequence >= 1 therefore marks a
 * re-advance replay of a step whose earlier attempt already spent. Returns
 * true only for run_ids that parse to the convention with attempt >= 1;
 * anything else (including parse failures) is an ordinary run.
 */
const COORDINATOR_NODE_ATTEMPT_RUN_ID_PATTERN = /\.step-\d+\.attempt-(\d+)(?:_|$)/;

export function isCoordinatorReAdvanceRunId(runId: string): boolean {
  const match = COORDINATOR_NODE_ATTEMPT_RUN_ID_PATTERN.exec(runId);
  if (!match) {
    return false;
  }
  const attemptSequence = Number.parseInt(match[1], 10);
  return Number.isFinite(attemptSequence) && attemptSequence >= 1;
}

function runSummaryFromAccounting(
  implementationProjectId: string,
  runId: string,
  sortedRecords: PaperImplementationRuntimeTelemetryRecord[],
  accounting: RunAccounting,
): PaperImplementationRuntimeTelemetryRunSummary {
  return {
    implementation_project_id: implementationProjectId,
    run_id: runId,
    provider_call_count: accounting.providerCallCount,
    total_cost_usd: roundCost(accounting.totalCost),
    repaid_cost_usd: roundCost(accounting.repaidCost),
    repaid_cost_rate: repaidRate(accounting.totalCost, accounting.repaidCost),
    first_call_at: sortedRecords.length > 0 ? sortedRecords[0].created_at : null,
    last_call_at: sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].created_at : null,
  };
}

interface RunAccounting {
  providerCallCount: number;
  totalCost: number;
  repaidCost: number;
  perSlot: PaperImplementationRuntimeTelemetrySlotBreakdown[];
}

function computeRunAccounting(records: PaperImplementationRuntimeTelemetryRecord[]): RunAccounting {
  const seen = new Set<string>();
  const perSlot = new Map<string, PaperImplementationRuntimeTelemetrySlotBreakdown>();
  let providerCallCount = 0;
  let totalCost = 0;
  let repaidCost = 0;
  for (const record of records) {
    const cost = record.cost_usd ?? 0;
    const key = `${record.slot_id}|${record.role_slot_id ?? ''}|${record.call_index}`;
    const isDuplicate = seen.has(key);
    seen.add(key);
    // Re-paid spend: a retried call (its work is repeated by the next attempt)
    // or a duplicate (slot, role, call-index) replay of the same run. Since
    // FA-3 every provider attempt within one execution carries a unique
    // call_index, so the duplicate branch fires ONLY on cross-execution
    // replays of the same run_id (D9 resume re-recording a role), never on a
    // retry's replacement attempt.
    const repaidContribution = record.outcome === 'retried' || isDuplicate ? cost : 0;
    totalCost += cost;
    repaidCost += repaidContribution;
    if (record.execution_mode === 'provider_llm') {
      providerCallCount += 1;
    }
    const slot = perSlot.get(record.slot_id) ?? {
      slot_id: record.slot_id,
      provider_call_count: 0,
      total_cost_usd: 0,
      repaid_cost_usd: 0,
    };
    if (record.execution_mode === 'provider_llm') {
      slot.provider_call_count += 1;
    }
    slot.total_cost_usd = roundCost(slot.total_cost_usd + cost);
    slot.repaid_cost_usd = roundCost(slot.repaid_cost_usd + repaidContribution);
    perSlot.set(record.slot_id, slot);
  }
  return {
    providerCallCount,
    totalCost,
    repaidCost,
    perSlot: sortSlots([...perSlot.values()]),
  };
}

function groupByRun(
  records: PaperImplementationRuntimeTelemetryRecord[],
): Map<string, PaperImplementationRuntimeTelemetryRecord[]> {
  const byRun = new Map<string, PaperImplementationRuntimeTelemetryRecord[]>();
  for (const record of records) {
    const existing = byRun.get(record.run_id) ?? [];
    existing.push(record);
    byRun.set(record.run_id, existing);
  }
  return byRun;
}

function sortRecords(
  records: PaperImplementationRuntimeTelemetryRecord[],
): PaperImplementationRuntimeTelemetryRecord[] {
  return [...records].sort((left, right) =>
    left.created_at.localeCompare(right.created_at)
    || left.record_id.localeCompare(right.record_id));
}

function sortSlots(
  slots: PaperImplementationRuntimeTelemetrySlotBreakdown[],
): PaperImplementationRuntimeTelemetrySlotBreakdown[] {
  return [...slots].sort((left, right) => left.slot_id.localeCompare(right.slot_id));
}

function repaidRate(totalCost: number, repaidCost: number): number {
  if (totalCost <= 0) {
    return 0;
  }
  return Math.round((repaidCost / totalCost) * 1e6) / 1e6;
}

function roundCost(value: number): number {
  // USD costs are tiny fractions; keep 10 significant fractional digits so
  // summation stays stable without float noise.
  return Math.round(value * 1e10) / 1e10;
}
