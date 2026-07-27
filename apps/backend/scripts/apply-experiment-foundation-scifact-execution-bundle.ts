#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import { PrismaExperimentFoundationExecutionBundleV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import { ExperimentFoundationExecutionBundleV2Service } from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import {
  redactExperimentFoundationD19CliError,
  requireExperimentFoundationD19LocalTargetFingerprint,
  requireLocalExperimentFoundationD19DatabaseUrl,
} from '../src/services/experiment-foundation-d19-fixture-import-cli.js';
import {
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTableRowVersions,
  listExperimentFoundationNamedLocalApplicationTables,
} from './experiment-foundation-named-local-evidence.js';
import {
  buildSciFactExecutionBundlePlan,
} from './plan-experiment-foundation-scifact-execution-bundle.js';
import {
  writeJsonAtomic,
} from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const AUTHORING_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/execution-bundle-v2.json',
);
const WORKLOAD_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/workload-directory-v1.json',
);
const MIRROR_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/scifact-mirrors-v1.json',
);

export const REQUIRED_SCIFACT_EXECUTION_BUNDLE_FREEZE_AUTHORIZATION =
  'T-132 SciFact ExecutionBundle v2 named-local freeze: 6 rows';
const AUTHORIZATION_ENV = 'T132_SCIFACT_EXECUTION_BUNDLE_FREEZE_AUTHORIZATION';

const EXPECTED_WRITE_TABLES = [
  'ExperimentFoundationExecutionBundleIdentityV2',
  'ExperimentFoundationExecutionBundleDraftV2',
  'ExperimentFoundationExecutionBundleRevisionV2',
  'ExperimentFoundationExecutionBundleLifecycleEventV2',
  'ExperimentFoundationExecutionBundleLifecycleProjectionV2',
  'ExperimentFoundationExecutionBundleReadinessV2',
] as const;

interface ScriptArgs {
  outputPath: string;
}

export function requireSciFactExecutionBundleFreezeAuthorization(
  value: string | undefined,
): void {
  if (value !== REQUIRED_SCIFACT_EXECUTION_BUNDLE_FREEZE_AUTHORIZATION) {
    throw new Error(
      `${AUTHORIZATION_ENV} must exactly authorize the reviewed 6-row scope`,
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  requireSciFactExecutionBundleFreezeAuthorization(process.env[AUTHORIZATION_ENV]);
  requireLocalExperimentFoundationD19DatabaseUrl(process.env.DATABASE_URL);
  const [authoring, workload, mirrors] = await Promise.all([
    readJson(AUTHORING_MANIFEST_PATH),
    readJson(WORKLOAD_MANIFEST_PATH),
    readJson(MIRROR_MANIFEST_PATH),
  ]);
  const plan = await buildSciFactExecutionBundlePlan(authoring, workload, mirrors);
  assert.equal(plan.planned_write_scope.total_rows, 6);

  const prisma = new PrismaClient();
  const originalFetch = globalThis.fetch;
  let externalFetchCalls = 0;
  globalThis.fetch = (async () => {
    externalFetchCalls += 1;
    throw new Error('T132_SCIFACT_EXECUTION_BUNDLE_EXTERNAL_FETCH_DENIED');
  }) as typeof fetch;
  try {
    await prisma.$connect();
    const identityRows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return tx.$queryRawUnsafe<Array<{
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
    const targetFingerprint = requireExperimentFoundationD19LocalTargetFingerprint(
      identityRows[0],
    );
    const applicationTables =
      await listExperimentFoundationNamedLocalApplicationTables(
        prisma,
        EXPECTED_WRITE_TABLES,
      );
    const expectedWriteTableSet = new Set<string>(EXPECTED_WRITE_TABLES);
    const protectedTableDescriptors = applicationTables.filter(
      (table) => !expectedWriteTableSet.has(table.name),
    );
    const [protectedBefore, expectedBefore, scopedBefore] = await Promise.all([
      digestExperimentFoundationNamedLocalTableRowVersions(
        prisma,
        protectedTableDescriptors,
      ),
      countExperimentFoundationNamedLocalTables(prisma, EXPECTED_WRITE_TABLES),
      readScopedCensus(
        prisma,
        plan.frozen_bundle.identity.execution_bundle_id,
        plan.frozen_bundle.revision.execution_bundle_revision_id,
      ),
    ]);
    assertExpectedTablesContainOnlyScope(expectedBefore, scopedBefore.total_rows);

    const service = new ExperimentFoundationExecutionBundleV2Service({
      repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
      now: () => plan.frozen_bundle.identity.created_at,
    });
    const draft = await service.putDraft({
      bundle_key: plan.frozen_bundle.identity.bundle_key,
      display_name: plan.frozen_bundle.identity.display_name,
      expected_draft_version: null,
      draft_content: structuredClone(plan.frozen_bundle.revision.revision_content),
    });
    const frozen = await service.freezeActiveRevision({
      bundle_key: plan.frozen_bundle.identity.bundle_key,
      expected_draft_version: 1,
    });
    assert.deepEqual(
      { ...frozen, replayed: false },
      plan.frozen_bundle,
      'Named-local ExecutionBundle differs from reviewed plan',
    );
    assert.deepEqual(
      await service.resolveActiveReadyExact({
        execution_bundle_revision_id:
          plan.frozen_bundle.revision.execution_bundle_revision_id,
        content_hash: plan.frozen_bundle.revision.content_hash,
      }),
      { ...plan.frozen_bundle, replayed: false },
    );

    const [protectedAfter, expectedAfter, scopedAfter] = await Promise.all([
      digestExperimentFoundationNamedLocalTableRowVersions(
        prisma,
        protectedTableDescriptors,
      ),
      countExperimentFoundationNamedLocalTables(prisma, EXPECTED_WRITE_TABLES),
      readScopedCensus(
        prisma,
        plan.frozen_bundle.identity.execution_bundle_id,
        plan.frozen_bundle.revision.execution_bundle_revision_id,
      ),
    ]);
    assert.deepEqual(protectedAfter, protectedBefore, 'Protected application tables changed');
    assertExpectedTablesContainOnlyScope(expectedAfter, scopedAfter.total_rows);
    assert.deepEqual(scopedAfter, {
      identities: 1,
      drafts: 1,
      revisions: 1,
      lifecycle_events: 1,
      lifecycle_projections: 1,
      readiness_records: 1,
      total_rows: 6,
    });
    assert.equal(externalFetchCalls, 0, 'ExecutionBundle apply attempted external fetch');

    const createdRows = (draft.replayed ? 0 : 2) + (frozen.replayed ? 0 : 4);
    const exactReusedRows = 6 - createdRows;
    const summary = {
      schema: 'RagperfCanaryExecutionBundleApply@v1',
      status: 'passed',
      target_fingerprint: targetFingerprint,
      authorization: {
        source: 'process-scoped exact string',
        value_stored: false,
        authorized_row_ceiling: 6,
      },
      frozen_bundle: plan.frozen_bundle,
      offline_same_payload_preview: plan.offline_same_payload_preview,
      counters: {
        created_rows: createdRows,
        exact_reused_rows: exactReusedRows,
      },
      scoped_census_before: scopedBefore,
      scoped_census_after: scopedAfter,
      expected_tables_before: expectedBefore,
      expected_tables_after: expectedAfter,
      protected_table_count: protectedTableDescriptors.length,
      protected_tables_unchanged: true,
      external_fetch_calls: externalFetchCalls,
      network_requests: 0,
      cloud_operations: 0,
      provider_writes: 0,
      create_job_calls: 0,
      scientific_writes: 0,
    };
    await writeJsonAtomic(args.outputPath, summary);
    process.stdout.write(`${JSON.stringify({
      status: 'passed',
      output: path.relative(REPO_ROOT, args.outputPath),
      bundle_revision_id:
        plan.frozen_bundle.revision.execution_bundle_revision_id,
      content_hash: plan.frozen_bundle.revision.content_hash,
      scoped_rows: scopedAfter.total_rows,
      created_rows: createdRows,
      exact_reused_rows: exactReusedRows,
      protected_table_count: protectedTableDescriptors.length,
    })}\n`);
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
}

function assertExpectedTablesContainOnlyScope(
  tableCounts: Record<string, number>,
  scopedRows: number,
): void {
  const totalRows = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  assert.equal(
    totalRows,
    scopedRows,
    'ExecutionBundle tables contain rows outside the reviewed SciFact scope',
  );
}

async function readScopedCensus(
  prisma: PrismaClient,
  bundleId: string,
  revisionId: string,
) {
  const [
    identities,
    drafts,
    revisions,
    lifecycleEvents,
    lifecycleProjections,
    readinessRecords,
  ] = await Promise.all([
    prisma.experimentFoundationExecutionBundleIdentityV2.count({
      where: { id: bundleId },
    }),
    prisma.experimentFoundationExecutionBundleDraftV2.count({
      where: { executionBundleId: bundleId },
    }),
    prisma.experimentFoundationExecutionBundleRevisionV2.count({
      where: { id: revisionId, executionBundleId: bundleId },
    }),
    prisma.experimentFoundationExecutionBundleLifecycleEventV2.count({
      where: { executionBundleRevisionId: revisionId },
    }),
    prisma.experimentFoundationExecutionBundleLifecycleProjectionV2.count({
      where: { executionBundleRevisionId: revisionId },
    }),
    prisma.experimentFoundationExecutionBundleReadinessV2.count({
      where: { executionBundleRevisionId: revisionId },
    }),
  ]);
  return {
    identities,
    drafts,
    revisions,
    lifecycle_events: lifecycleEvents,
    lifecycle_projections: lifecycleProjections,
    readiness_records: readinessRecords,
    total_rows: identities
      + drafts
      + revisions
      + lifecycleEvents
      + lifecycleProjections
      + readinessRecords,
  };
}

function parseArgs(argv: string[]): ScriptArgs {
  let apply = false;
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--apply') {
      apply = true;
      continue;
    }
    if (argument === '--output') {
      output = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!apply) throw new Error('--apply is required for the SciFact bundle write');
  if (!output || path.isAbsolute(output)) {
    throw new Error('--output must be a repository-relative path');
  }
  const outputPath = path.resolve(REPO_ROOT, output);
  if (!outputPath.startsWith(`${ARTIFACT_ROOT}${path.sep}`)) {
    throw new Error('Output must remain below .ai/.tmp/experiment-foundation-productization/');
  }
  return { outputPath };
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      status: 'failed',
      message: redactExperimentFoundationD19CliError(error),
    })}\n`);
    process.exitCode = 1;
  });
}
