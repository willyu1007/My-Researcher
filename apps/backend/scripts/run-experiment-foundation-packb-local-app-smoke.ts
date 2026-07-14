import crypto from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Prisma, PrismaClient } from '@prisma/client';

import {
  sha256File,
  writeJsonAtomic,
} from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';
import { buildApp, resolveTitleCardManagementStoreConfig } from '../src/app.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REVIEWED_TARGET_FINGERPRINT =
  'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0';
const REVIEWED_APPLICATION_SCHEMA = 'my_researcher_dev';
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
] as const;
const BACKGROUND_DRAIN_GUARD_TABLES = [
  'PaperImplementationExperimentIntegrationOutboxV2',
  'ExperimentFoundationIntegrationOutboxV2',
] as const;
const EXPECTED_APPLICATION_TABLES = [...new Set([
  ...Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name),
  '_prisma_migrations',
])].sort();
const TABLE_CENSUS_DIGEST_PROFILE =
  'sha256-length-prefixed-pg-jsonb-text-primary-key-order@v2';
const TABLE_CENSUS_TRANSPORT = 'read-only-repeatable-read-cursor@v1';
const TABLE_CENSUS_ORDERING_KEY_PROFILE = 'catalog-primary-key-columns@v1';
const TABLE_CENSUS_FETCH_ROW_LIMIT = 64;
const TABLE_CENSUS_STATEMENT_TIMEOUT_MS = 30_000;
const TABLE_CENSUS_LOCK_TIMEOUT_MS = 5_000;
const TABLE_CENSUS_TRANSACTION_TIMEOUT_MS = 600_000;
const TABLE_CENSUS_WORK_MEM_KIB = 4_096;

type ProbeResult = {
  status_code: number;
  error_code: string | null;
  reason_code: string | null;
};

function parseArgs(argv: string[]): { runId: string; outputPath: string } {
  let runId: string | null = null;
  let outputPath: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argv[index] === '--output') {
      outputPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id is required and must be a safe 1..64 character identifier');
  }
  const expectedRoot = path.join(
    REPO_ROOT,
    '.ai/.tmp/experiment-foundation-productization',
    runId,
  );
  const resolvedOutput = outputPath
    ? path.resolve(REPO_ROOT, outputPath)
    : path.join(expectedRoot, 'packb-local-app-smoke.json');
  if (!resolvedOutput.startsWith(`${expectedRoot}${path.sep}`)) {
    throw new Error('--output must stay inside the run-specific Pack B artifact directory');
  }
  return { runId, outputPath: resolvedOutput };
}

function assertNamedLocalDatabase(databaseUrl: string): void {
  const parsed = new URL(databaseUrl);
  if (
    parsed.protocol !== 'postgresql:'
    || parsed.hostname !== '127.0.0.1'
    || (parsed.port || '5432') !== '5432'
    || parsed.pathname !== '/postgres'
    || parsed.searchParams.get('schema') !== 'my_researcher_dev'
  ) {
    throw new Error('PACK_B_APP_SMOKE_NAMED_LOCAL_TARGET_MISMATCH');
  }
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error('Unsafe SQL identifier');
  return `"${value}"`;
}

function tableSetDigest(tableNames: readonly string[]): string {
  return `sha256:${crypto
    .createHash('sha256')
    .update(JSON.stringify([...tableNames].sort()))
    .digest('hex')}`;
}

async function readApplicationTableNames(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT class_row.relname AS table_name
     FROM pg_catalog.pg_class AS class_row
     JOIN pg_catalog.pg_namespace AS namespace_row
       ON namespace_row.oid = class_row.relnamespace
     WHERE namespace_row.nspname = current_schema()
       AND namespace_row.nspname NOT IN ('pg_catalog', 'information_schema')
       AND namespace_row.nspname !~ '^pg_toast'
       AND class_row.relkind IN ('r', 'p')
     ORDER BY class_row.relname COLLATE "C"`,
  );
  const tableNames = rows.map((row) => row.table_name);
  if (
    tableNames.some((tableName) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName))
    || new Set(tableNames).size !== tableNames.length
  ) {
    throw new Error('PACK_B_LOCAL_APP_SMOKE_INVALID_CATALOG_TABLE_SET');
  }
  return tableNames;
}

async function readApplicationPrimaryKeyColumns(
  prisma: PrismaClient,
  tableNames: readonly string[],
): Promise<Record<string, string[]>> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    table_name: string;
    primary_key_columns: string[];
    primary_key_types: string[];
  }>>(
    `SELECT class_row.relname AS table_name,
            array_agg(attribute_row.attname ORDER BY key_column.ordinality)
              AS primary_key_columns,
            array_agg(type_row.typname ORDER BY key_column.ordinality)
              AS primary_key_types
     FROM pg_catalog.pg_index AS index_row
     JOIN pg_catalog.pg_class AS class_row
       ON class_row.oid = index_row.indrelid
     JOIN pg_catalog.pg_namespace AS namespace_row
       ON namespace_row.oid = class_row.relnamespace
     CROSS JOIN LATERAL unnest(index_row.indkey) WITH ORDINALITY
       AS key_column(attribute_number, ordinality)
     JOIN pg_catalog.pg_attribute AS attribute_row
       ON attribute_row.attrelid = class_row.oid
      AND attribute_row.attnum = key_column.attribute_number
     JOIN pg_catalog.pg_type AS type_row
       ON type_row.oid = attribute_row.atttypid
     WHERE namespace_row.nspname = current_schema()
       AND index_row.indisprimary
     GROUP BY class_row.relname
     ORDER BY class_row.relname COLLATE "C"`,
  );
  const primaryKeys = Object.fromEntries(rows.map((row) => {
    if (
      row.primary_key_columns.length === 0
      || row.primary_key_columns.some((column) => (
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)
      ))
      || row.primary_key_types.some((typeName) => !['text', 'varchar'].includes(typeName))
    ) {
      throw new Error(`PACK_B_LOCAL_APP_SMOKE_UNSUPPORTED_PRIMARY_KEY:${row.table_name}`);
    }
    return [row.table_name, row.primary_key_columns];
  }));
  if (JSON.stringify(Object.keys(primaryKeys).sort()) !== JSON.stringify([...tableNames])) {
    throw new Error('PACK_B_LOCAL_APP_SMOKE_PRIMARY_KEY_CENSUS_MISMATCH');
  }
  return primaryKeys;
}

async function readCensus(
  prisma: PrismaClient,
  schemaName: string,
  tableNames: readonly string[],
  primaryKeyColumns: Readonly<Record<string, readonly string[]>>,
): Promise<Record<string, {
  count: number;
  digest: string;
}>> {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await tx.$executeRawUnsafe(
      `SET LOCAL statement_timeout = '${TABLE_CENSUS_STATEMENT_TIMEOUT_MS}ms'`,
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL lock_timeout = '${TABLE_CENSUS_LOCK_TIMEOUT_MS}ms'`,
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL work_mem = '${TABLE_CENSUS_WORK_MEM_KIB}kB'`,
    );
    const census: Record<string, { count: number; digest: string }> = {};
    const cursorName = 'packb_application_table_census_cursor';
    for (const tableName of tableNames) {
      const orderingColumns = primaryKeyColumns[tableName];
      if (!orderingColumns || orderingColumns.length === 0) {
        throw new Error(`PACK_B_LOCAL_APP_SMOKE_PRIMARY_KEY_MISSING:${tableName}`);
      }
      const orderBy = orderingColumns
        .map((column) => `${quoteIdentifier(column)} ASC`)
        .join(', ');
      await tx.$executeRawUnsafe(
        `DECLARE ${quoteIdentifier(cursorName)} NO SCROLL CURSOR FOR
         SELECT to_jsonb(table_row)::text AS row_json
         FROM ${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)} AS table_row
         ORDER BY ${orderBy}`,
      );
      const hash = crypto.createHash('sha256');
      hash.update(`${TABLE_CENSUS_DIGEST_PROFILE}\n`, 'utf8');
      let count = 0;
      while (true) {
        const rows = await tx.$queryRawUnsafe<Array<{ row_json: string }>>(
          `FETCH FORWARD ${TABLE_CENSUS_FETCH_ROW_LIMIT}
           FROM ${quoteIdentifier(cursorName)}`,
        );
        if (rows.length > TABLE_CENSUS_FETCH_ROW_LIMIT) {
          throw new Error('PACK_B_LOCAL_APP_SMOKE_CENSUS_FETCH_LIMIT_EXCEEDED');
        }
        for (const row of rows) {
          if (typeof row.row_json !== 'string') {
            throw new Error('PACK_B_LOCAL_APP_SMOKE_CENSUS_ROW_NOT_CANONICAL_JSON');
          }
          const byteLength = Buffer.byteLength(row.row_json, 'utf8');
          const lengthPrefix = Buffer.allocUnsafe(8);
          lengthPrefix.writeBigUInt64BE(BigInt(byteLength));
          hash.update(lengthPrefix);
          hash.update(row.row_json, 'utf8');
          count += 1;
          if (!Number.isSafeInteger(count)) {
            throw new Error('PACK_B_LOCAL_APP_SMOKE_CENSUS_COUNT_OVERFLOW');
          }
        }
        if (rows.length < TABLE_CENSUS_FETCH_ROW_LIMIT) break;
      }
      await tx.$executeRawUnsafe(`CLOSE ${quoteIdentifier(cursorName)}`);
      census[tableName] = {
        count,
        digest: `sha256:${hash.digest('hex')}`,
      };
    }
    return census;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    maxWait: TABLE_CENSUS_LOCK_TIMEOUT_MS,
    timeout: TABLE_CENSUS_TRANSACTION_TIMEOUT_MS,
  });
}

async function readAndVerifyTargetFingerprint(prisma: PrismaClient): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    database_name: string;
    schema_name: string;
    system_identifier: string;
    database_oid: string;
    schema_oid: string;
  }>>(
    `SELECT current_database() AS database_name,
            current_schema() AS schema_name,
            system_row.system_identifier::text AS system_identifier,
            database_row.oid::text AS database_oid,
            schema_row.oid::text AS schema_oid
     FROM pg_control_system() AS system_row
     JOIN pg_catalog.pg_database AS database_row
       ON database_row.datname = current_database()
     JOIN pg_catalog.pg_namespace AS schema_row
       ON schema_row.nspname = current_schema()`,
  );
  const identity = rows[0];
  if (!identity || identity.database_name !== 'postgres' || identity.schema_name !== 'my_researcher_dev') {
    throw new Error('PACK_B_APP_SMOKE_DATABASE_IDENTITY_MISMATCH');
  }
  const fields = [
    'pack-a-local-target-fingerprint@v1',
    '127.0.0.1',
    '5432',
    'postgres',
    'my_researcher_dev',
    String(identity.system_identifier),
    String(identity.database_oid),
    String(identity.schema_oid),
  ];
  const fingerprint = `sha256:${crypto
    .createHash('sha256')
    .update(`${fields.join('\n')}\n`)
    .digest('hex')}`;
  if (fingerprint !== REVIEWED_TARGET_FINGERPRINT) {
    throw new Error('PACK_B_APP_SMOKE_TARGET_FINGERPRINT_MISMATCH');
  }
  return fingerprint;
}

async function readCounts(
  prisma: PrismaClient,
  schemaName: string,
  tableNames: readonly string[],
): Promise<Record<string, number>> {
  return Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count
       FROM ${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`,
    );
    return [tableName, rows[0]?.count ?? 0];
  })));
}

function responseEvidence(response: {
  statusCode: number;
  json(): unknown;
}): ProbeResult {
  const body = response.json() as {
    error?: { code?: string; details?: { reason_code?: string } };
  };
  return {
    status_code: response.statusCode,
    error_code: body.error?.code ?? null,
    reason_code: body.error?.details?.reason_code ?? null,
  };
}

async function runMode(workflowSimulationEnabled: boolean): Promise<{
  workflow_simulation_enabled: boolean;
  simulation: ProbeResult;
  legacy_mutation: ProbeResult;
  status_read: ProbeResult;
}> {
  const app = buildApp({
    backgroundWorkEnabled: false,
    paperImplementationExperimentV2AdmissionEnabled: () => true,
    paperImplementationExperimentV2CutoverCommitted: () => true,
    experimentFoundationV2WorkflowSimulationEnabled: () => workflowSimulationEnabled,
  });
  try {
    const runId = `packb-local-app-smoke-missing-run-${crypto.randomBytes(12).toString('hex')}`;
    const simulation = await app.inject({
      method: 'POST',
      url: `/experiment-foundation/v2/runs/${runId}/workflow-simulations`,
      payload: { business_idempotency_key: `local-app-smoke-${workflowSimulationEnabled}` },
    });
    const legacyMutation = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/records',
      payload: {},
    });
    const statusRead = await app.inject({
      method: 'GET',
      url: `/experiment-foundation/v2/runs/${runId}/workflow-simulation-status`,
    });
    return {
      workflow_simulation_enabled: workflowSimulationEnabled,
      simulation: responseEvidence(simulation),
      legacy_mutation: responseEvidence(legacyMutation),
      status_read: responseEvidence(statusRead),
    };
  } finally {
    await app.close();
  }
}

function assertExpectedProbes(disabled: Awaited<ReturnType<typeof runMode>>, enabled: Awaited<ReturnType<typeof runMode>>): void {
  const expected = {
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
  } as const;
  for (const [mode, evidence] of Object.entries({ disabled, enabled })) {
    for (const operation of ['simulation', 'legacy_mutation', 'status_read'] as const) {
      const actual = evidence[operation];
      const [statusCode, errorCode, reasonCode] = expected[mode as 'disabled' | 'enabled'][operation];
      if (
        actual.status_code !== statusCode
        || actual.error_code !== errorCode
        || actual.reason_code !== reasonCode
      ) {
        throw new Error(`PACK_B_APP_SMOKE_UNEXPECTED_${mode.toUpperCase()}_${operation.toUpperCase()}`);
      }
    }
  }
}

async function main(): Promise<void> {
  const { runId, outputPath } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertNamedLocalDatabase(databaseUrl);
  const storeConfig = resolveTitleCardManagementStoreConfig();
  if (
    storeConfig.experimentFoundationStrategy !== 'prisma'
    || storeConfig.paperImplementationStrategy !== 'prisma'
  ) {
    throw new Error('PACK_B_APP_SMOKE_REQUIRES_PRISMA_COMPOSITION');
  }
  if ((process.env.AUTO_PULL_SCHEDULER_ENABLED ?? '').trim().toLowerCase() !== 'false') {
    throw new Error('PACK_B_APP_SMOKE_REQUIRES_AUTO_PULL_SCHEDULER_DISABLED');
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  globalThis.fetch = async () => {
    fetchCallCount += 1;
    throw new Error('PACK_B_LOCAL_APP_SMOKE_EXTERNAL_REQUEST_BLOCKED');
  };
  try {
    await prisma.$connect();
    const targetFingerprint = await readAndVerifyTargetFingerprint(prisma);
    const applicationTablesBefore = await readApplicationTableNames(prisma);
    const applicationPrimaryKeyColumns = await readApplicationPrimaryKeyColumns(
      prisma,
      applicationTablesBefore,
    );
    const expectedApplicationTableDigest = tableSetDigest(EXPECTED_APPLICATION_TABLES);
    const observedApplicationTableDigest = tableSetDigest(applicationTablesBefore);
    if (
      JSON.stringify(applicationTablesBefore) !== JSON.stringify(EXPECTED_APPLICATION_TABLES)
      || observedApplicationTableDigest !== expectedApplicationTableDigest
    ) {
      throw new Error('PACK_B_LOCAL_APP_SMOKE_APPLICATION_TABLE_SET_MISMATCH');
    }
    const before = await readCensus(
      prisma,
      REVIEWED_APPLICATION_SCHEMA,
      applicationTablesBefore,
      applicationPrimaryKeyColumns,
    );
    const backgroundDrainGuards = await readCounts(
      prisma,
      REVIEWED_APPLICATION_SCHEMA,
      BACKGROUND_DRAIN_GUARD_TABLES,
    );
    if (
      PACK_B_TABLES.some((tableName) => before[tableName]?.count !== 0)
      || Object.values(backgroundDrainGuards).some((count) => count !== 0)
    ) {
      throw new Error('PACK_B_LOCAL_APP_SMOKE_NONEMPTY_DRAIN_PREREQUISITE');
    }
    const disabled = await runMode(false);
    const enabled = await runMode(true);
    assertExpectedProbes(disabled, enabled);
    const applicationTablesAfter = await readApplicationTableNames(prisma);
    if (JSON.stringify(applicationTablesAfter) !== JSON.stringify(applicationTablesBefore)) {
      throw new Error('PACK_B_LOCAL_APP_SMOKE_APPLICATION_TABLE_SET_CHANGED');
    }
    const after = await readCensus(
      prisma,
      REVIEWED_APPLICATION_SCHEMA,
      applicationTablesAfter,
      applicationPrimaryKeyColumns,
    );
    const changedTables = applicationTablesBefore.filter((tableName) => (
      before[tableName].count !== after[tableName].count
      || before[tableName].digest !== after[tableName].digest
    ));
    if (changedTables.length > 0 || fetchCallCount !== 0) {
      throw new Error(`PACK_B_LOCAL_APP_SMOKE_PROHIBITED_EFFECT:${changedTables.join(',')}`);
    }
    const sourceFiles = [
      path.relative(REPO_ROOT, SCRIPT_PATH),
      'prisma/schema.prisma',
      'apps/backend/src/app.ts',
      'apps/backend/src/routes/experiment-foundation-execution-v2-routes.ts',
      'apps/backend/src/routes/experiment-v2-route-validation.ts',
      'apps/backend/src/routes/experiment-foundation-routes.ts',
    ];
    const artifact = {
      schema_version: 'experiment-foundation-packb-local-app-smoke@v5',
      run_id: runId,
      generated_at: new Date().toISOString(),
      target_class: 'named_loopback_local_development',
      target_fingerprint: targetFingerprint,
      composition: {
        paper_implementation_repository: storeConfig.paperImplementationStrategy,
        experiment_foundation_repository: storeConfig.experimentFoundationStrategy,
        auto_pull_scheduler_enabled: false,
        background_work_enabled: false,
      },
      network_transport: 'hard_denied_by_throwing_fetch',
      application_table_inventory: {
        source: 'pg_catalog.pg_class@current_schema/base_and_partitioned_tables',
        schema: REVIEWED_APPLICATION_SCHEMA,
        expected_table_count: EXPECTED_APPLICATION_TABLES.length,
        observed_table_count: applicationTablesBefore.length,
        expected_table_set_digest: expectedApplicationTableDigest,
        observed_table_set_digest: observedApplicationTableDigest,
        row_digest_profile: TABLE_CENSUS_DIGEST_PROFILE,
        census_transport: TABLE_CENSUS_TRANSPORT,
        ordering_key_profile: TABLE_CENSUS_ORDERING_KEY_PROFILE,
        fetch_row_limit: TABLE_CENSUS_FETCH_ROW_LIMIT,
        statement_timeout_ms: TABLE_CENSUS_STATEMENT_TIMEOUT_MS,
        lock_timeout_ms: TABLE_CENSUS_LOCK_TIMEOUT_MS,
        transaction_timeout_ms: TABLE_CENSUS_TRANSACTION_TIMEOUT_MS,
        work_mem_kib: TABLE_CENSUS_WORK_MEM_KIB,
        exact: true,
      },
      disabled,
      enabled,
      measured_effects: {
        background_drain_guard_counts: backgroundDrainGuards,
        measured_table_count: applicationTablesBefore.length,
        inspected_tables: applicationTablesBefore,
        application_table_set_digest: observedApplicationTableDigest,
        changed_table_count: changedTables.length,
        changed_tables: changedTables,
        application_table_snapshots_before: before,
        application_table_snapshots_after: after,
        external_fetch_attempts: fetchCallCount,
        provider_command_row_delta:
          after.ExperimentFoundationProviderCommandV2.count
          - before.ExperimentFoundationProviderCommandV2.count,
      },
      source_files: Object.fromEntries(await Promise.all(sourceFiles.map(async (filePath) => [
        filePath,
        await sha256File(path.join(REPO_ROOT, filePath)),
      ]))),
      sensitive_values_stored: false,
    };
    await writeJsonAtomic(outputPath, artifact);
    process.stdout.write(`${JSON.stringify({
      run_id: runId,
      status: 'passed',
      output_path: path.relative(REPO_ROOT, outputPath),
    })}\n`);
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
