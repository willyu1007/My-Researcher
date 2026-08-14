import { Ajv, type ValidateFunction } from 'ajv';

import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  experimentFoundationExecutionBundleRevisionV2Schema,
  type ExperimentFoundationAliyunRealProviderProfileV2,
  type ExperimentFoundationExecutableTrainingTaskSpecV2,
  type ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
import type {
  PaperImplementationExperimentV2ExactCellInput,
  PaperImplementationExperimentV2ParameterValue,
  PaperImplementationExperimentV2WorkOrderRevisionSnapshot,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentFoundationExecutionBundleRevisionV2,
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentFoundationV2TrainingTaskSpec,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
  serverHashScientificEvidenceP5AuthoritySnapshotV1,
  serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1,
  serverHashScientificEvidenceP5EligibilityRecordV3,
  serverHashScientificEvidenceP5ExecutionPackageV3,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
} from './experiment-foundation-scientific-source-v1-service.js';
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from './experiment-foundation-real-provider-payload-v2-service.js';

export const SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3 =
  'ScientificEvidenceP5ExecutionPackage@v3' as const;
export const SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1 =
  'ScientificEvidenceP5AuthoritySnapshot@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_ELIGIBILITY_RECORD_SCHEMA_V3 =
  'ScientificEvidenceP5EligibilityRecord@v3' as const;
export const SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2 =
  'ScientificEvidenceP5ControlPlaneCredential@v2' as const;
export const SCIENTIFIC_EVIDENCE_P5_OPERATIONAL_TIMELINE_SCHEMA_V3 =
  'ScientificEvidenceP5OperationalTimeline@v3' as const;

export const SCIENTIFIC_EVIDENCE_P5_REQUIRED_CAPABILITY_KEYS = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;
export const SCIENTIFIC_EVIDENCE_P5_LIVE_CAPABILITY_KEYS =
  SCIENTIFIC_EVIDENCE_P5_REQUIRED_CAPABILITY_KEYS.slice(0, 3) as [string, string, string];
export const SCIENTIFIC_EVIDENCE_P5_CLOSURE_CAPABILITY_KEY =
  SCIENTIFIC_EVIDENCE_P5_REQUIRED_CAPABILITY_KEYS[3];

export const SCIENTIFIC_EVIDENCE_P5_ELIGIBILITY_REASON_CODES = [
  'P5_ELIG_PACKAGE_HASH_MISMATCH',
  'P5_ELIG_AUTHORITY_BINDING_INVALID',
  'P5_ELIG_RUN_NOT_FRESH_AND_FROZEN',
  'P5_ELIG_CELL_BINDING_INVALID',
  'P5_ELIG_EXPERIMENTAL_FACTOR_INVALID',
  'P5_ELIG_COMPARABILITY_DRIFT',
  'P5_ELIG_EXECUTION_BUNDLE_INVALID',
  'P5_ELIG_SCIENTIFIC_PROTOCOL_INVALID',
  'P5_ELIG_REAL_PROVIDER_PATH_INVALID',
  'P5_ELIG_OPERATION_BOUND_INVALID',
  'P5_ELIG_COST_BOUND_INVALID',
  'P5_ELIG_OPERATIONAL_TIMELINE_INVALID',
  'P5_ELIG_CREDENTIAL_POLICY_INVALID',
  'P5_ELIG_NAMED_LOCAL_RECOVERY_INVALID',
  'P5_ELIG_FORBIDDEN_FIELD_PRESENT',
] as const;
export type ScientificEvidenceP5EligibilityReasonCode =
  (typeof SCIENTIFIC_EVIDENCE_P5_ELIGIBILITY_REASON_CODES)[number];

interface ExactContentRef {
  id: string;
  content_hash: string;
}

export interface ScientificEvidenceP5CellV1 {
  run_cell: ExperimentFoundationRunCellV2 & { ordinal: 1 | 2 };
  work_order_cell_input: PaperImplementationExperimentV2ExactCellInput;
  training_task_spec: ExperimentFoundationExecutableTrainingTaskSpecV2;
}

export interface ScientificEvidenceP5ControlPlaneSessionPolicyV1 {
  Version: '1';
  Statement: Array<{
    Sid: string;
    Effect: 'Allow';
    Action: string[];
    Resource: string;
  }>;
}

export interface ScientificEvidenceP5OperationalTimelineV3 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_OPERATIONAL_TIMELINE_SCHEMA_V3;
  issuance: {
    not_before: string;
    portal_confirmation_start_not_after: string;
    dispatch_not_after: string;
    minimum_portal_confirmation_margin_seconds: 120;
  };
  qualification: {
    activation: 'after_same_credential_issuance';
    not_before: string;
    expires_at: string;
    minimum_secure_handoff_budget_seconds: 300;
  };
  live: {
    activation: 'after_same_credential_qualification';
    capability_keys: [string, string, string];
    not_before: string;
    latest_start_at: string;
    credential_operations_stop_at: string;
  };
  closure: {
    activation: 'after_verified_credential_cleanup';
    capability_keys: [string];
    not_before: string;
    expires_at: string;
  };
}

export type ScientificEvidenceP5OperationalTimeline =
  ScientificEvidenceP5OperationalTimelineV3;

export function buildScientificEvidenceP5OperationalTimelineV3(
  notBefore: string,
): ScientificEvidenceP5OperationalTimelineV3 {
  const start = Date.parse(notBefore);
  if (!Number.isFinite(start) || new Date(start).toISOString() !== notBefore) {
    throw new Error('T136_P5_OPERATIONAL_TIMELINE_START_INVALID');
  }
  const at = (seconds: number): string => new Date(start + seconds * 1_000).toISOString();
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_OPERATIONAL_TIMELINE_SCHEMA_V3,
    issuance: {
      not_before: notBefore,
      portal_confirmation_start_not_after: at(780),
      dispatch_not_after: at(900),
      minimum_portal_confirmation_margin_seconds: 120,
    },
    qualification: {
      activation: 'after_same_credential_issuance',
      not_before: notBefore,
      expires_at: at(1_200),
      minimum_secure_handoff_budget_seconds: 300,
    },
    live: {
      activation: 'after_same_credential_qualification',
      capability_keys: [...SCIENTIFIC_EVIDENCE_P5_LIVE_CAPABILITY_KEYS],
      not_before: notBefore,
      latest_start_at: at(1_200),
      credential_operations_stop_at: at(3_240),
    },
    closure: {
      activation: 'after_verified_credential_cleanup',
      capability_keys: [SCIENTIFIC_EVIDENCE_P5_CLOSURE_CAPABILITY_KEY],
      not_before: notBefore,
      expires_at: at(5_400),
    },
  };
}

export interface ScientificEvidenceP5ExecutionPackageContentV3 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3;
  p5_attempt_id: string;
  authority: {
    implementation_project_id: string;
    validation_cycle_id: string;
    branch_id: string;
    branch_revision_sequence: number;
    work_order_revision: ExactContentRef & {
      snapshot: PaperImplementationExperimentV2WorkOrderRevisionSnapshot;
    };
    run: ExperimentFoundationRunV2;
  };
  evaluation_protocol: {
    revision: ExperimentFoundationV2ExactAssetRevisionRef & {
      asset_type: 'EvaluationProtocol';
    };
    revision_content: ExperimentFoundationV2EvaluationProtocolRevisionContentV2;
  };
  execution_bundle_revision: ExperimentFoundationExecutionBundleRevisionV2;
  scientific_input_policy: {
    provenance: 'real_provider';
    source: 'ef_parsed_and_sealed_typed_observations';
    manual_result_import: 'forbidden';
    unfetched_artifact_byte_dependency: 'forbidden';
  };
  declared_differing_factor: {
    parameter_name: string;
  };
  ordered_cells: [ScientificEvidenceP5CellV1, ScientificEvidenceP5CellV1];
  provider: {
    provider_kind: 'aliyun_pai_dlc';
    adapter_identity: 'aliyun_pai_dlc_official_sdk@v1';
    collection_reader_identity: 'aliyun_oss_exact_result_reader@v1';
    profile: ExperimentFoundationAliyunRealProviderProfileV2;
  };
  authorized_operations: [
    { ordinal: 1; owner: 'ExperimentFoundation'; operation: 'CreateJob'; run_cell_id: string },
    { ordinal: 2; owner: 'ExperimentFoundation'; operation: 'CreateJob'; run_cell_id: string },
  ];
  cost_ceiling: {
    currency: string;
    per_operation_amount_minor: number;
    total_amount_minor: number;
  };
  operational_timeline: ScientificEvidenceP5OperationalTimeline;
  credential_policy: {
    schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2;
    credential_ref: string;
    secret_material_included: false;
    source_principal: {
      identity_type: 'ram_user';
      arn: string;
    };
    controller_role: {
      arn: string;
      max_session_duration_seconds: number;
      trust_policy_hash: string;
      attached_policy: {
        name: string;
        type: 'Custom';
        version: string;
        document_hash: string;
      };
    };
    role_session_name: string;
    session_policy: ScientificEvidenceP5ControlPlaneSessionPolicyV1;
    session_policy_hash: string;
    issued_duration_seconds: number;
    minimum_remaining_at_live_start_seconds: number;
    credential_operations_stop_before_earliest_expiration_seconds: number;
    automatic_expiration_not_after: string;
    qualification: {
      required: true;
      allowed_operations: [
        'Sts.AssumeRole',
        'Sts.GetCallerIdentity',
        'AIWorkspace.GetWorkspace',
        'PaiImage.GetImage',
      ];
      create_job_forbidden: true;
      product_capabilities_must_remain_disabled: true;
      grants_paid_execution_authority: false;
    };
    remove_process_material: true;
    delete_local_credential_config: true;
    manual_revocation_required: false;
    verify_local_cleanup: true;
    verify_expiration_after_window: true;
    ram_role_or_policy_mutation_forbidden: true;
  };
  named_local: {
    target_fingerprint: string;
    recovery_fingerprint: string;
    recovery_point_created_at: string;
  };
}

export interface ScientificEvidenceP5ExecutionPackageV3
  extends ScientificEvidenceP5ExecutionPackageContentV3 {
  package_hash: string;
}

export interface ScientificEvidenceP5AuthoritySnapshotContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1;
  source: 'named_local_postgres_authority';
  p5_attempt_id: string;
  target_fingerprint: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_revision_sequence: number;
  work_order_revision: ExactContentRef;
  run: ExactContentRef;
  run_is_frozen: boolean;
  ordered_cells: [
    { ordinal: 1; run_cell_id: string; work_order_cell: ExactContentRef; training_task_spec: ExactContentRef },
    { ordinal: 2; run_cell_id: string; work_order_cell: ExactContentRef; training_task_spec: ExactContentRef },
  ];
  existing_create_job_count: number;
  existing_scientific_result_count: number;
}

export interface ScientificEvidenceP5AuthoritySnapshotV1
  extends ScientificEvidenceP5AuthoritySnapshotContentV1 {
  authority_snapshot_hash: string;
}

export interface ScientificEvidenceP5EligibilityRecordV3 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_ELIGIBILITY_RECORD_SCHEMA_V3;
  package_hash: string;
  authority_snapshot_hash: string;
  status: 'eligible' | 'ineligible';
  reason_codes: ScientificEvidenceP5EligibilityReasonCode[];
  eligibility_record_hash: string;
}

export function buildScientificEvidenceP5ExecutionPackageV3(
  content:
    | ScientificEvidenceP5ExecutionPackageContentV3
    | ScientificEvidenceP5ExecutionPackageV3,
): ScientificEvidenceP5ExecutionPackageV3 {
  const { package_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5ExecutionPackageV3;
  return {
    ...snapshot,
    package_hash: serverHashScientificEvidenceP5ExecutionPackageV3(snapshot),
  };
}

export function buildScientificEvidenceP5AuthoritySnapshotV1(
  content:
    | ScientificEvidenceP5AuthoritySnapshotContentV1
    | ScientificEvidenceP5AuthoritySnapshotV1,
): ScientificEvidenceP5AuthoritySnapshotV1 {
  const { authority_snapshot_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5AuthoritySnapshotV1;
  return {
    ...snapshot,
    authority_snapshot_hash: serverHashScientificEvidenceP5AuthoritySnapshotV1(snapshot),
  };
}

export function preflightScientificEvidenceP5PackageV3(input: {
  execution_package: ScientificEvidenceP5ExecutionPackageV3;
  authority_snapshot: ScientificEvidenceP5AuthoritySnapshotV1;
}): ScientificEvidenceP5EligibilityRecordV3 {
  const reasons = new Set<ScientificEvidenceP5EligibilityReasonCode>();
  const executionPackage = input.execution_package;
  const authoritySnapshot = input.authority_snapshot;

  try {
    const { package_hash: _storedHash, ...content } = executionPackage;
    if (
      executionPackage.schema_version !== SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3
      || executionPackage.package_hash !== serverHashScientificEvidenceP5ExecutionPackageV3(content)
    ) {
      reasons.add('P5_ELIG_PACKAGE_HASH_MISMATCH');
    }
    const { authority_snapshot_hash: _storedSnapshotHash, ...snapshotContent } = authoritySnapshot;
    if (
      authoritySnapshot.schema_version !== SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1
      || authoritySnapshot.authority_snapshot_hash
        !== serverHashScientificEvidenceP5AuthoritySnapshotV1(snapshotContent)
    ) {
      reasons.add('P5_ELIG_AUTHORITY_BINDING_INVALID');
    }
  } catch {
    reasons.add('P5_ELIG_PACKAGE_HASH_MISMATCH');
    reasons.add('P5_ELIG_AUTHORITY_BINDING_INVALID');
  }

  addReasonUnless(reasons, 'P5_ELIG_AUTHORITY_BINDING_INVALID', () => (
    validAuthorityIdentities(executionPackage, authoritySnapshot)
    && authorityBindingsMatch(executionPackage, authoritySnapshot)
  ));
  addReasonUnless(reasons, 'P5_ELIG_RUN_NOT_FRESH_AND_FROZEN', () => (
    authoritySnapshot.source === 'named_local_postgres_authority'
    && authoritySnapshot.run_is_frozen === true
    && authoritySnapshot.existing_create_job_count === 0
    && authoritySnapshot.existing_scientific_result_count === 0
    && isIsoTimestamp(executionPackage.authority.run.frozen_at)
  ));
  addReasonUnless(
    reasons,
    'P5_ELIG_CELL_BINDING_INVALID',
    () => validCellBindings(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_EXPERIMENTAL_FACTOR_INVALID',
    () => validDeclaredFactor(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_COMPARABILITY_DRIFT',
    () => cellsAreComparable(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_EXECUTION_BUNDLE_INVALID',
    () => validExecutionBundle(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_SCIENTIFIC_PROTOCOL_INVALID',
    () => validScientificProtocol(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_REAL_PROVIDER_PATH_INVALID',
    () => validRealProviderPath(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_OPERATION_BOUND_INVALID',
    () => validOperationBound(executionPackage),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_COST_BOUND_INVALID',
    () => validCostBound(executionPackage.cost_ceiling),
  );
  addReasonUnless(
    reasons,
    'P5_ELIG_OPERATIONAL_TIMELINE_INVALID',
    () => validOperationalTimeline(executionPackage),
  );
  addReasonUnless(reasons, 'P5_ELIG_CREDENTIAL_POLICY_INVALID', () => (
    validCredentialPolicy(executionPackage)
  ));
  addReasonUnless(reasons, 'P5_ELIG_NAMED_LOCAL_RECOVERY_INVALID', () => (
    validNamedLocalRecovery(
      executionPackage.named_local,
      executionPackage.operational_timeline.issuance.not_before,
    )
  ));
  addReasonUnless(
    reasons,
    'P5_ELIG_FORBIDDEN_FIELD_PRESENT',
    () => !containsForbiddenField(executionPackage),
  );

  const reasonCodes = SCIENTIFIC_EVIDENCE_P5_ELIGIBILITY_REASON_CODES.filter(
    (reason) => reasons.has(reason),
  );
  const content = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_ELIGIBILITY_RECORD_SCHEMA_V3,
    package_hash: executionPackage.package_hash,
    authority_snapshot_hash: authoritySnapshot.authority_snapshot_hash,
    status: reasonCodes.length === 0 ? 'eligible' as const : 'ineligible' as const,
    reason_codes: reasonCodes,
  };
  return {
    ...content,
    eligibility_record_hash: serverHashScientificEvidenceP5EligibilityRecordV3(content),
  };
}

function addReasonUnless(
  reasons: Set<ScientificEvidenceP5EligibilityReasonCode>,
  reason: ScientificEvidenceP5EligibilityReasonCode,
  predicate: () => boolean,
): void {
  try {
    if (!predicate()) reasons.add(reason);
  } catch {
    reasons.add(reason);
  }
}

function authorityBindingsMatch(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
  snapshot: ScientificEvidenceP5AuthoritySnapshotV1,
): boolean {
  const authority = executionPackage.authority;
  const packageProjection = {
    p5_attempt_id: executionPackage.p5_attempt_id,
    target_fingerprint: executionPackage.named_local.target_fingerprint,
    implementation_project_id: authority.implementation_project_id,
    validation_cycle_id: authority.validation_cycle_id,
    branch_id: authority.branch_id,
    branch_revision_sequence: authority.branch_revision_sequence,
    work_order_revision: {
      id: authority.work_order_revision.id,
      content_hash: authority.work_order_revision.content_hash,
    },
    run: { id: authority.run.run_id, content_hash: authority.run.run_manifest_hash },
    ordered_cells: executionPackage.ordered_cells.map((cell) => ({
      ordinal: cell.run_cell.ordinal,
      run_cell_id: cell.run_cell.run_cell_id,
      work_order_cell: {
        id: cell.run_cell.external_pi_cell_id,
        content_hash: cell.run_cell.external_pi_cell_hash,
      },
      training_task_spec: {
        id: cell.training_task_spec.training_task_spec_id,
        content_hash: cell.training_task_spec.task_spec_hash,
      },
    })),
  };
  const snapshotProjection = {
    p5_attempt_id: snapshot.p5_attempt_id,
    target_fingerprint: snapshot.target_fingerprint,
    implementation_project_id: snapshot.implementation_project_id,
    validation_cycle_id: snapshot.validation_cycle_id,
    branch_id: snapshot.branch_id,
    branch_revision_sequence: snapshot.branch_revision_sequence,
    work_order_revision: snapshot.work_order_revision,
    run: snapshot.run,
    ordered_cells: snapshot.ordered_cells,
  };
  return canonicalEqual(packageProjection, snapshotProjection);
}

function validAuthorityIdentities(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
  snapshot: ScientificEvidenceP5AuthoritySnapshotV1,
): boolean {
  const authority = executionPackage.authority;
  return [
    executionPackage.p5_attempt_id,
    authority.implementation_project_id,
    authority.validation_cycle_id,
    authority.branch_id,
  ].every(isNonEmpty)
    && Number.isSafeInteger(authority.branch_revision_sequence)
    && authority.branch_revision_sequence > 0
    && validRef(authority.work_order_revision)
    && authority.work_order_revision.content_hash
      === serverHashPaperImplementationExperimentV2WorkOrderRevision(
        authority.work_order_revision.snapshot,
      )
    && isNonEmpty(authority.run.run_id)
    && isHash(authority.run.run_manifest_hash)
    && authority.run.cell_count === 2
    && authority.run.external_pi_work_order_revision_id
      === authority.work_order_revision.id
    && authority.run.external_pi_work_order_revision_hash
      === authority.work_order_revision.content_hash
    && authority.run.external_pi_branch_revision_sequence
      === authority.branch_revision_sequence
    && Number.isSafeInteger(snapshot.existing_create_job_count)
    && snapshot.existing_create_job_count >= 0
    && Number.isSafeInteger(snapshot.existing_scientific_result_count)
    && snapshot.existing_scientific_result_count >= 0;
}

function validCellBindings(executionPackage: ScientificEvidenceP5ExecutionPackageV3): boolean {
  const cells: readonly ScientificEvidenceP5CellV1[] = executionPackage.ordered_cells;
  if (cells.length !== 2) return false;
  const [left, right] = cells;
  if (
    !left
    || !right
    || left.run_cell.ordinal !== 1
    || right.run_cell.ordinal !== 2
  ) return false;
  const run = executionPackage.authority.run;
  const workOrder = executionPackage.authority.work_order_revision;
  return left.run_cell.run_id === run.run_id
    && right.run_cell.run_id === run.run_id
    && left.run_cell.run_cell_id !== right.run_cell.run_cell_id
    && left.run_cell.cell_key !== right.run_cell.cell_key
    && [left, right].every((cell) => validBoundCell(cell, workOrder))
    && run.run_manifest_hash === serverHashExperimentFoundationV2RunManifest(
      cells.map((cell) => cell.run_cell),
    );
}

function validBoundCell(
  cell: ScientificEvidenceP5CellV1,
  workOrder: ScientificEvidenceP5ExecutionPackageV3['authority']['work_order_revision'],
): boolean {
  const runCell = cell.run_cell;
  const exactCell = cell.work_order_cell_input;
  const task = cell.training_task_spec;
  const admittedCell = {
    ordinal: runCell.ordinal,
    work_order_cell_id: runCell.external_pi_cell_id,
    cell_key: exactCell.cell_key,
    cell_hash: runCell.external_pi_cell_hash,
    seed: exactCell.seed,
    repeat_index: exactCell.repeat_index,
    parameters: exactCell.parameters,
    required_result_contract: exactCell.required_result_contract,
  };
  return isNonEmpty(runCell.run_cell_id)
    && isNonEmpty(runCell.cell_key)
    && isNonEmpty(runCell.external_pi_cell_id)
    && isNonEmpty(runCell.training_task_spec_id)
    && isNonEmpty(task.materialization_key)
    && isNonEmpty(task.run_recipe_id)
    && runCell.cell_key === exactCell.cell_key
    && runCell.seed === exactCell.seed
    && runCell.repeat_index === exactCell.repeat_index
    && Number.isSafeInteger(runCell.seed)
    && Number.isSafeInteger(runCell.repeat_index)
    && runCell.external_pi_cell_hash
      === serverHashPaperImplementationExperimentV2Cell(exactCell)
    && runCell.training_task_spec_id === task.training_task_spec_id
    && runCell.training_task_spec_hash === task.task_spec_hash
    && task.external_pi_work_order_revision_id === workOrder.id
    && task.external_pi_work_order_revision_hash === workOrder.content_hash
    && task.external_pi_cell_id === runCell.external_pi_cell_id
    && task.external_pi_cell_hash === runCell.external_pi_cell_hash
    && task.task_spec_hash === serverHashExperimentFoundationV2TrainingTaskSpec({
      task_spec_schema_version: 'v2',
      materialization_key: task.materialization_key,
      run_recipe_id: task.run_recipe_id,
      external_pi_work_order_revision_id: task.external_pi_work_order_revision_id,
      external_pi_work_order_revision_hash: task.external_pi_work_order_revision_hash,
      external_pi_cell_id: task.external_pi_cell_id,
      external_pi_cell_hash: task.external_pi_cell_hash,
      admitted_cell: admittedCell,
      execution_bundle: task.execution_bundle,
      command_snapshot: task.command_snapshot,
      io_snapshot: task.io_snapshot,
      resource_snapshot: task.resource_snapshot,
      retry_snapshot: task.retry_snapshot,
    });
}

function validDeclaredFactor(executionPackage: ScientificEvidenceP5ExecutionPackageV3): boolean {
  const factorName = executionPackage.declared_differing_factor.parameter_name;
  const [left, right] = executionPackage.ordered_cells;
  if (!isNonEmpty(factorName) || !left || !right) return false;
  const leftParameters = parameterMap(left.work_order_cell_input.parameters);
  const rightParameters = parameterMap(right.work_order_cell_input.parameters);
  if (!leftParameters || !rightParameters) return false;
  const leftNames = [...leftParameters.keys()].sort();
  const rightNames = [...rightParameters.keys()].sort();
  if (!canonicalEqual(leftNames, rightNames)) return false;
  const differingNames = leftNames.filter(
    (name) => !Object.is(leftParameters.get(name), rightParameters.get(name)),
  );
  return differingNames.length === 1 && differingNames[0] === factorName;
}

function cellsAreComparable(executionPackage: ScientificEvidenceP5ExecutionPackageV3): boolean {
  const [left, right] = executionPackage.ordered_cells;
  if (!left || !right) return false;
  const project = (cell: ScientificEvidenceP5CellV1) => ({
    required_result_contract: cell.work_order_cell_input.required_result_contract,
    execution_bundle: cell.training_task_spec.execution_bundle,
    command_snapshot: {
      command: cell.training_task_spec.command_snapshot.command,
      arguments: cell.training_task_spec.command_snapshot.arguments.filter(
        (argument) => argument !== `--cell-key=${cell.work_order_cell_input.cell_key}`,
      ),
    },
    io_snapshot: cell.training_task_spec.io_snapshot,
    resource_snapshot: cell.training_task_spec.resource_snapshot,
    retry_snapshot: cell.training_task_spec.retry_snapshot,
  });
  return left.work_order_cell_input.seed === right.work_order_cell_input.seed
    && left.work_order_cell_input.repeat_index === right.work_order_cell_input.repeat_index
    && canonicalEqual(project(left), project(right));
}

function validScientificProtocol(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
): boolean {
  const protocolRef = executionPackage.evaluation_protocol.revision;
  const protocol = executionPackage.evaluation_protocol.revision_content;
  const contract = protocol.scientific_contract;
  const primaryRule = contract?.comparison_rules?.find(
    (rule) => rule.comparison_key === contract.primary_comparison_key,
  );
  const observationSlot = contract?.observation_slots.find(
    (slot) => slot.observation_key === primaryRule?.observation_key,
  );
  const metricRule = protocol.required_rules.find((rule) => (
    rule.rule_type === 'metric_contract@v1'
    && rule.metric_key === observationSlot?.metric_key
    && rule.split_key === observationSlot.split_key
  ));
  const exits = [
    contract?.decision_if_positive,
    contract?.decision_if_negative,
    contract?.decision_if_inconclusive,
  ];
  return protocolRef.asset_type === 'EvaluationProtocol'
    && validAssetRef(protocolRef)
    && protocolRef.content_hash === serverHashExperimentFoundationV2AssetRevision({
      asset_type: 'EvaluationProtocol',
      content: protocol,
    })
    && contract !== undefined
    && contract.comparison_rules !== undefined
    && contract.comparison_rules.length > 0
    && primaryRule !== undefined
    && primaryRule.left_cell_ordinal === 1
    && primaryRule.right_cell_ordinal === 2
    && primaryRule.effect_kind === 'absolute_difference'
    && Number.isFinite(primaryRule.support_min)
    && Number.isFinite(primaryRule.contradiction_max)
    && primaryRule.contradiction_max < primaryRule.support_min
    && observationSlot !== undefined
    && metricRule?.rule_type === 'metric_contract@v1'
    && metricRule.value_type === observationSlot.value_type
    && metricRule.unit === observationSlot.unit
    && metricRule.required_cardinality > 0
    && protocol.metric_dependencies.some(
      (dependency) => canonicalEqual(dependency, metricRule.metric_definition),
    )
    && exits.every((exit) => exit !== undefined && isNonEmpty(exit))
    && new Set(exits).size === 3
    && executionPackage.scientific_input_policy.provenance === 'real_provider'
    && executionPackage.scientific_input_policy.source
      === 'ef_parsed_and_sealed_typed_observations'
    && executionPackage.scientific_input_policy.manual_result_import === 'forbidden'
    && executionPackage.scientific_input_policy.unfetched_artifact_byte_dependency === 'forbidden'
    && executionPackage.ordered_cells.every((cell) => (
      cell.work_order_cell_input.required_result_contract.metrics.some((requiredMetric) => (
        canonicalEqual(requiredMetric.metric_definition, metricRule.metric_definition)
        && requiredMetric.required_cardinality > 0
      ))
    ));
}

const p5Ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const executionBundleRevisionValidator: ValidateFunction<ExperimentFoundationExecutionBundleRevisionV2> =
  p5Ajv.compile<ExperimentFoundationExecutionBundleRevisionV2>(
    experimentFoundationExecutionBundleRevisionV2Schema,
  );

function validExecutionBundle(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
): boolean {
  const revision = executionPackage.execution_bundle_revision;
  if (!executionBundleRevisionValidator(revision)) return false;
  const content = revision.revision_content;
  const workOrderSnapshot = executionPackage.authority.work_order_revision.snapshot;
  if (
    workOrderSnapshot.work_order_schema_version !== 'v2'
    || revision.schema_version !== 'v2'
    || content.execution_bundle_schema_version !== 'v2'
    || revision.content_hash
      !== serverHashExperimentFoundationExecutionBundleRevisionV2(content)
    || content.container_image.provider_managed_asset.permitted_scope
      !== 'm0_sci_p5_scientific_only'
    || content.output_contract.parser_profile_version
      !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1
    || content.output_contract.parser_profile_hash
      !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1
    || content.output_contract.scientific_result_schema_version
      !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1
    || content.output_contract.scientific_result_schema_hash
      !== EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1
    || executionPackage.provider.profile.image_uri !== content.container_image.image_ref
    || !canonicalEqual(
      workOrderSnapshot.execution_bundle,
      executionBundleRef(revision),
    )
  ) return false;

  const dependencyKeys = new Set(
    workOrderSnapshot.asset_dependencies.map(
      (dependency) => `${dependency.asset_type}:${dependency.revision_id}:${dependency.content_hash}`,
    ),
  );
  return content.dataset_mirrors.length > 0
    && content.dataset_mirrors.every((mirror) => dependencyKeys.has(
      `${mirror.dataset_revision.asset_type}:${mirror.dataset_revision.revision_id}`
        + `:${mirror.dataset_revision.content_hash}`,
    ))
    && executionPackage.ordered_cells.every((cell) => (
      canonicalEqual(cell.training_task_spec.execution_bundle, executionBundleRef(revision))
      && cell.training_task_spec.io_snapshot.result_object_name
        === content.output_contract.result_object_name
      && cell.training_task_spec.io_snapshot.result_envelope_schema
        === content.output_contract.result_envelope_schema
      && cell.training_task_spec.io_snapshot.parser_profile_version
        === content.output_contract.parser_profile_version
      && cell.training_task_spec.io_snapshot.parser_profile_hash
        === content.output_contract.parser_profile_hash
      && cell.training_task_spec.io_snapshot.scientific_result_schema_version
        === content.output_contract.scientific_result_schema_version
      && cell.training_task_spec.io_snapshot.scientific_result_schema_hash
        === content.output_contract.scientific_result_schema_hash
      && canonicalEqual(
        cell.training_task_spec.io_snapshot.input_mirror_ordinals,
        content.dataset_mirrors.map((mirror) => mirror.ordinal),
      )
    ));
}

function executionBundleRef(
  revision: ExperimentFoundationExecutionBundleRevisionV2,
) {
  return {
    execution_bundle_id: revision.execution_bundle_id,
    execution_bundle_revision_id: revision.execution_bundle_revision_id,
    revision_sequence: revision.revision_sequence,
    content_hash: revision.content_hash,
  };
}

function validRealProviderPath(executionPackage: ScientificEvidenceP5ExecutionPackageV3): boolean {
  const provider = executionPackage.provider;
  const workOrderSnapshot = executionPackage.authority.work_order_revision.snapshot;
  if (workOrderSnapshot.work_order_schema_version !== 'v2') return false;
  const dependencies = workOrderSnapshot.asset_dependencies;
  const protocol = executionPackage.evaluation_protocol;
  return provider.provider_kind === 'aliyun_pai_dlc'
    && provider.adapter_identity === 'aliyun_pai_dlc_official_sdk@v1'
    && provider.collection_reader_identity === 'aliyun_oss_exact_result_reader@v1'
    && provider.profile.schema_version === 'AliyunPaiDlcRealProviderProfile@v1'
    && [
      provider.profile.region_id,
      provider.profile.workspace_id,
      provider.profile.image_uri,
    ].every(isNonEmpty)
    && dependencies.length > 0
    && dependencies.every(validAssetRef)
    && dependencies.some((asset) => asset.asset_type === 'Dataset')
    && dependencies.some((asset) => canonicalEqual(asset, protocol.revision))
    && dependencies.some(
      (asset) => canonicalEqual(asset, protocol.revision_content.benchmark_dependency),
    )
    && protocol.revision_content.metric_dependencies.every(
      (metric) => dependencies.some((asset) => canonicalEqual(asset, metric)),
    )
    && uniqueBy(dependencies, (asset) => `${asset.asset_type}:${asset.logical_id}:${asset.revision_id}`)
    && workOrderSnapshot.run_policy.max_attempts_per_cell === 1
    && executionPackage.ordered_cells.every((cell) => (
      canonicalEqual(cell.training_task_spec.execution_bundle, workOrderSnapshot.execution_bundle)
      && cell.training_task_spec.retry_snapshot.max_attempts === 1
      && isNonEmpty(cell.training_task_spec.io_snapshot.parser_profile_version)
      && isHash(cell.training_task_spec.io_snapshot.parser_profile_hash)
      && isNonEmpty(cell.training_task_spec.io_snapshot.scientific_result_schema_version ?? '')
      && isHash(cell.training_task_spec.io_snapshot.scientific_result_schema_hash ?? '')
    ))
    && exactProviderPayloadsMaterialize(executionPackage);
}

function exactProviderPayloadsMaterialize(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
): boolean {
  const service = new ExperimentFoundationRealProviderPayloadV2Service();
  try {
    for (const cell of executionPackage.ordered_cells) {
      service.materialize({
        run: executionPackage.authority.run,
        run_cell: cell.run_cell,
        task_spec: cell.training_task_spec,
        execution_bundle_revision: executionPackage.execution_bundle_revision,
        provider_idempotency_key:
          `${executionPackage.p5_attempt_id}:${cell.run_cell.run_cell_id}:preflight`,
      }, executionPackage.provider.profile);
    }
    return true;
  } catch {
    return false;
  }
}

function validOperationBound(executionPackage: ScientificEvidenceP5ExecutionPackageV3): boolean {
  const operations: ReadonlyArray<{
    ordinal: number;
    owner: string;
    operation: string;
    run_cell_id: string;
  }> = executionPackage.authorized_operations;
  if (operations.length !== 2) return false;
  return operations.every((operation, index) => {
    const cell = executionPackage.ordered_cells[index];
    return cell !== undefined
      && operation.ordinal === index + 1
      && operation.owner === 'ExperimentFoundation'
      && operation.operation === 'CreateJob'
      && operation.run_cell_id === cell.run_cell.run_cell_id
      && cell.training_task_spec.retry_snapshot.max_attempts === 1;
  });
}

function validCostBound(cost: ScientificEvidenceP5ExecutionPackageV3['cost_ceiling']): boolean {
  return /^[A-Z]{3}$/.test(cost.currency)
    && isPositiveSafeInteger(cost.per_operation_amount_minor)
    && isPositiveSafeInteger(cost.total_amount_minor)
    && cost.per_operation_amount_minor <= Math.floor(Number.MAX_SAFE_INTEGER / 2)
    && cost.total_amount_minor >= cost.per_operation_amount_minor
    && cost.total_amount_minor <= cost.per_operation_amount_minor * 2;
}

function validOperationalTimeline(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
): boolean {
  const timeline = executionPackage.operational_timeline;
  const policy = executionPackage.credential_policy;
  if (timeline.schema_version !== SCIENTIFIC_EVIDENCE_P5_OPERATIONAL_TIMELINE_SCHEMA_V3) {
    return false;
  }
  const timelinePolicy = {
    expected: buildScientificEvidenceP5OperationalTimelineV3(
      timeline.issuance.not_before,
    ),
    minimumSecureHandoffSeconds: 300,
    minimumRemainingAtLiveStartSeconds: 2_400,
    minimumPortalConfirmationMarginSeconds: 120,
  };
  const issuanceNotBefore = Date.parse(timeline.issuance.not_before);
  const dispatchNotAfter = Date.parse(timeline.issuance.dispatch_not_after);
  const portalConfirmationStartNotAfter = Date.parse(
    timeline.issuance.portal_confirmation_start_not_after,
  );
  const qualificationNotBefore = Date.parse(timeline.qualification.not_before);
  const qualificationExpiresAt = Date.parse(timeline.qualification.expires_at);
  const liveNotBefore = Date.parse(timeline.live.not_before);
  const liveLatestStartAt = Date.parse(timeline.live.latest_start_at);
  const credentialOperationsStopAt = Date.parse(
    timeline.live.credential_operations_stop_at,
  );
  const closureNotBefore = Date.parse(timeline.closure.not_before);
  const closureExpiresAt = Date.parse(timeline.closure.expires_at);
  const issuedDurationMs = policy.issued_duration_seconds * 1_000;
  const earliestExpiration = issuanceNotBefore + issuedDurationMs;
  const latestExpiration = dispatchNotAfter + issuedDurationMs;
  const liveStopMarginMs =
    policy.credential_operations_stop_before_earliest_expiration_seconds * 1_000;
  return canonicalEqual(timeline, timelinePolicy.expected)
    && [
      timeline.issuance.not_before,
      timeline.issuance.portal_confirmation_start_not_after,
      timeline.issuance.dispatch_not_after,
      timeline.qualification.not_before,
      timeline.qualification.expires_at,
      timeline.live.not_before,
      timeline.live.latest_start_at,
      timeline.live.credential_operations_stop_at,
      timeline.closure.not_before,
      timeline.closure.expires_at,
    ].every(isIsoTimestamp)
    && issuanceNotBefore < dispatchNotAfter
    && portalConfirmationStartNotAfter > issuanceNotBefore
    && dispatchNotAfter - portalConfirmationStartNotAfter
      === timelinePolicy.minimumPortalConfirmationMarginSeconds * 1_000
    && timeline.issuance.minimum_portal_confirmation_margin_seconds
      === timelinePolicy.minimumPortalConfirmationMarginSeconds
    && qualificationNotBefore === issuanceNotBefore
    && qualificationExpiresAt - dispatchNotAfter
      >= timeline.qualification.minimum_secure_handoff_budget_seconds * 1_000
    && timeline.qualification.activation === 'after_same_credential_issuance'
    && timeline.qualification.minimum_secure_handoff_budget_seconds
      === timelinePolicy.minimumSecureHandoffSeconds
    && timeline.live.activation === 'after_same_credential_qualification'
    && liveNotBefore === issuanceNotBefore
    && liveLatestStartAt === qualificationExpiresAt
    && credentialOperationsStopAt > liveLatestStartAt
    && earliestExpiration - liveLatestStartAt
      >= policy.minimum_remaining_at_live_start_seconds * 1_000
    && policy.minimum_remaining_at_live_start_seconds
      === timelinePolicy.minimumRemainingAtLiveStartSeconds
    && credentialOperationsStopAt <= earliestExpiration - liveStopMarginMs
    && policy.automatic_expiration_not_after === new Date(latestExpiration).toISOString()
    && timeline.closure.activation === 'after_verified_credential_cleanup'
    && closureNotBefore === liveNotBefore
    && closureExpiresAt > credentialOperationsStopAt
    && closureExpiresAt >= latestExpiration
    && canonicalEqual(
      timeline.live.capability_keys,
      SCIENTIFIC_EVIDENCE_P5_LIVE_CAPABILITY_KEYS,
    )
    && canonicalEqual(
      timeline.closure.capability_keys,
      [SCIENTIFIC_EVIDENCE_P5_CLOSURE_CAPABILITY_KEY],
    );
}

function validCredentialPolicy(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
): boolean {
  const policy = executionPackage.credential_policy;
  const attemptMatch = /^t136-p5-scifact-attempt-([1-9][0-9]*)$/.exec(
    executionPackage.p5_attempt_id,
  );
  const controllerMatch = /^acs:ram::(\d+):role\/(pea-m7-canary-controller)$/.exec(
    policy.controller_role.arn,
  );
  const sourceMatch = /^acs:ram::(\d+):user\/([A-Za-z0-9+=,.@_-]+)$/.exec(
    policy.source_principal.arn,
  );
  const expectedSessionPolicy = controllerMatch === null
    ? null
    : expectedControlPlaneSessionPolicy({
        accountId: controllerMatch[1],
        regionId: executionPackage.provider.profile.region_id,
        workspaceId: executionPackage.provider.profile.workspace_id,
        runtimeRoleArn: executionPackage.provider.profile.workload_binding.runtime_role_arn,
        outputUriPrefix: executionPackage.provider.profile.workload_binding.output_uri_prefix,
        runId: executionPackage.authority.run.run_id,
      });
  return policy.schema_version === SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2
    && /^(?:env:\/\/[A-Z][A-Z0-9_]*|secret-ref:\/\/[A-Za-z0-9._/-]+)$/.test(
      policy.credential_ref,
    )
    && policy.secret_material_included === false
    && policy.source_principal.identity_type === 'ram_user'
    && sourceMatch !== null
    && controllerMatch !== null
    && sourceMatch[1] === controllerMatch[1]
    && policy.controller_role.arn
      !== executionPackage.provider.profile.workload_binding.runtime_role_arn
    && policy.controller_role.max_session_duration_seconds === 3_600
    && isHash(policy.controller_role.trust_policy_hash)
    && policy.controller_role.attached_policy.name === controllerMatch[2]
    && policy.controller_role.attached_policy.type === 'Custom'
    && /^v[1-9][0-9]*$/.test(policy.controller_role.attached_policy.version)
    && isHash(policy.controller_role.attached_policy.document_hash)
    && /^[A-Za-z0-9+=,.@_-]{2,64}$/.test(policy.role_session_name)
    && attemptMatch !== null
    && policy.role_session_name === `t136-p5-scifact-${
      executionPackage.operational_timeline.issuance.not_before
        .slice(0, 10)
        .replaceAll('-', '')
    }-r${Number(attemptMatch[1]) + 2}`
    && expectedSessionPolicy !== null
    && canonicalEqual(policy.session_policy, expectedSessionPolicy)
    && policy.session_policy_hash
      === serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1(policy.session_policy)
    && policy.issued_duration_seconds === 3_600
    && policy.issued_duration_seconds <= policy.controller_role.max_session_duration_seconds
    && policy.minimum_remaining_at_live_start_seconds === 2_400
    && policy.credential_operations_stop_before_earliest_expiration_seconds === 360
    && isIsoTimestamp(policy.automatic_expiration_not_after)
    && canonicalEqual(policy.qualification.allowed_operations, [
      'Sts.AssumeRole',
      'Sts.GetCallerIdentity',
      'AIWorkspace.GetWorkspace',
      'PaiImage.GetImage',
    ])
    && policy.qualification.required === true
    && policy.qualification.create_job_forbidden === true
    && policy.qualification.product_capabilities_must_remain_disabled === true
    && policy.qualification.grants_paid_execution_authority === false
    && policy.remove_process_material === true
    && policy.delete_local_credential_config === true
    && policy.manual_revocation_required === false
    && policy.verify_local_cleanup === true
    && policy.verify_expiration_after_window === true
    && policy.ram_role_or_policy_mutation_forbidden === true;
}

function expectedControlPlaneSessionPolicy(input: {
  accountId: string;
  regionId: string;
  workspaceId: string;
  runtimeRoleArn: string;
  outputUriPrefix: string;
  runId: string;
}): ScientificEvidenceP5ControlPlaneSessionPolicyV1 | null {
  const outputMatch = /^oss:\/\/([^/]+)\/(.+\/)$/.exec(input.outputUriPrefix);
  if (outputMatch === null) return null;
  const bucketName = outputMatch[1]?.replace(/\.oss-[a-z0-9-]+(?:-internal)?\.aliyuncs\.com$/, '');
  if (!bucketName || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucketName)) return null;
  return {
    Version: '1',
    Statement: [
      {
        Sid: 'T136P5ControllerPaiDlcExact',
        Effect: 'Allow',
        Action: ['paidlc:CreateJob', 'paidlc:GetJob', 'paidlc:ListJobs', 'paidlc:StopJob'],
        Resource: '*',
      },
      {
        Sid: 'T136P5ControllerWorkspaceExact',
        Effect: 'Allow',
        Action: ['paiworkspace:GetWorkspace'],
        Resource: `acs:paiworkspace:${input.regionId}:${input.accountId}:workspace/${input.workspaceId}`,
      },
      {
        Sid: 'T136P5ControllerPassRuntimeRoleExact',
        Effect: 'Allow',
        Action: ['ram:PassRole'],
        Resource: input.runtimeRoleArn,
      },
      {
        Sid: 'T136P5ControllerImageRead',
        Effect: 'Allow',
        Action: ['paiimage:GetImage'],
        Resource: '*',
      },
      {
        Sid: 'T136P5ControllerResultReadExact',
        Effect: 'Allow',
        Action: ['oss:GetObject'],
        Resource: `acs:oss:*:*:${bucketName}/${outputMatch[2]}${input.runId}/*`,
      },
      {
        Sid: 'T136P5ControllerCallerIdentity',
        Effect: 'Allow',
        Action: ['sts:GetCallerIdentity'],
        Resource: '*',
      },
    ],
  };
}

function validNamedLocalRecovery(
  namedLocal: ScientificEvidenceP5ExecutionPackageV3['named_local'],
  issuanceNotBefore: string,
): boolean {
  return isHash(namedLocal.target_fingerprint)
    && isHash(namedLocal.recovery_fingerprint)
    && namedLocal.target_fingerprint !== namedLocal.recovery_fingerprint
    && isIsoTimestamp(namedLocal.recovery_point_created_at)
    && isIsoTimestamp(issuanceNotBefore)
    && Date.parse(namedLocal.recovery_point_created_at) <= Date.parse(issuanceNotBefore);
}

function parameterMap(
  parameters: PaperImplementationExperimentV2ParameterValue[],
): Map<string, PaperImplementationExperimentV2ParameterValue['value']> | null {
  const result = new Map<string, PaperImplementationExperimentV2ParameterValue['value']>();
  for (const parameter of parameters) {
    if (!isNonEmpty(parameter.name) || result.has(parameter.name)) return null;
    result.set(parameter.name, parameter.value);
  }
  return result;
}

const FORBIDDEN_FIELDS = new Set([
  'access_key_secret',
  'api_key',
  'credential_secret',
  'desired_disposition',
  'expected_disposition',
  'expected_outcome',
  'manual_override',
  'password',
  'private_key',
  'secret',
  'secret_value',
  'security_token',
  'token',
]);

function containsForbiddenField(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsForbiddenField(item, seen));
  return Object.entries(value).some(
    ([key, child]) => FORBIDDEN_FIELDS.has(key.toLowerCase())
      || containsForbiddenField(child, seen),
  );
}

function validRef(ref: ExactContentRef): boolean {
  return isNonEmpty(ref.id) && isHash(ref.content_hash);
}

function validAssetRef(ref: ExperimentFoundationV2ExactAssetRevisionRef): boolean {
  return isNonEmpty(ref.logical_id)
    && isNonEmpty(ref.revision_id)
    && Number.isSafeInteger(ref.revision_sequence)
    && ref.revision_sequence > 0
    && isHash(ref.content_hash);
}

function uniqueBy<T>(values: T[], key: (value: T) => string): boolean {
  return new Set(values.map(key)).size === values.length;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
  } catch {
    return false;
  }
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function isHash(value: string): boolean {
  return /^sha256:[0-9a-f]{64}$/.test(value);
}

function isIsoTimestamp(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
