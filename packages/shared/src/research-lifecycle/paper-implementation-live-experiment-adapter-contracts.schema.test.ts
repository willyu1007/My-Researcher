import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';

import * as liveContracts from './paper-implementation-live-experiment-adapter-contracts.js';
import * as researchLifecycleContracts from './index.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function experimentRef(refType: string, refId: string, versionId: string | null = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
  };
}

async function validateWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload,
  });
  await app.close();
  return response.statusCode;
}

test('paper-implementation live experiment schemas load through direct and aggregate exports', () => {
  assert.ok(liveContracts.submitLiveExperimentRunRequestSchema);
  assert.ok(liveContracts.syncLiveExperimentRunRequestSchema);
  assert.ok(liveContracts.collectLiveExperimentRunRequestSchema);
  assert.ok(liveContracts.cancelLiveExperimentRunRequestSchema);
  assert.ok(
    (liveContracts.paperImplementationLiveExperimentRunResponseSchema.required as readonly string[])
      .includes('terminal_evidence_recorded'),
  );
  assert.ok(researchLifecycleContracts.submitLiveExperimentRunRequestSchema);
});

test('submit live experiment run requires idempotency and accepts source refs', async () => {
  assert.equal(
    await validateWithSchema(
      liveContracts.submitLiveExperimentRunRequestSchema,
      {
        idempotency_key: 'work_order_attempt_001',
        requested_by_ref: experimentRef('paper_implementation_work_order', 'research_work_order_001'),
        source_refs: [experimentRef('paper_implementation_work_order', 'research_work_order_001')],
      },
    ),
    200,
  );

  assert.equal(
    await validateWithSchema(liveContracts.submitLiveExperimentRunRequestSchema, {}),
    400,
  );
});

test('collect and cancel live experiment schemas expose final evidence trace inputs', async () => {
  assert.equal(
    await validateWithSchema(
      liveContracts.collectLiveExperimentRunRequestSchema,
      {
        run_evidence_unit_id: 'run_evidence_unit_001',
        run_evidence_trace_manifest_id: 'trace_manifest_run_evidence_001',
        source_refs: [experimentRef('external_training_job', 'external_training_job_001')],
      },
    ),
    200,
  );
  assert.equal(
    Object.hasOwn(liveContracts.collectLiveExperimentRunRequestSchema.properties, 'accept_partial'),
    false,
  );
  assert.equal(
    await validateWithSchema(
      liveContracts.cancelLiveExperimentRunRequestSchema,
      {
        reason: 'User cancelled the external run.',
        idempotency_key: 'cancel_request_001',
        run_evidence_unit_id: 'run_evidence_unit_cancelled_001',
        run_evidence_trace_manifest_id: 'trace_manifest_cancelled_001',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      liveContracts.cancelLiveExperimentRunRequestSchema,
      {
        idempotency_key: 'cancel_request_001',
      },
    ),
    400,
  );
});
