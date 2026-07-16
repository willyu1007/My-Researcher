/**
 * PaperImplementationDebatePolicy@v1 (T-124 D2-core).
 *
 * The enforced debate-tier contract: a versioned, strict, `as const` registry
 * that maps a deterministic debate tier (`light | standard | full`, decided by
 * the pure `assessPaperImplementationDebateComplexity` function) to a concrete
 * role plan and budget envelope. D2-core enforces this policy for the
 * trace-integrity boundary debate only; P1 (claim-boundary / dossier-readiness)
 * and motive-evolution keep recording the SHADOW tier for one more observation
 * window and are NOT policy-driven yet.
 *
 * Determinism invariants:
 * - the tier is a pure function of recomputable request statistics (no LLM);
 * - the role plan is a pure function of `(base_tier, skeptic_findings_present)`;
 * - the `light` tier's floor plan omits the reconcile role, but a `light` run
 *   whose skeptic produces ANY finding DETERMINISTICALLY upgrades to `standard`
 *   and runs reconcile — the upgrade is a RULE, never a relaxation, so
 *   disposition completeness is never waived;
 * - the budget gate reserves the upgrade-safe provider-call count at preflight
 *   (`paperImplementationDebateTierGuaranteedCompletionProviderCalls`, derived
 *   from the plan the tier's deterministic upgrade grows into), so a mid-run
 *   upgrade is never budget-blocked AFTER a provider call has been issued. A
 *   request whose `provider_call_budget` cannot cover that reservation fails
 *   closed at preflight with `TIER_BUDGET_INSUFFICIENT` and ZERO provider calls.
 *   That reservation is a PRE-FLIGHT check, NOT a hard spend cap: it counts one
 *   call per planned role on the zero-technical-retry path only; bounded
 *   technical retries (a tier plan parameter) consume additional real calls the
 *   reservation deliberately does not include.
 *
 * "dual registration": the policy is registered BOTH as the per-tier plan table
 * (`PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS`) AND as the slot-scoped enforced
 * policy record keyed by `debate_policy_id`
 * (`PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY`), so the runtime slot, the
 * SlotParameterManifest, and admission all read the same single source.
 *
 * Two consequences are ACCEPTED (not open bugs) for D2-core:
 * - pre-D2 identity discontinuity: artifacts recorded before D2 carry no
 *   `debate_execution` tier decision, so the resume tier-drift facet cannot pin
 *   them. The zero-execution idempotent replay of such a completed run stays
 *   safe (the tier facet is skipped when the recorded decision is absent), but
 *   the S2-C double-submit identity guard no longer covers those older runs.
 *   Acceptable because pre-D2 records are dev-only data.
 * - thresholds uncalibrated: the tier `floor`/upgrade numbers are a first honest
 *   guess pending the S4-A shadow cost/repaid-rate baseline. A hand-constructed
 *   input can therefore be pushed to `light`, but the deterministic
 *   skeptic-finding upgrade rule backstops disposition completeness (no
 *   hollow-pass), so miscalibration degrades cost/latency, never correctness.
 */
import {
  PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS,
  type PaperImplementationDebateComplexityTier,
} from './paper-implementation-debate-complexity-shadow.js';

export const PAPER_IMPLEMENTATION_DEBATE_POLICY_SCHEMA_VERSION =
  'PaperImplementationDebatePolicy@v1' as const;

/**
 * The debate role functions, named slot-agnostically. A concrete runtime slot
 * reconstructs its own role slot id from the function name (the trace-integrity
 * slot ids are `trace_integrity_review.<role>`). Order is the canonical debate
 * chain order (support map → skeptic → reconcile → arbiter).
 */
export const PAPER_IMPLEMENTATION_DEBATE_ROLES = [
  'support_mapper_map',
  'skeptic_challenge',
  'support_mapper_reconcile',
  'arbiter_final',
] as const;
export type PaperImplementationDebateRole =
  (typeof PAPER_IMPLEMENTATION_DEBATE_ROLES)[number];

/**
 * The deterministic mid-run upgrade rule for a tier. `null` when the tier never
 * upgrades. The only v1 rule: a `light` run whose skeptic produced a finding
 * upgrades to `standard` — the upgraded tier's `role_plan` is the single source
 * for which roles the upgrade adds (the reconcile role, before the arbiter), so
 * no separate `inserts_role` field can drift out of sync with it.
 */
export interface PaperImplementationDebateConditionalUpgrade {
  when: 'skeptic_findings_present';
  upgrade_to: PaperImplementationDebateComplexityTier;
}

export interface PaperImplementationDebateTierPlan {
  tier: PaperImplementationDebateComplexityTier;
  /** Roles that ALWAYS run at this tier (the floor plan, in chain order). */
  role_plan: readonly PaperImplementationDebateRole[];
  /** Deterministic mid-run upgrade rule, or null. */
  conditional_upgrade: PaperImplementationDebateConditionalUpgrade | null;
  // Provider-call counts are NOT stored here: the floor count is the role plan
  // length and the upgrade-safe reservation is the length of the plan the
  // conditional upgrade grows into. Both are derived by
  // `paperImplementationDebateTierFloorProviderCalls` /
  // `paperImplementationDebateTierGuaranteedCompletionProviderCalls` so a
  // hand-pinned constant can never drift from the role plan it must mirror.
  /** Per-role output token ceiling headroom (full > standard >= light). */
  role_output_token_budget_ceiling: number;
  /** Bounded technical-retry attempts per role (full gets more headroom). */
  max_technical_retry_attempts: number;
}

/**
 * D2-calibration-pending budget/plan constants. Role SHAPE is fixed by the D2
 * signoff; the numeric budgets are a first honest guess pending the S4-A
 * cost/repaid-rate baseline, exactly like the shadow thresholds.
 */
export const PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS: {
  readonly [K in PaperImplementationDebateComplexityTier]: PaperImplementationDebateTierPlan;
} = {
  light: {
    tier: 'light',
    role_plan: ['support_mapper_map', 'skeptic_challenge', 'arbiter_final'],
    conditional_upgrade: {
      when: 'skeptic_findings_present',
      upgrade_to: 'standard',
    },
    role_output_token_budget_ceiling: 1_800,
    max_technical_retry_attempts: 1,
  },
  standard: {
    tier: 'standard',
    role_plan: [
      'support_mapper_map',
      'skeptic_challenge',
      'support_mapper_reconcile',
      'arbiter_final',
    ],
    conditional_upgrade: null,
    role_output_token_budget_ceiling: 1_800,
    max_technical_retry_attempts: 1,
  },
  full: {
    tier: 'full',
    role_plan: [
      'support_mapper_map',
      'skeptic_challenge',
      'support_mapper_reconcile',
      'arbiter_final',
    ],
    // D2 signoff escape hatch: the "second reconcile round on a first-round
    // context_gap_blocker" has no clean fit with the resume role-uniqueness
    // model or the single-reconcile disposition-completeness rule without a
    // much larger surface (repeated-role resume, two-pass reconcile admission).
    // Per the work order's "若无干净确定性条件则 full=四角色+更高 token/重试预算"
    // clause, `full` is the four-role plan with HIGHER token + retry headroom,
    // NOT a fifth provider call.
    conditional_upgrade: null,
    role_output_token_budget_ceiling: 2_600,
    max_technical_retry_attempts: 2,
  },
} as const;

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY_ID =
  'paper-implementation.trace-integrity.boundary-debate.v1' as const;

/**
 * The blocker code a runtime slot emits (as a deterministic, zero-provider-call
 * preflight blocker) when a request's `provider_call_budget` cannot reserve the
 * decided tier's upgrade-safe completion count. The coordinator classifies it
 * (and the `TIER_BUDGET_` prefix) to `loop_budget_review`; keeping it a
 * zero-call preflight product is what makes it coordinator-trusted (R4).
 */
export const PAPER_IMPLEMENTATION_TIER_BUDGET_INSUFFICIENT_BLOCKER_CODE =
  'TIER_BUDGET_INSUFFICIENT' as const;

/**
 * The slot-scoped policy record. There is no `enforced` flag: whether a slot
 * executes this policy is expressed by the consuming runtime code (the
 * trace-integrity slot unconditionally runs the DebatePolicy@v1 role plan),
 * never by a stored boolean that could imply behaviour the code does not gate.
 */
export interface PaperImplementationDebatePolicy {
  schema_version: typeof PAPER_IMPLEMENTATION_DEBATE_POLICY_SCHEMA_VERSION;
  debate_policy_id: string;
  debate_policy_version: string;
  target_kind: 'trace_integrity';
  tiers: {
    readonly [K in PaperImplementationDebateComplexityTier]: PaperImplementationDebateTierPlan;
  };
}

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY: PaperImplementationDebatePolicy = {
  schema_version: PAPER_IMPLEMENTATION_DEBATE_POLICY_SCHEMA_VERSION,
  debate_policy_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY_ID,
  debate_policy_version: 'v1',
  target_kind: 'trace_integrity',
  tiers: PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS,
} as const;

/** dual registration: slot-scoped enforced policy keyed by debate_policy_id. */
export const PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY: {
  readonly [id: string]: PaperImplementationDebatePolicy;
} = {
  [PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY_ID]:
    PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY,
} as const;

/** Pure lookup: the tier plan for a decided base tier. */
export function paperImplementationDebateTierPlan(
  tier: PaperImplementationDebateComplexityTier,
): PaperImplementationDebateTierPlan {
  return PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS[tier];
}

/**
 * The EFFECTIVE tier of a debate given its decided base tier and whether the
 * skeptic produced any finding. Deterministic: `light` + findings → `standard`;
 * every other case is the base tier unchanged.
 */
export function paperImplementationEffectiveDebateTier(
  baseTier: PaperImplementationDebateComplexityTier,
  skepticFindingsPresent: boolean,
): PaperImplementationDebateComplexityTier {
  const plan = PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS[baseTier];
  if (
    plan.conditional_upgrade
    && plan.conditional_upgrade.when === 'skeptic_findings_present'
    && skepticFindingsPresent
  ) {
    return plan.conditional_upgrade.upgrade_to;
  }
  return baseTier;
}

/**
 * The EFFECTIVE ordered role plan of a debate. Before the skeptic has run,
 * `skepticFindingsPresent` is false and a `light` debate reports its 3-role
 * floor; once the skeptic's findings are known the plan is recomputed and a
 * `light`-with-findings debate reports the upgraded 4-role standard plan (the
 * reconcile role is inserted immediately before the arbiter). The result is
 * always a prefix-stable superset ordering (positions 0..n never change as the
 * plan grows), so a resumed run's reused prefix always aligns by position.
 */
export function paperImplementationEffectiveDebateRolePlan(
  baseTier: PaperImplementationDebateComplexityTier,
  skepticFindingsPresent: boolean,
): readonly PaperImplementationDebateRole[] {
  const effectiveTier = paperImplementationEffectiveDebateTier(baseTier, skepticFindingsPresent);
  return PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS[effectiveTier].role_plan;
}

/**
 * Provider calls the floor plan issues when no upgrade fires (audit/observability
 * only). DERIVED from the role plan length so it can never drift from the plan.
 */
export function paperImplementationDebateTierFloorProviderCalls(
  tier: PaperImplementationDebateComplexityTier,
): number {
  return PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS[tier].role_plan.length;
}

/**
 * The upgrade-safe provider-call reservation checked at preflight against
 * `provider_call_budget`. DERIVED as the longer of the floor plan and the plan
 * the tier's deterministic upgrade (if any) grows into — for `light` that is
 * `standard`'s four-role plan, so a skeptic-finding upgrade never hits a budget
 * wall mid-run (the concrete meaning of "预算不足以升档 → fail-closed").
 *
 * This is a RESERVATION check, not a hard spend cap: it counts one provider call
 * per planned role on the ZERO-technical-retry path only. Bounded technical
 * retries (a tier plan parameter) consume additional real calls that this number
 * deliberately does NOT reserve.
 */
export function paperImplementationDebateTierGuaranteedCompletionProviderCalls(
  tier: PaperImplementationDebateComplexityTier,
): number {
  const plan = PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS[tier];
  const upgradeTier = plan.conditional_upgrade?.upgrade_to ?? tier;
  return Math.max(
    plan.role_plan.length,
    PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS[upgradeTier].role_plan.length,
  );
}

/**
 * Budget gate: true when `providerCallBudget` (null/undefined = unbounded) can
 * reserve the decided tier's upgrade-safe completion count. A false result at
 * preflight becomes a zero-provider-call `TIER_BUDGET_INSUFFICIENT`.
 */
export function paperImplementationDebateTierBudgetSufficient(
  tier: PaperImplementationDebateComplexityTier,
  providerCallBudget: number | null | undefined,
): boolean {
  if (providerCallBudget === null || providerCallBudget === undefined) {
    return true;
  }
  // Fail-closed on a non-finite budget (NaN / ±Infinity): a malformed or poisoned
  // budget is never treated as "enough". Only null/undefined means unbounded.
  if (!Number.isFinite(providerCallBudget)) {
    return false;
  }
  return providerCallBudget >= paperImplementationDebateTierGuaranteedCompletionProviderCalls(tier);
}

// Compile-time exhaustiveness: every complexity tier has a registered plan.
const _tierPlanExhaustiveness: {
  readonly [K in (typeof PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS)[number]]: PaperImplementationDebateTierPlan;
} = PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS;
void _tierPlanExhaustiveness;
