import { randomUUID } from 'node:crypto';
import type { TopicSelectionArtifactRefRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionResourceSampleResult } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-resource-sampling-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionResourceSampleCreation, TopicSelectionResourceSamplingRepository } from '../repositories/topic-selection-resource-sampling.repository.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

/** One paid submission; only a persisted, fully prepared domain write can be recovered automatically. */
export async function executeResourceSamplingSubmission<Model>(options: {
  controlPlane: TopicSelectionControlPlaneService;
  repository: TopicSelectionResourceSamplingRepository;
  submissionId: string;
  workspaceId: string | null;
  titleCardId: string | null;
  request: Record<string, unknown>;
  preflight: () => Model;
  prepare: (model: Model) => Promise<TopicSelectionResourceSampleCreation>;
}): Promise<TopicSelectionResourceSampleResult> {
  const { controlPlane, repository } = options;
  const key = `resource-sampling-submission:${canonicalHash({ workspace_id: options.workspaceId,
    title_card_id: options.titleCardId, submission_id: options.submissionId })}`;
  const identityHash = canonicalHash(options.request);
  const scope = { workspace_id: options.workspaceId, title_card_id: options.titleCardId,
    artifact_kind: 'diagnostic' as const, storage_kind: 'inline' as const, created_by: 'system' as const };
  const assertRecord = (record: TopicSelectionArtifactRefRecord) => {
    if (!record.payload || record.checksum !== canonicalHash(record.payload)
      || record.workspace_id !== options.workspaceId || record.title_card_id !== options.titleCardId
      || record.artifact_kind !== 'diagnostic' || record.payload.identity_hash !== identityHash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Sampling submission identifies different input or an invalid persisted record.');
    }
  };
  const creationHash = (creation: TopicSelectionResourceSampleCreation) => canonicalHash({ ...creation,
    items: [...creation.items].sort((a, b) => a.resource_sample_item_id.localeCompare(b.resource_sample_item_id)) });
  const commit = async (creation: TopicSelectionResourceSampleCreation) => {
    const assertResult = (result: TopicSelectionResourceSampleResult) => {
      if (creationHash({ sample_set: result.sample_set, items: result.candidate_items, audit: result.audit }) !== creationHash(creation)) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Persisted sample differs from the prepared submission.');
      }
      return result;
    };
    const existing = await repository.findResourceSampleSetById(creation.sample_set.resource_sample_set_id);
    if (existing) return assertResult(existing);
    try {
      return assertResult(await repository.createResourceSampleSet(creation));
    } catch (error) {
      // A concurrent recovery may win the repository's unique sample ID transaction.
      const winner = await repository.findResourceSampleSetById(creation.sample_set.resource_sample_set_id);
      if (winner) return assertResult(winner);
      throw error;
    }
  };
  const recover = async (claim: TopicSelectionArtifactRefRecord) => {
    assertRecord(claim);
    if (claim.payload?.schema_version !== 'TopicSelectionResourceSamplingSubmissionClaim@v1') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Sampling submission claim is invalid.');
    }
    const prepared = await controlPlane.getArtifactRefByStableKey(`${key}:prepared`);
    if (!prepared) throw new AppError(409, 'GATE_CONSTRAINT_FAILED',
      'Sampling submission is in progress or interrupted before preparation; use an explicit new submission ID to run the model again.');
    assertRecord(prepared);
    if (prepared.payload?.schema_version !== 'TopicSelectionResourceSamplingSubmissionPrepared@v1'
      || prepared.payload.owner !== claim.payload.owner || !prepared.payload.creation) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Sampling submission preparation is invalid.');
    }
    return commit(prepared.payload.creation as TopicSelectionResourceSampleCreation);
  };
  const prior = await controlPlane.getArtifactRefByStableKey(key);
  if (prior) return recover(prior);
  // Admission/configuration failures cannot claim an ID or create domain artifacts.
  const model = options.preflight();
  const owner = randomUUID();
  const payload = { schema_version: 'TopicSelectionResourceSamplingSubmissionClaim@v1', identity_hash: identityHash, owner };
  try {
    const claim = await controlPlane.recordArtifactRef({ ...scope, stable_key: key, payload, checksum: canonicalHash(payload) });
    if (claim.payload?.owner !== owner) throw new Error('Sampling submission belongs to another owner.');
  } catch (error) {
    const winner = await controlPlane.getArtifactRefByStableKey(key);
    if (winner) return recover(winner);
    throw error;
  }
  const creation = await options.prepare(model);
  const prepared = { schema_version: 'TopicSelectionResourceSamplingSubmissionPrepared@v1', identity_hash: identityHash, owner, creation };
  await controlPlane.recordArtifactRef({ ...scope, stable_key: `${key}:prepared`, payload: prepared,
    workflow_run_id: creation.sample_set.workflow_run_id, checksum: canonicalHash(prepared) });
  return commit(creation);
}
