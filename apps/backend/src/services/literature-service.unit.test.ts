import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryResearchLifecycleRepository } from '../repositories/in-memory-research-lifecycle-repository.js';
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
  const literatureService = new LiteratureService(new InMemoryLiteratureRepository(), researchRepository);
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

test('paper literature link status can be updated', async () => {
  const researchRepository = new InMemoryResearchLifecycleRepository();
  const literatureService = new LiteratureService(new InMemoryLiteratureRepository(), researchRepository);
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
  const literatureService = new LiteratureService(new InMemoryLiteratureRepository(), researchRepository);
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
