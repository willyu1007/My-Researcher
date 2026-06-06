import crypto from 'node:crypto';
import type {
  LiteratureClusterCandidateGenerationRequest,
  LiteratureClusterCandidateGenerationResponse,
  LiteratureClusterConsumptionScope,
  LiteratureClusterDTO,
  LiteratureClusterEvidenceDTO,
  LiteratureClusterMemberDTO,
  LiteratureClusterReviewDTO,
  LiteratureClusterReviewOutcome,
  ListLiteratureClustersQuery,
  ListLiteratureClustersResponse,
  UpdateLiteratureClusterRequest,
  UpdateLiteratureClusterResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureClusterEvidenceRecord,
  LiteratureEmbeddingRetrievalVectorChunkRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureClusterGraphRecord,
  LiteratureClusterMemberRecord,
  LiteratureClusterRecord,
  LiteratureContentAssetRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import {
  buildLiteratureTitleAuthorsYearHash,
  buildLiteratureWorkIdentity,
  normalizeLiteratureAuthors,
  normalizeLiteratureTitle,
} from './literature-work-identity.js';

type CandidateDraft = {
  clusterType: LiteratureClusterRecord['clusterType'];
  relationType: LiteratureClusterMemberRecord['relationType'];
  signalType: LiteratureClusterEvidenceRecord['signalType'];
  method: string;
  confidence: number;
  literatureIds: string[];
  payload: Record<string, unknown>;
};

type CandidateSummary = LiteratureClusterCandidateGenerationResponse['summary'];

const DEFAULT_MIN_CONFIDENCE = 0.82;
const DEFAULT_SEMANTIC_MIN_CONFIDENCE = 0.86;
const CLUSTER_METHOD = 'deterministic_dedup_cluster_v1';
const SEMANTIC_CLUSTER_METHOD = 'embedding_semantic_cluster_v1';

export class LiteratureClusterService {
  constructor(private readonly repository: LiteratureRepository) {}

  async generateCandidates(
    request: LiteratureClusterCandidateGenerationRequest = {},
  ): Promise<LiteratureClusterCandidateGenerationResponse> {
    const minConfidence = this.normalizeConfidence(request.min_confidence, DEFAULT_MIN_CONFIDENCE);
    const allowedTypes = new Set(request.cluster_types ?? ['same_work', 'version_family']);
    const includeExisting = request.include_existing !== false;
    const literatures = await this.repository.listLiteratures();
    const literatureById = new Map(literatures.map((item) => [item.id, item]));
    const assetsByLiterature = await this.loadAssetsByLiterature(literatures);
    const documentsByLiterature = await this.loadDocumentsByLiterature(literatures);
    const semanticMinConfidence = this.normalizeConfidence(request.min_confidence, DEFAULT_SEMANTIC_MIN_CONFIDENCE);
    const drafts = [
      ...this.buildChecksumGroupDrafts(literatures, assetsByLiterature),
      ...this.buildNormalizedTextGroupDrafts(literatures, documentsByLiterature),
      ...this.buildTitleAuthorYearDrafts(literatures),
      ...this.buildFuzzyDrafts(literatures, minConfidence),
      ...(allowedTypes.has('related_topic')
        ? await this.buildEmbeddingSimilarityDrafts(literatures, semanticMinConfidence)
        : []),
    ].filter((draft) => allowedTypes.has(draft.clusterType) && draft.confidence >= minConfidence);

    const existingByClusterId = new Map(
      (await this.repository.listLiteratureClusters()).map((graph) => [graph.cluster.id, graph]),
    );
    const persisted: LiteratureClusterGraphRecord[] = [];
    for (const draft of drafts) {
      const graph = this.toGraphDraft(draft, literatureById);
      const existing = existingByClusterId.get(graph.cluster.id);
      if (existing) {
        if (includeExisting) {
          persisted.push(existing);
        }
        continue;
      }
      persisted.push(await this.repository.upsertLiteratureCluster(graph.cluster, graph.members, graph.evidence));
    }

    return {
      generated_count: persisted.length,
      clusters: persisted.map((graph) => this.toDTO(graph, literatureById)),
      summary: this.summarizeGraphs(persisted),
    };
  }

  async listClusters(query: ListLiteratureClustersQuery = {}): Promise<ListLiteratureClustersResponse> {
    const graphs = await this.repository.listLiteratureClusters({
      status: query.status,
      clusterType: query.cluster_type,
      literatureId: query.literature_id,
      limit: this.normalizeLimit(query.limit),
    });
    const literatureById = await this.loadLiteratureMapForGraphs(graphs);
    return {
      items: graphs.map((graph) => this.toDTO(graph, literatureById)),
    };
  }

  async updateCluster(clusterId: string, request: UpdateLiteratureClusterRequest): Promise<UpdateLiteratureClusterResponse> {
    const existing = await this.repository.findLiteratureClusterById(clusterId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Literature cluster ${clusterId} was not found.`);
    }

    const now = new Date().toISOString();
    const requestedMemberPatches: Array<{
      literature_id: string;
      decision_status?: 'pending' | 'accepted' | 'rejected';
      role?: 'representative' | 'variant' | 'related';
    }> = request.member_decisions
      ?? (request.status === 'confirmed'
        ? existing.members.map((member) => ({
            literature_id: member.literatureId,
            decision_status: 'accepted' as const,
          }))
        : request.status === 'rejected' || request.status === 'split'
          ? existing.members.map((member) => ({
              literature_id: member.literatureId,
              decision_status: 'rejected' as const,
            }))
        : []);
    const representativeId = request.representative_literature_id === undefined
      ? undefined
      : request.representative_literature_id;
    if (representativeId && !existing.members.some((member) => member.literatureId === representativeId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'representative_literature_id must be a cluster member.');
    }

    const patchByLiteratureId = new Map<string, {
      literature_id: string;
      decision_status?: 'pending' | 'accepted' | 'rejected';
      role?: 'representative' | 'variant' | 'related';
    }>();
    for (const patch of requestedMemberPatches) {
      if (!existing.members.some((member) => member.literatureId === patch.literature_id)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Literature ${patch.literature_id} is not a cluster member.`);
      }
      if (patchByLiteratureId.has(patch.literature_id)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Duplicate member decision for literature ${patch.literature_id}.`);
      }
      if (representativeId && patch.role) {
        if (patch.literature_id === representativeId && patch.role !== 'representative') {
          throw new AppError(400, 'INVALID_PAYLOAD', 'representative_literature_id must have role representative.');
        }
        if (patch.literature_id !== representativeId && patch.role === 'representative') {
          throw new AppError(400, 'INVALID_PAYLOAD', 'Only representative_literature_id can have role representative.');
        }
      }
      patchByLiteratureId.set(patch.literature_id, patch);
    }

    const effectiveRepresentativeId = representativeId === undefined
      ? existing.cluster.representativeLiteratureId
      : representativeId;
    for (const patch of patchByLiteratureId.values()) {
      if (patch.role === 'representative' && patch.literature_id !== effectiveRepresentativeId) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Only the effective representative_literature_id can have role representative.');
      }
    }
    if (effectiveRepresentativeId) {
      const nonRepresentativeRole = existing.cluster.clusterType === 'related_topic' ? 'related' : 'variant';
      for (const member of existing.members) {
        const patch = patchByLiteratureId.get(member.literatureId) ?? { literature_id: member.literatureId };
        if (member.literatureId === effectiveRepresentativeId) {
          patch.role = 'representative';
        } else if (member.role === 'representative' || patch.role === 'representative') {
          patch.role = nonRepresentativeRole;
        }
        patchByLiteratureId.set(member.literatureId, patch);
      }
    }

    const nextGraph = this.previewClusterUpdate(existing, {
      status: request.status,
      representativeLiteratureId: representativeId,
      patchByLiteratureId,
      updatedAt: now,
    });
    this.validateReviewRequest(nextGraph, request.review_outcome);

    for (const patch of patchByLiteratureId.values()) {
      await this.repository.updateLiteratureClusterMember(clusterId, patch.literature_id, {
        role: patch.role,
        decisionStatus: patch.decision_status,
        updatedAt: now,
      });
    }

    const graph = await this.repository.updateLiteratureCluster(clusterId, {
      status: request.status,
      representativeLiteratureId: representativeId,
      updatedAt: now,
    });
    const literatureById = await this.loadLiteratureMapForGraphs([graph]);
    return {
      item: this.toDTO(graph, literatureById),
    };
  }

  private previewClusterUpdate(
    existing: LiteratureClusterGraphRecord,
    patch: {
      status?: LiteratureClusterRecord['status'];
      representativeLiteratureId?: string | null;
      patchByLiteratureId: Map<string, {
        literature_id: string;
        decision_status?: 'pending' | 'accepted' | 'rejected';
        role?: 'representative' | 'variant' | 'related';
      }>;
      updatedAt: string;
    },
  ): LiteratureClusterGraphRecord {
    return {
      cluster: {
        ...existing.cluster,
        status: patch.status ?? existing.cluster.status,
        representativeLiteratureId: patch.representativeLiteratureId !== undefined
          ? patch.representativeLiteratureId
          : existing.cluster.representativeLiteratureId,
        updatedAt: patch.updatedAt,
      },
      members: existing.members.map((member) => {
        const memberPatch = patch.patchByLiteratureId.get(member.literatureId);
        return {
          ...member,
          role: memberPatch?.role ?? member.role,
          decisionStatus: memberPatch?.decision_status ?? member.decisionStatus,
          updatedAt: memberPatch ? patch.updatedAt : member.updatedAt,
        };
      }),
      evidence: existing.evidence,
    };
  }

  private validateReviewRequest(
    graph: LiteratureClusterGraphRecord,
    requestedOutcome: LiteratureClusterReviewOutcome | undefined,
  ): void {
    const review = this.buildReviewSummary(graph);
    if (requestedOutcome && requestedOutcome !== review.outcome) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `review_outcome ${requestedOutcome} does not match cluster review outcome ${review.outcome}.`,
      );
    }
    if (graph.cluster.status === 'confirmed' && review.accepted_member_count < 2) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Confirmed clusters require at least two accepted members.');
    }
    if (graph.cluster.status === 'confirmed' && review.pending_member_count > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Confirmed clusters require every member decision to be resolved.');
    }
    if (graph.cluster.status === 'confirmed' && !graph.cluster.representativeLiteratureId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Confirmed clusters require a representative_literature_id.');
    }
    if (graph.cluster.status === 'confirmed') {
      const representative = graph.members.find((member) => member.literatureId === graph.cluster.representativeLiteratureId);
      if (!representative || representative.decisionStatus !== 'accepted') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Confirmed cluster representative must be accepted.');
      }
    }
    if (
      (graph.cluster.status === 'rejected' || graph.cluster.status === 'split')
      && (review.accepted_member_count > 0 || review.pending_member_count > 0)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Rejected or split clusters require all member decisions to be rejected.');
    }
  }

  private async loadAssetsByLiterature(
    literatures: LiteratureRecord[],
  ): Promise<Map<string, LiteratureContentAssetRecord[]>> {
    const rows = await Promise.all(literatures.map(async (literature) => [
      literature.id,
      await this.repository.listContentAssetsByLiteratureId(literature.id),
    ] as const));
    return new Map(rows);
  }

  private async loadDocumentsByLiterature(
    literatures: LiteratureRecord[],
  ): Promise<Map<string, LiteratureFulltextDocumentRecord[]>> {
    const rows = await Promise.all(literatures.map(async (literature) => [
      literature.id,
      await this.repository.listFulltextDocumentsByLiteratureId(literature.id),
    ] as const));
    return new Map(rows);
  }

  private buildChecksumGroupDrafts(
    literatures: LiteratureRecord[],
    assetsByLiterature: Map<string, LiteratureContentAssetRecord[]>,
  ): CandidateDraft[] {
    const byChecksum = new Map<string, string[]>();
    for (const literature of literatures) {
      for (const asset of assetsByLiterature.get(literature.id) ?? []) {
        if (asset.assetKind !== 'raw_fulltext' || !['registered', 'ready'].includes(asset.status)) {
          continue;
        }
        const checksum = asset.checksum.trim();
        if (!checksum) {
          continue;
        }
        byChecksum.set(checksum, [...new Set([...(byChecksum.get(checksum) ?? []), literature.id])]);
      }
    }
    return [...byChecksum.entries()]
      .filter(([, literatureIds]) => literatureIds.length > 1)
      .map(([checksum, literatureIds]) => {
        return {
          clusterType: 'same_work',
          relationType: 'same_pdf',
          signalType: 'pdf_sha256',
          method: CLUSTER_METHOD,
          confidence: 0.99,
          literatureIds,
          payload: { checksum },
        };
      });
  }

  private buildNormalizedTextGroupDrafts(
    literatures: LiteratureRecord[],
    documentsByLiterature: Map<string, LiteratureFulltextDocumentRecord[]>,
  ): CandidateDraft[] {
    const byChecksum = new Map<string, string[]>();
    for (const literature of literatures) {
      for (const document of documentsByLiterature.get(literature.id) ?? []) {
        const checksum = document.normalizedTextChecksum.trim();
        if (!checksum || !['READY', 'PARTIAL_READY'].includes(document.status)) {
          continue;
        }
        byChecksum.set(checksum, [...new Set([...(byChecksum.get(checksum) ?? []), literature.id])]);
      }
    }
    return [...byChecksum.entries()]
      .filter(([, literatureIds]) => literatureIds.length > 1)
      .map(([checksum, literatureIds]) => {
        return {
          clusterType: 'same_work',
          relationType: 'same_normalized_text',
          signalType: 'text_fingerprint',
          method: CLUSTER_METHOD,
          confidence: 0.98,
          literatureIds,
          payload: { normalized_text_checksum: checksum },
        };
      });
  }

  private buildTitleAuthorYearDrafts(literatures: LiteratureRecord[]): CandidateDraft[] {
    const byHash = new Map<string, string[]>();
    for (const literature of literatures) {
      const hash = literature.titleAuthorsYearHash
        ?? buildLiteratureTitleAuthorsYearHash(literature.title, literature.authors, literature.year);
      if (!hash) {
        continue;
      }
      byHash.set(hash, [...(byHash.get(hash) ?? []), literature.id]);
    }
    return [...byHash.entries()]
      .filter(([, literatureIds]) => new Set(literatureIds).size > 1)
      .map(([hash, literatureIds]) => {
        return {
          clusterType: 'same_work',
          relationType: 'same_work',
          signalType: 'title_author_year',
          method: CLUSTER_METHOD,
          confidence: 0.95,
          literatureIds: [...new Set(literatureIds)],
          payload: { title_authors_year_hash: hash },
        };
      });
  }

  private buildFuzzyDrafts(
    literatures: LiteratureRecord[],
    minConfidence: number,
  ): CandidateDraft[] {
    const drafts: CandidateDraft[] = [];
    for (let leftIndex = 0; leftIndex < literatures.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < literatures.length; rightIndex += 1) {
        const left = literatures[leftIndex]!;
        const right = literatures[rightIndex]!;
        if (this.hasIdentifierConflict(left, right)) {
          continue;
        }
        const titleScore = this.jaccard(this.tokenizeTitle(left.title), this.tokenizeTitle(right.title));
        const authorScore = this.jaccard(normalizeLiteratureAuthors(left.authors), normalizeLiteratureAuthors(right.authors));
        const yearScore = this.yearScore(left.year, right.year);
        const abstractScore = this.abstractScore(left.abstractText, right.abstractText);
        const confidence = Number((
          (titleScore * 0.48)
          + (authorScore * 0.32)
          + (yearScore * 0.12)
          + (abstractScore * 0.08)
        ).toFixed(4));
        if (confidence < minConfidence) {
          continue;
        }
        drafts.push({
          clusterType: 'same_work',
          relationType: 'near_duplicate',
          signalType: 'title_similarity',
          method: CLUSTER_METHOD,
          confidence,
          literatureIds: [left.id, right.id],
          payload: {
            title_score: titleScore,
            author_score: authorScore,
            year_score: yearScore,
            abstract_score: abstractScore,
          },
        });
      }
    }
    return drafts;
  }

  private async buildEmbeddingSimilarityDrafts(
    literatures: LiteratureRecord[],
    minConfidence: number,
  ): Promise<CandidateDraft[]> {
    const literatureIds = new Set(literatures.map((item) => item.id));
    const staleIndexedLiteratureIds = new Set(
      (await this.repository.listPipelineStageStatesByLiteratureIds([...literatureIds]))
        .filter((stage) => stage.stageCode === 'INDEXED' && stage.status === 'STALE')
        .map((stage) => stage.literatureId),
    );
    const activeVersions = (await this.repository.listActiveEmbeddingVersions())
      .filter((version) =>
        literatureIds.has(version.literatureId)
        && version.status === 'INDEXED'
        && !staleIndexedLiteratureIds.has(version.literatureId),
      );
    if (activeVersions.length < 2) {
      return [];
    }

    const chunks = await this.repository.listEmbeddingRetrievalVectorChunksByEmbeddingVersionIds(
      activeVersions.map((version) => version.id),
    );
    const chunksByVersionId = new Map<string, LiteratureEmbeddingRetrievalVectorChunkRecord[]>();
    for (const chunk of chunks) {
      if (chunk.vector.length === 0) {
        continue;
      }
      const rows = chunksByVersionId.get(chunk.embeddingVersionId) ?? [];
      rows.push(chunk);
      chunksByVersionId.set(chunk.embeddingVersionId, rows);
    }

    const centroidRows = activeVersions.flatMap((version) => {
      const versionChunks = chunksByVersionId.get(version.id) ?? [];
      const centroid = this.vectorCentroid(versionChunks.map((chunk) => chunk.vector));
      return centroid
        ? [{
            version,
            centroid,
            chunkCount: versionChunks.length,
          }]
        : [];
    });
    const literatureById = new Map(literatures.map((item) => [item.id, item]));
    const drafts: CandidateDraft[] = [];
    for (let leftIndex = 0; leftIndex < centroidRows.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < centroidRows.length; rightIndex += 1) {
        const left = centroidRows[leftIndex]!;
        const right = centroidRows[rightIndex]!;
        const leftLiterature = literatureById.get(left.version.literatureId);
        const rightLiterature = literatureById.get(right.version.literatureId);
        if (!leftLiterature || !rightLiterature || this.hasStrongSameWorkSignal(leftLiterature, rightLiterature)) {
          continue;
        }
        const similarity = this.normalizedCosine(left.centroid, right.centroid);
        if (similarity < minConfidence) {
          continue;
        }
        drafts.push({
          clusterType: 'related_topic',
          relationType: 'related_method',
          signalType: 'embedding_similarity',
          method: SEMANTIC_CLUSTER_METHOD,
          confidence: similarity,
          literatureIds: [left.version.literatureId, right.version.literatureId],
          payload: {
            similarity,
            left_embedding_version_id: left.version.id,
            right_embedding_version_id: right.version.id,
            left_chunk_count: left.chunkCount,
            right_chunk_count: right.chunkCount,
            provider: this.sharedEmbeddingProvider(left.version, right.version),
            model: this.sharedEmbeddingModel(left.version, right.version),
            dimension: left.centroid.length,
          },
        });
      }
    }
    return drafts;
  }

  private summarizeGraphs(graphs: LiteratureClusterGraphRecord[]): CandidateSummary {
    const summary: CandidateSummary = {
      same_pdf_count: 0,
      same_normalized_text_count: 0,
      title_author_year_count: 0,
      fuzzy_near_duplicate_count: 0,
      embedding_similarity_count: 0,
    };
    for (const graph of graphs) {
      const signalTypes = new Set(graph.evidence.map((item) => item.signalType));
      const relationTypes = new Set(graph.members.map((item) => item.relationType));
      if (signalTypes.has('pdf_sha256')) {
        summary.same_pdf_count += 1;
      } else if (signalTypes.has('text_fingerprint')) {
        summary.same_normalized_text_count += 1;
      } else if (signalTypes.has('title_author_year')) {
        summary.title_author_year_count += 1;
      } else if (relationTypes.has('near_duplicate')) {
        summary.fuzzy_near_duplicate_count += 1;
      } else if (signalTypes.has('embedding_similarity')) {
        summary.embedding_similarity_count += 1;
      }
    }
    return summary;
  }

  private toGraphDraft(draft: CandidateDraft, literatureById: Map<string, LiteratureRecord>): LiteratureClusterGraphRecord {
    const literatureIds = [...new Set(draft.literatureIds)].sort();
    const representativeId = this.selectRepresentative(literatureIds, literatureById);
    const now = new Date().toISOString();
    const clusterId = `LCL-${this.hash(`${draft.method}|${draft.signalType}|${literatureIds.join('|')}`).slice(0, 24)}`;
    const cluster: LiteratureClusterRecord = {
      id: clusterId,
      clusterType: draft.clusterType,
      status: 'candidate',
      representativeLiteratureId: representativeId,
      confidence: draft.confidence,
      method: draft.method,
      createdAt: now,
      updatedAt: now,
    };
    const members = literatureIds.map((literatureId): LiteratureClusterMemberRecord => ({
      id: `${clusterId}:member:${literatureId}`,
      clusterId,
      literatureId,
      role: literatureId === representativeId
        ? 'representative'
        : draft.clusterType === 'related_topic'
          ? 'related'
          : 'variant',
      relationType: draft.relationType,
      confidence: draft.confidence,
      decisionStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    }));
    const evidence = this.pairs(literatureIds).map(([left, right]) => ({
      id: `${clusterId}:evidence:${left}:${right}:${draft.signalType}`,
      clusterId,
      literatureIdA: left,
      literatureIdB: right,
      signalType: draft.signalType,
      score: draft.confidence,
      payload: draft.payload,
      createdAt: now,
    }));
    return { cluster, members, evidence };
  }

  private selectRepresentative(literatureIds: string[], literatureById: Map<string, LiteratureRecord>): string | null {
    return [...literatureIds].sort((leftId, rightId) => {
      const left = literatureById.get(leftId);
      const right = literatureById.get(rightId);
      const leftStrength = left ? this.identityStrength(left) : 0;
      const rightStrength = right ? this.identityStrength(right) : 0;
      if (leftStrength !== rightStrength) {
        return rightStrength - leftStrength;
      }
      return leftId.localeCompare(rightId);
    })[0] ?? null;
  }

  private identityStrength(literature: LiteratureRecord): number {
    const identity = buildLiteratureWorkIdentity({
      id: literature.id,
      title: literature.title,
      authors: literature.authors,
      year: literature.year,
      doiNormalized: literature.doiNormalized,
      arxivId: literature.arxivId,
      titleAuthorsYearHash: literature.titleAuthorsYearHash,
    });
    if (identity.dedupCandidate.doiNormalized) {
      return 3;
    }
    if (identity.dedupCandidate.arxivId) {
      return 2;
    }
    if (identity.dedupCandidate.titleAuthorsYearHash) {
      return 1;
    }
    return 0;
  }

  private async loadLiteratureMapForGraphs(graphs: LiteratureClusterGraphRecord[]): Promise<Map<string, LiteratureRecord>> {
    const ids = [...new Set(graphs.flatMap((graph) => graph.members.map((member) => member.literatureId)))];
    return new Map((await this.repository.listLiteraturesByIds(ids)).map((literature) => [literature.id, literature]));
  }

  private toDTO(graph: LiteratureClusterGraphRecord, literatureById: Map<string, LiteratureRecord>): LiteratureClusterDTO {
    return {
      cluster_id: graph.cluster.id,
      cluster_type: graph.cluster.clusterType,
      status: graph.cluster.status,
      representative_literature_id: graph.cluster.representativeLiteratureId,
      confidence: graph.cluster.confidence,
      method: graph.cluster.method,
      created_at: graph.cluster.createdAt,
      updated_at: graph.cluster.updatedAt,
      review: this.buildReviewSummary(graph),
      members: graph.members.map((member): LiteratureClusterMemberDTO => {
        const literature = literatureById.get(member.literatureId);
        return {
          member_id: member.id,
          cluster_id: member.clusterId,
          literature_id: member.literatureId,
          role: member.role,
          relation_type: member.relationType,
          confidence: member.confidence,
          decision_status: member.decisionStatus,
          title: literature?.title ?? null,
          canonical_work_key: literature ? buildLiteratureWorkIdentity({
            id: literature.id,
            title: literature.title,
            authors: literature.authors,
            year: literature.year,
            doiNormalized: literature.doiNormalized,
            arxivId: literature.arxivId,
            titleAuthorsYearHash: literature.titleAuthorsYearHash,
          }).canonicalWorkKey : null,
          created_at: member.createdAt,
          updated_at: member.updatedAt,
        };
      }),
      evidence: graph.evidence.map((evidence): LiteratureClusterEvidenceDTO => ({
        evidence_id: evidence.id,
        cluster_id: evidence.clusterId,
        literature_id_a: evidence.literatureIdA,
        literature_id_b: evidence.literatureIdB,
        signal_type: evidence.signalType,
        score: evidence.score,
        payload: evidence.payload,
        created_at: evidence.createdAt,
      })),
    };
  }

  private buildReviewSummary(graph: LiteratureClusterGraphRecord): LiteratureClusterReviewDTO {
    const acceptedMemberCount = graph.members.filter((member) => member.decisionStatus === 'accepted').length;
    const rejectedMemberCount = graph.members.filter((member) => member.decisionStatus === 'rejected').length;
    const pendingMemberCount = graph.members.filter((member) => member.decisionStatus === 'pending').length;
    const blockingReasons: string[] = [];
    const representativeAccepted = Boolean(
      graph.cluster.representativeLiteratureId
      && graph.members.some((member) =>
        member.literatureId === graph.cluster.representativeLiteratureId
        && member.decisionStatus === 'accepted'),
    );
    const reviewComplete = pendingMemberCount === 0;
    const retrievalDedupActive = graph.cluster.status === 'confirmed'
      && graph.cluster.clusterType === 'same_work'
      && acceptedMemberCount >= 2
      && representativeAccepted
      && reviewComplete;
    let consumptionScope: LiteratureClusterConsumptionScope = 'none';
    if (retrievalDedupActive) {
      consumptionScope = 'retrieval_dedup';
    } else if (
      graph.cluster.status === 'confirmed'
      && graph.cluster.clusterType === 'related_topic'
      && acceptedMemberCount >= 2
      && representativeAccepted
      && reviewComplete
    ) {
      consumptionScope = 'related_topic_reference';
    }
    const reviewRequired = graph.cluster.status === 'candidate' || pendingMemberCount > 0;

    if (graph.cluster.status === 'candidate') {
      blockingReasons.push('CANDIDATE_NOT_REVIEWED');
    }
    if (graph.cluster.status === 'confirmed' && graph.cluster.clusterType === 'same_work' && acceptedMemberCount < 2) {
      blockingReasons.push('INSUFFICIENT_ACCEPTED_MEMBERS_FOR_DEDUP');
    }
    if (graph.cluster.status === 'confirmed' && !graph.cluster.representativeLiteratureId) {
      blockingReasons.push('REPRESENTATIVE_REQUIRED');
    }
    if (graph.cluster.status === 'confirmed' && graph.cluster.representativeLiteratureId && !representativeAccepted) {
      blockingReasons.push('REPRESENTATIVE_NOT_ACCEPTED');
    }
    if (graph.cluster.status === 'confirmed' && graph.cluster.clusterType === 'related_topic') {
      blockingReasons.push('RELATED_TOPIC_NOT_DEDUP_SIGNAL');
    }
    if (pendingMemberCount > 0) {
      blockingReasons.push('PENDING_MEMBER_DECISIONS');
    }

    return {
      outcome: this.reviewOutcomeFor(graph),
      consumption_scope: consumptionScope,
      retrieval_dedup_active: retrievalDedupActive,
      review_required: reviewRequired,
      accepted_member_count: acceptedMemberCount,
      rejected_member_count: rejectedMemberCount,
      pending_member_count: pendingMemberCount,
      blocking_reasons: blockingReasons,
    };
  }

  private reviewOutcomeFor(graph: LiteratureClusterGraphRecord): LiteratureClusterReviewOutcome {
    if (graph.cluster.status === 'confirmed') {
      if (graph.cluster.clusterType === 'related_topic') {
        return 'related_topic_confirmed';
      }
      if (graph.cluster.clusterType === 'version_family') {
        return 'version_family_confirmed';
      }
      return 'same_work_confirmed';
    }
    if (graph.cluster.status === 'rejected') {
      return 'rejected';
    }
    if (graph.cluster.status === 'split') {
      return 'split';
    }
    return 'pending_review';
  }

  private hasIdentifierConflict(left: LiteratureRecord, right: LiteratureRecord): boolean {
    return Boolean(
      (left.doiNormalized && right.doiNormalized && left.doiNormalized !== right.doiNormalized)
      || (left.arxivId && right.arxivId && left.arxivId !== right.arxivId),
    );
  }

  private hasStrongSameWorkSignal(left: LiteratureRecord, right: LiteratureRecord): boolean {
    return Boolean(
      (left.doiNormalized && right.doiNormalized && left.doiNormalized === right.doiNormalized)
      || (left.arxivId && right.arxivId && left.arxivId === right.arxivId)
      || (left.titleAuthorsYearHash && right.titleAuthorsYearHash && left.titleAuthorsYearHash === right.titleAuthorsYearHash),
    );
  }

  private tokenizeTitle(value: string): string[] {
    return normalizeLiteratureTitle(value)
      .split(' ')
      .filter((token) => token.length > 1);
  }

  private abstractScore(left: string | null, right: string | null): number {
    if (!left || !right) {
      return 0;
    }
    return this.jaccard(this.tokenizeTitle(left), this.tokenizeTitle(right));
  }

  private yearScore(left: number | null, right: number | null): number {
    if (!left || !right) {
      return 0;
    }
    const delta = Math.abs(left - right);
    if (delta === 0) {
      return 1;
    }
    if (delta === 1) {
      return 0.75;
    }
    return 0;
  }

  private jaccard(left: string[], right: string[]): number {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    if (leftSet.size === 0 || rightSet.size === 0) {
      return 0;
    }
    const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
    const union = new Set([...leftSet, ...rightSet]).size;
    return Number((intersection / union).toFixed(4));
  }

  private vectorCentroid(vectors: number[][]): number[] | null {
    const firstDimension = vectors[0]?.length ?? 0;
    const compatible = vectors.filter((vector) => vector.length > 0 && vector.length === firstDimension);
    if (firstDimension === 0 || compatible.length === 0) {
      return null;
    }
    const sums = Array.from({ length: firstDimension }, () => 0);
    for (const vector of compatible) {
      for (const [index, value] of vector.entries()) {
        sums[index] += value;
      }
    }
    return sums.map((sum) => sum / compatible.length);
  }

  private normalizedCosine(left: number[], right: number[]): number {
    if (left.length === 0 || left.length !== right.length) {
      return 0;
    }
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
      const leftValue = left[index]!;
      const rightValue = right[index]!;
      dot += leftValue * rightValue;
      leftNorm += leftValue * leftValue;
      rightNorm += rightValue * rightValue;
    }
    if (leftNorm === 0 || rightNorm === 0) {
      return 0;
    }
    return Number((((dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))) + 1) / 2).toFixed(4));
  }

  private sharedEmbeddingProvider(
    left: LiteratureEmbeddingVersionRecord,
    right: LiteratureEmbeddingVersionRecord,
  ): string | null {
    return left.provider === right.provider ? left.provider : null;
  }

  private sharedEmbeddingModel(
    left: LiteratureEmbeddingVersionRecord,
    right: LiteratureEmbeddingVersionRecord,
  ): string | null {
    return left.model === right.model ? left.model : null;
  }

  private pairs(ids: string[]): Array<[string, string]> {
    const result: Array<[string, string]> = [];
    for (let leftIndex = 0; leftIndex < ids.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < ids.length; rightIndex += 1) {
        result.push([ids[leftIndex]!, ids[rightIndex]!]);
      }
    }
    return result;
  }

  private normalizeConfidence(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : fallback;
  }

  private normalizeLimit(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(1, Math.min(200, Math.trunc(value)))
      : 50;
  }

  private hash(value: string): string {
    return crypto.createHash('sha1').update(value).digest('hex');
  }
}
