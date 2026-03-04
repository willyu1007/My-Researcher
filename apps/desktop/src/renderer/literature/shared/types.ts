// Shared renderer types extracted from App.tsx

export type PanelStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
export type UiOperationStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'saving';

export type PanelState<T> = {
  status: PanelStatus;
  data: T;
  error: string | null;
};

export type TimelineEvent = {
  event_id: string;
  event_type: string;
  module_id?: string;
  timestamp: string;
  node_id?: string;
  summary: string;
  severity?: 'info' | 'warning' | 'error';
};

export type RuntimeMetric = {
  tokens: number | null;
  cost_usd: number | null;
  gpu_requested: number | null;
  gpu_total: number | null;
  updated_at: string;
};

export type ArtifactBundle = {
  proposal_url: string | null;
  paper_url: string | null;
  repo_url: string | null;
  review_url: string | null;
};

export type ReviewDecision = 'approve' | 'reject' | 'hold';

export type ReleaseGateResponse = {
  gate_result: {
    accepted: boolean;
    review_id: string;
    approved_by?: string;
    approved_at?: string;
    audit_ref: string;
  };
};

export type CitationStatus = 'seeded' | 'selected' | 'used' | 'cited' | 'dropped';
export type ScopeStatus = 'in_scope' | 'excluded';
export type LiteratureProvider = 'crossref' | 'arxiv' | 'manual' | 'web' | 'zotero';
export type LiteratureTabKey = 'auto-import' | 'manual-import' | 'overview';
export type AutoImportSubTabKey = 'topic-settings' | 'runs-alerts';
export type ManualImportSubTabKey = 'file-review' | 'zotero-sync';
export type ManualUploadFileStatus = 'processing' | 'parsed' | 'empty' | 'failed' | 'accepted' | 'duplicate';
export type AppMode = 'standard' | 'dev';
export type AutoPullScope = 'GLOBAL' | 'TOPIC';
export type AutoPullRuleStatus = 'ACTIVE' | 'PAUSED';
export type AutoPullSource = 'CROSSREF' | 'ARXIV' | 'ZOTERO';
export type AutoPullFrequency = 'DAILY' | 'WEEKLY';
export type AutoPullWeekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type AutoPullSortMode = 'llm_score' | 'hybrid_score';
export type AutoPullTriggerType = 'MANUAL' | 'SCHEDULE';
export type AutoPullRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
export type QuerySort = 'importance' | 'updated_at' | 'published_at' | 'title_initial';
export type SortDirection = 'asc' | 'desc';
export type QuerySortPreset = `${QuerySort}|${SortDirection}`;
export type LiteratureOverviewStatus = 'automation_ready' | 'citable' | 'not_citable' | 'excluded';
export type OverviewContentStatus = 'not_ready' | 'abstract_ready' | 'key_content_ready';
export type OverviewScopeFilterInput = 'all' | LiteratureOverviewStatus;
export type PipelineStageCode =
  | 'CITATION_NORMALIZED'
  | 'ABSTRACT_READY'
  | 'KEY_CONTENT_READY'
  | 'FULLTEXT_PREPROCESSED'
  | 'CHUNKED'
  | 'EMBEDDED'
  | 'INDEXED';

export type ManualUploadFileItem = {
  id: string;
  fileName: string;
  format: string;
  status: ManualUploadFileStatus;
  rowCount: number;
};

export type ZoteroAction = 'idle' | 'test-link' | 'load-to-list' | 'sync-import';
export type ZoteroLinkResult = {
  tested: boolean;
  connected: boolean;
  totalCount: number;
  duplicateCount: number;
  unparsedCount: number;
  importableCount: number;
};

export type FeedbackRecoveryAction =
  | 'retry-zotero-import'
  | 'reload-overview';
export type InlineFeedbackModel = {
  slot: 'header' | 'auto-import' | 'manual-import' | 'overview';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  recoveryAction?: FeedbackRecoveryAction;
};

export type AutoPullTopicProfile = {
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
};

export type AutoPullRuleSourceItem = {
  source: AutoPullSource;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
};

export type AutoPullRuleScheduleItem = {
  frequency: AutoPullFrequency;
  days_of_week: string[];
  hour: number;
  minute: number;
  timezone: string;
  active: boolean;
};

export type AutoPullRule = {
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
  sources: AutoPullRuleSourceItem[];
  schedules: AutoPullRuleScheduleItem[];
  created_at: string;
  updated_at: string;
};

export type AutoPullSourceAttempt = {
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
};

export type AutoPullSuggestion = {
  suggestion_id: string;
  literature_id: string;
  topic_id: string | null;
  suggested_scope: ScopeStatus;
  reason: string;
  score: number;
  created_at: string;
};

export type AutoPullRun = {
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
  source_attempts?: AutoPullSourceAttempt[];
  suggestions?: AutoPullSuggestion[];
};

export type TopicScopeItem = {
  scope_id: string;
  topic_id: string;
  literature_id: string;
  scope_status: ScopeStatus;
  reason?: string;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
};

export type PaperLiteratureItem = {
  link_id: string;
  paper_id: string;
  topic_id: string | null;
  literature_id: string;
  citation_status: CitationStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  source_provider: string | null;
  source_url: string | null;
  tags: string[];
};

export type LiteratureOverviewSummary = {
  total_literatures: number;
  topic_scope_total: number;
  in_scope_count: number;
  excluded_count: number;
  paper_link_total: number;
  cited_count: number;
  used_count: number;
  provider_counts: Array<{ provider: LiteratureProvider; count: number }>;
  top_tags: Array<{ tag: string; count: number }>;
};

export type LiteratureOverviewItem = {
  literature_id: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  tags: string[];
  providers: LiteratureProvider[];
  source_url: string | null;
  source_updated_at: string | null;
  topic_scope_status?: ScopeStatus;
  citation_status?: CitationStatus;
  overview_status: LiteratureOverviewStatus;
  pipeline_state: {
    citation_complete: boolean;
    abstract_ready: boolean;
    key_content_ready: boolean;
  };
};

export type LiteratureOverviewData = {
  topic_id?: string;
  paper_id?: string;
  summary: LiteratureOverviewSummary;
  items: LiteratureOverviewItem[];
};

export type GovernanceRequest = {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: unknown;
};
