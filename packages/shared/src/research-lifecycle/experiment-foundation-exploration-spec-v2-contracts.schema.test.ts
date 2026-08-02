import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

import {
  experimentFoundationExplorationSpecV2CreateRevisionRequestSchema,
  experimentFoundationExplorationSpecV2ParamsSchema,
  type ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
} from './experiment-foundation-exploration-spec-v2-contracts.js';
import {
  serverExperimentFoundationExplorationSpecV2Id,
  serverHashExperimentFoundationExplorationSpecCommandV2,
  serverHashExperimentFoundationExplorationSpecV2,
} from './experiment-v2-canonical-hash.js';

const HASH_A = `sha256:${'a'.repeat(64)}`;

test('exploration spec request accepts only immutable authoring content and public CAS input', async () => {
  assert.equal(await validates(experimentFoundationExplorationSpecV2ParamsSchema, {
    logical_id: 'exploration-spec-001',
  }), true);
  assert.equal(await validates(
    experimentFoundationExplorationSpecV2CreateRevisionRequestSchema,
    request(),
  ), true);

  for (const forbidden of [
    'spec_id',
    'revision_id',
    'content_hash',
    'run_id',
    'result',
    'scientific_validation',
    'evidence_candidate',
  ]) {
    assert.equal(await validates(
      experimentFoundationExplorationSpecV2CreateRevisionRequestSchema,
      { ...request(), [forbidden]: 'caller-authored' },
    ), false, forbidden);
  }
});

test('exploration spec content, commands and ids are deterministic and drift-sensitive', () => {
  const content = request().specification;
  const contentHash = serverHashExperimentFoundationExplorationSpecV2(content);
  assert.equal(contentHash, serverHashExperimentFoundationExplorationSpecV2(structuredClone(content)));
  assert.notEqual(contentHash, serverHashExperimentFoundationExplorationSpecV2({
    ...content,
    proposed_branch_frame: {
      ...content.proposed_branch_frame,
      scientific_intent: 'changed intent',
    },
  }));

  const command = {
    logical_id: 'exploration-spec-001',
    expected_state_version: 0,
    spec_content_hash: contentHash,
  };
  assert.equal(
    serverHashExperimentFoundationExplorationSpecCommandV2(command),
    serverHashExperimentFoundationExplorationSpecCommandV2({ ...command }),
  );
  assert.notEqual(
    serverExperimentFoundationExplorationSpecV2Id('spec', command),
    serverExperimentFoundationExplorationSpecV2Id('revision', command),
  );
});

function request(): ExperimentFoundationExplorationSpecV2CreateRevisionRequest {
  return {
    expected_state_version: 0,
    business_idempotency_key: 'exploration-spec-key-001',
    specification: {
      schema_version: 'v1',
      proposed_branch_frame: {
        frame_schema_version: 'v1',
        display_name: 'Exploration branch',
        scientific_intent: 'Test a typed exploration hypothesis.',
        comparison_role: 'primary',
        parent_branch_key: null,
      },
      work_order_revision: {
        work_order_schema_version: 'v1',
        title: 'Exploration work order',
        objective: 'Measure the proposed effect.',
        readiness_attestation_id: 'readiness-001',
        readiness_attestation_hash: HASH_A,
        asset_dependencies: [assetRef('DataPolicy', 'policy-001')],
        run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
      },
      exact_cells: [{
        cell_key: 'cell-001',
        seed: 7,
        repeat_index: 0,
        parameters: [{ name: 'learning_rate', value: 0.001 }],
        required_result_contract: { metrics: [], artifacts: [] },
      }],
    },
  };
}

function assetRef(assetType: 'DataPolicy', logicalId: string) {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: `${logicalId}-revision-001`,
    revision_sequence: 1,
    content_hash: HASH_A,
  };
}

type JsonSchema = Record<string, unknown>;

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({ method: 'POST', url: '/validate', payload: payload as object });
  await app.close();
  return response.statusCode === 200;
}
