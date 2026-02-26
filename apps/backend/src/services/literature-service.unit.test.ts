import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryResearchLifecycleRepository } from '../repositories/in-memory-research-lifecycle-repository.js';
import { LiteratureService } from './literature-service.js';
import { ResearchLifecycleService } from './research-lifecycle-service.js';

test('import deduplicates by DOI across providers', async () => {
  const literatureService = new LiteratureService(
    new InMemoryLiteratureRepository(),
    new InMemoryResearchLifecycleRepository(),
  );

  const first = await literatureService.import({
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

  const second = await literatureService.import({
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
});

test('topic scope can sync into paper literature links', async () => {
  const researchRepository = new InMemoryResearchLifecycleRepository();
  const literatureService = new LiteratureService(new InMemoryLiteratureRepository(), researchRepository);
  const lifecycleService = new ResearchLifecycleService(researchRepository);

  const paper = await lifecycleService.createPaperProject({
    topic_id: 'TOPIC-LIT-UNIT-1',
    title: 'Literature Link Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-SEED-1'],
    },
  });

  const imported = await literatureService.import({
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
    topic_id: 'TOPIC-LIT-UNIT-2',
    title: 'Citation Status Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-SEED-2'],
    },
  });

  const imported = await literatureService.import({
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
    topic_id: 'TOPIC-LIT-UNIT-OVERVIEW',
    title: 'Overview Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-OV-1'],
    },
  });

  const imported = await literatureService.import({
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
});

test('metadata update rejects duplicate dedup keys', async () => {
  const literatureService = new LiteratureService(
    new InMemoryLiteratureRepository(),
    new InMemoryResearchLifecycleRepository(),
  );

  const imported = await literatureService.import({
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
