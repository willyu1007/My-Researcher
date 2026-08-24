import { Ajv } from 'ajv';

import type {
  CreatePaperImplementationCoordinatorRunRequest,
  PaperImplementationCoordinatorRun,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import {
  paperImplementationValidationCyclePlanningArtifactSchema,
  type PaperImplementationValidationCyclePlanningArtifact,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  CreateValidationCycleDraftRequest,
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const validationPlanningArtifactValidator = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
}).compile<PaperImplementationValidationCyclePlanningArtifact>(
  paperImplementationValidationCyclePlanningArtifactSchema,
);

export function parseValidationPlanningArtifact(
  value: Record<string, unknown>,
): PaperImplementationValidationCyclePlanningArtifact {
  if (!validationPlanningArtifactValidator(value)) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'Selected validation-planning artifact does not satisfy its persisted runtime schema.',
    );
  }
  return value;
}

export function assertExpectedCoordinatorRun(
  run: PaperImplementationCoordinatorRun,
  request: CreatePaperImplementationCoordinatorRunRequest,
  implementationProjectId: string,
): void {
  const expected = {
    coordinator_run_id: request.coordinator_run_id,
    implementation_project_id: implementationProjectId,
    lane_id: request.lane_id,
    run_mode: request.run_mode,
    execution_mode: request.execution_mode,
    model_profile_id: request.model_profile_id ?? null,
    model_option_id: request.model_option_id ?? null,
    slot_request_payloads: request.slot_request_payloads,
  };
  const actual = {
    coordinator_run_id: run.coordinator_run_id,
    implementation_project_id: run.implementation_project_id,
    lane_id: run.lane_id,
    run_mode: run.run_mode,
    execution_mode: run.execution_mode,
    model_profile_id: run.model_profile_id,
    model_option_id: run.model_option_id,
    slot_request_payloads: run.slot_request_payloads,
  };
  if (
    stableStringify(actual) !== stableStringify(expected)
    || !coordinatorBudgetMatches(run, request.budget_envelope)
  ) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'Deterministic validation-planning run is bound to different server-owned semantics.',
    );
  }
}

function coordinatorBudgetMatches(
  run: PaperImplementationCoordinatorRun,
  initialBudget: CreatePaperImplementationCoordinatorRunRequest['budget_envelope'],
): boolean {
  if (stableStringify(run.budget_envelope) === stableStringify(initialBudget)) return true;
  const events = run.budget_raise_events ?? [];
  let expectedFrom = initialBudget;
  for (const event of events) {
    if (stableStringify(event.from) !== stableStringify(expectedFrom)) return false;
    if (
      event.to.max_steps < event.from.max_steps
      || event.to.max_provider_calls < event.from.max_provider_calls
    ) {
      return false;
    }
    expectedFrom = event.to;
  }
  return events.length > 0
    && stableStringify(expectedFrom) === stableStringify(run.budget_envelope);
}

export function assertExpectedValidationCycle(
  cycle: ValidationCycle,
  request: CreateValidationCycleDraftRequest,
  implementationProjectId: string,
): void {
  const context = request.context;
  const expected = {
    validation_cycle_id: request.validation_cycle_id,
    implementation_project_id: implementationProjectId,
    input_snapshot_id: context?.input_snapshot_id,
    target: request.target,
    trigger: request.trigger,
    cycle_type: request.cycle_type,
    validation_frame: request.validation_frame,
    context: {
      implementation_project_id: implementationProjectId,
      input_snapshot_id: context?.input_snapshot_id,
      context_policy_version_id: context?.context_policy_version_id,
      included_refs: context?.included_refs,
      excluded_context_notes: context?.excluded_context_notes,
      input_snapshot_hash: context?.input_snapshot_hash,
      created_by: request.created_by,
    },
    criteria: request.criteria,
    budget: request.budget,
    confirmation_level: request.confirmation_level,
    confirmed_by: request.confirmed_by ?? null,
    policy_version_id: request.policy_version_id,
    source_proposal_artifact_ref: request.source_proposal_artifact_ref,
    source_proposal_artifact_hash: request.source_proposal_artifact_hash,
    created_by: request.created_by,
  };
  const actual = {
    validation_cycle_id: cycle.validation_cycle_id,
    implementation_project_id: cycle.implementation_project_id,
    input_snapshot_id: cycle.input_snapshot_id,
    target: cycle.target,
    trigger: cycle.trigger,
    cycle_type: cycle.cycle_type,
    validation_frame: cycle.validation_frame,
    context: {
      implementation_project_id: cycle.context.implementation_project_id,
      input_snapshot_id: cycle.context.input_snapshot_id,
      context_policy_version_id: cycle.context.context_policy_version_id,
      included_refs: cycle.context.included_refs,
      excluded_context_notes: cycle.context.excluded_context_notes,
      input_snapshot_hash: cycle.context.input_snapshot_hash,
      created_by: cycle.context.created_by,
    },
    criteria: cycle.criteria,
    budget: cycle.budget,
    confirmation_level: cycle.confirmation_level,
    confirmed_by: cycle.confirmed_by ?? null,
    policy_version_id: cycle.policy_version_id,
    source_proposal_artifact_ref: cycle.source_proposal_artifact_ref,
    source_proposal_artifact_hash: cycle.source_proposal_artifact_hash,
    created_by: cycle.created_by,
  };
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'Deterministic ValidationCycle identity is bound to different semantics.',
    );
  }
}

export function assertAdmittedValidationCycleLineage(
  cycle: ValidationCycle,
  traceManifestId: string,
  gateResultId: string,
  titleCardId: string,
): void {
  if (
    cycle.trace_manifest_id !== traceManifestId
    || cycle.gate_result_id !== gateResultId
    || !cycle.trace_manifest_ref
    || !functionalRefTargets(
      cycle.trace_manifest_ref,
      'trace_manifest',
      traceManifestId,
      titleCardId,
      false,
    )
  ) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'Recovered ValidationCycle admission lineage is not deterministic.',
    );
  }
}

export function assertTraceTarget(
  trace: { implementation_project_id: string; target_ref: TopicSelectionFunctionalRef },
  targetType: string,
  targetId: string,
  implementationProjectId: string,
  titleCardId: string,
  label: string,
): void {
  if (
    trace.implementation_project_id !== implementationProjectId
    || !functionalRefTargets(trace.target_ref, targetType, targetId, titleCardId, false)
  ) {
    throw new AppError(409, 'VERSION_CONFLICT', `${label} trace authority targets a different owner.`);
  }
}

export function createFunctionalRef(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId?: string | null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

export function deterministicHandoffId(prefix: string, seed: string): string {
  return `${prefix}_${sha256Text(seed).slice(0, 32)}`;
}

export function sameFunctionalRef(
  left: TopicSelectionFunctionalRef,
  right: TopicSelectionFunctionalRef,
): boolean {
  return normalizedRefType(left.ref_type) === normalizedRefType(right.ref_type)
    && left.ref_id === right.ref_id
    && (left.version_id ?? null) === (right.version_id ?? null)
    && (left.title_card_id ?? null) === (right.title_card_id ?? null);
}

export function functionalRefTargets(
  ref: TopicSelectionFunctionalRef,
  refType: string,
  refId: string,
  titleCardId: string,
  allowNullTitleCard: boolean,
): boolean {
  return normalizedRefType(ref.ref_type) === normalizedRefType(refType)
    && ref.ref_id === refId
    && (
      ref.title_card_id === titleCardId
      || (allowNullTitleCard && (ref.title_card_id ?? null) === null)
    );
}

function normalizedRefType(refType: string): string {
  return refType.replaceAll('_', '').toLowerCase();
}

export function uniqueFunctionalRefs(
  refs: TopicSelectionFunctionalRef[],
): TopicSelectionFunctionalRef[] {
  const byKey = new Map(refs.map((ref) => [stableStringify(ref), ref]));
  return [...byKey.values()];
}
