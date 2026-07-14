#!/usr/bin/env node

import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import { AppError } from '../src/errors/app-error.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import {
  importExperimentFoundationD19TypedFixture,
  summarizeExperimentFoundationD19FixtureImport,
} from '../src/services/experiment-foundation-d19-fixture-import-service.js';
import {
  experimentFoundationD19FixtureImportHelp,
  parseExperimentFoundationD19FixtureImportArgs,
  redactExperimentFoundationD19CliError,
  requireExperimentFoundationD19LocalTargetFingerprint,
  requireLocalExperimentFoundationD19DatabaseUrl,
  resolveExperimentFoundationD19RepositoryFile,
} from '../src/services/experiment-foundation-d19-fixture-import-cli.js';
import {
  digestExperimentFoundationD19SourcePolicyAttestation,
  EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
  parseExperimentFoundationD19SourcePolicyAttestation,
} from '../src/services/experiment-foundation-d19-source-policy.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function main(): Promise<void> {
  const args = parseExperimentFoundationD19FixtureImportArgs(
    process.argv.slice(2),
    REPO_ROOT,
  );
  if (args.help) {
    process.stdout.write(`${experimentFoundationD19FixtureImportHelp()}\n`);
    return;
  }
  requireLocalExperimentFoundationD19DatabaseUrl(process.env.DATABASE_URL);

  const sourcePolicyPath = resolveExperimentFoundationD19RepositoryFile(
    REPO_ROOT,
    args.sourcePolicyPath,
    'source-policy attestation',
  );
  await requireRealPathInside(REPO_ROOT, sourcePolicyPath, 'source-policy attestation');
  const sourcePolicy = parseExperimentFoundationD19SourcePolicyAttestation(
    JSON.parse(await fs.readFile(sourcePolicyPath, 'utf8')) as unknown,
  );
  if (
    digestExperimentFoundationD19SourcePolicyAttestation(sourcePolicy)
    !== EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST
  ) {
    throw new Error('D-19 source-policy attestation does not match the reviewed Pack A digest');
  }

  const prisma = new PrismaClient();
  try {
    const identityRows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return await tx.$queryRawUnsafe<Array<{
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
    });
    requireExperimentFoundationD19LocalTargetFingerprint(identityRows[0]);
    const repository = new PrismaExperimentFoundationV2Repository(prisma);
    const imported = await importExperimentFoundationD19TypedFixture(repository, sourcePolicy);
    const summary = summarizeExperimentFoundationD19FixtureImport(imported);
    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await requireRealPathInside(
      path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization'),
      path.dirname(args.outputPath),
      'output directory',
    );
    const temporaryOutputPath = path.join(
      path.dirname(args.outputPath),
      `.${path.basename(args.outputPath)}.${randomUUID()}.tmp`,
    );
    try {
      await fs.writeFile(
        temporaryOutputPath,
        `${JSON.stringify(summary, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' },
      );
      await fs.rename(temporaryOutputPath, args.outputPath);
    } catch (error) {
      await fs.rm(temporaryOutputPath, { force: true });
      throw error;
    }
    process.stdout.write(`${JSON.stringify({
      status: summary.status,
      schema_version: summary.schema_version,
      output: path.relative(REPO_ROOT, args.outputPath).replaceAll('\\', '/'),
      reviewed_source_policy_digest: summary.reviewed_source_policy_digest,
      readiness_attestation_id: summary.exact_readiness.readiness_attestation_id,
      readiness_attestation_hash: summary.exact_readiness.readiness_attestation_hash,
      exact_cell_count: summary.admission_request_template.exact_cells.length,
      counters: summary.counters,
    })}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

async function requireRealPathInside(root: string, candidate: string, label: string): Promise<void> {
  const [realRoot, realCandidate] = await Promise.all([
    fs.realpath(root),
    fs.realpath(candidate),
  ]);
  const relative = path.relative(realRoot, realCandidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must resolve inside the approved repository directory`);
  }
}

main().catch((error: unknown) => {
  const reasonCode = error instanceof AppError
    ? error.details?.reason_code ?? null
    : null;
  process.stderr.write(`${JSON.stringify({
    status: 'failed',
    error_code: error instanceof AppError ? error.errorCode : 'INTERNAL_ERROR',
    reason_code: reasonCode,
    message: redactExperimentFoundationD19CliError(error),
  })}\n`);
  process.exitCode = 1;
});
