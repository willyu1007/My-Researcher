import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

/** Protect the whole node, including domain writes. Partial commits require inspection, never automatic re-execution. */
export async function executeV1aCodexSubmission<T>(options: {
  controlPlane: TopicSelectionControlPlaneService;
  nodeId: string;
  input: { workspace_id?: string | null; title_card_id: string; workflow_run_id: string; node_attempt_id: string } & object;
  preflight: () => void;
  execute: () => Promise<T>;
}): Promise<T> {
  const { input, controlPlane } = options;
  const key = `v1a-codex-submission:${canonicalHash([input.workspace_id ?? null, input.title_card_id,
    input.workflow_run_id, options.nodeId, input.node_attempt_id])}`;
  const requestHash = canonicalHash(input);
  const recover = async () => {
    const claim = await controlPlane.getArtifactRefByStableKey(key);
    if (!claim) return null;
    if (claim.checksum !== canonicalHash(claim.payload) || claim.payload?.request_hash !== requestHash
      || claim.payload?.schema_version !== 'V1aCodexSubmissionClaim@v1') {
      throw new AppError(409, 'VERSION_CONFLICT', 'CLI node submission identifies different input.');
    }
    const receipt = await controlPlane.getArtifactRefByStableKey(`${key}:result`);
    if (!receipt) throw new AppError(409, 'GATE_CONSTRAINT_FAILED',
      'CLI node submission is running or interrupted; inspect retained model and domain records before choosing a new node attempt.');
    if (receipt.checksum !== canonicalHash(receipt.payload) || receipt.payload?.owner !== claim.payload.owner
      || receipt.payload?.request_hash !== requestHash || receipt.payload?.schema_version !== 'V1aCodexSubmissionResult@v1') {
      throw new AppError(409, 'VERSION_CONFLICT', 'CLI node completion receipt is invalid.');
    }
    return { result: receipt.payload.result as T };
  };
  const prior = await recover();
  if (prior) return prior.result;
  options.preflight();
  const owner = randomUUID();
  const scope = { workspace_id: input.workspace_id ?? null, title_card_id: input.title_card_id,
    workflow_run_id: input.workflow_run_id, artifact_kind: 'diagnostic' as const, storage_kind: 'inline' as const, created_by: 'system' as const };
  const payload = { schema_version: 'V1aCodexSubmissionClaim@v1', owner, request_hash: requestHash };
  try {
    const claim = await controlPlane.recordArtifactRef({ ...scope, stable_key: key, payload, checksum: canonicalHash(payload) });
    if (claim.payload?.owner !== owner) throw new Error('CLI node is owned by another submission.');
  } catch (error) {
    const winner = await recover();
    if (winner) return winner.result;
    throw error;
  }
  const result = await options.execute();
  const terminal = { schema_version: 'V1aCodexSubmissionResult@v1', owner, request_hash: requestHash, result };
  await controlPlane.recordArtifactRef({ ...scope, stable_key: `${key}:result`, payload: terminal, checksum: canonicalHash(terminal) });
  return result;
}
