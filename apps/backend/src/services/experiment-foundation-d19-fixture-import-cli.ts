import { createHash } from 'node:crypto';
import path from 'node:path';

const EXPERIMENT_FOUNDATION_D19_DEFAULT_SOURCE_POLICY_PATH =
  'dev-docs/archive/experiment-foundation-productization-closure/artifacts/source-policy/00-d19-source-policy-attestation.json';

// This command is intentionally bound to the one named local-development
// target reviewed for T-132. Loopback alone is insufficient because an SSH
// tunnel can expose a remote database on 127.0.0.1.
const EXPERIMENT_FOUNDATION_D19_LOCAL_DATABASE = 'postgres';
const EXPERIMENT_FOUNDATION_D19_LOCAL_SCHEMA = 'my_researcher_dev';
const EXPERIMENT_FOUNDATION_D19_LOCAL_HOST = '127.0.0.1';
const EXPERIMENT_FOUNDATION_D19_LOCAL_PORT = '5432';
export const EXPERIMENT_FOUNDATION_D19_LOCAL_TARGET_FINGERPRINT =
  'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0';

export type ExperimentFoundationD19FixtureImportCliArgs =
  | { help: true }
  | {
    help: false;
    apply: true;
    sourcePolicyPath: string;
    outputPath: string;
  };

export function parseExperimentFoundationD19FixtureImportArgs(
  argv: string[],
  repoRoot: string,
): ExperimentFoundationD19FixtureImportCliArgs {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { help: true };
  }

  let apply = false;
  let sourcePolicyPath = EXPERIMENT_FOUNDATION_D19_DEFAULT_SOURCE_POLICY_PATH;
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--apply') {
      apply = true;
      continue;
    }
    if (argument === '--source-policy-attestation') {
      sourcePolicyPath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (argument === '--output') {
      output = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!apply) {
    throw new Error('--apply is required; this command writes the reviewed EF v2 fixture');
  }
  if (!output) throw new Error('--output is required');
  if (!sourcePolicyPath || path.isAbsolute(sourcePolicyPath)) {
    throw new Error('source-policy attestation path must be repository-relative');
  }

  const outputRoot = path.join(repoRoot, '.ai/.tmp/experiment-foundation-productization');
  const outputPath = resolveInside(repoRoot, output, 'output');
  if (!outputPath.startsWith(`${outputRoot}${path.sep}`)) {
    throw new Error('Output must be below .ai/.tmp/experiment-foundation-productization/');
  }
  resolveInside(repoRoot, sourcePolicyPath, 'source-policy attestation');
  return { help: false, apply: true, sourcePolicyPath, outputPath };
}

export function requireLocalExperimentFoundationD19DatabaseUrl(value: string | undefined): string {
  if (!value?.trim()) throw new Error('DATABASE_URL is required');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const port = parsed.port || '5432';
  if (
    hostname !== EXPERIMENT_FOUNDATION_D19_LOCAL_HOST
    || port !== EXPERIMENT_FOUNDATION_D19_LOCAL_PORT
  ) {
    throw new Error(
      'DATABASE_URL must target the reviewed local Pack A endpoint '
      + `${EXPERIMENT_FOUNDATION_D19_LOCAL_HOST}:${EXPERIMENT_FOUNDATION_D19_LOCAL_PORT}`,
    );
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const schema = parsed.searchParams.get('schema');
  if (
    database !== EXPERIMENT_FOUNDATION_D19_LOCAL_DATABASE
    || schema !== EXPERIMENT_FOUNDATION_D19_LOCAL_SCHEMA
  ) {
    throw new Error(
      'DATABASE_URL must target the reviewed local Pack A database '
      + `${EXPERIMENT_FOUNDATION_D19_LOCAL_DATABASE}?schema=`
      + EXPERIMENT_FOUNDATION_D19_LOCAL_SCHEMA,
    );
  }
  return value;
}

export interface ExperimentFoundationD19LocalDatabaseIdentity {
  database_name: unknown;
  schema_name: unknown;
  system_identifier: unknown;
  database_oid: unknown;
  schema_oid: unknown;
}

export function requireExperimentFoundationD19LocalTargetFingerprint(
  identity: ExperimentFoundationD19LocalDatabaseIdentity | undefined,
): string {
  if (
    !identity
    || String(identity.database_name) !== EXPERIMENT_FOUNDATION_D19_LOCAL_DATABASE
    || String(identity.schema_name) !== EXPERIMENT_FOUNDATION_D19_LOCAL_SCHEMA
  ) {
    throw new Error('Connected database identity does not match the reviewed local Pack A target');
  }
  const fingerprint = fingerprintExperimentFoundationD19LocalTarget(identity);
  if (fingerprint !== EXPERIMENT_FOUNDATION_D19_LOCAL_TARGET_FINGERPRINT) {
    throw new Error('Connected database cluster fingerprint is not approved for local Pack A writes');
  }
  return fingerprint;
}

export function fingerprintExperimentFoundationD19LocalTarget(
  identity: ExperimentFoundationD19LocalDatabaseIdentity,
): string {
  const fields = [
    'pack-a-local-target-fingerprint@v1',
    EXPERIMENT_FOUNDATION_D19_LOCAL_HOST,
    EXPERIMENT_FOUNDATION_D19_LOCAL_PORT,
    EXPERIMENT_FOUNDATION_D19_LOCAL_DATABASE,
    EXPERIMENT_FOUNDATION_D19_LOCAL_SCHEMA,
    String(identity.system_identifier),
    String(identity.database_oid),
    String(identity.schema_oid),
  ];
  return `sha256:${createHash('sha256').update(`${fields.join('\n')}\n`).digest('hex')}`;
}

export function experimentFoundationD19FixtureImportHelp(): string {
  return [
    'Import the reviewed D-19 EF v2 typed asset/readiness fixture into a local PostgreSQL target.',
    '',
    'Usage:',
    '  pnpm run experiment-foundation:d19-fixture:import -- --apply --output .ai/.tmp/experiment-foundation-productization/<run-id>/fixture-import-summary.json',
    '',
    'Options:',
    '  --apply                         Required write confirmation.',
    '  --output <repo-relative-path>   Required; must be below .ai/.tmp/experiment-foundation-productization/.',
    '  --source-policy-attestation <repo-relative-path>',
    `                                  Defaults to ${EXPERIMENT_FOUNDATION_D19_DEFAULT_SOURCE_POLICY_PATH}.`,
    '  -h, --help                      Show this help.',
    '',
    'The package script loads ../../.env.local. Direct invocation must provide DATABASE_URL.',
    `Only ${EXPERIMENT_FOUNDATION_D19_LOCAL_HOST}:${EXPERIMENT_FOUNDATION_D19_LOCAL_PORT} is accepted.`,
    `The target must be ${EXPERIMENT_FOUNDATION_D19_LOCAL_DATABASE}?schema=${EXPERIMENT_FOUNDATION_D19_LOCAL_SCHEMA}.`,
    'The connected PostgreSQL cluster/database/schema fingerprint must match the reviewed local target.',
  ].join('\n');
}

export function resolveExperimentFoundationD19RepositoryFile(
  repoRoot: string,
  relativePath: string,
  label: string,
): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`${label} path must be a non-empty repository-relative path`);
  }
  return resolveInside(repoRoot, relativePath, label);
}

export function redactExperimentFoundationD19CliError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-database-url]')
    .replaceAll(/password=[^\s]+/gi, 'password=[redacted]')
    .slice(0, 2_000);
}

function resolveInside(repoRoot: string, relativePath: string, label: string): string {
  const resolved = path.resolve(repoRoot, relativePath);
  if (!resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`${label} path must remain inside the repository`);
  }
  return resolved;
}
