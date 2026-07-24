#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  exactPassingTapOutcome,
  sha256Bytes,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import {
  describeEnvironmentIsolation,
} from './lib/hermetic-child-env.mjs';
import {
  markDisposableDatabase,
  runCommand,
  safeCommandTail,
  startDisposablePostgres,
  stopDisposablePostgres,
} from './lib/disposable-postgres.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const MIGRATIONS_ROOT = path.join(REPO_ROOT, 'prisma/migrations');
const M7_MIGRATION_DIRECTORY =
  '20260723100000_add_experiment_foundation_m7_real_provider_v2';
const MIGRATION_PATH = path.join(
  MIGRATIONS_ROOT,
  M7_MIGRATION_DIRECTORY,
  'migration.sql',
);
const CONTAINER_MIGRATIONS_ROOT = '/tmp/m7-prisma-migrations';
export const DEFAULT_POSTGRES_IMAGE =
  'pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9';
const APPROVED_IMAGE_REPOSITORY = 'pgvector/pgvector';
const EXECUTION_BUNDLE_TABLES = [
  'ExperimentFoundationExecutionBundleIdentityV2',
  'ExperimentFoundationExecutionBundleDraftV2',
  'ExperimentFoundationExecutionBundleRevisionV2',
  'ExperimentFoundationExecutionBundleLifecycleEventV2',
  'ExperimentFoundationExecutionBundleLifecycleProjectionV2',
  'ExperimentFoundationExecutionBundleReadinessV2',
];
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
];
// Real table names of the excluded authority families. The pre-QR list used
// bare family labels that matched no table, so the census silently skipped
// them; the QR-1 zero assertion requires every listed table to exist.
const EXCLUDED_WRITE_TABLES = [
  'ExperimentFoundationExternalTrainingJob',
  'ExperimentFoundationRecord',
  'ExperimentFoundationExperimentResultV2',
  'ExperimentFoundationEvidenceCandidateV2',
  'PaperImplementationRunEvidenceUnit',
  'PaperImplementationRunEvidenceUnitV2',
];
const REQUIRED_CHECK_IDS = Array.from({ length: 15 }, (_, index) => (
  `M7-${String(index + 1).padStart(2, '0')}`
));
const TARGETED_SHARED_TESTS = [
  'src/research-lifecycle/experiment-foundation-execution-v2-contracts.schema.test.ts',
  'src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts',
];
const TARGETED_BACKEND_TESTS = [
  'src/services/experiment-v2-integration-spine.unit.test.ts',
  'src/services/experiment-foundation-real-provider-intake-v2-service.unit.test.ts',
  'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts',
  'src/services/experiment-foundation-v2-provider-payload-service.unit.test.ts',
  'src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.unit.test.ts',
  'src/routes/experiment-foundation-real-provider-v2-routes.integration.test.ts',
];
const FAKE_CLIENT_COUNTER_TESTS = [
  'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts',
];
const RELATIONAL_TESTS = [
  'src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-relational.integration.test.ts',
  'src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts',
];
const PROVIDER_IMPLEMENTATION_GREP_PATTERN = [
  ['@alicloud', 'pai-dlc'].join('/'),
  ['createJobWith', 'Options'].join(''),
].join('|');
const SOURCE_POPULATION = [
  'env/contract.yaml',
  'packages/shared/src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.ts',
  'packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts',
  'packages/shared/src/research-lifecycle/experiment-v2-canonical-hash.ts',
  'apps/backend/src/app.ts',
  'apps/backend/src/services/experiment-foundation-execution-bundle-v2-service.ts',
  'apps/backend/src/services/experiment-foundation-real-provider-payload-v2-service.ts',
  'apps/backend/src/services/experiment-foundation-real-provider-intake-v2-service.ts',
  'apps/backend/src/services/experiment-foundation-aliyun-real-provider-v2-transport.ts',
  'apps/backend/src/services/experiment-foundation-real-provider-command-v2-worker.ts',
  'apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.ts',
  'apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.ts',
  'prisma/schema.prisma',
  'prisma/migrations/20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql',
];

export function parseArgs(argv) {
  let runId = null;
  let postgresImage = DEFAULT_POSTGRES_IMAGE;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument === '--postgres-image') {
      postgresImage = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id must contain 1..64 safe filename characters');
  }
  const image = postgresImage.match(/^([^@]+)@sha256:([0-9a-f]{64})$/);
  if (
    !image
    || image[1] !== APPROVED_IMAGE_REPOSITORY
    || postgresImage !== DEFAULT_POSTGRES_IMAGE
  ) {
    throw new Error('postgres-image must equal the reviewed digest-pinned pgvector image');
  }
  return { runId, postgresImage };
}

export function selectPreM7MigrationDirectories(entries) {
  const migrations = [...new Set(entries)]
    .filter((entry) => /^\d{14}_[A-Za-z0-9_]+$/.test(entry))
    .sort();
  if (
    migrations.filter((entry) => entry === M7_MIGRATION_DIRECTORY).length !== 1
    || migrations.at(-1) !== M7_MIGRATION_DIRECTORY
  ) {
    throw new Error('M7 migration must be the unique final lexical migration');
  }
  return migrations.slice(0, -1);
}

export function buildPreM7ProviderControlSeedSql() {
  const hash = (character) => `sha256:${character.repeat(64)}`;
  return `BEGIN;
SET LOCAL session_replication_role = replica;

INSERT INTO "ExperimentFoundationProviderPayloadV2" (
  "id", "materializationKey", "runId", "runManifestHash", "runCellId", "cellKey",
  "trainingTaskSpecId", "trainingTaskSpecHash", "payloadSchemaVersion", "adapterIdentity",
  "executionMode", "provenance", "simulationProfileVersion", "redactedManifestVersion",
  "redactedManifestJson", "payloadHash", "payloadByteSize", "createdAt"
) VALUES (
  'm7-qr1-provider-payload', 'm7-qr1-materialization', 'm7-qr1-run', '${hash('a')}',
  'm7-qr1-run-cell', 'cell-1', 'm7-qr1-task-spec', '${hash('b')}',
  'FakeAliyunPaiDlcSubmitPayload@v1', 'deterministic_fake_aliyun_pai_dlc@v1',
  'simulation', 'non_production_fake_provider', 'v1', 'v1',
  '{"payload_schema":"FakeAliyunPaiDlcSubmitPayload@v1","simulation_profile_version":"v1"}'::jsonb,
  '${hash('c')}', 256, '2026-07-23T00:00:00.000Z'
);

INSERT INTO "ExperimentFoundationExecutionAttemptV2" (
  "id", "externalPiImplementationProjectId", "externalPiValidationCycleId",
  "externalPiBranchId", "externalPiWorkOrderRevisionId", "externalPiWorkOrderRevisionHash",
  "externalPiRevisionSequence", "runId", "runManifestHash", "runCellId", "cellKey",
  "trainingTaskSpecId", "trainingTaskSpecHash", "providerPayloadId", "providerPayloadHash",
  "headAcknowledgementInboxId", "attemptSequence", "workflowBusinessKey",
  "workflowRequestHash", "executionMode", "provenance", "providerIdempotencyKey",
  "lifecycleState", "stateVersion", "terminalReasonCode", "externalJobRefSchemaVersion",
  "externalJobRefJson", "externalJobRefHash", "createdAt", "updatedAt", "terminalAt"
) VALUES (
  'm7-qr1-execution-attempt', 'm7-qr1-project', 'm7-qr1-cycle', 'm7-qr1-branch',
  'm7-qr1-work-order-revision', '${hash('d')}', 1, 'm7-qr1-run', '${hash('a')}',
  'm7-qr1-run-cell', 'cell-1', 'm7-qr1-task-spec', '${hash('b')}',
  'm7-qr1-provider-payload', '${hash('c')}', 'm7-qr1-head-ack', 1,
  'm7-qr1-workflow-business-key', '${hash('e')}', 'simulation',
  'non_production_fake_provider', 'm7-qr1-provider-idempotency-key', 'succeeded', 1,
  'simulation_succeeded', 'v1',
  '{"ref_type":"fake_aliyun_pai_dlc_job","job_id":"fake-job-1"}'::jsonb,
  '${hash('f')}', '2026-07-23T00:00:01.000Z', '2026-07-23T00:00:06.000Z',
  '2026-07-23T00:00:06.000Z'
);

INSERT INTO "ExperimentFoundationCollectionAttemptV2" (
  "id", "executionAttemptId", "businessIdempotencyKey", "collectionRequestHash",
  "providerPayloadId", "providerPayloadHash", "externalJobRefJson", "externalJobRefHash",
  "collectionState", "stateVersion", "preparedAt", "updatedAt", "collectedAt"
) VALUES (
  'm7-qr1-collection-attempt', 'm7-qr1-execution-attempt',
  'm7-qr1-collection-idempotency-key', '${hash('1')}', 'm7-qr1-provider-payload',
  '${hash('c')}', '{"ref_type":"fake_aliyun_pai_dlc_job","job_id":"fake-job-1"}'::jsonb,
  '${hash('f')}', 'collected', 1, '2026-07-23T00:00:04.000Z',
  '2026-07-23T00:00:06.000Z', '2026-07-23T00:00:06.000Z'
);

INSERT INTO "ExperimentFoundationProviderCommandV2" (
  "id", "executionAttemptId", "collectionAttemptId", "commandSequence", "operation",
  "commandSchemaVersion", "commandSnapshotJson", "commandHash", "responseHash",
  "providerIdempotencyKey", "providerPayloadHash", "externalJobRefJson",
  "externalJobRefHash", "commandState", "leaseVersion", "leaseOwner", "leaseExpiresAt",
  "heartbeatAt", "attemptCount", "nextAttemptAt", "lastErrorCode", "createdAt",
  "updatedAt", "terminalAt"
) VALUES (
  'm7-qr1-provider-command', 'm7-qr1-execution-attempt', 'm7-qr1-collection-attempt',
  1, 'collect', 'v1', '{"operation":"collect","schema_version":"v1"}'::jsonb,
  '${hash('2')}', '${hash('3')}', 'm7-qr1-command-idempotency-key', '${hash('c')}',
  '{"ref_type":"fake_aliyun_pai_dlc_job","job_id":"fake-job-1"}'::jsonb,
  '${hash('f')}', 'succeeded', 1, NULL, NULL, '2026-07-23T00:00:05.000Z', 1,
  NULL, NULL, '2026-07-23T00:00:03.000Z', '2026-07-23T00:00:06.000Z',
  '2026-07-23T00:00:06.000Z'
);

INSERT INTO "ExperimentFoundationExecutionAttemptEventV2" (
  "id", "executionAttemptId", "eventSequence", "eventType", "priorState", "nextState",
  "providerCommandId", "providerPayloadHash", "externalJobRefJson", "externalJobRefHash",
  "eventSchemaVersion", "eventSnapshotJson", "eventHash", "occurredAt"
) VALUES (
  'm7-qr1-attempt-event', 'm7-qr1-execution-attempt', 1, 'succeeded', 'running',
  'succeeded', 'm7-qr1-provider-command', '${hash('c')}',
  '{"ref_type":"fake_aliyun_pai_dlc_job","job_id":"fake-job-1"}'::jsonb,
  '${hash('f')}', 'v1', '{"event_type":"succeeded","next_state":"succeeded"}'::jsonb,
  '${hash('4')}', '2026-07-23T00:00:06.000Z'
);

INSERT INTO "ExperimentFoundationProvisionalOutputV2" (
  "id", "collectionAttemptId", "ordinal", "outputKind", "outputClass",
  "manifestSchemaVersion", "redactedManifestJson", "outputHash", "createdAt"
) VALUES (
  'm7-qr1-provisional-output', 'm7-qr1-collection-attempt', 1,
  'simulation_lifecycle_trace', 'diagnostic_only', 'v1',
  '{"kind":"simulation_lifecycle_trace","redacted_locator":"simulation-trace://m7-qr1"}'::jsonb,
  '${hash('5')}', '2026-07-23T00:00:06.000Z'
);

SET LOCAL session_replication_role = origin;
COMMIT;`;
}

export function buildProviderControlSnapshotSql(profileColumn) {
  if (!['simulationProfileVersion', 'providerProfileVersion'].includes(profileColumn)) {
    throw new Error('Provider profile snapshot column is not reviewed');
  }
  const tableSnapshot = (tableName, expression = 'to_jsonb(row_value)') => (
    `(SELECT COALESCE(jsonb_agg(${expression} ORDER BY row_value."id"), '[]'::jsonb)
      FROM "${tableName}" row_value)`
  );
  const providerExpression = `(to_jsonb(row_value) - '${profileColumn}')
        || jsonb_build_object('providerProfileVersion', row_value."${profileColumn}")`;
  return `SELECT jsonb_build_object(
  'ExperimentFoundationProviderPayloadV2',
    ${tableSnapshot('ExperimentFoundationProviderPayloadV2', providerExpression)},
  'ExperimentFoundationExecutionAttemptV2',
    ${tableSnapshot('ExperimentFoundationExecutionAttemptV2')},
  'ExperimentFoundationExecutionAttemptEventV2',
    ${tableSnapshot('ExperimentFoundationExecutionAttemptEventV2')},
  'ExperimentFoundationProviderCommandV2',
    ${tableSnapshot('ExperimentFoundationProviderCommandV2')},
  'ExperimentFoundationCollectionAttemptV2',
    ${tableSnapshot('ExperimentFoundationCollectionAttemptV2')},
  'ExperimentFoundationProvisionalOutputV2',
    ${tableSnapshot('ExperimentFoundationProvisionalOutputV2')}
)::text;`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function parseProviderControlSnapshot(output) {
  let snapshot;
  try {
    snapshot = JSON.parse(String(output).trim());
  } catch {
    throw new Error('Provider-control snapshot is not one canonical JSON value');
  }
  const tableNames = Object.keys(snapshot).sort();
  if (JSON.stringify(tableNames) !== JSON.stringify([...PACK_B_TABLES].sort())) {
    throw new Error('Provider-control snapshot does not contain exactly the six reviewed tables');
  }
  const rows = PACK_B_TABLES.flatMap((tableName) => {
    if (!Array.isArray(snapshot[tableName])) {
      throw new Error(`Provider-control snapshot table is not an array: ${tableName}`);
    }
    return snapshot[tableName].map((row) => ({ tableName, row }));
  });
  if (rows.some(({ row }) => row === null || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Provider-control snapshot contains a non-object row');
  }
  const identities = rows.map(({ tableName, row }) => `${tableName}:${String(row.id)}`).sort();
  const providerRows = snapshot.ExperimentFoundationProviderPayloadV2;
  const attemptRows = snapshot.ExperimentFoundationExecutionAttemptV2;
  const providerProfileVersions = providerRows
    .map((row) => row.providerProfileVersion)
    .filter((value) => typeof value === 'string')
    .sort();
  const oldTupleRowCount = providerRows.filter((row) => (
    row.executionMode === 'simulation'
    && row.provenance === 'non_production_fake_provider'
    && row.payloadSchemaVersion === 'FakeAliyunPaiDlcSubmitPayload@v1'
    && row.adapterIdentity === 'deterministic_fake_aliyun_pai_dlc@v1'
  )).length + attemptRows.filter((row) => (
    row.executionMode === 'simulation'
    && row.provenance === 'non_production_fake_provider'
  )).length;
  return {
    semantic_sha256: sha256Bytes(canonicalJson(snapshot)),
    identity_sha256: sha256Bytes(canonicalJson(identities)),
    row_counts: Object.fromEntries(PACK_B_TABLES.map((tableName) => [
      tableName,
      snapshot[tableName].length,
    ])),
    total_row_count: rows.length,
    provider_profile_versions: providerProfileVersions,
    old_tuple_row_count: oldTupleRowCount,
  };
}

export function compareProviderControlSnapshots(before, after) {
  const expectedRowCounts = Object.fromEntries(PACK_B_TABLES.map((tableName) => [tableName, 1]));
  const rowCountsExact = [before, after].every((snapshot) => (
    JSON.stringify(snapshot.row_counts) === JSON.stringify(expectedRowCounts)
  ));
  const profilePreserved = JSON.stringify(before.provider_profile_versions)
    === JSON.stringify(['v1'])
    && JSON.stringify(after.provider_profile_versions)
      === JSON.stringify(before.provider_profile_versions);
  return {
    semantic_digest_preserved: before.semantic_sha256 === after.semantic_sha256,
    identities_preserved: before.identity_sha256 === after.identity_sha256,
    row_counts_exact: rowCountsExact,
    provider_profile_version_preserved: profilePreserved,
    old_tuple_rows_readable: after.old_tuple_row_count === 2,
  };
}

export function buildMixedTupleInsertSql() {
  const hash = (character) => `sha256:${character.repeat(64)}`;
  return `BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO "ExperimentFoundationProviderPayloadV2" (
  "id", "materializationKey", "runId", "runManifestHash", "runCellId", "cellKey",
  "trainingTaskSpecId", "trainingTaskSpecHash", "payloadSchemaVersion", "adapterIdentity",
  "executionMode", "provenance", "providerProfileVersion", "redactedManifestVersion",
  "redactedManifestJson", "payloadHash", "payloadByteSize", "createdAt"
) VALUES (
  'm7-qr1-mixed-provider-payload', 'm7-qr1-mixed-materialization', 'm7-qr1-mixed-run',
  '${hash('6')}', 'm7-qr1-mixed-run-cell', 'mixed-cell', 'm7-qr1-mixed-task-spec',
  '${hash('7')}', 'FakeAliyunPaiDlcSubmitPayload@v1',
  'deterministic_fake_aliyun_pai_dlc@v1', 'simulation', 'real_provider',
  'v1', 'v1', '{}'::jsonb, '${hash('8')}', 1,
  '2026-07-23T00:00:00.000Z'
);
SET LOCAL session_replication_role = origin;
COMMIT;`;
}

export function inspectM7Migration(sql) {
  if (typeof sql !== 'string' || sql.trim() === '' || /\/\*|\*\//.test(sql)) {
    throw new Error('M7 migration is empty or outside the reviewed SQL grammar');
  }
  const statements = splitSqlStatements(sql);
  const createdTables = statements.flatMap((statement) => {
    const match = statement.match(/^CREATE\s+TABLE\s+"([^"]+)"/i);
    return match ? [match[1]] : [];
  });
  if (JSON.stringify(createdTables.sort()) !== JSON.stringify([...EXECUTION_BUNDLE_TABLES].sort())) {
    throw new Error('M7 migration must create exactly the six typed ExecutionBundle tables');
  }
  const forbidden = statements.filter((statement) => (
    /^(?:TRUNCATE\b|DELETE\s+FROM\b|UPDATE\b|INSERT\s+INTO\b|MERGE\s+INTO\b|DROP\s+(?:TABLE|SCHEMA|DATABASE)\b|ALTER\s+TYPE\b)/i.test(statement)
    || /\b(?:ADD|DROP)\s+COLUMN\b/i.test(statement)
      && !/^ALTER\s+TABLE\s+"ExperimentFoundation(?:RunRecipe|TrainingTaskSpec)V2"\s+ADD\s+COLUMN/i.test(statement)
  ));
  if (forbidden.length > 0) {
    throw new Error('M7 migration contains a destructive or data-mutating statement');
  }
  if (
    statements.filter((statement) => /^DROP\s+INDEX\b/i.test(statement)).length !== 1
    || !sql.includes('RENAME COLUMN "simulationProfileVersion" TO "providerProfileVersion"')
    || !sql.includes('"executionMode" = \'simulation\'')
    || !sql.includes('"executionMode" = \'real_provider\'')
    || !sql.includes('"provenance" = \'non_production_fake_provider\'')
    || !sql.includes('"provenance" = \'real_provider\'')
  ) {
    throw new Error('M7 migration does not preserve the exact simulation/real tuple generalization');
  }
  const references = [...sql.matchAll(/REFERENCES\s+"([^"]+)"/gi)].map((match) => match[1]);
  const foreignKeyCount = [...sql.matchAll(/\bFOREIGN\s+KEY\b/gi)].length;
  if (
    foreignKeyCount !== 7
    || references.some((table) => /^PaperImplementation/.test(table))
    || [...sql.matchAll(/ON\s+DELETE\s+RESTRICT/gi)].length !== foreignKeyCount
    || [...sql.matchAll(/ON\s+UPDATE\s+RESTRICT/gi)].length !== foreignKeyCount
  ) {
    throw new Error('M7 migration foreign-key boundary differs from the reviewed EF-only shape');
  }
  const excluded = [
    'ExperimentFoundationRecord',
    'ExperimentFoundationReadinessReport',
    'ExperimentFoundationExternalTrainingJob',
    'ExperimentResult',
    'EvidenceCandidate',
    'RunEvidenceUnit',
  ].filter((name) => sql.includes(name));
  if (excluded.length > 0) {
    throw new Error(`M7 migration references excluded authority families: ${excluded.join(', ')}`);
  }
  return {
    source_sha256: sha256Bytes(sql),
    statement_count: statements.length,
    created_tables: createdTables.sort(),
    foreign_key_count: foreignKeyCount,
    cross_domain_foreign_key_count: 0,
    data_mutation_statement_count: 0,
    excluded_family_reference_count: 0,
    provider_profile_column_rename_count: 1,
    exact_simulation_real_tuple_present: true,
  };
}

export function inspectM7CapabilityBoundary(envContract, appSource) {
  for (const key of [
    'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
    'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  ]) {
    const pattern = new RegExp(
      `${key}:\\s*\\n\\s+type: bool\\s*\\n\\s+required: false\\s*\\n\\s+default: false`,
    );
    if (!pattern.test(envContract) || !appSource.includes(`'${key}'`)) {
      throw new Error(`M7 capability is not strict optional default-false: ${key}`);
    }
  }
  if (
    !appSource.includes('experimentFoundationV2AliyunRealProviderTransport')
    || appSource.includes('new ExperimentFoundationAliyunRealProviderTransportV2(')
    || !appSource.includes('realProviderIntakeEnabled && !input.realProviderControlDrainEnabled')
  ) {
    throw new Error('M7 app composition does not preserve injected transport and drain fencing');
  }
  return {
    intake_default: false,
    control_drain_default: false,
    intake_requires_control_drain: true,
    live_transport_construction_in_app: false,
  };
}

function splitSqlStatements(sql) {
  const withoutComments = sql.replace(/^\s*--.*$/gm, '');
  const pieces = withoutComments.split(';');
  if (pieces.at(-1)?.trim() !== '') throw new Error('M7 migration has unterminated SQL');
  return pieces.map((statement) => statement.trim()).filter(Boolean);
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

export function durableCommandEvidence(result, status) {
  const transcript = `${result.stdout}\n${result.stderr}`;
  return {
    status,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    transcript_sha256: sha256Bytes(transcript),
  };
}

export function normalizeSummaryPaths(value, repoRoot = REPO_ROOT) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSummaryPaths(entry, repoRoot));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      normalizeSummaryPaths(entry, repoRoot),
    ]));
  }
  if (typeof value !== 'string') return value;
  const normalizedRepoRoot = repoRoot.replaceAll('\\', '/').replace(/\/+$/u, '');
  return value
    .replaceAll('\\', '/')
    .replaceAll(`${normalizedRepoRoot}/`, '')
    .replaceAll(normalizedRepoRoot, '.')
    .replace(
      /(?<![A-Za-z0-9:])\/(?:[^/\s"',}\]]+\/)*[^/\s"',}\]]+/gu,
      '[machine-path]',
    );
}

export function assertDurableSummaryRedaction(summary) {
  const serialized = JSON.stringify(summary);
  if (serialized.includes('output_tail')) {
    throw new Error('Durable M7 summary contains output_tail');
  }
  if (
    serialized.includes('/Volumes/')
    || /(?<![A-Za-z0-9:])\/(?:[^/\s"',}\]]+\/)+[^/\s"',}\]]+/u.test(serialized)
  ) {
    throw new Error('Durable M7 summary contains an absolute machine path');
  }
  return {
    output_tail_absent: true,
    absolute_machine_paths_absent: true,
  };
}

async function runCheckedCommand(label, argv, artifactDir, options = {}) {
  const result = await run(argv, options);
  const status = result.exit_code === 0 ? 'passed' : 'failed';
  const evidence = durableCommandEvidence(result, status);
  const rawEvidence = {
    ...evidence,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  };
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), rawEvidence);
  if (result.exit_code !== 0) throw new Error(`${label} failed`);
  return evidence;
}

async function runTapTests(label, cwd, testFiles, artifactDir, options = {}) {
  const result = await run(
    ['node', '--test', '--loader', 'ts-node/esm', ...testFiles],
    { ...options, cwd },
  );
  const tap = exactPassingTapOutcome(result);
  const status = tap.executedWithoutSkip ? 'passed' : 'failed';
  const evidence = {
    ...durableCommandEvidence(result, status),
    test_files: testFiles,
    tap: {
      tests: tap.tests,
      passed: tap.passed,
      failed: tap.failed,
      skipped: tap.skipped,
    },
  };
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), {
    ...evidence,
    output_tail: safeTail(tap.combinedOutput),
  });
  if (!tap.executedWithoutSkip) throw new Error(`${label} failed or skipped`);
  return evidence;
}

async function sourcePopulationDigest() {
  const files = [];
  for (const relativePath of SOURCE_POPULATION) {
    files.push({
      path: relativePath,
      sha256: await sha256File(path.join(REPO_ROOT, relativePath)),
    });
  }
  return {
    profile: 'experiment-foundation-m7-source-population@v1',
    file_count: files.length,
    digest: sha256Bytes(JSON.stringify(files)),
    files,
  };
}

function isApprovedProviderImplementationPath(relativePath) {
  return relativePath
    === 'apps/backend/src/services/experiment-foundation-aliyun-real-provider-v2-transport.ts'
    || relativePath
      === 'apps/backend/src/services/experiment-foundation-real-provider-payload-v2-service.ts'
    || /^apps\/backend\/src\/services\/experiment-foundation-v2-aliyun-[^/]+\.ts$/u
      .test(relativePath)
    || relativePath
      === 'apps/backend/scripts/run-experiment-foundation-cloud-preflight.ts'
    || /(?:^|\/)[^/]+(?:\.unit|\.integration|\.schema)?\.test\.[cm]?[jt]sx?$/u
      .test(relativePath)
    || /^packages\/shared\/src\/.*contracts\.[cm]?[jt]sx?$/u.test(relativePath);
}

export function inspectDuplicateProviderImplementations(gitGrepOutput) {
  const matchedFiles = [...new Set(String(gitGrepOutput)
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean))]
    .sort();
  if (matchedFiles.some((file) => path.isAbsolute(file) || file.includes('..'))) {
    throw new Error('Provider implementation scan returned a non-repository-relative path');
  }
  const nonAllowlistedFiles = matchedFiles.filter(
    (relativePath) => !isApprovedProviderImplementationPath(relativePath),
  );
  return {
    grep_pattern: PROVIDER_IMPLEMENTATION_GREP_PATTERN,
    matched_tracked_source_files: matchedFiles,
    non_allowlisted_files: nonAllowlistedFiles,
    duplicate_provider_implementation_count: nonAllowlistedFiles.length,
  };
}

async function scanDuplicateProviderImplementations() {
  const result = await run([
    'git', 'grep', '-l', '-E', PROVIDER_IMPLEMENTATION_GREP_PATTERN, '--',
    '*.ts', '*.tsx', '*.js', '*.mjs', '*.cjs',
  ], { timeoutMs: 30_000 });
  if (![0, 1].includes(result.exit_code)) {
    throw new Error(`M7 provider implementation scan failed: ${safeTail(result.stderr)}`);
  }
  return inspectDuplicateProviderImplementations(result.stdout);
}

async function inspectT106Handoff(runId) {
  const root = path.join(REPO_ROOT, 'dev-docs/active/experiment-foundation-real-interaction-hardening');
  const files = ['00-overview.md', '01-plan.md', '02-architecture.md', '04-verification.md'];
  const [contentParts, duplicateScan] = await Promise.all([
    Promise.all(files.map((file) => fs.readFile(path.join(root, file), 'utf8'))),
    scanDuplicateProviderImplementations(),
  ]);
  const content = contentParts.join('\n');
  const hasBoundary = content.includes('T-132 M7')
    && (
      content.includes('must not implement a separate provider transport or schema')
      || content.includes('T-106 implements no provider transport or schema')
      || (
        content.includes('T-132 M7 is the sole owner')
        && content.includes('must not gain `CreateJob`, provider SDK composition')
      )
    );
  const hasVerdictImport = content.includes(runId)
    && content.includes('.ai/.tmp/experiment-foundation-productization');
  return {
    ownership_boundary_present: hasBoundary,
    verdict_run_id_imported: hasVerdictImport,
    ...duplicateScan,
    exact: hasBoundary
      && hasVerdictImport
      && duplicateScan.duplicate_provider_implementation_count === 0,
  };
}

async function startDatabase(runId, postgresImage) {
  const disposable = await startDisposablePostgres({
    runId,
    postgresImage,
    runCommand: run,
    safeTail,
    databasePrefixes: ['packb', 'packb_prem7'],
    containerNamePrefix: 'pea-m7',
    portResolutionErrorMessage: 'Cannot resolve M7 PostgreSQL port',
    portWaitErrorMessage: 'Disposable M7 PostgreSQL port did not become reachable',
    postgresWaitErrorMessage: 'Disposable M7 PostgreSQL did not become ready',
    startupFailureMessage: 'Disposable M7 PostgreSQL startup failed',
    pgIsReadyArguments: (databaseName) => [
      'pg_isready', '-U', 'postgres', '-d', databaseName,
    ],
  });
  return {
    ...disposable,
    databaseName: disposable.databaseNames.packb,
    databaseUrl: disposable.databaseUrls.packb,
    preM7DatabaseName: disposable.databaseNames.packb_prem7,
    preM7DatabaseUrl: disposable.databaseUrls.packb_prem7,
  };
}

async function runContainerPsql(disposable, databaseName, arguments_, options = {}) {
  return await run([
    'docker', 'exec', disposable.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', databaseName,
    ...arguments_,
  ], { timeoutMs: options.timeoutMs ?? 120_000 });
}

async function runContainerPsqlChecked(
  disposable,
  databaseName,
  arguments_,
  failureMessage,
  options = {},
) {
  const result = await runContainerPsql(disposable, databaseName, arguments_, options);
  if (result.exit_code !== 0) {
    throw new Error(`${failureMessage}: ${safeTail(`${result.stdout}\n${result.stderr}`)}`);
  }
  return result;
}

async function inspectMigrationRowPreservation(disposable, artifactDir) {
  const migrationEntries = await fs.readdir(MIGRATIONS_ROOT);
  const preM7Migrations = selectPreM7MigrationDirectories(migrationEntries);
  const created = await run([
    'docker', 'exec', disposable.containerName,
    'createdb', '-U', 'postgres', disposable.preM7DatabaseName,
  ], { timeoutMs: 30_000 });
  if (created.exit_code !== 0) {
    throw new Error(`Cannot create pre-M7 comparison database: ${safeTail(created.stderr)}`);
  }
  await markDisposableDatabase({
    runCommand: run,
    safeTail,
    containerName: disposable.containerName,
    databaseName: disposable.preM7DatabaseName,
    marker: `experiment-foundation-packb-prem7-disposable:${disposable.nonce}`,
    failureMessage: 'Cannot mark pre-M7 comparison database',
  });
  const copied = await run([
    'docker', 'cp', MIGRATIONS_ROOT,
    `${disposable.containerName}:${CONTAINER_MIGRATIONS_ROOT}`,
  ], { timeoutMs: 120_000 });
  if (copied.exit_code !== 0) {
    throw new Error(`Cannot copy migrations into M7 container: ${safeTail(copied.stderr)}`);
  }
  for (const migrationDirectory of preM7Migrations) {
    await runContainerPsqlChecked(
      disposable,
      disposable.preM7DatabaseName,
      ['-f', `${CONTAINER_MIGRATIONS_ROOT}/${migrationDirectory}/migration.sql`],
      `Pre-M7 migration failed: prisma/migrations/${migrationDirectory}/migration.sql`,
      { timeoutMs: 180_000 },
    );
  }
  await runContainerPsqlChecked(
    disposable,
    disposable.preM7DatabaseName,
    ['-c', buildPreM7ProviderControlSeedSql()],
    'Pre-M7 provider-control seed failed',
  );
  const beforeResult = await runContainerPsqlChecked(
    disposable,
    disposable.preM7DatabaseName,
    ['-At', '-c', buildProviderControlSnapshotSql('simulationProfileVersion')],
    'Pre-M7 provider-control snapshot failed',
  );
  const before = parseProviderControlSnapshot(beforeResult.stdout);
  await runContainerPsqlChecked(
    disposable,
    disposable.preM7DatabaseName,
    ['-f', `${CONTAINER_MIGRATIONS_ROOT}/${M7_MIGRATION_DIRECTORY}/migration.sql`],
    'M7-only row-preservation migration failed',
    { timeoutMs: 180_000 },
  );
  const afterResult = await runContainerPsqlChecked(
    disposable,
    disposable.preM7DatabaseName,
    ['-At', '-c', buildProviderControlSnapshotSql('providerProfileVersion')],
    'Post-M7 provider-control snapshot failed',
  );
  const after = parseProviderControlSnapshot(afterResult.stdout);
  const comparison = compareProviderControlSnapshots(before, after);
  if (Object.values(comparison).some((value) => value !== true)) {
    throw new Error(`M7 provider-control rows changed: ${JSON.stringify(comparison)}`);
  }
  const mixedTuple = await runContainerPsql(
    disposable,
    disposable.preM7DatabaseName,
    ['-c', buildMixedTupleInsertSql()],
  );
  const mixedTupleOutput = `${mixedTuple.stdout}\n${mixedTuple.stderr}`;
  const mixedTupleRejected = mixedTuple.exit_code !== 0
    && mixedTupleOutput.includes('ef_provider_payload_exact_tuple_check');
  if (!mixedTupleRejected) {
    throw new Error('M7 mixed simulation/real provider tuple did not fail its exact CHECK');
  }
  const legacyColumn = await runContainerPsql(
    disposable,
    disposable.preM7DatabaseName,
    [
      '-c',
      'SELECT "simulationProfileVersion" FROM "ExperimentFoundationProviderPayloadV2"',
    ],
  );
  const legacyColumnOutput = `${legacyColumn.stdout}\n${legacyColumn.stderr}`;
  const legacyColumnRejected = legacyColumn.exit_code !== 0
    && legacyColumnOutput.includes('simulationProfileVersion')
    && /does not exist/iu.test(legacyColumnOutput);
  if (!legacyColumnRejected) {
    throw new Error('M7 legacy simulationProfileVersion reference did not fail closed');
  }
  const evidence = {
    status: 'passed',
    pre_m7_migration_count: preM7Migrations.length,
    first_pre_m7_migration: preM7Migrations[0],
    last_pre_m7_migration: preM7Migrations.at(-1),
    applied_m7_migration: M7_MIGRATION_DIRECTORY,
    seeded_table_row_counts: before.row_counts,
    seeded_total_row_count: before.total_row_count,
    before_semantic_sha256: before.semantic_sha256,
    after_semantic_sha256: after.semantic_sha256,
    before_identity_sha256: before.identity_sha256,
    after_identity_sha256: after.identity_sha256,
    simulation_profile_version_before: before.provider_profile_versions[0],
    provider_profile_version_after: after.provider_profile_versions[0],
    old_tuple_row_count_after: after.old_tuple_row_count,
    migration_succeeded: true,
    ...comparison,
    mixed_tuple_insert_rejected: true,
    mixed_tuple_rejected_by_constraint: 'ef_provider_payload_exact_tuple_check',
    legacy_column_reference_rejected: true,
    legacy_simulation_profile_column_absent: true,
  };
  await writeJsonAtomic(path.join(artifactDir, 'migration-row-preservation.json'), {
    ...evidence,
    mixed_tuple_output_tail: safeTail(mixedTupleOutput),
    legacy_column_output_tail: safeTail(legacyColumnOutput),
  });
  return evidence;
}

export function assertExcludedWriteTablesZero(rowCensus) {
  const counts = Object.fromEntries(EXCLUDED_WRITE_TABLES.map((tableName) => [
    tableName,
    rowCensus?.[tableName],
  ]));
  const exact = Object.values(counts).every((count) => count === 0);
  if (!exact) {
    throw new Error(`M7 excluded write census is not exactly zero: ${JSON.stringify(counts)}`);
  }
  return {
    excluded_write_table_counts: counts,
    excluded_write_tables_zero: true,
  };
}

async function inspectSchema(disposable) {
  const bundleTables = EXECUTION_BUNDLE_TABLES.map((name) => `'${name}'`).join(',');
  const allTables = [...EXECUTION_BUNDLE_TABLES, ...PACK_B_TABLES, ...EXCLUDED_WRITE_TABLES]
    .map((name) => `'${name}'`).join(',');
  const sql = `SELECT json_build_object(
    'bundle_tables', (SELECT COALESCE(json_agg(tablename ORDER BY tablename), '[]'::json)
      FROM pg_catalog.pg_tables WHERE schemaname=current_schema() AND tablename IN (${bundleTables})),
    'bundle_fks', (SELECT COALESCE(json_agg(json_build_object(
      'name', c.conname, 'source', s.relname, 'target', t.relname,
      'delete_action', c.confdeltype, 'update_action', c.confupdtype
    ) ORDER BY c.conname), '[]'::json)
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class s ON s.oid=c.conrelid
      JOIN pg_catalog.pg_class t ON t.oid=c.confrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=s.relnamespace
      WHERE c.contype='f' AND n.nspname=current_schema()
        AND (s.relname IN (${bundleTables}) OR c.conname IN ('ef_run_recipe_execution_bundle_fkey','ef_task_spec_execution_bundle_fkey'))),
    'cross_domain_fks', (SELECT count(*) FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class s ON s.oid=c.conrelid
      JOIN pg_catalog.pg_class t ON t.oid=c.confrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=s.relnamespace
      WHERE c.contype='f' AND n.nspname=current_schema()
        AND ((s.relname LIKE 'PaperImplementation%' AND t.relname LIKE 'ExperimentFoundation%')
          OR (s.relname LIKE 'ExperimentFoundation%' AND t.relname LIKE 'PaperImplementation%'))),
    'provider_profile_column', EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='ExperimentFoundationProviderPayloadV2'
        AND column_name='providerProfileVersion'),
    'simulation_profile_column', EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='ExperimentFoundationProviderPayloadV2'
        AND column_name='simulationProfileVersion'),
    'provider_tuple_check', (SELECT pg_get_constraintdef(c.oid) FROM pg_catalog.pg_constraint c
      WHERE c.conname='ef_provider_payload_exact_tuple_check'),
    'attempt_tuple_check', (SELECT pg_get_constraintdef(c.oid) FROM pg_catalog.pg_constraint c
      WHERE c.conname='ef_execution_attempt_exact_tuple_check'),
    'row_census', (SELECT COALESCE(json_object_agg(table_name, row_count), '{}'::json) FROM (
      SELECT table_name, (xpath('/row/count/text()', query_to_xml(
        format('SELECT count(*) AS count FROM %I', table_name), false, true, '')))[1]::text::int AS row_count
      FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN (${allTables})
    ) rows)
  )::text`;
  const result = await run([
    'docker', 'exec', disposable.containerName,
    'psql', '-v', 'ON_ERROR_STOP=1', '-At', '-U', 'postgres', '-d', disposable.databaseName,
    '-c', sql,
  ], { timeoutMs: 30_000 });
  if (result.exit_code !== 0) throw new Error(`M7 schema census failed: ${safeTail(result.stderr)}`);
  const evidence = JSON.parse(result.stdout.trim());
  const exactTables = JSON.stringify(evidence.bundle_tables)
    === JSON.stringify([...EXECUTION_BUNDLE_TABLES].sort());
  const safeFks = evidence.bundle_fks.length === 7
    && evidence.bundle_fks.every((row) => (
      ['a', 'r'].includes(row.delete_action) && ['a', 'r'].includes(row.update_action)
    ));
  const tupleChecks = [evidence.provider_tuple_check, evidence.attempt_tuple_check]
    .every((definition) => (
      typeof definition === 'string'
      && definition.includes('simulation')
      && definition.includes('real_provider')
    ));
  if (
    !exactTables
    || !safeFks
    || evidence.cross_domain_fks !== 0
    || evidence.provider_profile_column !== true
    || evidence.simulation_profile_column !== false
    || !tupleChecks
  ) {
    throw new Error(`M7 effective schema differs from the reviewed shape: ${JSON.stringify(evidence)}`);
  }
  return {
    exact: true,
    execution_bundle_table_count: evidence.bundle_tables.length,
    execution_bundle_fk_count: evidence.bundle_fks.length,
    cross_domain_fk_count: evidence.cross_domain_fks,
    provider_profile_column_present: true,
    legacy_simulation_profile_column_present: false,
    exact_tuple_checks_present: true,
    final_row_census: evidence.row_census,
  };
}

function passingTapAssertion(root, testEvidence, requiredFiles) {
  const fields = [
    `${root}.status === "passed"`,
    `${root}.exit_code === 0`,
    `${root}.tap.tests > 0`,
    `${root}.tap.passed === ${root}.tap.tests`,
    `${root}.tap.failed === 0`,
    `${root}.tap.skipped === 0`,
    ...requiredFiles.map((file) => `${root}.test_files includes "${file}"`),
  ];
  const passed = testEvidence?.status === 'passed'
    && testEvidence?.exit_code === 0
    && Number.isInteger(testEvidence?.tap?.tests)
    && testEvidence.tap.tests > 0
    && testEvidence.tap.passed === testEvidence.tap.tests
    && testEvidence.tap.failed === 0
    && testEvidence.tap.skipped === 0
    && requiredFiles.every((file) => testEvidence.test_files?.includes(file));
  return { passed, fields };
}

function exactFieldAssertions(entries) {
  return {
    passed: entries.every((entry) => entry.actual === entry.expected),
    fields: entries.map((entry) => (
      `${entry.field} === ${JSON.stringify(entry.expected)}`
    )),
  };
}

function combineAssertions(...assertions) {
  return {
    passed: assertions.every((assertion) => assertion.passed),
    fields: assertions.flatMap((assertion) => assertion.fields),
  };
}

export function buildStaticBoundaryAssertions(
  environmentIsolation,
  capabilities,
  backendTestEvidence,
) {
  const fakeClientTests = passingTapAssertion(
    'tests.backend',
    backendTestEvidence,
    FAKE_CLIENT_COUNTER_TESTS,
  );
  if (
    environmentIsolation?.policy !== 'explicit_allowlist@v1'
    || !Array.isArray(environmentIsolation.exposed_sensitive_keys)
    || environmentIsolation.exposed_sensitive_keys.length !== 0
    || capabilities?.live_transport_construction_in_app !== false
    || !fakeClientTests.passed
  ) {
    throw new Error('M7 static provider/cost boundary evidence is incomplete');
  }
  return {
    classification: 'static_boundary_assertions_not_runtime_measurements',
    hermetic_environment: {
      policy: environmentIsolation.policy,
      exposed_sensitive_keys: environmentIsolation.exposed_sensitive_keys,
      existing_database_url_present_but_ignored:
        environmentIsolation.existing_database_url_present_but_ignored,
    },
    source_boundary: {
      live_transport_construction_in_app: false,
    },
    fake_client_counters: {
      asserted_counter_names: ['createCount', 'listCount', 'stopCount'],
      asserting_test_files: [...FAKE_CLIENT_COUNTER_TESTS],
      test_files_executed_and_passed: true,
      tap_tests: backendTestEvidence.tap.tests,
      tap_passed: backendTestEvidence.tap.passed,
      tap_failed: backendTestEvidence.tap.failed,
      tap_skipped: backendTestEvidence.tap.skipped,
    },
    provider_call_boundary_established: true,
    billable_resource_boundary_established: true,
  };
}

function evaluateM7Check(id, summary) {
  const backend = (files) => passingTapAssertion('tests.backend', summary.tests?.backend, files);
  const shared = (files) => passingTapAssertion('tests.shared', summary.tests?.shared, files);
  const relational = (files) => (
    passingTapAssertion('tests.relational', summary.tests?.relational, files)
  );
  const exact = (entries) => exactFieldAssertions(entries.map(([field, actual, expected]) => ({
    field, actual, expected,
  })));
  switch (id) {
    case 'M7-01':
      return combineAssertions(
        exact([
          ['migration_row_preservation.status', summary.migration_row_preservation?.status, 'passed'],
          [
            'migration_row_preservation.migration_succeeded',
            summary.migration_row_preservation?.migration_succeeded,
            true,
          ],
          [
            'migration_row_preservation.semantic_digest_preserved',
            summary.migration_row_preservation?.semantic_digest_preserved,
            true,
          ],
          [
            'migration_row_preservation.identities_preserved',
            summary.migration_row_preservation?.identities_preserved,
            true,
          ],
          [
            'migration_row_preservation.row_counts_exact',
            summary.migration_row_preservation?.row_counts_exact,
            true,
          ],
          [
            'migration_row_preservation.seeded_total_row_count',
            summary.migration_row_preservation?.seeded_total_row_count,
            6,
          ],
          [
            'migration_row_preservation.provider_profile_version_preserved',
            summary.migration_row_preservation?.provider_profile_version_preserved,
            true,
          ],
          [
            'migration_row_preservation.old_tuple_rows_readable',
            summary.migration_row_preservation?.old_tuple_rows_readable,
            true,
          ],
          [
            'migration_row_preservation.mixed_tuple_insert_rejected',
            summary.migration_row_preservation?.mixed_tuple_insert_rejected,
            true,
          ],
          [
            'migration_row_preservation.mixed_tuple_rejected_by_constraint',
            summary.migration_row_preservation?.mixed_tuple_rejected_by_constraint,
            'ef_provider_payload_exact_tuple_check',
          ],
          [
            'migration_row_preservation.legacy_column_reference_rejected',
            summary.migration_row_preservation?.legacy_column_reference_rejected,
            true,
          ],
          [
            'migration_row_preservation.legacy_simulation_profile_column_absent',
            summary.migration_row_preservation?.legacy_simulation_profile_column_absent,
            true,
          ],
        ]),
        relational([
          'src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts',
        ]),
      );
    case 'M7-02':
      return backend(['src/services/experiment-v2-integration-spine.unit.test.ts']);
    case 'M7-03':
      return combineAssertions(
        shared([
          'src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts',
        ]),
        backend([
          'src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts',
          'src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.unit.test.ts',
        ]),
      );
    case 'M7-04':
      return combineAssertions(
        exact([
          ['capabilities.intake_default', summary.capabilities?.intake_default, false],
          [
            'capabilities.control_drain_default',
            summary.capabilities?.control_drain_default,
            false,
          ],
          [
            'capabilities.live_transport_construction_in_app',
            summary.capabilities?.live_transport_construction_in_app,
            false,
          ],
        ]),
        backend([
          'src/services/experiment-foundation-real-provider-intake-v2-service.unit.test.ts',
          'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
        ]),
      );
    case 'M7-05':
      return combineAssertions(
        exact([
          [
            'migration.exact_simulation_real_tuple_present',
            summary.migration?.exact_simulation_real_tuple_present,
            true,
          ],
          [
            'schema_census.exact_tuple_checks_present',
            summary.schema_census?.exact_tuple_checks_present,
            true,
          ],
          [
            'schema_census.provider_profile_column_present',
            summary.schema_census?.provider_profile_column_present,
            true,
          ],
          [
            'schema_census.legacy_simulation_profile_column_present',
            summary.schema_census?.legacy_simulation_profile_column_present,
            false,
          ],
          [
            'migration_row_preservation.mixed_tuple_insert_rejected',
            summary.migration_row_preservation?.mixed_tuple_insert_rejected,
            true,
          ],
        ]),
        shared([
          'src/research-lifecycle/experiment-foundation-execution-v2-contracts.schema.test.ts',
          'src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts',
        ]),
        backend([
          'src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.unit.test.ts',
        ]),
        relational([
          'src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts',
        ]),
      );
    case 'M7-06':
    case 'M7-07':
      return backend(FAKE_CLIENT_COUNTER_TESTS);
    case 'M7-08':
      return combineAssertions(
        shared([
          'src/research-lifecycle/experiment-foundation-real-provider-v2-contracts.schema.test.ts',
        ]),
        backend([
          'src/services/experiment-foundation-aliyun-real-provider-v2-transport.unit.test.ts',
        ]),
      );
    case 'M7-09':
      return backend([
        'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
      ]);
    case 'M7-10':
      return backend(FAKE_CLIENT_COUNTER_TESTS);
    case 'M7-11':
      return combineAssertions(
        exact([
          [
            'schema_census.excluded_write_tables_zero',
            summary.schema_census?.excluded_write_tables_zero,
            true,
          ],
          [
            'schema_census.excluded_write_table_counts.ExperimentFoundationExternalTrainingJob',
            summary.schema_census?.excluded_write_table_counts
              ?.ExperimentFoundationExternalTrainingJob,
            0,
          ],
          [
            'schema_census.excluded_write_table_counts.ExperimentFoundationExperimentResultV2',
            summary.schema_census?.excluded_write_table_counts
              ?.ExperimentFoundationExperimentResultV2,
            0,
          ],
          [
            'schema_census.excluded_write_table_counts.ExperimentFoundationEvidenceCandidateV2',
            summary.schema_census?.excluded_write_table_counts
              ?.ExperimentFoundationEvidenceCandidateV2,
            0,
          ],
          [
            'schema_census.excluded_write_table_counts.PaperImplementationRunEvidenceUnitV2',
            summary.schema_census?.excluded_write_table_counts
              ?.PaperImplementationRunEvidenceUnitV2,
            0,
          ],
          [
            'schema_census.excluded_write_table_counts.PaperImplementationRunEvidenceUnit',
            summary.schema_census?.excluded_write_table_counts
              ?.PaperImplementationRunEvidenceUnit,
            0,
          ],
        ]),
        backend([
          'src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts',
        ]),
      );
    case 'M7-12':
      return combineAssertions(
        exact([
          [
            'schema_census.excluded_write_tables_zero',
            summary.schema_census?.excluded_write_tables_zero,
            true,
          ],
        ]),
        backend([
          'src/services/experiment-foundation-v2-scientific-validation-service.unit.test.ts',
        ]),
      );
    case 'M7-13':
      return combineAssertions(
        exact([
          [
            'static_boundary_assertions.classification',
            summary.static_boundary_assertions?.classification,
            'static_boundary_assertions_not_runtime_measurements',
          ],
          [
            'static_boundary_assertions.hermetic_environment.policy',
            summary.static_boundary_assertions?.hermetic_environment?.policy,
            'explicit_allowlist@v1',
          ],
          [
            'static_boundary_assertions.source_boundary.live_transport_construction_in_app',
            summary.static_boundary_assertions?.source_boundary
              ?.live_transport_construction_in_app,
            false,
          ],
          [
            'static_boundary_assertions.fake_client_counters.test_files_executed_and_passed',
            summary.static_boundary_assertions?.fake_client_counters
              ?.test_files_executed_and_passed,
            true,
          ],
          [
            'static_boundary_assertions.provider_call_boundary_established',
            summary.static_boundary_assertions?.provider_call_boundary_established,
            true,
          ],
          [
            'static_boundary_assertions.billable_resource_boundary_established',
            summary.static_boundary_assertions?.billable_resource_boundary_established,
            true,
          ],
          [
            'redaction.summary_self_check_passed',
            summary.redaction?.summary_self_check_passed,
            true,
          ],
        ]),
        backend(FAKE_CLIENT_COUNTER_TESTS),
      );
    case 'M7-14':
      return combineAssertions(
        exact([
          [
            'capabilities.intake_requires_control_drain',
            summary.capabilities?.intake_requires_control_drain,
            true,
          ],
          [
            'capabilities.control_drain_default',
            summary.capabilities?.control_drain_default,
            false,
          ],
        ]),
        backend([
          'src/services/experiment-foundation-real-provider-intake-v2-service.unit.test.ts',
          'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
        ]),
      );
    case 'M7-15': {
      const assertion = exact([
        [
          'handoff.ownership_boundary_present',
          summary.handoff?.ownership_boundary_present,
          true,
        ],
        [
          'handoff.verdict_run_id_imported',
          summary.handoff?.verdict_run_id_imported,
          true,
        ],
        [
          'handoff.duplicate_provider_implementation_count',
          summary.handoff?.duplicate_provider_implementation_count,
          0,
        ],
        [
          'handoff.non_allowlisted_files.length',
          summary.handoff?.non_allowlisted_files?.length,
          0,
        ],
      ]);
      if (assertion.passed) return assertion;
      const status = summary.handoff?.ownership_boundary_present === true
        && summary.handoff?.duplicate_provider_implementation_count === 0
        && summary.handoff?.non_allowlisted_files?.length === 0
        && summary.handoff?.verdict_run_id_imported === false
        ? 'blocked'
        : 'failed';
      return { ...assertion, status };
    }
    default:
      throw new Error(`No M7 predicate exists for ${id}`);
  }
}

export function evaluateM7Checks(summary) {
  return Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => {
    const predicate = evaluateM7Check(id, summary);
    return [id, {
      status: predicate.status ?? (predicate.passed ? 'passed' : 'failed'),
      evidence: predicate.fields,
    }];
  }));
}

async function main() {
  const { runId, postgresImage } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });
  const [migrationSql, envContract, appSource] = await Promise.all([
    fs.readFile(MIGRATION_PATH, 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'env/contract.yaml'), 'utf8'),
    fs.readFile(path.join(REPO_ROOT, 'apps/backend/src/app.ts'), 'utf8'),
  ]);
  const summary = {
    run_id: runId,
    status: 'running',
    phase: 'M7-I3-offline-isolated',
    started_at: new Date().toISOString(),
    finished_at: null,
    source_population: null,
    environment_isolation: describeEnvironmentIsolation(),
    capabilities: null,
    migration: null,
    migration_row_preservation: null,
    schema_census: null,
    tests: {},
    disposable_postgres: {
      image: postgresImage,
      existing_database_url_used: false,
      started: false,
      database_name: null,
      pre_m7_database_name: null,
      marker: null,
      cleaned_up: false,
    },
    static_boundary_assertions: null,
    write_census: {
      named_database_writes: 0,
      existing_database_migrations_applied: 0,
      scientific_result_writes: 0,
      evidence_candidate_writes: 0,
      run_evidence_unit_writes: 0,
      legacy_writes: 0,
    },
    handoff: null,
    checks: Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, {
      status: 'not_run', evidence: [],
    }])),
    redaction: {
      database_url_persisted: false,
      database_password_persisted: false,
      canonical_payload_bytes_persisted: false,
      raw_provider_response_persisted: false,
      raw_object_locator_persisted: false,
      summary_self_check_passed: false,
    },
    blockers: [],
  };
  let disposable = null;
  try {
    summary.source_population = await sourcePopulationDigest();
    summary.migration = inspectM7Migration(migrationSql);
    summary.capabilities = inspectM7CapabilityBoundary(envContract, appSource);

    summary.tests.shared_typecheck = await runCheckedCommand(
      'shared-typecheck',
      ['pnpm', '--filter', '@paper-engineering-assistant/shared', 'typecheck'],
      artifactDir,
      { timeoutMs: 240_000 },
    );
    summary.tests.backend_typecheck = await runCheckedCommand(
      'backend-typecheck',
      ['pnpm', '--filter', '@paper-engineering-assistant/backend', 'typecheck'],
      artifactDir,
      { timeoutMs: 300_000 },
    );
    summary.tests.shared = await runTapTests(
      'shared-targeted-tests',
      path.join(REPO_ROOT, 'packages/shared'),
      TARGETED_SHARED_TESTS,
      artifactDir,
      { timeoutMs: 240_000 },
    );
    summary.tests.backend = await runTapTests(
      'backend-targeted-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      TARGETED_BACKEND_TESTS,
      artifactDir,
      {
        env: {
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
          EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED: '',
        },
        timeoutMs: 360_000,
      },
    );
    summary.static_boundary_assertions = buildStaticBoundaryAssertions(
      summary.environment_isolation,
      summary.capabilities,
      summary.tests.backend,
    );

    disposable = await startDatabase(runId, postgresImage);
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.database_name = disposable.databaseName;
    summary.disposable_postgres.pre_m7_database_name = disposable.preM7DatabaseName;
    summary.disposable_postgres.marker = await markDisposableDatabase({
      runCommand: run,
      safeTail,
      containerName: disposable.containerName,
      databaseName: disposable.databaseName,
      marker: `experiment-foundation-packb-disposable:${disposable.nonce}`,
      failureMessage: 'Cannot mark disposable M7 database',
    });
    summary.migration_row_preservation = await inspectMigrationRowPreservation(
      disposable,
      artifactDir,
    );
    summary.tests.migration_deploy = await runCheckedCommand(
      'migration-deploy',
      ['pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
      artifactDir,
      { env: { DATABASE_URL: disposable.databaseUrl }, timeoutMs: 300_000 },
    );
    summary.schema_census = await inspectSchema(disposable);
    await writeJsonAtomic(path.join(artifactDir, 'schema-census.json'), summary.schema_census);
    summary.tests.relational = await runTapTests(
      'relational-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      RELATIONAL_TESTS,
      artifactDir,
      {
        env: {
          DATABASE_URL: disposable.databaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_URL: disposable.databaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.databaseName,
          EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
          EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA: '1',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
          EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED: '',
        },
        timeoutMs: 420_000,
      },
    );
    summary.schema_census = await inspectSchema(disposable);
    Object.assign(
      summary.schema_census,
      assertExcludedWriteTablesZero(summary.schema_census.final_row_census),
    );
    summary.write_census.scientific_result_writes =
      summary.schema_census.excluded_write_table_counts.ExperimentResult;
    summary.write_census.evidence_candidate_writes =
      summary.schema_census.excluded_write_table_counts.EvidenceCandidate;
    summary.write_census.run_evidence_unit_writes =
      summary.schema_census.excluded_write_table_counts.RunEvidenceUnit;
    summary.write_census.legacy_writes =
      summary.schema_census.excluded_write_table_counts
        .ExperimentFoundationExternalTrainingJob;
    await writeJsonAtomic(path.join(artifactDir, 'schema-census.json'), summary.schema_census);
    summary.handoff = await inspectT106Handoff(runId);
    assertDurableSummaryRedaction(normalizeSummaryPaths(summary));
    summary.redaction.summary_self_check_passed = true;
    summary.checks = evaluateM7Checks(summary);

    const failedChecks = Object.entries(summary.checks)
      .filter(([, check]) => check.status === 'failed')
      .map(([id]) => id);
    const blockedChecks = Object.entries(summary.checks)
      .filter(([, check]) => check.status === 'blocked')
      .map(([id]) => id);
    if (failedChecks.length > 0) {
      summary.status = 'failed';
      summary.blockers.push({
        reason_code: 'M7_PREDICATE_FAILED',
        message: `Executable M7 predicates failed: ${failedChecks.join(', ')}.`,
      });
    } else if (blockedChecks.length > 0) {
      summary.status = 'blocked';
      summary.blockers.push({
        reason_code: 'T106_M7_VERDICT_NOT_IMPORTED',
        message: `T-106 must import the redacted M7 gate run ${runId} before M7-15 can pass.`,
      });
    } else {
      summary.status = 'passed';
    }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE') {
      summary.status = 'blocked';
      summary.blockers.push({
        reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
        message: error.message,
      });
    } else {
      summary.status = 'failed';
      summary.blockers.push({
        reason_code: 'M7_GATE_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(disposable.containerName, { runCommand: run });
      summary.disposable_postgres.cleaned_up = cleanup.exit_code === 0;
      if (cleanup.exit_code !== 0) {
        summary.status = 'failed';
        summary.blockers.push({
          reason_code: 'DISPOSABLE_POSTGRES_CLEANUP_FAILED',
          message: safeTail(cleanup.stderr),
        });
      }
    }
    summary.finished_at = new Date().toISOString();
    const durableSummary = normalizeSummaryPaths(summary);
    assertDurableSummaryRedaction(durableSummary);
    await writeJsonAtomic(summaryPath, durableSummary);
  }
  console.log(JSON.stringify({
    status: summary.status,
    run_id: runId,
    summary_path: path.relative(REPO_ROOT, summaryPath),
  }));
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
