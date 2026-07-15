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

import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

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
