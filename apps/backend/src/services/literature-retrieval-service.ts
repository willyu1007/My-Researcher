import type {
  LiteratureLlmCallTelemetryDTO,
  LiteratureRetrieveHit,
  LiteratureEmbeddingProfileId,
  LiteratureRetrieveProfileId,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureClusterGraphRecord,
  LiteratureEmbeddingChunkRecord,
  LiteratureEmbeddingVectorCandidateTelemetry,
  LiteratureEmbeddingVectorCandidateRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import type { ActiveEmbeddingProfileConfig, LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureEvidenceActivationService } from './literature-evidence-activation-service.js';
import { BackendLlmGateway } from './llm-gateway.js';
import type { LlmCallTelemetry } from './llm-gateway.js';
import {
  buildLiteratureWorkIdentity,
  selectCanonicalLiteratureWorkKey,
} from './literature-work-identity.js';

type RetrievalProfile = {
  profileId: LiteratureEmbeddingProfileId;
  provider: string;
  model: string;
  dimension: number;
};

type RetrievalProfileConfig = {
  vectorWeight: number;
  lexicalWeight: number;
  metadataWeight: number;
  chunkBoosts: Record<string, number>;
};

type QueryMatchContext = {
  rawQuery: string;
  tokens: string[];
  orderedTokens: string[];
  phrases: string[];
  fullPhrase: string | null;
  tokenWeights: Map<string, number>;
};

type LexicalScoreDetail = {
  score: number;
  tokenCoverageScore: number;
  weightedCoverageScore: number;
  phraseScore: number;
  matchedTokens: string[];
  missingTokens: string[];
  exactPhrases: string[];
};

type ScoredChunk = {
  literatureId: string;
  embeddingVersionId: string;
  chunk: LiteratureEmbeddingChunkRecord;
  hybridScore: number;
  vectorScore: number;
  lexicalScore: number;
  metadataScore: number;
  profileBoost: number;
  weightedVectorScore: number;
  weightedLexicalScore: number;
  weightedMetadataScore: number;
  lexicalDetail: LexicalScoreDetail;
  metadataDetail: LexicalScoreDetail;
  isStale: boolean;
  warnings: string[];
};

type LiteratureWorkIdentityMaps = {
  canonicalWorkKeyByLiteratureId: Map<string, string>;
  directIdentityKeysByLiteratureId: Map<string, Set<string>>;
};

type LiteratureRetrievalCandidateWindowSettings = {
  floor: number;
  unscoped_ceiling: number;
  scoped_ceiling: number;
  profile_multipliers: Record<LiteratureRetrieveProfileId, number>;
  per_literature_cap_min: number;
  per_literature_cap_max: number;
  query_timeout_ms: number;
};

const RETRIEVAL_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'of',
  'on',
  'or',
  'the',
  'to',
  'using',
  'with',
]);

const RETRIEVAL_PROFILE_CONFIGS: Record<LiteratureRetrieveProfileId, RetrievalProfileConfig> = {
  general: {
    vectorWeight: 0.6,
    lexicalWeight: 0.3,
    metadataWeight: 0.1,
    chunkBoosts: {
      abstract: 0.06,
      semantic_dossier: 0.05,
      evidence: 0.04,
    },
  },
  topic_exploration: {
    vectorWeight: 0.55,
    lexicalWeight: 0.25,
    metadataWeight: 0.2,
    chunkBoosts: {
      semantic_dossier: 0.12,
      abstract: 0.08,
      evidence: 0.06,
    },
  },
  paper_management: {
    vectorWeight: 0.45,
    lexicalWeight: 0.4,
    metadataWeight: 0.15,
    chunkBoosts: {
      abstract: 0.1,
      fulltext_section: 0.08,
      fulltext_paragraph: 0.05,
    },
  },
  writing_evidence: {
    vectorWeight: 0.55,
    lexicalWeight: 0.25,
    metadataWeight: 0.2,
    chunkBoosts: {
      evidence: 0.16,
      fulltext_paragraph: 0.1,
      figure: 0.08,
      table: 0.08,
    },
  },
};

const DEFAULT_PGVECTOR_CANDIDATE_WINDOW: LiteratureRetrievalCandidateWindowSettings = {
  floor: 200,
  unscoped_ceiling: 1200,
  scoped_ceiling: 2000,
  profile_multipliers: {
    general: 8,
    topic_exploration: 10,
    writing_evidence: 10,
    paper_management: 12,
  },
  per_literature_cap_min: 4,
  per_literature_cap_max: 12,
  query_timeout_ms: 5000,
};

export class LiteratureRetrievalService {
  private readonly queryEmbeddingCache = new Map<string, { vector: number[]; telemetry: LlmCallTelemetry }>();

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly settingsService?: LiteratureContentProcessingSettingsService,
    private readonly llmGateway: BackendLlmGateway = new BackendLlmGateway({ settingsService }),
    private readonly evidenceActivationService = new LiteratureEvidenceActivationService(repository),
  ) {}

  async retrieve(request: LiteratureRetrieveRequest): Promise<LiteratureRetrieveResponse> {
    const result = await this.retrieveFromPgvector(request, DEFAULT_PGVECTOR_CANDIDATE_WINDOW);
    return result.response;
  }

  private async retrieveFromPgvector(
    request: LiteratureRetrieveRequest,
    candidateWindowSettings: LiteratureRetrievalCandidateWindowSettings,
  ): Promise<{
    response: LiteratureRetrieveResponse;
    pgvector_telemetry: LiteratureEmbeddingVectorCandidateTelemetry;
  }> {
    const query = request.query.trim();
    if (!query) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'query cannot be empty.');
    }

    const profileId = this.normalizeProfile(request.profile);
    const topK = this.normalizeRange(request.top_k, 10, 1, 30);
    const evidencePerLiterature = this.normalizeRange(request.evidence_per_literature, 3, 1, 5);
    const activeEmbeddingProfile = await this.resolveActiveEmbeddingProfile();
    const resolvedVersions = await this.resolveCandidateVersions(request);
    const { compatibleVersions: candidateVersions, skippedProfiles } = this.filterVersionsByActiveProfile(
      resolvedVersions,
      activeEmbeddingProfile,
    );
    if (candidateVersions.length === 0) {
      return {
        response: await this.retrieveFromPgvectorCandidates(request, {
          candidateVersions: [],
          candidates: [],
          skippedProfiles,
          queryEmbeddingTelemetry: null,
        }),
        pgvector_telemetry: {
          candidateLimit: 0,
          candidateReturned: 0,
          candidateLimitHit: false,
          perLiteratureCandidateCap: 0,
          filteredEmbeddingVersionCount: 0,
          filteredChunkCount: 0,
          dbSimilarityQueryMs: 0,
        },
      };
    }

    const literatureIds = [...new Set(candidateVersions.map((version) => version.literatureId))];
    const staleWarnings = await this.resolveFreshnessWarnings(literatureIds, candidateVersions);
    const staleVersionIds = new Set(staleWarnings.map((warning) => warning.embedding_version_id));
    const includeStale = request.include_stale === true;
    const eligibleVersions = includeStale
      ? candidateVersions
      : candidateVersions.filter((version) => !staleVersionIds.has(version.id));
    const retrievalProfile = this.toRetrievalProfile(activeEmbeddingProfile, candidateVersions);
    const embeddedQuery = await this.embedQueryByProfile(query, retrievalProfile);
    const normalizedQueryVector = this.normalizeVector(embeddedQuery.vector, retrievalProfile.dimension);
    const candidateWindow = this.resolvePgvectorCandidateWindow(
      candidateWindowSettings,
      profileId,
      topK,
      evidencePerLiterature,
      Boolean(request.topic_id?.trim() || request.paper_id?.trim()),
    );

    // T-130 W-03 (D6): the DB-side statement_timeout (queryTimeoutMs) is the primary cancel —
    // it actually stops the Postgres query. The app-level race stays as a slightly-later
    // backstop (+1s) for non-DB stalls, so DB timeouts surface first with a structured code
    // instead of leaving an orphaned server-side query running.
    const result = await this.withPgvectorCandidateTimeout(this.repository.listEmbeddingVectorCandidates({
      normalizedQueryVector,
      eligibleEmbeddingVersionIds: eligibleVersions.map((version) => version.id),
      candidateLimit: candidateWindow.candidateLimit,
      perLiteratureCandidateCap: candidateWindow.perLiteratureCandidateCap,
      queryTimeoutMs: candidateWindowSettings.query_timeout_ms,
    }), candidateWindowSettings.query_timeout_ms + 1_000);
    const response = await this.retrieveFromPgvectorCandidates(request, {
      candidateVersions,
      candidates: result.candidates,
      skippedProfiles,
      queryEmbeddingTelemetry: this.toTelemetryDTO(embeddedQuery.telemetry),
    });
    return {
      response,
      pgvector_telemetry: result.telemetry,
    };
  }

  async retrieveFromPgvectorCandidates(
    request: LiteratureRetrieveRequest,
    input: {
      candidateVersions: LiteratureEmbeddingVersionRecord[];
      candidates: LiteratureEmbeddingVectorCandidateRecord[];
      queryEmbeddingTelemetry?: LiteratureLlmCallTelemetryDTO | null;
      skippedProfiles?: LiteratureRetrieveResponse['meta']['skipped_profiles'];
    },
  ): Promise<LiteratureRetrieveResponse> {
    const query = request.query.trim();
    if (!query) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'query cannot be empty.');
    }

    const queryContext = this.buildQueryMatchContext(query);
    const queryTokens = queryContext.tokens;
    const profileId = this.normalizeProfile(request.profile);
    const profileConfig = RETRIEVAL_PROFILE_CONFIGS[profileId];
    const topK = this.normalizeRange(request.top_k, 10, 1, 30);
    const evidencePerLiterature = this.normalizeRange(request.evidence_per_literature, 3, 1, 5);
    const includeStale = request.include_stale === true;

    if (input.candidateVersions.length === 0) {
      return {
        items: [],
        meta: {
          profile: profileId,
          query_tokens: queryTokens,
          degraded_mode: false,
          freshness_warnings: [],
          profiles_used: [],
          skipped_profiles: input.skippedProfiles ?? [],
          query_embedding_telemetry: input.queryEmbeddingTelemetry ?? null,
        },
      };
    }

    const literatureIds = [...new Set(input.candidateVersions.map((version) => version.literatureId))];
    const literatures = await this.repository.listLiteraturesByIds(literatureIds);
    const literatureById = new Map(literatures.map((item) => [item.id, item]));
    const confirmedSameWorkClusters = await this.repository.listLiteratureClusters({
      clusterType: 'same_work',
      status: 'confirmed',
      literatureIds,
    });
    const workIdentityMaps = this.buildWorkIdentityMaps(literatures, confirmedSameWorkClusters);
    const staleWarnings = await this.resolveFreshnessWarnings(literatureIds, input.candidateVersions);
    const staleByVersionId = new Map(staleWarnings.map((warning) => [warning.embedding_version_id, warning]));
    const versionById = new Map(input.candidateVersions.map((version) => [version.id, version]));
    const firstVersion = input.candidateVersions[0];
    const retrievalProfile = this.toRetrievalProfile({
      profileId: firstVersion?.profileId === 'economy' ? 'economy' : 'default',
      provider: firstVersion?.provider === 'dashscope' ? 'dashscope' : 'openai',
      model: firstVersion?.model ?? 'text-embedding-3-large',
      dimensions: firstVersion?.dimension ?? null,
    }, input.candidateVersions);

    const scoredChunks: ScoredChunk[] = [];
    for (const candidate of input.candidates) {
      const version = versionById.get(candidate.embeddingVersionId);
      if (!version) {
        continue;
      }
      const staleWarning = staleByVersionId.get(version.id);
      if (staleWarning && !includeStale) {
        continue;
      }
      const literature = literatureById.get(version.literatureId) ?? null;
      const lexicalDetail = this.lexicalScoreDetail(queryContext, candidate.text);
      const lexicalScore = lexicalDetail.score;
      const profileBoost = profileConfig.chunkBoosts[candidate.chunkType] ?? 0;
      const chunkForRerank: LiteratureEmbeddingChunkRecord = {
        ...candidate,
      };
      const metadataDetail = this.metadataScore(queryContext, chunkForRerank, literature, profileBoost);
      const metadataScore = metadataDetail.score;
      const weightedVectorScore = this.toScore(candidate.vectorScore * profileConfig.vectorWeight);
      const weightedLexicalScore = this.toScore(lexicalScore * profileConfig.lexicalWeight);
      const weightedMetadataScore = this.toScore(metadataScore * profileConfig.metadataWeight);
      const hybridScore = this.toScore(weightedVectorScore + weightedLexicalScore + weightedMetadataScore);
      scoredChunks.push({
        literatureId: version.literatureId,
        embeddingVersionId: version.id,
        chunk: chunkForRerank,
        hybridScore,
        vectorScore: candidate.vectorScore,
        lexicalScore,
        metadataScore,
        profileBoost,
        weightedVectorScore,
        weightedLexicalScore,
        weightedMetadataScore,
        lexicalDetail,
        metadataDetail,
        isStale: Boolean(staleWarning),
        warnings: staleWarning ? [staleWarning.reason_message] : [],
      });
    }

    const hits = this.dedupeHitsByCanonicalWork(this.buildHits(
      scoredChunks,
      literatureById,
      workIdentityMaps.canonicalWorkKeyByLiteratureId,
      evidencePerLiterature,
      profileId,
    ), workIdentityMaps.directIdentityKeysByLiteratureId)
      .sort((left, right) => {
        if (right.hybrid_score !== left.hybrid_score) {
          return right.hybrid_score - left.hybrid_score;
        }
        if (left.canonical_work_key !== right.canonical_work_key) {
          return left.canonical_work_key.localeCompare(right.canonical_work_key);
        }
        return left.literature_id.localeCompare(right.literature_id);
      })
      .slice(0, topK);

    return {
      items: hits,
      meta: {
        profile: profileId,
        query_tokens: queryTokens,
        degraded_mode: false,
        freshness_warnings: staleWarnings,
        profiles_used: [{
          provider: retrievalProfile.provider,
          model: retrievalProfile.model,
          dimension: retrievalProfile.dimension,
          literature_count: input.candidateVersions.length,
        }],
        skipped_profiles: input.skippedProfiles ?? [],
        query_embedding_telemetry: input.queryEmbeddingTelemetry ?? null,
      },
    };
  }

  private resolvePgvectorCandidateWindow(
    window: LiteratureRetrievalCandidateWindowSettings,
    profileId: LiteratureRetrieveProfileId,
    topK: number,
    evidencePerLiterature: number,
    isScoped: boolean,
  ): {
    candidateLimit: number;
    perLiteratureCandidateCap: number;
  } {
    const multiplier = window.profile_multipliers[profileId];
    const ceiling = isScoped ? window.scoped_ceiling : window.unscoped_ceiling;
    const rawLimit = topK * evidencePerLiterature * multiplier;
    const perLiteratureCandidateCap = this.clampInteger(
      evidencePerLiterature * 2,
      window.per_literature_cap_min,
      window.per_literature_cap_max,
    );
    return {
      candidateLimit: this.clampInteger(rawLimit, window.floor, ceiling),
      perLiteratureCandidateCap,
    };
  }

  private normalizeVector(vector: number[], expectedDimension: number): number[] {
    if (expectedDimension > 0 && vector.length !== expectedDimension) {
      throw new Error(`vector dimension mismatch: expected ${expectedDimension}, got ${vector.length}`);
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(magnitude) || magnitude === 0) {
      throw new Error('query vector cannot be normalized');
    }
    return vector.map((value) => value / magnitude);
  }

  private clampInteger(value: number, min: number, max: number): number {
    const lower = Math.max(1, Math.trunc(min));
    const upper = Math.max(lower, Math.trunc(max));
    return Math.max(lower, Math.min(upper, Math.trunc(value)));
  }

  private async withPgvectorCandidateTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = Math.max(1, Math.trunc(timeoutMs));
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_resolve, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`pgvector candidate query timed out after ${timeout}ms`));
          }, timeout);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async resolveCandidateVersions(request: LiteratureRetrieveRequest): Promise<LiteratureEmbeddingVersionRecord[]> {
    const topicId = request.topic_id?.trim();
    const paperId = request.paper_id?.trim();

    if (!topicId && !paperId) {
      const versions = await this.repository.listActiveEmbeddingVersions();
      return this.filterEvidenceReadyVersions(versions);
    }

    let scopedLiteratureIds: Set<string> | null = null;

    if (topicId) {
      scopedLiteratureIds = await this.evidenceActivationService.resolveTopicEvidenceActiveLiteratureIds(topicId);
    }

    if (paperId) {
      const paperIds = await this.evidenceActivationService.resolvePaperEvidenceCandidateLiteratureIds(paperId);
      if (scopedLiteratureIds === null) {
        scopedLiteratureIds = paperIds;
      } else {
        scopedLiteratureIds = new Set([...scopedLiteratureIds].filter((id) => paperIds.has(id)));
      }
    }

    const finalIds = [...(scopedLiteratureIds ?? new Set<string>())];
    if (finalIds.length === 0) {
      return [];
    }
    return this.filterEvidenceReadyVersions(await this.repository.listActiveEmbeddingVersionsByLiteratureIds(finalIds));
  }

  private async filterEvidenceReadyVersions(
    versions: LiteratureEmbeddingVersionRecord[],
  ): Promise<LiteratureEmbeddingVersionRecord[]> {
    if (versions.length === 0) {
      return versions;
    }
    const readyIds = await this.evidenceActivationService.filterEvidenceReadyLiteratureIds(
      [...new Set(versions.map((version) => version.literatureId))],
    );
    const readySet = new Set(readyIds);
    return versions.filter((version) => readySet.has(version.literatureId));
  }

  private async resolveFreshnessWarnings(
    literatureIds: string[],
    versions: LiteratureEmbeddingVersionRecord[],
  ): Promise<LiteratureRetrieveResponse['meta']['freshness_warnings']> {
    // T-130 W-05 (D7): freshness comes from the single readiness source, not a local stage-state re-query.
    const readiness = await this.evidenceActivationService.resolveRetrievalReadiness(literatureIds);
    return versions.flatMap((version) => {
      const entry = readiness.get(version.literatureId);
      if (entry?.freshness !== 'stale') {
        return [];
      }
      return [{
        literature_id: version.literatureId,
        embedding_version_id: version.id,
        reason_code: entry.freshness_detail?.reason_code ?? 'INDEX_STALE',
        reason_message: entry.freshness_detail?.reason_message
          ?? 'Active index is stale and may not reflect latest content.',
      }];
    });
  }

  private filterVersionsByActiveProfile(
    versions: LiteratureEmbeddingVersionRecord[],
    activeProfile: ActiveEmbeddingProfileConfig,
  ): {
    compatibleVersions: LiteratureEmbeddingVersionRecord[];
    skippedProfiles: LiteratureRetrieveResponse['meta']['skipped_profiles'];
  } {
    const profileCandidates = versions.filter((version) =>
      version.profileId === activeProfile.profileId
      && version.provider === activeProfile.provider
      && version.model === activeProfile.model,
    );
    const activeDimension = activeProfile.dimensions ?? profileCandidates[0]?.dimension ?? null;
    const compatibleVersions = activeDimension === null
      ? profileCandidates
      : profileCandidates.filter((version) => version.dimension === activeDimension);
    const skippedProfiles: LiteratureRetrieveResponse['meta']['skipped_profiles'] = [];
    for (const version of versions) {
      if (compatibleVersions.some((item) => item.id === version.id)) {
        continue;
      }
      skippedProfiles.push({
        provider: version.provider,
        model: version.model,
        dimension: version.dimension,
        reason: version.profileId !== activeProfile.profileId
          ? `inactive embedding profile ${version.profileId ?? 'unknown'}`
          : version.model !== activeProfile.model
            ? `inactive embedding model ${version.model}`
            : `inactive embedding dimension ${version.dimension}`,
      });
    }
    return { compatibleVersions, skippedProfiles };
  }

  private async resolveActiveEmbeddingProfile(): Promise<ActiveEmbeddingProfileConfig> {
    if (!this.settingsService) {
      return {
        profileId: 'default',
        provider: 'openai',
        model: 'text-embedding-3-large',
        dimensions: null,
      };
    }
    return this.settingsService.resolveActiveEmbeddingProfile();
  }

  private toRetrievalProfile(
    activeProfile: ActiveEmbeddingProfileConfig,
    versions: LiteratureEmbeddingVersionRecord[],
  ): RetrievalProfile {
    return {
      profileId: activeProfile.profileId,
      provider: activeProfile.provider,
      model: activeProfile.model,
      dimension: activeProfile.dimensions ?? versions[0]?.dimension ?? 0,
    };
  }

  private async embedQueryByProfile(query: string, profile: RetrievalProfile): Promise<{
    vector: number[];
    telemetry: LlmCallTelemetry;
  }> {
    if (profile.provider !== 'openai') {
      throw new Error(`unsupported embedding provider ${profile.provider}`);
    }

    const config = await this.settingsService?.resolveOpenAIEmbeddingConfig(profile.profileId);
    if (!config) {
      throw new Error('OpenAI embedding API key is not configured');
    }

    const requestedDimensions = profile.dimension > 0 ? profile.dimension : config.dimensions;
    const cacheKey = JSON.stringify({
      provider: profile.provider,
      model: profile.model,
      profile_id: profile.profileId,
      dimensions: requestedDimensions,
      query,
    });
    const cached = this.queryEmbeddingCache.get(cacheKey);
    if (cached) {
      return {
        vector: cached.vector,
        telemetry: {
          ...cached.telemetry,
          elapsed_ms: 0,
          request_count: 0,
          retry_count: 0,
          timeout_count: 0,
          rate_limit_count: 0,
          embedding_input_tokens: 0,
          total_tokens: 0,
          cost_usd: 0,
        },
      };
    }

    const response = await this.llmGateway.createEmbeddings({
      executionContext: {
        feature: 'literature_retrieval',
        operation: 'embed_query',
        metadata: {
          profile_id: profile.profileId,
        },
      },
      model: {
        providerId: 'openai',
        modelId: profile.model,
        profileId: profile.profileId,
      },
      input: query,
      dimensions: requestedDimensions,
    });
    const vector = response.vectors[0] ?? [];
    if (vector.length === 0) {
      throw new Error('OpenAI embedding response does not include usable vector');
    }
    if (profile.dimension > 0 && vector.length !== profile.dimension) {
      throw new Error(`vector dimension mismatch: expected ${profile.dimension}, got ${vector.length}`);
    }
    this.queryEmbeddingCache.set(cacheKey, {
      vector,
      telemetry: response.telemetry,
    });
    return {
      vector,
      telemetry: response.telemetry,
    };
  }

  private toTelemetryDTO(telemetry: LlmCallTelemetry): LiteratureLlmCallTelemetryDTO {
    return {
      provider_id: telemetry.provider_id,
      model_id: telemetry.model_id,
      profile_id: telemetry.profile_id,
      prompt_template_id: telemetry.prompt_template_id,
      prompt_template_version: telemetry.prompt_template_version,
      elapsed_ms: telemetry.elapsed_ms,
      request_count: telemetry.request_count,
      retry_count: telemetry.retry_count,
      timeout_count: telemetry.timeout_count,
      rate_limit_count: telemetry.rate_limit_count,
      input_tokens: telemetry.input_tokens,
      output_tokens: telemetry.output_tokens,
      embedding_input_tokens: telemetry.embedding_input_tokens,
      total_tokens: telemetry.total_tokens,
      cost_usd: telemetry.cost_usd,
    };
  }

  private buildWorkIdentityMaps(
    literatures: LiteratureRecord[],
    confirmedSameWorkClusters: LiteratureClusterGraphRecord[],
  ): LiteratureWorkIdentityMaps {
    const parent = new Map<string, string>();
    const identityByLiteratureId = new Map<string, string[]>();

    const find = (key: string): string => {
      const current = parent.get(key);
      if (!current) {
        parent.set(key, key);
        return key;
      }
      if (current === key) {
        return current;
      }
      const root = find(current);
      parent.set(key, root);
      return root;
    };

    const union = (left: string, right: string): void => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) {
        const canonicalRoot = selectCanonicalLiteratureWorkKey([leftRoot, rightRoot]);
        const otherRoot = canonicalRoot === leftRoot ? rightRoot : leftRoot;
        parent.set(otherRoot, canonicalRoot);
        parent.set(canonicalRoot, canonicalRoot);
      }
    };

    for (const literature of literatures) {
      const identity = buildLiteratureWorkIdentity({
        id: literature.id,
        title: literature.title,
        authors: literature.authors,
        year: literature.year,
        doiNormalized: literature.doiNormalized,
        arxivId: literature.arxivId,
        titleAuthorsYearHash: literature.titleAuthorsYearHash,
      });
      const keys = identity.identityKeys;
      identityByLiteratureId.set(literature.id, keys);
      for (const key of keys) {
        find(key);
      }
      const firstKey = keys[0];
      if (!firstKey) {
        continue;
      }
      for (const key of keys.slice(1)) {
        union(firstKey, key);
      }
    }

    const keysByRoot = new Map<string, string[]>();
    for (const key of parent.keys()) {
      const root = find(key);
      const keys = keysByRoot.get(root) ?? [];
      keys.push(key);
      keysByRoot.set(root, keys);
    }
    const canonicalByRoot = new Map<string, string>();
    for (const [root, keys] of keysByRoot.entries()) {
      canonicalByRoot.set(root, selectCanonicalLiteratureWorkKey(keys));
    }

    const workKeyByLiteratureId = new Map<string, string>();
    for (const [literatureId, keys] of identityByLiteratureId.entries()) {
      const firstKey = keys[0];
      workKeyByLiteratureId.set(
        literatureId,
        firstKey ? canonicalByRoot.get(find(firstKey)) ?? selectCanonicalLiteratureWorkKey(keys) : `literature:${literatureId}`,
      );
    }

    const literatureIdSet = new Set(literatures.map((literature) => literature.id));
    for (const graph of confirmedSameWorkClusters) {
      const acceptedMemberIds = graph.members
        .filter((member) =>
          literatureIdSet.has(member.literatureId)
          && member.decisionStatus === 'accepted')
        .map((member) => member.literatureId);
      if (acceptedMemberIds.length < 2) {
        continue;
      }
      const representativeId = graph.cluster.representativeLiteratureId
        && acceptedMemberIds.includes(graph.cluster.representativeLiteratureId)
        ? graph.cluster.representativeLiteratureId
        : acceptedMemberIds[0]!;
      const representativeKey = workKeyByLiteratureId.get(representativeId) ?? `cluster:${graph.cluster.id}`;
      for (const literatureId of acceptedMemberIds) {
        workKeyByLiteratureId.set(literatureId, representativeKey);
      }
    }

    return {
      canonicalWorkKeyByLiteratureId: workKeyByLiteratureId,
      directIdentityKeysByLiteratureId: new Map(
        [...identityByLiteratureId.entries()].map(([literatureId, keys]) => [literatureId, new Set(keys)]),
      ),
    };
  }

  private dedupeHitsByCanonicalWork(
    hits: LiteratureRetrieveHit[],
    directIdentityKeysByLiteratureId: Map<string, Set<string>>,
  ): LiteratureRetrieveHit[] {
    const bestByWork = new Map<string, LiteratureRetrieveHit>();
    for (const hit of hits) {
      const previous = bestByWork.get(hit.canonical_work_key);
      if (!previous || this.compareDuplicateWorkHit(hit, previous, directIdentityKeysByLiteratureId) < 0) {
        bestByWork.set(hit.canonical_work_key, hit);
      }
    }
    return [...bestByWork.values()];
  }

  private compareDuplicateWorkHit(
    left: LiteratureRetrieveHit,
    right: LiteratureRetrieveHit,
    directIdentityKeysByLiteratureId: Map<string, Set<string>>,
  ): number {
    const leftCanonicalOwnership = this.canonicalOwnershipScore(left, directIdentityKeysByLiteratureId);
    const rightCanonicalOwnership = this.canonicalOwnershipScore(right, directIdentityKeysByLiteratureId);
    if (leftCanonicalOwnership !== rightCanonicalOwnership) {
      return rightCanonicalOwnership - leftCanonicalOwnership;
    }

    const leftIdentityStrength = this.identityStrengthScore(left, directIdentityKeysByLiteratureId);
    const rightIdentityStrength = this.identityStrengthScore(right, directIdentityKeysByLiteratureId);
    if (leftIdentityStrength !== rightIdentityStrength) {
      return rightIdentityStrength - leftIdentityStrength;
    }

    return this.compareHitRank(left, right);
  }

  private canonicalOwnershipScore(
    hit: LiteratureRetrieveHit,
    directIdentityKeysByLiteratureId: Map<string, Set<string>>,
  ): number {
    return directIdentityKeysByLiteratureId.get(hit.literature_id)?.has(hit.canonical_work_key) ? 1 : 0;
  }

  private identityStrengthScore(
    hit: LiteratureRetrieveHit,
    directIdentityKeysByLiteratureId: Map<string, Set<string>>,
  ): number {
    const keys = directIdentityKeysByLiteratureId.get(hit.literature_id) ?? new Set<string>();
    return Math.max(0, ...[...keys].map((key) => {
      if (key.startsWith('doi:')) {
        return 3;
      }
      if (key.startsWith('arxiv:')) {
        return 2;
      }
      if (key.startsWith('tay:')) {
        return 1;
      }
      return 0;
    }));
  }

  private compareHitRank(left: LiteratureRetrieveHit, right: LiteratureRetrieveHit): number {
    if (right.hybrid_score !== left.hybrid_score) {
      return right.hybrid_score - left.hybrid_score;
    }
    if (left.canonical_work_key !== right.canonical_work_key) {
      return left.canonical_work_key.localeCompare(right.canonical_work_key);
    }
    return left.literature_id.localeCompare(right.literature_id);
  }

  private buildHits(
    scoredChunks: ScoredChunk[],
    literatureById: Map<string, LiteratureRecord>,
    workKeyByLiteratureId: Map<string, string>,
    evidencePerLiterature: number,
    profileId: LiteratureRetrieveProfileId,
  ): LiteratureRetrieveHit[] {
    const byLiterature = new Map<string, ScoredChunk[]>();
    for (const chunk of scoredChunks) {
      const rows = byLiterature.get(chunk.literatureId) ?? [];
      rows.push(chunk);
      byLiterature.set(chunk.literatureId, rows);
    }

    const hits: LiteratureRetrieveHit[] = [];
    for (const [literatureId, rows] of byLiterature.entries()) {
      const sorted = [...rows].sort((left, right) => {
        if (right.hybridScore !== left.hybridScore) {
          return right.hybridScore - left.hybridScore;
        }
        return left.chunk.chunkIndex - right.chunk.chunkIndex;
      });
      const evidenceRows = sorted.slice(0, evidencePerLiterature);
      const best = evidenceRows[0];
      if (!best) {
        continue;
      }

      hits.push({
        literature_id: literatureId,
        canonical_work_key: workKeyByLiteratureId.get(literatureId) ?? `literature:${literatureId}`,
        title: literatureById.get(literatureId)?.title ?? `Literature ${literatureId}`,
        embedding_version_id: best.embeddingVersionId,
        retrieval_profile: profileId,
        is_stale: evidenceRows.some((row) => row.isStale),
        warnings: [...new Set(evidenceRows.flatMap((row) => row.warnings))],
        hybrid_score: best.hybridScore,
        vector_score: best.vectorScore,
        lexical_score: best.lexicalScore,
        evidence_chunks: evidenceRows.map((row) => ({
          chunk_id: row.chunk.chunkId,
          chunk_type: row.chunk.chunkType,
          text: row.chunk.text,
          start_offset: row.chunk.startOffset,
          end_offset: row.chunk.endOffset,
          source_refs: row.chunk.sourceRefs,
          metadata: row.chunk.metadata,
          hybrid_score: row.hybridScore,
          vector_score: row.vectorScore,
          lexical_score: row.lexicalScore,
          score_breakdown: {
            vector: row.vectorScore,
            lexical: row.lexicalScore,
            metadata: row.metadataScore,
            profile_boost: row.profileBoost,
            weighted_vector: row.weightedVectorScore,
            weighted_lexical: row.weightedLexicalScore,
            weighted_metadata: row.weightedMetadataScore,
            matched_tokens: row.lexicalDetail.matchedTokens,
            missing_tokens: row.lexicalDetail.missingTokens,
            exact_phrases: row.lexicalDetail.exactPhrases,
            metadata_matched_tokens: row.metadataDetail.matchedTokens,
          },
        })),
      });
    }

    return hits;
  }

  private lexicalScoreDetail(context: QueryMatchContext, text: string): LexicalScoreDetail {
    if (context.tokens.length === 0) {
      return {
        score: 0,
        tokenCoverageScore: 0,
        weightedCoverageScore: 0,
        phraseScore: 0,
        matchedTokens: [],
        missingTokens: [],
        exactPhrases: [],
      };
    }

    const tokenSet = new Set(this.tokenizeForScoring(text));
    if (tokenSet.size === 0) {
      return {
        score: 0,
        tokenCoverageScore: 0,
        weightedCoverageScore: 0,
        phraseScore: 0,
        matchedTokens: [],
        missingTokens: context.tokens,
        exactPhrases: [],
      };
    }

    const matchedTokens = context.tokens.filter((token) => tokenSet.has(token));
    const missingTokens = context.tokens.filter((token) => !tokenSet.has(token));
    const totalWeight = context.tokens.reduce((sum, token) => sum + (context.tokenWeights.get(token) ?? 1), 0);
    const matchedWeight = matchedTokens.reduce((sum, token) => sum + (context.tokenWeights.get(token) ?? 1), 0);
    const tokenCoverageScore = this.toScore(matchedTokens.length / context.tokens.length);
    const weightedCoverageScore = totalWeight > 0 ? this.toScore(matchedWeight / totalWeight) : tokenCoverageScore;
    const normalizedText = this.normalizeSearchText(text);
    const exactPhrases = context.phrases.filter((phrase) => normalizedText.includes(phrase));
    const fullPhraseMatched = context.fullPhrase !== null && normalizedText.includes(context.fullPhrase);
    const phraseScore = context.phrases.length > 0
      ? this.toScore(Math.min(1, (exactPhrases.length / context.phrases.length) + (fullPhraseMatched ? 0.35 : 0)))
      : 0;
    const rawScore = (weightedCoverageScore * 0.55) + (tokenCoverageScore * 0.20) + (phraseScore * 0.25);
    const phraseFloor = fullPhraseMatched ? 0.92 : exactPhrases.length > 0 ? 0.78 : 0;

    return {
      score: this.toScore(Math.max(rawScore, phraseFloor)),
      tokenCoverageScore,
      weightedCoverageScore,
      phraseScore,
      matchedTokens,
      missingTokens,
      exactPhrases,
    };
  }

  private metadataScore(
    context: QueryMatchContext,
    chunk: LiteratureEmbeddingChunkRecord,
    literature: LiteratureRecord | null,
    profileBoost: number,
  ): LexicalScoreDetail {
    const metadataText = JSON.stringify({
      title: literature?.title ?? null,
      authors: literature?.authors ?? [],
      year: literature?.year ?? null,
      doi: literature?.doiNormalized ?? null,
      arxiv_id: literature?.arxivId ?? null,
      chunk_type: chunk.chunkType,
      metadata: chunk.metadata,
      source_refs: chunk.sourceRefs,
    });
    const detail = this.lexicalScoreDetail(context, metadataText);
    return {
      ...detail,
      score: this.toScore(Math.min(1, profileBoost + detail.score)),
    };
  }

  private tokenize(text: string): string[] {
    return [...new Set(
      this.tokenizeOrdered(text)
        .filter((token) => token.length > 1),
    )];
  }

  private tokenizeForScoring(text: string): string[] {
    const tokens = this.tokenize(text);
    const filtered = tokens.filter((token) => !RETRIEVAL_STOPWORDS.has(token));
    return filtered.length > 0 ? filtered : tokens;
  }

  private tokenizeOrdered(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  }

  private buildQueryMatchContext(query: string): QueryMatchContext {
    const orderedTokens = this.tokenizeOrdered(query).filter((token) => token.length > 1);
    const uniqueTokens = [...new Set(orderedTokens)];
    const filteredTokens = uniqueTokens.filter((token) => !RETRIEVAL_STOPWORDS.has(token));
    const tokens = filteredTokens.length > 0 ? filteredTokens : uniqueTokens;
    const filteredOrderedTokens = orderedTokens.filter((token) => tokens.includes(token));
    const phrases = this.buildSearchPhrases(filteredOrderedTokens);
    const fullPhrase = filteredOrderedTokens.length >= 2
      ? this.normalizeSearchText(filteredOrderedTokens.join(' '))
      : null;
    return {
      rawQuery: query,
      tokens,
      orderedTokens: filteredOrderedTokens,
      phrases,
      fullPhrase,
      tokenWeights: new Map(tokens.map((token) => [token, this.queryTokenWeight(token)])),
    };
  }

  private buildSearchPhrases(orderedTokens: string[]): string[] {
    const phrases = new Set<string>();
    if (orderedTokens.length >= 2) {
      phrases.add(this.normalizeSearchText(orderedTokens.join(' ')));
    }
    for (const size of [3, 2]) {
      if (orderedTokens.length < size) {
        continue;
      }
      for (let index = 0; index <= orderedTokens.length - size; index += 1) {
        phrases.add(this.normalizeSearchText(orderedTokens.slice(index, index + size).join(' ')));
      }
    }
    return [...phrases].filter((phrase) => phrase.length > 0);
  }

  private queryTokenWeight(token: string): number {
    if (/\d/.test(token)) {
      return 1.35;
    }
    if (token.length >= 9) {
      return 1.35;
    }
    if (token.length >= 6) {
      return 1.15;
    }
    if (token.length <= 3) {
      return 0.85;
    }
    return 1;
  }

  private normalizeSearchText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private normalizeRange(value: number | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.trunc(value)));
  }

  private normalizeProfile(value: LiteratureRetrieveProfileId | undefined): LiteratureRetrieveProfileId {
    return value && value in RETRIEVAL_PROFILE_CONFIGS ? value : 'general';
  }

  private toScore(value: number): number {
    return Number(Math.max(0, Math.min(1, value)).toFixed(6));
  }
}
