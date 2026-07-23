import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  ExperimentFoundationRealProviderV2Controller,
} from '../controllers/experiment-foundation-real-provider-v2-controller.js';
import {
  InMemoryExperimentFoundationExecutionV2Repository,
} from '../repositories/in-memory-experiment-foundation-execution-v2-repository.js';
import {
  ExperimentFoundationRealProviderIntakeV2Service,
} from '../services/experiment-foundation-real-provider-intake-v2-service.js';
import {
  createRealProviderV2TestFixture,
  REAL_PROVIDER_TEST_NOW,
} from '../services/experiment-foundation-real-provider-v2-test-fixture.js';
import {
  registerExperimentFoundationRealProviderV2Routes,
} from './experiment-foundation-real-provider-v2-routes.js';

test('M7 real-provider product route remains zero-write while intake capability is off', async () => {
  const harness = await createRouteHarness(false);
  const response = await harness.app.inject({
    method: 'POST',
    url: `/experiment-foundation/v2/runs/${harness.runId}/real-provider-executions`,
    payload: { business_idempotency_key: 'route-real-1' },
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error.details.reason_code, 'EF_V2_REAL_PROVIDER_INTAKE_DISABLED');
  assert.equal(harness.repository.snapshot().attempts.length, 0);
  await harness.app.close();
});

test('M7 real-provider product route creates one exact two-cell intake and replays', async () => {
  const harness = await createRouteHarness(true);
  const url = `/experiment-foundation/v2/runs/${harness.runId}/real-provider-executions`;
  const first = await harness.app.inject({
    method: 'POST',
    url,
    payload: { business_idempotency_key: 'route-real-1' },
  });
  const replay = await harness.app.inject({
    method: 'POST',
    url,
    payload: { business_idempotency_key: 'route-real-1' },
  });
  const forbidden = await harness.app.inject({
    method: 'POST',
    url,
    payload: {
      business_idempotency_key: 'route-real-2',
      payload_hash: `sha256:${'f'.repeat(64)}`,
    },
  });

  assert.equal(first.statusCode, 201);
  assert.equal(replay.statusCode, 200);
  assert.equal(forbidden.statusCode, 400);
  assert.equal(first.json().execution_attempts.length, 2);
  assert.ok(first.json().execution_attempts.every(
    (attempt: { execution_mode: string }) => attempt.execution_mode === 'real_provider',
  ));
  assert.equal(JSON.stringify(first.json()).includes('workspace-secret-ref'), false);
  assert.equal(harness.repository.snapshot().attempts.length, 2);
  await harness.app.close();
});

async function createRouteHarness(enabled: boolean) {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    realProviderPrerequisites: [fixture.prerequisite],
  });
  let sequence = 0;
  const service = new ExperimentFoundationRealProviderIntakeV2Service({
    repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => ({ revision: fixture.bundle }),
    },
    profileResolver: async () => fixture.profile,
    intakeEnabled: () => enabled,
    now: () => REAL_PROVIDER_TEST_NOW,
    idGenerator: (kind) => `${kind}-${sequence += 1}`,
  });
  const app = Fastify({ logger: false });
  await registerExperimentFoundationRealProviderV2Routes(
    app,
    new ExperimentFoundationRealProviderV2Controller(service),
  );
  await app.ready();
  return { app, repository, runId: fixture.prerequisite.run.run_id };
}
