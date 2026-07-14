import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PACK_A_AND_B_V2_TABLES,
  PACK_A_LOCAL_AUTHORITY_AGGREGATE_DIGEST,
  PACK_A_LOCAL_AUTHORITY_ROW_BASELINE,
  PACK_B_ACTIVATION_TRUTH_TABLE,
  PACK_B_CLEANUP_MIGRATION_NAME,
  PACK_B_EXPECTED_LOCAL_BASELINE_MANIFEST_SHA256,
  PACK_B_EXPECTED_CLEANUP_MIGRATION_SHA256,
  PACK_B_EXPECTED_MIGRATION_SHA256,
  PACK_B_LOCAL_BASELINE_MANIFEST_PATH,
  PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE,
  PACK_B_MIGRATION_NAME,
  PACK_B_V2_TABLES,
  FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME,
  FOUNDATION_STORAGE_CLEANUP_MIGRATION_SHA256,
  EVENT_STORAGE_HARDENING_MIGRATION_NAME,
  EVENT_STORAGE_HARDENING_MIGRATION_SHA256,
  EXPERIMENT_V2_EVENT_TABLES,
  EXPERIMENT_V2_FIXED_VERSION_CHECKS,
  PACK_A_EXPECTED_FOREIGN_KEY_COUNT,
  READ_ONLY_TRANSACTION_STATEMENT,
  buildMigrationEvidence,
  buildCleanupMigrationEvidence,
  buildFoundationStorageCleanupMigrationEvidence,
  buildEventStorageHardeningMigrationEvidence,
  comparePackBTablePopulation,
  crossDomainPiForeignKeyEvidence,
  deriveStatus,
  digestAuthorityIdOrderedRows,
  evaluateAuthorityRowCensus,
  evaluateLegacySentinelBaseline,
  evaluatePackBActivationConfig,
  evaluateEffectivePackBSchema,
  evaluateFoundationStorageCleanup,
  evaluateEventStorageHardening,
  evaluateEventStorageUpgradePreflight,
  evaluatePackBRowCensus,
  parseArgs,
} from './experiment-foundation-packb-local-landing-gate.mjs';
import {
  PACK_A_V2_TABLES,
  fingerprintPackALocalTarget,
  sanitizeLocalDatabaseTarget,
} from './experiment-foundation-packa-local-landing-gate.mjs';
import { normalizePostgresIndexDefinitionSchema } from './lib/experiment-v2-evidence.mjs';

const SCRIPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'experiment-foundation-packb-local-landing-gate.mjs',
);

test('Pack B binds the exact reviewed named-local snapshot manifest', async () => {
  const manifestBytes = await fs.readFile(PACK_B_LOCAL_BASELINE_MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.baseline_kind, 'one_shot_pre_product_named_local_snapshot');
  assert.match(PACK_B_EXPECTED_LOCAL_BASELINE_MANIFEST_SHA256, /^[0-9a-f]{64}$/);
  assert.equal(
    crypto.createHash('sha256').update(manifestBytes).digest('hex'),
    PACK_B_EXPECTED_LOCAL_BASELINE_MANIFEST_SHA256,
  );
  assert.match(manifest.refresh_policy, /newly reviewed manifest/);
  assert.deepEqual(manifest.target, {
    database: 'postgres',
    schema: 'my_researcher_dev',
    host: '127.0.0.1',
    port: '5432',
    fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
  });
  const target = sanitizeLocalDatabaseTarget(
    'postgresql://operator:secret@127.0.0.1:5432/postgres?schema=my_researcher_dev',
  );
  assert.equal(target.database, manifest.target.database);
  assert.equal(target.requested_schema, manifest.target.schema);
  assert.doesNotMatch(JSON.stringify(target), /operator|secret/);
  assert.equal(
    fingerprintPackALocalTarget({
      system_identifier: '7603767034018223112',
      database_oid: '5',
      schema_oid: '16388',
    }),
    manifest.target.fingerprint,
  );
  assert.throws(
    () => sanitizeLocalDatabaseTarget(
      'postgresql://operator:secret@localhost:5432/postgres?schema=my_researcher_dev',
    ),
    /ENDPOINT_MISMATCH/,
  );
  assert.throws(
    () => sanitizeLocalDatabaseTarget(
      'postgresql://operator:secret@127.0.0.1:5432/postgres?schema=public',
    ),
    /TARGET_MISMATCH/,
  );
});

test('table census requires exact Pack A 34 plus Pack B 6 population', () => {
  assert.equal(PACK_A_V2_TABLES.length, 34);
  assert.equal(PACK_B_V2_TABLES.length, 6);
  assert.equal(PACK_A_AND_B_V2_TABLES.length, 40);

  const preapply = comparePackBTablePopulation(PACK_A_V2_TABLES);
  assert.equal(preapply.pack_a.exact, true);
  assert.equal(preapply.pack_b.actual_count, 0);
  assert.deepEqual(preapply.pack_b.missing, [...PACK_B_V2_TABLES].sort());
  assert.equal(preapply.approved_pack_a_and_b.exact, false);

  const landed = comparePackBTablePopulation(PACK_A_AND_B_V2_TABLES);
  assert.equal(landed.pack_a.exact, true);
  assert.equal(landed.pack_b.exact, true);
  assert.equal(landed.approved_pack_a_and_b.exact, true);

  const unexpected = comparePackBTablePopulation([
    ...PACK_A_AND_B_V2_TABLES,
    'UnexpectedExperimentV2',
  ]);
  assert.deepEqual(unexpected.approved_pack_a_and_b.extra, ['UnexpectedExperimentV2']);
});

test('migration evidence binds reviewed source SHA-256 to the sole applied DB checksum', () => {
  const applied = buildMigrationEvidence([{
    migration_name: PACK_B_MIGRATION_NAME,
    checksum: PACK_B_EXPECTED_MIGRATION_SHA256,
    started_at: new Date('2026-07-14T00:00:00.000Z'),
    finished_at: new Date('2026-07-14T00:00:01.000Z'),
    rolled_back_at: null,
    applied_steps_count: 1,
  }], PACK_B_EXPECTED_MIGRATION_SHA256);
  assert.equal(applied.source_digest_matches_expected, true);
  assert.equal(applied.database_checksum_matches_source, true);
  assert.equal(applied.history_shape_valid, true);
  assert.equal(applied.applied, true);

  const absent = buildMigrationEvidence([], PACK_B_EXPECTED_MIGRATION_SHA256);
  assert.equal(absent.applied, false);
  assert.equal(absent.database_checksum, null);
  assert.equal(absent.database_checksum_matches_source, null);

  const drift = buildMigrationEvidence([{
    checksum: '0'.repeat(64),
    finished_at: new Date('2026-07-14T00:00:01.000Z'),
    rolled_back_at: null,
    applied_steps_count: 1,
  }], PACK_B_EXPECTED_MIGRATION_SHA256);
  assert.equal(drift.applied, false);
  assert.equal(drift.database_checksum_matches_source, false);
});

test('cleanup migration evidence binds the reviewed source and effective schema census', () => {
  const cleanup = buildCleanupMigrationEvidence([{
    migration_name: PACK_B_CLEANUP_MIGRATION_NAME,
    checksum: PACK_B_EXPECTED_CLEANUP_MIGRATION_SHA256,
    finished_at: new Date('2026-07-14T01:00:00.000Z'),
    rolled_back_at: null,
    applied_steps_count: 1,
  }], PACK_B_EXPECTED_CLEANUP_MIGRATION_SHA256);
  assert.equal(cleanup.applied, true);
  assert.equal(cleanup.source_digest_matches_expected, true);

  const foundationCleanup = buildFoundationStorageCleanupMigrationEvidence([{
    migration_name: FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME,
    checksum: FOUNDATION_STORAGE_CLEANUP_MIGRATION_SHA256,
    finished_at: new Date('2026-07-14T02:00:00.000Z'),
    rolled_back_at: null,
    applied_steps_count: 1,
  }], FOUNDATION_STORAGE_CLEANUP_MIGRATION_SHA256);
  assert.equal(foundationCleanup.applied, true);
  assert.equal(foundationCleanup.source_digest_matches_expected, true);
  assert.deepEqual(evaluateFoundationStorageCleanup({
    foundation_placeholder_columns: [],
    foundation_placeholder_indexes: [],
  }), {
    reviewed_removed_column_count: 12,
    reviewed_removed_index_count: 5,
    remaining_placeholder_columns: [],
    remaining_placeholder_indexes: [],
    exact: true,
  });

  const foreignKeys = [
    'ef_provider_payload_run_fkey',
    'ef_provider_payload_run_cell_fkey',
    'ef_provider_payload_task_spec_fkey',
    'ef_execution_attempt_run_fkey',
    'ef_execution_attempt_run_cell_fkey',
    'ef_execution_attempt_task_spec_fkey',
    'ef_execution_attempt_payload_fkey',
    'ef_execution_attempt_head_ack_fkey',
    'ef_collection_attempt_attempt_fkey',
    'ef_collection_attempt_payload_fkey',
    'ef_provider_command_attempt_fkey',
    'ef_provider_command_collection_fkey',
    'ef_attempt_event_attempt_fkey',
    'ef_attempt_event_command_fkey',
    'ef_provisional_output_collection_fkey',
  ].map((constraint_name, index) => ({
    constraint_name,
    source_table: PACK_B_V2_TABLES[index % PACK_B_V2_TABLES.length],
    target_table: 'ExperimentFoundationRunV2',
    definition: `FOREIGN KEY fixture ${constraint_name}`,
    delete_action: 'r',
    update_action: 'r',
  }));
  const evidence = {
    foreign_keys: foreignKeys,
    pack_b_indexes: [
      {
        index_name: 'ef_execution_attempt_cycle_mode_state_idx',
        definition: 'CREATE INDEX ef_execution_attempt_cycle_mode_state_idx ON public."Fixture" USING btree (cycle, mode, state)',
      },
      ...Array.from({ length: 37 }, (_, index) => ({
        index_name: `kept-${index}`,
        definition: `CREATE INDEX kept-${index} ON public."Fixture" USING btree (id)`,
      })),
    ],
    collection_sequence_column_present: false,
    pack_b_checks: [
      { constraint_name: 'ef_collection_attempt_state_check', definition: "CHECK ('prepared')" },
      { constraint_name: 'ef_attempt_event_type_check', definition: "CHECK ('created')" },
      { constraint_name: 'ef_execution_attempt_terminal_reason_check', definition: "CHECK ('simulation_failed')" },
      ...Array.from({ length: 32 }, (_, index) => ({
        constraint_name: `reviewed_pack_b_check_${String(index).padStart(2, '0')}`,
        definition: `CHECK fixture_${index} IS NOT NULL`,
      })),
    ],
  };
  const expectedDigests = localFixtureDigests(evidence);
  assert.equal(evaluateEffectivePackBSchema(evidence, expectedDigests).exact, true);
  const namedSchemaEvidence = {
    ...evidence,
    pack_b_indexes: evidence.pack_b_indexes.map((row) => ({
      ...row,
      definition: row.definition.replace(' ON public.', ' ON my_researcher_dev.'),
    })),
  };
  assert.equal(evaluateEffectivePackBSchema(namedSchemaEvidence, expectedDigests).exact, true);
  assert.equal(evaluateEffectivePackBSchema({
    ...evidence,
    foreign_keys: foreignKeys.map((row, index) => (
      index === 0 ? { ...row, update_action: 'c' } : row
    )),
  }, expectedDigests).exact, false);
  assert.equal(evaluateEffectivePackBSchema({
    ...evidence,
    pack_b_checks: evidence.pack_b_checks.slice(1),
  }, expectedDigests).exact, false);
  assert.equal(evaluateEffectivePackBSchema({
    ...evidence,
    pack_b_indexes: evidence.pack_b_indexes.map((row, index) => (
      index === 0
        ? { index_name: 'same-count-substitute', definition: row.definition }
        : row
    )),
  }, expectedDigests).exact, false);
  assert.equal(evaluateEffectivePackBSchema({
    ...evidence,
    pack_b_checks: evidence.pack_b_checks.map((row) => (
      row.constraint_name === 'ef_collection_attempt_state_check'
        ? { ...row, definition: `${row.definition} OR 'collecting'` }
        : row
    )),
  }, expectedDigests).exact, false);
});

test('event storage hardening binds payload-only columns, fixed versions and FK immutability', () => {
  const migration = buildEventStorageHardeningMigrationEvidence([{
    migration_name: EVENT_STORAGE_HARDENING_MIGRATION_NAME,
    checksum: EVENT_STORAGE_HARDENING_MIGRATION_SHA256,
    finished_at: new Date('2026-07-14T03:00:00.000Z'),
    rolled_back_at: null,
    applied_steps_count: 1,
  }], EVENT_STORAGE_HARDENING_MIGRATION_SHA256);
  assert.equal(migration.applied, true);
  assert.equal(migration.source_digest_matches_expected, true);

  const evidence = eventStorageHardeningFixture();
  const exact = evaluateEventStorageHardening(evidence);
  assert.equal(exact.reviewed_event_table_count, 4);
  assert.equal(exact.expected_column_count, 12);
  assert.equal(exact.expected_fixed_version_check_count, 9);
  assert.equal(exact.observed_pack_a_foreign_key_count, 38);
  assert.equal(exact.exact, true);

  const columnDrift = structuredClone(evidence);
  columnDrift.event_storage_columns[0].is_nullable = 'YES';
  assert.equal(evaluateEventStorageHardening(columnDrift).exact, false);
  const versionDrift = structuredClone(evidence);
  versionDrift.experiment_v2_version_checks[0].definition = "CHECK (true)";
  assert.equal(evaluateEventStorageHardening(versionDrift).exact, false);
  const cascadeDrift = structuredClone(evidence);
  cascadeDrift.foreign_keys[0].update_action = 'c';
  assert.equal(evaluateEventStorageHardening(cascadeDrift).exact, false);

  const pending = evaluateEventStorageHardening(eventStoragePendingBaselineFixture());
  assert.equal(pending.exact, false);
  assert.equal(pending.pending_baseline.exact, true);
  const partial = eventStoragePendingBaselineFixture();
  partial.event_storage_columns.push({
    table_name: EXPERIMENT_V2_EVENT_TABLES[0],
    column_name: 'branchKey',
    data_type: 'text',
    is_nullable: 'NO',
  });
  assert.equal(evaluateEventStorageHardening(partial).pending_baseline.exact, false);
});

test('event storage upgrade preflight classifies zero and nonzero named event tables', () => {
  const zeroAuthority = { rows: packAAuthorityRowsFixture() };
  const zero = evaluateEventStorageUpgradePreflight(zeroAuthority);
  assert.equal(zero.source, 'pack_a_authority_row_census');
  assert.equal(zero.migration_apply_authorized, false);
  assert.equal(zero.census_complete, true);
  assert.equal(zero.total_row_count, 0);
  assert.equal(zero.nonempty_table_count, 0);
  assert.equal(zero.zero_row_precondition_satisfied, true);
  assert.equal(zero.requires_separate_transform_authorization, false);
  assert.deepEqual(
    Object.fromEntries(Object.entries(zero.rows).map(([tableName, row]) => [
      tableName,
      row.row_count,
    ])),
    Object.fromEntries(EXPERIMENT_V2_EVENT_TABLES.map((tableName) => [tableName, 0])),
  );

  const nonzeroAuthorityRows = packAAuthorityRowsFixture({
    [EXPERIMENT_V2_EVENT_TABLES[2]]: 3,
  });
  const nonzero = evaluateEventStorageUpgradePreflight({ rows: nonzeroAuthorityRows });
  assert.equal(nonzero.census_complete, true);
  assert.equal(nonzero.total_row_count, 3);
  assert.equal(nonzero.nonempty_table_count, 1);
  assert.equal(nonzero.zero_row_precondition_satisfied, false);
  assert.equal(nonzero.requires_separate_transform_authorization, true);
  assert.deepEqual(nonzero.nonempty_tables, [{
    table_name: EXPERIMENT_V2_EVENT_TABLES[2],
    row_count: 3,
  }]);

  const incompleteAuthorityRows = packAAuthorityRowsFixture();
  delete incompleteAuthorityRows[EXPERIMENT_V2_EVENT_TABLES[0]];
  const incomplete = evaluateEventStorageUpgradePreflight({ rows: incompleteAuthorityRows });
  assert.equal(incomplete.census_complete, false);
  assert.equal(incomplete.zero_row_precondition_satisfied, false);
});

function localFixtureDigests(evidence) {
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  const digest = (rows) => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return {
    foreign_keys: digest(evidence.foreign_keys.map((row) => ({
      constraint_name: row.constraint_name,
      definition: row.definition,
    })).sort((left, right) => compare(left.constraint_name, right.constraint_name))),
    checks: digest(evidence.pack_b_checks.map((row) => ({
      constraint_name: row.constraint_name,
      definition: row.definition,
    })).sort((left, right) => compare(left.constraint_name, right.constraint_name))),
    indexes: digest(evidence.pack_b_indexes.map((row) => ({
      index_name: row.index_name,
      definition: normalizePostgresIndexDefinitionSchema(row.definition),
    })).sort((left, right) => compare(left.index_name, right.index_name))),
  };
}

test('Pack A authority counts, per-table digests and aggregate digest are locked', () => {
  assert.equal(Object.keys(PACK_A_LOCAL_AUTHORITY_ROW_BASELINE).length, 34);
  assert.match(PACK_A_LOCAL_AUTHORITY_AGGREGATE_DIGEST, /^sha256:[0-9a-f]{64}$/);
  const rowsByTable = Object.fromEntries(Object.entries(PACK_A_LOCAL_AUTHORITY_ROW_BASELINE)
    .map(([tableName, count]) => [
      tableName,
      Array.from({ length: count }, (_, index) => ({ id: `${tableName}-${index}` })),
    ]));
  const observed = digestAuthorityIdOrderedRows(rowsByTable);
  assert.equal(observed.algorithm, 'pack-a-authority-id-ordered-row-json-sha256@v2');
  const authority = evaluateAuthorityRowCensus(
    observed,
    PACK_A_LOCAL_AUTHORITY_ROW_BASELINE,
    observed.aggregate_digest,
  );
  assert.equal(authority.exact, true);
  assert.equal(authority.actual_total_count, authority.expected_total_count);

  const digestDriftRows = structuredClone(rowsByTable);
  digestDriftRows.ExperimentFoundationDatasetV2[0].content = 'tampered-with-same-count';
  const authorityDrift = evaluateAuthorityRowCensus(
    digestAuthorityIdOrderedRows(digestDriftRows),
    PACK_A_LOCAL_AUTHORITY_ROW_BASELINE,
    observed.aggregate_digest,
  );
  assert.equal(authorityDrift.exact, false);
  assert.equal(
    authorityDrift.rows.ExperimentFoundationDatasetV2.actual_count,
    authority.rows.ExperimentFoundationDatasetV2.actual_count,
  );
  assert.notEqual(
    authorityDrift.rows.ExperimentFoundationDatasetV2.digest,
    authority.rows.ExperimentFoundationDatasetV2.digest,
  );

  const removedPlaceholderRows = structuredClone(rowsByTable);
  removedPlaceholderRows.ExperimentFoundationDatasetV2[0] = {
    ...removedPlaceholderRows.ExperimentFoundationDatasetV2[0],
    draftSchemaVersion: 'experiment-foundation-dataset-draft@v1',
    draftHash: 'sha256:obsolete',
  };
  assert.equal(
    digestAuthorityIdOrderedRows(removedPlaceholderRows).aggregate_digest,
    observed.aggregate_digest,
  );

  const versionLockRows = structuredClone(rowsByTable);
  versionLockRows.ExperimentFoundationVersionLockV2 = [{ id: 'version-lock-fixture' }];
  const versionLockPlaceholderRows = structuredClone(versionLockRows);
  versionLockPlaceholderRows.ExperimentFoundationVersionLockV2[0] = {
    ...versionLockPlaceholderRows.ExperimentFoundationVersionLockV2[0],
    lockSchemaVersion: 'experiment-foundation-version-lock@v1',
    resolvedLockJson: { obsolete: true },
  };
  assert.equal(
    digestAuthorityIdOrderedRows(versionLockPlaceholderRows).aggregate_digest,
    digestAuthorityIdOrderedRows(versionLockRows).aggregate_digest,
  );
});

test('five canonical legacy sentinel digests are locked', () => {
  assert.equal(Object.keys(PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE.tables).length, 5);
  const legacy = evaluateLegacySentinelBaseline(PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE);
  assert.equal(legacy.exact, true);
  const legacyDrift = evaluateLegacySentinelBaseline({
    ...PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE,
    aggregate_count: 258,
  });
  assert.equal(legacyDrift.exact, false);
});

test('Pack B local landing requires all six tables to be present and empty', () => {
  const empty = evaluatePackBRowCensus(Object.fromEntries(
    PACK_B_V2_TABLES.map((tableName) => [tableName, { present: true, count: 0 }]),
  ));
  assert.equal(empty.table_count, 6);
  assert.equal(empty.present_table_count, 6);
  assert.equal(empty.nonzero_table_count, 0);
  assert.equal(empty.all_present_and_zero, true);

  const nonzero = evaluatePackBRowCensus({
    ...Object.fromEntries(
      PACK_B_V2_TABLES.map((tableName) => [tableName, { present: true, count: 0 }]),
    ),
    ExperimentFoundationProviderPayloadV2: { present: true, count: 1 },
  });
  assert.equal(nonzero.total_row_count, 1);
  assert.equal(nonzero.nonzero_table_count, 1);
  assert.deepEqual(nonzero.nonzero_tables, ['ExperimentFoundationProviderPayloadV2']);
  assert.equal(nonzero.all_present_and_zero, false);
});

test('cross-domain FK census catches either PI-to-EF direction and ignores EF-local links', () => {
  const evidence = crossDomainPiForeignKeyEvidence([
    {
      constraint_name: 'same_domain',
      source_table: 'ExperimentFoundationExecutionAttemptV2',
      target_table: 'ExperimentFoundationProviderPayloadV2',
    },
    {
      constraint_name: 'pi_to_ef',
      source_table: 'PaperImplementationExperimentWorkOrderBranchV2',
      target_table: 'ExperimentFoundationRunV2',
    },
    {
      constraint_name: 'ef_to_pi',
      source_table: 'ExperimentFoundationExecutionAttemptV2',
      target_table: 'PaperImplementationResearchWorkOrder',
    },
  ]);
  assert.equal(evidence.inspected_fk_count, 3);
  assert.equal(evidence.cross_domain_pi_fk_count, 2);
  assert.deepEqual(
    evidence.cross_domain_pi_fks.map((row) => row.constraint_name),
    ['pi_to_ef', 'ef_to_pi'],
  );
});

test('activation configuration implements the strict simulation and cutover truth table', () => {
  assert.equal(PACK_B_ACTIVATION_TRUTH_TABLE.length, 4);
  for (const row of PACK_B_ACTIVATION_TRUTH_TABLE) {
    const actual = evaluatePackBActivationConfig({
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED:
        String(row.cutover_committed),
      EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED:
        String(row.workflow_simulation_enabled),
    }, row.workflow_simulation_enabled);
    assert.equal(actual.phase, row.phase);
    assert.equal(actual.valid, row.valid);
    assert.equal(actual.expected_state_matches, true);
  }

  const preapply = evaluatePackBActivationConfig({
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
  }, false);
  assert.equal(preapply.phase, 'cutover_committed_simulation_disabled');
  assert.equal(preapply.workflow_simulation.default, false);
  assert.equal(preapply.expected_state_matches, true);

  const enabled = evaluatePackBActivationConfig({
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: ' TRUE ',
    EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: ' TRUE ',
  }, true);
  assert.equal(enabled.enable_ready, true);
  assert.equal(enabled.expected_state_matches, true);

  for (const malformed of ['1', 'on', 'yes', 'tru']) {
    assert.equal(evaluatePackBActivationConfig({
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
      EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: malformed,
    }).valid, false);
  }
});

test('CLI fixes the artifact name and makes expected capability state configurable', () => {
  const disabled = parseArgs(['--run-id', 'packb-local-preapply-r1']);
  assert.equal(disabled.expectSimulationEnabled, false);
  assert.match(
    disabled.outputPath,
    /packb-local-preapply-r1\/packb-local-landing-gate\.json$/,
  );
  const enabled = parseArgs([
    '--run-id',
    'packb-local-enabled-r1',
    '--expect-simulation-enabled',
    'true',
  ]);
  assert.equal(enabled.expectSimulationEnabled, true);
  assert.throws(
    () => parseArgs(['--run-id', 'bad/run', '--expect-simulation-enabled', 'false']),
    /safe filename characters/,
  );
  assert.throws(
    () => parseArgs(['--run-id', 'run', '--expect-simulation-enabled', '1']),
    /exactly true or false/,
  );
  assert.throws(
    () => parseArgs(['--run-id', 'run', '--output', '/tmp/result.json']),
    /Unknown argument/,
  );
});

test('status distinguishes pre-apply blocking, unsafe drift and a complete landing', () => {
  const passing = passingSummary();
  assert.deepEqual(deriveStatus(passing), {
    status: 'passed',
    failures: [],
    blockers: [],
  });

  const safelyDisabled = structuredClone(passing);
  safelyDisabled.activation_config.cutover.effective = false;
  assert.deepEqual(deriveStatus(safelyDisabled), {
    status: 'passed',
    failures: [],
    blockers: [],
  });

  const preapply = structuredClone(passing);
  preapply.migration.applied = false;
  preapply.migration.history_row_count = 0;
  preapply.migration.database_checksum_matches_source = null;
  preapply.cleanup_migration.applied = false;
  preapply.cleanup_migration.history_row_count = 0;
  preapply.cleanup_migration.database_checksum_matches_source = null;
  preapply.foundation_cleanup_migration.applied = false;
  preapply.foundation_cleanup_migration.history_row_count = 0;
  preapply.foundation_cleanup_migration.database_checksum_matches_source = null;
  preapply.event_storage_hardening_migration.applied = false;
  preapply.event_storage_hardening_migration.history_row_count = 0;
  preapply.event_storage_hardening_migration.database_checksum_matches_source = null;
  preapply.schema.event_storage_hardening = {
    exact: false,
    pending_baseline: { exact: true },
  };
  preapply.schema.table_population.pack_b = {
    ...preapply.schema.table_population.pack_b,
    actual_count: 0,
    exact: false,
  };
  assert.deepEqual(
    deriveStatus(preapply).blockers,
    [
      'PACK_B_MIGRATION_NOT_APPLIED',
      'PACK_B_CLEANUP_MIGRATION_NOT_APPLIED',
      'FOUNDATION_STORAGE_CLEANUP_MIGRATION_NOT_APPLIED',
      'EVENT_STORAGE_HARDENING_MIGRATION_NOT_APPLIED',
      'PACK_B_V2_TABLES_NOT_READY',
    ],
  );

  const eventStoragePendingZero = structuredClone(passing);
  eventStoragePendingZero.event_storage_hardening_migration.applied = false;
  eventStoragePendingZero.event_storage_hardening_migration.history_row_count = 0;
  eventStoragePendingZero.event_storage_hardening_migration
    .database_checksum_matches_source = null;
  eventStoragePendingZero.schema.event_storage_hardening =
    evaluateEventStorageHardening(eventStoragePendingBaselineFixture());
  assert.deepEqual(deriveStatus(eventStoragePendingZero), {
    status: 'blocked',
    failures: [],
    blockers: ['EVENT_STORAGE_HARDENING_MIGRATION_NOT_APPLIED'],
  });

  const eventStoragePendingNonzero = structuredClone(eventStoragePendingZero);
  const eventRows = packAAuthorityRowsFixture({
    [EXPERIMENT_V2_EVENT_TABLES[0]]: 1,
  });
  eventStoragePendingNonzero.schema.pack_a_authority_rows = {
    exact: false,
    rows: eventRows,
  };
  eventStoragePendingNonzero.schema.event_storage_upgrade_preflight =
    evaluateEventStorageUpgradePreflight({ rows: eventRows });
  assert.deepEqual(deriveStatus(eventStoragePendingNonzero), {
    status: 'blocked',
    failures: [],
    blockers: [
      'EVENT_STORAGE_HARDENING_NONEMPTY_EVENT_TABLES',
      'EVENT_STORAGE_HARDENING_MIGRATION_NOT_APPLIED',
    ],
  });

  const eventStoragePendingPartial = structuredClone(eventStoragePendingZero);
  eventStoragePendingPartial.schema.event_storage_hardening.pending_baseline.exact = false;
  assert.deepEqual(deriveStatus(eventStoragePendingPartial), {
    status: 'failed',
    failures: ['EVENT_STORAGE_HARDENING_UNTRACKED_OR_PARTIAL_SCHEMA'],
    blockers: ['EVENT_STORAGE_HARDENING_MIGRATION_NOT_APPLIED'],
  });

  const unsafe = structuredClone(passing);
  unsafe.database_target.transaction_read_only_verified = false;
  unsafe.schema.cross_domain_foreign_keys.cross_domain_pi_fk_count = 1;
  unsafe.prohibited_effects.provider_calls = 1;
  assert.deepEqual(deriveStatus(unsafe).failures, [
    'PACK_B_LOCAL_GATE_READ_ONLY_NOT_VERIFIED',
    'PACK_B_CROSS_DOMAIN_PI_FOREIGN_KEY',
    'PACK_B_LOCAL_GATE_PROHIBITED_EFFECT',
  ]);

  const populated = structuredClone(passing);
  populated.schema.pack_b_row_census.nonzero_table_count = 1;
  populated.schema.pack_b_row_census.nonzero_tables = [
    'ExperimentFoundationExecutionAttemptV2',
  ];
  assert.deepEqual(
    deriveStatus(populated).failures,
    ['PACK_B_LOCAL_INITIAL_ROW_CENSUS_NONZERO'],
  );

  const notEnabled = structuredClone(passing);
  notEnabled.activation_config.expected_workflow_simulation_enabled = true;
  notEnabled.activation_config.expected_state_matches = false;
  assert.deepEqual(
    deriveStatus(notEnabled).blockers,
    ['PACK_B_WORKFLOW_SIMULATION_NOT_ENABLED'],
  );
});

test('gate source has one explicit read-only transaction and no mutation/provider runner', async () => {
  const source = await fs.readFile(SCRIPT_PATH, 'utf8');
  assert.equal(READ_ONLY_TRANSACTION_STATEMENT, 'SET TRANSACTION READ ONLY');
  assert.equal([...source.matchAll(/\$executeRawUnsafe\(/g)].length, 1);
  assert.match(source, /\$executeRawUnsafe\(READ_ONLY_TRANSACTION_STATEMENT\)/);
  assert.match(source, /PACK_B_LOCAL_GATE_NON_SELECT_SQL_REFUSED/);
  assert.doesNotMatch(source, /node:child_process|from ['"].*provider.*['"]/i);
  assert.doesNotMatch(source, /prisma\s+(?:migrate|db push)|migrate deploy/i);
  assert.doesNotMatch(
    source,
    /(?:prisma|tx)\.[A-Za-z][A-Za-z0-9_]*\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/,
  );
  assert.doesNotMatch(source, /process\.env\.[A-Za-z0-9_]+\s*=/);
});

function passingSummary() {
  return {
    database_target: {
      loopback_enforced: true,
      database_name_matches_url: true,
      requested_schema: 'my_researcher_dev',
      effective_schema: 'my_researcher_dev',
      transaction_read_only_verified: true,
      target_fingerprint_matches: true,
    },
    migration: {
      source_digest_matches_expected: true,
      history_shape_valid: true,
      history_row_count: 1,
      database_checksum_matches_source: true,
      applied: true,
    },
    cleanup_migration: {
      source_digest_matches_expected: true,
      history_shape_valid: true,
      history_row_count: 1,
      database_checksum_matches_source: true,
      applied: true,
    },
    foundation_cleanup_migration: {
      source_digest_matches_expected: true,
      history_shape_valid: true,
      history_row_count: 1,
      database_checksum_matches_source: true,
      applied: true,
    },
    event_storage_hardening_migration: {
      source_digest_matches_expected: true,
      history_shape_valid: true,
      history_row_count: 1,
      database_checksum_matches_source: true,
      applied: true,
    },
    schema: {
      table_population: {
        pack_a: { exact: true },
        pack_b: { exact: true, actual_count: 6 },
        approved_pack_a_and_b: { extra: [], exact: true },
      },
      pack_a_authority_rows: {
        exact: true,
        rows: packAAuthorityRowsFixture(),
      },
      pack_b_row_census: { nonzero_table_count: 0, nonzero_tables: [] },
      cross_domain_foreign_keys: { cross_domain_pi_fk_count: 0 },
      pack_b_effective_schema: { exact: true },
      foundation_storage_cleanup: { exact: true },
      event_storage_hardening: { exact: true },
      event_storage_upgrade_preflight: evaluateEventStorageUpgradePreflight({
        rows: packAAuthorityRowsFixture(),
      }),
    },
    legacy_sentinels: { exact: true },
    pack_a_cutover_config: { valid: true },
    activation_config: {
      valid: true,
      expected_state_matches: true,
      expected_workflow_simulation_enabled: false,
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
  };
}

function eventStorageHardeningFixture() {
  return {
    event_storage_columns: EXPERIMENT_V2_EVENT_TABLES.flatMap((tableName) => [
      {
        table_name: tableName,
        column_name: 'branchKey',
        data_type: 'text',
        is_nullable: 'NO',
      },
      {
        table_name: tableName,
        column_name: 'eventEnvelopeHash',
        data_type: 'text',
        is_nullable: 'NO',
      },
      {
        table_name: tableName,
        column_name: 'eventPayloadJson',
        data_type: 'jsonb',
        is_nullable: 'NO',
      },
    ]),
    experiment_v2_version_checks: Object.entries(EXPERIMENT_V2_FIXED_VERSION_CHECKS)
      .map(([constraint_name, columnName]) => ({
        constraint_name,
        definition: `CHECK (("${columnName}" = 'v1'::text))`,
      })),
    foreign_keys: Array.from(
      { length: PACK_A_EXPECTED_FOREIGN_KEY_COUNT },
      (_, index) => ({
        constraint_name: `pack-a-fk-${index}`,
        source_table: PACK_A_V2_TABLES[0],
        target_table: PACK_A_V2_TABLES[1],
        delete_action: 'r',
        update_action: 'r',
      }),
    ),
  };
}

function eventStoragePendingBaselineFixture() {
  const fixture = eventStorageHardeningFixture();
  return {
    event_storage_columns: fixture.event_storage_columns.filter(
      (row) => row.column_name === 'eventPayloadJson',
    ),
    experiment_v2_version_checks: fixture.experiment_v2_version_checks.filter(
      (row) => [
        'ef_attempt_event_schema_check',
        'ef_provider_command_schema_check',
      ].includes(row.constraint_name),
    ),
    foreign_keys: fixture.foreign_keys.map((row) => ({
      ...row,
      update_action: 'c',
    })),
  };
}

function packAAuthorityRowsFixture(overrides = {}) {
  return Object.fromEntries(PACK_A_V2_TABLES.map((tableName) => {
    const expected = PACK_A_LOCAL_AUTHORITY_ROW_BASELINE[tableName];
    const actual = Object.hasOwn(overrides, tableName) ? overrides[tableName] : expected;
    return [tableName, {
      present: true,
      expected_count: expected,
      actual_count: actual,
      count_matches: actual === expected,
    }];
  }));
}
