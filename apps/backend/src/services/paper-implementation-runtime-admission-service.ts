import {
  Ajv,
  type ValidateFunction,
} from 'ajv';
import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION,
  type AdmitPaperImplementationRuntimeArtifactRequestPayload,
  paperImplementationRuntimeAdmissionRecordSchema,
  paperImplementationRuntimeArtifactEnvelopeSchema,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeAdmissionScope,
  type PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ListPaperImplementationRuntimeArtifactsFilter,
  PaperImplementationRuntimeRepository,
} from '../repositories/paper-implementation-runtime.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

type IdFactory = (prefix: string) => string;

export interface PaperImplementationRuntimeAdmissionServiceOptions {
  repository: PaperImplementationRuntimeRepository;
  idFactory?: IdFactory;
  now?: () => string;
}

export type AdmitPaperImplementationRuntimeArtifactRequest =
  AdmitPaperImplementationRuntimeArtifactRequestPayload & {
    implementation_project_id: string;
    runtime_artifact_id: string;
  };

export class PaperImplementationRuntimeAdmissionService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly runtimeArtifactValidator: ValidateFunction;
  private readonly admissionRecordValidator: ValidateFunction;
  private readonly repository: PaperImplementationRuntimeRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationRuntimeAdmissionServiceOptions) {
    this.repository = options.repository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.runtimeArtifactValidator = this.ajv.compile(paperImplementationRuntimeArtifactEnvelopeSchema);
    this.admissionRecordValidator = this.ajv.compile(paperImplementationRuntimeAdmissionRecordSchema);
  }

  async recordRuntimeArtifact(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope> {
    this.assertRuntimeArtifactSchema(artifact);
    return this.repository.createRuntimeArtifact(artifact);
  }

  async listRuntimeArtifacts(
    implementationProjectId: string,
    filter: ListPaperImplementationRuntimeArtifactsFilter = {},
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]> {
    return this.repository.listRuntimeArtifacts(implementationProjectId, filter);
  }

  async getRuntimeArtifact(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope> {
    const artifact = await this.repository.findRuntimeArtifactById(
      implementationProjectId,
      runtimeArtifactId,
    );
    if (!artifact) {
      throw new AppError(404, 'NOT_FOUND', `RuntimeArtifact ${runtimeArtifactId} not found.`);
    }
    this.assertRuntimeArtifactSchema(artifact);
    return artifact;
  }

  async listAdmissionRecords(
    implementationProjectId: string,
    filter: ListPaperImplementationRuntimeAdmissionRecordsFilter = {},
  ): Promise<PaperImplementationRuntimeAdmissionRecord[]> {
    return this.repository.listAdmissionRecords(implementationProjectId, filter);
  }

  async admitRuntimeArtifact(
    request: AdmitPaperImplementationRuntimeArtifactRequest,
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    this.assertAdmissionRequest(request);
    const artifact = await this.repository.findRuntimeArtifactById(
      request.implementation_project_id,
      request.runtime_artifact_id,
    );
    if (!artifact) {
      throw new AppError(404, 'NOT_FOUND', `RuntimeArtifact ${request.runtime_artifact_id} not found.`);
    }
    this.assertRuntimeArtifactSchema(artifact);

    const issueCodes = this.evaluateIssues(request, artifact);
    const admissionStatus = issueCodes.length === 0 ? 'admitted' : 'rejected';
    const admittedArtifactRef = admissionStatus === 'admitted'
      ? this.admittedArtifactRef(request.admission_scope, artifact)
      : null;
    const admittedArtifactHash = admissionStatus === 'admitted'
      ? this.admittedArtifactHash(request.admission_scope, artifact)
      : null;
    const admissionIdentity = this.buildAdmissionIdentity(request, artifact);
    const admissionIdentityHash = sha256Text(stableStringify(admissionIdentity));
    const existing = await this.repository.findAdmissionRecordByIdentityHash(
      artifact.implementation_project_id,
      admissionIdentityHash,
    );
    if (existing) {
      return existing;
    }
    const record: PaperImplementationRuntimeAdmissionRecord = {
      schema_version: PAPER_IMPLEMENTATION_RUNTIME_ADMISSION_RECORD_SCHEMA_VERSION,
      admission_record_id: request.admission_record_id ?? this.idFactory('pi_runtime_admission'),
      implementation_project_id: artifact.implementation_project_id,
      workflow_type: artifact.workflow_type,
      slot_id: artifact.slot_id,
      admission_scope: request.admission_scope,
      admission_policy_id: request.admission_policy_id,
      admission_policy_version: request.admission_policy_version,
      runtime_artifact_ref: this.runtimeArtifactRef(artifact),
      runtime_artifact_hash: artifact.artifact_identity_hash,
      runtime_artifact_id: artifact.runtime_artifact_id,
      artifact_contract_id: artifact.artifact_contract_id,
      target_ref: artifact.target_ref,
      created_at: this.now(),
      expected_runtime_identity_hash: request.expected_runtime_identity_hash,
      expected_source_hash_bundle_hash: request.expected_source_hash_bundle_hash,
      expected_retrieval_packet_hash: request.expected_retrieval_packet_hash,
      expected_prompt_packet_hash: request.expected_prompt_packet_hash,
      expected_output_schema_id: request.expected_output_schema_id,
      expected_prior_role_artifact_hashes: [...request.expected_prior_role_artifact_hashes],
      expected_final_artifact_hash: request.expected_final_artifact_hash,
      observed_runtime_identity_hash: artifact.runtime_identity_hash,
      observed_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
      observed_retrieval_packet_hash: artifact.retrieval_packet_hash,
      observed_prompt_packet_hash: artifact.prompt_packet_hash,
      observed_output_schema_id: artifact.output_schema_id,
      observed_prior_role_artifact_hashes: [...artifact.prior_role_artifact_hashes],
      observed_output_hash: artifact.output_hash,
      admission_status: admissionStatus,
      admission_identity: admissionIdentity,
      admission_identity_hash: admissionIdentityHash,
      admitted_artifact_ref: admittedArtifactRef,
      admitted_artifact_hash: admittedArtifactHash,
      issue_codes: issueCodes,
      warning_codes: [...artifact.warning_codes],
    };

    this.assertAdmissionRecordSchema(record);
    return this.repository.createAdmissionRecord(record);
  }

  private evaluateIssues(
    request: AdmitPaperImplementationRuntimeArtifactRequest,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): string[] {
    const issueCodes: string[] = [];
    if (request.admission_scope !== artifact.artifact_scope) {
      issueCodes.push('RUNTIME_ARTIFACT_SCOPE_MISMATCH');
    }
    if (artifact.runtime_status === 'failed_runtime') {
      issueCodes.push('RUNTIME_STATUS_FAILED_RUNTIME');
    }
    if (artifact.runtime_status === 'blocked' && artifact.blocker_codes.length === 0) {
      issueCodes.push('RUNTIME_BLOCKER_CODES_MISSING');
    }
    if (request.expected_runtime_identity_hash !== artifact.runtime_identity_hash) {
      issueCodes.push('RUNTIME_IDENTITY_HASH_MISMATCH');
    }
    if (request.expected_source_hash_bundle_hash !== artifact.source_hash_bundle_hash) {
      issueCodes.push('SOURCE_HASH_BUNDLE_HASH_MISMATCH');
    }
    if (request.expected_retrieval_packet_hash !== artifact.retrieval_packet_hash) {
      issueCodes.push('RETRIEVAL_PACKET_HASH_MISMATCH');
    }
    if (request.expected_prompt_packet_hash !== artifact.prompt_packet_hash) {
      issueCodes.push('PROMPT_PACKET_HASH_MISMATCH');
    }
    if (request.expected_output_schema_id !== artifact.output_schema_id) {
      issueCodes.push('OUTPUT_SCHEMA_ID_MISMATCH');
    }
    if (!this.equalStringArrays(request.expected_prior_role_artifact_hashes, artifact.prior_role_artifact_hashes)) {
      issueCodes.push('PRIOR_ROLE_ARTIFACT_HASHES_MISMATCH');
    }
    if (request.admission_scope === 'final') {
      if (artifact.final_artifact_ref === null) {
        issueCodes.push('FINAL_ARTIFACT_REF_MISSING');
      }
      if (artifact.final_artifact_hash === null) {
        issueCodes.push('FINAL_ARTIFACT_HASH_MISSING');
      }
      if (request.expected_final_artifact_hash !== artifact.final_artifact_hash) {
        issueCodes.push('FINAL_ARTIFACT_HASH_MISMATCH');
      }
    }
    return issueCodes;
  }

  private buildAdmissionIdentity(
    request: AdmitPaperImplementationRuntimeArtifactRequest,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Record<string, unknown> {
    return {
      admission_scope: request.admission_scope,
      admission_policy_id: request.admission_policy_id,
      admission_policy_version: request.admission_policy_version,
      runtime_artifact_id: artifact.runtime_artifact_id,
      runtime_artifact_hash: artifact.artifact_identity_hash,
      artifact_scope: artifact.artifact_scope,
      workflow_type: artifact.workflow_type,
      slot_id: artifact.slot_id,
      artifact_contract_id: artifact.artifact_contract_id,
      target_ref: artifact.target_ref,
      runtime_status: artifact.runtime_status,
      runtime_failure_code: artifact.runtime_failure_code,
      blocker_codes: artifact.blocker_codes,
      runtime_identity_hash: artifact.runtime_identity_hash,
      source_hash_bundle_hash: artifact.source_hash_bundle_hash,
      retrieval_packet_hash: artifact.retrieval_packet_hash,
      prompt_packet_hash: artifact.prompt_packet_hash,
      output_schema_id: artifact.output_schema_id,
      prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
      final_artifact_hash: artifact.final_artifact_hash,
      output_hash: artifact.output_hash,
    };
  }

  private runtimeArtifactRef(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'paper_implementation_runtime_artifact',
      ref_id: artifact.runtime_artifact_id,
      title_card_id: artifact.target_ref.title_card_id ?? null,
    };
  }

  private admittedArtifactRef(
    admissionScope: PaperImplementationRuntimeAdmissionScope,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): TopicSelectionFunctionalRef {
    if (admissionScope === 'final') {
      return artifact.final_artifact_ref ?? artifact.artifact_payload_ref;
    }
    return artifact.artifact_payload_ref;
  }

  private admittedArtifactHash(
    admissionScope: PaperImplementationRuntimeAdmissionScope,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): string {
    if (admissionScope === 'final') {
      return artifact.final_artifact_hash ?? artifact.artifact_payload_hash;
    }
    return artifact.artifact_payload_hash;
  }

  private assertRuntimeArtifactSchema(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): void {
    if (!this.runtimeArtifactValidator(artifact)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'RuntimeArtifact failed schema validation.', {
        errors: this.runtimeArtifactValidator.errors ?? [],
      });
    }
  }

  private assertAdmissionRequest(
    request: AdmitPaperImplementationRuntimeArtifactRequest,
  ): void {
    const expectedFinalArtifactHash = request.expected_final_artifact_hash as string | null;
    if (request.admission_scope === 'final' && expectedFinalArtifactHash === null) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Final runtime admission requires expected_final_artifact_hash.');
    }
    if (request.admission_scope === 'role' && expectedFinalArtifactHash !== null) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Role runtime admission must not include expected_final_artifact_hash.');
    }
  }

  private assertAdmissionRecordSchema(
    record: PaperImplementationRuntimeAdmissionRecord,
  ): void {
    if (!this.admissionRecordValidator(record)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'RuntimeAdmissionRecord failed schema validation.', {
        errors: this.admissionRecordValidator.errors ?? [],
      });
    }
  }

  private equalStringArrays(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }
}
