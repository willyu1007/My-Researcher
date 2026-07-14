#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Prisma } from '@prisma/client';

import {
  assertSanitizedJson,
  EXPERIMENT_V2_SHA256_REF_PATTERN,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEMP_ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  '.ai/.tmp/experiment-foundation-productization',
);
const DURABLE_ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  'dev-docs/active/experiment-foundation-productization-closure/artifacts/db/pack-b-local-development-20260714',
);
const PRODUCER_PATH = fileURLToPath(import.meta.url);
const REVIEWED_TARGET_FINGERPRINT =
  'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0';
const REVIEWED_APPLICATION_SCHEMA = 'my_researcher_dev';
const REVIEWED_TABLE_CENSUS = Object.freeze({
  row_digest_profile: 'sha256-length-prefixed-pg-jsonb-text-primary-key-order@v2',
  census_transport: 'read-only-repeatable-read-cursor@v1',
  ordering_key_profile: 'catalog-primary-key-columns@v1',
  fetch_row_limit: 64,
  statement_timeout_ms: 30_000,
  lock_timeout_ms: 5_000,
  transaction_timeout_ms: 600_000,
  work_mem_kib: 4_096,
});
const PACK_B_TABLES = Object.freeze([
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationProvisionalOutputV2',
]);
const BACKGROUND_DRAIN_GUARD_TABLES = Object.freeze([
  'ExperimentFoundationIntegrationOutboxV2',
  'PaperImplementationExperimentIntegrationOutboxV2',
]);
const PROHIBITED_EFFECT_KEYS = Object.freeze([
  'database_mutations',
  'migration_commands',
  'environment_mutations',
  'provider_calls',
  'external_fetch_attempts',
  'scientific_execution',
]);
const REDACTION_KEYS = Object.freeze([
  'database_url_stored',
  'database_username_stored',
  'database_password_stored',
  'legacy_row_payloads_stored',
]);
export const EXPECTED_APPLICATION_TABLES = Object.freeze([...new Set([
  ...Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name),
  '_prisma_migrations',
])].sort());
const EXPECTED_PROBES = {
  disabled: {
    simulation: [409, 'VERSION_CONFLICT', 'EF_V2_WORKFLOW_SIMULATION_DISABLED'],
    legacy_mutation: [409, 'GATE_CONSTRAINT_FAILED', 'LEGACY_RECORD_NOT_ELIGIBLE'],
    status_read: [404, 'NOT_FOUND', 'EXECUTION_HEAD_ACK_REQUIRED'],
  },
  enabled: {
    simulation: [404, 'NOT_FOUND', 'EXECUTION_HEAD_ACK_REQUIRED'],
    legacy_mutation: [409, 'GATE_CONSTRAINT_FAILED', 'LEGACY_RECORD_NOT_ELIGIBLE'],
    status_read: [404, 'NOT_FOUND', 'EXECUTION_HEAD_ACK_REQUIRED'],
  },
};

export function parseArgs(argv) {
  let appSmokePath = null;
  let localGatePath = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--app-smoke') {
      appSmokePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argv[index] === '--local-gate') {
      localGatePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!appSmokePath || !localGatePath) {
    throw new Error('--app-smoke and --local-gate are required');
  }
  const resolved = {
    appSmokePath: path.resolve(REPO_ROOT, appSmokePath),
    localGatePath: path.resolve(REPO_ROOT, localGatePath),
  };
  for (const inputPath of Object.values(resolved)) {
    if (!inputPath.startsWith(`${TEMP_ARTIFACT_ROOT}${path.sep}`)) {
      throw new Error('Source evidence must be under the Pack B temporary artifact root');
    }
  }
  if (path.dirname(resolved.appSmokePath) !== path.dirname(resolved.localGatePath)) {
    throw new Error('Source evidence must come from the same Pack B run directory');
  }
  return resolved;
}

export function applicationTableSetDigest(tableNames) {
  return `sha256:${crypto
    .createHash('sha256')
    .update(JSON.stringify([...tableNames].sort()))
    .digest('hex')}`;
}

function assertSnapshotShape(snapshot, expectedTableNames, label) {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') {
    throw new Error(`Pack B app-smoke ${label} snapshot is invalid`);
  }
  const tableNames = Object.keys(snapshot);
  if (JSON.stringify(tableNames) !== JSON.stringify(expectedTableNames)) {
    throw new Error(`Pack B app-smoke ${label} snapshot table set is invalid`);
  }
  for (const [tableName, row] of Object.entries(snapshot)) {
    if (
      !Number.isSafeInteger(row?.count)
      || row.count < 0
      || !EXPERIMENT_V2_SHA256_REF_PATTERN.test(row?.digest ?? '')
    ) {
      throw new Error(`Pack B app-smoke ${label} snapshot row is invalid: ${tableName}`);
    }
  }
}

function isExactRecordWithValues(value, expectedKeys, isExpectedValue) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false;
  const actualKeys = Object.keys(value).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify([...expectedKeys].sort())) return false;
  return expectedKeys.every((key) => isExpectedValue(value[key]));
}

export function buildDurableAppSmoke(source, provenance) {
  if (source?.schema_version !== 'experiment-foundation-packb-local-app-smoke@v5') {
    throw new Error('Unsupported Pack B app-smoke evidence schema');
  }
  if (
    source.target_fingerprint !== REVIEWED_TARGET_FINGERPRINT
    || source.target_class !== 'named_loopback_local_development'
    || source.composition?.paper_implementation_repository !== 'prisma'
    || source.composition?.experiment_foundation_repository !== 'prisma'
    || source.composition?.auto_pull_scheduler_enabled !== false
    || source.composition?.background_work_enabled !== false
    || source.network_transport !== 'hard_denied_by_throwing_fetch'
    || source.sensitive_values_stored !== false
  ) {
    throw new Error('Pack B app-smoke composition/target/redaction contract is invalid');
  }
  for (const mode of ['disabled', 'enabled']) {
    if (source[mode]?.workflow_simulation_enabled !== (mode === 'enabled')) {
      throw new Error(`Pack B app-smoke ${mode} capability state is invalid`);
    }
    for (const operation of ['simulation', 'legacy_mutation', 'status_read']) {
      const actual = source[mode]?.[operation];
      const [statusCode, errorCode, reasonCode] = EXPECTED_PROBES[mode][operation];
      if (
        actual?.status_code !== statusCode
        || actual?.error_code !== errorCode
        || actual?.reason_code !== reasonCode
      ) {
        throw new Error(`Pack B app-smoke ${mode}/${operation} probe tuple is invalid`);
      }
    }
  }
  if (
    source.measured_effects?.changed_table_count !== 0
    || source.measured_effects?.external_fetch_attempts !== 0
    || source.measured_effects?.provider_command_row_delta !== 0
  ) {
    throw new Error('Pack B app-smoke evidence contains a prohibited effect');
  }
  const expectedTableNames = [...EXPECTED_APPLICATION_TABLES];
  const expectedTableSetDigest = applicationTableSetDigest(expectedTableNames);
  const inspectedTables = source.measured_effects?.inspected_tables;
  const inventory = source.application_table_inventory;
  if (
    !Array.isArray(inspectedTables)
    || JSON.stringify(inspectedTables) !== JSON.stringify(expectedTableNames)
    || source.measured_effects?.measured_table_count !== expectedTableNames.length
    || source.measured_effects?.application_table_set_digest !== expectedTableSetDigest
    || inventory?.source !== 'pg_catalog.pg_class@current_schema/base_and_partitioned_tables'
    || inventory?.schema !== REVIEWED_APPLICATION_SCHEMA
    || inventory?.expected_table_count !== expectedTableNames.length
    || inventory?.observed_table_count !== expectedTableNames.length
    || inventory?.expected_table_set_digest !== expectedTableSetDigest
    || inventory?.observed_table_set_digest !== expectedTableSetDigest
    || Object.entries(REVIEWED_TABLE_CENSUS).some(
      ([key, expected]) => inventory?.[key] !== expected,
    )
    || inventory?.exact !== true
  ) {
    throw new Error('Pack B app-smoke full application table inventory is invalid');
  }
  const before = source.measured_effects?.application_table_snapshots_before;
  const after = source.measured_effects?.application_table_snapshots_after;
  assertSnapshotShape(before, expectedTableNames, 'before');
  assertSnapshotShape(after, expectedTableNames, 'after');
  if (
    JSON.stringify(before) !== JSON.stringify(after)
    || !Array.isArray(source.measured_effects?.changed_tables)
    || source.measured_effects.changed_tables.length !== 0
  ) {
    throw new Error('Pack B app-smoke full application table snapshots changed');
  }
  if (PACK_B_TABLES.some((tableName) => before[tableName]?.count !== 0)) {
    throw new Error('Pack B app-smoke Pack B drain prerequisites were not empty');
  }
  const backgroundDrainGuards = source.measured_effects?.background_drain_guard_counts;
  if (
    JSON.stringify(Object.keys(backgroundDrainGuards ?? {}).sort())
      !== JSON.stringify([...BACKGROUND_DRAIN_GUARD_TABLES])
    || Object.values(backgroundDrainGuards).some((count) => count !== 0)
  ) {
    throw new Error('Pack B app-smoke background drain prerequisites were not empty');
  }
  return assertSanitizedJson({
    ...source,
    durable_artifact_provenance: provenance,
  }, 'Pack B durable app-smoke evidence');
}

export function buildDurableLocalGateSummary(source, provenance) {
  if (source?.status !== 'passed' || source?.mode !== 'read_only_named_local_pack_b_landing') {
    throw new Error('Only a passed read-only Pack B named-local gate may be published');
  }
  if (
    !Array.isArray(source.failures) || source.failures.length !== 0
    || !Array.isArray(source.blockers) || source.blockers.length !== 0
    || source.database_target?.transaction_read_only_verified !== true
    || source.migration?.applied !== true
    || source.migration?.source_digest_matches_expected !== true
    || source.migration?.database_checksum_matches_source !== true
    || source.cleanup_migration?.applied !== true
    || source.cleanup_migration?.source_digest_matches_expected !== true
    || source.cleanup_migration?.database_checksum_matches_source !== true
    || source.foundation_cleanup_migration?.applied !== true
    || source.foundation_cleanup_migration?.source_digest_matches_expected !== true
    || source.foundation_cleanup_migration?.database_checksum_matches_source !== true
    || source.event_storage_hardening_migration?.applied !== true
    || source.event_storage_hardening_migration?.source_digest_matches_expected !== true
    || source.event_storage_hardening_migration?.database_checksum_matches_source !== true
    || source.schema?.table_population?.pack_a?.exact !== true
    || source.schema?.table_population?.pack_b?.exact !== true
    || source.schema?.table_population?.approved_pack_a_and_b?.exact !== true
    || source.schema?.pack_a_authority_rows?.exact !== true
    || source.schema?.pack_b_row_census?.all_present_and_zero !== true
    || source.schema?.pack_b_row_census?.total_row_count !== 0
    || source.schema?.pack_b_effective_schema?.exact !== true
    || source.schema?.foundation_storage_cleanup?.exact !== true
    || source.schema?.event_storage_hardening?.exact !== true
    || source.schema?.cross_domain_foreign_keys?.cross_domain_pi_fk_count !== 0
    || source.legacy_sentinels?.exact !== true
    || !isExactRecordWithValues(
      source.prohibited_effects,
      PROHIBITED_EFFECT_KEYS,
      (value) => typeof value === 'number' && Number.isFinite(value) && value === 0,
    )
    || !isExactRecordWithValues(
      source.redaction,
      REDACTION_KEYS,
      (value) => typeof value === 'boolean' && value === false,
    )
  ) {
    throw new Error('Pack B local gate is missing mandatory closure evidence');
  }
  if (
    source.database_target?.observed_target_fingerprint !== REVIEWED_TARGET_FINGERPRINT
    || source.database_target?.target_fingerprint_matches !== true
  ) {
    throw new Error('Pack B local gate target fingerprint is not the reviewed target');
  }
  const tablePopulation = source.schema?.table_population;
  const authority = source.schema?.pack_a_authority_rows;
  const packBRows = source.schema?.pack_b_row_census;
  const legacy = source.legacy_sentinels;
  const summary = {
    schema_version: 'experiment-foundation-packb-local-landing-summary@v4',
    run_id: source.run_id,
    generated_at: new Date().toISOString(),
    status: source.status,
    failures: source.failures,
    blockers: source.blockers,
    baseline: source.baseline,
    target_fingerprint: source.database_target?.observed_target_fingerprint,
    migration: source.migration,
    cleanup_migration: source.cleanup_migration ?? null,
    foundation_cleanup_migration: source.foundation_cleanup_migration ?? null,
    event_storage_hardening_migration: source.event_storage_hardening_migration ?? null,
    table_population: {
      pack_a: `${tablePopulation?.pack_a?.actual_count}/${tablePopulation?.pack_a?.expected_count}`,
      pack_b: `${tablePopulation?.pack_b?.actual_count}/${tablePopulation?.pack_b?.expected_count}`,
      approved_combined:
        `${tablePopulation?.approved_pack_a_and_b?.actual_count}/${tablePopulation?.approved_pack_a_and_b?.expected_count}`,
      pack_b_total_rows: packBRows?.total_row_count,
      cross_domain_pi_foreign_keys:
        source.schema?.cross_domain_foreign_keys?.cross_domain_pi_fk_count,
      foundation_storage_cleanup_exact:
        source.schema?.foundation_storage_cleanup?.exact,
      event_storage_hardening_exact:
        source.schema?.event_storage_hardening?.exact,
    },
    authority_baseline: {
      pack_a_rows: authority?.actual_total_count,
      pack_a_digest: authority?.aggregate_digest,
      legacy_rows: legacy?.aggregate_count,
      legacy_digest: legacy?.aggregate_digest,
    },
    configuration: {
      repository_default_simulation_enabled: false,
      observed_local_simulation_enabled:
        source.activation_config?.workflow_simulation?.effective,
      pack_a_cutover_committed: source.activation_config?.cutover?.effective,
    },
    prohibited_effects: source.prohibited_effects,
    redaction: source.redaction,
    durable_artifact_provenance: provenance,
  };
  return assertSanitizedJson(summary, 'Pack B durable local-gate summary');
}

export function assertEvidenceIdentity(appSmoke, localGate) {
  if (
    appSmoke.run_id !== localGate.run_id
    || appSmoke.target_fingerprint
      !== localGate.database_target?.observed_target_fingerprint
  ) {
    throw new Error('Pack B app-smoke and local-gate evidence identity mismatch');
  }
}

async function main() {
  const { appSmokePath, localGatePath } = parseArgs(process.argv.slice(2));
  const [appSmoke, localGate, producerSha256, appSmokeSha256, localGateSha256] = await Promise.all([
    fs.readFile(appSmokePath, 'utf8').then(JSON.parse),
    fs.readFile(localGatePath, 'utf8').then(JSON.parse),
    sha256File(PRODUCER_PATH),
    sha256File(appSmokePath),
    sha256File(localGatePath),
  ]);
  assertEvidenceIdentity(appSmoke, localGate);
  const producer = {
    producer_path: path.relative(REPO_ROOT, PRODUCER_PATH),
    producer_sha256: producerSha256,
  };
  const durableAppSmoke = buildDurableAppSmoke(appSmoke, {
    ...producer,
    source_artifact_path: path.relative(REPO_ROOT, appSmokePath),
    source_artifact_sha256: appSmokeSha256,
  });
  const durableLocalGate = buildDurableLocalGateSummary(localGate, {
    ...producer,
    source_artifact_path: path.relative(REPO_ROOT, localGatePath),
    source_artifact_sha256: localGateSha256,
  });
  const appOutput = path.join(DURABLE_ARTIFACT_ROOT, '05-app-composition-smoke.json');
  const gateOutput = path.join(DURABLE_ARTIFACT_ROOT, '06-final-gate-summary.json');
  await writeJsonAtomic(appOutput, durableAppSmoke);
  await writeJsonAtomic(gateOutput, durableLocalGate);
  process.stdout.write(`${JSON.stringify({
    status: 'published',
    outputs: [path.relative(REPO_ROOT, appOutput), path.relative(REPO_ROOT, gateOutput)],
  })}\n`);
}

function isDirectRun(metaUrl = import.meta.url, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(argvEntry);
}

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
