import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { InMemoryApplicationSettingsRepository } from '../repositories/in-memory-application-settings-repository.js';
import { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';

test('literature content-processing settings default to redacted OpenAI and large embedding profile', async () => {
  const service = new LiteratureContentProcessingSettingsService(new InMemoryApplicationSettingsRepository());

  const settings = await service.getSettings();

  assert.equal(settings.providers[0]?.provider, 'openai');
  assert.equal(settings.providers[0]?.api_key_set, false);
  assert.equal(settings.providers[0]?.api_key_last_updated_at, null);
  assert.equal(settings.embedding.active_profile_id, 'default');
  assert.equal(settings.embedding.profiles.find((profile) => profile.profile_id === 'default')?.model, 'text-embedding-3-large');
  assert.equal(settings.embedding.profiles.find((profile) => profile.profile_id === 'economy')?.model, 'text-embedding-3-small');
  assert.equal(settings.extraction.active_profile_id, 'default');
  assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'default')?.model, 'gpt-5.4-mini');
  assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'high_accuracy')?.model, 'gpt-5.5');
  assert.equal(settings.fulltext_parser.grobid.endpoint_url, 'http://localhost:8070');
  assert.equal(
    settings.effective_storage_roots.normalized_text,
    path.join(os.homedir(), '.paper-engineering-assistant', 'literature-content-processing', 'normalized'),
  );
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
  assert.equal(extractionConfig?.model, 'gpt-5.4-mini');
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
    },
  });
  assert.equal(replaced.embedding.active_profile_id, 'economy');
  assert.equal(replaced.extraction.active_profile_id, 'high_accuracy');
  assert.notEqual(replaced.providers[0]?.api_key_last_updated_at, null);
  assert.equal((await service.resolveOpenAIEmbeddingConfig())?.apiKey, 'sk-test-replaced');
  assert.equal((await service.resolveOpenAIExtractionConfig())?.model, 'gpt-5.5');

  const cleared = await service.updateSettings({
    providers: [{ provider: 'openai', api_key: null }],
  });
  assert.equal(cleared.providers[0]?.api_key_set, false);
  assert.equal(cleared.providers[0]?.api_key_last_updated_at, null);
  assert.equal(await service.resolveOpenAIEmbeddingConfig(), null);
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
        { profile_id: 'default', provider: 'openai', model: 'gpt-5-mini' },
        { profile_id: 'high_accuracy', provider: 'openai', model: 'gpt-5.2' },
      ],
    },
    secretValue: null,
    createdAt: '2026-05-05T00:00:00.000Z',
    updatedAt: '2026-05-05T00:00:00.000Z',
  });
  const service = new LiteratureContentProcessingSettingsService(repository);

  const settings = await service.getSettings();

  assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'default')?.model, 'gpt-5.4-mini');
  assert.equal(settings.extraction.profiles.find((profile) => profile.profile_id === 'high_accuracy')?.model, 'gpt-5.5');
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
