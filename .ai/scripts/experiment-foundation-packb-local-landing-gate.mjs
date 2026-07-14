#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  PACK_A_EF_V2_TABLES,
  PACK_A_PI_V2_TABLES,
  PACK_A_V2_TABLES,
  digestCanonicalJson,
  digestLegacyIdOrderedRows,
  evaluateCutoverConfig,
  fingerprintPackALocalTarget,
  sanitizeLocalDatabaseTarget,
} from './experiment-foundation-packa-local-landing-gate.mjs';
import {
  EXPERIMENT_V2_SHA256_REF_PATTERN,
  normalizePostgresIndexDefinitionSchema,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import {
  EXPERIMENT_V2_EVENT_TABLES,
  EXPERIMENT_V2_FIXED_VERSION_CHECKS,
  PACK_A_EXPECTED_FOREIGN_KEY_COUNT,
} from './lib/experiment-v2-schema-hardening.mjs';

export {
  EXPERIMENT_V2_EVENT_TABLES,
  EXPERIMENT_V2_FIXED_VERSION_CHECKS,
  PACK_A_EXPECTED_FOREIGN_KEY_COUNT,
};

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
export const PACK_B_LOCAL_BASELINE_MANIFEST_PATH = path.join(
  REPO_ROOT,
  '.ai/scripts/manifests/experiment-foundation-packb-named-local-snapshot.v1.json',
);
export const PACK_B_EXPECTED_LOCAL_BASELINE_MANIFEST_SHA256 =
  '3aff4497154d3abc644582ec3848f4c5530891385969630f560d068c4de8b0c5';
const PACK_B_LOCAL_BASELINE_MANIFEST = validateBaselineManifest(
  JSON.parse(await fs.readFile(PACK_B_LOCAL_BASELINE_MANIFEST_PATH, 'utf8')),
);

function validateBaselineManifest(manifest) {
  if (
    manifest?.schema_version !== 'experiment-foundation-packb-named-local-snapshot@v1'
    || manifest?.baseline_kind !== 'one_shot_pre_product_named_local_snapshot'
    || manifest?.target?.database !== 'postgres'
    || manifest?.target?.schema !== 'my_researcher_dev'
    || manifest?.target?.host !== '127.0.0.1'
    || manifest?.target?.port !== '5432'
    || manifest?.pack_a_authority?.algorithm
      !== 'pack-a-authority-id-ordered-row-json-sha256@v2'
    || !EXPERIMENT_V2_SHA256_REF_PATTERN.test(manifest?.target?.fingerprint ?? '')
    || !EXPERIMENT_V2_SHA256_REF_PATTERN.test(
      manifest?.pack_a_authority?.aggregate_digest ?? '',
    )
    || !EXPERIMENT_V2_SHA256_REF_PATTERN.test(
      manifest?.legacy_sentinels?.aggregate_digest ?? '',
    )
  ) {
    throw new Error('PACK_B_LOCAL_BASELINE_MANIFEST_INVALID');
  }
  const tableCounts = manifest.pack_a_authority.table_counts;
  if (
    !tableCounts
    || Object.keys(tableCounts).length !== PACK_A_V2_TABLES.length
    || PACK_A_V2_TABLES.some((tableName) => !Number.isInteger(tableCounts[tableName]))
    || Object.values(tableCounts).some((count) => count < 0)
    || Object.values(tableCounts).reduce((sum, count) => sum + count, 0)
      !== manifest.pack_a_authority.aggregate_count
  ) {
    throw new Error('PACK_B_LOCAL_BASELINE_MANIFEST_PACK_A_POPULATION_INVALID');
  }
  const legacy = manifest.legacy_sentinels;
  if (
    legacy.algorithm !== 'legacy-id-ordered-row-json-sha256@v1'
    || Object.keys(legacy.tables ?? {}).length !== 5
    || Object.values(legacy.tables).some((row) => (
      !Number.isInteger(row.count)
      || row.count < 0
      || !EXPERIMENT_V2_SHA256_REF_PATTERN.test(row.digest)
    ))
    || Object.values(legacy.tables).reduce((sum, row) => sum + row.count, 0)
      !== legacy.aggregate_count
  ) {
    throw new Error('PACK_B_LOCAL_BASELINE_MANIFEST_LEGACY_POPULATION_INVALID');
  }
  return manifest;
}

export const PACK_B_MIGRATION_NAME =
  '20260713210000_add_experiment_foundation_pack_b_provider_control_v2';
export const PACK_B_MIGRATION_PATH = path.join(
  REPO_ROOT,
  `prisma/migrations/${PACK_B_MIGRATION_NAME}/migration.sql`,
);
export const PACK_B_EXPECTED_MIGRATION_SHA256 =
  'c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e';
export const PACK_B_CLEANUP_MIGRATION_NAME =
  '20260714160000_harden_experiment_foundation_pack_b_v2';
export const PACK_B_CLEANUP_MIGRATION_PATH = path.join(
  REPO_ROOT,
  `prisma/migrations/${PACK_B_CLEANUP_MIGRATION_NAME}/migration.sql`,
);
export const PACK_B_EXPECTED_CLEANUP_MIGRATION_SHA256 =
  '05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8';
export const FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME =
  '20260714190000_remove_experiment_foundation_v2_placeholders';
const FOUNDATION_STORAGE_CLEANUP_MIGRATION_PATH = path.join(
  REPO_ROOT,
  `prisma/migrations/${FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME}/migration.sql`,
);
export const FOUNDATION_STORAGE_CLEANUP_MIGRATION_SHA256 =
  'b3ddb7601d4b256b47d664fb5cea3694bcc5587c6eb41864ba3e61bf711abf6c';
export const EVENT_STORAGE_HARDENING_MIGRATION_NAME =
  '20260714210000_normalize_experiment_v2_event_payloads';
export const EVENT_STORAGE_HARDENING_MIGRATION_PATH = path.join(
  REPO_ROOT,
  `prisma/migrations/${EVENT_STORAGE_HARDENING_MIGRATION_NAME}/migration.sql`,
);
export const EVENT_STORAGE_HARDENING_MIGRATION_SHA256 =
  '37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a';
const EVENT_STORAGE_PRE_HARDENING_CHECK_NAMES = Object.freeze([
  'ef_attempt_event_schema_check',
  'ef_provider_command_schema_check',
]);
const PACK_B_REMOVED_REDUNDANT_INDEXES = [
  'ef_collection_attempt_sequence_unique',
  'ef_collection_attempt_business_unique',
  'ef_collection_attempt_state_idx',
];
const FOUNDATION_REMOVED_PLACEHOLDER_COLUMNS = [
  ['ExperimentFoundationVersionLockV2', 'lockSchemaVersion'],
  ['ExperimentFoundationVersionLockV2', 'resolvedLockJson'],
  ...[
    'ExperimentFoundationDatasetV2',
    'ExperimentFoundationDataPolicyV2',
    'ExperimentFoundationMetricDefinitionV2',
    'ExperimentFoundationBenchmarkV2',
    'ExperimentFoundationEvaluationProtocolV2',
  ].flatMap((tableName) => [
    [tableName, 'draftSchemaVersion'],
    [tableName, 'draftHash'],
  ]),
];
const FOUNDATION_REMOVED_PLACEHOLDER_INDEXES = [
  'ef_dataset_v2_draft_hash_idx',
  'ef_data_policy_v2_draft_hash_idx',
  'ef_metric_definition_v2_draft_hash_idx',
  'ef_benchmark_v2_draft_hash_idx',
  'ef_evaluation_protocol_v2_draft_hash_idx',
];
const PACK_B_EXPECTED_EFFECTIVE_SCHEMA_DIGESTS = Object.freeze({
  foreign_keys: 'ce9f1a0866eaac5114921eaf4132d8652df308fbbab466aebde23689e1e8de71',
  checks: '868ddb26146bec215b69c572ac54c8b0ab3f667a83b5ce3c672db590c45b9040',
  indexes: '764a29546bba534cdfe3d1544662c58403a87fbbaff26e8d543c780b45bf4449',
});
const PACK_B_EXPECTED_CHECK_COUNT = 35;
const PACK_B_EXPECTED_FOREIGN_KEY_NAMES = [
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
];

export const PACK_B_V2_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
];

export const PACK_A_AND_B_V2_TABLES = [...PACK_A_V2_TABLES, ...PACK_B_V2_TABLES];

export const PACK_A_LOCAL_AUTHORITY_ROW_BASELINE = Object.freeze(
  PACK_B_LOCAL_BASELINE_MANIFEST.pack_a_authority.table_counts,
);
export const PACK_A_LOCAL_AUTHORITY_AGGREGATE_DIGEST =
  PACK_B_LOCAL_BASELINE_MANIFEST.pack_a_authority.aggregate_digest;
export const PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE = Object.freeze(
  PACK_B_LOCAL_BASELINE_MANIFEST.legacy_sentinels,
);

export const PACK_B_ACTIVATION_TRUTH_TABLE = Object.freeze([
  Object.freeze({
    cutover_committed: false,
    workflow_simulation_enabled: false,
    phase: 'pre_cutover_disabled',
    valid: true,
  }),
  Object.freeze({
    cutover_committed: false,
    workflow_simulation_enabled: true,
    phase: 'invalid_simulation_without_cutover',
    valid: false,
  }),
  Object.freeze({
    cutover_committed: true,
    workflow_simulation_enabled: false,
    phase: 'cutover_committed_simulation_disabled',
    valid: true,
  }),
  Object.freeze({
    cutover_committed: true,
    workflow_simulation_enabled: true,
    phase: 'cutover_committed_simulation_enabled',
    valid: true,
  }),
]);

export const READ_ONLY_TRANSACTION_STATEMENT = 'SET TRANSACTION READ ONLY';

const LEGACY_SENTINEL_TABLES = Object.keys(PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE.tables);

export function parseArgs(argv) {
  let runId = null;
  let expectSimulationEnabled = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument === '--expect-simulation-enabled') {
      expectSimulationEnabled = parseExpectedBoolean(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id is required and must contain 1..64 safe filename characters');
  }
  return {
    runId,
    expectSimulationEnabled,
    outputPath: path.join(ARTIFACT_ROOT, runId, 'packb-local-landing-gate.json'),
  };
}

function parseExpectedBoolean(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error('--expect-simulation-enabled must be exactly true or false');
}

function compareTablePopulation(expectedTableNames, actualTableNames) {
  const expected = [...expectedTableNames].sort();
  const actual = [...actualTableNames].sort();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const duplicates = actual.filter((name, index) => index > 0 && name === actual[index - 1]);
  return {
    expected_count: expected.length,
    actual_count: actual.length,
    missing: expected.filter((name) => !actualSet.has(name)),
    extra: actual.filter((name) => !expectedSet.has(name)),
    duplicates: [...new Set(duplicates)],
    exact: expected.length === actual.length
      && duplicates.length === 0
      && expected.every((name, index) => name === actual[index]),
  };
}

export function comparePackBTablePopulation(actualV2TableNames) {
  const packASet = new Set(PACK_A_V2_TABLES);
  const packBSet = new Set(PACK_B_V2_TABLES);
  return {
    pack_a: compareTablePopulation(
      PACK_A_V2_TABLES,
      actualV2TableNames.filter((name) => packASet.has(name)),
    ),
    pack_b: compareTablePopulation(
      PACK_B_V2_TABLES,
      actualV2TableNames.filter((name) => packBSet.has(name)),
    ),
    approved_pack_a_and_b: compareTablePopulation(PACK_A_AND_B_V2_TABLES, actualV2TableNames),
  };
}

export function evaluatePackBActivationConfig(
  env = process.env,
  expectedSimulationEnabled = false,
) {
  if (typeof expectedSimulationEnabled !== 'boolean') {
    throw new TypeError('expectedSimulationEnabled must be boolean');
  }
  const cutover = strictBooleanConfig(env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED);
  const simulation = strictBooleanConfig(
    env.EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED,
  );
  const truth = cutover.valid && simulation.valid
    ? PACK_B_ACTIVATION_TRUTH_TABLE.find((row) => (
      row.cutover_committed === cutover.effective
      && row.workflow_simulation_enabled === simulation.effective
    ))
    : null;
  return {
    cutover: {
      key: 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED',
      configured: cutover.configured,
      effective: cutover.effective,
      valid: cutover.valid,
      default: false,
    },
    workflow_simulation: {
      key: 'EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED',
      configured: simulation.configured,
      effective: simulation.effective,
      valid: simulation.valid,
      default: false,
    },
    expected_workflow_simulation_enabled: expectedSimulationEnabled,
    expected_state_matches:
      simulation.valid && simulation.effective === expectedSimulationEnabled,
    phase: truth?.phase ?? 'invalid_boolean_configuration',
    valid: Boolean(truth?.valid),
    enable_ready: Boolean(
      truth?.valid && cutover.effective && simulation.effective,
    ),
    truth_table: PACK_B_ACTIVATION_TRUTH_TABLE,
  };
}

function strictBooleanConfig(raw) {
  if (raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    return { configured: raw !== undefined, effective: false, valid: true };
  }
  if (typeof raw !== 'string') {
    return { configured: true, effective: false, valid: false };
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return { configured: true, effective: true, valid: true };
  if (normalized === 'false') return { configured: true, effective: false, valid: true };
  return { configured: true, effective: false, valid: false };
}

export function buildMigrationEvidence(rows, sourceSha256) {
  return buildReviewedMigrationEvidence(
    rows,
    sourceSha256,
    PACK_B_MIGRATION_NAME,
    PACK_B_EXPECTED_MIGRATION_SHA256,
  );
}

export function buildCleanupMigrationEvidence(rows, sourceSha256) {
  return buildReviewedMigrationEvidence(
    rows,
    sourceSha256,
    PACK_B_CLEANUP_MIGRATION_NAME,
    PACK_B_EXPECTED_CLEANUP_MIGRATION_SHA256,
  );
}

export function buildFoundationStorageCleanupMigrationEvidence(rows, sourceSha256) {
  return buildReviewedMigrationEvidence(
    rows,
    sourceSha256,
    FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME,
    FOUNDATION_STORAGE_CLEANUP_MIGRATION_SHA256,
  );
}

export function buildEventStorageHardeningMigrationEvidence(rows, sourceSha256) {
  return buildReviewedMigrationEvidence(
    rows,
    sourceSha256,
    EVENT_STORAGE_HARDENING_MIGRATION_NAME,
    EVENT_STORAGE_HARDENING_MIGRATION_SHA256,
  );
}

function buildReviewedMigrationEvidence(rows, sourceSha256, migrationName, expectedSha256) {
  const row = rows[0] ?? null;
  const historyShapeValid = rows.length === 0 || (
    rows.length === 1
    && Boolean(row.finished_at)
    && !row.rolled_back_at
    && Number(row.applied_steps_count) === 1
  );
  return {
    migration_name: migrationName,
    source_sha256: sourceSha256,
    expected_source_sha256: expectedSha256,
    source_digest_matches_expected: sourceSha256 === expectedSha256,
    database_checksum: row?.checksum ?? null,
    database_checksum_matches_source: row ? row.checksum === sourceSha256 : null,
    history_row_count: rows.length,
    history_shape_valid: historyShapeValid,
    applied: rows.length === 1
      && historyShapeValid
      && row.checksum === sourceSha256,
    finished_at: isoOrNull(row?.finished_at),
    rolled_back_at: isoOrNull(row?.rolled_back_at),
  };
}

export function evaluateEffectivePackBSchema(
  evidence,
  expectedDigests = PACK_B_EXPECTED_EFFECTIVE_SCHEMA_DIGESTS,
) {
  const packBForeignKeys = evidence.foreign_keys.filter((row) => (
    PACK_B_V2_TABLES.includes(row.source_table)
  ));
  const foreignKeyNames = packBForeignKeys.map((row) => row.constraint_name).sort();
  const unsafeForeignKeys = packBForeignKeys.filter((row) => (
    !['a', 'r'].includes(row.delete_action)
    || !['a', 'r'].includes(row.update_action)
  ));
  const presentRemovedIndexes = evidence.pack_b_indexes
    .map((row) => row.index_name)
    .filter((indexName) => PACK_B_REMOVED_REDUNDANT_INDEXES.includes(indexName));
  const activeRealFenceIndexPresent = evidence.pack_b_indexes.some(
    (row) => row.index_name === 'ef_execution_attempt_cycle_mode_state_idx',
  );
  const checks = Object.fromEntries(
    evidence.pack_b_checks.map((row) => [row.constraint_name, row.definition]),
  );
  const unreachableValues = [];
  if (/['"]collecting['"]/i.test(checks.ef_collection_attempt_state_check ?? '')) {
    unreachableValues.push('collecting');
  }
  if (/['"]reconciled['"]/i.test(checks.ef_attempt_event_type_check ?? '')) {
    unreachableValues.push('reconciled');
  }
  if (/['"]collection_failed['"]/i.test(
    checks.ef_execution_attempt_terminal_reason_check ?? '',
  )) {
    unreachableValues.push('collection_failed_terminal_reason');
  }
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  const digest = (rows) => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const definitionDigests = {
    foreign_keys: digest(packBForeignKeys.map((row) => ({
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
  return {
    pack_b_foreign_key_count: packBForeignKeys.length,
    unsafe_referential_action_count: unsafeForeignKeys.length,
    pack_b_index_count: evidence.pack_b_indexes.length,
    pack_b_check_count: evidence.pack_b_checks.length,
    removed_index_still_present_count: presentRemovedIndexes.length,
    removed_indexes_still_present: presentRemovedIndexes,
    active_real_fence_index_present: activeRealFenceIndexPresent,
    collection_sequence_column_present: evidence.collection_sequence_column_present,
    unreachable_check_value_count: unreachableValues.length,
    unreachable_check_values: unreachableValues,
    definition_digests: definitionDigests,
    exact: packBForeignKeys.length === 15
      && JSON.stringify(foreignKeyNames)
        === JSON.stringify([...PACK_B_EXPECTED_FOREIGN_KEY_NAMES].sort())
      && unsafeForeignKeys.length === 0
      && evidence.pack_b_indexes.length === 38
      && evidence.pack_b_checks.length === PACK_B_EXPECTED_CHECK_COUNT
      && activeRealFenceIndexPresent
      && presentRemovedIndexes.length === 0
      && evidence.collection_sequence_column_present === false
      && unreachableValues.length === 0
      && JSON.stringify(definitionDigests) === JSON.stringify(expectedDigests),
  };
}

export function evaluateFoundationStorageCleanup(evidence) {
  const remainingColumns = evidence.foundation_placeholder_columns.map((row) => ({
    table_name: row.table_name,
    column_name: row.column_name,
  }));
  const remainingIndexes = evidence.foundation_placeholder_indexes.map((row) => row.index_name);
  return {
    reviewed_removed_column_count: FOUNDATION_REMOVED_PLACEHOLDER_COLUMNS.length,
    reviewed_removed_index_count: FOUNDATION_REMOVED_PLACEHOLDER_INDEXES.length,
    remaining_placeholder_columns: remainingColumns,
    remaining_placeholder_indexes: remainingIndexes,
    exact: remainingColumns.length === 0 && remainingIndexes.length === 0,
  };
}

export function digestAuthorityIdOrderedRows(rowsByTable) {
  const tables = Object.fromEntries(PACK_A_V2_TABLES.map((tableName) => {
    const present = Object.hasOwn(rowsByTable, tableName);
    const rows = (rowsByTable[tableName] ?? []).map((row) => (
      normalizePackAAuthorityRow(tableName, row)
    ));
    return [tableName, {
      present,
      count: rows.length,
      digest: digestCanonicalJson(rows),
    }];
  }));
  return {
    algorithm: 'pack-a-authority-id-ordered-row-json-sha256@v2',
    ordering: 'fixed 34-table allowlist; each table ordered by text id COLLATE C ascending; reviewed never-read placeholders omitted; row objects canonicalized with lexicographically sorted keys; array order preserved',
    tables,
    aggregate_count: Object.values(tables).reduce((sum, row) => sum + row.count, 0),
    aggregate_digest: digestCanonicalJson(tables),
  };
}

export function evaluateAuthorityRowCensus(
  observed,
  expectedCounts = PACK_A_LOCAL_AUTHORITY_ROW_BASELINE,
  expectedAggregateDigest = PACK_A_LOCAL_AUTHORITY_AGGREGATE_DIGEST,
) {
  const rows = Object.fromEntries(Object.entries(expectedCounts).map(([tableName, expected]) => {
    const actual = observed.tables?.[tableName] ?? null;
    return [tableName, {
      present: actual?.present ?? false,
      expected_count: expected,
      actual_count: actual?.count ?? null,
      digest: actual?.digest ?? null,
      count_matches: actual?.present === true && actual.count === expected,
    }];
  }));
  return {
    algorithm: observed.algorithm ?? null,
    ordering: observed.ordering ?? null,
    table_count: Object.keys(rows).length,
    expected_total_count: Object.values(expectedCounts).reduce((sum, count) => sum + count, 0),
    actual_total_count: observed.aggregate_count ?? null,
    aggregate_digest: observed.aggregate_digest ?? null,
    expected_aggregate_digest: expectedAggregateDigest,
    rows,
    exact: observed.algorithm === 'pack-a-authority-id-ordered-row-json-sha256@v2'
      && observed.aggregate_count
        === Object.values(expectedCounts).reduce((sum, count) => sum + count, 0)
      && observed.aggregate_digest === expectedAggregateDigest
      && Object.values(rows).every((row) => row.count_matches),
  };
}

function normalizePackAAuthorityRow(tableName, row) {
  const normalized = { ...row };
  if (tableName === 'ExperimentFoundationVersionLockV2') {
    delete normalized.lockSchemaVersion;
    delete normalized.resolvedLockJson;
  }
  if ([
    'ExperimentFoundationDatasetV2',
    'ExperimentFoundationDataPolicyV2',
    'ExperimentFoundationMetricDefinitionV2',
    'ExperimentFoundationBenchmarkV2',
    'ExperimentFoundationEvaluationProtocolV2',
  ].includes(tableName)) {
    delete normalized.draftSchemaVersion;
    delete normalized.draftHash;
  }
  return normalized;
}

export function evaluatePackBRowCensus(observed) {
  const rows = Object.fromEntries(PACK_B_V2_TABLES.map((tableName) => {
    const row = observed[tableName] ?? { present: false, count: null };
    return [tableName, {
      present: row.present === true,
      count: typeof row.count === 'number' ? row.count : null,
      zero: row.present === true && row.count === 0,
    }];
  }));
  const nonzeroTables = Object.entries(rows)
    .filter(([, row]) => typeof row.count === 'number' && row.count !== 0)
    .map(([tableName]) => tableName);
  return {
    table_count: PACK_B_V2_TABLES.length,
    present_table_count: Object.values(rows).filter((row) => row.present).length,
    total_row_count: Object.values(rows).reduce(
      (sum, row) => sum + (typeof row.count === 'number' ? row.count : 0),
      0,
    ),
    nonzero_table_count: nonzeroTables.length,
    nonzero_tables: nonzeroTables,
    all_present_and_zero: Object.values(rows).every((row) => row.zero),
    rows,
  };
}

export function evaluateEventStorageHardening(evidence) {
  const expectedColumns = EXPERIMENT_V2_EVENT_TABLES.flatMap((tableName) => [
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
  ]);
  const observedColumns = evidence.event_storage_columns ?? [];
  const columnKeys = new Set(
    observedColumns.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const duplicateColumnCount = observedColumns.length - columnKeys.size;
  const missingOrDriftedColumns = expectedColumns.filter((expected) => {
    const actual = observedColumns.find((row) => (
      row.table_name === expected.table_name
      && row.column_name === expected.column_name
    ));
    return !actual
      || actual.data_type !== expected.data_type
      || actual.is_nullable !== expected.is_nullable;
  });

  const expectedChecks = Object.entries(EXPERIMENT_V2_FIXED_VERSION_CHECKS);
  const observedChecks = evidence.experiment_v2_version_checks ?? [];
  const checkNames = new Set(observedChecks.map((row) => row.constraint_name));
  const duplicateCheckCount = observedChecks.length - checkNames.size;
  const missingOrDriftedChecks = expectedChecks.filter(([constraintName, columnName]) => {
    const actual = observedChecks.find((row) => row.constraint_name === constraintName);
    const definition = actual?.definition ?? '';
    return !actual
      || !definition.includes(`"${columnName}"`)
      || !definition.includes("'v1'::text");
  }).map(([constraintName]) => constraintName);

  const packAForeignKeys = (evidence.foreign_keys ?? []).filter((row) => (
    PACK_A_V2_TABLES.includes(row.source_table)
    && PACK_A_V2_TABLES.includes(row.target_table)
  ));
  const nonRestrictForeignKeys = packAForeignKeys.filter((row) => (
    row.delete_action !== 'r' || row.update_action !== 'r'
  ));
  const pendingColumns = EXPERIMENT_V2_EVENT_TABLES.map((tableName) => ({
    table_name: tableName,
    column_name: 'eventPayloadJson',
    data_type: 'jsonb',
    is_nullable: 'NO',
  }));
  const pendingColumnsExact = observedColumns.length === pendingColumns.length
    && pendingColumns.every((expected) => observedColumns.some((actual) => (
      actual.table_name === expected.table_name
      && actual.column_name === expected.column_name
      && actual.data_type === expected.data_type
      && actual.is_nullable === expected.is_nullable
    )));
  const pendingChecksExact = observedChecks.length
      === EVENT_STORAGE_PRE_HARDENING_CHECK_NAMES.length
    && EVENT_STORAGE_PRE_HARDENING_CHECK_NAMES.every((constraintName) => {
      const actual = observedChecks.find((row) => row.constraint_name === constraintName);
      const columnName = EXPERIMENT_V2_FIXED_VERSION_CHECKS[constraintName];
      return Boolean(actual)
        && actual.definition.includes(`"${columnName}"`)
        && actual.definition.includes("'v1'::text");
    });
  const pendingForeignKeysExact = packAForeignKeys.length
      === PACK_A_EXPECTED_FOREIGN_KEY_COUNT
    && nonRestrictForeignKeys.length === PACK_A_EXPECTED_FOREIGN_KEY_COUNT;

  return {
    reviewed_event_table_count: EXPERIMENT_V2_EVENT_TABLES.length,
    expected_column_count: expectedColumns.length,
    observed_column_count: observedColumns.length,
    duplicate_column_count: duplicateColumnCount,
    missing_or_drifted_columns: missingOrDriftedColumns.map(
      (row) => `${row.table_name}.${row.column_name}`,
    ),
    expected_fixed_version_check_count: expectedChecks.length,
    observed_fixed_version_check_count: observedChecks.length,
    duplicate_fixed_version_check_count: duplicateCheckCount,
    missing_or_drifted_fixed_version_checks: missingOrDriftedChecks,
    expected_pack_a_foreign_key_count: PACK_A_EXPECTED_FOREIGN_KEY_COUNT,
    observed_pack_a_foreign_key_count: packAForeignKeys.length,
    non_restrict_pack_a_foreign_keys: nonRestrictForeignKeys.map((row) => ({
      constraint_name: row.constraint_name,
      source_table: row.source_table,
      target_table: row.target_table,
      delete_action: row.delete_action,
      update_action: row.update_action,
    })),
    pending_baseline: {
      expected_payload_column_count: pendingColumns.length,
      observed_column_count: observedColumns.length,
      columns_exact: pendingColumnsExact,
      expected_fixed_version_check_count: EVENT_STORAGE_PRE_HARDENING_CHECK_NAMES.length,
      observed_fixed_version_check_count: observedChecks.length,
      checks_exact: pendingChecksExact,
      expected_non_restrict_pack_a_foreign_key_count: PACK_A_EXPECTED_FOREIGN_KEY_COUNT,
      observed_non_restrict_pack_a_foreign_key_count: nonRestrictForeignKeys.length,
      foreign_keys_exact: pendingForeignKeysExact,
      exact: pendingColumnsExact && pendingChecksExact && pendingForeignKeysExact,
    },
    exact:
      observedColumns.length === expectedColumns.length
      && duplicateColumnCount === 0
      && missingOrDriftedColumns.length === 0
      && observedChecks.length === expectedChecks.length
      && duplicateCheckCount === 0
      && missingOrDriftedChecks.length === 0
      && packAForeignKeys.length === PACK_A_EXPECTED_FOREIGN_KEY_COUNT
      && nonRestrictForeignKeys.length === 0,
  };
}

export function evaluateEventStorageUpgradePreflight(packAAuthorityRows) {
  const authorityRows = packAAuthorityRows?.rows ?? {};
  const rows = Object.fromEntries(EXPERIMENT_V2_EVENT_TABLES.map((tableName) => {
    const authority = authorityRows[tableName] ?? null;
    const count = Number.isInteger(authority?.actual_count)
      ? authority.actual_count
      : null;
    return [tableName, {
      present: authority?.present === true,
      row_count: count,
      zero: authority?.present === true && count === 0,
    }];
  }));
  const nonemptyTables = Object.entries(rows)
    .filter(([, row]) => Number.isInteger(row.row_count) && row.row_count > 0)
    .map(([table_name, row]) => ({ table_name, row_count: row.row_count }));
  const censusComplete = Object.values(rows).every((row) => (
    row.present && Number.isInteger(row.row_count) && row.row_count >= 0
  ));
  const totalRowCount = Object.values(rows).reduce(
    (sum, row) => sum + (Number.isInteger(row.row_count) ? row.row_count : 0),
    0,
  );
  return {
    source: 'pack_a_authority_row_census',
    advisory_only: true,
    migration_apply_authorized: false,
    table_count: EXPERIMENT_V2_EVENT_TABLES.length,
    census_complete: censusComplete,
    total_row_count: totalRowCount,
    nonempty_table_count: nonemptyTables.length,
    nonempty_tables: nonemptyTables,
    zero_row_precondition_satisfied: censusComplete && totalRowCount === 0,
    requires_separate_transform_authorization:
      censusComplete && nonemptyTables.length > 0,
    rows,
  };
}

export function evaluateLegacySentinelBaseline(
  observed,
  expected = PACK_B_LOCAL_LEGACY_SENTINEL_BASELINE,
) {
  const tables = Object.fromEntries(Object.entries(expected.tables).map(([tableName, baseline]) => {
    const actual = observed.tables?.[tableName] ?? null;
    return [tableName, {
      expected_count: baseline.count,
      actual_count: actual?.count ?? null,
      expected_digest: baseline.digest,
      actual_digest: actual?.digest ?? null,
      matches: actual?.count === baseline.count && actual?.digest === baseline.digest,
    }];
  }));
  return {
    algorithm: observed.algorithm ?? null,
    aggregate_count: observed.aggregate_count ?? null,
    aggregate_digest: observed.aggregate_digest ?? null,
    expected_aggregate_count: expected.aggregate_count,
    expected_aggregate_digest: expected.aggregate_digest,
    tables,
    exact: observed.algorithm === expected.algorithm
      && observed.aggregate_count === expected.aggregate_count
      && observed.aggregate_digest === expected.aggregate_digest
      && Object.values(tables).every((row) => row.matches),
  };
}

export function crossDomainPiForeignKeyEvidence(rows) {
  const crossDomain = rows.filter((row) => (
    (isPiTable(row.source_table) && isEfTable(row.target_table))
    || (isEfTable(row.source_table) && isPiTable(row.target_table))
  ));
  return {
    inspected_fk_count: rows.filter((row) => (
      PACK_A_AND_B_V2_TABLES.includes(row.source_table)
      || PACK_A_AND_B_V2_TABLES.includes(row.target_table)
    )).length,
    cross_domain_pi_fk_count: crossDomain.length,
    cross_domain_pi_fks: crossDomain,
  };
}

function isPiTable(tableName) {
  return PACK_A_PI_V2_TABLES.includes(tableName) || tableName.startsWith('PaperImplementation');
}

function isEfTable(tableName) {
  return PACK_A_EF_V2_TABLES.includes(tableName)
    || PACK_B_V2_TABLES.includes(tableName)
    || tableName.startsWith('ExperimentFoundation');
}

export function deriveStatus(summary) {
  const failures = [];
  const blockers = [];
  const target = summary.database_target;
  const tables = summary.schema.table_population;
  const migration = summary.migration;
  const cleanupMigration = summary.cleanup_migration;
  const foundationCleanupMigration = summary.foundation_cleanup_migration;
  const eventStorageHardeningMigration = summary.event_storage_hardening_migration;
  const eventStorageUpgradePreflight = summary.schema.event_storage_upgrade_preflight;
  const activation = summary.activation_config;

  if (!target.loopback_enforced) failures.push('PACK_B_LOCAL_GATE_NON_LOOPBACK_DATABASE');
  if (!target.database_name_matches_url) {
    failures.push('PACK_B_LOCAL_GATE_DATABASE_IDENTITY_MISMATCH');
  }
  if (target.effective_schema !== target.requested_schema) {
    failures.push('PACK_B_LOCAL_GATE_SCHEMA_IDENTITY_MISMATCH');
  }
  if (!target.transaction_read_only_verified) {
    failures.push('PACK_B_LOCAL_GATE_READ_ONLY_NOT_VERIFIED');
  }
  if (!target.target_fingerprint_matches) {
    failures.push('PACK_B_LOCAL_GATE_TARGET_FINGERPRINT_MISMATCH');
  }

  if (!migration.source_digest_matches_expected) {
    failures.push('PACK_B_MIGRATION_SOURCE_DIGEST_DRIFT');
  }
  if (!cleanupMigration.source_digest_matches_expected) {
    failures.push('PACK_B_CLEANUP_MIGRATION_SOURCE_DIGEST_DRIFT');
  }
  if (!foundationCleanupMigration.source_digest_matches_expected) {
    failures.push('FOUNDATION_STORAGE_CLEANUP_MIGRATION_SOURCE_DIGEST_DRIFT');
  }
  if (!eventStorageHardeningMigration.source_digest_matches_expected) {
    failures.push('EVENT_STORAGE_HARDENING_MIGRATION_SOURCE_DIGEST_DRIFT');
  }
  if (
    !eventStorageHardeningMigration.history_shape_valid
    || eventStorageHardeningMigration.history_row_count > 1
  ) {
    failures.push('EVENT_STORAGE_HARDENING_MIGRATION_HISTORY_INVALID');
  }
  if (
    eventStorageHardeningMigration.history_row_count > 0
    && eventStorageHardeningMigration.database_checksum_matches_source !== true
  ) {
    failures.push('EVENT_STORAGE_HARDENING_MIGRATION_DATABASE_CHECKSUM_DRIFT');
  }
  if (
    !foundationCleanupMigration.history_shape_valid
    || foundationCleanupMigration.history_row_count > 1
  ) {
    failures.push('FOUNDATION_STORAGE_CLEANUP_MIGRATION_HISTORY_INVALID');
  }
  if (
    foundationCleanupMigration.history_row_count > 0
    && foundationCleanupMigration.database_checksum_matches_source !== true
  ) {
    failures.push('FOUNDATION_STORAGE_CLEANUP_MIGRATION_DATABASE_CHECKSUM_DRIFT');
  }
  if (!cleanupMigration.history_shape_valid || cleanupMigration.history_row_count > 1) {
    failures.push('PACK_B_CLEANUP_MIGRATION_HISTORY_INVALID');
  }
  if (
    cleanupMigration.history_row_count > 0
    && cleanupMigration.database_checksum_matches_source !== true
  ) {
    failures.push('PACK_B_CLEANUP_MIGRATION_DATABASE_CHECKSUM_DRIFT');
  }
  if (!migration.history_shape_valid || migration.history_row_count > 1) {
    failures.push('PACK_B_MIGRATION_HISTORY_INVALID');
  }
  if (
    migration.history_row_count > 0
    && migration.database_checksum_matches_source !== true
  ) {
    failures.push('PACK_B_MIGRATION_DATABASE_CHECKSUM_DRIFT');
  }

  if (!tables.pack_a.exact) failures.push('PACK_A_34_TABLE_POPULATION_DRIFT');
  if (tables.approved_pack_a_and_b.extra.length > 0) {
    failures.push('PACK_A_B_UNAPPROVED_V2_TABLE_PRESENT');
  }
  if (migration.applied && !tables.pack_b.exact) {
    failures.push('PACK_B_6_TABLE_POPULATION_DRIFT');
  }
  if (!migration.applied && tables.pack_b.actual_count > 0) {
    failures.push('PACK_B_UNTRACKED_OR_PARTIAL_TABLE_POPULATION');
  }
  const pendingNonemptyEventTables = !eventStorageHardeningMigration.applied
    && eventStorageUpgradePreflight.nonempty_table_count > 0;
  const nonEventAuthorityCountDrift = Object.entries(
    summary.schema.pack_a_authority_rows.rows ?? {},
  ).some(([tableName, row]) => (
    !EXPERIMENT_V2_EVENT_TABLES.includes(tableName) && row.count_matches !== true
  ));
  if (
    !summary.schema.pack_a_authority_rows.exact
    && (!pendingNonemptyEventTables || nonEventAuthorityCountDrift)
  ) {
    failures.push('PACK_A_AUTHORITY_ROW_CENSUS_DRIFT');
  }
  if (summary.schema.pack_b_row_census.nonzero_table_count > 0) {
    failures.push('PACK_B_LOCAL_INITIAL_ROW_CENSUS_NONZERO');
  }
  if (!summary.legacy_sentinels.exact) {
    failures.push('PACK_B_LEGACY_SENTINEL_DIGEST_DRIFT');
  }
  if (summary.schema.cross_domain_foreign_keys.cross_domain_pi_fk_count !== 0) {
    failures.push('PACK_B_CROSS_DOMAIN_PI_FOREIGN_KEY');
  }
  if (cleanupMigration.applied && !summary.schema.pack_b_effective_schema.exact) {
    failures.push('PACK_B_EFFECTIVE_SCHEMA_HARDENING_DRIFT');
  }
  if (
    foundationCleanupMigration.applied
    && !summary.schema.foundation_storage_cleanup.exact
  ) {
    failures.push('FOUNDATION_STORAGE_CLEANUP_SCHEMA_DRIFT');
  }
  if (
    eventStorageHardeningMigration.applied
    && !summary.schema.event_storage_hardening.exact
  ) {
    failures.push('EVENT_STORAGE_HARDENING_SCHEMA_DRIFT');
  }
  if (
    !eventStorageHardeningMigration.applied
    && !summary.schema.event_storage_hardening.pending_baseline.exact
  ) {
    failures.push('EVENT_STORAGE_HARDENING_UNTRACKED_OR_PARTIAL_SCHEMA');
  }
  if (!eventStorageHardeningMigration.applied && !eventStorageUpgradePreflight.census_complete) {
    failures.push('EVENT_STORAGE_HARDENING_EVENT_TABLE_CENSUS_INCOMPLETE');
  }

  if (!summary.pack_a_cutover_config.valid) {
    failures.push('PACK_A_CUTOVER_CONFIG_INVALID');
  }
  if (!activation.valid) failures.push('PACK_B_ACTIVATION_CONFIG_INVALID');
  if (!activation.expected_state_matches) {
    if (activation.expected_workflow_simulation_enabled) {
      blockers.push('PACK_B_WORKFLOW_SIMULATION_NOT_ENABLED');
    } else {
      failures.push('PACK_B_WORKFLOW_SIMULATION_UNEXPECTEDLY_ENABLED');
    }
  }
  if (
    activation.expected_workflow_simulation_enabled
    && !activation.cutover.effective
  ) {
    blockers.push('PACK_A_CUTOVER_NOT_COMMITTED');
  }

  const prohibitedEffectCount = Object.values(summary.prohibited_effects)
    .reduce((sum, value) => sum + Number(value), 0);
  if (prohibitedEffectCount !== 0) failures.push('PACK_B_LOCAL_GATE_PROHIBITED_EFFECT');

  if (!migration.applied) blockers.push('PACK_B_MIGRATION_NOT_APPLIED');
  if (!cleanupMigration.applied) blockers.push('PACK_B_CLEANUP_MIGRATION_NOT_APPLIED');
  if (!foundationCleanupMigration.applied) {
    blockers.push('FOUNDATION_STORAGE_CLEANUP_MIGRATION_NOT_APPLIED');
  }
  if (!eventStorageHardeningMigration.applied) {
    if (eventStorageUpgradePreflight.nonempty_table_count > 0) {
      blockers.push('EVENT_STORAGE_HARDENING_NONEMPTY_EVENT_TABLES');
    }
    blockers.push('EVENT_STORAGE_HARDENING_MIGRATION_NOT_APPLIED');
  }
  if (!tables.pack_b.exact) blockers.push('PACK_B_V2_TABLES_NOT_READY');

  return {
    status: failures.length > 0 ? 'failed' : blockers.length > 0 ? 'blocked' : 'passed',
    failures: [...new Set(failures)],
    blockers: [...new Set(blockers)],
  };
}

async function main() {
  const { runId, expectSimulationEnabled, outputPath } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  let prisma = null;
  let target = null;

  globalThis.fetch = async () => {
    fetchCallCount += 1;
    throw new Error('PACK_B_LOCAL_GATE_EXTERNAL_REQUEST_BLOCKED');
  };

  let summary;
  try {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    target = sanitizeLocalDatabaseTarget(databaseUrl);
    const migrationSourceSha256 = crypto
      .createHash('sha256')
      .update(await fs.readFile(PACK_B_MIGRATION_PATH))
      .digest('hex');
    const cleanupMigrationSourceSha256 = crypto
      .createHash('sha256')
      .update(await fs.readFile(PACK_B_CLEANUP_MIGRATION_PATH))
      .digest('hex');
    const foundationCleanupMigrationSourceSha256 = crypto
      .createHash('sha256')
      .update(await fs.readFile(FOUNDATION_STORAGE_CLEANUP_MIGRATION_PATH))
      .digest('hex');
    const eventStorageHardeningMigrationSourceSha256 = crypto
      .createHash('sha256')
      .update(await fs.readFile(EVENT_STORAGE_HARDENING_MIGRATION_PATH))
      .digest('hex');
    const baselineManifestSha256 = await sha256File(PACK_B_LOCAL_BASELINE_MANIFEST_PATH);
    if (baselineManifestSha256 !== PACK_B_EXPECTED_LOCAL_BASELINE_MANIFEST_SHA256) {
      throw new Error('PACK_B_LOCAL_BASELINE_MANIFEST_DIGEST_DRIFT');
    }
    const activationConfig = evaluatePackBActivationConfig(
      process.env,
      expectSimulationEnabled,
    );
    const packACutoverConfig = evaluateCutoverConfig(process.env);

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    const evidence = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(READ_ONLY_TRANSACTION_STATEMENT);
      return collectDatabaseEvidence(tx);
    }, { timeout: 60_000, maxWait: 10_000 });

    const tablePopulation = comparePackBTablePopulation(evidence.actual_v2_table_names);
    const migration = buildMigrationEvidence(
      evidence.migration_rows.filter((row) => row.migration_name === PACK_B_MIGRATION_NAME),
      migrationSourceSha256,
    );
    const cleanupMigration = buildCleanupMigrationEvidence(
      evidence.migration_rows.filter(
        (row) => row.migration_name === PACK_B_CLEANUP_MIGRATION_NAME,
      ),
      cleanupMigrationSourceSha256,
    );
    const foundationCleanupMigration = buildFoundationStorageCleanupMigrationEvidence(
      evidence.migration_rows.filter(
        (row) => row.migration_name === FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME,
      ),
      foundationCleanupMigrationSourceSha256,
    );
    const eventStorageHardeningMigration = buildEventStorageHardeningMigrationEvidence(
      evidence.migration_rows.filter(
        (row) => row.migration_name === EVENT_STORAGE_HARDENING_MIGRATION_NAME,
      ),
      eventStorageHardeningMigrationSourceSha256,
    );
    const observedTargetFingerprint = evidence.identity
      ? fingerprintPackALocalTarget(evidence.identity)
      : null;
    const packAAuthorityRows = evaluateAuthorityRowCensus(evidence.pack_a_authority_digest);
    const packBRowCensus = evaluatePackBRowCensus(evidence.pack_b_row_census);
    const legacySentinels = evaluateLegacySentinelBaseline(evidence.legacy_digest);
    const foreignKeys = crossDomainPiForeignKeyEvidence(evidence.foreign_keys);

    summary = {
      run_id: runId,
      status: 'running',
      started_at: startedAt,
      finished_at: null,
      mode: 'read_only_named_local_pack_b_landing',
      baseline: {
        baseline_id: PACK_B_LOCAL_BASELINE_MANIFEST.baseline_id,
        baseline_kind: PACK_B_LOCAL_BASELINE_MANIFEST.baseline_kind,
        manifest_path: path.relative(REPO_ROOT, PACK_B_LOCAL_BASELINE_MANIFEST_PATH),
        manifest_sha256: baselineManifestSha256,
        refresh_policy: PACK_B_LOCAL_BASELINE_MANIFEST.refresh_policy,
      },
      expectation: {
        workflow_simulation_enabled: expectSimulationEnabled,
      },
      database_target: {
        ...target,
        effective_schema: evidence.identity?.schema_name ?? null,
        database_name_matches_url: evidence.identity?.database_name === target.database,
        transaction_read_only_verified: evidence.identity?.transaction_read_only === 'on',
        expected_target_fingerprint: PACK_B_LOCAL_BASELINE_MANIFEST.target.fingerprint,
        observed_target_fingerprint: observedTargetFingerprint,
        target_fingerprint_matches:
          observedTargetFingerprint === PACK_B_LOCAL_BASELINE_MANIFEST.target.fingerprint,
      },
      migration,
      cleanup_migration: cleanupMigration,
      foundation_cleanup_migration: foundationCleanupMigration,
      event_storage_hardening_migration: eventStorageHardeningMigration,
      schema: {
        table_population: tablePopulation,
        pack_a_authority_rows: packAAuthorityRows,
        pack_b_row_census: packBRowCensus,
        cross_domain_foreign_keys: foreignKeys,
        pack_b_effective_schema: evaluateEffectivePackBSchema(evidence),
        foundation_storage_cleanup: evaluateFoundationStorageCleanup(evidence),
        event_storage_hardening: evaluateEventStorageHardening(evidence),
        event_storage_upgrade_preflight:
          evaluateEventStorageUpgradePreflight(packAAuthorityRows),
      },
      legacy_sentinels: legacySentinels,
      pack_a_cutover_config: packACutoverConfig,
      activation_config: activationConfig,
      prohibited_effects: {
        database_mutations: 0,
        migration_commands: 0,
        environment_mutations: 0,
        provider_calls: 0,
        external_fetch_attempts: fetchCallCount,
        scientific_execution: 0,
      },
      redaction: {
        database_url_stored: false,
        database_username_stored: false,
        database_password_stored: false,
        legacy_row_payloads_stored: false,
      },
      failures: [],
      blockers: [],
    };
    const status = deriveStatus(summary);
    summary.status = status.status;
    summary.failures = status.failures;
    summary.blockers = status.blockers;
  } catch (error) {
    summary = {
      run_id: runId,
      status: 'failed',
      started_at: startedAt,
      finished_at: null,
      mode: 'read_only_named_local_pack_b_landing',
      expectation: {
        workflow_simulation_enabled: expectSimulationEnabled,
      },
      database_target: target ?? {
        loopback_enforced: true,
        database_url_stored: false,
        username_stored: false,
        password_stored: false,
      },
      failures: [{
        reason_code: 'PACK_B_LOCAL_GATE_EXECUTION_FAILED',
        message: safeMessage(error),
      }],
      blockers: [],
      prohibited_effects: {
        database_mutations: 0,
        migration_commands: 0,
        environment_mutations: 0,
        provider_calls: 0,
        external_fetch_attempts: fetchCallCount,
        scientific_execution: 0,
      },
      redaction: {
        database_url_stored: false,
        database_username_stored: false,
        database_password_stored: false,
        legacy_row_payloads_stored: false,
      },
    };
  } finally {
    globalThis.fetch = originalFetch;
    if (prisma) await prisma.$disconnect();
  }

  summary.finished_at = new Date().toISOString();
  await writeJsonAtomic(outputPath, summary);
  process.stdout.write(`${JSON.stringify({
    run_id: runId,
    status: summary.status,
    summary_path: path.relative(REPO_ROOT, outputPath),
  })}\n`);
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

async function collectDatabaseEvidence(tx) {
  const identityRows = await selectRows(
    tx,
    `SELECT current_database() AS database_name,
            current_schema() AS schema_name,
            current_setting('transaction_read_only') AS transaction_read_only,
            system_row.system_identifier::text AS system_identifier,
            database_row.oid::text AS database_oid,
            schema_row.oid::text AS schema_oid
     FROM pg_control_system() AS system_row
     JOIN pg_catalog.pg_database AS database_row
       ON database_row.datname = current_database()
     JOIN pg_catalog.pg_namespace AS schema_row
       ON schema_row.nspname = current_schema()`,
  );
  const actualV2TableRows = await selectRows(
    tx,
    `SELECT tablename AS table_name
     FROM pg_catalog.pg_tables
     WHERE schemaname = current_schema() AND tablename LIKE '%V2'
     ORDER BY tablename ASC`,
  );
  const actualV2TableNames = actualV2TableRows.map((row) => row.table_name);
  const actualV2TableSet = new Set(actualV2TableNames);
  const migrationTableRows = await selectRows(
    tx,
    `SELECT EXISTS (
       SELECT 1 FROM pg_catalog.pg_tables
       WHERE schemaname = current_schema() AND tablename = '_prisma_migrations'
     ) AS present`,
  );
  const migrationRows = migrationTableRows[0]?.present
    ? await selectRows(
      tx,
      `SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
              applied_steps_count
       FROM "_prisma_migrations"
       WHERE migration_name IN ($1, $2, $3, $4)
       ORDER BY started_at DESC`,
      PACK_B_MIGRATION_NAME,
      PACK_B_CLEANUP_MIGRATION_NAME,
      FOUNDATION_STORAGE_CLEANUP_MIGRATION_NAME,
      EVENT_STORAGE_HARDENING_MIGRATION_NAME,
    )
    : [];
  const foreignKeys = await selectRows(
    tx,
    `SELECT constraint_row.conname AS constraint_name,
            source_table.relname AS source_table,
            target_table.relname AS target_table,
            pg_get_constraintdef(constraint_row.oid) AS definition,
            constraint_row.confdeltype AS delete_action,
            constraint_row.confupdtype AS update_action
     FROM pg_catalog.pg_constraint AS constraint_row
     JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
     JOIN pg_catalog.pg_class AS target_table ON target_table.oid = constraint_row.confrelid
     JOIN pg_catalog.pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
     JOIN pg_catalog.pg_namespace AS target_namespace ON target_namespace.oid = target_table.relnamespace
     WHERE constraint_row.contype = 'f'
       AND source_namespace.nspname = current_schema()
       AND target_namespace.nspname = current_schema()
     ORDER BY source_table.relname, constraint_row.conname`,
  );
  const packBIndexRows = await selectRows(
    tx,
    `SELECT indexname AS index_name, indexdef AS definition
     FROM pg_catalog.pg_indexes
     WHERE schemaname = current_schema()
       AND tablename = ANY($1::text[])
     ORDER BY indexname ASC`,
    PACK_B_V2_TABLES,
  );
  const packBCheckRows = await selectRows(
    tx,
    `SELECT constraint_row.conname AS constraint_name,
            pg_get_constraintdef(constraint_row.oid) AS definition
     FROM pg_catalog.pg_constraint AS constraint_row
     JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
     JOIN pg_catalog.pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
     WHERE constraint_row.contype = 'c'
       AND source_namespace.nspname = current_schema()
       AND source_table.relname = ANY($1::text[])
     ORDER BY constraint_row.conname ASC`,
    PACK_B_V2_TABLES,
  );
  const collectionSequenceRows = await selectRows(
    tx,
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'ExperimentFoundationCollectionAttemptV2'
         AND column_name = 'collectionSequence'
    ) AS present`,
  );
  const foundationPlaceholderColumns = await selectRows(
    tx,
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND (
         (table_name = 'ExperimentFoundationVersionLockV2'
          AND column_name IN ('lockSchemaVersion', 'resolvedLockJson'))
         OR
         (table_name IN (
            'ExperimentFoundationDatasetV2',
            'ExperimentFoundationDataPolicyV2',
            'ExperimentFoundationMetricDefinitionV2',
            'ExperimentFoundationBenchmarkV2',
            'ExperimentFoundationEvaluationProtocolV2'
          )
          AND column_name IN ('draftSchemaVersion', 'draftHash'))
       )
     ORDER BY table_name, column_name`,
  );
  const foundationPlaceholderIndexes = await selectRows(
    tx,
    `SELECT indexname AS index_name
     FROM pg_catalog.pg_indexes
     WHERE schemaname = current_schema()
       AND indexname = ANY($1::text[])
     ORDER BY indexname`,
    FOUNDATION_REMOVED_PLACEHOLDER_INDEXES,
  );
  const eventStorageColumns = await selectRows(
    tx,
    `SELECT table_name, column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])
       AND column_name = ANY($2::text[])
     ORDER BY table_name, column_name`,
    EXPERIMENT_V2_EVENT_TABLES,
    ['branchKey', 'eventEnvelopeHash', 'eventPayloadJson'],
  );
  const experimentV2VersionChecks = await selectRows(
    tx,
    `SELECT constraint_row.conname AS constraint_name,
            source_table.relname AS source_table,
            pg_get_constraintdef(constraint_row.oid) AS definition
     FROM pg_catalog.pg_constraint AS constraint_row
     JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
     JOIN pg_catalog.pg_namespace AS source_namespace
       ON source_namespace.oid = source_table.relnamespace
     WHERE constraint_row.contype = 'c'
       AND source_namespace.nspname = current_schema()
       AND constraint_row.conname = ANY($1::text[])
     ORDER BY constraint_row.conname ASC`,
    Object.keys(EXPERIMENT_V2_FIXED_VERSION_CHECKS),
  );

  const packARowsByTable = {};
  for (const tableName of PACK_A_V2_TABLES) {
    if (!actualV2TableSet.has(tableName)) continue;
    packARowsByTable[tableName] = await readIdOrderedRows(tx, tableName);
  }
  const packBRowCensus = {};
  for (const tableName of PACK_B_V2_TABLES) {
    const present = actualV2TableSet.has(tableName);
    packBRowCensus[tableName] = {
      present,
      count: present ? await readTableCount(tx, tableName) : null,
    };
  }

  const legacyRowsByTable = {};
  for (const tableName of LEGACY_SENTINEL_TABLES) {
    legacyRowsByTable[tableName] = (await selectRows(
      tx,
      `SELECT to_jsonb(table_row) AS row_json
       FROM ${quoteIdentifier(tableName)} AS table_row
       ORDER BY table_row."id" COLLATE "C" ASC`,
    )).map((row) => row.row_json);
  }

  return {
    identity: identityRows[0] ?? null,
    actual_v2_table_names: actualV2TableNames,
    migration_rows: migrationRows,
    foreign_keys: foreignKeys,
    pack_b_indexes: packBIndexRows,
    pack_b_checks: packBCheckRows,
    collection_sequence_column_present: collectionSequenceRows[0]?.present === true,
    foundation_placeholder_columns: foundationPlaceholderColumns,
    foundation_placeholder_indexes: foundationPlaceholderIndexes,
    event_storage_columns: eventStorageColumns,
    experiment_v2_version_checks: experimentV2VersionChecks,
    pack_a_authority_digest: digestAuthorityIdOrderedRows(packARowsByTable),
    pack_b_row_census: packBRowCensus,
    legacy_digest: digestLegacyIdOrderedRows(legacyRowsByTable),
  };
}

async function readTableCount(tx, tableName) {
  const rows = await selectRows(
    tx,
    `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`,
  );
  return rows[0]?.count ?? 0;
}

async function readIdOrderedRows(tx, tableName) {
  return (await selectRows(
    tx,
    `SELECT to_jsonb(table_row) AS row_json
     FROM ${quoteIdentifier(tableName)} AS table_row
     ORDER BY table_row."id" COLLATE "C" ASC`,
  )).map((row) => row.row_json);
}

async function selectRows(tx, sql, ...parameters) {
  if (!/^\s*SELECT\b/i.test(sql)) {
    throw new Error('PACK_B_LOCAL_GATE_NON_SELECT_SQL_REFUSED');
  }
  return tx.$queryRawUnsafe(sql, ...parameters);
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) throw new Error('Unsafe SQL identifier');
  return `"${value}"`;
}

function isoOrNull(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function safeMessage(error) {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-database-url]')
    .replaceAll(/password=[^\s]+/gi, 'password=[redacted]')
    .slice(0, 2_000);
}

function isDirectRun(metaUrl = import.meta.url, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(argvEntry);
}

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${safeMessage(error)}\n`);
    process.exitCode = 1;
  });
}
