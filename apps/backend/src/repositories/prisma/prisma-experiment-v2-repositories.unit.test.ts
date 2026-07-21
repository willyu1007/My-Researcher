import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import type {
  ExperimentFoundationDataPolicyRevisionV2,
  ExperimentFoundationDataPolicyV2,
  ExperimentFoundationTrainingTaskSpecV2,
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2ReadinessAttestation,
  serverHashExperimentFoundationV2ReadinessDependencyManifest,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentFoundationV2RunRecipe,
  serverHashExperimentFoundationV2TrainingTaskSpec,
  serverHashExperimentFoundationV2VersionLock,
  serverHashExperimentFoundationV2VersionLockDependencyManifest,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashExperimentV2SemanticContent,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2BranchFrame,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import type {
  BranchHeadAdvancedEventV1,
  ExperimentFoundationIntegrationInboxV2,
  ExperimentFoundationIntegrationOutboxV2,
  ExperimentV2IntegrationEvent,
  PaperImplementationExperimentIntegrationInboxV2,
  PaperImplementationExperimentIntegrationOutboxV2,
  PaperImplementationExperimentWorkOrderAdmissionV2,
  PaperImplementationExperimentWorkOrderBranchV2,
  PaperImplementationExperimentWorkOrderRevisionCellV2,
  PaperImplementationExperimentWorkOrderRevisionV2,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import {
  ExperimentFoundationV2RepositoryConstraintError,
  type ExperimentFoundationV2AssetIdentityRecord,
  type ExperimentFoundationV2Repository,
} from '../experiment-foundation-v2.repository.js';
import { ExperimentFoundationExecutionV2ConstraintError } from '../experiment-foundation-execution-v2.repository.js';
import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
  EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentFoundationV2MaterializationBundle,
  type PaperImplementationExperimentV2CommitAdmissionInput,
  type PaperImplementationExperimentV2CommitHeadInput,
} from '../experiment-spine-v2.repository.js';
import { InMemoryExperimentFoundationV2Repository } from '../in-memory-experiment-foundation-v2-repository.js';
import { AppError } from '../../errors/app-error.js';
import {
  ExperimentFoundationV2Service,
  type ExperimentFoundationV2CreateAssetDraftInput,
} from '../../services/experiment-foundation-v2-service.js';
import {
  HEAD_CONSUMER,
  PaperImplementationExperimentV2HeadService,
} from '../../services/paper-implementation-experiment-v2-head-service.js';
import { PrismaExperimentFoundationSpineV2Repository } from './prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationExecutionV2Repository } from './prisma-experiment-foundation-execution-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from './prisma-paper-implementation-experiment-spine-v2-repository.js';

const NOW = '2026-07-13T00:00:00.000Z';
const LATER = '2026-07-13T00:01:00.000Z';
const OPEN_CYCLE_LOOKUP = {
  async isCycleClosed() {
    return false;
  },
};

function isIntegrationPayloadConflict(error: unknown): boolean {
  return error instanceof ExperimentSpineV2RepositoryConstraintError
    && error.reasonCode === 'INTEGRATION_EVENT_PAYLOAD_CONFLICT';
}
const HASH_A = hash('a');
const HASH_B = hash('b');
const HASH_C = hash('c');
const HASH_D = hash('d');
const HASH_E = hash('e');
const HASH_F = hash('f');
const HASH_1 = hash('1');
const HASH_2 = hash('2');

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

interface FakeStore {
  current: Tables;
  failCreateModels: Set<string>;
  findManyCounts: Map<string, number>;
}

function hash(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function makeFakePrismaClient(
  failCreateModels: string[] = [],
) {
  const store: FakeStore = {
    current: {},
    failCreateModels: new Set(failCreateModels),
    findManyCounts: new Map(),
  };
  const client = makeClient(store, true);
  return {
    client: client as unknown as PrismaClient,
    tables: () => store.current,
    failCreate: (model: string) => store.failCreateModels.add(model),
    findManyCount: (model: string) => store.findManyCounts.get(model) ?? 0,
  };
}

function makeClient(store: FakeStore, transactionRoot: boolean): Record<string, unknown> {
  const client = new Proxy<Record<string, unknown>>({}, {
    get(target, property) {
      if (typeof property !== 'string') {
        return Reflect.get(target, property);
      }
      if (property === '$transaction') {
        return async (operation: unknown) => {
          if (typeof operation !== 'function') {
            throw new Error('Fake Prisma supports callback transactions only');
          }
          const transactionStore: FakeStore = {
            current: structuredClone(store.current),
            failCreateModels: store.failCreateModels,
            findManyCounts: store.findManyCounts,
          };
          const transaction = makeClient(transactionStore, false);
          const result = await (operation as (client: unknown) => Promise<unknown>)(transaction);
          store.current = transactionStore.current;
          return result;
        };
      }
      if (property === '$queryRaw') {
        return async () => [];
      }
      if (!property.startsWith('experimentFoundation') && !property.startsWith('paperImplementation')) {
        return undefined;
      }
      return makeDelegate(store, property);
    },
  });
  if (!transactionRoot) {
    return client;
  }
  return client;
}

function makeDelegate(store: FakeStore, model: string) {
  const rows = () => (store.current[model] ??= []);
  return {
    create: async ({ data }: { data: Row }) => {
      if (store.failCreateModels.has(model)) {
        throw new Error(`Injected create failure for ${model}`);
      }
      const row = withDefaults(model, structuredClone(data));
      if (row.id !== undefined && rows().some((candidate) => candidate.id === row.id)) {
        throw new Error(`Duplicate primary key for ${model}: ${String(row.id)}`);
      }
      rows().push(row);
      return structuredClone(row);
    },
    createMany: async ({ data }: { data: Row[] }) => {
      if (store.failCreateModels.has(model)) {
        throw new Error(`Injected createMany failure for ${model}`);
      }
      for (const candidate of data) {
        rows().push(withDefaults(model, structuredClone(candidate)));
      }
      return { count: data.length };
    },
    findUnique: async ({ where, select }: { where: Row; select?: Row }) => {
      const row = rows().find((candidate) => matches(candidate, where)) ?? null;
      return selectRow(row, select);
    },
    findUniqueOrThrow: async ({ where, select }: { where: Row; select?: Row }) => {
      const row = rows().find((candidate) => matches(candidate, where));
      if (!row) {
        throw new Error(`${model} row not found`);
      }
      return selectRow(row, select);
    },
    findFirst: async ({ where = {}, orderBy, select }: {
      where?: Row;
      orderBy?: Row | Row[];
      select?: Row;
    }) => {
      const found = sortRows(
        rows().filter((candidate) => matches(candidate, where)),
        orderBy,
      )[0] ?? null;
      return selectRow(found, select);
    },
    findMany: async ({ where = {}, orderBy, take, select }: {
      where?: Row;
      orderBy?: Row | Row[];
      take?: number;
      select?: Row;
    } = {}) => {
      store.findManyCounts.set(model, (store.findManyCounts.get(model) ?? 0) + 1);
      const found = sortRows(
        rows().filter((candidate) => matches(candidate, where)),
        orderBy,
      ).slice(0, take);
      return found.map((row) => selectRow(row, select));
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      let count = 0;
      store.current[model] = rows().map((row) => {
        if (!matches(row, where)) {
          return row;
        }
        count += 1;
        return applyUpdate(row, data);
      });
      return { count };
    },
  };
}

function withDefaults(model: string, row: Row): Row {
  if (model.endsWith('IntegrationOutboxV2')) {
    return {
      relayStatus: 'pending',
      relayAttemptCount: 0,
      relayLeaseOwner: null,
      relayLeaseExpiresAt: null,
      relayNextAttemptAt: null,
      publishedAt: null,
      deliveredAt: null,
      lastRelayErrorCode: null,
      ...row,
    };
  }
  return row;
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'AND') {
      return (expected as Row[]).every((clause) => matches(row, clause));
    }
    if (key === 'OR') {
      return (expected as Row[]).some((clause) => matches(row, clause));
    }
    if (
      expected
      && typeof expected === 'object'
      && !Array.isArray(expected)
      && !(expected instanceof Date)
    ) {
      const operator = expected as Row;
      if ('in' in operator) {
        return Array.isArray(operator.in) && operator.in.some((value) => sameScalar(row[key], value));
      }
      if ('lte' in operator) {
        const actual = row[key];
        return actual instanceof Date
          && operator.lte instanceof Date
          && actual.getTime() <= operator.lte.getTime();
      }
      if ('lt' in operator) {
        return typeof row[key] === 'number'
          && typeof operator.lt === 'number'
          && row[key] < operator.lt;
      }
      if ('equals' in operator) {
        return row[key] === operator.equals;
      }
    }
    return sameScalar(row[key], expected);
  });
}

function sameScalar(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

function sortRows(rows: Row[], orderBy?: Row | Row[]): Row[] {
  const clauses = orderBy ? (Array.isArray(orderBy) ? orderBy : [orderBy]) : [];
  return [...rows].sort((left, right) => {
    for (const clause of clauses) {
      const [key, direction] = Object.entries(clause)[0] ?? [];
      if (!key || left[key] === right[key]) {
        continue;
      }
      const comparison = comparable(left[key]) < comparable(right[key]) ? -1 : 1;
      return direction === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
}

function comparable(value: unknown): string | number {
  return value instanceof Date ? value.getTime() : String(value ?? '');
}

function selectRow(row: Row | null, select?: Row): Row | null {
  if (!row) {
    return null;
  }
  if (!select) {
    return structuredClone(row);
  }
  return Object.fromEntries(
    Object.keys(select).filter((key) => select[key]).map((key) => [key, structuredClone(row[key])]),
  );
}

function applyUpdate(row: Row, data: Row): Row {
  const next = { ...row };
  for (const [key, value] of Object.entries(data)) {
    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && 'increment' in value
    ) {
      next[key] = Number(next[key] ?? 0) + Number((value as { increment: number }).increment);
    } else {
      next[key] = structuredClone(value);
    }
  }
  return next;
}

test('typed identity family-key rules stay identical across in-memory and Prisma repositories', async () => {
  const fake = makeFakePrismaClient();
  const adapters: Array<{
    name: string;
    repository: ExperimentFoundationV2Repository;
  }> = [
    { name: 'in-memory', repository: new InMemoryExperimentFoundationV2Repository() },
    { name: 'Prisma', repository: new PrismaExperimentFoundationV2Repository(fake.client) },
  ];

  for (const adapter of adapters) {
    const service = new ExperimentFoundationV2Service(adapter.repository, {
      now: () => NOW,
      idGenerator: (kind) => `${adapter.name}-${kind}`,
    });
    for (const input of identityDraftInputs()) {
      const created = await service.createAssetDraft(input);
      assert.notEqual(identityFamilyKey(created), created.asset.logical_id, adapter.name);

      await assert.rejects(
        service.createAssetDraft({
          ...input,
          logical_id: `${input.logical_id}-${adapter.name}-same-key`,
        }),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'ASSET_IDENTITY_CONFLICT',
      );
      await assert.rejects(
        service.updateAssetDraft({
          ...renameDraftFamilyKey(input),
          expected_state_version: 1,
        }),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'ASSET_IDENTITY_CONFLICT',
      );

      const renamed = renameIdentityFamilyKey(created);
      await assert.rejects(
        adapter.repository.runInTransaction((unitOfWork) => (
          unitOfWork.compareAndSwapAssetIdentity(
            created.asset_type,
            created.asset.logical_id,
            created.asset.draft_state_version,
            renamed,
          )
        )),
        (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
          && error.reasonCode === 'ASSET_IDENTITY_CONFLICT',
      );
    }
  }

  const datasetRow = (fake.tables().experimentFoundationDatasetV2 ?? [])[0];
  assert.ok(datasetRow);
  datasetRow.datasetDraftJson = {
    ...(datasetRow.datasetDraftJson as Row),
    dataset_key: 'tampered-relational-parity',
  };
  const prismaRepository = adapters[1]!.repository;
  await assert.rejects(
    prismaRepository.runInTransaction((unitOfWork) => (
      unitOfWork.findAssetIdentity('Dataset', 'logical-dataset')
    )),
    (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
      && error.reasonCode === 'ASSET_IDENTITY_CONFLICT',
  );
});

test('EF Prisma reads fail closed on typed draft tamper across all five asset families', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaExperimentFoundationV2Repository(fake.client);
  const service = new ExperimentFoundationV2Service(repository, {
    now: () => NOW,
    idGenerator: (kind) => `draft-integrity-${kind}`,
  });
  for (const input of identityDraftInputs()) {
    await service.createAssetDraft(input);
  }

  const cases: Array<{
    assetType: ExperimentFoundationV2AssetType;
    logicalId: string;
    model: string;
    jsonField: string;
  }> = [
    { assetType: 'Dataset', logicalId: 'logical-dataset', model: 'experimentFoundationDatasetV2', jsonField: 'datasetDraftJson' },
    { assetType: 'DataPolicy', logicalId: 'logical-policy', model: 'experimentFoundationDataPolicyV2', jsonField: 'dataPolicyDraftJson' },
    { assetType: 'MetricDefinition', logicalId: 'logical-metric', model: 'experimentFoundationMetricDefinitionV2', jsonField: 'metricDefinitionDraftJson' },
    { assetType: 'Benchmark', logicalId: 'logical-benchmark', model: 'experimentFoundationBenchmarkV2', jsonField: 'benchmarkDraftJson' },
    { assetType: 'EvaluationProtocol', logicalId: 'logical-protocol', model: 'experimentFoundationEvaluationProtocolV2', jsonField: 'evaluationProtocolDraftJson' },
  ];

  for (const fixture of cases) {
    const row = fake.tables()[fixture.model]![0]!;
    const original = structuredClone(row[fixture.jsonField]);
    for (const mutate of [
      (snapshot: Row) => { snapshot.unexpected_property = true; },
      (snapshot: Row) => { snapshot.schema_version = 'unsupported'; },
    ]) {
      const tampered = structuredClone(original) as Row;
      mutate(tampered);
      row[fixture.jsonField] = tampered;
      await assert.rejects(
        repository.runInTransaction((unitOfWork) => (
          unitOfWork.findAssetIdentity(fixture.assetType, fixture.logicalId)
        )),
        (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
          && error.reasonCode === 'ASSET_IDENTITY_CONFLICT',
        `${fixture.assetType} draft tamper must fail closed`,
      );
      row[fixture.jsonField] = structuredClone(original);
    }
    const originalStateVersion = row.draftStateVersion;
    row.draftStateVersion = 0;
    await assert.rejects(
      repository.runInTransaction((unitOfWork) => (
        unitOfWork.findAssetIdentity(fixture.assetType, fixture.logicalId)
      )),
      (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
        && error.reasonCode === 'ASSET_IDENTITY_CONFLICT',
      `${fixture.assetType} full identity schema drift must fail closed`,
    );
    row.draftStateVersion = originalStateVersion;
    row[fixture.jsonField] = {};
    assert.ok(
      await repository.runInTransaction((unitOfWork) => (
        unitOfWork.findAssetIdentity(fixture.assetType, fixture.logicalId)
      )),
      `${fixture.assetType} explicit no-draft identity must remain readable`,
    );
    row[fixture.jsonField] = structuredClone(original);
  }
});

test('EF Prisma reads verify schema, profile, snapshot hash, and exact mirrors for all asset revisions', async () => {
  for (const fixture of assetRevisionIntegrityFixtures()) {
    const baseline = makeFakePrismaClient();
    seedAssetRevisionIntegrityFixture(baseline.tables(), fixture);
    const baselineRepository = new PrismaExperimentFoundationV2Repository(baseline.client);
    assert.ok(await baselineRepository.runInTransaction((unitOfWork) => (
      unitOfWork.findAssetRevisionById(fixture.assetType, fixture.revisionId)
    )), `${fixture.assetType} baseline revision should decode`);

    for (const drift of assetRevisionDrifts(fixture)) {
      const fake = makeFakePrismaClient();
      seedAssetRevisionIntegrityFixture(fake.tables(), fixture);
      drift.mutate(fake.tables());
      const repository = new PrismaExperimentFoundationV2Repository(fake.client);
      await assert.rejects(
        repository.runInTransaction((unitOfWork) => (
          unitOfWork.findAssetRevisionById(fixture.assetType, fixture.revisionId)
        )),
        (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
          && error.reasonCode === 'ASSET_REVISION_CONFLICT',
        `${fixture.assetType} ${drift.label} must fail closed`,
      );
    }
  }
});

test('EF Prisma batches EvaluationProtocol dependency verification across revision lists', async () => {
  const fixture = assetRevisionIntegrityFixtures().find(
    (candidate) => candidate.assetType === 'EvaluationProtocol',
  )!;
  const fake = makeFakePrismaClient();
  seedAssetRevisionIntegrityFixture(fake.tables(), fixture);
  const secondRow = structuredClone(fixture.row);
  secondRow.id = `${fixture.revisionId}-2`;
  secondRow.revisionSequence = 2;
  fake.tables()[fixture.model]!.push(secondRow);
  const secondDependencies = structuredClone(fixture.metricDependencyRows ?? []).map((row) => ({
    ...row,
    id: `${String(row.id)}-2`,
    evaluationProtocolRevisionId: secondRow.id,
  }));
  fake.tables().experimentFoundationEvaluationProtocolMetricDependencyV2!.push(
    ...secondDependencies,
  );
  const repository = new PrismaExperimentFoundationV2Repository(fake.client);
  const before = fake.findManyCount(
    'experimentFoundationEvaluationProtocolMetricDependencyV2',
  );

  const revisions = await repository.runInTransaction((unitOfWork) => (
    unitOfWork.listAssetRevisions('EvaluationProtocol', String(fixture.row.evaluationProtocolId))
  ));

  assert.equal(revisions.length, 2);
  assert.equal(
    fake.findManyCount('experimentFoundationEvaluationProtocolMetricDependencyV2') - before,
    1,
    'protocol revision list must fetch all ordered metric dependencies once',
  );
});

test('typed EF Prisma repository rolls back a pending freeze and persists multiple exact command receipts', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaExperimentFoundationV2Repository(fake.client);
  const asset = dataPolicyAsset();
  const revision = dataPolicyRevision();

  await assert.rejects(repository.runInTransaction(async (unitOfWork) => {
    await unitOfWork.insertAssetIdentity({ asset_type: 'DataPolicy', asset });
    await unitOfWork.insertAssetRevision({ asset_type: 'DataPolicy', revision });
    const advanced = await unitOfWork.compareAndSwapAssetIdentity(
      'DataPolicy',
      asset.logical_id,
      asset.draft_state_version,
      {
        asset_type: 'DataPolicy',
        asset: {
          ...asset,
          draft_state_version: asset.draft_state_version + 1,
          current_revision_id: revision.revision_id,
          updated_at: LATER,
        },
      },
    );
    assert.equal(advanced, true);
    throw new Error('crash-before-freeze-replay');
  }), /crash-before-freeze-replay/);

  await repository.runInTransaction(async (unitOfWork) => {
    assert.equal(await unitOfWork.findAssetIdentity('DataPolicy', asset.logical_id), null);
    assert.equal(await unitOfWork.findAssetRevisionById('DataPolicy', revision.revision_id), null);
  });

  await assert.rejects(
    repository.runInTransaction(async (unitOfWork) => {
      await unitOfWork.insertAssetIdentity({ asset_type: 'DataPolicy', asset });
      await unitOfWork.insertAssetRevision({ asset_type: 'DataPolicy', revision });
    }),
    (error) => error instanceof Error
      && error.message.includes('cannot commit before its freeze replay is bound'),
  );
  assert.equal((fake.tables().experimentFoundationDataPolicyRevisionV2 ?? []).length, 0);

  await repository.runInTransaction(async (unitOfWork) => {
    await unitOfWork.insertAssetIdentity({ asset_type: 'DataPolicy', asset });
    await unitOfWork.insertAssetRevision({ asset_type: 'DataPolicy', revision });
    assert.equal(await unitOfWork.compareAndSwapAssetIdentity(
      'DataPolicy',
      asset.logical_id,
      asset.draft_state_version,
      {
        asset_type: 'DataPolicy',
        asset: {
          ...asset,
          draft_state_version: asset.draft_state_version + 1,
          current_revision_id: revision.revision_id,
          updated_at: LATER,
        },
      },
    ), true);
    await unitOfWork.insertFreezeReplay({
      asset_type: 'DataPolicy',
      logical_id: asset.logical_id,
      business_idempotency_key: 'freeze-policy-v1',
      content_hash: revision.content_hash,
      revision_id: revision.revision_id,
    });
  });

  await repository.runInTransaction(async (unitOfWork) => {
    const replay = await unitOfWork.findFreezeReplay(
      'DataPolicy',
      asset.logical_id,
      'freeze-policy-v1',
    );
    assert.equal(replay?.revision_id, revision.revision_id);
    assert.equal(
      (await unitOfWork.listAssetRevisions('DataPolicy', asset.logical_id))[0]?.revision.content_hash,
      revision.content_hash,
    );
    await unitOfWork.insertFreezeReplay({
      asset_type: 'DataPolicy',
      logical_id: asset.logical_id,
      business_idempotency_key: 'freeze-policy-v1-second-command',
      content_hash: revision.content_hash,
      revision_id: revision.revision_id,
    });
  });
  const revisionRows = fake.tables().experimentFoundationDataPolicyRevisionV2 ?? [];
  const receiptRows = fake.tables().experimentFoundationDataPolicyFreezeCommandReceiptV2 ?? [];
  assert.equal(revisionRows.length, 1);
  assert.equal('freezeBusinessIdempotencyKey' in revisionRows[0]!, false);
  assert.equal(receiptRows.length, 2);
  assert.deepEqual(
    receiptRows.map((row) => row.revisionId),
    [revision.revision_id, revision.revision_id],
  );

  await assert.rejects(
    repository.runInTransaction((unitOfWork) => unitOfWork.insertFreezeReplay({
      asset_type: 'DataPolicy',
      logical_id: asset.logical_id,
      business_idempotency_key: 'freeze-policy-v1-second-command',
      content_hash: HASH_B,
      revision_id: revision.revision_id,
    })),
    (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
      && error.reasonCode === 'FREEZE_IDEMPOTENCY_CONFLICT',
  );
});

test('typed EF Prisma repository preserves lifecycle/readiness exact refs and dependency order', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaExperimentFoundationV2Repository(fake.client);
  const target = exactRef('DataPolicy', 'policy-1', 'policy-revision-1', 1, HASH_A);
  const nextRevision = exactRef('DataPolicy', 'policy-1', 'policy-revision-2', 2, HASH_E);
  const readinessDependencies = [
    {
      readiness_attestation_id: 'readiness-1',
      ordinal: 1,
      dependency: exactRef('Dataset', 'dataset-1', 'dataset-revision-1', 1, HASH_E),
    },
    {
      readiness_attestation_id: 'readiness-1',
      ordinal: 2,
      dependency: exactRef('MetricDefinition', 'metric-1', 'metric-revision-1', 1, HASH_F),
    },
  ];
  const dependencyManifestHash = serverHashExperimentFoundationV2ReadinessDependencyManifest(
    readinessDependencies.map((dependency) => dependency.dependency),
  );
  const qualificationSnapshot = {
    target_lifecycle_sequence: 1,
    dependency_count: 2,
    all_dependencies_active: true,
    all_required_rules_supported: true,
  };
  const attestationHash = serverHashExperimentFoundationV2ReadinessAttestation({
    target,
    status: 'passed',
    evaluator_profile_version: 'v1',
    evaluator_profile_hash: HASH_B,
    dependency_manifest_hash: dependencyManifestHash,
    qualification_snapshot: qualificationSnapshot,
    blockers: [],
  });

  await repository.runInTransaction(async (unitOfWork) => {
    await unitOfWork.appendLifecycleEvent({
      lifecycle_event_id: 'lifecycle-1',
      asset: target,
      lifecycle_sequence: 1,
      event_type: 'activated',
      reason_code: 'fixture',
      note: null,
      occurred_at: NOW,
    });
    assert.equal(await unitOfWork.compareAndSwapLifecycleProjection(target, null, {
      asset: target,
      projection_state_version: 1,
      lifecycle_sequence: 1,
      lifecycle_status: 'active',
      location_available: true,
      source_event_id: 'lifecycle-1',
      updated_at: NOW,
    }), true);
    assert.equal(await unitOfWork.compareAndSwapLifecycleProjection(target, 0, {
      asset: target,
      projection_state_version: 1,
      lifecycle_sequence: 1,
      lifecycle_status: 'active',
      location_available: true,
      source_event_id: 'lifecycle-1',
      updated_at: NOW,
    }), false);
    await unitOfWork.appendLifecycleEvent({
      lifecycle_event_id: 'lifecycle-2',
      asset: nextRevision,
      lifecycle_sequence: 1,
      event_type: 'activated',
      reason_code: 'fixture',
      note: null,
      occurred_at: LATER,
    });
    assert.equal(await unitOfWork.compareAndSwapLifecycleProjection(nextRevision, null, {
      asset: nextRevision,
      projection_state_version: 1,
      lifecycle_sequence: 1,
      lifecycle_status: 'active',
      location_available: true,
      source_event_id: 'lifecycle-2',
      updated_at: LATER,
    }), true);

    await unitOfWork.insertReadinessAttestation({
      readiness_attestation_id: 'readiness-1',
      target,
      status: 'passed',
      evaluator_profile_version: 'v1',
      evaluator_profile_hash: HASH_B,
      dependency_manifest_hash: dependencyManifestHash,
      qualification_snapshot: qualificationSnapshot,
      blockers: [],
      attestation_hash: attestationHash,
      created_at: NOW,
    }, readinessDependencies);
  });

  const readinessDependencyQueriesBefore = fake.findManyCount(
    'experimentFoundationReadinessDependencyV2',
  );
  await repository.runInTransaction(async (unitOfWork) => {
    assert.equal((await unitOfWork.findLifecycleProjection(target))?.source_event_id, 'lifecycle-1');
    assert.equal(
      (await unitOfWork.findLifecycleProjection(nextRevision))?.source_event_id,
      'lifecycle-2',
    );
    assert.equal((await unitOfWork.findPassedReadinessAttestationForExactScope({
      target,
      evaluator_profile_hash: HASH_B,
      dependency_manifest_hash: dependencyManifestHash,
    }))?.attestation_hash, attestationHash);
    assert.deepEqual(
      (await unitOfWork.listReadinessDependencies('readiness-1')).map((dependency) => dependency.ordinal),
      [1, 2],
    );
  });
  assert.equal(
    fake.findManyCount('experimentFoundationReadinessDependencyV2')
      - readinessDependencyQueriesBefore,
    1,
    'attestation read and dependency list must share one immutable dependency fetch',
  );

  const readinessRow = fake.tables().experimentFoundationReadinessAttestationV2![0]!;
  const readinessDependencyRows = fake.tables().experimentFoundationReadinessDependencyV2!;
  const originalReadinessRow = structuredClone(readinessRow);
  const originalReadinessDependencies = structuredClone(readinessDependencyRows);
  const readinessDrifts: Array<[string, () => void]> = [
    ['qualification snapshot schema drift', () => {
      readinessRow.qualificationSnapshotJson = {
        ...(readinessRow.qualificationSnapshotJson as Row),
        unexpected: true,
      };
    }],
    ['blocker snapshot schema drift', () => {
      readinessRow.blockerSnapshotJson = [{
        reason_code: 'tampered',
        dependency_ordinal: 0,
      }];
    }],
    ['attestation hash drift', () => { readinessRow.attestationHash = HASH_A; }],
    ['readiness outcome vocabulary drift', () => { readinessRow.outcome = 'unknown'; }],
    ['ordered dependency manifest drift', () => {
      readinessDependencyRows[0]!.dependencyRevisionHash = HASH_A;
    }],
  ];
  for (const [label, mutate] of readinessDrifts) {
    Object.assign(readinessRow, structuredClone(originalReadinessRow));
    readinessDependencyRows.splice(
      0,
      readinessDependencyRows.length,
      ...structuredClone(originalReadinessDependencies),
    );
    mutate();
    await assert.rejects(
      repository.runInTransaction((unitOfWork) => (
        unitOfWork.findReadinessAttestation('readiness-1')
      )),
      (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
        && (
          error.reasonCode === 'READINESS_ATTESTATION_CONFLICT'
          || error.reasonCode === 'READINESS_DEPENDENCY_CONFLICT'
        ),
      label,
    );
  }
  Object.assign(readinessRow, structuredClone(originalReadinessRow));
  readinessDependencyRows.splice(
    0,
    readinessDependencyRows.length,
    ...structuredClone(originalReadinessDependencies),
  );

  const lifecycleRows = fake.tables().experimentFoundationAssetLifecycleEventV2 ?? [];
  lifecycleRows[0]!.eventSchemaVersion = 'v2';
  await assert.rejects(
    repository.runInTransaction((unitOfWork) => unitOfWork.listLifecycleEvents(target)),
    (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
      && error.reasonCode === 'LIFECYCLE_EVENT_CONFLICT',
  );
  lifecycleRows[0]!.eventSchemaVersion = 'v1';
  lifecycleRows[0]!.eventType = 'unknown';
  await assert.rejects(
    repository.runInTransaction((unitOfWork) => unitOfWork.listLifecycleEvents(target)),
    (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
      && error.reasonCode === 'LIFECYCLE_EVENT_CONFLICT',
  );
  lifecycleRows[0]!.eventType = 'activated';

  const lifecycleProjection = fake.tables().experimentFoundationAssetLifecycleProjectionV2![0]!;
  lifecycleProjection.lifecycleStatus = 'unknown';
  await assert.rejects(
    repository.runInTransaction((unitOfWork) => unitOfWork.findLifecycleProjection(target)),
    (error) => error instanceof ExperimentFoundationV2RepositoryConstraintError
      && error.reasonCode === 'LIFECYCLE_PROJECTION_CAS_CONFLICT',
  );
  lifecycleProjection.lifecycleStatus = 'active';
});

test('in-memory lifecycle projections also remain exact-revision scoped', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const first = exactRef('DataPolicy', 'policy-1', 'policy-revision-1', 1, HASH_A);
  const second = exactRef('DataPolicy', 'policy-1', 'policy-revision-2', 2, HASH_E);
  await repository.runInTransaction(async (unitOfWork) => {
    for (const [index, asset] of [first, second].entries()) {
      const eventId = `memory-lifecycle-${index + 1}`;
      await unitOfWork.appendLifecycleEvent({
        lifecycle_event_id: eventId,
        asset,
        lifecycle_sequence: 1,
        event_type: 'activated',
        reason_code: 'fixture',
        note: null,
        occurred_at: NOW,
      });
      assert.equal(await unitOfWork.compareAndSwapLifecycleProjection(asset, null, {
        asset,
        projection_state_version: 1,
        lifecycle_sequence: 1,
        lifecycle_status: 'active',
        location_available: true,
        source_event_id: eventId,
        updated_at: NOW,
      }), true);
    }
    assert.equal((await unitOfWork.findLifecycleProjection(first))?.source_event_id, 'memory-lifecycle-1');
    assert.equal((await unitOfWork.findLifecycleProjection(second))?.source_event_id, 'memory-lifecycle-2');
  });
});

test('Pack A schema and migrations preserve exact lifecycle keys and remove draft placeholders', async () => {
  const [schema, migration, cleanupMigration] = await Promise.all([
    readFile(new URL('../../../../../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../../../../../prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../../../../prisma/migrations/20260714190000_remove_experiment_foundation_v2_placeholders/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  for (const source of [schema, migration]) {
    assert.match(source, /ef_asset_lifecycle_event_exact_sequence_unique/);
    assert.match(source, /ef_asset_lifecycle_projection_exact_unique/);
    assert.doesNotMatch(source, /ef_asset_lifecycle_projection_asset_unique/);
  }
  assert.doesNotMatch(schema, /draftSchemaVersion|draftHash/);
  for (const table of [
    'ExperimentFoundationDatasetV2',
    'ExperimentFoundationDataPolicyV2',
    'ExperimentFoundationMetricDefinitionV2',
    'ExperimentFoundationBenchmarkV2',
    'ExperimentFoundationEvaluationProtocolV2',
  ]) {
    assert.match(cleanupMigration, new RegExp(`ALTER TABLE "${table}"[\\s\\S]*DROP COLUMN "draftHash"`));
  }
});

test('Pack A hardening makes all 38 same-domain foreign keys immutable and fences fixed versions', async () => {
  const [schema, initialMigration, hardeningMigration] = await Promise.all([
    readFile(new URL('../../../../../prisma/schema.prisma', import.meta.url), 'utf8'),
    readFile(
      new URL(
        '../../../../../prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../../../../prisma/migrations/20260714210000_normalize_experiment_v2_event_payloads/migration.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  const initialForeignKeys = [...initialMigration.matchAll(
    /ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]*)\) REFERENCES "([^"]+)"\(([^)]*)\) ON DELETE RESTRICT ON UPDATE CASCADE;/g,
  )];
  const hardenedForeignKeys = [...hardeningMigration.matchAll(
    /ALTER TABLE "([^"]+)" DROP CONSTRAINT "([^"]+)", ADD CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]*)\) REFERENCES "([^"]+)"\(([^)]*)\) ON DELETE RESTRICT ON UPDATE RESTRICT;/g,
  )];

  assert.equal(initialForeignKeys.length, 38);
  assert.equal(hardenedForeignKeys.length, 38);
  const normalizeColumns = (value: string): string => value.replace(/\s+/g, ' ').trim();
  const initialByName = new Map<string, string>(initialForeignKeys.map((match): [string, string] => [
    match[2]!,
    [match[1]!, normalizeColumns(match[3]!), match[4]!, normalizeColumns(match[5]!)].join('|'),
  ]));
  const hardenedByName = new Map<string, string>(hardenedForeignKeys.map((match): [string, string] => {
    assert.equal(match[2], match[3]);
    return [
      match[3]!,
      [match[1]!, normalizeColumns(match[4]!), match[5]!, normalizeColumns(match[6]!)].join('|'),
    ];
  }));
  assert.deepEqual(
    [...hardenedByName.entries()].sort(([left], [right]) => left.localeCompare(right)),
    [...initialByName.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
  assert.doesNotMatch(hardeningMigration, /ON (?:DELETE|UPDATE) CASCADE/);

  // The Pack C (C-PI) evidence/closure models sit inside this window; excise
  // them so the census stays exactly the Pack A population, then hold the
  // excised Pack C block to the same immutable-FK rule.
  const packAWindow = schema.slice(
    schema.indexOf('model PaperImplementationExperimentWorkOrderBranchV2'),
    schema.indexOf('// T-132 Pack B:'),
  );
  const packCStart = packAWindow.indexOf('// T-132 Pack C (slice C-PI):');
  const packCEnd = packAWindow.indexOf('// T-132 Pack A:');
  assert.ok(packCStart >= 0 && packCEnd > packCStart);
  const packCSchema = packAWindow.slice(packCStart, packCEnd);
  const packASchema = packAWindow.slice(0, packCStart) + packAWindow.slice(packCEnd);
  const owningRelationLines = packASchema
    .split('\n')
    .filter((line) => line.includes('@relation(') && line.includes('fields:'));
  assert.equal(owningRelationLines.length, 38);
  for (const relationLine of owningRelationLines) {
    assert.match(relationLine, /onDelete: Restrict, onUpdate: Restrict/);
  }
  const packCOwningRelationLines = packCSchema
    .split('\n')
    .filter((line) => line.includes('@relation(') && line.includes('fields:'));
  assert.equal(packCOwningRelationLines.length, 3);
  for (const relationLine of packCOwningRelationLines) {
    assert.match(relationLine, /onDelete: Restrict, onUpdate: Restrict/);
  }

  const fixedVersionChecks = [
    [
      'PaperImplementationExperimentWorkOrderBranchV2',
      'pi_ewo_branch_frame_schema_check',
      'branchFrameSchemaVersion',
    ],
    [
      'PaperImplementationExperimentWorkOrderRevisionV2',
      'pi_ewo_revision_snapshot_schema_check',
      'workOrderSnapshotSchemaVersion',
    ],
    [
      'PaperImplementationExperimentWorkOrderRevisionCellV2',
      'pi_ewo_cell_parameters_schema_check',
      'parametersSchemaVersion',
    ],
    [
      'PaperImplementationExperimentWorkOrderRevisionCellV2',
      'pi_ewo_cell_required_result_schema_check',
      'requiredResultSchemaVersion',
    ],
    [
      'ExperimentFoundationAssetLifecycleEventV2',
      'ef_asset_lifecycle_event_schema_check',
      'eventSchemaVersion',
    ],
    ['ExperimentFoundationRunRecipeV2', 'ef_run_recipe_schema_check', 'recipeSchemaVersion'],
    [
      'ExperimentFoundationTrainingTaskSpecV2',
      'ef_task_spec_schema_check',
      'taskSpecSchemaVersion',
    ],
    [
      'ExperimentFoundationExecutionAttemptEventV2',
      'ef_attempt_event_schema_check',
      'eventSchemaVersion',
    ],
    [
      'ExperimentFoundationProviderCommandV2',
      'ef_provider_command_schema_check',
      'commandSchemaVersion',
    ],
  ] as const;
  assert.equal((hardeningMigration.match(/\bCHECK \(/g) ?? []).length, fixedVersionChecks.length);
  for (const [tableName, constraintName, columnName] of fixedVersionChecks) {
    assert.match(
      hardeningMigration,
      new RegExp(
        `ALTER TABLE "${tableName}"[^;]*ADD CONSTRAINT "${constraintName}" CHECK \\(\"${columnName}\" = 'v1'\\)`,
      ),
    );
  }
  for (const constraintName of ['ef_attempt_event_schema_check', 'ef_provider_command_schema_check']) {
    assert.match(hardeningMigration, new RegExp(`DROP CONSTRAINT "${constraintName}"`));
  }
});

test('PI Prisma spine commits T1/T3 atomically, converges replay, and leases its own outbox', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
  const admission = piAdmissionInput();

  const committed = await repository.commitAdmission(admission);
  assert.deepEqual(committed.cells.map((cell) => cell.ordinal), [1, 2]);
  assert.equal(
    (await repository.commitAdmission(admission)).revision.content_hash,
    admission.revision.content_hash,
  );

  const changed = {
    ...admission,
    revision: { ...admission.revision, content_hash: HASH_F },
  };
  await assert.rejects(
    repository.commitAdmission(changed),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'ADMISSION_IDEMPOTENCY_CONFLICT',
  );

  const head = piHeadInput(admission);
  await repository.commitHeadAdvance(head.input, head.sourceEvent);
  assert.equal((await repository.findBranch('project-1', 'cycle-1', 'main'))?.head_run_id, 'run-1');
  await repository.commitHeadAdvance(head.input, head.sourceEvent);
  const headService = new PaperImplementationExperimentV2HeadService({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
  });
  assert.equal((await headService.consume(head.sourceEvent)).emitted_branch_head_advanced, true);

  // T3 adds a second PI outbox for the same revision. Both admission readback
  // paths must remain pinned to the T1 WorkOrderRevisionAdmitted envelope.
  const byRevision = await repository.findRevisionBundle(
    admission.branch.branch_id,
    admission.revision.work_order_revision_id,
  );
  const byBusinessKey = await repository.findAdmissionByBusinessKey(
    admission.branch.branch_id,
    admission.admission.business_idempotency_key,
  );
  assert.equal(byRevision?.outbox.event.event_type, 'WorkOrderRevisionAdmitted');
  assert.equal(byRevision?.outbox.event.event_id, admission.outbox.event.event_id);
  assert.equal(byBusinessKey?.outbox.event.event_type, 'WorkOrderRevisionAdmitted');
  assert.equal(byBusinessKey?.outbox.event.event_id, admission.outbox.event.event_id);

  const claims = await repository.claimOutbox({
    lease_owner: 'relay-1',
    claimed_at: LATER,
    lease_expires_at: '2026-07-13T00:05:00.000Z',
    limit: 10,
  });
  assert.equal(claims.length, 2);
  assert.ok(claims.every((claim) => claim.owner_domain === 'PaperImplementation'));
  await repository.markOutboxDelivered(claims[0]!.outbox_id, 'relay-1', LATER);
  await repository.releaseOutbox({
    outbox_id: claims[1]!.outbox_id,
    lease_owner: 'relay-1',
    error_code: 'consumer_unavailable',
    next_attempt_at: '2026-07-13T00:02:00.000Z',
    released_at: LATER,
  });

  const cellRow = fake.tables().paperImplementationExperimentWorkOrderRevisionCellV2![0]!;
  const originalParameters = structuredClone(cellRow.parametersJson);
  cellRow.parametersJson = [{ name: 'k', value: 999 }];
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  await assert.rejects(
    headService.consume(head.sourceEvent),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.details?.reason_code === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  cellRow.parametersJson = originalParameters;

  const admissionOutboxRow = fake.tables().paperImplementationExperimentIntegrationOutboxV2!
    .find((row) => row.eventType === 'WorkOrderRevisionAdmitted')!;
  const originalAdmissionPayload = structuredClone(admissionOutboxRow.eventPayloadJson);
  admissionOutboxRow.eventPayloadJson = {
    ...(admissionOutboxRow.eventPayloadJson as Row),
    admission_id: 'tampered-admission-id',
  };
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
  );
  await assert.rejects(
    headService.consume(head.sourceEvent),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.details?.reason_code === 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
  );
  admissionOutboxRow.eventPayloadJson = originalAdmissionPayload;

  const branchRow = fake.tables().paperImplementationExperimentWorkOrderBranchV2![0]!;
  const originalCurrentRevisionId = branchRow.currentRevisionId;
  branchRow.currentRevisionId = 'tampered-current-revision';
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  await assert.rejects(
    headService.consume(head.sourceEvent),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.details?.reason_code === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  branchRow.currentRevisionId = originalCurrentRevisionId;

  const originalHeadRunId = branchRow.headRunId;
  branchRow.headRunId = 'tampered-head-run';
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  await assert.rejects(
    headService.consume(head.sourceEvent),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.details?.reason_code === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  branchRow.headRunId = originalHeadRunId;
});

test('PI Prisma processed replay verifies the complete later head authority', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
  const firstAdmission = piAdmissionInput();
  await repository.commitAdmission(firstAdmission);
  const firstHead = piHeadInput(firstAdmission);
  await repository.commitHeadAdvance(firstHead.input, firstHead.sourceEvent);

  const currentBranch = await repository.findBranch('project-1', 'cycle-1', 'main');
  assert.ok(currentBranch);
  const secondAdmission = nextPiAdmissionInput(firstAdmission, currentBranch);
  await repository.commitAdmission(secondAdmission);
  const secondHead = piHeadInput(secondAdmission, undefined, '2');
  await repository.commitHeadAdvance(secondHead.input, secondHead.sourceEvent);

  const headService = new PaperImplementationExperimentV2HeadService({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
  });
  const healthyReplay = await headService.consume(firstHead.sourceEvent);
  assert.equal(healthyReplay.emitted_branch_head_advanced, true);
  assert.equal(healthyReplay.branch?.head_run_id, secondHead.sourceEvent.payload.run_id);

  const expectReplayConflict = async (reasonCode: string) => {
    await assert.rejects(
      headService.consume(firstHead.sourceEvent),
      (error) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'VERSION_CONFLICT'
        && error.details?.reason_code === reasonCode,
    );
  };

  const secondRevisionRow = fake.tables().paperImplementationExperimentWorkOrderRevisionV2!
    .find((row) => row.id === secondAdmission.revision.work_order_revision_id)!;
  const originalRevisionSnapshot = structuredClone(secondRevisionRow.workOrderSnapshotJson);
  secondRevisionRow.workOrderSnapshotJson = {
    ...(secondRevisionRow.workOrderSnapshotJson as Row),
    title: 'tampered later revision',
  };
  await expectReplayConflict('BRANCH_HEAD_SCOPE_CONFLICT');
  secondRevisionRow.workOrderSnapshotJson = originalRevisionSnapshot;

  const secondCellRow = fake.tables().paperImplementationExperimentWorkOrderRevisionCellV2!
    .find((row) => row.revisionId === secondAdmission.revision.work_order_revision_id)!;
  const originalCellParameters = structuredClone(secondCellRow.parametersJson);
  secondCellRow.parametersJson = [{ name: 'tampered', value: true }];
  await expectReplayConflict('BRANCH_HEAD_SCOPE_CONFLICT');
  secondCellRow.parametersJson = originalCellParameters;

  const secondAdmissionOutbox = fake.tables().paperImplementationExperimentIntegrationOutboxV2!
    .find((row) => row.eventId === secondAdmission.outbox.event.event_id)!;
  const originalAdmissionPayload = structuredClone(secondAdmissionOutbox.eventPayloadJson);
  secondAdmissionOutbox.eventPayloadJson = {
    ...(secondAdmissionOutbox.eventPayloadJson as Row),
    admission_id: 'tampered-later-admission',
  };
  await expectReplayConflict('INTEGRATION_EVENT_PAYLOAD_CONFLICT');
  secondAdmissionOutbox.eventPayloadJson = originalAdmissionPayload;

  const branchRow = fake.tables().paperImplementationExperimentWorkOrderBranchV2![0]!;
  const originalHeadRunId = branchRow.headRunId;
  branchRow.headRunId = 'tampered-later-head-run';
  await expectReplayConflict('BRANCH_HEAD_SCOPE_CONFLICT');
  branchRow.headRunId = originalHeadRunId;

  const originalHeadManifestHash = branchRow.headRunManifestHash;
  branchRow.headRunManifestHash = HASH_A;
  await expectReplayConflict('BRANCH_HEAD_SCOPE_CONFLICT');
  branchRow.headRunManifestHash = originalHeadManifestHash;
});

test('Pack A Prisma Int32 fences prevent head and relay counter overflow without partial writes', async () => {
  const piFake = makeFakePrismaClient();
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(piFake.client);
  const admission = piAdmissionInput();
  await piRepository.commitAdmission(admission);
  const piBranch = piFake.tables().paperImplementationExperimentWorkOrderBranchV2![0]!;
  piBranch.headVersion = EXPERIMENT_V2_INT32_MAX;
  const head = piHeadInput(admission);

  await assert.rejects(
    piRepository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_HEAD_CAS_CONFLICT',
  );
  assert.equal(piBranch.headVersion, EXPERIMENT_V2_INT32_MAX);
  assert.equal(piBranch.headRunId, null);
  assert.equal(
    (piFake.tables().paperImplementationExperimentIntegrationInboxV2 ?? []).length,
    0,
  );
  assert.equal(
    piFake.tables().paperImplementationExperimentIntegrationOutboxV2!.length,
    1,
  );

  const piOutbox = piFake.tables().paperImplementationExperimentIntegrationOutboxV2![0]!;
  piOutbox.relayAttemptCount = EXPERIMENT_V2_INT32_MAX;
  assert.deepEqual(await piRepository.claimOutbox({
    lease_owner: 'int32-pi-relay',
    claimed_at: LATER,
    lease_expires_at: '2026-07-13T00:05:00.000Z',
    limit: 1,
  }), []);
  assert.equal(piOutbox.relayAttemptCount, EXPERIMENT_V2_INT32_MAX);
  assert.equal(piOutbox.relayStatus, 'pending');

  const efFake = makeFakePrismaClient();
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(efFake.client);
  const sourceEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
  seedExactReadiness(efFake.tables(), sourceEvent);
  await efRepository.commitMaterialization(efMaterialization(sourceEvent), sourceEvent);
  const efOutbox = efFake.tables().experimentFoundationIntegrationOutboxV2![0]!;
  efOutbox.relayAttemptCount = EXPERIMENT_V2_INT32_MAX;
  assert.deepEqual(await efRepository.claimOutbox({
    lease_owner: 'int32-ef-relay',
    claimed_at: LATER,
    lease_expires_at: '2026-07-13T00:05:00.000Z',
    limit: 1,
  }), []);
  assert.equal(efOutbox.relayAttemptCount, EXPERIMENT_V2_INT32_MAX);
  assert.equal(efOutbox.relayStatus, 'pending');
});

test('PI Prisma spine rejects persisted typed snapshot, canonical hash, and plan-authority drift', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
  const admission = piAdmissionInput();
  await repository.commitAdmission(admission);

  const branch = (fake.tables().paperImplementationExperimentWorkOrderBranchV2 ?? [])[0]!;
  const revision = (fake.tables().paperImplementationExperimentWorkOrderRevisionV2 ?? [])[0]!;
  const cell = (fake.tables().paperImplementationExperimentWorkOrderRevisionCellV2 ?? [])[0]!;
  const head = piHeadInput(admission);

  branch.branchFrameSchemaVersion = 'v2';
  await assert.rejects(
    repository.findBranch('project-1', 'cycle-1', 'main'),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_SCOPE_CONFLICT',
  );
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  branch.branchFrameSchemaVersion = 'v1';

  branch.branchFrameJson = {
    ...(branch.branchFrameJson as Row),
    frame_schema_version: 'v2',
  };
  await assert.rejects(
    repository.findBranch('project-1', 'cycle-1', 'main'),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_SCOPE_CONFLICT',
  );
  branch.branchFrameJson = {
    ...(branch.branchFrameJson as Row),
    frame_schema_version: 'v1',
  };

  revision.workOrderSnapshotSchemaVersion = 'v2';
  await assert.rejects(
    repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
  );
  revision.workOrderSnapshotSchemaVersion = 'v1';

  revision.workOrderSnapshotJson = {
    ...(revision.workOrderSnapshotJson as Row),
    work_order_schema_version: 'v2',
  };
  await assert.rejects(
    repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
  );
  revision.workOrderSnapshotJson = {
    ...(revision.workOrderSnapshotJson as Row),
    work_order_schema_version: 'v1',
  };

  for (const column of ['parametersSchemaVersion', 'requiredResultSchemaVersion'] as const) {
    cell[column] = 'v2';
    await assert.rejects(
      repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
      (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
        && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
    );
    cell[column] = 'v1';
  }

  const originalBranchFrame = structuredClone(branch.branchFrameJson);
  branch.branchFrameJson = {
    ...(branch.branchFrameJson as Row),
    display_name: 'tampered branch frame',
  };
  await assert.rejects(
    repository.findBranch('project-1', 'cycle-1', 'main'),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_SCOPE_CONFLICT',
  );
  branch.branchFrameJson = originalBranchFrame;

  branch.branchFrameJson = {
    ...(branch.branchFrameJson as Row),
    unexpected_authority: true,
  };
  await assert.rejects(
    repository.findBranch('project-1', 'cycle-1', 'main'),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_SCOPE_CONFLICT',
  );
  branch.branchFrameJson = originalBranchFrame;

  const originalRevisionSnapshot = structuredClone(revision.workOrderSnapshotJson);
  revision.workOrderSnapshotJson = {
    ...(revision.workOrderSnapshotJson as Row),
    objective: 'tampered WorkOrder objective',
  };
  await assert.rejects(
    repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
  );
  revision.workOrderSnapshotJson = originalRevisionSnapshot;

  const originalParameters = structuredClone(cell.parametersJson);
  cell.parametersJson = [{ name: 'k', value: 999 }];
  await assert.rejects(
    repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
  );
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  cell.parametersJson = originalParameters;

  const originalCellPlanHash = revision.cellPlanHash;
  revision.cellPlanHash = HASH_A;
  await assert.rejects(
    repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
  );
  revision.cellPlanHash = originalCellPlanHash;

  const originalApprovedPlanHash = revision.approvedPlanHash;
  revision.approvedPlanHash = HASH_A;
  await assert.rejects(
    repository.findRevisionBundle(admission.branch.branch_id, admission.revision.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'BRANCH_REVISION_CONFLICT',
  );
  revision.approvedPlanHash = originalApprovedPlanHash;
});

test('PI T1 rollback leaves no branch/revision/admission when outbox insert fails', async () => {
  const fake = makeFakePrismaClient([
    'paperImplementationExperimentIntegrationOutboxV2',
  ]);
  const repository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
  await assert.rejects(repository.commitAdmission(piAdmissionInput()), /Injected create failure/);
  assert.equal(await repository.findBranch('project-1', 'cycle-1', 'main'), null);
  assert.equal(
    (fake.tables().paperImplementationExperimentWorkOrderRevisionV2 ?? []).length,
    0,
  );
  assert.equal(
    (fake.tables().paperImplementationExperimentWorkOrderAdmissionV2 ?? []).length,
    0,
  );
});

test('PI T3 rollback preserves the old head when its outbox insert fails', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
  const admission = piAdmissionInput();
  await repository.commitAdmission(admission);
  fake.failCreate('paperImplementationExperimentIntegrationOutboxV2');

  const head = piHeadInput(admission);
  await assert.rejects(
    repository.commitHeadAdvance(head.input, head.sourceEvent),
    /Injected create failure/,
  );
  const branch = await repository.findBranch('project-1', 'cycle-1', 'main');
  assert.equal(branch?.state_version, 1);
  assert.equal(branch?.head_run_id, null);
  assert.equal(
    (fake.tables().paperImplementationExperimentIntegrationInboxV2 ?? []).length,
    0,
  );
});

test('EF Prisma spine commits T2/T4, preserves ordered cells, and leases only EF outbox', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
  const admission = piAdmissionInput();
  const sourceEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
  const materialization = efMaterialization(sourceEvent);
  seedExactReadiness(fake.tables(), sourceEvent);

  const committed = await repository.commitMaterialization(materialization, sourceEvent);
  assert.deepEqual(committed.run_cells.map((cell) => cell.ordinal), [1, 2]);
  assert.equal(committed.task_specs.length, 2);
  assert.equal((await repository.commitMaterialization(materialization, sourceEvent)).run.run_id, 'run-1');

  const headEvent = branchHeadEventForMaterialization(admission, committed);
  const acknowledgement: ExperimentFoundationIntegrationInboxV2 = {
    inbox_id: 'ef-ack-inbox-1',
    consumer_name: 'ef-branch-head-ack-v2',
    source_event_id: headEvent.event_id,
    business_idempotency_key: headEvent.business_idempotency_key,
    payload_hash: headEvent.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(headEvent),
    scope: eventScope(headEvent),
    outcome: 'processed',
    reason_code: null,
    processed_at: LATER,
  };
  assert.equal(
    (await repository.commitAcknowledgement(acknowledgement, headEvent)).inbox_id,
    acknowledgement.inbox_id,
  );
  await repository.commitAcknowledgement(acknowledgement, headEvent);

  const claims = await repository.claimOutbox({
    lease_owner: 'ef-relay-1',
    claimed_at: LATER,
    lease_expires_at: '2026-07-13T00:05:00.000Z',
    limit: 10,
  });
  assert.equal(claims.length, 1);
  assert.equal(claims[0]?.owner_domain, 'ExperimentFoundation');
  assert.equal(claims[0]?.event.event_type, 'RunManifestFrozen');
  await repository.markOutboxTerminal({
    outbox_id: claims[0]!.outbox_id,
    lease_owner: 'ef-relay-1',
    error_code: 'INTEGRATION_EVENT_VERSION_UNSUPPORTED',
    terminal_at: LATER,
  });
  assert.equal((await repository.claimOutbox({
    lease_owner: 'ef-relay-2',
    claimed_at: '2026-07-13T00:10:00.000Z',
    lease_expires_at: '2026-07-13T00:11:00.000Z',
    limit: 10,
  })).length, 0);
});

test('PI/EF Prisma integration storage persists only typed payload JSON and exact envelope columns', async () => {
  const fake = makeFakePrismaClient();
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
  const admission = piAdmissionInput();
  await piRepository.commitAdmission(admission);

  const sourceEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
  const materialization = efMaterialization(sourceEvent);
  seedExactReadiness(fake.tables(), sourceEvent);
  await efRepository.commitMaterialization(materialization, sourceEvent);
  const head = piHeadInput(
    admission,
    materialization.outbox.event as RunManifestFrozenEventV1,
  );
  await piRepository.commitHeadAdvance(head.input, head.sourceEvent);
  const acknowledgement: ExperimentFoundationIntegrationInboxV2 = {
    inbox_id: 'ef-payload-only-ack',
    consumer_name: 'ef-payload-only-consumer',
    source_event_id: head.input.outbox.event.event_id,
    business_idempotency_key: head.input.outbox.event.business_idempotency_key,
    payload_hash: head.input.outbox.event.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(head.input.outbox.event),
    scope: eventScope(head.input.outbox.event),
    outcome: 'processed',
    reason_code: null,
    processed_at: LATER,
  };
  await efRepository.commitAcknowledgement(
    acknowledgement,
    head.input.outbox.event as BranchHeadAdvancedEventV1,
  );

  const expectedByEventId = new Map<string, ExperimentV2IntegrationEvent>([
    [admission.outbox.event.event_id, admission.outbox.event],
    [head.sourceEvent.event_id, head.sourceEvent],
    [head.input.outbox.event.event_id, head.input.outbox.event],
    [materialization.outbox.event.event_id, materialization.outbox.event],
  ]);
  for (const model of [
    'paperImplementationExperimentIntegrationInboxV2',
    'paperImplementationExperimentIntegrationOutboxV2',
    'experimentFoundationIntegrationInboxV2',
    'experimentFoundationIntegrationOutboxV2',
  ]) {
    for (const row of fake.tables()[model] ?? []) {
      const event = expectedByEventId.get(String(row.eventId));
      assert.ok(event, `unexpected ${model} event ${String(row.eventId)}`);
      assert.deepEqual(row.eventPayloadJson, event.payload);
      assert.equal(row.branchKey, event.branch_key);
      assert.equal(row.eventEnvelopeHash, serverHashExperimentV2EventEnvelope(event));
      assert.equal(Object.hasOwn(row.eventPayloadJson as object, 'event_id'), false);
      assert.equal(Object.hasOwn(row.eventPayloadJson as object, 'payload'), false);
      assert.equal(Object.hasOwn(row.eventPayloadJson as object, 'payload_hash'), false);
    }
  }
});

test('PI Prisma claim terminalizes structural, type, version, payload, and envelope-hash drift', async () => {
  const driftCases: Array<[string, (row: Row) => void]> = [
    ['structural correlation', (row) => { row.correlationId = 'drifted-correlation'; }],
    ['unknown event type', (row) => { row.eventType = 'UnknownEvent'; }],
    ['unsupported schema', (row) => { row.schemaVersion = 'v2'; }],
    ['payload hash', (row) => { row.payloadHash = hash('0'); }],
    ['envelope hash', (row) => { row.eventEnvelopeHash = hash('0'); }],
    ['typed payload', (row) => {
      row.eventPayloadJson = {
        ...(row.eventPayloadJson as Row),
        admission_id: 'drifted-admission',
      };
    }],
    ['legacy full envelope JSON', (row) => {
      row.eventPayloadJson = piAdmissionInput().outbox.event as unknown as Row;
    }],
  ];
  for (const [label, mutate] of driftCases) {
    const fake = makeFakePrismaClient();
    const repository = new PrismaPaperImplementationExperimentSpineV2Repository(fake.client);
    await repository.commitAdmission(piAdmissionInput());
    mutate(fake.tables().paperImplementationExperimentIntegrationOutboxV2![0]!);

    assert.deepEqual(await repository.claimOutbox({
      lease_owner: `relay-${label}`,
      claimed_at: LATER,
      lease_expires_at: '2026-07-13T00:05:00.000Z',
      limit: 1,
    }), []);
    const terminal = fake.tables().paperImplementationExperimentIntegrationOutboxV2![0]!;
    assert.equal(terminal.relayStatus, 'terminal', label);
    assert.equal(terminal.relayLeaseOwner, null, label);
    assert.equal(terminal.lastRelayErrorCode, 'INTEGRATION_EVENT_PAYLOAD_CONFLICT', label);
  }
});

test('PI/EF Prisma inbox reads and EF claims fail closed on exact envelope column drift', async () => {
  const piFake = makeFakePrismaClient();
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(piFake.client);
  const admission = piAdmissionInput();
  await piRepository.commitAdmission(admission);
  const head = piHeadInput(admission);
  await piRepository.commitHeadAdvance(head.input, head.sourceEvent);
  piFake.tables().paperImplementationExperimentIntegrationInboxV2![0]!.branchKey = 'drifted';
  await assert.rejects(
    piRepository.findInboxByEvent(head.input.inbox.consumer_name, head.sourceEvent.event_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
  );

  const efFake = makeFakePrismaClient();
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(efFake.client);
  const sourceEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
  seedExactReadiness(efFake.tables(), sourceEvent);
  const materialization = efMaterialization(sourceEvent);
  await efRepository.commitMaterialization(materialization, sourceEvent);
  efFake.tables().experimentFoundationIntegrationOutboxV2![0]!.producerDomain = 'PaperImplementation';
  assert.deepEqual(await efRepository.claimOutbox({
    lease_owner: 'ef-drift-relay',
    claimed_at: LATER,
    lease_expires_at: '2026-07-13T00:05:00.000Z',
    limit: 1,
  }), []);
  assert.equal(
    efFake.tables().experimentFoundationIntegrationOutboxV2![0]!.relayStatus,
    'terminal',
  );
});

test('PI/EF Prisma inbox reads reject outcome, status, and reason-code drift', async () => {
  const mutations: Array<(row: Row) => void> = [
    (row) => { row.outcome = 'unknown'; },
    (row) => { row.status = 'retryable'; },
    (row) => { row.reasonCode = 'BRANCH_HEAD_SCOPE_CONFLICT'; },
    (row) => {
      row.outcome = 'terminal_conflict';
      row.reasonCode = 'UNKNOWN_REASON';
    },
  ];
  for (const mutate of mutations) {
    const piFake = makeFakePrismaClient();
    const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(piFake.client);
    const admission = piAdmissionInput();
    await piRepository.commitAdmission(admission);
    const head = piHeadInput(admission);
    await piRepository.commitHeadAdvance(head.input, head.sourceEvent);
    mutate(piFake.tables().paperImplementationExperimentIntegrationInboxV2![0]!);
    await assert.rejects(
      piRepository.findInboxByEvent(head.input.inbox.consumer_name, head.sourceEvent.event_id),
      isIntegrationPayloadConflict,
    );

    const efFake = makeFakePrismaClient();
    const efRepository = new PrismaExperimentFoundationSpineV2Repository(efFake.client);
    const sourceEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
    seedExactReadiness(efFake.tables(), sourceEvent);
    await efRepository.commitMaterialization(efMaterialization(sourceEvent), sourceEvent);
    mutate(efFake.tables().experimentFoundationIntegrationInboxV2![0]!);
    await assert.rejects(
      efRepository.findInboxByEvent(
        EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
        sourceEvent.event_id,
      ),
      isIntegrationPayloadConflict,
    );
  }
});

test('PI/EF Prisma inbox writes reject inconsistent outcome/reason pairs before insert', async () => {
  const piFake = makeFakePrismaClient();
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(piFake.client);
  const admission = piAdmissionInput();
  await piRepository.commitAdmission(admission);
  const head = piHeadInput(admission);
  await assert.rejects(
    piRepository.recordInboxOutcome({
      ...head.input.inbox,
      reason_code: 'BRANCH_HEAD_SCOPE_CONFLICT',
    }, head.sourceEvent),
    isIntegrationPayloadConflict,
  );
  assert.equal(
    (piFake.tables().paperImplementationExperimentIntegrationInboxV2 ?? []).length,
    0,
  );

  const efFake = makeFakePrismaClient();
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(efFake.client);
  const sourceEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
  seedExactReadiness(efFake.tables(), sourceEvent);
  const materialization = efMaterialization(sourceEvent);
  materialization.inbox.reason_code = 'BRANCH_HEAD_SCOPE_CONFLICT';
  await assert.rejects(
    efRepository.commitMaterialization(materialization, sourceEvent),
    isIntegrationPayloadConflict,
  );
  assert.equal(
    (efFake.tables().experimentFoundationIntegrationInboxV2 ?? []).length,
    0,
  );
  assert.equal((efFake.tables().experimentFoundationRunV2 ?? []).length, 0);
});

test('Pack B prerequisite resolution trusts only the exact validated EF head acknowledgement', async () => {
  const build = async () => {
    const fake = makeFakePrismaClient();
    const efRepository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
    const admission = piAdmissionInput();
    const admittedEvent = admission.outbox.event as WorkOrderRevisionAdmittedEventV1;
    seedExactReadiness(fake.tables(), admittedEvent);
    const materialization = await efRepository.commitMaterialization(
      efMaterialization(admittedEvent),
      admittedEvent,
    );
    const headEvent = branchHeadEventForMaterialization(admission, materialization);
    const acknowledgement: ExperimentFoundationIntegrationInboxV2 = {
      inbox_id: 'ef-execution-head-ack-1',
      consumer_name: EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
      source_event_id: headEvent.event_id,
      business_idempotency_key: headEvent.business_idempotency_key,
      payload_hash: headEvent.payload_hash,
      source_event_hash: serverHashExperimentV2EventEnvelope(headEvent),
      scope: eventScope(headEvent),
      outcome: 'processed',
      reason_code: null,
      processed_at: LATER,
    };
    await efRepository.commitAcknowledgement(acknowledgement, headEvent);
    return {
      fake,
      repository: new PrismaExperimentFoundationExecutionV2Repository(fake.client),
      runId: materialization.run.run_id,
    };
  };

  const valid = await build();
  assert.equal(
    (await valid.repository.resolveRunPrerequisite(valid.runId))
      ?.head_acknowledgement.inbox_id,
    'ef-execution-head-ack-1',
  );

  const queryExcludedDrifts: Array<(row: Row) => void> = [
    (row) => { row.consumerName = 'unexpected-consumer'; },
    (row) => { row.status = 'retryable'; },
    (row) => { row.reasonCode = 'BRANCH_HEAD_SCOPE_CONFLICT'; },
  ];
  for (const mutate of queryExcludedDrifts) {
    const drifted = await build();
    mutate(drifted.fake.tables().experimentFoundationIntegrationInboxV2![1]!);
    assert.equal(await drifted.repository.resolveRunPrerequisite(drifted.runId), null);
    assert.equal(
      (drifted.fake.tables().experimentFoundationExecutionAttemptV2 ?? []).length,
      0,
    );
  }

  const integrityDrifts: Array<(row: Row) => void> = [
    (row) => { row.eventEnvelopeHash = HASH_A; },
    (row) => { row.branchKey = 'drifted-branch-key'; },
    (row) => {
      row.eventPayloadJson = {
        ...(row.eventPayloadJson as Row),
        run_id: 'drifted-run',
      };
    },
  ];
  for (const mutate of integrityDrifts) {
    const drifted = await build();
    mutate(drifted.fake.tables().experimentFoundationIntegrationInboxV2![1]!);
    await assert.rejects(
      drifted.repository.resolveRunPrerequisite(drifted.runId),
      (error) => error instanceof ExperimentFoundationExecutionV2ConstraintError
        && error.reasonCode === 'EXECUTION_SCOPE_DRIFT',
    );
    assert.equal(
      (drifted.fake.tables().experimentFoundationExecutionAttemptV2 ?? []).length,
      0,
    );
  }

  const immutablePrerequisiteDrifts: Array<[string, (tables: Tables) => void]> = [
    ['materializer source consumer', (tables) => {
      tables.experimentFoundationIntegrationInboxV2![0]!.consumerName =
        'alternate-materialization-consumer';
    }],
    ['RunRecipe canonical hash', (tables) => {
      const row = tables.experimentFoundationRunRecipeV2![0]!;
      row.recipeHash = differentFixtureHash(row.recipeHash);
    }],
    ['TrainingTaskSpec snapshot content with unchanged hash', (tables) => {
      const row = tables.experimentFoundationTrainingTaskSpecV2![0]!;
      row.taskSpecSnapshotJson = {
        ...(row.taskSpecSnapshotJson as Row),
        command_snapshot: { command: 'tampered-before-e1', arguments: [] },
      };
    }],
    ['TrainingTaskSpec canonical hash', (tables) => {
      const row = tables.experimentFoundationTrainingTaskSpecV2![0]!;
      row.taskSpecHash = differentFixtureHash(row.taskSpecHash);
    }],
    ['VersionLock canonical hash', (tables) => {
      const row = tables.experimentFoundationVersionLockV2![0]!;
      row.lockHash = differentFixtureHash(row.lockHash);
    }],
    ['RunCell-derived manifest', (tables) => {
      tables.experimentFoundationRunCellV2![0]!.seed = 999;
    }],
    ['Readiness qualification snapshot with unchanged hash', (tables) => {
      const row = tables.experimentFoundationReadinessAttestationV2![0]!;
      row.qualificationSnapshotJson = {
        ...(row.qualificationSnapshotJson as Row),
        all_required_rules_supported: false,
      };
    }],
  ];
  for (const [label, mutate] of immutablePrerequisiteDrifts) {
    const drifted = await build();
    mutate(drifted.fake.tables());
    const predicate = (error: unknown) => (
      error instanceof ExperimentFoundationExecutionV2ConstraintError
      && (
        error.reasonCode === 'EXECUTION_SCOPE_DRIFT'
        || error.reasonCode === 'EXECUTION_READINESS_DRIFT'
      )
    );
    await assert.rejects(
      drifted.repository.resolveRunPrerequisite(drifted.runId),
      predicate,
      `${label} must fail prerequisite resolution`,
    );
    await assert.rejects(
      drifted.repository.startWorkflowSimulation({
        run_id: drifted.runId,
        business_idempotency_key: `must-not-write:${label}`,
        request_hash: HASH_A,
        expected_run_manifest_hash: HASH_A,
        expected_head_acknowledgement_inbox_id: 'must-not-write',
        expected_head_acknowledgement_payload_hash: HASH_A,
        expected_readiness_attestation_id: 'must-not-write',
        expected_readiness_attestation_hash: HASH_A,
        payloads: [],
        attempts: [],
        events: [],
        commands: [],
      }),
      predicate,
      `${label} must fail before E1`,
    );
    for (const model of [
      'experimentFoundationProviderPayloadV2',
      'experimentFoundationExecutionAttemptV2',
      'experimentFoundationExecutionAttemptEventV2',
      'experimentFoundationProviderCommandV2',
    ]) {
      assert.equal(
        (drifted.fake.tables()[model] ?? []).length,
        0,
        `${label} wrote ${model}`,
      );
    }
  }
});

test('EF Prisma spine rejects persisted recipe and task-spec schema-version drift', async () => {
  const fake = makeFakePrismaClient();
  const repository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
  const sourceEvent = piAdmissionInput().outbox.event as WorkOrderRevisionAdmittedEventV1;
  seedExactReadiness(fake.tables(), sourceEvent);
  await repository.commitMaterialization(efMaterialization(sourceEvent), sourceEvent);

  const recipe = (fake.tables().experimentFoundationRunRecipeV2 ?? [])[0]!;
  const taskSpec = (fake.tables().experimentFoundationTrainingTaskSpecV2 ?? [])[0]!;

  recipe.recipeSchemaVersion = 'v2';
  await assert.rejects(
    repository.findMaterializationByRevision(sourceEvent.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'MATERIALIZATION_KEY_CONFLICT',
  );
  recipe.recipeSchemaVersion = 'v1';

  recipe.recipeSnapshotJson = {
    ...(recipe.recipeSnapshotJson as Row),
    recipe_schema_version: 'v2',
  };
  await assert.rejects(
    repository.findMaterializationByRevision(sourceEvent.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'MATERIALIZATION_KEY_CONFLICT',
  );
  recipe.recipeSnapshotJson = {
    ...(recipe.recipeSnapshotJson as Row),
    recipe_schema_version: 'v1',
  };

  taskSpec.taskSpecSchemaVersion = 'v2';
  await assert.rejects(
    repository.findMaterializationByRevision(sourceEvent.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'MATERIALIZATION_KEY_CONFLICT',
  );
  taskSpec.taskSpecSchemaVersion = 'v1';

  taskSpec.taskSpecSnapshotJson = {
    ...(taskSpec.taskSpecSnapshotJson as Row),
    schema_version: 'v2',
  };
  await assert.rejects(
    repository.findMaterializationByRevision(sourceEvent.work_order_revision_id),
    (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
      && error.reasonCode === 'MATERIALIZATION_KEY_CONFLICT',
  );
});

test('EF Prisma materialization reads fail closed on immutable snapshot, exact-cell, and hash drift', async () => {
  const build = async () => {
    const fake = makeFakePrismaClient();
    const repository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
    const sourceEvent = piAdmissionInput().outbox.event as WorkOrderRevisionAdmittedEventV1;
    seedExactReadiness(fake.tables(), sourceEvent);
    const materialization = await repository.commitMaterialization(
      efMaterialization(sourceEvent),
      sourceEvent,
    );
    return { fake, repository, sourceEvent, materialization };
  };
  const drifts: Array<[string, (fixture: Awaited<ReturnType<typeof build>>) => void]> = [
    ['RunRecipe snapshot content with unchanged hash', ({ fake }) => {
      const row = fake.tables().experimentFoundationRunRecipeV2![0]!;
      row.recipeSnapshotJson = {
        ...(row.recipeSnapshotJson as Row),
        entrypoint: 'tampered-entrypoint.mjs',
      };
    }],
    ['RunRecipe hash column', ({ fake }) => {
      fake.tables().experimentFoundationRunRecipeV2![0]!.recipeHash = HASH_A;
    }],
    ['TrainingTaskSpec snapshot content with unchanged hash', ({ fake }) => {
      const row = fake.tables().experimentFoundationTrainingTaskSpecV2![0]!;
      row.taskSpecSnapshotJson = {
        ...(row.taskSpecSnapshotJson as Row),
        command_snapshot: { command: 'tampered', arguments: [] },
      };
    }],
    ['TrainingTaskSpec closed snapshot schema', ({ fake }) => {
      const row = fake.tables().experimentFoundationTrainingTaskSpecV2![0]!;
      row.taskSpecSnapshotJson = {
        ...(row.taskSpecSnapshotJson as Row),
        unexpected_property: true,
      };
    }],
    ['TrainingTaskSpec hash column', ({ fake }) => {
      fake.tables().experimentFoundationTrainingTaskSpecV2![0]!.taskSpecHash = HASH_A;
    }],
    ['TrainingTaskSpec exact admitted-cell mirror', ({ fake }) => {
      fake.tables().experimentFoundationTrainingTaskSpecV2![0]!
        .externalPiWorkOrderCellKey = 'tampered-cell-key';
    }],
    ['VersionLock hash column', ({ fake }) => {
      fake.tables().experimentFoundationVersionLockV2![0]!.lockHash = HASH_A;
    }],
    ['VersionLock ordered dependency mirror', ({ fake }) => {
      fake.tables().experimentFoundationVersionLockDependencyV2![0]!
        .dependencyRevisionHash = HASH_A;
    }],
    ['RunCell-derived manifest content', ({ fake }) => {
      fake.tables().experimentFoundationRunCellV2![0]!.seed = 999;
    }],
    ['Run manifest hash column', ({ fake }) => {
      fake.tables().experimentFoundationRunV2![0]!.runManifestHash = HASH_A;
    }],
    ['RunManifestFrozen ordered TaskSpec bindings', ({ fake, materialization }) => {
      const outbox = fake.tables().experimentFoundationIntegrationOutboxV2![0]!;
      const payload = structuredClone(
        outbox.eventPayloadJson,
      ) as RunManifestFrozenEventV1['payload'];
      payload.task_spec_bindings.reverse();
      const payloadHash = serverHashExperimentV2EventPayload(
        'RunManifestFrozen',
        'v1',
        payload,
      );
      const event = {
        ...materialization.outbox.event,
        payload,
        payload_hash: payloadHash,
      };
      outbox.eventPayloadJson = payload;
      outbox.payloadHash = payloadHash;
      outbox.eventEnvelopeHash = serverHashExperimentV2EventEnvelope(event);
    }],
    ['fully reconstructed admitted inbox exact-cell content', ({ fake, sourceEvent }) => {
      const inbox = fake.tables().experimentFoundationIntegrationInboxV2![0]!;
      const payload = structuredClone(inbox.eventPayloadJson) as WorkOrderRevisionAdmittedEventV1['payload'];
      payload.exact_cells[0]!.parameters = [{ name: 'k', value: 999 }];
      const payloadHash = serverHashExperimentV2EventPayload(
        'WorkOrderRevisionAdmitted',
        'v1',
        payload,
      );
      const event = { ...sourceEvent, payload, payload_hash: payloadHash };
      inbox.eventPayloadJson = payload;
      inbox.payloadHash = payloadHash;
      inbox.eventEnvelopeHash = serverHashExperimentV2EventEnvelope(event);
    }],
    ['fully reconstructed admitted inbox duplicate cell identity', ({ fake, sourceEvent }) => {
      const inbox = fake.tables().experimentFoundationIntegrationInboxV2![0]!;
      const payload = structuredClone(inbox.eventPayloadJson) as WorkOrderRevisionAdmittedEventV1['payload'];
      payload.exact_cells[1]!.work_order_cell_id = payload.exact_cells[0]!.work_order_cell_id;
      const payloadHash = serverHashExperimentV2EventPayload(
        'WorkOrderRevisionAdmitted',
        'v1',
        payload,
      );
      const event = { ...sourceEvent, payload, payload_hash: payloadHash };
      inbox.eventPayloadJson = payload;
      inbox.payloadHash = payloadHash;
      inbox.eventEnvelopeHash = serverHashExperimentV2EventEnvelope(event);
    }],
  ];

  for (const [label, mutate] of drifts) {
    const fixture = await build();
    mutate(fixture);
    await assert.rejects(
      fixture.repository.findMaterializationByRevision(
        fixture.sourceEvent.work_order_revision_id,
      ),
      (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
        && (
          error.reasonCode === 'MATERIALIZATION_KEY_CONFLICT'
          || error.reasonCode === 'RUN_MANIFEST_CONFLICT'
          || error.reasonCode === 'RUN_CELL_PARITY_MISMATCH'
        ),
      label,
    );
  }

  const sourceReceiptDrifts: Array<[string, (row: Row) => void]> = [
    ['alternate materialization consumer', (row) => {
      row.consumerName = 'alternate-materialization-consumer';
    }],
    ['non-processed materialization status', (row) => {
      row.status = 'retryable';
    }],
    ['non-processed materialization outcome', (row) => {
      row.outcome = 'ignored_stale';
    }],
    ['materialization receipt with a reason code', (row) => {
      row.reasonCode = 'UNTRUSTED_SOURCE_RECEIPT';
    }],
  ];
  for (const [label, mutate] of sourceReceiptDrifts) {
    const fixture = await build();
    mutate(fixture.fake.tables().experimentFoundationIntegrationInboxV2![0]!);
    assert.equal(
      await fixture.repository.findMaterializationByRevision(
        fixture.sourceEvent.work_order_revision_id,
      ),
      null,
      label,
    );
  }
});

test('EF T2 rollback leaves no inbox or Run lineage when its outbox insert fails', async () => {
  const fake = makeFakePrismaClient([
    'experimentFoundationIntegrationOutboxV2',
  ]);
  const repository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
  const sourceEvent = piAdmissionInput().outbox.event as WorkOrderRevisionAdmittedEventV1;
  seedExactReadiness(fake.tables(), sourceEvent);

  await assert.rejects(
    repository.commitMaterialization(efMaterialization(sourceEvent), sourceEvent),
    /Injected create failure/,
  );
  assert.equal(await repository.findMaterializationByRevision(sourceEvent.work_order_revision_id), null);
  assert.equal((fake.tables().experimentFoundationIntegrationInboxV2 ?? []).length, 0);
  assert.equal((fake.tables().experimentFoundationVersionLockV2 ?? []).length, 0);
  assert.equal((fake.tables().experimentFoundationRunV2 ?? []).length, 0);
});

test('EF T2 rejects transaction-local readiness drift before every materialization write', async (t) => {
  const driftCases: Array<[string, (tables: Record<string, Row[]>) => void]> = [
    ['revoked outcome', (tables) => {
      tables.experimentFoundationReadinessAttestationV2![0]!.outcome = 'revoked';
    }],
    ['qualification snapshot', (tables) => {
      const row = tables.experimentFoundationReadinessAttestationV2![0]!;
      row.qualificationSnapshotJson = {
        ...(row.qualificationSnapshotJson as Row),
        unexpected: true,
      };
    }],
    ['blocker snapshot', (tables) => {
      tables.experimentFoundationReadinessAttestationV2![0]!.blockerSnapshotJson = [{
        reason_code: 'tampered',
        dependency_ordinal: null,
      }];
    }],
  ];

  for (const [label, mutate] of driftCases) {
    await t.test(label, async () => {
      const fake = makeFakePrismaClient();
      const repository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
      const sourceEvent = piAdmissionInput().outbox.event as WorkOrderRevisionAdmittedEventV1;
      seedExactReadiness(fake.tables(), sourceEvent);
      mutate(fake.tables());

      await assert.rejects(
        repository.commitMaterialization(efMaterialization(sourceEvent), sourceEvent),
        (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
          && error.reasonCode === 'READINESS_DEPENDENCY_DRIFT',
      );
      for (const model of [
        'experimentFoundationIntegrationInboxV2',
        'experimentFoundationVersionLockV2',
        'experimentFoundationVersionLockDependencyV2',
        'experimentFoundationRunRecipeV2',
        'experimentFoundationTrainingTaskSpecV2',
        'experimentFoundationRunV2',
        'experimentFoundationRunCellV2',
        'experimentFoundationIntegrationOutboxV2',
      ]) {
        assert.equal((fake.tables()[model] ?? []).length, 0, `${label} wrote ${model}`);
      }
    });
  }

  await t.test('dependency role', async () => {
    const fake = makeFakePrismaClient();
    const repository = new PrismaExperimentFoundationSpineV2Repository(fake.client);
    const sourceEvent = structuredClone(
      piAdmissionInput().outbox.event,
    ) as WorkOrderRevisionAdmittedEventV1;
    const target = sourceEvent.payload.asset_dependencies[0]!;
    const dependency: ExperimentFoundationV2ExactAssetRevisionRef = {
      asset_type: 'Dataset',
      logical_id: 'dataset-readiness-dependency',
      revision_id: 'dataset-readiness-dependency-revision-1',
      revision_sequence: 1,
      content_hash: HASH_A,
    };
    const readiness = fixtureReadinessSnapshot(target, [dependency]);
    sourceEvent.payload.readiness_attestation_hash = readiness.attestation_hash;
    sourceEvent.payload.asset_dependencies = [target, dependency];
    sourceEvent.payload.work_order_revision = {
      ...sourceEvent.payload.work_order_revision,
      readiness_attestation_hash: readiness.attestation_hash,
      asset_dependencies: [target, dependency],
    };
    sourceEvent.work_order_revision_hash =
      serverHashPaperImplementationExperimentV2WorkOrderRevision(
        sourceEvent.payload.work_order_revision,
      );
    sourceEvent.approved_plan_hash =
      serverHashPaperImplementationExperimentV2ApprovedPlan({
        branch_frame_hash: sourceEvent.payload.branch_frame_hash,
        work_order_revision_hash: sourceEvent.work_order_revision_hash,
        cell_plan_hash: sourceEvent.cell_plan_hash,
      });
    sourceEvent.payload_hash = serverHashExperimentV2EventPayload(
      sourceEvent.event_type,
      sourceEvent.schema_version,
      sourceEvent.payload,
    );
    seedExactReadiness(fake.tables(), sourceEvent);
    fake.tables().experimentFoundationReadinessDependencyV2![0]!.dependencyRole = 'tampered';

    await assert.rejects(
      repository.commitMaterialization(efMaterialization(sourceEvent), sourceEvent),
      (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
        && error.reasonCode === 'READINESS_DEPENDENCY_DRIFT',
    );
    for (const model of [
      'experimentFoundationIntegrationInboxV2',
      'experimentFoundationVersionLockV2',
      'experimentFoundationVersionLockDependencyV2',
      'experimentFoundationRunRecipeV2',
      'experimentFoundationTrainingTaskSpecV2',
      'experimentFoundationRunV2',
      'experimentFoundationRunCellV2',
      'experimentFoundationIntegrationOutboxV2',
    ]) {
      assert.equal((fake.tables()[model] ?? []).length, 0, `dependency role wrote ${model}`);
    }
  });
});

interface AssetRevisionIntegrityFixture {
  assetType: ExperimentFoundationV2AssetType;
  model: string;
  revisionId: string;
  snapshotField: string;
  row: Row;
  metricDependencyRows?: Row[];
}

function assetRevisionIntegrityFixtures(): AssetRevisionIntegrityFixture[] {
  return identityDraftInputs().map((input) => {
    const revisionId = `${input.logical_id}-revision-1`;
    const common = (contentHash: string) => ({
      id: revisionId,
      revisionSequence: 1,
      schemaVersion: input.draft_content.schema_version,
      hashProfile: 'ef-asset-semantic-json@v1',
      contentHash,
      frozenByActorType: 'server',
      frozenByActorId: null,
      frozenAt: new Date(NOW),
    });
    switch (input.asset_type) {
      case 'Dataset': {
        const contentHash = serverHashExperimentFoundationV2AssetRevision({
          asset_type: input.asset_type,
          content: input.draft_content,
        });
        return {
          assetType: input.asset_type,
          model: 'experimentFoundationDatasetRevisionV2',
          revisionId,
          snapshotField: 'datasetSnapshotJson',
          row: {
            ...common(contentHash),
            datasetId: input.logical_id,
            datasetSnapshotJson: structuredClone(input.draft_content),
            dataPolicyRevisionId: input.draft_content.data_policy.revision_id,
            dataPolicyRevisionHash: input.draft_content.data_policy.content_hash,
          },
        };
      }
      case 'DataPolicy': {
        const contentHash = serverHashExperimentFoundationV2AssetRevision({
          asset_type: input.asset_type,
          content: input.draft_content,
        });
        return {
          assetType: input.asset_type,
          model: 'experimentFoundationDataPolicyRevisionV2',
          revisionId,
          snapshotField: 'dataPolicySnapshotJson',
          row: {
            ...common(contentHash),
            dataPolicyId: input.logical_id,
            dataPolicySnapshotJson: structuredClone(input.draft_content),
          },
        };
      }
      case 'MetricDefinition': {
        const contentHash = serverHashExperimentFoundationV2AssetRevision({
          asset_type: input.asset_type,
          content: input.draft_content,
        });
        return {
          assetType: input.asset_type,
          model: 'experimentFoundationMetricDefinitionRevisionV2',
          revisionId,
          snapshotField: 'metricDefinitionSnapshotJson',
          row: {
            ...common(contentHash),
            metricDefinitionId: input.logical_id,
            metricDefinitionSnapshotJson: structuredClone(input.draft_content),
          },
        };
      }
      case 'Benchmark': {
        const contentHash = serverHashExperimentFoundationV2AssetRevision({
          asset_type: input.asset_type,
          content: input.draft_content,
        });
        const dependencies = [
          input.draft_content.corpus_dataset,
          input.draft_content.query_workload_dataset,
        ];
        return {
          assetType: input.asset_type,
          model: 'experimentFoundationBenchmarkRevisionV2',
          revisionId,
          snapshotField: 'benchmarkSnapshotJson',
          row: {
            ...common(contentHash),
            benchmarkId: input.logical_id,
            benchmarkSnapshotJson: structuredClone(input.draft_content),
            corpusDatasetRevisionId: dependencies[0]!.revision_id,
            corpusDatasetRevisionHash: dependencies[0]!.content_hash,
            queryDatasetRevisionId: dependencies[1]!.revision_id,
            queryDatasetRevisionHash: dependencies[1]!.content_hash,
            datasetDependencyManifestHash: serverHashExperimentV2SemanticContent({
              record_kind: 'BenchmarkDatasetDependencyManifest',
              schema_version: 'v1',
              hash_profile: 'ef-readiness-dependency-manifest-json@v1',
              content: dependencies,
            }),
          },
        };
      }
      case 'EvaluationProtocol': {
        const contentHash = serverHashExperimentFoundationV2AssetRevision({
          asset_type: input.asset_type,
          content: input.draft_content,
        });
        const metrics = input.draft_content.metric_dependencies;
        return {
          assetType: input.asset_type,
          model: 'experimentFoundationEvaluationProtocolRevisionV2',
          revisionId,
          snapshotField: 'evaluationProtocolSnapshotJson',
          row: {
            ...common(contentHash),
            evaluationProtocolId: input.logical_id,
            evaluationProtocolSnapshotJson: structuredClone(input.draft_content),
            benchmarkRevisionId: input.draft_content.benchmark_dependency.revision_id,
            benchmarkRevisionHash: input.draft_content.benchmark_dependency.content_hash,
            metricDependencyCount: metrics.length,
            metricDependencyManifestHash: serverHashExperimentV2SemanticContent({
              record_kind: 'EvaluationProtocolMetricDependencyManifest',
              schema_version: 'v1',
              hash_profile: 'ef-readiness-dependency-manifest-json@v1',
              content: metrics,
            }),
          },
          metricDependencyRows: metrics.map((metric, index) => ({
            id: `${revisionId}:metric:${index + 1}`,
            evaluationProtocolRevisionId: revisionId,
            ordinal: index + 1,
            metricDefinitionId: metric.logical_id,
            metricDefinitionRevisionId: metric.revision_id,
            metricDefinitionRevisionSequence: metric.revision_sequence,
            metricDefinitionRevisionHash: metric.content_hash,
          })),
        };
      }
    }
  });
}

function seedAssetRevisionIntegrityFixture(
  tables: Tables,
  fixture: AssetRevisionIntegrityFixture,
): void {
  tables[fixture.model] = [structuredClone(fixture.row)];
  if (fixture.metricDependencyRows) {
    tables.experimentFoundationEvaluationProtocolMetricDependencyV2 =
      structuredClone(fixture.metricDependencyRows);
  }
  if (fixture.assetType === 'Dataset') {
    const policy = (fixture.row.datasetSnapshotJson as Row).data_policy as Row;
    tables.experimentFoundationDataPolicyRevisionV2 = [{
      id: policy.revision_id,
      dataPolicyId: policy.logical_id,
      revisionSequence: policy.revision_sequence,
      contentHash: policy.content_hash,
    }];
  } else if (fixture.assetType === 'Benchmark') {
    const snapshot = fixture.row.benchmarkSnapshotJson as Row;
    const refs = [snapshot.corpus_dataset, snapshot.query_workload_dataset] as Row[];
    tables.experimentFoundationDatasetRevisionV2 = refs.map((ref) => ({
      id: ref.revision_id,
      datasetId: ref.logical_id,
      revisionSequence: ref.revision_sequence,
      contentHash: ref.content_hash,
    }));
  } else if (fixture.assetType === 'EvaluationProtocol') {
    const benchmark = (fixture.row.evaluationProtocolSnapshotJson as Row)
      .benchmark_dependency as Row;
    tables.experimentFoundationBenchmarkRevisionV2 = [{
      id: benchmark.revision_id,
      benchmarkId: benchmark.logical_id,
      revisionSequence: benchmark.revision_sequence,
      contentHash: benchmark.content_hash,
    }];
  }
}

function assetRevisionDrifts(
  fixture: AssetRevisionIntegrityFixture,
): Array<{ label: string; mutate: (tables: Tables) => void }> {
  const row = (tables: Tables) => tables[fixture.model]![0]!;
  const drifts: Array<{ label: string; mutate: (tables: Tables) => void }> = [
    {
      label: 'snapshot content drift with unchanged hash',
      mutate: (tables) => {
        const snapshot = row(tables)[fixture.snapshotField] as Row;
        snapshot.display_name = 'tampered display name';
      },
    },
    {
      label: 'relational schema version drift',
      mutate: (tables) => { row(tables).schemaVersion = 'unsupported'; },
    },
    {
      label: 'snapshot schema version drift',
      mutate: (tables) => {
        const snapshot = row(tables)[fixture.snapshotField] as Row;
        snapshot.schema_version = 'unsupported';
      },
    },
    {
      label: 'hash profile drift',
      mutate: (tables) => { row(tables).hashProfile = 'caller-authored@v1'; },
    },
    {
      label: 'content hash drift',
      mutate: (tables) => {
        row(tables).contentHash = differentFixtureHash(row(tables).contentHash);
      },
    },
  ];
  if (fixture.assetType === 'Dataset') {
    drifts.push({
      label: 'dataset policy mirror drift',
      mutate: (tables) => {
        row(tables).dataPolicyRevisionHash = differentFixtureHash(
          row(tables).dataPolicyRevisionHash,
        );
      },
    });
    drifts.push({
      label: 'dataset policy full exact-ref owner drift',
      mutate: (tables) => {
        tables.experimentFoundationDataPolicyRevisionV2![0]!.dataPolicyId = 'tampered-policy-owner';
      },
    });
  } else if (fixture.assetType === 'Benchmark') {
    drifts.push({
      label: 'benchmark dependency manifest mirror drift',
      mutate: (tables) => {
        row(tables).datasetDependencyManifestHash = differentFixtureHash(
          row(tables).datasetDependencyManifestHash,
        );
      },
    });
    drifts.push({
      label: 'benchmark dataset full exact-ref sequence drift',
      mutate: (tables) => {
        tables.experimentFoundationDatasetRevisionV2![0]!.revisionSequence = 999;
      },
    });
  } else if (fixture.assetType === 'EvaluationProtocol') {
    drifts.push({
      label: 'protocol metric dependency row drift',
      mutate: (tables) => {
        const dependency = tables
          .experimentFoundationEvaluationProtocolMetricDependencyV2![0]!;
        dependency.metricDefinitionRevisionHash = differentFixtureHash(
          dependency.metricDefinitionRevisionHash,
        );
      },
    });
    drifts.push({
      label: 'protocol benchmark full exact-ref owner drift',
      mutate: (tables) => {
        tables.experimentFoundationBenchmarkRevisionV2![0]!.benchmarkId =
          'tampered-benchmark-owner';
      },
    });
  }
  return drifts;
}

function differentFixtureHash(current: unknown): string {
  return current === HASH_A ? HASH_B : HASH_A;
}

function identityDraftInputs(): ExperimentFoundationV2CreateAssetDraftInput[] {
  const policy = {
    ...exactRef('DataPolicy', 'logical-policy-ref', 'policy-revision', 1, HASH_A),
    asset_type: 'DataPolicy' as const,
  };
  const corpus = {
    ...exactRef('Dataset', 'logical-corpus-ref', 'corpus-revision', 1, HASH_B),
    asset_type: 'Dataset' as const,
  };
  const query = {
    ...exactRef('Dataset', 'logical-query-ref', 'query-revision', 1, HASH_C),
    asset_type: 'Dataset' as const,
  };
  const metric = {
    ...exactRef('MetricDefinition', 'logical-metric-ref', 'metric-revision', 1, HASH_D),
    asset_type: 'MetricDefinition' as const,
  };
  const benchmark = {
    ...exactRef('Benchmark', 'logical-benchmark-ref', 'benchmark-revision', 1, HASH_E),
    asset_type: 'Benchmark' as const,
  };
  return [
    {
      asset_type: 'DataPolicy',
      logical_id: 'logical-policy',
      draft_content: {
        schema_version: 'v1', policy_key: 'semantic-policy', display_name: 'Semantic policy',
        license_expression: 'TEST-ONLY', access_level: 'restricted',
        source_terms_uri: 'https://example.invalid/semantic-policy',
        redistribution_allowed: false, commercial_use_allowed: false, use_constraints: ['test_only'],
      },
    },
    {
      asset_type: 'Dataset',
      logical_id: 'logical-dataset',
      draft_content: {
        schema_version: 'v1', dataset_key: 'semantic-dataset', display_name: 'Semantic dataset',
        version_label: 'fixture-v1', dataset_role: 'corpus',
        source_identity: {
          source_name: 'fixture', source_revision: 'fixture-v1',
          source_uri: 'https://example.invalid/semantic-dataset',
        },
        checksum_manifest: {
          manifest_version: 'v1', algorithm: 'sha256',
          entries: [{ path: 'fixture.jsonl', byte_size: 1, checksum: 'a'.repeat(64) }],
          aggregate_checksum: 'b'.repeat(64),
        },
        split_protocol: {
          protocol_version: 'v1',
          splits: [{ ordinal: 1, split_key: 'corpus', split_role: 'corpus', source_selector: '*' }],
        },
        data_policy: policy,
      },
    },
    {
      asset_type: 'MetricDefinition',
      logical_id: 'logical-metric',
      draft_content: {
        schema_version: 'v1', metric_key: 'semantic-metric', display_name: 'Semantic metric',
        direction: 'informational', value_type: 'number', unit: 'count',
        evaluator_binding: { evaluator_key: 'fixture', evaluator_version: 'v1' },
      },
    },
    {
      asset_type: 'Benchmark',
      logical_id: 'logical-benchmark',
      draft_content: {
        schema_version: 'v1', benchmark_key: 'semantic-benchmark',
        display_name: 'Semantic benchmark', description: 'Repository family-key fixture.',
        corpus_dataset: corpus, query_workload_dataset: query,
      },
    },
    {
      asset_type: 'EvaluationProtocol',
      logical_id: 'logical-protocol',
      draft_content: {
        schema_version: 'v2', protocol_key: 'semantic-protocol',
        display_name: 'Semantic protocol', benchmark_dependency: benchmark,
        metric_dependencies: [metric],
        required_rules: [{
          rule_id: 'metric_contract@v1:semantic-metric', rule_type: 'metric_contract@v1',
          metric_definition: metric, metric_key: 'semantic-metric', required_cardinality: 1,
          split_key: 'query', value_type: 'number', unit: 'count', finite_required: true,
        }],
      },
    },
  ];
}

function renameDraftFamilyKey(
  input: ExperimentFoundationV2CreateAssetDraftInput,
): ExperimentFoundationV2CreateAssetDraftInput {
  switch (input.asset_type) {
    case 'Dataset': return {
      ...input,
      draft_content: {
        ...input.draft_content,
        dataset_key: `${input.draft_content.dataset_key}-renamed`,
      },
    };
    case 'DataPolicy': return {
      ...input,
      draft_content: {
        ...input.draft_content,
        policy_key: `${input.draft_content.policy_key}-renamed`,
      },
    };
    case 'MetricDefinition': return {
      ...input,
      draft_content: {
        ...input.draft_content,
        metric_key: `${input.draft_content.metric_key}-renamed`,
      },
    };
    case 'Benchmark': return {
      ...input,
      draft_content: {
        ...input.draft_content,
        benchmark_key: `${input.draft_content.benchmark_key}-renamed`,
      },
    };
    case 'EvaluationProtocol': return {
      ...input,
      draft_content: {
        ...input.draft_content,
        protocol_key: `${input.draft_content.protocol_key}-renamed`,
      },
    };
  }
}

function renameIdentityFamilyKey(
  record: ExperimentFoundationV2AssetIdentityRecord,
): ExperimentFoundationV2AssetIdentityRecord {
  switch (record.asset_type) {
    case 'Dataset': return {
      asset_type: 'Dataset',
      asset: {
        ...record.asset,
        dataset_key: `${record.asset.dataset_key}-renamed`,
        dataset_draft: record.asset.dataset_draft && {
          ...record.asset.dataset_draft,
          dataset_key: `${record.asset.dataset_key}-renamed`,
        },
      },
    };
    case 'DataPolicy': return {
      asset_type: 'DataPolicy',
      asset: {
        ...record.asset,
        policy_key: `${record.asset.policy_key}-renamed`,
        data_policy_draft: record.asset.data_policy_draft && {
          ...record.asset.data_policy_draft,
          policy_key: `${record.asset.policy_key}-renamed`,
        },
      },
    };
    case 'MetricDefinition': return {
      asset_type: 'MetricDefinition',
      asset: {
        ...record.asset,
        metric_key: `${record.asset.metric_key}-renamed`,
        metric_definition_draft: record.asset.metric_definition_draft && {
          ...record.asset.metric_definition_draft,
          metric_key: `${record.asset.metric_key}-renamed`,
        },
      },
    };
    case 'Benchmark': return {
      asset_type: 'Benchmark',
      asset: {
        ...record.asset,
        benchmark_key: `${record.asset.benchmark_key}-renamed`,
        benchmark_draft: record.asset.benchmark_draft && {
          ...record.asset.benchmark_draft,
          benchmark_key: `${record.asset.benchmark_key}-renamed`,
        },
      },
    };
    case 'EvaluationProtocol': return {
      asset_type: 'EvaluationProtocol',
      asset: {
        ...record.asset,
        protocol_key: `${record.asset.protocol_key}-renamed`,
        evaluation_protocol_draft: record.asset.evaluation_protocol_draft && {
          ...record.asset.evaluation_protocol_draft,
          protocol_key: `${record.asset.protocol_key}-renamed`,
        },
      },
    };
  }
}

function identityFamilyKey(record: ExperimentFoundationV2AssetIdentityRecord): string {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_key;
    case 'DataPolicy': return record.asset.policy_key;
    case 'MetricDefinition': return record.asset.metric_key;
    case 'Benchmark': return record.asset.benchmark_key;
    case 'EvaluationProtocol': return record.asset.protocol_key;
  }
}

function seedExactReadiness(
  tables: Tables,
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
  lifecycleStatus = 'active',
): void {
  const target = sourceEvent.payload.asset_dependencies.find(
    (dependency) => dependency.asset_type === 'EvaluationProtocol',
  )!;
  const dependencies = sourceEvent.payload.asset_dependencies.filter(
    (dependency) => dependency.asset_type !== 'EvaluationProtocol',
  );
  const readiness = fixtureReadinessSnapshot(target, dependencies);
  assert.equal(readiness.attestation_hash, sourceEvent.payload.readiness_attestation_hash);
  tables.experimentFoundationReadinessAttestationV2 = [{
    id: sourceEvent.payload.readiness_attestation_id,
    targetAssetType: target.asset_type,
    targetAssetId: target.logical_id,
    targetRevisionId: target.revision_id,
    targetRevisionSequence: target.revision_sequence,
    targetRevisionHash: target.content_hash,
    evaluatorProfileVersion: readiness.evaluator_profile_version,
    evaluatorProfileHash: readiness.evaluator_profile_hash,
    dependencyManifestHash: readiness.dependency_manifest_hash,
    outcome: readiness.status,
    qualificationSnapshotJson: readiness.qualification_snapshot,
    blockerSnapshotJson: readiness.blockers,
    attestationHash: readiness.attestation_hash,
    attestedAt: new Date(NOW),
  }];
  tables.experimentFoundationReadinessDependencyV2 = dependencies.map((dependency, index) => ({
    id: `readiness-dependency-${index + 1}`,
    attestationId: sourceEvent.payload.readiness_attestation_id,
    ordinal: index + 1,
    dependencyRole: dependency.asset_type,
    dependencyAssetType: dependency.asset_type,
    dependencyAssetId: dependency.logical_id,
    dependencyRevisionId: dependency.revision_id,
    dependencyRevisionSequence: dependency.revision_sequence,
    dependencyRevisionHash: dependency.content_hash,
  }));
  tables.experimentFoundationAssetLifecycleProjectionV2 = [target, ...dependencies].map(
    (ref, index) => ({
      id: `lifecycle-projection-${index + 1}`,
      assetType: ref.asset_type,
      assetId: ref.logical_id,
      currentRevisionId: ref.revision_id,
      currentRevisionSequence: ref.revision_sequence,
      currentRevisionHash: ref.content_hash,
      lifecycleStatus,
      locationAvailable: ref.asset_type === 'Dataset',
    }),
  );
}

function fixtureReadinessSnapshot(
  target: ExperimentFoundationV2ExactAssetRevisionRef,
  dependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
) {
  const evaluatorProfileVersion = 'd19-fixture-readiness@v1';
  const evaluatorProfileHash = HASH_C;
  const dependencyManifestHash = serverHashExperimentFoundationV2ReadinessDependencyManifest(
    dependencies,
  );
  const qualificationSnapshot = {
    target_lifecycle_sequence: 1,
    dependency_count: dependencies.length,
    all_dependencies_active: true,
    all_required_rules_supported: true,
  };
  const blockers: [] = [];
  return {
    status: 'passed' as const,
    evaluator_profile_version: evaluatorProfileVersion,
    evaluator_profile_hash: evaluatorProfileHash,
    dependency_manifest_hash: dependencyManifestHash,
    qualification_snapshot: qualificationSnapshot,
    blockers,
    attestation_hash: serverHashExperimentFoundationV2ReadinessAttestation({
      target,
      status: 'passed',
      evaluator_profile_version: evaluatorProfileVersion,
      evaluator_profile_hash: evaluatorProfileHash,
      dependency_manifest_hash: dependencyManifestHash,
      qualification_snapshot: qualificationSnapshot,
      blockers,
    }),
  };
}

function dataPolicyAsset(): ExperimentFoundationDataPolicyV2 {
  return {
    logical_id: 'policy-1',
    policy_key: 'policy-1',
    draft_state_version: 1,
    current_revision_id: null,
    data_policy_draft: {
      schema_version: 'v1',
      policy_key: 'policy-1',
      display_name: 'Policy 1',
      license_expression: 'CC-BY-4.0',
      access_level: 'open',
      source_terms_uri: 'https://example.invalid/terms',
      redistribution_allowed: true,
      commercial_use_allowed: true,
      use_constraints: [],
    },
    created_at: NOW,
    updated_at: NOW,
  };
}

function dataPolicyRevision(): ExperimentFoundationDataPolicyRevisionV2 {
  const content = dataPolicyAsset().data_policy_draft!;
  return {
    logical_id: 'policy-1',
    revision_id: 'policy-revision-1',
    revision_sequence: 1,
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content_hash: serverHashExperimentFoundationV2AssetRevision({
      asset_type: 'DataPolicy',
      content,
    }),
    data_policy_revision: content,
    created_at: NOW,
  };
}

function exactRef(
  assetType: ExperimentFoundationV2ExactAssetRevisionRef['asset_type'],
  logicalId: string,
  revisionId: string,
  sequence: number,
  contentHash: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: sequence,
    content_hash: contentHash,
  };
}

function piAdmissionInput(): PaperImplementationExperimentV2CommitAdmissionInput {
  const dependency = exactRef(
    'EvaluationProtocol',
    'protocol-1',
    'protocol-revision-1',
    1,
    HASH_E,
  );
  const readiness = fixtureReadinessSnapshot(dependency, []);
  const branch: PaperImplementationExperimentWorkOrderBranchV2 = {
    branch_id: 'branch-1',
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    branch_key: 'main',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'Main',
      scientific_intent: 'Measure the two-cell fixture.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    branch_frame_hash: HASH_B,
    state_version: 1,
    current_admitted_revision_id: 'revision-1',
    current_admitted_revision_sequence: 1,
    head_run_id: null,
    head_run_manifest_hash: null,
    head_source_event_id: null,
    created_at: NOW,
    updated_at: NOW,
  };
  branch.branch_frame_hash = serverHashPaperImplementationExperimentV2BranchFrame(
    branch.branch_frame,
  );
  const revision: PaperImplementationExperimentWorkOrderRevisionV2 = {
    work_order_revision_id: 'revision-1',
    branch_id: branch.branch_id,
    revision_sequence: 1,
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'D-19 fixture',
      objective: 'Materialize exactly two cells.',
      readiness_attestation_id: 'readiness-1',
      readiness_attestation_hash: readiness.attestation_hash,
      asset_dependencies: [dependency],
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 60 },
    },
    content_hash: HASH_A,
    cell_plan_hash: HASH_C,
    approved_plan_hash: HASH_F,
    created_at: NOW,
  };
  revision.content_hash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
    revision.work_order_revision,
  );
  const cells: PaperImplementationExperimentWorkOrderRevisionCellV2[] = [1, 2].map((ordinal) => ({
    work_order_cell_id: `cell-${ordinal}`,
    work_order_revision_id: revision.work_order_revision_id,
    ordinal,
    cell_key: `cell-${ordinal}`,
    seed: ordinal,
    repeat_index: 0,
    parameters: [{ name: 'k', value: ordinal }],
    required_result_contract: { metrics: [], artifacts: [] },
    cell_hash: ordinal === 1 ? HASH_1 : HASH_2,
  }));
  for (const cell of cells) {
    cell.cell_hash = serverHashPaperImplementationExperimentV2Cell({
      cell_key: cell.cell_key,
      seed: cell.seed,
      repeat_index: cell.repeat_index,
      parameters: cell.parameters,
      required_result_contract: cell.required_result_contract,
    });
  }
  revision.cell_plan_hash = serverHashPaperImplementationExperimentV2CellPlan(cells);
  revision.approved_plan_hash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: branch.branch_frame_hash,
    work_order_revision_hash: revision.content_hash,
    cell_plan_hash: revision.cell_plan_hash,
  });
  const workOrderEvent: WorkOrderRevisionAdmittedEventV1 = {
    event_id: 'event-admitted-1',
    event_type: 'WorkOrderRevisionAdmitted',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: NOW,
    correlation_id: 'correlation-1',
    causation_id: 'request-1',
    business_idempotency_key: 'admit-1',
    payload_hash: HASH_B,
    implementation_project_id: branch.implementation_project_id,
    validation_cycle_id: branch.validation_cycle_id,
    branch_id: branch.branch_id,
    branch_key: branch.branch_key,
    work_order_revision_id: revision.work_order_revision_id,
    work_order_revision_hash: revision.content_hash,
    branch_revision_sequence: revision.revision_sequence,
    cell_plan_hash: revision.cell_plan_hash,
    approved_plan_hash: revision.approved_plan_hash,
    payload: {
      admission_id: 'admission-1',
      branch_frame_hash: branch.branch_frame_hash,
      work_order_revision: revision.work_order_revision,
      readiness_attestation_id: 'readiness-1',
      readiness_attestation_hash: readiness.attestation_hash,
      asset_dependencies: [dependency],
      exact_cells: cells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.work_order_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.cell_hash,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: cell.parameters,
        required_result_contract: cell.required_result_contract,
      })),
    },
  };
  workOrderEvent.payload_hash = serverHashExperimentV2EventPayload(
    workOrderEvent.event_type,
    workOrderEvent.schema_version,
    workOrderEvent.payload,
  );
  const admission: PaperImplementationExperimentWorkOrderAdmissionV2 = {
    admission_id: 'admission-1',
    work_order_revision_id: revision.work_order_revision_id,
    approved_plan_hash: revision.approved_plan_hash,
    business_idempotency_key: workOrderEvent.business_idempotency_key,
    admitted_by: 'server:test',
    admitted_at: NOW,
  };
  const outbox: PaperImplementationExperimentIntegrationOutboxV2 = {
    outbox_id: 'pi-outbox-admitted-1',
    aggregate_transition_key: 'revision-admitted',
    event: workOrderEvent,
    created_at: NOW,
  };
  return {
    expected_branch_state_version: null,
    branch,
    revision,
    cells,
    admission,
    outbox,
  };
}

function nextPiAdmissionInput(
  previous: PaperImplementationExperimentV2CommitAdmissionInput,
  currentBranch: PaperImplementationExperimentWorkOrderBranchV2,
  identity = '2',
): PaperImplementationExperimentV2CommitAdmissionInput {
  const revision: PaperImplementationExperimentWorkOrderRevisionV2 = {
    ...structuredClone(previous.revision),
    work_order_revision_id: `revision-${identity}`,
    revision_sequence: previous.revision.revision_sequence + 1,
    work_order_revision: {
      ...structuredClone(previous.revision.work_order_revision),
      title: `two-cell revision ${identity}`,
    },
    created_at: LATER,
  };
  revision.content_hash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
    revision.work_order_revision,
  );
  const cells = previous.cells.map((cell) => ({
    ...structuredClone(cell),
    work_order_cell_id: `${cell.work_order_cell_id}-${identity}`,
    work_order_revision_id: revision.work_order_revision_id,
  }));
  revision.cell_plan_hash = serverHashPaperImplementationExperimentV2CellPlan(cells);
  revision.approved_plan_hash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: currentBranch.branch_frame_hash,
    work_order_revision_hash: revision.content_hash,
    cell_plan_hash: revision.cell_plan_hash,
  });
  const admission: PaperImplementationExperimentWorkOrderAdmissionV2 = {
    admission_id: `admission-${identity}`,
    work_order_revision_id: revision.work_order_revision_id,
    approved_plan_hash: revision.approved_plan_hash,
    business_idempotency_key: `admit-${identity}`,
    admitted_by: 'server:test',
    admitted_at: LATER,
  };
  const event: WorkOrderRevisionAdmittedEventV1 = {
    ...structuredClone(previous.outbox.event as WorkOrderRevisionAdmittedEventV1),
    event_id: `event-admitted-${identity}`,
    occurred_at: LATER,
    causation_id: `request-${identity}`,
    business_idempotency_key: admission.business_idempotency_key,
    work_order_revision_id: revision.work_order_revision_id,
    work_order_revision_hash: revision.content_hash,
    branch_revision_sequence: revision.revision_sequence,
    cell_plan_hash: revision.cell_plan_hash,
    approved_plan_hash: revision.approved_plan_hash,
    payload: {
      admission_id: admission.admission_id,
      branch_frame_hash: currentBranch.branch_frame_hash,
      work_order_revision: revision.work_order_revision,
      readiness_attestation_id: revision.work_order_revision.readiness_attestation_id,
      readiness_attestation_hash: revision.work_order_revision.readiness_attestation_hash,
      asset_dependencies: revision.work_order_revision.asset_dependencies,
      exact_cells: cells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.work_order_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.cell_hash,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: cell.parameters,
        required_result_contract: cell.required_result_contract,
      })),
    },
  };
  event.payload_hash = serverHashExperimentV2EventPayload(
    event.event_type,
    event.schema_version,
    event.payload,
  );
  return {
    expected_branch_state_version: currentBranch.state_version,
    branch: {
      ...structuredClone(currentBranch),
      state_version: currentBranch.state_version + 1,
      current_admitted_revision_id: revision.work_order_revision_id,
      current_admitted_revision_sequence: revision.revision_sequence,
      updated_at: LATER,
    },
    revision,
    cells,
    admission,
    outbox: {
      outbox_id: `pi-outbox-admitted-${identity}`,
      aggregate_transition_key: `revision-admitted-${identity}`,
      event,
      created_at: LATER,
    },
  };
}

function piHeadInput(
  admission: PaperImplementationExperimentV2CommitAdmissionInput,
  committedSourceEvent?: RunManifestFrozenEventV1,
  identity = '1',
): {
  sourceEvent: RunManifestFrozenEventV1;
  input: PaperImplementationExperimentV2CommitHeadInput;
} {
  const defaultSourceEvent: RunManifestFrozenEventV1 = {
    event_id: `event-run-frozen-${identity}`,
    event_type: 'RunManifestFrozen',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: LATER,
    correlation_id: 'correlation-1',
    causation_id: admission.outbox.event.event_id,
    business_idempotency_key: `head-${identity}`,
    payload_hash: HASH_C,
    implementation_project_id: admission.branch.implementation_project_id,
    validation_cycle_id: admission.branch.validation_cycle_id,
    branch_id: admission.branch.branch_id,
    branch_key: admission.branch.branch_key,
    work_order_revision_id: admission.revision.work_order_revision_id,
    work_order_revision_hash: admission.revision.content_hash,
    branch_revision_sequence: admission.revision.revision_sequence,
    cell_plan_hash: admission.revision.cell_plan_hash,
    approved_plan_hash: admission.revision.approved_plan_hash,
    payload: {
      source_event_id: admission.outbox.event.event_id,
      version_lock_id: `version-lock-${identity}`,
      version_lock_hash: HASH_D,
      run_recipe_id: `run-recipe-${identity}`,
      run_recipe_hash: HASH_E,
      run_id: `run-${identity}`,
      run_manifest_hash: HASH_F,
      task_spec_bindings: admission.cells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.work_order_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.cell_hash,
        training_task_spec_id: `task-${identity}-${cell.ordinal}`,
        training_task_spec_hash: cell.ordinal === 1 ? HASH_A : HASH_B,
      })),
    },
  };
  defaultSourceEvent.payload.run_manifest_hash = serverHashExperimentFoundationV2RunManifest(
    admission.cells.map((cell, index) => {
      const binding = defaultSourceEvent.payload.task_spec_bindings[index]!;
      return {
        ordinal: cell.ordinal,
        cell_key: cell.cell_key,
        external_pi_cell_id: cell.work_order_cell_id,
        external_pi_cell_hash: cell.cell_hash,
        training_task_spec_id: binding.training_task_spec_id,
        training_task_spec_hash: binding.training_task_spec_hash,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
      };
    }),
  );
  defaultSourceEvent.payload_hash = serverHashExperimentV2EventPayload(
    defaultSourceEvent.event_type,
    defaultSourceEvent.schema_version,
    defaultSourceEvent.payload,
  );
  const sourceEvent = committedSourceEvent ?? defaultSourceEvent;
  const nextBranchStateVersion = admission.branch.state_version + 1;
  const inbox: PaperImplementationExperimentIntegrationInboxV2 = {
    inbox_id: `pi-inbox-run-${identity}`,
    consumer_name: HEAD_CONSUMER,
    source_event_id: sourceEvent.event_id,
    business_idempotency_key: sourceEvent.business_idempotency_key,
    payload_hash: sourceEvent.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(sourceEvent),
    scope: eventScope(sourceEvent),
    outcome: 'processed',
    reason_code: null,
    processed_at: LATER,
  };
  const branchEvent: BranchHeadAdvancedEventV1 = {
    event_id: `event-head-advanced-${identity}`,
    event_type: 'BranchHeadAdvanced',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: LATER,
    correlation_id: 'correlation-1',
    causation_id: sourceEvent.event_id,
    business_idempotency_key: sourceEvent.business_idempotency_key,
    payload_hash: HASH_D,
    ...eventScope(sourceEvent),
    payload: {
      source_event_id: sourceEvent.event_id,
      run_id: sourceEvent.payload.run_id,
      run_manifest_hash: sourceEvent.payload.run_manifest_hash,
      accepted_revision_sequence: sourceEvent.branch_revision_sequence,
      branch_state_version: nextBranchStateVersion,
    },
  };
  branchEvent.payload_hash = serverHashExperimentV2EventPayload(
    branchEvent.event_type,
    branchEvent.schema_version,
    branchEvent.payload,
  );
  const outbox: PaperImplementationExperimentIntegrationOutboxV2 = {
    outbox_id: `pi-outbox-head-${identity}`,
    aggregate_transition_key:
      `${sourceEvent.branch_id}:revision:${sourceEvent.branch_revision_sequence}:head`,
    event: branchEvent,
    created_at: LATER,
  };
  return {
    sourceEvent,
    input: {
      expected_branch_state_version: admission.branch.state_version,
      branch: {
        ...admission.branch,
        state_version: nextBranchStateVersion,
        head_run_id: sourceEvent.payload.run_id,
        head_run_manifest_hash: sourceEvent.payload.run_manifest_hash,
        head_source_event_id: sourceEvent.event_id,
        updated_at: LATER,
      },
      inbox,
      outbox,
    },
  };
}

function branchHeadEventForMaterialization(
  admission: PaperImplementationExperimentV2CommitAdmissionInput,
  materialization: ExperimentFoundationV2MaterializationBundle,
): BranchHeadAdvancedEventV1 {
  const template = piHeadInput(admission).input.outbox.event as BranchHeadAdvancedEventV1;
  const payload: BranchHeadAdvancedEventV1['payload'] = {
    ...template.payload,
    source_event_id: materialization.outbox.event.event_id,
    run_id: materialization.run.run_id,
    run_manifest_hash: materialization.run.run_manifest_hash,
  };
  return {
    ...template,
    causation_id: materialization.outbox.event.event_id,
    payload,
    payload_hash: serverHashExperimentV2EventPayload(
      'BranchHeadAdvanced',
      'v1',
      payload,
    ),
  };
}

function efMaterialization(
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): ExperimentFoundationV2MaterializationBundle {
  const inbox: ExperimentFoundationIntegrationInboxV2 = {
    inbox_id: 'ef-inbox-admitted-1',
    consumer_name: EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
    source_event_id: sourceEvent.event_id,
    business_idempotency_key: sourceEvent.business_idempotency_key,
    payload_hash: sourceEvent.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(sourceEvent),
    scope: eventScope(sourceEvent),
    outcome: 'processed',
    reason_code: null,
    processed_at: NOW,
  };
  const materializationKey =
    `${sourceEvent.work_order_revision_id}:${sourceEvent.approved_plan_hash}`;
  const versionLockId = 'version-lock-1';
  const versionLockDependencies = sourceEvent.payload.asset_dependencies.map(
    (dependency, index) => ({
      version_lock_id: versionLockId,
      ordinal: index + 1,
      dependency,
    }),
  );
  const dependencyManifestHash =
    serverHashExperimentFoundationV2VersionLockDependencyManifest(
      versionLockDependencies.map((dependency) => dependency.dependency),
    );
  const versionLock = {
    version_lock_id: versionLockId,
    materialization_key: materializationKey,
    readiness_attestation_id: sourceEvent.payload.readiness_attestation_id,
    readiness_attestation_hash: sourceEvent.payload.readiness_attestation_hash,
    dependency_manifest_hash: dependencyManifestHash,
    dependency_count: versionLockDependencies.length,
    lock_hash: serverHashExperimentFoundationV2VersionLock({
      materialization_key: materializationKey,
      readiness_attestation_id: sourceEvent.payload.readiness_attestation_id,
      readiness_attestation_hash: sourceEvent.payload.readiness_attestation_hash,
      dependency_manifest_hash: dependencyManifestHash,
      dependencies: versionLockDependencies.map(({ ordinal, dependency }) => ({
        ordinal,
        dependency,
      })),
    }),
    created_at: NOW,
  };
  const runRecipeId = 'run-recipe-1';
  const recipeSnapshot = {
    recipe_schema_version: 'v1' as const,
    entrypoint: 'fixture.mjs',
    arguments: [],
    environment_keys: [],
  };
  const runRecipe = {
    run_recipe_id: runRecipeId,
    materialization_key: materializationKey,
    version_lock_id: versionLockId,
    readiness_attestation_id: sourceEvent.payload.readiness_attestation_id,
    recipe_snapshot: recipeSnapshot,
    recipe_hash: serverHashExperimentFoundationV2RunRecipe({
      materialization_key: materializationKey,
      version_lock_id: versionLockId,
      readiness_attestation_id: sourceEvent.payload.readiness_attestation_id,
      recipe_snapshot: recipeSnapshot,
    }),
    created_at: NOW,
  };
  const taskSpecs: ExperimentFoundationTrainingTaskSpecV2[] =
    sourceEvent.payload.exact_cells.map((cell) => {
      const commandSnapshot = { command: 'node', arguments: ['fixture.mjs'] };
      const ioSnapshot = {
        input_keys: ['input'],
        output_keys: ['simulation_lifecycle_trace'] as const,
      };
      const resourceSnapshot = { cpu_cores: 1, memory_mb: 512 };
      const retrySnapshot = { max_attempts: 1 };
      const taskSpec = {
        training_task_spec_id: `task-${cell.ordinal}`,
        materialization_key: `${materializationKey}:cell:${cell.ordinal}`,
        run_recipe_id: runRecipeId,
        external_pi_work_order_revision_id: sourceEvent.work_order_revision_id,
        external_pi_work_order_revision_hash: sourceEvent.work_order_revision_hash,
        external_pi_cell_id: cell.work_order_cell_id,
        external_pi_cell_hash: cell.cell_hash,
        command_snapshot: commandSnapshot,
        io_snapshot: {
          input_keys: [...ioSnapshot.input_keys],
          output_keys: [...ioSnapshot.output_keys],
        },
        resource_snapshot: resourceSnapshot,
        retry_snapshot: retrySnapshot,
        task_spec_hash: '',
        created_at: NOW,
      } satisfies ExperimentFoundationTrainingTaskSpecV2;
      taskSpec.task_spec_hash = serverHashExperimentFoundationV2TrainingTaskSpec({
        materialization_key: taskSpec.materialization_key,
        run_recipe_id: taskSpec.run_recipe_id,
        external_pi_work_order_revision_id: taskSpec.external_pi_work_order_revision_id,
        external_pi_work_order_revision_hash: taskSpec.external_pi_work_order_revision_hash,
        external_pi_cell_id: taskSpec.external_pi_cell_id,
        external_pi_cell_hash: taskSpec.external_pi_cell_hash,
        admitted_cell: cell,
        command_snapshot: taskSpec.command_snapshot,
        io_snapshot: taskSpec.io_snapshot,
        resource_snapshot: taskSpec.resource_snapshot,
        retry_snapshot: taskSpec.retry_snapshot,
      });
      return taskSpec;
    });
  const runCells = sourceEvent.payload.exact_cells.map((cell, index) => ({
    run_cell_id: `run-cell-${cell.ordinal}`,
    run_id: 'run-1',
    ordinal: cell.ordinal,
    cell_key: cell.cell_key,
    external_pi_cell_id: cell.work_order_cell_id,
    external_pi_cell_hash: cell.cell_hash,
    training_task_spec_id: taskSpecs[index]!.training_task_spec_id,
    training_task_spec_hash: taskSpecs[index]!.task_spec_hash,
    seed: cell.seed,
    repeat_index: cell.repeat_index,
  }));
  const runManifestHash = serverHashExperimentFoundationV2RunManifest(runCells);
  const runFrozenTemplate = piHeadInput(piAdmissionInput()).sourceEvent;
  const frozenPayload: RunManifestFrozenEventV1['payload'] = {
    source_event_id: sourceEvent.event_id,
    version_lock_id: versionLockId,
    version_lock_hash: versionLock.lock_hash,
    run_recipe_id: runRecipeId,
    run_recipe_hash: runRecipe.recipe_hash,
    run_id: 'run-1',
    run_manifest_hash: runManifestHash,
    task_spec_bindings: runCells.map((cell) => ({
      ordinal: cell.ordinal,
      work_order_cell_id: cell.external_pi_cell_id,
      cell_key: cell.cell_key,
      cell_hash: cell.external_pi_cell_hash,
      training_task_spec_id: cell.training_task_spec_id,
      training_task_spec_hash: cell.training_task_spec_hash,
    })),
  };
  const runFrozen: RunManifestFrozenEventV1 = {
    ...runFrozenTemplate,
    causation_id: sourceEvent.event_id,
    business_idempotency_key: sourceEvent.business_idempotency_key,
    implementation_project_id: sourceEvent.implementation_project_id,
    validation_cycle_id: sourceEvent.validation_cycle_id,
    branch_id: sourceEvent.branch_id,
    branch_key: sourceEvent.branch_key,
    work_order_revision_id: sourceEvent.work_order_revision_id,
    work_order_revision_hash: sourceEvent.work_order_revision_hash,
    branch_revision_sequence: sourceEvent.branch_revision_sequence,
    cell_plan_hash: sourceEvent.cell_plan_hash,
    approved_plan_hash: sourceEvent.approved_plan_hash,
    payload: frozenPayload,
    payload_hash: serverHashExperimentV2EventPayload('RunManifestFrozen', 'v1', frozenPayload),
  };
  const outbox: ExperimentFoundationIntegrationOutboxV2 = {
    outbox_id: 'ef-outbox-run-1',
    aggregate_transition_key: 'run-manifest-frozen',
    event: runFrozen,
    created_at: NOW,
  };
  return {
    inbox,
    version_lock: versionLock,
    version_lock_dependencies: versionLockDependencies,
    run_recipe: runRecipe,
    task_specs: taskSpecs,
    run: {
      run_id: 'run-1',
      external_pi_work_order_revision_id: sourceEvent.work_order_revision_id,
      external_pi_work_order_revision_hash: sourceEvent.work_order_revision_hash,
      external_pi_branch_revision_sequence: sourceEvent.branch_revision_sequence,
      run_manifest_hash: runManifestHash,
      cell_count: sourceEvent.payload.exact_cells.length,
      frozen_at: NOW,
    },
    run_cells: runCells,
    outbox,
  };
}

function eventScope(event: {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  branch_revision_sequence: number;
  cell_plan_hash: string;
  approved_plan_hash: string;
}) {
  return {
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    branch_key: event.branch_key,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    cell_plan_hash: event.cell_plan_hash,
    approved_plan_hash: event.approved_plan_hash,
  };
}
