import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { hasText } from './paper-implementation-runtime-utils.js';

export interface PaperImplementationAdmittedPassedFinalArtifact {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
}

function refLabel(ref: TopicSelectionFunctionalRef): string {
  return `${ref.ref_type}:${ref.ref_id}`;
}

/**
 * Shared "admitted passed final" core (S2-C C4): the single implementation of
 * the checks both consumption validators used to duplicate —
 * - final artifact scope,
 * - runtime_status='passed' (blocked or failed finals are admitted for audit
 *   but can never seed or feed downstream consumers),
 * - caller-supplied hash matches the stored final_artifact_hash,
 * - an admitted final-scope admission record reconciles the same hash.
 *
 * Callers keep only their own resolution differences (how the artifact and its
 * admission records were located, plus caller-specific checks such as
 * workflow_type or slot_id). Every failure is a 409 GATE_CONSTRAINT_FAILED with
 * the unified detail structure `{ guard, consumer, runtime_artifact_id, ... }`.
 */
export function assertAdmittedPassedFinal(options: {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  expectedHash: string;
  admissionRecords: PaperImplementationRuntimeAdmissionRecord[];
  consumer: string;
  detail?: Record<string, unknown>;
}): PaperImplementationRuntimeAdmissionRecord {
  const { artifact, expectedHash, admissionRecords } = options;
  const detail = (extra: Record<string, unknown>): Record<string, unknown> => ({
    guard: 'admitted_passed_final',
    consumer: options.consumer,
    runtime_artifact_id: artifact.runtime_artifact_id,
    ...(options.detail ?? {}),
    ...extra,
  });
  if (artifact.artifact_scope !== 'final') {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Runtime artifact ${artifact.runtime_artifact_id} is not a final-scope artifact.`,
      detail({ artifact_scope: artifact.artifact_scope }),
    );
  }
  if (artifact.runtime_status !== 'passed') {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Runtime artifact ${artifact.runtime_artifact_id} has runtime_status=${artifact.runtime_status}; only passed final artifacts can be consumed downstream.`,
      detail({ runtime_status: artifact.runtime_status }),
    );
  }
  if (!hasText(artifact.final_artifact_hash) || artifact.final_artifact_hash !== expectedHash) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Runtime artifact ${artifact.runtime_artifact_id} hash drifted from the stored final_artifact_hash.`,
      detail({ expected_final_artifact_hash: expectedHash }),
    );
  }
  const admission = admissionRecords.find((record) => (
    record.admission_status === 'admitted'
    && record.admission_scope === 'final'
    && record.admitted_artifact_hash === expectedHash
  ));
  if (!admission) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Runtime artifact ${artifact.runtime_artifact_id} has no admitted final admission record reconciling the supplied hash.`,
      detail({ expected_final_artifact_hash: expectedHash }),
    );
  }
  return admission;
}

/**
 * Server-side recheck for chained runtime slot consumption (S1-W2).
 *
 * Upgrades upstream artifact consumption from "request fields are present and the
 * LLM echoed them" to an authoritative admission-repository recheck:
 * - the referenced runtime artifact exists (matched by its final_artifact_ref via
 *   the repository's direct lookup — S2-C C4 removed the full final-scope scan),
 * - it is a final-scope artifact produced by the expected upstream slot,
 * - the shared admitted-passed-final core holds (passed status, hash reconciled,
 *   admitted final admission record).
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

  const refMatches = await runtimeAdmission.listFinalRuntimeArtifactsByFinalArtifactRef(
    implementationProjectId,
    artifactRef.ref_type,
    artifactRef.ref_id,
  );
  if (refMatches.length === 0) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} was not found in the runtime admission repository.`,
      {
        guard: 'admitted_passed_final',
        consumer: `runtime_slot_consumption:${expectedSlotId}`,
        artifact_ref: refLabel(artifactRef),
      },
    );
  }
  const artifact = refMatches.find((candidate) => candidate.final_artifact_hash === expectedHash)
    ?? refMatches[0]!;
  if (artifact.slot_id !== expectedSlotId) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `Upstream final artifact ${refLabel(artifactRef)} originates from slot ${artifact.slot_id}; slot ${expectedSlotId} output is required.`,
      {
        guard: 'admitted_passed_final',
        consumer: `runtime_slot_consumption:${expectedSlotId}`,
        runtime_artifact_id: artifact.runtime_artifact_id,
        artifact_slot_id: artifact.slot_id,
      },
    );
  }

  const admissionRecords = await runtimeAdmission.listAdmissionRecords(implementationProjectId, {
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'final',
  });
  const admission = assertAdmittedPassedFinal({
    artifact,
    expectedHash,
    admissionRecords,
    consumer: `runtime_slot_consumption:${expectedSlotId}`,
    detail: { artifact_ref: refLabel(artifactRef) },
  });
  return { artifact, admission };
}
