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

export const LITERATURE_QUALITY_STATUSES = [
  'high_confidence',
  'medium_confidence',
  'needs_review',
  'low_confidence',
  'excluded',
] as const;
export type LiteratureQualityStatus = (typeof LITERATURE_QUALITY_STATUSES)[number];

export const LITERATURE_EVIDENCE_ACTIVATION_STATUSES = [
  'candidate',
  'needs_review',
  'eligible',
  'active',
  'blocked',
  'excluded',
] as const;
export type LiteratureEvidenceActivationStatus = (typeof LITERATURE_EVIDENCE_ACTIVATION_STATUSES)[number];

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

export const LITERATURE_KEY_CONTENT_READY_METHODS = [
  'llm_gateway',
  'codex_curated',
  'manual_curated',
] as const;
export type LiteratureKeyContentReadyMethod = (typeof LITERATURE_KEY_CONTENT_READY_METHODS)[number];

export const LITERATURE_KEY_CONTENT_BACKFILL_CURATION_STATUSES = [
  'NOT_APPLICABLE',
  'CURATION_REQUIRED',
  'WAITING_FOR_DOSSIER',
  'READY_TO_IMPORT',
  'IMPORT_FAILED',
] as const;
export type LiteratureKeyContentBackfillCurationStatus =
  (typeof LITERATURE_KEY_CONTENT_BACKFILL_CURATION_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_BATCH_JOB_STATUSES = [
  'PLANNED',
  'QUEUED',
  'RUNNING',
  'PAUSED',
  'CANCELING',
  'CANCELED',
  'SUCCEEDED',
  'PARTIAL',
  'FAILED',
] as const;
export type LiteratureContentProcessingBatchJobStatus = (typeof LITERATURE_CONTENT_PROCESSING_BATCH_JOB_STATUSES)[number];

export const LITERATURE_CONTENT_PROCESSING_BATCH_ITEM_STATUSES = [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'PARTIAL',
  'BLOCKED',
  'FAILED',
  'SKIPPED',
  'CANCELED',
] as const;
export type LiteratureContentProcessingBatchItemStatus = (typeof LITERATURE_CONTENT_PROCESSING_BATCH_ITEM_STATUSES)[number];

export const LITERATURE_FULLTEXT_ACQUISITION_JOB_STATUSES = LITERATURE_CONTENT_PROCESSING_BATCH_JOB_STATUSES;
export type LiteratureFulltextAcquisitionJobStatus = LiteratureContentProcessingBatchJobStatus;

export const LITERATURE_FULLTEXT_ACQUISITION_ITEM_STATUSES = LITERATURE_CONTENT_PROCESSING_BATCH_ITEM_STATUSES;
export type LiteratureFulltextAcquisitionItemStatus = LiteratureContentProcessingBatchItemStatus;

export const LITERATURE_FULLTEXT_ACQUISITION_SOURCE_KINDS = [
  'explicit_url',
  'arxiv',
  'unpaywall',
] as const;
export type LiteratureFulltextAcquisitionSourceKind = (typeof LITERATURE_FULLTEXT_ACQUISITION_SOURCE_KINDS)[number];
export type LiteratureFulltextAcquisitionHealthSourceKind = LiteratureFulltextAcquisitionSourceKind | 'download';

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

export const LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS = ['openai', 'dashscope'] as const;
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

export const LITERATURE_CLUSTER_TYPES = ['same_work', 'version_family', 'related_topic'] as const;
export type LiteratureClusterType = (typeof LITERATURE_CLUSTER_TYPES)[number];

export const LITERATURE_CLUSTER_STATUSES = ['candidate', 'confirmed', 'rejected', 'split'] as const;
export type LiteratureClusterStatus = (typeof LITERATURE_CLUSTER_STATUSES)[number];

export const LITERATURE_CLUSTER_REVIEW_OUTCOMES = [
  'pending_review',
  'same_work_confirmed',
  'version_family_confirmed',
  'related_topic_confirmed',
  'rejected',
  'split',
] as const;
export type LiteratureClusterReviewOutcome = (typeof LITERATURE_CLUSTER_REVIEW_OUTCOMES)[number];

export const LITERATURE_CLUSTER_CONSUMPTION_SCOPES = [
  'none',
  'retrieval_dedup',
  'related_topic_reference',
] as const;
export type LiteratureClusterConsumptionScope = (typeof LITERATURE_CLUSTER_CONSUMPTION_SCOPES)[number];

export const LITERATURE_CLUSTER_MEMBER_ROLES = ['representative', 'variant', 'related'] as const;
export type LiteratureClusterMemberRole = (typeof LITERATURE_CLUSTER_MEMBER_ROLES)[number];

export const LITERATURE_CLUSTER_MEMBER_DECISION_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type LiteratureClusterMemberDecisionStatus = (typeof LITERATURE_CLUSTER_MEMBER_DECISION_STATUSES)[number];

export const LITERATURE_CLUSTER_RELATION_TYPES = [
  'same_pdf',
  'same_normalized_text',
  'same_work',
  'preprint_of',
  'published_version_of',
  'near_duplicate',
  'related_method',
] as const;
export type LiteratureClusterRelationType = (typeof LITERATURE_CLUSTER_RELATION_TYPES)[number];

export const LITERATURE_CLUSTER_EVIDENCE_SIGNAL_TYPES = [
  'doi',
  'arxiv_id',
  'title_author_year',
  'pdf_sha256',
  'text_fingerprint',
  'title_similarity',
  'author_overlap',
  'abstract_similarity',
  'embedding_similarity',
] as const;
export type LiteratureClusterEvidenceSignalType = (typeof LITERATURE_CLUSTER_EVIDENCE_SIGNAL_TYPES)[number];

export const LITERATURE_KEY_CONTENT_READINESS_STATUSES = ['READY', 'PARTIAL_READY', 'FAILED'] as const;
export type LiteratureKeyContentReadinessStatus = (typeof LITERATURE_KEY_CONTENT_READINESS_STATUSES)[number];

export const LITERATURE_KEY_CONTENT_EVIDENCE_STRENGTHS = ['unknown', 'low', 'medium', 'high'] as const;
export type LiteratureKeyContentEvidenceStrength = (typeof LITERATURE_KEY_CONTENT_EVIDENCE_STRENGTHS)[number];

export const LITERATURE_KEY_CONTENT_SOURCE_REF_TYPES = ['abstract', 'section', 'paragraph', 'anchor', 'manual'] as const;
export type LiteratureKeyContentSourceRefType = (typeof LITERATURE_KEY_CONTENT_SOURCE_REF_TYPES)[number];

export const LITERATURE_KEY_CONTENT_CATEGORY_KEYS = [
  'research_problem',
  'contributions',
  'method',
  'datasets_and_benchmarks',
  'experiments',
  'key_findings',
  'limitations',
  'reproducibility',
  'related_work_positioning',
  'evidence_candidates',
  'figure_insights',
  'table_insights',
  'claim_evidence_map',
  'automation_signals',
] as const;
export type LiteratureKeyContentCategoryKey = (typeof LITERATURE_KEY_CONTENT_CATEGORY_KEYS)[number];

export const LITERATURE_KEY_CONTENT_CURATION_SOURCES = ['codex_curated', 'manual_curated'] as const;
export type LiteratureKeyContentCurationSource = (typeof LITERATURE_KEY_CONTENT_CURATION_SOURCES)[number];

export const LITERATURE_KEY_CONTENT_ITEM_PROVENANCES = ['model_generated', 'user_edited'] as const;
export type LiteratureKeyContentItemProvenance = (typeof LITERATURE_KEY_CONTENT_ITEM_PROVENANCES)[number];

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
  provenance: LiteratureKeyContentItemProvenance;
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

export interface LiteratureKeyContentCurationBundleResponse {
  literature_id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  abstract_profile: {
    id: string;
    checksum: string | null;
    confidence: number;
    generated: boolean;
  } | null;
  document: {
    id: string;
    source_asset_id: string;
    normalized_text_checksum: string;
    parser_name: string;
    parser_version: string;
    status: string;
    diagnostics: Array<Record<string, unknown>>;
  };
  sections: Array<{
    section_id: string;
    title: string;
    level: number;
    order_index: number;
    start_offset: number;
    end_offset: number;
    page_start: number | null;
    page_end: number | null;
    checksum: string;
  }>;
  paragraphs: Array<{
    paragraph_id: string;
    section_id: string;
    order_index: number;
    text: string;
    start_offset: number;
    end_offset: number;
    page_number: number | null;
    checksum: string;
    confidence: number;
  }>;
  anchors: Array<{
    anchor_id: string;
    anchor_type: string;
    label: string | null;
    text: string | null;
    page_number: number | null;
    bbox: Record<string, unknown> | null;
    target_refs: Record<string, unknown>[];
    checksum: string | null;
  }>;
  source_refs: Array<Record<string, unknown>>;
  export_policy: {
    accepted_curation_sources: LiteratureKeyContentCurationSource[];
    required_schema_version: 'key_content.v1';
    required_extraction_profile: 'paper_semantic_dossier.v1';
    require_resolvable_source_refs: true;
  };
}

export interface ImportLiteratureKeyContentDossierRequest {
  curation_source: LiteratureKeyContentCurationSource;
  curator?: string;
  dossier: LiteratureKeyContentDossierPayload;
}

export interface ImportLiteratureKeyContentDossierResponse {
  literature_id: string;
  artifact_id: string;
  readiness_status: Extract<LiteratureKeyContentReadinessStatus, 'READY' | 'PARTIAL_READY'>;
  checksum: string;
  display_digest: string;
  source: LiteratureKeyContentCurationSource;
  diagnostics: Array<Record<string, unknown>>;
  state: LiteratureContentProcessingStateDTO;
}

export interface DryRunImportLiteratureKeyContentDossierResponse {
  literature_id: string;
  valid: boolean;
  readiness_status: LiteratureKeyContentReadinessStatus;
  checksum: string | null;
  display_digest: string;
  source: LiteratureKeyContentCurationSource;
  issues: string[];
  diagnostics: Array<Record<string, unknown>>;
  repaired_source_ref_count: number;
  would_mark_downstream_stale: boolean;
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
  runtime: {
    preferred_key_content_method: LiteratureKeyContentReadyMethod;
    section_concurrency: number;
    request_timeout_ms: number;
    max_retries: number;
    prompt_profile_id: string;
    diagnostic_policy: string;
  };
}

export interface LiteratureContentProcessingStorageRootsDTO {
  raw_files: string | null;
  normalized_text: string | null;
  artifacts_cache: string | null;
  indexes: string | null;
  exports: string | null;
}

export interface LiteratureFulltextParserSettingsDTO {
  grobid: {
    endpoint_url: string;
  };
}

export interface LiteratureContentProcessingSettingsDTO {
  providers: LiteratureContentProcessingProviderSettingsDTO[];
  embedding: LiteratureContentProcessingEmbeddingSettingsDTO;
  extraction: LiteratureContentProcessingExtractionSettingsDTO;
  storage_roots: LiteratureContentProcessingStorageRootsDTO;
  effective_storage_roots: LiteratureContentProcessingStorageRootsDTO;
  fulltext_parser: LiteratureFulltextParserSettingsDTO;
  updated_at: string;
}

export interface LiteratureAcquisitionSettingsDTO {
  unpaywall: {
    enabled: boolean;
    email: string | null;
  };
  downloader: {
    max_byte_size: number;
    timeout_ms: number;
    max_redirects: number;
    require_pdf_signature: boolean;
  };
  source_throttle: {
    arxiv: {
      min_interval_ms: number;
      concurrency: number;
    };
    crossref: {
      min_interval_ms: number;
      concurrency: number;
    };
    zotero: {
      min_interval_ms: number;
      concurrency: number;
    };
    unpaywall: {
      min_interval_ms: number;
      concurrency: number;
    };
    download: {
      min_interval_ms: number;
      concurrency: number;
    };
  };
  quality_scorer: {
    enabled: boolean;
    provider: LiteratureContentProcessingProviderId;
    model: string;
    prompt_version: string;
    external_endpoint_configured: boolean;
  };
  updated_at: string;
}

export interface LiteratureFulltextParserHealthDTO {
  provider: 'grobid';
  endpoint_url: string;
  status: 'ready' | 'unavailable';
  checked_at: string;
  version: string | null;
  details: Record<string, unknown>;
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
    runtime?: {
      preferred_key_content_method?: LiteratureKeyContentReadyMethod;
      section_concurrency?: number;
      request_timeout_ms?: number;
      max_retries?: number;
      prompt_profile_id?: string;
      diagnostic_policy?: string;
    };
  };
  storage_roots?: Partial<LiteratureContentProcessingStorageRootsDTO>;
  fulltext_parser?: Partial<LiteratureFulltextParserSettingsDTO>;
}

export interface UpdateLiteratureAcquisitionSettingsRequest {
  unpaywall?: {
    enabled?: boolean;
    email?: string | null;
  };
  downloader?: {
    max_byte_size?: number;
    timeout_ms?: number;
    max_redirects?: number;
    require_pdf_signature?: boolean;
  };
  source_throttle?: {
    arxiv?: {
      min_interval_ms?: number;
      concurrency?: number;
    };
    crossref?: {
      min_interval_ms?: number;
      concurrency?: number;
    };
    zotero?: {
      min_interval_ms?: number;
      concurrency?: number;
    };
    unpaywall?: {
      min_interval_ms?: number;
      concurrency?: number;
    };
    download?: {
      min_interval_ms?: number;
      concurrency?: number;
    };
  };
  quality_scorer?: {
    enabled?: boolean;
    model?: string;
    prompt_version?: string;
  };
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
  canonical_work_key: string;
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
  activation_status?: LiteratureEvidenceActivationStatus;
  activation_reason?: string;
  activation_score?: number | null;
}

export interface UpsertTopicLiteratureScopeRequest {
  actions: TopicLiteratureScopeAction[];
}

export interface TopicLiteratureEvidenceActivationAction {
  literature_id: string;
  activation_status: LiteratureEvidenceActivationStatus;
  reason?: string;
  activation_score?: number | null;
}

export interface UpdateTopicLiteratureEvidenceActivationRequest {
  actions: TopicLiteratureEvidenceActivationAction[];
}

export interface LiteratureQualityAssessmentDTO {
  literature_id: string;
  quality_status: LiteratureQualityStatus;
  quality_score: number | null;
  quality_components: Record<string, unknown>;
  blocker_codes: string[];
  source: string;
  assessed_at: string;
  updated_at: string;
}

export interface TopicLiteratureScopeItem {
  scope_id: string;
  topic_id: string;
  literature_id: string;
  scope_status: TopicScopeStatus;
  reason?: string;
  activation_status: LiteratureEvidenceActivationStatus;
  activation_reason: string | null;
  activation_score: number | null;
  activated_at: string | null;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  quality_assessment?: LiteratureQualityAssessmentDTO | null;
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

export interface LiteratureContentProcessingBackfillStageFilters {
  missing?: boolean;
  stale?: boolean;
  failed?: boolean;
}

export interface LiteratureContentProcessingBackfillWorkset {
  topic_id?: string;
  paper_id?: string;
  literature_ids?: string[];
  rights_classes?: RightsClass[];
  stage_filters?: LiteratureContentProcessingBackfillStageFilters;
  updated_at_from?: string;
  updated_at_to?: string;
}

export interface LiteratureContentProcessingBackfillOptions {
  max_parallel_literature_runs?: number;
  extraction_concurrency?: number;
  embedding_concurrency?: number;
  provider_call_budget?: number;
}

export interface LiteratureContentProcessingBackfillDryRunRequest {
  workset?: LiteratureContentProcessingBackfillWorkset;
  target_stage?: LiteratureContentProcessingStageCode;
  options?: LiteratureContentProcessingBackfillOptions;
}

export type LiteratureContentProcessingBackfillCreateJobRequest = LiteratureContentProcessingBackfillDryRunRequest;

export interface LiteratureContentProcessingBackfillBlockerDTO {
  literature_id: string;
  title: string;
  reason_code: string;
  reason_message: string;
  retryable: boolean;
}

export interface LiteratureContentProcessingBackfillPlanItemDTO {
  literature_id: string;
  title: string;
  rights_class: RightsClass;
  requested_stages: LiteratureContentProcessingStageCode[];
  blocked: boolean;
  blocker_code: string | null;
  retryable: boolean;
  key_content_curation_status: LiteratureKeyContentBackfillCurationStatus | null;
}

export interface LiteratureContentProcessingBackfillDryRunEstimateDTO {
  dry_run_id: string;
  generated_at: string;
  target_stage: LiteratureContentProcessingStageCode;
  workset: LiteratureContentProcessingBackfillWorkset;
  options: Required<Pick<LiteratureContentProcessingBackfillOptions, 'max_parallel_literature_runs' | 'extraction_concurrency' | 'embedding_concurrency'>> & {
    provider_call_budget: number | null;
  };
  total_literatures: number;
  selected_count: number;
  planned_item_count: number;
  skipped_ready_count: number;
  blocked_count: number;
  curation_required_count: number;
  stage_counts: Record<LiteratureContentProcessingStageCode, number>;
  rights_class_counts: Array<{ rights_class: RightsClass; count: number }>;
  estimated_provider_calls: {
    extraction_calls: number;
    embedding_calls: number;
  };
  estimated_storage_bytes: number;
  blockers: LiteratureContentProcessingBackfillBlockerDTO[];
  plan_items: LiteratureContentProcessingBackfillPlanItemDTO[];
}

export interface LiteratureContentProcessingBackfillDryRunResponse {
  estimate: LiteratureContentProcessingBackfillDryRunEstimateDTO;
}

export interface LiteratureContentProcessingBatchItemDTO {
  item_id: string;
  job_id: string;
  literature_id: string;
  title: string | null;
  status: LiteratureContentProcessingBatchItemStatus;
  requested_stages: LiteratureContentProcessingStageCode[];
  next_stage_index: number;
  content_processing_run_id: string | null;
  attempt_count: number;
  error_code: string | null;
  error_message: string | null;
  blocker_code: string | null;
  retryable: boolean;
  key_content_curation_status: LiteratureKeyContentBackfillCurationStatus | null;
  checkpoint: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface LiteratureContentProcessingBatchJobDTO {
  job_id: string;
  status: LiteratureContentProcessingBatchJobStatus;
  target_stage: LiteratureContentProcessingStageCode;
  workset: LiteratureContentProcessingBackfillWorkset;
  options: Required<Pick<LiteratureContentProcessingBackfillOptions, 'max_parallel_literature_runs' | 'extraction_concurrency' | 'embedding_concurrency'>> & {
    provider_call_budget: number | null;
  };
  dry_run_estimate: LiteratureContentProcessingBackfillDryRunEstimateDTO;
  totals: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    partial: number;
    blocked: number;
    failed: number;
    skipped: number;
    canceled: number;
  };
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  paused_at: string | null;
  canceled_at: string | null;
  finished_at: string | null;
  updated_at: string;
  items?: LiteratureContentProcessingBatchItemDTO[];
}

export interface CreateLiteratureContentProcessingBackfillJobResponse {
  job: LiteratureContentProcessingBatchJobDTO;
}

export interface LiteratureContentProcessingBackfillJobResponse {
  job: LiteratureContentProcessingBatchJobDTO;
}

export interface ListLiteratureContentProcessingBackfillJobsQuery {
  limit?: number;
}

export interface ListLiteratureContentProcessingBackfillJobsResponse {
  items: LiteratureContentProcessingBatchJobDTO[];
}

export interface LiteratureContentProcessingCleanupDryRunRequest {
  literature_ids?: string[];
  retention_days?: number;
}

export interface LiteratureContentProcessingCleanupCandidateDTO {
  embedding_version_id: string;
  literature_id: string;
  version_no: number;
  status: string;
  chunk_count: number;
  token_index_count: number;
  created_at: string;
  protected_reason: string | null;
}

export interface LiteratureContentProcessingCleanupDryRunResponse {
  generated_at: string;
  retention_days: number;
  candidate_count: number;
  protected_active_version_count: number;
  protected_raw_asset_count: number;
  estimated_chunks_to_remove: number;
  estimated_token_indexes_to_remove: number;
  candidates: LiteratureContentProcessingCleanupCandidateDTO[];
}

export interface LiteratureFulltextAcquisitionExplicitUrl {
  literature_id: string;
  source_url: string;
}

export interface LiteratureFulltextAcquisitionWorkset {
  topic_id?: string;
  paper_id?: string;
  literature_ids?: string[];
  rights_classes?: RightsClass[];
  only_missing_assets?: boolean;
  explicit_urls?: LiteratureFulltextAcquisitionExplicitUrl[];
  updated_at_from?: string;
  updated_at_to?: string;
}

export interface LiteratureFulltextAcquisitionOptions {
  max_parallel_downloads?: number;
  provider_call_budget?: number;
  max_byte_size?: number;
  force_refresh?: boolean;
}

export interface LiteratureFulltextAcquisitionDryRunRequest {
  workset?: LiteratureFulltextAcquisitionWorkset;
  options?: LiteratureFulltextAcquisitionOptions;
}

export type LiteratureFulltextAcquisitionCreateJobRequest = LiteratureFulltextAcquisitionDryRunRequest;

export interface LiteratureFulltextAcquisitionCandidateDTO {
  source_kind: LiteratureFulltextAcquisitionSourceKind;
  source_url: string | null;
  requires_resolution: boolean;
  provenance: Record<string, unknown>;
}

export interface LiteratureFulltextAcquisitionPlanItemDTO {
  literature_id: string;
  title: string;
  rights_class: RightsClass;
  selected_source_kind: LiteratureFulltextAcquisitionSourceKind | null;
  source_url: string | null;
  candidates: LiteratureFulltextAcquisitionCandidateDTO[];
  blocked: boolean;
  blocker_code: string | null;
  blocker_message: string | null;
  retryable: boolean;
}

export interface LiteratureFulltextAcquisitionDryRunEstimateDTO {
  dry_run_id: string;
  generated_at: string;
  workset: LiteratureFulltextAcquisitionWorkset;
  options: Required<Pick<LiteratureFulltextAcquisitionOptions, 'max_parallel_downloads' | 'force_refresh'>> & {
    provider_call_budget: number | null;
    max_byte_size: number;
  };
  total_literatures: number;
  selected_count: number;
  planned_item_count: number;
  skipped_existing_asset_count: number;
  blocked_count: number;
  source_counts: Array<{ source_kind: LiteratureFulltextAcquisitionSourceKind; count: number }>;
  estimated_provider_calls: {
    unpaywall_calls: number;
    download_calls: number;
  };
  blockers: Array<{
    literature_id: string;
    title: string;
    reason_code: string;
    reason_message: string;
    retryable: boolean;
  }>;
  plan_items: LiteratureFulltextAcquisitionPlanItemDTO[];
}

export interface LiteratureFulltextAcquisitionDryRunResponse {
  estimate: LiteratureFulltextAcquisitionDryRunEstimateDTO;
}

export interface LiteratureFulltextAcquisitionItemDTO {
  item_id: string;
  job_id: string;
  literature_id: string;
  title: string | null;
  status: LiteratureFulltextAcquisitionItemStatus;
  selected_source_kind: LiteratureFulltextAcquisitionSourceKind | null;
  source_url: string | null;
  final_url: string | null;
  content_asset_id: string | null;
  attempt_count: number;
  error_code: string | null;
  error_message: string | null;
  blocker_code: string | null;
  retryable: boolean;
  resolution_candidates: LiteratureFulltextAcquisitionCandidateDTO[];
  checkpoint: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface LiteratureFulltextAcquisitionSourceHealthDTO {
  source_kind: LiteratureFulltextAcquisitionHealthSourceKind;
  runtime_source: string;
  planned_count: number;
  succeeded_count: number;
  failed_count: number;
  blocked_count: number;
  retryable_failure_count: number;
  non_retryable_failure_count: number;
  error_counts_by_code: Record<string, number>;
  runtime_status: string | null;
  cooldown_until: string | null;
  failure_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  last_request_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
}

export interface LiteratureFulltextAcquisitionJobDTO {
  job_id: string;
  status: LiteratureFulltextAcquisitionJobStatus;
  workset: LiteratureFulltextAcquisitionWorkset;
  options: Required<Pick<LiteratureFulltextAcquisitionOptions, 'max_parallel_downloads' | 'force_refresh'>> & {
    provider_call_budget: number | null;
    max_byte_size: number;
  };
  dry_run_estimate: LiteratureFulltextAcquisitionDryRunEstimateDTO;
  totals: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    partial: number;
    blocked: number;
    failed: number;
    skipped: number;
    canceled: number;
  };
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  paused_at: string | null;
  canceled_at: string | null;
  finished_at: string | null;
  updated_at: string;
  source_health: LiteratureFulltextAcquisitionSourceHealthDTO[];
  items?: LiteratureFulltextAcquisitionItemDTO[];
}

export interface CreateLiteratureFulltextAcquisitionJobResponse {
  job: LiteratureFulltextAcquisitionJobDTO;
}

export interface LiteratureFulltextAcquisitionJobResponse {
  job: LiteratureFulltextAcquisitionJobDTO;
}

export interface ListLiteratureFulltextAcquisitionJobsQuery {
  limit?: number;
}

export interface ListLiteratureFulltextAcquisitionJobsResponse {
  items: LiteratureFulltextAcquisitionJobDTO[];
}

export interface LiteratureOverviewItem {
  literature_id: string;
  canonical_work_key: string;
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
  evidence_activation_status?: LiteratureEvidenceActivationStatus;
  evidence_activation_reason?: string | null;
  evidence_activation_score?: number | null;
  evidence_activated_at?: string | null;
  quality_assessment?: LiteratureQualityAssessmentDTO | null;
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
    activation_status_counts: Array<{ activation_status: LiteratureEvidenceActivationStatus; count: number }>;
    quality_status_counts: Array<{ quality_status: LiteratureQualityStatus; count: number }>;
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
  canonical_work_key: string;
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

export interface DownloadLiteratureContentAssetRequest {
  source_url: string;
  asset_kind?: LiteratureContentAssetKind;
  file_name?: string;
  mime_type?: string;
  max_byte_size?: number;
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

export type DownloadLiteratureContentAssetResponse = RegisterLiteratureContentAssetResponse;

export interface ListLiteratureContentAssetsResponse {
  literature_id: string;
  items: LiteratureContentAssetDTO[];
}

export interface GetLiteratureMetadataResponse {
  literature_id: string;
  canonical_work_key: string;
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
  include_stale?: boolean;
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
    weighted_vector?: number;
    weighted_lexical?: number;
    weighted_metadata?: number;
    matched_tokens?: string[];
    missing_tokens?: string[];
    exact_phrases?: string[];
    metadata_matched_tokens?: string[];
  };
}

export interface LiteratureRetrieveHit {
  literature_id: string;
  canonical_work_key: string;
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

export interface LiteratureLlmCallTelemetryDTO {
  provider_id: string;
  model_id: string;
  profile_id: string | null;
  prompt_template_id: string | null;
  prompt_template_version: string | null;
  elapsed_ms: number;
  request_count: number;
  retry_count: number;
  timeout_count: number;
  rate_limit_count: number;
  input_tokens: number | null;
  output_tokens: number | null;
  embedding_input_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
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
    query_embedding_telemetry: LiteratureLlmCallTelemetryDTO | null;
  };
}

export interface LiteratureClusterMemberDTO {
  member_id: string;
  cluster_id: string;
  literature_id: string;
  role: LiteratureClusterMemberRole;
  relation_type: LiteratureClusterRelationType;
  confidence: number;
  decision_status: LiteratureClusterMemberDecisionStatus;
  title: string | null;
  canonical_work_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiteratureClusterEvidenceDTO {
  evidence_id: string;
  cluster_id: string;
  literature_id_a: string;
  literature_id_b: string;
  signal_type: LiteratureClusterEvidenceSignalType;
  score: number;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface LiteratureClusterReviewDTO {
  outcome: LiteratureClusterReviewOutcome;
  consumption_scope: LiteratureClusterConsumptionScope;
  retrieval_dedup_active: boolean;
  review_required: boolean;
  accepted_member_count: number;
  rejected_member_count: number;
  pending_member_count: number;
  blocking_reasons: string[];
}

export interface LiteratureClusterDTO {
  cluster_id: string;
  cluster_type: LiteratureClusterType;
  status: LiteratureClusterStatus;
  representative_literature_id: string | null;
  confidence: number;
  method: string;
  created_at: string;
  updated_at: string;
  review: LiteratureClusterReviewDTO;
  members: LiteratureClusterMemberDTO[];
  evidence: LiteratureClusterEvidenceDTO[];
}

export interface LiteratureClusterCandidateGenerationRequest {
  cluster_types?: LiteratureClusterType[];
  min_confidence?: number;
  include_existing?: boolean;
}

export interface LiteratureClusterCandidateGenerationResponse {
  generated_count: number;
  clusters: LiteratureClusterDTO[];
  summary: {
    same_pdf_count: number;
    same_normalized_text_count: number;
    title_author_year_count: number;
    fuzzy_near_duplicate_count: number;
    embedding_similarity_count: number;
  };
}

export interface ListLiteratureClustersQuery {
  status?: LiteratureClusterStatus;
  cluster_type?: LiteratureClusterType;
  literature_id?: string;
  limit?: number;
}

export interface ListLiteratureClustersResponse {
  items: LiteratureClusterDTO[];
}

export interface LiteratureClusterMemberDecisionPatch {
  literature_id: string;
  decision_status?: LiteratureClusterMemberDecisionStatus;
  role?: LiteratureClusterMemberRole;
}

export interface UpdateLiteratureClusterRequest {
  status?: LiteratureClusterStatus;
  review_outcome?: LiteratureClusterReviewOutcome;
  representative_literature_id?: string | null;
  member_decisions?: LiteratureClusterMemberDecisionPatch[];
}

export interface UpdateLiteratureClusterResponse {
  item: LiteratureClusterDTO;
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
    include_stale: { type: 'boolean', default: false },
  },
  additionalProperties: false,
} as const;

export const literatureClusterCandidateGenerationRequestSchema = {
  type: 'object',
  properties: {
    cluster_types: {
      type: 'array',
      items: { type: 'string', enum: LITERATURE_CLUSTER_TYPES },
      minItems: 1,
    },
    min_confidence: { type: 'number', minimum: 0, maximum: 1 },
    include_existing: { type: 'boolean', default: true },
  },
  additionalProperties: false,
} as const;

export const listLiteratureClustersQuerySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: LITERATURE_CLUSTER_STATUSES },
    cluster_type: { type: 'string', enum: LITERATURE_CLUSTER_TYPES },
    literature_id: { type: 'string', minLength: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
  },
  additionalProperties: false,
} as const;

export const updateLiteratureClusterRequestSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: LITERATURE_CLUSTER_STATUSES },
    review_outcome: { type: 'string', enum: LITERATURE_CLUSTER_REVIEW_OUTCOMES },
    representative_literature_id: {
      anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }],
    },
    member_decisions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['literature_id'],
        properties: {
          literature_id: { type: 'string', minLength: 1 },
          decision_status: { type: 'string', enum: LITERATURE_CLUSTER_MEMBER_DECISION_STATUSES },
          role: { type: 'string', enum: LITERATURE_CLUSTER_MEMBER_ROLES },
        },
        additionalProperties: false,
        anyOf: [{ required: ['decision_status'] }, { required: ['role'] }],
      },
    },
  },
  additionalProperties: false,
  anyOf: [
    { required: ['status'] },
    { required: ['review_outcome'] },
    { required: ['representative_literature_id'] },
    { required: ['member_decisions'] },
  ],
} as const;

const literatureKeyContentSourceRefSchema = {
  type: 'object',
  required: ['ref_type', 'ref_id'],
  properties: {
    ref_type: { type: 'string', enum: LITERATURE_KEY_CONTENT_SOURCE_REF_TYPES },
    ref_id: { type: 'string', minLength: 1 },
    document_id: { type: 'string' },
    section_id: { type: 'string' },
    paragraph_id: { type: 'string' },
    anchor_id: { type: 'string' },
    checksum: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    start_offset: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    end_offset: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
  },
  additionalProperties: false,
} as const;

const literatureKeyContentItemSchema = {
  type: 'object',
  required: ['id', 'type', 'statement', 'details', 'source_refs', 'confidence', 'evidence_strength', 'notes', 'provenance'],
  properties: {
    id: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    statement: { type: 'string', minLength: 1 },
    details: { type: 'string' },
    source_refs: {
      type: 'array',
      minItems: 1,
      items: literatureKeyContentSourceRefSchema,
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidence_strength: { type: 'string', enum: LITERATURE_KEY_CONTENT_EVIDENCE_STRENGTHS },
    notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    provenance: { type: 'string', enum: LITERATURE_KEY_CONTENT_ITEM_PROVENANCES },
  },
  additionalProperties: false,
} as const;

export const literatureKeyContentDossierPayloadSchema = {
  type: 'object',
  required: ['schema_version', 'extraction_profile', 'readiness_status', 'input_refs', 'categories', 'quality_report', 'display_digest', 'generated_at'],
  properties: {
    schema_version: { type: 'string', enum: ['key_content.v1'] },
    extraction_profile: { type: 'string', enum: ['paper_semantic_dossier.v1'] },
    readiness_status: { type: 'string', enum: LITERATURE_KEY_CONTENT_READINESS_STATUSES },
    input_refs: { type: 'object', additionalProperties: true },
    categories: {
      type: 'object',
      required: [...LITERATURE_KEY_CONTENT_CATEGORY_KEYS],
      properties: Object.fromEntries(LITERATURE_KEY_CONTENT_CATEGORY_KEYS.map((category) => [
        category,
        {
          type: 'array',
          items: literatureKeyContentItemSchema,
        },
      ])),
      additionalProperties: false,
    },
    quality_report: {
      type: 'object',
      required: ['completeness_score', 'confidence', 'blockers', 'warnings', 'conflicts', 'extraction_diagnostics'],
      properties: {
        completeness_score: { type: 'number', minimum: 0, maximum: 1 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        blockers: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        conflicts: { type: 'array', items: { type: 'string' } },
        extraction_diagnostics: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
      additionalProperties: false,
    },
    display_digest: { type: 'string' },
    generated_at: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const importLiteratureKeyContentDossierRequestSchema = {
  type: 'object',
  required: ['curation_source', 'dossier'],
  properties: {
    curation_source: { type: 'string', enum: LITERATURE_KEY_CONTENT_CURATION_SOURCES },
    curator: { type: 'string', minLength: 1 },
    dossier: literatureKeyContentDossierPayloadSchema,
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

const literatureExtractionRuntimeSettingsSchema = {
  type: 'object',
  properties: {
    preferred_key_content_method: { type: 'string', enum: LITERATURE_KEY_CONTENT_READY_METHODS, default: 'codex_curated' },
    section_concurrency: { type: 'integer', minimum: 1, maximum: 8 },
    request_timeout_ms: { type: 'integer', minimum: 1_000, maximum: 300_000 },
    max_retries: { type: 'integer', minimum: 0, maximum: 3 },
    prompt_profile_id: { type: 'string', minLength: 1 },
    diagnostic_policy: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const literatureFulltextParserSettingsSchema = {
  type: 'object',
  properties: {
    grobid: {
      type: 'object',
      properties: {
        endpoint_url: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const literatureAcquisitionThrottleSchema = {
  type: 'object',
  properties: {
    min_interval_ms: { type: 'integer', minimum: 0, maximum: 3_600_000 },
    concurrency: { type: 'integer', minimum: 1, maximum: 10 },
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
        runtime: literatureExtractionRuntimeSettingsSchema,
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
    fulltext_parser: literatureFulltextParserSettingsSchema,
  },
  additionalProperties: false,
  anyOf: [
    { required: ['providers'] },
    { required: ['embedding'] },
    { required: ['extraction'] },
    { required: ['storage_roots'] },
    { required: ['fulltext_parser'] },
  ],
} as const;

export const updateLiteratureAcquisitionSettingsRequestSchema = {
  type: 'object',
  properties: {
    unpaywall: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        email: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
      },
      additionalProperties: false,
    },
    downloader: {
      type: 'object',
      properties: {
        max_byte_size: { type: 'integer', minimum: 1, maximum: 500 * 1024 * 1024 },
        timeout_ms: { type: 'integer', minimum: 1_000, maximum: 300_000 },
        max_redirects: { type: 'integer', minimum: 0, maximum: 10 },
        require_pdf_signature: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    source_throttle: {
      type: 'object',
      properties: {
        arxiv: literatureAcquisitionThrottleSchema,
        crossref: literatureAcquisitionThrottleSchema,
        zotero: literatureAcquisitionThrottleSchema,
        unpaywall: literatureAcquisitionThrottleSchema,
        download: literatureAcquisitionThrottleSchema,
      },
      additionalProperties: false,
    },
    quality_scorer: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        model: { type: 'string', minLength: 1 },
        prompt_version: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
  anyOf: [
    { required: ['unpaywall'] },
    { required: ['downloader'] },
    { required: ['source_throttle'] },
    { required: ['quality_scorer'] },
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

const literatureBackfillStageFiltersSchema = {
  type: 'object',
  properties: {
    missing: { type: 'boolean' },
    stale: { type: 'boolean' },
    failed: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

const literatureBackfillWorksetSchema = {
  type: 'object',
  properties: {
    topic_id: { type: 'string', minLength: 1 },
    paper_id: { type: 'string', minLength: 1 },
    literature_ids: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', minLength: 1 },
    },
    rights_classes: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', enum: RIGHTS_CLASSES },
    },
    stage_filters: literatureBackfillStageFiltersSchema,
    updated_at_from: { type: 'string', minLength: 1, format: 'date-time' },
    updated_at_to: { type: 'string', minLength: 1, format: 'date-time' },
  },
  additionalProperties: false,
} as const;

const literatureBackfillOptionsSchema = {
  type: 'object',
  properties: {
    max_parallel_literature_runs: { type: 'integer', minimum: 1, maximum: 4, default: 1 },
    extraction_concurrency: { type: 'integer', minimum: 1, maximum: 4, default: 1 },
    embedding_concurrency: { type: 'integer', minimum: 1, maximum: 4, default: 1 },
    provider_call_budget: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
} as const;

export const literatureContentProcessingBackfillDryRunRequestSchema = {
  type: 'object',
  properties: {
    workset: literatureBackfillWorksetSchema,
    target_stage: { type: 'string', enum: LITERATURE_CONTENT_PROCESSING_STAGE_CODES, default: 'INDEXED' },
    options: literatureBackfillOptionsSchema,
  },
  additionalProperties: false,
} as const;

export const literatureContentProcessingBackfillCreateJobRequestSchema =
  literatureContentProcessingBackfillDryRunRequestSchema;

export const listLiteratureContentProcessingBackfillJobsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
  additionalProperties: false,
} as const;

export const literatureContentProcessingCleanupDryRunRequestSchema = {
  type: 'object',
  properties: {
    literature_ids: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', minLength: 1 },
    },
    retention_days: { type: 'integer', minimum: 0, maximum: 3650, default: 30 },
  },
  additionalProperties: false,
} as const;

const literatureFulltextAcquisitionExplicitUrlSchema = {
  type: 'object',
  required: ['literature_id', 'source_url'],
  properties: {
    literature_id: { type: 'string', minLength: 1 },
    source_url: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const literatureFulltextAcquisitionWorksetSchema = {
  type: 'object',
  properties: {
    topic_id: { type: 'string', minLength: 1 },
    paper_id: { type: 'string', minLength: 1 },
    literature_ids: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', minLength: 1 },
    },
    rights_classes: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', enum: RIGHTS_CLASSES },
    },
    only_missing_assets: { type: 'boolean', default: true },
    explicit_urls: {
      type: 'array',
      minItems: 1,
      items: literatureFulltextAcquisitionExplicitUrlSchema,
    },
    updated_at_from: { type: 'string', minLength: 1, format: 'date-time' },
    updated_at_to: { type: 'string', minLength: 1, format: 'date-time' },
  },
  additionalProperties: false,
} as const;

const literatureFulltextAcquisitionOptionsSchema = {
  type: 'object',
  properties: {
    max_parallel_downloads: { type: 'integer', minimum: 1, maximum: 4, default: 1 },
    provider_call_budget: { type: 'integer', minimum: 1 },
    max_byte_size: { type: 'integer', minimum: 1, maximum: 500 * 1024 * 1024 },
    force_refresh: { type: 'boolean', default: false },
  },
  additionalProperties: false,
} as const;

export const literatureFulltextAcquisitionDryRunRequestSchema = {
  type: 'object',
  properties: {
    workset: literatureFulltextAcquisitionWorksetSchema,
    options: literatureFulltextAcquisitionOptionsSchema,
  },
  additionalProperties: false,
} as const;

export const literatureFulltextAcquisitionCreateJobRequestSchema =
  literatureFulltextAcquisitionDryRunRequestSchema;

export const listLiteratureFulltextAcquisitionJobsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
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
          activation_status: { type: 'string', enum: LITERATURE_EVIDENCE_ACTIVATION_STATUSES },
          activation_reason: { type: 'string' },
          activation_score: {
            anyOf: [
              { type: 'number', minimum: 0, maximum: 100 },
              { type: 'null' },
            ],
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export const updateTopicLiteratureEvidenceActivationRequestSchema = {
  type: 'object',
  required: ['actions'],
  properties: {
    actions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['literature_id', 'activation_status'],
        properties: {
          literature_id: { type: 'string', minLength: 1 },
          activation_status: { type: 'string', enum: LITERATURE_EVIDENCE_ACTIVATION_STATUSES },
          reason: { type: 'string' },
          activation_score: {
            anyOf: [
              { type: 'number', minimum: 0, maximum: 100 },
              { type: 'null' },
            ],
          },
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

export const downloadLiteratureContentAssetRequestSchema = {
  type: 'object',
  required: ['source_url'],
  properties: {
    source_url: { type: 'string', minLength: 1 },
    asset_kind: { type: 'string', enum: LITERATURE_CONTENT_ASSET_KINDS, default: 'raw_fulltext' },
    file_name: { type: 'string', minLength: 1 },
    mime_type: { type: 'string', minLength: 1 },
    max_byte_size: { type: 'integer', minimum: 1 },
    rights_class: { type: 'string', enum: RIGHTS_CLASSES },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
} as const;
