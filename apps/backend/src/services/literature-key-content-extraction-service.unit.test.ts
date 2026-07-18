import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import type {
  LiteratureContentProcessingSettingsService,
  OpenAIExtractionConfig,
} from './literature-content-processing-settings-service.js';
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

async function seedSourceBundle(
  repository: LiteratureRepository,
  literatureId: string,
  options: { sectionCount?: number } = {},
): Promise<void> {
  const now = new Date().toISOString();
  const abstractText = 'The paper studies source-grounded literature processing.';
  const paragraphText = 'The method extracts claims with stable paragraph provenance and checks retrieval readiness.';
  const sectionCount = options.sectionCount ?? 1;
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const position = index + 1;
    return {
      id: `${literatureId}-section-row-${position}`,
      documentId: `${literatureId}-doc`,
      sectionId: `section-${String(position).padStart(4, '0')}`,
      title: position === 1 ? 'Method' : `Evaluation ${position}`,
      level: 1,
      orderIndex: index,
      startOffset: 0,
      endOffset: paragraphText.length,
      pageStart: null,
      pageEnd: null,
      checksum: sha256(`${paragraphText}:${position}`),
      createdAt: now,
      updatedAt: now,
    };
  });
  const paragraphs = sections.map((section, index) => {
    const position = index + 1;
    return {
      id: `${literatureId}-paragraph-row-${position}`,
      documentId: `${literatureId}-doc`,
      paragraphId: `para-${String(position).padStart(4, '0')}`,
      sectionId: section.sectionId,
      orderIndex: 0,
      text: `${paragraphText} Section ${position}.`,
      startOffset: 0,
      endOffset: paragraphText.length,
      pageNumber: null,
      checksum: sha256(`${paragraphText}:${position}`),
      confidence: 1,
      createdAt: now,
      updatedAt: now,
    };
  });
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
      normalizedTextPath: null,
      normalizedTextChecksum: sha256(paragraphText),
      parserArtifactPath: null,
      parserArtifactMimeType: null,
      parserName: 'unit-test',
      parserVersion: '1',
      status: 'READY',
      diagnostics: [],
      createdAt: now,
      updatedAt: now,
    },
    sections,
    paragraphs,
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

function createSettingsService(
  runtime: Partial<OpenAIExtractionConfig['runtime']> = {},
): LiteratureContentProcessingSettingsService {
  return {
    resolveOpenAIProviderApiKey: async () => 'sk-test',
    resolveExtractionConfig: async () => ({
      apiKey: 'sk-test',
      provider: 'openai',
      model: 'gpt-5.6-sol',
      profileId: 'default',
      runtime: {
        section_concurrency: 3,
        request_timeout_ms: 120_000,
        max_retries: 1,
        prompt_profile_id: 'literature_key_content_v2',
        diagnostic_policy: 'actionable_v1',
        ...runtime,
      },
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

function mockResponseSequence(payloads: unknown[]): { restore: () => void; getCallCount: () => number } {
  const previousFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = (async () => {
    const payload = payloads[Math.min(callCount, payloads.length - 1)];
    callCount += 1;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return {
    restore: () => {
      globalThis.fetch = previousFetch;
    },
    getCallCount: () => callCount,
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
      extraction_diagnostics: [] as Array<Record<string, unknown>>,
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
    payloadPath: null,
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

test('key-content extraction consolidates duplicate section claims at paper level', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-CONSOLIDATE-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const extractionPayload = buildOutputPayload();
  extractionPayload.categories.contributions.push({
    id: 'contrib-duplicate',
    type: 'contribution',
    statement: 'It contributes a staged dossier pipeline.',
    details: 'Duplicate section wording.',
    source_refs: [{ ref_type: 'paragraph', ref_id: 'para-0001' }],
    confidence: 0.82,
    evidence_strength: 'medium',
    notes: null,
  });
  const consolidationPayload = buildOutputPayload();
  consolidationPayload.categories.contributions = [{
    id: 'contrib-canonical',
    type: 'contribution',
    statement: 'It contributes a staged dossier pipeline with stable provenance.',
    details: 'Canonical paper-level contribution.',
    source_refs: [{ ref_type: 'paragraph', ref_id: 'para-0001' }],
    confidence: 0.93,
    evidence_strength: 'high',
    notes: null,
  }];
  const fetchMock = mockResponseSequence([
    { output_text: JSON.stringify(extractionPayload) },
    { output_text: JSON.stringify(consolidationPayload) },
  ]);

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, true);
    assert.equal(fetchMock.getCallCount(), 2);
    assert.equal(result.payload.categories.contributions.length, 1);
    assert.equal(
      result.payload.categories.contributions[0]?.statement,
      'It contributes a staged dossier pipeline with stable provenance.',
    );
    assert.equal(
      result.payload.quality_report.extraction_diagnostics.some((item) => item.code === 'KEY_CONTENT_PAPER_LEVEL_CONSOLIDATED'),
      true,
    );
  } finally {
    fetchMock.restore();
  }
});

test('key-content extraction uses low reasoning for section calls and high reasoning for paper consolidation', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-REASONING-PROFILE-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);

  const previousFetch = globalThis.fetch;
  const calls: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_input, init) => {
    calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({
      output_text: JSON.stringify(buildOutputPayload()),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0]?.reasoning, { effort: 'low' });
    assert.deepEqual(calls[1]?.reasoning, { effort: 'high' });
  } finally {
    globalThis.fetch = previousFetch;
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
    assert.match(result.reasonMessage, /parseable JSON/);
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

test('key-content extraction repairs prefixed ids, colon anchor forms, and exact anchor labels', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-REPAIRED-REF-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const restoreFetch = mockResponses({
    output_text: JSON.stringify(buildOutputPayload({
      sourceRefs: [
        { ref_type: 'paragraph', ref_id: 'paragraph:para-0001' },
        { ref_type: 'anchor', ref_id: 'figure:figure-0001:Pipeline overview' },
        { ref_type: 'anchor', ref_id: 'Figure 1' },
      ],
    })),
  });

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, true);
    const refs = result.payload.categories.research_problem[0]?.source_refs ?? [];
    assert.deepEqual(refs.map((item) => item.ref_type), ['paragraph', 'anchor', 'anchor']);
    assert.deepEqual(refs.map((item) => item.ref_id), ['para-0001', 'figure-0001', 'figure-0001']);
    assert.equal(result.diagnostics.some((item) => item.code === 'SOURCE_REF_UNRESOLVED'), false);
  } finally {
    restoreFetch();
  }
});

test('key-content extraction downgrades generic limited-source diagnostics but keeps actionable warnings', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-DIAGNOSTIC-POLICY-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);
  const payload = buildOutputPayload();
  payload.quality_report.extraction_diagnostics = [
    { code: 'limited_source_scope', severity: 'warning', message: 'Only local section context was available.' },
    { code: 'ACTIONABLE_SOURCE_GAP', severity: 'warning', message: 'The method claim cites no paragraph.' },
  ];
  const restoreFetch = mockResponses({ output_text: JSON.stringify(payload) });

  try {
    const result = await new LiteratureKeyContentExtractionService(repository, createSettingsService()).extract(literature);

    assert.equal(result.ready, true);
    const limited = result.diagnostics.find((item) => item.code === 'limited_source_scope');
    const actionable = result.diagnostics.find((item) => item.code === 'ACTIONABLE_SOURCE_GAP');
    assert.equal(limited?.severity, 'info');
    assert.equal(actionable?.severity, 'warning');
  } finally {
    restoreFetch();
  }
});

test('key-content extraction runs section calls with bounded concurrency and deterministic result ordering', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-CONCURRENCY-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId, { sectionCount: 6 });
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);

  const previousFetch = globalThis.fetch;
  let activeCalls = 0;
  let maxActiveCalls = 0;
  const statements: string[] = [];
  globalThis.fetch = (async () => {
    activeCalls += 1;
    maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
    const sectionIndex = statements.length + 1;
    statements.push(`section-${sectionIndex}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    activeCalls -= 1;
    return new Response(JSON.stringify({
      output_text: JSON.stringify(buildOutputPayload({
        sourceRefId: `para-${String(Math.min(sectionIndex, 6)).padStart(4, '0')}`,
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await new LiteratureKeyContentExtractionService(
      repository,
      createSettingsService({ section_concurrency: 3 }),
    ).extract(literature);

    assert.equal(result.ready, true);
    assert.equal(maxActiveCalls, 3);
    assert.equal(statements.length, 7);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('key-content extraction continues when one section extraction has a transient provider failure', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-SECTION-PARTIAL-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId, { sectionCount: 2 });
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { input?: Array<{ content: string }> };
    const prompt = body.input?.map((message) => message.content).join('\n') ?? '';
    if (prompt.includes('Section id: section-0001')) {
      return new Response('', { status: 404 });
    }
    return new Response(JSON.stringify({
      output_text: JSON.stringify(buildOutputPayload({ sourceRefId: 'para-0002' })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await new LiteratureKeyContentExtractionService(
      repository,
      createSettingsService({ max_retries: 0 }),
    ).extract(literature);

    assert.equal(result.ready, true);
    assert.equal(
      result.diagnostics.some((item) => item.code === 'KEY_CONTENT_SECTION_EXTRACTION_FAILED' && item.severity === 'warning'),
      true,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('key-content extraction falls back to deterministic consolidation when paper-level LLM consolidation fails', async () => {
  const repository = new InMemoryLiteratureRepository();
  const literatureId = 'KEY-CONSOLIDATION-FALLBACK-1';
  await seedLiterature(repository, literatureId);
  await seedSourceBundle(repository, literatureId);
  const literature = await repository.findLiteratureById(literatureId);
  assert.ok(literature);

  const fetchMock = mockResponseSequence([
    { output_text: JSON.stringify(buildOutputPayload()) },
    { error: { message: 'temporary provider outage' } },
  ]);
  const previousFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = (async (input, init) => {
    callCount += 1;
    if (callCount === 2) {
      return new Response(JSON.stringify({ error: { message: 'temporary provider outage' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return previousFetch(input, init);
  }) as typeof fetch;

  try {
    const result = await new LiteratureKeyContentExtractionService(
      repository,
      createSettingsService({ max_retries: 0 }),
    ).extract(literature);

    assert.equal(result.ready, true);
    assert.equal(
      result.diagnostics.some((item) => item.code === 'KEY_CONTENT_PAPER_LEVEL_CONSOLIDATION_FALLBACK'),
      true,
    );
    assert.equal(result.payload.categories.research_problem.length, 1);
  } finally {
    globalThis.fetch = previousFetch;
    fetchMock.restore();
  }
});
