export const TOPIC_SELECTION_ACTOR_TYPES = ['human', 'llm', 'system', 'hybrid'] as const;
export type TopicSelectionActorType = (typeof TOPIC_SELECTION_ACTOR_TYPES)[number];

export const TOPIC_SELECTION_POLICY_STATUSES = ['draft', 'active', 'retired'] as const;
export type TopicSelectionPolicyStatus = (typeof TOPIC_SELECTION_POLICY_STATUSES)[number];

export const TOPIC_SELECTION_ARTIFACT_KINDS = [
  'input',
  'prompt',
  'structured_output',
  'raw_output',
  'diagnostic',
  'trace',
  'other',
] as const;
export type TopicSelectionArtifactKind = (typeof TOPIC_SELECTION_ARTIFACT_KINDS)[number];

export const TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS = ['inline', 'file', 'uri'] as const;
export type TopicSelectionArtifactStorageKind = (typeof TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS)[number];

export const TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION = 'TopicSelectionRiskFinding@v1' as const;
export const TOPIC_SELECTION_RISK_FINDING_KINDS = [
  'value_risk',
  'critic_trigger',
  'pass_with_risk_gate',
  'capped_dimension',
  'arena_minority_finding',
] as const;
export type TopicSelectionRiskFindingKind = (typeof TOPIC_SELECTION_RISK_FINDING_KINDS)[number];

export const TOPIC_SELECTION_WORKFLOW_RUN_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'blocked',
  'cancelled',
] as const;
export type TopicSelectionWorkflowRunStatus = (typeof TOPIC_SELECTION_WORKFLOW_RUN_STATUSES)[number];

export const TOPIC_SELECTION_GATE_VERDICTS = [
  'pass',
  'block',
  'pass_with_risk',
  'needs_human_review',
] as const;
export type TopicSelectionGateVerdict = (typeof TOPIC_SELECTION_GATE_VERDICTS)[number];

export const TOPIC_SELECTION_TRANSITION_RESULTS = [
  'passed',
  'passed_with_risk',
  'blocked',
  'needs_human_review',
  'requires_accepted_risk',
  'failed',
] as const;
export type TopicSelectionTransitionResult = (typeof TOPIC_SELECTION_TRANSITION_RESULTS)[number];

export const TOPIC_SELECTION_STATE_AXES = [
  'lifecycle',
  'decision',
  'review',
  'freshness',
  'execution',
  'permission',
] as const;
export type TopicSelectionStateAxis = (typeof TOPIC_SELECTION_STATE_AXES)[number];

export const TOPIC_SELECTION_QUALITY_SIGNAL_VERDICTS = ['pass', 'warn', 'fail', 'unknown'] as const;
export type TopicSelectionQualitySignalVerdict = (typeof TOPIC_SELECTION_QUALITY_SIGNAL_VERDICTS)[number];

export const TOPIC_SELECTION_LINEAGE_RELATION_TYPES = [
  'derived_from',
  'generated_by',
  'references',
  'supports',
  'challenges',
  'supersedes',
] as const;
export type TopicSelectionLineageRelationType = (typeof TOPIC_SELECTION_LINEAGE_RELATION_TYPES)[number];

export const TOPIC_SELECTION_HUMAN_DECISION_TYPES = [
  'confirm',
  'reject',
  'request_revision',
  'accept_risk',
  'override',
] as const;
export type TopicSelectionHumanDecisionType = (typeof TOPIC_SELECTION_HUMAN_DECISION_TYPES)[number];

export interface TopicSelectionFunctionalRef {
  ref_type: string;
  ref_id: string;
  version_id?: string | null;
  title_card_id?: string | null;
  legacy_ref?: Record<string, unknown> | null;
}

export interface TopicSelectionRiskFindingPayload {
  schema_version: typeof TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION;
  finding_id: string;
  finding_kind: TopicSelectionRiskFindingKind;
  materiality: 'advancement_relevant';
  severity: 'warning' | 'blocking';
  title_card_id: string;
  source_snapshot_ref: TopicSelectionFunctionalRef;
  source_snapshot_hash: string;
  source_ref: TopicSelectionFunctionalRef;
  summary: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  source_fields: string[];
  materiality_policy_version: string;
}

export function isTopicSelectionRiskFindingRef(
  ref: TopicSelectionFunctionalRef,
): boolean {
  return ref.ref_type === 'artifact_ref'
    && ref.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION;
}

export function topicSelectionRiskFindingRefs(
  refs: TopicSelectionFunctionalRef[],
): TopicSelectionFunctionalRef[] {
  const findings = refs.filter(isTopicSelectionRiskFindingRef);
  return [...new Map(findings.map((ref) => [
    `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`,
    ref,
  ])).values()];
}

export interface TopicSelectionActorRef {
  actor_type: TopicSelectionActorType;
  actor_id?: string | null;
}

export interface TopicSelectionStateWriteIntent {
  axis: TopicSelectionStateAxis;
  target_ref: TopicSelectionFunctionalRef;
  state_key: string;
  next_value: string;
  reason?: string | null;
}

export interface TopicSelectionGateIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'blocking';
  refs?: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionContextPolicyVersionRecord {
  context_policy_version_id: string;
  policy_key: string;
  version: string;
  status: TopicSelectionPolicyStatus;
  config: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
  retired_at?: string | null;
}

export interface TopicSelectionWorkflowProfilePolicyRecord {
  workflow_profile_policy_id: string;
  profile_key: string;
  workflow_key: string;
  policy_version_id?: string | null;
  status: TopicSelectionPolicyStatus;
  config: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
  retired_at?: string | null;
}

export interface TopicSelectionTransitionPolicyVersionRecord {
  transition_policy_version_id: string;
  transition_key: string;
  version: string;
  status: TopicSelectionPolicyStatus;
  config: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
  retired_at?: string | null;
}

export interface TopicSelectionInputSnapshotRecord {
  input_snapshot_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  context_policy_version_id?: string | null;
  policy_version?: string | null;
  snapshot_hash: string;
  source_refs: TopicSelectionFunctionalRef[];
  permission_refs: TopicSelectionFunctionalRef[];
  payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionArtifactRefRecord {
  artifact_ref_id: string;
  stable_key?: string | null;
  workspace_id?: string | null;
  title_card_id?: string | null;
  artifact_kind: TopicSelectionArtifactKind;
  storage_kind: TopicSelectionArtifactStorageKind;
  uri?: string | null;
  payload?: Record<string, unknown> | null;
  checksum?: string | null;
  byte_size?: number | null;
  mime_type?: string | null;
  workflow_run_id?: string | null;
  input_snapshot_id?: string | null;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionLlmWorkflowRunRecord {
  workflow_run_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  workflow_key: string;
  workflow_profile_key: string;
  workflow_profile_version?: string | null;
  input_snapshot_id?: string | null;
  status: TopicSelectionWorkflowRunStatus;
  provider_id?: string | null;
  model_id?: string | null;
  prompt_template_id?: string | null;
  prompt_template_version?: string | null;
  started_at: string;
  finished_at?: string | null;
  telemetry: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  error_code?: string | null;
  error_message?: string | null;
  created_by: TopicSelectionActorType;
}

export interface TopicSelectionQualitySignalRecord {
  quality_signal_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  stage: string;
  check_type: string;
  verdict: TopicSelectionQualitySignalVerdict;
  issue_codes: string[];
  recommended_action?: string | null;
  blocking_transition_keys: string[];
  refs: TopicSelectionFunctionalRef[];
  confidence?: number | null;
  workflow_run_id?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  emitted_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionReadinessGateResultRecord {
  readiness_gate_result_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  gate_key: string;
  target_ref: TopicSelectionFunctionalRef;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  policy_version_id?: string | null;
  verdict: TopicSelectionGateVerdict;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  required_actions: string[];
  loopback_target?: TopicSelectionFunctionalRef | null;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  quality_signal_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionChainTransitionAttemptRecord {
  chain_transition_attempt_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  transition_key: string;
  source_ref: TopicSelectionFunctionalRef;
  target_ref?: TopicSelectionFunctionalRef | null;
  gate_result_id?: string | null;
  workflow_run_id?: string | null;
  input_snapshot_id?: string | null;
  policy_version_id?: string | null;
  actor: TopicSelectionActorRef;
  result: TopicSelectionTransitionResult;
  reason: string;
  required_actions: string[];
  blockers: TopicSelectionGateIssue[];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  state_write_intents: TopicSelectionStateWriteIntent[];
  created_authority_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

export interface TopicSelectionFunctionalLineageLinkRecord {
  functional_lineage_link_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  source_ref: TopicSelectionFunctionalRef;
  target_ref: TopicSelectionFunctionalRef;
  relation_type: TopicSelectionLineageRelationType;
  artifact_refs: TopicSelectionFunctionalRef[];
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionTraceSnapshotRecord {
  trace_snapshot_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  snapshot_hash: string;
  object_refs: TopicSelectionFunctionalRef[];
  lineage_link_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  quality_signal_refs: TopicSelectionFunctionalRef[];
  transition_attempt_refs: TopicSelectionFunctionalRef[];
  payload: Record<string, unknown>;
  created_by: TopicSelectionActorType;
  created_at: string;
}

export interface TopicSelectionHumanConfirmedDecisionRecord {
  human_confirmed_decision_id: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  decision_type: TopicSelectionHumanDecisionType;
  actor: TopicSelectionActorRef;
  rationale?: string | null;
  artifact_refs: TopicSelectionFunctionalRef[];
  policy_version_id?: string | null;
  resulting_authority_refs: TopicSelectionFunctionalRef[];
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;

export const topicSelectionFunctionalRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_type', 'ref_id'],
  properties: {
    ref_type: stringId,
    ref_id: stringId,
    version_id: nullableStringId,
    title_card_id: nullableStringId,
    legacy_ref: { anyOf: [objectPayload, { type: 'null' }] },
  },
} as const;

export const topicSelectionRiskFindingPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'finding_id',
    'finding_kind',
    'materiality',
    'severity',
    'title_card_id',
    'source_snapshot_ref',
    'source_snapshot_hash',
    'source_ref',
    'summary',
    'evidence_refs',
    'source_fields',
    'materiality_policy_version',
  ],
  properties: {
    schema_version: { const: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION },
    finding_id: stringId,
    finding_kind: { enum: [...TOPIC_SELECTION_RISK_FINDING_KINDS] },
    materiality: { const: 'advancement_relevant' },
    severity: { enum: ['warning', 'blocking'] },
    title_card_id: stringId,
    source_snapshot_ref: topicSelectionFunctionalRefSchema,
    source_snapshot_hash: stringId,
    source_ref: topicSelectionFunctionalRefSchema,
    summary: stringId,
    evidence_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    source_fields: stringArray,
    materiality_policy_version: stringId,
  },
} as const;

export const topicSelectionActorRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actor_type'],
  properties: {
    actor_type: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    actor_id: nullableStringId,
  },
} as const;

export const topicSelectionStateWriteIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['axis', 'target_ref', 'state_key', 'next_value'],
  properties: {
    axis: { enum: [...TOPIC_SELECTION_STATE_AXES] },
    target_ref: topicSelectionFunctionalRefSchema,
    state_key: stringId,
    next_value: stringId,
    reason: nullableStringId,
  },
} as const;

export const topicSelectionGateIssueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'message', 'severity'],
  properties: {
    code: stringId,
    message: stringId,
    severity: { enum: ['info', 'warning', 'blocking'] },
    refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
  },
} as const;

export const topicSelectionContextPolicyVersionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'context_policy_version_id',
    'policy_key',
    'version',
    'status',
    'config',
    'created_by',
    'created_at',
  ],
  properties: {
    context_policy_version_id: stringId,
    policy_key: stringId,
    version: stringId,
    status: { enum: [...TOPIC_SELECTION_POLICY_STATUSES] },
    config: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
    retired_at: nullableStringId,
  },
} as const;

export const topicSelectionWorkflowProfilePolicyRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workflow_profile_policy_id',
    'profile_key',
    'workflow_key',
    'status',
    'config',
    'created_by',
    'created_at',
  ],
  properties: {
    workflow_profile_policy_id: stringId,
    profile_key: stringId,
    workflow_key: stringId,
    policy_version_id: nullableStringId,
    status: { enum: [...TOPIC_SELECTION_POLICY_STATUSES] },
    config: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
    retired_at: nullableStringId,
  },
} as const;

export const topicSelectionTransitionPolicyVersionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'transition_policy_version_id',
    'transition_key',
    'version',
    'status',
    'config',
    'created_by',
    'created_at',
  ],
  properties: {
    transition_policy_version_id: stringId,
    transition_key: stringId,
    version: stringId,
    status: { enum: [...TOPIC_SELECTION_POLICY_STATUSES] },
    config: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
    retired_at: nullableStringId,
  },
} as const;

export const topicSelectionInputSnapshotRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'input_snapshot_id',
    'target_ref',
    'snapshot_hash',
    'source_refs',
    'permission_refs',
    'payload',
    'created_by',
    'created_at',
  ],
  properties: {
    input_snapshot_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    target_ref: topicSelectionFunctionalRefSchema,
    context_policy_version_id: nullableStringId,
    policy_version: nullableStringId,
    snapshot_hash: stringId,
    source_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    permission_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    payload: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionArtifactRefRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'artifact_ref_id',
    'artifact_kind',
    'storage_kind',
    'created_by',
    'created_at',
  ],
  properties: {
    artifact_ref_id: stringId,
    stable_key: nullableStringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    artifact_kind: { enum: [...TOPIC_SELECTION_ARTIFACT_KINDS] },
    storage_kind: { enum: [...TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS] },
    uri: nullableStringId,
    payload: { anyOf: [objectPayload, { type: 'null' }] },
    checksum: nullableStringId,
    byte_size: nullableNumber,
    mime_type: nullableStringId,
    workflow_run_id: nullableStringId,
    input_snapshot_id: nullableStringId,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionLlmWorkflowRunRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workflow_run_id',
    'workflow_key',
    'workflow_profile_key',
    'status',
    'started_at',
    'telemetry',
    'output_summary',
    'created_by',
  ],
  properties: {
    workflow_run_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    workflow_key: stringId,
    workflow_profile_key: stringId,
    workflow_profile_version: nullableStringId,
    input_snapshot_id: nullableStringId,
    status: { enum: [...TOPIC_SELECTION_WORKFLOW_RUN_STATUSES] },
    provider_id: nullableStringId,
    model_id: nullableStringId,
    prompt_template_id: nullableStringId,
    prompt_template_version: nullableStringId,
    started_at: stringId,
    finished_at: nullableStringId,
    telemetry: objectPayload,
    output_summary: objectPayload,
    error_code: nullableStringId,
    error_message: nullableStringId,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
  },
} as const;

export const topicSelectionQualitySignalRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'quality_signal_id',
    'target_ref',
    'stage',
    'check_type',
    'verdict',
    'issue_codes',
    'blocking_transition_keys',
    'refs',
    'artifact_refs',
    'emitted_by',
    'created_at',
  ],
  properties: {
    quality_signal_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    target_ref: topicSelectionFunctionalRefSchema,
    stage: stringId,
    check_type: stringId,
    verdict: { enum: [...TOPIC_SELECTION_QUALITY_SIGNAL_VERDICTS] },
    issue_codes: stringArray,
    recommended_action: nullableStringId,
    blocking_transition_keys: stringArray,
    refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    confidence: nullableNumber,
    workflow_run_id: nullableStringId,
    artifact_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    emitted_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionReadinessGateResultRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readiness_gate_result_id',
    'gate_key',
    'target_ref',
    'verdict',
    'blockers',
    'warnings',
    'required_actions',
    'accepted_risk_refs',
    'quality_signal_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    readiness_gate_result_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    gate_key: stringId,
    target_ref: topicSelectionFunctionalRefSchema,
    input_snapshot_id: nullableStringId,
    workflow_run_id: nullableStringId,
    policy_version_id: nullableStringId,
    verdict: { enum: [...TOPIC_SELECTION_GATE_VERDICTS] },
    blockers: { type: 'array', items: topicSelectionGateIssueSchema },
    warnings: { type: 'array', items: topicSelectionGateIssueSchema },
    required_actions: stringArray,
    loopback_target: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    accepted_risk_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    quality_signal_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionFunctionalLineageLinkRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'functional_lineage_link_id',
    'source_ref',
    'target_ref',
    'relation_type',
    'artifact_refs',
    'created_by',
    'created_at',
  ],
  properties: {
    functional_lineage_link_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    source_ref: topicSelectionFunctionalRefSchema,
    target_ref: topicSelectionFunctionalRefSchema,
    relation_type: { enum: [...TOPIC_SELECTION_LINEAGE_RELATION_TYPES] },
    artifact_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionTraceSnapshotRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'trace_snapshot_id',
    'target_ref',
    'snapshot_hash',
    'object_refs',
    'lineage_link_refs',
    'artifact_refs',
    'quality_signal_refs',
    'transition_attempt_refs',
    'payload',
    'created_by',
    'created_at',
  ],
  properties: {
    trace_snapshot_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    target_ref: topicSelectionFunctionalRefSchema,
    snapshot_hash: stringId,
    object_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    lineage_link_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    artifact_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    quality_signal_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    transition_attempt_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    payload: objectPayload,
    created_by: { enum: [...TOPIC_SELECTION_ACTOR_TYPES] },
    created_at: stringId,
  },
} as const;

export const topicSelectionHumanConfirmedDecisionRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'human_confirmed_decision_id',
    'target_ref',
    'decision_type',
    'actor',
    'artifact_refs',
    'resulting_authority_refs',
    'created_at',
  ],
  properties: {
    human_confirmed_decision_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    target_ref: topicSelectionFunctionalRefSchema,
    decision_type: { enum: [...TOPIC_SELECTION_HUMAN_DECISION_TYPES] },
    actor: topicSelectionActorRefSchema,
    rationale: nullableStringId,
    artifact_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    policy_version_id: nullableStringId,
    resulting_authority_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    created_at: stringId,
  },
} as const;

export const topicSelectionChainTransitionAttemptRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'chain_transition_attempt_id',
    'transition_key',
    'source_ref',
    'actor',
    'result',
    'reason',
    'required_actions',
    'blockers',
    'accepted_risk_refs',
    'state_write_intents',
    'created_authority_refs',
    'created_at',
  ],
  properties: {
    chain_transition_attempt_id: stringId,
    workspace_id: nullableStringId,
    title_card_id: nullableStringId,
    transition_key: stringId,
    source_ref: topicSelectionFunctionalRefSchema,
    target_ref: { anyOf: [topicSelectionFunctionalRefSchema, { type: 'null' }] },
    gate_result_id: nullableStringId,
    workflow_run_id: nullableStringId,
    input_snapshot_id: nullableStringId,
    policy_version_id: nullableStringId,
    actor: topicSelectionActorRefSchema,
    result: { enum: [...TOPIC_SELECTION_TRANSITION_RESULTS] },
    reason: stringId,
    required_actions: stringArray,
    blockers: { type: 'array', items: topicSelectionGateIssueSchema },
    accepted_risk_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    state_write_intents: { type: 'array', items: topicSelectionStateWriteIntentSchema },
    created_authority_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
    created_at: stringId,
  },
} as const;
