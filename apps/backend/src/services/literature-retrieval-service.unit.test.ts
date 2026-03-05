import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { LiteratureRetrievalService } from './literature-retrieval-service.js';

function buildLocalEmbeddingVector(text: string, dimension: number): number[] {
  const digest = crypto.createHash('sha256').update(text).digest();
  return Array.from({ length: dimension }, (_, index) => {
    const byte = digest[index % digest.length] ?? 0;
    const normalized = (byte / 255) * 2 - 1;
    return Number(normalized.toFixed(6));
  });
}

async function seedLocalLiterature(
  repository: InMemoryLiteratureRepository,
  input: { literatureId: string; title: string; chunkText: string; versionId: string },
): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: input.literatureId,
    title: input.title,
    abstractText: null,
    keyContentDigest: null,
    authors: ['Tester'],
    year: 2025,
    doiNormalized: `10.1000/${input.literatureId.toLowerCase()}`,
    arxivId: null,
    normalizedTitle: input.title.toLowerCase(),
    titleAuthorsYearHash: `hash-${input.literatureId}`,
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
    provider: 'local',
    model: 'local-hash-embedding-v1',
    dimension: 16,
    chunkCount: 1,
    vectorCount: 1,
    tokenCount: 0,
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
      vector: buildLocalEmbeddingVector(input.chunkText, 16),
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

test('retrieve ranks literature by hybrid score and returns chunk evidence', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureRetrievalService(repository);

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

  const response = await service.retrieve({
    query: 'retrieval evaluation',
    top_k: 10,
    evidence_per_literature: 2,
  });

  assert.equal(response.items.length, 2);
  assert.equal(response.items[0]?.literature_id, 'LIT-RET-1');
  assert.equal(response.items[0]?.evidence_chunks.length, 1);
  assert.equal(response.meta.query_tokens.includes('retrieval'), true);
  assert.equal(response.meta.profiles_used.length, 1);
  assert.equal(response.meta.skipped_profiles.length, 0);
});

test('retrieve skips external profile when endpoint is not configured', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureRetrievalService(repository);
  const now = new Date().toISOString();

  const previousEndpoint = process.env.LITERATURE_PIPELINE_EMBEDDING_URL;
  delete process.env.LITERATURE_PIPELINE_EMBEDDING_URL;

  try {
    await repository.createLiterature({
      id: 'LIT-RET-EXT',
      title: 'External Embedding Candidate',
      abstractText: null,
      keyContentDigest: null,
      authors: ['Tester'],
      year: 2025,
      doiNormalized: '10.1000/lit-ret-ext',
      arxivId: null,
      normalizedTitle: 'external embedding candidate',
      titleAuthorsYearHash: 'hash-lit-ret-ext',
      rightsClass: 'OA',
      tags: [],
      activeEmbeddingVersionId: 'EV-RET-EXT',
      createdAt: now,
      updatedAt: now,
    });

    await repository.createEmbeddingVersion({
      id: 'EV-RET-EXT',
      literatureId: 'LIT-RET-EXT',
      versionNo: 1,
      provider: 'external',
      model: 'text-embedding-v1',
      dimension: 3,
      chunkCount: 1,
      vectorCount: 1,
      tokenCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await repository.createEmbeddingChunks([
      {
        id: 'EV-RET-EXT-chunk-1',
        embeddingVersionId: 'EV-RET-EXT',
        literatureId: 'LIT-RET-EXT',
        chunkId: 'chunk-0001',
        chunkIndex: 0,
        text: 'external profile chunk text',
        startOffset: 0,
        endOffset: 27,
        vector: [0.1, 0.2, 0.3],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const response = await service.retrieve({
      query: 'external embedding',
    });

    assert.equal(response.items.length, 0);
    assert.equal(response.meta.profiles_used.length, 0);
    assert.equal(response.meta.skipped_profiles.length, 1);
    assert.equal(response.meta.skipped_profiles[0]?.provider, 'external');
  } finally {
    if (previousEndpoint === undefined) {
      delete process.env.LITERATURE_PIPELINE_EMBEDDING_URL;
    } else {
      process.env.LITERATURE_PIPELINE_EMBEDDING_URL = previousEndpoint;
    }
  }
});
