import assert from 'node:assert/strict';
import test from 'node:test';
import { Ajv } from 'ajv';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from './llm-gateway.js';
import {
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema,
  topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema,
  topicSelectionV1bTopicValueAssessmentDraftPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  type TopicSelectionResourceSamplingLlmOutput,
  topicSelectionResourceSamplingLlmOutputSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-resource-sampling-contracts';
import type { TopicSelectionAgentRunMode } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import { BackendLlmGateway } from './llm-gateway.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
  TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
  TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID,
} from './topic-selection-model-profile-registry-service.js';
import {
  TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
  type TopicSelectionV1cDownstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import {
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
  type TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
  type TopicSelectionV1cN2BoundedDebateRoleOutput,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';
import {
  TopicSelectionProviderCanaryService,
  type TopicSelectionProviderCanaryCandidateDraftBatch,
  type TopicSelectionProviderCanaryLiveRequiredEvidence,
  type TopicSelectionProviderCanaryProviderId,
} from './topic-selection-provider-canary-service.js';
import {
  TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
  TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
} from './topic-selection-resource-sampling-service.js';

class StubProviderCanaryGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = providerCanaryOutput(request);
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetry(request),
    };
  }
}

class MinimalN2ProviderCanaryGateway extends StubProviderCanaryGateway {
  override async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    if (request.schemaName !== 'topic_selection_v1c_n2_provider_canary_role') {
      return super.createStructuredOutput<T>(request);
    }
    this.calls.push(request);
    const slot = n2SlotFromRequest(request);
    const output = {
      schema_version: slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final
        ? TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION
        : TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
    };
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetry(request),
    };
  }
}

class MinimalN6ProviderCanaryGateway extends StubProviderCanaryGateway {
  override async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    if (request.schemaName !== 'topic_selection_v1c_n6_feedback_canary') {
      return super.createStructuredOutput<T>(request);
    }
    this.calls.push(request);
    const output = {
      schema_version: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
      paper_project_bridge_id: 'paper_project_bridge_provider_canary_001',
    };
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetry(request),
    };
  }
}

class MinimalN4ProviderCanaryGateway extends StubProviderCanaryGateway {
  override async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    if (request.schemaName !== 'topic_selection_v1c_n4_decision_canary') {
      return super.createStructuredOutput<T>(request);
    }
    this.calls.push(request);
    const output = {
      schema_version: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
      promotion_gate_check_id: 'promotion_gate_check_provider_canary_001',
    };
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetry(request),
    };
  }
}

class MinimalResourceSamplingProviderCanaryGateway extends StubProviderCanaryGateway {
  override async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    if (request.schemaName !== 'topic_selection_resource_sampling_canary') {
      return super.createStructuredOutput<T>(request);
    }
    this.calls.push(request);
    const output = {
      classifications: [
        {
          literature_ref: functionalRef('literature', 'provider_canary_literature_001'),
        },
      ],
    };
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetry(request),
    };
  }
}

function providerCanaryOutput(request: LlmStructuredOutputRequest) {
  if (request.schemaName === 'topic_selection_v1c_n2_provider_canary_role') {
    return v1cN2CanaryOutput(request);
  }
  if (request.schemaName === 'topic_selection_v1c_n4_decision_canary') {
    return v1cN4CanaryOutput();
  }
  if (request.schemaName === 'topic_selection_v1c_n6_feedback_canary') {
    return v1cN6CanaryOutput();
  }
  if (request.schemaName === 'topic_selection_v1b_n4_provider_canary_draft') {
    return v1bN4CanaryOutput();
  }
  if (request.schemaName === 'topic_selection_v1b_n6_provider_canary_draft') {
    return v1bN6CanaryOutput();
  }
  if (request.schemaName === 'topic_selection_v1b_n8_provider_canary_draft') {
    return v1bN8CanaryOutput();
  }
  if (request.schemaName === 'topic_selection_resource_sampling_canary') {
    return resourceSamplingCanaryOutput();
  }
  return v1aCanaryOutput(request);
}

function v1aCanaryOutput(request: LlmStructuredOutputRequest): TopicSelectionProviderCanaryCandidateDraftBatch {
  return {
    batch_id: `canary_batch_${request.model.providerId}`,
    drafts: [
      {
        draft_id: 'draft_canary_001',
        candidate_need: 'provider live invocation canary',
      },
    ],
  };
}

function resourceSamplingCanaryOutput(): TopicSelectionResourceSamplingLlmOutput {
  return {
    classifications: [
      {
        literature_ref: functionalRef('literature', 'provider_canary_literature_001'),
        primary_role: 'support',
        topic_relevance: 0.91,
        evidence_polarity: 'positive_method',
        role_scores: {
          support: 0.91,
          challenge: 0.05,
          baseline: 0.15,
          context: 0.35,
          review: 0.05,
          excluded: 0,
        },
        confidence: 0.86,
        classification_rationale:
          'Synthetic resource-sampling provider canary classification preserves provider-live runtime semantics.',
        exclusion_reason: null,
        review_reason: null,
        method_families: ['runtime_evaluation'],
      },
    ],
  };
}

function v1cN2CanaryOutput(request: LlmStructuredOutputRequest): TopicSelectionV1cN2BoundedDebateRoleOutput {
  const slot = n2SlotFromRequest(request);
  const evidenceRef = functionalRef('evidence_unit', 'provider_canary_evidence_001');
  const riskRef = functionalRef('accepted_risk', 'provider_canary_accepted_risk_001');
  const recheckRef = functionalRef('recheck_request', 'provider_canary_recheck_001');
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_draft) {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      support_summary: 'Synthetic provider canary support draft for N2 runtime semantics.',
      support_points: [{
        point_id: 'provider_canary_support_point_001',
        point: 'The provider call is live while the prompt packet may be reused.',
        source_refs: [evidenceRef],
      }],
      risk_acknowledgements: [{ risk_ref: riskRef, handling: 'Carry forward as non-authority canary evidence.' }],
      recheck_obligations: [{ recheck_ref: recheckRef, handling: 'Carry forward without creating recheck authority.' }],
    };
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.reviewer_critic_review) {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      critic_findings: [{
        finding_id: 'provider_canary_finding_001',
        severity: 'warning',
        issue: 'Provider output remains non-authority and must preserve response non-reuse semantics.',
        required_resolution: 'The synthesizer final must retain the provider-live runtime boundary.',
        source_refs: [evidenceRef],
      }],
      required_repairs: ['Preserve provider-live response non-reuse and ref-backed context boundaries.'],
    };
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_repair) {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      repaired_summary: 'Synthetic repair preserves the provider-live runtime boundary.',
      accepted_findings: ['provider_canary_finding_001'],
      rebutted_findings: [],
      repair_actions: [{
        finding_id: 'provider_canary_finding_001',
        resolution_status: 'accepted_and_repaired',
        repair_note: 'Explicitly retained null response reuse and prompt-cache-only reuse semantics.',
        source_refs: [evidenceRef],
      }],
    };
  }
  return {
    schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
    role_slot: slot,
    final_support_summary: 'Synthetic final support validates N2 provider-live runtime semantics.',
    dossier_markdown: 'Prompt packet reuse is allowed, provider response reuse remains blocked, and output is non-authority.',
    reviewer_questions: ['Does deterministic admission still own promotion support authority?'],
    risk_notes: [{ risk_ref: riskRef, note: 'Synthetic provider canary output is non-authority.' }],
    recheck_notes: [{ recheck_ref: recheckRef, note: 'No recheck authority is created by the provider output.' }],
    n3_semantic_layer: {
      claim_ceiling_alignment: {
        status: 'addressed',
        summary: 'Runtime-only claim; no topic quality authority.',
        source_refs: [evidenceRef],
      },
      contribution_summary: {
        status: 'addressed',
        summary: 'Provider canary validates runtime provenance only.',
        source_refs: [evidenceRef],
      },
      evaluation_plan_summary: {
        status: 'addressed',
        summary: 'Evaluate prompt-cache telemetry and null response reuse refs.',
        source_refs: [evidenceRef],
      },
      evidence_support_map: {
        status: 'addressed',
        evidence_refs: [evidenceRef],
      },
      accepted_risk_acknowledgements: {
        status: 'addressed',
        risk_refs: [riskRef],
      },
      recheck_obligation_summary: {
        status: 'addressed',
        recheck_refs: [recheckRef],
      },
      critic_finding_resolution_map: [{
        finding_id: 'provider_canary_finding_001',
        resolution_status: 'accepted_and_repaired',
        resolution_note: 'Provider output remains non-authority and response reuse remains null.',
        source_refs: [evidenceRef],
      }],
      readiness_coverage_items: [
        { slot: 'provider_live_non_reuse', status: 'addressed', source_refs: [evidenceRef] },
      ],
    },
  };
}

function v1cN6CanaryOutput(): TopicSelectionV1cDownstreamFeedbackCandidate {
  const bridgeRef = functionalRef('paper_project_bridge', 'provider_canary_bridge_001');
  const downstreamSourceRef = functionalRef('reviewer_check', 'provider_canary_reviewer_check_001');
  const reviewCommentRef = functionalRef('review_comment', 'provider_canary_review_comment_001');
  const blockerRef = functionalRef('topic_selection_blocker', 'provider_canary_blocker_001');
  const artifactRef = functionalRef('artifact_ref', 'provider_canary_feedback_artifact_001');
  const affectedRef = functionalRef('validated_need', 'provider_canary_validated_need_001');
  return {
    schema_version: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
    paper_project_bridge_id: 'paper_project_bridge_provider_canary_001',
    workspace_id: 'workspace_provider_canary',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: downstreamSourceRef,
    source_feedback_refs: [reviewCommentRef],
    observed_blocker_refs: [blockerRef],
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary:
      'Synthetic N6 provider canary feedback invalidates the promoted need for runtime-only validation.',
    required_action: 'Recheck the validated need before downstream work continues.',
    artifact_refs: [artifactRef],
    feedback_payload: {
      canary: true,
      non_authority: true,
      provider_live_required: true,
    },
    normalization_hints: {
      requires_recheck_hint: true,
      loopback_target_hint: 'validated_need',
      affected_ref_hint: affectedRef,
      reason_codes: ['need_invalidated'],
    },
    cited_refs: [bridgeRef, downstreamSourceRef, affectedRef],
    no_upstream_mutation_confirmed: true,
  };
}

function v1cN4CanaryOutput(): TopicSelectionV1cDelegatedPromotionDecisionCandidate {
  const gateRef = functionalRef('promotion_gate_check', 'provider_canary_gate_check_001');
  const snapshotRef = functionalRef('promotion_input_snapshot', 'provider_canary_snapshot_001');
  const supportRef = functionalRef('promotion_decision_support', 'provider_canary_support_001');
  const topicPackageRef = functionalRef('topic_package', 'provider_canary_topic_package_001');
  const conditionAction = {
    action_code: 'clarify_contribution_claim',
    severity: 'warning' as const,
    loopback_target: 'package' as const,
    refs: [topicPackageRef],
    reason: 'Clarify contribution wording before bridge materialization.',
  };
  return {
    schema_version: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
    promotion_gate_check_id: 'promotion_gate_check_provider_canary_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_provider_canary_001',
    promotion_input_snapshot_hash: 'a'.repeat(64),
    workspace_id: 'workspace_provider_canary',
    title_card_id: 'title_card_provider_canary',
    decision: 'promote_with_conditions',
    rationale:
      'Synthetic N4 provider canary candidate validates provider-live runtime semantics without authority writes.',
    confirmed_snapshot_hash: 'a'.repeat(64),
    conditions: [{
      condition_id: 'promotion_condition_provider_canary_001',
      condition_code: 'clarify_contribution_claim',
      owner: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      required_action: conditionAction,
      refs: [topicPackageRef],
      early_check_obligations: ['Re-check contribution wording before outline lock.'],
      verification_note: 'Condition is reviewer-visible and non-authority until human acceptance.',
    }],
    required_actions: [],
    loopback_target: null,
    allowed_refinements: [],
    stop_conditions: [],
    reopen_conditions: [],
    cited_refs: [gateRef, snapshotRef, topicPackageRef],
    decision_support_refs: [gateRef, snapshotRef, supportRef],
    no_authority_write_confirmed: true,
    no_bridge_creation_confirmed: true,
    human_review_required: true,
  };
}

function n2SlotFromRequest(request: LlmStructuredOutputRequest): TopicSelectionV1cN2BoundedDebateRoleSlotId {
  const content = request.messages.find((message) => message.role === 'user')?.content ?? '';
  return TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER.find((candidate) => content.includes(candidate))
    ?? TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_draft;
}

function functionalRef(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_provider_canary',
    version_id: null,
  };
}

function v1bN4CanaryOutput(): TopicSelectionV1bResearchSliceOptionSetDraftPayload {
  const evidenceRef = functionalRef('evidence_unit', 'provider_canary_evidence_001');
  const needRef = functionalRef('validated_need', 'provider_canary_need_001');
  return {
    recommended_option_key: 'provider_canary_slice',
    comparison_axes: ['runtime provenance', 'evidence traceability'],
    comparison_summary:
      'The synthetic slice is suitable only for validating N4 provider-live prompt-cache semantics.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [
      {
        option_key: 'provider_canary_slice',
        source_validated_need_refs: [needRef],
        slice_statement:
          'Validate provider-live runtime semantics for v1b N4 research-slice option drafting.',
        problem_space: 'Runtime provenance and prompt-cache behavior in topic selection.',
        target_setting: 'Local-first CS paper engineering assistant workflows.',
        target_community: 'LLM systems researchers',
        included_boundaries: ['N4 provider canary prompt-cache and token-budget semantics'],
        excluded_boundaries: ['business authority creation', 'topic promotion decision', 'full paper implementation'],
        contribution_type_candidate: 'workflow_system',
        support_evidence_refs: [evidenceRef],
        challenge_evidence_refs: [evidenceRef],
        baseline_evidence_refs: [evidenceRef],
        context_evidence_refs: [evidenceRef],
        resource_assumptions: ['The canary uses synthetic ref-backed runtime evidence only.'],
        data_assumptions: ['No business corpus data is used as authority in this canary.'],
        evaluation_path:
          'Run the provider canary twice and verify prompt packet reuse does not become provider response reuse.',
        baseline_assumptions: ['A transport-only provider check is insufficient for N4 runtime semantics.'],
        hard_blockers: [],
        dependency_risks: ['Provider structured output behavior may drift.'],
        slice_budget: { max_nodes: 1 },
        expected_claim:
          'The shared runtime can keep v1b N4 provider-required calls live while reusing prompt packet metadata.',
        fallback_claim: 'The canary validates N4 provider transport and runtime provenance only.',
        observable_success_criteria: ['two provider calls occur', 'response reuse refs remain null'],
        main_risks: ['Synthetic provider canary output is non-authority.'],
        baseline_risk: 'medium',
        execution_risk: 'medium',
        scope_risk: 'low',
        claim_ceiling_alignment: {
          status: 'aligned',
          rationale: 'The claim is bounded to runtime semantics and auditability.',
          confidence: 0.78,
        },
        confidence: 0.8,
        requires_human_review: false,
        human_review_triggers: [],
        details_payload: {
          canary: true,
          non_authority: true,
        },
      },
    ],
  };
}

function v1bN6CanaryOutput(): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload {
  const evidenceRef = functionalRef('evidence_unit', 'provider_canary_evidence_001');
  const boundaryRef = functionalRef('research_slice_boundary', 'provider_canary_boundary_001');
  const needRef = functionalRef('validated_need', 'provider_canary_need_001');
  return {
    question_frame: {
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'LLM systems researchers',
      object_scope: 'v1b N6 provider live invocation canary',
      task_scope: 'topic-question candidate generation and runtime provenance checks',
      intervention_or_approach: 'Shared runtime provider canary over AgentOrchestrator and BackendLlmGateway',
      comparison_baseline: 'transport-only provider canary without the N6 output contract',
      observable_outcome: 'valid structured TopicQuestionCandidateSetDraft output and live provider telemetry',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: {
        canary: true,
        non_authority: true,
      },
    },
    recommended_candidate_keys: ['provider_canary_candidate'],
    generation_notes: ['Synthetic canary draft for provider/runtime validation only.'],
    human_review_triggers: [],
    candidates: [
      {
        candidate_key: 'provider_canary_candidate',
        main_question:
          'How can a shared LLM runtime preserve provider-live semantics for v1b N6 topic-question generation?',
        sub_questions: [
          'Which prompt-cache and token-budget signals must remain auditable before deterministic N6 gates run?',
        ],
        question_type: 'system',
        contribution_hypothesis: 'system',
        source_validated_need_refs: [needRef],
        answerability_plan: {
          datasets_or_resources: ['provider canary trace fixtures'],
          metrics: ['provider call count', 'prompt packet hash equality', 'response reuse absence'],
          baselines: ['transport-only canary'],
          ablations_or_comparisons: ['prompt cache hit without response reuse'],
          evaluation_setting: 'local/dev provider canary execution',
          dependency_risks: ['provider structured output behavior may drift'],
          open_dependencies: [],
          known_gaps: [],
          required_evidence_refs: [evidenceRef],
        },
        answerability_verdict: 'answerable',
        expected_claim:
          'The shared runtime can keep provider-required calls live while reusing prompt packet metadata.',
        fallback_claim: 'The canary validates provider transport and runtime provenance for N6.',
        max_claim_strength: 'Bounded workflow-runtime claim only.',
        observable_success_criteria: ['two provider calls occur', 'response reuse refs remain null'],
        boundary_check: {
          preserved_boundary_refs: [boundaryRef],
          excluded_boundary_refs: [],
          boundary_violations: [],
          prohibited_claims: ['business authority creation', 'topic promotion decision'],
          allowed_refinements: ['tighten canary wording'],
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
            severity: 'hard',
            statement: 'If response reuse is non-null, the provider-live runtime claim is false.',
            trigger_evidence_refs: [evidenceRef],
            trigger_source_refs: [needRef],
            related_contract_fields: ['response_reuse_refs'],
            expected_action: 'lower_claim_strength',
            check_timing: 'before_value_assessment',
            confidence: 'high',
          },
        ],
        risk_notes: ['Synthetic provider canary output is non-authority.'],
        blockers: [],
        objections: [],
        human_review_triggers: [],
        confidence: 0.8,
      },
    ],
  };
}

function v1bN8CanaryOutput(): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const contractRef = functionalRef('topic_question_contract', 'provider_canary_contract_001');
  const evidenceRef = functionalRef('evidence_unit', 'provider_canary_evidence_001');
  return {
    readiness_status: 'ready_with_accepted_risk',
    strongest_claim_if_success:
      'The shared runtime can keep N8 provider-required calls live while preserving prompt-cache provenance.',
    fallback_claim_if_success: 'The canary validates N8 provider transport and runtime provenance only.',
    hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
      gate_key: gateKey,
      verdict: gateKey === 'answerability_sanity' ? 'pass_with_risk' : 'pass',
      severity: gateKey === 'answerability_sanity' ? 'warning' : 'info',
      overridable_with_risk: gateKey === 'answerability_sanity',
      rationale: `${gateKey} is satisfied for the synthetic non-authority N8 provider canary.`,
      refs: [contractRef],
    })),
    dimension_scores: TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
      dimension_key: dimensionKey,
      score: dimensionKey === 'reviewer_risk' ? 72 : 80,
      rationale: `${dimensionKey} is adequate for a synthetic provider/runtime canary.`,
      evidence_refs: [evidenceRef],
      uncertainty: 'medium',
    })),
    risk_penalty: {
      residual_risk: 'provider output quality may drift and remains non-authority',
    },
    reviewer_objections: ['Synthetic provider canary output is not business authority.'],
    ceiling_case: 'The canary can show provider-live runtime semantics, not topic value.',
    base_case: 'The canary validates prompt cache and provider telemetry separation for N8.',
    floor_case: 'The canary still blocks unsafe over-budget provider execution.',
    recommended_disposition: 'advance_to_package',
    total_score: 76,
    value_summary:
      'The synthetic N8 canary is value-positive only as runtime evidence for prompt-cache/provider semantics.',
    confidence: 0.78,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Provider response reuse must remain null for this canary.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'The N8 provider canary is useful because it verifies provider-live behavior at the value-draft slot.',
      significance: 'It gives workflow agents evidence that prompt packet reuse does not become response reuse.',
      originality: 'The canary targets N8 value-draft runtime provenance rather than generic provider transport.',
      claim_leverage: 'The claim is bounded to runtime semantics and auditability.',
      reviewer_risks: ['Synthetic output does not prove topic quality.'],
      effort_to_value: 'The canary has high diagnostic value for low implementation effort.',
      strategic_fit: 'It supports reviewer-aligned workflow robustness checks.',
      negative_memory_check: 'No negative memory is allowed to become standalone evidence.',
      evidence_backed_rationale: 'Prompt hashes, cache metadata, and provider telemetry are ref-backed runtime evidence.',
      top_objections: ['Provider output may require normalization in full workflow runs.'],
      uncertainty: 'Medium uncertainty remains for live provider schema drift.',
      disposition_bridge: 'Use this only as non-authority provider/runtime evidence.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [contractRef, evidenceRef],
    },
  };
}

function telemetry(request: LlmStructuredOutputRequest): LlmCallTelemetry {
  return {
    provider_id: request.model.providerId,
    model_id: request.model.modelId,
    profile_id: request.model.profileId ?? null,
    prompt_template_id: request.prompt.promptTemplateId,
    prompt_template_version: request.prompt.version,
    elapsed_ms: 10,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: 64,
    output_tokens: 24,
    embedding_input_tokens: null,
    total_tokens: 88,
    cost_usd: null,
    provider_side_cache_hit: true,
    provider_side_cache_read_tokens: 32,
    provider_side_cache_write_tokens: 8,
  };
}

function makeCanaryService(options: {
  llmGateway?: StubProviderCanaryGateway | BackendLlmGateway;
  runMode?: TopicSelectionAgentRunMode;
} = {}) {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => '2026-05-30T00:00:00.000Z',
  });
  return new TopicSelectionProviderCanaryService({
    controlPlane,
    llmGateway: options.llmGateway,
    runMode: options.runMode,
    now: () => '2026-05-30T00:00:00.000Z',
  });
}

async function assertProductTierLiveRequiredCanary(
  runCanary: (
    service: TopicSelectionProviderCanaryService,
  ) => Promise<TopicSelectionProviderCanaryLiveRequiredEvidence>,
  expected: {
    providerId: TopicSelectionProviderCanaryProviderId;
    modelOptionId: string;
  },
): Promise<TopicSelectionProviderCanaryLiveRequiredEvidence> {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway, runMode: 'product' });

  const result = await runCanary(service);

  assert.equal(result.run_mode, 'product', liveRequiredDiagnostic(result));
  assert.equal(result.provider_id, expected.providerId);
  assert.equal(result.model_option_id, expected.modelOptionId);
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  return result;
}

function liveRequiredDiagnostic(result: TopicSelectionProviderCanaryLiveRequiredEvidence): string {
  return JSON.stringify({
    provider_id: result.provider_id,
    model_option_id: result.model_option_id,
    provider_call_count: result.provider_call_count,
    first_status: result.first_status,
    second_status: result.second_status,
    first_error_code: result.first_error_code,
    second_error_code: result.second_error_code,
    first_blocker_codes: result.first_blocker_codes,
    second_blocker_codes: result.second_blocker_codes,
    first_warning_codes: result.first_warning_codes,
    second_warning_codes: result.second_warning_codes,
    first_token_budget_gate_decision: result.first_token_budget_gate_decision,
    second_token_budget_gate_decision: result.second_token_budget_gate_decision,
  });
}

function assertLiveRequiredSucceeded(result: TopicSelectionProviderCanaryLiveRequiredEvidence): void {
  assert.equal(result.first_status, 'succeeded', liveRequiredDiagnostic(result));
  assert.equal(result.second_status, 'succeeded', liveRequiredDiagnostic(result));
}

function expectedModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.${suffix}`;
}

function expectedV1bN4ModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID}.${suffix}`;
}

function expectedV1bN6ModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID}.${suffix}`;
}

function expectedV1bN8ModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID}.${suffix}`;
}

function expectedV1cN2ModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID}.${suffix}`;
}

function expectedV1cN6ModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID}.${suffix}`;
}

function expectedV1cN4ModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID}.${suffix}`;
}

function expectedResourceSamplingModelOptionId(providerId: TopicSelectionProviderCanaryProviderId): string {
  const suffix = providerId === 'openai'
    ? 'openai-balanced'
    : 'dashscope-thinking-budget';
  return `${TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID}.${suffix}`;
}

function expectedV1cN2ContextPolicyProfileId(slot: TopicSelectionV1cN2BoundedDebateRoleSlotId): string {
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_draft) {
    return TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.promotion_supporter_draft;
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.reviewer_critic_review) {
    return TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.reviewer_critic_review;
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_repair) {
    return TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.promotion_supporter_repair;
  }
  return TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.synthesizer_final;
}

function expectedV1cN6ContextPolicyProfileId(): string {
  return TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS.downstream_feedback_normalization;
}

function expectedV1cN4ContextPolicyProfileId(): string {
  return TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS.delegated_promotion_decision_candidate;
}

function expectedResourceSamplingContextPolicyProfileId(): string {
  return TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS.literature_classification_batch;
}

function assertV1bN8PromptCacheLiveRequiredResult(
  result: Awaited<ReturnType<TopicSelectionProviderCanaryService['runV1bN8PromptCacheLiveRequiredCanary']>>,
  providerId: TopicSelectionProviderCanaryProviderId,
) {
  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedV1bN8ModelOptionId(providerId));
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[0]?.provider_id, providerId);
  assert.equal(result.telemetry[1]?.provider_id, providerId);
}

async function assertPromptCacheLiveRequiredCanary(providerId: TopicSelectionProviderCanaryProviderId) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runPromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedModelOptionId(providerId));
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[1]!.provider_side_cache_hit, true);
  assert.equal(result.telemetry[1]!.provider_side_cache_read_tokens, 32);
}

async function assertV1bN4PromptCacheLiveRequiredCanary(providerId: TopicSelectionProviderCanaryProviderId) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN4PromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedV1bN4ModelOptionId(providerId));
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, 'topic-selection-v1b-n4-provider-canary-live-required');
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_v1b_n4_provider_canary_draft');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.deepEqual(gateway.calls[0]!.schema, topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema);
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[1]!.provider_side_cache_hit, true);
}

async function assertV1bN6PromptCacheLiveRequiredCanary(providerId: TopicSelectionProviderCanaryProviderId) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN6PromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedV1bN6ModelOptionId(providerId));
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, 'topic-selection-v1b-n6-provider-canary-live-required');
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_v1b_n6_provider_canary_draft');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.deepEqual(gateway.calls[0]!.schema, topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema);
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[1]!.provider_side_cache_hit, true);
}

async function assertV1bN8PromptCacheLiveRequiredCanary(providerId: TopicSelectionProviderCanaryProviderId) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN8PromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assertV1bN8PromptCacheLiveRequiredResult(result, providerId);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, 'topic-selection-v1b-n8-provider-canary-live-required');
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_v1b_n8_provider_canary_draft');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.deepEqual(gateway.calls[0]!.schema, topicSelectionV1bTopicValueAssessmentDraftPayloadSchema);
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
  assert.equal(result.telemetry[1]!.provider_side_cache_hit, true);
}

async function assertV1cN2PromptCacheLiveRequiredCanary(
  providerId: TopicSelectionProviderCanaryProviderId,
  slot: TopicSelectionV1cN2BoundedDebateRoleSlotId,
) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN2PromptCacheLiveRequiredCanary({
    provider_id: providerId,
    slot_id: slot,
  });

  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedV1cN2ModelOptionId(providerId));
  assert.equal(result.invocation_slot_id, slot);
  assert.equal(result.context_policy_profile_id, expectedV1cN2ContextPolicyProfileId(slot));
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, 'topic-selection-v1c-promotion-support-bounded-micro-debate');
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_v1c_n2_provider_canary_role');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.deepEqual((gateway.calls[0]!.schema.properties as Record<string, unknown>).role_slot, {
    type: 'string',
    enum: [slot],
  });
  assert.equal(gateway.calls[0]!.schema.additionalProperties, false);
  const required = gateway.calls[0]!.schema.required as readonly string[];
  assert.ok(required.includes('schema_version'));
  assert.ok(required.includes('role_slot'));
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_draft) {
    assert.ok(required.includes('support_points'));
    assert.ok(required.includes('risk_acknowledgements'));
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.reviewer_critic_review) {
    assert.ok(required.includes('critic_findings'));
    assert.ok(required.includes('required_repairs'));
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.promotion_supporter_repair) {
    assert.ok(required.includes('repair_actions'));
    assert.ok(required.includes('accepted_findings'));
  }
  if (slot === TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final) {
    assert.ok(required.includes('n3_semantic_layer'));
    const properties = gateway.calls[0]!.schema.properties as Record<string, Record<string, unknown>>;
    const semanticLayer = properties.n3_semantic_layer as { required?: string[] };
    assert.ok(semanticLayer.required?.includes('critic_finding_resolution_map'));
  }
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[1]!.provider_side_cache_hit, true);
}

async function assertV1cN6PromptCacheLiveRequiredCanary(providerId: TopicSelectionProviderCanaryProviderId) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN6PromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedV1cN6ModelOptionId(providerId));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
  );
  assert.equal(result.context_policy_profile_id, expectedV1cN6ContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, 'topic-selection-v1c-downstream-feedback-normalization');
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_v1c_n6_feedback_canary');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.equal(gateway.calls[0]!.schema.additionalProperties, false);
  const required = gateway.calls[0]!.schema.required as readonly string[];
  assert.ok(required.includes('schema_version'));
  assert.ok(required.includes('paper_project_bridge_id'));
  assert.ok(required.includes('downstream_source_ref'));
  assert.ok(required.includes('normalization_hints'));
  assert.ok(required.includes('no_upstream_mutation_confirmed'));
  const properties = gateway.calls[0]!.schema.properties as Record<string, Record<string, unknown>>;
  assert.deepEqual(properties.schema_version, {
    type: 'string',
    enum: [TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION],
  });
  assert.deepEqual(properties.feedback_signal, {
    type: 'string',
    enum: ['need_invalidated'],
  });
  assert.deepEqual(properties.severity, {
    type: 'string',
    enum: ['critical'],
  });
  assert.deepEqual(properties.no_upstream_mutation_confirmed, {
    type: 'boolean',
    enum: [true],
  });
  const normalizationHints = properties.normalization_hints as {
    properties: Record<string, Record<string, unknown>>;
  };
  assert.deepEqual(normalizationHints.properties.loopback_target_hint, {
    type: 'string',
    enum: ['validated_need'],
  });
  assert.deepEqual(normalizationHints.properties.requires_recheck_hint, {
    type: 'boolean',
    enum: [true],
  });
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[1]!.provider_side_cache_hit, true);
}

async function assertV1cN4PromptCacheLiveRequiredCanary(providerId: TopicSelectionProviderCanaryProviderId) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN4PromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assertV1cN4LiveRequiredEvidence(result, providerId);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, 'topic-selection-v1c-delegated-promotion-decision');
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_v1c_n4_decision_canary');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.equal(gateway.calls[0]!.schema.additionalProperties, false);
  const required = gateway.calls[0]!.schema.required as string[];
  assert.ok(required.includes('schema_version'));
  assert.ok(required.includes('promotion_gate_check_id'));
  assert.ok(required.includes('promotion_input_snapshot_hash'));
  assert.ok(required.includes('decision_support_refs'));
  assert.ok(required.includes('no_authority_write_confirmed'));
  assert.ok(required.includes('no_bridge_creation_confirmed'));
  assert.ok(required.includes('human_review_required'));
  const properties = gateway.calls[0]!.schema.properties as Record<string, Record<string, unknown>>;
  assert.deepEqual(properties.schema_version, {
    type: 'string',
    enum: [TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION],
  });
  assert.deepEqual(properties.decision, {
    type: 'string',
    enum: ['promote_with_conditions'],
  });
  assert.deepEqual(properties.no_authority_write_confirmed, {
    type: 'boolean',
    enum: [true],
  });
  assert.deepEqual(properties.no_bridge_creation_confirmed, {
    type: 'boolean',
    enum: [true],
  });
  assert.deepEqual(properties.human_review_required, {
    type: 'boolean',
    enum: [true],
  });
  const decisionSupportRefs = properties.decision_support_refs as {
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
  };
  assert.equal(decisionSupportRefs.minItems, 3);
  assert.equal(decisionSupportRefs.maxItems, 3);
  assert.equal(decisionSupportRefs.uniqueItems, true);
  const conditions = properties.conditions as {
    maxItems?: number;
    minItems?: number;
  };
  assert.equal(conditions.minItems, 1);
  assert.equal(conditions.maxItems, 1);
  assertV1cN4SchemaRejectsDuplicatedDecisionSupportRefs(gateway.calls[0]!.schema);
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
}

function assertV1cN4LiveRequiredEvidence(
  result: Awaited<ReturnType<TopicSelectionProviderCanaryService['runV1cN4PromptCacheLiveRequiredCanary']>>,
  providerId: TopicSelectionProviderCanaryProviderId,
) {
  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedV1cN4ModelOptionId(providerId));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate,
  );
  assert.equal(result.context_policy_profile_id, expectedV1cN4ContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[0]?.provider_id, providerId);
  assert.equal(result.telemetry[1]?.provider_id, providerId);
}

async function assertResourceSamplingPromptCacheLiveRequiredCanary(
  providerId: TopicSelectionProviderCanaryProviderId,
) {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runResourceSamplingPromptCacheLiveRequiredCanary({
    provider_id: providerId,
  });

  assertResourceSamplingLiveRequiredEvidence(result, providerId);
  assert.equal(gateway.calls.length, 2);
  assert.equal(gateway.calls[0]!.model.providerId, providerId);
  assert.equal(gateway.calls[0]!.model.profileId, TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID);
  assert.equal(gateway.calls[0]!.prompt.promptTemplateId, TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID);
  assert.equal(gateway.calls[0]!.prompt.version, TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION);
  assert.equal(gateway.calls[0]!.schemaName, 'topic_selection_resource_sampling_canary');
  assert.ok(gateway.calls[0]!.schemaName.length <= 64);
  assert.deepEqual(gateway.calls[0]!.schema, topicSelectionResourceSamplingLlmOutputSchema);
  assert.equal(gateway.calls[0]!.schema.additionalProperties, false);
  const required = gateway.calls[0]!.schema.required as readonly string[];
  assert.deepEqual(required, ['classifications']);
  assert.equal(gateway.calls[1]!.model.providerId, providerId);
}

function assertResourceSamplingLiveRequiredEvidence(
  result: Awaited<ReturnType<TopicSelectionProviderCanaryService['runResourceSamplingPromptCacheLiveRequiredCanary']>>,
  providerId: TopicSelectionProviderCanaryProviderId,
) {
  assert.equal(result.provider_id, providerId);
  assert.equal(result.model_option_id, expectedResourceSamplingModelOptionId(providerId));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch,
  );
  assert.equal(result.context_policy_profile_id, expectedResourceSamplingContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_required_live, true);
  assertLiveRequiredSucceeded(result);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.first_prompt_packet_hash, result.second_prompt_packet_hash);
  assert.equal(result.prompt_artifact_ref_reused, true);
  assert.equal(result.prompt_quality_report_ref_reused, true);
  assert.deepEqual(result.provider_response_cache_statuses, ['not_applicable', 'not_applicable']);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
  assert.equal(result.telemetry.length, 2);
  assert.equal(result.telemetry[0]?.provider_id, providerId);
  assert.equal(result.telemetry[1]?.provider_id, providerId);
}

function assertV1cN4SchemaRejectsDuplicatedDecisionSupportRefs(schema: Record<string, unknown>) {
  const validator = new Ajv({
    allErrors: true,
    strict: false,
  }).compile(schema);
  const gateRef = functionalRef('promotion_gate_check', 'provider_canary_gate_check_001');
  const supportRef = functionalRef('promotion_decision_support', 'provider_canary_support_001');
  const duplicatedRefsCandidate = {
    ...v1cN4CanaryOutput(),
    decision_support_refs: [gateRef, gateRef, supportRef],
  };

  assert.equal(validator(v1cN4CanaryOutput()), true);
  assert.equal(validator(duplicatedRefsCandidate), false);
}

test('provider canary proves OpenAI prompt cache hits still require live provider calls', async () => {
  await assertPromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves DashScope prompt cache hits still require live provider calls', async () => {
  await assertPromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runOverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedModelOptionId('openai'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runOverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedModelOptionId('dashscope'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary proves v1b N4 OpenAI prompt cache hits still require live provider calls', async () => {
  await assertV1bN4PromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves v1b N4 DashScope prompt cache hits still require live provider calls', async () => {
  await assertV1bN4PromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget v1b N4 OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN4OverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedV1bN4ModelOptionId('openai'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget v1b N4 DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN4OverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedV1bN4ModelOptionId('dashscope'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary proves v1b N6 OpenAI prompt cache hits still require live provider calls', async () => {
  await assertV1bN6PromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves v1b N6 DashScope prompt cache hits still require live provider calls', async () => {
  await assertV1bN6PromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget v1b N6 OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN6OverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedV1bN6ModelOptionId('openai'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget v1b N6 DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN6OverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedV1bN6ModelOptionId('dashscope'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary proves v1b N8 OpenAI prompt cache hits still require live provider calls', async () => {
  await assertV1bN8PromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves v1b N8 DashScope prompt cache hits still require live provider calls', async () => {
  await assertV1bN8PromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget v1b N8 OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN8OverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedV1bN8ModelOptionId('openai'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget v1b N8 DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1bN8OverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedV1bN8ModelOptionId('dashscope'));
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary proves v1c N2 OpenAI prompt cache hits still require live provider calls for every bounded slot', async () => {
  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
    await assertV1cN2PromptCacheLiveRequiredCanary('openai', slot);
  }
});

test('provider canary proves v1c N2 DashScope prompt cache hits still require live provider calls for every bounded slot', async () => {
  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
    await assertV1cN2PromptCacheLiveRequiredCanary('dashscope', slot);
  }
});

test('provider canary blocks over-budget v1c N2 OpenAI fixtures before gateway calls for every bounded slot', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
    const result = await service.runV1cN2OverBudgetZeroCallCanary({
      provider_id: 'openai',
      slot_id: slot,
    });

    assert.equal(result.provider_id, 'openai');
    assert.equal(result.model_option_id, expectedV1cN2ModelOptionId('openai'));
    assert.equal(result.invocation_slot_id, slot);
    assert.equal(result.context_policy_profile_id, expectedV1cN2ContextPolicyProfileId(slot));
    assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID);
    assert.equal(result.canary_surface, 'production_runtime_slot');
    assert.equal(result.provider_call_count, 0);
    assert.equal(result.status, 'blocked');
    assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
    assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
    assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
  }
  assert.equal(gateway.calls.length, 0);
});

test('provider canary blocks over-budget v1c N2 DashScope fixtures before gateway calls for every bounded slot', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
    const result = await service.runV1cN2OverBudgetZeroCallCanary({
      provider_id: 'dashscope',
      slot_id: slot,
    });

    assert.equal(result.provider_id, 'dashscope');
    assert.equal(result.model_option_id, expectedV1cN2ModelOptionId('dashscope'));
    assert.equal(result.invocation_slot_id, slot);
    assert.equal(result.context_policy_profile_id, expectedV1cN2ContextPolicyProfileId(slot));
    assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID);
    assert.equal(result.canary_surface, 'production_runtime_slot');
    assert.equal(result.provider_call_count, 0);
    assert.equal(result.status, 'blocked');
    assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
    assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
    assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
  }
  assert.equal(gateway.calls.length, 0);
});

test('provider canary blocks malformed minimal v1c N2 provider outputs against the slot schema', async () => {
  const gateway = new MinimalN2ProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN2PromptCacheLiveRequiredCanary({
    provider_id: 'openai',
    slot_id: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final,
  });

  assert.equal(result.first_status, 'blocked');
  assert.equal(result.second_status, 'blocked');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
});

test('provider canary proves v1c N4 OpenAI prompt cache hits still require live provider calls', async () => {
  await assertV1cN4PromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves v1c N4 DashScope prompt cache hits still require live provider calls', async () => {
  await assertV1cN4PromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget v1c N4 OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN4OverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedV1cN4ModelOptionId('openai'));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate,
  );
  assert.equal(result.context_policy_profile_id, expectedV1cN4ContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget v1c N4 DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN4OverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedV1cN4ModelOptionId('dashscope'));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate,
  );
  assert.equal(result.context_policy_profile_id, expectedV1cN4ContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks malformed minimal v1c N4 provider outputs against the slot schema', async () => {
  const gateway = new MinimalN4ProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN4PromptCacheLiveRequiredCanary({
    provider_id: 'openai',
  });

  assert.equal(result.first_status, 'blocked');
  assert.equal(result.second_status, 'blocked');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
});

test('provider canary proves v1c N6 OpenAI prompt cache hits still require live provider calls', async () => {
  await assertV1cN6PromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves v1c N6 DashScope prompt cache hits still require live provider calls', async () => {
  await assertV1cN6PromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget v1c N6 OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN6OverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedV1cN6ModelOptionId('openai'));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
  );
  assert.equal(result.context_policy_profile_id, expectedV1cN6ContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget v1c N6 DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN6OverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedV1cN6ModelOptionId('dashscope'));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
  );
  assert.equal(result.context_policy_profile_id, expectedV1cN6ContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks malformed minimal v1c N6 provider outputs against the slot schema', async () => {
  const gateway = new MinimalN6ProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runV1cN6PromptCacheLiveRequiredCanary({
    provider_id: 'openai',
  });

  assert.equal(result.first_status, 'blocked');
  assert.equal(result.second_status, 'blocked');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
});

test('provider canary proves resource-sampling OpenAI prompt cache hits still require live provider calls', async () => {
  await assertResourceSamplingPromptCacheLiveRequiredCanary('openai');
});

test('provider canary proves resource-sampling DashScope prompt cache hits still require live provider calls', async () => {
  await assertResourceSamplingPromptCacheLiveRequiredCanary('dashscope');
});

test('provider canary blocks over-budget resource-sampling OpenAI fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runResourceSamplingOverBudgetZeroCallCanary({
    provider_id: 'openai',
  });

  assert.equal(result.provider_id, 'openai');
  assert.equal(result.model_option_id, expectedResourceSamplingModelOptionId('openai'));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch,
  );
  assert.equal(result.context_policy_profile_id, expectedResourceSamplingContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks over-budget resource-sampling DashScope fixtures before gateway calls', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runResourceSamplingOverBudgetZeroCallCanary({
    provider_id: 'dashscope',
  });

  assert.equal(result.provider_id, 'dashscope');
  assert.equal(result.model_option_id, expectedResourceSamplingModelOptionId('dashscope'));
  assert.equal(
    result.invocation_slot_id,
    TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch,
  );
  assert.equal(result.context_policy_profile_id, expectedResourceSamplingContextPolicyProfileId());
  assert.equal(result.model_profile_id, TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID);
  assert.equal(result.canary_surface, 'production_runtime_slot');
  assert.equal(result.provider_call_count, 0);
  assert.equal(gateway.calls.length, 0);
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.token_budget_gate_decision, 'blocked_over_budget');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('provider canary blocks malformed minimal resource-sampling provider outputs against the slot schema', async () => {
  const gateway = new MinimalResourceSamplingProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runResourceSamplingPromptCacheLiveRequiredCanary({
    provider_id: 'openai',
  });

  assert.equal(result.first_status, 'blocked');
  assert.equal(result.second_status, 'blocked');
  assert.equal(result.provider_call_count, 2);
  assert.equal(gateway.calls.length, 2);
  assert.deepEqual(result.response_reuse_refs, [null, null]);
});

// ---------------------------------------------------------------------------
// Phase 2 (W-09) product-run enablement.
//
// Every production runtime slot that backs a run_mode:'acceptance' provider
// canary also resolves a product-eligible model_option and emits a provider_llm
// invocation under run_mode:'product'. This is the offline readiness proof for
// the first real product run (Phase 3): the same orchestrator/registry path
// accepts run_mode:'product' (only mocked_llm is rejected in product), the
// selected model_option is product-eligible, and run_mode is carried through to
// canary evidence. No live provider call happens here (StubGateway); acceptance
// stays the default tier.
// ---------------------------------------------------------------------------

test('provider canary resolves the v1a generate-need-candidate slot under run_mode:product', async () => {
  await assertProductTierLiveRequiredCanary(
    (service) => service.runPromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedModelOptionId('openai') },
  );
  await assertProductTierLiveRequiredCanary(
    (service) => service.runPromptCacheLiveRequiredCanary({ provider_id: 'dashscope' }),
    { providerId: 'dashscope', modelOptionId: expectedModelOptionId('dashscope') },
  );
});

test('provider canary resolves v1b non-debate slots N4/N6/N8 under run_mode:product', async () => {
  await assertProductTierLiveRequiredCanary(
    (service) => service.runV1bN4PromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedV1bN4ModelOptionId('openai') },
  );
  await assertProductTierLiveRequiredCanary(
    (service) => service.runV1bN6PromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedV1bN6ModelOptionId('openai') },
  );
  await assertProductTierLiveRequiredCanary(
    (service) => service.runV1bN8PromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedV1bN8ModelOptionId('openai') },
  );
});

test('provider canary resolves v1c slots N2/N4/N6 under run_mode:product', async () => {
  await assertProductTierLiveRequiredCanary(
    (service) => service.runV1cN2PromptCacheLiveRequiredCanary({
      provider_id: 'openai',
      slot_id: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_INVOCATION_SLOT_IDS.synthesizer_final,
    }),
    { providerId: 'openai', modelOptionId: expectedV1cN2ModelOptionId('openai') },
  );
  await assertProductTierLiveRequiredCanary(
    (service) => service.runV1cN4PromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedV1cN4ModelOptionId('openai') },
  );
  await assertProductTierLiveRequiredCanary(
    (service) => service.runV1cN6PromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedV1cN6ModelOptionId('openai') },
  );
});

test('provider canary resolves the resource-sampling slot under run_mode:product', async () => {
  await assertProductTierLiveRequiredCanary(
    (service) => service.runResourceSamplingPromptCacheLiveRequiredCanary({ provider_id: 'openai' }),
    { providerId: 'openai', modelOptionId: expectedResourceSamplingModelOptionId('openai') },
  );
});

test('provider canary keeps run_mode:acceptance as the default tier', async () => {
  const gateway = new StubProviderCanaryGateway();
  const service = makeCanaryService({ llmGateway: gateway });

  const result = await service.runPromptCacheLiveRequiredCanary({ provider_id: 'openai' });

  assert.equal(result.run_mode, 'acceptance', liveRequiredDiagnostic(result));
});

function shouldRunLiveCanary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveV1bN4Canary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_V1B_N4_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveV1bN6Canary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_V1B_N6_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveV1bN8Canary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_V1B_N8_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveV1cN2Canary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_V1C_N2_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveV1cN4Canary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_V1C_N4_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveV1cN6Canary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_V1C_N6_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

function shouldRunLiveResourceSamplingCanary(providerId: TopicSelectionProviderCanaryProviderId): boolean {
  if (
    process.env.T112_RESOURCE_SAMPLING_PROVIDER_CANARY_LIVE !== '1'
    || process.env.BACKEND_TEST_PRESERVE_REAL_ENV !== '1'
  ) {
    return false;
  }
  return providerId === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.DASHSCOPE_API_KEY?.trim());
}

test(
  'provider canary live OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveCanary('openai')
      ? false
      : 'set T112_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runPromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.telemetry[0]?.provider_id, 'openai');
  },
);

test(
  'provider canary live v1c N2 OpenAI invocation uses the configured provider gateway for every bounded slot',
  {
    skip: shouldRunLiveV1cN2Canary('openai')
      ? false
      : 'set T112_V1C_N2_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 600_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
      const result = await service.runV1cN2PromptCacheLiveRequiredCanary({
        provider_id: 'openai',
        slot_id: slot,
      });

      assertLiveRequiredSucceeded(result);
      assert.equal(result.provider_call_count, 2);
      assert.equal(result.model_option_id, expectedV1cN2ModelOptionId('openai'));
      assert.equal(result.invocation_slot_id, slot);
      assert.equal(result.telemetry[0]?.provider_id, 'openai');
    }
  },
);

test(
  'provider canary live v1c N2 DashScope invocation uses the configured provider gateway for every bounded slot',
  {
    skip: shouldRunLiveV1cN2Canary('dashscope')
      ? false
      : 'set T112_V1C_N2_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 900_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    for (const slot of TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_ORDER) {
      const result = await service.runV1cN2PromptCacheLiveRequiredCanary({
        provider_id: 'dashscope',
        slot_id: slot,
      });

      assertLiveRequiredSucceeded(result);
      assert.equal(result.provider_call_count, 2);
      assert.equal(result.model_option_id, expectedV1cN2ModelOptionId('dashscope'));
      assert.equal(result.invocation_slot_id, slot);
      assert.equal(result.telemetry[0]?.provider_id, 'dashscope');
    }
  },
);

test(
  'provider canary live v1c N4 OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1cN4Canary('openai')
      ? false
      : 'set T112_V1C_N4_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1cN4PromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertV1cN4LiveRequiredEvidence(result, 'openai');
  },
);

test(
  'provider canary live v1c N4 DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1cN4Canary('dashscope')
      ? false
      : 'set T112_V1C_N4_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1cN4PromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertV1cN4LiveRequiredEvidence(result, 'dashscope');
  },
);

test(
  'provider canary live v1c N6 OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1cN6Canary('openai')
      ? false
      : 'set T112_V1C_N6_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1cN6PromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.model_option_id, expectedV1cN6ModelOptionId('openai'));
    assert.equal(
      result.invocation_slot_id,
      TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
    );
    assert.equal(result.telemetry[0]?.provider_id, 'openai');
  },
);

test(
  'provider canary live v1c N6 DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1cN6Canary('dashscope')
      ? false
      : 'set T112_V1C_N6_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1cN6PromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.model_option_id, expectedV1cN6ModelOptionId('dashscope'));
    assert.equal(
      result.invocation_slot_id,
      TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization,
    );
    assert.equal(result.telemetry[0]?.provider_id, 'dashscope');
  },
);

test(
  'provider canary live resource-sampling OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveResourceSamplingCanary('openai')
      ? false
      : 'set T112_RESOURCE_SAMPLING_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runResourceSamplingPromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertResourceSamplingLiveRequiredEvidence(result, 'openai');
  },
);

test(
  'provider canary live resource-sampling DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveResourceSamplingCanary('dashscope')
      ? false
      : 'set T112_RESOURCE_SAMPLING_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runResourceSamplingPromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertResourceSamplingLiveRequiredEvidence(result, 'dashscope');
  },
);

test(
  'provider canary live DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveCanary('dashscope')
      ? false
      : 'set T112_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runPromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.telemetry[0]?.provider_id, 'dashscope');
  },
);

test(
  'provider canary live v1b N4 OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1bN4Canary('openai')
      ? false
      : 'set T112_V1B_N4_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1bN4PromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.model_option_id, expectedV1bN4ModelOptionId('openai'));
    assert.equal(result.telemetry[0]?.provider_id, 'openai');
  },
);

test(
  'provider canary live v1b N4 DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1bN4Canary('dashscope')
      ? false
      : 'set T112_V1B_N4_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1bN4PromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.model_option_id, expectedV1bN4ModelOptionId('dashscope'));
    assert.equal(result.telemetry[0]?.provider_id, 'dashscope');
  },
);

test(
  'provider canary live v1b N6 OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1bN6Canary('openai')
      ? false
      : 'set T112_V1B_N6_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1bN6PromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.model_option_id, expectedV1bN6ModelOptionId('openai'));
    assert.equal(result.telemetry[0]?.provider_id, 'openai');
  },
);

test(
  'provider canary live v1b N6 DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1bN6Canary('dashscope')
      ? false
      : 'set T112_V1B_N6_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1bN6PromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertLiveRequiredSucceeded(result);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.model_option_id, expectedV1bN6ModelOptionId('dashscope'));
    assert.equal(result.telemetry[0]?.provider_id, 'dashscope');
  },
);

test(
  'provider canary live v1b N8 OpenAI invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1bN8Canary('openai')
      ? false
      : 'set T112_V1B_N8_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and OPENAI_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1bN8PromptCacheLiveRequiredCanary({
      provider_id: 'openai',
    });

    assertV1bN8PromptCacheLiveRequiredResult(result, 'openai');
  },
);

test(
  'provider canary live v1b N8 DashScope invocation uses the configured provider gateway',
  {
    skip: shouldRunLiveV1bN8Canary('dashscope')
      ? false
      : 'set T112_V1B_N8_PROVIDER_CANARY_LIVE=1, BACKEND_TEST_PRESERVE_REAL_ENV=1, and DASHSCOPE_API_KEY to run',
    timeout: 300_000,
  },
  async () => {
    const service = makeCanaryService({
      llmGateway: new BackendLlmGateway({
        defaultTimeoutMs: 300_000,
        defaultMaxRetries: 0,
      }),
    });

    const result = await service.runV1bN8PromptCacheLiveRequiredCanary({
      provider_id: 'dashscope',
    });

    assertV1bN8PromptCacheLiveRequiredResult(result, 'dashscope');
  },
);
