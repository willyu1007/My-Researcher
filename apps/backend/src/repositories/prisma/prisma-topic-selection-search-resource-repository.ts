import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionCoverageAssessmentRecord,
  TopicSelectionCoverageEvidenceBindingRecord,
  TopicSelectionCoverageExecutionObservationRecord,
  TopicSelectionCoverageRiskAcceptanceRecord,
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchRunRecord,
  TopicSelectionTopicSeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionSearchPlanWithCoverageIntentsResult,
  TopicSelectionSearchResourceRepository,
  TopicSelectionSearchRunCoverageRecords,
  TopicSelectionSearchRunWithCoverageRecordsResult,
} from '../topic-selection-search-resource.repository.js';

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

function parseDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function intFromRecord(value: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.trunc(raw);
    }
  }
  return 0;
}

function stringArrayFromRecord(value: Record<string, unknown>, key: string): string[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function fulltextMissingCount(sourceHealth: Record<string, unknown>): number {
  const explicit = intFromRecord(sourceHealth, 'fulltext_missing_count', 'missing_fulltext_count');
  if (explicit > 0) {
    return explicit;
  }
  return Math.max(
    intFromRecord(sourceHealth, 'total_literature_count', 'total_source_count')
      - intFromRecord(sourceHealth, 'fulltext_ready_count'),
    0,
  );
}

function toTopicSeedRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  seedVersion: string;
  seedKind: string;
  workingTitle: string;
  intentSummary: string;
  scopeNotes: string | null;
  sourceTitleCardRef: Prisma.JsonValue;
  sourceRefs: Prisma.JsonValue;
  inputSnapshotId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  traceSnapshotId: string | null;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionTopicSeedRecord {
  return {
    topic_seed_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    seed_version: row.seedVersion,
    seed_kind: row.seedKind as TopicSelectionTopicSeedRecord['seed_kind'],
    working_title: row.workingTitle,
    intent_summary: row.intentSummary,
    scope_notes: row.scopeNotes,
    source_title_card_ref: asFunctionalRef(row.sourceTitleCardRef),
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    input_snapshot_id: row.inputSnapshotId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    trace_snapshot_id: row.traceSnapshotId,
    created_by: row.createdBy as TopicSelectionTopicSeedRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toLiteratureSnapshotRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  snapshotVersion: string;
  sourceScope: string;
  topicSeedRef: Prisma.JsonValue;
  literatureRefs: Prisma.JsonValue;
  contentSourceRefs: Prisma.JsonValue;
  sourceHealthSummary: Prisma.JsonValue;
  corpusManifestMembers: Prisma.JsonValue;
  retrievalStackIdentity: Prisma.JsonValue | null;
  snapshotHash: string;
  inputSnapshotId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionLiteratureResourcePoolSnapshotRecord {
  return {
    literature_resource_pool_snapshot_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    snapshot_version: row.snapshotVersion,
    source_scope: row.sourceScope as TopicSelectionLiteratureResourcePoolSnapshotRecord['source_scope'],
    topic_seed_ref: asFunctionalRef(row.topicSeedRef),
    literature_refs: asArray<TopicSelectionFunctionalRef>(row.literatureRefs),
    content_source_refs: asArray<TopicSelectionFunctionalRef>(row.contentSourceRefs),
    source_health_summary: asRecord(row.sourceHealthSummary) as unknown as TopicSelectionLiteratureResourcePoolSnapshotRecord['source_health_summary'],
    corpus_manifest_members: asArray<
      NonNullable<TopicSelectionLiteratureResourcePoolSnapshotRecord['corpus_manifest_members']>[number]
    >(row.corpusManifestMembers),
    retrieval_stack_identity: row.retrievalStackIdentity === null
      ? null
      : asRecord(row.retrievalStackIdentity) as unknown as NonNullable<
        TopicSelectionLiteratureResourcePoolSnapshotRecord['retrieval_stack_identity']
      >,
    snapshot_hash: row.snapshotHash,
    input_snapshot_id: row.inputSnapshotId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    created_by: row.createdBy as TopicSelectionLiteratureResourcePoolSnapshotRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toSearchPlanRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  planVersion: string;
  status: string;
  topicSeedRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  parentSearchPlanRef: Prisma.JsonValue | null;
  recheckRequestRef: Prisma.JsonValue | null;
  queryIntents: string[];
  mustCheckConstraints: string[];
  exclusionRules: string[];
  coverageStrategy: Prisma.JsonValue;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  artifactRefs: Prisma.JsonValue;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionSearchPlanRecord {
  return {
    search_plan_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    plan_version: row.planVersion,
    status: row.status as TopicSelectionSearchPlanRecord['status'],
    topic_seed_ref: asFunctionalRef(row.topicSeedRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    parent_search_plan_ref: row.parentSearchPlanRef === null ? null : asFunctionalRef(row.parentSearchPlanRef),
    recheck_request_ref: row.recheckRequestRef === null ? null : asFunctionalRef(row.recheckRequestRef),
    query_intents: row.queryIntents,
    must_check_constraints: row.mustCheckConstraints,
    exclusion_rules: row.exclusionRules,
    coverage_strategy: asRecord(row.coverageStrategy),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    created_by: row.createdBy as TopicSelectionSearchPlanRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toCoverageRowIntentRecord(row: {
  id: string;
  searchPlanId: string;
  workspaceId: string | null;
  titleCardId: string | null;
  coverageKey: string;
  intentType: string;
  query: string;
  rationale: string;
  required: boolean;
  priority: number;
  targetSourceTypes: string[];
  expectedEvidenceRole: string;
  refs: Prisma.JsonValue;
  createdAt: Date;
}): TopicSelectionCoverageRowIntentRecord {
  return {
    coverage_row_intent_id: row.id,
    search_plan_id: row.searchPlanId,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    coverage_key: row.coverageKey,
    intent_type: row.intentType as TopicSelectionCoverageRowIntentRecord['intent_type'],
    query: row.query,
    rationale: row.rationale,
    required: row.required,
    priority: row.priority,
    target_source_types: row.targetSourceTypes,
    expected_evidence_role: row.expectedEvidenceRole as TopicSelectionCoverageRowIntentRecord['expected_evidence_role'],
    refs: asArray<TopicSelectionFunctionalRef>(row.refs),
    created_at: row.createdAt.toISOString(),
  };
}

function toCoverageExecutionObservationRecord(row: {
  id: string;
  searchPlanId: string;
  coverageRowIntentId: string;
  searchRunId: string | null;
  status: string;
  resultCount: number;
  sourceCount: number;
  missingReasonCodes: string[];
  notes: string | null;
  createdAt: Date;
}): TopicSelectionCoverageExecutionObservationRecord {
  return {
    coverage_execution_observation_id: row.id,
    search_plan_id: row.searchPlanId,
    coverage_row_intent_id: row.coverageRowIntentId,
    search_run_id: row.searchRunId,
    status: row.status as TopicSelectionCoverageExecutionObservationRecord['status'],
    result_count: row.resultCount,
    source_count: row.sourceCount,
    missing_reason_codes: row.missingReasonCodes,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
  };
}

function toCoverageEvidenceBindingRecord(row: {
  id: string;
  searchPlanId: string;
  coverageRowIntentId: string;
  searchRunId: string;
  literatureRef: Prisma.JsonValue;
  sourceRefs: Prisma.JsonValue;
  bindingKind: string;
  resultRank: number | null;
  createdAt: Date;
}): TopicSelectionCoverageEvidenceBindingRecord {
  return {
    coverage_evidence_binding_id: row.id,
    search_plan_id: row.searchPlanId,
    coverage_row_intent_id: row.coverageRowIntentId,
    search_run_id: row.searchRunId,
    literature_ref: asFunctionalRef(row.literatureRef),
    source_refs: asArray<TopicSelectionFunctionalRef>(row.sourceRefs),
    binding_kind: row.bindingKind as TopicSelectionCoverageEvidenceBindingRecord['binding_kind'],
    result_rank: row.resultRank,
    created_at: row.createdAt.toISOString(),
  };
}

function toCoverageAssessmentRecord(row: {
  id: string;
  searchPlanId: string;
  coverageRowIntentId: string;
  verdict: string;
  issueCodes: string[];
  confidence: number | null;
  assessedBy: string;
  createdAt: Date;
}): TopicSelectionCoverageAssessmentRecord {
  return {
    coverage_assessment_id: row.id,
    search_plan_id: row.searchPlanId,
    coverage_row_intent_id: row.coverageRowIntentId,
    verdict: row.verdict as TopicSelectionCoverageAssessmentRecord['verdict'],
    issue_codes: row.issueCodes,
    confidence: row.confidence,
    assessed_by: row.assessedBy as TopicSelectionCoverageAssessmentRecord['assessed_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toCoverageRiskAcceptanceRecord(row: {
  id: string;
  searchPlanId: string;
  coverageRowIntentId: string;
  acceptedRiskRef: Prisma.JsonValue;
  acceptedBy: Prisma.JsonValue;
  rationale: string;
  expiresAt: Date | null;
  createdAt: Date;
}): TopicSelectionCoverageRiskAcceptanceRecord {
  return {
    coverage_risk_acceptance_id: row.id,
    search_plan_id: row.searchPlanId,
    coverage_row_intent_id: row.coverageRowIntentId,
    accepted_risk_ref: asFunctionalRef(row.acceptedRiskRef),
    accepted_by: asRecord(row.acceptedBy) as unknown as TopicSelectionCoverageRiskAcceptanceRecord['accepted_by'],
    rationale: row.rationale,
    expires_at: row.expiresAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

function toSearchRunRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  searchPlanRef: Prisma.JsonValue;
  literatureSnapshotRef: Prisma.JsonValue;
  runKind: string;
  runStatus: string;
  queryProvenance: Prisma.JsonValue;
  resultAccounting: Prisma.JsonValue;
  sourceHealthSummary: Prisma.JsonValue;
  dedupSummary: Prisma.JsonValue;
  evidenceMapInputRefs: Prisma.JsonValue;
  artifactRefs: Prisma.JsonValue;
  inputSnapshotId: string | null;
  workflowRunId: string | null;
  gateResultId: string | null;
  transitionAttemptId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}): TopicSelectionSearchRunRecord {
  return {
    search_run_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    search_plan_ref: asFunctionalRef(row.searchPlanRef),
    literature_snapshot_ref: asFunctionalRef(row.literatureSnapshotRef),
    run_kind: row.runKind as TopicSelectionSearchRunRecord['run_kind'],
    run_status: row.runStatus as TopicSelectionSearchRunRecord['run_status'],
    query_provenance: asArray<Record<string, unknown>>(row.queryProvenance),
    result_accounting: asRecord(row.resultAccounting) as unknown as TopicSelectionSearchRunRecord['result_accounting'],
    source_health_summary: asRecord(row.sourceHealthSummary),
    dedup_summary: asRecord(row.dedupSummary),
    evidence_map_input_refs: asArray<TopicSelectionFunctionalRef>(row.evidenceMapInputRefs),
    artifact_refs: asArray<TopicSelectionFunctionalRef>(row.artifactRefs),
    input_snapshot_id: row.inputSnapshotId,
    workflow_run_id: row.workflowRunId,
    gate_result_id: row.gateResultId,
    transition_attempt_id: row.transitionAttemptId,
    started_at: row.startedAt.toISOString(),
    finished_at: row.finishedAt?.toISOString() ?? null,
    created_by: row.createdBy as TopicSelectionSearchRunRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toRecheckRequestRecord(row: {
  id: string;
  workspaceId: string | null;
  titleCardId: string;
  sourceRef: Prisma.JsonValue;
  targetSearchPlanRef: Prisma.JsonValue;
  targetLiteratureSnapshotRef: Prisma.JsonValue | null;
  requestKey: string | null;
  strategyKey: string | null;
  issueRef: Prisma.JsonValue | null;
  originatingArenaSessionRef: Prisma.JsonValue | null;
  retrievalIntent: Prisma.JsonValue | null;
  expectedDecisionEffect: string | null;
  executionPolicy: Prisma.JsonValue | null;
  corpusManifestRef: Prisma.JsonValue | null;
  corpusManifestHash: string | null;
  supportingArtifactRefs: Prisma.JsonValue;
  reason: string;
  gapCodes: string[];
  requestedBy: string;
  status: string;
  decisionSummary: string | null;
  policyVersionId: string | null;
  acceptedRiskRefs: Prisma.JsonValue;
  resultingSearchPlanRef: Prisma.JsonValue | null;
  resultingSearchRunRef: Prisma.JsonValue | null;
  createdAt: Date;
  resolvedAt: Date | null;
}): TopicSelectionSearchPlanRecheckRequestRecord {
  return {
    search_plan_recheck_request_id: row.id,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    source_ref: asFunctionalRef(row.sourceRef),
    target_search_plan_ref: asFunctionalRef(row.targetSearchPlanRef),
    target_literature_snapshot_ref: row.targetLiteratureSnapshotRef === null
      ? null
      : asFunctionalRef(row.targetLiteratureSnapshotRef),
    request_key: row.requestKey,
    strategy_key: row.strategyKey,
    issue_ref: row.issueRef === null ? null : asFunctionalRef(row.issueRef),
    originating_arena_session_ref: row.originatingArenaSessionRef === null
      ? null
      : asFunctionalRef(row.originatingArenaSessionRef),
    retrieval_intent: row.retrievalIntent === null
      ? null
      : asRecord(row.retrievalIntent) as unknown as NonNullable<
        TopicSelectionSearchPlanRecheckRequestRecord['retrieval_intent']
      >,
    expected_decision_effect: row.expectedDecisionEffect,
    execution_policy: row.executionPolicy === null
      ? null
      : asRecord(row.executionPolicy) as unknown as NonNullable<
        TopicSelectionSearchPlanRecheckRequestRecord['execution_policy']
      >,
    corpus_manifest_ref: row.corpusManifestRef === null ? null : asFunctionalRef(row.corpusManifestRef),
    corpus_manifest_hash: row.corpusManifestHash,
    supporting_artifact_refs: asArray<TopicSelectionFunctionalRef>(row.supportingArtifactRefs),
    reason: row.reason,
    gap_codes: row.gapCodes,
    requested_by: row.requestedBy as TopicSelectionSearchPlanRecheckRequestRecord['requested_by'],
    status: row.status as TopicSelectionSearchPlanRecheckRequestRecord['status'],
    decision_summary: row.decisionSummary,
    policy_version_id: row.policyVersionId,
    accepted_risk_refs: asArray<TopicSelectionFunctionalRef>(row.acceptedRiskRefs),
    resulting_search_plan_ref: row.resultingSearchPlanRef === null ? null : asFunctionalRef(row.resultingSearchPlanRef),
    resulting_search_run_ref: row.resultingSearchRunRef === null ? null : asFunctionalRef(row.resultingSearchRunRef),
    created_at: row.createdAt.toISOString(),
    resolved_at: row.resolvedAt?.toISOString() ?? null,
  };
}

export class PrismaTopicSelectionSearchResourceRepository implements TopicSelectionSearchResourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTopicSeed(record: TopicSelectionTopicSeedRecord): Promise<TopicSelectionTopicSeedRecord> {
    const row = await this.prisma.topicSelectionTopicSeed.create({
      data: {
        id: record.topic_seed_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id,
        seedVersion: record.seed_version,
        seedKind: record.seed_kind,
        workingTitle: record.working_title,
        intentSummary: record.intent_summary,
        scopeNotes: record.scope_notes ?? null,
        sourceTitleCardRef: toJsonValue(record.source_title_card_ref),
        sourceRefs: toJsonValue(record.source_refs),
        inputSnapshotId: record.input_snapshot_id ?? null,
        gateResultId: record.gate_result_id ?? null,
        transitionAttemptId: record.transition_attempt_id ?? null,
        traceSnapshotId: record.trace_snapshot_id ?? null,
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toTopicSeedRecord(row);
  }

  async findTopicSeedById(topicSeedId: string): Promise<TopicSelectionTopicSeedRecord | null> {
    const row = await this.prisma.topicSelectionTopicSeed.findUnique({ where: { id: topicSeedId } });
    return row ? toTopicSeedRecord(row) : null;
  }

  async createLiteratureResourcePoolSnapshot(
    record: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord> {
    const sourceHealth = record.source_health_summary;
    const row = await this.prisma.topicSelectionLiteratureResourcePoolSnapshot.create({
      data: {
        id: record.literature_resource_pool_snapshot_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id,
        snapshotVersion: record.snapshot_version,
        sourceScope: record.source_scope,
        topicSeedId: record.topic_seed_ref.ref_id,
        topicSeedRef: toJsonValue(record.topic_seed_ref),
        literatureRefs: toJsonValue(record.literature_refs),
        contentSourceRefs: toJsonValue(record.content_source_refs),
        sourceHealthSummary: toJsonValue(record.source_health_summary),
        corpusManifestMembers: toJsonValue(record.corpus_manifest_members ?? []),
        retrievalStackIdentity: record.retrieval_stack_identity
          ? toJsonValue(record.retrieval_stack_identity)
          : Prisma.JsonNull,
        totalLiteratureCount: sourceHealth.total_literature_count,
        missingLiteratureCount: sourceHealth.missing_literature_ids.length,
        sourceCount: sourceHealth.source_count,
        fulltextReadyCount: sourceHealth.fulltext_ready_count,
        fulltextMissingCount: Math.max(sourceHealth.total_literature_count - sourceHealth.fulltext_ready_count, 0),
        blockedCount: sourceHealth.blocked_count,
        warningCodes: sourceHealth.warning_codes,
        snapshotHash: record.snapshot_hash,
        inputSnapshotId: record.input_snapshot_id ?? null,
        gateResultId: record.gate_result_id ?? null,
        transitionAttemptId: record.transition_attempt_id ?? null,
        createdBy: record.created_by,
        createdAt: new Date(record.created_at),
      },
    });
    return toLiteratureSnapshotRecord(row);
  }

  async findLiteratureResourcePoolSnapshotById(
    snapshotId: string,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord | null> {
    const row = await this.prisma.topicSelectionLiteratureResourcePoolSnapshot.findUnique({
      where: { id: snapshotId },
    });
    return row ? toLiteratureSnapshotRecord(row) : null;
  }

  async createSearchPlanWithCoverageIntents(
    searchPlan: TopicSelectionSearchPlanRecord,
    coverageRowIntents: TopicSelectionCoverageRowIntentRecord[],
  ): Promise<TopicSelectionSearchPlanWithCoverageIntentsResult> {
    return this.prisma.$transaction(async (tx) => {
      const planRow = await tx.topicSelectionSearchPlan.create({
        data: this.toSearchPlanCreateInput(searchPlan),
      });
      const intentRows = [];
      for (const intent of coverageRowIntents) {
        intentRows.push(await tx.topicSelectionCoverageRowIntent.create({
          data: this.toCoverageRowIntentCreateInput(intent),
        }));
      }
      return {
        search_plan: toSearchPlanRecord(planRow),
        coverage_row_intents: intentRows.map(toCoverageRowIntentRecord),
      };
    });
  }

  async findSearchPlanById(searchPlanId: string): Promise<TopicSelectionSearchPlanRecord | null> {
    const row = await this.prisma.topicSelectionSearchPlan.findUnique({ where: { id: searchPlanId } });
    return row ? toSearchPlanRecord(row) : null;
  }

  async listSearchPlansByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecord[]> {
    const rows = await this.prisma.topicSelectionSearchPlan.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toSearchPlanRecord);
  }

  async createCoverageExecutionObservation(
    record: TopicSelectionCoverageExecutionObservationRecord,
  ): Promise<TopicSelectionCoverageExecutionObservationRecord> {
    const row = await this.prisma.topicSelectionCoverageExecutionObservation.create({
      data: this.toCoverageExecutionObservationCreateInput(record),
    });
    return toCoverageExecutionObservationRecord(row);
  }

  async createCoverageEvidenceBinding(
    record: TopicSelectionCoverageEvidenceBindingRecord,
  ): Promise<TopicSelectionCoverageEvidenceBindingRecord> {
    const row = await this.prisma.topicSelectionCoverageEvidenceBinding.create({
      data: this.toCoverageEvidenceBindingCreateInput(record),
    });
    return toCoverageEvidenceBindingRecord(row);
  }

  async createCoverageAssessment(
    record: TopicSelectionCoverageAssessmentRecord,
  ): Promise<TopicSelectionCoverageAssessmentRecord> {
    const row = await this.prisma.topicSelectionCoverageAssessment.create({
      data: this.toCoverageAssessmentCreateInput(record),
    });
    return toCoverageAssessmentRecord(row);
  }

  async createCoverageRiskAcceptance(
    record: TopicSelectionCoverageRiskAcceptanceRecord,
  ): Promise<TopicSelectionCoverageRiskAcceptanceRecord> {
    const row = await this.prisma.topicSelectionCoverageRiskAcceptance.create({
      data: this.toCoverageRiskAcceptanceCreateInput(record),
    });
    return toCoverageRiskAcceptanceRecord(row);
  }

  async listCoverageRowIntentsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageRowIntentRecord[]> {
    const rows = await this.prisma.topicSelectionCoverageRowIntent.findMany({
      where: { searchPlanId },
      orderBy: [{ priority: 'asc' }, { coverageKey: 'asc' }],
    });
    return rows.map(toCoverageRowIntentRecord);
  }

  async listCoverageExecutionObservationsBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageExecutionObservationRecord[]> {
    const rows = await this.prisma.topicSelectionCoverageExecutionObservation.findMany({
      where: { searchPlanId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCoverageExecutionObservationRecord);
  }

  async listCoverageEvidenceBindingsBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageEvidenceBindingRecord[]> {
    const rows = await this.prisma.topicSelectionCoverageEvidenceBinding.findMany({
      where: { searchPlanId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCoverageEvidenceBindingRecord);
  }

  async listCoverageAssessmentsBySearchPlanId(searchPlanId: string): Promise<TopicSelectionCoverageAssessmentRecord[]> {
    const rows = await this.prisma.topicSelectionCoverageAssessment.findMany({
      where: { searchPlanId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCoverageAssessmentRecord);
  }

  async listCoverageRiskAcceptancesBySearchPlanId(
    searchPlanId: string,
  ): Promise<TopicSelectionCoverageRiskAcceptanceRecord[]> {
    const rows = await this.prisma.topicSelectionCoverageRiskAcceptance.findMany({
      where: { searchPlanId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCoverageRiskAcceptanceRecord);
  }

  async createSearchRunWithCoverageRecords(
    searchRun: TopicSelectionSearchRunRecord,
    coverageRecords: TopicSelectionSearchRunCoverageRecords,
  ): Promise<TopicSelectionSearchRunWithCoverageRecordsResult> {
    return this.prisma.$transaction(async (tx) => {
      const searchRunRow = await tx.topicSelectionSearchRun.create({
        data: this.toSearchRunCreateInput(searchRun),
      });
      const observations = [];
      for (const record of coverageRecords.observations) {
        observations.push(await tx.topicSelectionCoverageExecutionObservation.create({
          data: this.toCoverageExecutionObservationCreateInput(record),
        }));
      }
      const evidenceBindings = [];
      for (const record of coverageRecords.evidence_bindings) {
        evidenceBindings.push(await tx.topicSelectionCoverageEvidenceBinding.create({
          data: this.toCoverageEvidenceBindingCreateInput(record),
        }));
      }
      const assessments = [];
      for (const record of coverageRecords.assessments) {
        assessments.push(await tx.topicSelectionCoverageAssessment.create({
          data: this.toCoverageAssessmentCreateInput(record),
        }));
      }
      const riskAcceptances = [];
      for (const record of coverageRecords.risk_acceptances) {
        riskAcceptances.push(await tx.topicSelectionCoverageRiskAcceptance.create({
          data: this.toCoverageRiskAcceptanceCreateInput(record),
        }));
      }
      return {
        search_run: toSearchRunRecord(searchRunRow),
        observations: observations.map(toCoverageExecutionObservationRecord),
        evidence_bindings: evidenceBindings.map(toCoverageEvidenceBindingRecord),
        assessments: assessments.map(toCoverageAssessmentRecord),
        risk_acceptances: riskAcceptances.map(toCoverageRiskAcceptanceRecord),
      };
    });
  }

  async findSearchRunById(searchRunId: string): Promise<TopicSelectionSearchRunRecord | null> {
    const row = await this.prisma.topicSelectionSearchRun.findUnique({ where: { id: searchRunId } });
    return row ? toSearchRunRecord(row) : null;
  }

  async createSearchPlanRecheckRequest(
    record: TopicSelectionSearchPlanRecheckRequestRecord,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
    try {
      const row = await this.prisma.topicSelectionSearchPlanRecheckRequest.create({
        data: {
          id: record.search_plan_recheck_request_id,
          workspaceId: record.workspace_id ?? null,
          titleCardId: record.title_card_id,
          sourceRefType: record.source_ref.ref_type,
          sourceRefId: record.source_ref.ref_id,
          targetSearchPlanId: record.target_search_plan_ref.ref_id,
          targetLiteratureSnapshotId: record.target_literature_snapshot_ref?.ref_id ?? null,
          resultingSearchPlanId: record.resulting_search_plan_ref?.ref_id ?? null,
          resultingSearchRunId: record.resulting_search_run_ref?.ref_id ?? null,
          sourceRef: toJsonValue(record.source_ref),
          targetSearchPlanRef: toJsonValue(record.target_search_plan_ref),
          targetLiteratureSnapshotRef: record.target_literature_snapshot_ref
            ? toJsonValue(record.target_literature_snapshot_ref)
            : Prisma.JsonNull,
          requestKey: record.request_key ?? null,
          strategyKey: record.strategy_key ?? null,
          issueRef: record.issue_ref ? toJsonValue(record.issue_ref) : Prisma.JsonNull,
          originatingArenaSessionRef: record.originating_arena_session_ref
            ? toJsonValue(record.originating_arena_session_ref)
            : Prisma.JsonNull,
          retrievalIntent: record.retrieval_intent ? toJsonValue(record.retrieval_intent) : Prisma.JsonNull,
          expectedDecisionEffect: record.expected_decision_effect ?? null,
          executionPolicy: record.execution_policy ? toJsonValue(record.execution_policy) : Prisma.JsonNull,
          corpusManifestRef: record.corpus_manifest_ref ? toJsonValue(record.corpus_manifest_ref) : Prisma.JsonNull,
          corpusManifestHash: record.corpus_manifest_hash ?? null,
          supportingArtifactRefs: toJsonValue(record.supporting_artifact_refs ?? []),
          reason: record.reason,
          gapCodes: record.gap_codes,
          requestedBy: record.requested_by,
          status: record.status,
          decisionSummary: record.decision_summary ?? null,
          policyVersionId: record.policy_version_id ?? null,
          acceptedRiskRefs: toJsonValue(record.accepted_risk_refs),
          resultingSearchPlanRef: record.resulting_search_plan_ref
            ? toJsonValue(record.resulting_search_plan_ref)
            : Prisma.JsonNull,
          resultingSearchRunRef: record.resulting_search_run_ref
            ? toJsonValue(record.resulting_search_run_ref)
            : Prisma.JsonNull,
          createdAt: new Date(record.created_at),
          resolvedAt: parseDate(record.resolved_at),
        },
      });
      return toRecheckRequestRecord(row);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)
        || error.code !== 'P2002'
        || !record.request_key) {
        throw error;
      }
      const replay = await this.findSearchPlanRecheckRequestByRequestKey(record.request_key);
      if (!replay) {
        throw error;
      }
      return replay;
    }
  }

  async findSearchPlanRecheckRequestById(
    requestId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord | null> {
    const row = await this.prisma.topicSelectionSearchPlanRecheckRequest.findUnique({ where: { id: requestId } });
    return row ? toRecheckRequestRecord(row) : null;
  }

  async findSearchPlanRecheckRequestByRequestKey(
    requestKey: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord | null> {
    const row = await this.prisma.topicSelectionSearchPlanRecheckRequest.findUnique({ where: { requestKey } });
    return row ? toRecheckRequestRecord(row) : null;
  }

  async listSearchPlanRecheckRequestsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord[]> {
    const rows = await this.prisma.topicSelectionSearchPlanRecheckRequest.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRecheckRequestRecord);
  }

  async updateSearchPlanRecheckRequest(
    requestId: string,
    patch: Partial<Omit<
      TopicSelectionSearchPlanRecheckRequestRecord,
      'search_plan_recheck_request_id' | 'workspace_id' | 'title_card_id' | 'source_ref' | 'target_search_plan_ref' | 'created_at'
    >>,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
    const row = await this.prisma.topicSelectionSearchPlanRecheckRequest.update({
      where: { id: requestId },
      data: {
        targetLiteratureSnapshotRef: patch.target_literature_snapshot_ref === undefined
          ? undefined
          : patch.target_literature_snapshot_ref
            ? toJsonValue(patch.target_literature_snapshot_ref)
            : Prisma.JsonNull,
        targetLiteratureSnapshotId: patch.target_literature_snapshot_ref === undefined
          ? undefined
          : patch.target_literature_snapshot_ref?.ref_id ?? null,
        reason: patch.reason,
        gapCodes: patch.gap_codes,
        requestedBy: patch.requested_by,
        status: patch.status,
        decisionSummary: patch.decision_summary,
        policyVersionId: patch.policy_version_id,
        requestKey: patch.request_key,
        strategyKey: patch.strategy_key,
        issueRef: patch.issue_ref === undefined
          ? undefined
          : patch.issue_ref ? toJsonValue(patch.issue_ref) : Prisma.JsonNull,
        originatingArenaSessionRef: patch.originating_arena_session_ref === undefined
          ? undefined
          : patch.originating_arena_session_ref
            ? toJsonValue(patch.originating_arena_session_ref)
            : Prisma.JsonNull,
        retrievalIntent: patch.retrieval_intent === undefined
          ? undefined
          : patch.retrieval_intent ? toJsonValue(patch.retrieval_intent) : Prisma.JsonNull,
        expectedDecisionEffect: patch.expected_decision_effect,
        executionPolicy: patch.execution_policy === undefined
          ? undefined
          : patch.execution_policy ? toJsonValue(patch.execution_policy) : Prisma.JsonNull,
        corpusManifestRef: patch.corpus_manifest_ref === undefined
          ? undefined
          : patch.corpus_manifest_ref ? toJsonValue(patch.corpus_manifest_ref) : Prisma.JsonNull,
        corpusManifestHash: patch.corpus_manifest_hash,
        supportingArtifactRefs: patch.supporting_artifact_refs === undefined
          ? undefined
          : toJsonValue(patch.supporting_artifact_refs),
        acceptedRiskRefs: patch.accepted_risk_refs === undefined ? undefined : toJsonValue(patch.accepted_risk_refs),
        resultingSearchPlanRef: patch.resulting_search_plan_ref === undefined
          ? undefined
          : patch.resulting_search_plan_ref
            ? toJsonValue(patch.resulting_search_plan_ref)
            : Prisma.JsonNull,
        resultingSearchPlanId: patch.resulting_search_plan_ref === undefined
          ? undefined
          : patch.resulting_search_plan_ref?.ref_id ?? null,
        resultingSearchRunRef: patch.resulting_search_run_ref === undefined
          ? undefined
          : patch.resulting_search_run_ref
            ? toJsonValue(patch.resulting_search_run_ref)
            : Prisma.JsonNull,
        resultingSearchRunId: patch.resulting_search_run_ref === undefined
          ? undefined
          : patch.resulting_search_run_ref?.ref_id ?? null,
        resolvedAt: patch.resolved_at === undefined ? undefined : parseDate(patch.resolved_at),
      },
    });
    return toRecheckRequestRecord(row);
  }

  private toSearchPlanCreateInput(record: TopicSelectionSearchPlanRecord): Prisma.TopicSelectionSearchPlanCreateInput {
    return {
      id: record.search_plan_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      planVersion: record.plan_version,
      status: record.status,
      topicSeedId: record.topic_seed_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      parentSearchPlanId: record.parent_search_plan_ref?.ref_id ?? null,
      recheckRequestId: record.recheck_request_ref?.ref_id ?? null,
      topicSeedRef: toJsonValue(record.topic_seed_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      parentSearchPlanRef: record.parent_search_plan_ref ? toJsonValue(record.parent_search_plan_ref) : Prisma.JsonNull,
      recheckRequestRef: record.recheck_request_ref ? toJsonValue(record.recheck_request_ref) : Prisma.JsonNull,
      queryIntents: record.query_intents,
      mustCheckConstraints: record.must_check_constraints,
      exclusionRules: record.exclusion_rules,
      coverageStrategy: toJsonValue(record.coverage_strategy),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      artifactRefs: toJsonValue(record.artifact_refs),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toCoverageRowIntentCreateInput(
    record: TopicSelectionCoverageRowIntentRecord,
  ): Prisma.TopicSelectionCoverageRowIntentCreateInput {
    return {
      id: record.coverage_row_intent_id,
      searchPlanId: record.search_plan_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id ?? null,
      coverageKey: record.coverage_key,
      intentType: record.intent_type,
      query: record.query,
      rationale: record.rationale,
      required: record.required,
      priority: record.priority,
      targetSourceTypes: record.target_source_types,
      expectedEvidenceRole: record.expected_evidence_role,
      refs: toJsonValue(record.refs),
      createdAt: new Date(record.created_at),
    };
  }

  private toCoverageExecutionObservationCreateInput(
    record: TopicSelectionCoverageExecutionObservationRecord,
  ): Prisma.TopicSelectionCoverageExecutionObservationCreateInput {
    return {
      id: record.coverage_execution_observation_id,
      searchPlanId: record.search_plan_id,
      coverageRowIntentId: record.coverage_row_intent_id,
      searchRunId: record.search_run_id ?? null,
      status: record.status,
      resultCount: record.result_count,
      sourceCount: record.source_count,
      missingReasonCodes: record.missing_reason_codes,
      notes: record.notes ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toCoverageEvidenceBindingCreateInput(
    record: TopicSelectionCoverageEvidenceBindingRecord,
  ): Prisma.TopicSelectionCoverageEvidenceBindingCreateInput {
    return {
      id: record.coverage_evidence_binding_id,
      searchPlanId: record.search_plan_id,
      coverageRowIntentId: record.coverage_row_intent_id,
      searchRunId: record.search_run_id,
      literatureRef: toJsonValue(record.literature_ref),
      sourceRefs: toJsonValue(record.source_refs),
      bindingKind: record.binding_kind,
      resultRank: record.result_rank ?? null,
      createdAt: new Date(record.created_at),
    };
  }

  private toCoverageAssessmentCreateInput(
    record: TopicSelectionCoverageAssessmentRecord,
  ): Prisma.TopicSelectionCoverageAssessmentCreateInput {
    return {
      id: record.coverage_assessment_id,
      searchPlanId: record.search_plan_id,
      coverageRowIntentId: record.coverage_row_intent_id,
      verdict: record.verdict,
      issueCodes: record.issue_codes,
      confidence: record.confidence ?? null,
      assessedBy: record.assessed_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toCoverageRiskAcceptanceCreateInput(
    record: TopicSelectionCoverageRiskAcceptanceRecord,
  ): Prisma.TopicSelectionCoverageRiskAcceptanceCreateInput {
    return {
      id: record.coverage_risk_acceptance_id,
      searchPlanId: record.search_plan_id,
      coverageRowIntentId: record.coverage_row_intent_id,
      acceptedRiskRef: toJsonValue(record.accepted_risk_ref),
      acceptedBy: toJsonValue(record.accepted_by),
      rationale: record.rationale,
      expiresAt: parseDate(record.expires_at),
      createdAt: new Date(record.created_at),
    };
  }

  private toSearchRunCreateInput(record: TopicSelectionSearchRunRecord): Prisma.TopicSelectionSearchRunCreateInput {
    const sourceHealth = record.source_health_summary;
    return {
      id: record.search_run_id,
      workspaceId: record.workspace_id ?? null,
      titleCardId: record.title_card_id,
      searchPlanId: record.search_plan_ref.ref_id,
      literatureSnapshotId: record.literature_snapshot_ref.ref_id,
      searchPlanRef: toJsonValue(record.search_plan_ref),
      literatureSnapshotRef: toJsonValue(record.literature_snapshot_ref),
      runKind: record.run_kind,
      runStatus: record.run_status,
      queryProvenance: toJsonValue(record.query_provenance),
      resultAccounting: toJsonValue(record.result_accounting),
      totalResultCount: record.result_accounting.total_result_count,
      uniqueLiteratureCount: record.result_accounting.unique_literature_count,
      duplicateResultCount: record.result_accounting.duplicate_result_count,
      failedSourceCount: record.result_accounting.failed_source_count,
      skippedSourceCount: record.result_accounting.skipped_source_count,
      sourceHealthSummary: toJsonValue(record.source_health_summary),
      sourceHealthSourceCount: intFromRecord(sourceHealth, 'source_count'),
      sourceHealthBlockedCount: intFromRecord(sourceHealth, 'blocked_count', 'blocked_source_count'),
      sourceHealthFulltextReadyCount: intFromRecord(sourceHealth, 'fulltext_ready_count'),
      sourceHealthFulltextMissingCount: fulltextMissingCount(sourceHealth),
      sourceHealthWarningCodes: stringArrayFromRecord(sourceHealth, 'warning_codes'),
      dedupSummary: toJsonValue(record.dedup_summary),
      evidenceMapInputRefs: toJsonValue(record.evidence_map_input_refs),
      artifactRefs: toJsonValue(record.artifact_refs),
      inputSnapshotId: record.input_snapshot_id ?? null,
      workflowRunId: record.workflow_run_id ?? null,
      gateResultId: record.gate_result_id ?? null,
      transitionAttemptId: record.transition_attempt_id ?? null,
      startedAt: new Date(record.started_at),
      finishedAt: parseDate(record.finished_at),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }
}
