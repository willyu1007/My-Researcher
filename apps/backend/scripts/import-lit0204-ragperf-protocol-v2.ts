#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import type {
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import { AppError } from '../src/errors/app-error.js';
import type {
  ExperimentFoundationV2AssetRevisionRecord,
  ExperimentFoundationV2Repository,
} from '../src/repositories/experiment-foundation-v2.repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import {
  censusRuleEquivalence,
  importLit0204ProtocolV2,
  LIT0204_METRIC_REQUIREMENT_KEYS,
  Lit0204ProtocolImportError,
  type Lit0204MetricDefinitionDependency,
} from '../src/services/experiment-foundation-lit0204-protocol-import-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
  requireDisposablePostgresTestDatabaseIdentity,
} from '../src/test-support/disposable-postgres-test-database.js';

const D19_BENCHMARK_LOGICAL_ID = 'd19-benchmark-ragperf';
const D19_PRODUCT_PROTOCOL_LOGICAL_ID = 'd19-evaluation-protocol-ragperf-v2';

interface CliArguments {
  definition_path: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Validate the complete d19 disposable identity protocol before constructing
  // any client. DATABASE_URL has no fallback and must exactly match the
  // randomized, loopback-only test URL.
  const expectedIdentity = requireDisposablePostgresTestDatabaseIdentity(process.env, 'd19');
  const { identity, prisma } = await openVerifiedDisposablePostgresTestDatabase(
    process.env,
    'd19',
  );
  if (
    identity.database_url !== expectedIdentity.database_url
    || identity.database_name !== expectedIdentity.database_name
    || identity.marker !== expectedIdentity.marker
  ) {
    await prisma.$disconnect();
    throw new Error('Disposable PostgreSQL identity changed during verification.');
  }

  try {
    const sourceBytes = await fs.readFile(args.definition_path);
    const definitionDocument = JSON.parse(sourceBytes.toString('utf8')) as unknown;
    const sourceDocumentSha256 =
      `sha256:${createHash('sha256').update(sourceBytes).digest('hex')}`;
    const repository = new PrismaExperimentFoundationV2Repository(prisma);
    const service = new ExperimentFoundationV2Service(repository);
    const benchmarkDependency = asBenchmarkRef(await requireCurrentExactRef(
      repository,
      'Benchmark',
      D19_BENCHMARK_LOGICAL_ID,
    ));
    const metricDefinitions: Lit0204MetricDefinitionDependency[] = [];
    for (const metricKey of LIT0204_METRIC_REQUIREMENT_KEYS) {
      const metricDefinition = asMetricDefinitionRef(await requireCurrentExactRef(
        repository,
        'MetricDefinition',
        `d19-metric-${metricKey}`,
      ));
      const revision = await service.getExactAssetRevision(metricDefinition);
      if (
        revision.asset_type !== 'MetricDefinition'
        || revision.revision.metric_definition_revision.metric_key !== metricKey
      ) {
        throw new Error(`D-19 MetricDefinition dependency drifted for ${metricKey}.`);
      }
      metricDefinitions.push({ metric_key: metricKey, metric_definition: metricDefinition });
    }

    const productProtocolRef = await requireCurrentExactRef(
      repository,
      'EvaluationProtocol',
      D19_PRODUCT_PROTOCOL_LOGICAL_ID,
    );
    const productRevision = await service.getExactAssetRevision(productProtocolRef);
    if (productRevision.asset_type !== 'EvaluationProtocol') {
      throw new Error('The D-19 product protocol resolved to the wrong asset type.');
    }

    const imported = await importLit0204ProtocolV2(service, {
      definition_document: definitionDocument,
      source_document_sha256: sourceDocumentSha256,
      benchmark_dependency: benchmarkDependency,
      metric_definitions: metricDefinitions,
    });
    if (imported.revision.asset_type !== 'EvaluationProtocol') {
      throw new Error('The source import produced the wrong revision type.');
    }
    const census = censusRuleEquivalence(
      imported.revision.revision.evaluation_protocol_revision,
      productRevision.revision.evaluation_protocol_revision,
    );

    process.stdout.write(`${JSON.stringify({
      status: 'passed',
      schema_version: 'experiment-foundation-lit0204-source-import@v1',
      database: 'disposable_d19',
      source_path: args.definition_path,
      identity: {
        asset_type: imported.identity.asset_type,
        logical_id: imported.identity.asset.logical_id,
      },
      revision: exactRefFromRevision(imported.revision),
      source_binding: imported.source_binding,
      product_protocol_revision: productProtocolRef,
      rule_equivalence_census: census,
    })}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(argv: readonly string[]): CliArguments {
  let definitionPath: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--definition') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--definition requires an explicit file path.');
      }
      definitionPath = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!definitionPath) {
    throw new Error('--definition is required; there is no implicit source artifact path.');
  }
  return { definition_path: definitionPath };
}

async function requireCurrentExactRef(
  repository: ExperimentFoundationV2Repository,
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
): Promise<ExperimentFoundationV2ExactAssetRevisionRef> {
  return repository.runInTransaction(async (unitOfWork) => {
    const identity = await unitOfWork.findAssetIdentity(assetType, logicalId);
    if (!identity || identity.asset_type !== assetType || !identity.asset.current_revision_id) {
      throw new Error(`Required current ${assetType} dependency is missing: ${logicalId}.`);
    }
    const revision = await unitOfWork.findAssetRevisionById(
      assetType,
      identity.asset.current_revision_id,
    );
    if (
      !revision
      || revision.asset_type !== assetType
      || revision.revision.logical_id !== logicalId
    ) {
      throw new Error(`Required current ${assetType} revision drifted: ${logicalId}.`);
    }
    return exactRefFromRevision(revision);
  });
}

function exactRefFromRevision(
  revision: ExperimentFoundationV2AssetRevisionRecord,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: revision.asset_type,
    logical_id: revision.revision.logical_id,
    revision_id: revision.revision.revision_id,
    revision_sequence: revision.revision.revision_sequence,
    content_hash: revision.revision.content_hash,
  };
}

function asBenchmarkRef(
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
): ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'Benchmark' } {
  if (ref.asset_type !== 'Benchmark') {
    throw new Error('Expected an exact Benchmark dependency.');
  }
  return { ...ref, asset_type: 'Benchmark' };
}

function asMetricDefinitionRef(
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
): ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'MetricDefinition' } {
  if (ref.asset_type !== 'MetricDefinition') {
    throw new Error('Expected an exact MetricDefinition dependency.');
  }
  return { ...ref, asset_type: 'MetricDefinition' };
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    status: 'failed',
    error_code: error instanceof AppError
      ? error.errorCode
      : error instanceof Lit0204ProtocolImportError
        ? error.code
        : 'INTERNAL_ERROR',
    reason_code: error instanceof AppError
      ? error.details?.reason_code ?? null
      : null,
    message: error instanceof Error ? error.message : 'Unknown failure.',
  })}\n`);
  process.exitCode = 1;
});
