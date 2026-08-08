import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  type EvidenceCandidateV2,
  type ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2EvidenceTraceManifest,
  serverHashPaperImplementationV2RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  EvidenceCandidateQualifiedEventV1,
  ExperimentFoundationScientificValidationV2Repository,
  ExperimentFoundationScientificValidationV2StoredOutcome,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import { InMemoryPaperImplementationEvidenceV2Repository } from '../repositories/in-memory-paper-implementation-evidence-v2-repository.js';
import type { PaperImplementationEvidenceV2Authority } from '../repositories/paper-implementation-evidence-v2.repository.js';
import { PaperImplementationEvidenceTrustGatewayService } from './paper-implementation-evidence-trust-gateway-service.js';

const FIXED_NOW = '2026-07-20T12:00:00.000Z';

class ScientificValidationReadStub
implements Pick<ExperimentFoundationScientificValidationV2Repository, 'loadValidationByRunId'> {
  onLoad: (() => void) | null = null;

  constructor(public outcome: ExperimentFoundationScientificValidationV2StoredOutcome | null) {}

  async loadValidationByRunId(runId: string) {
    this.onLoad?.();
    return this.outcome?.report.run_id === runId ? structuredClone(this.outcome) : null;
  }
}

interface Fixture {
  authority: PaperImplementationEvidenceV2Authority;
  event: EvidenceCandidateQualifiedEventV1;
  outcome: ExperimentFoundationScientificValidationV2StoredOutcome;
  repository: InMemoryPaperImplementationEvidenceV2Repository;
  readRepository: ScientificValidationReadStub;
  service: PaperImplementationEvidenceTrustGatewayService;
}

function fixture(): Fixture {
  const authority: PaperImplementationEvidenceV2Authority = {
    implementation_project_id: 'implementation-project-1',
    validation_cycle_id: 'validation-cycle-1',
    branch_id: 'branch-1',
    branch_key: 'primary',
    work_order_revision_id: 'work-order-revision-1',
    work_order_revision_hash: testHash('work-order-revision'),
    branch_revision_sequence: 3,
    cell_plan_hash: testHash('cell-plan'),
    approved_plan_hash: testHash('approved-plan'),
    current_work_order_revision_id: 'work-order-revision-1',
    current_branch_revision_sequence: 3,
    head_work_order_revision_id: 'work-order-revision-1',
    head_branch_revision_sequence: 3,
    head_run_id: 'run-1',
    head_run_manifest_hash: testHash('run-manifest'),
    validation_cycle_closure_id: null,
  };
  const reportWithoutHash: Omit<ScientificValidationReportV2, 'validation_hash'> = {
    report_id: 'validation-report-1',
    schema_version: 'v1',
    run_id: 'run-1',
    run_manifest_hash: testHash('run-manifest'),
    ordered_cell_results: [],
    evaluation_protocol: {
      asset_type: 'EvaluationProtocol',
      logical_id: 'evaluation-protocol-1',
      revision_id: 'evaluation-protocol-revision-1',
      revision_sequence: 2,
      content_hash: testHash('evaluation-protocol-revision'),
    },
    validator_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
    validator_profile_hash: testHash('validator-profile'),
    ordered_rule_results: [],
    ordered_comparison_results: [{
      ordinal: 1,
      comparison_key: 'primary-quality',
      rule_hash: testHash('comparison-rule'),
      status: 'passed',
      detail_code: null,
      fact: {
        schema_version: 'ExperimentFoundationScientificComparisonFact@v1',
        comparison_fact_id: 'comparison-fact-1',
        ordinal: 1,
        comparison_key: 'primary-quality',
        evaluation_protocol_revision_hash: testHash('evaluation-protocol-revision'),
        rule_hash: testHash('comparison-rule'),
        rule_projection: {
          effect_kind: 'absolute_difference',
          direction: 'higher_is_support',
          support_min: 0.1,
          contradiction_max: -0.1,
          uncertainty_policy: { kind: 'not_required_by_protocol' },
        },
        left_observation_ref: {
          run_cell_id: 'cell-1', result_id: 'result-1',
          result_content_hash: testHash('result-1'), observation_id: 'observation-1',
          observation_ordinal: 1, observation_key: 'quality',
          observation_hash: testHash('observation-1'),
        },
        right_observation_ref: {
          run_cell_id: 'cell-2', result_id: 'result-2',
          result_content_hash: testHash('result-2'), observation_id: 'observation-2',
          observation_ordinal: 1, observation_key: 'quality',
          observation_hash: testHash('observation-2'),
        },
        raw_effect: { kind: 'absolute_difference', value: 0.2, unit: 'score' },
        raw_effect_interval: null,
        registered_relation: 'supports_registered_expectation',
        relation_reason: 'support_band_met',
        comparison_fact_hash: testHash('comparison-fact'),
      },
    }],
    status: 'passed',
  };
  const report: ScientificValidationReportV2 = {
    ...reportWithoutHash,
    validation_hash: serverHashExperimentFoundationV2ScientificValidation({
      run_id: reportWithoutHash.run_id,
      run_manifest_hash: reportWithoutHash.run_manifest_hash,
      ordered_cell_results: reportWithoutHash.ordered_cell_results,
      evaluation_protocol: reportWithoutHash.evaluation_protocol,
      validator_profile_version: reportWithoutHash.validator_profile_version,
      validator_profile_hash: reportWithoutHash.validator_profile_hash,
      ordered_rule_results: reportWithoutHash.ordered_rule_results,
      ordered_comparison_results: reportWithoutHash.ordered_comparison_results,
      status: reportWithoutHash.status,
    }),
  };
  const candidateWithoutHash: Omit<EvidenceCandidateV2, 'candidate_id' | 'content_hash'> = {
    schema_version: 'v1',
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
  };
  const candidateHash = serverHashExperimentFoundationV2EvidenceCandidate({
    run_id: candidateWithoutHash.run_id,
    run_manifest_hash: candidateWithoutHash.run_manifest_hash,
    validation_report_id: candidateWithoutHash.validation_report_id,
    validation_hash: candidateWithoutHash.validation_hash,
  });
  const candidate: EvidenceCandidateV2 = {
    candidate_id: 'evidence-candidate-1',
    ...candidateWithoutHash,
    content_hash: candidateHash,
  };
  const outcome: ExperimentFoundationScientificValidationV2StoredOutcome = {
    report,
    evidence_candidate: candidate,
    idempotency_key: 'ef-validation-key-1',
  };
  const event = buildEvent(authority, outcome);
  const repository = new InMemoryPaperImplementationEvidenceV2Repository({
    authorities: [authority],
  });
  const readRepository = new ScientificValidationReadStub(outcome);
  const service = new PaperImplementationEvidenceTrustGatewayService({
    repository,
    scientificValidationReadRepository: readRepository,
    now: () => FIXED_NOW,
  });
  return { authority, event, outcome, repository, readRepository, service };
}

function buildEvent(
  authority: PaperImplementationEvidenceV2Authority,
  outcome: ExperimentFoundationScientificValidationV2StoredOutcome,
  overrides: Partial<Pick<EvidenceCandidateQualifiedEventV1, 'event_id' | 'business_idempotency_key'>> = {},
): EvidenceCandidateQualifiedEventV1 {
  const candidate = outcome.evidence_candidate;
  assert.ok(candidate);
  const payload = {
    event_schema: EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
    candidate_id: candidate.candidate_id,
    candidate_content_hash: candidate.content_hash,
    validation_report_id: outcome.report.report_id,
    validation_hash: outcome.report.validation_hash,
    run_id: outcome.report.run_id,
    run_manifest_hash: outcome.report.run_manifest_hash,
    evaluation_protocol_revision_id: outcome.report.evaluation_protocol.revision_id,
    evaluation_protocol_content_hash: outcome.report.evaluation_protocol.content_hash,
  };
  return {
    event_id: overrides.event_id ?? 'qualified-event-1',
    event_type: 'EvidenceCandidateQualified',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: '2026-07-20T11:59:00.000Z',
    correlation_id: 'correlation-1',
    causation_id: 'validation-event-1',
    business_idempotency_key: overrides.business_idempotency_key ?? 'pi-ingest-key-1',
    implementation_project_id: authority.implementation_project_id,
    validation_cycle_id: authority.validation_cycle_id,
    branch_id: authority.branch_id,
    branch_key: authority.branch_key,
    work_order_revision_id: authority.work_order_revision_id,
    work_order_revision_hash: authority.work_order_revision_hash,
    branch_revision_sequence: authority.branch_revision_sequence,
    cell_plan_hash: authority.cell_plan_hash,
    approved_plan_hash: authority.approved_plan_hash,
    payload_hash: serverHashExperimentV2EventPayload(
      'EvidenceCandidateQualified',
      'v1',
      payload,
    ),
    payload,
  };
}

function testHash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

test('qualified event atomically persists exact inbox, REU, trace, and registered outbox', async () => {
  const context = fixture();
  const result = await context.service.consume(context.event);
  const snapshot = context.repository.snapshot();

  assert.equal(result.inbox.outcome, 'processed');
  assert.equal(result.replayed, false);
  assert.equal(result.reused_existing_evidence, false);
  assert.ok(result.run_evidence_unit);
  assert.ok(result.trace_manifest);
  assert.equal(snapshot.inboxes.length, 1);
  assert.equal(snapshot.run_evidence_units.length, 1);
  assert.equal(snapshot.trace_manifests.length, 1);
  assert.equal(snapshot.outboxes.length, 1);

  const unit = result.run_evidence_unit;
  const trace = result.trace_manifest;
  const { content_hash: unitHash, ...unitHashInput } = unit;
  const { content_hash: traceHash, ...traceHashInput } = trace;
  assert.equal(unitHash, serverHashPaperImplementationV2RunEvidenceUnit(unitHashInput));
  assert.equal(traceHash, serverHashPaperImplementationV2EvidenceTraceManifest(traceHashInput));
  assert.deepEqual(
    trace.ordered_trace_refs.map(({ ordinal, ref_kind }) => ({ ordinal, ref_kind })),
    [
      { ordinal: 1, ref_kind: 'evidence_candidate' },
      { ordinal: 2, ref_kind: 'scientific_validation_report' },
      { ordinal: 3, ref_kind: 'run' },
      { ordinal: 4, ref_kind: 'work_order_revision' },
      { ordinal: 5, ref_kind: 'evaluation_protocol_revision' },
    ],
  );

  const outbox = snapshot.outboxes[0]!;
  assert.equal(outbox.event.event_type, 'RunEvidenceUnitRegistered');
  assert.deepEqual(outbox.event.payload, {
    run_evidence_unit_id: unit.run_evidence_unit_id,
    content_hash: unit.content_hash,
    validation_cycle_id: unit.validation_cycle_id,
    run_id: unit.run_id,
    run_manifest_hash: unit.run_manifest_hash,
    evidence_candidate_id: unit.evidence_candidate_id,
  });
  assert.equal(
    outbox.event.payload_hash,
    serverHashExperimentV2EventPayload('RunEvidenceUnitRegistered', 'v1', outbox.event.payload),
  );
  assert.equal(outbox.event_envelope_hash, serverHashExperimentV2EventEnvelope(outbox.event));

  const read = await context.service.getIngestedEvidence({
    evidence_candidate_id: context.event.payload.candidate_id,
    expected_candidate_content_hash: context.event.payload.candidate_content_hash,
    idempotency_key: context.event.business_idempotency_key,
  });
  assert.deepEqual(read, {
    run_evidence_unit: unit,
    trace_manifest: trace,
  });
});

test('same event replay returns stored outcome without new writes or EF re-resolution', async () => {
  const context = fixture();
  const first = await context.service.consume(context.event);
  const before = context.repository.snapshot();
  context.readRepository.outcome = null;

  const replay = await context.service.consume(context.event);

  assert.equal(replay.replayed, true);
  assert.equal(replay.inbox.inbox_id, first.inbox.inbox_id);
  assert.deepEqual(context.repository.snapshot(), before);
});

test('payload-hash tamper is a terminal conflict with zero writes', async () => {
  const context = fixture();
  const tampered = structuredClone(context.event);
  tampered.payload.candidate_id = 'tampered-candidate';

  await assert.rejects(
    context.service.consume(tampered),
    (error: unknown) => hasReason(error, 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'),
  );
  assert.deepEqual(context.repository.snapshot(), {
    inboxes: [],
    run_evidence_units: [],
    trace_manifests: [],
    outboxes: [],
  });
});

test('changed envelope for a consumed event id is a terminal conflict without new writes', async () => {
  const context = fixture();
  await context.service.consume(context.event);
  const before = context.repository.snapshot();
  const changed = structuredClone(context.event);
  changed.payload.candidate_id = 'changed-candidate';
  changed.payload_hash = serverHashExperimentV2EventPayload(
    changed.event_type,
    changed.schema_version,
    changed.payload,
  );

  await assert.rejects(
    context.service.consume(changed),
    (error: unknown) => hasReason(error, 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'),
  );
  assert.deepEqual(context.repository.snapshot(), before);
});

test('branch/revision scope drift records a rejected receipt and zero domain writes', async (t) => {
  const mutations: Array<{
    name: string;
    mutate: (event: EvidenceCandidateQualifiedEventV1) => void;
  }> = [
    { name: 'wrong branch', mutate: (event) => { event.branch_id = 'wrong-branch'; } },
    {
      name: 'wrong revision',
      mutate: (event) => { event.work_order_revision_id = 'wrong-revision'; },
    },
    {
      name: 'wrong sequence',
      mutate: (event) => { event.branch_revision_sequence += 1; },
    },
    {
      name: 'wrong revision hash',
      mutate: (event) => { event.work_order_revision_hash = testHash('wrong-revision'); },
    },
  ];
  for (const mutation of mutations) {
    await t.test(mutation.name, async () => {
      const context = fixture();
      const drifted = structuredClone(context.event);
      mutation.mutate(drifted);
      const result = await context.service.consume(drifted);
      const snapshot = context.repository.snapshot();
      assert.equal(result.inbox.outcome, 'terminal_conflict');
      assert.equal(result.inbox.reason_code, 'BRANCH_HEAD_SCOPE_CONFLICT');
      assert.equal(snapshot.inboxes.length, 1);
      assert.equal(snapshot.run_evidence_units.length, 0);
      assert.equal(snapshot.trace_manifests.length, 0);
      assert.equal(snapshot.outboxes.length, 0);
    });
  }
});

test('transactional gateway authority rejects superseded, head-advanced, and closed scope', async (t) => {
  const cases: Array<{
    name: string;
    mutate: (context: Fixture) => void;
    message: RegExp;
  }> = [
    {
      name: 'superseded revision delivery',
      mutate: (context) => context.repository.replaceAuthority({
        ...context.authority,
        current_work_order_revision_id: 'work-order-revision-2',
        current_branch_revision_sequence: 4,
      }),
      message: /no longer the branch's current admitted revision/u,
    },
    {
      name: 'head-advanced delivery',
      mutate: (context) => context.repository.replaceAuthority({
        ...context.authority,
        head_run_id: 'run-2',
        head_run_manifest_hash: testHash('run-manifest-2'),
      }),
      message: /no longer the branch head Run/u,
    },
    {
      name: 'post-closure delivery',
      mutate: (context) => context.repository.closeValidationCycle(
        context.event.validation_cycle_id,
        'closure-1',
      ),
      message: /already has immutable v2 closure closure-1/u,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const context = fixture();
      context.readRepository.onLoad = () => scenario.mutate(context);

      const first = await context.service.consume(context.event);
      const snapshot = context.repository.snapshot();
      assert.equal(first.inbox.outcome, 'terminal_conflict');
      assert.equal(first.inbox.reason_code, 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE');
      assert.match(first.rejection_message ?? '', scenario.message);
      assert.deepEqual(snapshot, {
        inboxes: [first.inbox],
        run_evidence_units: [],
        trace_manifests: [],
        outboxes: [],
      });

      context.readRepository.onLoad = null;
      const replay = await context.service.consume(context.event);
      assert.equal(replay.replayed, true);
      assert.deepEqual(replay.inbox, first.inbox);
      assert.equal(replay.run_evidence_unit, null);
      assert.deepEqual(context.repository.snapshot(), snapshot);
    });
  }
});

test('candidate/report/hash/status mismatches reject as not eligible with zero domain writes', async (t) => {
  const mutations: Array<{
    name: string;
    mutate: (outcome: ExperimentFoundationScientificValidationV2StoredOutcome) => void;
  }> = [
    {
      name: 'candidate id',
      mutate: (outcome) => { outcome.evidence_candidate!.candidate_id = 'other-candidate'; },
    },
    {
      name: 'candidate content hash',
      mutate: (outcome) => { outcome.evidence_candidate!.content_hash = testHash('other'); },
    },
    {
      name: 'report id',
      mutate: (outcome) => { outcome.report.report_id = 'other-report'; },
    },
    {
      name: 'validation hash',
      mutate: (outcome) => { outcome.report.validation_hash = testHash('other-validation'); },
    },
    {
      name: 'run manifest hash',
      mutate: (outcome) => { outcome.report.run_manifest_hash = testHash('other-run'); },
    },
    {
      name: 'status is not passed',
      mutate: (outcome) => { outcome.report.status = 'failed'; },
    },
  ];
  for (const mutation of mutations) {
    await t.test(mutation.name, async () => {
      const context = fixture();
      const mismatched = structuredClone(context.outcome);
      mutation.mutate(mismatched);
      context.readRepository.outcome = mismatched;
      const result = await context.service.consume(context.event);
      const snapshot = context.repository.snapshot();
      assert.equal(result.inbox.reason_code, 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE');
      assert.equal(snapshot.inboxes.length, 1);
      assert.equal(snapshot.run_evidence_units.length, 0);
      assert.equal(snapshot.trace_manifests.length, 0);
      assert.equal(snapshot.outboxes.length, 0);
    });
  }
});

test('evaluation-protocol provenance mismatch records provenance rejection', async () => {
  const context = fixture();
  const event = structuredClone(context.event);
  event.payload.evaluation_protocol_revision_id = 'foreign-protocol-revision';
  event.payload_hash = serverHashExperimentV2EventPayload(
    event.event_type,
    event.schema_version,
    event.payload,
  );

  const result = await context.service.consume(event);
  assert.equal(result.inbox.reason_code, 'EVIDENCE_PROVENANCE_REJECTED');
  assert.equal(context.repository.snapshot().run_evidence_units.length, 0);
});

test('injected commit failure rolls back inbox, REU, trace, and outbox together', async () => {
  const context = fixture();
  context.repository.failNextCommit();

  await assert.rejects(context.service.consume(context.event), /INJECTED_EVIDENCE_COMMIT_FAILURE/);
  assert.deepEqual(context.repository.snapshot(), {
    inboxes: [],
    run_evidence_units: [],
    trace_manifests: [],
    outboxes: [],
  });
});

test('second event for the same candidate converges without a second REU, trace, or outbox', async () => {
  const context = fixture();
  const first = await context.service.consume(context.event);
  const secondEvent = buildEvent(context.authority, context.outcome, {
    event_id: 'qualified-event-2',
    business_idempotency_key: 'pi-ingest-key-2',
  });

  const second = await context.service.consume(secondEvent);
  const snapshot = context.repository.snapshot();
  assert.equal(second.reused_existing_evidence, true);
  assert.equal(
    second.run_evidence_unit?.run_evidence_unit_id,
    first.run_evidence_unit?.run_evidence_unit_id,
  );
  assert.equal(snapshot.inboxes.length, 2);
  assert.equal(snapshot.run_evidence_units.length, 1);
  assert.equal(snapshot.trace_manifests.length, 1);
  assert.equal(snapshot.outboxes.length, 1);
  assert.ok(await context.service.getIngestedEvidence({
    evidence_candidate_id: secondEvent.payload.candidate_id,
    expected_candidate_content_hash: secondEvent.payload.candidate_content_hash,
    idempotency_key: secondEvent.business_idempotency_key,
  }));
});

function hasReason(error: unknown, reasonCode: string): boolean {
  if (!error || typeof error !== 'object' || !('details' in error)) return false;
  const details = error.details;
  return Boolean(
    details
    && typeof details === 'object'
    && 'reason_code' in details
    && details.reason_code === reasonCode,
  );
}
