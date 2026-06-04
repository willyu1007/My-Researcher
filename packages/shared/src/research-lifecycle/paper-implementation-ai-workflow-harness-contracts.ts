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

export {
  PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES,
  PAPER_IMPLEMENTATION_AGENT_RUN_MODES,
  PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES,
  type PaperImplementationAgentExecutionMode,
  type PaperImplementationAgentRunMode,
  type PaperImplementationAgentWorkflowType,
} from './paper-implementation-agent-common-contracts.js';

export const PAPER_IMPLEMENTATION_HARNESS_STATUSES = [
  'active',
  'paused',
  'retired',
] as const;
export type PaperImplementationHarnessStatus =
  (typeof PAPER_IMPLEMENTATION_HARNESS_STATUSES)[number];

export const PAPER_IMPLEMENTATION_VALIDATION_STATUSES = [
  'not_run',
  'passed',
  'failed',
  'blocked',
] as const;
export type PaperImplementationValidationStatus =
  (typeof PAPER_IMPLEMENTATION_VALIDATION_STATUSES)[number];

export const PAPER_IMPLEMENTATION_AGENT_RUN_STATUSES = [
  'completed',
  'blocked',
  'failed',
  'retried',
  'superseded',
] as const;
export type PaperImplementationAgentRunStatus =
  (typeof PAPER_IMPLEMENTATION_AGENT_RUN_STATUSES)[number];

export const PAPER_IMPLEMENTATION_PROPOSAL_ARTIFACT_KINDS = [
  'draft_object',
  'proposal_object',
  'recommended_transition',
  'quality_signal',
  'gate_prep_report',
  'decision_work_queue_suggestion',
  'evaluation_report',
] as const;
export type PaperImplementationProposalArtifactKind =
  (typeof PAPER_IMPLEMENTATION_PROPOSAL_ARTIFACT_KINDS)[number];

export const PAPER_IMPLEMENTATION_PROPOSAL_STATUSES = [
  'proposed',
  'blocked',
  'accepted_by_state_writer',
  'rejected',
] as const;
export type PaperImplementationProposalStatus =
  (typeof PAPER_IMPLEMENTATION_PROPOSAL_STATUSES)[number];

export const PAPER_IMPLEMENTATION_GATE_RESULT_OUTCOMES = [
  'pass',
  'pass_with_risk',
  'require_human_review',
  'blocked',
] as const;
export type PaperImplementationGateResultOutcome =
  (typeof PAPER_IMPLEMENTATION_GATE_RESULT_OUTCOMES)[number];

export const PAPER_IMPLEMENTATION_TRANSITION_OUTCOMES = [
  'pass',
  'pass_with_risk',
  'require_human_review',
  'blocked',
  'failed',
] as const;
export type PaperImplementationTransitionOutcome =
  (typeof PAPER_IMPLEMENTATION_TRANSITION_OUTCOMES)[number];

export const PAPER_IMPLEMENTATION_DECISION_QUEUE_TYPES = [
  'human_review',
  'trace_repair',
  'gate_blocker',
  'failed_workflow',
  'failed_run_review',
  'stale_evidence_recheck',
  'accepted_risk_expiry',
  'loop_budget_review',
] as const;
export type PaperImplementationDecisionQueueType =
  (typeof PAPER_IMPLEMENTATION_DECISION_QUEUE_TYPES)[number];

export const PAPER_IMPLEMENTATION_DECISION_QUEUE_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;
export type PaperImplementationDecisionQueuePriority =
  (typeof PAPER_IMPLEMENTATION_DECISION_QUEUE_PRIORITIES)[number];

export const PAPER_IMPLEMENTATION_DECISION_QUEUE_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'dismissed',
  'superseded',
] as const;
export type PaperImplementationDecisionQueueStatus =
  (typeof PAPER_IMPLEMENTATION_DECISION_QUEUE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_DECISION_QUEUE_HANDLER_TYPES = [
  'agent',
  'human',
  'system',
] as const;
export type PaperImplementationDecisionQueueHandlerType =
  (typeof PAPER_IMPLEMENTATION_DECISION_QUEUE_HANDLER_TYPES)[number];

export const PAPER_IMPLEMENTATION_QUALITY_SIGNAL_TYPES = [
  'schema_failure',
  'reference_failure',
  'trace_failure',
  'memo_as_evidence',
  'forbidden_state_mutation',
  'run_mode_isolation_failure',
  'gate_blocker',
  'low_confidence_output',
  'provider_variance_contract_failure',
  'provider_variance_handoff_gap',
  'provider_variance_authority_violation',
  'provider_variance_traceability_violation',
  'provider_variance_claim_safety_violation',
  'provider_variance_operability_failure',
] as const;
export type PaperImplementationQualitySignalType =
  (typeof PAPER_IMPLEMENTATION_QUALITY_SIGNAL_TYPES)[number];

export const PAPER_IMPLEMENTATION_QUALITY_SIGNAL_SEVERITIES = [
  'info',
  'warning',
  'error',
  'critical',
] as const;
export type PaperImplementationQualitySignalSeverity =
  (typeof PAPER_IMPLEMENTATION_QUALITY_SIGNAL_SEVERITIES)[number];

export interface ImplementationHarnessPolicyPack {
  context_policy_version_id: string;
  trace_policy_version_id: string;
  evidence_policy_version_id: string;
  experiment_policy_version_id: string;
  retention_policy_version_id: string;
  evaluation_policy_version_id: string;
}

export interface ImplementationHarnessRuntimeBindings {
  control_plane_id: string;
  artifact_store_ref: TopicSelectionFunctionalRef;
  evidence_ledger_ref: TopicSelectionFunctionalRef;
  work_order_broker_ref: TopicSelectionFunctionalRef;
  run_monitor_ref: TopicSelectionFunctionalRef;
}

export interface ImplementationHarnessInvariants {
  require_input_snapshot: boolean;
  require_trace_manifest: boolean;
  require_artifact_refs: boolean;
  forbid_untraced_claims: boolean;
  forbid_memo_as_evidence: boolean;
  retain_failed_runs: boolean;
  separate_exploratory_and_confirmatory: boolean;
}

export interface ImplementationHarnessAuditRefs {
  harness_run_refs: TopicSelectionFunctionalRef[];
  quality_signal_refs: TopicSelectionFunctionalRef[];
  evaluation_run_refs: TopicSelectionFunctionalRef[];
}

export interface ImplementationHarness {
  harness_id: string;
  implementation_project_id: string;
  harness_status: PaperImplementationHarnessStatus;
  policy_pack: ImplementationHarnessPolicyPack;
  runtime_bindings: ImplementationHarnessRuntimeBindings;
  invariants: ImplementationHarnessInvariants;
  audit: ImplementationHarnessAuditRefs;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
}

export interface CreateImplementationHarnessRequest {
  harness_id?: string | null;
  policy_pack: ImplementationHarnessPolicyPack;
  runtime_bindings: ImplementationHarnessRuntimeBindings;
  invariants: ImplementationHarnessInvariants;
  created_by?: TopicSelectionActorType;
}

export interface ImplementationInputIncludedContext {
  motive_version_refs: TopicSelectionFunctionalRef[];
  board_version_refs: TopicSelectionFunctionalRef[];
  assertion_refs: TopicSelectionFunctionalRef[];
  evidence_binding_refs: TopicSelectionFunctionalRef[];
  route_refs: TopicSelectionFunctionalRef[];
  probe_refs: TopicSelectionFunctionalRef[];
  experiment_plan_refs: TopicSelectionFunctionalRef[];
  work_order_refs: TopicSelectionFunctionalRef[];
  run_evidence_refs: TopicSelectionFunctionalRef[];
  result_packet_refs: TopicSelectionFunctionalRef[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  human_decision_refs: TopicSelectionFunctionalRef[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
}

export interface ImplementationInputExcludedContext {
  excluded_refs: TopicSelectionFunctionalRef[];
  exclusion_reasons: string[];
}

export interface ImplementationInputFreshnessConstraints {
  exclude_stale_evidence: boolean;
  exclude_invalidated_refs: boolean;
}

export interface ImplementationInputEvidenceRules {
  memo_as_evidence_forbidden: boolean;
  citation_requires_source_locator: boolean;
}

export interface ImplementationInputSnapshot {
  input_snapshot_id: string;
  implementation_project_id: string;
  target_ref: TopicSelectionFunctionalRef;
  workflow_type: PaperImplementationAgentWorkflowType;
  context_policy_version_id: string;
  included_context: ImplementationInputIncludedContext;
  excluded_context: ImplementationInputExcludedContext;
  freshness_constraints: ImplementationInputFreshnessConstraints;
  evidence_rules: ImplementationInputEvidenceRules;
  source_hashes: string[];
  snapshot_hash: string;
  freshness_status: 'fresh' | 'stale_blocked' | 'invalidated_blocked';
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface CreateImplementationInputSnapshotRequest {
  input_snapshot_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  workflow_type: PaperImplementationAgentWorkflowType;
  context_policy_version_id: string;
  included_context: ImplementationInputIncludedContext;
  excluded_context: ImplementationInputExcludedContext;
  freshness_constraints: ImplementationInputFreshnessConstraints;
  evidence_rules: ImplementationInputEvidenceRules;
  source_hashes: string[];
  created_by?: TopicSelectionActorType;
}

export interface AgentWorkflowHarnessSpec {
  workflow_type: PaperImplementationAgentWorkflowType;
  workflow_version: string;
  input_policy: {
    required_input_snapshot: boolean;
    allowed_context_types: string[];
    forbidden_context_types: string[];
    max_context_tokens?: number | null;
  };
  prompt_policy: {
    prompt_template_version_id: string;
    system_instruction_version_id: string;
    output_schema_version_id: string;
  };
  model_policy: {
    model_profile_id: string;
    temperature: number;
    allowed_tools: string[];
  };
  output_policy: {
    required_schema: string;
    natural_language_field_contract_version_id: string;
    required_ref_fields: string[];
    forbidden_outputs: string[];
  };
  validation_policy: {
    schema_validation: boolean;
    reference_validation: boolean;
    trace_validation: boolean;
    claim_boundary_validation: boolean;
  };
  retry_policy: {
    max_retries: number;
    retry_on_schema_failure: boolean;
    retry_on_missing_refs: boolean;
  };
  audit_policy: {
    save_prompt: boolean;
    save_input_snapshot: boolean;
    save_raw_output: boolean;
    save_parsed_output: boolean;
    save_validator_results: boolean;
  };
}

export interface ImplementationProposalArtifactInput {
  proposal_artifact_id?: string | null;
  artifact_kind: PaperImplementationProposalArtifactKind;
  target_ref: TopicSelectionFunctionalRef;
  artifact_ref?: TopicSelectionFunctionalRef | null;
  source_refs: TopicSelectionFunctionalRef[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  payload: Record<string, unknown>;
}

export interface ImplementationProposalArtifact extends ImplementationProposalArtifactInput {
  proposal_artifact_id: string;
  implementation_project_id: string;
  harness_run_id: string;
  proposal_status: PaperImplementationProposalStatus;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ImplementationQualitySignalInput {
  quality_signal_id?: string | null;
  signal_type: PaperImplementationQualitySignalType;
  severity: PaperImplementationQualitySignalSeverity;
  target_ref: TopicSelectionFunctionalRef;
  summary: string;
  source_refs: TopicSelectionFunctionalRef[];
  payload?: Record<string, unknown>;
  policy_version_id?: string | null;
}

export interface ImplementationQualitySignal extends ImplementationQualitySignalInput {
  quality_signal_id: string;
  implementation_project_id: string;
  harness_run_id?: string | null;
  payload: Record<string, unknown>;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ImplementationGateCheck {
  check_id: string;
  check_name: string;
  result: 'pass' | 'fail' | 'warning';
  message: string;
  blocking: boolean;
}

export interface ImplementationGateResult {
  gate_result_id: string;
  implementation_project_id: string;
  gate_type: string;
  target_ref: TopicSelectionFunctionalRef;
  result: PaperImplementationGateResultOutcome;
  checks: ImplementationGateCheck[];
  blockers: string[];
  warnings: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  required_actions: string[];
  policy_version_id?: string | null;
  created_at: string;
}

export interface ImplementationTransitionAttempt {
  transition_id: string;
  implementation_project_id: string;
  transition_key: string;
  target_ref: TopicSelectionFunctionalRef;
  input_refs: TopicSelectionFunctionalRef[];
  output_refs: TopicSelectionFunctionalRef[];
  actor_type: TopicSelectionActorType;
  actor_id?: string | null;
  transition_policy_version_id: string;
  context_policy_version_id?: string | null;
  trace_policy_version_id: string;
  gate_result_refs: TopicSelectionFunctionalRef[];
  outcome: PaperImplementationTransitionOutcome;
  blockers: string[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  harness_run_refs: TopicSelectionFunctionalRef[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface DecisionWorkQueueItem {
  queue_item_id: string;
  implementation_project_id: string;
  queue_type: PaperImplementationDecisionQueueType;
  stage: string;
  target_ref: TopicSelectionFunctionalRef;
  priority: PaperImplementationDecisionQueuePriority;
  status: PaperImplementationDecisionQueueStatus;
  blocking_transition_keys: string[];
  dedup_key: string;
  allowed_handlers: PaperImplementationDecisionQueueHandlerType[];
  recommended_actions: string[];
  created_from_refs: TopicSelectionFunctionalRef[];
  policy_version_id?: string | null;
  retry_count: number;
  retry_budget: number;
  cooldown_until?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolveDecisionWorkQueueItemRequest {
  status: Extract<PaperImplementationDecisionQueueStatus, 'resolved' | 'dismissed' | 'superseded'>;
  resolution_note?: string | null;
  resolved_by?: TopicSelectionActorType;
}

export interface CreateAgentWorkflowHarnessRunRequest {
  harness_run_id?: string | null;
  harness_id: string;
  input_snapshot_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  workflow_version: string;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id: string;
  prompt_template_version_id: string;
  output_schema_version_id: string;
  raw_output_artifact_ref: TopicSelectionFunctionalRef;
  parsed_output_artifact_ref?: TopicSelectionFunctionalRef | null;
  spec: AgentWorkflowHarnessSpec;
  proposal_artifacts: ImplementationProposalArtifactInput[];
  quality_signal_candidates?: ImplementationQualitySignalInput[];
  direct_authority_mutation_refs?: TopicSelectionFunctionalRef[];
  memo_as_evidence_detected?: boolean;
  blocked_reason_overrides?: string[];
  created_by?: TopicSelectionActorType;
}

export interface AgentWorkflowHarnessRun {
  harness_run_id: string;
  implementation_project_id: string;
  harness_id: string;
  input_snapshot_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  workflow_version: string;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id: string;
  prompt_template_version_id: string;
  output_schema_version_id: string;
  raw_output_artifact_ref: TopicSelectionFunctionalRef;
  parsed_output_artifact_ref?: TopicSelectionFunctionalRef | null;
  schema_validation_status: PaperImplementationValidationStatus;
  reference_validation_status: PaperImplementationValidationStatus;
  trace_validation_status: PaperImplementationValidationStatus;
  nl_field_role_validation_status: PaperImplementationValidationStatus;
  memo_as_evidence_detected: boolean;
  direct_state_mutation_detected: boolean;
  blocked_reasons: string[];
  run_status: PaperImplementationAgentRunStatus;
  proposal_artifact_ids: string[];
  quality_signal_ids: string[];
  gate_result_id?: string | null;
  transition_attempt_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface CreateAgentWorkflowHarnessRunResponse {
  harness_run: AgentWorkflowHarnessRun;
  proposal_artifacts: ImplementationProposalArtifact[];
  quality_signals: ImplementationQualitySignal[];
  gate_result: ImplementationGateResult;
  transition_attempt: ImplementationTransitionAttempt;
  queue_items: DecisionWorkQueueItem[];
}

export interface ListImplementationHarnessesResponse {
  items: ImplementationHarness[];
}

export interface ListImplementationInputSnapshotsResponse {
  items: ImplementationInputSnapshot[];
}

export interface ListAgentWorkflowHarnessRunsResponse {
  items: AgentWorkflowHarnessRun[];
}

export interface ListImplementationProposalArtifactsResponse {
  items: ImplementationProposalArtifact[];
}

export interface ListDecisionWorkQueueItemsResponse {
  items: DecisionWorkQueueItem[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const stringArray = { type: 'array', items: stringId } as const;
const stringArrayNonEmpty = { type: 'array', minItems: 1, items: stringId } as const;

const workflowTypeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_WORKFLOW_TYPES] } as const;
const executionModeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES] } as const;
const runModeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_RUN_MODES] } as const;
const harnessStatusSchema = { enum: [...PAPER_IMPLEMENTATION_HARNESS_STATUSES] } as const;
const validationStatusSchema = { enum: [...PAPER_IMPLEMENTATION_VALIDATION_STATUSES] } as const;
const runStatusSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_RUN_STATUSES] } as const;
const proposalKindSchema = { enum: [...PAPER_IMPLEMENTATION_PROPOSAL_ARTIFACT_KINDS] } as const;
const proposalStatusSchema = { enum: [...PAPER_IMPLEMENTATION_PROPOSAL_STATUSES] } as const;
const gateOutcomeSchema = { enum: [...PAPER_IMPLEMENTATION_GATE_RESULT_OUTCOMES] } as const;
const transitionOutcomeSchema = { enum: [...PAPER_IMPLEMENTATION_TRANSITION_OUTCOMES] } as const;
const queueTypeSchema = { enum: [...PAPER_IMPLEMENTATION_DECISION_QUEUE_TYPES] } as const;
const queuePrioritySchema = { enum: [...PAPER_IMPLEMENTATION_DECISION_QUEUE_PRIORITIES] } as const;
const queueStatusSchema = { enum: [...PAPER_IMPLEMENTATION_DECISION_QUEUE_STATUSES] } as const;
const queueHandlerSchema = { enum: [...PAPER_IMPLEMENTATION_DECISION_QUEUE_HANDLER_TYPES] } as const;
const qualitySignalTypeSchema = { enum: [...PAPER_IMPLEMENTATION_QUALITY_SIGNAL_TYPES] } as const;
const qualitySignalSeveritySchema = { enum: [...PAPER_IMPLEMENTATION_QUALITY_SIGNAL_SEVERITIES] } as const;

export const implementationHarnessPolicyPackSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'context_policy_version_id',
    'trace_policy_version_id',
    'evidence_policy_version_id',
    'experiment_policy_version_id',
    'retention_policy_version_id',
    'evaluation_policy_version_id',
  ],
  properties: {
    context_policy_version_id: stringId,
    trace_policy_version_id: stringId,
    evidence_policy_version_id: stringId,
    experiment_policy_version_id: stringId,
    retention_policy_version_id: stringId,
    evaluation_policy_version_id: stringId,
  },
} as const;

export const implementationHarnessRuntimeBindingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'control_plane_id',
    'artifact_store_ref',
    'evidence_ledger_ref',
    'work_order_broker_ref',
    'run_monitor_ref',
  ],
  properties: {
    control_plane_id: stringId,
    artifact_store_ref: topicSelectionFunctionalRefSchema,
    evidence_ledger_ref: topicSelectionFunctionalRefSchema,
    work_order_broker_ref: topicSelectionFunctionalRefSchema,
    run_monitor_ref: topicSelectionFunctionalRefSchema,
  },
} as const;

export const implementationHarnessInvariantsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'require_input_snapshot',
    'require_trace_manifest',
    'require_artifact_refs',
    'forbid_untraced_claims',
    'forbid_memo_as_evidence',
    'retain_failed_runs',
    'separate_exploratory_and_confirmatory',
  ],
  properties: {
    require_input_snapshot: { type: 'boolean' },
    require_trace_manifest: { type: 'boolean' },
    require_artifact_refs: { type: 'boolean' },
    forbid_untraced_claims: { type: 'boolean' },
    forbid_memo_as_evidence: { type: 'boolean' },
    retain_failed_runs: { type: 'boolean' },
    separate_exploratory_and_confirmatory: { type: 'boolean' },
  },
} as const;

export const implementationHarnessAuditRefsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['harness_run_refs', 'quality_signal_refs', 'evaluation_run_refs'],
  properties: {
    harness_run_refs: functionalRefArray,
    quality_signal_refs: functionalRefArray,
    evaluation_run_refs: functionalRefArray,
  },
} as const;

export const createImplementationHarnessRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['policy_pack', 'runtime_bindings', 'invariants'],
  properties: {
    harness_id: nullableStringId,
    policy_pack: implementationHarnessPolicyPackSchema,
    runtime_bindings: implementationHarnessRuntimeBindingsSchema,
    invariants: implementationHarnessInvariantsSchema,
    created_by: actorTypeSchema,
  },
} as const;

export const implementationHarnessSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'harness_id',
    'implementation_project_id',
    'harness_status',
    'policy_pack',
    'runtime_bindings',
    'invariants',
    'audit',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    harness_id: stringId,
    implementation_project_id: stringId,
    harness_status: harnessStatusSchema,
    policy_pack: implementationHarnessPolicyPackSchema,
    runtime_bindings: implementationHarnessRuntimeBindingsSchema,
    invariants: implementationHarnessInvariantsSchema,
    audit: implementationHarnessAuditRefsSchema,
    created_by: actorTypeSchema,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const implementationInputIncludedContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'motive_version_refs',
    'board_version_refs',
    'assertion_refs',
    'evidence_binding_refs',
    'route_refs',
    'probe_refs',
    'experiment_plan_refs',
    'work_order_refs',
    'run_evidence_refs',
    'result_packet_refs',
    'accepted_risk_refs',
    'human_decision_refs',
    'trace_manifest_refs',
  ],
  properties: {
    motive_version_refs: functionalRefArray,
    board_version_refs: functionalRefArray,
    assertion_refs: functionalRefArray,
    evidence_binding_refs: functionalRefArray,
    route_refs: functionalRefArray,
    probe_refs: functionalRefArray,
    experiment_plan_refs: functionalRefArray,
    work_order_refs: functionalRefArray,
    run_evidence_refs: functionalRefArray,
    result_packet_refs: functionalRefArray,
    accepted_risk_refs: functionalRefArray,
    human_decision_refs: functionalRefArray,
    trace_manifest_refs: functionalRefArray,
  },
} as const;

export const implementationInputExcludedContextSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['excluded_refs', 'exclusion_reasons'],
  properties: {
    excluded_refs: functionalRefArray,
    exclusion_reasons: stringArray,
  },
} as const;

export const implementationInputFreshnessConstraintsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['exclude_stale_evidence', 'exclude_invalidated_refs'],
  properties: {
    exclude_stale_evidence: { type: 'boolean' },
    exclude_invalidated_refs: { type: 'boolean' },
  },
} as const;

export const implementationInputEvidenceRulesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['memo_as_evidence_forbidden', 'citation_requires_source_locator'],
  properties: {
    memo_as_evidence_forbidden: { type: 'boolean' },
    citation_requires_source_locator: { type: 'boolean' },
  },
} as const;

export const createImplementationInputSnapshotRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'target_ref',
    'workflow_type',
    'context_policy_version_id',
    'included_context',
    'excluded_context',
    'freshness_constraints',
    'evidence_rules',
    'source_hashes',
  ],
  properties: {
    input_snapshot_id: nullableStringId,
    target_ref: topicSelectionFunctionalRefSchema,
    workflow_type: workflowTypeSchema,
    context_policy_version_id: stringId,
    included_context: implementationInputIncludedContextSchema,
    excluded_context: implementationInputExcludedContextSchema,
    freshness_constraints: implementationInputFreshnessConstraintsSchema,
    evidence_rules: implementationInputEvidenceRulesSchema,
    source_hashes: stringArrayNonEmpty,
    created_by: actorTypeSchema,
  },
} as const;

export const implementationInputSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'input_snapshot_id',
    'implementation_project_id',
    'target_ref',
    'workflow_type',
    'context_policy_version_id',
    'included_context',
    'excluded_context',
    'freshness_constraints',
    'evidence_rules',
    'source_hashes',
    'snapshot_hash',
    'freshness_status',
    'created_by',
    'created_at',
  ],
  properties: {
    input_snapshot_id: stringId,
    implementation_project_id: stringId,
    target_ref: topicSelectionFunctionalRefSchema,
    workflow_type: workflowTypeSchema,
    context_policy_version_id: stringId,
    included_context: implementationInputIncludedContextSchema,
    excluded_context: implementationInputExcludedContextSchema,
    freshness_constraints: implementationInputFreshnessConstraintsSchema,
    evidence_rules: implementationInputEvidenceRulesSchema,
    source_hashes: stringArrayNonEmpty,
    snapshot_hash: stringId,
    freshness_status: { enum: ['fresh', 'stale_blocked', 'invalidated_blocked'] },
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const agentWorkflowHarnessSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workflow_type',
    'workflow_version',
    'input_policy',
    'prompt_policy',
    'model_policy',
    'output_policy',
    'validation_policy',
    'retry_policy',
    'audit_policy',
  ],
  properties: {
    workflow_type: workflowTypeSchema,
    workflow_version: stringId,
    input_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['required_input_snapshot', 'allowed_context_types', 'forbidden_context_types'],
      properties: {
        required_input_snapshot: { type: 'boolean' },
        allowed_context_types: stringArray,
        forbidden_context_types: stringArray,
        max_context_tokens: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
      },
    },
    prompt_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt_template_version_id', 'system_instruction_version_id', 'output_schema_version_id'],
      properties: {
        prompt_template_version_id: stringId,
        system_instruction_version_id: stringId,
        output_schema_version_id: stringId,
      },
    },
    model_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['model_profile_id', 'temperature', 'allowed_tools'],
      properties: {
        model_profile_id: stringId,
        temperature: { type: 'number', minimum: 0, maximum: 2 },
        allowed_tools: stringArray,
      },
    },
    output_policy: {
      type: 'object',
      additionalProperties: false,
      required: [
        'required_schema',
        'natural_language_field_contract_version_id',
        'required_ref_fields',
        'forbidden_outputs',
      ],
      properties: {
        required_schema: stringId,
        natural_language_field_contract_version_id: stringId,
        required_ref_fields: stringArray,
        forbidden_outputs: stringArray,
      },
    },
    validation_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['schema_validation', 'reference_validation', 'trace_validation', 'claim_boundary_validation'],
      properties: {
        schema_validation: { type: 'boolean' },
        reference_validation: { type: 'boolean' },
        trace_validation: { type: 'boolean' },
        claim_boundary_validation: { type: 'boolean' },
      },
    },
    retry_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['max_retries', 'retry_on_schema_failure', 'retry_on_missing_refs'],
      properties: {
        max_retries: { type: 'integer', minimum: 0 },
        retry_on_schema_failure: { type: 'boolean' },
        retry_on_missing_refs: { type: 'boolean' },
      },
    },
    audit_policy: {
      type: 'object',
      additionalProperties: false,
      required: [
        'save_prompt',
        'save_input_snapshot',
        'save_raw_output',
        'save_parsed_output',
        'save_validator_results',
      ],
      properties: {
        save_prompt: { type: 'boolean' },
        save_input_snapshot: { type: 'boolean' },
        save_raw_output: { type: 'boolean' },
        save_parsed_output: { type: 'boolean' },
        save_validator_results: { type: 'boolean' },
      },
    },
  },
} as const;

export const implementationProposalArtifactInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifact_kind', 'target_ref', 'source_refs', 'trace_manifest_refs', 'payload'],
  properties: {
    proposal_artifact_id: nullableStringId,
    artifact_kind: proposalKindSchema,
    target_ref: topicSelectionFunctionalRefSchema,
    artifact_ref: nullableFunctionalRef,
    source_refs: functionalRefArray,
    trace_manifest_refs: functionalRefArray,
    payload: objectPayload,
  },
} as const;

export const implementationProposalArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'proposal_artifact_id',
    'implementation_project_id',
    'harness_run_id',
    'artifact_kind',
    'target_ref',
    'source_refs',
    'trace_manifest_refs',
    'payload',
    'proposal_status',
    'created_by',
    'created_at',
  ],
  properties: {
    ...implementationProposalArtifactInputSchema.properties,
    proposal_artifact_id: stringId,
    implementation_project_id: stringId,
    harness_run_id: stringId,
    proposal_status: proposalStatusSchema,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const implementationQualitySignalInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['signal_type', 'severity', 'target_ref', 'summary', 'source_refs'],
  properties: {
    quality_signal_id: nullableStringId,
    signal_type: qualitySignalTypeSchema,
    severity: qualitySignalSeveritySchema,
    target_ref: topicSelectionFunctionalRefSchema,
    summary: stringId,
    source_refs: functionalRefArray,
    payload: objectPayload,
    policy_version_id: nullableStringId,
  },
} as const;

export const implementationQualitySignalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'quality_signal_id',
    'implementation_project_id',
    'signal_type',
    'severity',
    'target_ref',
    'summary',
    'source_refs',
    'payload',
    'created_by',
    'created_at',
  ],
  properties: {
    ...implementationQualitySignalInputSchema.properties,
    quality_signal_id: stringId,
    implementation_project_id: stringId,
    harness_run_id: nullableStringId,
    payload: objectPayload,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const implementationGateCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['check_id', 'check_name', 'result', 'message', 'blocking'],
  properties: {
    check_id: stringId,
    check_name: stringId,
    result: { enum: ['pass', 'fail', 'warning'] },
    message: stringId,
    blocking: { type: 'boolean' },
  },
} as const;

export const implementationGateResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'gate_result_id',
    'implementation_project_id',
    'gate_type',
    'target_ref',
    'result',
    'checks',
    'blockers',
    'warnings',
    'accepted_risk_refs',
    'required_actions',
    'created_at',
  ],
  properties: {
    gate_result_id: stringId,
    implementation_project_id: stringId,
    gate_type: stringId,
    target_ref: topicSelectionFunctionalRefSchema,
    result: gateOutcomeSchema,
    checks: { type: 'array', items: implementationGateCheckSchema },
    blockers: stringArray,
    warnings: stringArray,
    accepted_risk_refs: functionalRefArray,
    required_actions: stringArray,
    policy_version_id: nullableStringId,
    created_at: stringId,
  },
} as const;

export const implementationTransitionAttemptSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'transition_id',
    'implementation_project_id',
    'transition_key',
    'target_ref',
    'input_refs',
    'output_refs',
    'actor_type',
    'transition_policy_version_id',
    'trace_policy_version_id',
    'gate_result_refs',
    'outcome',
    'blockers',
    'accepted_risk_refs',
    'harness_run_refs',
    'trace_manifest_refs',
    'created_at',
  ],
  properties: {
    transition_id: stringId,
    implementation_project_id: stringId,
    transition_key: stringId,
    target_ref: topicSelectionFunctionalRefSchema,
    input_refs: functionalRefArray,
    output_refs: functionalRefArray,
    actor_type: actorTypeSchema,
    actor_id: nullableStringId,
    transition_policy_version_id: stringId,
    context_policy_version_id: nullableStringId,
    trace_policy_version_id: stringId,
    gate_result_refs: functionalRefArray,
    outcome: transitionOutcomeSchema,
    blockers: stringArray,
    accepted_risk_refs: functionalRefArray,
    harness_run_refs: functionalRefArray,
    trace_manifest_refs: functionalRefArray,
    created_at: stringId,
  },
} as const;

export const decisionWorkQueueItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'queue_item_id',
    'implementation_project_id',
    'queue_type',
    'stage',
    'target_ref',
    'priority',
    'status',
    'blocking_transition_keys',
    'dedup_key',
    'allowed_handlers',
    'recommended_actions',
    'created_from_refs',
    'retry_count',
    'retry_budget',
    'created_at',
    'updated_at',
  ],
  properties: {
    queue_item_id: stringId,
    implementation_project_id: stringId,
    queue_type: queueTypeSchema,
    stage: stringId,
    target_ref: topicSelectionFunctionalRefSchema,
    priority: queuePrioritySchema,
    status: queueStatusSchema,
    blocking_transition_keys: stringArray,
    dedup_key: stringId,
    allowed_handlers: { type: 'array', items: queueHandlerSchema },
    recommended_actions: stringArray,
    created_from_refs: functionalRefArray,
    policy_version_id: nullableStringId,
    retry_count: { type: 'integer', minimum: 0 },
    retry_budget: { type: 'integer', minimum: 0 },
    cooldown_until: nullableStringId,
    resolved_at: nullableStringId,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const resolveDecisionWorkQueueItemRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { enum: ['resolved', 'dismissed', 'superseded'] },
    resolution_note: nullableStringId,
    resolved_by: actorTypeSchema,
  },
} as const;

export const createAgentWorkflowHarnessRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'harness_id',
    'input_snapshot_id',
    'workflow_type',
    'workflow_version',
    'run_mode',
    'execution_mode',
    'model_profile_id',
    'prompt_template_version_id',
    'output_schema_version_id',
    'raw_output_artifact_ref',
    'spec',
    'proposal_artifacts',
  ],
  properties: {
    harness_run_id: nullableStringId,
    harness_id: stringId,
    input_snapshot_id: stringId,
    workflow_type: workflowTypeSchema,
    workflow_version: stringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: stringId,
    prompt_template_version_id: stringId,
    output_schema_version_id: stringId,
    raw_output_artifact_ref: topicSelectionFunctionalRefSchema,
    parsed_output_artifact_ref: nullableFunctionalRef,
    spec: agentWorkflowHarnessSpecSchema,
    proposal_artifacts: { type: 'array', items: implementationProposalArtifactInputSchema },
    quality_signal_candidates: { type: 'array', items: implementationQualitySignalInputSchema },
    direct_authority_mutation_refs: functionalRefArray,
    memo_as_evidence_detected: { type: 'boolean' },
    blocked_reason_overrides: stringArray,
    created_by: actorTypeSchema,
  },
} as const;

export const agentWorkflowHarnessRunSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'harness_run_id',
    'implementation_project_id',
    'harness_id',
    'input_snapshot_id',
    'workflow_type',
    'workflow_version',
    'run_mode',
    'execution_mode',
    'model_profile_id',
    'prompt_template_version_id',
    'output_schema_version_id',
    'raw_output_artifact_ref',
    'schema_validation_status',
    'reference_validation_status',
    'trace_validation_status',
    'nl_field_role_validation_status',
    'memo_as_evidence_detected',
    'direct_state_mutation_detected',
    'blocked_reasons',
    'run_status',
    'proposal_artifact_ids',
    'quality_signal_ids',
    'created_by',
    'created_at',
  ],
  properties: {
    harness_run_id: stringId,
    implementation_project_id: stringId,
    harness_id: stringId,
    input_snapshot_id: stringId,
    workflow_type: workflowTypeSchema,
    workflow_version: stringId,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: stringId,
    prompt_template_version_id: stringId,
    output_schema_version_id: stringId,
    raw_output_artifact_ref: topicSelectionFunctionalRefSchema,
    parsed_output_artifact_ref: nullableFunctionalRef,
    schema_validation_status: validationStatusSchema,
    reference_validation_status: validationStatusSchema,
    trace_validation_status: validationStatusSchema,
    nl_field_role_validation_status: validationStatusSchema,
    memo_as_evidence_detected: { type: 'boolean' },
    direct_state_mutation_detected: { type: 'boolean' },
    blocked_reasons: stringArray,
    run_status: runStatusSchema,
    proposal_artifact_ids: stringArray,
    quality_signal_ids: stringArray,
    gate_result_id: nullableStringId,
    transition_attempt_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const createAgentWorkflowHarnessRunResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'harness_run',
    'proposal_artifacts',
    'quality_signals',
    'gate_result',
    'transition_attempt',
    'queue_items',
  ],
  properties: {
    harness_run: agentWorkflowHarnessRunSchema,
    proposal_artifacts: { type: 'array', items: implementationProposalArtifactSchema },
    quality_signals: { type: 'array', items: implementationQualitySignalSchema },
    gate_result: implementationGateResultSchema,
    transition_attempt: implementationTransitionAttemptSchema,
    queue_items: { type: 'array', items: decisionWorkQueueItemSchema },
  },
} as const;

export const listImplementationHarnessesResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: implementationHarnessSchema } },
} as const;

export const listImplementationInputSnapshotsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: implementationInputSnapshotSchema } },
} as const;

export const listAgentWorkflowHarnessRunsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: agentWorkflowHarnessRunSchema } },
} as const;

export const listImplementationProposalArtifactsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: implementationProposalArtifactSchema } },
} as const;

export const listDecisionWorkQueueItemsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: { items: { type: 'array', items: decisionWorkQueueItemSchema } },
} as const;
