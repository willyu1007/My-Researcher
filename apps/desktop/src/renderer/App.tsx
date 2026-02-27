import { type CSSProperties, type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  readSystemPrefersDark,
  resolveTheme,
  SYSTEM_DARK_MEDIA_QUERY,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from './theme';

type PanelStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
type UiOperationStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'saving';

type PanelState<T> = {
  status: PanelStatus;
  data: T;
  error: string | null;
};

type TimelineEvent = {
  event_id: string;
  event_type: string;
  module_id?: string;
  timestamp: string;
  node_id?: string;
  summary: string;
  severity?: 'info' | 'warning' | 'error';
};

type RuntimeMetric = {
  tokens: number | null;
  cost_usd: number | null;
  gpu_requested: number | null;
  gpu_total: number | null;
  updated_at: string;
};

type ArtifactBundle = {
  proposal_url: string | null;
  paper_url: string | null;
  repo_url: string | null;
  review_url: string | null;
};

type ReviewDecision = 'approve' | 'reject' | 'hold';

type ReleaseGateResponse = {
  gate_result: {
    accepted: boolean;
    review_id: string;
    approved_by?: string;
    approved_at?: string;
    audit_ref: string;
  };
};

type CitationStatus = 'seeded' | 'selected' | 'used' | 'cited' | 'dropped';
type ScopeStatus = 'in_scope' | 'excluded';
type RightsClass = 'OA' | 'USER_AUTH' | 'RESTRICTED' | 'UNKNOWN';
type LiteratureProvider = 'crossref' | 'arxiv' | 'manual' | 'web' | 'zotero';
type LiteratureTabKey = 'auto-import' | 'manual-import' | 'overview';
type AutoImportSubTabKey = 'topic-settings' | 'rules-center' | 'runs-alerts';
type AutoPullScope = 'GLOBAL' | 'TOPIC';
type AutoPullRuleStatus = 'ACTIVE' | 'PAUSED';
type AutoPullSource = 'CROSSREF' | 'ARXIV' | 'ZOTERO';
type AutoPullFrequency = 'DAILY' | 'WEEKLY';
type AutoPullTriggerType = 'MANUAL' | 'SCHEDULE';
type AutoPullRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
type AutoPullAlertLevel = 'WARNING' | 'ERROR';
type QueryField =
  | 'title'
  | 'authors'
  | 'providers'
  | 'tags'
  | 'rights_class'
  | 'year'
  | 'topic_scope_status'
  | 'citation_status'
  | 'doi'
  | 'arxiv_id';
type QueryOperator =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'gt'
  | 'lt'
  | 'is_empty'
  | 'is_not_empty';
type QueryLogic = 'AND' | 'OR';
type QuerySort = 'updated_desc' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc';

type QueryCondition = {
  id: string;
  field: QueryField;
  operator: QueryOperator;
  value: string;
};

type QueryGroup = {
  logic: QueryLogic;
  conditions: QueryCondition[];
};

type SavedQueryPreset = {
  id: string;
  name: string;
  group: QueryGroup;
  defaultSort: QuerySort;
};

type FeedbackRecoveryAction =
  | 'retry-zotero-import'
  | 'retry-query'
  | 'reload-overview';
type InlineFeedbackModel = {
  slot: 'header' | 'auto-import' | 'manual-import' | 'overview';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  recoveryAction?: FeedbackRecoveryAction;
};

type LiteratureImportPayload = {
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
};

type AutoPullTopicProfile = {
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

type AutoPullRuleSourceItem = {
  source: AutoPullSource;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
};

type AutoPullRuleScheduleItem = {
  frequency: AutoPullFrequency;
  days_of_week: string[];
  hour: number;
  minute: number;
  timezone: string;
  active: boolean;
};

type AutoPullRule = {
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
    min_completeness_score: number;
    require_include_match: boolean;
  };
  sources: AutoPullRuleSourceItem[];
  schedules: AutoPullRuleScheduleItem[];
  created_at: string;
  updated_at: string;
};

type AutoPullSourceAttempt = {
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

type AutoPullSuggestion = {
  suggestion_id: string;
  literature_id: string;
  topic_id: string | null;
  suggested_scope: ScopeStatus;
  reason: string;
  score: number;
  created_at: string;
};

type AutoPullRun = {
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

type AutoPullAlert = {
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
};

type TopicScopeItem = {
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

type PaperLiteratureItem = {
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

type LiteratureOverviewSummary = {
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

type LiteratureOverviewItem = {
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
  topic_scope_status?: ScopeStatus;
  citation_status?: CitationStatus;
};

type LiteratureOverviewData = {
  topic_id?: string;
  paper_id?: string;
  summary: LiteratureOverviewSummary;
  items: LiteratureOverviewItem[];
};

type GovernanceRequest = {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: unknown;
};

const coreNavItems = ['文献管理', '选题管理', '论文管理'];
const writingNavItems = ['写作中心', '投稿检查'];
const themeModeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

const initialModule = coreNavItems[0] ?? '';
const citationStatusOptions: CitationStatus[] = ['seeded', 'selected', 'used', 'cited', 'dropped'];
const rightsClassOptions: RightsClass[] = ['UNKNOWN', 'OA', 'USER_AUTH', 'RESTRICTED'];
const literatureTabs: Array<{ key: LiteratureTabKey; label: string }> = [
  { key: 'auto-import', label: '自动导入' },
  { key: 'manual-import', label: '手动导入' },
  { key: 'overview', label: '文献综览' },
];
const autoImportSubTabs: Array<{ key: AutoImportSubTabKey; label: string }> = [
  { key: 'rules-center', label: '规则中心' },
  { key: 'topic-settings', label: '设置主题' },
  { key: 'runs-alerts', label: '执行详情' },
];
const topicPresetVenueOptions = [
  'ACL',
  'EMNLP',
  'NAACL',
  'ICLR',
  'NeurIPS',
  'ICML',
  'AAAI',
  'IJCAI',
  'CVPR',
  'ICCV',
  'ECCV',
  'KDD',
  'WWW',
  'SIGIR',
  'CHI',
  'UAI',
  'AISTATS',
  'TMLR',
  'JMLR',
] as const;
const topicYearMinBound = 1990;
const topicYearMaxBound = new Date().getFullYear() + 1;
const literatureSubTabsByTab: Partial<Record<LiteratureTabKey, Array<{ key: string; label: string }>>> = {
  'auto-import': autoImportSubTabs.map((tab) => ({ key: tab.key, label: tab.label })),
};
const queryFieldOptions: Array<{ value: QueryField; label: string }> = [
  { value: 'title', label: '标题' },
  { value: 'authors', label: '作者' },
  { value: 'providers', label: '来源 Provider' },
  { value: 'tags', label: '标签' },
  { value: 'rights_class', label: '权限分类' },
  { value: 'year', label: '年份' },
  { value: 'topic_scope_status', label: '选题范围状态' },
  { value: 'citation_status', label: '引用状态' },
  { value: 'doi', label: 'DOI' },
  { value: 'arxiv_id', label: 'arXiv ID' },
];
const queryOperatorOptions: Array<{ value: QueryOperator; label: string }> = [
  { value: 'contains', label: '包含' },
  { value: 'equals', label: '等于' },
  { value: 'not_equals', label: '不等于' },
  { value: 'in', label: '属于（逗号分隔）' },
  { value: 'gt', label: '大于' },
  { value: 'lt', label: '小于' },
  { value: 'is_empty', label: '为空' },
  { value: 'is_not_empty', label: '非空' },
];
const querySortOptions: Array<{ value: QuerySort; label: string }> = [
  { value: 'updated_desc', label: '按更新时间（新->旧）' },
  { value: 'year_desc', label: '按年份（新->旧）' },
  { value: 'year_asc', label: '按年份（旧->新）' },
  { value: 'title_asc', label: '按标题（A->Z）' },
  { value: 'title_desc', label: '按标题（Z->A）' },
];

const emptyMetric: RuntimeMetric = {
  tokens: null,
  cost_usd: null,
  gpu_requested: null,
  gpu_total: null,
  updated_at: '',
};

const emptyArtifactBundle: ArtifactBundle = {
  proposal_url: null,
  paper_url: null,
  repo_url: null,
  review_url: null,
};

const emptyLiteratureOverviewSummary: LiteratureOverviewSummary = {
  total_literatures: 0,
  topic_scope_total: 0,
  in_scope_count: 0,
  excluded_count: 0,
  paper_link_total: 0,
  cited_count: 0,
  used_count: 0,
  provider_counts: [],
  rights_class_counts: [],
  top_tags: [],
};

const emptyLiteratureOverviewData: LiteratureOverviewData = {
  summary: emptyLiteratureOverviewSummary,
  items: [],
};

const defaultApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').trim();

function detectMacDesktopFromNavigator(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const navWithUaData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform = navWithUaData.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? '';
  return platform.toLowerCase().includes('mac');
}

function isFlagEnabled(value?: string): boolean {
  if (!value) {
    return false;
  }

  return value === '1' || value.toLowerCase() === 'true';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isAutoImportSubTabKey(value: string): value is AutoImportSubTabKey {
  return value === 'topic-settings' || value === 'rules-center' || value === 'runs-alerts';
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeLiteratureProvider(value: unknown): LiteratureProvider {
  if (
    value === 'crossref' ||
    value === 'arxiv' ||
    value === 'manual' ||
    value === 'web' ||
    value === 'zotero'
  ) {
    return value;
  }
  return 'crossref';
}

function normalizeRightsClass(value: unknown): RightsClass {
  if (value === 'OA' || value === 'USER_AUTH' || value === 'RESTRICTED' || value === 'UNKNOWN') {
    return value;
  }
  return 'UNKNOWN';
}

function parseTagsInput(value: string): string[] {
  return [...new Set(
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
  )];
}

function parseTokenList(value: string): string[] {
  return [...new Set(
    value
      .split(/\r?\n|,|;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )];
}

function hashTopicName(input: string): string {
  let hash = 0x811c9dc5;
  for (const char of Array.from(input)) {
    const codePoint = char.codePointAt(0) ?? 0;
    const bytes = [
      codePoint & 0xff,
      (codePoint >>> 8) & 0xff,
      (codePoint >>> 16) & 0xff,
      (codePoint >>> 24) & 0xff,
    ];
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function generateTopicIdByName(name: string, existingTopicIds: string[] = []): string {
  const normalizedName = name.normalize('NFKC').trim();
  const hash = hashTopicName(normalizedName || 'topic');
  const baseId = `TOPIC-${hash}`;
  const existingSet = new Set(existingTopicIds.map((item) => item.toUpperCase()));

  if (!existingSet.has(baseId.toUpperCase())) {
    return baseId;
  }

  let suffix = 2;
  while (existingSet.has(`${baseId}-${suffix}`.toUpperCase())) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

function normalizeTimelinePayload(payload: unknown): TimelineEvent[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const eventsRaw = root.events;
  if (!Array.isArray(eventsRaw)) {
    return [];
  }

  const events = eventsRaw
    .map((item): TimelineEvent | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const eventId = toText(row.event_id);
      const eventType = toText(row.event_type);
      const timestamp = toText(row.timestamp);
      const summary = toText(row.summary);
      if (!eventId || !eventType || !timestamp || !summary) {
        return null;
      }

      const severity = toText(row.severity);
      const normalizedSeverity: TimelineEvent['severity'] =
        severity === 'warning' || severity === 'error' || severity === 'info' ? severity : undefined;

      return {
        event_id: eventId,
        event_type: eventType,
        module_id: toText(row.module_id),
        timestamp,
        node_id: toText(row.node_id),
        summary,
        severity: normalizedSeverity,
      };
    })
    .filter((item): item is TimelineEvent => item !== null);

  return events;
}

function normalizeMetricPayload(payload: unknown): RuntimeMetric | null {
  const root = asRecord(payload);
  const metric = root ? asRecord(root.paper_runtime_metric) : null;
  if (!metric) {
    return null;
  }

  const updatedAt = toText(metric.updated_at);
  if (!updatedAt) {
    return null;
  }

  return {
    tokens: toOptionalNumber(metric.tokens),
    cost_usd: toOptionalNumber(metric.cost_usd),
    gpu_requested: toOptionalNumber(metric.gpu_requested),
    gpu_total: toOptionalNumber(metric.gpu_total),
    updated_at: updatedAt,
  };
}

function normalizeArtifactPayload(payload: unknown): ArtifactBundle | null {
  const root = asRecord(payload);
  const bundle = root ? asRecord(root.artifact_bundle) : null;
  if (!bundle) {
    return null;
  }

  return {
    proposal_url: toText(bundle.proposal_url) ?? null,
    paper_url: toText(bundle.paper_url) ?? null,
    repo_url: toText(bundle.repo_url) ?? null,
    review_url: toText(bundle.review_url) ?? null,
  };
}

function normalizeReleasePayload(payload: unknown): ReleaseGateResponse | null {
  const root = asRecord(payload);
  const gateResult = root ? asRecord(root.gate_result) : null;
  if (!gateResult) {
    return null;
  }

  const reviewId = toText(gateResult.review_id);
  const auditRef = toText(gateResult.audit_ref);
  const accepted = gateResult.accepted;
  if (!reviewId || !auditRef || typeof accepted !== 'boolean') {
    return null;
  }

  return {
    gate_result: {
      accepted,
      review_id: reviewId,
      approved_by: toText(gateResult.approved_by),
      approved_at: toText(gateResult.approved_at),
      audit_ref: auditRef,
    },
  };
}

function normalizeTopicProfilePayload(payload: unknown): AutoPullTopicProfile[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): AutoPullTopicProfile | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const topicId = toText(row.topic_id);
      const name = toText(row.name);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      if (!topicId || !name || !createdAt || !updatedAt) {
        return null;
      }

      return {
        topic_id: topicId,
        name,
        is_active: row.is_active !== false,
        include_keywords: Array.isArray(row.include_keywords)
          ? row.include_keywords.filter((value): value is string => typeof value === 'string')
          : [],
        exclude_keywords: Array.isArray(row.exclude_keywords)
          ? row.exclude_keywords.filter((value): value is string => typeof value === 'string')
          : [],
        venue_filters: Array.isArray(row.venue_filters)
          ? row.venue_filters.filter((value): value is string => typeof value === 'string')
          : [],
        default_lookback_days:
          typeof row.default_lookback_days === 'number' ? row.default_lookback_days : 30,
        default_min_year: typeof row.default_min_year === 'number' ? row.default_min_year : null,
        default_max_year: typeof row.default_max_year === 'number' ? row.default_max_year : null,
        rule_ids: Array.isArray(row.rule_ids)
          ? row.rule_ids.filter((value): value is string => typeof value === 'string')
          : [],
        created_at: createdAt,
        updated_at: updatedAt,
      };
    })
    .filter((item): item is AutoPullTopicProfile => item !== null);
}

function normalizeAutoPullRulePayload(payload: unknown): AutoPullRule[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): AutoPullRule | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const ruleId = toText(row.rule_id);
      const scope = toText(row.scope);
      const name = toText(row.name);
      const status = toText(row.status);
      const querySpec = asRecord(row.query_spec);
      const timeSpec = asRecord(row.time_spec);
      const qualitySpec = asRecord(row.quality_spec);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      if (
        !ruleId ||
        !scope ||
        !name ||
        !status ||
        !querySpec ||
        !timeSpec ||
        !qualitySpec ||
        !createdAt ||
        !updatedAt
      ) {
        return null;
      }

      return {
        rule_id: ruleId,
        scope: scope === 'TOPIC' ? 'TOPIC' : 'GLOBAL',
        topic_id: toText(row.topic_id) ?? null,
        topic_ids: Array.isArray(row.topic_ids)
          ? row.topic_ids.filter((value): value is string => typeof value === 'string')
          : (toText(row.topic_id) ? [toText(row.topic_id) as string] : []),
        name,
        status: status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
        query_spec: {
          include_keywords: Array.isArray(querySpec.include_keywords)
            ? querySpec.include_keywords.filter((value): value is string => typeof value === 'string')
            : [],
          exclude_keywords: Array.isArray(querySpec.exclude_keywords)
            ? querySpec.exclude_keywords.filter((value): value is string => typeof value === 'string')
            : [],
          authors: Array.isArray(querySpec.authors)
            ? querySpec.authors.filter((value): value is string => typeof value === 'string')
            : [],
          venues: Array.isArray(querySpec.venues)
            ? querySpec.venues.filter((value): value is string => typeof value === 'string')
            : [],
          max_results_per_source:
            typeof querySpec.max_results_per_source === 'number'
              ? querySpec.max_results_per_source
              : 20,
        },
        time_spec: {
          lookback_days: typeof timeSpec.lookback_days === 'number' ? timeSpec.lookback_days : 30,
          min_year: typeof timeSpec.min_year === 'number' ? timeSpec.min_year : null,
          max_year: typeof timeSpec.max_year === 'number' ? timeSpec.max_year : null,
        },
        quality_spec: {
          min_completeness_score:
            typeof qualitySpec.min_completeness_score === 'number'
              ? qualitySpec.min_completeness_score
              : 0.6,
          require_include_match:
            typeof qualitySpec.require_include_match === 'boolean'
              ? qualitySpec.require_include_match
              : true,
        },
        sources: Array.isArray(row.sources)
          ? row.sources
              .map((entry) => asRecord(entry))
              .filter((entry): entry is Record<string, unknown> => entry !== null)
              .map((entry) => ({
                source: toText(entry.source) as AutoPullSource,
                enabled: entry.enabled !== false,
                priority: typeof entry.priority === 'number' ? entry.priority : 100,
                config: asRecord(entry.config) ?? {},
              }))
              .filter((entry) =>
                entry.source === 'CROSSREF' || entry.source === 'ARXIV' || entry.source === 'ZOTERO',
              )
          : [],
        schedules: Array.isArray(row.schedules)
          ? row.schedules
              .map((entry) => asRecord(entry))
              .filter((entry): entry is Record<string, unknown> => entry !== null)
              .map((entry) => ({
                frequency: toText(entry.frequency) === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
                days_of_week: Array.isArray(entry.days_of_week)
                  ? entry.days_of_week.filter((value): value is string => typeof value === 'string')
                  : [],
                hour: typeof entry.hour === 'number' ? entry.hour : 9,
                minute: typeof entry.minute === 'number' ? entry.minute : 0,
                timezone: toText(entry.timezone) ?? 'UTC',
                active: entry.active !== false,
              }))
          : [],
        created_at: createdAt,
        updated_at: updatedAt,
      };
    })
    .filter((item): item is AutoPullRule => item !== null);
}

function normalizeAutoPullRunsPayload(payload: unknown): AutoPullRun[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item) => normalizeAutoPullRun(item))
    .filter((item): item is AutoPullRun => item !== null);
}

function normalizeAutoPullRun(payload: unknown): AutoPullRun | null {
  const row = asRecord(payload);
  if (!row) {
    return null;
  }

  const runId = toText(row.run_id);
  const ruleId = toText(row.rule_id);
  const triggerType = toText(row.trigger_type);
  const status = toText(row.status);
  const createdAt = toText(row.created_at);
  const updatedAt = toText(row.updated_at);
  if (!runId || !ruleId || !triggerType || !status || !createdAt || !updatedAt) {
    return null;
  }

  const attempts = Array.isArray(row.source_attempts)
    ? row.source_attempts
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => ({
          source: toText(entry.source) as AutoPullSource,
          status: toText(entry.status) as AutoPullRunStatus,
          fetched_count: typeof entry.fetched_count === 'number' ? entry.fetched_count : 0,
          imported_count: typeof entry.imported_count === 'number' ? entry.imported_count : 0,
          failed_count: typeof entry.failed_count === 'number' ? entry.failed_count : 0,
          error_code: toText(entry.error_code) ?? null,
          error_message: toText(entry.error_message) ?? null,
          started_at: toText(entry.started_at) ?? null,
          finished_at: toText(entry.finished_at) ?? null,
          meta: asRecord(entry.meta) ?? {},
        }))
        .filter((entry) =>
          entry.source === 'CROSSREF' || entry.source === 'ARXIV' || entry.source === 'ZOTERO',
        )
    : undefined;

  const suggestions = Array.isArray(row.suggestions)
    ? row.suggestions
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => ({
          suggestion_id: toText(entry.suggestion_id) ?? '',
          literature_id: toText(entry.literature_id) ?? '',
          topic_id: toText(entry.topic_id) ?? null,
          suggested_scope: (toText(entry.suggested_scope) === 'excluded' ? 'excluded' : 'in_scope') as ScopeStatus,
          reason: toText(entry.reason) ?? '',
          score: typeof entry.score === 'number' ? entry.score : 0,
          created_at: toText(entry.created_at) ?? '',
        }))
        .filter((entry) => entry.suggestion_id && entry.literature_id)
    : undefined;

  return {
    run_id: runId,
    rule_id: ruleId,
    trigger_type: triggerType === 'SCHEDULE' ? 'SCHEDULE' : 'MANUAL',
    status:
      status === 'RUNNING' ||
      status === 'PARTIAL' ||
      status === 'SUCCESS' ||
      status === 'FAILED' ||
      status === 'SKIPPED'
        ? status
        : 'PENDING',
    started_at: toText(row.started_at) ?? null,
    finished_at: toText(row.finished_at) ?? null,
    summary: asRecord(row.summary) ?? {},
    error_code: toText(row.error_code) ?? null,
    error_message: toText(row.error_message) ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    source_attempts: attempts,
    suggestions,
  };
}

function normalizeAutoPullAlertsPayload(payload: unknown): AutoPullAlert[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): AutoPullAlert | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }
      const alertId = toText(row.alert_id);
      const ruleId = toText(row.rule_id);
      const level = toText(row.level);
      const code = toText(row.code);
      const message = toText(row.message);
      const createdAt = toText(row.created_at);
      if (!alertId || !ruleId || !level || !code || !message || !createdAt) {
        return null;
      }
      return {
        alert_id: alertId,
        rule_id: ruleId,
        run_id: toText(row.run_id) ?? null,
        source: (toText(row.source) as AutoPullSource | undefined) ?? null,
        level: level === 'ERROR' ? 'ERROR' : 'WARNING',
        code,
        message,
        detail: asRecord(row.detail) ?? {},
        ack_at: toText(row.ack_at) ?? null,
        created_at: createdAt,
      };
    })
    .filter((item): item is AutoPullAlert => item !== null);
}

function normalizeTopicScopePayload(payload: unknown): TopicScopeItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): TopicScopeItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const scopeId = toText(row.scope_id);
      const topicId = toText(row.topic_id);
      const literatureId = toText(row.literature_id);
      const scopeStatus = toText(row.scope_status);
      const updatedAt = toText(row.updated_at);
      const title = toText(row.title);
      if (!scopeId || !topicId || !literatureId || !scopeStatus || !updatedAt || !title) {
        return null;
      }

      return {
        scope_id: scopeId,
        topic_id: topicId,
        literature_id: literatureId,
        scope_status: scopeStatus === 'excluded' ? 'excluded' : 'in_scope',
        reason: toText(row.reason),
        updated_at: updatedAt,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
      };
    })
    .filter((row): row is TopicScopeItem => row !== null);
}

function normalizePaperLiteraturePayload(payload: unknown): PaperLiteratureItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): PaperLiteratureItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const linkId = toText(row.link_id);
      const paperId = toText(row.paper_id);
      const literatureId = toText(row.literature_id);
      const citationStatus = toText(row.citation_status);
      const createdAt = toText(row.created_at);
      const updatedAt = toText(row.updated_at);
      const title = toText(row.title);
      if (
        !linkId ||
        !paperId ||
        !literatureId ||
        !citationStatus ||
        !createdAt ||
        !updatedAt ||
        !title
      ) {
        return null;
      }

      const normalizedCitationStatus = citationStatusOptions.includes(citationStatus as CitationStatus)
        ? (citationStatus as CitationStatus)
        : 'seeded';

      return {
        link_id: linkId,
        paper_id: paperId,
        topic_id: toText(row.topic_id) ?? null,
        literature_id: literatureId,
        citation_status: normalizedCitationStatus,
        note: toText(row.note) ?? null,
        created_at: createdAt,
        updated_at: updatedAt,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
        source_provider: toText(row.source_provider) ?? null,
        source_url: toText(row.source_url) ?? null,
        tags: Array.isArray(row.tags)
          ? row.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
      };
    })
    .filter((row): row is PaperLiteratureItem => row !== null);
}

function normalizeLiteratureOverviewPayload(payload: unknown): LiteratureOverviewData | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const summary = asRecord(root.summary);
  const itemsRaw = root.items;
  if (!summary || !Array.isArray(itemsRaw)) {
    return null;
  }

  const normalizedSummary: LiteratureOverviewSummary = {
    total_literatures: typeof summary.total_literatures === 'number' ? summary.total_literatures : 0,
    topic_scope_total: typeof summary.topic_scope_total === 'number' ? summary.topic_scope_total : 0,
    in_scope_count: typeof summary.in_scope_count === 'number' ? summary.in_scope_count : 0,
    excluded_count: typeof summary.excluded_count === 'number' ? summary.excluded_count : 0,
    paper_link_total: typeof summary.paper_link_total === 'number' ? summary.paper_link_total : 0,
    cited_count: typeof summary.cited_count === 'number' ? summary.cited_count : 0,
    used_count: typeof summary.used_count === 'number' ? summary.used_count : 0,
    provider_counts: Array.isArray(summary.provider_counts)
      ? summary.provider_counts
          .map((item) => asRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null)
          .map((item) => ({
            provider: normalizeLiteratureProvider(toText(item.provider)),
            count: typeof item.count === 'number' ? item.count : 0,
          }))
      : [],
    rights_class_counts: Array.isArray(summary.rights_class_counts)
      ? summary.rights_class_counts
          .map((item) => asRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null)
          .map((item) => ({
            rights_class: normalizeRightsClass(toText(item.rights_class)),
            count: typeof item.count === 'number' ? item.count : 0,
          }))
      : [],
    top_tags: Array.isArray(summary.top_tags)
      ? summary.top_tags
          .map((item) => asRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null)
          .map((item) => ({
            tag: toText(item.tag) ?? '',
            count: typeof item.count === 'number' ? item.count : 0,
          }))
          .filter((item) => item.tag.length > 0)
      : [],
  };

  const items = itemsRaw
    .map((item): LiteratureOverviewItem | null => {
      const row = asRecord(item);
      if (!row) {
        return null;
      }

      const literatureId = toText(row.literature_id);
      const title = toText(row.title);
      if (!literatureId || !title) {
        return null;
      }

      const topicScopeStatus = toText(row.topic_scope_status);
      const citationStatus = toText(row.citation_status);

      return {
        literature_id: literatureId,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
        rights_class: normalizeRightsClass(toText(row.rights_class)),
        tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        providers: Array.isArray(row.providers)
          ? row.providers
              .map((provider) => normalizeLiteratureProvider(provider))
              .filter((provider, index, array) => array.indexOf(provider) === index)
          : [],
        source_url: toText(row.source_url) ?? null,
        source_updated_at: toText(row.source_updated_at) ?? null,
        topic_scope_status: topicScopeStatus === 'excluded' ? 'excluded' : topicScopeStatus === 'in_scope' ? 'in_scope' : undefined,
        citation_status:
          citationStatus && citationStatusOptions.includes(citationStatus as CitationStatus)
            ? (citationStatus as CitationStatus)
            : undefined,
      };
    })
    .filter((item): item is LiteratureOverviewItem => item !== null);

  return {
    topic_id: toText(root.topic_id),
    paper_id: toText(root.paper_id),
    summary: normalizedSummary,
    items,
  };
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeManualImportItem(
  raw: Record<string, unknown>,
  fallbackExternalId: string,
): LiteratureImportPayload | null {
  const title = toText(raw.title);
  if (!title || title.trim().length === 0) {
    return null;
  }

  const authors = (() => {
    if (Array.isArray(raw.authors)) {
      return raw.authors.filter((author): author is string => typeof author === 'string');
    }
    const authorText = toText(raw.authors) ?? toText(raw.author);
    if (!authorText) {
      return [];
    }
    return authorText
      .split(/\s+and\s+|,|;/i)
      .map((author) => author.trim())
      .filter((author) => author.length > 0);
  })();

  const yearValue = typeof raw.year === 'number'
    ? raw.year
    : (() => {
        const text = toText(raw.year);
        if (!text) {
          return undefined;
        }
        const parsed = Number.parseInt(text, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
      })();

  const doi = toText(raw.doi);
  const arxivId = toText(raw.arxiv_id) ?? toText(raw.arxivId);
  const sourceUrl = toText(raw.source_url) ?? toText(raw.url) ?? `local://${fallbackExternalId}`;
  const abstractText = toText(raw.abstract) ?? toText(raw.abstractText);
  const rightsClass = normalizeRightsClass(toText(raw.rights_class));
  const tags = (() => {
    if (Array.isArray(raw.tags)) {
      return raw.tags.filter((tag): tag is string => typeof tag === 'string');
    }
    const text = toText(raw.tags) ?? toText(raw.keywords);
    if (!text) {
      return [];
    }
    return text
      .split(/,|;/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  })();

  return {
    provider: 'manual',
    external_id: toText(raw.external_id) ?? doi ?? arxivId ?? fallbackExternalId,
    title: title.trim(),
    abstract: abstractText,
    authors,
    year: yearValue,
    doi: doi ?? undefined,
    arxiv_id: arxivId ?? undefined,
    source_url: sourceUrl,
    rights_class: rightsClass,
    tags,
  };
}

function parseManualJson(text: string): LiteratureImportPayload[] {
  const parsed = JSON.parse(text) as unknown;
  const root = Array.isArray(parsed) ? parsed : asRecord(parsed)?.items;
  if (!Array.isArray(root)) {
    return [];
  }

  return root
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item, index) => normalizeManualImportItem(item, `manual-json-${index + 1}`))
    .filter((item): item is LiteratureImportPayload => item !== null);
}

function parseManualCsv(text: string): LiteratureImportPayload[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseDelimitedLine(lines[0], ',').map((header) => header.trim().toLowerCase());
  return lines
    .slice(1)
    .map((line, index) => {
      const values = parseDelimitedLine(line, ',');
      const row: Record<string, unknown> = {};
      headers.forEach((header, headerIndex) => {
        row[header] = values[headerIndex];
      });
      return normalizeManualImportItem(row, `manual-csv-${index + 1}`);
    })
    .filter((item): item is LiteratureImportPayload => item !== null);
}

function parseManualBibText(text: string): LiteratureImportPayload[] {
  const entries = [...text.matchAll(/@[\w-]+\s*\{\s*([^,]+),([\s\S]*?)\n\}/g)];
  return entries
    .map((entry, index) => {
      const body = entry[2] ?? '';
      const fields: Record<string, unknown> = {};
      for (const field of body.matchAll(/(\w+)\s*=\s*[{"]([\s\S]*?)[}"],?/g)) {
        const key = (field[1] ?? '').toLowerCase();
        const value = (field[2] ?? '').replace(/\s+/g, ' ').trim();
        if (key) {
          fields[key] = value;
        }
      }

      return normalizeManualImportItem(
        {
          ...fields,
          title: fields.title,
          authors: fields.author,
          year: fields.year,
          doi: fields.doi,
          arxiv_id: fields.eprint,
          url: fields.url,
          abstract: fields.abstract,
          keywords: fields.keywords,
        },
        `manual-bib-${entry[1] ?? index + 1}`,
      );
    })
    .filter((item): item is LiteratureImportPayload => item !== null);
}

function parseManualUploadItems(fileName: string, text: string): LiteratureImportPayload[] {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.json')) {
    return parseManualJson(text);
  }
  if (lowerName.endsWith('.csv')) {
    return parseManualCsv(text);
  }
  return parseManualBibText(text);
}

function createQueryCondition(
  field: QueryField = 'title',
  operator: QueryOperator = 'contains',
  value = '',
): QueryCondition {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field,
    operator,
    value,
  };
}

function cloneQueryGroup(group: QueryGroup): QueryGroup {
  return {
    logic: group.logic,
    conditions: group.conditions.map((condition) => ({
      ...condition,
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })),
  };
}

function queryOperatorNeedsValue(operator: QueryOperator): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty';
}

function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase();
}

function getQueryFieldValue(
  item: LiteratureOverviewItem,
  field: QueryField,
): string | number | string[] | null {
  switch (field) {
    case 'title':
      return item.title;
    case 'authors':
      return item.authors;
    case 'providers':
      return item.providers;
    case 'tags':
      return item.tags;
    case 'rights_class':
      return item.rights_class;
    case 'year':
      return item.year;
    case 'topic_scope_status':
      return item.topic_scope_status ?? null;
    case 'citation_status':
      return item.citation_status ?? null;
    case 'doi':
      return item.doi;
    case 'arxiv_id':
      return item.arxiv_id;
    default:
      return null;
  }
}

function isQueryFieldValueEmpty(value: string | number | string[] | null): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'number') {
    return !Number.isFinite(value);
  }
  return value.trim().length === 0;
}

function evaluateQueryCondition(item: LiteratureOverviewItem, condition: QueryCondition): boolean {
  const fieldValue = getQueryFieldValue(item, condition.field);
  const normalizedValue = normalizeComparableText(condition.value);

  if (condition.operator === 'is_empty') {
    return isQueryFieldValueEmpty(fieldValue);
  }
  if (condition.operator === 'is_not_empty') {
    return !isQueryFieldValueEmpty(fieldValue);
  }

  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  if (Array.isArray(fieldValue)) {
    const normalizedItems = fieldValue.map((entry) => normalizeComparableText(String(entry)));
    if (condition.operator === 'contains') {
      return normalizedItems.some((entry) => entry.includes(normalizedValue));
    }
    if (condition.operator === 'equals') {
      return normalizedItems.some((entry) => entry === normalizedValue);
    }
    if (condition.operator === 'not_equals') {
      return normalizedItems.every((entry) => entry !== normalizedValue);
    }
    if (condition.operator === 'in') {
      const options = condition.value
        .split(',')
        .map((entry) => normalizeComparableText(entry))
        .filter((entry) => entry.length > 0);
      return options.some((entry) => normalizedItems.includes(entry));
    }
    return false;
  }

  if (typeof fieldValue === 'number') {
    const target = Number.parseFloat(condition.value);
    if (!Number.isFinite(target)) {
      return false;
    }
    if (condition.operator === 'gt') {
      return fieldValue > target;
    }
    if (condition.operator === 'lt') {
      return fieldValue < target;
    }
    if (condition.operator === 'equals') {
      return fieldValue === target;
    }
    if (condition.operator === 'not_equals') {
      return fieldValue !== target;
    }
    return false;
  }

  const normalizedFieldValue = normalizeComparableText(String(fieldValue));
  if (condition.operator === 'contains') {
    return normalizedFieldValue.includes(normalizedValue);
  }
  if (condition.operator === 'equals') {
    return normalizedFieldValue === normalizedValue;
  }
  if (condition.operator === 'not_equals') {
    return normalizedFieldValue !== normalizedValue;
  }
  if (condition.operator === 'in') {
    const options = condition.value
      .split(',')
      .map((entry) => normalizeComparableText(entry))
      .filter((entry) => entry.length > 0);
    return options.includes(normalizedFieldValue);
  }
  if (condition.operator === 'gt' || condition.operator === 'lt') {
    const target = Number.parseFloat(condition.value);
    const parsedField = Number.parseFloat(normalizedFieldValue);
    if (!Number.isFinite(target) || !Number.isFinite(parsedField)) {
      return false;
    }
    return condition.operator === 'gt' ? parsedField > target : parsedField < target;
  }

  return false;
}

function applyQueryGroup(items: LiteratureOverviewItem[], group: QueryGroup): LiteratureOverviewItem[] {
  const activeConditions = group.conditions.filter((condition) =>
    queryOperatorNeedsValue(condition.operator) ? condition.value.trim().length > 0 : true,
  );
  if (activeConditions.length === 0) {
    return [...items];
  }

  return items.filter((item) =>
    group.logic === 'AND'
      ? activeConditions.every((condition) => evaluateQueryCondition(item, condition))
      : activeConditions.some((condition) => evaluateQueryCondition(item, condition)),
  );
}

function sortOverviewItems(items: LiteratureOverviewItem[], sort: QuerySort): LiteratureOverviewItem[] {
  const sorted = [...items];
  if (sort === 'year_desc') {
    sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    return sorted;
  }
  if (sort === 'year_asc') {
    sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    return sorted;
  }
  if (sort === 'title_asc') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    return sorted;
  }
  if (sort === 'title_desc') {
    sorted.sort((a, b) => b.title.localeCompare(a.title, 'zh-CN'));
    return sorted;
  }

  sorted.sort((a, b) => {
    const left = a.source_updated_at ? new Date(a.source_updated_at).getTime() : 0;
    const right = b.source_updated_at ? new Date(b.source_updated_at).getTime() : 0;
    return right - left;
  });
  return sorted;
}

function formatUiOperationStatus(status: UiOperationStatus): string {
  if (status === 'idle') {
    return '待执行';
  }
  if (status === 'loading') {
    return '处理中';
  }
  if (status === 'ready') {
    return '已就绪';
  }
  if (status === 'empty') {
    return '无结果';
  }
  if (status === 'saving') {
    return '保存中';
  }
  return '异常';
}

function readErrorMessage(payload: unknown, status: number): string {
  const root = asRecord(payload);
  const error = root ? asRecord(root.error) : null;
  if (error) {
    const code = toText(error.code);
    const message = toText(error.message);
    if (code && message) {
      return `${code}: ${message}`;
    }
    if (message) {
      return message;
    }
  }

  const message = root ? toText(root.message) : undefined;
  if (message) {
    return message;
  }

  return `Request failed with status ${status}.`;
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return value.toLocaleString('en-US');
}

function formatCurrency(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return `$${value.toFixed(4)}`;
}

function formatTimestamp(value: string): string {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatRunDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) {
    return '--';
  }
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) {
    return '--';
  }
  const endMs = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  if (Number.isNaN(endMs)) {
    return '--';
  }
  const durationMs = Math.max(0, endMs - startMs);
  if (durationMs < 1_000) {
    return `${durationMs}ms`;
  }
  if (durationMs < 60_000) {
    return `${(durationMs / 1_000).toFixed(1)}s`;
  }
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function tryGetSnapshotId(summary: string): string | null {
  const matched = summary.match(/SP-\d{4}/);
  return matched ? matched[0] : null;
}

async function requestGovernance<T>(request: GovernanceRequest): Promise<T> {
  const desktopBridge = window.desktopApi?.requestGovernance;

  if (desktopBridge) {
    const bridgeResponse = await desktopBridge(request);
    if (!bridgeResponse.ok) {
      throw new Error(readErrorMessage(bridgeResponse.payload, bridgeResponse.status));
    }
    return bridgeResponse.payload as T;
  }

  const init: RequestInit = {
    method: request.method,
    headers: {
      Accept: 'application/json',
    },
  };

  if (request.body !== undefined) {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify(request.body);
  }

  const response = await fetch(new URL(request.path, defaultApiBaseUrl), init);
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, response.status));
  }

  return payload as T;
}

type AppProps = {
  initialThemeMode: ThemeMode;
};

export function App({ initialThemeMode }: AppProps) {
  const [activeModule, setActiveModule] = useState<string>(initialModule);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMacDesktop, setIsMacDesktop] = useState<boolean>(() => detectMacDesktopFromNavigator());
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => readSystemPrefersDark());
  const [toolbarSearchInput, setToolbarSearchInput] = useState<string>('');
  const [, setActionHint] = useState<string>('请选择一个模块开始浏览。');
  const [governanceEnabled, setGovernanceEnabled] = useState<boolean>(
    isFlagEnabled(import.meta.env.VITE_ENABLE_GOVERNANCE_PANELS),
  );
  const [paperIdInput, setPaperIdInput] = useState<string>('P001');
  const [paperId, setPaperId] = useState<string>('P001');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const [timelinePanel, setTimelinePanel] = useState<PanelState<TimelineEvent[]>>({
    status: 'idle',
    data: [],
    error: null,
  });
  const [metricsPanel, setMetricsPanel] = useState<PanelState<RuntimeMetric>>({
    status: 'idle',
    data: emptyMetric,
    error: null,
  });
  const [artifactPanel, setArtifactPanel] = useState<PanelState<ArtifactBundle>>({
    status: 'idle',
    data: emptyArtifactBundle,
    error: null,
  });
  const [topicIdInput, setTopicIdInput] = useState<string>('TOPIC-001');
  const [topicId, setTopicId] = useState<string>('TOPIC-001');
  const [topicScopeItems, setTopicScopeItems] = useState<TopicScopeItem[]>([]);
  const [topicScopeLoading, setTopicScopeLoading] = useState<boolean>(false);
  const [topicScopeError, setTopicScopeError] = useState<string | null>(null);
  const [paperLiteratureItems, setPaperLiteratureItems] = useState<PaperLiteratureItem[]>([]);
  const [paperLiteratureLoading, setPaperLiteratureLoading] = useState<boolean>(false);
  const [paperLiteratureError, setPaperLiteratureError] = useState<string | null>(null);
  const [activeLiteratureTab, setActiveLiteratureTab] = useState<LiteratureTabKey>('auto-import');
  const [autoImportSubTab, setAutoImportSubTab] = useState<AutoImportSubTabKey>('rules-center');
  const [topicProfiles, setTopicProfiles] = useState<AutoPullTopicProfile[]>([]);
  const [topicProfilesStatus, setTopicProfilesStatus] = useState<UiOperationStatus>('idle');
  const [topicProfilesError, setTopicProfilesError] = useState<string | null>(null);
  const [topicFormTopicId, setTopicFormTopicId] = useState<string>('');
  const [topicFormName, setTopicFormName] = useState<string>('');
  const [topicFormIsActive, setTopicFormIsActive] = useState<boolean>(true);
  const [topicFormIncludeKeywords, setTopicFormIncludeKeywords] = useState<string[]>([]);
  const [topicFormIncludeDraft, setTopicFormIncludeDraft] = useState<string>('');
  const [topicFormExcludeKeywords, setTopicFormExcludeKeywords] = useState<string[]>([]);
  const [topicFormExcludeDraft, setTopicFormExcludeDraft] = useState<string>('');
  const [topicFormVenueSelections, setTopicFormVenueSelections] = useState<string[]>([]);
  const [topicVenuePickerOpen, setTopicVenuePickerOpen] = useState<boolean>(false);
  const [topicFormLookbackInput, setTopicFormLookbackInput] = useState<string>('30');
  const [topicFormYearStart, setTopicFormYearStart] = useState<number>(topicYearMinBound);
  const [topicFormYearEnd, setTopicFormYearEnd] = useState<number>(topicYearMaxBound);
  const [topicFormRuleIds, setTopicFormRuleIds] = useState<string[]>([]);
  const [topicFormModalOpen, setTopicFormModalOpen] = useState<boolean>(false);
  const [topicEditingId, setTopicEditingId] = useState<string | null>(null);

  const [autoPullRules, setAutoPullRules] = useState<AutoPullRule[]>([]);
  const [rulesStatus, setRulesStatus] = useState<UiOperationStatus>('idle');
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [ruleEditingId, setRuleEditingId] = useState<string | null>(null);
  const [ruleFormScope, setRuleFormScope] = useState<AutoPullScope>('GLOBAL');
  const [ruleFormTopicIdsInput, setRuleFormTopicIdsInput] = useState<string>('');
  const [ruleFormName, setRuleFormName] = useState<string>('');
  const [ruleFormIncludeInput, setRuleFormIncludeInput] = useState<string>('');
  const [ruleFormExcludeInput, setRuleFormExcludeInput] = useState<string>('');
  const [ruleFormAuthorsInput, setRuleFormAuthorsInput] = useState<string>('');
  const [ruleFormVenuesInput, setRuleFormVenuesInput] = useState<string>('');
  const [ruleFormMaxResultsInput, setRuleFormMaxResultsInput] = useState<string>('20');
  const [ruleFormLookbackInput, setRuleFormLookbackInput] = useState<string>('30');
  const [ruleFormMinYearInput, setRuleFormMinYearInput] = useState<string>('');
  const [ruleFormMaxYearInput, setRuleFormMaxYearInput] = useState<string>('');
  const [ruleFormMinCompletenessInput, setRuleFormMinCompletenessInput] = useState<string>('0.6');
  const [ruleFormRequireIncludeMatch, setRuleFormRequireIncludeMatch] = useState<boolean>(true);
  const [ruleFormFrequency, setRuleFormFrequency] = useState<AutoPullFrequency>('DAILY');
  const [ruleFormDaysInput, setRuleFormDaysInput] = useState<string>('MON');
  const [ruleFormHourInput, setRuleFormHourInput] = useState<string>('9');
  const [ruleFormMinuteInput, setRuleFormMinuteInput] = useState<string>('0');
  const [ruleFormTimezone, setRuleFormTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
  const [ruleSourceCrossref, setRuleSourceCrossref] = useState<boolean>(true);
  const [ruleSourceArxiv, setRuleSourceArxiv] = useState<boolean>(true);
  const [ruleSourceZotero, setRuleSourceZotero] = useState<boolean>(false);
  const [ruleSourceZoteroLibraryType, setRuleSourceZoteroLibraryType] = useState<'users' | 'groups'>('users');
  const [ruleSourceZoteroLibraryId, setRuleSourceZoteroLibraryId] = useState<string>('');
  const [ruleSourceZoteroApiKey, setRuleSourceZoteroApiKey] = useState<string>('');
  const [ruleFilterScope, setRuleFilterScope] = useState<'' | AutoPullScope>('');
  const [ruleFilterStatus, setRuleFilterStatus] = useState<'' | AutoPullRuleStatus>('');

  const [autoPullRuns, setAutoPullRuns] = useState<AutoPullRun[]>([]);
  const [runsStatus, setRunsStatus] = useState<UiOperationStatus>('idle');
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runsFilterRuleId, setRunsFilterRuleId] = useState<string>('');
  const [runsFilterStatus, setRunsFilterStatus] = useState<'' | AutoPullRunStatus>('');
  const [selectedRunDetail, setSelectedRunDetail] = useState<AutoPullRun | null>(null);
  const [runDetailLoading, setRunDetailLoading] = useState<boolean>(false);
  const [runDetailError, setRunDetailError] = useState<string | null>(null);

  const [autoPullAlerts, setAutoPullAlerts] = useState<AutoPullAlert[]>([]);
  const [alertsStatus, setAlertsStatus] = useState<UiOperationStatus>('idle');
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [alertsFilterRuleId, setAlertsFilterRuleId] = useState<string>('');
  const [alertsFilterLevel, setAlertsFilterLevel] = useState<'' | AutoPullAlertLevel>('');
  const [alertsFilterAcked, setAlertsFilterAcked] = useState<'all' | 'acked' | 'unacked'>('unacked');
  const [topFeedback, setTopFeedback] = useState<InlineFeedbackModel | null>(null);
  const [literatureActionMessage, setLiteratureActionMessage] = useState<string>('');
  const [scopeReasonInput, setScopeReasonInput] = useState<string>('初筛保留');
  const [batchTagsInput, setBatchTagsInput] = useState<string>('survey, baseline');
  const [manualUploadLoading, setManualUploadLoading] = useState<boolean>(false);
  const [manualUploadStatus, setManualUploadStatus] = useState<UiOperationStatus>('idle');
  const [manualUploadError, setManualUploadError] = useState<string | null>(null);
  const [zoteroLibraryType, setZoteroLibraryType] = useState<'users' | 'groups'>('users');
  const [zoteroLibraryId, setZoteroLibraryId] = useState<string>('');
  const [zoteroApiKey, setZoteroApiKey] = useState<string>('');
  const [zoteroQuery, setZoteroQuery] = useState<string>('');
  const [zoteroLimitInput, setZoteroLimitInput] = useState<string>('20');
  const [zoteroLoading, setZoteroLoading] = useState<boolean>(false);
  const [zoteroStatus, setZoteroStatus] = useState<UiOperationStatus>('idle');
  const [zoteroError, setZoteroError] = useState<string | null>(null);
  const [overviewPanel, setOverviewPanel] = useState<PanelState<LiteratureOverviewData>>({
    status: 'idle',
    data: emptyLiteratureOverviewData,
    error: null,
  });
  const [queryGroup, setQueryGroup] = useState<QueryGroup>({
    logic: 'AND',
    conditions: [createQueryCondition()],
  });
  const [appliedQueryGroup, setAppliedQueryGroup] = useState<QueryGroup | null>(null);
  const [querySort, setQuerySort] = useState<QuerySort>('updated_desc');
  const [queryStatus, setQueryStatus] = useState<UiOperationStatus>('idle');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryPresetNameInput, setQueryPresetNameInput] = useState<string>('');
  const [savedQueryPresets, setSavedQueryPresets] = useState<SavedQueryPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [overviewResultItems, setOverviewResultItems] = useState<LiteratureOverviewItem[]>([]);
  const [metadataDrafts, setMetadataDrafts] = useState<Record<string, { tagsInput: string; rightsClass: RightsClass }>>({});
  const [metadataSavingIds, setMetadataSavingIds] = useState<Record<string, boolean>>({});

  const [reviewersInput, setReviewersInput] = useState<string>('reviewer-1');
  const [decision, setDecision] = useState<ReviewDecision>('hold');
  const [riskFlagsInput, setRiskFlagsInput] = useState<string>('policy-check');
  const [labelPolicy, setLabelPolicy] = useState<string>('ai-generated-required');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitState, setReviewSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string>('');

  useEffect(() => {
    let unmounted = false;
    const getAppMeta = window.desktopApi?.getAppMeta;

    if (!getAppMeta) {
      return () => {
        unmounted = true;
      };
    }

    void getAppMeta()
      .then((meta) => {
        if (!unmounted) {
          setIsMacDesktop(meta.platform === 'darwin');
        }
      })
      .catch(() => {
        // Keep navigator-based fallback if desktop bridge meta is unavailable.
      });

    return () => {
      unmounted = true;
    };
  }, []);

  useEffect(() => {
    if (themeMode !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themeMode]);

  useEffect(() => {
    applyTheme(resolveTheme(themeMode, systemPrefersDark));

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage write failures and keep runtime state.
    }
  }, [themeMode, systemPrefersDark]);

  const pushLiteratureFeedback = useCallback((feedback: InlineFeedbackModel) => {
    setTopFeedback(feedback);
    setLiteratureActionMessage(feedback.message);
  }, []);

  useEffect(() => {
    if (!topFeedback) {
      return;
    }
    if (topFeedback.level === 'warning' || topFeedback.level === 'error') {
      return;
    }

    const timer = window.setTimeout(() => {
      setTopFeedback(null);
    }, 3_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [topFeedback]);

  const loadGovernancePanels = useCallback(async (targetPaperId: string) => {
    const normalizedPaperId = targetPaperId.trim();

    if (!normalizedPaperId) {
      setTimelinePanel({ status: 'error', data: [], error: 'Paper ID 不能为空。' });
      setMetricsPanel({ status: 'error', data: emptyMetric, error: 'Paper ID 不能为空。' });
      setArtifactPanel({ status: 'error', data: emptyArtifactBundle, error: 'Paper ID 不能为空。' });
      return;
    }

    const encodedId = encodeURIComponent(normalizedPaperId);

    setTimelinePanel({ status: 'loading', data: [], error: null });
    setMetricsPanel({ status: 'loading', data: emptyMetric, error: null });
    setArtifactPanel({ status: 'loading', data: emptyArtifactBundle, error: null });

    const [timelineResult, metricsResult, artifactResult] = await Promise.allSettled([
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/timeline` }),
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/resource-metrics` }),
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/artifact-bundle` }),
    ]);

    if (timelineResult.status === 'fulfilled') {
      const normalized = normalizeTimelinePayload(timelineResult.value);
      setTimelinePanel({
        status: normalized.length > 0 ? 'ready' : 'empty',
        data: normalized,
        error: null,
      });
    } else {
      setTimelinePanel({ status: 'error', data: [], error: timelineResult.reason instanceof Error ? timelineResult.reason.message : String(timelineResult.reason) });
    }

    if (metricsResult.status === 'fulfilled') {
      const normalized = normalizeMetricPayload(metricsResult.value);
      if (normalized) {
        setMetricsPanel({ status: 'ready', data: normalized, error: null });
      } else {
        setMetricsPanel({ status: 'empty', data: emptyMetric, error: null });
      }
    } else {
      setMetricsPanel({ status: 'error', data: emptyMetric, error: metricsResult.reason instanceof Error ? metricsResult.reason.message : String(metricsResult.reason) });
    }

    if (artifactResult.status === 'fulfilled') {
      const normalized = normalizeArtifactPayload(artifactResult.value);
      if (normalized) {
        setArtifactPanel({ status: 'ready', data: normalized, error: null });
      } else {
        setArtifactPanel({ status: 'empty', data: emptyArtifactBundle, error: null });
      }
    } else {
      setArtifactPanel({ status: 'error', data: emptyArtifactBundle, error: artifactResult.reason instanceof Error ? artifactResult.reason.message : String(artifactResult.reason) });
    }
  }, []);

  useEffect(() => {
    if (!governanceEnabled) {
      setTimelinePanel({ status: 'idle', data: [], error: null });
      setMetricsPanel({ status: 'idle', data: emptyMetric, error: null });
      setArtifactPanel({ status: 'idle', data: emptyArtifactBundle, error: null });
      return;
    }

    void loadGovernancePanels(paperId);
  }, [governanceEnabled, loadGovernancePanels, paperId, refreshTick]);

  const loadTopicScope = useCallback(async (targetTopicId: string) => {
    const normalizedTopicId = targetTopicId.trim();
    if (!normalizedTopicId) {
      setTopicScopeItems([]);
      setTopicScopeError('Topic ID 不能为空。');
      return;
    }

    setTopicScopeLoading(true);
    setTopicScopeError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/topics/${encodeURIComponent(normalizedTopicId)}/literature-scope`,
      });
      setTopicScopeItems(normalizeTopicScopePayload(payload));
    } catch (error) {
      setTopicScopeItems([]);
      setTopicScopeError(error instanceof Error ? error.message : '加载选题文献范围失败。');
    } finally {
      setTopicScopeLoading(false);
    }
  }, []);

  const loadPaperLiterature = useCallback(async (targetPaperId: string) => {
    const normalizedPaperId = targetPaperId.trim();
    if (!normalizedPaperId) {
      setPaperLiteratureItems([]);
      setPaperLiteratureError('Paper ID 不能为空。');
      return;
    }

    setPaperLiteratureLoading(true);
    setPaperLiteratureError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/literature`,
      });
      setPaperLiteratureItems(normalizePaperLiteraturePayload(payload));
    } catch (error) {
      setPaperLiteratureItems([]);
      setPaperLiteratureError(error instanceof Error ? error.message : '加载论文文献列表失败。');
    } finally {
      setPaperLiteratureLoading(false);
    }
  }, []);

  const loadLiteratureOverview = useCallback(async (targetTopicId: string, targetPaperId: string) => {
    const normalizedTopicId = targetTopicId.trim();
    const normalizedPaperId = targetPaperId.trim();
    if (!normalizedTopicId && !normalizedPaperId) {
      setOverviewPanel({
        status: 'error',
        data: emptyLiteratureOverviewData,
        error: 'Topic ID 与 Paper ID 至少填写一个。',
      });
      setQueryStatus('error');
      setQueryError('请先填写 Topic ID 或 Paper ID，再加载综览。');
      return;
    }

    setOverviewPanel((current) => ({ ...current, status: 'loading', error: null }));
    setQueryStatus('loading');
    setQueryError(null);
    try {
      const query = new URLSearchParams();
      if (normalizedTopicId) {
        query.set('topic_id', normalizedTopicId);
      }
      if (normalizedPaperId) {
        query.set('paper_id', normalizedPaperId);
      }
      const payload = await requestGovernance({
        method: 'GET',
        path: `/literature/overview?${query.toString()}`,
      });
      const normalized = normalizeLiteratureOverviewPayload(payload);
      if (!normalized) {
        setOverviewPanel({
          status: 'empty',
          data: emptyLiteratureOverviewData,
          error: null,
        });
        setOverviewResultItems([]);
        setQueryStatus('empty');
        return;
      }

      const baseItems = appliedQueryGroup
        ? applyQueryGroup(normalized.items, appliedQueryGroup)
        : normalized.items;
      const sortedItems = sortOverviewItems(baseItems, querySort);

      setOverviewPanel({
        status: normalized.items.length > 0 ? 'ready' : 'empty',
        data: normalized,
        error: null,
      });
      setOverviewResultItems(sortedItems);
      setQueryStatus(sortedItems.length > 0 ? 'ready' : 'empty');
      setQueryError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载文献综览失败。';
      setOverviewPanel({
        status: 'error',
        data: emptyLiteratureOverviewData,
        error: message,
      });
      setOverviewResultItems([]);
      setQueryStatus('error');
      setQueryError(message);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `综览加载失败：${message}`,
        recoveryAction: 'reload-overview',
      });
    }
  }, [appliedQueryGroup, pushLiteratureFeedback, querySort]);

  useEffect(() => {
    setMetadataDrafts((current) => {
      const next: Record<string, { tagsInput: string; rightsClass: RightsClass }> = {};
      for (const item of overviewPanel.data.items) {
        const existing = current[item.literature_id];
        next[item.literature_id] = existing ?? {
          tagsInput: item.tags.join(', '),
          rightsClass: item.rights_class,
        };
      }
      return next;
    });
  }, [overviewPanel.data.items]);

  useEffect(() => {
    if (overviewPanel.status === 'loading' || overviewPanel.status === 'error') {
      return;
    }
    const sourceItems = overviewPanel.data.items;
    const filteredItems = appliedQueryGroup ? applyQueryGroup(sourceItems, appliedQueryGroup) : sourceItems;
    const sortedItems = sortOverviewItems(filteredItems, querySort);
    setOverviewResultItems(sortedItems);
    setQueryStatus(sortedItems.length > 0 ? 'ready' : 'empty');
  }, [appliedQueryGroup, overviewPanel.data.items, overviewPanel.status, querySort]);

  const loadTopicProfiles = useCallback(async () => {
    setTopicProfilesStatus('loading');
    setTopicProfilesError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: '/topics/settings',
      });
      const items = normalizeTopicProfilePayload(payload);
      setTopicProfiles(items);
      setTopicProfilesStatus(items.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setTopicProfiles([]);
      const message = error instanceof Error ? error.message : '加载主题设置失败。';
      setTopicProfilesStatus('error');
      setTopicProfilesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载主题设置失败：${message}`,
      });
    }
  }, [pushLiteratureFeedback]);

  const loadAutoPullRules = useCallback(async () => {
    setRulesStatus('loading');
    setRulesError(null);
    try {
      const query = new URLSearchParams();
      if (ruleFilterScope) {
        query.set('scope', ruleFilterScope);
      }
      if (ruleFilterStatus) {
        query.set('status', ruleFilterStatus);
      }
      const payload = await requestGovernance({
        method: 'GET',
        path: `/auto-pull/rules${query.size > 0 ? `?${query.toString()}` : ''}`,
      });
      const items = normalizeAutoPullRulePayload(payload);
      setAutoPullRules(items);
      setRulesStatus(items.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setAutoPullRules([]);
      const message = error instanceof Error ? error.message : '加载规则失败。';
      setRulesStatus('error');
      setRulesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载规则失败：${message}`,
      });
    }
  }, [pushLiteratureFeedback, ruleFilterScope, ruleFilterStatus]);

  const loadAutoPullRuns = useCallback(async () => {
    setRunsStatus('loading');
    setRunsError(null);
    try {
      const query = new URLSearchParams();
      if (runsFilterRuleId.trim()) {
        query.set('rule_id', runsFilterRuleId.trim());
      }
      if (runsFilterStatus) {
        query.set('status', runsFilterStatus);
      }
      query.set('limit', '50');
      const payload = await requestGovernance({
        method: 'GET',
        path: `/auto-pull/runs?${query.toString()}`,
      });
      const items = normalizeAutoPullRunsPayload(payload);
      setAutoPullRuns(items);
      setRunsStatus(items.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setAutoPullRuns([]);
      const message = error instanceof Error ? error.message : '加载运行记录失败。';
      setRunsStatus('error');
      setRunsError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载运行记录失败：${message}`,
      });
    }
  }, [pushLiteratureFeedback, runsFilterRuleId, runsFilterStatus]);

  const loadAutoPullAlerts = useCallback(async () => {
    setAlertsStatus('loading');
    setAlertsError(null);
    try {
      const query = new URLSearchParams();
      if (alertsFilterRuleId.trim()) {
        query.set('rule_id', alertsFilterRuleId.trim());
      }
      if (alertsFilterLevel) {
        query.set('level', alertsFilterLevel);
      }
      if (alertsFilterAcked === 'acked') {
        query.set('acked', 'true');
      } else if (alertsFilterAcked === 'unacked') {
        query.set('acked', 'false');
      }
      query.set('limit', '100');
      const payload = await requestGovernance({
        method: 'GET',
        path: `/auto-pull/alerts?${query.toString()}`,
      });
      const items = normalizeAutoPullAlertsPayload(payload);
      setAutoPullAlerts(items);
      setAlertsStatus(items.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      setAutoPullAlerts([]);
      const message = error instanceof Error ? error.message : '加载告警失败。';
      setAlertsStatus('error');
      setAlertsError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `加载告警失败：${message}`,
      });
    }
  }, [alertsFilterAcked, alertsFilterLevel, alertsFilterRuleId, pushLiteratureFeedback]);

  const loadAutoPullRunDetail = useCallback(async (runId: string) => {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      setSelectedRunDetail(null);
      setRunDetailError('run_id 不能为空。');
      return;
    }

    setRunDetailLoading(true);
    setRunDetailError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/auto-pull/runs/${encodeURIComponent(normalizedRunId)}`,
      });
      const run = normalizeAutoPullRun(payload);
      if (!run) {
        setSelectedRunDetail(null);
        setRunDetailError('运行详情格式无效。');
        return;
      }
      setSelectedRunDetail(run);
    } catch (error) {
      setSelectedRunDetail(null);
      setRunDetailError(error instanceof Error ? error.message : '加载运行详情失败。');
    } finally {
      setRunDetailLoading(false);
    }
  }, []);

  const resetTopicForm = () => {
    setTopicEditingId(null);
    setTopicFormTopicId('');
    setTopicFormName('');
    setTopicFormIsActive(true);
    setTopicFormIncludeKeywords([]);
    setTopicFormIncludeDraft('');
    setTopicFormExcludeKeywords([]);
    setTopicFormExcludeDraft('');
    setTopicFormVenueSelections([]);
    setTopicVenuePickerOpen(false);
    setTopicFormLookbackInput('30');
    setTopicFormYearStart(topicYearMinBound);
    setTopicFormYearEnd(topicYearMaxBound);
    setTopicFormRuleIds([]);
  };

  const handleOpenCreateTopicProfile = () => {
    resetTopicForm();
    setTopicFormModalOpen(true);
    setAutoImportSubTab('topic-settings');
  };

  const handleCloseTopicModal = () => {
    setTopicFormModalOpen(false);
    setTopicVenuePickerOpen(false);
    resetTopicForm();
  };

  const handleEditTopicProfile = (profile: AutoPullTopicProfile) => {
    setTopicEditingId(profile.topic_id);
    setTopicFormTopicId(profile.topic_id);
    setTopicFormName(profile.name);
    setTopicFormIsActive(profile.is_active);
    setTopicFormIncludeKeywords(profile.include_keywords);
    setTopicFormIncludeDraft('');
    setTopicFormExcludeKeywords(profile.exclude_keywords);
    setTopicFormExcludeDraft('');
    setTopicFormVenueSelections(profile.venue_filters);
    setTopicVenuePickerOpen(false);
    setTopicFormLookbackInput(String(profile.default_lookback_days));
    setTopicFormYearStart(profile.default_min_year ?? topicYearMinBound);
    setTopicFormYearEnd(profile.default_max_year ?? topicYearMaxBound);
    setTopicFormRuleIds(profile.rule_ids);
    setTopicFormModalOpen(true);
    setAutoImportSubTab('topic-settings');
  };

  const handleToggleTopicRuleSelection = (ruleId: string) => {
    setTopicFormRuleIds((current) =>
      current.includes(ruleId)
        ? current.filter((item) => item !== ruleId)
        : [...current, ruleId],
    );
  };

  const handleAddTopicIncludeKeyword = () => {
    const nextValue = topicFormIncludeDraft.trim();
    if (!nextValue) {
      return;
    }
    setTopicFormIncludeKeywords((current) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    setTopicFormIncludeDraft('');
  };

  const handleRemoveTopicIncludeKeyword = (value: string) => {
    setTopicFormIncludeKeywords((current) => current.filter((item) => item !== value));
  };

  const handleAddTopicExcludeKeyword = () => {
    const nextValue = topicFormExcludeDraft.trim();
    if (!nextValue) {
      return;
    }
    setTopicFormExcludeKeywords((current) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    setTopicFormExcludeDraft('');
  };

  const handleRemoveTopicExcludeKeyword = (value: string) => {
    setTopicFormExcludeKeywords((current) => current.filter((item) => item !== value));
  };

  const handleToggleTopicVenueSelection = (venue: string) => {
    setTopicFormVenueSelections((current) =>
      current.includes(venue)
        ? current.filter((item) => item !== venue)
        : [...current, venue],
    );
  };

  const applyTopicYearPreset = (preset: 'recent-5' | 'recent-10' | 'all') => {
    const currentYear = new Date().getFullYear();
    if (preset === 'all') {
      setTopicFormYearStart(topicYearMinBound);
      setTopicFormYearEnd(topicYearMaxBound);
      return;
    }
    if (preset === 'recent-5') {
      setTopicFormYearStart(Math.max(topicYearMinBound, currentYear - 4));
      setTopicFormYearEnd(Math.min(topicYearMaxBound, currentYear + 1));
      return;
    }
    setTopicFormYearStart(Math.max(topicYearMinBound, currentYear - 9));
    setTopicFormYearEnd(Math.min(topicYearMaxBound, currentYear + 1));
  };

  const handleSubmitTopicProfile = async () => {
    const nameText = topicFormName.trim();
    if (!nameText) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '主题名称不能为空。',
      });
      return;
    }

    const lookbackValue = Number.parseInt(topicFormLookbackInput.trim(), 10);
    const normalizedStartYear = Math.min(topicFormYearStart, topicFormYearEnd);
    const normalizedEndYear = Math.max(topicFormYearStart, topicFormYearEnd);
    const topicIdText = topicEditingId
      ? topicEditingId
      : (topicAutoIdPreview || topicFormTopicId.trim() || generateTopicIdByName(nameText, topicProfiles.map((profile) => profile.topic_id)));

    const body = {
      topic_id: topicIdText,
      name: nameText,
      is_active: topicFormIsActive,
      include_keywords: topicFormIncludeKeywords,
      exclude_keywords: topicFormExcludeKeywords,
      venue_filters: topicFormVenueSelections,
      default_lookback_days: Number.isFinite(lookbackValue) ? lookbackValue : 30,
      default_min_year: normalizedStartYear > topicYearMinBound ? normalizedStartYear : null,
      default_max_year: normalizedEndYear < topicYearMaxBound ? normalizedEndYear : null,
      rule_ids: topicFormRuleIds,
    };

    setTopicProfilesStatus('saving');
    try {
      if (topicEditingId) {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(topicEditingId)}`,
          body: {
            name: body.name,
            is_active: body.is_active,
            include_keywords: body.include_keywords,
            exclude_keywords: body.exclude_keywords,
            venue_filters: body.venue_filters,
            default_lookback_days: body.default_lookback_days,
            default_min_year: body.default_min_year,
            default_max_year: body.default_max_year,
            rule_ids: body.rule_ids,
          },
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: '/topics/settings',
          body,
        });
      }
      resetTopicForm();
      setTopicFormModalOpen(false);
      setTopicVenuePickerOpen(false);
      await loadTopicProfiles();
      await loadAutoPullRules();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: topicEditingId ? '主题设置已更新。' : '主题设置已创建。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存主题设置失败。';
      setTopicProfilesStatus('error');
      setTopicProfilesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `保存主题设置失败：${message}`,
      });
    }
  };

  const handleToggleTopicProfileActive = async (profile: AutoPullTopicProfile) => {
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/topics/settings/${encodeURIComponent(profile.topic_id)}`,
        body: {
          is_active: !profile.is_active,
        },
      });
      await loadTopicProfiles();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: `主题已${profile.is_active ? '关闭' : '启用'}：${profile.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新主题状态失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `更新主题状态失败：${message}`,
      });
    }
  };

  const handleCreateRuleShortcutForTopic = (profile: AutoPullTopicProfile) => {
    resetRuleForm();
    setRuleFormScope('TOPIC');
    setRuleFormTopicIdsInput(profile.topic_id);
    setAutoImportSubTab('rules-center');
  };

  const handleEditRule = (rule: AutoPullRule) => {
    const primarySchedule = rule.schedules[0] ?? null;
    setRuleEditingId(rule.rule_id);
    setRuleFormScope(rule.scope);
    setRuleFormTopicIdsInput(rule.topic_ids.join(', '));
    setRuleFormName(rule.name);
    setRuleFormIncludeInput(rule.query_spec.include_keywords.join(', '));
    setRuleFormExcludeInput(rule.query_spec.exclude_keywords.join(', '));
    setRuleFormAuthorsInput(rule.query_spec.authors.join(', '));
    setRuleFormVenuesInput(rule.query_spec.venues.join(', '));
    setRuleFormMaxResultsInput(String(rule.query_spec.max_results_per_source));
    setRuleFormLookbackInput(String(rule.time_spec.lookback_days));
    setRuleFormMinYearInput(rule.time_spec.min_year ? String(rule.time_spec.min_year) : '');
    setRuleFormMaxYearInput(rule.time_spec.max_year ? String(rule.time_spec.max_year) : '');
    setRuleFormMinCompletenessInput(String(rule.quality_spec.min_completeness_score));
    setRuleFormRequireIncludeMatch(rule.quality_spec.require_include_match);
    setRuleFormFrequency(primarySchedule?.frequency ?? 'DAILY');
    setRuleFormDaysInput(primarySchedule?.days_of_week.join(', ') ?? 'MON');
    setRuleFormHourInput(String(primarySchedule?.hour ?? 9));
    setRuleFormMinuteInput(String(primarySchedule?.minute ?? 0));
    setRuleFormTimezone(primarySchedule?.timezone ?? 'UTC');
    setRuleSourceCrossref(rule.sources.some((source) => source.source === 'CROSSREF' && source.enabled));
    setRuleSourceArxiv(rule.sources.some((source) => source.source === 'ARXIV' && source.enabled));
    const zoteroSource = rule.sources.find((source) => source.source === 'ZOTERO' && source.enabled);
    setRuleSourceZotero(Boolean(zoteroSource));
    setRuleSourceZoteroLibraryType(
      (toText(zoteroSource?.config.library_type) as 'users' | 'groups') ?? 'users',
    );
    setRuleSourceZoteroLibraryId(toText(zoteroSource?.config.library_id) ?? '');
    setRuleSourceZoteroApiKey(toText(zoteroSource?.config.api_key) ?? '');
    setAutoImportSubTab('rules-center');
  };

  const resetRuleForm = () => {
    setRuleEditingId(null);
    setRuleFormScope('GLOBAL');
    setRuleFormTopicIdsInput('');
    setRuleFormName('');
    setRuleFormIncludeInput('');
    setRuleFormExcludeInput('');
    setRuleFormAuthorsInput('');
    setRuleFormVenuesInput('');
    setRuleFormMaxResultsInput('20');
    setRuleFormLookbackInput('30');
    setRuleFormMinYearInput('');
    setRuleFormMaxYearInput('');
    setRuleFormMinCompletenessInput('0.6');
    setRuleFormRequireIncludeMatch(true);
    setRuleFormFrequency('DAILY');
    setRuleFormDaysInput('MON');
    setRuleFormHourInput('9');
    setRuleFormMinuteInput('0');
    setRuleSourceCrossref(true);
    setRuleSourceArxiv(true);
    setRuleSourceZotero(false);
    setRuleSourceZoteroLibraryType('users');
    setRuleSourceZoteroLibraryId('');
    setRuleSourceZoteroApiKey('');
  };

  const handleSubmitRule = async () => {
    const nameText = ruleFormName.trim();
    if (!nameText) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '规则名称不能为空。',
      });
      return;
    }

    const topicIds = parseTokenList(ruleFormTopicIdsInput);
    if (ruleFormScope === 'TOPIC' && topicIds.length === 0) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: 'Topic 规则至少绑定一个主题。',
      });
      return;
    }

    const sources: Array<{
      source: AutoPullSource;
      enabled: boolean;
      priority: number;
      config?: Record<string, unknown>;
    }> = [];
    if (ruleSourceCrossref) {
      sources.push({ source: 'CROSSREF', enabled: true, priority: 10 });
    }
    if (ruleSourceArxiv) {
      sources.push({ source: 'ARXIV', enabled: true, priority: 20 });
    }
    if (ruleSourceZotero) {
      const config: Record<string, unknown> = {
        library_type: ruleSourceZoteroLibraryType,
      };
      if (ruleSourceZoteroLibraryId.trim()) {
        config.library_id = ruleSourceZoteroLibraryId.trim();
      }
      if (ruleSourceZoteroApiKey.trim()) {
        config.api_key = ruleSourceZoteroApiKey.trim();
      }
      sources.push({ source: 'ZOTERO', enabled: true, priority: 30, config });
    }

    if (sources.length === 0) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '至少启用一个数据源。',
      });
      return;
    }

    const hour = Number.parseInt(ruleFormHourInput.trim(), 10);
    const minute = Number.parseInt(ruleFormMinuteInput.trim(), 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '调度时间无效。',
      });
      return;
    }

    const maxResults = Number.parseInt(ruleFormMaxResultsInput.trim(), 10);
    const lookbackDays = Number.parseInt(ruleFormLookbackInput.trim(), 10);
    const minYear = Number.parseInt(ruleFormMinYearInput.trim(), 10);
    const maxYear = Number.parseInt(ruleFormMaxYearInput.trim(), 10);
    const minCompleteness = Number.parseFloat(ruleFormMinCompletenessInput.trim());

    const payload = {
      scope: ruleFormScope,
      topic_ids: ruleFormScope === 'TOPIC' ? topicIds : undefined,
      name: nameText,
      query_spec: {
        include_keywords: parseTokenList(ruleFormIncludeInput),
        exclude_keywords: parseTokenList(ruleFormExcludeInput),
        authors: parseTokenList(ruleFormAuthorsInput),
        venues: parseTokenList(ruleFormVenuesInput),
        max_results_per_source: Number.isFinite(maxResults) ? maxResults : 20,
      },
      time_spec: {
        lookback_days: Number.isFinite(lookbackDays) ? lookbackDays : 30,
        min_year: ruleFormMinYearInput.trim().length > 0 && Number.isFinite(minYear) ? minYear : null,
        max_year: ruleFormMaxYearInput.trim().length > 0 && Number.isFinite(maxYear) ? maxYear : null,
      },
      quality_spec: {
        min_completeness_score: Number.isFinite(minCompleteness) ? minCompleteness : 0.6,
        require_include_match: ruleFormRequireIncludeMatch,
      },
      sources,
      schedules: [
        {
          frequency: ruleFormFrequency,
          days_of_week: ruleFormFrequency === 'WEEKLY' ? parseTokenList(ruleFormDaysInput) : [],
          hour,
          minute,
          timezone: ruleFormTimezone.trim() || 'UTC',
          active: true,
        },
      ],
    };

    setRulesStatus('saving');
    try {
      if (ruleEditingId) {
        await requestGovernance({
          method: 'PATCH',
          path: `/auto-pull/rules/${encodeURIComponent(ruleEditingId)}`,
          body: payload,
        });
      } else {
        await requestGovernance({
          method: 'POST',
          path: '/auto-pull/rules',
          body: payload,
        });
      }
      resetRuleForm();
      await loadAutoPullRules();
      await loadAutoPullRuns();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: ruleEditingId ? '规则已更新。' : '规则已创建。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存规则失败。';
      setRulesStatus('error');
      setRulesError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `保存规则失败：${message}`,
      });
    }
  };

  const handleToggleRuleStatus = async (rule: AutoPullRule) => {
    const nextStatus: AutoPullRuleStatus = rule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/auto-pull/rules/${encodeURIComponent(rule.rule_id)}`,
        body: {
          status: nextStatus,
        },
      });
      await loadAutoPullRules();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: `规则已${nextStatus === 'ACTIVE' ? '启用' : '暂停'}：${rule.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新规则状态失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `更新规则状态失败：${message}`,
      });
    }
  };

  const handleRunRuleNow = async (ruleId: string) => {
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: `/auto-pull/rules/${encodeURIComponent(ruleId)}/runs`,
        body: {
          trigger_type: 'MANUAL',
        },
      });
      const run = normalizeAutoPullRun(payload);
      if (run) {
        setSelectedRunDetail(run);
      }
      await loadAutoPullRuns();
      await loadAutoPullAlerts();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: '规则已触发运行。',
      });
      setAutoImportSubTab('runs-alerts');
    } catch (error) {
      const message = error instanceof Error ? error.message : '触发运行失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `触发运行失败：${message}`,
      });
    }
  };

  const handleRetryRun = async (runId: string) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/auto-pull/runs/${encodeURIComponent(runId)}/retry-failed-sources`,
        body: {},
      });
      await loadAutoPullRuns();
      await loadAutoPullAlerts();
      await loadAutoPullRunDetail(runId);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: '已触发失败源重试。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '重试失败源失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `重试失败源失败：${message}`,
      });
    }
  };

  const handleAckAlert = async (alertId: string) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/auto-pull/alerts/${encodeURIComponent(alertId)}/ack`,
        body: {},
      });
      await loadAutoPullAlerts();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: '告警已关闭。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '确认告警失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `确认告警失败：${message}`,
      });
    }
  };

  const handleManualUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) {
      return;
    }

    setManualUploadLoading(true);
    setManualUploadStatus('loading');
    setManualUploadError(null);
    try {
      const content = await file.text();
      const items = parseManualUploadItems(file.name, content);
      if (items.length === 0) {
        const message = '未解析到可导入文献，请检查文件格式（JSON/CSV/BibTeX）。';
        setManualUploadStatus('empty');
        setManualUploadError(message);
        pushLiteratureFeedback({
          slot: 'manual-import',
          level: 'warning',
          message,
        });
        return;
      }

      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/import',
        body: {
          items: items.map((item) => ({
            ...item,
            tags: [...new Set([...(item.tags ?? []), ...parseTagsInput(batchTagsInput)])],
            rights_class: item.rights_class ?? 'UNKNOWN',
          })),
        },
      });

      const root = asRecord(payload);
      const results = root?.results;
      const importedIds = Array.isArray(results)
        ? results
            .map((row) => asRecord(row))
            .map((row) => (row ? toText(row.literature_id) : undefined))
            .filter((id): id is string => Boolean(id))
        : [];

      if (importedIds.length > 0) {
        await requestGovernance({
          method: 'POST',
          path: `/topics/${encodeURIComponent(topicId.trim())}/literature-scope`,
          body: {
            actions: importedIds.map((literatureId) => ({
              literature_id: literatureId,
              scope_status: 'in_scope',
              reason: scopeReasonInput.trim() || undefined,
            })),
          },
        });
      }

      setManualUploadStatus(importedIds.length > 0 ? 'ready' : 'empty');
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: importedIds.length > 0 ? 'success' : 'warning',
        message: `手动上传完成：导入 ${importedIds.length} 条文献。`,
      });
      await loadTopicScope(topicId);
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '手动上传失败。';
      setManualUploadStatus('error');
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `手动上传失败：${message}`,
      });
    } finally {
      setManualUploadLoading(false);
      event.target.value = '';
    }
  };

  const handleImportFromZotero = async () => {
    const libraryId = zoteroLibraryId.trim();
    if (!libraryId) {
      const message = '请填写 Zotero Library ID。';
      setZoteroStatus('error');
      setZoteroError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'warning',
        message,
      });
      return;
    }

    const parsedLimit = Number.parseInt(zoteroLimitInput.trim(), 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

    setZoteroLoading(true);
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/zotero-import',
        body: {
          library_type: zoteroLibraryType,
          library_id: libraryId,
          api_key: zoteroApiKey.trim() || undefined,
          query: zoteroQuery.trim() || undefined,
          limit,
          topic_id: topicId.trim() || undefined,
          scope_status: 'in_scope',
          scope_reason: scopeReasonInput.trim() || undefined,
          tags: parseTagsInput(batchTagsInput),
        },
      });

      const root = asRecord(payload);
      const importedCount = typeof root?.imported_count === 'number' ? root.imported_count : 0;
      const scopedCount = typeof root?.scope_upserted_count === 'number' ? root.scope_upserted_count : 0;
      setZoteroStatus(importedCount > 0 ? 'ready' : 'empty');
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: importedCount > 0 ? 'success' : 'warning',
        message: `Zotero 同步完成：导入 ${importedCount} 条，加入范围 ${scopedCount} 条。`,
      });
      await loadTopicScope(topicId);
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zotero 导入失败。';
      setZoteroStatus('error');
      setZoteroError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `Zotero 导入失败：${message}`,
        recoveryAction: 'retry-zotero-import',
      });
    } finally {
      setZoteroLoading(false);
    }
  };

  const handleChangeMetadataDraft = (
    literatureId: string,
    field: 'tagsInput' | 'rightsClass',
    value: string,
  ) => {
    setMetadataDrafts((current) => {
      const existing = current[literatureId] ?? { tagsInput: '', rightsClass: 'UNKNOWN' };
      return {
        ...current,
        [literatureId]: {
          ...existing,
          [field]: field === 'rightsClass' ? (normalizeRightsClass(value) as RightsClass) : value,
        },
      };
    });
  };

  const handleSaveMetadata = async (literatureId: string) => {
    const draft = metadataDrafts[literatureId];
    if (!draft) {
      return;
    }

    setMetadataSavingIds((current) => ({ ...current, [literatureId]: true }));
    setQueryStatus('saving');
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/literature/${encodeURIComponent(literatureId)}/metadata`,
        body: {
          tags: parseTagsInput(draft.tagsInput),
          rights_class: draft.rightsClass,
        },
      });
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `元数据已更新：${literatureId}`,
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '元数据更新失败。';
      setQueryStatus('error');
      setQueryError(message);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `元数据更新失败：${message}`,
        recoveryAction: 'reload-overview',
      });
    } finally {
      setMetadataSavingIds((current) => ({ ...current, [literatureId]: false }));
    }
  };

  const handleScopeStatusChange = async (literatureId: string, scopeStatus: ScopeStatus) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/topics/${encodeURIComponent(topicId.trim())}/literature-scope`,
        body: {
          actions: [
            {
              literature_id: literatureId,
              scope_status: scopeStatus,
              reason: scopeReasonInput.trim() || undefined,
            },
          ],
        },
      });
      await loadTopicScope(topicId);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: scopeStatus === 'in_scope' ? '文献已加入选题范围。' : '文献已从选题范围排除。',
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新选题范围失败。';
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `更新选题范围失败：${message}`,
      });
    }
  };

  const handleSyncPaperFromTopic = async () => {
    const normalizedPaperId = paperId.trim();
    const normalizedTopicId = topicId.trim();
    if (!normalizedPaperId || !normalizedTopicId) {
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'warning',
        message: '请先填写 Paper ID 与 Topic ID。',
      });
      return;
    }

    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/literature-links/from-topic`,
        body: {
          topic_id: normalizedTopicId,
        },
      });
      const root = asRecord(payload);
      const linkedCount = typeof root?.linked_count === 'number' ? root.linked_count : 0;
      const skippedCount = typeof root?.skipped_count === 'number' ? root.skipped_count : 0;
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `已同步到论文管理：新增 ${linkedCount} 条，跳过 ${skippedCount} 条。`,
      });
      await loadPaperLiterature(normalizedPaperId);
      await loadLiteratureOverview(topicId, normalizedPaperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步论文文献失败。';
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `同步论文文献失败：${message}`,
      });
    }
  };

  const handleUpdateCitationStatus = async (linkId: string, status: CitationStatus) => {
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/paper-projects/${encodeURIComponent(paperId.trim())}/literature-links/${encodeURIComponent(linkId)}`,
        body: {
          citation_status: status,
        },
      });
      await loadPaperLiterature(paperId);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `引用状态已更新为 ${status}。`,
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新引用状态失败。';
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `更新引用状态失败：${message}`,
      });
    }
  };

  const handleAddQueryCondition = () => {
    setQueryGroup((current) => ({
      ...current,
      conditions: [...current.conditions, createQueryCondition()],
    }));
  };

  const handleUpdateQueryCondition = (conditionId: string, patch: Partial<Omit<QueryCondition, 'id'>>) => {
    setQueryGroup((current) => ({
      ...current,
      conditions: current.conditions.map((condition) =>
        condition.id === conditionId ? { ...condition, ...patch } : condition,
      ),
    }));
  };

  const handleRemoveQueryCondition = (conditionId: string) => {
    setQueryGroup((current) => {
      const nextConditions = current.conditions.filter((condition) => condition.id !== conditionId);
      return {
        ...current,
        conditions: nextConditions.length > 0 ? nextConditions : [createQueryCondition()],
      };
    });
  };

  const executeOverviewQuery = useCallback((group: QueryGroup, sort: QuerySort) => {
    const filtered = applyQueryGroup(overviewPanel.data.items, group);
    const sorted = sortOverviewItems(filtered, sort);
    setOverviewResultItems(sorted);
    setQueryStatus(sorted.length > 0 ? 'ready' : 'empty');
    return sorted;
  }, [overviewPanel.data.items]);

  const handleApplyAdvancedQuery = () => {
    if (overviewPanel.status === 'loading') {
      setQueryStatus('loading');
      return;
    }
    if (overviewPanel.status === 'error') {
      const message = overviewPanel.error ?? '综览数据异常，无法执行查询。';
      setQueryStatus('error');
      setQueryError(message);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message,
        recoveryAction: 'reload-overview',
      });
      return;
    }

    setQueryStatus('loading');
    setQueryError(null);
    try {
      const frozenGroup = cloneQueryGroup(queryGroup);
      setAppliedQueryGroup(frozenGroup);
      const result = executeOverviewQuery(frozenGroup, querySort);
      pushLiteratureFeedback({
        slot: 'overview',
        level: result.length > 0 ? 'success' : 'warning',
        message: result.length > 0 ? `高级查询完成：命中 ${result.length} 条。` : '高级查询无命中，请调整条件。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '高级查询执行失败。';
      setQueryStatus('error');
      setQueryError(message);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `高级查询失败：${message}`,
        recoveryAction: 'retry-query',
      });
    }
  };

  const handleResetAdvancedQuery = () => {
    const resetGroup: QueryGroup = {
      logic: 'AND',
      conditions: [createQueryCondition()],
    };
    setQueryGroup(resetGroup);
    setAppliedQueryGroup(null);
    const sorted = sortOverviewItems(overviewPanel.data.items, querySort);
    setOverviewResultItems(sorted);
    setQueryStatus(sorted.length > 0 ? 'ready' : 'empty');
    setQueryError(null);
    pushLiteratureFeedback({
      slot: 'overview',
      level: 'info',
      message: '已重置高级查询条件。',
    });
  };

  const handleSaveQueryPreset = () => {
    const name = queryPresetNameInput.trim();
    if (!name) {
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'warning',
        message: '请先输入保存查询名称。',
      });
      return;
    }

    const preset: SavedQueryPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      group: cloneQueryGroup(queryGroup),
      defaultSort: querySort,
    };
    const existing = savedQueryPresets.find((item) => item.name === name);
    const targetPresetId = existing ? existing.id : preset.id;

    setSavedQueryPresets((current) => {
      const existingIndex = current.findIndex((item) => item.name === name);
      if (existingIndex < 0) {
        return [...current, preset];
      }
      const next = [...current];
      next[existingIndex] = { ...preset, id: current[existingIndex].id };
      return next;
    });
    setSelectedPresetId(targetPresetId);
    setQueryPresetNameInput('');
    pushLiteratureFeedback({
      slot: 'overview',
      level: 'success',
      message: `查询已保存：${name}`,
    });
  };

  const handleApplySelectedPreset = () => {
    const selected = savedQueryPresets.find((preset) => preset.id === selectedPresetId);
    if (!selected) {
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'warning',
        message: '请先选择已保存查询。',
      });
      return;
    }

    const nextGroup = cloneQueryGroup(selected.group);
    setQueryGroup(nextGroup);
    setAppliedQueryGroup(nextGroup);
    setQuerySort(selected.defaultSort);
    const result = executeOverviewQuery(nextGroup, selected.defaultSort);
    pushLiteratureFeedback({
      slot: 'overview',
      level: result.length > 0 ? 'success' : 'warning',
      message: `已应用查询：${selected.name}（命中 ${result.length} 条）。`,
    });
  };

  const handleDeleteSelectedPreset = () => {
    if (!selectedPresetId) {
      return;
    }
    setSavedQueryPresets((current) => current.filter((preset) => preset.id !== selectedPresetId));
    setSelectedPresetId('');
    pushLiteratureFeedback({
      slot: 'overview',
      level: 'info',
      message: '已删除保存查询。',
    });
  };

  const handleTopFeedbackRecovery = () => {
    if (!topFeedback?.recoveryAction) {
      return;
    }

    if (topFeedback.recoveryAction === 'retry-zotero-import') {
      void handleImportFromZotero();
      return;
    }
    if (topFeedback.recoveryAction === 'retry-query') {
      handleApplyAdvancedQuery();
      return;
    }
    if (topFeedback.recoveryAction === 'reload-overview') {
      void loadLiteratureOverview(topicId, paperId);
    }
  };

  const handleApplyLiteratureFilters = () => {
    const normalizedTopic = topicIdInput.trim();
    const normalizedPaper = paperIdInput.trim();
    const nextTopic = normalizedTopic || topicId;
    const nextPaper = normalizedPaper || paperId;

    setTopicId(nextTopic);
    setPaperId(nextPaper);
    setTopicIdInput(nextTopic);
    setPaperIdInput(nextPaper);

    void loadTopicScope(nextTopic);
    void loadLiteratureOverview(nextTopic, nextPaper);
    void loadPaperLiterature(nextPaper);

    pushLiteratureFeedback({
      slot: 'header',
      level: 'info',
      message: `已应用筛选：Topic=${nextTopic}，Paper=${nextPaper}`,
    });
  };

  useEffect(() => {
    if (activeModule === '文献管理') {
      void loadTopicScope(topicId);
      void loadLiteratureOverview(topicId, paperId);
    }
    if (activeModule === '论文管理' || activeModule === '写作中心') {
      void loadPaperLiterature(paperId);
    }
  }, [activeModule, loadLiteratureOverview, loadPaperLiterature, loadTopicScope, paperId, topicId]);

  useEffect(() => {
    if (activeModule !== '文献管理' || activeLiteratureTab !== 'auto-import') {
      return;
    }
    void loadTopicProfiles();
    void loadAutoPullRules();
    void loadAutoPullRuns();
    void loadAutoPullAlerts();
  }, [
    activeLiteratureTab,
    activeModule,
    loadAutoPullAlerts,
    loadAutoPullRules,
    loadAutoPullRuns,
    loadTopicProfiles,
  ]);

  useEffect(() => {
    if (activeLiteratureTab !== 'auto-import' || autoImportSubTab !== 'topic-settings') {
      setTopicFormModalOpen(false);
    }
  }, [activeLiteratureTab, autoImportSubTab]);

  const releaseQueue = useMemo(() => {
    return timelinePanel.data
      .filter(
        (event) =>
          event.event_type === 'research.node.status.changed' ||
          event.event_type === 'research.release.reviewed',
      )
      .slice(-6)
      .reverse();
  }, [timelinePanel.data]);

  const inScopeCount = topicScopeItems.filter((item) => item.scope_status === 'in_scope').length;
  const citedCount = paperLiteratureItems.filter((item) => item.citation_status === 'cited').length;
  const usedCount = paperLiteratureItems.filter((item) => item.citation_status === 'used').length;

  const metricCards = useMemo(() => {
    if (activeModule === '文献管理' || activeModule === '选题管理') {
      return [
        { label: '自动规则', value: String(autoPullRules.length) },
        { label: '运行记录', value: String(autoPullRuns.length) },
        { label: '未确认告警', value: String(autoPullAlerts.filter((alert) => !alert.ack_at).length) },
        { label: '综览总量', value: String(overviewPanel.data.summary.total_literatures) },
      ];
    }

    if (activeModule === '论文管理') {
      return [
        { label: '论文文献总数', value: String(paperLiteratureItems.length) },
        { label: '状态：cited', value: String(citedCount) },
        { label: '状态：used', value: String(usedCount) },
        { label: '当前 Paper', value: paperId },
      ];
    }

    if (activeModule === '写作中心') {
      return [
        { label: '可用引用条目', value: String(paperLiteratureItems.length) },
        { label: '高置信引用（cited）', value: String(citedCount) },
        { label: '进行中引用（used）', value: String(usedCount) },
        { label: '引用来源', value: '论文管理（只读）' },
      ];
    }

    return [
      { label: '当前 Topic', value: topicId },
      { label: '当前 Paper', value: paperId },
      { label: '选题范围（保留）', value: String(inScopeCount) },
      { label: '论文文献总数', value: String(paperLiteratureItems.length) },
    ];
  }, [
    activeModule,
    autoPullAlerts,
    autoPullRules.length,
    autoPullRuns.length,
    citedCount,
    inScopeCount,
    overviewPanel.data.summary.total_literatures,
    paperId,
    paperLiteratureItems.length,
    topicId,
    usedCount,
  ]);

  const topicScopedRules = useMemo(
    () => autoPullRules.filter((rule) => rule.scope === 'TOPIC'),
    [autoPullRules],
  );
  const topicVenueOptions = useMemo(
    () => [...new Set([
      ...topicPresetVenueOptions,
      ...topicProfiles.flatMap((profile) => profile.venue_filters),
      ...topicFormVenueSelections,
    ])],
    [topicFormVenueSelections, topicProfiles],
  );
  const topicAutoIdPreview = useMemo(() => {
    const name = topicFormName.trim();
    if (!name || topicEditingId) {
      return '';
    }
    return generateTopicIdByName(name, topicProfiles.map((profile) => profile.topic_id));
  }, [topicEditingId, topicFormName, topicProfiles]);
  const topicYearLowerBound = Math.min(topicFormYearStart, topicFormYearEnd);
  const topicYearUpperBound = Math.max(topicFormYearStart, topicFormYearEnd);
  const topicYearRangeTrackStyle = useMemo<CSSProperties>(() => {
    const total = Math.max(1, topicYearMaxBound - topicYearMinBound);
    const startPercent = ((topicYearLowerBound - topicYearMinBound) / total) * 100;
    const endPercent = ((topicYearUpperBound - topicYearMinBound) / total) * 100;
    return {
      '--topic-range-start': `${startPercent}%`,
      '--topic-range-end': `${endPercent}%`,
    } as CSSProperties;
  }, [topicYearLowerBound, topicYearUpperBound]);
  const topicVenueSelectionLabel = useMemo(() => {
    if (topicFormVenueSelections.length === 0) {
      return '不限会议与期刊';
    }
    if (topicFormVenueSelections.length <= 2) {
      return topicFormVenueSelections.join('、');
    }
    return `${topicFormVenueSelections.slice(0, 2).join('、')} 等 ${topicFormVenueSelections.length} 项`;
  }, [topicFormVenueSelections]);
  const ruleNameById = useMemo(
    () => new Map(autoPullRules.map((rule) => [rule.rule_id, rule.name])),
    [autoPullRules],
  );
  const autoPullStatusDigest = `${topicProfilesStatus}|${rulesStatus}|${runsStatus}|${alertsStatus}`;

  const handleModuleSelect = (moduleName: string) => {
    setActiveModule(moduleName);
    setActionHint(`已切换到「${moduleName}」模块。`);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  const handleSelectLiteratureSubTab = (tabKey: LiteratureTabKey, subTabKey: string) => {
    setActiveLiteratureTab(tabKey);
    if (tabKey === 'auto-import' && isAutoImportSubTabKey(subTabKey)) {
      setAutoImportSubTab(subTabKey);
    }
  };

  const handleToggleGovernance = () => {
    setGovernanceEnabled((current) => {
      const next = !current;
      setActionHint(next ? '治理面板已启用（当前会话）。' : '治理面板已关闭，主流程不受影响。');
      return next;
    });
  };

  const handleApplyPaperId = () => {
    const normalized = paperIdInput.trim();
    if (!normalized) {
      setActionHint('Paper ID 不能为空。');
      return;
    }

    setPaperId(normalized);
    setReviewSubmitState('idle');
    setReviewSubmitMessage('');
    setActionHint(`已加载治理项目 ${normalized}。`);
    void loadPaperLiterature(normalized);
    void loadLiteratureOverview(topicId, normalized);
  };

  const handleRefreshPanels = () => {
    setRefreshTick((value) => value + 1);
    setActionHint('治理面板已刷新。');
  };

  const handleEvidenceTrace = (event: TimelineEvent) => {
    const snapshotId = tryGetSnapshotId(event.summary);
    const evidence = [
      event.node_id ? `node:${event.node_id}` : 'node:none',
      snapshotId ? `snapshot:${snapshotId}` : 'snapshot:none',
      event.module_id ? `module:${event.module_id}` : 'module:none',
    ].join(' · ');
    setActionHint(`证据链定位：${evidence}`);
  };

  const handleSubmitReleaseReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPaperId = paperId.trim();
    if (!normalizedPaperId) {
      setReviewSubmitState('error');
      setReviewSubmitMessage('Paper ID 不能为空。');
      return;
    }

    const reviewers = reviewersInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (reviewers.length === 0) {
      setReviewSubmitState('error');
      setReviewSubmitMessage('至少提供一个 reviewer。');
      return;
    }

    const riskFlags = riskFlagsInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setReviewSubmitState('submitting');
    setReviewSubmitMessage('正在提交 release review...');

    try {
      const response = await requestGovernance({
        method: 'POST',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/release-gate/review`,
        body: {
          reviewers,
          decision,
          risk_flags: riskFlags,
          label_policy: labelPolicy,
          comment: reviewComment.trim() || undefined,
        },
      });

      const normalized = normalizeReleasePayload(response);
      if (!normalized) {
        throw new Error('release-review response invalid.');
      }

      setReviewSubmitState('success');
      setReviewSubmitMessage(
        `已提交 ${normalized.gate_result.review_id}（audit: ${normalized.gate_result.audit_ref}）。`,
      );
      setActionHint(
        `release-review ${normalized.gate_result.review_id} 提交完成，decision=${decision}。`,
      );
      setRefreshTick((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'release-review 提交失败。';
      setReviewSubmitState('error');
      setReviewSubmitMessage(message);
      setActionHint(`release-review 提交失败：${message}`);
    }
  };

  const shellClassName = [
    'desktop-shell',
    isMacDesktop ? ' is-macos-chrome' : '',
    isSidebarCollapsed ? ' is-sidebar-collapsed' : ' is-sidebar-expanded',
  ].join('');

  return (
    <div data-ui="page" className={shellClassName}>
      <header className="topbar">
        <span className="topbar-region topbar-region-left" aria-hidden="true" />
        <span className="topbar-region topbar-region-right" aria-hidden="true" />
        <div className="topbar-inner">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-sidebar-toggle"
              onClick={handleToggleSidebar}
              aria-label={isSidebarCollapsed ? '展开导航栏' : '折叠导航栏'}
              title={isSidebarCollapsed ? '展开导航栏' : '折叠导航栏'}
            >
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="15" height="13" rx="3.4" />
                {isSidebarCollapsed ? (
                  <line x1="12.4" y1="7" x2="12.4" y2="13" />
                ) : (
                  <line x1="7.6" y1="7" x2="7.6" y2="13" />
                )}
              </svg>
            </button>
          </div>
          <div className="topbar-center">
            {activeModule === '文献管理' ? (
              <div className="topbar-literature-tabs" role="tablist" aria-label="文献管理标签页">
                {literatureTabs.map((tab) => {
                  const subTabs = literatureSubTabsByTab[tab.key] ?? [];
                  const activeSubTabKey = tab.key === 'auto-import' ? autoImportSubTab : null;
                  const shouldShowSubTabs = activeLiteratureTab === tab.key && subTabs.length > 0;
                  return (
                    <div
                      key={tab.key}
                      className={`topbar-tab-cluster${activeLiteratureTab === tab.key ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        role="tab"
                        className={`topbar-tab-button${activeLiteratureTab === tab.key ? ' is-active' : ''}`}
                        aria-selected={activeLiteratureTab === tab.key}
                        onClick={() => setActiveLiteratureTab(tab.key)}
                      >
                        {tab.label}
                      </button>
                      {shouldShowSubTabs ? (
                        <div className="topbar-inline-subtabs" role="group" aria-label={`${tab.label} 子标签`}>
                          {subTabs.map((subTab) => {
                            const isSubTabActive =
                              activeLiteratureTab === tab.key && activeSubTabKey === subTab.key;
                            return (
                              <button
                                key={`${tab.key}-${subTab.key}`}
                                type="button"
                                className={`topbar-subtab-button${isSubTabActive ? ' is-active' : ''}`}
                                aria-pressed={isSubTabActive}
                                onClick={() => handleSelectLiteratureSubTab(tab.key, subTab.key)}
                              >
                                {subTab.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="topbar-right">
            <label
              className={`topbar-search${toolbarSearchInput.trim().length > 0 ? ' has-value' : ''}`}
              aria-label="搜索（占位）"
            >
              <span className="topbar-search-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                  <circle cx="8.25" cy="8.25" r="5.25" />
                  <line x1="12.3" y1="12.3" x2="17" y2="17" />
                </svg>
              </span>
              <input
                type="text"
                value={toolbarSearchInput}
                onChange={(event) => setToolbarSearchInput(event.target.value)}
                placeholder="搜索（占位）"
              />
            </label>
            <span className="topbar-divider" aria-hidden="true" />
            <div className="topbar-theme-switch" role="group" aria-label="配色方案">
              {themeModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`topbar-theme-switch-item${themeMode === option.value ? ' is-active' : ''}`}
                  onClick={() => setThemeMode(option.value)}
                  aria-pressed={themeMode === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className={`shell-main${isSidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        <aside className="sidebar-pane">
          {!isSidebarCollapsed ? (
            <nav className="sidebar-nav-zones" aria-label="模块导航">
              <section className="sidebar-nav-zone sidebar-nav-zone-core">
                <div className="module-nav-list">
                  {coreNavItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`module-nav-item${activeModule === item ? ' is-active' : ''}`}
                      onClick={() => handleModuleSelect(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
              <section className="sidebar-nav-zone sidebar-nav-zone-writing">
                <div className="module-nav-list">
                  {writingNavItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`module-nav-item${activeModule === item ? ' is-active' : ''}`}
                      onClick={() => handleModuleSelect(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            </nav>
          ) : null}
        </aside>

        <main className="workspace-pane">
          {activeModule === '文献管理' ? null : (
            <section data-ui="grid" data-cols="4" data-gap="3" className="metrics-grid">
              {metricCards.map((card) => (
                <article key={`${activeModule}-${card.label}`} className="dashboard-metric">
                  <p data-ui="text" data-variant="label" data-tone="muted">{card.label}</p>
                  <p data-ui="text" data-variant="h3" data-tone="primary">{card.value}</p>
                </article>
              ))}
            </section>
          )}

          {activeModule === '文献管理' ? (
            <section className="module-dashboard literature-workspace">
              <div data-ui="stack" data-direction="col" data-gap="3">
                {activeLiteratureTab === 'auto-import' ? (
                  <section className="literature-tab-panel" data-autopull-status={autoPullStatusDigest}>
                    {autoImportSubTab === 'topic-settings' ? (
                      <section className="literature-section-block">
                        <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                          <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={handleOpenCreateTopicProfile}>
                            新增主题
                          </button>
                          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void loadTopicProfiles()}>
                            刷新列表
                          </button>
                        </div>
                        {topicProfilesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicProfilesError}</p> : null}
                        <div className="literature-list">
                          {topicProfiles.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无主题设置。</p>
                          ) : (
                            topicProfiles.map((profile) => (
                              <div key={profile.topic_id} className="literature-list-item">
                                <div>
                                  <p data-ui="text" data-variant="body" data-tone="primary">
                                    {profile.topic_id} · {profile.name}
                                  </p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">
                                    {profile.is_active ? '已启用' : '已关闭'} · 包含词:{profile.include_keywords.length} · 排除词:{profile.exclude_keywords.length} · 会议与期刊:{profile.venue_filters.length} · 绑定规则:{profile.rule_ids.length}
                                  </p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">
                                    规则绑定：{profile.rule_ids.length === 0
                                      ? '未绑定'
                                      : profile.rule_ids.map((ruleId) => ruleNameById.get(ruleId) ?? ruleId).join('，')}
                                  </p>
                                </div>
                                <div data-ui="toolbar" data-gap="2">
                                  <button
                                    data-ui="button"
                                    data-variant="ghost"
                                    data-size="sm"
                                    type="button"
                                    onClick={() => void handleToggleTopicProfileActive(profile)}
                                  >
                                    {profile.is_active ? '关闭主题' : '启用主题'}
                                  </button>
                                  <button
                                    data-ui="button"
                                    data-variant="ghost"
                                    data-size="sm"
                                    type="button"
                                    onClick={() => handleEditTopicProfile(profile)}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    data-ui="button"
                                    data-variant="secondary"
                                    data-size="sm"
                                    type="button"
                                    onClick={() => handleCreateRuleShortcutForTopic(profile)}
                                  >
                                    新建规则
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {topicFormModalOpen ? (
                          <div className="topic-profile-modal-backdrop" role="presentation">
                            <section
                              className="topic-profile-modal"
                              role="dialog"
                              aria-modal="true"
                              aria-label="主题基础信息"
                            >
                              <header className="topic-modal-header">
                                <h3>主题基础信息</h3>
                                <button
                                  type="button"
                                  className="topic-modal-close"
                                  onClick={handleCloseTopicModal}
                                  aria-label="关闭主题弹窗"
                                >
                                  ×
                                </button>
                              </header>

                              <section className="topic-modal-section">
                                <div className="topic-modal-grid">
                                  <label data-ui="field">
                                    <span data-slot="label">
                                      主题名称 <span className="topic-required-mark">*</span>
                                    </span>
                                    <input
                                      data-ui="input"
                                      data-size="sm"
                                      value={topicFormName}
                                      onChange={(event) => setTopicFormName(event.target.value)}
                                      placeholder="输入主题名称"
                                    />
                                  </label>
                                  <label data-ui="field">
                                    <span data-slot="label">主题标识</span>
                                    <input
                                      data-ui="input"
                                      data-size="sm"
                                      className="topic-id-readonly-input"
                                      value={topicEditingId ? topicFormTopicId : topicAutoIdPreview}
                                      placeholder="将根据主题名称自动生成"
                                      readOnly
                                    />
                                  </label>

                                  <label data-ui="field">
                                    <span data-slot="label">包含词</span>
                                    <div className="topic-token-editor">
                                      <div className="topic-token-editor-input">
                                        <input
                                          data-ui="input"
                                          data-size="sm"
                                          value={topicFormIncludeDraft}
                                          onChange={(event) => setTopicFormIncludeDraft(event.target.value)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                              event.preventDefault();
                                              handleAddTopicIncludeKeyword();
                                            }
                                          }}
                                          placeholder="输入后按 Enter 添加"
                                        />
                                      </div>
                                      <div className="topic-token-list">
                                        {topicFormIncludeKeywords.map((keyword) => (
                                          <span key={`include-${keyword}`} className="topic-token-chip">
                                            <span>{keyword}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveTopicIncludeKeyword(keyword)}
                                              aria-label={`移除包含词 ${keyword}`}
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </label>

                                  <label data-ui="field">
                                    <span data-slot="label">排除词</span>
                                    <div className="topic-token-editor">
                                      <div className="topic-token-editor-input">
                                        <input
                                          data-ui="input"
                                          data-size="sm"
                                          value={topicFormExcludeDraft}
                                          onChange={(event) => setTopicFormExcludeDraft(event.target.value)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                              event.preventDefault();
                                              handleAddTopicExcludeKeyword();
                                            }
                                          }}
                                          placeholder="输入后按 Enter 添加"
                                        />
                                      </div>
                                      <div className="topic-token-list">
                                        {topicFormExcludeKeywords.map((keyword) => (
                                          <span key={`exclude-${keyword}`} className="topic-token-chip">
                                            <span>{keyword}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveTopicExcludeKeyword(keyword)}
                                              aria-label={`移除排除词 ${keyword}`}
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </label>

                                  <div data-ui="field" className="topic-venue-picker">
                                    <span data-slot="label">会议与期刊</span>
                                    <button
                                      type="button"
                                      className={`topic-venue-picker-trigger${topicVenuePickerOpen ? ' is-open' : ''}`}
                                      onClick={() => setTopicVenuePickerOpen((current) => !current)}
                                      aria-expanded={topicVenuePickerOpen}
                                    >
                                      <span>{topicVenueSelectionLabel}</span>
                                      <span aria-hidden="true">{topicVenuePickerOpen ? '▲' : '▼'}</span>
                                    </button>
                                    {topicVenuePickerOpen ? (
                                      <div className="topic-venue-picker-panel">
                                        <div className="topic-venue-picker-actions">
                                          <button
                                            data-ui="button"
                                            data-variant="ghost"
                                            data-size="sm"
                                            type="button"
                                            onClick={() => setTopicFormVenueSelections([])}
                                          >
                                            清空选择
                                          </button>
                                        </div>
                                        <div className="topic-venue-picker-list">
                                          {topicVenueOptions.map((option) => (
                                            <label key={option} className="topic-venue-picker-item">
                                              <input
                                                type="checkbox"
                                                checked={topicFormVenueSelections.includes(option)}
                                                onChange={() => handleToggleTopicVenueSelection(option)}
                                              />
                                              <span>{option}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>

                                  <div data-ui="field" className="topic-year-field">
                                    <div className="topic-year-header">
                                      <span data-slot="label">年份范围</span>
                                      <div className="topic-year-shortcuts">
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          onClick={() => applyTopicYearPreset('recent-5')}
                                        >
                                          近5年
                                        </button>
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          onClick={() => applyTopicYearPreset('recent-10')}
                                        >
                                          近10年
                                        </button>
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          onClick={() => applyTopicYearPreset('all')}
                                        >
                                          全部
                                        </button>
                                      </div>
                                    </div>
                                    <div className="topic-year-range-main">
                                      <input
                                        className="topic-year-bound-input"
                                        type="number"
                                        min={topicYearMinBound}
                                        max={topicYearMaxBound}
                                        value={topicYearLowerBound}
                                        onChange={(event) => {
                                          const value = Number.parseInt(event.target.value, 10);
                                          if (!Number.isFinite(value)) {
                                            return;
                                          }
                                          const clamped = Math.max(topicYearMinBound, Math.min(value, topicFormYearEnd));
                                          setTopicFormYearStart(clamped);
                                        }}
                                      />
                                      <div
                                        className="topic-year-range-sliders"
                                        role="group"
                                        aria-label="年份范围滑动选择"
                                        style={topicYearRangeTrackStyle}
                                      >
                                        <input
                                          type="range"
                                          min={topicYearMinBound}
                                          max={topicYearMaxBound}
                                          value={topicFormYearStart}
                                          className="topic-year-slider topic-year-slider-start"
                                          onChange={(event) => {
                                            const value = Number.parseInt(event.target.value, 10);
                                            if (!Number.isFinite(value)) {
                                              return;
                                            }
                                            setTopicFormYearStart(Math.min(value, topicFormYearEnd));
                                          }}
                                        />
                                        <input
                                          type="range"
                                          min={topicYearMinBound}
                                          max={topicYearMaxBound}
                                          value={topicFormYearEnd}
                                          className="topic-year-slider topic-year-slider-end"
                                          onChange={(event) => {
                                            const value = Number.parseInt(event.target.value, 10);
                                            if (!Number.isFinite(value)) {
                                              return;
                                            }
                                            setTopicFormYearEnd(Math.max(value, topicFormYearStart));
                                          }}
                                        />
                                      </div>
                                      <input
                                        className="topic-year-bound-input"
                                        type="number"
                                        min={topicYearMinBound}
                                        max={topicYearMaxBound}
                                        value={topicYearUpperBound}
                                        onChange={(event) => {
                                          const value = Number.parseInt(event.target.value, 10);
                                          if (!Number.isFinite(value)) {
                                            return;
                                          }
                                          const clamped = Math.min(topicYearMaxBound, Math.max(value, topicFormYearStart));
                                          setTopicFormYearEnd(clamped);
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                              </section>

                              <section className="topic-modal-section">
                                <div className="topic-modal-grid topic-modal-grid-run">
                                  <div className="topic-run-column">
                                    <h4 className="topic-modal-section-title">运行方式</h4>
                                    <div className="topic-run-mode-card">
                                      <label className="auto-pull-source-toggle topic-active-toggle">
                                        <input
                                          type="checkbox"
                                          checked={topicFormIsActive}
                                          onChange={(event) => setTopicFormIsActive(event.target.checked)}
                                        />
                                        参与自动检索
                                      </label>
                                      <p data-ui="text" data-variant="caption" data-tone="muted" className="topic-form-helper">
                                        勾选后主题会参与规则检索。取消勾选时，规则继续运行，但会跳过该主题。
                                      </p>
                                    </div>
                                  </div>

                                  <div className="topic-rule-binding-column">
                                    <h4 className="topic-modal-section-title">规则绑定</h4>
                                    <div className="topic-rule-binding-card">
                                      {topicScopedRules.length === 0 ? (
                                        <div className="topic-rule-empty-state">
                                          <span className="topic-rule-empty-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" focusable="false">
                                              <path d="M12 2 4 6v5c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4Z" />
                                              <rect x="9" y="10.2" width="6" height="4.6" rx="0.9" />
                                              <path d="M10.2 10.2v-1.1a1.8 1.8 0 1 1 3.6 0v1.1" />
                                            </svg>
                                          </span>
                                          <p data-ui="text" data-variant="caption" data-tone="muted">
                                            暂无可绑定规则，请先到规则中心创建规则
                                          </p>
                                          <button
                                            data-ui="button"
                                            data-variant="secondary"
                                            data-size="sm"
                                            type="button"
                                            className="topic-rule-empty-action"
                                            onClick={() => {
                                              setTopicFormModalOpen(false);
                                              setTopicVenuePickerOpen(false);
                                              setAutoImportSubTab('rules-center');
                                            }}
                                          >
                                            去规则中心创建规则
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="topic-rule-binding-header">
                                            <button
                                              data-ui="button"
                                              data-variant="ghost"
                                              data-size="sm"
                                              type="button"
                                              onClick={() => {
                                                setTopicFormModalOpen(false);
                                                setTopicVenuePickerOpen(false);
                                                setAutoImportSubTab('rules-center');
                                              }}
                                            >
                                              创建规则
                                            </button>
                                          </div>
                                          <div className="topic-rule-selector-list">
                                            {topicScopedRules.map((rule) => (
                                              <label key={rule.rule_id} className="auto-pull-source-toggle">
                                                <input
                                                  type="checkbox"
                                                  checked={topicFormRuleIds.includes(rule.rule_id)}
                                                  onChange={() => handleToggleTopicRuleSelection(rule.rule_id)}
                                                />
                                                {rule.name}
                                              </label>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </section>

                              <footer className="topic-modal-footer">
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={handleCloseTopicModal}
                                >
                                  取消
                                </button>
                                <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={handleSubmitTopicProfile}>
                                  {topicEditingId ? '更新主题' : '创建主题'}
                                </button>
                              </footer>
                            </section>
                          </div>
                        ) : null}
                      </section>
                    ) : null}

                    {autoImportSubTab === 'rules-center' ? (
                      <section className="literature-section-block">
                        <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-filter-toolbar">
                          <label data-ui="field">
                            <span data-slot="label">Scope 过滤</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={ruleFilterScope}
                              onChange={(event) => setRuleFilterScope(event.target.value as '' | AutoPullScope)}
                            >
                              <option value="">全部</option>
                              <option value="GLOBAL">GLOBAL</option>
                              <option value="TOPIC">TOPIC</option>
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">状态过滤</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={ruleFilterStatus}
                              onChange={(event) => setRuleFilterStatus(event.target.value as '' | AutoPullRuleStatus)}
                            >
                              <option value="">全部</option>
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="PAUSED">PAUSED</option>
                            </select>
                          </label>
                          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void loadAutoPullRules()}>
                            刷新规则
                          </button>
                        </div>

                        <div data-ui="grid" data-cols="2" data-gap="2">
                          <label data-ui="field">
                            <span data-slot="label">Scope</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={ruleFormScope}
                              onChange={(event) => setRuleFormScope(event.target.value as AutoPullScope)}
                            >
                              <option value="GLOBAL">GLOBAL</option>
                              <option value="TOPIC">TOPIC</option>
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">绑定主题（TOPIC 规则，逗号/换行）</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormTopicIdsInput}
                              onChange={(event) => setRuleFormTopicIdsInput(event.target.value)}
                              placeholder="例如 TOPIC-001, TOPIC-002"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">规则名称</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormName}
                              onChange={(event) => setRuleFormName(event.target.value)}
                              placeholder="例如 每日增量拉取"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">每源最大结果数</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormMaxResultsInput}
                              onChange={(event) => setRuleFormMaxResultsInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">Include 关键词</span>
                            <textarea
                              data-ui="textarea"
                              value={ruleFormIncludeInput}
                              onChange={(event) => setRuleFormIncludeInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">Exclude 关键词</span>
                            <textarea
                              data-ui="textarea"
                              value={ruleFormExcludeInput}
                              onChange={(event) => setRuleFormExcludeInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">作者关键词</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormAuthorsInput}
                              onChange={(event) => setRuleFormAuthorsInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">期刊/会议关键词</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormVenuesInput}
                              onChange={(event) => setRuleFormVenuesInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">滚动窗口（天）</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormLookbackInput}
                              onChange={(event) => setRuleFormLookbackInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">质量门最小完整度（0-1）</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormMinCompletenessInput}
                              onChange={(event) => setRuleFormMinCompletenessInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">最小年份</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormMinYearInput}
                              onChange={(event) => setRuleFormMinYearInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">最大年份</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormMaxYearInput}
                              onChange={(event) => setRuleFormMaxYearInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">频率</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={ruleFormFrequency}
                              onChange={(event) => setRuleFormFrequency(event.target.value as AutoPullFrequency)}
                            >
                              <option value="DAILY">DAILY</option>
                              <option value="WEEKLY">WEEKLY</option>
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">星期（WEEKLY）</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormDaysInput}
                              onChange={(event) => setRuleFormDaysInput(event.target.value)}
                              placeholder="MON,TUE"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">小时</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormHourInput}
                              onChange={(event) => setRuleFormHourInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">分钟</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormMinuteInput}
                              onChange={(event) => setRuleFormMinuteInput(event.target.value)}
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">时区</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={ruleFormTimezone}
                              onChange={(event) => setRuleFormTimezone(event.target.value)}
                            />
                          </label>
                        </div>
                        <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                          <label className="auto-pull-source-toggle">
                            <input type="checkbox" checked={ruleSourceCrossref} onChange={(event) => setRuleSourceCrossref(event.target.checked)} />
                            CROSSREF
                          </label>
                          <label className="auto-pull-source-toggle">
                            <input type="checkbox" checked={ruleSourceArxiv} onChange={(event) => setRuleSourceArxiv(event.target.checked)} />
                            ARXIV
                          </label>
                          <label className="auto-pull-source-toggle">
                            <input type="checkbox" checked={ruleSourceZotero} onChange={(event) => setRuleSourceZotero(event.target.checked)} />
                            ZOTERO
                          </label>
                          <label className="auto-pull-source-toggle">
                            <input
                              type="checkbox"
                              checked={ruleFormRequireIncludeMatch}
                              onChange={(event) => setRuleFormRequireIncludeMatch(event.target.checked)}
                            />
                            命中 Include 才通过
                          </label>
                        </div>
                        {ruleSourceZotero ? (
                          <div data-ui="grid" data-cols="2" data-gap="2">
                            <label data-ui="field">
                              <span data-slot="label">Zotero Library Type</span>
                              <select
                                data-ui="select"
                                data-size="sm"
                                value={ruleSourceZoteroLibraryType}
                                onChange={(event) => setRuleSourceZoteroLibraryType(event.target.value as 'users' | 'groups')}
                              >
                                <option value="users">users</option>
                                <option value="groups">groups</option>
                              </select>
                            </label>
                            <label data-ui="field">
                              <span data-slot="label">Zotero Library ID</span>
                              <input
                                data-ui="input"
                                data-size="sm"
                                value={ruleSourceZoteroLibraryId}
                                onChange={(event) => setRuleSourceZoteroLibraryId(event.target.value)}
                              />
                            </label>
                            <label data-ui="field">
                              <span data-slot="label">Zotero API Key（可选）</span>
                              <input
                                data-ui="input"
                                data-size="sm"
                                type="password"
                                value={ruleSourceZoteroApiKey}
                                onChange={(event) => setRuleSourceZoteroApiKey(event.target.value)}
                              />
                            </label>
                          </div>
                        ) : null}
                        <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                          <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={handleSubmitRule}>
                            {ruleEditingId ? '更新规则' : '创建规则'}
                          </button>
                          <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={resetRuleForm}>
                            清空表单
                          </button>
                        </div>
                        {rulesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{rulesError}</p> : null}

                        <p data-ui="text" data-variant="caption" data-tone="muted">全局规则</p>
                        <div className="literature-list">
                          {autoPullRules.filter((rule) => rule.scope === 'GLOBAL').length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无全局规则。</p>
                          ) : (
                            autoPullRules
                              .filter((rule) => rule.scope === 'GLOBAL')
                              .map((rule) => (
                                <div key={rule.rule_id} className="literature-list-item">
                                  <div>
                                    <p data-ui="text" data-variant="body" data-tone="primary">{rule.name}</p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      {rule.status} · topics:{rule.topic_ids.length} · sources:{rule.sources.filter((source) => source.enabled).length}
                                    </p>
                                  </div>
                                  <div data-ui="toolbar" data-gap="2">
                                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => handleEditRule(rule)}>编辑</button>
                                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => void handleToggleRuleStatus(rule)}>
                                      {rule.status === 'ACTIVE' ? '暂停' : '启用'}
                                    </button>
                                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void handleRunRuleNow(rule.rule_id)}>立即运行</button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>

                        <p data-ui="text" data-variant="caption" data-tone="muted">Topic 规则</p>
                        <div className="literature-list">
                          {autoPullRules.filter((rule) => rule.scope === 'TOPIC').length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无 Topic 规则。</p>
                          ) : (
                            autoPullRules
                              .filter((rule) => rule.scope === 'TOPIC')
                              .map((rule) => (
                                <div key={rule.rule_id} className="literature-list-item">
                                  <div>
                                    <p data-ui="text" data-variant="body" data-tone="primary">
                                      {rule.name} · {rule.topic_ids.length > 0 ? rule.topic_ids.join(', ') : '--'}
                                    </p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      {rule.status} · sources:{rule.sources.filter((source) => source.enabled).length}
                                    </p>
                                  </div>
                                  <div data-ui="toolbar" data-gap="2">
                                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => handleEditRule(rule)}>编辑</button>
                                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => void handleToggleRuleStatus(rule)}>
                                      {rule.status === 'ACTIVE' ? '暂停' : '启用'}
                                    </button>
                                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void handleRunRuleNow(rule.rule_id)}>立即运行</button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </section>
                    ) : null}

                    {autoImportSubTab === 'runs-alerts' ? (
                      <section className="literature-section-block">
                        <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-filter-toolbar">
                          <label data-ui="field">
                            <span data-slot="label">Run Rule 过滤</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={runsFilterRuleId}
                              onChange={(event) => setRunsFilterRuleId(event.target.value)}
                              placeholder="rule_id"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">Run 状态</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={runsFilterStatus}
                              onChange={(event) => setRunsFilterStatus(event.target.value as '' | AutoPullRunStatus)}
                            >
                              <option value="">全部</option>
                              <option value="PENDING">PENDING</option>
                              <option value="RUNNING">RUNNING</option>
                              <option value="PARTIAL">PARTIAL</option>
                              <option value="SUCCESS">SUCCESS</option>
                              <option value="FAILED">FAILED</option>
                              <option value="SKIPPED">SKIPPED</option>
                            </select>
                          </label>
                          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void loadAutoPullRuns()}>
                            刷新 Run
                          </button>
                        </div>
                        {runsError ? <p data-ui="text" data-variant="caption" data-tone="danger">{runsError}</p> : null}
                        <div className="literature-list">
                          {autoPullRuns.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无运行记录。</p>
                          ) : (
                            autoPullRuns.map((run) => (
                              <div key={run.run_id} className="literature-list-item">
                                <div>
                                  <p data-ui="text" data-variant="body" data-tone="primary">
                                    {run.run_id} · {run.status}
                                  </p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">
                                    {run.trigger_type} · duration:{formatRunDuration(run.started_at, run.finished_at)} · imported:{String(run.summary.imported_count ?? 0)} · failed:{String(run.summary.failed_count ?? 0)}
                                  </p>
                                </div>
                                <div data-ui="toolbar" data-gap="2">
                                  <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => void loadAutoPullRunDetail(run.run_id)}>
                                    详情
                                  </button>
                                  <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void handleRetryRun(run.run_id)}>
                                    重试失败源
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {runDetailLoading ? (
                          <p data-ui="text" data-variant="caption" data-tone="muted">加载运行详情中...</p>
                        ) : null}
                        {runDetailError ? (
                          <p data-ui="text" data-variant="caption" data-tone="danger">{runDetailError}</p>
                        ) : null}
                        {selectedRunDetail ? (
                          <div className="auto-pull-run-detail">
                            <p data-ui="text" data-variant="caption" data-tone="muted">
                              运行详情：{selectedRunDetail.run_id} · {selectedRunDetail.status}
                            </p>
                            <div className="literature-list">
                              {(selectedRunDetail.source_attempts ?? []).map((attempt) => (
                                <div key={`${selectedRunDetail.run_id}-${attempt.source}`} className="literature-list-item">
                                  <div>
                                    <p data-ui="text" data-variant="body" data-tone="primary">
                                      {attempt.source} · {attempt.status}
                                    </p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      fetched:{attempt.fetched_count} / imported:{attempt.imported_count} / failed:{attempt.failed_count}
                                    </p>
                                  </div>
                                  {attempt.error_message ? (
                                    <p data-ui="text" data-variant="caption" data-tone="danger">{attempt.error_message}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-filter-toolbar">
                          <label data-ui="field">
                            <span data-slot="label">Alert Rule 过滤</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={alertsFilterRuleId}
                              onChange={(event) => setAlertsFilterRuleId(event.target.value)}
                              placeholder="rule_id"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">Alert 级别</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={alertsFilterLevel}
                              onChange={(event) => setAlertsFilterLevel(event.target.value as '' | AutoPullAlertLevel)}
                            >
                              <option value="">全部</option>
                              <option value="WARNING">WARNING</option>
                              <option value="ERROR">ERROR</option>
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">确认状态</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={alertsFilterAcked}
                              onChange={(event) => setAlertsFilterAcked(event.target.value as 'all' | 'acked' | 'unacked')}
                            >
                              <option value="all">全部</option>
                              <option value="unacked">仅未确认</option>
                              <option value="acked">仅已确认</option>
                            </select>
                          </label>
                          <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void loadAutoPullAlerts()}>
                            刷新 Alert
                          </button>
                        </div>
                        {alertsError ? <p data-ui="text" data-variant="caption" data-tone="danger">{alertsError}</p> : null}
                        <div className="literature-list">
                          {autoPullAlerts.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无告警。</p>
                          ) : (
                            autoPullAlerts.map((alert) => (
                              <div key={alert.alert_id} className="literature-list-item">
                                <div>
                                  <p data-ui="text" data-variant="body" data-tone={alert.level === 'ERROR' ? 'danger' : 'primary'}>
                                    {alert.level} · {alert.code}
                                  </p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">
                                    {alert.message}
                                  </p>
                                </div>
                                <div data-ui="toolbar" data-gap="2">
                                  <span data-ui="badge" data-variant="subtle" data-tone={alert.ack_at ? 'neutral' : 'warning'}>
                                    {alert.ack_at ? '已确认' : '未确认'}
                                  </span>
                                  {!alert.ack_at ? (
                                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => void handleAckAlert(alert.alert_id)}>
                                      关闭
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    ) : null}
                  </section>
                ) : null}

                {activeLiteratureTab === 'manual-import' ? (
                  <section className="literature-tab-panel">
                    <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                      <p data-ui="text" data-variant="label" data-tone="secondary">手动导入（文件上传 + 文献库联动）</p>
                      <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                        <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                          文件：{formatUiOperationStatus(manualUploadStatus)}
                        </span>
                        <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                          Zotero：{formatUiOperationStatus(zoteroStatus)}
                        </span>
                      </div>
                    </div>
                    <section className="literature-section-block">
                      <p data-ui="text" data-variant="caption" data-tone="muted">导入默认参数</p>
                      <div data-ui="grid" data-cols="2" data-gap="2" className="literature-defaults-grid">
                        <label data-ui="field">
                          <span data-slot="label">默认分类标签（逗号分隔）</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={batchTagsInput}
                            onChange={(event) => setBatchTagsInput(event.target.value)}
                            placeholder="例如：survey, baseline, method:nlp"
                          />
                        </label>
                        <label data-ui="field">
                          <span data-slot="label">范围变更原因（可选）</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={scopeReasonInput}
                            onChange={(event) => setScopeReasonInput(event.target.value)}
                            placeholder="例如：选题核心相关"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="literature-section-block">
                      <p data-ui="text" data-variant="label" data-tone="secondary">A) 文件上传导入</p>
                      <label data-ui="field">
                        <span data-slot="label">上传文件（JSON / CSV / BibTeX）</span>
                        <input
                          data-ui="input"
                          type="file"
                          accept=".json,.csv,.bib,.bibtex,.txt"
                          onChange={handleManualUpload}
                        />
                      </label>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        {manualUploadLoading ? '文件解析与导入中...' : '上传后自动解析并导入到当前 Topic。'}
                      </p>
                      {manualUploadError ? (
                        <p data-ui="text" data-variant="caption" data-tone="danger">
                          {manualUploadError}（恢复动作：修复文件格式后重新上传）
                        </p>
                      ) : null}
                    </section>

                    <section className="literature-section-block">
                      <p data-ui="text" data-variant="label" data-tone="secondary">B) 文献库联动（Zotero）</p>
                      <div data-ui="grid" data-cols="2" data-gap="2" className="zotero-fields-grid">
                        <label data-ui="field">
                          <span data-slot="label">Library Type</span>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={zoteroLibraryType}
                            onChange={(event) => setZoteroLibraryType(event.target.value as 'users' | 'groups')}
                          >
                            <option value="users">users</option>
                            <option value="groups">groups</option>
                          </select>
                        </label>
                        <label data-ui="field">
                          <span data-slot="label">Library ID</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={zoteroLibraryId}
                            onChange={(event) => setZoteroLibraryId(event.target.value)}
                            placeholder="例如 123456"
                          />
                        </label>
                        <label data-ui="field">
                          <span data-slot="label">API Key（可选）</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            type="password"
                            value={zoteroApiKey}
                            onChange={(event) => setZoteroApiKey(event.target.value)}
                            placeholder="公开库可留空"
                          />
                        </label>
                        <label data-ui="field">
                          <span data-slot="label">Limit</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={zoteroLimitInput}
                            onChange={(event) => setZoteroLimitInput(event.target.value)}
                            placeholder="20"
                          />
                        </label>
                      </div>
                      <label data-ui="field">
                        <span data-slot="label">查询关键词（可选）</span>
                        <input
                          data-ui="input"
                          data-size="sm"
                          value={zoteroQuery}
                          onChange={(event) => setZoteroQuery(event.target.value)}
                          placeholder="例如 retrieval evaluation"
                        />
                      </label>
                      <button
                        data-ui="button"
                        data-variant="secondary"
                        data-size="sm"
                        type="button"
                        onClick={handleImportFromZotero}
                      >
                        {zoteroLoading ? '同步中...' : '从 Zotero 同步导入'}
                      </button>
                      {zoteroError ? <p data-ui="text" data-variant="caption" data-tone="danger">{zoteroError}</p> : null}
                    </section>
                  </section>
                ) : null}

                {activeLiteratureTab === 'overview' ? (
                  <section className="literature-overview-panel">
                    <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                      <p data-ui="text" data-variant="label" data-tone="secondary">综览与分类工作台（高级查询 + 元数据）</p>
                      <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                        <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                          查询状态：{formatUiOperationStatus(queryStatus)}
                        </span>
                        <button
                          data-ui="button"
                          data-variant="secondary"
                          data-size="sm"
                          type="button"
                          onClick={() => void loadLiteratureOverview(topicId, paperId)}
                        >
                          刷新综览
                        </button>
                        <button
                          data-ui="button"
                          data-variant="secondary"
                          data-size="sm"
                          type="button"
                          onClick={handleSyncPaperFromTopic}
                        >
                          同步到论文管理
                        </button>
                      </div>
                    </div>

                    <section className="literature-query-builder">
                      <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-filter-toolbar">
                        <label data-ui="field">
                          <span data-slot="label">Topic 筛选（可选）</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={topicIdInput}
                            onChange={(event) => setTopicIdInput(event.target.value)}
                            placeholder="例如 TOPIC-001"
                          />
                        </label>
                        <label data-ui="field">
                          <span data-slot="label">Paper 筛选（可选）</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={paperIdInput}
                            onChange={(event) => setPaperIdInput(event.target.value)}
                            placeholder="例如 P001"
                          />
                        </label>
                        <button
                          data-ui="button"
                          data-variant="secondary"
                          data-size="sm"
                          type="button"
                          onClick={handleApplyLiteratureFilters}
                        >
                          应用筛选
                        </button>
                        <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                          当前筛选 Topic: {topicId || '全部'}
                        </span>
                        <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                          当前筛选 Paper: {paperId || '全部'}
                        </span>
                      </div>
                      <div data-ui="toolbar" data-wrap="wrap" data-gap="2">
                        <label data-ui="field">
                          <span data-slot="label">条件逻辑</span>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={queryGroup.logic}
                            onChange={(event) =>
                              setQueryGroup((current) => ({ ...current, logic: event.target.value as QueryLogic }))
                            }
                          >
                            <option value="AND">AND（全部满足）</option>
                            <option value="OR">OR（满足其一）</option>
                          </select>
                        </label>
                        <label data-ui="field">
                          <span data-slot="label">默认排序</span>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={querySort}
                            onChange={(event) => setQuerySort(event.target.value as QuerySort)}
                          >
                            {querySortOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleAddQueryCondition}>
                          新增条件
                        </button>
                      </div>

                      <div className="literature-query-conditions">
                        {queryGroup.conditions.map((condition) => (
                          <div key={condition.id} className="literature-query-row">
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={condition.field}
                              onChange={(event) =>
                                handleUpdateQueryCondition(condition.id, { field: event.target.value as QueryField })
                              }
                            >
                              {queryFieldOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={condition.operator}
                              onChange={(event) =>
                                handleUpdateQueryCondition(condition.id, { operator: event.target.value as QueryOperator })
                              }
                            >
                              {queryOperatorOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {queryOperatorNeedsValue(condition.operator) ? (
                              <input
                                data-ui="input"
                                data-size="sm"
                                value={condition.value}
                                onChange={(event) =>
                                  handleUpdateQueryCondition(condition.id, { value: event.target.value })
                                }
                                placeholder="输入比较值"
                              />
                            ) : (
                              <span data-ui="badge" data-variant="subtle" data-tone="neutral">无需输入值</span>
                            )}
                            <button
                              data-ui="button"
                              data-variant="ghost"
                              data-size="sm"
                              type="button"
                              onClick={() => handleRemoveQueryCondition(condition.id)}
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>

                      <div data-ui="toolbar" data-wrap="wrap" data-gap="2">
                        <input
                          data-ui="input"
                          data-size="sm"
                          value={queryPresetNameInput}
                          onChange={(event) => setQueryPresetNameInput(event.target.value)}
                          placeholder="保存查询名称"
                        />
                        <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleSaveQueryPreset}>
                          保存查询
                        </button>
                        <select
                          data-ui="select"
                          data-size="sm"
                          value={selectedPresetId}
                          onChange={(event) => setSelectedPresetId(event.target.value)}
                        >
                          <option value="">选择已保存查询</option>
                          {savedQueryPresets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.name}
                            </option>
                          ))}
                        </select>
                        <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleApplySelectedPreset}>
                          应用已保存查询
                        </button>
                        <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleDeleteSelectedPreset}>
                          删除已保存查询
                        </button>
                        <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleResetAdvancedQuery}>
                          重置条件
                        </button>
                        <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={handleApplyAdvancedQuery}>
                          应用高级查询
                        </button>
                      </div>
                      {queryError ? <p data-ui="text" data-variant="caption" data-tone="danger">{queryError}</p> : null}
                    </section>

                    {topicScopeError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicScopeError}</p> : null}
                    {overviewPanel.status === 'loading' ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">正在加载综览...</p>
                    ) : null}
                    {overviewPanel.status === 'error' ? (
                      <p data-ui="text" data-variant="caption" data-tone="danger">{overviewPanel.error ?? '综览加载失败。'}</p>
                    ) : null}

                    <div className="literature-overview-summary-strip">
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        总文献 <strong>{overviewPanel.data.summary.total_literatures}</strong>
                      </span>
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        In Scope <strong>{overviewPanel.data.summary.in_scope_count}</strong>
                      </span>
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        Cited <strong>{overviewPanel.data.summary.cited_count}</strong>
                      </span>
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        Top Tags <strong>{overviewPanel.data.summary.top_tags.slice(0, 2).map((tag) => tag.tag).join(' / ') || '--'}</strong>
                      </span>
                    </div>

                    <section data-ui="grid" data-cols="2" data-gap="3" className="literature-panels">
                      <article className="literature-panel">
                        <p data-ui="text" data-variant="label" data-tone="secondary">选题范围（快速维护）</p>
                        {topicScopeLoading ? (
                          <p data-ui="text" data-variant="caption" data-tone="muted">正在加载选题范围...</p>
                        ) : (
                          <div className="literature-list">
                            {topicScopeItems.length === 0 ? (
                              <p data-ui="text" data-variant="caption" data-tone="muted">当前选题暂无文献范围。</p>
                            ) : (
                              topicScopeItems.map((item) => (
                                <div key={item.scope_id} className="literature-list-item">
                                  <div>
                                    <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      {item.scope_status} · {formatTimestamp(item.updated_at)}
                                    </p>
                                  </div>
                                  <div data-ui="toolbar" data-wrap="nowrap" className="scope-actions">
                                    <button
                                      data-ui="button"
                                      data-variant="ghost"
                                      data-size="sm"
                                      type="button"
                                      onClick={() => handleScopeStatusChange(item.literature_id, 'in_scope')}
                                    >
                                      保留
                                    </button>
                                    <button
                                      data-ui="button"
                                      data-variant="ghost"
                                      data-size="sm"
                                      type="button"
                                      onClick={() => handleScopeStatusChange(item.literature_id, 'excluded')}
                                    >
                                      排除
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </article>

                      <article className="literature-panel">
                        <p data-ui="text" data-variant="label" data-tone="secondary">查询结果列表（行内关键信息 + 快速操作）</p>
                        <div className="literature-overview-list">
                          {overviewResultItems.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无可展示文献，请先导入或调整查询。</p>
                          ) : (
                            overviewResultItems.map((item) => {
                              const draft = metadataDrafts[item.literature_id] ?? {
                                tagsInput: item.tags.join(', '),
                                rightsClass: item.rights_class,
                              };

                              return (
                                <div key={item.literature_id} className="literature-overview-row">
                                  <div className="literature-overview-main">
                                    <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      作者: {item.authors.join(', ') || '--'} · 年份: {item.year ?? '--'} · provider:{' '}
                                      {item.providers.join(', ') || '--'}
                                    </p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      scope: {item.topic_scope_status ?? '--'} · citation: {item.citation_status ?? '--'} · tags:{' '}
                                      {item.tags.join(', ') || '--'}
                                    </p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      doi: {item.doi ?? '--'} · arxiv: {item.arxiv_id ?? '--'}
                                    </p>
                                    <div data-ui="toolbar" data-wrap="wrap" data-gap="2">
                                      <button
                                        data-ui="button"
                                        data-variant="ghost"
                                        data-size="sm"
                                        type="button"
                                        onClick={() => handleScopeStatusChange(item.literature_id, 'in_scope')}
                                      >
                                        保留到范围
                                      </button>
                                      <button
                                        data-ui="button"
                                        data-variant="ghost"
                                        data-size="sm"
                                        type="button"
                                        onClick={() => handleScopeStatusChange(item.literature_id, 'excluded')}
                                      >
                                        从范围排除
                                      </button>
                                      {item.source_url ? (
                                        <a className="literature-source-link" href={item.source_url} target="_blank" rel="noreferrer">
                                          来源链接
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="literature-metadata-editor">
                                    <input
                                      data-ui="input"
                                      data-size="sm"
                                      value={draft.tagsInput}
                                      onChange={(event) =>
                                        handleChangeMetadataDraft(item.literature_id, 'tagsInput', event.target.value)
                                      }
                                      placeholder="标签：survey, baseline, method:nlp"
                                    />
                                    <select
                                      data-ui="select"
                                      data-size="sm"
                                      value={draft.rightsClass}
                                      onChange={(event) =>
                                        handleChangeMetadataDraft(item.literature_id, 'rightsClass', event.target.value)
                                      }
                                    >
                                      {rightsClassOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      data-ui="button"
                                      data-variant="ghost"
                                      data-size="sm"
                                      type="button"
                                      disabled={Boolean(metadataSavingIds[item.literature_id])}
                                      onClick={() => handleSaveMetadata(item.literature_id)}
                                    >
                                      {metadataSavingIds[item.literature_id] ? '保存中...' : '保存元数据'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </article>
                    </section>
                  </section>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeModule === '论文管理' ? (
            <section className="module-dashboard paper-literature-workspace">
              <div data-ui="stack" data-direction="col" data-gap="3">
                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <p data-ui="text" data-variant="h3" data-tone="primary">论文管理文献集合</p>
                  <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">Paper: {paperId}</span>
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">Topic: {topicId}</span>
                  </div>
                </div>
                <div data-ui="toolbar" data-wrap="wrap">
                  <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleSyncPaperFromTopic}>
                    从选题范围带入论文
                  </button>
                  <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => loadPaperLiterature(paperId)}>
                    刷新论文文献
                  </button>
                </div>
                {paperLiteratureError ? (
                  <p data-ui="text" data-variant="caption" data-tone="danger">{paperLiteratureError}</p>
                ) : null}
                {literatureActionMessage ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">{literatureActionMessage}</p>
                ) : null}
                {paperLiteratureLoading ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">正在加载论文文献...</p>
                ) : (
                  <div className="paper-literature-table">
                    {paperLiteratureItems.length === 0 ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">当前论文暂无文献。</p>
                    ) : (
                      paperLiteratureItems.map((item) => (
                        <div key={item.link_id} className="paper-literature-row">
                          <div>
                            <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                            <p data-ui="text" data-variant="caption" data-tone="muted">
                              {item.source_provider ?? '--'} · {item.source_url ?? '--'}
                            </p>
                          </div>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={item.citation_status}
                            onChange={(event) =>
                              handleUpdateCitationStatus(item.link_id, event.target.value as CitationStatus)
                            }
                          >
                            {citationStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeModule === '写作中心' ? (
            <section className="module-dashboard writing-literature-workspace">
              <p data-ui="text" data-variant="h3" data-tone="primary">写作中心引用视图（只读）</p>
              <p data-ui="text" data-variant="caption" data-tone="muted">
                当前为 M0 单向联动：引用状态由论文管理维护，写作中心仅消费展示。
              </p>
              <div className="writing-citation-list">
                {paperLiteratureItems.length === 0 ? (
                  <p data-ui="text" data-variant="caption" data-tone="muted">暂无可用引用。</p>
                ) : (
                  paperLiteratureItems.map((item) => (
                    <div key={item.link_id} className="writing-citation-item">
                      <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                      <p data-ui="text" data-variant="caption" data-tone="muted">
                        status: {item.citation_status} · doi: {item.doi ?? '--'} · arxiv: {item.arxiv_id ?? '--'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {governanceEnabled ? (
            <section data-ui="stack" data-direction="col" data-gap="4" className="governance-zone">
              <article className="dashboard-toolbar governance-controls">
                <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                  <div data-ui="stack" data-direction="row" data-gap="3" data-align="end" data-wrap="wrap" className="governance-controls-left">
                    <label data-ui="field" className="paper-id-field">
                      <span data-slot="label">Paper ID</span>
                      <input
                        data-ui="input"
                        data-size="sm"
                        value={paperIdInput}
                        onChange={(event) => setPaperIdInput(event.target.value)}
                        placeholder="例如 P001"
                      />
                    </label>
                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleApplyPaperId}>
                      加载项目
                    </button>
                    <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleRefreshPanels}>
                      刷新
                    </button>
                  </div>
                  <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">project: {paperId}</span>
                    <span data-ui="badge" data-variant="subtle" data-tone="neutral">api: {defaultApiBaseUrl}</span>
                    <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleToggleGovernance}>
                      关闭面板
                    </button>
                  </div>
                </div>
              </article>

              <section data-ui="grid" data-cols="2" data-gap="4" className="governance-panels">
                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Timeline</p>
                    {timelinePanel.status === 'loading' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">正在加载 timeline...</p>
                    )}
                    {timelinePanel.status === 'error' && (
                      <p data-ui="text" data-variant="body" data-tone="danger">{timelinePanel.error ?? 'timeline 加载失败。'}</p>
                    )}
                    {timelinePanel.status === 'empty' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">暂无 timeline 事件。</p>
                    )}
                    {(timelinePanel.status === 'ready' || timelinePanel.status === 'idle') && timelinePanel.data.length > 0 && (
                      <div data-ui="list" data-variant="rows" data-density="comfortable" className="timeline-list">
                        {timelinePanel.data.map((event) => {
                          const snapshotId = tryGetSnapshotId(event.summary);
                          return (
                            <div key={event.event_id} className="timeline-item">
                              <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                                <p data-ui="text" data-variant="label" data-tone="secondary">{event.event_type}</p>
                                <p data-ui="text" data-variant="caption" data-tone="muted">{formatTimestamp(event.timestamp)}</p>
                              </div>
                              <p data-ui="text" data-variant="body" data-tone="primary">{event.summary}</p>
                              <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
                                {event.node_id ? (
                                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">node:{event.node_id}</span>
                                ) : null}
                                {snapshotId ? (
                                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">snapshot:{snapshotId}</span>
                                ) : null}
                                {event.module_id ? (
                                  <span data-ui="badge" data-variant="subtle" data-tone="neutral">module:{event.module_id}</span>
                                ) : null}
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => handleEvidenceTrace(event)}
                                >
                                  证据链
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>

                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Runtime Metrics</p>
                    {metricsPanel.status === 'loading' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">正在计算运行指标...</p>
                    )}
                    {metricsPanel.status === 'error' && (
                      <p data-ui="text" data-variant="body" data-tone="danger">{metricsPanel.error ?? '指标加载失败。'}</p>
                    )}
                    {(metricsPanel.status === 'ready' || metricsPanel.status === 'empty' || metricsPanel.status === 'idle') && (
                      <div data-ui="grid" data-cols="2" data-gap="3" className="runtime-metrics-grid">
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">Tokens</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.tokens)}</p>
                        </article>
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">Cost (USD)</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatCurrency(metricsPanel.data.cost_usd)}</p>
                        </article>
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">GPU Requested</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_requested)}</p>
                        </article>
                        <article className="runtime-metric-item">
                          <p data-ui="text" data-variant="label" data-tone="muted">GPU Total</p>
                          <p data-ui="text" data-variant="h3" data-tone="primary">{formatNumber(metricsPanel.data.gpu_total)}</p>
                        </article>
                      </div>
                    )}
                    <p data-ui="text" data-variant="caption" data-tone="muted">
                      updated at: {formatTimestamp(metricsPanel.data.updated_at)}
                    </p>
                  </div>
                </article>

                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Artifact Bundle</p>
                    {artifactPanel.status === 'loading' && (
                      <p data-ui="text" data-variant="body" data-tone="muted">正在加载 artifact bundle...</p>
                    )}
                    {artifactPanel.status === 'error' && (
                      <p data-ui="text" data-variant="body" data-tone="danger">{artifactPanel.error ?? 'artifact 加载失败。'}</p>
                    )}
                    {(artifactPanel.status === 'ready' || artifactPanel.status === 'empty' || artifactPanel.status === 'idle') && (
                      <div data-ui="list" data-variant="rows" data-density="comfortable">
                        {[
                          ['proposal', artifactPanel.data.proposal_url],
                          ['paper', artifactPanel.data.paper_url],
                          ['repo', artifactPanel.data.repo_url],
                          ['review', artifactPanel.data.review_url],
                        ].map(([key, url]) => (
                          <div key={key} className="artifact-row">
                            <p data-ui="text" data-variant="label" data-tone="secondary">{key}</p>
                            {url ? (
                              <a data-ui="link" href={url} target="_blank" rel="noreferrer">{url}</a>
                            ) : (
                              <span data-ui="badge" data-variant="subtle" data-tone="neutral">pending</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>

                <article className="dashboard-subpanel governance-panel">
                  <div data-ui="stack" data-direction="col" data-gap="3">
                    <p data-ui="text" data-variant="h3" data-tone="primary">Release Review Queue</p>
                    {releaseQueue.length === 0 ? (
                      <p data-ui="text" data-variant="body" data-tone="muted">暂无待展示的审查事件。</p>
                    ) : (
                      <div data-ui="list" data-variant="rows" data-density="comfortable" className="review-queue-list">
                        {releaseQueue.map((event) => (
                          <div key={event.event_id}>
                            <p data-ui="text" data-variant="label" data-tone="secondary">{event.event_type}</p>
                            <p data-ui="text" data-variant="body" data-tone="primary">{event.summary}</p>
                            <p data-ui="text" data-variant="caption" data-tone="muted">{formatTimestamp(event.timestamp)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <form data-ui="form" data-layout="vertical" onSubmit={handleSubmitReleaseReview} className="release-review-form">
                      <label data-ui="field">
                        <span data-slot="label">Reviewers (comma-separated)</span>
                        <input
                          data-ui="input"
                          data-size="sm"
                          value={reviewersInput}
                          onChange={(event) => setReviewersInput(event.target.value)}
                          placeholder="reviewer-1, reviewer-2"
                        />
                      </label>

                      <div data-ui="grid" data-cols="2" data-gap="3">
                        <label data-ui="field">
                          <span data-slot="label">Decision</span>
                          <select
                            data-ui="select"
                            data-size="sm"
                            value={decision}
                            onChange={(event) => setDecision(event.target.value as ReviewDecision)}
                          >
                            <option value="approve">approve</option>
                            <option value="hold">hold</option>
                            <option value="reject">reject</option>
                          </select>
                        </label>

                        <label data-ui="field">
                          <span data-slot="label">Label policy</span>
                          <input
                            data-ui="input"
                            data-size="sm"
                            value={labelPolicy}
                            onChange={(event) => setLabelPolicy(event.target.value)}
                          />
                        </label>
                      </div>

                      <label data-ui="field">
                        <span data-slot="label">Risk flags (comma-separated)</span>
                        <input
                          data-ui="input"
                          data-size="sm"
                          value={riskFlagsInput}
                          onChange={(event) => setRiskFlagsInput(event.target.value)}
                          placeholder="policy-check, low-evidence"
                        />
                      </label>

                      <label data-ui="field">
                        <span data-slot="label">Comment</span>
                        <textarea
                          data-ui="textarea"
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="审查备注"
                        />
                      </label>

                      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                        <p data-ui="text" data-variant="caption" data-tone={reviewSubmitState === 'error' ? 'danger' : 'muted'}>
                          {reviewSubmitMessage || '提交后会返回 review_id 与 audit_ref。'}
                        </p>
                        <button
                          data-ui="button"
                          data-variant="primary"
                          data-size="sm"
                          type="submit"
                          disabled={reviewSubmitState === 'submitting'}
                        >
                          {reviewSubmitState === 'submitting' ? '提交中...' : '提交审查'}
                        </button>
                      </div>
                    </form>
                  </div>
                </article>
              </section>
            </section>
          ) : null}

          {topFeedback ? (
            <section className={`literature-bottom-alert is-${topFeedback.level}`} role="status" aria-live="polite">
              <p
                data-ui="text"
                data-variant="caption"
                data-tone={topFeedback.level === 'error' ? 'danger' : 'primary'}
                title={topFeedback.message}
              >
                {topFeedback.message}
              </p>
              {topFeedback.recoveryAction ? (
                <button
                  className="literature-bottom-alert-link"
                  type="button"
                  onClick={handleTopFeedbackRecovery}
                >
                  恢复
                </button>
              ) : null}
              <button
                className="literature-bottom-alert-close"
                type="button"
                aria-label="关闭提示"
                onClick={() => setTopFeedback(null)}
              >
                ×
              </button>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
