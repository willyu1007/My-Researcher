import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_POSTGRES_IMAGE,
  assertDurableSummaryRedaction,
  assertExcludedWriteTablesZero,
  buildMixedTupleInsertSql,
  buildPreM7ProviderControlSeedSql,
  buildProviderControlSnapshotSql,
  buildStaticBoundaryAssertions,
  compareProviderControlSnapshots,
  durableCommandEvidence,
  evaluateM7Checks,
  inspectM7CapabilityBoundary,
  inspectM7Migration,
  inspectDuplicateProviderImplementations,
  normalizeSummaryPaths,
  parseArgs,
  parseProviderControlSnapshot,
  selectPreM7MigrationDirectories,
} from './experiment-foundation-m7-provider-gate.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('M7 gate accepts only a safe run id and the reviewed pinned image', () => {
  assert.deepEqual(parseArgs(['--run-id', 'm7-offline-1']), {
    runId: 'm7-offline-1',
    importedRunId: 'm7-offline-1',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.equal(
    parseArgs(['--run-id', 'composite-x', '--imported-run-id', 'm7-offline-1']).importedRunId,
    'm7-offline-1',
  );
  assert.throws(() => parseArgs(['--run-id', 'x', '--imported-run-id', '../escape']));
  assert.throws(() => parseArgs(['--run-id', '../escape']));
  assert.throws(() => parseArgs([
    '--run-id', 'm7', '--postgres-image', 'postgres:latest',
  ]));
});

test('M7 gate freezes the reviewed migration and default-off composition boundaries', async () => {
  const [migration, envContract, appSource] = await Promise.all([
    fs.readFile(path.join(
      REPO_ROOT,
      'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
    ), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
  ]);
  const census = inspectM7Migration(migration);
  assert.equal(census.created_tables.length, 6);
  assert.equal(census.foreign_key_count, 7);
  assert.equal(census.data_mutation_statement_count, 0);
  assert.deepEqual(inspectM7CapabilityBoundary(envContract, appSource), {
    intake_default: false,
    control_drain_default: false,
    intake_requires_control_drain: true,
    live_transport_construction_in_app: false,
  });
});

test('M7 gate rejects DML, cross-domain FKs, and live transport construction', async () => {
  const migration = await fs.readFile(path.join(
    REPO_ROOT,
    'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
  ), 'utf8');
  const envContract = await fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8');
  const appSource = await fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8');
  assert.throws(() => inspectM7Migration(`${migration}\nUPDATE "Legacy" SET "x"=1;`));
  assert.throws(() => inspectM7Migration(migration.replace(
    'REFERENCES "ExperimentFoundationExecutionBundleIdentityV2"("id")',
    'REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("id")',
  )));
  assert.throws(() => inspectM7CapabilityBoundary(
    envContract,
    `${appSource}\nnew ExperimentFoundationAliyunRealProviderTransportV2({});`,
  ));
});

test('M7 gate builds a fail-closed lexical pre-M7 migration plan', () => {
  assert.deepEqual(selectPreM7MigrationDirectories([
    'migration_lock.toml',
    '20260727170000_enable_execution_bundle_schema_v2',
    '20260723100000_add_experiment_foundation_m7_real_provider_v2',
    '20260714160000_harden_experiment_foundation_pack_b_v2',
    '20260713210000_add_experiment_foundation_pack_b_provider_control_v2',
  ]), [
    '20260713210000_add_experiment_foundation_pack_b_provider_control_v2',
    '20260714160000_harden_experiment_foundation_pack_b_v2',
  ]);
  assert.throws(() => selectPreM7MigrationDirectories([
    '20260713210000_add_experiment_foundation_pack_b_provider_control_v2',
  ]));
  assert.deepEqual(selectPreM7MigrationDirectories([
    '20260723100000_add_experiment_foundation_m7_real_provider_v2',
    '20260724100000_later_migration',
  ]), []);
});

test('M7 gate builds the exact six-table pre-M7 seed and negative tuple SQL', () => {
  const seed = buildPreM7ProviderControlSeedSql();
  const tables = [
    'ExperimentFoundationProviderPayloadV2',
    'ExperimentFoundationExecutionAttemptV2',
    'ExperimentFoundationExecutionAttemptEventV2',
    'ExperimentFoundationProviderCommandV2',
    'ExperimentFoundationCollectionAttemptV2',
    'ExperimentFoundationProvisionalOutputV2',
  ];
  assert.equal((seed.match(/INSERT INTO/gu) ?? []).length, 6);
  for (const table of tables) assert.match(seed, new RegExp(`INSERT INTO "${table}"`, 'u'));
  assert.match(seed, /SET LOCAL session_replication_role = replica/u);
  assert.match(seed, /SET LOCAL session_replication_role = origin/u);
  assert.match(seed, /FakeAliyunPaiDlcSubmitPayload@v1/u);
  assert.match(seed, /deterministic_fake_aliyun_pai_dlc@v1/u);
  assert.match(seed, /'simulation', 'non_production_fake_provider'/u);
  assert.match(seed, /"simulationProfileVersion"/u);
  assert.match(seed, /'simulation_succeeded'/u);
  assert.equal(
    [...seed.matchAll(/'sha256:([^']+)'/gu)]
      .every((match) => /^[0-9a-f]{64}$/u.test(match[1])),
    true,
  );

  const mixed = buildMixedTupleInsertSql();
  assert.match(mixed, /"providerProfileVersion"/u);
  assert.match(mixed, /'simulation', 'real_provider'/u);
  assert.doesNotMatch(mixed, /"simulationProfileVersion"/u);
});

test('M7 gate snapshots canonical all-column rows across the provider-profile rename', () => {
  const beforeSql = buildProviderControlSnapshotSql('simulationProfileVersion');
  const afterSql = buildProviderControlSnapshotSql('providerProfileVersion');
  assert.match(beforeSql, /to_jsonb\(row_value\)/u);
  assert.match(beforeSql, /"simulationProfileVersion"/u);
  assert.match(afterSql, /"providerProfileVersion"/u);
  assert.throws(() => buildProviderControlSnapshotSql('unreviewedColumn'));

  const snapshot = {
    ExperimentFoundationProviderPayloadV2: [{
      id: 'payload-1',
      payloadSchemaVersion: 'FakeAliyunPaiDlcSubmitPayload@v1',
      adapterIdentity: 'deterministic_fake_aliyun_pai_dlc@v1',
      executionMode: 'simulation',
      provenance: 'non_production_fake_provider',
      providerProfileVersion: 'v1',
      redactedManifestJson: { b: 2, a: 1 },
    }],
    ExperimentFoundationExecutionAttemptV2: [{
      id: 'attempt-1',
      executionMode: 'simulation',
      provenance: 'non_production_fake_provider',
    }],
    ExperimentFoundationExecutionAttemptEventV2: [{ id: 'event-1' }],
    ExperimentFoundationProviderCommandV2: [{ id: 'command-1' }],
    ExperimentFoundationCollectionAttemptV2: [{ id: 'collection-1' }],
    ExperimentFoundationProvisionalOutputV2: [{ id: 'output-1' }],
  };
  const before = parseProviderControlSnapshot(JSON.stringify(snapshot));
  const reordered = {
    ExperimentFoundationProvisionalOutputV2:
      snapshot.ExperimentFoundationProvisionalOutputV2,
    ExperimentFoundationCollectionAttemptV2:
      snapshot.ExperimentFoundationCollectionAttemptV2,
    ExperimentFoundationProviderCommandV2:
      snapshot.ExperimentFoundationProviderCommandV2,
    ExperimentFoundationExecutionAttemptEventV2:
      snapshot.ExperimentFoundationExecutionAttemptEventV2,
    ExperimentFoundationExecutionAttemptV2:
      snapshot.ExperimentFoundationExecutionAttemptV2,
    ExperimentFoundationProviderPayloadV2: [{
      ...snapshot.ExperimentFoundationProviderPayloadV2[0],
      redactedManifestJson: { a: 1, b: 2 },
    }],
  };
  const after = parseProviderControlSnapshot(JSON.stringify(reordered));
  assert.deepEqual(compareProviderControlSnapshots(before, after), {
    semantic_digest_preserved: true,
    identities_preserved: true,
    row_counts_exact: true,
    provider_profile_version_preserved: true,
    old_tuple_rows_readable: true,
  });
  const changed = parseProviderControlSnapshot(JSON.stringify({
    ...snapshot,
    ExperimentFoundationProviderCommandV2: [{ id: 'command-1', commandState: 'pending' }],
  }));
  assert.equal(compareProviderControlSnapshots(before, changed).semantic_digest_preserved, false);
  assert.throws(() => parseProviderControlSnapshot('{}'));
});

test('M7 gate measures duplicate provider implementations against the exact allowlist', () => {
  const inspection = inspectDuplicateProviderImplementations([
    'apps/backend/src/services/experiment-foundation-aliyun-real-provider-v2-transport.ts',
    'apps/backend/src/services/experiment-foundation-real-provider-payload-v2-service.ts',
    'apps/backend/src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.ts',
    'apps/backend/src/services/transport.unit.test.ts',
    'apps/backend/scripts/run-experiment-foundation-m7-l1-live-window.ts',
    'packages/shared/src/research-lifecycle/provider-contracts.ts',
    'apps/backend/src/services/unapproved-provider.ts',
  ].join('\n'));
  assert.deepEqual(inspection.non_allowlisted_files, [
    'apps/backend/src/services/unapproved-provider.ts',
  ]);
  assert.equal(inspection.duplicate_provider_implementation_count, 1);
  assert.throws(() => inspectDuplicateProviderImplementations('/Volumes/work/source.ts'));
});

test('M7 gate keeps transcript hashes and TAP metadata but rejects durable raw tails and paths', () => {
  const command = durableCommandEvidence({
    exit_code: 0,
    duration_ms: 12,
    stdout: 'full stdout',
    stderr: 'full stderr',
  }, 'passed');
  assert.deepEqual(Object.keys(command), [
    'status',
    'exit_code',
    'duration_ms',
    'transcript_sha256',
  ]);
  assert.match(command.transcript_sha256, /^[0-9a-f]{64}$/u);

  const normalized = normalizeSummaryPaths({
    source: '/Volumes/DataDisk/Project/My-Researcher/apps/backend/src/app.ts',
    temporary: '/tmp/m7/raw.txt',
  }, '/Volumes/DataDisk/Project/My-Researcher');
  assert.deepEqual(normalized, {
    source: 'apps/backend/src/app.ts',
    temporary: '[machine-path]',
  });
  assert.deepEqual(assertDurableSummaryRedaction(normalized), {
    output_tail_absent: true,
    absolute_machine_paths_absent: true,
  });
  assert.throws(() => assertDurableSummaryRedaction({ output_tail: 'raw' }));
  assert.throws(() => assertDurableSummaryRedaction({ nested_output_tail: 'raw' }));
  assert.throws(() => assertDurableSummaryRedaction({ path: '/Volumes/Data/repo' }));
  assert.throws(() => assertDurableSummaryRedaction({ path: '/Users/example/repo' }));
  assert.throws(() => assertDurableSummaryRedaction({ path: '/Library/example/repo' }));
});

test('M7 gate asserts every excluded write table is present and exactly zero', () => {
  const zeroCounts = {
    ExperimentFoundationExternalTrainingJob: 0,
    ExperimentFoundationRecord: 0,
    ExperimentFoundationExperimentResultV2: 0,
    ExperimentFoundationEvidenceCandidateV2: 0,
    PaperImplementationRunEvidenceUnit: 0,
    PaperImplementationRunEvidenceUnitV2: 0,
  };
  assert.deepEqual(assertExcludedWriteTablesZero(zeroCounts), {
    excluded_write_table_counts: zeroCounts,
    excluded_write_tables_zero: true,
  });
  assert.throws(() => assertExcludedWriteTablesZero({
    ...zeroCounts,
    ExperimentFoundationExperimentResultV2: 1,
  }));
  // A census that silently misses a listed table (the pre-QR bare-label bug)
  // must fail, not pass vacuously.
  assert.throws(() => assertExcludedWriteTablesZero({
    ExperimentFoundationExternalTrainingJob: 0,
  }));
  assert.throws(() => assertExcludedWriteTablesZero({}));
});

const BACKEND_TEST_FILES = [
  'src/services/experiment-v2-integration-spine.unit.test.ts',
  'src/services/experiment-foundation-real-provider-intake-v2-service.unit.test.ts',
  'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts',
  'src/services/experiment-foundation-v2-provider-payload-service.unit.test.ts',
  'src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.unit.test.ts',
  'src/routes/experiment-foundation-real-provider-v2-routes.integration.test.ts',
];
const SHARED_TEST_FILES = [
  'src/research-lifecycle/experiment-foundation-execution-v2-contracts.schema.test.ts',
  'src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts',
];
const RELATIONAL_TEST_FILES = [
  'src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-relational.integration.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts',
];

function passingTestEvidence(testFiles) {
  return {
    status: 'passed',
    exit_code: 0,
    duration_ms: 1,
    transcript_sha256: 'a'.repeat(64),
    test_files: testFiles,
    tap: { tests: 10, passed: 10, failed: 0, skipped: 0 },
  };
}

function passingPredicateSummary() {
  const environmentIsolation = {
    policy: 'explicit_allowlist@v1',
    exposed_sensitive_keys: [],
    existing_database_url_present_but_ignored: true,
  };
  const capabilities = {
    intake_default: false,
    control_drain_default: false,
    intake_requires_control_drain: true,
    live_transport_construction_in_app: false,
  };
  const backend = passingTestEvidence(BACKEND_TEST_FILES);
  return {
    environment_isolation: environmentIsolation,
    capabilities,
    migration: { exact_simulation_real_tuple_present: true },
    migration_row_preservation: {
      status: 'passed',
      migration_succeeded: true,
      semantic_digest_preserved: true,
      identities_preserved: true,
      row_counts_exact: true,
      seeded_total_row_count: 6,
      provider_profile_version_preserved: true,
      old_tuple_rows_readable: true,
      mixed_tuple_insert_rejected: true,
      mixed_tuple_rejected_by_constraint: 'ef_provider_payload_exact_tuple_check',
      legacy_column_reference_rejected: true,
      legacy_simulation_profile_column_absent: true,
    },
    schema_census: {
      exact_tuple_checks_present: true,
      provider_profile_column_present: true,
      legacy_simulation_profile_column_present: false,
      excluded_write_tables_zero: true,
      excluded_write_table_counts: {
        ExperimentFoundationExternalTrainingJob: 0,
        ExperimentFoundationRecord: 0,
        ExperimentFoundationExperimentResultV2: 0,
        ExperimentFoundationEvidenceCandidateV2: 0,
        PaperImplementationRunEvidenceUnit: 0,
        PaperImplementationRunEvidenceUnitV2: 0,
      },
    },
    tests: {
      backend,
      shared: passingTestEvidence(SHARED_TEST_FILES),
      relational: passingTestEvidence(RELATIONAL_TEST_FILES),
    },
    static_boundary_assertions: buildStaticBoundaryAssertions(
      environmentIsolation,
      capabilities,
      backend,
    ),
    redaction: { summary_self_check_passed: true },
    handoff: {
      ownership_boundary_present: true,
      verdict_run_id_imported: true,
      duplicate_provider_implementation_count: 0,
      non_allowlisted_files: [],
    },
  };
}

test('M7 gate evaluates every M7 ID over named concrete fields', () => {
  const summary = passingPredicateSummary();
  const checks = evaluateM7Checks(summary);
  assert.deepEqual(Object.keys(checks), Array.from({ length: 15 }, (_, index) => (
    `M7-${String(index + 1).padStart(2, '0')}`
  )));
  assert.equal(Object.values(checks).every((check) => check.status === 'passed'), true);
  assert.equal(
    checks['M7-01'].evidence.includes(
      'migration_row_preservation.semantic_digest_preserved === true',
    ),
    true,
  );
  assert.equal(
    checks['M7-11'].evidence.includes(
      'schema_census.excluded_write_table_counts.ExperimentFoundationExperimentResultV2 === 0',
    ),
    true,
  );
  assert.equal(
    checks['M7-13'].evidence.includes(
      'static_boundary_assertions.fake_client_counters.test_files_executed_and_passed === true',
    ),
    true,
  );
});

test('M7 predicates preserve blocked-vs-failed semantics and fail closed', () => {
  const blocked = passingPredicateSummary();
  blocked.handoff.verdict_run_id_imported = false;
  assert.equal(evaluateM7Checks(blocked)['M7-15'].status, 'blocked');

  const duplicate = passingPredicateSummary();
  duplicate.handoff.duplicate_provider_implementation_count = 1;
  assert.equal(evaluateM7Checks(duplicate)['M7-15'].status, 'failed');

  const skipped = passingPredicateSummary();
  skipped.tests.backend.tap.skipped = 1;
  const checks = evaluateM7Checks(skipped);
  assert.equal(checks['M7-02'].status, 'failed');
  assert.equal(checks['M7-06'].status, 'failed');

  const changedRows = passingPredicateSummary();
  changedRows.migration_row_preservation.semantic_digest_preserved = false;
  assert.equal(evaluateM7Checks(changedRows)['M7-01'].status, 'failed');
});
