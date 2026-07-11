import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES,
  PAPER_IMPLEMENTATION_AGENT_RUN_MODES,
  type PaperImplementationAgentExecutionMode,
  type PaperImplementationAgentRunMode,
} from './paper-implementation-agent-common-contracts.js';

export const PAPER_IMPLEMENTATION_COORDINATOR_RUN_SCHEMA_VERSION =
  'PaperImplementationCoordinatorRun@v1' as const;
export const PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION =
  'PaperImplementationCoordinatorStep@v1' as const;

/**
 * Code-level lane ids. The lane registry (slot chain per lane) is a const in
 * the coordinator service — not user-configurable and not a workflow DSL.
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_LANE_IDS = [
  'validation-planning',
  'motive',
  'evidence-board-curation',
  'cross-board-synthesis',
] as const;
export type PaperImplementationCoordinatorLaneId =
  (typeof PAPER_IMPLEMENTATION_COORDINATOR_LANE_IDS)[number];

/**
 * `failed` is reserved for coordinator-own faults; slot semantic/provider
 * failures land on `blocked` (re-advanceable, same slot new attempt).
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_RUN_STATUSES = [
  'created',
  'advancing',
  'waiting_review',
  'blocked',
  'budget_exhausted',
  'completed',
  'failed',
] as const;
export type PaperImplementationCoordinatorRunStatus =
  (typeof PAPER_IMPLEMENTATION_COORDINATOR_RUN_STATUSES)[number];

/**
 * Single source of truth for terminal run statuses (F2/F8): only `completed`
 * and `failed` are terminal — `budget_exhausted` is a parked state a
 * raise-carrying advance can resume. Service, controller, and both
 * repository implementations must reference this set, never re-list the
 * literals.
 */
export const PAPER_IMPLEMENTATION_COORDINATOR_TERMINAL_RUN_STATUSES = [
  'completed',
  'failed',
] as const satisfies readonly PaperImplementationCoordinatorRunStatus[];
export type PaperImplementationCoordinatorTerminalRunStatus =
  (typeof PAPER_IMPLEMENTATION_COORDINATOR_TERMINAL_RUN_STATUSES)[number];

export const PAPER_IMPLEMENTATION_COORDINATOR_STEP_OUTCOMES = [
  'passed',
  'blocked',
  'failed_runtime',
  'waiting_review',
] as const;
export type PaperImplementationCoordinatorStepOutcome =
  (typeof PAPER_IMPLEMENTATION_COORDINATOR_STEP_OUTCOMES)[number];

export interface PaperImplementationCoordinatorBudgetEnvelope {
  max_steps: number;
  max_provider_calls: number;
}

/**
 * D1 budget raise (F2): an advance on a `budget_exhausted` run may carry a
 * raise for either envelope dimension. Raises are increase-only — a value
 * below the run's current envelope is rejected with 400 — and an advance on
 * a budget_exhausted run without a raise is an idempotent no-op returning
 * the current projection.
 */
export interface PaperImplementationCoordinatorBudgetEnvelopeRaise {
  max_steps?: number;
  max_provider_calls?: number;
}

export interface PaperImplementationCoordinatorConsumedBudget {
  steps: number;
  provider_calls: number;
}

/**
 * Audit record of one applied budget raise (F2/R2). `to` is the envelope
 * actually persisted after the monotonic merge (`max(current, raise)` per
 * dimension against the post-lock run), so an interleaved raise that was
 * already superseded records `from === to`. Persisted inside the run payload
 * JSON — no migration required.
 */
export interface PaperImplementationCoordinatorBudgetRaiseEvent {
  raised_at: string;
  from: PaperImplementationCoordinatorBudgetEnvelope;
  to: PaperImplementationCoordinatorBudgetEnvelope;
  holder_id: string;
}

export interface PaperImplementationCoordinatorLease {
  holder_id: string;
  heartbeat_at: string;
  expires_at: string;
}

/**
 * Per-slot base request payloads carried by the create request, keyed by
 * runtime slot id. The coordinator injects run-level execution params, the
 * per-step run_id (node attempt id), and chain-consumption fields
 * (admitted upstream final artifact refs/hashes + selected candidate keys)
 * before calling the runtime slot service; the slot service remains the
 * authority validating the assembled request. Fixture role outputs
 * (mocked/codex) live inside these payloads and are only legal outside
 * `product` run_mode.
 */
export type PaperImplementationCoordinatorSlotRequestPayloads =
  Record<string, Record<string, unknown>>;

export interface PaperImplementationCoordinatorRun {
  schema_version: typeof PAPER_IMPLEMENTATION_COORDINATOR_RUN_SCHEMA_VERSION;
  coordinator_run_id: string;
  implementation_project_id: string;
  lane_id: PaperImplementationCoordinatorLaneId;
  run_status: PaperImplementationCoordinatorRunStatus;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id: string | null;
  model_option_id: string | null;
  budget_envelope: PaperImplementationCoordinatorBudgetEnvelope;
  /**
   * Append-only audit trail of applied budget raises (one entry per
   * raise-carrying advance that reached the post-lock apply step). Optional
   * for runs persisted before the field existed.
   */
  budget_raise_events?: PaperImplementationCoordinatorBudgetRaiseEvent[];
  consumed: PaperImplementationCoordinatorConsumedBudget;
  lease: PaperImplementationCoordinatorLease | null;
  slot_request_payloads: PaperImplementationCoordinatorSlotRequestPayloads;
  created_at: string;
  updated_at: string;
}

export const PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID =
  'paper-implementation.coordinator.candidate-selection' as const;
export const PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION = 'v1' as const;

export const PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_GAIN_LEVELS = [
  'low',
  'medium',
  'high',
] as const;
export type PaperImplementationCandidateSelectionGainLevel =
  (typeof PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_GAIN_LEVELS)[number];

export const PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_RATIONALE_CODES = [
  'blocked_candidates_excluded',
  'max_expected_information_gain',
  'stable_order_tiebreak',
  'single_eligible_candidate',
  'no_eligible_candidate',
] as const;
export type PaperImplementationCandidateSelectionRationaleCode =
  (typeof PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_RATIONALE_CODES)[number];

/**
 * Stable projection of a candidate proposal used as pure-function input for
 * CandidateSelectionPolicy@v1. `expected_information_gain` is null when the
 * source proposal carries a free-text gain (route candidates) — such
 * candidates rank below any enum-graded candidate and fall back to stable
 * order.
 */
export interface PaperImplementationCandidateSelectionCandidateProjection {
  candidate_key: string;
  expected_information_gain: PaperImplementationCandidateSelectionGainLevel | null;
  blocker_codes: string[];
}

/**
 * CandidateSelectionPolicy@v1 decision record: same inputs always produce the
 * same selection, and the record carries the full projection so the decision
 * can be recomputed offline (and overridden by humans re-advancing with an
 * adjusted payload).
 */
export interface PaperImplementationCandidateSelectionDecisionRecord {
  policy_id: typeof PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID;
  policy_version: typeof PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION;
  inputs_hash: string;
  candidate_projections: PaperImplementationCandidateSelectionCandidateProjection[];
  selected_candidate_key: string | null;
  rationale_codes: PaperImplementationCandidateSelectionRationaleCode[];
}

export interface PaperImplementationCoordinatorStep {
  schema_version: typeof PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION;
  coordinator_step_id: string;
  coordinator_run_id: string;
  implementation_project_id: string;
  step_index: number;
  slot_id: string;
  node_attempt_id: string;
  runtime_artifact_ref: TopicSelectionFunctionalRef | null;
  runtime_artifact_hash: string | null;
  /**
   * S1 seam (F4/R9): the runtime_artifact_id of the admitted final artifact.
   * Gated exactly like `runtime_artifact_hash` (= admitted_artifact_hash):
   * only set when the final admission record has
   * `admission_status === 'admitted'`, null otherwise — the pair is either
   * fully present or fully absent, never a half-lineage. This is the exact
   * id an acceptance-bridge Create* request needs as
   * `source_proposal_artifact_ref.ref_id`, paired with
   * `runtime_artifact_hash` as `source_proposal_artifact_hash`. Optional for
   * steps persisted before the field existed.
   */
  runtime_artifact_id?: string | null;
  admission_ref: TopicSelectionFunctionalRef | null;
  decision_record: PaperImplementationCandidateSelectionDecisionRecord | null;
  outcome: PaperImplementationCoordinatorStepOutcome;
  provider_call_count: number;
  blocker_codes: string[];
  created_at: string;
}

export interface CreatePaperImplementationCoordinatorRunRequest {
  coordinator_run_id?: string;
  lane_id: PaperImplementationCoordinatorLaneId;
  run_mode: PaperImplementationAgentRunMode;
  execution_mode: PaperImplementationAgentExecutionMode;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  budget_envelope: PaperImplementationCoordinatorBudgetEnvelope;
  slot_request_payloads: PaperImplementationCoordinatorSlotRequestPayloads;
}

export interface AdvancePaperImplementationCoordinatorRunRequest {
  holder_id?: string | null;
  /**
   * Optional per-slot payload replacements applied before this advance —
   * the human override path after `waiting_review` / `blocked` stops
   * (e.g. rebuilding the skeptic fixture with a proceed disposition).
   */
  slot_request_payload_overrides?: PaperImplementationCoordinatorSlotRequestPayloads;
  /**
   * F2: increase-only budget raise consumed by this advance. Required to
   * resume a `budget_exhausted` run: without it such an advance idempotently
   * returns the current projection, and (R1) if it also carries
   * `slot_request_payload_overrides` it is rejected with 400 rather than
   * silently dropping them. Any provided value below the current envelope is
   * rejected with 400; at apply time the raise merges monotonically
   * (max(current, raise) per dimension — R2) and is audited in
   * `budget_raise_events`.
   */
  raise_budget_envelope?: PaperImplementationCoordinatorBudgetEnvelopeRaise | null;
}

export interface PaperImplementationCoordinatorRunWithSteps {
  run: PaperImplementationCoordinatorRun;
  steps: PaperImplementationCoordinatorStep[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const positiveInteger = { type: 'integer', minimum: 1 } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;
const nullableFunctionalRef = {
  anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }],
} as const;
const laneIdSchema = { enum: [...PAPER_IMPLEMENTATION_COORDINATOR_LANE_IDS] } as const;
const runStatusSchema = { enum: [...PAPER_IMPLEMENTATION_COORDINATOR_RUN_STATUSES] } as const;
const stepOutcomeSchema = { enum: [...PAPER_IMPLEMENTATION_COORDINATOR_STEP_OUTCOMES] } as const;
const runModeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_RUN_MODES] } as const;
const executionModeSchema = { enum: [...PAPER_IMPLEMENTATION_AGENT_EXECUTION_MODES] } as const;
const stringArray = { type: 'array', items: stringId } as const;

const budgetEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['max_steps', 'max_provider_calls'],
  properties: {
    max_steps: positiveInteger,
    max_provider_calls: positiveInteger,
  },
} as const;

export const paperImplementationCoordinatorBudgetEnvelopeRaiseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    max_steps: positiveInteger,
    max_provider_calls: positiveInteger,
  },
} as const;

const budgetRaiseEventSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['raised_at', 'from', 'to', 'holder_id'],
  properties: {
    raised_at: stringId,
    from: budgetEnvelopeSchema,
    to: budgetEnvelopeSchema,
    holder_id: stringId,
  },
} as const;

const consumedBudgetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['steps', 'provider_calls'],
  properties: {
    steps: nonNegativeInteger,
    provider_calls: nonNegativeInteger,
  },
} as const;

const leaseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['holder_id', 'heartbeat_at', 'expires_at'],
  properties: {
    holder_id: stringId,
    heartbeat_at: stringId,
    expires_at: stringId,
  },
} as const;

const nullableLeaseSchema = { anyOf: [leaseSchema, { type: 'null' }] } as const;

/**
 * Slot request payloads are opaque objects at coordinator-contract level —
 * the runtime slot request schemas remain the validation authority once the
 * coordinator assembles the concrete slot request.
 */
const slotRequestPayloadsSchema = {
  type: 'object',
  additionalProperties: { type: 'object' },
} as const;

export const paperImplementationCandidateSelectionCandidateProjectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['candidate_key', 'expected_information_gain', 'blocker_codes'],
  properties: {
    candidate_key: stringId,
    expected_information_gain: {
      anyOf: [
        { enum: [...PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_GAIN_LEVELS] },
        { type: 'null' },
      ],
    },
    blocker_codes: stringArray,
  },
} as const;

export const paperImplementationCandidateSelectionDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'policy_id',
    'policy_version',
    'inputs_hash',
    'candidate_projections',
    'selected_candidate_key',
    'rationale_codes',
  ],
  properties: {
    policy_id: { const: PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_ID },
    policy_version: { const: PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_POLICY_VERSION },
    inputs_hash: stringId,
    candidate_projections: {
      type: 'array',
      items: paperImplementationCandidateSelectionCandidateProjectionSchema,
    },
    selected_candidate_key: nullableStringId,
    rationale_codes: {
      type: 'array',
      items: { enum: [...PAPER_IMPLEMENTATION_CANDIDATE_SELECTION_RATIONALE_CODES] },
    },
  },
} as const;

export const paperImplementationCoordinatorRunSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'coordinator_run_id',
    'implementation_project_id',
    'lane_id',
    'run_status',
    'run_mode',
    'execution_mode',
    'model_profile_id',
    'model_option_id',
    'budget_envelope',
    'consumed',
    'lease',
    'slot_request_payloads',
    'created_at',
    'updated_at',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_COORDINATOR_RUN_SCHEMA_VERSION },
    coordinator_run_id: stringId,
    implementation_project_id: stringId,
    lane_id: laneIdSchema,
    run_status: runStatusSchema,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    budget_envelope: budgetEnvelopeSchema,
    budget_raise_events: { type: 'array', items: budgetRaiseEventSchema },
    consumed: consumedBudgetSchema,
    lease: nullableLeaseSchema,
    slot_request_payloads: slotRequestPayloadsSchema,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const paperImplementationCoordinatorStepSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'coordinator_step_id',
    'coordinator_run_id',
    'implementation_project_id',
    'step_index',
    'slot_id',
    'node_attempt_id',
    'runtime_artifact_ref',
    'runtime_artifact_hash',
    'admission_ref',
    'decision_record',
    'outcome',
    'provider_call_count',
    'blocker_codes',
    'created_at',
  ],
  properties: {
    schema_version: { const: PAPER_IMPLEMENTATION_COORDINATOR_STEP_SCHEMA_VERSION },
    coordinator_step_id: stringId,
    coordinator_run_id: stringId,
    implementation_project_id: stringId,
    step_index: nonNegativeInteger,
    slot_id: stringId,
    node_attempt_id: stringId,
    runtime_artifact_ref: nullableFunctionalRef,
    runtime_artifact_hash: nullableStringId,
    runtime_artifact_id: nullableStringId,
    admission_ref: nullableFunctionalRef,
    decision_record: {
      anyOf: [paperImplementationCandidateSelectionDecisionRecordSchema, { type: 'null' }],
    },
    outcome: stepOutcomeSchema,
    provider_call_count: nonNegativeInteger,
    blocker_codes: stringArray,
    created_at: stringId,
  },
} as const;

export const createPaperImplementationCoordinatorRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'lane_id',
    'run_mode',
    'execution_mode',
    'budget_envelope',
    'slot_request_payloads',
  ],
  properties: {
    coordinator_run_id: stringId,
    lane_id: laneIdSchema,
    run_mode: runModeSchema,
    execution_mode: executionModeSchema,
    model_profile_id: nullableStringId,
    model_option_id: nullableStringId,
    budget_envelope: budgetEnvelopeSchema,
    slot_request_payloads: slotRequestPayloadsSchema,
  },
} as const;

export const advancePaperImplementationCoordinatorRunRequestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    holder_id: nullableStringId,
    slot_request_payload_overrides: slotRequestPayloadsSchema,
    raise_budget_envelope: {
      anyOf: [paperImplementationCoordinatorBudgetEnvelopeRaiseSchema, { type: 'null' }],
    },
  },
} as const;
