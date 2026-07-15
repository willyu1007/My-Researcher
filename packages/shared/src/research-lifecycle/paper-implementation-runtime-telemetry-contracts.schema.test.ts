import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as telemetryContracts from './paper-implementation-runtime-telemetry-contracts.js';
import * as researchLifecycleContracts from './index.js';

type JsonSchema = Readonly<Record<string, unknown>>;

async function validateWithSchema(schema: JsonSchema, payload: object): Promise<number> {
  const app = Fastify({
    ajv: {
      customOptions: {
        allErrors: true,
        removeAdditional: false,
      },
    },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({ method: 'POST', url: '/validate', payload });
  await app.close();
  return response.statusCode;
}

function validRecord(): Record<string, unknown> {
  return {
    schema_version: telemetryContracts.PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
    record_id: 'pi_runtime_telemetry_001',
    created_at: '2026-07-15T00:00:00.000Z',
    implementation_project_id: 'impl_project_001',
    run_id: 'pi_route_architecture_runtime_run_001',
    slot_id: 'route_architecture',
    role_slot_id: 'route_architecture.route_candidates',
    call_index: 1,
    execution_mode: 'provider_llm',
    provider: 'openai',
    model_option: 'gpt-strong',
    latency_ms: 1234.5,
    prompt_tokens: 4200,
    completion_tokens: 900,
    total_tokens: 5100,
    cost_usd: 0.0123,
    outcome: 'passed',
    retry_kind: null,
    compression_applied: false,
    shadow_tier: 'standard',
  };
}

test('valid runtime telemetry record passes schema validation', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    validRecord(),
  );
  assert.equal(status, 200);
});

test('non-provider record with nulled provider fields passes', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    {
      ...validRecord(),
      execution_mode: 'mocked_llm',
      provider: null,
      model_option: null,
      latency_ms: null,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      cost_usd: null,
      role_slot_id: null,
      shadow_tier: null,
    },
  );
  assert.equal(status, 200);
});

test('retried record carries a retry_kind', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    { ...validRecord(), outcome: 'retried', retry_kind: 'semantic' },
  );
  assert.equal(status, 200);
});

test('missing required field is rejected', async () => {
  const record = validRecord();
  delete record.call_index;
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    record,
  );
  assert.equal(status, 400);
});

test('unknown outcome is rejected', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    { ...validRecord(), outcome: 'skipped' },
  );
  assert.equal(status, 400);
});

test('non-positive call_index is rejected', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    { ...validRecord(), call_index: 0 },
  );
  assert.equal(status, 400);
});

test('negative cost_usd is rejected', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    { ...validRecord(), cost_usd: -0.01 },
  );
  assert.equal(status, 400);
});

test('unknown shadow_tier is rejected', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    { ...validRecord(), shadow_tier: 'exhaustive' },
  );
  assert.equal(status, 400);
});

test('additional property is rejected', async () => {
  const status = await validateWithSchema(
    telemetryContracts.paperImplementationRuntimeTelemetryRecordSchema,
    { ...validRecord(), unexpected: true },
  );
  assert.equal(status, 400);
});

test('contract is re-exported from the research-lifecycle index', () => {
  assert.equal(
    researchLifecycleContracts.PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
    telemetryContracts.PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
  );
  assert.equal(
    typeof researchLifecycleContracts.paperImplementationRuntimeTelemetryRecordSchema,
    'object',
  );
});
