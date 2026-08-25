import {
  topicSelectionActorRefSchema,
  topicSelectionFunctionalRefSchema,
  topicSelectionGateIssueSchema,
  type TopicSelectionActorRef,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
} from './topic-selection-control-plane-contracts.js';
import {
  topicSelectionEvidenceRoleBundleSchema,
  type TopicSelectionEvidenceRoleBundle,
} from './topic-selection-evidence-map-contracts.js';

export const TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION =
  'TopicSelectionNeedAdjudicationRecommendationPacket@v1' as const;
export const TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION =
  'TopicSelectionValidateNeedAdjudicationNodeResult@v1' as const;
export const TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION =
  'HumanConfirmationInput@v1' as const;
export const TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION =
  'HumanConfirmationSemanticReviewContextPacket@v1' as const;
export const TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION =
  'HumanConfirmationSemanticReview@v1' as const;
export const TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION =
  'TopicSelectionHumanConfirmNeedNodeResult@v1' as const;
export const TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION =
  'PublishV1bInputBundleNodeInput@v1' as const;
export const TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION =
  'TopicSelectionPublishV1bInputBundleNodeResult@v1' as const;

export const TOPIC_SELECTION_NEED_CANDIDATE_LIFECYCLE_STATUSES = [
  'hypothesis',
  'closed',
  'archived',
] as const;
export type TopicSelectionNeedCandidateLifecycleStatus =
  (typeof TOPIC_SELECTION_NEED_CANDIDATE_LIFECYCLE_STATUSES)[number];

export const TOPIC_SELECTION_NEED_CANDIDATE_DECISION_STATUSES = [
  'hypothesis',
  'ready_for_validation',
  'returned_for_revision',
  'searchplan_recheck_requested',
  'rejected',
  'parked',
  'merged',
  'resulted_in_validated_need',
] as const;
export type TopicSelectionNeedCandidateDecisionStatus =
  (typeof TOPIC_SELECTION_NEED_CANDIDATE_DECISION_STATUSES)[number];

export const TOPIC_SELECTION_NEED_CANDIDATE_REVIEW_STATUSES = [
  'unreviewed',
  'machine_checked',
  'needs_human_review',
  'human_reviewed',
  'human_confirmed',
] as const;
export type TopicSelectionNeedCandidateReviewStatus =
  (typeof TOPIC_SELECTION_NEED_CANDIDATE_REVIEW_STATUSES)[number];

export const TOPIC_SELECTION_NEED_CANDIDATE_FRESHNESS_STATUSES = [
  'current',
  'stale',
  'recheck_required',
  'superseded',
] as const;
export type TopicSelectionNeedCandidateFreshnessStatus =
  (typeof TOPIC_SELECTION_NEED_CANDIDATE_FRESHNESS_STATUSES)[number];

export const TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES = [
  'unknown',
  'no_strong_solution_found',
  'partial_solution_known',
  'already_solved',
  'falsified',
] as const;
export type TopicSelectionNeedPriorArtStatus =
  (typeof TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES)[number];

export const TOPIC_SELECTION_NEED_MECHANISM_TYPES = [
  'workflow_gap',
  'evaluation_gap',
  'method_gap',
  'system_gap',
  'data_gap',
  'theory_gap',
  'other',
] as const;
export type TopicSelectionNeedMechanismType =
  (typeof TOPIC_SELECTION_NEED_MECHANISM_TYPES)[number];

export const TOPIC_SELECTION_NEED_READINESS_RECOMMENDATIONS = [
  'ready_for_validation',
  'needs_scope_revision',
  'evidence_gap',
  'searchplan_recheck',
  'merge_required',
  'reject',
  'park',
] as const;
export type TopicSelectionNeedReadinessRecommendation =
  (typeof TOPIC_SELECTION_NEED_READINESS_RECOMMENDATIONS)[number];

export const TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS = [
  'validate',
  'return_to_candidate',
  'request_searchplan_recheck',
  'reject',
  'park',
  'merge',
] as const;
export type TopicSelectionNeedAdjudicationDecision =
  (typeof TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS)[number];

export const TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_STATUSES = [
  'ready',
  'blocked',
  'require_human_review',
] as const;
export type TopicSelectionValidateNeedAdjudicationNodeStatus =
  (typeof TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_STATUSES)[number];

export const TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_ROUTE_OUTCOMES = [
  'advance_to_human_confirmation',
  'repair_need_candidate',
  'repair_search_plan',
  'stop_rejected',
  'hold_candidate',
  'stop_merged',
  'blocked',
  'require_human_review',
] as const;
export type TopicSelectionValidateNeedAdjudicationRouteOutcome =
  (typeof TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_ROUTE_OUTCOMES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRMATION_ACTOR_MODES = [
  'human',
  'hybrid',
  'human_delegated',
] as const;
export type TopicSelectionHumanConfirmationActorMode =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_ACTOR_MODES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRMATION_DELEGATED_EXECUTOR_TYPES = [
  'codex',
  'provider_llm',
] as const;
export type TopicSelectionHumanConfirmationDelegatedExecutorType =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_DELEGATED_EXECUTOR_TYPES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRMATION_REQUIRED_CHECK_RESULTS = [
  'accepted',
  'not_applicable',
] as const;
export type TopicSelectionHumanConfirmationRequiredCheckResult =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_REQUIRED_CHECK_RESULTS)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_STATUSES = [
  'pass',
  'warning',
  'blocked',
] as const;
export type TopicSelectionHumanConfirmationSemanticReviewStatus =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_STATUSES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRMATION_RISK_COVERAGE_STATUSES = [
  'complete',
  'missing_required_acceptance',
] as const;
export type TopicSelectionHumanConfirmationRiskCoverageStatus =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_RISK_COVERAGE_STATUSES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRMATION_REQUIRED_CHECK_COVERAGE_STATUSES = [
  'complete',
  'incomplete',
] as const;
export type TopicSelectionHumanConfirmationRequiredCheckCoverageStatus =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_REQUIRED_CHECK_COVERAGE_STATUSES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_STATUSES = [
  'ready',
  'blocked',
  'require_human_review',
] as const;
export type TopicSelectionHumanConfirmNeedNodeStatus =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_STATUSES)[number];

export const TOPIC_SELECTION_HUMAN_CONFIRM_NEED_ROUTE_OUTCOMES = [
  'advance_to_publish_v1b_input_bundle',
  'blocked',
  'require_human_review',
] as const;
export type TopicSelectionHumanConfirmNeedRouteOutcome =
  (typeof TOPIC_SELECTION_HUMAN_CONFIRM_NEED_ROUTE_OUTCOMES)[number];

export const TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_STATUSES = [
  'ready',
  'blocked',
] as const;
export type TopicSelectionPublishV1bInputBundleNodeStatus =
  (typeof TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_STATUSES)[number];

export const TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_ROUTE_OUTCOMES = [
  'published_v1b_input_bundle',
  'blocked',
] as const;
export type TopicSelectionPublishV1bInputBundleRouteOutcome =
  (typeof TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_ROUTE_OUTCOMES)[number];

export const TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_IDEMPOTENCY_RESULTS = [
  'created_new_bundle',
  'reused_existing_bundle',
  'not_applicable',
] as const;
export type TopicSelectionPublishV1bInputBundleIdempotencyResult =
  (typeof TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_IDEMPOTENCY_RESULTS)[number];

export const TOPIC_SELECTION_NEED_LOOPBACK_TARGETS = [
  'none',
  'need_candidate',
  'evidence_map',
  'search_plan',
  'human_review',
] as const;
export type TopicSelectionNeedLoopbackTarget =
  (typeof TOPIC_SELECTION_NEED_LOOPBACK_TARGETS)[number];

export const TOPIC_SELECTION_NEED_REJECTED_REASONS = [
  'pseudo_gap',
  'already_solved',
  'too_narrow',
  'too_broad',
  'weak_value',
  'insufficient_evidence',
  'out_of_scope',
  'duplicate',
  'other',
] as const;
export type TopicSelectionNeedRejectedReason =
  (typeof TOPIC_SELECTION_NEED_REJECTED_REASONS)[number];

export const TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_TYPES = [
  'rejection_reason',
  'duplicate_candidate',
  'parked_candidate',
  'recheck_learning',
  'merge_note',
] as const;
export type TopicSelectionCandidateMemorySuggestionType =
  (typeof TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_TYPES)[number];

export const TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_STATUSES = [
  'suggested',
] as const;
export type TopicSelectionCandidateMemorySuggestionStatus =
  (typeof TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_STATUSES)[number];

export const TOPIC_SELECTION_AGENT_EXECUTION_MODES = [
  'mocked_llm',
  'codex_assisted',
  'provider_llm',
] as const;
export type TopicSelectionAgentExecutionMode = (typeof TOPIC_SELECTION_AGENT_EXECUTION_MODES)[number];

export const TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_NODE_STATUSES = [
  'succeeded',
  'blocked',
  'require_human_review',
] as const;
export type TopicSelectionGenerateNeedCandidateNodeStatus =
  (typeof TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_NODE_STATUSES)[number];

export const TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS = [
  'finalize',
  'blocked',
  'require_human_review',
] as const;
export type TopicSelectionNeedDiscoveryTerminalResult =
  (typeof TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS)[number];

export const TOPIC_SELECTION_CANDIDATE_DRAFT_ADMISSION_DECISIONS = [
  'admit',
  'reject_artifact_only',
  'require_human_review',
  'return_for_supplemental_round',
  'merge_hint_only',
] as const;
export type TopicSelectionCandidateDraftAdmissionDecision =
  (typeof TOPIC_SELECTION_CANDIDATE_DRAFT_ADMISSION_DECISIONS)[number];

export const TOPIC_SELECTION_SUPPLEMENTAL_ROUND_ROUTING_DECISIONS = [
  'run_supplemental_round',
  'reject_without_supplement',
  'block',
  'require_human_review',
  'finalize_with_admitted_batch',
] as const;
export type TopicSelectionSupplementalRoundRoutingDecisionKind =
  (typeof TOPIC_SELECTION_SUPPLEMENTAL_ROUND_ROUTING_DECISIONS)[number];

export const TOPIC_SELECTION_NEED_DISCOVERY_DEBATE_ROLES = [
  'explorer',
  'deep_critic',
  'arbiter',
] as const;
export type TopicSelectionNeedDiscoveryDebateRole =
  (typeof TOPIC_SELECTION_NEED_DISCOVERY_DEBATE_ROLES)[number];

export const TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ERROR_CODES = [
  'MISSING_EVIDENCE_MAP',
  'MISSING_EVIDENCE_SOURCE_REFS',
  'MISSING_CONTEXT_PACKET',
  'MALFORMED_CONTEXT_PACKET',
  'STALE_CONTEXT_PACKET',
  'NO_GROUNDED_NEED_CANDIDATE',
  'PSEUDO_GAP_ONLY',
  'INVALID_RANKED_CANDIDATE_DRAFT_BATCH',
  'CANDIDATE_DRAFT_ADMISSION_FAILED',
  'UNRESOLVED_CANDIDATE_DRAFT_REFS',
  'MALFORMED_NEED_CANDIDATE_OUTPUT',
  'NO_ADMISSIBLE_NEED_CANDIDATE',
  'NO_ADMITTED_DRAFTS',
  'DRAFT_NOT_ADMITTED',
  'UNRESOLVED_PERSISTENCE_REFS',
  'DUPLICATE_NEED_CANDIDATE',
  'NEED_CANDIDATE_VERSION_FAILED',
  'TOO_MANY_NEED_CANDIDATES',
  'PERSIST_NEED_CANDIDATE_BATCH_FAILED',
] as const;
export type TopicSelectionGenerateNeedCandidateErrorCode =
  (typeof TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ERROR_CODES)[number];

export const TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ARTIFACT_KEYS = [
  'exploration_context_packet',
  'arbiter_context_packet',
  'debate_role_output',
  'debate_role_level_summary',
  'debate_issue_frame',
  'debate_final_synthesis',
  'context_compression_report',
  'ranked_candidate_draft_batch',
  'minimum_schema_validation_report',
  'candidate_draft_admission_report',
  'supplemental_round_routing_decision',
  'persist_need_candidate_batch_command',
  'discovery_audit',
] as const;
export type TopicSelectionGenerateNeedCandidateArtifactKey =
  (typeof TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ARTIFACT_KEYS)[number];

export const TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_REDACTION_POLICIES = [
  'topic_selection_generate_need_candidate_artifact_redaction_v1',
] as const;
export type TopicSelectionGenerateNeedCandidateRedactionPolicy =
  (typeof TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_REDACTION_POLICIES)[number];

export const TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_FAMILIES = [
  'exploration_context',
  'arbiter_context',
] as const;
export type TopicSelectionNeedDiscoveryContextFamily =
  (typeof TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_FAMILIES)[number];

export const TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_REDACTION_POLICIES = [
  'topic_selection_need_discovery_context_redaction_v1',
] as const;
export type TopicSelectionNeedDiscoveryContextRedactionPolicy =
  (typeof TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_REDACTION_POLICIES)[number];

export type TopicSelectionArtifactFunctionalRef = TopicSelectionFunctionalRef & {
  ref_type: 'artifact_ref';
};

export interface TopicSelectionGenerateNeedCandidateNodeInput {
  schema_version: string;
  workflow_run_id: string;
  node_attempt_id: string;
  topic_scope_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  evidence_strength_ref: TopicSelectionFunctionalRef;
  resource_sample_set_ref?: TopicSelectionFunctionalRef | null;
  candidate_pool_projection_ref?: TopicSelectionFunctionalRef | null;
  search_snapshot_refs: TopicSelectionFunctionalRef[];
  resource_snapshot_refs: TopicSelectionFunctionalRef[];
  exploration_context_ref: TopicSelectionArtifactFunctionalRef;
  arbiter_context_ref: TopicSelectionArtifactFunctionalRef;
  execution_mode: TopicSelectionAgentExecutionMode;
  profile_id: string;
  policy_version: string;
  operator_reuse_approval_ref?: TopicSelectionFunctionalRef | null;
}

export interface TopicSelectionNeedCandidateDraft {
  draft_id: string;
  rank: number;
  candidate_need: string;
  unmet_need_statement: string;
  mechanism_type: TopicSelectionNeedMechanismType;
  mechanism_summary?: string | null;
  mechanism_payload: Record<string, unknown>;
  scope_notes?: string | null;
  non_goal_notes?: string | null;
  prior_art_status: TopicSelectionNeedPriorArtStatus;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  conflict_refs: TopicSelectionFunctionalRef[];
  strength_assessment_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  speculative: boolean;
  confidence?: number | null;
}

export interface TopicSelectionRankedCandidateDraftBatchMetadata {
  batch_id: string;
  node_attempt_id: string;
  terminal_result: TopicSelectionNeedDiscoveryTerminalResult;
  ranking_rationale: string;
  max_persisted_candidates: number;
}

export interface TopicSelectionRejectedNeedCandidateFraming {
  framing_id: string;
  reason_code: string;
  summary: string;
  source_draft_id?: string | null;
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionNeedCandidateUnresolvedPoint {
  unresolved_point_id: string;
  reason_code: string;
  summary: string;
  routed_to: 'supplemental_round' | 'human_review' | 'blocked';
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionRankedCandidateDraftBatch {
  schema_version: string;
  draft_batch: TopicSelectionRankedCandidateDraftBatchMetadata;
  drafts: TopicSelectionNeedCandidateDraft[];
  rejected_framings?: TopicSelectionRejectedNeedCandidateFraming[];
  unresolved_points: TopicSelectionNeedCandidateUnresolvedPoint[];
}

export type TopicSelectionMinimumValidationIssueSeverity = 'blocking' | 'warning';

export interface TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue {
  issue_code: string;
  severity: TopicSelectionMinimumValidationIssueSeverity;
  message: string;
  draft_id?: string | null;
  field_path?: string | null;
  refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionRankedCandidateDraftBatchMinimumValidationReport {
  schema_version: string;
  batch_id: string;
  node_attempt_id: string;
  valid: boolean;
  terminal_result: TopicSelectionNeedDiscoveryTerminalResult;
  batch_payload_hash: string;
  draft_count: number;
  max_persisted_candidates: number;
  checked_at: string;
  issue_count: number;
  blocking_issue_count: number;
  warning_issue_count: number;
  blocking_reason_codes: string[];
  warning_codes: string[];
  issues: TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue[];
}

export interface TopicSelectionCandidateDraftAdmissionResult {
  draft_id: string;
  rank: number;
  decision: TopicSelectionCandidateDraftAdmissionDecision;
  reason_codes: string[];
  blocking_reason_codes: string[];
  resolved_ref_counts: {
    support: number;
    challenge: number;
    baseline: number;
    context: number;
  };
  normalized_candidate_key: string | null;
  duplicate_candidate_refs: TopicSelectionFunctionalRef[];
  required_human_review_points: TopicSelectionFunctionalRef[];
  supplemental_questions: string[];
  admitted_draft_ref?: TopicSelectionFunctionalRef | null;
  merge_target_ref?: TopicSelectionFunctionalRef | null;
}

export interface TopicSelectionCandidateDraftAdmissionReport {
  schema_version: string;
  batch_id: string;
  node_attempt_id: string;
  terminal_result: TopicSelectionNeedDiscoveryTerminalResult;
  draft_results: TopicSelectionCandidateDraftAdmissionResult[];
  valid_draft_count: number;
  rejected_draft_count: number;
  merge_hint_count: number;
  blocking_reason_codes: string[];
}

export interface TopicSelectionSupplementalRoundQuestion {
  question_id: string;
  source_draft_id: string;
  question: string;
  reason_code: string;
}

export interface TopicSelectionSupplementalRoundRoutingDecision {
  schema_version: string;
  batch_id: string;
  node_attempt_id: string;
  current_round_index: number;
  remaining_round_budget: number;
  routing_decision: TopicSelectionSupplementalRoundRoutingDecisionKind;
  source_draft_ids: string[];
  trigger_reason_codes: string[];
  supplemental_questions: TopicSelectionSupplementalRoundQuestion[];
  allowed_roles: string[];
  forbidden_actions: string[];
  stop_condition?: string | null;
}

export interface TopicSelectionPersistNeedCandidateBatchDraft {
  draft_id: string;
  rank: number;
  candidate_need: string;
  unmet_need_statement: string;
  mechanism_type: TopicSelectionNeedMechanismType;
  mechanism_summary?: string | null;
  mechanism_payload: Record<string, unknown>;
  scope_notes?: string | null;
  non_goal_notes?: string | null;
  prior_art_status: TopicSelectionNeedPriorArtStatus;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  conflict_refs: TopicSelectionFunctionalRef[];
  strength_assessment_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  speculative: boolean;
  confidence?: number | null;
  normalized_candidate_key: string;
  source_admission_decision_ref: TopicSelectionFunctionalRef;
}

export interface TopicSelectionPersistNeedCandidateBatchCommand {
  schema_version: string;
  node_attempt_id: string;
  workflow_run_id: string;
  topic_scope_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  resource_sample_set_ref?: TopicSelectionFunctionalRef | null;
  ranked_candidate_draft_batch_artifact_ref: TopicSelectionArtifactFunctionalRef;
  admission_report_artifact_ref: TopicSelectionArtifactFunctionalRef;
  supplemental_routing_artifact_refs: TopicSelectionArtifactFunctionalRef[];
  admitted_drafts: TopicSelectionPersistNeedCandidateBatchDraft[];
  rejected_framings: TopicSelectionRejectedNeedCandidateFraming[];
  idempotency_key: string;
}

export interface TopicSelectionGenerateNeedCandidateNodeResultArtifactRefs {
  ranked_candidate_draft_batch?: TopicSelectionArtifactFunctionalRef | null;
  minimum_schema_validation_report?: TopicSelectionArtifactFunctionalRef | null;
  candidate_draft_admission_report?: TopicSelectionArtifactFunctionalRef | null;
  supplemental_round_routing_decisions: TopicSelectionArtifactFunctionalRef[];
  persist_need_candidate_batch_command?: TopicSelectionArtifactFunctionalRef | null;
  discovery_audit?: TopicSelectionArtifactFunctionalRef | null;
}

export interface TopicSelectionGenerateNeedCandidateNodeResult {
  schema_version: string;
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionGenerateNeedCandidateNodeStatus;
  terminal_result: TopicSelectionNeedDiscoveryTerminalResult;
  persisted_candidate_refs: TopicSelectionFunctionalRef[];
  candidate_pool_projection_ref?: TopicSelectionFunctionalRef | null;
  candidate_pool_projection_hash?: string | null;
  artifact_refs: TopicSelectionGenerateNeedCandidateNodeResultArtifactRefs;
  warning_codes: string[];
  error_code?: TopicSelectionGenerateNeedCandidateErrorCode | null;
}

export type GenerateNeedCandidateNodeInput = TopicSelectionGenerateNeedCandidateNodeInput;
export type GenerateNeedCandidateNodeResult = TopicSelectionGenerateNeedCandidateNodeResult;
export type RankedCandidateDraftBatch = TopicSelectionRankedCandidateDraftBatch;
export type RankedCandidateDraftBatchMinimumValidationReport =
  TopicSelectionRankedCandidateDraftBatchMinimumValidationReport;
export type CandidateDraftAdmissionReport = TopicSelectionCandidateDraftAdmissionReport;
export type SupplementalRoundRoutingDecision = TopicSelectionSupplementalRoundRoutingDecision;
export type PersistNeedCandidateBatchCommand = TopicSelectionPersistNeedCandidateBatchCommand;

export interface TopicSelectionNeedDiscoveryContextCompression {
  compression_version: string;
  layer_keys: string[];
  source_token_estimate?: number | null;
  compressed_token_estimate?: number | null;
}

export interface TopicSelectionNeedDiscoveryContextEnvelope {
  schema_version: string;
  node_id: 'topic-selection.v1a.generate-need-candidate.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  context_family: TopicSelectionNeedDiscoveryContextFamily;
  input_refs: TopicSelectionFunctionalRef[];
  input_refs_hash: string;
  context_compiler_version: string;
  policy_version: string;
  output_schema_version: string;
  profile_id: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  cache_key: string;
  cache_hit: boolean;
  runtime_cache_key_hash?: string | null;
  redaction_policy: TopicSelectionNeedDiscoveryContextRedactionPolicy;
  created_at: string;
  memory_digest_hash: string;
  candidate_pool_hash: string;
  payload_hash: string;
  compression: TopicSelectionNeedDiscoveryContextCompression;
}

export interface TopicSelectionNeedDiscoveryExplorationContextPayload {
  topic_scope: Record<string, unknown>;
  evidence_signal_digest: Record<string, unknown>;
  resource_sample_digest: Record<string, unknown>;
  search_coverage_digest: Record<string, unknown>;
  sibling_candidate_digest: Record<string, unknown>;
  decision_memory_digest: Record<string, unknown>;
  exploration_prompts: string[];
  challenge_prompts: string[];
  allowed_outputs: string[];
  forbidden_outputs: string[];
}

export interface TopicSelectionNeedDiscoveryArbiterContextPayload {
  node_policy_ref: TopicSelectionFunctionalRef;
  output_schema_ref: TopicSelectionFunctionalRef;
  authority_boundary: Record<string, unknown>;
  max_persisted_candidates: number;
  deterministic_gate_checklist: string[];
  role_level_summaries: Record<string, unknown>[];
  candidate_pool_digest: Record<string, unknown>;
  evidence_ref_table: Record<string, unknown>[];
  rejected_framing_table: Record<string, unknown>[];
  unresolved_points: Record<string, unknown>[];
  batch_ranking_rules: string[];
  persistence_rules: string[];
  failure_rules: string[];
}

export interface TopicSelectionNeedDiscoveryCandidateAngle {
  angle_id: string;
  summary: string;
  candidate_need_hint?: string | null;
  evidence_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionNeedDiscoveryExplorerNotes {
  schema_version: string;
  debate_loop_id: string;
  round_index: number;
  role: 'explorer';
  stage: string;
  agent_instance_id: string;
  candidate_angles: TopicSelectionNeedDiscoveryCandidateAngle[];
  evidence_refs: TopicSelectionFunctionalRef[];
  unresolved_questions: string[];
  warnings: string[];
}

export interface TopicSelectionNeedDiscoveryCritiquePoint {
  critique_id: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  evidence_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionNeedDiscoveryDeepCriticNotes {
  schema_version: string;
  debate_loop_id: string;
  round_index: number;
  role: 'deep_critic';
  stage: string;
  agent_instance_id: string;
  critique_points: TopicSelectionNeedDiscoveryCritiquePoint[];
  failure_modes: string[];
  missing_evidence_questions: string[];
  evidence_refs: TopicSelectionFunctionalRef[];
  warnings: string[];
}

export interface TopicSelectionNeedDiscoveryRoleLevelSummary {
  schema_version: string;
  debate_loop_id: string;
  round_index: number;
  role: 'explorer' | 'deep_critic';
  source_invocation_attempt_ids: string[];
  source_artifact_refs: TopicSelectionArtifactFunctionalRef[];
  summary: string;
  candidate_need_signals: string[];
  risk_signals: string[];
  evidence_refs: TopicSelectionFunctionalRef[];
  unresolved_questions: string[];
}

export interface TopicSelectionNeedDiscoveryDebateIssueFrame {
  schema_version: string;
  debate_loop_id: string;
  round_index: number;
  role: 'arbiter';
  stage: 'issue_framing';
  frame_id: string;
  focused_questions: string[];
  requested_roles: Array<'explorer' | 'deep_critic'>;
  source_role_summary_refs: TopicSelectionArtifactFunctionalRef[];
  stop_condition?: string | null;
}

export interface TopicSelectionNeedDiscoveryDebateFinalSynthesisArtifact {
  schema_version: string;
  debate_loop_id: string;
  round_index: number;
  role: 'arbiter';
  stage: 'final_synthesis';
  final_invocation_attempt_id: string;
  final_invocation_audit_ref?: TopicSelectionArtifactFunctionalRef | null;
  issue_frame_ref: TopicSelectionArtifactFunctionalRef;
  role_level_summary_refs: TopicSelectionArtifactFunctionalRef[];
  ranked_candidate_draft_batch_hash: string;
  terminal_result: TopicSelectionNeedDiscoveryTerminalResult;
  draft_count: number;
  rejected_framing_count: number;
  unresolved_point_count: number;
}

export type TopicSelectionNeedDiscoveryContextPacket =
  | (TopicSelectionNeedDiscoveryContextEnvelope & {
      context_family: 'exploration_context';
      payload: TopicSelectionNeedDiscoveryExplorationContextPayload;
    })
  | (TopicSelectionNeedDiscoveryContextEnvelope & {
      context_family: 'arbiter_context';
      payload: TopicSelectionNeedDiscoveryArbiterContextPayload;
    });

export interface TopicSelectionNeedDiscoveryCompiledContextPair {
  schema_version: string;
  node_id: 'topic-selection.v1a.generate-need-candidate.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  exploration_context_ref: TopicSelectionArtifactFunctionalRef;
  arbiter_context_ref: TopicSelectionArtifactFunctionalRef;
  exploration_context_hash: string;
  arbiter_context_hash: string;
  exploration_cache_key: string;
  arbiter_cache_key: string;
  exploration_runtime_cache_key_hash?: string | null;
  arbiter_runtime_cache_key_hash?: string | null;
  artifact_refs: TopicSelectionGenerateNeedCandidateArtifactRefEntry[];
}

export interface TopicSelectionGenerateNeedCandidateArtifactSnapshot {
  schema_version: string;
  node_id: 'topic-selection.v1a.generate-need-candidate.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  artifact_key: TopicSelectionGenerateNeedCandidateArtifactKey;
  payload_schema: string;
  redaction_policy: TopicSelectionGenerateNeedCandidateRedactionPolicy;
  redacted: boolean;
  redacted_paths: string[];
  source_refs: TopicSelectionFunctionalRef[];
  payload_hash: string;
  payload: Record<string, unknown>;
}

export interface TopicSelectionGenerateNeedCandidateArtifactRefEntry {
  artifact_key: TopicSelectionGenerateNeedCandidateArtifactKey;
  artifact_ref: TopicSelectionArtifactFunctionalRef;
  artifact_hash: string;
  payload_hash: string;
  payload_schema: string;
  redacted_paths: string[];
}

export interface TopicSelectionGenerateNeedCandidateArtifactRefBundle {
  schema_version: string;
  node_id: 'topic-selection.v1a.generate-need-candidate.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  artifact_refs: TopicSelectionGenerateNeedCandidateArtifactRefEntry[];
}

export interface TopicSelectionNeedCandidateRecord {
  need_candidate_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  evidence_map_id: string;
  candidate_version: string;
  lifecycle_status: TopicSelectionNeedCandidateLifecycleStatus;
  decision_status: TopicSelectionNeedCandidateDecisionStatus;
  review_status: TopicSelectionNeedCandidateReviewStatus;
  freshness_status: TopicSelectionNeedCandidateFreshnessStatus;
  candidate_need: string;
  unmet_need_statement: string;
  mechanism_type: TopicSelectionNeedMechanismType;
  mechanism_summary?: string | null;
  mechanism_payload: Record<string, unknown>;
  scope_notes?: string | null;
  non_goal_notes?: string | null;
  prior_art_status: TopicSelectionNeedPriorArtStatus;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  conflict_refs: TopicSelectionFunctionalRef[];
  strength_assessment_refs: TopicSelectionFunctionalRef[];
  open_recheck_request_refs: TopicSelectionFunctionalRef[];
  unresolved_challenge_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  speculative: boolean;
  confidence?: number | null;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  result_adjudication_id?: string | null;
  result_validated_need_id?: string | null;
  merged_into_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface TopicSelectionNeedCandidateReadinessAssessmentRecord {
  readiness_assessment_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  need_candidate_id: string;
  evidence_map_id: string;
  recommendation: TopicSelectionNeedReadinessRecommendation;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  required_actions: string[];
  strength_assessment_ref?: TopicSelectionFunctionalRef | null;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  support_unit_refs: TopicSelectionFunctionalRef[];
  challenge_unit_refs: TopicSelectionFunctionalRef[];
  baseline_unit_refs: TopicSelectionFunctionalRef[];
  context_unit_refs: TopicSelectionFunctionalRef[];
  conflict_refs: TopicSelectionFunctionalRef[];
  open_recheck_request_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  support_count: number;
  challenge_count: number;
  abstract_only_support_count: number;
  strong_unresolved_challenge_count: number;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  policy_version_id?: string | null;
  assessed_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionValidationDecisionSupportPacketRecord {
  validation_support_packet_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  need_candidate_id: string;
  evidence_map_id: string;
  readiness_assessment_id?: string | null;
  packet_status: 'draft' | 'ready' | 'superseded';
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  need_candidate_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref?: TopicSelectionFunctionalRef | null;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  conflict_refs: TopicSelectionFunctionalRef[];
  strength_assessment_refs: TopicSelectionFunctionalRef[];
  coverage_refs: TopicSelectionFunctionalRef[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  open_gap_codes: string[];
  required_human_checks: string[];
  prior_art_status: TopicSelectionNeedPriorArtStatus;
  already_solved_review: Record<string, unknown>;
  packet_payload: Record<string, unknown>;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionValidateNeedAdjudicationResultRecord {
  adjudication_result_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  need_candidate_id: string;
  support_packet_id: string;
  final_decision: TopicSelectionNeedAdjudicationDecision;
  output_validated_need_id?: string | null;
  human_decision_id?: string | null;
  loopback_target: TopicSelectionNeedLoopbackTarget;
  rejected_reason?: TopicSelectionNeedRejectedReason | null;
  merge_target_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  output_searchplan_recheck_request_ref?: TopicSelectionFunctionalRef | null;
  output_memory_suggestion_ref?: TopicSelectionFunctionalRef | null;
  rationale: string;
  required_actions: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  decision_payload: Record<string, unknown>;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  trace_snapshot_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  adjudicated_by: TopicSelectionActorRef;
  created_at: string;
}

export interface TopicSelectionValidatedNeedRecord {
  validated_need_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  source_need_candidate_id: string;
  adjudication_result_id: string;
  support_packet_id: string;
  human_decision_id: string;
  validated_need_statement: string;
  mechanism_type: TopicSelectionNeedMechanismType;
  mechanism_summary?: string | null;
  mechanism_payload: Record<string, unknown>;
  scope_notes?: string | null;
  non_goal_notes?: string | null;
  prior_art_status: TopicSelectionNeedPriorArtStatus;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  support_packet_ref: TopicSelectionFunctionalRef;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  human_decision_ref: TopicSelectionFunctionalRef;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  strength_assessment_refs: TopicSelectionFunctionalRef[];
  conflict_refs: TopicSelectionFunctionalRef[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  trace_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionCandidateDecisionMemorySuggestionRecord {
  memory_suggestion_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  source_need_candidate_id: string;
  adjudication_result_id?: string | null;
  suggestion_type: TopicSelectionCandidateMemorySuggestionType;
  status: TopicSelectionCandidateMemorySuggestionStatus;
  target_ref: TopicSelectionFunctionalRef;
  suggestion_payload: Record<string, unknown>;
  rationale: string;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionV1aToV1bInputBundleRecord {
  v1b_input_bundle_id: string;
  workspace_id?: string | null;
  title_card_id: string;
  validated_need_id: string;
  source_need_candidate_id: string;
  adjudication_result_id: string;
  support_packet_id: string;
  bundle_version: string;
  validated_need_ref: TopicSelectionFunctionalRef;
  source_need_candidate_ref: TopicSelectionFunctionalRef;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  support_packet_ref: TopicSelectionFunctionalRef;
  human_decision_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  trace_refs: TopicSelectionFunctionalRef[];
  risk_refs: TopicSelectionFunctionalRef[];
  gap_codes: string[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  handoff_payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionNeedAdjudicationRecommendationPacket {
  schema_version: typeof TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  recommendation_packet_id: string;
  need_candidate_ref: TopicSelectionFunctionalRef;
  validation_support_packet_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref?: TopicSelectionFunctionalRef | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  profile_id: string;
  final_decision: TopicSelectionNeedAdjudicationDecision;
  rationale: string;
  required_actions: string[];
  gap_codes: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  rejected_reason?: TopicSelectionNeedRejectedReason | null;
  merge_target_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  searchplan_recheck_reason?: string | null;
  searchplan_recheck_gap_codes: string[];
  source_refs: TopicSelectionFunctionalRef[];
  recommendation_payload: Record<string, unknown>;
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionValidateNeedAdjudicationReplayProvenance {
  replayed: boolean;
  source_workflow_run_id?: string | null;
  source_node_attempt_id?: string | null;
  source_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  input_hash?: string | null;
}

export interface TopicSelectionValidateNeedAdjudicationNodeResult {
  schema_version: typeof TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION;
  node_id: 'topic-selection.v1a.validate-need-adjudication.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionValidateNeedAdjudicationNodeStatus;
  route_outcome: TopicSelectionValidateNeedAdjudicationRouteOutcome;
  need_candidate_ref: TopicSelectionFunctionalRef | null;
  readiness_assessment_ref: TopicSelectionFunctionalRef | null;
  validation_support_packet_ref: TopicSelectionFunctionalRef | null;
  adjudication_result_ref: TopicSelectionFunctionalRef | null;
  reserved_validated_need_ref?: TopicSelectionFunctionalRef | null;
  next_node_id?: string | null;
  repair_target?: string | null;
  final_decision?: TopicSelectionNeedAdjudicationDecision | null;
  required_actions: string[];
  blocker_codes: string[];
  warning_codes: string[];
  review_reason_codes: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  merge_target_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  recheck_request_ref?: TopicSelectionFunctionalRef | null;
  memory_suggestion_ref?: TopicSelectionFunctionalRef | null;
  recommendation_packet_ref?: TopicSelectionFunctionalRef | null;
  harness_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  replay_provenance?: TopicSelectionValidateNeedAdjudicationReplayProvenance | null;
  duplicate_adjudication_ref?: TopicSelectionFunctionalRef | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface HumanConfirmationDelegatedExecutor {
  executor_type: TopicSelectionHumanConfirmationDelegatedExecutorType;
  provenance_ref: TopicSelectionFunctionalRef;
  policy_id: 'n8-validate-only-delegation-v1';
}

export interface HumanConfirmationRequiredCheckResult {
  check_id: string;
  result: TopicSelectionHumanConfirmationRequiredCheckResult;
}

export const TOPIC_SELECTION_GAP_DISTINCTNESS_AXES = [
  'research_object',
  'mechanism',
  'intervention',
  'comparison',
  'outcome',
] as const;
export type TopicSelectionGapDistinctnessAxis =
  (typeof TOPIC_SELECTION_GAP_DISTINCTNESS_AXES)[number];

export const TOPIC_SELECTION_GAP_CANDIDATE_DISPOSITIONS = [
  'selected',
  'viable_alternative',
  'rejected',
] as const;
export type TopicSelectionGapCandidateDisposition =
  (typeof TOPIC_SELECTION_GAP_CANDIDATE_DISPOSITIONS)[number];

export interface TopicSelectionGapCandidateReview {
  need_candidate_ref: TopicSelectionFunctionalRef;
  disposition: TopicSelectionGapCandidateDisposition;
  distinct_from_selected_axes: TopicSelectionGapDistinctnessAxis[];
  rationale: string;
  rejection_reason?: string | null;
}

export interface TopicSelectionGapSelectionReview {
  research_checkpoint_id: string;
  confirmed_candidate_pool_hash: string;
  selected_candidate_ref: TopicSelectionFunctionalRef;
  direct_prior_art_pressure_reviewed: boolean;
  disconfirming_evidence_reviewed: boolean;
  candidate_reviews: TopicSelectionGapCandidateReview[];
}

export interface HumanConfirmationInput {
  schema_version: typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION;
  actor_mode: TopicSelectionHumanConfirmationActorMode;
  accountable_human_ref: TopicSelectionActorRef;
  rationale: string;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  required_check_results: HumanConfirmationRequiredCheckResult[];
  delegated_executor?: HumanConfirmationDelegatedExecutor | null;
  gap_selection_review?: TopicSelectionGapSelectionReview | null;
}

export interface HumanConfirmationSemanticReviewContextPacket {
  schema_version: typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  context_packet_id: string;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  validation_support_packet_ref: TopicSelectionFunctionalRef;
  need_candidate_ref: TopicSelectionFunctionalRef;
  output_validated_need_ref: TopicSelectionFunctionalRef;
  final_decision: 'validate';
  adjudication_rationale: string;
  need_candidate_summary: string;
  required_human_checks: string[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  confirmation_input: HumanConfirmationInput;
  policy_version: string;
  output_schema_version: string;
  context_packet_hash: string;
  created_at: string;
}

export interface HumanConfirmationSemanticReview {
  schema_version: typeof TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  review_id: string;
  context_packet_ref: TopicSelectionFunctionalRef;
  execution_mode: TopicSelectionAgentExecutionMode | 'deterministic_parser';
  profile_id: string;
  status: TopicSelectionHumanConfirmationSemanticReviewStatus;
  alignment_codes: string[];
  risk_coverage: TopicSelectionHumanConfirmationRiskCoverageStatus;
  required_check_coverage: TopicSelectionHumanConfirmationRequiredCheckCoverageStatus;
  scope_violations: string[];
  rationale_summary: string;
  provenance_ref: TopicSelectionFunctionalRef;
  warning_codes: string[];
  blocker_codes: string[];
  review_reason_codes: string[];
  policy_version: string;
  output_schema_version: string;
}

export interface TopicSelectionHumanConfirmNeedReplayProvenance {
  replayed: boolean;
  source_workflow_run_id?: string | null;
  source_node_attempt_id?: string | null;
  source_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  input_hash?: string | null;
}

export interface TopicSelectionHumanConfirmNeedNodeResult {
  schema_version: typeof TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION;
  node_id: 'topic-selection.v1a.human-confirm-need.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionHumanConfirmNeedNodeStatus;
  route_outcome: TopicSelectionHumanConfirmNeedRouteOutcome;
  adjudication_result_ref: TopicSelectionFunctionalRef | null;
  need_candidate_ref: TopicSelectionFunctionalRef | null;
  validation_support_packet_ref: TopicSelectionFunctionalRef | null;
  human_decision_ref: TopicSelectionFunctionalRef | null;
  validated_need_ref: TopicSelectionFunctionalRef | null;
  semantic_review_context_packet_ref: TopicSelectionFunctionalRef | null;
  semantic_review_ref: TopicSelectionFunctionalRef | null;
  confirmation_input_hash: string | null;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  residual_risk_refs: TopicSelectionFunctionalRef[];
  required_check_results_snapshot: HumanConfirmationRequiredCheckResult[];
  blocker_codes: string[];
  warning_codes: string[];
  review_reason_codes: string[];
  next_node_id?: string | null;
  harness_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  replay_provenance?: TopicSelectionHumanConfirmNeedReplayProvenance | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface PublishV1bInputBundleNodeInput {
  schema_version: typeof TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION;
  workflow_run_id: string;
  node_attempt_id: string;
  title_card_ref: TopicSelectionFunctionalRef;
  validated_need_ref: TopicSelectionFunctionalRef;
  source_need_candidate_ref: TopicSelectionFunctionalRef;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  support_packet_ref: TopicSelectionFunctionalRef;
  human_decision_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  evidence_role_bundle: TopicSelectionEvidenceRoleBundle;
  risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  expected_bundle_version: string;
  policy_version: string;
  output_schema_version: string;
  created_by?: TopicSelectionActorType;
}

export interface TopicSelectionPublishV1bInputBundleReplayProvenance {
  replayed: boolean;
  source_workflow_run_id?: string | null;
  source_node_attempt_id?: string | null;
  source_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  input_hash?: string | null;
}

export interface TopicSelectionPublishV1bInputBundleNodeResult {
  schema_version: typeof TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION;
  node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionPublishV1bInputBundleNodeStatus;
  route_outcome: TopicSelectionPublishV1bInputBundleRouteOutcome;
  validated_need_ref: TopicSelectionFunctionalRef | null;
  v1b_input_bundle_ref: TopicSelectionFunctionalRef | null;
  bundle_version: string | null;
  bundle_payload_hash: string | null;
  idempotency_result: TopicSelectionPublishV1bInputBundleIdempotencyResult;
  carried_authority_refs: TopicSelectionFunctionalRef[];
  risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  harness_trace_artifact_ref?: TopicSelectionFunctionalRef | null;
  replay_provenance?: TopicSelectionPublishV1bInputBundleReplayProvenance | null;
  error_code?: string | null;
  error_message?: string | null;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const numberValue = { type: 'number' } as const;
const nullableNumber = { anyOf: [numberValue, { type: 'null' }] } as const;
const booleanValue = { type: 'boolean' } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const objectArray = { type: 'array', items: objectPayload } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const artifactFunctionalRefSchema = {
  ...topicSelectionFunctionalRefSchema,
  properties: {
    ...topicSelectionFunctionalRefSchema.properties,
    ref_type: { enum: ['artifact_ref'] },
  },
} as const;
const artifactRefArray = { type: 'array', items: artifactFunctionalRefSchema } as const;
const nullableArtifactRef = { anyOf: [artifactFunctionalRefSchema, { type: 'null' }] } as const;
const nullableString = { anyOf: [stringId, { type: 'null' }] } as const;

export const topicSelectionNeedAdjudicationRecommendationPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'recommendation_packet_id',
    'need_candidate_ref',
    'validation_support_packet_ref',
    'execution_mode',
    'profile_id',
    'final_decision',
    'rationale',
    'required_actions',
    'gap_codes',
    'accepted_risk_refs',
    'residual_risk_refs',
    'searchplan_recheck_gap_codes',
    'source_refs',
    'recommendation_payload',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    recommendation_packet_id: stringId,
    need_candidate_ref: topicSelectionFunctionalRefSchema,
    validation_support_packet_ref: topicSelectionFunctionalRefSchema,
    readiness_assessment_ref: nullableFunctionalRef,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    profile_id: stringId,
    final_decision: { enum: [...TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS] },
    rationale: stringId,
    required_actions: stringArray,
    gap_codes: stringArray,
    accepted_risk_refs: functionalRefArray,
    residual_risk_refs: functionalRefArray,
    rejected_reason: { anyOf: [{ enum: [...TOPIC_SELECTION_NEED_REJECTED_REASONS] }, { type: 'null' }] },
    merge_target_need_candidate_ref: nullableFunctionalRef,
    searchplan_recheck_reason: nullableString,
    searchplan_recheck_gap_codes: stringArray,
    source_refs: functionalRefArray,
    recommendation_payload: objectPayload,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionValidateNeedAdjudicationReplayProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['replayed'],
  properties: {
    replayed: booleanValue,
    source_workflow_run_id: nullableStringId,
    source_node_attempt_id: nullableStringId,
    source_trace_artifact_ref: nullableFunctionalRef,
    input_hash: nullableStringId,
  },
} as const;

export const topicSelectionValidateNeedAdjudicationNodeResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'status',
    'route_outcome',
    'need_candidate_ref',
    'readiness_assessment_ref',
    'validation_support_packet_ref',
    'adjudication_result_ref',
    'required_actions',
    'blocker_codes',
    'warning_codes',
    'review_reason_codes',
    'accepted_risk_refs',
    'residual_risk_refs',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION },
    node_id: { const: 'topic-selection.v1a.validate-need-adjudication.v1' },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    status: { enum: [...TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_STATUSES] },
    route_outcome: { enum: [...TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_ROUTE_OUTCOMES] },
    need_candidate_ref: nullableFunctionalRef,
    readiness_assessment_ref: nullableFunctionalRef,
    validation_support_packet_ref: nullableFunctionalRef,
    adjudication_result_ref: nullableFunctionalRef,
    reserved_validated_need_ref: nullableFunctionalRef,
    next_node_id: nullableStringId,
    repair_target: nullableStringId,
    final_decision: { anyOf: [{ enum: [...TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS] }, { type: 'null' }] },
    required_actions: stringArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    review_reason_codes: stringArray,
    accepted_risk_refs: functionalRefArray,
    residual_risk_refs: functionalRefArray,
    merge_target_need_candidate_ref: nullableFunctionalRef,
    recheck_request_ref: nullableFunctionalRef,
    memory_suggestion_ref: nullableFunctionalRef,
    recommendation_packet_ref: nullableFunctionalRef,
    harness_trace_artifact_ref: nullableFunctionalRef,
    replay_provenance: {
      anyOf: [topicSelectionValidateNeedAdjudicationReplayProvenanceSchema, { type: 'null' }],
    },
    duplicate_adjudication_ref: nullableFunctionalRef,
    error_code: nullableStringId,
    error_message: nullableStringId,
  },
} as const;

export const humanConfirmationDelegatedExecutorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['executor_type', 'provenance_ref', 'policy_id'],
  properties: {
    executor_type: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRMATION_DELEGATED_EXECUTOR_TYPES] },
    provenance_ref: topicSelectionFunctionalRefSchema,
    policy_id: { const: 'n8-validate-only-delegation-v1' },
  },
} as const;

export const humanConfirmationRequiredCheckResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['check_id', 'result'],
  properties: {
    check_id: stringId,
    result: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRMATION_REQUIRED_CHECK_RESULTS] },
  },
} as const;

const humanConfirmationRequiredCheckResultArray = {
  type: 'array',
  items: humanConfirmationRequiredCheckResultSchema,
} as const;

export const topicSelectionGapCandidateReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'need_candidate_ref',
    'disposition',
    'distinct_from_selected_axes',
    'rationale',
  ],
  properties: {
    need_candidate_ref: topicSelectionFunctionalRefSchema,
    disposition: { enum: [...TOPIC_SELECTION_GAP_CANDIDATE_DISPOSITIONS] },
    distinct_from_selected_axes: {
      type: 'array',
      items: { enum: [...TOPIC_SELECTION_GAP_DISTINCTNESS_AXES] },
      uniqueItems: true,
    },
    rationale: stringId,
    rejection_reason: nullableStringId,
  },
} as const;

export const topicSelectionGapSelectionReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'research_checkpoint_id',
    'confirmed_candidate_pool_hash',
    'selected_candidate_ref',
    'direct_prior_art_pressure_reviewed',
    'disconfirming_evidence_reviewed',
    'candidate_reviews',
  ],
  properties: {
    research_checkpoint_id: stringId,
    confirmed_candidate_pool_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    selected_candidate_ref: topicSelectionFunctionalRefSchema,
    direct_prior_art_pressure_reviewed: booleanValue,
    disconfirming_evidence_reviewed: booleanValue,
    candidate_reviews: {
      type: 'array',
      items: topicSelectionGapCandidateReviewSchema,
      minItems: 2,
    },
  },
} as const;

export const humanConfirmationInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'actor_mode',
    'accountable_human_ref',
    'rationale',
    'accepted_risk_refs',
    'required_check_results',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION },
    actor_mode: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRMATION_ACTOR_MODES] },
    accountable_human_ref: topicSelectionActorRefSchema,
    rationale: stringId,
    accepted_risk_refs: functionalRefArray,
    required_check_results: humanConfirmationRequiredCheckResultArray,
    delegated_executor: {
      anyOf: [humanConfirmationDelegatedExecutorSchema, { type: 'null' }],
    },
    gap_selection_review: {
      anyOf: [topicSelectionGapSelectionReviewSchema, { type: 'null' }],
    },
  },
  allOf: [
    {
      if: {
        properties: {
          actor_mode: { const: 'human_delegated' },
        },
      },
      then: {
        required: ['delegated_executor'],
        properties: {
          delegated_executor: humanConfirmationDelegatedExecutorSchema,
        },
      },
      else: {
        properties: {
          delegated_executor: { type: 'null' },
        },
      },
    },
  ],
} as const;

export const humanConfirmationSemanticReviewContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'context_packet_id',
    'adjudication_result_ref',
    'validation_support_packet_ref',
    'need_candidate_ref',
    'output_validated_need_ref',
    'final_decision',
    'adjudication_rationale',
    'need_candidate_summary',
    'required_human_checks',
    'residual_risk_refs',
    'accepted_risk_refs',
    'confirmation_input',
    'policy_version',
    'output_schema_version',
    'context_packet_hash',
    'created_at',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    context_packet_id: stringId,
    adjudication_result_ref: topicSelectionFunctionalRefSchema,
    validation_support_packet_ref: topicSelectionFunctionalRefSchema,
    need_candidate_ref: topicSelectionFunctionalRefSchema,
    output_validated_need_ref: topicSelectionFunctionalRefSchema,
    final_decision: { const: 'validate' },
    adjudication_rationale: stringId,
    need_candidate_summary: stringId,
    required_human_checks: stringArray,
    residual_risk_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    confirmation_input: humanConfirmationInputSchema,
    policy_version: stringId,
    output_schema_version: stringId,
    context_packet_hash: stringId,
    created_at: stringId,
  },
} as const;

export const humanConfirmationSemanticReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'review_id',
    'context_packet_ref',
    'execution_mode',
    'profile_id',
    'status',
    'alignment_codes',
    'risk_coverage',
    'required_check_coverage',
    'scope_violations',
    'rationale_summary',
    'provenance_ref',
    'warning_codes',
    'blocker_codes',
    'review_reason_codes',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    review_id: stringId,
    context_packet_ref: topicSelectionFunctionalRefSchema,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES, 'deterministic_parser'] },
    profile_id: stringId,
    status: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_STATUSES] },
    alignment_codes: stringArray,
    risk_coverage: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRMATION_RISK_COVERAGE_STATUSES] },
    required_check_coverage: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRMATION_REQUIRED_CHECK_COVERAGE_STATUSES] },
    scope_violations: stringArray,
    rationale_summary: stringId,
    provenance_ref: topicSelectionFunctionalRefSchema,
    warning_codes: stringArray,
    blocker_codes: stringArray,
    review_reason_codes: stringArray,
    policy_version: stringId,
    output_schema_version: stringId,
  },
} as const;

export const topicSelectionHumanConfirmNeedReplayProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['replayed'],
  properties: {
    replayed: booleanValue,
    source_workflow_run_id: nullableStringId,
    source_node_attempt_id: nullableStringId,
    source_trace_artifact_ref: nullableFunctionalRef,
    input_hash: nullableStringId,
  },
} as const;

export const topicSelectionHumanConfirmNeedNodeResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'status',
    'route_outcome',
    'adjudication_result_ref',
    'need_candidate_ref',
    'validation_support_packet_ref',
    'human_decision_ref',
    'validated_need_ref',
    'semantic_review_context_packet_ref',
    'semantic_review_ref',
    'confirmation_input_hash',
    'accepted_risk_refs',
    'residual_risk_refs',
    'required_check_results_snapshot',
    'blocker_codes',
    'warning_codes',
    'review_reason_codes',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION },
    node_id: { const: 'topic-selection.v1a.human-confirm-need.v1' },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    status: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_STATUSES] },
    route_outcome: { enum: [...TOPIC_SELECTION_HUMAN_CONFIRM_NEED_ROUTE_OUTCOMES] },
    adjudication_result_ref: nullableFunctionalRef,
    need_candidate_ref: nullableFunctionalRef,
    validation_support_packet_ref: nullableFunctionalRef,
    human_decision_ref: nullableFunctionalRef,
    validated_need_ref: nullableFunctionalRef,
    semantic_review_context_packet_ref: nullableFunctionalRef,
    semantic_review_ref: nullableFunctionalRef,
    confirmation_input_hash: nullableStringId,
    accepted_risk_refs: functionalRefArray,
    residual_risk_refs: functionalRefArray,
    required_check_results_snapshot: humanConfirmationRequiredCheckResultArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    review_reason_codes: stringArray,
    next_node_id: nullableStringId,
    harness_trace_artifact_ref: nullableFunctionalRef,
    replay_provenance: {
      anyOf: [topicSelectionHumanConfirmNeedReplayProvenanceSchema, { type: 'null' }],
    },
    error_code: nullableStringId,
    error_message: nullableStringId,
  },
} as const;

export const publishV1bInputBundleNodeInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'title_card_ref',
    'validated_need_ref',
    'source_need_candidate_ref',
    'adjudication_result_ref',
    'support_packet_ref',
    'human_decision_ref',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'evidence_role_bundle',
    'risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'expected_bundle_version',
    'policy_version',
    'output_schema_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    title_card_ref: topicSelectionFunctionalRefSchema,
    validated_need_ref: topicSelectionFunctionalRefSchema,
    source_need_candidate_ref: topicSelectionFunctionalRefSchema,
    adjudication_result_ref: topicSelectionFunctionalRefSchema,
    support_packet_ref: topicSelectionFunctionalRefSchema,
    human_decision_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    evidence_role_bundle: topicSelectionEvidenceRoleBundleSchema,
    risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    expected_bundle_version: stringId,
    policy_version: stringId,
    output_schema_version: stringId,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
  },
} as const;

export const topicSelectionPublishV1bInputBundleReplayProvenanceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['replayed'],
  properties: {
    replayed: booleanValue,
    source_workflow_run_id: nullableStringId,
    source_node_attempt_id: nullableStringId,
    source_trace_artifact_ref: nullableFunctionalRef,
    input_hash: nullableStringId,
  },
} as const;

export const topicSelectionPublishV1bInputBundleNodeResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'status',
    'route_outcome',
    'validated_need_ref',
    'v1b_input_bundle_ref',
    'bundle_version',
    'bundle_payload_hash',
    'idempotency_result',
    'carried_authority_refs',
    'risk_refs',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION },
    node_id: { const: 'topic-selection.v1a.publish-v1b-input-bundle.v1' },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    status: { enum: [...TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_STATUSES] },
    route_outcome: { enum: [...TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_ROUTE_OUTCOMES] },
    validated_need_ref: nullableFunctionalRef,
    v1b_input_bundle_ref: nullableFunctionalRef,
    bundle_version: nullableStringId,
    bundle_payload_hash: nullableStringId,
    idempotency_result: { enum: [...TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_IDEMPOTENCY_RESULTS] },
    carried_authority_refs: functionalRefArray,
    risk_refs: functionalRefArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    harness_trace_artifact_ref: nullableFunctionalRef,
    replay_provenance: {
      anyOf: [topicSelectionPublishV1bInputBundleReplayProvenanceSchema, { type: 'null' }],
    },
    error_code: nullableStringId,
    error_message: nullableStringId,
  },
} as const;

const topicSelectionNeedCandidateDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'draft_id',
    'rank',
    'candidate_need',
    'unmet_need_statement',
    'mechanism_type',
    'mechanism_payload',
    'prior_art_status',
    'evidence_role_bundle',
    'conflict_refs',
    'strength_assessment_refs',
    'accepted_risk_refs',
    'gap_codes',
    'speculative',
  ],
  properties: {
    draft_id: stringId,
    rank: numberValue,
    candidate_need: stringId,
    unmet_need_statement: stringId,
    mechanism_type: { enum: [...TOPIC_SELECTION_NEED_MECHANISM_TYPES] },
    mechanism_summary: nullableString,
    mechanism_payload: objectPayload,
    scope_notes: nullableString,
    non_goal_notes: nullableString,
    prior_art_status: { enum: [...TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES] },
    evidence_role_bundle: topicSelectionEvidenceRoleBundleSchema,
    conflict_refs: functionalRefArray,
    strength_assessment_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    gap_codes: stringArray,
    speculative: booleanValue,
    confidence: nullableNumber,
  },
} as const;

export const topicSelectionGenerateNeedCandidateNodeInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'topic_scope_ref',
    'evidence_map_ref',
    'evidence_strength_ref',
    'search_snapshot_refs',
    'resource_snapshot_refs',
    'exploration_context_ref',
    'arbiter_context_ref',
    'execution_mode',
    'profile_id',
    'policy_version',
  ],
  properties: {
    schema_version: stringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    topic_scope_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    evidence_strength_ref: topicSelectionFunctionalRefSchema,
    resource_sample_set_ref: nullableFunctionalRef,
    candidate_pool_projection_ref: nullableFunctionalRef,
    search_snapshot_refs: functionalRefArray,
    resource_snapshot_refs: functionalRefArray,
    exploration_context_ref: artifactFunctionalRefSchema,
    arbiter_context_ref: artifactFunctionalRefSchema,
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    profile_id: stringId,
    policy_version: stringId,
    operator_reuse_approval_ref: nullableFunctionalRef,
  },
} as const;

const topicSelectionRejectedNeedCandidateFramingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['framing_id', 'reason_code', 'summary', 'refs'],
  properties: {
    framing_id: stringId,
    reason_code: stringId,
    summary: stringId,
    source_draft_id: nullableStringId,
    refs: functionalRefArray,
  },
} as const;

export const topicSelectionRankedCandidateDraftBatchSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'draft_batch', 'drafts', 'rejected_framings', 'unresolved_points'],
  properties: {
    schema_version: stringId,
    draft_batch: {
      type: 'object',
      additionalProperties: false,
      required: ['batch_id', 'node_attempt_id', 'terminal_result', 'ranking_rationale', 'max_persisted_candidates'],
      properties: {
        batch_id: stringId,
        node_attempt_id: stringId,
        terminal_result: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS] },
        ranking_rationale: stringId,
        max_persisted_candidates: numberValue,
      },
    },
    drafts: { type: 'array', items: topicSelectionNeedCandidateDraftSchema },
    rejected_framings: {
      type: 'array',
      items: topicSelectionRejectedNeedCandidateFramingSchema,
    },
    unresolved_points: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['unresolved_point_id', 'reason_code', 'summary', 'routed_to', 'refs'],
        properties: {
          unresolved_point_id: stringId,
          reason_code: stringId,
          summary: stringId,
          routed_to: { enum: ['supplemental_round', 'human_review', 'blocked'] },
          refs: functionalRefArray,
        },
      },
    },
  },
} as const;

const topicSelectionRankedCandidateDraftBatchMinimumValidationIssueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['issue_code', 'severity', 'message', 'refs'],
  properties: {
    issue_code: stringId,
    severity: { enum: ['blocking', 'warning'] },
    message: stringId,
    draft_id: nullableStringId,
    field_path: nullableStringId,
    refs: functionalRefArray,
  },
} as const;

export const topicSelectionRankedCandidateDraftBatchMinimumValidationReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'batch_id',
    'node_attempt_id',
    'valid',
    'terminal_result',
    'batch_payload_hash',
    'draft_count',
    'max_persisted_candidates',
    'checked_at',
    'issue_count',
    'blocking_issue_count',
    'warning_issue_count',
    'blocking_reason_codes',
    'warning_codes',
    'issues',
  ],
  properties: {
    schema_version: stringId,
    batch_id: stringId,
    node_attempt_id: stringId,
    valid: booleanValue,
    terminal_result: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS] },
    batch_payload_hash: stringId,
    draft_count: numberValue,
    max_persisted_candidates: numberValue,
    checked_at: stringId,
    issue_count: numberValue,
    blocking_issue_count: numberValue,
    warning_issue_count: numberValue,
    blocking_reason_codes: stringArray,
    warning_codes: stringArray,
    issues: {
      type: 'array',
      items: topicSelectionRankedCandidateDraftBatchMinimumValidationIssueSchema,
    },
  },
} as const;

export const topicSelectionCandidateDraftAdmissionReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'batch_id',
    'node_attempt_id',
    'terminal_result',
    'draft_results',
    'valid_draft_count',
    'rejected_draft_count',
    'merge_hint_count',
    'blocking_reason_codes',
  ],
  properties: {
    schema_version: stringId,
    batch_id: stringId,
    node_attempt_id: stringId,
    terminal_result: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS] },
    draft_results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'draft_id',
          'rank',
          'decision',
          'reason_codes',
          'blocking_reason_codes',
          'resolved_ref_counts',
          'normalized_candidate_key',
          'duplicate_candidate_refs',
          'required_human_review_points',
          'supplemental_questions',
        ],
        properties: {
          draft_id: stringId,
          rank: numberValue,
          decision: { enum: [...TOPIC_SELECTION_CANDIDATE_DRAFT_ADMISSION_DECISIONS] },
          reason_codes: stringArray,
          blocking_reason_codes: stringArray,
          resolved_ref_counts: {
            type: 'object',
            additionalProperties: false,
            required: ['support', 'challenge', 'baseline', 'context'],
            properties: {
              support: numberValue,
              challenge: numberValue,
              baseline: numberValue,
              context: numberValue,
            },
          },
          normalized_candidate_key: nullableStringId,
          duplicate_candidate_refs: functionalRefArray,
          required_human_review_points: functionalRefArray,
          supplemental_questions: stringArray,
          admitted_draft_ref: nullableFunctionalRef,
          merge_target_ref: nullableFunctionalRef,
        },
      },
    },
    valid_draft_count: numberValue,
    rejected_draft_count: numberValue,
    merge_hint_count: numberValue,
    blocking_reason_codes: stringArray,
  },
} as const;

export const topicSelectionSupplementalRoundRoutingDecisionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'batch_id',
    'node_attempt_id',
    'current_round_index',
    'remaining_round_budget',
    'routing_decision',
    'source_draft_ids',
    'trigger_reason_codes',
    'supplemental_questions',
    'allowed_roles',
    'forbidden_actions',
  ],
  properties: {
    schema_version: stringId,
    batch_id: stringId,
    node_attempt_id: stringId,
    current_round_index: numberValue,
    remaining_round_budget: numberValue,
    routing_decision: { enum: [...TOPIC_SELECTION_SUPPLEMENTAL_ROUND_ROUTING_DECISIONS] },
    source_draft_ids: stringArray,
    trigger_reason_codes: stringArray,
    supplemental_questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question_id', 'source_draft_id', 'question', 'reason_code'],
        properties: {
          question_id: stringId,
          source_draft_id: stringId,
          question: stringId,
          reason_code: stringId,
        },
      },
    },
    allowed_roles: stringArray,
    forbidden_actions: stringArray,
    stop_condition: nullableStringId,
  },
} as const;

export const topicSelectionPersistNeedCandidateBatchCommandSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_attempt_id',
    'workflow_run_id',
    'topic_scope_ref',
    'evidence_map_ref',
    'ranked_candidate_draft_batch_artifact_ref',
    'admission_report_artifact_ref',
    'supplemental_routing_artifact_refs',
    'admitted_drafts',
    'idempotency_key',
  ],
  properties: {
    schema_version: stringId,
    node_attempt_id: stringId,
    workflow_run_id: stringId,
    topic_scope_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    resource_sample_set_ref: nullableFunctionalRef,
    ranked_candidate_draft_batch_artifact_ref: artifactFunctionalRefSchema,
    admission_report_artifact_ref: artifactFunctionalRefSchema,
    supplemental_routing_artifact_refs: artifactRefArray,
    admitted_drafts: {
      type: 'array',
      items: {
        ...topicSelectionNeedCandidateDraftSchema,
        required: [
          ...topicSelectionNeedCandidateDraftSchema.required,
          'normalized_candidate_key',
          'source_admission_decision_ref',
        ],
        properties: {
          ...topicSelectionNeedCandidateDraftSchema.properties,
          normalized_candidate_key: stringId,
          source_admission_decision_ref: topicSelectionFunctionalRefSchema,
        },
      },
    },
    rejected_framings: {
      type: 'array',
      items: topicSelectionRejectedNeedCandidateFramingSchema,
    },
    idempotency_key: stringId,
  },
} as const;

export const topicSelectionGenerateNeedCandidateNodeResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'workflow_run_id',
    'node_attempt_id',
    'status',
    'terminal_result',
    'persisted_candidate_refs',
    'artifact_refs',
    'warning_codes',
  ],
  properties: {
    schema_version: stringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    status: { enum: [...TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_NODE_STATUSES] },
    terminal_result: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS] },
    persisted_candidate_refs: functionalRefArray,
    candidate_pool_projection_ref: nullableFunctionalRef,
    candidate_pool_projection_hash: nullableStringId,
    artifact_refs: {
      type: 'object',
      additionalProperties: false,
      required: ['supplemental_round_routing_decisions'],
      properties: {
        ranked_candidate_draft_batch: nullableArtifactRef,
        minimum_schema_validation_report: nullableArtifactRef,
        candidate_draft_admission_report: nullableArtifactRef,
        supplemental_round_routing_decisions: artifactRefArray,
        persist_need_candidate_batch_command: nullableArtifactRef,
        discovery_audit: nullableArtifactRef,
      },
    },
    warning_codes: stringArray,
    error_code: { anyOf: [{ enum: [...TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ERROR_CODES] }, { type: 'null' }] },
  },
} as const;

export const topicSelectionNeedDiscoveryContextCompressionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['compression_version', 'layer_keys'],
  properties: {
    compression_version: stringId,
    layer_keys: stringArray,
    source_token_estimate: nullableNumber,
    compressed_token_estimate: nullableNumber,
  },
} as const;

const topicSelectionNeedDiscoveryContextEnvelopeRequired = [
  'schema_version',
  'node_id',
  'workflow_run_id',
  'node_attempt_id',
  'context_family',
  'input_refs',
  'input_refs_hash',
  'context_compiler_version',
  'policy_version',
  'output_schema_version',
  'profile_id',
  'execution_mode',
  'cache_key',
  'cache_hit',
  'redaction_policy',
  'created_at',
  'memory_digest_hash',
  'candidate_pool_hash',
  'payload_hash',
  'compression',
] as const;

const topicSelectionNeedDiscoveryContextEnvelopeProperties = {
  schema_version: stringId,
  node_id: { enum: ['topic-selection.v1a.generate-need-candidate.v1'] },
  workflow_run_id: stringId,
  node_attempt_id: stringId,
  context_family: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_FAMILIES] },
  input_refs: functionalRefArray,
  input_refs_hash: stringId,
  context_compiler_version: stringId,
  policy_version: stringId,
  output_schema_version: stringId,
  profile_id: stringId,
  execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
  cache_key: stringId,
  cache_hit: booleanValue,
  runtime_cache_key_hash: nullableString,
  redaction_policy: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_CONTEXT_REDACTION_POLICIES] },
  created_at: stringId,
  memory_digest_hash: stringId,
  candidate_pool_hash: stringId,
  payload_hash: stringId,
  compression: topicSelectionNeedDiscoveryContextCompressionSchema,
} as const;

export const topicSelectionNeedDiscoveryExplorationContextPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'topic_scope',
    'evidence_signal_digest',
    'resource_sample_digest',
    'search_coverage_digest',
    'sibling_candidate_digest',
    'decision_memory_digest',
    'exploration_prompts',
    'challenge_prompts',
    'allowed_outputs',
    'forbidden_outputs',
  ],
  properties: {
    topic_scope: objectPayload,
    evidence_signal_digest: objectPayload,
    resource_sample_digest: objectPayload,
    search_coverage_digest: objectPayload,
    sibling_candidate_digest: objectPayload,
    decision_memory_digest: objectPayload,
    exploration_prompts: stringArray,
    challenge_prompts: stringArray,
    allowed_outputs: stringArray,
    forbidden_outputs: stringArray,
  },
} as const;

export const topicSelectionNeedDiscoveryArbiterContextPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'node_policy_ref',
    'output_schema_ref',
    'authority_boundary',
    'max_persisted_candidates',
    'deterministic_gate_checklist',
    'role_level_summaries',
    'candidate_pool_digest',
    'evidence_ref_table',
    'rejected_framing_table',
    'unresolved_points',
    'batch_ranking_rules',
    'persistence_rules',
    'failure_rules',
  ],
  properties: {
    node_policy_ref: topicSelectionFunctionalRefSchema,
    output_schema_ref: topicSelectionFunctionalRefSchema,
    authority_boundary: objectPayload,
    max_persisted_candidates: numberValue,
    deterministic_gate_checklist: stringArray,
    role_level_summaries: objectArray,
    candidate_pool_digest: objectPayload,
    evidence_ref_table: objectArray,
    rejected_framing_table: objectArray,
    unresolved_points: objectArray,
    batch_ranking_rules: stringArray,
    persistence_rules: stringArray,
    failure_rules: stringArray,
  },
} as const;

const topicSelectionNeedDiscoveryCandidateAngleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['angle_id', 'summary', 'evidence_refs'],
  properties: {
    angle_id: stringId,
    summary: stringId,
    candidate_need_hint: nullableStringId,
    evidence_refs: functionalRefArray,
  },
} as const;

export const topicSelectionNeedDiscoveryExplorerNotesSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'debate_loop_id',
    'round_index',
    'role',
    'stage',
    'agent_instance_id',
    'candidate_angles',
    'evidence_refs',
    'unresolved_questions',
    'warnings',
  ],
  properties: {
    schema_version: stringId,
    debate_loop_id: stringId,
    round_index: numberValue,
    role: { const: 'explorer' },
    stage: stringId,
    agent_instance_id: stringId,
    candidate_angles: {
      type: 'array',
      items: topicSelectionNeedDiscoveryCandidateAngleSchema,
    },
    evidence_refs: functionalRefArray,
    unresolved_questions: stringArray,
    warnings: stringArray,
  },
} as const;

const topicSelectionNeedDiscoveryCritiquePointSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['critique_id', 'summary', 'severity', 'evidence_refs'],
  properties: {
    critique_id: stringId,
    summary: stringId,
    severity: { enum: ['low', 'medium', 'high'] },
    evidence_refs: functionalRefArray,
  },
} as const;

export const topicSelectionNeedDiscoveryDeepCriticNotesSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'debate_loop_id',
    'round_index',
    'role',
    'stage',
    'agent_instance_id',
    'critique_points',
    'failure_modes',
    'missing_evidence_questions',
    'evidence_refs',
    'warnings',
  ],
  properties: {
    schema_version: stringId,
    debate_loop_id: stringId,
    round_index: numberValue,
    role: { const: 'deep_critic' },
    stage: stringId,
    agent_instance_id: stringId,
    critique_points: {
      type: 'array',
      items: topicSelectionNeedDiscoveryCritiquePointSchema,
    },
    failure_modes: stringArray,
    missing_evidence_questions: stringArray,
    evidence_refs: functionalRefArray,
    warnings: stringArray,
  },
} as const;

export const topicSelectionNeedDiscoveryRoleLevelSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'debate_loop_id',
    'round_index',
    'role',
    'source_invocation_attempt_ids',
    'source_artifact_refs',
    'summary',
    'candidate_need_signals',
    'risk_signals',
    'evidence_refs',
    'unresolved_questions',
  ],
  properties: {
    schema_version: stringId,
    debate_loop_id: stringId,
    round_index: numberValue,
    role: { enum: ['explorer', 'deep_critic'] },
    source_invocation_attempt_ids: stringArray,
    source_artifact_refs: artifactRefArray,
    summary: stringId,
    candidate_need_signals: stringArray,
    risk_signals: stringArray,
    evidence_refs: functionalRefArray,
    unresolved_questions: stringArray,
  },
} as const;

export const topicSelectionNeedDiscoveryDebateIssueFrameSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'debate_loop_id',
    'round_index',
    'role',
    'stage',
    'frame_id',
    'focused_questions',
    'requested_roles',
    'source_role_summary_refs',
  ],
  properties: {
    schema_version: stringId,
    debate_loop_id: stringId,
    round_index: numberValue,
    role: { const: 'arbiter' },
    stage: { const: 'issue_framing' },
    frame_id: stringId,
    focused_questions: stringArray,
    requested_roles: {
      type: 'array',
      items: { enum: ['explorer', 'deep_critic'] },
    },
    source_role_summary_refs: artifactRefArray,
    stop_condition: nullableStringId,
  },
} as const;

export const topicSelectionNeedDiscoveryDebateFinalSynthesisArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'debate_loop_id',
    'round_index',
    'role',
    'stage',
    'final_invocation_attempt_id',
    'issue_frame_ref',
    'role_level_summary_refs',
    'ranked_candidate_draft_batch_hash',
    'terminal_result',
    'draft_count',
    'rejected_framing_count',
    'unresolved_point_count',
  ],
  properties: {
    schema_version: stringId,
    debate_loop_id: stringId,
    round_index: numberValue,
    role: { const: 'arbiter' },
    stage: { const: 'final_synthesis' },
    final_invocation_attempt_id: stringId,
    final_invocation_audit_ref: nullableArtifactRef,
    issue_frame_ref: artifactFunctionalRefSchema,
    role_level_summary_refs: artifactRefArray,
    ranked_candidate_draft_batch_hash: stringId,
    terminal_result: { enum: [...TOPIC_SELECTION_NEED_DISCOVERY_TERMINAL_RESULTS] },
    draft_count: numberValue,
    rejected_framing_count: numberValue,
    unresolved_point_count: numberValue,
  },
} as const;

export const topicSelectionNeedDiscoveryContextPacketSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: [...topicSelectionNeedDiscoveryContextEnvelopeRequired, 'payload'],
      properties: {
        ...topicSelectionNeedDiscoveryContextEnvelopeProperties,
        context_family: { enum: ['exploration_context'] },
        payload: topicSelectionNeedDiscoveryExplorationContextPayloadSchema,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: [...topicSelectionNeedDiscoveryContextEnvelopeRequired, 'payload'],
      properties: {
        ...topicSelectionNeedDiscoveryContextEnvelopeProperties,
        context_family: { enum: ['arbiter_context'] },
        payload: topicSelectionNeedDiscoveryArbiterContextPayloadSchema,
      },
    },
  ],
} as const;

export const topicSelectionGenerateNeedCandidateArtifactSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'artifact_key',
    'payload_schema',
    'redaction_policy',
    'redacted',
    'redacted_paths',
    'source_refs',
    'payload_hash',
    'payload',
  ],
  properties: {
    schema_version: stringId,
    node_id: { enum: ['topic-selection.v1a.generate-need-candidate.v1'] },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    artifact_key: { enum: [...TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ARTIFACT_KEYS] },
    payload_schema: stringId,
    redaction_policy: { enum: [...TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_REDACTION_POLICIES] },
    redacted: booleanValue,
    redacted_paths: stringArray,
    source_refs: functionalRefArray,
    payload_hash: stringId,
    payload: objectPayload,
  },
} as const;

export const topicSelectionGenerateNeedCandidateArtifactRefEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifact_key', 'artifact_ref', 'artifact_hash', 'payload_hash', 'payload_schema', 'redacted_paths'],
  properties: {
    artifact_key: { enum: [...TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ARTIFACT_KEYS] },
    artifact_ref: artifactFunctionalRefSchema,
    artifact_hash: stringId,
    payload_hash: stringId,
    payload_schema: stringId,
    redacted_paths: stringArray,
  },
} as const;

export const topicSelectionNeedDiscoveryCompiledContextPairSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'node_id',
    'workflow_run_id',
    'node_attempt_id',
    'exploration_context_ref',
    'arbiter_context_ref',
    'exploration_context_hash',
    'arbiter_context_hash',
    'exploration_cache_key',
    'arbiter_cache_key',
    'artifact_refs',
  ],
  properties: {
    schema_version: stringId,
    node_id: { enum: ['topic-selection.v1a.generate-need-candidate.v1'] },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    exploration_context_ref: artifactFunctionalRefSchema,
    arbiter_context_ref: artifactFunctionalRefSchema,
    exploration_context_hash: stringId,
    arbiter_context_hash: stringId,
    exploration_cache_key: stringId,
    arbiter_cache_key: stringId,
    exploration_runtime_cache_key_hash: nullableString,
    arbiter_runtime_cache_key_hash: nullableString,
    artifact_refs: {
      type: 'array',
      items: topicSelectionGenerateNeedCandidateArtifactRefEntrySchema,
    },
  },
} as const;

export const topicSelectionGenerateNeedCandidateArtifactRefBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'node_id', 'workflow_run_id', 'node_attempt_id', 'artifact_refs'],
  properties: {
    schema_version: stringId,
    node_id: { enum: ['topic-selection.v1a.generate-need-candidate.v1'] },
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    artifact_refs: {
      type: 'array',
      items: topicSelectionGenerateNeedCandidateArtifactRefEntrySchema,
    },
  },
} as const;

export const topicSelectionNeedCandidateRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'need_candidate_id',
    'title_card_id',
    'evidence_map_id',
    'candidate_version',
    'lifecycle_status',
    'decision_status',
    'review_status',
    'freshness_status',
    'candidate_need',
    'unmet_need_statement',
    'mechanism_type',
    'mechanism_payload',
    'prior_art_status',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'evidence_role_bundle',
    'conflict_refs',
    'strength_assessment_refs',
    'open_recheck_request_refs',
    'unresolved_challenge_refs',
    'accepted_risk_refs',
    'gap_codes',
    'speculative',
    'artifact_refs',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    need_candidate_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    evidence_map_id: stringId,
    candidate_version: stringId,
    lifecycle_status: { enum: [...TOPIC_SELECTION_NEED_CANDIDATE_LIFECYCLE_STATUSES] },
    decision_status: { enum: [...TOPIC_SELECTION_NEED_CANDIDATE_DECISION_STATUSES] },
    review_status: { enum: [...TOPIC_SELECTION_NEED_CANDIDATE_REVIEW_STATUSES] },
    freshness_status: { enum: [...TOPIC_SELECTION_NEED_CANDIDATE_FRESHNESS_STATUSES] },
    candidate_need: stringId,
    unmet_need_statement: stringId,
    mechanism_type: { enum: [...TOPIC_SELECTION_NEED_MECHANISM_TYPES] },
    mechanism_summary: nullableStringId,
    mechanism_payload: objectPayload,
    scope_notes: nullableStringId,
    non_goal_notes: nullableStringId,
    prior_art_status: { enum: [...TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES] },
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    evidence_role_bundle: topicSelectionEvidenceRoleBundleSchema,
    conflict_refs: functionalRefArray,
    strength_assessment_refs: functionalRefArray,
    open_recheck_request_refs: functionalRefArray,
    unresolved_challenge_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    gap_codes: stringArray,
    speculative: booleanValue,
    confidence: nullableNumber,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    result_adjudication_id: nullableStringId,
    result_validated_need_id: nullableStringId,
    merged_into_need_candidate_ref: nullableFunctionalRef,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const topicSelectionNeedCandidateReadinessAssessmentRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readiness_assessment_id',
    'title_card_id',
    'need_candidate_id',
    'evidence_map_id',
    'recommendation',
    'blockers',
    'warnings',
    'required_actions',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'support_unit_refs',
    'challenge_unit_refs',
    'baseline_unit_refs',
    'context_unit_refs',
    'conflict_refs',
    'open_recheck_request_refs',
    'accepted_risk_refs',
    'gap_codes',
    'support_count',
    'challenge_count',
    'abstract_only_support_count',
    'strong_unresolved_challenge_count',
    'assessed_by',
    'created_at',
  ],
  properties: {
    readiness_assessment_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    need_candidate_id: stringId,
    evidence_map_id: stringId,
    recommendation: { enum: [...TOPIC_SELECTION_NEED_READINESS_RECOMMENDATIONS] },
    blockers: { type: 'array', items: topicSelectionGateIssueSchema },
    warnings: { type: 'array', items: topicSelectionGateIssueSchema },
    required_actions: stringArray,
    strength_assessment_ref: nullableFunctionalRef,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    support_unit_refs: functionalRefArray,
    challenge_unit_refs: functionalRefArray,
    baseline_unit_refs: functionalRefArray,
    context_unit_refs: functionalRefArray,
    conflict_refs: functionalRefArray,
    open_recheck_request_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    gap_codes: stringArray,
    support_count: numberValue,
    challenge_count: numberValue,
    abstract_only_support_count: numberValue,
    strong_unresolved_challenge_count: numberValue,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    policy_version_id: nullableStringId,
    assessed_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionValidationDecisionSupportPacketRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'validation_support_packet_id',
    'title_card_id',
    'need_candidate_id',
    'evidence_map_id',
    'packet_status',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'need_candidate_ref',
    'evidence_role_bundle',
    'conflict_refs',
    'strength_assessment_refs',
    'coverage_refs',
    'residual_risk_refs',
    'open_gap_codes',
    'required_human_checks',
    'prior_art_status',
    'already_solved_review',
    'packet_payload',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    validation_support_packet_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    need_candidate_id: stringId,
    evidence_map_id: stringId,
    readiness_assessment_id: nullableStringId,
    packet_status: { enum: ['draft', 'ready', 'superseded'] },
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    need_candidate_ref: topicSelectionFunctionalRefSchema,
    readiness_assessment_ref: nullableFunctionalRef,
    evidence_role_bundle: topicSelectionEvidenceRoleBundleSchema,
    conflict_refs: functionalRefArray,
    strength_assessment_refs: functionalRefArray,
    coverage_refs: functionalRefArray,
    residual_risk_refs: functionalRefArray,
    open_gap_codes: stringArray,
    required_human_checks: stringArray,
    prior_art_status: { enum: [...TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES] },
    already_solved_review: objectPayload,
    packet_payload: objectPayload,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionValidateNeedAdjudicationResultRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'adjudication_result_id',
    'title_card_id',
    'need_candidate_id',
    'support_packet_id',
    'final_decision',
    'loopback_target',
    'rationale',
    'required_actions',
    'accepted_risk_refs',
    'residual_risk_refs',
    'gap_codes',
    'decision_payload',
    'artifact_refs',
    'adjudicated_by',
    'created_at',
  ],
  properties: {
    adjudication_result_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    need_candidate_id: stringId,
    support_packet_id: stringId,
    final_decision: { enum: [...TOPIC_SELECTION_NEED_ADJUDICATION_DECISIONS] },
    output_validated_need_id: nullableStringId,
    human_decision_id: nullableStringId,
    loopback_target: { enum: [...TOPIC_SELECTION_NEED_LOOPBACK_TARGETS] },
    rejected_reason: { anyOf: [{ enum: [...TOPIC_SELECTION_NEED_REJECTED_REASONS] }, { type: 'null' }] },
    merge_target_need_candidate_ref: nullableFunctionalRef,
    output_searchplan_recheck_request_ref: nullableFunctionalRef,
    output_memory_suggestion_ref: nullableFunctionalRef,
    rationale: stringId,
    required_actions: stringArray,
    accepted_risk_refs: functionalRefArray,
    residual_risk_refs: functionalRefArray,
    gap_codes: stringArray,
    decision_payload: objectPayload,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    trace_snapshot_id: nullableStringId,
    artifact_refs: functionalRefArray,
    adjudicated_by: topicSelectionActorRefSchema,
    created_at: stringId,
  },
} as const;

export const topicSelectionValidatedNeedRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'validated_need_id',
    'title_card_id',
    'source_need_candidate_id',
    'adjudication_result_id',
    'support_packet_id',
    'human_decision_id',
    'validated_need_statement',
    'mechanism_type',
    'mechanism_payload',
    'prior_art_status',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'support_packet_ref',
    'adjudication_result_ref',
    'human_decision_ref',
    'evidence_role_bundle',
    'strength_assessment_refs',
    'conflict_refs',
    'residual_risk_refs',
    'accepted_risk_refs',
    'trace_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    validated_need_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    source_need_candidate_id: stringId,
    adjudication_result_id: stringId,
    support_packet_id: stringId,
    human_decision_id: stringId,
    validated_need_statement: stringId,
    mechanism_type: { enum: [...TOPIC_SELECTION_NEED_MECHANISM_TYPES] },
    mechanism_summary: nullableStringId,
    mechanism_payload: objectPayload,
    scope_notes: nullableStringId,
    non_goal_notes: nullableStringId,
    prior_art_status: { enum: [...TOPIC_SELECTION_NEED_PRIOR_ART_STATUSES] },
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    support_packet_ref: topicSelectionFunctionalRefSchema,
    adjudication_result_ref: topicSelectionFunctionalRefSchema,
    human_decision_ref: topicSelectionFunctionalRefSchema,
    evidence_role_bundle: topicSelectionEvidenceRoleBundleSchema,
    strength_assessment_refs: functionalRefArray,
    conflict_refs: functionalRefArray,
    residual_risk_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    trace_refs: functionalRefArray,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionCandidateDecisionMemorySuggestionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'memory_suggestion_id',
    'title_card_id',
    'source_need_candidate_id',
    'suggestion_type',
    'status',
    'target_ref',
    'suggestion_payload',
    'rationale',
    'created_by',
    'created_at',
  ],
  properties: {
    memory_suggestion_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    source_need_candidate_id: stringId,
    adjudication_result_id: nullableStringId,
    suggestion_type: { enum: [...TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_TYPES] },
    status: { enum: [...TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_STATUSES] },
    target_ref: topicSelectionFunctionalRefSchema,
    suggestion_payload: objectPayload,
    rationale: stringId,
    policy_version_id: nullableStringId,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;

export const topicSelectionV1aToV1bInputBundleRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'v1b_input_bundle_id',
    'title_card_id',
    'validated_need_id',
    'source_need_candidate_id',
    'adjudication_result_id',
    'support_packet_id',
    'bundle_version',
    'validated_need_ref',
    'source_need_candidate_ref',
    'adjudication_result_ref',
    'support_packet_ref',
    'human_decision_ref',
    'evidence_map_ref',
    'search_run_ref',
    'search_plan_ref',
    'literature_snapshot_ref',
    'evidence_role_bundle',
    'trace_refs',
    'risk_refs',
    'gap_codes',
    'memory_suggestion_refs',
    'recheck_request_refs',
    'handoff_payload',
    'created_by',
    'created_at',
  ],
  properties: {
    v1b_input_bundle_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: stringId,
    validated_need_id: stringId,
    source_need_candidate_id: stringId,
    adjudication_result_id: stringId,
    support_packet_id: stringId,
    bundle_version: stringId,
    validated_need_ref: topicSelectionFunctionalRefSchema,
    source_need_candidate_ref: topicSelectionFunctionalRefSchema,
    adjudication_result_ref: topicSelectionFunctionalRefSchema,
    support_packet_ref: topicSelectionFunctionalRefSchema,
    human_decision_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    search_run_ref: topicSelectionFunctionalRefSchema,
    search_plan_ref: topicSelectionFunctionalRefSchema,
    literature_snapshot_ref: topicSelectionFunctionalRefSchema,
    evidence_role_bundle: topicSelectionEvidenceRoleBundleSchema,
    trace_refs: functionalRefArray,
    risk_refs: functionalRefArray,
    gap_codes: stringArray,
    memory_suggestion_refs: functionalRefArray,
    recheck_request_refs: functionalRefArray,
    handoff_payload: objectPayload,
    created_by: { enum: ['human', 'llm', 'system', 'hybrid'] },
    created_at: stringId,
  },
} as const;
