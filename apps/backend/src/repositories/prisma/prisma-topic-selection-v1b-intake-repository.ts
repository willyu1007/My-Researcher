import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceRoleBundle } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionResearchConstraintProfileRecord,
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type { TopicSelectionV1bIntakeRepository } from '../topic-selection-v1b-intake.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : toJsonValue(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asFunctionalRef(value: unknown): TopicSelectionFunctionalRef {
  return asRecord(value) as unknown as TopicSelectionFunctionalRef;
}

function asNullableFunctionalRef(value: unknown): TopicSelectionFunctionalRef | null {
  return value === null || value === undefined ? null : asFunctionalRef(value);
}

type IntakeSnapshotRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  v1bInputBundleId: string;
  validatedNeedId: string;
  snapshotVersion: string;
  v1bInputBundleRef: Prisma.JsonValue;
  validatedNeedRef: Prisma.JsonValue;
  sourceNeedCandidateRef: Prisma.JsonValue;
  adjudicationResultRef: Prisma.JsonValue;
  supportPacketRef: Prisma.JsonValue;
  humanDecisionRef: Prisma.JsonValue;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  evidenceRoleBundle: Prisma.JsonValue;
  traceRefs: Prisma.JsonValue;
  riskRefs: Prisma.JsonValue;
  gapCodes: string[];
  memorySuggestionRefs: Prisma.JsonValue;
  recheckRequestRefs: Prisma.JsonValue;
  handoffPayload: Prisma.JsonValue;
  traceStatus: string;
  traceIssues: Prisma.JsonValue;
  evidenceMapFreshnessStatus: string | null;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  artifactRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
};

type ConstraintProfileRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  v1bIntakeSnapshotId: string;
  v1bInputBundleId: string;
  validatedNeedId: string;
  profileVersion: string;
  v1bIntakeSnapshotRef: Prisma.JsonValue;
  v1bInputBundleRef: Prisma.JsonValue;
  validatedNeedRef: Prisma.JsonValue;
  supersedesProfileRef: Prisma.JsonValue | null;
  targetCommunity: string;
  targetVenueClass: string | null;
  intendedContributionStyle: string | null;
  methodConstraints: string[];
  resourceConstraints: string[];
  availableAssets: string[];
  feasibilityBudget: Prisma.JsonValue;
  nonGoals: string[];
  claimCeiling: string;
  humanConstraintNotes: string | null;
  constraintPayload: Prisma.JsonValue;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  artifactRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
};

type ReadinessRow = {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  v1bIntakeSnapshotId: string;
  researchConstraintProfileId: string;
  v1bInputBundleId: string;
  validatedNeedId: string;
  profileVersion: string;
  recommendation: string;
  blockers: Prisma.JsonValue;
  warnings: Prisma.JsonValue;
  requiredActions: string[];
  v1bIntakeSnapshotRef: Prisma.JsonValue;
  researchConstraintProfileRef: Prisma.JsonValue;
  v1bInputBundleRef: Prisma.JsonValue;
  validatedNeedRef: Prisma.JsonValue;
  evidenceMapRef: Prisma.JsonValue;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  openRecheckRequestRefs: Prisma.JsonValue;
  acceptedRiskRefs: Prisma.JsonValue;
  uncoveredRecheckRequestRefs: Prisma.JsonValue;
  staleRefCodes: string[];
  missingConstraintCodes: string[];
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  policyVersionId: string | null;
  assessedBy: string;
  createdAt: Date;
};

function toIntakeSnapshotRecord(row: IntakeSnapshotRow): TopicSelectionV1bIntakeSnapshotRecord {
  return {
    v1b_intake_snapshot_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    v1b_input_bundle_id: row.v1bInputBundleId,
    validated_need_id: row.validatedNeedId,
    snapshot_version: row.snapshotVersion,
    v1b_input_bundle_ref: asFunctionalRef(row.v1bInputBundleRef),
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    source_need_candidate_ref: asFunctionalRef(row.sourceNeedCandidateRef),
    adjudication_result_ref: asFunctionalRef(row.adjudicationResultRef),
    support_packet_ref: asFunctionalRef(row.supportPacketRef),
    human_decision_ref: asFunctionalRef(row.humanDecisionRef),
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    evidence_role_bundle: asRecord(row.evidenceRoleBundle) as unknown as TopicSelectionEvidenceRoleBundle,
    trace_refs: asArray<TopicSelectionFunctionalRef>(row.traceRefs),
    risk_refs: asArray<TopicSelectionFunctionalRef>(row.riskRefs),
    gap_codes: row.gapCodes,
    memory_suggestion_refs: asArray<TopicSelectionFunctionalRef>(row.memorySuggestionRefs),
    recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.recheckRequestRefs),
    handoff_payload: asRecord(row.handoffPayload),
    trace_status: row.traceStatus as TopicSelectionV1bIntakeSnapshotRecord['trace_status'],
    trace_issues: asArray<TopicSelectionGateIssue>(row.traceIssues),
    evidence_map_freshness_status:
      row.evidenceMapFreshnessStatus as TopicSelectionV1bIntakeSnapshotRecord['evidence_map_freshness_status'],
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionV1bIntakeSnapshotRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toConstraintProfileRecord(row: ConstraintProfileRow): TopicSelectionResearchConstraintProfileRecord {
  return {
    research_constraint_profile_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    v1b_intake_snapshot_id: row.v1bIntakeSnapshotId,
    v1b_input_bundle_id: row.v1bInputBundleId,
    validated_need_id: row.validatedNeedId,
    profile_version: row.profileVersion,
    v1b_intake_snapshot_ref: asFunctionalRef(row.v1bIntakeSnapshotRef),
    v1b_input_bundle_ref: asFunctionalRef(row.v1bInputBundleRef),
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    supersedes_profile_ref: asNullableFunctionalRef(row.supersedesProfileRef),
    target_community: row.targetCommunity,
    target_venue_class: row.targetVenueClass,
    intended_contribution_style: row.intendedContributionStyle,
    method_constraints: row.methodConstraints,
    resource_constraints: row.resourceConstraints,
    available_assets: row.availableAssets,
    feasibility_budget: asRecord(row.feasibilityBudget),
    non_goals: row.nonGoals,
    claim_ceiling: row.claimCeiling,
    human_constraint_notes: row.humanConstraintNotes,
    constraint_payload: asRecord(row.constraintPayload),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionResearchConstraintProfileRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toReadinessRecord(row: ReadinessRow): TopicSelectionV1bIntakeReadinessAssessmentRecord {
  return {
    v1b_intake_readiness_assessment_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    v1b_intake_snapshot_id: row.v1bIntakeSnapshotId,
    research_constraint_profile_id: row.researchConstraintProfileId,
    v1b_input_bundle_id: row.v1bInputBundleId,
    validated_need_id: row.validatedNeedId,
    profile_version: row.profileVersion,
    recommendation: row.recommendation as TopicSelectionV1bIntakeReadinessAssessmentRecord['recommendation'],
    blockers: asArray<TopicSelectionGateIssue>(row.blockers),
    warnings: asArray<TopicSelectionGateIssue>(row.warnings),
    required_actions: row.requiredActions,
    v1b_intake_snapshot_ref: asFunctionalRef(row.v1bIntakeSnapshotRef),
    research_constraint_profile_ref: asFunctionalRef(row.researchConstraintProfileRef),
    v1b_input_bundle_ref: asFunctionalRef(row.v1bInputBundleRef),
    validated_need_ref: asFunctionalRef(row.validatedNeedRef),
    evidence_map_ref: asFunctionalRef(row.evidenceMapRef),
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    open_recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.openRecheckRequestRefs),
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    uncovered_recheck_request_refs: asArray<TopicSelectionFunctionalRef>(row.uncoveredRecheckRequestRefs),
    stale_ref_codes: row.staleRefCodes,
    missing_constraint_codes: row.missingConstraintCodes,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    policy_version_id: row.policyVersionId,
    assessed_by: row.assessedBy as TopicSelectionV1bIntakeReadinessAssessmentRecord['assessed_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionV1bIntakeRepository implements TopicSelectionV1bIntakeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createIntakeSnapshot(
    record: TopicSelectionV1bIntakeSnapshotRecord,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord> {
    const row = await this.prisma.topicSelectionV1bIntakeSnapshot.create({
      data: this.toIntakeSnapshotCreateInput(record),
    });
    return toIntakeSnapshotRecord(row);
  }

  async findIntakeSnapshotById(
    intakeSnapshotId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionV1bIntakeSnapshot.findUnique({
      where: { id: intakeSnapshotId },
    });
    return row ? toIntakeSnapshotRecord(row) : null;
  }

  async listIntakeSnapshotsByBundleId(
    v1bInputBundleId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]> {
    const rows = await this.prisma.topicSelectionV1bIntakeSnapshot.findMany({
      where: { v1bInputBundleId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toIntakeSnapshotRecord);
  }

  async listIntakeSnapshotsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]> {
    const rows = await this.prisma.topicSelectionV1bIntakeSnapshot.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toIntakeSnapshotRecord);
  }

  async createResearchConstraintProfile(
    record: TopicSelectionResearchConstraintProfileRecord,
  ): Promise<TopicSelectionResearchConstraintProfileRecord> {
    const row = await this.prisma.topicSelectionResearchConstraintProfile.create({
      data: this.toConstraintProfileCreateInput(record),
    });
    return toConstraintProfileRecord(row);
  }

  async findResearchConstraintProfileById(
    profileId: string,
  ): Promise<TopicSelectionResearchConstraintProfileRecord | null> {
    const row = await this.prisma.topicSelectionResearchConstraintProfile.findUnique({
      where: { id: profileId },
    });
    return row ? toConstraintProfileRecord(row) : null;
  }

  async listResearchConstraintProfilesByBundleId(
    v1bInputBundleId: string,
  ): Promise<TopicSelectionResearchConstraintProfileRecord[]> {
    const rows = await this.prisma.topicSelectionResearchConstraintProfile.findMany({
      where: { v1bInputBundleId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toConstraintProfileRecord);
  }

  async createReadinessAssessment(
    record: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord> {
    const row = await this.prisma.topicSelectionV1bIntakeReadinessAssessment.create({
      data: this.toReadinessCreateInput(record),
    });
    return toReadinessRecord(row);
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord | null> {
    const row = await this.prisma.topicSelectionV1bIntakeReadinessAssessment.findUnique({
      where: { id: readinessAssessmentId },
    });
    return row ? toReadinessRecord(row) : null;
  }

  async findReadinessAssessmentBySnapshotAndProfile(
    intakeSnapshotId: string,
    profileId: string,
    profileVersion: string,
  ): Promise<TopicSelectionV1bIntakeReadinessAssessmentRecord | null> {
    const row = await this.prisma.topicSelectionV1bIntakeReadinessAssessment.findUnique({
      where: {
        v1bIntakeSnapshotId_researchConstraintProfileId_profileVersion: {
          v1bIntakeSnapshotId: intakeSnapshotId,
          researchConstraintProfileId: profileId,
          profileVersion,
        },
      },
    });
    return row ? toReadinessRecord(row) : null;
  }

  private toIntakeSnapshotCreateInput(
    record: TopicSelectionV1bIntakeSnapshotRecord,
  ): Prisma.TopicSelectionV1bIntakeSnapshotCreateInput {
    return {
      id: record.v1b_intake_snapshot_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      v1bInputBundleId: record.v1b_input_bundle_id,
      validatedNeedId: record.validated_need_id,
      snapshotVersion: record.snapshot_version,
      v1bInputBundleRef: toJsonValue(record.v1b_input_bundle_ref),
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      sourceNeedCandidateRef: toJsonValue(record.source_need_candidate_ref),
      adjudicationResultRef: toJsonValue(record.adjudication_result_ref),
      supportPacketRef: toJsonValue(record.support_packet_ref),
      humanDecisionRef: toJsonValue(record.human_decision_ref),
      evidenceMapId: record.evidence_map_ref.ref_id,
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      evidenceRoleBundle: toJsonValue(record.evidence_role_bundle),
      traceRefs: toJsonValue(record.trace_refs),
      riskRefs: toJsonValue(record.risk_refs),
      gapCodes: record.gap_codes,
      memorySuggestionRefs: toJsonValue(record.memory_suggestion_refs),
      recheckRequestRefs: toJsonValue(record.recheck_request_refs),
      handoffPayload: toJsonValue(record.handoff_payload),
      traceStatus: record.trace_status,
      traceIssues: toJsonValue(record.trace_issues),
      evidenceMapFreshnessStatus: record.evidence_map_freshness_status ?? null,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      traceSnapshotId: record.trace_snapshot_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toConstraintProfileCreateInput(
    record: TopicSelectionResearchConstraintProfileRecord,
  ): Prisma.TopicSelectionResearchConstraintProfileCreateInput {
    return {
      id: record.research_constraint_profile_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      v1bIntakeSnapshotId: record.v1b_intake_snapshot_id,
      v1bInputBundleId: record.v1b_input_bundle_id,
      validatedNeedId: record.validated_need_id,
      profileVersion: record.profile_version,
      v1bIntakeSnapshotRef: toJsonValue(record.v1b_intake_snapshot_ref),
      v1bInputBundleRef: toJsonValue(record.v1b_input_bundle_ref),
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      supersedesProfileId: record.supersedes_profile_ref?.ref_id ?? null,
      supersedesProfileRef: jsonOrNull(record.supersedes_profile_ref ?? null),
      targetCommunity: record.target_community,
      targetVenueClass: record.target_venue_class ?? null,
      intendedContributionStyle: record.intended_contribution_style ?? null,
      methodConstraints: record.method_constraints,
      resourceConstraints: record.resource_constraints,
      availableAssets: record.available_assets,
      feasibilityBudget: toJsonValue(record.feasibility_budget),
      nonGoals: record.non_goals,
      claimCeiling: record.claim_ceiling,
      humanConstraintNotes: record.human_constraint_notes ?? null,
      constraintPayload: toJsonValue(record.constraint_payload),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      traceSnapshotId: record.trace_snapshot_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toReadinessCreateInput(
    record: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  ): Prisma.TopicSelectionV1bIntakeReadinessAssessmentCreateInput {
    return {
      id: record.v1b_intake_readiness_assessment_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      v1bIntakeSnapshotId: record.v1b_intake_snapshot_id,
      researchConstraintProfileId: record.research_constraint_profile_id,
      v1bInputBundleId: record.v1b_input_bundle_id,
      validatedNeedId: record.validated_need_id,
      profileVersion: record.profile_version,
      recommendation: record.recommendation,
      blockers: toJsonValue(record.blockers),
      warnings: toJsonValue(record.warnings),
      requiredActions: record.required_actions,
      v1bIntakeSnapshotRef: toJsonValue(record.v1b_intake_snapshot_ref),
      researchConstraintProfileRef: toJsonValue(record.research_constraint_profile_ref),
      v1bInputBundleRef: toJsonValue(record.v1b_input_bundle_ref),
      validatedNeedRef: toJsonValue(record.validated_need_ref),
      evidenceMapRef: toJsonValue(record.evidence_map_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      openRecheckRequestRefs: toJsonValue(record.open_recheck_request_refs),
      acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
      uncoveredRecheckRequestRefs: toJsonValue(record.uncovered_recheck_request_refs),
      staleRefCodes: record.stale_ref_codes,
      missingConstraintCodes: record.missing_constraint_codes,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      policyVersionId: record.policy_version_id ?? null,
      assessedBy: record.assessed_by,
      createdAt: new Date(record.created_at),
    };
  }
}
