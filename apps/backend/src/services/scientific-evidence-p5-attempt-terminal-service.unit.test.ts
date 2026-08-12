import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertScientificEvidenceP5AttemptActiveV1,
  assertScientificEvidenceP5AttemptStageCompletedV1,
  claimScientificEvidenceP5AttemptStageV1,
  readScientificEvidenceP5AttemptTerminalV1,
  recordScientificEvidenceP5AttemptTerminalV1,
  resolveScientificEvidenceP5AttemptStageClaimPath,
  resolveScientificEvidenceP5AttemptStageCompletionPath,
  resolveScientificEvidenceP5AttemptExecutionLockPath,
  resolveScientificEvidenceP5AttemptTerminalPath,
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
} from './scientific-evidence-p5-attempt-terminal-service.js';

const binding = Object.freeze({
  p5_attempt_id: 't136-p5-scifact-attempt-10',
  package_hash: `sha256:${'a'.repeat(64)}`,
});

test('atomically terminalizes an attempt and rejects every later stage', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-terminal-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const terminalPath = resolveScientificEvidenceP5AttemptTerminalPath({
    manifest_directory: directory,
    binding,
  });

  await assert.doesNotReject(() => assertScientificEvidenceP5AttemptActiveV1({
    terminal_path: terminalPath,
    binding,
  }));
  const recorded = await recordScientificEvidenceP5AttemptTerminalV1({
    terminal_path: terminalPath,
    binding,
    failed_stage: 'credential_integrity',
    reason_code: 'T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID',
    terminal_at: '2026-08-12T01:00:00.000Z',
  });
  assert.equal(recorded.created, true);
  await assert.rejects(
    () => assertScientificEvidenceP5AttemptActiveV1({
      terminal_path: terminalPath,
      binding,
    }),
    /T136_P5_ATTEMPT_TERMINAL_CREDENTIAL_INTEGRITY_/
  );
});

test('an exclusive stage claim permits only one concurrent operation', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-race-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  let operationCount = 0;
  let releaseOperation: (() => void) | undefined;
  const operationGate = new Promise<void>((resolve) => {
    releaseOperation = resolve;
  });
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'credential_integrity' as const,
  };
  const first = runScientificEvidenceP5ClaimedStageV1({
    ...input,
    operation: async () => {
      operationCount += 1;
      await operationGate;
    },
  });
  while (operationCount === 0) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      ...input,
      operation: async () => { operationCount += 1; },
    }),
    /T136_P5_ATTEMPT_EXECUTION_BUSY_CREDENTIAL_INTEGRITY/,
  );
  releaseOperation?.();
  await first;
  assert.equal(operationCount, 1);
  await fs.access(resolveScientificEvidenceP5AttemptStageCompletionPath(input));
});

for (const [upstream, downstream] of [
  ['credential_integrity', 'credential_qualification'],
  ['credential_qualification', 'live'],
  ['live', 'close'],
] as const) {
  test(`an active ${upstream} stage fences concurrent ${downstream}`, async (context) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-cross-stage-race-'));
    context.after(() => fs.rm(directory, { recursive: true, force: true }));
    const completedPrerequisites = {
      credential_integrity: [] as const,
      credential_qualification: ['credential_integrity'] as const,
      live: ['credential_integrity', 'credential_qualification'] as const,
    };
    for (const prerequisite of completedPrerequisites[upstream]) {
      await runScientificEvidenceP5ClaimedStageV1({
        manifest_directory: directory,
        binding,
        stage: prerequisite,
        operation: async () => undefined,
      });
    }
    let upstreamOperationCount = 0;
    let downstreamOperationCount = 0;
    let releaseOperation: (() => void) | undefined;
    const operationGate = new Promise<void>((resolve) => { releaseOperation = resolve; });
    const active = runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage: upstream,
      operation: async () => {
        upstreamOperationCount += 1;
        await operationGate;
      },
    });
    while (upstreamOperationCount === 0) await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(
      () => runScientificEvidenceP5ClaimedStageV1({
        manifest_directory: directory,
        binding,
        stage: downstream,
        operation: async () => { downstreamOperationCount += 1; },
      }),
      new RegExp(`T136_P5_ATTEMPT_EXECUTION_BUSY_${upstream.toUpperCase()}`),
    );
    assert.equal(downstreamOperationCount, 0);
    await assert.rejects(
      () => fs.access(resolveScientificEvidenceP5AttemptStageClaimPath({
        manifest_directory: directory,
        binding,
        stage: downstream,
      })),
      { code: 'ENOENT' },
    );
    assert.equal(await readScientificEvidenceP5AttemptTerminalV1({
      terminal_path: resolveScientificEvidenceP5AttemptTerminalPath({
        manifest_directory: directory,
        binding,
      }),
      binding,
    }), null);
    releaseOperation?.();
    await active;
    assert.equal(upstreamOperationCount, 1);
    await assert.rejects(
      () => fs.access(resolveScientificEvidenceP5AttemptExecutionLockPath({
        manifest_directory: directory,
        binding,
      })),
      { code: 'ENOENT' },
    );
  });
}

test('a concurrent downstream observes the upstream terminal after the active stage fails', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-cross-stage-failure-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  let releaseOperation: (() => void) | undefined;
  const operationGate = new Promise<void>((resolve) => { releaseOperation = resolve; });
  let upstreamOperationCount = 0;
  let downstreamOperationCount = 0;
  const active = runScientificEvidenceP5ClaimedStageV1({
    manifest_directory: directory,
    binding,
    stage: 'credential_integrity',
    operation: async () => {
      upstreamOperationCount += 1;
      await operationGate;
      throw new Error('T136_P5_CREDENTIAL_FORMAT_INVALID');
    },
  });
  while (upstreamOperationCount === 0) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage: 'credential_qualification',
      operation: async () => { downstreamOperationCount += 1; },
    }),
    /T136_P5_ATTEMPT_EXECUTION_BUSY_CREDENTIAL_INTEGRITY/,
  );
  releaseOperation?.();
  await assert.rejects(() => active, /T136_P5_CREDENTIAL_FORMAT_INVALID/);
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage: 'credential_qualification',
      operation: async () => { downstreamOperationCount += 1; },
    }),
    /T136_P5_ATTEMPT_TERMINAL_CREDENTIAL_INTEGRITY/,
  );
  assert.equal(downstreamOperationCount, 0);
});

test('a crash-like orphan attempt lock is never reclaimed automatically', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-attempt-lock-orphan-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const lockPath = resolveScientificEvidenceP5AttemptExecutionLockPath({
    manifest_directory: directory,
    binding,
  });
  await fs.writeFile(lockPath, `${JSON.stringify({
    schema_version: 'ScientificEvidenceP5AttemptExecutionLock@v1',
    status: 'active',
    ...binding,
    stage: 'live',
    acquired_at: '2026-08-12T01:00:00.000Z',
  })}\n`);
  let operationCount = 0;
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage: 'close',
      operation: async () => { operationCount += 1; },
    }),
    /T136_P5_ATTEMPT_EXECUTION_BUSY_LIVE/,
  );
  assert.equal(operationCount, 0);
  await fs.access(lockPath);
});

test('an execution-lock unlink failure terminalizes a completed operation', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-attempt-unlock-failure-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'credential_integrity' as const,
  };
  const lockPath = resolveScientificEvidenceP5AttemptExecutionLockPath(input);
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      ...input,
      operation: async () => {
        await fs.unlink(lockPath);
        await fs.mkdir(lockPath);
      },
    }),
    /T136_P5_ATTEMPT_EXECUTION_LOCK_RELEASE_FAILED/,
  );
  const terminal = await readScientificEvidenceP5AttemptTerminalV1({
    terminal_path: resolveScientificEvidenceP5AttemptTerminalPath(input),
    binding,
  });
  assert.equal(terminal?.failed_stage, 'credential_integrity');
  assert.equal(terminal?.reason_code, 'T136_P5_ATTEMPT_EXECUTION_LOCK_RELEASE_FAILED');
});

test('operation and unlock failures preserve the first terminal creation signal', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-attempt-double-failure-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'credential_integrity' as const,
  };
  const lockPath = resolveScientificEvidenceP5AttemptExecutionLockPath(input);
  let terminalCreated = 0;
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      ...input,
      on_terminalized: (created) => {
        terminalCreated = Math.max(terminalCreated, created ? 1 : 0);
      },
      operation: async () => {
        await fs.unlink(lockPath);
        await fs.mkdir(lockPath);
        throw new Error('T136_P5_CREDENTIAL_FORMAT_INVALID');
      },
    }),
    /T136_P5_ATTEMPT_EXECUTION_LOCK_RELEASE_FAILED/,
  );
  assert.equal(terminalCreated, 1);
  const terminal = await readScientificEvidenceP5AttemptTerminalV1({
    terminal_path: resolveScientificEvidenceP5AttemptTerminalPath(input),
    binding,
  });
  assert.equal(terminal?.reason_code, 'T136_P5_CREDENTIAL_FORMAT_INVALID');
});

test('the centralized stage chain admits only integrity then qualification then live then close', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-chain-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const observed: string[] = [];
  for (const stage of [
    'credential_integrity',
    'credential_qualification',
    'live',
    'close',
  ] as const) {
    const result = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage,
      operation: async () => {
        observed.push(stage);
        return `${stage}:passed`;
      },
    });
    assert.equal(result, `${stage}:passed`);
    await assertScientificEvidenceP5AttemptStageCompletedV1({
      completion_path: resolveScientificEvidenceP5AttemptStageCompletionPath({
        manifest_directory: directory,
        binding,
        stage,
      }),
      claim_path: resolveScientificEvidenceP5AttemptStageClaimPath({
        manifest_directory: directory,
        binding,
        stage,
      }),
      binding,
      stage,
    });
  }
  assert.deepEqual(observed, [
    'credential_integrity',
    'credential_qualification',
    'live',
    'close',
  ]);
});

test('a failed stage terminalizes before a dependent stage can execute', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-failure-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage: 'credential_integrity',
      operation: async () => { throw new Error('T136_P5_CREDENTIAL_FORMAT_INVALID'); },
    }),
    /T136_P5_CREDENTIAL_FORMAT_INVALID/,
  );
  let dependentOperationCount = 0;
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: directory,
      binding,
      stage: 'credential_qualification',
      operation: async () => { dependentOperationCount += 1; },
    }),
    /T136_P5_ATTEMPT_TERMINAL_CREDENTIAL_INTEGRITY/,
  );
  assert.equal(dependentOperationCount, 0);
});

test('an out-of-order stage call is permanently consumed and terminalized', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-order-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'credential_qualification' as const,
  };
  let operationCount = 0;
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      ...input,
      operation: async () => { operationCount += 1; },
    }),
    /T136_P5_ATTEMPT_STAGE_NOT_CLAIMED_CREDENTIAL_INTEGRITY/,
  );
  assert.equal(operationCount, 0);
  await fs.access(resolveScientificEvidenceP5AttemptStageClaimPath(input));
  const terminal = await readScientificEvidenceP5AttemptTerminalV1({
    terminal_path: resolveScientificEvidenceP5AttemptTerminalPath(input),
    binding,
  });
  assert.equal(terminal?.failed_stage, 'credential_qualification');
  assert.equal(
    terminal?.reason_code,
    'T136_P5_ATTEMPT_STAGE_NOT_CLAIMED_CREDENTIAL_INTEGRITY',
  );
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      ...input,
      operation: async () => { operationCount += 1; },
    }),
    /T136_P5_ATTEMPT_TERMINAL_CREDENTIAL_QUALIFICATION/,
  );
  assert.equal(operationCount, 0);
});

test('a completion record is accepted only with its matching claim', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-binding-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'credential_integrity' as const,
  };
  await fs.writeFile(
    resolveScientificEvidenceP5AttemptStageCompletionPath(input),
    `${JSON.stringify({
      schema_version: 'ScientificEvidenceP5AttemptStageCompletion@v1',
      status: 'completed',
      ...binding,
      stage: input.stage,
      completed_at: '2026-08-12T01:00:00.000Z',
    })}\n`,
  );
  await assert.rejects(
    () => assertScientificEvidenceP5AttemptStageCompletedV1({
      completion_path: resolveScientificEvidenceP5AttemptStageCompletionPath(input),
      claim_path: resolveScientificEvidenceP5AttemptStageClaimPath(input),
      binding,
      stage: input.stage,
    }),
    /T136_P5_ATTEMPT_STAGE_NOT_CLAIMED_CREDENTIAL_INTEGRITY/,
  );
});

test('rejects a completion timestamp that precedes its matching claim', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-time-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'credential_integrity' as const,
  };
  await claimScientificEvidenceP5AttemptStageV1({
    claim_path: resolveScientificEvidenceP5AttemptStageClaimPath(input),
    binding,
    stage: input.stage,
    claimed_at: '2026-08-12T01:00:01.000Z',
  });
  await fs.writeFile(
    resolveScientificEvidenceP5AttemptStageCompletionPath(input),
    `${JSON.stringify({
      schema_version: 'ScientificEvidenceP5AttemptStageCompletion@v1',
      status: 'completed',
      ...binding,
      stage: input.stage,
      completed_at: '2026-08-12T01:00:00.000Z',
    })}\n`,
  );
  await assert.rejects(
    () => assertScientificEvidenceP5AttemptStageCompletedV1({
      completion_path: resolveScientificEvidenceP5AttemptStageCompletionPath(input),
      claim_path: resolveScientificEvidenceP5AttemptStageClaimPath(input),
      binding,
      stage: input.stage,
    }),
    /T136_P5_ATTEMPT_STAGE_COMPLETION_PRECEDES_CLAIM_CREDENTIAL_INTEGRITY/,
  );
});

test('a crash-like orphan claim is never reclaimed', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-stage-orphan-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    manifest_directory: directory,
    binding,
    stage: 'live' as const,
  };
  await claimScientificEvidenceP5AttemptStageV1({
    claim_path: resolveScientificEvidenceP5AttemptStageClaimPath(input),
    binding,
    stage: input.stage,
  });
  let operationCount = 0;
  await assert.rejects(
    () => runScientificEvidenceP5ClaimedStageV1({
      ...input,
      operation: async () => { operationCount += 1; },
    }),
    /T136_P5_ATTEMPT_STAGE_ALREADY_CLAIMED_LIVE/,
  );
  assert.equal(operationCount, 0);
});

test('concurrent terminal writes keep exactly one immutable first record', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-terminal-race-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const terminalPath = resolveScientificEvidenceP5AttemptTerminalPath({
    manifest_directory: directory,
    binding,
  });
  const outcomes = await Promise.all([
    recordScientificEvidenceP5AttemptTerminalV1({
      terminal_path: terminalPath,
      binding,
      failed_stage: 'credential_integrity',
      reason_code: 'T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID',
      terminal_at: '2026-08-12T01:00:00.000Z',
    }),
    recordScientificEvidenceP5AttemptTerminalV1({
      terminal_path: terminalPath,
      binding,
      failed_stage: 'credential_qualification',
      reason_code: 'T136_P5_QUALIFICATION_WORKSPACE_ID_MISSING',
      terminal_at: '2026-08-12T01:00:01.000Z',
    }),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.created).length, 1);
  assert.equal(outcomes.filter((outcome) => !outcome.created).length, 1);
  const persisted = await readScientificEvidenceP5AttemptTerminalV1({
    terminal_path: terminalPath,
    binding,
  });
  assert.ok(persisted);
  assert.deepEqual(outcomes.map((outcome) => outcome.terminal), [persisted, persisted]);
});

test('rejects a terminal record copied from another package', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 't136-terminal-bind-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const terminalPath = resolveScientificEvidenceP5AttemptTerminalPath({
    manifest_directory: directory,
    binding,
  });
  await recordScientificEvidenceP5AttemptTerminalV1({
    terminal_path: terminalPath,
    binding,
    failed_stage: 'credential_qualification',
    reason_code: 'T136_P5_QUALIFICATION_WORKSPACE_ID_MISSING',
    terminal_at: '2026-08-12T01:00:00.000Z',
  });
  await assert.rejects(
    () => readScientificEvidenceP5AttemptTerminalV1({
      terminal_path: terminalPath,
      binding: { ...binding, package_hash: `sha256:${'b'.repeat(64)}` },
    }),
    /T136_P5_ATTEMPT_RECORD_BINDING_INVALID/,
  );
});

test('persists only stable reason codes, never arbitrary error text', () => {
  assert.equal(
    scientificEvidenceP5TerminalReasonCode(
      new Error('T136_P5_QUALIFICATION_WORKSPACE_ID_MISMATCH: provider detail'),
      'T136_P5_CREDENTIAL_QUALIFICATION_FAILED',
    ),
    'T136_P5_QUALIFICATION_WORKSPACE_ID_MISMATCH',
  );
  assert.equal(
    scientificEvidenceP5TerminalReasonCode(
      new Error('arbitrary provider response'),
      'T136_P5_CREDENTIAL_QUALIFICATION_FAILED',
    ),
    'T136_P5_CREDENTIAL_QUALIFICATION_FAILED',
  );
});
