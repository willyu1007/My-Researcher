import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

/** Resolve reviewable bodies from the recorded outputs; caller-supplied hashes alone are not context. */
export async function resolveDebatePriorOutputs(
  controlPlane: TopicSelectionControlPlaneService | undefined,
  scope: { workflow_run_id: string; title_card_id: string | null },
  prior: ReadonlyArray<{
    slot_id: string;
    role_artifact_hash: string;
    normalized_output_ref: TopicSelectionFunctionalRef;
    normalized_output_hash: string;
    structured_output_hash: string;
  }>,
) {
  if (!controlPlane) throw new AppError(500, 'INTERNAL_ERROR', 'CLI Debate requires a configured context resolver.');
  return Promise.all(prior.map(async role => {
    const record = await controlPlane.getArtifactRef(role.normalized_output_ref.ref_id);
    if (role.normalized_output_ref.ref_type !== 'artifact_ref'
      || !record || record.artifact_kind !== 'structured_output' || !record.payload
      || record.workflow_run_id !== scope.workflow_run_id
      || (record.title_card_id ?? null) !== scope.title_card_id
      || record.checksum !== canonicalHash(record.payload)
      || record.checksum !== role.normalized_output_hash
      || record.checksum !== role.structured_output_hash
      || record.checksum !== role.role_artifact_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Debate prior role output identity/hash does not match its persisted scope and content.');
    }
    return {
      slot_id: role.slot_id,
      output_ref: role.normalized_output_ref,
      output_hash: record.checksum,
      output: record.payload,
    };
  }));
}
