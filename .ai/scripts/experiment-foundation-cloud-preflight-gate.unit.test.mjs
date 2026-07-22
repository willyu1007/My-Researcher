import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildCloudPreflightChildArgs,
  runCloudPreflightGate,
} from './experiment-foundation-cloud-preflight-gate.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('cloud preflight gate launches only the checked-in TypeScript runner with optional local env', () => {
  assert.deepEqual(buildCloudPreflightChildArgs(['--run-id', 'preflight-test']), [
    '--env-file-if-exists=../../.env.local',
    '--loader',
    'ts-node/esm',
    'scripts/run-experiment-foundation-cloud-preflight.ts',
    '--run-id',
    'preflight-test',
  ]);
});

test('cloud preflight runner contains no SDK CreateJob invocation', async () => {
  const source = await fs.readFile(path.join(
    REPO_ROOT,
    'apps/backend/scripts/run-experiment-foundation-cloud-preflight.ts',
  ), 'utf8');
  assert.doesNotMatch(source, /\.createJob\s*\(/);
  assert.doesNotMatch(source, /\.createWorkspace\s*\(/);
  assert.doesNotMatch(source, /\.updateWorkspace\s*\(/);
  assert.doesNotMatch(source, /\.deleteWorkspace\s*\(/);
});

test('cloud preflight gate records repo-local policy evidence as a controlled blocker', async () => {
  const runId = `cloud-preflight-policy-path-negative-${process.pid}`;
  const runRoot = path.join(
    REPO_ROOT,
    '.ai/.tmp/experiment-foundation-productization',
    runId,
  );
  try {
    const exitCode = await runCloudPreflightGate(['--run-id', runId], {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:5432/postgres?schema=my_researcher_dev',
        EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IDENTITY_POLICY_EVIDENCE_PATH:
          path.join(REPO_ROOT, 'package.json'),
      },
      stdio: 'ignore',
    });
    assert.equal(exitCode, 2);
    const summary = JSON.parse(await fs.readFile(path.join(runRoot, 'summary.json'), 'utf8'));
    assert.equal(summary.status, 'blocked');
    assert.equal(
      summary.failure.reason_code,
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_MUST_BE_REPO_EXTERNAL',
    );
    assert.deepEqual(summary.write_census, {
      provider_transport_operations: 0,
      provider_write_requests: 0,
      create_job_calls: 0,
      provider_writes: 0,
      database_writes: 0,
      scientific_writes: 0,
    });
  } finally {
    await fs.rm(runRoot, { recursive: true, force: true });
  }
});

test('cloud preflight gate rejects invalid or contradictory public-resource configuration before provider access', async () => {
  const cases = [
    {
      suffix: 'public-with-id',
      env: {
        EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_MODE: 'public_resource',
        EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_ID: 'must-not-be-used',
      },
      reasonCode: 'ALIYUN_PUBLIC_RESOURCE_ID_FORBIDDEN',
    },
    {
      suffix: 'unknown-mode',
      env: {
        EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_MODE: 'automatic',
        EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_ID: '',
      },
      reasonCode: 'ALIYUN_RESOURCE_MODE_INVALID',
    },
  ];

  for (const scenario of cases) {
    const runId = `cloud-preflight-${scenario.suffix}-${process.pid}`;
    const runRoot = path.join(
      REPO_ROOT,
      '.ai/.tmp/experiment-foundation-productization',
      runId,
    );
    try {
      const exitCode = await runCloudPreflightGate(['--run-id', runId], {
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:5432/postgres?schema=my_researcher_dev',
          ...scenario.env,
        },
        stdio: 'ignore',
      });
      assert.equal(exitCode, 2);
      const summary = JSON.parse(await fs.readFile(path.join(runRoot, 'summary.json'), 'utf8'));
      assert.equal(summary.status, 'blocked');
      assert.equal(summary.failure.reason_code, scenario.reasonCode);
      assert.equal(summary.write_census.provider_transport_operations, 0);
      assert.equal(summary.write_census.provider_writes, 0);
    } finally {
      await fs.rm(runRoot, { recursive: true, force: true });
    }
  }
});
