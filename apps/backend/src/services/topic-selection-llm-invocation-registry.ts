import { AppError } from '../errors/app-error.js';

// Topic-selection LLM invocation registry (T-123 Phase 1.4).
//
// SSOT catalog of every prompt-template id and structured-output schema name used by
// topic-selection LLM call sites. Two enforcement layers consume it:
//   1. Runtime: BackendLlmGateway.createStructuredOutput rejects any request whose
//      promptTemplateId starts with 'topic-selection' but is not registered here.
//   2. CI: topic-selection-llm-invocation-lint.unit.test.ts scans topic-selection source
//      literals (services + shared research-lifecycle contracts) and asserts they are
//      all registered, so adding a call site without registering it fails the suite.
//
// v1 enforcement is id membership + non-empty version. Exact version pinning is deferred
// until prompt template contents are centralized (templates today live inline in services
// and accept caller version overrides by design).

export const TOPIC_SELECTION_PROMPT_TEMPLATE_IDS = new Set<string>([
  // v1a
  'topic-selection-evidence-map-extraction',
  'topic-selection-generate-need-candidate',
  'topic-selection-need-adjudication',
  'topic-selection-human-confirmation-semantic-review',
  // v1a need-discovery debate roles (shared debate scenario contracts)
  'topic-selection-need-discovery-explorer',
  'topic-selection-need-discovery-deep-critic',
  'topic-selection-need-discovery-arbiter-issue-frame',
  'topic-selection-need-discovery-arbiter-final',
  // resource sampling
  'topic-selection-resource-sampling-classification',
  // v1b harness runtime slots
  'topic-selection.v1b.n2.constraint-profile.runtime-support',
  'topic-selection.v1b.n3.intake-readiness.runtime-support',
  'topic-selection.v1b.n4.research-slice-options.runtime-draft',
  'topic-selection.v1b.n5.slice-selection.runtime-support',
  'topic-selection.v1b.n6.question-candidate-draft.runtime-initial',
  'topic-selection.v1b.n6.loopback-triage.runtime-support',
  'topic-selection.v1b.n7.candidate-grouping.runtime-support',
  'topic-selection.v1b.n7.failed-trial-synthesis.runtime-support',
  'topic-selection.v1b.n7.n8-debate-admission-review.runtime-support',
  'topic-selection.v1b.n8.topic-value-assessment.runtime-draft',
  'topic-selection.v1b.n8.bounded-micro-debate.runtime-role',
  // v1b N6 divergent candidate debate roles (W-07, shared debate scenario contract)
  'topic-selection-v1b-n6-debate-explorer',
  'topic-selection-v1b-n6-debate-critic',
  'topic-selection-v1b-n6-debate-arbiter',
  // v1c
  'topic-selection-promotion-decision-support',
  'topic-selection-v1c-promotion-support-bounded-micro-debate',
  'topic-selection-v1c-delegated-promotion-decision',
  'topic-selection-v1c-downstream-feedback-normalization',
  // provider canaries
  'topic-selection-provider-canary-live-required',
  'topic-selection-v1b-n4-provider-canary-live-required',
  'topic-selection-v1b-n6-provider-canary-live-required',
  'topic-selection-v1b-n8-provider-canary-live-required',
]);

export const TOPIC_SELECTION_OUTPUT_SCHEMA_NAMES = new Set<string>([
  // v1a / discovery
  'topic_selection_ranked_candidate_draft_batch',
  'topic_selection_need_discovery_explorer_notes',
  'topic_selection_need_discovery_deep_critic_notes',
  'topic_selection_need_discovery_debate_issue_frame',
  'TopicSelectionEvidenceMapExtractionDraft@v1',
  // resource sampling
  'topic_selection_resource_sampling_classification',
  'topic_selection_resource_sampling_canary',
  // v1b harness runtime slots
  'TopicSelectionV1bN8BoundedDebateRoleOutput@v1',
  // v1b N6 divergent candidate debate role output (W-07)
  'topic_selection_v1b_n6_divergent_debate_role_output',
  // v1c
  'TopicSelectionPromotionDecisionSupportLlmDraft',
  'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
  // provider canaries
  'topic_selection_provider_canary_ranked_candidate_draft_batch',
  'topic_selection_v1b_n4_provider_canary_draft',
  'topic_selection_v1b_n6_provider_canary_draft',
  'topic_selection_v1b_n8_provider_canary_draft',
  'topic_selection_v1c_n2_provider_canary_role',
  'topic_selection_v1c_n4_decision_canary',
  'topic_selection_v1c_n6_feedback_canary',
]);

export function isTopicSelectionPromptTemplateId(promptTemplateId: string): boolean {
  return promptTemplateId.startsWith('topic-selection');
}

export function assertTopicSelectionLlmInvocationRegistered(input: {
  promptTemplateId: string;
  version: string;
}): void {
  if (!isTopicSelectionPromptTemplateId(input.promptTemplateId)) {
    return;
  }
  if (!TOPIC_SELECTION_PROMPT_TEMPLATE_IDS.has(input.promptTemplateId)) {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `topic-selection prompt template "${input.promptTemplateId}" is not registered in topic-selection-llm-invocation-registry.`,
    );
  }
  if (!input.version || input.version.trim() === '') {
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `topic-selection prompt template "${input.promptTemplateId}" was invoked without a version.`,
    );
  }
}
