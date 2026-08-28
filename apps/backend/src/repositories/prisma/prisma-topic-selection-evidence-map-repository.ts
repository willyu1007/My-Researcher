import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceClusterRecord,
  TopicSelectionEvidenceConflictSetRecord,
  TopicSelectionEvidenceFreshnessStatus,
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidencePatternRecord,
  TopicSelectionEvidenceRoleBundle,
  TopicSelectionEvidenceSourceLocator,
  TopicSelectionEvidenceStrengthAssessmentRecord,
  TopicSelectionEvidenceTypedLinkRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionEvidenceMapCreateRecords,
  TopicSelectionEvidenceMapRepository,
} from '../topic-selection-evidence-map.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
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

function toUnitIds(refs: TopicSelectionFunctionalRef[]): string[] {
  return refs.map((ref) => ref.ref_id);
}

function toEvidenceMapRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  evidenceMapVersion: string;
  status: string;
  reviewStatus: string;
  freshnessStatus: string;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  unitCount: number;
  supportUnitCount: number;
  challengeUnitCount: number;
  baselineUnitCount: number;
  contextUnitCount: number;
  digestPayload: Prisma.JsonValue;
  staleReasonCodes: string[];
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  artifactRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionEvidenceMapRecord {
  return {
    evidence_map_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_version: row.evidenceMapVersion,
    status: row.status as TopicSelectionEvidenceMapRecord['status'],
    review_status: row.reviewStatus as TopicSelectionEvidenceMapRecord['review_status'],
    freshness_status: row.freshnessStatus as TopicSelectionEvidenceMapRecord['freshness_status'],
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    unit_count: row.unitCount,
    support_unit_count: row.supportUnitCount,
    challenge_unit_count: row.challengeUnitCount,
    baseline_unit_count: row.baselineUnitCount,
    context_unit_count: row.contextUnitCount,
    digest_payload: asRecord(row.digestPayload),
    stale_reason_codes: row.staleReasonCodes,
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionEvidenceMapRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toEvidenceUnitRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  evidenceMapId: string;
  evidenceMapVersion: string;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  coverageRowIntentRef: Prisma.JsonValue | null;
  literatureRef: Prisma.JsonValue;
  sourceRefs: Prisma.JsonValue;
  locator: Prisma.JsonValue;
  evidenceRole: string;
  sourceAttributionKind: string;
  sourceStatement: string;
  normalizedStatement: string | null;
  interpretationPayload: Prisma.JsonValue;
  extractionConfidence: number | null;
  abstractOnly: boolean;
  reviewStatus: string;
  freshnessStatus: string;
  issueCodes: string[];
  createdBy: string;
  createdAt: Date;
}): TopicSelectionEvidenceUnitRecord {
  return {
    evidence_unit_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    evidence_map_version: row.evidenceMapVersion,
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    coverage_row_intent_ref: asNullableFunctionalRef(row.coverageRowIntentRef),
    literature_ref: asFunctionalRef(row.literatureRef),
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    locator: asRecord(row.locator) as unknown as TopicSelectionEvidenceSourceLocator,
    evidence_role: row.evidenceRole as TopicSelectionEvidenceUnitRecord['evidence_role'],
    source_attribution_kind: row.sourceAttributionKind as TopicSelectionEvidenceUnitRecord['source_attribution_kind'],
    source_statement: row.sourceStatement,
    normalized_statement: row.normalizedStatement,
    interpretation_payload: asRecord(row.interpretationPayload),
    extraction_confidence: row.extractionConfidence,
    abstract_only: row.abstractOnly,
    review_status: row.reviewStatus as TopicSelectionEvidenceUnitRecord['review_status'],
    freshness_status: row.freshnessStatus as TopicSelectionEvidenceUnitRecord['freshness_status'],
    issue_codes: row.issueCodes,
    created_by: row.createdBy as TopicSelectionEvidenceUnitRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toTypedLinkRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  evidenceMapId: string;
  evidenceMapVersion: string;
  linkType: string;
  sourceUnitRef: Prisma.JsonValue;
  targetUnitRef: Prisma.JsonValue;
  rationale: string | null;
  confidence: number | null;
  createdAt: Date;
}): TopicSelectionEvidenceTypedLinkRecord {
  return {
    evidence_typed_link_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    evidence_map_version: row.evidenceMapVersion,
    link_type: row.linkType as TopicSelectionEvidenceTypedLinkRecord['link_type'],
    source_unit_ref: asFunctionalRef(row.sourceUnitRef),
    target_unit_ref: asFunctionalRef(row.targetUnitRef),
    rationale: row.rationale,
    confidence: row.confidence,
    created_at: row.createdAt.toISOString(),
  };
}

function toClusterRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  evidenceMapId: string;
  evidenceMapVersion: string;
  clusterType: string;
  clusterKey: string;
  unitRefs: Prisma.JsonValue;
  label: string;
  rationale: string | null;
  confidence: number | null;
  createdAt: Date;
}): TopicSelectionEvidenceClusterRecord {
  return {
    evidence_cluster_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    evidence_map_version: row.evidenceMapVersion,
    cluster_type: row.clusterType as TopicSelectionEvidenceClusterRecord['cluster_type'],
    cluster_key: row.clusterKey,
    unit_refs: asArray<TopicSelectionFunctionalRef>(row.unitRefs),
    label: row.label,
    rationale: row.rationale,
    confidence: row.confidence,
    created_at: row.createdAt.toISOString(),
  };
}

function toPatternRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  evidenceMapId: string;
  evidenceMapVersion: string;
  patternType: string;
  evidenceRole: string;
  unitRefs: Prisma.JsonValue;
  patternStatement: string;
  confidence: number | null;
  createdAt: Date;
}): TopicSelectionEvidencePatternRecord {
  return {
    evidence_pattern_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    evidence_map_version: row.evidenceMapVersion,
    pattern_type: row.patternType as TopicSelectionEvidencePatternRecord['pattern_type'],
    evidence_role: row.evidenceRole as TopicSelectionEvidencePatternRecord['evidence_role'],
    unit_refs: asArray<TopicSelectionFunctionalRef>(row.unitRefs),
    pattern_statement: row.patternStatement,
    confidence: row.confidence,
    created_at: row.createdAt.toISOString(),
  };
}

function toConflictSetRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string | null;
  evidenceMapId: string;
  evidenceMapVersion: string;
  conflictType: string;
  severity: string;
  supportUnitRefs: Prisma.JsonValue;
  challengeUnitRefs: Prisma.JsonValue;
  baselineUnitRefs: Prisma.JsonValue;
  contextUnitRefs: Prisma.JsonValue;
  issueCodes: string[];
  createdAt: Date;
}): TopicSelectionEvidenceConflictSetRecord {
  return {
    evidence_conflict_set_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    evidence_map_version: row.evidenceMapVersion,
    conflict_type: row.conflictType as TopicSelectionEvidenceConflictSetRecord['conflict_type'],
    severity: row.severity as TopicSelectionEvidenceConflictSetRecord['severity'],
    support_unit_refs: asArray<TopicSelectionFunctionalRef>(row.supportUnitRefs),
    challenge_unit_refs: asArray<TopicSelectionFunctionalRef>(row.challengeUnitRefs),
    baseline_unit_refs: asArray<TopicSelectionFunctionalRef>(row.baselineUnitRefs),
    context_unit_refs: asArray<TopicSelectionFunctionalRef>(row.contextUnitRefs),
    issue_codes: row.issueCodes,
    created_at: row.createdAt.toISOString(),
  };
}

function toStrengthAssessmentRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  evidenceMapId: string;
  evidenceMapVersion: string;
  searchRunRef: Prisma.JsonValue;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  targetRef: Prisma.JsonValue;
  purpose: string;
  granularity: string;
  roleBundle: Prisma.JsonValue;
  unitRefs: Prisma.JsonValue;
  conflictRefs: Prisma.JsonValue;
  cacheKey: string;
  strengthVerdict: string;
  confidence: number | null;
  gapCodes: string[];
  qualitySignalRefs: Prisma.JsonValue;
  staleReasonCodes: string[];
  freshnessStatus: string;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  policyVersionId: string | null;
  assessmentWorkflowVersion: string;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionEvidenceStrengthAssessmentRecord {
  return {
    evidence_strength_assessment_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    evidence_map_id: row.evidenceMapId,
    evidence_map_version: row.evidenceMapVersion,
    search_run_ref: asFunctionalRef(row.searchRunRef),
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    target_ref: asFunctionalRef(row.targetRef),
    purpose: row.purpose as TopicSelectionEvidenceStrengthAssessmentRecord['purpose'],
    granularity: row.granularity as TopicSelectionEvidenceStrengthAssessmentRecord['granularity'],
    role_bundle: asRecord(row.roleBundle) as unknown as TopicSelectionEvidenceRoleBundle,
    unit_refs: asArray<TopicSelectionFunctionalRef>(row.unitRefs),
    conflict_refs: asArray<TopicSelectionFunctionalRef>(row.conflictRefs),
    cache_key: row.cacheKey,
    strength_verdict: row.strengthVerdict as TopicSelectionEvidenceStrengthAssessmentRecord['strength_verdict'],
    confidence: row.confidence,
    gap_codes: row.gapCodes,
    quality_signal_refs: asArray<TopicSelectionFunctionalRef>(row.qualitySignalRefs),
    stale_reason_codes: row.staleReasonCodes,
    freshness_status: row.freshnessStatus as TopicSelectionEvidenceStrengthAssessmentRecord['freshness_status'],
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    policy_version_id: row.policyVersionId,
    assessment_workflow_version: row.assessmentWorkflowVersion,
    created_by: row.createdBy as TopicSelectionEvidenceStrengthAssessmentRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaTopicSelectionEvidenceMapRepository implements TopicSelectionEvidenceMapRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEvidenceMapWithRecords(
    records: TopicSelectionEvidenceMapCreateRecords,
  ): Promise<TopicSelectionEvidenceMapCreateRecords> {
    return this.prisma.$transaction(async (tx) => {
      const evidenceMap = await tx.topicSelectionEvidenceMap.create({
        data: this.toEvidenceMapCreateInput(records.evidence_map),
      });
      const units = [];
      for (const unit of records.evidence_units) {
        units.push(await tx.topicSelectionEvidenceUnit.create({
          data: this.toEvidenceUnitCreateInput(unit),
        }));
      }
      const links = [];
      for (const link of records.typed_links) {
        links.push(await tx.topicSelectionEvidenceTypedLink.create({
          data: this.toTypedLinkCreateInput(link),
        }));
      }
      const clusters = [];
      for (const cluster of records.clusters) {
        clusters.push(await tx.topicSelectionEvidenceCluster.create({
          data: this.toClusterCreateInput(cluster),
        }));
      }
      const patterns = [];
      for (const pattern of records.patterns) {
        patterns.push(await tx.topicSelectionEvidencePattern.create({
          data: this.toPatternCreateInput(pattern),
        }));
      }
      const conflictSets = [];
      for (const conflictSet of records.conflict_sets) {
        conflictSets.push(await tx.topicSelectionEvidenceConflictSet.create({
          data: this.toConflictSetCreateInput(conflictSet),
        }));
      }
      return {
        evidence_map: toEvidenceMapRecord(evidenceMap),
        evidence_units: units.map(toEvidenceUnitRecord),
        typed_links: links.map(toTypedLinkRecord),
        clusters: clusters.map(toClusterRecord),
        patterns: patterns.map(toPatternRecord),
        conflict_sets: conflictSets.map(toConflictSetRecord),
      };
    });
  }

  async findEvidenceMapById(evidenceMapId: string): Promise<TopicSelectionEvidenceMapRecord | null> {
    const row = await this.prisma.topicSelectionEvidenceMap.findUnique({ where: { id: evidenceMapId } });
    return row ? toEvidenceMapRecord(row) : null;
  }

  async listEvidenceMapsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionEvidenceMapRecord[]> {
    const rows = await this.prisma.topicSelectionEvidenceMap.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEvidenceMapRecord);
  }

  async updateEvidenceMapFreshness(
    evidenceMapId: string,
    freshnessStatus: TopicSelectionEvidenceFreshnessStatus,
    staleReasonCodes: string[],
  ): Promise<TopicSelectionEvidenceMapRecord> {
    const current = await this.prisma.topicSelectionEvidenceMap.findUnique({ where: { id: evidenceMapId } });
    if (!current) {
      throw new Error(`EvidenceMap ${evidenceMapId} not found.`);
    }
    const nextReasonCodes = [...new Set([...current.staleReasonCodes, ...staleReasonCodes])];
    const row = await this.prisma.topicSelectionEvidenceMap.update({
      where: { id: evidenceMapId },
      data: {
        freshnessStatus,
        status: freshnessStatus === 'current' ? current.status : 'stale',
        staleReasonCodes: nextReasonCodes,
      },
    });
    return toEvidenceMapRecord(row);
  }

  async listEvidenceUnitsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceUnitRecord[]> {
    const rows = await this.prisma.topicSelectionEvidenceUnit.findMany({
      where: { evidenceMapId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toEvidenceUnitRecord);
  }

  async findEvidenceUnitById(evidenceUnitId: string): Promise<TopicSelectionEvidenceUnitRecord | null> {
    const row = await this.prisma.topicSelectionEvidenceUnit.findUnique({ where: { id: evidenceUnitId } });
    return row ? toEvidenceUnitRecord(row) : null;
  }

  async listTypedLinksByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceTypedLinkRecord[]> {
    const rows = await this.prisma.topicSelectionEvidenceTypedLink.findMany({
      where: { evidenceMapId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toTypedLinkRecord);
  }

  async listClustersByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceClusterRecord[]> {
    const rows = await this.prisma.topicSelectionEvidenceCluster.findMany({
      where: { evidenceMapId },
      orderBy: { clusterKey: 'asc' },
    });
    return rows.map(toClusterRecord);
  }

  async listPatternsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidencePatternRecord[]> {
    const rows = await this.prisma.topicSelectionEvidencePattern.findMany({
      where: { evidenceMapId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toPatternRecord);
  }

  async listConflictSetsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceConflictSetRecord[]> {
    const rows = await this.prisma.topicSelectionEvidenceConflictSet.findMany({
      where: { evidenceMapId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toConflictSetRecord);
  }

  async createEvidenceStrengthAssessment(
    record: TopicSelectionEvidenceStrengthAssessmentRecord,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord> {
    const row = await this.prisma.topicSelectionEvidenceStrengthAssessment.create({
      data: this.toStrengthAssessmentCreateInput(record),
    });
    return toStrengthAssessmentRecord(row);
  }

  async findFreshEvidenceStrengthAssessmentByCacheKey(
    cacheKey: string,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord | null> {
    const row = await this.prisma.topicSelectionEvidenceStrengthAssessment.findFirst({
      where: { cacheKey, freshnessStatus: 'current' },
    });
    return row ? toStrengthAssessmentRecord(row) : null;
  }

  async listEvidenceStrengthAssessmentsByEvidenceMapId(
    evidenceMapId: string,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord[]> {
    const rows = await this.prisma.topicSelectionEvidenceStrengthAssessment.findMany({
      where: { evidenceMapId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toStrengthAssessmentRecord);
  }

  async markEvidenceStrengthAssessmentsStaleByEvidenceMapId(
    evidenceMapId: string,
    staleReasonCodes: string[],
    freshnessStatus: TopicSelectionEvidenceFreshnessStatus,
  ): Promise<number> {
    const current = await this.prisma.topicSelectionEvidenceStrengthAssessment.findMany({
      where: { evidenceMapId, freshnessStatus: 'current' },
    });
    for (const assessment of current) {
      await this.prisma.topicSelectionEvidenceStrengthAssessment.update({
        where: { id: assessment.id },
        data: {
          freshnessStatus,
          staleReasonCodes: [...new Set([...assessment.staleReasonCodes, ...staleReasonCodes])],
        },
      });
    }
    return current.length;
  }

  private toEvidenceMapCreateInput(record: TopicSelectionEvidenceMapRecord): Prisma.TopicSelectionEvidenceMapCreateInput {
    return {
      id: record.evidence_map_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      evidenceMapVersion: record.evidence_map_version,
      status: record.status,
      reviewStatus: record.review_status,
      freshnessStatus: record.freshness_status,
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      unitCount: record.unit_count,
      supportUnitCount: record.support_unit_count,
      challengeUnitCount: record.challenge_unit_count,
      baselineUnitCount: record.baseline_unit_count,
      contextUnitCount: record.context_unit_count,
      digestPayload: toJsonValue(record.digest_payload),
      staleReasonCodes: record.stale_reason_codes,
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

  private toEvidenceUnitCreateInput(record: TopicSelectionEvidenceUnitRecord): Prisma.TopicSelectionEvidenceUnitCreateInput {
    return {
      id: record.evidence_unit_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      evidenceMapId: record.evidence_map_id,
      evidenceMapVersion: record.evidence_map_version,
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      coverageRowIntentId: record.coverage_row_intent_ref?.ref_id ?? null,
      literatureId: record.literature_ref.ref_id,
      evidenceRole: record.evidence_role,
      locatorType: record.locator.locator_type,
      locatorRefType: record.locator.locator_ref.ref_type,
      locatorRefId: record.locator.locator_ref.ref_id,
      abstractOnly: record.abstract_only,
      reviewStatus: record.review_status,
      freshnessStatus: record.freshness_status,
      sourceAttributionKind: record.source_attribution_kind,
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      coverageRowIntentRef: record.coverage_row_intent_ref
        ? toJsonValue(record.coverage_row_intent_ref)
        : Prisma.JsonNull,
      literatureRef: toJsonValue(record.literature_ref),
      sourceRefs: toJsonValue(record.source_refs),
      locator: toJsonValue(record.locator),
      sourceStatement: record.source_statement,
      normalizedStatement: record.normalized_statement ?? null,
      interpretationPayload: toJsonValue(record.interpretation_payload),
      extractionConfidence: record.extraction_confidence ?? null,
      issueCodes: record.issue_codes,
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toTypedLinkCreateInput(record: TopicSelectionEvidenceTypedLinkRecord): Prisma.TopicSelectionEvidenceTypedLinkCreateInput {
    return {
      id: record.evidence_typed_link_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? null,
      evidenceMapId: record.evidence_map_id,
      evidenceMapVersion: record.evidence_map_version,
      linkType: record.link_type,
      sourceUnitId: record.source_unit_ref.ref_id,
      targetUnitId: record.target_unit_ref.ref_id,
      sourceUnitRef: toJsonValue(record.source_unit_ref),
      targetUnitRef: toJsonValue(record.target_unit_ref),
      rationale: record.rationale ?? null,
      confidence: record.confidence ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toClusterCreateInput(record: TopicSelectionEvidenceClusterRecord): Prisma.TopicSelectionEvidenceClusterCreateInput {
    return {
      id: record.evidence_cluster_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? null,
      evidenceMapId: record.evidence_map_id,
      evidenceMapVersion: record.evidence_map_version,
      clusterType: record.cluster_type,
      clusterKey: record.cluster_key,
      unitIds: toUnitIds(record.unit_refs),
      unitRefs: toJsonValue(record.unit_refs),
      label: record.label,
      rationale: record.rationale ?? null,
      confidence: record.confidence ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toPatternCreateInput(record: TopicSelectionEvidencePatternRecord): Prisma.TopicSelectionEvidencePatternCreateInput {
    return {
      id: record.evidence_pattern_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? null,
      evidenceMapId: record.evidence_map_id,
      evidenceMapVersion: record.evidence_map_version,
      patternType: record.pattern_type,
      evidenceRole: record.evidence_role,
      unitIds: toUnitIds(record.unit_refs),
      unitRefs: toJsonValue(record.unit_refs),
      patternStatement: record.pattern_statement,
      confidence: record.confidence ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toConflictSetCreateInput(
    record: TopicSelectionEvidenceConflictSetRecord,
  ): Prisma.TopicSelectionEvidenceConflictSetCreateInput {
    return {
      id: record.evidence_conflict_set_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? null,
      evidenceMapId: record.evidence_map_id,
      evidenceMapVersion: record.evidence_map_version,
      conflictType: record.conflict_type,
      severity: record.severity,
      supportUnitIds: toUnitIds(record.support_unit_refs),
      challengeUnitIds: toUnitIds(record.challenge_unit_refs),
      baselineUnitIds: toUnitIds(record.baseline_unit_refs),
      contextUnitIds: toUnitIds(record.context_unit_refs),
      supportUnitRefs: toJsonValue(record.support_unit_refs),
      challengeUnitRefs: toJsonValue(record.challenge_unit_refs),
      baselineUnitRefs: toJsonValue(record.baseline_unit_refs),
      contextUnitRefs: toJsonValue(record.context_unit_refs),
      issueCodes: record.issue_codes,
      createdAt: new Date(record.created_at),
    };
  }

  private toStrengthAssessmentCreateInput(
    record: TopicSelectionEvidenceStrengthAssessmentRecord,
  ): Prisma.TopicSelectionEvidenceStrengthAssessmentCreateInput {
    return {
      id: record.evidence_strength_assessment_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      evidenceMapId: record.evidence_map_id,
      evidenceMapVersion: record.evidence_map_version,
      searchRunId: record.search_run_ref.ref_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      targetRefType: record.target_ref.ref_type,
      targetRefId: record.target_ref.ref_id,
      targetRef: toJsonValue(record.target_ref),
      searchRunRef: toJsonValue(record.search_run_ref),
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      purpose: record.purpose,
      granularity: record.granularity,
      roleBundle: toJsonValue(record.role_bundle),
      unitIds: toUnitIds(record.unit_refs),
      unitRefs: toJsonValue(record.unit_refs),
      conflictRefs: toJsonValue(record.conflict_refs),
      cacheKey: record.cache_key,
      strengthVerdict: record.strength_verdict,
      confidence: record.confidence ?? null,
      gapCodes: record.gap_codes,
      qualitySignalRefs: toJsonValue(record.quality_signal_refs),
      staleReasonCodes: record.stale_reason_codes,
      freshnessStatus: record.freshness_status,
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      policyVersionId: record.policy_version_id ?? null,
      assessmentWorkflowVersion: record.assessment_workflow_version,
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }
}
