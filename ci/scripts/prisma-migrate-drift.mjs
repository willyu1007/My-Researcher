#!/usr/bin/env node

// Fails when replaying prisma/migrations onto an empty shadow database does not
// reproduce prisma/schema.prisma exactly (see prisma/migrations/AGENTS.md).
// Catches hand-written migrations whose index/constraint names exceed
// PostgreSQL's 63-byte identifier limit (silently truncated at creation) or use
// custom names not pinned with `map:` in schema.prisma — the two root causes of
// the drift reconciled by migration
// 20260719120000_reconcile_index_names_and_topic_research_record.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ARTIFACT_DIR = path.join('artifacts', 'prisma-drift');
const PRISMA_SCHEMA_PATH = path.join('prisma', 'schema.prisma');
const MIGRATIONS_DIR = path.join('prisma', 'migrations');

function usage(exitCode = 0) {
  console.log(`
Usage:
  node ci/scripts/prisma-migrate-drift.mjs [options]

Options:
  --shadow-url <postgres-url>    Shadow DB URL (default: env PRISMA_DRIFT_SHADOW_DATABASE_URL)
  --artifacts-dir <path>         Artifact directory (default: ${DEFAULT_ARTIFACT_DIR})
  -h, --help                     Show this message

The shadow database is RESET by prisma migrate diff — point it at a disposable
database only (CI service container, or a throwaway createdb locally). There is
deliberately no DATABASE_URL fallback. The server must have pgvector available
(migrations run CREATE EXTENSION vector).
`.trim());
  process.exit(exitCode);
}

function die(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    shadowUrl: process.env.PRISMA_DRIFT_SHADOW_DATABASE_URL || '',
    artifactsDir: DEFAULT_ARTIFACT_DIR,
  };

  while (args.length > 0) {
    const token = args.shift();
    if (token === '--') {
      continue;
    }
    switch (token) {
      case '--shadow-url':
        options.shadowUrl = args.shift() || '';
        break;
      case '--artifacts-dir':
        options.artifactsDir = args.shift() || '';
        break;
      case '-h':
      case '--help':
        usage(0);
        break;
      default:
        die(`Unknown option: ${token}`);
    }
  }

  if (!options.shadowUrl) {
    die(
      'Missing shadow URL. Use --shadow-url or set PRISMA_DRIFT_SHADOW_DATABASE_URL. ' +
        'It must point at a DISPOSABLE database — prisma migrate diff resets it.',
    );
  }
  if (!options.artifactsDir) {
    die('artifacts-dir cannot be empty.');
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv);
  const artifactRoot = path.resolve(options.artifactsDir);
  fs.mkdirSync(artifactRoot, { recursive: true });

  const diffArgs = [
    'exec',
    'prisma',
    'migrate',
    'diff',
    '--from-migrations',
    MIGRATIONS_DIR,
    '--to-schema-datamodel',
    PRISMA_SCHEMA_PATH,
    '--shadow-database-url',
    options.shadowUrl,
    '--script',
    '--exit-code',
  ];

  console.log(`[run] prisma migrate diff (${MIGRATIONS_DIR} replay vs ${PRISMA_SCHEMA_PATH})`);
  const result = spawnSync('pnpm', diffArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  // Persist whatever the CLI produced (including partial output on ENOBUFS)
  // before any exit path, so a failed CI job always ships an artifact.
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  fs.writeFileSync(path.join(artifactRoot, 'drift.sql'), stdout, 'utf8');
  if (stderr) {
    fs.writeFileSync(path.join(artifactRoot, 'stderr.log'), stderr, 'utf8');
  }

  if (result.error) {
    die(`Failed to execute pnpm: ${result.error.message} (partial output, if any, saved under ${path.relative(process.cwd(), artifactRoot)})`);
  }

  if (result.status === 0) {
    console.log('[ok] No drift: migration history reproduces schema.prisma exactly.');
    return;
  }

  // From here on use process.exitCode, not process.exit(): exiting with pending
  // async pipe writes truncates large output in CI logs.
  if (result.status === 2) {
    console.error('[drift] Replaying prisma/migrations does NOT reproduce schema.prisma. Diff:');
    process.stderr.write(stdout);
    if (stderr) {
      process.stderr.write(stderr);
    }
    console.error(
      [
        '',
        'A hand-written migration and schema.prisma disagree. Most common causes:',
        '  1. An index/constraint name in the migration exceeds 63 bytes — PostgreSQL',
        '     silently truncates it, so the created name never matches what Prisma expects.',
        '  2. The migration uses a custom index/constraint name that schema.prisma does',
        '     not pin with `map:` (@@index/@@unique/@unique/@relation/@id all accept it).',
        'Fix the migration (or add `map:` in schema.prisma) before merging.',
        'Rules: prisma/migrations/AGENTS.md. Background: the reconciliation migration',
        'prisma/migrations/20260719120000_reconcile_index_names_and_topic_research_record/',
        `Diff saved to ${path.relative(process.cwd(), artifactRoot)}/drift.sql`,
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  process.stderr.write(stdout);
  process.stderr.write(stderr);
  console.error(
    `[error] prisma migrate diff failed with exit code ${result.status ?? 'null'} — not a drift ` +
      'verdict. Either the shadow database is unreachable/misconfigured, or a committed ' +
      'migration failed to replay onto it (broken SQL); see the output above.',
  );
  process.exitCode = 1;
}

main();
