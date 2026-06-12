import type { TopicSelectionFunctionalRef } from './topic-selection-control-plane-contracts.js';

// Decision Memory packet (T-123 Phase 4).
//
// Read-side projection of historical negative decisions for one title card, injected as
// NON-AUTHORITY context material into generation/assessment LLM slots (v1b N6 question
// generation dedup material, v1b N8 negative-memory input). The packet never participates
// in authority writes; deterministic gates may use it only to emit warning codes.

export const TOPIC_SELECTION_DECISION_MEMORY_PACKET_SCHEMA_VERSION =
  'TopicSelectionDecisionMemoryPacket@v1' as const;

export const TOPIC_SELECTION_DECISION_MEMORY_SOURCE_TYPES = [
  'rejected_need_candidate',
  'parked_need_candidate',
  'merged_need_candidate',
  'non_advance_value_disposition',
  'accepted_risk',
  'decision_memory_entry',
  'prior_topic_question_candidate',
] as const;
export type TopicSelectionDecisionMemorySourceType =
  (typeof TOPIC_SELECTION_DECISION_MEMORY_SOURCE_TYPES)[number];

export interface TopicSelectionDecisionMemoryPacketEntry {
  source_type: TopicSelectionDecisionMemorySourceType;
  source_ref: TopicSelectionFunctionalRef;
  title_card_id: string;
  /** Short human-readable statement of what was decided (candidate text / question / risk). */
  summary: string;
  /** Why it was decided (adjudication rationale, disposition rationale, risk rationale). */
  reason: string;
  /** reject / park / merge / drop / refine_question / refine_slice / recheck / risk_acceptance / memory. */
  decision_kind: string;
  severity?: string | null;
  status: string;
  created_at: string;
  /**
   * Normalized exact-match key for deterministic dedup (lowercase, letters/digits only,
   * collapsed whitespace). Null when the source has no comparable candidate text.
   * v1 deliberately does NOT do semantic similarity (see T-123 02-architecture §Decision Memory).
   */
  normalized_text_key: string | null;
  related_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionDecisionMemoryPacket {
  schema_version: typeof TOPIC_SELECTION_DECISION_MEMORY_PACKET_SCHEMA_VERSION;
  title_card_id: string;
  scope: 'title_card';
  /** Entries newest-first, capped by max_entries at build time. */
  entries: TopicSelectionDecisionMemoryPacketEntry[];
  /**
   * Counts per source over the FULL pre-truncation history - intentionally NOT the size of
   * the (capped) entries array. Lets consumers detect how much history the cap dropped;
   * do not 'fix' this to post-truncation counts (gate telemetry relies on full counts).
   */
  entry_counts_by_source: Record<string, number>;
  truncated: boolean;
  /** Memory is input material only — it must never be treated as business authority. */
  non_authority: true;
  evidence_policy: 'not_evidence';
}
