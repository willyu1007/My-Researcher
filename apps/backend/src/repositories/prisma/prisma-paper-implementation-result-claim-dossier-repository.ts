import type {
  PaperImplementationClaimCandidate as ClaimCandidateRow,
  PaperImplementationDossier as DossierRow,
  PaperImplementationResultInterpretationPacket as ResultPacketRow,
  PaperImplementationWritingEntryPacket as WritingEntryPacketRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  ClaimBoundaryAssessment,
  ClaimCandidate,
  ClaimCandidateScope,
  ImplementationDossier,
  ImplementationDossierClaimSection,
  ImplementationDossierExperimentSection,
  ImplementationDossierReadiness,
  ImplementationDossierSourceBundle,
  PaperImplementationWritingEntryPacket,
  ResultInterpretationClaimImplications,
  ResultInterpretationPacket,
  ResultInterpretationReliability,
  ResultInterpretationSourceBundle,
  ResultInterpretationSummary,
  ClosedResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import {
  serverHashPaperImplementationResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  PaperImplementationResultClaimDossierRepository,
} from '../paper-implementation-result-claim-dossier.repository.js';
import {
  PaperImplementationResultPacketV2RepositoryError,
} from '../paper-implementation-result-claim-dossier.repository.js';

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

function refKey(ref: TopicSelectionFunctionalRef): string {
  return [
    ref.ref_type,
    ref.ref_id,
    ref.version_id ?? '',
  ].join(':');
}

function refKeys(refs: TopicSelectionFunctionalRef[]): string[] {
  return refs.map((ref) => refKey(ref));
}

function assertClosedPacketInvariant(packet: ClosedResultInterpretationPacketV2): void {
  const { packet_content_hash: packetHash, created_at: _createdAt, ...hashInput } = packet;
  if (
    packet.schema_version !== 'PaperImplementationResultInterpretationPacket@v2'
    || packetHash !== serverHashPaperImplementationResultInterpretationPacketV2(hashInput)
  ) {
    throw new PaperImplementationResultPacketV2RepositoryError(
      'PACKET_INVARIANT_INVALID',
      'ResultInterpretationPacket v2 content hash is invalid.',
    );
  }
}

function toResultInterpretationPacket(row: ResultPacketRow): ResultInterpretationPacket {
  return {
    result_interpretation_packet_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    ...(row.schemaVersion === null
      ? {}
      : {
        schema_version: row.schemaVersion as ResultInterpretationPacket['schema_version'],
        closure_id: row.closureId,
        closure_snapshot_hash: row.closureSnapshotHash,
        packet_content_hash: row.packetContentHash,
      }),
    experiment_plan_light_id: row.experimentPlanLightId,
    source: asRecord(row.sourcePayload) as unknown as ResultInterpretationSourceBundle,
    result_summary: asRecord(row.resultSummary) as unknown as ResultInterpretationSummary,
    reliability: asRecord(row.reliability) as unknown as ResultInterpretationReliability,
    claim_implications: asRecord(row.claimImplications) as unknown as ResultInterpretationClaimImplications,
    interpretation_gate_status: row.interpretationGateStatus as ResultInterpretationPacket['interpretation_gate_status'],
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    policy_version_id: row.policyVersionId ?? null,
    created_by: row.createdBy as ResultInterpretationPacket['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toClaimCandidate(row: ClaimCandidateRow): ClaimCandidate {
  return {
    claim_candidate_id: row.id,
    implementation_project_id: row.implementationProjectId,
    claim_type: row.claimType as ClaimCandidate['claim_type'],
    claim_statement: row.claimStatement,
    claim_strength: row.claimStrength as ClaimCandidate['claim_strength'],
    claim_status: row.claimStatus as ClaimCandidate['claim_status'],
    boundary_gate_status: row.boundaryGateStatus as ClaimCandidate['boundary_gate_status'],
    result_interpretation_packet_refs: asArray<TopicSelectionFunctionalRef>(
      row.resultInterpretationPacketRefPayloads,
    ),
    support_refs: asArray<TopicSelectionFunctionalRef>(row.supportRefPayloads),
    challenge_refs: asArray<TopicSelectionFunctionalRef>(row.challengeRefPayloads),
    scope: asRecord(row.scope) as unknown as ClaimCandidateScope,
    boundary: asRecord(row.boundary) as unknown as ClaimBoundaryAssessment,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    claim_trace_packet_ref: asNullableFunctionalRef(row.claimTracePacketRef),
    claim_trace_packet_id: row.claimTracePacketId ?? null,
    human_confirmation_required: row.humanConfirmationRequired,
    forbidden_overclaim_count: row.forbiddenOverclaimCount,
    policy_version_id: row.policyVersionId ?? null,
    created_by: row.createdBy as ClaimCandidate['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toDossier(row: DossierRow): ImplementationDossier {
  return {
    dossier_id: row.id,
    implementation_project_id: row.implementationProjectId,
    dossier_version: row.dossierVersion,
    dossier_status: row.dossierStatus as ImplementationDossier['dossier_status'],
    dossier_trace_status: row.dossierTraceStatus as ImplementationDossier['dossier_trace_status'],
    source: asRecord(row.sourcePayload) as unknown as ImplementationDossierSourceBundle,
    experiment_section: asRecord(row.experimentSection) as unknown as ImplementationDossierExperimentSection,
    claim_section: asRecord(row.claimSection) as unknown as ImplementationDossierClaimSection,
    readiness: asRecord(row.readiness) as unknown as ImplementationDossierReadiness,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    failed_run_count: row.failedRunCount,
    forbidden_overclaim_count: row.forbiddenOverclaimCount,
    readiness_gate_result_id: row.readinessGateResultId ?? null,
    projection_policy_version_id: row.projectionPolicyVersionId ?? null,
    dossier_hash: row.dossierHash,
    reopen_condition: row.reopenCondition ?? null,
    abandon_reason: row.abandonReason ?? null,
    policy_version_id: row.policyVersionId ?? null,
    created_by: row.createdBy as ImplementationDossier['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

function toWritingEntryPacket(row: WritingEntryPacketRow): PaperImplementationWritingEntryPacket {
  return {
    writing_entry_packet_id: row.id,
    implementation_project_id: row.implementationProjectId,
    dossier_id: row.dossierId,
    dossier_version: row.dossierVersion,
    dossier_hash: row.dossierHash,
    dossier_status: row.dossierStatus as PaperImplementationWritingEntryPacket['dossier_status'],
    readiness_gate_result_id: row.readinessGateResultId,
    trace_manifest_ref: asFunctionalRef(row.traceManifestRef),
    trace_manifest_id: row.traceManifestId,
    projection_policy_version_id: row.projectionPolicyVersionId,
    packet_status: row.packetStatus as PaperImplementationWritingEntryPacket['packet_status'],
    writing_target_ref: asNullableFunctionalRef(row.writingTargetRef),
    packet_payload: asRecord(row.packetPayload),
    created_by: row.createdBy as PaperImplementationWritingEntryPacket['created_by'],
    created_at: row.createdAt.toISOString(),
  };
}

export class PrismaPaperImplementationResultClaimDossierRepository
implements PaperImplementationResultClaimDossierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createResultInterpretationPacket(
    packet: ResultInterpretationPacket,
  ): Promise<ResultInterpretationPacket> {
    const row = await this.prisma.paperImplementationResultInterpretationPacket.create({
      data: this.toResultPacketCreateInput(packet),
    });
    return toResultInterpretationPacket(row);
  }

  async materializeClosedResultInterpretationPacket(
    packet: ClosedResultInterpretationPacketV2,
  ): Promise<ClosedResultInterpretationPacketV2> {
    assertClosedPacketInvariant(packet);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const closure = await transaction.paperImplementationValidationCycleClosureV2.findFirst({
          where: {
            id: packet.closure_id,
            closureSnapshotHash: packet.closure_snapshot_hash,
            validationCycleId: packet.validation_cycle_id,
            implementationProjectId: packet.implementation_project_id,
            closureKind: 'scientific_evidence_assessed',
          },
          select: { id: true },
        });
        if (!closure) {
          throw new PaperImplementationResultPacketV2RepositoryError(
            'PACKET_CLOSURE_DRIFT',
            'Exact scientific Closure changed before Packet materialization.',
          );
        }
        const existingByClosure = await transaction.paperImplementationResultInterpretationPacket.findUnique({
          where: { closureId: packet.closure_id },
        });
        if (existingByClosure) {
          const existing = toResultInterpretationPacket(existingByClosure);
          if (existing.schema_version === 'PaperImplementationResultInterpretationPacket@v2') {
            assertClosedPacketInvariant(existing as ClosedResultInterpretationPacketV2);
          }
          if (
            existing.packet_content_hash === packet.packet_content_hash
            && existing.created_at === packet.created_at
          ) return existing as ClosedResultInterpretationPacketV2;
          throw new PaperImplementationResultPacketV2RepositoryError(
            'PACKET_CONTENT_CONFLICT',
            'Scientific Closure is already bound to different Packet content.',
          );
        }
        const existingId = await transaction.paperImplementationResultInterpretationPacket.findUnique({
          where: { id: packet.result_interpretation_packet_id },
          select: { id: true },
        });
        if (existingId) {
          throw new PaperImplementationResultPacketV2RepositoryError(
            'PACKET_ID_CONFLICT',
            'ResultInterpretationPacket id is already bound to another record.',
          );
        }
        const row = await transaction.paperImplementationResultInterpretationPacket.create({
          data: this.toResultPacketCreateInput(packet),
        });
        return toResultInterpretationPacket(row) as ClosedResultInterpretationPacketV2;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof PaperImplementationResultPacketV2RepositoryError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034') {
          // Serialization aborts are infrastructure-level and must remain retryable
          // by the durable relay; they are not evidence that Closure authority drifted.
          throw error;
        }
        if (error.code === 'P2002') {
          return this.reconcilePacketUniqueConflict(packet);
        }
      }
      throw error;
    }
  }

  async findResultInterpretationPacketById(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ResultInterpretationPacket | null> {
    const row = await this.prisma.paperImplementationResultInterpretationPacket.findFirst({
      where: { id: resultInterpretationPacketId, implementationProjectId },
    });
    return row ? toResultInterpretationPacket(row) : null;
  }

  async listResultInterpretationPackets(
    implementationProjectId: string,
  ): Promise<ResultInterpretationPacket[]> {
    const rows = await this.prisma.paperImplementationResultInterpretationPacket.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toResultInterpretationPacket);
  }

  private async reconcilePacketUniqueConflict(
    packet: ClosedResultInterpretationPacketV2,
  ): Promise<ClosedResultInterpretationPacketV2> {
    const [existingByClosure, existingById] = await Promise.all([
      this.prisma.paperImplementationResultInterpretationPacket.findUnique({
        where: { closureId: packet.closure_id },
      }),
      this.prisma.paperImplementationResultInterpretationPacket.findUnique({
        where: { id: packet.result_interpretation_packet_id },
      }),
    ]);
    if (existingByClosure) {
      const existing = toResultInterpretationPacket(existingByClosure);
      if (existing.schema_version !== 'PaperImplementationResultInterpretationPacket@v2') {
        throw new PaperImplementationResultPacketV2RepositoryError(
          'PACKET_CONTENT_CONFLICT',
          'Scientific Closure is already bound to a non-v2 Packet record.',
        );
      }
      assertClosedPacketInvariant(existing as ClosedResultInterpretationPacketV2);
      if (
        existing.packet_content_hash === packet.packet_content_hash
        && existing.created_at === packet.created_at
      ) return existing as ClosedResultInterpretationPacketV2;
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_CONTENT_CONFLICT',
        'Scientific Closure is already bound to different Packet content.',
      );
    }
    if (existingById) {
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_ID_CONFLICT',
        'ResultInterpretationPacket id is already bound to another record.',
      );
    }
    throw new PaperImplementationResultPacketV2RepositoryError(
      'PACKET_CONTENT_CONFLICT',
      'Packet identity or Closure ownership is already bound.',
    );
  }

  async createClaimCandidate(candidate: ClaimCandidate): Promise<ClaimCandidate> {
    const row = await this.prisma.paperImplementationClaimCandidate.create({
      data: this.toClaimCandidateCreateInput(candidate),
    });
    return toClaimCandidate(row);
  }

  async findClaimCandidateById(
    implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate | null> {
    const row = await this.prisma.paperImplementationClaimCandidate.findFirst({
      where: { id: claimCandidateId, implementationProjectId },
    });
    return row ? toClaimCandidate(row) : null;
  }

  async listClaimCandidates(
    implementationProjectId: string,
  ): Promise<ClaimCandidate[]> {
    const rows = await this.prisma.paperImplementationClaimCandidate.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toClaimCandidate);
  }

  async createImplementationDossier(
    dossier: ImplementationDossier,
  ): Promise<ImplementationDossier> {
    const row = await this.prisma.paperImplementationDossier.create({
      data: this.toDossierCreateInput(dossier),
    });
    return toDossier(row);
  }

  async findImplementationDossierById(
    implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier | null> {
    const row = await this.prisma.paperImplementationDossier.findFirst({
      where: { id: dossierId, implementationProjectId },
    });
    return row ? toDossier(row) : null;
  }

  async listImplementationDossiers(
    implementationProjectId: string,
  ): Promise<ImplementationDossier[]> {
    const rows = await this.prisma.paperImplementationDossier.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDossier);
  }

  async createWritingEntryPacket(
    packet: PaperImplementationWritingEntryPacket,
  ): Promise<PaperImplementationWritingEntryPacket> {
    const row = await this.prisma.paperImplementationWritingEntryPacket.create({
      data: this.toWritingEntryPacketCreateInput(packet),
    });
    return toWritingEntryPacket(row);
  }

  async listWritingEntryPackets(
    implementationProjectId: string,
  ): Promise<PaperImplementationWritingEntryPacket[]> {
    const rows = await this.prisma.paperImplementationWritingEntryPacket.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toWritingEntryPacket);
  }

  private toResultPacketCreateInput(
    packet: ResultInterpretationPacket,
  ): Prisma.PaperImplementationResultInterpretationPacketUncheckedCreateInput {
    return {
      id: packet.result_interpretation_packet_id,
      implementationProjectId: packet.implementation_project_id,
      validationCycleId: packet.validation_cycle_id,
      schemaVersion: packet.schema_version ?? null,
      closureId: packet.closure_id ?? null,
      closureSnapshotHash: packet.closure_snapshot_hash ?? null,
      packetContentHash: packet.packet_content_hash ?? null,
      experimentPlanLightId: packet.experiment_plan_light_id ?? null,
      sourceRunEvidenceRefs: refKeys(packet.source.run_evidence_refs),
      sourceRunEvidenceRefPayloads: toJsonValue(packet.source.run_evidence_refs),
      validationReportRefs: refKeys(packet.source.validation_report_refs),
      validationReportRefPayloads: toJsonValue(packet.source.validation_report_refs),
      metricRefs: refKeys(packet.source.metric_refs),
      metricRefPayloads: toJsonValue(packet.source.metric_refs),
      failedRunRefs: refKeys(packet.source.failed_run_refs),
      failedRunRefPayloads: toJsonValue(packet.source.failed_run_refs),
      inconclusiveRunRefs: refKeys(packet.source.inconclusive_run_refs),
      inconclusiveRunRefPayloads: toJsonValue(packet.source.inconclusive_run_refs),
      staleOrInvalidatedEvidenceRefs: refKeys(packet.source.stale_or_invalidated_evidence_refs),
      staleOrInvalidatedEvidenceRefPayloads: toJsonValue(packet.source.stale_or_invalidated_evidence_refs),
      sourcePayload: toJsonValue(packet.source),
      resultSummary: toJsonValue(packet.result_summary),
      reliability: toJsonValue(packet.reliability),
      claimImplications: toJsonValue(packet.claim_implications),
      interpretationGateStatus: packet.interpretation_gate_status,
      failedRunsAccountedFor: packet.result_summary.failed_runs_accounted_for,
      inconclusiveRunsAccountedFor: packet.result_summary.inconclusive_runs_accounted_for,
      exploratoryConfirmatorySeparated: packet.result_summary.exploratory_confirmatory_separated,
      allowedClaimCeiling: packet.claim_implications.allowed_claim_ceiling,
      forbiddenOverclaimCount: packet.claim_implications.forbidden_overclaims.length,
      traceManifestId: packet.trace_manifest_id,
      traceManifestRef: toJsonValue(packet.trace_manifest_ref),
      policyVersionId: packet.policy_version_id ?? null,
      createdBy: packet.created_by,
      createdAt: new Date(packet.created_at),
    };
  }

  private toClaimCandidateCreateInput(
    candidate: ClaimCandidate,
  ): Prisma.PaperImplementationClaimCandidateCreateInput {
    const confirmationRef = candidate.boundary.human_confirmation_ref ?? null;
    return {
      id: candidate.claim_candidate_id,
      implementationProjectId: candidate.implementation_project_id,
      claimType: candidate.claim_type,
      claimStatement: candidate.claim_statement,
      claimStrength: candidate.claim_strength,
      claimStatus: candidate.claim_status,
      boundaryGateStatus: candidate.boundary_gate_status,
      resultInterpretationPacketRefs: refKeys(candidate.result_interpretation_packet_refs),
      resultInterpretationPacketRefPayloads: toJsonValue(candidate.result_interpretation_packet_refs),
      supportRefs: refKeys(candidate.support_refs),
      supportRefPayloads: toJsonValue(candidate.support_refs),
      challengeRefs: refKeys(candidate.challenge_refs),
      challengeRefPayloads: toJsonValue(candidate.challenge_refs),
      scope: toJsonValue(candidate.scope),
      boundary: toJsonValue(candidate.boundary),
      traceManifestId: candidate.trace_manifest_id,
      traceManifestRef: toJsonValue(candidate.trace_manifest_ref),
      claimTracePacketId: candidate.claim_trace_packet_id ?? null,
      claimTracePacketRef: candidate.claim_trace_packet_ref
        ? toJsonValue(candidate.claim_trace_packet_ref)
        : Prisma.JsonNull,
      humanConfirmationRequired: candidate.human_confirmation_required,
      humanConfirmationRef: confirmationRef ? toJsonValue(confirmationRef) : Prisma.JsonNull,
      humanConfirmationRefType: confirmationRef?.ref_type ?? null,
      humanConfirmationRefId: confirmationRef?.ref_id ?? null,
      humanConfirmationVersionId: confirmationRef?.version_id ?? null,
      forbiddenOverclaimCount: candidate.forbidden_overclaim_count,
      policyVersionId: candidate.policy_version_id ?? null,
      createdBy: candidate.created_by,
      createdAt: new Date(candidate.created_at),
    };
  }

  private toDossierCreateInput(
    dossier: ImplementationDossier,
  ): Prisma.PaperImplementationDossierCreateInput {
    return {
      id: dossier.dossier_id,
      implementationProjectId: dossier.implementation_project_id,
      dossierVersion: dossier.dossier_version,
      dossierStatus: dossier.dossier_status,
      dossierTraceStatus: dossier.dossier_trace_status,
      resultInterpretationPacketRefs: refKeys(dossier.source.result_interpretation_packet_refs),
      resultInterpretationPacketPayloads: toJsonValue(dossier.source.result_interpretation_packet_refs),
      claimCandidateRefs: refKeys(dossier.source.claim_candidate_refs),
      claimCandidateRefPayloads: toJsonValue(dossier.source.claim_candidate_refs),
      claimTracePacketRefs: refKeys(dossier.source.claim_trace_packet_refs),
      claimTracePacketRefPayloads: toJsonValue(dossier.source.claim_trace_packet_refs),
      runEvidenceRefs: refKeys(dossier.source.run_evidence_refs),
      runEvidenceRefPayloads: toJsonValue(dossier.source.run_evidence_refs),
      validationCycleRefs: refKeys(dossier.source.validation_cycle_refs),
      validationCycleRefPayloads: toJsonValue(dossier.source.validation_cycle_refs),
      traceManifestRefs: refKeys(dossier.source.trace_manifest_refs),
      traceManifestRefPayloads: toJsonValue(dossier.source.trace_manifest_refs),
      sourcePayload: toJsonValue(dossier.source),
      experimentSection: toJsonValue(dossier.experiment_section),
      claimSection: toJsonValue(dossier.claim_section),
      readiness: toJsonValue(dossier.readiness),
      traceManifestId: dossier.trace_manifest_id,
      traceManifestRef: toJsonValue(dossier.trace_manifest_ref),
      failedRunCount: dossier.failed_run_count,
      inconclusiveRunCount: dossier.experiment_section.inconclusive_run_refs.length,
      forbiddenOverclaimCount: dossier.forbidden_overclaim_count,
      readinessGateResultId: dossier.readiness_gate_result_id ?? null,
      projectionPolicyVersionId: dossier.projection_policy_version_id ?? null,
      dossierHash: dossier.dossier_hash,
      reopenCondition: dossier.reopen_condition ?? null,
      abandonReason: dossier.abandon_reason ?? null,
      policyVersionId: dossier.policy_version_id ?? null,
      createdBy: dossier.created_by,
      createdAt: new Date(dossier.created_at),
    };
  }

  private toWritingEntryPacketCreateInput(
    packet: PaperImplementationWritingEntryPacket,
  ): Prisma.PaperImplementationWritingEntryPacketCreateInput {
    return {
      id: packet.writing_entry_packet_id,
      implementationProjectId: packet.implementation_project_id,
      dossierId: packet.dossier_id,
      dossierVersion: packet.dossier_version,
      dossierHash: packet.dossier_hash,
      dossierStatus: packet.dossier_status,
      readinessGateResultId: packet.readiness_gate_result_id,
      traceManifestId: packet.trace_manifest_id,
      traceManifestRef: toJsonValue(packet.trace_manifest_ref),
      projectionPolicyVersionId: packet.projection_policy_version_id,
      packetStatus: packet.packet_status,
      writingTargetRef: packet.writing_target_ref
        ? toJsonValue(packet.writing_target_ref)
        : Prisma.JsonNull,
      writingTargetRefType: packet.writing_target_ref?.ref_type ?? null,
      writingTargetRefId: packet.writing_target_ref?.ref_id ?? null,
      writingTargetVersionId: packet.writing_target_ref?.version_id ?? null,
      packetPayload: toJsonValue(packet.packet_payload),
      createdBy: packet.created_by,
      createdAt: new Date(packet.created_at),
    };
  }
}
