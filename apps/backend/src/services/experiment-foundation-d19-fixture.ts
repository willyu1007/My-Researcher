import type {
  ExperimentFoundationV2MetricDefinitionDraftContentV1,
  ExperimentFoundationV2MetricDirection,
  ExperimentFoundationV2MetricValueType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationV2FreezeAssetDraftResult,
  ExperimentFoundationV2ReadinessResult,
} from './experiment-foundation-v2-service.js';
import { ExperimentFoundationV2Service } from './experiment-foundation-v2-service.js';
import type {
  ExperimentFoundationD19SourcePolicyAttestation,
} from './experiment-foundation-d19-source-policy.js';
import {
  requireExperimentFoundationD19SourcePolicyEntry,
} from './experiment-foundation-d19-source-policy.js';

interface MetricFixtureDefinition {
  metric_key: string;
  direction: ExperimentFoundationV2MetricDirection;
  value_type: ExperimentFoundationV2MetricValueType;
  unit: string;
  evaluator_key: string;
}

export interface ExperimentFoundationD19TypedFixture {
  source_policy_attestation: ExperimentFoundationD19SourcePolicyAttestation | null;
  data_policies: ExperimentFoundationV2ExactAssetRevisionRef[];
  datasets: ExperimentFoundationV2ExactAssetRevisionRef[];
  metric_definitions: ExperimentFoundationV2ExactAssetRevisionRef[];
  benchmark: ExperimentFoundationV2ExactAssetRevisionRef;
  evaluation_protocol: ExperimentFoundationV2ExactAssetRevisionRef;
  evaluation_protocol_readiness: ExperimentFoundationV2ReadinessResult;
}

export interface ExperimentFoundationD19TypedFixtureOptions {
  sourcePolicyAttestation?: ExperimentFoundationD19SourcePolicyAttestation | null;
}

const METRICS: readonly MetricFixtureDefinition[] = [
  metric('embedding_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('generation_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('prompt_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('qps', 'higher_is_better', 'number', 'queries_per_second', 'ragperf_derived_qps'),
  metric('rerank_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('retrieval_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('total_pipeline_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_derived_total_time'),
  metric('factual_correctness', 'higher_is_better', 'number', 'score', 'ragas_vllm'),
  metric('answer_accuracy', 'higher_is_better', 'number', 'score', 'ragas_vllm'),
  metric('llm_context_recall', 'higher_is_better', 'number', 'score', 'ragas_vllm'),
  metric('faithfulness', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('context_recall', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('context_precision', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('answer_relevancy', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('gpu_utilization', 'informational', 'percentage', 'percent', 'msys_gpu_meter'),
  metric(
    'gpu_memory_or_dram_bandwidth',
    'informational',
    'number',
    'bytes_per_second',
    'msys_gpu_meter',
  ),
  metric(
    'cpu_memory_disk_process_io',
    'informational',
    'number',
    'bytes_per_second',
    'msys_resource_meters',
  ),
];

const ACTIVE_METRIC_KEYS = [
  'embedding_time_ns',
  'generation_time_ns',
  'prompt_time_ns',
  'qps',
  'rerank_time_ns',
  'retrieval_time_ns',
  'total_pipeline_time_ns',
] as const;

/**
 * Deterministic control-plane fixture. Without a reviewed v2 source-policy
 * attestation its DataPolicy values remain explicitly synthetic and unresolved.
 * With one, the persisted Dataset/DataPolicy semantic content is populated from
 * the validated attestation and receives server-issued revision hashes.
 */
export async function buildExperimentFoundationD19TypedFixture(
  service: ExperimentFoundationV2Service,
  options: ExperimentFoundationD19TypedFixtureOptions = {},
): Promise<ExperimentFoundationD19TypedFixture> {
  const sourcePolicyAttestation = options.sourcePolicyAttestation ?? null;
  const wikipediaSourcePolicy = sourcePolicyAttestation
    ? requireExperimentFoundationD19SourcePolicyEntry(
      sourcePolicyAttestation,
      'wikipedia_corpus',
    )
    : null;
  const naturalQuestionsSourcePolicy = sourcePolicyAttestation
    ? requireExperimentFoundationD19SourcePolicyEntry(
      sourcePolicyAttestation,
      'natural_questions_query_workload',
    )
    : null;
  const policyWikipedia = await freezeAndActivate(service, {
    asset_type: 'DataPolicy',
    logical_id: 'd19-data-policy-wikipedia',
    draft_content: wikipediaSourcePolicy ? {
      schema_version: 'v1',
      ...wikipediaSourcePolicy.policy,
    } : {
      schema_version: 'v1',
      policy_key: 'd19-test-only-wikipedia-policy',
      display_name: 'D-19 synthetic Wikipedia policy',
      license_expression: 'TEST-ONLY-UNRESOLVED',
      access_level: 'restricted',
      source_terms_uri: 'https://example.invalid/d19/wikipedia-policy-unresolved',
      redistribution_allowed: false,
      commercial_use_allowed: false,
      use_constraints: ['synthetic_test_only', 'not_source_policy_evidence'],
    },
  });
  const policyNaturalQuestions = await freezeAndActivate(service, {
    asset_type: 'DataPolicy',
    logical_id: 'd19-data-policy-natural-questions',
    draft_content: naturalQuestionsSourcePolicy ? {
      schema_version: 'v1',
      ...naturalQuestionsSourcePolicy.policy,
    } : {
      schema_version: 'v1',
      policy_key: 'd19-test-only-natural-questions-policy',
      display_name: 'D-19 synthetic Natural Questions policy',
      license_expression: 'TEST-ONLY-UNRESOLVED',
      access_level: 'restricted',
      source_terms_uri: 'https://example.invalid/d19/natural-questions-policy-unresolved',
      redistribution_allowed: false,
      commercial_use_allowed: false,
      use_constraints: ['synthetic_test_only', 'not_source_policy_evidence'],
    },
  });

  const metricRevisions: ExperimentFoundationV2FreezeAssetDraftResult[] = [];
  for (const definition of METRICS) {
    metricRevisions.push(await freezeAndActivate(service, {
      asset_type: 'MetricDefinition',
      logical_id: `d19-metric-${definition.metric_key}`,
      draft_content: metricDraft(definition),
    }));
  }

  await service.createReadinessAttestation({ target: policyWikipedia.exact_ref });
  await service.createReadinessAttestation({ target: policyNaturalQuestions.exact_ref });
  for (const revision of metricRevisions) {
    await service.createReadinessAttestation({ target: revision.exact_ref });
  }

  const wikipedia = await freezeAndActivateDataset(service, {
    asset_type: 'Dataset',
    logical_id: 'd19-dataset-wikipedia-corpus',
    draft_content: wikipediaSourcePolicy ? {
      schema_version: 'v1',
      dataset_key: wikipediaSourcePolicy.dataset.dataset_key,
      display_name: 'RAGPerf Wikipedia raw corpus source bundle',
      version_label: wikipediaSourcePolicy.dataset.version_label,
      dataset_role: wikipediaSourcePolicy.dataset.dataset_role,
      source_identity: {
        source_name: wikipediaSourcePolicy.dataset.source_name,
        source_revision: wikipediaSourcePolicy.dataset.source_revision,
        source_uri: wikipediaSourcePolicy.dataset.source_uri,
      },
      checksum_manifest: wikipediaSourcePolicy.dataset.checksum_manifest,
      split_protocol: wikipediaSourcePolicy.dataset.split_protocol,
      data_policy: asType(policyWikipedia.exact_ref, 'DataPolicy'),
    } : {
      schema_version: 'v1',
      dataset_key: 'ragperf-wikipedia-corpus',
      display_name: 'RAGPerf Wikipedia corpus',
      version_label: 'd19-synthetic-v1',
      dataset_role: 'corpus',
      source_identity: {
        source_name: 'wikipedia',
        source_revision: 'd19-synthetic',
        source_uri: 'https://example.invalid/d19/wikipedia-corpus',
      },
      checksum_manifest: checksumManifest('wikipedia-corpus.jsonl', 'a'),
      split_protocol: {
        protocol_version: 'v1',
        splits: [{ ordinal: 1, split_key: 'corpus', split_role: 'corpus', source_selector: '*' }],
      },
      data_policy: asType(policyWikipedia.exact_ref, 'DataPolicy'),
    },
  }, wikipediaSourcePolicy ? 'D19_ATTESTED_SOURCE_LOCATION_AVAILABLE' : undefined);
  const naturalQuestions = await freezeAndActivateDataset(service, {
    asset_type: 'Dataset',
    logical_id: 'd19-dataset-natural-questions',
    draft_content: naturalQuestionsSourcePolicy ? {
      schema_version: 'v1',
      dataset_key: naturalQuestionsSourcePolicy.dataset.dataset_key,
      display_name: 'RAGPerf Natural Questions workload',
      version_label: naturalQuestionsSourcePolicy.dataset.version_label,
      dataset_role: naturalQuestionsSourcePolicy.dataset.dataset_role,
      source_identity: {
        source_name: naturalQuestionsSourcePolicy.dataset.source_name,
        source_revision: naturalQuestionsSourcePolicy.dataset.source_revision,
        source_uri: naturalQuestionsSourcePolicy.dataset.source_uri,
      },
      checksum_manifest: naturalQuestionsSourcePolicy.dataset.checksum_manifest,
      split_protocol: naturalQuestionsSourcePolicy.dataset.split_protocol,
      data_policy: asType(policyNaturalQuestions.exact_ref, 'DataPolicy'),
    } : {
      schema_version: 'v1',
      dataset_key: 'ragperf-natural-questions-workload',
      display_name: 'RAGPerf Natural Questions workload',
      version_label: 'd19-synthetic-v1',
      dataset_role: 'query_workload',
      source_identity: {
        source_name: 'natural_questions',
        source_revision: 'd19-synthetic',
        source_uri: 'https://example.invalid/d19/natural-questions',
      },
      checksum_manifest: checksumManifest('natural-questions.jsonl', 'b'),
      split_protocol: {
        protocol_version: 'v1',
        splits: [{ ordinal: 1, split_key: 'query', split_role: 'query', source_selector: '*' }],
      },
      data_policy: asType(policyNaturalQuestions.exact_ref, 'DataPolicy'),
    },
  }, naturalQuestionsSourcePolicy ? 'D19_ATTESTED_SOURCE_LOCATION_AVAILABLE' : undefined);
  await service.createReadinessAttestation({ target: wikipedia.exact_ref });
  await service.createReadinessAttestation({ target: naturalQuestions.exact_ref });

  const benchmark = await freezeAndActivate(service, {
    asset_type: 'Benchmark',
    logical_id: 'd19-benchmark-ragperf',
    draft_content: {
      schema_version: 'v1',
      benchmark_key: 'ragperf-rag-systems-benchmark',
      display_name: 'RAGPerf RAG Systems Benchmark',
      description: 'D-19 typed control-plane source bindings; no extraction or provider execution.',
      corpus_dataset: asType(wikipedia.exact_ref, 'Dataset'),
      query_workload_dataset: asType(naturalQuestions.exact_ref, 'Dataset'),
    },
  });
  await service.createReadinessAttestation({ target: benchmark.exact_ref });

  const metricByKey = new Map(
    METRICS.map((definition, index) => [definition.metric_key, metricRevisions[index].exact_ref]),
  );
  const protocol = await freezeAndActivate(service, {
    asset_type: 'EvaluationProtocol',
    logical_id: 'd19-evaluation-protocol-ragperf-v2',
    draft_content: {
      schema_version: 'v2',
      protocol_key: 'ragperf-adapter-tier-v2',
      display_name: 'RAGPerf adapter-tier EvaluationProtocol v2',
      benchmark_dependency: asType(benchmark.exact_ref, 'Benchmark'),
      metric_dependencies: METRICS.map((definition) => (
        asType(requireMetricRef(metricByKey, definition.metric_key), 'MetricDefinition')
      )),
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
        ...ACTIVE_METRIC_KEYS.map((metricKey) => {
          const definition = requireMetricDefinition(metricKey);
          return {
            rule_id: `metric_contract@v1:${metricKey}`,
            rule_type: 'metric_contract@v1' as const,
            metric_definition: asType(
              requireMetricRef(metricByKey, metricKey),
              'MetricDefinition',
            ),
            metric_key: metricKey,
            required_cardinality: 1,
            split_key: 'query',
            value_type: definition.value_type,
            unit: definition.unit,
            finite_required: true,
          };
        }),
      ],
    },
  });
  const readiness = await service.createReadinessAttestation({ target: protocol.exact_ref });
  await service.revalidateReadiness({
    target: protocol.exact_ref,
    readiness_attestation_id: readiness.attestation.readiness_attestation_id,
    expected_dependencies: readiness.dependencies.map((dependency) => dependency.dependency),
  });

  return {
    source_policy_attestation: sourcePolicyAttestation,
    data_policies: [policyWikipedia.exact_ref, policyNaturalQuestions.exact_ref],
    datasets: [wikipedia.exact_ref, naturalQuestions.exact_ref],
    metric_definitions: metricRevisions.map((revision) => revision.exact_ref),
    benchmark: benchmark.exact_ref,
    evaluation_protocol: protocol.exact_ref,
    evaluation_protocol_readiness: readiness,
  };
}

function metric(
  metricKey: string,
  direction: ExperimentFoundationV2MetricDirection,
  valueType: ExperimentFoundationV2MetricValueType,
  unit: string,
  evaluatorKey: string,
): MetricFixtureDefinition {
  return {
    metric_key: metricKey,
    direction,
    value_type: valueType,
    unit,
    evaluator_key: evaluatorKey,
  };
}

function metricDraft(
  definition: MetricFixtureDefinition,
): ExperimentFoundationV2MetricDefinitionDraftContentV1 {
  return {
    schema_version: 'v1',
    metric_key: definition.metric_key,
    display_name: definition.metric_key.replaceAll('_', ' '),
    direction: definition.direction,
    value_type: definition.value_type,
    unit: definition.unit,
    evaluator_binding: {
      evaluator_key: definition.evaluator_key,
      evaluator_version: 'v1',
    },
  };
}

async function freezeAndActivate(
  service: ExperimentFoundationV2Service,
  input: Parameters<ExperimentFoundationV2Service['createAssetDraft']>[0],
): Promise<ExperimentFoundationV2FreezeAssetDraftResult> {
  await service.createAssetDraft(input);
  const frozen = await service.freezeAssetDraft({
    asset_type: input.asset_type,
    logical_id: input.logical_id,
    expected_state_version: 1,
    business_idempotency_key: `d19-freeze:${input.asset_type}:${input.logical_id}`,
  });
  const registered = await service.appendLifecycleEvent({
    asset: frozen.exact_ref,
    expected_projection_state_version: null,
    event_type: 'registered',
    reason_code: 'D19_FIXTURE_REGISTERED',
  });
  await service.appendLifecycleEvent({
    asset: frozen.exact_ref,
    expected_projection_state_version: registered.projection.projection_state_version,
    event_type: 'activated',
    reason_code: 'D19_FIXTURE_ACTIVATED',
  });
  return frozen;
}

async function freezeAndActivateDataset(
  service: ExperimentFoundationV2Service,
  input: Extract<Parameters<ExperimentFoundationV2Service['createAssetDraft']>[0], { asset_type: 'Dataset' }>,
  locationReasonCode = 'D19_SYNTHETIC_LOCATION_AVAILABLE',
): Promise<ExperimentFoundationV2FreezeAssetDraftResult> {
  const frozen = await freezeAndActivate(service, input);
  await service.appendLifecycleEvent({
    asset: frozen.exact_ref,
    expected_projection_state_version: 2,
    event_type: 'location_available',
    reason_code: locationReasonCode,
  });
  return frozen;
}

function checksumManifest(path: string, hexCharacter: string) {
  const checksum = hexCharacter.repeat(64);
  return {
    manifest_version: 'v1' as const,
    algorithm: 'sha256' as const,
    entries: [{ path, byte_size: 1, checksum }],
    aggregate_checksum: checksum,
  };
}

function asType<TType extends ExperimentFoundationV2ExactAssetRevisionRef['asset_type']>(
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
  assetType: TType,
): ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: TType } {
  if (ref.asset_type !== assetType) {
    throw new Error(`Expected ${assetType}, received ${ref.asset_type}`);
  }
  return { ...ref, asset_type: assetType };
}

function requireMetricRef(
  refs: Map<string, ExperimentFoundationV2ExactAssetRevisionRef>,
  metricKey: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  const ref = refs.get(metricKey);
  if (!ref) {
    throw new Error(`Missing D-19 metric ref: ${metricKey}`);
  }
  return ref;
}

function requireMetricDefinition(metricKey: string): MetricFixtureDefinition {
  const definition = METRICS.find((candidate) => candidate.metric_key === metricKey);
  if (!definition) {
    throw new Error(`Missing D-19 metric definition: ${metricKey}`);
  }
  return definition;
}
