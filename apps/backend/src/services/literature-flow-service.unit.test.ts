import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import type { RightsClass } from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import { AppError } from '../errors/app-error.js';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { LiteratureFlowService, PIPELINE_STAGE_CODES } from './literature-flow-service.js';

const tempDirs = new Set<string>();

after(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function seedLiterature(
  repository: LiteratureRepository,
  literatureId: string,
  rightsClass: RightsClass,
  options: {
    abstractText?: string | null;
    keyContentDigest?: string | null;
    fulltextText?: string;
    fulltextExtension?: '.txt' | '.md' | '.pdf';
  } = {},
): Promise<void> {
  const now = new Date().toISOString();
  await repository.createLiterature({
    id: literatureId,
    title: `Pipeline ${literatureId}`,
    abstractText: options.abstractText ?? null,
    keyContentDigest: options.keyContentDigest ?? null,
    authors: ['Ada Lovelace'],
    year: 2025,
    doiNormalized: `10.1000/${literatureId.toLowerCase()}`,
    arxivId: null,
    normalizedTitle: `pipeline ${literatureId.toLowerCase()}`,
    titleAuthorsYearHash: `hash-${literatureId.toLowerCase()}`,
    rightsClass,
    tags: ['pipeline-test'],
    activeEmbeddingVersionId: null,
    createdAt: now,
    updatedAt: now,
  });

  await repository.upsertLiteratureSource({
    id: `${literatureId}-source`,
    literatureId,
    provider: 'manual',
    sourceItemId: `${literatureId}-source-item`,
    sourceUrl: `https://example.test/${literatureId.toLowerCase()}`,
    rawPayload: {},
    fetchedAt: now,
  });

  if (options.fulltextText !== undefined) {
    await seedRawFulltextAsset(repository, literatureId, options.fulltextText, options.fulltextExtension ?? '.txt');
  }
}

async function seedRawFulltextAsset(
  repository: LiteratureRepository,
  literatureId: string,
  text: string,
  extension: '.txt' | '.md' | '.pdf' = '.txt',
): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-fulltext-'));
  tempDirs.add(dir);
  const localPath = path.join(dir, `paper${extension}`);
  await fs.writeFile(localPath, text, 'utf8');
  const checksum = crypto.createHash('sha256').update(text).digest('hex');
  const now = new Date().toISOString();
  await repository.upsertContentAsset({
    id: `${literatureId}-asset-${Date.now()}`,
    literatureId,
    assetKind: 'raw_fulltext',
    sourceKind: 'local_path',
    localPath,
    checksum,
    mimeType: extension === '.md' ? 'text/markdown' : extension === '.pdf' ? 'application/pdf' : 'text/plain',
    byteSize: Buffer.byteLength(text),
    rightsClass: 'OA',
    status: 'registered',
    metadata: {},
    createdAt: now,
    updatedAt: now,
  });
  return localPath;
}

async function waitForTerminalRun(repository: LiteratureRepository, runId: string) {
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

function createMockSettingsService(
  options: { grobidEndpointUrl?: string } = {},
): LiteratureContentProcessingSettingsService {
  const root = path.join(os.tmpdir(), `pea-lit-content-processing-${crypto.randomUUID()}`);
  tempDirs.add(root);
  return {
    resolveStorageRoot: async (key: string) => {
      const directory = path.join(root, String(key));
      await fs.mkdir(directory, { recursive: true });
      return directory;
    },
    resolveGrobidEndpointUrl: async () => options.grobidEndpointUrl ?? 'http://localhost:8070',
    resolveOpenAIProviderApiKey: async () => 'sk-test',
    resolveExtractionConfig: async () => ({
      apiKey: 'sk-test',
      provider: 'openai',
      model: 'gpt-5.5',
      profileId: 'default',
      runtime: {
        preferred_key_content_method: 'llm_gateway',
        section_concurrency: 3,
        request_timeout_ms: 120_000,
        max_retries: 1,
        prompt_profile_id: 'literature_key_content_v2',
        diagnostic_policy: 'actionable_v1',
      },
    }),
    resolveOpenAIEmbeddingConfig: async () => ({
      apiKey: 'sk-test',
      profileId: 'default',
      model: 'text-embedding-3-large',
      dimensions: 3,
    }),
    resolveActiveEmbeddingProfile: async () => ({
      profileId: 'default',
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3,
    }),
    resolvePreferredKeyContentMethod: async () => 'llm_gateway',
  } as LiteratureContentProcessingSettingsService;
}

function mockOpenAIContentProcessing(): () => void {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (url.endsWith('/v1/responses')) {
      return new Response(JSON.stringify({
        output_text: JSON.stringify(buildMockDossierPayload()),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/v1/embeddings')) {
      const rawInput = body.input;
      const inputs = Array.isArray(rawInput) ? rawInput : [rawInput];
      return new Response(JSON.stringify({
        data: inputs.map((_item, index) => ({
          index,
          embedding: [0.1 + index / 100, 0.2, 0.3],
        })),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = previousFetch;
  };
}

function mockGrobidFulltext(response: { status: number; body?: string; throwError?: boolean }): () => void {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    if (url.endsWith('/api/processFulltextDocument')) {
      if (response.throwError) {
        throw new Error('connect ECONNREFUSED');
      }
      return new Response(response.status === 204 ? null : response.body ?? '', {
        status: response.status,
        headers: { 'Content-Type': 'application/xml' },
      });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

function buildGrobidTeiFixture(): string {
  return [
    '<TEI xmlns="http://www.tei-c.org/ns/1.0">',
    '<text><body>',
    '<div xml:id="section-0001" coords="1,10,20,500,40">',
    '<head>Method</head>',
    '<p xml:id="para-0001" coords="1,10,70,500,80">The PDF method preserves section paragraphs and layout anchors.</p>',
    '<figure xml:id="figure-0001" coords="2,20,30,240,120"><label>Figure 1</label><figDesc>Processing architecture.</figDesc></figure>',
    '</div>',
    '</body></text>',
    '</TEI>',
  ].join('');
}

function buildMockDossierPayload() {
  const item = (id: string, type: string, statement: string) => ({
    id,
    type,
    statement,
    details: `${statement} details.`,
    source_refs: [{ ref_type: 'paragraph', ref_id: 'para-0001' }],
    confidence: 0.9,
    evidence_strength: 'high',
    notes: null,
  });
  return {
    categories: {
      research_problem: [item('rp-1', 'problem', 'The paper studies retrieval evidence workflows.')],
      contributions: [item('contrib-1', 'contribution', 'The paper contributes a source-grounded pipeline.')],
      method: [item('method-1', 'method', 'The method uses staged processing.')],
      datasets_and_benchmarks: [],
      experiments: [],
      key_findings: [item('finding-1', 'finding', 'The pipeline preserves provenance.')],
      limitations: [],
      reproducibility: [item('repro-1', 'reproducibility', 'The fixture includes reproducible anchors.')],
      related_work_positioning: [],
      evidence_candidates: [item('evidence-1', 'evidence', 'Paragraph evidence supports the claim.')],
      figure_insights: [],
      table_insights: [],
      claim_evidence_map: [item('claim-map-1', 'claim_evidence', 'The claim maps to paragraph evidence.')],
      automation_signals: [item('signal-1', 'automation', 'Useful for retrieval automation.')],
    },
    quality_report: {
      extraction_diagnostics: [],
    },
    display_digest: 'Source-grounded pipeline dossier.',
  };
}

function buildCuratedDossierPayload(paragraphId: string, documentChecksum: string) {
  const ref = { ref_type: 'paragraph' as const, ref_id: paragraphId };
  const item = (id: string, type: string, statement: string) => ({
    id,
    type,
    statement,
    details: `${statement} details.`,
    source_refs: [ref],
    confidence: 0.95,
    evidence_strength: 'high' as const,
    notes: null,
    provenance: 'model_generated' as const,
  });
  return {
    schema_version: 'key_content.v1' as const,
    extraction_profile: 'paper_semantic_dossier.v1' as const,
    readiness_status: 'READY' as const,
    input_refs: {
      fulltext_checksum: documentChecksum,
    },
    categories: {
      research_problem: [item('curated-rp-1', 'problem', 'The paper needs curated evidence extraction.')],
      contributions: [item('curated-contrib-1', 'contribution', 'The curated path imports source-grounded dossiers.')],
      method: [item('curated-method-1', 'method', 'The method validates source refs before import.')],
      datasets_and_benchmarks: [],
      experiments: [],
      key_findings: [item('curated-finding-1', 'finding', 'Curated import reaches KEY_CONTENT_READY without provider calls.')],
      limitations: [],
      reproducibility: [],
      related_work_positioning: [],
      evidence_candidates: [item('curated-evidence-1', 'evidence', 'The paragraph source ref grounds the dossier.')],
      figure_insights: [],
      table_insights: [],
      claim_evidence_map: [],
      automation_signals: [],
    },
    quality_report: {
      completeness_score: 0.357,
      confidence: 0.95,
      blockers: [],
      warnings: [],
      conflicts: [],
      extraction_diagnostics: [],
    },
    display_digest: 'Curated source-grounded key-content dossier.',
    generated_at: '2026-05-10T00:00:00.000Z',
  };
}

test('literature flow executes all seven stages and persists stage artifacts', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-1', 'OA', {
    abstractText: 'Trusted abstract for pipeline execution.',
    keyContentDigest: 'Trusted key content digest for pipeline execution.',
    fulltextText: '# Abstract\n\nTrusted abstract for pipeline execution.\n\n# Method\n\nFulltext evidence for pipeline execution.',
  });

  try {
    const run = await service.triggerContentProcessingRun('LIT-FLOW-1', [...PIPELINE_STAGE_CODES]);

    const terminal = await waitForTerminalRun(repository, run.run_id);
    assert.equal(terminal.status, 'SUCCESS');
  } finally {
    restoreFetch();
  }

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-1');
  const statusMap = new Map(stageStates.map((item) => [item.stageCode, item.status]));
  for (const stageCode of PIPELINE_STAGE_CODES) {
    assert.equal(statusMap.get(stageCode), 'SUCCEEDED');
  }

  const artifacts = await repository.listPipelineArtifactsByLiteratureId('LIT-FLOW-1');
  const artifactTypes = artifacts.map((item) => item.artifactType).sort();
  assert.deepEqual(artifactTypes, ['CHUNKS', 'EMBEDDINGS', 'KEY_CONTENT_DOSSIER', 'LOCAL_INDEX', 'PREPROCESSED_TEXT']);

  const versions = await repository.listEmbeddingVersionsByLiteratureIds(['LIT-FLOW-1']);
  assert.equal(versions.length, 1);
  assert.equal(versions[0]?.versionNo, 1);
  assert.equal(versions[0]?.status, 'INDEXED');

  const literature = await repository.findLiteratureById('LIT-FLOW-1');
  assert.ok(literature);
  assert.equal(literature.activeEmbeddingVersionId, versions[0]?.id ?? null);

  const activeChunkRows = await repository.listEmbeddingChunksByEmbeddingVersionId(versions[0]!.id);
  assert.equal(activeChunkRows.length > 0, true);
  assert.equal(activeChunkRows.some((row) => row.chunkType === 'evidence'), true);
  const activeTokenRows = await repository.listEmbeddingTokenIndexesByEmbeddingVersionId(versions[0]!.id);
  assert.equal(activeTokenRows.length > 0, true);
});

test('literature flow blocks deep stages for RESTRICTED rights class', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-RESTRICTED', 'RESTRICTED', {
    abstractText: 'Trusted abstract for restricted rights gate.',
    keyContentDigest: 'Trusted key content digest for restricted rights gate.',
  });

  const run = await service.triggerContentProcessingRun('LIT-FLOW-RESTRICTED', [...PIPELINE_STAGE_CODES]);

  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'RIGHTS_RESTRICTED');

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-RESTRICTED');
  const fulltext = stageStates.find((item) => item.stageCode === 'FULLTEXT_PREPROCESSED');
  assert.equal(fulltext?.status, 'BLOCKED');
});

test('literature flow blocks ABSTRACT_READY when no trusted abstract source exists', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-NO-ABSTRACT', 'OA');

  const run = await service.triggerContentProcessingRun('LIT-FLOW-NO-ABSTRACT', ['ABSTRACT_READY']);
  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'FAILED');
  assert.equal(terminal.errorCode, 'ABSTRACT_SOURCE_MISSING');

  const literature = await repository.findLiteratureById('LIT-FLOW-NO-ABSTRACT');
  assert.equal(literature?.abstractText, null);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-NO-ABSTRACT');
  const abstractStage = stageStates.find((item) => item.stageCode === 'ABSTRACT_READY');
  assert.equal(abstractStage?.status, 'BLOCKED');
  assert.equal(abstractStage?.detail.abstract_ready, false);
  assert.deepEqual(abstractStage?.detail.reason_codes, ['MISSING_TRUSTED_ABSTRACT']);
});

test('literature flow blocks KEY_CONTENT_READY when extraction provider is not configured', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-NO-KEY', 'OA', {
    abstractText: 'Trusted abstract for key-content prerequisite.',
    fulltextText: 'Fulltext evidence for missing key-content gate.',
  });

  const run = await service.triggerContentProcessingRun('LIT-FLOW-NO-KEY', [
    'ABSTRACT_READY',
    'FULLTEXT_PREPROCESSED',
    'KEY_CONTENT_READY',
  ]);
  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'KEY_CONTENT_PROVIDER_MISSING');

  const literature = await repository.findLiteratureById('LIT-FLOW-NO-KEY');
  assert.equal(literature?.keyContentDigest, null);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-NO-KEY');
  const keyStage = stageStates.find((item) => item.stageCode === 'KEY_CONTENT_READY');
  assert.equal(keyStage?.status, 'BLOCKED');
});

test('literature flow exports and imports curated key-content dossier without extraction provider', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  await seedLiterature(repository, 'LIT-FLOW-CURATED', 'OA', {
    abstractText: 'Trusted abstract for curated key-content import.',
    fulltextText: '# Method\n\nCurated paragraph evidence for key-content import.',
  });
  const prepRun = await service.triggerContentProcessingRun('LIT-FLOW-CURATED', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
  assert.equal((await waitForTerminalRun(repository, prepRun.run_id)).status, 'SUCCESS');

  const bundle = await service.getKeyContentCurationBundle('LIT-FLOW-CURATED');
  assert.equal(bundle.literature_id, 'LIT-FLOW-CURATED');
  assert.equal(bundle.paragraphs.length, 1);
  assert.equal(bundle.export_policy.accepted_curation_sources.includes('codex_curated'), true);

  const imported = await service.importKeyContentDossier('LIT-FLOW-CURATED', {
    curation_source: 'codex_curated',
    curator: 'codex',
    dossier: buildCuratedDossierPayload(bundle.paragraphs[0]!.paragraph_id, bundle.document.normalized_text_checksum),
  });

  assert.equal(imported.readiness_status, 'READY');
  assert.equal(imported.source, 'codex_curated');
  assert.equal(imported.state.key_content_ready, true);
  assert.equal(imported.diagnostics.some((item) => item.code === 'KEY_CONTENT_CURATED_IMPORT'), true);
  const keyStage = (await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-CURATED'))
    .find((item) => item.stageCode === 'KEY_CONTENT_READY');
  assert.equal(keyStage?.status, 'SUCCEEDED');
  assert.equal(keyStage?.detail.source, 'codex_curated');
  const artifact = await repository.findPipelineArtifact('LIT-FLOW-CURATED', 'KEY_CONTENT_READY', 'KEY_CONTENT_DOSSIER');
  assert.equal(artifact?.payload.input_refs && typeof artifact.payload.input_refs === 'object', true);
});

test('literature flow honors preferred curated KEY_CONTENT_READY method during stage execution', async () => {
  const repository = new InMemoryLiteratureRepository();
  const settingsService = {
    ...createMockSettingsService(),
    resolvePreferredKeyContentMethod: async () => 'codex_curated' as const,
  } as LiteratureContentProcessingSettingsService;
  const service = new LiteratureFlowService(repository, settingsService);
  await seedLiterature(repository, 'LIT-FLOW-CURATED-METHOD', 'OA', {
    abstractText: 'Trusted abstract for preferred curated method.',
    fulltextText: '# Method\n\nCurated method paragraph for preferred KEY_CONTENT_READY execution.',
  });

  const blockedRun = await service.triggerContentProcessingRun('LIT-FLOW-CURATED-METHOD', [
    'ABSTRACT_READY',
    'FULLTEXT_PREPROCESSED',
    'KEY_CONTENT_READY',
  ]);
  const blockedTerminal = await waitForTerminalRun(repository, blockedRun.run_id);
  assert.equal(blockedTerminal.status, 'PARTIAL');
  assert.equal(blockedTerminal.errorCode, 'KEY_CONTENT_CURATION_REQUIRED');

  const bundle = await service.getKeyContentCurationBundle('LIT-FLOW-CURATED-METHOD');
  await service.importKeyContentDossier('LIT-FLOW-CURATED-METHOD', {
    curation_source: 'codex_curated',
    curator: 'codex',
    dossier: buildCuratedDossierPayload(bundle.paragraphs[0]!.paragraph_id, bundle.document.normalized_text_checksum),
  });

  const restoreFetch = mockOpenAIContentProcessing();
  try {
    const run = await service.triggerContentProcessingRun('LIT-FLOW-CURATED-METHOD', [
      'KEY_CONTENT_READY',
      'CHUNKED',
      'EMBEDDED',
      'INDEXED',
    ]);
    const terminal = await waitForTerminalRun(repository, run.run_id);
    assert.equal(terminal.status, 'SUCCESS');
  } finally {
    restoreFetch();
  }

  const keyStage = (await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-CURATED-METHOD'))
    .find((item) => item.stageCode === 'KEY_CONTENT_READY');
  assert.equal(keyStage?.status, 'SUCCEEDED');
  assert.equal(keyStage?.detail.source, 'codex_curated');
  assert.equal(keyStage?.detail.preferred_key_content_method, 'codex_curated');
});

test('literature flow rejects curated key-content dossier with unresolved source refs', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  await seedLiterature(repository, 'LIT-FLOW-CURATED-BAD-REF', 'OA', {
    abstractText: 'Trusted abstract for curated key-content validation.',
    fulltextText: '# Method\n\nCurated paragraph evidence for validation.',
  });
  const prepRun = await service.triggerContentProcessingRun('LIT-FLOW-CURATED-BAD-REF', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
  assert.equal((await waitForTerminalRun(repository, prepRun.run_id)).status, 'SUCCESS');
  const bundle = await service.getKeyContentCurationBundle('LIT-FLOW-CURATED-BAD-REF');
  const dossier = buildCuratedDossierPayload('missing-paragraph', bundle.document.normalized_text_checksum);

  await assert.rejects(
    service.importKeyContentDossier('LIT-FLOW-CURATED-BAD-REF', {
      curation_source: 'codex_curated',
      dossier,
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD'
      && Array.isArray(error.details?.issues),
  );
});

test('literature flow repairs common curated source-ref variants before import', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  await seedLiterature(repository, 'LIT-FLOW-CURATED-REF-REPAIR', 'OA', {
    abstractText: 'Trusted abstract for curated source-ref repair.',
    fulltextText: '# Method\n\nCurated paragraph evidence for source-ref repair.',
  });
  const prepRun = await service.triggerContentProcessingRun('LIT-FLOW-CURATED-REF-REPAIR', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
  assert.equal((await waitForTerminalRun(repository, prepRun.run_id)).status, 'SUCCESS');
  const bundle = await service.getKeyContentCurationBundle('LIT-FLOW-CURATED-REF-REPAIR');
  const paragraphId = bundle.paragraphs[0]!.paragraph_id;
  const dossier = buildCuratedDossierPayload(paragraphId, bundle.document.normalized_text_checksum);
  for (const rows of Object.values(dossier.categories)) {
    for (const row of rows) {
      row.source_refs = [{
        ref_type: 'manual',
        ref_id: `paragraph:${paragraphId}:Curated paragraph evidence`,
      }] as unknown as typeof row.source_refs;
    }
  }

  const imported = await service.importKeyContentDossier('LIT-FLOW-CURATED-REF-REPAIR', {
    curation_source: 'codex_curated',
    dossier,
  });

  assert.equal(imported.readiness_status, 'READY');
  assert.equal(imported.diagnostics.some((item) => item.code === 'KEY_CONTENT_SOURCE_REF_REPAIRED'), true);
  const artifact = await repository.findPipelineArtifact(
    'LIT-FLOW-CURATED-REF-REPAIR',
    'KEY_CONTENT_READY',
    'KEY_CONTENT_DOSSIER',
  );
  const payload = artifact?.payload as ReturnType<typeof buildCuratedDossierPayload> | undefined;
  assert.equal(payload?.categories.research_problem[0]?.source_refs[0]?.ref_type, 'paragraph');
  assert.equal(payload?.categories.research_problem[0]?.source_refs[0]?.ref_id, paragraphId);
});

test('literature flow reports item provenance separately from dossier curation source', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  await seedLiterature(repository, 'LIT-FLOW-CURATED-BAD-PROVENANCE', 'OA', {
    abstractText: 'Trusted abstract for curated provenance validation.',
    fulltextText: '# Method\n\nCurated paragraph evidence for provenance validation.',
  });
  const prepRun = await service.triggerContentProcessingRun('LIT-FLOW-CURATED-BAD-PROVENANCE', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
  assert.equal((await waitForTerminalRun(repository, prepRun.run_id)).status, 'SUCCESS');
  const bundle = await service.getKeyContentCurationBundle('LIT-FLOW-CURATED-BAD-PROVENANCE');
  const dossier = buildCuratedDossierPayload(bundle.paragraphs[0]!.paragraph_id, bundle.document.normalized_text_checksum);
  dossier.categories.research_problem[0]!.provenance = 'human_curated' as 'model_generated';

  await assert.rejects(
    service.importKeyContentDossier('LIT-FLOW-CURATED-BAD-PROVENANCE', {
      curation_source: 'manual_curated',
      dossier,
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD'
      && Array.isArray(error.details?.issues)
      && error.details.issues.some((issue) =>
        String(issue).includes('item-level "model_generated" or "user_edited"')),
  );
});

test('literature flow blocks PDF preprocessing when GROBID is unavailable', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService({
    grobidEndpointUrl: 'http://grobid.test',
  }));
  const restoreFetch = mockGrobidFulltext({ status: 503, throwError: true });
  await seedLiterature(repository, 'LIT-FLOW-PDF-UNAVAILABLE', 'OA', {
    abstractText: 'Trusted abstract for unavailable PDF parser.',
    fulltextText: '%PDF-1.4 unavailable parser fixture',
    fulltextExtension: '.pdf',
  });

  try {
    const run = await service.triggerContentProcessingRun('LIT-FLOW-PDF-UNAVAILABLE', [
      'ABSTRACT_READY',
      'FULLTEXT_PREPROCESSED',
    ]);
    const terminal = await waitForTerminalRun(repository, run.run_id);
    assert.equal(terminal.status, 'PARTIAL');
    assert.equal(terminal.errorCode, 'FULLTEXT_PARSER_UNAVAILABLE');
  } finally {
    restoreFetch();
  }

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-PDF-UNAVAILABLE');
  const fulltext = stageStates.find((item) => item.stageCode === 'FULLTEXT_PREPROCESSED');
  assert.equal(fulltext?.status, 'BLOCKED');
  assert.equal(fulltext?.detail.reason_code, 'FULLTEXT_PARSER_UNAVAILABLE');
  assert.equal(Array.isArray(fulltext?.detail.diagnostics), true);

  const assets = await repository.listContentAssetsByLiteratureId('LIT-FLOW-PDF-UNAVAILABLE');
  assert.equal(assets[0]?.status, 'registered');
});

test('literature flow preprocesses PDF through GROBID and writes file-backed artifacts', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService({
    grobidEndpointUrl: 'http://grobid.test',
  }));
  const restoreFetch = mockGrobidFulltext({ status: 200, body: buildGrobidTeiFixture() });
  await seedLiterature(repository, 'LIT-FLOW-PDF-GROBID', 'OA', {
    abstractText: 'Trusted abstract for GROBID PDF parser.',
    fulltextText: '%PDF-1.4 grobid parser fixture',
    fulltextExtension: '.pdf',
  });

  try {
    const run = await service.triggerContentProcessingRun('LIT-FLOW-PDF-GROBID', [
      'ABSTRACT_READY',
      'FULLTEXT_PREPROCESSED',
    ]);
    const terminal = await waitForTerminalRun(repository, run.run_id);
    assert.equal(terminal.status, 'SUCCESS');
  } finally {
    restoreFetch();
  }

  const documents = await repository.listFulltextDocumentsByLiteratureId('LIT-FLOW-PDF-GROBID');
  const document = documents[0];
  assert.ok(document);
  assert.equal(document.normalizedText, null);
  assert.ok(document.normalizedTextPath);
  assert.ok(document.parserArtifactPath);
  assert.equal(document.parserArtifactMimeType, 'application/xml');
  assert.match(await fs.readFile(document.normalizedTextPath, 'utf8'), /PDF method preserves/);
  assert.match(await fs.readFile(document.parserArtifactPath, 'utf8'), /<TEI/);

  const sections = await repository.listFulltextSectionsByDocumentId(document.id);
  const paragraphs = await repository.listFulltextParagraphsByDocumentId(document.id);
  const anchors = await repository.listFulltextAnchorsByDocumentId(document.id);
  assert.equal(sections.length, 1);
  assert.equal(paragraphs.length, 1);
  assert.equal(anchors.some((anchor) => anchor.anchorType === 'figure' && anchor.bbox !== null), true);

  const artifact = await repository.findPipelineArtifact(
    'LIT-FLOW-PDF-GROBID',
    'FULLTEXT_PREPROCESSED',
    'PREPROCESSED_TEXT',
  );
  assert.ok(artifact?.payloadPath);
  assert.match(await fs.readFile(artifact.payloadPath, 'utf8'), /normalized_text_ref/);
});

test('literature flow marks scanned PDFs as OCR required', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService({
    grobidEndpointUrl: 'http://grobid.test',
  }));
  const restoreFetch = mockGrobidFulltext({ status: 204 });
  await seedLiterature(repository, 'LIT-FLOW-PDF-OCR', 'OA', {
    abstractText: 'Trusted abstract for scanned PDF parser.',
    fulltextText: '%PDF-1.4 scanned parser fixture',
    fulltextExtension: '.pdf',
  });

  try {
    const run = await service.triggerContentProcessingRun('LIT-FLOW-PDF-OCR', [
      'ABSTRACT_READY',
      'FULLTEXT_PREPROCESSED',
    ]);
    const terminal = await waitForTerminalRun(repository, run.run_id);
    assert.equal(terminal.status, 'PARTIAL');
    assert.equal(terminal.errorCode, 'FULLTEXT_OCR_REQUIRED');
  } finally {
    restoreFetch();
  }

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-PDF-OCR');
  const fulltext = stageStates.find((item) => item.stageCode === 'FULLTEXT_PREPROCESSED');
  assert.equal(fulltext?.status, 'BLOCKED');
  assert.equal(fulltext?.detail.reason_code, 'FULLTEXT_OCR_REQUIRED');
});

test('literature flow blocks FULLTEXT_PREPROCESSED when no raw asset is registered', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-NO-ASSET', 'OA', {
    abstractText: 'Trusted abstract for missing asset gate.',
  });

  const run = await service.triggerContentProcessingRun('LIT-FLOW-NO-ASSET', [
    'ABSTRACT_READY',
    'FULLTEXT_PREPROCESSED',
  ]);
  const terminal = await waitForTerminalRun(repository, run.run_id);
  assert.equal(terminal.status, 'PARTIAL');
  assert.equal(terminal.errorCode, 'FULLTEXT_SOURCE_MISSING');

  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-NO-ASSET');
  const fulltext = stageStates.find((item) => item.stageCode === 'FULLTEXT_PREPROCESSED');
  assert.equal(fulltext?.status, 'BLOCKED');
  assert.equal(fulltext?.detail.reason_code, 'FULLTEXT_SOURCE_MISSING');
});

test('literature flow treats STALE as artifact-present and exposes rerun actions', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-STALE', 'OA');
  const now = new Date().toISOString();
  await repository.upsertPipelineState({
    id: 'state-stale',
    literatureId: 'LIT-FLOW-STALE',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'stage-fulltext-stale',
    literatureId: 'LIT-FLOW-STALE',
    stageCode: 'FULLTEXT_PREPROCESSED',
    status: 'STALE',
    lastRunId: null,
    detail: { reason_code: 'INPUT_STALE' },
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'stage-embedded-stale',
    literatureId: 'LIT-FLOW-STALE',
    stageCode: 'EMBEDDED',
    status: 'SUCCEEDED',
    lastRunId: null,
    detail: {},
    updatedAt: now,
  });
  await repository.upsertPipelineStageState({
    id: 'stage-indexed-stale',
    literatureId: 'LIT-FLOW-STALE',
    stageCode: 'INDEXED',
    status: 'STALE',
    lastRunId: null,
    detail: { reason_code: 'UPSTREAM_STALE' },
    updatedAt: now,
  });

  const state = await repository.findPipelineStateByLiteratureId('LIT-FLOW-STALE');
  assert.ok(state);
  const stageStates = await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-STALE');
  const dto = service.buildPipelineStateDTO(state, stageStates);
  const statusMap = service.buildStageStatusMap(stageStates);
  const actions = service.buildOverviewPipelineActions({
    topicScopeStatus: 'in_scope',
    rightsClass: 'OA',
    pipelineState: dto,
    stageStatusMap: statusMap,
  });

  assert.equal(dto.fulltext_preprocessed, true);
  assert.equal(dto.indexed, true);
  assert.equal(actions.process_content.enabled, true);
  assert.equal(actions.rebuild_index.enabled, true);
  assert.deepEqual(actions.retry_failed.requested_stages, ['FULLTEXT_PREPROCESSED', 'INDEXED']);
  assert.equal(actions.view_reason.enabled, true);
});

test('literature flow rerun overwrites existing stage artifact instead of duplicating it', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-RERUN', 'OA', {
    abstractText: 'Trusted abstract for rerun artifact overwrite validation.',
    fulltextText: 'Initial fulltext for rerun artifact overwrite validation.',
  });

  const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-RERUN', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
  const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
  assert.equal(firstTerminal.status, 'SUCCESS');

  const firstArtifact = await repository.findPipelineArtifact(
    'LIT-FLOW-RERUN',
    'FULLTEXT_PREPROCESSED',
    'PREPROCESSED_TEXT',
  );
  assert.ok(firstArtifact);

  const literature = await repository.findLiteratureById('LIT-FLOW-RERUN');
  assert.ok(literature);
  const assets = await repository.listContentAssetsByLiteratureId('LIT-FLOW-RERUN');
  const asset = assets[0];
  assert.ok(asset);
  const updatedFulltext = 'Updated fulltext for rerun artifact overwrite validation.';
  await fs.writeFile(asset.localPath, updatedFulltext, 'utf8');
  await repository.upsertContentAsset({
    ...asset,
    checksum: crypto.createHash('sha256').update(updatedFulltext).digest('hex'),
    byteSize: Buffer.byteLength(updatedFulltext),
    updatedAt: new Date().toISOString(),
  });

  const secondRun = await service.triggerContentProcessingRun('LIT-FLOW-RERUN', ['FULLTEXT_PREPROCESSED']);
  const secondTerminal = await waitForTerminalRun(repository, secondRun.run_id);
  assert.equal(secondTerminal.status, 'SUCCESS');

  const secondArtifact = await repository.findPipelineArtifact(
    'LIT-FLOW-RERUN',
    'FULLTEXT_PREPROCESSED',
    'PREPROCESSED_TEXT',
  );
  assert.ok(secondArtifact);
  assert.equal(secondArtifact.id, firstArtifact.id);
  assert.notEqual(secondArtifact.checksum, firstArtifact.checksum);

  const artifacts = await repository.listPipelineArtifactsByLiteratureId('LIT-FLOW-RERUN');
  const preprocessedArtifacts = artifacts.filter(
    (item) => item.stageCode === 'FULLTEXT_PREPROCESSED' && item.artifactType === 'PREPROCESSED_TEXT',
  );
  assert.equal(preprocessedArtifacts.length, 1);
});

test('literature flow enforces USER_AUTH gate by global env switch', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository);
  await seedLiterature(repository, 'LIT-FLOW-USER-AUTH', 'USER_AUTH', {
    abstractText: 'Trusted abstract for user-auth rights gate.',
    fulltextText: 'Fulltext evidence for user-auth rights gate.',
  });

  const previous = process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED;
  process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED = 'false';

  try {
    const blockedRun = await service.triggerContentProcessingRun('LIT-FLOW-USER-AUTH', ['FULLTEXT_PREPROCESSED']);
    const blockedTerminal = await waitForTerminalRun(repository, blockedRun.run_id);
    assert.equal(blockedTerminal.status, 'FAILED');
    assert.equal(blockedTerminal.errorCode, 'USER_AUTH_DISABLED');

    process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED = 'true';
    const allowedRun = await service.triggerContentProcessingRun('LIT-FLOW-USER-AUTH', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
    const allowedTerminal = await waitForTerminalRun(repository, allowedRun.run_id);
    assert.equal(allowedTerminal.status, 'SUCCESS');
  } finally {
    if (previous === undefined) {
      delete process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED;
    } else {
      process.env.LITERATURE_USER_AUTH_CONTENT_PROCESSING_ENABLED = previous;
    }
  }
});

test('literature flow reuses current embedding artifacts and version when CHUNKED input is unchanged', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-VERSIONING', 'OA', {
    abstractText: 'Trusted abstract for embedding versioning.',
    keyContentDigest: 'Trusted key content digest for embedding versioning.',
    fulltextText: 'Fulltext evidence for embedding versioning.',
  });

  try {
    const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-VERSIONING', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
    assert.equal(firstTerminal.status, 'SUCCESS');

    const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-VERSIONING');
    assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
    const activeAfterFirst = literatureAfterFirst.activeEmbeddingVersionId!;

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith('/v1/embeddings')) {
        throw new Error('embedding provider should not be called for unchanged chunks');
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    const secondRun = await service.triggerContentProcessingRun('LIT-FLOW-VERSIONING', ['EMBEDDED', 'INDEXED']);
    const secondTerminal = await waitForTerminalRun(repository, secondRun.run_id);
    assert.equal(secondTerminal.status, 'SUCCESS');

    const versions = await repository.listEmbeddingVersionsByLiteratureIds(['LIT-FLOW-VERSIONING']);
    assert.equal(versions.length, 1);
    assert.equal(versions.every((version) => version.status === 'INDEXED'), true);

    const literatureAfterSecond = await repository.findLiteratureById('LIT-FLOW-VERSIONING');
    assert.ok(literatureAfterSecond?.activeEmbeddingVersionId);
    assert.equal(literatureAfterSecond?.activeEmbeddingVersionId, activeAfterFirst);

    const steps = await repository.listPipelineRunStepsByRunId(secondRun.run_id);
    const embeddedStep = steps.find((step) => step.stageCode === 'EMBEDDED');
    assert.equal(embeddedStep?.outputRef.reused_existing, true);
  } finally {
    restoreFetch();
  }
});

test('literature flow creates a new embedding version when fulltext chunks change', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-VERSIONING-CHANGED', 'OA', {
    abstractText: 'Trusted abstract for changed embedding version.',
    keyContentDigest: 'Trusted key content digest for changed embedding version.',
    fulltextText: 'Initial fulltext evidence for changed embedding version.',
  });

  try {
    const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-VERSIONING-CHANGED', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
    assert.equal(firstTerminal.status, 'SUCCESS');

    const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-VERSIONING-CHANGED');
    assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
    const activeAfterFirst = literatureAfterFirst.activeEmbeddingVersionId!;

    await new Promise((resolve) => setTimeout(resolve, 5));
    await seedRawFulltextAsset(
      repository,
      'LIT-FLOW-VERSIONING-CHANGED',
      'Changed fulltext evidence that should produce a new chunk artifact.',
    );

    const secondRun = await service.triggerContentProcessingRun('LIT-FLOW-VERSIONING-CHANGED', ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const secondTerminal = await waitForTerminalRun(repository, secondRun.run_id);
    assert.equal(secondTerminal.status, 'SUCCESS');

    const versions = await repository.listEmbeddingVersionsByLiteratureIds(['LIT-FLOW-VERSIONING-CHANGED']);
    assert.equal(versions.length, 2);
    assert.equal(versions[1]?.versionNo, 2);
    const literatureAfterSecond = await repository.findLiteratureById('LIT-FLOW-VERSIONING-CHANGED');
    assert.notEqual(literatureAfterSecond?.activeEmbeddingVersionId, activeAfterFirst);
  } finally {
    restoreFetch();
  }
});

test('literature flow materializes native retrieval vectors before embedding activation', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-NATIVE-VECTOR', 'OA', {
    abstractText: 'Trusted abstract for native vector materialization.',
    keyContentDigest: 'Trusted key content digest for native vector materialization.',
    fulltextText: 'Fulltext evidence for native vector materialization.',
  });

  try {
    const run = await service.triggerContentProcessingRun('LIT-FLOW-NATIVE-VECTOR', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const terminal = await waitForTerminalRun(repository, run.run_id);
    assert.equal(terminal.status, 'SUCCESS');

    const literature = await repository.findLiteratureById('LIT-FLOW-NATIVE-VECTOR');
    assert.ok(literature?.activeEmbeddingVersionId);
    const coverage = await repository.summarizeEmbeddingRetrievalVectorCoverage({
      embeddingVersionIds: [literature.activeEmbeddingVersionId],
    });
    assert.equal(coverage.chunkCount > 0, true);
    assert.equal(coverage.nativeVectorCount, coverage.chunkCount);
    assert.equal(coverage.missingNativeVectorCount, 0);
  } finally {
    restoreFetch();
  }
});

test('literature flow rebuilds a stale index on the active indexed version without creating a legacy ready path', async () => {
  const repository = new InMemoryLiteratureRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-REBUILD-INDEX', 'OA', {
    abstractText: 'Trusted abstract for index rebuild.',
    keyContentDigest: 'Trusted key content digest for index rebuild.',
    fulltextText: 'Fulltext evidence for index rebuild.',
  });

  try {
    const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-REBUILD-INDEX', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
    assert.equal(firstTerminal.status, 'SUCCESS');

    const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-REBUILD-INDEX');
    assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
    const activeVersionId = literatureAfterFirst.activeEmbeddingVersionId;
    const tokenRowsBefore = await repository.listEmbeddingTokenIndexesByEmbeddingVersionId(activeVersionId);
    assert.equal(tokenRowsBefore.length > 0, true);

    const indexedStage = (await repository.listPipelineStageStatesByLiteratureId('LIT-FLOW-REBUILD-INDEX'))
      .find((stage) => stage.stageCode === 'INDEXED');
    assert.ok(indexedStage);
    await repository.upsertPipelineStageState({
      ...indexedStage,
      status: 'STALE',
      detail: {
        ...indexedStage.detail,
        reason_code: 'INDEX_PROFILE_CHANGED',
        reason_message: 'Index profile changed.',
      },
      updatedAt: new Date().toISOString(),
    });

    const rebuildRun = await service.triggerContentProcessingRun('LIT-FLOW-REBUILD-INDEX', ['INDEXED']);
    const rebuildTerminal = await waitForTerminalRun(repository, rebuildRun.run_id);
    assert.equal(rebuildTerminal.status, 'SUCCESS');

    const literatureAfterRebuild = await repository.findLiteratureById('LIT-FLOW-REBUILD-INDEX');
    assert.equal(literatureAfterRebuild?.activeEmbeddingVersionId, activeVersionId);
    const versions = await repository.listEmbeddingVersionsByLiteratureIds(['LIT-FLOW-REBUILD-INDEX']);
    assert.equal(versions.length, 1);
    assert.equal(versions[0]?.status, 'INDEXED');
    const tokenRowsAfter = await repository.listEmbeddingTokenIndexesByEmbeddingVersionId(activeVersionId);
    assert.equal(tokenRowsAfter.length, tokenRowsBefore.length);
  } finally {
    restoreFetch();
  }
});

test('literature flow blocks embedding activation when native vector coverage is incomplete', async () => {
  class IncompleteNativeCoverageRepository extends InMemoryLiteratureRepository {
    forceMissingCoverage = false;

    override async summarizeEmbeddingRetrievalVectorCoverage(
      query: Parameters<InMemoryLiteratureRepository['summarizeEmbeddingRetrievalVectorCoverage']>[0],
    ) {
      const coverage = await super.summarizeEmbeddingRetrievalVectorCoverage(query);
      if (!this.forceMissingCoverage) {
        return coverage;
      }
      return {
        ...coverage,
        nativeVectorCount: 0,
        missingNativeVectorCount: coverage.chunkCount,
        coverageRatio: 0,
        byVersion: coverage.byVersion.map((row) => ({
          ...row,
          nativeVectorCount: 0,
          missingNativeVectorCount: row.chunkCount,
        })),
      };
    }
  }

  const repository = new IncompleteNativeCoverageRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-NATIVE-GUARD', 'OA', {
    abstractText: 'Trusted abstract for native vector activation guard.',
    keyContentDigest: 'Trusted key content digest for native vector activation guard.',
    fulltextText: 'Initial fulltext evidence for native vector activation guard.',
  });

  try {
    const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-NATIVE-GUARD', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
    assert.equal(firstTerminal.status, 'SUCCESS');

    const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-NATIVE-GUARD');
    assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
    const activeVersionBeforeFailure = literatureAfterFirst.activeEmbeddingVersionId;

    await new Promise((resolve) => setTimeout(resolve, 5));
    await seedRawFulltextAsset(
      repository,
      'LIT-FLOW-NATIVE-GUARD',
      'Changed fulltext evidence that should be blocked before active pointer update.',
    );

    repository.forceMissingCoverage = true;
    const failedRun = await service.triggerContentProcessingRun('LIT-FLOW-NATIVE-GUARD', ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const failedTerminal = await waitForTerminalRun(repository, failedRun.run_id);
    assert.equal(failedTerminal.status, 'PARTIAL');

    const literatureAfterFailure = await repository.findLiteratureById('LIT-FLOW-NATIVE-GUARD');
    assert.equal(literatureAfterFailure?.activeEmbeddingVersionId, activeVersionBeforeFailure);
  } finally {
    restoreFetch();
  }
});

test('literature flow keeps active embedding version unchanged when INDEXED stage fails', async () => {
  class FailingTokenIndexRepository extends InMemoryLiteratureRepository {
    failTokenWrite = false;

    override async replaceEmbeddingTokenIndexes(
      embeddingVersionId: string,
      records: Parameters<InMemoryLiteratureRepository['replaceEmbeddingTokenIndexes']>[1],
    ) {
      if (this.failTokenWrite) {
        throw new Error('token-index write failed');
      }
      return super.replaceEmbeddingTokenIndexes(embeddingVersionId, records);
    }
  }

  const repository = new FailingTokenIndexRepository();
  const service = new LiteratureFlowService(repository, createMockSettingsService());
  const restoreFetch = mockOpenAIContentProcessing();
  await seedLiterature(repository, 'LIT-FLOW-ACTIVE-GUARD', 'OA', {
    abstractText: 'Trusted abstract for active version guard.',
    keyContentDigest: 'Trusted key content digest for active version guard.',
    fulltextText: 'Fulltext evidence for active version guard.',
  });

  try {
    const firstRun = await service.triggerContentProcessingRun('LIT-FLOW-ACTIVE-GUARD', ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const firstTerminal = await waitForTerminalRun(repository, firstRun.run_id);
    assert.equal(firstTerminal.status, 'SUCCESS');

    const literatureAfterFirst = await repository.findLiteratureById('LIT-FLOW-ACTIVE-GUARD');
    assert.ok(literatureAfterFirst?.activeEmbeddingVersionId);
    const activeVersionBeforeFailure = literatureAfterFirst.activeEmbeddingVersionId;

    repository.failTokenWrite = true;
    const failedRun = await service.triggerContentProcessingRun('LIT-FLOW-ACTIVE-GUARD', ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    const failedTerminal = await waitForTerminalRun(repository, failedRun.run_id);
    assert.equal(failedTerminal.status, 'PARTIAL');

    const literatureAfterFailure = await repository.findLiteratureById('LIT-FLOW-ACTIVE-GUARD');
    assert.equal(literatureAfterFailure?.activeEmbeddingVersionId, activeVersionBeforeFailure);
  } finally {
    restoreFetch();
  }
});
