#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  exactPassingTapOutcome,
  normalizePostgresIndexDefinitionSchema,
  sha256Bytes,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import {
  buildSafeChildEnv,
  describeEnvironmentIsolation,
} from './lib/hermetic-child-env.mjs';
import {
  markDisposableDatabase as markSharedDisposableDatabase,
  resetDisposablePostgresPublicSchema,
  runCommand,
  safeCommandTail,
  startDisposablePostgres as startSharedDisposablePostgres,
  stopDisposablePostgres,
} from './lib/disposable-postgres.mjs';

export { buildSafeChildEnv, describeEnvironmentIsolation };
export { exactPassingTapOutcome };

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
export const DEFAULT_POSTGRES_IMAGE =
  'pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9';
const APPROVED_POSTGRES_IMAGE_REPOSITORY = 'pgvector/pgvector';
const PACK_B_MIGRATION_SHA256 =
  'c0c49f0f7a268f09619f6c693a1f41955ce6cb1b36b656dd9c8e1d51abe0f70e';
const PACK_B_CLEANUP_MIGRATION_SHA256 =
  '05ddb7fa653e76b66fc6c0c4747b3680e3815a44dc672b8a61042310911dd5b8';
const PACK_B_REMOVED_REDUNDANT_INDEXES = [
  'ef_collection_attempt_sequence_unique',
  'ef_collection_attempt_business_unique',
  'ef_collection_attempt_state_idx',
];
const EXPECTED_EFFECTIVE_SCHEMA_DIGESTS = Object.freeze({
  foreign_keys: 'ce9f1a0866eaac5114921eaf4132d8652df308fbbab466aebde23689e1e8de71',
  checks: '868ddb26146bec215b69c572ac54c8b0ab3f667a83b5ce3c672db590c45b9040',
  indexes: '764a29546bba534cdfe3d1544662c58403a87fbbaff26e8d543c780b45bf4449',
});
const EXPECTED_PACK_B_CHECK_COUNT = 35;
const PACK_A_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql',
);
const PACK_B_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260713210000_add_experiment_foundation_pack_b_provider_control_v2/migration.sql',
);
const PACK_B_CLEANUP_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260714160000_harden_experiment_foundation_pack_b_v2/migration.sql',
);
const PACK_B_RELATIONAL_TEST_FILE =
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts';
const PACK_A_RELATIONAL_TEST_FILES = [
  'src/repositories/prisma/prisma-experiment-foundation-v2-lifecycle.integration.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-v2-relational.integration.test.ts',
  'src/repositories/prisma/prisma-paper-implementation-experiment-v2-relational.integration.test.ts',
];
const REQUIRED_PACK_B_TARGETED_TEST_FILES = [
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.unit.test.ts',
  'src/test-support/disposable-postgres-test-database.unit.test.ts',
];
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
];
const EXPECTED_PACK_B_FOREIGN_KEYS = [
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
const REQUIRED_CHECK_IDS = [
  'PB01', 'PB02', 'PB03', 'PB04', 'PB05', 'PB06', 'PB07', 'PB08',
  'PB09', 'PB10', 'PB11', 'PB12', 'PB13', 'PB14', 'PB15', 'PB16',
];
const HISTORICAL_PACK_A_REFERENCE_INDEXES = new Map([
  ['ef_task_spec_exact_hash_unique', 'ExperimentFoundationTrainingTaskSpecV2'],
  ['ef_run_exact_manifest_unique', 'ExperimentFoundationRunV2'],
  ['ef_run_exact_pi_scope_unique', 'ExperimentFoundationRunV2'],
  ['ef_run_cell_exact_task_spec_unique', 'ExperimentFoundationRunCellV2'],
  ['ef_integration_inbox_exact_head_ack_unique', 'ExperimentFoundationIntegrationInboxV2'],
]);
const FAKE_LANE_SOURCE_PATHS = [
  'apps/backend/src/services/experiment-foundation-v2-deterministic-fake-provider.ts',
  'apps/backend/src/services/experiment-foundation-v2-provider-payload-service.ts',
  'apps/backend/src/services/experiment-foundation-provider-command-v2-worker.ts',
  'apps/backend/src/services/experiment-foundation-provider-command-v2-scheduler.ts',
];
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
  if (!runId) throw new Error('--run-id is required');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('run-id must be 1..64 safe filename characters');
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

export function inspectPackBMigration(sql) {
  if (typeof sql !== 'string' || sql.trim() === '') {
    throw new Error('Pack B migration SQL must be non-empty text');
  }
  if (/\/\*/.test(sql) || /\*\//.test(sql)) {
    throw new Error('Pack B migration block comments are outside the reviewed grammar');
  }
  const statements = splitSqlStatements(sql);
  const createTables = [];
  const alteredTables = [];
  const references = [];
  const indexes = [];
  for (const statement of statements) {
    const createTable = statement.match(/^CREATE\s+TABLE\s+"([^"]+)"\s*\(/i);
    if (createTable) {
      createTables.push(createTable[1]);
      continue;
    }
    const createIndex = statement.match(
      /^CREATE\s+(UNIQUE\s+)?INDEX\s+"([^"]+)"\s+ON\s+"([^"]+)"\s*\(/i,
    );
    if (createIndex) {
      indexes.push({
        unique: Boolean(createIndex[1]),
        index_name: createIndex[2],
        table_name: createIndex[3],
      });
      continue;
    }
    const alterTable = statement.match(/^ALTER\s+TABLE\s+"([^"]+)"\s+/i);
    if (alterTable) {
      alteredTables.push(alterTable[1]);
      references.push(
        ...[...statement.matchAll(/REFERENCES\s+"([^"]+)"/gi)].map((match) => match[1]),
      );
      if (!/^ALTER\s+TABLE\s+"[^"]+"\s+ADD\s+CONSTRAINT\s+/i.test(statement)) {
        throw new Error('Pack B migration ALTER TABLE is outside the ADD CONSTRAINT allowlist');
      }
      continue;
    }
    throw new Error(`Pack B migration contains an unapproved SQL statement: ${statement.slice(0, 80)}`);
  }
  const expected = [...PACK_B_TABLES].sort();
  if (JSON.stringify([...createTables].sort()) !== JSON.stringify(expected)) {
    throw new Error(`Pack B migration must create exactly six approved tables: ${createTables.join(', ')}`);
  }
  if (alteredTables.some((table) => !PACK_B_TABLES.includes(table))) {
    throw new Error(`Pack B migration alters an unapproved table: ${alteredTables.join(', ')}`);
  }
  const indexTargetsValid = indexes.every(({ index_name: indexName, table_name: tableName }) => (
    PACK_B_TABLES.includes(tableName)
    || HISTORICAL_PACK_A_REFERENCE_INDEXES.get(indexName) === tableName
  ));
  if (!indexTargetsValid) {
    throw new Error('Pack B migration creates an index outside the exact reviewed table/index allowlist');
  }
  if (references.some((table) => /^paperimplementation/i.test(table))) {
    throw new Error('Pack B migration contains a cross-domain PI foreign key');
  }
  const forbiddenStatements = statements.filter((statement) => (
    /^(?:TRUNCATE|DROP|DELETE\s+FROM|UPDATE\s+|INSERT\s+INTO|MERGE\s+INTO|ALTER\s+TYPE|CREATE\s+(?:VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE|TRIGGER|SEQUENCE|EXTENSION))\b/i
      .test(statement)
  ));
  if (forbiddenStatements.length > 0) {
    throw new Error('Pack B migration contains a destructive or data-mutation statement');
  }
  const forbiddenFamilies = [
    'ExperimentFoundationExternalTrainingJob',
    'ExperimentFoundationRecord',
    'ExperimentFoundationReadinessReport',
    'ExperimentResult',
    'EvidenceCandidate',
    'RunEvidenceUnit',
    'SimulationRun',
  ];
  if (forbiddenFamilies.some((name) => new RegExp(escapeRegExp(name), 'i').test(sql))) {
    throw new Error('Pack B migration references a legacy, scientific, or excluded family');
  }
  if (!/CHECK\s*\(\s*"executionMode"\s*=\s*'simulation'\s*\)/i.test(sql)) {
    throw new Error('Pack B migration does not close execution mode to simulation');
  }
  if (!/CHECK\s*\(\s*"outputClass"\s*=\s*'diagnostic_only'\s*\)/i.test(sql)) {
    throw new Error('Pack B migration does not close provisional output class');
  }
  const foreignKeyCount = [...sql.matchAll(/\bFOREIGN\s+KEY\b/gi)].length;
  const deleteRestrictCount = [...sql.matchAll(/\bON\s+DELETE\s+RESTRICT\b/gi)].length;
  const updateCascadeCount = [...sql.matchAll(/\bON\s+UPDATE\s+CASCADE\b/gi)].length;
  const unsafeDeleteActionCount = [...sql.matchAll(/\bON\s+DELETE\s+(?!RESTRICT\b|NO\s+ACTION\b)\w+(?:\s+\w+)?/gi)].length;
  const unsafeUpdateActionCount = [...sql.matchAll(/\bON\s+UPDATE\s+(?!RESTRICT\b|NO\s+ACTION\b|CASCADE\b)\w+(?:\s+\w+)?/gi)].length;
  if (unsafeDeleteActionCount > 0 || unsafeUpdateActionCount > 0) {
    throw new Error('Pack B migration contains an unreviewed delete/update referential action');
  }
  if (
    statements.length !== 58
    || indexes.length !== 40
    || alteredTables.length !== 12
    || foreignKeyCount !== 15
    || deleteRestrictCount !== foreignKeyCount
  ) {
    throw new Error('Pack B migration statement census differs from the exact reviewed allowlist');
  }
  const sourceSha256 = sha256Bytes(sql);
  if (sourceSha256 !== PACK_B_MIGRATION_SHA256) {
    throw new Error('Pack B historical migration digest differs from the reviewed immutable artifact');
  }
  return {
    source_sha256: sourceSha256,
    statement_count: statements.length,
    created_tables: createTables.sort(),
    created_table_count: createTables.length,
    created_index_count: indexes.length,
    created_unique_index_count: indexes.filter((row) => row.unique).length,
    altered_tables: [...new Set(alteredTables)].sort(),
    alter_table_statement_count: alteredTables.length,
    referenced_tables: [...new Set(references)].sort(),
    same_domain_fk_count: foreignKeyCount,
    cross_domain_fk_count: references.filter((table) => /^paperimplementation/i.test(table)).length,
    legacy_alter_count: alteredTables.filter((table) => !PACK_B_TABLES.includes(table)).length,
    excluded_family_count: forbiddenFamilies.filter(
      (name) => new RegExp(escapeRegExp(name), 'i').test(sql),
    ).length,
    destructive_statement_count: forbiddenStatements.length,
    delete_restrict_count: deleteRestrictCount,
    unsafe_delete_action_count: unsafeDeleteActionCount,
    historical_update_cascade_count: updateCascadeCount,
    unsafe_unreviewed_update_action_count: unsafeUpdateActionCount,
  };
}

export function inspectPackBCleanupMigration(sql) {
  if (typeof sql !== 'string' || sql.trim() === '' || /\/\*|\*\//.test(sql)) {
    throw new Error('Pack B cleanup migration SQL is empty or outside the reviewed grammar');
  }
  const statements = splitSqlStatements(sql);
  const droppedIndexes = [];
  const alteredTables = [];
  for (const statement of statements) {
    const dropIndex = statement.match(/^DROP\s+INDEX\s+"([^"]+)"$/i);
    if (dropIndex) {
      droppedIndexes.push(dropIndex[1]);
      continue;
    }
    const alterTable = statement.match(/^ALTER\s+TABLE\s+"([^"]+)"\s+/i);
    if (alterTable) {
      alteredTables.push(alterTable[1]);
      if (!PACK_B_TABLES.includes(alterTable[1])) {
        throw new Error('Pack B cleanup migration alters a table outside the six-family allowlist');
      }
      if (/\b(?:ADD|DROP)\s+COLUMN\b/gi.test(statement)) {
        if (!/^ALTER\s+TABLE\s+"ExperimentFoundationCollectionAttemptV2"\s+[\s\S]*\bDROP\s+COLUMN\s+"collectionSequence"/i.test(statement)) {
          throw new Error('Pack B cleanup migration contains an unreviewed column operation');
        }
      }
      if (/\bADD\s+COLUMN\b/i.test(statement)) {
        throw new Error('Pack B cleanup migration must not add columns');
      }
      continue;
    }
    throw new Error(`Pack B cleanup migration contains an unapproved statement: ${statement.slice(0, 80)}`);
  }
  const sortedDroppedIndexes = [...droppedIndexes].sort();
  if (
    JSON.stringify(sortedDroppedIndexes)
      !== JSON.stringify([...PACK_B_REMOVED_REDUNDANT_INDEXES].sort())
  ) {
    throw new Error('Pack B cleanup migration DROP INDEX population differs from the reviewed allowlist');
  }
  const destructiveStatements = statements.filter((statement) => (
    /^(?:TRUNCATE|DELETE\s+FROM|UPDATE\s+|INSERT\s+INTO|MERGE\s+INTO|DROP\s+(?:TABLE|SCHEMA|DATABASE)|ALTER\s+TYPE|CREATE\s+)/i.test(statement)
  ));
  const foreignKeyCount = [...sql.matchAll(/\bFOREIGN\s+KEY\b/gi)].length;
  const deleteRestrictCount = [...sql.matchAll(/\bON\s+DELETE\s+RESTRICT\b/gi)].length;
  const updateRestrictCount = [...sql.matchAll(/\bON\s+UPDATE\s+RESTRICT\b/gi)].length;
  const references = [...sql.matchAll(/\bREFERENCES\s+"([^"]+)"/gi)].map((match) => match[1]);
  if (
    statements.length !== 13
    || alteredTables.length !== 10
    || foreignKeyCount !== 15
    || deleteRestrictCount !== 15
    || updateRestrictCount !== 15
    || destructiveStatements.length !== 0
    || references.some((tableName) => /^paperimplementation/i.test(tableName))
    || [...sql.matchAll(/\bDROP\s+COLUMN\b/gi)].length !== 1
    || /\bON\s+(?:DELETE|UPDATE)\s+(?:CASCADE|SET\s+NULL|SET\s+DEFAULT)\b/i.test(sql)
  ) {
    throw new Error('Pack B cleanup migration statement/action census differs from the reviewed allowlist');
  }
  const sourceSha256 = sha256Bytes(sql);
  if (sourceSha256 !== PACK_B_CLEANUP_MIGRATION_SHA256) {
    throw new Error('Pack B cleanup migration digest differs from the reviewed immutable artifact');
  }
  return {
    source_sha256: sourceSha256,
    statement_count: statements.length,
    drop_index_count: droppedIndexes.length,
    removed_index_names: sortedDroppedIndexes,
    alter_table_statement_count: alteredTables.length,
    dropped_column_count: 1,
    same_domain_fk_rewrite_count: foreignKeyCount,
    delete_restrict_count: deleteRestrictCount,
    update_restrict_count: updateRestrictCount,
    cross_domain_fk_count:
      references.filter((tableName) => /^paperimplementation/i.test(tableName)).length,
    destructive_statement_count: destructiveStatements.length,
  };
}

function splitSqlStatements(sql) {
  const withoutLineComments = sql.replace(/^\s*--.*$/gm, '');
  const parts = withoutLineComments.split(';');
  if (parts.at(-1)?.trim() !== '') {
    throw new Error('Pack B migration has an unterminated SQL statement');
  }
  return parts.map((statement) => statement.trim()).filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function inspectCapabilityBoundary(envContract, appSource) {
  const key = 'EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED';
  const contractPattern = new RegExp(
    `${key}:\\s*\\n\\s+type: bool\\s*\\n\\s+required: false\\s*\\n\\s+default: false`,
  );
  if (!contractPattern.test(envContract)) {
    throw new Error('Pack B capability is not an optional default-false bool in env/contract.yaml');
  }
  for (const requiredSource of [
    `'${key}'`,
    "normalized === 'true'",
    "normalized === 'false'",
    'must be either true or false when set',
    'workflowSimulationEnabled && !input.cutoverCommitted',
  ]) {
    if (!appSource.includes(requiredSource)) {
      throw new Error(`Pack B strict capability composition is missing: ${requiredSource}`);
    }
  }
  return {
    key,
    type: 'bool',
    required: false,
    default: false,
    strict_true_false_parser: true,
    cutover_precondition: true,
  };
}

function importSpecifiers(source) {
  return [
    ...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...source.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => match[1]);
}

function resolveRepoLocalSpecifier(importingPath, specifier) {
  let candidate = null;
  if (specifier.startsWith('.')) {
    candidate = path.posix.normalize(path.posix.join(path.posix.dirname(importingPath), specifier));
  } else if (specifier.startsWith('@paper-engineering-assistant/shared/')) {
    candidate = path.posix.join(
      'packages/shared/src',
      specifier.slice('@paper-engineering-assistant/shared/'.length),
    );
  }
  if (!candidate) return [];
  const extension = path.posix.extname(candidate);
  const baseCandidates = extension
    ? [candidate, candidate.slice(0, -extension.length)]
    : [candidate];
  return [...new Set(baseCandidates.flatMap((base) => [
    base,
    `${base}.ts`,
    `${base}.mjs`,
    `${base}/index.ts`,
  ]))];
}

export function inspectFakeLaneImports(sourceByPath, options = {}) {
  const forbiddenBuiltins = new Set([
    'child_process', 'dgram', 'http', 'http2', 'https', 'net', 'tls',
    'node:child_process', 'node:dgram', 'node:http', 'node:http2', 'node:https',
    'node:net', 'node:tls', 'node:undici',
  ]);
  const violations = [];
  const files = [];
  const entryPaths = options.entryPaths ?? Object.keys(sourceByPath);
  const pending = [...entryPaths];
  const reachable = new Set();
  while (pending.length > 0) {
    const filePath = pending.shift();
    if (reachable.has(filePath)) continue;
    const source = sourceByPath[filePath];
    if (typeof source !== 'string') {
      throw new Error(`Pack B fake lane local import was not loaded: ${filePath}`);
    }
    reachable.add(filePath);
    for (const specifier of importSpecifiers(source)) {
      const candidates = resolveRepoLocalSpecifier(filePath, specifier);
      if (candidates.length === 0) continue;
      const resolved = candidates.find((candidate) => Object.hasOwn(sourceByPath, candidate));
      if (!resolved) {
        throw new Error(`Pack B fake lane local import was not loaded: ${filePath} -> ${specifier}`);
      }
      pending.push(resolved);
    }
  }
  for (const filePath of [...reachable].sort()) {
    const source = sourceByPath[filePath];
    const specifiers = importSpecifiers(source);
    const fileViolations = [];
    for (const specifier of specifiers) {
      if (
        forbiddenBuiltins.has(specifier)
        || /^(?:undici|axios|got|superagent|node-fetch|cross-fetch|ws)$/i.test(specifier)
        || /^(?:@aws-sdk\/|aws-sdk$|@alicloud\/|aliyun-sdk$|@google-cloud\/|@azure\/)/i.test(specifier)
        || /(?:^|\/)(?:credential|credentials|secret|secrets)(?:$|[./_-])/i.test(specifier)
      ) {
        fileViolations.push({ kind: 'forbidden_import', specifier });
      }
    }
    if (/\bfetch\s*\(/.test(source)) {
      fileViolations.push({ kind: 'network_primitive', specifier: 'fetch' });
    }
    files.push({ file_path: filePath, import_count: specifiers.length });
    violations.push(...fileViolations.map((row) => ({ file_path: filePath, ...row })));
  }
  if (violations.length > 0) {
    throw new Error(`Pack B fake lane import boundary violated: ${JSON.stringify(violations)}`);
  }
  return {
    policy: 'fake-lane-no-network-or-provider-sdk-imports@v1',
    entry_paths: [...entryPaths],
    inspected_file_count: files.length,
    transitive_closure_complete: true,
    files,
    violation_count: violations.length,
    violations,
  };
}

export async function inspectCheckedInFakeLane() {
  const sourceByPath = {};
  const pending = [...FAKE_LANE_SOURCE_PATHS];
  while (pending.length > 0) {
    const filePath = pending.shift();
    if (Object.hasOwn(sourceByPath, filePath)) continue;
    const source = await fs.readFile(path.join(REPO_ROOT, filePath), 'utf8');
    sourceByPath[filePath] = source;
    for (const specifier of importSpecifiers(source)) {
      const candidates = resolveRepoLocalSpecifier(filePath, specifier);
      if (candidates.length === 0) continue;
      let resolved = null;
      for (const candidate of candidates) {
        try {
          const stat = await fs.stat(path.join(REPO_ROOT, candidate));
          if (stat.isFile()) {
            resolved = candidate;
            break;
          }
        } catch {
          // Try the next source-resolution candidate.
        }
      }
      if (!resolved) {
        throw new Error(`Pack B fake lane local import cannot be resolved: ${filePath} -> ${specifier}`);
      }
      pending.push(resolved);
    }
  }
  return inspectFakeLaneImports(sourceByPath, { entryPaths: FAKE_LANE_SOURCE_PATHS });
}

async function run(argv, options = {}) {
  return runCommand(argv, {
    ...options,
    cwd: options.cwd ?? REPO_ROOT,
    timeoutMessage: 'Timed out.',
  });
}

function safeTail(value) {
  return safeCommandTail(value, 6_000);
}

async function startDisposablePostgres(runId, postgresImage) {
  const disposable = await startSharedDisposablePostgres({
    runId,
    postgresImage,
    runCommand: run,
    safeTail,
    databasePrefixes: ['d19', 'packb'],
    containerNamePrefix: 'pea-packb',
    portResolutionErrorMessage: 'Cannot resolve PostgreSQL port',
    portWaitErrorMessage: 'Disposable PostgreSQL port did not become reachable',
    postgresWaitErrorMessage: 'Disposable PostgreSQL did not become ready',
    startupFailureMessage: 'PostgreSQL startup failed',
    pgIsReadyArguments: (databaseName) => [
      'pg_isready', '-U', 'postgres', '-d', databaseName,
    ],
  });
  return {
    containerName: disposable.containerName,
    image: disposable.image,
    nonce: disposable.nonce,
    d19DatabaseName: disposable.databaseNames.d19,
    packBDatabaseName: disposable.databaseNames.packb,
    d19Url: disposable.databaseUrls.d19,
    packBUrl: disposable.databaseUrls.packb,
  };
}

async function markDisposableDatabase(disposable, databaseName, markerPrefix) {
  if (!/^(?:d19|packb)_[0-9a-f]{12}$/.test(databaseName)) {
    throw new Error('Disposable database marker target is not a randomized Pack A/B database');
  }
  if (!/^[a-z0-9-]+$/.test(markerPrefix)) {
    throw new Error('Disposable database marker prefix is invalid');
  }
  const marker = `${markerPrefix}:${disposable.nonce}`;
  return markSharedDisposableDatabase({
    runCommand: run,
    safeTail,
    containerName: disposable.containerName,
    databaseName,
    marker,
    failureMessage: 'Cannot mark disposable Pack B database',
  });
}

function asciiCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function effectiveDefinitionDigests(evidence) {
  const foreignKeys = (evidence?.foreign_keys ?? []).map((row) => ({
    constraint_name: row.constraint_name,
    definition: row.definition,
  })).sort((left, right) => asciiCompare(left.constraint_name, right.constraint_name));
  const checks = (evidence?.checks ?? []).map((row) => ({
    constraint_name: row.constraint_name,
    definition: row.definition,
  })).sort((left, right) => asciiCompare(left.constraint_name, right.constraint_name));
  const indexes = (evidence?.indexes ?? []).map((row) => ({
    index_name: row.index_name,
    definition: normalizePostgresIndexDefinitionSchema(row.definition),
  })).sort((left, right) => asciiCompare(left.index_name, right.index_name));
  return {
    foreign_keys: sha256Bytes(JSON.stringify(foreignKeys)),
    checks: sha256Bytes(JSON.stringify(checks)),
    indexes: sha256Bytes(JSON.stringify(indexes)),
  };
}

export function inspectEffectivePackBSchema(
  evidence,
  removedIndexNames,
  expectedDigests = EXPECTED_EFFECTIVE_SCHEMA_DIGESTS,
) {
  const foreignKeys = Array.isArray(evidence?.foreign_keys) ? evidence.foreign_keys : [];
  const actualForeignKeyNames = foreignKeys.map((row) => row.constraint_name).sort();
  const expectedForeignKeyNames = [...EXPECTED_PACK_B_FOREIGN_KEYS].sort();
  const unsafeForeignKeys = foreignKeys.filter((row) => (
    !['a', 'r'].includes(row.delete_action)
    || !['a', 'r'].includes(row.update_action)
  ));
  const presentRemovedIndexes = (evidence?.indexes ?? [])
    .map((row) => row.index_name)
    .filter((indexName) => removedIndexNames.includes(indexName))
    .sort();
  const activeRealFenceIndexPresent = (evidence?.indexes ?? []).some(
    (row) => row.index_name === 'ef_execution_attempt_cycle_mode_state_idx',
  );
  const checks = Object.fromEntries(
    (evidence?.checks ?? []).map((row) => [row.constraint_name, row.definition]),
  );
  const unreachableCheckValues = [];
  if (/['"]collecting['"]/i.test(checks.ef_collection_attempt_state_check ?? '')) {
    unreachableCheckValues.push('collecting');
  }
  if (/['"]reconciled['"]/i.test(checks.ef_attempt_event_type_check ?? '')) {
    unreachableCheckValues.push('reconciled');
  }
  if (/['"]collection_failed['"]/i.test(
    checks.ef_execution_attempt_terminal_reason_check ?? '',
  )) {
    unreachableCheckValues.push('collection_failed_terminal_reason');
  }
  const definitionDigests = effectiveDefinitionDigests(evidence);
  const exact =
    JSON.stringify(actualForeignKeyNames) === JSON.stringify(expectedForeignKeyNames)
    && unsafeForeignKeys.length === 0
    && (evidence?.indexes ?? []).length === 38
    && (evidence?.checks ?? []).length === EXPECTED_PACK_B_CHECK_COUNT
    && activeRealFenceIndexPresent
    && presentRemovedIndexes.length === 0
    && evidence.collection_sequence_column_present === false
    && unreachableCheckValues.length === 0
    && JSON.stringify(definitionDigests) === JSON.stringify(expectedDigests);
  if (!exact) {
    throw new Error(`Pack B effective schema hardening census failed: ${JSON.stringify({
      actualForeignKeyNames,
      unsafeForeignKeys,
      presentRemovedIndexes,
      activeRealFenceIndexPresent,
      packBCheckCount: (evidence?.checks ?? []).length,
      collectionSequenceColumnPresent: evidence?.collection_sequence_column_present,
      unreachableCheckValues,
      definitionDigests,
      expectedDigests,
    })}`);
  }
  return {
    exact,
    foreign_key_count: foreignKeys.length,
    effective_pack_b_index_count: (evidence?.indexes ?? []).length,
    effective_pack_b_check_count: (evidence?.checks ?? []).length,
    unsafe_referential_action_count: unsafeForeignKeys.length,
    removed_index_count: removedIndexNames.length,
    removed_index_still_present_count: presentRemovedIndexes.length,
    active_real_fence_index_present: activeRealFenceIndexPresent,
    collection_sequence_column_present: evidence.collection_sequence_column_present,
    unreachable_check_value_count: unreachableCheckValues.length,
    definition_digests: definitionDigests,
  };
}

export function inspectPB14ScenarioEvidence(evidence) {
  const fence = evidence?.cycle_active_real_attempt_fence;
  const scope = fence?.query_scope;
  const exact = fence?.repository_query_invoked === true
    && typeof scope?.implementation_project_id === 'string'
    && scope.implementation_project_id.length > 0
    && scope.implementation_project_id
      === evidence?.pack_a_prerequisite?.implementation_project_id
    && typeof scope?.validation_cycle_id === 'string'
    && scope.validation_cycle_id.length > 0
    && scope.validation_cycle_id === evidence?.pack_a_prerequisite?.validation_cycle_id
    && scope.execution_mode === 'real'
    && JSON.stringify(scope.lifecycle_states) === JSON.stringify([
      'prepared', 'submitted', 'running',
    ])
    && scope.run_filter === null
    && scope.head_filter === null
    && fence.active_real_attempt_count === 0
    && Array.isArray(fence.active_real_attempt_refs)
    && fence.active_real_attempt_refs.length === 0
    && JSON.stringify(fence.pack_b_writer_execution_modes) === JSON.stringify(['simulation'])
    && fence.attempt_persistence_execution_mode === 'simulation'
    && fence.attempt_persistence_provenance === 'non_production_fake_provider';
  if (!exact) {
    throw new Error('PB14 Cycle-wide active-real fence evidence is missing or inexact');
  }
  return {
    exact,
    repository_query_invoked: true,
    query_scope: scope,
    active_real_attempt_count: 0,
    pack_b_writer_execution_modes: ['simulation'],
    persistence_execution_mode: 'simulation',
    persistence_provenance: 'non_production_fake_provider',
  };
}

async function inspectDisposablePackBSchema(disposable, removedIndexNames) {
  const tableNames = PACK_B_TABLES.map((name) => `'${name}'`).join(', ');
  const query = `SELECT json_build_object(
    'foreign_keys', COALESCE((
      SELECT json_agg(json_build_object(
        'constraint_name', constraint_row.conname,
        'definition', pg_get_constraintdef(constraint_row.oid),
        'delete_action', constraint_row.confdeltype,
        'update_action', constraint_row.confupdtype
      ) ORDER BY constraint_row.conname)
      FROM pg_catalog.pg_constraint AS constraint_row
      JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
      WHERE constraint_row.contype = 'f'
        AND source_namespace.nspname = current_schema()
        AND source_table.relname IN (${tableNames})
    ), '[]'::json),
    'indexes', COALESCE((
      SELECT json_agg(json_build_object(
        'index_name', indexname,
        'definition', indexdef
      ) ORDER BY indexname)
      FROM pg_catalog.pg_indexes
      WHERE schemaname = current_schema()
        AND tablename IN (${tableNames})
    ), '[]'::json),
    'checks', COALESCE((
      SELECT json_agg(json_build_object(
        'constraint_name', constraint_row.conname,
        'definition', pg_get_constraintdef(constraint_row.oid)
      ) ORDER BY constraint_row.conname)
      FROM pg_catalog.pg_constraint AS constraint_row
      JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
      WHERE constraint_row.contype = 'c'
        AND source_namespace.nspname = current_schema()
        AND source_table.relname IN (${tableNames})
    ), '[]'::json),
    'collection_sequence_column_present', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ExperimentFoundationCollectionAttemptV2'
        AND column_name = 'collectionSequence'
    )
  )::text`;
  const result = await run([
    'docker', 'exec', disposable.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres',
    '-d', disposable.packBDatabaseName, '-c', query,
  ], { timeoutMs: 30_000 });
  if (result.exit_code !== 0) {
    throw new Error(`Cannot inspect effective Pack B schema: ${safeTail(result.stderr)}`);
  }
  let evidence;
  try {
    evidence = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error('Effective Pack B schema census did not return valid JSON');
  }
  return inspectEffectivePackBSchema(evidence, removedIndexNames);
}

async function deployMigrations(databaseUrl, artifactDir, label) {
  const result = await run([
    'pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma',
  ], {
    env: { DATABASE_URL: databaseUrl },
    timeoutMs: 240_000,
  });
  await writeJsonAtomic(path.join(artifactDir, `${label}-migration.json`), {
    status: result.exit_code === 0 ? 'passed' : 'failed',
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  });
  if (result.exit_code !== 0) throw new Error(`${label} migration deploy failed`);
}

async function runTargetedTests(artifactDir) {
  const shared = await run([
    'node', '--test', '--loader', 'ts-node/esm',
    'src/research-lifecycle/experiment-foundation-execution-v2-contracts.schema.test.ts',
  ], {
    cwd: path.join(REPO_ROOT, 'packages/shared'),
    timeoutMs: 180_000,
  });
  const backendRoot = path.join(REPO_ROOT, 'apps/backend');
  const discoveredBackendTestFiles = (await collectTestFiles(path.join(backendRoot, 'src')))
    .map((file) => path.relative(backendRoot, file).replaceAll('\\', '/'))
    .filter((file) => /(?:experiment-foundation-execution-v2|experiment-foundation-provider-command-v2|experiment-foundation-v2-provider-payload|deterministic-fake|experiment-v2-cutover-guard|disposable-postgres-test-database)/.test(file))
    .filter((file) => file !== PACK_B_RELATIONAL_TEST_FILE);
  const missingRequiredTests = REQUIRED_PACK_B_TARGETED_TEST_FILES.filter(
    (file) => !discoveredBackendTestFiles.includes(file),
  );
  if (missingRequiredTests.length > 0) {
    throw new Error(`Required Pack B targeted tests are missing: ${missingRequiredTests.join(', ')}`);
  }
  const backendTestFiles = [...new Set([
    ...REQUIRED_PACK_B_TARGETED_TEST_FILES,
    ...discoveredBackendTestFiles,
  ])].sort();
  if (backendTestFiles.length === 0) throw new Error('No Pack B backend tests were discovered');
  const backend = await run([
    'node', '--test', '--loader', 'ts-node/esm', ...backendTestFiles,
  ], {
    cwd: backendRoot,
    env: {
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
      EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
    },
    timeoutMs: 240_000,
  });
  const evidence = {
    shared: {
      status: shared.exit_code === 0 ? 'passed' : 'failed',
      duration_ms: shared.duration_ms,
      output_tail: safeTail(`${shared.stdout}\n${shared.stderr}`),
    },
    backend: {
      status: backend.exit_code === 0 ? 'passed' : 'failed',
      files: backendTestFiles,
      duration_ms: backend.duration_ms,
      output_tail: safeTail(`${backend.stdout}\n${backend.stderr}`),
    },
  };
  await writeJsonAtomic(path.join(artifactDir, 'targeted-tests.json'), evidence);
  if (shared.exit_code !== 0 || backend.exit_code !== 0) {
    throw new Error('Pack B targeted tests failed');
  }
  return evidence;
}

async function runExperimentFoundationScriptTypecheck(artifactDir) {
  const result = await run([
    'pnpm', '--filter', '@paper-engineering-assistant/backend',
    'run', 'typecheck:experiment-foundation-scripts',
  ], { timeoutMs: 240_000 });
  const evidence = {
    status: result.exit_code === 0 ? 'passed' : 'failed',
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  };
  await writeJsonAtomic(path.join(artifactDir, 'experiment-foundation-script-typecheck.json'), evidence);
  if (result.exit_code !== 0) {
    throw new Error('Experiment-foundation producer/helper script typecheck failed');
  }
  return evidence;
}

async function runPackARelationalTests(disposable, artifactDir) {
  const backendRoot = path.join(REPO_ROOT, 'apps/backend');
  const result = await run([
    'node', '--test', '--loader', 'ts-node/esm', ...PACK_A_RELATIONAL_TEST_FILES,
  ], {
    cwd: backendRoot,
    env: {
      DATABASE_URL: disposable.d19Url,
      EXPERIMENT_V2_TEST_DATABASE_URL: disposable.d19Url,
      EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.d19DatabaseName,
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
  await writeJsonAtomic(evidencePath, evidence);
  return evidence;
}

async function resetDisposableD19Schema(disposable, artifactDir) {
  const result = await resetDisposablePostgresPublicSchema({
    runCommand: run,
    safeTail,
    containerName: disposable.containerName,
    databaseName: disposable.d19DatabaseName,
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
  await writeJsonAtomic(path.join(artifactDir, 'pack-a-relational-reset.json'), evidence);
  return evidence;
}

async function runRelationalTests(disposable, artifactDir) {
  const backendRoot = path.join(REPO_ROOT, 'apps/backend');
  const result = await run([
    'node', '--test', '--loader', 'ts-node/esm', PACK_B_RELATIONAL_TEST_FILE,
  ], {
    cwd: backendRoot,
    env: {
      DATABASE_URL: disposable.packBUrl,
      EXPERIMENT_V2_TEST_DATABASE_URL: disposable.packBUrl,
      EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.packBDatabaseName,
      EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
      EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA: '1',
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
      EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
    },
    timeoutMs: 300_000,
  });
  const tap = exactPassingTapOutcome(result);
  const evidencePath = path.join(artifactDir, 'relational-tests.json');
  const evidence = {
    status: tap.executedWithoutSkip ? 'passed' : 'failed',
    test_file: PACK_B_RELATIONAL_TEST_FILE,
    database: 'disposable_packb',
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
  await writeJsonAtomic(evidencePath, evidence);
  return evidence;
}

async function collectTestFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(candidate);
    return entry.name.endsWith('.test.ts') ? [candidate] : [];
  }));
  return nested.flat().sort();
}

export async function executePackBDatabasePhases(steps) {
  await steps.createDatabase();
  const marker = await steps.markDatabase();
  await steps.deployMigration();
  const effectiveSchema = await steps.inspectEffectiveSchema();
  const relationalTests = await steps.runRelationalTests();
  if (relationalTests.status !== 'passed') {
    throw new Error('Pack B Prisma relational integration tests failed or were skipped');
  }
  const scenario = await steps.runScenario();
  return { marker, effectiveSchema, relationalTests, scenario };
}

async function main() {
  const { runId, postgresImage } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });
  const [migrationSql, cleanupMigrationSql, envContract, appSource] = await Promise.all([
    fs.readFile(PACK_B_MIGRATION_PATH, 'utf8'),
    fs.readFile(PACK_B_CLEANUP_MIGRATION_PATH, 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
  ]);
  const summary = {
    run_id: runId,
    status: 'running',
    started_at: new Date().toISOString(),
    finished_at: null,
    capability: null,
    environment_isolation: describeEnvironmentIsolation(),
    fake_lane_import_boundary: null,
    disposable_postgres: {
      mode: 'docker',
      image: postgresImage,
      existing_database_url_used: false,
      started: false,
      databases: [],
      d19_database_identity_marker: null,
      database_identity_marker: null,
      cleaned_up: false,
    },
    migrations: {
      pack_a_digest: await sha256File(PACK_A_MIGRATION_PATH),
      pack_b_digest: await sha256File(PACK_B_MIGRATION_PATH),
      pack_b_cleanup_digest: await sha256File(PACK_B_CLEANUP_MIGRATION_PATH),
      pack_b_static_census: null,
      pack_b_cleanup_static_census: null,
      effective_schema_census: null,
    },
    targeted_tests: null,
    script_typecheck: null,
    pack_a_relational_tests: null,
    pack_a_relational_reset: null,
    relational_tests: null,
    pack_a_prerequisite: null,
    provider_payloads: [],
    attempts: [],
    command_drain: null,
    workflow_simulation_status: null,
    pack_b_write_census: null,
    unchanged_non_pack_b_table_census: null,
    excluded_write_census: null,
    cycle_active_real_attempt_fence: null,
    checks: Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, {
      status: 'not_run',
      evidence_path: null,
    }])),
    blockers: [],
    redaction: {
      database_url_stored: false,
      database_password_stored: false,
      canonical_payload_bytes_logged: false,
      real_provider_credentials_loaded: null,
    },
  };

  let disposable = null;
  try {
    summary.migrations.pack_b_static_census = inspectPackBMigration(migrationSql);
    summary.migrations.pack_b_cleanup_static_census =
      inspectPackBCleanupMigration(cleanupMigrationSql);
    summary.capability = inspectCapabilityBoundary(envContract, appSource);
    summary.fake_lane_import_boundary = await inspectCheckedInFakeLane();
    summary.redaction.real_provider_credentials_loaded =
      summary.environment_isolation.exposed_sensitive_keys.length !== 0;
    summary.script_typecheck = await runExperimentFoundationScriptTypecheck(artifactDir);
    summary.targeted_tests = await runTargetedTests(artifactDir);

    disposable = await startDisposablePostgres(runId, postgresImage);
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.databases = [
      disposable.d19DatabaseName,
      disposable.packBDatabaseName,
    ];
    summary.disposable_postgres.d19_database_identity_marker =
      await markDisposableDatabase(
        disposable,
        disposable.d19DatabaseName,
        'experiment-foundation-d19-disposable',
      );
    await deployMigrations(disposable.d19Url, artifactDir, 'd19');

    summary.pack_a_relational_tests = await runPackARelationalTests(disposable, artifactDir);
    if (summary.pack_a_relational_tests.status !== 'passed') {
      throw new Error('Pack A Prisma relational integration tests failed or were skipped');
    }
    summary.pack_a_relational_reset = await resetDisposableD19Schema(disposable, artifactDir);
    await deployMigrations(disposable.d19Url, artifactDir, 'd19-after-relational-reset');

    const packAEvidencePath = path.join(artifactDir, 'pack-a-prerequisite.json');
    const packA = await run([
      'pnpm', '--filter', '@paper-engineering-assistant/backend', 'exec',
      'node', '--enable-source-maps', '--loader', 'ts-node/esm',
      'scripts/run-experiment-foundation-d19-spine.ts',
      '--output', packAEvidencePath,
    ], {
      env: {
        DATABASE_URL: disposable.d19Url,
        EXPERIMENT_FOUNDATION_D19_DATABASE_URL: disposable.d19Url,
        EXPERIMENT_FOUNDATION_D19_DATABASE_NAME: disposable.d19DatabaseName,
        EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE: disposable.nonce,
        EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_ATTESTATION_PATH: '',
        PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: 'true',
        PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
        EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: 'false',
      },
      timeoutMs: 300_000,
    });
    await writeJsonAtomic(path.join(artifactDir, 'pack-a-prerequisite-command.json'), {
      status: packA.exit_code === 0 ? 'passed' : 'failed',
      exit_code: packA.exit_code,
      duration_ms: packA.duration_ms,
      output_tail: safeTail(`${packA.stdout}\n${packA.stderr}`),
    });
    if (packA.exit_code !== 0) throw new Error('Pack A D-19 prerequisite scenario failed');

    const scenarioPath = path.join(artifactDir, 'pack-b-scenario.json');
    const phases = await executePackBDatabasePhases({
      createDatabase: async () => {
        const created = await run([
          'docker', 'exec', disposable.containerName,
          'createdb', '-U', 'postgres', disposable.packBDatabaseName,
        ], { timeoutMs: 30_000 });
        if (created.exit_code !== 0) {
          throw new Error(`Cannot create disposable Pack B database: ${safeTail(created.stderr)}`);
        }
      },
      markDatabase: () => markDisposableDatabase(
        disposable,
        disposable.packBDatabaseName,
        'experiment-foundation-packb-disposable',
      ),
      deployMigration: () => deployMigrations(disposable.packBUrl, artifactDir, 'packb'),
      inspectEffectiveSchema: () => inspectDisposablePackBSchema(
        disposable,
        summary.migrations.pack_b_cleanup_static_census.removed_index_names,
      ),
      runRelationalTests: async () => {
        const evidence = await runRelationalTests(disposable, artifactDir);
        summary.relational_tests = evidence;
        return evidence;
      },
      runScenario: () => run([
        'pnpm', '--filter', '@paper-engineering-assistant/backend', 'exec',
        'node', '--enable-source-maps', '--loader', 'ts-node/esm',
        'scripts/run-experiment-foundation-packb-simulation.ts',
        '--output', scenarioPath,
        '--pack-a-evidence', packAEvidencePath,
      ], {
        env: {
          DATABASE_URL: disposable.packBUrl,
          EXPERIMENT_FOUNDATION_PACKB_DATABASE_URL: disposable.packBUrl,
          EXPERIMENT_FOUNDATION_PACKB_DATABASE_NAME: disposable.packBDatabaseName,
          EXPERIMENT_FOUNDATION_PACKB_DISPOSABLE_NONCE: disposable.nonce,
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: 'true',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
          EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: 'true',
        },
        timeoutMs: 300_000,
      }),
    });
    summary.disposable_postgres.database_identity_marker = phases.marker;
    summary.migrations.effective_schema_census = phases.effectiveSchema;
    summary.relational_tests = phases.relationalTests;
    const scenario = phases.scenario;
    await writeJsonAtomic(path.join(artifactDir, 'pack-b-scenario-command.json'), {
      status: scenario.exit_code === 0 ? 'passed' : 'failed',
      exit_code: scenario.exit_code,
      duration_ms: scenario.duration_ms,
      output_tail: safeTail(`${scenario.stdout}\n${scenario.stderr}`),
    });
    if (scenario.exit_code !== 0) throw new Error('Pack B simulation scenario failed');
    const evidence = JSON.parse(await fs.readFile(scenarioPath, 'utf8'));
    summary.cycle_active_real_attempt_fence = inspectPB14ScenarioEvidence(evidence);
    for (const id of REQUIRED_CHECK_IDS) {
      if (evidence.checks?.[id]?.status !== 'passed') {
        throw new Error(`Pack B check ${id} did not pass`);
      }
      summary.checks[id] = evidence.checks[id];
    }
    summary.pack_a_prerequisite = evidence.pack_a_prerequisite;
    summary.provider_payloads = evidence.provider_payloads;
    summary.attempts = evidence.attempts;
    summary.command_drain = evidence.command_drain;
    summary.workflow_simulation_status = evidence.workflow_simulation_status;
    summary.pack_b_write_census = evidence.pack_b_write_census;
    summary.unchanged_non_pack_b_table_census = evidence.unchanged_non_pack_b_table_census;
    summary.excluded_write_census = evidence.excluded_write_census;
    summary.status = 'passed';
  } catch (error) {
    const reasonCode = error?.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE'
      ? 'DISPOSABLE_POSTGRES_UNAVAILABLE'
      : 'PACKB_GATE_EXECUTION_FAILED';
    summary.status = reasonCode === 'DISPOSABLE_POSTGRES_UNAVAILABLE' ? 'blocked' : 'failed';
    summary.blockers.push({
      reason_code: reasonCode,
      summary: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(
        disposable.containerName,
        { runCommand: run },
      );
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
    await writeJsonAtomic(summaryPath, summary);
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
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
