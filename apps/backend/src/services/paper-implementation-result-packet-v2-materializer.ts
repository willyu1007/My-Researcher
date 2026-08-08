import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ValidationCycleClosedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  ValidationCycleClosureV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_PACKET_V2_SCHEMA_VERSION,
  type ClosedResultInterpretationPacketV2,
  type CreateResultInterpretationPacketRequest,
  type ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  PaperImplementationScientificClosureProposalV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationAdmittedScientificClosureProposalV1,
  PaperImplementationScientificClosureEvidenceAuthorityV1,
  PaperImplementationStoredValidationCycleClosureV2,
  PaperImplementationValidationCycleClosureV2Repository,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PaperImplementationResultPacketV2RepositoryError,
  type PaperImplementationResultClaimDossierRepository,
} from '../repositories/paper-implementation-result-claim-dossier.repository.js';
import type {
  ExperimentV2ValidationCycleClosedConsumer,
} from './experiment-v2-integration-relay-service.js';

export interface ClosedInterpretationPacketView {
  packet: ClosedResultInterpretationPacketV2;
  closure: ValidationCycleClosureV2;
  accepted_proposal: PaperImplementationScientificClosureProposalV1;
}

export interface PaperImplementationClosedInterpretationPacketViewReader {
  findClosedInterpretationPacketView(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ClosedInterpretationPacketView | null>;
}

interface ScientificMaterializationAuthority {
  kind: 'scientific';
  storedClosure: PaperImplementationStoredValidationCycleClosureV2;
  admittedProposal: PaperImplementationAdmittedScientificClosureProposalV1;
  evidenceAuthorities: PaperImplementationScientificClosureEvidenceAuthorityV1[];
}

type MaterializationAuthority = ScientificMaterializationAuthority | {
  kind: 'control_only';
  storedClosure: PaperImplementationStoredValidationCycleClosureV2;
};

export class PaperImplementationResultPacketV2Materializer
implements ExperimentV2ValidationCycleClosedConsumer,
PaperImplementationClosedInterpretationPacketViewReader {
  constructor(
    private readonly closureRepository: PaperImplementationValidationCycleClosureV2Repository,
    private readonly packetRepository: PaperImplementationResultClaimDossierRepository,
  ) {}

  async consume(
    event: ValidationCycleClosedEventV1,
  ): Promise<ClosedResultInterpretationPacketV2 | null> {
    this.assertEvent(event);
    const authority = await this.loadAuthority(
      event.implementation_project_id,
      event.payload.validation_cycle_id,
      event.payload.closure_id,
      event.payload.closure_snapshot_hash,
    );
    if (authority.kind === 'control_only') return null;
    const packet = this.assemblePacket(authority, event.occurred_at);
    try {
      return await this.packetRepository.materializeClosedResultInterpretationPacket(packet);
    } catch (error) {
      if (error instanceof PaperImplementationResultPacketV2RepositoryError) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          error.message,
          { reason_code: error.reasonCode },
        );
      }
      throw error;
    }
  }

  async findClosedInterpretationPacketView(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ClosedInterpretationPacketView | null> {
    const packet = await this.packetRepository.findResultInterpretationPacketById(
      implementationProjectId,
      resultInterpretationPacketId,
    );
    if (!packet) return null;
    if (!isClosedPacket(packet)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Claim and Dossier creation require a closure-bound ResultInterpretationPacket v2.',
        { reason_code: 'CLOSED_INTERPRETATION_PACKET_REQUIRED' },
      );
    }
    this.assertPacketHash(packet);
    const authority = await this.loadAuthority(
      implementationProjectId,
      packet.validation_cycle_id,
      packet.closure_id,
      packet.closure_snapshot_hash,
    );
    if (
      authority.kind !== 'scientific'
      || authority.storedClosure.closure.closure_kind !== 'scientific_evidence_assessed'
    ) {
      throw packetAuthorityError('Closure-bound Packet does not resolve to scientific authority.');
    }
    const expectedPacket = this.assemblePacket(authority, packet.created_at);
    if (expectedPacket.packet_content_hash !== packet.packet_content_hash) {
      throw packetAuthorityError('Stored Packet content drifted from its closed interpretation authority.');
    }
    return {
      packet,
      closure: structuredClone(authority.storedClosure.closure),
      accepted_proposal: structuredClone(authority.admittedProposal.proposal),
    };
  }

  private async loadAuthority(
    implementationProjectId: string,
    validationCycleId: string,
    closureId: string,
    closureSnapshotHash: string,
  ): Promise<MaterializationAuthority> {
    return this.closureRepository.withTransaction(async (transaction) => {
      const storedClosure = await transaction.findStoredClosureByCycle(validationCycleId);
      if (
        !storedClosure
        || storedClosure.implementation_project_id !== implementationProjectId
        || storedClosure.closure.closure_id !== closureId
        || storedClosure.closure.closure_snapshot_hash !== closureSnapshotHash
      ) {
        throw packetAuthorityError('ValidationCycleClosed does not match the exact stored Closure.');
      }
      const closure = storedClosure.closure;
      if (closure.closure_kind === 'control_flow_validated_no_paper_evidence') {
        return { kind: 'control_only', storedClosure };
      }
      if (
        !closure.accepted_proposal_id
        || !closure.accepted_proposal_hash
        || !closure.scientific_authority
      ) {
        throw packetAuthorityError('Scientific Closure is missing proposal or comparison authority.');
      }
      const admittedProposal = await transaction.findAdmittedScientificClosureProposal(
        closure.accepted_proposal_id,
        closure.accepted_proposal_hash,
      );
      if (
        !admittedProposal
        || admittedProposal.implementation_project_id !== implementationProjectId
        || admittedProposal.proposal.validation_cycle_id !== validationCycleId
        || admittedProposal.proposal.closure_watermark_hash
          !== closure.closure_watermark.closure_input_hash
      ) {
        throw packetAuthorityError('Closure-bound admitted ResultAnalysis proposal is unavailable or drifted.');
      }
      const evidenceRefs = admittedProposal.proposal.ordered_evidence_refs;
      const evidenceAuthorities = await transaction.listScientificClosureEvidenceAuthorities(
        evidenceRefs,
      );
      if (
        evidenceAuthorities.length !== evidenceRefs.length
        || evidenceAuthorities.some((authority, index) => (
          authority.run_evidence_unit_id !== evidenceRefs[index]?.run_evidence_unit_id
          || authority.content_hash !== evidenceRefs[index]?.content_hash
          || !authority.trace_manifest
          || authority.trace_manifest.run_evidence_unit_id !== authority.run_evidence_unit_id
        ))
      ) {
        throw packetAuthorityError('Closure-bound trusted evidence or trace authority is missing.');
      }
      const primaryFacts = evidenceAuthorities.flatMap((authority) => authority.primary_facts);
      if (
        primaryFacts.length !== 1
        || primaryFacts[0]?.comparison_fact_id
          !== closure.scientific_authority.primary_comparison_fact_id
        || primaryFacts[0].comparison_fact_hash
          !== closure.scientific_authority.primary_comparison_fact_hash
        || primaryFacts[0].registered_relation
          !== closure.scientific_authority.registered_relation
      ) {
        throw packetAuthorityError('Closure-bound primary comparison fact is missing or drifted.');
      }
      return { kind: 'scientific', storedClosure, admittedProposal, evidenceAuthorities };
    });
  }

  private assemblePacket(
    authority: ScientificMaterializationAuthority,
    createdAt: string,
  ): ClosedResultInterpretationPacketV2 {
    const closure = authority.storedClosure.closure;
    const admitted = authority.admittedProposal;
    const packetMaterialization = admitted.packet_materialization;
    if (!packetMaterialization) {
      throw packetAuthorityError('Accepted ResultAnalysis proposal lacks Packet materialization authority.');
    }
    const request = packetMaterialization.request;
    this.assertProposalPacketAgreement(closure, admitted.proposal, request);
    const titleCardId = packetMaterialization.trace_manifest_ref.title_card_id ?? null;
    const runEvidenceRefs = authority.evidenceAuthorities.map((evidence) => this.ref(
      'run_evidence_unit',
      evidence.run_evidence_unit_id,
      titleCardId,
      evidence.content_hash,
    ));
    this.assertExactRefs(request.source.run_evidence_refs, runEvidenceRefs, 'run evidence');
    const validationReportRefs = authority.evidenceAuthorities.map((evidence) => this.ref(
      'result_validation_report',
      evidence.validation_report_id,
      titleCardId,
      evidence.validation_hash,
    ));
    this.assertExactRefSet(
      request.source.validation_report_refs,
      validationReportRefs,
      'validation report',
    );
    const scientificAuthority = closure.scientific_authority!;
    const comparisonRef = this.ref(
      'scientific_comparison_fact',
      scientificAuthority.primary_comparison_fact_id,
      titleCardId,
      scientificAuthority.primary_comparison_fact_hash,
    );
    const failedAttemptRefs = closure.closure_watermark.ordered_branches.flatMap((branch) => (
      branch.ordered_cells.flatMap((cell) => cell.ordered_attempts.flatMap((attempt) => (
        attempt.lifecycle_state === 'failed' || attempt.lifecycle_state === 'cancelled'
          ? [this.ref('execution_attempt', attempt.execution_attempt_id, titleCardId)]
          : []
      )))
    ));
    const declaredFailedRefs = this.intersectTrustedRefs(
      request.source.failed_run_refs,
      runEvidenceRefs,
    );
    const failedRunRefs = this.dedupeRefs([...declaredFailedRefs, ...failedAttemptRefs]);
    const inconclusiveRunRefs = closure.scientific_disposition === 'inconclusive'
      ? runEvidenceRefs
      : this.intersectTrustedRefs(request.source.inconclusive_run_refs, runEvidenceRefs);
    const trustedPacketSources = [...runEvidenceRefs, ...validationReportRefs, comparisonRef];
    const staleRefs = this.intersectTrustedRefs(
      request.source.stale_or_invalidated_evidence_refs,
      trustedPacketSources,
    );
    if (!request.result_summary.exploratory_confirmatory_separated) {
      throw packetAuthorityError('ResultAnalysis did not separate exploratory and confirmatory evidence.');
    }
    if (request.claim_implications.forbidden_overclaims.length === 0) {
      throw packetAuthorityError('ResultAnalysis did not preserve any forbidden overclaim boundary.');
    }
    if (
      failedRunRefs.length > 0
      && (!request.result_summary.failed_runs_accounted_for
        || !request.reliability.failed_runs_retained)
    ) {
      throw packetAuthorityError('Failed or cancelled attempts are not accounted for and retained.');
    }
    if (
      inconclusiveRunRefs.length > 0
      && !request.result_summary.inconclusive_runs_accounted_for
    ) {
      throw packetAuthorityError('Inconclusive scientific evidence is not accounted for.');
    }
    const withoutHash = {
      result_interpretation_packet_id: request.result_interpretation_packet_id,
      implementation_project_id: authority.storedClosure.implementation_project_id,
      validation_cycle_id: closure.validation_cycle_id,
      schema_version: PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_PACKET_V2_SCHEMA_VERSION,
      closure_id: closure.closure_id,
      closure_snapshot_hash: closure.closure_snapshot_hash,
      experiment_plan_light_id: request.experiment_plan_light_id ?? null,
      source: {
        run_evidence_refs: runEvidenceRefs,
        validation_report_refs: validationReportRefs,
        metric_refs: [comparisonRef],
        failed_run_refs: failedRunRefs,
        inconclusive_run_refs: inconclusiveRunRefs,
        stale_or_invalidated_evidence_refs: staleRefs,
      },
      result_summary: structuredClone(request.result_summary),
      reliability: structuredClone(request.reliability),
      claim_implications: structuredClone(request.claim_implications),
      interpretation_gate_status: this.hasRisk(
        closure,
        request,
        failedRunRefs,
        inconclusiveRunRefs,
        staleRefs,
      ) ? 'passed_with_risk' as const : 'passed' as const,
      trace_manifest_ref: structuredClone(packetMaterialization.trace_manifest_ref),
      trace_manifest_id: request.trace_manifest_id,
      policy_version_id: request.policy_version_id
        ?? packetMaterialization.project_policy_version_id,
      created_by: request.created_by ?? 'system' as const,
    };
    return {
      ...withoutHash,
      packet_content_hash: serverHashPaperImplementationResultInterpretationPacketV2(withoutHash),
      created_at: createdAt,
    };
  }

  private assertProposalPacketAgreement(
    closure: ValidationCycleClosureV2,
    proposal: PaperImplementationScientificClosureProposalV1,
    request: CreateResultInterpretationPacketRequest,
  ): void {
    if (
      request.validation_cycle_id !== closure.validation_cycle_id
      || proposal.validation_cycle_id !== closure.validation_cycle_id
      || request.result_summary.result_summary !== proposal.interpretation_summary
      || request.claim_implications.allowed_claim_ceiling !== proposal.claim_ceiling
      || JSON.stringify(request.reliability) !== JSON.stringify(proposal.reliability_assessment)
      || JSON.stringify(request.reliability.limitation_refs)
        !== JSON.stringify(proposal.limitations.limitation_refs)
      || JSON.stringify(request.reliability.reliability_notes)
        !== JSON.stringify(proposal.limitations.reliability_notes)
    ) {
      throw packetAuthorityError('Packet semantic content drifted from its accepted ResultAnalysis proposal.');
    }
  }

  private assertEvent(event: ValidationCycleClosedEventV1): void {
    if (
      event.event_type !== 'ValidationCycleClosed@v1'
      || event.schema_version !== 'v1'
      || event.producer_domain !== 'PaperImplementation'
      || event.payload.event_schema !== 'ValidationCycleClosed@v1'
      || event.event_id.length === 0
      || event.business_idempotency_key.length === 0
      || event.implementation_project_id.length === 0
      || event.payload.validation_cycle_id !== event.validation_cycle_id
      || event.correlation_id !== event.payload.closure_id
      || event.causation_id !== event.payload.closure_input_hash
      || event.work_order_revision_id !== event.payload.closure_id
      || event.work_order_revision_hash !== event.payload.closure_snapshot_hash
      || event.cell_plan_hash !== event.payload.closure_input_hash
      || event.approved_plan_hash !== event.payload.closure_snapshot_hash
      || event.branch_revision_sequence < 1
      || event.payload_hash !== serverHashExperimentV2EventPayload(
        event.event_type,
        event.schema_version,
        event.payload,
      )
      || !/^sha256:[0-9a-f]{64}$/.test(serverHashExperimentV2EventEnvelope(event))
    ) {
      throw packetAuthorityError('ValidationCycleClosed envelope is invalid.');
    }
  }

  private assertPacketHash(packet: ClosedResultInterpretationPacketV2): void {
    const { packet_content_hash: packetHash, created_at: _createdAt, ...hashInput } = packet;
    if (packetHash !== serverHashPaperImplementationResultInterpretationPacketV2(hashInput)) {
      throw packetAuthorityError('Stored ResultInterpretationPacket content hash drifted.');
    }
  }

  private hasRisk(
    closure: ValidationCycleClosureV2,
    request: CreateResultInterpretationPacketRequest,
    failedRefs: TopicSelectionFunctionalRef[],
    inconclusiveRefs: TopicSelectionFunctionalRef[],
    staleRefs: TopicSelectionFunctionalRef[],
  ): boolean {
    return closure.scientific_disposition !== 'positive'
      || failedRefs.length > 0
      || inconclusiveRefs.length > 0
      || staleRefs.length > 0
      || request.reliability.confound_refs.length > 0
      || request.result_summary.unexpected_findings.length > 0;
  }

  private assertExactRefs(
    actual: TopicSelectionFunctionalRef[],
    expected: TopicSelectionFunctionalRef[],
    label: string,
  ): void {
    if (
      actual.length !== expected.length
      || actual.some((ref, index) => this.refKey(ref) !== this.refKey(expected[index]!))
    ) throw packetAuthorityError(`Accepted proposal ${label} refs are not exact or ordered.`);
  }

  private assertExactRefSet(
    actual: TopicSelectionFunctionalRef[],
    expected: TopicSelectionFunctionalRef[],
    label: string,
  ): void {
    const actualKeys = [...new Set(actual.map((ref) => this.refKey(ref)))].sort();
    const expectedKeys = [...new Set(expected.map((ref) => this.refKey(ref)))].sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw packetAuthorityError(`Accepted proposal ${label} refs are incomplete or drifted.`);
    }
  }

  private intersectTrustedRefs(
    requested: TopicSelectionFunctionalRef[],
    trusted: TopicSelectionFunctionalRef[],
  ): TopicSelectionFunctionalRef[] {
    const trustedByKey = new Map(trusted.map((ref) => [this.refKey(ref), ref]));
    return this.dedupeRefs(requested.flatMap((ref) => {
      const trustedRef = trustedByKey.get(this.refKey(ref));
      return trustedRef ? [trustedRef] : [];
    }));
  }

  private dedupeRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...new Map(refs.map((ref) => [this.refKey(ref), ref])).values()];
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string | null,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      version_id: versionId,
    };
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${normalizeRefType(ref.ref_type)}:${ref.ref_id}:${ref.version_id ?? ''}`;
  }
}

export class PaperImplementationValidationCycleClosedCompositeConsumer
implements ExperimentV2ValidationCycleClosedConsumer {
  constructor(
    private readonly projectionConsumer: ExperimentV2ValidationCycleClosedConsumer,
    private readonly packetMaterializer: ExperimentV2ValidationCycleClosedConsumer,
  ) {}

  async consume(event: ValidationCycleClosedEventV1): Promise<void> {
    await this.projectionConsumer.consume(event);
    await this.packetMaterializer.consume(event);
  }
}

function isClosedPacket(
  packet: ResultInterpretationPacket,
): packet is ClosedResultInterpretationPacketV2 {
  return packet.schema_version === PAPER_IMPLEMENTATION_RESULT_INTERPRETATION_PACKET_V2_SCHEMA_VERSION
    && typeof packet.closure_id === 'string'
    && typeof packet.closure_snapshot_hash === 'string'
    && typeof packet.packet_content_hash === 'string';
}

function normalizeRefType(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function packetAuthorityError(message: string): AppError {
  return new AppError(
    409,
    'VERSION_CONFLICT',
    message,
    { reason_code: 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT' },
  );
}
