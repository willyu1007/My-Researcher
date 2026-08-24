import type {
  CitationCandidate,
  ClaimTracePacket,
  NaturalLanguageFieldRoleRecord,
  TraceGateResult,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationTraceRepository } from './paper-implementation-trace.repository.js';

export class InMemoryPaperImplementationTraceRepository
implements PaperImplementationTraceRepository {
  private readonly traceManifests = new Map<string, TraceManifest>();
  private readonly traceManifestIdsByProject = new Map<string, string[]>();
  private readonly citationCandidates = new Map<string, CitationCandidate>();
  private readonly citationCandidateIdsByProject = new Map<string, string[]>();
  private readonly claimTracePackets = new Map<string, ClaimTracePacket>();
  private readonly claimTracePacketIdsByProject = new Map<string, string[]>();
  private readonly fieldRoles = new Map<string, NaturalLanguageFieldRoleRecord>();
  private readonly queueItems = new Map<string, TraceRepairQueueItem>();
  private readonly queueItemIdsByProject = new Map<string, string[]>();
  private readonly queueItemIdsByManifest = new Map<string, string[]>();
  private readonly gateResults = new Map<string, TraceGateResult>();

  async createTraceManifest(
    manifest: TraceManifest,
    repairQueueItems: TraceRepairQueueItem[],
  ): Promise<TraceManifest> {
    if (this.traceManifests.has(manifest.trace_manifest_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `TraceManifest ${manifest.trace_manifest_id} already exists.`,
      );
    }
    const stored = structuredClone(manifest);
    this.traceManifests.set(stored.trace_manifest_id, stored);
    this.pushId(
      this.traceManifestIdsByProject,
      stored.implementation_project_id,
      stored.trace_manifest_id,
    );
    for (const item of repairQueueItems) {
      if (this.queueItems.has(item.queue_item_id)) {
        throw new AppError(409, 'VERSION_CONFLICT', `TraceRepairQueueItem ${item.queue_item_id} already exists.`);
      }
      const storedItem = structuredClone(item);
      this.queueItems.set(storedItem.queue_item_id, storedItem);
      this.pushId(this.queueItemIdsByProject, storedItem.implementation_project_id, storedItem.queue_item_id);
      this.pushId(this.queueItemIdsByManifest, storedItem.trace_manifest_id, storedItem.queue_item_id);
    }
    return structuredClone(stored);
  }

  async findTraceManifestById(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest | null> {
    const manifest = this.traceManifests.get(traceManifestId);
    if (!manifest || manifest.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(manifest);
  }

  async listTraceManifests(
    implementationProjectId: string,
  ): Promise<TraceManifest[]> {
    return (this.traceManifestIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.traceManifests.get(id))
      .filter((manifest): manifest is TraceManifest => Boolean(manifest))
      .map((manifest) => structuredClone(manifest));
  }

  async createCitationCandidate(
    candidate: CitationCandidate,
  ): Promise<CitationCandidate> {
    if (this.citationCandidates.has(candidate.citation_candidate_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `CitationCandidate ${candidate.citation_candidate_id} already exists.`,
      );
    }
    const stored = structuredClone(candidate);
    this.citationCandidates.set(stored.citation_candidate_id, stored);
    this.pushId(
      this.citationCandidateIdsByProject,
      stored.implementation_project_id,
      stored.citation_candidate_id,
    );
    return structuredClone(stored);
  }

  async listCitationCandidates(
    implementationProjectId: string,
  ): Promise<CitationCandidate[]> {
    return (this.citationCandidateIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.citationCandidates.get(id))
      .filter((candidate): candidate is CitationCandidate => Boolean(candidate))
      .map((candidate) => structuredClone(candidate));
  }

  async findCitationCandidateById(
    implementationProjectId: string,
    citationCandidateId: string,
  ): Promise<CitationCandidate | null> {
    const candidate = this.citationCandidates.get(citationCandidateId);
    if (!candidate || candidate.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(candidate);
  }

  async createClaimTracePacket(
    packet: ClaimTracePacket,
  ): Promise<ClaimTracePacket> {
    if (this.claimTracePackets.has(packet.claim_trace_packet_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `ClaimTracePacket ${packet.claim_trace_packet_id} already exists.`,
      );
    }
    const stored = structuredClone(packet);
    this.claimTracePackets.set(stored.claim_trace_packet_id, stored);
    this.pushId(
      this.claimTracePacketIdsByProject,
      stored.implementation_project_id,
      stored.claim_trace_packet_id,
    );
    return structuredClone(stored);
  }

  async listClaimTracePackets(
    implementationProjectId: string,
  ): Promise<ClaimTracePacket[]> {
    return (this.claimTracePacketIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.claimTracePackets.get(id))
      .filter((packet): packet is ClaimTracePacket => Boolean(packet))
      .map((packet) => structuredClone(packet));
  }

  async createNaturalLanguageFieldRole(
    record: NaturalLanguageFieldRoleRecord,
  ): Promise<NaturalLanguageFieldRoleRecord> {
    if (this.fieldRoles.has(record.field_role_record_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `NaturalLanguageFieldRoleRecord ${record.field_role_record_id} already exists.`,
      );
    }
    const stored = structuredClone(record);
    this.fieldRoles.set(stored.field_role_record_id, stored);
    return structuredClone(stored);
  }

  async findNaturalLanguageFieldRoleByIdentity(
    implementationProjectId: string,
    fieldOwnerRef: TopicSelectionFunctionalRef,
    fieldName: string,
    policyVersionId: string | null,
  ): Promise<NaturalLanguageFieldRoleRecord | null> {
    const normalizedFieldName = fieldName.trim();
    const normalizedPolicyVersionId = policyVersionId ?? null;
    for (const record of this.fieldRoles.values()) {
      if (
        record.implementation_project_id === implementationProjectId
        && record.field_name === normalizedFieldName
        && (record.policy_version_id ?? null) === normalizedPolicyVersionId
        && this.sameFunctionalRef(record.field_owner_ref, fieldOwnerRef)
      ) {
        return structuredClone(record);
      }
    }
    return null;
  }

  async createTraceGateResult(
    gateResult: TraceGateResult,
  ): Promise<TraceGateResult> {
    if (this.gateResults.has(gateResult.gate_result_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `TraceGateResult ${gateResult.gate_result_id} already exists.`,
      );
    }
    const stored = structuredClone(gateResult);
    this.gateResults.set(stored.gate_result_id, stored);
    return structuredClone(stored);
  }

  async findTraceGateResultById(
    implementationProjectId: string,
    gateResultId: string,
  ): Promise<TraceGateResult | null> {
    const gateResult = this.gateResults.get(gateResultId);
    if (!gateResult || gateResult.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(gateResult);
  }

  async listTraceRepairQueueItems(
    implementationProjectId: string,
  ): Promise<TraceRepairQueueItem[]> {
    return (this.queueItemIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.queueItems.get(id))
      .filter((item): item is TraceRepairQueueItem => Boolean(item))
      .map((item) => structuredClone(item));
  }

  async listTraceRepairQueueItemsByManifest(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceRepairQueueItem[]> {
    return (this.queueItemIdsByManifest.get(traceManifestId) ?? [])
      .map((id) => this.queueItems.get(id))
      .filter((item): item is TraceRepairQueueItem => Boolean(item))
      .filter((item) => item.implementation_project_id === implementationProjectId)
      .map((item) => structuredClone(item));
  }

  async resolveTraceRepairQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    resolution: {
      resolved_by: TraceRepairQueueItem['resolved_by'];
      resolved_at: string;
      resolution_note?: string | null;
    },
  ): Promise<TraceRepairQueueItem> {
    const existing = this.queueItems.get(queueItemId);
    if (!existing || existing.implementation_project_id !== implementationProjectId) {
      throw new AppError(404, 'NOT_FOUND', `TraceRepairQueueItem ${queueItemId} not found.`);
    }
    const updated: TraceRepairQueueItem = {
      ...existing,
      status: 'resolved',
      resolved_by: resolution.resolved_by ?? 'system',
      resolved_at: resolution.resolved_at,
      resolution_note: resolution.resolution_note ?? null,
    };
    this.queueItems.set(queueItemId, structuredClone(updated));
    return structuredClone(updated);
  }

  private pushId(map: Map<string, string[]>, key: string, id: string): void {
    const ids = map.get(key) ?? [];
    ids.push(id);
    map.set(key, ids);
  }

  private sameFunctionalRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    const leftTitleCardId = left.title_card_id ?? null;
    const rightTitleCardId = right.title_card_id ?? null;
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (!leftTitleCardId || !rightTitleCardId || leftTitleCardId === rightTitleCardId);
  }
}
