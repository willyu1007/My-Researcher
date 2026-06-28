import type {
  TopicSelectionArtifactFunctionalRef,
  TopicSelectionAgentExecutionMode,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
  HumanConfirmationSemanticReviewContextPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionBuildEvidenceMapNodeInput,
  TopicSelectionEvidenceMapExtractionContextPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionSearchRunHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type {
  TopicSelectionAgentRuntimeTokenBudgetInput,
} from './topic-selection-agent-orchestrator-service.js';
import type {
  TopicSelectionCompressionFactInventory,
} from './topic-selection-compression-runtime-service.js';
import {
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
} from './topic-selection-model-profile-registry-service.js';
import {
  TOPIC_SELECTION_V1A_N5_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1A_N7_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS,
  TOPIC_SELECTION_V1A_N8_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

type RuntimePromptRef = {
  promptTemplateId: string;
  version: string;
};

type RuntimeMessage = {
  role: 'system' | 'user';
  content: string;
};

export type TopicSelectionV1aLlmRuntimeTokenBudgetOverrides = {
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
  estimated_input_tokens_after_compression_override?: number | null;
  schema_overhead_tokens_after_compression_override?: number | null;
  compression_already_applied?: boolean;
};

export type TopicSelectionV1aLlmRuntimeCompressionIdentity = {
  compression_report_ref: TopicSelectionFunctionalRef;
  compression_report_hash: string;
  compressed_context_hash: string;
  compression_already_applied: boolean;
};

export type TopicSelectionV1aEvidenceExtractionCompressedContext = {
  schema_version: 'topic-selection-v1a-n5-evidence-extraction-compressed-context-v1';
  compression_report_ref: TopicSelectionFunctionalRef;
  source_context_packet_hashes: {
    search_run_handoff: string;
    extraction_context_packet: string;
  };
  search_run_handoff: unknown;
  extraction_context_packet: unknown;
  preserved_fact_inventory: TopicSelectionCompressionFactInventory;
  compression_notes: {
    strategy: string;
    retained_refs_are_authoritative: true;
    payload_is_not_business_authority: true;
  };
};

export type TopicSelectionV1aEvidenceExtractionCompressionPlan = {
  compression_report_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  input_context: {
    search_run_handoff: TopicSelectionSearchRunHandoff;
    extraction_context_packet: TopicSelectionEvidenceMapExtractionContextPacket;
  };
  compressed_context: TopicSelectionV1aEvidenceExtractionCompressedContext;
  summary: Record<string, unknown>;
  fact_inventory: TopicSelectionCompressionFactInventory;
};

export type TopicSelectionV1aNeedAdjudicationCompressedContext = {
  schema_version: 'topic-selection-v1a-n7-need-adjudication-compressed-context-v1';
  compression_report_ref: TopicSelectionFunctionalRef;
  source_context_packet_hashes: {
    need_candidate: string;
    readiness_assessment: string;
    validation_support_packet: string;
  };
  need_candidate: unknown;
  readiness_assessment: unknown;
  validation_support_packet: unknown;
  preserved_fact_inventory: TopicSelectionCompressionFactInventory;
  compression_notes: {
    strategy: string;
    retained_refs_are_authoritative: true;
    payload_is_not_business_authority: true;
  };
};

export type TopicSelectionV1aNeedAdjudicationCompressionPlan = {
  compression_report_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  input_context: {
    need_candidate: TopicSelectionNeedCandidateRecord;
    readiness_assessment: TopicSelectionNeedCandidateReadinessAssessmentRecord;
    validation_support_packet: TopicSelectionValidationDecisionSupportPacketRecord;
  };
  compressed_context: TopicSelectionV1aNeedAdjudicationCompressedContext;
  summary: Record<string, unknown>;
  fact_inventory: TopicSelectionCompressionFactInventory;
};

export type TopicSelectionV1aHumanConfirmationCompressedContext = {
  schema_version: 'topic-selection-v1a-n8-human-confirmation-compressed-context-v1';
  compression_report_ref: TopicSelectionFunctionalRef;
  source_context_packet_hashes: {
    semantic_review_context_packet: string;
  };
  semantic_review_context_packet_ref: TopicSelectionFunctionalRef;
  semantic_review_context_packet: unknown;
  preserved_fact_inventory: TopicSelectionCompressionFactInventory;
  compression_notes: {
    strategy: string;
    retained_refs_are_authoritative: true;
    payload_is_not_business_authority: true;
  };
};

export type TopicSelectionV1aHumanConfirmationCompressionPlan = {
  compression_report_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  input_context: {
    semantic_review_context_packet: HumanConfirmationSemanticReviewContextPacket;
  };
  compressed_context: TopicSelectionV1aHumanConfirmationCompressedContext;
  summary: Record<string, unknown>;
  fact_inventory: TopicSelectionCompressionFactInventory;
};

export type TopicSelectionV1aLlmRuntimeInvocationBinding = {
  prompt: RuntimePromptRef;
  prompt_variant_key: string;
  messages: RuntimeMessage[];
  input_refs: TopicSelectionFunctionalRef[];
  context_packet_refs: TopicSelectionArtifactFunctionalRef[];
  context_packet_hashes: string[];
  runtime_token_budget: TopicSelectionAgentRuntimeTokenBudgetInput;
};

export type BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput = {
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_id: string;
  scenario_case_id?: string | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  profile_id: string;
  policy_version: string;
  output_schema_version: string;
  node_input: TopicSelectionBuildEvidenceMapNodeInput;
  search_run_handoff: TopicSelectionSearchRunHandoff;
  extraction_context_packet: TopicSelectionEvidenceMapExtractionContextPacket;
  extraction_context_packet_ref?: TopicSelectionFunctionalRef | null;
  compressed_context?: TopicSelectionV1aEvidenceExtractionCompressedContext | null;
  runtime_token_budget_overrides?: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null;
  runtime_compression?: TopicSelectionV1aLlmRuntimeCompressionIdentity | null;
};

export type BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput = {
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_id: string;
  scenario_case_id?: string | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  profile_id?: string | null;
  policy_version: string;
  output_schema_version: string;
  diagnostic_prompt_appendix?: string | null;
  candidate: TopicSelectionNeedCandidateRecord;
  readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord;
  support_packet: TopicSelectionValidationDecisionSupportPacketRecord;
  compressed_context?: TopicSelectionV1aNeedAdjudicationCompressedContext | null;
  runtime_token_budget_overrides?: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null;
  runtime_compression?: TopicSelectionV1aLlmRuntimeCompressionIdentity | null;
};

export type BuildTopicSelectionV1aHumanConfirmationRuntimeBindingInput = {
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_id: string;
  scenario_case_id?: string | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  profile_id?: string | null;
  context_packet: HumanConfirmationSemanticReviewContextPacket;
  context_packet_ref: TopicSelectionFunctionalRef;
  compressed_context?: TopicSelectionV1aHumanConfirmationCompressedContext | null;
  runtime_token_budget_overrides?: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null;
  runtime_compression?: TopicSelectionV1aLlmRuntimeCompressionIdentity | null;
};

export class TopicSelectionV1aLlmRuntimeBindingService {
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;

  constructor(options: {
    contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
  } = {}) {
    this.contextPolicyProfileRegistry = options.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
  }

  buildEvidenceExtractionBinding(
    input: BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput,
  ): TopicSelectionV1aLlmRuntimeInvocationBinding {
    const runtimeTokenBudget = this.runtimeTokenBudgetForSlot({
      contextPolicyProfileId:
        TOPIC_SELECTION_V1A_N5_CONTEXT_RUNTIME_PROFILE_IDS.evidence_extraction,
      invocationSlotId:
        TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS.evidence_extraction,
      scenarioId: input.scenario_id,
      scenarioCaseId: input.scenario_case_id ?? null,
      contextPayloads: [input.compressed_context ?? input.extraction_context_packet],
    });
    return {
      prompt: {
        promptTemplateId: 'topic-selection-evidence-map-extraction',
        version: 'v1',
      },
      prompt_variant_key: 'evidence_extraction',
      messages: this.evidenceMapExtractionMessages(input),
      input_refs: this.evidenceMapExtractionInputRefs(input.search_run_handoff),
      context_packet_refs: this.uniqueArtifactRefs([
        this.asArtifactRef(input.extraction_context_packet_ref ?? null),
      ]),
      context_packet_hashes: [this.hash(input.extraction_context_packet)],
      runtime_token_budget: this.applyRuntimeTokenBudgetOverrides(
        runtimeTokenBudget,
        input.runtime_token_budget_overrides ?? null,
        input.runtime_compression ?? null,
      ),
    };
  }

  buildEvidenceExtractionCompressionPlan(
    input: BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput,
  ): TopicSelectionV1aEvidenceExtractionCompressionPlan {
    const resolvedProfile = this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: TOPIC_SELECTION_V1A_N5_CONTEXT_RUNTIME_PROFILE_IDS.evidence_extraction,
      invocation_slot_id: TOPIC_SELECTION_V1A_N5_INVOCATION_SLOT_IDS.evidence_extraction,
    });
    const factInventory = this.evidenceExtractionCompressionFactInventory(
      resolvedProfile.profile.compression_policy.preserved_fact_kinds,
      input,
    );
    const compressionReportRef = this.syntheticEvidenceExtractionCompressionReportRef(input);
    const compressedContext: TopicSelectionV1aEvidenceExtractionCompressedContext = {
      schema_version: 'topic-selection-v1a-n5-evidence-extraction-compressed-context-v1',
      compression_report_ref: compressionReportRef,
      source_context_packet_hashes: {
        search_run_handoff: this.hash(input.search_run_handoff),
        extraction_context_packet: this.hash(input.extraction_context_packet),
      },
      search_run_handoff: this.compactPayload(input.search_run_handoff),
      extraction_context_packet: this.compactPayload(input.extraction_context_packet),
      preserved_fact_inventory: factInventory,
      compression_notes: {
        strategy: 'deterministic structural compaction; refs remain authoritative',
        retained_refs_are_authoritative: true,
        payload_is_not_business_authority: true,
      },
    };
    const sourceRefs = this.uniqueRefs([
      input.extraction_context_packet_ref ?? null,
      input.search_run_handoff.search_run_ref,
      ...this.evidenceMapExtractionInputRefs(input.search_run_handoff),
      ...input.extraction_context_packet.input_refs,
      ...this.functionalRefsAt(input.extraction_context_packet.payload, ['source_refs']),
      ...this.functionalRefsAt(input.extraction_context_packet.payload, ['residual_risk_refs']),
      ...this.functionalRefsAt(input.extraction_context_packet.payload, ['accepted_risk_refs']),
      ...this.functionalRefsAt(input.extraction_context_packet.payload, ['unresolved_challenge_refs']),
      ...this.functionalRefsAt(input.extraction_context_packet.payload, ['recheck_hint_refs']),
    ]);

    return {
      compression_report_ref: compressionReportRef,
      source_refs: sourceRefs,
      input_context: {
        search_run_handoff: input.search_run_handoff,
        extraction_context_packet: input.extraction_context_packet,
      },
      compressed_context: compressedContext,
      summary: {
        schema_version: 'topic-selection-v1a-n5-compression-summary-v1',
        node_id: input.extraction_context_packet.node_id,
        context_family: resolvedProfile.profile.context_family,
        preserved_fact_inventory: factInventory,
        source_context_packet_hashes: compressedContext.source_context_packet_hashes,
        authority_note: 'Compression is advisory context only and cannot create or satisfy EvidenceMap authority writes.',
      },
      fact_inventory: factInventory,
    };
  }

  buildNeedAdjudicationBinding(
    input: BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput,
  ): TopicSelectionV1aLlmRuntimeInvocationBinding {
    const runtimeTokenBudget = this.runtimeTokenBudgetForSlot({
      contextPolicyProfileId:
        TOPIC_SELECTION_V1A_N7_CONTEXT_RUNTIME_PROFILE_IDS.adjudication_recommendation,
      invocationSlotId:
        TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS.adjudication_recommendation,
      scenarioId: input.scenario_id,
      scenarioCaseId: input.scenario_case_id ?? null,
      contextPayloads: [input.compressed_context ?? input.support_packet],
      extraPayloads: [input.candidate, input.readiness],
    });
    return {
      prompt: {
        promptTemplateId: 'topic-selection-need-adjudication',
        version: 'v1',
      },
      prompt_variant_key: 'adjudication_recommendation',
      messages: this.needAdjudicationMessages(input),
      input_refs: this.needAdjudicationInputRefs(input.candidate, input.readiness, input.support_packet),
      context_packet_refs: [],
      context_packet_hashes: [
        this.hash({
          candidate_ref: this.ref(
            'need_candidate',
            input.candidate.need_candidate_id,
            input.candidate.title_card_id,
            input.candidate.candidate_version,
          ),
          readiness_ref: this.ref(
            'need_candidate_readiness',
            input.readiness.readiness_assessment_id,
            input.readiness.title_card_id,
          ),
          validation_support_packet_ref: this.ref(
            'validation_decision_support_packet',
            input.support_packet.validation_support_packet_id,
            input.support_packet.title_card_id,
          ),
        }),
      ],
      runtime_token_budget: this.applyRuntimeTokenBudgetOverrides(
        runtimeTokenBudget,
        input.runtime_token_budget_overrides ?? null,
        input.runtime_compression ?? null,
      ),
    };
  }

  buildNeedAdjudicationCompressionPlan(
    input: BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput,
  ): TopicSelectionV1aNeedAdjudicationCompressionPlan {
    const resolvedProfile = this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: TOPIC_SELECTION_V1A_N7_CONTEXT_RUNTIME_PROFILE_IDS.adjudication_recommendation,
      invocation_slot_id: TOPIC_SELECTION_V1A_N7_INVOCATION_SLOT_IDS.adjudication_recommendation,
    });
    const factInventory = this.needAdjudicationCompressionFactInventory(
      resolvedProfile.profile.compression_policy.preserved_fact_kinds,
      input,
    );
    const compressionReportRef = this.syntheticNeedAdjudicationCompressionReportRef(input);
    const compressedContext: TopicSelectionV1aNeedAdjudicationCompressedContext = {
      schema_version: 'topic-selection-v1a-n7-need-adjudication-compressed-context-v1',
      compression_report_ref: compressionReportRef,
      source_context_packet_hashes: {
        need_candidate: this.hash(input.candidate),
        readiness_assessment: this.hash(input.readiness),
        validation_support_packet: this.hash(input.support_packet),
      },
      need_candidate: this.compactPayload(input.candidate),
      readiness_assessment: this.compactPayload(input.readiness),
      validation_support_packet: this.compactPayload(input.support_packet),
      preserved_fact_inventory: factInventory,
      compression_notes: {
        strategy: 'deterministic structural compaction; refs remain authoritative',
        retained_refs_are_authoritative: true,
        payload_is_not_business_authority: true,
      },
    };
    const sourceRefs = this.needAdjudicationInputRefs(input.candidate, input.readiness, input.support_packet);
    return {
      compression_report_ref: compressionReportRef,
      source_refs: sourceRefs,
      input_context: {
        need_candidate: input.candidate,
        readiness_assessment: input.readiness,
        validation_support_packet: input.support_packet,
      },
      compressed_context: compressedContext,
      summary: {
        schema_version: 'topic-selection-v1a-n7-compression-summary-v1',
        node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
        context_family: resolvedProfile.profile.context_family,
        preserved_fact_inventory: factInventory,
        source_context_packet_hashes: compressedContext.source_context_packet_hashes,
        authority_note: 'Compression is advisory context only and cannot create or satisfy ValidateNeed authority writes.',
      },
      fact_inventory: factInventory,
    };
  }

  buildHumanConfirmationBinding(
    input: BuildTopicSelectionV1aHumanConfirmationRuntimeBindingInput,
  ): TopicSelectionV1aLlmRuntimeInvocationBinding {
    const runtimeTokenBudget = this.runtimeTokenBudgetForSlot({
      contextPolicyProfileId:
        TOPIC_SELECTION_V1A_N8_CONTEXT_RUNTIME_PROFILE_IDS.confirmation_semantic_review,
      invocationSlotId:
        TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS.confirmation_semantic_review,
      scenarioId: input.scenario_id,
      scenarioCaseId: input.scenario_case_id ?? null,
      contextPayloads: [input.compressed_context ?? input.context_packet],
    });
    return {
      prompt: {
        promptTemplateId: 'topic-selection-human-confirmation-semantic-review',
        version: 'v1',
      },
      prompt_variant_key: 'confirmation_semantic_review',
      messages: this.humanConfirmationSemanticReviewMessages(input),
      input_refs: [
        input.context_packet.adjudication_result_ref,
        input.context_packet.validation_support_packet_ref,
        input.context_packet.need_candidate_ref,
        input.context_packet.output_validated_need_ref,
      ],
      context_packet_refs: this.uniqueArtifactRefs([this.asArtifactRef(input.context_packet_ref)]),
      context_packet_hashes: [input.context_packet.context_packet_hash],
      runtime_token_budget: this.applyRuntimeTokenBudgetOverrides(
        runtimeTokenBudget,
        input.runtime_token_budget_overrides ?? null,
        input.runtime_compression ?? null,
      ),
    };
  }

  buildHumanConfirmationCompressionPlan(
    input: BuildTopicSelectionV1aHumanConfirmationRuntimeBindingInput,
  ): TopicSelectionV1aHumanConfirmationCompressionPlan {
    const resolvedProfile = this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: TOPIC_SELECTION_V1A_N8_CONTEXT_RUNTIME_PROFILE_IDS.confirmation_semantic_review,
      invocation_slot_id: TOPIC_SELECTION_V1A_N8_INVOCATION_SLOT_IDS.confirmation_semantic_review,
    });
    const factInventory = this.humanConfirmationCompressionFactInventory(
      resolvedProfile.profile.compression_policy.preserved_fact_kinds,
      input.context_packet,
    );
    const compressionReportRef = this.syntheticHumanConfirmationCompressionReportRef(input);
    const compressedContext: TopicSelectionV1aHumanConfirmationCompressedContext = {
      schema_version: 'topic-selection-v1a-n8-human-confirmation-compressed-context-v1',
      compression_report_ref: compressionReportRef,
      source_context_packet_hashes: {
        semantic_review_context_packet: input.context_packet.context_packet_hash,
      },
      semantic_review_context_packet_ref: input.context_packet_ref,
      semantic_review_context_packet: this.compactPayload(input.context_packet),
      preserved_fact_inventory: factInventory,
      compression_notes: {
        strategy: 'deterministic structural compaction; refs remain authoritative',
        retained_refs_are_authoritative: true,
        payload_is_not_business_authority: true,
      },
    };
    return {
      compression_report_ref: compressionReportRef,
      source_refs: this.humanConfirmationInputRefs(input.context_packet),
      input_context: {
        semantic_review_context_packet: input.context_packet,
      },
      compressed_context: compressedContext,
      summary: {
        schema_version: 'topic-selection-v1a-n8-compression-summary-v1',
        node_id: 'topic-selection.v1a.human-confirm-need.v1',
        context_family: resolvedProfile.profile.context_family,
        preserved_fact_inventory: factInventory,
        source_context_packet_hashes: compressedContext.source_context_packet_hashes,
        authority_note: 'Compression is advisory context only and cannot create or satisfy human confirmation authority writes.',
      },
      fact_inventory: factInventory,
    };
  }

  private evidenceMapExtractionMessages(
    input: BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput,
  ): RuntimeMessage[] {
    return [
      {
        role: 'system',
        content: [
          'You are the v1a node-N5 evidence-map extraction agent.',
          'Produce TopicSelectionEvidenceMapExtractionDraft@v1 only.',
          'Use source-grounded EvidenceUnits and never include hidden reasoning or raw provider logs.',
          'Create at least one draft_unit for every literature_record in search_run_handoff.evidence_map_input_refs; missing source-candidate coverage blocks materialization.',
          'If an EvidenceUnit cites coverage_row_intent_ref, evidence_role must match search_run_handoff.coverage_role_expectations.',
          'For each draft_unit set a unique client_unit_key, an evidence_role, a literature_ref and source_refs drawn only from the supplied handoff refs, a locator, a source_statement, a source_attribution_kind, and an interpretation_payload; confidence may be null and issue_codes records problems.',
          'In draft_links, draft_clusters, draft_patterns, and draft_conflicts, every unit-key reference must name a declared draft_unit client_unit_key.',
          'Do not invent a literature_ref or source_refs absent from search_run_handoff, and do not emit evidence_map_id, evidence_unit_id, or created_authority_refs.',
          'When compressed_evidence_extraction_context is provided, treat it as advisory ref-backed context only.',
          'Do not write authority records; the deterministic materialization gate owns persistence.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: stableStringify(
          input.compressed_context
            ? {
                node_input: this.evidenceExtractionNodeInputEnvelope(input),
                search_run_ref: input.search_run_handoff.search_run_ref,
                extraction_context_packet_ref: input.extraction_context_packet_ref ?? null,
                compressed_evidence_extraction_context: input.compressed_context,
              }
            : {
                node_input: this.evidenceExtractionNodeInputEnvelope(input),
                search_run_handoff: input.search_run_handoff,
                extraction_context_packet: input.extraction_context_packet,
              },
        ),
      },
    ];
  }

  private evidenceExtractionNodeInputEnvelope(
    input: BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput,
  ): Record<string, unknown> {
    return {
      workflow_run_id: input.node_input.workflow_run_id,
      node_attempt_id: input.node_input.node_attempt_id,
      profile_id: input.node_input.profile_id,
      execution_mode: input.node_input.execution_mode,
      policy_version: input.node_input.policy_version,
      output_schema_version: input.node_input.output_schema_version,
    };
  }

  private evidenceMapExtractionInputRefs(
    handoff: TopicSelectionSearchRunHandoff,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      handoff.search_run_ref,
      handoff.search_plan_ref,
      handoff.literature_resource_pool_snapshot_ref,
      ...handoff.coverage_row_intent_refs,
      ...handoff.evidence_map_input_refs,
      ...handoff.coverage_binding_refs,
      ...handoff.coverage_assessment_refs,
    ]);
  }

  private needAdjudicationMessages(
    input: BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput,
  ): RuntimeMessage[] {
    return [
      {
        role: 'system',
        content: [
          'You are the v1a validate-need adjudicator at node N7.',
          `Produce ${TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION} only.`,
          'Set final_decision from the decision enum with a rationale grounded in the support packet; whenever risks or coverage gaps are carried, give non-empty required_actions, carry any gap_codes, and partition the carried risks across accepted_risk_refs and residual_risk_refs without dropping any.',
          'Set rejected_reason only on a reject and merge_target_need_candidate_ref only on a merge; always emit searchplan_recheck_gap_codes (empty unless a searchplan recheck is needed) and set searchplan_recheck_reason only when one is needed; trace source_refs to support-packet refs.',
          'Do not include route_outcome, next_node_id, DB status fields, authority ids to create, hidden reasoning, or workflow commands.',
          'Use the validation support packet as frozen truth; do not invent evidence, risks, merge targets, or recheck refs.',
          'If residual_risk_refs or METHOD_FAMILY_COVERAGE_GAP are present, validate must carry those risks in residual_risk_refs or accepted_risk_refs and include required_actions for follow-up.',
          'Do not return clean validate by dropping support-packet residual risks or coverage warnings.',
          'When compressed_need_adjudication_context is provided, treat it as advisory ref-backed context only.',
          ...(input.diagnostic_prompt_appendix?.trim() ? [input.diagnostic_prompt_appendix.trim()] : []),
        ].join('\n'),
      },
      {
        role: 'user',
        content: stableStringify(
          input.compressed_context
            ? {
                node: this.needAdjudicationNodeEnvelope(input),
                candidate_ref: this.ref(
                  'need_candidate',
                  input.candidate.need_candidate_id,
                  input.candidate.title_card_id,
                  input.candidate.candidate_version,
                ),
                readiness_assessment_ref: this.ref(
                  'need_candidate_readiness',
                  input.readiness.readiness_assessment_id,
                  input.readiness.title_card_id,
                ),
                validation_support_packet_ref: this.ref(
                  'validation_decision_support_packet',
                  input.support_packet.validation_support_packet_id,
                  input.support_packet.title_card_id,
                ),
                compressed_need_adjudication_context: input.compressed_context,
              }
            : {
                node: this.needAdjudicationNodeEnvelope(input),
                candidate: {
                  need_candidate_ref: this.ref(
                    'need_candidate',
                    input.candidate.need_candidate_id,
                    input.candidate.title_card_id,
                    input.candidate.candidate_version,
                  ),
                  candidate_need: input.candidate.candidate_need,
                  unmet_need_statement: input.candidate.unmet_need_statement,
                  mechanism_type: input.candidate.mechanism_type,
                  prior_art_status: input.candidate.prior_art_status,
                  gap_codes: input.candidate.gap_codes,
                },
                readiness: {
                  readiness_assessment_ref: this.ref(
                    'need_candidate_readiness',
                    input.readiness.readiness_assessment_id,
                    input.readiness.title_card_id,
                  ),
                  recommendation: input.readiness.recommendation,
                  blocker_codes: input.readiness.blockers.map((blocker) => blocker.code),
                  warning_codes: input.readiness.warnings.map((warning) => warning.code),
                },
                support_packet: {
                  validation_support_packet_ref: this.ref(
                    'validation_decision_support_packet',
                    input.support_packet.validation_support_packet_id,
                    input.support_packet.title_card_id,
                  ),
                  required_human_checks: input.support_packet.required_human_checks,
                  open_gap_codes: input.support_packet.open_gap_codes,
                  residual_risk_refs: input.support_packet.residual_risk_refs,
                  evidence_role_bundle: input.support_packet.evidence_role_bundle,
                  conflict_refs: input.support_packet.conflict_refs,
                },
              },
        ),
      },
    ];
  }

  private needAdjudicationNodeEnvelope(
    input: BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput,
  ): Record<string, unknown> {
    return {
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      execution_mode: input.execution_mode,
      profile_id: input.profile_id ?? TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
  }

  private needAdjudicationInputRefs(
    candidate: TopicSelectionNeedCandidateRecord,
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version),
      this.ref('need_candidate_readiness', readiness.readiness_assessment_id, readiness.title_card_id),
      this.ref(
        'validation_decision_support_packet',
        supportPacket.validation_support_packet_id,
        supportPacket.title_card_id,
      ),
      supportPacket.evidence_map_ref,
      supportPacket.search_run_ref,
      supportPacket.search_plan_ref,
      supportPacket.literature_snapshot_ref,
      ...supportPacket.evidence_role_bundle.support_unit_refs,
      ...supportPacket.evidence_role_bundle.challenge_unit_refs,
      ...supportPacket.evidence_role_bundle.baseline_unit_refs,
      ...supportPacket.evidence_role_bundle.context_unit_refs,
      ...supportPacket.conflict_refs,
      ...supportPacket.residual_risk_refs,
    ]);
  }

  private humanConfirmationInputRefs(
    contextPacket: HumanConfirmationSemanticReviewContextPacket,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      contextPacket.adjudication_result_ref,
      contextPacket.validation_support_packet_ref,
      contextPacket.need_candidate_ref,
      contextPacket.output_validated_need_ref,
      ...this.functionalRefsAt(contextPacket, ['residual_risk_refs']),
      ...this.functionalRefsAt(contextPacket, ['accepted_risk_refs']),
      ...this.functionalRefsAt(contextPacket, ['confirmation_input', 'accepted_risk_refs']),
      ...this.functionalRefsAt(contextPacket, ['unresolved_challenge_refs']),
      ...this.functionalRefsAt(contextPacket, ['recheck_hint_refs']),
      ...this.functionalRefsAt(contextPacket, ['recheck_request_refs']),
    ]);
  }

  private humanConfirmationOutputLineage(
    input: BuildTopicSelectionV1aHumanConfirmationRuntimeBindingInput,
  ): Record<string, unknown> {
    const contextPacketRef = input.context_packet_ref;
    return {
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      review_id: `${input.node_attempt_id}_semantic_review`,
      context_packet_ref: contextPacketRef,
      execution_mode: input.execution_mode,
      profile_id: input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      provenance_ref: contextPacketRef,
      policy_version: input.context_packet.policy_version,
      output_schema_version: input.context_packet.output_schema_version,
    };
  }

  private humanConfirmationSemanticReviewMessages(
    input: BuildTopicSelectionV1aHumanConfirmationRuntimeBindingInput,
  ): RuntimeMessage[] {
    return [
      {
        role: 'system',
        content: [
          'You are the advisory semantic reviewer for v1a human-confirm-need (node N8); you review alignment only and never confirm.',
          `Produce ${TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION} only.`,
          'Review alignment between validate adjudication, support-packet checks, residual risks, and confirmation input.',
          'Copy output_lineage fields exactly into the matching top-level output fields.',
          'Set status from the status enum; summarize the alignment checks in alignment_codes, set risk_coverage and required_check_coverage from their coverage enums, list any out-of-scope action in scope_violations, and give a grounded rationale_summary.',
          'Use review_reason_codes only when status is warning and manual review is required; leave it empty for pass.',
          'A pass requires complete risk_coverage, complete required_check_coverage, and no scope_violations.',
          'When compressed_human_confirmation_context is provided, treat it as advisory ref-backed context only.',
          'Do not re-adjudicate candidate value, infer new evidence roles, create new risk refs, mutate upstream content, or run debate.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: stableStringify(
          input.compressed_context
            ? {
                output_lineage: this.humanConfirmationOutputLineage(input),
                context_packet_ref: input.context_packet_ref,
                context_packet_hash: input.context_packet.context_packet_hash,
                compressed_human_confirmation_context: input.compressed_context,
              }
            : {
                output_lineage: this.humanConfirmationOutputLineage(input),
                context_packet_ref: input.context_packet_ref,
                context_packet: input.context_packet,
              },
        ),
      },
    ];
  }

  private runtimeTokenBudgetForSlot(input: {
    contextPolicyProfileId: string;
    invocationSlotId: string;
    scenarioId?: string | null;
    scenarioCaseId?: string | null;
    contextPayloads?: unknown[];
    extraPayloads?: unknown[];
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const resolvedProfile = this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: input.contextPolicyProfileId,
      invocation_slot_id: input.invocationSlotId,
    });
    return {
      context_policy_profile: resolvedProfile.profile,
      context_policy_profile_hash: resolvedProfile.profile_hash,
      runtime_invocation_context_hash: this.runtimeInvocationContextHash({
        invocationSlotId: input.invocationSlotId,
        scenarioId: input.scenarioId ?? null,
        scenarioCaseId: input.scenarioCaseId ?? null,
      }),
      context_payloads: input.contextPayloads ?? [],
      extra_payloads: input.extraPayloads ?? [],
    };
  }

  private applyRuntimeTokenBudgetOverrides(
    runtimeTokenBudget: TopicSelectionAgentRuntimeTokenBudgetInput,
    overrides: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null,
    compression: TopicSelectionV1aLlmRuntimeCompressionIdentity | null,
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    const compressionAlreadyApplied =
      compression?.compression_already_applied ?? overrides?.compression_already_applied ?? false;
    return {
      ...runtimeTokenBudget,
      compression_report_ref: compression?.compression_report_ref ?? null,
      compression_report_hash: compression?.compression_report_hash ?? null,
      compressed_context_hash: compression?.compressed_context_hash ?? null,
      compression_already_applied: compressionAlreadyApplied,
      estimated_input_tokens_override: compressionAlreadyApplied
        ? overrides?.estimated_input_tokens_after_compression_override
          ?? overrides?.estimated_input_tokens_override
        : overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: compressionAlreadyApplied
        ? overrides?.schema_overhead_tokens_after_compression_override
          ?? overrides?.schema_overhead_tokens_override
        : overrides?.schema_overhead_tokens_override,
    };
  }

  private evidenceExtractionCompressionFactInventory(
    preservedFactKinds: string[],
    input: BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput,
  ): TopicSelectionCompressionFactInventory {
    const inventory: TopicSelectionCompressionFactInventory = {};
    const add = (kind: string, value: string | null | undefined) => {
      const normalized = value?.trim();
      if (!normalized || !preservedFactKinds.includes(kind)) {
        return;
      }
      inventory[kind] = this.uniqueStrings([...(inventory[kind] ?? []), normalized]);
    };
    const addRefIds = (kind: string, refs: TopicSelectionFunctionalRef[]) => {
      for (const ref of refs) {
        add(kind, `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`);
      }
    };

    const contextPayload = input.extraction_context_packet.payload;
    for (const code of this.stringArrayAt(input.extraction_context_packet, ['blocker_codes'])) {
      add('blocker', code);
    }
    for (const code of this.stringArrayAt(contextPayload, ['blocker_codes'])) {
      add('blocker', code);
    }
    addRefIds('residual_risk', [
      ...this.functionalRefsAt(input.extraction_context_packet, ['residual_risk_refs']),
      ...this.functionalRefsAt(contextPayload, ['residual_risk_refs']),
    ]);
    addRefIds('accepted_risk', this.functionalRefsAt(contextPayload, ['accepted_risk_refs']));
    for (const warningCode of this.stringArrayAt(input.search_run_handoff.source_health_summary, ['warning_codes'])) {
      add('source_health_warning', warningCode);
    }
    for (const warningCode of this.stringArrayAt(input.extraction_context_packet, ['source_health_warning_codes'])) {
      add('source_health_warning', warningCode);
    }
    for (const warningCode of this.stringArrayAt(contextPayload, ['source_health_warning_codes'])) {
      add('source_health_warning', warningCode);
    }
    for (const gapCode of this.stringArrayAt(input.extraction_context_packet, ['method_family_gap_codes'])) {
      add('method_family_gap', gapCode);
    }
    for (const gapCode of this.stringArrayAt(contextPayload, ['method_family_gap_codes'])) {
      add('method_family_gap', gapCode);
    }
    addRefIds('unresolved_challenge', [
      ...this.functionalRefsAt(input.extraction_context_packet, ['unresolved_challenge_refs']),
      ...this.functionalRefsAt(contextPayload, ['unresolved_challenge_refs']),
    ]);
    addRefIds('recheck_hint', [
      ...this.functionalRefsAt(input.extraction_context_packet, ['recheck_hint_refs']),
      ...this.functionalRefsAt(contextPayload, ['recheck_hint_refs']),
    ]);
    return inventory;
  }

  private needAdjudicationCompressionFactInventory(
    preservedFactKinds: string[],
    input: BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput,
  ): TopicSelectionCompressionFactInventory {
    const inventory: TopicSelectionCompressionFactInventory = {};
    const add = (kind: string, value: string | null | undefined) => {
      const normalized = value?.trim();
      if (!normalized || !preservedFactKinds.includes(kind)) {
        return;
      }
      inventory[kind] = this.uniqueStrings([...(inventory[kind] ?? []), normalized]);
    };
    const addRefIds = (kind: string, refs: TopicSelectionFunctionalRef[]) => {
      for (const ref of refs) {
        add(kind, `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`);
      }
    };
    const packetPayload = input.support_packet.packet_payload;

    for (const blocker of input.readiness.blockers) {
      add('blocker', blocker.code);
    }
    for (const code of this.stringArrayAt(packetPayload, ['blocker_codes'])) {
      add('blocker', code);
    }
    addRefIds('residual_risk', [
      ...input.support_packet.residual_risk_refs,
      ...input.candidate.unresolved_challenge_refs,
      ...this.functionalRefsAt(packetPayload, ['residual_risk_refs']),
    ]);
    addRefIds('accepted_risk', [
      ...input.candidate.accepted_risk_refs,
      ...input.readiness.accepted_risk_refs,
      ...this.functionalRefsAt(packetPayload, ['accepted_risk_refs']),
    ]);
    for (const warning of input.readiness.warnings) {
      add('source_health_warning', warning.code);
    }
    for (const code of this.stringArrayAt(packetPayload, ['source_health_warning_codes'])) {
      add('source_health_warning', code);
    }
    for (const gapCode of [...input.candidate.gap_codes, ...input.readiness.gap_codes, ...input.support_packet.open_gap_codes]) {
      add('method_family_gap', gapCode);
    }
    addRefIds('unresolved_challenge', [
      ...input.candidate.unresolved_challenge_refs,
      ...input.support_packet.conflict_refs,
      ...this.functionalRefsAt(packetPayload, ['unresolved_challenge_refs']),
    ]);
    addRefIds('recheck_hint', [
      ...input.candidate.open_recheck_request_refs,
      ...input.readiness.open_recheck_request_refs,
      ...this.functionalRefsAt(packetPayload, ['recheck_hint_refs']),
      ...this.functionalRefsAt(packetPayload, ['recheck_request_refs']),
    ]);
    return inventory;
  }

  private humanConfirmationCompressionFactInventory(
    preservedFactKinds: string[],
    contextPacket: HumanConfirmationSemanticReviewContextPacket,
  ): TopicSelectionCompressionFactInventory {
    const inventory: TopicSelectionCompressionFactInventory = {};
    const add = (kind: string, value: string | null | undefined) => {
      const normalized = value?.trim();
      if (!normalized || !preservedFactKinds.includes(kind)) {
        return;
      }
      inventory[kind] = this.uniqueStrings([...(inventory[kind] ?? []), normalized]);
    };
    const addRefIds = (kind: string, refs: TopicSelectionFunctionalRef[]) => {
      for (const ref of refs) {
        add(kind, `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`);
      }
    };
    addRefIds('residual_risk', [
      ...this.functionalRefsAt(contextPacket, ['residual_risk_refs']),
      ...this.functionalRefsAt(contextPacket, ['confirmation_input', 'residual_risk_refs']),
    ]);
    addRefIds('accepted_risk', [
      ...this.functionalRefsAt(contextPacket, ['accepted_risk_refs']),
      ...this.functionalRefsAt(contextPacket, ['confirmation_input', 'accepted_risk_refs']),
    ]);
    for (const code of this.stringArrayAt(contextPacket, ['warning_codes'])) {
      add('source_health_warning', code);
    }
    for (const code of this.stringArrayAt(contextPacket, ['source_health_warning_codes'])) {
      add('source_health_warning', code);
    }
    for (const code of this.stringArrayAt(contextPacket, ['gap_codes'])) {
      add('method_family_gap', code);
    }
    for (const code of this.stringArrayAt(contextPacket, ['method_family_gap_codes'])) {
      add('method_family_gap', code);
    }
    addRefIds('unresolved_challenge', [
      ...this.functionalRefsAt(contextPacket, ['unresolved_challenge_refs']),
    ]);
    addRefIds('recheck_hint', [
      ...this.functionalRefsAt(contextPacket, ['recheck_hint_refs']),
      ...this.functionalRefsAt(contextPacket, ['recheck_request_refs']),
    ]);
    if (Array.isArray(contextPacket.confirmation_input.required_check_results)) {
      for (const result of contextPacket.confirmation_input.required_check_results) {
        if (this.isRecord(result) && result.result !== 'accepted') {
          add('blocker', `REQUIRED_CHECK_NOT_ACCEPTED:${String(result.check_id ?? 'unknown_check')}`);
        }
      }
    }
    return inventory;
  }

  private compactPayload(value: unknown, depth = 0): unknown {
    if (typeof value === 'string') {
      return value.length > 700
        ? {
            truncated_text: true,
            preview: value.slice(0, 700),
            original_length: value.length,
            full_hash: sha256Text(value),
          }
        : value;
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      const maxItems = depth <= 2 ? 18 : 10;
      const keptItems = value.slice(0, maxItems).map((item) => this.compactPayload(item, depth + 1));
      if (value.length <= maxItems) {
        return keptItems;
      }
      return {
        truncated_array: true,
        kept_items: keptItems,
        omitted_count: value.length - maxItems,
        full_hash: sha256Text(stableStringify(value)),
      };
    }
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = depth >= 5
        ? {
            truncated_object: true,
            full_hash: sha256Text(stableStringify(child)),
          }
        : this.compactPayload(child, depth + 1);
    }
    return output;
  }

  private syntheticEvidenceExtractionCompressionReportRef(
    input: BuildTopicSelectionV1aEvidenceExtractionRuntimeBindingInput,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'compression_report',
      ref_id: `compression_report_${this.hash({
        node_attempt_id: input.node_attempt_id,
        search_run_handoff_hash: this.hash(input.search_run_handoff),
        extraction_context_packet_hash: this.hash(input.extraction_context_packet),
        profile_id: input.profile_id,
      }).slice(0, 32)}`,
      title_card_id: input.title_card_id,
    };
  }

  private syntheticNeedAdjudicationCompressionReportRef(
    input: BuildTopicSelectionV1aNeedAdjudicationRuntimeBindingInput,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'compression_report',
      ref_id: `compression_report_${this.hash({
        node_attempt_id: input.node_attempt_id,
        candidate_hash: this.hash(input.candidate),
        readiness_hash: this.hash(input.readiness),
        support_packet_hash: this.hash(input.support_packet),
        profile_id: input.profile_id ?? TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
      }).slice(0, 32)}`,
      title_card_id: input.title_card_id,
    };
  }

  private syntheticHumanConfirmationCompressionReportRef(
    input: BuildTopicSelectionV1aHumanConfirmationRuntimeBindingInput,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'compression_report',
      ref_id: `compression_report_${this.hash({
        node_attempt_id: input.node_attempt_id,
        context_packet_hash: input.context_packet.context_packet_hash,
        profile_id: input.profile_id ?? null,
      }).slice(0, 32)}`,
      title_card_id: input.title_card_id,
    };
  }

  private functionalRefsAt(value: unknown, path: string[]): TopicSelectionFunctionalRef[] {
    let current = value;
    for (const segment of path) {
      if (!this.isRecord(current)) {
        return [];
      }
      current = current[segment];
    }
    if (!Array.isArray(current)) {
      return [];
    }
    return current.filter((item): item is TopicSelectionFunctionalRef => this.isFunctionalRef(item));
  }

  private stringArrayAt(value: unknown, path: string[]): string[] {
    let current = value;
    for (const segment of path) {
      if (!this.isRecord(current)) {
        return [];
      }
      current = current[segment];
    }
    if (!Array.isArray(current)) {
      return [];
    }
    return current
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }

  private isFunctionalRef(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isRecord(value)
      && typeof value.ref_type === 'string'
      && typeof value.ref_id === 'string';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private runtimeInvocationContextHash(input: {
    invocationSlotId: string;
    scenarioId?: string | null;
    scenarioCaseId?: string | null;
  }): string {
    const semanticScenarioKey = this.semanticScenarioKey(input.scenarioId ?? null, input.scenarioCaseId ?? null);
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: input.invocationSlotId,
      scenario_context: semanticScenarioKey
        ? {
          identity_policy: 'semantic_identity',
          scenario_id: input.scenarioId ?? null,
          scenario_case_id: input.scenarioCaseId ?? null,
          semantic_scenario_key: semanticScenarioKey,
        }
        : {
          identity_policy: 'not_semantic',
          scenario_id: null,
          scenario_case_id: null,
          semantic_scenario_key: null,
        },
      loop_context: {
        loop_kind: 'not_applicable',
        loop_stage: null,
        current_round_index: null,
        remaining_round_budget: null,
        loopback_source_node_id: null,
        repair_origin_ref: null,
        repair_origin_hash: null,
      },
      debate_context: {
        debate_loop_id: null,
        debate_policy_id: null,
        round_index: null,
        role: null,
        stage: null,
        agent_instance_id: null,
        parent_invocation_attempt_ids_hash: null,
        dynamic_material_refs_hash: null,
      },
    });
  }

  private semanticScenarioKey(
    scenarioId: string | null,
    scenarioCaseId: string | null,
  ): string | null {
    const normalizedScenarioId = scenarioId?.trim() || null;
    const normalizedScenarioCaseId = scenarioCaseId?.trim() || null;
    const semanticMarker = [normalizedScenarioId, normalizedScenarioCaseId]
      .some((value) => value?.includes('semantic-runtime-identity') || value?.startsWith('semantic:'));
    if (!semanticMarker) {
      return null;
    }
    return this.hash({
      scenario_id: normalizedScenarioId,
      scenario_case_id: normalizedScenarioCaseId,
    });
  }

  private asArtifactRef(ref: TopicSelectionFunctionalRef | null): TopicSelectionArtifactFunctionalRef | null {
    return ref?.ref_type === 'artifact_ref' ? ref as TopicSelectionArtifactFunctionalRef : null;
  }

  private uniqueArtifactRefs(
    refs: Array<TopicSelectionArtifactFunctionalRef | null | undefined>,
  ): TopicSelectionArtifactFunctionalRef[] {
    return this.uniqueRefs(refs).filter((ref): ref is TopicSelectionArtifactFunctionalRef =>
      ref.ref_type === 'artifact_ref',
    );
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string | null,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: versionId,
      title_card_id: titleCardId,
    };
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
