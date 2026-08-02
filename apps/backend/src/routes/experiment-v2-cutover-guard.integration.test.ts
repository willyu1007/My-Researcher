import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify, {
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';

import { buildApp } from '../app.js';
import type { ExperimentFoundationExecutionController } from '../controllers/experiment-foundation-execution-controller.js';
import type { ExperimentFoundationController } from '../controllers/experiment-foundation-controller.js';
import type { PaperImplementationController } from '../controllers/paper-implementation-controller.js';
import { registerExperimentFoundationExecutionRoutes } from './experiment-foundation-execution-routes.js';
import { registerExperimentFoundationRoutes } from './experiment-foundation-routes.js';
import { registerPaperImplementationRoutes } from './paper-implementation-routes.js';

type InjectCommand = {
  method: 'POST' | 'PUT';
  url: string;
};

const EXPERIMENT_V2_BOOLEAN_ENV_KEYS = [
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED',
] as const;

function restoreExperimentV2BooleanEnv(
  snapshot: Record<string, string | undefined>,
): void {
  for (const key of EXPERIMENT_V2_BOOLEAN_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function controllerProxy<T extends object>(calls: { count: number }): T {
  const handler = async (_request: FastifyRequest, reply: FastifyReply) => {
    calls.count += 1;
    return reply.send({ diagnostic: true });
  };

  return new Proxy({} as T, {
    get() {
      return handler;
    },
  });
}

async function assertLegacyCommandsAreClosed(
  app: ReturnType<typeof Fastify>,
  commands: InjectCommand[],
): Promise<void> {
  for (const command of commands) {
    const response = await app.inject({
      ...command,
      // The cutover rejection occurs onRequest, before legacy schema parsing.
      payload: {},
    });
    assert.equal(response.statusCode, 409, `${command.method} ${command.url}`);
    assert.deepEqual(response.json(), {
      error: {
        code: 'GATE_CONSTRAINT_FAILED',
        message: 'Legacy experiment mutation is unavailable after the v2 cutover.',
        details: {
          reason_code: 'LEGACY_RECORD_NOT_ELIGIBLE',
        },
      },
    });
  }
}

test('committed cutover closes every legacy PI WorkOrder, HarnessRun, live, and monitor mutation before its controller', async () => {
  const calls = { count: 0 };
  const app = Fastify({ logger: false });
  await registerPaperImplementationRoutes(
    app,
    controllerProxy<PaperImplementationController>(calls),
    { cutoverCommitted: true },
  );

  await assertLegacyCommandsAreClosed(app, [
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/drafts',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/work-order-1/admit',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/work-order-1/harness-runs',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/work-order-1/live-experiment-runs/submit',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/work-order-1/live-experiment-runs/job-1/sync',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/work-order-1/live-experiment-runs/job-1/collect',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/research-work-orders/work-order-1/live-experiment-runs/job-1/cancel',
    },
    {
      method: 'POST',
      url: '/paper-implementation/projects/project-1/run-monitor-intakes',
    },
  ]);
  assert.equal(calls.count, 0);

  for (const url of [
    '/paper-implementation/projects/project-1/research-work-orders',
    '/paper-implementation/projects/project-1/research-work-orders/work-order-1',
    '/paper-implementation/projects/project-1/research-work-orders/work-order-1/harness-runs',
  ]) {
    const response = await app.inject({ method: 'GET', url });
    assert.equal(response.statusCode, 200, url);
  }
  assert.equal(calls.count, 3);
  await app.close();
});

test('committed cutover closes legacy EF generic, readiness, promotion, and execution mutations while preserving diagnostics', async () => {
  const calls = { count: 0 };
  const app = Fastify({ logger: false });
  await registerExperimentFoundationRoutes(
    app,
    controllerProxy<ExperimentFoundationController>(calls),
    { cutoverCommitted: true },
  );
  await registerExperimentFoundationExecutionRoutes(
    app,
    controllerProxy<ExperimentFoundationExecutionController>(calls),
    { cutoverCommitted: true },
  );

  await assertLegacyCommandsAreClosed(app, [
    { method: 'POST', url: '/experiment-foundation/records' },
    { method: 'PUT', url: '/experiment-foundation/records/dataset_asset/record-1' },
    { method: 'POST', url: '/experiment-foundation/readiness/check' },
    { method: 'POST', url: '/experiment-foundation/candidates/candidate-1/promotion' },
    { method: 'POST', url: '/experiment-foundation/execution/jobs/submit' },
    { method: 'POST', url: '/experiment-foundation/execution/jobs/job-1/sync' },
    { method: 'POST', url: '/experiment-foundation/execution/jobs/job-1/cancel' },
    { method: 'POST', url: '/experiment-foundation/execution/jobs/job-1/collect' },
  ]);
  assert.equal(calls.count, 0);

  for (const url of [
    '/experiment-foundation/records/dataset_asset/record-1',
    '/experiment-foundation/records',
    '/experiment-foundation/readiness/dataset_asset/record-1/latest',
    '/experiment-foundation/readiness',
    '/experiment-foundation/execution/jobs/job-1',
    '/experiment-foundation/execution/jobs',
  ]) {
    const response = await app.inject({ method: 'GET', url });
    assert.equal(response.statusCode, 200, url);
  }
  assert.equal(calls.count, 6);
  await app.close();
});

test('admission enable without a committed cutover fails during app composition', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2AdmissionEnabled: () => true,
      paperImplementationExperimentV2CutoverCommitted: () => false,
    }),
    /PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
});

test('workflow simulation enable without a committed cutover fails during app composition', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2CutoverCommitted: () => false,
      experimentFoundationV2WorkflowSimulationEnabled: () => true,
    }),
    /EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
});

test('exploration attachment requires committed cutover and PI admission', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2ExplorationAttachmentEnabled: () => true,
      paperImplementationExperimentV2AdmissionEnabled: () => true,
      paperImplementationExperimentV2CutoverCommitted: () => false,
    }),
    /PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2ExplorationAttachmentEnabled: () => true,
      paperImplementationExperimentV2AdmissionEnabled: () => false,
      paperImplementationExperimentV2CutoverCommitted: () => true,
    }),
    /PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=true/,
  );
});

test('scientific validation enable without a committed cutover fails during app composition', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2CutoverCommitted: () => false,
      experimentFoundationV2ScientificValidationEnabled: () => true,
    }),
    /EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
});

test('typed promotion enable without a committed cutover fails during app composition', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2CutoverCommitted: () => false,
      experimentFoundationV2PromotionEnabled: () => true,
    }),
    /EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
});

test('exploration spec enable without a committed cutover fails during app composition', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2CutoverCommitted: () => false,
      experimentFoundationV2ExplorationSpecEnabled: () => true,
    }),
    /EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
});

test('Cycle closure enable without a committed cutover fails during app composition', () => {
  assert.throws(
    () => buildApp({
      paperImplementationExperimentV2CutoverCommitted: () => false,
      paperImplementationValidationCycleClosureV2Enabled: () => true,
    }),
    /PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED requires PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true/,
  );
});

test('cutover composition accepts the valid admission and simulation truth-table states', async () => {
  for (const state of [
    { admissionEnabled: false, simulationEnabled: false, cutoverCommitted: false },
    { admissionEnabled: false, simulationEnabled: false, cutoverCommitted: true },
    { admissionEnabled: true, simulationEnabled: false, cutoverCommitted: true },
    { admissionEnabled: false, simulationEnabled: true, cutoverCommitted: true },
    { admissionEnabled: true, simulationEnabled: true, cutoverCommitted: true },
  ]) {
    const app = buildApp({
      paperImplementationExperimentV2AdmissionEnabled: () => state.admissionEnabled,
      paperImplementationExperimentV2CutoverCommitted: () => state.cutoverCommitted,
      paperImplementationValidationCycleClosureV2Enabled: () => false,
      experimentFoundationV2ScientificValidationEnabled: () => false,
      experimentFoundationV2WorkflowSimulationEnabled: () => state.simulationEnabled,
    });
    await app.close();
  }
});

test('unset or blank experiment v2 boolean env values default to false', async () => {
  const snapshot = Object.fromEntries(
    EXPERIMENT_V2_BOOLEAN_ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  try {
    delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED;
    delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED;
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = '   ';
    delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED;
    process.env.EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED = '   ';
    delete process.env.EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED;
    delete process.env.EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED;

    const app = buildApp();
    await app.close();
  } finally {
    restoreExperimentV2BooleanEnv(snapshot);
  }
});

test('experiment v2 boolean env parsing accepts only true or false', async () => {
  const snapshot = Object.fromEntries(
    EXPERIMENT_V2_BOOLEAN_ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  try {
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED = ' TRUE ';
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED = ' TRUE ';
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = 'true';
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED = ' TRUE ';
    process.env.EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED = ' TRUE ';
    process.env.EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED = ' TRUE ';
    process.env.EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED = ' TRUE ';
    const enabledApp = buildApp();
    await enabledApp.close();

    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED = 'false';
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED = 'false';
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = ' FALSE ';
    process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED = 'false';
    process.env.EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED = ' FALSE ';
    process.env.EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED = 'false';
    process.env.EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED = 'false';
    const disabledApp = buildApp();
    await disabledApp.close();

    for (const [key, malformed] of [
      ['PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED', 'on'],
      ['PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED', 'attach'],
      ['PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED', 'definitely'],
      ['PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED', 'yes'],
      ['EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED', 'enabled'],
      ['EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED', '1'],
      ['EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED', 'open'],
    ] as const) {
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED = 'false';
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED = 'false';
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = 'false';
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED = 'false';
      process.env.EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED = 'false';
      process.env.EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED = 'false';
      process.env.EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED = 'false';
      process.env[key] = malformed;

      assert.throws(
        () => buildApp(),
        new RegExp(`${key} must be either true or false when set`),
      );
    }
  } finally {
    restoreExperimentV2BooleanEnv(snapshot);
  }
});

test('cutover remains committed when new v2 admission is disabled for rollback', async () => {
  const app = buildApp({
    paperImplementationExperimentV2AdmissionEnabled: () => false,
    paperImplementationExperimentV2CutoverCommitted: () => true,
  });

  const legacyResponse = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/records',
    payload: {},
  });
  assert.equal(legacyResponse.statusCode, 409);
  assert.equal(
    legacyResponse.json().error.details.reason_code,
    'LEGACY_RECORD_NOT_ELIGIBLE',
  );

  const v2Response = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: {},
  });
  // The v2 route remains present; malformed input is rejected without
  // reopening any legacy writer. Committed saga relay construction is not
  // controlled by either intake flag in app.ts.
  assert.equal(v2Response.statusCode, 400);

  await app.close();
});
