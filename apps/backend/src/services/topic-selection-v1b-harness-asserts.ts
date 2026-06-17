/**
 * W-12 / D-T127-01: v1b harness payload/result assertion validators, relocated VERBATIM from the
 * harness. Pure, `this`-free guards that throw AppError on invalid shapes (built on the pure-utils
 * isRecord/HASH_PATTERN + gate-utils refsEqual). The two stateful asserts (assertRequest /
 * assertSemanticSupportArtifact) stay in the harness — they call this.getNodePolicy — but invoke
 * these relocated leaf validators as bare imports.
 */
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_ACTOR_TYPES } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionAgentRunMode } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import { TOPIC_SELECTION_AGENT_RUN_MODES } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessRunResult,
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { HASH_PATTERN, isRecord } from './topic-selection-v1b-harness-pure-utils.js';
import { refsEqual } from './topic-selection-v1b-harness-gate-utils.js';

const ACTOR_TYPE_SET = new Set<string>(TOPIC_SELECTION_ACTOR_TYPES);
const AGENT_RUN_MODE_SET = new Set<string>(TOPIC_SELECTION_AGENT_RUN_MODES);

export function assertResult(
  result: TopicSelectionV1bWorkflowHarnessRunResult,
): TopicSelectionV1bWorkflowHarnessRunResult {
  if (
    result.schema_version !== TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION
    || !TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES.includes(result.gate_status)
    || !HASH_PATTERN.test(result.replay_identity.node_replay_key)
    || !HASH_PATTERN.test(result.hashes.frozen_input_hash)
    || !HASH_PATTERN.test(result.hashes.execution_spec_hash)
    || (
      result.hashes.runtime_admission_hash != null
      && !HASH_PATTERN.test(result.hashes.runtime_admission_hash)
    )
    || !HASH_PATTERN.test(result.hashes.gate_result_hash)
    || !HASH_PATTERN.test(result.hashes.route_hash)
    || (
      result.replay_provenance?.node_replay_key != null
      && !HASH_PATTERN.test(result.replay_provenance.node_replay_key)
    )
  ) {
    throw new AppError(500, 'INTERNAL_ERROR', 'TopicSelection v1b workflow harness result is invalid.', {
      node_id: result.node_id,
      node_attempt_id: result.node_attempt_id,
    });
  }
  return result;
}

export function assertNonEmpty(value: string | null | undefined, fieldName: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
  }
}

export function assertOptionalStringId(value: string | null | undefined, fieldName: string): void {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a non-empty string or null.`);
  }
}

export function assertOptionalRunMode(
  value: TopicSelectionAgentRunMode | null | undefined,
  fieldName: string,
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!AGENT_RUN_MODE_SET.has(value)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} is invalid.`);
  }
}

export function assertFunctionalRef(
  value: unknown,
  fieldName: string,
  options: { allowLegacyRef?: boolean } = {},
): asserts value is TopicSelectionFunctionalRef {
  if (!isRecord(value)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
  }
  const allowLegacyRef = options.allowLegacyRef ?? true;
  const allowedKeys = allowLegacyRef
    ? ['ref_type', 'ref_id', 'version_id', 'title_card_id', 'legacy_ref']
    : ['ref_type', 'ref_id', 'version_id', 'title_card_id'];
  const unknownKeys = Object.keys(value)
    .filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} contains unsupported fields.`, {
      unsupported_fields: unknownKeys,
    });
  }
  assertNonEmpty(value.ref_type as string | null | undefined, `${fieldName}.ref_type`);
  assertNonEmpty(value.ref_id as string | null | undefined, `${fieldName}.ref_id`);
  assertOptionalStringId(value.version_id as string | null | undefined, `${fieldName}.version_id`);
  assertOptionalStringId(value.title_card_id as string | null | undefined, `${fieldName}.title_card_id`);
  if (
    allowLegacyRef
    && value.legacy_ref !== undefined
    && value.legacy_ref !== null
    && !isRecord(value.legacy_ref)
  ) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.legacy_ref must be an object or null.`);
  }
}

export function assertActorRef(value: unknown, fieldName: string): void {
  if (!isRecord(value)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
  }
  const unknownKeys = Object.keys(value).filter((key) => key !== 'actor_type' && key !== 'actor_id');
  if (unknownKeys.length > 0) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} contains unsupported fields.`, {
      unsupported_fields: unknownKeys,
    });
  }
  if (!ACTOR_TYPE_SET.has(value.actor_type as string)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.actor_type is invalid.`);
  }
  assertOptionalStringId(value.actor_id as string | null | undefined, `${fieldName}.actor_id`);
}

export function assertHash(value: string | null | undefined, fieldName: string): void {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a sha256 hex hash.`);
  }
}

export function assertOptionalHash(value: string | null | undefined, fieldName: string): void {
  if (value === null || value === undefined) {
    return;
  }
  assertHash(value, fieldName);
}

export function assertSourceHashMap(value: unknown, fieldName: string): void {
  if (!isRecord(value)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
  }
  for (const [key, hash] of Object.entries(value)) {
    assertNonEmpty(key, `${fieldName} key`);
    assertHash(hash as string | null | undefined, `${fieldName}.${key}`);
  }
}

export function assertRuntimeVerifiedSupportArtifact(
  value: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  fieldName: string,
): void {
  assertNonEmpty(value.context_policy_profile_id, `${fieldName}.context_policy_profile_id`);
  assertNonEmpty(value.context_policy_profile_version, `${fieldName}.context_policy_profile_version`);
  assertHash(value.context_policy_profile_hash, `${fieldName}.context_policy_profile_hash`);
  assertNonEmpty(value.prompt_variant_key, `${fieldName}.prompt_variant_key`);
  assertHash(value.runtime_invocation_context_hash, `${fieldName}.runtime_invocation_context_hash`);
  assertNonEmpty(value.redaction_policy, `${fieldName}.redaction_policy`);
  if (Object.keys(value.source_hashes).length === 0) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.source_hashes must not be empty for runtime_verified.`);
  }
  if (!value.runtime_audit_ref) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.runtime_audit_ref is required for runtime_verified.`);
  }
  if (value.runtime_audit_ref.ref_type !== 'artifact_ref') {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.runtime_audit_ref must be an artifact_ref for runtime_verified.`);
  }
  if (!refsEqual(value.provenance_ref, value.runtime_audit_ref)) {
    throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.provenance_ref must match runtime_audit_ref for runtime_verified.`);
  }
  assertHash(value.runtime_audit_hash, `${fieldName}.runtime_audit_hash`);
}
