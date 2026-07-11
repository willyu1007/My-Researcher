import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES = [
  'dry_run',
  'exploratory',
  'confirmatory',
  'reproduction',
  'data_check',
  'baseline_check',
  'ablation',
  'robustness',
  'error_analysis',
] as const;
export type PaperImplementationWorkOrderRunType =
  (typeof PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES)[number];

export const PAPER_IMPLEMENTATION_WORK_ORDER_STATUSES = [
  'draft',
  'admitted',
  'running',
  'completed',
  'failed',
  'cancelled',
  'aborted',
  'superseded',
] as const;
export type PaperImplementationWorkOrderStatus =
  (typeof PAPER_IMPLEMENTATION_WORK_ORDER_STATUSES)[number];

export const PAPER_IMPLEMENTATION_AUTOTUNE_POLICIES = [
  'disabled',
  'exploratory_only',
  'human_confirmed',
] as const;
export type PaperImplementationAutotunePolicy =
  (typeof PAPER_IMPLEMENTATION_AUTOTUNE_POLICIES)[number];

export const PAPER_IMPLEMENTATION_HARNESS_RUN_STATUSES = [
  'submitted',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type PaperImplementationHarnessRunStatus =
  (typeof PAPER_IMPLEMENTATION_HARNESS_RUN_STATUSES)[number];

export const PAPER_IMPLEMENTATION_MONITOR_EVENT_KINDS = [
  'submitted',
  'status_update',
  'result_available',
  'failed',
  'cancelled',
  'heartbeat',
] as const;
export type PaperImplementationMonitorEventKind =
  (typeof PAPER_IMPLEMENTATION_MONITOR_EVENT_KINDS)[number];

export const PAPER_IMPLEMENTATION_RUN_STATUSES = [
  'submitted',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'inconclusive',
  'negative',
] as const;
export type PaperImplementationRunStatus =
  (typeof PAPER_IMPLEMENTATION_RUN_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RUN_TRUST_STATUSES = [
  'trusted',
  'untrusted',
  'needs_review',
] as const;
export type PaperImplementationRunTrustStatus =
  (typeof PAPER_IMPLEMENTATION_RUN_TRUST_STATUSES)[number];

export interface ResearchWorkOrderPolicy {
  run_policy_id: string;
  retry_budget: number;
  compute_limit_ref?: TopicSelectionFunctionalRef | null;
  stop_condition_refs: TopicSelectionFunctionalRef[];
  allowed_mutation_refs: TopicSelectionFunctionalRef[];
  autotune_policy: PaperImplementationAutotunePolicy;
}

export interface ExperimentFoundationBridgeRefs {
  run_recipe_ref: TopicSelectionFunctionalRef;
  run_recipe_hash: string;
  version_lock_hash?: string | null;
  config_snapshot_hash?: string | null;
  materialization_result_ref?: TopicSelectionFunctionalRef | null;
  materialization_result_hash?: string | null;
  training_task_spec_ref?: TopicSelectionFunctionalRef | null;
  training_task_spec_hash?: string | null;
  external_job_ref?: TopicSelectionFunctionalRef | null;
  external_job_hash?: string | null;
  result_validation_policy_ref?: TopicSelectionFunctionalRef | null;
}

export interface ResearchWorkOrder {
  work_order_id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  experiment_plan_light_id?: string | null;
  run_type: PaperImplementationWorkOrderRunType;
  work_order_status: PaperImplementationWorkOrderStatus;
  run_policy: ResearchWorkOrderPolicy;
  experiment_bridge: ExperimentFoundationBridgeRefs;
  motive_refs: TopicSelectionFunctionalRef[];
  assertion_refs: TopicSelectionFunctionalRef[];
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  admission_gate_result_id?: string | null;
  policy_version_id?: string | null;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
  updated_at: string;
  admitted_at?: string | null;
}

export interface ResearchWorkOrderHarnessRun {
  harness_run_id: string;
  implementation_project_id: string;
  work_order_id: string;
  run_status: PaperImplementationHarnessRunStatus;
  run_attempt: number;
  idempotency_key: string;
  external_job_ref: TopicSelectionFunctionalRef;
  external_job_hash: string;
  submitted_at: string;
  completed_at?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface RunMonitorIntakeRecord {
  monitor_intake_id: string;
  implementation_project_id: string;
  work_order_id?: string | null;
  external_job_ref?: TopicSelectionFunctionalRef | null;
  external_job_hash?: string | null;
  monitor_event_kind: PaperImplementationMonitorEventKind;
  run_status: PaperImplementationRunStatus;
  trust_status: PaperImplementationRunTrustStatus;
  result_ref?: TopicSelectionFunctionalRef | null;
  result_hash?: string | null;
  result_validation_report_ref?: TopicSelectionFunctionalRef | null;
  result_validation_report_hash?: string | null;
  evidence_candidate_refs: TopicSelectionFunctionalRef[];
  evidence_candidate_hashes: string[];
  failure_summary?: string | null;
  raw_payload: Record<string, unknown>;
  received_at: string;
  created_by: TopicSelectionActorType;
}

export interface RunEvidenceUnit {
  run_evidence_unit_id: string;
  implementation_project_id: string;
  work_order_id: string;
  validation_cycle_id: string;
  experiment_plan_light_id?: string | null;
  monitor_intake_id: string;
  external_job_ref?: TopicSelectionFunctionalRef | null;
  external_job_hash?: string | null;
  run_type: PaperImplementationWorkOrderRunType;
  run_status: PaperImplementationRunStatus;
  trusted_status: PaperImplementationRunTrustStatus;
  dataset_version_refs: TopicSelectionFunctionalRef[];
  baseline_version_refs: TopicSelectionFunctionalRef[];
  code_version_refs: TopicSelectionFunctionalRef[];
  config_refs: TopicSelectionFunctionalRef[];
  result_ref?: TopicSelectionFunctionalRef | null;
  result_hash?: string | null;
  result_validation_report_ref?: TopicSelectionFunctionalRef | null;
  result_validation_report_hash?: string | null;
  evidence_candidate_refs: TopicSelectionFunctionalRef[];
  evidence_candidate_hashes: string[];
  failure_summary_id?: string | null;
  failure_summary?: string | null;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface CreateResearchWorkOrderDraftRequest {
  work_order_id: string;
  validation_cycle_id: string;
  experiment_plan_light_id?: string | null;
  run_type: PaperImplementationWorkOrderRunType;
  run_policy: ResearchWorkOrderPolicy;
  experiment_bridge: ExperimentFoundationBridgeRefs;
  motive_refs?: TopicSelectionFunctionalRef[];
  assertion_refs?: TopicSelectionFunctionalRef[];
  dataset_version_refs?: TopicSelectionFunctionalRef[];
  baseline_version_refs?: TopicSelectionFunctionalRef[];
  code_version_refs?: TopicSelectionFunctionalRef[];
  config_refs?: TopicSelectionFunctionalRef[];
  trace_manifest_id: string;
  policy_version_id?: string | null;
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface AdmitResearchWorkOrderRequest {
  admission_gate_result_id: string;
  created_by?: TopicSelectionActorType;
}

export interface SubmitResearchWorkOrderHarnessRunRequest {
  harness_run_id?: string;
  run_attempt?: number;
  idempotency_key: string;
  external_job_ref: TopicSelectionFunctionalRef;
  external_job_hash: string;
  submitted_at?: string;
  created_by?: TopicSelectionActorType;
}

export interface RecordRunMonitorIntakeRequest {
  monitor_intake_id?: string;
  run_evidence_unit_id?: string;
  run_evidence_trace_manifest_id?: string | null;
  work_order_id?: string | null;
  external_job_ref?: TopicSelectionFunctionalRef | null;
  external_job_hash?: string | null;
  monitor_event_kind: PaperImplementationMonitorEventKind;
  run_status: PaperImplementationRunStatus;
  result_ref?: TopicSelectionFunctionalRef | null;
  result_hash?: string | null;
  result_validation_report_ref?: TopicSelectionFunctionalRef | null;
  result_validation_report_hash?: string | null;
  evidence_candidate_refs?: TopicSelectionFunctionalRef[];
  evidence_candidate_hashes?: string[];
  failure_summary?: string | null;
  raw_payload?: Record<string, unknown>;
  received_at?: string;
  created_by?: TopicSelectionActorType;
}

export interface RecordRunMonitorIntakeResponse {
  monitor_intake: RunMonitorIntakeRecord;
  run_evidence_unit: RunEvidenceUnit | null;
}

export interface ListResearchWorkOrdersResponse {
  items: ResearchWorkOrder[];
}

export interface ListRunEvidenceUnitsResponse {
  items: RunEvidenceUnit[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const functionalRefArray = { type: 'array', items: topicSelectionFunctionalRefSchema } as const;
const functionalRefArrayNonEmpty = {
  type: 'array',
  minItems: 1,
  items: topicSelectionFunctionalRefSchema,
} as const;
const nullableFunctionalRef = { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;

const runTypeSchema = { enum: [...PAPER_IMPLEMENTATION_WORK_ORDER_RUN_TYPES] } as const;
const workOrderStatusSchema = { enum: [...PAPER_IMPLEMENTATION_WORK_ORDER_STATUSES] } as const;
const autotunePolicySchema = { enum: [...PAPER_IMPLEMENTATION_AUTOTUNE_POLICIES] } as const;
const harnessRunStatusSchema = { enum: [...PAPER_IMPLEMENTATION_HARNESS_RUN_STATUSES] } as const;
const monitorEventKindSchema = { enum: [...PAPER_IMPLEMENTATION_MONITOR_EVENT_KINDS] } as const;
const runStatusSchema = { enum: [...PAPER_IMPLEMENTATION_RUN_STATUSES] } as const;
const trustStatusSchema = { enum: [...PAPER_IMPLEMENTATION_RUN_TRUST_STATUSES] } as const;

export const researchWorkOrderPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_policy_id', 'retry_budget', 'stop_condition_refs', 'allowed_mutation_refs', 'autotune_policy'],
  properties: {
    run_policy_id: stringId,
    retry_budget: { type: 'integer', minimum: 0 },
    compute_limit_ref: nullableFunctionalRef,
    stop_condition_refs: functionalRefArrayNonEmpty,
    allowed_mutation_refs: functionalRefArray,
    autotune_policy: autotunePolicySchema,
  },
} as const;

export const experimentFoundationBridgeRefsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_recipe_ref', 'run_recipe_hash'],
  properties: {
    run_recipe_ref: topicSelectionFunctionalRefSchema,
    run_recipe_hash: stringId,
    version_lock_hash: nullableStringId,
    config_snapshot_hash: nullableStringId,
    materialization_result_ref: nullableFunctionalRef,
    materialization_result_hash: nullableStringId,
    training_task_spec_ref: nullableFunctionalRef,
    training_task_spec_hash: nullableStringId,
    external_job_ref: nullableFunctionalRef,
    external_job_hash: nullableStringId,
    result_validation_policy_ref: nullableFunctionalRef,
  },
} as const;

export const createResearchWorkOrderDraftRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_id',
    'validation_cycle_id',
    'run_type',
    'run_policy',
    'experiment_bridge',
    'trace_manifest_id',
  ],
  properties: {
    work_order_id: stringId,
    validation_cycle_id: stringId,
    experiment_plan_light_id: nullableStringId,
    run_type: runTypeSchema,
    run_policy: researchWorkOrderPolicySchema,
    experiment_bridge: experimentFoundationBridgeRefsSchema,
    motive_refs: functionalRefArray,
    assertion_refs: functionalRefArray,
    dataset_version_refs: functionalRefArray,
    baseline_version_refs: functionalRefArray,
    code_version_refs: functionalRefArray,
    config_refs: functionalRefArray,
    trace_manifest_id: stringId,
    policy_version_id: nullableStringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const admitResearchWorkOrderRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['admission_gate_result_id'],
  properties: {
    admission_gate_result_id: stringId,
    created_by: actorTypeSchema,
  },
} as const;

export const submitResearchWorkOrderHarnessRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['idempotency_key', 'external_job_ref', 'external_job_hash'],
  properties: {
    harness_run_id: stringId,
    run_attempt: { type: 'integer', minimum: 1 },
    idempotency_key: stringId,
    external_job_ref: topicSelectionFunctionalRefSchema,
    external_job_hash: stringId,
    submitted_at: stringId,
    created_by: actorTypeSchema,
  },
} as const;

export const recordRunMonitorIntakeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['monitor_event_kind', 'run_status'],
  properties: {
    monitor_intake_id: stringId,
    run_evidence_unit_id: stringId,
    run_evidence_trace_manifest_id: nullableStringId,
    work_order_id: nullableStringId,
    external_job_ref: nullableFunctionalRef,
    external_job_hash: nullableStringId,
    monitor_event_kind: monitorEventKindSchema,
    run_status: runStatusSchema,
    result_ref: nullableFunctionalRef,
    result_hash: nullableStringId,
    result_validation_report_ref: nullableFunctionalRef,
    result_validation_report_hash: nullableStringId,
    evidence_candidate_refs: functionalRefArray,
    evidence_candidate_hashes: { type: 'array', items: stringId },
    failure_summary: nullableStringId,
    raw_payload: objectPayload,
    received_at: stringId,
    created_by: actorTypeSchema,
  },
} as const;

export const researchWorkOrderSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_id',
    'implementation_project_id',
    'validation_cycle_id',
    'run_type',
    'work_order_status',
    'run_policy',
    'experiment_bridge',
    'motive_refs',
    'assertion_refs',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'trace_manifest_ref',
    'trace_manifest_id',
    'created_by',
    'created_at',
    'updated_at',
  ],
  properties: {
    work_order_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: stringId,
    experiment_plan_light_id: nullableStringId,
    run_type: runTypeSchema,
    work_order_status: workOrderStatusSchema,
    run_policy: researchWorkOrderPolicySchema,
    experiment_bridge: experimentFoundationBridgeRefsSchema,
    motive_refs: functionalRefArray,
    assertion_refs: functionalRefArray,
    dataset_version_refs: functionalRefArray,
    baseline_version_refs: functionalRefArray,
    code_version_refs: functionalRefArray,
    config_refs: functionalRefArray,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    admission_gate_result_id: nullableStringId,
    policy_version_id: nullableStringId,
    source_proposal_artifact_ref: nullableFunctionalRef,
    source_proposal_artifact_hash: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
    updated_at: stringId,
    admitted_at: nullableStringId,
  },
} as const;

export const researchWorkOrderHarnessRunSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'harness_run_id',
    'implementation_project_id',
    'work_order_id',
    'run_status',
    'run_attempt',
    'idempotency_key',
    'external_job_ref',
    'external_job_hash',
    'submitted_at',
    'created_by',
    'created_at',
  ],
  properties: {
    harness_run_id: stringId,
    implementation_project_id: stringId,
    work_order_id: stringId,
    run_status: harnessRunStatusSchema,
    run_attempt: { type: 'integer', minimum: 1 },
    idempotency_key: stringId,
    external_job_ref: topicSelectionFunctionalRefSchema,
    external_job_hash: stringId,
    submitted_at: stringId,
    completed_at: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const runMonitorIntakeRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'monitor_intake_id',
    'implementation_project_id',
    'monitor_event_kind',
    'run_status',
    'trust_status',
    'evidence_candidate_refs',
    'evidence_candidate_hashes',
    'raw_payload',
    'received_at',
    'created_by',
  ],
  properties: {
    monitor_intake_id: stringId,
    implementation_project_id: stringId,
    work_order_id: nullableStringId,
    external_job_ref: nullableFunctionalRef,
    external_job_hash: nullableStringId,
    monitor_event_kind: monitorEventKindSchema,
    run_status: runStatusSchema,
    trust_status: trustStatusSchema,
    result_ref: nullableFunctionalRef,
    result_hash: nullableStringId,
    result_validation_report_ref: nullableFunctionalRef,
    result_validation_report_hash: nullableStringId,
    evidence_candidate_refs: functionalRefArray,
    evidence_candidate_hashes: { type: 'array', items: stringId },
    failure_summary: nullableStringId,
    raw_payload: objectPayload,
    received_at: stringId,
    created_by: actorTypeSchema,
  },
} as const;

export const runEvidenceUnitSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_evidence_unit_id',
    'implementation_project_id',
    'work_order_id',
    'validation_cycle_id',
    'monitor_intake_id',
    'run_type',
    'run_status',
    'trusted_status',
    'dataset_version_refs',
    'baseline_version_refs',
    'code_version_refs',
    'config_refs',
    'evidence_candidate_refs',
    'evidence_candidate_hashes',
    'trace_manifest_ref',
    'trace_manifest_id',
    'created_by',
    'created_at',
  ],
  properties: {
    run_evidence_unit_id: stringId,
    implementation_project_id: stringId,
    work_order_id: stringId,
    validation_cycle_id: stringId,
    experiment_plan_light_id: nullableStringId,
    monitor_intake_id: stringId,
    external_job_ref: nullableFunctionalRef,
    external_job_hash: nullableStringId,
    run_type: runTypeSchema,
    run_status: runStatusSchema,
    trusted_status: trustStatusSchema,
    dataset_version_refs: functionalRefArray,
    baseline_version_refs: functionalRefArray,
    code_version_refs: functionalRefArray,
    config_refs: functionalRefArray,
    result_ref: nullableFunctionalRef,
    result_hash: nullableStringId,
    result_validation_report_ref: nullableFunctionalRef,
    result_validation_report_hash: nullableStringId,
    evidence_candidate_refs: functionalRefArray,
    evidence_candidate_hashes: { type: 'array', items: stringId },
    failure_summary_id: nullableStringId,
    failure_summary: nullableStringId,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const recordRunMonitorIntakeResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['monitor_intake', 'run_evidence_unit'],
  properties: {
    monitor_intake: runMonitorIntakeRecordSchema,
    run_evidence_unit: { anyOf: [runEvidenceUnitSchema, { type: 'null' }] },
  },
} as const;
