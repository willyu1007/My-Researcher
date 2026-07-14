#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  buildSafeChildEnv,
  describeEnvironmentIsolation,
} from './lib/hermetic-child-env.mjs';
import {
  EXPERIMENT_V2_EVENT_TABLES,
  EXPERIMENT_V2_FIXED_VERSION_CHECKS,
  PACK_A_EXPECTED_FOREIGN_KEY_COUNT,
} from './lib/experiment-v2-schema-hardening.mjs';
import {
  exactPassingTapOutcome,
  EXPERIMENT_V2_SHA256_REF_PATTERN,
  sha256File,
  writeJsonAtomic as writeJson,
} from './lib/experiment-v2-evidence.mjs';
import {
  digestExperimentFoundationD19SourcePolicy,
  EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
  EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS,
  parseExperimentFoundationD19SourcePolicy,
} from '../../packages/shared/src/research-lifecycle/experiment-foundation-d19-source-policy.mjs';
import {
  markDisposableDatabase as markSharedDisposableDatabase,
  resetDisposablePostgresPublicSchema,
  runCommand,
  safeCommandTail,
  startDisposablePostgres as startSharedDisposablePostgres,
  stopDisposablePostgres as stopSharedDisposablePostgres,
} from './lib/disposable-postgres.mjs';

export { buildSafeChildEnv, describeEnvironmentIsolation };

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
export const DEFAULT_POSTGRES_IMAGE =
  'pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9';
const APPROVED_POSTGRES_IMAGE_REPOSITORY = 'pgvector/pgvector';
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql',
);
const FOUNDATION_CLEANUP_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260714190000_remove_experiment_foundation_v2_placeholders/migration.sql',
);
const EVENT_STORAGE_HARDENING_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260714210000_normalize_experiment_v2_event_payloads/migration.sql',
);
const PACK_A_RELATIONAL_TEST_FILES = [
  'src/repositories/prisma/prisma-experiment-foundation-v2-lifecycle.integration.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-v2-relational.integration.test.ts',
  'src/repositories/prisma/prisma-paper-implementation-experiment-v2-relational.integration.test.ts',
];
const REQUIRED_CHECK_IDS = [
  'A01', 'A02', 'A03', 'A04',
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10',
];
const SOURCE_POLICY_SLOTS = EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS.map((slot) => ({
  slot,
}));

export function parseArgs(argv) {
  let runId = null;
  let postgresImage = DEFAULT_POSTGRES_IMAGE;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argv[index] === '--postgres-image') {
      postgresImage = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!runId) {
    throw new Error('--run-id is required');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('run-id must be 1..64 safe filename characters and cannot contain path separators');
  }
  const imageMatch = postgresImage.match(
    /^([A-Za-z0-9][A-Za-z0-9._/-]*)@sha256:([0-9a-f]{64})$/,
  );
  if (
    !imageMatch
    || imageMatch[1] !== APPROVED_POSTGRES_IMAGE_REPOSITORY
    || postgresImage !== DEFAULT_POSTGRES_IMAGE
  ) {
    throw new Error(
      `postgres-image must equal the reviewed digest-pinned ${APPROVED_POSTGRES_IMAGE_REPOSITORY} image`,
    );
  }
  return { runId, postgresImage };
}

export function inspectFoundationCleanupMigration(sql) {
  if (typeof sql !== 'string' || sql.trim() === '') {
    throw new Error('Foundation cleanup migration SQL must be non-empty text');
  }
  const statements = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const removedIndexes = [
    'ef_dataset_v2_draft_hash_idx',
    'ef_data_policy_v2_draft_hash_idx',
    'ef_metric_definition_v2_draft_hash_idx',
    'ef_benchmark_v2_draft_hash_idx',
    'ef_evaluation_protocol_v2_draft_hash_idx',
  ];
  const assetTables = [
    'ExperimentFoundationDatasetV2',
    'ExperimentFoundationDataPolicyV2',
    'ExperimentFoundationMetricDefinitionV2',
    'ExperimentFoundationBenchmarkV2',
    'ExperimentFoundationEvaluationProtocolV2',
  ];
  const expectedStatements = [
    'ALTER TABLE "ExperimentFoundationVersionLockV2" '
      + 'DROP COLUMN "lockSchemaVersion", DROP COLUMN "resolvedLockJson"',
    ...removedIndexes.map((indexName) => `DROP INDEX "${indexName}"`),
    ...assetTables.map((tableName) => (
      `ALTER TABLE "${tableName}" DROP COLUMN "draftSchemaVersion", DROP COLUMN "draftHash"`
    )),
  ];
  if (JSON.stringify(statements) !== JSON.stringify(expectedStatements)) {
    throw new Error(
      'Foundation cleanup must remove exactly the reviewed never-read columns and indexes',
    );
  }
  return {
    removed_placeholder_columns: {
      ExperimentFoundationVersionLockV2: ['lockSchemaVersion', 'resolvedLockJson'],
      ...Object.fromEntries(assetTables.map((tableName) => [
        tableName,
        ['draftSchemaVersion', 'draftHash'],
      ])),
    },
    removed_indexes: removedIndexes,
  };
}

export function inspectEventStorageHardeningMigration(sql) {
  if (typeof sql !== 'string' || sql.trim() === '') {
    throw new Error('Event storage hardening migration SQL must be non-empty text');
  }
  const uncommented = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  const normalized = uncommented.replace(/\s+/g, ' ').trim();
  const statements = normalized
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const tableName of EXPERIMENT_V2_EVENT_TABLES) {
    const expected = `ALTER TABLE "${tableName}" ADD COLUMN "branchKey" TEXT NOT NULL, ADD COLUMN "eventEnvelopeHash" TEXT NOT NULL`;
    if (!normalized.includes(expected)) {
      throw new Error(`Event storage hardening is missing exact columns for ${tableName}`);
    }
  }
  if (
    statements.some((statement) => (
      /^(?:(?:CREATE|DROP)\s+TABLE|INSERT|UPDATE|DELETE|WITH)\b/i.test(statement)
    ))
    || /\bCASCADE\b/i.test(normalized)
  ) {
    throw new Error('Event storage hardening contains a forbidden table, data, or cascade operation');
  }
  if (/ADD COLUMN "eventPayloadJson"/i.test(normalized)) {
    throw new Error('Event storage hardening must not create a second event payload authority');
  }

  const foreignKeyStatements = statements
    .filter((statement) => statement.includes(' FOREIGN KEY '));
  if (
    foreignKeyStatements.length !== PACK_A_EXPECTED_FOREIGN_KEY_COUNT
    || foreignKeyStatements.some((statement) => (
      !/^ALTER TABLE "[^"]+" DROP CONSTRAINT "([^"]+)", ADD CONSTRAINT "\1" FOREIGN KEY .+ ON DELETE RESTRICT ON UPDATE RESTRICT$/.test(statement)
    ))
  ) {
    throw new Error('Event storage hardening must rebuild exactly 38 Pack A FKs as double RESTRICT');
  }

  for (const [constraintName, columnName] of Object.entries(EXPERIMENT_V2_FIXED_VERSION_CHECKS)) {
    const expected = `ADD CONSTRAINT "${constraintName}" CHECK ("${columnName}" = 'v1')`;
    if (!normalized.includes(expected)) {
      throw new Error(`Event storage hardening is missing fixed version check ${constraintName}`);
    }
  }
  const fixedVersionCheckCount = [...normalized.matchAll(
    /ADD CONSTRAINT "[^"]+_schema_check" CHECK \("[^"]+" = 'v1'\)/g,
  )].length;
  if (fixedVersionCheckCount !== Object.keys(EXPERIMENT_V2_FIXED_VERSION_CHECKS).length) {
    throw new Error('Event storage hardening fixed version CHECK census drifted');
  }
  return {
    payload_only_event_table_count: EXPERIMENT_V2_EVENT_TABLES.length,
    added_structural_column_count: EXPERIMENT_V2_EVENT_TABLES.length * 2,
    hardened_pack_a_foreign_key_count: foreignKeyStatements.length,
    fixed_version_check_count: fixedVersionCheckCount,
    cascade_operation_count: 0,
  };
}

async function run(argv, options = {}) {
  return runCommand(argv, {
    ...options,
    cwd: options.cwd ?? REPO_ROOT,
    destroyOutputOnTimeout: true,
    timeoutMessage: (timeoutMs) => `Process timed out after ${timeoutMs}ms.`,
  });
}

function safeTail(value) {
  return safeCommandTail(value, 4_000);
}

async function startDisposablePostgres(runId, postgresImage) {
  const disposable = await startSharedDisposablePostgres({
    runId,
    postgresImage,
    runCommand: run,
    safeTail,
    databasePrefixes: ['d19'],
    containerNamePrefix: 'pea-d19',
    portResolutionErrorMessage: 'Unable to resolve disposable PostgreSQL host port',
    portWaitErrorMessage: 'Disposable PostgreSQL did not become reachable before timeout',
    postgresWaitErrorMessage: 'Disposable PostgreSQL did not become ready before timeout',
    startupFailureMessage: 'Disposable PostgreSQL startup failed',
    pgIsReadyArguments: (databaseName) => [
      'pg_isready', '--quiet', '--username', 'postgres', '--dbname', databaseName,
    ],
  });
  return {
    containerName: disposable.containerName,
    image: disposable.image,
    nonce: disposable.nonce,
    databaseName: disposable.databaseNames.d19,
    databaseUrl: disposable.databaseUrls.d19,
  };
}

async function markDisposableDatabase(disposable) {
  const marker = `experiment-foundation-d19-disposable:${disposable.nonce}`;
  return markSharedDisposableDatabase({
    runCommand: run,
    safeTail,
    containerName: disposable.containerName,
    databaseName: disposable.databaseName,
    marker,
    failureMessage: 'Cannot mark disposable D-19 database',
  });
}

async function stopDisposablePostgres(containerName) {
  return stopSharedDisposablePostgres(containerName, { runCommand: run });
}

async function inspectFoundationStorageCleanup(disposable) {
  const result = await run([
    'docker', 'exec', disposable.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres', '-d', disposable.databaseName,
    '-c', [
      'SELECT column_name',
      'FROM information_schema.columns',
      "WHERE table_schema = 'public'",
      'AND (',
      "  (table_name = 'ExperimentFoundationVersionLockV2'",
      "   AND column_name IN ('lockSchemaVersion', 'resolvedLockJson'))",
      '  OR',
      "  (table_name IN ('ExperimentFoundationDatasetV2', 'ExperimentFoundationDataPolicyV2',",
      "                  'ExperimentFoundationMetricDefinitionV2', 'ExperimentFoundationBenchmarkV2',",
      "                  'ExperimentFoundationEvaluationProtocolV2')",
      "   AND column_name IN ('draftSchemaVersion', 'draftHash'))",
      ')',
      'ORDER BY table_name, column_name',
    ].join(' '),
  ], { timeoutMs: 30_000 });
  if (result.exit_code !== 0) {
    throw new Error(`Cannot inspect foundation storage cleanup: ${safeTail(result.stderr)}`);
  }
  const remainingPlaceholderColumns = result.stdout
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  if (remainingPlaceholderColumns.length !== 0) {
    throw new Error(
      `Foundation placeholder columns remain: ${remainingPlaceholderColumns.join(', ')}`,
    );
  }
  return { remaining_placeholder_columns: remainingPlaceholderColumns };
}

export async function sourcePolicyStatus(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const now = options.now ?? new Date();
  const policyPath = (
    options.policyPath
    ?? process.env.EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_ATTESTATION_PATH
    ?? ''
  ).trim();
  if (!policyPath) {
    return {
      status: 'blocked',
      reason_code: 'SOURCE_POLICY_UNRESOLVED',
      summary: 'Original-source license/access attestations for both RAGPerf datasets were not supplied.',
    };
  }
  const resolved = path.resolve(repoRoot, policyPath);
  if (path.isAbsolute(policyPath) || !isPathInside(repoRoot, resolved)) {
    return {
      status: 'blocked',
      reason_code: 'SOURCE_POLICY_PATH_INVALID',
      summary: 'Source-policy attestation must be a repository-relative file.',
    };
  }
  try {
    const [realRepoRoot, realPath] = await Promise.all([
      fs.realpath(repoRoot),
      fs.realpath(resolved),
    ]);
    if (!isPathInside(realRepoRoot, realPath)) {
      return {
        status: 'blocked',
        reason_code: 'SOURCE_POLICY_PATH_INVALID',
        summary: 'Source-policy attestation must resolve inside the repository.',
      };
    }
    const parsed = JSON.parse(await fs.readFile(realPath, 'utf8'));
    const attestation = validateSourcePolicyAttestation(parsed, { now });
    const attestationDigest = canonicalSourcePolicyAttestationDigest(attestation);
    if (attestationDigest !== EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST) {
      throw new Error('attestation does not match the reviewed Pack A semantic digest');
    }
    return {
      status: 'pending_exact_binding',
      reason_code: null,
      summary: 'Source-policy attestation is structurally valid and awaits exact fixture binding.',
      evidence_path: path.relative(realRepoRoot, realPath),
      attestation_digest: attestationDigest,
      candidate_entries: attestation.dataset_policies,
    };
  } catch (error) {
    return {
      status: 'blocked',
      reason_code: 'SOURCE_POLICY_ATTESTATION_INVALID',
      summary: error instanceof Error ? error.message : 'Invalid source-policy attestation.',
      evidence_path: policyPath,
    };
  }
}

export function validateSourcePolicyAttestation(value, options = {}) {
  return parseExperimentFoundationD19SourcePolicy(value, options);
}

export function canonicalSourcePolicyAttestationDigest(attestation) {
  return digestExperimentFoundationD19SourcePolicy(attestation);
}

export function bindSourcePolicyStatus(status, fixture) {
  if (status.status !== 'pending_exact_binding') return status;
  const evidence = fixture?.source_policy_evidence;
  if (!evidence || evidence.mode !== 'attested') {
    return {
      status: 'blocked',
      reason_code: 'SOURCE_POLICY_FIXTURE_UNRESOLVED',
      summary: 'The typed D-19 fixture is synthetic/test-only and cannot accept source-policy evidence.',
      evidence_path: status.evidence_path,
    };
  }
  try {
    assertClosedObject(
      evidence,
      ['mode', 'attestation_digest', 'bindings'],
      'fixture.source_policy_evidence',
    );
    if (evidence.attestation_digest !== status.attestation_digest) {
      throw new Error('attestation digest drift');
    }
    assertArray(evidence.bindings, 'fixture.source_policy_evidence.bindings', {
      length: SOURCE_POLICY_SLOTS.length,
    });
    const datasets = fixture?.datasets;
    const policies = fixture?.data_policies;
    assertArray(datasets, 'fixture.datasets', { length: SOURCE_POLICY_SLOTS.length });
    assertArray(policies, 'fixture.data_policies', { length: SOURCE_POLICY_SLOTS.length });
    const datasetRefKeys = new Set();
    const policyRefKeys = new Set();
    for (let index = 0; index < SOURCE_POLICY_SLOTS.length; index += 1) {
      const expected = SOURCE_POLICY_SLOTS[index];
      const candidate = status.candidate_entries[index];
      const binding = evidence.bindings[index];
      assertClosedObject(binding, [
        'slot',
        'dataset_ref',
        'data_policy_ref',
        'dataset',
        'policy',
        'provenance',
      ], `fixture.source_policy_evidence.bindings[${index}]`);
      if (binding.slot !== expected.slot) {
        throw new Error(`binding slot ${index + 1} must be ${expected.slot}`);
      }
      if (binding.slot !== candidate.fixture_slot) {
        throw new Error('binding slot drifted from the attested fixture_slot');
      }
      const datasetRef = validateExactRef(binding.dataset_ref, 'Dataset', 'dataset_ref');
      const policyRef = validateExactRef(binding.data_policy_ref, 'DataPolicy', 'data_policy_ref');
      const datasetRefKey = stableJson(datasetRef);
      const policyRefKey = stableJson(policyRef);
      if (datasetRefKeys.has(datasetRefKey) || policyRefKeys.has(policyRefKey)) {
        throw new Error('exact Dataset/DataPolicy refs must be unique');
      }
      datasetRefKeys.add(datasetRefKey);
      policyRefKeys.add(policyRefKey);
      if (
        stableJson(datasets[index]) !== datasetRefKey
        || stableJson(policies[index]) !== policyRefKey
      ) {
        throw new Error('binding exact refs do not match ordered fixture refs');
      }
      if (
        stableJson(binding.dataset) !== stableJson(candidate.dataset)
        || stableJson(binding.policy) !== stableJson(candidate.policy)
        || stableJson(binding.provenance) !== stableJson(candidate.provenance)
      ) {
        throw new Error('persisted source-policy fields drifted from the attestation');
      }
    }
  } catch (error) {
    return {
      status: 'blocked',
      reason_code: 'SOURCE_POLICY_EXACT_BINDING_MISMATCH',
      summary: error instanceof Error
        ? `Source-policy exact binding mismatch: ${error.message}`
        : 'Source-policy exact binding mismatch.',
      evidence_path: status.evidence_path,
      attestation_digest: status.attestation_digest,
    };
  }
  return {
    status: 'passed',
    reason_code: null,
    summary: 'Two source-backed policies bind both exact D-19 Dataset/DataPolicy revisions.',
    evidence_path: status.evidence_path,
    attestation_digest: status.attestation_digest,
  };
}

function validateExactRef(value, expectedType, label) {
  assertClosedObject(
    value,
    ['asset_type', 'logical_id', 'revision_id', 'revision_sequence', 'content_hash'],
    label,
  );
  if (value.asset_type !== expectedType) {
    throw new Error(`${label}.asset_type must be ${expectedType}`);
  }
  assertTrimmedString(value.logical_id, `${label}.logical_id`);
  assertTrimmedString(value.revision_id, `${label}.revision_id`);
  if (!Number.isSafeInteger(value.revision_sequence) || value.revision_sequence < 1) {
    throw new Error(`${label}.revision_sequence must be a positive safe integer`);
  }
  if (!EXPERIMENT_V2_SHA256_REF_PATTERN.test(value.content_hash ?? '')) {
    throw new Error(`${label}.content_hash must be sha256:<64 lowercase hex>`);
  }
  return {
    asset_type: value.asset_type,
    logical_id: value.logical_id,
    revision_id: value.revision_id,
    revision_sequence: value.revision_sequence,
    content_hash: value.content_hash,
  };
}

function assertClosedObject(value, expectedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actualKeys = Object.keys(value).sort();
  const closedKeys = [...expectedKeys].sort();
  if (stableJson(actualKeys) !== stableJson(closedKeys)) {
    throw new Error(`${label} must contain only: ${expectedKeys.join(', ')}`);
  }
}

function assertArray(value, label, options = {}) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  if (options.length !== undefined && value.length !== options.length) {
    throw new Error(`${label} must contain exactly ${options.length} items`);
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new Error(`${label} must contain at least ${options.minLength} item`);
  }
}

function assertTrimmedString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function deployDisposableMigrations(databaseUrl, artifactDir, artifactName) {
  const result = await run([
    'pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma',
  ], {
    env: { DATABASE_URL: databaseUrl },
    timeoutMs: 180_000,
  });
  await writeJson(path.join(artifactDir, artifactName), {
    status: result.exit_code === 0 ? 'passed' : 'failed',
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  });
  if (result.exit_code !== 0) {
    throw new Error('Disposable PostgreSQL migration deploy failed');
  }
  return result;
}

async function runPackARelationalTests(disposable, artifactDir) {
  const backendRoot = path.join(REPO_ROOT, 'apps/backend');
  const result = await run([
    'node', '--test', '--loader', 'ts-node/esm', ...PACK_A_RELATIONAL_TEST_FILES,
  ], {
    cwd: backendRoot,
    env: {
      DATABASE_URL: disposable.databaseUrl,
      EXPERIMENT_V2_TEST_DATABASE_URL: disposable.databaseUrl,
      EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.databaseName,
      EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
      EXPERIMENT_FOUNDATION_V2_LIFECYCLE_PRISMA: '1',
      EXPERIMENT_FOUNDATION_V2_RELATIONAL_PRISMA: '1',
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_RELATIONAL_PRISMA: '1',
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
      EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
    },
    timeoutMs: 420_000,
  });
  const tap = exactPassingTapOutcome(result);
  const evidencePath = path.join(artifactDir, 'pack-a-relational-tests.json');
  const evidence = {
    status: tap.executedWithoutSkip ? 'passed' : 'failed',
    test_files: PACK_A_RELATIONAL_TEST_FILES,
    database: 'disposable_d19',
    existing_database_url_used: false,
    disposable_identity_guarded: true,
    relational_prisma_enabled: true,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    tap: {
      tests: tap.tests,
      passed: tap.passed,
      failed: tap.failed,
      skipped: tap.skipped,
    },
    output_tail: safeTail(tap.combinedOutput),
    evidence_path: path.relative(REPO_ROOT, evidencePath),
  };
  await writeJson(evidencePath, evidence);
  if (!tap.executedWithoutSkip) {
    throw new Error('Pack A Prisma relational integration tests failed or were skipped');
  }
  return evidence;
}

async function resetDisposableD19Schema(disposable, artifactDir) {
  const result = await resetDisposablePostgresPublicSchema({
    runCommand: run,
    safeTail,
    containerName: disposable.containerName,
    databaseName: disposable.databaseName,
    marker: `experiment-foundation-d19-disposable:${disposable.nonce}`,
    failureMessage: 'Disposable D-19 database marker verification failed',
    resetFailureMessage: 'Cannot reset disposable D-19 schema after relational tests',
  });
  const evidence = {
    status: result.status,
    database: 'disposable_d19',
    identity_marker_verified_before_reset: result.marker_verified_before,
    marker_verified_after_reset: result.marker_verified_after,
    marker_sha256: result.marker_sha256,
    output_tail: result.reset_output_tail,
  };
  await writeJson(path.join(artifactDir, 'pack-a-relational-reset.json'), evidence);
  return evidence;
}

async function main() {
  const { runId, postgresImage } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  const startedAt = new Date().toISOString();
  await fs.mkdir(artifactDir, { recursive: true });

  const summary = {
    run_id: runId,
    status: 'running',
    started_at: startedAt,
    finished_at: null,
    capability: { admission_enabled_for_scenario: true, product_default: false },
    environment_isolation: describeEnvironmentIsolation(),
    disposable_postgres: {
      mode: 'docker',
      image: postgresImage,
      existing_database_url_used: false,
      started: false,
      database_identity_marker: null,
      cleaned_up: false,
    },
    migration_digest: await sha256File(MIGRATION_PATH),
    foundation_storage_cleanup: {
      migration_digest: await sha256File(FOUNDATION_CLEANUP_MIGRATION_PATH),
      static_census: inspectFoundationCleanupMigration(
        await fs.readFile(FOUNDATION_CLEANUP_MIGRATION_PATH, 'utf8'),
      ),
      database_census: null,
    },
    event_storage_hardening: {
      migration_digest: await sha256File(EVENT_STORAGE_HARDENING_MIGRATION_PATH),
      static_census: inspectEventStorageHardeningMigration(
        await fs.readFile(EVENT_STORAGE_HARDENING_MIGRATION_PATH, 'utf8'),
      ),
    },
    source_policy: await sourcePolicyStatus(),
    pack_a_relational_tests: null,
    pack_a_relational_reset: null,
    fixture: null,
    four_uow_outcomes: [],
    three_event_outcomes: [],
    legacy_before: null,
    legacy_after: null,
    v2_write_census: null,
    excluded_write_census: null,
    checks: Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, {
      status: 'not_run',
      evidence_path: null,
    }])),
    blockers: [],
    redaction: {
      database_url_stored: false,
      database_password_stored: false,
      scientific_payload_logged: false,
    },
  };

  let disposable = null;
  try {
    if (summary.environment_isolation.exposed_sensitive_keys.length !== 0) {
      throw new Error('D-19 child environment isolation exposed sensitive host keys');
    }
    disposable = await startDisposablePostgres(runId, postgresImage);
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.database_identity_marker =
      await markDisposableDatabase(disposable);

    await deployDisposableMigrations(
      disposable.databaseUrl,
      artifactDir,
      'migration.json',
    );
    summary.foundation_storage_cleanup.database_census =
      await inspectFoundationStorageCleanup(disposable);
    summary.pack_a_relational_tests = await runPackARelationalTests(disposable, artifactDir);
    summary.pack_a_relational_reset = await resetDisposableD19Schema(disposable, artifactDir);
    await deployDisposableMigrations(
      disposable.databaseUrl,
      artifactDir,
      'migration-after-relational-reset.json',
    );
    summary.foundation_storage_cleanup.database_census =
      await inspectFoundationStorageCleanup(disposable);

    const scenarioPath = path.join(artifactDir, 'spine-scenario.json');
    const scenario = await run([
      'pnpm', '--filter', '@paper-engineering-assistant/backend', 'exec',
      'node', '--enable-source-maps', '--loader', 'ts-node/esm',
      'scripts/run-experiment-foundation-d19-spine.ts',
      '--output', scenarioPath,
    ], {
      env: {
        EXPERIMENT_FOUNDATION_D19_DATABASE_URL: disposable.databaseUrl,
        EXPERIMENT_FOUNDATION_D19_DATABASE_NAME: disposable.databaseName,
        EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE: disposable.nonce,
        EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_ATTESTATION_PATH:
          summary.source_policy.status === 'pending_exact_binding'
            ? summary.source_policy.evidence_path
            : '',
        DATABASE_URL: disposable.databaseUrl,
        PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: 'true',
        PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
      },
      timeoutMs: 240_000,
    });
    await writeJson(path.join(artifactDir, 'scenario-command.json'), {
      status: scenario.exit_code === 0 ? 'passed' : 'failed',
      exit_code: scenario.exit_code,
      duration_ms: scenario.duration_ms,
      output_tail: safeTail(`${scenario.stdout}\n${scenario.stderr}`),
    });
    if (scenario.exit_code !== 0) {
      throw new Error('D-19 spine scenario failed');
    }
    const evidence = JSON.parse(await fs.readFile(scenarioPath, 'utf8'));
    summary.fixture = evidence.fixture;
    summary.four_uow_outcomes = evidence.four_uow_outcomes;
    summary.three_event_outcomes = evidence.three_event_outcomes;
    summary.legacy_before = evidence.legacy_before;
    summary.legacy_after = evidence.legacy_after;
    summary.v2_write_census = evidence.v2_write_census;
    summary.excluded_write_census = evidence.excluded_write_census;
    summary.source_policy = bindSourcePolicyStatus(summary.source_policy, evidence.fixture);
    for (const checkId of REQUIRED_CHECK_IDS) {
      if (evidence.checks?.[checkId]?.status !== 'passed') {
        throw new Error(`Required D-19 check ${checkId} did not pass`);
      }
      summary.checks[checkId] = evidence.checks[checkId];
    }

    summary.status = summary.source_policy.status === 'passed' ? 'passed' : 'blocked';
    if (summary.status === 'blocked') {
      summary.blockers.push({
        reason_code: summary.source_policy.reason_code,
        summary: summary.source_policy.summary,
      });
    }
  } catch (error) {
    const reasonCode = error?.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE'
      ? 'DISPOSABLE_POSTGRES_UNAVAILABLE'
      : 'D19_GATE_EXECUTION_FAILED';
    summary.status = reasonCode === 'DISPOSABLE_POSTGRES_UNAVAILABLE' ? 'blocked' : 'failed';
    summary.blockers.push({
      reason_code: reasonCode,
      summary: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(disposable.containerName);
      summary.disposable_postgres.cleaned_up = cleanup.exit_code === 0;
      if (cleanup.exit_code !== 0) {
        summary.status = 'failed';
        summary.blockers.push({
          reason_code: 'DISPOSABLE_POSTGRES_CLEANUP_FAILED',
          summary: safeTail(cleanup.stderr || cleanup.stdout),
        });
      }
    }
    summary.finished_at = new Date().toISOString();
    await writeJson(summaryPath, summary);
  }

  process.stdout.write(`${JSON.stringify({
    run_id: runId,
    status: summary.status,
    summary_path: path.relative(REPO_ROOT, summaryPath),
  })}\n`);
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

export function isDirectRun(metaUrl = import.meta.url, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(argvEntry);
}

if (isDirectRun()) {
  main().catch(async (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
