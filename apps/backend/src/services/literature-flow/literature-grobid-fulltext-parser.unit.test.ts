import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import type { LiteratureContentAssetRecord } from '../../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';
import { LiteratureGrobidFulltextParser } from './literature-grobid-fulltext-parser.js';

const tempDirs = new Set<string>();

after(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

test('GROBID TEI parser extracts sections, paragraphs, and layout anchors', () => {
  const parser = new LiteratureGrobidFulltextParser();
  const result = parser.parseTei([
    '<TEI xmlns="http://www.tei-c.org/ns/1.0">',
    '<text><body>',
    '<div xml:id="section-0001" coords="1,10,20,500,40">',
    '<head>Method</head>',
    '<p xml:id="para-0001" coords="1,10,70,500,80">The method paragraph describes the model.</p>',
    '<formula xml:id="formula-0001" coords="1,15,160,200,40">y = f(x)</formula>',
    '<figure xml:id="figure-0001" coords="2,20,30,240,120"><label>Figure 1</label><figDesc>Architecture overview.</figDesc></figure>',
    '</div>',
    '</body></text>',
    '</TEI>',
  ].join(''));

  assert.match(result.normalizedText, /# Method/);
  assert.equal(result.sections[0]?.sectionId, 'section-0001');
  assert.equal(result.paragraphs[0]?.paragraphId, 'para-0001');
  assert.equal(result.paragraphs[0]?.pageNumber, 1);
  const figure = result.anchors.find((anchor) => anchor.anchorType === 'figure');
  assert.equal(figure?.anchorId, 'figure-0001');
  assert.equal(figure?.pageNumber, 2);
  assert.deepEqual(figure?.bbox, {
    raw: '2,20,30,240,120',
    boxes: [{ page: 2, x: 20, y: 30, width: 240, height: 120 }],
  });
  assert.equal(result.anchors.some((anchor) => anchor.anchorType === 'formula'), true);
});

test('GROBID parser emits parser quality diagnostics on successful parses', async () => {
  const previousFetch = globalThis.fetch;
  const teiXml = [
    '<TEI xmlns="http://www.tei-c.org/ns/1.0">',
    '<text><body>',
    '<div xml:id="section-0001" coords="1,10,20,500,40">',
    '<head>Method</head>',
    '<p xml:id="para-0001" coords="1,10,70,500,80">Short extracted paragraph.</p>',
    '<figure xml:id="figure-0001" coords="1,20,30,240,120"><label>Figure 1</label></figure>',
    '</div>',
    '</body></text>',
    '</TEI>',
  ].join('');
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    assert.equal(String(input), 'http://grobid.test/api/processFulltextDocument');
    return new Response(teiXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }) as typeof fetch;

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-grobid-parser-'));
  tempDirs.add(dir);
  const localPath = path.join(dir, 'paper.pdf');
  await fs.writeFile(localPath, '%PDF-1.4 fixture', 'utf8');
  const settingsService = {
    resolveGrobidEndpointUrl: async () => 'http://grobid.test',
  } as unknown as LiteratureContentProcessingSettingsService;
  const parser = new LiteratureGrobidFulltextParser(settingsService);

  try {
    const result = await parser.parse({
      id: 'asset-1',
      literatureId: 'lit-1',
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath,
      checksum: 'checksum',
      mimeType: 'application/pdf',
      byteSize: 16,
      rightsClass: 'OA',
      status: 'registered',
      metadata: {},
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
    } satisfies LiteratureContentAssetRecord);

    assert.equal(result.ready, true);
    if (result.ready) {
      const parsedDiagnostic = result.diagnostics.find((item) => item.code === 'GROBID_TEI_PARSED');
      assert.equal(typeof parsedDiagnostic?.parser_quality_score, 'number');
      assert.equal(parsedDiagnostic?.parser_quality_bucket, 'low');
      assert.deepEqual(parsedDiagnostic?.parser_quality_inputs, {
        text_length: 35,
        section_count: 1,
        paragraph_count: 1,
        anchor_count: 1,
        average_paragraph_length: 26,
        page_count: 1,
      });
      assert.equal(result.diagnostics.some((item) => item.code === 'FULLTEXT_PARSER_QUALITY_LOW'), true);
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

// --- T-130 W-02 (D5): production posture — breaker / probe / timeout / retry ---

import { InMemoryLiteratureRepository } from '../../repositories/in-memory-literature-repository.js';

const HARDENING_TEI = [
  '<TEI xmlns="http://www.tei-c.org/ns/1.0">',
  '<text><body>',
  '<div xml:id="section-0001"><head>Method</head>',
  '<p xml:id="para-0001">A sufficiently long extracted paragraph describing the model in detail.</p>',
  '</div>',
  '</body></text>',
  '</TEI>',
].join('');

async function makeAsset(): Promise<LiteratureContentAssetRecord> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-grobid-hardening-'));
  tempDirs.add(dir);
  const localPath = path.join(dir, 'paper.pdf');
  await fs.writeFile(localPath, '%PDF-1.4 fixture', 'utf8');
  return {
    id: 'asset-h1',
    literatureId: 'lit-h1',
    assetKind: 'raw_fulltext',
    sourceKind: 'local_path',
    localPath,
    checksum: 'checksum',
    mimeType: 'application/pdf',
    byteSize: 16,
    rightsClass: 'OA',
    status: 'registered',
    metadata: {},
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T00:00:00.000Z',
  };
}

const hardeningSettings = {
  resolveGrobidEndpointUrl: async () => 'http://grobid.test',
} as unknown as LiteratureContentProcessingSettingsService;

type FetchRoute = (input: string) => Promise<Response> | Response;

function stubFetch(routes: { isalive?: FetchRoute; process?: FetchRoute }): { calls: string[]; restore: () => void } {
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/api/isalive')) {
      return routes.isalive ? routes.isalive(url) : new Response('true', { status: 200 });
    }
    if (url.includes('/api/processFulltextDocument')) {
      if (!routes.process) {
        throw new Error('unexpected process call');
      }
      return routes.process(url);
    }
    throw new Error(`unexpected url: ${url}`);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = previousFetch;
    },
  };
}

test('GROBID parser fails fast without any request while the circuit is open', async () => {
  const repository = new InMemoryLiteratureRepository();
  const now = new Date();
  await repository.upsertSourceRuntimeState({
    id: 'grobid-state',
    source: 'grobid',
    status: 'COOLDOWN',
    cooldownUntil: new Date(now.getTime() + 10 * 60_000).toISOString(),
    failureCount: 3,
    lastErrorCode: 'GROBID_UNREACHABLE',
    lastErrorMessage: 'down',
    lastRequestAt: now.toISOString(),
    lastSuccessAt: null,
    lastFailureAt: now.toISOString(),
    metadata: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  const stub = stubFetch({});
  try {
    const parser = new LiteratureGrobidFulltextParser(hardeningSettings, repository);
    const result = await parser.parse(await makeAsset());
    assert.equal(result.ready, false);
    if (!result.ready) {
      assert.equal(result.reasonCode, 'FULLTEXT_PARSER_UNAVAILABLE');
      assert.equal(result.diagnostics[0]?.failure_class, 'circuit_open');
    }
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('GROBID parser blocks on unhealthy probe and records a breaker failure', async () => {
  const repository = new InMemoryLiteratureRepository();
  const stub = stubFetch({
    isalive: () => new Response('down', { status: 500 }),
  });
  try {
    const parser = new LiteratureGrobidFulltextParser(hardeningSettings, repository);
    const result = await parser.parse(await makeAsset());
    assert.equal(result.ready, false);
    if (!result.ready) {
      assert.equal(result.diagnostics[0]?.failure_class, 'health_probe_failed');
    }
    assert.equal(stub.calls.some((url) => url.includes('processFulltextDocument')), false);
    const state = await repository.findSourceRuntimeState('grobid');
    assert.equal(state?.status, 'COOLDOWN');
    assert.equal(state?.lastErrorCode, 'GROBID_HEALTH_PROBE_FAILED');
    assert.equal(state?.failureCount, 1);
  } finally {
    stub.restore();
  }
});

test('GROBID parser retries a connection failure once and then opens the breaker', async () => {
  const repository = new InMemoryLiteratureRepository();
  let processCalls = 0;
  const stub = stubFetch({
    process: () => {
      processCalls += 1;
      throw Object.assign(new Error('connect ECONNREFUSED'), { name: 'FetchError' });
    },
  });
  try {
    const parser = new LiteratureGrobidFulltextParser(hardeningSettings, repository);
    const result = await parser.parse(await makeAsset());
    assert.equal(result.ready, false);
    if (!result.ready) {
      assert.equal(result.reasonCode, 'FULLTEXT_PARSER_UNAVAILABLE');
      assert.equal(result.diagnostics[0]?.failure_class, 'connection');
      assert.equal(result.diagnostics[0]?.attempts, 2);
    }
    assert.equal(processCalls, 2);
    const state = await repository.findSourceRuntimeState('grobid');
    assert.equal(state?.status, 'COOLDOWN');
    assert.equal(state?.lastErrorCode, 'GROBID_UNREACHABLE');
  } finally {
    stub.restore();
  }
});

test('GROBID parser classifies timeouts and records GROBID_TIMEOUT', async () => {
  const repository = new InMemoryLiteratureRepository();
  const stub = stubFetch({
    process: () => {
      throw Object.assign(new Error('operation timed out'), { name: 'TimeoutError' });
    },
  });
  try {
    const parser = new LiteratureGrobidFulltextParser(hardeningSettings, repository);
    const result = await parser.parse(await makeAsset());
    assert.equal(result.ready, false);
    if (!result.ready) {
      assert.equal(result.diagnostics[0]?.failure_class, 'timeout');
    }
    const state = await repository.findSourceRuntimeState('grobid');
    assert.equal(state?.lastErrorCode, 'GROBID_TIMEOUT');
  } finally {
    stub.restore();
  }
});

test('GROBID parser retries a 503 once, succeeds, and resets the breaker', async () => {
  const repository = new InMemoryLiteratureRepository();
  await repository.upsertSourceRuntimeState({
    id: 'grobid-state',
    source: 'grobid',
    status: 'COOLDOWN',
    cooldownUntil: new Date(Date.now() - 60_000).toISOString(),
    failureCount: 2,
    lastErrorCode: 'GROBID_UNREACHABLE',
    lastErrorMessage: 'down earlier',
    lastRequestAt: new Date().toISOString(),
    lastSuccessAt: null,
    lastFailureAt: new Date().toISOString(),
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let processCalls = 0;
  const stub = stubFetch({
    process: () => {
      processCalls += 1;
      if (processCalls === 1) {
        return new Response('busy', { status: 503 });
      }
      return new Response(HARDENING_TEI, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    },
  });
  try {
    const parser = new LiteratureGrobidFulltextParser(hardeningSettings, repository);
    const result = await parser.parse(await makeAsset());
    assert.equal(result.ready, true);
    assert.equal(processCalls, 2);
    const state = await repository.findSourceRuntimeState('grobid');
    assert.equal(state?.status, 'READY');
    assert.equal(state?.failureCount, 0);
  } finally {
    stub.restore();
  }
});

test('GROBID parser maps 204 to OCR_REQUIRED and keeps the breaker closed', async () => {
  const repository = new InMemoryLiteratureRepository();
  const stub = stubFetch({
    process: () => new Response(null, { status: 204 }),
  });
  try {
    const parser = new LiteratureGrobidFulltextParser(hardeningSettings, repository);
    const result = await parser.parse(await makeAsset());
    assert.equal(result.ready, false);
    if (!result.ready) {
      assert.equal(result.reasonCode, 'FULLTEXT_OCR_REQUIRED');
    }
    const state = await repository.findSourceRuntimeState('grobid');
    assert.equal(state?.status, 'READY');
  } finally {
    stub.restore();
  }
});
