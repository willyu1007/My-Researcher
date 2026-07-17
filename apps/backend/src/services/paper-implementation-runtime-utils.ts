/**
 * Shared paper-implementation runtime slot utilities (T-124 S2-C).
 *
 * Single source for three previously copy-pasted concerns:
 * - `hasText` (was duplicated in acceptance-bridge / runtime-artifact-consumption /
 *   runtime-preflight),
 * - `normalizedPaperImplementationRefType` (was duplicated with two divergent
 *   semantics: strip `[_-]` vs strip `[^a-z0-9]`; the whole repo now converges on
 *   the strict `[^a-z0-9]` semantics),
 * - the runtime slot retry classification base set (was re-listed in all 11 slot
 *   services).
 */

import type {
  PaperImplementationAgentExecutionMode,
  PaperImplementationDebateComplexityTier,
  PaperImplementationRuntimeTelemetryTierMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';
import { PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationRuntimeProviderCallProvenance,
  PaperImplementationRuntimeTelemetryCollector,
} from './paper-implementation-runtime-telemetry-service.js';

export function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Canonical ref_type normalization: lower-case, then strip every character that
 * is not a lower-case letter or digit. This is the single repo-wide semantics
 * (S2-C converged the looser `[_-]`-only variant onto this one).
 */
export function normalizedPaperImplementationRefType(refType: string): string {
  return refType.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Slot-level technical-retry classification (single source for the 11 runtime
 * slot services; slot-specific semantic codes extend this base per service).
 *
 * `UpstreamError` is deliberately NOT in this set (S2-C, review N3 alignment):
 * the llm-gateway classifies every `UpstreamError` it surfaces as
 * `retryable: false` (unexpected provider status, unparseable body, shape
 * mismatch, unknown error), while genuinely transient conditions surface as
 * `TimeoutError` / `TransientError` / `RateLimitError`. A slot-level full-price
 * retry of an error class the gateway has already ruled non-retryable is pure
 * waste, so the slot layer honors the gateway verdict.
 */
export const PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES = [
  'TimeoutError',
  'TransientError',
  'RateLimitError',
  'SCHEMA_VALIDATION_FAILED',
] as const;

/**
 * S2-C C1 (review N3 "legal output kills the chain"): two structurally valid
 * model outputs that previously escalated to an HTTP 400 / hard admission
 * rejection are reclassified as retryable technical failures with
 * SCHEMA_VALIDATION_FAILED semantics — retry once on the same profile, then
 * terminal `failed_runtime` (never an HTTP exception, no orphaned prior roles).
 */
export const PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE =
  'RUNTIME_ROLE_SLOT_ECHO_MISMATCH';
export const PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE =
  'RUNTIME_ROLE_BLOCKED_CODES_MISSING';

/**
 * T-124 S3-α2/α3 (review N2): semantic-completeness violations of the deepened
 * trace-debate role contract. Same retry semantics as SCHEMA_VALIDATION_FAILED —
 * one same-profile retry, then terminal `failed_runtime`. They apply to BOTH
 * `passed` and `blocked` role outputs (the blocked bypass is closed).
 */
export const PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE =
  'RUNTIME_ROLE_STRUCTURED_OUTPUT_INCOMPLETE';
export const PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE =
  'RUNTIME_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET';
export const PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE =
  'RUNTIME_ROLE_FINDING_DISPOSITION_INVALID';
export const PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE =
  'RUNTIME_ROLE_COVERAGE_INCOMPLETE';

/**
 * T-124 S3 复审 F5-1 / S4 复审 FA-2: wire-transport decode failure — a provider
 * output whose wire-encoded JSON-string field (domain-gate request / scenario
 * outputs) fails to parse back into the canonical object shape. Used by the P1
 * review and result-analysis slots; single-sourced here so the S4-A retry_kind
 * classifier and the per-slot RETRYABLE sets cannot drift.
 */
export const PAPER_IMPLEMENTATION_RUNTIME_WIRE_JSON_DECODE_FAILED_FAILURE_CODE =
  'RUNTIME_WIRE_JSON_DECODE_FAILED';

/**
 * T-124 S3-β1 / S4 复审 FA-2: duplicate `option_key` inside a motive-evolution
 * wire entry array — a provider-output quality defect at the transport layer
 * (schema-shaped), documented as a technical retry cause.
 */
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_KEY_DUPLICATE_FAILURE_CODE =
  'MOTIVE_EVOLUTION_OPTION_KEY_DUPLICATE';

/**
 * S4-A retry_kind classification (record-only telemetry). Provider-transport
 * and schema/echo-shaped retry causes are `technical`; every other retryable
 * failure — the debate/slot semantic-completeness codes — is `semantic`.
 *
 * S4 复审 FA-2: `RUNTIME_WIRE_JSON_DECODE_FAILED` and
 * `MOTIVE_EVOLUTION_OPTION_KEY_DUPLICATE` are registered here because both are
 * documented transport/schema-shaped defects (wire JSON string fails to decode /
 * wire entry array carries a duplicate key); before this registration the
 * classifier mislabeled them `semantic`. The remaining slot-specific retryable
 * codes (`*_REVIEW_SET_MISMATCH`, `*_COVERAGE_*`, `*_CANDIDATE_SET_*`, …) are
 * genuine semantic-completeness defects and stay `semantic`.
 */
export const PAPER_IMPLEMENTATION_TECHNICAL_RETRY_FAILURE_CODES = [
  ...PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE,
  PAPER_IMPLEMENTATION_RUNTIME_WIRE_JSON_DECODE_FAILED_FAILURE_CODE,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_KEY_DUPLICATE_FAILURE_CODE,
] as const;

export function paperImplementationRetryKind(
  failureCode: string | null | undefined,
): 'technical' | 'semantic' | null {
  if (!failureCode) {
    return null;
  }
  return (PAPER_IMPLEMENTATION_TECHNICAL_RETRY_FAILURE_CODES as readonly string[]).includes(failureCode)
    ? 'technical'
    : 'semantic';
}

/** Retryable set for the multi-role debate services (trace-integrity + P1). */
export const PAPER_IMPLEMENTATION_DEBATE_RETRYABLE_RUNTIME_FAILURE_CODES = [
  ...PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE,
] as const;

/**
 * T-124 S3 复审 F3-5: single-source echo check for the non-debate slot services.
 * Returns the retryable echo-mismatch failure code when a present role output
 * echoes the wrong role_slot_id, otherwise null. Absent output → null (nothing
 * to reconcile). Nine slot services previously pasted this same guard inline.
 */
export function roleSlotEchoMismatchCode(
  output: { role_slot_id: string } | null | undefined,
  expectedRoleSlotId: string,
): string | null {
  return output && output.role_slot_id !== expectedRoleSlotId
    ? PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE
    : null;
}

/**
 * T-124 S3 收口 (gs-001 run 005 root-cause): canonical *semantic* identity key
 * for a functional ref. Identity is carried by `ref_type` + `ref_id` plus the
 * two identity-bearing optional keys (`title_card_id`, `version_id`), with
 * `absent` and `null` collapsed to the same empty token so a model echo that
 * follows the output schema (which materializes optional keys as explicit
 * `null`, e.g. `legacy_ref: null`) is not spuriously judged as drift against a
 * request ref that simply omits those keys.
 *
 * This is the semantics eight of the nine paper-implementation slot services
 * already used for their private `refKey`; only the route/cycle/feasibility echo
 * checks (via `functionalRefEquals`) and the motive-evolution `refKey` still used
 * full-shape `stableStringify` equality, which the run-005 live chain exposed as
 * over-strict (present-but-null `legacy_ref` failed the shape compare while the
 * ref was semantically identical). `legacy_ref` is a non-identifying back-compat
 * field and is deliberately excluded from the key; real drift on
 * `ref_type`/`ref_id`/`version_id`/`title_card_id` is still caught.
 */
export function semanticRefKey(ref: TopicSelectionFunctionalRef): string {
  return [
    ref.ref_type,
    ref.ref_id,
    ref.title_card_id ?? '',
    ref.version_id ?? '',
  ].join(':');
}

/**
 * T-124 S3 复审 F3-6 / S3 收口: single-source functional-ref equality for the
 * route / validation-cycle / feasibility planning echo reconciliation
 * (previously three identical private copies). Compares by `semanticRefKey`, so
 * `absent`-vs-`null` optional keys are equal but a genuine `ref_type` / `ref_id`
 * / `version_id` / `title_card_id` drift still fails closed. Null/undefined on
 * either side is never equal.
 */
export function functionalRefEquals(
  left: TopicSelectionFunctionalRef | null | undefined,
  right: TopicSelectionFunctionalRef | null | undefined,
): boolean {
  return Boolean(left && right && semanticRefKey(left) === semanticRefKey(right));
}

/**
 * T-124 S3 复审 F3-6: single-source string-set equality (null-tolerant
 * signature) for the same three planning services.
 */
export function sameStringSet(
  left: string[] | null | undefined,
  right: string[] | null | undefined,
): boolean {
  const leftSet = new Set(left ?? []);
  const rightSet = new Set(right ?? []);
  if (leftSet.size !== rightSet.size) {
    return false;
  }
  return [...leftSet].every((item) => rightSet.has(item));
}

/** Minimal structural view of an injected back-half source-body packet. */
export interface BackHalfSourceContextPacketLike {
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
}

/**
 * T-124 G4.5 Fix 1 (B3 hash fence), hardened by G5 FIX-A item 8: assert every
 * injected source-body packet is fenced to a declared, hashed source. Each
 * packet's `source_ref` must appear in `source_refs` matched by the full
 * identity key `ref_type`+`ref_id`+`version_id` — a packet that pins a DIFFERENT
 * `version_id` than the declared ref is a different object and is rejected — and
 * its `source_hash` must equal that source's declared `source_hashes` entry.
 *
 * FIX-A item 8 also rejects an AMBIGUOUS declared set: two `source_refs` that
 * collapse to the same identity key (same type + id + version) would silently
 * let one overwrite the other's declared hash in the fence map, so the caller
 * fails closed instead. No-op when no packets are supplied (additive/optional).
 */
export function assertBackHalfSourceContextPacketFence(
  sourceRefs: TopicSelectionFunctionalRef[],
  sourceHashes: string[],
  packets: readonly BackHalfSourceContextPacketLike[] | undefined,
): void {
  if (!packets || packets.length === 0) {
    return;
  }
  const declaredHashByKey = new Map<string, string>();
  sourceRefs.forEach((ref, index) => {
    const key = backHalfSourceFenceKey(ref);
    if (declaredHashByKey.has(key)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `source_refs contains a duplicate ${ref.ref_type}:${ref.ref_id} identity — the source-context fence cannot bind an ambiguous declared source.`,
      );
    }
    declaredHashByKey.set(key, sourceHashes[index] ?? '');
  });
  for (const packet of packets) {
    const key = backHalfSourceFenceKey(packet.source_ref);
    const identity = `${packet.source_ref.ref_type}:${packet.source_ref.ref_id}`;
    if (!declaredHashByKey.has(key)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `source_context_packet source_ref ${identity} is not among the declared source_refs.`,
      );
    }
    if (declaredHashByKey.get(key) !== packet.source_hash) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `source_context_packet source_hash for ${identity} does not match the declared source_hash for that ref.`,
      );
    }
  }
}

function backHalfSourceFenceKey(ref: TopicSelectionFunctionalRef): string {
  return `${normalizedPaperImplementationRefType(ref.ref_type)}:${ref.ref_id}:${ref.version_id ?? ''}`;
}

/**
 * Minimal structural view of an orchestrator invocation result needed by the
 * shared telemetry recording helper: the collector's provenance/telemetry face
 * plus the two compression provenance markers. The real
 * `TopicSelectionAgentInvocationResult` is structurally assignable.
 */
export interface PaperImplementationSlotProviderCallResultLike {
  provenance: PaperImplementationRuntimeProviderCallProvenance & {
    compression_report_ref?: unknown;
    compressed_context_hash?: string | null;
  };
}

export interface RecordSlotProviderCallTelemetryInput {
  implementationProjectId: string;
  runId: string;
  slotId: string;
  roleSlotId: string | null;
  /**
   * 0-based technical/semantic retry attempt ordinal of THIS provider attempt
   * within one (run, slot, role_slot) invocation sequence. The helper derives
   * the telemetry `call_index` as `retryAttemptIndex + 1`, which is the single
   * repo-wide call_index semantics (S4 复审 FA-3): every provider attempt —
   * including same-profile retries — gets a unique call_index, so a duplicate
   * (slot, role, call_index) key within one run_id can only come from a true
   * cross-execution replay (D9 resume re-running a partially recorded role),
   * which is exactly what the accounting counts as repaid.
   */
  retryAttemptIndex: number;
  executionMode: PaperImplementationAgentExecutionMode;
  result: PaperImplementationSlotProviderCallResultLike;
  /** The slot's own bounded-retry decision for this attempt. */
  shouldRetry: boolean;
  /** The classified runtime failure code of this attempt (null when passed). */
  runtimeFailureCode: string | null;
  /**
   * Debate tier recorded on the telemetry row (field name kept for schema
   * stability). D2-core semantics: the trace-integrity slot passes the
   * ENFORCED tier in effect when the call was issued (effective tier after any
   * deterministic light→standard upgrade); P1 and motive-evolution still pass
   * the record-only SHADOW recommendation; null for non-debate slots.
   */
  shadowTier: PaperImplementationDebateComplexityTier | null;
}

/**
 * D2 复审 (B#6/C#3): the SINGLE point that derives the `tier_mode` telemetry
 * discriminator, keyed only off `slot_id` + `shadow_tier` (both already carried
 * by every provider-call telemetry row). The eleven slot services do not change:
 * the shared recording helper below calls this, so the discriminator is computed
 * in exactly one place and the slot call sites stay at zero-diff.
 *
 *   - `null`     when there is no tier context (`shadowTier` is null);
 *   - `enforced` for the trace-integrity boundary debate (its `shadow_tier` is
 *     the tier actually IN EFFECT after any deterministic light→standard upgrade);
 *   - `shadow`   for every other slot carrying a tier (P1 claim-boundary /
 *     dossier-readiness and motive-evolution), whose tier is a record-only
 *     recommendation with no policy effect.
 *
 * Because `tier_mode` is a total function of two persisted columns, nothing is
 * persisted for it (no storage migration): the write path stamps it here and the
 * telemetry read model reconstructs it with this same function.
 */
export function derivePaperImplementationRuntimeTelemetryTierMode(
  slotId: string,
  shadowTier: PaperImplementationDebateComplexityTier | null,
): PaperImplementationRuntimeTelemetryTierMode | null {
  if (shadowTier === null) {
    return null;
  }
  return slotId === PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID
    ? 'enforced'
    : 'shadow';
}

/**
 * S4 复审 FA-1: single-source, fail-open provider-call telemetry recording for
 * the eleven runtime slot services (replaces eleven pasted blocks). Derives at
 * ONE point:
 * - `outcome`: `retried` when the slot will retry, `failed` on a terminal
 *   failure code, `passed` otherwise;
 * - `retry_kind`: always via `paperImplementationRetryKind` on the retried
 *   attempt's failure code (kills the `shouldRetry ? 'technical' : null`
 *   hardcoding that mislabeled semantic retries);
 * - `compression_applied`: from the invocation's compression provenance;
 * - `call_index`: see `RecordSlotProviderCallTelemetryInput.retryAttemptIndex`.
 * A null/undefined collector is a no-op (telemetry never changes run semantics).
 */
export async function recordSlotProviderCallTelemetry(
  collector: PaperImplementationRuntimeTelemetryCollector | null | undefined,
  input: RecordSlotProviderCallTelemetryInput,
): Promise<void> {
  if (!collector) {
    return;
  }
  await collector.recordProviderCall({
    implementationProjectId: input.implementationProjectId,
    runId: input.runId,
    slotId: input.slotId,
    roleSlotId: input.roleSlotId,
    callIndex: input.retryAttemptIndex + 1,
    executionMode: input.executionMode,
    result: input.result,
    outcome: input.shouldRetry ? 'retried' : input.runtimeFailureCode ? 'failed' : 'passed',
    retryKind: paperImplementationRetryKind(input.shouldRetry ? input.runtimeFailureCode : null),
    compressionApplied: input.result.provenance.compression_report_ref != null
      || input.result.provenance.compressed_context_hash != null,
    shadowTier: input.shadowTier,
    // D2 复审 (B#6/C#3): the tier-context discriminator is decided here, at the
    // single shared helper, from slot_id + shadow_tier — the 11 slot call sites
    // pass neither and stay unchanged.
    tierMode: derivePaperImplementationRuntimeTelemetryTierMode(input.slotId, input.shadowTier),
  });
}
