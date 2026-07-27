import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildSciFactAuthorityPlan,
} from './plan-experiment-foundation-scifact-authority.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('SciFact authority plan binds the exact uploaded mirrors to stable revisions', async () => {
  const { authority, mirrors } = await loadManifests();
  const plan = await buildSciFactAuthorityPlan(authority, mirrors);

  assert.equal(plan.status, 'passed');
  assert.equal(plan.database_access, 'none');
  assert.equal(plan.cloud_access, 'none');
  assert.deepEqual(
    plan.exact_refs.data_policies.map((ref) => ref.content_hash),
    [
      'sha256:3a19555e64e6a0e008d6ffda5c08bded06d73986629ad90401f58b118bf4aa70',
      'sha256:5199b666600d1aa09b25aaa7992d5b45f9434fea3a9ecf458e0af0fe46e73231',
    ],
  );
  assert.deepEqual(
    plan.exact_refs.datasets.map((ref) => ref.content_hash),
    [
      'sha256:29e0535234976085ca18a7c7fff80a1a93207ecbaf8a5912a4bd712341ff50ff',
      'sha256:5e37b54c4aee0798f67070e9b9148d5ebe30e50ad3c0175382de6cc3cb8a86fa',
    ],
  );
  assert.deepEqual(
    plan.mirror_bindings.map((binding) => binding.dataset_revision),
    plan.exact_refs.datasets,
  );
});

test('SciFact authority plan rejects mirror digest drift', async () => {
  const { authority, mirrors } = await loadManifests();
  const drifted = structuredClone(mirrors) as {
    mirrors: Array<{ content_digest: string }>;
  };
  drifted.mirrors[0]!.content_digest = `sha256:${'0'.repeat(64)}`;

  await assert.rejects(
    buildSciFactAuthorityPlan(authority, drifted),
    /Dataset checksum manifest drifted from mirror corpus/,
  );
});

test('SciFact authority plan rejects persisted Dataset revision binding drift', async () => {
  const { authority, mirrors } = await loadManifests();
  const drifted = structuredClone(mirrors) as {
    mirrors: Array<{
      dataset_revision_binding: { revision_id: string };
    }>;
  };
  drifted.mirrors[0]!.dataset_revision_binding.revision_id =
    'ef_asset_revision_drifted';

  await assert.rejects(
    buildSciFactAuthorityPlan(authority, drifted),
    /Dataset revision binding drifted for corpus/,
  );
});

test('SciFact authority plan rejects any broadened authorization', async () => {
  const { authority, mirrors } = await loadManifests();
  const broadened = structuredClone(authority) as {
    authorization: { named_local_apply_authorized: boolean };
  };
  broadened.authorization.named_local_apply_authorized = true;

  await assert.rejects(
    buildSciFactAuthorityPlan(broadened, mirrors),
    /must remain default-off/,
  );
});

async function loadManifests(): Promise<{ authority: unknown; mirrors: unknown }> {
  const [authority, mirrors] = await Promise.all([
    readJson('workloads/ragperf-canary/manifests/scifact-authority-v1.json'),
    readJson('workloads/ragperf-canary/manifests/scifact-mirrors-v1.json'),
  ]);
  return { authority, mirrors };
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8')) as unknown;
}
