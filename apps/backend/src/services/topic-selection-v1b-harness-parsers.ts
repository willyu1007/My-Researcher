/**
 * W-12 / D-T127-01 (slice 6): v1b harness frozen-input PARSER cluster, relocated VERBATIM from the
 * harness. Each parseN*Payload validates a node's frozen-input payload (shape + refs/hashes via the
 * pure-utils + predicate guards) and returns the typed payload or a structured {ok:false} error.
 * Pure / `this`-free. (parseN2 / parseN5 remain in the harness until their accepted*PayloadIsValid
 * validators are relocated; the larger N7–N11 parsers follow in a subsequent slice.)
 */
import type {
  TopicSelectionV1bN1HarnessFrozenInputPayload,
  TopicSelectionV1bN3HarnessFrozenInputPayload,
  TopicSelectionV1bN4HarnessFrozenInputPayload,
  TopicSelectionV1bN6HarnessFrozenInputPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { hasOnlyKeys, isHash } from './topic-selection-v1b-harness-pure-utils.js';
import { isFunctionalRefValue } from './topic-selection-v1b-harness-predicates.js';

export function parseN1Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN1HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = ['v1b_input_bundle_id', 'v1a_bundle_ref', 'v1a_bundle_hash', 'source_refs_hash'];
  if (!hasOnlyKeys(payload, allowedKeys)
    || typeof payload.v1b_input_bundle_id !== 'string'
    || !payload.v1b_input_bundle_id.trim()
    || !isHash(payload.v1a_bundle_hash)
    || !isHash(payload.source_refs_hash)
    || !isFunctionalRefValue(payload.v1a_bundle_ref)) {
    return {
      ok: false,
      code: 'N1_FROZEN_PAYLOAD_INVALID',
      message: 'N1 requires frozen v1b input bundle id and expected bundle/source hash metadata.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN1HarnessFrozenInputPayload,
  };
}

export function parseN3Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN3HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'constraint_profile_hash',
    'constraint_profile_ref',
    'intake_snapshot_hash',
    'intake_snapshot_ref',
    'n2_handoff_hash',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isFunctionalRefValue(payload.intake_snapshot_ref)
    || !isHash(payload.intake_snapshot_hash)
    || !isFunctionalRefValue(payload.constraint_profile_ref)
    || !isHash(payload.constraint_profile_hash)
    || !isHash(payload.n2_handoff_hash)) {
    return {
      ok: false,
      code: 'N3_FROZEN_PAYLOAD_INVALID',
      message: 'N3 requires frozen N1/N2 authority refs and hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN3HarnessFrozenInputPayload,
  };
}

export function parseN4Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN4HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'constraint_profile_hash',
    'constraint_profile_ref',
    'intake_readiness_hash',
    'intake_readiness_ref',
    'intake_snapshot_hash',
    'intake_snapshot_ref',
    'n2_handoff_hash',
    'n3_handoff_hash',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isFunctionalRefValue(payload.intake_snapshot_ref)
    || !isHash(payload.intake_snapshot_hash)
    || !isFunctionalRefValue(payload.constraint_profile_ref)
    || !isHash(payload.constraint_profile_hash)
    || !isFunctionalRefValue(payload.intake_readiness_ref)
    || !isHash(payload.intake_readiness_hash)
    || !isHash(payload.n2_handoff_hash)
    || !isHash(payload.n3_handoff_hash)) {
    return {
      ok: false,
      code: 'N4_FROZEN_PAYLOAD_INVALID',
      message: 'N4 requires frozen N1/N2/N3 authority refs and replay lineage hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN4HarnessFrozenInputPayload,
  };
}

export function parseN6Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN6HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'constraint_profile_hash',
    'constraint_profile_ref',
    'intake_readiness_hash',
    'intake_readiness_ref',
    'n5_handoff_hash',
    'research_slice_hash',
    'research_slice_option_set_hash',
    'research_slice_option_set_ref',
    'research_slice_ref',
    'research_slice_selection_hash',
    'research_slice_selection_ref',
    'selected_slice_option_hash',
    'selected_slice_option_ref',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isHash(payload.n5_handoff_hash)
    || !isFunctionalRefValue(payload.constraint_profile_ref)
    || !isHash(payload.constraint_profile_hash)
    || !isFunctionalRefValue(payload.intake_readiness_ref)
    || !isHash(payload.intake_readiness_hash)
    || !isFunctionalRefValue(payload.research_slice_ref)
    || !isHash(payload.research_slice_hash)
    || !isFunctionalRefValue(payload.research_slice_selection_ref)
    || !isHash(payload.research_slice_selection_hash)
    || !isFunctionalRefValue(payload.research_slice_option_set_ref)
    || !isHash(payload.research_slice_option_set_hash)
    || !isFunctionalRefValue(payload.selected_slice_option_ref)
    || !isHash(payload.selected_slice_option_hash)) {
    return {
      ok: false,
      code: 'N6_FROZEN_PAYLOAD_INVALID',
      message: 'N6 requires a frozen N5 selected ResearchSlice handoff payload with explicit refs and hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload,
  };
}
