import type {
  PaperImplementationEvidenceTraceManifestV2,
  PaperImplementationEvidenceV2ReasonCode,
  PaperImplementationRunEvidenceUnitV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2EvidenceTraceManifest,
  serverHashPaperImplementationV2RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type { EvidenceCandidateQualifiedEventV1 } from './experiment-foundation-scientific-validation-v2.repository.js';

export const PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER =
  'pi-evidence-trust-gateway-v2';

export type PaperImplementationEvidenceGatewayV2ReasonCode = Extract<
  PaperImplementationEvidenceV2ReasonCode,
  'EVIDENCE_CANDIDATE_NOT_ELIGIBLE' | 'EVIDENCE_PROVENANCE_REJECTED'
> | 'BRANCH_HEAD_SCOPE_CONFLICT' | 'INTEGRATION_EVENT_PAYLOAD_CONFLICT';

export interface PaperImplementationEvidenceV2Authority {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  branch_revision_sequence: number;
  cell_plan_hash: string;
  approved_plan_hash: string;
}

export interface PaperImplementationEvidenceInboxReceiptV2 {
  inbox_id: string;
  consumer_name: typeof PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER;
  source_event: EvidenceCandidateQualifiedEventV1;
  source_event_hash: string;
  outcome: 'processed' | 'terminal_conflict';
  reason_code: PaperImplementationEvidenceGatewayV2ReasonCode | null;
  processed_at: string;
}

export interface RunEvidenceUnitRegisteredPayloadV1 {
  run_evidence_unit_id: string;
  content_hash: string;
  validation_cycle_id: string;
  run_id: string;
  run_manifest_hash: string;
  evidence_candidate_id: string;
}

export interface RunEvidenceUnitRegisteredEventV1 {
  event_id: string;
  event_type: 'RunEvidenceUnitRegistered';
  schema_version: 'v1';
  producer_domain: 'PaperImplementation';
  occurred_at: string;
  correlation_id: string;
  causation_id: string;
  business_idempotency_key: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  branch_revision_sequence: number;
  cell_plan_hash: string;
  approved_plan_hash: string;
  payload_hash: string;
  payload: RunEvidenceUnitRegisteredPayloadV1;
}

export interface PaperImplementationEvidenceOutboxV2 {
  outbox_id: string;
  aggregate_type: 'PaperImplementationRunEvidenceUnitV2';
  aggregate_id: string;
  transition_key: string;
  event: RunEvidenceUnitRegisteredEventV1;
  event_envelope_hash: string;
  created_at: string;
}

export interface PaperImplementationStoredEvidenceV2 {
  run_evidence_unit: PaperImplementationRunEvidenceUnitV2;
  trace_manifest: PaperImplementationEvidenceTraceManifestV2;
  ingest_idempotency_key: string;
}

export interface PaperImplementationEvidenceV2CommitInput {
  authority: PaperImplementationEvidenceV2Authority;
  inbox: PaperImplementationEvidenceInboxReceiptV2;
  evidence: PaperImplementationStoredEvidenceV2;
  outbox: PaperImplementationEvidenceOutboxV2;
  created_at: string;
}

export interface PaperImplementationEvidenceV2CommitResult {
  inbox: PaperImplementationEvidenceInboxReceiptV2;
  evidence: PaperImplementationStoredEvidenceV2;
  reused_existing_evidence: boolean;
}

export class PaperImplementationEvidenceV2RepositoryConstraintError extends Error {
  constructor(
    public readonly reasonCode:
      | 'BRANCH_HEAD_SCOPE_CONFLICT'
      | 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
      | 'EVIDENCE_INGESTION_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationEvidenceV2RepositoryConstraintError';
  }
}

export interface PaperImplementationEvidenceV2Repository {
  findInboxByEvent(
    consumerName: string,
    eventId: string,
  ): Promise<PaperImplementationEvidenceInboxReceiptV2 | null>;

  findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<PaperImplementationEvidenceInboxReceiptV2 | null>;

  findAuthority(
    branchId: string,
    workOrderRevisionId: string,
  ): Promise<PaperImplementationEvidenceV2Authority | null>;

  findEvidenceByCandidateId(
    evidenceCandidateId: string,
  ): Promise<PaperImplementationStoredEvidenceV2 | null>;

  findEvidenceByIngestIdentity(
    evidenceCandidateId: string,
    businessIdempotencyKey: string,
  ): Promise<PaperImplementationStoredEvidenceV2 | null>;

  recordRejectedInbox(
    inbox: PaperImplementationEvidenceInboxReceiptV2,
  ): Promise<PaperImplementationEvidenceInboxReceiptV2>;

  commitEvidenceIngestion(
    input: PaperImplementationEvidenceV2CommitInput,
  ): Promise<PaperImplementationEvidenceV2CommitResult>;
}

export function authorityMatchesQualifiedEvent(
  authority: PaperImplementationEvidenceV2Authority,
  event: EvidenceCandidateQualifiedEventV1,
): boolean {
  return authority.implementation_project_id === event.implementation_project_id
    && authority.validation_cycle_id === event.validation_cycle_id
    && authority.branch_id === event.branch_id
    && authority.branch_key === event.branch_key
    && authority.work_order_revision_id === event.work_order_revision_id
    && authority.work_order_revision_hash === event.work_order_revision_hash
    && authority.branch_revision_sequence === event.branch_revision_sequence
    && authority.cell_plan_hash === event.cell_plan_hash
    && authority.approved_plan_hash === event.approved_plan_hash;
}

export function assertEvidenceCommitInput(input: PaperImplementationEvidenceV2CommitInput): void {
  const { inbox, evidence, outbox, authority } = input;
  const event = inbox.source_event;
  const unit = evidence.run_evidence_unit;
  const trace = evidence.trace_manifest;
  const emitted = outbox.event;
  const { content_hash: unitHash, ...unitHashInput } = unit;
  const { content_hash: traceHash, ...traceHashInput } = trace;
  const expectedTraceKinds = [
    'evidence_candidate',
    'scientific_validation_report',
    'run',
    'work_order_revision',
    'evaluation_protocol_revision',
  ] as const;
  const expectedTraceIdentities = [
    [unit.evidence_candidate_id, unit.evidence_candidate_content_hash],
    [unit.validation_report_id, unit.validation_hash],
    [unit.run_id, unit.run_manifest_hash],
    [unit.work_order_revision_id, unit.work_order_revision_hash],
    [unit.evaluation_protocol_revision_id, unit.evaluation_protocol_content_hash],
  ] as const;

  if (
    inbox.consumer_name !== PAPER_IMPLEMENTATION_EVIDENCE_TRUST_GATEWAY_V2_CONSUMER
    || inbox.outcome !== 'processed'
    || inbox.reason_code !== null
    || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(event)
    || event.payload_hash !== serverHashExperimentV2EventPayload(
      event.event_type,
      event.schema_version,
      event.payload,
    )
    || !authorityMatchesQualifiedEvent(authority, event)
    || evidence.ingest_idempotency_key !== event.business_idempotency_key
    || unit.schema_version !== 'v1'
    || unit.implementation_project_id !== event.implementation_project_id
    || unit.validation_cycle_id !== event.validation_cycle_id
    || unit.branch_id !== event.branch_id
    || unit.work_order_revision_id !== event.work_order_revision_id
    || unit.work_order_revision_hash !== event.work_order_revision_hash
    || unit.branch_revision_sequence !== event.branch_revision_sequence
    || unit.run_id !== event.payload.run_id
    || unit.run_manifest_hash !== event.payload.run_manifest_hash
    || unit.evidence_candidate_id !== event.payload.candidate_id
    || unit.evidence_candidate_content_hash !== event.payload.candidate_content_hash
    || unit.validation_report_id !== event.payload.validation_report_id
    || unit.validation_hash !== event.payload.validation_hash
    || unit.evaluation_protocol_revision_id !== event.payload.evaluation_protocol_revision_id
    || unit.evaluation_protocol_content_hash !== event.payload.evaluation_protocol_content_hash
    || unitHash !== serverHashPaperImplementationV2RunEvidenceUnit(unitHashInput)
    || trace.schema_version !== 'v1'
    || trace.run_evidence_unit_id !== unit.run_evidence_unit_id
    || trace.ordered_trace_refs.length !== expectedTraceKinds.length
    || trace.ordered_trace_refs.some((ref, index) => (
      ref.ordinal !== index + 1
      || ref.ref_kind !== expectedTraceKinds[index]
      || ref.ref_id !== expectedTraceIdentities[index]?.[0]
      || ref.ref_hash !== expectedTraceIdentities[index]?.[1]
    ))
    || traceHash !== serverHashPaperImplementationV2EvidenceTraceManifest(traceHashInput)
    || outbox.aggregate_type !== 'PaperImplementationRunEvidenceUnitV2'
    || outbox.aggregate_id !== unit.run_evidence_unit_id
    || outbox.transition_key !== `${unit.run_evidence_unit_id}:registered@v1`
    || emitted.event_type !== 'RunEvidenceUnitRegistered'
    || emitted.schema_version !== 'v1'
    || emitted.producer_domain !== 'PaperImplementation'
    || emitted.causation_id !== event.event_id
    || emitted.correlation_id !== event.correlation_id
    || emitted.business_idempotency_key !== event.business_idempotency_key
    || emitted.implementation_project_id !== event.implementation_project_id
    || emitted.validation_cycle_id !== event.validation_cycle_id
    || emitted.branch_id !== event.branch_id
    || emitted.branch_key !== event.branch_key
    || emitted.work_order_revision_id !== event.work_order_revision_id
    || emitted.work_order_revision_hash !== event.work_order_revision_hash
    || emitted.branch_revision_sequence !== event.branch_revision_sequence
    || emitted.cell_plan_hash !== event.cell_plan_hash
    || emitted.approved_plan_hash !== event.approved_plan_hash
    || emitted.payload.run_evidence_unit_id !== unit.run_evidence_unit_id
    || emitted.payload.content_hash !== unit.content_hash
    || emitted.payload.validation_cycle_id !== unit.validation_cycle_id
    || emitted.payload.run_id !== unit.run_id
    || emitted.payload.run_manifest_hash !== unit.run_manifest_hash
    || emitted.payload.evidence_candidate_id !== unit.evidence_candidate_id
    || emitted.payload_hash !== serverHashExperimentV2EventPayload(
      emitted.event_type,
      emitted.schema_version,
      emitted.payload,
    )
    || outbox.event_envelope_hash !== serverHashExperimentV2EventEnvelope(emitted)
  ) {
    throw new PaperImplementationEvidenceV2RepositoryConstraintError(
      'EVIDENCE_INGESTION_CONFLICT',
      'Evidence ingestion bundle does not preserve exact authority, trace, or outbox bindings.',
    );
  }
}

export function sameStoredEvidence(
  left: PaperImplementationStoredEvidenceV2,
  right: PaperImplementationStoredEvidenceV2,
): boolean {
  return left.run_evidence_unit.content_hash === right.run_evidence_unit.content_hash
    && left.trace_manifest.content_hash === right.trace_manifest.content_hash;
}
