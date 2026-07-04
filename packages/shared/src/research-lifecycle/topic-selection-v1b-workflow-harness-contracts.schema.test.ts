import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_KINDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE,
  N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  topicSelectionV1bN1HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN2HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN3HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN4HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN5HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN6HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN6LoopbackTriageSupportPayloadSchema,
  topicSelectionV1bN7HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN8HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN9HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN10HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN11HarnessFrozenInputPayloadSchema,
  topicSelectionV1bN8ToN7FeedbackPayloadSchema,
  topicSelectionV1bCandidateGroupingSupportPayloadSchema,
  topicSelectionV1bN8DebateAdmissionReviewSupportPayloadSchema,
  topicSelectionV1bN8FailedTrialSynthesisSupportPayloadSchema,
  topicSelectionV1bAcceptedSliceSelectionPayloadSchema,
  topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema,
  topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema,
  topicSelectionV1bTopicValueAssessmentDraftPayloadSchema,
  topicSelectionV1bN6RuntimeContextProjectionSchema,
  topicSelectionV1bN7RuntimeContextProjectionSchema,
  topicSelectionLoopbackBudgetRaiseSchema,
  topicSelectionStakeholderSignOffSchema,
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bN1HarnessFrozenInputPayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN6LoopbackTriageSupportPayload,
  type TopicSelectionV1bN6RuntimeContextProjection,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bN7RuntimeContextProjection,
  type TopicSelectionV1bN7ToN8HandoffPayload,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bN9HarnessFrozenInputPayload,
  type TopicSelectionV1bN10HarnessFrozenInputPayload,
  type TopicSelectionV1bN11HarnessFrozenInputPayload,
  type TopicSelectionV1bN8ToN7FeedbackPayload,
  type TopicSelectionV1bCandidateGroupingSupportPayload,
  type TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  type TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  topicSelectionV1bWorkflowHarnessHandoffSchema,
  topicSelectionV1bWorkflowHarnessNodePolicyRegistrySchema,
  topicSelectionV1bWorkflowHarnessRunRequestSchema,
  topicSelectionV1bWorkflowHarnessRunResultSchema,
  topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema,
  topicSelectionV1bWorkflowHarnessV1cPublicationHandoffSchema,
  type TopicSelectionV1bWorkflowHarnessHandoff,
  type TopicSelectionV1bWorkflowHarnessHandoffKind,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from './topic-selection-v1b-workflow-harness-contracts.js';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from './topic-selection-v1b-value-assessment-contracts.js';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const HASH_D = 'd'.repeat(64);
const HASH_E = 'e'.repeat(64);
const HASH_F = 'f'.repeat(64);

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

function canonicalRequest(): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_v1b_001',
    node_attempt_id: 'node_attempt_v1b_001',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    frozen_input: {
      input_contract: 'N3ToN4Handoff@v1',
      snapshot_kind: 'v1b_intake_readiness_assessment',
      source_refs: [
        {
          ref_type: 'v1b_intake_readiness_assessment',
          ref_id: 'readiness_001',
          title_card_id: 'title_card_001',
        },
      ],
      payload: {
        readiness_assessment_id: 'readiness_001',
      },
      frozen_input_hash: HASH_A,
    },
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-balanced`,
    },
    created_by: 'system',
  };
}

function canonicalResult(): TopicSelectionV1bWorkflowHarnessRunResult {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    workflow_run_id: 'workflow_run_v1b_001',
    node_attempt_id: 'node_attempt_v1b_001',
    gate_status: 'blocked',
    failure_class: 'policy_block',
    route_decision: 'blocked',
    replay_identity: {
      workflow_run_id: 'workflow_run_v1b_001',
      node_attempt_id: 'node_attempt_v1b_001',
      attempt_family_key: 'attempt_family_001',
      node_replay_key: HASH_B,
    },
    hashes: {
      frozen_input_hash: HASH_A,
      execution_spec_hash: HASH_C,
      semantic_artifact_hash: null,
      runtime_admission_hash: HASH_F,
      gate_result_hash: HASH_D,
      authority_hash: null,
      handoff_hash: null,
      route_hash: HASH_E,
    },
    blockers: [
      {
        code: 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
        message: 'Required v1b workflow harness runner dependencies are not configured.',
        severity: 'blocking',
        refs: [],
      },
    ],
    warnings: [],
    authority_ref: null,
    handoff_ref: null,
    gate_result_ref: null,
    transition_attempt_ref: null,
    trace_snapshot_ref: null,
    harness_trace_artifact_ref: null,
    replay_provenance: null,
    error_code: 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
    error_message: 'Required v1b workflow harness runner dependencies are not configured.',
  };
}

function acceptedConstraintProfilePayload(
  overrides: Partial<TopicSelectionV1bAcceptedConstraintProfilePayload> = {},
): TopicSelectionV1bAcceptedConstraintProfilePayload {
  return {
    target_community: 'CS paper engineering researchers',
    target_venue_class: null,
    intended_contribution_style: 'workflow_system',
    method_constraints: ['local-first workflow instrumentation'],
    resource_constraints: ['no live provider calls in fixture runs'],
    available_assets: ['v1a evidence map'],
    feasibility_budget: {
      maximum_slice_count: 3,
    },
    non_goals: ['promotion decision'],
    claim_ceiling: 'A bounded workflow claim about evidence-to-need traceability.',
    human_constraint_notes: null,
    constraint_payload: {
      source: 'fixture',
    },
    ...overrides,
  };
}

function canonicalN1Payload(): TopicSelectionV1bN1HarnessFrozenInputPayload {
  return {
    v1b_input_bundle_id: 'v1b_input_bundle_001',
    v1a_bundle_ref: ref('v1a_to_v1b_input_bundle', 'v1b_input_bundle_001'),
    v1a_bundle_hash: HASH_A,
    source_refs_hash: HASH_B,
  };
}

function canonicalN2Payload(
  overrides: Partial<TopicSelectionV1bN2HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN2HarnessFrozenInputPayload {
  return {
    intake_snapshot_ref: ref('v1b_intake_snapshot', 'intake_snapshot_001'),
    intake_snapshot_hash: HASH_A,
    v1a_bundle_ref: ref('v1a_to_v1b_input_bundle', 'v1b_input_bundle_001'),
    v1a_bundle_hash: HASH_B,
    authority_input_provider: 'codex_delegated',
    accepted_constraint_profile_payload: acceptedConstraintProfilePayload(),
    accepted_constraint_profile_payload_hash: HASH_C,
    delegation_artifact_hash: HASH_C,
    previous_profile_ref: null,
    previous_profile_hash: null,
    ...overrides,
  };
}

function canonicalN3Payload(): TopicSelectionV1bN3HarnessFrozenInputPayload {
  return {
    intake_snapshot_ref: ref('v1b_intake_snapshot', 'intake_snapshot_001'),
    intake_snapshot_hash: HASH_A,
    constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: HASH_B,
    n2_handoff_hash: HASH_C,
  };
}

function canonicalN4Payload(): TopicSelectionV1bN4HarnessFrozenInputPayload {
  return {
    intake_snapshot_ref: ref('v1b_intake_snapshot', 'intake_snapshot_001'),
    intake_snapshot_hash: HASH_A,
    constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: HASH_B,
    intake_readiness_ref: ref('v1b_intake_readiness_assessment', 'readiness_001'),
    intake_readiness_hash: HASH_C,
    n2_handoff_hash: HASH_D,
    n3_handoff_hash: HASH_E,
  };
}

function canonicalAcceptedSliceSelectionPayload(
  overrides: Partial<TopicSelectionV1bAcceptedSliceSelectionPayload> = {},
): TopicSelectionV1bAcceptedSliceSelectionPayload {
  return {
    decision: 'select',
    selected_option_ref: ref('research_slice_option', 'slice_option_001'),
    selected_option_hash: HASH_B,
    selection_rationale: 'Select the bounded option with strongest traceability fit.',
    decision_basis: {
      selected_option_key: 'traceable_workflow_slice',
    },
    rejected_option_reasons: [],
    required_actions: [],
    accepted_risk_refs: [],
    confidence: 0.82,
    requires_human_review: false,
    human_review_reason: null,
    loopback_target: null,
    loopback_target_ref: null,
    loopback_reason_code: null,
    ...overrides,
  };
}

function canonicalN5Payload(
  overrides: Partial<TopicSelectionV1bN5HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN5HarnessFrozenInputPayload {
  return {
    research_slice_option_set_ref: ref('research_slice_option_set', 'slice_options_001'),
    research_slice_option_set_hash: HASH_A,
    n4_handoff_hash: HASH_D,
    authority_input_provider: 'codex_delegated',
    accepted_selection_payload: canonicalAcceptedSliceSelectionPayload(),
    accepted_selection_payload_hash: HASH_E,
    delegation_artifact_hash: HASH_E,
    ...overrides,
  };
}

function canonicalN6Payload(
  overrides: Partial<TopicSelectionV1bN6HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN6HarnessFrozenInputPayload {
  return {
    n5_handoff_hash: HASH_F,
    constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: HASH_E,
    intake_readiness_ref: ref('v1b_intake_readiness_assessment', 'readiness_001'),
    intake_readiness_hash: HASH_D,
    research_slice_ref: ref('research_slice', 'research_slice_001', 'title_card_001', 'v1'),
    research_slice_hash: HASH_C,
    research_slice_selection_ref: ref('slice_selection_decision', 'slice_selection_001'),
    research_slice_selection_hash: HASH_A,
    research_slice_option_set_ref: ref('research_slice_option_set', 'slice_options_001'),
    research_slice_option_set_hash: HASH_D,
    selected_slice_option_ref: ref('research_slice_option', 'slice_option_001'),
    selected_slice_option_hash: HASH_B,
    ...overrides,
  };
}

function canonicalN7Payload(
  overrides: Partial<TopicSelectionV1bN7HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN7HarnessFrozenInputPayload {
  return {
    input_mode: 'initial_from_n6',
    n6_handoff_hash: HASH_F,
    topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
    topic_question_candidate_set_hash: HASH_A,
    admissible_candidate_refs: [ref('topic_question_candidate', 'candidate_001')],
    admissible_candidate_hashes: [HASH_B],
    selected_research_slice_ref: ref('research_slice', 'research_slice_001', 'title_card_001', 'v1'),
    selected_research_slice_hash: HASH_C,
    generation_artifact_ref: ref('artifact_ref', 'generation_artifact_001'),
    generation_artifact_hash: HASH_D,
    candidate_gate_hash: HASH_E,
    candidate_grouping_ref: null,
    candidate_grouping_hash: null,
    ...overrides,
  } as TopicSelectionV1bN7HarnessFrozenInputPayload;
}

function canonicalN8ToN7FeedbackPayload(
  overrides: Partial<TopicSelectionV1bN8ToN7FeedbackPayload> = {},
): TopicSelectionV1bN8ToN7FeedbackPayload {
  return {
    feedback_class: 'semantic_candidate_failure',
    failure_reason_code: 'value_not_supported',
    feedback_summary: 'The candidate failed N8 value support checks.',
    affected_refs: [ref('topic_question_candidate', 'candidate_001')],
    previous_n7_handoff_ref: ref('artifact_ref', 'n7_handoff_001'),
    previous_n7_handoff_hash: HASH_A,
    previous_trial_ledger_ref: ref('topic_question_selection_decision', 'selection_decision_001'),
    previous_trial_ledger_hash: HASH_B,
    failed_topic_question_contract_ref: ref('topic_question_contract', 'question_contract_001'),
    failed_topic_question_contract_hash: HASH_C,
    failed_candidate_ref: ref('topic_question_candidate', 'candidate_001'),
    failed_candidate_hash: HASH_D,
    topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
    topic_question_candidate_set_hash: HASH_E,
    n8_gate_result_hash: HASH_F,
    value_assessment_ref: null,
    value_assessment_hash: null,
    ...overrides,
  };
}

function canonicalN8Payload(
  overrides: Partial<TopicSelectionV1bN8HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN8HarnessFrozenInputPayload {
  return {
    ...payloadForHandoff('N7ToN8Handoff') as TopicSelectionV1bN8HarnessFrozenInputPayload,
    n7_handoff_hash: HASH_F,
    ...overrides,
  };
}

function canonicalN9Payload(
  overrides: Partial<TopicSelectionV1bN9HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN9HarnessFrozenInputPayload {
  return {
    ...payloadForHandoff('N8ToN9Handoff') as TopicSelectionV1bN9HarnessFrozenInputPayload,
    n8_handoff_hash: HASH_F,
    value_reasoning_memo_ref: ref('value_reasoning_memo', 'value_memo_001'),
    value_reasoning_memo_hash: HASH_C,
    recommended_disposition: 'advance_to_package',
    ...overrides,
  };
}

function canonicalN10Payload(
  overrides: Partial<TopicSelectionV1bN10HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN10HarnessFrozenInputPayload {
  return {
    ...payloadForHandoff('N9ToN10Handoff') as TopicSelectionV1bN10HarnessFrozenInputPayload,
    n9_handoff_hash: HASH_F,
    ...overrides,
  };
}

function canonicalN11Payload(
  overrides: Partial<TopicSelectionV1bN11HarnessFrozenInputPayload> = {},
): TopicSelectionV1bN11HarnessFrozenInputPayload {
  return {
    ...payloadForHandoff('N10ToN11Handoff') as TopicSelectionV1bN11HarnessFrozenInputPayload,
    n10_handoff_hash: HASH_F,
    v1c_input_bundle_ref: ref('v1b_to_v1c_input_bundle', 'bundle_001'),
    v1c_input_bundle_hash: HASH_E,
    ...overrides,
  };
}

function canonicalN8ValueDraftPayload(
  overrides: Partial<TopicSelectionV1bTopicValueAssessmentDraftPayload> = {},
): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const evidenceRef = ref('topic_question_contract', 'question_contract_001');
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
      gate_key: gateKey,
      verdict: 'pass',
      severity: 'info',
      overridable_with_risk: false,
      rationale: `${gateKey} passes in the deterministic fixture.`,
      refs: [evidenceRef],
    })),
    dimension_scores: TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
      dimension_key: dimensionKey,
      score: dimensionKey === 'reviewer_risk' ? 72 : 84,
      rationale: `${dimensionKey} is sufficiently supported for the fixture.`,
      evidence_refs: [evidenceRef],
      uncertainty: 'medium',
    })),
    risk_penalty: {
      residual_risk: 'bounded',
    },
    reviewer_objections: ['Provider canary behavior is outside this fixture run.'],
    ceiling_case: 'The topic can support a bounded workflow claim with deterministic trace evidence.',
    base_case: 'The topic supports harness-native acceptance and replay validation.',
    floor_case: 'The topic still yields useful negative gate coverage.',
    recommended_disposition: 'advance_to_package',
    total_score: 83,
    value_summary: 'The active TopicQuestionContract has enough value and answerability for draft packaging.',
    confidence: 0.82,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Provider canary and output quality review remain downstream checks.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'Harness-native v1b topic selection closes automation, replay, and authority boundaries.',
      significance: 'It turns route-testable workflow fragments into a repeatable product workflow.',
      originality: 'The contribution is a deterministic gate and handoff workflow around LLM-assisted semantic drafts.',
      claim_leverage: 'The claim remains bounded to workflow robustness and replay evidence.',
      reviewer_risks: ['The implementation needs downstream provider canary validation.'],
      effort_to_value: 'The fixture chain gives high value for moderate implementation effort.',
      strategic_fit: 'It aligns with reviewer-aligned paper engineering workflows.',
      negative_memory_check: 'No prior negative memory blocks this topic.',
      evidence_backed_rationale: 'The N7 contract and candidate lineage provide frozen trace evidence.',
      top_objections: ['The fixture does not prove live provider quality.'],
      uncertainty: 'Medium uncertainty until provider canary is added.',
      disposition_bridge: 'Advance to package with residual risks carried into v1c.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [evidenceRef],
    },
    ...overrides,
  };
}

function canonicalCandidateGroupingSupportPayload(
  overrides: Partial<TopicSelectionV1bCandidateGroupingSupportPayload> = {},
): TopicSelectionV1bCandidateGroupingSupportPayload {
  return {
    selected_candidate_ref: ref('topic_question_candidate', 'candidate_001'),
    selected_candidate_hash: HASH_A,
    priority_order: [ref('topic_question_candidate', 'candidate_001')],
    duplicate_or_overlap_groups: [],
    candidate_relationships: {
      fixture: true,
    },
    grouping_summary: 'Candidate is selected as the strongest active trial.',
    ...overrides,
  };
}

function canonicalN6LoopbackTriageSupportPayload(
  overrides: Partial<TopicSelectionV1bN6LoopbackTriageSupportPayload> = {},
): TopicSelectionV1bN6LoopbackTriageSupportPayload {
  return {
    loopback_target_code: 'n6_regenerate_candidates',
    failure_scope: 'candidate_level',
    dominant_reason_codes: ['not_answerable'],
    affected_refs: [ref('research_slice', 'research_slice_001')],
    regeneration_hints: ['Regenerate a more bounded, answerable TopicQuestion candidate.'],
    debate_escalation: null,
    upstream_rollback: null,
    rationale: 'The current candidate draft produced no deterministic-gate-admissible topic question.',
    ...overrides,
  };
}

function canonicalDebateAdmissionSupportPayload(
  overrides: Partial<TopicSelectionV1bN8DebateAdmissionReviewSupportPayload> = {},
): TopicSelectionV1bN8DebateAdmissionReviewSupportPayload {
  return {
    debate_level: 'compact_assessment_debate',
    recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    high_value_signal_codes: ['bounded_replay_claim'],
    risk_signal_codes: [],
    rationale: 'Default compact debate is enough for this bounded candidate.',
    ...overrides,
  };
}

function canonicalFailedTrialSynthesisSupportPayload(
  overrides: Partial<TopicSelectionV1bN8FailedTrialSynthesisSupportPayload> = {},
): TopicSelectionV1bN8FailedTrialSynthesisSupportPayload {
  return {
    exhausted_candidate_refs: [ref('topic_question_candidate', 'candidate_001')],
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'All N8 candidate trials failed value support gates.',
    n6_regeneration_hints: ['Regenerate with stronger value evidence axis.'],
    affected_refs: [ref('topic_question_candidate_set', 'candidate_set_001')],
    ...overrides,
  };
}

function canonicalN4DraftPayload(
  overrides: Partial<TopicSelectionV1bResearchSliceOptionSetDraftPayload> = {},
): TopicSelectionV1bResearchSliceOptionSetDraftPayload {
  return {
    recommended_option_key: 'traceable_workflow_slice',
    comparison_axes: ['method feasibility', 'evidence traceability'],
    comparison_summary: 'The recommended slice keeps the claim bounded.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [
      {
        option_key: 'traceable_workflow_slice',
        source_validated_need_refs: [ref('validated_need', 'validated_need_001')],
        slice_statement: 'Build a bounded traceability workflow.',
        problem_space: 'Reviewer-aligned topic selection traceability.',
        target_setting: 'Local-first paper engineering assistant.',
        target_community: 'CS paper engineering researchers',
        included_boundaries: ['v1a evidence-to-need trace preservation'],
        excluded_boundaries: ['promotion decision'],
        contribution_type_candidate: 'workflow_system',
        support_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
        challenge_evidence_refs: [],
        baseline_evidence_refs: [],
        context_evidence_refs: [],
        resource_assumptions: ['Existing evidence map is available.'],
        data_assumptions: ['Evidence refs are frozen.'],
        evaluation_path: 'Replay the harness and compare hashes.',
        baseline_assumptions: ['Route smoke tests are insufficient.'],
        hard_blockers: [],
        dependency_risks: ['Downstream selection may request more options.'],
        slice_budget: {
          max_nodes: 4,
        },
        expected_claim: 'A bounded workflow can preserve evidence-to-need traceability.',
        fallback_claim: 'A harness-native workflow improves traceability checks.',
        observable_success_criteria: ['N4 emits option set refs and hashes.'],
        main_risks: ['Evidence coverage may need review.'],
        baseline_risk: 'medium',
        execution_risk: 'medium',
        scope_risk: 'low',
        claim_ceiling_alignment: {
          status: 'aligned',
          rationale: 'The claim is bounded to workflow behavior.',
          confidence: 0.8,
        },
        confidence: 0.82,
        requires_human_review: false,
        human_review_triggers: [],
        details_payload: {
          fixture: true,
        },
      },
    ],
    ...overrides,
  };
}

function canonicalN6DraftPayload(
  overrides: Partial<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> = {},
): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload {
  const evidenceRef = ref('evidence_unit', 'evidence_unit_001');
  const boundaryRef = ref('research_slice_boundary', 'boundary_001');
  const needRef = ref('validated_need', 'validated_need_001');
  return {
    question_frame: {
      target_setting: 'Local-first paper engineering assistant.',
      target_community: 'CS paper engineering researchers',
      object_scope: 'v1b harness-normalized topic selection workflow',
      task_scope: 'candidate generation and replay validation',
      intervention_or_approach: 'WorkflowHarness-native topic-question candidate gate',
      comparison_baseline: 'HTTP route smoke tests without harness-level acceptance',
      observable_outcome: 'candidate set replay and deterministic gate stability',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: {
        fixture: true,
      },
    },
    recommended_candidate_keys: ['harness_candidate'],
    generation_notes: ['Candidate is scoped to frozen selected ResearchSlice lineage.'],
    human_review_triggers: [],
    candidates: [
      {
        candidate_key: 'harness_candidate',
        main_question: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection? ',
        sub_questions: ['Which frozen lineage hashes must be checked before N7 admission?'],
        question_type: 'system',
        contribution_hypothesis: 'system',
        source_validated_need_refs: [needRef],
        answerability_plan: {
          datasets_or_resources: ['v1b harness trace fixtures'],
          metrics: ['hash drift detection rate'],
          baselines: ['route-only smoke coverage'],
          ablations_or_comparisons: ['without frozen semantic artifact gate'],
          evaluation_setting: 'local deterministic harness tests',
          dependency_risks: ['fixture coverage may miss provider canary variance'],
          open_dependencies: [],
          known_gaps: [],
          required_evidence_refs: [evidenceRef],
        },
        answerability_verdict: 'answerable',
        expected_claim: 'A harness-native candidate gate improves replayable topic selection.',
        fallback_claim: 'The gate preserves candidate lineage for downstream review.',
        max_claim_strength: 'Bounded workflow claim.',
        observable_success_criteria: ['N6 emits candidate set refs and hashes.'],
        boundary_check: {
          preserved_boundary_refs: [boundaryRef],
          excluded_boundary_refs: [boundaryRef],
          boundary_violations: [],
          prohibited_claims: ['promotion decision'],
          allowed_refinements: ['tighten candidate wording'],
        },
        traceability_check: {
          support_evidence_refs: [evidenceRef],
          challenge_evidence_refs: [evidenceRef],
          baseline_evidence_refs: [evidenceRef],
          context_evidence_refs: [evidenceRef],
          mapped_evidence_refs: [evidenceRef],
          unmapped_assumptions: [],
        },
        falsification_conditions: [
          {
            condition_type: 'claim_overstrong',
            statement: 'If replay drift is not detected by changed frozen input hashes, revise the claim.',
            severity: 'hard',
            trigger_evidence_refs: [evidenceRef],
            trigger_source_refs: [needRef],
            related_contract_fields: ['expected_claim'],
            expected_action: 'lower_claim_strength',
            check_timing: 'before_value_assessment',
            confidence: 'high',
          },
        ],
        risk_notes: [],
        blockers: [],
        objections: [],
        human_review_triggers: [],
        confidence: 0.82,
      },
    ],
    ...overrides,
  };
}

function ref(refType: string, refId: string, titleCardId = 'title_card_001', versionId: string | null = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId,
  };
}

function semanticArtifact(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> = {},
): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  return {
    slot_id: 'n4_research_slice_option_draft',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    allowed_effect: 'model_draft_for_gate',
    support_artifact_ref: ref('artifact_ref', 'support_artifact_001'),
    support_artifact_hash: HASH_A,
    normalized_output_ref: ref('artifact_ref', 'normalized_output_001'),
    normalized_output_hash: HASH_B,
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    model_option_id: null,
    input_hash: HASH_C,
    prompt_packet_hash: HASH_D,
    structured_output_hash: HASH_E,
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: HASH_F,
    provenance_ref: ref('artifact_ref', 'provenance_001'),
    runtime_provenance_class: 'fixture_replay',
    context_policy_profile_id: null,
    context_policy_profile_version: null,
    context_policy_profile_hash: null,
    prompt_variant_key: null,
    runtime_invocation_context_hash: null,
    redaction_policy: null,
    source_hashes: {},
    runtime_audit_ref: null,
    runtime_audit_hash: null,
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  };
}

function targetNodeForHandoff(kind: TopicSelectionV1bWorkflowHarnessHandoffKind): TopicSelectionV1bWorkflowHarnessHandoff['target_node_id'] {
  const edge = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS.find((item) => item.handoff_kind === kind);
  if (!edge) {
    throw new Error(`Unknown handoff kind: ${kind}.`);
  }
  return edge.target_node_id;
}

function sourceNodeForHandoff(kind: TopicSelectionV1bWorkflowHarnessHandoffKind): TopicSelectionV1bWorkflowHarnessHandoff['envelope']['source_node_id'] {
  const edge = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS.find((item) => item.handoff_kind === kind);
  if (!edge) {
    throw new Error(`Unknown handoff kind: ${kind}.`);
  }
  return edge.source_node_id;
}

function routeSignalForHandoff(kind: TopicSelectionV1bWorkflowHarnessHandoffKind): string {
  const edge = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS.find((item) => item.handoff_kind === kind);
  if (!edge) {
    throw new Error(`Unknown handoff kind: ${kind}.`);
  }
  return edge.route_signal;
}

function payloadSchemaVersionForHandoff(kind: TopicSelectionV1bWorkflowHarnessHandoffKind): string {
  const edge = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_EDGE_SPECS.find((item) => item.handoff_kind === kind);
  if (!edge) {
    throw new Error(`Unknown handoff kind: ${kind}.`);
  }
  return edge.payload_schema_version;
}

function payloadForHandoff(kind: TopicSelectionV1bWorkflowHarnessHandoffKind): TopicSelectionV1bWorkflowHarnessHandoff['payload'] {
  switch (kind) {
    case 'N1ToN2Handoff':
      return {
        intake_snapshot_ref: ref('v1b_intake_snapshot', 'intake_snapshot_001'),
        intake_snapshot_hash: HASH_A,
        v1a_bundle_ref: ref('v1a_valid_need_bundle', 'v1a_bundle_001'),
        v1a_bundle_hash: HASH_B,
      };
    case 'N2ToN3Handoff':
      return {
        constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
        constraint_profile_hash: HASH_A,
        intake_snapshot_ref: ref('v1b_intake_snapshot', 'intake_snapshot_001'),
        intake_snapshot_hash: HASH_B,
      };
    case 'N3ToN4Handoff':
      return {
        intake_readiness_ref: ref('v1b_intake_readiness_assessment', 'readiness_001'),
        intake_readiness_hash: HASH_A,
        constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
        constraint_profile_hash: HASH_B,
      };
    case 'N4ToN5Handoff':
      return {
        research_slice_option_set_ref: ref('research_slice_option_set', 'slice_options_001'),
        research_slice_option_set_hash: HASH_A,
      };
    case 'N5ToN6Handoff':
      return {
        constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
        constraint_profile_hash: HASH_E,
        intake_readiness_ref: ref('v1b_intake_readiness_assessment', 'readiness_001'),
        intake_readiness_hash: HASH_D,
        research_slice_ref: ref('research_slice', 'research_slice_001', 'title_card_001', 'v1'),
        research_slice_hash: HASH_C,
        research_slice_selection_ref: ref('research_slice_selection_decision', 'slice_selection_001'),
        research_slice_selection_hash: HASH_A,
        research_slice_option_set_ref: ref('research_slice_option_set', 'slice_options_001'),
        research_slice_option_set_hash: HASH_D,
        selected_slice_option_ref: ref('research_slice_option', 'slice_option_001'),
        selected_slice_option_hash: HASH_B,
      };
    case 'N6ToN7Handoff':
      return {
        topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
        topic_question_candidate_set_hash: HASH_A,
        admissible_candidate_refs: [ref('topic_question_candidate', 'candidate_001')],
        admissible_candidate_hashes: [HASH_B],
        selected_research_slice_ref: ref('research_slice', 'research_slice_001', 'title_card_001', 'v1'),
        selected_research_slice_hash: HASH_C,
        generation_artifact_ref: ref('artifact_ref', 'generation_artifact_001'),
        generation_artifact_hash: HASH_D,
        candidate_gate_hash: HASH_E,
        candidate_grouping_ref: ref('candidate_grouping', 'grouping_001'),
        candidate_grouping_hash: HASH_F,
      };
    case 'N7ToN8Handoff':
      return {
        topic_question_ref: ref('topic_question', 'topic_question_001'),
        topic_question_hash: HASH_D,
        topic_question_contract_ref: ref('topic_question_contract', 'question_contract_001'),
        topic_question_contract_hash: HASH_A,
        answerability_plan_ref: ref('topic_question_answerability_plan', 'answerability_plan_001'),
        answerability_plan_hash: HASH_E,
        trial_ledger_ref: ref('topic_question_selection_decision', 'selection_decision_001'),
        trial_ledger_hash: HASH_F,
        topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
        topic_question_candidate_set_hash: HASH_C,
        active_candidate_ref: ref('topic_question_candidate', 'candidate_001'),
        active_candidate_hash: HASH_B,
        selected_research_slice_ref: ref('research_slice', 'research_slice_001', 'title_card_001', 'v1'),
        selected_research_slice_hash: HASH_D,
        n8_debate_admission_ref: ref('artifact_ref', 'debate_admission_001'),
        n8_debate_admission_hash: HASH_E,
        candidate_grouping_ref: null,
        candidate_grouping_hash: null,
      };
    case 'N8ToN9Handoff':
      return {
        topic_value_assessment_ref: ref('topic_value_assessment', 'value_assessment_001'),
        topic_value_assessment_hash: HASH_A,
        topic_question_contract_ref: ref('topic_question_contract', 'question_contract_001'),
        topic_question_contract_hash: HASH_B,
        value_reasoning_memo_ref: ref('value_reasoning_memo', 'value_memo_001'),
        value_reasoning_memo_hash: HASH_C,
        recommended_disposition: 'advance_to_package',
      };
    case 'N9ToN10Handoff':
      return {
        value_disposition_ref: ref('value_disposition_decision', 'value_disposition_001'),
        value_disposition_hash: HASH_A,
        advance_disposition: true,
        topic_value_assessment_ref: ref('topic_value_assessment', 'value_assessment_001'),
        topic_value_assessment_hash: HASH_B,
      };
    case 'N10ToN11Handoff':
      return {
        draft_topic_package_ref: ref('topic_package', 'package_001'),
        draft_topic_package_hash: HASH_A,
        value_disposition_ref: ref('value_disposition_decision', 'value_disposition_001'),
        value_disposition_hash: HASH_B,
        v1c_input_bundle_ref: ref('v1b_to_v1c_input_bundle', 'bundle_001'),
        v1c_input_bundle_hash: HASH_C,
      };
    case 'V1cInputBundle':
      return {
        v1c_input_bundle_ref: ref('v1b_to_v1c_input_bundle', 'bundle_001'),
        v1c_input_bundle_hash: HASH_E,
        draft_topic_package_ref: ref('topic_package', 'package_001'),
        draft_topic_package_hash: HASH_F,
      };
  }
}

function canonicalHandoff(kind: TopicSelectionV1bWorkflowHarnessHandoffKind): TopicSelectionV1bWorkflowHarnessHandoff {
  return {
    envelope: {
      handoff_kind: kind,
      source_node_id: sourceNodeForHandoff(kind),
      source_node_attempt_id: 'node_attempt_v1b_001',
      source_authority_ref: ref('v1b_authority', 'authority_001'),
      source_authority_hash: HASH_A,
      source_gate_result_hash: HASH_B,
      upstream_lineage_hash: HASH_C,
      policy_version: 'topic-selection-v1b-node-policy-v1',
      schema_version: payloadSchemaVersionForHandoff(kind),
      warning_codes: [],
      residual_risk_refs: [],
    },
    target_node_id: targetNodeForHandoff(kind),
    route_signal: routeSignalForHandoff(kind),
    payload_hash: HASH_D,
    required_refs: [ref('v1b_authority', 'authority_001')],
    payload: payloadForHandoff(kind),
  };
}

function canonicalV1cPublicationHandoff(): TopicSelectionV1bWorkflowHarnessHandoff {
  return {
    ...canonicalHandoff('V1cInputBundle'),
    payload: {
      v1c_input_bundle_ref: ref('v1b_to_v1c_input_bundle', 'bundle_001'),
      v1c_input_bundle_hash: HASH_E,
      draft_topic_package_ref: ref('topic_package', 'package_001'),
      draft_topic_package_hash: HASH_F,
    },
  };
}

function canonicalN6RuntimeContextProjection(): TopicSelectionV1bN6RuntimeContextProjection {
  return {
    schema_version: 'TopicSelectionV1bN6RuntimeContextProjection@v1',
    projection_kind: 'v1b_n6_gate_failure_retry_context',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    workflow_run_id: 'workflow_run_v1b_001',
    node_attempt_id: 'node_attempt_v1b_n6_001',
    route_decision: 'loopback',
    loopback_target_code: 'n6_regenerate_candidates',
    non_authority: true,
    context_cache_scope: 'process_local_runtime_only',
    context_authority: 'non_authority_runtime_context',
    source_refs: [
      ref('research_slice', 'research_slice_001'),
      ref('research_slice_selection_decision', 'slice_selection_001'),
      ref('artifact_ref', 'failed_n6_draft_001'),
    ],
    source_hashes: {
      frozen_input_hash: HASH_A,
      n5_handoff_hash: HASH_B,
      selected_research_slice_hash: HASH_C,
      failed_draft_hash: HASH_D,
      failed_draft_prompt_packet_hash: HASH_E,
      failed_draft_source_hashes_hash: HASH_F,
      blocked_candidate_context_hash: HASH_A,
      failure_reason_codes_hash: HASH_B,
      regeneration_hints_hash: HASH_C,
    },
    support_refs: [ref('artifact_ref', 'failed_n6_draft_001')],
    support_hashes: {
      failed_draft_hash: HASH_D,
      failed_draft_prompt_packet_hash: HASH_E,
      failed_draft_source_hashes_hash: HASH_F,
      blocked_candidate_context_hash: HASH_A,
    },
    preserved_fact_kinds: [
      'failed_draft_identity',
      'blocked_candidate_context',
      'failure_reason_code',
      'regeneration_hint',
      'loopback_target',
    ],
    selected_research_slice_ref: ref('research_slice', 'research_slice_001'),
    selected_research_slice_hash: HASH_C,
    n5_handoff_hash: HASH_B,
    failed_draft_ref: ref('artifact_ref', 'failed_n6_draft_001'),
    failed_draft_hash: HASH_D,
    failed_draft_prompt_packet_hash: HASH_E,
    failed_draft_source_hashes_hash: HASH_F,
    blocked_candidate_context: [{
      affected_refs: [ref('research_slice', 'research_slice_001')],
      candidate_key: 'candidate_001',
      dominant_reason: 'answerability_weak',
      scope: 'candidate_level',
    }],
    blocked_candidate_context_hash: HASH_A,
    failure_reason_codes: ['answerability_weak'],
    regeneration_hints: ['Regenerate with a narrower answerable question.'],
    triage_artifact_ref: null,
    triage_artifact_hash: null,
    triage_payload_hash: null,
  };
}

function canonicalN7RuntimeContextProjection(
  kind: TopicSelectionV1bN7RuntimeContextProjection['projection_kind'] =
    'v1b_n7_to_n8_topic_question_contract_context',
): TopicSelectionV1bN7RuntimeContextProjection {
  if (kind === 'v1b_n7_to_n6_failed_trial_loopback_context') {
    return {
      schema_version: 'TopicSelectionV1bN7RuntimeContextProjection@v1',
      projection_kind: 'v1b_n7_to_n6_failed_trial_loopback_context',
      node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
      workflow_run_id: 'workflow_run_v1b_001',
      node_attempt_id: 'node_attempt_v1b_n7_001',
      route_decision: 'loopback',
      non_authority: true,
      context_cache_scope: 'process_local_runtime_only',
      context_authority: 'non_authority_runtime_context',
      source_refs: [
        ref('artifact_ref', 'n6_handoff_001'),
        ref('artifact_ref', 'n8_feedback_001'),
        ref('artifact_ref', 'failed_trial_synthesis_001'),
        ref('research_slice', 'research_slice_001'),
      ],
      source_hashes: {
        frozen_input_hash: HASH_A,
        n6_handoff_hash: HASH_B,
        n8_feedback_hash: HASH_C,
        failed_trial_synthesis_hash: HASH_D,
        selected_research_slice_hash: HASH_E,
      },
      support_refs: [ref('artifact_ref', 'failed_trial_synthesis_001')],
      support_hashes: {
        n7_failed_trial_synthesis: HASH_D,
      },
      preserved_fact_kinds: ['failure_reason_codes', 'failed_candidate_identity', 'regeneration_hints'],
      loopback_target_code: 'n7_loopback_to_n6',
      topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
      topic_question_candidate_set_hash: HASH_A,
      n6_handoff_hash: HASH_B,
      n8_feedback_ref: ref('artifact_ref', 'n8_feedback_001'),
      n8_feedback_hash: HASH_C,
      failed_trial_synthesis_ref: ref('artifact_ref', 'failed_trial_synthesis_001'),
      failed_trial_synthesis_hash: HASH_D,
      exhausted_candidate_refs: [ref('topic_question_candidate', 'candidate_001')],
      exhausted_candidate_hashes: [HASH_E],
      failure_reason_codes: ['value_not_supported'],
      n6_regeneration_hints: ['Regenerate with stronger value evidence.'],
      synthesis_summary: 'All current candidates failed value support.',
    };
  }

  const payload = payloadForHandoff('N7ToN8Handoff') as TopicSelectionV1bN7ToN8HandoffPayload;
  return {
    schema_version: 'TopicSelectionV1bN7RuntimeContextProjection@v1',
    projection_kind: 'v1b_n7_to_n8_topic_question_contract_context',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    workflow_run_id: 'workflow_run_v1b_001',
    node_attempt_id: 'node_attempt_v1b_n7_001',
    route_decision: 'invoke_next',
    non_authority: true,
    context_cache_scope: 'process_local_runtime_only',
    context_authority: 'non_authority_runtime_context',
    source_refs: [ref('artifact_ref', 'n7_handoff_001'), payload.topic_question_contract_ref],
    source_hashes: {
      frozen_input_hash: HASH_A,
      n7_handoff_hash: HASH_B,
      topic_question_contract_hash: payload.topic_question_contract_hash,
    },
    support_refs: [payload.n8_debate_admission_ref],
    support_hashes: {
      n7_n8_debate_admission_review: payload.n8_debate_admission_hash,
    },
    preserved_fact_kinds: ['topic_question_contract', 'answerability_plan', 'active_candidate_identity'],
    n7_handoff_ref: ref('artifact_ref', 'n7_handoff_001'),
    n7_handoff_hash: HASH_B,
    ...payload,
  };
}

test('topic-selection v1b workflow harness schemas accept canonical request and result envelopes', async () => {
  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunRequestSchema, canonicalRequest()), true);
  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunResultSchema, canonicalResult()), true);
});

test('topic-selection v1b N1-N11 frozen payload schemas accept canonical fixtures', async () => {
  assert.equal(await validatesBody(topicSelectionV1bN1HarnessFrozenInputPayloadSchema, canonicalN1Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN2HarnessFrozenInputPayloadSchema, canonicalN2Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN3HarnessFrozenInputPayloadSchema, canonicalN3Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN4HarnessFrozenInputPayloadSchema, canonicalN4Payload()), true);
  assert.equal(
    await validatesBody(topicSelectionV1bAcceptedSliceSelectionPayloadSchema, canonicalAcceptedSliceSelectionPayload()),
    true,
  );
  assert.equal(await validatesBody(topicSelectionV1bN5HarnessFrozenInputPayloadSchema, canonicalN5Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN6HarnessFrozenInputPayloadSchema, canonicalN6Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN7HarnessFrozenInputPayloadSchema, canonicalN7Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN8HarnessFrozenInputPayloadSchema, canonicalN8Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN9HarnessFrozenInputPayloadSchema, canonicalN9Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN10HarnessFrozenInputPayloadSchema, canonicalN10Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN11HarnessFrozenInputPayloadSchema, canonicalN11Payload()), true);
  assert.equal(await validatesBody(topicSelectionV1bN8ToN7FeedbackPayloadSchema, canonicalN8ToN7FeedbackPayload()), true);
  assert.equal(
    await validatesBody(topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema, canonicalN4DraftPayload()),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema, canonicalN6DraftPayload()),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bTopicValueAssessmentDraftPayloadSchema, canonicalN8ValueDraftPayload()),
    true,
  );
});

test('topic-selection v1b N6/N7 support payload schemas accept canonical fixtures', async () => {
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, canonicalN6LoopbackTriageSupportPayload()),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, canonicalN6LoopbackTriageSupportPayload({
      loopback_target_code: 'n6_debate_escalation',
      debate_escalation: {
        debate_level: 'mixed_cost_control',
        recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
        sticky: true,
        rationale: 'Escalate the next N6 generation pass through a debate-shaped prompt pack.',
      },
      upstream_rollback: null,
    })),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, canonicalN6LoopbackTriageSupportPayload({
      loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
      failure_scope: 'slice_level',
      debate_escalation: null,
      upstream_rollback: {
        target_node_id: 'topic-selection.v1b.select-research-slice.v1',
        repair_action: 'select_different_slice',
        rationale: 'The selected ResearchSlice does not support a viable TopicQuestion.',
      },
    })),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bCandidateGroupingSupportPayloadSchema, canonicalCandidateGroupingSupportPayload()),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN8DebateAdmissionReviewSupportPayloadSchema, canonicalDebateAdmissionSupportPayload()),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN8FailedTrialSynthesisSupportPayloadSchema, canonicalFailedTrialSynthesisSupportPayload()),
    true,
  );
});

test('topic-selection v1b N2 frozen payload schema rejects malformed accepted payload and missing Codex provenance', async () => {
  const missingAcceptedPayload = canonicalN2Payload() as unknown as Record<string, unknown>;
  delete missingAcceptedPayload.accepted_constraint_profile_payload;
  assert.equal(await validatesBody(topicSelectionV1bN2HarnessFrozenInputPayloadSchema, missingAcceptedPayload), false);

  const missingCodexProvenance = canonicalN2Payload({
    delegation_artifact_hash: null,
  });
  assert.equal(await validatesBody(topicSelectionV1bN2HarnessFrozenInputPayloadSchema, missingCodexProvenance), false);

  const humanWithCodexProvenance = canonicalN2Payload({
    authority_input_provider: 'human_delegated',
    delegation_artifact_hash: HASH_C,
  });
  assert.equal(await validatesBody(topicSelectionV1bN2HarnessFrozenInputPayloadSchema, humanWithCodexProvenance), false);
});

test('topic-selection v1b N5 frozen payload schema rejects malformed selection payload and missing Codex provenance', async () => {
  const missingAcceptedPayload = canonicalN5Payload() as unknown as Record<string, unknown>;
  delete missingAcceptedPayload.accepted_selection_payload;
  assert.equal(await validatesBody(topicSelectionV1bN5HarnessFrozenInputPayloadSchema, missingAcceptedPayload), false);

  const missingSelectedOption = canonicalAcceptedSliceSelectionPayload({
    selected_option_ref: null,
    selected_option_hash: null,
  });
  assert.equal(await validatesBody(topicSelectionV1bAcceptedSliceSelectionPayloadSchema, missingSelectedOption), false);

  const requestMoreOptions = canonicalAcceptedSliceSelectionPayload({
    accepted_risk_refs: [],
    decision: 'request_more_options',
    loopback_reason_code: 'insufficient_option_coverage',
    loopback_target: 'plan_research_slice_run',
    selected_option_hash: null,
    selected_option_ref: null,
  });
  assert.equal(await validatesBody(topicSelectionV1bAcceptedSliceSelectionPayloadSchema, requestMoreOptions), true);

  const missingCodexProvenance = canonicalN5Payload({
    delegation_artifact_hash: null,
  });
  assert.equal(await validatesBody(topicSelectionV1bN5HarnessFrozenInputPayloadSchema, missingCodexProvenance), false);

  const humanWithCodexProvenance = canonicalN5Payload({
    authority_input_provider: 'human_delegated',
    delegation_artifact_hash: HASH_C,
  });
  assert.equal(await validatesBody(topicSelectionV1bN5HarnessFrozenInputPayloadSchema, humanWithCodexProvenance), false);
});

test('topic-selection v1b N6 frozen payload and draft schemas reject missing lineage and side effects', async () => {
  const missingHandoffHash = canonicalN6Payload() as unknown as Record<string, unknown>;
  delete missingHandoffHash.n5_handoff_hash;
  assert.equal(await validatesBody(topicSelectionV1bN6HarnessFrozenInputPayloadSchema, missingHandoffHash), false);

  const missingSelectedOptionHash = canonicalN6Payload() as unknown as Record<string, unknown>;
  delete missingSelectedOptionHash.selected_slice_option_hash;
  assert.equal(await validatesBody(topicSelectionV1bN6HarnessFrozenInputPayloadSchema, missingSelectedOptionHash), false);

  assert.equal(
    await validatesBody(topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema, {
      ...canonicalN6DraftPayload(),
      provider_id: 'openai',
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema, {
      ...canonicalN6DraftPayload(),
      topic_question_contract_ref: ref('topic_question_contract', 'contract_001'),
    }),
    false,
  );
});

test('topic-selection v1b N7 payload and support schemas reject drift and side effects', async () => {
  const missingLineage = canonicalN7Payload() as unknown as Record<string, unknown>;
  delete missingLineage.n6_handoff_hash;
  assert.equal(await validatesBody(topicSelectionV1bN7HarnessFrozenInputPayloadSchema, missingLineage), false);

  const emptyCandidates = canonicalN7Payload({
    admissible_candidate_refs: [],
    admissible_candidate_hashes: [],
  });
  assert.equal(await validatesBody(topicSelectionV1bN7HarnessFrozenInputPayloadSchema, emptyCandidates), false);

  const malformedFeedback = canonicalN8ToN7FeedbackPayload() as unknown as Record<string, unknown>;
  delete malformedFeedback.previous_trial_ledger_hash;
  assert.equal(await validatesBody(topicSelectionV1bN8ToN7FeedbackPayloadSchema, malformedFeedback), false);

  assert.equal(
    await validatesBody(topicSelectionV1bCandidateGroupingSupportPayloadSchema, {
      ...canonicalCandidateGroupingSupportPayload(),
      topic_question_contract_ref: ref('topic_question_contract', 'contract_001'),
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, {
      ...canonicalN6LoopbackTriageSupportPayload({
        loopback_target_code: 'n6_debate_escalation',
        debate_escalation: null,
      }),
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, {
      ...canonicalN6LoopbackTriageSupportPayload({
        loopback_target_code: 'n6_debate_escalation',
        failure_scope: 'upstream_context_level',
        debate_escalation: {
          debate_level: 'mixed_cost_control',
          recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
          sticky: true,
          rationale: 'Escalate the next N6 generation pass through a debate-shaped prompt pack.',
        },
        upstream_rollback: null,
      }),
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, {
      ...canonicalN6LoopbackTriageSupportPayload({
        loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
        upstream_rollback: null,
      }),
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN6LoopbackTriageSupportPayloadSchema, {
      ...canonicalN6LoopbackTriageSupportPayload({
        loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
        failure_scope: 'candidate_level',
        debate_escalation: null,
        upstream_rollback: {
          target_node_id: 'topic-selection.v1b.select-research-slice.v1',
          repair_action: 'select_different_slice',
          rationale: 'The selected ResearchSlice does not support a viable TopicQuestion.',
        },
      }),
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN8DebateAdmissionReviewSupportPayloadSchema, {
      ...canonicalDebateAdmissionSupportPayload(),
      provider_id: 'openai',
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN8FailedTrialSynthesisSupportPayloadSchema, {
      ...canonicalFailedTrialSynthesisSupportPayload(),
      draft_topic_package_ref: ref('draft_topic_package', 'package_001'),
    }),
    false,
  );
});

test('topic-selection v1b N8-N11 frozen payload and value draft schemas reject drift and side effects', async () => {
  const missingN7Handoff = canonicalN8Payload() as unknown as Record<string, unknown>;
  delete missingN7Handoff.n7_handoff_hash;
  assert.equal(await validatesBody(topicSelectionV1bN8HarnessFrozenInputPayloadSchema, missingN7Handoff), false);

  assert.equal(
    await validatesBody(topicSelectionV1bTopicValueAssessmentDraftPayloadSchema, {
      ...canonicalN8ValueDraftPayload(),
      provider_id: 'openai',
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bTopicValueAssessmentDraftPayloadSchema, {
      ...canonicalN8ValueDraftPayload(),
      draft_topic_package_ref: ref('topic_package', 'package_001'),
    }),
    false,
  );

  const missingMemoHash = canonicalN9Payload() as unknown as Record<string, unknown>;
  delete missingMemoHash.value_reasoning_memo_hash;
  assert.equal(await validatesBody(topicSelectionV1bN9HarnessFrozenInputPayloadSchema, missingMemoHash), false);

  const nonAdvanceN10 = canonicalN10Payload({
    advance_disposition: false,
  } as unknown as Partial<TopicSelectionV1bN10HarnessFrozenInputPayload>);
  assert.equal(await validatesBody(topicSelectionV1bN10HarnessFrozenInputPayloadSchema, nonAdvanceN10), false);

  const missingBundleHash = canonicalN11Payload() as unknown as Record<string, unknown>;
  delete missingBundleHash.v1c_input_bundle_hash;
  assert.equal(await validatesBody(topicSelectionV1bN11HarnessFrozenInputPayloadSchema, missingBundleHash), false);
  assert.equal(
    await validatesBody(topicSelectionV1bN11HarnessFrozenInputPayloadSchema, {
      ...canonicalN11Payload(),
      promotion_decision: {
        decision: 'promote',
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN11HarnessFrozenInputPayloadSchema, {
      ...canonicalN11Payload(),
      paper_project_ref: ref('paper_project', 'paper_project_001'),
    }),
    false,
  );
});

test('topic-selection v1b N1-N5 frozen payload schemas reject side-effect fields', async () => {
  assert.equal(
    await validatesBody(topicSelectionV1bN1HarnessFrozenInputPayloadSchema, {
      ...canonicalN1Payload(),
      authority_write: { unsafe: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN2HarnessFrozenInputPayloadSchema, {
      ...canonicalN2Payload(),
      raw_codex_output: { unsafe: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN3HarnessFrozenInputPayloadSchema, {
      ...canonicalN3Payload(),
      invoke_n4: true,
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN4HarnessFrozenInputPayloadSchema, {
      ...canonicalN4Payload(),
      live_provider_call: true,
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bN5HarnessFrozenInputPayloadSchema, {
      ...canonicalN5Payload(),
      create_research_slice: true,
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema, {
      ...canonicalN4DraftPayload(),
      authority_write: { unsafe: true },
    }),
    false,
  );
});

test('topic-selection v1b node policy registry validates full N1-N11 policy metadata', async () => {
  assert.equal(
    await validatesBody(
      topicSelectionV1bWorkflowHarnessNodePolicyRegistrySchema,
      TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
    ),
    true,
  );
  assert.equal(TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.length, 11);
  assert.equal(
    TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.every((policy) => policy.gate_id && policy.input_contract),
    true,
  );
  for (const policy of TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES) {
    for (const slot of policy.semantic_support_slots) {
      assert.equal(slot.allowed_profile_ids.includes(slot.default_profile_id), true);
      assert.equal(slot.allowed_run_modes.length > 0, true);
      assert.equal(slot.allowed_execution_modes.length > 0, true);
    }
  }
  const requiredModelDraftSlots = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
    .flatMap((policy) => policy.semantic_support_slots)
    .filter((slot) => slot.required_for_progress && slot.allowed_effect === 'model_draft_for_gate')
    .map((slot) => slot.slot_id);
  assert.deepEqual(requiredModelDraftSlots, [
    'n4_research_slice_option_draft',
    'n6_question_candidate_draft',
    'n8_value_assessment_draft',
  ]);
  const n7FailedTrialSlot = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
    .flatMap((policy) => policy.semantic_support_slots)
    .find((slot) => slot.slot_id === 'n7_failed_trial_synthesis');
  assert.equal(n7FailedTrialSlot?.required_for_progress, false);
  const n7Policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
    .find((policy) => policy.node_id === 'topic-selection.v1b.materialize-topic-question-contract.v1');
  assert.deepEqual(n7Policy?.allowed_input_contracts, ['N6ToN7Handoff@v1', 'N8ToN7Feedback@v1']);
  const n6Policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
    .find((policy) => policy.node_id === 'topic-selection.v1b.generate-topic-question-candidates.v1');
  assert.deepEqual(n6Policy?.loopback_target_codes, [
    'n6_regenerate_candidates',
    'n6_debate_escalation',
    'n6_loopback_to_n5_select_different_slice',
  ]);
  assert.deepEqual(
    n6Policy?.route_edges
      .filter((edge) => edge.route_decision === 'loopback')
      .map((edge) => [edge.route_id, edge.next_node_id]),
    [
      ['RB_N6_REGENERATE', 'topic-selection.v1b.generate-topic-question-candidates.v1'],
      ['RB_N6_DEBATE_ESCALATION', 'topic-selection.v1b.generate-topic-question-candidates.v1'],
      ['RB_N6_N5_SELECT_DIFFERENT_SLICE', 'topic-selection.v1b.select-research-slice.v1'],
    ],
  );
});

test('topic-selection v1b handoff schemas accept canonical handoffs for every policy edge', async () => {
  for (const kind of TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_HANDOFF_KINDS) {
    assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, canonicalHandoff(kind)), true, kind);
  }
});

test('topic-selection v1b handoff schema rejects missing authority hashes', async () => {
  const handoff = canonicalHandoff('N1ToN2Handoff') as unknown as Record<string, unknown>;
  delete (handoff.envelope as Record<string, unknown>).source_authority_hash;

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, handoff), false);
});

test('topic-selection v1b N6 handoff schema rejects missing admissible candidate refs', async () => {
  const handoff = canonicalHandoff('N6ToN7Handoff') as unknown as Record<string, unknown>;
  delete (handoff.payload as Record<string, unknown>).admissible_candidate_refs;

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, handoff), false);

  const emptyRefs = canonicalHandoff('N6ToN7Handoff') as unknown as Record<string, unknown>;
  (emptyRefs.payload as Record<string, unknown>).admissible_candidate_refs = [];

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, emptyRefs), false);
});

test('topic-selection v1b handoff schema rejects edge target route and payload mismatches', async () => {
  const wrongTarget = canonicalHandoff('N1ToN2Handoff') as unknown as Record<string, unknown>;
  wrongTarget.target_node_id = 'topic-selection.v1b.assess-topic-value.v1';
  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, wrongTarget), false);

  const wrongSource = canonicalHandoff('N4ToN5Handoff') as unknown as Record<string, unknown>;
  (wrongSource.envelope as Record<string, unknown>).source_node_id = 'topic-selection.v1b.create-intake-snapshot.v1';
  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, wrongSource), false);

  const wrongPayload = canonicalHandoff('N9ToN10Handoff') as unknown as Record<string, unknown>;
  (wrongPayload.payload as Record<string, unknown>).advance_disposition = false;
  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessHandoffSchema, wrongPayload), false);
});

test('topic-selection v1b N7 runtime context projection schema accepts route projections and rejects authority drift', async () => {
  assert.equal(
    await validatesBody(topicSelectionV1bN7RuntimeContextProjectionSchema, canonicalN7RuntimeContextProjection()),
    true,
  );
  assert.equal(
    await validatesBody(
      topicSelectionV1bN7RuntimeContextProjectionSchema,
      canonicalN7RuntimeContextProjection('v1b_n7_to_n6_failed_trial_loopback_context'),
    ),
    true,
  );

  const authorityDrift = canonicalN7RuntimeContextProjection() as unknown as Record<string, unknown>;
  authorityDrift.non_authority = false;
  assert.equal(await validatesBody(topicSelectionV1bN7RuntimeContextProjectionSchema, authorityDrift), false);

  const wrongRoute = canonicalN7RuntimeContextProjection('v1b_n7_to_n6_failed_trial_loopback_context') as unknown as Record<string, unknown>;
  wrongRoute.route_decision = 'invoke_next';
  assert.equal(await validatesBody(topicSelectionV1bN7RuntimeContextProjectionSchema, wrongRoute), false);
});

test('topic-selection v1b N6 runtime context projection schema accepts retry projection and rejects authority drift', async () => {
  assert.equal(
    await validatesBody(topicSelectionV1bN6RuntimeContextProjectionSchema, canonicalN6RuntimeContextProjection()),
    true,
  );

  // The gate-failure retry projection backs the divergent-debate escalation as well as the
  // single-agent regeneration loopback — the schema must accept the escalation target code.
  const escalationTarget = canonicalN6RuntimeContextProjection() as unknown as Record<string, unknown>;
  escalationTarget.loopback_target_code = 'n6_debate_escalation';
  assert.equal(await validatesBody(topicSelectionV1bN6RuntimeContextProjectionSchema, escalationTarget), true);

  const authorityDrift = canonicalN6RuntimeContextProjection() as unknown as Record<string, unknown>;
  authorityDrift.non_authority = false;
  assert.equal(await validatesBody(topicSelectionV1bN6RuntimeContextProjectionSchema, authorityDrift), false);

  const wrongTarget = canonicalN6RuntimeContextProjection() as unknown as Record<string, unknown>;
  wrongTarget.loopback_target_code = 'n6_loopback_to_n5_select_different_slice';
  assert.equal(await validatesBody(topicSelectionV1bN6RuntimeContextProjectionSchema, wrongTarget), false);
});

test('topic-selection v1b semantic support artifact schema rejects unknown slots wrong effects and raw payload leakage', async () => {
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact()),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      slot_id: 'unknown_slot' as TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['slot_id'],
    })),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      allowed_effect: 'support_only',
    })),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, {
      ...semanticArtifact(),
      raw_provider_response: { unsafe: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, {
      ...semanticArtifact(),
      surprise_provider_payload: { unsafe: true },
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, {
      ...semanticArtifact(),
      support_artifact_ref: {
        ...ref('artifact_ref', 'support_with_legacy'),
        legacy_ref: { raw_provider_response: true },
      },
    }),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    })),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      execution_mode: 'provider_llm',
      model_option_id: null,
    })),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      execution_mode: 'codex_assisted',
      model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-balanced`,
    })),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      runtime_provenance_class: 'runtime_verified',
      context_policy_profile_id: 'topic-selection.v1b.n7.candidate-grouping.context-runtime@v1',
      context_policy_profile_version: 'v1',
      context_policy_profile_hash: HASH_A,
      prompt_variant_key: 'n7_candidate_grouping',
      runtime_invocation_context_hash: HASH_B,
      redaction_policy: 'topic-selection-redacted-ref-backed-v1',
      source_hashes: { frozen_input_hash: HASH_C },
      runtime_audit_ref: ref('artifact_ref', 'runtime_audit_001'),
      runtime_audit_hash: HASH_D,
    })),
    true,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      runtime_provenance_class: 'runtime_verified',
      context_policy_profile_id: 'topic-selection.v1b.n7.candidate-grouping.context-runtime@v1',
      context_policy_profile_version: 'v1',
      context_policy_profile_hash: HASH_A,
      prompt_variant_key: 'n7_candidate_grouping',
      runtime_invocation_context_hash: HASH_B,
      redaction_policy: 'topic-selection-redacted-ref-backed-v1',
      source_hashes: { frozen_input_hash: HASH_C },
      runtime_audit_ref: ref('runtime_audit', 'runtime_audit_001'),
      runtime_audit_hash: HASH_D,
    })),
    false,
  );
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessSemanticSupportArtifactRefSchema, semanticArtifact({
      runtime_provenance_class: 'runtime_verified',
      context_policy_profile_id: null,
      source_hashes: {},
      runtime_audit_ref: null,
      runtime_audit_hash: null,
    })),
    false,
  );
});

test('topic-selection v1b v1c publication handoff rejects downstream side-effect payloads', async () => {
  assert.equal(
    await validatesBody(topicSelectionV1bWorkflowHarnessV1cPublicationHandoffSchema, canonicalV1cPublicationHandoff()),
    true,
  );
  const handoff = canonicalV1cPublicationHandoff() as unknown as Record<string, unknown>;
  (handoff.payload as Record<string, unknown>).bridge_creation_request = { requested: true };

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessV1cPublicationHandoffSchema, handoff), false);
});

test('topic-selection v1b workflow harness request schema rejects invalid node ids', async () => {
  const request = canonicalRequest() as unknown as Record<string, unknown>;
  request.node_id = 'topic-selection.v1b.unknown-node.v1';

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunRequestSchema, request), false);
});

test('topic-selection v1b workflow harness result schema rejects invalid gate statuses', async () => {
  const result = canonicalResult() as unknown as Record<string, unknown>;
  result.gate_status = 'success';

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunResultSchema, result), false);
});

test('topic-selection v1b workflow harness result schema rejects missing replay hash fields', async () => {
  const result = canonicalResult() as unknown as Record<string, unknown>;
  delete (result.hashes as Record<string, unknown>).runtime_admission_hash;

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunResultSchema, result), false);
});

test('topic-selection v1b workflow harness result schema rejects invalid replay provenance replay keys', async () => {
  const result = canonicalResult();
  result.replay_provenance = {
    replayed: true,
    node_replay_key: 'not-a-sha256-hash',
  };

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunResultSchema, result), false);
});

test('topic-selection v1b workflow harness request schema rejects non-provider model option ids', async () => {
  const request = canonicalRequest();
  request.execution_spec = {
    execution_mode: 'codex_assisted',
    model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-balanced`,
  };

  assert.equal(await validatesBody(topicSelectionV1bWorkflowHarnessRunRequestSchema, request), false);
});

// W-06 (T-127): the N8 provisional-thresholds product gate is held + formalized. This doubles as a
// tripwire — if anyone flips `provisional` to false before W-13 calibration, this fails.
test('N8 provisional-thresholds product gate (W-06) is held and formalized', () => {
  const n8 = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find(
    (policy) => policy.node_id === 'topic-selection.v1b.assess-topic-value.v1',
  );
  assert.ok(n8, 'N8 assess-topic-value policy exists');
  // Held until W-13 calibration — provisional must NOT be flipped early (T-127 D8).
  assert.equal(n8!.debate_trigger_thresholds?.provisional, true);
  // The node policy declares the tripwire code (lowercase policy convention); the harness emits its
  // uppercase form, pinned by the const assertion below.
  assert.ok(n8!.warning_codes.includes('n8_debate_thresholds_provisional'));
  // The formalized product-gate contract: non-blocking at the harness, requires a recorded sign-off.
  assert.equal(N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.warning_code, 'N8_DEBATE_THRESHOLDS_PROVISIONAL');
  assert.equal(N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.harness_blocking, false);
  assert.equal(N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.requires_stakeholder_sign_off, true);
  // W-16 (T-128): the flag now points at the concrete record contract.
  assert.equal(N8_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.sign_off_contract, 'TopicSelectionStakeholderSignOff@v1');
});

// W-07 (T-127): the N6 provisional-thresholds product gate is held + formalized, mirroring N8. This
// doubles as a tripwire — if anyone flips `provisional` to false before W-13 calibration, this fails.
test('N6 provisional-thresholds product gate (W-07) is held and formalized', () => {
  const n6 = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find(
    (policy) => policy.node_id === 'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  assert.ok(n6, 'N6 generate-topic-question-candidates policy exists');
  // Held until W-13 calibration — provisional must NOT be flipped early (T-127 D8).
  assert.equal(n6!.n6_debate_trigger_thresholds?.provisional, true);
  // Advisory-only: drives no harness compute, so the thresholds carry escalation hints, not gate cut-offs.
  assert.equal(n6!.n6_debate_trigger_thresholds?.weak_blocked_count_min, 2);
  assert.equal(n6!.n6_debate_trigger_thresholds?.admissible_candidate_floor, 1);
  // The node policy declares the tripwire code (lowercase policy convention); the harness emits its
  // uppercase form, pinned by the const assertion below.
  assert.ok(n6!.warning_codes.includes('n6_debate_thresholds_provisional'));
  // The formalized product-gate contract: non-blocking at the harness, requires a recorded sign-off.
  assert.equal(N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.warning_code, 'N6_DEBATE_THRESHOLDS_PROVISIONAL');
  assert.equal(N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.harness_blocking, false);
  assert.equal(N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.requires_stakeholder_sign_off, true);
  // W-16 (T-128): the flag now points at the concrete record contract.
  assert.equal(N6_DEBATE_THRESHOLDS_PROVISIONAL_PRODUCT_GATE.sign_off_contract, 'TopicSelectionStakeholderSignOff@v1');
});

// --- T-128 W-16: stakeholder sign-off record schema -----------------------------------------

function canonicalRunOverrideSignOff(): Record<string, unknown> {
  return {
    schema_version: 'TopicSelectionStakeholderSignOff@v1',
    sign_off_id: 'sign_off_run_override_001',
    sign_off_scope: 'provisional_threshold_run_override',
    gate_warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL',
    signed_by: { actor_type: 'human', actor_id: 'stakeholder_alice' },
    signed_at: '2026-07-03T12:00:00.000Z',
    rationale: 'Acknowledged: this product run proceeded past N8 under provisional thresholds.',
    workflow_run_id: 'workflow_run_001',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    node_attempt_id: 'node_attempt_workflow_run_001_assess_topic_value_v1_1',
  };
}

function canonicalGateReleaseSignOff(): Record<string, unknown> {
  return {
    schema_version: 'TopicSelectionStakeholderSignOff@v1',
    sign_off_id: 'sign_off_gate_release_001',
    sign_off_scope: 'calibration_gate_release',
    gate_warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL',
    signed_by: { actor_type: 'human', actor_id: 'stakeholder_alice' },
    signed_at: '2026-07-03T12:00:00.000Z',
    rationale: 'Calibration met the release bar; authorizing the provisional flip as a separate reviewed edit.',
    calibration_evidence: {
      labeled_sample_count: 128,
      providers: ['openai', 'dashscope'],
      false_positive_rate: 0.032,
      per_provider_leak_checked: true,
      assessor: {
        independent: true,
        actor: { actor_type: 'human', actor_id: 'assessor_bob' },
      },
      corpus_ref: {
        ref_type: 'calibration_corpus',
        ref_id: 'corpus_001',
        version_id: 'v1',
        title_card_id: null,
      },
      calibration_report_ref: {
        ref_type: 'calibration_report',
        ref_id: 'report_001',
        version_id: 'v1',
        title_card_id: null,
      },
    },
  };
}

test('stakeholder sign-off schema accepts both canonical scopes (W-16)', async () => {
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, canonicalRunOverrideSignOff()), true);
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, canonicalGateReleaseSignOff()), true);
});

test('stakeholder sign-off schema encodes the calibration release bar structurally (W-16)', async () => {
  // Under-bar corpus: 99 labeled samples.
  const underBar = canonicalGateReleaseSignOff();
  (underBar.calibration_evidence as Record<string, unknown>).labeled_sample_count = 99;
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, underBar), false);

  // False-positive rate must be STRICTLY below 0.05.
  const fpAtBound = canonicalGateReleaseSignOff();
  (fpAtBound.calibration_evidence as Record<string, unknown>).false_positive_rate = 0.05;
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, fpAtBound), false);

  // Multi-provider means at least two DISTINCT providers (F6: two, not assumed three).
  const singleProvider = canonicalGateReleaseSignOff();
  (singleProvider.calibration_evidence as Record<string, unknown>).providers = ['openai'];
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, singleProvider), false);
  const dupProviders = canonicalGateReleaseSignOff();
  (dupProviders.calibration_evidence as Record<string, unknown>).providers = ['openai', 'openai'];
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, dupProviders), false);

  // The assessor must be independent — a non-independent assessor cannot validate.
  const dependentAssessor = canonicalGateReleaseSignOff();
  ((dependentAssessor.calibration_evidence as Record<string, unknown>).assessor as Record<string, unknown>).independent = false;
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, dependentAssessor), false);

  // The leak check is a hard prerequisite (a global 'separates' must not hide a provider leak).
  const leakUnchecked = canonicalGateReleaseSignOff();
  (leakUnchecked.calibration_evidence as Record<string, unknown>).per_provider_leak_checked = false;
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, leakUnchecked), false);
});

test('stakeholder sign-off schema is strict: unknown keys, cross-scope fields, and non-human signers reject (W-16)', async () => {
  // Unknown top-level key.
  const extraTop = { ...canonicalRunOverrideSignOff(), flips_provisional: true };
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, extraTop), false);

  // Unknown nested key inside calibration_evidence.
  const extraNested = canonicalGateReleaseSignOff();
  (extraNested.calibration_evidence as Record<string, unknown>).auto_flip = true;
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, extraNested), false);

  // Cross-scope mixing: a release record carrying run-override fields is not a valid shape.
  const mixed = { ...canonicalGateReleaseSignOff(), workflow_run_id: 'workflow_run_001' };
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, mixed), false);

  // A run-override without its run anchor is not a valid shape.
  const { workflow_run_id: _omit, ...noRunId } = canonicalRunOverrideSignOff();
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, noRunId), false);

  // Only a HUMAN signer can sign off.
  const llmSigner = canonicalRunOverrideSignOff();
  (llmSigner.signed_by as Record<string, unknown>).actor_type = 'llm';
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, llmSigner), false);

  // Unknown gate warning code rejects.
  const wrongGate = canonicalRunOverrideSignOff();
  wrongGate.gate_warning_code = 'SOME_OTHER_GATE';
  assert.equal(await validatesBody(topicSelectionStakeholderSignOffSchema, wrongGate), false);
});

test('loopback-budget raise schema is strict and hard-caps raised_to at 5 (W-15 O-2)', async () => {
  const canonical = () => ({
    schema_version: 'TopicSelectionLoopbackBudgetRaise@v1',
    raise_id: 'raise_001',
    workflow_run_id: 'workflow_run_001',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    raised_to: 3,
    rationale: 'One more regeneration round is warranted for this run.',
    raised_by: { actor_type: 'human', actor_id: 'operator_alice' },
    raised_at: '2026-07-03T12:30:00.000Z',
  });
  assert.equal(await validatesBody(topicSelectionLoopbackBudgetRaiseSchema, canonical()), true);

  // The spec's hard ceiling is structural: 6 cannot validate; neither can 0 or a fraction.
  assert.equal(await validatesBody(topicSelectionLoopbackBudgetRaiseSchema, { ...canonical(), raised_to: 6 }), false);
  assert.equal(await validatesBody(topicSelectionLoopbackBudgetRaiseSchema, { ...canonical(), raised_to: 0 }), false);
  assert.equal(await validatesBody(topicSelectionLoopbackBudgetRaiseSchema, { ...canonical(), raised_to: 2.5 }), false);
  // Human-only, strict keys.
  assert.equal(
    await validatesBody(topicSelectionLoopbackBudgetRaiseSchema, {
      ...canonical(),
      raised_by: { actor_type: 'llm', actor_id: 'bot' },
    }),
    false,
  );
  assert.equal(await validatesBody(topicSelectionLoopbackBudgetRaiseSchema, { ...canonical(), auto_apply: true }), false);
});
