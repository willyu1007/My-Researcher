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
  TopicSelectionEvidenceMapCreateRecords,
  TopicSelectionEvidenceMapRepository,
  TopicSelectionEvidenceMapStaleStatus,
  TopicSelectionEvidenceMapSuccessorPublication,
  TopicSelectionInitialEvidenceMapCreateRecords,
} from './topic-selection-evidence-map.repository.js';
import { assertInitialEvidenceMapCreateRecords } from './topic-selection-evidence-map.repository.js';

export class InMemoryTopicSelectionEvidenceMapRepository implements TopicSelectionEvidenceMapRepository {
  private readonly evidenceMaps = new Map<string, TopicSelectionEvidenceMapRecord>();
  private readonly evidenceUnits = new Map<string, TopicSelectionEvidenceUnitRecord>();
  private readonly typedLinks = new Map<string, TopicSelectionEvidenceTypedLinkRecord>();
  private readonly clusters = new Map<string, TopicSelectionEvidenceClusterRecord>();
  private readonly patterns = new Map<string, TopicSelectionEvidencePatternRecord>();
  private readonly conflictSets = new Map<string, TopicSelectionEvidenceConflictSetRecord>();
  private readonly strengthAssessments = new Map<string, TopicSelectionEvidenceStrengthAssessmentRecord>();

  async createEvidenceMapWithRecords(
    records: TopicSelectionInitialEvidenceMapCreateRecords,
  ): Promise<TopicSelectionInitialEvidenceMapCreateRecords> {
    assertInitialEvidenceMapCreateRecords(records);
    this.assertEvidenceMapRecordsAbsent(records);
    this.storeEvidenceMapRecords(records);
    return records;
  }

  async publishEvidenceMapSuccessorWithRecords(
    publication: TopicSelectionEvidenceMapSuccessorPublication,
  ): Promise<TopicSelectionEvidenceMapCreateRecords> {
    const predecessor = this.evidenceMaps.get(publication.expected_predecessor_id);
    const successor = publication.successor_records.evidence_map;
    const revision = predecessor?.lineage_revision ?? 0;
    const valid = predecessor
      && predecessor.freshness_status !== 'superseded'
      && !predecessor.successor_evidence_map_ref
      && revision === publication.expected_lineage_revision
      && successor.title_card_id === predecessor.title_card_id
      && successor.predecessor_evidence_map_ref?.ref_id === predecessor.evidence_map_id
      && successor.material_evidence_delta_ref?.ref_id === publication.material_evidence_delta_ref.ref_id
      && !this.evidenceMaps.has(successor.evidence_map_id);
    if (!valid) {
      throw new Error('EvidenceMap successor compare-and-swap failed.');
    }
    this.assertEvidenceMapRecordsAbsent(publication.successor_records);
    const successorRef = {
      ref_type: 'evidence_map',
      ref_id: successor.evidence_map_id,
      title_card_id: successor.title_card_id,
      version_id: successor.evidence_map_version,
    };
    this.evidenceMaps.set(predecessor.evidence_map_id, {
      ...predecessor,
      status: 'stale',
      freshness_status: 'superseded',
      stale_reason_codes: [...new Set([
        ...predecessor.stale_reason_codes,
        'MATERIAL_EVIDENCE_SUCCESSOR_PUBLISHED',
      ])],
      successor_evidence_map_ref: successorRef,
      material_evidence_delta_ref: publication.material_evidence_delta_ref,
      lineage_revision: revision + 1,
    });
    const successorRecords: TopicSelectionEvidenceMapCreateRecords = {
      ...publication.successor_records,
      evidence_map: {
        ...successor,
        predecessor_evidence_map_ref: {
          ref_type: 'evidence_map',
          ref_id: predecessor.evidence_map_id,
          title_card_id: predecessor.title_card_id,
          version_id: predecessor.evidence_map_version,
        },
        successor_evidence_map_ref: null,
        material_evidence_delta_ref: publication.material_evidence_delta_ref,
        lineage_revision: 0,
      },
    };
    this.storeEvidenceMapRecords(successorRecords);
    return successorRecords;
  }

  private storeEvidenceMapRecords(records: TopicSelectionEvidenceMapCreateRecords): void {
    this.evidenceMaps.set(records.evidence_map.evidence_map_id, records.evidence_map);
    for (const unit of records.evidence_units) this.evidenceUnits.set(unit.evidence_unit_id, unit);
    for (const link of records.typed_links) this.typedLinks.set(link.evidence_typed_link_id, link);
    for (const cluster of records.clusters) this.clusters.set(cluster.evidence_cluster_id, cluster);
    for (const pattern of records.patterns) this.patterns.set(pattern.evidence_pattern_id, pattern);
    for (const conflictSet of records.conflict_sets) {
      this.conflictSets.set(conflictSet.evidence_conflict_set_id, conflictSet);
    }
  }

  private assertEvidenceMapRecordsAbsent(records: TopicSelectionEvidenceMapCreateRecords): void {
    const checks = [
      [[records.evidence_map.evidence_map_id], this.evidenceMaps] as const,
      [records.evidence_units.map((record) => record.evidence_unit_id), this.evidenceUnits] as const,
      [records.typed_links.map((record) => record.evidence_typed_link_id), this.typedLinks] as const,
      [records.clusters.map((record) => record.evidence_cluster_id), this.clusters] as const,
      [records.patterns.map((record) => record.evidence_pattern_id), this.patterns] as const,
      [records.conflict_sets.map((record) => record.evidence_conflict_set_id), this.conflictSets] as const,
    ];
    const conflicts = checks.some(([ids, store]) =>
      new Set(ids).size !== ids.length || ids.some((id) => store.has(id)));
    if (conflicts) {
      throw new Error('EvidenceMap record identity conflict.');
    }
  }

  async findEvidenceMapById(evidenceMapId: string): Promise<TopicSelectionEvidenceMapRecord | null> {
    return this.evidenceMaps.get(evidenceMapId) ?? null;
  }

  async listEvidenceMapsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionEvidenceMapRecord[]> {
    return [...this.evidenceMaps.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async updateEvidenceMapFreshness(
    evidenceMapId: string,
    freshnessStatus: TopicSelectionEvidenceMapStaleStatus,
    staleReasonCodes: string[],
  ): Promise<TopicSelectionEvidenceMapRecord> {
    if ((freshnessStatus as TopicSelectionEvidenceFreshnessStatus) === 'superseded') {
      throw new Error('EvidenceMap supersession requires successor compare-and-swap.');
    }
    const current = this.evidenceMaps.get(evidenceMapId);
    if (!current) {
      throw new Error(`EvidenceMap ${evidenceMapId} not found.`);
    }
    const next: TopicSelectionEvidenceMapRecord = {
      ...current,
      freshness_status: freshnessStatus,
      status: 'stale',
      stale_reason_codes: [...new Set([...current.stale_reason_codes, ...staleReasonCodes])],
    };
    this.evidenceMaps.set(evidenceMapId, next);
    return next;
  }

  async listEvidenceUnitsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceUnitRecord[]> {
    return this.byEvidenceMap(this.evidenceUnits, evidenceMapId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async findEvidenceUnitById(evidenceUnitId: string): Promise<TopicSelectionEvidenceUnitRecord | null> {
    return this.evidenceUnits.get(evidenceUnitId) ?? null;
  }

  async listTypedLinksByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceTypedLinkRecord[]> {
    return this.byEvidenceMap(this.typedLinks, evidenceMapId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listClustersByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceClusterRecord[]> {
    return this.byEvidenceMap(this.clusters, evidenceMapId)
      .sort((left, right) => left.cluster_key.localeCompare(right.cluster_key));
  }

  async listPatternsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidencePatternRecord[]> {
    return this.byEvidenceMap(this.patterns, evidenceMapId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async listConflictSetsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceConflictSetRecord[]> {
    return this.byEvidenceMap(this.conflictSets, evidenceMapId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  async createEvidenceStrengthAssessment(
    record: TopicSelectionEvidenceStrengthAssessmentRecord,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord> {
    this.strengthAssessments.set(record.evidence_strength_assessment_id, record);
    return record;
  }

  async findFreshEvidenceStrengthAssessmentByCacheKey(
    cacheKey: string,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord | null> {
    const record = [...this.strengthAssessments.values()]
      .find((item) => item.cache_key === cacheKey && item.freshness_status === 'current');
    return record ?? null;
  }

  async listEvidenceStrengthAssessmentsByEvidenceMapId(
    evidenceMapId: string,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord[]> {
    return this.byEvidenceMap(this.strengthAssessments, evidenceMapId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async markEvidenceStrengthAssessmentsStaleByEvidenceMapId(
    evidenceMapId: string,
    staleReasonCodes: string[],
    freshnessStatus: TopicSelectionEvidenceFreshnessStatus,
  ): Promise<number> {
    let count = 0;
    for (const [id, assessment] of this.strengthAssessments.entries()) {
      if (assessment.evidence_map_id !== evidenceMapId || assessment.freshness_status !== 'current') {
        continue;
      }
      this.strengthAssessments.set(id, {
        ...assessment,
        freshness_status: freshnessStatus,
        stale_reason_codes: [...new Set([...assessment.stale_reason_codes, ...staleReasonCodes])],
      });
      count += 1;
    }
    return count;
  }

  private byEvidenceMap<T extends { evidence_map_id: string }>(records: Map<string, T>, evidenceMapId: string): T[] {
    return [...records.values()].filter((record) => record.evidence_map_id === evidenceMapId);
  }
}
