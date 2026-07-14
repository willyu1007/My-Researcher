import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EXPECTED_APPLICATION_TABLES,
  applicationTableSetDigest,
  buildDurableAppSmoke,
  buildDurableLocalGateSummary,
  assertEvidenceIdentity,
  parseArgs,
} from './experiment-foundation-packb-publish-local-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('named-local app smoke explicitly disables every background work path', async () => {
  const source = await fs.readFile(path.join(
    REPO_ROOT,
    'apps/backend/scripts/run-experiment-foundation-packb-local-app-smoke.ts',
  ), 'utf8');
  assert.match(source, /backgroundWorkEnabled:\s*false/);
  assert.match(source, /background_work_enabled:\s*false/);
  assert.match(source, /FROM pg_catalog\.pg_class/);
  assert.match(source, /application_table_snapshots_before:\s*before/);
  assert.doesNotMatch(source, /measured_table_count:\s*48/);
  assert.doesNotMatch(source, /jsonb_agg\s*\(/i);
  assert.match(source, /SET TRANSACTION READ ONLY/);
  assert.match(source, /SET LOCAL statement_timeout/);
  assert.match(source, /DECLARE .* NO SCROLL CURSOR FOR/s);
  assert.match(source, /FETCH FORWARD \$\{TABLE_CENSUS_FETCH_ROW_LIMIT\}/);
  assert.match(source, /lengthPrefix\.writeBigUInt64BE/);
  assert.match(source, /readApplicationPrimaryKeyColumns/);
  assert.match(
    source,
    /import \{\s+sha256File,\s+writeJsonAtomic,\s+\} from '\.\.\/\.\.\/\.\.\/\.ai\/scripts\/lib\/experiment-v2-evidence\.mjs'/,
  );
  assert.doesNotMatch(source, /async function writeJsonAtomic/);
  assert.doesNotMatch(source, /ORDER BY to_jsonb\(table_row\)/);
});

test('publisher accepts only temporary Pack B source artifacts', () => {
  const parsed = parseArgs([
    '--app-smoke', '.ai/.tmp/experiment-foundation-productization/run/app.json',
    '--local-gate', '.ai/.tmp/experiment-foundation-productization/run/gate.json',
  ]);
  assert.match(parsed.appSmokePath, /\.ai\/\.tmp\/experiment-foundation-productization\/run\/app\.json$/);
  assert.throws(() => parseArgs([
    '--app-smoke', '/tmp/untrusted.json',
    '--local-gate', '.ai/.tmp/experiment-foundation-productization/run/gate.json',
  ]), /temporary artifact root/);
  assert.throws(() => parseArgs([
    '--app-smoke', '.ai/.tmp/experiment-foundation-productization/run-a/app.json',
    '--local-gate', '.ai/.tmp/experiment-foundation-productization/run-b/gate.json',
  ]), /same Pack B run directory/);
});

test('durable app smoke retains measured evidence and binds provenance', () => {
  const source = validAppSmoke();
  const durable = buildDurableAppSmoke(source, { source_artifact_sha256: 'a'.repeat(64) });
  assert.equal(durable.durable_artifact_provenance.source_artifact_sha256, 'a'.repeat(64));
  assert.throws(() => buildDurableAppSmoke({
    ...source,
    measured_effects: { ...source.measured_effects, changed_table_count: 1 },
  }, {}), /prohibited effect/);
  assert.throws(() => buildDurableAppSmoke({
    ...source,
    target_fingerprint: `sha256:${'f'.repeat(64)}`,
  }, {}), /composition\/target\/redaction/);
  assert.throws(() => buildDurableAppSmoke({
    ...source,
    enabled: {
      ...source.enabled,
      simulation: { ...source.enabled.simulation, status_code: 201 },
    },
  }, {}), /probe tuple/);
});

test('durable app smoke rejects an arbitrary same-count table-name population', () => {
  const source = validAppSmoke();
  const arbitraryNames = source.measured_effects.inspected_tables.map((_, index) => (
    `ArbitraryApplicationTable${String(index).padStart(3, '0')}`
  ));
  const arbitrarySnapshots = Object.fromEntries(arbitraryNames.map((tableName, index) => [
    tableName,
    { count: 0, digest: `sha256:${String(index).padStart(64, '0')}` },
  ]));
  const arbitraryDigest = applicationTableSetDigest(arbitraryNames);
  assert.throws(() => buildDurableAppSmoke({
    ...source,
    application_table_inventory: {
      ...source.application_table_inventory,
      expected_table_set_digest: arbitraryDigest,
      observed_table_set_digest: arbitraryDigest,
    },
    measured_effects: {
      ...source.measured_effects,
      inspected_tables: arbitraryNames,
      application_table_set_digest: arbitraryDigest,
      application_table_snapshots_before: arbitrarySnapshots,
      application_table_snapshots_after: structuredClone(arbitrarySnapshots),
    },
  }, {}), /full application table inventory/);
});

test('durable app smoke rejects unbounded or unreviewed census mechanics', () => {
  const source = validAppSmoke();
  for (const drift of [
    { row_digest_profile: 'sha256-whole-json-array@v1' },
    { census_transport: 'jsonb-aggregate@v1' },
    { ordering_key_profile: 'row-json-sort@v1' },
    { fetch_row_limit: 65 },
    { statement_timeout_ms: 0 },
    { lock_timeout_ms: 0 },
    { transaction_timeout_ms: 0 },
    { work_mem_kib: 0 },
  ]) {
    assert.throws(() => buildDurableAppSmoke({
      ...source,
      application_table_inventory: {
        ...source.application_table_inventory,
        ...drift,
      },
    }, {}), /full application table inventory/);
  }
});

test('durable local summary is derived only from a passed read-only gate', () => {
  const source = {
    run_id: 'run',
    status: 'passed',
    mode: 'read_only_named_local_pack_b_landing',
    failures: [],
    blockers: [],
    baseline: { baseline_id: 'snapshot' },
    database_target: {
      observed_target_fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
      target_fingerprint_matches: true,
      transaction_read_only_verified: true,
    },
    migration: {
      applied: true,
      source_digest_matches_expected: true,
      database_checksum_matches_source: true,
    },
    cleanup_migration: {
      applied: true,
      source_digest_matches_expected: true,
      database_checksum_matches_source: true,
    },
    foundation_cleanup_migration: {
      applied: true,
      source_digest_matches_expected: true,
      database_checksum_matches_source: true,
    },
    event_storage_hardening_migration: {
      applied: true,
      source_digest_matches_expected: true,
      database_checksum_matches_source: true,
    },
    schema: {
      table_population: {
        pack_a: { actual_count: 34, expected_count: 34, exact: true },
        pack_b: { actual_count: 6, expected_count: 6, exact: true },
        approved_pack_a_and_b: { actual_count: 40, expected_count: 40, exact: true },
      },
      pack_a_authority_rows: {
        actual_total_count: 208,
        aggregate_digest: `sha256:${'b'.repeat(64)}`,
        exact: true,
      },
      pack_b_row_census: { total_row_count: 0, all_present_and_zero: true },
      pack_b_effective_schema: { exact: true },
      foundation_storage_cleanup: { exact: true },
      event_storage_hardening: { exact: true },
      cross_domain_foreign_keys: { cross_domain_pi_fk_count: 0 },
    },
    legacy_sentinels: {
      aggregate_count: 257,
      aggregate_digest: `sha256:${'c'.repeat(64)}`,
      exact: true,
    },
    activation_config: {
      workflow_simulation: { effective: true },
      cutover: { effective: true },
    },
    prohibited_effects: {
      database_mutations: 0,
      migration_commands: 0,
      environment_mutations: 0,
      provider_calls: 0,
      external_fetch_attempts: 0,
      scientific_execution: 0,
    },
    redaction: {
      database_url_stored: false,
      database_username_stored: false,
      database_password_stored: false,
      legacy_row_payloads_stored: false,
    },
  };
  const durable = buildDurableLocalGateSummary(source, { source_artifact_sha256: 'd'.repeat(64) });
  assert.equal(durable.schema_version, 'experiment-foundation-packb-local-landing-summary@v4');
  assert.equal(durable.table_population.pack_a, '34/34');
  assert.equal(durable.table_population.foundation_storage_cleanup_exact, true);
  assert.equal(durable.table_population.event_storage_hardening_exact, true);
  assert.equal(durable.authority_baseline.legacy_rows, 257);
  assert.throws(
    () => buildDurableLocalGateSummary({ ...source, status: 'failed' }, {}),
    /passed read-only/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      event_storage_hardening_migration: {
        ...source.event_storage_hardening_migration,
        applied: false,
      },
    }, {}),
    /mandatory closure evidence/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      database_target: {
        ...source.database_target,
        observed_target_fingerprint: `sha256:${'f'.repeat(64)}`,
      },
    }, {}),
    /reviewed target/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      schema: {
        ...source.schema,
        event_storage_hardening: { exact: false },
      },
    }, {}),
    /mandatory closure evidence/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      cleanup_migration: { ...source.cleanup_migration, applied: false },
    }, {}),
    /mandatory closure evidence/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      foundation_cleanup_migration: {
        ...source.foundation_cleanup_migration,
        applied: false,
      },
    }, {}),
    /mandatory closure evidence/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      schema: {
        ...source.schema,
        foundation_storage_cleanup: { exact: false },
      },
    }, {}),
    /mandatory closure evidence/,
  );
  assert.throws(
    () => buildDurableLocalGateSummary({
      ...source,
      schema: {
        ...source.schema,
        pack_b_effective_schema: { exact: false },
      },
    }, {}),
    /mandatory closure evidence/,
  );

  for (const prohibitedEffects of [
    undefined,
    {
      database_mutations: 0,
      migration_commands: 0,
      environment_mutations: 0,
      provider_calls: 0,
      external_fetch_attempts: 0,
    },
    { ...source.prohibited_effects, unexpected_effect: 0 },
    { ...source.prohibited_effects, provider_calls: 1 },
    { ...source.prohibited_effects, provider_calls: '0' },
  ]) {
    assert.throws(
      () => buildDurableLocalGateSummary({
        ...source,
        prohibited_effects: prohibitedEffects,
      }, {}),
      /mandatory closure evidence/,
    );
  }

  for (const redaction of [
    undefined,
    {
      database_url_stored: false,
      database_username_stored: false,
      database_password_stored: false,
    },
    { ...source.redaction, unexpected_redaction_flag: false },
    { ...source.redaction, database_url_stored: true },
    { ...source.redaction, database_url_stored: 0 },
  ]) {
    assert.throws(
      () => buildDurableLocalGateSummary({ ...source, redaction }, {}),
      /mandatory closure evidence/,
    );
  }
});

test('publisher refuses mismatched run or target identity', () => {
  const appSmoke = validAppSmoke();
  const localGate = {
    run_id: 'run',
    database_target: { observed_target_fingerprint: appSmoke.target_fingerprint },
  };
  assert.doesNotThrow(() => assertEvidenceIdentity(appSmoke, localGate));
  assert.throws(
    () => assertEvidenceIdentity({ ...appSmoke, run_id: 'other' }, localGate),
    /identity mismatch/,
  );
  assert.throws(
    () => assertEvidenceIdentity(appSmoke, {
      ...localGate,
      database_target: { observed_target_fingerprint: `sha256:${'f'.repeat(64)}` },
    }),
    /identity mismatch/,
  );
});

function validAppSmoke() {
  const applicationSnapshots = Object.fromEntries(EXPECTED_APPLICATION_TABLES.map((tableName, index) => [
    tableName,
    { count: 0, digest: `sha256:${String(index).padStart(64, '0')}` },
  ]));
  const tableSetDigest = applicationTableSetDigest(EXPECTED_APPLICATION_TABLES);
  return {
    schema_version: 'experiment-foundation-packb-local-app-smoke@v5',
    run_id: 'run',
    target_class: 'named_loopback_local_development',
    target_fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
    composition: {
      paper_implementation_repository: 'prisma',
      experiment_foundation_repository: 'prisma',
      auto_pull_scheduler_enabled: false,
      background_work_enabled: false,
    },
    network_transport: 'hard_denied_by_throwing_fetch',
    sensitive_values_stored: false,
    application_table_inventory: {
      source: 'pg_catalog.pg_class@current_schema/base_and_partitioned_tables',
      schema: 'my_researcher_dev',
      expected_table_count: EXPECTED_APPLICATION_TABLES.length,
      observed_table_count: EXPECTED_APPLICATION_TABLES.length,
      expected_table_set_digest: tableSetDigest,
      observed_table_set_digest: tableSetDigest,
      row_digest_profile: 'sha256-length-prefixed-pg-jsonb-text-primary-key-order@v2',
      census_transport: 'read-only-repeatable-read-cursor@v1',
      ordering_key_profile: 'catalog-primary-key-columns@v1',
      fetch_row_limit: 64,
      statement_timeout_ms: 30_000,
      lock_timeout_ms: 5_000,
      transaction_timeout_ms: 600_000,
      work_mem_kib: 4_096,
      exact: true,
    },
    disabled: {
      workflow_simulation_enabled: false,
      simulation: { status_code: 409, error_code: 'VERSION_CONFLICT', reason_code: 'EF_V2_WORKFLOW_SIMULATION_DISABLED' },
      legacy_mutation: { status_code: 409, error_code: 'GATE_CONSTRAINT_FAILED', reason_code: 'LEGACY_RECORD_NOT_ELIGIBLE' },
      status_read: { status_code: 404, error_code: 'NOT_FOUND', reason_code: 'EXECUTION_HEAD_ACK_REQUIRED' },
    },
    enabled: {
      workflow_simulation_enabled: true,
      simulation: { status_code: 404, error_code: 'NOT_FOUND', reason_code: 'EXECUTION_HEAD_ACK_REQUIRED' },
      legacy_mutation: { status_code: 409, error_code: 'GATE_CONSTRAINT_FAILED', reason_code: 'LEGACY_RECORD_NOT_ELIGIBLE' },
      status_read: { status_code: 404, error_code: 'NOT_FOUND', reason_code: 'EXECUTION_HEAD_ACK_REQUIRED' },
    },
    measured_effects: {
      changed_table_count: 0,
      changed_tables: [],
      measured_table_count: EXPECTED_APPLICATION_TABLES.length,
      inspected_tables: [...EXPECTED_APPLICATION_TABLES],
      application_table_set_digest: tableSetDigest,
      external_fetch_attempts: 0,
      provider_command_row_delta: 0,
      background_drain_guard_counts: {
        PaperImplementationExperimentIntegrationOutboxV2: 0,
        ExperimentFoundationIntegrationOutboxV2: 0,
      },
      application_table_snapshots_before: applicationSnapshots,
      application_table_snapshots_after: structuredClone(applicationSnapshots),
    },
  };
}
