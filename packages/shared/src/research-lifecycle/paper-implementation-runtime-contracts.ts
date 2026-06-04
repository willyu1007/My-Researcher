import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES,
  PAPER_IMPLEMENTATION_AGENT_RUN_MODES,
  PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES,
  type PaperImplementationAgentExecutionMode,
  type PaperImplementationAgentRunMode,
  type PaperImplementationAgentWorkflowType,
} from './paper-implementation-agent-common-contracts.js';
import {
  PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES,
  createResearchWorkOrderDraftRequestSchema,
  type CreateResearchWorkOrderDraftRequest,
  type PaperImplementationWorkOrderRunType,
} from './paper-implementation-workorder-contracts.js';
import {
  PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES,
  type PaperImplementationValidationCostClass,
} from './paper-implementation-validation-contracts.js';

export const PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION =
  'PaperImplementationRuntimeArtifactEnvelope@v1' as const;
export const PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION =
  'PaperImplementationRuntimeAdmissionRecord@v1' as const;

export const PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_SCOPES = ['role', 'final'] as const;
export type PaperImplementationRuntimeArtifactScope =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_SCOPES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_SCOPES = ['role', 'final'] as const;
export type PaperImplementationRuntimeAdmissionScope =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_SCOPES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_STATUSES = [
  'passed',
  'blocked',
  'failed_runtime',
] as const;
export type PaperImplementationRuntimeStatus =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_CACHE_STATUSES = [
  'hit',
  'miss',
  'blocked_stale',
  'blocked_drift',
  'bypassed',
  'not_applicable',
] as const;
export type PaperImplementationRuntimeCacheStatus =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_CACHE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_RESPONSE_REUSE_STATUSES = [
  'not_applicable',
  'miss',
  'hit_non_provider',
  'blocked_provider_live_required',
  'blocked_missing_approval',
  'blocked_profile_drift',
  'blocked_schema_drift',
  'blocked_policy_drift',
] as const;
export type PaperImplementationRuntimeResponseReuseStatus =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_RESPONSE_REUSE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_COMPRESSION_STATUSES = [
  'not_needed',
  'applied',
  'failed',
] as const;
export type PaperImplementationRuntimeCompressionStatus =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_COMPRESSION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_EXECUTOR_KINDS = [
  'deterministic_preflight',
  'bounded_semantic_debate',
  'semantic_support_mapper',
  'semantic_skeptic',
  'semantic_reconcile',
  'semantic_arbiter',
  'single_agent',
] as const;
export type PaperImplementationRuntimeExecutorKind =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_EXECUTOR_KINDS)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID =
  'trace_integrity_review.boundary_debate' as const;

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID =
  'paper-implementation.trace-integrity.boundary-debate.v1' as const;

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID =
  'paper-implementation-trace-integrity-boundary-debate' as const;
export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION =
  'v1' as const;
export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_PACKET_SCHEMA_VERSION =
  'TraceIntegrityRetrievalPacket@v1' as const;

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_SOURCE_FAMILIES = [
  'target_object',
  'trace_lineage',
  'citation_candidate',
  'claim_trace_packet',
  'evidence_board',
  'validation_artifact',
  'run_evidence',
  'result_packet',
  'dossier_readiness',
  'unknown',
] as const;
export type PaperImplementationTraceIntegrityRetrievalSourceFamily =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_SOURCE_FAMILIES)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_FRESHNESS_STATUSES = [
  'fresh',
  'stale',
  'unknown',
] as const;
export type PaperImplementationTraceIntegrityRetrievalFreshnessStatus =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_FRESHNESS_STATUSES)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_PREFLIGHT_ROLE_SLOT_ID =
  'trace_integrity_review.deterministic_preflight' as const;

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS = [
  'trace_integrity_review.support_mapper_map',
  'trace_integrity_review.skeptic_challenge',
  'trace_integrity_review.support_mapper_reconcile',
  'trace_integrity_review.arbiter_final',
] as const;
export type PaperImplementationTraceIntegrityDebateSemanticRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_SLOT_IDS = [
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_PREFLIGHT_ROLE_SLOT_ID,
  ...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
] as const;
export type PaperImplementationTraceIntegrityDebateRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_SLOT_IDS)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_OUTPUT_SCHEMA_ID =
  'TraceIntegrityRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_FINAL_OUTPUT_SCHEMA_ID =
  'TraceIntegrityDebateArtifact@v1' as const;

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationTraceIntegrityDebateRuntimeRequest@v1' as const;

export const PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID =
  'claim_boundary_review.boundary_debate' as const;
export const PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID =
  'dossier_readiness_prep.readiness_audit' as const;

export const PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID =
  'paper-implementation.claim-boundary.boundary-debate.v1' as const;
export const PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID =
  'paper-implementation.dossier-readiness.readiness-audit.v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID =
  'result_analysis.interpretation_scenarios' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID =
  'paper-implementation.result-analysis.interpretation-scenarios.v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID =
  'experiment_design.work_order_draft' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID =
  'experiment_critique.plan_critique' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID =
  'paper-implementation.experiment-design.work-order-draft.v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID =
  'paper-implementation.experiment-critique.plan-critique.v1' as const;

export const PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROMPT_TEMPLATE_ID =
  'paper-implementation-claim-boundary-debate' as const;
export const PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROMPT_TEMPLATE_ID =
  'paper-implementation-dossier-readiness-audit' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_ID =
  'paper-implementation-result-analysis-scenarios' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROMPT_TEMPLATE_ID =
  'paper-implementation-experiment-design-work-order-draft' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROMPT_TEMPLATE_ID =
  'paper-implementation-experiment-critique-plan-critique' as const;
export const PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION = 'v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_VERSION = 'v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_PROMPT_TEMPLATE_VERSION = 'v1' as const;

export const PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS = [
  'claim_boundary_review.boundary_critic',
  'claim_boundary_review.evidence_skeptic',
  'claim_boundary_review.adjudicator_final',
] as const;
export type PaperImplementationClaimBoundaryReviewRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS)[number];

export const PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS = [
  'dossier_readiness_prep.readiness_reviewer',
  'dossier_readiness_prep.blocker_skeptic',
  'dossier_readiness_prep.scenario_adjudicator_final',
] as const;
export type PaperImplementationDossierReadinessReviewRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS)[number];

export const PAPER_IMPLEMENTATION_P1_REVIEW_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationP1RuntimeReviewRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_P1_REVIEW_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationP1RuntimeReviewArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationP1RuntimeReviewRequest@v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID =
  'result_analysis.interpretation_scenario_builder' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID =
  'experiment_design.work_order_designer' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID =
  'experiment_critique.independent_critic' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_SLOT_IDS = [
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
] as const;
export type PaperImplementationExperimentPlanningRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_SLOT_IDS)[number];
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationResultAnalysisRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationResultAnalysisArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationResultAnalysisRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationExperimentPlanningRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationExperimentPlanningArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationExperimentPlanningRuntimeRequest@v1' as const;

export const PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_STATUSES = [
  'admitted',
  'rejected',
] as const;
export type PaperImplementationRuntimeAdmissionStatus =
  (typeof PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_ARTIFACT_CONTRACT_IDS = [
  'AgentWorkflowHarnessRun',
  'ImplementationProposalArtifact',
  'PaperImplementationAgentWorkflowHarnessRun',
  'PaperImplementationProposalArtifact',
  'PaperImplementationAgentWorkflowHarnessRun@v1',
  'PaperImplementationProposalArtifact@v1',
] as const;

export const PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_REF_TYPES = [
  'agent_workflow_harness_run',
  'harness_run',
  'implementation_proposal_artifact',
  'paper_implementation_agent_workflow_harness_run',
  'paper_implementation_proposal_artifact',
  'proposal_artifact',
] as const;

export const PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_PAYLOAD_KEYS = [
  'authority_mutation',
  'direct_state_mutation',
  'hidden_reasoning',
  'provider_credentials',
  'provider_response',
  'provider_secret',
  'prompt_text',
  'queue_item_payload',
  'raw_provider_logs',
  'raw_provider_response',
  'raw_output',
  'rendered_prompt_text',
  'unredacted_prompt_text',
] as const;

export interface PaperImplementationRuntimeArtifactEnvelope {
  schema_version: typeof PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION;
  runtime_artifact_id: string;
  artifact_identity_hash: string;
  runtime_identity_hash: string;
  implementation_project_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  slot_id: string;
  artifact_scope: PaperImplementationRuntimeArtifactScope;
  artifact_contract_id: string;
  artifact_contract_version: string;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id: string | null;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  source_hash_bundle_hash: string;
  created_by: TopicSelectionActorType;
  created_at: string;
  role_slot_id: string | null;
  call_index: number | null;
  prior_role_artifact_refs: TopicSelectionFunctionalRef[];
  prior_role_artifact_hashes: string[];
  role_chain_hash: string;
  final_artifact_ref: TopicSelectionFunctionalRef | null;
  final_artifact_hash: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  executor_kind: PaperImplementationRuntimeExecutorKind;
  model_profile_id: string;
  model_option_id: string | null;
  runtime_status: PaperImplementationRuntimeStatus;
  runtime_failure_code: string | null;
  retry_attempt_index: number;
  provider_call_count: number;
  response_reuse_status: PaperImplementationRuntimeResponseReuseStatus;
  response_reuse_decision_ref: TopicSelectionFunctionalRef | null;
  response_reuse_decision_hash: string | null;
  allowed_side_effects: string[];
  retrieval_packet_ref: TopicSelectionFunctionalRef | null;
  retrieval_packet_hash: string | null;
  reviewed_statement_packet_ref: TopicSelectionFunctionalRef | null;
  reviewed_statement_packet_hash: string | null;
  context_packet_ref: TopicSelectionFunctionalRef;
  context_packet_hash: string;
  runtime_invocation_context_hash: string;
  context_policy_profile_hash: string;
  cache_policy_profile_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  prompt_packet_ref: TopicSelectionFunctionalRef;
  prompt_packet_hash: string;
  prompt_template_id: string;
  prompt_template_version_id: string;
  prompt_variant_id: string;
  prompt_redaction_policy_hash: string;
  output_schema_id: string;
  context_cache_key_hash: string;
  context_cache_status: PaperImplementationRuntimeCacheStatus;
  context_cache_result_ref: TopicSelectionFunctionalRef | null;
  context_cache_result_hash: string | null;
  prompt_packet_cache_key_hash: string;
  prompt_packet_cache_status: PaperImplementationRuntimeCacheStatus;
  prompt_packet_cache_result_ref: TopicSelectionFunctionalRef | null;
  prompt_packet_cache_result_hash: string | null;
  token_budget_gate_result_ref: TopicSelectionFunctionalRef;
  token_budget_gate_result_hash: string;
  compression_policy_profile_hash: string;
  compression_status: PaperImplementationRuntimeCompressionStatus;
  compression_report_ref: TopicSelectionFunctionalRef | null;
  compression_report_hash: string | null;
  compressed_context_packet_ref: TopicSelectionFunctionalRef | null;
  compressed_context_packet_hash: string | null;
  artifact_payload: Record<string, unknown>;
  artifact_payload_ref: TopicSelectionFunctionalRef;
  artifact_payload_hash: string;
  output_hash: string;
  runtime_audit_ref: TopicSelectionFunctionalRef;
  runtime_audit_hash: string;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationRuntimeAdmissionRecord {
  schema_version: typeof PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION;
  admission_record_id: string;
  implementation_project_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  slot_id: string;
  admission_scope: PaperImplementationRuntimeAdmissionScope;
  admission_policy_id: string;
  admission_policy_version: string;
  runtime_artifact_ref: TopicSelectionFunctionalRef;
  runtime_artifact_hash: string;
  runtime_artifact_id: string;
  artifact_contract_id: string;
  target_ref: TopicSelectionFunctionalRef;
  created_at: string;
  expected_runtime_identity_hash: string;
  expected_source_hash_bundle_hash: string;
  expected_retrieval_packet_hash: string | null;
  expected_prompt_packet_hash: string;
  expected_output_schema_id: string;
  expected_prior_role_artifact_hashes: string[];
  expected_final_artifact_hash: string | null;
  observed_runtime_identity_hash: string;
  observed_source_hash_bundle_hash: string;
  observed_retrieval_packet_hash: string | null;
  observed_prompt_packet_hash: string;
  observed_output_schema_id: string;
  observed_prior_role_artifact_hashes: string[];
  observed_output_hash: string;
  admission_status: PaperImplementationRuntimeAdmissionStatus;
  admission_identity: Record<string, unknown>;
  admission_identity_hash: string;
  admitted_artifact_ref: TopicSelectionFunctionalRef | null;
  admitted_artifact_hash: string | null;
  issue_codes: string[];
  warning_codes: string[];
}

export interface AdmitPaperImplementationRuntimeArtifactBaseRequestPayload {
  admission_policy_id: string;
  admission_policy_version: string;
  expected_runtime_identity_hash: string;
  expected_source_hash_bundle_hash: string;
  expected_retrieval_packet_hash: string | null;
  expected_prompt_packet_hash: string;
  expected_output_schema_id: string;
  expected_prior_role_artifact_hashes: string[];
  admission_record_id?: string | null;
}

export interface AdmitPaperImplementationRoleRuntimeArtifactRequestPayload
  extends AdmitPaperImplementationRuntimeArtifactBaseRequestPayload {
  admission_scope: 'role';
  expected_final_artifact_hash: null;
}

export interface AdmitPaperImplementationFinalRuntimeArtifactRequestPayload
  extends AdmitPaperImplementationRuntimeArtifactBaseRequestPayload {
  admission_scope: 'final';
  expected_final_artifact_hash: string;
}

export type AdmitPaperImplementationRuntimeArtifactRequestPayload =
  | AdmitPaperImplementationRoleRuntimeArtifactRequestPayload
  | AdmitPaperImplementationFinalRuntimeArtifactRequestPayload;

export interface ListPaperImplementationRuntimeArtifactsQuery {
  slot_id?: string;
  artifact_scope?: PaperImplementationRuntimeArtifactScope;
}

export interface ListPaperImplementationRuntimeAdmissionRecordsQuery {
  runtime_artifact_id?: string;
  admission_scope?: PaperImplementationRuntimeAdmissionScope;
}

export interface PaperImplementationTraceIntegrityRoleOutput {
  role_slot_id: PaperImplementationTraceIntegrityDebateRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  reviewed_statement_refs: TopicSelectionFunctionalRef[];
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationTraceIntegrityReviewedStatementInput {
  statement_ref: TopicSelectionFunctionalRef;
  statement_hash?: string | null;
  statement_text?: string | null;
  semantic_role?: string | null;
}

export interface PaperImplementationTraceIntegritySourcePacketInput {
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
  source_family?: PaperImplementationTraceIntegrityRetrievalSourceFamily | null;
  freshness_status?: PaperImplementationTraceIntegrityRetrievalFreshnessStatus | null;
  evidence_role?: string | null;
  content_summary?: string | null;
  source_excerpt?: string | null;
}

export interface PaperImplementationTraceIntegrityReviewedStatement {
  statement_ref: TopicSelectionFunctionalRef;
  statement_hash: string | null;
  statement_text: string | null;
  semantic_role: string | null;
  content_available: boolean;
}

export interface PaperImplementationTraceIntegrityRetrievalSource {
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
  source_family: PaperImplementationTraceIntegrityRetrievalSourceFamily;
  freshness_status: PaperImplementationTraceIntegrityRetrievalFreshnessStatus;
  evidence_role: string | null;
  content_summary: string | null;
  source_excerpt: string | null;
  content_available: boolean;
}

export interface PaperImplementationTraceIntegrityRetrievalPacket {
  schema_version: typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_PACKET_SCHEMA_VERSION;
  retrieval_packet_id: string;
  implementation_project_id: string;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id: string | null;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  reviewed_statement_packet_ref: TopicSelectionFunctionalRef;
  reviewed_statement_packet_hash: string;
  reviewed_statements: PaperImplementationTraceIntegrityReviewedStatement[];
  sources: PaperImplementationTraceIntegrityRetrievalSource[];
  source_family_coverage: Record<string, number>;
  max_depth: number;
  freshness_status: PaperImplementationTraceIntegrityRetrievalFreshnessStatus;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationTraceIntegrityDebateArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  target_ref: TopicSelectionFunctionalRef;
  reviewed_statement_refs: TopicSelectionFunctionalRef[];
  retrieval_packet: PaperImplementationTraceIntegrityRetrievalPacket;
  retrieval_packet_ref: TopicSelectionFunctionalRef;
  retrieval_packet_hash: string;
  preflight_blockers: string[];
  support_map: Record<string, unknown>;
  challenge_findings: Record<string, unknown>[];
  finding_resolution_map: Record<string, unknown>;
  semantic_coverage_status: 'complete' | 'partial_with_warnings' | 'blocked';
  arbiter_blocker_codes: string[];
  blockers: string[];
  runtime_failure_code: string | null;
  role_artifact_refs: TopicSelectionFunctionalRef[];
  role_artifact_hashes: string[];
  admitted_role_artifact_refs: TopicSelectionFunctionalRef[];
  admitted_role_artifact_hashes: string[];
  role_prompt_packet_refs: TopicSelectionFunctionalRef[];
  role_prompt_packet_hashes: string[];
  role_token_budget_gate_result_refs: TopicSelectionFunctionalRef[];
  role_compression_report_refs: TopicSelectionFunctionalRef[];
  runtime_identity: Record<string, unknown>;
  cache_identity: Record<string, unknown>;
  source_refs: TopicSelectionFunctionalRef[];
  source_hash_bundle_hash: string;
}

export interface RunPaperImplementationTraceIntegrityDebateRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  reviewed_statement_packet_ref: TopicSelectionFunctionalRef;
  reviewed_statement_packet_hash: string;
  reviewed_statement_refs: TopicSelectionFunctionalRef[];
  reviewed_statement_packets?: PaperImplementationTraceIntegrityReviewedStatementInput[];
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  source_packets?: PaperImplementationTraceIntegritySourcePacketInput[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
    PaperImplementationTraceIntegrityRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
    PaperImplementationTraceIntegrityRoleOutput
  >>;
}

export type PaperImplementationP1RuntimeReviewSlotId =
  | typeof PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID
  | typeof PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID;

export type PaperImplementationP1RuntimeReviewRoleSlotId =
  | PaperImplementationClaimBoundaryReviewRoleSlotId
  | PaperImplementationDossierReadinessReviewRoleSlotId;

export interface PaperImplementationP1RuntimeReviewRoleOutput {
  role_slot_id: PaperImplementationP1RuntimeReviewRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  domain_gate_request?: Record<string, unknown> | null;
  scenario_outputs?: Record<string, unknown>[];
}

export interface PaperImplementationP1RuntimeReviewArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationP1RuntimeReviewSlotId;
  workflow_type: 'claim_boundary_review' | 'dossier_readiness_prep';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summaries: Record<string, string>;
  role_blocker_codes: Record<string, string[]>;
  role_warning_codes: Record<string, string[]>;
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  domain_gate_request: Record<string, unknown> | null;
  scenario_outputs: Record<string, unknown>[];
  role_artifact_refs: TopicSelectionFunctionalRef[];
  role_artifact_hashes: string[];
  admitted_role_artifact_refs: TopicSelectionFunctionalRef[];
  admitted_role_artifact_hashes: string[];
  role_prompt_packet_refs: TopicSelectionFunctionalRef[];
  role_prompt_packet_hashes: string[];
  role_token_budget_gate_result_refs: TopicSelectionFunctionalRef[];
  role_compression_report_refs: TopicSelectionFunctionalRef[];
  runtime_identity: Record<string, unknown>;
  cache_identity: Record<string, unknown>;
  source_refs: TopicSelectionFunctionalRef[];
  source_hash_bundle_hash: string;
}

export interface RunPaperImplementationP1RuntimeReviewRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationP1RuntimeReviewRoleSlotId,
    PaperImplementationP1RuntimeReviewRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationP1RuntimeReviewRoleSlotId,
    PaperImplementationP1RuntimeReviewRoleOutput
  >>;
}

export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS = [
  'positive',
  'negative',
  'inconclusive',
  'failed_run',
] as const;
export type PaperImplementationResultAnalysisScenarioKind =
  (typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS)[number];

export interface PaperImplementationResultAnalysisScenarioOutput {
  scenario_id: string;
  scenario_kind: PaperImplementationResultAnalysisScenarioKind;
  summary: string;
  support_refs: TopicSelectionFunctionalRef[];
  challenge_refs: TopicSelectionFunctionalRef[];
  limitation_refs: TopicSelectionFunctionalRef[];
  forbidden_overclaims: string[];
  recommended_claim_refs: TopicSelectionFunctionalRef[];
  required_followup_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationResultAnalysisRoleOutput {
  role_slot_id: typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  scenario_outputs: PaperImplementationResultAnalysisScenarioOutput[];
  domain_gate_request?: Record<string, unknown> | null;
}

export interface PaperImplementationResultAnalysisArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID;
  workflow_type: 'result_analysis';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  domain_gate_request: Record<string, unknown> | null;
  scenario_outputs: PaperImplementationResultAnalysisScenarioOutput[];
  role_artifact_refs: TopicSelectionFunctionalRef[];
  role_artifact_hashes: string[];
  admitted_role_artifact_refs: TopicSelectionFunctionalRef[];
  admitted_role_artifact_hashes: string[];
  role_prompt_packet_refs: TopicSelectionFunctionalRef[];
  role_prompt_packet_hashes: string[];
  role_token_budget_gate_result_refs: TopicSelectionFunctionalRef[];
  role_compression_report_refs: TopicSelectionFunctionalRef[];
  runtime_identity: Record<string, unknown>;
  cache_identity: Record<string, unknown>;
  source_refs: TopicSelectionFunctionalRef[];
  source_hash_bundle_hash: string;
}

export interface RunPaperImplementationResultAnalysisRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    PaperImplementationResultAnalysisRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    typeof PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    PaperImplementationResultAnalysisRoleOutput
  >>;
}

export type PaperImplementationExperimentPlanningSlotId =
  | typeof PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID
  | typeof PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID;

export const PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS = [
  'confirmatory_exploratory_separation',
  'compute_budget',
  'dataset_metric_alignment',
  'baseline_control',
  'execution_side_effect',
] as const;
export type PaperImplementationExperimentCritiqueDimension =
  (typeof PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS)[number];

export const PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DECISIONS = [
  'approve_for_work_order_draft',
  'revise_plan',
  'block_execution',
] as const;
export type PaperImplementationExperimentCritiqueDecisionKind =
  (typeof PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DECISIONS)[number];

export interface PaperImplementationExperimentWorkOrderDraftCandidate {
  candidate_id: string;
  run_type: PaperImplementationWorkOrderRunType;
  plan_summary: string;
  route_refs: TopicSelectionFunctionalRef[];
  feasibility_probe_refs: TopicSelectionFunctionalRef[];
  primary_metric_refs: TopicSelectionFunctionalRef[];
  secondary_metric_refs: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  run_policy_ref: TopicSelectionFunctionalRef;
  budget_ref: TopicSelectionFunctionalRef;
  stop_condition_refs: TopicSelectionFunctionalRef[];
  estimated_cost_class: PaperImplementationValidationCostClass;
  confirmatory_marker: boolean;
  work_order_draft_request: CreateResearchWorkOrderDraftRequest;
}

export interface PaperImplementationExperimentCritiqueFinding {
  finding_id: string;
  critique_dimension: PaperImplementationExperimentCritiqueDimension;
  severity: 'info' | 'warning' | 'blocking' | 'critical';
  summary: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  required_revision_refs: TopicSelectionFunctionalRef[];
  blocks_work_order: boolean;
}

export interface PaperImplementationExperimentCritiqueDecision {
  decision: PaperImplementationExperimentCritiqueDecisionKind;
  rationale: string;
  required_revision_refs: TopicSelectionFunctionalRef[];
  no_execution_side_effect: true;
}

export interface PaperImplementationExperimentPlanningSourceContextPacket {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
}

export interface PaperImplementationExperimentPlanningRoleOutput {
  role_slot_id: PaperImplementationExperimentPlanningRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  work_order_draft_candidates?: PaperImplementationExperimentWorkOrderDraftCandidate[];
  checked_dimensions?: PaperImplementationExperimentCritiqueDimension[];
  critique_findings?: PaperImplementationExperimentCritiqueFinding[];
  critique_decision?: PaperImplementationExperimentCritiqueDecision | null;
}

export interface PaperImplementationExperimentPlanningArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationExperimentPlanningSlotId;
  workflow_type: 'experiment_design' | 'experiment_critique';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  work_order_draft_candidates: PaperImplementationExperimentWorkOrderDraftCandidate[];
  checked_dimensions: PaperImplementationExperimentCritiqueDimension[];
  critique_findings: PaperImplementationExperimentCritiqueFinding[];
  critique_decision: PaperImplementationExperimentCritiqueDecision | null;
  no_execution_side_effect: true;
  role_artifact_refs: TopicSelectionFunctionalRef[];
  role_artifact_hashes: string[];
  admitted_role_artifact_refs: TopicSelectionFunctionalRef[];
  admitted_role_artifact_hashes: string[];
  role_prompt_packet_refs: TopicSelectionFunctionalRef[];
  role_prompt_packet_hashes: string[];
  role_token_budget_gate_result_refs: TopicSelectionFunctionalRef[];
  role_compression_report_refs: TopicSelectionFunctionalRef[];
  runtime_identity: Record<string, unknown>;
  cache_identity: Record<string, unknown>;
  source_refs: TopicSelectionFunctionalRef[];
  source_hash_bundle_hash: string;
}

export interface RunPaperImplementationExperimentPlanningRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  source_context_packets?: PaperImplementationExperimentPlanningSourceContextPacket[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationExperimentPlanningRoleSlotId,
    PaperImplementationExperimentPlanningRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationExperimentPlanningRoleSlotId,
    PaperImplementationExperimentPlanningRoleOutput
  >>;
}

const stringId = { type: 'string', minLength: 1 } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableHashString = { anyOf: [hashString, { type: 'null' }] } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const nonLegacyFunctionalRef = {
  allOf: [
    topicSelectionFunctionalRefSchema,
    {
      not: {
        type: 'object',
        required: ['ref_type'],
        properties: {
          ref_type: { enum: [...PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_REF_TYPES] },
        },
      },
    },
  ],
} as const;
const nullableNonLegacyFunctionalRef = {
  anyOf: [nonLegacyFunctionalRef, { type: 'null' }],
} as const;
const nonLegacyFunctionalRefArray = {
  type: 'array',
  items: nonLegacyFunctionalRef,
} as const;
const nonEmptyNonLegacyFunctionalRefArray = {
  type: 'array',
  minItems: 1,
  items: nonLegacyFunctionalRef,
} as const;
const stringArray = { type: 'array', items: stringId } as const;
const hashArray = { type: 'array', items: hashString } as const;
const nonEmptyHashArray = { type: 'array', minItems: 1, items: hashString } as const;
const objectArray = { type: 'array', items: { type: 'object' } } as const;

const workflowTypeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES] } as const;
const runModeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_RUN_MODES] } as const;
const executionModeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const runtimeArtifactScopeSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_SCOPES],
} as const;
const runtimeAdmissionScopeSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_SCOPES],
} as const;
const runtimeStatusSchema = { enum: [...PAPER_IMPLEMENTATION_RUNTIME_STATUSES] } as const;
const runtimeCacheStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_CACHE_STATUSES],
} as const;
const responseReuseStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_RESPONSE_REUSE_STATUSES],
} as const;
const compressionStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_COMPRESSION_STATUSES],
} as const;
const runtimeExecutorKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_EXECUTOR_KINDS],
} as const;
const runtimeAdmissionStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_STATUSES],
} as const;
const nonLegacyArtifactContractId = {
  allOf: [
    stringId,
    { not: { enum: [...PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_ARTIFACT_CONTRACT_IDS] } },
  ],
} as const;
const forbiddenPayloadKeyGuard = {
  not: { enum: [...PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_PAYLOAD_KEYS] },
} as const;
const admissionIdentityJsonValue = {
  $ref: '#/$defs/paperImplementationRuntimeAdmissionIdentityJsonValue',
} as const;
const admissionIdentityObject = {
  type: 'object',
  propertyNames: forbiddenPayloadKeyGuard,
  additionalProperties: admissionIdentityJsonValue,
} as const;
const traceIntegrityIdentityObject = {
  type: 'object',
  propertyNames: forbiddenPayloadKeyGuard,
  additionalProperties: true,
} as const;
const traceIntegrityRoleSlotSchema = {
  enum: [...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_SLOT_IDS],
} as const;
const traceIntegrityRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      { $ref: '#/$defs/paperImplementationTraceIntegrityRoleOutput' },
    ]),
  ),
} as const;
const p1RuntimeReviewRoleSlotIds = [
  ...PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  ...PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
] as const;
const p1RuntimeReviewRoleSlotSchema = {
  enum: [...p1RuntimeReviewRoleSlotIds],
} as const;
const p1RuntimeReviewRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    p1RuntimeReviewRoleSlotIds.map((slotId) => [
      slotId,
      { $ref: '#/$defs/paperImplementationP1RuntimeReviewRoleOutput' },
    ]),
  ),
} as const;
const p1RuntimeReviewSlotSchema = {
  enum: [
    PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
    PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  ],
} as const;
const p1RuntimeReviewWorkflowTypeSchema = {
  enum: ['claim_boundary_review', 'dossier_readiness_prep'],
} as const;
const resultAnalysisRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
} as const;
const resultAnalysisScenarioKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS],
} as const;
const resultAnalysisRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationResultAnalysisRoleOutput',
    },
  },
} as const;
const experimentPlanningRoleSlotSchema = {
  enum: [...PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_SLOT_IDS],
} as const;
const experimentPlanningRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      { $ref: '#/$defs/paperImplementationExperimentPlanningRoleOutput' },
    ]),
  ),
} as const;
const experimentPlanningSlotSchema = {
  enum: [
    PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
    PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  ],
} as const;
const experimentPlanningWorkflowTypeSchema = {
  enum: ['experiment_design', 'experiment_critique'],
} as const;
const workOrderRunTypeSchema = { enum: [...PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES] } as const;
const validationCostClassSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES] } as const;
const experimentCritiqueDimensionSchema = {
  enum: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
} as const;
const experimentCritiqueDecisionSchema = {
  enum: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DECISIONS],
} as const;
const traceIntegritySourceFamilySchema = {
  enum: [...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_SOURCE_FAMILIES],
} as const;
const traceIntegrityFreshnessStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_FRESHNESS_STATUSES],
} as const;
const nullableTraceIntegritySourceFamily = {
  anyOf: [traceIntegritySourceFamilySchema, { type: 'null' }],
} as const;
const nullableTraceIntegrityFreshnessStatus = {
  anyOf: [traceIntegrityFreshnessStatusSchema, { type: 'null' }],
} as const;
const artifactPayloadJsonValue = {
  $ref: '#/$defs/paperImplementationRuntimeArtifactPayloadJsonValue',
} as const;
const artifactPayloadObject = {
  type: 'object',
  propertyNames: forbiddenPayloadKeyGuard,
  additionalProperties: artifactPayloadJsonValue,
} as const;
const runtimeReviewPayloadObject = {
  type: 'object',
  propertyNames: forbiddenPayloadKeyGuard,
  additionalProperties: true,
} as const;
const productRunModeRequiresProviderExecution = {
  if: { properties: { run_mode: { const: 'product' } }, required: ['run_mode'] },
  then: {
    properties: {
      execution_mode: { const: 'provider_llm' },
    },
  },
} as const;

export const paperImplementationTraceIntegrityRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    'role_status',
    'summary',
    'reviewed_statement_refs',
    'cited_source_refs',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    role_slot_id: traceIntegrityRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    reviewed_statement_refs: nonLegacyFunctionalRefArray,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const paperImplementationP1RuntimeReviewRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    'role_status',
    'summary',
    'cited_source_refs',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    role_slot_id: p1RuntimeReviewRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    domain_gate_request: {
      anyOf: [runtimeReviewPayloadObject, { type: 'null' }],
    },
    scenario_outputs: objectArray,
  },
} as const;

export const paperImplementationResultAnalysisScenarioOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'scenario_id',
    'scenario_kind',
    'summary',
    'support_refs',
    'challenge_refs',
    'limitation_refs',
    'forbidden_overclaims',
    'recommended_claim_refs',
    'required_followup_refs',
  ],
  properties: {
    scenario_id: stringId,
    scenario_kind: resultAnalysisScenarioKindSchema,
    summary: stringId,
    support_refs: nonLegacyFunctionalRefArray,
    challenge_refs: nonLegacyFunctionalRefArray,
    limitation_refs: nonLegacyFunctionalRefArray,
    forbidden_overclaims: stringArray,
    recommended_claim_refs: nonLegacyFunctionalRefArray,
    required_followup_refs: nonLegacyFunctionalRefArray,
  },
} as const;

const completeResultAnalysisScenarioOutputsSchema = {
  type: 'array',
  minItems: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.length,
  items: paperImplementationResultAnalysisScenarioOutputSchema,
  allOf: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCENARIO_KINDS.map((scenarioKind) => ({
    contains: {
      type: 'object',
      required: ['scenario_kind'],
      properties: {
        scenario_kind: { const: scenarioKind },
      },
    },
  })),
} as const;

export const paperImplementationResultAnalysisRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    'role_status',
    'summary',
    'cited_source_refs',
    'blocker_codes',
    'warning_codes',
    'scenario_outputs',
  ],
  properties: {
    role_slot_id: resultAnalysisRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    scenario_outputs: {
      type: 'array',
      items: paperImplementationResultAnalysisScenarioOutputSchema,
    },
    domain_gate_request: {
      anyOf: [runtimeReviewPayloadObject, { type: 'null' }],
    },
  },
  allOf: [
    {
      if: { properties: { role_status: { const: 'passed' } }, required: ['role_status'] },
      then: {
        required: ['domain_gate_request'],
        properties: {
          scenario_outputs: {
            type: 'array',
            minItems: 1,
            items: paperImplementationResultAnalysisScenarioOutputSchema,
          },
          domain_gate_request: runtimeReviewPayloadObject,
        },
      },
    },
  ],
} as const;

export const paperImplementationExperimentWorkOrderDraftCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_id',
    'run_type',
    'plan_summary',
    'route_refs',
    'feasibility_probe_refs',
    'primary_metric_refs',
    'secondary_metric_refs',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'run_policy_ref',
    'budget_ref',
    'stop_condition_refs',
    'estimated_cost_class',
    'confirmatory_marker',
    'work_order_draft_request',
  ],
  properties: {
    candidate_id: stringId,
    run_type: workOrderRunTypeSchema,
    plan_summary: stringId,
    route_refs: nonEmptyNonLegacyFunctionalRefArray,
    feasibility_probe_refs: nonEmptyNonLegacyFunctionalRefArray,
    primary_metric_refs: nonEmptyNonLegacyFunctionalRefArray,
    secondary_metric_refs: nonLegacyFunctionalRefArray,
    dataset_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    baseline_version_refs: nonLegacyFunctionalRefArray,
    code_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    config_refs: nonEmptyNonLegacyFunctionalRefArray,
    run_policy_ref: nonLegacyFunctionalRef,
    budget_ref: nonLegacyFunctionalRef,
    stop_condition_refs: nonEmptyNonLegacyFunctionalRefArray,
    estimated_cost_class: validationCostClassSchema,
    confirmatory_marker: { type: 'boolean' },
    work_order_draft_request: createResearchWorkOrderDraftRequestSchema,
  },
} as const;

export const paperImplementationExperimentCritiqueFindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'finding_id',
    'critique_dimension',
    'severity',
    'summary',
    'evidence_refs',
    'required_revision_refs',
    'blocks_work_order',
  ],
  properties: {
    finding_id: stringId,
    critique_dimension: experimentCritiqueDimensionSchema,
    severity: { enum: ['info', 'warning', 'blocking', 'critical'] },
    summary: stringId,
    evidence_refs: nonLegacyFunctionalRefArray,
    required_revision_refs: nonLegacyFunctionalRefArray,
    blocks_work_order: { type: 'boolean' },
  },
} as const;

export const paperImplementationExperimentCritiqueDecisionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decision',
    'rationale',
    'required_revision_refs',
    'no_execution_side_effect',
  ],
  properties: {
    decision: experimentCritiqueDecisionSchema,
    rationale: stringId,
    required_revision_refs: nonLegacyFunctionalRefArray,
    no_execution_side_effect: { const: true },
  },
} as const;

export const paperImplementationExperimentPlanningSourceContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_ref',
    'evidence_kind',
    'content_summary',
    'key_facts',
  ],
  properties: {
    source_ref: nonLegacyFunctionalRef,
    evidence_kind: stringId,
    content_summary: stringId,
    key_facts: stringArray,
  },
} as const;

const completeExperimentCritiqueDimensionsSchema = {
  type: 'array',
  minItems: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS.length,
  items: experimentCritiqueDimensionSchema,
  allOf: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS.map((dimension) => ({
    contains: { const: dimension },
  })),
} as const;

export const paperImplementationExperimentPlanningRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    'role_status',
    'summary',
    'cited_source_refs',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    role_slot_id: experimentPlanningRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    work_order_draft_candidates: {
      type: 'array',
      items: paperImplementationExperimentWorkOrderDraftCandidateSchema,
    },
    checked_dimensions: {
      type: 'array',
      items: experimentCritiqueDimensionSchema,
    },
    critique_findings: {
      type: 'array',
      items: paperImplementationExperimentCritiqueFindingSchema,
    },
    critique_decision: {
      anyOf: [paperImplementationExperimentCritiqueDecisionSchema, { type: 'null' }],
    },
  },
  allOf: [
    {
      if: {
        properties: {
          role_slot_id: { const: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID },
          role_status: { const: 'passed' },
        },
        required: ['role_slot_id', 'role_status'],
      },
      then: {
        required: ['work_order_draft_candidates'],
        properties: {
          work_order_draft_candidates: {
            type: 'array',
            minItems: 2,
            items: paperImplementationExperimentWorkOrderDraftCandidateSchema,
          },
        },
      },
    },
    {
      if: {
        properties: {
          role_slot_id: { const: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID },
          role_status: { const: 'passed' },
        },
        required: ['role_slot_id', 'role_status'],
      },
      then: {
        required: ['checked_dimensions', 'critique_findings', 'critique_decision'],
        properties: {
          checked_dimensions: completeExperimentCritiqueDimensionsSchema,
          critique_findings: {
            type: 'array',
            minItems: 1,
            items: paperImplementationExperimentCritiqueFindingSchema,
          },
          critique_decision: paperImplementationExperimentCritiqueDecisionSchema,
        },
      },
    },
  ],
} as const;

export const paperImplementationTraceIntegrityReviewedStatementInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['statement_ref'],
  properties: {
    statement_ref: nonLegacyFunctionalRef,
    statement_hash: nullableHashString,
    statement_text: nullableStringId,
    semantic_role: nullableStringId,
  },
} as const;

export const paperImplementationTraceIntegritySourcePacketInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_ref', 'source_hash'],
  properties: {
    source_ref: nonLegacyFunctionalRef,
    source_hash: hashString,
    source_family: nullableTraceIntegritySourceFamily,
    freshness_status: nullableTraceIntegrityFreshnessStatus,
    evidence_role: nullableStringId,
    content_summary: nullableStringId,
    source_excerpt: nullableStringId,
  },
} as const;

export const paperImplementationTraceIntegrityRetrievalPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'retrieval_packet_id',
    'implementation_project_id',
    'target_ref',
    'target_version_id',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'reviewed_statement_packet_ref',
    'reviewed_statement_packet_hash',
    'reviewed_statements',
    'sources',
    'source_family_coverage',
    'max_depth',
    'freshness_status',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_PACKET_SCHEMA_VERSION },
    retrieval_packet_id: stringId,
    implementation_project_id: stringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    reviewed_statement_packet_ref: nonLegacyFunctionalRef,
    reviewed_statement_packet_hash: hashString,
    reviewed_statements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'statement_ref',
          'statement_hash',
          'statement_text',
          'semantic_role',
          'content_available',
        ],
        properties: {
          statement_ref: nonLegacyFunctionalRef,
          statement_hash: nullableHashString,
          statement_text: nullableStringId,
          semantic_role: nullableStringId,
          content_available: { type: 'boolean' },
        },
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'source_ref',
          'source_hash',
          'source_family',
          'freshness_status',
          'evidence_role',
          'content_summary',
          'source_excerpt',
          'content_available',
        ],
        properties: {
          source_ref: nonLegacyFunctionalRef,
          source_hash: hashString,
          source_family: traceIntegritySourceFamilySchema,
          freshness_status: traceIntegrityFreshnessStatusSchema,
          evidence_role: nullableStringId,
          content_summary: nullableStringId,
          source_excerpt: nullableStringId,
          content_available: { type: 'boolean' },
        },
      },
    },
    source_family_coverage: {
      type: 'object',
      propertyNames: traceIntegritySourceFamilySchema,
      additionalProperties: nonNegativeInteger,
    },
    max_depth: positiveInteger,
    freshness_status: traceIntegrityFreshnessStatusSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const paperImplementationTraceIntegrityDebateArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'target_ref',
    'reviewed_statement_refs',
    'retrieval_packet',
    'retrieval_packet_ref',
    'retrieval_packet_hash',
    'preflight_blockers',
    'support_map',
    'challenge_findings',
    'finding_resolution_map',
    'semantic_coverage_status',
    'arbiter_blocker_codes',
    'blockers',
    'runtime_failure_code',
    'role_artifact_refs',
    'role_artifact_hashes',
    'admitted_role_artifact_refs',
    'admitted_role_artifact_hashes',
    'role_prompt_packet_refs',
    'role_prompt_packet_hashes',
    'role_token_budget_gate_result_refs',
    'role_compression_report_refs',
    'runtime_identity',
    'cache_identity',
    'source_refs',
    'source_hash_bundle_hash',
  ],
  properties: {
    status: { enum: ['passed', 'blocked', 'failed_runtime'] },
    target_ref: nonLegacyFunctionalRef,
    reviewed_statement_refs: nonLegacyFunctionalRefArray,
    retrieval_packet: paperImplementationTraceIntegrityRetrievalPacketSchema,
    retrieval_packet_ref: nonLegacyFunctionalRef,
    retrieval_packet_hash: hashString,
    preflight_blockers: stringArray,
    support_map: { type: 'object' },
    challenge_findings: objectArray,
    finding_resolution_map: { type: 'object' },
    semantic_coverage_status: { enum: ['complete', 'partial_with_warnings', 'blocked'] },
    arbiter_blocker_codes: stringArray,
    blockers: stringArray,
    runtime_failure_code: nullableStringId,
    role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_artifact_hashes: nonEmptyHashArray,
    admitted_role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    admitted_role_artifact_hashes: nonEmptyHashArray,
    role_prompt_packet_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_prompt_packet_hashes: nonEmptyHashArray,
    role_token_budget_gate_result_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_compression_report_refs: nonLegacyFunctionalRefArray,
    runtime_identity: traceIntegrityIdentityObject,
    cache_identity: traceIntegrityIdentityObject,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hash_bundle_hash: hashString,
  },
} as const;

export const paperImplementationP1RuntimeReviewArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'slot_id',
    'workflow_type',
    'target_ref',
    'preflight_blockers',
    'role_summaries',
    'role_blocker_codes',
    'role_warning_codes',
    'blockers',
    'warnings',
    'runtime_failure_code',
    'domain_gate_request',
    'scenario_outputs',
    'role_artifact_refs',
    'role_artifact_hashes',
    'admitted_role_artifact_refs',
    'admitted_role_artifact_hashes',
    'role_prompt_packet_refs',
    'role_prompt_packet_hashes',
    'role_token_budget_gate_result_refs',
    'role_compression_report_refs',
    'runtime_identity',
    'cache_identity',
    'source_refs',
    'source_hash_bundle_hash',
  ],
  properties: {
    status: { enum: ['passed', 'blocked', 'failed_runtime'] },
    slot_id: p1RuntimeReviewSlotSchema,
    workflow_type: p1RuntimeReviewWorkflowTypeSchema,
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summaries: {
      type: 'object',
      propertyNames: p1RuntimeReviewRoleSlotSchema,
      additionalProperties: stringId,
    },
    role_blocker_codes: {
      type: 'object',
      propertyNames: p1RuntimeReviewRoleSlotSchema,
      additionalProperties: stringArray,
    },
    role_warning_codes: {
      type: 'object',
      propertyNames: p1RuntimeReviewRoleSlotSchema,
      additionalProperties: stringArray,
    },
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    domain_gate_request: {
      anyOf: [runtimeReviewPayloadObject, { type: 'null' }],
    },
    scenario_outputs: objectArray,
    role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_artifact_hashes: nonEmptyHashArray,
    admitted_role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    admitted_role_artifact_hashes: nonEmptyHashArray,
    role_prompt_packet_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_prompt_packet_hashes: nonEmptyHashArray,
    role_token_budget_gate_result_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_compression_report_refs: nonLegacyFunctionalRefArray,
    runtime_identity: traceIntegrityIdentityObject,
    cache_identity: traceIntegrityIdentityObject,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hash_bundle_hash: hashString,
  },
  allOf: [
    {
      if: { properties: { slot_id: { const: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID } }, required: ['slot_id'] },
      then: {
        properties: {
          workflow_type: { const: 'claim_boundary_review' },
        },
      },
    },
    {
      if: { properties: { slot_id: { const: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID } }, required: ['slot_id'] },
      then: {
        properties: {
          workflow_type: { const: 'dossier_readiness_prep' },
        },
      },
    },
  ],
} as const;

export const paperImplementationResultAnalysisArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'slot_id',
    'workflow_type',
    'target_ref',
    'preflight_blockers',
    'role_summary',
    'role_blocker_codes',
    'role_warning_codes',
    'blockers',
    'warnings',
    'runtime_failure_code',
    'domain_gate_request',
    'scenario_outputs',
    'role_artifact_refs',
    'role_artifact_hashes',
    'admitted_role_artifact_refs',
    'admitted_role_artifact_hashes',
    'role_prompt_packet_refs',
    'role_prompt_packet_hashes',
    'role_token_budget_gate_result_refs',
    'role_compression_report_refs',
    'runtime_identity',
    'cache_identity',
    'source_refs',
    'source_hash_bundle_hash',
  ],
  properties: {
    status: { enum: ['passed', 'blocked', 'failed_runtime'] },
    slot_id: { const: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID },
    workflow_type: { const: 'result_analysis' },
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summary: nullableStringId,
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    domain_gate_request: {
      anyOf: [runtimeReviewPayloadObject, { type: 'null' }],
    },
    scenario_outputs: {
      type: 'array',
      items: paperImplementationResultAnalysisScenarioOutputSchema,
    },
    role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_artifact_hashes: nonEmptyHashArray,
    admitted_role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    admitted_role_artifact_hashes: nonEmptyHashArray,
    role_prompt_packet_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_prompt_packet_hashes: nonEmptyHashArray,
    role_token_budget_gate_result_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_compression_report_refs: nonLegacyFunctionalRefArray,
    runtime_identity: traceIntegrityIdentityObject,
    cache_identity: traceIntegrityIdentityObject,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hash_bundle_hash: hashString,
  },
  allOf: [
    {
      if: { properties: { status: { const: 'passed' } }, required: ['status'] },
      then: {
        properties: {
          domain_gate_request: runtimeReviewPayloadObject,
          scenario_outputs: {
            ...completeResultAnalysisScenarioOutputsSchema,
          },
        },
      },
    },
  ],
} as const;

export const paperImplementationExperimentPlanningArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'slot_id',
    'workflow_type',
    'target_ref',
    'preflight_blockers',
    'role_summary',
    'role_blocker_codes',
    'role_warning_codes',
    'blockers',
    'warnings',
    'runtime_failure_code',
    'work_order_draft_candidates',
    'checked_dimensions',
    'critique_findings',
    'critique_decision',
    'no_execution_side_effect',
    'role_artifact_refs',
    'role_artifact_hashes',
    'admitted_role_artifact_refs',
    'admitted_role_artifact_hashes',
    'role_prompt_packet_refs',
    'role_prompt_packet_hashes',
    'role_token_budget_gate_result_refs',
    'role_compression_report_refs',
    'runtime_identity',
    'cache_identity',
    'source_refs',
    'source_hash_bundle_hash',
  ],
  properties: {
    status: { enum: ['passed', 'blocked', 'failed_runtime'] },
    slot_id: experimentPlanningSlotSchema,
    workflow_type: experimentPlanningWorkflowTypeSchema,
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summary: nullableStringId,
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    work_order_draft_candidates: {
      type: 'array',
      items: paperImplementationExperimentWorkOrderDraftCandidateSchema,
    },
    checked_dimensions: {
      type: 'array',
      items: experimentCritiqueDimensionSchema,
    },
    critique_findings: {
      type: 'array',
      items: paperImplementationExperimentCritiqueFindingSchema,
    },
    critique_decision: {
      anyOf: [paperImplementationExperimentCritiqueDecisionSchema, { type: 'null' }],
    },
    no_execution_side_effect: { const: true },
    role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_artifact_hashes: nonEmptyHashArray,
    admitted_role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    admitted_role_artifact_hashes: nonEmptyHashArray,
    role_prompt_packet_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_prompt_packet_hashes: nonEmptyHashArray,
    role_token_budget_gate_result_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_compression_report_refs: nonLegacyFunctionalRefArray,
    runtime_identity: traceIntegrityIdentityObject,
    cache_identity: traceIntegrityIdentityObject,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hash_bundle_hash: hashString,
  },
  allOf: [
    {
      if: { properties: { slot_id: { const: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID } }, required: ['slot_id'] },
      then: {
        properties: {
          workflow_type: { const: 'experiment_design' },
        },
      },
    },
    {
      if: { properties: { slot_id: { const: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID } }, required: ['slot_id'] },
      then: {
        properties: {
          workflow_type: { const: 'experiment_critique' },
        },
      },
    },
    {
      if: {
        properties: {
          status: { const: 'passed' },
          slot_id: { const: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID },
        },
        required: ['status', 'slot_id'],
      },
      then: {
        properties: {
          work_order_draft_candidates: {
            type: 'array',
            minItems: 2,
            items: paperImplementationExperimentWorkOrderDraftCandidateSchema,
          },
        },
      },
    },
    {
      if: {
        properties: {
          status: { const: 'passed' },
          slot_id: { const: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID },
        },
        required: ['status', 'slot_id'],
      },
      then: {
        properties: {
          checked_dimensions: completeExperimentCritiqueDimensionsSchema,
          critique_findings: {
            type: 'array',
            minItems: 1,
            items: paperImplementationExperimentCritiqueFindingSchema,
          },
          critique_decision: paperImplementationExperimentCritiqueDecisionSchema,
        },
      },
    },
  ],
} as const;

export const paperImplementationRuntimeArtifactEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationRuntimeArtifactPayloadJsonValue: {
      anyOf: [
        { type: 'null' },
        { type: 'boolean' },
        { type: 'number' },
        { type: 'string' },
        {
          type: 'array',
          items: artifactPayloadJsonValue,
        },
        artifactPayloadObject,
      ],
    },
  },
  required: [
    'schema_version',
    'runtime_artifact_id',
    'artifact_identity_hash',
    'runtime_identity_hash',
    'implementation_project_id',
    'workflow_type',
    'slot_id',
    'artifact_scope',
    'artifact_contract_id',
    'artifact_contract_version',
    'target_ref',
    'target_version_id',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_hash_bundle_hash',
    'created_by',
    'created_at',
    'role_slot_id',
    'call_index',
    'prior_role_artifact_refs',
    'prior_role_artifact_hashes',
    'role_chain_hash',
    'final_artifact_ref',
    'final_artifact_hash',
    'run_mode',
    'execution_mode',
    'executor_kind',
    'model_profile_id',
    'model_option_id',
    'runtime_status',
    'runtime_failure_code',
    'retry_attempt_index',
    'provider_call_count',
    'response_reuse_status',
    'response_reuse_decision_ref',
    'response_reuse_decision_hash',
    'allowed_side_effects',
    'retrieval_packet_ref',
    'retrieval_packet_hash',
    'reviewed_statement_packet_ref',
    'reviewed_statement_packet_hash',
    'context_packet_ref',
    'context_packet_hash',
    'runtime_invocation_context_hash',
    'context_policy_profile_hash',
    'cache_policy_profile_hash',
    'source_refs',
    'source_hashes',
    'prompt_packet_ref',
    'prompt_packet_hash',
    'prompt_template_id',
    'prompt_template_version_id',
    'prompt_variant_id',
    'prompt_redaction_policy_hash',
    'output_schema_id',
    'context_cache_key_hash',
    'context_cache_status',
    'context_cache_result_ref',
    'context_cache_result_hash',
    'prompt_packet_cache_key_hash',
    'prompt_packet_cache_status',
    'prompt_packet_cache_result_ref',
    'prompt_packet_cache_result_hash',
    'token_budget_gate_result_ref',
    'token_budget_gate_result_hash',
    'compression_policy_profile_hash',
    'compression_status',
    'compression_report_ref',
    'compression_report_hash',
    'compressed_context_packet_ref',
    'compressed_context_packet_hash',
    'artifact_payload',
    'artifact_payload_ref',
    'artifact_payload_hash',
    'output_hash',
    'runtime_audit_ref',
    'runtime_audit_hash',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION },
    runtime_artifact_id: stringId,
    artifact_identity_hash: hashString,
    runtime_identity_hash: hashString,
    implementation_project_id: stringId,
    workflow_type: workflowTypeSchema,
    slot_id: stringId,
    artifact_scope: runtimeArtifactScopeSchema,
    artifact_contract_id: nonLegacyArtifactContractId,
    artifact_contract_version: stringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    input_snapshot_ref: topicSelectionFunctionalRefSchema,
    input_snapshot_hash: hashString,
    source_hash_bundle_hash: hashString,
    created_by: actorTypeSchema,
    created_at: stringId,
    role_slot_id: nullableStringId,
    call_index: { anyOf: [positiveInteger, { type: 'null' }] },
    prior_role_artifact_refs: nonLegacyFunctionalRefArray,
    prior_role_artifact_hashes: hashArray,
    role_chain_hash: hashString,
    final_artifact_ref: nullableNonLegacyFunctionalRef,
    final_artifact_hash: nullableHashString,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    executor_kind: runtimeExecutorKindSchema,
    model_profile_id: stringId,
    model_option_id: nullableStringId,
    runtime_status: runtimeStatusSchema,
    runtime_failure_code: nullableStringId,
    retry_attempt_index: nonNegativeInteger,
    provider_call_count: nonNegativeInteger,
    response_reuse_status: responseReuseStatusSchema,
    response_reuse_decision_ref: nullableFunctionalRef,
    response_reuse_decision_hash: nullableHashString,
    allowed_side_effects: stringArray,
    retrieval_packet_ref: nullableFunctionalRef,
    retrieval_packet_hash: nullableHashString,
    reviewed_statement_packet_ref: nullableFunctionalRef,
    reviewed_statement_packet_hash: nullableHashString,
    context_packet_ref: topicSelectionFunctionalRefSchema,
    context_packet_hash: hashString,
    runtime_invocation_context_hash: hashString,
    context_policy_profile_hash: hashString,
    cache_policy_profile_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    prompt_packet_ref: topicSelectionFunctionalRefSchema,
    prompt_packet_hash: hashString,
    prompt_template_id: stringId,
    prompt_template_version_id: stringId,
    prompt_variant_id: stringId,
    prompt_redaction_policy_hash: hashString,
    output_schema_id: stringId,
    context_cache_key_hash: hashString,
    context_cache_status: runtimeCacheStatusSchema,
    context_cache_result_ref: nullableFunctionalRef,
    context_cache_result_hash: nullableHashString,
    prompt_packet_cache_key_hash: hashString,
    prompt_packet_cache_status: runtimeCacheStatusSchema,
    prompt_packet_cache_result_ref: nullableFunctionalRef,
    prompt_packet_cache_result_hash: nullableHashString,
    token_budget_gate_result_ref: topicSelectionFunctionalRefSchema,
    token_budget_gate_result_hash: hashString,
    compression_policy_profile_hash: hashString,
    compression_status: compressionStatusSchema,
    compression_report_ref: nullableFunctionalRef,
    compression_report_hash: nullableHashString,
    compressed_context_packet_ref: nullableFunctionalRef,
    compressed_context_packet_hash: nullableHashString,
    artifact_payload: artifactPayloadObject,
    artifact_payload_ref: nonLegacyFunctionalRef,
    artifact_payload_hash: hashString,
    output_hash: hashString,
    runtime_audit_ref: topicSelectionFunctionalRefSchema,
    runtime_audit_hash: hashString,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    {
      if: { properties: { artifact_scope: { const: 'role' } }, required: ['artifact_scope'] },
      then: {
        properties: {
          role_slot_id: stringId,
          call_index: positiveInteger,
        },
      },
    },
    {
      if: { properties: { artifact_scope: { const: 'final' } }, required: ['artifact_scope'] },
      then: {
        properties: {
          role_slot_id: { type: 'null' },
          call_index: { type: 'null' },
          prior_role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
          prior_role_artifact_hashes: nonEmptyHashArray,
        },
      },
    },
    {
      if: { properties: { execution_mode: { const: 'provider_llm' } }, required: ['execution_mode'] },
      then: {
        properties: {
          response_reuse_status: {
            enum: [
              'not_applicable',
              'miss',
              'blocked_provider_live_required',
              'blocked_missing_approval',
              'blocked_profile_drift',
              'blocked_schema_drift',
              'blocked_policy_drift',
            ],
          },
        },
      },
    },
    {
      if: {
        properties: {
          execution_mode: { const: 'provider_llm' },
          runtime_status: { const: 'passed' },
        },
        required: ['execution_mode', 'runtime_status'],
      },
      then: {
        properties: {
          provider_call_count: positiveInteger,
        },
      },
    },
    {
      if: { properties: { context_cache_status: { const: 'hit' } }, required: ['context_cache_status'] },
      then: {
        properties: {
          context_cache_result_ref: nonLegacyFunctionalRef,
          context_cache_result_hash: hashString,
        },
      },
    },
    {
      if: {
        properties: { prompt_packet_cache_status: { const: 'hit' } },
        required: ['prompt_packet_cache_status'],
      },
      then: {
        properties: {
          prompt_packet_cache_result_ref: nonLegacyFunctionalRef,
          prompt_packet_cache_result_hash: hashString,
        },
      },
    },
    {
      if: { properties: { compression_status: { const: 'applied' } }, required: ['compression_status'] },
      then: {
        properties: {
          compression_report_ref: topicSelectionFunctionalRefSchema,
          compression_report_hash: hashString,
          compressed_context_packet_ref: topicSelectionFunctionalRefSchema,
          compressed_context_packet_hash: hashString,
        },
      },
    },
  ],
} as const;

export const paperImplementationRuntimeAdmissionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationRuntimeAdmissionIdentityJsonValue: {
      anyOf: [
        { type: 'null' },
        { type: 'boolean' },
        { type: 'number' },
        { type: 'string' },
        {
          type: 'array',
          items: admissionIdentityJsonValue,
        },
        admissionIdentityObject,
      ],
    },
  },
  required: [
    'schema_version',
    'admission_record_id',
    'implementation_project_id',
    'workflow_type',
    'slot_id',
    'admission_scope',
    'admission_policy_id',
    'admission_policy_version',
    'runtime_artifact_ref',
    'runtime_artifact_hash',
    'runtime_artifact_id',
    'artifact_contract_id',
    'target_ref',
    'created_at',
    'expected_runtime_identity_hash',
    'expected_source_hash_bundle_hash',
    'expected_retrieval_packet_hash',
    'expected_prompt_packet_hash',
    'expected_output_schema_id',
    'expected_prior_role_artifact_hashes',
    'expected_final_artifact_hash',
    'observed_runtime_identity_hash',
    'observed_source_hash_bundle_hash',
    'observed_retrieval_packet_hash',
    'observed_prompt_packet_hash',
    'observed_output_schema_id',
    'observed_prior_role_artifact_hashes',
    'observed_output_hash',
    'admission_status',
    'admission_identity',
    'admission_identity_hash',
    'admitted_artifact_ref',
    'admitted_artifact_hash',
    'issue_codes',
    'warning_codes',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION },
    admission_record_id: stringId,
    implementation_project_id: stringId,
    workflow_type: workflowTypeSchema,
    slot_id: stringId,
    admission_scope: runtimeAdmissionScopeSchema,
    admission_policy_id: stringId,
    admission_policy_version: stringId,
    runtime_artifact_ref: nonLegacyFunctionalRef,
    runtime_artifact_hash: hashString,
    runtime_artifact_id: stringId,
    artifact_contract_id: nonLegacyArtifactContractId,
    target_ref: nonLegacyFunctionalRef,
    created_at: stringId,
    expected_runtime_identity_hash: hashString,
    expected_source_hash_bundle_hash: hashString,
    expected_retrieval_packet_hash: nullableHashString,
    expected_prompt_packet_hash: hashString,
    expected_output_schema_id: stringId,
    expected_prior_role_artifact_hashes: hashArray,
    expected_final_artifact_hash: nullableHashString,
    observed_runtime_identity_hash: hashString,
    observed_source_hash_bundle_hash: hashString,
    observed_retrieval_packet_hash: nullableHashString,
    observed_prompt_packet_hash: hashString,
    observed_output_schema_id: stringId,
    observed_prior_role_artifact_hashes: hashArray,
    observed_output_hash: hashString,
    admission_status: runtimeAdmissionStatusSchema,
    admission_identity: admissionIdentityObject,
    admission_identity_hash: hashString,
    admitted_artifact_ref: nullableNonLegacyFunctionalRef,
    admitted_artifact_hash: nullableHashString,
    issue_codes: stringArray,
    warning_codes: stringArray,
  },
  allOf: [
    {
      if: { properties: { admission_scope: { const: 'final' } }, required: ['admission_scope'] },
      then: {
        properties: {
          expected_prior_role_artifact_hashes: nonEmptyHashArray,
          observed_prior_role_artifact_hashes: nonEmptyHashArray,
          expected_final_artifact_hash: hashString,
        },
      },
    },
    {
      if: { properties: { admission_status: { const: 'admitted' } }, required: ['admission_status'] },
      then: {
        properties: {
          admitted_artifact_ref: nonLegacyFunctionalRef,
          admitted_artifact_hash: hashString,
          issue_codes: { type: 'array', maxItems: 0 },
        },
      },
    },
    {
      if: { properties: { admission_status: { const: 'rejected' } }, required: ['admission_status'] },
      then: {
        properties: {
          issue_codes: { type: 'array', minItems: 1, items: stringId },
        },
      },
    },
  ],
} as const;

export const admitPaperImplementationRuntimeArtifactRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'admission_scope',
    'admission_policy_id',
    'admission_policy_version',
    'expected_runtime_identity_hash',
    'expected_source_hash_bundle_hash',
    'expected_retrieval_packet_hash',
    'expected_prompt_packet_hash',
    'expected_output_schema_id',
    'expected_prior_role_artifact_hashes',
    'expected_final_artifact_hash',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    admission_record_id: nullableStringId,
    admission_scope: runtimeAdmissionScopeSchema,
    admission_policy_id: stringId,
    admission_policy_version: stringId,
    expected_runtime_identity_hash: hashString,
    expected_source_hash_bundle_hash: hashString,
    expected_retrieval_packet_hash: nullableHashString,
    expected_prompt_packet_hash: hashString,
    expected_output_schema_id: stringId,
    expected_prior_role_artifact_hashes: hashArray,
    expected_final_artifact_hash: nullableHashString,
  },
  allOf: [
    {
      if: { properties: { admission_scope: { const: 'role' } }, required: ['admission_scope'] },
      then: {
        properties: {
          expected_final_artifact_hash: { type: 'null' },
        },
      },
    },
    {
      if: { properties: { admission_scope: { const: 'final' } }, required: ['admission_scope'] },
      then: {
        properties: {
          expected_prior_role_artifact_hashes: nonEmptyHashArray,
          expected_final_artifact_hash: hashString,
        },
      },
    },
  ],
} as const;

export const listPaperImplementationRuntimeArtifactsQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slot_id: stringId,
    artifact_scope: runtimeArtifactScopeSchema,
  },
} as const;

export const listPaperImplementationRuntimeAdmissionRecordsQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    runtime_artifact_id: stringId,
    admission_scope: runtimeAdmissionScopeSchema,
  },
} as const;

export const runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationTraceIntegrityRoleOutput:
      paperImplementationTraceIntegrityRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'reviewed_statement_packet_ref',
    'reviewed_statement_packet_hash',
    'reviewed_statement_refs',
    'source_refs',
    'source_hashes',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    reviewed_statement_packet_ref: nonLegacyFunctionalRef,
    reviewed_statement_packet_hash: hashString,
    reviewed_statement_refs: nonLegacyFunctionalRefArray,
    reviewed_statement_packets: {
      type: 'array',
      items: paperImplementationTraceIntegrityReviewedStatementInputSchema,
    },
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    source_packets: {
      type: 'array',
      items: paperImplementationTraceIntegritySourcePacketInputSchema,
    },
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: traceIntegrityRoleOutputsBySlotSchema,
    codex_role_outputs: traceIntegrityRoleOutputsBySlotSchema,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    {
      if: { properties: { execution_mode: { const: 'mocked_llm' } }, required: ['execution_mode'] },
      then: {
        required: ['mocked_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'codex_assisted' } }, required: ['execution_mode'] },
      then: {
        required: ['codex_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'provider_llm' } }, required: ['execution_mode'] },
      then: {
        properties: {
          mocked_role_outputs: false,
          codex_role_outputs: false,
        },
      },
    },
  ],
} as const;

export const runPaperImplementationP1RuntimeReviewRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationP1RuntimeReviewRoleOutput:
      paperImplementationP1RuntimeReviewRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: p1RuntimeReviewRoleOutputsBySlotSchema,
    codex_role_outputs: p1RuntimeReviewRoleOutputsBySlotSchema,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    {
      if: { properties: { execution_mode: { const: 'mocked_llm' } }, required: ['execution_mode'] },
      then: {
        required: ['mocked_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'codex_assisted' } }, required: ['execution_mode'] },
      then: {
        required: ['codex_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'provider_llm' } }, required: ['execution_mode'] },
      then: {
        properties: {
          mocked_role_outputs: false,
          codex_role_outputs: false,
        },
      },
    },
  ],
} as const;

export const runPaperImplementationResultAnalysisRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationResultAnalysisRoleOutput:
      paperImplementationResultAnalysisRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: resultAnalysisRoleOutputsBySlotSchema,
    codex_role_outputs: resultAnalysisRoleOutputsBySlotSchema,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    {
      if: { properties: { execution_mode: { const: 'mocked_llm' } }, required: ['execution_mode'] },
      then: {
        required: ['mocked_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'codex_assisted' } }, required: ['execution_mode'] },
      then: {
        required: ['codex_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'provider_llm' } }, required: ['execution_mode'] },
      then: {
        properties: {
          mocked_role_outputs: false,
          codex_role_outputs: false,
        },
      },
    },
  ],
} as const;

export const runPaperImplementationExperimentPlanningRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationExperimentPlanningRoleOutput:
      paperImplementationExperimentPlanningRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    source_context_packets: {
      type: 'array',
      items: paperImplementationExperimentPlanningSourceContextPacketSchema,
    },
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: experimentPlanningRoleOutputsBySlotSchema,
    codex_role_outputs: experimentPlanningRoleOutputsBySlotSchema,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    {
      if: { properties: { execution_mode: { const: 'mocked_llm' } }, required: ['execution_mode'] },
      then: {
        required: ['mocked_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'codex_assisted' } }, required: ['execution_mode'] },
      then: {
        required: ['codex_role_outputs'],
      },
    },
    {
      if: { properties: { execution_mode: { const: 'provider_llm' } }, required: ['execution_mode'] },
      then: {
        properties: {
          mocked_role_outputs: false,
          codex_role_outputs: false,
        },
      },
    },
  ],
} as const;
