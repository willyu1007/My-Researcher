import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as paperImplementationContracts from './paper-implementation-contracts.js';
import * as researchLifecycleContracts from './index.js';
import {
  TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS,
  topicSelectionDownstreamTopicFeedbackCreateInputSchema,
} from './topic-selection-v1c-downstream-feedback-recheck-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function functionalRef(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
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

test('paper-implementation schemas load through direct and aggregate exports', () => {
  assert.ok(paperImplementationContracts.bootstrapImplementationProjectRequestSchema);
  assert.ok(paperImplementationContracts.implementationIntakeSnapshotSchema);
  assert.ok(paperImplementationContracts.implementationProjectSchema);
  assert.ok(paperImplementationContracts.createPaperImplementationTopicHandoffRequestSchema);
  assert.ok(paperImplementationContracts.paperImplementationTopicHandoffResponseSchema);
  assert.ok(
    paperImplementationContracts.createPaperImplementationScientificContinuationRequestSchema,
  );
  assert.ok(paperImplementationContracts.paperImplementationScientificContinuationResponseSchema);
  assert.ok(paperImplementationContracts.coreMotiveBootstrapProposalSchema);
  assert.ok(paperImplementationContracts.createPaperImplementationCoreMotiveHandoffRequestSchema);
  assert.ok(paperImplementationContracts.paperImplementationCoreMotiveHandoffResponseSchema);
  assert.ok(
    paperImplementationContracts.createPaperImplementationEvidenceBoardHandoffRequestSchema,
  );
  assert.ok(paperImplementationContracts.paperImplementationEvidenceBoardHandoffResponseSchema);
  assert.ok(paperImplementationContracts.paperImplementationValidationCycleHandoffResponseSchema);
  assert.ok(paperImplementationContracts.recordImplementationFeedbackEventRequestSchema);
  assert.ok(paperImplementationContracts.implementationFeedbackEventSchema);
  assert.ok(researchLifecycleContracts.bootstrapImplementationProjectRequestSchema);
  assert.ok(researchLifecycleContracts.paperImplementationTopicHandoffResponseSchema);
  assert.ok(
    researchLifecycleContracts.paperImplementationScientificContinuationResponseSchema,
  );
  assert.ok(researchLifecycleContracts.paperImplementationCoreMotiveHandoffResponseSchema);
  assert.ok(researchLifecycleContracts.paperImplementationEvidenceBoardHandoffResponseSchema);
  assert.ok(researchLifecycleContracts.paperImplementationValidationCycleHandoffResponseSchema);
  assert.ok(researchLifecycleContracts.implementationProjectSchema);
});

test('Evidence Board handoff accepts one owner root and closes its semantic response', async () => {
  const requestSchema =
    paperImplementationContracts.createPaperImplementationEvidenceBoardHandoffRequestSchema;
  assert.equal(requestSchema.additionalProperties, false);
  assert.deepEqual(Object.keys(requestSchema.properties), ['implementation_project_id']);
  assert.equal(await validateWithSchema(requestSchema, {
    implementation_project_id: 'implementation_project_001',
  }), 200);

  const response = {
    schema_version: 'PaperImplementationEvidenceBoardHandoff@v1',
    status: 'created',
    semantic_stage: 'evidence_board_ready',
    effects: {
      performed: ['citation_context', 'curation_artifact', 'trace_manifests', 'evidence_board'],
      reused: [],
    },
    next_action: {
      action: 'continue_validation_planning',
      description: 'Continue through the validation-planning semantic boundary.',
      requires_human_confirmation: false,
    },
    blocker: null,
    semantic_context: {
      admitted_core_motive: {
        short_name: 'Scoped comparison',
        assertion_count: 1,
        required_assertion_count: 1,
      },
      source_evidence_count: 1,
      evidence_gaps: [],
      board: {
        readiness_status: 'evidence_ready',
        freshness_status: 'fresh',
        support_state: 'partial',
        challenge_status: 'addressed',
        binding_count: 1,
        current_support_summary: 'One traceable source supports the scoped assertion.',
        current_challenge_summary: 'The source limitation remains explicit.',
      },
    },
    lineage: {
      implementation_project_id: 'implementation_project_001',
      intake_snapshot_id: 'intake_snapshot_001',
      motive_id: 'motive_001',
      core_motive_version_id: 'motive_version_001',
      assertion_ids: ['assertion_001'],
      source_evidence_ids: ['evidence_001'],
      source_locator_ids: ['locator_001'],
      citation_candidate_ids: ['citation_001'],
      coordinator_run_id: 'coordinator_run_001',
      curation_runtime_artifact_id: 'runtime_artifact_001',
      board_version_id: 'board_001',
      evidence_binding_ids: ['binding_001'],
      trace_manifest_ids: ['trace_board_001', 'trace_binding_001'],
    },
    resume_policy: 'repeat_same_owner_root_command_and_reuse_persisted_effects',
  };
  assert.equal(await validateWithSchema(
    paperImplementationContracts.paperImplementationEvidenceBoardHandoffResponseSchema,
    response,
  ), 200);
  assert.equal(await validateWithSchema(
    paperImplementationContracts.paperImplementationEvidenceBoardHandoffResponseSchema,
    {
      ...response,
      semantic_context: {
        ...response.semantic_context,
        board: {
          ...response.semantic_context.board,
          binding_count: 0,
        },
      },
    },
  ), 200);
});

test('ValidationCycle handoff accepts one owner root and separates semantic state from lineage', async () => {
  const requestSchema =
    paperImplementationContracts.createPaperImplementationValidationCycleHandoffRequestSchema;
  assert.deepEqual(Object.keys(requestSchema.properties), ['implementation_project_id']);
  assert.equal(await validateWithSchema(requestSchema, {
    implementation_project_id: 'implementation_project_001',
  }), 200);
  assert.equal(await validateWithSchema(requestSchema, {
    implementation_project_id: 'implementation_project_001',
    board_version_id: 'caller_must_not_assign_this',
  }), 200);

  const response = {
    schema_version: 'PaperImplementationValidationCycleHandoff@v1',
    status: 'created',
    semantic_stage: 'validation_cycle_ready',
    effects: {
      performed: ['coordinator_run', 'validation_planning_artifacts', 'trace_manifest', 'validation_cycle'],
      reused: [],
    },
    next_action: {
      action: 'continue_experiment_specification',
      description: 'Continue with experiment specification.',
      requires_human_confirmation: false,
    },
    blocker: null,
    semantic_context: {
      admitted_core_motive: { short_name: 'Scoped route', required_assertion_count: 1 },
      evidence_board: { support_state: 'partial', challenge_status: 'addressed', binding_count: 1 },
      validation_cycle: {
        lifecycle_status: 'admitted',
        cycle_type: 'route_feasibility',
        validation_question: 'Can the bounded route answer the assertion?',
        expected_information_gain: 'high',
        assertion_count: 1,
      },
    },
    lineage: {
      implementation_project_id: 'implementation_project_001',
      intake_snapshot_id: 'intake_snapshot_001',
      motive_id: 'motive_001',
      core_motive_version_id: 'motive_version_001',
      assertion_ids: ['assertion_001'],
      board_version_id: 'board_001',
      evidence_binding_ids: ['binding_001'],
      coordinator_run_id: 'coordinator_run_001',
      validation_planning_runtime_artifact_id: 'runtime_artifact_001',
      selected_candidate_key: 'cycle_candidate_001',
      validation_cycle_id: 'validation_cycle_001',
      validation_input_snapshot_id: 'validation_input_snapshot_001',
      trace_manifest_id: 'trace_manifest_001',
      admission_gate_result_id: 'gate_result_001',
    },
    resume_policy: 'repeat_same_owner_root_command_and_reuse_persisted_effects',
  };
  assert.equal(await validateWithSchema(
    paperImplementationContracts.paperImplementationValidationCycleHandoffResponseSchema,
    response,
  ), 200);
});

function coreMotiveBootstrapProposal() {
  return {
    schema_version: 'CoreMotiveBootstrapProposal@v1',
    motive_contract: {
      short_name: 'Scoped retrieval depth',
      current_solution_insufficiency: 'Current evidence does not isolate retrieval depth.',
      unmet_or_failure_mechanism: 'Depth changes are conflated with other inputs.',
      target_setting: 'One admitted retrieval benchmark.',
      why_this_is_not_trivial: 'The comparison requires controlled inputs.',
      why_existing_baselines_do_not_already_solve_it: 'Reported baselines change multiple factors.',
      what_makes_this_researchable_now: 'The accepted plan fixes the non-treatment inputs.',
    },
    scope_contract: {
      included_scope: ['Admitted benchmark'],
      excluded_scope: ['Other tasks'],
      non_goals: ['Universal generalization'],
      evaluation_scope: 'Compare two admitted cells.',
    },
    falsification_contract: {
      invalidation_conditions: ['No measurable difference under the admitted comparison.'],
      weakening_conditions: ['The effect is smaller than expected.'],
      minimum_evidence_to_continue: ['One controlled comparison.'],
      decisive_negative_conditions: ['The result reverses consistently.'],
    },
    claim_boundary: {
      minimum_defensible_contribution_claim: 'Report the scoped comparison.',
      claim_types_allowed: ['empirical'],
    },
    route_interface: {
      plausible_route_families: ['controlled comparison'],
      disallowed_route_families: ['uncontrolled benchmark sweep'],
      required_route_properties: ['fixed non-treatment inputs'],
      cheapest_validation_route_hint: 'Run two cells.',
    },
    assertions: [{
      assertion_type: 'experimental_answerability',
      assertion_text: 'The scoped question is answerable with two controlled cells.',
      importance: { role: 'core', must_hold_for_motive_to_continue: true },
      validation_requirements: {
        minimum_support_level: 'moderate',
        required_evidence_types: ['literature', 'experiment_result'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['The treatment cannot be isolated.'],
        what_would_weaken_this: ['The metric is too noisy.'],
      },
    }],
  };
}

test('CoreMotive handoff accepts one owner root and proposal remains semantic-only', async () => {
  const requestSchema =
    paperImplementationContracts.createPaperImplementationCoreMotiveHandoffRequestSchema;
  assert.equal(requestSchema.additionalProperties, false);
  assert.deepEqual(Object.keys(requestSchema.properties), ['implementation_project_id']);
  assert.equal(await validateWithSchema(requestSchema, {
    implementation_project_id: 'implementation_project_001',
  }), 200);

  const proposal = coreMotiveBootstrapProposal();
  assert.equal(
    paperImplementationContracts.coreMotiveBootstrapProposalSchema.additionalProperties,
    false,
  );
  assert.equal(
    Object.hasOwn(
      paperImplementationContracts.coreMotiveBootstrapProposalSchema.properties,
      'motive_id',
    ),
    false,
  );
  assert.equal(await validateWithSchema(
    paperImplementationContracts.coreMotiveBootstrapProposalSchema,
    proposal,
  ), 200);
  assert.equal(await validateWithSchema(
    paperImplementationContracts.coreMotiveBootstrapProposalSchema,
    {
      ...proposal,
      assertions: proposal.assertions.map((assertion) => ({
        ...assertion,
        importance: { ...assertion.importance, role: 'supporting' },
      })),
    },
  ), 400);

  assert.equal(await validateWithSchema(
    paperImplementationContracts.paperImplementationCoreMotiveHandoffResponseSchema,
    {
      schema_version: 'PaperImplementationCoreMotiveHandoff@v1',
      status: 'created',
      semantic_stage: 'core_motive_admitted',
      effects: {
        performed: ['proposal_artifact', 'core_motive_draft', 'trace_manifest', 'core_motive_admission'],
        reused: [],
      },
      next_action: {
        action: 'continue_validation_planning',
        description: 'Continue to validation planning.',
        requires_human_confirmation: false,
      },
      blocker: null,
      semantic_context: {
        topic: {
          editable_title: 'Scoped comparison',
          problem_statement: 'One scoped problem.',
          contribution_summary: 'One bounded contribution.',
          evaluation_plan: 'Run one comparison.',
          initial_planning_notes: [],
          claim_ceiling: 'Only claim the scoped comparison.',
          prohibited_claims: ['No universal claim.'],
          conditions: [],
          accepted_risk_refs: [],
          early_check_obligations: [],
          source_lineage_summary: {},
        },
        admitted_core_motive: {
          short_name: 'Scoped comparison',
          motivation_claim: 'One bounded contribution.',
          problem_pressure: 'One scoped problem.',
          expected_contribution_path: 'One bounded contribution.',
          maximum_allowed_claim: 'Only claim the scoped comparison.',
          forbidden_overclaims: ['No universal claim.'],
          assertion_count: 1,
        },
      },
      lineage: {
        implementation_project_id: 'implementation_project_001',
        intake_snapshot_id: 'intake_snapshot_001',
        proposal_runtime_artifact_id: 'runtime_artifact_001',
        motive_id: 'motive_001',
        core_motive_version_id: 'motive_version_001',
        assertion_ids: ['assertion_001'],
        trace_manifest_id: 'trace_manifest_001',
        admission_gate_result_id: 'admission_gate_001',
      },
      resume_policy: 'repeat_same_owner_root_command_and_reuse_persisted_effects',
    },
  ), 200);
});

test('scientific continuation accepts only one owner-root input', async () => {
  const schema =
    paperImplementationContracts.createPaperImplementationScientificContinuationRequestSchema;
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties), ['implementation_project_id']);
  assert.equal(
    await validateWithSchema(schema, {
      implementation_project_id: 'implementation_project_001',
    }),
    200,
  );
  assert.equal(await validateWithSchema(schema, {}), 400);
});

test('scientific continuation response separates stage, action, blocker, and lineage', async () => {
  const response = {
    schema_version:
      paperImplementationContracts.PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_SCHEMA_VERSION,
    status: 'waiting_for_paid_execution_authorization',
    semantic_stage: 'paid_execution',
    effects: {
      performed: [],
      reused: ['experiment_work_order', 'experiment_run'],
      llm_lane_id: null,
    },
    next_action: {
      action: 'authorize_paid_execution',
      description: 'Authorize one real-provider execution through the existing execution API.',
      requires_paid_authorization: true,
      requires_human_confirmation: false,
    },
    blocker: null,
    lineage: {
      implementation_project_id: 'implementation_project_001',
      coordinator_run_id: null,
      validation_cycle_id: 'validation_cycle_001',
      experiment_branch_id: 'experiment_branch_001',
      experiment_work_order_revision_id: 'work_order_revision_001',
      experiment_run_id: 'run_001',
      scientific_result_id: null,
      scientific_validation_report_id: null,
      closure_id: null,
      result_packet_id: null,
      claim_id: null,
      dossier_id: null,
    },
    resume_policy:
      paperImplementationContracts.PAPER_IMPLEMENTATION_SCIENTIFIC_CONTINUATION_RESUME_POLICY,
  };
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.paperImplementationScientificContinuationResponseSchema,
      response,
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.paperImplementationScientificContinuationResponseSchema,
      {
        ...response,
        effects: {
          ...response.effects,
          llm_lane_id: ['motive', 'validation-planning'],
        },
      },
    ),
    400,
  );
});

test('bootstrap implementation project request validates required bridge fields', async () => {
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.bootstrapImplementationProjectRequestSchema,
      {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_hash_001',
        workspace_id: 'workspace_001',
        created_by: 'hybrid',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.bootstrapImplementationProjectRequestSchema,
      {
        paper_project_bridge_id: 'paper_project_bridge_001',
      },
    ),
    400,
  );
});

test('topic handoff requires the single bridge-id input', async () => {
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.createPaperImplementationTopicHandoffRequestSchema,
      { paper_project_bridge_id: 'paper_project_bridge_001' },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.createPaperImplementationTopicHandoffRequestSchema,
      {},
    ),
    400,
  );
});

test('topic handoff response keeps semantic context separate from owner lineage', async () => {
  const response = {
    schema_version: paperImplementationContracts.PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION,
    status: 'resumed',
    effects: {
      paper_project_created: false,
      implementation_project_created: false,
    },
    semantic_context: {
      editable_title: 'Working paper title',
      problem_statement: 'Evaluate one bounded research question.',
      contribution_summary: 'Provide one traceable result.',
      evaluation_plan: 'Run the admitted comparison.',
      initial_planning_notes: ['Preserve the fixed setup.'],
      claim_ceiling: 'Claim only the admitted comparison.',
      prohibited_claims: ['Do not generalize beyond the benchmark.'],
      conditions: [],
      accepted_risk_refs: [],
      early_check_obligations: [],
      source_lineage_summary: {},
    },
    lineage: {
      paper_project_bridge_ref: functionalRef('paper_project_bridge', 'paper_project_bridge_001'),
      title_card_id: 'title_card_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      paper_project_intake_ref: functionalRef('paper_project_intake', 'paper_project_intake_001'),
      paper_project_ref: functionalRef('paper_project', 'P001'),
      implementation_project_id: 'implementation_project_001',
      implementation_intake_snapshot_id: 'implementation_intake_snapshot_001',
    },
    resume_policy: paperImplementationContracts.PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY,
  };
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.paperImplementationTopicHandoffResponseSchema,
      response,
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.paperImplementationTopicHandoffResponseSchema,
      {
        ...response,
        lineage: {
          paper_project_bridge_ref: response.lineage.paper_project_bridge_ref,
          title_card_id: response.lineage.title_card_id,
          topic_package_id: response.lineage.topic_package_id,
          package_version: response.lineage.package_version,
          paper_project_intake_ref: response.lineage.paper_project_intake_ref,
          paper_project_ref: response.lineage.paper_project_ref,
          implementation_intake_snapshot_id:
            response.lineage.implementation_intake_snapshot_id,
        },
      },
    ),
    400,
  );
});

test('implementation feedback request validates event type and severity', async () => {
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.recordImplementationFeedbackEventRequestSchema,
      {
        feedback_type: 'infeasible_route',
        severity: 'blocking',
        summary: 'The admitted route cannot be executed under the current dataset constraints.',
        source_object_refs: [functionalRef('implementation_project', 'implementation_project_001')],
        recommended_upstream_action: 'recheck_topic_selection',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.recordImplementationFeedbackEventRequestSchema,
      {
        feedback_type: 'paper_project_drift',
        severity: 'blocking',
        summary: 'Invalid feedback type.',
      },
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.recordImplementationFeedbackEventRequestSchema,
      {
        feedback_type: 'infeasible_route',
        severity: 'fatal',
        summary: 'Invalid severity.',
      },
    ),
    400,
  );
});

test('topic-selection downstream feedback accepts paper_implementation source kind', async () => {
  assert.ok(TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS.includes('paper_implementation'));
  assert.equal(
    await validateWithSchema(
      topicSelectionDownstreamTopicFeedbackCreateInputSchema,
      {
        paper_project_bridge_id: 'paper_project_bridge_001',
        downstream_source_kind: 'paper_implementation',
        downstream_source_ref: functionalRef('implementation_feedback_event', 'feedback_event_001'),
        feedback_signal: 'unanswerable_question',
        severity: 'blocking',
        summary: 'Implementation found the promoted question is not answerable.',
      },
    ),
    200,
  );
});
