import type { CreatedByMode } from './research-lifecycle-core-contracts.js';

export type ResearchArgumentActor = CreatedByMode | 'system';

export const RESEARCH_ARGUMENT_WORKSPACE_STATUSES = [
  'active',
  'paused',
  'archived',
  'killed',
  'promoted',
] as const;
export type ResearchArgumentWorkspaceStatus =
  (typeof RESEARCH_ARGUMENT_WORKSPACE_STATUSES)[number];

export const RESEARCH_ARGUMENT_BRANCH_STATUSES = [
  'active',
  'paused',
  'archived',
  'killed',
  'merged',
] as const;
export type ResearchBranchStatus =
  (typeof RESEARCH_ARGUMENT_BRANCH_STATUSES)[number];

export const DIMENSION_NAMES = [
  'ProblemImportance',
  'ContributionValue',
  'NoveltyDelta',
  'OutcomeFeasibility',
  'ClaimSharpness',
  'EvidenceCompleteness',
  'EvaluationSoundness',
  'BoundaryRiskCoverage',
  'ReproducibilityReadiness',
] as const;
export type DimensionName = (typeof DIMENSION_NAMES)[number];

export const READINESS_LEVELS = [
  'Unknown',
  'Blocked',
  'Partial',
  'Sufficient',
  'Strong',
] as const;
export type ReadinessLevel = (typeof READINESS_LEVELS)[number];

export const READINESS_DECISION_KINDS = [
  'not_ready',
  'worth_continuing',
  'ready_for_writing_entry',
] as const;
export type ReadinessDecisionKind = (typeof READINESS_DECISION_KINDS)[number];

export const BLOCKER_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type BlockerSeverity = (typeof BLOCKER_SEVERITIES)[number];

export const SYNC_ELIGIBILITIES = [
  'local_only',
  'eligible',
  'conditional',
  'ineligible',
] as const;
export type SyncEligibility = (typeof SYNC_ELIGIBILITIES)[number];

export const REPORT_PROJECTION_KINDS = [
  'coverage',
  'readiness',
  'submission_risk',
  'writing_entry',
  'decision_timeline',
] as const;
export type ReportProjectionKind = (typeof REPORT_PROJECTION_KINDS)[number];

export const REPORT_POINTER_KINDS = [
  'coverage',
  'readiness',
  'submission_risk',
  'writing_entry',
  'decision_timeline',
  'external_review',
  'downstream_handoff',
] as const;
export type ReportPointerKind = (typeof REPORT_POINTER_KINDS)[number];

export const SOURCE_TRACE_KINDS = [
  'title_card',
  'need_review',
  'research_question',
  'value_assessment',
  'package',
  'literature_evidence',
  'claim',
  'evidence_requirement',
  'evidence_item',
  'baseline_set',
  'protocol',
  'repro_item',
  'run',
  'artifact',
  'boundary',
  'analysis_finding',
  'decision',
  'lesson',
  'report',
  'paper_project',
] as const;
export type SourceTraceKind = (typeof SOURCE_TRACE_KINDS)[number];

export const POINTER_KINDS = [
  'workspace',
  'branch',
  'problem',
  'value_hypothesis',
  'contribution_delta',
  'claim',
  'evidence_requirement',
  'evidence_item',
  'baseline_set',
  'protocol',
  'repro_item',
  'run',
  'artifact',
  'boundary',
  'analysis_finding',
  'issue_finding',
  'report',
  'paper_project',
  'external_document',
] as const;
export type PointerKind = (typeof POINTER_KINDS)[number];

export const GIT_WEAK_MAPPING_KINDS = [
  'repository',
  'branch',
  'commit',
  'tag',
  'path',
] as const;
export type GitWeakMappingKind = (typeof GIT_WEAK_MAPPING_KINDS)[number];

export const CLAIM_TYPES = [
  'problem_claim',
  'novelty_claim',
  'performance_claim',
  'efficiency_claim',
  'mechanistic_claim',
  'scope_claim',
  'limitation_claim',
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = [
  'candidate',
  'active',
  'weakened',
  'rejected',
  'retired',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STRENGTHS = ['tentative', 'moderate', 'strong'] as const;
export type ClaimStrength = (typeof CLAIM_STRENGTHS)[number];

export const EVIDENCE_REQUIREMENT_TYPES = [
  'main_result',
  'ablation',
  'robustness',
  'efficiency',
  'error_analysis',
  'theoretical',
  'qualitative',
  'reproduction',
] as const;
export type EvidenceRequirementType =
  (typeof EVIDENCE_REQUIREMENT_TYPES)[number];

export const EVIDENCE_REQUIREMENT_STATUSES = [
  'missing',
  'partial',
  'satisfied',
  'invalidated',
] as const;
export type EvidenceRequirementStatus =
  (typeof EVIDENCE_REQUIREMENT_STATUSES)[number];

export const EVIDENCE_SOURCE_TYPES = [
  'run',
  'analysis',
  'literature',
  'manual_input',
  'artifact',
] as const;
export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const EVIDENCE_SUPPORT_DIRECTIONS = [
  'supports',
  'weakens',
  'refutes',
  'inconclusive',
] as const;
export type EvidenceSupportDirection =
  (typeof EVIDENCE_SUPPORT_DIRECTIONS)[number];

export const VALUE_TYPES = [
  'performance',
  'efficiency',
  'reliability',
  'robustness',
  'insight',
  'usability',
  'benchmark',
  'framework',
] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

export const CONTRIBUTION_DELTA_TYPES = [
  'new_method',
  'new_insight',
  'new_analysis',
  'stronger_empirical_case',
  'efficiency_tradeoff',
  'dataset',
  'benchmark',
] as const;
export type ContributionDeltaType =
  (typeof CONTRIBUTION_DELTA_TYPES)[number];

export const PROTOCOL_TYPES = [
  'evaluation',
  'training',
  'data',
  'comparison',
  'stats',
] as const;
export type ProtocolType = (typeof PROTOCOL_TYPES)[number];

export const PROTOCOL_STATUSES = [
  'draft',
  'active',
  'needs_revision',
  'retired',
] as const;
export type ProtocolStatus = (typeof PROTOCOL_STATUSES)[number];

export const REPRO_ITEM_STATUSES = [
  'missing',
  'partial',
  'ready',
  'verified',
] as const;
export type ReproItemStatus = (typeof REPRO_ITEM_STATUSES)[number];

export const RUN_TYPES = [
  'probe',
  'pilot',
  'full',
  'ablation',
  'robustness',
  'baseline',
] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const ARTIFACT_TYPES = [
  'code',
  'config',
  'model',
  'log',
  'table',
  'figure',
  'script',
  'report',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ANALYSIS_FINDING_TYPES = [
  'pattern',
  'anomaly',
  'failure_case',
  'limitation',
  'comparative_observation',
  'stability',
] as const;
export type AnalysisFindingType =
  (typeof ANALYSIS_FINDING_TYPES)[number];

export const BOUNDARY_TYPES = [
  'scope',
  'limitation',
  'threat_to_validity',
  'failure_mode',
  'ethical_risk',
] as const;
export type BoundaryType = (typeof BOUNDARY_TYPES)[number];

export const ISSUE_FINDING_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IssueFindingSeverity = (typeof ISSUE_FINDING_SEVERITIES)[number];

export const DECISION_ACTIONS = [
  'advance',
  'continue',
  'reopen',
  'pivot',
  'kill',
  'archive',
  'merge',
] as const;
export type DecisionAction = (typeof DECISION_ACTIONS)[number];

export const LESSON_RECORD_TYPES = [
  'positive_pattern',
  'failure_pattern',
  'blocker_pattern',
  'heuristic_prior',
] as const;
export type LessonRecordType = (typeof LESSON_RECORD_TYPES)[number];

export interface SourceTraceRef {
  source_kind: SourceTraceKind;
  source_id: string;
  note?: string;
  locator?: string;
}

export interface ObjectPointer {
  pointer_kind: PointerKind;
  object_id: string;
  label?: string;
  path?: string;
  locator?: string;
}

export interface ReportPointer {
  report_kind: ReportPointerKind;
  report_id: string;
  summary?: string;
  object_pointers?: ObjectPointer[];
}

export interface AuthorizationMetadata {
  policy_label: string;
  requires_explicit_enable: boolean;
  source_rights_basis?: string;
}

export interface GitWeakMappingRef {
  mapping_kind: GitWeakMappingKind;
  ref_value: string;
  note?: string;
}

export interface AuditRef {
  audit_ref: string;
  actor?: ResearchArgumentActor;
  recorded_at?: string;
}

export interface BlockerRef {
  blocker_id: string;
  severity: BlockerSeverity;
  summary: string;
  linked_object_ids?: string[];
  linked_requirement_ids?: string[];
}

export interface ResearchArgumentWorkspace {
  workspace_id: string;
  title_card_id: string;
  workspace_status: ResearchArgumentWorkspaceStatus;
  active_branch_id?: string;
  current_stage: AbstractState['stage'];
  source_trace_refs: SourceTraceRef[];
  report_pointers: ReportPointer[];
  paper_id?: string;
  sync_eligibility: SyncEligibility;
  authorization_metadata?: AuthorizationMetadata;
  git_weak_mapping_refs?: GitWeakMappingRef[];
  audit_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchBranch {
  branch_id: string;
  workspace_id: string;
  branch_name: string;
  branch_status: ResearchBranchStatus;
  parent_branch_id?: string;
  hypothesis_summary?: string;
  branch_reason?: string;
  decision_refs?: string[];
  created_at: string;
  updated_at: string;
}

export interface Problem {
  problem_id: string;
  workspace_id: string;
  branch_id: string;
  statement: string;
  target_domain?: string;
  audience?: string;
  pain_point?: string;
  importance_rationale?: string;
  scope?: string;
  non_goals?: string[];
  source_trace_refs?: SourceTraceRef[];
  created_at: string;
  updated_at: string;
}

export interface ValueHypothesis {
  value_hypothesis_id: string;
  workspace_id: string;
  branch_id: string;
  value_type: ValueType;
  expected_impact?: string;
  target_users_or_community?: string;
  success_condition?: string;
  failure_condition?: string;
  source_trace_refs?: SourceTraceRef[];
  created_at: string;
  updated_at: string;
}

export interface ContributionDelta {
  contribution_delta_id: string;
  workspace_id: string;
  branch_id: string;
  anchor_work_ids: string[];
  delta_type: ContributionDeltaType;
  delta_summary: string;
  novelty_risk_notes?: string[];
  closest_competitors?: string[];
  source_trace_refs?: SourceTraceRef[];
  created_at: string;
  updated_at: string;
}

export interface Claim {
  claim_id: string;
  workspace_id: string;
  branch_id: string;
  claim_type: ClaimType;
  text: string;
  claim_status: ClaimStatus;
  claim_strength: ClaimStrength;
  scope?: string;
  support_state?: string;
  linked_evidence_requirement_ids: string[];
  linked_boundary_ids?: string[];
  source_trace_refs?: SourceTraceRef[];
  created_at: string;
  updated_at: string;
}

export interface EvidenceRequirement {
  evidence_requirement_id: string;
  workspace_id: string;
  branch_id: string;
  claim_id: string;
  required_evidence_type: EvidenceRequirementType;
  is_mandatory: boolean;
  satisfaction_rule?: string;
  priority: 'low' | 'medium' | 'high';
  status: EvidenceRequirementStatus;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItem {
  evidence_item_id: string;
  workspace_id: string;
  branch_id: string;
  evidence_type: string;
  source_type: EvidenceSourceType;
  source_ref?: string;
  summary: string;
  support_direction: EvidenceSupportDirection;
  confidence: number;
  linked_requirement_ids: string[];
  linked_claim_ids: string[];
  provenance?: SourceTraceRef[];
  created_at: string;
  updated_at: string;
}

export interface BaselineSet {
  baseline_set_id: string;
  workspace_id: string;
  branch_id: string;
  baselines: string[];
  selection_policy?: string;
  coverage_notes?: string;
  missing_strong_baseline_notes?: string;
  fairness_risks?: string[];
  linked_protocol_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Protocol {
  protocol_id: string;
  workspace_id: string;
  branch_id: string;
  protocol_type: ProtocolType;
  dataset_info?: string;
  split_info?: string;
  metrics?: string[];
  comparison_rules?: string[];
  statistical_checks?: string[];
  repro_requirements?: string[];
  status: ProtocolStatus;
  created_at: string;
  updated_at: string;
}

export interface ReproItem {
  repro_item_id: string;
  workspace_id: string;
  branch_id: string;
  item_type: string;
  description: string;
  status: ReproItemStatus;
  artifact_ids?: string[];
  run_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Run {
  run_id: string;
  workspace_id: string;
  branch_id: string;
  run_type: RunType;
  status: RunStatus;
  config_ref?: string;
  executor_ref?: string;
  inputs?: string[];
  outputs?: string[];
  cost?: number;
  duration_sec?: number;
  failure_reason?: string;
  artifact_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  artifact_id: string;
  workspace_id: string;
  branch_id: string;
  artifact_type: ArtifactType;
  location: string;
  version?: string;
  hash?: string;
  is_reusable: boolean;
  access_policy?: string;
  sync_eligibility?: SyncEligibility;
  authorization_metadata?: AuthorizationMetadata;
  git_weak_mapping_refs?: GitWeakMappingRef[];
  created_at: string;
  updated_at: string;
}

export interface Boundary {
  boundary_id: string;
  workspace_id: string;
  branch_id: string;
  boundary_type: BoundaryType;
  statement: string;
  trigger_condition?: string;
  severity: 'low' | 'medium' | 'high';
  linked_claim_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface AnalysisFinding {
  analysis_finding_id: string;
  workspace_id: string;
  branch_id: string;
  finding_type: AnalysisFindingType;
  summary: string;
  derived_from?: string[];
  linked_evidence_item_ids: string[];
  suggested_claim_updates?: string[];
  risk_flags?: string[];
  created_at: string;
  updated_at: string;
}

export interface IssueFinding {
  issue_finding_id: string;
  workspace_id: string;
  branch_id: string;
  severity: IssueFindingSeverity;
  dimension_names?: DimensionName[];
  detail: string;
  pointers: ObjectPointer[];
  suggested_fix?: string;
  created_at: string;
  updated_at: string;
}

export interface DimensionState {
  dimension_name: DimensionName;
  level: ReadinessLevel;
  score: number;
  confidence: number;
  gap: number;
  velocity: number;
  blockers: BlockerRef[];
  evidence_refs: SourceTraceRef[];
  updated_at: string;
  rationale?: string;
}

export interface AbstractState {
  workspace_id: string;
  branch_id: string;
  stage: 'Stage1_WorthContinuing' | 'Stage2_ReadyForWritingEntry';
  dimensions: Record<DimensionName, DimensionState>;
  global_flags: {
    has_critical_blocker: boolean;
    is_plateauing: boolean;
    is_oscillating: boolean;
    has_dominated_branch: boolean;
  };
  derived: {
    current_goal_satisfied: boolean;
    next_best_targets: DimensionName[];
  };
  version: number;
  created_at: string;
}

export interface ReadinessDecision {
  readiness_decision_id: string;
  workspace_id: string;
  branch_id: string;
  decision_kind: ReadinessDecisionKind;
  stage: AbstractState['stage'];
  blockers: BlockerRef[];
  missing_items: string[];
  report_pointer?: ReportPointer;
  verified_at: string;
}

export interface DecisionRecord {
  decision_id: string;
  workspace_id: string;
  branch_id: string;
  action: DecisionAction;
  reason: string;
  actor: ResearchArgumentActor;
  human_confirmed: boolean;
  confirmation_note?: string;
  linked_object_ids?: string[];
  audit_ref?: string;
  created_at: string;
}

export interface LessonRecord {
  lesson_record_id: string;
  workspace_id: string;
  branch_id: string;
  lesson_type: LessonRecordType;
  summary: string;
  origin_decision_id?: string;
  origin_run_ids?: string[];
  applicability_tags?: string[];
  reliability?: number;
  created_at: string;
  updated_at: string;
}

export interface ReportProjection {
  report_projection_id: string;
  workspace_id: string;
  branch_id: string;
  report_kind: ReportProjectionKind;
  summary: string;
  object_pointers: ObjectPointer[];
  source_trace_refs: SourceTraceRef[];
  report_pointers?: ReportPointer[];
  created_at: string;
  updated_at: string;
}
