import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type {
  ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

import { ExperimentFoundationExplorationSpecV2Controller } from '../controllers/experiment-foundation-exploration-spec-v2-controller.js';
import { InMemoryExperimentFoundationExplorationSpecV2Repository } from '../repositories/in-memory-experiment-foundation-exploration-spec-v2-repository.js';
import { ExperimentFoundationExplorationSpecV2Service } from '../services/experiment-foundation-exploration-spec-v2-service.js';
import { registerExperimentFoundationExplorationSpecV2Routes } from './experiment-foundation-exploration-spec-v2-routes.js';

const HASH_A = `sha256:${'a'.repeat(64)}`;

test('exploration spec route is default-off with a stable reason code', async () => {
  const app = Fastify({ logger: false });
  await registerExperimentFoundationExplorationSpecV2Routes(
    app,
    controller(false),
  );
  const response = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/exploration-specifications/spec-disabled/revisions',
    payload: request(),
  });
  assert.equal(response.statusCode, 409, response.body);
  assert.equal(response.json().error.details.reason_code, 'EF_V2_EXPLORATION_SPEC_DISABLED');
  await app.close();
});

test('exploration spec route creates one immutable revision and replays it', async () => {
  const app = Fastify({ logger: false });
  await registerExperimentFoundationExplorationSpecV2Routes(app, controller(true));
  const input = {
    method: 'POST' as const,
    url: '/experiment-foundation/v2/exploration-specifications/spec-route/revisions',
    payload: request(),
  };
  const created = await app.inject(input);
  const replay = await app.inject(input);

  assert.equal(created.statusCode, 201, created.body);
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal(created.json().revision.spec_revision, 1);
  assert.equal(replay.json().revision.revision_id, created.json().revision.revision_id);
  assert.equal(replay.json().replayed, true);
  await app.close();
});

test('exploration spec route rejects extra and nested execution authority', async () => {
  const app = Fastify({ logger: false });
  await registerExperimentFoundationExplorationSpecV2Routes(app, controller(true));

  for (const payload of [
    { ...request(), content_hash: 'caller-authored' },
    {
      ...request(),
      specification: {
        ...request().specification,
        result: { run_id: 'caller-run' },
      },
    },
  ]) {
    const response = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/v2/exploration-specifications/spec-forbidden/revisions',
      payload,
    });
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(response.json().error.details.reason_code, 'EXPLORATION_SPEC_COMMAND_INVALID');
  }
  await app.close();
});

function controller(enabled: boolean) {
  return new ExperimentFoundationExplorationSpecV2Controller(
    new ExperimentFoundationExplorationSpecV2Service(
      new InMemoryExperimentFoundationExplorationSpecV2Repository(),
      { enabled: () => enabled },
    ),
  );
}

function request(): ExperimentFoundationExplorationSpecV2CreateRevisionRequest {
  return {
    expected_state_version: 0,
    business_idempotency_key: 'spec-route-key',
    specification: {
      schema_version: 'v1',
      proposed_branch_frame: {
        frame_schema_version: 'v1',
        display_name: 'Route exploration branch',
        scientific_intent: 'Verify the route contract.',
        comparison_role: 'primary',
        parent_branch_key: null,
      },
      work_order_revision: {
        work_order_schema_version: 'v1',
        title: 'Route exploration',
        objective: 'Verify route behavior.',
        readiness_attestation_id: 'readiness-route',
        readiness_attestation_hash: HASH_A,
        asset_dependencies: [{
          asset_type: 'DataPolicy',
          logical_id: 'policy-route',
          revision_id: 'policy-route-revision',
          revision_sequence: 1,
          content_hash: HASH_A,
        }],
        run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
      },
      exact_cells: [{
        cell_key: 'cell-route',
        seed: 7,
        repeat_index: 0,
        parameters: [],
        required_result_contract: { metrics: [], artifacts: [] },
      }],
    },
  };
}
