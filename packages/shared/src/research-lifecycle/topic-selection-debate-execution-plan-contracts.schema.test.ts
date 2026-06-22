import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_DEBATE_EXECUTION_PLAN_NAMES,
  debateExecutionPlanMixingError,
  debateLevelToExecutionPlanName,
  resolveCallerSideDebateModelOptionId,
  resolveDebateExecutionModelOptionId,
  resolveDebateExecutionSpec,
  topicSelectionNamedDebateExecutionPlanSchema,
  type TopicSelectionNamedDebateExecutionPlan,
} from './topic-selection-debate-execution-plan-contracts.js';

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify();
  app.post('/v', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const r = await app.inject({ method: 'POST', url: '/v', payload: body as Record<string, unknown> });
    return r.statusCode === 200;
  } finally {
    await app.close();
  }
}

test('debate execution plan: three named plans', () => {
  assert.deepEqual([...TOPIC_SELECTION_DEBATE_EXECUTION_PLAN_NAMES], ['codex_assisted', 'provider_compact', 'provider_diverse']);
});

test('debate execution plan: debate_level maps both enum families to the right plan (codex never from a level)', () => {
  assert.equal(debateLevelToExecutionPlanName('mixed_cost_control'), 'provider_compact');
  assert.equal(debateLevelToExecutionPlanName('compact_assessment_debate'), 'provider_compact');
  assert.equal(debateLevelToExecutionPlanName('provider_diverse_deep'), 'provider_diverse');
  assert.equal(debateLevelToExecutionPlanName('provider_diverse_deep_debate'), 'provider_diverse');
});

test('debate execution plan: resolver precedence is roles[role] -> default -> null; absent plan is null (byte-identical)', () => {
  type Role = 'n6_debate_explorer' | 'n6_debate_arbiter';
  const plan: TopicSelectionNamedDebateExecutionPlan<Role> = {
    name: 'provider_diverse',
    default: { execution_mode: 'provider_llm', model_option_id: 'profile.default-opt' },
    roles: { n6_debate_explorer: { execution_mode: 'provider_llm', model_option_id: 'explorer-profile.deepseek' } },
  };
  // role with explicit entry wins
  assert.equal(resolveDebateExecutionModelOptionId(plan, 'n6_debate_explorer'), 'explorer-profile.deepseek');
  // role without entry falls to default
  assert.equal(resolveDebateExecutionModelOptionId(plan, 'n6_debate_arbiter'), 'profile.default-opt');
  // absent plan -> null (today's ctx.modelOptionId), so invocationEnvelope emits the same value
  assert.equal(resolveDebateExecutionModelOptionId(null, 'n6_debate_explorer'), null);
  assert.equal(resolveDebateExecutionModelOptionId(undefined, 'n6_debate_arbiter'), null);
  // spec resolver returns the whole spec
  assert.deepEqual(resolveDebateExecutionSpec(plan, 'n6_debate_explorer'), { execution_mode: 'provider_llm', model_option_id: 'explorer-profile.deepseek' });
  assert.equal(resolveDebateExecutionSpec(plan, 'n6_debate_arbiter')?.execution_mode, 'provider_llm');
});

test('debate execution plan: mixing a plan with a legacy model_option_id is rejected', () => {
  const plan: TopicSelectionNamedDebateExecutionPlan<'r'> = { name: 'provider_compact' };
  assert.ok(debateExecutionPlanMixingError(plan, 'some-opt'));
  assert.equal(debateExecutionPlanMixingError(plan, null), null);
  assert.equal(debateExecutionPlanMixingError(null, 'some-opt'), null);
});

test('debate execution plan: Option-A caller seam resolves per-role / legacy / null and rejects mixing (W-09 S3)', () => {
  type Role = 'n2_draft' | 'n2_critic' | 'n2_final';
  const plan: TopicSelectionNamedDebateExecutionPlan<Role> = {
    name: 'provider_diverse',
    default: { execution_mode: 'provider_llm', model_option_id: 'profile.default-opt' },
    roles: { n2_draft: { execution_mode: 'provider_llm', model_option_id: 'draft-profile.deepseek' } },
  };
  // plan present, role with explicit entry -> that role's option (per-slot diversity via the caller loop)
  assert.equal(resolveCallerSideDebateModelOptionId(plan, 'n2_draft', null), 'draft-profile.deepseek');
  // plan present, role without entry -> the plan default
  assert.equal(resolveCallerSideDebateModelOptionId(plan, 'n2_critic', null), 'profile.default-opt');
  // no plan, legacy per-call option supplied -> the legacy option (today's single-profile channel)
  assert.equal(resolveCallerSideDebateModelOptionId(null, 'n2_draft', 'legacy-opt'), 'legacy-opt');
  // empty plan (no roles/default) + no legacy -> null === today's default (byte-identical)
  assert.equal(resolveCallerSideDebateModelOptionId({ name: 'codex_assisted' }, 'n2_draft', null), null);
  // absent everything -> null
  assert.equal(resolveCallerSideDebateModelOptionId(null, 'n2_final', null), null);
  // plan AND legacy on the same call -> the mixing guard throws (the plan is the sole override channel)
  assert.throws(() => resolveCallerSideDebateModelOptionId(plan, 'n2_draft', 'legacy-opt'), /cannot be combined with a legacy/);
});

test('debate execution plan: the per-debate JSON schema accepts a valid role-keyed plan and rejects bad value constraints', async () => {
  const schema = topicSelectionNamedDebateExecutionPlanSchema(['n6_debate_explorer', 'n6_debate_critic', 'n6_debate_arbiter']);
  assert.equal(await validatesBody(schema, {
    name: 'provider_diverse',
    roles: { n6_debate_explorer: { execution_mode: 'provider_llm', model_option_id: 'explorer-profile.deepseek' } },
  }), true);
  // unknown plan name (enum value constraint — rejected, not stripped)
  assert.equal(await validatesBody(schema, { name: 'totally_made_up' }), false);
  // bad execution_mode value on a known role (enum value constraint — rejected)
  assert.equal(await validatesBody(schema, { name: 'provider_compact', roles: { n6_debate_explorer: { execution_mode: 'not_a_mode' } } }), false);
  // missing required name
  assert.equal(await validatesBody(schema, { roles: {} }), false);
});

test('debate execution plan: the schema factory closes additionalProperties at every level (unknown keys cannot smuggle a payload)', () => {
  // Fastify/ajv STRIPS unknown props (additionalProperties:false) rather than rejecting at the HTTP edge,
  // so the protection is verified STRUCTURALLY here: a stricter validator (or any non-stripping consumer)
  // relies on additionalProperties:false being present at the plan / roles / per-role-spec levels so an
  // unknown role key or an unknown spec field cannot smuggle a value past the contract.
  const schema = topicSelectionNamedDebateExecutionPlanSchema(['n6_debate_explorer', 'n6_debate_critic']) as {
    additionalProperties: boolean;
    properties: {
      roles: { additionalProperties: boolean; properties: Record<string, { additionalProperties: boolean }> };
      default: { anyOf: Array<{ additionalProperties?: boolean }> };
    };
  };
  // plan object is closed
  assert.equal(schema.additionalProperties, false);
  // the roles map only admits the declared role slot ids (no arbitrary role key)
  assert.equal(schema.properties.roles.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties.roles.properties).sort(), ['n6_debate_critic', 'n6_debate_explorer']);
  // each declared role's execution-spec is closed (no unknown spec field)
  assert.equal(schema.properties.roles.properties.n6_debate_explorer!.additionalProperties, false);
  // the default execution-spec branch is closed too
  const defaultSpecBranch = schema.properties.default.anyOf.find((branch) => branch.additionalProperties === false);
  assert.ok(defaultSpecBranch, 'default spec branch must close additionalProperties');
});
