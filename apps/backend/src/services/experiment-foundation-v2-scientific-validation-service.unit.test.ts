import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationV2ArtifactContractRuleV1,
  ExperimentFoundationV2MetricContractRuleV1,
  ExperimentFoundationV2RequiredRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import { InMemoryExperimentFoundationScientificValidationV2Repository } from '../repositories/in-memory-experiment-foundation-scientific-validation-v2-repository.js';
import type {
  ExperimentFoundationScientificValidationV2ExecutionAttempt,
  ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  ExperimentFoundationScientificValidationV2Protocol,
  ExperimentFoundationScientificValidationV2Run,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import {
  ExperimentFoundationV2ScientificValidationService,
  type RecordExperimentResultV2Input,
} from './experiment-foundation-v2-scientific-validation-service.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
const FIXED_NOW = '2026-07-19T08:00:00.000Z';

const metricRule: ExperimentFoundationV2MetricContractRuleV1 = {
  rule_id: 'rule-metric-001',
  rule_type: 'metric_contract@v1',
  metric_definition: {
    asset_type: 'MetricDefinition',
    logical_id: 'metric-faithfulness',
    revision_id: 'metric-revision-001',
    revision_sequence: 1,
    content_hash: hash('a'),
  },
  metric_key: 'faithfulness',
  required_cardinality: 1,
  split_key: 'test',
  value_type: 'number',
  unit: 'score',
  finite_required: true,
};

const artifactRule: ExperimentFoundationV2ArtifactContractRuleV1 = {
  rule_id: 'rule-artifact-001',
  rule_type: 'artifact_contract@v1',
  artifact_kind: 'metrics_json',
  file_name: 'metrics.json',
  required_cardinality: 1,
  content_hash_required: true,
  parser_binding: 'metrics_json_parser@v1',
};

function makeRun(runId = 'run-001', manifestHash = hash('1')): ExperimentFoundationScientificValidationV2Run {
  return {
    run_id: runId,
    run_recipe_id: `recipe-${runId}`,
    run_manifest_hash: manifestHash,
    external_pi_branch_id: `branch-${runId}`,
    external_pi_work_order_revision_id: `revision-${runId}`,
    external_pi_work_order_revision_hash: hash(runId === 'run-001' ? '2' : 'b'),
    external_pi_revision_sequence: 1,
    ordered_cells: [1, 2].map((ordinal) => ({
      run_cell_id: `${runId}-cell-${ordinal}`,
      run_id: runId,
      ordinal,
      cell_key: `cell-${ordinal}`,
      external_pi_cell_id: `${runId}-pi-cell-${ordinal}`,
      external_pi_cell_hash: hash(ordinal === 1 ? '3' : '4'),
      training_task_spec_id: `${runId}-task-${ordinal}`,
      training_task_spec_hash: hash(ordinal === 1 ? '5' : '6'),
      seed: ordinal,
      repeat_index: ordinal - 1,
    })),
  };
}

function makeProtocol(
  run: ExperimentFoundationScientificValidationV2Run,
  requiredRules: readonly ExperimentFoundationV2RequiredRuleV1[],
): ExperimentFoundationScientificValidationV2Protocol {
  return {
    evaluation_protocol: {
      asset_type: 'EvaluationProtocol',
      logical_id: `protocol-${run.run_id}`,
      revision_id: `protocol-revision-${run.run_id}`,
      revision_sequence: 1,
      content_hash: hash(run.run_id === 'run-001' ? '7' : 'c'),
    },
    protocol_snapshot: {
      schema_version: 'v2',
      protocol_key: `protocol-key-${run.run_id}`,
      display_name: `Protocol for ${run.run_id}`,
      benchmark_dependency: {
        asset_type: 'Benchmark',
        logical_id: 'benchmark-001',
        revision_id: 'benchmark-revision-001',
        revision_sequence: 1,
        content_hash: hash('8'),
      },
      metric_dependencies: [metricRule.metric_definition],
      required_rules: structuredClone([...requiredRules]),
    },
  };
}

function makeAcknowledgement(
  run: ExperimentFoundationScientificValidationV2Run,
): ExperimentFoundationScientificValidationV2HeadAcknowledgement {
  return {
    inbox_id: `head-ack-${run.run_id}`,
    event_id: `head-event-${run.run_id}`,
    correlation_id: `correlation-${run.run_id}`,
    implementation_project_id: 'implementation-project-001',
    validation_cycle_id: 'validation-cycle-001',
    branch_id: run.external_pi_branch_id,
    branch_key: `branch-key-${run.run_id}`,
    work_order_revision_id: run.external_pi_work_order_revision_id,
    revision_sequence: run.external_pi_revision_sequence,
    work_order_revision_hash: run.external_pi_work_order_revision_hash,
    cell_plan_hash: hash('9'),
    approved_plan_hash: hash('d'),
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
  };
}

function makeAttempts(
  run: ExperimentFoundationScientificValidationV2Run,
  executionMode: ExperimentFoundationScientificValidationV2ExecutionAttempt['execution_mode'] =
    'real_provider',
  provenance: ExperimentFoundationScientificValidationV2ExecutionAttempt['provenance'] =
    'real_provider',
): ExperimentFoundationScientificValidationV2ExecutionAttempt[] {
  return run.ordered_cells.map((cell) => ({
    execution_attempt_id: `${cell.run_cell_id}-attempt`,
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
    run_cell_id: cell.run_cell_id,
    cell_key: cell.cell_key,
    training_task_spec_id: cell.training_task_spec_id,
    training_task_spec_hash: cell.training_task_spec_hash,
    lifecycle_state: 'succeeded',
    execution_mode: executionMode,
    provenance,
  }));
}

function makeHarness(input: {
  runs?: ExperimentFoundationScientificValidationV2Run[];
  rulesByRun?: Readonly<Record<string, readonly ExperimentFoundationV2RequiredRuleV1[]>>;
  acknowledgements?: boolean;
  attempts?: ExperimentFoundationScientificValidationV2ExecutionAttempt[];
} = {}) {
  const runs = input.runs ?? [makeRun()];
  const protocols: Record<string, ExperimentFoundationScientificValidationV2Protocol> = {};
  for (const run of runs) {
    protocols[run.run_id] = makeProtocol(
      run,
      input.rulesByRun?.[run.run_id] ?? [metricRule, artifactRule],
    );
  }
  const repository = new InMemoryExperimentFoundationScientificValidationV2Repository({
    runs,
    protocols,
    headAcknowledgements: input.acknowledgements === false
      ? []
      : runs.map(makeAcknowledgement),
    executionAttempts: input.attempts ?? runs.flatMap((run) => makeAttempts(run)),
  });
  return {
    runs,
    repository,
    service: new ExperimentFoundationV2ScientificValidationService({
      repository,
      enabled: () => true,
      legacyObservationWriterEnabled: () => true,
      now: () => FIXED_NOW,
    }),
  };
}

function makeResultInput(
  run: ExperimentFoundationScientificValidationV2Run,
  ordinal: number,
  metricValue = 0.9,
): RecordExperimentResultV2Input {
  const cell = run.ordered_cells[ordinal - 1]!;
  return {
    schema_version: 'v1',
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
    run_cell_id: cell.run_cell_id,
    cell_key: cell.cell_key,
    training_task_spec_id: cell.training_task_spec_id,
    training_task_spec_hash: cell.training_task_spec_hash,
    execution_attempt_id: `${cell.run_cell_id}-attempt`,
    provenance: 'real_provider',
    metric_observations: [
      {
        metric_key: 'faithfulness',
        split_key: 'test',
        value: metricValue,
        value_type: 'number',
        unit: 'score',
      },
    ],
    artifact_observations: [
      {
        artifact_kind: 'metrics_json',
        file_name: 'metrics.json',
        content_hash: hash(ordinal === 1 ? 'e' : 'f'),
        byte_size: ordinal * 100,
        parser_binding: 'metrics_json_parser@v1',
      },
    ],
  };
}

async function recordCompleteBatch(
  service: ExperimentFoundationV2ScientificValidationService,
  run: ExperimentFoundationScientificValidationV2Run,
): Promise<void> {
  for (const cell of run.ordered_cells) {
    await service.recordExperimentResult(makeResultInput(run, cell.ordinal));
  }
}

async function assertReason(
  operation: () => Promise<unknown>,
  reasonCode: string,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => (
    error instanceof AppError && error.details?.reason_code === reasonCode
  ));
}

test('scientific-validation capability rejects writes before repository access', async () => {
  const { runs: [run], repository } = makeHarness();
  const disabled = new ExperimentFoundationV2ScientificValidationService({
    repository,
    enabled: () => false,
  });
  await assertReason(
    () => disabled.recordExperimentResult(makeResultInput(run!, 1)),
    'EF_V2_SCIENTIFIC_VALIDATION_DISABLED',
  );
  assert.deepEqual(repository.snapshot(), {
    results: [], source_bound_results: [], outcomes: [], outboxes: [],
  });
});

test('P1 product composition seals the legacy caller-authored observation writer', async () => {
  const { runs: [run], repository } = makeHarness();
  const productService = new ExperimentFoundationV2ScientificValidationService({
    repository,
    enabled: () => true,
  });
  await assertReason(
    () => productService.recordExperimentResult(makeResultInput(run!, 1)),
    'VALIDATION_SCOPE_DRIFT',
  );
  assert.deepEqual(repository.snapshot(), {
    results: [], source_bound_results: [], outcomes: [], outboxes: [],
  });
});

test('passed batch atomically persists report, Candidate and outbox with exact hash bindings', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await recordCompleteBatch(service, run!);

  const response = await service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-passed',
  });
  assert.equal(response.report.status, 'passed');
  assert.ok(response.evidence_candidate);

  const snapshot = repository.snapshot();
  assert.equal(snapshot.results.length, 2);
  assert.deepEqual(
    snapshot.results.map((result) => [
      result.metric_observation_count,
      result.artifact_observation_count,
    ]),
    [[1, 1], [1, 1]],
  );
  assert.equal(snapshot.outcomes.length, 1);
  assert.equal(snapshot.outboxes.length, 1);

  const report = response.report;
  const candidate = response.evidence_candidate;
  const outbox = snapshot.outboxes[0]!;
  assert.equal(
    report.validation_hash,
    serverHashExperimentFoundationV2ScientificValidation({
      run_id: report.run_id,
      run_manifest_hash: report.run_manifest_hash,
      ordered_cell_results: report.ordered_cell_results,
      evaluation_protocol: report.evaluation_protocol,
      validator_profile_version: report.validator_profile_version,
      validator_profile_hash: report.validator_profile_hash,
      ordered_rule_results: report.ordered_rule_results,
      status: report.status,
    }),
  );
  assert.equal(candidate.validation_report_id, report.report_id);
  assert.equal(candidate.validation_hash, report.validation_hash);
  assert.equal(candidate.run_id, report.run_id);
  assert.equal(candidate.run_manifest_hash, report.run_manifest_hash);
  assert.equal(
    candidate.content_hash,
    serverHashExperimentFoundationV2EvidenceCandidate({
      run_id: candidate.run_id,
      run_manifest_hash: candidate.run_manifest_hash,
      validation_report_id: candidate.validation_report_id,
      validation_hash: candidate.validation_hash,
    }),
  );
  assert.equal(outbox.aggregate_id, candidate.candidate_id);
  assert.equal(outbox.event.payload.candidate_content_hash, candidate.content_hash);
  assert.equal(outbox.event.payload.validation_hash, report.validation_hash);
  assert.equal(
    outbox.event.payload_hash,
    serverHashExperimentV2EventPayload(
      'EvidenceCandidateQualified',
      'v1',
      outbox.event.payload,
    ),
  );
  assert.equal(outbox.event_envelope_hash, serverHashExperimentV2EventEnvelope(outbox.event));
});

test('in-memory validation commit rolls back report, Candidate and outbox together', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await recordCompleteBatch(service, run!);
  repository.failNextValidationCommit();

  await assert.rejects(() => service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-rollback',
  }));
  const snapshot = repository.snapshot();
  assert.equal(snapshot.outcomes.length, 0);
  assert.equal(snapshot.outboxes.length, 0);
});

test('failed required rule persists report only', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await service.recordExperimentResult({
    ...makeResultInput(run!, 1),
    metric_observations: [],
  });
  await service.recordExperimentResult(makeResultInput(run!, 2));

  const response = await service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-failed',
  });
  assert.equal(response.report.status, 'failed');
  assert.equal(response.evidence_candidate, null);
  assert.equal(repository.snapshot().outcomes.length, 1);
  assert.equal(repository.snapshot().outboxes.length, 0);
});

test('unsupported required rule persists unsupported report only', async () => {
  const run = makeRun();
  const unsupportedRule = {
    rule_id: 'rule-statistical-001',
    rule_type: 'statistical_test@v1',
  } as unknown as ExperimentFoundationV2RequiredRuleV1;
  const { repository, service } = makeHarness({
    runs: [run],
    rulesByRun: { [run.run_id]: [unsupportedRule] },
  });
  await recordCompleteBatch(service, run);

  const response = await service.validateScientificBatch({
    run_id: run.run_id,
    expected_run_manifest_hash: run.run_manifest_hash,
    idempotency_key: 'validation-key-unsupported',
  });
  assert.equal(response.report.status, 'unsupported');
  assert.equal(response.report.ordered_rule_results[0]?.detail_code, 'UNSUPPORTED_RULE');
  assert.equal(response.evidence_candidate, null);
  assert.equal(repository.snapshot().outcomes.length, 1);
  assert.equal(repository.snapshot().outboxes.length, 0);
});

test('missing cell result fails incomplete with zero report/Candidate/outbox writes', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await service.recordExperimentResult(makeResultInput(run!, 1));

  await assertReason(() => service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-incomplete',
  }), 'VALIDATION_SUBJECT_INCOMPLETE');
  assert.equal(repository.snapshot().outcomes.length, 0);
  assert.equal(repository.snapshot().outboxes.length, 0);
});

test('simulation Attempt and fake envelope provenance are rejected', async () => {
  const run = makeRun();
  const simulation = makeHarness({
    runs: [run],
    attempts: makeAttempts(run, 'simulation', 'non_production_fake_provider'),
  });
  await assertReason(
    () => simulation.service.recordExperimentResult(makeResultInput(run, 1)),
    'EVIDENCE_PROVENANCE_REJECTED',
  );

  const real = makeHarness({ runs: [run] });
  const fakeEnvelope = {
    ...makeResultInput(run, 1),
    provenance: 'non_production_fake_provider',
  } as unknown as RecordExperimentResultV2Input;
  await assertReason(
    () => real.service.recordExperimentResult(fakeEnvelope),
    'EVIDENCE_PROVENANCE_REJECTED',
  );
  assert.equal(simulation.repository.snapshot().results.length, 0);
  assert.equal(real.repository.snapshot().results.length, 0);
});

test('manifest-hash drift fails before result or validation writes', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await assertReason(() => service.recordExperimentResult({
    ...makeResultInput(run!, 1),
    run_manifest_hash: hash('0'),
  }), 'VALIDATION_SCOPE_DRIFT');
  await assertReason(() => service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: hash('0'),
    idempotency_key: 'validation-key-drift',
  }), 'VALIDATION_SCOPE_DRIFT');
  assert.equal(repository.snapshot().results.length, 0);
  assert.equal(repository.snapshot().outcomes.length, 0);
});

test('duplicate result with same content converges and changed content conflicts', async () => {
  const { runs: [run], repository, service } = makeHarness();
  const input = makeResultInput(run!, 1);
  const first = await service.recordExperimentResult(input);
  const replay = await service.recordExperimentResult(structuredClone(input));
  assert.deepEqual(replay, first);
  assert.equal(repository.snapshot().results.length, 1);

  await assertReason(
    () => service.recordExperimentResult(makeResultInput(run!, 1, 0.8)),
    'VALIDATION_RESULT_CONFLICT',
  );
  assert.equal(repository.snapshot().results.length, 1);
});

test('validate replay with the same idempotency key returns stored outcome without new writes', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await recordCompleteBatch(service, run!);
  const request = {
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-replay',
  };
  const first = await service.validateScientificBatch(request);
  const replay = await service.validateScientificBatch(request);
  assert.deepEqual(replay, first);
  assert.equal(repository.snapshot().outcomes.length, 1);
  assert.equal(repository.snapshot().outboxes.length, 1);
});

test('different idempotency key for the same unchanged Run returns the stored outcome', async () => {
  const { runs: [run], repository, service } = makeHarness();
  await recordCompleteBatch(service, run!);
  const first = await service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-first',
  });
  const replay = await service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-second',
  });
  assert.deepEqual(replay, first);
  assert.equal(repository.snapshot().outcomes.length, 1);
  assert.equal(repository.snapshot().outboxes.length, 1);
});

test('service rejects caller-owned result hashes and validation statuses', async () => {
  const { runs: [run], repository, service } = makeHarness();
  const callerHashedResult = {
    ...makeResultInput(run!, 1),
    content_hash: hash('0'),
  } as unknown as RecordExperimentResultV2Input;
  await assertReason(
    () => service.recordExperimentResult(callerHashedResult),
    'VALIDATION_SCOPE_DRIFT',
  );

  const callerAuthoredStatus = {
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-caller-status',
    status: 'passed',
  } as unknown as Parameters<typeof service.validateScientificBatch>[0];
  await assertReason(
    () => service.validateScientificBatch(callerAuthoredStatus),
    'VALIDATION_SCOPE_DRIFT',
  );
  assert.equal(repository.snapshot().results.length, 0);
  assert.equal(repository.snapshot().outcomes.length, 0);
});

test('same idempotency key for a different Run fails idempotency conflict', async () => {
  const firstRun = makeRun('run-001', hash('1'));
  const secondRun = makeRun('run-002', hash('a'));
  const { repository, service } = makeHarness({ runs: [firstRun, secondRun] });
  await recordCompleteBatch(service, firstRun);
  await recordCompleteBatch(service, secondRun);
  await service.validateScientificBatch({
    run_id: firstRun.run_id,
    expected_run_manifest_hash: firstRun.run_manifest_hash,
    idempotency_key: 'validation-key-cross-run',
  });

  await assertReason(() => service.validateScientificBatch({
    run_id: secondRun.run_id,
    expected_run_manifest_hash: secondRun.run_manifest_hash,
    idempotency_key: 'validation-key-cross-run',
  }), 'VALIDATION_IDEMPOTENCY_CONFLICT');
  assert.equal(repository.snapshot().outcomes.length, 1);
  assert.equal(repository.snapshot().outboxes.length, 1);
});

test('absent head acknowledgement fails closed with zero validation outcome writes', async () => {
  const { runs: [run], repository, service } = makeHarness({ acknowledgements: false });
  await recordCompleteBatch(service, run!);

  await assertReason(() => service.validateScientificBatch({
    run_id: run!.run_id,
    expected_run_manifest_hash: run!.run_manifest_hash,
    idempotency_key: 'validation-key-no-head',
  }), 'VALIDATION_SCOPE_DRIFT');
  assert.equal(repository.snapshot().outcomes.length, 0);
  assert.equal(repository.snapshot().outboxes.length, 0);
});
