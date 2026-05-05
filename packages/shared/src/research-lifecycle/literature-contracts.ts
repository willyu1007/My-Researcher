export const LITERATURE_PROVIDERS = ['crossref', 'arxiv', 'manual', 'web', 'zotero'] as const;
export type LiteratureProvider = (typeof LITERATURE_PROVIDERS)[number];

export const ZOTERO_LIBRARY_TYPES = ['users', 'groups'] as const;
export type ZoteroLibraryType = (typeof ZOTERO_LIBRARY_TYPES)[number];

export const RIGHTS_CLASSES = ['OA', 'USER_AUTH', 'RESTRICTED', 'UNKNOWN'] as const;
export type RightsClass = (typeof RIGHTS_CLASSES)[number];

export const DEDUP_MATCH_TYPES = ['none', 'doi', 'arxiv_id', 'title_authors_year'] as const;
export type DedupMatchType = (typeof DEDUP_MATCH_TYPES)[number];

export const TOPIC_SCOPE_STATUSES = ['in_scope', 'excluded'] as const;
export type TopicScopeStatus = (typeof TOPIC_SCOPE_STATUSES)[number];

export const PAPER_CITATION_STATUSES = ['seeded', 'selected', 'used', 'cited', 'dropped'] as const;
export type PaperCitationStatus = (typeof PAPER_CITATION_STATUSES)[number];

export const OVERVIEW_STATUSES = ['excluded', 'automation_ready', 'citable', 'not_citable'] as const;
export type OverviewStatus = (typeof OVERVIEW_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_STAGE_CODES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
] as const;
export type LiteratureContentProcessingStageCode = (typeof LITERATURE_CONTENT_PROCESSING_STAGE_CODES)[number];

export const LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES = [
  'NOT_STARTED',
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'STALE',
  'FAILED',
  'BLOCKED',
  'SKIPPED',
] as const;
export type LiteratureContentProcessingStageStatus = (typeof LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_RUN_STATUSES = ['PENDING', 'RUNNING', 'PARTIAL', 'SUCCESS', 'FAILED', 'SKIPPED'] as const;
export type LiteratureContentProcessingRunStatus = (typeof LITERATURE_CONTENT_PROCESSING_RUN_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_TRIGGER_SOURCES = [
  'CONTENT_PROCESSING_ACTION',
  'BACKFILL',
] as const;
export type LiteratureContentProcessingTriggerSource = (typeof LITERATURE_CONTENT_PROCESSING_TRIGGER_SOURCES)[number];

export const LITERATURE_CONTENT_PROCESSING_DEDUP_STATUSES = ['unique', 'duplicate', 'unknown'] as const;
export type LiteratureContentProcessingDedupStatus = (typeof LITERATURE_CONTENT_PROCESSING_DEDUP_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_ACTION_CODES = [
  'process_content',
  'process_to_retrievable',
  'rebuild_index',
  'reextract',
  'retry_failed',
  'view_reason',
] as const;
export type LiteratureContentProcessingActionCode = (typeof LITERATURE_CONTENT_PROCESSING_ACTION_CODES)[number];

export const LITERATURE_CONTENT_PROCESSING_ACTION_REASON_CODES = [
  'READY',
  'EXCLUDED_BY_SCOPE',
  'RIGHTS_RESTRICTED',
  'USER_AUTH_DISABLED',
  'PREREQUISITE_NOT_READY',
  'STAGE_ALREADY_READY',
  'RUN_IN_FLIGHT',
] as const;
export type LiteratureContentProcessingActionReasonCode = (typeof LITERATURE_CONTENT_PROCESSING_ACTION_REASON_CODES)[number];

export const LITERATURE_CONTENT_ASSET_KINDS = [
  'raw_fulltext',
  'normalized_text',
  'derived_image',
  'other',
] as const;
export type LiteratureContentAssetKind = (typeof LITERATURE_CONTENT_ASSET_KINDS)[number];

export const LITERATURE_CONTENT_ASSET_SOURCE_KINDS = ['local_path'] as const;
export type LiteratureContentAssetSourceKind = (typeof LITERATURE_CONTENT_ASSET_SOURCE_KINDS)[number];

export const LITERATURE_CONTENT_ASSET_STATUSES = [
  'registered',
  'missing',
  'unsupported',
  'ready',
  'failed',
] as const;
export type LiteratureContentAssetStatus = (typeof LITERATURE_CONTENT_ASSET_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS = ['openai'] as const;
export type LiteratureContentProcessingProviderId = (typeof LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS)[number];

export const LITERATURE_EMBEDDING_PROFILE_IDS = ['default', 'economy'] as const;
export type LiteratureEmbeddingProfileId = (typeof LITERATURE_EMBEDDING_PROFILE_IDS)[number];

export const LITERATURE_EXTRACTION_PROFILE_IDS = ['default', 'high_accuracy'] as const;
export type LiteratureExtractionProfileId = (typeof LITERATURE_EXTRACTION_PROFILE_IDS)[number];

export const LITERATURE_RETRIEVE_PROFILE_IDS = [
  'general',
  'topic_exploration',
  'paper_management',
  'writing_evidence',
] as const;
export type LiteratureRetrieveProfileId = (typeof LITERATURE_RETRIEVE_PROFILE_IDS)[number];

export const LITERATURE_KEY_CONTENT_READINESS_STATUSES = ['READY', 'PARTIAL_READY', 'FAILED'] as const;
export type LiteratureKeyContentReadinessStatus = (typeof LITERATURE_KEY_CONTENT_READINESS_STATUSES)[number];

export const LITERATURE_KEY_CONTENT_EVIDENCE_STRENGTHS = ['unknown', 'low', 'medium', 'high'] as const;
export type LiteratureKeyContentEvidenceStrength = (typeof LITERATURE_KEY_CONTENT_EVIDENCE_STRENGTHS)[number];

export const LITERATURE_KEY_CONTENT_SOURCE_REF_TYPES = ['abstract', 'section', 'paragraph', 'anchor', 'manual'] as const;
export type LiteratureKeyContentSourceRefType = (typeof LITERATURE_KEY_CONTENT_SOURCE_REF_TYPES)[number];

export interface LiteratureKeyContentSourceRef {
  ref_type: LiteratureKeyContentSourceRefType;
  ref_id: string;
  document_id?: string;
  section_id?: string;
  paragraph_id?: string;
  anchor_id?: string;
  checksum?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
}

export interface LiteratureKeyContentItem {
  id: string;
  type: string;
  statement: string;
  details: string;
  source_refs: LiteratureKeyContentSourceRef[];
  confidence: number;
  evidence_strength: LiteratureKeyContentEvidenceStrength;
  notes: string | null;
  provenance: 'model_generated' | 'user_edited';
}

export interface LiteratureKeyContentDossierPayload {
  schema_version: 'key_content.v1';
  extraction_profile: 'paper_semantic_dossier.v1';
  readiness_status: LiteratureKeyContentReadinessStatus;
  input_refs: Record<string, unknown>;
  categories: {
    research_problem: LiteratureKeyContentItem[];
    contributions: LiteratureKeyContentItem[];
    method: LiteratureKeyContentItem[];
    datasets_and_benchmarks: LiteratureKeyContentItem[];
    experiments: LiteratureKeyContentItem[];
    key_findings: LiteratureKeyContentItem[];
    limitations: LiteratureKeyContentItem[];
    reproducibility: LiteratureKeyContentItem[];
    related_work_positioning: LiteratureKeyContentItem[];
    evidence_candidates: LiteratureKeyContentItem[];
    figure_insights: LiteratureKeyContentItem[];
    table_insights: LiteratureKeyContentItem[];
    claim_evidence_map: LiteratureKeyContentItem[];
    automation_signals: LiteratureKeyContentItem[];
  };
  quality_report: {
    completeness_score: number;
    confidence: number;
    blockers: string[];
    warnings: string[];
    conflicts: string[];
    extraction_diagnostics: Array<Record<string, unknown>>;
  };
  display_digest: string;
  generated_at: string;
}

export interface LiteratureContentProcessingProviderSettingsDTO {
  provider: LiteratureContentProcessingProviderId;
  api_key_set: boolean;
  api_key_last_updated_at: string | null;
}

export interface LiteratureEmbeddingProfileDTO {
  profile_id: LiteratureEmbeddingProfileId;
  provider: LiteratureContentProcessingProviderId;
  model: string;
  dimensions: number | null;
}

export interface LiteratureContentProcessingEmbeddingSettingsDTO {
  active_profile_id: LiteratureEmbeddingProfileId;
  profiles: LiteratureEmbeddingProfileDTO[];
}

export interface LiteratureExtractionProfileDTO {
  profile_id: LiteratureExtractionProfileId;
  provider: LiteratureContentProcessingProviderId;
  model: string;
}

export interface LiteratureContentProcessingExtractionSettingsDTO {
  active_profile_id: LiteratureExtractionProfileId;
  profiles: LiteratureExtractionProfileDTO[];
}

export interface LiteratureContentProcessingStorageRootsDTO {
  raw_files: string | null;
  normalized_text: string | null;
  artifacts_cache: string | null;
  indexes: string | null;
  exports: string | null;
}

export interface LiteratureContentProcessingSettingsDTO {
  providers: LiteratureContentProcessingProviderSettingsDTO[];
  embedding: LiteratureContentProcessingEmbeddingSettingsDTO;
  extraction: LiteratureContentProcessingExtractionSettingsDTO;
  storage_roots: LiteratureContentProcessingStorageRootsDTO;
  updated_at: string;
}

export interface UpdateLiteratureContentProcessingSettingsRequest {
  providers?: Array<{
    provider: LiteratureContentProcessingProviderId;
    api_key?: string | null;
  }>;
  embedding?: {
    active_profile_id?: LiteratureEmbeddingProfileId;
    profiles?: Array<{
      profile_id: LiteratureEmbeddingProfileId;
      provider: LiteratureContentProcessingProviderId;
      model: string;
      dimensions?: number | null;
    }>;
  };
  extraction?: {
    active_profile_id?: LiteratureExtractionProfileId;
    profiles?: Array<{
      profile_id: LiteratureExtractionProfileId;
      provider: LiteratureContentProcessingProviderId;
      model: string;
    }>;
  };
  storage_roots?: Partial<LiteratureContentProcessingStorageRootsDTO>;
}

export interface LiteratureCollectionImportItem {
  provider: LiteratureProvider;
  external_id: string;
  title: string;
  abstract?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  arxiv_id?: string;
  source_url: string;
  rights_class?: RightsClass;
  tags?: string[];
}

export interface LiteratureCollectionImportRequest {
  items: LiteratureCollectionImportItem[];
}

export interface LiteratureCollectionImportResult {
  literature_id: string;
  is_new: boolean;
  matched_by: DedupMatchType;
  title: string;
  source_provider: LiteratureProvider;
  source_url: string;
}

export interface LiteratureCollectionImportResponse {
  results: LiteratureCollectionImportResult[];
}

export interface TopicLiteratureScopeAction {
  literature_id: string;
  scope_status: TopicScopeStatus;
  reason?: string;
}

export interface UpsertTopicLiteratureScopeRequest {
  actions: TopicLiteratureScopeAction[];
}

export interface TopicLiteratureScopeItem {
  scope_id: string;
  topic_id: string;
  literature_id: string;
  scope_status: TopicScopeStatus;
  reason?: string;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
}

export interface TopicLiteratureScopeResponse {
  topic_id: string;
  items: TopicLiteratureScopeItem[];
}

export interface SyncPaperLiteratureFromTopicRequest {
  topic_id: string;
}

export interface SyncPaperLiteratureFromTopicResponse {
  paper_id: string;
  topic_id: string;
  linked_count: number;
  skipped_count: number;
}

export interface PaperLiteratureLinkView {
  link_id: string;
  paper_id: string;
  topic_id: string | null;
  literature_id: string;
  citation_status: PaperCitationStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  source_provider: LiteratureProvider | null;
  source_url: string | null;
  tags: string[];
}

export interface GetPaperLiteratureResponse {
  paper_id: string;
  items: PaperLiteratureLinkView[];
}

export interface UpdatePaperLiteratureLinkRequest {
  citation_status?: PaperCitationStatus;
  note?: string;
}

export interface UpdatePaperLiteratureLinkResponse {
  paper_id: string;
  item: PaperLiteratureLinkView;
}

export interface ZoteroImportRequest {
  library_type: ZoteroLibraryType;
  library_id: string;
  api_key?: string;
  query?: string;
  limit?: number;
  topic_id?: string;
  scope_status?: TopicScopeStatus;
  scope_reason?: string;
  tags?: string[];
  rights_class?: RightsClass;
}

export type ZoteroPreviewRequest = ZoteroImportRequest;

export interface ZoteroPreviewResponse {
  fetched_count: number;
  items: LiteratureCollectionImportItem[];
}

export interface ZoteroImportResponse {
  topic_id?: string;
  imported_count: number;
  scope_upserted_count: number;
  results: LiteratureCollectionImportResult[];
}

export interface LiteratureContentProcessingStateDTO {
  literature_id: string;
  citation_complete: boolean;
  abstract_ready: boolean;
  key_content_ready: boolean;
  fulltext_preprocessed: boolean;
  chunked: boolean;
  embedded: boolean;
  indexed: boolean;
  dedup_status: LiteratureContentProcessingDedupStatus;
  updated_at: string;
}

export type LiteratureContentProcessingStageStatusMap = Record<LiteratureContentProcessingStageCode, LiteratureContentProcessingStageStatus>;

export interface LiteratureContentProcessingActionAvailability {
  action_code: LiteratureContentProcessingActionCode;
  enabled: boolean;
  reason_code: LiteratureContentProcessingActionReasonCode | null;
  reason_message: string | null;
  requested_stages: LiteratureContentProcessingStageCode[];
}

export interface LiteratureContentProcessingActionSet {
  process_content: LiteratureContentProcessingActionAvailability;
  process_to_retrievable: LiteratureContentProcessingActionAvailability;
  rebuild_index: LiteratureContentProcessingActionAvailability;
  reextract: LiteratureContentProcessingActionAvailability;
  retry_failed: LiteratureContentProcessingActionAvailability;
  view_reason: LiteratureContentProcessingActionAvailability;
}

export interface LiteratureContentProcessingStageStateDTO {
  stage_code: LiteratureContentProcessingStageCode;
  status: LiteratureContentProcessingStageStatus;
  last_run_id: string | null;
  detail: Record<string, unknown>;
  updated_at: string;
}

export interface LiteratureContentProcessingRunStepDTO {
  step_id: string;
  stage_code: LiteratureContentProcessingStageCode;
  status: LiteratureContentProcessingStageStatus;
  input_ref: Record<string, unknown>;
  output_ref: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface LiteratureContentProcessingRunDTO {
  run_id: string;
  literature_id: string;
  trigger_source: LiteratureContentProcessingTriggerSource;
  status: LiteratureContentProcessingRunStatus;
  requested_stages: LiteratureContentProcessingStageCode[];
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  steps?: LiteratureContentProcessingRunStepDTO[];
}

export interface GetLiteratureContentProcessingResponse {
  literature_id: string;
  state: LiteratureContentProcessingStateDTO;
  stage_states: LiteratureContentProcessingStageStateDTO[];
}

export interface CreateLiteratureContentProcessingRunRequest {
  requested_stages?: LiteratureContentProcessingStageCode[];
}

export interface CreateLiteratureContentProcessingRunResponse {
  run: LiteratureContentProcessingRunDTO;
}

export interface ListLiteratureContentProcessingRunsResponse {
  literature_id: string;
  items: LiteratureContentProcessingRunDTO[];
}

export interface ListLiteratureContentProcessingRunsQuery {
  limit?: number;
}

export interface LiteratureOverviewItem {
  literature_id: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  rights_class: RightsClass;
  tags: string[];
  providers: LiteratureProvider[];
  source_url: string | null;
  source_updated_at: string | null;
  topic_scope_status?: TopicScopeStatus;
  citation_status?: PaperCitationStatus;
  overview_status: OverviewStatus;
  content_processing_state: {
    citation_complete: boolean;
    abstract_ready: boolean;
    key_content_ready: boolean;
    fulltext_preprocessed: boolean;
    chunked: boolean;
    embedded: boolean;
    indexed: boolean;
  };
  content_processing_stage_status: LiteratureContentProcessingStageStatusMap;
  content_processing_actions: LiteratureContentProcessingActionSet;
}

export interface LiteratureOverviewQuery {
  topic_id?: string;
  paper_id?: string;
}

export interface LiteratureOverviewResponse {
  topic_id?: string;
  paper_id?: string;
  summary: {
    total_literatures: number;
    topic_scope_total: number;
    in_scope_count: number;
    excluded_count: number;
    paper_link_total: number;
    cited_count: number;
    used_count: number;
    provider_counts: Array<{ provider: LiteratureProvider; count: number }>;
    rights_class_counts: Array<{ rights_class: RightsClass; count: number }>;
    top_tags: Array<{ tag: string; count: number }>;
  };
  items: LiteratureOverviewItem[];
}

export interface UpdateLiteratureMetadataRequest {
  title?: string;
  abstract?: string | null;
  key_content_digest?: string | null;
  authors?: string[];
  year?: number | null;
  doi?: string | null;
  arxiv_id?: string | null;
  rights_class?: RightsClass;
  tags?: string[];
}

export interface UpdateLiteratureMetadataResponse {
  literature_id: string;
  title: string;
  abstract: string | null;
  key_content_digest: string | null;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  rights_class: RightsClass;
  tags: string[];
  updated_at: string;
}

export interface RegisterLiteratureContentAssetRequest {
  asset_kind?: LiteratureContentAssetKind;
  source_kind?: LiteratureContentAssetSourceKind;
  local_path: string;
  checksum?: string;
  mime_type?: string;
  byte_size?: number;
  rights_class?: RightsClass;
  metadata?: Record<string, unknown>;
}

export interface LiteratureContentAssetDTO {
  asset_id: string;
  literature_id: string;
  asset_kind: LiteratureContentAssetKind;
  source_kind: LiteratureContentAssetSourceKind;
  local_path: string;
  checksum: string;
  mime_type: string;
  byte_size: number;
  rights_class: RightsClass;
  status: LiteratureContentAssetStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RegisterLiteratureContentAssetResponse {
  item: LiteratureContentAssetDTO;
}

export interface ListLiteratureContentAssetsResponse {
  literature_id: string;
  items: LiteratureContentAssetDTO[];
}

export interface GetLiteratureMetadataResponse {
  literature_id: string;
  title: string;
  abstract: string | null;
  key_content_digest: string | null;
  updated_at: string;
}

export interface LiteratureRetrieveRequest {
  query: string;
  profile?: LiteratureRetrieveProfileId;
  topic_id?: string;
  paper_id?: string;
  top_k?: number;
  evidence_per_literature?: number;
}

export interface LiteratureRetrieveEvidenceChunk {
  chunk_id: string;
  chunk_type: string;
  text: string;
  start_offset: number;
  end_offset: number;
  source_refs: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  hybrid_score: number;
  vector_score: number;
  lexical_score: number;
  score_breakdown: {
    vector: number;
    lexical: number;
    metadata: number;
    profile_boost: number;
  };
}

export interface LiteratureRetrieveHit {
  literature_id: string;
  title: string;
  embedding_version_id: string;
  retrieval_profile: LiteratureRetrieveProfileId;
  is_stale: boolean;
  warnings: string[];
  hybrid_score: number;
  vector_score: number;
  lexical_score: number;
  evidence_chunks: LiteratureRetrieveEvidenceChunk[];
}

export interface LiteratureRetrieveResponse {
  items: LiteratureRetrieveHit[];
  meta: {
    profile: LiteratureRetrieveProfileId;
    query_tokens: string[];
    degraded_mode: boolean;
    freshness_warnings: Array<{
      literature_id: string;
      embedding_version_id: string;
      reason_code: string;
      reason_message: string;
    }>;
    profiles_used: Array<{
      provider: string;
      model: string;
      dimension: number;
      literature_count: number;
    }>;
    skipped_profiles: Array<{
      provider: string;
      model: string;
      dimension: number;
      reason: string;
    }>;
  };
}

export const literatureCollectionImportRequestSchema = {
  type: 'object',
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['provider', 'external_id', 'title', 'source_url'],
        properties: {
          provider: { type: 'string', enum: LITERATURE_PROVIDERS },
          external_id: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          abstract: { type: 'string' },
          authors: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
          year: { type: 'integer', minimum: 1900, maximum: 2100 },
          doi: { type: 'string' },
          arxiv_id: { type: 'string' },
          source_url: { type: 'string', minLength: 1 },
          rights_class: { type: 'string', enum: RIGHTS_CLASSES, default: 'UNKNOWN' },
          tags: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            default: [],
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export const zoteroImportRequestSchema = {
  type: 'object',
  required: ['library_type', 'library_id'],
  properties: {
    library_type: { type: 'string', enum: ZOTERO_LIBRARY_TYPES },
    library_id: { type: 'string', minLength: 1 },
    api_key: { type: 'string' },
    query: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    topic_id: { type: 'string', minLength: 1 },
    scope_status: { type: 'string', enum: TOPIC_SCOPE_STATUSES, default: 'in_scope' },
    scope_reason: { type: 'string' },
    tags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    rights_class: { type: 'string', enum: RIGHTS_CLASSES, default: 'UNKNOWN' },
  },
  additionalProperties: false,
} as const;

export const literatureOverviewQuerySchema = {
  type: 'object',
  properties: {
    topic_id: { type: 'string', minLength: 1 },
    paper_id: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
  anyOf: [{ required: ['topic_id'] }, { required: ['paper_id'] }],
} as const;

export const literatureRetrieveRequestSchema = {
  type: 'object',
  required: ['query'],
  properties: {
    query: { type: 'string', minLength: 1 },
    profile: { type: 'string', enum: LITERATURE_RETRIEVE_PROFILE_IDS, default: 'general' },
    topic_id: { type: 'string', minLength: 1 },
    paper_id: { type: 'string', minLength: 1 },
    top_k: { type: 'integer', minimum: 1, maximum: 30, default: 10 },
    evidence_per_literature: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
  },
  additionalProperties: false,
} as const;

const literatureEmbeddingProfileSchema = {
  type: 'object',
  required: ['profile_id', 'provider', 'model'],
  properties: {
    profile_id: { type: 'string', enum: LITERATURE_EMBEDDING_PROFILE_IDS },
    provider: { type: 'string', enum: LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS },
    model: { type: 'string', minLength: 1 },
    dimensions: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
  },
  additionalProperties: false,
} as const;

const literatureExtractionProfileSchema = {
  type: 'object',
  required: ['profile_id', 'provider', 'model'],
  properties: {
    profile_id: { type: 'string', enum: LITERATURE_EXTRACTION_PROFILE_IDS },
    provider: { type: 'string', enum: LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS },
    model: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const updateLiteratureContentProcessingSettingsRequestSchema = {
  type: 'object',
  properties: {
    providers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS },
          api_key: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
        },
        additionalProperties: false,
      },
    },
    embedding: {
      type: 'object',
      properties: {
        active_profile_id: { type: 'string', enum: LITERATURE_EMBEDDING_PROFILE_IDS },
        profiles: {
          type: 'array',
          minItems: 1,
          items: literatureEmbeddingProfileSchema,
        },
      },
      additionalProperties: false,
    },
    extraction: {
      type: 'object',
      properties: {
        active_profile_id: { type: 'string', enum: LITERATURE_EXTRACTION_PROFILE_IDS },
        profiles: {
          type: 'array',
          minItems: 1,
          items: literatureExtractionProfileSchema,
        },
      },
      additionalProperties: false,
    },
    storage_roots: {
      type: 'object',
      properties: {
        raw_files: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
        normalized_text: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
        artifacts_cache: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
        indexes: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
        exports: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
  anyOf: [
    { required: ['providers'] },
    { required: ['embedding'] },
    { required: ['extraction'] },
    { required: ['storage_roots'] },
  ],
} as const;

export const listLiteratureContentProcessingRunsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
  },
  additionalProperties: false,
} as const;

export const createLiteratureContentProcessingRunRequestSchema = {
  type: 'object',
  properties: {
    requested_stages: {
      type: 'array',
      items: { type: 'string', enum: LITERATURE_CONTENT_PROCESSING_STAGE_CODES },
      minItems: 1,
      uniqueItems: true,
    },
  },
  additionalProperties: false,
} as const;

export const upsertTopicLiteratureScopeRequestSchema = {
  type: 'object',
  required: ['actions'],
  properties: {
    actions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['literature_id', 'scope_status'],
        properties: {
          literature_id: { type: 'string', minLength: 1 },
          scope_status: { type: 'string', enum: TOPIC_SCOPE_STATUSES },
          reason: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export const syncPaperLiteratureFromTopicRequestSchema = {
  type: 'object',
  required: ['topic_id'],
  properties: {
    topic_id: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const updatePaperLiteratureLinkRequestSchema = {
  type: 'object',
  properties: {
    citation_status: { type: 'string', enum: PAPER_CITATION_STATUSES },
    note: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const updateLiteratureMetadataRequestSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    abstract: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    key_content_digest: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    authors: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    year: { anyOf: [{ type: 'integer', minimum: 1900, maximum: 2100 }, { type: 'null' }] },
    doi: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    arxiv_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    rights_class: { type: 'string', enum: RIGHTS_CLASSES },
    tags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
  additionalProperties: false,
  anyOf: [
    { required: ['title'] },
    { required: ['abstract'] },
    { required: ['key_content_digest'] },
    { required: ['authors'] },
    { required: ['year'] },
    { required: ['doi'] },
    { required: ['arxiv_id'] },
    { required: ['rights_class'] },
    { required: ['tags'] },
  ],
} as const;

export const registerLiteratureContentAssetRequestSchema = {
  type: 'object',
  required: ['local_path'],
  properties: {
    asset_kind: { type: 'string', enum: LITERATURE_CONTENT_ASSET_KINDS, default: 'raw_fulltext' },
    source_kind: { type: 'string', enum: LITERATURE_CONTENT_ASSET_SOURCE_KINDS, default: 'local_path' },
    local_path: { type: 'string', minLength: 1 },
    checksum: { type: 'string', minLength: 1 },
    mime_type: { type: 'string', minLength: 1 },
    byte_size: { type: 'integer', minimum: 0 },
    rights_class: { type: 'string', enum: RIGHTS_CLASSES },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
} as const;
