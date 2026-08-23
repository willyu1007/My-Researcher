import type {
  PaperImplementationCitationCandidate as CitationCandidateRow,
  PaperImplementationClaimTracePacket as ClaimTracePacketRow,
  PaperImplementationNaturalLanguageFieldRole as FieldRoleRow,
  PaperImplementationTraceGateResult as TraceGateResultRow,
  PaperImplementationTraceManifest as TraceManifestRow,
  PaperImplementationTraceRepairQueueItem as QueueItemRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  CitationCandidate,
  ClaimTracePacket,
  ClaimTraceChallenge,
  ClaimTraceScope,
  ClaimTraceBoundary,
  NaturalLanguageFieldRoleRecord,
  SourceLocatorPayload,
  TraceArtifactLineage,
  TraceDecisionLineage,
  TraceExperimentLineage,
  TraceIntegrity,
  TraceInternalInterpretationLineage,
  TraceLineageBundle,
  TraceGateResult,
  TraceLiteratureLineage,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import type { PaperImplementationTraceRepository } from '../paper-implementation-trace.repository.js';

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
  return value === null || value === undefined
    ? null
    : asFunctionalRef(value);
}

function versionKey(value: string | null | undefined): string {
  return value ?? '';
}

function asLineageBundle(row: {
  literatureLineage: unknown;
  experimentLineage: unknown;
  artifactLineage: unknown;
  decisionLineage: unknown;
  internalInterpretationLineage: unknown;
}): TraceLineageBundle {
  return {
    literature: asRecord(row.literatureLineage) as unknown as TraceLiteratureLineage,
    experiment: asRecord(row.experimentLineage) as unknown as TraceExperimentLineage,
    artifact: asRecord(row.artifactLineage) as unknown as TraceArtifactLineage,
    decision: asRecord(row.decisionLineage) as unknown as TraceDecisionLineage,
    internal_interpretation: asRecord(row.internalInterpretationLineage) as unknown as TraceInternalInterpretationLineage,
  };
}

function toTraceManifest(row: TraceManifestRow): TraceManifest {
  return {
    trace_manifest_id: row.id,
    implementation_project_id: row.implementationProjectId,
    target_ref: asFunctionalRef(row.targetRef),
    lineage: asLineageBundle(row),
    integrity: asRecord(row.integrity) as unknown as TraceIntegrity,
    trace_status: row.traceStatus as TraceManifest['trace_status'],
    broken_ref_count: row.brokenRefCount,
    stale_ref_count: row.staleRefCount,
    missing_ref_count: row.missingRefCount,
    non_citable_ref_count: row.nonCitableRefCount,
    trace_policy_version_id: row.tracePolicyVersionId ?? null,
    created_by: row.createdBy as TraceManifest['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toCitationCandidate(row: CitationCandidateRow): CitationCandidate {
  return {
    citation_candidate_id: row.id,
    implementation_project_id: row.implementationProjectId,
    trace_manifest_id: row.traceManifestId,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    source_kind: row.sourceKind as CitationCandidate['source_kind'],
    source_type: row.sourceType as CitationCandidate['source_type'],
    source_id: row.sourceId,
    source_evidence_unit_ref: asFunctionalRef(row.sourceEvidenceUnitRef),
    source_locator_id: row.sourceLocatorId,
    locator_quality: row.locatorQuality as CitationCandidate['locator_quality'],
    locator: asRecord(row.locator) as SourceLocatorPayload,
    cited_for: asArray<CitationCandidate['cited_for'][number]>(row.citedFor),
    linked_target_refs: asArray<TopicSelectionFunctionalRef>(row.linkedTargetRefs),
    status: row.status as CitationCandidate['status'],
    normalized_source_statement: row.normalizedSourceStatement,
    citation_limitation: row.citationLimitation ?? null,
    created_by: row.createdBy as CitationCandidate['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toClaimTracePacket(row: ClaimTracePacketRow): ClaimTracePacket {
  return {
    claim_trace_packet_id: row.id,
    implementation_project_id: row.implementationProjectId,
    claim_ref: asFunctionalRef(row.claimRef),
    claim_statement: row.claimStatement,
    trace_manifest_id: row.traceManifestId,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    lineage: asLineageBundle(row),
    challenge: asRecord(row.challenge) as unknown as ClaimTraceChallenge,
    scope: asRecord(row.claimScope) as ClaimTraceScope,
    boundary: asRecord(row.boundary) as unknown as ClaimTraceBoundary,
    created_by: row.createdBy as ClaimTracePacket['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toFieldRole(row: FieldRoleRow): NaturalLanguageFieldRoleRecord {
  return {
    field_role_record_id: row.id,
    implementation_project_id: row.implementationProjectId,
    field_owner_ref: asFunctionalRef(row.fieldOwnerRef),
    field_name: row.fieldName,
    field_role: row.fieldRole as NaturalLanguageFieldRoleRecord['field_role'],
    can_feed_workflow: row.canFeedWorkflow,
    can_feed_hard_gate: row.canFeedHardGate,
    can_be_cited: row.canBeCited,
    policy_version_id: row.policyVersionId ?? null,
    created_by: row.createdBy as NaturalLanguageFieldRoleRecord['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toTraceGateResult(row: TraceGateResultRow): TraceGateResult {
  return {
    gate_result_id: row.id,
    implementation_project_id: row.implementationProjectId,
    trace_manifest_id: row.traceManifestId,
    gate_status: row.gateStatus as TraceGateResult['gate_status'],
    trace_status: row.traceStatus as TraceGateResult['trace_status'],
    blocker_codes: asArray<string>(row.blockerCodes),
    repair_queue_item_refs: asArray<TopicSelectionFunctionalRef>(row.repairQueueItemRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toQueueItem(row: QueueItemRow): TraceRepairQueueItem {
  return {
    queue_item_id: row.id,
    implementation_project_id: row.implementationProjectId,
    trace_manifest_id: row.traceManifestId,
    target_ref: asFunctionalRef(row.targetRef),
    lineage_type: row.lineageType as TraceRepairQueueItem['lineage_type'],
    blocker_code: row.blockerCode,
    severity: row.severity as TraceRepairQueueItem['severity'],
    status: row.status as TraceRepairQueueItem['status'],
    source_ref: asNullableFunctionalRef(row.sourceRef),
    created_by: row.createdBy as TraceRepairQueueItem['created_by'],
    created_at: row.createdAt.toISOString(),
    resolved_by: (row.resolvedBy as TraceRepairQueueItem['resolved_by']) ?? null,
    resolved_at: row.resolvedAt?.toISOString() ?? null,
    resolution_note: row.resolutionNote ?? null,
  };
}

export class PrismaPaperImplementationTraceRepository
implements PaperImplementationTraceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTraceManifest(
    manifest: TraceManifest,
    repairQueueItems: TraceRepairQueueItem[],
  ): Promise<TraceManifest> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paperImplementationTraceManifest.create({
          data: this.toTraceManifestCreateInput(manifest),
        });
        if (repairQueueItems.length > 0) {
          await tx.paperImplementationTraceRepairQueueItem.createMany({
            data: repairQueueItems.map((item) => this.toQueueItemCreateInput(item)),
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `TraceManifest ${manifest.trace_manifest_id} already exists.`,
        );
      }
      throw error;
    }
    return manifest;
  }

  async findTraceManifestById(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest | null> {
    const row = await this.prisma.paperImplementationTraceManifest.findFirst({
      where: {
        id: traceManifestId,
        implementationProjectId,
      },
    });
    return row ? toTraceManifest(row) : null;
  }

  async listTraceManifests(
    implementationProjectId: string,
  ): Promise<TraceManifest[]> {
    const rows = await this.prisma.paperImplementationTraceManifest.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toTraceManifest);
  }

  async createCitationCandidate(
    candidate: CitationCandidate,
  ): Promise<CitationCandidate> {
    try {
      const row = await this.prisma.paperImplementationCitationCandidate.create({
        data: this.toCitationCandidateCreateInput(candidate),
      });
      return toCitationCandidate(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `CitationCandidate ${candidate.citation_candidate_id} already exists.`,
        );
      }
      throw error;
    }
  }

  async listCitationCandidates(
    implementationProjectId: string,
  ): Promise<CitationCandidate[]> {
    const rows = await this.prisma.paperImplementationCitationCandidate.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCitationCandidate);
  }

  async createClaimTracePacket(
    packet: ClaimTracePacket,
  ): Promise<ClaimTracePacket> {
    const row = await this.prisma.paperImplementationClaimTracePacket.create({
      data: this.toClaimTracePacketCreateInput(packet),
    });
    return toClaimTracePacket(row);
  }

  async listClaimTracePackets(
    implementationProjectId: string,
  ): Promise<ClaimTracePacket[]> {
    const rows = await this.prisma.paperImplementationClaimTracePacket.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toClaimTracePacket);
  }

  async createNaturalLanguageFieldRole(
    record: NaturalLanguageFieldRoleRecord,
  ): Promise<NaturalLanguageFieldRoleRecord> {
    const row = await this.prisma.paperImplementationNaturalLanguageFieldRole.create({
      data: this.toFieldRoleCreateInput(record),
    });
    return toFieldRole(row);
  }

  async findNaturalLanguageFieldRoleByIdentity(
    implementationProjectId: string,
    fieldOwnerRef: TopicSelectionFunctionalRef,
    fieldName: string,
    policyVersionId: string | null,
  ): Promise<NaturalLanguageFieldRoleRecord | null> {
    const row = await this.prisma.paperImplementationNaturalLanguageFieldRole.findFirst({
      where: {
        implementationProjectId,
        fieldOwnerRefType: fieldOwnerRef.ref_type,
        fieldOwnerRefId: fieldOwnerRef.ref_id,
        fieldOwnerVersionKey: versionKey(fieldOwnerRef.version_id),
        fieldName,
        policyVersionKey: versionKey(policyVersionId),
      },
    });
    return row ? toFieldRole(row) : null;
  }

  async createTraceGateResult(
    gateResult: TraceGateResult,
  ): Promise<TraceGateResult> {
    try {
      return await this.createTraceGateResultRow(gateResult);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `TraceGateResult ${gateResult.gate_result_id} already exists.`,
        );
      }
      throw error;
    }
  }

  private async createTraceGateResultRow(
    gateResult: TraceGateResult,
  ): Promise<TraceGateResult> {
    const created = await this.prisma.paperImplementationTraceGateResult.create({
      data: {
        id: gateResult.gate_result_id,
        implementationProjectId: gateResult.implementation_project_id,
        traceManifestId: gateResult.trace_manifest_id,
        gateStatus: gateResult.gate_status,
        traceStatus: gateResult.trace_status,
        blockerCodes: toJsonValue(gateResult.blocker_codes),
        repairQueueItemRefs: toJsonValue(gateResult.repair_queue_item_refs),
        createdAt: new Date(gateResult.created_at),
      },
    });
    return toTraceGateResult(created);
  }

  async findTraceGateResultById(
    implementationProjectId: string,
    gateResultId: string,
  ): Promise<TraceGateResult | null> {
    const row = await this.prisma.paperImplementationTraceGateResult.findUnique({
      where: { id: gateResultId },
    });
    if (!row || row.implementationProjectId !== implementationProjectId) {
      return null;
    }
    return toTraceGateResult(row);
  }

  async listTraceRepairQueueItems(
    implementationProjectId: string,
  ): Promise<TraceRepairQueueItem[]> {
    const rows = await this.prisma.paperImplementationTraceRepairQueueItem.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toQueueItem);
  }

  async listTraceRepairQueueItemsByManifest(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceRepairQueueItem[]> {
    const rows = await this.prisma.paperImplementationTraceRepairQueueItem.findMany({
      where: {
        implementationProjectId,
        traceManifestId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toQueueItem);
  }

  async resolveTraceRepairQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    resolution: {
      resolved_by: TraceRepairQueueItem['resolved_by'];
      resolved_at: string;
      resolution_note?: string | null;
    },
  ): Promise<TraceRepairQueueItem> {
    const existing = await this.prisma.paperImplementationTraceRepairQueueItem.findFirst({
      where: {
        id: queueItemId,
        implementationProjectId,
      },
    });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `TraceRepairQueueItem ${queueItemId} not found.`);
    }
    const row = await this.prisma.paperImplementationTraceRepairQueueItem.update({
      where: { id: queueItemId },
      data: {
        status: 'resolved',
        resolvedBy: resolution.resolved_by ?? 'system',
        resolvedAt: new Date(resolution.resolved_at),
        resolutionNote: resolution.resolution_note ?? null,
      },
    });
    return toQueueItem(row);
  }

  private toTraceManifestCreateInput(
    manifest: TraceManifest,
  ): Prisma.PaperImplementationTraceManifestCreateInput {
    return {
      id: manifest.trace_manifest_id,
      implementationProjectId: manifest.implementation_project_id,
      targetRefType: manifest.target_ref.ref_type,
      targetRefId: manifest.target_ref.ref_id,
      targetVersionId: manifest.target_ref.version_id ?? null,
      targetRef: toJsonValue(manifest.target_ref),
      literatureLineage: toJsonValue(manifest.lineage.literature),
      experimentLineage: toJsonValue(manifest.lineage.experiment),
      artifactLineage: toJsonValue(manifest.lineage.artifact),
      decisionLineage: toJsonValue(manifest.lineage.decision),
      internalInterpretationLineage: toJsonValue(manifest.lineage.internal_interpretation),
      integrity: toJsonValue(manifest.integrity),
      traceStatus: manifest.trace_status,
      brokenRefCount: manifest.broken_ref_count,
      staleRefCount: manifest.stale_ref_count,
      missingRefCount: manifest.missing_ref_count,
      nonCitableRefCount: manifest.non_citable_ref_count,
      tracePolicyVersionId: manifest.trace_policy_version_id ?? null,
      createdBy: manifest.created_by,
      createdAt: new Date(manifest.created_at),
    };
  }

  private toCitationCandidateCreateInput(
    candidate: CitationCandidate,
  ): Prisma.PaperImplementationCitationCandidateCreateInput {
    return {
      id: candidate.citation_candidate_id,
      implementationProjectId: candidate.implementation_project_id,
      traceManifestId: candidate.trace_manifest_id,
      traceManifestRef: toJsonValue(candidate.trace_manifest_ref),
      sourceKind: candidate.source_kind,
      sourceType: candidate.source_type,
      sourceId: candidate.source_id,
      sourceEvidenceUnitRefType: candidate.source_evidence_unit_ref.ref_type,
      sourceEvidenceUnitId: candidate.source_evidence_unit_ref.ref_id,
      sourceEvidenceUnitVersionId: candidate.source_evidence_unit_ref.version_id ?? null,
      sourceEvidenceUnitRef: toJsonValue(candidate.source_evidence_unit_ref),
      sourceLocatorId: candidate.source_locator_id,
      locatorQuality: candidate.locator_quality,
      locator: toJsonValue(candidate.locator),
      citedFor: toJsonValue(candidate.cited_for),
      linkedTargetRefType: candidate.linked_target_refs[0]?.ref_type ?? '',
      linkedTargetRefId: candidate.linked_target_refs[0]?.ref_id ?? '',
      linkedTargetVersionId: candidate.linked_target_refs[0]?.version_id ?? null,
      linkedTargetRefs: toJsonValue(candidate.linked_target_refs),
      status: candidate.status,
      normalizedSourceStatement: candidate.normalized_source_statement,
      citationLimitation: candidate.citation_limitation ?? null,
      createdBy: candidate.created_by,
      createdAt: new Date(candidate.created_at),
    };
  }

  private toClaimTracePacketCreateInput(
    packet: ClaimTracePacket,
  ): Prisma.PaperImplementationClaimTracePacketCreateInput {
    return {
      id: packet.claim_trace_packet_id,
      implementationProjectId: packet.implementation_project_id,
      claimRefType: packet.claim_ref.ref_type,
      claimRefId: packet.claim_ref.ref_id,
      claimVersionId: packet.claim_ref.version_id ?? null,
      claimRef: toJsonValue(packet.claim_ref),
      claimStatement: packet.claim_statement,
      traceManifestId: packet.trace_manifest_id,
      traceManifestRef: toJsonValue(packet.trace_manifest_ref),
      literatureLineage: toJsonValue(packet.lineage.literature),
      experimentLineage: toJsonValue(packet.lineage.experiment),
      artifactLineage: toJsonValue(packet.lineage.artifact),
      decisionLineage: toJsonValue(packet.lineage.decision),
      internalInterpretationLineage: toJsonValue(packet.lineage.internal_interpretation),
      challenge: toJsonValue(packet.challenge),
      claimScope: toJsonValue(packet.scope),
      boundary: toJsonValue(packet.boundary),
      createdBy: packet.created_by,
      createdAt: new Date(packet.created_at),
    };
  }

  private toFieldRoleCreateInput(
    record: NaturalLanguageFieldRoleRecord,
  ): Prisma.PaperImplementationNaturalLanguageFieldRoleCreateInput {
    return {
      id: record.field_role_record_id,
      implementationProjectId: record.implementation_project_id,
      fieldOwnerRefType: record.field_owner_ref.ref_type,
      fieldOwnerRefId: record.field_owner_ref.ref_id,
      fieldOwnerVersionId: record.field_owner_ref.version_id ?? null,
      fieldOwnerVersionKey: versionKey(record.field_owner_ref.version_id),
      fieldOwnerRef: toJsonValue(record.field_owner_ref),
      fieldName: record.field_name,
      fieldRole: record.field_role,
      canFeedWorkflow: record.can_feed_workflow,
      canFeedHardGate: record.can_feed_hard_gate,
      canBeCited: record.can_be_cited,
      policyVersionId: record.policy_version_id ?? null,
      policyVersionKey: versionKey(record.policy_version_id),
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
    };
  }

  private toQueueItemCreateInput(
    item: TraceRepairQueueItem,
  ): Prisma.PaperImplementationTraceRepairQueueItemCreateManyInput {
    return {
      id: item.queue_item_id,
      implementationProjectId: item.implementation_project_id,
      traceManifestId: item.trace_manifest_id,
      targetRefType: item.target_ref.ref_type,
      targetRefId: item.target_ref.ref_id,
      targetVersionId: item.target_ref.version_id ?? null,
      targetRef: toJsonValue(item.target_ref),
      lineageType: item.lineage_type,
      blockerCode: item.blocker_code,
      severity: item.severity,
      status: item.status,
      sourceRef: item.source_ref ? toJsonValue(item.source_ref) : undefined,
      createdBy: item.created_by,
      createdAt: new Date(item.created_at),
      resolvedBy: item.resolved_by ?? null,
      resolvedAt: item.resolved_at ? new Date(item.resolved_at) : null,
      resolutionNote: item.resolution_note ?? null,
    };
  }
}
