import type {
  TopicSelectionV1bN9QuestionRefinementPayload,
  TopicSelectionV1bN9QuestionRefinementUpdates,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

import { AppError } from '../errors/app-error.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

export const TOPIC_SELECTION_V1B_REFINEMENT_SEMANTIC_FIELDS = [
  'main_question',
  'contribution_hypothesis',
  'expected_claim',
  'fallback_claim',
  'evaluation_setting',
  'metrics',
  'baselines',
  'ablations_or_comparisons',
  'dependency_risks',
  'open_dependencies',
  'known_gaps',
  'risk_notes',
] as const satisfies readonly (keyof TopicSelectionV1bN9QuestionRefinementUpdates)[];

export type TopicSelectionV1bRefinementSemanticField =
  (typeof TOPIC_SELECTION_V1B_REFINEMENT_SEMANTIC_FIELDS)[number];

export type TopicSelectionV1bRefinementBaseline = Required<TopicSelectionV1bN9QuestionRefinementUpdates>;

export type TopicSelectionV1bRefinementDeltaClassification = {
  kind: 'substantive' | 'canonical_no_op';
  supplied_fields: TopicSelectionV1bRefinementSemanticField[];
  changed_fields: TopicSelectionV1bRefinementSemanticField[];
  normalized_updates: TopicSelectionV1bN9QuestionRefinementUpdates;
  delta_hash: string;
};

export function classifyTopicSelectionV1bRefinementDelta(
  baseline: TopicSelectionV1bRefinementBaseline,
  refinement: TopicSelectionV1bN9QuestionRefinementPayload,
): TopicSelectionV1bRefinementDeltaClassification {
  const suppliedFields = Object.keys(refinement.updates) as TopicSelectionV1bRefinementSemanticField[];
  if (suppliedFields.length === 0
    || suppliedFields.some((field) => !TOPIC_SELECTION_V1B_REFINEMENT_SEMANTIC_FIELDS.includes(field))) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'Question refinement must contain only registered semantic fields.');
  }

  const normalizedUpdates: TopicSelectionV1bN9QuestionRefinementUpdates = {};
  const before: Partial<TopicSelectionV1bRefinementBaseline> = {};
  const after: TopicSelectionV1bN9QuestionRefinementUpdates = {};
  const changedFields: TopicSelectionV1bRefinementSemanticField[] = [];
  for (const field of TOPIC_SELECTION_V1B_REFINEMENT_SEMANTIC_FIELDS) {
    const value = refinement.updates[field];
    if (value === undefined) {
      continue;
    }
    const normalizedValue = normalizeField(field, value);
    assignField(normalizedUpdates, field, normalizedValue);
    assignField(before, field, normalizeField(field, baseline[field]));
    assignField(after, field, normalizedValue);
    if (canonicalHash(before[field]) !== canonicalHash(normalizedValue)) {
      changedFields.push(field);
    }
  }

  return {
    kind: changedFields.length > 0 ? 'substantive' : 'canonical_no_op',
    supplied_fields: TOPIC_SELECTION_V1B_REFINEMENT_SEMANTIC_FIELDS.filter((field) => suppliedFields.includes(field)),
    changed_fields: changedFields,
    normalized_updates: normalizedUpdates,
    delta_hash: canonicalHash({ before, after }),
  };
}

function normalizeField(
  field: TopicSelectionV1bRefinementSemanticField,
  value: string | string[],
): string | string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeText);
  }
  if (field === 'contribution_hypothesis') {
    return value;
  }
  return normalizeText(value);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function assignField<T extends TopicSelectionV1bN9QuestionRefinementUpdates>(
  target: T,
  field: TopicSelectionV1bRefinementSemanticField,
  value: string | string[],
): void {
  if (field === 'metrics'
    || field === 'baselines'
    || field === 'ablations_or_comparisons'
    || field === 'dependency_risks'
    || field === 'open_dependencies'
    || field === 'known_gaps'
    || field === 'risk_notes') {
    target[field] = value as string[];
    return;
  }
  target[field] = value as never;
}
