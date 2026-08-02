import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

import {
  experimentFoundationPromotionV2ParamsSchema,
  experimentFoundationPromotionV2RequestSchema,
} from './experiment-foundation-promotion-v2-contracts.js';
import {
  serverExperimentFoundationPromotionV2Id,
  serverHashExperimentFoundationPromotionV2Command,
} from './experiment-v2-canonical-hash.js';

test('promotion request and params accept only public identity/revision, decision and key', async () => {
  assert.equal(await validates(experimentFoundationPromotionV2ParamsSchema, {
    asset_type: 'DataPolicy',
    logical_id: 'policy_candidate_001',
    candidate_revision: 1,
  }), true);
  assert.equal(await validates(experimentFoundationPromotionV2RequestSchema, {
    decision: 'promote',
    business_idempotency_key: 'promote-policy-001',
  }), true);

  for (const forbidden of [
    'candidate_id',
    'content_hash',
    'canonical_revision',
    'promotion_result',
    'task_spec_id',
    'outbox',
  ]) {
    assert.equal(await validates(experimentFoundationPromotionV2RequestSchema, {
      decision: 'promote',
      business_idempotency_key: 'promote-policy-001',
      [forbidden]: 'caller-authored',
    }), false, forbidden);
  }
});

type JsonSchema = Record<string, unknown>;

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload: payload as object,
  });
  await app.close();
  return response.statusCode === 200;
}

test('promotion command hashes and server ids are deterministic and drift-sensitive', () => {
  const input = {
    asset_type: 'DataPolicy',
    logical_id: 'policy_candidate_001',
    candidate_revision: 1,
    decision: 'promote',
  };
  const left = serverHashExperimentFoundationPromotionV2Command(input);
  const right = serverHashExperimentFoundationPromotionV2Command({ ...input });
  const drifted = serverHashExperimentFoundationPromotionV2Command({
    ...input,
    decision: 'reject',
  });

  assert.equal(left, right);
  assert.notEqual(left, drifted);
  assert.equal(
    serverExperimentFoundationPromotionV2Id('candidate', input),
    serverExperimentFoundationPromotionV2Id('candidate', { ...input }),
  );
  assert.notEqual(
    serverExperimentFoundationPromotionV2Id('candidate', input),
    serverExperimentFoundationPromotionV2Id('decision', input),
  );
});
