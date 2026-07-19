import { PrismaClient } from '@prisma/client';

export type DisposablePostgresTestDatabasePrefix = 'd19' | 'packb' | 'packc';

export interface DisposablePostgresTestDatabaseIdentity {
  database_url: string;
  database_name: string;
  nonce: string;
  marker: string;
}

export interface DisposablePostgresDatabaseMarkerRow {
  database_name: string;
  marker: string | null;
}

export interface DisposablePostgresDatabaseIdentityEnvironment {
  databaseUrlKey:
    | 'EXPERIMENT_V2_TEST_DATABASE_URL'
    | 'EXPERIMENT_FOUNDATION_D19_DATABASE_URL'
    | 'EXPERIMENT_FOUNDATION_PACKB_DATABASE_URL'
    | 'EXPERIMENT_FOUNDATION_PACKC_DATABASE_URL';
  databaseNameKey?:
    | 'EXPERIMENT_V2_TEST_DATABASE_NAME'
    | 'EXPERIMENT_FOUNDATION_D19_DATABASE_NAME';
  nonceKey:
    | 'EXPERIMENT_V2_TEST_DISPOSABLE_NONCE'
    | 'EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE'
    | 'EXPERIMENT_FOUNDATION_PACKB_DISPOSABLE_NONCE'
    | 'EXPERIMENT_FOUNDATION_PACKC_DISPOSABLE_NONCE';
}

const NONCE_PATTERN = /^[0-9a-f]{64}$/;
const DISPOSABLE_PASSWORD_PATTERN = /^[0-9a-f]{48}$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const MARKER_PREFIXES: Record<DisposablePostgresTestDatabasePrefix, string> = {
  d19: 'experiment-foundation-d19-disposable',
  packb: 'experiment-foundation-packb-disposable',
  packc: 'experiment-foundation-packc-disposable',
};

export function requireDisposablePostgresDatabaseIdentity(
  environment: NodeJS.ProcessEnv,
  expectedDatabasePrefix: DisposablePostgresTestDatabasePrefix,
  identityEnvironment: DisposablePostgresDatabaseIdentityEnvironment,
): DisposablePostgresTestDatabaseIdentity {
  const explicitUrl = environment[identityEnvironment.databaseUrlKey]?.trim();
  const prismaUrl = environment.DATABASE_URL?.trim();
  const nonce = environment[identityEnvironment.nonceKey]?.trim();
  if (!explicitUrl) {
    throw new Error(
      `${identityEnvironment.databaseUrlKey} is required; no DATABASE_URL fallback is allowed`,
    );
  }
  if (!prismaUrl || prismaUrl !== explicitUrl) {
    throw new Error(
      `DATABASE_URL must be present and exactly match ${identityEnvironment.databaseUrlKey}`,
    );
  }
  if (!nonce || !NONCE_PATTERN.test(nonce)) {
    throw new Error(
      `${identityEnvironment.nonceKey} must be 64 lowercase hex characters`,
    );
  }

  const expectedDatabaseName = `${expectedDatabasePrefix}_${nonce.slice(0, 12)}`;
  if (identityEnvironment.databaseNameKey) {
    const suppliedDatabaseName = environment[identityEnvironment.databaseNameKey]?.trim();
    if (suppliedDatabaseName !== expectedDatabaseName) {
      throw new Error(
        `${identityEnvironment.databaseNameKey} must equal randomized identity ${expectedDatabasePrefix}_<nonce-prefix>`,
      );
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(explicitUrl);
  } catch {
    throw new Error(`${identityEnvironment.databaseUrlKey} must be a valid PostgreSQL URL`);
  }
  if (parsed.protocol !== 'postgresql:' || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error('Disposable PostgreSQL requires the postgresql protocol and a loopback host');
  }
  if (parsed.pathname !== `/${expectedDatabaseName}`) {
    throw new Error('Disposable PostgreSQL URL must target the exact nonce-derived database name');
  }
  const port = Number(parsed.port);
  if (
    !parsed.port
    || !/^\d+$/.test(parsed.port)
    || !Number.isSafeInteger(port)
    || port < 1
    || port > 65_535
  ) {
    throw new Error('Disposable PostgreSQL URL must include an explicit public container port');
  }
  if (
    parsed.username !== 'postgres'
    || !DISPOSABLE_PASSWORD_PATTERN.test(parsed.password)
  ) {
    throw new Error(
      'Disposable PostgreSQL URL credentials must use postgres and a generated 48-hex password',
    );
  }
  if (parsed.hash !== '') {
    throw new Error('Disposable PostgreSQL URL must not include a fragment');
  }
  if (
    parsed.searchParams.getAll('schema').length !== 1
    || parsed.searchParams.get('schema') !== 'public'
    || [...parsed.searchParams.keys()].some((key) => key !== 'schema')
  ) {
    throw new Error('Disposable PostgreSQL URL must select only the public schema');
  }

  return {
    database_url: explicitUrl,
    database_name: expectedDatabaseName,
    nonce,
    marker: `${MARKER_PREFIXES[expectedDatabasePrefix]}:${nonce}`,
  };
}

export function requireDisposablePostgresTestDatabaseIdentity(
  environment: NodeJS.ProcessEnv,
  expectedDatabasePrefix: DisposablePostgresTestDatabasePrefix,
): DisposablePostgresTestDatabaseIdentity {
  return requireDisposablePostgresDatabaseIdentity(
    environment,
    expectedDatabasePrefix,
    {
      databaseUrlKey: 'EXPERIMENT_V2_TEST_DATABASE_URL',
      databaseNameKey: 'EXPERIMENT_V2_TEST_DATABASE_NAME',
      nonceKey: 'EXPERIMENT_V2_TEST_DISPOSABLE_NONCE',
    },
  );
}

export function assertDisposablePostgresTestDatabaseMarker(
  identity: DisposablePostgresTestDatabaseIdentity,
  rows: readonly DisposablePostgresDatabaseMarkerRow[],
): void {
  if (
    rows.length !== 1
    || rows[0]?.database_name !== identity.database_name
    || rows[0]?.marker !== identity.marker
  ) {
    throw new Error(
      'PostgreSQL database identity marker does not match the randomized disposable test identity',
    );
  }
}

export async function openVerifiedDisposablePostgresTestDatabase<
  TPrisma extends PrismaClient = PrismaClient,
>(
  environment: NodeJS.ProcessEnv,
  expectedDatabasePrefix: DisposablePostgresTestDatabasePrefix,
  createClient?: (databaseUrl: string) => TPrisma,
): Promise<{
  identity: DisposablePostgresTestDatabaseIdentity;
  prisma: TPrisma;
}> {
  const identity = requireDisposablePostgresTestDatabaseIdentity(
    environment,
    expectedDatabasePrefix,
  );
  const prisma = createClient
    ? createClient(identity.database_url)
    : new PrismaClient({
      datasources: { db: { url: identity.database_url } },
    }) as TPrisma;
  try {
    const rows = await prisma.$queryRaw<DisposablePostgresDatabaseMarkerRow[]>`
      SELECT
        current_database()::text AS database_name,
        shobj_description(database_row.oid, 'pg_database')::text AS marker
      FROM pg_catalog.pg_database AS database_row
      WHERE database_row.datname = current_database()
    `;
    assertDisposablePostgresTestDatabaseMarker(identity, rows);
    return { identity, prisma };
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}
