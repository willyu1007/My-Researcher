export const MODULE_IDS = [
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
  'M8',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export const NODE_STATUS = [
  'draft',
  'candidate',
  'promoted',
  'hold',
  'rejected',
  'superseded',
] as const;

export type NodeStatus = (typeof NODE_STATUS)[number];

export const GATE_DECISIONS = ['promote', 'hold', 'reject', 'loopback'] as const;
export type GateDecision = (typeof GATE_DECISIONS)[number];

export const SPINE_SNAPSHOT_TYPES = ['SP-partial', 'SP-full'] as const;
export type SpineSnapshotType = (typeof SPINE_SNAPSHOT_TYPES)[number];

export const ANALYSIS_CONTRACTS = ['with_m6', 'no_m6'] as const;
export type AnalysisContract = (typeof ANALYSIS_CONTRACTS)[number];

export const CREATED_BY_MODES = ['llm', 'human', 'hybrid'] as const;
export type CreatedByMode = (typeof CREATED_BY_MODES)[number];

export interface LineageMeta {
  paper_id: string;
  stage_id: string;
  module_id: ModuleId;
  version_id: string;
  parent_version_id?: string;
  parent_node_ids?: string[];
  run_id: string;
  lane_id: string;
  attempt_id: string;
  created_by: CreatedByMode;
  created_at: string;
}

export interface ScoreVector {
  [dimension: string]: number;
}

export interface ValueJudgementPayload {
  judgement_id: string;
  decision: GateDecision;
  core_score_vector: ScoreVector;
  extension_score_vector: ScoreVector;
  confidence: number;
  reason_summary: string;
  reviewer: CreatedByMode;
  timestamp: string;
}

export interface SnapshotManifestCompatibilityVector {
  claim_set_hash: string;
  problem_scope_hash: string;
  dataset_protocol_hash: string;
  evaluation_protocol_hash: string;
}

export interface SnapshotManifestPayload {
  snapshot_id: string;
  snapshot_type: SpineSnapshotType;
  spine_type?: AnalysisContract;
  paper_id: string;
  node_refs: string[];
  compatibility_vector: SnapshotManifestCompatibilityVector;
  created_at: string;
  created_by: CreatedByMode;
}

export interface SnapshotPointerPayload {
  paper_id: string;
  paper_active_sp_full?: string;
  paper_active_sp_partial?: string;
  changed_by: CreatedByMode;
  changed_at: string;
  change_reason: string;
}

export interface CreatePaperProjectRequest {
  topic_id: string;
  title: string;
  research_direction?: string;
  created_by: Exclude<CreatedByMode, 'llm'>;
  initial_context: {
    literature_evidence_ids: string[];
  };
}

export interface CreatePaperProjectResponse {
  paper_id: string;
  status: 'active';
  paper_active_sp_full: string | null;
  paper_active_sp_partial: string | null;
  created_at: string;
}

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

export const LITERATURE_PIPELINE_STAGE_CODES = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'KEY_CONTENT_READY',
  'FULLTEXT_PREPROCESSED',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
] as const;
export type LiteraturePipelineStageCode = (typeof LITERATURE_PIPELINE_STAGE_CODES)[number];

export const LITERATURE_PIPELINE_STAGE_STATUSES = [
  'NOT_STARTED',
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'BLOCKED',
  'SKIPPED',
] as const;
export type LiteraturePipelineStageStatus = (typeof LITERATURE_PIPELINE_STAGE_STATUSES)[number];

export const LITERATURE_PIPELINE_RUN_STATUSES = ['PENDING', 'RUNNING', 'PARTIAL', 'SUCCESS', 'FAILED', 'SKIPPED'] as const;
export type LiteraturePipelineRunStatus = (typeof LITERATURE_PIPELINE_RUN_STATUSES)[number];

export const LITERATURE_PIPELINE_TRIGGER_SOURCES = [
  'AUTO_PULL',
  'MANUAL_IMPORT',
  'ZOTERO_IMPORT',
  'METADATA_PATCH',
  'OVERVIEW_ACTION',
  'BACKFILL',
] as const;
export type LiteraturePipelineTriggerSource = (typeof LITERATURE_PIPELINE_TRIGGER_SOURCES)[number];

export const LITERATURE_PIPELINE_DEDUP_STATUSES = ['unique', 'duplicate', 'unknown'] as const;
export type LiteraturePipelineDedupStatus = (typeof LITERATURE_PIPELINE_DEDUP_STATUSES)[number];

export interface LiteratureImportItem {
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

export interface LiteratureImportRequest {
  items: LiteratureImportItem[];
}

export interface LiteratureImportResult {
  literature_id: string;
  is_new: boolean;
  matched_by: DedupMatchType;
  title: string;
  source_provider: LiteratureProvider;
  source_url: string;
}

export interface LiteratureImportResponse {
  results: LiteratureImportResult[];
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
  items: LiteratureImportItem[];
}

export interface ZoteroImportResponse {
  topic_id?: string;
  imported_count: number;
  scope_upserted_count: number;
  results: LiteratureImportResult[];
}

export const AUTO_PULL_SCOPES = ['GLOBAL', 'TOPIC'] as const;
export type AutoPullScope = (typeof AUTO_PULL_SCOPES)[number];

export const AUTO_PULL_RULE_STATUSES = ['ACTIVE', 'PAUSED'] as const;
export type AutoPullRuleStatus = (typeof AUTO_PULL_RULE_STATUSES)[number];

export const AUTO_PULL_SOURCES = ['CROSSREF', 'ARXIV', 'ZOTERO'] as const;
export type AutoPullSource = (typeof AUTO_PULL_SOURCES)[number];

export const AUTO_PULL_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;
export type AutoPullFrequency = (typeof AUTO_PULL_FREQUENCIES)[number];

export const AUTO_PULL_TRIGGER_TYPES = ['MANUAL', 'SCHEDULE'] as const;
export type AutoPullTriggerType = (typeof AUTO_PULL_TRIGGER_TYPES)[number];

export const AUTO_PULL_RUN_STATUSES = ['PENDING', 'RUNNING', 'PARTIAL', 'SUCCESS', 'FAILED', 'SKIPPED'] as const;
export type AutoPullRunStatus = (typeof AUTO_PULL_RUN_STATUSES)[number];

export const AUTO_PULL_ALERT_LEVELS = ['WARNING', 'ERROR'] as const;
export type AutoPullAlertLevel = (typeof AUTO_PULL_ALERT_LEVELS)[number];

export interface TopicProfileDTO {
  topic_id: string;
  name: string;
  is_active: boolean;
  include_keywords: string[];
  exclude_keywords: string[];
  venue_filters: string[];
  default_lookback_days: number;
  default_min_year: number | null;
  default_max_year: number | null;
  rule_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTopicProfileRequest {
  topic_id: string;
  name: string;
  is_active?: boolean;
  include_keywords?: string[];
  exclude_keywords?: string[];
  venue_filters?: string[];
  default_lookback_days?: number;
  default_min_year?: number | null;
  default_max_year?: number | null;
  rule_ids?: string[];
}

export interface UpdateTopicProfileRequest {
  name?: string;
  is_active?: boolean;
  include_keywords?: string[];
  exclude_keywords?: string[];
  venue_filters?: string[];
  default_lookback_days?: number;
  default_min_year?: number | null;
  default_max_year?: number | null;
  rule_ids?: string[];
}

export interface AutoPullRuleSourceDTO {
  source: AutoPullSource;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
}

export interface AutoPullRuleScheduleDTO {
  frequency: AutoPullFrequency;
  days_of_week: string[];
  hour: number;
  minute: number;
  timezone: string;
  active: boolean;
}

export interface AutoPullRuleDTO {
  rule_id: string;
  scope: AutoPullScope;
  topic_id: string | null;
  topic_ids: string[];
  name: string;
  status: AutoPullRuleStatus;
  query_spec: {
    include_keywords: string[];
    exclude_keywords: string[];
    authors: string[];
    venues: string[];
    max_results_per_source: number;
  };
  time_spec: {
    lookback_days: number;
    min_year: number | null;
    max_year: number | null;
  };
  quality_spec: {
    min_quality_score: number;
  };
  sources: AutoPullRuleSourceDTO[];
  schedules: AutoPullRuleScheduleDTO[];
  created_at: string;
  updated_at: string;
}

export interface CreateAutoPullRuleRequest {
  scope: AutoPullScope;
  topic_id?: string;
  topic_ids?: string[];
  name: string;
  status?: AutoPullRuleStatus;
  query_spec?: {
    include_keywords?: string[];
    exclude_keywords?: string[];
    authors?: string[];
    venues?: string[];
    max_results_per_source?: number;
  };
  time_spec?: {
    lookback_days?: number;
    min_year?: number | null;
    max_year?: number | null;
  };
  quality_spec?: {
    min_quality_score?: number;
  };
  sources: Array<{
    source: AutoPullSource;
    enabled?: boolean;
    priority?: number;
    config?: Record<string, unknown>;
  }>;
  schedules: Array<{
    frequency: AutoPullFrequency;
    days_of_week?: string[];
    hour: number;
    minute: number;
    timezone: string;
    active?: boolean;
  }>;
}

export interface UpdateAutoPullRuleRequest {
  scope?: AutoPullScope;
  topic_id?: string | null;
  topic_ids?: string[];
  name?: string;
  status?: AutoPullRuleStatus;
  query_spec?: {
    include_keywords?: string[];
    exclude_keywords?: string[];
    authors?: string[];
    venues?: string[];
    max_results_per_source?: number;
  };
  time_spec?: {
    lookback_days?: number;
    min_year?: number | null;
    max_year?: number | null;
  };
  quality_spec?: {
    min_quality_score?: number;
  };
  sources?: Array<{
    source: AutoPullSource;
    enabled?: boolean;
    priority?: number;
    config?: Record<string, unknown>;
  }>;
  schedules?: Array<{
    frequency: AutoPullFrequency;
    days_of_week?: string[];
    hour: number;
    minute: number;
    timezone: string;
    active?: boolean;
  }>;
}

export interface CreateAutoPullRunRequest {
  trigger_type?: AutoPullTriggerType;
  full_refresh?: boolean;
}

export interface RetryFailedSourcesRequest {
  sources?: AutoPullSource[];
}

export interface AutoPullRunSourceAttemptDTO {
  source: AutoPullSource;
  status: AutoPullRunStatus;
  fetched_count: number;
  imported_count: number;
  failed_count: number;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  meta: Record<string, unknown>;
}

export interface AutoPullSuggestionDTO {
  suggestion_id: string;
  literature_id: string;
  topic_id: string | null;
  suggested_scope: TopicScopeStatus;
  reason: string;
  score: number;
  created_at: string;
}

export interface AutoPullRunDTO {
  run_id: string;
  rule_id: string;
  trigger_type: AutoPullTriggerType;
  status: AutoPullRunStatus;
  started_at: string | null;
  finished_at: string | null;
  summary: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  source_attempts?: AutoPullRunSourceAttemptDTO[];
  suggestions?: AutoPullSuggestionDTO[];
}

export interface AutoPullAlertDTO {
  alert_id: string;
  rule_id: string;
  run_id: string | null;
  source: AutoPullSource | null;
  level: AutoPullAlertLevel;
  code: string;
  message: string;
  detail: Record<string, unknown>;
  ack_at: string | null;
  created_at: string;
}

export interface AcknowledgeAlertRequest {
  ack_at?: string;
}

export interface LiteraturePipelineStateDTO {
  literature_id: string;
  citation_complete: boolean;
  abstract_ready: boolean;
  key_content_ready: boolean;
  dedup_status: LiteraturePipelineDedupStatus;
  updated_at: string;
}

export interface LiteraturePipelineStageStateDTO {
  stage_code: LiteraturePipelineStageCode;
  status: LiteraturePipelineStageStatus;
  last_run_id: string | null;
  detail: Record<string, unknown>;
  updated_at: string;
}

export interface LiteraturePipelineRunStepDTO {
  step_id: string;
  stage_code: LiteraturePipelineStageCode;
  status: LiteraturePipelineStageStatus;
  input_ref: Record<string, unknown>;
  output_ref: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface LiteraturePipelineRunDTO {
  run_id: string;
  literature_id: string;
  trigger_source: LiteraturePipelineTriggerSource;
  status: LiteraturePipelineRunStatus;
  requested_stages: LiteraturePipelineStageCode[];
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  steps?: LiteraturePipelineRunStepDTO[];
}

export interface GetLiteraturePipelineResponse {
  literature_id: string;
  state: LiteraturePipelineStateDTO;
  stage_states: LiteraturePipelineStageStateDTO[];
}

export interface CreateLiteraturePipelineRunRequest {
  requested_stages?: LiteraturePipelineStageCode[];
}

export interface CreateLiteraturePipelineRunResponse {
  run: LiteraturePipelineRunDTO;
}

export interface ListLiteraturePipelineRunsResponse {
  literature_id: string;
  items: LiteraturePipelineRunDTO[];
}

export interface ListLiteraturePipelineRunsQuery {
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
  pipeline_state: {
    citation_complete: boolean;
    abstract_ready: boolean;
    key_content_ready: boolean;
  };
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

export interface VersionSpineCommitRequest {
  lineage_meta: LineageMeta;
  payload_ref: string;
  node_status: 'candidate' | 'draft';
  value_judgement_payload?: ValueJudgementPayload;
}

export interface VersionSpineCommitResponse {
  node_id: string;
  accepted: boolean;
  node_status: NodeStatus;
}

export interface StageGateVerifyRequest {
  candidate_node_ids: string[];
  config_version: string;
  reviewer_mode: CreatedByMode;
  analysis_contract: AnalysisContract;
  override_context?: {
    skip_m6_reason?: string;
    training_claim_allowed?: boolean;
  };
}

export interface StageGateVerifyResult {
  node_id: string;
  decision: GateDecision;
  reason_summary: string;
}

export interface StageGateVerifyResponse {
  gate_run_id: string;
  results: StageGateVerifyResult[];
  snapshot?: {
    snapshot_id: string;
    snapshot_type: SpineSnapshotType;
    spine_type?: AnalysisContract;
  };
  pointer_update?: {
    paper_active_sp_full?: string;
    paper_active_sp_partial?: string;
  };
}

export interface WritingPackageBuildRequest {
  source_snapshot_id: string;
  writing_mode: 'submission' | 'revision' | 'draft';
  target_release_tag: string;
  sections: string[];
}

export interface WritingPackageBuildResponse {
  writing_package_id: string;
  source_snapshot_id: string;
  release_tag: string;
  section_node_ids: string[];
  compliance_flags: {
    claim_evidence_coverage_ok: boolean;
    no_m6_wording_ok: boolean;
  };
}

export type TimelineSeverity = 'info' | 'warning' | 'error';

export interface PaperTimelineEvent {
  event_id: string;
  event_type: string;
  module_id?: ModuleId;
  timestamp: string;
  node_id?: string;
  summary: string;
  severity?: TimelineSeverity;
}

export interface GetPaperTimelineResponse {
  paper_id: string;
  events: PaperTimelineEvent[];
}

export interface ArtifactBundle {
  proposal_url: string | null;
  paper_url: string | null;
  repo_url: string | null;
  review_url: string | null;
}

export interface GetPaperArtifactBundleResponse {
  paper_id: string;
  artifact_bundle: ArtifactBundle;
}

export interface PaperRuntimeMetric {
  tokens: number | null;
  cost_usd: number | null;
  gpu_requested: number | null;
  gpu_total: number | null;
  updated_at: string;
}

export interface GetPaperResourceMetricsResponse {
  paper_id: string;
  paper_runtime_metric: PaperRuntimeMetric;
}

export const RELEASE_REVIEW_DECISIONS = ['approve', 'reject', 'hold'] as const;
export type ReleaseReviewDecision = (typeof RELEASE_REVIEW_DECISIONS)[number];

export interface ReleaseReviewPayload {
  reviewers: string[];
  decision: ReleaseReviewDecision;
  risk_flags: string[];
  label_policy: string;
  comment?: string;
}

export interface ReleaseGateReviewResponse {
  gate_result: {
    accepted: boolean;
    review_id: string;
    approved_by?: string;
    approved_at?: string;
    audit_ref: string;
  };
}

export interface LlmWorkflowPlanGeneratedEvent {
  event_id: string;
  paper_id: string;
  run_id: string;
  lane_id: string;
  attempt_id: string;
  planner_profile: string;
  created_at: string;
}

export interface StageGateCheckRequestedEvent {
  event_id: string;
  paper_id: string;
  gate_id: string;
  candidate_node_ids: string[];
  analysis_contract: AnalysisContract;
  requested_by: CreatedByMode;
  requested_at: string;
}

export interface StageGateCheckResultEvent {
  event_id: string;
  paper_id: string;
  gate_run_id: string;
  result_summary: string;
  snapshot_id?: string;
  emitted_at: string;
}

export interface VersionSpineCommittedEvent {
  event_id: string;
  paper_id: string;
  node_id: string;
  module_id: ModuleId;
  version_id: string;
  lane_id: string;
  attempt_id: string;
  committed_at: string;
}

export interface SnapshotPointerSwitchedEvent {
  event_id: string;
  paper_id: string;
  pointer_type: 'full' | 'partial';
  from_snapshot_id?: string;
  to_snapshot_id: string;
  reason: string;
  changed_by: CreatedByMode;
  changed_at: string;
}

export interface ResearchNodeStatusChangedEvent {
  event_id: string;
  paper_id: string;
  node_id: string;
  from_status?: NodeStatus;
  to_status: NodeStatus;
  changed_at: string;
  changed_by: CreatedByMode;
}

export interface ResearchTimelineEventAppendedEvent {
  event_id: string;
  paper_id: string;
  timeline_event: PaperTimelineEvent;
  appended_at: string;
}

export interface ResearchMetricsUpdatedEvent {
  event_id: string;
  paper_id: string;
  paper_runtime_metric: PaperRuntimeMetric;
  updated_at: string;
}

export interface ResearchReleaseReviewedEvent {
  event_id: string;
  paper_id: string;
  review_id: string;
  decision: ReleaseReviewDecision;
  reviewers: string[];
  label_policy: string;
  reviewed_at: string;
}

export type ResearchLifecycleEvent =
  | LlmWorkflowPlanGeneratedEvent
  | StageGateCheckRequestedEvent
  | StageGateCheckResultEvent
  | VersionSpineCommittedEvent
  | SnapshotPointerSwitchedEvent
  | ResearchNodeStatusChangedEvent
  | ResearchTimelineEventAppendedEvent
  | ResearchMetricsUpdatedEvent
  | ResearchReleaseReviewedEvent;

export const ERROR_CODES = [
  'INVALID_PAYLOAD',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'SNAPSHOT_COMPATIBILITY_FAILED',
  'GATE_CONSTRAINT_FAILED',
  'NO_M6_POLICY_VIOLATION',
  'SNAPSHOT_LOCKED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorResponse {
  status_code: 400 | 404 | 409 | 422 | 423;
  error_code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export const VERSION_ID_PATTERN = /^P\d+-M[1-8]-B\d+-N\d+$/;
export const SNAPSHOT_ID_PATTERN = /^SP-\d{4}$/;
export const RELEASE_TAG_PATTERN = /^R\d+\.\d+\.\d+$/;

export function isVersionId(value: string): boolean {
  return VERSION_ID_PATTERN.test(value);
}

export function isSnapshotId(value: string): boolean {
  return SNAPSHOT_ID_PATTERN.test(value);
}

export function isReleaseTag(value: string): boolean {
  return RELEASE_TAG_PATTERN.test(value);
}

export function needsNoM6OverrideContext(
  request: StageGateVerifyRequest,
): boolean {
  return request.analysis_contract === 'no_m6';
}

export function validateNoM6OverrideContext(
  request: StageGateVerifyRequest,
): { ok: true } | { ok: false; reason: string } {
  if (!needsNoM6OverrideContext(request)) {
    return { ok: true };
  }

  const context = request.override_context;
  if (!context?.skip_m6_reason || context.skip_m6_reason.trim().length === 0) {
    return { ok: false, reason: 'skip_m6_reason is required for no_m6 contract.' };
  }

  if (context.training_claim_allowed !== false) {
    return {
      ok: false,
      reason: 'training_claim_allowed must be false for no_m6 contract.',
    };
  }

  return { ok: true };
}

export const createPaperProjectRequestSchema = {
  type: 'object',
  required: ['topic_id', 'title', 'created_by', 'initial_context'],
  properties: {
    topic_id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    research_direction: { type: 'string', default: 'LLM' },
    created_by: { type: 'string', enum: ['human', 'hybrid'] },
    initial_context: {
      type: 'object',
      required: ['literature_evidence_ids'],
      properties: {
        literature_evidence_ids: {
          type: 'array',
          minItems: 1,
          items: { type: 'string', minLength: 1 },
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const versionSpineCommitRequestSchema = {
  type: 'object',
  required: ['lineage_meta', 'payload_ref', 'node_status'],
  properties: {
    lineage_meta: {
      type: 'object',
      required: [
        'paper_id',
        'stage_id',
        'module_id',
        'version_id',
        'run_id',
        'lane_id',
        'attempt_id',
        'created_by',
        'created_at',
      ],
      properties: {
        paper_id: { type: 'string' },
        stage_id: { type: 'string' },
        module_id: { type: 'string', enum: ['M4', 'M5', 'M6', 'M7'] },
        version_id: { type: 'string', pattern: '^P\\d+-M[1-8]-B\\d+-N\\d+$' },
        parent_version_id: { type: 'string' },
        parent_node_ids: { type: 'array', items: { type: 'string' } },
        run_id: { type: 'string' },
        lane_id: { type: 'string' },
        attempt_id: { type: 'string' },
        created_by: { type: 'string', enum: CREATED_BY_MODES },
        created_at: { type: 'string', format: 'date-time' },
      },
      additionalProperties: false,
    },
    payload_ref: { type: 'string', minLength: 1 },
    node_status: { type: 'string', enum: ['draft', 'candidate'] },
    value_judgement_payload: {
      type: 'object',
      required: [
        'judgement_id',
        'decision',
        'core_score_vector',
        'extension_score_vector',
        'confidence',
        'reason_summary',
        'reviewer',
        'timestamp',
      ],
      properties: {
        judgement_id: { type: 'string' },
        decision: { type: 'string', enum: GATE_DECISIONS },
        core_score_vector: { type: 'object' },
        extension_score_vector: { type: 'object' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reason_summary: { type: 'string', minLength: 1 },
        reviewer: { type: 'string', enum: CREATED_BY_MODES },
        timestamp: { type: 'string', format: 'date-time' },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: false,
} as const;

export const stageGateVerifyRequestSchema = {
  type: 'object',
  required: ['candidate_node_ids', 'config_version', 'reviewer_mode', 'analysis_contract'],
  properties: {
    candidate_node_ids: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    config_version: { type: 'string', minLength: 1 },
    reviewer_mode: { type: 'string', enum: CREATED_BY_MODES },
    analysis_contract: { type: 'string', enum: ANALYSIS_CONTRACTS },
    override_context: {
      type: 'object',
      properties: {
        skip_m6_reason: { type: 'string' },
        training_claim_allowed: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const writingPackageBuildRequestSchema = {
  type: 'object',
  required: ['source_snapshot_id', 'writing_mode', 'target_release_tag', 'sections'],
  properties: {
    source_snapshot_id: { type: 'string', pattern: '^SP-\\d{4}$' },
    writing_mode: { type: 'string', enum: ['submission', 'revision', 'draft'] },
    target_release_tag: { type: 'string', pattern: '^R\\d+\\.\\d+\\.\\d+$' },
    sections: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
  },
  additionalProperties: false,
} as const;

export const releaseReviewRequestSchema = {
  type: 'object',
  required: ['reviewers', 'decision', 'risk_flags', 'label_policy'],
  properties: {
    reviewers: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    decision: { type: 'string', enum: RELEASE_REVIEW_DECISIONS },
    risk_flags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    label_policy: { type: 'string', minLength: 1 },
    comment: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const literatureImportRequestSchema = {
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

const autoPullRuleSourceSchema = {
  type: 'object',
  required: ['source'],
  properties: {
    source: { type: 'string', enum: AUTO_PULL_SOURCES },
    enabled: { type: 'boolean', default: true },
    priority: { type: 'integer', minimum: 1, maximum: 999, default: 100 },
    config: { type: 'object', additionalProperties: true, default: {} },
  },
  additionalProperties: false,
} as const;

const autoPullRuleScheduleSchema = {
  type: 'object',
  required: ['frequency', 'hour', 'minute', 'timezone'],
  properties: {
    frequency: { type: 'string', enum: AUTO_PULL_FREQUENCIES },
    days_of_week: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    hour: { type: 'integer', minimum: 0, maximum: 23 },
    minute: { type: 'integer', minimum: 0, maximum: 59 },
    timezone: { type: 'string', minLength: 1 },
    active: { type: 'boolean', default: true },
  },
  additionalProperties: false,
} as const;

export const createTopicProfileRequestSchema = {
  type: 'object',
  required: ['topic_id', 'name'],
  properties: {
    topic_id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    is_active: { type: 'boolean', default: true },
    include_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    exclude_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    venue_filters: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    default_lookback_days: { type: 'integer', minimum: 1, maximum: 3650, default: 30 },
    default_min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    default_max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    rule_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
      maxItems: 1,
      default: [],
    },
  },
  additionalProperties: false,
} as const;

export const updateTopicProfileRequestSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    is_active: { type: 'boolean' },
    include_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    exclude_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    venue_filters: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    default_lookback_days: { type: 'integer', minimum: 1, maximum: 3650 },
    default_min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    default_max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    rule_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
      maxItems: 1,
    },
  },
  additionalProperties: false,
  minProperties: 1,
} as const;

export const createAutoPullRuleRequestSchema = {
  type: 'object',
  required: ['scope', 'name', 'sources', 'schedules'],
  properties: {
    scope: { type: 'string', enum: AUTO_PULL_SCOPES },
    topic_id: { type: 'string', minLength: 1 },
    topic_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
    name: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RULE_STATUSES, default: 'ACTIVE' },
    query_spec: {
      type: 'object',
      properties: {
        include_keywords: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        exclude_keywords: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        authors: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        venues: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        max_results_per_source: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
      },
      additionalProperties: false,
      default: {},
    },
    time_spec: {
      type: 'object',
      properties: {
        lookback_days: { type: 'integer', minimum: 1, maximum: 3650, default: 30 },
        min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
        max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
      },
      additionalProperties: false,
      default: {},
    },
    quality_spec: {
      type: 'object',
      properties: {
        min_quality_score: { type: 'integer', minimum: 0, maximum: 100, default: 70 },
      },
      additionalProperties: false,
      default: {},
    },
    sources: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleSourceSchema,
    },
    schedules: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleScheduleSchema,
    },
  },
  additionalProperties: false,
} as const;

export const updateAutoPullRuleRequestSchema = {
  type: 'object',
  properties: {
    scope: { type: 'string', enum: AUTO_PULL_SCOPES },
    topic_id: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    topic_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
    name: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RULE_STATUSES },
    query_spec: {
      type: 'object',
      properties: {
        include_keywords: { type: 'array', items: { type: 'string', minLength: 1 } },
        exclude_keywords: { type: 'array', items: { type: 'string', minLength: 1 } },
        authors: { type: 'array', items: { type: 'string', minLength: 1 } },
        venues: { type: 'array', items: { type: 'string', minLength: 1 } },
        max_results_per_source: { type: 'integer', minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    time_spec: {
      type: 'object',
      properties: {
        lookback_days: { type: 'integer', minimum: 1, maximum: 3650 },
        min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
        max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
      },
      additionalProperties: false,
    },
    quality_spec: {
      type: 'object',
      properties: {
        min_quality_score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      additionalProperties: false,
    },
    sources: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleSourceSchema,
    },
    schedules: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleScheduleSchema,
    },
  },
  additionalProperties: false,
  minProperties: 1,
} as const;

export const createAutoPullRunRequestSchema = {
  type: 'object',
  properties: {
    trigger_type: { type: 'string', enum: AUTO_PULL_TRIGGER_TYPES, default: 'MANUAL' },
    full_refresh: { type: 'boolean', default: false },
  },
  additionalProperties: false,
} as const;

export const retryFailedSourcesRequestSchema = {
  type: 'object',
  properties: {
    sources: {
      type: 'array',
      items: { type: 'string', enum: AUTO_PULL_SOURCES },
      minItems: 1,
      uniqueItems: true,
    },
  },
  additionalProperties: false,
} as const;

export const acknowledgeAlertRequestSchema = {
  type: 'object',
  properties: {
    ack_at: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
} as const;

export const autoPullRulesQuerySchema = {
  type: 'object',
  properties: {
    scope: { type: 'string', enum: AUTO_PULL_SCOPES },
    topic_id: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RULE_STATUSES },
  },
  additionalProperties: false,
} as const;

export const autoPullRunsQuerySchema = {
  type: 'object',
  properties: {
    rule_id: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RUN_STATUSES },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
  },
  additionalProperties: false,
} as const;

export const autoPullAlertsQuerySchema = {
  type: 'object',
  properties: {
    rule_id: { type: 'string', minLength: 1 },
    level: { type: 'string', enum: AUTO_PULL_ALERT_LEVELS },
    acked: { type: 'boolean' },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
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

export const listLiteraturePipelineRunsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
  },
  additionalProperties: false,
} as const;

export const createLiteraturePipelineRunRequestSchema = {
  type: 'object',
  properties: {
    requested_stages: {
      type: 'array',
      items: { type: 'string', enum: LITERATURE_PIPELINE_STAGE_CODES },
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
