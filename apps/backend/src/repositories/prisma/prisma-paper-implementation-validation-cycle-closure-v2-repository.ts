import { createHash } from 'node:crypto';

import {
  Prisma,
  type PaperImplementationValidationCycleClosureV2 as ClosureRow,
  type PrismaClient,
} from '@prisma/client';
import { Ajv } from 'ajv';
import {
  scientificValidationReportV2Schema,
  type ScientificComparisonFactV1,
  type ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  experimentFoundationV2EvaluationProtocolRevisionContentV2Schema,
  type ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
  paperImplementationRuntimeAdmissionRecordSchema,
  paperImplementationRuntimeArtifactEnvelopeSchema,
  paperImplementationResultAnalysisScientificClosureArtifactSchema,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationResultAnalysisScientificClosureArtifact,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  SCIENTIFIC_DISPOSITIONS_V2,
  VALIDATION_CYCLE_CLOSURE_KINDS_V2,
  validationCycleClosureWatermarkV2Schema,
  type ScientificDispositionV2,
  type ValidationCycleClosureKindV2,
  type ValidationCycleClosureScientificAuthorityV1,
  type ValidationCycleClosureV2,
  type ValidationCycleClosureWatermarkV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashPaperImplementationV2CycleClosure,
  serverHashPaperImplementationV2ClosureWatermark,
  serverHashExperimentFoundationScientificComparisonFactV1,
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashPaperImplementationV2RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  PaperImplementationCycleReadinessV2HeadReference,
} from '../paper-implementation-cycle-readiness-v2.repository.js';
import {
  assertValidationCycleClosureCommit,
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationStoredValidationCycleClosureV2,
  type PaperImplementationAdmittedScientificClosureProposalV1,
  type PaperImplementationScientificClosureEvidenceAuthorityV1,
  type PaperImplementationValidationCycleClosureCommitV2,
  type PaperImplementationValidationCycleProductCompletionV2,
  type PaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationValidationCycleClosureV2Transaction,
} from '../paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from './prisma-paper-implementation-cycle-readiness-v2-repository.js';

const ajv = new Ajv({ allErrors: true, strict: false });
const watermarkValidator = ajv.compile<ValidationCycleClosureWatermarkV2>(
  validationCycleClosureWatermarkV2Schema,
);
const scientificProposalArtifactValidator = ajv.compile<
  PaperImplementationResultAnalysisScientificClosureArtifact
>(paperImplementationResultAnalysisScientificClosureArtifactSchema);
const runtimeArtifactEnvelopeValidator = ajv.compile<PaperImplementationRuntimeArtifactEnvelope>(
  paperImplementationRuntimeArtifactEnvelopeSchema,
);
const runtimeAdmissionRecordValidator = ajv.compile<PaperImplementationRuntimeAdmissionRecord>(
  paperImplementationRuntimeAdmissionRecordSchema,
);
const scientificValidationReportValidator = ajv.compile<ScientificValidationReportV2>(
  scientificValidationReportV2Schema,
);
const scientificProtocolValidator = ajv.compile<
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2
>(experimentFoundationV2EvaluationProtocolRevisionContentV2Schema);

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class PrismaPaperImplementationValidationCycleClosureV2Repository
implements PaperImplementationValidationCycleClosureV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async isCycleClosed(validationCycleId: string): Promise<boolean> {
    const row = await this.prisma.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId },
      select: { id: true },
    });
    return row !== null;
  }

  async withTransaction<T>(
    operation: (transaction: PaperImplementationValidationCycleClosureV2Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => operation(new PrismaClosureTransaction(transaction)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}

class PrismaClosureTransaction
implements PaperImplementationValidationCycleClosureV2Transaction {
  private readonly readiness: PrismaPaperImplementationCycleReadinessV2Repository;

  constructor(private readonly transaction: Prisma.TransactionClient) {
    this.readiness = new PrismaPaperImplementationCycleReadinessV2Repository(transaction);
  }

  findValidationCycle(validationCycleId: string) {
    return this.readiness.findValidationCycle(validationCycleId);
  }

  listAdmittedBranches(validationCycleId: string) {
    return this.readiness.listAdmittedBranches(validationCycleId);
  }

  listHeadRunAccounting(references: readonly PaperImplementationCycleReadinessV2HeadReference[]) {
    return this.readiness.listHeadRunAccounting(references);
  }

  listCycleActiveRealAttempts(validationCycleId: string) {
    return this.readiness.listCycleActiveRealAttempts(validationCycleId);
  }

  listEligibleRunEvidenceUnits(validationCycleId: string) {
    return this.readiness.listEligibleRunEvidenceUnits(validationCycleId);
  }

  findCycleClosure(validationCycleId: string) {
    return this.readiness.findCycleClosure(validationCycleId);
  }

  async findStoredClosureByCycle(validationCycleId: string) {
    const row = await this.transaction.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId },
    });
    return row ? mapStoredClosure(row) : null;
  }

  async findStoredClosureByIdempotencyKey(idempotencyKey: string) {
    const row = await this.transaction.paperImplementationValidationCycleClosureV2.findUnique({
      where: { idempotencyKey },
    });
    return row ? mapStoredClosure(row) : null;
  }

  async findAdmittedScientificClosureProposal(
    proposalId: string,
    expectedProposalHash: string,
  ): Promise<PaperImplementationAdmittedScientificClosureProposalV1 | null> {
    const artifact = await this.transaction.paperImplementationRuntimeArtifact.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        artifactIdentityHash: true,
        runtimeIdentityHash: true,
        implementationProjectId: true,
        workflowType: true,
        slotId: true,
        artifactScope: true,
        artifactContractId: true,
        targetRefType: true,
        targetRefId: true,
        targetVersionId: true,
        sourceHashBundleHash: true,
        retrievalPacketHash: true,
        promptPacketHash: true,
        priorRoleArtifactHashes: true,
        runMode: true,
        executionMode: true,
        runtimeStatus: true,
        outputSchemaId: true,
        outputHash: true,
        finalArtifactHash: true,
        artifactPayloadHash: true,
        envelope: true,
      },
    });
    if (!artifact || artifact.finalArtifactHash !== expectedProposalHash) return null;
    if (!runtimeArtifactEnvelopeValidator(artifact.envelope)) return null;
    const envelope = structuredClone(
      artifact.envelope,
    ) as PaperImplementationRuntimeArtifactEnvelope;
    const { artifact_identity_hash: artifactIdentityHash, ...identityInput } = envelope;
    const rawPayload = envelope.artifact_payload;
    if (
      artifactIdentityHash !== stableSha256(identityInput)
      || artifact.artifactIdentityHash !== artifactIdentityHash
      || artifact.id !== envelope.runtime_artifact_id
      || artifact.runtimeIdentityHash !== envelope.runtime_identity_hash
      || artifact.implementationProjectId !== envelope.implementation_project_id
      || artifact.workflowType !== 'result_analysis'
      || artifact.workflowType !== envelope.workflow_type
      || artifact.slotId !== PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID
      || artifact.slotId !== envelope.slot_id
      || artifact.artifactScope !== 'final'
      || artifact.artifactScope !== envelope.artifact_scope
      || artifact.artifactContractId !== envelope.artifact_contract_id
      || artifact.targetRefType !== envelope.target_ref.ref_type
      || artifact.targetRefId !== envelope.target_ref.ref_id
      || artifact.targetVersionId !== (envelope.target_version_id ?? null)
      || artifact.sourceHashBundleHash !== envelope.source_hash_bundle_hash
      || artifact.retrievalPacketHash !== envelope.retrieval_packet_hash
      || artifact.promptPacketHash !== envelope.prompt_packet_hash
      || !equalStrings(artifact.priorRoleArtifactHashes, envelope.prior_role_artifact_hashes)
      || artifact.runMode !== 'product'
      || artifact.runMode !== envelope.run_mode
      || artifact.executionMode !== 'provider_llm'
      || artifact.executionMode !== envelope.execution_mode
      || artifact.runtimeStatus !== 'passed'
      || artifact.runtimeStatus !== envelope.runtime_status
      || artifact.outputSchemaId
        !== PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID
      || artifact.outputSchemaId !== envelope.output_schema_id
      || artifact.outputHash !== envelope.output_hash
      || artifact.finalArtifactHash !== envelope.final_artifact_hash
      || artifact.artifactPayloadHash !== expectedProposalHash
      || artifact.artifactPayloadHash !== envelope.artifact_payload_hash
      || !scientificProposalArtifactValidator(rawPayload)
    ) {
      return null;
    }
    const payload = rawPayload;
    const proposal = payload.scientific_closure_proposal;
    if (
      !proposal
      || stableSha256(payload) !== expectedProposalHash
      || artifact.targetRefId !== proposal.validation_cycle_id
      || !isValidationCycleRefType(artifact.targetRefType)
    ) {
      return null;
    }
    const admissions = await this.transaction.paperImplementationRuntimeAdmissionRecord.findMany({
      where: {
        runtimeArtifactId: proposalId,
        admissionScope: 'final',
        admissionStatus: 'admitted',
        expectedOutputSchemaId:
          PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
        observedOutputSchemaId:
          PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
        expectedFinalArtifactHash: expectedProposalHash,
        admittedArtifactHash: expectedProposalHash,
        admissionPolicyId:
          `paper-implementation.${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID}.final-admission`,
        admissionPolicyVersion: 'v1',
      },
      select: {
        id: true,
        createdAt: true,
        admissionScope: true,
        admissionPolicyId: true,
        admissionPolicyVersion: true,
        admissionIdentityHash: true,
        admissionIdentity: true,
        recordPayload: true,
        implementationProjectId: true,
        workflowType: true,
        slotId: true,
        runtimeArtifactRef: true,
        runtimeArtifactHash: true,
        runtimeArtifactId: true,
        artifactContractId: true,
        targetRefType: true,
        targetRefId: true,
        targetVersionId: true,
        targetRef: true,
        expectedRuntimeIdentityHash: true,
        observedRuntimeIdentityHash: true,
        expectedSourceHashBundleHash: true,
        observedSourceHashBundleHash: true,
        expectedRetrievalPacketHash: true,
        observedRetrievalPacketHash: true,
        expectedPromptPacketHash: true,
        observedPromptPacketHash: true,
        expectedOutputSchemaId: true,
        observedOutputSchemaId: true,
        expectedPriorRoleArtifactHashes: true,
        observedPriorRoleArtifactHashes: true,
        expectedFinalArtifactHash: true,
        observedOutputHash: true,
        admissionStatus: true,
        admittedArtifactRef: true,
        admittedArtifactHash: true,
        issueCodes: true,
        warningCodes: true,
      },
    });
    const admission = admissions[0];
    if (!admission || !runtimeAdmissionRecordValidator(admission.recordPayload)) return null;
    const admissionRecord = structuredClone(
      admission.recordPayload,
    ) as PaperImplementationRuntimeAdmissionRecord;
    const officialAdmissionPolicyId =
      `paper-implementation.${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID}.final-admission`;
    const expectedRuntimeArtifactRef = {
      ref_type: 'paper_implementation_runtime_artifact',
      ref_id: envelope.runtime_artifact_id,
      title_card_id: envelope.target_ref.title_card_id ?? null,
    };
    const expectedAdmissionIdentity = {
      admission_scope: 'final',
      admission_policy_id: officialAdmissionPolicyId,
      admission_policy_version: 'v1',
      runtime_artifact_id: envelope.runtime_artifact_id,
      runtime_artifact_hash: envelope.artifact_identity_hash,
      artifact_scope: envelope.artifact_scope,
      workflow_type: envelope.workflow_type,
      slot_id: envelope.slot_id,
      artifact_contract_id: envelope.artifact_contract_id,
      target_ref: envelope.target_ref,
      runtime_status: envelope.runtime_status,
      runtime_failure_code: envelope.runtime_failure_code,
      blocker_codes: envelope.blocker_codes,
      runtime_identity_hash: envelope.runtime_identity_hash,
      source_hash_bundle_hash: envelope.source_hash_bundle_hash,
      retrieval_packet_hash: envelope.retrieval_packet_hash,
      prompt_packet_hash: envelope.prompt_packet_hash,
      output_schema_id: envelope.output_schema_id,
      prior_role_artifact_hashes: envelope.prior_role_artifact_hashes,
      final_artifact_hash: envelope.final_artifact_hash,
      output_hash: envelope.output_hash,
    };
    const expectedAdmissionIdentityHash = stableSha256(expectedAdmissionIdentity);
    if (
      admissions.length !== 1
      || admission.id !== admissionRecord.admission_record_id
      || admission.createdAt.toISOString() !== admissionRecord.created_at
      || admission.admissionScope !== 'final'
      || admission.admissionScope !== admissionRecord.admission_scope
      || admission.admissionPolicyId !== officialAdmissionPolicyId
      || admission.admissionPolicyId !== admissionRecord.admission_policy_id
      || admission.admissionPolicyVersion !== 'v1'
      || admission.admissionPolicyVersion !== admissionRecord.admission_policy_version
      || admission.admissionIdentityHash !== expectedAdmissionIdentityHash
      || admission.admissionIdentityHash !== admissionRecord.admission_identity_hash
      || admissionRecord.admission_identity_hash !== expectedAdmissionIdentityHash
      || !equalJson(admission.admissionIdentity, expectedAdmissionIdentity)
      || !equalJson(admission.admissionIdentity, admissionRecord.admission_identity)
      || !equalJson(admissionRecord.admission_identity, expectedAdmissionIdentity)
      || admissionRecord.admission_policy_id !== officialAdmissionPolicyId
      || admissionRecord.admission_policy_version !== 'v1'
      || admissionRecord.admission_scope !== 'final'
      || admissionRecord.admission_status !== 'admitted'
      || admission.admissionStatus !== 'admitted'
      || admission.admissionStatus !== admissionRecord.admission_status
      || admissionRecord.runtime_artifact_id !== envelope.runtime_artifact_id
      || admission.runtimeArtifactId !== envelope.runtime_artifact_id
      || admission.runtimeArtifactId !== admissionRecord.runtime_artifact_id
      || !equalJson(admission.runtimeArtifactRef, expectedRuntimeArtifactRef)
      || !equalJson(admission.runtimeArtifactRef, admissionRecord.runtime_artifact_ref)
      || !equalJson(admissionRecord.runtime_artifact_ref, expectedRuntimeArtifactRef)
      || admissionRecord.runtime_artifact_hash !== envelope.artifact_identity_hash
      || admissionRecord.admitted_artifact_hash !== expectedProposalHash
      || admission.implementationProjectId !== envelope.implementation_project_id
      || admission.implementationProjectId !== admissionRecord.implementation_project_id
      || admission.workflowType !== envelope.workflow_type
      || admission.workflowType !== admissionRecord.workflow_type
      || admission.slotId !== envelope.slot_id
      || admission.slotId !== admissionRecord.slot_id
      || admission.runtimeArtifactHash !== envelope.artifact_identity_hash
      || admission.artifactContractId !== envelope.artifact_contract_id
      || admission.artifactContractId !== admissionRecord.artifact_contract_id
      || admission.targetRefType !== envelope.target_ref.ref_type
      || admission.targetRefType !== admissionRecord.target_ref.ref_type
      || admission.targetRefId !== envelope.target_ref.ref_id
      || admission.targetRefId !== admissionRecord.target_ref.ref_id
      || admission.targetVersionId !== (envelope.target_ref.version_id ?? null)
      || admission.targetVersionId !== (admissionRecord.target_ref.version_id ?? null)
      || !equalJson(admission.targetRef, envelope.target_ref)
      || !equalJson(admission.targetRef, admissionRecord.target_ref)
      || !equalJson(admissionRecord.target_ref, envelope.target_ref)
      || admission.expectedRuntimeIdentityHash !== envelope.runtime_identity_hash
      || admission.expectedRuntimeIdentityHash
        !== admissionRecord.expected_runtime_identity_hash
      || admission.observedRuntimeIdentityHash !== envelope.runtime_identity_hash
      || admission.observedRuntimeIdentityHash
        !== admissionRecord.observed_runtime_identity_hash
      || admission.expectedSourceHashBundleHash !== envelope.source_hash_bundle_hash
      || admission.expectedSourceHashBundleHash
        !== admissionRecord.expected_source_hash_bundle_hash
      || admission.observedSourceHashBundleHash !== envelope.source_hash_bundle_hash
      || admission.observedSourceHashBundleHash
        !== admissionRecord.observed_source_hash_bundle_hash
      || admission.expectedRetrievalPacketHash !== envelope.retrieval_packet_hash
      || admission.expectedRetrievalPacketHash
        !== admissionRecord.expected_retrieval_packet_hash
      || admission.observedRetrievalPacketHash !== envelope.retrieval_packet_hash
      || admission.observedRetrievalPacketHash
        !== admissionRecord.observed_retrieval_packet_hash
      || admission.expectedPromptPacketHash !== envelope.prompt_packet_hash
      || admission.expectedPromptPacketHash !== admissionRecord.expected_prompt_packet_hash
      || admission.observedPromptPacketHash !== envelope.prompt_packet_hash
      || admission.observedPromptPacketHash !== admissionRecord.observed_prompt_packet_hash
      || admission.expectedOutputSchemaId !== envelope.output_schema_id
      || admission.expectedOutputSchemaId !== admissionRecord.expected_output_schema_id
      || admission.observedOutputSchemaId !== envelope.output_schema_id
      || admission.observedOutputSchemaId !== admissionRecord.observed_output_schema_id
      || !equalStrings(
        admission.expectedPriorRoleArtifactHashes,
        envelope.prior_role_artifact_hashes,
      )
      || !equalStrings(
        admission.expectedPriorRoleArtifactHashes,
        admissionRecord.expected_prior_role_artifact_hashes,
      )
      || !equalStrings(
        admission.observedPriorRoleArtifactHashes,
        envelope.prior_role_artifact_hashes,
      )
      || !equalStrings(
        admission.observedPriorRoleArtifactHashes,
        admissionRecord.observed_prior_role_artifact_hashes,
      )
      || admission.expectedFinalArtifactHash !== expectedProposalHash
      || admission.expectedFinalArtifactHash !== admissionRecord.expected_final_artifact_hash
      || admission.observedOutputHash !== envelope.output_hash
      || admission.observedOutputHash !== admissionRecord.observed_output_hash
      || !equalJson(admission.admittedArtifactRef, envelope.final_artifact_ref)
      || !equalJson(admission.admittedArtifactRef, admissionRecord.admitted_artifact_ref)
      || !equalJson(admissionRecord.admitted_artifact_ref, envelope.final_artifact_ref)
      || admission.admittedArtifactHash !== expectedProposalHash
      || admission.admittedArtifactHash !== admissionRecord.admitted_artifact_hash
      || admission.issueCodes.length !== 0
      || admissionRecord.issue_codes.length !== 0
      || !equalStrings(admission.issueCodes, admissionRecord.issue_codes)
      || !equalStrings(admission.warningCodes, envelope.warning_codes)
      || !equalStrings(admission.warningCodes, admissionRecord.warning_codes)
      || !equalStrings(admissionRecord.warning_codes, envelope.warning_codes)
    ) return null;
    return {
      proposal_id: artifact.id,
      proposal_hash: expectedProposalHash,
      implementation_project_id: artifact.implementationProjectId,
      proposal: structuredClone(proposal),
    };
  }

  async listScientificClosureEvidenceAuthorities(
    evidenceRefs: readonly { run_evidence_unit_id: string; content_hash: string }[],
  ): Promise<PaperImplementationScientificClosureEvidenceAuthorityV1[]> {
    const evidenceIds = evidenceRefs.map((ref) => ref.run_evidence_unit_id);
    if (new Set(evidenceIds).size !== evidenceIds.length) return [];
    const evidenceRows = await this.transaction.paperImplementationRunEvidenceUnitV2.findMany({
      where: { id: { in: evidenceIds } },
    });
    const evidenceById = new Map(evidenceRows.map((evidence) => [evidence.id, evidence]));
    const selectedEvidence = evidenceRefs.flatMap((ref) => {
      const evidence = evidenceById.get(ref.run_evidence_unit_id);
      if (!evidence || evidence.contentHash !== ref.content_hash) return [];
      if (evidence.schemaVersion !== 'v1') return [];
      const { content_hash: _storedHash, ...canonicalEvidence } = {
        run_evidence_unit_id: evidence.id,
        schema_version: 'v1' as const,
        implementation_project_id: evidence.implementationProjectId,
        validation_cycle_id: evidence.validationCycleId,
        branch_id: evidence.branchId,
        work_order_revision_id: evidence.workOrderRevisionId,
        work_order_revision_hash: evidence.workOrderRevisionHash,
        branch_revision_sequence: evidence.branchRevisionSequence,
        run_id: evidence.runId,
        run_manifest_hash: evidence.runManifestHash,
        evidence_candidate_id: evidence.evidenceCandidateId,
        evidence_candidate_content_hash: evidence.evidenceCandidateContentHash,
        validation_report_id: evidence.validationReportId,
        validation_hash: evidence.validationHash,
        evaluation_protocol_revision_id: evidence.evaluationProtocolRevisionId,
        evaluation_protocol_content_hash: evidence.evaluationProtocolContentHash,
        content_hash: evidence.contentHash,
      };
      if (
        serverHashPaperImplementationV2RunEvidenceUnit(canonicalEvidence)
          !== evidence.contentHash
      ) return [];
      return [evidence];
    });
    if (selectedEvidence.length !== evidenceRefs.length) return [];
    const [reportRows, protocolRows] = await Promise.all([
      this.transaction.experimentFoundationScientificValidationReportV2.findMany({
        where: { id: { in: selectedEvidence.map((evidence) => evidence.validationReportId) } },
      }),
      this.transaction.experimentFoundationEvaluationProtocolRevisionV2.findMany({
        where: {
          id: { in: selectedEvidence.map((evidence) => evidence.evaluationProtocolRevisionId) },
        },
      }),
    ]);
    const reportById = new Map(reportRows.map((report) => [report.id, report]));
    const protocolById = new Map(protocolRows.map((protocol) => [protocol.id, protocol]));
    return selectedEvidence.flatMap((evidence) => {
      const reportRow = reportById.get(evidence.validationReportId);
      const protocolRow = protocolById.get(evidence.evaluationProtocolRevisionId);
      if (!reportRow || !protocolRow) return [];
      const report = parseScientificValidationReport(reportRow.reportSnapshotJson);
      const protocol = parseScientificProtocol(protocolRow.evaluationProtocolSnapshotJson);
      const scientificContract = protocol.scientific_contract;
      if (
        evidence.validationHash !== report.validation_hash
        || evidence.validationReportId !== report.report_id
        || evidence.runId !== report.run_id
        || reportRow.runId !== report.run_id
        || reportRow.runManifestHash !== report.run_manifest_hash
        || reportRow.evaluationProtocolId !== report.evaluation_protocol.logical_id
        || reportRow.evaluationProtocolRevisionId !== report.evaluation_protocol.revision_id
        || reportRow.evaluationProtocolRevisionSequence
          !== report.evaluation_protocol.revision_sequence
        || reportRow.evaluationProtocolContentHash !== report.evaluation_protocol.content_hash
        || reportRow.validatorProfileVersion !== report.validator_profile_version
        || reportRow.validatorProfileHash !== report.validator_profile_hash
        || reportRow.status !== report.status
        || reportRow.schemaVersion !== report.schema_version
        || reportRow.orderedCellResultCount !== report.ordered_cell_results.length
        || reportRow.orderedRuleResultCount !== report.ordered_rule_results.length
        || reportRow.validationHash !== report.validation_hash
        || evidence.evaluationProtocolRevisionId !== report.evaluation_protocol.revision_id
        || evidence.evaluationProtocolContentHash !== report.evaluation_protocol.content_hash
        || protocolRow.evaluationProtocolId !== report.evaluation_protocol.logical_id
        || protocolRow.revisionSequence !== report.evaluation_protocol.revision_sequence
        || protocolRow.contentHash !== report.evaluation_protocol.content_hash
        || protocolRow.schemaVersion !== 'v2'
        || protocolRow.contentHash !== serverHashExperimentFoundationV2AssetRevision({
          asset_type: 'EvaluationProtocol',
          content: protocol,
        })
        || !scientificContract?.primary_comparison_key
        || !scientificContract.decision_if_positive
        || !scientificContract.decision_if_negative
        || !scientificContract.decision_if_inconclusive
      ) {
        return [];
      }
      const primaryFacts = (report.ordered_comparison_results ?? [])
        .flatMap((result) => (
          result.status === 'passed'
          && result.comparison_key === scientificContract.primary_comparison_key
          && result.fact
          && isCanonicalComparisonFact(result.fact)
            ? [result.fact]
            : []
        ));
      return [{
        run_evidence_unit_id: evidence.id,
        content_hash: evidence.contentHash,
        validation_report_id: report.report_id,
        validation_hash: report.validation_hash,
        evaluation_protocol_revision_id: report.evaluation_protocol.revision_id,
        evaluation_protocol_content_hash: report.evaluation_protocol.content_hash,
        primary_comparison_key: scientificContract.primary_comparison_key,
        decision_if_positive: scientificContract.decision_if_positive,
        decision_if_negative: scientificContract.decision_if_negative,
        decision_if_inconclusive: scientificContract.decision_if_inconclusive,
        validation_report: report,
        evaluation_protocol: protocol,
        primary_facts: primaryFacts.map((fact) => ({
          comparison_fact_id: fact.comparison_fact_id,
          comparison_fact_hash: fact.comparison_fact_hash,
          comparison_key: fact.comparison_key,
          registered_relation: fact.registered_relation,
        })),
      }];
    });
  }

  async completeProductValidationCycle(
    input: PaperImplementationValidationCycleProductCompletionV2,
  ): Promise<void> {
    const completedAt = new Date(input.completed_at);
    const result = await this.transaction.paperImplementationValidationCycle.updateMany({
      where: {
        id: input.validation_cycle_id,
        cycleStatus: input.expected_lifecycle_status,
        completedAt: null,
      },
      data: {
        cycleStatus: input.lifecycle_status,
        executionStatus: input.execution_status,
        updatedAt: completedAt,
        completedAt,
      },
    });
    if (result.count === 1) return;

    const current = await this.transaction.paperImplementationValidationCycle.findUnique({
      where: { id: input.validation_cycle_id },
      select: { cycleStatus: true },
    });
    if (
      current?.cycleStatus === 'completed'
      || current?.cycleStatus === 'aborted'
      || current?.cycleStatus === 'superseded'
    ) {
      throw new PaperImplementationValidationCycleClosureV2RepositoryError(
        'CYCLE_ALREADY_CLOSED',
        `ValidationCycle product row is already terminal: ${input.validation_cycle_id}`,
      );
    }
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_CONCURRENT_CONFLICT',
      `ValidationCycle product row changed during closure: ${input.validation_cycle_id}`,
    );
  }

  async commitClosure(input: PaperImplementationValidationCycleClosureCommitV2) {
    assertValidationCycleClosureCommit(input);
    const stored = input.stored_closure;
    const closure = stored.closure;
    const event = input.outbox.event;
    await this.transaction.paperImplementationValidationCycleClosureV2.create({
      data: {
        id: closure.closure_id,
        schemaVersion: closure.schema_version,
        validationCycleId: closure.validation_cycle_id,
        implementationProjectId: stored.implementation_project_id,
        cycleVersionAtClosure: closure.cycle_version_at_closure,
        closureKind: closure.closure_kind,
        scientificDisposition: closure.scientific_disposition,
        selectedExitKey: closure.selected_exit_key,
        acceptedProposalId: closure.accepted_proposal_id,
        acceptedProposalHash: closure.accepted_proposal_hash,
        orderedBranchCount: closure.closure_watermark.ordered_branches.length,
        closureWatermarkJson: jsonInput({
          closure_watermark: closure.closure_watermark,
          scientific_authority: closure.scientific_authority,
        }),
        closureInputHash: closure.closure_watermark.closure_input_hash,
        closureSnapshotHash: closure.closure_snapshot_hash,
        idempotencyKey: stored.idempotency_key,
        createdAt: new Date(stored.created_at),
      },
    });
    await this.transaction.paperImplementationExperimentIntegrationOutboxV2.create({
      data: {
        id: input.outbox.outbox_id,
        eventId: event.event_id,
        aggregateType: 'PaperImplementationValidationCycleClosureV2',
        aggregateId: closure.closure_id,
        transitionKey: input.outbox.aggregate_transition_key,
        eventType: event.event_type,
        schemaVersion: event.schema_version,
        producerDomain: event.producer_domain,
        occurredAt: new Date(event.occurred_at),
        correlationId: event.correlation_id,
        causationId: event.causation_id,
        businessIdempotencyKey: event.business_idempotency_key,
        implementationProjectId: stored.implementation_project_id,
        validationCycleId: closure.validation_cycle_id,
        // The Pack A PI outbox has non-null branch/revision mirrors. Closure
        // is Cycle-wide, so these slots carry explicit closure authority rather
        // than selecting one branch from the multi-branch watermark.
        branchId: `validation-cycle:${closure.validation_cycle_id}`,
        branchKey: 'validation-cycle-closure-v2',
        workOrderRevisionId: closure.closure_id,
        // The PI outbox mirror requires a positive sequence
        // (pi_ei_outbox_sequence_attempt_check); the Cycle-wide closure mirror
        // carries the 1-based closure ordinal over the 0-based cycle version.
        revisionSequence: closure.cycle_version_at_closure + 1,
        workOrderRevisionHash: closure.closure_snapshot_hash,
        cellPlanHash: closure.closure_watermark.closure_input_hash,
        approvedPlanHash: closure.closure_snapshot_hash,
        runId: null,
        runManifestHash: null,
        eventPayloadJson: jsonInput(event.payload),
        payloadHash: event.payload_hash,
        eventEnvelopeHash: input.outbox.event_envelope_hash,
        relayStatus: 'pending',
        relayAttemptCount: 0,
        createdAt: new Date(input.outbox.created_at),
        updatedAt: new Date(input.outbox.created_at),
      },
    });
    return stored;
  }
}

function parseStoredClosureAuthority(value: unknown): {
  closure_watermark: unknown;
  scientific_authority: ValidationCycleClosureScientificAuthorityV1 | null;
} {
  if (watermarkValidator(value)) {
    return { closure_watermark: structuredClone(value), scientific_authority: null };
  }
  if (!isRecord(value) || !('closure_watermark' in value)) {
    return { closure_watermark: value, scientific_authority: null };
  }
  const authority = value.scientific_authority;
  return {
    closure_watermark: value.closure_watermark,
    scientific_authority: isScientificAuthority(authority)
      ? structuredClone(authority)
      : null,
  };
}

function mapStoredClosure(row: ClosureRow): PaperImplementationStoredValidationCycleClosureV2 {
  const storedAuthority = parseStoredClosureAuthority(row.closureWatermarkJson);
  if (
    row.schemaVersion !== 'v1'
    || !isClosureKind(row.closureKind)
    || !isScientificDispositionOrNull(row.scientificDisposition)
    || !watermarkValidator(storedAuthority.closure_watermark)
  ) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      `Stored Cycle closure watermark is invalid: ${row.id}`,
    );
  }
  const watermark = structuredClone(storedAuthority.closure_watermark);
  const closure: ValidationCycleClosureV2 = {
    closure_id: row.id,
    schema_version: 'v1',
    validation_cycle_id: row.validationCycleId,
    cycle_version_at_closure: row.cycleVersionAtClosure,
    closure_kind: row.closureKind,
    scientific_disposition: row.scientificDisposition,
    selected_exit_key: row.selectedExitKey,
    accepted_proposal_id: row.acceptedProposalId,
    accepted_proposal_hash: row.acceptedProposalHash,
    scientific_authority: structuredClone(storedAuthority.scientific_authority),
    closure_watermark: watermark,
    closure_snapshot_hash: row.closureSnapshotHash,
  };
  const { closure_input_hash: closureInputHash, ...watermarkHashInput } = watermark;
  const { closure_snapshot_hash: closureSnapshotHash, ...closureHashInput } = closure;
  const controlOnly = closure.closure_kind === 'control_flow_validated_no_paper_evidence';
  if (
    row.orderedBranchCount !== watermark.ordered_branches.length
    || row.closureInputHash !== closureInputHash
    || closureInputHash !== serverHashPaperImplementationV2ClosureWatermark(watermarkHashInput)
    || closureSnapshotHash !== serverHashPaperImplementationV2CycleClosure(closureHashInput)
    || (controlOnly && (
      closure.scientific_disposition !== null
      || closure.selected_exit_key !== null
      || closure.accepted_proposal_id !== null
      || closure.accepted_proposal_hash !== null
      || closure.scientific_authority !== null
    ))
    || (!controlOnly && (
      closure.scientific_disposition === null
      || closure.selected_exit_key === null
      || closure.accepted_proposal_id === null
      || closure.accepted_proposal_hash === null
      || closure.scientific_authority === null
    ))
  ) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      `Stored Cycle closure authority drifted: ${row.id}`,
    );
  }
  return {
    implementation_project_id: row.implementationProjectId,
    closure,
    idempotency_key: row.idempotencyKey,
    created_at: row.createdAt.toISOString(),
  };
}

function isScientificAuthority(
  value: unknown,
): value is ValidationCycleClosureScientificAuthorityV1 {
  if (!isRecord(value)) return false;
  const canonicalHash = /^sha256:[0-9a-f]{64}$/;
  return value.schema_version === 'PaperImplementationValidationCycleScientificAuthority@v1'
    && typeof value.evaluation_protocol_revision_id === 'string'
    && value.evaluation_protocol_revision_id.length > 0
    && typeof value.evaluation_protocol_content_hash === 'string'
    && canonicalHash.test(value.evaluation_protocol_content_hash)
    && typeof value.primary_comparison_fact_id === 'string'
    && value.primary_comparison_fact_id.length > 0
    && typeof value.primary_comparison_fact_hash === 'string'
    && canonicalHash.test(value.primary_comparison_fact_hash)
    && typeof value.primary_comparison_key === 'string'
    && value.primary_comparison_key.length > 0
    && (
      value.registered_relation === 'supports_registered_expectation'
      || value.registered_relation === 'contradicts_registered_expectation'
      || value.registered_relation === 'indeterminate'
    );
}

function isClosureKind(value: string): value is ValidationCycleClosureKindV2 {
  return (VALIDATION_CYCLE_CLOSURE_KINDS_V2 as readonly string[]).includes(value);
}

function isScientificDispositionOrNull(
  value: string | null,
): value is ScientificDispositionV2 | null {
  return value === null || (SCIENTIFIC_DISPOSITIONS_V2 as readonly string[]).includes(value);
}

function parseScientificValidationReport(value: unknown): ScientificValidationReportV2 {
  if (!scientificValidationReportValidator(value)) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      'Scientific closure resolved an invalid stored validation report.',
    );
  }
  const report = structuredClone(value);
  const expectedHash = serverHashExperimentFoundationV2ScientificValidation({
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    ordered_cell_results: report.ordered_cell_results,
    evaluation_protocol: report.evaluation_protocol,
    validator_profile_version: report.validator_profile_version,
    validator_profile_hash: report.validator_profile_hash,
    ordered_rule_results: report.ordered_rule_results,
    ...(report.ordered_comparison_results
      ? { ordered_comparison_results: report.ordered_comparison_results }
      : {}),
    status: report.status,
  });
  if (expectedHash !== report.validation_hash) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      'Scientific closure resolved a validation report with a drifted canonical hash.',
    );
  }
  const nonCanonicalFact = (report.ordered_comparison_results ?? []).find((result) => (
    result.fact !== null && !isCanonicalComparisonFact(result.fact)
  ));
  if (nonCanonicalFact) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      'Scientific closure resolved a comparison fact with a drifted canonical hash.',
    );
  }
  return report;
}

function parseScientificProtocol(
  value: unknown,
): ExperimentFoundationV2EvaluationProtocolRevisionContentV2 {
  if (!scientificProtocolValidator(value)) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      'Scientific closure resolved an invalid EvaluationProtocol snapshot.',
    );
  }
  return structuredClone(value);
}

function isCanonicalComparisonFact(fact: ScientificComparisonFactV1): boolean {
  const { comparison_fact_hash: comparisonFactHash, ...hashInput } = fact;
  return comparisonFactHash
    === serverHashExperimentFoundationScientificComparisonFactV1(hashInput);
}

function stableSha256(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(record[key])}`
  )).join(',')}}`;
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function equalJson(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidationCycleRefType(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized === 'validationcycle'
    || normalized === 'paperimplementationvalidationcycle';
}

function mapPrismaError(error: unknown): unknown {
  if (error instanceof PaperImplementationValidationCycleClosureV2RepositoryError) {
    return error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034') {
      return new PaperImplementationValidationCycleClosureV2RepositoryError(
        'CLOSURE_CONCURRENT_CONFLICT',
        'Cycle closure transaction conflicted with a concurrent scope write.',
      );
    }
    if (error.code === 'P2002') {
      const target = JSON.stringify(error.meta?.target ?? '');
      if (target.includes('validationCycleId') || target.includes('pi_cycle_closure_cycle_unique')) {
        return new PaperImplementationValidationCycleClosureV2RepositoryError(
          'CYCLE_ALREADY_CLOSED',
          'ValidationCycle already has a v2 closure.',
        );
      }
      if (target.includes('idempotencyKey') || target.includes('pi_cycle_closure_idempotency_unique')) {
        return new PaperImplementationValidationCycleClosureV2RepositoryError(
          'CLOSURE_IDEMPOTENCY_CONFLICT',
          'Cycle closure idempotency key is already bound.',
        );
      }
    }
  }
  return error;
}
