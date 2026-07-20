import { randomUUID } from 'node:crypto';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import * as contracts from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import type {
  CreateExperimentFoundationRecordRequest,
  ExperimentAssetPromotionRequest,
  ExperimentAssetPromotionResult,
  ExperimentFoundationPromotionDecisionRequest,
  ExperimentFoundationPromotionDecisionResponse,
  ExperimentFoundationReadinessCheckRequest,
  ExperimentFoundationReadinessCheckResponse,
  ExperimentFoundationReadinessReportStatus,
  ExperimentFoundationRecordKind,
  ExperimentFoundationRef,
  ExperimentFoundationStoredRecord,
  ListExperimentFoundationReadinessReportsResponse,
  ListExperimentFoundationRecordsResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE } from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  ExperimentFoundationReadinessReportRecord,
  ExperimentFoundationRecordListFilter,
  ExperimentFoundationRepository,
} from '../repositories/experiment-foundation.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

type JsonSchema = Readonly<Record<string, unknown>>;
type JsonRecord = Record<string, unknown>;

type RecordKindConfig = {
  schema: JsonSchema;
  idFields: string[];
  hashFields: string[];
  statusFields?: string[];
  familyFields?: string[];
};

const RECORD_KIND_CONFIG: Record<ExperimentFoundationRecordKind, RecordKindConfig> = {
  dataset_asset: {
    schema: contracts.experimentFoundationDatasetAssetSchema,
    idFields: ['dataset_asset_id'],
    hashFields: [],
    statusFields: ['catalog_status'],
  },
  dataset_version: {
    schema: contracts.experimentFoundationDatasetVersionSchema,
    idFields: ['dataset_version_id'],
    hashFields: ['checksum_manifest_hash'],
    statusFields: ['readiness_status', 'access_status'],
  },
  dataset_location: {
    schema: contracts.experimentFoundationDatasetLocationSchema,
    idFields: ['dataset_location_id'],
    hashFields: [],
    statusFields: ['availability_status'],
  },
  dataset_mirror: {
    schema: contracts.experimentFoundationDatasetMirrorSchema,
    idFields: ['dataset_mirror_id'],
    hashFields: ['source_checksum_manifest_hash'],
    statusFields: ['mirror_status', 'freshness_status'],
  },
  checksum_manifest: {
    schema: contracts.experimentFoundationChecksumManifestSchema,
    idFields: ['checksum_manifest_id'],
    hashFields: ['manifest_hash'],
  },
  split_protocol: {
    schema: contracts.experimentFoundationSplitProtocolSchema,
    idFields: ['split_protocol_id'],
    hashFields: ['protocol_hash'],
  },
  data_policy: {
    schema: contracts.experimentFoundationDataPolicySchema,
    idFields: ['data_policy_id'],
    hashFields: ['policy_hash'],
    statusFields: ['access_level', 'privacy_level', 'mirror_policy'],
  },
  dataset_version_lock: {
    schema: contracts.experimentFoundationDatasetVersionLockSchema,
    idFields: ['dataset_version_id'],
    hashFields: ['checksum_manifest_hash', 'split_protocol_hash', 'data_policy_hash'],
  },
  benchmark_asset: {
    schema: contracts.experimentFoundationBenchmarkAssetSchema,
    idFields: ['benchmark_asset_id'],
    hashFields: [],
    statusFields: ['catalog_status', 'verification_status'],
  },
  metric_definition: {
    schema: contracts.experimentFoundationMetricDefinitionSchema,
    idFields: ['metric_definition_id'],
    hashFields: [],
  },
  evaluation_protocol: {
    schema: contracts.experimentFoundationEvaluationProtocolSchema,
    idFields: ['evaluation_protocol_id'],
    hashFields: ['protocol_hash'],
  },
  baseline_asset: {
    schema: contracts.experimentFoundationBaselineAssetSchema,
    idFields: ['baseline_asset_id'],
    hashFields: [],
    statusFields: ['catalog_status'],
    familyFields: ['baseline_family'],
  },
  baseline_implementation_version: {
    schema: contracts.experimentFoundationBaselineImplementationVersionSchema,
    idFields: ['baseline_implementation_version_id'],
    hashFields: ['implementation_hash'],
    statusFields: ['verification_status'],
  },
  evaluation_protocol_lock: {
    schema: contracts.experimentFoundationEvaluationProtocolLockSchema,
    idFields: ['evaluation_protocol_id'],
    hashFields: ['protocol_hash'],
  },
  baseline_implementation_version_lock: {
    schema: contracts.experimentFoundationBaselineImplementationVersionLockSchema,
    idFields: ['baseline_implementation_version_id'],
    hashFields: ['implementation_hash', 'runtime_hash'],
  },
  readiness_snapshot: {
    schema: contracts.experimentFoundationReadinessSnapshotSchema,
    idFields: ['readiness_report_id'],
    hashFields: ['readiness_report_hash'],
    statusFields: ['status'],
  },
  method_recipe_component: {
    schema: contracts.experimentFoundationMethodRecipeComponentSchema,
    idFields: ['method_recipe_component_id'],
    hashFields: ['component_hash'],
    familyFields: ['component_kind'],
  },
  method_recipe_component_lock: {
    schema: contracts.experimentFoundationMethodRecipeComponentLockSchema,
    idFields: ['method_recipe_component_id'],
    hashFields: ['component_hash'],
    familyFields: ['component_kind'],
  },
  external_lock_ref: {
    schema: contracts.experimentFoundationExternalLockRefSchema,
    idFields: ['ref_kind'],
    hashFields: ['ref_hash'],
    familyFields: ['ref_kind'],
  },
  version_lock: {
    schema: contracts.experimentFoundationVersionLockSchema,
    idFields: ['version_lock_id'],
    hashFields: ['version_lock_hash'],
  },
  recipe_draft: {
    schema: contracts.experimentFoundationRecipeDraftSchema,
    idFields: ['recipe_draft_id'],
    hashFields: [],
  },
  execution_profile: {
    schema: contracts.experimentFoundationExecutionProfileSchema,
    idFields: ['profile_kind'],
    hashFields: [],
    familyFields: ['profile_kind'],
  },
  generate_run_recipe_request: {
    schema: contracts.experimentFoundationGenerateRunRecipeRequestSchema,
    idFields: ['generate_run_recipe_request_id'],
    hashFields: ['config_snapshot_hash'],
  },
  run_recipe: {
    schema: contracts.experimentFoundationRunRecipeSchema,
    idFields: ['run_recipe_id'],
    hashFields: ['run_recipe_hash', 'version_lock_hash', 'config_snapshot_hash'],
  },
  training_platform_ref: {
    schema: contracts.experimentFoundationTrainingPlatformRefSchema,
    idFields: ['platform_id'],
    hashFields: [],
    familyFields: ['platform_kind', 'adapter_kind'],
  },
  materialize_training_task_spec_request: {
    schema: contracts.experimentFoundationMaterializeTrainingTaskSpecRequestSchema,
    idFields: ['materialization_request_id'],
    hashFields: [],
  },
  fine_tuning_task_profile: {
    schema: contracts.experimentFoundationFineTuningTaskProfileSchema,
    idFields: ['fine_tuning_profile_id'],
    hashFields: ['dataset_policy_hashes'],
    familyFields: ['profile_kind'],
  },
  training_task_spec: {
    schema: contracts.experimentFoundationTrainingTaskSpecSchema,
    idFields: ['training_task_spec_id'],
    hashFields: ['run_recipe_hash', 'version_lock_hash', 'runtime_hash', 'config_snapshot_hash'],
    familyFields: ['profile_kind'],
  },
  adapter_metadata_ref: {
    schema: contracts.experimentFoundationAdapterMetadataRefSchema,
    idFields: ['adapter_metadata_ref_id'],
    hashFields: ['metadata_hash'],
    familyFields: ['adapter_kind'],
  },
  training_task_materialization_result: {
    schema: contracts.experimentFoundationTrainingTaskMaterializationResultSchema,
    idFields: ['materialization_result_id'],
    hashFields: ['materialization_hash', 'training_task_spec_hash', 'adapter_metadata_hash'],
    statusFields: ['status'],
  },
  training_task_stage_event: {
    schema: contracts.experimentFoundationTrainingTaskStageEventSchema,
    idFields: ['stage_event_id'],
    hashFields: ['training_task_spec_hash', 'event_payload_hash'],
    statusFields: ['event_kind'],
  },
  training_task_cancellation_request: {
    schema: contracts.experimentFoundationTrainingTaskCancellationRequestSchema,
    idFields: ['cancellation_request_id'],
    hashFields: ['training_task_spec_hash'],
    statusFields: ['cancellation_status'],
  },
  training_task_partial_result_ref: {
    schema: contracts.experimentFoundationTrainingTaskPartialResultRefSchema,
    idFields: ['partial_result_ref_id'],
    hashFields: ['training_task_spec_hash', 'artifact_hash'],
    familyFields: ['result_kind'],
  },
  experiment_result: {
    schema: contracts.experimentFoundationExperimentResultSchema,
    idFields: ['experiment_result_id'],
    hashFields: ['result_hash', 'run_recipe_hash', 'version_lock_hash'],
    familyFields: ['profile_kind'],
  },
  fine_tuning_result: {
    schema: contracts.experimentFoundationFineTuningResultSchema,
    idFields: ['fine_tuning_result_id'],
    hashFields: ['result_hash', 'run_recipe_hash', 'version_lock_hash'],
    statusFields: ['validation_status'],
  },
  result_validation_report: {
    schema: contracts.experimentFoundationResultValidationReportSchema,
    idFields: ['result_validation_report_id'],
    hashFields: ['validation_hash', 'source_result_hash'],
    statusFields: ['validation_status'],
  },
  evaluation_fact: {
    schema: contracts.experimentFoundationEvaluationFactSchema,
    idFields: ['evaluation_fact_id'],
    hashFields: ['fact_hash', 'result_hash', 'evaluation_protocol_hash'],
    familyFields: ['fact_kind'],
  },
  metric_observation: {
    schema: contracts.experimentFoundationMetricObservationSchema,
    idFields: ['metric_observation_id'],
    hashFields: ['observation_hash', 'result_hash', 'evaluation_protocol_hash'],
  },
  comparison_observation: {
    schema: contracts.experimentFoundationComparisonObservationSchema,
    idFields: ['comparison_observation_id'],
    hashFields: ['observation_hash', 'result_hash', 'evaluation_protocol_hash'],
    statusFields: ['comparison_outcome'],
  },
  implementation_decision_signal: {
    schema: contracts.experimentFoundationImplementationDecisionSignalSchema,
    idFields: ['implementation_decision_signal_id'],
    hashFields: ['signal_hash', 'run_recipe_hash'],
    statusFields: ['signal_kind'],
  },
  paper_table_fact_set: {
    schema: contracts.experimentFoundationPaperTableFactSetSchema,
    idFields: ['paper_table_fact_set_id'],
    hashFields: ['fact_set_hash'],
  },
  evidence_candidate: {
    schema: contracts.experimentFoundationEvidenceCandidateSchema,
    idFields: ['evidence_candidate_id'],
    hashFields: ['evidence_hash', 'run_recipe_hash', 'version_lock_hash'],
    statusFields: ['evidence_status', 'validation_status'],
  },
  paper_experiment_sidecar: {
    schema: contracts.experimentFoundationPaperExperimentSidecarSchema,
    idFields: ['paper_experiment_sidecar_id'],
    hashFields: ['sidecar_hash', 'run_recipe_hash', 'version_lock_hash'],
    statusFields: ['sidecar_status'],
  },
  asset_candidate_source_trace: {
    schema: contracts.experimentFoundationAssetCandidateSourceTraceSchema,
    idFields: ['source_trace_id'],
    hashFields: [],
    familyFields: ['source_kind'],
  },
  asset_candidate_duplicate_check: {
    schema: contracts.experimentFoundationAssetCandidateDuplicateCheckSchema,
    idFields: ['duplicate_check_id'],
    hashFields: [],
    statusFields: ['duplicate_status'],
  },
  asset_candidate_completeness_check: {
    schema: contracts.experimentFoundationAssetCandidateCompletenessCheckSchema,
    idFields: ['completeness_check_id'],
    hashFields: [],
    statusFields: ['completeness_status'],
  },
  asset_candidate_policy_check: {
    schema: contracts.experimentFoundationAssetCandidatePolicyCheckSchema,
    idFields: ['policy_check_id'],
    hashFields: ['policy_hash'],
    statusFields: ['policy_status'],
  },
  asset_candidate_risk_assessment: {
    schema: contracts.experimentFoundationAssetCandidateRiskAssessmentSchema,
    idFields: ['risk_assessment_id'],
    hashFields: [],
    statusFields: ['risk_level'],
  },
  asset_candidate_rule_trace: {
    schema: contracts.experimentFoundationAssetCandidateRuleTraceSchema,
    idFields: ['rule_trace_id'],
    hashFields: ['trace_hash'],
  },
  dataset_asset_candidate: {
    schema: contracts.experimentFoundationDatasetAssetCandidateSchema,
    idFields: ['dataset_asset_candidate_id'],
    hashFields: ['candidate_hash'],
    statusFields: ['candidate_status'],
    familyFields: ['candidate_family', 'dataset_usage'],
  },
  benchmark_asset_candidate: {
    schema: contracts.experimentFoundationBenchmarkAssetCandidateSchema,
    idFields: ['benchmark_asset_candidate_id'],
    hashFields: ['candidate_hash'],
    statusFields: ['candidate_status'],
    familyFields: ['candidate_family'],
  },
  baseline_asset_candidate: {
    schema: contracts.experimentFoundationBaselineAssetCandidateSchema,
    idFields: ['baseline_asset_candidate_id'],
    hashFields: ['candidate_hash'],
    statusFields: ['candidate_status'],
    familyFields: ['candidate_family', 'baseline_family'],
  },
  evaluation_protocol_candidate: {
    schema: contracts.experimentFoundationEvaluationProtocolCandidateSchema,
    idFields: ['evaluation_protocol_candidate_id'],
    hashFields: ['candidate_hash', 'protocol_hash'],
    statusFields: ['candidate_status'],
    familyFields: ['candidate_family'],
  },
  method_component_candidate: {
    schema: contracts.experimentFoundationMethodComponentCandidateSchema,
    idFields: ['method_component_candidate_id'],
    hashFields: ['candidate_hash', 'component_hash'],
    statusFields: ['candidate_status'],
    familyFields: ['candidate_family', 'component_kind'],
  },
  base_model_candidate: {
    schema: contracts.experimentFoundationBaseModelCandidateSchema,
    idFields: ['base_model_candidate_id'],
    hashFields: ['candidate_hash'],
    statusFields: ['candidate_status'],
    familyFields: ['candidate_family', 'model_family'],
  },
  asset_candidate_triage_report: {
    schema: contracts.experimentFoundationAssetCandidateTriageReportSchema,
    idFields: ['triage_report_id'],
    hashFields: ['triage_hash', 'candidate_hash'],
    statusFields: ['recommended_status'],
    familyFields: ['candidate_family'],
  },
  asset_promotion_request: {
    schema: contracts.experimentFoundationAssetPromotionRequestSchema,
    idFields: ['promotion_request_id'],
    hashFields: ['request_hash', 'candidate_hash'],
    statusFields: ['decision_kind', 'candidate_status'],
    familyFields: ['candidate_family'],
  },
  asset_promotion_result: {
    schema: contracts.experimentFoundationAssetPromotionResultSchema,
    idFields: ['promotion_result_id'],
    hashFields: ['promotion_hash', 'candidate_hash'],
    statusFields: ['result_status'],
    familyFields: ['candidate_family'],
  },
};

const CANDIDATE_RECORD_KINDS: ExperimentFoundationRecordKind[] = [
  'dataset_asset_candidate',
  'benchmark_asset_candidate',
  'baseline_asset_candidate',
  'evaluation_protocol_candidate',
  'method_component_candidate',
  'base_model_candidate',
];

const CLOSED_LEGACY_SCIENTIFIC_RECORD_KINDS = new Set<string>([
  'experiment_result',
  'result_validation_report',
  'evidence_candidate',
  'paper_experiment_sidecar',
]);

export class ExperimentFoundationService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly validators = new Map<ExperimentFoundationRecordKind, ValidateFunction>();

  constructor(private readonly repository: ExperimentFoundationRepository) {
    for (const [recordKind, config] of Object.entries(RECORD_KIND_CONFIG)) {
      this.validators.set(
        recordKind as ExperimentFoundationRecordKind,
        this.ajv.compile(config.schema),
      );
    }
  }

  async createRecord(input: CreateExperimentFoundationRecordRequest): Promise<ExperimentFoundationStoredRecord> {
    this.assertLegacyScientificWriterOpen(input.record_kind);
    const recordKind = this.assertRecordKind(input.record_kind);
    const payload = this.assertValidPayload(recordKind, input.payload);
    const metadata = this.deriveMetadata(recordKind, payload);
    const existing = await this.repository.findRecord(recordKind, metadata.recordId);
    if (existing) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `${recordKind} ${metadata.recordId} already exists.`,
      );
    }

    const now = this.now();
    return this.repository.createRecord({
      id: this.recordStorageId(recordKind, metadata.recordId),
      record_kind: recordKind,
      record_id: metadata.recordId,
      record_hash: metadata.recordHash,
      status: metadata.status,
      family: metadata.family,
      parent_record_kind: metadata.parentRecordKind,
      parent_record_id: metadata.parentRecordId,
      owner_ref_type: metadata.ownerRefType,
      owner_ref_id: metadata.ownerRefId,
      payload,
      source_refs: metadata.sourceRefs,
      traceability_refs: metadata.traceabilityRefs,
      created_at: now,
      updated_at: now,
    });
  }

  async upsertRecord(
    recordKindRaw: string,
    recordId: string,
    input: CreateExperimentFoundationRecordRequest,
  ): Promise<ExperimentFoundationStoredRecord> {
    this.assertLegacyScientificWriterOpen(recordKindRaw);
    this.assertLegacyScientificWriterOpen(input.record_kind);
    const recordKind = this.assertRecordKind(recordKindRaw);
    if (input.record_kind !== recordKind) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Path record_kind must match body record_kind.');
    }
    const payload = this.assertValidPayload(recordKind, input.payload);
    const metadata = this.deriveMetadata(recordKind, payload);
    if (metadata.recordId !== recordId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Path record_id must match payload identity.');
    }
    const existing = await this.repository.findRecord(recordKind, recordId);
    const now = this.now();
    return this.repository.upsertRecord({
      id: existing?.id ?? this.recordStorageId(recordKind, recordId),
      record_kind: recordKind,
      record_id: recordId,
      record_hash: metadata.recordHash,
      status: metadata.status,
      family: metadata.family,
      parent_record_kind: metadata.parentRecordKind,
      parent_record_id: metadata.parentRecordId,
      owner_ref_type: metadata.ownerRefType,
      owner_ref_id: metadata.ownerRefId,
      payload,
      source_refs: metadata.sourceRefs,
      traceability_refs: metadata.traceabilityRefs,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
  }

  async getRecord(
    recordKindRaw: string,
    recordId: string,
  ): Promise<ExperimentFoundationStoredRecord> {
    const recordKind = this.assertRecordKind(recordKindRaw);
    const record = await this.repository.findRecord(recordKind, recordId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `${recordKind} ${recordId} not found.`);
    }
    return record;
  }

  async listRecords(filter: {
    record_kind?: string;
    status?: string;
    family?: string;
    parent_record_id?: string;
    owner_ref_id?: string;
    limit?: string | number;
    cursor?: string;
  }): Promise<ListExperimentFoundationRecordsResponse> {
    const repositoryFilter: ExperimentFoundationRecordListFilter = {
      recordKind: filter.record_kind ? this.assertRecordKind(filter.record_kind) : undefined,
      status: normalizeOptionalString(filter.status),
      family: normalizeOptionalString(filter.family),
      parentRecordId: normalizeOptionalString(filter.parent_record_id),
      ownerRefId: normalizeOptionalString(filter.owner_ref_id),
      limit: normalizeLimit(filter.limit),
      cursor: normalizeOptionalString(filter.cursor),
    };
    const result = await this.repository.listRecords(repositoryFilter);
    return {
      records: result.records,
      next_cursor: result.nextCursor,
    };
  }

  async checkReadiness(
    input: ExperimentFoundationReadinessCheckRequest,
  ): Promise<ExperimentFoundationReadinessCheckResponse> {
    const targetKind = this.assertRecordKind(input.target_ref.ref_type);
    const targetId = input.target_ref.ref_id;
    const record = await this.repository.findRecord(targetKind, targetId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `${targetKind} ${targetId} not found.`);
    }

    const evaluation = await this.evaluateReadiness(record);
    const checkedAt = this.now();
    const report: ExperimentFoundationReadinessReportRecord = {
      id: `readiness_report_${randomUUID()}`,
      targetKind,
      targetId,
      readinessStatus: evaluation.status,
      readinessHash: `sha256:${sha256Text(stableStringify({
        target_kind: targetKind,
        target_id: targetId,
        blockers: evaluation.blockers,
        warnings: evaluation.warnings,
        required_actions: evaluation.requiredActions,
        checked_at: checkedAt,
      }))}`,
      blockers: evaluation.blockers,
      warnings: evaluation.warnings,
      requiredActions: evaluation.requiredActions,
      sourceRefs: input.source_refs,
      checkedAt,
      createdAt: checkedAt,
    };
    const persisted = await this.repository.createReadinessReport(report);
    return this.toReadinessResponse(persisted);
  }

  async getLatestReadinessReport(
    targetKindRaw: string,
    targetId: string,
  ): Promise<ExperimentFoundationReadinessCheckResponse> {
    const targetKind = this.assertRecordKind(targetKindRaw);
    const report = await this.repository.findLatestReadinessReport(targetKind, targetId);
    if (!report) {
      throw new AppError(404, 'NOT_FOUND', `Readiness report for ${targetKind} ${targetId} not found.`);
    }
    return this.toReadinessResponse(report);
  }

  async listReadinessReports(filter: {
    status?: string;
    target_kind?: string;
    limit?: string | number;
    cursor?: string;
  }): Promise<ListExperimentFoundationReadinessReportsResponse> {
    const statuses: ExperimentFoundationReadinessReportStatus[] = [];
    if (filter.status) {
      if (!(EXPERIMENT_FOUNDATION_READINESS_REPORT_STATUSES as readonly string[]).includes(filter.status)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Unknown readiness status: ${filter.status}`);
      }
      statuses.push(filter.status as ExperimentFoundationReadinessReportStatus);
    }
    const result = await this.repository.listReadinessReports({
      statuses: statuses.length > 0 ? statuses : undefined,
      targetKind: filter.target_kind ? this.assertRecordKind(filter.target_kind) : undefined,
      limit: normalizeLimit(filter.limit),
      cursor: normalizeOptionalString(filter.cursor),
    });
    return {
      reports: result.reports.map((report) => this.toReadinessResponse(report)),
      next_cursor: result.nextCursor,
    };
  }

  async decidePromotion(
    candidateId: string,
    input: ExperimentFoundationPromotionDecisionRequest,
  ): Promise<ExperimentFoundationPromotionDecisionResponse> {
    const promotionRequestPayload = this.assertValidPayload(
      'asset_promotion_request',
      input.promotion_request as unknown as JsonRecord,
    );
    const promotionResultPayload = this.assertValidPayload(
      'asset_promotion_result',
      input.promotion_result as unknown as JsonRecord,
    );

    const candidate = await this.findCandidateRecord(candidateId);
    this.assertPromotionTargetsCandidate(candidate, input.promotion_request, input.promotion_result);
    await this.assertPromotionGate(candidate, input.promotion_request, input.promotion_result);

    const nextCandidateStatus = mapPromotionResultToCandidateStatus(input.promotion_result.result_status);
    const now = this.now();
    const updatedCandidatePayload = {
      ...candidate.payload,
      candidate_status: nextCandidateStatus,
    };
    const promotionRequestRecord = this.buildStoredRecord('asset_promotion_request', promotionRequestPayload, now);
    const promotionResultRecord = this.buildStoredRecord('asset_promotion_result', promotionResultPayload, now);
    await this.assertRecordDoesNotExist(promotionRequestRecord.record_kind, promotionRequestRecord.record_id);
    await this.assertRecordDoesNotExist(promotionResultRecord.record_kind, promotionResultRecord.record_id);

    const result = await this.repository.recordPromotionDecision({
      promotionRequestRecord,
      promotionResultRecord,
      candidateRecord: {
        ...candidate,
        status: nextCandidateStatus,
        payload: updatedCandidatePayload,
        updated_at: now,
      },
    });

    return {
      promotion_request_record: result.promotionRequestRecord,
      promotion_result_record: result.promotionResultRecord,
      candidate_record: result.candidateRecord,
    };
  }

  private assertLegacyScientificWriterOpen(recordKind: string): void {
    if (!CLOSED_LEGACY_SCIENTIFIC_RECORD_KINDS.has(recordKind)) {
      return;
    }
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      'Legacy ExperimentFoundation scientific writers are permanently closed.',
      { reason_code: LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE },
    );
  }

  private assertRecordKind(value: string): ExperimentFoundationRecordKind {
    if ((contracts.EXPERIMENT_FOUNDATION_RECORD_KINDS as readonly string[]).includes(value)) {
      return value as ExperimentFoundationRecordKind;
    }
    throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported experiment-foundation record_kind ${value}.`);
  }

  private assertValidPayload(recordKind: ExperimentFoundationRecordKind, payload: unknown): JsonRecord {
    if (!isRecord(payload)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${recordKind} payload must be an object.`);
    }
    const validator = this.validators.get(recordKind);
    if (!validator) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported experiment-foundation record_kind ${recordKind}.`);
    }
    const ok = validator(payload);
    if (!ok) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${recordKind} payload failed schema validation.`, {
        validation: validator.errors?.map((error: ErrorObject) => ({
          instance_path: error.instancePath,
          schema_path: error.schemaPath,
          keyword: error.keyword,
          message: error.message,
          params: error.params,
        })),
      });
    }
    return structuredClone(payload);
  }

  private deriveMetadata(recordKind: ExperimentFoundationRecordKind, payload: JsonRecord) {
    const config = RECORD_KIND_CONFIG[recordKind];
    const recordId = deriveRecordId(recordKind, payload, config.idFields);
    const recordHash = readFirstStringOrArrayValue(payload, config.hashFields)
      ?? `sha256:${sha256Text(stableStringify(payload))}`;
    const status = readFirstStringValue(payload, config.statusFields ?? []);
    const family = readFirstStringValue(payload, config.familyFields ?? []) ?? deriveDefaultFamily(recordKind);
    const parent = deriveParent(recordKind, payload);
    const owner = deriveOwner(payload);
    return {
      recordId,
      recordHash,
      status,
      family,
      parentRecordKind: parent?.recordKind ?? null,
      parentRecordId: parent?.recordId ?? null,
      ownerRefType: owner?.refType ?? null,
      ownerRefId: owner?.refId ?? null,
      sourceRefs: deriveSourceRefs(payload),
      traceabilityRefs: deriveTraceabilityRefs(payload),
    };
  }

  private buildStoredRecord(
    recordKind: ExperimentFoundationRecordKind,
    payload: JsonRecord,
    now: string,
  ): ExperimentFoundationStoredRecord {
    const metadata = this.deriveMetadata(recordKind, payload);
    return {
      id: this.recordStorageId(recordKind, metadata.recordId),
      record_kind: recordKind,
      record_id: metadata.recordId,
      record_hash: metadata.recordHash,
      status: metadata.status,
      family: metadata.family,
      parent_record_kind: metadata.parentRecordKind,
      parent_record_id: metadata.parentRecordId,
      owner_ref_type: metadata.ownerRefType,
      owner_ref_id: metadata.ownerRefId,
      payload,
      source_refs: metadata.sourceRefs,
      traceability_refs: metadata.traceabilityRefs,
      created_at: now,
      updated_at: now,
    };
  }

  private async assertRecordDoesNotExist(
    recordKind: ExperimentFoundationRecordKind,
    recordId: string,
  ): Promise<void> {
    const existing = await this.repository.findRecord(recordKind, recordId);
    if (existing) {
      throw new AppError(409, 'VERSION_CONFLICT', `${recordKind} ${recordId} already exists.`);
    }
  }

  private async evaluateReadiness(record: ExperimentFoundationStoredRecord): Promise<{
    status: ExperimentFoundationReadinessReportStatus;
    blockers: string[];
    warnings: string[];
    requiredActions: string[];
  }> {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const requiredActions: string[] = [];
    const payload = record.payload;

    switch (record.record_kind) {
      case 'dataset_version':
        requireString(payload, 'checksum_manifest_hash', blockers);
        requireString(payload, 'split_protocol_hash', blockers);
        requireString(payload, 'data_policy_hash', blockers);
        requireNonEmptyArray(payload, 'location_ids', blockers);
        if (payload.readiness_status !== 'ready') {
          blockers.push('dataset_version readiness_status must be ready');
        }
        await this.checkStaleDatasetMirrors(record.record_id, blockers, warnings);
        break;
      case 'version_lock':
        checkVersionLockPayload(payload, blockers);
        break;
      case 'run_recipe':
        checkRunRecipePayload(payload, blockers);
        break;
      case 'training_task_spec':
        for (const key of ['run_recipe_hash', 'version_lock_hash', 'runtime_hash', 'config_snapshot_hash']) {
          requireString(payload, key, blockers);
        }
        break;
      case 'experiment_result':
        requireString(payload, 'result_hash', blockers);
        requireString(payload, 'run_recipe_hash', blockers);
        requireString(payload, 'version_lock_hash', blockers);
        requireNonEmptyArray(payload, 'validation_report_refs', blockers);
        break;
      case 'fine_tuning_result':
        requireString(payload, 'result_hash', blockers);
        if (payload.validation_status !== 'valid' && payload.validation_status !== 'accepted_partial') {
          blockers.push('fine_tuning_result validation_status must be valid or accepted_partial');
        }
        break;
      case 'evidence_candidate':
        if (payload.validation_status !== 'valid' && payload.validation_status !== 'accepted_partial') {
          blockers.push('evidence_candidate requires valid or accepted_partial validation_status');
        }
        requireString(payload, 'evidence_hash', blockers);
        break;
      default:
        if (isCandidateRecordKind(record.record_kind)) {
          checkCandidatePromotionEligibility(payload, blockers);
        } else if (!record.record_hash) {
          blockers.push('record_hash is required');
        }
        break;
    }

    for (const blocker of blockers) {
      requiredActions.push(blockerToAction(blocker));
    }

    return {
      status: blockers.length === 0 ? 'passed' : 'blocked',
      blockers,
      warnings,
      requiredActions,
    };
  }

  private async checkStaleDatasetMirrors(
    datasetVersionId: string,
    blockers: string[],
    warnings: string[],
  ): Promise<void> {
    const mirrors = await this.repository.listRecords({
      recordKind: 'dataset_mirror',
      parentRecordId: datasetVersionId,
      limit: 100,
    });
    const staleMirror = mirrors.records.find((record) =>
      record.payload.mirror_status === 'stale' || record.payload.freshness_status === 'stale');
    if (staleMirror) {
      blockers.push(`dataset mirror ${staleMirror.record_id} is stale`);
    }
    if (mirrors.records.length === 0) {
      warnings.push('dataset_version has no execution mirrors registered');
    }
  }

  private toReadinessResponse(
    report: ExperimentFoundationReadinessReportRecord,
  ): ExperimentFoundationReadinessCheckResponse {
    return {
      readiness_report_id: report.id,
      target_ref: {
        ref_type: report.targetKind,
        ref_id: report.targetId,
      },
      readiness_status: report.readinessStatus,
      readiness_hash: report.readinessHash,
      blockers: report.blockers,
      warnings: report.warnings,
      required_actions: report.requiredActions,
      source_refs: report.sourceRefs,
      checked_at: report.checkedAt,
      created_at: report.createdAt,
    };
  }

  private async findCandidateRecord(candidateId: string): Promise<ExperimentFoundationStoredRecord> {
    for (const recordKind of CANDIDATE_RECORD_KINDS) {
      const record = await this.repository.findRecord(recordKind, candidateId);
      if (record) {
        return record;
      }
    }
    throw new AppError(404, 'NOT_FOUND', `Candidate ${candidateId} not found.`);
  }

  private assertPromotionTargetsCandidate(
    candidate: ExperimentFoundationStoredRecord,
    promotionRequest: ExperimentAssetPromotionRequest,
    promotionResult: ExperimentAssetPromotionResult,
  ): void {
    if (promotionRequest.candidate_ref.ref_type !== candidate.record_kind) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion request candidate_ref.ref_type does not match candidate record kind.');
    }
    if (promotionResult.candidate_ref.ref_type !== candidate.record_kind) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion result candidate_ref.ref_type does not match candidate record kind.');
    }
    const candidateFamily = typeof candidate.payload.candidate_family === 'string'
      ? candidate.payload.candidate_family
      : null;
    if (candidateFamily && promotionRequest.candidate_family !== candidateFamily) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion request candidate_family does not match candidate payload.');
    }
    if (candidateFamily && promotionResult.candidate_family !== candidateFamily) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion result candidate_family does not match candidate payload.');
    }
    if (promotionRequest.candidate_ref.ref_id !== candidate.record_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion request targets a different candidate.');
    }
    if (promotionResult.candidate_ref.ref_id !== candidate.record_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion result targets a different candidate.');
    }
    if (promotionRequest.candidate_hash !== candidate.record_hash) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion request candidate_hash is stale.');
    }
    if (promotionResult.candidate_hash !== candidate.record_hash) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion result candidate_hash is stale.');
    }
    if (promotionResult.promotion_request_id !== promotionRequest.promotion_request_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Promotion result does not reference the request.');
    }
  }

  private async assertCanonicalRefsExist(refs: ExperimentFoundationRef[], label: string): Promise<void> {
    if (refs.length === 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${label} must not be empty for promoted results.`);
    }
    for (const ref of refs) {
      const recordKind = this.assertRecordKind(ref.ref_type);
      const record = await this.repository.findRecord(recordKind, ref.ref_id);
      if (!record) {
        throw new AppError(404, 'NOT_FOUND', `Canonical ${ref.ref_type} ${ref.ref_id} not found.`);
      }
      if (isCandidateRecordKind(record.record_kind)) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${label} must reference canonical records.`);
      }
    }
  }

  private async assertPromotionGate(
    candidate: ExperimentFoundationStoredRecord,
    promotionRequest: ExperimentAssetPromotionRequest,
    promotionResult: ExperimentAssetPromotionResult,
  ): Promise<void> {
    const blockers: string[] = [];
    if (promotionRequest.decision_kind === 'auto_promote') {
      checkCandidatePromotionEligibility(candidate.payload, blockers);
      checkPromotionRequestEligibility(promotionRequest, blockers);
    }
    if (blockers.length > 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Candidate promotion gate failed.', {
        blockers,
      });
    }
    if (promotionResult.result_status === 'promoted') {
      await this.assertCanonicalRefsExist(promotionResult.canonical_asset_refs, 'canonical_asset_refs');
      await this.assertCanonicalRefsExist(promotionResult.canonical_version_refs, 'canonical_version_refs');
      await this.assertCanonicalRefsExist(promotionResult.canonical_protocol_refs, 'canonical_protocol_refs');
      await this.assertCanonicalRefsExist(promotionResult.canonical_policy_refs, 'canonical_policy_refs');
    }
  }

  private recordStorageId(recordKind: ExperimentFoundationRecordKind, recordId: string): string {
    return `experiment_foundation_record_${sha256Text(`${recordKind}:${recordId}`).slice(0, 24)}`;
  }

  private now(): string {
    return new Date().toISOString();
  }
}

function deriveRecordId(
  recordKind: ExperimentFoundationRecordKind,
  payload: JsonRecord,
  idFields: string[],
): string {
  if (recordKind === 'external_lock_ref') {
    const ref = isRecord(payload.ref) ? payload.ref : {};
    return `${String(payload.ref_kind)}:${String(ref.ref_type)}:${String(ref.ref_id)}`;
  }
  if (recordKind === 'dataset_version_lock') {
    return `${String(payload.dataset_asset_id)}:${String(payload.dataset_version_id)}`;
  }
  if (recordKind === 'evaluation_protocol_lock') {
    return `${String(payload.evaluation_protocol_id)}:${String(payload.protocol_version)}`;
  }
  if (recordKind === 'baseline_implementation_version_lock') {
    return `${String(payload.baseline_asset_id)}:${String(payload.baseline_implementation_version_id)}`;
  }
  if (recordKind === 'execution_profile') {
    return String(payload.profile_kind);
  }
  const id = readFirstStringValue(payload, idFields);
  if (!id) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${recordKind} payload is missing identity field.`);
  }
  return id;
}

function readFirstStringValue(payload: JsonRecord, fields: string[]): string | null {
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readFirstStringOrArrayValue(payload: JsonRecord, fields: string[]): string | null {
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    if (Array.isArray(value)) {
      const joined = value.filter((item): item is string => typeof item === 'string' && item.length > 0).join(':');
      if (joined) {
        return joined;
      }
    }
  }
  return null;
}

function deriveDefaultFamily(recordKind: ExperimentFoundationRecordKind): string | null {
  if (recordKind.startsWith('dataset_') || recordKind === 'checksum_manifest' || recordKind === 'split_protocol') {
    return 'dataset';
  }
  if (recordKind.includes('candidate')) {
    return 'candidate';
  }
  if (recordKind.includes('baseline')) {
    return 'baseline';
  }
  if (recordKind.includes('protocol') || recordKind.includes('metric')) {
    return 'evaluation';
  }
  if (recordKind.includes('result') || recordKind.includes('evidence') || recordKind.includes('sidecar')) {
    return 'evidence';
  }
  return null;
}

function deriveParent(
  recordKind: ExperimentFoundationRecordKind,
  payload: JsonRecord,
): { recordKind: ExperimentFoundationRecordKind; recordId: string } | null {
  const mappings: Partial<Record<ExperimentFoundationRecordKind, [ExperimentFoundationRecordKind, string]>> = {
    dataset_version: ['dataset_asset', 'dataset_asset_id'],
    dataset_location: ['dataset_version', 'dataset_version_id'],
    dataset_mirror: ['dataset_version', 'dataset_version_id'],
    checksum_manifest: ['dataset_version', 'dataset_version_id'],
    split_protocol: ['dataset_version', 'dataset_version_id'],
    evaluation_protocol: ['benchmark_asset', 'benchmark_asset_id'],
    baseline_implementation_version: ['baseline_asset', 'baseline_asset_id'],
    dataset_version_lock: ['dataset_version', 'dataset_version_id'],
    evaluation_protocol_lock: ['evaluation_protocol', 'evaluation_protocol_id'],
    baseline_implementation_version_lock: ['baseline_implementation_version', 'baseline_implementation_version_id'],
    generate_run_recipe_request: ['recipe_draft', 'recipe_draft_id'],
    run_recipe: ['recipe_draft', 'recipe_draft_id'],
    training_task_spec: ['run_recipe', 'run_recipe_id'],
    training_task_materialization_result: ['materialize_training_task_spec_request', 'materialization_request_id'],
    fine_tuning_result: ['experiment_result', 'experiment_result_hash'],
    asset_promotion_result: ['asset_promotion_request', 'promotion_request_id'],
  };
  const mapping = mappings[recordKind];
  if (!mapping) {
    return null;
  }
  const parentId = payload[mapping[1]];
  return typeof parentId === 'string' && parentId
    ? { recordKind: mapping[0], recordId: parentId }
    : null;
}

function deriveOwner(payload: JsonRecord): { refType: string; refId: string } | null {
  if (typeof payload.paper_project_id === 'string' && payload.paper_project_id) {
    return { refType: 'paper_project', refId: payload.paper_project_id };
  }
  const createdBy = payload.created_by_ref;
  if (isExperimentFoundationRef(createdBy)) {
    return { refType: createdBy.ref_type, refId: createdBy.ref_id };
  }
  const requestedBy = payload.requested_by_ref;
  if (isExperimentFoundationRef(requestedBy)) {
    return { refType: requestedBy.ref_type, refId: requestedBy.ref_id };
  }
  return null;
}

function deriveSourceRefs(payload: JsonRecord): ExperimentFoundationRef[] {
  const refs = readRefArray(payload.source_refs);
  if (refs.length > 0) {
    return refs;
  }
  return isExperimentFoundationRef(payload.source_ref) ? [payload.source_ref] : [];
}

function deriveTraceabilityRefs(payload: JsonRecord): ExperimentFoundationRef[] {
  return [
    ...readRefArray(payload.traceability_refs),
    ...readRefArray(payload.provenance_refs),
    ...readRefArray(payload.event_refs),
  ];
}

function checkCandidatePromotionEligibility(payload: JsonRecord, blockers: string[]): void {
  if (payload.candidate_status !== 'ready_for_promotion') {
    blockers.push('candidate_status must be ready_for_promotion');
  }
  if (typeof payload.confidence_score !== 'number' || payload.confidence_score < 0.8) {
    blockers.push('confidence_score must be at least 0.8');
  }
  const duplicateCheck = isRecord(payload.duplicate_check) ? payload.duplicate_check : {};
  if (duplicateCheck.duplicate_status !== 'no_duplicate') {
    blockers.push('duplicate_check.duplicate_status must be no_duplicate');
  }
  const completenessCheck = isRecord(payload.completeness_check) ? payload.completeness_check : {};
  if (completenessCheck.completeness_status !== 'complete') {
    blockers.push('completeness_check.completeness_status must be complete');
  }
  const policyCheck = isRecord(payload.policy_check) ? payload.policy_check : {};
  if (policyCheck.policy_status !== 'clear') {
    blockers.push('policy_check.policy_status must be clear');
  }
  const riskAssessment = isRecord(payload.risk_assessment) ? payload.risk_assessment : {};
  if (riskAssessment.risk_level !== 'low') {
    blockers.push('risk_assessment.risk_level must be low');
  }
  if (readRefArray(payload.source_refs).length === 0) {
    blockers.push('source_refs must be present');
  }
  if (readRefArray(payload.extraction_provenance_refs).length === 0) {
    blockers.push('extraction_provenance_refs must be present');
  }
  if (readRefArray(payload.deterministic_rule_trace_refs).length === 0) {
    blockers.push('deterministic_rule_trace_refs must be present');
  }
}

function checkPromotionRequestEligibility(
  promotionRequest: ExperimentAssetPromotionRequest,
  blockers: string[],
): void {
  if (promotionRequest.candidate_status !== 'ready_for_promotion') {
    blockers.push('promotion request candidate_status must be ready_for_promotion');
  }
  if (promotionRequest.confidence_score < 0.8) {
    blockers.push('promotion request confidence_score must be at least 0.8');
  }
  if (promotionRequest.duplicate_status !== 'no_duplicate') {
    blockers.push('promotion request duplicate_status must be no_duplicate');
  }
  if (promotionRequest.completeness_status !== 'complete') {
    blockers.push('promotion request completeness_status must be complete');
  }
  if (promotionRequest.policy_status !== 'clear') {
    blockers.push('promotion request policy_status must be clear');
  }
  if (promotionRequest.risk_level !== 'low') {
    blockers.push('promotion request risk_level must be low');
  }
}

function checkVersionLockPayload(payload: JsonRecord, blockers: string[]): void {
  requireString(payload, 'version_lock_hash', blockers);
  const readinessSnapshot = isRecord(payload.readiness_snapshot) ? payload.readiness_snapshot : {};
  if (readinessSnapshot.status !== 'passed') {
    blockers.push('version_lock readiness_snapshot.status must be passed');
  }
  const datasetLock = isRecord(payload.dataset_version_lock) ? payload.dataset_version_lock : {};
  for (const key of ['checksum_manifest_hash', 'split_protocol_hash', 'data_policy_hash']) {
    requireString(datasetLock, key, blockers);
  }
  const protocolLock = isRecord(payload.evaluation_protocol_lock) ? payload.evaluation_protocol_lock : {};
  requireString(protocolLock, 'protocol_hash', blockers);
  for (const lock of readRecordArray(payload.baseline_implementation_locks)) {
    requireString(lock, 'version_label', blockers);
    requireString(lock, 'implementation_hash', blockers);
    requireString(lock, 'runtime_hash', blockers);
  }
  for (const lock of readRecordArray(payload.method_component_locks)) {
    requireString(lock, 'version_label', blockers);
    requireString(lock, 'component_hash', blockers);
  }
}

function checkRunRecipePayload(payload: JsonRecord, blockers: string[]): void {
  requireString(payload, 'run_recipe_hash', blockers);
  requireString(payload, 'version_lock_hash', blockers);
  requireString(payload, 'config_snapshot_hash', blockers);
  const readinessSnapshot = isRecord(payload.readiness_snapshot) ? payload.readiness_snapshot : {};
  if (readinessSnapshot.status !== 'passed') {
    blockers.push('run_recipe readiness_snapshot.status must be passed');
  }
  const versionLock = isRecord(payload.version_lock) ? payload.version_lock : {};
  checkVersionLockPayload(versionLock, blockers);
  const executionProfile = isRecord(payload.execution_profile) ? payload.execution_profile : {};
  if (executionProfile.profile_kind === 'llm_fine_tuning') {
    const externalRefs = readRecordArray(versionLock.external_lock_refs);
    const refKinds = new Set(externalRefs.map((ref) => ref.ref_kind));
    for (const required of ['base_model', 'fine_tuning_dataset', 'fine_tuning_strategy', 'prompt_template', 'context_policy']) {
      if (!refKinds.has(required)) {
        blockers.push(`llm_fine_tuning run_recipe missing external lock ref ${required}`);
      }
    }
  }
}

function requireString(payload: JsonRecord, key: string, blockers: string[]): void {
  if (typeof payload[key] !== 'string' || payload[key].length === 0) {
    blockers.push(`${key} is required`);
  }
}

function requireNonEmptyArray(payload: JsonRecord, key: string, blockers: string[]): void {
  if (!Array.isArray(payload[key]) || payload[key].length === 0) {
    blockers.push(`${key} must be non-empty`);
  }
}

function blockerToAction(blocker: string): string {
  return `Resolve: ${blocker}`;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'limit must be a number.');
  }
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function readRefArray(value: unknown): ExperimentFoundationRef[] {
  return Array.isArray(value) ? value.filter(isExperimentFoundationRef) : [];
}

function readRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isCandidateRecordKind(recordKind: ExperimentFoundationRecordKind): boolean {
  return CANDIDATE_RECORD_KINDS.includes(recordKind);
}

function mapPromotionResultToCandidateStatus(
  resultStatus: ExperimentAssetPromotionResult['result_status'],
): string {
  if (resultStatus === 'promoted') {
    return 'promoted';
  }
  if (resultStatus === 'needs_info') {
    return 'needs_info';
  }
  if (resultStatus === 'rejected') {
    return 'rejected';
  }
  return 'manual_review_required';
}

function isExperimentFoundationRef(value: unknown): value is ExperimentFoundationRef {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
      && typeof (value as { ref_type?: unknown }).ref_type === 'string'
      && typeof (value as { ref_id?: unknown }).ref_id === 'string',
  );
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
