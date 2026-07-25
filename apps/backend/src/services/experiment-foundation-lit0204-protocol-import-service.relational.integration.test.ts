import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type {
  ExperimentFoundationV2EvaluationProtocolDraftContentV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentFoundationV2AssetRevision,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import { PrismaExperimentFoundationV2Repository } from '../repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../test-support/disposable-postgres-test-database.js';
import {
  buildExperimentFoundationD19TypedFixture,
} from './experiment-foundation-d19-fixture.js';
import {
  importLit0204ProtocolV2,
  LIT0204_METRIC_REQUIREMENT_KEYS,
  mapLit0204DefinitionToTypedV2Draft,
  type Lit0204MetricDefinitionDependency,
  type Lit0204ProtocolDraftDependencies,
} from './experiment-foundation-lit0204-protocol-import-service.js';
import { ExperimentFoundationV2Service } from './experiment-foundation-v2-service.js';

const RUN_REAL_POSTGRES =
  process.env.EXPERIMENT_FOUNDATION_LIT0204_IMPORT_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_LIT0204_IMPORT_RELATIONAL_PRISMA=1 with the d19 randomized disposable database identity variables';
const FIXTURE_URL = new URL(
  './test-fixtures/lit-0204-ragperf-protocol-definition.fixture.json',
  import.meta.url,
);

test(
  'imports LIT-0204 through real v2 freeze and proves both D-17 negative boundaries',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 120_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(
      process.env,
      'd19',
    );
    const repository = new PrismaExperimentFoundationV2Repository(prisma);
    const service = new ExperimentFoundationV2Service(repository);

    try {
      const fixture = await buildExperimentFoundationD19TypedFixture(service);
      const sourceBytes = readFileSync(FIXTURE_URL);
      const definitionDocument = JSON.parse(sourceBytes.toString('utf8')) as unknown;
      const dependencies = dependenciesFromFixture(fixture);
      const mappedDraft = mapLit0204DefinitionToTypedV2Draft(
        definitionDocument,
        dependencies,
      );
      const expectedContentHash = serverHashExperimentFoundationV2AssetRevision({
        asset_type: 'EvaluationProtocol',
        content: mappedDraft,
      });
      const sourceDocumentSha256 =
        `sha256:${createHash('sha256').update(sourceBytes).digest('hex')}`;

      const imported = await importLit0204ProtocolV2(service, {
        ...dependencies,
        definition_document: definitionDocument,
        source_document_sha256: sourceDocumentSha256,
      });

      assert.equal(imported.identity.asset_type, 'EvaluationProtocol');
      assert.equal(imported.revision.asset_type, 'EvaluationProtocol');
      assert.equal(imported.revision.revision.content_hash, expectedContentHash);
      assert.equal(imported.source_binding.source_document_sha256, sourceDocumentSha256);
      assert.equal(imported.source_binding.imported_content_hash, expectedContentHash);
      assert.equal(imported.source_binding.rule_count, mappedDraft.required_rules.length);
      assert.equal(await prisma.experimentFoundationEvaluationProtocolRevisionV2.count({
        where: { id: imported.revision.revision.revision_id },
      }), 1);

      const freeShapeLogicalId = `lit0204-free-shape-${randomUUID()}`;
      const freeShapePolicies: Record<string, unknown> = {
        seed_policy: { note: 'caller-authored free shape' },
      };
      const freeShapeDraft = {
        schema_version: 'v1',
        protocol_key: `lit0204-free-shape-${randomUUID()}`,
        display_name: 'Legacy free-shape policy negative',
        policies: freeShapePolicies,
      } as unknown as ExperimentFoundationV2EvaluationProtocolDraftContentV2;
      await assert.rejects(
        service.createAssetDraft({
          asset_type: 'EvaluationProtocol',
          logical_id: freeShapeLogicalId,
          draft_content: freeShapeDraft,
        }),
        hasAppErrorReason('V2_TYPED_SNAPSHOT_INVALID'),
      );
      assert.equal(await prisma.experimentFoundationEvaluationProtocolV2.count({
        where: { id: freeShapeLogicalId },
      }), 0);

      const nonexistentLogicalId = `lit0204-nonexistent-ref-${randomUUID()}`;
      const nonexistentRef = {
        ...mappedDraft.metric_dependencies[0]!,
        revision_id: `missing-revision-${randomUUID()}`,
        revision_sequence: 1,
        content_hash: `sha256:${'f'.repeat(64)}`,
      };
      const unresolvedDraft = replaceMetricRef(
        mappedDraft,
        mappedDraft.metric_dependencies[0]!,
        nonexistentRef,
        `lit0204-nonexistent-ref-${randomUUID()}`,
      );
      await service.createAssetDraft({
        asset_type: 'EvaluationProtocol',
        logical_id: nonexistentLogicalId,
        draft_content: unresolvedDraft,
      });
      assert.equal(await prisma.experimentFoundationEvaluationProtocolV2.count({
        where: { id: nonexistentLogicalId },
      }), 1);
      await assert.rejects(
        service.freezeAssetDraft({
          asset_type: 'EvaluationProtocol',
          logical_id: nonexistentLogicalId,
          expected_state_version: 1,
          business_idempotency_key: `freeze-${nonexistentLogicalId}`,
        }),
        hasAppErrorReason('EXACT_REVISION_NOT_FOUND'),
      );
      assert.equal(await prisma.experimentFoundationEvaluationProtocolRevisionV2.count({
        where: { evaluationProtocolId: nonexistentLogicalId },
      }), 0);
    } finally {
      await prisma.$disconnect();
    }
  },
);

function dependenciesFromFixture(
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
): Lit0204ProtocolDraftDependencies {
  const metricByKey = new Map(
    fixture.metric_definitions.map((ref) => [
      ref.logical_id.replace(/^d19-metric-/, ''),
      ref,
    ]),
  );
  const metricDefinitions: Lit0204MetricDefinitionDependency[] =
    LIT0204_METRIC_REQUIREMENT_KEYS.map((metricKey) => {
      const ref = metricByKey.get(metricKey);
      assert.ok(ref);
      assert.equal(ref.asset_type, 'MetricDefinition');
      return {
        metric_key: metricKey,
        metric_definition: {
          ...ref,
          asset_type: 'MetricDefinition' as const,
        },
      };
    });
  assert.equal(fixture.benchmark.asset_type, 'Benchmark');
  return {
    benchmark_dependency: {
      ...fixture.benchmark,
      asset_type: 'Benchmark',
    },
    metric_definitions: metricDefinitions,
  };
}

function replaceMetricRef(
  draft: ExperimentFoundationV2EvaluationProtocolDraftContentV2,
  currentRef: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'MetricDefinition';
  },
  replacementRef: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'MetricDefinition';
  },
  protocolKey: string,
): ExperimentFoundationV2EvaluationProtocolDraftContentV2 {
  return {
    ...structuredClone(draft),
    protocol_key: protocolKey,
    metric_dependencies: draft.metric_dependencies.map((ref) => (
      ref.revision_id === currentRef.revision_id ? structuredClone(replacementRef) : structuredClone(ref)
    )),
    required_rules: draft.required_rules.map((rule) => (
      rule.rule_type === 'metric_contract@v1'
        && rule.metric_definition.revision_id === currentRef.revision_id
        ? { ...structuredClone(rule), metric_definition: structuredClone(replacementRef) }
        : structuredClone(rule)
    )),
  };
}

function hasAppErrorReason(reasonCode: string): (error: unknown) => boolean {
  return (error) => error instanceof AppError
    && error.details?.reason_code === reasonCode;
}
