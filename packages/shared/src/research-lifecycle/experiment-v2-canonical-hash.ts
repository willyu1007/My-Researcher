import { createHash, timingSafeEqual } from 'node:crypto';

import type {
  AttemptEventSnapshotV2,
  ExperimentFoundationExecutionAttemptEventTypeV2,
  ExperimentFoundationExecutionAttemptStateV2,
  ProviderCommandSnapshotV2,
} from './experiment-foundation-execution-v2-contracts.js';
import type {
  ExperimentFoundationV2BenchmarkRevisionContentV1,
  ExperimentFoundationV2DataPolicyRevisionContentV1,
  ExperimentFoundationV2DatasetRevisionContentV1,
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationV2MetricDefinitionRevisionContentV1,
  ExperimentFoundationReadinessBlockerV2,
  ExperimentFoundationReadinessQualificationSnapshotV2,
  ExperimentFoundationV2ReadinessStatus,
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunRecipeSnapshotV2,
  ExperimentFoundationTrainingTaskCommandSnapshotV2,
  ExperimentFoundationTrainingTaskIoSnapshotV2,
  ExperimentFoundationTrainingTaskResourceSnapshotV2,
  ExperimentFoundationTrainingTaskRetrySnapshotV2,
} from './experiment-foundation-v2-contracts.js';
import type {
  ExperimentFoundationExecutableRunRecipeSnapshotV2,
  ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2,
  ExperimentFoundationExecutionBundleExactRevisionRefV2,
} from './experiment-foundation-real-provider-v2-contracts.js';
import type {
  PaperImplementationExperimentV2BranchFrame,
  PaperImplementationExperimentV2ExactCellInput,
  PaperImplementationExperimentV2WorkOrderRevisionSnapshot,
  PaperImplementationExperimentWorkOrderRevisionCellV2,
  WorkOrderRevisionAdmittedCellV1,
} from './paper-implementation-experiment-v2-contracts.js';
import type {
  ExperimentFoundationExplorationSpecContentV1,
} from './experiment-foundation-exploration-spec-v2-contracts.js';
import type {
  ExperimentFoundationScientificValidationStatusV2,
  ExperimentResultCellV2,
  ScientificValidationCellResultRefV2,
  ScientificValidationRuleResultV2,
} from './experiment-foundation-scientific-validation-v2-contracts.js';
import type {
  PaperImplementationEvidenceTraceManifestV2,
  PaperImplementationRunEvidenceUnitV2,
  ValidationCycleClosureV2,
  ValidationCycleClosureWatermarkV2,
} from './paper-implementation-evidence-v2-contracts.js';
import type {
  PaperImplementationSemanticDocumentContentV2,
  PaperImplementationSemanticDocumentSourceRefV2,
} from './paper-implementation-semantic-retrieval-v2-contracts.js';

export { EXPERIMENT_V2_HASH_PATTERN } from './experiment-v2-contract-limits.js';

export type ExperimentV2JsonPrimitive = string | number | boolean | null;
export type ExperimentV2JsonValue =
  | ExperimentV2JsonPrimitive
  | ExperimentV2JsonValue[]
  | { [key: string]: ExperimentV2JsonValue };

export const EXPERIMENT_V2_HASH_PROFILES = Object.freeze([
  'ef-asset-semantic-json@v1',
  'ef-promotion-command-json@v1',
  'ef-promotion-event-json@v1',
  'ef-exploration-spec-json@v1',
  'ef-exploration-spec-command-json@v1',
  'pi-exploration-attachment-command-json@v1',
  'ef-readiness-dependency-manifest-json@v1',
  'ef-version-lock-json@v1',
  'ef-run-recipe-json@v1',
  'ef-training-task-spec-json@v1',
  'ef-run-manifest-json@v1',
  'ef-provider-payload-json@v1',
  'ef-provider-control-json@v1',
  'ef-execution-bundle-semantic-json@v1',
  'ef-real-provider-payload-json@v1',
  'ef-real-provider-control-json@v1',
  'ef-execution-attempt-event-json@v1',
  'ef-provider-command-json@v1',
  'pi-work-order-branch-frame-json@v1',
  'pi-work-order-revision-json@v1',
  'pi-work-order-cell-json@v1',
  'pi-work-order-cell-plan-json@v1',
  'pi-work-order-approved-plan-json@v1',
  'integration-event-payload-json@v1',
  'integration-event-envelope-json@v1',
  'ef-scientific-result-json@v1',
  'ef-scientific-validation-json@v1',
  'ef-evidence-candidate-json@v1',
  'pi-run-evidence-unit-json@v1',
  'pi-evidence-trace-manifest-json@v1',
  'pi-cycle-closure-watermark-json@v1',
  'pi-cycle-closure-json@v1',
  'pi-semantic-source-json@v1',
  'pi-semantic-document-json@v1',
] as const);
export type ExperimentV2HashProfile = (typeof EXPERIMENT_V2_HASH_PROFILES)[number];

export const EXPERIMENT_V2_HASH_ALGORITHM = 'sha256' as const;

export interface ServerCanonicalExperimentV2HashInput {
  record_kind: string;
  schema_version: string;
  hash_profile: ExperimentV2HashProfile;
  content: unknown;
}

export interface ExperimentV2PayloadHashedEvent<TPayload = unknown> {
  event_type: string;
  schema_version: string;
  payload_hash: string;
  payload: TPayload;
}

export interface ExperimentV2EventEnvelopeForHash<TPayload = unknown>
  extends ExperimentV2PayloadHashedEvent<TPayload> {
  event_id: string;
  producer_domain: string;
  occurred_at: string;
  correlation_id: string;
  causation_id: string;
  business_idempotency_key: string;
}

export type ExperimentFoundationV2AssetRevisionHashInput =
  | {
    asset_type: 'Dataset';
    content: ExperimentFoundationV2DatasetRevisionContentV1;
  }
  | {
    asset_type: 'DataPolicy';
    content: ExperimentFoundationV2DataPolicyRevisionContentV1;
  }
  | {
    asset_type: 'MetricDefinition';
    content: ExperimentFoundationV2MetricDefinitionRevisionContentV1;
  }
  | {
    asset_type: 'Benchmark';
    content: ExperimentFoundationV2BenchmarkRevisionContentV1;
  }
  | {
    asset_type: 'EvaluationProtocol';
    content: ExperimentFoundationV2EvaluationProtocolRevisionContentV2;
  };

export interface ExperimentFoundationV2VersionLockHashInput {
  materialization_key: string;
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  dependency_manifest_hash: string;
  dependencies: Array<{
    ordinal: number;
    dependency: ExperimentFoundationV2ExactAssetRevisionRef;
  }>;
}

export interface ExperimentFoundationV2ReadinessAttestationHashInput {
  target: ExperimentFoundationV2ExactAssetRevisionRef;
  status: ExperimentFoundationV2ReadinessStatus;
  evaluator_profile_version: string;
  evaluator_profile_hash: string;
  dependency_manifest_hash: string;
  qualification_snapshot: ExperimentFoundationReadinessQualificationSnapshotV2;
  blockers: ExperimentFoundationReadinessBlockerV2[];
}

export interface ExperimentFoundationV2RunRecipeHashInput {
  materialization_key: string;
  version_lock_id: string;
  readiness_attestation_id: string;
  recipe_snapshot:
    | ExperimentFoundationRunRecipeSnapshotV2
    | ExperimentFoundationExecutableRunRecipeSnapshotV2;
}

export interface ExperimentFoundationV2TrainingTaskSpecHashInput {
  task_spec_schema_version?: 'v1' | 'v2';
  materialization_key: string;
  run_recipe_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_cell_id: string;
  external_pi_cell_hash: string;
  admitted_cell: WorkOrderRevisionAdmittedCellV1;
  execution_bundle?: ExperimentFoundationExecutionBundleExactRevisionRefV2;
  command_snapshot:
    | ExperimentFoundationTrainingTaskCommandSnapshotV2
    | ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['command_snapshot'];
  io_snapshot:
    | ExperimentFoundationTrainingTaskIoSnapshotV2
    | ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['io_snapshot'];
  resource_snapshot:
    | ExperimentFoundationTrainingTaskResourceSnapshotV2
    | ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['resource_snapshot'];
  retry_snapshot:
    | ExperimentFoundationTrainingTaskRetrySnapshotV2
    | ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['retry_snapshot'];
}

export type ExperimentFoundationV2RunManifestHashRow = Pick<
  ExperimentFoundationRunCellV2,
  | 'ordinal'
  | 'cell_key'
  | 'external_pi_cell_id'
  | 'external_pi_cell_hash'
  | 'training_task_spec_id'
  | 'training_task_spec_hash'
  | 'seed'
  | 'repeat_index'
>;

export type PaperImplementationExperimentV2CellPlanHashRow = Pick<
  PaperImplementationExperimentWorkOrderRevisionCellV2,
  'ordinal' | 'cell_hash'
>;

export interface PaperImplementationExperimentV2ApprovedPlanHashInput {
  branch_frame_hash: string;
  work_order_revision_hash: string;
  cell_plan_hash: string;
}

export interface PaperImplementationExplorationAttachmentV2CommandHashInput {
  spec_id: string;
  spec_revision: number;
  spec_revision_id: string;
  spec_content_hash: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_key: string;
}

export interface ExperimentFoundationExecutionAttemptEventV2HashInput {
  execution_attempt_id: string;
  event_sequence: number;
  event_type: ExperimentFoundationExecutionAttemptEventTypeV2;
  prior_state: ExperimentFoundationExecutionAttemptStateV2 | null;
  next_state: ExperimentFoundationExecutionAttemptStateV2;
  provider_command_id: string | null;
  payload_hash: string;
  external_job_ref: string | null;
  external_job_ref_hash: string | null;
  event_snapshot: AttemptEventSnapshotV2 | Readonly<Record<string, unknown>>;
  occurred_at: string;
}

export interface ExperimentFoundationProviderCommandV2HashInput {
  provider_idempotency_key: string;
  command_snapshot: ProviderCommandSnapshotV2 | Readonly<Record<string, unknown>>;
}

function isPlainJsonObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalize(value: unknown, path: string, seen: Set<object>): string {
  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError(`Non-finite number at ${path}`);
      }
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'object': {
      if (seen.has(value)) {
        throw new TypeError(`Cyclic value at ${path}`);
      }
      seen.add(value);
      try {
        if (Array.isArray(value)) {
          const entries: string[] = [];
          for (let index = 0; index < value.length; index += 1) {
            if (!Object.hasOwn(value, index)) {
              throw new TypeError(`Sparse array entry at ${path}[${index}]`);
            }
            entries.push(canonicalize(value[index], `${path}[${index}]`, seen));
          }
          return `[${entries.join(',')}]`;
        }

        if (!isPlainJsonObject(value)) {
          throw new TypeError(`Non-JSON object at ${path}`);
        }

        const keys = Object.keys(value).sort();
        const entries = keys.map((key) => {
          const entry = value[key];
          if (entry === undefined) {
            throw new TypeError(`Undefined value at ${path}.${key}`);
          }
          return `${JSON.stringify(key)}:${canonicalize(entry, `${path}.${key}`, seen)}`;
        });
        return `{${entries.join(',')}}`;
      } finally {
        seen.delete(value);
      }
    }
    default:
      throw new TypeError(`Unsupported JSON value at ${path}`);
  }
}

/**
 * Produces deterministic JSON for already-validated semantic values.
 * This helper does not validate a domain schema; callers must validate first.
 */
export function canonicalizeExperimentV2Json(value: unknown): string {
  return canonicalize(value, '$', new Set<object>());
}

function sha256CanonicalValue(value: unknown): string {
  const digest = createHash(EXPERIMENT_V2_HASH_ALGORITHM)
    .update(canonicalizeExperimentV2Json(value), 'utf8')
    .digest('hex');
  return `${EXPERIMENT_V2_HASH_ALGORITHM}:${digest}`;
}

/**
 * Server-only authoring primitive. External requests never carry this result as
 * authority; repositories persist the value returned by this function.
 */
export function serverHashExperimentV2SemanticContent(
  input: ServerCanonicalExperimentV2HashInput,
): string {
  if (!(EXPERIMENT_V2_HASH_PROFILES as readonly string[]).includes(input.hash_profile)) {
    throw new TypeError(`Unsupported experiment v2 hash profile: ${String(input.hash_profile)}`);
  }
  if (input.record_kind.length === 0 || input.schema_version.length === 0) {
    throw new TypeError('record_kind and schema_version must be non-empty');
  }

  return sha256CanonicalValue({
    hash_profile: input.hash_profile,
    record_kind: input.record_kind,
    schema_version: input.schema_version,
    content: input.content,
  });
}

export function serverHashPaperImplementationSemanticSourceV2(
  content: PaperImplementationSemanticDocumentContentV2,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationSemanticDocumentSourceV2',
    schema_version: 'v1',
    hash_profile: 'pi-semantic-source-json@v1',
    content,
  });
}

export interface PaperImplementationSemanticDocumentV2HashInput {
  implementation_project_id: string;
  source: PaperImplementationSemanticDocumentSourceRefV2;
  semantic_text: string;
  content: PaperImplementationSemanticDocumentContentV2;
}

export function serverHashPaperImplementationSemanticDocumentV2(
  content: PaperImplementationSemanticDocumentV2HashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationSemanticDocumentV2',
    schema_version: 'v1',
    hash_profile: 'pi-semantic-document-json@v1',
    content,
  });
}

export function serverPaperImplementationSemanticDocumentV2Id(input: {
  implementation_project_id: string;
  source_type: PaperImplementationSemanticDocumentSourceRefV2['source_type'];
  source_id: string;
}): string {
  const digest = serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationSemanticDocumentIdentityV2',
    schema_version: 'v1',
    hash_profile: 'pi-semantic-document-json@v1',
    content: input,
  }).slice('sha256:'.length, 'sha256:'.length + 32);
  return `pi_semantic_document_${digest}`;
}

export function serverHashExperimentFoundationExecutionAttemptEventV2(
  content: ExperimentFoundationExecutionAttemptEventV2HashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationExecutionAttemptEventV2',
    schema_version: 'v1',
    hash_profile: 'ef-execution-attempt-event-json@v1',
    content,
  });
}

export function serverHashExperimentFoundationProviderCommandV2(
  content: ExperimentFoundationProviderCommandV2HashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationProviderCommandV2',
    schema_version: 'v1',
    hash_profile: 'ef-provider-command-json@v1',
    content,
  });
}

export function serverHashExperimentFoundationProviderControlV2Semantic(
  recordKind: string,
  content: unknown,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: 'ef-provider-control-json@v1',
    content,
  });
}

export function serverHashExperimentFoundationExternalJobRefV2(
  ref: string | {
    ref_type: 'fake_aliyun_pai_dlc_job';
    ref_id: string;
  } | {
    ref_type: 'aliyun_pai_dlc_job';
    job_id: string;
    region_id_hash: string;
  },
): string {
  return serverHashExperimentFoundationProviderControlV2Semantic(
    'ExperimentFoundationExternalJobRefV2',
    typeof ref === 'string'
      ? { ref_type: 'fake_aliyun_pai_dlc_job', ref_id: ref }
      : ref,
  );
}

/** Canonical hash for one validated immutable EF typed asset revision. */
export function serverHashExperimentFoundationV2AssetRevision(
  input: ExperimentFoundationV2AssetRevisionHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: `ExperimentFoundation${input.asset_type}RevisionV2`,
    schema_version: input.content.schema_version,
    hash_profile: 'ef-asset-semantic-json@v1',
    content: input.content,
  });
}

export function serverHashExperimentFoundationPromotionV2Command(content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationPromotionCommandV2',
    schema_version: 'v1',
    hash_profile: 'ef-promotion-command-json@v1',
    content,
  });
}

export function serverHashExperimentFoundationPromotionV2Event(content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationPromotionEventV2',
    schema_version: 'v1',
    hash_profile: 'ef-promotion-event-json@v1',
    content,
  });
}

export function serverExperimentFoundationPromotionV2Id(
  prefix: 'candidate' | 'decision' | 'revision' | 'receipt' | 'outbox' | 'event',
  content: unknown,
): string {
  const digest = serverHashExperimentFoundationPromotionV2Command({ prefix, content })
    .slice('sha256:'.length, 'sha256:'.length + 32);
  return `ef_promotion_${prefix}_${digest}`;
}

export function serverHashExperimentFoundationExplorationSpecV2(
  content: ExperimentFoundationExplorationSpecContentV1,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationExplorationSpecRevisionV2',
    schema_version: content.schema_version,
    hash_profile: 'ef-exploration-spec-json@v1',
    content,
  });
}

export function serverHashExperimentFoundationExplorationSpecCommandV2(
  content: unknown,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationExplorationSpecCommandV2',
    schema_version: 'v1',
    hash_profile: 'ef-exploration-spec-command-json@v1',
    content,
  });
}

export function serverExperimentFoundationExplorationSpecV2Id(
  prefix: 'spec' | 'revision' | 'receipt',
  content: unknown,
): string {
  const digest = serverHashExperimentFoundationExplorationSpecCommandV2({ prefix, content })
    .slice('sha256:'.length, 'sha256:'.length + 32);
  return `ef_exploration_${prefix}_${digest}`;
}

export function serverHashPaperImplementationExplorationAttachmentCommandV2(
  content: PaperImplementationExplorationAttachmentV2CommandHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExplorationAttachmentCommandV2',
    schema_version: 'v1',
    hash_profile: 'pi-exploration-attachment-command-json@v1',
    content,
  });
}

export function serverPaperImplementationExplorationAttachmentV2Id(
  prefix: 'attachment' | 'receipt',
  content: PaperImplementationExplorationAttachmentV2CommandHashInput | {
    business_idempotency_key: string;
  },
): string {
  const digest = serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExplorationAttachmentIdentityV2',
    schema_version: 'v1',
    hash_profile: 'pi-exploration-attachment-command-json@v1',
    content: { prefix, content },
  })
    .slice('sha256:'.length, 'sha256:'.length + 32);
  return `pi_exploration_${prefix}_${digest}`;
}

export function serverHashExperimentFoundationV2ReadinessDependencyManifest(
  dependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationReadinessDependencyManifestV2',
    schema_version: 'v1',
    hash_profile: 'ef-readiness-dependency-manifest-json@v1',
    content: dependencies,
  });
}

export function serverHashExperimentFoundationV2ReadinessAttestation(
  input: ExperimentFoundationV2ReadinessAttestationHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationReadinessAttestationV2',
    schema_version: 'v1',
    hash_profile: 'ef-readiness-dependency-manifest-json@v1',
    content: input,
  });
}

export function serverHashExperimentFoundationV2VersionLockDependencyManifest(
  dependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationVersionLockDependencyManifestV2',
    schema_version: 'v1',
    hash_profile: 'ef-readiness-dependency-manifest-json@v1',
    content: dependencies,
  });
}

export function serverHashExperimentFoundationV2VersionLock(
  input: ExperimentFoundationV2VersionLockHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationVersionLockV2',
    schema_version: 'v1',
    hash_profile: 'ef-version-lock-json@v1',
    content: input,
  });
}

export function serverHashExperimentFoundationV2RunRecipe(
  input: ExperimentFoundationV2RunRecipeHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationRunRecipeV2',
    schema_version: input.recipe_snapshot.recipe_schema_version,
    hash_profile: 'ef-run-recipe-json@v1',
    content: input,
  });
}

export function serverHashExperimentFoundationV2TrainingTaskSpec(
  input: ExperimentFoundationV2TrainingTaskSpecHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationTrainingTaskSpecV2',
    schema_version: input.task_spec_schema_version ?? 'v1',
    hash_profile: 'ef-training-task-spec-json@v1',
    content: input,
  });
}

export function serverHashExperimentFoundationV2RunManifest(
  rows: ExperimentFoundationV2RunManifestHashRow[],
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationRunManifestV2',
    schema_version: 'v1',
    hash_profile: 'ef-run-manifest-json@v1',
    // Ordered RunCell rows are the sole manifest authority.
    content: rows.map((row) => ({
      ordinal: row.ordinal,
      cell_key: row.cell_key,
      external_pi_cell_id: row.external_pi_cell_id,
      external_pi_cell_hash: row.external_pi_cell_hash,
      training_task_spec_id: row.training_task_spec_id,
      training_task_spec_hash: row.training_task_spec_hash,
      seed: row.seed,
      repeat_index: row.repeat_index,
    })),
  });
}

export function serverHashPaperImplementationExperimentV2BranchFrame(
  branchFrame: PaperImplementationExperimentV2BranchFrame,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExperimentWorkOrderBranchFrameV2',
    schema_version: branchFrame.frame_schema_version,
    hash_profile: 'pi-work-order-branch-frame-json@v1',
    content: branchFrame,
  });
}

export function serverHashPaperImplementationExperimentV2WorkOrderRevision(
  revision: PaperImplementationExperimentV2WorkOrderRevisionSnapshot,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExperimentWorkOrderRevisionV2',
    schema_version: revision.work_order_schema_version,
    hash_profile: 'pi-work-order-revision-json@v1',
    content: revision,
  });
}

export function serverHashPaperImplementationExperimentV2Cell(
  cell: PaperImplementationExperimentV2ExactCellInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExperimentWorkOrderRevisionCellV2',
    schema_version: 'v1',
    hash_profile: 'pi-work-order-cell-json@v1',
    content: cell,
  });
}

export function serverHashPaperImplementationExperimentV2CellPlan(
  cells: PaperImplementationExperimentV2CellPlanHashRow[],
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExperimentWorkOrderCellPlanV2',
    schema_version: 'v1',
    hash_profile: 'pi-work-order-cell-plan-json@v1',
    content: cells.map((cell) => ({
      ordinal: cell.ordinal,
      cell_hash: cell.cell_hash,
    })),
  });
}

export function serverHashPaperImplementationExperimentV2ApprovedPlan(
  input: PaperImplementationExperimentV2ApprovedPlanHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationExperimentWorkOrderApprovedPlanV2',
    schema_version: 'v1',
    hash_profile: 'pi-work-order-approved-plan-json@v1',
    content: input,
  });
}

export function serverHashExperimentV2EventPayload(
  eventType: string,
  schemaVersion: string,
  payload: unknown,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: eventType,
    schema_version: schemaVersion,
    hash_profile: 'integration-event-payload-json@v1',
    content: payload,
  });
}

/** Hashes a complete validated event so equal payloads cannot hide scope drift. */
export function serverHashExperimentV2EventEnvelope<
  TEvent extends ExperimentV2EventEnvelopeForHash,
>(
  event: TEvent,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: `${event.event_type}:envelope`,
    schema_version: event.schema_version,
    hash_profile: 'integration-event-envelope-json@v1',
    content: event,
  });
}

export type ExperimentFoundationV2ScientificResultHashInput = Omit<
  ExperimentResultCellV2,
  'content_hash'
>;

export interface ExperimentFoundationV2ScientificValidationHashInput {
  run_id: string;
  run_manifest_hash: string;
  ordered_cell_results: ScientificValidationCellResultRefV2[];
  evaluation_protocol: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'EvaluationProtocol';
  };
  validator_profile_version: string;
  validator_profile_hash: string;
  ordered_rule_results: ScientificValidationRuleResultV2[];
  status: ExperimentFoundationScientificValidationStatusV2;
}

export interface ExperimentFoundationV2EvidenceCandidateHashInput {
  run_id: string;
  run_manifest_hash: string;
  validation_report_id: string;
  validation_hash: string;
}

/** Canonical hash for one complete per-cell scientific result envelope. */
export function serverHashExperimentFoundationV2ScientificResult(
  content: ExperimentFoundationV2ScientificResultHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationExperimentResultV2',
    schema_version: content.schema_version,
    hash_profile: 'ef-scientific-result-json@v1',
    content,
  });
}

/**
 * Validation hash covers the complete subject, protocol/validator identities
 * and ordered rule results; a hash omitting any of those cannot qualify evidence.
 */
export function serverHashExperimentFoundationV2ScientificValidation(
  content: ExperimentFoundationV2ScientificValidationHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationScientificValidationReportV2',
    schema_version: 'v1',
    hash_profile: 'ef-scientific-validation-json@v1',
    content,
  });
}

export function serverHashExperimentFoundationV2EvidenceCandidate(
  content: ExperimentFoundationV2EvidenceCandidateHashInput,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationEvidenceCandidateV2',
    schema_version: 'v1',
    hash_profile: 'ef-evidence-candidate-json@v1',
    content,
  });
}

export function serverHashPaperImplementationV2RunEvidenceUnit(
  content: Omit<PaperImplementationRunEvidenceUnitV2, 'content_hash'>,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationRunEvidenceUnitV2',
    schema_version: content.schema_version,
    hash_profile: 'pi-run-evidence-unit-json@v1',
    content,
  });
}

export function serverHashPaperImplementationV2EvidenceTraceManifest(
  content: Omit<PaperImplementationEvidenceTraceManifestV2, 'content_hash'>,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationEvidenceTraceManifestV2',
    schema_version: content.schema_version,
    hash_profile: 'pi-evidence-trace-manifest-json@v1',
    content,
  });
}

/** D-18 closure-input hash over the complete current-effective watermark scope. */
export function serverHashPaperImplementationV2ClosureWatermark(
  content: Omit<ValidationCycleClosureWatermarkV2, 'closure_input_hash'>,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationValidationCycleClosureWatermarkV2',
    schema_version: content.schema_version,
    hash_profile: 'pi-cycle-closure-watermark-json@v1',
    content,
  });
}

/** Closure snapshot hash; ResultInterpretationPacket identity is never a member. */
export function serverHashPaperImplementationV2CycleClosure(
  content: Omit<ValidationCycleClosureV2, 'closure_snapshot_hash'>,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'PaperImplementationValidationCycleClosureV2',
    schema_version: content.schema_version,
    hash_profile: 'pi-cycle-closure-json@v1',
    content,
  });
}

function hashBuffersEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/** Recomputes the producer payload hash; no stored or caller assertion is trusted. */
export function verifyExperimentV2EventPayloadHash(
  event: ExperimentV2PayloadHashedEvent,
): boolean {
  const expected = serverHashExperimentV2EventPayload(
    event.event_type,
    event.schema_version,
    event.payload,
  );
  return hashBuffersEqual(expected, event.payload_hash);
}

export function assertExperimentV2EventPayloadHash(
  event: ExperimentV2PayloadHashedEvent,
): void {
  if (!verifyExperimentV2EventPayloadHash(event)) {
    throw new Error('INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH');
  }
}
