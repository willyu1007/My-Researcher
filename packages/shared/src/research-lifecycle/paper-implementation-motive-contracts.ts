import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const PAPER_IMPLEMENTATION_MOTIVE_PORTFOLIO_ROLES = [
  'primary',
  'secondary',
  'fallback',
  'supporting',
  'parked',
  'abandoned',
] as const;
export type PaperImplementationMotivePortfolioRole =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_PORTFOLIO_ROLES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_LIFECYCLE_STATUSES = [
  'active',
  'merged',
  'split',
  'superseded',
  'parked',
  'abandoned',
  'archived',
] as const;
export type PaperImplementationMotiveLifecycleStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_LIFECYCLE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_VERSION_STATUSES = [
  'draft',
  'admitted',
  'superseded',
  'archived',
] as const;
export type PaperImplementationMotiveVersionStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_VERSION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_DERIVATION_TYPES = [
  'initial',
  'refine',
  'narrow_scope',
  'broaden_scope',
  'reframe_mechanism',
  'merge',
  'split',
  'convert',
  'supersede',
] as const;
export type PaperImplementationMotiveDerivationType =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_DERIVATION_TYPES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_MATURITY_LEVELS = [
  'L0_hypothesis',
  'L1_evidence_backed',
  'L2_route_actionable',
  'L3_probe_supported',
  'L4_experiment_supported',
  'L5_claim_bearing',
] as const;
export type PaperImplementationMotiveMaturityLevel =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_MATURITY_LEVELS)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_BOARD_READINESS_STATUSES = [
  'not_ready',
  'evidence_ready',
  'route_ready',
  'feasibility_ready',
  'experiment_ready',
  'claim_ready',
] as const;
export type PaperImplementationMotiveBoardReadinessStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_BOARD_READINESS_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVIDENCE_STATUSES = [
  'insufficient',
  'weak',
  'partial',
  'strong',
  'contradicted',
] as const;
export type PaperImplementationMotiveEvidenceStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVIDENCE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_FEASIBILITY_STATUSES = [
  'not_checked',
  'probing',
  'feasible',
  'risky',
  'infeasible',
] as const;
export type PaperImplementationMotiveFeasibilityStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_FEASIBILITY_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_RESULT_STATUSES = [
  'no_results',
  'supported',
  'weakened',
  'contradicted',
  'inconclusive',
] as const;
export type PaperImplementationMotiveResultStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_RESULT_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_TYPES = [
  'motivation_pressure',
  'current_solution_insufficiency',
  'failure_mechanism',
  'technical_opportunity',
  'experimental_answerability',
  'data_feasibility',
  'baseline_gap',
  'contribution_potential',
  'claim_support',
  'claim_limitation',
] as const;
export type PaperImplementationMotiveAssertionType =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_TYPES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_IMPORTANCE_ROLES = [
  'core',
  'supporting',
  'diagnostic',
  'optional',
] as const;
export type PaperImplementationMotiveAssertionImportanceRole =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_IMPORTANCE_ROLES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_LEVELS = [
  'none',
  'weak',
  'moderate',
  'strong',
] as const;
export type PaperImplementationMotiveSupportLevel =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_LEVELS)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVIDENCE_TYPES = [
  'literature',
  'dataset',
  'baseline',
  'probe_result',
  'experiment_result',
  'error_analysis',
  'human_review',
] as const;
export type PaperImplementationMotiveEvidenceType =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVIDENCE_TYPES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_STATUSES = [
  'untested',
  'weakly_supported',
  'partially_supported',
  'challenged',
  'supported',
  'contradicted',
] as const;
export type PaperImplementationMotiveAssertionStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_BINDING_ROLES = [
  'support',
  'challenge',
  'contradict',
  'qualify',
  'contextualize',
] as const;
export type PaperImplementationEvidenceBindingRole =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_BINDING_ROLES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_ROLES = [
  'transfer_support',
  'transfer_challenge',
  'transfer_context',
  'transfer_limitation',
] as const;
export type PaperImplementationEvidenceTransferRole =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_ROLES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_VALIDITIES = [
  'valid',
  'partial',
  'invalid',
  'needs_review',
] as const;
export type PaperImplementationEvidenceTransferValidity =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_VALIDITIES)[number];

export const PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_SCOPE_MATCHES = [
  'exact',
  'partial',
  'mismatch',
] as const;
export type PaperImplementationEvidenceTransferScopeMatch =
  (typeof PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_SCOPE_MATCHES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_STATES = [
  'none',
  'weak',
  'partial',
  'strong',
  'contradicted',
] as const;
export type PaperImplementationMotiveSupportState =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_STATES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_CHALLENGE_STATUSES = [
  'none',
  'open',
  'addressed',
  'accepted_risk',
  'blocking',
] as const;
export type PaperImplementationMotiveChallengeStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_CHALLENGE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES = [
  'fresh',
  'stale',
  'recheck_required',
  'invalidated',
] as const;
export type PaperImplementationMotiveFreshnessStatus =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_CONFIRMATION_LEVELS = [
  'not_required',
  'policy_confirmed',
  'human_reviewed',
  'human_confirmed',
] as const;
export type PaperImplementationMotiveConfirmationLevel =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_CONFIRMATION_LEVELS)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_EFFECT_CLASSES = [
  'state_evolution',
  'semantic_evolution',
  'structural_evolution',
] as const;
export type PaperImplementationMotiveEvolutionEffectClass =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_EFFECT_CLASSES)[number];

export const PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_TYPES = [
  'refine_statement',
  'narrow_scope',
  'broaden_scope',
  'reframe_mechanism',
  'update_falsification_contract',
  'update_claim_boundary',
  'upgrade_maturity',
  'downgrade_maturity',
  'promote_to_primary',
  'demote_to_secondary',
  'convert_to_supporting_finding',
  'convert_to_negative_result',
  'merge_absorb',
  'merge_synthesize',
  'split',
  'supersede',
  'park',
  'abandon',
  'route_pivot',
  'emit_upstream_feedback',
] as const;
export type PaperImplementationMotiveEvolutionType =
  (typeof PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_TYPES)[number];

export interface CoreMotiveOrigin {
  source_topic_package_id: string;
  source_validated_need_ids: string[];
  source_topic_question_contract_id?: string | null;
  created_from_motive_ids: string[];
}

export interface CoreMotivePortfolioRoleRecord {
  role: PaperImplementationMotivePortfolioRole;
  role_since: string;
  role_decision_ref?: TopicSelectionFunctionalRef | null;
}

export interface CoreMotiveLineage {
  merged_into_motive_id?: string | null;
  split_into_motive_ids: string[];
  superseded_by_motive_id?: string | null;
  parent_motive_ids: string[];
  child_motive_ids: string[];
}

export interface CoreMotiveControl {
  owner?: string | null;
  human_confirmation_required_for_major_change: boolean;
}

export interface CoreMotiveIdentity {
  motive_id: string;
  implementation_project_id: string;
  current_version_id?: string | null;
  origin: CoreMotiveOrigin;
  portfolio_role: CoreMotivePortfolioRoleRecord;
  lifecycle_status: PaperImplementationMotiveLifecycleStatus;
  lineage: CoreMotiveLineage;
  control: CoreMotiveControl;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface CoreMotiveSet {
  motive_set_id: string;
  implementation_project_id: string;
  active_motive_ids: string[];
  primary_motive_ids: string[];
  secondary_motive_ids: string[];
  fallback_motive_ids: string[];
  supporting_motive_ids: string[];
  parked_motive_ids: string[];
  abandoned_motive_ids: string[];
  active_motive_count: number;
  max_active_motives: number;
  max_primary_motives: number;
  max_parallel_routes: number;
  latest_portfolio_decision_id?: string | null;
  policy_version_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoreMotiveVersionOrigin {
  created_by_decision_id?: string | null;
  previous_version_id?: string | null;
  derived_from_motive_version_ids: string[];
  derivation_type: PaperImplementationMotiveDerivationType;
}

export interface CoreMotiveContract {
  short_name: string;
  motivation_claim: string;
  problem_pressure: string;
  current_solution_insufficiency: string;
  unmet_or_failure_mechanism: string;
  target_setting: string;
  expected_contribution_path: string;
  why_this_is_not_trivial: string;
  why_existing_baselines_do_not_already_solve_it: string;
  what_makes_this_researchable_now: string;
}

export interface CoreMotiveScopeContract {
  included_scope: string[];
  excluded_scope: string[];
  non_goals: string[];
  dataset_scope?: string | null;
  task_scope?: string | null;
  baseline_scope?: string | null;
  method_scope?: string | null;
  evaluation_scope?: string | null;
}

export interface CoreMotiveBoundaryToUpstream {
  topic_question_contract_id?: string | null;
  research_slice_id?: string | null;
  within_upstream_boundary: boolean;
  boundary_risk_notes: string[];
  upstream_recheck_required: boolean;
}

export interface CoreMotiveFalsificationContract {
  invalidation_conditions: string[];
  weakening_conditions: string[];
  minimum_evidence_to_continue: string[];
  decisive_negative_conditions: string[];
}

export interface CoreMotiveClaimBoundary {
  maximum_allowed_claim: string;
  minimum_defensible_contribution_claim: string;
  forbidden_overclaims: string[];
  claim_types_allowed: string[];
}

export interface CoreMotiveRouteInterface {
  plausible_route_families: string[];
  disallowed_route_families: string[];
  required_route_properties: string[];
  cheapest_validation_route_hint?: string | null;
}

export interface CoreMotiveVersion {
  core_motive_version_id: string;
  motive_id: string;
  implementation_project_id: string;
  version_number: number;
  version_status: PaperImplementationMotiveVersionStatus;
  version_origin: CoreMotiveVersionOrigin;
  motive_contract: CoreMotiveContract;
  scope_contract: CoreMotiveScopeContract;
  boundary_to_upstream: CoreMotiveBoundaryToUpstream;
  falsification_contract: CoreMotiveFalsificationContract;
  claim_boundary: CoreMotiveClaimBoundary;
  route_interface: CoreMotiveRouteInterface;
  source_refs: TopicSelectionFunctionalRef[];
  source_result_packet_refs: TopicSelectionFunctionalRef[];
  source_human_judgment_refs: TopicSelectionFunctionalRef[];
  trace_manifest_ref?: TopicSelectionFunctionalRef | null;
  trace_manifest_id?: string | null;
  admission_gate_result_id?: string | null;
  evolution_decision_id?: string | null;
  hypothesis_only: boolean;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  admitted_at?: string | null;
}

export interface CoreMotiveVersionState {
  motive_version_state_id: string;
  implementation_project_id: string;
  motive_id: string;
  core_motive_version_id: string;
  review_status: 'unreviewed' | 'reviewed' | 'challenged' | 'human_review_required';
  freshness_status: PaperImplementationMotiveFreshnessStatus;
  maturity_level: PaperImplementationMotiveMaturityLevel;
  board_readiness_status: PaperImplementationMotiveBoardReadinessStatus;
  evidence_status: PaperImplementationMotiveEvidenceStatus;
  feasibility_status: PaperImplementationMotiveFeasibilityStatus;
  result_status: PaperImplementationMotiveResultStatus;
  current_board_version_id?: string | null;
  latest_validation_cycle_id?: string | null;
  latest_evolution_decision_id?: string | null;
  blocker_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  updated_at: string;
}

export interface MotiveAssertionImportance {
  role: PaperImplementationMotiveAssertionImportanceRole;
  must_hold_for_motive_to_continue: boolean;
}

export interface MotiveAssertionValidationRequirements {
  minimum_support_level: PaperImplementationMotiveSupportLevel;
  required_evidence_types: PaperImplementationMotiveEvidenceType[];
  required_counter_evidence_check: boolean;
}

export interface MotiveAssertionFalsification {
  what_would_contradict_this: string[];
  what_would_weaken_this: string[];
}

export interface MotiveAssertion {
  assertion_id: string;
  implementation_project_id: string;
  motive_id: string;
  core_motive_version_id: string;
  assertion_type: PaperImplementationMotiveAssertionType;
  assertion_text: string;
  importance: MotiveAssertionImportance;
  validation_requirements: MotiveAssertionValidationRequirements;
  falsification: MotiveAssertionFalsification;
  status: PaperImplementationMotiveAssertionStatus;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface MotiveEvidenceBindingScope {
  dataset_scope?: string | null;
  task_scope?: string | null;
  baseline_scope?: string | null;
  method_scope?: string | null;
  metric_scope?: string | null;
}

export interface MotiveEvidenceBindingStrength {
  directness: 'weak' | 'moderate' | 'strong';
  reliability: 'low' | 'medium' | 'high';
  reproducibility: 'unknown' | 'partial' | 'reproduced';
  freshness: PaperImplementationMotiveFreshnessStatus;
}

export interface MotiveEvidenceBindingInterpretation {
  normalized_statement: string;
  why_relevant_to_assertion: string;
  limitations: string[];
}

export interface EvidenceBinding {
  binding_id: string;
  implementation_project_id: string;
  motive_id: string;
  core_motive_version_id: string;
  board_version_id: string;
  assertion_id: string;
  evidence_ref: TopicSelectionFunctionalRef;
  role: PaperImplementationEvidenceBindingRole;
  scope: MotiveEvidenceBindingScope;
  strength: MotiveEvidenceBindingStrength;
  support_state: PaperImplementationMotiveSupportState;
  challenge_status: PaperImplementationMotiveChallengeStatus;
  freshness_status: PaperImplementationMotiveFreshnessStatus;
  interpretation: MotiveEvidenceBindingInterpretation;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface MotiveEvidenceBoardSummary {
  current_support_summary: string;
  current_challenge_summary: string;
  unresolved_conflicts: string[];
  board_gap_summary: string;
  next_evidence_needed: string[];
}

export interface MotiveEvidenceBoardState {
  readiness_status: PaperImplementationMotiveBoardReadinessStatus;
  blocker_status: 'none' | 'soft_blocked' | 'hard_blocked';
  freshness_status: PaperImplementationMotiveFreshnessStatus;
  support_state: PaperImplementationMotiveSupportState;
  challenge_status: PaperImplementationMotiveChallengeStatus;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
}

export interface MotiveEvidenceBoardVersion {
  board_version_id: string;
  implementation_project_id: string;
  motive_id: string;
  core_motive_version_id: string;
  assertion_refs: TopicSelectionFunctionalRef[];
  evidence_binding_refs: TopicSelectionFunctionalRef[];
  board_summary: MotiveEvidenceBoardSummary;
  board_state: MotiveEvidenceBoardState;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface EvidenceTransferBinding {
  transfer_id: string;
  implementation_project_id: string;
  source: EvidenceTransferSource;
  target: EvidenceTransferTarget;
  transfer_role: PaperImplementationEvidenceTransferRole;
  transfer_validity: PaperImplementationEvidenceTransferValidity;
  scope_match: EvidenceTransferScopeMatch;
  rationale: string;
  reviewed_by?: TopicSelectionActorType | null;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  created_at: string;
}

export interface EvidenceTransferSource {
  board_version_id: string;
  assertion_id: string;
  evidence_binding_id: string;
}

export interface EvidenceTransferTarget {
  board_version_id: string;
  assertion_id: string;
}

export interface EvidenceTransferScopeMatch {
  dataset_scope_match: PaperImplementationEvidenceTransferScopeMatch;
  method_scope_match: PaperImplementationEvidenceTransferScopeMatch;
  metric_scope_match: PaperImplementationEvidenceTransferScopeMatch;
  setting_scope_match: PaperImplementationEvidenceTransferScopeMatch;
}

export interface CreateEvidenceTransferBindingRequest {
  transfer_id?: string;
  source: EvidenceTransferSource;
  target: EvidenceTransferTarget;
  transfer_role: PaperImplementationEvidenceTransferRole;
  transfer_validity: PaperImplementationEvidenceTransferValidity;
  scope_match: EvidenceTransferScopeMatch;
  rationale: string;
  reviewed_by?: TopicSelectionActorType | null;
  trace_manifest_id: string;
}

export interface CrossBoardReview {
  cross_board_review_id: string;
  implementation_project_id: string;
  motive_refs: TopicSelectionFunctionalRef[];
  shared_evidence_suggestions: TopicSelectionFunctionalRef[];
  conflict_warnings: string[];
  merge_suggestions: string[];
  split_suggestions: string[];
  route_reuse_suggestions: string[];
  experiment_reuse_suggestions: string[];
  portfolio_update_recommendations: string[];
  recommendation_payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface MotivePortfolioRoles {
  primary_motive_ids: string[];
  secondary_motive_ids: string[];
  fallback_motive_ids: string[];
  supporting_motive_ids: string[];
  parked_motive_ids: string[];
  abandoned_motive_ids: string[];
}

export interface MotivePortfolioDecisionChanges {
  promoted_to_primary: string[];
  demoted_from_primary: string[];
  merged_motives: string[];
  split_motives: string[];
  newly_parked: string[];
  newly_abandoned: string[];
}

export interface MotivePortfolioDecision {
  portfolio_decision_id: string;
  implementation_project_id: string;
  motive_roles_after_decision: MotivePortfolioRoles;
  changes: MotivePortfolioDecisionChanges;
  rationale: Record<string, string>;
  active_motive_count: number;
  max_active_motives: number;
  max_primary_motives: number;
  max_parallel_routes: number;
  proposed_by: TopicSelectionActorType;
  confirmed_by?: TopicSelectionActorType | null;
  confirmation_level: PaperImplementationMotiveConfirmationLevel;
  policy_version_id?: string | null;
  created_at: string;
  applied_at?: string | null;
}

export interface MotiveEvolutionDecision {
  motive_evolution_decision_id: string;
  implementation_project_id: string;
  source_motive_refs: TopicSelectionFunctionalRef[];
  triggering_validation_cycle_refs: TopicSelectionFunctionalRef[];
  triggering_result_packet_refs: TopicSelectionFunctionalRef[];
  triggering_cross_board_review_refs: TopicSelectionFunctionalRef[];
  triggering_human_request_refs: TopicSelectionFunctionalRef[];
  evolution_type: PaperImplementationMotiveEvolutionType;
  effect_class: PaperImplementationMotiveEvolutionEffectClass;
  decision_summary: string;
  decision_rationale: string;
  change_set: Record<string, unknown>;
  proposed_outputs: Record<string, unknown>;
  evidence_basis: Record<string, unknown>;
  impact_analysis: Record<string, unknown>;
  gate: Record<string, unknown>;
  proposed_by: TopicSelectionActorType;
  confirmed_by?: TopicSelectionActorType | null;
  human_confirmation_required: boolean;
  confirmation_ref?: TopicSelectionFunctionalRef | null;
  application_status: 'proposed' | 'approved' | 'applied' | 'rejected' | 'superseded' | 'rolled_back';
  trace_manifest_ref?: TopicSelectionFunctionalRef | null;
  trace_manifest_id?: string | null;
  policy_version_id?: string | null;
  created_at: string;
}

export interface CreateMotiveAssertionInput {
  assertion_id?: string;
  assertion_type: PaperImplementationMotiveAssertionType;
  assertion_text: string;
  importance: MotiveAssertionImportance;
  validation_requirements: MotiveAssertionValidationRequirements;
  falsification: MotiveAssertionFalsification;
  expected_initial_status: PaperImplementationMotiveAssertionStatus;
}

export interface CreateCoreMotiveDraftRequest {
  motive_id?: string;
  core_motive_version_id?: string;
  version_origin?: Partial<CoreMotiveVersionOrigin>;
  origin?: Partial<CoreMotiveOrigin>;
  portfolio_role?: PaperImplementationMotivePortfolioRole;
  motive_contract: CoreMotiveContract;
  scope_contract: CoreMotiveScopeContract;
  boundary_to_upstream?: Partial<CoreMotiveBoundaryToUpstream>;
  falsification_contract: CoreMotiveFalsificationContract;
  claim_boundary: CoreMotiveClaimBoundary;
  route_interface?: Partial<CoreMotiveRouteInterface>;
  source_refs?: TopicSelectionFunctionalRef[];
  source_result_packet_refs?: TopicSelectionFunctionalRef[];
  source_human_judgment_refs?: TopicSelectionFunctionalRef[];
  assertions: CreateMotiveAssertionInput[];
  hypothesis_only?: boolean;
  evolution_decision_id?: string | null;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface CoreMotiveDraftResponse {
  motive_identity: CoreMotiveIdentity;
  motive_set: CoreMotiveSet;
  core_motive_version: CoreMotiveVersion;
  motive_version_state: CoreMotiveVersionState;
  assertions: MotiveAssertion[];
}

export interface AdmitCoreMotiveVersionRequest {
  trace_manifest_id: string;
  admission_gate_result_id?: string | null;
  portfolio_role?: PaperImplementationMotivePortfolioRole;
  confirmation_level?: PaperImplementationMotiveConfirmationLevel;
  confirmed_by?: TopicSelectionActorType | null;
  confirmation_ref?: TopicSelectionFunctionalRef | null;
  created_by?: TopicSelectionActorType;
}

export interface AdmitCoreMotiveVersionResponse extends CoreMotiveDraftResponse {
  portfolio_decision: MotivePortfolioDecision;
}

export interface CreateEvidenceBindingInput {
  binding_id?: string;
  assertion_id: string;
  evidence_ref: TopicSelectionFunctionalRef;
  role: PaperImplementationEvidenceBindingRole;
  scope: MotiveEvidenceBindingScope;
  strength: MotiveEvidenceBindingStrength;
  support_state: PaperImplementationMotiveSupportState;
  challenge_status: PaperImplementationMotiveChallengeStatus;
  interpretation: MotiveEvidenceBindingInterpretation;
  trace_manifest_id: string;
}

export interface CreateMotiveEvidenceBoardVersionRequest {
  board_version_id?: string;
  motive_id: string;
  core_motive_version_id: string;
  bindings: CreateEvidenceBindingInput[];
  board_summary: MotiveEvidenceBoardSummary;
  board_state?: Partial<MotiveEvidenceBoardState>;
  trace_manifest_id: string;
  created_by?: TopicSelectionActorType;
}

export interface CreateMotiveEvidenceBoardVersionResponse {
  board_version: MotiveEvidenceBoardVersion;
  evidence_bindings: EvidenceBinding[];
  motive_version_state: CoreMotiveVersionState;
}

export interface CreateCrossBoardReviewRequest {
  motive_refs: TopicSelectionFunctionalRef[];
  shared_evidence_suggestions?: TopicSelectionFunctionalRef[];
  conflict_warnings?: string[];
  merge_suggestions?: string[];
  split_suggestions?: string[];
  route_reuse_suggestions?: string[];
  experiment_reuse_suggestions?: string[];
  portfolio_update_recommendations?: string[];
  recommendation_payload?: Record<string, unknown>;
  created_by?: TopicSelectionActorType;
}

export interface ApplyMotivePortfolioDecisionRequest {
  motive_roles_after_decision: MotivePortfolioRoles;
  changes: MotivePortfolioDecisionChanges;
  rationale: Record<string, string>;
  max_active_motives?: number;
  max_primary_motives?: number;
  max_parallel_routes?: number;
  proposed_by?: TopicSelectionActorType;
  confirmed_by?: TopicSelectionActorType | null;
  confirmation_level?: PaperImplementationMotiveConfirmationLevel;
  confirmation_ref?: TopicSelectionFunctionalRef | null;
  policy_version_id?: string | null;
}

export interface CreateMotiveEvolutionDecisionRequest {
  motive_evolution_decision_id?: string;
  source_motive_refs: TopicSelectionFunctionalRef[];
  triggering_validation_cycle_refs?: TopicSelectionFunctionalRef[];
  triggering_result_packet_refs?: TopicSelectionFunctionalRef[];
  triggering_cross_board_review_refs?: TopicSelectionFunctionalRef[];
  triggering_human_request_refs?: TopicSelectionFunctionalRef[];
  evolution_type: PaperImplementationMotiveEvolutionType;
  effect_class: PaperImplementationMotiveEvolutionEffectClass;
  decision_summary: string;
  decision_rationale: string;
  change_set: Record<string, unknown>;
  proposed_outputs?: Record<string, unknown>;
  evidence_basis?: Record<string, unknown>;
  impact_analysis?: Record<string, unknown>;
  gate?: Record<string, unknown>;
  proposed_by?: TopicSelectionActorType;
  confirmed_by?: TopicSelectionActorType | null;
  human_confirmation_required?: boolean;
  confirmation_ref?: TopicSelectionFunctionalRef | null;
  application_status?: MotiveEvolutionDecision['application_status'];
  trace_manifest_id?: string | null;
  trace_manifest_ref?: TopicSelectionFunctionalRef | null;
  policy_version_id?: string | null;
}

export interface ListCoreMotivesResponse {
  items: CoreMotiveIdentity[];
}

export interface ListCoreMotiveVersionsResponse {
  items: CoreMotiveVersion[];
}

export interface ListMotiveEvidenceBoardsResponse {
  items: MotiveEvidenceBoardVersion[];
}

export interface ListMotivePortfolioDecisionsResponse {
  items: MotivePortfolioDecision[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const actorTypeNullableSchema = { anyOf: [actorTypeSchema, { type: 'null' }] } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const portfolioRoleSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_PORTFOLIO_ROLES] } as const;
const lifecycleStatusSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_LIFECYCLE_STATUSES] } as const;
const versionStatusSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_VERSION_STATUSES] } as const;
const derivationTypeSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_DERIVATION_TYPES] } as const;
const maturityLevelSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_MATURITY_LEVELS] } as const;
const boardReadinessStatusSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_BOARD_READINESS_STATUSES] } as const;
const assertionTypeSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_TYPES] } as const;
const assertionImportanceRoleSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_IMPORTANCE_ROLES] } as const;
const supportLevelSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_LEVELS] } as const;
const evidenceTypeSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVIDENCE_TYPES] } as const;
const assertionStatusSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_ASSERTION_STATUSES] } as const;
const bindingRoleSchema = { enum: [...PAPER_IMPLEMENTATION_EVIDENCE_BINDING_ROLES] } as const;
const transferRoleSchema = { enum: [...PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_ROLES] } as const;
const transferValiditySchema = { enum: [...PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_VALIDITIES] } as const;
const transferScopeMatchValueSchema = { enum: [...PAPER_IMPLEMENTATION_EVIDENCE_TRANSFER_SCOPE_MATCHES] } as const;
const supportStateSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_STATES] } as const;
const challengeStatusSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_CHALLENGE_STATUSES] } as const;
const freshnessStatusSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES] } as const;
const confirmationLevelSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_CONFIRMATION_LEVELS] } as const;
const evolutionTypeSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_TYPES] } as const;
const evolutionEffectClassSchema = { enum: [...PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_EFFECT_CLASSES] } as const;

export const coreMotiveOriginSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_topic_package_id', 'source_validated_need_ids', 'created_from_motive_ids'],
  properties: {
    source_topic_package_id: stringId,
    source_validated_need_ids: stringArray,
    source_topic_question_contract_id: nullableStringId,
    created_from_motive_ids: stringArray,
  },
} as const;

export const coreMotiveContractSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'short_name',
    'motivation_claim',
    'problem_pressure',
    'current_solution_insufficiency',
    'unmet_or_failure_mechanism',
    'target_setting',
    'expected_contribution_path',
    'why_this_is_not_trivial',
    'why_existing_baselines_do_not_already_solve_it',
    'what_makes_this_researchable_now',
  ],
  properties: {
    short_name: stringId,
    motivation_claim: stringId,
    problem_pressure: stringId,
    current_solution_insufficiency: stringId,
    unmet_or_failure_mechanism: stringId,
    target_setting: stringId,
    expected_contribution_path: stringId,
    why_this_is_not_trivial: stringId,
    why_existing_baselines_do_not_already_solve_it: stringId,
    what_makes_this_researchable_now: stringId,
  },
} as const;

export const coreMotiveScopeContractSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['included_scope', 'excluded_scope', 'non_goals'],
  properties: {
    included_scope: stringArray,
    excluded_scope: stringArray,
    non_goals: stringArray,
    dataset_scope: nullableStringId,
    task_scope: nullableStringId,
    baseline_scope: nullableStringId,
    method_scope: nullableStringId,
    evaluation_scope: nullableStringId,
  },
} as const;

export const coreMotiveBoundaryToUpstreamSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['within_upstream_boundary', 'boundary_risk_notes', 'upstream_recheck_required'],
  properties: {
    topic_question_contract_id: nullableStringId,
    research_slice_id: nullableStringId,
    within_upstream_boundary: { type: 'boolean' },
    boundary_risk_notes: stringArray,
    upstream_recheck_required: { type: 'boolean' },
  },
} as const;

export const coreMotiveFalsificationContractSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'invalidation_conditions',
    'weakening_conditions',
    'minimum_evidence_to_continue',
    'decisive_negative_conditions',
  ],
  properties: {
    invalidation_conditions: stringArray,
    weakening_conditions: stringArray,
    minimum_evidence_to_continue: stringArray,
    decisive_negative_conditions: stringArray,
  },
} as const;

export const coreMotiveClaimBoundarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'maximum_allowed_claim',
    'minimum_defensible_contribution_claim',
    'forbidden_overclaims',
    'claim_types_allowed',
  ],
  properties: {
    maximum_allowed_claim: stringId,
    minimum_defensible_contribution_claim: stringId,
    forbidden_overclaims: stringArray,
    claim_types_allowed: stringArray,
  },
} as const;

export const coreMotiveRouteInterfaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['plausible_route_families', 'disallowed_route_families', 'required_route_properties'],
  properties: {
    plausible_route_families: stringArray,
    disallowed_route_families: stringArray,
    required_route_properties: stringArray,
    cheapest_validation_route_hint: nullableStringId,
  },
} as const;

export const createMotiveAssertionInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'assertion_type',
    'assertion_text',
    'importance',
    'validation_requirements',
    'falsification',
    'expected_initial_status',
  ],
  properties: {
    assertion_id: stringId,
    assertion_type: assertionTypeSchema,
    assertion_text: stringId,
    importance: {
      type: 'object',
      additionalProperties: false,
      required: ['role', 'must_hold_for_motive_to_continue'],
      properties: {
        role: assertionImportanceRoleSchema,
        must_hold_for_motive_to_continue: { type: 'boolean' },
      },
    },
    validation_requirements: {
      type: 'object',
      additionalProperties: false,
      required: [
        'minimum_support_level',
        'required_evidence_types',
        'required_counter_evidence_check',
      ],
      properties: {
        minimum_support_level: supportLevelSchema,
        required_evidence_types: {
          type: 'array',
          items: evidenceTypeSchema,
        },
        required_counter_evidence_check: { type: 'boolean' },
      },
    },
    falsification: {
      type: 'object',
      additionalProperties: false,
      required: ['what_would_contradict_this', 'what_would_weaken_this'],
      properties: {
        what_would_contradict_this: stringArray,
        what_would_weaken_this: stringArray,
      },
    },
    expected_initial_status: assertionStatusSchema,
  },
} as const;

export const coreMotiveVersionOriginInputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    created_by_decision_id: nullableStringId,
    previous_version_id: nullableStringId,
    derived_from_motive_version_ids: stringArray,
    derivation_type: derivationTypeSchema,
  },
} as const;

export const createCoreMotiveDraftRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'motive_contract',
    'scope_contract',
    'falsification_contract',
    'claim_boundary',
    'assertions',
  ],
  properties: {
    motive_id: stringId,
    core_motive_version_id: stringId,
    version_origin: coreMotiveVersionOriginInputSchema,
    origin: objectPayload,
    portfolio_role: portfolioRoleSchema,
    motive_contract: coreMotiveContractSchema,
    scope_contract: coreMotiveScopeContractSchema,
    boundary_to_upstream: objectPayload,
    falsification_contract: coreMotiveFalsificationContractSchema,
    claim_boundary: coreMotiveClaimBoundarySchema,
    route_interface: objectPayload,
    source_refs: functionalRefArray,
    source_result_packet_refs: functionalRefArray,
    source_human_judgment_refs: functionalRefArray,
    assertions: {
      type: 'array',
      minItems: 1,
      items: createMotiveAssertionInputSchema,
    },
    hypothesis_only: { type: 'boolean' },
    evolution_decision_id: nullableStringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const admitCoreMotiveVersionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['trace_manifest_id'],
  properties: {
    trace_manifest_id: stringId,
    admission_gate_result_id: nullableStringId,
    portfolio_role: portfolioRoleSchema,
    confirmation_level: confirmationLevelSchema,
    confirmed_by: actorTypeNullableSchema,
    confirmation_ref: nullableFunctionalRef,
    created_by: actorTypeSchema,
  },
} as const;

export const createEvidenceBindingInputSchema = {
  type: 'object',
  additionalProperties: false,
  not: {
    required: ['evidence_ref'],
    properties: {
      evidence_ref: {
        type: 'object',
        required: ['ref_type'],
        properties: {
          ref_type: {
            enum: [
              'board_summary',
              'display_summary',
              'llm_summary',
              'llm_rationale',
              'rationale_memo',
              'result_interpretation',
            ],
          },
        },
      },
    },
  },
  required: [
    'assertion_id',
    'evidence_ref',
    'role',
    'scope',
    'strength',
    'support_state',
    'challenge_status',
    'interpretation',
    'trace_manifest_id',
  ],
  properties: {
    binding_id: stringId,
    assertion_id: stringId,
    evidence_ref: topicSelectionFunctionalRefSchema,
    role: bindingRoleSchema,
    scope: objectPayload,
    strength: {
      type: 'object',
      additionalProperties: false,
      required: ['directness', 'reliability', 'reproducibility', 'freshness'],
      properties: {
        directness: { enum: ['weak', 'moderate', 'strong'] },
        reliability: { enum: ['low', 'medium', 'high'] },
        reproducibility: { enum: ['unknown', 'partial', 'reproduced'] },
        freshness: freshnessStatusSchema,
      },
    },
    support_state: supportStateSchema,
    challenge_status: challengeStatusSchema,
    interpretation: {
      type: 'object',
      additionalProperties: false,
      required: ['normalized_statement', 'why_relevant_to_assertion', 'limitations'],
      properties: {
        normalized_statement: stringId,
        why_relevant_to_assertion: stringId,
        limitations: stringArray,
      },
    },
    trace_manifest_id: stringId,
  },
} as const;

export const evidenceTransferSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['board_version_id', 'assertion_id', 'evidence_binding_id'],
  properties: {
    board_version_id: stringId,
    assertion_id: stringId,
    evidence_binding_id: stringId,
  },
} as const;

export const evidenceTransferTargetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['board_version_id', 'assertion_id'],
  properties: {
    board_version_id: stringId,
    assertion_id: stringId,
  },
} as const;

export const evidenceTransferScopeMatchSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset_scope_match',
    'method_scope_match',
    'metric_scope_match',
    'setting_scope_match',
  ],
  properties: {
    dataset_scope_match: transferScopeMatchValueSchema,
    method_scope_match: transferScopeMatchValueSchema,
    metric_scope_match: transferScopeMatchValueSchema,
    setting_scope_match: transferScopeMatchValueSchema,
  },
} as const;

export const createEvidenceTransferBindingRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source',
    'target',
    'transfer_role',
    'transfer_validity',
    'scope_match',
    'rationale',
    'trace_manifest_id',
  ],
  properties: {
    transfer_id: stringId,
    source: evidenceTransferSourceSchema,
    target: evidenceTransferTargetSchema,
    transfer_role: transferRoleSchema,
    transfer_validity: transferValiditySchema,
    scope_match: evidenceTransferScopeMatchSchema,
    rationale: stringId,
    reviewed_by: actorTypeNullableSchema,
    trace_manifest_id: stringId,
  },
} as const;

export const motiveEvidenceBoardSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'current_support_summary',
    'current_challenge_summary',
    'unresolved_conflicts',
    'board_gap_summary',
    'next_evidence_needed',
  ],
  properties: {
    current_support_summary: stringId,
    current_challenge_summary: stringId,
    unresolved_conflicts: stringArray,
    board_gap_summary: stringId,
    next_evidence_needed: stringArray,
  },
} as const;

export const motiveEvidenceBoardStateInputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    readiness_status: boardReadinessStatusSchema,
    blocker_status: { enum: ['none', 'soft_blocked', 'hard_blocked'] },
    freshness_status: freshnessStatusSchema,
    support_state: supportStateSchema,
    challenge_status: challengeStatusSchema,
    accepted_risk_refs: functionalRefArray,
  },
} as const;

export const createMotiveEvidenceBoardVersionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'motive_id',
    'core_motive_version_id',
    'bindings',
    'board_summary',
    'trace_manifest_id',
  ],
  properties: {
    board_version_id: stringId,
    motive_id: stringId,
    core_motive_version_id: stringId,
    bindings: {
      type: 'array',
      minItems: 1,
      items: createEvidenceBindingInputSchema,
    },
    board_summary: motiveEvidenceBoardSummarySchema,
    board_state: motiveEvidenceBoardStateInputSchema,
    trace_manifest_id: stringId,
    created_by: actorTypeSchema,
  },
} as const;

export const createCrossBoardReviewRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['motive_refs'],
  properties: {
    motive_refs: functionalRefArray,
    shared_evidence_suggestions: functionalRefArray,
    conflict_warnings: stringArray,
    merge_suggestions: stringArray,
    split_suggestions: stringArray,
    route_reuse_suggestions: stringArray,
    experiment_reuse_suggestions: stringArray,
    portfolio_update_recommendations: stringArray,
    recommendation_payload: objectPayload,
    created_by: actorTypeSchema,
  },
} as const;

export const motivePortfolioRolesSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'primary_motive_ids',
    'secondary_motive_ids',
    'fallback_motive_ids',
    'supporting_motive_ids',
    'parked_motive_ids',
    'abandoned_motive_ids',
  ],
  properties: {
    primary_motive_ids: stringArray,
    secondary_motive_ids: stringArray,
    fallback_motive_ids: stringArray,
    supporting_motive_ids: stringArray,
    parked_motive_ids: stringArray,
    abandoned_motive_ids: stringArray,
  },
} as const;

export const motivePortfolioDecisionChangesSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promoted_to_primary',
    'demoted_from_primary',
    'merged_motives',
    'split_motives',
    'newly_parked',
    'newly_abandoned',
  ],
  properties: {
    promoted_to_primary: stringArray,
    demoted_from_primary: stringArray,
    merged_motives: stringArray,
    split_motives: stringArray,
    newly_parked: stringArray,
    newly_abandoned: stringArray,
  },
} as const;

export const applyMotivePortfolioDecisionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['motive_roles_after_decision', 'changes', 'rationale'],
  properties: {
    motive_roles_after_decision: motivePortfolioRolesSchema,
    changes: motivePortfolioDecisionChangesSchema,
    rationale: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    max_active_motives: { type: 'integer', minimum: 1 },
    max_primary_motives: { type: 'integer', minimum: 1 },
    max_parallel_routes: { type: 'integer', minimum: 1 },
    proposed_by: actorTypeSchema,
    confirmed_by: actorTypeNullableSchema,
    confirmation_level: confirmationLevelSchema,
    confirmation_ref: nullableFunctionalRef,
    policy_version_id: nullableStringId,
  },
} as const;

export const createMotiveEvolutionDecisionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_motive_refs',
    'evolution_type',
    'effect_class',
    'decision_summary',
    'decision_rationale',
    'change_set',
  ],
  properties: {
    source_motive_refs: functionalRefArray,
    motive_evolution_decision_id: stringId,
    triggering_validation_cycle_refs: functionalRefArray,
    triggering_result_packet_refs: functionalRefArray,
    triggering_cross_board_review_refs: functionalRefArray,
    triggering_human_request_refs: functionalRefArray,
    evolution_type: evolutionTypeSchema,
    effect_class: evolutionEffectClassSchema,
    decision_summary: stringId,
    decision_rationale: stringId,
    change_set: objectPayload,
    proposed_outputs: objectPayload,
    evidence_basis: objectPayload,
    impact_analysis: objectPayload,
    gate: objectPayload,
    proposed_by: actorTypeSchema,
    confirmed_by: actorTypeNullableSchema,
    human_confirmation_required: { type: 'boolean' },
    confirmation_ref: nullableFunctionalRef,
    application_status: {
      enum: ['proposed', 'approved', 'applied', 'rejected', 'superseded', 'rolled_back'],
    },
    trace_manifest_id: nullableStringId,
    trace_manifest_ref: nullableFunctionalRef,
    policy_version_id: nullableStringId,
  },
} as const;

export const coreMotiveIdentitySchema = {
  type: 'object',
  additionalProperties: true,
  required: ['motive_id', 'implementation_project_id', 'portfolio_role', 'lifecycle_status'],
  properties: {
    motive_id: stringId,
    implementation_project_id: stringId,
    current_version_id: nullableStringId,
    portfolio_role: objectPayload,
    lifecycle_status: lifecycleStatusSchema,
  },
} as const;

export const coreMotiveSetSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['motive_set_id', 'implementation_project_id', 'active_motive_count'],
  properties: {
    motive_set_id: stringId,
    implementation_project_id: stringId,
    active_motive_count: { type: 'integer', minimum: 0 },
  },
} as const;

export const coreMotiveVersionSchema = {
  type: 'object',
  additionalProperties: true,
  required: [
    'core_motive_version_id',
    'motive_id',
    'implementation_project_id',
    'version_number',
    'version_status',
    'motive_contract',
    'falsification_contract',
    'claim_boundary',
  ],
  properties: {
    core_motive_version_id: stringId,
    motive_id: stringId,
    implementation_project_id: stringId,
    version_number: { type: 'integer', minimum: 1 },
    version_status: versionStatusSchema,
    motive_contract: coreMotiveContractSchema,
    falsification_contract: coreMotiveFalsificationContractSchema,
    claim_boundary: coreMotiveClaimBoundarySchema,
    maturity_level: maturityLevelSchema,
  },
} as const;

export const motiveAssertionSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['assertion_id', 'core_motive_version_id', 'assertion_type', 'assertion_text'],
  properties: {
    assertion_id: stringId,
    core_motive_version_id: stringId,
    assertion_type: assertionTypeSchema,
    assertion_text: stringId,
  },
} as const;

export const motiveEvidenceBoardVersionSchema = {
  type: 'object',
  additionalProperties: true,
  required: ['board_version_id', 'core_motive_version_id', 'board_summary', 'trace_manifest_id'],
  properties: {
    board_version_id: stringId,
    core_motive_version_id: stringId,
    board_summary: motiveEvidenceBoardSummarySchema,
    trace_manifest_id: stringId,
  },
} as const;

export const evidenceTransferBindingSchema = {
  type: 'object',
  additionalProperties: true,
  required: [
    'transfer_id',
    'implementation_project_id',
    'source',
    'target',
    'transfer_role',
    'transfer_validity',
    'scope_match',
    'rationale',
    'trace_manifest_id',
  ],
  properties: {
    transfer_id: stringId,
    implementation_project_id: stringId,
    source: evidenceTransferSourceSchema,
    target: evidenceTransferTargetSchema,
    transfer_role: transferRoleSchema,
    transfer_validity: transferValiditySchema,
    scope_match: evidenceTransferScopeMatchSchema,
    rationale: stringId,
    reviewed_by: actorTypeNullableSchema,
    trace_manifest_id: stringId,
  },
} as const;
