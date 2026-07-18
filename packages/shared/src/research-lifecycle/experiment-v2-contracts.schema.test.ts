import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  assertExperimentV2EventPayloadHash,
  canonicalizeExperimentV2Json,
  EXPERIMENT_V2_HASH_PROFILES,
  serverHashExperimentFoundationExecutionAttemptEventV2,
  serverHashExperimentFoundationProviderCommandV2,
  serverHashExperimentFoundationProviderControlV2Semantic,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashExperimentV2SemanticContent,
  verifyExperimentV2EventPayloadHash,
} from './experiment-v2-canonical-hash.js';
import {
  EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS,
  EXPERIMENT_FOUNDATION_V2_ASSET_TYPES,
  experimentFoundationBenchmarkV2Schema,
  experimentFoundationBenchmarkRevisionV2Schema,
  experimentFoundationDataPolicyV2Schema,
  experimentFoundationDataPolicyRevisionV2Schema,
  experimentFoundationDatasetV2Schema,
  experimentFoundationDatasetRevisionV2Schema,
  experimentFoundationEvaluationProtocolV2Schema,
  experimentFoundationEvaluationProtocolRevisionV2Schema,
  experimentFoundationMetricDefinitionV2Schema,
  experimentFoundationMetricDefinitionRevisionV2Schema,
  experimentFoundationTrainingTaskIoSnapshotV2Schema,
  experimentFoundationV2BenchmarkDraftContentV1Schema,
  experimentFoundationV2DataPolicyDraftContentV1Schema,
  experimentFoundationV2DatasetDraftContentV1Schema,
  experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
  experimentFoundationV2ExactAssetRevisionRefSchema,
  experimentFoundationV2FreezeDraftRequestSchema,
  experimentFoundationV2MetricDefinitionDraftContentV1Schema,
  experimentFoundationV2UpdateBenchmarkDraftRequestSchema,
  experimentFoundationV2UpdateDataPolicyDraftRequestSchema,
  experimentFoundationV2UpdateDatasetDraftRequestSchema,
  experimentFoundationV2UpdateEvaluationProtocolDraftRequestSchema,
  experimentFoundationV2UpdateMetricDefinitionDraftRequestSchema,
  type ExperimentFoundationV2ExactAssetRevisionRef,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_V2_EVENT_TYPES,
  EXPERIMENT_V2_REASON_CODES,
  EXPERIMENT_V2_TOP_LEVEL_ERROR_CODES,
  branchHeadAdvancedEventV1Schema,
  experimentV2ErrorEnvelopeSchema,
  experimentV2IntegrationEventSchema,
  paperImplementationExperimentV2AdmissionRequestSchema,
  runManifestFrozenEventV1Schema,
  workOrderRevisionAdmittedEventV1Schema,
  type BranchHeadAdvancedEventV1,
  type RunManifestFrozenEventV1,
  type WorkOrderRevisionAdmittedEventV1,
  type WorkOrderRevisionAdmittedPayloadV1,
  type PaperImplementationExperimentV2ExactCellInput,
  type PaperImplementationExperimentV2WorkOrderRevisionSnapshot,
} from './paper-implementation-experiment-v2-contracts.js';
import { EXPERIMENT_V2_HASH_PATTERN } from './experiment-v2-contract-limits.js';

type JsonSchema = Readonly<Record<string, unknown>>;

const timestamp = '2026-07-13T00:00:00.000Z';
const hashes = {
  a: `sha256:${'a'.repeat(64)}`,
  b: `sha256:${'b'.repeat(64)}`,
  c: `sha256:${'c'.repeat(64)}`,
  d: `sha256:${'d'.repeat(64)}`,
};

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload: payload as object,
  });
  await app.close();
  return response.statusCode === 200;
}

function exactRef<TAssetType extends (typeof EXPERIMENT_FOUNDATION_V2_ASSET_TYPES)[number]>(
  assetType: TAssetType,
  suffix: string,
  contentHash = hashes.a,
): ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: TAssetType } {
  return {
    asset_type: assetType,
    logical_id: `${assetType.toLowerCase()}_${suffix}`,
    revision_id: `${assetType.toLowerCase()}_revision_${suffix}`,
    revision_sequence: 1,
    content_hash: contentHash,
  };
}

function dataPolicyContent() {
  return {
    schema_version: 'v1',
    policy_key: 'natural_questions_source_policy',
    display_name: 'Natural Questions source policy',
    license_expression: 'LicenseRef-Source-Terms',
    access_level: 'open',
    source_terms_uri: 'https://example.test/source-terms',
    redistribution_allowed: false,
    commercial_use_allowed: false,
    use_constraints: ['research_only'],
  };
}

function datasetContent() {
  return {
    schema_version: 'v1',
    dataset_key: 'natural_questions_queries',
    display_name: 'Natural Questions query workload',
    version_label: 'ragperf-source-v1',
    dataset_role: 'query_workload',
    source_identity: {
      source_name: 'Natural Questions',
      source_revision: 'ragperf-source-v1',
      source_uri: 'https://example.test/natural-questions',
    },
    checksum_manifest: {
      manifest_version: 'v1',
      algorithm: 'sha256',
      entries: [
        {
          path: 'queries.jsonl',
          byte_size: 1024,
          checksum: 'a'.repeat(64),
        },
      ],
      aggregate_checksum: 'b'.repeat(64),
    },
    split_protocol: {
      protocol_version: 'v1',
      splits: [
        {
          ordinal: 1,
          split_key: 'test',
          split_role: 'query',
          source_selector: 'split=test',
        },
      ],
    },
    data_policy: exactRef('DataPolicy', 'nq', hashes.b),
  };
}

function metricContent() {
  return {
    schema_version: 'v1',
    metric_key: 'qps',
    display_name: 'Queries per second',
    direction: 'higher_is_better',
    value_type: 'number',
    unit: 'queries_per_second',
    evaluator_binding: {
      evaluator_key: 'ragperf_metrics',
      evaluator_version: 'v1',
    },
  };
}

function benchmarkContent() {
  return {
    schema_version: 'v1',
    benchmark_key: 'ragperf_adapter',
    display_name: 'RAGPerf adapter benchmark',
    description: 'Exact corpus and query workload binding.',
    corpus_dataset: exactRef('Dataset', 'wikipedia', hashes.a),
    query_workload_dataset: exactRef('Dataset', 'nq', hashes.b),
  };
}

function evaluationProtocolContent() {
  const metric = exactRef('MetricDefinition', 'qps', hashes.c);
  return {
    schema_version: 'v2',
    protocol_key: 'ragperf_adapter_v2',
    display_name: 'RAGPerf adapter protocol v2',
    benchmark_dependency: exactRef('Benchmark', 'ragperf', hashes.d),
    metric_dependencies: [metric],
    required_rules: [
      {
        rule_id: 'artifact_contract@v1:text_pipeline_stats',
        rule_type: 'artifact_contract@v1',
        artifact_kind: 'text_pipeline_stats',
        file_name: 'text_pipeline_stats.txt',
        required_cardinality: 1,
        content_hash_required: true,
        parser_binding: 'ragperf_text_pipeline_stats@v1',
      },
      {
        rule_id: 'metric_contract@v1:qps',
        rule_type: 'metric_contract@v1',
        metric_definition: metric,
        metric_key: 'qps',
        required_cardinality: 1,
        split_key: 'test',
        value_type: 'number',
        unit: 'queries_per_second',
        finite_required: true,
      },
    ],
  };
}

function workOrderRevision(): PaperImplementationExperimentV2WorkOrderRevisionSnapshot {
  return {
    work_order_schema_version: 'v1',
    title: 'Two-cell RAGPerf adapter run',
    objective: 'Freeze an exact two-cell batch.',
    readiness_attestation_id: 'readiness_001',
    readiness_attestation_hash: hashes.d,
    asset_dependencies: [
      exactRef('Dataset', 'wikipedia', hashes.a),
      exactRef('DataPolicy', 'wikipedia', hashes.b),
      exactRef('MetricDefinition', 'qps', hashes.c),
      exactRef('Benchmark', 'ragperf', hashes.d),
      exactRef('EvaluationProtocol', 'ragperf_v2', hashes.a),
    ],
    run_policy: {
      max_attempts_per_cell: 2,
      timeout_seconds: 3600,
    },
  };
}

function exactCell(
  cellKey: string,
  seed: number,
  repeatIndex: number,
): PaperImplementationExperimentV2ExactCellInput {
  return {
    cell_key: cellKey,
    seed,
    repeat_index: repeatIndex,
    parameters: [
      { name: 'top_k', value: cellKey === 'cell_a' ? 5 : 10 },
      { name: 'rerank', value: true },
    ],
    required_result_contract: {
      metrics: [
        {
          metric_definition: exactRef('MetricDefinition', 'qps', hashes.c),
          required_cardinality: 1,
        },
      ],
      artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
    },
  };
}

function admissionRequest() {
  return {
    branch_key: 'ragperf_primary',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'RAGPerf primary branch',
      scientific_intent: 'Compare two retrieval depths.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: workOrderRevision(),
    exact_cells: [exactCell('cell_a', 42, 0), exactCell('cell_b', 43, 0)],
    business_idempotency_key: 'admission:ragperf:001',
  };
}

function eventScope() {
  return {
    implementation_project_id: 'implementation_project_001',
    validation_cycle_id: 'validation_cycle_001',
    branch_id: 'branch_001',
    branch_key: 'ragperf_primary',
    work_order_revision_id: 'work_order_revision_001',
    work_order_revision_hash: hashes.a,
    branch_revision_sequence: 1,
    cell_plan_hash: hashes.b,
    approved_plan_hash: hashes.c,
  };
}

function admittedPayload(): WorkOrderRevisionAdmittedPayloadV1 {
  return {
    admission_id: 'admission_001',
    branch_frame_hash: hashes.d,
    work_order_revision: workOrderRevision(),
    readiness_attestation_id: 'readiness_001',
    readiness_attestation_hash: hashes.d,
    asset_dependencies: workOrderRevision().asset_dependencies,
    exact_cells: [
      {
        ordinal: 1,
        work_order_cell_id: 'work_order_cell_001',
        cell_hash: hashes.a,
        ...exactCell('cell_a', 42, 0),
      },
      {
        ordinal: 2,
        work_order_cell_id: 'work_order_cell_002',
        cell_hash: hashes.b,
        ...exactCell('cell_b', 43, 0),
      },
    ],
  };
}

function admittedEvent(): WorkOrderRevisionAdmittedEventV1 {
  const payload = admittedPayload();
  return {
    event_id: 'event_admitted_001',
    event_type: 'WorkOrderRevisionAdmitted',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: timestamp,
    correlation_id: 'correlation_001',
    causation_id: 'admission_001',
    business_idempotency_key: 'admission:ragperf:001',
    ...eventScope(),
    payload_hash: serverHashExperimentV2EventPayload(
      'WorkOrderRevisionAdmitted',
      'v1',
      payload,
    ),
    payload,
  };
}

function runFrozenEvent(): RunManifestFrozenEventV1 {
  const payload = {
    source_event_id: 'event_admitted_001',
    version_lock_id: 'version_lock_001',
    version_lock_hash: hashes.a,
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: hashes.b,
    run_id: 'run_001',
    run_manifest_hash: hashes.c,
    task_spec_bindings: [
      {
        ordinal: 1,
        work_order_cell_id: 'work_order_cell_001',
        cell_key: 'cell_a',
        cell_hash: hashes.a,
        training_task_spec_id: 'task_spec_001',
        training_task_spec_hash: hashes.c,
      },
      {
        ordinal: 2,
        work_order_cell_id: 'work_order_cell_002',
        cell_key: 'cell_b',
        cell_hash: hashes.b,
        training_task_spec_id: 'task_spec_002',
        training_task_spec_hash: hashes.d,
      },
    ],
  };
  return {
    event_id: 'event_run_frozen_001',
    event_type: 'RunManifestFrozen',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: timestamp,
    correlation_id: 'correlation_001',
    causation_id: 'event_admitted_001',
    business_idempotency_key: 'run-freeze:work-order-revision-001',
    ...eventScope(),
    payload_hash: serverHashExperimentV2EventPayload('RunManifestFrozen', 'v1', payload),
    payload,
  };
}

function headAdvancedEvent(): BranchHeadAdvancedEventV1 {
  const payload = {
    source_event_id: 'event_run_frozen_001',
    run_id: 'run_001',
    run_manifest_hash: hashes.c,
    accepted_revision_sequence: 1,
    branch_state_version: 2,
  };
  return {
    event_id: 'event_head_advanced_001',
    event_type: 'BranchHeadAdvanced',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: timestamp,
    correlation_id: 'correlation_001',
    causation_id: 'event_run_frozen_001',
    business_idempotency_key: 'head-advance:branch-001:sequence-1',
    ...eventScope(),
    payload_hash: serverHashExperimentV2EventPayload('BranchHeadAdvanced', 'v1', payload),
    payload,
  };
}

test('canonical JSON sorts object keys but preserves authoritative array order', () => {
  const left = canonicalizeExperimentV2Json({ z: 1, a: { y: true, x: 'value' } });
  const right = canonicalizeExperimentV2Json({ a: { x: 'value', y: true }, z: 1 });
  assert.equal(left, '{"a":{"x":"value","y":true},"z":1}');
  assert.equal(left, right);

  const ordered = serverHashExperimentV2SemanticContent({
    record_kind: 'DatasetRevisionContent',
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content: { dependencies: ['a', 'b'] },
  });
  const reordered = serverHashExperimentV2SemanticContent({
    record_kind: 'DatasetRevisionContent',
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content: { dependencies: ['b', 'a'] },
  });
  assert.match(ordered, new RegExp(EXPERIMENT_V2_HASH_PATTERN));
  assert.notEqual(ordered, reordered);
});

test('canonical hashing is domain-separated and rejects non-JSON inputs', () => {
  const input = {
    record_kind: 'DatasetRevisionContent',
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1' as const,
    content: datasetContent(),
  };
  const first = serverHashExperimentV2SemanticContent(input);
  const replay = serverHashExperimentV2SemanticContent({
    ...input,
    content: JSON.parse(JSON.stringify(input.content)) as unknown,
  });
  const differentKind = serverHashExperimentV2SemanticContent({
    ...input,
    record_kind: 'BenchmarkContent',
  });
  assert.equal(first, replay);
  assert.notEqual(first, differentKind);
  assert.throws(() => canonicalizeExperimentV2Json({ invalid: Number.NaN }), /Non-finite/);
  assert.throws(() => canonicalizeExperimentV2Json({ invalid: undefined }), /Undefined/);
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalizeExperimentV2Json(cyclic), /Cyclic/);
});

test('execution hash builders own explicit profiles without record-name heuristics', () => {
  assert.equal(Object.isFrozen(EXPERIMENT_V2_HASH_PROFILES), true);
  const eventContent = {
    execution_attempt_id: 'attempt-1',
    event_sequence: 1,
    event_type: 'created' as const,
    prior_state: null,
    next_state: 'prepared' as const,
    provider_command_id: null,
    payload_hash: `sha256:${'a'.repeat(64)}`,
    external_job_ref: null,
    external_job_ref_hash: null,
    event_snapshot: {
      snapshot_schema_version: 'v1' as const,
      reason_code: null,
      observed_provider_state: null,
      note: null,
    },
    occurred_at: timestamp,
  };
  const commandContent = {
    provider_idempotency_key: 'provider-command-1',
    command_snapshot: {
      command_schema_version: 'v1' as const,
      operation: 'submit' as const,
      provider_payload_id: 'payload-1',
      provider_payload_hash: `sha256:${'a'.repeat(64)}`,
      external_job_ref: null,
      cancellation_reason: null,
    },
  };
  assert.equal(
    serverHashExperimentFoundationExecutionAttemptEventV2(eventContent),
    serverHashExperimentV2SemanticContent({
      record_kind: 'ExperimentFoundationExecutionAttemptEventV2',
      schema_version: 'v1',
      hash_profile: 'ef-execution-attempt-event-json@v1',
      content: eventContent,
    }),
  );
  assert.equal(
    serverHashExperimentFoundationProviderCommandV2(commandContent),
    serverHashExperimentV2SemanticContent({
      record_kind: 'ExperimentFoundationProviderCommandV2',
      schema_version: 'v1',
      hash_profile: 'ef-provider-command-json@v1',
      content: commandContent,
    }),
  );
  assert.equal(
    serverHashExperimentFoundationProviderControlV2Semantic('NameContainingEvent', eventContent),
    serverHashExperimentV2SemanticContent({
      record_kind: 'NameContainingEvent',
      schema_version: 'v1',
      hash_profile: 'ef-provider-control-json@v1',
      content: eventContent,
    }),
  );
});

test('the closed five-family asset schemas accept named authoritative snapshots', async () => {
  const cases: Array<[JsonSchema, unknown]> = [
    [experimentFoundationV2DatasetDraftContentV1Schema, datasetContent()],
    [experimentFoundationV2DataPolicyDraftContentV1Schema, dataPolicyContent()],
    [experimentFoundationV2MetricDefinitionDraftContentV1Schema, metricContent()],
    [experimentFoundationV2BenchmarkDraftContentV1Schema, benchmarkContent()],
    [
      experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
      evaluationProtocolContent(),
    ],
  ];
  assert.deepEqual(EXPERIMENT_FOUNDATION_V2_ASSET_TYPES, [
    'Dataset',
    'DataPolicy',
    'MetricDefinition',
    'Benchmark',
    'EvaluationProtocol',
  ]);
  for (const [schema, payload] of cases) {
    assert.equal(await validates(schema, payload), true);
    assert.equal(await validates(schema, { ...(payload as object), generic_payload: {} }), false);
  }
  assert.equal(
    await validates(experimentFoundationV2ExactAssetRevisionRefSchema, {
      ...exactRef('Dataset', 'nq'),
      asset_type: 'BaselineImplementationVersion',
    }),
    false,
  );
});

test('TrainingTaskSpec output keys are the exact bounded Pack B diagnostic vocabulary', async () => {
  const schema = experimentFoundationTrainingTaskIoSnapshotV2Schema;
  const exact = {
    input_keys: ['version_lock', 'admitted_cell'],
    output_keys: [...EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS],
  };
  assert.equal(await validates(schema, exact), true);
  assert.equal(await validates(schema, {
    ...exact,
    output_keys: ['simulation_collection_log'],
  }), true);
  assert.equal(await validates(schema, {
    ...exact,
    output_keys: [
      ...EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS,
      'simulation_lifecycle_trace',
    ],
  }), false, 'four outputs must fail before materialization');
  assert.equal(await validates(schema, {
    ...exact,
    output_keys: ['unknown_diagnostic'],
  }), false, 'unknown output keys must fail closed');
  assert.equal(await validates(schema, {
    ...exact,
    output_keys: ['simulation_lifecycle_trace', 'simulation_lifecycle_trace'],
  }), false, 'duplicate output keys must fail closed');
});

test('named immutable revision read models accept server hashes and reject snapshot drift', async () => {
  const base = {
    logical_id: 'logical_001',
    revision_id: 'revision_001',
    revision_sequence: 1,
    hash_profile: 'ef-asset-semantic-json@v1',
    content_hash: hashes.a,
    created_at: timestamp,
  };
  const cases: Array<[JsonSchema, unknown]> = [
    [
      experimentFoundationDatasetRevisionV2Schema,
      { ...base, schema_version: 'v1', dataset_revision: datasetContent() },
    ],
    [
      experimentFoundationDataPolicyRevisionV2Schema,
      { ...base, schema_version: 'v1', data_policy_revision: dataPolicyContent() },
    ],
    [
      experimentFoundationMetricDefinitionRevisionV2Schema,
      { ...base, schema_version: 'v1', metric_definition_revision: metricContent() },
    ],
    [
      experimentFoundationBenchmarkRevisionV2Schema,
      { ...base, schema_version: 'v1', benchmark_revision: benchmarkContent() },
    ],
    [
      experimentFoundationEvaluationProtocolRevisionV2Schema,
      {
        ...base,
        schema_version: 'v2',
        evaluation_protocol_revision: evaluationProtocolContent(),
      },
    ],
  ];
  for (const [schema, payload] of cases) {
    assert.equal(await validates(schema, payload), true);
    assert.equal(await validates(schema, { ...(payload as object), payload: {} }), false);
  }
});

test('named asset identity schemas expose semantic family keys independently from logical ids', async () => {
  const base = {
    logical_id: 'logical_identity_001',
    draft_state_version: 1,
    current_revision_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const cases: Array<[JsonSchema, string, string, string, unknown]> = [
    [
      experimentFoundationDatasetV2Schema,
      'dataset_key',
      'natural_questions_queries',
      'dataset_draft',
      datasetContent(),
    ],
    [
      experimentFoundationDataPolicyV2Schema,
      'policy_key',
      'natural_questions_source_policy',
      'data_policy_draft',
      dataPolicyContent(),
    ],
    [experimentFoundationMetricDefinitionV2Schema, 'metric_key', 'qps', 'metric_definition_draft', metricContent()],
    [experimentFoundationBenchmarkV2Schema, 'benchmark_key', 'ragperf_adapter', 'benchmark_draft', benchmarkContent()],
    [
      experimentFoundationEvaluationProtocolV2Schema,
      'protocol_key',
      'ragperf_adapter_v2',
      'evaluation_protocol_draft',
      evaluationProtocolContent(),
    ],
  ];

  for (const [schema, keyProperty, semanticKey, draftProperty, draft] of cases) {
    const payload = {
      ...base,
      [keyProperty]: semanticKey,
      [draftProperty]: draft,
    };
    assert.notEqual(payload.logical_id, semanticKey);
    assert.equal(await validates(schema, payload), true);
    assert.equal(await validates(schema, { ...payload, [keyProperty]: undefined }), false);
  }
});

test('external asset draft authoring schemas reject every caller canonical-hash field', async () => {
  const cases: Array<[JsonSchema, string, unknown]> = [
    [experimentFoundationV2UpdateDatasetDraftRequestSchema, 'dataset_draft', datasetContent()],
    [
      experimentFoundationV2UpdateDataPolicyDraftRequestSchema,
      'data_policy_draft',
      dataPolicyContent(),
    ],
    [
      experimentFoundationV2UpdateMetricDefinitionDraftRequestSchema,
      'metric_definition_draft',
      metricContent(),
    ],
    [
      experimentFoundationV2UpdateBenchmarkDraftRequestSchema,
      'benchmark_draft',
      benchmarkContent(),
    ],
    [
      experimentFoundationV2UpdateEvaluationProtocolDraftRequestSchema,
      'evaluation_protocol_draft',
      evaluationProtocolContent(),
    ],
  ];
  for (const [schema, property, draft] of cases) {
    const request = { expected_state_version: 1, [property]: draft };
    assert.equal(await validates(schema, request), true);
    assert.equal(await validates(schema, { ...request, expected_state_version: 0 }), false);
    assert.equal(await validates(schema, { ...request, canonical_hash: hashes.a }), false);
    assert.equal(await validates(schema, { ...request, content_hash: hashes.a }), false);
    assert.equal(
      await validates(schema, {
        ...request,
        [property]: { ...(draft as object), canonical_hash: hashes.a },
      }),
      false,
    );
  }
});

test('asset freeze CAS requires the positive identity state version', async () => {
  const request = {
    expected_state_version: 1,
    business_idempotency_key: 'freeze-dataset-v1',
  };
  assert.equal(await validates(experimentFoundationV2FreezeDraftRequestSchema, request), true);
  assert.equal(
    await validates(
      experimentFoundationV2FreezeDraftRequestSchema,
      { ...request, expected_state_version: 0 },
    ),
    false,
  );
});

test('PI admission is exact, closed, ordered and has no caller-derived plan hashes', async () => {
  const request = admissionRequest();
  assert.equal(await validates(paperImplementationExperimentV2AdmissionRequestSchema, request), true);
  for (const forbidden of [
    'branch_frame_hash',
    'work_order_revision_hash',
    'cell_plan_hash',
    'approved_plan_hash',
    'canonical_hash',
  ]) {
    assert.equal(
      await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
        ...request,
        [forbidden]: hashes.a,
      }),
      false,
      forbidden,
    );
  }
  assert.equal(
    await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
      ...request,
      exact_cells: [],
    }),
    false,
  );
  assert.equal(
    await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
      ...request,
      exact_cells: [{ ...request.exact_cells[0], generator_range: { from: 1, to: 2 } }],
    }),
    false,
  );
});

test('PI admission integer fields close the PostgreSQL Int boundary', async () => {
  const request = admissionRequest();
  for (const seed of [-2_147_483_648, 2_147_483_647]) {
    assert.equal(
      await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
        ...request,
        exact_cells: [{ ...request.exact_cells[0], seed }],
      }),
      true,
    );
  }
  for (const seed of [-2_147_483_649, 2_147_483_648]) {
    assert.equal(
      await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
        ...request,
        exact_cells: [{ ...request.exact_cells[0], seed }],
      }),
      false,
    );
  }
  assert.equal(
    await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
      ...request,
      exact_cells: [{ ...request.exact_cells[0], repeat_index: 2_147_483_648 }],
    }),
    false,
  );
  for (const field of ['max_attempts_per_cell', 'timeout_seconds'] as const) {
    assert.equal(
      await validates(paperImplementationExperimentV2AdmissionRequestSchema, {
        ...request,
        work_order_revision: {
          ...request.work_order_revision,
          run_policy: {
            ...request.work_order_revision.run_policy,
            [field]: 2_147_483_648,
          },
        },
      }),
      false,
    );
  }
});

test('all three exact event envelopes validate and payload hashes are recomputed', async () => {
  const admitted = admittedEvent();
  const frozen = runFrozenEvent();
  const advanced = headAdvancedEvent();
  assert.deepEqual(EXPERIMENT_V2_EVENT_TYPES, [
    'WorkOrderRevisionAdmitted',
    'RunManifestFrozen',
    'BranchHeadAdvanced',
  ]);
  assert.equal(await validates(workOrderRevisionAdmittedEventV1Schema, admitted), true);
  assert.equal(await validates(runManifestFrozenEventV1Schema, frozen), true);
  assert.equal(await validates(branchHeadAdvancedEventV1Schema, advanced), true);
  for (const event of [admitted, frozen, advanced]) {
    assert.equal(await validates(experimentV2IntegrationEventSchema, event), true);
    assert.equal(verifyExperimentV2EventPayloadHash(event), true);
    assert.doesNotThrow(() => assertExperimentV2EventPayloadHash(event));
  }
});

test('event schemas reject unknown type, version, producer and missing structured identity', async () => {
  const event = admittedEvent();
  assert.equal(
    await validates(experimentV2IntegrationEventSchema, {
      ...event,
      event_type: 'WorkOrderRevisionChanged',
    }),
    false,
  );
  assert.equal(
    await validates(experimentV2IntegrationEventSchema, { ...event, schema_version: 'v2' }),
    false,
  );
  assert.equal(
    await validates(experimentV2IntegrationEventSchema, {
      ...event,
      producer_domain: 'UnknownProducer',
    }),
    false,
  );
  const { correlation_id: _omitted, ...missingCorrelation } = event;
  assert.equal(await validates(experimentV2IntegrationEventSchema, missingCorrelation), false);
});

test('tampered, substituted and reordered event payloads fail rehash verification', () => {
  const event = admittedEvent();
  const tampered = {
    ...event,
    payload: {
      ...event.payload,
      exact_cells: [
        { ...event.payload.exact_cells[0], seed: 999 },
        event.payload.exact_cells[1],
      ],
    },
  };
  assert.equal(verifyExperimentV2EventPayloadHash(tampered), false);
  assert.throws(
    () => assertExperimentV2EventPayloadHash(tampered),
    /INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH/,
  );

  const reordered = {
    ...event,
    payload: {
      ...event.payload,
      exact_cells: [...event.payload.exact_cells].reverse(),
    },
  };
  assert.equal(verifyExperimentV2EventPayloadHash(reordered), false);

  const forged = { ...event, payload_hash: hashes.a };
  assert.equal(verifyExperimentV2EventPayloadHash(forged), false);
});

test('full event-envelope hash changes when exact scope or correlation metadata drifts', () => {
  const event = admittedEvent();
  const original = serverHashExperimentV2EventEnvelope(event);
  assert.notEqual(
    serverHashExperimentV2EventEnvelope({ ...event, branch_key: 'drifted-branch' }),
    original,
  );
  assert.notEqual(
    serverHashExperimentV2EventEnvelope({ ...event, correlation_id: 'drifted-correlation' }),
    original,
  );
  assert.equal(serverHashExperimentV2EventEnvelope(structuredClone(event)), original);
});

test('stable error surface contains the frozen top-level and reason codes', () => {
  assert.deepEqual(EXPERIMENT_V2_TOP_LEVEL_ERROR_CODES, [
    'INVALID_PAYLOAD',
    'NOT_FOUND',
    'VERSION_CONFLICT',
    'GATE_CONSTRAINT_FAILED',
    'CONCURRENT_ADVANCE',
  ]);
  for (const reason of [
    'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
    'LEGACY_RECORD_NOT_ELIGIBLE',
    'LEGACY_SCIENTIFIC_WRITER_CLOSED',
    'SERVER_CANONICAL_HASH_MISMATCH',
    'ASSET_FREEZE_IDEMPOTENCY_CONFLICT',
    'ASSET_LIFECYCLE_TRANSITION_INVALID',
    'EXACT_REVISION_REQUIRED',
    'UNSUPPORTED_RULE',
    'INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH',
    'RUN_CELL_PARITY_MISMATCH',
    'BRANCH_HEAD_CAS_CONFLICT',
  ]) {
    assert.equal(EXPERIMENT_V2_REASON_CODES.includes(reason as never), true, reason);
  }
});

test('PI v2 HTTP error envelope matches the real outer response and sanitized 500 shape', async () => {
  assert.equal(await validates(experimentV2ErrorEnvelopeSchema, {
    error: {
      code: 'VERSION_CONFLICT',
      message: 'Conflict.',
      details: { reason_code: 'ADMISSION_IDEMPOTENCY_CONFLICT' },
    },
  }), true);
  assert.equal(await validates(experimentV2ErrorEnvelopeSchema, {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected failure.',
    },
  }), true);
  assert.equal(await validates(experimentV2ErrorEnvelopeSchema, {
    code: 'VERSION_CONFLICT',
    message: 'Legacy naked shape.',
    details: { reason_code: 'ADMISSION_IDEMPOTENCY_CONFLICT' },
  }), false);
});
