import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as validationContracts from './paper-implementation-validation-contracts.js';
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

function validCriteria() {
  return {
    pass_conditions: ['The route can answer the scoped assertion.'],
    fail_conditions: ['The route cannot isolate the failure mechanism.'],
    inconclusive_conditions: ['The evidence remains ambiguous after the probe.'],
    stop_conditions: ['Stop after one failed data feasibility check.'],
    minimum_artifacts_required: ['Trace-ready probe note.'],
  };
}

function validBudget() {
  return {
    budget_id: 'validation_budget_001',
    max_runtime: 'PT4H',
    max_compute: 'local_cpu',
    max_human_review_count: 1,
    retry_budget: 0,
  };
}

function validCycleDraftPayload() {
  return {
    target: {
      target_type: 'core_motive_version',
      target_id: 'core_motive_version_001',
      target_version_id: 'v1',
    },
    trigger: {
      trigger_type: 'board_gap',
      trigger_refs: [functionalRef('motive_evidence_board_version', 'board_version_001', 'v1')],
    },
    cycle_type: 'route_feasibility',
    validation_frame: {
      validation_question: 'Can the cheapest feasible route answer the failure mechanism assertion?',
      assumptions_under_test: ['The route can isolate synthesis-level failures.'],
      assertions_under_test: [functionalRef('motive_assertion', 'assertion_001')],
      decision_if_pass: 'Admit a route candidate for work-order planning.',
      decision_if_fail: 'Create upstream feedback or park the motive.',
      decision_if_inconclusive: 'Request a narrower feasibility probe.',
      expected_information_gain: 'medium',
      why_this_cycle_now: 'The admitted board has a route gap.',
    },
    criteria: validCriteria(),
    budget: validBudget(),
  };
}

test('paper-implementation validation schemas load through direct and aggregate exports', () => {
  assert.ok(validationContracts.createValidationCycleDraftRequestSchema);
  assert.ok(validationContracts.createTechnicalRouteCandidateRequestSchema);
  assert.ok(validationContracts.createFeasibilityProbeRequestSchema);
  assert.ok(validationContracts.createExperimentPlanLightRequestSchema);
  assert.ok(validationContracts.validationUpstreamFeedbackCandidateSchema);
  assert.ok(researchLifecycleContracts.createValidationCycleDraftRequestSchema);
  assert.ok(researchLifecycleContracts.validationCycleSchema);
});

test('legacy ValidationCycle write contracts expose no caller-authored conclusion fields while reads preserve them', async () => {
  const writeProperties = validationContracts.completeValidationCycleRequestSchema.properties;
  for (const field of [
    'lifecycle_status',
    'execution_status',
    'outputs',
    'cycle_assessment',
    'decision_exit',
  ]) {
    assert.equal(Object.hasOwn(writeProperties, field), false);
  }
  assert.equal(
    Object.hasOwn(
      validationContracts.createValidationCycleDraftRequestSchema.properties,
      'decision_exit',
    ),
    false,
  );
  assert.equal(
    Object.hasOwn(validationContracts.admitValidationCycleRequestSchema.properties, 'decision_exit'),
    false,
  );
  assert.equal(
    await validateWithSchema(validationContracts.completeValidationCycleRequestSchema, {}),
    200,
  );
  assert.equal(
    Object.hasOwn(validationContracts.validationCycleSchema.properties, 'cycle_assessment'),
    true,
  );
  assert.equal(
    Object.hasOwn(validationContracts.validationCycleSchema.properties, 'decision_exit'),
    true,
  );
  assert.equal(
    Object.hasOwn(validationContracts.validationCycleSchema.properties, 'outputs'),
    true,
  );
});

test('validation cycle draft requires input target frame criteria budget stop conditions and exits', async () => {
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      validCycleDraftPayload(),
    ),
    200,
  );
  const missingTarget = validCycleDraftPayload();
  delete (missingTarget as Record<string, unknown>).target;
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      missingTarget,
    ),
    400,
  );
  const missingFailExit = validCycleDraftPayload();
  delete (missingFailExit.validation_frame as Record<string, unknown>).decision_if_fail;
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      missingFailExit,
    ),
    400,
  );
  const missingStop = validCycleDraftPayload();
  delete (missingStop.criteria as Record<string, unknown>).stop_conditions;
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      missingStop,
    ),
    400,
  );
  const missingBudget = validCycleDraftPayload();
  delete (missingBudget as Record<string, unknown>).budget;
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      missingBudget,
    ),
    400,
  );
});

test('expected_information_gain none requires explicit human-confirmed override', async () => {
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      {
        ...validCycleDraftPayload(),
        validation_frame: {
          ...validCycleDraftPayload().validation_frame,
          expected_information_gain: 'none',
        },
      },
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      {
        ...validCycleDraftPayload(),
        validation_frame: {
          ...validCycleDraftPayload().validation_frame,
          expected_information_gain: 'none',
        },
        human_override_expected_information_gain_none: true,
        confirmation_level: 'human_confirmed',
      },
    ),
    200,
  );
});

test('route probe and experiment plan schemas expose queryable refs and run mode markers', async () => {
  const metricRef = functionalRef('metric', 'metric_001');
  assert.equal(
    await validateWithSchema(
      validationContracts.createTechnicalRouteCandidateRequestSchema,
      {
        core_motive_version_id: 'core_motive_version_001',
        route_summary: 'Use a low-cost evidence synthesis probe.',
        expected_information_gain: 'medium',
        baseline_gap_status: 'not_applicable',
        primary_metric_refs: [metricRef],
        secondary_metric_refs: [],
        dataset_version_refs: [],
        baseline_version_refs: [],
        code_version_refs: [],
        config_refs: [],
        confirmatory_marker: false,
        trace_manifest_id: 'trace_manifest_001',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createFeasibilityProbeRequestSchema,
      {
        probe_kind: 'data_feasibility',
        probe_question: 'Is the scoped dataset locally available?',
        expected_information_gain: 'low',
        primary_metric_refs: [metricRef],
        trace_manifest_id: 'trace_manifest_002',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createExperimentPlanLightRequestSchema,
      {
        run_mode: 'confirmatory',
        plan_summary: 'Compare against the locked baseline on the scoped dataset.',
        estimated_cost_class: 'high',
        baseline_gap_status: 'resolved',
        primary_metric_refs: [metricRef],
        dataset_version_refs: [functionalRef('dataset_version', 'dataset_version_001')],
        code_version_refs: [functionalRef('code_version', 'code_version_001')],
        config_refs: [functionalRef('config', 'config_001')],
        confirmatory_marker: true,
        budget_id: 'validation_budget_001',
        stop_condition_refs: [functionalRef('stop_rule', 'stop_rule_001')],
        trace_manifest_id: 'trace_manifest_003',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createExperimentPlanLightRequestSchema,
      {
        run_mode: 'execute_now',
        plan_summary: 'Invalid because T-095 is planning-only.',
        estimated_cost_class: 'high',
        baseline_gap_status: 'resolved',
        primary_metric_refs: [metricRef],
        dataset_version_refs: [functionalRef('dataset_version', 'dataset_version_001')],
        code_version_refs: [functionalRef('code_version', 'code_version_001')],
        config_refs: [functionalRef('config', 'config_001')],
        budget_id: 'validation_budget_001',
        stop_condition_refs: [functionalRef('stop_rule', 'stop_rule_001')],
        trace_manifest_id: 'trace_manifest_003',
      },
    ),
    400,
  );
});

test('validation planning create requests accept optional acceptance-bridge lineage and reject malformed lineage', async () => {
  const lineageRef = functionalRef('paper_implementation_runtime_artifact', 'runtime_artifact_001');
  const lineageHash = 'a'.repeat(64);
  const routePayload = {
    core_motive_version_id: 'core_motive_version_001',
    route_summary: 'Route seeded from an admitted runtime proposal.',
    expected_information_gain: 'medium',
    primary_metric_refs: [functionalRef('metric', 'metric_001')],
    trace_manifest_id: 'trace_manifest_001',
  };
  assert.equal(
    await validateWithSchema(
      validationContracts.createTechnicalRouteCandidateRequestSchema,
      {
        ...routePayload,
        source_proposal_artifact_ref: lineageRef,
        source_proposal_artifact_hash: lineageHash,
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createValidationCycleDraftRequestSchema,
      {
        ...validCycleDraftPayload(),
        source_proposal_artifact_ref: lineageRef,
        source_proposal_artifact_hash: lineageHash,
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createFeasibilityProbeRequestSchema,
      {
        probe_kind: 'data_feasibility',
        probe_question: 'Is the scoped dataset locally available?',
        expected_information_gain: 'low',
        trace_manifest_id: 'trace_manifest_002',
        source_proposal_artifact_ref: null,
        source_proposal_artifact_hash: null,
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createTechnicalRouteCandidateRequestSchema,
      {
        ...routePayload,
        source_proposal_artifact_ref: 'runtime_artifact_001',
        source_proposal_artifact_hash: lineageHash,
      },
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      validationContracts.createFeasibilityProbeRequestSchema,
      {
        probe_kind: 'data_feasibility',
        probe_question: 'Is the scoped dataset locally available?',
        expected_information_gain: 'low',
        trace_manifest_id: 'trace_manifest_002',
        source_proposal_artifact_ref: lineageRef,
        source_proposal_artifact_hash: { nested: 'not-a-hash' },
      },
    ),
    400,
  );
});
