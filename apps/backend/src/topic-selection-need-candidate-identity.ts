import type {
  TopicSelectionNeedCandidateRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { sha256Text, stableStringify } from './services/literature-content-processing-utils.js';

const SEMANTIC_AXES = ['research_object', 'mechanism', 'intervention', 'comparison', 'outcome'] as const;

/** Stable semantic grouping shared by candidate persistence, checkpoints, and arena projections. */
export function topicSelectionNeedCandidateSemanticGroupKey(
  candidate: Pick<TopicSelectionNeedCandidateRecord, 'mechanism_type' | 'mechanism_payload'>,
): string {
  const semanticAxes = SEMANTIC_AXES.map((key) => [key, candidate.mechanism_payload[key] ?? null]);
  return sha256Text(stableStringify({
    mechanism_type: candidate.mechanism_type,
    semantic_axes: semanticAxes,
  }));
}
