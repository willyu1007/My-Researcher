import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as coordinatorContracts from './paper-implementation-coordinator-contracts.js';
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

function validDecisionRecord() {
  return {
    policy_id: coordinatorContracts.PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID,
    policy_version: coordinatorContracts.PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION,
    inputs_hash: 'a'.repeat(64),
    candidate_projections: [
      {
        candidate_key: 'exploratory_route_candidate',
        expected_information_gain: 'high',
        blocker_codes: [],
      },
      {
        candidate_key: 'confirmatory_route_candidate',
        expected_information_gain: null,
        blocker_codes: ['ROUTE_BLOCKED'],
      },
    ],
    selected_candidate_key: 'exploratory_route_candidate',
    rationale_codes: ['blocked_candidates_excluded', 'max_expected_information_gain'],
  };
}

function validRun() {
  return {
    schema_version: coordinatorContracts.PAPER_IMPLEMENTATION_COORDINATOR_RUN_SCHEMA_VERSION,
    coordinator_run_id: 'coordinator_run_001',
    implementation_project_id: 'implementation_project_001',
    lane_id: 'validation-planning',
    run_status: 'advancing',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: null,
    model_option_id: null,
    budget_envelope: { max_steps: 8, max_provider_calls: 16 },
    consumed: { steps: 2, provider_calls: 0 },
    lease: {
      holder_id: 'advance_holder_001',
      heartbeat_at: '2026-07-11T10:00:00.000Z',
      expires_at: '2026-07-11T10:01:00.000Z',
    },
    slot_request_payloads: {
      'route_architecture.route_candidates': { target_version_id: 'v1' },
    },
    created_at: '2026-07-11T10:00:00.000Z',
    updated_at: '2026-07-11T10:00:00.000Z',
  };
}

function validStep() {
  return {
    schema_version: coordinatorContracts.PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION,
    coordinator_step_id: 'coordinator_step_001',
    coordinator_run_id: 'coordinator_run_001',
    implementation_project_id: 'implementation_project_001',
    step_index: 0,
    slot_id: 'route_architecture.route_candidates',
    node_attempt_id: 'coordinator_run_001.step-0.attempt-0',
    runtime_artifact_ref: functionalRef('route_architecture_runtime_artifact', 'artifact_001'),
    runtime_artifact_hash: 'b'.repeat(64),
    admission_ref: functionalRef('paper_implementation_runtime_admission_record', 'admission_001'),
    decision_record: validDecisionRecord(),
    outcome: 'passed',
    provider_call_count: 0,
    blocker_codes: [],
    created_at: '2026-07-11T10:00:00.000Z',
  };
}

function validCreateRequest() {
  return {
    coordinator_run_id: 'coordinator_run_001',
    lane_id: 'motive',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: null,
    model_option_id: null,
    budget_envelope: { max_steps: 4, max_provider_calls: 8 },
    slot_request_payloads: {
      'motive_decomposition.draft_assertion_candidates': { decomposition_mode: 'decompose_existing_assertions' },
      'motive_evolution.evolution_decision_support': { target_version_id: 'v1' },
    },
  };
}

test('paper-implementation coordinator schemas load through direct and aggregate exports', () => {
  assert.ok(coordinatorContracts.paperImplementationCoordinatorRunSchema);
  assert.ok(coordinatorContracts.paperImplementationCoordinatorStepSchema);
  assert.ok(coordinatorContracts.paperImplementationCandidateSelectionDecisionRecordSchema);
  assert.ok(coordinatorContracts.createPaperImplementationCoordinatorRunRequestSchema);
  assert.ok(coordinatorContracts.advancePaperImplementationCoordinatorRunRequestSchema);
  assert.ok(researchLifecycleContracts.paperImplementationCoordinatorRunSchema);
  assert.ok(researchLifecycleContracts.createPaperImplementationCoordinatorRunRequestSchema);
});

test('PaperImplementationCoordinatorRun schema accepts a complete run and rejects drift', async () => {
  const schema = coordinatorContracts.paperImplementationCoordinatorRunSchema;
  assert.equal(await validateWithSchema(schema, validRun()), 200);
  assert.equal(
    await validateWithSchema(schema, { ...validRun(), lease: null, run_status: 'completed' }),
    200,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validRun(), run_status: 'paused' }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validRun(), lane_id: 'anything-goes' }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validRun(), budget_envelope: { max_steps: 0, max_provider_calls: 1 } }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validRun(), authority_mutation: true }),
    400,
  );
  const { lease: _lease, ...withoutLease } = validRun();
  assert.equal(await validateWithSchema(schema, withoutLease), 400);
});

test('PaperImplementationCoordinatorStep schema accepts records and rejects unknown outcomes', async () => {
  const schema = coordinatorContracts.paperImplementationCoordinatorStepSchema;
  assert.equal(await validateWithSchema(schema, validStep()), 200);
  assert.equal(
    await validateWithSchema(schema, {
      ...validStep(),
      runtime_artifact_ref: null,
      runtime_artifact_hash: null,
      runtime_artifact_id: null,
      admission_ref: null,
      decision_record: null,
      outcome: 'blocked',
      blocker_codes: ['UPSTREAM_BLOCKED'],
    }),
    200,
  );
  // F4: the admitted final artifact id is an optional nullable projection
  // (steps persisted before the field existed omit it).
  assert.equal(
    await validateWithSchema(schema, { ...validStep(), runtime_artifact_id: 'runtime_artifact_001' }),
    200,
  );
  assert.equal(await validateWithSchema(schema, { ...validStep(), runtime_artifact_id: {} }), 400);
  assert.equal(await validateWithSchema(schema, { ...validStep(), outcome: 'succeeded' }), 400);
  assert.equal(await validateWithSchema(schema, { ...validStep(), step_index: -1 }), 400);
  assert.equal(await validateWithSchema(schema, { ...validStep(), raw_provider_response: {} }), 400);
});

test('CandidateSelectionPolicy@v1 decision record schema pins policy identity', async () => {
  const schema = coordinatorContracts.paperImplementationCandidateSelectionDecisionRecordSchema;
  assert.equal(await validateWithSchema(schema, validDecisionRecord()), 200);
  assert.equal(
    await validateWithSchema(schema, { ...validDecisionRecord(), selected_candidate_key: null, rationale_codes: ['no_eligible_candidate'] }),
    200,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validDecisionRecord(), policy_id: 'someone-else' }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validDecisionRecord(), policy_version: 'v2' }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validDecisionRecord(), rationale_codes: ['vibes'] }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, {
      ...validDecisionRecord(),
      candidate_projections: [{ candidate_key: 'k', expected_information_gain: 'extreme', blocker_codes: [] }],
    }),
    400,
  );
});

test('CreatePaperImplementationCoordinatorRunRequest requires lane, modes, budget, and payloads', async () => {
  const schema = coordinatorContracts.createPaperImplementationCoordinatorRunRequestSchema;
  assert.equal(await validateWithSchema(schema, validCreateRequest()), 200);
  const { budget_envelope: _budget, ...withoutBudget } = validCreateRequest();
  assert.equal(await validateWithSchema(schema, withoutBudget), 400);
  const { slot_request_payloads: _payloads, ...withoutPayloads } = validCreateRequest();
  assert.equal(await validateWithSchema(schema, withoutPayloads), 400);
  assert.equal(
    await validateWithSchema(schema, { ...validCreateRequest(), lane_id: 'freeform-lane' }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, {
      ...validCreateRequest(),
      slot_request_payloads: { 'motive_decomposition.draft_assertion_candidates': 'not-an-object' },
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { ...validCreateRequest(), pipeline_dsl: [] }),
    400,
  );
});

test('AdvancePaperImplementationCoordinatorRunRequest accepts empty body object and overrides', async () => {
  const schema = coordinatorContracts.advancePaperImplementationCoordinatorRunRequestSchema;
  assert.equal(await validateWithSchema(schema, {}), 200);
  assert.equal(
    await validateWithSchema(schema, {
      holder_id: 'advance_holder_002',
      slot_request_payload_overrides: {
        'route_skeptic_review.route_risk_critique': { preflight_blocker_codes: [] },
      },
    }),
    200,
  );
  assert.equal(await validateWithSchema(schema, { force: true }), 400);
});

test('AdvancePaperImplementationCoordinatorRunRequest accepts increase-only budget raises', async () => {
  const schema = coordinatorContracts.advancePaperImplementationCoordinatorRunRequestSchema;
  assert.equal(
    await validateWithSchema(schema, { raise_budget_envelope: { max_steps: 8 } }),
    200,
  );
  assert.equal(
    await validateWithSchema(schema, { raise_budget_envelope: { max_steps: 8, max_provider_calls: 32 } }),
    200,
  );
  assert.equal(await validateWithSchema(schema, { raise_budget_envelope: null }), 200);
  assert.equal(await validateWithSchema(schema, { raise_budget_envelope: {} }), 200);
  assert.equal(
    await validateWithSchema(schema, { raise_budget_envelope: { max_steps: 0 } }),
    400,
  );
  assert.equal(
    await validateWithSchema(schema, { raise_budget_envelope: { shrink_steps: 1 } }),
    400,
  );
});
