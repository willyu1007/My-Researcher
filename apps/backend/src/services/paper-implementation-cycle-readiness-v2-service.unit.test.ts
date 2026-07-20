import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  InMemoryPaperImplementationCycleReadinessV2Repository,
  type InMemoryPaperImplementationCycleReadinessV2RepositoryOptions,
  type PaperImplementationCycleReadinessV2Attempt,
  type PaperImplementationCycleReadinessV2Branch,
  type PaperImplementationCycleReadinessV2HeadRun,
} from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
  PaperImplementationCycleReadinessV2ServiceError,
} from './paper-implementation-cycle-readiness-v2-service.js';

const CYCLE_ID = 'validation-cycle-readiness-v2';
const PROJECT_ID = 'implementation-project-readiness-v2';

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function cycle() {
  return {
    validation_cycle_id: CYCLE_ID,
    implementation_project_id: PROJECT_ID,
    lifecycle_status: 'admitted',
    expected_cycle_version: 0,
  };
}

function branch(
  branchKey: string,
  options: {
    sequence?: number;
    headSequence?: number | null;
    withHead?: boolean;
  } = {},
): PaperImplementationCycleReadinessV2Branch {
  const sequence = options.sequence ?? 1;
  const branchId = `branch-${branchKey}`;
  const revisionId = `${branchId}-revision-${sequence}`;
  const withHead = options.withHead ?? true;
  const headSequence = options.headSequence === undefined ? sequence : options.headSequence;
  return {
    branch_id: branchId,
    branch_key: branchKey,
    current_admitted_revision_id: revisionId,
    current_admitted_revision_hash: hash(revisionId),
    current_admitted_revision_sequence: sequence,
    head_revision_id: withHead && headSequence !== null
      ? `${branchId}-revision-${headSequence}`
      : null,
    head_revision_sequence: withHead ? headSequence : null,
    head_run_id: withHead ? `${branchId}-run-${headSequence ?? 'none'}` : null,
    head_run_manifest_hash: withHead ? hash(`${branchId}-manifest-${headSequence}`) : null,
  };
}

function attempt(
  id: string,
  overrides: Partial<PaperImplementationCycleReadinessV2Attempt> = {},
): PaperImplementationCycleReadinessV2Attempt {
  return {
    execution_attempt_id: id,
    attempt_sequence: 1,
    lifecycle_state: 'succeeded',
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    ...overrides,
  };
}

function headRun(
  sourceBranch: PaperImplementationCycleReadinessV2Branch,
  options: {
    runId?: string;
    manifestHash?: string;
    acknowledged?: boolean;
    cellKey?: string;
    attempts?: PaperImplementationCycleReadinessV2Attempt[];
    result?: {
      result_id: string;
      result_content_hash: string;
      execution_attempt_id: string;
      provenance: string;
    } | null;
    revisionId?: string;
    revisionHash?: string;
    revisionSequence?: number;
  } = {},
): PaperImplementationCycleReadinessV2HeadRun & { validation_cycle_id: string } {
  const runId = options.runId ?? sourceBranch.head_run_id;
  const manifestHash = options.manifestHash ?? sourceBranch.head_run_manifest_hash;
  assert.ok(runId);
  assert.ok(manifestHash);
  const cellKey = options.cellKey ?? `${runId}-cell`;
  return {
    validation_cycle_id: CYCLE_ID,
    run_id: runId,
    run_manifest_hash: manifestHash,
    external_pi_branch_id: sourceBranch.branch_id,
    external_pi_work_order_revision_id: options.revisionId
      ?? sourceBranch.current_admitted_revision_id,
    external_pi_work_order_revision_hash: options.revisionHash
      ?? sourceBranch.current_admitted_revision_hash,
    external_pi_revision_sequence: options.revisionSequence
      ?? sourceBranch.current_admitted_revision_sequence,
    head_acknowledged: options.acknowledged ?? true,
    cells: [{
      ordinal: 1,
      run_cell_id: `${runId}-cell-1`,
      cell_key: cellKey,
      attempts: options.attempts ?? [],
      complete_result: options.result ?? null,
    }],
  };
}

function service(options: Omit<InMemoryPaperImplementationCycleReadinessV2RepositoryOptions, 'cycles'>) {
  return new PaperImplementationCycleReadinessV2Service({
    repository: new InMemoryPaperImplementationCycleReadinessV2Repository({
      cycles: [cycle()],
      ...options,
    }),
  });
}

test('orders a two-branch current-effective scope and hashes identical reads deterministically', async () => {
  const alpha = branch('alpha');
  const zeta = branch('zeta');
  const evaluator = service({
    branches: { [CYCLE_ID]: [zeta, alpha] },
    runs: [
      headRun(zeta, {
        attempts: [
          attempt('zeta-attempt-2', { attempt_sequence: 2 }),
          attempt('zeta-attempt-1', { attempt_sequence: 1 }),
        ],
      }),
      headRun(alpha),
    ],
  });

  const first = await evaluator.evaluate(CYCLE_ID);
  const second = await evaluator.evaluate(CYCLE_ID);

  assert.deepEqual(second, first);
  assert.equal(first.status, 'ready_no_evidence');
  assert.deepEqual(
    first.watermark.ordered_branches.map((entry) => [entry.ordinal, entry.branch_key]),
    [[1, 'alpha'], [2, 'zeta']],
  );
  assert.deepEqual(
    first.watermark.ordered_branches[1]?.ordered_cells[0]?.ordered_attempts
      .map((entry) => entry.execution_attempt_id),
    ['zeta-attempt-1', 'zeta-attempt-2'],
  );
  assert.match(first.watermark.closure_input_hash, /^sha256:[a-f0-9]{64}$/u);
});

test('keeps a no-current-head branch visible and blocks with BRANCH_HEAD_NOT_FROZEN', async () => {
  const current = branch('main', { sequence: 2, headSequence: 1 });
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'blocked');
  assert.deepEqual(evaluation.ordered_blockers, [{
    ordinal: 1,
    code: 'BRANCH_HEAD_NOT_FROZEN',
    branch_id: current.branch_id,
  }]);
  assert.equal(evaluation.watermark.ordered_branches[0]?.effective_head_run_id, null);
  assert.equal(evaluation.watermark.ordered_branches[0]?.head_blocker, 'BRANCH_HEAD_NOT_FROZEN');
  assert.deepEqual(evaluation.watermark.ordered_branches[0]?.ordered_cells, []);
});

test('does not expose a frozen PI head before the exact EF acknowledgement is durable', async () => {
  const current = branch('main');
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [headRun(current, { acknowledged: false })],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'blocked');
  assert.equal(evaluation.watermark.ordered_branches[0]?.effective_head_run_id, null);
  assert.deepEqual(evaluation.ordered_blockers.map((blocker) => blocker.code), [
    'BRANCH_HEAD_NOT_FROZEN',
  ]);
});

test('blocks on an active real-provider Attempt from a non-head Run', async () => {
  const current = branch('main', { sequence: 2 });
  const activeHistoricalAttempt = attempt('historical-active-real', {
    lifecycle_state: 'running',
    execution_mode: 'real_provider',
    provenance: 'real_provider',
  });
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [
      headRun(current, { cellKey: 'current-head-cell' }),
      headRun(current, {
        runId: 'historical-non-head-run',
        manifestHash: hash('historical-non-head-manifest'),
        cellKey: 'historical-cell',
        attempts: [activeHistoricalAttempt],
        revisionId: 'branch-main-revision-1',
        revisionHash: hash('branch-main-revision-1'),
        revisionSequence: 1,
      }),
    ],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'blocked');
  assert.equal(evaluation.watermark.active_real_attempt_count, 1);
  assert.deepEqual(evaluation.ordered_blockers.map((blocker) => blocker.code), [
    'CYCLE_ACTIVE_REAL_ATTEMPT',
  ]);
  assert.deepEqual(
    evaluation.watermark.ordered_branches[0]?.ordered_cells.map((cell) => cell.cell_key),
    ['current-head-cell'],
  );
});

test('does not count a non-terminal simulation Attempt as active real execution', async () => {
  const current = branch('main');
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [headRun(current, {
      attempts: [attempt('simulation-running', { lifecycle_state: 'running' })],
    })],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'ready_no_evidence');
  assert.equal(evaluation.watermark.active_real_attempt_count, 0);
  assert.deepEqual(evaluation.ordered_blockers, []);
});

test('adds CYCLE_ALREADY_CLOSED when the v2 closure row exists', async () => {
  const current = branch('main');
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [headRun(current)],
    closures: [{
      closure_id: 'closure-1',
      validation_cycle_id: CYCLE_ID,
      cycle_version_at_closure: 0,
      closure_input_hash: hash('closed-watermark'),
    }],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'blocked');
  assert.deepEqual(evaluation.ordered_blockers.map((blocker) => blocker.code), [
    'CYCLE_ALREADY_CLOSED',
  ]);
});

test('a current-head eligible REU flips readiness to ready_with_evidence', async () => {
  const current = branch('main');
  const realAttempt = attempt('real-succeeded', {
    lifecycle_state: 'succeeded',
    execution_mode: 'real_provider',
    provenance: 'real_provider',
  });
  const currentRun = headRun(current, {
    attempts: [realAttempt],
    result: {
      result_id: 'result-1',
      result_content_hash: hash('result-1'),
      execution_attempt_id: realAttempt.execution_attempt_id,
      provenance: 'real_provider',
    },
  });
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [currentRun],
    evidence_units: [{
      validation_cycle_id: CYCLE_ID,
      branch_id: current.branch_id,
      work_order_revision_id: current.current_admitted_revision_id,
      work_order_revision_hash: current.current_admitted_revision_hash,
      branch_revision_sequence: current.current_admitted_revision_sequence,
      run_id: currentRun.run_id,
      run_manifest_hash: currentRun.run_manifest_hash,
      run_evidence_unit_id: 'reu-1',
      content_hash: hash('reu-1'),
    }],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'ready_with_evidence');
  assert.equal(evaluation.eligible_run_evidence_unit_count, 1);
  assert.equal(
    evaluation.watermark.ordered_branches[0]?.ordered_cells[0]?.eligibility_code,
    null,
  );
  assert.deepEqual(
    evaluation.watermark.ordered_branches[0]?.ordered_cells[0]?.complete_result_ref,
    { result_id: 'result-1', result_content_hash: hash('result-1') },
  );
  assert.deepEqual(
    evaluation.watermark.ordered_branches[0]?.eligible_run_evidence_unit_refs,
    [{ run_evidence_unit_id: 'reu-1', content_hash: hash('reu-1') }],
  );
});

test('excludes superseded non-head Run cells and evidence from watermark membership', async () => {
  const current = branch('main', { sequence: 2 });
  const currentRun = headRun(current, { cellKey: 'effective-cell' });
  const historicalRun = headRun(current, {
    runId: 'superseded-run',
    manifestHash: hash('superseded-run-manifest'),
    cellKey: 'superseded-cell',
    revisionId: 'branch-main-revision-1',
    revisionHash: hash('branch-main-revision-1'),
    revisionSequence: 1,
  });
  const evaluator = service({
    branches: { [CYCLE_ID]: [current] },
    runs: [historicalRun, currentRun],
    evidence_units: [{
      validation_cycle_id: CYCLE_ID,
      branch_id: current.branch_id,
      work_order_revision_id: historicalRun.external_pi_work_order_revision_id,
      work_order_revision_hash: historicalRun.external_pi_work_order_revision_hash,
      branch_revision_sequence: historicalRun.external_pi_revision_sequence,
      run_id: historicalRun.run_id,
      run_manifest_hash: historicalRun.run_manifest_hash,
      run_evidence_unit_id: 'historical-reu',
      content_hash: hash('historical-reu'),
    }],
  });

  const evaluation = await evaluator.evaluate(CYCLE_ID);

  assert.equal(evaluation.status, 'ready_no_evidence');
  assert.equal(evaluation.eligible_run_evidence_unit_count, 0);
  assert.deepEqual(
    evaluation.watermark.ordered_branches[0]?.ordered_cells.map((cell) => cell.cell_key),
    ['effective-cell'],
  );
  assert.deepEqual(
    evaluation.watermark.ordered_branches[0]?.eligible_run_evidence_unit_refs,
    [],
  );
});

test('throws a typed error when no admitted branch can satisfy watermark minItems', async () => {
  const evaluator = service({ branches: { [CYCLE_ID]: [] } });

  await assert.rejects(
    () => evaluator.evaluate(CYCLE_ID),
    (error: unknown) => error instanceof PaperImplementationCycleReadinessV2ServiceError
      && error.reasonCode === 'VALIDATION_CYCLE_HAS_NO_ADMITTED_BRANCHES',
  );
});
