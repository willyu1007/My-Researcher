import type {
  ClaimCandidate,
  ClosedResultInterpretationPacketV2,
  ImplementationDossier,
  PaperImplementationWritingEntryPacket,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  PaperImplementationStoredValidationCycleClosureV2,
} from './paper-implementation-validation-cycle-closure-v2.repository.js';

export type PaperImplementationResultPacketV2RepositoryReasonCode =
  | 'PACKET_CLOSURE_NOT_FOUND'
  | 'PACKET_CLOSURE_DRIFT'
  | 'PACKET_ID_CONFLICT'
  | 'PACKET_CONTENT_CONFLICT'
  | 'PACKET_INVARIANT_INVALID';

export class PaperImplementationResultPacketV2RepositoryError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationResultPacketV2RepositoryReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationResultPacketV2RepositoryError';
  }
}

export interface PaperImplementationExactClosureReader {
  findStoredClosureByCycle(
    validationCycleId: string,
  ): Promise<PaperImplementationStoredValidationCycleClosureV2 | null>;
}

export interface PaperImplementationResultClaimDossierRepository {
  createResultInterpretationPacket(
    packet: ResultInterpretationPacket,
  ): Promise<ResultInterpretationPacket>;

  materializeClosedResultInterpretationPacket(
    packet: ClosedResultInterpretationPacketV2,
  ): Promise<ClosedResultInterpretationPacketV2>;

  findResultInterpretationPacketById(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ResultInterpretationPacket | null>;

  listResultInterpretationPackets(
    implementationProjectId: string,
  ): Promise<ResultInterpretationPacket[]>;

  createClaimCandidate(
    candidate: ClaimCandidate,
  ): Promise<ClaimCandidate>;

  findClaimCandidateById(
    implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate | null>;

  listClaimCandidates(
    implementationProjectId: string,
  ): Promise<ClaimCandidate[]>;

  createImplementationDossier(
    dossier: ImplementationDossier,
  ): Promise<ImplementationDossier>;

  findImplementationDossierById(
    implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier | null>;

  listImplementationDossiers(
    implementationProjectId: string,
  ): Promise<ImplementationDossier[]>;

  createWritingEntryPacket(
    packet: PaperImplementationWritingEntryPacket,
  ): Promise<PaperImplementationWritingEntryPacket>;

  listWritingEntryPackets(
    implementationProjectId: string,
  ): Promise<PaperImplementationWritingEntryPacket[]>;
}
