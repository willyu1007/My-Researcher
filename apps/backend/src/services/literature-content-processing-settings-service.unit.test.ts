import assert from 'node:assert/strict';
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
  });
  assert.equal(preserved.providers[0]?.api_key_set, true);
  assert.equal(preserved.providers[0]?.api_key_last_updated_at, firstKeyUpdatedAt);
  const config = await service.resolveOpenAIEmbeddingConfig();
  assert.equal(config?.apiKey, 'sk-test-secret');

  const replaced = await service.updateSettings({
    providers: [{ provider: 'openai', api_key: 'sk-test-replaced' }],
    embedding: {
      active_profile_id: 'economy',
    },
  });
  assert.equal(replaced.embedding.active_profile_id, 'economy');
  assert.notEqual(replaced.providers[0]?.api_key_last_updated_at, null);
  assert.equal((await service.resolveOpenAIEmbeddingConfig())?.apiKey, 'sk-test-replaced');

  const cleared = await service.updateSettings({
    providers: [{ provider: 'openai', api_key: null }],
  });
  assert.equal(cleared.providers[0]?.api_key_set, false);
  assert.equal(cleared.providers[0]?.api_key_last_updated_at, null);
  assert.equal(await service.resolveOpenAIEmbeddingConfig(), null);
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
