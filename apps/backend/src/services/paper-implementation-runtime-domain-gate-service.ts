import {
  Ajv,
  type ValidateFunction,
} from 'ajv';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  paperImplementationP1RuntimeReviewArtifactSchema,
  type PaperImplementationP1RuntimeReviewArtifact,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  createClaimCandidateRequestSchema,
  createImplementationDossierRequestSchema,
  RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED_REASON_CODE,
  type ClaimCandidate,
  type CreateClaimCandidateRequest,
  type CreateImplementationDossierRequest,
  type ImplementationDossier,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationResultClaimDossierService } from './paper-implementation-result-claim-dossier-service.js';

export type PaperImplementationDomainGateMaterializationStatus =
  | 'materialized'
  | 'already_materialized';

export interface PaperImplementationRuntimeDomainGateMaterializationResult {
  status: PaperImplementationDomainGateMaterializationStatus;
  implementation_project_id: string;
  runtime_artifact_id: string;
  slot_id: string;
  domain_artifact_ref: TopicSelectionFunctionalRef;
  domain_artifact_hash: string;
  runtime_admission_record: PaperImplementationRuntimeAdmissionRecord;
}

export interface PaperImplementationRuntimeDomainGateServiceOptions {
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  resultClaimDossier: Pick<
    PaperImplementationResultClaimDossierService,
    | 'createClaimCandidate'
    | 'getClaimCandidate'
    | 'createImplementationDossier'
    | 'getImplementationDossier'
  >;
}

export class PaperImplementationRuntimeDomainGateService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly p1ReviewArtifactValidator: ValidateFunction;
  private readonly createClaimCandidateRequestValidator: ValidateFunction;
  private readonly createImplementationDossierRequestValidator: ValidateFunction;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly resultClaimDossier: PaperImplementationRuntimeDomainGateServiceOptions['resultClaimDossier'];

  constructor(options: PaperImplementationRuntimeDomainGateServiceOptions) {
    this.runtimeAdmission = options.runtimeAdmission;
    this.resultClaimDossier = options.resultClaimDossier;
    this.p1ReviewArtifactValidator = this.ajv.compile(paperImplementationP1RuntimeReviewArtifactSchema);
    this.createClaimCandidateRequestValidator = this.ajv.compile(createClaimCandidateRequestSchema);
    this.createImplementationDossierRequestValidator = this.ajv.compile(createImplementationDossierRequestSchema);
  }

  async materializeFinalRuntimeArtifact(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeDomainGateMaterializationResult> {
    const artifact = await this.runtimeAdmission.getRuntimeArtifact(implementationProjectId, runtimeArtifactId);
    this.assertMaterializableFinalArtifact(artifact);
    const admission = await this.requireAdmittedFinalAdmission(implementationProjectId, runtimeArtifactId);

    if (artifact.slot_id === PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Direct ResultInterpretationPacket materialization is closed; ValidationCycleClosed@v1 is the sole materialization trigger.',
        { reason_code: RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED_REASON_CODE },
      );
    }

    const payload = this.p1ReviewPayload(artifact);
    if (!payload.domain_gate_request) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Admitted final runtime artifact is missing domain_gate_request.',
      );
    }

    if (artifact.slot_id === PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID) {
      return this.materializeClaimCandidate(
        implementationProjectId,
        artifact,
        admission,
        this.claimCandidateRequest(payload.domain_gate_request),
      );
    }
    if (artifact.slot_id === PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID) {
      return this.materializeImplementationDossier(
        implementationProjectId,
        artifact,
        admission,
        this.implementationDossierRequest(payload.domain_gate_request),
      );
    }
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Runtime slot ${artifact.slot_id} is not supported by PaperImplementation Domain Gate materialization.`,
    );
  }

  private async materializeClaimCandidate(
    implementationProjectId: string,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    admission: PaperImplementationRuntimeAdmissionRecord,
    request: CreateClaimCandidateRequest,
  ): Promise<PaperImplementationRuntimeDomainGateMaterializationResult> {
    let existing = await this.findExistingClaimCandidate(implementationProjectId, request.claim_candidate_id);
    let status: PaperImplementationDomainGateMaterializationStatus = 'already_materialized';
    if (!existing) {
      status = 'materialized';
      try {
        existing = await this.resultClaimDossier.createClaimCandidate(implementationProjectId, request);
      } catch (error) {
        if (!this.isVersionConflict(error)) {
          throw error;
        }
        existing = await this.findExistingClaimCandidate(implementationProjectId, request.claim_candidate_id);
        if (!existing) {
          throw error;
        }
        status = 'already_materialized';
      }
    }
    this.assertClaimCandidateMatchesRequest(existing, request);
    return {
      status,
      implementation_project_id: implementationProjectId,
      runtime_artifact_id: artifact.runtime_artifact_id,
      slot_id: artifact.slot_id,
      domain_artifact_ref: {
        ref_type: 'claim_candidate',
        ref_id: existing.claim_candidate_id,
        title_card_id: artifact.target_ref.title_card_id ?? null,
      },
      domain_artifact_hash: this.hash(existing),
      runtime_admission_record: admission,
    };
  }

  private async materializeImplementationDossier(
    implementationProjectId: string,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    admission: PaperImplementationRuntimeAdmissionRecord,
    request: CreateImplementationDossierRequest,
  ): Promise<PaperImplementationRuntimeDomainGateMaterializationResult> {
    let existing = await this.findExistingDossier(implementationProjectId, request.dossier_id);
    let status: PaperImplementationDomainGateMaterializationStatus = 'already_materialized';
    if (!existing) {
      status = 'materialized';
      try {
        existing = await this.resultClaimDossier.createImplementationDossier(implementationProjectId, request);
      } catch (error) {
        if (!this.isVersionConflict(error)) {
          throw error;
        }
        existing = await this.findExistingDossier(implementationProjectId, request.dossier_id);
        if (!existing) {
          throw error;
        }
        status = 'already_materialized';
      }
    }
    this.assertDossierMatchesRequest(existing, request);
    return {
      status,
      implementation_project_id: implementationProjectId,
      runtime_artifact_id: artifact.runtime_artifact_id,
      slot_id: artifact.slot_id,
      domain_artifact_ref: {
        ref_type: 'implementation_dossier',
        ref_id: existing.dossier_id,
        title_card_id: artifact.target_ref.title_card_id ?? null,
        version_id: String(existing.dossier_version),
      },
      domain_artifact_hash: this.hash(existing),
      runtime_admission_record: admission,
    };
  }

  private async requireAdmittedFinalAdmission(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    const admissions = await this.runtimeAdmission.listAdmissionRecords(implementationProjectId, {
      runtime_artifact_id: runtimeArtifactId,
      admission_scope: 'final',
    });
    const admitted = admissions.find((record) =>
      record.admission_status === 'admitted' && record.issue_codes.length === 0);
    if (!admitted) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Domain Gate requires an admitted final runtime artifact.',
      );
    }
    return admitted;
  }

  private assertMaterializableFinalArtifact(artifact: PaperImplementationRuntimeArtifactEnvelope): void {
    if (artifact.artifact_scope !== 'final') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Domain Gate only consumes final runtime artifacts.');
    }
    if (artifact.runtime_status !== 'passed') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Domain Gate only materializes passed runtime artifacts.',
      );
    }
    if (
      artifact.slot_id !== PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID
      && artifact.slot_id !== PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID
      && artifact.slot_id !== PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Runtime slot ${artifact.slot_id} does not have a Domain Gate materializer.`,
      );
    }
  }

  private p1ReviewPayload(artifact: PaperImplementationRuntimeArtifactEnvelope): PaperImplementationP1RuntimeReviewArtifact {
    const payload = artifact.artifact_payload;
    if (!this.p1ReviewArtifactValidator(payload)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Runtime artifact payload is not a P1 runtime review artifact.', {
        errors: this.p1ReviewArtifactValidator.errors ?? [],
      });
    }
    return payload as unknown as PaperImplementationP1RuntimeReviewArtifact;
  }

  private claimCandidateRequest(value: Record<string, unknown>): CreateClaimCandidateRequest {
    if (!this.createClaimCandidateRequestValidator(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Domain Gate claim_candidate domain_gate_request is invalid.', {
        errors: this.createClaimCandidateRequestValidator.errors ?? [],
      });
    }
    return value as unknown as CreateClaimCandidateRequest;
  }

  private implementationDossierRequest(value: Record<string, unknown>): CreateImplementationDossierRequest {
    if (!this.createImplementationDossierRequestValidator(value)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Domain Gate implementation_dossier domain_gate_request is invalid.',
        {
          errors: this.createImplementationDossierRequestValidator.errors ?? [],
        },
      );
    }
    return value as unknown as CreateImplementationDossierRequest;
  }

  private async findExistingClaimCandidate(
    implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate | null> {
    try {
      return await this.resultClaimDossier.getClaimCandidate(implementationProjectId, claimCandidateId);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async findExistingDossier(
    implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier | null> {
    try {
      return await this.resultClaimDossier.getImplementationDossier(implementationProjectId, dossierId);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private isVersionConflict(error: unknown): error is AppError {
    return error instanceof AppError && error.statusCode === 409 && error.errorCode === 'VERSION_CONFLICT';
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private assertClaimCandidateMatchesRequest(
    candidate: ClaimCandidate,
    request: CreateClaimCandidateRequest,
  ): void {
    const existingHash = this.hash(this.claimCandidateIdentity(candidate, request));
    const requestHash = this.hash(this.claimRequestIdentity(request, candidate));
    if (existingHash === requestHash) {
      return;
    }
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      `ClaimCandidate ${request.claim_candidate_id} already exists with different Domain Gate payload.`,
    );
  }

  private assertDossierMatchesRequest(
    dossier: ImplementationDossier,
    request: CreateImplementationDossierRequest,
  ): void {
    const existingHash = this.hash(this.dossierIdentity(dossier, request));
    const requestHash = this.hash(this.dossierRequestIdentity(request, dossier));
    if (existingHash === requestHash) {
      return;
    }
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      `ImplementationDossier ${request.dossier_id} already exists with different Domain Gate payload.`,
    );
  }

  private claimRequestIdentity(
    request: CreateClaimCandidateRequest,
    existing?: ClaimCandidate,
  ): Record<string, unknown> {
    return {
      claim_candidate_id: request.claim_candidate_id,
      claim_type: request.claim_type,
      claim_statement: request.claim_statement.trim(),
      claim_strength: request.claim_strength,
      result_interpretation_packet_ids: [...request.result_interpretation_packet_ids],
      support_refs: this.dedupeRefs(request.support_refs),
      challenge_refs: this.dedupeRefs(request.challenge_refs ?? []),
      scope: request.scope,
      boundary: this.boundaryIdentity(request.boundary),
      trace_manifest_id: request.trace_manifest_id,
      claim_trace_packet_id: request.claim_trace_packet_id ?? null,
      policy_version_id: request.policy_version_id ?? existing?.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
    };
  }

  private claimCandidateIdentity(
    candidate: ClaimCandidate,
    request: CreateClaimCandidateRequest,
  ): Record<string, unknown> {
    return {
      claim_candidate_id: candidate.claim_candidate_id,
      claim_type: candidate.claim_type,
      claim_statement: candidate.claim_statement.trim(),
      claim_strength: candidate.claim_strength,
      result_interpretation_packet_ids: candidate.result_interpretation_packet_refs.map((ref) => ref.ref_id),
      support_refs: this.dedupeRefs(candidate.support_refs),
      challenge_refs: this.dedupeRefs(candidate.challenge_refs),
      scope: candidate.scope,
      boundary: this.boundaryIdentity(candidate.boundary),
      trace_manifest_id: candidate.trace_manifest_id,
      claim_trace_packet_id: candidate.claim_trace_packet_id ?? null,
      policy_version_id: request.policy_version_id ?? candidate.policy_version_id ?? null,
      created_by: candidate.created_by,
    };
  }

  private dossierRequestIdentity(
    request: CreateImplementationDossierRequest,
    existing?: ImplementationDossier,
  ): Record<string, unknown> {
    return {
      dossier_id: request.dossier_id,
      dossier_version: request.dossier_version ?? 1,
      dossier_status: request.dossier_status,
      result_interpretation_packet_ids: [...request.result_interpretation_packet_ids],
      claim_candidate_ids: [...request.claim_candidate_ids],
      claim_trace_packet_ids: [...request.claim_trace_packet_ids],
      experiment_section: request.experiment_section,
      claim_section: request.claim_section,
      readiness: this.readinessIdentity(request.readiness),
      trace_manifest_id: request.trace_manifest_id,
      projection_policy_version_id: request.projection_policy_version_id ?? existing?.projection_policy_version_id ?? null,
      reopen_condition: request.reopen_condition ?? null,
      abandon_reason: request.abandon_reason ?? null,
      policy_version_id: request.policy_version_id ?? existing?.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
    };
  }

  private dossierIdentity(
    dossier: ImplementationDossier,
    request: CreateImplementationDossierRequest,
  ): Record<string, unknown> {
    return {
      dossier_id: dossier.dossier_id,
      dossier_version: dossier.dossier_version,
      dossier_status: dossier.dossier_status,
      result_interpretation_packet_ids: dossier.source.result_interpretation_packet_refs.map((ref) => ref.ref_id),
      claim_candidate_ids: dossier.source.claim_candidate_refs.map((ref) => ref.ref_id),
      claim_trace_packet_ids: dossier.source.claim_trace_packet_refs.map((ref) => ref.ref_id),
      experiment_section: dossier.experiment_section,
      claim_section: dossier.claim_section,
      readiness: this.readinessIdentity(dossier.readiness),
      trace_manifest_id: dossier.trace_manifest_id,
      projection_policy_version_id: request.projection_policy_version_id ?? dossier.projection_policy_version_id ?? null,
      reopen_condition: dossier.reopen_condition ?? null,
      abandon_reason: dossier.abandon_reason ?? null,
      policy_version_id: request.policy_version_id ?? dossier.policy_version_id ?? null,
      created_by: dossier.created_by,
    };
  }

  private boundaryIdentity(value: CreateClaimCandidateRequest['boundary']): Record<string, unknown> {
    return {
      boundary_gate_result_id: value.boundary_gate_result_id ?? null,
      rationale: value.rationale,
      forbidden_overclaims: [...value.forbidden_overclaims],
      hidden_counter_evidence_refs: this.dedupeRefs(value.hidden_counter_evidence_refs),
      required_followup_refs: this.dedupeRefs(value.required_followup_refs),
      human_confirmation_ref: value.human_confirmation_ref ?? null,
    };
  }

  private readinessIdentity(value: CreateImplementationDossierRequest['readiness']): Record<string, unknown> {
    return {
      readiness_gate_result_id: value.readiness_gate_result_id ?? null,
      blocker_refs: this.dedupeRefs(value.blocker_refs),
      warning_refs: this.dedupeRefs(value.warning_refs),
      readiness_notes: [...value.readiness_notes],
    };
  }

  private dedupeRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const deduped: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = `${ref.ref_type.toLowerCase().replace(/[_-]/g, '')}:${ref.ref_id}:${ref.version_id ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push({
        ref_type: ref.ref_type,
        ref_id: ref.ref_id,
        title_card_id: ref.title_card_id ?? null,
        version_id: ref.version_id ?? null,
      });
    }
    return deduped;
  }
}
