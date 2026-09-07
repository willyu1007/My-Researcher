import type {
  TopicSelectionEvidenceClusterRecord,
  TopicSelectionEvidenceConflictSetRecord,
  TopicSelectionEvidenceFreshnessStatus,
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidencePatternRecord,
  TopicSelectionEvidenceStrengthAssessmentRecord,
  TopicSelectionEvidenceTypedLinkRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

export type TopicSelectionEvidenceMapStaleStatus = Extract<
  TopicSelectionEvidenceFreshnessStatus,
  'stale' | 'recheck_required'
>;

export type TopicSelectionEvidenceMapRecords<
  EvidenceMap extends TopicSelectionEvidenceMapRecord = TopicSelectionEvidenceMapRecord,
> = {
  evidence_map: EvidenceMap;
  evidence_units: TopicSelectionEvidenceUnitRecord[];
  typed_links: TopicSelectionEvidenceTypedLinkRecord[];
  clusters: TopicSelectionEvidenceClusterRecord[];
  patterns: TopicSelectionEvidencePatternRecord[];
  conflict_sets: TopicSelectionEvidenceConflictSetRecord[];
};

export type TopicSelectionEvidenceMapCreateRecords = TopicSelectionEvidenceMapRecords;

export type TopicSelectionInitialEvidenceMapRecord = Omit<
  TopicSelectionEvidenceMapRecord,
  'predecessor_evidence_map_ref' | 'successor_evidence_map_ref' | 'material_evidence_delta_ref' | 'lineage_revision'
> & {
  predecessor_evidence_map_ref?: null;
  successor_evidence_map_ref?: null;
  material_evidence_delta_ref?: null;
  lineage_revision?: 0;
};

export type TopicSelectionInitialEvidenceMapCreateRecords = TopicSelectionEvidenceMapRecords<
  TopicSelectionInitialEvidenceMapRecord
>;

export function assertInitialEvidenceMapCreateRecords(
  records: TopicSelectionEvidenceMapCreateRecords,
): asserts records is TopicSelectionInitialEvidenceMapCreateRecords {
  const map = records.evidence_map;
  if (map.predecessor_evidence_map_ref
    || map.successor_evidence_map_ref
    || map.material_evidence_delta_ref
    || (map.lineage_revision ?? 0) !== 0) {
    throw new Error('EvidenceMap initial creation cannot carry successor lineage.');
  }
}

export type TopicSelectionEvidenceMapSuccessorPublication = {
  expected_predecessor_id: string;
  expected_lineage_revision: number;
  material_evidence_delta_ref: TopicSelectionFunctionalRef;
  successor_records: TopicSelectionEvidenceMapCreateRecords;
};

export interface TopicSelectionEvidenceMapRepository {
  createEvidenceMapWithRecords(
    records: TopicSelectionInitialEvidenceMapCreateRecords,
  ): Promise<TopicSelectionInitialEvidenceMapCreateRecords>;
  publishEvidenceMapSuccessorWithRecords(
    publication: TopicSelectionEvidenceMapSuccessorPublication,
  ): Promise<TopicSelectionEvidenceMapCreateRecords>;

  findEvidenceMapById(evidenceMapId: string): Promise<TopicSelectionEvidenceMapRecord | null>;
  /**
   * T-087 D1 read-only projection — list EvidenceMaps under a title-card.
   * Reverse-chronological order; powers the reviewer workbench v1a
   * EvidenceMap surface.
   */
  listEvidenceMapsByTitleCardId(titleCardId: string): Promise<TopicSelectionEvidenceMapRecord[]>;
  updateEvidenceMapFreshness(
    evidenceMapId: string,
    freshnessStatus: TopicSelectionEvidenceMapStaleStatus,
    staleReasonCodes: string[],
  ): Promise<TopicSelectionEvidenceMapRecord>;

  listEvidenceUnitsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceUnitRecord[]>;
  findEvidenceUnitById(evidenceUnitId: string): Promise<TopicSelectionEvidenceUnitRecord | null>;
  listTypedLinksByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceTypedLinkRecord[]>;
  listClustersByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceClusterRecord[]>;
  listPatternsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidencePatternRecord[]>;
  listConflictSetsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceConflictSetRecord[]>;

  createEvidenceStrengthAssessment(
    record: TopicSelectionEvidenceStrengthAssessmentRecord,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord>;
  findFreshEvidenceStrengthAssessmentByCacheKey(
    cacheKey: string,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord | null>;
  listEvidenceStrengthAssessmentsByEvidenceMapId(
    evidenceMapId: string,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord[]>;
  markEvidenceStrengthAssessmentsStaleByEvidenceMapId(
    evidenceMapId: string,
    staleReasonCodes: string[],
    freshnessStatus: TopicSelectionEvidenceFreshnessStatus,
  ): Promise<number>;
}
