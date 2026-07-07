import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { LiteratureContentProcessingSettingsService } from './literature-content-processing-settings-service.js';
import { BackendLlmGateway, LlmGatewayError } from './llm-gateway.js';
import { AppError } from '../errors/app-error.js';
import type { LlmPricingTable } from './llm-pricing-table.js';

function createSettingsService(): LiteratureContentProcessingSettingsService {
  return {
    resolveOpenAIProviderApiKey: async () => 'sk-test',
    resolveDashScopeProviderApiKey: async () => 'sk-dashscope-test',
    resolveDeepSeekProviderApiKey: async () => 'sk-deepseek-test',
  } as unknown as LiteratureContentProcessingSettingsService;
}

test('LLM gateway maps structured Responses output and telemetry', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({ ok: true }),
        usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'structured' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['ok'],
      properties: { ok: { type: 'boolean' } },
    },
    normalizedParams: {
      creativity: 'medium',
      reasoning_depth: 'high',
      output_budget: 'medium',
      structured_output_required: true,
      output_format: 'json_schema',
    },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.model_id, 'gpt-test');
  assert.equal(response.telemetry.prompt_template_id, 'test-prompt');
  assert.equal(response.telemetry.request_count, 1);
  assert.equal(response.telemetry.input_tokens, 11);
  assert.equal(response.telemetry.output_tokens, 7);
  assert.equal(response.telemetry.total_tokens, 18);
  assert.equal(response.telemetry.provider_side_cache_hit, null);
  assert.equal(response.telemetry.provider_side_cache_read_tokens, null);
  assert.equal(response.telemetry.provider_side_cache_write_tokens, null);
  assert.equal(calls[0]?.model, 'gpt-test');
  assert.deepEqual(calls[0]?.reasoning, { effort: 'high' });
});

test('LLM gateway records provider-side cache telemetry without treating it as response reuse', async () => {
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ ok: true }),
      usage: {
        input_tokens: 100,
        output_tokens: 12,
        total_tokens: 112,
        input_tokens_details: {
          cached_tokens: 64,
          cache_creation_tokens: 8,
        },
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'structured-cache-telemetry' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['ok'],
      properties: { ok: { type: 'boolean' } },
    },
    normalizedParams: {
      creativity: 'medium',
      reasoning_depth: 'high',
      output_budget: 'medium',
      structured_output_required: true,
      output_format: 'json_schema',
    },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.provider_side_cache_hit, true);
  assert.equal(response.telemetry.provider_side_cache_read_tokens, 64);
  assert.equal(response.telemetry.provider_side_cache_write_tokens, 8);
  assert.equal(response.telemetry.input_tokens, 100);
  assert.equal(response.telemetry.output_tokens, 12);
});

test('LLM gateway maps OpenAI normalized reasoning depth to Responses effort and allows provider override', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({ ok: true }),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'structured' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    },
    normalizedParams: {
      creativity: 'medium',
      reasoning_depth: 'medium',
      output_budget: 'medium',
      structured_output_required: true,
      output_format: 'json_schema',
    },
  });
  await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'structured' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
    },
    normalizedParams: {
      creativity: 'medium',
      reasoning_depth: 'xhigh',
      output_budget: 'medium',
      structured_output_required: true,
      output_format: 'json_schema',
    },
    providerOverrides: {
      reasoning: { effort: 'low' },
    },
  });

  assert.deepEqual(calls[0]?.reasoning, { effort: 'medium' });
  assert.deepEqual(calls[1]?.reasoning, { effort: 'low' });
});

test('LLM gateway normalizes OpenAI structured output schemas to strict objects', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({ items: [{ ref: { id: 'ref-1', legacy: {} } }] }),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  await gateway.createStructuredOutput<{ items: Array<{ ref: { id: string; legacy: Record<string, unknown> } }> }>({
    executionContext: { feature: 'test', operation: 'strict-schema' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'strict_schema',
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          uniqueItems: true,
          items: {
            type: 'object',
            required: ['ref'],
            properties: {
              ref: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string' },
                  legacy: { anyOf: [{ type: 'object', additionalProperties: true }, { type: 'null' }] },
                },
              },
            },
          },
        },
        empty_items: {
          type: 'array',
          maxItems: 0,
          items: {},
        },
      },
    },
  });

  const body = calls[0] as {
    text?: { format?: { schema?: Record<string, unknown> } };
  };
  const schema = body.text?.format?.schema as {
    additionalProperties?: boolean;
    required?: string[];
    properties?: {
      items?: {
        uniqueItems?: boolean;
        items?: {
          additionalProperties?: boolean;
          required?: string[];
          properties?: {
            ref?: {
              additionalProperties?: boolean;
              required?: string[];
              properties?: {
                legacy?: {
                  anyOf?: Array<{
                    additionalProperties?: boolean;
                    properties?: Record<string, unknown>;
                    required?: string[];
                  }>;
                };
              };
            };
          };
        };
      };
      empty_items?: {
        items?: {
          type?: string;
        };
      };
    };
  };

  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['items', 'empty_items']);
  assert.equal(schema.properties?.items?.uniqueItems, undefined);
  assert.equal(schema.properties?.items?.items?.additionalProperties, false);
  assert.deepEqual(schema.properties?.items?.items?.required, ['ref']);
  assert.equal(schema.properties?.items?.items?.properties?.ref?.additionalProperties, false);
  assert.deepEqual(schema.properties?.items?.items?.properties?.ref?.required, ['id', 'legacy']);
  assert.equal(
    schema.properties?.items?.items?.properties?.ref?.properties?.legacy?.anyOf?.[0]?.additionalProperties,
    false,
  );
  assert.deepEqual(
    schema.properties?.items?.items?.properties?.ref?.properties?.legacy?.anyOf?.[0]?.required,
    [],
  );
  assert.deepEqual(
    schema.properties?.items?.items?.properties?.ref?.properties?.legacy?.anyOf?.[0]?.properties,
    {},
  );
  assert.equal(schema.properties?.empty_items?.items?.type, 'string');
});

test('LLM gateway normalizes OpenAI response format names without changing the internal schema name', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({ ok: true }),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'schema-name' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'TopicSelectionNeedAdjudicationRecommendationPacket@v1',
    schema: {
      type: 'object',
      properties: {
        schema_version: { const: 'TopicSelectionNeedAdjudicationRecommendationPacket@v1' },
        ok: { type: 'boolean' },
      },
    },
  });

  const body = calls[0] as {
    text?: {
      format?: {
        name?: string;
        schema?: {
          properties?: {
            schema_version?: {
              const?: string;
              enum?: string[];
              type?: string;
            };
          };
        };
      };
    };
  };
  assert.equal(body.text?.format?.name, 'TopicSelectionNeedAdjudicationRecommendationPacket_v1');
  assert.equal(body.text?.format?.schema?.properties?.schema_version?.const, undefined);
  assert.deepEqual(body.text?.format?.schema?.properties?.schema_version?.enum, [
    'TopicSelectionNeedAdjudicationRecommendationPacket@v1',
  ]);
  assert.equal(body.text?.format?.schema?.properties?.schema_version?.type, 'string');
});

test('LLM gateway falls back to curl for OpenAI fetch connection failures without leaking auth in args', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pea-openai-curl-fallback-'));
  const fakeCurlPath = join(tempDir, 'curl');
  const recordPath = join(tempDir, 'record.json');
  const originalPath = process.env.PATH;
  const originalFetch = globalThis.fetch;
  await writeFile(fakeCurlPath, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const configPath = args[args.indexOf('--config') + 1];
const config = configPath ? fs.readFileSync(configPath, 'utf8') : '';
let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { body += chunk; });
process.stdin.on('end', () => {
  fs.writeFileSync(process.env.PEA_CURL_FAKE_RECORD, JSON.stringify({
    args,
    config_has_auth: config.includes('Authorization: Bearer sk-test'),
    body_has_model: body.includes('"model":"gpt-test"')
  }));
  process.stdout.write(JSON.stringify({ output_text: JSON.stringify({ ok: true }) }));
  process.stdout.write('\\n__PEA_CURL_STATUS__:200');
});
`, { mode: 0o700 });

  try {
    process.env.PATH = `${tempDir}:${originalPath ?? ''}`;
    process.env.PEA_CURL_FAKE_RECORD = recordPath;
    globalThis.fetch = (async () => {
      const error = new TypeError('fetch failed');
      error.cause = { code: 'UND_ERR_CONNECT_TIMEOUT' };
      throw error;
    }) as typeof fetch;

    const gateway = new BackendLlmGateway({
      settingsService: createSettingsService(),
    });
    const response = await gateway.createStructuredOutput<{ ok: boolean }>({
      executionContext: { feature: 'test', operation: 'openai-curl-fallback' },
      model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
      prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
      messages: [{ role: 'user', content: 'return ok' }],
      schemaName: 'ok_schema',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['ok'],
        properties: { ok: { type: 'boolean' } },
      },
    });

    const record = JSON.parse(await readFile(recordPath, 'utf8')) as {
      args: string[];
      config_has_auth: boolean;
      body_has_model: boolean;
    };
    assert.equal(response.parsed.ok, true);
    assert.equal(record.config_has_auth, true);
    assert.equal(record.body_has_model, true);
    assert.equal(record.args.some((arg) => arg.includes('sk-test')), false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.PATH = originalPath;
    delete process.env.PEA_CURL_FAKE_RECORD;
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('LLM gateway parses embedding vectors from OpenAI data shape', async () => {
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => new Response(JSON.stringify({
      data: [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] },
      ],
      usage: { prompt_tokens: 2, total_tokens: 2 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch,
  });

  const response = await gateway.createEmbeddings({
    executionContext: { feature: 'test', operation: 'embedding' },
    model: { providerId: 'openai', modelId: 'text-embedding-test', profileId: 'embedding-test' },
    input: ['a', 'b'],
  });

  assert.deepEqual(response.vectors, [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]);
  assert.equal(response.telemetry.request_count, 1);
  assert.equal(response.telemetry.embedding_input_tokens, 2);
  assert.equal(response.telemetry.total_tokens, 2);
});

test('LLM gateway maps DashScope chat completion JSON output and telemetry', async () => {
  const calls: Array<{ input: string; body: Record<string, unknown> }> = [];
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (input, init) => {
      calls.push({
        input: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return new Response(JSON.stringify({
        choices: [
          { message: { content: JSON.stringify({ ok: true }) } },
        ],
        usage: { prompt_tokens: 13, completion_tokens: 5, total_tokens: 18 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'dashscope-structured' },
    model: { providerId: 'dashscope', modelId: 'qwen3.6-plus', profileId: 'default' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    normalizedParams: {
      creativity: 'medium',
      reasoning_depth: 'none',
      output_budget: 'medium',
      structured_output_required: true,
      output_format: 'json_schema',
    },
    providerOverrides: { enable_thinking: false },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.provider_id, 'dashscope');
  assert.equal(response.telemetry.model_id, 'qwen3.6-plus');
  assert.equal(response.telemetry.input_tokens, 13);
  assert.equal(response.telemetry.output_tokens, 5);
  assert.equal(calls[0]?.input, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
  assert.equal(calls[0]?.body.model, 'qwen3.6-plus');
  assert.deepEqual(calls[0]?.body.response_format, { type: 'json_object' });
  assert.deepEqual(calls[0]?.body.extra_body, { enable_thinking: false });
  const messages = calls[0]?.body.messages as Array<{ role: string; content: string }>;
  assert.equal(messages[0]?.role, 'system');
  assert.match(messages[0]?.content ?? '', /\bJSON\b/);
  assert.match(messages[0]?.content ?? '', /schema_name: ok_schema/);
  assert.match(messages[0]?.content ?? '', /"ok"/);
  assert.equal(messages[1]?.content, 'return ok');
});

test('LLM gateway maps DeepSeek V4 thinking chat completion JSON output and telemetry', async () => {
  const calls: Array<{ input: string; body: Record<string, unknown> }> = [];
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (input, init) => {
      calls.push({
        input: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              reasoning_content: 'internal reasoning must not be parsed as structured output',
              content: JSON.stringify({ ok: true }),
            },
          },
        ],
        usage: { prompt_tokens: 17, completion_tokens: 9, total_tokens: 26 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'deepseek-structured' },
    model: { providerId: 'deepseek', modelId: 'deepseek-v4-pro', profileId: 'debate-worker' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    normalizedParams: {
      creativity: 'medium',
      reasoning_depth: 'high',
      output_budget: 'large',
      structured_output_required: true,
      output_format: 'json_schema',
    },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.provider_id, 'deepseek');
  assert.equal(response.telemetry.model_id, 'deepseek-v4-pro');
  assert.equal(response.telemetry.input_tokens, 17);
  assert.equal(response.telemetry.output_tokens, 9);
  assert.equal(calls[0]?.input, 'https://api.deepseek.com/chat/completions');
  assert.equal(calls[0]?.body.model, 'deepseek-v4-pro');
  assert.deepEqual(calls[0]?.body.response_format, { type: 'json_object' });
  assert.deepEqual(calls[0]?.body.thinking, { type: 'enabled' });
  assert.equal(calls[0]?.body.reasoning_effort, 'high');
  assert.equal(calls[0]?.body.extra_body, undefined);
  const messages = calls[0]?.body.messages as Array<{ role: string; content: string }>;
  assert.equal(messages[0]?.role, 'system');
  assert.match(messages[0]?.content ?? '', /schema_name: ok_schema/);
  assert.equal(messages[1]?.content, 'return ok');
});

test('LLM gateway retries rate limits and records canonical telemetry', async () => {
  let callCount = 0;
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: { message: 'slow down' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '0.001' },
        });
      }
      return new Response(JSON.stringify({ output_text: JSON.stringify({ ok: true }) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'retry' },
    model: { providerId: 'openai', modelId: 'gpt-test' },
    prompt: { promptTemplateId: 'retry-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    policy: { maxRetries: 1, timeoutMs: 1_000 },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.request_count, 2);
  assert.equal(response.telemetry.retry_count, 1);
  assert.equal(response.telemetry.rate_limit_count, 1);
});

test('LLM gateway honors provider retry budgets above three attempts', async () => {
  let callCount = 0;
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => {
      callCount += 1;
      if (callCount <= 4) {
        return new Response(JSON.stringify({ error: { message: 'transient rate limit' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '0.001' },
        });
      }
      return new Response(JSON.stringify({ output_text: JSON.stringify({ ok: true }) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'extended-retry' },
    model: { providerId: 'openai', modelId: 'gpt-test' },
    prompt: { promptTemplateId: 'extended-retry-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    policy: { maxRetries: 4, timeoutMs: 1_000 },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.request_count, 5);
  assert.equal(response.telemetry.retry_count, 4);
  assert.equal(response.telemetry.rate_limit_count, 4);
});

test('LLM gateway retries empty 404 provider responses as transient failures', async () => {
  let callCount = 0;
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response('', { status: 404 });
      }
      return new Response(JSON.stringify({ output_text: JSON.stringify({ ok: true }) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const response = await gateway.createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'empty-404' },
    model: { providerId: 'openai', modelId: 'gpt-test' },
    prompt: { promptTemplateId: 'empty-404-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'return ok' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    policy: { maxRetries: 1, timeoutMs: 1_000 },
  });

  assert.equal(response.parsed.ok, true);
  assert.equal(response.telemetry.request_count, 2);
  assert.equal(response.telemetry.retry_count, 1);
});

test('LLM gateway maps timeout failures', async () => {
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as typeof fetch,
  });

  await assert.rejects(
    () => gateway.createEmbeddings({
      executionContext: { feature: 'test', operation: 'timeout' },
      model: { providerId: 'openai', modelId: 'text-embedding-test' },
      input: 'query',
      policy: { timeoutMs: 1, maxRetries: 0 },
    }),
    (error) => {
      assert.ok(error instanceof LlmGatewayError);
      assert.equal(error.code, 'TimeoutError');
      assert.equal(error.telemetry?.timeout_count, 1);
      return true;
    },
  );
});

test('rejects unregistered topic-selection prompt template before any provider call', async () => {
  let fetchCount = 0;
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => {
      fetchCount += 1;
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch,
  });

  await assert.rejects(
    () => gateway.createStructuredOutput({
      executionContext: { feature: 'test', operation: 'structured' },
      model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
      prompt: { promptTemplateId: 'topic-selection-not-a-registered-template', version: '1' },
      messages: [{ role: 'user', content: 'x' }],
      schemaName: 'ok_schema',
      schema: { type: 'object', additionalProperties: false, properties: {} },
    }),
    (error: unknown) =>
      error instanceof AppError
      && /not registered in topic-selection-llm-invocation-registry/.test(error.message),
  );
  assert.equal(fetchCount, 0);
});

test('computes telemetry cost_usd from the pricing table and degrades to null when unpriced', async () => {
  const makeGateway = (pricingTable: LlmPricingTable) =>
    new BackendLlmGateway({
      settingsService: createSettingsService(),
      pricingTable,
      fetchImpl: (async () => new Response(JSON.stringify({
        output_text: JSON.stringify({ ok: true }),
        usage: { input_tokens: 1_000_000, output_tokens: 500_000, total_tokens: 1_500_000 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch,
    });

  const priced = await makeGateway({
    openai: { 'gpt-test': { input_usd_per_mtok: 2, output_usd_per_mtok: 10 } },
  }).createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'structured' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'x' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } },
  });
  assert.equal(priced.telemetry.cost_usd, 7);

  const unpriced = await makeGateway({}).createStructuredOutput<{ ok: boolean }>({
    executionContext: { feature: 'test', operation: 'structured' },
    model: { providerId: 'openai', modelId: 'gpt-test', profileId: 'test-profile' },
    prompt: { promptTemplateId: 'test-prompt', version: 'v1' },
    messages: [{ role: 'user', content: 'x' }],
    schemaName: 'ok_schema',
    schema: { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } },
  });
  assert.equal(unpriced.telemetry.cost_usd, null);
});

test('LLM gateway computes input-only cost for embedding models (T-130 W-04)', async () => {
  const gateway = new BackendLlmGateway({
    settingsService: createSettingsService(),
    fetchImpl: (async () => new Response(JSON.stringify({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
      usage: { prompt_tokens: 1000000, total_tokens: 1000000 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch,
  });

  const response = await gateway.createEmbeddings({
    executionContext: { feature: 'test', operation: 'embedding-cost' },
    model: { providerId: 'openai', modelId: 'text-embedding-3-large', profileId: 'embedding-test' },
    input: ['a'],
  });

  assert.equal(response.telemetry.embedding_input_tokens, 1000000);
  // input-only billing: 1M tokens * $0.13/M, no completion tokens required.
  assert.equal(response.telemetry.cost_usd, 0.13);
});
