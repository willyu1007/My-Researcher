import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_ATTENTION_STATUSES,
  EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES,
  EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES,
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_REVIEW_STATUSES,
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_STATUSES,
  EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_IN_FLIGHT_STATUSES,
  EXPERIMENT_FOUNDATION_READINESS_BLOCKED_STATUSES,
  EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES,
  EXPERIMENT_FOUNDATION_ASSET_PROMOTION_DECISION_KINDS,
  EXPERIMENT_FOUNDATION_BENCHMARK_VERIFICATION_STATUSES,
  EXPERIMENT_FOUNDATION_DATASET_CATALOG_STATUSES,
  EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES,
  EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS,
  EXPERIMENT_FOUNDATION_IMPLEMENTATION_DECISION_SIGNALS,
  EXPERIMENT_FOUNDATION_READINESS_SNAPSHOT_STATUSES,
  EXPERIMENT_FOUNDATION_RECORD_KINDS,
  EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES,
  EXPERIMENT_FOUNDATION_TASK_MATERIALIZATION_STATUSES,
  createExperimentFoundationRecordRequestSchema,
  cancelExternalTrainingJobRequestSchema,
  collectExternalTrainingJobRequestSchema,
  externalTrainingJobResponseSchema,
  experimentFoundationPromotionDecisionRequestSchema,
  experimentFoundationPromotionDecisionResponseSchema,
  experimentFoundationReadinessCheckRequestSchema,
  experimentFoundationReadinessCheckResponseSchema,
  experimentFoundationStoredRecordSchema,
  listExternalTrainingJobsResponseSchema,
  submitExternalTrainingJobRequestSchema,
  syncExternalTrainingJobRequestSchema,
  experimentFoundationAssetCandidateCompletenessCheckSchema,
  experimentFoundationAssetCandidateDuplicateCheckSchema,
  experimentFoundationAssetCandidatePolicyCheckSchema,
  experimentFoundationAssetCandidateRiskAssessmentSchema,
  experimentFoundationAssetCandidateRuleTraceSchema,
  experimentFoundationAssetCandidateSourceTraceSchema,
  experimentFoundationAssetCandidateTriageReportSchema,
  experimentFoundationAssetPromotionRequestSchema,
  experimentFoundationAssetPromotionResultSchema,
  experimentFoundationBaselineAssetSchema,
  experimentFoundationBaselineAssetCandidateSchema,
  experimentFoundationBaselineImplementationVersionLockSchema,
  experimentFoundationBaselineImplementationVersionSchema,
  experimentFoundationAdapterMetadataRefSchema,
  experimentFoundationBaseModelCandidateSchema,
  experimentFoundationBenchmarkAssetSchema,
  experimentFoundationBenchmarkAssetCandidateSchema,
  experimentFoundationChecksumManifestSchema,
  experimentFoundationDataPolicySchema,
  experimentFoundationDatasetAssetSchema,
  experimentFoundationDatasetAssetCandidateSchema,
  experimentFoundationDatasetLocationSchema,
  experimentFoundationDatasetMirrorSchema,
  experimentFoundationDatasetVersionLockSchema,
  experimentFoundationDatasetVersionSchema,
  experimentFoundationEvidenceCandidateSchema,
  experimentFoundationExecutionProfileSchema,
  experimentFoundationExperimentResultSchema,
  experimentFoundationExternalTrainingJobSchema,
  experimentFoundationExternalLockRefSchema,
  experimentFoundationEvaluationFactSchema,
  experimentFoundationEvaluationProtocolLockSchema,
  experimentFoundationEvaluationProtocolSchema,
  experimentFoundationEvaluationProtocolCandidateSchema,
  experimentFoundationFineTuningResultSchema,
  experimentFoundationFineTuningTaskProfileSchema,
  experimentFoundationGenerateRunRecipeRequestSchema,
  experimentFoundationImplementationDecisionSignalSchema,
  experimentFoundationLocalFileRefSchema,
  experimentFoundationMaterializeTrainingTaskSpecRequestSchema,
  experimentFoundationMethodComponentCandidateSchema,
  experimentFoundationMethodRecipeComponentLockSchema,
  experimentFoundationMethodRecipeComponentSchema,
  experimentFoundationMetricObservationSchema,
  experimentFoundationMetricDefinitionSchema,
  experimentFoundationComparisonObservationSchema,
  experimentFoundationPaperExperimentSidecarSchema,
  experimentFoundationPaperTableFactSetSchema,
  experimentFoundationReadinessSnapshotSchema,
  experimentFoundationRecipeDraftSchema,
  experimentFoundationResultArtifactSchema,
  experimentFoundationResultLogRefSchema,
  experimentFoundationResultMetricValueSchema,
  experimentFoundationResultValidationReportSchema,
  experimentFoundationRunRecipeSchema,
  experimentFoundationSplitProtocolSchema,
  experimentFoundationStorageRootRefSchema,
  experimentFoundationTrainingPlatformRefSchema,
  experimentFoundationTrainingTaskCancellationRequestSchema,
  experimentFoundationTrainingTaskMaterializationResultSchema,
  experimentFoundationTrainingTaskPartialResultRefSchema,
  experimentFoundationTrainingTaskSpecSchema,
  experimentFoundationTrainingTaskStageEventSchema,
  experimentFoundationVersionLockSchema,
  type BaselineAssetCandidate,
  type BaselineAsset,
  type BaselineImplementationVersion,
  type BaselineImplementationVersionLock,
  type BaseModelCandidate,
  type BenchmarkAssetCandidate,
  type BenchmarkAsset,
  type ChecksumManifest,
  type DataPolicy,
  type DatasetAsset,
  type DatasetAssetCandidate,
  type DatasetLocation,
  type DatasetMirror,
  type DatasetVersion,
  type DatasetVersionLock,
  type EvidenceCandidate,
  type EvaluationFact,
  type EvaluationProtocol,
  type EvaluationProtocolCandidate,
  type EvaluationProtocolLock,
  type ExperimentAssetCandidateCompletenessCheck,
  type ExperimentAssetCandidateDuplicateCheck,
  type ExperimentAssetCandidatePolicyCheck,
  type ExperimentAssetCandidateRiskAssessment,
  type ExperimentAssetCandidateRuleTrace,
  type ExperimentAssetCandidateSourceTrace,
  type ExperimentAssetCandidateTriageReport,
  type ExperimentAssetPromotionRequest,
  type ExperimentAssetPromotionResult,
  type ExperimentResult,
  type ExperimentFoundationAdapterMetadataRef,
  type ExperimentFoundationExecutionProfile,
  type ExternalTrainingJob,
  type ExperimentFoundationExternalLockRef,
  type ExperimentFoundationReadinessSnapshot,
  type ExperimentFoundationTrainingPlatformRef,
  type ExperimentFoundationVersionLock,
  type FineTuningResult,
  type FineTuningTaskProfile,
  type GenerateRunRecipeRequest,
  type ImplementationDecisionSignal,
  type LocalFileRef,
  type MaterializeTrainingTaskSpecRequest,
  type MethodComponentCandidate,
  type MethodRecipeComponent,
  type MethodRecipeComponentLock,
  type MetricObservation,
  type MetricDefinition,
  type ComparisonObservation,
  type ExperimentFoundationPromotionDecisionResponse,
  type ExperimentFoundationReadinessCheckResponse,
  type ExperimentFoundationStoredRecord,
  type PaperExperimentSidecar,
  type PaperTableFactSet,
  type RecipeDraft,
  type ResultArtifact,
  type ResultLogRef,
  type ResultMetricValue,
  type ResultValidationReport,
  type RunRecipe,
  type SplitProtocol,
  type StorageRootRef,
  type TrainingTaskCancellationRequest,
  type TrainingTaskMaterializationResult,
  type TrainingTaskPartialResultRef,
  type TrainingTaskSpec,
  type TrainingTaskStageEvent,
} from './experiment-foundation-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

const timestamp = '2026-05-17T00:00:00.000Z';

async function validateWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload,
  });
  await app.close();
  return response.statusCode;
}

async function validateWithRouteSchema(routeSchema: JsonSchema, payload: object) {
  const app = Fastify();
  app.post('/validate', { schema: routeSchema }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload,
  });
  await app.close();
  return response.statusCode;
}

function sourceRef(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
  };
}

function forbiddenLeakValue(field: string) {
  if (field.endsWith('_refs')) {
    return [sourceRef('leaked_ref', 'leaked_001')];
  }
  if (field.endsWith('_ref')) {
    return sourceRef('leaked_ref', 'leaked_001');
  }
  if (field.endsWith('_ids')) {
    return ['leaked_001'];
  }
  if (field.endsWith('_policy') || field.endsWith('_protocol')) {
    return { leaked: true };
  }
  return 'leaked_001';
}

function clonePayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}

const materializationPrivateLeakFields = [
  'provider',
  'region',
  'queue',
  'endpoint',
  'oss',
  'pai',
  'dlc',
  'aliyun',
  'k8s',
  'slurm',
  'access_key',
  'secret_key',
  'credentials',
  'sdk_payload',
  'adapter_metadata',
  'adapter_payload',
  'platform_payload',
  'platform_request',
  'platform_response',
  'external_job_id',
  'job_id',
] as const;

function localFileRef(fileKind: LocalFileRef['file_kind'] = 'file'): LocalFileRef {
  return {
    storage_root_ref_id: 'storage_root_001',
    relative_path: 'datasets/ag-news/train.jsonl',
    file_kind: fileKind,
    expected_checksum_hash: 'sha256:manifest-entry',
    byte_size: 1024,
  };
}

function datasetAssetPayload(): DatasetAsset {
  return {
    dataset_asset_id: 'dataset_asset_001',
    name: 'AG News',
    aliases: ['ag_news'],
    description: 'Topic classification dataset identity.',
    source_refs: [sourceRef('literature_record', 'lit_001')],
    task_types: ['text_classification'],
    schema_summary: {
      columns: ['text', 'label'],
    },
    default_version_id: 'dataset_version_001',
    catalog_status: 'registered',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function datasetVersionPayload(): DatasetVersion {
  return {
    dataset_version_id: 'dataset_version_001',
    dataset_asset_id: 'dataset_asset_001',
    version_label: '2026-05-17-local',
    checksum_manifest_id: 'checksum_manifest_001',
    checksum_manifest_hash: 'sha256:checksum-manifest',
    split_protocol_id: 'split_protocol_001',
    split_protocol_hash: 'sha256:split-protocol',
    data_policy_id: 'data_policy_001',
    data_policy_hash: 'sha256:data-policy',
    processing_recipe_ref: sourceRef('data_processing_recipe', 'processing_recipe_001'),
    location_ids: ['dataset_location_001'],
    access_status: 'available',
    readiness_status: 'ready',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function storageRootPayload(): StorageRootRef {
  return {
    storage_root_ref_id: 'storage_root_001',
    root_key: 'local_datasets',
    root_label: 'Local datasets root',
    root_kind: 'local',
    policy_ref: sourceRef('data_policy', 'data_policy_001'),
  };
}

function datasetLocationPayload(): DatasetLocation {
  return {
    dataset_location_id: 'dataset_location_001',
    dataset_version_id: 'dataset_version_001',
    location_kind: 'local_file',
    storage_root_ref: storageRootPayload(),
    local_file_ref: localFileRef(),
    remote_ref: null,
    availability_status: 'available',
    last_checked_at: timestamp,
  };
}

function datasetMirrorPayload(): DatasetMirror {
  return {
    dataset_mirror_id: 'dataset_mirror_001',
    dataset_version_id: 'dataset_version_001',
    mirror_role: 'execution_mirror',
    provider: 'aliyun_oss',
    mirror_ref: sourceRef('aliyun_oss_object', 'oss://bucket/ag-news/2026-05-17'),
    mirror_status: 'ready',
    source_checksum_manifest_hash: 'sha256:checksum-manifest',
    freshness_status: 'fresh',
    approval_ref: sourceRef('mirror_approval', 'approval_001'),
    run_scope_ref: sourceRef('run_recipe', 'run_recipe_001'),
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function checksumManifestPayload(): ChecksumManifest {
  return {
    checksum_manifest_id: 'checksum_manifest_001',
    dataset_version_id: 'dataset_version_001',
    algorithm: 'sha256',
    manifest_hash: 'sha256:checksum-manifest',
    manifest_file_ref: localFileRef('manifest'),
    entry_count: 2,
    total_bytes: 2048,
    created_at: timestamp,
  };
}

function splitProtocolPayload(): SplitProtocol {
  return {
    split_protocol_id: 'split_protocol_001',
    dataset_version_id: 'dataset_version_001',
    split_names: ['train', 'test'],
    split_file_refs: [localFileRef('split_file')],
    generation_method: 'official_split',
    seed: null,
    protocol_hash: 'sha256:split-protocol',
    leakage_notes: null,
    created_at: timestamp,
  };
}

function dataPolicyPayload(): DataPolicy {
  return {
    data_policy_id: 'data_policy_001',
    license: 'CC BY-SA 4.0',
    access_level: 'open',
    privacy_level: 'public',
    allowed_use_cases: ['research', 'benchmarking'],
    mirror_policy: 'approval_required',
    approval_refs: [sourceRef('policy_approval', 'approval_001')],
    policy_hash: 'sha256:data-policy',
    retention_notes: null,
    created_at: timestamp,
  };
}

function datasetVersionLockPayload(): DatasetVersionLock {
  return {
    dataset_asset_id: 'dataset_asset_001',
    dataset_version_id: 'dataset_version_001',
    checksum_manifest_hash: 'sha256:checksum-manifest',
    split_protocol_hash: 'sha256:split-protocol',
    data_policy_id: 'data_policy_001',
    data_policy_hash: 'sha256:data-policy',
    locked_at: timestamp,
    source_refs: [sourceRef('dataset_version', 'dataset_version_001')],
  };
}

function benchmarkAssetPayload(): BenchmarkAsset {
  return {
    benchmark_asset_id: 'benchmark_asset_001',
    name: 'AG News Accuracy Benchmark',
    description: 'Text classification benchmark identity.',
    task: 'text_classification',
    domain: 'news',
    dataset_version_refs: [sourceRef('dataset_version', 'dataset_version_001')],
    default_evaluation_protocol_refs: [
      sourceRef('evaluation_protocol', 'evaluation_protocol_001'),
    ],
    source_refs: [sourceRef('literature_record', 'lit_001')],
    community_refs: [sourceRef('community_benchmark', 'ag_news')],
    catalog_status: 'registered',
    verification_status: 'protocol_complete',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function metricDefinitionPayload(): MetricDefinition {
  return {
    metric_definition_id: 'metric_definition_001',
    metric_key: 'accuracy',
    name: 'Accuracy',
    description: 'Classification accuracy.',
    direction: 'higher_is_better',
    unit: 'ratio',
    value_type: 'number',
    evaluator_ref: sourceRef('evaluator', 'evaluator_001'),
    parser_ref: sourceRef('metric_parser', 'parser_001'),
    validity_constraints: ['predictions_match_test_split'],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function evaluationProtocolPayload(): EvaluationProtocol {
  return {
    evaluation_protocol_id: 'evaluation_protocol_001',
    benchmark_asset_id: 'benchmark_asset_001',
    protocol_version: 'v1',
    protocol_hash: 'sha256:evaluation-protocol',
    metric_definition_refs: [sourceRef('metric_definition', 'metric_definition_001')],
    evaluator_refs: [sourceRef('evaluator', 'evaluator_001')],
    aggregation: { method: 'mean' },
    seed_policy: { seed: 42 },
    repeat_policy: { repeats: 3 },
    reporting_protocol: { primary_metric: 'accuracy' },
    comparison_policy: { compare_to: 'baseline_implementation_version' },
    statistical_protocol: { test: 'paired_bootstrap' },
    budget_fairness_policy: { max_gpu_hours: 1 },
    tuning_fairness_policy: { tuning_budget_runs: 5 },
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function baselineAssetPayload(): BaselineAsset {
  return {
    baseline_asset_id: 'baseline_asset_001',
    name: 'BERT baseline',
    aliases: ['bert-base'],
    description: 'Reusable BERT baseline identity.',
    baseline_family: 'model',
    source_refs: [sourceRef('literature_record', 'lit_002')],
    supported_benchmark_refs: [sourceRef('benchmark_asset', 'benchmark_asset_001')],
    recommended_use: 'Use as a text classification comparison target.',
    catalog_status: 'registered',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function baselineImplementationVersionPayload(): BaselineImplementationVersion {
  return {
    baseline_implementation_version_id: 'baseline_impl_version_001',
    baseline_asset_id: 'baseline_asset_001',
    version_label: 'v1',
    implementation_hash: 'sha256:baseline-implementation',
    code_ref: sourceRef('git_repository', 'repo_001'),
    commit_hash: 'abc123',
    runtime_ref: sourceRef('runtime_image', 'runtime_001'),
    entrypoint: 'python train.py --config configs/ag_news.json',
    default_params: { learning_rate: 0.00002 },
    input_contract: { dataset_format: 'jsonl' },
    output_contract: { predictions_path: 'predictions.jsonl' },
    supported_benchmark_refs: [sourceRef('benchmark_asset', 'benchmark_asset_001')],
    supported_evaluation_protocol_refs: [
      sourceRef('evaluation_protocol', 'evaluation_protocol_001'),
    ],
    verification_status: 'smoke_verified',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function evaluationProtocolLockPayload(): EvaluationProtocolLock {
  return {
    evaluation_protocol_id: 'evaluation_protocol_001',
    benchmark_asset_id: 'benchmark_asset_001',
    protocol_version: 'v1',
    protocol_hash: 'sha256:evaluation-protocol',
    metric_definition_refs: [sourceRef('metric_definition', 'metric_definition_001')],
    locked_at: timestamp,
    source_refs: [sourceRef('evaluation_protocol', 'evaluation_protocol_001')],
  };
}

function baselineImplementationVersionLockPayload(): BaselineImplementationVersionLock {
  return {
    baseline_asset_id: 'baseline_asset_001',
    baseline_implementation_version_id: 'baseline_impl_version_001',
    version_label: 'v1',
    implementation_hash: 'sha256:baseline-implementation',
    code_ref: sourceRef('git_repository', 'repo_001'),
    commit_hash: 'abc123',
    runtime_ref: sourceRef('runtime_image', 'runtime_001'),
    runtime_hash: 'sha256:runtime-image',
    entrypoint: 'python train.py --config configs/ag_news.json',
    locked_at: timestamp,
    source_refs: [sourceRef('baseline_implementation_version', 'baseline_impl_version_001')],
  };
}

function readinessSnapshotPayload(
  status: ExperimentFoundationReadinessSnapshot['status'] = 'passed',
): ExperimentFoundationReadinessSnapshot {
  return {
    readiness_report_id: 'readiness_report_001',
    readiness_report_hash: 'sha256:readiness-report',
    status,
    checked_at: timestamp,
    source_refs: [sourceRef('readiness_report', 'readiness_report_001')],
    blockers: status === 'passed' ? [] : ['dataset_policy_blocked'],
  };
}

function methodRecipeComponentPayload(): MethodRecipeComponent {
  return {
    method_recipe_component_id: 'method_component_001',
    component_kind: 'training_strategy',
    name: 'BERT supervised fine-tuning strategy',
    description: 'Reusable training strategy component.',
    version_label: 'v1',
    component_hash: 'sha256:method-component',
    component_spec: {
      epochs: 3,
      learning_rate: 0.00002,
    },
    source_refs: [sourceRef('recipe_template', 'recipe_template_001')],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function methodRecipeComponentLockPayload(): MethodRecipeComponentLock {
  return {
    method_recipe_component_id: 'method_component_001',
    component_kind: 'training_strategy',
    version_label: 'v1',
    component_hash: 'sha256:method-component',
    locked_at: timestamp,
    source_refs: [sourceRef('method_recipe_component', 'method_component_001')],
  };
}

function externalLockRefPayload(refKind: ExperimentFoundationExternalLockRef['ref_kind']): ExperimentFoundationExternalLockRef {
  return {
    ref_kind: refKind,
    ref: sourceRef(refKind, `${refKind}_001`),
    ref_hash: `sha256:${refKind}`,
  };
}

function fineTuningExternalLockRefsPayload(): ExperimentFoundationExternalLockRef[] {
  return [
    externalLockRefPayload('base_model'),
    externalLockRefPayload('fine_tuning_dataset'),
    externalLockRefPayload('fine_tuning_strategy'),
    externalLockRefPayload('prompt_template'),
    externalLockRefPayload('context_policy'),
  ];
}

function versionLockPayload(
  externalLockRefs: ExperimentFoundationExternalLockRef[] = [],
): ExperimentFoundationVersionLock {
  return {
    version_lock_id: 'version_lock_001',
    dataset_version_lock: datasetVersionLockPayload(),
    evaluation_protocol_lock: evaluationProtocolLockPayload(),
    baseline_implementation_locks: [baselineImplementationVersionLockPayload()],
    method_component_locks: [methodRecipeComponentLockPayload()],
    external_lock_refs: externalLockRefs,
    readiness_snapshot: readinessSnapshotPayload(),
    version_lock_hash: 'sha256:version-lock',
    locked_at: timestamp,
    source_refs: [sourceRef('recipe_draft', 'recipe_draft_001')],
  };
}

function recipeDraftPayload(): RecipeDraft {
  return {
    recipe_draft_id: 'recipe_draft_001',
    source_refs: [sourceRef('research_workspace', 'workspace_001')],
    candidate_dataset_refs: [sourceRef('dataset_asset', 'dataset_asset_001')],
    candidate_benchmark_refs: [sourceRef('benchmark_asset', 'benchmark_asset_001')],
    candidate_baseline_refs: [],
    candidate_evaluation_protocol_refs: [
      sourceRef('evaluation_protocol', 'evaluation_protocol_001'),
    ],
    method_component_refs: [sourceRef('method_recipe_component', 'method_component_001')],
    draft_parameter_overrides: {
      learning_rate: 0.00002,
    },
    missing_inputs: ['baseline_implementation_version'],
    draft_validation_warnings: ['baseline implementation not selected yet'],
    traceability_refs: [sourceRef('title_card', 'title_card_001')],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function executionProfilePayload(
  profileKind: ExperimentFoundationExecutionProfile['profile_kind'] = 'standard_training',
): ExperimentFoundationExecutionProfile {
  return {
    profile_kind: profileKind,
    capability_requirements:
      profileKind === 'llm_fine_tuning'
        ? ['gpu', 'fine_tuning_support']
        : ['local_smoke', 'single_gpu'],
    resource_classes: profileKind === 'evaluation_only' ? ['cpu'] : ['gpu'],
    supports_distributed: false,
    long_running: profileKind === 'llm_fine_tuning',
    ...(profileKind === 'llm_fine_tuning'
      ? { fine_tuning_external_lock_refs: fineTuningExternalLockRefsPayload() }
      : {}),
  };
}

function generateRunRecipeRequestPayload(
  profileKind: ExperimentFoundationExecutionProfile['profile_kind'] = 'standard_training',
): GenerateRunRecipeRequest {
  const externalLockRefs =
    profileKind === 'llm_fine_tuning' ? fineTuningExternalLockRefsPayload() : [];

  return {
    generate_run_recipe_request_id: 'generate_run_recipe_request_001',
    recipe_draft_id: 'recipe_draft_001',
    version_lock: versionLockPayload(externalLockRefs),
    resolved_params: {
      batch_size: 16,
      learning_rate: 0.00002,
    },
    execution_profile: executionProfilePayload(profileKind),
    config_snapshot_hash: 'sha256:config-snapshot',
    requested_by_ref: sourceRef('user', 'user_001'),
    created_at: timestamp,
    source_refs: [sourceRef('recipe_draft', 'recipe_draft_001')],
  };
}

function runRecipePayload(
  profileKind: ExperimentFoundationExecutionProfile['profile_kind'] = 'standard_training',
): RunRecipe {
  const externalLockRefs =
    profileKind === 'llm_fine_tuning' ? fineTuningExternalLockRefsPayload() : [];

  return {
    run_recipe_id: 'run_recipe_001',
    recipe_draft_id: 'recipe_draft_001',
    version_lock: versionLockPayload(externalLockRefs),
    version_lock_hash: 'sha256:version-lock',
    resolved_params: {
      batch_size: 16,
      learning_rate: 0.00002,
    },
    execution_profile: executionProfilePayload(profileKind),
    config_snapshot: {
      command_template: 'python train.py --config config.json',
      params: {
        batch_size: 16,
        learning_rate: 0.00002,
      },
    },
    config_snapshot_hash: 'sha256:config-snapshot',
    readiness_snapshot: readinessSnapshotPayload(),
    run_recipe_hash: 'sha256:run-recipe',
    locked_at: timestamp,
    source_refs: [sourceRef('recipe_draft', 'recipe_draft_001')],
    traceability_refs: [sourceRef('title_card', 'title_card_001')],
  };
}

function trainingPlatformRefPayload(): ExperimentFoundationTrainingPlatformRef {
  return {
    platform_id: 'platform_local_smoke',
    platform_kind: 'local_script',
    adapter_kind: 'local_script',
    adapter_version: 'v1',
    capability_refs: [sourceRef('platform_capability', 'local_smoke')],
  };
}

function materializeTrainingTaskSpecRequestPayload(
  profileKind: ExperimentFoundationExecutionProfile['profile_kind'] = 'standard_training',
): MaterializeTrainingTaskSpecRequest {
  return {
    materialization_request_id: 'materialization_request_001',
    run_recipe: runRecipePayload(profileKind),
    selected_platform: trainingPlatformRefPayload(),
    adapter_version: 'v1',
    idempotency_key: 'materialize:run_recipe_001:v1',
    requested_by_ref: sourceRef('user', 'user_001'),
    created_at: timestamp,
    source_refs: [sourceRef('run_recipe', 'run_recipe_001')],
  };
}

function fineTuningTaskProfilePayload(): FineTuningTaskProfile {
  return {
    fine_tuning_profile_id: 'fine_tuning_profile_001',
    base_model_ref: externalLockRefPayload('base_model'),
    fine_tuning_dataset_refs: [externalLockRefPayload('fine_tuning_dataset')],
    dataset_policy_refs: [sourceRef('data_policy', 'data_policy_001')],
    dataset_policy_hashes: ['sha256:data-policy'],
    fine_tuning_strategy_ref: externalLockRefPayload('fine_tuning_strategy'),
    prompt_template_ref: externalLockRefPayload('prompt_template'),
    context_policy_ref: externalLockRefPayload('context_policy'),
    training_config: {
      epochs: 3,
      learning_rate: 0.00002,
    },
    resource_budget: {
      max_gpu_hours: 2,
      max_tokens: 1_000_000,
    },
    evaluation_protocol_lock: evaluationProtocolLockPayload(),
    evaluation_protocol_ref: sourceRef('evaluation_protocol', 'evaluation_protocol_001'),
    output_artifact_contract: {
      adapter_path: 'outputs/adapter',
      checkpoint_path: 'outputs/checkpoints',
      metrics_path: 'outputs/metrics.json',
      logs_path: 'outputs/logs',
      model_card_path: 'outputs/model-card.md',
    },
    source_refs: [sourceRef('run_recipe', 'run_recipe_001')],
  };
}

function trainingTaskSpecPayload(
  profileKind: ExperimentFoundationExecutionProfile['profile_kind'] = 'standard_training',
): TrainingTaskSpec {
  const baselineLock = baselineImplementationVersionLockPayload();
  const spec: TrainingTaskSpec = {
    training_task_spec_id: 'training_task_spec_001',
    materialization_request_id: 'materialization_request_001',
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    profile_kind: profileKind,
    selected_platform: trainingPlatformRefPayload(),
    runtime_ref: baselineLock.runtime_ref,
    runtime_hash: baselineLock.runtime_hash,
    command: 'python train.py --config config.json',
    args: ['--config', 'config.json'],
    env_refs: [sourceRef('env_profile', 'env_profile_001')],
    input_refs: [sourceRef('dataset_version', 'dataset_version_001')],
    output_contract: {
      metrics_path: 'outputs/metrics.json',
      artifact_root: 'outputs/',
    },
    resource_request: {
      gpu_count: profileKind === 'evaluation_only' ? 0 : 1,
      cpu_count: 4,
      memory_gb: 16,
    },
    timeout_seconds: 7200,
    retry_policy: {
      max_attempts: 1,
    },
    auth_ref_names: ['local_runtime_auth'],
    config_snapshot_hash: 'sha256:config-snapshot',
    created_at: timestamp,
    source_refs: [sourceRef('materialization_request', 'materialization_request_001')],
    traceability_refs: [sourceRef('run_recipe', 'run_recipe_001')],
  };

  return profileKind === 'llm_fine_tuning'
    ? {
        ...spec,
        fine_tuning_profile: fineTuningTaskProfilePayload(),
      }
    : spec;
}

function adapterMetadataRefPayload(): ExperimentFoundationAdapterMetadataRef {
  return {
    adapter_metadata_ref_id: 'adapter_metadata_ref_001',
    adapter_kind: 'local_script',
    adapter_version: 'v1',
    metadata_storage_ref: sourceRef('adapter_metadata_file', 'adapter_metadata_001'),
    metadata_hash: 'sha256:adapter-metadata',
    schema_version: 'v1',
    created_at: timestamp,
    source_refs: [sourceRef('materialization_request', 'materialization_request_001')],
  };
}

function trainingTaskMaterializationResultPayload(): TrainingTaskMaterializationResult {
  return {
    materialization_result_id: 'materialization_result_001',
    materialization_request_id: 'materialization_request_001',
    status: 'materialized',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    adapter_metadata_ref: adapterMetadataRefPayload(),
    adapter_metadata_hash: 'sha256:adapter-metadata',
    materialization_hash: 'sha256:materialization',
    idempotency_key: 'materialize:run_recipe_001:v1',
    blockers: [],
    warnings: [],
    traceability_refs: [sourceRef('run_recipe', 'run_recipe_001')],
    event_refs: [sourceRef('training_task_stage_event', 'stage_event_001')],
    created_at: timestamp,
  };
}

function blockedTrainingTaskMaterializationResultPayload(): TrainingTaskMaterializationResult {
  return {
    materialization_result_id: 'materialization_result_blocked_001',
    materialization_request_id: 'materialization_request_001',
    status: 'blocked',
    materialization_hash: 'sha256:blocked-materialization',
    idempotency_key: 'materialize:run_recipe_001:v1',
    blockers: ['selected platform cannot access dataset mirror'],
    warnings: [],
    traceability_refs: [sourceRef('run_recipe', 'run_recipe_001')],
    event_refs: [sourceRef('training_task_stage_event', 'stage_event_blocked_001')],
    created_at: timestamp,
  };
}

function trainingTaskStageEventPayload(): TrainingTaskStageEvent {
  return {
    stage_event_id: 'stage_event_001',
    event_kind: 'task_spec_materialized',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    event_payload_ref: sourceRef('materialization_result', 'materialization_result_001'),
    event_payload_hash: 'sha256:stage-event-payload',
    occurred_at: timestamp,
    source_refs: [sourceRef('materialization_request', 'materialization_request_001')],
    traceability_refs: [sourceRef('run_recipe', 'run_recipe_001')],
  };
}

function trainingTaskCancellationRequestPayload(): TrainingTaskCancellationRequest {
  return {
    cancellation_request_id: 'cancellation_request_001',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    requested_by_ref: sourceRef('user', 'user_001'),
    reason: 'User requested cancellation before adapter submit.',
    idempotency_key: 'cancel:training_task_spec_001:v1',
    cancellation_status: 'requested',
    requested_at: timestamp,
    source_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
  };
}

function trainingTaskPartialResultRefPayload(): TrainingTaskPartialResultRef {
  return {
    partial_result_ref_id: 'partial_result_ref_001',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    result_kind: 'metrics',
    artifact_ref: sourceRef('partial_result_artifact', 'metrics_json_001'),
    artifact_hash: 'sha256:partial-metrics',
    produced_at: timestamp,
    source_refs: [sourceRef('training_task_stage_event', 'stage_event_001')],
  };
}

function externalTrainingJobPayload(
  status: ExternalTrainingJob['job_status'] = 'running',
): ExternalTrainingJob {
  return {
    external_job_id: 'external_job_001',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    materialization_result_ref: sourceRef(
      'training_task_materialization_result',
      'materialization_result_001',
    ),
    materialization_result_hash: 'sha256:materialization',
    adapter_kind: 'local_script',
    adapter_version: 'v1',
    platform_ref: trainingPlatformRefPayload(),
    idempotency_key: 'submit:training_task_spec_001:v1',
    external_job_ref: sourceRef('local_script_process', 'pid_12345'),
    external_job_hash: 'sha256:external-job',
    job_status: status,
    submitted_at: timestamp,
    last_synced_at: timestamp,
    completed_at: status === 'succeeded' || status === 'failed' || status === 'cancelled'
      ? timestamp
      : null,
    stage_event_refs: [sourceRef('training_task_stage_event', 'stage_event_001')],
    partial_result_refs: [sourceRef('training_task_partial_result_ref', 'partial_result_ref_001')],
    result_refs: status === 'succeeded' ? [sourceRef('experiment_result', 'experiment_result_001')] : [],
    adapter_metadata_refs: [sourceRef('adapter_metadata_ref', 'adapter_metadata_ref_001')],
    adapter_metadata_hashes: ['sha256:adapter-metadata'],
    traceability_refs: [
      sourceRef('training_task_spec', 'training_task_spec_001'),
      sourceRef('training_task_materialization_result', 'materialization_result_001'),
    ],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function resultMetricValuePayload(): ResultMetricValue {
  return {
    metric_key: 'accuracy',
    metric_definition_ref: sourceRef('metric_definition', 'metric_definition_001'),
    value: 0.91,
    value_type: 'number',
    unit: 'ratio',
    split_name: 'test',
    aggregation: { method: 'mean' },
    source_artifact_ref: sourceRef('result_artifact', 'metrics_artifact_001'),
    source_artifact_hash: 'sha256:metrics-artifact',
  };
}

function resultArtifactPayload(
  artifactKind: ResultArtifact['artifact_kind'] = 'metric_bundle',
): ResultArtifact {
  return {
    result_artifact_id: `${artifactKind}_artifact_001`,
    artifact_kind: artifactKind,
    artifact_ref: sourceRef('result_artifact', `${artifactKind}_001`),
    artifact_hash: `sha256:${artifactKind}`,
    checksum_hash: `sha256:${artifactKind}-checksum`,
    byte_size: 4096,
    retention_policy_ref: sourceRef('retention_policy', 'retention_policy_001'),
    created_at: timestamp,
    source_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
  };
}

function resultLogRefPayload(): ResultLogRef {
  return {
    log_ref: sourceRef('result_log', 'stdout_log_001'),
    log_hash: 'sha256:stdout-log',
    log_kind: 'stdout',
    byte_size: 2048,
    source_refs: [sourceRef('training_task_stage_event', 'stage_event_001')],
  };
}

function experimentResultPayload(): ExperimentResult {
  return {
    experiment_result_id: 'experiment_result_001',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    materialization_result_ref: sourceRef(
      'training_task_materialization_result',
      'materialization_result_001',
    ),
    materialization_result_hash: 'sha256:materialization',
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    profile_kind: 'standard_training',
    external_job_ref: sourceRef('external_training_job', 'external_job_001'),
    external_job_hash: 'sha256:external-job',
    metrics: [resultMetricValuePayload()],
    artifacts: [
      resultArtifactPayload('metric_bundle'),
      resultArtifactPayload('prediction_bundle'),
    ],
    logs: [resultLogRefPayload()],
    config_snapshot_ref: sourceRef('config_snapshot', 'config_snapshot_001'),
    config_snapshot_hash: 'sha256:config-snapshot',
    partial_result_refs: [trainingTaskPartialResultRefPayload()],
    validation_report_refs: [sourceRef('result_validation_report', 'validation_report_001')],
    provenance_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
    result_hash: 'sha256:experiment-result',
    created_at: timestamp,
  };
}

function fineTuningResultPayload(
  validationStatus: FineTuningResult['validation_status'] = 'valid',
): FineTuningResult {
  return {
    fine_tuning_result_id: 'fine_tuning_result_001',
    experiment_result_ref: sourceRef('experiment_result', 'experiment_result_001'),
    experiment_result_hash: 'sha256:experiment-result',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    base_model_ref: externalLockRefPayload('base_model'),
    fine_tuning_dataset_refs: [externalLockRefPayload('fine_tuning_dataset')],
    adapter_artifact_ref: sourceRef('result_artifact', 'adapter_artifact_001'),
    adapter_artifact_hash: 'sha256:adapter-artifact',
    checkpoint_artifact_refs: [resultArtifactPayload('checkpoint')],
    merged_model_artifact_ref: sourceRef('result_artifact', 'merged_model_001'),
    merged_model_artifact_hash: 'sha256:merged-model',
    train_metrics: [
      {
        ...resultMetricValuePayload(),
        metric_key: 'train_loss',
        value: 0.12,
        unit: 'loss',
      },
    ],
    eval_metrics: [resultMetricValuePayload()],
    training_curve_refs: [resultArtifactPayload('training_curve')],
    model_card_ref: sourceRef('result_artifact', 'model_card_001'),
    model_card_hash: 'sha256:model-card',
    validation_status: validationStatus,
    blockers: validationStatus === 'valid' ? [] : ['missing held-out evaluation'],
    traceability_refs: [sourceRef('run_recipe', 'run_recipe_001')],
    result_hash: 'sha256:fine-tuning-result',
    created_at: timestamp,
  };
}

function resultValidationReportPayload(
  validationStatus: ResultValidationReport['validation_status'] = 'valid',
): ResultValidationReport {
  return {
    result_validation_report_id: 'validation_report_001',
    source_result_ref: sourceRef('experiment_result', 'experiment_result_001'),
    source_result_hash: 'sha256:experiment-result',
    validation_status: validationStatus,
    evaluation_protocol_lock: evaluationProtocolLockPayload(),
    checked_metric_keys: ['accuracy'],
    missing_metric_keys: validationStatus === 'valid' ? [] : ['macro_f1'],
    missing_artifact_kinds: validationStatus === 'valid' ? [] : ['prediction_bundle'],
    protocol_violations: validationStatus === 'invalid' ? ['missing required metric'] : [],
    warnings: validationStatus === 'partial' ? ['partial metrics only'] : [],
    generated_fact_refs: [sourceRef('evaluation_fact', 'evaluation_fact_001')],
    partial_acceptance_ref:
      validationStatus === 'accepted_partial'
        ? sourceRef('partial_acceptance', 'partial_acceptance_001')
        : null,
    validation_hash: 'sha256:result-validation',
    validated_at: timestamp,
    source_refs: [sourceRef('experiment_result', 'experiment_result_001')],
  };
}

function metricObservationPayload(): MetricObservation {
  return {
    metric_observation_id: 'metric_observation_001',
    metric_definition_ref: sourceRef('metric_definition', 'metric_definition_001'),
    metric_key: 'accuracy',
    value: 0.91,
    value_type: 'number',
    direction: 'higher_is_better',
    unit: 'ratio',
    split_name: 'test',
    aggregation: { method: 'mean' },
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    result_ref: sourceRef('experiment_result', 'experiment_result_001'),
    result_hash: 'sha256:experiment-result',
    evaluation_protocol_id: 'evaluation_protocol_001',
    evaluation_protocol_hash: 'sha256:evaluation-protocol',
    benchmark_asset_ref: sourceRef('benchmark_asset', 'benchmark_asset_001'),
    dataset_version_ref: sourceRef('dataset_version', 'dataset_version_001'),
    validation_report_ref: sourceRef('result_validation_report', 'validation_report_001'),
    validation_report_hash: 'sha256:result-validation',
    observation_hash: 'sha256:metric-observation',
    created_at: timestamp,
    source_refs: [sourceRef('result_validation_report', 'validation_report_001')],
  };
}

function comparisonObservationPayload(): ComparisonObservation {
  return {
    comparison_observation_id: 'comparison_observation_001',
    primary_metric_observation_ref: sourceRef('metric_observation', 'metric_observation_001'),
    primary_metric_observation_hash: 'sha256:metric-observation',
    baseline_metric_observation_ref: sourceRef(
      'metric_observation',
      'baseline_metric_observation_001',
    ),
    baseline_metric_observation_hash: 'sha256:baseline-metric-observation',
    comparison_outcome: 'better',
    delta: 0.03,
    relative_delta: 0.034,
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    result_ref: sourceRef('experiment_result', 'experiment_result_001'),
    result_hash: 'sha256:experiment-result',
    evaluation_protocol_id: 'evaluation_protocol_001',
    evaluation_protocol_hash: 'sha256:evaluation-protocol',
    benchmark_asset_ref: sourceRef('benchmark_asset', 'benchmark_asset_001'),
    baseline_asset_ref: sourceRef('baseline_asset', 'baseline_asset_001'),
    validation_report_ref: sourceRef('result_validation_report', 'validation_report_001'),
    validation_report_hash: 'sha256:result-validation',
    observation_hash: 'sha256:comparison-observation',
    created_at: timestamp,
    source_refs: [sourceRef('result_validation_report', 'validation_report_001')],
  };
}

function evaluationFactPayload(): EvaluationFact {
  return {
    evaluation_fact_id: 'evaluation_fact_001',
    fact_kind: 'metric',
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    result_ref: sourceRef('experiment_result', 'experiment_result_001'),
    result_hash: 'sha256:experiment-result',
    evaluation_protocol_id: 'evaluation_protocol_001',
    evaluation_protocol_hash: 'sha256:evaluation-protocol',
    benchmark_asset_ref: sourceRef('benchmark_asset', 'benchmark_asset_001'),
    dataset_version_ref: sourceRef('dataset_version', 'dataset_version_001'),
    validation_report_ref: sourceRef('result_validation_report', 'validation_report_001'),
    validation_report_hash: 'sha256:result-validation',
    metric_observation_refs: [sourceRef('metric_observation', 'metric_observation_001')],
    comparison_observation_refs: [
      sourceRef('comparison_observation', 'comparison_observation_001'),
    ],
    artifact_refs: [sourceRef('result_artifact', 'metric_bundle_001')],
    fact_payload: {
      summary: 'Accuracy measured on the locked test split.',
    },
    fact_hash: 'sha256:evaluation-fact',
    created_at: timestamp,
    source_refs: [sourceRef('result_validation_report', 'validation_report_001')],
    provenance_refs: [sourceRef('experiment_result', 'experiment_result_001')],
  };
}

function implementationDecisionSignalPayload(): ImplementationDecisionSignal {
  return {
    implementation_decision_signal_id: 'implementation_decision_signal_001',
    signal_kind: 'continue',
    reason_summary: 'Validated metrics clear the smoke threshold.',
    evaluation_fact_refs: [sourceRef('evaluation_fact', 'evaluation_fact_001')],
    metric_observation_refs: [sourceRef('metric_observation', 'metric_observation_001')],
    comparison_observation_refs: [
      sourceRef('comparison_observation', 'comparison_observation_001'),
    ],
    run_recipe_ref: sourceRef('run_recipe', 'run_recipe_001'),
    run_recipe_hash: 'sha256:run-recipe',
    recipe_draft_ref: sourceRef('recipe_draft', 'recipe_draft_001'),
    proposal_ref: sourceRef('implementation_proposal', 'proposal_001'),
    trial_ref: sourceRef('experiment_trial', 'trial_001'),
    created_by_ref: sourceRef('user', 'user_001'),
    created_at: timestamp,
    signal_hash: 'sha256:implementation-decision-signal',
    source_refs: [sourceRef('evaluation_fact', 'evaluation_fact_001')],
  };
}

function paperTableFactSetPayload(): PaperTableFactSet {
  return {
    paper_table_fact_set_id: 'paper_table_fact_set_001',
    paper_project_id: 'paper_project_001',
    title: 'AG News evaluation facts',
    table_intent: 'Compare locked method and baseline observations later.',
    fact_refs: [sourceRef('evaluation_fact', 'evaluation_fact_001')],
    fact_hashes: ['sha256:evaluation-fact'],
    metric_observation_refs: [sourceRef('metric_observation', 'metric_observation_001')],
    metric_observation_hashes: ['sha256:metric-observation'],
    comparison_observation_refs: [
      sourceRef('comparison_observation', 'comparison_observation_001'),
    ],
    comparison_observation_hashes: ['sha256:comparison-observation'],
    validation_report_refs: [sourceRef('result_validation_report', 'validation_report_001')],
    validation_report_hashes: ['sha256:result-validation'],
    selection_criteria: {
      benchmark: 'AG News',
      metric: 'accuracy',
    },
    fact_set_hash: 'sha256:paper-table-fact-set',
    created_at: timestamp,
    source_refs: [sourceRef('paper_project', 'paper_project_001')],
  };
}

function evidenceCandidatePayload(
  validationStatus: EvidenceCandidate['validation_status'] = 'valid',
): EvidenceCandidate {
  return {
    evidence_candidate_id: 'evidence_candidate_001',
    evidence_status: 'candidate',
    validation_status: validationStatus,
    source_result_refs: [sourceRef('experiment_result', 'experiment_result_001')],
    source_result_hashes: ['sha256:experiment-result'],
    validation_report_refs: [sourceRef('result_validation_report', 'validation_report_001')],
    validation_report_hashes: ['sha256:result-validation'],
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    evaluation_protocol_id: 'evaluation_protocol_001',
    evaluation_protocol_hash: 'sha256:evaluation-protocol',
    metric_observation_refs: [sourceRef('metric_observation', 'metric_observation_001')],
    metric_observation_hashes: ['sha256:metric-observation'],
    artifact_refs: [sourceRef('result_artifact', 'metric_bundle_001')],
    caveats: validationStatus === 'accepted_partial' ? ['partial acceptance only'] : [],
    blockers: [],
    provenance_refs: [sourceRef('experiment_result', 'experiment_result_001')],
    review_refs: [sourceRef('evidence_review', 'review_001')],
    created_by_ref: sourceRef('user', 'user_001'),
    created_at: timestamp,
    evidence_hash: 'sha256:evidence-candidate',
  };
}

function paperExperimentSidecarPayload(): PaperExperimentSidecar {
  return {
    paper_experiment_sidecar_id: 'paper_experiment_sidecar_001',
    paper_project_id: 'paper_project_001',
    sidecar_status: 'linked',
    run_recipe_ref: sourceRef('run_recipe', 'run_recipe_001'),
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    version_lock_snapshot_refs: [sourceRef('version_lock', 'version_lock_001')],
    dataset_version_lock_ref: sourceRef('dataset_version_lock', 'dataset_version_lock_001'),
    dataset_version_lock_hash: 'sha256:checksum-manifest',
    evaluation_protocol_lock_ref: sourceRef(
      'evaluation_protocol_lock',
      'evaluation_protocol_lock_001',
    ),
    evaluation_protocol_hash: 'sha256:evaluation-protocol',
    benchmark_asset_ref: sourceRef('benchmark_asset', 'benchmark_asset_001'),
    baseline_implementation_lock_refs: [
      sourceRef('baseline_implementation_version_lock', 'baseline_impl_version_001'),
    ],
    baseline_implementation_hashes: ['sha256:baseline-implementation'],
    method_component_lock_refs: [
      sourceRef('method_recipe_component_lock', 'method_component_001'),
    ],
    method_component_hashes: ['sha256:method-component'],
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    materialization_result_ref: sourceRef(
      'training_task_materialization_result',
      'materialization_result_001',
    ),
    materialization_result_hash: 'sha256:materialization',
    adapter_metadata_refs: [sourceRef('adapter_metadata_ref', 'adapter_metadata_ref_001')],
    adapter_metadata_hashes: ['sha256:adapter-metadata'],
    external_job_ref: sourceRef('external_training_job', 'external_job_001'),
    external_job_hash: 'sha256:external-job',
    stage_event_refs: [sourceRef('training_task_stage_event', 'stage_event_001')],
    cancellation_request_refs: [
      sourceRef('training_task_cancellation_request', 'cancellation_request_001'),
    ],
    partial_result_refs: [sourceRef('training_task_partial_result', 'partial_result_ref_001')],
    result_refs: [sourceRef('experiment_result', 'experiment_result_001')],
    result_hashes: ['sha256:experiment-result'],
    validation_report_refs: [sourceRef('result_validation_report', 'validation_report_001')],
    validation_report_hashes: ['sha256:result-validation'],
    evaluation_fact_refs: [sourceRef('evaluation_fact', 'evaluation_fact_001')],
    evaluation_fact_hashes: ['sha256:evaluation-fact'],
    evidence_candidate_refs: [sourceRef('evidence_candidate', 'evidence_candidate_001')],
    evidence_candidate_hashes: ['sha256:evidence-candidate'],
    paper_table_fact_set_refs: [sourceRef('paper_table_fact_set', 'paper_table_fact_set_001')],
    paper_table_fact_set_hashes: ['sha256:paper-table-fact-set'],
    status_snapshot_refs: [sourceRef('sidecar_status_snapshot', 'snapshot_001')],
    event_log_refs: [sourceRef('paper_experiment_event_log', 'event_log_001')],
    provenance_refs: [sourceRef('paper_project', 'paper_project_001')],
    sidecar_hash: 'sha256:paper-experiment-sidecar',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function assetCandidateSourceTracePayload(): ExperimentAssetCandidateSourceTrace {
  return {
    source_trace_id: 'candidate_source_trace_001',
    source_kind: 'literature_key_content',
    source_ref: sourceRef('literature_key_content', 'key_content_001'),
    extraction_ref: sourceRef('candidate_extraction', 'extraction_001'),
    evidence_locator_snapshot: {
      quote_span_ref: 'paper_001:p12:s3',
      observed_name: 'AG News',
    },
    confidence_score: 0.93,
    extracted_at: timestamp,
    created_at: timestamp,
  };
}

function assetCandidateDuplicateCheckPayload(
  duplicateStatus: ExperimentAssetCandidateDuplicateCheck['duplicate_status'] = 'no_duplicate',
): ExperimentAssetCandidateDuplicateCheck {
  return {
    duplicate_check_id: 'duplicate_check_001',
    duplicate_status: duplicateStatus,
    checked_refs: [sourceRef('dataset_asset', 'dataset_asset_001')],
    possible_duplicate_refs:
      duplicateStatus === 'no_duplicate'
        ? []
        : [sourceRef('dataset_asset', 'dataset_asset_possible_duplicate_001')],
    rationale:
      duplicateStatus === 'no_duplicate'
        ? 'No canonical asset matched the source trace and normalized name.'
        : 'Normalized name or source URL may match an existing canonical asset.',
    checked_at: timestamp,
  };
}

function assetCandidateCompletenessCheckPayload(
  completenessStatus: ExperimentAssetCandidateCompletenessCheck['completeness_status'] = 'complete',
): ExperimentAssetCandidateCompletenessCheck {
  return {
    completeness_check_id: 'completeness_check_001',
    completeness_status: completenessStatus,
    required_fields: ['canonical_name', 'source_refs', 'policy_check', 'risk_assessment'],
    missing_fields: completenessStatus === 'complete' ? [] : ['policy_check.policy_hash'],
    checked_at: timestamp,
  };
}

function assetCandidatePolicyCheckPayload(
  policyStatus: ExperimentAssetCandidatePolicyCheck['policy_status'] = 'clear',
): ExperimentAssetCandidatePolicyCheck {
  return {
    policy_check_id: 'policy_check_001',
    policy_status: policyStatus,
    license: policyStatus === 'clear' ? 'CC BY-SA 4.0' : 'unknown',
    policy_ref:
      policyStatus === 'clear' ? sourceRef('data_policy', 'data_policy_001') : null,
    policy_hash: policyStatus === 'clear' ? 'sha256:data-policy' : null,
    restricted_reasons:
      policyStatus === 'clear' ? [] : ['license is unclear or usage is restricted'],
    checked_at: timestamp,
  };
}

function assetCandidateRiskAssessmentPayload(
  riskLevel: ExperimentAssetCandidateRiskAssessment['risk_level'] = 'low',
): ExperimentAssetCandidateRiskAssessment {
  return {
    risk_assessment_id: 'risk_assessment_001',
    risk_level: riskLevel,
    risk_reasons: riskLevel === 'low' ? [] : ['manual verification required before promotion'],
    privacy_sensitive: riskLevel === 'restricted',
    model_weight_sensitive: riskLevel === 'high' || riskLevel === 'restricted',
    requires_manual_review: riskLevel !== 'low',
    assessed_at: timestamp,
  };
}

function assetCandidateRuleTracePayload(): ExperimentAssetCandidateRuleTrace {
  return {
    rule_trace_id: 'rule_trace_001',
    rule_id: 'candidate-auto-promotion-eligibility',
    rule_version: 'v1',
    outcome: 'eligible',
    triggered_reasons: ['source_provenance_present', 'policy_clear', 'no_duplicate'],
    trace_hash: 'sha256:candidate-rule-trace',
    created_at: timestamp,
  };
}

function assetCandidateCommonFields(
  candidateStatus: DatasetAssetCandidate['candidate_status'] = 'ready_for_promotion',
) {
  return {
    candidate_status: candidateStatus,
    canonical_name: 'AG News',
    aliases: ['ag_news'],
    description: 'Candidate extracted from literature or manual observation.',
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    source_traces: [assetCandidateSourceTracePayload()],
    extraction_provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    confidence_score: 0.92,
    duplicate_check: assetCandidateDuplicateCheckPayload(),
    completeness_check: assetCandidateCompletenessCheckPayload(),
    policy_check: assetCandidatePolicyCheckPayload(),
    risk_assessment: assetCandidateRiskAssessmentPayload(),
    deterministic_rule_trace_refs: [sourceRef('candidate_rule_trace', 'rule_trace_001')],
    existing_canonical_refs: [],
    candidate_hash: 'sha256:asset-candidate',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function datasetAssetCandidatePayload(
  datasetUsage: DatasetAssetCandidate['dataset_usage'] = 'benchmark_dataset',
): DatasetAssetCandidate {
  return {
    dataset_asset_candidate_id: 'dataset_asset_candidate_001',
    candidate_family: 'dataset',
    dataset_usage: datasetUsage,
    task_types:
      datasetUsage === 'fine_tuning_dataset' ? ['instruction_tuning'] : ['text_classification'],
    schema_summary: {
      columns: datasetUsage === 'fine_tuning_dataset' ? ['prompt', 'completion'] : ['text', 'label'],
    },
    version_label: 'candidate-v1',
    proposed_version_refs: [sourceRef('dataset_version_candidate', 'dataset_version_candidate_001')],
    proposed_policy_refs: [sourceRef('data_policy_candidate', 'data_policy_candidate_001')],
    proposed_location_refs: [sourceRef('dataset_location_candidate', 'dataset_location_candidate_001')],
    ...assetCandidateCommonFields(),
  };
}

function benchmarkAssetCandidatePayload(): BenchmarkAssetCandidate {
  return {
    benchmark_asset_candidate_id: 'benchmark_asset_candidate_001',
    candidate_family: 'benchmark',
    task: 'text_classification',
    domain: 'news',
    dataset_refs: [sourceRef('dataset_asset_candidate', 'dataset_asset_candidate_001')],
    evaluation_protocol_candidate_refs: [
      sourceRef('evaluation_protocol_candidate', 'evaluation_protocol_candidate_001'),
    ],
    community_refs: [sourceRef('community_benchmark', 'ag_news')],
    ...assetCandidateCommonFields(),
    canonical_name: 'AG News Benchmark',
    candidate_hash: 'sha256:benchmark-asset-candidate',
  };
}

function baselineAssetCandidatePayload(): BaselineAssetCandidate {
  return {
    baseline_asset_candidate_id: 'baseline_asset_candidate_001',
    candidate_family: 'baseline',
    baseline_family: 'model',
    supported_benchmark_refs: [sourceRef('benchmark_asset_candidate', 'benchmark_asset_candidate_001')],
    implementation_source_refs: [sourceRef('git_repository', 'repo_001')],
    ...assetCandidateCommonFields(),
    canonical_name: 'BERT Baseline',
    candidate_hash: 'sha256:baseline-asset-candidate',
  };
}

function evaluationProtocolCandidatePayload(): EvaluationProtocolCandidate {
  return {
    evaluation_protocol_candidate_id: 'evaluation_protocol_candidate_001',
    candidate_family: 'evaluation_protocol',
    benchmark_ref: sourceRef('benchmark_asset_candidate', 'benchmark_asset_candidate_001'),
    protocol_version: 'v1',
    protocol_hash: 'sha256:evaluation-protocol-candidate',
    metric_definition_refs: [sourceRef('metric_definition_candidate', 'metric_definition_candidate_001')],
    evaluator_refs: [sourceRef('evaluator_candidate', 'evaluator_candidate_001')],
    protocol_summary: {
      primary_metric: 'accuracy',
      split: 'official_test',
    },
    ...assetCandidateCommonFields(),
    canonical_name: 'AG News Accuracy Protocol',
    candidate_hash: 'sha256:evaluation-protocol-candidate-record',
  };
}

function methodComponentCandidatePayload(): MethodComponentCandidate {
  return {
    method_component_candidate_id: 'method_component_candidate_001',
    candidate_family: 'method_component',
    component_kind: 'training_strategy',
    version_label: 'v1',
    component_hash: 'sha256:method-component-candidate',
    component_spec: {
      epochs: 3,
      optimizer: 'adamw',
    },
    ...assetCandidateCommonFields(),
    canonical_name: 'Supervised Fine-Tuning Strategy',
    candidate_hash: 'sha256:method-component-candidate-record',
  };
}

function baseModelCandidatePayload(): BaseModelCandidate {
  return {
    base_model_candidate_id: 'base_model_candidate_001',
    candidate_family: 'base_model',
    model_family: 'encoder',
    model_provider: 'huggingface',
    model_ref: sourceRef('model_registry_entry', 'bert-base-uncased'),
    license: 'Apache-2.0',
    weight_access_policy: 'open_weights',
    supported_task_types: ['text_classification', 'fine_tuning'],
    ...assetCandidateCommonFields(),
    canonical_name: 'BERT Base Uncased',
    candidate_hash: 'sha256:base-model-candidate',
  };
}

function assetCandidateTriageReportPayload(): ExperimentAssetCandidateTriageReport {
  return {
    triage_report_id: 'candidate_triage_report_001',
    candidate_ref: sourceRef('dataset_asset_candidate', 'dataset_asset_candidate_001'),
    candidate_hash: 'sha256:asset-candidate',
    candidate_family: 'dataset',
    recommended_status: 'ready_for_promotion',
    confidence_score: 0.92,
    duplicate_status: 'no_duplicate',
    completeness_status: 'complete',
    policy_status: 'clear',
    risk_level: 'low',
    blockers: [],
    warnings: [],
    rule_trace_refs: [sourceRef('candidate_rule_trace', 'rule_trace_001')],
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    triage_hash: 'sha256:candidate-triage-report',
    created_at: timestamp,
  };
}

function assetPromotionRequestPayload(
  decisionKind: ExperimentAssetPromotionRequest['decision_kind'] = 'auto_promote',
): ExperimentAssetPromotionRequest {
  return {
    promotion_request_id: 'promotion_request_001',
    candidate_ref: sourceRef('dataset_asset_candidate', 'dataset_asset_candidate_001'),
    candidate_hash: 'sha256:asset-candidate',
    candidate_family: 'dataset',
    decision_kind: decisionKind,
    candidate_status:
      decisionKind === 'auto_promote' ? 'ready_for_promotion' : 'manual_review_required',
    confidence_score: decisionKind === 'auto_promote' ? 0.92 : 0.68,
    duplicate_status: decisionKind === 'auto_promote' ? 'no_duplicate' : 'possible_duplicate',
    completeness_status: decisionKind === 'auto_promote' ? 'complete' : 'needs_info',
    policy_status: decisionKind === 'auto_promote' ? 'clear' : 'unclear_license',
    risk_level: decisionKind === 'auto_promote' ? 'low' : 'high',
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    deterministic_rule_trace_refs: [sourceRef('candidate_rule_trace', 'rule_trace_001')],
    required_version_refs: [sourceRef('dataset_version_candidate', 'dataset_version_candidate_001')],
    required_policy_refs: [sourceRef('data_policy_candidate', 'data_policy_candidate_001')],
    required_protocol_refs: [sourceRef('evaluation_protocol_candidate', 'evaluation_protocol_candidate_001')],
    triage_report_ref: sourceRef('asset_candidate_triage_report', 'candidate_triage_report_001'),
    triage_report_hash: 'sha256:candidate-triage-report',
    reviewer_ref:
      decisionKind === 'manual_promote' ? sourceRef('human_reviewer', 'reviewer_001') : null,
    requested_by_ref: sourceRef('user', 'user_001'),
    requested_at: timestamp,
    request_hash: `sha256:${decisionKind}-promotion-request`,
  };
}

function assetPromotionResultPayload(): ExperimentAssetPromotionResult {
  return {
    promotion_result_id: 'promotion_result_001',
    promotion_request_id: 'promotion_request_001',
    candidate_ref: sourceRef('dataset_asset_candidate', 'dataset_asset_candidate_001'),
    candidate_hash: 'sha256:asset-candidate',
    candidate_family: 'dataset',
    result_status: 'promoted',
    canonical_asset_refs: [sourceRef('dataset_asset', 'dataset_asset_001')],
    canonical_version_refs: [sourceRef('dataset_version', 'dataset_version_001')],
    canonical_protocol_refs: [sourceRef('evaluation_protocol', 'evaluation_protocol_001')],
    canonical_policy_refs: [sourceRef('data_policy', 'data_policy_001')],
    blockers: [],
    warnings: [],
    source_refs: [sourceRef('literature_key_content', 'key_content_001')],
    provenance_refs: [sourceRef('candidate_extraction', 'extraction_001')],
    promotion_hash: 'sha256:promotion-result',
    created_at: timestamp,
  };
}

function storedExperimentFoundationRecordPayload(): ExperimentFoundationStoredRecord {
  return {
    id: 'experiment_foundation_record_001',
    record_kind: 'dataset_asset',
    record_id: 'dataset_asset_001',
    record_hash: 'sha256:dataset-asset',
    status: 'active',
    family: 'dataset',
    parent_record_kind: null,
    parent_record_id: null,
    owner_ref_type: null,
    owner_ref_id: null,
    payload: datasetAssetPayload() as unknown as Record<string, unknown>,
    source_refs: [sourceRef('manual_observation', 'observation_001')],
    traceability_refs: [sourceRef('literature_key_content', 'key_content_001')],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function readinessCheckResponsePayload(
  readinessStatus: ExperimentFoundationReadinessCheckResponse['readiness_status'] = 'passed',
): ExperimentFoundationReadinessCheckResponse {
  return {
    readiness_report_id: 'readiness_report_001',
    target_ref: sourceRef('run_recipe', 'run_recipe_001'),
    readiness_status: readinessStatus,
    readiness_hash: 'sha256:readiness-report',
    blockers: readinessStatus === 'passed' ? [] : ['target has missing hashes'],
    warnings: [],
    required_actions: readinessStatus === 'passed' ? [] : ['repair target hashes'],
    source_refs: [sourceRef('system_check', 'experiment_foundation_readiness')],
    checked_at: timestamp,
    created_at: timestamp,
  };
}

function promotionDecisionResponsePayload(): ExperimentFoundationPromotionDecisionResponse {
  return {
    promotion_request_record: {
      ...storedExperimentFoundationRecordPayload(),
      id: 'experiment_foundation_record_promotion_request',
      record_kind: 'asset_promotion_request',
      record_id: 'promotion_request_001',
      record_hash: 'sha256:auto_promote-promotion-request',
      payload: assetPromotionRequestPayload() as unknown as Record<string, unknown>,
    },
    promotion_result_record: {
      ...storedExperimentFoundationRecordPayload(),
      id: 'experiment_foundation_record_promotion_result',
      record_kind: 'asset_promotion_result',
      record_id: 'promotion_result_001',
      record_hash: 'sha256:promotion-result',
      payload: assetPromotionResultPayload() as unknown as Record<string, unknown>,
    },
    candidate_record: {
      ...storedExperimentFoundationRecordPayload(),
      id: 'experiment_foundation_record_candidate',
      record_kind: 'dataset_asset_candidate',
      record_id: 'dataset_asset_candidate_001',
      record_hash: 'sha256:asset-candidate',
      status: 'promoted',
      payload: {
        ...datasetAssetCandidatePayload(),
        candidate_status: 'promoted',
      } as unknown as Record<string, unknown>,
    },
  };
}

test('experiment-foundation dataset registry schemas load', () => {
  assert.ok(experimentFoundationDatasetAssetSchema);
  assert.ok(experimentFoundationDatasetVersionSchema);
  assert.ok(experimentFoundationDatasetMirrorSchema);
  assert.deepEqual([...EXPERIMENT_FOUNDATION_DATASET_CATALOG_STATUSES], [
    'registered',
    'active',
    'deprecated',
    'archived',
  ]);
});

test('experiment-foundation dataset registry schemas accept canonical payloads', async () => {
  assert.equal(await validateWithSchema(experimentFoundationDatasetAssetSchema, datasetAssetPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationDatasetVersionSchema, datasetVersionPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationStorageRootRefSchema, storageRootPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationDatasetLocationSchema, datasetLocationPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationDatasetMirrorSchema, datasetMirrorPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationChecksumManifestSchema, checksumManifestPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationSplitProtocolSchema, splitProtocolPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationDataPolicySchema, dataPolicyPayload()), 200);
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetVersionLockSchema, datasetVersionLockPayload()),
    200,
  );
});

test('DatasetAsset schema rejects version, checksum, storage, path, uri, location, and mirror leakage', async () => {
  for (const leakedField of ['version', 'checksum', 'storage_ref', 'path', 'uri', 'location', 'mirror'] as const) {
    const payload = {
      ...datasetAssetPayload(),
      [leakedField]: 'must-not-live-on-dataset-asset',
    };

    assert.equal(
      await validateWithSchema(experimentFoundationDatasetAssetSchema, payload),
      400,
      `${leakedField} should be rejected on DatasetAsset`,
    );
  }
});

test('DatasetMirror schema rejects canonical drift and missing source checksum manifest hash', async () => {
  const { source_checksum_manifest_hash: _hash, ...missingSourceHash } = datasetMirrorPayload();

  assert.equal(await validateWithSchema(experimentFoundationDatasetMirrorSchema, missingSourceHash), 400);
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetMirrorSchema, {
      ...datasetMirrorPayload(),
      mirror_role: 'canonical',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetMirrorSchema, {
      ...datasetMirrorPayload(),
      canonical: true,
    }),
    400,
  );
});

test('DatasetLocation schema requires resolvable local or remote refs by location kind', async () => {
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetLocationSchema, {
      dataset_location_id: 'dataset_location_002',
      dataset_version_id: 'dataset_version_001',
      location_kind: 'local_file',
      availability_status: 'available',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetLocationSchema, {
      ...datasetLocationPayload(),
      local_file_ref: null,
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetLocationSchema, {
      dataset_location_id: 'dataset_location_003',
      dataset_version_id: 'dataset_version_001',
      location_kind: 'remote_object',
      availability_status: 'available',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetLocationSchema, {
      dataset_location_id: 'dataset_location_004',
      dataset_version_id: 'dataset_version_001',
      location_kind: 'remote_object',
      remote_ref: {
        provider: 'aliyun_oss',
        ref_kind: 'object_prefix',
        ref_value: 'oss://bucket/ag-news/2026-05-17',
      },
      availability_status: 'available',
    }),
    200,
  );
});

test('LocalFileRef schema rejects absolute and parent-traversal paths', async () => {
  assert.equal(
    await validateWithSchema(experimentFoundationLocalFileRefSchema, {
      ...localFileRef(),
      relative_path: '/tmp/raw-dataset',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationLocalFileRefSchema, {
      ...localFileRef(),
      relative_path: '../raw-dataset',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationLocalFileRefSchema, {
      ...localFileRef(),
      relative_path: 'datasets/../raw-dataset',
    }),
    400,
  );
});

test('DatasetVersionLock schema rejects incomplete or storage-bearing executable locks', async () => {
  for (const missingField of [
    'checksum_manifest_hash',
    'split_protocol_hash',
    'data_policy_id',
    'data_policy_hash',
  ] as const) {
    const payload = { ...datasetVersionLockPayload() };
    delete payload[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationDatasetVersionLockSchema, payload),
      400,
      `${missingField} should be required by DatasetVersionLock`,
    );
  }

  assert.equal(
    await validateWithSchema(experimentFoundationDatasetVersionLockSchema, {
      ...datasetVersionLockPayload(),
      storage_path: '/tmp/datasets/ag-news',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationDatasetVersionLockSchema, {
      ...datasetVersionLockPayload(),
      mirror_ref: sourceRef('dataset_mirror', 'dataset_mirror_001'),
    }),
    400,
  );
});

test('experiment-foundation benchmark/protocol/baseline schemas load and accept canonical payloads', async () => {
  assert.deepEqual([...EXPERIMENT_FOUNDATION_BENCHMARK_VERIFICATION_STATUSES], [
    'unknown',
    'protocol_complete',
    'assets_reachable',
    'evaluator_smoke_verified',
    'reproducible_protocol',
    'comparison_certified',
    'broken',
  ]);
  assert.equal(await validateWithSchema(experimentFoundationBenchmarkAssetSchema, benchmarkAssetPayload()), 200);
  assert.equal(
    await validateWithSchema(experimentFoundationMetricDefinitionSchema, metricDefinitionPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationEvaluationProtocolSchema, evaluationProtocolPayload()),
    200,
  );
  assert.equal(await validateWithSchema(experimentFoundationBaselineAssetSchema, baselineAssetPayload()), 200);
  assert.equal(
    await validateWithSchema(
      experimentFoundationBaselineImplementationVersionSchema,
      baselineImplementationVersionPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationEvaluationProtocolLockSchema, evaluationProtocolLockPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationBaselineImplementationVersionLockSchema,
      baselineImplementationVersionLockPayload(),
    ),
    200,
  );
});

test('BenchmarkAsset schema rejects embedded evaluation protocol internals', async () => {
  for (const leakedField of [
    'metric_definitions',
    'metric_definition_refs',
    'metrics',
    'evaluator_refs',
    'evaluator_config',
    'reporting_protocol',
    'comparison_policy',
    'comparison_rules',
    'statistical_protocol',
    'statistical_policy',
    'budget_fairness_policy',
    'tuning_fairness_policy',
    'baseline_implementation_id',
    'baseline_implementation_ids',
    'baseline_implementation_ref',
    'baseline_implementation_refs',
    'baseline_implementation_version_id',
    'baseline_implementation_version_ids',
    'baseline_implementation_version_ref',
    'baseline_implementation_version_refs',
  ] as const) {
    const payload = {
      ...benchmarkAssetPayload(),
      [leakedField]: forbiddenLeakValue(leakedField),
    };

    assert.equal(
      await validateWithSchema(experimentFoundationBenchmarkAssetSchema, payload),
      400,
      `${leakedField} should be rejected on BenchmarkAsset`,
    );
  }
});

test('EvaluationProtocolLock schema requires protocol version and hash', async () => {
  for (const missingField of ['protocol_version', 'protocol_hash'] as const) {
    const payload: Record<string, unknown> = { ...evaluationProtocolLockPayload() };
    delete payload[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationEvaluationProtocolLockSchema, payload),
      400,
      `${missingField} should be required by EvaluationProtocolLock`,
    );
  }
});

test('BaselineAsset schema rejects implementation details and retired selection fields', async () => {
  for (const leakedField of [
    'code_ref',
    'commit_hash',
    'runtime_ref',
    'entrypoint',
    'default_params',
    'params',
    'baseline_set_id',
    'baseline_set_ids',
    'linked_protocol_id',
    'linked_protocol_ids',
    'protocol_id',
    'protocol_ids',
    'protocol_ref',
    'protocol_refs',
    'evaluation_protocol_id',
    'evaluation_protocol_ids',
    'evaluation_protocol_ref',
    'evaluation_protocol_refs',
    'supported_evaluation_protocol_refs',
    'default_evaluation_protocol_refs',
    'metric_definition_refs',
    'evaluator_refs',
    'reporting_protocol',
    'comparison_policy',
    'statistical_protocol',
    'budget_fairness_policy',
    'tuning_fairness_policy',
  ] as const) {
    const payload = {
      ...baselineAssetPayload(),
      [leakedField]: forbiddenLeakValue(leakedField),
    };

    assert.equal(
      await validateWithSchema(experimentFoundationBaselineAssetSchema, payload),
      400,
      `${leakedField} should be rejected on BaselineAsset`,
    );
  }
});

test('BaselineImplementationVersion schema requires code ref and entrypoint and rejects baseline_set ownership', async () => {
  for (const missingField of ['code_ref', 'entrypoint'] as const) {
    const payload: Record<string, unknown> = { ...baselineImplementationVersionPayload() };
    delete payload[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationBaselineImplementationVersionSchema, payload),
      400,
      `${missingField} should be required by BaselineImplementationVersion`,
    );
  }

  assert.equal(
    await validateWithSchema(experimentFoundationBaselineImplementationVersionSchema, {
      ...baselineImplementationVersionPayload(),
      baseline_set_ids: ['baseline_set_001'],
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationBaselineImplementationVersionLockSchema, {
      ...baselineImplementationVersionLockPayload(),
      baseline_set_id: 'baseline_set_001',
    }),
    400,
  );
});

test('experiment-foundation version-lock/recipe schemas accept canonical payloads', async () => {
  assert.deepEqual([...EXPERIMENT_FOUNDATION_READINESS_SNAPSHOT_STATUSES], [
    'passed',
    'blocked',
    'stale',
    'unknown',
  ]);
  assert.deepEqual([...EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS], [
    'standard_training',
    'evaluation_only',
    'llm_fine_tuning',
  ]);
  assert.equal(
    await validateWithSchema(experimentFoundationReadinessSnapshotSchema, readinessSnapshotPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationMethodRecipeComponentSchema, methodRecipeComponentPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationMethodRecipeComponentLockSchema,
      methodRecipeComponentLockPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationExternalLockRefSchema,
      externalLockRefPayload('base_model'),
    ),
    200,
  );
  assert.equal(await validateWithSchema(experimentFoundationVersionLockSchema, versionLockPayload()), 200);
  assert.equal(await validateWithSchema(experimentFoundationRecipeDraftSchema, recipeDraftPayload()), 200);
  assert.equal(
    await validateWithSchema(experimentFoundationExecutionProfileSchema, executionProfilePayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationGenerateRunRecipeRequestSchema,
      generateRunRecipeRequestPayload(),
    ),
    200,
  );
  assert.equal(await validateWithSchema(experimentFoundationRunRecipeSchema, runRecipePayload()), 200);
  assert.equal(
    await validateWithSchema(experimentFoundationRunRecipeSchema, runRecipePayload('llm_fine_tuning')),
    200,
  );
});

test('RecipeDraft schema rejects direct execution and materialization fields', async () => {
  for (const leakedField of [
    'run_recipe_id',
    'version_lock_id',
    'run_recipe_hash',
    'platform_id',
    'provider',
    'region',
    'queue',
    'endpoint',
    'oss',
    'pai',
    'dlc',
    'aliyun',
    'k8s',
    'slurm',
    'access_key',
    'secret_key',
    'credentials',
    'sdk_payload',
    'adapter_metadata_ref',
    'adapter_metadata',
    'training_task_spec',
    'training_task_spec_id',
    'external_job_id',
    'job_id',
    'materialization_request_id',
    'materialize',
    'submit',
  ] as const) {
    const payload = {
      ...recipeDraftPayload(),
      [leakedField]: forbiddenLeakValue(leakedField),
    };

    assert.equal(
      await validateWithSchema(experimentFoundationRecipeDraftSchema, payload),
      400,
      `${leakedField} should be rejected on RecipeDraft`,
    );
  }
});

test('RunRecipe schema rejects missing locks, hashes, and passed readiness inputs', async () => {
  for (const missingField of ['version_lock', 'version_lock_hash', 'readiness_snapshot', 'run_recipe_hash'] as const) {
    const payload = clonePayload(runRecipePayload()) as unknown as Record<string, unknown>;
    delete payload[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationRunRecipeSchema, payload),
      400,
      `${missingField} should be required by RunRecipe`,
    );
  }

  for (const missingField of ['component_hash', 'version_label'] as const) {
    const payload = clonePayload(runRecipePayload());
    const methodComponentLock = payload.version_lock
      .method_component_locks[0] as unknown as Record<string, unknown>;
    delete methodComponentLock[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationRunRecipeSchema, payload),
      400,
      `method component ${missingField} should be locked before RunRecipe`,
    );
  }

  const missingDatasetHash = clonePayload(runRecipePayload());
  delete (missingDatasetHash.version_lock.dataset_version_lock as unknown as Record<string, unknown>)
    .checksum_manifest_hash;
  assert.equal(await validateWithSchema(experimentFoundationRunRecipeSchema, missingDatasetHash), 400);

  const missingProtocolHash = clonePayload(runRecipePayload());
  delete (missingProtocolHash.version_lock.evaluation_protocol_lock as unknown as Record<string, unknown>)
    .protocol_hash;
  assert.equal(await validateWithSchema(experimentFoundationRunRecipeSchema, missingProtocolHash), 400);

  const missingBaselineHash = clonePayload(runRecipePayload());
  delete (missingBaselineHash.version_lock.baseline_implementation_locks[0] as unknown as Record<
    string,
    unknown
  >).implementation_hash;
  assert.equal(await validateWithSchema(experimentFoundationRunRecipeSchema, missingBaselineHash), 400);

  for (const missingField of ['runtime_ref', 'runtime_hash'] as const) {
    const missingBaselineRuntime = clonePayload(runRecipePayload());
    const baselineLock = missingBaselineRuntime.version_lock
      .baseline_implementation_locks[0] as unknown as Record<string, unknown>;
    delete baselineLock[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationRunRecipeSchema, missingBaselineRuntime),
      400,
      `baseline implementation ${missingField} should be locked before RunRecipe`,
    );
  }

  const missingReadinessHash = clonePayload(runRecipePayload());
  delete (missingReadinessHash.version_lock.readiness_snapshot as unknown as Record<string, unknown>)
    .readiness_report_hash;
  assert.equal(await validateWithSchema(experimentFoundationRunRecipeSchema, missingReadinessHash), 400);

  const missingNestedLockHash = clonePayload(runRecipePayload());
  delete (missingNestedLockHash.version_lock as unknown as Record<string, unknown>).version_lock_hash;
  assert.equal(await validateWithSchema(experimentFoundationRunRecipeSchema, missingNestedLockHash), 400);
});

test('RunRecipe and GenerateRunRecipeRequest reject stale or blocked readiness snapshots', async () => {
  for (const status of ['blocked', 'stale', 'unknown'] as const) {
    const runRecipe = clonePayload(runRecipePayload());
    runRecipe.readiness_snapshot = readinessSnapshotPayload(status);
    runRecipe.version_lock.readiness_snapshot = readinessSnapshotPayload(status);

    assert.equal(
      await validateWithSchema(experimentFoundationRunRecipeSchema, runRecipe),
      400,
      `${status} readiness should be rejected by RunRecipe`,
    );

    const request = clonePayload(generateRunRecipeRequestPayload());
    request.version_lock.readiness_snapshot = readinessSnapshotPayload(status);

    assert.equal(
      await validateWithSchema(experimentFoundationGenerateRunRecipeRequestSchema, request),
      400,
      `${status} readiness should be rejected by GenerateRunRecipeRequest`,
    );
  }
});

test('RunRecipe and execution profile schemas reject platform-private fields', async () => {
  for (const leakedField of [
    'platform_id',
    'provider',
    'region',
    'queue',
    'endpoint',
    'oss',
    'pai',
    'dlc',
    'aliyun',
    'k8s',
    'slurm',
    'access_key',
    'secret_key',
    'credentials',
    'sdk_payload',
    'adapter_metadata_ref',
    'adapter_metadata',
    'training_task_spec',
    'training_task_spec_id',
    'external_job_id',
    'job_id',
    'materialization_request_id',
  ] as const) {
    const runRecipePayloadWithLeak = {
      ...runRecipePayload(),
      [leakedField]: forbiddenLeakValue(leakedField),
    };

    assert.equal(
      await validateWithSchema(experimentFoundationRunRecipeSchema, runRecipePayloadWithLeak),
      400,
      `${leakedField} should be rejected on RunRecipe`,
    );

    const executionProfilePayloadWithLeak = {
      ...executionProfilePayload(),
      [leakedField]: forbiddenLeakValue(leakedField),
    };

    assert.equal(
      await validateWithSchema(experimentFoundationExecutionProfileSchema, executionProfilePayloadWithLeak),
      400,
      `${leakedField} should be rejected on ExperimentFoundationExecutionProfile`,
    );
  }
});

test('llm_fine_tuning RunRecipe requires fine-tuning external lock refs', async () => {
  const missingProfileRefs = clonePayload(runRecipePayload('llm_fine_tuning'));
  delete missingProfileRefs.execution_profile.fine_tuning_external_lock_refs;

  assert.equal(
    await validateWithSchema(experimentFoundationRunRecipeSchema, missingProfileRefs),
    400,
  );

  const missingVersionLockRefs = clonePayload(runRecipePayload('llm_fine_tuning'));
  missingVersionLockRefs.version_lock.external_lock_refs = [];

  assert.equal(
    await validateWithSchema(experimentFoundationRunRecipeSchema, missingVersionLockRefs),
    400,
  );

  const missingBaseModelLock = clonePayload(generateRunRecipeRequestPayload('llm_fine_tuning'));
  missingBaseModelLock.version_lock.external_lock_refs =
    missingBaseModelLock.version_lock.external_lock_refs.filter(
      (lockRef) => lockRef.ref_kind !== 'base_model',
    );

  assert.equal(
    await validateWithSchema(
      experimentFoundationGenerateRunRecipeRequestSchema,
      missingBaseModelLock,
    ),
    400,
  );

  assert.equal(
    await validateWithSchema(experimentFoundationExecutionProfileSchema, {
      ...executionProfilePayload(),
      fine_tuning_external_lock_refs: fineTuningExternalLockRefsPayload(),
    }),
    400,
  );
});

test('MethodRecipeComponent schema requires lockable version and hash before recipe use', async () => {
  for (const missingField of ['version_label', 'component_hash'] as const) {
    const component = clonePayload(methodRecipeComponentPayload()) as unknown as Record<string, unknown>;
    delete component[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationMethodRecipeComponentSchema, component),
      400,
      `${missingField} should be required by MethodRecipeComponent`,
    );

    const componentLock = clonePayload(methodRecipeComponentLockPayload()) as unknown as Record<
      string,
      unknown
    >;
    delete componentLock[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationMethodRecipeComponentLockSchema, componentLock),
      400,
      `${missingField} should be required by MethodRecipeComponentLock`,
    );
  }
});

test('experiment-foundation materialization schemas accept canonical payloads', async () => {
  assert.deepEqual([...EXPERIMENT_FOUNDATION_TASK_MATERIALIZATION_STATUSES], [
    'materialized',
    'blocked',
    'failed',
    'partial',
  ]);
  assert.equal(
    await validateWithSchema(experimentFoundationTrainingPlatformRefSchema, trainingPlatformRefPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationMaterializeTrainingTaskSpecRequestSchema,
      materializeTrainingTaskSpecRequestPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationTrainingTaskSpecSchema, trainingTaskSpecPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskSpecSchema,
      trainingTaskSpecPayload('evaluation_only'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationFineTuningTaskProfileSchema,
      fineTuningTaskProfilePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskSpecSchema,
      trainingTaskSpecPayload('llm_fine_tuning'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationAdapterMetadataRefSchema, adapterMetadataRefPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskMaterializationResultSchema,
      trainingTaskMaterializationResultPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskMaterializationResultSchema,
      blockedTrainingTaskMaterializationResultPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskStageEventSchema,
      trainingTaskStageEventPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskCancellationRequestSchema,
      trainingTaskCancellationRequestPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskPartialResultRefSchema,
      trainingTaskPartialResultRefPayload(),
    ),
    200,
  );
});

test('MaterializeTrainingTaskSpecRequest rejects stale, blocked, or draft-shaped recipes', async () => {
  for (const status of ['blocked', 'stale', 'unknown'] as const) {
    const request = clonePayload(materializeTrainingTaskSpecRequestPayload());
    request.run_recipe.readiness_snapshot = readinessSnapshotPayload(status);
    request.run_recipe.version_lock.readiness_snapshot = readinessSnapshotPayload(status);

    assert.equal(
      await validateWithSchema(experimentFoundationMaterializeTrainingTaskSpecRequestSchema, request),
      400,
      `${status} RunRecipe readiness should be rejected during materialization`,
    );
  }

  assert.equal(
    await validateWithSchema(experimentFoundationMaterializeTrainingTaskSpecRequestSchema, {
      ...materializeTrainingTaskSpecRequestPayload(),
      run_recipe: recipeDraftPayload(),
    }),
    400,
  );
});

test('TrainingPlatformRef schema rejects mismatched platform and adapter kinds', async () => {
  assert.equal(
    await validateWithSchema(experimentFoundationTrainingPlatformRefSchema, {
      ...trainingPlatformRefPayload(),
      platform_kind: 'local_script',
      adapter_kind: 'aliyun_pai_dlc',
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationTrainingPlatformRefSchema, {
      ...trainingPlatformRefPayload(),
      platform_kind: 'aliyun_pai_dlc',
      adapter_kind: 'local_script',
    }),
    400,
  );
});

test('TrainingTaskSpec and materialization result require locked recipe, runtime, config, and task hashes', async () => {
  for (const missingField of [
    'run_recipe_hash',
    'version_lock_hash',
    'runtime_hash',
    'config_snapshot_hash',
  ] as const) {
    const spec = clonePayload(trainingTaskSpecPayload()) as unknown as Record<string, unknown>;
    delete spec[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationTrainingTaskSpecSchema, spec),
      400,
      `${missingField} should be required by TrainingTaskSpec`,
    );
  }

  const request = clonePayload(materializeTrainingTaskSpecRequestPayload());
  delete (request.run_recipe as unknown as Record<string, unknown>).run_recipe_hash;
  assert.equal(
    await validateWithSchema(experimentFoundationMaterializeTrainingTaskSpecRequestSchema, request),
    400,
  );

  for (const missingField of [
    'training_task_spec_ref',
    'training_task_spec_hash',
    'adapter_metadata_ref',
    'adapter_metadata_hash',
    'materialization_hash',
  ] as const) {
    const result = clonePayload(trainingTaskMaterializationResultPayload()) as unknown as Record<
      string,
      unknown
    >;
    delete result[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationTrainingTaskMaterializationResultSchema, result),
      400,
      `${missingField} should be required by TrainingTaskMaterializationResult`,
    );
  }

  const blockedWithoutOutputs = clonePayload(blockedTrainingTaskMaterializationResultPayload());
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskMaterializationResultSchema,
      blockedWithoutOutputs,
    ),
    200,
  );

  const blockedWithoutBlockers = clonePayload(blockedTrainingTaskMaterializationResultPayload());
  blockedWithoutBlockers.blockers = [];
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskMaterializationResultSchema,
      blockedWithoutBlockers,
    ),
    400,
  );
});

test('Training task hook schemas require task spec hashes with refs', async () => {
  for (const [schemaName, schema, payload] of [
    [
      'TrainingTaskStageEvent',
      experimentFoundationTrainingTaskStageEventSchema,
      trainingTaskStageEventPayload(),
    ],
    [
      'TrainingTaskCancellationRequest',
      experimentFoundationTrainingTaskCancellationRequestSchema,
      trainingTaskCancellationRequestPayload(),
    ],
    [
      'TrainingTaskPartialResultRef',
      experimentFoundationTrainingTaskPartialResultRefSchema,
      trainingTaskPartialResultRefPayload(),
    ],
  ] as const) {
    const payloadWithoutHash = clonePayload(payload) as unknown as Record<string, unknown>;
    delete payloadWithoutHash.training_task_spec_hash;

    assert.equal(
      await validateWithSchema(schema, payloadWithoutHash),
      400,
      `${schemaName} should require training_task_spec_hash`,
    );
  }
});

test('ExternalTrainingJob schemas accept canonical payloads and route wrappers', async () => {
  assert.deepEqual([...EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES], [
    'submitted',
    'queued',
    'running',
    'succeeded',
    'failed',
    'cancelling',
    'cancelled',
    'unknown',
  ]);
  assert.equal((EXPERIMENT_FOUNDATION_RECORD_KINDS as readonly string[]).includes('external_training_job'), false);
  assert.equal(
    await validateWithSchema(experimentFoundationExternalTrainingJobSchema, externalTrainingJobPayload()),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(submitExternalTrainingJobRequestSchema, {
      training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
      training_task_spec_hash: 'sha256:training-task-spec',
      materialization_result_ref: sourceRef(
        'training_task_materialization_result',
        'materialization_result_001',
      ),
      materialization_result_hash: 'sha256:materialization',
      idempotency_key: 'submit:training_task_spec_001:v1',
      requested_by_ref: sourceRef('user', 'user_001'),
      source_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(externalTrainingJobResponseSchema, {
      external_job: externalTrainingJobPayload(),
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(listExternalTrainingJobsResponseSchema, {
      jobs: [externalTrainingJobPayload()],
      next_cursor: null,
    }),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(syncExternalTrainingJobRequestSchema, {
      source_refs: [sourceRef('user', 'user_001')],
    }),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(cancelExternalTrainingJobRequestSchema, {
      requested_by_ref: sourceRef('user', 'user_001'),
      reason: 'Stop stale execution.',
      idempotency_key: 'cancel:external_job_001:v1',
      source_refs: [sourceRef('user', 'user_001')],
    }),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(collectExternalTrainingJobRequestSchema, {
      source_refs: [sourceRef('user', 'user_001')],
    }),
    200,
  );
  assert.equal(
    Object.hasOwn(collectExternalTrainingJobRequestSchema.body.properties, 'accept_partial'),
    false,
  );
});

test('ExternalTrainingJob schemas reject missing hashes and adapter-private leakage', async () => {
  for (const missingField of [
    'training_task_spec_hash',
    'materialization_result_hash',
    'external_job_hash',
  ] as const) {
    const payload = clonePayload(externalTrainingJobPayload()) as unknown as Record<string, unknown>;
    delete payload[missingField];
    assert.equal(
      await validateWithSchema(experimentFoundationExternalTrainingJobSchema, payload),
      400,
      `${missingField} should be required by ExternalTrainingJob`,
    );
  }

  assert.equal(
    await validateWithSchema(experimentFoundationExternalTrainingJobSchema, {
      ...externalTrainingJobPayload(),
      job_status: 'finished',
    }),
    400,
  );

  for (const leakedField of [
    'provider',
    'region',
    'queue',
    'endpoint',
    'credentials',
    'sdk_payload',
    'adapter_payload',
    'platform_request',
    'platform_response',
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationExternalTrainingJobSchema, {
        ...externalTrainingJobPayload(),
        [leakedField]: forbiddenLeakValue(leakedField),
      }),
      400,
      `${leakedField} should be rejected on ExternalTrainingJob`,
    );
    assert.equal(
      await validateWithRouteSchema(submitExternalTrainingJobRequestSchema, {
        training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
        training_task_spec_hash: 'sha256:training-task-spec',
        materialization_result_ref: sourceRef(
          'training_task_materialization_result',
          'materialization_result_001',
        ),
        materialization_result_hash: 'sha256:materialization',
        idempotency_key: 'submit:training_task_spec_001:v1',
        requested_by_ref: sourceRef('user', 'user_001'),
        source_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
        [leakedField]: forbiddenLeakValue(leakedField),
      }),
      400,
      `${leakedField} should be rejected on SubmitExternalTrainingJobRequest`,
    );
  }
});

test('Materialization schemas reject platform-private fields and inline adapter payloads', async () => {
  for (const [schemaName, schema, payload] of [
    [
      'ExperimentFoundationTrainingPlatformRef',
      experimentFoundationTrainingPlatformRefSchema,
      trainingPlatformRefPayload(),
    ],
    [
      'MaterializeTrainingTaskSpecRequest',
      experimentFoundationMaterializeTrainingTaskSpecRequestSchema,
      materializeTrainingTaskSpecRequestPayload(),
    ],
    ['TrainingTaskSpec', experimentFoundationTrainingTaskSpecSchema, trainingTaskSpecPayload()],
    [
      'TrainingTaskMaterializationResult',
      experimentFoundationTrainingTaskMaterializationResultSchema,
      trainingTaskMaterializationResultPayload(),
    ],
    [
      'ExperimentFoundationAdapterMetadataRef',
      experimentFoundationAdapterMetadataRefSchema,
      adapterMetadataRefPayload(),
    ],
  ] as const) {
    for (const leakedField of materializationPrivateLeakFields) {
      const payloadWithLeak = {
        ...payload,
        [leakedField]: forbiddenLeakValue(leakedField),
      };

      assert.equal(
        await validateWithSchema(schema, payloadWithLeak),
        400,
        `${leakedField} should be rejected on ${schemaName}`,
      );
    }
  }

  const inlineAdapterPayload = clonePayload(trainingTaskMaterializationResultPayload()) as unknown as Record<
    string,
    unknown
  >;
  delete inlineAdapterPayload.adapter_metadata_ref;
  inlineAdapterPayload.adapter_payload = { queue: 'private-platform-queue' };
  assert.equal(
    await validateWithSchema(
      experimentFoundationTrainingTaskMaterializationResultSchema,
      inlineAdapterPayload,
    ),
    400,
  );
});

test('TrainingTaskSpec enforces fine-tuning profile ownership by profile kind', async () => {
  const missingFineTuningProfile = clonePayload(trainingTaskSpecPayload('llm_fine_tuning'));
  delete (missingFineTuningProfile as unknown as Record<string, unknown>).fine_tuning_profile;
  assert.equal(
    await validateWithSchema(experimentFoundationTrainingTaskSpecSchema, missingFineTuningProfile),
    400,
  );

  assert.equal(
    await validateWithSchema(experimentFoundationTrainingTaskSpecSchema, {
      ...trainingTaskSpecPayload(),
      fine_tuning_profile: fineTuningTaskProfilePayload(),
    }),
    400,
  );
});

test('FineTuningTaskProfile requires locked model, data policy, strategy, resource, protocol, and outputs', async () => {
  for (const missingField of [
    'base_model_ref',
    'fine_tuning_dataset_refs',
    'dataset_policy_refs',
    'dataset_policy_hashes',
    'fine_tuning_strategy_ref',
    'prompt_template_ref',
    'context_policy_ref',
    'resource_budget',
    'evaluation_protocol_lock',
    'output_artifact_contract',
  ] as const) {
    const profile = clonePayload(fineTuningTaskProfilePayload()) as unknown as Record<string, unknown>;
    delete profile[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationFineTuningTaskProfileSchema, profile),
      400,
      `${missingField} should be required by FineTuningTaskProfile`,
    );
  }

  assert.equal(
    await validateWithSchema(experimentFoundationFineTuningTaskProfileSchema, {
      ...fineTuningTaskProfilePayload(),
      base_model_ref: externalLockRefPayload('fine_tuning_dataset'),
    }),
    400,
  );
});

test('experiment-foundation result/evidence/sidecar schemas accept canonical payloads', async () => {
  assert.deepEqual([...EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES], [
    'valid',
    'invalid',
    'partial',
    'accepted_partial',
  ]);
  assert.deepEqual([...EXPERIMENT_FOUNDATION_IMPLEMENTATION_DECISION_SIGNALS], [
    'continue',
    'adjust',
    'rerun',
    'abandon',
    'needs_more_data',
  ]);
  assert.equal(
    await validateWithSchema(experimentFoundationResultMetricValueSchema, resultMetricValuePayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationResultArtifactSchema, resultArtifactPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationResultLogRefSchema, resultLogRefPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationExperimentResultSchema, experimentResultPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationFineTuningResultSchema, fineTuningResultPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationResultValidationReportSchema,
      resultValidationReportPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationResultValidationReportSchema,
      resultValidationReportPayload('accepted_partial'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationEvaluationFactSchema, evaluationFactPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationMetricObservationSchema, metricObservationPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationComparisonObservationSchema,
      comparisonObservationPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationImplementationDecisionSignalSchema,
      implementationDecisionSignalPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationPaperTableFactSetSchema, paperTableFactSetPayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationEvidenceCandidateSchema, evidenceCandidatePayload()),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationEvidenceCandidateSchema,
      evidenceCandidatePayload('accepted_partial'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationPaperExperimentSidecarSchema,
      paperExperimentSidecarPayload(),
    ),
    200,
  );
});

test('EvidenceCandidate schema only allows valid or explicitly accepted partial results', async () => {
  for (const validationStatus of ['invalid', 'partial', 'unvalidated'] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationEvidenceCandidateSchema, {
        ...evidenceCandidatePayload(),
        validation_status: validationStatus,
      }),
      400,
      `${validationStatus} should not be allowed to create EvidenceCandidate`,
    );
  }

  const acceptedPartialWithoutReport = clonePayload(resultValidationReportPayload('accepted_partial'));
  delete (acceptedPartialWithoutReport as unknown as Record<string, unknown>).partial_acceptance_ref;
  assert.equal(
    await validateWithSchema(
      experimentFoundationResultValidationReportSchema,
      acceptedPartialWithoutReport,
    ),
    400,
  );
});

test('Result, evidence, and fact schemas reject paper-claim and acceptance fields', async () => {
  for (const [schemaName, schema, payload] of [
    ['ExperimentResult', experimentFoundationExperimentResultSchema, experimentResultPayload()],
    ['FineTuningResult', experimentFoundationFineTuningResultSchema, fineTuningResultPayload()],
    [
      'ResultValidationReport',
      experimentFoundationResultValidationReportSchema,
      resultValidationReportPayload(),
    ],
    ['EvaluationFact', experimentFoundationEvaluationFactSchema, evaluationFactPayload()],
    ['MetricObservation', experimentFoundationMetricObservationSchema, metricObservationPayload()],
    [
      'ComparisonObservation',
      experimentFoundationComparisonObservationSchema,
      comparisonObservationPayload(),
    ],
    ['EvidenceCandidate', experimentFoundationEvidenceCandidateSchema, evidenceCandidatePayload()],
  ] as const) {
    for (const leakedField of [
      'claim_text',
      'paper_claim',
      'acceptance_status',
      'final_conclusion',
      'publication_ready_text',
    ] as const) {
      assert.equal(
        await validateWithSchema(schema, {
          ...payload,
          [leakedField]: forbiddenLeakValue(leakedField),
        }),
        400,
        `${leakedField} should be rejected on ${schemaName}`,
      );
    }
  }
});

test('Evaluation fact and observation schemas require run, result, protocol, and asset context', async () => {
  for (const [schemaName, schema, payload] of [
    ['EvaluationFact', experimentFoundationEvaluationFactSchema, evaluationFactPayload()],
    ['MetricObservation', experimentFoundationMetricObservationSchema, metricObservationPayload()],
    [
      'ComparisonObservation',
      experimentFoundationComparisonObservationSchema,
      comparisonObservationPayload(),
    ],
  ] as const) {
    for (const missingField of [
      'run_recipe_hash',
      'result_ref',
      'result_hash',
      'evaluation_protocol_hash',
      'benchmark_asset_ref',
    ] as const) {
      const metricOnlyPayload = clonePayload(payload) as unknown as Record<string, unknown>;
      delete metricOnlyPayload[missingField];

      assert.equal(
        await validateWithSchema(schema, metricOnlyPayload),
        400,
        `${schemaName} should reject metric-only payloads missing ${missingField}`,
      );
    }
  }
});

test('PaperTableFactSet schema rejects final rendered tables, leaderboards, and claims', async () => {
  for (const leakedField of [
    'rendered_table',
    'markdown_table',
    'latex_table',
    'final_table',
    'leaderboard',
    'leaderboard_rank',
    'ranking',
    'winner',
    'best_result',
    'claim_text',
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationPaperTableFactSetSchema, {
        ...paperTableFactSetPayload(),
        [leakedField]: forbiddenLeakValue(leakedField),
      }),
      400,
      `${leakedField} should be rejected on PaperTableFactSet`,
    );
  }
});

test('PaperExperimentSidecar schema stores refs and hashes, not reusable asset or result DTO copies', async () => {
  for (const leakedField of [
    'dataset_asset',
    'dataset_version',
    'benchmark_asset',
    'baseline_asset',
    'evaluation_protocol',
    'run_recipe',
    'training_task_spec',
    'materialization_result',
    'experiment_result',
    'fine_tuning_result',
    'result',
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationPaperExperimentSidecarSchema, {
        ...paperExperimentSidecarPayload(),
        [leakedField]: { copied: true },
      }),
      400,
      `${leakedField} should be rejected on PaperExperimentSidecar`,
    );
  }
});

test('Result, validation, fact, evidence, and sidecar schemas require key hashes', async () => {
  for (const [schemaName, schema, payload, missingFields] of [
    [
      'ExperimentResult',
      experimentFoundationExperimentResultSchema,
      experimentResultPayload(),
      ['training_task_spec_hash', 'materialization_result_hash', 'run_recipe_hash', 'result_hash'],
    ],
    [
      'FineTuningResult',
      experimentFoundationFineTuningResultSchema,
      fineTuningResultPayload(),
      ['experiment_result_hash', 'training_task_spec_hash', 'run_recipe_hash', 'result_hash'],
    ],
    [
      'ResultValidationReport',
      experimentFoundationResultValidationReportSchema,
      resultValidationReportPayload(),
      ['source_result_hash', 'validation_hash'],
    ],
    [
      'EvaluationFact',
      experimentFoundationEvaluationFactSchema,
      evaluationFactPayload(),
      ['result_hash', 'validation_report_hash', 'fact_hash'],
    ],
    [
      'EvidenceCandidate',
      experimentFoundationEvidenceCandidateSchema,
      evidenceCandidatePayload(),
      ['run_recipe_hash', 'version_lock_hash', 'evaluation_protocol_hash', 'evidence_hash'],
    ],
    [
      'PaperExperimentSidecar',
      experimentFoundationPaperExperimentSidecarSchema,
      paperExperimentSidecarPayload(),
      ['run_recipe_hash', 'version_lock_hash', 'training_task_spec_hash', 'sidecar_hash'],
    ],
  ] as const) {
    for (const missingField of missingFields) {
      const payloadWithoutHash = clonePayload(payload) as unknown as Record<string, unknown>;
      delete payloadWithoutHash[missingField];

      assert.equal(
        await validateWithSchema(schema, payloadWithoutHash),
        400,
        `${schemaName} should require ${missingField}`,
      );
    }
  }
});

test('Result, evidence, and sidecar schemas reject adapter-private and platform-private fields', async () => {
  for (const [schemaName, schema, payload] of [
    ['ExperimentResult', experimentFoundationExperimentResultSchema, experimentResultPayload()],
    ['FineTuningResult', experimentFoundationFineTuningResultSchema, fineTuningResultPayload()],
    [
      'ResultValidationReport',
      experimentFoundationResultValidationReportSchema,
      resultValidationReportPayload(),
    ],
    ['EvaluationFact', experimentFoundationEvaluationFactSchema, evaluationFactPayload()],
    ['EvidenceCandidate', experimentFoundationEvidenceCandidateSchema, evidenceCandidatePayload()],
    [
      'PaperExperimentSidecar',
      experimentFoundationPaperExperimentSidecarSchema,
      paperExperimentSidecarPayload(),
    ],
  ] as const) {
    for (const leakedField of materializationPrivateLeakFields) {
      assert.equal(
        await validateWithSchema(schema, {
          ...payload,
          [leakedField]: forbiddenLeakValue(leakedField),
        }),
        400,
        `${leakedField} should be rejected on ${schemaName}`,
      );
    }
  }
});

test('experiment-foundation candidate promotion schemas load and accept canonical payloads', async () => {
  assert.deepEqual([...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES], [
    'dataset',
    'benchmark',
    'baseline',
    'evaluation_protocol',
    'method_component',
    'base_model',
  ]);
  assert.deepEqual([...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES], [
    'needs_info',
    'manual_review_required',
    'rejected',
    'ready_for_promotion',
    'promoted',
  ]);
  assert.deepEqual([...EXPERIMENT_FOUNDATION_ASSET_PROMOTION_DECISION_KINDS], [
    'auto_promote',
    'manual_promote',
    'manual_review_required',
    'needs_info',
    'reject',
  ]);

  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidateSourceTraceSchema,
      assetCandidateSourceTracePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidateDuplicateCheckSchema,
      assetCandidateDuplicateCheckPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidateCompletenessCheckSchema,
      assetCandidateCompletenessCheckPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidatePolicyCheckSchema,
      assetCandidatePolicyCheckPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidateRiskAssessmentSchema,
      assetCandidateRiskAssessmentPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidateRuleTraceSchema,
      assetCandidateRuleTracePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationDatasetAssetCandidateSchema,
      datasetAssetCandidatePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationDatasetAssetCandidateSchema,
      datasetAssetCandidatePayload('fine_tuning_dataset'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationBenchmarkAssetCandidateSchema,
      benchmarkAssetCandidatePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationBaselineAssetCandidateSchema,
      baselineAssetCandidatePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationEvaluationProtocolCandidateSchema,
      evaluationProtocolCandidatePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationMethodComponentCandidateSchema,
      methodComponentCandidatePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationBaseModelCandidateSchema,
      baseModelCandidatePayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetCandidateTriageReportSchema,
      assetCandidateTriageReportPayload(),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetPromotionRequestSchema,
      assetPromotionRequestPayload('auto_promote'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetPromotionRequestSchema,
      assetPromotionRequestPayload('manual_review_required'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetPromotionRequestSchema,
      assetPromotionRequestPayload('manual_promote'),
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationAssetPromotionResultSchema,
      assetPromotionResultPayload(),
    ),
    200,
  );
});

test('Promotion request schema rejects ungrounded or unsafe auto-promotion', async () => {
  for (const missingField of ['source_refs', 'provenance_refs'] as const) {
    const payload = clonePayload(assetPromotionRequestPayload('auto_promote')) as unknown as Record<
      string,
      unknown
    >;
    delete payload[missingField];

    assert.equal(
      await validateWithSchema(experimentFoundationAssetPromotionRequestSchema, payload),
      400,
      `auto promotion should require ${missingField}`,
    );
  }

  for (const [field, value] of [
    ['confidence_score', 0.79],
    ['risk_level', 'high'],
    ['risk_level', 'restricted'],
    ['policy_status', 'unclear_license'],
    ['policy_status', 'restricted'],
    ['policy_status', 'forbidden'],
    ['completeness_status', 'incomplete'],
    ['duplicate_status', 'possible_duplicate'],
    ['duplicate_status', 'duplicate'],
    ['candidate_status', 'manual_review_required'],
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationAssetPromotionRequestSchema, {
        ...assetPromotionRequestPayload('auto_promote'),
        [field]: value,
      }),
      400,
      `auto promotion should reject ${field}=${String(value)}`,
    );
  }

  for (const emptyField of [
    'source_refs',
    'provenance_refs',
    'deterministic_rule_trace_refs',
    'required_version_refs',
    'required_policy_refs',
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationAssetPromotionRequestSchema, {
        ...assetPromotionRequestPayload('auto_promote'),
        [emptyField]: [],
      }),
      400,
      `auto promotion should require non-empty ${emptyField}`,
    );
  }
});

test('Promotion result schema outputs canonical refs and rejects embedded canonical DTOs', async () => {
  for (const fullDtoField of [
    'dataset_asset',
    'dataset_asset_dto',
    'dataset_version',
    'dataset_version_dto',
    'benchmark_asset',
    'benchmark_asset_dto',
    'baseline_asset',
    'baseline_asset_dto',
    'evaluation_protocol',
    'evaluation_protocol_dto',
    'method_recipe_component',
    'method_recipe_component_dto',
    'base_model_asset',
    'base_model_asset_dto',
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationAssetPromotionResultSchema, {
        ...assetPromotionResultPayload(),
        [fullDtoField]: { copied: true },
      }),
      400,
      `${fullDtoField} should be rejected on ExperimentAssetPromotionResult`,
    );
  }

  for (const emptyRefField of [
    'canonical_asset_refs',
    'canonical_version_refs',
    'canonical_protocol_refs',
    'canonical_policy_refs',
  ] as const) {
    assert.equal(
      await validateWithSchema(experimentFoundationAssetPromotionResultSchema, {
        ...assetPromotionResultPayload(),
        [emptyRefField]: [],
      }),
      400,
      `promoted result should require non-empty ${emptyRefField}`,
    );
  }
});

test('Candidate schemas reject canonical lifecycle state and canonical DTO copies', async () => {
  for (const [schemaName, schema, payload] of [
    [
      'DatasetAssetCandidate',
      experimentFoundationDatasetAssetCandidateSchema,
      datasetAssetCandidatePayload(),
    ],
    [
      'BenchmarkAssetCandidate',
      experimentFoundationBenchmarkAssetCandidateSchema,
      benchmarkAssetCandidatePayload(),
    ],
    [
      'BaselineAssetCandidate',
      experimentFoundationBaselineAssetCandidateSchema,
      baselineAssetCandidatePayload(),
    ],
    [
      'EvaluationProtocolCandidate',
      experimentFoundationEvaluationProtocolCandidateSchema,
      evaluationProtocolCandidatePayload(),
    ],
    [
      'MethodComponentCandidate',
      experimentFoundationMethodComponentCandidateSchema,
      methodComponentCandidatePayload(),
    ],
    [
      'BaseModelCandidate',
      experimentFoundationBaseModelCandidateSchema,
      baseModelCandidatePayload(),
    ],
  ] as const) {
    assert.equal(
      await validateWithSchema(schema, {
        ...payload,
        catalog_status: 'candidate',
      }),
      400,
      `${schemaName} should not carry canonical catalog_status`,
    );

    for (const fullDtoField of [
      'dataset_asset',
      'dataset_asset_dto',
      'dataset_version',
      'dataset_version_dto',
      'benchmark_asset',
      'benchmark_asset_dto',
      'baseline_asset',
      'baseline_asset_dto',
      'evaluation_protocol',
      'evaluation_protocol_dto',
      'method_recipe_component',
      'method_recipe_component_dto',
      'base_model_asset',
      'base_model_asset_dto',
    ] as const) {
      assert.equal(
        await validateWithSchema(schema, {
          ...payload,
          [fullDtoField]: { copied: true },
        }),
        400,
        `${schemaName} should reject embedded ${fullDtoField}`,
      );
    }
  }
});

test('Canonical asset schemas continue rejecting candidate lifecycle state', async () => {
  for (const [schemaName, schema, payload] of [
    ['DatasetAsset', experimentFoundationDatasetAssetSchema, datasetAssetPayload()],
    ['BenchmarkAsset', experimentFoundationBenchmarkAssetSchema, benchmarkAssetPayload()],
    ['BaselineAsset', experimentFoundationBaselineAssetSchema, baselineAssetPayload()],
    [
      'EvaluationProtocol',
      experimentFoundationEvaluationProtocolSchema,
      evaluationProtocolPayload(),
    ],
    [
      'MethodRecipeComponent',
      experimentFoundationMethodRecipeComponentSchema,
      methodRecipeComponentPayload(),
    ],
  ] as const) {
    assert.equal(
      await validateWithSchema(schema, {
        ...payload,
        candidate_status: 'ready_for_promotion',
      }),
      400,
      `${schemaName} should reject candidate_status`,
    );

    if ('catalog_status' in payload) {
      assert.equal(
        await validateWithSchema(schema, {
          ...payload,
          catalog_status: 'candidate',
        }),
        400,
        `${schemaName} should reject catalog_status=candidate`,
      );
    }
  }
});

test('Candidate and promotion schemas reject execution, result, paper-claim, and platform leakage', async () => {
  for (const [schemaName, schema, payload] of [
    [
      'DatasetAssetCandidate',
      experimentFoundationDatasetAssetCandidateSchema,
      datasetAssetCandidatePayload(),
    ],
    [
      'BenchmarkAssetCandidate',
      experimentFoundationBenchmarkAssetCandidateSchema,
      benchmarkAssetCandidatePayload(),
    ],
    [
      'BaselineAssetCandidate',
      experimentFoundationBaselineAssetCandidateSchema,
      baselineAssetCandidatePayload(),
    ],
    [
      'EvaluationProtocolCandidate',
      experimentFoundationEvaluationProtocolCandidateSchema,
      evaluationProtocolCandidatePayload(),
    ],
    [
      'MethodComponentCandidate',
      experimentFoundationMethodComponentCandidateSchema,
      methodComponentCandidatePayload(),
    ],
    [
      'BaseModelCandidate',
      experimentFoundationBaseModelCandidateSchema,
      baseModelCandidatePayload(),
    ],
    [
      'ExperimentAssetCandidateTriageReport',
      experimentFoundationAssetCandidateTriageReportSchema,
      assetCandidateTriageReportPayload(),
    ],
    [
      'ExperimentAssetPromotionRequest',
      experimentFoundationAssetPromotionRequestSchema,
      assetPromotionRequestPayload('auto_promote'),
    ],
    [
      'ExperimentAssetPromotionResult',
      experimentFoundationAssetPromotionResultSchema,
      assetPromotionResultPayload(),
    ],
  ] as const) {
    for (const leakedField of [
      'run_recipe',
      'run_recipe_id',
      'run_recipe_dto',
      'training_task_spec',
      'training_task_spec_id',
      'training_task_spec_dto',
      'materialize',
      'submit',
      'experiment_result',
      'experiment_result_dto',
      'fine_tuning_result',
      'fine_tuning_result_dto',
      'materialization_result',
      'materialization_result_dto',
      'result',
      'result_dto',
      'result_validation_report',
      'evidence_candidate',
      'claim_text',
      'paper_claim',
      'acceptance_status',
      'final_conclusion',
      'publication_ready_text',
      'publication_claim',
      'provider',
      'region',
      'queue',
      'endpoint',
      'sdk_payload',
      'adapter_payload',
      'external_job_id',
    ] as const) {
      assert.equal(
        await validateWithSchema(schema, {
          ...payload,
          [leakedField]: forbiddenLeakValue(leakedField),
        }),
        400,
        `${leakedField} should be rejected on ${schemaName}`,
      );
    }
  }
});

test('experiment-foundation persistence/api wrapper schemas accept canonical payloads', async () => {
  assert.equal([...EXPERIMENT_FOUNDATION_RECORD_KINDS].includes('run_recipe'), true);
  assert.equal([...EXPERIMENT_FOUNDATION_RECORD_KINDS].includes('dataset_asset_candidate'), true);
  assert.equal((EXPERIMENT_FOUNDATION_RECORD_KINDS as readonly string[]).includes('external_training_job'), false);

  assert.equal(
    await validateWithRouteSchema(createExperimentFoundationRecordRequestSchema, {
      record_kind: 'dataset_asset',
      payload: datasetAssetPayload(),
    }),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(createExperimentFoundationRecordRequestSchema, {
      record_kind: 'external_training_job',
      payload: externalTrainingJobPayload(),
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationStoredRecordSchema, storedExperimentFoundationRecordPayload()),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(experimentFoundationReadinessCheckRequestSchema, {
      target_ref: sourceRef('run_recipe', 'run_recipe_001'),
      check_kind: 'pre_materialization',
      source_refs: [sourceRef('system_check', 'experiment_foundation_readiness')],
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationReadinessCheckResponseSchema,
      readinessCheckResponsePayload('blocked'),
    ),
    200,
  );
  assert.equal(
    await validateWithRouteSchema(experimentFoundationPromotionDecisionRequestSchema, {
      promotion_request: assetPromotionRequestPayload(),
      promotion_result: assetPromotionResultPayload(),
    }),
    200,
  );
  assert.equal(
    await validateWithSchema(
      experimentFoundationPromotionDecisionResponseSchema,
      promotionDecisionResponsePayload(),
    ),
    200,
  );
});

test('experiment-foundation persistence/api wrapper schemas reject unsupported aliases', async () => {
  assert.equal(
    await validateWithRouteSchema(createExperimentFoundationRecordRequestSchema, {
      record_kind: 'dataset',
      payload: datasetAssetPayload(),
    }),
    400,
  );
  assert.equal(
    await validateWithSchema(experimentFoundationStoredRecordSchema, {
      ...storedExperimentFoundationRecordPayload(),
      canonical_payload: datasetAssetPayload(),
    }),
    400,
  );
});

test('experiment-foundation classification constants subset their canonical enums', () => {
  // Each classification constant MUST be a strict subset of its canonical enum.
  // If a canonical status is renamed/removed without updating the classification,
  // this test fails — preventing renderer-side semantic drift.
  for (const status of EXPERIMENT_FOUNDATION_READINESS_BLOCKED_STATUSES) {
    assert.ok(
      (EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES as readonly string[]).includes(status),
      `readiness blocked status "${status}" is not in EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES`,
    );
  }
  for (const status of EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_ATTENTION_STATUSES) {
    assert.ok(
      (EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES as readonly string[]).includes(status),
      `asset candidate attention status "${status}" is not in EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES`,
    );
  }
  for (const status of EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_REVIEW_STATUSES) {
    assert.ok(
      (EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_STATUSES as readonly string[]).includes(status),
      `evidence candidate review status "${status}" is not in EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_STATUSES`,
    );
  }
  for (const status of EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_IN_FLIGHT_STATUSES) {
    assert.ok(
      (EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES as readonly string[]).includes(status),
      `in-flight job status "${status}" is not in EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES`,
    );
  }
  // None of the classification sets may be empty — an empty set would silently render zero counts.
  assert.ok(EXPERIMENT_FOUNDATION_READINESS_BLOCKED_STATUSES.length > 0);
  assert.ok(EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_ATTENTION_STATUSES.length > 0);
  assert.ok(EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_REVIEW_STATUSES.length > 0);
  assert.ok(EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_IN_FLIGHT_STATUSES.length > 0);
});
