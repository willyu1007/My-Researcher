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

export interface PaperImplementationTraceRepository {
  createTraceManifest(
    manifest: TraceManifest,
    repairQueueItems: TraceRepairQueueItem[],
  ): Promise<TraceManifest>;

  findTraceManifestById(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest | null>;

  listTraceManifests(
    implementationProjectId: string,
  ): Promise<TraceManifest[]>;

  createCitationCandidate(
    candidate: CitationCandidate,
  ): Promise<CitationCandidate>;

  listCitationCandidates(
    implementationProjectId: string,
  ): Promise<CitationCandidate[]>;

  createClaimTracePacket(
    packet: ClaimTracePacket,
  ): Promise<ClaimTracePacket>;

  listClaimTracePackets(
    implementationProjectId: string,
  ): Promise<ClaimTracePacket[]>;

  createNaturalLanguageFieldRole(
    record: NaturalLanguageFieldRoleRecord,
  ): Promise<NaturalLanguageFieldRoleRecord>;

  findNaturalLanguageFieldRoleByIdentity(
    implementationProjectId: string,
    fieldOwnerRef: TopicSelectionFunctionalRef,
    fieldName: string,
    policyVersionId: string | null,
  ): Promise<NaturalLanguageFieldRoleRecord | null>;

  createTraceGateResult(
    gateResult: TraceGateResult,
  ): Promise<TraceGateResult>;

  findTraceGateResultById(
    implementationProjectId: string,
    gateResultId: string,
  ): Promise<TraceGateResult | null>;

  listTraceRepairQueueItems(
    implementationProjectId: string,
  ): Promise<TraceRepairQueueItem[]>;

  listTraceRepairQueueItemsByManifest(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceRepairQueueItem[]>;

  resolveTraceRepairQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    resolution: {
      resolved_by: TraceRepairQueueItem['resolved_by'];
      resolved_at: string;
      resolution_note?: string | null;
    },
  ): Promise<TraceRepairQueueItem>;
}
