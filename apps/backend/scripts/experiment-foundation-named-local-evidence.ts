import assert from 'node:assert/strict';

import { Prisma, type PrismaClient } from '@prisma/client';

import { sha256Bytes } from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';

export interface ExperimentFoundationNamedLocalTargetContract {
  database: string;
  schema: string;
  host: string;
  port: string;
  fingerprint: string;
}

export interface ExperimentFoundationNamedLocalObservedTarget {
  database: string;
  schema: string;
  host: string;
  port: string;
  fingerprint: string;
}

export interface ExperimentFoundationNamedLocalRowDigest {
  count: number;
  digest: string;
}

export interface ExperimentFoundationNamedLocalApplicationTableDescriptor {
  name: string;
  orderColumns: string[];
}

export interface ExperimentFoundationNamedLocalScientificPersistenceReadiness {
  migration: string;
  constraints: string[];
}

const SCIENTIFIC_PERSISTENCE_MIGRATION =
  '20260808090000_add_scientific_source_and_packet_closure_binding';
const SCIENTIFIC_PERSISTENCE_CONSTRAINTS = [
  'ef_experiment_result_source_contract_check',
  'ef_provisional_output_contract_check',
  'pirip_scientific_v2_contract_check',
] as const;

type ReadClient = PrismaClient | Prisma.TransactionClient;

export function assertExperimentFoundationNamedLocalDatabaseUrl(
  databaseUrl: string,
  target: ExperimentFoundationNamedLocalTargetContract,
  mismatchCode: string,
): void {
  const parsed = new URL(databaseUrl);
  if (
    parsed.protocol !== 'postgresql:'
    || parsed.hostname !== target.host
    || (parsed.port || target.port) !== target.port
    || parsed.pathname !== `/${target.database}`
    || parsed.searchParams.get('schema') !== target.schema
  ) {
    throw new Error(mismatchCode);
  }
}

export async function assertExperimentFoundationLiveNamedLocalTarget(
  client: ReadClient,
  target: ExperimentFoundationNamedLocalTargetContract,
): Promise<ExperimentFoundationNamedLocalObservedTarget> {
  const rows = await client.$queryRaw<Array<{
    database_name: string;
    schema_name: string;
    server_address: string;
    server_port: number;
  }>>`SELECT current_database() AS database_name,
             current_schema() AS schema_name,
             host(inet_server_addr()) AS server_address,
             inet_server_port()::int AS server_port`;
  const row = rows[0];
  assert.ok(row);
  assert.equal(row.database_name, target.database);
  assert.equal(row.schema_name, target.schema);
  assert.ok([target.host, '::1'].includes(row.server_address));
  assert.equal(row.server_port, Number(target.port));
  return {
    database: row.database_name,
    schema: row.schema_name,
    host: target.host,
    port: target.port,
    fingerprint: target.fingerprint,
  };
}

/** Fail before paid execution if the named-local target is behind the scientific DB SSOT. */
export async function assertExperimentFoundationNamedLocalScientificPersistenceReady(
  client: ReadClient,
  mismatchCode: string,
): Promise<ExperimentFoundationNamedLocalScientificPersistenceReadiness> {
  const [migrations, constraints] = await Promise.all([
    client.$queryRawUnsafe<Array<{ migration_name: string }>>(
      `SELECT migration_name
       FROM "_prisma_migrations"
       WHERE migration_name = '${SCIENTIFIC_PERSISTENCE_MIGRATION}'
         AND finished_at IS NOT NULL
         AND rolled_back_at IS NULL`,
    ),
    client.$queryRawUnsafe<Array<{ constraint_name: string }>>(
      `SELECT constraint_row.conname::text AS constraint_name
       FROM pg_constraint AS constraint_row
       WHERE constraint_row.connamespace = current_schema()::regnamespace
         AND constraint_row.conname IN (
           'ef_experiment_result_source_contract_check',
           'ef_provisional_output_class_check',
           'ef_provisional_output_contract_check',
           'pirip_scientific_v2_contract_check'
         )
       ORDER BY constraint_row.conname COLLATE "C" ASC`,
    ),
  ]);
  const observedConstraints = constraints.map((row) => row.constraint_name);
  if (
    migrations.length !== 1
    || migrations[0]?.migration_name !== SCIENTIFIC_PERSISTENCE_MIGRATION
    || !isExactStringSet(observedConstraints, SCIENTIFIC_PERSISTENCE_CONSTRAINTS)
  ) {
    throw new Error(mismatchCode);
  }
  return {
    migration: SCIENTIFIC_PERSISTENCE_MIGRATION,
    constraints: [...SCIENTIFIC_PERSISTENCE_CONSTRAINTS],
  };
}

export async function enforceExperimentFoundationReadOnlyTransaction(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const rows = await transaction.$queryRawUnsafe<Array<{ transaction_read_only: string }>>(
    'SHOW transaction_read_only',
  );
  if (rows[0]?.transaction_read_only !== 'on') {
    throw new Error('EXPERIMENT_FOUNDATION_READ_ONLY_TRANSACTION_NOT_ENFORCED');
  }
}

export async function digestExperimentFoundationNamedLocalTables(
  client: ReadClient,
  tableNames: readonly string[],
): Promise<Record<string, ExperimentFoundationNamedLocalRowDigest>> {
  const tables: Record<string, ExperimentFoundationNamedLocalRowDigest> = {};
  for (const tableName of tableNames) {
    assertSafeIdentifier(tableName);
    const rows = await client.$queryRawUnsafe<Array<{ row_json: Prisma.JsonValue }>>(
      `SELECT to_jsonb(table_row) AS row_json
       FROM "${tableName}" AS table_row
       ORDER BY table_row."id" COLLATE "C" ASC`,
    );
    tables[tableName] = {
      count: rows.length,
      digest: `sha256:${sha256Bytes(canonicalizeExperimentFoundationEvidenceJson(
        rows.map((row) => row.row_json),
      ))}`,
    };
  }
  return tables;
}

export async function countExperimentFoundationNamedLocalTables(
  client: ReadClient,
  tableNames: readonly string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const tableName of tableNames) {
    assertSafeIdentifier(tableName);
    const rows = await client.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM "${tableName}"`,
    );
    counts[tableName] = rows[0]?.count ?? 0;
  }
  return counts;
}

export async function listExperimentFoundationNamedLocalApplicationTables(
  client: ReadClient,
  expectedWriteTables: readonly string[] = [],
): Promise<ExperimentFoundationNamedLocalApplicationTableDescriptor[]> {
  const rows = await client.$queryRawUnsafe<Array<{
    table_name: string;
    order_columns: string[];
  }>>(
    `SELECT table_row.table_name::text AS table_name,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM information_schema.columns AS id_column
                WHERE id_column.table_schema = table_row.table_schema
                  AND id_column.table_name = table_row.table_name
                  AND id_column.column_name = 'id'
              )
                THEN ARRAY['id']::text[]
              ELSE ARRAY(
                SELECT key_column.column_name::text
                FROM information_schema.table_constraints AS table_constraint
                JOIN information_schema.key_column_usage AS key_column
                  ON key_column.constraint_schema = table_constraint.constraint_schema
                 AND key_column.constraint_name = table_constraint.constraint_name
                 AND key_column.table_schema = table_constraint.table_schema
                 AND key_column.table_name = table_constraint.table_name
                WHERE table_constraint.table_schema = table_row.table_schema
                  AND table_constraint.table_name = table_row.table_name
                  AND table_constraint.constraint_type = 'PRIMARY KEY'
                ORDER BY key_column.ordinal_position
              )
            END AS order_columns
     FROM information_schema.tables AS table_row
     WHERE table_row.table_schema = current_schema()
       AND table_row.table_type = 'BASE TABLE'
       AND table_row.table_name <> '_prisma_migrations'
     ORDER BY table_row.table_name COLLATE "C" ASC`,
  );
  const tables = rows.map((row) => ({
    name: row.table_name,
    orderColumns: row.order_columns,
  }));
  for (const table of tables) {
    if (table.orderColumns.length === 0) {
      throw new Error(`Application table lacks a stable primary-key order: ${table.name}`);
    }
  }
  for (const expected of expectedWriteTables) {
    if (!tables.some((table) => table.name === expected)) {
      throw new Error(`Expected write table is missing: ${expected}`);
    }
  }
  return tables;
}

export async function digestExperimentFoundationNamedLocalTableRowVersions(
  client: ReadClient,
  tablesToDigest: readonly ExperimentFoundationNamedLocalApplicationTableDescriptor[],
): Promise<Record<string, ExperimentFoundationNamedLocalRowDigest>> {
  const tables: Record<string, ExperimentFoundationNamedLocalRowDigest> = {};
  for (const table of tablesToDigest) {
    assertSafeIdentifier(table.name);
    table.orderColumns.forEach(assertSafeIdentifier);
    const orderBy = table.orderColumns
      .map((column) => `table_row."${column}" ASC`)
      .join(', ');
    const rowSignature = [
      ...table.orderColumns.map((column) => `table_row."${column}"`),
      'table_row.xmin::text',
    ].join(', ');
    const rows = await client.$queryRawUnsafe<Array<{ row_json: Prisma.JsonValue }>>(
      `SELECT jsonb_build_array(${rowSignature}) AS row_json
       FROM "${table.name}" AS table_row
       ORDER BY ${orderBy}`,
    );
    tables[table.name] = {
      count: rows.length,
      digest: `sha256:${sha256Bytes(canonicalizeExperimentFoundationEvidenceJson(
        rows.map((row) => row.row_json),
      ))}`,
    };
  }
  return tables;
}

export function changedExperimentFoundationNamedLocalTables(
  before: Record<string, ExperimentFoundationNamedLocalRowDigest>,
  after: Record<string, ExperimentFoundationNamedLocalRowDigest>,
): string[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((tableName) => (
      !(tableName in before)
      || !(tableName in after)
      || canonicalizeExperimentFoundationEvidenceJson(before[tableName])
        !== canonicalizeExperimentFoundationEvidenceJson(after[tableName])
    ))
    .sort();
}

export function canonicalizeExperimentFoundationEvidenceJson(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeExperimentFoundationEvidenceJson).join(',')}]`;
  }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number');
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'object':
      return `{${Object.keys(value).sort().map((key) => {
        const entry = (value as Record<string, unknown>)[key];
        if (entry === undefined) throw new TypeError(`Undefined JSON value at ${key}`);
        return `${JSON.stringify(key)}:${canonicalizeExperimentFoundationEvidenceJson(entry)}`;
      }).join(',')}}`;
    default:
      throw new TypeError(`Unsupported JSON value: ${typeof value}`);
  }
}

function assertSafeIdentifier(value: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error('Unsafe SQL identifier');
  }
}

function isExactStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedRight = [...right].sort();
  return [...left].sort().every((value, index) => value === sortedRight[index]);
}
