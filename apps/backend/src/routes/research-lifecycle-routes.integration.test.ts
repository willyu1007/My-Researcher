import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { buildApp } from '../app.js';

const tempDirs = new Set<string>();

type SourceHealthSummary = {
  source_kind: string;
  planned_count: number;
  succeeded_count: number;
  failed_count: number;
  blocked_count: number;
  retryable_failure_count: number;
  non_retryable_failure_count: number;
  error_counts_by_code: Record<string, number>;
  runtime_status: string | null;
};

after(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

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
      research_problem: [item('rp-1', 'problem', 'The paper studies workflow evidence.')],
      contributions: [item('contrib-1', 'contribution', 'The paper contributes route-level processing.')],
      method: [item('method-1', 'method', 'The method uses explicit content processing.')],
      datasets_and_benchmarks: [],
      experiments: [],
      key_findings: [item('finding-1', 'finding', 'The workflow preserves provenance.')],
      limitations: [],
      reproducibility: [],
      related_work_positioning: [],
      evidence_candidates: [item('evidence-1', 'evidence', 'Route-level fulltext evidence supports retrieval.')],
      figure_insights: [],
      table_insights: [],
      claim_evidence_map: [item('claim-map-1', 'claim_evidence', 'Claims map to paragraph evidence.')],
      automation_signals: [item('signal-1', 'automation', 'Useful for retrieval smoke tests.')],
    },
    quality_report: {
      extraction_diagnostics: [],
    },
    display_digest: 'Route-level source-grounded dossier.',
  };
}

function buildRouteCuratedDossier(paragraphId: string, documentChecksum: string) {
  const ref = { ref_type: 'paragraph', ref_id: paragraphId };
  const item = (id: string, type: string, statement: string) => ({
    id,
    type,
    statement,
    details: `${statement} details.`,
    source_refs: [ref],
    confidence: 0.92,
    evidence_strength: 'high',
    notes: null,
    provenance: 'model_generated',
  });
  return {
    schema_version: 'key_content.v1',
    extraction_profile: 'paper_semantic_dossier.v1',
    readiness_status: 'READY',
    input_refs: {
      fulltext_checksum: documentChecksum,
    },
    categories: {
      research_problem: [item('route-curated-rp-1', 'problem', 'The paper needs route-level curated key content.')],
      contributions: [item('route-curated-contrib-1', 'contribution', 'The route imports a curated dossier.')],
      method: [item('route-curated-method-1', 'method', 'The method validates source refs before import.')],
      datasets_and_benchmarks: [],
      experiments: [],
      key_findings: [item('route-curated-finding-1', 'finding', 'Curated import reaches KEY_CONTENT_READY.')],
      limitations: [],
      reproducibility: [],
      related_work_positioning: [],
      evidence_candidates: [item('route-curated-evidence-1', 'evidence', 'Paragraph evidence grounds the imported dossier.')],
      figure_insights: [],
      table_insights: [],
      claim_evidence_map: [],
      automation_signals: [],
    },
    quality_report: {
      completeness_score: 0.357,
      confidence: 0.92,
      blockers: [],
      warnings: [],
      conflicts: [],
      extraction_diagnostics: [],
    },
    display_digest: 'Route-level curated key-content dossier.',
    generated_at: '2026-05-10T00:00:00.000Z',
  };
}

function mockPublicDnsLookup(): () => void {
  const previousLookup = dns.lookup;
  (dns as unknown as { lookup: typeof dns.lookup }).lookup = (async () => [
    { address: '93.184.216.34', family: 4 },
  ]) as unknown as typeof dns.lookup;
  return () => {
    (dns as unknown as { lookup: typeof dns.lookup }).lookup = previousLookup;
  };
}

async function waitForBackfillJob(app: ReturnType<typeof buildApp>, jobId: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const res = await app.inject({
      method: 'GET',
      url: `/literature/content-processing/backfill/jobs/${encodeURIComponent(jobId)}`,
    });
    assert.equal(res.statusCode, 200);
    const job = res.json().job;
    if (job.status === 'SUCCEEDED' || job.status === 'PARTIAL' || job.status === 'FAILED' || job.status === 'CANCELED') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for backfill job ${jobId}.`);
}

async function waitForFulltextAcquisitionJob(app: ReturnType<typeof buildApp>, jobId: string) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const res = await app.inject({
      method: 'GET',
      url: `/literature/fulltext-acquisition/jobs/${encodeURIComponent(jobId)}`,
    });
    assert.equal(res.statusCode, 200);
    const job = res.json().job;
    if (job.status === 'SUCCEEDED' || job.status === 'PARTIAL' || job.status === 'FAILED' || job.status === 'CANCELED') {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for fulltext acquisition job ${jobId}.`);
}

test('GET /health returns ok', async () => {
  const app = buildApp();

  const res = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });

  await app.close();
});

test('literature content-processing settings routes redact provider API keys', async () => {
  const app = buildApp();

  const initialRes = await app.inject({
    method: 'GET',
    url: '/settings/literature-content-processing',
  });
  assert.equal(initialRes.statusCode, 200);
  const initialBody = initialRes.json();
  assert.equal(initialBody.providers[0]?.provider, 'openai');
  assert.equal(initialBody.providers[0]?.api_key_set, false);
  assert.equal(initialBody.embedding.profiles[0]?.model, 'text-embedding-3-large');
  assert.equal(initialBody.extraction.profiles[0]?.model, 'gpt-5.6-sol');
  assert.equal(initialBody.extraction.runtime.preferred_key_content_method, 'codex_curated');
  assert.equal(initialBody.fulltext_parser.grobid.endpoint_url, 'http://localhost:8070');
  assert.equal(typeof initialBody.effective_storage_roots.normalized_text, 'string');

  const patchRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-content-processing',
    payload: {
      providers: [{ provider: 'openai', api_key: 'sk-route-secret' }],
      embedding: {
        active_profile_id: 'economy',
      },
      extraction: {
        active_profile_id: 'high_accuracy',
        runtime: {
          preferred_key_content_method: 'codex_curated',
        },
      },
      storage_roots: {
        raw_files: '/tmp/literature/raw',
        normalized_text: '/tmp/literature/normalized',
        artifacts_cache: '/tmp/literature/artifacts',
        indexes: '/tmp/literature/indexes',
        exports: '/tmp/literature/exports',
      },
      fulltext_parser: {
        grobid: {
          endpoint_url: 'http://grobid.test',
        },
      },
    },
  });
  assert.equal(patchRes.statusCode, 200);
  const patchBodyText = patchRes.body;
  assert.equal(patchBodyText.includes('sk-route-secret'), false);
  const patchBody = patchRes.json();
  assert.equal(patchBody.providers[0]?.api_key_set, true);
  assert.equal(patchBody.embedding.active_profile_id, 'economy');
  assert.equal(patchBody.extraction.active_profile_id, 'high_accuracy');
  assert.equal(patchBody.extraction.runtime.preferred_key_content_method, 'codex_curated');
  assert.equal(patchBody.storage_roots.indexes, '/tmp/literature/indexes');
  assert.equal(patchBody.effective_storage_roots.indexes, '/tmp/literature/indexes');
  assert.equal(patchBody.fulltext_parser.grobid.endpoint_url, 'http://grobid.test');

  const getRes = await app.inject({
    method: 'GET',
    url: '/settings/literature-content-processing',
  });
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.includes('sk-route-secret'), false);
  assert.equal(getRes.json().providers[0]?.api_key_set, true);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    if (url.endsWith('/api/health')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/api/version')) {
      return new Response('0.8.0', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  try {
    const healthRes = await app.inject({
      method: 'GET',
      url: '/settings/literature-content-processing/fulltext-parser/health',
    });
    assert.equal(healthRes.statusCode, 200);
    assert.equal(healthRes.json().provider, 'grobid');
    assert.equal(healthRes.json().status, 'ready');
    assert.equal(healthRes.json().endpoint_url, 'http://grobid.test');
  } finally {
    globalThis.fetch = previousFetch;
  }

  await app.close();
});

test('literature acquisition settings routes persist OA and downloader settings', async () => {
  const app = buildApp();

  const initialRes = await app.inject({
    method: 'GET',
    url: '/settings/literature-acquisition',
  });
  assert.equal(initialRes.statusCode, 200);
  const initialBody = initialRes.json();
  assert.equal(initialBody.unpaywall.enabled, false);
  assert.equal(initialBody.downloader.require_pdf_signature, true);
  assert.equal(initialBody.source_throttle.arxiv.min_interval_ms, 3000);
  assert.equal(initialBody.source_throttle.zotero.concurrency, 1);
  assert.equal(initialBody.quality_scorer.provider, 'openai');

  const patchRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-acquisition',
    payload: {
      unpaywall: {
        enabled: true,
        email: 'oa@example.com',
      },
      downloader: {
        max_byte_size: 2048,
        timeout_ms: 5000,
        max_redirects: 2,
      },
      quality_scorer: {
        model: 'gpt-5.6-sol',
        prompt_version: 'auto_pull_quality.v1',
      },
    },
  });
  assert.equal(patchRes.statusCode, 200);
  const patchBody = patchRes.json();
  assert.equal(patchBody.unpaywall.enabled, true);
  assert.equal(patchBody.unpaywall.email, 'oa@example.com');
  assert.equal(patchBody.downloader.max_byte_size, 2048);
  assert.equal(patchBody.downloader.max_redirects, 2);

  await app.close();
});

test('literature content asset download route fetches URL and registers raw fulltext', async () => {
  const app = buildApp();
  const rawFilesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-route-download-'));
  tempDirs.add(rawFilesRoot);

  const settingsRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-content-processing',
    payload: {
      storage_roots: {
        raw_files: rawFilesRoot,
      },
    },
  });
  assert.equal(settingsRes.statusCode, 200);

  const importedRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [
        {
          provider: 'arxiv',
          external_id: '2502.00001',
          title: 'Route Download Asset',
          abstract: 'Route abstract.',
          authors: ['Ada Lovelace'],
          year: 2025,
          arxiv_id: '2502.00001',
          source_url: 'https://arxiv.org/abs/2502.00001',
          rights_class: 'OA',
        },
      ],
    },
  });
  assert.equal(importedRes.statusCode, 200);
  const literatureId = importedRes.json().results[0]?.literature_id;
  assert.ok(literatureId);

  const previousFetch = globalThis.fetch;
  const restoreDnsLookup = mockPublicDnsLookup();
  const payload = Buffer.from('%PDF-1.4 route download body');
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.endsWith('/pdf/2502.00001')) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: 'https://arxiv.org/final/2502.00001.pdf',
        },
      });
    }
    return new Response(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(payload.length),
      },
    });
  }) as typeof fetch;

  try {
    const downloadRes = await app.inject({
      method: 'POST',
      url: `/literature/${encodeURIComponent(literatureId)}/content-assets/download`,
      payload: {
        source_url: 'https://arxiv.org/pdf/2502.00001',
        max_byte_size: 1024,
      },
    });
    assert.equal(downloadRes.statusCode, 200);
    const body = downloadRes.json();
    assert.equal(body.item.literature_id, literatureId);
    assert.equal(body.item.status, 'registered');
    assert.equal(body.item.mime_type, 'application/pdf');
    assert.equal(body.item.byte_size, payload.length);
    assert.equal(body.item.local_path.startsWith(path.join(rawFilesRoot, literatureId)), true);
    assert.equal(body.item.metadata.downloaded_from, 'https://arxiv.org/pdf/2502.00001');
    assert.equal(body.item.metadata.final_url, 'https://arxiv.org/final/2502.00001.pdf');
    assert.deepEqual(body.item.metadata.redirect_chain, ['https://arxiv.org/final/2502.00001.pdf']);

    const stored = await fs.readFile(body.item.local_path);
    assert.deepEqual(stored, payload);
  } finally {
    globalThis.fetch = previousFetch;
    restoreDnsLookup();
    await app.close();
  }
});

test('literature content asset download route enforces persisted acquisition downloader limits', async () => {
  const app = buildApp();

  const settingsRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-acquisition',
    payload: {
      downloader: {
        max_byte_size: 8,
      },
    },
  });
  assert.equal(settingsRes.statusCode, 200);

  const importedRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'manual',
        external_id: 'download-configured-size',
        title: 'Download Configured Size',
        abstract: 'Downloader config test.',
        authors: ['Config Author'],
        year: 2026,
        source_url: 'https://example.com/download-configured-size',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importedRes.statusCode, 200);
  const literatureId = importedRes.json().results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const previousFetch = globalThis.fetch;
  const restoreDnsLookup = mockPublicDnsLookup();
  const payload = Buffer.from('%PDF-1.4 configured route download body');
  globalThis.fetch = (async () => new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(payload.length),
    },
  })) as typeof fetch;

  try {
    const res = await app.inject({
      method: 'POST',
      url: `/literature/${encodeURIComponent(literatureId)}/content-assets/download`,
      payload: {
        source_url: 'https://example.com/download-configured-size.pdf',
        max_byte_size: 1024,
      },
    });
    assert.equal(res.statusCode, 413);
  } finally {
    globalThis.fetch = previousFetch;
    restoreDnsLookup();
    await app.close();
  }
});

test('literature fulltext acquisition dry-run caps request size by persisted downloader limit', async () => {
  const app = buildApp();

  const settingsRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-acquisition',
    payload: {
      downloader: {
        max_byte_size: 8,
      },
    },
  });
  assert.equal(settingsRes.statusCode, 200);

  const importedRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'arxiv',
        external_id: 'download-acquisition-size-cap',
        title: 'Download Acquisition Size Cap',
        abstract: 'Acquisition downloader config test.',
        authors: ['Config Author'],
        year: 2026,
        arxiv_id: '2601.00002',
        source_url: 'https://arxiv.org/abs/2601.00002',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importedRes.statusCode, 200);
  const literatureId = importedRes.json().results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const dryRunRes = await app.inject({
    method: 'POST',
    url: '/literature/fulltext-acquisition/dry-runs',
    payload: {
      workset: {
        literature_ids: [literatureId],
      },
      options: {
        max_byte_size: 1024,
      },
    },
  });
  assert.equal(dryRunRes.statusCode, 200);
  assert.equal(dryRunRes.json().estimate.options.max_byte_size, 8);

  await app.close();
});

test('literature content asset download route blocks redirects to localhost before following them', async () => {
  const app = buildApp();
  const importedRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'manual',
        external_id: 'download-redirect-localhost',
        title: 'Download Redirect Localhost Rejected',
        abstract: 'Redirect security test.',
        authors: ['Security Author'],
        year: 2026,
        source_url: 'https://example.com/download-redirect-localhost',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importedRes.statusCode, 200);
  const literatureId = importedRes.json().results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const previousFetch = globalThis.fetch;
  const restoreDnsLookup = mockPublicDnsLookup();
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(null, {
      status: 302,
      headers: {
        Location: 'http://localhost:8070/private.pdf',
      },
    });
  }) as typeof fetch;
  try {
    const res = await app.inject({
      method: 'POST',
      url: `/literature/${encodeURIComponent(literatureId)}/content-assets/download`,
      payload: {
        source_url: 'https://example.com/redirect-to-localhost.pdf',
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = previousFetch;
    restoreDnsLookup();
    await app.close();
  }
});

test('literature content asset download route rejects localhost targets before fetch', async () => {
  const app = buildApp();
  const importedRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'manual',
        external_id: 'download-localhost',
        title: 'Download Localhost Rejected',
        abstract: 'Security test.',
        authors: ['Security Author'],
        year: 2026,
        source_url: 'https://example.com/download-localhost',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importedRes.statusCode, 200);
  const literatureId = importedRes.json().results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const previousFetch = globalThis.fetch;
  let fetched = false;
  globalThis.fetch = (async () => {
    fetched = true;
    return new Response('should not fetch', { status: 200 });
  }) as typeof fetch;
  try {
    const res = await app.inject({
      method: 'POST',
      url: `/literature/${encodeURIComponent(literatureId)}/content-assets/download`,
      payload: {
        source_url: 'http://localhost:8070/paper.pdf',
      },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(fetched, false);

    const mappedIpv6Res = await app.inject({
      method: 'POST',
      url: `/literature/${encodeURIComponent(literatureId)}/content-assets/download`,
      payload: {
        source_url: 'http://[::ffff:127.0.0.1]/paper.pdf',
      },
    });
    assert.equal(mappedIpv6Res.statusCode, 400);
    assert.equal(fetched, false);
  } finally {
    globalThis.fetch = previousFetch;
    await app.close();
  }
});

test('literature key-content curation routes export bundle and import curated dossier', async () => {
  const app = buildApp();

  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'manual',
        external_id: 'curated-route-1',
        title: 'Curated Route Paper',
        abstract: 'Trusted abstract for curated route import.',
        authors: ['Curator'],
        year: 2026,
        source_url: 'https://example.test/curated-route-1',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importRes.statusCode, 200);
  const literatureId = importRes.json().results[0].literature_id;

  const fulltextDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-route-curated-'));
  tempDirs.add(fulltextDir);
  const fulltextPath = path.join(fulltextDir, 'curated-route.md');
  await fs.writeFile(
    fulltextPath,
    '# Method\n\nCurated route paragraph evidence for key-content import.',
    'utf8',
  );
  const registerAssetRes = await app.inject({
    method: 'POST',
    url: `/literature/${encodeURIComponent(literatureId)}/content-assets`,
    payload: {
      local_path: fulltextPath,
      mime_type: 'text/markdown',
    },
  });
  assert.equal(registerAssetRes.statusCode, 200);

  const triggerRes = await app.inject({
    method: 'POST',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing/runs`,
    payload: {
      requested_stages: ['ABSTRACT_READY', 'FULLTEXT_PREPROCESSED'],
    },
  });
  assert.equal(triggerRes.statusCode, 200);
  let runCompleted = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const runsRes = await app.inject({
      method: 'GET',
      url: `/literature/${encodeURIComponent(literatureId)}/content-processing/runs?limit=1`,
    });
    assert.equal(runsRes.statusCode, 200);
    if (runsRes.json().items[0]?.status === 'SUCCESS') {
      runCompleted = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(runCompleted, true);

  const bundleRes = await app.inject({
    method: 'GET',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-curation-bundle`,
  });
  assert.equal(bundleRes.statusCode, 200);
  const bundle = bundleRes.json();
  assert.equal(bundle.literature_id, literatureId);
  assert.equal(bundle.paragraphs.length, 1);
  assert.equal(bundle.export_policy.accepted_curation_sources.includes('codex_curated'), true);

  const dryRunRes = await app.inject({
    method: 'POST',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-dossier/dry-run`,
    payload: {
      curation_source: 'codex_curated',
      curator: 'codex',
      dossier: buildRouteCuratedDossier(
        `paragraph:${bundle.paragraphs[0].paragraph_id}:Curated route paragraph evidence`,
        bundle.document.normalized_text_checksum,
      ),
    },
  });
  assert.equal(dryRunRes.statusCode, 200);
  const dryRunBody = dryRunRes.json();
  assert.equal(dryRunBody.valid, true);
  assert.equal(dryRunBody.repaired_source_ref_count > 0, true);
  assert.equal(dryRunBody.would_mark_downstream_stale, true);

  const importDossierRes = await app.inject({
    method: 'POST',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-dossier`,
    payload: {
      curation_source: 'codex_curated',
      curator: 'codex',
      dossier: buildRouteCuratedDossier(bundle.paragraphs[0].paragraph_id, bundle.document.normalized_text_checksum),
    },
  });
  assert.equal(importDossierRes.statusCode, 200);
  const importDossierBody = importDossierRes.json();
  assert.equal(importDossierBody.source, 'codex_curated');
  assert.equal(importDossierBody.readiness_status, 'READY');
  assert.equal(importDossierBody.state.key_content_ready, true);

  const contentProcessingRes = await app.inject({
    method: 'GET',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing`,
  });
  assert.equal(contentProcessingRes.statusCode, 200);
  const keyStage = contentProcessingRes.json().stage_states.find((item: { stage_code: string }) => item.stage_code === 'KEY_CONTENT_READY');
  assert.equal(keyStage.status, 'SUCCEEDED');
  assert.equal(keyStage.detail.source, 'codex_curated');

  const badImportRes = await app.inject({
    method: 'POST',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-dossier`,
    payload: {
      curation_source: 'codex_curated',
      dossier: buildRouteCuratedDossier('missing-paragraph', bundle.document.normalized_text_checksum),
    },
  });
  assert.equal(badImportRes.statusCode, 400);
  assert.equal(badImportRes.json().error.code, 'INVALID_PAYLOAD');

  const badProvenanceDossier = buildRouteCuratedDossier(
    bundle.paragraphs[0].paragraph_id,
    bundle.document.normalized_text_checksum,
  );
  badProvenanceDossier.categories.research_problem[0].provenance = 'human_curated';
  const badProvenanceRes = await app.inject({
    method: 'POST',
    url: `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-dossier`,
    payload: {
      curation_source: 'codex_curated',
      dossier: badProvenanceDossier,
    },
  });
  assert.equal(badProvenanceRes.statusCode, 400);
  assert.equal(badProvenanceRes.json().error.code, 'INVALID_PAYLOAD');
  assert.match(badProvenanceRes.json().error.message, /item-level provenance/);

  await app.close();
});

test('literature fulltext acquisition job downloads arxiv PDF as a separate job', async () => {
  const app = buildApp();
  const rawFilesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-acquisition-download-'));
  tempDirs.add(rawFilesRoot);

  const settingsRes = await app.inject({
    method: 'PATCH',
    url: '/settings/literature-content-processing',
    payload: {
      storage_roots: {
        raw_files: rawFilesRoot,
      },
    },
  });
  assert.equal(settingsRes.statusCode, 200);

  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'arxiv',
        external_id: '2601.00001',
        title: 'Acquisition Route Paper',
        abstract: 'Acquisition abstract.',
        authors: ['Route Author'],
        year: 2026,
        arxiv_id: '2601.00001',
        source_url: 'https://arxiv.org/abs/2601.00001',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importRes.statusCode, 200);
  const literatureId = importRes.json().results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const dryRunRes = await app.inject({
    method: 'POST',
    url: '/literature/fulltext-acquisition/dry-runs',
    payload: {
      workset: {
        literature_ids: [literatureId],
      },
      options: {
        max_byte_size: 1024,
      },
    },
  });
  assert.equal(dryRunRes.statusCode, 200);
  const dryRunBody = dryRunRes.json();
  assert.equal(dryRunBody.estimate.planned_item_count, 1);
  assert.equal(dryRunBody.estimate.plan_items[0]?.selected_source_kind, 'arxiv');

  const previousFetch = globalThis.fetch;
  const restoreDnsLookup = mockPublicDnsLookup();
  const payload = Buffer.from('%PDF-1.4 acquisition route body');
  globalThis.fetch = (async () => new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(payload.length),
    },
  })) as typeof fetch;

  try {
    const createRes = await app.inject({
      method: 'POST',
      url: '/literature/fulltext-acquisition/jobs',
      payload: {
        workset: {
          literature_ids: [literatureId],
        },
        options: {
          max_byte_size: 1024,
        },
      },
    });
    assert.equal(createRes.statusCode, 201);
    const jobId = createRes.json().job.job_id;
    assert.equal(typeof jobId, 'string');

    const job = await waitForFulltextAcquisitionJob(app, jobId);
    assert.equal(job.status, 'SUCCEEDED');
    assert.equal(job.items[0]?.status, 'SUCCEEDED');
    assert.equal(job.items[0]?.selected_source_kind, 'arxiv');
    assert.equal(typeof job.items[0]?.content_asset_id, 'string');
    assert.equal(job.totals.succeeded, 1);
    const sourceHealth = new Map(
      (job.source_health as SourceHealthSummary[]).map((item) => [item.source_kind, item]),
    );
    assert.equal(sourceHealth.get('arxiv')?.planned_count, 1);
    assert.equal(sourceHealth.get('arxiv')?.succeeded_count, 1);
    assert.equal(sourceHealth.get('arxiv')?.runtime_status, 'READY');
    assert.equal(sourceHealth.get('download')?.planned_count, 1);
    assert.equal(sourceHealth.get('download')?.succeeded_count, 1);
    assert.equal(sourceHealth.get('download')?.runtime_status, 'READY');

    const assetsRes = await app.inject({
      method: 'GET',
      url: `/literature/${encodeURIComponent(literatureId)}/content-assets`,
    });
    assert.equal(assetsRes.statusCode, 200);
    assert.equal(assetsRes.json().items.length, 1);
    assert.equal(assetsRes.json().items[0]?.metadata.acquisition_job_id, jobId);
  } finally {
    globalThis.fetch = previousFetch;
    restoreDnsLookup();
    await app.close();
  }
});

test('literature fulltext acquisition dry-run prioritizes explicit URL before arxiv and unpaywall', async () => {
  const app = buildApp();
  const rawFilesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-acquisition-explicit-'));
  tempDirs.add(rawFilesRoot);
  const previousFetch = globalThis.fetch;
  const restoreDnsLookup = mockPublicDnsLookup();

  try {
    const contentSettingsRes = await app.inject({
      method: 'PATCH',
      url: '/settings/literature-content-processing',
      payload: {
        storage_roots: {
          raw_files: rawFilesRoot,
        },
      },
    });
    assert.equal(contentSettingsRes.statusCode, 200);

    const settingsRes = await app.inject({
      method: 'PATCH',
      url: '/settings/literature-acquisition',
      payload: {
        unpaywall: {
          enabled: true,
          email: 'oa@example.com',
        },
        downloader: {
          max_byte_size: 1024,
          timeout_ms: 5000,
          max_redirects: 1,
          require_pdf_signature: true,
        },
        source_throttle: {
          arxiv: { min_interval_ms: 0, concurrency: 1 },
          unpaywall: { min_interval_ms: 0, concurrency: 1 },
          download: { min_interval_ms: 0, concurrency: 1 },
        },
      },
    });
    assert.equal(settingsRes.statusCode, 200);

    const importRes = await app.inject({
      method: 'POST',
      url: '/literature/collections/import',
      payload: {
        items: [{
          provider: 'arxiv',
          external_id: '2601.00002',
          title: 'Acquisition Explicit Priority Paper',
          abstract: 'Priority abstract.',
          authors: ['Priority Author'],
          year: 2026,
          doi: '10.5555/explicit-priority',
          arxiv_id: '2601.00002',
          source_url: 'https://arxiv.org/abs/2601.00002',
          rights_class: 'OA',
        }],
      },
    });
    assert.equal(importRes.statusCode, 200);
    const literatureId = importRes.json().results[0]?.literature_id;
    assert.equal(typeof literatureId, 'string');

    const explicitUrl = 'https://example.com/explicit-priority.pdf';
    const dryRunRes = await app.inject({
      method: 'POST',
      url: '/literature/fulltext-acquisition/dry-runs',
      payload: {
        workset: {
          literature_ids: [literatureId],
          explicit_urls: [{
            literature_id: literatureId,
            source_url: explicitUrl,
          }],
        },
      },
    });
    assert.equal(dryRunRes.statusCode, 200);
    const planItem = dryRunRes.json().estimate.plan_items[0];
    assert.equal(planItem.selected_source_kind, 'explicit_url');
    assert.equal(planItem.source_url, explicitUrl);
    assert.deepEqual(
      planItem.candidates.map((item: { source_kind: string }) => item.source_kind),
      ['explicit_url', 'arxiv', 'unpaywall'],
    );

    const payload = Buffer.from('%PDF-1.4 explicit route body');
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      assert.equal(String(input), explicitUrl);
      return new Response(payload, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(payload.length),
        },
      });
    }) as typeof fetch;

    const createRes = await app.inject({
      method: 'POST',
      url: '/literature/fulltext-acquisition/jobs',
      payload: {
        workset: {
          literature_ids: [literatureId],
          explicit_urls: [{
            literature_id: literatureId,
            source_url: explicitUrl,
          }],
        },
      },
    });
    assert.equal(createRes.statusCode, 201);
    const job = await waitForFulltextAcquisitionJob(app, createRes.json().job.job_id);
    assert.equal(job.status, 'SUCCEEDED');
    assert.equal(job.items[0]?.selected_source_kind, 'explicit_url');
    assert.equal(job.totals.succeeded, 1);
    const sourceHealth = new Map(
      (job.source_health as SourceHealthSummary[]).map((item) => [item.source_kind, item]),
    );
    assert.equal(sourceHealth.get('explicit_url')?.planned_count, 1);
    assert.equal(sourceHealth.get('explicit_url')?.succeeded_count, 1);
    assert.equal(sourceHealth.get('explicit_url')?.runtime_status, 'READY');
    assert.equal(sourceHealth.get('download')?.planned_count, 1);
    assert.equal(sourceHealth.get('download')?.succeeded_count, 1);
  } finally {
    globalThis.fetch = previousFetch;
    restoreDnsLookup();
    await app.close();
  }
});

test('literature fulltext acquisition job resolves and downloads Unpaywall OA PDF', async () => {
  const app = buildApp();
  const rawFilesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-acquisition-unpaywall-'));
  tempDirs.add(rawFilesRoot);
  const previousFetch = globalThis.fetch;
  const restoreDnsLookup = mockPublicDnsLookup();

  try {
    const contentSettingsRes = await app.inject({
      method: 'PATCH',
      url: '/settings/literature-content-processing',
      payload: {
        storage_roots: {
          raw_files: rawFilesRoot,
        },
      },
    });
    assert.equal(contentSettingsRes.statusCode, 200);

    const acquisitionSettingsRes = await app.inject({
      method: 'PATCH',
      url: '/settings/literature-acquisition',
      payload: {
        unpaywall: {
          enabled: true,
          email: 'oa@example.com',
        },
        downloader: {
          max_byte_size: 1024,
          timeout_ms: 5000,
          max_redirects: 1,
          require_pdf_signature: true,
        },
        source_throttle: {
          unpaywall: { min_interval_ms: 0, concurrency: 1 },
          download: { min_interval_ms: 0, concurrency: 1 },
        },
      },
    });
    assert.equal(acquisitionSettingsRes.statusCode, 200);

    const importRes = await app.inject({
      method: 'POST',
      url: '/literature/collections/import',
      payload: {
        items: [{
          provider: 'crossref',
          external_id: '10.5555/unpaywall-success',
          title: 'Unpaywall Success Paper',
          abstract: 'Unpaywall success abstract.',
          authors: ['OA Author'],
          year: 2026,
          doi: '10.5555/unpaywall-success',
          source_url: 'https://doi.org/10.5555/unpaywall-success',
          rights_class: 'OA',
        }],
      },
    });
    assert.equal(importRes.statusCode, 200);
    const literatureId = importRes.json().results[0]?.literature_id;
    assert.equal(typeof literatureId, 'string');

    const pdfUrl = 'https://oa.example.test/unpaywall-success.pdf';
    const payload = Buffer.from('%PDF-1.4 unpaywall route body');
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.startsWith('https://api.unpaywall.org/v2/')) {
        return new Response(JSON.stringify({
          best_oa_location: {
            url_for_pdf: pdfUrl,
          },
          oa_locations: [],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      assert.equal(url, pdfUrl);
      return new Response(payload, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(payload.length),
        },
      });
    }) as typeof fetch;

    const createRes = await app.inject({
      method: 'POST',
      url: '/literature/fulltext-acquisition/jobs',
      payload: {
        workset: {
          literature_ids: [literatureId],
        },
      },
    });
    assert.equal(createRes.statusCode, 201);
    const job = await waitForFulltextAcquisitionJob(app, createRes.json().job.job_id);
    assert.equal(job.status, 'SUCCEEDED');
    assert.equal(job.items[0]?.selected_source_kind, 'unpaywall');
    assert.equal(job.items[0]?.source_url, pdfUrl);
    assert.equal(job.items[0]?.final_url, pdfUrl);
    assert.equal(job.totals.succeeded, 1);
    const sourceHealth = new Map(
      (job.source_health as SourceHealthSummary[]).map((item) => [item.source_kind, item]),
    );
    assert.equal(sourceHealth.get('unpaywall')?.planned_count, 1);
    assert.equal(sourceHealth.get('unpaywall')?.succeeded_count, 1);
    assert.equal(sourceHealth.get('unpaywall')?.runtime_status, 'READY');
    assert.equal(sourceHealth.get('download')?.planned_count, 1);
    assert.equal(sourceHealth.get('download')?.succeeded_count, 1);
  } finally {
    globalThis.fetch = previousFetch;
    restoreDnsLookup();
    await app.close();
  }
});

test('literature fulltext acquisition job records Unpaywall no-OA and rate-limit failures', async () => {
  const app = buildApp();
  const previousFetch = globalThis.fetch;

  try {
    const settingsRes = await app.inject({
      method: 'PATCH',
      url: '/settings/literature-acquisition',
      payload: {
        unpaywall: {
          enabled: true,
          email: 'oa@example.com',
        },
        source_throttle: {
          unpaywall: { min_interval_ms: 0, concurrency: 1 },
        },
      },
    });
    assert.equal(settingsRes.statusCode, 200);

    const importRes = await app.inject({
      method: 'POST',
      url: '/literature/collections/import',
      payload: {
        items: [
          {
            provider: 'crossref',
            external_id: '10.5555/unpaywall-no-oa',
            title: 'Unpaywall No OA Paper',
            abstract: 'No OA abstract.',
            authors: ['No OA Author'],
            year: 2026,
            doi: '10.5555/unpaywall-no-oa',
            source_url: 'https://doi.org/10.5555/unpaywall-no-oa',
            rights_class: 'OA',
          },
          {
            provider: 'crossref',
            external_id: '10.5555/unpaywall-rate-limit',
            title: 'Unpaywall Rate Limit Paper',
            abstract: 'Rate limit abstract.',
            authors: ['Rate Limit Author'],
            year: 2026,
            doi: '10.5555/unpaywall-rate-limit',
            source_url: 'https://doi.org/10.5555/unpaywall-rate-limit',
            rights_class: 'OA',
          },
        ],
      },
    });
    assert.equal(importRes.statusCode, 200);
    const literatureIds = importRes.json().results.map((item: { literature_id: string }) => item.literature_id);

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes('unpaywall-no-oa')) {
        return new Response(JSON.stringify({
          best_oa_location: null,
          oa_locations: [],
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('unpaywall-rate-limit')) {
        return new Response('{}', {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    const createRes = await app.inject({
      method: 'POST',
      url: '/literature/fulltext-acquisition/jobs',
      payload: {
        workset: {
          literature_ids: literatureIds,
        },
      },
    });
    assert.equal(createRes.statusCode, 201);
    const job = await waitForFulltextAcquisitionJob(app, createRes.json().job.job_id);
    assert.equal(job.status, 'FAILED');
    assert.equal(job.totals.failed, 2);
    type AcquisitionFailureItem = {
      error_code: string;
      retryable: boolean;
      blocker_code: string | null;
    };
    const failureItems = job.items as AcquisitionFailureItem[];
    const itemByCode = new Map<string, AcquisitionFailureItem>(
      failureItems.map((item) => [item.error_code, item]),
    );
    assert.equal(itemByCode.get('UNPAYWALL_NO_OA_PDF')?.retryable, false);
    assert.equal(itemByCode.get('UNPAYWALL_NO_OA_PDF')?.blocker_code, 'UNPAYWALL_NO_OA_PDF');
    assert.equal(itemByCode.get('SOURCE_RATE_LIMIT')?.retryable, true);
    assert.equal(itemByCode.get('SOURCE_RATE_LIMIT')?.blocker_code, null);
    const sourceHealth = new Map(
      (job.source_health as SourceHealthSummary[]).map((item) => [item.source_kind, item]),
    );
    assert.equal(sourceHealth.get('unpaywall')?.planned_count, 2);
    assert.equal(sourceHealth.get('unpaywall')?.failed_count, 2);
    assert.equal(sourceHealth.get('unpaywall')?.retryable_failure_count, 1);
    assert.equal(sourceHealth.get('unpaywall')?.non_retryable_failure_count, 1);
    assert.equal(sourceHealth.get('unpaywall')?.error_counts_by_code.UNPAYWALL_NO_OA_PDF, 1);
    assert.equal(sourceHealth.get('unpaywall')?.error_counts_by_code.SOURCE_RATE_LIMIT, 1);
    assert.equal(sourceHealth.get('unpaywall')?.runtime_status, 'COOLDOWN');
    assert.equal(sourceHealth.get('download')?.planned_count, 0);
  } finally {
    globalThis.fetch = previousFetch;
    await app.close();
  }
});

test('literature backfill operations routes dry-run create job and cleanup without old fan-out path', async () => {
  const app = buildApp();

  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'manual',
        external_id: 'backfill-route-1',
        title: 'Backfill Route Paper',
        abstract: 'Trusted backfill abstract.',
        authors: ['Route Author'],
        year: 2026,
        source_url: 'https://example.com/backfill-route-1',
        rights_class: 'OA',
      }],
    },
  });
  assert.equal(importRes.statusCode, 200);
  const literatureId = importRes.json().results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const dryRunRes = await app.inject({
    method: 'POST',
    url: '/literature/content-processing/backfill/dry-runs',
    payload: {
      target_stage: 'ABSTRACT_READY',
      workset: {
        literature_ids: [literatureId],
        stage_filters: {
          missing: true,
          stale: true,
          failed: true,
        },
      },
    },
  });
  assert.equal(dryRunRes.statusCode, 200);
  const dryRunBody = dryRunRes.json();
  assert.equal(dryRunBody.estimate.planned_item_count, 1);
  assert.deepEqual(dryRunBody.estimate.plan_items[0]?.requested_stages, ['CITATION_NORMALIZED', 'ABSTRACT_READY']);

  const createJobRes = await app.inject({
    method: 'POST',
    url: '/literature/content-processing/backfill/jobs',
    payload: {
      target_stage: 'ABSTRACT_READY',
      workset: {
        literature_ids: [literatureId],
      },
    },
  });
  assert.equal(createJobRes.statusCode, 201);
  const jobId = createJobRes.json().job.job_id;
  assert.equal(typeof jobId, 'string');

  const job = await waitForBackfillJob(app, jobId);
  assert.equal(job.status, 'SUCCEEDED');
  assert.equal(job.items[0]?.status, 'SUCCEEDED');

  const deleteJobRes = await app.inject({
    method: 'DELETE',
    url: `/literature/content-processing/backfill/jobs/${encodeURIComponent(jobId)}`,
  });
  assert.equal(deleteJobRes.statusCode, 204);

  const deletedJobRes = await app.inject({
    method: 'GET',
    url: `/literature/content-processing/backfill/jobs/${encodeURIComponent(jobId)}`,
  });
  assert.equal(deletedJobRes.statusCode, 404);

  const cleanupRes = await app.inject({
    method: 'POST',
    url: '/literature/content-processing/cleanup/dry-runs',
    payload: {
      literature_ids: [literatureId],
      retention_days: 0,
    },
  });
  assert.equal(cleanupRes.statusCode, 200);
  const cleanupBody = cleanupRes.json();
  assert.equal(cleanupBody.protected_raw_asset_count, 0);
  assert.equal(cleanupBody.candidate_count, 0);

  await app.close();
});

test('POST /paper-projects succeeds with valid payload', async () => {
  const app = buildApp();

  const res = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_1',
      title: 'Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-1'],
      },
    },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.paper_id, 'P001');
  assert.equal(body.status, 'active');

  await app.close();
});

test('POST /paper-projects returns INVALID_PAYLOAD when literature list is empty', async () => {
  const app = buildApp();

  const res = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_2',
      title: 'Invalid Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: [],
      },
    },
  });

  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.error.code, 'INVALID_PAYLOAD');

  await app.close();
});

test('gate verify happy path and no_m6 policy failure path', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_3',
      title: 'Gate Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-3'],
      },
    },
  });

  const { paper_id: paperId } = createRes.json();

  const commitRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/version-spine/commit',
    payload: {
      lineage_meta: {
        paper_id: paperId,
        stage_id: 'S3',
        module_id: 'M5',
        version_id: 'P001-M5-B01-N0001',
        run_id: 'RUN-INT-1',
        lane_id: 'LANE-INT-1',
        attempt_id: 'ATT-INT-1',
        created_by: 'llm',
        created_at: new Date().toISOString(),
      },
      payload_ref: 'experiment_plan_v:EXP-INT-1',
      node_status: 'candidate',
      value_judgement_payload: {
        judgement_id: 'J-INT-1',
        decision: 'promote',
        core_score_vector: { technical_soundness: 0.8 },
        extension_score_vector: { protocol_fairness: 0.8 },
        confidence: 0.9,
        reason_summary: 'promote node',
        reviewer: 'llm',
        timestamp: new Date().toISOString(),
      },
    },
  });

  assert.equal(commitRes.statusCode, 200);
  const { node_id: nodeId } = commitRes.json();

  const verifyOkRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/stage-gates/g1/verify',
    payload: {
      candidate_node_ids: [nodeId],
      config_version: 'llm-global-default-v1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
      override_context: {
        skip_m6_reason: 'skip training in integration test',
        training_claim_allowed: false,
      },
    },
  });

  assert.equal(verifyOkRes.statusCode, 200);
  const okBody = verifyOkRes.json();
  assert.equal(okBody.results[0].decision, 'promote');

  const verifyFailRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/stage-gates/g1/verify',
    payload: {
      candidate_node_ids: [nodeId],
      config_version: 'llm-global-default-v1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
    },
  });

  assert.equal(verifyFailRes.statusCode, 422);
  const failBody = verifyFailRes.json();
  assert.equal(failBody.error.code, 'NO_M6_POLICY_VIOLATION');

  await app.close();
});

test('governance read endpoints and release review endpoint work together', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_4',
      title: 'Governance Integration Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-4'],
      },
    },
  });

  const { paper_id: paperId } = createRes.json();

  const commitRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/version-spine/commit',
    payload: {
      lineage_meta: {
        paper_id: paperId,
        stage_id: 'S3',
        module_id: 'M5',
        version_id: 'P001-M5-B01-N0001',
        run_id: 'RUN-INT-2',
        lane_id: 'LANE-INT-2',
        attempt_id: 'ATT-INT-2',
        created_by: 'llm',
        created_at: new Date().toISOString(),
      },
      payload_ref: 'experiment_plan_v:EXP-INT-2',
      node_status: 'candidate',
      value_judgement_payload: {
        judgement_id: 'J-INT-2',
        decision: 'hold',
        core_score_vector: { technical_soundness: 0.7 },
        extension_score_vector: { protocol_fairness: 0.7 },
        confidence: 0.8,
        reason_summary: 'hold for now',
        reviewer: 'llm',
        timestamp: new Date().toISOString(),
      },
    },
  });

  assert.equal(commitRes.statusCode, 200);

  const timelineRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/timeline',
  });
  assert.equal(timelineRes.statusCode, 200);
  const timelineBody = timelineRes.json();
  assert.equal(timelineBody.paper_id, paperId);
  assert.equal(Array.isArray(timelineBody.events), true);
  assert.equal(timelineBody.events.length > 0, true);

  const metricsRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/resource-metrics',
  });
  assert.equal(metricsRes.statusCode, 200);
  const metricsBody = metricsRes.json();
  assert.equal(metricsBody.paper_id, paperId);
  assert.equal(typeof metricsBody.paper_runtime_metric.tokens, 'number');

  const artifactRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/artifact-bundle',
  });
  assert.equal(artifactRes.statusCode, 200);
  const artifactBody = artifactRes.json();
  assert.equal(artifactBody.paper_id, paperId);
  assert.equal(typeof artifactBody.artifact_bundle.proposal_url, 'string');

  const reviewRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/release-gate/review',
    payload: {
      reviewers: ['reviewer-1'],
      decision: 'approve',
      risk_flags: ['policy-check'],
      label_policy: 'ai-generated-required',
      comment: 'Looks good to release.',
    },
  });
  assert.equal(reviewRes.statusCode, 200);
  const reviewBody = reviewRes.json();
  assert.equal(reviewBody.gate_result.accepted, true);
  assert.equal(reviewBody.gate_result.review_id, 'RV-0001');

  const artifactAfterReviewRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/artifact-bundle',
  });
  assert.equal(artifactAfterReviewRes.statusCode, 200);
  const artifactAfterReviewBody = artifactAfterReviewRes.json();
  assert.equal(typeof artifactAfterReviewBody.artifact_bundle.review_url, 'string');

  await app.close();
});

test('release review endpoint rejects invalid payload', async () => {
  const app = buildApp();

  const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_5',
      title: 'Review Validation Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-5'],
      },
    },
  });

  const { paper_id: paperId } = createRes.json();

  const reviewRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/release-gate/review',
    payload: {
      reviewers: [],
      decision: 'approve',
      risk_flags: [],
      label_policy: 'ai-generated-required',
    },
  });

  assert.equal(reviewRes.statusCode, 400);
  const body = reviewRes.json();
  assert.equal(body.error.code, 'INVALID_PAYLOAD');

  await app.close();
});

test('literature workflow routes support import, topic scope, paper link sync and citation update', async () => {
  const app = buildApp();
  const restoreFetch = mockOpenAIContentProcessing();

  await app.inject({
    method: 'PATCH',
    url: '/settings/literature-content-processing',
    payload: {
      providers: [{ provider: 'openai', api_key: 'sk-route-content-processing' }],
      extraction: {
        runtime: {
          preferred_key_content_method: 'llm_gateway',
        },
      },
    },
  });

  try {
    const createRes = await app.inject({
    method: 'POST',
    url: '/paper-projects',
    payload: {
      title_card_id: 'title_card_int_lit_1',
      title: 'Literature Workflow Paper',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-INT-WF-1'],
      },
    },
  });

  assert.equal(createRes.statusCode, 201);
  const { paper_id: paperId } = createRes.json();

  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [
        {
          provider: 'crossref',
          external_id: '10.2000/workflow-a',
          title: 'Workflow Paper A',
          authors: ['Alice', 'Bob'],
          year: 2024,
          doi: '10.2000/workflow-a',
          source_url: 'https://doi.org/10.2000/workflow-a',
        },
      ],
    },
  });

  assert.equal(importRes.statusCode, 200);
  const importBody = importRes.json();
  const literatureId = importBody.results[0]?.literature_id;
  assert.equal(typeof literatureId, 'string');

  const removedImportRes = await app.inject({
    method: 'POST',
    url: '/literature/import',
    payload: {
      items: [],
    },
  });
  assert.equal(removedImportRes.statusCode, 404);

  const scopeRes = await app.inject({
    method: 'POST',
    url: '/topics/TOPIC-INT-LIT-1/literature-scope',
    payload: {
      actions: [
        {
          literature_id: literatureId,
          scope_status: 'in_scope',
        },
      ],
    },
  });
  assert.equal(scopeRes.statusCode, 200);
  const scopeBody = scopeRes.json();
  assert.equal(scopeBody.items.length, 1);
  assert.equal(scopeBody.items[0]?.scope_status, 'in_scope');

  const scopeQueryRes = await app.inject({
    method: 'GET',
    url: '/topics/TOPIC-INT-LIT-1/literature-scope',
  });
  assert.equal(scopeQueryRes.statusCode, 200);
  const scopeQueryBody = scopeQueryRes.json();
  assert.equal(scopeQueryBody.items.length, 1);
  assert.equal(scopeQueryBody.items[0]?.activation_status, 'eligible');

  const metadataPatchRes = await app.inject({
    method: 'PATCH',
    url: '/literature/' + literatureId + '/metadata',
    payload: {
      rights_class: 'OA',
      tags: ['survey', 'baseline'],
      abstract: 'Trusted route-test abstract for explicit content processing.',
      key_content_digest: 'Trusted route-test key content for explicit content processing.',
    },
  });
  assert.equal(metadataPatchRes.statusCode, 200);
  const metadataPatchBody = metadataPatchRes.json();
  assert.equal(metadataPatchBody.literature_id, literatureId);
  assert.deepEqual(metadataPatchBody.tags, ['survey', 'baseline']);
  assert.equal(metadataPatchBody.rights_class, 'OA');
  assert.equal(metadataPatchBody.key_content_digest, 'Trusted route-test key content for explicit content processing.');

  const metadataGetRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/metadata',
  });
  assert.equal(metadataGetRes.statusCode, 200);
  const metadataGetBody = metadataGetRes.json();
  assert.equal(metadataGetBody.literature_id, literatureId);
  assert.equal(metadataGetBody.key_content_digest, 'Trusted route-test key content for explicit content processing.');

  const fulltextDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-route-fulltext-'));
  tempDirs.add(fulltextDir);
  const fulltextPath = path.join(fulltextDir, 'workflow-paper-a.md');
  await fs.writeFile(
    fulltextPath,
    '# Abstract\n\nTrusted route-test abstract for explicit content processing.\n\n# Evidence\n\nRoute-level fulltext evidence.',
    'utf8',
  );
  const registerAssetRes = await app.inject({
    method: 'POST',
    url: '/literature/' + literatureId + '/content-assets',
    payload: {
      local_path: fulltextPath,
      mime_type: 'text/markdown',
    },
  });
  assert.equal(registerAssetRes.statusCode, 200);
  const registerAssetBody = registerAssetRes.json();
  assert.equal(registerAssetBody.item.literature_id, literatureId);
  assert.equal(registerAssetBody.item.status, 'registered');

  const listAssetsRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/content-assets',
  });
  assert.equal(listAssetsRes.statusCode, 200);
  assert.equal(listAssetsRes.json().items.length, 1);

  const removedPipelineRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/pipeline',
  });
  assert.equal(removedPipelineRes.statusCode, 404);

  const contentProcessingRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/content-processing',
  });
  assert.equal(contentProcessingRes.statusCode, 200);
  const contentProcessingBody = contentProcessingRes.json();
  assert.equal(contentProcessingBody.literature_id, literatureId);
  assert.equal(typeof contentProcessingBody.state.citation_complete, 'boolean');
  assert.equal(typeof contentProcessingBody.state.fulltext_preprocessed, 'boolean');
  assert.equal(Array.isArray(contentProcessingBody.stage_states), true);

  const initialContentProcessingRunsRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/content-processing/runs?limit=5',
  });
  assert.equal(initialContentProcessingRunsRes.statusCode, 200);
  assert.equal(initialContentProcessingRunsRes.json().items.length, 0);

  const removedPipelineRunsRes = await app.inject({
    method: 'POST',
    url: '/literature/' + literatureId + '/pipeline/runs',
    payload: {
      requested_stages: ['ABSTRACT_READY'],
    },
  });
  assert.equal(removedPipelineRunsRes.statusCode, 404);

  const triggerContentProcessingRunRes = await app.inject({
    method: 'POST',
    url: '/literature/' + literatureId + '/content-processing/runs',
    payload: {
      requested_stages: ['CITATION_NORMALIZED', 'ABSTRACT_READY', 'FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],
    },
  });
  assert.equal(triggerContentProcessingRunRes.statusCode, 200);
  const triggerContentProcessingRunBody = triggerContentProcessingRunRes.json();
  assert.equal(triggerContentProcessingRunBody.run.literature_id, literatureId);

  let listContentProcessingRunsBody: { literature_id: string; items: Array<{ status: string }> } | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const listContentProcessingRunsRes = await app.inject({
      method: 'GET',
      url: '/literature/' + literatureId + '/content-processing/runs?limit=5',
    });
    assert.equal(listContentProcessingRunsRes.statusCode, 200);
    const parsedBody = listContentProcessingRunsRes.json() as { literature_id: string; items: Array<{ status: string }> };
    listContentProcessingRunsBody = parsedBody;
    if (parsedBody.items[0]?.status === 'SUCCESS') {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (!listContentProcessingRunsBody) {
    throw new Error('Timed out waiting for content-processing run list.');
  }
  assert.equal(listContentProcessingRunsBody.literature_id, literatureId);
  assert.equal(Array.isArray(listContentProcessingRunsBody.items), true);
  assert.equal(listContentProcessingRunsBody.items.length >= 1, true);
  assert.equal(listContentProcessingRunsBody.items[0]?.status, 'SUCCESS');

  const removedPipelineRunsListRes = await app.inject({
    method: 'GET',
    url: '/literature/' + literatureId + '/pipeline/runs?limit=5',
  });
  assert.equal(removedPipelineRunsListRes.statusCode, 404);

  // T-130 W-10 (D10): processing completion is no longer a quality endorsement — an unscored
  // collection import stays 'eligible' after the full chain instead of auto-activating.
  const processedScopeRes = await app.inject({
    method: 'GET',
    url: '/topics/TOPIC-INT-LIT-1/literature-scope',
  });
  assert.equal(processedScopeRes.statusCode, 200);
  assert.equal(processedScopeRes.json().items[0]?.activation_status, 'eligible');

  // Manual review is now the activation path for unscored imports.
  const manualActivateRes = await app.inject({
    method: 'PATCH',
    url: '/topics/TOPIC-INT-LIT-1/literature-activation',
    payload: {
      actions: [{ literature_id: literatureId, activation_status: 'active', reason: 'MANUAL_REVIEW_OK' }],
    },
  });
  assert.equal(manualActivateRes.statusCode, 200);

  const activatedScopeRes = await app.inject({
    method: 'GET',
    url: '/topics/TOPIC-INT-LIT-1/literature-scope',
  });
  assert.equal(activatedScopeRes.statusCode, 200);
  assert.equal(activatedScopeRes.json().items[0]?.activation_status, 'active');

  const syncRes = await app.inject({
    method: 'POST',
    url: '/paper-projects/' + paperId + '/literature-links/from-topic',
    payload: {
      topic_id: 'TOPIC-INT-LIT-1',
    },
  });
  assert.equal(syncRes.statusCode, 200);
  const syncBody = syncRes.json();
  assert.equal(syncBody.linked_count, 1);

  const paperLiteratureRes = await app.inject({
    method: 'GET',
    url: '/paper-projects/' + paperId + '/literature',
  });
  assert.equal(paperLiteratureRes.statusCode, 200);
  const paperLiteratureBody = paperLiteratureRes.json();
  assert.equal(paperLiteratureBody.items.length, 1);
  const linkId = paperLiteratureBody.items[0]?.link_id;

  const patchRes = await app.inject({
    method: 'PATCH',
    url: '/paper-projects/' + paperId + '/literature-links/' + linkId,
    payload: {
      citation_status: 'cited',
      note: 'used in final draft',
    },
  });
  assert.equal(patchRes.statusCode, 200);
  const patchBody = patchRes.json();
  assert.equal(patchBody.item.citation_status, 'cited');
  assert.equal(patchBody.item.note, 'used in final draft');

  const overviewRes = await app.inject({
    method: 'GET',
    url: '/literature/overview?topic_id=TOPIC-INT-LIT-1&paper_id=' + paperId,
  });
  assert.equal(overviewRes.statusCode, 200);
  const overviewBody = overviewRes.json();
  assert.equal(overviewBody.summary.total_literatures, 1);
  assert.equal(overviewBody.summary.cited_count, 1);
  assert.equal(overviewBody.summary.activation_status_counts[0]?.activation_status, 'active');
  assert.equal(typeof overviewBody.items[0]?.overview_status, 'string');
  assert.equal(typeof overviewBody.items[0]?.content_processing_state?.citation_complete, 'boolean');
  assert.equal(typeof overviewBody.items[0]?.content_processing_state?.fulltext_preprocessed, 'boolean');
  assert.equal(typeof overviewBody.items[0]?.content_processing_stage_status?.ABSTRACT_READY, 'string');
  assert.equal(typeof overviewBody.items[0]?.content_processing_actions?.process_content?.enabled, 'boolean');

  const retrieveRes = await app.inject({
    method: 'POST',
    url: '/literature/retrieve',
    payload: {
      query: 'workflow paper',
      topic_id: 'TOPIC-INT-LIT-1',
      top_k: 5,
      evidence_per_literature: 2,
    },
  });
  assert.equal(retrieveRes.statusCode, 200);
  const retrieveBody = retrieveRes.json();
  assert.equal(Array.isArray(retrieveBody.items), true);
  assert.equal(retrieveBody.items.length >= 1, true);
  assert.equal(Array.isArray(retrieveBody.meta.query_tokens), true);

  const removedWebImportRes = await app.inject({
    method: 'POST',
    url: '/literature/web-import',
    payload: {
      urls: [],
    },
  });
  assert.equal(removedWebImportRes.statusCode, 404);

  const removedSearchRes = await app.inject({
    method: 'POST',
    url: '/literature/search',
    payload: {
      query: 'llm evaluation',
    },
  });
  assert.equal(removedSearchRes.statusCode, 404);

  const invalidZoteroImportRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/zotero-import',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(invalidZoteroImportRes.statusCode, 400);

  const invalidZoteroPreviewRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/zotero-preview',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(invalidZoteroPreviewRes.statusCode, 400);

  const removedZoteroImportRes = await app.inject({
    method: 'POST',
    url: '/literature/zotero-import',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(removedZoteroImportRes.statusCode, 404);

  const removedZoteroPreviewRes = await app.inject({
    method: 'POST',
    url: '/literature/zotero-preview',
    payload: {
      library_type: 'users',
    },
  });
  assert.equal(removedZoteroPreviewRes.statusCode, 404);

  } finally {
    restoreFetch();
    await app.close();
  }
});

test('literature cluster routes generate and confirm structured duplicate candidates', async () => {
  const app = buildApp();
  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [
        {
          provider: 'manual',
          external_id: 'cluster-route-a',
          title: 'Route Cluster Paper A',
          authors: ['Ada Lovelace'],
          year: 2026,
          doi: '10.2000/cluster-route-a',
          source_url: 'manual:cluster-route-a',
        },
        {
          provider: 'manual',
          external_id: 'cluster-route-b',
          title: 'Route Cluster Paper B',
          authors: ['A. Lovelace'],
          year: 2026,
          source_url: 'manual:cluster-route-b',
        },
      ],
    },
  });
  assert.equal(importRes.statusCode, 200);
  const importBody = importRes.json();
  const literatureA = importBody.results[0]?.literature_id;
  const literatureB = importBody.results[1]?.literature_id;
  assert.equal(typeof literatureA, 'string');
  assert.equal(typeof literatureB, 'string');

  const assetDir = await fs.mkdtemp(path.join(os.tmpdir(), 'literature-cluster-route-'));
  tempDirs.add(assetDir);
  const assetPaths = [
    path.join(assetDir, 'cluster-a.pdf'),
    path.join(assetDir, 'cluster-b.pdf'),
  ];
  await Promise.all(assetPaths.map((assetPath) => fs.writeFile(assetPath, '%PDF-1.4\nshared cluster route pdf\n')));

  for (const [index, literatureId] of [literatureA, literatureB].entries()) {
    const assetRes = await app.inject({
      method: 'POST',
      url: `/literature/${literatureId}/content-assets`,
      payload: {
        local_path: assetPaths[index],
        mime_type: 'application/pdf',
      },
    });
    assert.equal(assetRes.statusCode, 200);
  }

  const generateRes = await app.inject({
    method: 'POST',
    url: '/literature/clusters/candidates',
    payload: {
      cluster_types: ['same_work'],
    },
  });
  assert.equal(generateRes.statusCode, 200);
  const generateBody = generateRes.json();
  assert.equal(generateBody.summary.same_pdf_count, 1);
  assert.equal(generateBody.clusters[0]?.status, 'candidate');
  assert.equal(generateBody.clusters[0]?.review.outcome, 'pending_review');
  assert.equal(generateBody.clusters[0]?.review.retrieval_dedup_active, false);
  const clusterId = generateBody.clusters[0]?.cluster_id;
  assert.equal(typeof clusterId, 'string');

  const invalidReviewRes = await app.inject({
    method: 'PATCH',
    url: `/literature/clusters/${clusterId}`,
    payload: {
      status: 'confirmed',
      review_outcome: 'related_topic_confirmed',
      representative_literature_id: literatureA,
    },
  });
  assert.equal(invalidReviewRes.statusCode, 400);

  const emptyMemberDecisionRes = await app.inject({
    method: 'PATCH',
    url: `/literature/clusters/${clusterId}`,
    payload: {
      member_decisions: [],
    },
  });
  assert.equal(emptyMemberDecisionRes.statusCode, 400);

  const updateRes = await app.inject({
    method: 'PATCH',
    url: `/literature/clusters/${clusterId}`,
    payload: {
      status: 'confirmed',
      review_outcome: 'same_work_confirmed',
      representative_literature_id: literatureA,
    },
  });
  assert.equal(updateRes.statusCode, 200);
  const updateBody = updateRes.json();
  assert.equal(updateBody.item.status, 'confirmed');
  assert.equal(updateBody.item.review.outcome, 'same_work_confirmed');
  assert.equal(updateBody.item.review.consumption_scope, 'retrieval_dedup');
  assert.equal(updateBody.item.review.retrieval_dedup_active, true);
  assert.equal(updateBody.item.members.every((member: { decision_status: string }) => member.decision_status === 'accepted'), true);

  const listRes = await app.inject({
    method: 'GET',
    url: `/literature/clusters?status=confirmed&literature_id=${literatureB}`,
  });
  assert.equal(listRes.statusCode, 200);
  const listBody = listRes.json();
  assert.equal(listBody.items.length, 1);

  await app.close();
});
