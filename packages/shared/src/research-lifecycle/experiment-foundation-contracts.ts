export const EXPERIMENT_FOUNDATION_DATASET_CATALOG_STATUSES = [
  'registered',
  'active',
  'deprecated',
  'archived',
] as const;
export type ExperimentFoundationDatasetCatalogStatus =
  (typeof EXPERIMENT_FOUNDATION_DATASET_CATALOG_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_DATASET_ACCESS_STATUSES = [
  'available',
  'restricted',
  'missing',
  'unknown',
] as const;
export type ExperimentFoundationDatasetAccessStatus =
  (typeof EXPERIMENT_FOUNDATION_DATASET_ACCESS_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_DATASET_READINESS_STATUSES = [
  'unknown',
  'metadata_complete',
  'manifest_complete',
  'policy_checked',
  'ready',
  'blocked',
] as const;
export type ExperimentFoundationDatasetReadinessStatus =
  (typeof EXPERIMENT_FOUNDATION_DATASET_READINESS_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_DATASET_LOCATION_KINDS = [
  'local_file',
  'local_directory',
  'remote_object',
  'external_reference',
] as const;
export type ExperimentFoundationDatasetLocationKind =
  (typeof EXPERIMENT_FOUNDATION_DATASET_LOCATION_KINDS)[number];

export const EXPERIMENT_FOUNDATION_DATASET_LOCATION_AVAILABILITY_STATUSES = [
  'available',
  'unavailable',
  'stale',
  'unknown',
] as const;
export type ExperimentFoundationDatasetLocationAvailabilityStatus =
  (typeof EXPERIMENT_FOUNDATION_DATASET_LOCATION_AVAILABILITY_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_STORAGE_ROOT_KINDS = [
  'local',
  'mounted',
  'object_store',
] as const;
export type ExperimentFoundationStorageRootKind =
  (typeof EXPERIMENT_FOUNDATION_STORAGE_ROOT_KINDS)[number];

export const EXPERIMENT_FOUNDATION_LOCAL_FILE_KINDS = [
  'file',
  'directory',
  'manifest',
  'split_file',
] as const;
export type ExperimentFoundationLocalFileKind =
  (typeof EXPERIMENT_FOUNDATION_LOCAL_FILE_KINDS)[number];

export const EXPERIMENT_FOUNDATION_CHECKSUM_ALGORITHMS = [
  'sha256',
  'sha512',
  'md5',
  'custom',
] as const;
export type ExperimentFoundationChecksumAlgorithm =
  (typeof EXPERIMENT_FOUNDATION_CHECKSUM_ALGORITHMS)[number];

export const EXPERIMENT_FOUNDATION_MIRROR_PROVIDERS = [
  'aliyun_oss',
  'pai_dataset',
  'local_execution_cache',
  'custom',
] as const;
export type ExperimentFoundationMirrorProvider =
  (typeof EXPERIMENT_FOUNDATION_MIRROR_PROVIDERS)[number];

export const EXPERIMENT_FOUNDATION_MIRROR_STATUSES = [
  'not_mirrored',
  'syncing',
  'ready',
  'stale',
  'failed',
] as const;
export type ExperimentFoundationMirrorStatus =
  (typeof EXPERIMENT_FOUNDATION_MIRROR_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_MIRROR_FRESHNESS_STATUSES = [
  'fresh',
  'stale',
  'unknown',
] as const;
export type ExperimentFoundationMirrorFreshnessStatus =
  (typeof EXPERIMENT_FOUNDATION_MIRROR_FRESHNESS_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_DATA_POLICY_ACCESS_LEVELS = [
  'open',
  'restricted',
  'private',
  'unknown',
] as const;
export type ExperimentFoundationDataPolicyAccessLevel =
  (typeof EXPERIMENT_FOUNDATION_DATA_POLICY_ACCESS_LEVELS)[number];

export const EXPERIMENT_FOUNDATION_DATA_POLICY_PRIVACY_LEVELS = [
  'public',
  'sensitive',
  'confidential',
  'unknown',
] as const;
export type ExperimentFoundationDataPolicyPrivacyLevel =
  (typeof EXPERIMENT_FOUNDATION_DATA_POLICY_PRIVACY_LEVELS)[number];

export const EXPERIMENT_FOUNDATION_DATA_MIRROR_POLICIES = [
  'allowed',
  'approval_required',
  'forbidden',
  'unknown',
] as const;
export type ExperimentFoundationDataMirrorPolicy =
  (typeof EXPERIMENT_FOUNDATION_DATA_MIRROR_POLICIES)[number];

export const EXPERIMENT_FOUNDATION_BENCHMARK_CATALOG_STATUSES = [
  'registered',
  'active',
  'deprecated',
  'archived',
] as const;
export type ExperimentFoundationBenchmarkCatalogStatus =
  (typeof EXPERIMENT_FOUNDATION_BENCHMARK_CATALOG_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_BENCHMARK_VERIFICATION_STATUSES = [
  'unknown',
  'protocol_complete',
  'assets_reachable',
  'evaluator_smoke_verified',
  'reproducible_protocol',
  'comparison_certified',
  'broken',
] as const;
export type ExperimentFoundationBenchmarkVerificationStatus =
  (typeof EXPERIMENT_FOUNDATION_BENCHMARK_VERIFICATION_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_BASELINE_CATALOG_STATUSES = [
  'registered',
  'active',
  'deprecated',
  'archived',
] as const;
export type ExperimentFoundationBaselineCatalogStatus =
  (typeof EXPERIMENT_FOUNDATION_BASELINE_CATALOG_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_BASELINE_VERIFICATION_STATUSES = [
  'unknown',
  'metadata_complete',
  'reachable',
  'smoke_verified',
  'protocol_compatible',
  'benchmark_verified',
  'broken',
] as const;
export type ExperimentFoundationBaselineVerificationStatus =
  (typeof EXPERIMENT_FOUNDATION_BASELINE_VERIFICATION_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_METRIC_DIRECTIONS = [
  'higher_is_better',
  'lower_is_better',
  'target_is_best',
  'informational',
] as const;
export type ExperimentFoundationMetricDirection =
  (typeof EXPERIMENT_FOUNDATION_METRIC_DIRECTIONS)[number];

export const EXPERIMENT_FOUNDATION_METRIC_VALUE_TYPES = [
  'number',
  'percentage',
  'duration',
  'boolean',
  'category',
  'object',
] as const;
export type ExperimentFoundationMetricValueType =
  (typeof EXPERIMENT_FOUNDATION_METRIC_VALUE_TYPES)[number];

export const EXPERIMENT_FOUNDATION_BASELINE_FAMILIES = [
  'method',
  'model',
  'implementation',
  'heuristic',
  'external_system',
  'other',
] as const;
export type ExperimentFoundationBaselineFamily =
  (typeof EXPERIMENT_FOUNDATION_BASELINE_FAMILIES)[number];

export const EXPERIMENT_FOUNDATION_READINESS_SNAPSHOT_STATUSES = [
  'passed',
  'blocked',
  'stale',
  'unknown',
] as const;
export type ExperimentFoundationReadinessSnapshotStatus =
  (typeof EXPERIMENT_FOUNDATION_READINESS_SNAPSHOT_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_METHOD_RECIPE_COMPONENT_KINDS = [
  'training_strategy',
  'inference_strategy',
  'optimizer_preset',
  'architecture_template',
  'hyperparameter_space',
  'ablation_plan',
  'fine_tuning_strategy',
  'custom',
] as const;
export type ExperimentFoundationMethodRecipeComponentKind =
  (typeof EXPERIMENT_FOUNDATION_METHOD_RECIPE_COMPONENT_KINDS)[number];

export const EXPERIMENT_FOUNDATION_EXTERNAL_LOCK_REF_KINDS = [
  'base_model',
  'fine_tuning_dataset',
  'fine_tuning_strategy',
  'prompt_template',
  'context_policy',
  'custom',
] as const;
export type ExperimentFoundationExternalLockRefKind =
  (typeof EXPERIMENT_FOUNDATION_EXTERNAL_LOCK_REF_KINDS)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS = [
  'standard_training',
  'evaluation_only',
  'llm_fine_tuning',
] as const;
export type ExperimentFoundationExecutionProfileKind =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS)[number];

export const EXPERIMENT_FOUNDATION_TRAINING_PLATFORM_KINDS = [
  'local_script',
  'aliyun_pai_dlc',
] as const;
export type ExperimentFoundationTrainingPlatformKind =
  (typeof EXPERIMENT_FOUNDATION_TRAINING_PLATFORM_KINDS)[number];

export const EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS = [
  'local_script',
  'aliyun_pai_dlc',
] as const;
export type ExperimentFoundationTrainingAdapterKind =
  (typeof EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS)[number];

export const EXPERIMENT_FOUNDATION_TASK_MATERIALIZATION_STATUSES = [
  'materialized',
  'blocked',
  'failed',
  'partial',
] as const;
export type ExperimentFoundationTaskMaterializationStatus =
  (typeof EXPERIMENT_FOUNDATION_TASK_MATERIALIZATION_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_TRAINING_TASK_STAGE_EVENT_KINDS = [
  'materialization_requested',
  'task_spec_materialized',
  'adapter_metadata_registered',
  'submission_requested',
  'status_synced',
  'partial_result_registered',
  'cancellation_requested',
  'failed',
] as const;
export type ExperimentFoundationTrainingTaskStageEventKind =
  (typeof EXPERIMENT_FOUNDATION_TRAINING_TASK_STAGE_EVENT_KINDS)[number];

export const EXPERIMENT_FOUNDATION_TRAINING_TASK_CANCELLATION_STATUSES = [
  'requested',
  'accepted',
  'rejected',
  'cancelled',
  'failed',
] as const;
export type ExperimentFoundationTrainingTaskCancellationStatus =
  (typeof EXPERIMENT_FOUNDATION_TRAINING_TASK_CANCELLATION_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_TRAINING_TASK_PARTIAL_RESULT_KINDS = [
  'metrics',
  'artifact',
  'log',
  'config_snapshot',
  'checkpoint',
  'prediction',
  'model_card',
  'other',
] as const;
export type ExperimentFoundationTrainingTaskPartialResultKind =
  (typeof EXPERIMENT_FOUNDATION_TRAINING_TASK_PARTIAL_RESULT_KINDS)[number];

export const EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES = [
  'submitted',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelling',
  'cancelled',
  'unknown',
] as const;
export type ExperimentFoundationExternalTrainingJobStatus =
  (typeof EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_IN_FLIGHT_STATUSES = [
  'submitted',
  'queued',
  'running',
  'cancelling',
] as const satisfies readonly ExperimentFoundationExternalTrainingJobStatus[];
export type ExperimentFoundationExternalTrainingJobInFlightStatus =
  (typeof EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_IN_FLIGHT_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_RESULT_ARTIFACT_KINDS = [
  'metric_bundle',
  'prediction_bundle',
  'checkpoint',
  'adapter',
  'merged_model',
  'model_card',
  'log_bundle',
  'config_snapshot',
  'training_curve',
  'evaluation_report',
  'other',
] as const;
export type ExperimentFoundationResultArtifactKind =
  (typeof EXPERIMENT_FOUNDATION_RESULT_ARTIFACT_KINDS)[number];

export const EXPERIMENT_FOUNDATION_RESULT_LOG_KINDS = [
  'stdout',
  'stderr',
  'system',
  'adapter',
  'evaluation',
  'other',
] as const;
export type ExperimentFoundationResultLogKind =
  (typeof EXPERIMENT_FOUNDATION_RESULT_LOG_KINDS)[number];

export const EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES = [
  'valid',
  'invalid',
  'partial',
  'accepted_partial',
] as const;
export type ExperimentFoundationResultValidationStatus =
  (typeof EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_EVALUATION_FACT_KINDS = [
  'metric',
  'comparison',
  'artifact',
  'configuration',
  'runtime',
  'cost',
  'other',
] as const;
export type ExperimentFoundationEvaluationFactKind =
  (typeof EXPERIMENT_FOUNDATION_EVALUATION_FACT_KINDS)[number];

export const EXPERIMENT_FOUNDATION_COMPARISON_OUTCOMES = [
  'better',
  'worse',
  'tie',
  'inconclusive',
  'not_comparable',
] as const;
export type ExperimentFoundationComparisonOutcome =
  (typeof EXPERIMENT_FOUNDATION_COMPARISON_OUTCOMES)[number];

export const EXPERIMENT_FOUNDATION_IMPLEMENTATION_DECISION_SIGNALS = [
  'continue',
  'adjust',
  'rerun',
  'abandon',
  'needs_more_data',
] as const;
export type ExperimentFoundationImplementationDecisionSignalKind =
  (typeof EXPERIMENT_FOUNDATION_IMPLEMENTATION_DECISION_SIGNALS)[number];

export const EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_STATUSES = [
  'candidate',
  'under_review',
  'rejected',
  'superseded',
] as const;
export type ExperimentFoundationEvidenceCandidateStatus =
  (typeof EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_PAPER_SIDECAR_STATUSES = [
  'draft',
  'linked',
  'stale',
  'superseded',
] as const;
export type ExperimentFoundationPaperSidecarStatus =
  (typeof EXPERIMENT_FOUNDATION_PAPER_SIDECAR_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES = [
  'dataset',
  'benchmark',
  'baseline',
  'evaluation_protocol',
  'method_component',
  'base_model',
] as const;
export type ExperimentFoundationAssetCandidateFamily =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES)[number];

export const EXPERIMENT_FOUNDATION_DATASET_CANDIDATE_USAGES = [
  'benchmark_dataset',
  'fine_tuning_dataset',
  'generic_dataset',
] as const;
export type ExperimentFoundationDatasetCandidateUsage =
  (typeof EXPERIMENT_FOUNDATION_DATASET_CANDIDATE_USAGES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES = [
  'needs_info',
  'manual_review_required',
  'rejected',
  'ready_for_promotion',
  'promoted',
] as const;
export type ExperimentFoundationAssetCandidateStatus =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_SOURCE_KINDS = [
  'literature_key_content',
  'manual_observation',
  'imported_catalog',
  'existing_workspace',
  'other',
] as const;
export type ExperimentFoundationAssetCandidateSourceKind =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_SOURCE_KINDS)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_RISK_LEVELS = [
  'low',
  'medium',
  'high',
  'restricted',
  'unknown',
] as const;
export type ExperimentFoundationAssetCandidateRiskLevel =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_RISK_LEVELS)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_DUPLICATE_STATUSES = [
  'not_checked',
  'no_duplicate',
  'possible_duplicate',
  'duplicate',
] as const;
export type ExperimentFoundationAssetCandidateDuplicateStatus =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_DUPLICATE_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_COMPLETENESS_STATUSES = [
  'incomplete',
  'needs_info',
  'complete',
] as const;
export type ExperimentFoundationAssetCandidateCompletenessStatus =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_COMPLETENESS_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_POLICY_STATUSES = [
  'unknown',
  'clear',
  'unclear_license',
  'restricted',
  'forbidden',
] as const;
export type ExperimentFoundationAssetCandidatePolicyStatus =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_POLICY_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_PROMOTION_DECISION_KINDS = [
  'auto_promote',
  'manual_promote',
  'manual_review_required',
  'needs_info',
  'reject',
] as const;
export type ExperimentFoundationAssetPromotionDecisionKind =
  (typeof EXPERIMENT_FOUNDATION_ASSET_PROMOTION_DECISION_KINDS)[number];

export const EXPERIMENT_FOUNDATION_ASSET_PROMOTION_RESULT_STATUSES = [
  'promoted',
  'manual_review_required',
  'needs_info',
  'rejected',
  'blocked',
] as const;
export type ExperimentFoundationAssetPromotionResultStatus =
  (typeof EXPERIMENT_FOUNDATION_ASSET_PROMOTION_RESULT_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_RECORD_KINDS = [
  'dataset_asset',
  'dataset_version',
  'dataset_location',
  'dataset_mirror',
  'checksum_manifest',
  'split_protocol',
  'data_policy',
  'dataset_version_lock',
  'benchmark_asset',
  'metric_definition',
  'evaluation_protocol',
  'baseline_asset',
  'baseline_implementation_version',
  'evaluation_protocol_lock',
  'baseline_implementation_version_lock',
  'readiness_snapshot',
  'method_recipe_component',
  'method_recipe_component_lock',
  'external_lock_ref',
  'version_lock',
  'recipe_draft',
  'execution_profile',
  'generate_run_recipe_request',
  'run_recipe',
  'training_platform_ref',
  'materialize_training_task_spec_request',
  'fine_tuning_task_profile',
  'training_task_spec',
  'adapter_metadata_ref',
  'training_task_materialization_result',
  'training_task_stage_event',
  'training_task_cancellation_request',
  'training_task_partial_result_ref',
  'experiment_result',
  'fine_tuning_result',
  'result_validation_report',
  'evaluation_fact',
  'metric_observation',
  'comparison_observation',
  'implementation_decision_signal',
  'paper_table_fact_set',
  'evidence_candidate',
  'paper_experiment_sidecar',
  'asset_candidate_source_trace',
  'asset_candidate_duplicate_check',
  'asset_candidate_completeness_check',
  'asset_candidate_policy_check',
  'asset_candidate_risk_assessment',
  'asset_candidate_rule_trace',
  'dataset_asset_candidate',
  'benchmark_asset_candidate',
  'baseline_asset_candidate',
  'evaluation_protocol_candidate',
  'method_component_candidate',
  'base_model_candidate',
  'asset_candidate_triage_report',
  'asset_promotion_request',
  'asset_promotion_result',
] as const;
export type ExperimentFoundationRecordKind =
  (typeof EXPERIMENT_FOUNDATION_RECORD_KINDS)[number];

export const EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES = [
  'passed',
  'blocked',
  'stale',
  'unknown',
] as const;
export type ExperimentFoundationReadinessReportStatus =
  (typeof EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_READINESS_BLOCKED_STATUSES = [
  'blocked',
] as const satisfies readonly ExperimentFoundationReadinessReportStatus[];
export type ExperimentFoundationReadinessBlockedStatus =
  (typeof EXPERIMENT_FOUNDATION_READINESS_BLOCKED_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_ATTENTION_STATUSES = [
  'needs_info',
  'manual_review_required',
  'ready_for_promotion',
] as const satisfies readonly ExperimentFoundationAssetCandidateStatus[];
export type ExperimentFoundationAssetCandidateAttentionStatus =
  (typeof EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_ATTENTION_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_REVIEW_STATUSES = [
  'candidate',
  'under_review',
] as const satisfies readonly ExperimentFoundationEvidenceCandidateStatus[];
export type ExperimentFoundationEvidenceCandidateReviewStatus =
  (typeof EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_REVIEW_STATUSES)[number];

export interface ExperimentFoundationRef {
  ref_type: string;
  ref_id: string;
  version_id?: string | null;
  label?: string | null;
}

export interface StorageRootRef {
  storage_root_ref_id: string;
  root_key: string;
  root_label?: string | null;
  root_kind: ExperimentFoundationStorageRootKind;
  policy_ref?: ExperimentFoundationRef | null;
}

export interface LocalFileRef {
  storage_root_ref_id: string;
  relative_path: string;
  file_kind: ExperimentFoundationLocalFileKind;
  expected_checksum_hash?: string | null;
  byte_size?: number | null;
}

export interface DatasetRemoteRef {
  provider: string;
  ref_kind: string;
  ref_value: string;
  region?: string | null;
}

export interface DatasetAsset {
  dataset_asset_id: string;
  name: string;
  aliases: string[];
  description?: string | null;
  source_refs: ExperimentFoundationRef[];
  task_types: string[];
  schema_summary: Record<string, unknown>;
  default_version_id?: string | null;
  catalog_status: ExperimentFoundationDatasetCatalogStatus;
  created_at: string;
  updated_at: string;
}

export interface DatasetVersion {
  dataset_version_id: string;
  dataset_asset_id: string;
  version_label: string;
  checksum_manifest_id: string;
  checksum_manifest_hash: string;
  split_protocol_id: string;
  split_protocol_hash: string;
  data_policy_id: string;
  data_policy_hash: string;
  processing_recipe_ref?: ExperimentFoundationRef | null;
  location_ids: string[];
  access_status: ExperimentFoundationDatasetAccessStatus;
  readiness_status: ExperimentFoundationDatasetReadinessStatus;
  created_at: string;
  updated_at: string;
}

export interface DatasetLocation {
  dataset_location_id: string;
  dataset_version_id: string;
  location_kind: ExperimentFoundationDatasetLocationKind;
  storage_root_ref?: StorageRootRef | null;
  local_file_ref?: LocalFileRef | null;
  remote_ref?: DatasetRemoteRef | null;
  availability_status: ExperimentFoundationDatasetLocationAvailabilityStatus;
  last_checked_at?: string | null;
}

export interface DatasetMirror {
  dataset_mirror_id: string;
  dataset_version_id: string;
  mirror_role: 'execution_mirror';
  provider: ExperimentFoundationMirrorProvider;
  mirror_ref: ExperimentFoundationRef;
  mirror_status: ExperimentFoundationMirrorStatus;
  source_checksum_manifest_hash: string;
  freshness_status: ExperimentFoundationMirrorFreshnessStatus;
  approval_ref?: ExperimentFoundationRef | null;
  run_scope_ref?: ExperimentFoundationRef | null;
  created_at: string;
  updated_at: string;
}

export interface ChecksumManifest {
  checksum_manifest_id: string;
  dataset_version_id: string;
  algorithm: ExperimentFoundationChecksumAlgorithm;
  manifest_hash: string;
  manifest_file_ref: LocalFileRef;
  entry_count: number;
  total_bytes: number;
  created_at: string;
}

export interface SplitProtocol {
  split_protocol_id: string;
  dataset_version_id: string;
  split_names: string[];
  split_file_refs: LocalFileRef[];
  generation_method: string;
  seed?: number | null;
  protocol_hash: string;
  leakage_notes?: string | null;
  created_at: string;
}

export interface DataPolicy {
  data_policy_id: string;
  license: string;
  access_level: ExperimentFoundationDataPolicyAccessLevel;
  privacy_level: ExperimentFoundationDataPolicyPrivacyLevel;
  allowed_use_cases: string[];
  mirror_policy: ExperimentFoundationDataMirrorPolicy;
  approval_refs: ExperimentFoundationRef[];
  policy_hash: string;
  retention_notes?: string | null;
  created_at: string;
}

export interface DatasetVersionLock {
  dataset_asset_id: string;
  dataset_version_id: string;
  checksum_manifest_hash: string;
  split_protocol_hash: string;
  data_policy_id: string;
  data_policy_hash: string;
  locked_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface BenchmarkAsset {
  benchmark_asset_id: string;
  name: string;
  description?: string | null;
  task: string;
  domain: string;
  dataset_version_refs: ExperimentFoundationRef[];
  default_evaluation_protocol_refs: ExperimentFoundationRef[];
  source_refs: ExperimentFoundationRef[];
  community_refs: ExperimentFoundationRef[];
  catalog_status: ExperimentFoundationBenchmarkCatalogStatus;
  verification_status: ExperimentFoundationBenchmarkVerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface MetricDefinition {
  metric_definition_id: string;
  metric_key: string;
  name: string;
  description?: string | null;
  direction: ExperimentFoundationMetricDirection;
  unit?: string | null;
  value_type: ExperimentFoundationMetricValueType;
  evaluator_ref?: ExperimentFoundationRef | null;
  parser_ref?: ExperimentFoundationRef | null;
  validity_constraints: string[];
  created_at: string;
  updated_at: string;
}

export interface EvaluationProtocol {
  evaluation_protocol_id: string;
  benchmark_asset_id: string;
  protocol_version: string;
  protocol_hash: string;
  metric_definition_refs: ExperimentFoundationRef[];
  evaluator_refs: ExperimentFoundationRef[];
  aggregation: Record<string, unknown>;
  seed_policy: Record<string, unknown>;
  repeat_policy: Record<string, unknown>;
  reporting_protocol: Record<string, unknown>;
  comparison_policy: Record<string, unknown>;
  statistical_protocol: Record<string, unknown>;
  budget_fairness_policy: Record<string, unknown>;
  tuning_fairness_policy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BaselineAsset {
  baseline_asset_id: string;
  name: string;
  aliases: string[];
  description?: string | null;
  baseline_family: ExperimentFoundationBaselineFamily;
  source_refs: ExperimentFoundationRef[];
  supported_benchmark_refs: ExperimentFoundationRef[];
  recommended_use?: string | null;
  catalog_status: ExperimentFoundationBaselineCatalogStatus;
  created_at: string;
  updated_at: string;
}

export interface BaselineImplementationVersion {
  baseline_implementation_version_id: string;
  baseline_asset_id: string;
  version_label: string;
  implementation_hash: string;
  code_ref: ExperimentFoundationRef;
  commit_hash: string;
  runtime_ref: ExperimentFoundationRef;
  entrypoint: string;
  default_params: Record<string, unknown>;
  input_contract: Record<string, unknown>;
  output_contract: Record<string, unknown>;
  supported_benchmark_refs: ExperimentFoundationRef[];
  supported_evaluation_protocol_refs: ExperimentFoundationRef[];
  verification_status: ExperimentFoundationBaselineVerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface EvaluationProtocolLock {
  evaluation_protocol_id: string;
  benchmark_asset_id: string;
  protocol_version: string;
  protocol_hash: string;
  metric_definition_refs: ExperimentFoundationRef[];
  locked_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface BaselineImplementationVersionLock {
  baseline_asset_id: string;
  baseline_implementation_version_id: string;
  version_label: string;
  implementation_hash: string;
  code_ref: ExperimentFoundationRef;
  commit_hash: string;
  runtime_ref: ExperimentFoundationRef;
  runtime_hash: string;
  entrypoint: string;
  locked_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface ExperimentFoundationReadinessSnapshot {
  readiness_report_id: string;
  readiness_report_hash: string;
  status: ExperimentFoundationReadinessSnapshotStatus;
  checked_at: string;
  source_refs: ExperimentFoundationRef[];
  blockers: string[];
}

export interface MethodRecipeComponent {
  method_recipe_component_id: string;
  component_kind: ExperimentFoundationMethodRecipeComponentKind;
  name: string;
  description?: string | null;
  version_label: string;
  component_hash: string;
  component_spec: Record<string, unknown>;
  source_refs: ExperimentFoundationRef[];
  created_at: string;
  updated_at: string;
}

export interface MethodRecipeComponentLock {
  method_recipe_component_id: string;
  component_kind: ExperimentFoundationMethodRecipeComponentKind;
  version_label: string;
  component_hash: string;
  locked_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface ExperimentFoundationExternalLockRef {
  ref_kind: ExperimentFoundationExternalLockRefKind;
  ref: ExperimentFoundationRef;
  ref_hash: string;
}

export interface ExperimentFoundationVersionLock {
  version_lock_id: string;
  dataset_version_lock: DatasetVersionLock;
  evaluation_protocol_lock: EvaluationProtocolLock;
  baseline_implementation_locks: BaselineImplementationVersionLock[];
  method_component_locks: MethodRecipeComponentLock[];
  external_lock_refs: ExperimentFoundationExternalLockRef[];
  readiness_snapshot: ExperimentFoundationReadinessSnapshot;
  version_lock_hash: string;
  locked_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface RecipeDraft {
  recipe_draft_id: string;
  source_refs: ExperimentFoundationRef[];
  candidate_dataset_refs: ExperimentFoundationRef[];
  candidate_benchmark_refs: ExperimentFoundationRef[];
  candidate_baseline_refs: ExperimentFoundationRef[];
  candidate_evaluation_protocol_refs: ExperimentFoundationRef[];
  method_component_refs: ExperimentFoundationRef[];
  draft_parameter_overrides: Record<string, unknown>;
  missing_inputs: string[];
  draft_validation_warnings: string[];
  traceability_refs: ExperimentFoundationRef[];
  created_at: string;
  updated_at: string;
}

export interface ExperimentFoundationExecutionProfile {
  profile_kind: ExperimentFoundationExecutionProfileKind;
  capability_requirements: string[];
  resource_classes: string[];
  supports_distributed: boolean;
  long_running: boolean;
  fine_tuning_external_lock_refs?: ExperimentFoundationExternalLockRef[];
}

export interface GenerateRunRecipeRequest {
  generate_run_recipe_request_id: string;
  recipe_draft_id: string;
  version_lock: ExperimentFoundationVersionLock;
  resolved_params: Record<string, unknown>;
  execution_profile: ExperimentFoundationExecutionProfile;
  config_snapshot_hash: string;
  requested_by_ref: ExperimentFoundationRef;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface RunRecipe {
  run_recipe_id: string;
  recipe_draft_id: string;
  version_lock: ExperimentFoundationVersionLock;
  version_lock_hash: string;
  resolved_params: Record<string, unknown>;
  execution_profile: ExperimentFoundationExecutionProfile;
  config_snapshot: Record<string, unknown>;
  config_snapshot_hash: string;
  readiness_snapshot: ExperimentFoundationReadinessSnapshot;
  run_recipe_hash: string;
  locked_at: string;
  source_refs: ExperimentFoundationRef[];
  traceability_refs: ExperimentFoundationRef[];
}

export interface ExperimentFoundationTrainingPlatformRef {
  platform_id: string;
  platform_kind: ExperimentFoundationTrainingPlatformKind;
  adapter_kind: ExperimentFoundationTrainingAdapterKind;
  adapter_version: string;
  capability_refs: ExperimentFoundationRef[];
}

export interface MaterializeTrainingTaskSpecRequest {
  materialization_request_id: string;
  run_recipe: RunRecipe;
  selected_platform: ExperimentFoundationTrainingPlatformRef;
  adapter_version: string;
  idempotency_key: string;
  requested_by_ref: ExperimentFoundationRef;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface FineTuningTaskProfile {
  fine_tuning_profile_id: string;
  base_model_ref: ExperimentFoundationExternalLockRef;
  fine_tuning_dataset_refs: ExperimentFoundationExternalLockRef[];
  dataset_policy_refs: ExperimentFoundationRef[];
  dataset_policy_hashes: string[];
  fine_tuning_strategy_ref: ExperimentFoundationExternalLockRef;
  prompt_template_ref: ExperimentFoundationExternalLockRef;
  context_policy_ref: ExperimentFoundationExternalLockRef;
  training_config: Record<string, unknown>;
  resource_budget: Record<string, unknown>;
  evaluation_protocol_lock: EvaluationProtocolLock;
  evaluation_protocol_ref: ExperimentFoundationRef;
  output_artifact_contract: Record<string, unknown>;
  source_refs: ExperimentFoundationRef[];
}

export interface TrainingTaskSpec {
  training_task_spec_id: string;
  materialization_request_id: string;
  run_recipe_id: string;
  run_recipe_hash: string;
  version_lock_hash: string;
  profile_kind: ExperimentFoundationExecutionProfileKind;
  selected_platform: ExperimentFoundationTrainingPlatformRef;
  runtime_ref: ExperimentFoundationRef;
  runtime_hash: string;
  command: string;
  args: string[];
  env_refs: ExperimentFoundationRef[];
  input_refs: ExperimentFoundationRef[];
  output_contract: Record<string, unknown>;
  resource_request: Record<string, unknown>;
  timeout_seconds: number;
  retry_policy: Record<string, unknown>;
  auth_ref_names: string[];
  config_snapshot_hash: string;
  fine_tuning_profile?: FineTuningTaskProfile;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
  traceability_refs: ExperimentFoundationRef[];
}

export interface ExperimentFoundationAdapterMetadataRef {
  adapter_metadata_ref_id: string;
  adapter_kind: ExperimentFoundationTrainingAdapterKind;
  adapter_version: string;
  metadata_storage_ref: ExperimentFoundationRef;
  metadata_hash: string;
  schema_version: string;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface TrainingTaskMaterializationResult {
  materialization_result_id: string;
  materialization_request_id: string;
  status: ExperimentFoundationTaskMaterializationStatus;
  training_task_spec_ref?: ExperimentFoundationRef;
  training_task_spec_hash?: string;
  adapter_metadata_ref?: ExperimentFoundationAdapterMetadataRef;
  adapter_metadata_hash?: string;
  materialization_hash: string;
  idempotency_key: string;
  blockers: string[];
  warnings: string[];
  traceability_refs: ExperimentFoundationRef[];
  event_refs: ExperimentFoundationRef[];
  created_at: string;
}

export interface TrainingTaskStageEvent {
  stage_event_id: string;
  event_kind: ExperimentFoundationTrainingTaskStageEventKind;
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  event_payload_ref?: ExperimentFoundationRef | null;
  event_payload_hash?: string | null;
  occurred_at: string;
  source_refs: ExperimentFoundationRef[];
  traceability_refs: ExperimentFoundationRef[];
}

export interface TrainingTaskCancellationRequest {
  cancellation_request_id: string;
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  requested_by_ref: ExperimentFoundationRef;
  reason: string;
  idempotency_key: string;
  cancellation_status: ExperimentFoundationTrainingTaskCancellationStatus;
  requested_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface TrainingTaskPartialResultRef {
  partial_result_ref_id: string;
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  result_kind: ExperimentFoundationTrainingTaskPartialResultKind;
  artifact_ref: ExperimentFoundationRef;
  artifact_hash: string;
  produced_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface ExternalTrainingJob {
  external_job_id: string;
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  materialization_result_ref: ExperimentFoundationRef;
  materialization_result_hash: string;
  adapter_kind: ExperimentFoundationTrainingAdapterKind;
  adapter_version: string;
  platform_ref: ExperimentFoundationTrainingPlatformRef;
  idempotency_key: string;
  external_job_ref: ExperimentFoundationRef;
  external_job_hash: string;
  job_status: ExperimentFoundationExternalTrainingJobStatus;
  submitted_at: string;
  last_synced_at?: string | null;
  completed_at?: string | null;
  stage_event_refs: ExperimentFoundationRef[];
  partial_result_refs: ExperimentFoundationRef[];
  result_refs: ExperimentFoundationRef[];
  adapter_metadata_refs: ExperimentFoundationRef[];
  adapter_metadata_hashes: string[];
  traceability_refs: ExperimentFoundationRef[];
  created_at: string;
  updated_at: string;
}

export interface ResultMetricValue {
  metric_key: string;
  metric_definition_ref: ExperimentFoundationRef;
  value: unknown;
  value_type: ExperimentFoundationMetricValueType;
  unit?: string | null;
  split_name?: string | null;
  aggregation?: Record<string, unknown> | null;
  source_artifact_ref?: ExperimentFoundationRef | null;
  source_artifact_hash?: string | null;
}

export interface ResultArtifact {
  result_artifact_id: string;
  artifact_kind: ExperimentFoundationResultArtifactKind;
  artifact_ref: ExperimentFoundationRef;
  artifact_hash: string;
  checksum_hash?: string | null;
  byte_size?: number | null;
  retention_policy_ref?: ExperimentFoundationRef | null;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface ResultLogRef {
  log_ref: ExperimentFoundationRef;
  log_hash: string;
  log_kind: ExperimentFoundationResultLogKind;
  byte_size?: number | null;
  source_refs: ExperimentFoundationRef[];
}

export interface ExperimentResult {
  experiment_result_id: string;
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  materialization_result_ref: ExperimentFoundationRef;
  materialization_result_hash: string;
  run_recipe_id: string;
  run_recipe_hash: string;
  version_lock_hash: string;
  profile_kind: ExperimentFoundationExecutionProfileKind;
  external_job_ref?: ExperimentFoundationRef | null;
  external_job_hash?: string | null;
  metrics: ResultMetricValue[];
  artifacts: ResultArtifact[];
  logs: ResultLogRef[];
  config_snapshot_ref?: ExperimentFoundationRef | null;
  config_snapshot_hash: string;
  partial_result_refs: TrainingTaskPartialResultRef[];
  validation_report_refs: ExperimentFoundationRef[];
  provenance_refs: ExperimentFoundationRef[];
  result_hash: string;
  created_at: string;
}

export interface FineTuningResult {
  fine_tuning_result_id: string;
  experiment_result_ref: ExperimentFoundationRef;
  experiment_result_hash: string;
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  run_recipe_id: string;
  run_recipe_hash: string;
  version_lock_hash: string;
  base_model_ref: ExperimentFoundationExternalLockRef;
  fine_tuning_dataset_refs: ExperimentFoundationExternalLockRef[];
  adapter_artifact_ref: ExperimentFoundationRef;
  adapter_artifact_hash: string;
  checkpoint_artifact_refs: ResultArtifact[];
  merged_model_artifact_ref?: ExperimentFoundationRef | null;
  merged_model_artifact_hash?: string | null;
  train_metrics: ResultMetricValue[];
  eval_metrics: ResultMetricValue[];
  training_curve_refs: ResultArtifact[];
  model_card_ref: ExperimentFoundationRef;
  model_card_hash: string;
  validation_status: ExperimentFoundationResultValidationStatus;
  blockers: string[];
  traceability_refs: ExperimentFoundationRef[];
  result_hash: string;
  created_at: string;
}

export interface ResultValidationReport {
  result_validation_report_id: string;
  source_result_ref: ExperimentFoundationRef;
  source_result_hash: string;
  validation_status: ExperimentFoundationResultValidationStatus;
  evaluation_protocol_lock: EvaluationProtocolLock;
  checked_metric_keys: string[];
  missing_metric_keys: string[];
  missing_artifact_kinds: string[];
  protocol_violations: string[];
  warnings: string[];
  generated_fact_refs: ExperimentFoundationRef[];
  partial_acceptance_ref?: ExperimentFoundationRef | null;
  validation_hash: string;
  validated_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface EvaluationFact {
  evaluation_fact_id: string;
  fact_kind: ExperimentFoundationEvaluationFactKind;
  run_recipe_id: string;
  run_recipe_hash: string;
  result_ref: ExperimentFoundationRef;
  result_hash: string;
  evaluation_protocol_id: string;
  evaluation_protocol_hash: string;
  benchmark_asset_ref: ExperimentFoundationRef;
  dataset_version_ref: ExperimentFoundationRef;
  validation_report_ref: ExperimentFoundationRef;
  validation_report_hash: string;
  metric_observation_refs: ExperimentFoundationRef[];
  comparison_observation_refs: ExperimentFoundationRef[];
  artifact_refs: ExperimentFoundationRef[];
  fact_payload: Record<string, unknown>;
  fact_hash: string;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
  provenance_refs: ExperimentFoundationRef[];
}

export interface MetricObservation {
  metric_observation_id: string;
  metric_definition_ref: ExperimentFoundationRef;
  metric_key: string;
  value: unknown;
  value_type: ExperimentFoundationMetricValueType;
  direction: ExperimentFoundationMetricDirection;
  unit?: string | null;
  split_name?: string | null;
  aggregation?: Record<string, unknown> | null;
  run_recipe_id: string;
  run_recipe_hash: string;
  result_ref: ExperimentFoundationRef;
  result_hash: string;
  evaluation_protocol_id: string;
  evaluation_protocol_hash: string;
  benchmark_asset_ref: ExperimentFoundationRef;
  dataset_version_ref: ExperimentFoundationRef;
  validation_report_ref: ExperimentFoundationRef;
  validation_report_hash: string;
  observation_hash: string;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface ComparisonObservation {
  comparison_observation_id: string;
  primary_metric_observation_ref: ExperimentFoundationRef;
  primary_metric_observation_hash: string;
  baseline_metric_observation_ref: ExperimentFoundationRef;
  baseline_metric_observation_hash: string;
  comparison_outcome: ExperimentFoundationComparisonOutcome;
  delta?: number | null;
  relative_delta?: number | null;
  run_recipe_id: string;
  run_recipe_hash: string;
  result_ref: ExperimentFoundationRef;
  result_hash: string;
  evaluation_protocol_id: string;
  evaluation_protocol_hash: string;
  benchmark_asset_ref: ExperimentFoundationRef;
  baseline_asset_ref?: ExperimentFoundationRef | null;
  validation_report_ref: ExperimentFoundationRef;
  validation_report_hash: string;
  observation_hash: string;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface ImplementationDecisionSignal {
  implementation_decision_signal_id: string;
  signal_kind: ExperimentFoundationImplementationDecisionSignalKind;
  reason_summary: string;
  evaluation_fact_refs: ExperimentFoundationRef[];
  metric_observation_refs: ExperimentFoundationRef[];
  comparison_observation_refs: ExperimentFoundationRef[];
  run_recipe_ref: ExperimentFoundationRef;
  run_recipe_hash: string;
  recipe_draft_ref?: ExperimentFoundationRef | null;
  proposal_ref?: ExperimentFoundationRef | null;
  trial_ref?: ExperimentFoundationRef | null;
  created_by_ref: ExperimentFoundationRef;
  created_at: string;
  signal_hash: string;
  source_refs: ExperimentFoundationRef[];
}

export interface PaperTableFactSet {
  paper_table_fact_set_id: string;
  paper_project_id: string;
  title: string;
  table_intent: string;
  fact_refs: ExperimentFoundationRef[];
  fact_hashes: string[];
  metric_observation_refs: ExperimentFoundationRef[];
  metric_observation_hashes: string[];
  comparison_observation_refs: ExperimentFoundationRef[];
  comparison_observation_hashes: string[];
  validation_report_refs: ExperimentFoundationRef[];
  validation_report_hashes: string[];
  selection_criteria: Record<string, unknown>;
  fact_set_hash: string;
  created_at: string;
  source_refs: ExperimentFoundationRef[];
}

export interface EvidenceCandidate {
  evidence_candidate_id: string;
  evidence_status: ExperimentFoundationEvidenceCandidateStatus;
  validation_status: 'valid' | 'accepted_partial';
  source_result_refs: ExperimentFoundationRef[];
  source_result_hashes: string[];
  validation_report_refs: ExperimentFoundationRef[];
  validation_report_hashes: string[];
  run_recipe_id: string;
  run_recipe_hash: string;
  version_lock_hash: string;
  evaluation_protocol_id: string;
  evaluation_protocol_hash: string;
  metric_observation_refs: ExperimentFoundationRef[];
  metric_observation_hashes: string[];
  artifact_refs: ExperimentFoundationRef[];
  caveats: string[];
  blockers: string[];
  provenance_refs: ExperimentFoundationRef[];
  review_refs: ExperimentFoundationRef[];
  created_by_ref: ExperimentFoundationRef;
  created_at: string;
  evidence_hash: string;
}

export interface PaperExperimentSidecar {
  paper_experiment_sidecar_id: string;
  paper_project_id: string;
  sidecar_status: ExperimentFoundationPaperSidecarStatus;
  run_recipe_ref: ExperimentFoundationRef;
  run_recipe_hash: string;
  version_lock_hash: string;
  version_lock_snapshot_refs: ExperimentFoundationRef[];
  dataset_version_lock_ref: ExperimentFoundationRef;
  dataset_version_lock_hash: string;
  evaluation_protocol_lock_ref: ExperimentFoundationRef;
  evaluation_protocol_hash: string;
  benchmark_asset_ref: ExperimentFoundationRef;
  baseline_implementation_lock_refs: ExperimentFoundationRef[];
  baseline_implementation_hashes: string[];
  method_component_lock_refs: ExperimentFoundationRef[];
  method_component_hashes: string[];
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  materialization_result_ref: ExperimentFoundationRef;
  materialization_result_hash: string;
  adapter_metadata_refs: ExperimentFoundationRef[];
  adapter_metadata_hashes: string[];
  external_job_ref?: ExperimentFoundationRef | null;
  external_job_hash?: string | null;
  stage_event_refs: ExperimentFoundationRef[];
  cancellation_request_refs: ExperimentFoundationRef[];
  partial_result_refs: ExperimentFoundationRef[];
  result_refs: ExperimentFoundationRef[];
  result_hashes: string[];
  validation_report_refs: ExperimentFoundationRef[];
  validation_report_hashes: string[];
  evaluation_fact_refs: ExperimentFoundationRef[];
  evaluation_fact_hashes: string[];
  evidence_candidate_refs: ExperimentFoundationRef[];
  evidence_candidate_hashes: string[];
  paper_table_fact_set_refs: ExperimentFoundationRef[];
  paper_table_fact_set_hashes: string[];
  status_snapshot_refs: ExperimentFoundationRef[];
  event_log_refs: ExperimentFoundationRef[];
  provenance_refs: ExperimentFoundationRef[];
  sidecar_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ExperimentAssetCandidateSourceTrace {
  source_trace_id: string;
  source_kind: ExperimentFoundationAssetCandidateSourceKind;
  source_ref: ExperimentFoundationRef;
  extraction_ref?: ExperimentFoundationRef | null;
  evidence_locator_snapshot: Record<string, unknown>;
  confidence_score: number;
  extracted_at?: string | null;
  created_at: string;
}

export interface ExperimentAssetCandidateDuplicateCheck {
  duplicate_check_id: string;
  duplicate_status: ExperimentFoundationAssetCandidateDuplicateStatus;
  checked_refs: ExperimentFoundationRef[];
  possible_duplicate_refs: ExperimentFoundationRef[];
  rationale: string;
  checked_at: string;
}

export interface ExperimentAssetCandidateCompletenessCheck {
  completeness_check_id: string;
  completeness_status: ExperimentFoundationAssetCandidateCompletenessStatus;
  required_fields: string[];
  missing_fields: string[];
  checked_at: string;
}

export interface ExperimentAssetCandidatePolicyCheck {
  policy_check_id: string;
  policy_status: ExperimentFoundationAssetCandidatePolicyStatus;
  license: string;
  policy_ref?: ExperimentFoundationRef | null;
  policy_hash?: string | null;
  restricted_reasons: string[];
  checked_at: string;
}

export interface ExperimentAssetCandidateRiskAssessment {
  risk_assessment_id: string;
  risk_level: ExperimentFoundationAssetCandidateRiskLevel;
  risk_reasons: string[];
  privacy_sensitive: boolean;
  model_weight_sensitive: boolean;
  requires_manual_review: boolean;
  assessed_at: string;
}

export interface ExperimentAssetCandidateRuleTrace {
  rule_trace_id: string;
  rule_id: string;
  rule_version: string;
  outcome: string;
  triggered_reasons: string[];
  trace_hash: string;
  created_at: string;
}

export interface DatasetAssetCandidate {
  dataset_asset_candidate_id: string;
  candidate_family: 'dataset';
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  canonical_name: string;
  aliases: string[];
  description?: string | null;
  dataset_usage: ExperimentFoundationDatasetCandidateUsage;
  source_refs: ExperimentFoundationRef[];
  source_traces: ExperimentAssetCandidateSourceTrace[];
  extraction_provenance_refs: ExperimentFoundationRef[];
  confidence_score: number;
  duplicate_check: ExperimentAssetCandidateDuplicateCheck;
  completeness_check: ExperimentAssetCandidateCompletenessCheck;
  policy_check: ExperimentAssetCandidatePolicyCheck;
  risk_assessment: ExperimentAssetCandidateRiskAssessment;
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  existing_canonical_refs: ExperimentFoundationRef[];
  task_types: string[];
  schema_summary: Record<string, unknown>;
  version_label?: string | null;
  proposed_version_refs: ExperimentFoundationRef[];
  proposed_policy_refs: ExperimentFoundationRef[];
  proposed_location_refs: ExperimentFoundationRef[];
  candidate_hash: string;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkAssetCandidate {
  benchmark_asset_candidate_id: string;
  candidate_family: 'benchmark';
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  canonical_name: string;
  aliases: string[];
  description?: string | null;
  task: string;
  domain: string;
  dataset_refs: ExperimentFoundationRef[];
  evaluation_protocol_candidate_refs: ExperimentFoundationRef[];
  community_refs: ExperimentFoundationRef[];
  source_refs: ExperimentFoundationRef[];
  source_traces: ExperimentAssetCandidateSourceTrace[];
  extraction_provenance_refs: ExperimentFoundationRef[];
  confidence_score: number;
  duplicate_check: ExperimentAssetCandidateDuplicateCheck;
  completeness_check: ExperimentAssetCandidateCompletenessCheck;
  policy_check: ExperimentAssetCandidatePolicyCheck;
  risk_assessment: ExperimentAssetCandidateRiskAssessment;
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  existing_canonical_refs: ExperimentFoundationRef[];
  candidate_hash: string;
  created_at: string;
  updated_at: string;
}

export interface BaselineAssetCandidate {
  baseline_asset_candidate_id: string;
  candidate_family: 'baseline';
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  canonical_name: string;
  aliases: string[];
  description?: string | null;
  baseline_family: ExperimentFoundationBaselineFamily;
  supported_benchmark_refs: ExperimentFoundationRef[];
  implementation_source_refs: ExperimentFoundationRef[];
  source_refs: ExperimentFoundationRef[];
  source_traces: ExperimentAssetCandidateSourceTrace[];
  extraction_provenance_refs: ExperimentFoundationRef[];
  confidence_score: number;
  duplicate_check: ExperimentAssetCandidateDuplicateCheck;
  completeness_check: ExperimentAssetCandidateCompletenessCheck;
  policy_check: ExperimentAssetCandidatePolicyCheck;
  risk_assessment: ExperimentAssetCandidateRiskAssessment;
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  existing_canonical_refs: ExperimentFoundationRef[];
  candidate_hash: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationProtocolCandidate {
  evaluation_protocol_candidate_id: string;
  candidate_family: 'evaluation_protocol';
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  canonical_name: string;
  aliases: string[];
  description?: string | null;
  benchmark_ref: ExperimentFoundationRef;
  protocol_version?: string | null;
  protocol_hash?: string | null;
  metric_definition_refs: ExperimentFoundationRef[];
  evaluator_refs: ExperimentFoundationRef[];
  protocol_summary: Record<string, unknown>;
  source_refs: ExperimentFoundationRef[];
  source_traces: ExperimentAssetCandidateSourceTrace[];
  extraction_provenance_refs: ExperimentFoundationRef[];
  confidence_score: number;
  duplicate_check: ExperimentAssetCandidateDuplicateCheck;
  completeness_check: ExperimentAssetCandidateCompletenessCheck;
  policy_check: ExperimentAssetCandidatePolicyCheck;
  risk_assessment: ExperimentAssetCandidateRiskAssessment;
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  existing_canonical_refs: ExperimentFoundationRef[];
  candidate_hash: string;
  created_at: string;
  updated_at: string;
}

export interface MethodComponentCandidate {
  method_component_candidate_id: string;
  candidate_family: 'method_component';
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  canonical_name: string;
  aliases: string[];
  description?: string | null;
  component_kind: ExperimentFoundationMethodRecipeComponentKind;
  version_label?: string | null;
  component_hash?: string | null;
  component_spec: Record<string, unknown>;
  source_refs: ExperimentFoundationRef[];
  source_traces: ExperimentAssetCandidateSourceTrace[];
  extraction_provenance_refs: ExperimentFoundationRef[];
  confidence_score: number;
  duplicate_check: ExperimentAssetCandidateDuplicateCheck;
  completeness_check: ExperimentAssetCandidateCompletenessCheck;
  policy_check: ExperimentAssetCandidatePolicyCheck;
  risk_assessment: ExperimentAssetCandidateRiskAssessment;
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  existing_canonical_refs: ExperimentFoundationRef[];
  candidate_hash: string;
  created_at: string;
  updated_at: string;
}

export interface BaseModelCandidate {
  base_model_candidate_id: string;
  candidate_family: 'base_model';
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  canonical_name: string;
  aliases: string[];
  description?: string | null;
  model_family: string;
  model_provider: string;
  model_ref: ExperimentFoundationRef;
  license: string;
  weight_access_policy: string;
  supported_task_types: string[];
  source_refs: ExperimentFoundationRef[];
  source_traces: ExperimentAssetCandidateSourceTrace[];
  extraction_provenance_refs: ExperimentFoundationRef[];
  confidence_score: number;
  duplicate_check: ExperimentAssetCandidateDuplicateCheck;
  completeness_check: ExperimentAssetCandidateCompletenessCheck;
  policy_check: ExperimentAssetCandidatePolicyCheck;
  risk_assessment: ExperimentAssetCandidateRiskAssessment;
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  existing_canonical_refs: ExperimentFoundationRef[];
  candidate_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ExperimentAssetCandidateTriageReport {
  triage_report_id: string;
  candidate_ref: ExperimentFoundationRef;
  candidate_hash: string;
  candidate_family: ExperimentFoundationAssetCandidateFamily;
  recommended_status: ExperimentFoundationAssetCandidateStatus;
  confidence_score: number;
  duplicate_status: ExperimentFoundationAssetCandidateDuplicateStatus;
  completeness_status: ExperimentFoundationAssetCandidateCompletenessStatus;
  policy_status: ExperimentFoundationAssetCandidatePolicyStatus;
  risk_level: ExperimentFoundationAssetCandidateRiskLevel;
  blockers: string[];
  warnings: string[];
  rule_trace_refs: ExperimentFoundationRef[];
  source_refs: ExperimentFoundationRef[];
  provenance_refs: ExperimentFoundationRef[];
  triage_hash: string;
  created_at: string;
}

export interface ExperimentAssetPromotionRequest {
  promotion_request_id: string;
  candidate_ref: ExperimentFoundationRef;
  candidate_hash: string;
  candidate_family: ExperimentFoundationAssetCandidateFamily;
  decision_kind: ExperimentFoundationAssetPromotionDecisionKind;
  candidate_status: ExperimentFoundationAssetCandidateStatus;
  confidence_score: number;
  duplicate_status: ExperimentFoundationAssetCandidateDuplicateStatus;
  completeness_status: ExperimentFoundationAssetCandidateCompletenessStatus;
  policy_status: ExperimentFoundationAssetCandidatePolicyStatus;
  risk_level: ExperimentFoundationAssetCandidateRiskLevel;
  source_refs: ExperimentFoundationRef[];
  provenance_refs: ExperimentFoundationRef[];
  deterministic_rule_trace_refs: ExperimentFoundationRef[];
  required_version_refs: ExperimentFoundationRef[];
  required_policy_refs: ExperimentFoundationRef[];
  required_protocol_refs: ExperimentFoundationRef[];
  triage_report_ref: ExperimentFoundationRef;
  triage_report_hash: string;
  reviewer_ref?: ExperimentFoundationRef | null;
  requested_by_ref: ExperimentFoundationRef;
  requested_at: string;
  request_hash: string;
}

export interface ExperimentAssetPromotionResult {
  promotion_result_id: string;
  promotion_request_id: string;
  candidate_ref: ExperimentFoundationRef;
  candidate_hash: string;
  candidate_family: ExperimentFoundationAssetCandidateFamily;
  result_status: ExperimentFoundationAssetPromotionResultStatus;
  canonical_asset_refs: ExperimentFoundationRef[];
  canonical_version_refs: ExperimentFoundationRef[];
  canonical_protocol_refs: ExperimentFoundationRef[];
  canonical_policy_refs: ExperimentFoundationRef[];
  blockers: string[];
  warnings: string[];
  source_refs: ExperimentFoundationRef[];
  provenance_refs: ExperimentFoundationRef[];
  promotion_hash: string;
  created_at: string;
}

export interface CreateExperimentFoundationRecordRequest {
  record_kind: ExperimentFoundationRecordKind;
  payload: Record<string, unknown>;
}

export interface ExperimentFoundationStoredRecord {
  id: string;
  record_kind: ExperimentFoundationRecordKind;
  record_id: string;
  record_hash?: string | null;
  status?: string | null;
  family?: string | null;
  parent_record_kind?: ExperimentFoundationRecordKind | null;
  parent_record_id?: string | null;
  owner_ref_type?: string | null;
  owner_ref_id?: string | null;
  payload: Record<string, unknown>;
  source_refs: ExperimentFoundationRef[];
  traceability_refs: ExperimentFoundationRef[];
  created_at: string;
  updated_at: string;
}

export interface ListExperimentFoundationRecordsResponse {
  records: ExperimentFoundationStoredRecord[];
  next_cursor?: string | null;
}

export interface ExperimentFoundationReadinessCheckRequest {
  target_ref: ExperimentFoundationRef;
  check_kind?: string | null;
  source_refs: ExperimentFoundationRef[];
}

export interface ListExperimentFoundationReadinessReportsResponse {
  reports: ExperimentFoundationReadinessCheckResponse[];
  next_cursor?: string | null;
}

export interface ExperimentFoundationReadinessCheckResponse {
  readiness_report_id: string;
  target_ref: ExperimentFoundationRef;
  readiness_status: ExperimentFoundationReadinessReportStatus;
  readiness_hash: string;
  blockers: string[];
  warnings: string[];
  required_actions: string[];
  source_refs: ExperimentFoundationRef[];
  checked_at: string;
  created_at: string;
}

export interface ExperimentFoundationPromotionDecisionRequest {
  promotion_request: ExperimentAssetPromotionRequest;
  promotion_result: ExperimentAssetPromotionResult;
}

export interface ExperimentFoundationPromotionDecisionResponse {
  promotion_request_record: ExperimentFoundationStoredRecord;
  promotion_result_record: ExperimentFoundationStoredRecord;
  candidate_record: ExperimentFoundationStoredRecord;
}

export interface SubmitExternalTrainingJobRequest {
  training_task_spec_ref: ExperimentFoundationRef;
  training_task_spec_hash: string;
  materialization_result_ref: ExperimentFoundationRef;
  materialization_result_hash: string;
  idempotency_key: string;
  requested_by_ref: ExperimentFoundationRef;
  source_refs: ExperimentFoundationRef[];
}

export interface ExternalTrainingJobResponse {
  external_job: ExternalTrainingJob;
}

export interface ListExternalTrainingJobsResponse {
  jobs: ExternalTrainingJob[];
  next_cursor?: string | null;
}

export interface SyncExternalTrainingJobRequest {
  source_refs: ExperimentFoundationRef[];
}

export interface CancelExternalTrainingJobRequest {
  requested_by_ref: ExperimentFoundationRef;
  reason: string;
  idempotency_key: string;
  source_refs: ExperimentFoundationRef[];
}

export interface CollectExternalTrainingJobRequest {
  source_refs: ExperimentFoundationRef[];
}

const stringId = { type: 'string', minLength: 1 } as const;
const relativePathString = {
  type: 'string',
  minLength: 1,
  pattern: '^(?!/)(?![A-Za-z]:)(?!.*(?:^|/)\\.\\.(?:/|$)).+$',
} as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const objectPayload = { type: 'object', additionalProperties: true } as const;
const nonEmptyObjectPayload = {
  type: 'object',
  minProperties: 1,
  additionalProperties: true,
} as const;
const metricValuePayload = {
  anyOf: [
    { type: 'number' },
    { type: 'string' },
    { type: 'boolean' },
    objectPayload,
    { type: 'null' },
  ],
} as const;
const nullableObjectPayload = {
  anyOf: [objectPayload, { type: 'null' }],
} as const;
const confidenceScore = { type: 'number', minimum: 0, maximum: 1 } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;
const forbiddenProperty = { not: {} } as const;
const platformPrivateForbiddenProperties = {
  platform_id: forbiddenProperty,
  provider: forbiddenProperty,
  region: forbiddenProperty,
  queue: forbiddenProperty,
  endpoint: forbiddenProperty,
  oss: forbiddenProperty,
  pai: forbiddenProperty,
  dlc: forbiddenProperty,
  aliyun: forbiddenProperty,
  k8s: forbiddenProperty,
  slurm: forbiddenProperty,
  access_key: forbiddenProperty,
  secret_key: forbiddenProperty,
  credentials: forbiddenProperty,
  sdk_payload: forbiddenProperty,
  adapter_metadata_ref: forbiddenProperty,
  adapter_metadata: forbiddenProperty,
  training_task_spec: forbiddenProperty,
  training_task_spec_id: forbiddenProperty,
  external_job_id: forbiddenProperty,
  job_id: forbiddenProperty,
  materialization_request_id: forbiddenProperty,
} as const;
const materializationPrivateForbiddenProperties = {
  provider: forbiddenProperty,
  region: forbiddenProperty,
  queue: forbiddenProperty,
  endpoint: forbiddenProperty,
  oss: forbiddenProperty,
  pai: forbiddenProperty,
  dlc: forbiddenProperty,
  aliyun: forbiddenProperty,
  k8s: forbiddenProperty,
  slurm: forbiddenProperty,
  access_key: forbiddenProperty,
  secret_key: forbiddenProperty,
  credentials: forbiddenProperty,
  sdk_payload: forbiddenProperty,
  adapter_metadata: forbiddenProperty,
  adapter_payload: forbiddenProperty,
  platform_payload: forbiddenProperty,
  platform_request: forbiddenProperty,
  platform_response: forbiddenProperty,
  external_job_id: forbiddenProperty,
  job_id: forbiddenProperty,
} as const;
const externalJobPrivateForbiddenProperties = {
  provider: forbiddenProperty,
  region: forbiddenProperty,
  queue: forbiddenProperty,
  endpoint: forbiddenProperty,
  oss: forbiddenProperty,
  pai: forbiddenProperty,
  dlc: forbiddenProperty,
  aliyun: forbiddenProperty,
  k8s: forbiddenProperty,
  slurm: forbiddenProperty,
  access_key: forbiddenProperty,
  secret_key: forbiddenProperty,
  credentials: forbiddenProperty,
  sdk_payload: forbiddenProperty,
  adapter_metadata: forbiddenProperty,
  adapter_payload: forbiddenProperty,
  platform_payload: forbiddenProperty,
  platform_request: forbiddenProperty,
  platform_response: forbiddenProperty,
  job_id: forbiddenProperty,
} as const;
const paperClaimForbiddenProperties = {
  claim_text: forbiddenProperty,
  paper_claim: forbiddenProperty,
  acceptance_status: forbiddenProperty,
  final_conclusion: forbiddenProperty,
  publication_ready_text: forbiddenProperty,
  publication_claim: forbiddenProperty,
} as const;
const rankingAndTableForbiddenProperties = {
  leaderboard_rank: forbiddenProperty,
  leaderboard_row: forbiddenProperty,
  leaderboard_rows: forbiddenProperty,
  leaderboard: forbiddenProperty,
  ranking: forbiddenProperty,
  rankings: forbiddenProperty,
  winner: forbiddenProperty,
  best_result: forbiddenProperty,
  final_table: forbiddenProperty,
  rendered_table: forbiddenProperty,
  markdown_table: forbiddenProperty,
  latex_table: forbiddenProperty,
} as const;
const sidecarFullDtoForbiddenProperties = {
  dataset_asset: forbiddenProperty,
  dataset_asset_dto: forbiddenProperty,
  dataset_version: forbiddenProperty,
  dataset_version_dto: forbiddenProperty,
  benchmark_asset: forbiddenProperty,
  benchmark_asset_dto: forbiddenProperty,
  baseline_asset: forbiddenProperty,
  baseline_asset_dto: forbiddenProperty,
  evaluation_protocol: forbiddenProperty,
  evaluation_protocol_dto: forbiddenProperty,
  run_recipe: forbiddenProperty,
  run_recipe_dto: forbiddenProperty,
  training_task_spec: forbiddenProperty,
  training_task_spec_dto: forbiddenProperty,
  materialization_result: forbiddenProperty,
  materialization_result_dto: forbiddenProperty,
  experiment_result: forbiddenProperty,
  experiment_result_dto: forbiddenProperty,
  fine_tuning_result: forbiddenProperty,
  fine_tuning_result_dto: forbiddenProperty,
  result: forbiddenProperty,
  result_dto: forbiddenProperty,
} as const;
const canonicalCandidateLifecycleForbiddenProperties = {
  candidate_status: forbiddenProperty,
  candidate_family: forbiddenProperty,
  candidate_ref: forbiddenProperty,
  candidate_hash: forbiddenProperty,
  candidate_review_status: forbiddenProperty,
  promotion_request_id: forbiddenProperty,
  promotion_result_id: forbiddenProperty,
} as const;
const candidateBoundaryForbiddenProperties = {
  catalog_status: forbiddenProperty,
  candidate_status_on_asset: forbiddenProperty,
  run_recipe: forbiddenProperty,
  run_recipe_id: forbiddenProperty,
  training_task_spec: forbiddenProperty,
  training_task_spec_id: forbiddenProperty,
  materialize: forbiddenProperty,
  submit: forbiddenProperty,
  experiment_result: forbiddenProperty,
  fine_tuning_result: forbiddenProperty,
  result_validation_report: forbiddenProperty,
  evidence_candidate: forbiddenProperty,
  paper_experiment_sidecar: forbiddenProperty,
  claim_text: forbiddenProperty,
  paper_claim: forbiddenProperty,
  acceptance_status: forbiddenProperty,
  final_conclusion: forbiddenProperty,
  publication_ready_text: forbiddenProperty,
  publication_claim: forbiddenProperty,
  dataset_asset: forbiddenProperty,
  dataset_asset_dto: forbiddenProperty,
  dataset_version: forbiddenProperty,
  dataset_version_dto: forbiddenProperty,
  benchmark_asset: forbiddenProperty,
  benchmark_asset_dto: forbiddenProperty,
  baseline_asset: forbiddenProperty,
  baseline_asset_dto: forbiddenProperty,
  evaluation_protocol: forbiddenProperty,
  evaluation_protocol_dto: forbiddenProperty,
  method_recipe_component: forbiddenProperty,
  method_recipe_component_dto: forbiddenProperty,
  method_component: forbiddenProperty,
  method_component_dto: forbiddenProperty,
  base_model_asset: forbiddenProperty,
  base_model_asset_dto: forbiddenProperty,
  run_recipe_dto: forbiddenProperty,
  training_task_spec_dto: forbiddenProperty,
  materialization_result: forbiddenProperty,
  materialization_result_dto: forbiddenProperty,
  experiment_result_dto: forbiddenProperty,
  fine_tuning_result_dto: forbiddenProperty,
  result: forbiddenProperty,
  result_dto: forbiddenProperty,
} as const;
const nullableNonNegativeInteger = {
  anyOf: [nonNegativeInteger, { type: 'null' }],
} as const;

export const experimentFoundationRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_type', 'ref_id'],
  properties: {
    ref_type: stringId,
    ref_id: stringId,
    version_id: nullableStringId,
    label: nullableStringId,
  },
} as const;

export const experimentFoundationStorageRootRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storage_root_ref_id', 'root_key', 'root_kind'],
  properties: {
    storage_root_ref_id: stringId,
    root_key: stringId,
    root_label: nullableStringId,
    root_kind: { enum: [...EXPERIMENT_FOUNDATION_STORAGE_ROOT_KINDS] },
    policy_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
  },
} as const;

export const experimentFoundationLocalFileRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['storage_root_ref_id', 'relative_path', 'file_kind'],
  properties: {
    storage_root_ref_id: stringId,
    relative_path: relativePathString,
    file_kind: { enum: [...EXPERIMENT_FOUNDATION_LOCAL_FILE_KINDS] },
    expected_checksum_hash: nullableStringId,
    byte_size: nullableNonNegativeInteger,
  },
} as const;

export const experimentFoundationDatasetRemoteRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['provider', 'ref_kind', 'ref_value'],
  properties: {
    provider: stringId,
    ref_kind: stringId,
    ref_value: stringId,
    region: nullableStringId,
  },
} as const;

export const experimentFoundationDatasetAssetSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset_asset_id',
    'name',
    'aliases',
    'source_refs',
    'task_types',
    'schema_summary',
    'catalog_status',
    'created_at',
    'updated_at',
  ],
  properties: {
    dataset_asset_id: stringId,
    name: stringId,
    aliases: stringArray,
    description: nullableStringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    task_types: stringArray,
    schema_summary: objectPayload,
    default_version_id: nullableStringId,
    catalog_status: { enum: [...EXPERIMENT_FOUNDATION_DATASET_CATALOG_STATUSES] },
    created_at: stringId,
    updated_at: stringId,
    version: forbiddenProperty,
    checksum: forbiddenProperty,
    storage_ref: forbiddenProperty,
    path: forbiddenProperty,
    uri: forbiddenProperty,
    location: forbiddenProperty,
    mirror: forbiddenProperty,
    ...canonicalCandidateLifecycleForbiddenProperties,
  },
} as const;

export const experimentFoundationDatasetVersionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset_version_id',
    'dataset_asset_id',
    'version_label',
    'checksum_manifest_id',
    'checksum_manifest_hash',
    'split_protocol_id',
    'split_protocol_hash',
    'data_policy_id',
    'data_policy_hash',
    'location_ids',
    'access_status',
    'readiness_status',
    'created_at',
    'updated_at',
  ],
  properties: {
    dataset_version_id: stringId,
    dataset_asset_id: stringId,
    version_label: stringId,
    checksum_manifest_id: stringId,
    checksum_manifest_hash: stringId,
    split_protocol_id: stringId,
    split_protocol_hash: stringId,
    data_policy_id: stringId,
    data_policy_hash: stringId,
    processing_recipe_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    location_ids: stringArray,
    access_status: { enum: [...EXPERIMENT_FOUNDATION_DATASET_ACCESS_STATUSES] },
    readiness_status: { enum: [...EXPERIMENT_FOUNDATION_DATASET_READINESS_STATUSES] },
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const experimentFoundationDatasetLocationSchema = {
  type: 'object',
  additionalProperties: false,
  anyOf: [
    {
      required: ['location_kind', 'storage_root_ref', 'local_file_ref'],
      properties: {
        location_kind: { enum: ['local_file', 'local_directory'] },
        storage_root_ref: experimentFoundationStorageRootRefSchema,
        local_file_ref: experimentFoundationLocalFileRefSchema,
      },
    },
    {
      required: ['location_kind', 'remote_ref'],
      properties: {
        location_kind: { enum: ['remote_object', 'external_reference'] },
        remote_ref: experimentFoundationDatasetRemoteRefSchema,
      },
    },
  ],
  required: [
    'dataset_location_id',
    'dataset_version_id',
    'location_kind',
    'availability_status',
  ],
  properties: {
    dataset_location_id: stringId,
    dataset_version_id: stringId,
    location_kind: { enum: [...EXPERIMENT_FOUNDATION_DATASET_LOCATION_KINDS] },
    storage_root_ref: { anyOf: [experimentFoundationStorageRootRefSchema, { type: 'null' }] },
    local_file_ref: { anyOf: [experimentFoundationLocalFileRefSchema, { type: 'null' }] },
    remote_ref: {
      anyOf: [experimentFoundationDatasetRemoteRefSchema, { type: 'null' }],
    },
    availability_status: {
      enum: [...EXPERIMENT_FOUNDATION_DATASET_LOCATION_AVAILABILITY_STATUSES],
    },
    last_checked_at: nullableStringId,
  },
} as const;

export const experimentFoundationDatasetMirrorSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset_mirror_id',
    'dataset_version_id',
    'mirror_role',
    'provider',
    'mirror_ref',
    'mirror_status',
    'source_checksum_manifest_hash',
    'freshness_status',
    'created_at',
    'updated_at',
  ],
  properties: {
    dataset_mirror_id: stringId,
    dataset_version_id: stringId,
    mirror_role: { enum: ['execution_mirror'] },
    provider: { enum: [...EXPERIMENT_FOUNDATION_MIRROR_PROVIDERS] },
    mirror_ref: experimentFoundationRefSchema,
    mirror_status: { enum: [...EXPERIMENT_FOUNDATION_MIRROR_STATUSES] },
    source_checksum_manifest_hash: stringId,
    freshness_status: { enum: [...EXPERIMENT_FOUNDATION_MIRROR_FRESHNESS_STATUSES] },
    approval_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    run_scope_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    created_at: stringId,
    updated_at: stringId,
    canonical: forbiddenProperty,
  },
} as const;

export const experimentFoundationChecksumManifestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'checksum_manifest_id',
    'dataset_version_id',
    'algorithm',
    'manifest_hash',
    'manifest_file_ref',
    'entry_count',
    'total_bytes',
    'created_at',
  ],
  properties: {
    checksum_manifest_id: stringId,
    dataset_version_id: stringId,
    algorithm: { enum: [...EXPERIMENT_FOUNDATION_CHECKSUM_ALGORITHMS] },
    manifest_hash: stringId,
    manifest_file_ref: experimentFoundationLocalFileRefSchema,
    entry_count: nonNegativeInteger,
    total_bytes: nonNegativeInteger,
    created_at: stringId,
  },
} as const;

export const experimentFoundationSplitProtocolSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'split_protocol_id',
    'dataset_version_id',
    'split_names',
    'split_file_refs',
    'generation_method',
    'protocol_hash',
    'created_at',
  ],
  properties: {
    split_protocol_id: stringId,
    dataset_version_id: stringId,
    split_names: stringArray,
    split_file_refs: { type: 'array', items: experimentFoundationLocalFileRefSchema },
    generation_method: stringId,
    seed: nullableNonNegativeInteger,
    protocol_hash: stringId,
    leakage_notes: nullableStringId,
    created_at: stringId,
  },
} as const;

export const experimentFoundationDataPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'data_policy_id',
    'license',
    'access_level',
    'privacy_level',
    'allowed_use_cases',
    'mirror_policy',
    'approval_refs',
    'policy_hash',
    'created_at',
  ],
  properties: {
    data_policy_id: stringId,
    license: stringId,
    access_level: { enum: [...EXPERIMENT_FOUNDATION_DATA_POLICY_ACCESS_LEVELS] },
    privacy_level: { enum: [...EXPERIMENT_FOUNDATION_DATA_POLICY_PRIVACY_LEVELS] },
    allowed_use_cases: stringArray,
    mirror_policy: { enum: [...EXPERIMENT_FOUNDATION_DATA_MIRROR_POLICIES] },
    approval_refs: { type: 'array', items: experimentFoundationRefSchema },
    policy_hash: stringId,
    retention_notes: nullableStringId,
    created_at: stringId,
  },
} as const;

export const experimentFoundationDatasetVersionLockSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset_asset_id',
    'dataset_version_id',
    'checksum_manifest_hash',
    'split_protocol_hash',
    'data_policy_id',
    'data_policy_hash',
    'locked_at',
    'source_refs',
  ],
  properties: {
    dataset_asset_id: stringId,
    dataset_version_id: stringId,
    checksum_manifest_hash: stringId,
    split_protocol_hash: stringId,
    data_policy_id: stringId,
    data_policy_hash: stringId,
    locked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    storage_path: forbiddenProperty,
    storage_ref: forbiddenProperty,
    path: forbiddenProperty,
    uri: forbiddenProperty,
    mirror_ref: forbiddenProperty,
    location_ref: forbiddenProperty,
  },
} as const;

export const experimentFoundationBenchmarkAssetSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'benchmark_asset_id',
    'name',
    'task',
    'domain',
    'dataset_version_refs',
    'default_evaluation_protocol_refs',
    'source_refs',
    'community_refs',
    'catalog_status',
    'verification_status',
    'created_at',
    'updated_at',
  ],
  properties: {
    benchmark_asset_id: stringId,
    name: stringId,
    description: nullableStringId,
    task: stringId,
    domain: stringId,
    dataset_version_refs: { type: 'array', items: experimentFoundationRefSchema },
    default_evaluation_protocol_refs: {
      type: 'array',
      items: experimentFoundationRefSchema,
    },
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    community_refs: { type: 'array', items: experimentFoundationRefSchema },
    catalog_status: { enum: [...EXPERIMENT_FOUNDATION_BENCHMARK_CATALOG_STATUSES] },
    verification_status: {
      enum: [...EXPERIMENT_FOUNDATION_BENCHMARK_VERIFICATION_STATUSES],
    },
    created_at: stringId,
    updated_at: stringId,
    metric_definitions: forbiddenProperty,
    metric_definition_refs: forbiddenProperty,
    metrics: forbiddenProperty,
    evaluator_refs: forbiddenProperty,
    evaluator_config: forbiddenProperty,
    reporting_protocol: forbiddenProperty,
    comparison_policy: forbiddenProperty,
    comparison_rules: forbiddenProperty,
    statistical_protocol: forbiddenProperty,
    statistical_policy: forbiddenProperty,
    budget_fairness_policy: forbiddenProperty,
    tuning_fairness_policy: forbiddenProperty,
    baseline_implementation_id: forbiddenProperty,
    baseline_implementation_ids: forbiddenProperty,
    baseline_implementation_ref: forbiddenProperty,
    baseline_implementation_refs: forbiddenProperty,
    baseline_implementation_version_id: forbiddenProperty,
    baseline_implementation_version_ids: forbiddenProperty,
    baseline_implementation_version_ref: forbiddenProperty,
    baseline_implementation_version_refs: forbiddenProperty,
    ...canonicalCandidateLifecycleForbiddenProperties,
  },
} as const;

export const experimentFoundationMetricDefinitionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'metric_definition_id',
    'metric_key',
    'name',
    'direction',
    'value_type',
    'validity_constraints',
    'created_at',
    'updated_at',
  ],
  properties: {
    metric_definition_id: stringId,
    metric_key: stringId,
    name: stringId,
    description: nullableStringId,
    direction: { enum: [...EXPERIMENT_FOUNDATION_METRIC_DIRECTIONS] },
    unit: nullableStringId,
    value_type: { enum: [...EXPERIMENT_FOUNDATION_METRIC_VALUE_TYPES] },
    evaluator_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    parser_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    validity_constraints: stringArray,
    created_at: stringId,
    updated_at: stringId,
  },
} as const;

export const experimentFoundationEvaluationProtocolSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evaluation_protocol_id',
    'benchmark_asset_id',
    'protocol_version',
    'protocol_hash',
    'metric_definition_refs',
    'evaluator_refs',
    'aggregation',
    'seed_policy',
    'repeat_policy',
    'reporting_protocol',
    'comparison_policy',
    'statistical_protocol',
    'budget_fairness_policy',
    'tuning_fairness_policy',
    'created_at',
    'updated_at',
  ],
  properties: {
    evaluation_protocol_id: stringId,
    benchmark_asset_id: stringId,
    protocol_version: stringId,
    protocol_hash: stringId,
    metric_definition_refs: { type: 'array', items: experimentFoundationRefSchema },
    evaluator_refs: { type: 'array', items: experimentFoundationRefSchema },
    aggregation: objectPayload,
    seed_policy: objectPayload,
    repeat_policy: objectPayload,
    reporting_protocol: objectPayload,
    comparison_policy: objectPayload,
    statistical_protocol: objectPayload,
    budget_fairness_policy: objectPayload,
    tuning_fairness_policy: objectPayload,
    created_at: stringId,
    updated_at: stringId,
    ...canonicalCandidateLifecycleForbiddenProperties,
  },
} as const;

export const experimentFoundationBaselineAssetSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'baseline_asset_id',
    'name',
    'aliases',
    'baseline_family',
    'source_refs',
    'supported_benchmark_refs',
    'catalog_status',
    'created_at',
    'updated_at',
  ],
  properties: {
    baseline_asset_id: stringId,
    name: stringId,
    aliases: stringArray,
    description: nullableStringId,
    baseline_family: { enum: [...EXPERIMENT_FOUNDATION_BASELINE_FAMILIES] },
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    supported_benchmark_refs: { type: 'array', items: experimentFoundationRefSchema },
    recommended_use: nullableStringId,
    catalog_status: { enum: [...EXPERIMENT_FOUNDATION_BASELINE_CATALOG_STATUSES] },
    created_at: stringId,
    updated_at: stringId,
    code_ref: forbiddenProperty,
    commit_hash: forbiddenProperty,
    runtime_ref: forbiddenProperty,
    entrypoint: forbiddenProperty,
    default_params: forbiddenProperty,
    params: forbiddenProperty,
    baseline_set_id: forbiddenProperty,
    baseline_set_ids: forbiddenProperty,
    linked_protocol_id: forbiddenProperty,
    linked_protocol_ids: forbiddenProperty,
    protocol_id: forbiddenProperty,
    protocol_ids: forbiddenProperty,
    protocol_ref: forbiddenProperty,
    protocol_refs: forbiddenProperty,
    evaluation_protocol_id: forbiddenProperty,
    evaluation_protocol_ids: forbiddenProperty,
    evaluation_protocol_ref: forbiddenProperty,
    evaluation_protocol_refs: forbiddenProperty,
    supported_evaluation_protocol_refs: forbiddenProperty,
    default_evaluation_protocol_refs: forbiddenProperty,
    metric_definition_refs: forbiddenProperty,
    evaluator_refs: forbiddenProperty,
    reporting_protocol: forbiddenProperty,
    comparison_policy: forbiddenProperty,
    statistical_protocol: forbiddenProperty,
    budget_fairness_policy: forbiddenProperty,
    tuning_fairness_policy: forbiddenProperty,
    ...canonicalCandidateLifecycleForbiddenProperties,
  },
} as const;

export const experimentFoundationBaselineImplementationVersionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'baseline_implementation_version_id',
    'baseline_asset_id',
    'version_label',
    'implementation_hash',
    'code_ref',
    'commit_hash',
    'runtime_ref',
    'entrypoint',
    'default_params',
    'input_contract',
    'output_contract',
    'supported_benchmark_refs',
    'supported_evaluation_protocol_refs',
    'verification_status',
    'created_at',
    'updated_at',
  ],
  properties: {
    baseline_implementation_version_id: stringId,
    baseline_asset_id: stringId,
    version_label: stringId,
    implementation_hash: stringId,
    code_ref: experimentFoundationRefSchema,
    commit_hash: stringId,
    runtime_ref: experimentFoundationRefSchema,
    entrypoint: stringId,
    default_params: objectPayload,
    input_contract: objectPayload,
    output_contract: objectPayload,
    supported_benchmark_refs: { type: 'array', items: experimentFoundationRefSchema },
    supported_evaluation_protocol_refs: {
      type: 'array',
      items: experimentFoundationRefSchema,
    },
    verification_status: { enum: [...EXPERIMENT_FOUNDATION_BASELINE_VERIFICATION_STATUSES] },
    created_at: stringId,
    updated_at: stringId,
    baseline_set_id: forbiddenProperty,
    baseline_set_ids: forbiddenProperty,
  },
} as const;

export const experimentFoundationEvaluationProtocolLockSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evaluation_protocol_id',
    'benchmark_asset_id',
    'protocol_version',
    'protocol_hash',
    'metric_definition_refs',
    'locked_at',
    'source_refs',
  ],
  properties: {
    evaluation_protocol_id: stringId,
    benchmark_asset_id: stringId,
    protocol_version: stringId,
    protocol_hash: stringId,
    metric_definition_refs: { type: 'array', items: experimentFoundationRefSchema },
    locked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
  },
} as const;

export const experimentFoundationBaselineImplementationVersionLockSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'baseline_asset_id',
    'baseline_implementation_version_id',
    'version_label',
    'implementation_hash',
    'code_ref',
    'commit_hash',
    'runtime_ref',
    'runtime_hash',
    'entrypoint',
    'locked_at',
    'source_refs',
  ],
  properties: {
    baseline_asset_id: stringId,
    baseline_implementation_version_id: stringId,
    version_label: stringId,
    implementation_hash: stringId,
    code_ref: experimentFoundationRefSchema,
    commit_hash: stringId,
    runtime_ref: experimentFoundationRefSchema,
    runtime_hash: stringId,
    entrypoint: stringId,
    locked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    baseline_set_id: forbiddenProperty,
    baseline_set_ids: forbiddenProperty,
  },
} as const;

export const experimentFoundationReadinessSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readiness_report_id',
    'readiness_report_hash',
    'status',
    'checked_at',
    'source_refs',
    'blockers',
  ],
  properties: {
    readiness_report_id: stringId,
    readiness_report_hash: stringId,
    status: { enum: [...EXPERIMENT_FOUNDATION_READINESS_SNAPSHOT_STATUSES] },
    checked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    blockers: stringArray,
  },
} as const;

const experimentFoundationPassedReadinessSnapshotSchema = {
  ...experimentFoundationReadinessSnapshotSchema,
  properties: {
    ...experimentFoundationReadinessSnapshotSchema.properties,
    status: { enum: ['passed'] },
  },
} as const;

export const experimentFoundationMethodRecipeComponentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'method_recipe_component_id',
    'component_kind',
    'name',
    'version_label',
    'component_hash',
    'component_spec',
    'source_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    method_recipe_component_id: stringId,
    component_kind: { enum: [...EXPERIMENT_FOUNDATION_METHOD_RECIPE_COMPONENT_KINDS] },
    name: stringId,
    description: nullableStringId,
    version_label: stringId,
    component_hash: stringId,
    component_spec: objectPayload,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    created_at: stringId,
    updated_at: stringId,
    run_recipe_id: forbiddenProperty,
    training_task_spec_id: forbiddenProperty,
    external_job_id: forbiddenProperty,
    ...canonicalCandidateLifecycleForbiddenProperties,
  },
} as const;

export const experimentFoundationMethodRecipeComponentLockSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'method_recipe_component_id',
    'component_kind',
    'version_label',
    'component_hash',
    'locked_at',
    'source_refs',
  ],
  properties: {
    method_recipe_component_id: stringId,
    component_kind: { enum: [...EXPERIMENT_FOUNDATION_METHOD_RECIPE_COMPONENT_KINDS] },
    version_label: stringId,
    component_hash: stringId,
    locked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
  },
} as const;

export const experimentFoundationExternalLockRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_kind', 'ref', 'ref_hash'],
  properties: {
    ref_kind: { enum: [...EXPERIMENT_FOUNDATION_EXTERNAL_LOCK_REF_KINDS] },
    ref: experimentFoundationRefSchema,
    ref_hash: stringId,
  },
} as const;

export const experimentFoundationVersionLockSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'version_lock_id',
    'dataset_version_lock',
    'evaluation_protocol_lock',
    'baseline_implementation_locks',
    'method_component_locks',
    'external_lock_refs',
    'readiness_snapshot',
    'version_lock_hash',
    'locked_at',
    'source_refs',
  ],
  properties: {
    version_lock_id: stringId,
    dataset_version_lock: experimentFoundationDatasetVersionLockSchema,
    evaluation_protocol_lock: experimentFoundationEvaluationProtocolLockSchema,
    baseline_implementation_locks: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationBaselineImplementationVersionLockSchema,
    },
    method_component_locks: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationMethodRecipeComponentLockSchema,
    },
    external_lock_refs: {
      type: 'array',
      items: experimentFoundationExternalLockRefSchema,
    },
    readiness_snapshot: experimentFoundationPassedReadinessSnapshotSchema,
    version_lock_hash: stringId,
    locked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
  },
} as const;

export const experimentFoundationRecipeDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'recipe_draft_id',
    'source_refs',
    'candidate_dataset_refs',
    'candidate_benchmark_refs',
    'candidate_baseline_refs',
    'candidate_evaluation_protocol_refs',
    'method_component_refs',
    'draft_parameter_overrides',
    'missing_inputs',
    'draft_validation_warnings',
    'traceability_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    recipe_draft_id: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    candidate_dataset_refs: { type: 'array', items: experimentFoundationRefSchema },
    candidate_benchmark_refs: { type: 'array', items: experimentFoundationRefSchema },
    candidate_baseline_refs: { type: 'array', items: experimentFoundationRefSchema },
    candidate_evaluation_protocol_refs: {
      type: 'array',
      items: experimentFoundationRefSchema,
    },
    method_component_refs: { type: 'array', items: experimentFoundationRefSchema },
    draft_parameter_overrides: objectPayload,
    missing_inputs: stringArray,
    draft_validation_warnings: stringArray,
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    created_at: stringId,
    updated_at: stringId,
    run_recipe_id: forbiddenProperty,
    version_lock_id: forbiddenProperty,
    run_recipe_hash: forbiddenProperty,
    materialize: forbiddenProperty,
    submit: forbiddenProperty,
    ...platformPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationExecutionProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'profile_kind',
    'capability_requirements',
    'resource_classes',
    'supports_distributed',
    'long_running',
  ],
  anyOf: [
    {
      type: 'object',
      required: ['profile_kind'],
      properties: {
        profile_kind: { enum: ['standard_training', 'evaluation_only'] },
        fine_tuning_external_lock_refs: forbiddenProperty,
      },
    },
    {
      type: 'object',
      required: ['fine_tuning_external_lock_refs'],
      properties: {
        profile_kind: { enum: ['llm_fine_tuning'] },
        fine_tuning_external_lock_refs: {
          type: 'array',
          minItems: 1,
          items: experimentFoundationExternalLockRefSchema,
        },
      },
    },
  ],
  properties: {
    profile_kind: { enum: [...EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS] },
    capability_requirements: stringArray,
    resource_classes: stringArray,
    supports_distributed: { type: 'boolean' },
    long_running: { type: 'boolean' },
    fine_tuning_external_lock_refs: {
      type: 'array',
      items: experimentFoundationExternalLockRefSchema,
    },
    ...platformPrivateForbiddenProperties,
  },
} as const;

const fineTuningExternalLockRefsRequirement = {
  allOf: [
    {
      type: 'array',
      contains: {
        type: 'object',
        required: ['ref_kind'],
        properties: { ref_kind: { enum: ['base_model'] } },
      },
    },
    {
      type: 'array',
      contains: {
        type: 'object',
        required: ['ref_kind'],
        properties: { ref_kind: { enum: ['fine_tuning_dataset'] } },
      },
    },
    {
      type: 'array',
      contains: {
        type: 'object',
        required: ['ref_kind'],
        properties: { ref_kind: { enum: ['fine_tuning_strategy'] } },
      },
    },
  ],
} as const;

const fineTuningRunRecipeLockRequirement = {
  if: {
    type: 'object',
    required: ['execution_profile'],
    properties: {
      execution_profile: {
        type: 'object',
        required: ['profile_kind'],
        properties: {
          profile_kind: { enum: ['llm_fine_tuning'] },
        },
      },
    },
  },
  then: {
    type: 'object',
    required: ['version_lock'],
    properties: {
      version_lock: {
        type: 'object',
        required: ['external_lock_refs'],
        properties: {
          external_lock_refs: fineTuningExternalLockRefsRequirement,
        },
      },
    },
  },
} as const;

export const experimentFoundationGenerateRunRecipeRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'generate_run_recipe_request_id',
    'recipe_draft_id',
    'version_lock',
    'resolved_params',
    'execution_profile',
    'config_snapshot_hash',
    'requested_by_ref',
    'created_at',
    'source_refs',
  ],
  allOf: [fineTuningRunRecipeLockRequirement],
  properties: {
    generate_run_recipe_request_id: stringId,
    recipe_draft_id: stringId,
    version_lock: experimentFoundationVersionLockSchema,
    resolved_params: objectPayload,
    execution_profile: experimentFoundationExecutionProfileSchema,
    config_snapshot_hash: stringId,
    requested_by_ref: experimentFoundationRefSchema,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    run_recipe_id: forbiddenProperty,
    materialize: forbiddenProperty,
    submit: forbiddenProperty,
    ...platformPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationRunRecipeSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_recipe_id',
    'recipe_draft_id',
    'version_lock',
    'version_lock_hash',
    'resolved_params',
    'execution_profile',
    'config_snapshot',
    'config_snapshot_hash',
    'readiness_snapshot',
    'run_recipe_hash',
    'locked_at',
    'source_refs',
    'traceability_refs',
  ],
  allOf: [fineTuningRunRecipeLockRequirement],
  properties: {
    run_recipe_id: stringId,
    recipe_draft_id: stringId,
    version_lock: experimentFoundationVersionLockSchema,
    version_lock_hash: stringId,
    resolved_params: objectPayload,
    execution_profile: experimentFoundationExecutionProfileSchema,
    config_snapshot: objectPayload,
    config_snapshot_hash: stringId,
    readiness_snapshot: experimentFoundationPassedReadinessSnapshotSchema,
    run_recipe_hash: stringId,
    locked_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...platformPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationTrainingPlatformRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'platform_id',
    'platform_kind',
    'adapter_kind',
    'adapter_version',
    'capability_refs',
  ],
  oneOf: [
    {
      type: 'object',
      required: ['platform_kind', 'adapter_kind'],
      properties: {
        platform_kind: { enum: ['local_script'] },
        adapter_kind: { enum: ['local_script'] },
      },
    },
    {
      type: 'object',
      required: ['platform_kind', 'adapter_kind'],
      properties: {
        platform_kind: { enum: ['aliyun_pai_dlc'] },
        adapter_kind: { enum: ['aliyun_pai_dlc'] },
      },
    },
  ],
  properties: {
    platform_id: stringId,
    platform_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_PLATFORM_KINDS] },
    adapter_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS] },
    adapter_version: stringId,
    capability_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationMaterializeTrainingTaskSpecRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'materialization_request_id',
    'run_recipe',
    'selected_platform',
    'adapter_version',
    'idempotency_key',
    'requested_by_ref',
    'created_at',
    'source_refs',
  ],
  properties: {
    materialization_request_id: stringId,
    run_recipe: experimentFoundationRunRecipeSchema,
    selected_platform: experimentFoundationTrainingPlatformRefSchema,
    adapter_version: stringId,
    idempotency_key: stringId,
    requested_by_ref: experimentFoundationRefSchema,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    materialize: forbiddenProperty,
    submit: forbiddenProperty,
    ...materializationPrivateForbiddenProperties,
  },
} as const;

const experimentFoundationBaseModelExternalLockRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_kind', 'ref', 'ref_hash'],
  properties: {
    ref_kind: { enum: ['base_model'] },
    ref: experimentFoundationRefSchema,
    ref_hash: stringId,
  },
} as const;

const experimentFoundationFineTuningDatasetExternalLockRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_kind', 'ref', 'ref_hash'],
  properties: {
    ref_kind: { enum: ['fine_tuning_dataset'] },
    ref: experimentFoundationRefSchema,
    ref_hash: stringId,
  },
} as const;

const experimentFoundationFineTuningStrategyExternalLockRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_kind', 'ref', 'ref_hash'],
  properties: {
    ref_kind: { enum: ['fine_tuning_strategy'] },
    ref: experimentFoundationRefSchema,
    ref_hash: stringId,
  },
} as const;

const experimentFoundationPromptTemplateExternalLockRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_kind', 'ref', 'ref_hash'],
  properties: {
    ref_kind: { enum: ['prompt_template'] },
    ref: experimentFoundationRefSchema,
    ref_hash: stringId,
  },
} as const;

const experimentFoundationContextPolicyExternalLockRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_kind', 'ref', 'ref_hash'],
  properties: {
    ref_kind: { enum: ['context_policy'] },
    ref: experimentFoundationRefSchema,
    ref_hash: stringId,
  },
} as const;

export const experimentFoundationFineTuningTaskProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'fine_tuning_profile_id',
    'base_model_ref',
    'fine_tuning_dataset_refs',
    'dataset_policy_refs',
    'dataset_policy_hashes',
    'fine_tuning_strategy_ref',
    'prompt_template_ref',
    'context_policy_ref',
    'training_config',
    'resource_budget',
    'evaluation_protocol_lock',
    'evaluation_protocol_ref',
    'output_artifact_contract',
    'source_refs',
  ],
  properties: {
    fine_tuning_profile_id: stringId,
    base_model_ref: experimentFoundationBaseModelExternalLockRefSchema,
    fine_tuning_dataset_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationFineTuningDatasetExternalLockRefSchema,
    },
    dataset_policy_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    dataset_policy_hashes: { type: 'array', minItems: 1, items: stringId },
    fine_tuning_strategy_ref: experimentFoundationFineTuningStrategyExternalLockRefSchema,
    prompt_template_ref: experimentFoundationPromptTemplateExternalLockRefSchema,
    context_policy_ref: experimentFoundationContextPolicyExternalLockRefSchema,
    training_config: nonEmptyObjectPayload,
    resource_budget: nonEmptyObjectPayload,
    evaluation_protocol_lock: experimentFoundationEvaluationProtocolLockSchema,
    evaluation_protocol_ref: experimentFoundationRefSchema,
    output_artifact_contract: nonEmptyObjectPayload,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationTrainingTaskSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'training_task_spec_id',
    'materialization_request_id',
    'run_recipe_id',
    'run_recipe_hash',
    'version_lock_hash',
    'profile_kind',
    'selected_platform',
    'runtime_ref',
    'runtime_hash',
    'command',
    'args',
    'env_refs',
    'input_refs',
    'output_contract',
    'resource_request',
    'timeout_seconds',
    'retry_policy',
    'auth_ref_names',
    'config_snapshot_hash',
    'created_at',
    'source_refs',
    'traceability_refs',
  ],
  allOf: [
    {
      if: {
        type: 'object',
        required: ['profile_kind'],
        properties: { profile_kind: { enum: ['llm_fine_tuning'] } },
      },
      then: {
        type: 'object',
        required: ['fine_tuning_profile'],
      },
      else: {
        type: 'object',
        properties: { fine_tuning_profile: forbiddenProperty },
      },
    },
  ],
  properties: {
    training_task_spec_id: stringId,
    materialization_request_id: stringId,
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    version_lock_hash: stringId,
    profile_kind: { enum: [...EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS] },
    selected_platform: experimentFoundationTrainingPlatformRefSchema,
    runtime_ref: experimentFoundationRefSchema,
    runtime_hash: stringId,
    command: stringId,
    args: stringArray,
    env_refs: { type: 'array', items: experimentFoundationRefSchema },
    input_refs: { type: 'array', items: experimentFoundationRefSchema },
    output_contract: nonEmptyObjectPayload,
    resource_request: nonEmptyObjectPayload,
    timeout_seconds: nonNegativeInteger,
    retry_policy: nonEmptyObjectPayload,
    auth_ref_names: stringArray,
    config_snapshot_hash: stringId,
    fine_tuning_profile: experimentFoundationFineTuningTaskProfileSchema,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationAdapterMetadataRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'adapter_metadata_ref_id',
    'adapter_kind',
    'adapter_version',
    'metadata_storage_ref',
    'metadata_hash',
    'schema_version',
    'created_at',
    'source_refs',
  ],
  properties: {
    adapter_metadata_ref_id: stringId,
    adapter_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS] },
    adapter_version: stringId,
    metadata_storage_ref: experimentFoundationRefSchema,
    metadata_hash: stringId,
    schema_version: stringId,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationTrainingTaskMaterializationResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'materialization_result_id',
    'materialization_request_id',
    'status',
    'materialization_hash',
    'idempotency_key',
    'blockers',
    'warnings',
    'traceability_refs',
    'event_refs',
    'created_at',
  ],
  allOf: [
    {
      if: {
        type: 'object',
        required: ['status'],
        properties: { status: { enum: ['materialized', 'partial'] } },
      },
      then: {
        type: 'object',
        required: [
          'training_task_spec_ref',
          'training_task_spec_hash',
          'adapter_metadata_ref',
          'adapter_metadata_hash',
        ],
      },
    },
    {
      if: {
        type: 'object',
        required: ['status'],
        properties: { status: { enum: ['blocked', 'failed'] } },
      },
      then: {
        type: 'object',
        properties: {
          blockers: { type: 'array', minItems: 1, items: stringId },
        },
      },
    },
  ],
  properties: {
    materialization_result_id: stringId,
    materialization_request_id: stringId,
    status: { enum: [...EXPERIMENT_FOUNDATION_TASK_MATERIALIZATION_STATUSES] },
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    adapter_metadata_ref: experimentFoundationAdapterMetadataRefSchema,
    adapter_metadata_hash: stringId,
    materialization_hash: stringId,
    idempotency_key: stringId,
    blockers: stringArray,
    warnings: stringArray,
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    event_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    created_at: stringId,
  },
} as const;

export const experimentFoundationTrainingTaskStageEventSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'stage_event_id',
    'event_kind',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'occurred_at',
    'source_refs',
    'traceability_refs',
  ],
  properties: {
    stage_event_id: stringId,
    event_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_TASK_STAGE_EVENT_KINDS] },
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    event_payload_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    event_payload_hash: nullableStringId,
    occurred_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationTrainingTaskCancellationRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'cancellation_request_id',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'requested_by_ref',
    'reason',
    'idempotency_key',
    'cancellation_status',
    'requested_at',
    'source_refs',
  ],
  properties: {
    cancellation_request_id: stringId,
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    requested_by_ref: experimentFoundationRefSchema,
    reason: stringId,
    idempotency_key: stringId,
    cancellation_status: {
      enum: [...EXPERIMENT_FOUNDATION_TRAINING_TASK_CANCELLATION_STATUSES],
    },
    requested_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationTrainingTaskPartialResultRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'partial_result_ref_id',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'result_kind',
    'artifact_ref',
    'artifact_hash',
    'produced_at',
    'source_refs',
  ],
  properties: {
    partial_result_ref_id: stringId,
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    result_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_TASK_PARTIAL_RESULT_KINDS] },
    artifact_ref: experimentFoundationRefSchema,
    artifact_hash: stringId,
    produced_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationExternalTrainingJobSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'external_job_id',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'materialization_result_ref',
    'materialization_result_hash',
    'adapter_kind',
    'adapter_version',
    'platform_ref',
    'idempotency_key',
    'external_job_ref',
    'external_job_hash',
    'job_status',
    'submitted_at',
    'stage_event_refs',
    'partial_result_refs',
    'result_refs',
    'adapter_metadata_refs',
    'adapter_metadata_hashes',
    'traceability_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    external_job_id: stringId,
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    materialization_result_ref: experimentFoundationRefSchema,
    materialization_result_hash: stringId,
    adapter_kind: { enum: [...EXPERIMENT_FOUNDATION_TRAINING_ADAPTER_KINDS] },
    adapter_version: stringId,
    platform_ref: experimentFoundationTrainingPlatformRefSchema,
    idempotency_key: stringId,
    external_job_ref: experimentFoundationRefSchema,
    external_job_hash: stringId,
    job_status: { enum: [...EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES] },
    submitted_at: stringId,
    last_synced_at: nullableStringId,
    completed_at: nullableStringId,
    stage_event_refs: { type: 'array', items: experimentFoundationRefSchema },
    partial_result_refs: { type: 'array', items: experimentFoundationRefSchema },
    result_refs: { type: 'array', items: experimentFoundationRefSchema },
    adapter_metadata_refs: { type: 'array', items: experimentFoundationRefSchema },
    adapter_metadata_hashes: { type: 'array', items: stringId },
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    created_at: stringId,
    updated_at: stringId,
    ...externalJobPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationResultMetricValueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metric_key', 'metric_definition_ref', 'value', 'value_type'],
  properties: {
    metric_key: stringId,
    metric_definition_ref: experimentFoundationRefSchema,
    value: metricValuePayload,
    value_type: { enum: [...EXPERIMENT_FOUNDATION_METRIC_VALUE_TYPES] },
    unit: nullableStringId,
    split_name: nullableStringId,
    aggregation: nullableObjectPayload,
    source_artifact_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    source_artifact_hash: nullableStringId,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationResultArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_artifact_id',
    'artifact_kind',
    'artifact_ref',
    'artifact_hash',
    'created_at',
    'source_refs',
  ],
  properties: {
    result_artifact_id: stringId,
    artifact_kind: { enum: [...EXPERIMENT_FOUNDATION_RESULT_ARTIFACT_KINDS] },
    artifact_ref: experimentFoundationRefSchema,
    artifact_hash: stringId,
    checksum_hash: nullableStringId,
    byte_size: nullableNonNegativeInteger,
    retention_policy_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationResultLogRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['log_ref', 'log_hash', 'log_kind', 'source_refs'],
  properties: {
    log_ref: experimentFoundationRefSchema,
    log_hash: stringId,
    log_kind: { enum: [...EXPERIMENT_FOUNDATION_RESULT_LOG_KINDS] },
    byte_size: nullableNonNegativeInteger,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
  },
} as const;

export const experimentFoundationExperimentResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'experiment_result_id',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'materialization_result_ref',
    'materialization_result_hash',
    'run_recipe_id',
    'run_recipe_hash',
    'version_lock_hash',
    'profile_kind',
    'metrics',
    'artifacts',
    'logs',
    'config_snapshot_hash',
    'partial_result_refs',
    'validation_report_refs',
    'provenance_refs',
    'result_hash',
    'created_at',
  ],
  properties: {
    experiment_result_id: stringId,
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    materialization_result_ref: experimentFoundationRefSchema,
    materialization_result_hash: stringId,
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    version_lock_hash: stringId,
    profile_kind: { enum: [...EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS] },
    external_job_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    external_job_hash: nullableStringId,
    metrics: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationResultMetricValueSchema,
    },
    artifacts: { type: 'array', items: experimentFoundationResultArtifactSchema },
    logs: { type: 'array', items: experimentFoundationResultLogRefSchema },
    config_snapshot_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    config_snapshot_hash: stringId,
    partial_result_refs: {
      type: 'array',
      items: experimentFoundationTrainingTaskPartialResultRefSchema,
    },
    validation_report_refs: { type: 'array', items: experimentFoundationRefSchema },
    provenance_refs: { type: 'array', items: experimentFoundationRefSchema },
    result_hash: stringId,
    created_at: stringId,
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationFineTuningResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'fine_tuning_result_id',
    'experiment_result_ref',
    'experiment_result_hash',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'run_recipe_id',
    'run_recipe_hash',
    'version_lock_hash',
    'base_model_ref',
    'fine_tuning_dataset_refs',
    'adapter_artifact_ref',
    'adapter_artifact_hash',
    'checkpoint_artifact_refs',
    'train_metrics',
    'eval_metrics',
    'training_curve_refs',
    'model_card_ref',
    'model_card_hash',
    'validation_status',
    'blockers',
    'traceability_refs',
    'result_hash',
    'created_at',
  ],
  properties: {
    fine_tuning_result_id: stringId,
    experiment_result_ref: experimentFoundationRefSchema,
    experiment_result_hash: stringId,
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    version_lock_hash: stringId,
    base_model_ref: experimentFoundationBaseModelExternalLockRefSchema,
    fine_tuning_dataset_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationFineTuningDatasetExternalLockRefSchema,
    },
    adapter_artifact_ref: experimentFoundationRefSchema,
    adapter_artifact_hash: stringId,
    checkpoint_artifact_refs: {
      type: 'array',
      items: experimentFoundationResultArtifactSchema,
    },
    merged_model_artifact_ref: {
      anyOf: [experimentFoundationRefSchema, { type: 'null' }],
    },
    merged_model_artifact_hash: nullableStringId,
    train_metrics: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationResultMetricValueSchema,
    },
    eval_metrics: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationResultMetricValueSchema,
    },
    training_curve_refs: {
      type: 'array',
      items: experimentFoundationResultArtifactSchema,
    },
    model_card_ref: experimentFoundationRefSchema,
    model_card_hash: stringId,
    validation_status: { enum: [...EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES] },
    blockers: stringArray,
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    result_hash: stringId,
    created_at: stringId,
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationResultValidationReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_validation_report_id',
    'source_result_ref',
    'source_result_hash',
    'validation_status',
    'evaluation_protocol_lock',
    'checked_metric_keys',
    'missing_metric_keys',
    'missing_artifact_kinds',
    'protocol_violations',
    'warnings',
    'generated_fact_refs',
    'validation_hash',
    'validated_at',
    'source_refs',
  ],
  allOf: [
    {
      if: {
        type: 'object',
        required: ['validation_status'],
        properties: { validation_status: { enum: ['accepted_partial'] } },
      },
      then: {
        type: 'object',
        required: ['partial_acceptance_ref'],
        properties: {
          partial_acceptance_ref: experimentFoundationRefSchema,
        },
      },
    },
  ],
  properties: {
    result_validation_report_id: stringId,
    source_result_ref: experimentFoundationRefSchema,
    source_result_hash: stringId,
    validation_status: { enum: [...EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES] },
    evaluation_protocol_lock: experimentFoundationEvaluationProtocolLockSchema,
    checked_metric_keys: stringArray,
    missing_metric_keys: stringArray,
    missing_artifact_kinds: stringArray,
    protocol_violations: stringArray,
    warnings: stringArray,
    generated_fact_refs: { type: 'array', items: experimentFoundationRefSchema },
    partial_acceptance_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    validation_hash: stringId,
    validated_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationEvaluationFactSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evaluation_fact_id',
    'fact_kind',
    'run_recipe_id',
    'run_recipe_hash',
    'result_ref',
    'result_hash',
    'evaluation_protocol_id',
    'evaluation_protocol_hash',
    'benchmark_asset_ref',
    'dataset_version_ref',
    'validation_report_ref',
    'validation_report_hash',
    'metric_observation_refs',
    'comparison_observation_refs',
    'artifact_refs',
    'fact_payload',
    'fact_hash',
    'created_at',
    'source_refs',
    'provenance_refs',
  ],
  properties: {
    evaluation_fact_id: stringId,
    fact_kind: { enum: [...EXPERIMENT_FOUNDATION_EVALUATION_FACT_KINDS] },
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    result_ref: experimentFoundationRefSchema,
    result_hash: stringId,
    evaluation_protocol_id: stringId,
    evaluation_protocol_hash: stringId,
    benchmark_asset_ref: experimentFoundationRefSchema,
    dataset_version_ref: experimentFoundationRefSchema,
    validation_report_ref: experimentFoundationRefSchema,
    validation_report_hash: stringId,
    metric_observation_refs: { type: 'array', items: experimentFoundationRefSchema },
    comparison_observation_refs: { type: 'array', items: experimentFoundationRefSchema },
    artifact_refs: { type: 'array', items: experimentFoundationRefSchema },
    fact_payload: nonEmptyObjectPayload,
    fact_hash: stringId,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    provenance_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationMetricObservationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'metric_observation_id',
    'metric_definition_ref',
    'metric_key',
    'value',
    'value_type',
    'direction',
    'run_recipe_id',
    'run_recipe_hash',
    'result_ref',
    'result_hash',
    'evaluation_protocol_id',
    'evaluation_protocol_hash',
    'benchmark_asset_ref',
    'dataset_version_ref',
    'validation_report_ref',
    'validation_report_hash',
    'observation_hash',
    'created_at',
    'source_refs',
  ],
  properties: {
    metric_observation_id: stringId,
    metric_definition_ref: experimentFoundationRefSchema,
    metric_key: stringId,
    value: metricValuePayload,
    value_type: { enum: [...EXPERIMENT_FOUNDATION_METRIC_VALUE_TYPES] },
    direction: { enum: [...EXPERIMENT_FOUNDATION_METRIC_DIRECTIONS] },
    unit: nullableStringId,
    split_name: nullableStringId,
    aggregation: nullableObjectPayload,
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    result_ref: experimentFoundationRefSchema,
    result_hash: stringId,
    evaluation_protocol_id: stringId,
    evaluation_protocol_hash: stringId,
    benchmark_asset_ref: experimentFoundationRefSchema,
    dataset_version_ref: experimentFoundationRefSchema,
    validation_report_ref: experimentFoundationRefSchema,
    validation_report_hash: stringId,
    observation_hash: stringId,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationComparisonObservationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'comparison_observation_id',
    'primary_metric_observation_ref',
    'primary_metric_observation_hash',
    'baseline_metric_observation_ref',
    'baseline_metric_observation_hash',
    'comparison_outcome',
    'run_recipe_id',
    'run_recipe_hash',
    'result_ref',
    'result_hash',
    'evaluation_protocol_id',
    'evaluation_protocol_hash',
    'benchmark_asset_ref',
    'validation_report_ref',
    'validation_report_hash',
    'observation_hash',
    'created_at',
    'source_refs',
  ],
  properties: {
    comparison_observation_id: stringId,
    primary_metric_observation_ref: experimentFoundationRefSchema,
    primary_metric_observation_hash: stringId,
    baseline_metric_observation_ref: experimentFoundationRefSchema,
    baseline_metric_observation_hash: stringId,
    comparison_outcome: { enum: [...EXPERIMENT_FOUNDATION_COMPARISON_OUTCOMES] },
    delta: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    relative_delta: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    result_ref: experimentFoundationRefSchema,
    result_hash: stringId,
    evaluation_protocol_id: stringId,
    evaluation_protocol_hash: stringId,
    benchmark_asset_ref: experimentFoundationRefSchema,
    baseline_asset_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    validation_report_ref: experimentFoundationRefSchema,
    validation_report_hash: stringId,
    observation_hash: stringId,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationImplementationDecisionSignalSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'implementation_decision_signal_id',
    'signal_kind',
    'reason_summary',
    'evaluation_fact_refs',
    'metric_observation_refs',
    'comparison_observation_refs',
    'run_recipe_ref',
    'run_recipe_hash',
    'created_by_ref',
    'created_at',
    'signal_hash',
    'source_refs',
  ],
  properties: {
    implementation_decision_signal_id: stringId,
    signal_kind: { enum: [...EXPERIMENT_FOUNDATION_IMPLEMENTATION_DECISION_SIGNALS] },
    reason_summary: stringId,
    evaluation_fact_refs: { type: 'array', items: experimentFoundationRefSchema },
    metric_observation_refs: { type: 'array', items: experimentFoundationRefSchema },
    comparison_observation_refs: { type: 'array', items: experimentFoundationRefSchema },
    run_recipe_ref: experimentFoundationRefSchema,
    run_recipe_hash: stringId,
    recipe_draft_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    proposal_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    trial_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    created_by_ref: experimentFoundationRefSchema,
    created_at: stringId,
    signal_hash: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationPaperTableFactSetSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'paper_table_fact_set_id',
    'paper_project_id',
    'title',
    'table_intent',
    'fact_refs',
    'fact_hashes',
    'metric_observation_refs',
    'metric_observation_hashes',
    'comparison_observation_refs',
    'comparison_observation_hashes',
    'validation_report_refs',
    'validation_report_hashes',
    'selection_criteria',
    'fact_set_hash',
    'created_at',
    'source_refs',
  ],
  properties: {
    paper_table_fact_set_id: stringId,
    paper_project_id: stringId,
    title: stringId,
    table_intent: stringId,
    fact_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    fact_hashes: { type: 'array', minItems: 1, items: stringId },
    metric_observation_refs: { type: 'array', items: experimentFoundationRefSchema },
    metric_observation_hashes: { type: 'array', items: stringId },
    comparison_observation_refs: { type: 'array', items: experimentFoundationRefSchema },
    comparison_observation_hashes: { type: 'array', items: stringId },
    validation_report_refs: { type: 'array', items: experimentFoundationRefSchema },
    validation_report_hashes: { type: 'array', items: stringId },
    selection_criteria: nonEmptyObjectPayload,
    fact_set_hash: stringId,
    created_at: stringId,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationEvidenceCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_candidate_id',
    'evidence_status',
    'validation_status',
    'source_result_refs',
    'source_result_hashes',
    'validation_report_refs',
    'validation_report_hashes',
    'run_recipe_id',
    'run_recipe_hash',
    'version_lock_hash',
    'evaluation_protocol_id',
    'evaluation_protocol_hash',
    'metric_observation_refs',
    'metric_observation_hashes',
    'artifact_refs',
    'caveats',
    'blockers',
    'provenance_refs',
    'review_refs',
    'created_by_ref',
    'created_at',
    'evidence_hash',
  ],
  properties: {
    evidence_candidate_id: stringId,
    evidence_status: { enum: [...EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_STATUSES] },
    validation_status: { enum: ['valid', 'accepted_partial'] },
    source_result_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    source_result_hashes: { type: 'array', minItems: 1, items: stringId },
    validation_report_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    validation_report_hashes: { type: 'array', minItems: 1, items: stringId },
    run_recipe_id: stringId,
    run_recipe_hash: stringId,
    version_lock_hash: stringId,
    evaluation_protocol_id: stringId,
    evaluation_protocol_hash: stringId,
    metric_observation_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    metric_observation_hashes: { type: 'array', minItems: 1, items: stringId },
    artifact_refs: { type: 'array', items: experimentFoundationRefSchema },
    caveats: stringArray,
    blockers: stringArray,
    provenance_refs: { type: 'array', items: experimentFoundationRefSchema },
    review_refs: { type: 'array', items: experimentFoundationRefSchema },
    created_by_ref: experimentFoundationRefSchema,
    created_at: stringId,
    evidence_hash: stringId,
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
  },
} as const;

export const experimentFoundationPaperExperimentSidecarSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'paper_experiment_sidecar_id',
    'paper_project_id',
    'sidecar_status',
    'run_recipe_ref',
    'run_recipe_hash',
    'version_lock_hash',
    'version_lock_snapshot_refs',
    'dataset_version_lock_ref',
    'dataset_version_lock_hash',
    'evaluation_protocol_lock_ref',
    'evaluation_protocol_hash',
    'benchmark_asset_ref',
    'baseline_implementation_lock_refs',
    'baseline_implementation_hashes',
    'method_component_lock_refs',
    'method_component_hashes',
    'training_task_spec_ref',
    'training_task_spec_hash',
    'materialization_result_ref',
    'materialization_result_hash',
    'adapter_metadata_refs',
    'adapter_metadata_hashes',
    'stage_event_refs',
    'cancellation_request_refs',
    'partial_result_refs',
    'result_refs',
    'result_hashes',
    'validation_report_refs',
    'validation_report_hashes',
    'evaluation_fact_refs',
    'evaluation_fact_hashes',
    'evidence_candidate_refs',
    'evidence_candidate_hashes',
    'paper_table_fact_set_refs',
    'paper_table_fact_set_hashes',
    'status_snapshot_refs',
    'event_log_refs',
    'provenance_refs',
    'sidecar_hash',
    'created_at',
    'updated_at',
  ],
  properties: {
    paper_experiment_sidecar_id: stringId,
    paper_project_id: stringId,
    sidecar_status: { enum: [...EXPERIMENT_FOUNDATION_PAPER_SIDECAR_STATUSES] },
    run_recipe_ref: experimentFoundationRefSchema,
    run_recipe_hash: stringId,
    version_lock_hash: stringId,
    version_lock_snapshot_refs: { type: 'array', items: experimentFoundationRefSchema },
    dataset_version_lock_ref: experimentFoundationRefSchema,
    dataset_version_lock_hash: stringId,
    evaluation_protocol_lock_ref: experimentFoundationRefSchema,
    evaluation_protocol_hash: stringId,
    benchmark_asset_ref: experimentFoundationRefSchema,
    baseline_implementation_lock_refs: {
      type: 'array',
      items: experimentFoundationRefSchema,
    },
    baseline_implementation_hashes: { type: 'array', items: stringId },
    method_component_lock_refs: { type: 'array', items: experimentFoundationRefSchema },
    method_component_hashes: { type: 'array', items: stringId },
    training_task_spec_ref: experimentFoundationRefSchema,
    training_task_spec_hash: stringId,
    materialization_result_ref: experimentFoundationRefSchema,
    materialization_result_hash: stringId,
    adapter_metadata_refs: { type: 'array', items: experimentFoundationRefSchema },
    adapter_metadata_hashes: { type: 'array', items: stringId },
    external_job_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    external_job_hash: nullableStringId,
    stage_event_refs: { type: 'array', items: experimentFoundationRefSchema },
    cancellation_request_refs: { type: 'array', items: experimentFoundationRefSchema },
    partial_result_refs: { type: 'array', items: experimentFoundationRefSchema },
    result_refs: { type: 'array', items: experimentFoundationRefSchema },
    result_hashes: { type: 'array', items: stringId },
    validation_report_refs: { type: 'array', items: experimentFoundationRefSchema },
    validation_report_hashes: { type: 'array', items: stringId },
    evaluation_fact_refs: { type: 'array', items: experimentFoundationRefSchema },
    evaluation_fact_hashes: { type: 'array', items: stringId },
    evidence_candidate_refs: { type: 'array', items: experimentFoundationRefSchema },
    evidence_candidate_hashes: { type: 'array', items: stringId },
    paper_table_fact_set_refs: { type: 'array', items: experimentFoundationRefSchema },
    paper_table_fact_set_hashes: { type: 'array', items: stringId },
    status_snapshot_refs: { type: 'array', items: experimentFoundationRefSchema },
    event_log_refs: { type: 'array', items: experimentFoundationRefSchema },
    provenance_refs: { type: 'array', items: experimentFoundationRefSchema },
    sidecar_hash: stringId,
    created_at: stringId,
    updated_at: stringId,
    ...materializationPrivateForbiddenProperties,
    ...paperClaimForbiddenProperties,
    ...rankingAndTableForbiddenProperties,
    ...sidecarFullDtoForbiddenProperties,
  },
} as const;

export const experimentFoundationAssetCandidateSourceTraceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_trace_id',
    'source_kind',
    'source_ref',
    'evidence_locator_snapshot',
    'confidence_score',
    'created_at',
  ],
  properties: {
    source_trace_id: stringId,
    source_kind: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_SOURCE_KINDS] },
    source_ref: experimentFoundationRefSchema,
    extraction_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    evidence_locator_snapshot: objectPayload,
    confidence_score: confidenceScore,
    extracted_at: nullableStringId,
    created_at: stringId,
    ...candidateBoundaryForbiddenProperties,
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationAssetCandidateDuplicateCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'duplicate_check_id',
    'duplicate_status',
    'checked_refs',
    'possible_duplicate_refs',
    'rationale',
    'checked_at',
  ],
  properties: {
    duplicate_check_id: stringId,
    duplicate_status: {
      enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_DUPLICATE_STATUSES],
    },
    checked_refs: { type: 'array', items: experimentFoundationRefSchema },
    possible_duplicate_refs: { type: 'array', items: experimentFoundationRefSchema },
    rationale: stringId,
    checked_at: stringId,
  },
} as const;

export const experimentFoundationAssetCandidateCompletenessCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'completeness_check_id',
    'completeness_status',
    'required_fields',
    'missing_fields',
    'checked_at',
  ],
  properties: {
    completeness_check_id: stringId,
    completeness_status: {
      enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_COMPLETENESS_STATUSES],
    },
    required_fields: stringArray,
    missing_fields: stringArray,
    checked_at: stringId,
  },
} as const;

export const experimentFoundationAssetCandidatePolicyCheckSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'policy_check_id',
    'policy_status',
    'license',
    'restricted_reasons',
    'checked_at',
  ],
  properties: {
    policy_check_id: stringId,
    policy_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_POLICY_STATUSES] },
    license: stringId,
    policy_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    policy_hash: nullableStringId,
    restricted_reasons: stringArray,
    checked_at: stringId,
  },
} as const;

export const experimentFoundationAssetCandidateRiskAssessmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'risk_assessment_id',
    'risk_level',
    'risk_reasons',
    'privacy_sensitive',
    'model_weight_sensitive',
    'requires_manual_review',
    'assessed_at',
  ],
  properties: {
    risk_assessment_id: stringId,
    risk_level: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_RISK_LEVELS] },
    risk_reasons: stringArray,
    privacy_sensitive: { type: 'boolean' },
    model_weight_sensitive: { type: 'boolean' },
    requires_manual_review: { type: 'boolean' },
    assessed_at: stringId,
  },
} as const;

export const experimentFoundationAssetCandidateRuleTraceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'rule_trace_id',
    'rule_id',
    'rule_version',
    'outcome',
    'triggered_reasons',
    'trace_hash',
    'created_at',
  ],
  properties: {
    rule_trace_id: stringId,
    rule_id: stringId,
    rule_version: stringId,
    outcome: stringId,
    triggered_reasons: stringArray,
    trace_hash: stringId,
    created_at: stringId,
  },
} as const;

const experimentFoundationAssetCandidateCommonRequired = [
  'candidate_status',
  'canonical_name',
  'aliases',
  'source_refs',
  'source_traces',
  'extraction_provenance_refs',
  'confidence_score',
  'duplicate_check',
  'completeness_check',
  'policy_check',
  'risk_assessment',
  'deterministic_rule_trace_refs',
  'existing_canonical_refs',
  'candidate_hash',
  'created_at',
  'updated_at',
] as const;

const experimentFoundationAssetCandidateCommonProperties = {
  candidate_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES] },
  canonical_name: stringId,
  aliases: stringArray,
  description: nullableStringId,
  source_refs: {
    type: 'array',
    minItems: 1,
    items: experimentFoundationRefSchema,
  },
  source_traces: {
    type: 'array',
    minItems: 1,
    items: experimentFoundationAssetCandidateSourceTraceSchema,
  },
  extraction_provenance_refs: {
    type: 'array',
    minItems: 1,
    items: experimentFoundationRefSchema,
  },
  confidence_score: confidenceScore,
  duplicate_check: experimentFoundationAssetCandidateDuplicateCheckSchema,
  completeness_check: experimentFoundationAssetCandidateCompletenessCheckSchema,
  policy_check: experimentFoundationAssetCandidatePolicyCheckSchema,
  risk_assessment: experimentFoundationAssetCandidateRiskAssessmentSchema,
  deterministic_rule_trace_refs: {
    type: 'array',
    items: experimentFoundationRefSchema,
  },
  existing_canonical_refs: { type: 'array', items: experimentFoundationRefSchema },
  candidate_hash: stringId,
  created_at: stringId,
  updated_at: stringId,
  ...candidateBoundaryForbiddenProperties,
  ...materializationPrivateForbiddenProperties,
} as const;

export const experimentFoundationDatasetAssetCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dataset_asset_candidate_id',
    'candidate_family',
    'dataset_usage',
    'task_types',
    'schema_summary',
    'proposed_version_refs',
    'proposed_policy_refs',
    'proposed_location_refs',
    ...experimentFoundationAssetCandidateCommonRequired,
  ],
  properties: {
    dataset_asset_candidate_id: stringId,
    candidate_family: { enum: ['dataset'] },
    dataset_usage: { enum: [...EXPERIMENT_FOUNDATION_DATASET_CANDIDATE_USAGES] },
    task_types: stringArray,
    schema_summary: objectPayload,
    version_label: nullableStringId,
    proposed_version_refs: { type: 'array', items: experimentFoundationRefSchema },
    proposed_policy_refs: { type: 'array', items: experimentFoundationRefSchema },
    proposed_location_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...experimentFoundationAssetCandidateCommonProperties,
  },
} as const;

export const experimentFoundationBenchmarkAssetCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'benchmark_asset_candidate_id',
    'candidate_family',
    'task',
    'domain',
    'dataset_refs',
    'evaluation_protocol_candidate_refs',
    'community_refs',
    ...experimentFoundationAssetCandidateCommonRequired,
  ],
  properties: {
    benchmark_asset_candidate_id: stringId,
    candidate_family: { enum: ['benchmark'] },
    task: stringId,
    domain: stringId,
    dataset_refs: { type: 'array', items: experimentFoundationRefSchema },
    evaluation_protocol_candidate_refs: {
      type: 'array',
      items: experimentFoundationRefSchema,
    },
    community_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...experimentFoundationAssetCandidateCommonProperties,
  },
} as const;

export const experimentFoundationBaselineAssetCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'baseline_asset_candidate_id',
    'candidate_family',
    'baseline_family',
    'supported_benchmark_refs',
    'implementation_source_refs',
    ...experimentFoundationAssetCandidateCommonRequired,
  ],
  properties: {
    baseline_asset_candidate_id: stringId,
    candidate_family: { enum: ['baseline'] },
    baseline_family: { enum: [...EXPERIMENT_FOUNDATION_BASELINE_FAMILIES] },
    supported_benchmark_refs: { type: 'array', items: experimentFoundationRefSchema },
    implementation_source_refs: { type: 'array', items: experimentFoundationRefSchema },
    ...experimentFoundationAssetCandidateCommonProperties,
  },
} as const;

export const experimentFoundationEvaluationProtocolCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evaluation_protocol_candidate_id',
    'candidate_family',
    'benchmark_ref',
    'metric_definition_refs',
    'evaluator_refs',
    'protocol_summary',
    ...experimentFoundationAssetCandidateCommonRequired,
  ],
  properties: {
    evaluation_protocol_candidate_id: stringId,
    candidate_family: { enum: ['evaluation_protocol'] },
    benchmark_ref: experimentFoundationRefSchema,
    protocol_version: nullableStringId,
    protocol_hash: nullableStringId,
    metric_definition_refs: { type: 'array', items: experimentFoundationRefSchema },
    evaluator_refs: { type: 'array', items: experimentFoundationRefSchema },
    protocol_summary: objectPayload,
    ...experimentFoundationAssetCandidateCommonProperties,
  },
} as const;

export const experimentFoundationMethodComponentCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'method_component_candidate_id',
    'candidate_family',
    'component_kind',
    'component_spec',
    ...experimentFoundationAssetCandidateCommonRequired,
  ],
  properties: {
    method_component_candidate_id: stringId,
    candidate_family: { enum: ['method_component'] },
    component_kind: { enum: [...EXPERIMENT_FOUNDATION_METHOD_RECIPE_COMPONENT_KINDS] },
    version_label: nullableStringId,
    component_hash: nullableStringId,
    component_spec: objectPayload,
    ...experimentFoundationAssetCandidateCommonProperties,
  },
} as const;

export const experimentFoundationBaseModelCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'base_model_candidate_id',
    'candidate_family',
    'model_family',
    'model_provider',
    'model_ref',
    'license',
    'weight_access_policy',
    'supported_task_types',
    ...experimentFoundationAssetCandidateCommonRequired,
  ],
  properties: {
    base_model_candidate_id: stringId,
    candidate_family: { enum: ['base_model'] },
    model_family: stringId,
    model_provider: stringId,
    model_ref: experimentFoundationRefSchema,
    license: stringId,
    weight_access_policy: stringId,
    supported_task_types: stringArray,
    ...experimentFoundationAssetCandidateCommonProperties,
  },
} as const;

export const experimentFoundationAssetCandidateTriageReportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'triage_report_id',
    'candidate_ref',
    'candidate_hash',
    'candidate_family',
    'recommended_status',
    'confidence_score',
    'duplicate_status',
    'completeness_status',
    'policy_status',
    'risk_level',
    'blockers',
    'warnings',
    'rule_trace_refs',
    'source_refs',
    'provenance_refs',
    'triage_hash',
    'created_at',
  ],
  properties: {
    triage_report_id: stringId,
    candidate_ref: experimentFoundationRefSchema,
    candidate_hash: stringId,
    candidate_family: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES] },
    recommended_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES] },
    confidence_score: confidenceScore,
    duplicate_status: {
      enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_DUPLICATE_STATUSES],
    },
    completeness_status: {
      enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_COMPLETENESS_STATUSES],
    },
    policy_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_POLICY_STATUSES] },
    risk_level: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_RISK_LEVELS] },
    blockers: stringArray,
    warnings: stringArray,
    rule_trace_refs: { type: 'array', items: experimentFoundationRefSchema },
    source_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    provenance_refs: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationRefSchema,
    },
    triage_hash: stringId,
    created_at: stringId,
    ...candidateBoundaryForbiddenProperties,
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationAssetPromotionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_request_id',
    'candidate_ref',
    'candidate_hash',
    'candidate_family',
    'decision_kind',
    'candidate_status',
    'confidence_score',
    'duplicate_status',
    'completeness_status',
    'policy_status',
    'risk_level',
    'source_refs',
    'provenance_refs',
    'deterministic_rule_trace_refs',
    'required_version_refs',
    'required_policy_refs',
    'required_protocol_refs',
    'triage_report_ref',
    'triage_report_hash',
    'requested_by_ref',
    'requested_at',
    'request_hash',
  ],
  allOf: [
    {
      if: {
        type: 'object',
        required: ['decision_kind'],
        properties: { decision_kind: { enum: ['auto_promote'] } },
      },
      then: {
        type: 'object',
        properties: {
          candidate_status: { enum: ['ready_for_promotion'] },
          confidence_score: { type: 'number', minimum: 0.8, maximum: 1 },
          duplicate_status: { enum: ['no_duplicate'] },
          completeness_status: { enum: ['complete'] },
          policy_status: { enum: ['clear'] },
          risk_level: { enum: ['low'] },
          source_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          provenance_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          deterministic_rule_trace_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          required_version_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          required_policy_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
        },
      },
    },
    {
      if: {
        type: 'object',
        required: ['decision_kind'],
        properties: { decision_kind: { enum: ['manual_promote'] } },
      },
      then: {
        type: 'object',
        required: ['reviewer_ref'],
        properties: {
          reviewer_ref: experimentFoundationRefSchema,
        },
      },
    },
  ],
  properties: {
    promotion_request_id: stringId,
    candidate_ref: experimentFoundationRefSchema,
    candidate_hash: stringId,
    candidate_family: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES] },
    decision_kind: { enum: [...EXPERIMENT_FOUNDATION_ASSET_PROMOTION_DECISION_KINDS] },
    candidate_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_STATUSES] },
    confidence_score: confidenceScore,
    duplicate_status: {
      enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_DUPLICATE_STATUSES],
    },
    completeness_status: {
      enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_COMPLETENESS_STATUSES],
    },
    policy_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_POLICY_STATUSES] },
    risk_level: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_RISK_LEVELS] },
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    provenance_refs: { type: 'array', items: experimentFoundationRefSchema },
    deterministic_rule_trace_refs: { type: 'array', items: experimentFoundationRefSchema },
    required_version_refs: { type: 'array', items: experimentFoundationRefSchema },
    required_policy_refs: { type: 'array', items: experimentFoundationRefSchema },
    required_protocol_refs: { type: 'array', items: experimentFoundationRefSchema },
    triage_report_ref: experimentFoundationRefSchema,
    triage_report_hash: stringId,
    reviewer_ref: { anyOf: [experimentFoundationRefSchema, { type: 'null' }] },
    requested_by_ref: experimentFoundationRefSchema,
    requested_at: stringId,
    request_hash: stringId,
    ...candidateBoundaryForbiddenProperties,
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationAssetPromotionResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'promotion_result_id',
    'promotion_request_id',
    'candidate_ref',
    'candidate_hash',
    'candidate_family',
    'result_status',
    'canonical_asset_refs',
    'canonical_version_refs',
    'canonical_protocol_refs',
    'canonical_policy_refs',
    'blockers',
    'warnings',
    'source_refs',
    'provenance_refs',
    'promotion_hash',
    'created_at',
  ],
  allOf: [
    {
      if: {
        type: 'object',
        required: ['result_status'],
        properties: { result_status: { enum: ['promoted'] } },
      },
      then: {
        type: 'object',
        properties: {
          canonical_asset_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          canonical_version_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          canonical_protocol_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          canonical_policy_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          source_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
          provenance_refs: {
            type: 'array',
            minItems: 1,
            items: experimentFoundationRefSchema,
          },
        },
      },
    },
  ],
  properties: {
    promotion_result_id: stringId,
    promotion_request_id: stringId,
    candidate_ref: experimentFoundationRefSchema,
    candidate_hash: stringId,
    candidate_family: { enum: [...EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES] },
    result_status: { enum: [...EXPERIMENT_FOUNDATION_ASSET_PROMOTION_RESULT_STATUSES] },
    canonical_asset_refs: { type: 'array', items: experimentFoundationRefSchema },
    canonical_version_refs: { type: 'array', items: experimentFoundationRefSchema },
    canonical_protocol_refs: { type: 'array', items: experimentFoundationRefSchema },
    canonical_policy_refs: { type: 'array', items: experimentFoundationRefSchema },
    blockers: stringArray,
    warnings: stringArray,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    provenance_refs: { type: 'array', items: experimentFoundationRefSchema },
    promotion_hash: stringId,
    created_at: stringId,
    ...candidateBoundaryForbiddenProperties,
    ...sidecarFullDtoForbiddenProperties,
    ...materializationPrivateForbiddenProperties,
  },
} as const;

export const experimentFoundationRecordKindSchema = {
  enum: [...EXPERIMENT_FOUNDATION_RECORD_KINDS],
} as const;

export const createExperimentFoundationRecordRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['record_kind', 'payload'],
    properties: {
      record_kind: experimentFoundationRecordKindSchema,
      payload: objectPayload,
      canonical_payload: forbiddenProperty,
      domain_payload: forbiddenProperty,
      dto: forbiddenProperty,
    },
  },
} as const;

export const experimentFoundationStoredRecordSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'record_kind',
    'record_id',
    'payload',
    'source_refs',
    'traceability_refs',
    'created_at',
    'updated_at',
  ],
  properties: {
    id: stringId,
    record_kind: experimentFoundationRecordKindSchema,
    record_id: stringId,
    record_hash: nullableStringId,
    status: nullableStringId,
    family: nullableStringId,
    parent_record_kind: { anyOf: [experimentFoundationRecordKindSchema, { type: 'null' }] },
    parent_record_id: nullableStringId,
    owner_ref_type: nullableStringId,
    owner_ref_id: nullableStringId,
    payload: objectPayload,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    traceability_refs: { type: 'array', items: experimentFoundationRefSchema },
    created_at: stringId,
    updated_at: stringId,
    canonical_payload: forbiddenProperty,
    domain_payload: forbiddenProperty,
    dto: forbiddenProperty,
  },
} as const;

export const listExperimentFoundationRecordsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['records'],
  properties: {
    records: {
      type: 'array',
      items: experimentFoundationStoredRecordSchema,
    },
    next_cursor: nullableStringId,
  },
} as const;

export const experimentFoundationReadinessCheckRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['target_ref', 'source_refs'],
    properties: {
      target_ref: experimentFoundationRefSchema,
      check_kind: nullableStringId,
      source_refs: { type: 'array', items: experimentFoundationRefSchema },
    },
  },
} as const;

export const listExperimentFoundationReadinessReportsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      status: { enum: [...EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES] },
      target_kind: { enum: [...EXPERIMENT_FOUNDATION_RECORD_KINDS] },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      cursor: { type: 'string', minLength: 1 },
    },
  },
} as const;

export const experimentFoundationReadinessCheckResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readiness_report_id',
    'target_ref',
    'readiness_status',
    'readiness_hash',
    'blockers',
    'warnings',
    'required_actions',
    'source_refs',
    'checked_at',
    'created_at',
  ],
  properties: {
    readiness_report_id: stringId,
    target_ref: experimentFoundationRefSchema,
    readiness_status: {
      enum: [...EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES],
    },
    readiness_hash: stringId,
    blockers: stringArray,
    warnings: stringArray,
    required_actions: stringArray,
    source_refs: { type: 'array', items: experimentFoundationRefSchema },
    checked_at: stringId,
    created_at: stringId,
  },
} as const;

export const experimentFoundationPromotionDecisionRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['promotion_request', 'promotion_result'],
    properties: {
      promotion_request: experimentFoundationAssetPromotionRequestSchema,
      promotion_result: experimentFoundationAssetPromotionResultSchema,
    },
  },
} as const;

export const experimentFoundationPromotionDecisionResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['promotion_request_record', 'promotion_result_record', 'candidate_record'],
  properties: {
    promotion_request_record: experimentFoundationStoredRecordSchema,
    promotion_result_record: experimentFoundationStoredRecordSchema,
    candidate_record: experimentFoundationStoredRecordSchema,
  },
} as const;

export const submitExternalTrainingJobRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'training_task_spec_ref',
      'training_task_spec_hash',
      'materialization_result_ref',
      'materialization_result_hash',
      'idempotency_key',
      'requested_by_ref',
      'source_refs',
    ],
    properties: {
      training_task_spec_ref: experimentFoundationRefSchema,
      training_task_spec_hash: stringId,
      materialization_result_ref: experimentFoundationRefSchema,
      materialization_result_hash: stringId,
      idempotency_key: stringId,
      requested_by_ref: experimentFoundationRefSchema,
      source_refs: { type: 'array', items: experimentFoundationRefSchema },
      ...externalJobPrivateForbiddenProperties,
    },
  },
} as const;

export const externalTrainingJobResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['external_job'],
  properties: {
    external_job: experimentFoundationExternalTrainingJobSchema,
  },
} as const;

export const listExternalTrainingJobsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['jobs'],
  properties: {
    jobs: {
      type: 'array',
      items: experimentFoundationExternalTrainingJobSchema,
    },
    next_cursor: nullableStringId,
  },
} as const;

export const syncExternalTrainingJobRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['source_refs'],
    properties: {
      source_refs: { type: 'array', items: experimentFoundationRefSchema },
      ...externalJobPrivateForbiddenProperties,
    },
  },
} as const;

export const cancelExternalTrainingJobRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['requested_by_ref', 'reason', 'idempotency_key', 'source_refs'],
    properties: {
      requested_by_ref: experimentFoundationRefSchema,
      reason: stringId,
      idempotency_key: stringId,
      source_refs: { type: 'array', items: experimentFoundationRefSchema },
      ...externalJobPrivateForbiddenProperties,
    },
  },
} as const;

export const collectExternalTrainingJobRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['source_refs'],
    properties: {
      source_refs: { type: 'array', items: experimentFoundationRefSchema },
      ...externalJobPrivateForbiddenProperties,
    },
  },
} as const;
