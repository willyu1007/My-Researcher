import assert from 'node:assert/strict';
import test from 'node:test';
import {
  debateLevelToExecutionPlanName,
  type TopicSelectionDebateLevel,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-execution-plan-contracts';
import {
  TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_PROFILE_ID,
  TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import {
  TOPIC_SELECTION_N6_DEBATE_EXECUTION_PLANS,
  TOPIC_SELECTION_N8_DEBATE_EXECUTION_PLANS,
  TOPIC_SELECTION_V1C_N2_DEBATE_EXECUTION_PLANS,
  selectN6DebateExecutionPlan,
  selectN8DebateExecutionPlan,
  selectV1cN2DebateExecutionPlan,
} from './topic-selection-debate-execution-plan-registry-service.js';

// Each role's profile key (so the test can resolve every authored option_id against the REAL registry).
const N6_PROFILE_BY_ROLE: Record<string, string> = {
  n6_debate_explorer: TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
  n6_debate_critic: TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  n6_debate_arbiter: TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
};

const FAMILIES = [
  { label: 'N6', plans: TOPIC_SELECTION_N6_DEBATE_EXECUTION_PLANS, profileByRole: N6_PROFILE_BY_ROLE },
  {
    label: 'N8',
    plans: TOPIC_SELECTION_N8_DEBATE_EXECUTION_PLANS,
    profileByRole: new Proxy({}, { get: () => TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_PROFILE_ID }) as Record<string, string>,
  },
  {
    label: 'v1c-N2',
    plans: TOPIC_SELECTION_V1C_N2_DEBATE_EXECUTION_PLANS,
    profileByRole: new Proxy({}, { get: () => TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID }) as Record<string, string>,
  },
] as const;

const PLAN_NAMES = ['codex_assisted', 'provider_compact', 'provider_diverse'] as const;

test('debate execution plan registry: every authored option_id resolves to a REAL registry provider option', () => {
  const service = new TopicSelectionModelProfileRegistryService();
  for (const family of FAMILIES) {
    for (const planName of PLAN_NAMES) {
      const plan = family.plans[planName];
      assert.equal(plan.name, planName, `${family.label}/${planName} self-names`);
      if (planName === 'codex_assisted') {
        // Empty plan: resolver returns null everywhere -> byte-identical to today's codex/single-profile.
        assert.equal(plan.roles, undefined, `${family.label} codex_assisted carries no roles`);
        assert.equal(plan.default, undefined, `${family.label} codex_assisted carries no default`);
        continue;
      }
      const roles = plan.roles ?? {};
      assert.ok(Object.keys(roles).length > 0, `${family.label}/${planName} covers roles`);
      for (const [role, spec] of Object.entries(roles)) {
        assert.equal(spec!.execution_mode, 'provider_llm', `${family.label}/${planName}/${role} is provider_llm`);
        assert.ok(spec!.model_option_id, `${family.label}/${planName}/${role} carries a model_option_id`);
        // resolveProfile THROWS if the option_id is not defined by the profile — so this is the existence guard.
        const resolved = service.resolveProfile({
          profile_id: family.profileByRole[role]!,
          execution_mode: 'provider_llm',
          run_mode: 'acceptance',
          model_option_id: spec!.model_option_id!,
        });
        assert.equal(
          resolved.selected_model_option?.option_id,
          spec!.model_option_id,
          `${family.label}/${planName}/${role} option resolves`,
        );
      }
    }
  }
});

test('debate execution plan registry: debate_level -> plan composes the shared mapping with the per-family tables', () => {
  // N8 admission family
  assert.equal(selectN8DebateExecutionPlan(debateLevelToExecutionPlanName('compact_assessment_debate')).name, 'provider_compact');
  assert.equal(selectN8DebateExecutionPlan(debateLevelToExecutionPlanName('provider_diverse_deep_debate')).name, 'provider_diverse');
  // N6/N7 escalation family
  assert.equal(selectN6DebateExecutionPlan(debateLevelToExecutionPlanName('mixed_cost_control')).name, 'provider_compact');
  assert.equal(selectN6DebateExecutionPlan(debateLevelToExecutionPlanName('provider_diverse_deep')).name, 'provider_diverse');
  // v1c-N2 mirrors the N6 escalation family for selection
  assert.equal(selectV1cN2DebateExecutionPlan(debateLevelToExecutionPlanName('provider_diverse_deep')).name, 'provider_diverse');
  // codex_assisted is NEVER produced from a debate_level (it is selected explicitly by run_mode, not escalation).
  const levels: TopicSelectionDebateLevel[] = [
    'mixed_cost_control', 'provider_diverse_deep', 'compact_assessment_debate', 'provider_diverse_deep_debate',
  ];
  for (const level of levels) {
    assert.notEqual(debateLevelToExecutionPlanName(level), 'codex_assisted');
  }
});

test('debate execution plan registry: no plan assigns deepseek, and every terminal role takes openai-quality (deepseek-never-arbiter)', () => {
  const allPlans = [
    ...Object.values(TOPIC_SELECTION_N6_DEBATE_EXECUTION_PLANS),
    ...Object.values(TOPIC_SELECTION_N8_DEBATE_EXECUTION_PLANS),
    ...Object.values(TOPIC_SELECTION_V1C_N2_DEBATE_EXECUTION_PLANS),
  ];
  for (const plan of allPlans) {
    for (const spec of Object.values(plan.roles ?? {})) {
      assert.ok(
        !String(spec!.model_option_id).includes('deepseek'),
        `${plan.name} must not assign a deepseek option: ${spec!.model_option_id}`,
      );
    }
  }
  // The terminal/synthesis role of each provider_diverse plan takes the highest-quality openai option,
  // never an alternative-worker provider — encoding the "deepseek explorer/critic-eligible, never arbiter" rule.
  assert.match(TOPIC_SELECTION_N6_DEBATE_EXECUTION_PLANS.provider_diverse.roles!.n6_debate_arbiter!.model_option_id!, /\.openai-quality$/);
  assert.match(TOPIC_SELECTION_N8_DEBATE_EXECUTION_PLANS.provider_diverse.roles!.n8_debate_synthesizer_final!.model_option_id!, /\.openai-quality$/);
  assert.match(
    TOPIC_SELECTION_V1C_N2_DEBATE_EXECUTION_PLANS.provider_diverse.roles!['n2_bounded_micro_debate.synthesizer_final']!.model_option_id!,
    /\.openai-quality$/,
  );
});

test('debate execution plan registry: a fabricated deepseek option on a debate role is REJECTED by the registry', () => {
  // deepseek is gated to need-discovery workers; the debate profiles do NOT define it. This pins that a
  // future plan edit sneaking deepseek onto a debate role would HARD-FAIL at resolveProfile, not silently pass.
  const service = new TopicSelectionModelProfileRegistryService();
  assert.throws(
    () => service.resolveProfile({
      profile_id: TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
      execution_mode: 'provider_llm',
      run_mode: 'acceptance',
      model_option_id: `${TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID}.deepseek-v4-thinking`,
    }),
    /not defined by model profile/,
  );
});
