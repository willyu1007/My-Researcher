import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';

export interface PaperImplementationAdmittedPassedFinalArtifact {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function refLabel(ref: TopicSelectionFunctionalRef): string {
  return `${ref.ref_type}:${ref.ref_id}`;
}

/**
 * Server-side recheck for chained runtime slot consumption (S1-W2).
 *
 * Upgrades upstream artifact consumption from "request fields are present and the
 * LLM echoed them" to an authoritative admission-repository recheck:
 * - the referenced runtime artifact exists (matched by its final_artifact_ref),
 * - it is a final-scope artifact produced by the expected upstream slot,
 * - its runtime_status is 'passed' (blocked or failed finals are not consumable
 *   downstream even though admission records them as admitted),
 * - the caller-supplied hash matches the stored final_artifact_hash, and
 * - an admission record with admission_scope='final' and
 *   admission_status='admitted' exists whose admitted_artifact_hash matches.
 *
 * Missing request parameters fail with 400 INVALID_PAYLOAD; fabricated, drifted,
 * blocked, or wrong-slot upstream inputs fail with 409 GATE_CONSTRAINT_FAILED
 * before any context construction or orchestrator invocation.
 */
export async function requireAdmittedPassedFinalArtifact(
  runtimeAdmission: PaperImplementationRuntimeAdmissionService,
  implementationProjectId: string,
  artifactRef: TopicSelectionFunctionalRef | null | undefined,
  expectedHash: string | null | undefined,
  expectedSlotId: string,
): Promise<PaperImplementationAdmittedPassedFinalArtifact> {
  if (!hasText(implementationProjectId)) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required for upstream artifact consumption.');
  }
  if (!hasText(expectedSlotId)) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'Upstream artifact consumption requires an expected upstream slot_id.');
  }
  if (!artifactRef || !hasText(artifactRef.ref_type) || !hasText(artifactRef.ref_id)) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      `Upstream artifact consumption from slot ${expectedSlotId} requires an admitted final artifact ref.`,
    );
  }
  if (!hasText(expectedHash)) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      `Upstream artifact consumption from slot ${expectedSlotId} requires the admitted final artifact hash.`,
    );
  }

  const finalArtifacts = await runtimeAdmission.listRuntimeArtifacts(implementationProjectId, {
    artifact_scope: 'final',
  });
  const refMatches = finalArtifacts.filter((candidate) => candidate.final_artifact_ref !== null
    && candidate.final_artifact_ref.ref_type === artifactRef.ref_type
    && candidate.final_artifact_ref.ref_id === artifactRef.ref_id);
  if (refMatches.length === 0) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} was not found in the runtime admission repository.`,
    );
  }
  const artifact = refMatches.find((candidate) => candidate.final_artifact_hash === expectedHash)
    ?? refMatches[0]!;
  if (artifact.slot_id !== expectedSlotId) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} originates from slot ${artifact.slot_id}; slot ${expectedSlotId} output is required.`,
    );
  }
  if (artifact.final_artifact_hash !== expectedHash) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} hash drifted from the stored final_artifact_hash.`,
    );
  }
  if (artifact.runtime_status !== 'passed') {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} has runtime_status=${artifact.runtime_status}; only passed final artifacts can be consumed downstream.`,
    );
  }

  const admissionRecords = await runtimeAdmission.listAdmissionRecords(implementationProjectId, {
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'final',
  });
  const admission = admissionRecords.find((record) => record.admission_status === 'admitted');
  if (!admission) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} has no admitted final admission record.`,
    );
  }
  if (admission.admitted_artifact_hash !== expectedHash) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} hash drifted from the admitted_artifact_hash on its admission record.`,
    );
  }
  return { artifact, admission };
}
