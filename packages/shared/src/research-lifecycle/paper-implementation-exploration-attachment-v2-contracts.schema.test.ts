import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';

import {
  paperImplementationExplorationAttachmentV2ParamsSchema,
  paperImplementationExplorationAttachmentV2RequestSchema,
} from './paper-implementation-exploration-attachment-v2-contracts.js';
import {
  serverHashPaperImplementationExplorationAttachmentCommandV2,
  serverPaperImplementationExplorationAttachmentV2Id,
} from './experiment-v2-canonical-hash.js';

test('exploration attachment accepts only exact public scope and idempotency input', async () => {
  assert.equal(await validates(paperImplementationExplorationAttachmentV2ParamsSchema, {
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    spec_id: 'spec-1',
    spec_revision: 1,
  }), true);
  assert.equal(await validates(paperImplementationExplorationAttachmentV2RequestSchema, {
    branch_key: 'branch-1',
    business_idempotency_key: 'command-1',
  }), true);

  for (const forbidden of [
    'attachment_id',
    'spec_content_hash',
    'work_order_revision_id',
    'admission_id',
    'approved_plan_hash',
    'run_id',
    'result',
  ]) {
    assert.equal(await validates(paperImplementationExplorationAttachmentV2RequestSchema, {
      branch_key: 'branch-1',
      business_idempotency_key: 'command-1',
      [forbidden]: 'caller-authored',
    }), false, forbidden);
  }
});

test('exploration attachment command hashes and server ids are deterministic and domain-separated', () => {
  const command = {
    spec_id: 'spec-1',
    spec_revision: 1,
    spec_revision_id: 'spec-revision-1',
    spec_content_hash: `sha256:${'a'.repeat(64)}`,
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    branch_key: 'branch-1',
  };
  assert.equal(
    serverHashPaperImplementationExplorationAttachmentCommandV2(command),
    serverHashPaperImplementationExplorationAttachmentCommandV2(structuredClone(command)),
  );
  assert.notEqual(
    serverPaperImplementationExplorationAttachmentV2Id('attachment', command),
    serverPaperImplementationExplorationAttachmentV2Id('receipt', command),
  );
});

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
