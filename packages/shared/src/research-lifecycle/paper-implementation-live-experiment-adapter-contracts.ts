import {
  experimentFoundationExternalTrainingJobSchema,
  experimentFoundationRefSchema,
  type ExperimentFoundationRef,
  type ExternalTrainingJob,
} from './experiment-foundation-contracts.js';
import {
  researchWorkOrderHarnessRunSchema,
  runMonitorIntakeRecordSchema,
  type ResearchWorkOrderHarnessRun,
  type RunMonitorIntakeRecord,
} from './paper-implementation-workorder-contracts.js';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionFunctionalRefSchema,
  type TopicSelectionActorType,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';

export const PAPER_IMPLEMENTATION_LIVE_EXPERIMENT_ACTIONS = [
  'submit',
  'sync',
  'collect',
  'cancel',
] as const;
export type PaperImplementationLiveExperimentAction =
  (typeof PAPER_IMPLEMENTATION_LIVE_EXPERIMENT_ACTIONS)[number];

export const PAPER_IMPLEMENTATION_LIVE_EXPERIMENT_OUTCOMES = [
  'submitted',
  'synced',
  'collected',
  'cancel_requested',
  'already_recorded',
  'blocked',
] as const;
export type PaperImplementationLiveExperimentOutcome =
  (typeof PAPER_IMPLEMENTATION_LIVE_EXPERIMENT_OUTCOMES)[number];

export interface LiveExperimentHandoff {
  next_action_refs: TopicSelectionFunctionalRef[];
  recommended_next_actions: string[];
  notes: string[];
}

export interface SubmitLiveExperimentRunRequest {
  harness_run_id?: string | null;
  run_attempt?: number | null;
  idempotency_key: string;
  requested_by_ref?: ExperimentFoundationRef | null;
  source_refs?: ExperimentFoundationRef[];
  submitted_at?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface SyncLiveExperimentRunRequest {
  source_refs?: ExperimentFoundationRef[];
  monitor_intake_id?: string | null;
  received_at?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface CollectLiveExperimentRunRequest {
  run_evidence_unit_id?: string | null;
  run_evidence_trace_manifest_id?: string | null;
  source_refs?: ExperimentFoundationRef[];
  monitor_intake_id?: string | null;
  received_at?: string | null;
  failure_summary?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface CancelLiveExperimentRunRequest {
  requested_by_ref?: ExperimentFoundationRef | null;
  reason: string;
  idempotency_key: string;
  source_refs?: ExperimentFoundationRef[];
  run_evidence_unit_id?: string | null;
  run_evidence_trace_manifest_id?: string | null;
  monitor_intake_id?: string | null;
  received_at?: string | null;
  created_by?: TopicSelectionActorType;
}

export interface PaperImplementationLiveExperimentRunResponse {
  action: PaperImplementationLiveExperimentAction;
  outcome: PaperImplementationLiveExperimentOutcome;
  external_job: ExternalTrainingJob;
  harness_run?: ResearchWorkOrderHarnessRun | null;
  monitor_intake?: RunMonitorIntakeRecord | null;
  terminal_evidence_recorded: boolean;
  handoff: LiveExperimentHandoff;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const actorTypeSchema = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;
const experimentFoundationRefArray = {
  type: 'array',
  items: experimentFoundationRefSchema,
} as const;
const nullableExperimentFoundationRef = {
  anyOf: [experimentFoundationRefSchema, { type: 'null' }],
} as const;

export const submitLiveExperimentRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['idempotency_key'],
  properties: {
    harness_run_id: nullableStringId,
    run_attempt: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
    idempotency_key: stringId,
    requested_by_ref: nullableExperimentFoundationRef,
    source_refs: experimentFoundationRefArray,
    submitted_at: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const syncLiveExperimentRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    source_refs: experimentFoundationRefArray,
    monitor_intake_id: nullableStringId,
    received_at: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const collectLiveExperimentRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    run_evidence_unit_id: nullableStringId,
    run_evidence_trace_manifest_id: nullableStringId,
    source_refs: experimentFoundationRefArray,
    monitor_intake_id: nullableStringId,
    received_at: nullableStringId,
    failure_summary: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const cancelLiveExperimentRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reason', 'idempotency_key'],
  properties: {
    requested_by_ref: nullableExperimentFoundationRef,
    reason: stringId,
    idempotency_key: stringId,
    source_refs: experimentFoundationRefArray,
    run_evidence_unit_id: nullableStringId,
    run_evidence_trace_manifest_id: nullableStringId,
    monitor_intake_id: nullableStringId,
    received_at: nullableStringId,
    created_by: actorTypeSchema,
  },
} as const;

export const liveExperimentHandoffSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['next_action_refs', 'recommended_next_actions', 'notes'],
  properties: {
    next_action_refs: {
      type: 'array',
      items: topicSelectionFunctionalRefSchema,
    },
    recommended_next_actions: { type: 'array', items: stringId },
    notes: { type: 'array', items: stringId },
  },
} as const;

export const paperImplementationLiveExperimentRunResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'outcome', 'external_job', 'terminal_evidence_recorded', 'handoff'],
  properties: {
    action: { enum: [...PAPER_IMPLEMENTATION_LIVE_EXPERIMENT_ACTIONS] },
    outcome: { enum: [...PAPER_IMPLEMENTATION_LIVE_EXPERIMENT_OUTCOMES] },
    external_job: experimentFoundationExternalTrainingJobSchema,
    harness_run: { anyOf: [researchWorkOrderHarnessRunSchema, { type: 'null' }] },
    monitor_intake: { anyOf: [runMonitorIntakeRecordSchema, { type: 'null' }] },
    terminal_evidence_recorded: { type: 'boolean' },
    handoff: liveExperimentHandoffSchema,
  },
} as const;
