import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

import { ExperimentFoundationPromotionV2Controller } from '../controllers/experiment-foundation-promotion-v2-controller.js';
import { InMemoryExperimentFoundationV2Repository } from '../repositories/in-memory-experiment-foundation-v2-repository.js';
import { ExperimentFoundationPromotionV2Service } from '../services/experiment-foundation-promotion-v2-service.js';
import { ExperimentFoundationV2Service } from '../services/experiment-foundation-v2-service.js';
import { registerExperimentFoundationPromotionV2Routes } from './experiment-foundation-promotion-v2-routes.js';

test('promotion route is default-off and returns a stable reason code', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const app = Fastify({ logger: false });
  await registerExperimentFoundationPromotionV2Routes(
    app,
    new ExperimentFoundationPromotionV2Controller(
      new ExperimentFoundationPromotionV2Service(repository, { enabled: () => false }),
    ),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/assets/DataPolicy/policy-disabled/candidate-revisions/1/promotion',
    payload: { decision: 'promote', business_idempotency_key: 'disabled-key' },
  });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error.details.reason_code, 'EF_V2_PROMOTION_DISABLED');
  await app.close();
});

test('promotion route accepts the narrow command and returns 201 then 200 replay', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const assets = new ExperimentFoundationV2Service(repository);
  await assets.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'policy-route',
    draft_content: {
      schema_version: 'v1',
      policy_key: 'policy-route',
      display_name: 'Route policy',
      license_expression: 'MIT',
      access_level: 'open',
      source_terms_uri: 'https://example.test/terms',
      redistribution_allowed: true,
      commercial_use_allowed: true,
      use_constraints: [],
    },
  });
  const app = Fastify({ logger: false });
  await registerExperimentFoundationPromotionV2Routes(
    app,
    new ExperimentFoundationPromotionV2Controller(
      new ExperimentFoundationPromotionV2Service(repository, { enabled: () => true }),
    ),
  );
  const input = {
    method: 'POST' as const,
    url: '/experiment-foundation/v2/assets/DataPolicy/policy-route/candidate-revisions/1/promotion',
    payload: { decision: 'promote', business_idempotency_key: 'route-key' },
  };
  const created = await app.inject(input);
  const replay = await app.inject(input);

  assert.equal(created.statusCode, 201, created.body);
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal(created.json().candidate.status, 'promoted');
  assert.equal(replay.json().event_id, created.json().event_id);
  assert.equal(replay.json().replayed, true);
  await app.close();
});

test('promotion route rejects extra and caller-authored nested authority fields', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const app = Fastify({ logger: false });
  await registerExperimentFoundationPromotionV2Routes(
    app,
    new ExperimentFoundationPromotionV2Controller(
      new ExperimentFoundationPromotionV2Service(repository, { enabled: () => true }),
    ),
  );

  for (const payload of [
    {
      decision: 'promote',
      business_idempotency_key: 'extra-key',
      content_hash: 'sha256:caller',
    },
    {
      decision: 'promote',
      business_idempotency_key: 'nested-key',
      metadata: { canonical_revision_id: 'caller-revision' },
    },
  ]) {
    const response = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/v2/assets/DataPolicy/policy-route/candidate-revisions/1/promotion',
      payload,
    });
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(response.json().error.details.reason_code, 'PROMOTION_COMMAND_INVALID');
  }
  await app.close();
});
