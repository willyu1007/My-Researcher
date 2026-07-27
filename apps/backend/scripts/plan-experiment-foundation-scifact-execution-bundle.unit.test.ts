import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildSciFactExecutionBundlePlan,
} from './plan-experiment-foundation-scifact-execution-bundle.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('SciFact ExecutionBundle plan freezes v2 and replays two exact offline payloads', async () => {
  const inputs = await loadInputs();
  const plan = await buildSciFactExecutionBundlePlan(
    inputs.authoring,
    inputs.workload,
    inputs.mirrors,
  );

  assert.equal(plan.status, 'passed');
  assert.equal(plan.database_access, 'none');
  assert.equal(plan.cloud_access, 'none');
  assert.equal(plan.provider_operations, 0);
  assert.equal(plan.planned_write_scope.total_rows, 6);
  assert.equal(plan.frozen_bundle.revision.schema_version, 'v2');
  assert.equal(
    plan.frozen_bundle.revision.revision_content.dataset_mirrors.length,
    2,
  );
  assert.equal(plan.offline_same_payload_preview.length, 2);
  assert.ok(plan.offline_same_payload_preview.every((preview) => (
    preview.same_payload_replay_exact
    && preview.manifest_schema_version === 'v2'
    && preview.network_requests === 0
    && preview.provider_writes === 0
    && preview.create_job_calls === 0
    && preview.scientific_writes === 0
  )));
});

test('SciFact ExecutionBundle plan rejects workload artifact drift', async () => {
  const inputs = await loadInputs();
  const workload = structuredClone(inputs.workload) as {
    delivery: { byte_size: number };
  };
  workload.delivery.byte_size += 1;

  await assert.rejects(
    buildSciFactExecutionBundlePlan(
      inputs.authoring,
      workload,
      inputs.mirrors,
    ),
  );
});

test('SciFact ExecutionBundle plan rejects unbound Dataset mirrors', async () => {
  const inputs = await loadInputs();
  const mirrors = structuredClone(inputs.mirrors) as {
    mirrors: Array<{ dataset_revision_binding: unknown }>;
  };
  mirrors.mirrors[0]!.dataset_revision_binding = null;

  await assert.rejects(
    buildSciFactExecutionBundlePlan(
      inputs.authoring,
      inputs.workload,
      mirrors,
    ),
    /mirror remains unbound/,
  );
});

test('SciFact ExecutionBundle plan rejects broadened manifest authorization', async () => {
  const inputs = await loadInputs();
  const authoring = structuredClone(inputs.authoring) as {
    authorization: { create_job_authorized: boolean };
  };
  authoring.authorization.create_job_authorized = true;

  await assert.rejects(
    buildSciFactExecutionBundlePlan(
      authoring,
      inputs.workload,
      inputs.mirrors,
    ),
    /must remain default-off/,
  );
});

async function loadInputs(): Promise<{
  authoring: unknown;
  workload: unknown;
  mirrors: unknown;
}> {
  const [authoring, workload, mirrors] = await Promise.all([
    readJson('workloads/ragperf-canary/manifests/execution-bundle-v2.json'),
    readJson('workloads/ragperf-canary/manifests/workload-directory-v1.json'),
    readJson('workloads/ragperf-canary/manifests/scifact-mirrors-v1.json'),
  ]);
  return { authoring, workload, mirrors };
}

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8')) as unknown;
}
