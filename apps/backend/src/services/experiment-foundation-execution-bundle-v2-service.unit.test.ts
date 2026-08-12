import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationExecutionBundleContentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';

import type {
  ExperimentFoundationExecutionBundleDraftBundleV2,
  ExperimentFoundationExecutionBundleFreezeInputV2,
  ExperimentFoundationExecutionBundleFrozenBundleV2,
  ExperimentFoundationExecutionBundlePutDraftInputV2,
  ExperimentFoundationExecutionBundleV2Repository,
} from '../repositories/experiment-foundation-execution-bundle-v2.repository.js';
import {
  ExperimentFoundationExecutionBundleV2Service,
} from './experiment-foundation-execution-bundle-v2-service.js';
import {
  createRealProviderV2TestFixture,
  REAL_PROVIDER_TEST_NOW,
} from './experiment-foundation-real-provider-v2-test-fixture.js';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
} from './experiment-foundation-scientific-source-v1-service.js';

test('QR-2 production-default bundle ids are deterministic and distinct across keys and sequences', async () => {
  const [left, right] = await Promise.all([
    freezeWithProductionDefaultIds('qr-2-bundle'),
    freezeWithProductionDefaultIds('qr-2-bundle'),
  ]);
  const projectAuthority = (bundle: typeof left) => ({
    execution_bundle_id: bundle.identity.execution_bundle_id,
    execution_bundle_revision_id: bundle.revision.execution_bundle_revision_id,
    revision_content_hash: bundle.revision.content_hash,
    lifecycle_event_id: bundle.lifecycle_event.lifecycle_event_id,
    lifecycle_event_hash: bundle.lifecycle_event.event_hash,
    readiness_id: bundle.readiness.execution_bundle_readiness_id,
    readiness_hash: bundle.readiness.readiness_hash,
  });

  assert.deepEqual(projectAuthority(left), projectAuthority(right));
  assert.match(
    left.identity.execution_bundle_id,
    /^ef_execution_bundle_identity_[a-f0-9]{40}$/,
  );
  assert.match(
    left.revision.execution_bundle_revision_id,
    /^ef_execution_bundle_revision_[a-f0-9]{40}$/,
  );
  assert.match(
    left.lifecycle_event.lifecycle_event_id,
    /^ef_execution_bundle_event_[a-f0-9]{40}$/,
  );
  assert.match(
    left.readiness.execution_bundle_readiness_id,
    /^ef_execution_bundle_readiness_[a-f0-9]{40}$/,
  );

  const differentKey = await freezeWithProductionDefaultIds('qr-2-bundle-other');
  assert.notEqual(
    left.identity.execution_bundle_id,
    differentKey.identity.execution_bundle_id,
  );
  assert.notEqual(
    left.revision.execution_bundle_revision_id,
    differentKey.revision.execution_bundle_revision_id,
  );

  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => REAL_PROVIDER_TEST_NOW,
  });
  await service.putDraft({
    bundle_key: 'qr-2-bundle-sequences',
    display_name: 'QR-2 deterministic sequence bundle',
    expected_draft_version: null,
    draft_content: fixture.bundle.revision_content,
  });
  const first = await service.freezeActiveRevision({
    bundle_key: 'qr-2-bundle-sequences',
    expected_draft_version: 1,
  });
  await service.putDraft({
    bundle_key: 'qr-2-bundle-sequences',
    display_name: 'QR-2 deterministic sequence bundle',
    expected_draft_version: 1,
    draft_content: {
      ...fixture.bundle.revision_content,
      arguments: [...fixture.bundle.revision_content.arguments, '--revision=2'],
    },
  });
  const second = await service.freezeActiveRevision({
    bundle_key: 'qr-2-bundle-sequences',
    expected_draft_version: 2,
  });

  assert.deepEqual(
    [first.revision.revision_sequence, second.revision.revision_sequence],
    [1, 2],
  );
  assert.equal(first.identity.execution_bundle_id, second.identity.execution_bundle_id);
  assert.notEqual(
    first.revision.execution_bundle_revision_id,
    second.revision.execution_bundle_revision_id,
  );
  assert.notEqual(
    first.lifecycle_event.lifecycle_event_id,
    second.lifecycle_event.lifecycle_event_id,
  );
  assert.notEqual(
    first.readiness.execution_bundle_readiness_id,
    second.readiness.execution_bundle_readiness_id,
  );
});

test('provider-managed image identity fails closed on regional address drift', async () => {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => REAL_PROVIDER_TEST_NOW,
  });
  await assert.rejects(
    service.putDraft({
      bundle_key: 'provider-image-region-drift',
      display_name: 'Provider image region drift',
      expected_draft_version: null,
      draft_content: providerManagedContent(
        fixture.bundle.revision_content,
        'dsw-registry-vpc.cn-hangzhou.cr.aliyuncs.com/pai/torcheasyrec:version',
      ),
    }),
    (error: unknown) => (
      error instanceof Error
      && 'reasonCode' in error
      && error.reasonCode === 'EXECUTION_BUNDLE_INVALID'
    ),
  );
});

test('provider-managed image freezes and resolves as an exact v2 revision', async () => {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => REAL_PROVIDER_TEST_NOW,
  });
  await service.putDraft({
    bundle_key: 'provider-image-v2',
    display_name: 'Provider image v2',
    expected_draft_version: null,
    draft_content: providerManagedContent(fixture.bundle.revision_content),
  });
  const frozen = await service.freezeActiveRevision({
    bundle_key: 'provider-image-v2',
    expected_draft_version: 1,
  });

  assert.equal(frozen.revision.schema_version, 'v2');
  assert.equal(
    frozen.revision.revision_content.execution_bundle_schema_version,
    'v2',
  );
  assert.deepEqual(
    await service.resolveActiveReadyExact({
      execution_bundle_revision_id:
        frozen.revision.execution_bundle_revision_id,
      content_hash: frozen.revision.content_hash,
    }),
    frozen,
  );
});

test('provider-managed scientific scope requires and freezes exact scientific bindings', async () => {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => REAL_PROVIDER_TEST_NOW,
  });
  const diagnosticWithScientificBinding = scientificProviderManagedContent(
    fixture.bundle.revision_content,
  );
  diagnosticWithScientificBinding.container_image.provider_managed_asset.permitted_scope =
    'm7_l1_diagnostic_only';
  await assert.rejects(
    service.putDraft({
      bundle_key: 'provider-image-scope-mismatch',
      display_name: 'Provider image scope mismatch',
      expected_draft_version: null,
      draft_content: diagnosticWithScientificBinding,
    }),
    (error: unknown) => (
      error instanceof Error
      && 'reasonCode' in error
      && error.reasonCode === 'EXECUTION_BUNDLE_INVALID'
    ),
  );

  await service.putDraft({
    bundle_key: 'provider-image-scientific-v2',
    display_name: 'Provider image scientific v2',
    expected_draft_version: null,
    draft_content: scientificProviderManagedContent(fixture.bundle.revision_content),
  });
  const frozen = await service.freezeActiveRevision({
    bundle_key: 'provider-image-scientific-v2',
    expected_draft_version: 1,
  });
  assert.equal(
    frozen.revision.revision_content.output_contract.scientific_result_schema_version,
    EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
  );
});

test('one exact Dataset revision may bind multiple unique mirror parts', async () => {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => REAL_PROVIDER_TEST_NOW,
  });
  const content = scientificProviderManagedContent(fixture.bundle.revision_content);
  const firstMirror = content.dataset_mirrors[0];
  assert.ok(firstMirror);
  content.dataset_mirrors.push({
    ...structuredClone(firstMirror),
    ordinal: 2,
    object_ref: `${firstMirror.object_ref}qrels.tsv`,
    content_digest: `sha256:${'8'.repeat(64)}`,
    byte_size: 4096,
  });

  await service.putDraft({
    bundle_key: 'multi-part-dataset-revision',
    display_name: 'Multi-part Dataset revision',
    expected_draft_version: null,
    draft_content: content,
  });
  const frozen = await service.freezeActiveRevision({
    bundle_key: 'multi-part-dataset-revision',
    expected_draft_version: 1,
  });
  assert.equal(frozen.revision.revision_content.dataset_mirrors.length, 2);
  assert.equal(
    frozen.revision.revision_content.dataset_mirrors[0]?.dataset_revision.revision_id,
    frozen.revision.revision_content.dataset_mirrors[1]?.dataset_revision.revision_id,
  );
});

test('multi-part mirrors reject object reuse and revision identity drift', async () => {
  const fixture = createRealProviderV2TestFixture();
  const firstMirror = fixture.bundle.revision_content.dataset_mirrors[0];
  assert.ok(firstMirror);

  for (const secondMirror of [
    {
      ...structuredClone(firstMirror),
      ordinal: 2,
    },
    {
      ...structuredClone(firstMirror),
      ordinal: 2,
      object_ref: `${firstMirror.object_ref}qrels.tsv`,
      dataset_revision: {
        ...firstMirror.dataset_revision,
        content_hash: `sha256:${'9'.repeat(64)}`,
      },
    },
  ]) {
    const repository = new InMemoryExecutionBundleV2Repository();
    const service = new ExperimentFoundationExecutionBundleV2Service({
      repository,
      now: () => REAL_PROVIDER_TEST_NOW,
    });
    await assert.rejects(
      service.putDraft({
        bundle_key: `invalid-multi-part-${secondMirror.object_ref}`,
        display_name: 'Invalid multi-part Dataset revision',
        expected_draft_version: null,
        draft_content: {
          ...fixture.bundle.revision_content,
          dataset_mirrors: [firstMirror, secondMirror],
        },
      }),
      (error: unknown) => (
        error instanceof Error
        && 'reasonCode' in error
        && error.reasonCode === 'EXECUTION_BUNDLE_INVALID'
      ),
    );
  }
});

function providerManagedContent(
  content: ReturnType<typeof createRealProviderV2TestFixture>['bundle']['revision_content'],
  imageRef =
    'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04',
): ExperimentFoundationExecutionBundleContentV2 {
  return {
    ...content,
    execution_bundle_schema_version: 'v2',
    container_image: {
      image_identity_kind: 'provider_managed_asset',
      image_ref: imageRef,
      provider_managed_asset: {
        provider: 'aliyun_pai',
        asset_id: 'image-liuxvj7p2qcnflha84',
        region_id: 'cn-shanghai',
        modified_at: '2026-07-02T04:35:35.000Z',
        size_bytes: 3_803_970_629,
        accessibility: 'PUBLIC',
        source_type: 'Import',
        permitted_scope: 'm7_l1_diagnostic_only',
      },
    },
  };
}

function scientificProviderManagedContent(
  content: ReturnType<typeof createRealProviderV2TestFixture>['bundle']['revision_content'],
): ExperimentFoundationExecutionBundleContentV2 {
  const scientific = providerManagedContent(content);
  return {
    ...scientific,
    container_image: {
      ...scientific.container_image,
      provider_managed_asset: {
        ...scientific.container_image.provider_managed_asset,
        permitted_scope: 'm0_sci_p5_scientific_only',
      },
    },
    output_contract: {
      ...scientific.output_contract,
      parser_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
      parser_profile_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
      scientific_result_schema_version:
        EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
      scientific_result_schema_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
    },
  };
}

async function freezeWithProductionDefaultIds(
  bundleKey: string,
): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2> {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => REAL_PROVIDER_TEST_NOW,
  });
  await service.putDraft({
    bundle_key: bundleKey,
    display_name: 'QR-2 deterministic bundle',
    expected_draft_version: null,
    draft_content: fixture.bundle.revision_content,
  });
  return service.freezeActiveRevision({
    bundle_key: bundleKey,
    expected_draft_version: 1,
  });
}

class InMemoryExecutionBundleV2Repository
implements ExperimentFoundationExecutionBundleV2Repository {
  private readonly drafts = new Map<string, ExperimentFoundationExecutionBundleDraftBundleV2>();
  private readonly frozen = new Map<string, ExperimentFoundationExecutionBundleFrozenBundleV2>();

  async findDraftByBundleKey(
    bundleKey: string,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2 | null> {
    return this.drafts.get(bundleKey) ?? null;
  }

  async putDraft(
    input: ExperimentFoundationExecutionBundlePutDraftInputV2,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2> {
    const existing = this.drafts.get(input.identity.bundle_key);
    const stored: ExperimentFoundationExecutionBundleDraftBundleV2 = {
      identity: {
        ...input.identity,
        state_version: existing
          ? existing.identity.state_version + 1
          : input.identity.state_version,
      },
      draft: structuredClone(input.draft),
      replayed: false,
    };
    this.drafts.set(input.identity.bundle_key, stored);
    return stored;
  }

  async freezeActiveRevision(
    input: ExperimentFoundationExecutionBundleFreezeInputV2,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2> {
    const draftEntry = [...this.drafts.entries()].find(
      ([, bundle]) => bundle.identity.execution_bundle_id === input.execution_bundle_id,
    );
    assert.ok(draftEntry);
    const [bundleKey, draft] = draftEntry;
    const identity = {
      ...draft.identity,
      state_version: draft.identity.state_version + 1,
    };
    const stored: ExperimentFoundationExecutionBundleFrozenBundleV2 = {
      identity,
      draft: structuredClone(draft.draft),
      revision: structuredClone(input.revision),
      lifecycle_event: structuredClone(input.lifecycle_event),
      lifecycle_projection: structuredClone(input.lifecycle_projection),
      readiness: structuredClone(input.readiness),
      replayed: false,
    };
    this.drafts.set(bundleKey, { ...draft, identity });
    this.frozen.set(input.revision.execution_bundle_revision_id, stored);
    return stored;
  }

  async findActiveReadyExact(
    executionBundleRevisionId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2 | null> {
    const bundle = this.frozen.get(executionBundleRevisionId);
    return bundle?.revision.content_hash === contentHash ? bundle : null;
  }
}
