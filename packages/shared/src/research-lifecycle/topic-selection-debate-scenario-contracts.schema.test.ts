import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract,
  createTopicSelectionV1bN6DivergentDebateScenarioContract,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_SLOT_IDS,
  topicSelectionDebateScenarioContractSchema,
  topicSelectionV1aGenerateNeedCandidateDebateExecutionPlanSchema,
} from './topic-selection-debate-scenario-contracts.js';
import { TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER } from './topic-selection-v1b-workflow-harness-contracts.js';

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

test('topic-selection debate scenario contract schema accepts v1a need-discovery contract', async () => {
  const contract = createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract();

  assert.equal(await validatesBody(topicSelectionDebateScenarioContractSchema, contract), true);
  assert.equal(contract.node_id, 'topic-selection.v1a.generate-need-candidate.v1');
  assert.equal(contract.debate_policy_id, 'topic-selection.need-discovery.debate.v1');
  assert.equal(contract.role_stage_slots.length, 4);
  assert.equal(
    contract.role_stage_slots.find((slot) => slot.slot_id === 'explorer.round_1_discovery')
      ?.instance_policy.default_instances,
    2,
  );
  assert.equal(
    contract.role_stage_slots.find((slot) => slot.slot_id === 'arbiter.final_synthesis')
      ?.codex_substitution_policy.allowed,
    false,
  );
  assert.equal(contract.validation_contract.max_persisted_candidates, 5);
  assert.deepEqual(
    contract.role_stage_slots.map((slot) => slot.slot_id),
    [
      'explorer.round_1_discovery',
      'deep_critic.round_1_discovery',
      'arbiter.issue_framing',
      'arbiter.final_synthesis',
    ],
  );
  assert.equal(JSON.stringify(contract).includes('temperature'), false);
});

test('topic-selection debate scenario contract schema accepts the v1b N6 divergent contract + slot ids match the role order', async () => {
  const contract = createTopicSelectionV1bN6DivergentDebateScenarioContract();

  assert.equal(await validatesBody(topicSelectionDebateScenarioContractSchema, contract), true);
  assert.equal(contract.node_id, 'topic-selection.v1b.generate-topic-question-candidates.v1');
  assert.equal(contract.role_stage_slots.length, 3);
  // The scenario slot ids MUST equal the runtime role order (runDivergentLoop walks these) — one invariant.
  const slotIds = contract.role_stage_slots.map((slot) => slot.slot_id);
  assert.deepEqual(slotIds, [...TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_SLOT_IDS]);
  assert.deepEqual(slotIds, [...TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER]);
  // explorer fans out (default 2, up to 3); arbiter is the terminal singleton producing the gate-facing draft.
  const explorer = contract.role_stage_slots.find((slot) => slot.slot_id === 'n6_debate_explorer');
  assert.equal(explorer?.instance_policy.default_instances, 2);
  assert.equal(explorer?.instance_policy.max_instances, 3);
  const arbiter = contract.role_stage_slots.find((slot) => slot.slot_id === 'n6_debate_arbiter');
  assert.equal(arbiter?.instance_policy.max_instances, 1);
  assert.equal(arbiter?.instance_policy.merge_output_as, 'external_structured_output');
  assert.equal(arbiter?.codex_substitution_policy.allowed, false);
  assert.equal(contract.artifact_contract.final_external_output_slot_id, 'n6_debate_arbiter');
  assert.equal(contract.validation_contract.max_persisted_candidates, 5);
  assert.equal(JSON.stringify(contract).includes('temperature'), false);
});

test('topic-selection debate scenario contract schema rejects fallback and provider-param drift', async () => {
  const contract = createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract() as unknown as Record<string, unknown>;
  const providerPolicy = contract.provider_selection_policy as Record<string, unknown>;
  providerPolicy.automatic_fallback = true;
  const slot = ((contract.role_stage_slots as Array<Record<string, unknown>>)[0]!);
  slot.temperature = 0.2;

  assert.equal(await validatesBody(topicSelectionDebateScenarioContractSchema, contract), false);
});

test('topic-selection debate execution plan schema accepts slot and instance specs', async () => {
  const plan = {
    default: {
      execution_mode: 'provider_llm',
      model_option_id: 'topic-selection.need-discovery.arbiter-final.v1.openai-balanced',
    },
    slots: {
      'explorer.round_1_discovery': {
        execution_mode: 'provider_llm',
        model_option_id: 'topic-selection.need-discovery.explorer.v1.dashscope-thinking-budget',
      },
    },
    instances: {
      'explorer.round_1_discovery#explorer_2': {
        execution_mode: 'codex_assisted',
      },
    },
  };

  assert.equal(await validatesBody(topicSelectionV1aGenerateNeedCandidateDebateExecutionPlanSchema, plan), true);
});

test('topic-selection debate execution plan schema rejects unknown slot specs', async () => {
  const plan = {
    slots: {
      'grounding_auditor.round_1_discovery': {
        execution_mode: 'provider_llm',
      },
    },
  };

  assert.equal(await validatesBody(topicSelectionV1aGenerateNeedCandidateDebateExecutionPlanSchema, plan), false);
});
