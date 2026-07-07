import crypto from 'node:crypto';
import type {
  LiteratureEvidenceActivationStatus,
  LiteratureQualityAssessmentDTO,
  LiteratureQualityStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  LiteraturePipelineStateRecord,
  LiteratureQualityAssessmentRecord,
  LiteratureRepository,
  TopicLiteratureScopeRecord,
} from '../repositories/literature-repository.js';

export const LITERATURE_IMPORT_THRESHOLD = 55;
export const LITERATURE_ACTIVATION_THRESHOLD = 75;
export const LITERATURE_ACTIVE_QUALITY_STATUS: LiteratureQualityStatus = 'high_confidence';
export const LITERATURE_TOPIC_ACTIVE_STATUS: LiteratureEvidenceActivationStatus = 'active';
export const LITERATURE_AUTOMATIC_PROCESSING_ACTIVATION_STATUSES = new Set<LiteratureEvidenceActivationStatus>([
  'eligible',
  'active',
]);

export function isLiteratureActiveQualityStatus(status: string | null | undefined): status is LiteratureQualityStatus {
  return status === LITERATURE_ACTIVE_QUALITY_STATUS;
}

export function isLiteratureTopicActiveStatus(
  status: string | null | undefined,
): status is LiteratureEvidenceActivationStatus {
  return status === LITERATURE_TOPIC_ACTIVE_STATUS;
}

export function isLiteratureAutomaticProcessingActivationStatus(
  status: string | null | undefined,
): status is LiteratureEvidenceActivationStatus {
  return LITERATURE_AUTOMATIC_PROCESSING_ACTIVATION_STATUSES.has(status as LiteratureEvidenceActivationStatus);
}

export type EvidenceActivationClassification =
  | {
      importable: false;
      qualityStatus: LiteratureQualityStatus;
      activationStatus: 'excluded';
      reason: string;
    }
  | {
      importable: true;
      qualityStatus: LiteratureQualityStatus;
      activationStatus: 'needs_review' | 'eligible';
      reason: string;
    };

export class LiteratureEvidenceActivationService {
  constructor(private readonly repository: LiteratureRepository) {}

  classifyAutoPullScore(score: number): EvidenceActivationClassification {
    if (score < LITERATURE_IMPORT_THRESHOLD) {
      return {
        importable: false,
        qualityStatus: 'low_confidence',
        activationStatus: 'excluded',
        reason: 'AUTO_PULL_SCORE_LT_IMPORT_THRESHOLD',
      };
    }
    if (score < LITERATURE_ACTIVATION_THRESHOLD) {
      return {
        importable: true,
        qualityStatus: 'medium_confidence',
        activationStatus: 'needs_review',
        reason: 'AUTO_PULL_SCORE_LT_ACTIVATION_THRESHOLD',
      };
    }
    return {
      importable: true,
      qualityStatus: 'high_confidence',
      activationStatus: 'eligible',
      reason: 'AUTO_PULL_SCORE_GTE_ACTIVATION_THRESHOLD',
    };
  }

  toQualityAssessmentDTO(record: LiteratureQualityAssessmentRecord): LiteratureQualityAssessmentDTO {
    return {
      literature_id: record.literatureId,
      quality_status: record.qualityStatus,
      quality_score: record.qualityScore,
      quality_components: record.qualityComponents,
      blocker_codes: record.blockerCodes,
      source: record.source,
      assessed_at: record.assessedAt,
      updated_at: record.updatedAt,
    };
  }

  async upsertAutoPullAssessment(input: {
    literatureId: string;
    score: number;
    rankingScore: number;
    rankingMode: string;
    source: string;
  }): Promise<LiteratureQualityAssessmentRecord> {
    const classification = this.classifyAutoPullScore(input.score);
    const now = new Date().toISOString();
    const existing = await this.repository.findQualityAssessmentByLiteratureId(input.literatureId);
    const upserted = await this.repository.upsertQualityAssessment({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId: input.literatureId,
      qualityStatus: classification.qualityStatus,
      qualityScore: input.score,
      qualityComponents: {
        auto_pull_quality_score: input.score,
        ranking_score: input.rankingScore,
        ranking_mode: input.rankingMode,
        import_threshold: LITERATURE_IMPORT_THRESHOLD,
        activation_threshold: LITERATURE_ACTIVATION_THRESHOLD,
        source: input.source,
      },
      blockerCodes: [],
      source: 'auto_pull',
      assessedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return upserted.record;
  }

  // T-130 W-10 (D10): processing completion is NOT a quality endorsement. This no longer
  // manufactures high_confidence/100 — a missing assessment gets a needs_review row with an
  // explicit processing_complete marker, and existing rows (including low_confidence/excluded,
  // which the old code resurrected to high/100) are never upgraded. Quality statuses now come
  // only from auto_pull and human review; pre-D10 content_processing rows were grandfathered
  // by migration (qualityComponents.grandfathered_pseudo_score) and stay retrieval-active.
  async ensureIndexedAssessment(literatureId: string): Promise<LiteratureQualityAssessmentRecord> {
    const existing = await this.repository.findQualityAssessmentByLiteratureId(literatureId);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const upserted = await this.repository.upsertQualityAssessment({
      id: crypto.randomUUID(),
      literatureId,
      qualityStatus: 'needs_review',
      qualityScore: null,
      qualityComponents: {
        kind: 'processing_complete_marker',
        inferred_from: 'content_processing_indexed',
        indexed_ready: true,
        activation_threshold: LITERATURE_ACTIVATION_THRESHOLD,
      },
      blockerCodes: [],
      source: 'content_processing',
      assessedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return upserted.record;
  }

  async upsertManualReviewAssessment(input: {
    literatureId: string;
    qualityScore?: number | null;
    reason: string;
  }): Promise<LiteratureQualityAssessmentRecord> {
    const now = new Date().toISOString();
    const existing = await this.repository.findQualityAssessmentByLiteratureId(input.literatureId);
    const upserted = await this.repository.upsertQualityAssessment({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId: input.literatureId,
      qualityStatus: 'high_confidence',
      qualityScore: input.qualityScore ?? existing?.qualityScore ?? 100,
      qualityComponents: {
        ...(existing?.qualityComponents ?? {}),
        manual_review_reason: input.reason,
      },
      blockerCodes: [],
      source: 'manual_review',
      assessedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    return upserted.record;
  }

  defaultActivationForScopeStatus(scopeStatus: 'in_scope' | 'excluded'): {
    activationStatus: LiteratureEvidenceActivationStatus;
    reason: string;
  } {
    return scopeStatus === 'excluded'
      ? {
          activationStatus: 'excluded',
          reason: 'TOPIC_SCOPE_EXCLUDED',
        }
      : {
          activationStatus: 'eligible',
          reason: 'MANUAL_SCOPE_IN_SCOPE',
        };
  }

  async refreshAfterIndexed(literatureId: string): Promise<void> {
    await this.ensureIndexedAssessment(literatureId);
    const scopes = await this.repository.listTopicScopesByLiteratureId(literatureId);
    await Promise.all(scopes.map((scope) => this.refreshTopicActivation(scope)));
  }

  async refreshTopicActivation(scope: TopicLiteratureScopeRecord): Promise<TopicLiteratureScopeRecord> {
    const now = new Date().toISOString();
    if (scope.scopeStatus === 'excluded') {
      return this.repository.updateTopicScopeActivation(scope.topicId, scope.literatureId, {
        activationStatus: 'excluded',
        activationReason: 'TOPIC_SCOPE_EXCLUDED',
        activatedAt: null,
        updatedAt: now,
      });
    }
    if (scope.activationStatus !== 'eligible' && scope.activationStatus !== 'active') {
      return scope;
    }
    const ready = await this.isEvidenceReady(scope.literatureId);
    if (!ready.active) {
      return this.repository.updateTopicScopeActivation(scope.topicId, scope.literatureId, {
        activationStatus: 'eligible',
        activationReason: ready.reason,
        activatedAt: null,
        updatedAt: now,
      });
    }
    return this.repository.updateTopicScopeActivation(scope.topicId, scope.literatureId, {
      activationStatus: 'active',
      activationReason: 'EVIDENCE_READY',
      activatedAt: scope.activatedAt ?? now,
      updatedAt: now,
    });
  }

  async isEvidenceReady(literatureId: string): Promise<{ active: boolean; reason: string }> {
    const readiness = await this.resolveRetrievalReadiness([literatureId]);
    const entry = readiness.get(literatureId);
    return { active: entry?.ready ?? false, reason: entry?.reason ?? 'QUALITY_NOT_ACTIVE' };
  }

  // T-130 W-05 (D7): THE single source of truth for "retrieval-ready". ready = quality active +
  // key content ready + an activated embedding version; freshness = 'stale' when the INDEXED
  // stage state is STALE — every content-invalidation chain (citation/abstract/fulltext/dossier)
  // marks INDEXED stale, so it is the union signal for "upstream content changed, artifacts not
  // recomputed". Per D7, stale literature STAYS usable but the marker must travel with it
  // (retrieval warnings, sampling audit, provenance).
  async resolveRetrievalReadiness(literatureIds: string[]): Promise<Map<string, LiteratureRetrievalReadiness>> {
    const uniqueIds = [...new Set(literatureIds)];
    const readiness = new Map<string, LiteratureRetrievalReadiness>();
    if (uniqueIds.length === 0) {
      return readiness;
    }
    const [qualities, states, versions, stageStates] = await Promise.all([
      this.repository.listQualityAssessmentsByLiteratureIds(uniqueIds),
      this.repository.listPipelineStatesByLiteratureIds(uniqueIds),
      this.repository.listActiveEmbeddingVersionsByLiteratureIds(uniqueIds),
      this.repository.listPipelineStageStatesByLiteratureIds(uniqueIds),
    ]);
    const qualityByLiterature = new Map(qualities.map((record) => [record.literatureId, record]));
    const stateByLiterature = new Map(states.map((record) => [record.literatureId, record]));
    const activeVersionIds = new Set(
      versions
        .filter((version) => version.status === 'ACTIVE' || Boolean(version.activatedAt))
        .map((version) => version.literatureId),
    );
    const staleIndexedByLiterature = new Map(
      stageStates
        .filter((stage) => stage.stageCode === 'INDEXED' && stage.status === 'STALE')
        .map((stage) => [stage.literatureId, stage]),
    );

    for (const literatureId of uniqueIds) {
      let ready = true;
      let reason = 'EVIDENCE_READY';
      if (!this.isQualityActive(qualityByLiterature.get(literatureId) ?? null)) {
        ready = false;
        reason = 'QUALITY_NOT_ACTIVE';
      } else if (!this.isPipelineReady(stateByLiterature.get(literatureId) ?? null)) {
        ready = false;
        reason = 'KEY_CONTENT_NOT_READY';
      } else if (!activeVersionIds.has(literatureId)) {
        ready = false;
        reason = 'INDEX_NOT_ACTIVE';
      }
      const staleStage = staleIndexedByLiterature.get(literatureId) ?? null;
      readiness.set(literatureId, {
        ready,
        reason,
        freshness: staleStage ? 'stale' : 'fresh',
        freshness_detail: staleStage
          ? {
            reason_code: typeof staleStage.detail.reason_code === 'string' ? staleStage.detail.reason_code : 'INDEX_STALE',
            reason_message: typeof staleStage.detail.reason_message === 'string'
              ? staleStage.detail.reason_message
              : 'Active index is stale and may not reflect latest content.',
          }
          : null,
      });
    }
    return readiness;
  }

  async resolveTopicEvidenceActiveLiteratureIds(topicId: string): Promise<Set<string>> {
    const scopes = await this.repository.listTopicScopesByTopicId(topicId);
    return new Set(
      scopes
        .filter((scope) => isLiteratureTopicActiveStatus(scope.activationStatus))
        .map((scope) => scope.literatureId),
    );
  }

  async resolveTopicAutomaticProcessingLiteratureIds(topicId: string): Promise<Set<string>> {
    const scopes = await this.repository.listTopicScopesByTopicId(topicId);
    return new Set(
      scopes
        .filter((scope) => isLiteratureAutomaticProcessingActivationStatus(scope.activationStatus))
        .map((scope) => scope.literatureId),
    );
  }

  async resolvePaperEvidenceCandidateLiteratureIds(paperId: string): Promise<Set<string>> {
    const links = await this.repository.listPaperLiteratureLinksByPaperId(paperId);
    const activeTopicPairs = await this.resolveTopicLiteraturePairs(
      links,
      isLiteratureTopicActiveStatus,
    );
    return new Set(
      links
        .filter((link) =>
          link.topicId
            ? activeTopicPairs.has(`${link.topicId}:${link.literatureId}`)
            : true)
        .map((link) => link.literatureId),
    );
  }

  async resolvePaperAutomaticProcessingLiteratureIds(paperId: string): Promise<Set<string>> {
    const links = await this.repository.listPaperLiteratureLinksByPaperId(paperId);
    const processableTopicPairs = await this.resolveTopicLiteraturePairs(
      links,
      isLiteratureAutomaticProcessingActivationStatus,
    );
    const globalLinkIds = links
      .filter((link) => !link.topicId)
      .map((link) => link.literatureId);
    const globalProcessableIds = await this.filterGlobalAutomaticProcessingLiteratureIds(globalLinkIds);
    return new Set(
      links
        .filter((link) =>
          link.topicId
            ? processableTopicPairs.has(`${link.topicId}:${link.literatureId}`)
            : globalProcessableIds.has(link.literatureId))
        .map((link) => link.literatureId),
    );
  }

  async filterGlobalAutomaticProcessingLiteratureIds(literatureIds: string[]): Promise<Set<string>> {
    const uniqueIds = [...new Set(literatureIds)];
    if (uniqueIds.length === 0) {
      return new Set();
    }
    const assessments = await this.repository.listQualityAssessmentsByLiteratureIds(uniqueIds);
    return new Set(
      assessments
        .filter((assessment) => isLiteratureActiveQualityStatus(assessment.qualityStatus))
        .map((assessment) => assessment.literatureId),
    );
  }

  // T-130 W-05: consumer of resolveRetrievalReadiness — kept for call-site compatibility.
  async filterEvidenceReadyLiteratureIds(literatureIds: string[]): Promise<Set<string>> {
    const readiness = await this.resolveRetrievalReadiness(literatureIds);
    return new Set([...readiness.entries()].filter(([, entry]) => entry.ready).map(([id]) => id));
  }

  private isQualityActive(record: LiteratureQualityAssessmentRecord | null): boolean {
    return isLiteratureActiveQualityStatus(record?.qualityStatus);
  }

  private isPipelineReady(record: LiteraturePipelineStateRecord | null): boolean {
    return Boolean(record?.keyContentReady);
  }

  private async resolveTopicLiteraturePairs(
    links: Array<{ topicId: string | null; literatureId: string }>,
    predicate: (status: string | null | undefined) => boolean,
  ): Promise<Set<string>> {
    const topicIds = [...new Set(links.flatMap((link) => (link.topicId ? [link.topicId] : [])))];
    const pairs = new Set<string>();
    for (const topicId of topicIds) {
      const scopes = await this.repository.listTopicScopesByTopicId(topicId);
      for (const scope of scopes) {
        if (predicate(scope.activationStatus)) {
          pairs.add(`${topicId}:${scope.literatureId}`);
        }
      }
    }
    return pairs;
  }
}

// T-130 W-05 (D7): single-source retrieval readiness with explicit freshness.
export type LiteratureRetrievalReadiness = {
  ready: boolean;
  reason: string;
  freshness: 'fresh' | 'stale';
  freshness_detail: { reason_code: string; reason_message: string } | null;
};
