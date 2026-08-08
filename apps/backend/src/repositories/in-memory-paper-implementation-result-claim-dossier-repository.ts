import type {
  ClaimCandidate,
  ClosedResultInterpretationPacketV2,
  ImplementationDossier,
  PaperImplementationWritingEntryPacket,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationResultClaimDossierRepository,
  PaperImplementationExactClosureReader,
} from './paper-implementation-result-claim-dossier.repository.js';
import {
  PaperImplementationResultPacketV2RepositoryError,
} from './paper-implementation-result-claim-dossier.repository.js';
import {
  serverHashPaperImplementationResultInterpretationPacketV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

export class InMemoryPaperImplementationResultClaimDossierRepository
implements PaperImplementationResultClaimDossierRepository {
  private readonly resultPackets = new Map<string, ResultInterpretationPacket>();
  private readonly resultPacketIdsByProject = new Map<string, string[]>();
  private readonly claimCandidates = new Map<string, ClaimCandidate>();
  private readonly claimCandidateIdsByProject = new Map<string, string[]>();
  private readonly dossiers = new Map<string, ImplementationDossier>();
  private readonly dossierIdsByProject = new Map<string, string[]>();
  private readonly writingEntryPackets = new Map<string, PaperImplementationWritingEntryPacket>();
  private readonly writingEntryPacketIdsByProject = new Map<string, string[]>();

  constructor(private readonly exactClosureReader?: PaperImplementationExactClosureReader) {}

  async createResultInterpretationPacket(
    packet: ResultInterpretationPacket,
  ): Promise<ResultInterpretationPacket> {
    this.assertNewId(this.resultPackets, packet.result_interpretation_packet_id, 'ResultInterpretationPacket');
    this.resultPackets.set(packet.result_interpretation_packet_id, structuredClone(packet));
    this.pushId(
      this.resultPacketIdsByProject,
      packet.implementation_project_id,
      packet.result_interpretation_packet_id,
    );
    return structuredClone(packet);
  }

  async materializeClosedResultInterpretationPacket(
    packet: ClosedResultInterpretationPacketV2,
  ): Promise<ClosedResultInterpretationPacketV2> {
    const { packet_content_hash: packetHash, created_at: _createdAt, ...hashInput } = packet;
    if (packetHash !== serverHashPaperImplementationResultInterpretationPacketV2(hashInput)) {
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_INVARIANT_INVALID',
        'ResultInterpretationPacket v2 content hash is invalid.',
      );
    }
    const closure = await this.exactClosureReader?.findStoredClosureByCycle(
      packet.validation_cycle_id,
    );
    if (!closure) {
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_CLOSURE_NOT_FOUND',
        'Exact scientific Closure is not available for Packet materialization.',
      );
    }
    if (
      closure.implementation_project_id !== packet.implementation_project_id
      || closure.closure.closure_id !== packet.closure_id
      || closure.closure.closure_snapshot_hash !== packet.closure_snapshot_hash
      || closure.closure.closure_kind !== 'scientific_evidence_assessed'
    ) {
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_CLOSURE_DRIFT',
        'Exact scientific Closure changed before Packet materialization.',
      );
    }
    const existingByClosure = [...this.resultPackets.values()].find(
      (candidate) => candidate.closure_id === packet.closure_id,
    );
    if (existingByClosure) {
      if (
        existingByClosure.packet_content_hash === packet.packet_content_hash
        && existingByClosure.created_at === packet.created_at
      ) return structuredClone(existingByClosure) as ClosedResultInterpretationPacketV2;
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_CONTENT_CONFLICT',
        'Scientific Closure is already bound to different Packet content.',
      );
    }
    if (this.resultPackets.has(packet.result_interpretation_packet_id)) {
      throw new PaperImplementationResultPacketV2RepositoryError(
        'PACKET_ID_CONFLICT',
        'ResultInterpretationPacket id is already bound to another record.',
      );
    }
    this.resultPackets.set(packet.result_interpretation_packet_id, structuredClone(packet));
    this.pushId(
      this.resultPacketIdsByProject,
      packet.implementation_project_id,
      packet.result_interpretation_packet_id,
    );
    return structuredClone(packet);
  }

  async findResultInterpretationPacketById(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ResultInterpretationPacket | null> {
    const packet = this.resultPackets.get(resultInterpretationPacketId);
    if (!packet || packet.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(packet);
  }

  async listResultInterpretationPackets(
    implementationProjectId: string,
  ): Promise<ResultInterpretationPacket[]> {
    return (this.resultPacketIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.resultPackets.get(id))
      .filter((packet): packet is ResultInterpretationPacket => Boolean(packet))
      .map((packet) => structuredClone(packet));
  }

  async createClaimCandidate(candidate: ClaimCandidate): Promise<ClaimCandidate> {
    this.assertNewId(this.claimCandidates, candidate.claim_candidate_id, 'ClaimCandidate');
    this.claimCandidates.set(candidate.claim_candidate_id, structuredClone(candidate));
    this.pushId(
      this.claimCandidateIdsByProject,
      candidate.implementation_project_id,
      candidate.claim_candidate_id,
    );
    return structuredClone(candidate);
  }

  async findClaimCandidateById(
    implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate | null> {
    const candidate = this.claimCandidates.get(claimCandidateId);
    if (!candidate || candidate.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(candidate);
  }

  async listClaimCandidates(
    implementationProjectId: string,
  ): Promise<ClaimCandidate[]> {
    return (this.claimCandidateIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.claimCandidates.get(id))
      .filter((candidate): candidate is ClaimCandidate => Boolean(candidate))
      .map((candidate) => structuredClone(candidate));
  }

  async createImplementationDossier(
    dossier: ImplementationDossier,
  ): Promise<ImplementationDossier> {
    this.assertNewId(this.dossiers, dossier.dossier_id, 'ImplementationDossier');
    this.dossiers.set(dossier.dossier_id, structuredClone(dossier));
    this.pushId(this.dossierIdsByProject, dossier.implementation_project_id, dossier.dossier_id);
    return structuredClone(dossier);
  }

  async findImplementationDossierById(
    implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier | null> {
    const dossier = this.dossiers.get(dossierId);
    if (!dossier || dossier.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(dossier);
  }

  async listImplementationDossiers(
    implementationProjectId: string,
  ): Promise<ImplementationDossier[]> {
    return (this.dossierIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.dossiers.get(id))
      .filter((dossier): dossier is ImplementationDossier => Boolean(dossier))
      .map((dossier) => structuredClone(dossier));
  }

  async createWritingEntryPacket(
    packet: PaperImplementationWritingEntryPacket,
  ): Promise<PaperImplementationWritingEntryPacket> {
    this.assertNewId(this.writingEntryPackets, packet.writing_entry_packet_id, 'WritingEntryPacket');
    this.writingEntryPackets.set(packet.writing_entry_packet_id, structuredClone(packet));
    this.pushId(
      this.writingEntryPacketIdsByProject,
      packet.implementation_project_id,
      packet.writing_entry_packet_id,
    );
    return structuredClone(packet);
  }

  async listWritingEntryPackets(
    implementationProjectId: string,
  ): Promise<PaperImplementationWritingEntryPacket[]> {
    return (this.writingEntryPacketIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.writingEntryPackets.get(id))
      .filter((packet): packet is PaperImplementationWritingEntryPacket => Boolean(packet))
      .map((packet) => structuredClone(packet));
  }

  private assertNewId<T>(map: Map<string, T>, id: string, label: string): void {
    if (map.has(id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
    }
  }

  private pushId(map: Map<string, string[]>, key: string, id: string): void {
    const ids = map.get(key) ?? [];
    ids.push(id);
    map.set(key, ids);
  }
}
