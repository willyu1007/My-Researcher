import {
  PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES,
  type PaperImplementationAgentExecutionMode,
} from './paper-implementation-agent-common-contracts.js';
import {
  PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS,
  type PaperImplementationDebateComplexityTier,
} from './paper-implementation-debate-complexity-shadow.js';

export type {
  PaperImplementationAgentExecutionMode,
} from './paper-implementation-agent-common-contracts.js';
export type {
  PaperImplementationDebateComplexityTier,
} from './paper-implementation-debate-complexity-shadow.js';

/**
 * S4-A runtime telemetry sink contract.
 *
 * `PaperImplementationRuntimeTelemetryRecord@v1` is an append-only,
 * per-provider-call observation emitted by the eleven runtime slot services.
 * It records the operational shape of one provider invocation (latency, tokens,
 * gateway-computed cost, outcome, retry classification) plus the S4-C shadow
 * tier — WITHOUT ever carrying prompt bodies or raw provider responses
 * (provenance policy is unchanged). It is purely observational: writing it
 * never changes a run's execution semantics, and a write failure is swallowed
 * fail-open by the collector.
 */

export const PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION =
  'PaperImplementationRuntimeTelemetryRecord@v1' as const;

/**
 * Per-call outcome. `repaid_cost` counts `retried` calls (and duplicate
 * call-index replays) as re-paid spend — see the run aggregate below.
 */
export const PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_OUTCOMES = [
  'passed',
  'retried',
  'failed',
] as const;
export type PaperImplementationRuntimeTelemetryOutcome =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_OUTCOMES)[number];

/**
 * Classification of a retry. Non-null only on a `retried` call: `technical`
 * for gateway/transport failures and echo/schema technical retries,
 * `semantic` for role-output semantic completeness retries.
 */
export const PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RETRY_KINDS = [
  'technical',
  'semantic',
] as const;
export type PaperImplementationRuntimeTelemetryRetryKind =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RETRY_KINDS)[number];

/**
 * D2 复审 (B#6/C#3): tier-context discriminator for `shadow_tier`. The
 * `shadow_tier` column conflates two semantics on one field — the trace-integrity
 * boundary debate records the ENFORCED tier actually in effect, while the P1
 * claim-boundary and motive-evolution slots record a record-only SHADOW
 * recommendation. `tier_mode` names which one a row carries so aggregations and
 * the desktop runtime view stop mixing them on a single column:
 *   - `enforced` — the tier was in effect (trace-integrity boundary debate);
 *   - `shadow`   — a record-only recommendation (P1 / motive-evolution slots).
 * A `null` `tier_mode` means "no tier context" (`shadow_tier` is null).
 */
export const PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_TIER_MODES = [
  'enforced',
  'shadow',
] as const;
export type PaperImplementationRuntimeTelemetryTierMode =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_TIER_MODES)[number];

export interface PaperImplementationRuntimeTelemetryRecord {
  schema_version: typeof PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION;
  record_id: string;
  created_at: string;
  implementation_project_id: string;
  run_id: string;
  slot_id: string;
  /** Null for a final-artifact / whole-run call; the role slot for a role call. */
  role_slot_id: string | null;
  /**
   * 1-based provider-attempt ordinal within one (run, slot, role_slot)
   * invocation sequence (S4 复审 FA-3 unified semantics, all 11 slot services):
   * every provider attempt — including same-profile technical/semantic retries —
   * carries a UNIQUE call_index (`retryAttemptIndex + 1`). A duplicate
   * (slot_id, role_slot_id, call_index) key inside the same run_id therefore
   * only occurs on a true cross-execution replay (D9 resume re-running a
   * partially recorded role under the same run_id), which the accounting counts
   * as repaid spend. Retried attempts and their replacement attempts NEVER
   * share a call_index (the pre-FA-3 debate-slot sharing double-counted one
   * retry as repaid twice).
   */
  call_index: number;
  execution_mode: PaperImplementationAgentExecutionMode;
  /** Provider id (e.g. `openai`); null for non-provider execution modes. */
  provider: string | null;
  /** Resolved model option id; null for non-provider execution modes. */
  model_option: string | null;
  latency_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  outcome: PaperImplementationRuntimeTelemetryOutcome;
  retry_kind: PaperImplementationRuntimeTelemetryRetryKind | null;
  compression_applied: boolean;
  /**
   * The debate tier recorded for the provider call; null when no assessment
   * applies. Semantics by slot (D2-core): for the trace-integrity boundary
   * debate this is the ENFORCED tier actually in effect (the effective tier
   * after any deterministic light→standard upgrade), i.e. the field name is
   * kept for schema stability but the value is no longer record-only there. For
   * the P1 claim-boundary / dossier-readiness and motive-evolution slots it
   * remains the record-only SHADOW recommendation (those slots are not yet
   * policy-driven). Its enforced-vs-shadow semantics are named explicitly by
   * the adjacent `tier_mode` discriminator (D2 复审 B#6/C#3).
   */
  shadow_tier: PaperImplementationDebateComplexityTier | null;
  /**
   * D2 复审 (B#6/C#3): names whether `shadow_tier` on this row is the ENFORCED
   * tier in effect (`enforced`, trace-integrity boundary debate) or a
   * record-only SHADOW recommendation (`shadow`, P1 / motive-evolution); `null`
   * when there is no tier context (`shadow_tier` is null). It is a pure
   * function of `slot_id` + `shadow_tier` derived at ONE point in the runtime
   * telemetry helper (`derivePaperImplementationRuntimeTelemetryTierMode`), so
   * the field is OPTIONAL and additive: nothing is persisted for it, and the
   * telemetry read model reconstructs it from the two persisted columns (no
   * storage migration — see the S4 storage note in the read-model service).
   */
  tier_mode?: PaperImplementationRuntimeTelemetryTierMode | null;
}

// ---------------------------------------------------------------------------
// Derived run/project aggregate views (service layer; not persisted).
// ---------------------------------------------------------------------------

export interface PaperImplementationRuntimeTelemetrySlotBreakdown {
  slot_id: string;
  provider_call_count: number;
  total_cost_usd: number;
  repaid_cost_usd: number;
}

export interface PaperImplementationRuntimeTelemetryRunSummary {
  implementation_project_id: string;
  run_id: string;
  provider_call_count: number;
  total_cost_usd: number;
  /**
   * Run-local re-paid spend: the cost of `retried` calls plus duplicate
   * (slot, role, call-index) replays inside the same run_id (D9 resume
   * re-recording a partially executed role). Coordinator re-advance repaid
   * spend is a PROJECT-level classification (new run_id per attempt) — see
   * `PaperImplementationRuntimeTelemetryProjectRepaidRate`.
   */
  repaid_cost_usd: number;
  /** `repaid_cost_usd / total_cost_usd`, 0 when total cost is 0. */
  repaid_cost_rate: number;
  first_call_at: string | null;
  last_call_at: string | null;
}

export interface PaperImplementationRuntimeTelemetryRunDetail
  extends PaperImplementationRuntimeTelemetryRunSummary {
  per_slot: PaperImplementationRuntimeTelemetrySlotBreakdown[];
  records: PaperImplementationRuntimeTelemetryRecord[];
}

/**
 * Project-level repaid aggregate. On top of the run-local repaid semantics it
 * recognizes the coordinator re-advance naming convention (S4 复审 FA-4): the
 * run coordinator hands each slot a run_id equal to its node_attempt_id,
 * `{coordinator_run_id}.step-{stepIndex}.attempt-{attemptSequence}` (plus the
 * coordinator idFactory's unique suffix, `_…`), with `attemptSequence`
 * counted FROM 0 — so a re-advance replay of the same step gets a fresh
 * run_id with attempt >= 1 and the per-run duplicate detection can never see
 * it. Any run whose run_id parses to that convention with an attempt
 * sequence >= 1 has its ENTIRE cost counted as repaid at the project level;
 * run_ids that do not parse are ordinary runs.
 */
export interface PaperImplementationRuntimeTelemetryProjectRepaidRate {
  implementation_project_id: string;
  run_count: number;
  provider_call_count: number;
  total_cost_usd: number;
  repaid_cost_usd: number;
  repaid_cost_rate: number;
  per_slot: PaperImplementationRuntimeTelemetrySlotBreakdown[];
}

/**
 * S4 复审 FA-6: single-fetch project telemetry overview for desktop/runner —
 * the run summaries plus the project aggregate in one response, so consumers
 * no longer chain the `runs` + `repaid-rate` endpoints. Purely additive: both
 * legacy endpoints stay. `per_slot` mirrors `project_repaid_rate.per_slot`
 * (hoisted for direct table rendering).
 */
export interface PaperImplementationRuntimeTelemetryProjectOverview {
  implementation_project_id: string;
  runs: PaperImplementationRuntimeTelemetryRunSummary[];
  project_repaid_rate: PaperImplementationRuntimeTelemetryProjectRepaidRate;
  per_slot: PaperImplementationRuntimeTelemetrySlotBreakdown[];
}

// ---------------------------------------------------------------------------
// Strict JSON schema (record persistence / request-shape validation).
// ---------------------------------------------------------------------------

const stringId = { type: 'string', minLength: 1 } as const;
const nullableString = { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
const nullableNonNegativeNumber = {
  anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }],
} as const;
const nullableNonNegativeInteger = {
  anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
} as const;

export const paperImplementationRuntimeTelemetryRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'record_id',
    'created_at',
    'implementation_project_id',
    'run_id',
    'slot_id',
    'role_slot_id',
    'call_index',
    'execution_mode',
    'provider',
    'model_option',
    'latency_ms',
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'cost_usd',
    'outcome',
    'retry_kind',
    'compression_applied',
    'shadow_tier',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION },
    record_id: stringId,
    created_at: stringId,
    implementation_project_id: stringId,
    run_id: stringId,
    slot_id: stringId,
    role_slot_id: nullableString,
    call_index: positiveInteger,
    execution_mode: { enum: [...PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES] },
    provider: nullableString,
    model_option: nullableString,
    latency_ms: nullableNonNegativeNumber,
    prompt_tokens: nullableNonNegativeInteger,
    completion_tokens: nullableNonNegativeInteger,
    total_tokens: nullableNonNegativeInteger,
    cost_usd: nullableNonNegativeNumber,
    outcome: { enum: [...PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_OUTCOMES] },
    retry_kind: {
      anyOf: [{ enum: [...PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RETRY_KINDS] }, { type: 'null' }],
    },
    compression_applied: { type: 'boolean' },
    shadow_tier: {
      anyOf: [{ enum: [...PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS] }, { type: 'null' }],
    },
    // Optional + additive (D2 复审 B#6/C#3): absent on pre-existing rows, and
    // reconstructed from slot_id + shadow_tier by the read model — hence NOT in
    // `required`.
    tier_mode: {
      anyOf: [{ enum: [...PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_TIER_MODES] }, { type: 'null' }],
    },
  },
} as const;
