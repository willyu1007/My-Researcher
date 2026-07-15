import type {
  PaperImplementationRuntimeAdmissionRecord as AdmissionRecordRow,
  PaperImplementationRuntimeArtifact as RuntimeArtifactRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import { AppError } from '../../errors/app-error.js';
import type {
  ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ListPaperImplementationRuntimeArtifactsFilter,
  PaperImplementationRuntimeRepository,
} from '../paper-implementation-runtime.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toRuntimeArtifact(row: RuntimeArtifactRow): PaperImplementationRuntimeArtifactEnvelope {
  return structuredClone(asRecord(row.envelope)) as unknown as PaperImplementationRuntimeArtifactEnvelope;
}

function toAdmissionRecord(row: AdmissionRecordRow): PaperImplementationRuntimeAdmissionRecord {
  return structuredClone(asRecord(row.recordPayload)) as unknown as PaperImplementationRuntimeAdmissionRecord;
}

function toDate(value: string): Date {
  return new Date(value);
}

function versionId(ref: { version_id?: string | null }): string | null {
  return ref.version_id ?? null;
}

function mapDuplicate(error: unknown, label: string, id: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
  }
  throw error;
}

export class PrismaPaperImplementationRuntimeRepository
implements PaperImplementationRuntimeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createRuntimeArtifact(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope> {
    try {
      const row = await this.prisma.paperImplementationRuntimeArtifact.create({
        data: this.toRuntimeArtifactCreateInput(artifact),
      });
      return toRuntimeArtifact(row);
    } catch (error) {
      // S2-C C2: the runtimeIdentityHash unique constraint turns an identity
      // replay (same run_id + same inputs) into a 409 VERSION_CONFLICT instead
      // of a silently forked row.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
        && /runtimeIdentityHash|pi_runtime_artifact_identity_idx/.test(JSON.stringify(error.meta?.target ?? ''))
      ) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `RuntimeArtifact with runtime_identity_hash ${artifact.runtime_identity_hash} already exists.`,
        );
      }
      mapDuplicate(error, 'RuntimeArtifact', artifact.runtime_artifact_id);
    }
  }

  async findRuntimeArtifactById(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope | null> {
    const row = await this.prisma.paperImplementationRuntimeArtifact.findFirst({
      where: {
        id: runtimeArtifactId,
        implementationProjectId,
      },
    });
    return row ? toRuntimeArtifact(row) : null;
  }

  async listRuntimeArtifacts(
    implementationProjectId: string,
    filter: ListPaperImplementationRuntimeArtifactsFilter = {},
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]> {
    const where: Prisma.PaperImplementationRuntimeArtifactWhereInput = {
      implementationProjectId,
      ...(filter.slot_id ? { slotId: filter.slot_id } : {}),
      ...(filter.artifact_scope ? { artifactScope: filter.artifact_scope } : {}),
      ...(filter.ref_id_prefix
        ? { artifactPayloadRef: { path: ['ref_id'], string_starts_with: filter.ref_id_prefix } }
        : {}),
    };
    const rows = await this.prisma.paperImplementationRuntimeArtifact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRuntimeArtifact);
  }

  async listFinalRuntimeArtifactsByFinalArtifactRef(
    implementationProjectId: string,
    refType: string,
    refId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]> {
    const rows = await this.prisma.paperImplementationRuntimeArtifact.findMany({
      where: {
        implementationProjectId,
        artifactScope: 'final',
        AND: [
          { finalArtifactRef: { path: ['ref_type'], equals: refType } },
          { finalArtifactRef: { path: ['ref_id'], equals: refId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRuntimeArtifact);
  }

  async createAdmissionRecord(
    record: PaperImplementationRuntimeAdmissionRecord,
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    try {
      const row = await this.prisma.paperImplementationRuntimeAdmissionRecord.create({
        data: this.toAdmissionRecordCreateInput(record),
      });
      return toAdmissionRecord(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.findAdmissionRecordByIdentityHash(
          record.implementation_project_id,
          record.admission_identity_hash,
        );
        if (existing) {
          return existing;
        }
      }
      mapDuplicate(error, 'RuntimeAdmissionRecord', record.admission_record_id);
    }
  }

  async findAdmissionRecordById(
    implementationProjectId: string,
    admissionRecordId: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null> {
    const row = await this.prisma.paperImplementationRuntimeAdmissionRecord.findFirst({
      where: {
        id: admissionRecordId,
        implementationProjectId,
      },
    });
    return row ? toAdmissionRecord(row) : null;
  }

  async findAdmissionRecordByIdentityHash(
    implementationProjectId: string,
    admissionIdentityHash: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null> {
    const row = await this.prisma.paperImplementationRuntimeAdmissionRecord.findFirst({
      where: {
        implementationProjectId,
        admissionIdentityHash,
      },
    });
    return row ? toAdmissionRecord(row) : null;
  }

  async listAdmissionRecords(
    implementationProjectId: string,
    filter: ListPaperImplementationRuntimeAdmissionRecordsFilter = {},
  ): Promise<PaperImplementationRuntimeAdmissionRecord[]> {
    const where: Prisma.PaperImplementationRuntimeAdmissionRecordWhereInput = {
      implementationProjectId,
      ...(filter.runtime_artifact_id ? { runtimeArtifactId: filter.runtime_artifact_id } : {}),
      ...(filter.runtime_artifact_ids ? { runtimeArtifactId: { in: filter.runtime_artifact_ids } } : {}),
      ...(filter.admission_scope ? { admissionScope: filter.admission_scope } : {}),
    };
    const rows = await this.prisma.paperImplementationRuntimeAdmissionRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdmissionRecord);
  }

  private toRuntimeArtifactCreateInput(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Prisma.PaperImplementationRuntimeArtifactCreateInput {
    return {
      id: artifact.runtime_artifact_id,
      artifactIdentityHash: artifact.artifact_identity_hash,
      runtimeIdentityHash: artifact.runtime_identity_hash,
      implementationProjectId: artifact.implementation_project_id,
      workflowType: artifact.workflow_type,
      slotId: artifact.slot_id,
      artifactScope: artifact.artifact_scope,
      artifactContractId: artifact.artifact_contract_id,
      artifactContractVersion: artifact.artifact_contract_version,
      targetRefType: artifact.target_ref.ref_type,
      targetRefId: artifact.target_ref.ref_id,
      targetVersionId: artifact.target_version_id,
      targetRef: toJsonValue(artifact.target_ref),
      inputSnapshotRef: toJsonValue(artifact.input_snapshot_ref),
      inputSnapshotHash: artifact.input_snapshot_hash,
      sourceHashBundleHash: artifact.source_hash_bundle_hash,
      createdBy: artifact.created_by,
      createdAt: toDate(artifact.created_at),
      roleSlotId: artifact.role_slot_id,
      callIndex: artifact.call_index,
      priorRoleArtifactRefs: toJsonValue(artifact.prior_role_artifact_refs),
      priorRoleArtifactHashes: artifact.prior_role_artifact_hashes,
      roleChainHash: artifact.role_chain_hash,
      finalArtifactRef: artifact.final_artifact_ref ? toJsonValue(artifact.final_artifact_ref) : undefined,
      finalArtifactHash: artifact.final_artifact_hash,
      runMode: artifact.run_mode,
      executionMode: artifact.execution_mode,
      executorKind: artifact.executor_kind,
      modelProfileId: artifact.model_profile_id,
      modelOptionId: artifact.model_option_id,
      runtimeStatus: artifact.runtime_status,
      runtimeFailureCode: artifact.runtime_failure_code,
      retryAttemptIndex: artifact.retry_attempt_index,
      providerCallCount: artifact.provider_call_count,
      responseReuseStatus: artifact.response_reuse_status,
      responseReuseDecisionRef: artifact.response_reuse_decision_ref
        ? toJsonValue(artifact.response_reuse_decision_ref)
        : undefined,
      responseReuseDecisionHash: artifact.response_reuse_decision_hash,
      allowedSideEffects: artifact.allowed_side_effects,
      retrievalPacketRef: artifact.retrieval_packet_ref ? toJsonValue(artifact.retrieval_packet_ref) : undefined,
      retrievalPacketHash: artifact.retrieval_packet_hash,
      reviewedStatementPacketRef: artifact.reviewed_statement_packet_ref
        ? toJsonValue(artifact.reviewed_statement_packet_ref)
        : undefined,
      reviewedStatementPacketHash: artifact.reviewed_statement_packet_hash,
      contextPacketRef: toJsonValue(artifact.context_packet_ref),
      contextPacketHash: artifact.context_packet_hash,
      runtimeInvocationContextHash: artifact.runtime_invocation_context_hash,
      contextPolicyProfileHash: artifact.context_policy_profile_hash,
      cachePolicyProfileHash: artifact.cache_policy_profile_hash,
      sourceRefs: toJsonValue(artifact.source_refs),
      sourceHashes: artifact.source_hashes,
      promptPacketRef: toJsonValue(artifact.prompt_packet_ref),
      promptPacketHash: artifact.prompt_packet_hash,
      promptTemplateId: artifact.prompt_template_id,
      promptTemplateVersionId: artifact.prompt_template_version_id,
      promptVariantId: artifact.prompt_variant_id,
      promptRedactionPolicyHash: artifact.prompt_redaction_policy_hash,
      outputSchemaId: artifact.output_schema_id,
      contextCacheKeyHash: artifact.context_cache_key_hash,
      contextCacheStatus: artifact.context_cache_status,
      contextCacheResultRef: artifact.context_cache_result_ref
        ? toJsonValue(artifact.context_cache_result_ref)
        : undefined,
      contextCacheResultHash: artifact.context_cache_result_hash,
      promptPacketCacheKeyHash: artifact.prompt_packet_cache_key_hash,
      promptPacketCacheStatus: artifact.prompt_packet_cache_status,
      promptPacketCacheResultRef: artifact.prompt_packet_cache_result_ref
        ? toJsonValue(artifact.prompt_packet_cache_result_ref)
        : undefined,
      promptPacketCacheResultHash: artifact.prompt_packet_cache_result_hash,
      tokenBudgetGateResultRef: toJsonValue(artifact.token_budget_gate_result_ref),
      tokenBudgetGateResultHash: artifact.token_budget_gate_result_hash,
      compressionPolicyProfileHash: artifact.compression_policy_profile_hash,
      compressionStatus: artifact.compression_status,
      compressionReportRef: artifact.compression_report_ref ? toJsonValue(artifact.compression_report_ref) : undefined,
      compressionReportHash: artifact.compression_report_hash,
      compressedContextPacketRef: artifact.compressed_context_packet_ref
        ? toJsonValue(artifact.compressed_context_packet_ref)
        : undefined,
      compressedContextPacketHash: artifact.compressed_context_packet_hash,
      artifactPayloadRef: toJsonValue(artifact.artifact_payload_ref),
      artifactPayloadHash: artifact.artifact_payload_hash,
      outputHash: artifact.output_hash,
      runtimeAuditRef: toJsonValue(artifact.runtime_audit_ref),
      runtimeAuditHash: artifact.runtime_audit_hash,
      blockerCodes: artifact.blocker_codes,
      warningCodes: artifact.warning_codes,
      envelope: toJsonValue(artifact),
    };
  }

  private toAdmissionRecordCreateInput(
    record: PaperImplementationRuntimeAdmissionRecord,
  ): Prisma.PaperImplementationRuntimeAdmissionRecordCreateInput {
    return {
      id: record.admission_record_id,
      implementationProjectId: record.implementation_project_id,
      workflowType: record.workflow_type,
      slotId: record.slot_id,
      admissionScope: record.admission_scope,
      admissionPolicyId: record.admission_policy_id,
      admissionPolicyVersion: record.admission_policy_version,
      runtimeArtifactRef: toJsonValue(record.runtime_artifact_ref),
      runtimeArtifactHash: record.runtime_artifact_hash,
      runtimeArtifactId: record.runtime_artifact_id,
      artifactContractId: record.artifact_contract_id,
      targetRefType: record.target_ref.ref_type,
      targetRefId: record.target_ref.ref_id,
      targetVersionId: versionId(record.target_ref),
      targetRef: toJsonValue(record.target_ref),
      createdAt: toDate(record.created_at),
      expectedRuntimeIdentityHash: record.expected_runtime_identity_hash,
      expectedSourceHashBundleHash: record.expected_source_hash_bundle_hash,
      expectedRetrievalPacketHash: record.expected_retrieval_packet_hash,
      expectedPromptPacketHash: record.expected_prompt_packet_hash,
      expectedOutputSchemaId: record.expected_output_schema_id,
      expectedPriorRoleArtifactHashes: record.expected_prior_role_artifact_hashes,
      expectedFinalArtifactHash: record.expected_final_artifact_hash,
      observedRuntimeIdentityHash: record.observed_runtime_identity_hash,
      observedSourceHashBundleHash: record.observed_source_hash_bundle_hash,
      observedRetrievalPacketHash: record.observed_retrieval_packet_hash,
      observedPromptPacketHash: record.observed_prompt_packet_hash,
      observedOutputSchemaId: record.observed_output_schema_id,
      observedPriorRoleArtifactHashes: record.observed_prior_role_artifact_hashes,
      observedOutputHash: record.observed_output_hash,
      admissionStatus: record.admission_status,
      admissionIdentity: toJsonValue(record.admission_identity),
      admissionIdentityHash: record.admission_identity_hash,
      admittedArtifactRef: record.admitted_artifact_ref ? toJsonValue(record.admitted_artifact_ref) : undefined,
      admittedArtifactHash: record.admitted_artifact_hash,
      issueCodes: record.issue_codes,
      warningCodes: record.warning_codes,
      recordPayload: toJsonValue(record),
    };
  }
}
