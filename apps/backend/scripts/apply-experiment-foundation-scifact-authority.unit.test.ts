import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { InMemoryExperimentFoundationV2Repository } from '../src/repositories/in-memory-experiment-foundation-v2-repository.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import {
  applySciFactAuthority,
  requireSciFactNamedLocalAuthorization,
  REQUIRED_SCIFACT_NAMED_LOCAL_AUTHORIZATION,
} from './apply-experiment-foundation-scifact-authority.js';
import {
  buildSciFactAuthorityPlan,
  parseSciFactAuthorityManifest,
} from './plan-experiment-foundation-scifact-authority.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NOW = '2026-07-27T12:00:00.000Z';

test('SciFact authority importer creates 26 rows semantically and exact replay creates none', async () => {
  const { authorityValue, mirrorValue } = await loadManifests();
  const authority = parseSciFactAuthorityManifest(authorityValue);
  const plan = await buildSciFactAuthorityPlan(authorityValue, mirrorValue);
  const repository = new InMemoryExperimentFoundationV2Repository();

  const first = await applySciFactAuthority(repository, authority, plan, { now: () => NOW });
  assert.deepEqual(first.counters, {
    asset_identities: { created: 4, exact_reused: 0 },
    asset_revisions: { created: 4, exact_reused: 0 },
    lifecycle_events: { created: 10, exact_reused: 0 },
    lifecycle_projections: { created: 4, exact_reused: 0 },
  });

  const replay = await applySciFactAuthority(repository, authority, plan, { now: () => NOW });
  assert.deepEqual(replay.counters, {
    asset_identities: { created: 0, exact_reused: 4 },
    asset_revisions: { created: 0, exact_reused: 4 },
    lifecycle_events: { created: 0, exact_reused: 10 },
    lifecycle_projections: { created: 0, exact_reused: 4 },
  });
  assert.deepEqual(replay.exact_refs, first.exact_refs);
  assert.deepEqual(replay.mirror_bindings, first.mirror_bindings);
});

test('SciFact authority importer rejects a reserved identity with draft drift', async () => {
  const { authorityValue, mirrorValue } = await loadManifests();
  const authority = parseSciFactAuthorityManifest(authorityValue);
  const plan = await buildSciFactAuthorityPlan(authorityValue, mirrorValue);
  const repository = new InMemoryExperimentFoundationV2Repository();
  const firstPolicy = authority.data_policies[0]!;
  const service = new ExperimentFoundationV2Service(repository, { now: () => NOW });
  await service.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: firstPolicy.logical_id,
    draft_content: {
      ...firstPolicy.draft_content,
      display_name: 'drifted reserved policy',
    },
  });

  await assert.rejects(
    applySciFactAuthority(repository, authority, plan, { now: () => NOW }),
    /asset draft content drifted/,
  );
});

test('SciFact authority importer refuses the obsolete 22-row authorization', () => {
  assert.throws(
    () => requireSciFactNamedLocalAuthorization(
      'T-132 SciFact named-local authority apply: 22 rows',
    ),
    /corrected 26-row scope/,
  );
  assert.doesNotThrow(
    () => requireSciFactNamedLocalAuthorization(REQUIRED_SCIFACT_NAMED_LOCAL_AUTHORIZATION),
  );
});

async function loadManifests(): Promise<{
  authorityValue: unknown;
  mirrorValue: unknown;
}> {
  const [authorityValue, mirrorValue] = await Promise.all([
    readJson('workloads/ragperf-canary/manifests/scifact-authority-v1.json'),
    readJson('workloads/ragperf-canary/manifests/scifact-mirrors-v1.json'),
  ]);
  return { authorityValue, mirrorValue };
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8')) as unknown;
}
