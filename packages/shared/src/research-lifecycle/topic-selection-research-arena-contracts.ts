import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES,
  type TopicSelectionEvidenceLocatorType,
} from './topic-selection-evidence-map-contracts.js';
import {
  TOPIC_SELECTION_COVERAGE_INTENT_TYPES,
  TOPIC_SELECTION_EVIDENCE_ROLES,
  type TopicSelectionCoverageIntentType,
  type TopicSelectionEvidenceRole,
} from './topic-selection-search-resource-contracts.js';

export const TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES = [
  'opportunity_scout',
  'prior_art_topic_killer',
  'empirical_skeptic',
  'synthesis_arbiter',
] as const;
export type TopicSelectionResearchArenaParticipantRole =
  (typeof TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES)[number];

export const TOPIC_SELECTION_RESEARCH_EVIDENCE_RELATIONS = [
  'supports',
  'challenges',
  'baselines',
  'contextualizes',
] as const;
export type TopicSelectionResearchEvidenceRelation =
  (typeof TOPIC_SELECTION_RESEARCH_EVIDENCE_RELATIONS)[number];

export const TOPIC_SELECTION_RESEARCH_QUOTE_INTEGRITY_STATUSES = [
  'exact_match',
  'normalized_match',
  'mismatch',
] as const;
export type TopicSelectionResearchQuoteIntegrityStatus =
  (typeof TOPIC_SELECTION_RESEARCH_QUOTE_INTEGRITY_STATUSES)[number];

export interface TopicSelectionResearchEvidenceQueryIntent {
  intent_type: TopicSelectionCoverageIntentType;
  query: string;
  rationale: string;
  target_claim: string;
}

export interface TopicSelectionResearchEvidencePacketRequest {
  schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1';
  title_card_id: string;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
}

export interface TopicSelectionResearchResolvedEvidenceLocator {
  locator_type: TopicSelectionEvidenceLocatorType;
  literature_id: string;
  document_id: string | null;
  content_row_id: string;
  parser_ref_id: string;
  checksum: string | null;
}

export interface TopicSelectionResearchEvidencePacketItem {
  evidence_unit_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  literature_ref: TopicSelectionFunctionalRef;
  evidence_role: Exclude<TopicSelectionEvidenceRole, 'unknown'>;
  relation_to_target_claim: TopicSelectionResearchEvidenceRelation;
  source_statement: string;
  resolved_excerpt: string;
  excerpt_hash: string;
  resolved_locator: TopicSelectionResearchResolvedEvidenceLocator;
  freshness: {
    status: 'current';
    retrieval_readiness_reason: string;
  };
  quote_integrity: Exclude<TopicSelectionResearchQuoteIntegrityStatus, 'mismatch'>;
  issue_codes: string[];
}

export interface TopicSelectionResearchEvidencePacket {
  schema_version: 'TopicSelectionResearchEvidencePacket@v1';
  title_card_id: string;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  query_intent: TopicSelectionResearchEvidenceQueryIntent;
  items: TopicSelectionResearchEvidencePacketItem[];
  source_refs: TopicSelectionFunctionalRef[];
  total_excerpt_chars: number;
  packet_hash: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const hashString = { type: 'string', pattern: '^[a-f0-9]{64}$' } as const;
const stringArray = { type: 'array', items: stringId } as const;

export const topicSelectionResearchEvidenceQueryIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent_type', 'query', 'rationale', 'target_claim'],
  properties: {
    intent_type: { enum: [...TOPIC_SELECTION_COVERAGE_INTENT_TYPES] },
    query: stringId,
    rationale: stringId,
    target_claim: stringId,
  },
} as const;

export const topicSelectionResearchEvidencePacketRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'participant_role',
    'query_intent',
    'evidence_unit_refs',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchEvidencePacketRequest@v1' },
    title_card_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    evidence_unit_refs: {
      type: 'array',
      items: topicSelectionFunctionalRefSchema,
      minItems: 1,
      maxItems: 12,
      uniqueItems: true,
    },
  },
} as const;

export const topicSelectionResearchResolvedEvidenceLocatorSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'locator_type',
    'literature_id',
    'document_id',
    'content_row_id',
    'parser_ref_id',
    'checksum',
  ],
  properties: {
    locator_type: { enum: [...TOPIC_SELECTION_EVIDENCE_LOCATOR_TYPES] },
    literature_id: stringId,
    document_id: nullableStringId,
    content_row_id: stringId,
    parser_ref_id: stringId,
    checksum: nullableStringId,
  },
} as const;

export const topicSelectionResearchEvidencePacketItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'evidence_unit_ref',
    'evidence_map_ref',
    'literature_ref',
    'evidence_role',
    'relation_to_target_claim',
    'source_statement',
    'resolved_excerpt',
    'excerpt_hash',
    'resolved_locator',
    'freshness',
    'quote_integrity',
    'issue_codes',
  ],
  properties: {
    evidence_unit_ref: topicSelectionFunctionalRefSchema,
    evidence_map_ref: topicSelectionFunctionalRefSchema,
    literature_ref: topicSelectionFunctionalRefSchema,
    evidence_role: { enum: TOPIC_SELECTION_EVIDENCE_ROLES.filter((role) => role !== 'unknown') },
    relation_to_target_claim: { enum: [...TOPIC_SELECTION_RESEARCH_EVIDENCE_RELATIONS] },
    source_statement: stringId,
    resolved_excerpt: stringId,
    excerpt_hash: hashString,
    resolved_locator: topicSelectionResearchResolvedEvidenceLocatorSchema,
    freshness: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'retrieval_readiness_reason'],
      properties: {
        status: { const: 'current' },
        retrieval_readiness_reason: stringId,
      },
    },
    quote_integrity: { enum: ['exact_match', 'normalized_match'] },
    issue_codes: stringArray,
  },
} as const;

export const topicSelectionResearchEvidencePacketSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'title_card_id',
    'participant_role',
    'query_intent',
    'items',
    'source_refs',
    'total_excerpt_chars',
    'packet_hash',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchEvidencePacket@v1' },
    title_card_id: stringId,
    participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
    query_intent: topicSelectionResearchEvidenceQueryIntentSchema,
    items: {
      type: 'array',
      items: topicSelectionResearchEvidencePacketItemSchema,
      minItems: 1,
      maxItems: 12,
    },
    source_refs: { type: 'array', items: topicSelectionFunctionalRefSchema, minItems: 1 },
    total_excerpt_chars: { type: 'integer', minimum: 1, maximum: 96000 },
    packet_hash: hashString,
  },
} as const;
