import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as humanConfirmationContracts from './paper-implementation-human-confirmation-contracts.js';
import * as researchLifecycleContracts from './index.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function functionalRef(refType: string, refId: string, versionId: string | null = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

async function validateWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify({
    ajv: {
      customOptions: {
        allErrors: true,
        removeAdditional: false,
      },
    },
  });
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

function validRecord() {
  return {
    confirmation_record_id: 'human_confirmation_001',
    implementation_project_id: 'implementation_project_001',
    confirmation_scope: 'strong_claim_acceptance',
    target_refs: [functionalRef('claim_candidate', 'claim_candidate_001')],
    reviewed_sources: [
      {
        source_ref: functionalRef('result_interpretation_packet', 'packet_001'),
        source_hash: 'hash_001',
      },
    ],
    transition_attempt_ref: null,
    gate_result_refs: [functionalRef('implementation_gate_result', 'gate_result_001')],
    rationale: 'Reviewed run evidence and claim boundary before accepting the strong claim.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: 'policy_v1',
    status: 'active',
    status_reason: null,
    created_at: '2026-07-10T10:00:00.000Z',
    updated_at: null,
  };
}

test('paper-implementation human confirmation schemas load through direct and aggregate exports', () => {
  assert.ok(humanConfirmationContracts.humanConfirmationRecordSchema);
  assert.ok(humanConfirmationContracts.createHumanConfirmationRecordRequestSchema);
  assert.ok(researchLifecycleContracts.humanConfirmationRecordSchema);
  assert.ok(researchLifecycleContracts.createHumanConfirmationRecordRequestSchema);
});

test('HumanConfirmationRecord schema accepts a complete record', async () => {
  assert.equal(
    await validateWithSchema(humanConfirmationContracts.humanConfirmationRecordSchema, validRecord()),
    200,
  );
});

test('HumanConfirmationRecord schema rejects unknown scope, empty targets, and unknown keys', async () => {
  assert.equal(
    await validateWithSchema(humanConfirmationContracts.humanConfirmationRecordSchema, {
      ...validRecord(),
      confirmation_scope: 'anything_goes',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(humanConfirmationContracts.humanConfirmationRecordSchema, {
      ...validRecord(),
      target_refs: [],
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(humanConfirmationContracts.humanConfirmationRecordSchema, {
      ...validRecord(),
      llm_generated: true,
    }),
    400,
  );
});

test('CreateHumanConfirmationRecordRequest requires scope, targets, rationale, and actor type', async () => {
  const schema = humanConfirmationContracts.createHumanConfirmationRecordRequestSchema;
  assert.equal(
    await validateWithSchema(schema, {
      confirmation_scope: 'motive_portfolio_decision',
      target_refs: [functionalRef('motive_portfolio_decision', 'portfolio_decision_001')],
      rationale: 'Reviewed merge impact across boards.',
      confirmed_by_actor_type: 'human',
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(schema, {
      confirmation_scope: 'motive_portfolio_decision',
      target_refs: [functionalRef('motive_portfolio_decision', 'portfolio_decision_001')],
      confirmed_by_actor_type: 'human',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, {
      confirmation_scope: 'motive_portfolio_decision',
      target_refs: [],
      rationale: 'Reviewed merge impact across boards.',
      confirmed_by_actor_type: 'human',
    }),
    400,
  );
});
