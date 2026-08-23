import type {
  PaperImplementationAgentWorkflowType,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-agent-common-contracts';
import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ListPaperImplementationRuntimeAdmissionRecordsFilter,
} from '../repositories/paper-implementation-runtime.repository.js';
import { assertAdmittedPassedFinal } from './paper-implementation-runtime-artifact-consumption.js';
import {
  hasText,
  normalizedPaperImplementationRefType,
} from './paper-implementation-runtime-utils.js';

/**
 * Read-only surface of PaperImplementationRuntimeAdmissionService used by the
 * acceptance bridge. Deterministic authority creation only reads runtime
 * artifacts and admission records; it never writes runtime state.
 */
export type PaperImplementationAcceptanceBridgeAdmissionReader = {
  getRuntimeArtifact(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope>;
  listAdmissionRecords(
    implementationProjectId: string,
    filter?: ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ): Promise<PaperImplementationRuntimeAdmissionRecord[]>;
};

export const PAPER_IMPLEMENTATION_ACCEPTANCE_BRIDGE_TARGET_TYPES = [
  'technical_route_candidate',
  'validation_cycle',
  'feasibility_probe',
  'experiment_plan_light',
  'research_work_order',
  'core_motive_version',
] as const;
export type PaperImplementationAcceptanceBridgeTargetType =
  (typeof PAPER_IMPLEMENTATION_ACCEPTANCE_BRIDGE_TARGET_TYPES)[number];

/**
 * Deterministic mapping between the authority object being created and the
 * runtime workflow_type whose admitted final proposal may seed it.
 */
export const PAPER_IMPLEMENTATION_ACCEPTANCE_BRIDGE_WORKFLOW_TYPES: Readonly<
  Record<PaperImplementationAcceptanceBridgeTargetType, readonly PaperImplementationAgentWorkflowType[]>
> = {
  technical_route_candidate: ['route_architecture'],
  validation_cycle: ['validation_cycle_planning'],
  feasibility_probe: ['feasibility_planning'],
  experiment_plan_light: ['feasibility_planning'],
  research_work_order: ['experiment_design'],
  core_motive_version: ['core_motive_bootstrap', 'motive_decomposition'],
};

export interface PaperImplementationAcceptanceBridgeLineage {
  source_proposal_artifact_ref: TopicSelectionFunctionalRef;
  source_proposal_artifact_hash: string;
}

export interface PaperImplementationAcceptanceBridgeLineageRequest {
  source_proposal_artifact_ref?: TopicSelectionFunctionalRef | null;
  source_proposal_artifact_hash?: string | null;
}

const RUNTIME_ARTIFACT_REF_TYPE = 'paper_implementation_runtime_artifact';

function gateFailure(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(409, 'GATE_CONSTRAINT_FAILED', message, details);
}

/**
 * Acceptance bridge lineage validator (S1-W1).
 *
 * When a Create* request carries source_proposal_artifact_ref/hash, this
 * verifies the referenced runtime proposal is an admitted, passed final
 * artifact of the expected workflow before its lineage may be written onto a
 * deterministic authority object. Absent lineage fields keep the manual
 * creation path fully unchanged (returns null).
 */
export async function requireAcceptedProposalLineage(options: {
  runtimeAdmission: PaperImplementationAcceptanceBridgeAdmissionReader | undefined;
  implementationProjectId: string;
  targetType: PaperImplementationAcceptanceBridgeTargetType;
  request: PaperImplementationAcceptanceBridgeLineageRequest;
}): Promise<PaperImplementationAcceptanceBridgeLineage | null> {
  const {
    runtimeAdmission,
    implementationProjectId,
    targetType,
    request,
  } = options;
  const sourceRef = request.source_proposal_artifact_ref ?? null;
  const sourceHash = request.source_proposal_artifact_hash ?? null;
  if (sourceRef === null && sourceHash === null) {
    return null;
  }
  if (sourceRef === null || !hasText(sourceHash)) {
    throw gateFailure(
      'Acceptance bridge lineage requires both source_proposal_artifact_ref and source_proposal_artifact_hash.',
      { target_type: targetType },
    );
  }
  if (!runtimeAdmission) {
    throw gateFailure(
      'Acceptance bridge lineage is not configured for this service.',
      { target_type: targetType },
    );
  }
  if (normalizedPaperImplementationRefType(sourceRef.ref_type)
    !== normalizedPaperImplementationRefType(RUNTIME_ARTIFACT_REF_TYPE)) {
    throw gateFailure(
      `Acceptance bridge lineage requires a ${RUNTIME_ARTIFACT_REF_TYPE} ref.`,
      { target_type: targetType, ref_type: sourceRef.ref_type },
    );
  }
  const artifact = await runtimeAdmission.getRuntimeArtifact(
    implementationProjectId,
    sourceRef.ref_id,
  );
  const expectedWorkflowTypes = PAPER_IMPLEMENTATION_ACCEPTANCE_BRIDGE_WORKFLOW_TYPES[targetType];
  if (!expectedWorkflowTypes.includes(artifact.workflow_type)) {
    throw gateFailure(
      `Acceptance bridge lineage workflow_type does not match target object type ${targetType}.`,
      {
        target_type: targetType,
        runtime_artifact_id: artifact.runtime_artifact_id,
        workflow_type: artifact.workflow_type,
        expected_workflow_types: [...expectedWorkflowTypes],
      },
    );
  }
  // S2-C C4: the scope/passed/hash/admitted core is shared with the runtime
  // slot consumption validator; only the resolution above (ref shape, direct
  // artifact-id lookup, workflow_type mapping) is bridge-specific.
  const admissionRecords = await runtimeAdmission.listAdmissionRecords(
    implementationProjectId,
    {
      runtime_artifact_id: artifact.runtime_artifact_id,
      admission_scope: 'final',
    },
  );
  assertAdmittedPassedFinal({
    artifact,
    expectedHash: sourceHash,
    admissionRecords,
    consumer: `acceptance_bridge:${targetType}`,
    detail: { target_type: targetType },
  });
  return {
    source_proposal_artifact_ref: sourceRef,
    source_proposal_artifact_hash: sourceHash,
  };
}
