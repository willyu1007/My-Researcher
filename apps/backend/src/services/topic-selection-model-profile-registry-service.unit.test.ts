import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../errors/app-error.js';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  createDefaultTopicSelectionModelProfileRegistry,
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
  TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
  TOPIC_SELECTION_V1B_CONSTRAINT_PROFILE_SUPPORT_PROFILE_ID,
  TOPIC_SELECTION_V1B_N7_CANDIDATE_GROUPING_SUPPORT_PROFILE_ID,
  TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
  TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import type {
  TopicSelectionModelProfileRegistry,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';

const PAPER_IMPLEMENTATION_PROMOTED_PROFILE_IDS = [
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
] as const;

function cloneRegistry(
  registry: TopicSelectionModelProfileRegistry,
): TopicSelectionModelProfileRegistry {
  return JSON.parse(JSON.stringify(registry)) as TopicSelectionModelProfileRegistry;
}

test('model profile registry validates default DMP v1 profiles and resolves provider option', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  const validation = service.validateRegistry();
  assert.equal(validation.valid, true);
  assert.equal(validation.issue_count, 0);

  const singleAgent = service.resolveProfile({
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'codex_assisted',
    run_mode: 'product',
  });
  assert.equal(singleAgent.profile.output_contract, 'RankedCandidateDraftBatch@v1');
  assert.equal(singleAgent.selected_model_option, null);

  const evidenceExtraction = service.resolveProfile({
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });
  assert.equal(evidenceExtraction.profile.output_contract, 'TopicSelectionEvidenceMapExtractionDraft@v1');
  assert.equal(evidenceExtraction.profile.profile_function, 'evidence_map_extraction_single_agent');
  assert.equal(evidenceExtraction.selected_model_option?.provider_id, 'openai');
  assert.equal(evidenceExtraction.selected_model_option?.normalized_params.reasoning_depth, 'high');

  const adjudication = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });
  assert.equal(adjudication.profile.output_contract, 'TopicSelectionNeedAdjudicationRecommendationPacket@v1');
  assert.equal(adjudication.profile.profile_function, 'need_adjudication_single_agent');
  assert.equal(adjudication.selected_model_option?.normalized_params.creativity, 'low');
  assert.equal(adjudication.selected_model_option?.normalized_params.reasoning_depth, 'high');

  const confirmationReview = service.resolveProfile({
    profile_id: TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });
  assert.equal(confirmationReview.profile.output_contract, 'HumanConfirmationSemanticReview@v1');
  assert.equal(confirmationReview.profile.profile_function, 'human_confirmation_semantic_review_single_agent');
  assert.equal(confirmationReview.selected_model_option?.normalized_params.creativity, 'low');
  assert.equal(confirmationReview.selected_model_option?.normalized_params.reasoning_depth, 'high');

  const resolved = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });

  assert.equal(resolved.profile.role_family, 'explorer');
  assert.equal(resolved.selected_model_option?.provider_id, 'openai');
  assert.equal(resolved.selected_model_option?.model_id, 'gpt-5.5');
  assert.equal(resolved.selected_model_option?.use_when.includes('default_provider_run'), true);
  assert.equal(resolved.selected_model_option?.request_policy?.timeout_ms, 180000);
  assert.match(resolved.profile_hash, /^[a-f0-9]{64}$/);
  assert.match(resolved.normalized_params_hash ?? '', /^[a-f0-9]{64}$/);

  const quality = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.openai-quality`,
  });
  assert.equal(quality.selected_model_option?.model_id, 'gpt-5.5');
  assert.equal(quality.selected_model_option?.normalized_params.reasoning_depth, 'high');
  assert.equal(quality.selected_model_option?.request_policy?.timeout_ms, 300000);

  const deepReasoning = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.openai-deep-reasoning`,
  });
  assert.equal(deepReasoning.selected_model_option?.model_id, 'gpt-5.5');
  assert.equal(deepReasoning.selected_model_option?.normalized_params.reasoning_depth, 'high');
  assert.equal(deepReasoning.selected_model_option?.request_policy?.timeout_ms, 450000);

  const dashscopeThinking = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-thinking-budget`,
  });
  assert.equal(dashscopeThinking.selected_model_option?.provider_id, 'dashscope');
  assert.equal(dashscopeThinking.selected_model_option?.model_id, 'qwen3.6-plus');
  assert.equal(dashscopeThinking.selected_model_option?.request_policy?.timeout_ms, 300000);
  assert.deepEqual(dashscopeThinking.selected_model_option?.provider_overrides, {
    enable_thinking: true,
  });
  assert.equal(
    dashscopeThinking.selected_model_option?.use_when.includes('thinking_budget_manual_selection'),
    true,
  );

  const legacyDashscopeBudget = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-budget`,
  });
  assert.equal(legacyDashscopeBudget.selected_model_option?.provider_id, 'dashscope');
  assert.equal(legacyDashscopeBudget.selected_model_option?.request_policy?.timeout_ms, 300000);
  assert.deepEqual(legacyDashscopeBudget.selected_model_option?.provider_overrides, {
    enable_thinking: true,
  });
  assert.equal(
    legacyDashscopeBudget.selected_model_option?.use_when.includes('legacy_budget_sensitive_manual_selection'),
    true,
  );

  const deepSeekExplorer = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.deepseek-v4-thinking`,
  });
  assert.equal(deepSeekExplorer.selected_model_option?.provider_id, 'deepseek');
  assert.equal(deepSeekExplorer.selected_model_option?.model_id, 'deepseek-v4-pro');
  assert.equal(deepSeekExplorer.selected_model_option?.normalized_params.reasoning_depth, 'high');
  assert.equal(deepSeekExplorer.selected_model_option?.request_policy?.timeout_ms, 450000);
  assert.deepEqual(deepSeekExplorer.selected_model_option?.provider_overrides, {
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
  });

  const deepSeekDeepCritic = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.deepseek-v4-thinking`,
  });
  assert.equal(deepSeekDeepCritic.selected_model_option?.provider_id, 'deepseek');

  const arbiterFinal = service.resolveProfile({
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });
  assert.equal(
    arbiterFinal.profile.model_options.some((option) => option.provider_id === 'deepseek'),
    false,
  );

  const v1bSliceOptions = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'acceptance',
    model_option_id: `${TOPIC_SELECTION_V1B_RESEARCH_SLICE_OPTIONS_SINGLE_AGENT_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(v1bSliceOptions.profile.output_contract, 'ResearchSliceOptionSetDraft@v1');
  assert.equal(v1bSliceOptions.selected_model_option?.provider_id, 'openai');

  const v1bQuestionCandidates = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1B_TOPIC_QUESTION_CANDIDATES_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'codex_assisted',
    run_mode: 'product',
  });
  assert.equal(v1bQuestionCandidates.profile.output_contract, 'TopicQuestionCandidateSetDraft@v1');
  assert.equal(v1bQuestionCandidates.selected_model_option, null);

  const v1bValueAssessment = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'acceptance',
    model_option_id: `${TOPIC_SELECTION_V1B_TOPIC_VALUE_ASSESSMENT_SINGLE_AGENT_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(v1bValueAssessment.profile.output_contract, 'TopicValueAssessmentDraft@v1');
  assert.equal(v1bValueAssessment.selected_model_option?.normalized_params.reasoning_depth, 'high');

  const v1bConstraintSupport = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1B_CONSTRAINT_PROFILE_SUPPORT_PROFILE_ID,
    execution_mode: 'codex_assisted',
    run_mode: 'product',
  });
  assert.equal(v1bConstraintSupport.profile.output_contract, 'ResearchConstraintProfileDraftSupport@v1');
  assert.equal(v1bConstraintSupport.profile.model_options.length, 0);

  const v1bGroupingSupport = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1B_N7_CANDIDATE_GROUPING_SUPPORT_PROFILE_ID,
    execution_mode: 'mocked_llm',
    run_mode: 'test',
  });
  assert.equal(v1bGroupingSupport.profile.output_contract, 'CandidateGroupingSupport@v1');
  assert.equal(v1bGroupingSupport.selected_model_option, null);

  const v1cPromotionSupport = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'acceptance',
    model_option_id: `${TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(
    v1cPromotionSupport.profile.output_contract,
    'TopicSelectionPromotionDecisionSupportLlmDraft@v1',
  );
  assert.equal(v1cPromotionSupport.selected_model_option?.provider_id, 'openai');
  assert.equal(v1cPromotionSupport.selected_model_option?.model_id, 'gpt-5.5');

  const v1cBoundedDebateCodex = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
    execution_mode: 'codex_assisted',
    run_mode: 'product',
  });
  assert.equal(
    v1cBoundedDebateCodex.profile.output_contract,
    'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
  );
  assert.equal(v1cBoundedDebateCodex.profile.profile_function, 'v1c_promotion_support_bounded_micro_debate');
  assert.equal(v1cBoundedDebateCodex.selected_model_option, null);

  const v1cBoundedDebateProvider = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'acceptance',
    model_option_id: `${TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(v1cBoundedDebateProvider.selected_model_option?.provider_id, 'openai');
  assert.equal(v1cBoundedDebateProvider.selected_model_option?.normalized_params.creativity, 'low');
  assert.equal(v1cBoundedDebateProvider.selected_model_option?.normalized_params.output_budget, 'large');

  const v1cDelegatedPromotionDecision = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'acceptance',
    model_option_id: `${TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(
    v1cDelegatedPromotionDecision.profile.output_contract,
    'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1',
  );
  assert.equal(
    v1cDelegatedPromotionDecision.profile.profile_function,
    'v1c_delegated_promotion_decision_candidate',
  );
  assert.equal(v1cDelegatedPromotionDecision.profile.stage_family, 'v1c_human_promotion_decision');
  assert.equal(v1cDelegatedPromotionDecision.selected_model_option?.provider_id, 'openai');
  assert.equal(v1cDelegatedPromotionDecision.selected_model_option?.normalized_params.creativity, 'low');

  const v1cFeedbackNormalization = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'acceptance',
    model_option_id: `${TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(
    v1cFeedbackNormalization.profile.output_contract,
    'TopicSelectionV1cDownstreamFeedbackCandidate@v1',
  );
  assert.equal(v1cFeedbackNormalization.profile.stage_family, 'v1c_downstream_feedback_recheck');
  assert.equal(v1cFeedbackNormalization.selected_model_option?.provider_id, 'openai');
  assert.equal(v1cFeedbackNormalization.selected_model_option?.normalized_params.creativity, 'low');
});

test('model profile registry resolves resource sampling provider-only profile', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  const resourceSampling = service.resolveProfile({
    profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });
  assert.equal(resourceSampling.profile.profile_function, 'resource_sampling_literature_classification');
  assert.equal(resourceSampling.profile.stage_family, 'resource_sampling');
  assert.equal(resourceSampling.profile.allowed_execution_modes.includes('provider_llm'), true);
  assert.equal(resourceSampling.profile.allowed_execution_modes.includes('mocked_llm'), false);
  assert.equal(resourceSampling.profile.output_contract, 'TopicSelectionResourceSamplingLlmOutput@v1');
  assert.equal(resourceSampling.selected_model_option?.provider_id, 'openai');
  assert.equal(resourceSampling.selected_model_option?.model_id, 'gpt-5.5');
  assert.equal(resourceSampling.selected_model_option?.normalized_params.creativity, 'low');
  assert.equal(resourceSampling.selected_model_option?.normalized_params.output_budget, 'medium');

  const dashscope = service.resolveProfile({
    profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID}.dashscope-thinking-budget`,
  });
  assert.equal(dashscope.selected_model_option?.provider_id, 'dashscope');
  assert.equal(dashscope.selected_model_option?.model_id, 'qwen3.6-plus');
});

test('model profile registry keeps PaperImplementation product mode provider-only', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  for (const profileId of PAPER_IMPLEMENTATION_PROMOTED_PROFILE_IDS) {
    const productProvider = service.resolveProfile({
      profile_id: profileId,
      execution_mode: 'provider_llm',
      run_mode: 'product',
    });
    assert.deepEqual(productProvider.profile.run_mode_eligibility, {
      mocked_llm: ['test', 'acceptance'],
      codex_assisted: ['test', 'acceptance'],
      provider_llm: ['acceptance', 'product'],
    });
    assert.equal(productProvider.selected_model_option?.provider_id, 'openai');

    assert.throws(
      () => service.resolveProfile({
        profile_id: profileId,
        execution_mode: 'codex_assisted',
        run_mode: 'product',
      }),
      (error: unknown) =>
        error instanceof AppError
        && error.errorCode === 'INVALID_PAYLOAD'
        && error.message === 'run_mode is not allowed by model profile.',
    );
    assert.throws(
      () => service.resolveProfile({
        profile_id: profileId,
        execution_mode: 'mocked_llm',
        run_mode: 'product',
      }),
      (error: unknown) =>
        error instanceof AppError
        && error.errorCode === 'INVALID_PAYLOAD'
        && error.message === 'run_mode is not allowed by model profile.',
    );

    const codexAcceptance = service.resolveProfile({
      profile_id: profileId,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
    });
    assert.equal(codexAcceptance.selected_model_option, null);

    const mockedTest = service.resolveProfile({
      profile_id: profileId,
      execution_mode: 'mocked_llm',
      run_mode: 'test',
    });
    assert.equal(mockedTest.selected_model_option, null);
  }
});

test('model profile registry resolves motive decomposition profile and rejects foreign model option', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  const resolved = service.resolveProfile({
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(resolved.profile.profile_function, 'paper_implementation_motive_decomposition_draft_assertion_candidates');
  assert.equal(resolved.profile.stage_family, 'paper_implementation_motive_decomposition');
  assert.equal(resolved.profile.output_contract, 'PaperImplementationMotiveDecompositionRoleArtifact@v1');
  assert.equal(resolved.selected_model_option?.provider_id, 'openai');
  assert.equal(resolved.selected_model_option?.normalized_params.creativity, 'low');
  assert.equal(resolved.selected_model_option?.normalized_params.reasoning_depth, 'high');
  assert.equal(resolved.selected_model_option?.normalized_params.output_budget, 'large');

  assert.throws(
    () => service.resolveProfile({
      profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
      execution_mode: 'provider_llm',
      run_mode: 'product',
      model_option_id: `${PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID}.openai-balanced`,
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message === 'model_option_id is not defined by model profile.',
  );
});

test('model profile registry resolves motive evolution profile and rejects foreign model option', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  const resolved = service.resolveProfile({
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID}.openai-balanced`,
  });
  assert.equal(resolved.profile.profile_function, 'paper_implementation_motive_evolution_evolution_decision_support');
  assert.equal(resolved.profile.stage_family, 'paper_implementation_motive_evolution');
  assert.equal(resolved.profile.output_contract, 'PaperImplementationMotiveEvolutionRoleArtifact@v1');
  assert.equal(
    resolved.profile.quality_objectives.includes(
      'produce_admission_ready_evolution_decision_support_options',
    ),
    true,
  );
  assert.equal(resolved.selected_model_option?.provider_id, 'openai');
  assert.equal(resolved.selected_model_option?.normalized_params.creativity, 'low');
  assert.equal(resolved.selected_model_option?.normalized_params.reasoning_depth, 'high');
  assert.equal(resolved.selected_model_option?.normalized_params.output_budget, 'large');
  assert.equal(resolved.selected_model_option?.use_when.includes('default_provider_run'), true);

  assert.throws(
    () => service.resolveProfile({
      profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
      execution_mode: 'provider_llm',
      run_mode: 'product',
      model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`,
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message === 'model_option_id is not defined by model profile.',
  );
});

test('model profile registry enforces run-mode and role profile execution eligibility', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  assert.throws(
    () => service.resolveProfile({
      profile_id: TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
      execution_mode: 'mocked_llm',
      run_mode: 'product',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  assert.throws(
    () => service.resolveProfile({
      profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  assert.throws(
    () => service.resolveProfile({
      profile_id: TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('model profile registry catches duplicate profile and model option ids', () => {
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  registry.profiles.push(cloneRegistry(registry).profiles[0]!);
  registry.profiles[0]!.model_options.push({ ...registry.profiles[0]!.model_options[0]! });

  const service = new TopicSelectionModelProfileRegistryService({ registry });
  const validation = service.validateRegistry();

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'DUPLICATE_PROFILE_ID'));
  assert.ok(validation.issues.some((issue) => issue.code === 'DUPLICATE_MODEL_OPTION_ID'));
});

test('model profile registry catches DMP policy drift in valid-shaped profiles', () => {
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const profile = registry.profiles[0]!;
  profile.run_mode_eligibility.mocked_llm = ['test', 'acceptance', 'product'];
  profile.audit_policy.store_raw_provider_response = true;
  profile.audit_policy.forbid_hidden_reasoning = false;
  profile.failure_handling_policy.technical_retry.require_same_context_packet_hashes = false;
  profile.budget_policy.max_provider_attempts = 1;
  profile.required_capabilities = ['json_schema'];

  const service = new TopicSelectionModelProfileRegistryService({ registry });
  const validation = service.validateRegistry();
  const codes = validation.issues.map((issue) => issue.code);

  assert.equal(validation.valid, false);
  assert.ok(codes.includes('MOCK_PRODUCT_MODE_FORBIDDEN'));
  assert.ok(codes.includes('RAW_PROVIDER_RESPONSE_AUDIT_FORBIDDEN'));
  assert.ok(codes.includes('HIDDEN_REASONING_AUDIT_FORBIDDEN'));
  assert.ok(codes.includes('TECHNICAL_RETRY_MUST_PRESERVE_INVOCATION'));
  assert.ok(codes.includes('BUDGET_ATTEMPTS_BELOW_TECHNICAL_RETRY'));
  assert.ok(codes.includes('STRUCTURED_OUTPUT_CAPABILITY_REQUIRED'));
});

test('model profile registry rejects unknown provider and explicit unknown model option', () => {
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  registry.profiles[0]!.model_options[0]!.provider_id =
    'unknown-provider' as (typeof registry.profiles)[number]['model_options'][number]['provider_id'];
  const invalidProvider = new TopicSelectionModelProfileRegistryService({ registry });
  // Since provider_id is enum-constrained in the contract schema (T-123 Phase 1.3), an unknown
  // provider is rejected at schema level before the semantic provider check runs.
  assert.equal(
    invalidProvider.validateRegistry().issues.some(
      (issue) => issue.code === 'SCHEMA_VALIDATION_FAILED' || issue.code === 'UNKNOWN_PROVIDER_ID',
    ),
    true,
  );

  // The semantic UNKNOWN_PROVIDER_ID layer still guards schema-valid providers that are not
  // registered for this service instance (custom registeredProviderIds subset).
  const narrowedProviders = new TopicSelectionModelProfileRegistryService({
    registeredProviderIds: ['openai'],
  });
  assert.equal(
    narrowedProviders.validateRegistry().issues.some((issue) => issue.code === 'UNKNOWN_PROVIDER_ID'),
    true,
  );

  const service = new TopicSelectionModelProfileRegistryService();
  assert.throws(
    () => service.resolveProfile({
      profile_id: 'topic-selection.need-discovery.explorer.v1',
      execution_mode: 'provider_llm',
      run_mode: 'product',
      model_option_id: 'missing-option',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message === 'model_option_id is not defined by model profile.',
  );
});

test('model profile registry validates provider_overrides keys per provider (T-123 Phase 1.3)', () => {
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const openAiOption = registry.profiles
    .flatMap((profile) => profile.model_options)
    .find((option) => option.provider_id === 'openai');
  assert.ok(openAiOption);
  openAiOption!.provider_overrides = { enable_thinking: true };
  const service = new TopicSelectionModelProfileRegistryService({ registry });
  assert.equal(
    service.validateRegistry().issues.some((issue) => issue.code === 'PROVIDER_OVERRIDES_INVALID'),
    true,
  );

  const badShape = createDefaultTopicSelectionModelProfileRegistry();
  const dashOption = badShape.profiles
    .flatMap((profile) => profile.model_options)
    .find((option) => option.provider_id === 'dashscope');
  assert.ok(dashOption);
  dashOption!.provider_overrides = { enable_thinking: 'yes' } as unknown as typeof dashOption.provider_overrides;
  const badShapeService = new TopicSelectionModelProfileRegistryService({ registry: badShape });
  assert.equal(
    badShapeService.validateRegistry().issues.some((issue) => issue.code === 'SCHEMA_VALIDATION_FAILED'),
    true,
  );
});

// f0 (T-127 W-07 step f): the 3 N6 divergent-debate roles must share codex eligibility so a uniform
// codex_assisted N6 debate can run in product (the N8-mirror runtime threads ONE execution_mode and
// product forbids mocked_llm). This is a tripwire: re-barring the arbiter from codex (the prior v1a
// stance) would re-introduce the product deadlock and turn this test red.
test('model profile registry: N6 divergent-debate arbiter is codex-eligible in product (f0, aligns N8)', () => {
  const service = new TopicSelectionModelProfileRegistryService();

  for (const profileId of [
    TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
    TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
    TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  ]) {
    const resolved = service.resolveProfile({
      profile_id: profileId,
      execution_mode: 'codex_assisted',
      run_mode: 'product',
    });
    // Pre-f0 the arbiter's run_mode_eligibility.codex_assisted was [] → this threw
    // 'run_mode is not allowed by model profile.'. f0 removed that override.
    assert.equal(resolved.profile.allowed_execution_modes.includes('codex_assisted'), true);
    assert.deepEqual(resolved.profile.run_mode_eligibility.codex_assisted, ['acceptance', 'product']);
  }

  // The arbiter specifically — the gate-facing synthesizer — now mirrors N8: codex permitted as a
  // base execution mode (distinct from the scenario's codex_substitution_policy, which stays false).
  const arbiter = service.resolveProfile({
    profile_id: TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
    execution_mode: 'codex_assisted',
    run_mode: 'product',
  });
  assert.equal(arbiter.profile.role_family, 'arbiter');
  assert.equal(arbiter.profile.output_contract, 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1');
});
