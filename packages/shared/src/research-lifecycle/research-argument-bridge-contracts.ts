import type { CreatedByMode } from './research-lifecycle-core-contracts.js';
import {
  BLOCKER_SEVERITIES,
  CLAIM_STRENGTHS,
  DECISION_ACTIONS,
  DIMENSION_NAMES,
  READINESS_DECISION_KINDS,
  READINESS_LEVELS,
  REPORT_POINTER_KINDS,
  SOURCE_TRACE_KINDS,
  type AuditRef,
  type BlockerRef,
  type ClaimStrength,
  type DecisionAction,
  type DimensionName,
  type ObjectPointer,
  type ReadinessDecisionKind,
  type ReportPointer,
  type ResearchArgumentActor,
  type SourceTraceRef,
} from './research-argument-domain-contracts.js';
import {
  SUBMISSION_RISK_FINDING_GROUPS,
  type SubmissionRiskFinding,
} from './research-argument-advisory-contracts.js';

export interface SeedWorkspaceFromTitleCardRequest {
  title_card_id: string;
  source_need_ids?: string[];
  source_research_question_ids?: string[];
  source_value_assessment_ids?: string[];
  selected_literature_evidence_ids?: string[];
  created_by: CreatedByMode;
}

export interface SeedWorkspaceFromTitleCardResponse {
  workspace_id: string;
  branch_id: string;
  seed_trace_refs: SourceTraceRef[];
  created_at: string;
}

export interface ReadinessVerifyDimensionVerdict {
  dimension_name: DimensionName;
  level: (typeof READINESS_LEVELS)[number];
  score: number;
  confidence: number;
}

export interface ReadinessVerifyRequest {
  workspace_id: string;
  branch_id: string;
  requested_by: ResearchArgumentActor;
  note?: string;
}

export interface ReadinessVerifyResponse {
  workspace_id: string;
  branch_id: string;
  readiness_decision: ReadinessDecisionKind;
  stage: 'Stage1_WorthContinuing' | 'Stage2_ReadyForWritingEntry';
  blockers: BlockerRef[];
  missing_items: string[];
  dimension_verdicts: ReadinessVerifyDimensionVerdict[];
  report_pointer?: ReportPointer;
  verified_at: string;
}

export interface DecisionActionRequest {
  workspace_id: string;
  branch_id: string;
  action: DecisionAction;
  reason: string;
  actor: ResearchArgumentActor;
  confirmation_note?: string;
  audit_note?: string;
  linked_object_ids?: string[];
}

export interface DecisionActionResponse {
  decision_id: string;
  workspace_id: string;
  branch_id: string;
  action: DecisionAction;
  audit_ref: string;
  created_at: string;
}

export interface PromoteToPaperProjectRequest {
  workspace_id: string;
  branch_id: string;
  title_card_id: string;
  target_paper_title: string;
  research_direction?: string;
  created_by: Exclude<CreatedByMode, 'llm'>;
  confirmation_note?: string;
}

export interface PromoteToPaperProjectResponse {
  paper_id: string;
  workspace_id: string;
  branch_id: string;
  packet_ref: WritingEntryPacketRef;
  report_ref: SubmissionRiskReportRef;
  audit_ref: string;
  promoted_at: string;
}

export interface WritingEntryPacketRef extends ReportPointer {
  report_kind: 'writing_entry';
}

export interface SubmissionRiskReportRef extends ReportPointer {
  report_kind: 'submission_risk';
}

export interface WritingEntryPacketClaimSummary {
  claim_id: string;
  claim_text: string;
  claim_strength: ClaimStrength;
  support_state?: string;
  evidence_requirement_ids: string[];
  boundary_ids: string[];
}

export interface WritingEntryPacketEvidenceSummary {
  evidence_item_ids: string[];
  mandatory_requirement_ids: string[];
  missing_requirement_ids: string[];
}

export interface WritingEntryPacketBaselineProtocolReproSummary {
  baseline_set_ids: string[];
  protocol_ids: string[];
  repro_item_ids: string[];
  run_ids: string[];
  artifact_ids: string[];
}

export interface WritingEntryPacket extends AuditRef {
  packet_id: string;
  workspace_id: string;
  branch_id: string;
  title_card_id: string;
  paper_id?: string;
  claim_summary: WritingEntryPacketClaimSummary[];
  evidence_summary: WritingEntryPacketEvidenceSummary;
  baseline_protocol_repro_summary: WritingEntryPacketBaselineProtocolReproSummary;
  source_trace_refs: SourceTraceRef[];
  object_pointers: ObjectPointer[];
  report_pointers: ReportPointer[];
  created_at: string;
}

export interface SubmissionRiskReportDimensionSummary {
  dimension_name: DimensionName;
  level: (typeof READINESS_LEVELS)[number];
  score: number;
  confidence: number;
}

export interface SubmissionRiskReport extends AuditRef {
  report_id: string;
  workspace_id: string;
  branch_id: string;
  title_card_id?: string;
  dimension_summary: SubmissionRiskReportDimensionSummary[];
  blockers: BlockerRef[];
  missing_items: string[];
  findings: SubmissionRiskFinding[];
  report_pointers: ReportPointer[];
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nonEmptyString = { type: 'string', minLength: 1 } as const;
const nonEmptyStringArray = {
  type: 'array',
  items: nonEmptyString,
} as const;
const boundedScore = { type: 'number', minimum: 0, maximum: 100 } as const;
const boundedConfidence = { type: 'number', minimum: 0, maximum: 1 } as const;

const sourceTraceRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_kind', 'source_id'],
  properties: {
    source_kind: { type: 'string', enum: SOURCE_TRACE_KINDS },
    source_id: stringId,
    note: { type: 'string' },
    locator: { type: 'string' },
  },
} as const;

const objectPointerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pointer_kind', 'object_id'],
  properties: {
    pointer_kind: {
      type: 'string',
      enum: [
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
      ],
    },
    object_id: stringId,
    label: { type: 'string' },
    path: { type: 'string' },
    locator: { type: 'string' },
  },
} as const;

const reportPointerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['report_kind', 'report_id'],
  properties: {
    report_kind: { type: 'string', enum: REPORT_POINTER_KINDS },
    report_id: stringId,
    summary: { type: 'string' },
    object_pointers: {
      type: 'array',
      items: objectPointerSchema,
    },
  },
} as const;

const blockerRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['blocker_id', 'severity', 'summary'],
  properties: {
    blocker_id: stringId,
    severity: { type: 'string', enum: BLOCKER_SEVERITIES },
    summary: nonEmptyString,
    linked_object_ids: nonEmptyStringArray,
    linked_requirement_ids: nonEmptyStringArray,
  },
} as const;

const auditRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['audit_ref'],
  properties: {
    audit_ref: stringId,
    actor: { type: 'string', enum: ['llm', 'human', 'hybrid', 'system'] },
    recorded_at: { type: 'string', format: 'date-time' },
  },
} as const;

const dimensionVerdictSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension_name', 'level', 'score', 'confidence'],
  properties: {
    dimension_name: { type: 'string', enum: DIMENSION_NAMES },
    level: { type: 'string', enum: READINESS_LEVELS },
    score: boundedScore,
    confidence: boundedConfidence,
  },
} as const;

const writingEntryPacketClaimSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'claim_id',
    'claim_text',
    'claim_strength',
    'evidence_requirement_ids',
    'boundary_ids',
  ],
  properties: {
    claim_id: stringId,
    claim_text: nonEmptyString,
    claim_strength: { type: 'string', enum: CLAIM_STRENGTHS },
    support_state: { type: 'string' },
    evidence_requirement_ids: nonEmptyStringArray,
    boundary_ids: nonEmptyStringArray,
  },
} as const;

const writingEntryPacketEvidenceSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_item_ids',
    'mandatory_requirement_ids',
    'missing_requirement_ids',
  ],
  properties: {
    evidence_item_ids: nonEmptyStringArray,
    mandatory_requirement_ids: nonEmptyStringArray,
    missing_requirement_ids: nonEmptyStringArray,
  },
} as const;

const writingEntryPacketBaselineProtocolReproSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'baseline_set_ids',
    'protocol_ids',
    'repro_item_ids',
    'run_ids',
    'artifact_ids',
  ],
  properties: {
    baseline_set_ids: nonEmptyStringArray,
    protocol_ids: nonEmptyStringArray,
    repro_item_ids: nonEmptyStringArray,
    run_ids: nonEmptyStringArray,
    artifact_ids: nonEmptyStringArray,
  },
} as const;

const submissionRiskFindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['finding_id', 'finding_group', 'severity', 'detail', 'pointers'],
  properties: {
    finding_id: stringId,
    finding_group: {
      type: 'string',
      enum: SUBMISSION_RISK_FINDING_GROUPS,
    },
    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    detail: nonEmptyString,
    pointers: {
      type: 'array',
      items: objectPointerSchema,
    },
    affected_dimensions: {
      type: 'array',
      items: { type: 'string', enum: DIMENSION_NAMES },
    },
    suggested_fix: { type: 'string' },
  },
} as const;

const writingEntryPacketRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['report_kind', 'report_id'],
  properties: {
    report_kind: { type: 'string', enum: ['writing_entry'] },
    report_id: stringId,
    summary: { type: 'string' },
    object_pointers: {
      type: 'array',
      items: objectPointerSchema,
    },
  },
} as const;

const submissionRiskReportRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['report_kind', 'report_id'],
  properties: {
    report_kind: { type: 'string', enum: ['submission_risk'] },
    report_id: stringId,
    summary: { type: 'string' },
    object_pointers: {
      type: 'array',
      items: objectPointerSchema,
    },
  },
} as const;

export const seedWorkspaceFromTitleCardRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title_card_id', 'created_by'],
  properties: {
    title_card_id: stringId,
    source_need_ids: nonEmptyStringArray,
    source_research_question_ids: nonEmptyStringArray,
    source_value_assessment_ids: nonEmptyStringArray,
    selected_literature_evidence_ids: nonEmptyStringArray,
    created_by: { type: 'string', enum: ['llm', 'human', 'hybrid'] },
  },
} as const;

export const seedWorkspaceFromTitleCardResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace_id', 'branch_id', 'seed_trace_refs', 'created_at'],
  properties: {
    workspace_id: stringId,
    branch_id: stringId,
    seed_trace_refs: {
      type: 'array',
      items: sourceTraceRefSchema,
    },
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const readinessVerifyRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace_id', 'branch_id', 'requested_by'],
  properties: {
    workspace_id: stringId,
    branch_id: stringId,
    requested_by: { type: 'string', enum: ['llm', 'human', 'hybrid', 'system'] },
    note: { type: 'string' },
  },
} as const;

export const readinessVerifyResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workspace_id',
    'branch_id',
    'readiness_decision',
    'stage',
    'blockers',
    'missing_items',
    'dimension_verdicts',
    'verified_at',
  ],
  properties: {
    workspace_id: stringId,
    branch_id: stringId,
    readiness_decision: { type: 'string', enum: READINESS_DECISION_KINDS },
    stage: {
      type: 'string',
      enum: ['Stage1_WorthContinuing', 'Stage2_ReadyForWritingEntry'],
    },
    blockers: {
      type: 'array',
      items: blockerRefSchema,
    },
    missing_items: nonEmptyStringArray,
    dimension_verdicts: {
      type: 'array',
      items: dimensionVerdictSchema,
    },
    report_pointer: reportPointerSchema,
    verified_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const decisionActionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace_id', 'branch_id', 'action', 'reason', 'actor'],
  properties: {
    workspace_id: stringId,
    branch_id: stringId,
    action: { type: 'string', enum: DECISION_ACTIONS },
    reason: nonEmptyString,
    actor: { type: 'string', enum: ['llm', 'human', 'hybrid', 'system'] },
    confirmation_note: { type: 'string' },
    audit_note: { type: 'string' },
    linked_object_ids: nonEmptyStringArray,
  },
  allOf: [
    {
      if: {
        properties: {
          action: {
            enum: ['pivot', 'kill', 'archive'],
          },
        },
        required: ['action'],
      },
      then: {
        required: ['confirmation_note'],
      },
    },
  ],
} as const;

export const decisionActionResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decision_id',
    'workspace_id',
    'branch_id',
    'action',
    'audit_ref',
    'created_at',
  ],
  properties: {
    decision_id: stringId,
    workspace_id: stringId,
    branch_id: stringId,
    action: { type: 'string', enum: DECISION_ACTIONS },
    audit_ref: stringId,
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const promoteToPaperProjectRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'workspace_id',
    'branch_id',
    'title_card_id',
    'target_paper_title',
    'created_by',
  ],
  properties: {
    workspace_id: stringId,
    branch_id: stringId,
    title_card_id: stringId,
    target_paper_title: nonEmptyString,
    research_direction: { type: 'string' },
    created_by: { type: 'string', enum: ['human', 'hybrid'] },
    confirmation_note: { type: 'string' },
  },
} as const;

export const promoteToPaperProjectResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'paper_id',
    'workspace_id',
    'branch_id',
    'packet_ref',
    'report_ref',
    'audit_ref',
    'promoted_at',
  ],
  properties: {
    paper_id: stringId,
    workspace_id: stringId,
    branch_id: stringId,
    packet_ref: writingEntryPacketRefSchema,
    report_ref: submissionRiskReportRefSchema,
    audit_ref: stringId,
    promoted_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const writingEntryPacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'packet_id',
    'workspace_id',
    'branch_id',
    'title_card_id',
    'claim_summary',
    'evidence_summary',
    'baseline_protocol_repro_summary',
    'source_trace_refs',
    'object_pointers',
    'report_pointers',
    'audit_ref',
    'created_at',
  ],
  properties: {
    packet_id: stringId,
    workspace_id: stringId,
    branch_id: stringId,
    title_card_id: stringId,
    paper_id: stringId,
    claim_summary: {
      type: 'array',
      items: writingEntryPacketClaimSummarySchema,
    },
    evidence_summary: writingEntryPacketEvidenceSummarySchema,
    baseline_protocol_repro_summary:
      writingEntryPacketBaselineProtocolReproSummarySchema,
    source_trace_refs: {
      type: 'array',
      items: sourceTraceRefSchema,
    },
    object_pointers: {
      type: 'array',
      items: objectPointerSchema,
    },
    report_pointers: {
      type: 'array',
      items: reportPointerSchema,
    },
    audit_ref: stringId,
    actor: auditRefSchema.properties.actor,
    recorded_at: auditRefSchema.properties.recorded_at,
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const submissionRiskReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'report_id',
    'workspace_id',
    'branch_id',
    'dimension_summary',
    'blockers',
    'missing_items',
    'findings',
    'report_pointers',
    'audit_ref',
    'created_at',
  ],
  properties: {
    report_id: stringId,
    workspace_id: stringId,
    branch_id: stringId,
    title_card_id: stringId,
    dimension_summary: {
      type: 'array',
      items: dimensionVerdictSchema,
    },
    blockers: {
      type: 'array',
      items: blockerRefSchema,
    },
    missing_items: nonEmptyStringArray,
    findings: {
      type: 'array',
      items: submissionRiskFindingSchema,
    },
    report_pointers: {
      type: 'array',
      items: reportPointerSchema,
    },
    audit_ref: stringId,
    actor: auditRefSchema.properties.actor,
    recorded_at: auditRefSchema.properties.recorded_at,
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;
