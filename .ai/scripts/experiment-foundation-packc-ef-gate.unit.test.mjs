import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_POSTGRES_IMAGE,
  PACKC_EF_CHECK_REGISTRY,
  PACKC_EF_REQUIRED_MIGRATIONS,
  assertExactSummaryKeysets,
  buildInitialSummary,
  canonicalJson,
  canonicalSummarySha256,
  inspectStaticCensus,
  parseArgs,
  updateChecks,
} from './experiment-foundation-packc-ef-gate.mjs';

test('Pack C EF gate accepts only the frozen id scheme and digest-pinned image', () => {
  assert.deepEqual(parseArgs(['--run-id', 'packc-ef-20260720-r1']), {
    gateId: 'packc-ef-20260720-r1',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.throws(() => parseArgs(['--run-id', 'packc-ef-local']), /must match/);
  assert.throws(
    () => parseArgs([
      '--run-id', 'packc-ef-20260720-r2',
      '--postgres-image', 'pgvector/pgvector:latest',
    ]),
    /digest-pinned/,
  );
});

test('Pack C EF check registry is exact and maps every check to durable evidence keys', () => {
  assert.deepEqual(PACKC_EF_CHECK_REGISTRY, [
    { id: 'PC01', evidence_refs: ['engine_unit'] },
    { id: 'PC02', evidence_refs: ['engine_unit'] },
    { id: 'PC03', evidence_refs: ['engine_unit', 'service_unit'] },
    { id: 'PC04', evidence_refs: ['engine_unit', 'service_unit'] },
    { id: 'PC05', evidence_refs: ['static_census', 'schema_unit'] },
    { id: 'PC06', evidence_refs: ['relational'] },
    { id: 'PC07', evidence_refs: ['service_unit', 'relational'] },
    { id: 'PC19-EF', evidence_refs: ['legacy_writer_unit'] },
  ]);
  assert.deepEqual(PACKC_EF_REQUIRED_MIGRATIONS, [
    '20260718224543_add_experiment_foundation_pack_c_scientific_validation_v2',
  ]);
});

test('summary publisher initializes exact evidence, zero-census and redaction keysets', () => {
  const summary = buildInitialSummary(
    'packc-ef-20260720-r3',
    DEFAULT_POSTGRES_IMAGE,
    '2026-07-20T00:00:00.000Z',
  );
  assert.doesNotThrow(() => assertExactSummaryKeysets(summary));
  assert.deepEqual(Object.values(summary.evidence), [null, null, null, null, null, null]);
  assert.deepEqual(Object.keys(summary.migrations), PACKC_EF_REQUIRED_MIGRATIONS);
  assert.ok(Object.values(summary.zero_census).every((value) => value === 0));
  assert.deepEqual(summary.redaction, {
    database_url_stored: false,
    database_password_stored: false,
    command_stdout_stored_in_summary: false,
    credential_values_loaded: false,
    output_tails_sanitized: true,
  });
  assert.throws(() => assertExactSummaryKeysets({ ...summary, extra: true }), /keyset drift/);
});

test('canonical summary SHA-256 is key-order independent and excludes its own value', () => {
  assert.equal(
    canonicalJson({ z: 1, a: [2, { b: true, a: null }] }),
    '{"a":[2,{"a":null,"b":true}],"z":1}',
  );
  const summary = buildInitialSummary('packc-ef-20260720-r4', DEFAULT_POSTGRES_IMAGE);
  const first = canonicalSummarySha256(summary);
  summary.canonical_summary_sha256 = `sha256:${'f'.repeat(64)}`;
  assert.equal(canonicalSummarySha256(summary), first);
  assert.match(first, /^sha256:[0-9a-f]{64}$/);
});

test('static census proves service-level closure and removed accept_partial request vocabulary', async () => {
  const census = await inspectStaticCensus();
  assert.deepEqual(census, {
    status: 'passed',
    closed_legacy_scientific_record_kinds: [
      'experiment_result', 'result_validation_report', 'evidence_candidate',
      'paper_experiment_sidecar',
    ],
    generic_service_guard_call_count: 4,
    collect_job_closed_before_repository_access: true,
    accept_partial_request_contract_occurrences: 0,
    route_repository_write_path_count: 0,
    scientific_prisma_writer_files: [
      'apps/backend/src/repositories/prisma/prisma-experiment-foundation-scientific-validation-v2-repository.ts',
    ],
    generic_scientific_write_path_count: 0,
    adapter_scientific_write_path_count: 0,
  });
});

test('PostgreSQL unavailability blocks relational checks and can never publish passed', () => {
  const summary = buildInitialSummary('packc-ef-20260720-r5', DEFAULT_POSTGRES_IMAGE);
  for (const key of ['engine_unit', 'service_unit', 'schema_unit', 'legacy_writer_unit', 'static_census']) {
    summary.evidence[key] = { status: 'passed' };
  }
  summary.evidence.relational = {
    status: 'blocked',
    reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  updateChecks(summary);
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.check_registry.PC06.status, 'blocked');
  assert.equal(summary.check_registry.PC07.status, 'blocked');
  assert.equal(summary.check_registry.PC01.status, 'passed');
  assert.notEqual(summary.status, 'passed');
});
