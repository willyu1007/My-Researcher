import assert from 'node:assert/strict';
import test from 'node:test';

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
