import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureKeyContentExtractionService } from './literature-key-content-extraction-service.js';

const CATEGORY_KEYS = [
  'research_problem',
  'contributions',
  'method',
  'datasets_and_benchmarks',
  'experiments',
  'key_findings',
  'limitations',
  'reproducibility',
  'related_work_positioning',
  'evidence_candidates',
  'figure_insights',
  'table_insights',
  'claim_evidence_map',
  'automation_signals',
] as const;

async function seedLiterature(repository: LiteratureRepository, literatureId: string): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: literatureId,
    title: `Key Content ${literatureId}`,
    abstractText: 'The paper studies source-grounded literature processing.',
    keyContentDigest: 'Existing display digest.',
    authors: ['Grace Hopper'],
    year: 2026,
    doiNormalized: `10.1000/${literatureId.toLowerCase()}`,
    arxivId: null,
    normalizedTitle: `key content ${literatureId.toLowerCase()}`,
    titleAuthorsYearHash: `hash-${literatureId.toLowerCase()}`,
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  });
}

async function seedSourceBundle(repository: LiteratureRepository, literatureId: string): Promise<void> {
  const now = new Date().toISOString();
  const abstractText = 'The paper studies source-grounded literature processing.';
  const paragraphText = 'The method extracts claims with stable paragraph provenance and checks retrieval readiness.';
  await repository.upsertAbstractProfile({
    id: `${literatureId}-abstract`,
    literatureId,
    abstractText,
    abstractSource: 'metadata',
    sourceRef: { provider: 'manual' },
    checksum: sha256(abstractText),
    language: 'en',
    confidence: 0.95,
    reasonCodes: [],
    generated: false,
    createdAt: now,
    updatedAt: now,
  });
  await repository.upsertFulltextExtractionBundle({
    document: {
      id: `${literatureId}-doc`,
      literatureId,
      sourceAssetId: `${literatureId}-asset`,
      normalizedText: paragraphText,
      normalizedTextChecksum: sha256(paragraphText),
      parserName: 'unit-test',
      parserVersion: '1',
      status: 'READY',
      diagnostics: [],
      createdAt: now,
      updatedAt: now,
    },
    sections: [
      {
        id: `${literatureId}-section-row`,
        documentId: `${literatureId}-doc`,
        sectionId: 'section-0001',
        title: 'Method',
        level: 1,
        orderIndex: 0,
        startOffset: 0,
        endOffset: paragraphText.length,
        pageStart: null,
        pageEnd: null,
        checksum: sha256(paragraphText),
        createdAt: now,
        updatedAt: now,
      },
    ],
    paragraphs: [
      {
        id: `${literatureId}-paragraph-row`,
        documentId: `${literatureId}-doc`,
        paragraphId: 'para-0001',
        sectionId: 'section-0001',
        orderIndex: 0,
        text: paragraphText,
        startOffset: 0,
        endOffset: paragraphText.length,
        pageNumber: null,
        checksum: sha256(paragraphText),
        confidence: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    anchors: [
      {
        id: `${literatureId}-anchor-row`,
        documentId: `${literatureId}-doc`,
        anchorId: 'figure-0001',
        anchorType: 'figure',
        label: 'Figure 1',
        text: 'Pipeline overview',
        pageNumber: 1,
        bbox: null,
        targetRefs: [],
        metadata: {},
        checksum: sha256('Pipeline overview'),
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
}

function createSettingsService(): LiteratureContentProcessingSettingsService {
  return {
    resolveOpenAIExtractionConfig: async () => ({
      apiKey: 'sk-test',
      model: 'gpt-5-mini',
      profileId: 'default',
    }),
  } as LiteratureContentProcessingSettingsService;
}

function mockResponses(payload: unknown): () => void {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

function buildOutputPayload(options: { sourceRefId?: string; sourceRefs?: unknown[]; blankIds?: boolean } = {}) {
  const sourceRefs = options.sourceRefs ?? [{ ref_type: 'paragraph', ref_id: options.sourceRefId ?? 'para-0001' }];
  const item = (id: string, type: string, statement: string) => ({
    id: options.blankIds ? '' : id,
    type,
    statement,
    details: `${statement} details.`,
    source_refs: sourceRefs,
    confidence: 0.9,
    evidence_strength: 'high',
    notes: null,
  });
  return {
    categories: {
      ...emptyCategories(),
      research_problem: [item('rp-1', 'problem', 'The work studies source-grounded processing.')],
      contributions: [item('contrib-1', 'contribution', 'It contributes a staged dossier pipeline.')],
      method: [item('method-1', 'method', 'The method validates paragraph source refs.')],
      key_findings: [item('finding-1', 'finding', 'Validated refs preserve provenance.')],
      evidence_candidates: [item('evidence-1', 'evidence', 'The paragraph supports retrieval readiness.')],
    },
    quality_report: {
      extraction_diagnostics: [],
    },
    display_digest: 'Generated digest.',
  };
}

function emptyCategories(): Record<(typeof CATEGORY_KEYS)[number], unknown[]> {
  return Object.fromEntries(CATEGORY_KEYS.map((key) => [key, []])) as unknown as Record<(typeof CATEGORY_KEYS)[number], unknown[]>;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

test('key-content extraction returns READY dossier with resolved source refs and preserved user edits', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-READY-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const now = new Date().toISOString();
  await repository.upsertPipelineArtifact({
    id: `${literatureId}-existing-dossier`,
    literatureId,
    stageCode: 'KEY_CONTENT_READY',
    artifactType: 'KEY_CONTENT_DOSSIER',
    payload: {
      categories: {
        ...emptyCategories(),
        limitations: [
          {
            id: 'user-limit-1',
            type: 'limitation',
            statement: 'User-confirmed limitation.',
            details: '',
            source_refs: [{ ref_type: 'manual', ref_id: 'note-1' }],
            confidence: 1,
            evidence_strength: 'medium',
            notes: null,
            provenance: 'user_edited',
          },
        ],
      },
    },
    checksum: 'existing',
    createdAt: now,
    updatedAt: now,
  });
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const restoreFetch = mockResponses({ output_text: JSON.stringify(buildOutputPayload()) });

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, true);
    assert.equal(result.readinessStatus, 'READY');
    assert.equal(result.displayDigest, 'Existing display digest.');
    const sourceRef = result.payload.categories.research_problem[0]?.source_refs[0];
    assert.equal(sourceRef?.ref_type, 'paragraph');
    assert.equal(sourceRef?.paragraph_id, 'para-0001');
    assert.equal(typeof sourceRef?.checksum, 'string');
    assert.equal(result.payload.categories.limitations.some((item) => item.id === 'user-limit-1' && item.provenance === 'user_edited'), true);
  } finally {
    restoreFetch();
  }
});

test('key-content extraction fails core items that cannot resolve source refs', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-BAD-REF-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const restoreFetch = mockResponses({ output_text: JSON.stringify(buildOutputPayload({ sourceRefId: 'missing-paragraph' })) });

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, false);
    assert.equal(result.reasonCode, 'KEY_CONTENT_VALIDATION_FAILED');
    assert.equal(result.diagnostics.some((item) => item.code === 'SOURCE_REF_UNRESOLVED'), true);
  } finally {
    restoreFetch();
  }
});

test('key-content extraction reports invalid structured output as extraction failure', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-INVALID-JSON-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const restoreFetch = mockResponses({ output_text: 'not json' });

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, false);
    assert.equal(result.reasonCode, 'KEY_CONTENT_EXTRACTION_FAILED');
    assert.match(result.reasonMessage, /parseable structured output/);
  } finally {
    restoreFetch();
  }
});

test('key-content extraction uses deterministic fallback ids when model ids are blank', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-DETERMINISTIC-ID-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const restoreFetch = mockResponses({ output_text: JSON.stringify(buildOutputPayload({ blankIds: true })) });

  try {
    const service = new LiteratureKeyContentExtractionService(repository, createSettingsService());
    const first = await service.extract(literature);
    const second = await service.extract(literature);

    assert.equal(first.ready, true);
    assert.equal(second.ready, true);
    assert.equal(first.payload.categories.research_problem[0]?.id, second.payload.categories.research_problem[0]?.id);
    assert.match(first.payload.categories.research_problem[0]?.id ?? '', /^research_problem-/);
  } finally {
    restoreFetch();
  }
});
