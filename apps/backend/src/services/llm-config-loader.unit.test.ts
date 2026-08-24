import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LlmConfigLoader } from './llm-config-loader.js';

test('default LLM configuration resolves providers, feature calls, prompts, and native parameters', () => {
  const env = {
    OPENAI_API_KEY: 'openai-test-key',
    DASHSCOPE_BASE_URL: 'https://dashscope.example.test/v1/',
  };
  const loader = new LlmConfigLoader({ env });

  assert.deepEqual(loader.getProvider('openai'), {
    id: 'openai',
    protocol: 'openai-responses',
    baseUrl: 'https://api.openai.com/v1',
    baseUrlEnv: null,
    apiKeyEnv: 'OPENAI_API_KEY',
  });
  assert.equal(loader.resolveProviderApiKey('openai'), 'openai-test-key');
  assert.equal(loader.resolveProviderBaseUrl('dashscope'), 'https://dashscope.example.test/v1');

  const call = loader.getCall('literature-processing', 'key-content-section-default');
  assert.equal(call.provider.id, 'openai');
  assert.equal(call.model, 'gpt-5.6-sol');
  assert.equal(call.version, 'literature_key_content_v2');
  assert.deepEqual(call.parameters, { reasoning: { effort: 'low' } });
  assert.equal(
    call.prompts.system,
    'Extract a source-grounded semantic dossier section for a CS paper. Return JSON only through the provided schema. Every evidence-bearing item must cite source_refs by copying an exact ref_type and bare ref_id from source_refs_json. Do not output concatenated refs, bibliography text, labels, or quoted source text as ref_id. Do not invent claims not supported by the supplied source text.',
  );
});

test('LLM configuration rejects unknown providers and prompt traversal', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'my-researcher-llm-config-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await writeJson(path.join(root, 'providers.json'), {
    providers: {
      openai: {
        protocol: 'openai-responses',
        base_url: 'https://api.openai.com/v1',
        api_key_env: 'OPENAI_API_KEY',
      },
    },
  });
  await writeJson(path.join(root, 'unknown-provider', 'config.json'), {
    calls: {
      generate: {
        provider: 'missing',
        model: 'model',
        version: 'v1',
        parameters: {},
        tools: [],
      },
    },
  });
  await writeJson(path.join(root, 'traversal', 'config.json'), {
    calls: {
      generate: {
        provider: 'openai',
        model: 'model',
        version: 'v1',
        prompt: { system: '../outside.md' },
        parameters: {},
        tools: [],
      },
    },
  });

  const loader = new LlmConfigLoader({ llmRoot: root, env: {} });
  assert.throws(
    () => loader.getCall('unknown-provider', 'generate'),
    /provider "missing" is not configured/u,
  );
  assert.throws(
    () => loader.getCall('traversal', 'generate'),
    /must stay inside its feature directory/u,
  );
});

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
