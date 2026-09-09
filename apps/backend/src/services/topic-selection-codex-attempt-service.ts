import { randomUUID } from 'node:crypto';
import type { TopicSelectionArtifactRefRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { TopicSelectionCodexCliRunOutcome } from './topic-selection-codex-cli-runner-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

type AttemptIdentity = {
  workspace_id: string | null;
  title_card_id: string | null;
  workflow_run_id: string;
  node_id: string;
  invocation_attempt_id: string;
  request_hash: string;
};

/** Claim before external work. An unfinished claim is ambiguous and must never auto-retry. */
export async function executeClaimedCodexAttempt(
  controlPlane: TopicSelectionControlPlaneService,
  identity: AttemptIdentity,
  execute: () => Promise<TopicSelectionCodexCliRunOutcome>,
): Promise<TopicSelectionCodexCliRunOutcome> {
  const key = `codex-attempt:${canonicalHash({ ...identity, request_hash: null })}`;
  const terminalKey = `${key}:outcome`;
  const assertRecord = (record: TopicSelectionArtifactRefRecord) => {
    if (record.artifact_kind !== 'diagnostic' || !record.payload
      || record.checksum !== canonicalHash(record.payload)
      || record.workflow_run_id !== identity.workflow_run_id
      || (record.title_card_id ?? null) !== identity.title_card_id
      || record.payload.identity_hash !== canonicalHash(identity)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Codex attempt identity/input differs from the persisted attempt.');
    }
  };
  const readOutcome = async () => {
    const record = await controlPlane.getArtifactRefByStableKey(terminalKey);
    if (!record) return null;
    assertRecord(record);
    const outcome = record.payload?.outcome as TopicSelectionCodexCliRunOutcome | undefined;
    if (record.payload?.schema_version !== 'TopicSelectionCodexAttemptOutcome@v1'
      || !outcome || !['succeeded', 'failed'].includes(outcome.status)
      || !Array.isArray(outcome.trace_events)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Codex attempt terminal record is invalid.');
    }
    return outcome;
  };
  const prior = await controlPlane.getArtifactRefByStableKey(key);
  if (prior) {
    assertRecord(prior);
    const outcome = await readOutcome();
    if (outcome) return outcome;
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED',
      'Codex attempt is in progress or interrupted; retry requires an explicit new attempt identity.');
  }
  const owner = randomUUID();
  const claim = { schema_version: 'TopicSelectionCodexAttemptClaim@v1', identity_hash: canonicalHash(identity), owner };
  const scope = {
    workspace_id: identity.workspace_id, title_card_id: identity.title_card_id,
    workflow_run_id: identity.workflow_run_id,
    artifact_kind: 'diagnostic' as const, storage_kind: 'inline' as const, created_by: 'system' as const,
  };
  try {
    const persisted = await controlPlane.recordArtifactRef({
      ...scope, stable_key: key, payload: claim, checksum: canonicalHash(claim),
    });
    if (persisted.payload?.owner !== owner) throw new Error('Attempt claim belongs to another owner.');
  } catch (error) {
    // The unique stable key arbitrates concurrent callers in both relational and memory repositories.
    const winner = await controlPlane.getArtifactRefByStableKey(key);
    if (!winner) throw error;
    assertRecord(winner);
    const outcome = await readOutcome();
    if (outcome) return outcome;
    throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Codex attempt is already claimed; no duplicate execution was started.');
  }
  const outcome = await execute();
  const terminal = {
    schema_version: 'TopicSelectionCodexAttemptOutcome@v1', identity_hash: canonicalHash(identity), owner, outcome,
  };
  await controlPlane.recordArtifactRef({
    ...scope, stable_key: terminalKey, payload: terminal, checksum: canonicalHash(terminal),
  });
  return outcome;
}
