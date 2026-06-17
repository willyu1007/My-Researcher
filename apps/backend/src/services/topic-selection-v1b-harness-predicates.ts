/**
 * W-12 / D-T127-01 (slice 5): the v1b harness type-guard / predicate cluster, relocated VERBATIM
 * from the harness. Pure, `this`-free `value is T` guards that the parse-and-resolve cluster depends
 * on. Intra-cluster calls (isFunctionalRefArray -> isFunctionalRefValue, isNullableSliceLoopbackTarget
 * -> isSliceLoopbackTarget, isNullableFunctionalRefValue -> isFunctionalRefValue) resolve within this
 * module; isRecord / isHash / hasOnlyKeys come from the pure-utils module. Behavior is identical.
 */
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionRejectedSliceOptionReason,
  TopicSelectionResearchSliceOptionDraft,
  TopicSelectionSliceLoopbackTarget,
  TopicSelectionSliceSelectionDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import { hasOnlyKeys, isHash, isRecord } from './topic-selection-v1b-harness-pure-utils.js';

export function isNullableHash(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isHash(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isFunctionalRefArray(value: unknown): value is TopicSelectionFunctionalRef[] {
  return Array.isArray(value) && value.every((item) => isFunctionalRefValue(item));
}

export function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

export function isRiskLevel(value: unknown): value is TopicSelectionResearchSliceOptionDraft['baseline_risk'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'unknown';
}

export function isSliceSelectionDecision(value: unknown): value is TopicSelectionSliceSelectionDecision {
  return value === 'select' || value === 'request_more_options' || value === 'park' || value === 'reject';
}

export function isSliceLoopbackTarget(value: unknown): value is TopicSelectionSliceLoopbackTarget {
  return value === 'plan_research_slice_run'
    || value === 'research_constraint_profile'
    || value === 'validated_need'
    || value === 'evidence_map'
    || value === 'search_plan';
}

export function isNullableSliceLoopbackTarget(value: unknown): value is TopicSelectionSliceLoopbackTarget | null {
  return value === null || isSliceLoopbackTarget(value);
}

export function isRejectedOptionReasonArray(value: unknown): value is TopicSelectionRejectedSliceOptionReason[] {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.option_id === 'string'
    && item.option_id.trim().length > 0
    && typeof item.reason === 'string'
    && item.reason.trim().length > 0
    && (
      item.reason_code === 'hard_blocker'
      || item.reason_code === 'weaker_fit'
      || item.reason_code === 'higher_risk'
      || item.reason_code === 'duplicate'
      || item.reason_code === 'out_of_scope'
      || item.reason_code === 'insufficient_evidence'
      || item.reason_code === 'resource_blocked'
      || item.reason_code === 'baseline_blocked'
      || item.reason_code === 'other'
    ));
}

export function isClaimCeilingAlignment(value: unknown): value is TopicSelectionResearchSliceOptionDraft['claim_ceiling_alignment'] {
  if (!isRecord(value)) {
    return false;
  }
  return hasOnlyKeys(value, ['confidence', 'rationale', 'status'])
    && (value.status === 'aligned' || value.status === 'uncertain' || value.status === 'exceeds')
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
    && (value.confidence === null || value.confidence === undefined || typeof value.confidence === 'number');
}

export function isFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef {
  return isRecord(value)
    && typeof value.ref_type === 'string'
    && value.ref_type.trim().length > 0
    && typeof value.ref_id === 'string'
    && value.ref_id.trim().length > 0
    && (value.version_id === undefined || value.version_id === null || typeof value.version_id === 'string')
    && (value.title_card_id === undefined || value.title_card_id === null || typeof value.title_card_id === 'string');
}

export function isNullableFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef | null | undefined {
  return value === undefined || value === null || isFunctionalRefValue(value);
}
