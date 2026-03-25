import type {
  PromotionDecisionDTO,
  ReviewRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';

const REVIEW_REF_RECORD_TYPE_ALIASES = {
  question: 'research_question',
  topic_package: 'package',
} as const satisfies Record<string, ReviewRef['record_type']>;

const CANONICAL_REVIEW_REF_RECORD_TYPES = new Set<ReviewRef['record_type']>([
  'evidence_review',
  'need_review',
  'research_question',
  'value_assessment',
  'package',
  'promotion_decision',
]);

const LOOPBACK_TARGET_ALIASES = {
  question: 'research_question',
  topic_package: 'package',
} as const satisfies Record<string, NonNullable<PromotionDecisionDTO['loopback_target']>>;

const CANONICAL_LOOPBACK_TARGETS = new Set<NonNullable<PromotionDecisionDTO['loopback_target']>>([
  'need_review',
  'research_question',
  'value_assessment',
  'package',
]);

export function normalizeReviewRefRecordType(recordType: unknown): ReviewRef['record_type'] | null {
  if (typeof recordType !== 'string') {
    return null;
  }
  const aliased = Object.hasOwn(REVIEW_REF_RECORD_TYPE_ALIASES, recordType)
    ? REVIEW_REF_RECORD_TYPE_ALIASES[recordType as keyof typeof REVIEW_REF_RECORD_TYPE_ALIASES]
    : undefined;
  if (aliased) {
    return aliased;
  }
  return CANONICAL_REVIEW_REF_RECORD_TYPES.has(recordType as ReviewRef['record_type'])
    ? (recordType as ReviewRef['record_type'])
    : null;
}

export function normalizeReviewRefs(value: unknown): ReviewRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    const recordId = 'record_id' in item && typeof item.record_id === 'string'
      ? item.record_id
      : null;
    const recordType = 'record_type' in item
      ? normalizeReviewRefRecordType(item.record_type)
      : null;
    if (!recordId || !recordType) {
      return [];
    }
    return [{ record_id: recordId, record_type: recordType }];
  });
}

export function normalizePromotionDecisionLoopbackTarget(
  loopbackTarget: unknown,
): PromotionDecisionDTO['loopback_target'] {
  if (typeof loopbackTarget !== 'string') {
    return undefined;
  }
  const aliased = Object.hasOwn(LOOPBACK_TARGET_ALIASES, loopbackTarget)
    ? LOOPBACK_TARGET_ALIASES[loopbackTarget as keyof typeof LOOPBACK_TARGET_ALIASES]
    : undefined;
  if (aliased) {
    return aliased;
  }
  return CANONICAL_LOOPBACK_TARGETS.has(loopbackTarget as NonNullable<PromotionDecisionDTO['loopback_target']>)
    ? (loopbackTarget as NonNullable<PromotionDecisionDTO['loopback_target']>)
    : undefined;
}
