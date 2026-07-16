/**
 * S4-C shadow ComplexityAssessment + D2-core enforced entry.
 *
 * `assessPaperImplementationDebateComplexityShadow` is a pure, deterministic
 * function that recommends a debate tier from a small set of recomputable
 * request statistics. `assessPaperImplementationDebateComplexity` (T-124
 * D2-core) is the ENFORCED entry point: byte-identical tier/inputs_hash/
 * rationale computation, re-wrapped with the enforced schema version. The
 * trace-integrity boundary debate now EXECUTES the tier this returns (role plan
 * + budget via `PaperImplementationDebatePolicy@v1`); the P1 claim-boundary /
 * dossier-readiness and motive-evolution slots keep calling the SHADOW alias and
 * only record `shadow_tier` for one more observation window. Both names share
 * one implementation so the shadow record and the enforced decision can never
 * diverge for the same inputs.
 *
 * The thresholds below are intentionally constants pending D2 calibration:
 * D2 owns turning these shadow recommendations into an enforced tier policy,
 * and it will re-derive the numbers from the S4-A cost/repaid-rate baseline
 * (D10 requires an all-tier baseline for that calibration). Until then the
 * numbers are a first, honest guess and MUST NOT be treated as tuned.
 *
 * S4 复审 FA-5 — REGISTERED degraded axis: `prior_blocker_density` is fed as a
 * constant 0 by every caller (trace-integrity, P1 claim-boundary, P1
 * dossier-readiness via the shared P1 call site, motive-evolution) because a
 * standalone slot run has no prior-review-turn history; the axis has ZERO
 * variance in the recorded baseline and its two rationale codes are currently
 * unreachable. D2 must feed the real density from coordinator run context and
 * bump the `inputs_hash` version (the hash covers the axis, so back-filled
 * real values would otherwise silently fork identity with the zero-era
 * records). Per-caller input approximations are documented at the call sites.
 */

export const PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_SCHEMA_VERSION =
  'PaperImplementationDebateComplexityShadowAssessment@v0' as const;

/** D2-core: enforced-decision schema version (same computation, enforced use). */
export const PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_ASSESSMENT_SCHEMA_VERSION =
  'PaperImplementationDebateComplexityAssessment@v1' as const;

export const PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS = [
  'light',
  'standard',
  'full',
] as const;
export type PaperImplementationDebateComplexityTier =
  (typeof PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS)[number];

/**
 * The review-target category of the debate. High-stakes targets
 * (`dossier_readiness`, `motive_evolution`) carry a `standard` tier floor.
 */
export const PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TARGET_KINDS = [
  'trace_integrity',
  'claim_boundary',
  'dossier_readiness',
  'motive_evolution',
] as const;
export type PaperImplementationDebateComplexityTargetKind =
  (typeof PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TARGET_KINDS)[number];

const HIGH_STAKES_TARGET_KINDS: readonly PaperImplementationDebateComplexityTargetKind[] = [
  'dossier_readiness',
  'motive_evolution',
];

export const PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_RATIONALE_CODES = [
  'BASELINE_LIGHT',
  'STATEMENT_COUNT_STANDARD',
  'STATEMENT_COUNT_FULL',
  'PACKET_REF_COUNT_STANDARD',
  'PACKET_REF_COUNT_FULL',
  'PRIOR_BLOCKER_DENSITY_STANDARD',
  'PRIOR_BLOCKER_DENSITY_FULL',
  'HIGH_STAKES_TARGET_STANDARD_FLOOR',
] as const;
export type PaperImplementationDebateComplexityRationaleCode =
  (typeof PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_RATIONALE_CODES)[number];

/**
 * D2-calibration-pending thresholds. See the file header: these are a first,
 * uncalibrated guess. D2 re-derives them from the S4-A baseline.
 */
export const PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_THRESHOLDS = {
  statement_count_standard: 4,
  statement_count_full: 9,
  packet_ref_count_standard: 3,
  packet_ref_count_full: 8,
  prior_blocker_density_standard: 0.25,
  prior_blocker_density_full: 0.5,
} as const;

export interface PaperImplementationDebateComplexityShadowInputs {
  /** Number of reviewed statements the debate must adjudicate. */
  reviewed_statement_count: number;
  /** Number of retrieval packet refs available to the debate. */
  retrieval_packet_ref_count: number;
  /** Fraction (0..1) of prior review turns that produced a blocker. */
  prior_blocker_density: number;
  target_kind: PaperImplementationDebateComplexityTargetKind;
}

export interface PaperImplementationDebateComplexityShadowAssessment {
  schema_version: typeof PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_SCHEMA_VERSION;
  recommended_tier: PaperImplementationDebateComplexityTier;
  inputs_hash: string;
  rationale_codes: PaperImplementationDebateComplexityRationaleCode[];
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function normalizeDensity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value >= 1 ? 1 : value;
}

function tierRank(tier: PaperImplementationDebateComplexityTier): number {
  return PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS.indexOf(tier);
}

function maxTier(
  left: PaperImplementationDebateComplexityTier,
  right: PaperImplementationDebateComplexityTier,
): PaperImplementationDebateComplexityTier {
  return tierRank(right) > tierRank(left) ? right : left;
}

/**
 * Pure, deterministic tier recommendation. The same normalized inputs always
 * yield the same `recommended_tier`, `inputs_hash`, and ordered `rationale_codes`.
 */
export function assessPaperImplementationDebateComplexityShadow(
  inputs: PaperImplementationDebateComplexityShadowInputs,
): PaperImplementationDebateComplexityShadowAssessment {
  const thresholds = PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_THRESHOLDS;
  const normalized = {
    reviewed_statement_count: normalizeCount(inputs.reviewed_statement_count),
    retrieval_packet_ref_count: normalizeCount(inputs.retrieval_packet_ref_count),
    prior_blocker_density: normalizeDensity(inputs.prior_blocker_density),
    target_kind: inputs.target_kind,
  };

  const rationaleCodes: PaperImplementationDebateComplexityRationaleCode[] = [];
  let tier: PaperImplementationDebateComplexityTier = 'light';

  if (normalized.reviewed_statement_count >= thresholds.statement_count_full) {
    tier = maxTier(tier, 'full');
    rationaleCodes.push('STATEMENT_COUNT_FULL');
  } else if (normalized.reviewed_statement_count >= thresholds.statement_count_standard) {
    tier = maxTier(tier, 'standard');
    rationaleCodes.push('STATEMENT_COUNT_STANDARD');
  }

  if (normalized.retrieval_packet_ref_count >= thresholds.packet_ref_count_full) {
    tier = maxTier(tier, 'full');
    rationaleCodes.push('PACKET_REF_COUNT_FULL');
  } else if (normalized.retrieval_packet_ref_count >= thresholds.packet_ref_count_standard) {
    tier = maxTier(tier, 'standard');
    rationaleCodes.push('PACKET_REF_COUNT_STANDARD');
  }

  if (normalized.prior_blocker_density >= thresholds.prior_blocker_density_full) {
    tier = maxTier(tier, 'full');
    rationaleCodes.push('PRIOR_BLOCKER_DENSITY_FULL');
  } else if (normalized.prior_blocker_density >= thresholds.prior_blocker_density_standard) {
    tier = maxTier(tier, 'standard');
    rationaleCodes.push('PRIOR_BLOCKER_DENSITY_STANDARD');
  }

  if (HIGH_STAKES_TARGET_KINDS.includes(normalized.target_kind) && tierRank(tier) < tierRank('standard')) {
    tier = 'standard';
    rationaleCodes.push('HIGH_STAKES_TARGET_STANDARD_FLOOR');
  }

  if (rationaleCodes.length === 0) {
    rationaleCodes.push('BASELINE_LIGHT');
  }

  return {
    schema_version: PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_SCHEMA_VERSION,
    recommended_tier: tier,
    inputs_hash: hashShadowInputs(normalized),
    rationale_codes: rationaleCodes,
  };
}

export interface PaperImplementationDebateComplexityAssessment {
  schema_version: typeof PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_ASSESSMENT_SCHEMA_VERSION;
  recommended_tier: PaperImplementationDebateComplexityTier;
  inputs_hash: string;
  rationale_codes: PaperImplementationDebateComplexityRationaleCode[];
}

/**
 * D2-core enforced tier decision. Byte-identical tier/inputs_hash/rationale to
 * the shadow function (single shared implementation), re-tagged with the
 * enforced schema version. The trace-integrity boundary debate consumes this to
 * pick its role plan and budget; the decision (tier + inputs_hash +
 * rationale_codes) is pinned into runtime identity, the runtime artifact
 * execution context, and telemetry.
 */
export function assessPaperImplementationDebateComplexity(
  inputs: PaperImplementationDebateComplexityShadowInputs,
): PaperImplementationDebateComplexityAssessment {
  const shadow = assessPaperImplementationDebateComplexityShadow(inputs);
  return {
    schema_version: PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_ASSESSMENT_SCHEMA_VERSION,
    recommended_tier: shadow.recommended_tier,
    inputs_hash: shadow.inputs_hash,
    rationale_codes: shadow.rationale_codes,
  };
}

function hashShadowInputs(normalized: {
  reviewed_statement_count: number;
  retrieval_packet_ref_count: number;
  prior_blocker_density: number;
  target_kind: PaperImplementationDebateComplexityTargetKind;
}): string {
  // Deterministic canonical serialization (fixed key order) so the same inputs
  // always hash identically. No caller-supplied hash is ever trusted. A pure-JS
  // FNV-1a digest (no node builtin) keeps this shared function portable — the
  // hash is an identity token, not a cryptographic commitment.
  const canonical = JSON.stringify([
    normalized.reviewed_statement_count,
    normalized.retrieval_packet_ref_count,
    normalized.prior_blocker_density,
    normalized.target_kind,
  ]);
  return `fnv1a:${fnv1a64Hex(canonical)}`;
}

// 64-bit FNV-1a implemented with BigInt for a deterministic, portable digest.
const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const FNV_MASK_64 = 0xffffffffffffffffn;

function fnv1a64Hex(text: string): string {
  let hash = FNV_OFFSET_BASIS_64;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index) & 0xff);
    hash = (hash * FNV_PRIME_64) & FNV_MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}
