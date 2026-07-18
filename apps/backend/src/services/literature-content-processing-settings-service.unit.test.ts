import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { InMemoryApplicationSettingsRepository } from '../repositories/in-memory-application-settings-repository.js';
import {
  DEFAULT_PAPER_ENGINEER_LOCAL_DATA_ROOT,
  LITERATURE_CONTENT_PROCESSING_ROOT_ENV,
  LITERATURE_KEY_CONTENT_READY_METHOD_ENV,
  LiteratureContentProcessingSettingsService,
  PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV,
} from './literature-content-processing-settings-service.js';

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

test('literature content-processing settings default to redacted OpenAI and large embedding profile', async () => {
  const previousDataRoot = process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV];
  const previousLiteratureRoot = process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV];
  const previousKeyContentMethod = process.env[LITERATURE_KEY_CONTENT_READY_METHOD_ENV];
  delete process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV];
  delete process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV];
  delete process.env[LITERATURE_KEY_CONTENT_READY_METHOD_ENV];
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

  try {
    const settings = await service.getSettings();

    assert.equal(settings.providers[0]?.provider, 'openai');
    assert.equal(settings.providers[0]?.api_key_set, false);
    assert.equal(settings.providers[0]?.api_key_last_updated_at, null);
    assert.equal(settings.providers[1]?.provider, 'dashscope');
    assert.equal(settings.providers[1]?.api_key_set, false);
    assert.equal(settings.embedding.active_profile_id, 'default');
    assert.equal(settings.embedding.profiles.find((profile) => profile.profile_id === 'default')?.model, 'text-embedding-3-large');
    assert.equal(settings.embedding.profiles.find((profile) => profile.profile_id === 'economy')?.model, 'text-embedding-3-small');
    assert.equal(settings.extraction.active_profile_id, 'default');
    assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'default')?.model, 'gpt-5.6-sol');
    assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'high_accuracy')?.model, 'gpt-5.6-sol');
    assert.deepEqual(settings.extraction.runtime, {
      preferred_key_content_method: 'codex_curated',
      section_concurrency: 3,
      request_timeout_ms: 120_000,
      max_retries: 1,
      prompt_profile_id: 'literature_key_content_v2',
      diagnostic_policy: 'actionable_v1',
    });
    assert.equal(settings.fulltext_parser.grobid.endpoint_url, 'http://localhost:8070');
    assert.equal(
      settings.effective_storage_roots.normalized_text,
      path.join(DEFAULT_PAPER_ENGINEER_LOCAL_DATA_ROOT, 'literature-content-processing', 'normalized'),
    );
  } finally {
    restoreEnv(PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV, previousDataRoot);
    restoreEnv(LITERATURE_CONTENT_PROCESSING_ROOT_ENV, previousLiteratureRoot);
    restoreEnv(LITERATURE_KEY_CONTENT_READY_METHOD_ENV, previousKeyContentMethod);
  }
});

test('literature content-processing settings honor local data root env fallback', async () => {
  const previousDataRoot = process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV];
  const previousLiteratureRoot = process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV];
  process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV] = path.join(os.tmpdir(), 'paper-engineer-data-root');
  delete process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV];
  try {
    const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());
    const settings = await service.getSettings();

    assert.equal(
      settings.effective_storage_roots.raw_files,
      path.join(os.tmpdir(), 'paper-engineer-data-root', 'literature-content-processing', 'raw'),
    );
  } finally {
    restoreEnv(PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV, previousDataRoot);
    restoreEnv(LITERATURE_CONTENT_PROCESSING_ROOT_ENV, previousLiteratureRoot);
  }
});

test('literature content-processing settings honor explicit literature root env first', async () => {
  const previousDataRoot = process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV];
  const previousLiteratureRoot = process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV];
  process.env[PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV] = path.join(os.tmpdir(), 'ignored-paper-engineer-root');
  process.env[LITERATURE_CONTENT_PROCESSING_ROOT_ENV] = path.join(os.tmpdir(), 'explicit-literature-root');
  try {
    const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());
    const settings = await service.getSettings();

    assert.equal(settings.effective_storage_roots.indexes, path.join(os.tmpdir(), 'explicit-literature-root', 'indexes'));
  } finally {
    restoreEnv(PAPER_ENGINEER_LOCAL_DATA_ROOT_ENV, previousDataRoot);
    restoreEnv(LITERATURE_CONTENT_PROCESSING_ROOT_ENV, previousLiteratureRoot);
  }
});

test('literature content-processing settings preserve, replace, and clear secrets without echoing them', async () => {
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

  const saved = await service.updateSettings({
    providers: [{ provider: 'openai', api_key: 'sk-test-secret' }],
  });
  assert.equal(saved.providers[0]?.api_key_set, true);
  assert.equal('api_key' in (saved.providers[0] ?? {}), false);
  const firstKeyUpdatedAt = saved.providers[0]?.api_key_last_updated_at;
  assert.equal(typeof firstKeyUpdatedAt, 'string');

  const preserved = await service.updateSettings({
    storage_roots: {
      raw_files: '/tmp/literature/raw',
      indexes: '/tmp/literature/indexes',
    },
    fulltext_parser: {
      grobid: {
        endpoint_url: 'http://localhost:8070/',
      },
    },
  });
  assert.equal(preserved.providers[0]?.api_key_set, true);
  assert.equal(preserved.providers[0]?.api_key_last_updated_at, firstKeyUpdatedAt);
  const config = await service.resolveOpenAIEmbeddingConfig();
  assert.equal(config?.apiKey, 'sk-test-secret');
  const extractionConfig = await service.resolveOpenAIExtractionConfig();
  assert.equal(extractionConfig?.apiKey, 'sk-test-secret');
  assert.equal(extractionConfig?.provider, 'openai');
  assert.equal(extractionConfig?.model, 'gpt-5.6-sol');
  assert.equal(extractionConfig?.runtime.preferred_key_content_method, 'codex_curated');
  assert.equal(extractionConfig?.runtime.section_concurrency, 3);
  assert.equal(await service.resolvePreferredKeyContentMethod(), 'codex_curated');
  assert.equal(preserved.fulltext_parser.grobid.endpoint_url, 'http://localhost:8070');
  assert.equal(preserved.effective_storage_roots.raw_files, '/tmp/literature/raw');
  assert.equal(await service.resolveStorageRoot('indexes'), '/tmp/literature/indexes');

  const replaced = await service.updateSettings({
    providers: [{ provider: 'openai', api_key: 'sk-test-replaced' }],
    embedding: {
      active_profile_id: 'economy',
    },
    extraction: {
      active_profile_id: 'high_accuracy',
      runtime: {
        preferred_key_content_method: 'codex_curated',
        section_concurrency: 2,
        request_timeout_ms: 90_000,
        max_retries: 0,
        prompt_profile_id: 'custom_key_content_v1',
        diagnostic_policy: 'raw',
      },
    },
  });
  assert.equal(replaced.embedding.active_profile_id, 'economy');
  assert.equal(replaced.extraction.active_profile_id, 'high_accuracy');
  assert.equal(replaced.extraction.runtime.preferred_key_content_method, 'codex_curated');
  assert.equal(replaced.extraction.runtime.section_concurrency, 2);
  assert.equal(replaced.extraction.runtime.request_timeout_ms, 90_000);
  assert.equal(replaced.extraction.runtime.max_retries, 0);
  assert.equal(replaced.extraction.runtime.prompt_profile_id, 'custom_key_content_v1');
  assert.equal(replaced.extraction.runtime.diagnostic_policy, 'raw');
  assert.notEqual(replaced.providers[0]?.api_key_last_updated_at, null);
  assert.equal((await service.resolveOpenAIEmbeddingConfig())?.apiKey, 'sk-test-replaced');
  assert.equal((await service.resolveOpenAIExtractionConfig())?.model, 'gpt-5.6-sol');
  assert.equal(await service.resolvePreferredKeyContentMethod(), 'codex_curated');

  const cleared = await service.updateSettings({
    providers: [{ provider: 'openai', api_key: null }],
  });
  assert.equal(cleared.providers[0]?.api_key_set, false);
  assert.equal(cleared.providers[0]?.api_key_last_updated_at, null);
  assert.equal(await service.resolveOpenAIEmbeddingConfig(), null);
  assert.equal(await service.resolveOpenAIExtractionConfig(), null);
});

test('literature content-processing settings report OpenAI env fallback as configured without storing it', async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'sk-env-fallback-test';
  try {
    const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());
    const settings = await service.getSettings();

    assert.equal(settings.providers[0]?.provider, 'openai');
    assert.equal(settings.providers[0]?.api_key_set, true);
    assert.equal(settings.providers[0]?.api_key_last_updated_at, null);
    assert.equal((await service.resolveOpenAIEmbeddingConfig())?.apiKey, 'sk-env-fallback-test');
  } finally {
    if (previous === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previous;
    }
  }
});

test('literature content-processing settings honor key-content method env fallback when no DB setting exists', async () => {
  const previous = process.env[LITERATURE_KEY_CONTENT_READY_METHOD_ENV];
  process.env[LITERATURE_KEY_CONTENT_READY_METHOD_ENV] = 'llm_gateway';
  try {
    const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

    assert.equal((await service.getSettings()).extraction.runtime.preferred_key_content_method, 'llm_gateway');
    assert.equal(await service.resolvePreferredKeyContentMethod(), 'llm_gateway');
  } finally {
    restoreEnv(LITERATURE_KEY_CONTENT_READY_METHOD_ENV, previous);
  }
});

test('literature content-processing settings support DashScope extraction profile without changing OpenAI embeddings', async () => {
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

  await service.updateSettings({
    providers: [
      { provider: 'openai', api_key: 'sk-openai-test' },
      { provider: 'dashscope', api_key: 'sk-dashscope-test' },
    ],
    extraction: {
      active_profile_id: 'default',
      profiles: [{ profile_id: 'default', provider: 'dashscope', model: 'qwen3.7-plus' }],
    },
  });

  const embeddingConfig = await service.resolveOpenAIEmbeddingConfig();
  assert.equal(embeddingConfig?.apiKey, 'sk-openai-test');

  const extractionConfig = await service.resolveExtractionConfig();
  assert.equal(extractionConfig?.apiKey, 'sk-dashscope-test');
  assert.equal(extractionConfig?.provider, 'dashscope');
  assert.equal(extractionConfig?.model, 'qwen3.7-plus');
  assert.equal(await service.resolveOpenAIExtractionConfig(), null);
});

test('literature content-processing settings migrate legacy extraction defaults to current models', async () => {
  const repository = new InMemoryApplicationSettingsRepository();
  await repository.upsertSetting({
    id: 'settings-extraction',
    namespace: 'literature_content_processing',
    key: 'extraction',
    value: {
      active_profile_id: 'high_accuracy',
      profiles: [
        { profile_id: 'default', provider: 'openai', model: 'gpt-5.6-sol' },
        { profile_id: 'high_accuracy', provider: 'openai', model: 'gpt-5.6-sol' },
      ],
    },
    secretValue: null,
    createdAt: '2026-05-05T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z',
  });
  const service = new LiteratureContentProcessingSettingsService(repository);

  const settings = await service.getSettings();

  assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'default')?.model, 'gpt-5.6-sol');
  assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'high_accuracy')?.model, 'gpt-5.6-sol');
  assert.equal(settings.extraction.active_profile_id, 'high_accuracy');
});

test('literature content-processing settings reject blank provider secrets', async () => {
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

  await assert.rejects(
    () => service.updateSettings({
      providers: [{ provider: 'openai', api_key: '   ' }],
    }),
    /cannot be blank/,
  );
});

test('literature content-processing settings checks GROBID health with isalive fallback', async () => {
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());
  await service.updateSettings({
    fulltext_parser: {
      grobid: {
        endpoint_url: 'http://grobid.test',
      },
    },
  });
  const previousFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.endsWith('/api/health')) {
      return new Response('not found', { status: 404 });
    }
    if (url.endsWith('/api/isalive')) {
      return new Response('true', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    if (url.endsWith('/api/version')) {
      return new Response('0.8.0', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  try {
    const health = await service.checkFulltextParserHealth();

    assert.equal(health.status, 'ready');
    assert.equal(health.version, '0.8.0');
    assert.deepEqual(requestedUrls, [
      'http://grobid.test/api/health',
      'http://grobid.test/api/isalive',
      'http://grobid.test/api/version',
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('W-10 settings expose auto-advance and retrieval candidate window with defaults, clamps, and round-trip', async () => {
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

  // Defaults mirror the pre-W-10 constants.
  const initial = await service.getSettings();
  assert.deepEqual(initial.auto_advance, {
    enabled: false,
    full_chain_min_score: 75,
    fulltext_only_min_score: 55,
    daily_literature_limit: 50,
    max_parallel_literature_runs: 2,
    advance_unscored: 'none',
  });
  assert.deepEqual(initial.retrieval, {
    floor: 200,
    unscoped_ceiling: 1200,
    scoped_ceiling: 2000,
    profile_multipliers: { general: 8, topic_exploration: 10, writing_evidence: 10, paper_management: 12 },
    per_literature_cap_min: 4,
    per_literature_cap_max: 12,
    query_timeout_ms: 5000,
  });
  assert.equal(initial.fulltext_parser.grobid.timeout_ms, 120_000);

  // Patch round-trip with clamping (daily limit above max clamps to 1000; timeout below min clamps to 500).
  const updated = await service.updateSettings({
    auto_advance: { enabled: true, daily_literature_limit: 5_000, advance_unscored: 'fulltext' },
    retrieval: { query_timeout_ms: 100, profile_multipliers: { general: 16 } },
    fulltext_parser: { grobid: { timeout_ms: 30_000 } },
  });
  assert.equal(updated.auto_advance.enabled, true);
  assert.equal(updated.auto_advance.daily_literature_limit, 1_000);
  assert.equal(updated.auto_advance.advance_unscored, 'fulltext');
  assert.equal(updated.auto_advance.full_chain_min_score, 75);
  assert.equal(updated.retrieval.query_timeout_ms, 500);
  assert.equal(updated.retrieval.profile_multipliers.general, 16);
  assert.equal(updated.retrieval.profile_multipliers.paper_management, 12);
  assert.equal(updated.fulltext_parser.grobid.timeout_ms, 30_000);

  // Runtime resolvers read the same rows (W-06 resolver + new W-10 resolvers stay in sync).
  const autoAdvance = await service.resolveAutoAdvanceSettings();
  assert.equal(autoAdvance.enabled, true);
  assert.equal(autoAdvance.daily_literature_limit, 1_000);
  const window = await service.resolveRetrievalCandidateWindowSettings();
  assert.equal(window.query_timeout_ms, 500);
  assert.equal(window.profile_multipliers.general, 16);
  assert.equal(await service.resolveGrobidRequestTimeoutMs(), 30_000);
});
