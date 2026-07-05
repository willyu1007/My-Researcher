import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_DOWNSTREAM_NODE_IDS,
  TOPIC_SELECTION_V1C_NODE_IDS,
} from './topic-selection-v1c-node-ids.js';
import {
  TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES,
  TOPIC_SELECTION_V1C_NODE_POLICIES,
  findTopicSelectionV1cNodePolicy,
  topicSelectionV1cNodePolicyRegistrySchema,
  topicSelectionV1cNodePolicySchema,
} from './topic-selection-v1c-node-policy-contracts.js';

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });
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

test('every v1c and downstream node policy validates against the policy schema', async () => {
  for (const policy of [...TOPIC_SELECTION_V1C_NODE_POLICIES, ...TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES]) {
    assert.equal(
      await validatesBody(topicSelectionV1cNodePolicySchema as unknown as Record<string, unknown>, policy),
      true,
      `policy failed schema validation: ${policy.node_id}`,
    );
  }
  assert.equal(
    await validatesBody(
      topicSelectionV1cNodePolicyRegistrySchema as unknown as Record<string, unknown>,
      [...TOPIC_SELECTION_V1C_NODE_POLICIES],
    ),
    true,
  );
});

test('v1c policy registry covers exactly the v1c node ids in canonical order', () => {
  assert.deepEqual(
    TOPIC_SELECTION_V1C_NODE_POLICIES.map((policy) => policy.node_id),
    [...TOPIC_SELECTION_V1C_NODE_IDS],
  );
  assert.deepEqual(
    TOPIC_SELECTION_V1C_NODE_POLICIES.map((policy) => policy.node_index),
    TOPIC_SELECTION_V1C_NODE_POLICIES.map((_, index) => index + 1),
  );
});

test('downstream policy registry covers exactly the downstream node ids', () => {
  assert.deepEqual(
    TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES.map((policy) => policy.node_id),
    [...TOPIC_SELECTION_DOWNSTREAM_NODE_IDS],
  );
});

test('debate_allowed is equivalent to a concrete debate primitive', () => {
  for (const policy of [...TOPIC_SELECTION_V1C_NODE_POLICIES, ...TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES]) {
    assert.equal(
      policy.debate_allowed,
      policy.debate_primitive !== 'none',
      `debate flag/primitive mismatch: ${policy.node_id}`,
    );
  }
});

test('human_review_required implies a human_review executor', () => {
  for (const policy of [...TOPIC_SELECTION_V1C_NODE_POLICIES, ...TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES]) {
    if (policy.human_review_required) {
      assert.equal(policy.executor_kind, 'human_review', `human gate without human executor: ${policy.node_id}`);
    }
  }
});

test('findTopicSelectionV1cNodePolicy resolves v1c, downstream, and unknown ids', () => {
  assert.equal(
    findTopicSelectionV1cNodePolicy('topic-selection.v1c.generate-promotion-support.v1')?.executor_kind,
    'single_agent',
  );
  assert.equal(
    findTopicSelectionV1cNodePolicy('topic-selection.downstream.paper-project-intake.v1')?.authority_kind,
    'PaperProjectIntake',
  );
  assert.equal(findTopicSelectionV1cNodePolicy('topic-selection.v1c.unknown.v1'), null);
});

test('policy schema rejects unknown properties and out-of-vocabulary values', async () => {
  const base = { ...TOPIC_SELECTION_V1C_NODE_POLICIES[0] };
  assert.equal(
    await validatesBody(topicSelectionV1cNodePolicySchema as unknown as Record<string, unknown>, {
      ...base,
      unexpected_field: true,
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1cNodePolicySchema as unknown as Record<string, unknown>, {
      ...base,
      executor_kind: 'multi_agent_swarm',
    }),
    false,
  );
});
