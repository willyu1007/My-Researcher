import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import type {
  TopicSelectionSeverity,
} from './topic-selection-recheck-risk-memory-contracts.js';
import {
  PAPER_IMPLEMENTATION_CLAIM_STRENGTHS,
  type PaperImplementationClaimStrength,
} from './paper-implementation-trace-contracts.js';
import {
  implementationFeedbackEventSchema,
  type RecordImplementationFeedbackEventResponse,
} from './paper-implementation-contracts.js';

export const PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_GATE_STATUSES = [
  'passed',
  'passed_with_risk',
  'blocked',
] as const;
export type PaperImplementationResultInterpretationGateStatus =
  (typeof PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_GATE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_CLAIM_TYPES = [
  'method_claim',
  'empirical_finding',
  'resource_claim',
  'analysis_claim',
  'negative_result_claim',
  'system_claim',
] as const;
export type PaperImplementationClaimType =
  (typeof PAPER_IMPLEMENTATION_CLAIM_TYPES)[number];

export const PAPER_IMPLEMENTATION_CLAIM_CANDIDATE_STATUSES = [
  'proposed',
  'support_pending_trace',
  'supported',
  'weakened',
  'rejected',
  'needs_more_evidence',
] as const;
export type PaperImplementationClaimCandidateStatus =
  (typeof PAPER_IMPLEMENTATION_CLAIM_CANDIDATE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_GATE_STATUSES = [
  'allow_tentative',
  'allow_moderate',
  'allow_strong_with_confirmation',
  'request_scope_narrowing',
  'request_additional_evidence',
  'request_reinterpretation',
  'blocked',
] as const;
export type PaperImplementationClaimBoundaryGateStatus =
  (typeof PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_GATE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_DOSSIER_STATUSES = [
  'draft',
  'trace_partial',
  'experiment_partial',
  'claim_partial',
  'ready_for_writing',
  'parked_with_reopen_condition',
  'abandoned_with_trace',
  'blocked',
] as const;
export type PaperImplementationDossierStatus =
  (typeof PAPER_IMPLEMENTATION_DOSSIER_STATUSES)[number];

export const PAPER_IMPLEMENTATION_DOSSIER_TRACE_STATUSES = [
  'complete',
  'partial',
  'blocked',
] as const;
export type PaperImplementationDossierTraceStatus =
  (typeof PAPER_IMPLEMENTATION_DOSSIER_TRACE_STATUSES)[number];

export const PAPER_IMPLEMENTATION_WRITING_ENTRY_PACKET_STATUSES = [
  'current',
  'stale',
  'blocked',
] as const;
export type PaperImplementationWritingEntryPacketStatus =
  (typeof PAPER_IMPLEMENTATION_WRITING_ENTRY_PACKET_STATUSES)[number];

export const PAPER_IMPLEMENTATION_RESULT_FEEDBACK_TRIGGERS = [
  'lower_claim_ceiling',
  'invalidated_evidence',
  'topic_question_not_answerable',
] as const;
export type PaperImplementationResultFeedbackTrigger =
  (typeof PAPER_IMPLEMENTATION_RESULT_FEEDBACK_TRIGGERS)[number];

export interface ResultInterpretationSourceBundle {
  run_evidence_refs: TopicSelectionFunctionalRef[];
  validation_report_refs: TopicSelectionFunctionalRef[];
  metric_refs: TopicSelectionFunctionalRef[];
  failed_run_refs: TopicSelectionFunctionalRef[];
  inconclusive_run_refs: TopicSelectionFunctionalRef[];
  stale_or_invalidated_evidence_refs: TopicSelectionFunctionalRef[];
}

export interface ResultInterpretationSummary {
  result_summary: string;
  supports_assertion_refs: TopicSelectionFunctionalRef[];
  challenges_assertion_refs: TopicSelectionFunctionalRef[];
  unexpected_findings: string[];
  failed_runs_accounted_for: boolean;
  inconclusive_runs_accounted_for: boolean;
  exploratory_confirmatory_separated: boolean;
}

export interface ResultInterpretationReliability {
  failed_runs_retained: boolean;
  confound_refs: TopicSelectionFunctionalRef[];
  limitation_refs: TopicSelectionFunctionalRef[];
  reliability_notes: string[];
}

export interface ResultInterpretationClaimImplications {
  allowed_claim_ceiling: PaperImplementationClaimStrength;
  forbidden_overclaims: string[];
  recommended_claim_refs: TopicSelectionFunctionalRef[];
  required_followup_refs: TopicSelectionFunctionalRef[];
}

export interface ResultInterpretationPacket {
  result_interpretation_packet_id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  /** Null/absent only for readable pre-P4 history. */
  schema_version?: 'PaperImplementationResultInterpretationPacket@v2' | null;
  /** Null/absent only for readable pre-P4 history. */
  closure_id?: string | null;
  /** Null/absent only for readable pre-P4 history. */
  closure_snapshot_hash?: string | null;
  /** Null/absent only for readable pre-P4 history. */
  packet_content_hash?: string | null;
  experiment_plan_light_id?: string | null;
  source: ResultInterpretationSourceBundle;
  result_summary: ResultInterpretationSummary;
  reliability: ResultInterpretationReliability;
  claim_implications: ResultInterpretationClaimImplications;
  interpretation_gate_status: PaperImplementationResultInterpretationGateStatus;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface ClosedResultInterpretationPacketV2
extends ResultInterpretationPacket {
  schema_version: 'PaperImplementationResultInterpretationPacket@v2';
  closure_id: string;
  closure_snapshot_hash: string;
  packet_content_hash: string;
}

export type ResultInterpretationPacketV2HashInput = Omit<
  ClosedResultInterpretationPacketV2,
  'packet_content_hash' | 'created_at'
>;

export interface CreateResultInterpretationPacketRequest {
  result_interpretation_packet_id: string;
  validation_cycle_id: string;
  experiment_plan_light_id?: string | null;
  source: ResultInterpretationSourceBundle;
  result_summary: ResultInterpretationSummary;
  reliability: ResultInterpretationReliability;
  claim_implications: ResultInterpretationClaimImplications;
  trace_manifest_id: string;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface ClaimCandidateScope {
  population_scope: string;
  method_scope: string;
  dataset_scope: string;
  metric_scope: string;
  negative_scope_notes: string[];
  excluded_scope_notes: string[];
}

export interface ClaimBoundaryAssessment {
  boundary_gate_result_id?: string | null;
  rationale: string;
  forbidden_overclaims: string[];
  hidden_counter_evidence_refs: TopicSelectionFunctionalRef[];
  required_followup_refs: TopicSelectionFunctionalRef[];
  human_confirmation_ref?: TopicSelectionFunctionalRef | null;
}

export interface ClaimCandidate {
  claim_candidate_id: string;
  implementation_project_id: string;
  claim_type: PaperImplementationClaimType;
  claim_statement: string;
  claim_strength: PaperImplementationClaimStrength;
  claim_status: PaperImplementationClaimCandidateStatus;
  boundary_gate_status: PaperImplementationClaimBoundaryGateStatus;
  result_interpretation_packet_refs: TopicSelectionFunctionalRef[];
  support_refs: TopicSelectionFunctionalRef[];
  challenge_refs: TopicSelectionFunctionalRef[];
  scope: ClaimCandidateScope;
  boundary: ClaimBoundaryAssessment;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  claim_trace_packet_ref?: TopicSelectionFunctionalRef | null;
  claim_trace_packet_id?: string | null;
  human_confirmation_required: boolean;
  forbidden_overclaim_count: number;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface CreateClaimCandidateRequest {
  claim_candidate_id: string;
  claim_type: PaperImplementationClaimType;
  claim_statement: string;
  claim_strength: PaperImplementationClaimStrength;
  result_interpretation_packet_ids: string[];
  support_refs: TopicSelectionFunctionalRef[];
  challenge_refs?: TopicSelectionFunctionalRef[];
  scope: ClaimCandidateScope;
  boundary: ClaimBoundaryAssessment;
  trace_manifest_id: string;
  claim_trace_packet_id?: string | null;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface ImplementationDossierSourceBundle {
  result_interpretation_packet_refs: TopicSelectionFunctionalRef[];
  claim_candidate_refs: TopicSelectionFunctionalRef[];
  claim_trace_packet_refs: TopicSelectionFunctionalRef[];
  run_evidence_refs: TopicSelectionFunctionalRef[];
  validation_cycle_refs: TopicSelectionFunctionalRef[];
  trace_manifest_refs: TopicSelectionFunctionalRef[];
  /** Optional only so pre-cutover persisted dossiers remain readable history. */
  closed_validation_cycle_snapshot_refs?: ClosedValidationCycleSnapshotRef[];
}

export interface ClosedValidationCycleSnapshotRef {
  validation_cycle_id: string;
  closure_id: string;
  closure_snapshot_hash: string;
}

export interface ImplementationDossierExperimentSection {
  failed_run_refs: TopicSelectionFunctionalRef[];
  inconclusive_run_refs: TopicSelectionFunctionalRef[];
  negative_result_refs: TopicSelectionFunctionalRef[];
  excluded_stale_or_invalidated_evidence_refs: TopicSelectionFunctionalRef[];
  experiment_limitations: string[];
}

export interface ImplementationDossierClaimSection {
  admitted_claim_refs: TopicSelectionFunctionalRef[];
  rejected_claim_refs: TopicSelectionFunctionalRef[];
  forbidden_overclaims: string[];
  claim_ceiling: PaperImplementationClaimStrength;
}

export interface ImplementationDossierReadiness {
  readiness_gate_result_id?: string | null;
  blocker_refs: TopicSelectionFunctionalRef[];
  warning_refs: TopicSelectionFunctionalRef[];
  readiness_notes: string[];
}

export interface ImplementationDossier {
  dossier_id: string;
  implementation_project_id: string;
  dossier_version: number;
  dossier_status: PaperImplementationDossierStatus;
  dossier_trace_status: PaperImplementationDossierTraceStatus;
  source: ImplementationDossierSourceBundle;
  experiment_section: ImplementationDossierExperimentSection;
  claim_section: ImplementationDossierClaimSection;
  readiness: ImplementationDossierReadiness;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  failed_run_count: number;
  forbidden_overclaim_count: number;
  readiness_gate_result_id?: string | null;
  projection_policy_version_id?: string | null;
  dossier_hash: string;
  reopen_condition?: string | null;
  abandon_reason?: string | null;
  policy_version_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface CreateImplementationDossierRequest {
  dossier_id: string;
  dossier_version?: number;
  dossier_status: PaperImplementationDossierStatus;
  result_interpretation_packet_ids: string[];
  claim_candidate_ids: string[];
  claim_trace_packet_ids: string[];
  closed_validation_cycle_snapshot_refs: ClosedValidationCycleSnapshotRef[];
  experiment_section: ImplementationDossierExperimentSection;
  claim_section: ImplementationDossierClaimSection;
  readiness: ImplementationDossierReadiness;
  trace_manifest_id: string;
  projection_policy_version_id?: string | null;
  reopen_condition?: string | null;
  abandon_reason?: string | null;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface PaperImplementationWritingEntryPacket {
  writing_entry_packet_id: string;
  implementation_project_id: string;
  dossier_id: string;
  dossier_version: number;
  dossier_hash: string;
  dossier_status: PaperImplementationDossierStatus;
  readiness_gate_result_id: string;
  trace_manifest_ref: TopicSelectionFunctionalRef;
  trace_manifest_id: string;
  projection_policy_version_id: string;
  packet_status: PaperImplementationWritingEntryPacketStatus;
  writing_target_ref?: TopicSelectionFunctionalRef | null;
  packet_payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface CreateWritingEntryPacketRequest {
  projection_policy_version_id?: string | null;
  writing_target_ref?: TopicSelectionFunctionalRef | null;
  packet_payload?: Record<string, unknown>;
  created_by?: TopicSelectionActorType;
}

export interface RecordResultClaimFeedbackEventRequest {
  feedback_trigger: PaperImplementationResultFeedbackTrigger;
  severity: TopicSelectionSeverity;
  summary: string;
  source_object_refs?: TopicSelectionFunctionalRef[];
  evidence_refs?: TopicSelectionFunctionalRef[];
  run_refs?: TopicSelectionFunctionalRef[];
  artifact_refs?: TopicSelectionFunctionalRef[];
  required_action?: string | null;
  feedback_payload?: Record<string, unknown>;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface RecordResultClaimFeedbackEventResponse
extends RecordImplementationFeedbackEventResponse {
  feedback_trigger: PaperImplementationResultFeedbackTrigger;
}

const stringId = { type: 'string', minLength: 1 } as const;
const canonicalHash = { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' } as const;
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
const stringArray = { type: 'array', items: stringId } as const;
const stringArrayNonEmpty = { type: 'array', minItems: 1, items: stringId } as const;
const severitySchema = { enum: ['info', 'warning', 'blocking', 'critical'] } as const;
const claimStrengthSchema = { enum: [...PAPER_IMPLEMENTATION_CLAIM_STRENGTHS] } as const;
const interpretationGateStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_GATE_STATUSES],
} as const;
const claimTypeSchema = { enum: [...PAPER_IMPLEMENTATION_CLAIM_TYPES] } as const;
const claimCandidateStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_CLAIM_CANDIDATE_STATUSES],
} as const;
const claimBoundaryGateStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_GATE_STATUSES],
} as const;
const dossierStatusSchema = { enum: [...PAPER_IMPLEMENTATION_DOSSIER_STATUSES] } as const;
const dossierTraceStatusSchema = { enum: [...PAPER_IMPLEMENTATION_DOSSIER_TRACE_STATUSES] } as const;
const writingEntryPacketStatusSchema = {
  enum: [...PAPER_IMPLEMENTATION_WRITING_ENTRY_PACKET_STATUSES],
} as const;
const resultFeedbackTriggerSchema = {
  enum: [...PAPER_IMPLEMENTATION_RESULT_FEEDBACK_TRIGGERS],
} as const;

export const RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED_REASON_CODE =
  'RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED' as const;
export const PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_PACKET_V2_SCHEMA_VERSION =
  'PaperImplementationResultInterpretationPacket@v2' as const;
export const CLOSED_INTERPRETATION_PACKET_REQUIRED_REASON_CODE =
  'CLOSED_INTERPRETATION_PACKET_REQUIRED' as const;

export const closedValidationCycleSnapshotRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['validation_cycle_id', 'closure_id', 'closure_snapshot_hash'],
  properties: {
    validation_cycle_id: stringId,
    closure_id: stringId,
    closure_snapshot_hash: stringId,
  },
} as const;

export const resultInterpretationSourceBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_evidence_refs',
    'validation_report_refs',
    'metric_refs',
    'failed_run_refs',
    'inconclusive_run_refs',
    'stale_or_invalidated_evidence_refs',
  ],
  properties: {
    run_evidence_refs: functionalRefArrayNonEmpty,
    validation_report_refs: functionalRefArray,
    metric_refs: functionalRefArray,
    failed_run_refs: functionalRefArray,
    inconclusive_run_refs: functionalRefArray,
    stale_or_invalidated_evidence_refs: functionalRefArray,
  },
} as const;

export const resultInterpretationSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_summary',
    'supports_assertion_refs',
    'challenges_assertion_refs',
    'unexpected_findings',
    'failed_runs_accounted_for',
    'inconclusive_runs_accounted_for',
    'exploratory_confirmatory_separated',
  ],
  properties: {
    result_summary: stringId,
    supports_assertion_refs: functionalRefArray,
    challenges_assertion_refs: functionalRefArray,
    unexpected_findings: stringArray,
    failed_runs_accounted_for: { type: 'boolean' },
    inconclusive_runs_accounted_for: { type: 'boolean' },
    exploratory_confirmatory_separated: { type: 'boolean' },
  },
} as const;

export const resultInterpretationReliabilitySchema = {
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
    confound_refs: functionalRefArray,
    limitation_refs: functionalRefArray,
    reliability_notes: stringArray,
  },
} as const;

export const resultInterpretationClaimImplicationsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'allowed_claim_ceiling',
    'forbidden_overclaims',
    'recommended_claim_refs',
    'required_followup_refs',
  ],
  properties: {
    allowed_claim_ceiling: claimStrengthSchema,
    forbidden_overclaims: stringArray,
    recommended_claim_refs: functionalRefArray,
    required_followup_refs: functionalRefArray,
  },
} as const;

export const createResultInterpretationPacketRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_interpretation_packet_id',
    'validation_cycle_id',
    'source',
    'result_summary',
    'reliability',
    'claim_implications',
    'trace_manifest_id',
  ],
  properties: {
    result_interpretation_packet_id: stringId,
    validation_cycle_id: stringId,
    experiment_plan_light_id: nullableStringId,
    source: resultInterpretationSourceBundleSchema,
    result_summary: resultInterpretationSummarySchema,
    reliability: resultInterpretationReliabilitySchema,
    claim_implications: resultInterpretationClaimImplicationsSchema,
    trace_manifest_id: stringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const resultInterpretationPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_interpretation_packet_id',
    'implementation_project_id',
    'validation_cycle_id',
    'source',
    'result_summary',
    'reliability',
    'claim_implications',
    'interpretation_gate_status',
    'trace_manifest_ref',
    'trace_manifest_id',
    'created_by',
    'created_at',
  ],
  properties: {
    result_interpretation_packet_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: stringId,
    schema_version: {
      anyOf: [
        { const: PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_PACKET_V2_SCHEMA_VERSION },
        { type: 'null' },
      ],
    },
    closure_id: nullableStringId,
    closure_snapshot_hash: nullableStringId,
    packet_content_hash: nullableStringId,
    experiment_plan_light_id: nullableStringId,
    source: resultInterpretationSourceBundleSchema,
    result_summary: resultInterpretationSummarySchema,
    reliability: resultInterpretationReliabilitySchema,
    claim_implications: resultInterpretationClaimImplicationsSchema,
    interpretation_gate_status: interpretationGateStatusSchema,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
  oneOf: [
    {
      required: [
        'schema_version',
        'closure_id',
        'closure_snapshot_hash',
        'packet_content_hash',
      ],
      properties: {
        schema_version: {
          const: PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_PACKET_V2_SCHEMA_VERSION,
        },
        closure_id: stringId,
        closure_snapshot_hash: canonicalHash,
        packet_content_hash: canonicalHash,
      },
    },
    {
      required: [
        'schema_version',
        'closure_id',
        'closure_snapshot_hash',
        'packet_content_hash',
      ],
      properties: {
        schema_version: { type: 'null' },
        closure_id: { type: 'null' },
        closure_snapshot_hash: { type: 'null' },
        packet_content_hash: { type: 'null' },
      },
    },
    {
      not: {
        anyOf: [
          { required: ['schema_version'] },
          { required: ['closure_id'] },
          { required: ['closure_snapshot_hash'] },
          { required: ['packet_content_hash'] },
        ],
      },
    },
  ],
} as const;

export const claimCandidateScopeSchema = {
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

export const claimBoundaryAssessmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'rationale',
    'forbidden_overclaims',
    'hidden_counter_evidence_refs',
    'required_followup_refs',
  ],
  properties: {
    boundary_gate_result_id: nullableStringId,
    rationale: stringId,
    forbidden_overclaims: stringArray,
    hidden_counter_evidence_refs: functionalRefArray,
    required_followup_refs: functionalRefArray,
    human_confirmation_ref: nullableFunctionalRef,
  },
} as const;

export const createClaimCandidateRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'claim_candidate_id',
    'claim_type',
    'claim_statement',
    'claim_strength',
    'result_interpretation_packet_ids',
    'support_refs',
    'scope',
    'boundary',
    'trace_manifest_id',
  ],
  properties: {
    claim_candidate_id: stringId,
    claim_type: claimTypeSchema,
    claim_statement: stringId,
    claim_strength: claimStrengthSchema,
    result_interpretation_packet_ids: stringArrayNonEmpty,
    support_refs: functionalRefArrayNonEmpty,
    challenge_refs: functionalRefArray,
    scope: claimCandidateScopeSchema,
    boundary: claimBoundaryAssessmentSchema,
    trace_manifest_id: stringId,
    claim_trace_packet_id: nullableStringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const claimCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'claim_candidate_id',
    'implementation_project_id',
    'claim_type',
    'claim_statement',
    'claim_strength',
    'claim_status',
    'boundary_gate_status',
    'result_interpretation_packet_refs',
    'support_refs',
    'challenge_refs',
    'scope',
    'boundary',
    'trace_manifest_ref',
    'trace_manifest_id',
    'human_confirmation_required',
    'forbidden_overclaim_count',
    'created_by',
    'created_at',
  ],
  properties: {
    claim_candidate_id: stringId,
    implementation_project_id: stringId,
    claim_type: claimTypeSchema,
    claim_statement: stringId,
    claim_strength: claimStrengthSchema,
    claim_status: claimCandidateStatusSchema,
    boundary_gate_status: claimBoundaryGateStatusSchema,
    result_interpretation_packet_refs: functionalRefArrayNonEmpty,
    support_refs: functionalRefArrayNonEmpty,
    challenge_refs: functionalRefArray,
    scope: claimCandidateScopeSchema,
    boundary: claimBoundaryAssessmentSchema,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    claim_trace_packet_ref: nullableFunctionalRef,
    claim_trace_packet_id: nullableStringId,
    human_confirmation_required: { type: 'boolean' },
    forbidden_overclaim_count: { type: 'integer', minimum: 0 },
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const implementationDossierExperimentSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'failed_run_refs',
    'inconclusive_run_refs',
    'negative_result_refs',
    'excluded_stale_or_invalidated_evidence_refs',
    'experiment_limitations',
  ],
  properties: {
    failed_run_refs: functionalRefArray,
    inconclusive_run_refs: functionalRefArray,
    negative_result_refs: functionalRefArray,
    excluded_stale_or_invalidated_evidence_refs: functionalRefArray,
    experiment_limitations: stringArray,
  },
} as const;

export const implementationDossierClaimSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'admitted_claim_refs',
    'rejected_claim_refs',
    'forbidden_overclaims',
    'claim_ceiling',
  ],
  properties: {
    admitted_claim_refs: functionalRefArray,
    rejected_claim_refs: functionalRefArray,
    forbidden_overclaims: stringArray,
    claim_ceiling: claimStrengthSchema,
  },
} as const;

export const implementationDossierReadinessSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['blocker_refs', 'warning_refs', 'readiness_notes'],
  properties: {
    readiness_gate_result_id: nullableStringId,
    blocker_refs: functionalRefArray,
    warning_refs: functionalRefArray,
    readiness_notes: stringArray,
  },
} as const;

export const implementationDossierSourceBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_interpretation_packet_refs',
    'claim_candidate_refs',
    'claim_trace_packet_refs',
    'run_evidence_refs',
    'validation_cycle_refs',
    'trace_manifest_refs',
  ],
  properties: {
    result_interpretation_packet_refs: functionalRefArray,
    claim_candidate_refs: functionalRefArray,
    claim_trace_packet_refs: functionalRefArray,
    run_evidence_refs: functionalRefArray,
    validation_cycle_refs: functionalRefArray,
    trace_manifest_refs: functionalRefArray,
    closed_validation_cycle_snapshot_refs: {
      type: 'array',
      items: closedValidationCycleSnapshotRefSchema,
    },
  },
} as const;

export const createImplementationDossierRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dossier_id',
    'dossier_status',
    'result_interpretation_packet_ids',
    'claim_candidate_ids',
    'claim_trace_packet_ids',
    'closed_validation_cycle_snapshot_refs',
    'experiment_section',
    'claim_section',
    'readiness',
    'trace_manifest_id',
  ],
  properties: {
    dossier_id: stringId,
    dossier_version: { type: 'integer', minimum: 1 },
    dossier_status: dossierStatusSchema,
    result_interpretation_packet_ids: { type: 'array', items: stringId },
    claim_candidate_ids: { type: 'array', items: stringId },
    claim_trace_packet_ids: { type: 'array', items: stringId },
    closed_validation_cycle_snapshot_refs: {
      type: 'array',
      items: closedValidationCycleSnapshotRefSchema,
    },
    experiment_section: implementationDossierExperimentSectionSchema,
    claim_section: implementationDossierClaimSectionSchema,
    readiness: implementationDossierReadinessSchema,
    trace_manifest_id: stringId,
    projection_policy_version_id: nullableStringId,
    reopen_condition: nullableStringId,
    abandon_reason: nullableStringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const implementationDossierSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dossier_id',
    'implementation_project_id',
    'dossier_version',
    'dossier_status',
    'dossier_trace_status',
    'source',
    'experiment_section',
    'claim_section',
    'readiness',
    'trace_manifest_ref',
    'trace_manifest_id',
    'failed_run_count',
    'forbidden_overclaim_count',
    'dossier_hash',
    'created_by',
    'created_at',
  ],
  properties: {
    dossier_id: stringId,
    implementation_project_id: stringId,
    dossier_version: { type: 'integer', minimum: 1 },
    dossier_status: dossierStatusSchema,
    dossier_trace_status: dossierTraceStatusSchema,
    source: implementationDossierSourceBundleSchema,
    experiment_section: implementationDossierExperimentSectionSchema,
    claim_section: implementationDossierClaimSectionSchema,
    readiness: implementationDossierReadinessSchema,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    failed_run_count: { type: 'integer', minimum: 0 },
    forbidden_overclaim_count: { type: 'integer', minimum: 0 },
    readiness_gate_result_id: nullableStringId,
    projection_policy_version_id: nullableStringId,
    dossier_hash: stringId,
    reopen_condition: nullableStringId,
    abandon_reason: nullableStringId,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const createWritingEntryPacketRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projection_policy_version_id: nullableStringId,
    writing_target_ref: nullableFunctionalRef,
    packet_payload: objectPayload,
    created_by: actorTypeSchema,
  },
} as const;

export const paperImplementationWritingEntryPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'writing_entry_packet_id',
    'implementation_project_id',
    'dossier_id',
    'dossier_version',
    'dossier_hash',
    'dossier_status',
    'readiness_gate_result_id',
    'trace_manifest_ref',
    'trace_manifest_id',
    'projection_policy_version_id',
    'packet_status',
    'packet_payload',
    'created_by',
    'created_at',
  ],
  properties: {
    writing_entry_packet_id: stringId,
    implementation_project_id: stringId,
    dossier_id: stringId,
    dossier_version: { type: 'integer', minimum: 1 },
    dossier_hash: stringId,
    dossier_status: dossierStatusSchema,
    readiness_gate_result_id: stringId,
    trace_manifest_ref: topicSelectionFunctionalRefSchema,
    trace_manifest_id: stringId,
    projection_policy_version_id: stringId,
    packet_status: writingEntryPacketStatusSchema,
    writing_target_ref: nullableFunctionalRef,
    packet_payload: objectPayload,
    created_by: actorTypeSchema,
    created_at: stringId,
  },
} as const;

export const recordResultClaimFeedbackEventRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['feedback_trigger', 'severity', 'summary'],
  properties: {
    feedback_trigger: resultFeedbackTriggerSchema,
    severity: severitySchema,
    summary: stringId,
    source_object_refs: functionalRefArray,
    evidence_refs: functionalRefArray,
    run_refs: functionalRefArray,
    artifact_refs: functionalRefArray,
    required_action: nullableStringId,
    feedback_payload: objectPayload,
    policy_version_id: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const recordResultClaimFeedbackEventResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['feedback_event', 'feedback_trigger'],
  properties: {
    feedback_event: implementationFeedbackEventSchema,
    downstream_topic_feedback: {
      anyOf: [objectPayload, { type: 'null' }],
    },
    feedback_trigger: resultFeedbackTriggerSchema,
  },
} as const;

export const listResultInterpretationPacketsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: { type: 'array', items: resultInterpretationPacketSchema },
  },
} as const;

export const listClaimCandidatesResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: { type: 'array', items: claimCandidateSchema },
  },
} as const;

export const listImplementationDossiersResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: { type: 'array', items: implementationDossierSchema },
  },
} as const;

export const listWritingEntryPacketsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: { type: 'array', items: paperImplementationWritingEntryPacketSchema },
  },
} as const;
