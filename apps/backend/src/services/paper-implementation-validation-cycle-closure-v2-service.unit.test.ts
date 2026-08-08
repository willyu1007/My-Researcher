import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type { CloseValidationCycleV2Request } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import type {
  ScientificComparisonRelationV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import type {
  PaperImplementationScientificClosureProposalV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
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
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationAdmittedScientificClosureProposalV1,
  type PaperImplementationScientificClosureEvidenceAuthorityV1,
  type PaperImplementationValidationCycleClosureV2Repository,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import { PaperImplementationCycleReadinessV2Service } from './paper-implementation-cycle-readiness-v2-service.js';
import { PaperImplementationValidationCycleClosureV2Service } from './paper-implementation-validation-cycle-closure-v2-service.js';

const CYCLE_ID = 'cycle-closure-v2';
const PROJECT_ID = 'project-closure-v2';
const NOW = '2026-07-21T08:00:00.000Z';

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function runtimeHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
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
  lifecycleStatus?: string;
} = {}): InMemoryPaperImplementationCycleReadinessV2RepositoryOptions {
  const currentBranch = branch(input.withHead ?? true);
  return {
    cycles: [{
      validation_cycle_id: CYCLE_ID,
      implementation_project_id: PROJECT_ID,
      lifecycle_status: input.lifecycleStatus ?? 'admitted',
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
  const service = new PaperImplementationValidationCycleClosureV2Service({
    repository,
    enabled: () => input.enabled ?? true,
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
    idempotency_key: 'close-cycle-main-v1',
  };
  return { repository, service, request, evaluation };
}

async function scientificFixture(
  relation: ScientificComparisonRelationV1,
  options: {
    primaryFactCount?: number;
    proposalWatermarkHash?: string;
    proposalEvidenceRefs?: PaperImplementationScientificClosureProposalV1[
      'ordered_evidence_refs'
    ];
  } = {},
) {
  const readinessRepository = new InMemoryPaperImplementationCycleReadinessV2Repository(
    readinessOptions({ evidence: true }),
  );
  const evaluation = await new PaperImplementationCycleReadinessV2Service({
    repository: readinessRepository,
  }).evaluate(CYCLE_ID);
  const evidenceRefs = evaluation.watermark.ordered_branches.flatMap((entry) => (
    entry.eligible_run_evidence_unit_refs
  ));
  const primaryFactId = 'comparison-fact-primary';
  const primaryFactHash = hash(primaryFactId);
  const proposal: PaperImplementationScientificClosureProposalV1 = {
    schema_version: 'PaperImplementationScientificClosureProposal@v1',
    validation_cycle_id: CYCLE_ID,
    closure_watermark_hash:
      options.proposalWatermarkHash ?? evaluation.watermark.closure_input_hash,
    primary_comparison_fact_ref: {
      comparison_fact_id: primaryFactId,
      comparison_fact_hash: primaryFactHash,
    },
    ordered_evidence_refs: options.proposalEvidenceRefs ?? evidenceRefs.map((ref, index) => ({
      ordinal: index + 1,
      ...ref,
    })),
    interpretation_summary: 'Bounded interpretation of the registered comparison.',
    reliability_assessment: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [],
    },
    limitations: { limitation_refs: [], reliability_notes: [] },
    claim_ceiling: 'moderate',
  };
  const proposalHash = runtimeHash('scientific-proposal-v1');
  const storedProposal: PaperImplementationAdmittedScientificClosureProposalV1 = {
    proposal_id: 'scientific-proposal-1',
    proposal_hash: proposalHash,
    implementation_project_id: PROJECT_ID,
    proposal,
  };
  const authority: PaperImplementationScientificClosureEvidenceAuthorityV1 = {
    run_evidence_unit_id: evidenceRefs[0]!.run_evidence_unit_id,
    content_hash: evidenceRefs[0]!.content_hash,
    validation_report_id: 'validation-report-primary',
    validation_hash: hash('validation-report-primary'),
    evaluation_protocol_revision_id: 'protocol-revision-primary',
    evaluation_protocol_content_hash: hash('protocol-revision-primary'),
    primary_comparison_key: 'registered-primary',
    decision_if_positive: 'continue-to-claim',
    decision_if_negative: 'revise-or-abandon',
    decision_if_inconclusive: 'collect-more-evidence',
    primary_facts: Array.from(
      { length: options.primaryFactCount ?? 1 },
      (_, index) => ({
        comparison_fact_id: index === 0 ? primaryFactId : `${primaryFactId}-${index + 1}`,
        comparison_fact_hash: index === 0
          ? primaryFactHash
          : hash(`${primaryFactId}-${index + 1}`),
        comparison_key: 'registered-primary',
        registered_relation: relation,
      }),
    ),
  };
  const repository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository,
    scientific_proposals: [storedProposal],
    scientific_evidence_authorities: [authority],
  });
  const service = new PaperImplementationValidationCycleClosureV2Service({
    repository,
    enabled: () => true,
    now: () => NOW,
  });
  const request: CloseValidationCycleV2Request = {
    validation_cycle_id: CYCLE_ID,
    expected_cycle_version: evaluation.watermark.expected_cycle_version,
    expected_closure_input_hash: evaluation.watermark.closure_input_hash,
    closure_kind: 'scientific_evidence_assessed',
    accepted_proposal_id: storedProposal.proposal_id,
    expected_proposal_hash: storedProposal.proposal_hash,
    idempotency_key: `close-scientific-${relation}`,
  };
  return { repository, service, request, evaluation, proposal, authority };
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
  assert.deepEqual(context.repository.productCycleCompletion(CYCLE_ID), {
    validation_cycle_id: CYCLE_ID,
    expected_lifecycle_status: 'admitted',
    lifecycle_status: 'completed',
    execution_status: 'completed',
    completed_at: NOW,
  });
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

test('production default derivation reconstructs identical closure, snapshot, event, and outbox ids', async () => {
  const firstContext = await fixture();
  const secondContext = await fixture();

  const first = await firstContext.service.close(firstContext.request);
  const second = await secondContext.service.close(secondContext.request);
  const firstOutbox = firstContext.repository.snapshot().outboxes[0]!;
  const secondOutbox = secondContext.repository.snapshot().outboxes[0]!;

  assert.equal(second.closure.closure_id, first.closure.closure_id);
  assert.equal(second.closure.closure_snapshot_hash, first.closure.closure_snapshot_hash);
  assert.equal(secondOutbox.event.event_id, firstOutbox.event.event_id);
  assert.equal(secondOutbox.outbox_id, firstOutbox.outbox_id);
  assert.deepEqual(second.closure, first.closure);
});

test('Serializable closure abort retries with the same deterministic authority identity', async () => {
  const context = await fixture();
  let transactionAttempts = 0;
  const retryingRepository: PaperImplementationValidationCycleClosureV2Repository = {
    isCycleClosed: (validationCycleId) => context.repository.isCycleClosed(validationCycleId),
    async withTransaction(operation) {
      transactionAttempts += 1;
      if (transactionAttempts === 1) {
        throw new PaperImplementationValidationCycleClosureV2RepositoryError(
          'CLOSURE_CONCURRENT_CONFLICT',
          'injected PostgreSQL serialization abort',
        );
      }
      return context.repository.withTransaction(operation);
    },
  };
  const service = new PaperImplementationValidationCycleClosureV2Service({
    repository: retryingRepository,
    enabled: () => true,
    now: () => NOW,
  });

  const response = await service.close(context.request);
  const snapshot = context.repository.snapshot();

  assert.equal(transactionAttempts, 2);
  assert.equal(snapshot.closures.length, 1);
  assert.equal(snapshot.outboxes.length, 1);
  assert.equal(snapshot.closures[0]!.closure.closure_id, response.closure.closure_id);
  assert.equal(snapshot.outboxes[0]!.event.correlation_id, response.closure.closure_id);
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
  assert.equal(context.repository.productCycleCompletion(CYCLE_ID)?.completed_at, NOW);
});

test('a terminal product Cycle without a stored v2 closure maps to CYCLE_ALREADY_CLOSED', async () => {
  const context = await fixture({
    readiness: readinessOptions({ lifecycleStatus: 'aborted' }),
  });
  await assert.rejects(
    context.service.close(context.request),
    (error) => reason(error) === 'CYCLE_ALREADY_CLOSED',
  );
  assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  assert.equal(context.repository.productCycleCompletion(CYCLE_ID), null);
});

test('control-only closure cannot discard eligible REU', async () => {
  const evidence = await fixture({ readiness: readinessOptions({ evidence: true }) });
  await assert.rejects(
    evidence.service.close(evidence.request),
    (error) => reason(error) === 'CLOSURE_PROPOSAL_STALE',
  );
  assert.deepEqual(evidence.repository.snapshot(), { closures: [], outboxes: [] });
});

test('DISP-S deterministically maps the unique primary relation to disposition and frozen exit', async (t) => {
  const cases = [
    ['supports_registered_expectation', 'positive', 'continue-to-claim'],
    ['contradicts_registered_expectation', 'negative', 'revise-or-abandon'],
    ['indeterminate', 'inconclusive', 'collect-more-evidence'],
  ] as const;
  for (const [relation, disposition, selectedExit] of cases) {
    await t.test(relation, async () => {
      const context = await scientificFixture(relation);
      const first = await context.service.close(context.request);
      const replay = await context.service.close(context.request);
      const snapshot = context.repository.snapshot();

      assert.deepEqual(replay, first);
      assert.equal(snapshot.closures.length, 1);
      assert.equal(snapshot.outboxes.length, 1);
      assert.equal(first.closure.closure_kind, 'scientific_evidence_assessed');
      assert.equal(first.closure.scientific_disposition, disposition);
      assert.equal(first.closure.selected_exit_key, selectedExit);
      assert.equal(first.closure.accepted_proposal_id, context.request.accepted_proposal_id);
      assert.equal(first.closure.accepted_proposal_hash, context.request.expected_proposal_hash);
      assert.deepEqual(first.closure.scientific_authority, {
        schema_version: 'PaperImplementationValidationCycleScientificAuthority@v1',
        evaluation_protocol_revision_id: context.authority.evaluation_protocol_revision_id,
        evaluation_protocol_content_hash: context.authority.evaluation_protocol_content_hash,
        primary_comparison_fact_id:
          context.proposal.primary_comparison_fact_ref.comparison_fact_id,
        primary_comparison_fact_hash:
          context.proposal.primary_comparison_fact_ref.comparison_fact_hash,
        primary_comparison_key: context.authority.primary_comparison_key,
        registered_relation: relation,
      });
      const { closure_snapshot_hash: closureHash, ...closureHashInput } = first.closure;
      assert.equal(closureHash, serverHashPaperImplementationV2CycleClosure(closureHashInput));
      assert.equal(
        context.repository.productCycleCompletion(CYCLE_ID)?.lifecycle_status,
        'completed',
      );
    });
  }
});

test('scientific closure fails closed on missing, duplicate or stale primary authority', async (t) => {
  await t.test('missing primary fact', async () => {
    const context = await scientificFixture('supports_registered_expectation', {
      primaryFactCount: 0,
    });
    await assert.rejects(
      context.service.close(context.request),
      (error) => reason(error) === 'CLOSURE_PRIMARY_COMPARISON_MISSING',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });

  await t.test('duplicate primary fact', async () => {
    const context = await scientificFixture('supports_registered_expectation', {
      primaryFactCount: 2,
    });
    await assert.rejects(
      context.service.close(context.request),
      (error) => reason(error) === 'CLOSURE_PRIMARY_COMPARISON_AMBIGUOUS',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });

  await t.test('stale proposal watermark', async () => {
    const context = await scientificFixture('supports_registered_expectation', {
      proposalWatermarkHash: hash('stale-watermark'),
    });
    await assert.rejects(
      context.service.close(context.request),
      (error) => reason(error) === 'CLOSURE_PROPOSAL_STALE',
    );
    assert.deepEqual(context.repository.snapshot(), { closures: [], outboxes: [] });
  });

  await t.test('changed proposal replay', async () => {
    const context = await scientificFixture('supports_registered_expectation');
    await context.service.close(context.request);
    await assert.rejects(
      context.service.close({
        ...context.request,
        expected_proposal_hash: runtimeHash('changed-proposal'),
      }),
      (error) => reason(error) === 'CYCLE_ALREADY_CLOSED',
    );
    assert.equal(context.repository.snapshot().closures.length, 1);
    assert.equal(context.repository.snapshot().outboxes.length, 1);
  });
});
