import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionPromotionInputSnapshotHandoff } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import { promotionSupportRiskFindingRefs } from './topic-selection-v1c-promotion-support-policy.js';
import { Ajv } from 'ajv';
import {
  topicSelectionPromotionConditionCandidateSchema,
  type TopicSelectionPromotionConditionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';

const validateCandidates = new Ajv({ allErrors: true }).compile<TopicSelectionPromotionConditionCandidate[]>({
  type: 'array',
  items: topicSelectionPromotionConditionCandidateSchema,
});

function refKey(ref: TopicSelectionFunctionalRef): string {
  return JSON.stringify([ref.ref_type, ref.ref_id, ref.version_id ?? null, ref.title_card_id ?? null]);
}

// These refs cover every carried pass-with-risk warning plus unresolved recheck obligations.
export function promotionConditionRequiredRefs(handoff: TopicSelectionPromotionInputSnapshotHandoff) {
  return [...new Map([
    ...promotionSupportRiskFindingRefs(handoff),
    ...handoff.accepted_risk_refs,
    ...handoff.memory_suggestion_refs,
    ...handoff.recheck_request_refs,
  ].map((ref) => [refKey(ref), ref])).values()];
}

export function validatePromotionConditionCandidates(value: unknown, handoff: TopicSelectionPromotionInputSnapshotHandoff):
  | { valid: true; candidates: TopicSelectionPromotionConditionCandidate[] }
  | { valid: false; reason: string } {
  const candidates = value ?? [];
  if (!validateCandidates(candidates)) {
    return { valid: false, reason: 'Condition candidates require typed actions, exact refs and nonblank early checks; owner belongs to Human input.' };
  }
  const required = new Set(promotionConditionRequiredRefs(handoff).map(refKey));
  const covered = new Set<string>();
  const ids = new Set<string>();
  const codes = new Set<string>();
  const actions = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.condition_id.trim()) || codes.has(candidate.condition_code.trim())
      || actions.has(candidate.required_action.action_code.trim())) {
      return { valid: false, reason: 'Condition IDs, codes and action codes must be unique.' };
    }
    ids.add(candidate.condition_id.trim());
    codes.add(candidate.condition_code.trim());
    actions.add(candidate.required_action.action_code.trim());
    const groupRefs = new Set(candidate.refs.map(refKey));
    const actionRefs = new Set(candidate.required_action.refs.map(refKey));
    if (groupRefs.size !== actionRefs.size || [...groupRefs].some((key) => !actionRefs.has(key))) {
      return { valid: false, reason: 'A condition and its typed action must carry the same exact refs.' };
    }
    for (const key of groupRefs) {
      if (!required.has(key) || covered.has(key)) {
        return { valid: false, reason: 'Each frozen risk or recheck ref must belong to exactly one condition group; unknown refs are not allowed.' };
      }
      covered.add(key);
    }
  }
  if ([...required].some((key) => !covered.has(key))) {
    return { valid: false, reason: 'Condition groups must cover every material finding, accepted risk, memory suggestion and recheck ref.' };
  }
  return { valid: true, candidates };
}

// Only the existing risk-free fast path uses these mechanical carry-forward proposals.
export function deterministicPromotionConditionCandidates(handoff: TopicSelectionPromotionInputSnapshotHandoff): TopicSelectionPromotionConditionCandidate[] {
  return [
    {
      code: 'review_memory_suggestions',
      refs: handoff.memory_suggestion_refs,
      reason: 'Review carried memory suggestions before relying on them in the paper project.',
      check: 'Before outline lock, inspect each carried memory suggestion and record whether its evidence remains applicable.',
    },
    {
      code: 'resolve_carried_rechecks',
      refs: handoff.recheck_request_refs,
      reason: 'Resolve carried recheck requests before any promote-class Human decision.',
      check: 'Before promotion, resolve every carried recheck request and refresh the promotion input; a condition cannot waive this gate.',
    },
  ].filter((group) => group.refs.length > 0).map((group) => ({
    condition_id: group.code,
    condition_code: group.code,
    required_action: { action_code: group.code, severity: 'warning', loopback_target: 'none', refs: group.refs, reason: group.reason },
    refs: group.refs,
    early_check_obligations: [group.check],
  }));
}
