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

/** Retryable set for the multi-role debate services (trace-integrity + P1). */
export const PAPER_IMPLEMENTATION_DEBATE_RETRYABLE_RUNTIME_FAILURE_CODES = [
  ...PAPER_IMPLEMENTATION_SHARED_RETRYABLE_RUNTIME_FAILURE_CODES,
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE,
] as const;
