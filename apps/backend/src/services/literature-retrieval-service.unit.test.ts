import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureRetrievalService } from './literature-retrieval-service.js';

async function seedLocalLiterature(
  repository: InMemoryLiteratureRepository,
  input: {
    literatureId: string;
    title: string;
    chunkText: string;
    versionId: string;
    chunkType?: string;
    profileId?: 'default' | 'economy';
    model?: string;
    dimension?: number;
    vector?: number[];
    authors?: string[];
    year?: number | null;
    doiNormalized?: string | null;
    arxivId?: string | null;
    titleAuthorsYearHash?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: input.literatureId,
    title: input.title,
    abstractText: null,
    keyContentDigest: null,
    authors: input.authors ?? ['Tester'],
    year: input.year === undefined ? 2025 : input.year,
    doiNormalized: input.doiNormalized === undefined ? `10.1000/${input.literatureId.toLowerCase()}` : input.doiNormalized,
    arxivId: input.arxivId === undefined ? null : input.arxivId,
    normalizedTitle: input.title.toLowerCase(),
    titleAuthorsYearHash: input.titleAuthorsYearHash === undefined ? `hash-${input.literatureId}` : input.titleAuthorsYearHash,
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: input.versionId,
    createdAt: now,
    updatedAt: now,
  });

  await repository.createEmbeddingVersion({
    id: input.versionId,
    literatureId: input.literatureId,
    versionNo: 1,
    status: 'INDEXED',
    profileId: input.profileId ?? 'default',
    provider: 'openai',
    model: input.model ?? 'text-embedding-3-large',
    dimension: input.dimension ?? 3,
    chunkCount: 1,
    vectorCount: 1,
    tokenCount: 0,
    inputChecksum: 'input-checksum',
    chunkArtifactChecksum: 'chunk-checksum',
    embeddingArtifactChecksum: 'embedding-checksum',
    indexArtifactChecksum: 'index-checksum',
    indexedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await repository.createEmbeddingChunks([
    {
      id: `${input.versionId}-chunk-1`,
      embeddingVersionId: input.versionId,
      literatureId: input.literatureId,
      chunkId: 'chunk-0001',
      chunkIndex: 0,
      text: input.chunkText,
      startOffset: 0,
      endOffset: input.chunkText.length,
      chunkType: input.chunkType ?? 'fulltext_paragraph',
      sourceRefs: [{ ref_type: 'paragraph', ref_id: 'para-1' }],
      metadata: { origin_stage: 'FULLTEXT_PREPROCESSED' },
      contentChecksum: 'content-checksum',
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await repository.writeEmbeddingRetrievalVectors([{
    embeddingChunkId: `${input.versionId}-chunk-1`,
    normalizedVector: normalizeTestVector(input.vector ?? [0.1, 0.2, 0.3]),
    updatedAt: now,
  }]);

  await repository.upsertPipelineState({
    id: `${input.literatureId}-pipeline-state`,
    literatureId: input.literatureId,
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });

  await repository.upsertQualityAssessment({
    id: `${input.literatureId}-quality`,
    literatureId: input.literatureId,
    qualityStatus: 'high_confidence',
    qualityScore: 100,
    qualityComponents: { test_fixture: true },
    blockerCodes: [],
    source: 'test_fixture',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

function createEmbeddingSettingsService(): LiteratureContentProcessingSettingsService {
  return {
    resolveOpenAIProviderApiKey: async () => 'sk-test',
    resolveActiveEmbeddingProfile: async () => ({
      profileId: 'default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3,
    }),
    resolveOpenAIEmbeddingConfig: async () => ({
      apiKey: 'sk-test',
      profileId: 'default',
      model: 'text-embedding-3-large',
      dimensions: 3,
    }),
  } as LiteratureContentProcessingSettingsService;
}

function createRetrievalService(repository: InMemoryLiteratureRepository): LiteratureRetrievalService {
  return new LiteratureRetrievalService(repository, createEmbeddingSettingsService());
}

async function withEmbeddingFetch<T>(
  vector: number[],
  callback: () => Promise<T>,
): Promise<T> {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [{ embedding: vector }],
    usage: { prompt_tokens: 2, total_tokens: 2 },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
  try {
    return await callback();
  } finally {
    globalThis.fetch = previousFetch;
  }
}

function normalizeTestVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

async function retrieveWithTestEmbedding(
  service: LiteratureRetrievalService,
  request: Parameters<LiteratureRetrievalService['retrieve']>[0],
  vector: number[] = [1, 0, 0],
): Promise<Awaited<ReturnType<LiteratureRetrievalService['retrieve']>>> {
  return withEmbeddingFetch(vector, () => service.retrieve(request));
}

test('retrieve ranks literature by hybrid score and returns chunk evidence', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-1',
    title: 'Retrieval Evaluation Benchmark',
    versionId: 'EV-RET-1',
    chunkText: 'retrieval evaluation benchmark with semantic evidence',
  });

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-2',
    title: 'Unrelated Topic',
    versionId: 'EV-RET-2',
    chunkText: 'graph coloring theorem and combinatorics notes',
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'retrieval evaluation',
    top_k: 10,
    evidence_per_literature: 2,
  });

  assert.equal(response.items.length, 2);
  assert.equal(response.items[0]?.literature_id, 'LIT-RET-1');
  assert.equal(response.items[0]?.evidence_chunks.length, 1);
  assert.equal(response.meta.query_tokens.includes('retrieval'), true);
  assert.equal(response.items[0]?.evidence_chunks[0]?.chunk_type, 'fulltext_paragraph');
  assert.equal(response.meta.profile, 'general');
  assert.equal(response.meta.degraded_mode, false);
  assert.equal(response.meta.profiles_used.length, 1);
  assert.equal(response.meta.skipped_profiles.length, 0);
  assert.equal(response.meta.query_embedding_telemetry?.embedding_input_tokens, 2);
});

test('retrieve only consumes active topic evidence activation', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);
  const now = new Date().toISOString();

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-ACTIVE',
    title: 'Active Evidence Work',
    versionId: 'EV-RET-ACTIVE',
    chunkText: 'topic gated evidence that should be retrieved',
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-CANDIDATE',
    title: 'Candidate Evidence Work',
    versionId: 'EV-RET-CANDIDATE',
    chunkText: 'topic gated evidence that should stay hidden',
  });
  await repository.upsertTopicScope({
    id: 'scope-active',
    topicId: 'topic-evidence',
    literatureId: 'LIT-RET-ACTIVE',
    scopeStatus: 'in_scope',
    reason: 'test',
    activationStatus: 'active',
    activationReason: 'EVIDENCE_READY',
    activationScore: 100,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertTopicScope({
    id: 'scope-candidate',
    topicId: 'topic-evidence',
    literatureId: 'LIT-RET-CANDIDATE',
    scopeStatus: 'in_scope',
    reason: 'test',
    activationStatus: 'candidate',
    activationReason: 'TEST_NOT_REVIEWED',
    activationScore: null,
    activatedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'topic gated evidence',
    topic_id: 'topic-evidence',
    top_k: 10,
  });

  assert.deepEqual(response.items.map((item) => item.literature_id), ['LIT-RET-ACTIVE']);
});

test('retrieve boosts exact phrase lexical matches and explains matched tokens', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-PHRASE',
    title: 'Phrase Match Work',
    versionId: 'EV-RET-PHRASE',
    chunkText: 'The masked language modeling objective is central to this encoder pretraining method.',
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-BAG',
    title: 'Bag Match Work',
    versionId: 'EV-RET-BAG',
    chunkText: 'The method masks tokens in a language encoder and studies modeling objectives separately.',
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'masked language modeling',
    top_k: 2,
  });

  assert.equal(response.items[0]?.literature_id, 'LIT-RET-PHRASE');
  const breakdown = response.items[0]?.evidence_chunks[0]?.score_breakdown;
  assert.deepEqual(breakdown?.matched_tokens, ['masked', 'language', 'modeling']);
  assert.equal(breakdown?.missing_tokens?.length, 0);
  assert.equal(breakdown?.exact_phrases?.includes('masked language modeling'), true);
  assert.equal((breakdown?.weighted_lexical ?? 0) > 0, true);
});

test('retrieve uses literature metadata for exact identifier and title term matches', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-ALPHAFOLD',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    versionId: 'EV-RET-ALPHAFOLD',
    chunkText: 'The benchmark reports accurate coordinate prediction and ablation evidence.',
    doiNormalized: '10.1000/protein-structure',
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-GENERIC-PROTEIN',
    title: 'Generic protein structure benchmark',
    versionId: 'EV-RET-GENERIC-PROTEIN',
    chunkText: 'The benchmark reports accurate coordinate prediction and ablation evidence.',
    doiNormalized: '10.1000/generic-protein',
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'AlphaFold',
    top_k: 2,
  });

  assert.equal(response.items[0]?.literature_id, 'LIT-RET-ALPHAFOLD');
  const breakdown = response.items[0]?.evidence_chunks[0]?.score_breakdown;
  assert.equal(breakdown?.matched_tokens?.includes('alphafold'), false);
  assert.equal(breakdown?.metadata_matched_tokens?.includes('alphafold'), true);
  assert.equal((breakdown?.weighted_metadata ?? 0) > 0, true);
});

test('retrieve deduplicates split records by canonical work identity before applying top-k', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-DUP-DOI',
    title: 'Canonical Duplicate Work',
    versionId: 'EV-RET-DUP-DOI',
    chunkText: 'canonical duplicate evidence from doi record',
    authors: ['Ada Lovelace'],
    year: 2026,
    doiNormalized: '10.1000/canonical-duplicate',
    arxivId: null,
    titleAuthorsYearHash: null,
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-DUP-ARXIV',
    title: 'Canonical Duplicate Work',
    versionId: 'EV-RET-DUP-ARXIV',
    chunkText: 'canonical duplicate evidence from arxiv record with extra evidence',
    authors: ['Ada Lovelace'],
    year: 2026,
    doiNormalized: null,
    arxivId: '2601.00001',
    titleAuthorsYearHash: null,
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-DUP-HISTORICAL',
    title: 'Canonical Duplicate Work',
    versionId: 'EV-RET-DUP-HISTORICAL',
    chunkText: 'canonical duplicate evidence from a historical split record with the strongest lexical match',
    authors: ['Ada Lovelace'],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    titleAuthorsYearHash: null,
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-UNIQUE',
    title: 'Unique Neighbor Work',
    versionId: 'EV-RET-UNIQUE',
    chunkText: 'canonical duplicate evidence from a separate comparison work',
    authors: ['Grace Hopper'],
    year: 2026,
    doiNormalized: '10.1000/unique-neighbor',
    arxivId: null,
    titleAuthorsYearHash: null,
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'canonical duplicate evidence',
    top_k: 5,
  });

  assert.equal(response.items.length, 2);
  assert.equal(
    response.items.filter((item) => item.title === 'Canonical Duplicate Work').length,
    1,
  );
  assert.equal(
    response.items.find((item) => item.title === 'Canonical Duplicate Work')?.canonical_work_key,
    'doi:10.1000/canonical-duplicate',
  );
  assert.equal(
    response.items.find((item) => item.title === 'Canonical Duplicate Work')?.literature_id,
    'LIT-RET-DUP-DOI',
  );
  assert.equal(response.items.some((item) => item.literature_id === 'LIT-RET-DUP-HISTORICAL'), false);
  assert.equal(response.items.some((item) => item.literature_id === 'LIT-RET-UNIQUE'), true);
});

test('retrieve consumes confirmed same-work clusters while ignoring candidate clusters', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);
  const now = new Date().toISOString();
  let capturedClusterFilter: Parameters<InMemoryLiteratureRepository['listLiteratureClusters']>[0] | undefined;
  const originalListLiteratureClusters = repository.listLiteratureClusters.bind(repository);
  repository.listLiteratureClusters = async (filter) => {
    capturedClusterFilter = filter;
    return originalListLiteratureClusters(filter);
  };

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-CLUSTER-CANONICAL',
    title: 'Confirmed Cluster Canonical Work',
    versionId: 'EV-RET-CLUSTER-CANONICAL',
    chunkText: 'clustered duplicate evidence from canonical record',
    authors: ['Ada Lovelace'],
    year: 2026,
    doiNormalized: '10.1000/cluster-canonical',
    titleAuthorsYearHash: null,
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-CLUSTER-VARIANT',
    title: 'Confirmed Cluster Variant Work',
    versionId: 'EV-RET-CLUSTER-VARIANT',
    chunkText: 'clustered duplicate evidence from variant record with stronger lexical duplicate evidence',
    authors: ['A. Lovelace'],
    year: 2027,
    doiNormalized: null,
    titleAuthorsYearHash: null,
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-CLUSTER-CANDIDATE',
    title: 'Candidate Cluster Work',
    versionId: 'EV-RET-CLUSTER-CANDIDATE',
    chunkText: 'clustered duplicate evidence from candidate-only record',
    authors: ['Ada Lovelace'],
    year: 2026,
    doiNormalized: '10.1000/cluster-candidate',
    titleAuthorsYearHash: null,
  });

  await repository.upsertLiteratureCluster({
    id: 'LCL-CONFIRMED',
    clusterType: 'same_work',
    status: 'confirmed',
    representativeLiteratureId: 'LIT-RET-CLUSTER-CANONICAL',
    confidence: 0.91,
    method: 'unit',
    createdAt: now,
    updatedAt: now,
  }, [
    {
      id: 'LCM-CONFIRMED-1',
      clusterId: 'LCL-CONFIRMED',
      literatureId: 'LIT-RET-CLUSTER-CANONICAL',
      role: 'representative',
      relationType: 'near_duplicate',
      confidence: 0.91,
      decisionStatus: 'accepted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'LCM-CONFIRMED-2',
      clusterId: 'LCL-CONFIRMED',
      literatureId: 'LIT-RET-CLUSTER-VARIANT',
      role: 'variant',
      relationType: 'near_duplicate',
      confidence: 0.91,
      decisionStatus: 'accepted',
      createdAt: now,
      updatedAt: now,
    },
  ], [
    {
      id: 'LCE-CONFIRMED-1',
      clusterId: 'LCL-CONFIRMED',
      literatureIdA: 'LIT-RET-CLUSTER-CANONICAL',
      literatureIdB: 'LIT-RET-CLUSTER-VARIANT',
      signalType: 'title_similarity',
      score: 0.91,
      payload: {},
      createdAt: now,
    },
  ]);
  await repository.upsertLiteratureCluster({
    id: 'LCL-CANDIDATE',
    clusterType: 'same_work',
    status: 'candidate',
    representativeLiteratureId: 'LIT-RET-CLUSTER-CANONICAL',
    confidence: 0.91,
    method: 'unit',
    createdAt: now,
    updatedAt: now,
  }, [
    {
      id: 'LCM-CANDIDATE-1',
      clusterId: 'LCL-CANDIDATE',
      literatureId: 'LIT-RET-CLUSTER-CANONICAL',
      role: 'representative',
      relationType: 'near_duplicate',
      confidence: 0.91,
      decisionStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'LCM-CANDIDATE-2',
      clusterId: 'LCL-CANDIDATE',
      literatureId: 'LIT-RET-CLUSTER-CANDIDATE',
      role: 'variant',
      relationType: 'near_duplicate',
      confidence: 0.91,
      decisionStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  ], []);

  const response = await retrieveWithTestEmbedding(service, {
    query: 'clustered duplicate evidence',
    top_k: 10,
  });

  assert.equal(response.items.some((item) => item.literature_id === 'LIT-RET-CLUSTER-VARIANT'), false);
  assert.equal(response.items.some((item) => item.literature_id === 'LIT-RET-CLUSTER-CANONICAL'), true);
  assert.equal(response.items.some((item) => item.literature_id === 'LIT-RET-CLUSTER-CANDIDATE'), true);
  assert.deepEqual(
    new Set(capturedClusterFilter?.literatureIds ?? []),
    new Set(['LIT-RET-CLUSTER-CANONICAL', 'LIT-RET-CLUSTER-VARIANT', 'LIT-RET-CLUSTER-CANDIDATE']),
  );
});

test('retrieve fails closed when query embedding config is not available', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureRetrievalService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature({
    id: 'LIT-RET-OPENAI',
    title: 'OpenAI Embedding Candidate',
    abstractText: null,
    keyContentDigest: null,
    authors: ['Tester'],
    year: 2025,
    doiNormalized: '10.1000/lit-ret-openai',
    arxivId: null,
    normalizedTitle: 'openai embedding candidate',
    titleAuthorsYearHash: 'hash-lit-ret-openai',
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: 'EV-RET-OPENAI',
    createdAt: now,
    updatedAt: now,
  });

  await repository.createEmbeddingVersion({
    id: 'EV-RET-OPENAI',
    literatureId: 'LIT-RET-OPENAI',
    versionNo: 1,
    status: 'INDEXED',
    profileId: 'default',
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimension: 3,
    chunkCount: 1,
    vectorCount: 1,
    tokenCount: 0,
    inputChecksum: 'input-checksum',
    chunkArtifactChecksum: 'chunk-checksum',
    embeddingArtifactChecksum: 'embedding-checksum',
    indexArtifactChecksum: 'index-checksum',
    indexedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await repository.createEmbeddingChunks([
    {
      id: 'EV-RET-OPENAI-chunk-1',
      embeddingVersionId: 'EV-RET-OPENAI',
      literatureId: 'LIT-RET-OPENAI',
      chunkId: 'chunk-0001',
      chunkIndex: 0,
      text: 'openai profile chunk text',
      startOffset: 0,
      endOffset: 26,
      chunkType: 'semantic_dossier',
      sourceRefs: [{ ref_type: 'paragraph', ref_id: 'para-1' }],
      metadata: { origin_stage: 'KEY_CONTENT_READY' },
      contentChecksum: 'content-checksum',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await repository.upsertPipelineState({
    id: 'LIT-RET-OPENAI-pipeline-state',
    literatureId: 'LIT-RET-OPENAI',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });
  await repository.upsertQualityAssessment({
    id: 'LIT-RET-OPENAI-quality',
    literatureId: 'LIT-RET-OPENAI',
    qualityStatus: 'high_confidence',
    qualityScore: 100,
    qualityComponents: { test_fixture: true },
    blockerCodes: [],
    source: 'test_fixture',
    assessedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await assert.rejects(() => service.retrieve({
    query: 'openai embedding',
  }), /OpenAI embedding API key is not configured/);
});

test('retrieve uses only the configured active embedding profile when active versions are mixed', async () => {
  const repository = new InMemoryLiteratureRepository();
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-LARGE',
    title: 'Large Profile Candidate',
    versionId: 'EV-RET-LARGE',
    chunkText: 'large profile semantic comparison evidence',
    profileId: 'default',
    model: 'text-embedding-3-large',
    dimension: 3,
    vector: [0.1, 0.2, 0.3],
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-SMALL',
    title: 'Small Profile Candidate',
    versionId: 'EV-RET-SMALL',
    chunkText: 'small profile should not be mixed into large retrieval',
    profileId: 'economy',
    model: 'text-embedding-3-small',
    dimension: 3,
    vector: [0.9, 0.1, 0.1],
  });
  const settingsService = {
    resolveOpenAIProviderApiKey: async () => 'sk-test',
    resolveActiveEmbeddingProfile: async () => ({
      profileId: 'default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3,
    }),
    resolveOpenAIEmbeddingConfig: async (profileId: 'default' | 'economy') => ({
      apiKey: 'sk-test',
      profileId,
      model: profileId === 'default' ? 'text-embedding-3-large' : 'text-embedding-3-small',
      dimensions: 3,
    }),
  } as LiteratureContentProcessingSettingsService;
  const previousFetch = globalThis.fetch;
  let embeddingCallCount = 0;
  globalThis.fetch = (async () => {
    embeddingCallCount += 1;
    return new Response(JSON.stringify({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
      usage: { prompt_tokens: 2, total_tokens: 2 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const service = new LiteratureRetrievalService(repository, settingsService);
    const response = await service.retrieve({
      query: 'semantic comparison',
      top_k: 10,
    });

    assert.equal(embeddingCallCount, 1);
    assert.deepEqual(response.items.map((item) => item.literature_id), ['LIT-RET-LARGE']);
    assert.equal(response.meta.profiles_used.length, 1);
    assert.equal(response.meta.profiles_used[0]?.model, 'text-embedding-3-large');
    assert.equal(response.meta.skipped_profiles.length, 1);
    assert.equal(response.meta.skipped_profiles[0]?.model, 'text-embedding-3-small');
    assert.equal(response.meta.query_embedding_telemetry?.embedding_input_tokens, 2);
    assert.equal(response.meta.query_embedding_telemetry?.total_tokens, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('retrieve excludes stale indexes by default and can include them for diagnostics', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = createRetrievalService(repository);
  const now = new Date().toISOString();

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-STALE',
    title: 'Writing Evidence Candidate',
    versionId: 'EV-RET-STALE',
    chunkText: 'writing evidence claim paragraph with grounded provenance',
    chunkType: 'evidence',
  });
  await repository.upsertPipelineStageState({
    id: 'LIT-RET-STALE-indexed-state',
    literatureId: 'LIT-RET-STALE',
    stageCode: 'INDEXED',
    status: 'STALE',
    lastRunId: null,
    detail: {
      reason_code: 'PROFILE_CHANGED',
      reason_message: 'Embedding profile changed after the active index was built.',
    },
    updatedAt: now,
  });

  const defaultResponse = await retrieveWithTestEmbedding(service, {
    query: 'writing evidence claim',
    profile: 'writing_evidence',
    top_k: 1,
  });

  assert.equal(defaultResponse.meta.profile, 'writing_evidence');
  assert.equal(defaultResponse.meta.freshness_warnings.length, 1);
  assert.equal(defaultResponse.items.length, 0);

  const response = await retrieveWithTestEmbedding(service, {
    query: 'writing evidence claim',
    profile: 'writing_evidence',
    top_k: 1,
    include_stale: true,
  });

  assert.equal(response.meta.profile, 'writing_evidence');
  assert.equal(response.meta.freshness_warnings.length, 1);
  assert.equal(response.meta.freshness_warnings[0]?.reason_code, 'PROFILE_CHANGED');
  assert.equal(response.items[0]?.retrieval_profile, 'writing_evidence');
  assert.equal(response.items[0]?.is_stale, true);
  assert.deepEqual(response.items[0]?.warnings, ['Embedding profile changed after the active index was built.']);
  assert.equal(response.items[0]?.evidence_chunks[0]?.chunk_type, 'evidence');
  assert.equal(response.items[0]?.evidence_chunks[0]?.score_breakdown.profile_boost, 0.16);
});

test('retrieve uses pgvector candidates and does not run the legacy JSONB chunk scan', async () => {
  const repository = new InMemoryLiteratureRepository();
  let pgvectorCandidateCalls = 0;
  const originalListEmbeddingVectorCandidates = repository.listEmbeddingVectorCandidates.bind(repository);
  repository.listEmbeddingVectorCandidates = async (query) => {
    pgvectorCandidateCalls += 1;
    return originalListEmbeddingVectorCandidates(query);
  };
  const originalListEmbeddingChunks = repository.listEmbeddingChunksByEmbeddingVersionIds.bind(repository);
  repository.listEmbeddingChunksByEmbeddingVersionIds = async () => {
    throw new Error('legacy JSONB chunk scan must not run during pgvector retrieval');
  };
  const service = createRetrievalService(repository);

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-PGVECTOR',
    title: 'Pgvector Stable Match',
    versionId: 'EV-RET-PGVECTOR',
    chunkText: 'pgvector stable visible evidence',
    vector: [1, 0, 0],
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'pgvector stable evidence',
    top_k: 5,
  });

  repository.listEmbeddingChunksByEmbeddingVersionIds = originalListEmbeddingChunks;
  assert.equal(response.items[0]?.literature_id, 'LIT-RET-PGVECTOR');
  assert.equal(response.meta.degraded_mode, false);
  assert.equal(response.meta.profiles_used.length, 1);
  assert.equal(pgvectorCandidateCalls, 1);
});

test('retrieve fails instead of falling back to JSONB when pgvector candidate selection fails', async () => {
  const repository = new InMemoryLiteratureRepository();
  repository.listEmbeddingVectorCandidates = async () => {
    throw new Error('pgvector candidate query failed');
  };
  repository.listEmbeddingChunksByEmbeddingVersionIds = async () => {
    throw new Error('legacy JSONB fallback must not run');
  };
  const service = createRetrievalService(repository);

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-NO-FALLBACK',
    title: 'No Fallback Candidate',
    versionId: 'EV-RET-NO-FALLBACK',
    chunkText: 'pgvector failure should not fallback to jsonb',
    vector: [1, 0, 0],
  });

  await assert.rejects(() => retrieveWithTestEmbedding(service, {
    query: 'pgvector failure',
    top_k: 5,
  }), /pgvector candidate query failed/);
});

test('retrieve excludes stale embedding versions from pgvector candidate SQL by default', async () => {
  const repository = new InMemoryLiteratureRepository();
  let eligibleEmbeddingVersionIds: string[] = [];
  const originalListEmbeddingVectorCandidates = repository.listEmbeddingVectorCandidates.bind(repository);
  repository.listEmbeddingVectorCandidates = async (query) => {
    eligibleEmbeddingVersionIds = [...query.eligibleEmbeddingVersionIds];
    return originalListEmbeddingVectorCandidates(query);
  };
  const service = createRetrievalService(repository);
  const now = new Date().toISOString();

  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-FRESH-PGVECTOR',
    title: 'Fresh Pgvector Candidate',
    versionId: 'EV-RET-FRESH-PGVECTOR',
    chunkText: 'fresh pgvector candidate evidence',
    vector: [1, 0, 0],
  });
  await seedLocalLiterature(repository, {
    literatureId: 'LIT-RET-STALE-PGVECTOR',
    title: 'Stale Pgvector Candidate',
    versionId: 'EV-RET-STALE-PGVECTOR',
    chunkText: 'stale pgvector candidate evidence',
    vector: [1, 0, 0],
  });
  await repository.upsertPipelineStageState({
    id: 'LIT-RET-STALE-PGVECTOR-indexed-state',
    literatureId: 'LIT-RET-STALE-PGVECTOR',
    stageCode: 'INDEXED',
    status: 'STALE',
    lastRunId: null,
    detail: {
      reason_code: 'PROFILE_CHANGED',
      reason_message: 'Embedding profile changed after the active index was built.',
    },
    updatedAt: now,
  });

  const response = await retrieveWithTestEmbedding(service, {
    query: 'pgvector candidate evidence',
    top_k: 5,
  });

  assert.deepEqual(eligibleEmbeddingVersionIds, ['EV-RET-FRESH-PGVECTOR']);
  assert.equal(response.meta.freshness_warnings.length, 1);
  assert.equal(response.items.some((item) => item.literature_id === 'LIT-RET-STALE-PGVECTOR'), false);
});
