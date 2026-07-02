import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryResearchLifecycleRepository } from '../repositories/in-memory-research-lifecycle-repository.js';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureService } from './literature-service.js';
import { ResearchLifecycleService } from './research-lifecycle-service.js';

const tempDirs = new Set<string>();

after(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

test('import deduplicates by DOI across providers', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(
    repository,
    new InMemoryResearchLifecycleRepository(),
  );

  const first = await literatureService.collectionImport({
    items: [
      {
        provider: 'crossref',
        external_id: '10.1000/xyz123',
        title: 'Test Paper',
        authors: ['Alice', 'Bob'],
        year: 2024,
        doi: '10.1000/xyz123',
        source_url: 'https://doi.org/10.1000/xyz123',
      },
    ],
  });

  const second = await literatureService.collectionImport({
    items: [
      {
        provider: 'arxiv',
        external_id: '2401.12345',
        title: 'Test Paper',
        authors: ['Alice', 'Bob'],
        year: 2024,
        doi: 'https://doi.org/10.1000/xyz123',
        arxiv_id: '2401.12345v2',
        source_url: 'https://arxiv.org/abs/2401.12345',
      },
    ],
  });

  assert.equal(first.results.length, 1);
  assert.equal(first.results[0]?.is_new, true);
  assert.equal(second.results.length, 1);
  assert.equal(second.results[0]?.is_new, false);
  assert.equal(second.results[0]?.matched_by, 'doi');
  assert.equal(second.results[0]?.literature_id, first.results[0]?.literature_id);

  const literatureId = first.results[0]?.literature_id;
  assert.ok(literatureId);
  const runs = await repository.listPipelineRunsByLiteratureId(literatureId);
  assert.equal(runs.length, 0);
});

test('collection import allocates literature and source ids from sparse high-water marks', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(
    repository,
    new InMemoryResearchLifecycleRepository(),
  );
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString();

  await repository.createLiterature({
    id: 'LIT-0349',
    title: 'Historical High Water Literature',
    abstractText: null,
    keyContentDigest: null,
    authors: [],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: 'historical high water literature',
    titleAuthorsYearHash: null,
    rightsClass: 'UNKNOWN',
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertLiteratureSource({
    id: 'LSRC-0363',
    literatureId: 'LIT-0349',
    provider: 'web',
    sourceItemId: 'high-water-source',
    sourceUrl: 'https://example.test/high-water-source',
    rawPayload: {},
    fetchedAt: now,
  });

  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'arxiv',
        external_id: '2601.00001',
        title: 'Sparse Identifier Import',
        authors: ['Alice Example'],
        year: 2026,
        arxiv_id: '2601.00001',
        source_url: 'https://arxiv.org/abs/2601.00001',
      },
    ],
  });

  assert.equal(imported.results[0]?.literature_id, 'LIT-0350');
  const sources = await repository.listSourcesByLiteratureId('LIT-0350');
  assert.equal(sources[0]?.id, 'LSRC-0364');
});

test('import merges source provenance and fills canonical identity keys conservatively', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(
    repository,
    new InMemoryResearchLifecycleRepository(),
  );

  const first = await literatureService.collectionImport({
    items: [
      {
        provider: 'crossref',
        external_id: '10.1000/merge-source',
        title: 'Canonical Merge Policy',
        authors: ['Alice Example', 'Bob Example'],
        year: 2025,
        doi: '10.1000/merge-source',
        source_url: 'https://doi.org/10.1000/merge-source',
        tags: ['crossref'],
      },
    ],
  });
  const literatureId = first.results[0]?.literature_id;
  assert.ok(literatureId);

  const second = await literatureService.collectionImport({
    items: [
      {
        provider: 'arxiv',
        external_id: '2501.00001',
        title: 'Canonical Merge Policy',
        authors: ['Bob Example', 'Alice Example'],
        year: 2025,
        arxiv_id: 'https://arxiv.org/abs/2501.00001v2',
        source_url: 'https://arxiv.org/abs/2501.00001',
        rights_class: 'OA',
        tags: ['arxiv'],
      },
    ],
  });

  assert.equal(second.results[0]?.is_new, false);
  assert.equal(second.results[0]?.matched_by, 'title_authors_year');
  assert.equal(second.results[0]?.literature_id, literatureId);
  assert.equal(second.results[0]?.canonical_work_key, 'doi:10.1000/merge-source');

  const merged = await repository.findLiteratureById(literatureId);
  assert.ok(merged);
  assert.equal(merged.doiNormalized, '10.1000/merge-source');
  assert.equal(merged.arxivId, '2501.00001');
  assert.equal(merged.rightsClass, 'OA');
  assert.deepEqual(merged.tags.sort(), ['arxiv', 'crossref']);

  const sources = await repository.listSourcesByLiteratureId(literatureId);
  assert.deepEqual(sources.map((source) => source.provider).sort(), ['arxiv', 'crossref']);
  assert.equal(sources.every((source) => source.rawPayload.canonical_work_key === 'doi:10.1000/merge-source'), true);
});

test('import refreshes title-author-year identity after DOI-only merge fills metadata', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(
    repository,
    new InMemoryResearchLifecycleRepository(),
  );

  const first = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'doi-only-1',
        title: 'Delayed Identity Metadata',
        doi: '10.1000/delayed-identity',
        source_url: 'https://example.com/delayed-identity',
      },
    ],
  });
  const literatureId = first.results[0]?.literature_id;
  assert.ok(literatureId);

  await literatureService.collectionImport({
    items: [
      {
        provider: 'crossref',
        external_id: '10.1000/delayed-identity',
        title: 'Delayed Identity Metadata',
        authors: ['Ada Lovelace'],
        year: 2026,
        doi: 'https://doi.org/10.1000/delayed-identity',
        source_url: 'https://doi.org/10.1000/delayed-identity',
      },
    ],
  });

  const third = await literatureService.collectionImport({
    items: [
      {
        provider: 'web',
        external_id: 'delayed-identity-web',
        title: 'Delayed Identity Metadata',
        authors: ['Ada Lovelace'],
        year: 2026,
        source_url: 'https://example.com/delayed-identity-web',
      },
    ],
  });

  assert.equal(third.results[0]?.is_new, false);
  assert.equal(third.results[0]?.matched_by, 'title_authors_year');
  assert.equal(third.results[0]?.literature_id, literatureId);

  const merged = await repository.findLiteratureById(literatureId);
  assert.ok(merged);
  assert.equal(merged.titleAuthorsYearHash !== null, true);
  assert.deepEqual(merged.authors, ['Ada Lovelace']);
  assert.equal(merged.year, 2026);
});

test('zotero collection import does not enqueue content-processing runs', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(
    repository,
    new InMemoryResearchLifecycleRepository(),
  );
  const previousFetch = globalThis.fetch;

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => [
      {
        key: 'ZOTERO-UNIT-1',
        data: {
          title: 'Zotero Collection Boundary Paper',
          creators: [{ firstName: 'Ada', lastName: 'Lovelace' }],
          date: '2026',
          DOI: '10.1000/zotero-boundary',
          url: 'https://example.com/zotero-boundary',
          abstractNote: 'Collected abstract.',
          tags: [{ tag: 'zotero' }],
        },
      },
    ],
  }) as unknown as Response) as typeof fetch;

  try {
    const imported = await literatureService.zoteroCollectionImport({
      library_type: 'users',
      library_id: '123456',
      topic_id: 'TOPIC-ZOTERO-BOUNDARY',
      scope_status: 'in_scope',
      tags: ['seed'],
    });

    assert.equal(imported.imported_count, 1);
    assert.equal(imported.scope_upserted_count, 1);
    const literatureId = imported.results[0]?.literature_id;
    assert.ok(literatureId);

    const runs = await repository.listPipelineRunsByLiteratureId(literatureId);
    assert.equal(runs.length, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('topic scope can sync into paper literature links', async () => {
  const researchRepository = new InMemoryResearchLifecycleRepository();
  const literatureRepository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(literatureRepository, researchRepository);
  const lifecycleService = new ResearchLifecycleService(researchRepository);

  const paper = await lifecycleService.createPaperProject({
    title_card_id: 'title_card_lit_unit_1',
    title: 'Literature Link Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-SEED-1'],
    },
  });

  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'crossref',
        external_id: '10.1000/topic-flow',
        title: 'Topic Flow Paper',
        authors: ['Eve'],
        year: 2023,
        doi: '10.1000/topic-flow',
        source_url: 'https://doi.org/10.1000/topic-flow',
      },
    ],
  });

  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);
  await markLiteratureEvidenceReady(literatureRepository, literatureId);

  const scoped = await literatureService.upsertTopicScope('TOPIC-LIT-UNIT-1', {
    actions: [
      {
        literature_id: literatureId,
        scope_status: 'in_scope',
      },
    ],
  });
  assert.equal(scoped.items.length, 1);
  assert.equal(scoped.items[0]?.scope_status, 'in_scope');

  const synced = await literatureService.syncPaperLiteratureFromTopic(paper.paper_id, {
    topic_id: 'TOPIC-LIT-UNIT-1',
  });
  assert.equal(synced.linked_count, 1);
  assert.equal(synced.skipped_count, 0);

  const links = await literatureService.getPaperLiterature(paper.paper_id);
  assert.equal(links.items.length, 1);
  assert.equal(links.items[0]?.citation_status, 'seeded');
});

test('topic scope id generation is max+1 over surviving ids, not count+1', async () => {
  // Regression for the first product run (T-128 W-10): after bulk row deletions the table
  // count lags the highest surviving id, so count+1 minted an id that collided with an
  // existing primary key. The generator must derive from the max surviving numeric id.
  const researchRepository = new InMemoryResearchLifecycleRepository();
  const literatureRepository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(literatureRepository, researchRepository);

  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'crossref',
        external_id: '10.1000/scope-id-a',
        title: 'Scope Id Paper A',
        authors: ['Ann'],
        year: 2024,
        doi: '10.1000/scope-id-a',
        source_url: 'https://doi.org/10.1000/scope-id-a',
      },
      {
        provider: 'crossref',
        external_id: '10.1000/scope-id-b',
        title: 'Scope Id Paper B',
        authors: ['Ben'],
        year: 2024,
        doi: '10.1000/scope-id-b',
        source_url: 'https://doi.org/10.1000/scope-id-b',
      },
    ],
  });
  const [litA, litB] = imported.results.map((result) => result.literature_id);
  assert.ok(litA && litB);

  // Model the post-cleanup shape directly in the repository: one surviving scope whose
  // numeric id (TSCP-0009) is far above the table count (1).
  const now = new Date().toISOString();
  await literatureRepository.upsertTopicScope({
    id: 'TSCP-0009',
    topicId: 'TOPIC-SCOPE-ID-REGRESSION',
    literatureId: litA,
    scopeStatus: 'in_scope',
    reason: null,
    activationStatus: 'eligible',
    activationReason: 'MANUAL_SCOPE_IN_SCOPE',
    activationScore: null,
    activatedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await literatureService.upsertTopicScope('TOPIC-SCOPE-ID-REGRESSION', {
    actions: [
      {
        literature_id: litB,
        scope_status: 'in_scope',
      },
    ],
  });

  const scopes = await literatureRepository.listTopicScopesByTopicId('TOPIC-SCOPE-ID-REGRESSION');
  const created = scopes.find((scope) => scope.literatureId === litB);
  assert.ok(created, 'expected the new topic scope to be created');
  assert.equal(created.id, 'TSCP-0010');
});

test('paper literature link status can be updated', async () => {
  const researchRepository = new InMemoryResearchLifecycleRepository();
  const literatureRepository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(literatureRepository, researchRepository);
  const lifecycleService = new ResearchLifecycleService(researchRepository);

  const paper = await lifecycleService.createPaperProject({
    title_card_id: 'title_card_lit_unit_2',
    title: 'Citation Status Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-SEED-2'],
    },
  });

  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'arxiv',
        external_id: '2501.54321',
        title: 'Citation Status Source',
        authors: ['John Doe'],
        year: 2025,
        arxiv_id: '2501.54321',
        source_url: 'https://arxiv.org/abs/2501.54321',
      },
    ],
  });

  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);
  await markLiteratureEvidenceReady(literatureRepository, literatureId);

  await literatureService.upsertTopicScope('TOPIC-LIT-UNIT-2', {
    actions: [{ literature_id: literatureId, scope_status: 'in_scope' }],
  });
  await literatureService.syncPaperLiteratureFromTopic(paper.paper_id, {
    topic_id: 'TOPIC-LIT-UNIT-2',
  });

  const before = await literatureService.getPaperLiterature(paper.paper_id);
  const linkId = before.items[0]?.link_id;
  assert.ok(linkId);

  const updated = await literatureService.updatePaperLiteratureLink(paper.paper_id, linkId, {
    citation_status: 'cited',
    note: 'Used in section 2.',
  });

  assert.equal(updated.item.citation_status, 'cited');
  assert.equal(updated.item.note, 'Used in section 2.');
});

test('literature overview includes summary and metadata updates', async () => {
  const researchRepository = new InMemoryResearchLifecycleRepository();
  const literatureRepository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(literatureRepository, researchRepository);
  const lifecycleService = new ResearchLifecycleService(researchRepository);

  const paper = await lifecycleService.createPaperProject({
    title_card_id: 'title_card_lit_unit_overview',
    title: 'Overview Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-OV-1'],
    },
  });

  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'manual-001',
        title: 'Metadata Driven Evidence',
        authors: ['Ada Lovelace'],
        year: 2025,
        source_url: 'https://example.com/meta-1',
        tags: ['baseline'],
      },
      {
        provider: 'manual',
        external_id: 'manual-002',
        title: 'Excluded Evidence',
        authors: ['Grace Hopper'],
        year: 2024,
        source_url: 'https://example.com/meta-2',
        tags: ['negative'],
      },
    ],
  });

  const firstLiteratureId = imported.results[0]?.literature_id;
  const secondLiteratureId = imported.results[1]?.literature_id;
  assert.ok(firstLiteratureId);
  assert.ok(secondLiteratureId);

  await literatureService.updateLiteratureMetadata(firstLiteratureId, {
    rights_class: 'OA',
    tags: ['dataset', 'benchmark'],
    abstract: 'Updated abstract',
  });
  await markLiteratureEvidenceReady(literatureRepository, firstLiteratureId);

  await literatureService.upsertTopicScope('TOPIC-LIT-UNIT-OVERVIEW', {
    actions: [
      { literature_id: firstLiteratureId, scope_status: 'in_scope' },
      { literature_id: secondLiteratureId, scope_status: 'excluded' },
    ],
  });

  await literatureService.syncPaperLiteratureFromTopic(paper.paper_id, {
    topic_id: 'TOPIC-LIT-UNIT-OVERVIEW',
  });

  const links = await literatureService.getPaperLiterature(paper.paper_id);
  const linkId = links.items[0]?.link_id;
  assert.ok(linkId);
  await literatureService.updatePaperLiteratureLink(paper.paper_id, linkId, {
    citation_status: 'cited',
  });

  const overview = await literatureService.getOverview({
    topic_id: 'TOPIC-LIT-UNIT-OVERVIEW',
    paper_id: paper.paper_id,
  });

  assert.equal(overview.summary.total_literatures, 2);
  assert.equal(overview.summary.topic_scope_total, 2);
  assert.equal(overview.summary.in_scope_count, 1);
  assert.equal(overview.summary.excluded_count, 1);
  assert.equal(overview.summary.paper_link_total, 1);
  assert.equal(overview.summary.cited_count, 1);
  assert.equal(overview.summary.used_count, 0);

  const firstItem = overview.items.find((item) => item.literature_id === firstLiteratureId);
  assert.ok(firstItem);
  assert.deepEqual(firstItem.tags, ['dataset', 'benchmark']);
  assert.equal(firstItem.rights_class, 'OA');
  assert.equal(firstItem.citation_status, 'cited');
  assert.equal(firstItem.content_processing_state.abstract_ready, false);
  assert.equal(firstItem.content_processing_state.indexed, false);
});

test('metadata update rejects duplicate dedup keys', async () => {
  const literatureService = new LiteratureService(
    new InMemoryLiteratureRepository(),
    new InMemoryResearchLifecycleRepository(),
  );

  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'dup-1',
        title: 'Conflict A',
        authors: ['Author A'],
        year: 2024,
        doi: '10.1000/conflict-a',
        source_url: 'https://example.com/conflict-a',
      },
      {
        provider: 'manual',
        external_id: 'dup-2',
        title: 'Conflict B',
        authors: ['Author B'],
        year: 2023,
        doi: '10.1000/conflict-b',
        source_url: 'https://example.com/conflict-b',
      },
    ],
  });

  const targetId = imported.results[1]?.literature_id;
  assert.ok(targetId);

  await assert.rejects(
    literatureService.updateLiteratureMetadata(targetId, {
      doi: '10.1000/conflict-a',
    }),
    /already exists/,
  );
});

test('collection upsert marks processed citation profile stale without enqueueing a run', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(repository, new InMemoryResearchLifecycleRepository());
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'collection-stale-1',
        title: 'Collection Stale Source',
        abstract: 'Trusted collection abstract.',
        authors: ['Ada Lovelace'],
        year: 2025,
        doi: '10.1000/collection-stale',
        source_url: 'https://example.com/collection-stale-1',
      },
    ],
  });
  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);

  const run = await literatureService.createContentProcessingRun(literatureId, {
    requested_stages: ['CITATION_NORMALIZED', 'ABSTRACT_READY'],
  });
  const terminal = await waitForTerminalRun(repository, run.run.run_id);
  assert.equal(terminal.status, 'SUCCESS');

  await literatureService.collectionImport({
    items: [
      {
        provider: 'web',
        external_id: 'collection-stale-2',
        title: 'Collection Stale Source',
        abstract: 'Trusted collection abstract.',
        authors: ['Ada Lovelace'],
        year: 2025,
        doi: '10.1000/collection-stale',
        source_url: 'https://example.com/collection-stale-2',
      },
    ],
  });

  const runs = await repository.listPipelineRunsByLiteratureId(literatureId);
  assert.equal(runs.length, 1);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId(literatureId);
  const citationStage = stageStates.find((stage) => stage.stageCode === 'CITATION_NORMALIZED');
  assert.equal(citationStage?.status, 'STALE');
  assert.equal(citationStage?.detail.reason_code, 'COLLECTION_CITATION_SOURCE_CHANGED');
});

test('content asset registration supports explicit fulltext processing and metadata stale without auto enqueue', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(repository, new InMemoryResearchLifecycleRepository());
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'asset-1',
        title: 'Asset Backed Fulltext',
        abstract: 'Trusted abstract for asset-backed fulltext.',
        authors: ['Ada Lovelace'],
        year: 2025,
        source_url: 'https://example.com/asset-backed',
        rights_class: 'OA',
      },
    ],
  });
  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-service-asset-'));
  tempDirs.add(dir);
  const fulltextPath = path.join(dir, 'asset-backed.md');
  await fs.writeFile(
    fulltextPath,
    '# Abstract\n\nTrusted abstract for asset-backed fulltext.\n\n# Findings\n\nFulltext paragraphs preserve offsets.\n\n![Pipeline figure](figure-1.png)\n\n| Metric | Value |\n| --- | --- |\n| F1 | 0.91 |\n\n$$x + y = z$$',
    'utf8',
  );

  const registered = await literatureService.registerContentAsset(literatureId, {
    local_path: fulltextPath,
    mime_type: 'text/markdown',
  });
  assert.equal(registered.item.status, 'registered');
  assert.equal(registered.item.mime_type, 'text/markdown');
  assert.equal(registered.item.byte_size > 0, true);

  const runsAfterRegistration = await repository.listPipelineRunsByLiteratureId(literatureId);
  assert.equal(runsAfterRegistration.length, 0);

  const run = await literatureService.createContentProcessingRun(literatureId, {
    requested_stages: ['CITATION_NORMALIZED', 'ABSTRACT_READY', 'FULLTEXT_PREPROCESSED'],
  });
  const terminal = await waitForTerminalRun(repository, run.run.run_id);
  assert.equal(terminal.status, 'SUCCESS');

  const citationProfile = await repository.findCitationProfileByLiteratureId(literatureId);
  assert.ok(citationProfile);
  assert.equal(citationProfile.citationComplete, true);
  assert.equal(citationProfile.incompleteReasonCodes.length, 0);
  assert.equal(typeof citationProfile.inputChecksum, 'string');

  const abstractProfile = await repository.findAbstractProfileByLiteratureId(literatureId);
  assert.ok(abstractProfile);
  assert.equal(abstractProfile.generated, false);
  assert.equal(abstractProfile.abstractSource, 'collection_metadata');
  assert.equal(typeof abstractProfile.checksum, 'string');

  const documents = await repository.listFulltextDocumentsByLiteratureId(literatureId);
  assert.equal(documents.length, 1);
  const paragraphs = await repository.listFulltextParagraphsByDocumentId(documents[0]!.id);
  assert.equal(paragraphs.length >= 2, true);
  assert.equal(paragraphs.every((paragraph) => paragraph.startOffset < paragraph.endOffset), true);
  const anchors = await repository.listFulltextAnchorsByDocumentId(documents[0]!.id);
  assert.equal(anchors.length, 3);
  assert.deepEqual(anchors.map((anchor) => anchor.anchorType).sort(), ['figure', 'formula', 'table']);

  await literatureService.updateLiteratureMetadata(literatureId, {
    abstract: 'Updated trusted abstract.',
  });
  const runsAfterMetadataPatch = await repository.listPipelineRunsByLiteratureId(literatureId);
  assert.equal(runsAfterMetadataPatch.length, 1);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId(literatureId);
  const abstractStage = stageStates.find((stage) => stage.stageCode === 'ABSTRACT_READY');
  assert.equal(abstractStage?.status, 'STALE');
  assert.equal(abstractStage?.detail.reason_code, 'ABSTRACT_CHANGED');
});

test('content asset registration rejects mismatched checksum for readable local path', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(repository, new InMemoryResearchLifecycleRepository());
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'asset-checksum-mismatch',
        title: 'Asset Checksum Mismatch',
        authors: ['Ada Lovelace'],
        year: 2025,
        source_url: 'https://example.com/asset-checksum-mismatch',
      },
    ],
  });
  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-service-asset-'));
  tempDirs.add(dir);
  const fulltextPath = path.join(dir, 'checksum.md');
  await fs.writeFile(fulltextPath, '# Abstract\n\nChecksum source.', 'utf8');

  await assert.rejects(
    literatureService.registerContentAsset(literatureId, {
      local_path: fulltextPath,
      checksum: 'not-the-real-checksum',
      byte_size: 1,
    }),
    /checksum does not match/,
  );
});

test('content asset registration records non-destructive checksum coalescing candidates', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(repository, new InMemoryResearchLifecycleRepository());
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'asset-coalesce-1',
        title: 'Asset Coalesce One',
        authors: ['Ada Lovelace'],
        year: 2025,
        source_url: 'https://example.com/asset-coalesce-1',
        rights_class: 'OA',
      },
      {
        provider: 'manual',
        external_id: 'asset-coalesce-2',
        title: 'Asset Coalesce Two',
        authors: ['Grace Hopper'],
        year: 2025,
        source_url: 'https://example.com/asset-coalesce-2',
        rights_class: 'OA',
      },
    ],
  });
  const firstLiteratureId = imported.results[0]?.literature_id;
  const secondLiteratureId = imported.results[1]?.literature_id;
  assert.ok(firstLiteratureId);
  assert.ok(secondLiteratureId);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-service-coalesce-'));
  tempDirs.add(dir);
  const firstPath = path.join(dir, 'first.pdf');
  const secondPath = path.join(dir, 'second.pdf');
  const payload = '%PDF-1.4 identical coalescing payload';
  await fs.writeFile(firstPath, payload, 'utf8');
  await fs.writeFile(secondPath, payload, 'utf8');

  const first = await literatureService.registerContentAsset(firstLiteratureId, {
    local_path: firstPath,
    mime_type: 'application/pdf',
  });
  const second = await literatureService.registerContentAsset(secondLiteratureId, {
    local_path: secondPath,
    mime_type: 'application/pdf',
  });

  assert.equal(first.item.metadata.storage_coalescing, undefined);
  const coalescing = second.item.metadata.storage_coalescing as Record<string, unknown> | undefined;
  assert.ok(coalescing);
  assert.equal(coalescing.status, 'candidate');
  assert.equal(coalescing.strategy, 'same_checksum_reuse_candidate_v1');
  assert.equal(coalescing.canonical_asset_id, first.item.asset_id);
  assert.equal(coalescing.canonical_literature_id, firstLiteratureId);
  assert.equal(coalescing.destructive_cleanup_allowed, false);
});

test('content asset download stores remote content under raw files and registers it', async () => {
  const repository = new InMemoryLiteratureRepository();
  const rawFilesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-service-download-'));
  tempDirs.add(rawFilesRoot);
  const settingsService = {
    resolveStorageRoot: async () => rawFilesRoot,
  };
  const literatureService = new LiteratureService(
    repository,
    new InMemoryResearchLifecycleRepository(),
    settingsService as unknown as LiteratureContentProcessingSettingsService,
  );
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'arxiv',
        external_id: '2501.00001',
        title: 'Remote Download Asset',
        abstract: 'Remote abstract.',
        authors: ['Ada Lovelace'],
        year: 2025,
        arxiv_id: '2501.00001',
        source_url: 'https://arxiv.org/abs/2501.00001',
        rights_class: 'OA',
      },
    ],
  });
  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);
  const previousFetch = globalThis.fetch;
  const payload = Buffer.from('%PDF-1.4 test pdf body');
  globalThis.fetch = (async () => new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(payload.length),
    },
  })) as typeof fetch;

  try {
    const downloaded = await literatureService.downloadContentAsset(literatureId, {
      source_url: 'https://arxiv.org/pdf/2501.00001',
      max_byte_size: 1024,
      metadata: { source: 'unit-test' },
    });

    assert.equal(downloaded.item.status, 'registered');
    assert.equal(downloaded.item.mime_type, 'application/pdf');
    assert.equal(downloaded.item.byte_size, payload.length);
    assert.equal(downloaded.item.metadata.downloaded_from, 'https://arxiv.org/pdf/2501.00001');
    assert.equal(downloaded.item.metadata.source, 'unit-test');
    assert.equal(downloaded.item.local_path.startsWith(path.join(rawFilesRoot, literatureId)), true);
    const stored = await fs.readFile(downloaded.item.local_path);
    assert.deepEqual(stored, payload);

    const assets = await repository.listContentAssetsByLiteratureId(literatureId);
    assert.equal(assets.length, 1);
    const runs = await repository.listPipelineRunsByLiteratureId(literatureId);
    assert.equal(runs.length, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('content asset download rejects non-http source URLs', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(repository, new InMemoryResearchLifecycleRepository());
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'download-invalid-url',
        title: 'Invalid Download URL',
        authors: ['Ada Lovelace'],
        year: 2025,
        source_url: 'https://example.com/download-invalid-url',
      },
    ],
  });
  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);

  await assert.rejects(
    literatureService.downloadContentAsset(literatureId, {
      source_url: 'file:///tmp/paper.pdf',
    }),
    /source_url must use http or https/,
  );
});

test('metadata display digest update does not stale semantic content-processing stages', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureService = new LiteratureService(repository, new InMemoryResearchLifecycleRepository());
  const imported = await literatureService.collectionImport({
    items: [
      {
        provider: 'manual',
        external_id: 'display-digest-only',
        title: 'Display Digest Only',
        abstract: 'Trusted abstract for display digest.',
        authors: ['Ada Lovelace'],
        year: 2025,
        source_url: 'https://example.com/display-digest-only',
      },
    ],
  });
  const literatureId = imported.results[0]?.literature_id;
  assert.ok(literatureId);
  const now = new Date().toISOString();
  await repository.upsertPipelineStageState({
    id: `${literatureId}-key-content-stage`,
    literatureId,
    stageCode: 'KEY_CONTENT_READY',
    status: 'SUCCEEDED',
    lastRunId: null,
    detail: { artifact_type: 'KEY_CONTENT_DOSSIER' },
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: `${literatureId}-indexed-stage`,
    literatureId,
    stageCode: 'INDEXED',
    status: 'SUCCEEDED',
    lastRunId: null,
    detail: { embedding_version_id: 'version-1' },
    updatedAt: now,
  });

  await literatureService.updateLiteratureMetadata(literatureId, {
    key_content_digest: 'Short display digest only.',
  });

  const runs = await repository.listPipelineRunsByLiteratureId(literatureId);
  assert.equal(runs.length, 0);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId(literatureId);
  assert.equal(stageStates.find((stage) => stage.stageCode === 'KEY_CONTENT_READY')?.status, 'SUCCEEDED');
  assert.equal(stageStates.find((stage) => stage.stageCode === 'INDEXED')?.status, 'SUCCEEDED');
});

async function markLiteratureEvidenceReady(
  repository: InMemoryLiteratureRepository,
  literatureId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const versionId = `EV-${literatureId}`;
  await repository.createEmbeddingVersion({
    id: versionId,
    literatureId,
    versionNo: 1,
    status: 'INDEXED',
    profileId: 'default',
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimension: 3,
    chunkCount: 1,
    vectorCount: 1,
    tokenCount: 4,
    inputChecksum: 'input',
    chunkArtifactChecksum: 'chunk',
    embeddingArtifactChecksum: 'embedding',
    indexArtifactChecksum: 'index',
    indexedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await repository.updateLiterature({
    ...literature,
    activeEmbeddingVersionId: versionId,
    updatedAt: now,
  });
  await repository.upsertPipelineState({
    id: `pipeline-${literatureId}`,
    literatureId,
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });
  await repository.upsertQualityAssessment({
    id: `quality-${literatureId}`,
    literatureId,
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

async function waitForTerminalRun(repository: InMemoryLiteratureRepository, runId: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const run = await repository.findPipelineRunById(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found.`);
    }
    if (run.status === 'SUCCESS' || run.status === 'FAILED' || run.status === 'PARTIAL' || run.status === 'SKIPPED') {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for run ${runId}.`);
}
