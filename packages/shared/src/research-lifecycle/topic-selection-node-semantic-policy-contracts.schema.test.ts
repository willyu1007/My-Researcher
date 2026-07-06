import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS,
} from './topic-selection-v1a-workflow-harness-contracts.js';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS,
} from './topic-selection-v1b-workflow-harness-contracts.js';
import {
  TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_SEMANTIC_POLICIES,
  TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES,
  TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES,
  topicSelectionNodeSemanticPolicySchema,
  topicSelectionV1bNodeSemanticSupplementPolicySchema,
} from './topic-selection-node-semantic-policy-contracts.js';

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

const ALL_POLICIES = [
  ...TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES,
  ...TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_SEMANTIC_POLICIES,
];

test('every v1a and resource-sampling semantic policy validates against the schema', async () => {
  for (const policy of ALL_POLICIES) {
    assert.equal(
      await validatesBody(topicSelectionNodeSemanticPolicySchema as unknown as Record<string, unknown>, policy),
      true,
      `policy failed schema validation: ${policy.node_id}`,
    );
  }
});

test('v1a semantic policy registry covers exactly the v1a harness node ids in canonical order', () => {
  assert.deepEqual(
    TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES.map((policy) => policy.node_id),
    [...TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS],
  );
  assert.deepEqual(
    TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES.map((policy) => policy.node_index),
    TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES.map((_, index) => index + 1),
  );
});

test('debate_allowed=no is equivalent to debate_primitive=none across both stages', () => {
  for (const policy of ALL_POLICIES) {
    assert.equal(
      policy.debate_allowed === 'no',
      policy.debate_primitive === 'none',
      `debate flag/primitive mismatch: ${policy.node_id}`,
    );
  }
});

test('every v1b semantic supplement policy validates against its schema', async () => {
  for (const policy of TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES) {
    assert.equal(
      await validatesBody(
        topicSelectionV1bNodeSemanticSupplementPolicySchema as unknown as Record<string, unknown>,
        policy,
      ),
      true,
      `v1b supplement policy failed schema validation: ${policy.node_id}`,
    );
  }
});

test('v1b semantic supplement covers exactly the v1b harness node ids in canonical order', () => {
  assert.deepEqual(
    TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES.map((policy) => policy.node_id),
    [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS],
  );
  assert.deepEqual(
    TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES.map((policy) => policy.node_index),
    TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES.map((_, index) => index + 1),
  );
});

test('v1b supplement debate flag/primitive coherence', () => {
  for (const policy of TOPIC_SELECTION_V1B_NODE_SEMANTIC_SUPPLEMENT_POLICIES) {
    assert.equal(
      policy.debate_allowed === 'no',
      policy.debate_primitive === 'none',
      `debate flag/primitive mismatch: ${policy.node_id}`,
    );
    // v1b has no policy-only debate hooks: an allowed debate must name an implemented primitive.
    if (policy.debate_allowed !== 'no') {
      assert.notEqual(policy.debate_primitive, 'reserved', `reserved primitive in v1b: ${policy.node_id}`);
    }
  }
});

test('human_review_required=yes implies a human_review executor', () => {
  for (const policy of ALL_POLICIES) {
    if (policy.human_review_required === 'yes') {
      assert.equal(policy.executor_kind, 'human_review', `human gate without human executor: ${policy.node_id}`);
    }
  }
});

test('schema rejects unknown properties and out-of-vocabulary values', async () => {
  const base = { ...TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES[0] };
  assert.equal(
    await validatesBody(topicSelectionNodeSemanticPolicySchema as unknown as Record<string, unknown>, {
      ...base,
      unexpected_field: true,
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionNodeSemanticPolicySchema as unknown as Record<string, unknown>, {
      ...base,
      debate_allowed: 'reserved',
    }),
    false,
  );
});
