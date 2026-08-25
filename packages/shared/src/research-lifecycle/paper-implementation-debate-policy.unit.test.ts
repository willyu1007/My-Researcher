import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessPaperImplementationDebateComplexity,
  assessPaperImplementationDebateComplexityShadow,
  PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS,
} from './paper-implementation-debate-complexity-shadow.js';
import {
  PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY,
  PAPER_IMPLEMENTATION_DEBATE_POLICY_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS,
  PAPER_IMPLEMENTATION_TIER_BUDGET_INSUFFICIENT_BLOCKER_CODE,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY,
  paperImplementationDebateTierBudgetSufficient,
  paperImplementationDebateTierFloorProviderCalls,
  paperImplementationDebateTierGuaranteedCompletionProviderCalls,
  paperImplementationDebateTierPlan,
  paperImplementationEffectiveDebateRolePlan,
  paperImplementationEffectiveDebateTier,
} from './paper-implementation-debate-policy.js';

test('DebatePolicy@v1: every tier declares a plan and the registry mounts the trace policy (D2-core)', () => {
  for (const tier of PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS) {
    const plan = paperImplementationDebateTierPlan(tier);
    assert.equal(plan.tier, tier);
    assert.ok(plan.role_plan.length >= 3);
    // The arbiter always closes the chain; the support map always opens it.
    assert.equal(plan.role_plan[0], 'support_mapper_map');
    assert.equal(plan.role_plan[plan.role_plan.length - 1], 'arbiter_final');
    // Provider-call counts are DERIVED (no hand-pinned constants): the floor is
    // the role plan length and the upgrade-safe reservation is never smaller.
    assert.equal(paperImplementationDebateTierFloorProviderCalls(tier), plan.role_plan.length);
    assert.ok(
      paperImplementationDebateTierGuaranteedCompletionProviderCalls(tier)
        >= paperImplementationDebateTierFloorProviderCalls(tier),
    );
  }
  const policy = PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_POLICY;
  assert.equal(policy.schema_version, PAPER_IMPLEMENTATION_DEBATE_POLICY_SCHEMA_VERSION);
  assert.equal(
    PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY[policy.debate_policy_id],
    policy,
  );
  assert.equal(policy.tiers, PAPER_IMPLEMENTATION_DEBATE_TIER_PLANS);
});

test('DebatePolicy@v1: light role plan omits reconcile; findings deterministically upgrade to standard (D2-core)', () => {
  assert.deepEqual(
    [...paperImplementationEffectiveDebateRolePlan('light', false)],
    ['support_mapper_map', 'skeptic_challenge', 'arbiter_final'],
  );
  assert.deepEqual(
    [...paperImplementationEffectiveDebateRolePlan('light', true)],
    ['support_mapper_map', 'skeptic_challenge', 'support_mapper_reconcile', 'arbiter_final'],
  );
  assert.equal(paperImplementationEffectiveDebateTier('light', false), 'light');
  assert.equal(paperImplementationEffectiveDebateTier('light', true), 'standard');
  // standard/full never change shape on findings (no conditional upgrade).
  for (const tier of ['standard', 'full'] as const) {
    assert.equal(paperImplementationEffectiveDebateTier(tier, true), tier);
    assert.deepEqual(
      paperImplementationEffectiveDebateRolePlan(tier, true),
      paperImplementationEffectiveDebateRolePlan(tier, false),
    );
    assert.equal(paperImplementationEffectiveDebateRolePlan(tier, false).length, 4);
  }
  // Prefix stability: the upgraded plan extends the floor plan positionally.
  const floor = paperImplementationEffectiveDebateRolePlan('light', false);
  const upgraded = paperImplementationEffectiveDebateRolePlan('light', true);
  assert.deepEqual(upgraded.slice(0, 2), floor.slice(0, 2));
});

test('DebatePolicy@v1: full raises token/retry headroom instead of a fifth call (D2-core signoff)', () => {
  const full = paperImplementationDebateTierPlan('full');
  const standard = paperImplementationDebateTierPlan('standard');
  assert.equal(full.conditional_upgrade, null);
  assert.deepEqual([...full.role_plan], [...standard.role_plan]);
  assert.ok(full.role_output_token_budget_ceiling > standard.role_output_token_budget_ceiling);
  assert.ok(full.max_technical_retry_attempts > standard.max_technical_retry_attempts);
});

test('DebatePolicy@v1: budget gate reserves the upgrade-safe call count (D2-core)', () => {
  // light reserves standard's requirement — the upgrade can never be budget-walled.
  assert.equal(
    paperImplementationDebateTierGuaranteedCompletionProviderCalls('light'),
    paperImplementationDebateTierFloorProviderCalls('standard'),
  );
  assert.equal(paperImplementationDebateTierBudgetSufficient('light', 3), false);
  assert.equal(paperImplementationDebateTierBudgetSufficient('light', 4), true);
  assert.equal(paperImplementationDebateTierBudgetSufficient('standard', 3), false);
  assert.equal(paperImplementationDebateTierBudgetSufficient('full', 4), true);
  // null/undefined = unbounded (sufficient).
  assert.equal(paperImplementationDebateTierBudgetSufficient('full', null), true);
  assert.equal(paperImplementationDebateTierBudgetSufficient('full', undefined), true);
  // Non-finite budgets fail closed (insufficient) — a malformed/poisoned budget
  // is never treated as unbounded.
  assert.equal(paperImplementationDebateTierBudgetSufficient('full', Number.POSITIVE_INFINITY), false);
  assert.equal(paperImplementationDebateTierBudgetSufficient('full', Number.NaN), false);
  assert.equal(PAPER_IMPLEMENTATION_TIER_BUDGET_INSUFFICIENT_BLOCKER_CODE, 'TIER_BUDGET_INSUFFICIENT');
});

test('DebatePolicy@v1: enforced assessment is byte-identical to the shadow computation (D2-core)', () => {
  const cases = [
    { reviewed_statement_count: 1, retrieval_packet_ref_count: 1, prior_blocker_density: 0, target_kind: 'trace_integrity' as const },
    { reviewed_statement_count: 5, retrieval_packet_ref_count: 3, prior_blocker_density: 0.3, target_kind: 'trace_integrity' as const },
    { reviewed_statement_count: 12, retrieval_packet_ref_count: 9, prior_blocker_density: 0.8, target_kind: 'trace_integrity' as const },
    { reviewed_statement_count: 0, retrieval_packet_ref_count: 0, prior_blocker_density: 0, target_kind: 'motive_evolution' as const },
  ];
  for (const inputs of cases) {
    const enforced = assessPaperImplementationDebateComplexity(inputs);
    const shadow = assessPaperImplementationDebateComplexityShadow(inputs);
    assert.equal(enforced.schema_version, 'PaperImplementationDebateComplexityAssessment@v1');
    assert.equal(enforced.recommended_tier, shadow.recommended_tier);
    assert.equal(enforced.inputs_hash, shadow.inputs_hash);
    assert.deepEqual(enforced.rationale_codes, shadow.rationale_codes);
  }
});
