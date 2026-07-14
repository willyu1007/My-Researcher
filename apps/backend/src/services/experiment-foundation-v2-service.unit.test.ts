import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ExperimentFoundationV2DataPolicyDraftContentV1,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import { serverHashExperimentV2SemanticContent } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationV2RepositoryConstraintError,
  type ExperimentFoundationV2AssetIdentityRecord,
  type ExperimentFoundationV2Repository,
} from '../repositories/experiment-foundation-v2.repository.js';
import { InMemoryExperimentFoundationV2Repository } from '../repositories/in-memory-experiment-foundation-v2-repository.js';
import { buildExperimentFoundationD19TypedFixture } from './experiment-foundation-d19-fixture.js';
import {
  digestExperimentFoundationD19SourcePolicyAttestation,
  parseExperimentFoundationD19SourcePolicyAttestation,
} from './experiment-foundation-d19-source-policy.js';
import {
  ExperimentFoundationV2Service,
  type ExperimentFoundationV2CreateAssetDraftInput,
} from './experiment-foundation-v2-service.js';

const NOW = '2026-07-13T00:00:00.000Z';

test('A02 server hashes typed semantic content and rejects caller hash, malformed content, and tamper', async () => {
  const { service } = testContext();
  const draft = dataPolicyDraft('policy-a', 'Policy A');
  await service.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'policy-a',
    draft_content: draft,
  });
  const frozen = await service.freezeAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'policy-a',
    expected_state_version: 1,
    business_idempotency_key: 'freeze-policy-a',
  });

  const expectedHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationDataPolicyRevisionV2',
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content: draft as unknown as Parameters<typeof serverHashExperimentV2SemanticContent>[0]['content'],
  });
  assert.equal(frozen.exact_ref.content_hash, expectedHash);

  await assertReason(
    () => service.createAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'caller-hash',
      draft_content: dataPolicyDraft('caller-hash', 'Caller hash'),
      content_hash: `sha256:${'f'.repeat(64)}`,
    } as ExperimentFoundationV2CreateAssetDraftInput),
    'SERVER_CANONICAL_HASH_MISMATCH',
  );
  await assertReason(
    () => service.createAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'malformed',
      draft_content: {
        ...dataPolicyDraft('malformed', 'Malformed'),
        generic_payload: { unsafe: true },
      },
    } as unknown as ExperimentFoundationV2CreateAssetDraftInput),
    'V2_TYPED_SNAPSHOT_INVALID',
  );
  await assertReason(
    () => service.getExactAssetRevision({
      ...frozen.exact_ref,
      content_hash: `sha256:${'0'.repeat(64)}`,
    }),
    'EXACT_REVISION_NOT_FOUND',
  );
});

test('asset service rejects max+1 expected versions before opening a transaction', async () => {
  let transactionCalls = 0;
  const service = serviceFor({
    async runInTransaction() {
      transactionCalls += 1;
      throw new Error('transaction must not be opened for an invalid Int32 input');
    },
  });
  const invalidVersion = EXPERIMENT_V2_INT32_MAX + 1;

  await assertReason(
    () => service.updateAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'int32-input-policy',
      expected_state_version: invalidVersion,
      draft_content: dataPolicyDraft('int32-input-policy', 'Int32 input policy'),
    }),
    'V2_TYPED_SNAPSHOT_INVALID',
  );
  await assertReason(
    () => service.freezeAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'int32-input-policy',
      expected_state_version: invalidVersion,
      business_idempotency_key: 'int32-input-freeze',
    }),
    'V2_TYPED_SNAPSHOT_INVALID',
  );
  await assertReason(
    () => service.appendLifecycleEvent({
      asset: {
        asset_type: 'DataPolicy',
        logical_id: 'int32-input-policy',
        revision_id: 'int32-input-revision',
        revision_sequence: 1,
        content_hash: `sha256:${'a'.repeat(64)}`,
      },
      expected_projection_state_version: invalidVersion,
      event_type: 'activated',
      reason_code: 'INT32_INPUT_TEST',
    }),
    'V2_TYPED_SNAPSHOT_INVALID',
  );
  assert.equal(transactionCalls, 0);
});

test('asset draft update and freeze fail closed when the persisted state version is exhausted', async () => {
  const { repository, service } = testContext();
  await service.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'int32-state-policy',
    draft_content: dataPolicyDraft('int32-state-policy', 'Int32 state policy'),
  });
  await repository.runInTransaction(async (unitOfWork) => {
    const current = await unitOfWork.findAssetIdentity('DataPolicy', 'int32-state-policy');
    assert.ok(current?.asset_type === 'DataPolicy');
    assert.equal(await unitOfWork.compareAndSwapAssetIdentity(
      'DataPolicy',
      'int32-state-policy',
      1,
      {
        ...current,
        asset: { ...current.asset, draft_state_version: EXPERIMENT_V2_INT32_MAX },
      },
    ), true);
  });

  await assertReason(
    () => service.updateAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'int32-state-policy',
      expected_state_version: EXPERIMENT_V2_INT32_MAX,
      draft_content: dataPolicyDraft('int32-state-policy', 'Changed Int32 state policy'),
    }),
    'ASSET_DRAFT_CAS_CONFLICT',
  );
  await assertReason(
    () => service.freezeAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'int32-state-policy',
      expected_state_version: EXPERIMENT_V2_INT32_MAX,
      business_idempotency_key: 'int32-state-freeze',
    }),
    'ASSET_DRAFT_CAS_CONFLICT',
  );

  await repository.runInTransaction(async (unitOfWork) => {
    const current = await unitOfWork.findAssetIdentity('DataPolicy', 'int32-state-policy');
    assert.equal(current?.asset.draft_state_version, EXPERIMENT_V2_INT32_MAX);
    assert.deepEqual(await unitOfWork.listAssetRevisions('DataPolicy', 'int32-state-policy'), []);
    assert.equal(
      await unitOfWork.findFreezeReplay('DataPolicy', 'int32-state-policy', 'int32-state-freeze'),
      null,
    );
  });
});

test('asset freeze and lifecycle append keep immutable rows unchanged at exhausted sequences', async () => {
  const revisionContext = testContext();
  await revisionContext.service.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'int32-revision-policy',
    draft_content: dataPolicyDraft('int32-revision-policy', 'Int32 revision policy'),
  });
  const first = await revisionContext.service.freezeAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'int32-revision-policy',
    expected_state_version: 1,
    business_idempotency_key: 'int32-revision-first',
  });
  await revisionContext.service.updateAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'int32-revision-policy',
    expected_state_version: 2,
    draft_content: dataPolicyDraft('int32-revision-policy', 'Int32 revision changed'),
  });
  const firstRecord = first.revision;
  if (firstRecord.asset_type !== 'DataPolicy') {
    throw new Error('Expected the Int32 revision fixture to be a DataPolicy.');
  }
  await revisionContext.repository.runInTransaction(async (unitOfWork) => {
    await unitOfWork.insertAssetRevision({
      asset_type: 'DataPolicy',
      revision: {
        ...firstRecord.revision,
        revision_id: 'int32-revision-max',
        revision_sequence: EXPERIMENT_V2_INT32_MAX,
        content_hash: `sha256:${'b'.repeat(64)}`,
        data_policy_revision: {
          ...firstRecord.revision.data_policy_revision,
          display_name: 'Synthetic max revision',
        },
      },
    });
  });
  await assertReason(
    () => revisionContext.service.freezeAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'int32-revision-policy',
      expected_state_version: 3,
      business_idempotency_key: 'int32-revision-overflow',
    }),
    'ASSET_REVISION_CONFLICT',
  );
  await revisionContext.repository.runInTransaction(async (unitOfWork) => {
    assert.equal(
      (await unitOfWork.listAssetRevisions('DataPolicy', 'int32-revision-policy')).length,
      2,
    );
    assert.equal(
      await unitOfWork.findFreezeReplay(
        'DataPolicy',
        'int32-revision-policy',
        'int32-revision-overflow',
      ),
      null,
    );
  });

  const lifecycleContext = testContext();
  await lifecycleContext.service.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'int32-lifecycle-policy',
    draft_content: dataPolicyDraft('int32-lifecycle-policy', 'Int32 lifecycle policy'),
  });
  const frozen = await lifecycleContext.service.freezeAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'int32-lifecycle-policy',
    expected_state_version: 1,
    business_idempotency_key: 'int32-lifecycle-freeze',
  });
  await lifecycleContext.service.appendLifecycleEvent({
    asset: frozen.exact_ref,
    expected_projection_state_version: null,
    event_type: 'registered',
    reason_code: 'INT32_LIFECYCLE_REGISTERED',
  });
  await lifecycleContext.repository.runInTransaction(async (unitOfWork) => {
    const current = await unitOfWork.findLifecycleProjection(frozen.exact_ref);
    assert.ok(current);
    assert.equal(await unitOfWork.compareAndSwapLifecycleProjection(
      frozen.exact_ref,
      1,
      {
        ...current,
        projection_state_version: EXPERIMENT_V2_INT32_MAX,
        lifecycle_sequence: EXPERIMENT_V2_INT32_MAX,
      },
    ), true);
  });
  await assertReason(
    () => lifecycleContext.service.appendLifecycleEvent({
      asset: frozen.exact_ref,
      expected_projection_state_version: EXPERIMENT_V2_INT32_MAX,
      event_type: 'activated',
      reason_code: 'INT32_LIFECYCLE_OVERFLOW',
    }),
    'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
  );
  await lifecycleContext.repository.runInTransaction(async (unitOfWork) => {
    assert.equal((await unitOfWork.listLifecycleEvents(frozen.exact_ref)).length, 1);
    const current = await unitOfWork.findLifecycleProjection(frozen.exact_ref);
    assert.equal(current?.projection_state_version, EXPERIMENT_V2_INT32_MAX);
    assert.equal(current?.lifecycle_sequence, EXPERIMENT_V2_INT32_MAX);
  });
});

test('A03 all five families enforce draft CAS, immutable revision sequencing, and exact replay', async () => {
  const { service } = testContext();
  const fixture = await buildExperimentFoundationD19TypedFixture(service);
  const refs = [
    fixture.data_policies[0],
    fixture.datasets[0],
    fixture.metric_definitions[0],
    fixture.benchmark,
    fixture.evaluation_protocol,
  ];

  for (const ref of refs) {
    const revision = await service.getExactAssetRevision(ref);
    const update = changedDraftInput(revision, `changed-${ref.asset_type}`);
    const updated = await service.updateAssetDraft({ ...update, expected_state_version: 2 });
    assert.equal(updated.asset.draft_state_version, 3);
    await assertReason(
      () => service.updateAssetDraft({ ...update, expected_state_version: 2 }),
      'ASSET_DRAFT_CAS_CONFLICT',
    );

    const freezeInput = {
      asset_type: ref.asset_type,
      logical_id: ref.logical_id,
      expected_state_version: 3,
      business_idempotency_key: `second-freeze-${ref.asset_type}`,
    } as const;
    const changed = await service.freezeAssetDraft(freezeInput);
    assert.equal(changed.revision.revision.revision_sequence, 2);
    assert.notEqual(changed.exact_ref.content_hash, ref.content_hash);
    assert.equal(changed.replayed, false);

    const replay = await service.freezeAssetDraft(freezeInput);
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.exact_ref, changed.exact_ref);

    const differentKeyReplay = await service.freezeAssetDraft({
      ...freezeInput,
      expected_state_version: 4,
      business_idempotency_key: `different-key-${ref.asset_type}`,
    });
    assert.equal(differentKeyReplay.replayed, true);
    assert.deepEqual(differentKeyReplay.exact_ref, changed.exact_ref);

    const changedAgain = changedDraftInput(
      await service.getExactAssetRevision(changed.exact_ref),
      `changed-again-${ref.asset_type}`,
    );
    await service.updateAssetDraft({ ...changedAgain, expected_state_version: 4 });
    await assertReason(
      () => service.freezeAssetDraft({
        ...freezeInput,
        expected_state_version: 5,
        business_idempotency_key: `different-key-${ref.asset_type}`,
      }),
      'ASSET_FREEZE_IDEMPOTENCY_CONFLICT',
    );
  }
});

test('all five asset families keep semantic keys independent, unique, and immutable', async () => {
  const { repository, service } = testContext();
  const fixture = await buildExperimentFoundationD19TypedFixture(service);
  const refs = [
    fixture.data_policies[0]!,
    fixture.datasets[0]!,
    fixture.metric_definitions[0]!,
    fixture.benchmark,
    fixture.evaluation_protocol,
  ];

  for (const ref of refs) {
    const revision = await service.getExactAssetRevision(ref);
    const current = await repository.runInTransaction((unitOfWork) => (
      unitOfWork.findAssetIdentity(ref.asset_type, ref.logical_id)
    ));
    assert.ok(current);
    assert.notEqual(
      assetIdentityFamilyKey(current),
      current.asset.logical_id,
      `${ref.asset_type} logical_id must not be treated as its family key`,
    );

    const unchanged = changedDraftInput(revision, `unchanged-key-${ref.asset_type}`);
    await assertReason(
      () => service.createAssetDraft({
        ...unchanged,
        logical_id: `${ref.logical_id}-duplicate-key`,
      }),
      'ASSET_IDENTITY_CONFLICT',
    );
    await assertReason(
      () => service.updateAssetDraft({
        ...renamedFamilyKeyInput(unchanged),
        expected_state_version: 2,
      }),
      'ASSET_IDENTITY_CONFLICT',
    );

    const afterConflict = await repository.runInTransaction((unitOfWork) => (
      unitOfWork.findAssetIdentity(ref.asset_type, ref.logical_id)
    ));
    assert.equal(afterConflict?.asset.draft_state_version, 2);
    assert.equal(afterConflict && assetIdentityFamilyKey(afterConflict), assetIdentityFamilyKey(current));
  }
});

test('A04 D-19 fixture builds exact 2/2/17/1/1 assets and a passed ordered transitive manifest', async () => {
  const { service } = testContext();
  const fixture = await buildExperimentFoundationD19TypedFixture(service);

  assert.equal(fixture.datasets.length, 2);
  assert.equal(fixture.data_policies.length, 2);
  assert.equal(fixture.metric_definitions.length, 17);
  assert.equal(fixture.benchmark.asset_type, 'Benchmark');
  assert.equal(fixture.evaluation_protocol.asset_type, 'EvaluationProtocol');
  assert.equal(fixture.evaluation_protocol_readiness.attestation.status, 'passed');
  assert.equal(fixture.evaluation_protocol_readiness.dependencies.length, 22);
  assert.deepEqual(
    census(fixture.evaluation_protocol_readiness.dependencies.map((row) => row.dependency)),
    {
      Dataset: 2,
      DataPolicy: 2,
      MetricDefinition: 17,
      Benchmark: 1,
      EvaluationProtocol: 0,
    },
  );
  assert.deepEqual(
    fixture.evaluation_protocol_readiness.dependencies.map((row) => row.ordinal),
    Array.from({ length: 22 }, (_, index) => index + 1),
  );

  const revalidated = await service.revalidateReadiness({
    target: fixture.evaluation_protocol,
    readiness_attestation_id:
      fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
    expected_dependencies: fixture.evaluation_protocol_readiness.dependencies.map(
      (dependency) => dependency.dependency,
    ),
  });
  assert.equal(revalidated.attestation.status, 'passed');
});

test('A04 source-policy v2 creates server-hashed exact Dataset/DataPolicy revisions with full field parity', async () => {
  const { service } = testContext();
  const attestation = parseExperimentFoundationD19SourcePolicyAttestation(
    sourcePolicyAttestationFixture(),
    { now: new Date(NOW) },
  );
  const fixture = await buildExperimentFoundationD19TypedFixture(service, {
    sourcePolicyAttestation: attestation,
  });

  assert.equal(fixture.source_policy_attestation, attestation);
  assert.match(
    digestExperimentFoundationD19SourcePolicyAttestation(attestation),
    /^sha256:[0-9a-f]{64}$/,
  );
  for (const [index, datasetRef] of fixture.datasets.entries()) {
    const entry = attestation.dataset_policies[index]!;
    const dataset = await service.getExactAssetRevision(datasetRef);
    assert.equal(dataset.asset_type, 'Dataset');
    assert.deepEqual(
      {
        dataset_key: dataset.revision.dataset_revision.dataset_key,
        dataset_role: dataset.revision.dataset_revision.dataset_role,
        source_name: dataset.revision.dataset_revision.source_identity.source_name,
        source_revision: dataset.revision.dataset_revision.source_identity.source_revision,
        source_uri: dataset.revision.dataset_revision.source_identity.source_uri,
        version_label: dataset.revision.dataset_revision.version_label,
        checksum_manifest: dataset.revision.dataset_revision.checksum_manifest,
        split_protocol: dataset.revision.dataset_revision.split_protocol,
      },
      entry.dataset,
    );
    const policy = await service.getExactAssetRevision(
      dataset.revision.dataset_revision.data_policy,
    );
    assert.equal(policy.asset_type, 'DataPolicy');
    assert.deepEqual(policy.revision.data_policy_revision, {
      schema_version: 'v1',
      ...entry.policy,
    });
  }
});

test('source-policy v2 rejects caller refs, reordered slots, floating revisions, and future provenance', () => {
  const callerRef = sourcePolicyAttestationFixture();
  (callerRef.dataset_policies[0] as Record<string, unknown>).dataset_ref = {
    asset_type: 'Dataset',
    logical_id: 'caller-authored',
    revision_id: 'caller-authored',
    revision_sequence: 1,
    content_hash: `sha256:${'f'.repeat(64)}`,
  };
  assert.throws(
    () => parseExperimentFoundationD19SourcePolicyAttestation(callerRef, { now: new Date(NOW) }),
    /unknown fields: dataset_ref/,
  );

  const reordered = sourcePolicyAttestationFixture();
  reordered.dataset_policies.reverse();
  assert.throws(
    () => parseExperimentFoundationD19SourcePolicyAttestation(reordered, { now: new Date(NOW) }),
    /fixture slots must be ordered/,
  );

  const floating = sourcePolicyAttestationFixture();
  floating.dataset_policies[1]!.dataset.source_revision = 'main';
  assert.throws(
    () => parseExperimentFoundationD19SourcePolicyAttestation(floating, { now: new Date(NOW) }),
    /forbidden placeholder or floating revision/,
  );

  const future = sourcePolicyAttestationFixture();
  future.dataset_policies[0]!.provenance.verified_at = '2026-07-14T00:00:00.000Z';
  assert.throws(
    () => parseExperimentFoundationD19SourcePolicyAttestation(future, { now: new Date(NOW) }),
    /must not be in the future/,
  );

  const aggregateDrift = sourcePolicyAttestationFixture();
  aggregateDrift.dataset_policies[0]!.dataset.checksum_manifest.aggregate_checksum =
    '0'.repeat(64);
  assert.throws(
    () => parseExperimentFoundationD19SourcePolicyAttestation(
      aggregateDrift,
      { now: new Date(NOW) },
    ),
    /aggregate_checksum must be server-derived from ordered entries/,
  );

  const invalidSourceMutations: Array<(
    value: ReturnType<typeof sourcePolicyAttestationFixture>,
  ) => void> = [
    (value) => { value.dataset_policies[0]!.dataset.source_revision = 'release synthetic candidate'; },
    (value) => { value.dataset_policies[0]!.dataset.source_revision = ' release-2026 '; },
    (value) => {
      value.dataset_policies[0]!.dataset.source_uri =
        'https://user:secret@dumps.wikimedia.org/data';
    },
    (value) => {
      value.dataset_policies[0]!.dataset.source_uri =
        'https://dumps.wikimedia.org/test/data';
    },
    (value) => {
      value.dataset_policies[0]!.dataset.source_uri =
        'https://dumps.wikimedia.org/%74est/data';
    },
    (value) => {
      value.dataset_policies[0]!.dataset.source_uri =
        'https://dumps.wikimedia.org/data?revision=latest';
    },
    (value) => {
      value.dataset_policies[0]!.policy.source_terms_uri = 'https://example.com/terms';
    },
    (value) => { value.dataset_policies[0]!.policy.use_constraints[0] = 'placeholder'; },
  ];
  for (const mutate of invalidSourceMutations) {
    const candidate = sourcePolicyAttestationFixture();
    mutate(candidate);
    assert.throws(
      () => parseExperimentFoundationD19SourcePolicyAttestation(
        candidate,
        { now: new Date(NOW) },
      ),
    );
  }
});

test('Benchmark freeze rejects reversed corpus and query-workload Dataset roles', async () => {
  const { service } = testContext();
  const fixture = await buildExperimentFoundationD19TypedFixture(service);
  await service.createAssetDraft({
    asset_type: 'Benchmark',
    logical_id: 'reversed-dataset-role-benchmark',
    draft_content: {
      schema_version: 'v1',
      benchmark_key: 'reversed-dataset-role-benchmark',
      display_name: 'Reversed Dataset role benchmark',
      description: 'Must fail because the exact Dataset roles are reversed.',
      corpus_dataset: { ...fixture.datasets[1]!, asset_type: 'Dataset' },
      query_workload_dataset: { ...fixture.datasets[0]!, asset_type: 'Dataset' },
    },
  });
  await assertReason(
    () => service.freezeAssetDraft({
      asset_type: 'Benchmark',
      logical_id: 'reversed-dataset-role-benchmark',
      expected_state_version: 1,
      business_idempotency_key: 'freeze-reversed-dataset-role-benchmark',
    }),
    'V2_TYPED_SNAPSHOT_INVALID',
  );
});

test('A04 readiness rejects exact target/dependency drift, latest lookup, and post-attestation revocation', async () => {
  const { service } = testContext();
  const fixture = await buildExperimentFoundationD19TypedFixture(service);
  const readinessId = fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id;
  const dependencies = fixture.evaluation_protocol_readiness.dependencies.map((row) => row.dependency);

  await assertReason(
    () => service.revalidateReadiness({
      target: { ...fixture.evaluation_protocol, content_hash: `sha256:${'f'.repeat(64)}` },
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies,
    }),
    'READINESS_DEPENDENCY_DRIFT',
  );
  await assertReason(
    () => service.revalidateReadiness({
      target: fixture.evaluation_protocol,
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies.slice(1),
    }),
    'READINESS_DEPENDENCY_DRIFT',
  );
  await assertReason(
    () => service.revalidateReadiness({
      target: {
        asset_type: 'EvaluationProtocol',
        logical_id: fixture.evaluation_protocol.logical_id,
      },
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies,
    } as unknown as Parameters<ExperimentFoundationV2Service['revalidateReadiness']>[0]),
    'EXACT_REVISION_REQUIRED',
  );

  const revokedDependency = fixture.metric_definitions[0];
  await service.appendLifecycleEvent({
    asset: revokedDependency,
    expected_projection_state_version: 2,
    event_type: 'revoked',
    reason_code: 'TEST_REVOCATION',
  });
  await assertReason(
    () => service.revalidateReadiness({
      target: fixture.evaluation_protocol,
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies,
    }),
    'READINESS_DEPENDENCY_DRIFT',
  );
});

test('freeze replay insertion failure rolls back revision and current-pointer writes', async () => {
  const inner = new InMemoryExperimentFoundationV2Repository();
  const failingRepository: ExperimentFoundationV2Repository = {
    runInTransaction: (operation) => inner.runInTransaction(async (unitOfWork) => {
      const proxy = new Proxy(unitOfWork, {
        get(target, property, receiver) {
          if (property === 'insertFreezeReplay') {
            return async () => {
              throw new ExperimentFoundationV2RepositoryConstraintError(
                'FREEZE_IDEMPOTENCY_CONFLICT',
                'injected replay insertion failure',
              );
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      return operation(proxy);
    }),
  };
  const failingService = serviceFor(failingRepository);
  await failingService.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'rollback-policy',
    draft_content: dataPolicyDraft('rollback-policy', 'Rollback policy'),
  });
  await assertReason(
    () => failingService.freezeAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'rollback-policy',
      expected_state_version: 1,
      business_idempotency_key: 'rollback-freeze',
    }),
    'ASSET_FREEZE_IDEMPOTENCY_CONFLICT',
  );

  const recoveredService = serviceFor(inner);
  const recovered = await recoveredService.freezeAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'rollback-policy',
    expected_state_version: 1,
    business_idempotency_key: 'rollback-freeze',
  });
  assert.equal(recovered.revision.revision.revision_sequence, 1);
  assert.equal(recovered.replayed, false);
});

test('repository constraint reasons map to the stable public v2 error vocabulary', async (t) => {
  const cases = [
    ['ASSET_IDENTITY_CONFLICT', 'ASSET_IDENTITY_CONFLICT', 409, 'VERSION_CONFLICT'],
    ['ASSET_REVISION_CONFLICT', 'ASSET_REVISION_CONFLICT', 409, 'VERSION_CONFLICT'],
    ['FREEZE_IDEMPOTENCY_CONFLICT', 'ASSET_FREEZE_IDEMPOTENCY_CONFLICT', 409, 'VERSION_CONFLICT'],
    ['LIFECYCLE_EVENT_CONFLICT', 'ASSET_LIFECYCLE_TRANSITION_INVALID', 409, 'VERSION_CONFLICT'],
    [
      'LIFECYCLE_PROJECTION_CAS_CONFLICT',
      'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
      409,
      'CONCURRENT_ADVANCE',
    ],
    ['READINESS_ATTESTATION_CONFLICT', 'READINESS_DEPENDENCY_DRIFT', 422, 'GATE_CONSTRAINT_FAILED'],
    ['READINESS_DEPENDENCY_CONFLICT', 'READINESS_DEPENDENCY_DRIFT', 422, 'GATE_CONSTRAINT_FAILED'],
  ] as const;

  for (const [internalReason, publicReason, statusCode, errorCode] of cases) {
    await t.test(internalReason, async () => {
      const repository: ExperimentFoundationV2Repository = {
        async runInTransaction() {
          throw new ExperimentFoundationV2RepositoryConstraintError(
            internalReason,
            'injected repository constraint',
          );
        },
      };
      const service = serviceFor(repository);
      const logicalId = `public-reason-${internalReason.toLowerCase()}`;
      await assert.rejects(
        service.createAssetDraft({
          asset_type: 'DataPolicy',
          logical_id: logicalId,
          draft_content: dataPolicyDraft(logicalId, 'Public reason mapping fixture'),
        }),
        (error: unknown) => error instanceof AppError
          && error.statusCode === statusCode
          && error.errorCode === errorCode
          && error.details?.reason_code === publicReason,
      );
    });
  }
});

function testContext(): {
  repository: InMemoryExperimentFoundationV2Repository;
  service: ExperimentFoundationV2Service;
} {
  const repository = new InMemoryExperimentFoundationV2Repository();
  return { repository, service: serviceFor(repository) };
}

function serviceFor(repository: ExperimentFoundationV2Repository): ExperimentFoundationV2Service {
  let id = 0;
  return new ExperimentFoundationV2Service(repository, {
    now: () => NOW,
    idGenerator: (kind) => `${kind}_${String(++id).padStart(4, '0')}`,
  });
}

function dataPolicyDraft(
  policyKey: string,
  displayName: string,
): ExperimentFoundationV2DataPolicyDraftContentV1 {
  return {
    schema_version: 'v1',
    policy_key: policyKey,
    display_name: displayName,
    license_expression: 'TEST-ONLY',
    access_level: 'restricted',
    source_terms_uri: `https://example.invalid/${policyKey}`,
    redistribution_allowed: false,
    commercial_use_allowed: false,
    use_constraints: ['test_only'],
  };
}

function sourcePolicyAttestationFixture() {
  return {
    schema_version: 'd19-source-policy-attestation@v2',
    dataset_policies: [
      {
        fixture_slot: 'wikipedia_corpus',
        dataset: {
          dataset_key: 'ragperf-wikipedia-corpus',
          dataset_role: 'corpus',
          source_name: 'wikimedia-mediawiki-content-current-enwiki',
          source_revision: 'mediawiki_content_current:enwiki:2026-07-01',
          source_uri: 'https://dumps.wikimedia.org/other/mediawiki_content_current/enwiki/2026-07-01/xml/bzip2/',
          version_label: 'enwiki-2026-07-01-current-text-xml-bzip2',
          checksum_manifest: {
            manifest_version: 'v1',
            algorithm: 'sha256',
            entries: [{
              path: 'enwiki-2026-07-01-p10p1400054.xml.bz2',
              byte_size: 2_724_659_635,
              checksum: 'df3dc4c5718ac810fde07b99ead5fdc17e23417f5d18b0bfc5e53c3ecd79b9e2',
            }],
            aggregate_checksum: 'cbdf4a78e20c9bfb04b38a401d864bb39601942605945e9056e3db5588aba299',
          },
          split_protocol: {
            protocol_version: 'v1',
            splits: [{
              ordinal: 1,
              split_key: 'corpus',
              split_role: 'corpus',
              source_selector: 'wiki=enwiki;revision=2026-07-01;namespace=0;text_only=true',
            }],
          },
        },
        policy: {
          policy_key: 'wikimedia-enwiki-text-cc-by-sa-4.0',
          display_name: 'Wikimedia English Wikipedia text reuse policy',
          license_expression: 'CC-BY-SA-4.0',
          access_level: 'open',
          source_terms_uri: 'https://dumps.wikimedia.org/legal.html',
          redistribution_allowed: true,
          commercial_use_allowed: true,
          use_constraints: ['text_content_only', 'attribution_required', 'share_alike_required'],
        },
        provenance: {
          verified_by: 'T-132-source-policy-review',
          verified_at: '2026-07-12T00:00:00.000Z',
          evidence_uri: 'https://dumps.wikimedia.org/other/mediawiki_content_current/enwiki/2026-07-01/xml/bzip2/SHA256SUMS',
          evidence_sha256: `sha256:${'a'.repeat(64)}`,
        },
      },
      {
        fixture_slot: 'natural_questions_query_workload',
        dataset: {
          dataset_key: 'ragperf-natural-questions-workload',
          dataset_role: 'query_workload',
          source_name: 'google-research-datasets-natural-questions-nq-open',
          source_revision: 'git:fb26a3073b1fe636c97302890a27b491d6530130',
          source_uri: 'https://raw.githubusercontent.com/google-research-datasets/natural-questions/fb26a3073b1fe636c97302890a27b491d6530130/nq_open/NQ-open.dev.jsonl',
          version_label: 'nq-open-original-dev-fb26a3073b1f',
          checksum_manifest: {
            manifest_version: 'v1',
            algorithm: 'sha256',
            entries: [{
              path: 'nq_open/NQ-open.dev.jsonl',
              byte_size: 391_316,
              checksum: 'f15567f38099f3615f5b8a685c0aef449c11ad90d3da3735e8d1b98115b40616',
            }],
            aggregate_checksum: '8ab6fe8ccc3a39539446f2bd83d4516eaed6fb018ec8521a0f5a2444c1fcc68e',
          },
          split_protocol: {
            protocol_version: 'v1',
            splits: [{
              ordinal: 1,
              split_key: 'query',
              split_role: 'query',
              source_selector: 'split=original_dev;records=3610;fields=question,answer',
            }],
          },
        },
        policy: {
          policy_key: 'natural-questions-nq-open-cc-by-sa-3.0',
          display_name: 'Natural Questions NQ-Open data reuse policy',
          license_expression: 'CC-BY-SA-3.0',
          access_level: 'open',
          source_terms_uri: 'https://creativecommons.org/licenses/by-sa/3.0/',
          redistribution_allowed: true,
          commercial_use_allowed: true,
          use_constraints: ['attribution_required', 'share_alike_required_for_adaptations'],
        },
        provenance: {
          verified_by: 'T-132-source-policy-review',
          verified_at: '2026-07-12T00:00:00.000Z',
          evidence_uri: 'https://raw.githubusercontent.com/google-research-datasets/natural-questions/fb26a3073b1fe636c97302890a27b491d6530130/nq_open/README.md',
          evidence_sha256: `sha256:${'b'.repeat(64)}`,
        },
      },
    ],
  };
}

function changedDraftInput(
  record: Awaited<ReturnType<ExperimentFoundationV2Service['getExactAssetRevision']>>,
  displayName: string,
): ExperimentFoundationV2CreateAssetDraftInput {
  switch (record.asset_type) {
    case 'Dataset':
      return {
        asset_type: 'Dataset',
        logical_id: record.revision.logical_id,
        draft_content: { ...record.revision.dataset_revision, display_name: displayName },
      };
    case 'DataPolicy':
      return {
        asset_type: 'DataPolicy',
        logical_id: record.revision.logical_id,
        draft_content: { ...record.revision.data_policy_revision, display_name: displayName },
      };
    case 'MetricDefinition':
      return {
        asset_type: 'MetricDefinition',
        logical_id: record.revision.logical_id,
        draft_content: { ...record.revision.metric_definition_revision, display_name: displayName },
      };
    case 'Benchmark':
      return {
        asset_type: 'Benchmark',
        logical_id: record.revision.logical_id,
        draft_content: { ...record.revision.benchmark_revision, display_name: displayName },
      };
    case 'EvaluationProtocol':
      return {
        asset_type: 'EvaluationProtocol',
        logical_id: record.revision.logical_id,
        draft_content: { ...record.revision.evaluation_protocol_revision, display_name: displayName },
      };
  }
}

function renamedFamilyKeyInput(
  input: ExperimentFoundationV2CreateAssetDraftInput,
): ExperimentFoundationV2CreateAssetDraftInput {
  switch (input.asset_type) {
    case 'Dataset': return {
      ...input,
      draft_content: { ...input.draft_content, dataset_key: `${input.draft_content.dataset_key}-renamed` },
    };
    case 'DataPolicy': return {
      ...input,
      draft_content: { ...input.draft_content, policy_key: `${input.draft_content.policy_key}-renamed` },
    };
    case 'MetricDefinition': return {
      ...input,
      draft_content: { ...input.draft_content, metric_key: `${input.draft_content.metric_key}-renamed` },
    };
    case 'Benchmark': return {
      ...input,
      draft_content: { ...input.draft_content, benchmark_key: `${input.draft_content.benchmark_key}-renamed` },
    };
    case 'EvaluationProtocol': return {
      ...input,
      draft_content: { ...input.draft_content, protocol_key: `${input.draft_content.protocol_key}-renamed` },
    };
  }
}

function assetIdentityFamilyKey(record: ExperimentFoundationV2AssetIdentityRecord): string {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_key;
    case 'DataPolicy': return record.asset.policy_key;
    case 'MetricDefinition': return record.asset.metric_key;
    case 'Benchmark': return record.asset.benchmark_key;
    case 'EvaluationProtocol': return record.asset.protocol_key;
  }
}

function census(refs: ExperimentFoundationV2ExactAssetRevisionRef[]) {
  const result = {
    Dataset: 0,
    DataPolicy: 0,
    MetricDefinition: 0,
    Benchmark: 0,
    EvaluationProtocol: 0,
  };
  for (const ref of refs) {
    result[ref.asset_type] += 1;
  }
  return result;
}

async function assertReason(operation: () => Promise<unknown>, reasonCode: string): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.details?.reason_code, reasonCode);
    return true;
  });
}
