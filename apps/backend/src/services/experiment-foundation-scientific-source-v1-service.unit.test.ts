import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
  ExperimentFoundationExecutableTrainingTaskSpecV2,
  ExperimentFoundationProviderResultEnvelopeV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  ScientificSourceManifestV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
import type {
  ExperimentFoundationRunCellV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import { InMemoryExperimentFoundationScientificValidationV2Repository } from '../repositories/in-memory-experiment-foundation-scientific-validation-v2-repository.js';
import { InMemoryPaperImplementationEvidenceV2Repository } from '../repositories/in-memory-paper-implementation-evidence-v2-repository.js';
import type {
  ExperimentFoundationScientificResultGenerationAuthorityV2,
  ExperimentFoundationScientificValidationV2Protocol,
} from '../repositories/experiment-foundation-scientific-validation-v2.repository.js';
import type {
  ExperimentFoundationRealProviderCollectSuccessV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
  ExperimentFoundationScientificSourcePreparationServiceV1,
} from './experiment-foundation-scientific-source-v1-service.js';
import {
  ExperimentFoundationV2ScientificValidationService,
  type GenerateExperimentResultV2Input,
} from './experiment-foundation-v2-scientific-validation-service.js';
import { PaperImplementationEvidenceTrustGatewayService } from './paper-implementation-evidence-trust-gateway-service.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
const protocol: ExperimentFoundationScientificValidationV2Protocol = {
  evaluation_protocol: {
    asset_type: 'EvaluationProtocol',
    logical_id: 'protocol-1',
    revision_id: 'protocol-revision-1',
    revision_sequence: 1,
    content_hash: hash('a'),
  },
  protocol_snapshot: {
    schema_version: 'v2',
    protocol_key: 'latency-quality',
    display_name: 'Latency and quality',
    benchmark_dependency: {
      asset_type: 'Benchmark',
      logical_id: 'benchmark-1',
      revision_id: 'benchmark-revision-1',
      revision_sequence: 1,
      content_hash: hash('b'),
    },
    metric_dependencies: [{
      asset_type: 'MetricDefinition',
      logical_id: 'metric-1',
      revision_id: 'metric-revision-1',
      revision_sequence: 1,
      content_hash: hash('c'),
    }],
    required_rules: [
      {
        rule_id: 'quality-rule',
        rule_type: 'metric_contract@v1',
        metric_definition: {
          asset_type: 'MetricDefinition',
          logical_id: 'metric-1',
          revision_id: 'metric-revision-1',
          revision_sequence: 1,
          content_hash: hash('c'),
        },
        metric_key: 'quality',
        required_cardinality: 1,
        split_key: 'test',
        value_type: 'percentage',
        unit: 'score',
        finite_required: true,
      },
      {
        rule_id: 'raw-samples-rule',
        rule_type: 'artifact_contract@v1',
        artifact_kind: 'samples',
        file_name: 'raw-samples.ndjson',
        required_cardinality: 1,
        content_hash_required: true,
        parser_binding: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
      },
    ],
    scientific_contract: {
      schema_version: 'ExperimentFoundationScientificProtocol@v1',
      observation_slots: [
        {
          observation_key: 'quality',
          ordinal: 1,
          metric_key: 'quality',
          split_key: 'test',
          value_type: 'percentage',
          unit: 'score',
          statistic: { kind: 'mean' },
          uncertainty: { kind: 'standard_error' },
        },
        {
          observation_key: 'latency',
          ordinal: 2,
          metric_key: 'latency',
          split_key: 'test',
          value_type: 'duration_ns',
          unit: 'ns',
          statistic: { kind: 'quantile', probability: 0.95 },
          uncertainty: { kind: 'none' },
        },
      ],
      artifact_slots: [{
        artifact_key: 'raw-samples',
        ordinal: 1,
        artifact_kind: 'samples',
        required_rule_id: 'raw-samples-rule',
      }],
      comparison_rules: [{
        comparison_key: 'primary-quality',
        ordinal: 1,
        left_cell_ordinal: 1,
        right_cell_ordinal: 2,
        observation_key: 'quality',
        effect_kind: 'absolute_difference',
        direction: 'higher_is_support',
        support_min: 0.04,
        contradiction_max: -0.04,
        uncertainty_policy: { kind: 'not_required_by_protocol' },
      }],
      primary_comparison_key: 'primary-quality',
      decision_if_positive: 'continue-positive',
      decision_if_negative: 'continue-negative',
      decision_if_inconclusive: 'continue-inconclusive',
    },
  },
};

test('P1 source preparation exact-matches protocol slots, ignores provider order and replays', async () => {
  const service = preparationService();
  const fixture = createCollectionFixture(1, 0.82);
  const first = await service.prepare(fixture);
  const replay = await service.prepare(structuredClone(fixture));
  assert.equal(first.status, 'sealed');
  assert.deepEqual(replay, first);
  if (first.status !== 'sealed') return;
  assert.deepEqual(
    first.manifest.ordered_observations.map((observation) => observation.observation_key),
    ['quality', 'latency'],
  );
  assert.equal(first.manifest.ordered_observations[0]?.value, 0.82);
  assert.equal(first.manifest.ordered_artifacts[0]?.artifact_key, 'raw-samples');
  assert.equal(
    JSON.stringify(first.manifest).includes('oss://'),
    false,
  );
});

test('P1 scientific parsing degrades unsupported content to not_scientific without sealing', async () => {
  const service = preparationService();
  const fixture = createCollectionFixture(1, 0.82);
  const envelope = JSON.parse(
    fixture.collect_success.validated_result.canonical_envelope_json,
  ) as ExperimentFoundationProviderResultEnvelopeV1;
  delete envelope.outputs.scientific_result;
  fixture.collect_success = collectSuccess(envelope, 1);
  assert.deepEqual(await service.prepare(fixture), {
    status: 'not_scientific',
    reason: 'scientific_payload_absent',
  });
});

test('P1 source preparation rejects an unadmitted artifact rule binding before sealing', async () => {
  const invalidProtocol = structuredClone(protocol);
  invalidProtocol.protocol_snapshot.scientific_contract!.artifact_slots[0]!.required_rule_id =
    'unknown-artifact-rule';
  const service = preparationService(invalidProtocol);
  assert.deepEqual(await service.prepare(createCollectionFixture(1, 0.82)), {
    status: 'not_scientific',
    reason: 'artifact_rule_binding_invalid',
  });
});

test('P1 worker-side handoff revalidation rejects canonical byte drift before parsing', async () => {
  const service = preparationService();
  const fixture = createCollectionFixture(1, 0.82);
  fixture.collect_success = {
    ...fixture.collect_success,
    validated_result: {
      ...fixture.collect_success.validated_result,
      canonical_envelope_json:
        `${fixture.collect_success.validated_result.canonical_envelope_json} `,
    },
  };
  await assert.rejects(
    () => service.prepare(fixture),
    (error) => (
      error instanceof Error
      && 'reasonCode' in error
      && error.reasonCode === 'REAL_PROVIDER_RESULT_HANDOFF_CONFLICT'
    ),
  );
});

test('P1/P2 identity-only Results validate as a complete CMP-B1 batch and reject values', async () => {
  const preparer = preparationService();
  const sealed = await Promise.all([
    preparer.prepare(createCollectionFixture(1, 0.82)),
    preparer.prepare(createCollectionFixture(2, 0.77)),
  ]);
  assert.ok(sealed.every((item) => item.status === 'sealed'));
  const authorities = sealed.map((item) => {
    assert.equal(item.status, 'sealed');
    return authorityFromManifest(item.manifest, item.source_output_id, item.source_output_hash);
  });
  const repository = new InMemoryExperimentFoundationScientificValidationV2Repository({
    runs: [scientificRun()],
    protocols: { 'run-1': protocol },
    headAcknowledgements: [scientificHeadAcknowledgement()],
    scientificResultAuthorities: authorities,
  });
  const service = new ExperimentFoundationV2ScientificValidationService({
    repository,
    enabled: () => true,
    now: () => '2026-08-08T00:00:00.000Z',
  });
  const results = await Promise.all(authorities.map((authority) => (
    service.generateExperimentResult({
      run_cell_id: authority.run_cell_id,
      scientific_source_output_id: authority.source_output_id,
      idempotency_key: `${authority.source_output_id}:generate-scientific-result@v1`,
    })
  )));
  assert.equal(results.length, 2);
  assert.equal(repository.snapshot().source_bound_results.length, 2);
  assert.deepEqual(
    results.map((result) => result.metric_observations[0]?.value),
    [0.82, 0.77],
  );
  const replay = await service.generateExperimentResult({
    run_cell_id: authorities[0]!.run_cell_id,
    scientific_source_output_id: authorities[0]!.source_output_id,
    idempotency_key:
      `${authorities[0]!.source_output_id}:generate-scientific-result@v1`,
  });
  assert.deepEqual(replay, results[0]);

  await assert.rejects(
    () => repository.persistSourceBoundExperimentResult({
      result: {
        ...structuredClone(results[1]!),
        result_id: 'conflicting-attempt-result',
        run_cell_id: 'conflicting-attempt-cell',
        cell_key: 'conflicting-attempt-cell',
        execution_attempt_id: results[0]!.execution_attempt_id,
        source_output_id: 'conflicting-attempt-source',
      },
      created_at: '2026-08-08T00:00:00.000Z',
    }),
    /Execution Attempt is already bound to a different source-bound result/,
  );
  await assert.rejects(
    () => repository.persistSourceBoundExperimentResult({
      result: {
        ...structuredClone(results[1]!),
        result_id: 'conflicting-source-result',
        run_cell_id: 'conflicting-source-cell',
        cell_key: 'conflicting-source-cell',
        execution_attempt_id: 'conflicting-source-attempt',
        source_output_id: results[0]!.source_output_id,
      },
      created_at: '2026-08-08T00:00:00.000Z',
    }),
    /Scientific source output is already bound to a different result/,
  );

  const validation = await service.validateScientificBatch({
    run_id: 'run-1',
    expected_run_manifest_hash: hash('9'),
    idempotency_key: 'run-1:scientific-validation@v1',
  });
  assert.equal(validation.report.status, 'passed');
  assert.ok(validation.evidence_candidate);
  assert.equal(
    validation.report.ordered_rule_results.find(
      (result) => result.rule_id === 'raw-samples-rule',
    )?.status,
    'passed',
  );
  assert.equal(
    validation.report.ordered_comparison_results?.[0]?.fact?.registered_relation,
    'supports_registered_expectation',
  );
  assert.deepEqual(await service.getScientificValidation('run-1'), validation);

  const historicalProtocol = structuredClone(protocol);
  delete historicalProtocol.protocol_snapshot.scientific_contract!.primary_comparison_key;
  const historicalRepository = new InMemoryExperimentFoundationScientificValidationV2Repository({
    runs: [scientificRun()],
    protocols: { 'run-1': historicalProtocol },
    headAcknowledgements: [scientificHeadAcknowledgement()],
    scientificResultAuthorities: authorities,
  });
  const historicalService = new ExperimentFoundationV2ScientificValidationService({
    repository: historicalRepository,
    enabled: () => true,
    now: () => '2026-08-08T00:00:00.000Z',
  });
  await Promise.all(authorities.map((authority) => historicalService.generateExperimentResult({
    run_cell_id: authority.run_cell_id,
    scientific_source_output_id: authority.source_output_id,
    idempotency_key: `${authority.source_output_id}:generate-scientific-result@v1`,
  })));
  await assert.rejects(
    () => historicalService.validateScientificBatch({
      run_id: 'run-1',
      expected_run_manifest_hash: hash('9'),
      idempotency_key: 'historical-protocol-validation',
    }),
    (error) => error instanceof AppError && error.details?.reason_code === 'VALIDATION_SCOPE_DRIFT',
  );
  const piRepository = new InMemoryPaperImplementationEvidenceV2Repository({
    authorities: [{
      implementation_project_id: 'implementation-project-1',
      validation_cycle_id: 'validation-cycle-1',
      branch_id: 'branch-1',
      branch_key: 'branch-key-1',
      work_order_revision_id: 'work-order-revision-1',
      work_order_revision_hash: hash('e'),
      branch_revision_sequence: 1,
      cell_plan_hash: hash('a'),
      approved_plan_hash: hash('b'),
      current_work_order_revision_id: 'work-order-revision-1',
      current_branch_revision_sequence: 1,
      head_work_order_revision_id: 'work-order-revision-1',
      head_branch_revision_sequence: 1,
      head_run_id: 'run-1',
      head_run_manifest_hash: hash('9'),
      validation_cycle_closure_id: null,
    }],
  });
  const gateway = new PaperImplementationEvidenceTrustGatewayService({
    repository: piRepository,
    scientificValidationReadRepository: repository,
    now: () => '2026-08-08T00:00:00.000Z',
  });
  const qualifiedEvent = repository.snapshot().outboxes[0]?.event;
  assert.ok(qualifiedEvent);
  const registered = await gateway.consume(qualifiedEvent);
  assert.ok(registered.run_evidence_unit);
  assert.ok(registered.trace_manifest);
  const piSnapshot = piRepository.snapshot();
  assert.equal(piSnapshot.run_evidence_units.length, 1);
  assert.equal(piSnapshot.trace_manifests.length, 1);
  assert.equal(piSnapshot.outboxes.length, 1);
  assert.equal(piSnapshot.outboxes[0]?.event.event_type, 'RunEvidenceUnitRegistered');
  const replayed = await gateway.consume(qualifiedEvent);
  assert.equal(replayed.replayed, true);
  assert.deepEqual(piRepository.snapshot(), piSnapshot);

  const callerAuthored = {
    run_cell_id: authorities[0]!.run_cell_id,
    scientific_source_output_id: authorities[0]!.source_output_id,
    idempotency_key: 'malicious-replay',
    metric_observations: [{ value: 999 }],
  } as unknown as GenerateExperimentResultV2Input;
  await assert.rejects(
    () => service.generateExperimentResult(callerAuthored),
    (error) => error instanceof AppError && error.details?.reason_code === 'VALIDATION_SCOPE_DRIFT',
  );
});

test('P2 contradiction and indeterminate facts remain evidence eligible', async () => {
  for (const fixture of [
    { values: [0.7, 0.8] as const, relation: 'contradicts_registered_expectation' },
    { values: [0.8, 0.78] as const, relation: 'indeterminate' },
  ] as const) {
    const preparer = preparationService();
    const sealed = await Promise.all([
      preparer.prepare(createCollectionFixture(1, fixture.values[0])),
      preparer.prepare(createCollectionFixture(2, fixture.values[1])),
    ]);
    const authorities = sealed.map((item) => {
      assert.equal(item.status, 'sealed');
      if (item.status !== 'sealed') throw new Error('Expected sealed source fixture.');
      return authorityFromManifest(item.manifest, item.source_output_id, item.source_output_hash);
    });
    const repository = new InMemoryExperimentFoundationScientificValidationV2Repository({
      runs: [scientificRun()],
      protocols: { 'run-1': protocol },
      headAcknowledgements: [scientificHeadAcknowledgement()],
      scientificResultAuthorities: authorities,
    });
    const service = new ExperimentFoundationV2ScientificValidationService({
      repository,
      enabled: () => true,
      now: () => '2026-08-08T00:00:00.000Z',
    });
    await Promise.all(authorities.map((authority) => service.generateExperimentResult({
      run_cell_id: authority.run_cell_id,
      scientific_source_output_id: authority.source_output_id,
      idempotency_key: `${authority.source_output_id}:generate-scientific-result@v1`,
    })));
    const validation = await service.validateScientificBatch({
      run_id: 'run-1',
      expected_run_manifest_hash: hash('9'),
      idempotency_key: `run-1:${fixture.relation}:validation@v1`,
    });
    assert.equal(
      validation.report.ordered_comparison_results?.[0]?.fact?.registered_relation,
      fixture.relation,
    );
    assert.ok(validation.evidence_candidate);
  }
});

function preparationService(
  resolvedProtocol: ExperimentFoundationScientificValidationV2Protocol = protocol,
) {
  return new ExperimentFoundationScientificSourcePreparationServiceV1({
    protocolResolver: async () => structuredClone(resolvedProtocol),
  });
}

function scientificRun() {
  return {
    run_id: 'run-1',
    run_recipe_id: 'recipe-1',
    run_manifest_hash: hash('9'),
    external_pi_branch_id: 'branch-1',
    external_pi_work_order_revision_id: 'work-order-revision-1',
    external_pi_work_order_revision_hash: hash('e'),
    external_pi_revision_sequence: 1,
    ordered_cells: [
      createCollectionFixture(1, 0.82).run_cell,
      createCollectionFixture(2, 0.77).run_cell,
    ],
  };
}

function scientificHeadAcknowledgement() {
  return {
    inbox_id: 'inbox-1',
    event_id: 'event-1',
    correlation_id: 'correlation-1',
    implementation_project_id: 'implementation-project-1',
    validation_cycle_id: 'validation-cycle-1',
    branch_id: 'branch-1',
    branch_key: 'branch-key-1',
    work_order_revision_id: 'work-order-revision-1',
    revision_sequence: 1,
    work_order_revision_hash: hash('e'),
    cell_plan_hash: hash('a'),
    approved_plan_hash: hash('b'),
    run_id: 'run-1',
    run_manifest_hash: hash('9'),
  };
}

function createCollectionFixture(
  ordinal: number,
  quality: number,
): Parameters<ExperimentFoundationScientificSourcePreparationServiceV1['prepare']>[0] {
  const runCell: ExperimentFoundationRunCellV2 = {
    run_cell_id: `run-cell-${ordinal}`,
    run_id: 'run-1',
    ordinal,
    cell_key: `cell-${ordinal}`,
    external_pi_cell_id: `pi-cell-${ordinal}`,
    external_pi_cell_hash: hash('d'),
    training_task_spec_id: `task-${ordinal}`,
    training_task_spec_hash: hash(String(ordinal)),
    seed: ordinal,
    repeat_index: 1,
  };
  const task: ExperimentFoundationExecutableTrainingTaskSpecV2 = {
    training_task_spec_id: runCell.training_task_spec_id,
    materialization_key: `materialization-${ordinal}`,
    run_recipe_id: 'recipe-1',
    external_pi_work_order_revision_id: 'work-order-revision-1',
    external_pi_work_order_revision_hash: hash('e'),
    external_pi_cell_id: runCell.external_pi_cell_id,
    external_pi_cell_hash: runCell.external_pi_cell_hash,
    execution_bundle: {
      execution_bundle_id: 'bundle-1',
      execution_bundle_revision_id: 'bundle-revision-1',
      revision_sequence: 1,
      content_hash: hash('f'),
    },
    command_snapshot: { command: 'python3', arguments: ['experiment.py'] },
    io_snapshot: {
      input_keys: ['dataset'],
      output_keys: ['real_provider_result_envelope'],
      input_mirror_ordinals: [1],
      result_object_name: 'result.json',
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
      parser_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
      parser_profile_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
      scientific_result_schema_version: 'ExperimentFoundationScientificResultPayload@v1',
      scientific_result_schema_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
    },
    resource_snapshot: { cpu_cores: 1, memory_mb: 1024 },
    retry_snapshot: { max_attempts: 1, timeout_seconds: 600 },
    task_spec_hash: runCell.training_task_spec_hash,
    created_at: '2026-08-08T00:00:00.000Z',
  };
  const envelope: ExperimentFoundationProviderResultEnvelopeV1 = {
    result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
    execution_bundle_revision_id: task.execution_bundle.execution_bundle_revision_id,
    execution_bundle_revision_hash: task.execution_bundle.content_hash,
    run_id: runCell.run_id,
    run_manifest_hash: hash('9'),
    run_cell_id: runCell.run_cell_id,
    cell_key: runCell.cell_key,
    training_task_spec_id: task.training_task_spec_id,
    training_task_spec_hash: task.task_spec_hash,
    parser_profile_version: task.io_snapshot.parser_profile_version,
    parser_profile_hash: task.io_snapshot.parser_profile_hash,
    outputs: {
      scientific_result: {
        schema_version: 'ExperimentFoundationScientificResultPayload@v1',
        observations: [
          {
            observation_key: 'latency',
            metric_key: 'latency',
            split_key: 'test',
            value: 42 + ordinal,
            value_type: 'duration_ns',
            unit: 'ns',
            statistic: { kind: 'quantile', sample_size: 100, probability: 0.95 },
            uncertainty: { kind: 'none', reason: 'not_required_by_protocol' },
          },
          {
            observation_key: 'quality',
            metric_key: 'quality',
            split_key: 'test',
            value: quality,
            value_type: 'percentage',
            unit: 'score',
            statistic: { kind: 'mean', sample_size: 100 },
            uncertainty: { kind: 'standard_error', value: 0.01 },
          },
        ],
        artifacts: [{
          artifact_key: 'raw-samples',
          artifact_kind: 'samples',
          content_hash: hash('8'),
          byte_size: 2048,
          media_type: 'application/x-ndjson',
        }],
      },
    },
  };
  return {
    collect_success: collectSuccess(envelope, ordinal),
    collection_attempt_id: `collection-${ordinal}`,
    execution_attempt_id: `attempt-${ordinal}`,
    run_manifest_hash: envelope.run_manifest_hash,
    run_cell: runCell,
    task_spec: task,
  };
}

function collectSuccess(
  envelope: ExperimentFoundationProviderResultEnvelopeV1,
  ordinal: number,
): ExperimentFoundationRealProviderCollectSuccessV2 {
  const canonical = canonicalizeExperimentV2Json(envelope);
  const outcome: ExperimentFoundationAliyunNormalizedProviderOutcomeV1 = {
    outcome_schema_version: 'AliyunPaiDlcNormalizedOutcome@v1',
    adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
    operation: 'collect',
    provider_idempotency_key: `provider-key-${ordinal}`,
    payload_hash: hash('7'),
    external_job_ref: {
      ref_type: 'aliyun_pai_dlc_job',
      job_id: `job-${ordinal}`,
      region_id_hash: hash('6'),
    },
    provider_status: 'Succeeded',
    normalized_state: 'succeeded',
    result_manifest_hash: hash('5'),
    response_hash: hash('4'),
  };
  return {
    outcome: outcome as ExperimentFoundationRealProviderCollectSuccessV2['outcome'],
    validated_result: {
      handoff_schema_version: 'ExperimentFoundationValidatedProviderResultEnvelope@v1',
      canonical_envelope_json: canonical,
      envelope_content_hash: serverHashExperimentV2SemanticContent({
        record_kind: 'AliyunPaiDlcCollectedResultEnvelope',
        schema_version: 'v1',
        hash_profile: 'ef-real-provider-control-json@v1',
        content: envelope,
      }),
      envelope_byte_size: Buffer.byteLength(canonical, 'utf8'),
    },
  };
}

function authorityFromManifest(
  manifest: ScientificSourceManifestV1,
  sourceOutputId: string,
  sourceOutputHash: string,
): ExperimentFoundationScientificResultGenerationAuthorityV2 {
  return {
    source_output_id: sourceOutputId,
    source_output_hash: sourceOutputHash,
    collection_attempt_id: manifest.authority.collection_attempt_id,
    execution_attempt_id: manifest.authority.execution_attempt_id,
    run_id: manifest.execution_lineage.run_id,
    run_manifest_hash: manifest.execution_lineage.run_manifest_hash,
    run_cell_id: manifest.execution_lineage.run_cell_id,
    cell_key: manifest.execution_lineage.cell_key,
    training_task_spec_id: manifest.execution_lineage.training_task_spec_id,
    training_task_spec_hash: manifest.execution_lineage.training_task_spec_hash,
    source_manifest: manifest,
  };
}
