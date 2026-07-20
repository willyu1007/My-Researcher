import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type { CloseValidationCycleV2Request } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2CycleClosure,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  InMemoryPaperImplementationCycleReadinessV2Repository,
  type InMemoryPaperImplementationCycleReadinessV2RepositoryOptions,
  type PaperImplementationCycleReadinessV2Attempt,
  type PaperImplementationCycleReadinessV2Branch,
} from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';
import {
  InMemoryPaperImplementationValidationCycleClosureV2Repository,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import { PaperImplementationCycleReadinessV2Service } from './paper-implementation-cycle-readiness-v2-service.js';
import { PaperImplementationValidationCycleClosureV2Service } from './paper-implementation-validation-cycle-closure-v2-service.js';

const CYCLE_ID = 'cycle-closure-v2';
const PROJECT_ID = 'project-closure-v2';
const NOW = '2026-07-21T08:00:00.000Z';

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function branch(withHead = true): PaperImplementationCycleReadinessV2Branch {
  return {
    branch_id: 'branch-main',
    branch_key: 'main',
    current_admitted_revision_id: 'revision-main-1',
    current_admitted_revision_hash: hash('revision-main-1'),
    current_admitted_revision_sequence: 1,
    head_revision_id: withHead ? 'revision-main-1' : null,
    head_revision_sequence: withHead ? 1 : null,
    head_run_id: withHead ? 'run-main-1' : null,
    head_run_manifest_hash: withHead ? hash('run-main-1') : null,
  };
}

function attempt(
  overrides: Partial<PaperImplementationCycleReadinessV2Attempt> = {},
): PaperImplementationCycleReadinessV2Attempt {
  return {
    execution_attempt_id: 'attempt-simulation-1',
    attempt_sequence: 1,
    lifecycle_state: 'succeeded',
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    ...overrides,
  };
}

function readinessOptions(input: {
  withHead?: boolean;
  attempts?: PaperImplementationCycleReadinessV2Attempt[];
  evidence?: boolean;
} = {}): InMemoryPaperImplementationCycleReadinessV2RepositoryOptions {
  const currentBranch = branch(input.withHead ?? true);
  return {
    cycles: [{
      validation_cycle_id: CYCLE_ID,
      implementation_project_id: PROJECT_ID,
      lifecycle_status: 'admitted',
      expected_cycle_version: 0,
    }],
    branches: { [CYCLE_ID]: [currentBranch] },
    runs: currentBranch.head_run_id === null ? [] : [{
      validation_cycle_id: CYCLE_ID,
      run_id: currentBranch.head_run_id,
      run_manifest_hash: currentBranch.head_run_manifest_hash!,
      external_pi_branch_id: currentBranch.branch_id,
      external_pi_work_order_revision_id: currentBranch.current_admitted_revision_id,
      external_pi_work_order_revision_hash: currentBranch.current_admitted_revision_hash,
      external_pi_revision_sequence: currentBranch.current_admitted_revision_sequence,
      head_acknowledged: true,
      cells: [{
        ordinal: 1,
        run_cell_id: 'run-cell-main-1',
        cell_key: 'main-cell',
        attempts: input.attempts ?? [attempt()],
        complete_result: null,
      }],
    }],
    evidence_units: input.evidence ? [{
      validation_cycle_id: CYCLE_ID,
      branch_id: currentBranch.branch_id,
      work_order_revision_id: currentBranch.current_admitted_revision_id,
      work_order_revision_hash: currentBranch.current_admitted_revision_hash,
      branch_revision_sequence: currentBranch.current_admitted_revision_sequence,
      run_id: currentBranch.head_run_id!,
      run_manifest_hash: currentBranch.head_run_manifest_hash!,
      run_evidence_unit_id: 'reu-main-1',
      content_hash: hash('reu-main-1'),
    }] : [],
  };
}

async function fixture(input: {
  enabled?: boolean;
  readiness?: InMemoryPaperImplementationCycleReadinessV2RepositoryOptions;
} = {}) {
  const readinessRepository = new InMemoryPaperImplementationCycleReadinessV2Repository(
    input.readiness ?? readinessOptions(),
  );
  const repository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository,
  });
  let sequence = 0;
  const service = new PaperImplementationValidationCycleClosureV2Service({
    repository,
    enabled: () => input.enabled ?? true,
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => NOW,
  });
  const evaluation = await new PaperImplementationCycleReadinessV2Service({
    repository: readinessRepository,
  }).evaluate(CYCLE_ID);
  const request: CloseValidationCycleV2Request = {
    validation_cycle_id: CYCLE_ID,
    expected_cycle_version: evaluation.watermark.expected_cycle_version,
    expected_closure_input_hash: evaluation.watermark.closure_input_hash,
    closure_kind: 'control_flow_validated_no_paper_evidence',
    accepted_proposal_id: null,
    expected_proposal_hash: null,
    corrected_scientific_disposition: null,
    idempotency_key: 'close-cycle-main-v1',
  };
  return { repository, service, request, evaluation };
}

function reason(error: unknown): string | undefined {
  return error instanceof AppError && typeof error.details?.reason_code === 'string'
    ? error.details.reason_code
    : undefined;
}

test('default-off closure lane rejects before any closure or outbox write', async () => {
  const context = await fixture({ enabled: false });
  await assert.rejects(
    context.service.close(context.request),
    (error) => reason(error) === 'PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED',
  );
  assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
});

test('control-only closure atomically writes one exact server-hashed closure and outbox event', async () => {
  const context = await fixture();
  const response = await context.service.close(context.request);
  const snapshot = context.repository.snapshot();

  assert.equal(snapshot.closures.length, 1);
  assert.equal(snapshot.outboxes.length, 1);
  assert.deepEqual(snapshot.closures[0]?.closure, response.closure);
  assert.equal(response.closure.closure_watermark.ordered_branches.length, 1);
  assert.equal(response.closure.scientific_disposition, null);
  assert.equal(response.closure.selected_exit_key, null);
  const { closure_snapshot_hash: storedClosureHash, ...closureHashInput } = response.closure;
  assert.equal(
    storedClosureHash,
    serverHashPaperImplementationV2CycleClosure(closureHashInput),
  );
  const outbox = snapshot.outboxes[0]!;
  assert.equal(
    outbox.event.payload_hash,
    serverHashExperimentV2EventPayload(
      outbox.event.event_type,
      outbox.event.schema_version,
      outbox.event.payload,
    ),
  );
  assert.equal(outbox.event_envelope_hash, serverHashExperimentV2EventEnvelope(outbox.event));
  assert.deepEqual(outbox.event.payload, {
    event_schema: 'ValidationCycleClosed@v1',
    validation_cycle_id: CYCLE_ID,
    closure_id: response.closure.closure_id,
    closure_snapshot_hash: response.closure.closure_snapshot_hash,
    closure_kind: 'control_flow_validated_no_paper_evidence',
    scientific_disposition: null,
    closure_input_hash: context.request.expected_closure_input_hash,
  });
});

test('readiness blockers and CAS drift reject with zero writes', async (t) => {
  await t.test('branch head not frozen', async () => {
    const context = await fixture({ readiness: readinessOptions({ withHead: false }) });
    await assert.rejects(
      context.service.close(context.request),
      (error) => reason(error) === 'BRANCH_HEAD_NOT_FROZEN',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });

  await t.test('Cycle-wide active real Attempt', async () => {
    const context = await fixture({ readiness: readinessOptions({
      attempts: [attempt({
        execution_attempt_id: 'active-real-1',
        lifecycle_state: 'running',
        execution_mode: 'real_provider',
        provenance: 'real_provider',
      })],
    }) });
    await assert.rejects(
      context.service.close(context.request),
      (error) => reason(error) === 'CYCLE_ACTIVE_REAL_ATTEMPT',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });

  await t.test('expected input hash drift', async () => {
    const context = await fixture();
    await assert.rejects(
      context.service.close({ ...context.request, expected_closure_input_hash: hash('drift') }),
      (error) => reason(error) === 'CYCLE_CLOSURE_SCOPE_DRIFT',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });

  await t.test('expected Cycle version drift', async () => {
    const context = await fixture();
    await assert.rejects(
      context.service.close({ ...context.request, expected_cycle_version: 1 }),
      (error) => reason(error) === 'CYCLE_CLOSURE_SCOPE_DRIFT',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });
});

test('exact replay is idempotent while changed replay and later closure are rejected', async () => {
  const context = await fixture();
  const first = await context.service.close(context.request);
  const replay = await context.service.close(context.request);
  assert.deepEqual(replay, first);
  assert.equal(context.repository.snapshot().closures.length, 1);
  assert.equal(context.repository.snapshot().outboxes.length, 1);

  await assert.rejects(
    context.service.close({ ...context.request, idempotency_key: 'different-close-key' }),
    (error) => reason(error) === 'CYCLE_ALREADY_CLOSED',
  );
  await assert.rejects(
    context.service.close({ ...context.request, expected_closure_input_hash: hash('changed') }),
    (error) => reason(error) === 'CYCLE_ALREADY_CLOSED',
  );
  assert.equal(context.repository.snapshot().closures.length, 1);
  assert.equal(context.repository.snapshot().outboxes.length, 1);
});

test('scientific closure remains production-disabled and control-only cannot discard eligible REU', async () => {
  const scientific = await fixture();
  await assert.rejects(
    scientific.service.close({
      ...scientific.request,
      closure_kind: 'scientific_evidence_assessed',
      accepted_proposal_id: 'proposal-1',
      expected_proposal_hash: hash('proposal-1'),
      corrected_scientific_disposition: 'positive',
    }),
    (error) => reason(error) === 'PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED'
      && error instanceof AppError
      && error.message.includes('not implemented'),
  );
  assert.deepEqual(scientific.repository.snapshot(), { closures: [], outboxes: [] });

  const evidence = await fixture({ readiness: readinessOptions({ evidence: true }) });
  await assert.rejects(
    evidence.service.close(evidence.request),
    (error) => reason(error) === 'CLOSURE_PROPOSAL_STALE',
  );
  assert.deepEqual(evidence.repository.snapshot(), { closures: [], outboxes: [] });
});

