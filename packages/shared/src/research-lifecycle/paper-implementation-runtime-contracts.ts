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
  PAPER_IMPLEMENTATION_BASELINE_GAP_STATUSES,
  PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_KINDS,
  PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TYPES,
  type PaperImplementationBaselineGapStatus,
  type PaperImplementationFeasibilityProbeKind,
  type PaperImplementationValidationCostClass,
  type PaperImplementationValidationCycleType,
} from './paper-implementation-validation-contracts.js';
import {
  PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES,
  type PaperImplementationMotiveFreshnessStatus,
} from './paper-implementation-motive-contracts.js';
import {
  PAPER_IMPLEMENTATION_CLAIM_STRENGTHS,
  type PaperImplementationClaimStrength,
} from './paper-implementation-trace-contracts.js';
import {
  PAPER_IMPLEMENTATION_CLAIM_TYPES,
  PAPER_IMPLEMENTATION_DOSSIER_STATUSES,
  type PaperImplementationClaimType,
  type PaperImplementationDossierStatus,
} from './paper-implementation-result-claim-dossier-contracts.js';
import {
  PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS,
  type PaperImplementationDebateComplexityTier,
} from './paper-implementation-debate-complexity-shadow.js';

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
// v2 (T-124 S3-α2): the template now instructs each role to emit its structured
// section — support_mapper_map → per_statement_support_map, skeptic_challenge →
// challenge_findings, support_mapper_reconcile → finding_dispositions,
// arbiter_final → coverage. Registry entry: .ai/llm-config/registry/prompt_templates.yaml.
export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION =
  'v2' as const;
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
export const PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID =
  'route_architecture.route_candidates' as const;
export const PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID =
  'route_skeptic_review.route_risk_critique' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID =
  'validation_cycle_planning.cycle_candidates' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID =
  'feasibility_planning.probe_plan_candidates' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID =
  'cross_board_synthesis.merge_split_reuse_scenarios' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID =
  'evidence_board_curation.binding_gap_candidates' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID =
  'motive_decomposition.draft_assertion_candidates' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID =
  'motive_evolution.evolution_decision_support' as const;
export const PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID =
  'paper-implementation.route-architecture.route-candidates.v1' as const;
export const PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID =
  'paper-implementation.route-skeptic-review.route-risk-critique.v1' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID =
  'paper-implementation.validation-cycle-planning.cycle-candidates.v1' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID =
  'paper-implementation.feasibility-planning.probe-plan-candidates.v1' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID =
  'paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID =
  'paper-implementation.evidence-board-curation.binding-gap-candidates.v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID =
  'paper-implementation.motive-decomposition.draft-assertion-candidates.v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID =
  'paper-implementation.motive-evolution.evolution-decision-support.v1' as const;

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
export const PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROMPT_TEMPLATE_ID =
  'paper-implementation-route-architecture-route-candidates' as const;
export const PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROMPT_TEMPLATE_ID =
  'paper-implementation-route-skeptic-review-route-risk-critique' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROMPT_TEMPLATE_ID =
  'paper-implementation-validation-cycle-planning-cycle-candidates' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_ID =
  'paper-implementation-feasibility-planning-probe-plan-candidates' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_ID =
  'paper-implementation-cross-board-synthesis-merge-split-reuse-scenarios' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_ID =
  'paper-implementation-evidence-board-curation-binding-gap-candidates' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_ID =
  'paper-implementation-motive-decomposition-draft-assertion-candidates' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID =
  'paper-implementation-motive-evolution-decision-support' as const;
// T-124 G4.5 Fix 1: v2 adds source-body (source_context_packets) handling and
// target Create*Request schema guidance to the back-half slot prompts.
// T-124 G4.6: v3 — the model proposes typed SEMANTIC content blocks only
// (interpretation/reliability/claim_implications; claim_proposal /
// dossier_proposal); the runtime service assembles the Create*Request
// deterministically from the request context, so all id/envelope transcription
// guidance is removed (run 009/010/011 envelope-echo signature).
// T-124 G5 FIX-A items 4 / 12: v4 strengthens the claim-boundary support
// discipline (support_refs MUST cite REU evidence refs one-by-one; the service
// never endorses evidence for the model), the dossier disposition channels
// (reopen_condition / abandon_reason), and the result-analysis assertion-ref
// discipline (supports/challenges_assertion_refs carry argument-assertion refs,
// never source-bundle evidence refs).
export const PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION = 'v4' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_VERSION = 'v4' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_PROMPT_TEMPLATE_VERSION = 'v1' as const;
// v2 (T-133 D-133-1): the skeptic system prompt teaches the role_status vs
// recommended_disposition split — fixable input gaps are blocking findings on a
// PASSED critique with disposition=revise; role_status='blocked' is reserved for
// "the critique itself cannot be produced". Architecture prompt text unchanged
// (the version labels the route-planning template family shared by both slots).
export const PAPER_IMPLEMENTATION_ROUTE_PLANNING_PROMPT_TEMPLATE_VERSION = 'v2' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROMPT_TEMPLATE_VERSION = 'v1' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_VERSION = 'v1' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_VERSION = 'v1' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_VERSION = 'v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_VERSION = 'v1' as const;
// v2 (T-124 S3-β1): provider_llm rounds now instruct the roles to emit the
// wire encoding (designed_option_entries / decision_option_entries arrays with
// unique option_key) plus explicit result-status invariants; v1 prompts left
// the structure implicit and, combined with the strict-mode-degenerate map
// schemas, made options-proposing outputs deterministically fail schema
// validation (gs001-lora-live-004).
// T-124 G4.5 Fix 3: v3 adds explicit verbatim-echo guidance for the designer's
// reviewed-motive / cited refs (keep version_id and title_card_id exactly as the
// request supplied them — do not invent a version pin) and reinforces the
// challenger's mandatory wire surface (side-effect guards + challenge_check
// invariant), after the run 008/009 ref-echo drift and run 010 challenger
// SCHEMA_VALIDATION_FAILED signatures.
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION = 'v3' as const;

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
export const PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID =
  'route_architecture.route_candidate_designer' as const;
export const PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID =
  'route_skeptic_review.independent_route_critic' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID =
  'validation_cycle_planning.cycle_candidate_designer' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID =
  'feasibility_planning.probe_plan_designer' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID =
  'cross_board_synthesis.merge_split_reuse_scenario_designer' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID =
  'evidence_board_curation.binding_gap_candidate_curator' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID =
  'motive_decomposition.draft_assertion_candidate_designer' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID =
  'motive_evolution.evolution_option_designer' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID =
  'motive_evolution.evolution_risk_challenger' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_SLOT_IDS = [
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
] as const;
export type PaperImplementationExperimentPlanningRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_SLOT_IDS)[number];
export const PAPER_IMPLEMENTATION_ROUTE_PLANNING_ROLE_SLOT_IDS = [
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
] as const;
export type PaperImplementationRoutePlanningRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_ROUTE_PLANNING_ROLE_SLOT_IDS)[number];
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_SLOT_IDS = [
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
] as const;
export type PaperImplementationMotiveEvolutionRoleSlotId =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_SLOT_IDS)[number];
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationResultAnalysisRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationResultAnalysisArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID =
  'PaperImplementationScientificClosureProposalArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationResultAnalysisRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationExperimentPlanningRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationExperimentPlanningArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationExperimentPlanningRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_ROUTE_PLANNING_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationRoutePlanningRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_ROUTE_PLANNING_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationRoutePlanningArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationRoutePlanningRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationValidationCyclePlanningRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationValidationCyclePlanningArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationValidationCyclePlanningRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationFeasibilityPlanningRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationFeasibilityPlanningArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationFeasibilityPlanningRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationCrossBoardSynthesisRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationCrossBoardSynthesisArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationCrossBoardSynthesisRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationEvidenceBoardCurationRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationEvidenceBoardCurationArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationEvidenceBoardCurationRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationMotiveDecompositionRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationMotiveDecompositionArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationMotiveDecompositionRuntimeRequest@v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_ROLE_OUTPUT_SCHEMA_ID =
  'PaperImplementationMotiveEvolutionRoleArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_FINAL_OUTPUT_SCHEMA_ID =
  'PaperImplementationMotiveEvolutionArtifact@v1' as const;
export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION =
  'RunPaperImplementationMotiveEvolutionRuntimeRequest@v1' as const;

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

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_SUPPORT_KINDS = [
  'direct',
  'partial',
  'background_only',
  'conflicting',
  'missing',
] as const;
export type PaperImplementationTraceIntegritySupportKind =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_SUPPORT_KINDS)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_FINDING_SEVERITIES = [
  'blocker',
  'major',
  'minor',
] as const;
export type PaperImplementationTraceIntegrityFindingSeverity =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_FINDING_SEVERITIES)[number];

export const PAPER_IMPLEMENTATION_TRACE_INTEGRITY_FINDING_DISPOSITIONS = [
  'accepted_blocker',
  'resolved_with_refs',
  'rebutted_with_refs',
  'context_gap_blocker',
] as const;
export type PaperImplementationTraceIntegrityFindingDispositionKind =
  (typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_FINDING_DISPOSITIONS)[number];

export interface PaperImplementationTraceIntegrityStatementSupportEntry {
  statement_ref: TopicSelectionFunctionalRef;
  support_kind: PaperImplementationTraceIntegritySupportKind;
  cited_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationTraceIntegrityChallengeFinding {
  finding_id: string;
  severity: PaperImplementationTraceIntegrityFindingSeverity;
  /** Trace-integrity blocker taxonomy code carried into the final blocker set when the finding is accepted. */
  blocker_code: string;
  target_statement_ref: TopicSelectionFunctionalRef;
  cited_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationTraceIntegrityFindingDisposition {
  finding_id: string;
  disposition: PaperImplementationTraceIntegrityFindingDispositionKind;
  cited_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationTraceIntegrityCoverage {
  statement_refs: TopicSelectionFunctionalRef[];
  finding_ids: string[];
}

// T-124 S3-α2 (review N2): the four optional structured fields below are the
// role-specific deepened contract — the runtime service requires the field that
// matches the executing role (support map / findings / dispositions / coverage)
// for BOTH passed and blocked outputs, and validates it against the bounded
// retrieval packet (refs ⊆ packet, one disposition per finding, full coverage).
export interface PaperImplementationTraceIntegrityRoleOutput {
  role_slot_id: PaperImplementationTraceIntegrityDebateRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  reviewed_statement_refs: TopicSelectionFunctionalRef[];
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  per_statement_support_map?: PaperImplementationTraceIntegrityStatementSupportEntry[];
  challenge_findings?: PaperImplementationTraceIntegrityChallengeFinding[];
  finding_dispositions?: PaperImplementationTraceIntegrityFindingDisposition[];
  coverage?: PaperImplementationTraceIntegrityCoverage;
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

/**
 * T-124 D2-core: the enforced debate-tier decision recorded into the runtime
 * artifact execution context. `base_tier` is the deterministic preflight
 * decision (pure function of recomputable inputs, identity-pinned via
 * `tier_inputs_hash`); `effective_tier` is the tier actually in effect after
 * any deterministic mid-run upgrade (light + skeptic findings → standard).
 */
export interface PaperImplementationDebateTierExecutionContext {
  debate_policy_id: string;
  debate_policy_version: string;
  base_tier: PaperImplementationDebateComplexityTier;
  effective_tier: PaperImplementationDebateComplexityTier;
  tier_upgraded: boolean;
  tier_inputs_hash: string;
  tier_rationale_codes: string[];
  /** Final artifacts additionally record the executed role slot ids in order. */
  executed_role_plan?: string[];
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
  /** T-124 D2-core (additive): the enforced tier decision + executed role plan. */
  debate_execution?: PaperImplementationDebateTierExecutionContext | null;
}

export interface RunPaperImplementationTraceIntegrityDebateRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  /**
   * D9 resume contract (T-124 S3-α1): continue an interrupted run under the SAME
   * run identity. The service reuses this run's already-admitted role artifacts
   * (same retrieval packet hash + profile/prompt identity, admission re-checked)
   * as the executed prefix and only invokes the remaining roles; newly executed
   * roles take the run's next call indexes. Technical continuation only — never
   * a semantic fallback or provider response reuse. When set, `run_id` must be
   * absent or equal to this value.
   */
  resume_from_run_id?: string | null;
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
  /**
   * D2-core debate-tier budget cap: the maximum provider calls this run may
   * reserve. `null`/omitted = unbounded (the coordinator path never sets it, so
   * coordinator-driven debates stay unbounded — coordinator zero-change). When
   * set below the decided tier's upgrade-safe reservation, the debate fails
   * closed at preflight with a zero-provider-call `TIER_BUDGET_INSUFFICIENT`.
   */
  provider_call_budget?: number | null;
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

/**
 * T-124 G4.6: typed semantic content the claim-boundary adjudicator proposes.
 * The runtime service deterministically assembles the CreateClaimCandidateRequest
 * from this block plus the request-context structural refs (claim_candidate /
 * result_interpretation_packet / trace_manifest / claim_trace_packet /
 * human_confirmation_record source refs) — the LLM never transcribes structural
 * ids into a request envelope again (run 009/010/011 envelope-echo signature).
 */
export interface PaperImplementationClaimCandidateProposalScope {
  population_scope: string;
  method_scope: string;
  dataset_scope: string;
  metric_scope: string;
  negative_scope_notes: string[];
  excluded_scope_notes: string[];
}

export interface PaperImplementationClaimCandidateProposal {
  claim_type: PaperImplementationClaimType;
  claim_statement: string;
  claim_strength: PaperImplementationClaimStrength;
  support_refs: TopicSelectionFunctionalRef[];
  challenge_refs: TopicSelectionFunctionalRef[];
  scope: PaperImplementationClaimCandidateProposalScope;
  boundary_rationale: string;
  forbidden_overclaims: string[];
  hidden_counter_evidence_refs: TopicSelectionFunctionalRef[];
  required_followup_refs: TopicSelectionFunctionalRef[];
}

/**
 * T-124 G4.6: typed semantic content the dossier-readiness adjudicator proposes.
 * The runtime service deterministically assembles the
 * CreateImplementationDossierRequest from this block plus the request-context
 * structural refs (target implementation_dossier / result_interpretation_packet /
 * claim_candidate / claim_trace_packet / trace_manifest / gate_result source refs).
 */
export interface PaperImplementationDossierReadinessProposal {
  dossier_status: PaperImplementationDossierStatus;
  experiment_limitations: string[];
  failed_run_refs: TopicSelectionFunctionalRef[];
  inconclusive_run_refs: TopicSelectionFunctionalRef[];
  negative_result_refs: TopicSelectionFunctionalRef[];
  excluded_stale_or_invalidated_evidence_refs: TopicSelectionFunctionalRef[];
  admitted_claim_refs: TopicSelectionFunctionalRef[];
  rejected_claim_refs: TopicSelectionFunctionalRef[];
  forbidden_overclaims: string[];
  claim_ceiling: PaperImplementationClaimStrength;
  readiness_blocker_refs: TopicSelectionFunctionalRef[];
  readiness_warning_refs: TopicSelectionFunctionalRef[];
  readiness_notes: string[];
  // T-124 G5 FIX-A item 1: additive disposition channels for the non-ready
  // dossier states. `parked_with_reopen_condition` carries the concrete reopen
  // condition; `abandoned_with_trace` carries the abandon reason. Additive and
  // nullable so existing ready/draft proposals need not supply them; the runtime
  // service fails closed (retryable) when the disposition demands the field and
  // the adjudicator omitted it, so an impossible-to-materialize disposition
  // never wastes a Domain Gate spend.
  reopen_condition?: string | null;
  abandon_reason?: string | null;
}

export interface PaperImplementationP1RuntimeReviewRoleOutput {
  role_slot_id: PaperImplementationP1RuntimeReviewRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  // T-124 G4.6: the final adjudicator emits typed SEMANTIC content only; the
  // runtime service assembles the Create*Request deterministically (the F5-1
  // `domain_gate_request_json` wire carrier for the domain-gate request is
  // retired for this slot). Exactly one of the two blocks applies per workflow.
  claim_proposal?: PaperImplementationClaimCandidateProposal | null;
  dossier_proposal?: PaperImplementationDossierReadinessProposal | null;
  scenario_outputs?: Record<string, unknown>[];
}

/**
 * T-124 S3 复审 F5-1 provider wire encoding of the P1 runtime-review role
 * output, narrowed by G4.6: only `scenario_outputs` (bare `{type:'object'}`
 * items, unrepresentable in OpenAI strict structured output) still travels as
 * opaque JSON strings. The former `domain_gate_request_json` carrier is retired —
 * the adjudicator's semantic content is fully typed (`claim_proposal` /
 * `dossier_proposal`) and rides the wire directly; the runtime service
 * assembles the Create*Request deterministically. Non-provider modes
 * (mocked/codex) keep the canonical schema unchanged.
 */
export type PaperImplementationP1RuntimeReviewRoleWireOutput =
  Omit<PaperImplementationP1RuntimeReviewRoleOutput, 'scenario_outputs'> & {
    scenario_output_jsons?: string[];
  };

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

/**
 * T-124 G4.5 Fix 1 (B3-analog): a caller-injected source-body packet for the
 * back-half domain-gate slots (result-analysis / claim-boundary /
 * dossier-readiness). Mirrors the lane-A `source_context_packet` shape but adds
 * a `source_hash` hash fence — the runtime asserts each packet's `source_hash`
 * equals the request-declared `source_hashes` entry for the same `source_ref`
 * (the B3 discipline: injected bodies are fenced to a declared, hashed source).
 * Without a body carrier the slot only sees refs/hashes and the LLM cannot
 * produce a complete Create*Request (the run 009/010 content-starvation signature
 * `SOURCE_BODIES_NOT_INCLUDED_IN_REQUEST`).
 */
export interface PaperImplementationBackHalfSourceContextPacket {
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
  // T-124 G5 FIX-A item 6 (gs-003 GAP-R4): when the packet mirrors a
  // materialized ResultInterpretationPacket read-back, the runner injects that
  // packet's structural accounting refs here so the dossier assembly can
  // deterministically collect every disclosed negative / inconclusive / failed /
  // stale run ref into the dossier's mandatory ledger slots. Additive/optional
  // (structural read-back of an already gate-validated packet — service-owned,
  // not model content); absent for non-packet bodies.
  failed_run_refs?: TopicSelectionFunctionalRef[];
  inconclusive_run_refs?: TopicSelectionFunctionalRef[];
  negative_result_refs?: TopicSelectionFunctionalRef[];
  stale_or_invalidated_evidence_refs?: TopicSelectionFunctionalRef[];
}

export interface RunPaperImplementationP1RuntimeReviewRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  /**
   * D9 resume contract (T-124 S3-α1): same semantics as the trace-integrity
   * debate — reuse this run's admitted role artifacts (same source bundle hash +
   * profile/prompt identity) as the executed prefix and continue from the first
   * missing role. When set, `run_id` must be absent or equal to this value.
   */
  resume_from_run_id?: string | null;
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
  // T-124 G4.5 Fix 1: optional caller-injected source bodies (hash-fenced to
  // source_refs/source_hashes). Additive; live provider runs supply these so the
  // adjudicator can emit a complete domain_gate_request.
  source_context_packets?: PaperImplementationBackHalfSourceContextPacket[];
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

/**
 * T-124 G4.6: typed semantic content of the interpretation-scenario builder.
 * These three blocks are the SEMANTIC half of the ResultInterpretationPacket;
 * the runtime service deterministically assembles the
 * CreateResultInterpretationPacketRequest from them plus the request-context
 * structural refs (target validation_cycle / result_interpretation_packet /
 * trace_manifest / run_evidence_unit / result_validation_report / metric /
 * experiment_plan_light source refs). The LLM never transcribes structural ids
 * into a request envelope again (run 009/010/011 envelope-echo signature).
 */
export interface PaperImplementationResultAnalysisInterpretationSummary {
  result_summary: string;
  supports_assertion_refs: TopicSelectionFunctionalRef[];
  challenges_assertion_refs: TopicSelectionFunctionalRef[];
  unexpected_findings: string[];
  failed_run_refs: TopicSelectionFunctionalRef[];
  inconclusive_run_refs: TopicSelectionFunctionalRef[];
  stale_or_invalidated_evidence_refs: TopicSelectionFunctionalRef[];
  failed_runs_accounted_for: boolean;
  inconclusive_runs_accounted_for: boolean;
  exploratory_confirmatory_separated: boolean;
}

export interface PaperImplementationResultAnalysisReliabilityAssessment {
  failed_runs_retained: boolean;
  confound_refs: TopicSelectionFunctionalRef[];
  limitation_refs: TopicSelectionFunctionalRef[];
  reliability_notes: string[];
}

export interface PaperImplementationResultAnalysisClaimImplications {
  allowed_claim_ceiling: PaperImplementationClaimStrength;
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
  // T-124 G4.6: the role emits typed SEMANTIC content only; the runtime service
  // assembles the CreateResultInterpretationPacketRequest deterministically.
  // The F5-1 `domain_gate_request_json` wire carrier is retired for this slot —
  // every field is strict-representable, so provider/mocked/codex all share
  // this one canonical schema. Passed-branch completeness (all three blocks
  // non-null) is enforced server-side by the runtime semantic check.
  interpretation?: PaperImplementationResultAnalysisInterpretationSummary | null;
  reliability?: PaperImplementationResultAnalysisReliabilityAssessment | null;
  claim_implications?: PaperImplementationResultAnalysisClaimImplications | null;
}

export interface PaperImplementationScientificComparisonFactRefV1 {
  comparison_fact_id: string;
  comparison_fact_hash: string;
}

export interface PaperImplementationScientificEvidenceRefV1 {
  ordinal: number;
  run_evidence_unit_id: string;
  content_hash: string;
}

/**
 * Server-supplied factual context used to version a ResultAnalysis final
 * artifact for scientific closure. Closure never trusts this copy: the exact
 * proposal, REUs, report, protocol and primary fact are reread transactionally.
 */
export interface PaperImplementationScientificClosureContextV1 {
  schema_version: 'PaperImplementationScientificClosureContext@v1';
  validation_cycle_id: string;
  closure_watermark_hash: string;
  primary_comparison_fact_ref: PaperImplementationScientificComparisonFactRefV1;
  ordered_evidence_refs: PaperImplementationScientificEvidenceRefV1[];
}

/**
 * Public request face for producing a scientific-closure proposal. The caller
 * may pin the expected Cycle watermark, but cannot provide scientific facts or
 * evidence bodies. The backend resolves those transactionally from the local
 * evidence store before invoking the runtime role.
 */
export interface PaperImplementationScientificClosureIntentV1 {
  schema_version: 'PaperImplementationScientificClosureIntent@v1';
  expected_closure_watermark_hash: string;
}

export interface PaperImplementationScientificClosureProposalV1
extends Omit<PaperImplementationScientificClosureContextV1, 'schema_version'> {
  schema_version: 'PaperImplementationScientificClosureProposal@v1';
  interpretation_summary: string;
  reliability_assessment: PaperImplementationResultAnalysisReliabilityAssessment;
  limitations: {
    limitation_refs: TopicSelectionFunctionalRef[];
    reliability_notes: string[];
  };
  claim_ceiling: PaperImplementationClaimStrength;
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

export interface PaperImplementationResultAnalysisScientificClosureArtifact
extends PaperImplementationResultAnalysisArtifact {
  scientific_closure_proposal: PaperImplementationScientificClosureProposalV1 | null;
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
  // T-124 G4.5 Fix 1: optional caller-injected source bodies (hash-fenced to
  // source_refs/source_hashes) for ordinary ResultAnalysis runs. Scientific
  // closure intent forbids this field; the backend supplies authoritative
  // packets after resolving the local evidence store.
  source_context_packets?: PaperImplementationBackHalfSourceContextPacket[];
  scientific_closure_intent?: PaperImplementationScientificClosureIntentV1;
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

export type PaperImplementationRoutePlanningSlotId =
  | typeof PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID
  | typeof PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID;

export const PAPER_IMPLEMENTATION_ROUTE_BASELINE_GAP_STATUSES = [
  'satisfied',
  'partial',
  'missing',
  'unknown',
] as const;
export type PaperImplementationRouteBaselineGapStatus =
  (typeof PAPER_IMPLEMENTATION_ROUTE_BASELINE_GAP_STATUSES)[number];

export const PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS = [
  'scope_boundary',
  'compute_budget',
  'dataset_metric_alignment',
  'baseline_control',
  'traceability',
  'confirmatory_exploratory_separation',
] as const;
export type PaperImplementationRouteSkepticRiskDimension =
  (typeof PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS)[number];

// T-133 D-133-1/2 (the S3 orthogonal-axes split, isomorphic with the curation
// disposition below): for the route skeptic, `role_status` answers "could the
// role produce its critique" (`blocked` = the OUTPUT itself is unusable —
// unreadable/missing inputs, technical failure), while `recommended_disposition`
// is the verdict on the reviewed INPUT when the critique is usable:
//   - proceed: no blocking finding — the lane auto-advances;
//   - revise:  fixable input gaps expressed as blocking findings on a PASSED
//              critique; the coordinator parks the passed final as
//              waiting_review (revise-and-retry via payload override +
//              re-advance), never a terminal block;
//   - park/abandon: verdicts beyond revision — the same waiting_review park.
// A passed skeptic final legitimately carries the blocking findings' codes in
// `blocker_codes` as the substance of the critique (audit entities), NOT as
// output-unusable markers; only `role_status='blocked'` makes the final blocked
// (single-trigger derivation, route-planning runtime service). The runtime
// deterministically clamps `proceed` to `revise` when blocking findings are
// present (D-133-2: the LLM can only err toward human review, never past it),
// and downstream consumption additionally requires `proceed`
// (`requireProceedRouteSkepticFinalArtifact`) so a parked verdict can never be
// consumed by direct runtime-route callers.
export const PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_DISPOSITIONS = [
  'proceed',
  'revise',
  'park',
  'abandon',
] as const;
export type PaperImplementationRouteSkepticDisposition =
  (typeof PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_DISPOSITIONS)[number];

export interface PaperImplementationRouteCandidateProposal {
  candidate_key: string;
  route_summary: string;
  expected_information_gain: string;
  baseline_gap_status: PaperImplementationRouteBaselineGapStatus;
  cited_source_refs: TopicSelectionFunctionalRef[];
  trace_refs: TopicSelectionFunctionalRef[];
  validation_signal_refs: TopicSelectionFunctionalRef[];
  dataset_refs: TopicSelectionFunctionalRef[];
  metric_refs: TopicSelectionFunctionalRef[];
  baseline_refs: TopicSelectionFunctionalRef[];
  code_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  scope_boundary: string;
  confirmatory_marker: boolean;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationRouteSkepticFinding {
  finding_id: string;
  risk_dimension: PaperImplementationRouteSkepticRiskDimension;
  severity: 'info' | 'warning' | 'blocking' | 'critical';
  summary: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  affected_candidate_keys: string[];
  required_revision_refs: TopicSelectionFunctionalRef[];
  blocks_route_progression: boolean;
}

export interface PaperImplementationRoutePlanningSourceContextPacket {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
}

export interface PaperImplementationRoutePlanningRoleOutput {
  role_slot_id: PaperImplementationRoutePlanningRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  route_candidate_proposals?: PaperImplementationRouteCandidateProposal[];
  reviewed_route_proposal_ref?: TopicSelectionFunctionalRef | null;
  reviewed_route_proposal_hash?: string | null;
  reviewed_candidate_keys?: string[];
  checked_dimensions?: PaperImplementationRouteSkepticRiskDimension[];
  risk_findings?: PaperImplementationRouteSkepticFinding[];
  recommended_disposition?: PaperImplementationRouteSkepticDisposition | null;
  no_queue_side_effect?: true;
}

export interface PaperImplementationRoutePlanningArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationRoutePlanningSlotId;
  workflow_type: 'route_architecture' | 'route_skeptic_review';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  route_candidate_proposals: PaperImplementationRouteCandidateProposal[];
  reviewed_route_proposal_ref: TopicSelectionFunctionalRef | null;
  reviewed_route_proposal_hash: string | null;
  reviewed_candidate_keys: string[];
  checked_dimensions: PaperImplementationRouteSkepticRiskDimension[];
  risk_findings: PaperImplementationRouteSkepticFinding[];
  recommended_disposition: PaperImplementationRouteSkepticDisposition | null;
  no_domain_gate_request: true;
  no_queue_side_effect: true;
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

export interface RunPaperImplementationRoutePlanningRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
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
  source_context_packets?: PaperImplementationRoutePlanningSourceContextPacket[];
  admitted_route_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  admitted_route_proposal_artifact_hash?: string | null;
  reviewed_candidate_keys?: string[];
  secondary_route_candidate_refs?: TopicSelectionFunctionalRef[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationRoutePlanningRoleSlotId,
    PaperImplementationRoutePlanningRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationRoutePlanningRoleSlotId,
    PaperImplementationRoutePlanningRoleOutput
  >>;
}

export type PaperImplementationValidationCyclePlanningSlotId =
  typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID;
export type PaperImplementationValidationCyclePlanningRoleSlotId =
  typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID;

export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_INFORMATION_GAIN_LEVELS = [
  'low',
  'medium',
  'high',
] as const;
export type PaperImplementationValidationCyclePlanningInformationGainLevel =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_INFORMATION_GAIN_LEVELS)[number];

export interface PaperImplementationValidationCyclePlanningSourceContextPacket {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
}

export interface PaperImplementationValidationCycleCandidateCriteria {
  pass_conditions: string[];
  fail_conditions: string[];
  inconclusive_conditions: string[];
  stop_conditions: string[];
  minimum_artifacts_required: string[];
}

export interface PaperImplementationValidationCycleCandidateBudgetEnvelope {
  budget_ref?: TopicSelectionFunctionalRef | null;
  iteration_budget_ref?: TopicSelectionFunctionalRef | null;
  retry_budget: number;
  max_runtime?: string | null;
  max_compute?: string | null;
  max_human_review_count?: number | null;
}

export interface PaperImplementationValidationCycleCandidateProposal {
  candidate_key: string;
  reviewed_route_candidate_key: string;
  target_ref: TopicSelectionFunctionalRef;
  target_frame_summary: string;
  cycle_type: PaperImplementationValidationCycleType;
  trigger_refs: TopicSelectionFunctionalRef[];
  validation_question: string;
  assumptions_under_test: string[];
  assertion_refs_under_test: TopicSelectionFunctionalRef[];
  decision_if_pass: string;
  decision_if_fail: string;
  decision_if_inconclusive: string;
  expected_information_gain: PaperImplementationValidationCyclePlanningInformationGainLevel;
  criteria: PaperImplementationValidationCycleCandidateCriteria;
  budget_envelope: PaperImplementationValidationCycleCandidateBudgetEnvelope;
  included_context_refs: TopicSelectionFunctionalRef[];
  trace_refs: TopicSelectionFunctionalRef[];
  confirmatory_marker: boolean;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationValidationCyclePlanningRoleOutput {
  role_slot_id: PaperImplementationValidationCyclePlanningRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  reviewed_route_proposal_ref?: TopicSelectionFunctionalRef | null;
  reviewed_route_proposal_hash?: string | null;
  reviewed_route_skeptic_artifact_ref?: TopicSelectionFunctionalRef | null;
  reviewed_route_skeptic_artifact_hash?: string | null;
  reviewed_candidate_keys?: string[];
  cycle_candidate_proposals?: PaperImplementationValidationCycleCandidateProposal[];
  no_domain_gate_request?: true;
  no_queue_side_effect?: true;
  no_validation_cycle_side_effect?: true;
}

export interface PaperImplementationValidationCyclePlanningArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationValidationCyclePlanningSlotId;
  workflow_type: 'validation_cycle_planning';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  reviewed_route_proposal_ref: TopicSelectionFunctionalRef | null;
  reviewed_route_proposal_hash: string | null;
  reviewed_route_skeptic_artifact_ref: TopicSelectionFunctionalRef | null;
  reviewed_route_skeptic_artifact_hash: string | null;
  reviewed_candidate_keys: string[];
  cycle_candidate_proposals: PaperImplementationValidationCycleCandidateProposal[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_validation_cycle_side_effect: true;
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

export interface RunPaperImplementationValidationCyclePlanningRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
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
  source_context_packets?: PaperImplementationValidationCyclePlanningSourceContextPacket[];
  admitted_route_proposal_artifact_ref: TopicSelectionFunctionalRef;
  admitted_route_proposal_artifact_hash: string;
  admitted_route_skeptic_artifact_ref: TopicSelectionFunctionalRef;
  admitted_route_skeptic_artifact_hash: string;
  reviewed_candidate_keys: string[];
  secondary_route_candidate_refs?: TopicSelectionFunctionalRef[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationValidationCyclePlanningRoleSlotId,
    PaperImplementationValidationCyclePlanningRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationValidationCyclePlanningRoleSlotId,
    PaperImplementationValidationCyclePlanningRoleOutput
  >>;
}

export type PaperImplementationFeasibilityPlanningSlotId =
  typeof PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID;
export type PaperImplementationFeasibilityPlanningRoleSlotId =
  typeof PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID;

export const PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_INFORMATION_GAIN_LEVELS = [
  'low',
  'medium',
  'high',
] as const;
export type PaperImplementationFeasibilityPlanningInformationGainLevel =
  (typeof PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_INFORMATION_GAIN_LEVELS)[number];

export interface PaperImplementationFeasibilityPlanningSourceContextPacket {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
}

export interface PaperImplementationFeasibilityBudgetEnvelope {
  budget_ref: TopicSelectionFunctionalRef;
  iteration_budget_ref?: TopicSelectionFunctionalRef | null;
  retry_budget: number;
  estimated_cost_class: PaperImplementationValidationCostClass;
  max_runtime?: string | null;
  max_compute?: string | null;
  max_human_review_count?: number | null;
}

export interface PaperImplementationFeasibilityProbePlanCandidateProposal {
  candidate_key: string;
  reviewed_cycle_candidate_key: string;
  reviewed_route_candidate_key: string;
  probe_kind: PaperImplementationFeasibilityProbeKind;
  probe_question: string;
  plan_summary: string;
  expected_information_gain: PaperImplementationFeasibilityPlanningInformationGainLevel;
  baseline_gap_status: PaperImplementationBaselineGapStatus;
  primary_metric_refs: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  budget_envelope: PaperImplementationFeasibilityBudgetEnvelope;
  stop_condition_refs: TopicSelectionFunctionalRef[];
  trace_refs: TopicSelectionFunctionalRef[];
  confirmatory_marker: boolean;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationFeasibilityPlanningRoleOutput {
  role_slot_id: PaperImplementationFeasibilityPlanningRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  blocker_codes: string[];
  warning_codes: string[];
  reviewed_validation_cycle_artifact_ref?: TopicSelectionFunctionalRef | null;
  reviewed_validation_cycle_artifact_hash?: string | null;
  reviewed_route_proposal_ref?: TopicSelectionFunctionalRef | null;
  reviewed_route_proposal_hash?: string | null;
  reviewed_route_skeptic_artifact_ref?: TopicSelectionFunctionalRef | null;
  reviewed_route_skeptic_artifact_hash?: string | null;
  reviewed_cycle_candidate_keys?: string[];
  reviewed_route_candidate_keys?: string[];
  probe_plan_candidate_proposals?: PaperImplementationFeasibilityProbePlanCandidateProposal[];
  no_domain_gate_request?: true;
  no_queue_side_effect?: true;
  no_feasibility_probe_side_effect?: true;
  no_experiment_plan_light_side_effect?: true;
  no_validation_cycle_side_effect?: true;
}

export interface PaperImplementationFeasibilityPlanningArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationFeasibilityPlanningSlotId;
  workflow_type: 'feasibility_planning';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  reviewed_validation_cycle_artifact_ref: TopicSelectionFunctionalRef | null;
  reviewed_validation_cycle_artifact_hash: string | null;
  reviewed_route_proposal_ref: TopicSelectionFunctionalRef | null;
  reviewed_route_proposal_hash: string | null;
  reviewed_route_skeptic_artifact_ref: TopicSelectionFunctionalRef | null;
  reviewed_route_skeptic_artifact_hash: string | null;
  reviewed_cycle_candidate_keys: string[];
  reviewed_route_candidate_keys: string[];
  probe_plan_candidate_proposals: PaperImplementationFeasibilityProbePlanCandidateProposal[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_feasibility_probe_side_effect: true;
  no_experiment_plan_light_side_effect: true;
  no_validation_cycle_side_effect: true;
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

export interface RunPaperImplementationFeasibilityPlanningRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
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
  source_context_packets?: PaperImplementationFeasibilityPlanningSourceContextPacket[];
  admitted_validation_cycle_artifact_ref: TopicSelectionFunctionalRef;
  admitted_validation_cycle_artifact_hash: string;
  admitted_route_proposal_artifact_ref: TopicSelectionFunctionalRef;
  admitted_route_proposal_artifact_hash: string;
  admitted_route_skeptic_artifact_ref: TopicSelectionFunctionalRef;
  admitted_route_skeptic_artifact_hash: string;
  reviewed_cycle_candidate_keys: string[];
  reviewed_route_candidate_keys: string[];
  secondary_route_candidate_refs?: TopicSelectionFunctionalRef[];
  secondary_validation_cycle_refs?: TopicSelectionFunctionalRef[];
  secondary_feasibility_probe_refs?: TopicSelectionFunctionalRef[];
  secondary_experiment_plan_light_refs?: TopicSelectionFunctionalRef[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationFeasibilityPlanningRoleSlotId,
    PaperImplementationFeasibilityPlanningRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationFeasibilityPlanningRoleSlotId,
    PaperImplementationFeasibilityPlanningRoleOutput
  >>;
}

export type PaperImplementationCrossBoardSynthesisSlotId =
  typeof PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID;
export type PaperImplementationCrossBoardSynthesisRoleSlotId =
  typeof PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID;

export const PAPER_IMPLEMENTATION_CROSS_BOARD_SCENARIO_KINDS = [
  'merge',
  'split',
  'reuse',
  'park',
  'reject',
] as const;
export type PaperImplementationCrossBoardScenarioKind =
  (typeof PAPER_IMPLEMENTATION_CROSS_BOARD_SCENARIO_KINDS)[number];

export const PAPER_IMPLEMENTATION_CROSS_BOARD_SCENARIO_DISPOSITIONS = [
  'viable_candidate',
  'blocked_missing_transfer_binding',
  'blocked_conflict_unresolved',
  'blocked_stale_or_untraced_context',
  'needs_domain_review',
] as const;
export type PaperImplementationCrossBoardScenarioDisposition =
  (typeof PAPER_IMPLEMENTATION_CROSS_BOARD_SCENARIO_DISPOSITIONS)[number];

export const PAPER_IMPLEMENTATION_CROSS_BOARD_RECOMMENDED_NEXT_GATES = [
  'cross_board_review',
  'evidence_transfer_binding_review',
  'motive_evolution_review',
  'portfolio_decision_review',
  'evidence_board_curation',
  'trace_repair',
  'none',
] as const;
export type PaperImplementationCrossBoardRecommendedNextGate =
  (typeof PAPER_IMPLEMENTATION_CROSS_BOARD_RECOMMENDED_NEXT_GATES)[number];

export interface PaperImplementationCrossBoardSourceContextPacket {
  source_ref: TopicSelectionFunctionalRef;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
}

export interface PaperImplementationCrossBoardAnchor {
  board_version_ref: TopicSelectionFunctionalRef;
  board_version_hash: string;
  motive_ref: TopicSelectionFunctionalRef;
  core_motive_version_ref: TopicSelectionFunctionalRef;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_hash: string;
  evidence_binding_refs: TopicSelectionFunctionalRef[];
  source_locator_refs: TopicSelectionFunctionalRef[];
  conflict_refs: TopicSelectionFunctionalRef[];
  challenge_refs: TopicSelectionFunctionalRef[];
  freshness_status: PaperImplementationMotiveFreshnessStatus;
}

export interface PaperImplementationCrossBoardReusePolicy {
  require_transfer_binding_for_viable_reuse: boolean;
  allow_blocked_reuse_without_transfer_binding: boolean;
}

export interface PaperImplementationCrossBoardScenarioProposal {
  scenario_key: string;
  scenario_kind: PaperImplementationCrossBoardScenarioKind;
  disposition: PaperImplementationCrossBoardScenarioDisposition;
  source_board_version_refs: TopicSelectionFunctionalRef[];
  source_board_version_hashes: string[];
  target_motive_refs: TopicSelectionFunctionalRef[];
  evidence_transfer_binding_refs: TopicSelectionFunctionalRef[];
  conflict_refs: TopicSelectionFunctionalRef[];
  challenge_refs: TopicSelectionFunctionalRef[];
  freshness_blockers: string[];
  source_locator_refs: TopicSelectionFunctionalRef[];
  expected_benefit: string;
  risk_codes: string[];
  blocker_codes: string[];
  warning_codes: string[];
  recommended_next_gate: PaperImplementationCrossBoardRecommendedNextGate;
}

export interface PaperImplementationCrossBoardSynthesisRoleOutput {
  role_slot_id: PaperImplementationCrossBoardSynthesisRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  reviewed_board_version_refs?: TopicSelectionFunctionalRef[];
  reviewed_conflict_refs?: TopicSelectionFunctionalRef[];
  reviewed_challenge_refs?: TopicSelectionFunctionalRef[];
  reviewed_evidence_transfer_binding_refs?: TopicSelectionFunctionalRef[];
  scenario_proposals?: PaperImplementationCrossBoardScenarioProposal[];
  blocker_codes: string[];
  warning_codes: string[];
  no_domain_gate_request?: true;
  no_queue_side_effect?: true;
  no_cross_board_review_side_effect?: true;
  no_evidence_transfer_binding_side_effect?: true;
  no_portfolio_mutation_side_effect?: true;
  no_motive_evolution_side_effect?: true;
}

export interface PaperImplementationCrossBoardSynthesisArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationCrossBoardSynthesisSlotId;
  workflow_type: 'cross_board_synthesis';
  target_ref: TopicSelectionFunctionalRef;
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  board_anchors: PaperImplementationCrossBoardAnchor[];
  reviewed_board_version_refs: TopicSelectionFunctionalRef[];
  reviewed_conflict_refs: TopicSelectionFunctionalRef[];
  reviewed_challenge_refs: TopicSelectionFunctionalRef[];
  reviewed_evidence_transfer_binding_refs: TopicSelectionFunctionalRef[];
  scenario_proposals: PaperImplementationCrossBoardScenarioProposal[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_cross_board_review_side_effect: true;
  no_evidence_transfer_binding_side_effect: true;
  no_portfolio_mutation_side_effect: true;
  no_motive_evolution_side_effect: true;
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

export interface RunPaperImplementationCrossBoardSynthesisRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
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
  source_context_packets?: PaperImplementationCrossBoardSourceContextPacket[];
  board_anchors: PaperImplementationCrossBoardAnchor[];
  reviewed_board_version_refs: TopicSelectionFunctionalRef[];
  reviewed_conflict_refs: TopicSelectionFunctionalRef[];
  reviewed_challenge_refs: TopicSelectionFunctionalRef[];
  evidence_transfer_binding_refs: TopicSelectionFunctionalRef[];
  reuse_policy: PaperImplementationCrossBoardReusePolicy;
  secondary_cross_board_review_refs?: TopicSelectionFunctionalRef[];
  secondary_evidence_transfer_binding_refs?: TopicSelectionFunctionalRef[];
  secondary_motive_assertion_refs?: TopicSelectionFunctionalRef[];
  secondary_evidence_binding_refs?: TopicSelectionFunctionalRef[];
  secondary_route_refs?: TopicSelectionFunctionalRef[];
  secondary_experiment_refs?: TopicSelectionFunctionalRef[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationCrossBoardSynthesisRoleSlotId,
    PaperImplementationCrossBoardSynthesisRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationCrossBoardSynthesisRoleSlotId,
    PaperImplementationCrossBoardSynthesisRoleOutput
  >>;
}

export type PaperImplementationEvidenceBoardCurationSlotId =
  typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID;
export type PaperImplementationEvidenceBoardCurationRoleSlotId =
  typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID;

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_MODES = [
  'curate_existing_board',
  'seed_initial_board_candidates',
] as const;
export type PaperImplementationEvidenceBoardCurationMode =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_MODES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_ROLES = [
  'supporting_evidence',
  'contradicting_evidence',
  'scope_context',
  'method_context',
  'dataset_context',
  'baseline_context',
  'limitation_context',
] as const;
export type PaperImplementationEvidenceBoardCandidateRole =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_ROLES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_SCOPES = [
  'assertion_local',
  'motive_level',
  'board_level',
] as const;
export type PaperImplementationEvidenceBoardCandidateScope =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_SCOPES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_STRENGTHS = [
  'strong',
  'moderate',
  'weak',
  'blocked',
] as const;
export type PaperImplementationEvidenceBoardCandidateStrength =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_STRENGTHS)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_SUPPORT_STATES = [
  'viable_binding',
  'blocked_missing_locator',
  'blocked_citation_unreviewed',
  'blocked_stale',
  'blocked_duplicate_existing',
  'gap_only',
] as const;
export type PaperImplementationEvidenceBoardSupportState =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_SUPPORT_STATES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CHALLENGE_STATUSES = [
  'passed',
  'downgrade_to_gap',
  'blocked',
] as const;
export type PaperImplementationEvidenceBoardChallengeStatus =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CHALLENGE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_FRESHNESS_STATUSES = [
  'fresh',
  'stale',
  'unreviewed',
  'unknown',
] as const;
export type PaperImplementationEvidenceBoardFreshnessStatus =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_FRESHNESS_STATUSES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_GAP_KINDS = [
  'missing_source_locator',
  'missing_citation_candidate',
  'stale_evidence',
  'duplicate_existing_binding',
  'scope_or_trace_gap',
  'unsupported_assertion',
  'downstream_review_required',
] as const;
export type PaperImplementationEvidenceBoardGapKind =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_GAP_KINDS)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_RECOMMENDED_NEXT_GATES = [
  'motive_evidence_board_review',
  'citation_candidate_review',
  'trace_repair',
  'stale_evidence_recheck',
  'evidence_transfer_binding_review',
  'none',
] as const;
export type PaperImplementationEvidenceBoardRecommendedNextGate =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_RECOMMENDED_NEXT_GATES)[number];

// T-124 D2-pre2 / D2 复审 A#4: the deterministic disposition the curation SERVICE
// derives over the reviewed board input — the blocker-vs-disposition split.
// `blocker` codes mean the output itself is unusable/technical;
// `recommended_disposition` is the verdict on a usable output. Named
// isomorphically with the route-skeptic `recommended_disposition` so both stops
// read the same in the coordinator:
//   - proceed: a viable binding candidate with no blocker,
//   - revise:  the honest role PASSED and produced gap findings while finalStatus
//              is blocked — a semantically-valid critique the coordinator parks
//              as waiting_review (override/re-advance resumes), NOT a terminal
//              block. A#4: this holds WHETHER OR NOT a viable binding was also
//              proposed (a viable binding + gaps is more progress than gaps-only,
//              so it must not route worse); an ADMITTED final admission is
//              additionally required for the park (A#3, enforced in the
//              coordinator), else it falls back to blocked.
//   - blocked: role-blocked / no gaps / technical / preflight — terminal semantics.
// This is a pure server-side derivation (not an LLM slot); see the runtime
// service `deriveFinalStatusAndDisposition`.
export const PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_DISPOSITIONS = [
  'proceed',
  'revise',
  'blocked',
] as const;
export type PaperImplementationEvidenceBoardCurationDisposition =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_DISPOSITIONS)[number];

export interface PaperImplementationEvidenceBoardRuntimeControl {
  terminal_code: 'preflight_blocked' | 'runtime_retry_exhausted' | 'admission_rejected' | 'admitted_blocked';
  reason_kind: string;
  details: Record<string, unknown>;
}

export interface PaperImplementationEvidenceBoardSourceContextPacket {
  packet_ref: TopicSelectionFunctionalRef;
  packet_hash: string;
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
  evidence_kind: string;
  content_summary: string;
  key_facts: string[];
  covered_evidence_refs: TopicSelectionFunctionalRef[];
  covered_source_locator_refs: TopicSelectionFunctionalRef[];
  covered_citation_candidate_refs: TopicSelectionFunctionalRef[];
  covered_trace_manifest_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationEvidenceBoardFreshnessPolicy {
  stale_evidence_requires_gap_candidate: boolean;
  unreviewed_citation_requires_gap_candidate: boolean;
  duplicate_existing_binding_requires_gap_candidate: boolean;
}

export interface PaperImplementationEvidenceBoardChallengeCheck {
  memo_or_summary_rejected: boolean;
  locator_quality: 'verified' | 'missing' | 'weak';
  citation_status: 'reviewed' | 'unreviewed' | 'missing';
  scope_match_status: 'matched' | 'partial' | 'mismatch';
  freshness_status: PaperImplementationEvidenceBoardFreshnessStatus;
  should_downgrade_to_gap: boolean;
  downgrade_reason_codes: string[];
  blocking_reason_codes: string[];
}

export interface PaperImplementationEvidenceBoardBindingCandidateProposal {
  candidate_key: string;
  target_assertion_ref: TopicSelectionFunctionalRef;
  evidence_ref: TopicSelectionFunctionalRef;
  source_locator_refs: TopicSelectionFunctionalRef[];
  citation_candidate_refs: TopicSelectionFunctionalRef[];
  proposed_role: PaperImplementationEvidenceBoardCandidateRole;
  proposed_scope: PaperImplementationEvidenceBoardCandidateScope;
  proposed_strength: PaperImplementationEvidenceBoardCandidateStrength;
  support_state: PaperImplementationEvidenceBoardSupportState;
  challenge_status: PaperImplementationEvidenceBoardChallengeStatus;
  freshness_status: PaperImplementationEvidenceBoardFreshnessStatus;
  interpretation: string;
  challenge_check: PaperImplementationEvidenceBoardChallengeCheck;
  blocker_codes: string[];
  warning_codes: string[];
  recommended_next_gate: PaperImplementationEvidenceBoardRecommendedNextGate;
}

export interface PaperImplementationEvidenceBoardGapCandidateProposal {
  gap_key: string;
  target_assertion_ref: TopicSelectionFunctionalRef;
  gap_kind: PaperImplementationEvidenceBoardGapKind;
  missing_evidence_need: string;
  source_locator_blockers: string[];
  citation_blockers: string[];
  freshness_blockers: string[];
  recommended_next_gate: PaperImplementationEvidenceBoardRecommendedNextGate;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationEvidenceBoardCurationRoleOutput {
  role_slot_id: PaperImplementationEvidenceBoardCurationRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  reviewed_assertion_refs?: TopicSelectionFunctionalRef[];
  reviewed_source_locator_refs?: TopicSelectionFunctionalRef[];
  reviewed_citation_candidate_refs?: TopicSelectionFunctionalRef[];
  reviewed_evidence_refs?: TopicSelectionFunctionalRef[];
  reviewed_existing_evidence_binding_refs?: TopicSelectionFunctionalRef[];
  binding_candidate_proposals?: PaperImplementationEvidenceBoardBindingCandidateProposal[];
  gap_candidate_proposals?: PaperImplementationEvidenceBoardGapCandidateProposal[];
  blocker_codes: string[];
  warning_codes: string[];
  // T-124 D2-pre2 (additive): the disposition is server-derived, never an LLM
  // slot — the prompt does not request this field. It is tolerated on the role
  // output only so a stray provider echo validates; the service ignores the
  // echoed value and derives its own, recording an echo-drift warning on
  // divergence (avoids introducing a hollow LLM-authored semantic slot).
  recommended_disposition?: PaperImplementationEvidenceBoardCurationDisposition | null;
  no_domain_gate_request?: true;
  no_queue_side_effect?: true;
  no_board_write_side_effect?: true;
  no_evidence_binding_side_effect?: true;
  no_evidence_transfer_binding_side_effect?: true;
  no_citation_candidate_side_effect?: true;
  no_trace_repair_queue_side_effect?: true;
}

export interface PaperImplementationEvidenceBoardCurationArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationEvidenceBoardCurationSlotId;
  workflow_type: 'evidence_board_curation';
  curation_mode: PaperImplementationEvidenceBoardCurationMode;
  target_ref: TopicSelectionFunctionalRef;
  target_motive_ref: TopicSelectionFunctionalRef;
  target_core_motive_version_ref: TopicSelectionFunctionalRef;
  target_board_ref: TopicSelectionFunctionalRef | null;
  target_board_hash: string | null;
  target_assertion_refs: TopicSelectionFunctionalRef[];
  preflight_blockers: string[];
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  runtime_control: PaperImplementationEvidenceBoardRuntimeControl | null;
  reviewed_assertion_refs: TopicSelectionFunctionalRef[];
  reviewed_source_locator_refs: TopicSelectionFunctionalRef[];
  reviewed_citation_candidate_refs: TopicSelectionFunctionalRef[];
  reviewed_evidence_refs: TopicSelectionFunctionalRef[];
  reviewed_existing_evidence_binding_refs: TopicSelectionFunctionalRef[];
  binding_candidate_proposals: PaperImplementationEvidenceBoardBindingCandidateProposal[];
  gap_candidate_proposals: PaperImplementationEvidenceBoardGapCandidateProposal[];
  // T-124 D2-pre2 (additive): the deterministic server-derived disposition over
  // the reviewed input. The coordinator board pipeline reads this to park a
  // gaps-only `revise` final as waiting_review instead of a terminal block.
  recommended_disposition?: PaperImplementationEvidenceBoardCurationDisposition | null;
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_board_write_side_effect: true;
  no_evidence_binding_side_effect: true;
  no_evidence_transfer_binding_side_effect: true;
  no_citation_candidate_side_effect: true;
  no_trace_repair_queue_side_effect: true;
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

export interface RunPaperImplementationEvidenceBoardCurationRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  curation_mode: PaperImplementationEvidenceBoardCurationMode;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  target_motive_ref: TopicSelectionFunctionalRef;
  target_core_motive_version_ref: TopicSelectionFunctionalRef;
  target_board_ref?: TopicSelectionFunctionalRef | null;
  target_board_hash?: string | null;
  target_assertion_refs: TopicSelectionFunctionalRef[];
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  source_context_packets?: PaperImplementationEvidenceBoardSourceContextPacket[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  trace_manifest_hashes: string[];
  source_locator_refs: TopicSelectionFunctionalRef[];
  citation_candidate_refs: TopicSelectionFunctionalRef[];
  reviewed_citation_candidate_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  existing_evidence_binding_refs: TopicSelectionFunctionalRef[];
  existing_bound_evidence_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  freshness_policy: PaperImplementationEvidenceBoardFreshnessPolicy;
  secondary_evidence_transfer_binding_refs?: TopicSelectionFunctionalRef[];
  secondary_cross_board_review_refs?: TopicSelectionFunctionalRef[];
  secondary_trace_repair_queue_refs?: TopicSelectionFunctionalRef[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationEvidenceBoardCurationRoleSlotId,
    PaperImplementationEvidenceBoardCurationRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationEvidenceBoardCurationRoleSlotId,
    PaperImplementationEvidenceBoardCurationRoleOutput
  >>;
}

export type PaperImplementationMotiveDecompositionSlotId =
  typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID;
export type PaperImplementationMotiveDecompositionRoleSlotId =
  typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID;

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_MODES = [
  'decompose_existing_assertions',
] as const;
export type PaperImplementationMotiveDecompositionMode =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_MODES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RESULT_STATUSES = [
  'candidates_proposed',
  'no_decomposition_needed',
  'blocked',
] as const;
export type PaperImplementationMotiveDecompositionResultStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RESULT_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_CANDIDATE_KINDS = [
  'split_child',
  'scope_clarification',
  'support_obligation',
] as const;
export type PaperImplementationMotiveDecompositionCandidateKind =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_CANDIDATE_KINDS)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_COMPOUNDNESS_STATUSES = [
  'single_obligation',
  'multiple_obligations',
  'unclear',
] as const;
export type PaperImplementationMotiveDecompositionCompoundnessStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_COMPOUNDNESS_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SCOPE_CHANGE_STATUSES = [
  'clarification',
  'split',
  'merge_like_change',
  'new_claim_risk',
] as const;
export type PaperImplementationMotiveDecompositionScopeChangeStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SCOPE_CHANGE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_EVIDENCE_COVERAGE_STATUSES = [
  'full',
  'partial',
  'missing',
] as const;
export type PaperImplementationMotiveDecompositionEvidenceCoverageStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_EVIDENCE_COVERAGE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_TRACE_ALIGNMENT_STATUSES = [
  'aligned',
  'partial',
  'drift',
] as const;
export type PaperImplementationMotiveDecompositionTraceAlignmentStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_TRACE_ALIGNMENT_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RECOMMENDED_NEXT_GATES = [
  'motive_assertion_review',
  'motive_evolution_review',
  'evidence_board_curation',
  'trace_repair',
  'human_confirmation',
  'none',
] as const;
export type PaperImplementationMotiveDecompositionRecommendedNextGate =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RECOMMENDED_NEXT_GATES)[number];

export interface PaperImplementationMotiveDecompositionAssertionContextPacket {
  packet_ref: TopicSelectionFunctionalRef;
  packet_hash: string;
  assertion_ref: TopicSelectionFunctionalRef;
  assertion_hash: string;
  assertion_text: string;
  scope_boundary_summary: string;
  covered_evidence_refs: TopicSelectionFunctionalRef[];
  covered_trace_manifest_refs: TopicSelectionFunctionalRef[];
  covered_source_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationMotiveDecompositionCheck {
  compoundness_status: PaperImplementationMotiveDecompositionCompoundnessStatus;
  scope_change_status: PaperImplementationMotiveDecompositionScopeChangeStatus;
  evidence_coverage_status: PaperImplementationMotiveDecompositionEvidenceCoverageStatus;
  trace_alignment_status: PaperImplementationMotiveDecompositionTraceAlignmentStatus;
  new_claim_risk: boolean;
  human_confirmation_required: boolean;
  blocking_reason_codes: string[];
  recommended_next_gate: PaperImplementationMotiveDecompositionRecommendedNextGate;
}

export interface PaperImplementationMotiveDecompositionDraftAssertionCandidate {
  candidate_key: string;
  source_assertion_ref: TopicSelectionFunctionalRef;
  candidate_kind: PaperImplementationMotiveDecompositionCandidateKind;
  draft_assertion_text: string;
  scope_boundary_summary: string;
  support_obligation_summary: string;
  covered_evidence_refs: TopicSelectionFunctionalRef[];
  covered_source_refs: TopicSelectionFunctionalRef[];
  covered_source_locator_refs: TopicSelectionFunctionalRef[];
  covered_citation_candidate_refs: TopicSelectionFunctionalRef[];
  covered_trace_manifest_refs: TopicSelectionFunctionalRef[];
  decomposition_check: PaperImplementationMotiveDecompositionCheck;
  blocker_codes: string[];
  warning_codes: string[];
  recommended_next_gate: PaperImplementationMotiveDecompositionRecommendedNextGate;
}

export interface PaperImplementationMotiveDecompositionRoleOutput {
  role_slot_id: PaperImplementationMotiveDecompositionRoleSlotId;
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  decomposition_result_status: PaperImplementationMotiveDecompositionResultStatus;
  reviewed_assertion_refs: TopicSelectionFunctionalRef[];
  draft_assertion_candidates: PaperImplementationMotiveDecompositionDraftAssertionCandidate[];
  blocker_codes: string[];
  warning_codes: string[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_motive_write_side_effect: true;
  no_motive_evolution_side_effect: true;
  no_board_write_side_effect: true;
  no_evidence_binding_side_effect: true;
  no_trace_repair_queue_side_effect: true;
}

export interface PaperImplementationMotiveDecompositionArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationMotiveDecompositionSlotId;
  workflow_type: 'motive_decomposition';
  decomposition_mode: PaperImplementationMotiveDecompositionMode;
  target_ref: TopicSelectionFunctionalRef;
  target_motive_ref: TopicSelectionFunctionalRef;
  target_core_motive_version_ref: TopicSelectionFunctionalRef;
  target_assertion_refs: TopicSelectionFunctionalRef[];
  preflight_blockers: string[];
  decomposition_result_status: PaperImplementationMotiveDecompositionResultStatus;
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  reviewed_assertion_refs: TopicSelectionFunctionalRef[];
  draft_assertion_candidates: PaperImplementationMotiveDecompositionDraftAssertionCandidate[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_motive_write_side_effect: true;
  no_motive_evolution_side_effect: true;
  no_board_write_side_effect: true;
  no_evidence_binding_side_effect: true;
  no_trace_repair_queue_side_effect: true;
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

export interface RunPaperImplementationMotiveDecompositionRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  decomposition_mode: PaperImplementationMotiveDecompositionMode;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  target_motive_ref: TopicSelectionFunctionalRef;
  target_core_motive_version_ref: TopicSelectionFunctionalRef;
  target_assertion_refs: TopicSelectionFunctionalRef[];
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  assertion_context_packets: PaperImplementationMotiveDecompositionAssertionContextPacket[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  trace_manifest_hashes: string[];
  source_locator_refs: TopicSelectionFunctionalRef[];
  citation_candidate_refs: TopicSelectionFunctionalRef[];
  evidence_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  admitted_upstream_artifact_refs?: TopicSelectionFunctionalRef[];
  admitted_upstream_artifact_hashes?: string[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationMotiveDecompositionRoleSlotId,
    PaperImplementationMotiveDecompositionRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationMotiveDecompositionRoleSlotId,
    PaperImplementationMotiveDecompositionRoleOutput
  >>;
}

export type PaperImplementationMotiveEvolutionSlotId =
  typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID;

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RESULT_STATUSES = [
  'options_proposed',
  'no_evolution_needed',
  'blocked',
] as const;
export type PaperImplementationMotiveEvolutionResultStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RESULT_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_KINDS = [
  'keep_current',
  'repair_evidence_board_first',
  'supersede',
  'merge',
  'split',
  'park',
  'abandon',
] as const;
export type PaperImplementationMotiveEvolutionOptionKind =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_KINDS)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PORTFOLIO_IMPACT_CLASSES = [
  'none',
  'evidence_board_only',
  'semantic_version_change',
  'portfolio_role_change',
  'primary_or_active_set_change',
  'lineage_change',
] as const;
export type PaperImplementationMotiveEvolutionPortfolioImpactClass =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PORTFOLIO_IMPACT_CLASSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_CHECK_STATUSES = [
  'satisfied',
  'partial',
  'blocked',
  'not_applicable',
] as const;
export type PaperImplementationMotiveEvolutionCheckStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_CHECK_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RECOMMENDED_NEXT_GATES = [
  'motive_evolution_review',
  'portfolio_decision_review',
  'evidence_board_curation',
  'trace_repair',
  'validation_repair',
  'human_confirmation',
  'none',
] as const;
export type PaperImplementationMotiveEvolutionRecommendedNextGate =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RECOMMENDED_NEXT_GATES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_CONTEXT_PACKET_KINDS = [
  'motive_contract',
  'motive_version_state',
  'portfolio_snapshot',
  'evidence_board',
  'trace_summary',
  'trigger_context',
  'prior_decision',
  'accepted_risk',
] as const;
export type PaperImplementationMotiveEvolutionContextPacketKind =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_CONTEXT_PACKET_KINDS)[number];

export interface PaperImplementationMotiveEvolutionContextPacket {
  packet_ref: TopicSelectionFunctionalRef;
  packet_hash: string;
  packet_kind: PaperImplementationMotiveEvolutionContextPacketKind;
  content_summary: string;
  key_facts: string[];
  covered_target_refs: TopicSelectionFunctionalRef[];
  covered_evidence_refs: TopicSelectionFunctionalRef[];
  covered_trace_manifest_refs: TopicSelectionFunctionalRef[];
  covered_source_refs: TopicSelectionFunctionalRef[];
}

export interface PaperImplementationMotiveEvolutionChallengeCheck {
  evidence_status: PaperImplementationMotiveEvolutionCheckStatus;
  trace_status: PaperImplementationMotiveEvolutionCheckStatus;
  portfolio_status: PaperImplementationMotiveEvolutionCheckStatus;
  human_confirmation_status: PaperImplementationMotiveEvolutionCheckStatus;
  downstream_impact_status: PaperImplementationMotiveEvolutionCheckStatus;
  blocking_reason_codes: string[];
}

export interface PaperImplementationMotiveEvolutionDesignedOption {
  option_kind: PaperImplementationMotiveEvolutionOptionKind;
  supporting_refs: TopicSelectionFunctionalRef[];
  challenging_refs: TopicSelectionFunctionalRef[];
  portfolio_impact_class: PaperImplementationMotiveEvolutionPortfolioImpactClass;
  human_confirmation_required: boolean;
  recommended_next_gate: PaperImplementationMotiveEvolutionRecommendedNextGate;
  blocker_codes: string[];
  warning_codes: string[];
}

export interface PaperImplementationMotiveEvolutionDecisionOption
  extends PaperImplementationMotiveEvolutionDesignedOption {
  challenge_check: PaperImplementationMotiveEvolutionChallengeCheck;
}

interface PaperImplementationMotiveEvolutionRoleOutputBase {
  role_status: 'passed' | 'blocked';
  summary: string;
  cited_source_refs: TopicSelectionFunctionalRef[];
  support_result_status: PaperImplementationMotiveEvolutionResultStatus;
  blocker_codes: string[];
  warning_codes: string[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_motive_write_side_effect: true;
  no_motive_evolution_side_effect: true;
  no_portfolio_mutation_side_effect: true;
  no_board_write_side_effect: true;
  no_evidence_binding_side_effect: true;
  no_trace_repair_queue_side_effect: true;
}

export interface PaperImplementationMotiveEvolutionOptionDesignerRoleOutput
  extends PaperImplementationMotiveEvolutionRoleOutputBase {
  role_slot_id: typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID;
  reviewed_target_motive_refs: TopicSelectionFunctionalRef[];
  reviewed_core_motive_version_refs: TopicSelectionFunctionalRef[];
  designed_options: Record<string, PaperImplementationMotiveEvolutionDesignedOption>;
  option_set_hash: string;
}

export interface PaperImplementationMotiveEvolutionRiskChallengerRoleOutput
  extends PaperImplementationMotiveEvolutionRoleOutputBase {
  role_slot_id: typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID;
  designer_role_artifact_ref: TopicSelectionFunctionalRef;
  designer_role_artifact_hash: string;
  option_set_hash: string;
  challenged_option_keys: string[];
  decision_options: Record<string, PaperImplementationMotiveEvolutionDecisionOption>;
}

export type PaperImplementationMotiveEvolutionRoleOutput =
  | PaperImplementationMotiveEvolutionOptionDesignerRoleOutput
  | PaperImplementationMotiveEvolutionRiskChallengerRoleOutput;

/**
 * T-124 S3-β1 provider wire encoding of the motive-evolution role outputs:
 * the by-key option maps are unrepresentable in OpenAI strict structured
 * output (see the wire schema exports next to
 * `paperImplementationMotiveEvolutionRoleOutputSchema`), so provider_llm
 * calls transport the options as entry arrays with an explicit `option_key`
 * and the runtime service canonicalizes them back into the maps.
 */
export interface PaperImplementationMotiveEvolutionDesignedOptionEntry
  extends PaperImplementationMotiveEvolutionDesignedOption {
  option_key: string;
}

export interface PaperImplementationMotiveEvolutionDecisionOptionEntry
  extends PaperImplementationMotiveEvolutionDecisionOption {
  option_key: string;
}

export type PaperImplementationMotiveEvolutionOptionDesignerRoleWireOutput =
  Omit<PaperImplementationMotiveEvolutionOptionDesignerRoleOutput, 'designed_options'> & {
    designed_option_entries: PaperImplementationMotiveEvolutionDesignedOptionEntry[];
  };

export type PaperImplementationMotiveEvolutionRiskChallengerRoleWireOutput =
  Omit<PaperImplementationMotiveEvolutionRiskChallengerRoleOutput, 'decision_options'> & {
    decision_option_entries: PaperImplementationMotiveEvolutionDecisionOptionEntry[];
  };

export type PaperImplementationMotiveEvolutionRoleWireOutput =
  | PaperImplementationMotiveEvolutionOptionDesignerRoleWireOutput
  | PaperImplementationMotiveEvolutionRiskChallengerRoleWireOutput;

export interface PaperImplementationMotiveEvolutionArtifact {
  status: 'passed' | 'blocked' | 'failed_runtime';
  slot_id: PaperImplementationMotiveEvolutionSlotId;
  workflow_type: 'motive_evolution';
  target_ref: TopicSelectionFunctionalRef;
  target_motive_refs: TopicSelectionFunctionalRef[];
  target_core_motive_version_refs: TopicSelectionFunctionalRef[];
  preflight_blockers: string[];
  support_result_status: PaperImplementationMotiveEvolutionResultStatus;
  role_summary: string | null;
  role_blocker_codes: string[];
  role_warning_codes: string[];
  blockers: string[];
  warnings: string[];
  runtime_failure_code: string | null;
  decision_options: Record<string, PaperImplementationMotiveEvolutionDecisionOption>;
  /**
   * T-133 D-133-2 (P2): SERVER-DERIVED keys of the challenged options whose
   * kind/impact class sits in the portfolio-changing set (park/split/… — the
   * same deterministic set the human-confirmation flag guard enforces). A
   * non-empty list on a passed final means "decision support is ready and a
   * lineage-changing option awaits a human decision" — the coordinator parks
   * the run as waiting_review (confirm-and-continue resumes it). On blocked
   * finals the keys are informational only (mixed-defect finals stay terminal
   * blocked). Pure structural derivation; the LLM cannot add or remove keys.
   * Optional for finals persisted before the field existed (same discipline as
   * the coordinator step audit fields); the service always writes it. NOTE:
   * acceptance evidence never lands on this artifact — a confirm-and-continue
   * acceptance is recorded on the coordinator step (`review_acceptance`), so a
   * future consumer must join the coordinator steps, never infer acceptance
   * from the artifact body.
   */
  human_decision_required_option_keys?: string[];
  no_domain_gate_request: true;
  no_queue_side_effect: true;
  no_motive_write_side_effect: true;
  no_motive_evolution_side_effect: true;
  no_portfolio_mutation_side_effect: true;
  no_board_write_side_effect: true;
  no_evidence_binding_side_effect: true;
  no_trace_repair_queue_side_effect: true;
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

export interface RunPaperImplementationMotiveEvolutionRuntimeRequest {
  schema_version?: typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION;
  run_id?: string | null;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_version_id?: string | null;
  target_motive_refs: TopicSelectionFunctionalRef[];
  target_motive_hashes: string[];
  target_core_motive_version_refs: TopicSelectionFunctionalRef[];
  target_core_motive_version_hashes: string[];
  input_snapshot_ref: TopicSelectionFunctionalRef;
  input_snapshot_hash: string;
  portfolio_snapshot_ref: TopicSelectionFunctionalRef;
  portfolio_snapshot_hash: string;
  evidence_board_refs: TopicSelectionFunctionalRef[];
  evidence_board_hashes: string[];
  evidence_binding_refs: TopicSelectionFunctionalRef[];
  evidence_binding_hashes: string[];
  challenge_refs: TopicSelectionFunctionalRef[];
  conflict_refs: TopicSelectionFunctionalRef[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  trace_manifest_hashes: string[];
  human_confirmation_policy_ref: TopicSelectionFunctionalRef;
  human_confirmation_policy_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: string[];
  motive_context_packets?: PaperImplementationMotiveEvolutionContextPacket[];
  validation_cycle_refs?: TopicSelectionFunctionalRef[];
  validation_cycle_hashes?: string[];
  result_packet_refs?: TopicSelectionFunctionalRef[];
  result_packet_hashes?: string[];
  cross_board_review_refs?: TopicSelectionFunctionalRef[];
  cross_board_review_hashes?: string[];
  prior_evolution_decision_refs?: TopicSelectionFunctionalRef[];
  prior_evolution_decision_hashes?: string[];
  prior_portfolio_decision_refs?: TopicSelectionFunctionalRef[];
  prior_portfolio_decision_hashes?: string[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  accepted_risk_hashes?: string[];
  human_request_refs?: TopicSelectionFunctionalRef[];
  human_request_hashes?: string[];
  preflight_blocker_codes?: string[];
  mocked_role_outputs?: Partial<Record<
    PaperImplementationMotiveEvolutionRoleSlotId,
    PaperImplementationMotiveEvolutionRoleOutput
  >>;
  codex_role_outputs?: Partial<Record<
    PaperImplementationMotiveEvolutionRoleSlotId,
    PaperImplementationMotiveEvolutionRoleOutput
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
const uniqueStringArray = { type: 'array', uniqueItems: true, items: stringId } as const;
const nonEmptyUniqueStringArray = {
  type: 'array',
  minItems: 1,
  uniqueItems: true,
  items: stringId,
} as const;
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
const routePlanningRoleSlotSchema = {
  enum: [...PAPER_IMPLEMENTATION_ROUTE_PLANNING_ROLE_SLOT_IDS],
} as const;
const routePlanningRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    PAPER_IMPLEMENTATION_ROUTE_PLANNING_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      { $ref: '#/$defs/paperImplementationRoutePlanningRoleOutput' },
    ]),
  ),
} as const;
const validationCyclePlanningRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
} as const;
const validationCyclePlanningRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationValidationCyclePlanningRoleOutput',
    },
  },
} as const;
const feasibilityPlanningRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
} as const;
const feasibilityPlanningRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationFeasibilityPlanningRoleOutput',
    },
  },
} as const;
const crossBoardSynthesisRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID,
} as const;
const crossBoardSynthesisRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationCrossBoardSynthesisRoleOutput',
    },
  },
} as const;
const evidenceBoardCurationRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID,
} as const;
const evidenceBoardCurationRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationEvidenceBoardCurationRoleOutput',
    },
  },
} as const;
const motiveDecompositionRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
} as const;
const motiveDecompositionRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationMotiveDecompositionRoleOutput',
    },
  },
} as const;
const motiveEvolutionOptionDesignerRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID,
} as const;
const motiveEvolutionRiskChallengerRoleSlotSchema = {
  const: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID,
} as const;
const motiveEvolutionRoleOutputsBySlotSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_DESIGNER_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationMotiveEvolutionOptionDesignerRoleOutput',
    },
    [PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RISK_CHALLENGER_ROLE_SLOT_ID]: {
      $ref: '#/$defs/paperImplementationMotiveEvolutionRiskChallengerRoleOutput',
    },
  },
} as const;
const routePlanningSlotSchema = {
  enum: [
    PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  ],
} as const;
const routePlanningWorkflowTypeSchema = {
  enum: ['route_architecture', 'route_skeptic_review'],
} as const;
const validationCyclePlanningSlotSchema = {
  const: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
} as const;
const feasibilityPlanningSlotSchema = {
  const: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
} as const;
const crossBoardSynthesisSlotSchema = {
  const: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
} as const;
const evidenceBoardCurationSlotSchema = {
  const: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
} as const;
const motiveDecompositionSlotSchema = {
  const: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
} as const;
const motiveEvolutionSlotSchema = {
  const: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
} as const;
const workOrderRunTypeSchema = { enum: [...PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES] } as const;
const validationCostClassSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_COST_CLASSES] } as const;
const validationCycleTypeSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_CYCLE_TYPES] } as const;
const validationBaselineGapStatusSchema = { enum: [...PAPER_IMPLEMENTATION_BASELINE_GAP_STATUSES] } as const;
const validationCyclePlanningInformationGainSchema = {
  enum: [...PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_INFORMATION_GAIN_LEVELS],
} as const;
const feasibilityPlanningInformationGainSchema = {
  enum: [...PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_INFORMATION_GAIN_LEVELS],
} as const;
const feasibilityProbeKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_FEASIBILITY_PROBE_KINDS],
} as const;
const motiveFreshnessStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES],
} as const;
const crossBoardScenarioKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_CROSS_BOARD_SCENARIO_KINDS],
} as const;
const crossBoardScenarioDispositionSchema = {
  enum: [...PAPER_IMPLEMENTATION_CROSS_BOARD_SCENARIO_DISPOSITIONS],
} as const;
const crossBoardRecommendedNextGateSchema = {
  enum: [...PAPER_IMPLEMENTATION_CROSS_BOARD_RECOMMENDED_NEXT_GATES],
} as const;
const evidenceBoardCurationModeSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_MODES],
} as const;
const evidenceBoardCurationDispositionSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_DISPOSITIONS],
} as const;
const motiveDecompositionModeSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_MODES],
} as const;
const motiveDecompositionResultStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RESULT_STATUSES],
} as const;
const motiveDecompositionCandidateKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_CANDIDATE_KINDS],
} as const;
const motiveDecompositionCompoundnessStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_COMPOUNDNESS_STATUSES],
} as const;
const motiveDecompositionScopeChangeStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SCOPE_CHANGE_STATUSES],
} as const;
const motiveDecompositionEvidenceCoverageStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_EVIDENCE_COVERAGE_STATUSES],
} as const;
const motiveDecompositionTraceAlignmentStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_TRACE_ALIGNMENT_STATUSES],
} as const;
const motiveDecompositionRecommendedNextGateSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RECOMMENDED_NEXT_GATES],
} as const;
const motiveEvolutionResultStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RESULT_STATUSES],
} as const;
const motiveEvolutionOptionKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_OPTION_KINDS],
} as const;
const motiveEvolutionPortfolioImpactClassSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PORTFOLIO_IMPACT_CLASSES],
} as const;
const motiveEvolutionCheckStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_CHECK_STATUSES],
} as const;
const motiveEvolutionRecommendedNextGateSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RECOMMENDED_NEXT_GATES],
} as const;
const motiveEvolutionContextPacketKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_CONTEXT_PACKET_KINDS],
} as const;
const evidenceBoardCandidateRoleSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_ROLES],
} as const;
const evidenceBoardCandidateScopeSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_SCOPES],
} as const;
const evidenceBoardCandidateStrengthSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CANDIDATE_STRENGTHS],
} as const;
const evidenceBoardSupportStateSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_SUPPORT_STATES],
} as const;
const evidenceBoardChallengeStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CHALLENGE_STATUSES],
} as const;
const evidenceBoardFreshnessStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_FRESHNESS_STATUSES],
} as const;
const evidenceBoardGapKindSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_GAP_KINDS],
} as const;
const evidenceBoardRecommendedNextGateSchema = {
  enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BOARD_RECOMMENDED_NEXT_GATES],
} as const;
const experimentCritiqueDimensionSchema = {
  enum: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
} as const;
const experimentCritiqueDecisionSchema = {
  enum: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DECISIONS],
} as const;
const routeBaselineGapStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_ROUTE_BASELINE_GAP_STATUSES],
} as const;
const routeSkepticRiskDimensionSchema = {
  enum: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
} as const;
const routeSkepticDispositionSchema = {
  enum: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_DISPOSITIONS],
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

const traceIntegrityStatementSupportEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['statement_ref', 'support_kind', 'cited_refs'],
  properties: {
    statement_ref: nonLegacyFunctionalRef,
    support_kind: { enum: [...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_SUPPORT_KINDS] },
    cited_refs: nonLegacyFunctionalRefArray,
  },
} as const;

const traceIntegrityChallengeFindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['finding_id', 'severity', 'blocker_code', 'target_statement_ref', 'cited_refs'],
  properties: {
    finding_id: stringId,
    severity: { enum: [...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_FINDING_SEVERITIES] },
    blocker_code: stringId,
    target_statement_ref: nonLegacyFunctionalRef,
    cited_refs: nonLegacyFunctionalRefArray,
  },
} as const;

const traceIntegrityFindingDispositionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['finding_id', 'disposition', 'cited_refs'],
  properties: {
    finding_id: stringId,
    disposition: { enum: [...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_FINDING_DISPOSITIONS] },
    cited_refs: nonLegacyFunctionalRefArray,
  },
} as const;

const traceIntegrityCoverageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['statement_refs', 'finding_ids'],
  properties: {
    statement_refs: nonLegacyFunctionalRefArray,
    finding_ids: uniqueStringArray,
  },
} as const;

// T-124 S3-α2: additive optional structured fields (prompt template v2). The
// per-role presence/completeness requirements are enforced server-side (runtime
// service semantic checks + admission independent re-check), not by this schema,
// because one shared schema serves all four roles.
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
    per_statement_support_map: {
      type: 'array',
      items: traceIntegrityStatementSupportEntrySchema,
    },
    challenge_findings: {
      type: 'array',
      items: traceIntegrityChallengeFindingSchema,
    },
    finding_dispositions: {
      type: 'array',
      items: traceIntegrityFindingDispositionSchema,
    },
    coverage: traceIntegrityCoverageSchema,
  },
} as const;

// T-124 G4.6: enum schemas for the typed semantic-proposal blocks (single-sourced
// from the trace / result-claim-dossier contracts so the runtime wire face can
// never drift from the Domain Gate's canonical enums).
const runtimeClaimStrengthSchema = { enum: [...PAPER_IMPLEMENTATION_CLAIM_STRENGTHS] } as const;
const runtimeClaimTypeSchema = { enum: [...PAPER_IMPLEMENTATION_CLAIM_TYPES] } as const;
const runtimeDossierStatusSchema = { enum: [...PAPER_IMPLEMENTATION_DOSSIER_STATUSES] } as const;

export const paperImplementationClaimCandidateProposalScopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'population_scope',
    'method_scope',
    'dataset_scope',
    'metric_scope',
    'negative_scope_notes',
    'excluded_scope_notes',
  ],
  properties: {
    population_scope: stringId,
    method_scope: stringId,
    dataset_scope: stringId,
    metric_scope: stringId,
    negative_scope_notes: stringArray,
    excluded_scope_notes: stringArray,
  },
} as const;

export const paperImplementationClaimCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'claim_type',
    'claim_statement',
    'claim_strength',
    'support_refs',
    'challenge_refs',
    'scope',
    'boundary_rationale',
    'forbidden_overclaims',
    'hidden_counter_evidence_refs',
    'required_followup_refs',
  ],
  properties: {
    claim_type: runtimeClaimTypeSchema,
    claim_statement: stringId,
    claim_strength: runtimeClaimStrengthSchema,
    support_refs: nonLegacyFunctionalRefArray,
    challenge_refs: nonLegacyFunctionalRefArray,
    scope: paperImplementationClaimCandidateProposalScopeSchema,
    boundary_rationale: stringId,
    forbidden_overclaims: stringArray,
    hidden_counter_evidence_refs: nonLegacyFunctionalRefArray,
    required_followup_refs: nonLegacyFunctionalRefArray,
  },
} as const;

export const paperImplementationDossierReadinessProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dossier_status',
    'experiment_limitations',
    'failed_run_refs',
    'inconclusive_run_refs',
    'negative_result_refs',
    'excluded_stale_or_invalidated_evidence_refs',
    'admitted_claim_refs',
    'rejected_claim_refs',
    'forbidden_overclaims',
    'claim_ceiling',
    'readiness_blocker_refs',
    'readiness_warning_refs',
    'readiness_notes',
  ],
  properties: {
    dossier_status: runtimeDossierStatusSchema,
    experiment_limitations: stringArray,
    failed_run_refs: nonLegacyFunctionalRefArray,
    inconclusive_run_refs: nonLegacyFunctionalRefArray,
    negative_result_refs: nonLegacyFunctionalRefArray,
    excluded_stale_or_invalidated_evidence_refs: nonLegacyFunctionalRefArray,
    admitted_claim_refs: nonLegacyFunctionalRefArray,
    rejected_claim_refs: nonLegacyFunctionalRefArray,
    forbidden_overclaims: stringArray,
    claim_ceiling: runtimeClaimStrengthSchema,
    readiness_blocker_refs: nonLegacyFunctionalRefArray,
    readiness_warning_refs: nonLegacyFunctionalRefArray,
    readiness_notes: stringArray,
    // T-124 G5 FIX-A item 1: additive disposition channels (nullable, optional).
    reopen_condition: nullableStringId,
    abandon_reason: nullableStringId,
  },
} as const;

const nullableClaimCandidateProposalSchema = {
  anyOf: [paperImplementationClaimCandidateProposalSchema, { type: 'null' }],
} as const;
const nullableDossierReadinessProposalSchema = {
  anyOf: [paperImplementationDossierReadinessProposalSchema, { type: 'null' }],
} as const;

// T-124 G4.6: the P1 role output carries typed semantic-proposal blocks; the
// runtime service assembles the Create*Request deterministically. Adjudicator
// presence/completeness requirements are enforced server-side (runtime service
// semantic checks), not by this shared schema, because one schema serves all
// six P1 roles across the two workflows.
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
    claim_proposal: nullableClaimCandidateProposalSchema,
    dossier_proposal: nullableDossierReadinessProposalSchema,
    scenario_outputs: objectArray,
  },
} as const;

// T-124 S3 复审 F5-1 (narrowed by G4.6): JSON-string wire carrier for the one
// remaining degenerate node (`scenario_outputs`). Provider strict mode can emit
// a `string`; the runtime service parses it back into the canonical array
// before anything is recorded.
const jsonStringArraySchema = {
  type: 'array',
  items: { type: 'string', minLength: 1 },
} as const;

/**
 * T-124 S3 复审 F5-1 provider wire schema for P1 role outputs (see
 * `PaperImplementationP1RuntimeReviewRoleWireOutput`), narrowed by G4.6:
 * identical to the canonical schema except `scenario_outputs` (bare
 * `{type:'object'}` items) travels as opaque JSON strings. The typed
 * semantic-proposal blocks are strict-representable and ride the wire directly;
 * the former `domain_gate_request_json` carrier is retired.
 */
export const paperImplementationP1RuntimeReviewRoleWireOutputSchema = {
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
    claim_proposal: nullableClaimCandidateProposalSchema,
    dossier_proposal: nullableDossierReadinessProposalSchema,
    scenario_output_jsons: jsonStringArraySchema,
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

export const paperImplementationResultAnalysisInterpretationSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_summary',
    'supports_assertion_refs',
    'challenges_assertion_refs',
    'unexpected_findings',
    'failed_run_refs',
    'inconclusive_run_refs',
    'stale_or_invalidated_evidence_refs',
    'failed_runs_accounted_for',
    'inconclusive_runs_accounted_for',
    'exploratory_confirmatory_separated',
  ],
  properties: {
    result_summary: stringId,
    supports_assertion_refs: nonLegacyFunctionalRefArray,
    challenges_assertion_refs: nonLegacyFunctionalRefArray,
    unexpected_findings: stringArray,
    failed_run_refs: nonLegacyFunctionalRefArray,
    inconclusive_run_refs: nonLegacyFunctionalRefArray,
    stale_or_invalidated_evidence_refs: nonLegacyFunctionalRefArray,
    failed_runs_accounted_for: { type: 'boolean' },
    inconclusive_runs_accounted_for: { type: 'boolean' },
    exploratory_confirmatory_separated: { type: 'boolean' },
  },
} as const;

export const paperImplementationResultAnalysisReliabilityAssessmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'failed_runs_retained',
    'confound_refs',
    'limitation_refs',
    'reliability_notes',
  ],
  properties: {
    failed_runs_retained: { type: 'boolean' },
    confound_refs: nonLegacyFunctionalRefArray,
    limitation_refs: nonLegacyFunctionalRefArray,
    reliability_notes: stringArray,
  },
} as const;

export const paperImplementationResultAnalysisClaimImplicationsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'allowed_claim_ceiling',
    'forbidden_overclaims',
    'recommended_claim_refs',
    'required_followup_refs',
  ],
  properties: {
    allowed_claim_ceiling: runtimeClaimStrengthSchema,
    forbidden_overclaims: stringArray,
    recommended_claim_refs: nonLegacyFunctionalRefArray,
    required_followup_refs: nonLegacyFunctionalRefArray,
  },
} as const;

/**
 * T-124 G4.6: single result-analysis role-output schema for ALL execution modes
 * (the F5-1 wire schema with the `domain_gate_request_json` carrier is retired).
 * Every field is typed and strict-representable; passed-branch completeness
 * (all three semantic blocks non-null + the four scenario kinds) is enforced
 * server-side by the runtime service semantic check, not by schema
 * conditionals — strict-mode grammar cannot enforce conditionals and the
 * all-or-nothing ajv trap was the run 009/010/011 failure signature.
 */
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
    interpretation: {
      anyOf: [paperImplementationResultAnalysisInterpretationSummarySchema, { type: 'null' }],
    },
    reliability: {
      anyOf: [paperImplementationResultAnalysisReliabilityAssessmentSchema, { type: 'null' }],
    },
    claim_implications: {
      anyOf: [paperImplementationResultAnalysisClaimImplicationsSchema, { type: 'null' }],
    },
  },
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

export const paperImplementationRouteCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_key',
    'route_summary',
    'expected_information_gain',
    'baseline_gap_status',
    'cited_source_refs',
    'trace_refs',
    'validation_signal_refs',
    'dataset_refs',
    'metric_refs',
    'baseline_refs',
    'code_refs',
    'config_refs',
    'scope_boundary',
    'confirmatory_marker',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    candidate_key: stringId,
    route_summary: stringId,
    expected_information_gain: stringId,
    baseline_gap_status: routeBaselineGapStatusSchema,
    cited_source_refs: nonLegacyFunctionalRefArray,
    trace_refs: nonLegacyFunctionalRefArray,
    validation_signal_refs: nonLegacyFunctionalRefArray,
    dataset_refs: nonLegacyFunctionalRefArray,
    metric_refs: nonLegacyFunctionalRefArray,
    baseline_refs: nonLegacyFunctionalRefArray,
    code_refs: nonLegacyFunctionalRefArray,
    config_refs: nonLegacyFunctionalRefArray,
    scope_boundary: stringId,
    confirmatory_marker: { type: 'boolean' },
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const paperImplementationRouteSkepticFindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'finding_id',
    'risk_dimension',
    'severity',
    'summary',
    'evidence_refs',
    'affected_candidate_keys',
    'required_revision_refs',
    'blocks_route_progression',
  ],
  properties: {
    finding_id: stringId,
    risk_dimension: routeSkepticRiskDimensionSchema,
    severity: { enum: ['info', 'warning', 'blocking', 'critical'] },
    summary: stringId,
    evidence_refs: nonLegacyFunctionalRefArray,
    affected_candidate_keys: stringArray,
    required_revision_refs: nonLegacyFunctionalRefArray,
    blocks_route_progression: { type: 'boolean' },
  },
} as const;

export const paperImplementationRoutePlanningSourceContextPacketSchema = {
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

const completeRouteSkepticRiskDimensionsSchema = {
  type: 'array',
  minItems: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS.length,
  items: routeSkepticRiskDimensionSchema,
  allOf: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS.map((dimension) => ({
    contains: { const: dimension },
  })),
} as const;

export const paperImplementationRoutePlanningRoleOutputSchema = {
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
    role_slot_id: routePlanningRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    route_candidate_proposals: {
      type: 'array',
      items: paperImplementationRouteCandidateProposalSchema,
    },
    reviewed_route_proposal_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_proposal_hash: nullableHashString,
    reviewed_candidate_keys: stringArray,
    checked_dimensions: {
      type: 'array',
      items: routeSkepticRiskDimensionSchema,
    },
    risk_findings: {
      type: 'array',
      items: paperImplementationRouteSkepticFindingSchema,
    },
    recommended_disposition: {
      anyOf: [routeSkepticDispositionSchema, { type: 'null' }],
    },
    no_queue_side_effect: { const: true },
  },
  allOf: [
    {
      if: {
        properties: {
          role_slot_id: { const: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID },
          role_status: { const: 'passed' },
        },
        required: ['role_slot_id', 'role_status'],
      },
      then: {
        required: ['route_candidate_proposals'],
        properties: {
          route_candidate_proposals: {
            type: 'array',
            minItems: 2,
            items: paperImplementationRouteCandidateProposalSchema,
          },
        },
      },
    },
    {
      if: {
        properties: {
          role_slot_id: { const: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID },
          role_status: { const: 'passed' },
        },
        required: ['role_slot_id', 'role_status'],
      },
      then: {
        required: [
          'reviewed_route_proposal_ref',
          'reviewed_route_proposal_hash',
          'reviewed_candidate_keys',
          'checked_dimensions',
          'risk_findings',
          'recommended_disposition',
          'no_queue_side_effect',
        ],
        properties: {
          reviewed_route_proposal_ref: nonLegacyFunctionalRef,
          reviewed_route_proposal_hash: hashString,
          reviewed_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          checked_dimensions: completeRouteSkepticRiskDimensionsSchema,
          risk_findings: {
            type: 'array',
            minItems: 1,
            items: paperImplementationRouteSkepticFindingSchema,
          },
          recommended_disposition: routeSkepticDispositionSchema,
          no_queue_side_effect: { const: true },
        },
      },
    },
  ],
} as const;

export const paperImplementationValidationCyclePlanningSourceContextPacketSchema = {
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

export const paperImplementationValidationCycleCandidateCriteriaSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'pass_conditions',
    'fail_conditions',
    'inconclusive_conditions',
    'stop_conditions',
    'minimum_artifacts_required',
  ],
  properties: {
    pass_conditions: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
    fail_conditions: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
    inconclusive_conditions: stringArray,
    stop_conditions: stringArray,
    minimum_artifacts_required: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
  },
} as const;

export const paperImplementationValidationCycleCandidateBudgetEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['retry_budget'],
  properties: {
    budget_ref: nullableNonLegacyFunctionalRef,
    iteration_budget_ref: nullableNonLegacyFunctionalRef,
    retry_budget: nonNegativeInteger,
    max_runtime: nullableStringId,
    max_compute: nullableStringId,
    max_human_review_count: {
      anyOf: [nonNegativeInteger, { type: 'null' }],
    },
  },
} as const;

export const paperImplementationValidationCycleCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_key',
    'reviewed_route_candidate_key',
    'target_ref',
    'target_frame_summary',
    'cycle_type',
    'trigger_refs',
    'validation_question',
    'assumptions_under_test',
    'assertion_refs_under_test',
    'decision_if_pass',
    'decision_if_fail',
    'decision_if_inconclusive',
    'expected_information_gain',
    'criteria',
    'budget_envelope',
    'included_context_refs',
    'trace_refs',
    'confirmatory_marker',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    candidate_key: stringId,
    reviewed_route_candidate_key: stringId,
    target_ref: nonLegacyFunctionalRef,
    target_frame_summary: stringId,
    cycle_type: validationCycleTypeSchema,
    trigger_refs: nonLegacyFunctionalRefArray,
    validation_question: stringId,
    assumptions_under_test: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
    assertion_refs_under_test: nonLegacyFunctionalRefArray,
    decision_if_pass: stringId,
    decision_if_fail: stringId,
    decision_if_inconclusive: stringId,
    expected_information_gain: validationCyclePlanningInformationGainSchema,
    criteria: paperImplementationValidationCycleCandidateCriteriaSchema,
    budget_envelope: paperImplementationValidationCycleCandidateBudgetEnvelopeSchema,
    included_context_refs: nonLegacyFunctionalRefArray,
    trace_refs: nonLegacyFunctionalRefArray,
    confirmatory_marker: { type: 'boolean' },
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const paperImplementationValidationCyclePlanningRoleOutputSchema = {
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
    role_slot_id: validationCyclePlanningRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    reviewed_route_proposal_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_proposal_hash: nullableHashString,
    reviewed_route_skeptic_artifact_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_skeptic_artifact_hash: nullableHashString,
    reviewed_candidate_keys: stringArray,
    cycle_candidate_proposals: {
      type: 'array',
      items: paperImplementationValidationCycleCandidateProposalSchema,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_validation_cycle_side_effect: { const: true },
  },
  allOf: [
    {
      if: {
        properties: {
          role_status: { const: 'passed' },
        },
        required: ['role_status'],
      },
      then: {
        required: [
          'reviewed_route_proposal_ref',
          'reviewed_route_proposal_hash',
          'reviewed_route_skeptic_artifact_ref',
          'reviewed_route_skeptic_artifact_hash',
          'reviewed_candidate_keys',
          'cycle_candidate_proposals',
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_validation_cycle_side_effect',
        ],
        properties: {
          reviewed_route_proposal_ref: nonLegacyFunctionalRef,
          reviewed_route_proposal_hash: hashString,
          reviewed_route_skeptic_artifact_ref: nonLegacyFunctionalRef,
          reviewed_route_skeptic_artifact_hash: hashString,
          reviewed_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          cycle_candidate_proposals: {
            type: 'array',
            minItems: 2,
            items: paperImplementationValidationCycleCandidateProposalSchema,
          },
          no_domain_gate_request: { const: true },
          no_queue_side_effect: { const: true },
          no_validation_cycle_side_effect: { const: true },
        },
      },
    },
  ],
} as const;

export const paperImplementationFeasibilityPlanningSourceContextPacketSchema = {
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

export const paperImplementationFeasibilityBudgetEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['budget_ref', 'retry_budget', 'estimated_cost_class'],
  properties: {
    budget_ref: nonLegacyFunctionalRef,
    iteration_budget_ref: nullableNonLegacyFunctionalRef,
    retry_budget: nonNegativeInteger,
    estimated_cost_class: validationCostClassSchema,
    max_runtime: nullableStringId,
    max_compute: nullableStringId,
    max_human_review_count: {
      anyOf: [nonNegativeInteger, { type: 'null' }],
    },
  },
} as const;

export const paperImplementationFeasibilityProbePlanCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_key',
    'reviewed_cycle_candidate_key',
    'reviewed_route_candidate_key',
    'probe_kind',
    'probe_question',
    'plan_summary',
    'expected_information_gain',
    'baseline_gap_status',
    'primary_metric_refs',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'budget_envelope',
    'stop_condition_refs',
    'trace_refs',
    'confirmatory_marker',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    candidate_key: stringId,
    reviewed_cycle_candidate_key: stringId,
    reviewed_route_candidate_key: stringId,
    probe_kind: feasibilityProbeKindSchema,
    probe_question: stringId,
    plan_summary: stringId,
    expected_information_gain: feasibilityPlanningInformationGainSchema,
    baseline_gap_status: validationBaselineGapStatusSchema,
    primary_metric_refs: nonEmptyNonLegacyFunctionalRefArray,
    dataset_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    baseline_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    code_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    config_refs: nonEmptyNonLegacyFunctionalRefArray,
    budget_envelope: paperImplementationFeasibilityBudgetEnvelopeSchema,
    stop_condition_refs: nonEmptyNonLegacyFunctionalRefArray,
    trace_refs: nonEmptyNonLegacyFunctionalRefArray,
    confirmatory_marker: { type: 'boolean' },
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const paperImplementationFeasibilityPlanningRoleOutputSchema = {
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
    role_slot_id: feasibilityPlanningRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    reviewed_validation_cycle_artifact_ref: nullableNonLegacyFunctionalRef,
    reviewed_validation_cycle_artifact_hash: nullableHashString,
    reviewed_route_proposal_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_proposal_hash: nullableHashString,
    reviewed_route_skeptic_artifact_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_skeptic_artifact_hash: nullableHashString,
    reviewed_cycle_candidate_keys: stringArray,
    reviewed_route_candidate_keys: stringArray,
    probe_plan_candidate_proposals: {
      type: 'array',
      items: paperImplementationFeasibilityProbePlanCandidateProposalSchema,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_feasibility_probe_side_effect: { const: true },
    no_experiment_plan_light_side_effect: { const: true },
    no_validation_cycle_side_effect: { const: true },
  },
  allOf: [
    {
      if: {
        properties: {
          role_status: { const: 'passed' },
        },
        required: ['role_status'],
      },
      then: {
        required: [
          'reviewed_validation_cycle_artifact_ref',
          'reviewed_validation_cycle_artifact_hash',
          'reviewed_route_proposal_ref',
          'reviewed_route_proposal_hash',
          'reviewed_route_skeptic_artifact_ref',
          'reviewed_route_skeptic_artifact_hash',
          'reviewed_cycle_candidate_keys',
          'reviewed_route_candidate_keys',
          'probe_plan_candidate_proposals',
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_feasibility_probe_side_effect',
          'no_experiment_plan_light_side_effect',
          'no_validation_cycle_side_effect',
        ],
        properties: {
          reviewed_validation_cycle_artifact_ref: nonLegacyFunctionalRef,
          reviewed_validation_cycle_artifact_hash: hashString,
          reviewed_route_proposal_ref: nonLegacyFunctionalRef,
          reviewed_route_proposal_hash: hashString,
          reviewed_route_skeptic_artifact_ref: nonLegacyFunctionalRef,
          reviewed_route_skeptic_artifact_hash: hashString,
          reviewed_cycle_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          reviewed_route_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          probe_plan_candidate_proposals: {
            type: 'array',
            minItems: 2,
            items: paperImplementationFeasibilityProbePlanCandidateProposalSchema,
          },
          no_domain_gate_request: { const: true },
          no_queue_side_effect: { const: true },
          no_feasibility_probe_side_effect: { const: true },
          no_experiment_plan_light_side_effect: { const: true },
          no_validation_cycle_side_effect: { const: true },
        },
      },
    },
  ],
} as const;

export const paperImplementationCrossBoardSourceContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_ref', 'evidence_kind', 'content_summary', 'key_facts'],
  properties: {
    source_ref: nonLegacyFunctionalRef,
    evidence_kind: stringId,
    content_summary: stringId,
    key_facts: stringArray,
  },
} as const;

export const paperImplementationCrossBoardAnchorSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'board_version_ref',
    'board_version_hash',
    'motive_ref',
    'core_motive_version_ref',
    'trace_manifest_ref',
    'trace_manifest_hash',
    'evidence_binding_refs',
    'source_locator_refs',
    'conflict_refs',
    'challenge_refs',
    'freshness_status',
  ],
  properties: {
    board_version_ref: nonLegacyFunctionalRef,
    board_version_hash: hashString,
    motive_ref: nonLegacyFunctionalRef,
    core_motive_version_ref: nonLegacyFunctionalRef,
    trace_manifest_ref: nonLegacyFunctionalRef,
    trace_manifest_hash: hashString,
    evidence_binding_refs: nonLegacyFunctionalRefArray,
    source_locator_refs: nonLegacyFunctionalRefArray,
    conflict_refs: nonLegacyFunctionalRefArray,
    challenge_refs: nonLegacyFunctionalRefArray,
    freshness_status: motiveFreshnessStatusSchema,
  },
} as const;

export const paperImplementationCrossBoardReusePolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'require_transfer_binding_for_viable_reuse',
    'allow_blocked_reuse_without_transfer_binding',
  ],
  properties: {
    require_transfer_binding_for_viable_reuse: { type: 'boolean' },
    allow_blocked_reuse_without_transfer_binding: { type: 'boolean' },
  },
} as const;

export const paperImplementationCrossBoardScenarioProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'scenario_key',
    'scenario_kind',
    'disposition',
    'source_board_version_refs',
    'source_board_version_hashes',
    'target_motive_refs',
    'evidence_transfer_binding_refs',
    'conflict_refs',
    'challenge_refs',
    'freshness_blockers',
    'source_locator_refs',
    'expected_benefit',
    'risk_codes',
    'blocker_codes',
    'warning_codes',
    'recommended_next_gate',
  ],
  properties: {
    scenario_key: stringId,
    scenario_kind: crossBoardScenarioKindSchema,
    disposition: crossBoardScenarioDispositionSchema,
    source_board_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_board_version_hashes: nonEmptyHashArray,
    target_motive_refs: nonEmptyNonLegacyFunctionalRefArray,
    evidence_transfer_binding_refs: nonLegacyFunctionalRefArray,
    conflict_refs: nonLegacyFunctionalRefArray,
    challenge_refs: nonLegacyFunctionalRefArray,
    freshness_blockers: stringArray,
    source_locator_refs: nonLegacyFunctionalRefArray,
    expected_benefit: stringId,
    risk_codes: stringArray,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    recommended_next_gate: crossBoardRecommendedNextGateSchema,
  },
} as const;

export const paperImplementationCrossBoardSynthesisRoleOutputSchema = {
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
    role_slot_id: crossBoardSynthesisRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    reviewed_board_version_refs: nonLegacyFunctionalRefArray,
    reviewed_conflict_refs: nonLegacyFunctionalRefArray,
    reviewed_challenge_refs: nonLegacyFunctionalRefArray,
    reviewed_evidence_transfer_binding_refs: nonLegacyFunctionalRefArray,
    scenario_proposals: {
      type: 'array',
      items: paperImplementationCrossBoardScenarioProposalSchema,
    },
    blocker_codes: stringArray,
    warning_codes: stringArray,
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_cross_board_review_side_effect: { const: true },
    no_evidence_transfer_binding_side_effect: { const: true },
    no_portfolio_mutation_side_effect: { const: true },
    no_motive_evolution_side_effect: { const: true },
  },
  allOf: [
    {
      if: {
        properties: {
          role_status: { const: 'passed' },
        },
        required: ['role_status'],
      },
      then: {
        required: [
          'reviewed_board_version_refs',
          'reviewed_conflict_refs',
          'reviewed_challenge_refs',
          'reviewed_evidence_transfer_binding_refs',
          'scenario_proposals',
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_cross_board_review_side_effect',
          'no_evidence_transfer_binding_side_effect',
          'no_portfolio_mutation_side_effect',
          'no_motive_evolution_side_effect',
        ],
        properties: {
          reviewed_board_version_refs: nonEmptyNonLegacyFunctionalRefArray,
          scenario_proposals: {
            type: 'array',
            minItems: 1,
            items: paperImplementationCrossBoardScenarioProposalSchema,
          },
          no_domain_gate_request: { const: true },
          no_queue_side_effect: { const: true },
          no_cross_board_review_side_effect: { const: true },
          no_evidence_transfer_binding_side_effect: { const: true },
          no_portfolio_mutation_side_effect: { const: true },
          no_motive_evolution_side_effect: { const: true },
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

// T-124 D2-core: enforced tier decision recorded in the final debate artifact.
// `tier_inputs_hash` is the portable fnv1a identity token of the complexity
// inputs (NOT a sha256), hence stringId rather than hashString.
const paperImplementationDebateTierExecutionContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'debate_policy_id',
    'debate_policy_version',
    'base_tier',
    'effective_tier',
    'tier_upgraded',
    'tier_inputs_hash',
    'tier_rationale_codes',
  ],
  properties: {
    debate_policy_id: stringId,
    debate_policy_version: stringId,
    base_tier: { enum: [...PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS] },
    effective_tier: { enum: [...PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS] },
    tier_upgraded: { type: 'boolean' },
    tier_inputs_hash: stringId,
    tier_rationale_codes: stringArray,
    executed_role_plan: stringArray,
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
    // T-124 D2-core (additive/optional): the enforced tier decision.
    debate_execution: {
      anyOf: [paperImplementationDebateTierExecutionContextSchema, { type: 'null' }],
    },
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

const scientificCanonicalHashString = {
  type: 'string',
  pattern: '^sha256:[0-9a-f]{64}$',
} as const;

export const paperImplementationScientificComparisonFactRefV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['comparison_fact_id', 'comparison_fact_hash'],
  properties: {
    comparison_fact_id: stringId,
    comparison_fact_hash: scientificCanonicalHashString,
  },
} as const;

export const paperImplementationScientificEvidenceRefV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'run_evidence_unit_id', 'content_hash'],
  properties: {
    ordinal: positiveInteger,
    run_evidence_unit_id: stringId,
    content_hash: scientificCanonicalHashString,
  },
} as const;

export const paperImplementationScientificClosureContextV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'validation_cycle_id',
    'closure_watermark_hash',
    'primary_comparison_fact_ref',
    'ordered_evidence_refs',
  ],
  properties: {
    schema_version: { const: 'PaperImplementationScientificClosureContext@v1' },
    validation_cycle_id: stringId,
    closure_watermark_hash: scientificCanonicalHashString,
    primary_comparison_fact_ref: paperImplementationScientificComparisonFactRefV1Schema,
    ordered_evidence_refs: {
      type: 'array',
      minItems: 1,
      items: paperImplementationScientificEvidenceRefV1Schema,
    },
  },
} as const;

export const paperImplementationScientificClosureIntentV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'expected_closure_watermark_hash'],
  properties: {
    schema_version: { const: 'PaperImplementationScientificClosureIntent@v1' },
    expected_closure_watermark_hash: scientificCanonicalHashString,
  },
} as const;

export const paperImplementationScientificClosureProposalV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'validation_cycle_id',
    'closure_watermark_hash',
    'primary_comparison_fact_ref',
    'ordered_evidence_refs',
    'interpretation_summary',
    'reliability_assessment',
    'limitations',
    'claim_ceiling',
  ],
  properties: {
    ...paperImplementationScientificClosureContextV1Schema.properties,
    schema_version: { const: 'PaperImplementationScientificClosureProposal@v1' },
    interpretation_summary: stringId,
    reliability_assessment: paperImplementationResultAnalysisReliabilityAssessmentSchema,
    limitations: {
      type: 'object',
      additionalProperties: false,
      required: ['limitation_refs', 'reliability_notes'],
      properties: {
        limitation_refs: nonLegacyFunctionalRefArray,
        reliability_notes: stringArray,
      },
    },
    claim_ceiling: runtimeClaimStrengthSchema,
  },
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

export const paperImplementationResultAnalysisScientificClosureArtifactSchema = {
  ...paperImplementationResultAnalysisArtifactSchema,
  required: [
    ...paperImplementationResultAnalysisArtifactSchema.required,
    'scientific_closure_proposal',
  ],
  properties: {
    ...paperImplementationResultAnalysisArtifactSchema.properties,
    scientific_closure_proposal: {
      anyOf: [paperImplementationScientificClosureProposalV1Schema, { type: 'null' }],
    },
  },
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

export const paperImplementationRoutePlanningArtifactSchema = {
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
    'route_candidate_proposals',
    'reviewed_route_proposal_ref',
    'reviewed_route_proposal_hash',
    'reviewed_candidate_keys',
    'checked_dimensions',
    'risk_findings',
    'recommended_disposition',
    'no_domain_gate_request',
    'no_queue_side_effect',
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
    slot_id: routePlanningSlotSchema,
    workflow_type: routePlanningWorkflowTypeSchema,
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summary: nullableStringId,
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    route_candidate_proposals: {
      type: 'array',
      items: paperImplementationRouteCandidateProposalSchema,
    },
    reviewed_route_proposal_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_proposal_hash: nullableHashString,
    reviewed_candidate_keys: stringArray,
    checked_dimensions: {
      type: 'array',
      items: routeSkepticRiskDimensionSchema,
    },
    risk_findings: {
      type: 'array',
      items: paperImplementationRouteSkepticFindingSchema,
    },
    recommended_disposition: {
      anyOf: [routeSkepticDispositionSchema, { type: 'null' }],
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
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
      if: { properties: { slot_id: { const: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID } }, required: ['slot_id'] },
      then: {
        properties: {
          workflow_type: { const: 'route_architecture' },
        },
      },
    },
    {
      if: { properties: { slot_id: { const: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID } }, required: ['slot_id'] },
      then: {
        properties: {
          workflow_type: { const: 'route_skeptic_review' },
        },
      },
    },
    {
      if: {
        properties: {
          status: { const: 'passed' },
          slot_id: { const: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID },
        },
        required: ['status', 'slot_id'],
      },
      then: {
        properties: {
          route_candidate_proposals: {
            type: 'array',
            minItems: 2,
            items: paperImplementationRouteCandidateProposalSchema,
          },
        },
      },
    },
    {
      if: {
        properties: {
          status: { const: 'passed' },
          slot_id: { const: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID },
        },
        required: ['status', 'slot_id'],
      },
      then: {
        properties: {
          reviewed_route_proposal_ref: nonLegacyFunctionalRef,
          reviewed_route_proposal_hash: hashString,
          reviewed_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          checked_dimensions: completeRouteSkepticRiskDimensionsSchema,
          risk_findings: {
            type: 'array',
            minItems: 1,
            items: paperImplementationRouteSkepticFindingSchema,
          },
          recommended_disposition: routeSkepticDispositionSchema,
        },
      },
    },
  ],
} as const;

export const paperImplementationValidationCyclePlanningArtifactSchema = {
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
    'reviewed_route_proposal_ref',
    'reviewed_route_proposal_hash',
    'reviewed_route_skeptic_artifact_ref',
    'reviewed_route_skeptic_artifact_hash',
    'reviewed_candidate_keys',
    'cycle_candidate_proposals',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_validation_cycle_side_effect',
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
    slot_id: validationCyclePlanningSlotSchema,
    workflow_type: { const: 'validation_cycle_planning' },
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summary: {
      anyOf: [stringId, { type: 'null' }],
    },
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    reviewed_route_proposal_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_proposal_hash: nullableHashString,
    reviewed_route_skeptic_artifact_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_skeptic_artifact_hash: nullableHashString,
    reviewed_candidate_keys: stringArray,
    cycle_candidate_proposals: {
      type: 'array',
      items: paperImplementationValidationCycleCandidateProposalSchema,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_validation_cycle_side_effect: { const: true },
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
      if: {
        properties: {
          status: { const: 'passed' },
        },
        required: ['status'],
      },
      then: {
        properties: {
          reviewed_route_proposal_ref: nonLegacyFunctionalRef,
          reviewed_route_proposal_hash: hashString,
          reviewed_route_skeptic_artifact_ref: nonLegacyFunctionalRef,
          reviewed_route_skeptic_artifact_hash: hashString,
          reviewed_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          cycle_candidate_proposals: {
            type: 'array',
            minItems: 2,
            items: paperImplementationValidationCycleCandidateProposalSchema,
          },
        },
      },
    },
  ],
} as const;

export const paperImplementationFeasibilityPlanningArtifactSchema = {
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
    'reviewed_validation_cycle_artifact_ref',
    'reviewed_validation_cycle_artifact_hash',
    'reviewed_route_proposal_ref',
    'reviewed_route_proposal_hash',
    'reviewed_route_skeptic_artifact_ref',
    'reviewed_route_skeptic_artifact_hash',
    'reviewed_cycle_candidate_keys',
    'reviewed_route_candidate_keys',
    'probe_plan_candidate_proposals',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_feasibility_probe_side_effect',
    'no_experiment_plan_light_side_effect',
    'no_validation_cycle_side_effect',
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
    slot_id: feasibilityPlanningSlotSchema,
    workflow_type: { const: 'feasibility_planning' },
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summary: {
      anyOf: [stringId, { type: 'null' }],
    },
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    reviewed_validation_cycle_artifact_ref: nullableNonLegacyFunctionalRef,
    reviewed_validation_cycle_artifact_hash: nullableHashString,
    reviewed_route_proposal_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_proposal_hash: nullableHashString,
    reviewed_route_skeptic_artifact_ref: nullableNonLegacyFunctionalRef,
    reviewed_route_skeptic_artifact_hash: nullableHashString,
    reviewed_cycle_candidate_keys: stringArray,
    reviewed_route_candidate_keys: stringArray,
    probe_plan_candidate_proposals: {
      type: 'array',
      items: paperImplementationFeasibilityProbePlanCandidateProposalSchema,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_feasibility_probe_side_effect: { const: true },
    no_experiment_plan_light_side_effect: { const: true },
    no_validation_cycle_side_effect: { const: true },
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
      if: {
        properties: {
          status: { const: 'passed' },
        },
        required: ['status'],
      },
      then: {
        properties: {
          reviewed_validation_cycle_artifact_ref: nonLegacyFunctionalRef,
          reviewed_validation_cycle_artifact_hash: hashString,
          reviewed_route_proposal_ref: nonLegacyFunctionalRef,
          reviewed_route_proposal_hash: hashString,
          reviewed_route_skeptic_artifact_ref: nonLegacyFunctionalRef,
          reviewed_route_skeptic_artifact_hash: hashString,
          reviewed_cycle_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          reviewed_route_candidate_keys: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
          probe_plan_candidate_proposals: {
            type: 'array',
            minItems: 2,
            items: paperImplementationFeasibilityProbePlanCandidateProposalSchema,
          },
        },
      },
    },
  ],
} as const;

export const paperImplementationCrossBoardSynthesisArtifactSchema = {
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
    'board_anchors',
    'reviewed_board_version_refs',
    'reviewed_conflict_refs',
    'reviewed_challenge_refs',
    'reviewed_evidence_transfer_binding_refs',
    'scenario_proposals',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_cross_board_review_side_effect',
    'no_evidence_transfer_binding_side_effect',
    'no_portfolio_mutation_side_effect',
    'no_motive_evolution_side_effect',
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
    slot_id: crossBoardSynthesisSlotSchema,
    workflow_type: { const: 'cross_board_synthesis' },
    target_ref: nonLegacyFunctionalRef,
    preflight_blockers: stringArray,
    role_summary: {
      anyOf: [stringId, { type: 'null' }],
    },
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    board_anchors: {
      type: 'array',
      minItems: 2,
      items: paperImplementationCrossBoardAnchorSchema,
    },
    reviewed_board_version_refs: nonLegacyFunctionalRefArray,
    reviewed_conflict_refs: nonLegacyFunctionalRefArray,
    reviewed_challenge_refs: nonLegacyFunctionalRefArray,
    reviewed_evidence_transfer_binding_refs: nonLegacyFunctionalRefArray,
    scenario_proposals: {
      type: 'array',
      items: paperImplementationCrossBoardScenarioProposalSchema,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_cross_board_review_side_effect: { const: true },
    no_evidence_transfer_binding_side_effect: { const: true },
    no_portfolio_mutation_side_effect: { const: true },
    no_motive_evolution_side_effect: { const: true },
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
      if: {
        properties: {
          status: { const: 'passed' },
        },
        required: ['status'],
      },
      then: {
        properties: {
          reviewed_board_version_refs: nonEmptyNonLegacyFunctionalRefArray,
          scenario_proposals: {
            type: 'array',
            minItems: 1,
            items: paperImplementationCrossBoardScenarioProposalSchema,
          },
        },
      },
    },
  ],
} as const;

export const paperImplementationEvidenceBoardRuntimeControlSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['terminal_code', 'reason_kind', 'details'],
  properties: {
    terminal_code: {
      enum: [
        'preflight_blocked',
        'runtime_retry_exhausted',
        'admission_rejected',
        'admitted_blocked',
      ],
    },
    reason_kind: stringId,
    details: traceIntegrityIdentityObject,
  },
} as const;

export const paperImplementationEvidenceBoardSourceContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'packet_ref',
    'packet_hash',
    'source_ref',
    'source_hash',
    'evidence_kind',
    'content_summary',
    'key_facts',
    'covered_evidence_refs',
    'covered_source_locator_refs',
    'covered_citation_candidate_refs',
    'covered_trace_manifest_refs',
  ],
  properties: {
    packet_ref: nonLegacyFunctionalRef,
    packet_hash: hashString,
    source_ref: nonLegacyFunctionalRef,
    source_hash: hashString,
    evidence_kind: stringId,
    content_summary: stringId,
    key_facts: stringArray,
    covered_evidence_refs: nonLegacyFunctionalRefArray,
    covered_source_locator_refs: nonLegacyFunctionalRefArray,
    covered_citation_candidate_refs: nonLegacyFunctionalRefArray,
    covered_trace_manifest_refs: nonLegacyFunctionalRefArray,
  },
} as const;

export const paperImplementationEvidenceBoardFreshnessPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'stale_evidence_requires_gap_candidate',
    'unreviewed_citation_requires_gap_candidate',
    'duplicate_existing_binding_requires_gap_candidate',
  ],
  properties: {
    stale_evidence_requires_gap_candidate: { type: 'boolean' },
    unreviewed_citation_requires_gap_candidate: { type: 'boolean' },
    duplicate_existing_binding_requires_gap_candidate: { type: 'boolean' },
  },
} as const;

export const paperImplementationEvidenceBoardChallengeCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'memo_or_summary_rejected',
    'locator_quality',
    'citation_status',
    'scope_match_status',
    'freshness_status',
    'should_downgrade_to_gap',
    'downgrade_reason_codes',
    'blocking_reason_codes',
  ],
  properties: {
    memo_or_summary_rejected: { type: 'boolean' },
    locator_quality: { enum: ['verified', 'missing', 'weak'] },
    citation_status: { enum: ['reviewed', 'unreviewed', 'missing'] },
    scope_match_status: { enum: ['matched', 'partial', 'mismatch'] },
    freshness_status: evidenceBoardFreshnessStatusSchema,
    should_downgrade_to_gap: { type: 'boolean' },
    downgrade_reason_codes: stringArray,
    blocking_reason_codes: stringArray,
  },
} as const;

export const paperImplementationEvidenceBoardBindingCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_key',
    'target_assertion_ref',
    'evidence_ref',
    'source_locator_refs',
    'citation_candidate_refs',
    'proposed_role',
    'proposed_scope',
    'proposed_strength',
    'support_state',
    'challenge_status',
    'freshness_status',
    'interpretation',
    'challenge_check',
    'blocker_codes',
    'warning_codes',
    'recommended_next_gate',
  ],
  properties: {
    candidate_key: stringId,
    target_assertion_ref: nonLegacyFunctionalRef,
    evidence_ref: nonLegacyFunctionalRef,
    source_locator_refs: nonLegacyFunctionalRefArray,
    citation_candidate_refs: nonLegacyFunctionalRefArray,
    proposed_role: evidenceBoardCandidateRoleSchema,
    proposed_scope: evidenceBoardCandidateScopeSchema,
    proposed_strength: evidenceBoardCandidateStrengthSchema,
    support_state: evidenceBoardSupportStateSchema,
    challenge_status: evidenceBoardChallengeStatusSchema,
    freshness_status: evidenceBoardFreshnessStatusSchema,
    interpretation: stringId,
    challenge_check: paperImplementationEvidenceBoardChallengeCheckSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    recommended_next_gate: evidenceBoardRecommendedNextGateSchema,
  },
} as const;

export const paperImplementationEvidenceBoardGapCandidateProposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'gap_key',
    'target_assertion_ref',
    'gap_kind',
    'missing_evidence_need',
    'source_locator_blockers',
    'citation_blockers',
    'freshness_blockers',
    'recommended_next_gate',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    gap_key: stringId,
    target_assertion_ref: nonLegacyFunctionalRef,
    gap_kind: evidenceBoardGapKindSchema,
    missing_evidence_need: stringId,
    source_locator_blockers: stringArray,
    citation_blockers: stringArray,
    freshness_blockers: stringArray,
    recommended_next_gate: evidenceBoardRecommendedNextGateSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
} as const;

export const paperImplementationEvidenceBoardCurationRoleOutputSchema = {
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
    role_slot_id: evidenceBoardCurationRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    reviewed_assertion_refs: nonLegacyFunctionalRefArray,
    reviewed_source_locator_refs: nonLegacyFunctionalRefArray,
    reviewed_citation_candidate_refs: nonLegacyFunctionalRefArray,
    reviewed_evidence_refs: nonLegacyFunctionalRefArray,
    reviewed_existing_evidence_binding_refs: nonLegacyFunctionalRefArray,
    binding_candidate_proposals: {
      type: 'array',
      items: paperImplementationEvidenceBoardBindingCandidateProposalSchema,
    },
    gap_candidate_proposals: {
      type: 'array',
      items: paperImplementationEvidenceBoardGapCandidateProposalSchema,
    },
    blocker_codes: stringArray,
    warning_codes: stringArray,
    // T-124 D2-pre2 (additive/optional): tolerated so a stray provider echo
    // validates; the disposition is server-derived, never required here.
    recommended_disposition: {
      anyOf: [evidenceBoardCurationDispositionSchema, { type: 'null' }],
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_board_write_side_effect: { const: true },
    no_evidence_binding_side_effect: { const: true },
    no_evidence_transfer_binding_side_effect: { const: true },
    no_citation_candidate_side_effect: { const: true },
    no_trace_repair_queue_side_effect: { const: true },
  },
  allOf: [
    {
      if: {
        properties: {
          role_status: { const: 'passed' },
        },
        required: ['role_status'],
      },
      then: {
        required: [
          'reviewed_assertion_refs',
          'reviewed_source_locator_refs',
          'reviewed_citation_candidate_refs',
          'reviewed_evidence_refs',
          'reviewed_existing_evidence_binding_refs',
          'binding_candidate_proposals',
          'gap_candidate_proposals',
          'no_domain_gate_request',
          'no_queue_side_effect',
          'no_board_write_side_effect',
          'no_evidence_binding_side_effect',
          'no_evidence_transfer_binding_side_effect',
          'no_citation_candidate_side_effect',
          'no_trace_repair_queue_side_effect',
        ],
      },
    },
  ],
} as const;

export const paperImplementationEvidenceBoardCurationArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'slot_id',
    'workflow_type',
    'curation_mode',
    'target_ref',
    'target_motive_ref',
    'target_core_motive_version_ref',
    'target_board_ref',
    'target_board_hash',
    'target_assertion_refs',
    'preflight_blockers',
    'role_summary',
    'role_blocker_codes',
    'role_warning_codes',
    'blockers',
    'warnings',
    'runtime_failure_code',
    'runtime_control',
    'reviewed_assertion_refs',
    'reviewed_source_locator_refs',
    'reviewed_citation_candidate_refs',
    'reviewed_evidence_refs',
    'reviewed_existing_evidence_binding_refs',
    'binding_candidate_proposals',
    'gap_candidate_proposals',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_board_write_side_effect',
    'no_evidence_binding_side_effect',
    'no_evidence_transfer_binding_side_effect',
    'no_citation_candidate_side_effect',
    'no_trace_repair_queue_side_effect',
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
    slot_id: evidenceBoardCurationSlotSchema,
    workflow_type: { const: 'evidence_board_curation' },
    curation_mode: evidenceBoardCurationModeSchema,
    target_ref: nonLegacyFunctionalRef,
    target_motive_ref: nonLegacyFunctionalRef,
    target_core_motive_version_ref: nonLegacyFunctionalRef,
    target_board_ref: nullableNonLegacyFunctionalRef,
    target_board_hash: {
      anyOf: [hashString, { type: 'null' }],
    },
    target_assertion_refs: nonEmptyNonLegacyFunctionalRefArray,
    preflight_blockers: stringArray,
    role_summary: {
      anyOf: [stringId, { type: 'null' }],
    },
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    runtime_control: {
      anyOf: [paperImplementationEvidenceBoardRuntimeControlSchema, { type: 'null' }],
    },
    reviewed_assertion_refs: nonLegacyFunctionalRefArray,
    reviewed_source_locator_refs: nonLegacyFunctionalRefArray,
    reviewed_citation_candidate_refs: nonLegacyFunctionalRefArray,
    reviewed_evidence_refs: nonLegacyFunctionalRefArray,
    reviewed_existing_evidence_binding_refs: nonLegacyFunctionalRefArray,
    binding_candidate_proposals: {
      type: 'array',
      items: paperImplementationEvidenceBoardBindingCandidateProposalSchema,
    },
    gap_candidate_proposals: {
      type: 'array',
      items: paperImplementationEvidenceBoardGapCandidateProposalSchema,
    },
    // T-124 D2-pre2 (additive/optional): server-derived disposition; the
    // coordinator parks a gaps-only `revise` final as waiting_review.
    recommended_disposition: {
      anyOf: [evidenceBoardCurationDispositionSchema, { type: 'null' }],
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_board_write_side_effect: { const: true },
    no_evidence_binding_side_effect: { const: true },
    no_evidence_transfer_binding_side_effect: { const: true },
    no_citation_candidate_side_effect: { const: true },
    no_trace_repair_queue_side_effect: { const: true },
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
      if: {
        properties: {
          status: { const: 'passed' },
        },
        required: ['status'],
      },
      then: {
        properties: {
          binding_candidate_proposals: {
            type: 'array',
            minItems: 1,
            items: paperImplementationEvidenceBoardBindingCandidateProposalSchema,
          },
        },
      },
    },
  ],
} as const;

export const paperImplementationMotiveDecompositionAssertionContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'packet_ref',
    'packet_hash',
    'assertion_ref',
    'assertion_hash',
    'assertion_text',
    'scope_boundary_summary',
    'covered_evidence_refs',
    'covered_trace_manifest_refs',
    'covered_source_refs',
  ],
  properties: {
    packet_ref: nonLegacyFunctionalRef,
    packet_hash: hashString,
    assertion_ref: nonLegacyFunctionalRef,
    assertion_hash: hashString,
    assertion_text: stringId,
    scope_boundary_summary: stringId,
    covered_evidence_refs: nonLegacyFunctionalRefArray,
    covered_trace_manifest_refs: nonLegacyFunctionalRefArray,
    covered_source_refs: nonLegacyFunctionalRefArray,
  },
} as const;

export const paperImplementationMotiveDecompositionCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'compoundness_status',
    'scope_change_status',
    'evidence_coverage_status',
    'trace_alignment_status',
    'new_claim_risk',
    'human_confirmation_required',
    'blocking_reason_codes',
    'recommended_next_gate',
  ],
  properties: {
    compoundness_status: motiveDecompositionCompoundnessStatusSchema,
    scope_change_status: motiveDecompositionScopeChangeStatusSchema,
    evidence_coverage_status: motiveDecompositionEvidenceCoverageStatusSchema,
    trace_alignment_status: motiveDecompositionTraceAlignmentStatusSchema,
    new_claim_risk: { type: 'boolean' },
    human_confirmation_required: { type: 'boolean' },
    blocking_reason_codes: stringArray,
    recommended_next_gate: motiveDecompositionRecommendedNextGateSchema,
  },
} as const;

export const paperImplementationMotiveDecompositionDraftAssertionCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'candidate_key',
    'source_assertion_ref',
    'candidate_kind',
    'draft_assertion_text',
    'scope_boundary_summary',
    'support_obligation_summary',
    'covered_evidence_refs',
    'covered_source_refs',
    'covered_source_locator_refs',
    'covered_citation_candidate_refs',
    'covered_trace_manifest_refs',
    'decomposition_check',
    'blocker_codes',
    'warning_codes',
    'recommended_next_gate',
  ],
  properties: {
    candidate_key: stringId,
    source_assertion_ref: nonLegacyFunctionalRef,
    candidate_kind: motiveDecompositionCandidateKindSchema,
    draft_assertion_text: stringId,
    scope_boundary_summary: stringId,
    support_obligation_summary: stringId,
    covered_evidence_refs: nonLegacyFunctionalRefArray,
    covered_source_refs: nonLegacyFunctionalRefArray,
    covered_source_locator_refs: nonLegacyFunctionalRefArray,
    covered_citation_candidate_refs: nonLegacyFunctionalRefArray,
    covered_trace_manifest_refs: nonLegacyFunctionalRefArray,
    decomposition_check: paperImplementationMotiveDecompositionCheckSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    recommended_next_gate: motiveDecompositionRecommendedNextGateSchema,
  },
} as const;

const motiveDecompositionResultStatusInvariants = [
  {
    if: {
      properties: {
        decomposition_result_status: { const: 'candidates_proposed' },
      },
      required: ['decomposition_result_status'],
    },
    then: {
      properties: {
        draft_assertion_candidates: {
          type: 'array',
          minItems: 1,
          items: paperImplementationMotiveDecompositionDraftAssertionCandidateSchema,
        },
      },
    },
  },
  {
    if: {
      properties: {
        decomposition_result_status: { const: 'no_decomposition_needed' },
      },
      required: ['decomposition_result_status'],
    },
    then: {
      properties: {
        draft_assertion_candidates: {
          type: 'array',
          maxItems: 0,
          items: paperImplementationMotiveDecompositionDraftAssertionCandidateSchema,
        },
        blocker_codes: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
        blockers: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
      },
    },
  },
  {
    if: {
      properties: {
        decomposition_result_status: { const: 'blocked' },
      },
      required: ['decomposition_result_status'],
    },
    then: {
      properties: {
        blocker_codes: {
          type: 'array',
          minItems: 1,
          items: stringId,
        },
        blockers: {
          type: 'array',
          minItems: 1,
          items: stringId,
        },
      },
    },
  },
] as const;

const motiveDecompositionRoleStatusInvariants = [
  {
    if: {
      properties: {
        decomposition_result_status: { const: 'blocked' },
      },
      required: ['decomposition_result_status'],
    },
    then: {
      properties: {
        role_status: { const: 'blocked' },
      },
    },
  },
  {
    if: {
      properties: {
        decomposition_result_status: {
          enum: ['candidates_proposed', 'no_decomposition_needed'],
        },
      },
      required: ['decomposition_result_status'],
    },
    then: {
      properties: {
        role_status: { const: 'passed' },
      },
    },
  },
] as const;

export const paperImplementationMotiveDecompositionRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    'role_status',
    'summary',
    'cited_source_refs',
    'decomposition_result_status',
    'reviewed_assertion_refs',
    'draft_assertion_candidates',
    'blocker_codes',
    'warning_codes',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_motive_write_side_effect',
    'no_motive_evolution_side_effect',
    'no_board_write_side_effect',
    'no_evidence_binding_side_effect',
    'no_trace_repair_queue_side_effect',
  ],
  properties: {
    role_slot_id: motiveDecompositionRoleSlotSchema,
    role_status: { enum: ['passed', 'blocked'] },
    summary: stringId,
    cited_source_refs: nonLegacyFunctionalRefArray,
    decomposition_result_status: motiveDecompositionResultStatusSchema,
    reviewed_assertion_refs: nonEmptyNonLegacyFunctionalRefArray,
    draft_assertion_candidates: {
      type: 'array',
      items: paperImplementationMotiveDecompositionDraftAssertionCandidateSchema,
    },
    blocker_codes: stringArray,
    warning_codes: stringArray,
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_motive_write_side_effect: { const: true },
    no_motive_evolution_side_effect: { const: true },
    no_board_write_side_effect: { const: true },
    no_evidence_binding_side_effect: { const: true },
    no_trace_repair_queue_side_effect: { const: true },
  },
  allOf: [
    ...motiveDecompositionResultStatusInvariants,
    ...motiveDecompositionRoleStatusInvariants,
  ],
} as const;

export const paperImplementationMotiveDecompositionArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'slot_id',
    'workflow_type',
    'decomposition_mode',
    'target_ref',
    'target_motive_ref',
    'target_core_motive_version_ref',
    'target_assertion_refs',
    'preflight_blockers',
    'decomposition_result_status',
    'role_summary',
    'role_blocker_codes',
    'role_warning_codes',
    'blockers',
    'warnings',
    'runtime_failure_code',
    'reviewed_assertion_refs',
    'draft_assertion_candidates',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_motive_write_side_effect',
    'no_motive_evolution_side_effect',
    'no_board_write_side_effect',
    'no_evidence_binding_side_effect',
    'no_trace_repair_queue_side_effect',
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
    slot_id: motiveDecompositionSlotSchema,
    workflow_type: { const: 'motive_decomposition' },
    decomposition_mode: motiveDecompositionModeSchema,
    target_ref: nonLegacyFunctionalRef,
    target_motive_ref: nonLegacyFunctionalRef,
    target_core_motive_version_ref: nonLegacyFunctionalRef,
    target_assertion_refs: nonEmptyNonLegacyFunctionalRefArray,
    preflight_blockers: stringArray,
    decomposition_result_status: motiveDecompositionResultStatusSchema,
    role_summary: {
      anyOf: [stringId, { type: 'null' }],
    },
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    reviewed_assertion_refs: nonEmptyNonLegacyFunctionalRefArray,
    draft_assertion_candidates: {
      type: 'array',
      items: paperImplementationMotiveDecompositionDraftAssertionCandidateSchema,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_motive_write_side_effect: { const: true },
    no_motive_evolution_side_effect: { const: true },
    no_board_write_side_effect: { const: true },
    no_evidence_binding_side_effect: { const: true },
    no_trace_repair_queue_side_effect: { const: true },
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
    ...motiveDecompositionResultStatusInvariants,
    {
      if: {
        properties: {
          decomposition_result_status: { const: 'blocked' },
        },
        required: ['decomposition_result_status'],
      },
      then: {
        properties: {
          status: { const: 'blocked' },
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
    resume_from_run_id: nullableStringId,
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
    // T-124 D2-core: tier budget cap (null/omitted = unbounded).
    provider_call_budget: { anyOf: [nonNegativeInteger, { type: 'null' }] },
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

// T-124 G4.5 Fix 1: shared source-body packet schema for the back-half
// domain-gate slots (result-analysis + P1 review). `source_hash` carries the B3
// hash fence the runtime enforces against the declared source_hashes.
export const paperImplementationBackHalfSourceContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_ref',
    'source_hash',
    'evidence_kind',
    'content_summary',
    'key_facts',
  ],
  properties: {
    source_ref: nonLegacyFunctionalRef,
    source_hash: hashString,
    evidence_kind: stringId,
    content_summary: stringId,
    key_facts: stringArray,
    // T-124 G5 FIX-A item 6: additive materialized-packet accounting refs.
    failed_run_refs: nonLegacyFunctionalRefArray,
    inconclusive_run_refs: nonLegacyFunctionalRefArray,
    negative_result_refs: nonLegacyFunctionalRefArray,
    stale_or_invalidated_evidence_refs: nonLegacyFunctionalRefArray,
  },
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
    resume_from_run_id: nullableStringId,
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
      items: paperImplementationBackHalfSourceContextPacketSchema,
    },
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
    source_context_packets: {
      type: 'array',
      items: paperImplementationBackHalfSourceContextPacketSchema,
    },
    scientific_closure_intent: paperImplementationScientificClosureIntentV1Schema,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: resultAnalysisRoleOutputsBySlotSchema,
    codex_role_outputs: resultAnalysisRoleOutputsBySlotSchema,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    {
      if: { required: ['scientific_closure_intent'] },
      then: {
        properties: {
          run_mode: { const: 'product' },
          execution_mode: { const: 'provider_llm' },
          source_context_packets: false,
        },
      },
    },
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

export const runPaperImplementationRoutePlanningRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationRoutePlanningRoleOutput:
      paperImplementationRoutePlanningRoleOutputSchema,
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
      const: PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
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
      items: paperImplementationRoutePlanningSourceContextPacketSchema,
    },
    admitted_route_proposal_artifact_ref: nullableNonLegacyFunctionalRef,
    admitted_route_proposal_artifact_hash: nullableHashString,
    reviewed_candidate_keys: stringArray,
    secondary_route_candidate_refs: nonLegacyFunctionalRefArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: routePlanningRoleOutputsBySlotSchema,
    codex_role_outputs: routePlanningRoleOutputsBySlotSchema,
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

export const runPaperImplementationValidationCyclePlanningRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationValidationCyclePlanningRoleOutput:
      paperImplementationValidationCyclePlanningRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
    'admitted_route_proposal_artifact_ref',
    'admitted_route_proposal_artifact_hash',
    'admitted_route_skeptic_artifact_ref',
    'admitted_route_skeptic_artifact_hash',
    'reviewed_candidate_keys',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
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
      items: paperImplementationValidationCyclePlanningSourceContextPacketSchema,
    },
    admitted_route_proposal_artifact_ref: nonLegacyFunctionalRef,
    admitted_route_proposal_artifact_hash: hashString,
    admitted_route_skeptic_artifact_ref: nonLegacyFunctionalRef,
    admitted_route_skeptic_artifact_hash: hashString,
    reviewed_candidate_keys: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
    secondary_route_candidate_refs: nonLegacyFunctionalRefArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: validationCyclePlanningRoleOutputsBySlotSchema,
    codex_role_outputs: validationCyclePlanningRoleOutputsBySlotSchema,
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

export const runPaperImplementationFeasibilityPlanningRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationFeasibilityPlanningRoleOutput:
      paperImplementationFeasibilityPlanningRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
    'admitted_validation_cycle_artifact_ref',
    'admitted_validation_cycle_artifact_hash',
    'admitted_route_proposal_artifact_ref',
    'admitted_route_proposal_artifact_hash',
    'admitted_route_skeptic_artifact_ref',
    'admitted_route_skeptic_artifact_hash',
    'reviewed_cycle_candidate_keys',
    'reviewed_route_candidate_keys',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
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
      items: paperImplementationFeasibilityPlanningSourceContextPacketSchema,
    },
    admitted_validation_cycle_artifact_ref: nonLegacyFunctionalRef,
    admitted_validation_cycle_artifact_hash: hashString,
    admitted_route_proposal_artifact_ref: nonLegacyFunctionalRef,
    admitted_route_proposal_artifact_hash: hashString,
    admitted_route_skeptic_artifact_ref: nonLegacyFunctionalRef,
    admitted_route_skeptic_artifact_hash: hashString,
    reviewed_cycle_candidate_keys: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
    reviewed_route_candidate_keys: {
      type: 'array',
      minItems: 1,
      items: stringId,
    },
    secondary_route_candidate_refs: nonLegacyFunctionalRefArray,
    secondary_validation_cycle_refs: nonLegacyFunctionalRefArray,
    secondary_feasibility_probe_refs: nonLegacyFunctionalRefArray,
    secondary_experiment_plan_light_refs: nonLegacyFunctionalRefArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: feasibilityPlanningRoleOutputsBySlotSchema,
    codex_role_outputs: feasibilityPlanningRoleOutputsBySlotSchema,
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

export const runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationCrossBoardSynthesisRoleOutput:
      paperImplementationCrossBoardSynthesisRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
    'board_anchors',
    'reviewed_board_version_refs',
    'reviewed_conflict_refs',
    'reviewed_challenge_refs',
    'evidence_transfer_binding_refs',
    'reuse_policy',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    cross_board_review_id: false,
    create_cross_board_review_request: false,
    evidence_transfer_binding_request: false,
    motive_portfolio_decision_id: false,
    motive_roles_after_decision: false,
    merged_motives: false,
    split_motives: false,
    motive_evolution_decision_request: false,
    domain_gate_request: false,
    queue_action: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
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
      items: paperImplementationCrossBoardSourceContextPacketSchema,
    },
    board_anchors: {
      type: 'array',
      minItems: 2,
      items: paperImplementationCrossBoardAnchorSchema,
    },
    reviewed_board_version_refs: {
      type: 'array',
      minItems: 2,
      items: nonLegacyFunctionalRef,
    },
    reviewed_conflict_refs: nonLegacyFunctionalRefArray,
    reviewed_challenge_refs: nonLegacyFunctionalRefArray,
    evidence_transfer_binding_refs: nonLegacyFunctionalRefArray,
    reuse_policy: paperImplementationCrossBoardReusePolicySchema,
    secondary_cross_board_review_refs: nonLegacyFunctionalRefArray,
    secondary_evidence_transfer_binding_refs: nonLegacyFunctionalRefArray,
    secondary_motive_assertion_refs: nonLegacyFunctionalRefArray,
    secondary_evidence_binding_refs: nonLegacyFunctionalRefArray,
    secondary_route_refs: nonLegacyFunctionalRefArray,
    secondary_experiment_refs: nonLegacyFunctionalRefArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: crossBoardSynthesisRoleOutputsBySlotSchema,
    codex_role_outputs: crossBoardSynthesisRoleOutputsBySlotSchema,
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

export const runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationEvidenceBoardCurationRoleOutput:
      paperImplementationEvidenceBoardCurationRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'curation_mode',
    'target_ref',
    'target_motive_ref',
    'target_core_motive_version_ref',
    'target_assertion_refs',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
    'trace_manifest_refs',
    'trace_manifest_hashes',
    'source_locator_refs',
    'citation_candidate_refs',
    'reviewed_citation_candidate_refs',
    'evidence_refs',
    'existing_evidence_binding_refs',
    'existing_bound_evidence_refs',
    'freshness_policy',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    agent_workflow_harness_run_id: false,
    implementation_proposal_artifact: false,
    motive_evidence_board_version_id: false,
    board_draft: false,
    board_summary: false,
    board_state: false,
    bindings: false,
    create_board_request: false,
    create_motive_evidence_board_version_request: false,
    create_evidence_binding_request: false,
    evidence_binding_id: false,
    update_existing_binding_proposals: false,
    remove_binding_proposals: false,
    board_summary_patch: false,
    board_state_patch: false,
    evidence_transfer_binding_request: false,
    citation_candidate_request: false,
    trace_repair_queue_item: false,
    domain_gate_request: false,
    queue_action: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    curation_mode: evidenceBoardCurationModeSchema,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    target_motive_ref: nonLegacyFunctionalRef,
    target_core_motive_version_ref: nonLegacyFunctionalRef,
    target_board_ref: nullableNonLegacyFunctionalRef,
    target_board_hash: {
      anyOf: [hashString, { type: 'null' }],
    },
    target_assertion_refs: nonEmptyNonLegacyFunctionalRefArray,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    source_context_packets: {
      type: 'array',
      items: paperImplementationEvidenceBoardSourceContextPacketSchema,
    },
    trace_manifest_refs: nonEmptyNonLegacyFunctionalRefArray,
    trace_manifest_hashes: nonEmptyHashArray,
    source_locator_refs: nonLegacyFunctionalRefArray,
    citation_candidate_refs: nonLegacyFunctionalRefArray,
    reviewed_citation_candidate_refs: nonLegacyFunctionalRefArray,
    evidence_refs: nonEmptyNonLegacyFunctionalRefArray,
    existing_evidence_binding_refs: nonLegacyFunctionalRefArray,
    existing_bound_evidence_refs: nonLegacyFunctionalRefArray,
    accepted_risk_refs: nonLegacyFunctionalRefArray,
    freshness_policy: paperImplementationEvidenceBoardFreshnessPolicySchema,
    secondary_evidence_transfer_binding_refs: nonLegacyFunctionalRefArray,
    secondary_cross_board_review_refs: nonLegacyFunctionalRefArray,
    secondary_trace_repair_queue_refs: nonLegacyFunctionalRefArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: evidenceBoardCurationRoleOutputsBySlotSchema,
    codex_role_outputs: evidenceBoardCurationRoleOutputsBySlotSchema,
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
    {
      if: { properties: { curation_mode: { const: 'curate_existing_board' } }, required: ['curation_mode'] },
      then: {
        required: ['target_board_ref', 'target_board_hash'],
      },
    },
    {
      if: { properties: { curation_mode: { const: 'seed_initial_board_candidates' } }, required: ['curation_mode'] },
      then: {
        properties: {
          target_board_ref: false,
          target_board_hash: false,
          existing_evidence_binding_refs: {
            type: 'array',
            maxItems: 0,
          },
          existing_bound_evidence_refs: {
            type: 'array',
            maxItems: 0,
          },
        },
      },
    },
  ],
} as const;

export const runPaperImplementationMotiveDecompositionRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationMotiveDecompositionRoleOutput:
      paperImplementationMotiveDecompositionRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'decomposition_mode',
    'target_ref',
    'target_motive_ref',
    'target_core_motive_version_ref',
    'target_assertion_refs',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'source_refs',
    'source_hashes',
    'assertion_context_packets',
    'trace_manifest_refs',
    'trace_manifest_hashes',
    'source_locator_refs',
    'citation_candidate_refs',
    'evidence_refs',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    agent_workflow_harness_run_id: false,
    implementation_proposal_artifact: false,
    source_assertion_reviews: false,
    assertion_id: false,
    candidate_assertion_ref: false,
    create_motive_assertion_input: false,
    CreateMotiveAssertionInput: false,
    motive_assertion_create_request: false,
    core_motive_version_patch: false,
    motive_evolution_decision_request: false,
    domain_gate_request: false,
    queue_action: false,
    board_draft: false,
    create_evidence_binding_request: false,
    trace_repair_queue_item: false,
    rendered_prompt_text: false,
    raw_provider_output: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    decomposition_mode: motiveDecompositionModeSchema,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    target_motive_ref: nonLegacyFunctionalRef,
    target_core_motive_version_ref: nonLegacyFunctionalRef,
    target_assertion_refs: nonEmptyNonLegacyFunctionalRefArray,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    assertion_context_packets: {
      type: 'array',
      minItems: 1,
      items: paperImplementationMotiveDecompositionAssertionContextPacketSchema,
    },
    trace_manifest_refs: nonEmptyNonLegacyFunctionalRefArray,
    trace_manifest_hashes: nonEmptyHashArray,
    source_locator_refs: nonLegacyFunctionalRefArray,
    citation_candidate_refs: nonLegacyFunctionalRefArray,
    evidence_refs: nonEmptyNonLegacyFunctionalRefArray,
    accepted_risk_refs: nonLegacyFunctionalRefArray,
    admitted_upstream_artifact_refs: nonLegacyFunctionalRefArray,
    admitted_upstream_artifact_hashes: hashArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: motiveDecompositionRoleOutputsBySlotSchema,
    codex_role_outputs: motiveDecompositionRoleOutputsBySlotSchema,
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

export const paperImplementationMotiveEvolutionContextPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'packet_ref',
    'packet_hash',
    'packet_kind',
    'content_summary',
    'key_facts',
    'covered_target_refs',
    'covered_evidence_refs',
    'covered_trace_manifest_refs',
    'covered_source_refs',
  ],
  properties: {
    packet_ref: nonLegacyFunctionalRef,
    packet_hash: hashString,
    packet_kind: motiveEvolutionContextPacketKindSchema,
    content_summary: stringId,
    key_facts: stringArray,
    covered_target_refs: nonEmptyNonLegacyFunctionalRefArray,
    covered_evidence_refs: nonLegacyFunctionalRefArray,
    covered_trace_manifest_refs: nonLegacyFunctionalRefArray,
    covered_source_refs: nonLegacyFunctionalRefArray,
  },
} as const;

export const paperImplementationMotiveEvolutionChallengeCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_status',
    'trace_status',
    'portfolio_status',
    'human_confirmation_status',
    'downstream_impact_status',
    'blocking_reason_codes',
  ],
  properties: {
    evidence_status: motiveEvolutionCheckStatusSchema,
    trace_status: motiveEvolutionCheckStatusSchema,
    portfolio_status: motiveEvolutionCheckStatusSchema,
    human_confirmation_status: motiveEvolutionCheckStatusSchema,
    downstream_impact_status: motiveEvolutionCheckStatusSchema,
    blocking_reason_codes: stringArray,
  },
  anyOf: [
    {
      properties: {
        evidence_status: { const: 'blocked' },
      },
      required: ['evidence_status'],
    },
    {
      properties: {
        trace_status: { const: 'blocked' },
      },
      required: ['trace_status'],
    },
    {
      properties: {
        portfolio_status: { const: 'blocked' },
      },
      required: ['portfolio_status'],
    },
    {
      properties: {
        human_confirmation_status: { const: 'blocked' },
      },
      required: ['human_confirmation_status'],
    },
    {
      properties: {
        downstream_impact_status: { const: 'blocked' },
      },
      required: ['downstream_impact_status'],
    },
    {
      properties: {
        blocking_reason_codes: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
      },
      required: ['blocking_reason_codes'],
    },
  ],
  if: {
    anyOf: [
      {
        properties: {
          evidence_status: { const: 'blocked' },
        },
        required: ['evidence_status'],
      },
      {
        properties: {
          trace_status: { const: 'blocked' },
        },
        required: ['trace_status'],
      },
      {
        properties: {
          portfolio_status: { const: 'blocked' },
        },
        required: ['portfolio_status'],
      },
      {
        properties: {
          human_confirmation_status: { const: 'blocked' },
        },
        required: ['human_confirmation_status'],
      },
      {
        properties: {
          downstream_impact_status: { const: 'blocked' },
        },
        required: ['downstream_impact_status'],
      },
    ],
  },
  then: {
    properties: {
      blocking_reason_codes: {
        type: 'array',
        minItems: 1,
        items: stringId,
      },
    },
  },
} as const;

const motiveEvolutionPortfolioChangingOptionKinds = [
  'supersede',
  'merge',
  'split',
  'park',
  'abandon',
] as const;
const motiveEvolutionPortfolioChangingImpactClasses = [
  'semantic_version_change',
  'portfolio_role_change',
  'primary_or_active_set_change',
  'lineage_change',
] as const;
const motiveEvolutionHumanConfirmationGateSchema = {
  enum: ['motive_evolution_review', 'portfolio_decision_review', 'human_confirmation'],
} as const;
const motiveEvolutionOptionHumanGateInvariants = [
  {
    if: {
      properties: {
        option_kind: {
          enum: [...motiveEvolutionPortfolioChangingOptionKinds],
        },
      },
      required: ['option_kind'],
    },
    then: {
      properties: {
        human_confirmation_required: { const: true },
      },
    },
  },
  {
    if: {
      properties: {
        portfolio_impact_class: {
          enum: [...motiveEvolutionPortfolioChangingImpactClasses],
        },
      },
      required: ['portfolio_impact_class'],
    },
    then: {
      properties: {
        human_confirmation_required: { const: true },
      },
    },
  },
  {
    if: {
      properties: {
        human_confirmation_required: { const: true },
      },
      required: ['human_confirmation_required'],
    },
    then: {
      properties: {
        recommended_next_gate: motiveEvolutionHumanConfirmationGateSchema,
      },
    },
  },
] as const;

export const paperImplementationMotiveEvolutionDesignedOptionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'option_kind',
    'supporting_refs',
    'challenging_refs',
    'portfolio_impact_class',
    'human_confirmation_required',
    'recommended_next_gate',
    'blocker_codes',
    'warning_codes',
  ],
  properties: {
    option_kind: motiveEvolutionOptionKindSchema,
    supporting_refs: nonLegacyFunctionalRefArray,
    challenging_refs: nonLegacyFunctionalRefArray,
    portfolio_impact_class: motiveEvolutionPortfolioImpactClassSchema,
    human_confirmation_required: { type: 'boolean' },
    recommended_next_gate: motiveEvolutionRecommendedNextGateSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
  },
  allOf: [...motiveEvolutionOptionHumanGateInvariants],
} as const;

export const paperImplementationMotiveEvolutionDecisionOptionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'option_kind',
    'supporting_refs',
    'challenging_refs',
    'portfolio_impact_class',
    'human_confirmation_required',
    'recommended_next_gate',
    'blocker_codes',
    'warning_codes',
    'challenge_check',
  ],
  properties: {
    option_kind: motiveEvolutionOptionKindSchema,
    supporting_refs: nonLegacyFunctionalRefArray,
    challenging_refs: nonLegacyFunctionalRefArray,
    portfolio_impact_class: motiveEvolutionPortfolioImpactClassSchema,
    human_confirmation_required: { type: 'boolean' },
    recommended_next_gate: motiveEvolutionRecommendedNextGateSchema,
    blocker_codes: stringArray,
    warning_codes: stringArray,
    challenge_check: paperImplementationMotiveEvolutionChallengeCheckSchema,
  },
  allOf: [...motiveEvolutionOptionHumanGateInvariants],
} as const;

const paperImplementationMotiveEvolutionDesignedOptionsByKeySchema = {
  type: 'object',
  propertyNames: stringId,
  additionalProperties: paperImplementationMotiveEvolutionDesignedOptionSchema,
} as const;

const paperImplementationMotiveEvolutionDecisionOptionsByKeySchema = {
  type: 'object',
  propertyNames: stringId,
  additionalProperties: paperImplementationMotiveEvolutionDecisionOptionSchema,
} as const;

const motiveEvolutionRoleStatusInvariants = [
  {
    if: {
      properties: {
        support_result_status: { const: 'blocked' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        role_status: { const: 'blocked' },
        blocker_codes: {
          type: 'array',
          minItems: 1,
          items: stringId,
        },
      },
    },
  },
  {
    if: {
      properties: {
        support_result_status: {
          enum: ['options_proposed', 'no_evolution_needed'],
        },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        role_status: { const: 'passed' },
      },
    },
  },
] as const;

const motiveEvolutionDesignedOptionResultInvariants = [
  {
    if: {
      properties: {
        support_result_status: { const: 'options_proposed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        designed_options: {
          ...paperImplementationMotiveEvolutionDesignedOptionsByKeySchema,
          minProperties: 1,
        },
      },
    },
  },
  {
    if: {
      properties: {
        support_result_status: { const: 'no_evolution_needed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        designed_options: {
          ...paperImplementationMotiveEvolutionDesignedOptionsByKeySchema,
          maxProperties: 0,
        },
        blocker_codes: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
      },
    },
  },
] as const;

const motiveEvolutionDecisionOptionResultInvariants = [
  {
    if: {
      properties: {
        support_result_status: { const: 'options_proposed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        challenged_option_keys: nonEmptyUniqueStringArray,
        decision_options: {
          ...paperImplementationMotiveEvolutionDecisionOptionsByKeySchema,
          minProperties: 1,
        },
      },
    },
  },
  {
    if: {
      properties: {
        support_result_status: { const: 'no_evolution_needed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        challenged_option_keys: {
          type: 'array',
          maxItems: 0,
          uniqueItems: true,
          items: stringId,
        },
        decision_options: {
          ...paperImplementationMotiveEvolutionDecisionOptionsByKeySchema,
          maxProperties: 0,
        },
        blocker_codes: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
        blockers: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
      },
    },
  },
] as const;

// T-133 P2 (final-artifact-only — the shared decision-option invariants above
// are also spliced into the challenger ROLE schema where this field cannot
// exist): a final that proposed no options cannot carry human-decision keys.
const motiveEvolutionHumanDecisionKeysInvariants = [
  {
    if: {
      properties: {
        support_result_status: { const: 'no_evolution_needed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        human_decision_required_option_keys: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
      },
    },
  },
] as const;

const motiveEvolutionFinalStatusInvariants = [
  {
    if: {
      properties: {
        status: { const: 'passed' },
      },
      required: ['status'],
    },
    then: {
      properties: {
        support_result_status: {
          enum: ['options_proposed', 'no_evolution_needed'],
        },
        runtime_failure_code: { type: 'null' },
      },
    },
  },
  {
    if: {
      properties: {
        status: { const: 'blocked' },
      },
      required: ['status'],
    },
    then: {
      properties: {
        // T-133 P3 review fix (pre-existing divergence made load-bearing by the
        // mixed-defect red line): a blocked FINAL legitimately carries the
        // challenger's honest `options_proposed` when the block came from
        // aggregated option-level codes on a PASSED critique (gs-001 live-015 /
        // gs-002 live-004 evidence); `blocked` remains the role-blocked /
        // preflight shape. The ROLE-level result-status interlock is unchanged.
        support_result_status: { enum: ['blocked', 'options_proposed'] },
        runtime_failure_code: { type: 'null' },
        blockers: {
          type: 'array',
          minItems: 1,
          items: stringId,
        },
      },
    },
  },
  {
    if: {
      properties: {
        status: { const: 'failed_runtime' },
      },
      required: ['status'],
    },
    then: {
      properties: {
        support_result_status: { const: 'blocked' },
        runtime_failure_code: stringId,
        decision_options: {
          ...paperImplementationMotiveEvolutionDecisionOptionsByKeySchema,
          maxProperties: 0,
        },
        human_decision_required_option_keys: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
        blockers: {
          type: 'array',
          minItems: 1,
          items: stringId,
        },
      },
    },
  },
] as const;

const motiveEvolutionIdentityJsonValue = {
  $ref: '#/$defs/paperImplementationMotiveEvolutionIdentityJsonValue',
} as const;
const motiveEvolutionForbiddenIdentityPayloadKeyGuard = {
  not: {
    enum: [
      ...PAPER_IMPLEMENTATION_RUNTIME_FORBIDDEN_PAYLOAD_KEYS,
      'raw_provider_output',
      'cached_prior_output',
      'writer_dto_payload',
      'domain_gate_request',
      'queue_action',
      'CreateMotiveEvolutionDecisionRequest',
      'create_motive_evolution_decision_request',
      'motive_evolution_decision_request',
      'ApplyMotivePortfolioDecisionRequest',
      'apply_motive_portfolio_decision_request',
      'motive_roles_after_decision',
      'change_set',
      'core_motive_version_patch',
      'application_status',
      'debate_transcript',
      'source_by_source_reviews',
    ],
  },
} as const;
const motiveEvolutionIdentityObject = {
  type: 'object',
  propertyNames: motiveEvolutionForbiddenIdentityPayloadKeyGuard,
  additionalProperties: motiveEvolutionIdentityJsonValue,
} as const;

const motiveEvolutionRoleOutputBaseRequired = [
  'role_status',
  'summary',
  'cited_source_refs',
  'support_result_status',
  'blocker_codes',
  'warning_codes',
  'no_domain_gate_request',
  'no_queue_side_effect',
  'no_motive_write_side_effect',
  'no_motive_evolution_side_effect',
  'no_portfolio_mutation_side_effect',
  'no_board_write_side_effect',
  'no_evidence_binding_side_effect',
  'no_trace_repair_queue_side_effect',
] as const;
const motiveEvolutionRoleOutputBaseProperties = {
  role_status: { enum: ['passed', 'blocked'] },
  summary: stringId,
  cited_source_refs: nonLegacyFunctionalRefArray,
  support_result_status: motiveEvolutionResultStatusSchema,
  blocker_codes: stringArray,
  warning_codes: stringArray,
  no_domain_gate_request: { const: true },
  no_queue_side_effect: { const: true },
  no_motive_write_side_effect: { const: true },
  no_motive_evolution_side_effect: { const: true },
  no_portfolio_mutation_side_effect: { const: true },
  no_board_write_side_effect: { const: true },
  no_evidence_binding_side_effect: { const: true },
  no_trace_repair_queue_side_effect: { const: true },
} as const;

export const paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    ...motiveEvolutionRoleOutputBaseRequired,
    'reviewed_target_motive_refs',
    'reviewed_core_motive_version_refs',
    'designed_options',
    'option_set_hash',
  ],
  properties: {
    role_slot_id: motiveEvolutionOptionDesignerRoleSlotSchema,
    ...motiveEvolutionRoleOutputBaseProperties,
    reviewed_target_motive_refs: nonEmptyNonLegacyFunctionalRefArray,
    reviewed_core_motive_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    designed_options: paperImplementationMotiveEvolutionDesignedOptionsByKeySchema,
    option_set_hash: hashString,
  },
  allOf: [
    ...motiveEvolutionRoleStatusInvariants,
    ...motiveEvolutionDesignedOptionResultInvariants,
  ],
} as const;

export const paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    ...motiveEvolutionRoleOutputBaseRequired,
    'designer_role_artifact_ref',
    'designer_role_artifact_hash',
    'option_set_hash',
    'challenged_option_keys',
    'decision_options',
  ],
  properties: {
    role_slot_id: motiveEvolutionRiskChallengerRoleSlotSchema,
    ...motiveEvolutionRoleOutputBaseProperties,
    designer_role_artifact_ref: nonLegacyFunctionalRef,
    designer_role_artifact_hash: hashString,
    option_set_hash: hashString,
    challenged_option_keys: uniqueStringArray,
    decision_options: paperImplementationMotiveEvolutionDecisionOptionsByKeySchema,
  },
  allOf: [
    ...motiveEvolutionRoleStatusInvariants,
    ...motiveEvolutionDecisionOptionResultInvariants,
  ],
} as const;

export const paperImplementationMotiveEvolutionRoleOutputSchema = {
  oneOf: [
    paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema,
    paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema,
  ],
} as const;

/**
 * T-124 S3-β1 provider wire encoding (gs001-lora-live-004 root cause).
 *
 * The canonical role outputs above carry the designed/decision options as
 * by-key maps (`propertyNames` + schema-valued `additionalProperties`). That
 * shape is unrepresentable in OpenAI strict structured output: the gateway
 * normalizer must force `additionalProperties: false` + `properties: {}` on
 * every object node, which degrades the option maps to grammar-level
 * always-empty objects — the model physically cannot emit a non-empty option
 * set, while the canonical invariants require a non-empty set whenever
 * `support_result_status='options_proposed'`. Every options-proposing
 * provider output therefore deterministically failed ajv with
 * SCHEMA_VALIDATION_FAILED.
 *
 * The wire schemas below are what provider_llm calls send and validate:
 * identical semantics and guardrails, but the option maps are encoded as
 * entry arrays with an explicit `option_key`. The runtime service
 * canonicalizes wire entries back into the by-key maps before recording or
 * semantically checking anything, so persisted artifacts, admission, and all
 * downstream consumers keep the canonical shape. Non-provider modes
 * (mocked/codex) keep the canonical schema unchanged.
 * `option_key` uniqueness is not expressible portably in JSON Schema and is
 * enforced by the service during canonicalization (retryable technical
 * failure).
 */
export const paperImplementationMotiveEvolutionDesignedOptionEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'option_key',
    ...paperImplementationMotiveEvolutionDesignedOptionSchema.required,
  ],
  properties: {
    option_key: stringId,
    ...paperImplementationMotiveEvolutionDesignedOptionSchema.properties,
  },
  allOf: [...motiveEvolutionOptionHumanGateInvariants],
} as const;

/**
 * T-124 G4.6 Fix 2 (run 010/011 challenger SCHEMA_VALIDATION_FAILED root cause):
 * the challenger's wire faces keep only strict-mode-stable SHAPE constraints.
 * The canonical `challenge_check` interlocks (anyOf "some status blocked OR no
 * blocking reason codes" + if/then "blocked status ⇒ non-empty reason codes")
 * and the per-option human-gate conditionals are unenforceable in provider
 * strict grammar (types/required/enum only) yet all-or-nothing at the local
 * ajv gate — a single option-level slip discarded the whole output as an
 * opaque SCHEMA_VALIDATION_FAILED. Those invariants are NOT relaxed: they
 * moved to the motive-evolution runtime service post-parse semantic checks
 * (`MOTIVE_EVOLUTION_BOUNDARY_BLOCKER_MISSING`,
 * `MOTIVE_EVOLUTION_CHALLENGE_CHECK_INCONSISTENT`,
 * `MOTIVE_EVOLUTION_HUMAN_CONFIRMATION_GATE_MISSING`,
 * `MOTIVE_EVOLUTION_RESULT_STATUS_INVALID`,
 * `MOTIVE_EVOLUTION_CHALLENGE_COVERAGE_MISSING`), which run on the
 * canonicalized output with actionable failure codes and the bounded retry
 * channel. The canonical (non-wire) schemas are unchanged.
 */
const motiveEvolutionWireChallengeCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_status',
    'trace_status',
    'portfolio_status',
    'human_confirmation_status',
    'downstream_impact_status',
    'blocking_reason_codes',
  ],
  properties: {
    evidence_status: motiveEvolutionCheckStatusSchema,
    trace_status: motiveEvolutionCheckStatusSchema,
    portfolio_status: motiveEvolutionCheckStatusSchema,
    human_confirmation_status: motiveEvolutionCheckStatusSchema,
    downstream_impact_status: motiveEvolutionCheckStatusSchema,
    blocking_reason_codes: stringArray,
  },
} as const;

export const paperImplementationMotiveEvolutionDecisionOptionEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'option_key',
    ...paperImplementationMotiveEvolutionDecisionOptionSchema.required,
  ],
  properties: {
    option_key: stringId,
    ...paperImplementationMotiveEvolutionDesignedOptionSchema.properties,
    challenge_check: motiveEvolutionWireChallengeCheckSchema,
  },
} as const;

const motiveEvolutionDesignedOptionEntryResultInvariants = [
  {
    if: {
      properties: {
        support_result_status: { const: 'options_proposed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        designed_option_entries: {
          type: 'array',
          minItems: 1,
          items: paperImplementationMotiveEvolutionDesignedOptionEntrySchema,
        },
      },
    },
  },
  {
    if: {
      properties: {
        support_result_status: { const: 'no_evolution_needed' },
      },
      required: ['support_result_status'],
    },
    then: {
      properties: {
        designed_option_entries: {
          type: 'array',
          maxItems: 0,
          items: paperImplementationMotiveEvolutionDesignedOptionEntrySchema,
        },
        blocker_codes: {
          type: 'array',
          maxItems: 0,
          items: stringId,
        },
      },
    },
  },
] as const;

export const paperImplementationMotiveEvolutionOptionDesignerRoleWireOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    ...motiveEvolutionRoleOutputBaseRequired,
    'reviewed_target_motive_refs',
    'reviewed_core_motive_version_refs',
    'designed_option_entries',
    'option_set_hash',
  ],
  properties: {
    role_slot_id: motiveEvolutionOptionDesignerRoleSlotSchema,
    ...motiveEvolutionRoleOutputBaseProperties,
    reviewed_target_motive_refs: nonEmptyNonLegacyFunctionalRefArray,
    reviewed_core_motive_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    designed_option_entries: {
      type: 'array',
      items: paperImplementationMotiveEvolutionDesignedOptionEntrySchema,
    },
    option_set_hash: hashString,
  },
  allOf: [
    ...motiveEvolutionRoleStatusInvariants,
    ...motiveEvolutionDesignedOptionEntryResultInvariants,
  ],
} as const;

/**
 * T-124 G4.6 Fix 2: challenger wire face = strict-stable shape only (structural
 * trunk: role base fields + eight side-effect guards + designer echo fields +
 * option-key entry array with the `challenge_check` trunk). The role/result
 * status interlocks, per-option human-gate conditionals, option-count
 * conditionals, `challenge_check` linkage, and key uniqueness are enforced by
 * the runtime service post-parse semantic checks on the canonicalized output
 * (see the wire challenge-check note above) — moved, not deleted. The designer
 * wire schema is unchanged (it has been strict-stable in live runs).
 */
export const paperImplementationMotiveEvolutionRiskChallengerRoleWireOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'role_slot_id',
    ...motiveEvolutionRoleOutputBaseRequired,
    'designer_role_artifact_ref',
    'designer_role_artifact_hash',
    'option_set_hash',
    'challenged_option_keys',
    'decision_option_entries',
  ],
  properties: {
    role_slot_id: motiveEvolutionRiskChallengerRoleSlotSchema,
    ...motiveEvolutionRoleOutputBaseProperties,
    designer_role_artifact_ref: nonLegacyFunctionalRef,
    designer_role_artifact_hash: hashString,
    option_set_hash: hashString,
    challenged_option_keys: stringArray,
    decision_option_entries: {
      type: 'array',
      items: paperImplementationMotiveEvolutionDecisionOptionEntrySchema,
    },
  },
} as const;

export const paperImplementationMotiveEvolutionArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationMotiveEvolutionIdentityJsonValue: {
      anyOf: [
        { type: 'null' },
        { type: 'boolean' },
        { type: 'number' },
        { type: 'string' },
        {
          type: 'array',
          items: motiveEvolutionIdentityJsonValue,
        },
        motiveEvolutionIdentityObject,
      ],
    },
  },
  required: [
    'status',
    'slot_id',
    'workflow_type',
    'target_ref',
    'target_motive_refs',
    'target_core_motive_version_refs',
    'preflight_blockers',
    'support_result_status',
    'role_summary',
    'role_blocker_codes',
    'role_warning_codes',
    'blockers',
    'warnings',
    'runtime_failure_code',
    'decision_options',
    'no_domain_gate_request',
    'no_queue_side_effect',
    'no_motive_write_side_effect',
    'no_motive_evolution_side_effect',
    'no_portfolio_mutation_side_effect',
    'no_board_write_side_effect',
    'no_evidence_binding_side_effect',
    'no_trace_repair_queue_side_effect',
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
    slot_id: motiveEvolutionSlotSchema,
    workflow_type: { const: 'motive_evolution' },
    target_ref: nonLegacyFunctionalRef,
    target_motive_refs: nonEmptyNonLegacyFunctionalRefArray,
    target_core_motive_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    preflight_blockers: stringArray,
    support_result_status: motiveEvolutionResultStatusSchema,
    role_summary: {
      anyOf: [stringId, { type: 'null' }],
    },
    role_blocker_codes: stringArray,
    role_warning_codes: stringArray,
    blockers: stringArray,
    warnings: stringArray,
    runtime_failure_code: nullableStringId,
    decision_options: paperImplementationMotiveEvolutionDecisionOptionsByKeySchema,
    human_decision_required_option_keys: {
      type: 'array',
      uniqueItems: true,
      items: stringId,
    },
    no_domain_gate_request: { const: true },
    no_queue_side_effect: { const: true },
    no_motive_write_side_effect: { const: true },
    no_motive_evolution_side_effect: { const: true },
    no_portfolio_mutation_side_effect: { const: true },
    no_board_write_side_effect: { const: true },
    no_evidence_binding_side_effect: { const: true },
    no_trace_repair_queue_side_effect: { const: true },
    role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_artifact_hashes: nonEmptyHashArray,
    admitted_role_artifact_refs: nonEmptyNonLegacyFunctionalRefArray,
    admitted_role_artifact_hashes: nonEmptyHashArray,
    role_prompt_packet_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_prompt_packet_hashes: nonEmptyHashArray,
    role_token_budget_gate_result_refs: nonEmptyNonLegacyFunctionalRefArray,
    role_compression_report_refs: nonLegacyFunctionalRefArray,
    runtime_identity: motiveEvolutionIdentityObject,
    cache_identity: motiveEvolutionIdentityObject,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hash_bundle_hash: hashString,
  },
  allOf: [
    ...motiveEvolutionFinalStatusInvariants,
    ...motiveEvolutionDecisionOptionResultInvariants,
    ...motiveEvolutionHumanDecisionKeysInvariants,
    {
      if: {
        properties: {
          support_result_status: { const: 'blocked' },
        },
        required: ['support_result_status'],
      },
      then: {
        properties: {
          blockers: {
            type: 'array',
            minItems: 1,
            items: stringId,
          },
        },
      },
    },
  ],
} as const;

const motiveEvolutionOptionalRefHashPairInvariants = [
  {
    if: { required: ['validation_cycle_refs'] },
    then: { required: ['validation_cycle_hashes'] },
  },
  {
    if: { required: ['validation_cycle_hashes'] },
    then: { required: ['validation_cycle_refs'] },
  },
  {
    if: { required: ['result_packet_refs'] },
    then: { required: ['result_packet_hashes'] },
  },
  {
    if: { required: ['result_packet_hashes'] },
    then: { required: ['result_packet_refs'] },
  },
  {
    if: { required: ['cross_board_review_refs'] },
    then: { required: ['cross_board_review_hashes'] },
  },
  {
    if: { required: ['cross_board_review_hashes'] },
    then: { required: ['cross_board_review_refs'] },
  },
  {
    if: { required: ['prior_evolution_decision_refs'] },
    then: { required: ['prior_evolution_decision_hashes'] },
  },
  {
    if: { required: ['prior_evolution_decision_hashes'] },
    then: { required: ['prior_evolution_decision_refs'] },
  },
  {
    if: { required: ['prior_portfolio_decision_refs'] },
    then: { required: ['prior_portfolio_decision_hashes'] },
  },
  {
    if: { required: ['prior_portfolio_decision_hashes'] },
    then: { required: ['prior_portfolio_decision_refs'] },
  },
  {
    if: { required: ['accepted_risk_refs'] },
    then: { required: ['accepted_risk_hashes'] },
  },
  {
    if: { required: ['accepted_risk_hashes'] },
    then: { required: ['accepted_risk_refs'] },
  },
  {
    if: { required: ['human_request_refs'] },
    then: { required: ['human_request_hashes'] },
  },
  {
    if: { required: ['human_request_hashes'] },
    then: { required: ['human_request_refs'] },
  },
] as const;

export const runPaperImplementationMotiveEvolutionRuntimeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  $defs: {
    paperImplementationMotiveEvolutionOptionDesignerRoleOutput:
      paperImplementationMotiveEvolutionOptionDesignerRoleOutputSchema,
    paperImplementationMotiveEvolutionRiskChallengerRoleOutput:
      paperImplementationMotiveEvolutionRiskChallengerRoleOutputSchema,
  },
  required: [
    'run_mode',
    'execution_mode',
    'target_ref',
    'target_motive_refs',
    'target_motive_hashes',
    'target_core_motive_version_refs',
    'target_core_motive_version_hashes',
    'input_snapshot_ref',
    'input_snapshot_hash',
    'portfolio_snapshot_ref',
    'portfolio_snapshot_hash',
    'evidence_board_refs',
    'evidence_board_hashes',
    'evidence_binding_refs',
    'evidence_binding_hashes',
    'challenge_refs',
    'conflict_refs',
    'trace_manifest_refs',
    'trace_manifest_hashes',
    'human_confirmation_policy_ref',
    'human_confirmation_policy_hash',
    'source_refs',
    'source_hashes',
  ],
  properties: {
    implementation_project_id: false,
    runtime_artifact_id: false,
    agent_workflow_harness_run_id: false,
    implementation_proposal_artifact: false,
    CreateMotiveEvolutionDecisionRequest: false,
    create_motive_evolution_decision_request: false,
    motive_evolution_decision_request: false,
    ApplyMotivePortfolioDecisionRequest: false,
    apply_motive_portfolio_decision_request: false,
    motive_roles_after_decision: false,
    change_set: false,
    core_motive_version_patch: false,
    application_status: false,
    domain_gate_request: false,
    queue_action: false,
    writer_dto_payload: false,
    rendered_prompt_text: false,
    raw_provider_output: false,
    cached_prior_output: false,
    debate_transcript: false,
    source_by_source_reviews: false,
    schema_version: {
      const: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    },
    run_id: nullableStringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    target_ref: nonLegacyFunctionalRef,
    target_version_id: nullableStringId,
    target_motive_refs: nonEmptyNonLegacyFunctionalRefArray,
    target_motive_hashes: nonEmptyHashArray,
    target_core_motive_version_refs: nonEmptyNonLegacyFunctionalRefArray,
    target_core_motive_version_hashes: nonEmptyHashArray,
    input_snapshot_ref: nonLegacyFunctionalRef,
    input_snapshot_hash: hashString,
    portfolio_snapshot_ref: nonLegacyFunctionalRef,
    portfolio_snapshot_hash: hashString,
    evidence_board_refs: nonEmptyNonLegacyFunctionalRefArray,
    evidence_board_hashes: nonEmptyHashArray,
    evidence_binding_refs: nonLegacyFunctionalRefArray,
    evidence_binding_hashes: hashArray,
    challenge_refs: nonLegacyFunctionalRefArray,
    conflict_refs: nonLegacyFunctionalRefArray,
    trace_manifest_refs: nonEmptyNonLegacyFunctionalRefArray,
    trace_manifest_hashes: nonEmptyHashArray,
    human_confirmation_policy_ref: nonLegacyFunctionalRef,
    human_confirmation_policy_hash: hashString,
    source_refs: nonEmptyNonLegacyFunctionalRefArray,
    source_hashes: nonEmptyHashArray,
    motive_context_packets: {
      type: 'array',
      items: paperImplementationMotiveEvolutionContextPacketSchema,
    },
    validation_cycle_refs: nonLegacyFunctionalRefArray,
    validation_cycle_hashes: hashArray,
    result_packet_refs: nonLegacyFunctionalRefArray,
    result_packet_hashes: hashArray,
    cross_board_review_refs: nonLegacyFunctionalRefArray,
    cross_board_review_hashes: hashArray,
    prior_evolution_decision_refs: nonLegacyFunctionalRefArray,
    prior_evolution_decision_hashes: hashArray,
    prior_portfolio_decision_refs: nonLegacyFunctionalRefArray,
    prior_portfolio_decision_hashes: hashArray,
    accepted_risk_refs: nonLegacyFunctionalRefArray,
    accepted_risk_hashes: hashArray,
    human_request_refs: nonLegacyFunctionalRefArray,
    human_request_hashes: hashArray,
    preflight_blocker_codes: stringArray,
    mocked_role_outputs: motiveEvolutionRoleOutputsBySlotSchema,
    codex_role_outputs: motiveEvolutionRoleOutputsBySlotSchema,
  },
  allOf: [
    productRunModeRequiresProviderExecution,
    ...motiveEvolutionOptionalRefHashPairInvariants,
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
