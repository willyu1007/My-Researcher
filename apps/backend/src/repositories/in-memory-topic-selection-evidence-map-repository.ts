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
} from './topic-selection-evidence-map.repository.js';

export class InMemoryTopicSelectionEvidenceMapRepository implements TopicSelectionEvidenceMapRepository {
  private readonly evidenceMaps = new Map<string, TopicSelectionEvidenceMapRecord>();
  private readonly evidenceUnits = new Map<string, TopicSelectionEvidenceUnitRecord>();
  private readonly typedLinks = new Map<string, TopicSelectionEvidenceTypedLinkRecord>();
  private readonly clusters = new Map<string, TopicSelectionEvidenceClusterRecord>();
  private readonly patterns = new Map<string, TopicSelectionEvidencePatternRecord>();
  private readonly conflictSets = new Map<string, TopicSelectionEvidenceConflictSetRecord>();
  private readonly strengthAssessments = new Map<string, TopicSelectionEvidenceStrengthAssessmentRecord>();

  async createEvidenceMapWithRecords(
    records: TopicSelectionEvidenceMapCreateRecords,
  ): Promise<TopicSelectionEvidenceMapCreateRecords> {
    this.evidenceMaps.set(records.evidence_map.evidence_map_id, records.evidence_map);
    for (const unit of records.evidence_units) {
      this.evidenceUnits.set(unit.evidence_unit_id, unit);
    }
    for (const link of records.typed_links) {
      this.typedLinks.set(link.evidence_typed_link_id, link);
    }
    for (const cluster of records.clusters) {
      this.clusters.set(cluster.evidence_cluster_id, cluster);
    }
    for (const pattern of records.patterns) {
      this.patterns.set(pattern.evidence_pattern_id, pattern);
    }
    for (const conflictSet of records.conflict_sets) {
      this.conflictSets.set(conflictSet.evidence_conflict_set_id, conflictSet);
    }
    return records;
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
    freshnessStatus: TopicSelectionEvidenceFreshnessStatus,
    staleReasonCodes: string[],
  ): Promise<TopicSelectionEvidenceMapRecord> {
    const current = this.evidenceMaps.get(evidenceMapId);
    if (!current) {
      throw new Error(`EvidenceMap ${evidenceMapId} not found.`);
    }
    const next: TopicSelectionEvidenceMapRecord = {
      ...current,
      freshness_status: freshnessStatus,
      status: freshnessStatus === 'current' ? current.status : 'stale',
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
