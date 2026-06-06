import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRecord } from '../repositories/literature-repository.js';
import { LiteratureClusterService } from './literature-cluster-service.js';
import { buildLiteratureTitleAuthorsYearHash, normalizeLiteratureTitle } from './literature-work-identity.js';

function literature(input: {
  id: string;
  title: string;
  authors: string[];
  year: number;
  doi?: string | null;
  arxivId?: string | null;
  abstractText?: string | null;
  titleAuthorsYearHash?: string | null;
}): LiteratureRecord {
  const now = new Date().toISOString();
  return {
    id: input.id,
    title: input.title,
    abstractText: input.abstractText ?? null,
    keyContentDigest: null,
    authors: input.authors,
    year: input.year,
    doiNormalized: input.doi ?? null,
    arxivId: input.arxivId ?? null,
    normalizedTitle: normalizeLiteratureTitle(input.title),
    titleAuthorsYearHash: input.titleAuthorsYearHash === undefined
      ? buildLiteratureTitleAuthorsYearHash(input.title, input.authors, input.year)
      : input.titleAuthorsYearHash,
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  };
}

test('cluster candidate generation records same-PDF evidence without auto-confirming merge', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature(literature({
    id: 'LIT-CL-1',
    title: 'Shared PDF Work',
    authors: ['Ada Lovelace'],
    year: 2026,
    doi: '10.1000/shared-pdf',
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-2',
    title: 'Shared PDF Work Variant',
    authors: ['Ada Lovelace'],
    year: 2026,
    titleAuthorsYearHash: null,
  }));
  for (const literatureId of ['LIT-CL-1', 'LIT-CL-2']) {
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-shared-pdf',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const response = await service.generateCandidates({ cluster_types: ['same_work'] });

  assert.equal(response.generated_count, 1);
  assert.equal(response.summary.same_pdf_count, 1);
  assert.equal(response.clusters[0]?.status, 'candidate');
  assert.equal(response.clusters[0]?.representative_literature_id, 'LIT-CL-1');
  assert.equal(response.clusters[0]?.review.outcome, 'pending_review');
  assert.equal(response.clusters[0]?.review.consumption_scope, 'none');
  assert.equal(response.clusters[0]?.review.retrieval_dedup_active, false);
  assert.equal(response.clusters[0]?.review.review_required, true);
  assert.equal(response.clusters[0]?.members.length, 2);
  assert.equal(response.clusters[0]?.evidence[0]?.signal_type, 'pdf_sha256');
  assert.equal(response.clusters[0]?.evidence[0]?.payload.checksum, 'sha256-shared-pdf');
});

test('cluster candidate generation does not mutate existing decisions and summarizes returned candidates', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature(literature({
    id: 'LIT-CL-EXISTING-1',
    title: 'Existing Candidate Work',
    authors: ['Ada Lovelace'],
    year: 2026,
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-EXISTING-2',
    title: 'Existing Candidate Work Copy',
    authors: ['Ada Lovelace'],
    year: 2026,
    titleAuthorsYearHash: null,
  }));
  for (const literatureId of ['LIT-CL-EXISTING-1', 'LIT-CL-EXISTING-2']) {
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-existing-candidate',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const first = await service.generateCandidates({ cluster_types: ['same_work'] });
  const clusterId = first.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');
  await repository.updateLiteratureCluster(clusterId!, {
    status: 'confirmed',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const repeated = await service.generateCandidates({ cluster_types: ['same_work'] });
  assert.equal(repeated.generated_count, 1);
  assert.equal(repeated.summary.same_pdf_count, 1);
  assert.equal(repeated.clusters[0]?.status, 'confirmed');
  assert.equal(repeated.clusters[0]?.updated_at, '2026-01-01T00:00:00.000Z');

  const excluded = await service.generateCandidates({ cluster_types: ['version_family'] });
  assert.equal(excluded.generated_count, 0);
  assert.equal(excluded.summary.same_pdf_count, 0);

  const withoutExisting = await service.generateCandidates({
    cluster_types: ['same_work'],
    include_existing: false,
  });
  assert.equal(withoutExisting.generated_count, 0);
  assert.equal(withoutExisting.summary.same_pdf_count, 0);
});

test('cluster decisions can confirm same-work candidate and update member status', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);

  await repository.createLiterature(literature({
    id: 'LIT-CL-D1',
    title: 'Near Duplicate Graph Learning',
    authors: ['Grace Hopper'],
    year: 2025,
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-D2',
    title: 'Near-Duplicate Graph Learning',
    authors: ['G. Hopper'],
    year: 2025,
    titleAuthorsYearHash: null,
  }));

  const generated = await service.generateCandidates({ min_confidence: 0.5 });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  const updated = await service.updateCluster(clusterId!, {
    status: 'confirmed',
    review_outcome: 'same_work_confirmed',
    representative_literature_id: 'LIT-CL-D1',
    member_decisions: [
      { literature_id: 'LIT-CL-D1', decision_status: 'accepted', role: 'representative' },
      { literature_id: 'LIT-CL-D2', decision_status: 'accepted', role: 'variant' },
    ],
  });

  assert.equal(updated.item.status, 'confirmed');
  assert.equal(updated.item.representative_literature_id, 'LIT-CL-D1');
  assert.equal(updated.item.members.every((member) => member.decision_status === 'accepted'), true);
  assert.equal(updated.item.review.outcome, 'same_work_confirmed');
  assert.equal(updated.item.review.consumption_scope, 'retrieval_dedup');
  assert.equal(updated.item.review.retrieval_dedup_active, true);
  assert.equal(updated.item.review.review_required, false);
});

test('cluster representative update realigns member roles with the representative pointer', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature(literature({
    id: 'LIT-CL-R1',
    title: 'Representative Role Work',
    authors: ['Grace Hopper'],
    year: 2025,
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-R2',
    title: 'Representative Role Work Variant',
    authors: ['G. Hopper'],
    year: 2025,
    titleAuthorsYearHash: null,
  }));
  for (const literatureId of ['LIT-CL-R1', 'LIT-CL-R2']) {
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-representative-role',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const generated = await service.generateCandidates({ cluster_types: ['same_work'] });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  const updated = await service.updateCluster(clusterId!, {
    status: 'confirmed',
    review_outcome: 'same_work_confirmed',
    representative_literature_id: 'LIT-CL-R2',
  });
  const roleByLiteratureId = new Map(updated.item.members.map((member) => [member.literature_id, member.role]));

  assert.equal(updated.item.representative_literature_id, 'LIT-CL-R2');
  assert.equal(roleByLiteratureId.get('LIT-CL-R2'), 'representative');
  assert.equal(roleByLiteratureId.get('LIT-CL-R1'), 'variant');
  assert.equal(updated.item.members.every((member) => member.decision_status === 'accepted'), true);
  assert.equal(updated.item.review.consumption_scope, 'retrieval_dedup');
});

test('cluster member patches cannot create a representative role without the effective representative pointer', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature(literature({
    id: 'LIT-CL-ROLE-1',
    title: 'Representative Guard Work',
    authors: ['Grace Hopper'],
    year: 2025,
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-ROLE-2',
    title: 'Representative Guard Work Variant',
    authors: ['G. Hopper'],
    year: 2025,
    titleAuthorsYearHash: null,
  }));
  for (const literatureId of ['LIT-CL-ROLE-1', 'LIT-CL-ROLE-2']) {
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-representative-guard',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const generated = await service.generateCandidates({ cluster_types: ['same_work'] });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  await assert.rejects(
    () => service.updateCluster(clusterId!, {
      member_decisions: [
        { literature_id: 'LIT-CL-ROLE-2', role: 'representative' },
      ],
    }),
    /Only the effective representative_literature_id can have role representative/,
  );
});

test('confirmed clusters reject unresolved member decisions and missing representatives', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  for (const literatureId of ['LIT-CL-PARTIAL-1', 'LIT-CL-PARTIAL-2', 'LIT-CL-PARTIAL-3']) {
    await repository.createLiterature(literature({
      id: literatureId,
      title: `Partial Review Work ${literatureId.slice(-1)}`,
      authors: ['Katherine Johnson'],
      year: 2026,
      titleAuthorsYearHash: null,
    }));
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-partial-review',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const generated = await service.generateCandidates({ cluster_types: ['same_work'] });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  await assert.rejects(
    () => service.updateCluster(clusterId!, {
      status: 'confirmed',
      review_outcome: 'same_work_confirmed',
      representative_literature_id: 'LIT-CL-PARTIAL-1',
      member_decisions: [
        { literature_id: 'LIT-CL-PARTIAL-1', decision_status: 'accepted', role: 'representative' },
        { literature_id: 'LIT-CL-PARTIAL-2', decision_status: 'accepted', role: 'variant' },
      ],
    }),
    /Confirmed clusters require every member decision to be resolved/,
  );

  await assert.rejects(
    () => service.updateCluster(clusterId!, {
      status: 'confirmed',
      review_outcome: 'same_work_confirmed',
      representative_literature_id: null,
    }),
    /Confirmed clusters require a representative_literature_id/,
  );
});

test('rejected and split clusters reject partial terminal member decisions', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  for (const literatureId of ['LIT-CL-TERM-1', 'LIT-CL-TERM-2']) {
    await repository.createLiterature(literature({
      id: literatureId,
      title: `Terminal Review Work ${literatureId.slice(-1)}`,
      authors: ['Katherine Johnson'],
      year: 2026,
      titleAuthorsYearHash: null,
    }));
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-terminal-review',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const generated = await service.generateCandidates({ cluster_types: ['same_work'] });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  await assert.rejects(
    () => service.updateCluster(clusterId!, {
      status: 'rejected',
      review_outcome: 'rejected',
      member_decisions: [
        { literature_id: 'LIT-CL-TERM-1', decision_status: 'rejected' },
      ],
    }),
    /Rejected or split clusters require all member decisions to be rejected/,
  );

  await assert.rejects(
    () => service.updateCluster(clusterId!, {
      status: 'split',
      review_outcome: 'split',
      member_decisions: [
        { literature_id: 'LIT-CL-TERM-1', decision_status: 'accepted' },
        { literature_id: 'LIT-CL-TERM-2', decision_status: 'rejected' },
      ],
    }),
    /Rejected or split clusters require all member decisions to be rejected/,
  );
});

test('cluster candidate generation can propose related-topic candidates from active embedding similarity', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);

  await repository.createLiterature(literature({
    id: 'LIT-CL-SEM-1',
    title: 'Graph Attention for Program Analysis',
    authors: ['Alice Example'],
    year: 2025,
    doi: '10.1000/semantic-left',
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-SEM-2',
    title: 'Neural Code Representation with Graphs',
    authors: ['Bob Example'],
    year: 2025,
    doi: '10.1000/semantic-right',
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-SEM-3',
    title: 'Quantum Sampling Hardware',
    authors: ['Carol Example'],
    year: 2025,
    doi: '10.1000/semantic-far',
  }));
  await seedActiveEmbedding(repository, 'LIT-CL-SEM-1', [0.95, 0.05, 0]);
  await seedActiveEmbedding(repository, 'LIT-CL-SEM-2', [0.9, 0.1, 0]);
  await seedActiveEmbedding(repository, 'LIT-CL-SEM-3', [0, 0, 1]);

  const response = await service.generateCandidates({
    cluster_types: ['related_topic'],
    min_confidence: 0.95,
  });

  assert.equal(response.generated_count, 1);
  assert.equal(response.summary.embedding_similarity_count, 1);
  assert.equal(response.clusters[0]?.cluster_type, 'related_topic');
  assert.equal(response.clusters[0]?.evidence[0]?.signal_type, 'embedding_similarity');
  assert.equal(response.clusters[0]?.members.some((member) => member.role === 'related'), true);
  assert.deepEqual(
    response.clusters[0]?.members.map((member) => member.literature_id).sort(),
    ['LIT-CL-SEM-1', 'LIT-CL-SEM-2'],
  );
});

test('cluster review outcome validation rejects mismatched consumption decisions', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);
  const now = new Date().toISOString();

  await repository.createLiterature(literature({
    id: 'LIT-CL-MISMATCH-1',
    title: 'Mismatched Review Work',
    authors: ['Ada Lovelace'],
    year: 2026,
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-MISMATCH-2',
    title: 'Mismatched Review Work Copy',
    authors: ['Ada Lovelace'],
    year: 2026,
    titleAuthorsYearHash: null,
  }));
  for (const literatureId of ['LIT-CL-MISMATCH-1', 'LIT-CL-MISMATCH-2']) {
    await repository.upsertContentAsset({
      id: `ASSET-${literatureId}`,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${literatureId}.pdf`,
      checksum: 'sha256-mismatched-review',
      mimeType: 'application/pdf',
      byteSize: 1024,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const generated = await service.generateCandidates({ cluster_types: ['same_work'] });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  await assert.rejects(
    () => service.updateCluster(clusterId!, {
      status: 'confirmed',
      review_outcome: 'related_topic_confirmed',
      representative_literature_id: 'LIT-CL-MISMATCH-1',
    }),
    /review_outcome related_topic_confirmed does not match cluster review outcome same_work_confirmed/,
  );
});

test('confirmed related-topic clusters are consumable as references but never retrieval dedup', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureClusterService(repository);

  await repository.createLiterature(literature({
    id: 'LIT-CL-REL-1',
    title: 'Graph Attention for Program Analysis',
    authors: ['Alice Example'],
    year: 2025,
    doi: '10.1000/related-left',
  }));
  await repository.createLiterature(literature({
    id: 'LIT-CL-REL-2',
    title: 'Neural Code Representation with Graphs',
    authors: ['Bob Example'],
    year: 2025,
    doi: '10.1000/related-right',
  }));
  await seedActiveEmbedding(repository, 'LIT-CL-REL-1', [0.95, 0.05, 0]);
  await seedActiveEmbedding(repository, 'LIT-CL-REL-2', [0.9, 0.1, 0]);

  const generated = await service.generateCandidates({
    cluster_types: ['related_topic'],
    min_confidence: 0.95,
  });
  const clusterId = generated.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  const updated = await service.updateCluster(clusterId!, {
    status: 'confirmed',
    review_outcome: 'related_topic_confirmed',
  });

  assert.equal(updated.item.status, 'confirmed');
  assert.equal(updated.item.cluster_type, 'related_topic');
  assert.equal(updated.item.review.outcome, 'related_topic_confirmed');
  assert.equal(updated.item.review.consumption_scope, 'related_topic_reference');
  assert.equal(updated.item.review.retrieval_dedup_active, false);
  assert.equal(updated.item.review.blocking_reasons.includes('RELATED_TOPIC_NOT_DEDUP_SIGNAL'), true);
  assert.equal(updated.item.members.every((member) => member.decision_status === 'accepted'), true);
});

async function seedActiveEmbedding(
  repository: InMemoryLiteratureRepository,
  literatureId: string,
  vector: number[],
): Promise<void> {
  const now = new Date().toISOString();
  const version = await repository.createEmbeddingVersion({
    id: `${literatureId}-embedding-version`,
    literatureId,
    versionNo: 1,
    status: 'INDEXED',
    profileId: 'default',
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimension: vector.length,
    chunkCount: 1,
    vectorCount: 1,
    tokenCount: 1,
    inputChecksum: `${literatureId}-input`,
    chunkArtifactChecksum: `${literatureId}-chunks`,
    embeddingArtifactChecksum: `${literatureId}-embeddings`,
    indexArtifactChecksum: `${literatureId}-index`,
    indexedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.createEmbeddingChunks([{
    id: `${literatureId}-chunk-row`,
    embeddingVersionId: version.id,
    literatureId,
    chunkId: `${literatureId}-chunk`,
    chunkIndex: 0,
    text: `Semantic chunk for ${literatureId}`,
    startOffset: 0,
    endOffset: 32,
    chunkType: 'semantic_dossier',
    sourceRefs: [],
    metadata: {},
    contentChecksum: `${literatureId}-content`,
    createdAt: now,
    updatedAt: now,
  }]);
  await repository.writeEmbeddingRetrievalVectors([{
    embeddingChunkId: `${literatureId}-chunk-row`,
    normalizedVector: vector,
    updatedAt: now,
  }]);
  const literatureRecord = await repository.findLiteratureById(literatureId);
  assert.ok(literatureRecord);
  await repository.updateLiterature({
    ...literatureRecord,
    activeEmbeddingVersionId: version.id,
    updatedAt: now,
  });
}
