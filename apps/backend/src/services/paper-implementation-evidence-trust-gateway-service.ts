import { createHash } from 'node:crypto';

import type {
  EvidenceCandidateV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import type {
  IngestQualifiedEvidenceCandidateV2Request,
  IngestQualifiedEvidenceCandidateV2Response,
  PaperImplementationEvidenceTraceManifestV2,
  PaperImplementationRunEvidenceUnitV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  assertExperimentV2EventPayloadHash,
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2EvidenceTraceManifest,
  serverHashPaperImplementationV2RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type EvidenceCandidateQualifiedEventV1,
  type ExperimentFoundationScientificValidationV2Repository,
  type ExperimentFoundationScientificValidationV2StoredOutcome,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import {
  authorityMatchesQualifiedEvent,
  PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER,
  PaperImplementationEvidenceV2RepositoryConstraintError,
  type PaperImplementationEvidenceGatewayV2ReasonCode,
  type PaperImplementationEvidenceInboxReceiptV2,
  type PaperImplementationEvidenceV2Authority,
  type PaperImplementationEvidenceV2Repository,
  type PaperImplementationStoredEvidenceV2,
  type RunEvidenceUnitRegisteredEventV1,
} from '../repositories/paper-implementation-evidence-v2.repository.js';

type ScientificValidationReadPort = Pick<
  ExperimentFoundationScientificValidationV2Repository,
  'loadValidationByRunId'
>;

export interface PaperImplementationEvidenceTrustGatewayServiceOptions {
  repository: PaperImplementationEvidenceV2Repository;
  scientificValidationReadRepository: ScientificValidationReadPort;
  now?: () => string;
}

export interface PaperImplementationEvidenceTrustGatewayOutcome {
  inbox: PaperImplementationEvidenceInboxReceiptV2;
  run_evidence_unit: PaperImplementationRunEvidenceUnitV2 | null;
  trace_manifest: PaperImplementationEvidenceTraceManifestV2 | null;
  replayed: boolean;
  reused_existing_evidence: boolean;
  rejection_message: string | null;
}

const INGEST_READ_KEYS = [
  'evidence_candidate_id',
  'expected_candidate_content_hash',
  'idempotency_key',
] as const;

export class PaperImplementationEvidenceTrustGatewayService {
  private readonly repository: PaperImplementationEvidenceV2Repository;
  private readonly scientificValidationReadRepository: ScientificValidationReadPort;
  private readonly now: () => string;

  constructor(options: PaperImplementationEvidenceTrustGatewayServiceOptions) {
    this.repository = options.repository;
    this.scientificValidationReadRepository = options.scientificValidationReadRepository;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async consume(
    event: EvidenceCandidateQualifiedEventV1,
  ): Promise<PaperImplementationEvidenceTrustGatewayOutcome> {
    assertQualifiedEventEnvelope(event);
    try {
      return await this.consumeValidated(event);
    } catch (error) {
      if (error instanceof PaperImplementationEvidenceV2RepositoryConstraintError) {
        throw gatewayError(
          error.reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT'
            ? 'BRANCH_HEAD_SCOPE_CONFLICT'
            : 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
          error.message,
        );
      }
      throw error;
    }
  }

  /** Read/replay only: this identity DTO can never create PI evidence. */
  async getIngestedEvidence(
    request: IngestQualifiedEvidenceCandidateV2Request,
  ): Promise<IngestQualifiedEvidenceCandidateV2Response | null> {
    assertIdentityOnlyReadRequest(request);
    const stored = await this.repository.findEvidenceByIngestIdentity(
      request.evidence_candidate_id,
      request.idempotency_key,
    );
    if (
      !stored
      || stored.run_evidence_unit.evidence_candidate_content_hash
        !== request.expected_candidate_content_hash
    ) return null;
    return responseFromStoredEvidence(stored);
  }

  private async consumeValidated(
    event: EvidenceCandidateQualifiedEventV1,
  ): Promise<PaperImplementationEvidenceTrustGatewayOutcome> {
    const sourceEventHash = serverHashExperimentV2EventEnvelope(event);
    const eventReplay = await this.repository.findInboxByEvent(
      PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER,
      event.event_id,
    );
    if (eventReplay) return this.replay(eventReplay, event, sourceEventHash);

    const businessReplay = await this.repository.findInboxByBusinessKey(
      PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER,
      event.implementation_project_id,
      event.validation_cycle_id,
      event.branch_id,
      event.business_idempotency_key,
    );
    if (businessReplay) return this.replay(businessReplay, event, sourceEventHash);

    const authority = await this.repository.findAuthority(
      event.branch_id,
      event.work_order_revision_id,
    );
    if (!authority || !authorityMatchesQualifiedEvent(authority, event)) {
      return this.reject(event, 'BRANCH_HEAD_SCOPE_CONFLICT');
    }

    let resolution: ExperimentFoundationScientificValidationV2StoredOutcome | null;
    try {
      resolution = await this.scientificValidationReadRepository.loadValidationByRunId(
        event.payload.run_id,
      );
    } catch (error) {
      if (error instanceof ExperimentFoundationScientificValidationV2ConstraintError) {
        return this.reject(
          event,
          error.reasonCode === 'EVIDENCE_PROVENANCE_REJECTED'
            ? 'EVIDENCE_PROVENANCE_REJECTED'
            : 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE',
        );
      }
      throw error;
    }

    const mismatch = evidenceResolutionMismatch(resolution, event);
    if (mismatch) return this.reject(event, mismatch);

    const eligible = resolution as ExperimentFoundationScientificValidationV2StoredOutcome & {
      evidence_candidate: EvidenceCandidateV2;
    };
    return this.commitEligible(event, authority, eligible);
  }

  private async replay(
    receipt: PaperImplementationEvidenceInboxReceiptV2,
    event: EvidenceCandidateQualifiedEventV1,
    sourceEventHash: string,
  ): Promise<PaperImplementationEvidenceTrustGatewayOutcome> {
    if (
      receipt.source_event.event_id !== event.event_id
      || receipt.source_event_hash !== sourceEventHash
    ) {
      throw gatewayError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'Integration event id or business key was reused with a changed envelope.',
      );
    }
    if (receipt.outcome !== 'processed') {
      return {
        inbox: receipt,
        run_evidence_unit: null,
        trace_manifest: null,
        replayed: true,
        reused_existing_evidence: false,
        rejection_message: rejectionMessageForReason(receipt.reason_code),
      };
    }
    const stored = await this.repository.findEvidenceByCandidateId(event.payload.candidate_id);
    if (!stored || !storedEvidenceMatchesEvent(stored, event)) {
      throw gatewayError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'Processed PI evidence receipt lost its exact REU/trace binding.',
      );
    }
    return {
      inbox: receipt,
      ...responseFromStoredEvidence(stored),
      replayed: true,
      reused_existing_evidence: true,
      rejection_message: null,
    };
  }

  private async reject(
    event: EvidenceCandidateQualifiedEventV1,
    reasonCode: PaperImplementationEvidenceGatewayV2ReasonCode,
  ): Promise<PaperImplementationEvidenceTrustGatewayOutcome> {
    const receipt = await this.repository.recordRejectedInbox(
      receiptFor(event, this.now(), 'terminal_conflict', reasonCode),
    );
    return {
      inbox: receipt,
      run_evidence_unit: null,
      trace_manifest: null,
      replayed: false,
      reused_existing_evidence: false,
      rejection_message: rejectionMessageForReason(reasonCode),
    };
  }

  private async commitEligible(
    event: EvidenceCandidateQualifiedEventV1,
    authority: PaperImplementationEvidenceV2Authority,
    resolution: ExperimentFoundationScientificValidationV2StoredOutcome & {
      evidence_candidate: EvidenceCandidateV2;
    },
  ): Promise<PaperImplementationEvidenceTrustGatewayOutcome> {
    const createdAt = this.now();
    const evidence = buildStoredEvidence(event, resolution);
    const outbox = buildRegisteredOutbox(event, evidence.run_evidence_unit, createdAt);
    const committed = await this.repository.commitEvidenceIngestion({
      authority,
      inbox: receiptFor(event, createdAt, 'processed', null),
      evidence,
      outbox,
      created_at: createdAt,
    });
    if (committed.evidence === null) {
      return {
        inbox: committed.inbox,
        run_evidence_unit: null,
        trace_manifest: null,
        replayed: false,
        reused_existing_evidence: false,
        rejection_message: committed.rejection_message,
      };
    }
    return {
      inbox: committed.inbox,
      ...responseFromStoredEvidence(committed.evidence),
      replayed: false,
      reused_existing_evidence: committed.reused_existing_evidence,
      rejection_message: null,
    };
  }
}

function evidenceResolutionMismatch(
  resolution: ExperimentFoundationScientificValidationV2StoredOutcome | null,
  event: EvidenceCandidateQualifiedEventV1,
): Extract<
  PaperImplementationEvidenceGatewayV2ReasonCode,
  'EVIDENCE_CANDIDATE_NOT_ELIGIBLE' | 'EVIDENCE_PROVENANCE_REJECTED'
> | null {
  const candidate = resolution?.evidence_candidate;
  const report = resolution?.report;
  if (!resolution || !candidate || !report) return 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE';

  const expectedCandidateHash = serverHashExperimentFoundationV2EvidenceCandidate({
    run_id: candidate.run_id,
    run_manifest_hash: candidate.run_manifest_hash,
    validation_report_id: candidate.validation_report_id,
    validation_hash: candidate.validation_hash,
  });
  const expectedValidationHash = serverHashExperimentFoundationV2ScientificValidation({
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    ordered_cell_results: report.ordered_cell_results,
    evaluation_protocol: report.evaluation_protocol,
    validator_profile_version: report.validator_profile_version,
    validator_profile_hash: report.validator_profile_hash,
    ordered_rule_results: report.ordered_rule_results,
    status: report.status,
  });
  if (
    candidate.schema_version !== 'v1'
    || candidate.candidate_id !== event.payload.candidate_id
    || candidate.content_hash !== event.payload.candidate_content_hash
    || candidate.content_hash !== expectedCandidateHash
    || candidate.validation_report_id !== event.payload.validation_report_id
    || candidate.validation_hash !== event.payload.validation_hash
    || candidate.run_id !== event.payload.run_id
    || candidate.run_manifest_hash !== event.payload.run_manifest_hash
    || report.schema_version !== 'v1'
    || report.report_id !== event.payload.validation_report_id
    || report.validation_hash !== event.payload.validation_hash
    || report.validation_hash !== expectedValidationHash
    || report.run_id !== event.payload.run_id
    || report.run_manifest_hash !== event.payload.run_manifest_hash
    || report.status !== 'passed'
  ) return 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE';

  if (
    report.evaluation_protocol.asset_type !== 'EvaluationProtocol'
    || report.evaluation_protocol.revision_id !== event.payload.evaluation_protocol_revision_id
    || report.evaluation_protocol.content_hash
      !== event.payload.evaluation_protocol_content_hash
  ) return 'EVIDENCE_PROVENANCE_REJECTED';
  return null;
}

function buildStoredEvidence(
  event: EvidenceCandidateQualifiedEventV1,
  resolution: ExperimentFoundationScientificValidationV2StoredOutcome & {
    evidence_candidate: EvidenceCandidateV2;
  },
): PaperImplementationStoredEvidenceV2 {
  const candidate = resolution.evidence_candidate;
  const report = resolution.report;
  const unitWithoutHash: Omit<PaperImplementationRunEvidenceUnitV2, 'content_hash'> = {
    run_evidence_unit_id: deterministicId('pi_run_evidence_unit_v2', candidate.content_hash),
    schema_version: 'v1',
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    run_id: candidate.run_id,
    run_manifest_hash: candidate.run_manifest_hash,
    evidence_candidate_id: candidate.candidate_id,
    evidence_candidate_content_hash: candidate.content_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
    evaluation_protocol_revision_id: report.evaluation_protocol.revision_id,
    evaluation_protocol_content_hash: report.evaluation_protocol.content_hash,
  };
  const unit: PaperImplementationRunEvidenceUnitV2 = {
    ...unitWithoutHash,
    content_hash: serverHashPaperImplementationV2RunEvidenceUnit(unitWithoutHash),
  };
  const traceWithoutHash: Omit<PaperImplementationEvidenceTraceManifestV2, 'content_hash'> = {
    trace_manifest_id: deterministicId(
      'pi_evidence_trace_manifest_v2',
      unit.run_evidence_unit_id,
    ),
    schema_version: 'v1',
    run_evidence_unit_id: unit.run_evidence_unit_id,
    ordered_trace_refs: [
      {
        ordinal: 1,
        ref_kind: 'evidence_candidate',
        ref_id: candidate.candidate_id,
        ref_hash: candidate.content_hash,
      },
      {
        ordinal: 2,
        ref_kind: 'scientific_validation_report',
        ref_id: report.report_id,
        ref_hash: report.validation_hash,
      },
      {
        ordinal: 3,
        ref_kind: 'run',
        ref_id: candidate.run_id,
        ref_hash: candidate.run_manifest_hash,
      },
      {
        ordinal: 4,
        ref_kind: 'work_order_revision',
        ref_id: event.work_order_revision_id,
        ref_hash: event.work_order_revision_hash,
      },
      {
        ordinal: 5,
        ref_kind: 'evaluation_protocol_revision',
        ref_id: report.evaluation_protocol.revision_id,
        ref_hash: report.evaluation_protocol.content_hash,
      },
    ],
  };
  return {
    run_evidence_unit: unit,
    trace_manifest: {
      ...traceWithoutHash,
      content_hash: serverHashPaperImplementationV2EvidenceTraceManifest(traceWithoutHash),
    },
    ingest_idempotency_key: event.business_idempotency_key,
  };
}

function buildRegisteredOutbox(
  sourceEvent: EvidenceCandidateQualifiedEventV1,
  unit: PaperImplementationRunEvidenceUnitV2,
  now: string,
) {
  const payload = {
    run_evidence_unit_id: unit.run_evidence_unit_id,
    content_hash: unit.content_hash,
    validation_cycle_id: unit.validation_cycle_id,
    run_id: unit.run_id,
    run_manifest_hash: unit.run_manifest_hash,
    evidence_candidate_id: unit.evidence_candidate_id,
  };
  const event: RunEvidenceUnitRegisteredEventV1 = {
    event_id: deterministicId('pi_integration_event_v2', unit.content_hash),
    event_type: 'RunEvidenceUnitRegistered',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: now,
    correlation_id: sourceEvent.correlation_id,
    causation_id: sourceEvent.event_id,
    business_idempotency_key: sourceEvent.business_idempotency_key,
    implementation_project_id: sourceEvent.implementation_project_id,
    validation_cycle_id: sourceEvent.validation_cycle_id,
    branch_id: sourceEvent.branch_id,
    branch_key: sourceEvent.branch_key,
    work_order_revision_id: sourceEvent.work_order_revision_id,
    work_order_revision_hash: sourceEvent.work_order_revision_hash,
    branch_revision_sequence: sourceEvent.branch_revision_sequence,
    cell_plan_hash: sourceEvent.cell_plan_hash,
    approved_plan_hash: sourceEvent.approved_plan_hash,
    payload_hash: serverHashExperimentV2EventPayload(
      'RunEvidenceUnitRegistered',
      'v1',
      payload,
    ),
    payload,
  };
  return {
    outbox_id: deterministicId('pi_integration_outbox_v2', event.event_id),
    aggregate_type: 'PaperImplementationRunEvidenceUnitV2' as const,
    aggregate_id: unit.run_evidence_unit_id,
    transition_key: `${unit.run_evidence_unit_id}:registered@v1`,
    event,
    event_envelope_hash: serverHashExperimentV2EventEnvelope(event),
    created_at: now,
  };
}

function receiptFor(
  event: EvidenceCandidateQualifiedEventV1,
  processedAt: string,
  outcome: PaperImplementationEvidenceInboxReceiptV2['outcome'],
  reasonCode: PaperImplementationEvidenceInboxReceiptV2['reason_code'],
): PaperImplementationEvidenceInboxReceiptV2 {
  return {
    inbox_id: deterministicId('pi_integration_inbox_v2', event.event_id),
    consumer_name: PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER,
    source_event: structuredClone(event),
    source_event_hash: serverHashExperimentV2EventEnvelope(event),
    outcome,
    reason_code: reasonCode,
    processed_at: processedAt,
  };
}

function responseFromStoredEvidence(
  stored: PaperImplementationStoredEvidenceV2,
): IngestQualifiedEvidenceCandidateV2Response {
  return {
    run_evidence_unit: structuredClone(stored.run_evidence_unit),
    trace_manifest: structuredClone(stored.trace_manifest),
  };
}

function storedEvidenceMatchesEvent(
  stored: PaperImplementationStoredEvidenceV2,
  event: EvidenceCandidateQualifiedEventV1,
): boolean {
  const unit = stored.run_evidence_unit;
  return unit.evidence_candidate_id === event.payload.candidate_id
    && unit.evidence_candidate_content_hash === event.payload.candidate_content_hash
    && unit.validation_report_id === event.payload.validation_report_id
    && unit.validation_hash === event.payload.validation_hash
    && unit.run_id === event.payload.run_id
    && unit.run_manifest_hash === event.payload.run_manifest_hash;
}

function assertQualifiedEventEnvelope(event: EvidenceCandidateQualifiedEventV1): void {
  if (event.event_type !== 'EvidenceCandidateQualified') {
    throw gatewayError('INTEGRATION_EVENT_PAYLOAD_CONFLICT', 'Unsupported integration event type.');
  }
  if (event.schema_version !== 'v1') {
    throw gatewayError('INTEGRATION_EVENT_PAYLOAD_CONFLICT', 'Unsupported integration event version.');
  }
  if (event.producer_domain !== 'ExperimentFoundation') {
    throw gatewayError('INTEGRATION_EVENT_PAYLOAD_CONFLICT', 'Invalid integration event producer.');
  }
  try {
    assertExperimentV2EventPayloadHash(event);
  } catch {
    throw gatewayError(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'Integration event payload hash does not match its payload.',
    );
  }
}

function assertIdentityOnlyReadRequest(request: IngestQualifiedEvidenceCandidateV2Request): void {
  const actual = Object.keys(request).sort();
  const expected = [...INGEST_READ_KEYS].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw gatewayError(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'Evidence replay lookup accepts identity fields only.',
    );
  }
}

function deterministicId(namespace: string, identity: string): string {
  const digest = createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(identity)
    .digest('hex');
  return `${namespace}_${digest}`;
}

function gatewayError(reasonCode: string, message: string): AppError {
  return new AppError(409, 'VERSION_CONFLICT', message, { reason_code: reasonCode });
}

function rejectionMessageForReason(
  reasonCode: PaperImplementationEvidenceInboxReceiptV2['reason_code'],
): string {
  switch (reasonCode) {
    case 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE':
      return 'Evidence candidate is not eligible for PI evidence ingestion.';
    case 'EVIDENCE_PROVENANCE_REJECTED':
      return 'Evidence candidate provenance is not eligible for PI evidence ingestion.';
    case 'BRANCH_HEAD_SCOPE_CONFLICT':
      return 'Evidence candidate does not match the admitted PI branch/revision scope.';
    case 'INTEGRATION_EVENT_PAYLOAD_CONFLICT':
      return 'Evidence candidate integration event conflicts with a stored delivery.';
    case null:
      return 'Evidence candidate delivery was rejected.';
  }
}
