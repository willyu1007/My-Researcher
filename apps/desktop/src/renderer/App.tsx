import {
  Fragment,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyTheme,
  readSystemPrefersDark,
  resolveTheme,
  SYSTEM_DARK_MEDIA_QUERY,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from './theme';
import {
  convertImportItemsToDraftRows,
  parseManualUploadToDraftRows,
  validateManualDraftRows,
} from './literature/manual-import-utils';
import {
  type ManualDraftRow,
  type ManualImportPayload,
  type ManualImportSession,
  type ManualRowValidation,
} from './literature/manual-import-types';

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
type AutoImportSubTabKey = 'topic-settings' | 'runs-alerts';
type ManualImportSubTabKey = 'file-review' | 'zotero-sync';
type ManualUploadFileStatus = 'processing' | 'parsed' | 'empty' | 'failed' | 'accepted' | 'duplicate';
type AppMode = 'standard' | 'dev';
type AutoPullScope = 'GLOBAL' | 'TOPIC';
type AutoPullRuleStatus = 'ACTIVE' | 'PAUSED';
type AutoPullSource = 'CROSSREF' | 'ARXIV' | 'ZOTERO';
type AutoPullFrequency = 'DAILY' | 'WEEKLY';
type AutoPullWeekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
type AutoPullSortMode = 'llm_score' | 'hybrid_score';
type AutoPullTriggerType = 'MANUAL' | 'SCHEDULE';
type AutoPullRunStatus = 'PENDING' | 'RUNNING' | 'PARTIAL' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
type AutoPullAlertLevel = 'WARNING' | 'ERROR';
type QuerySort = 'updated_desc' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc';
type OverviewScopeFilter = 'all' | ScopeStatus;
type OverviewCitationFilter = 'all' | CitationStatus;
type OverviewRightsFilter = 'all' | RightsClass;

type ManualUploadFileItem = {
  id: string;
  fileName: string;
  format: string;
  status: ManualUploadFileStatus;
  rowCount: number;
};

type ZoteroAction = 'idle' | 'test-link' | 'load-to-list' | 'sync-import';
type ZoteroLinkResult = {
  tested: boolean;
  connected: boolean;
  totalCount: number;
  duplicateCount: number;
  unparsedCount: number;
  importableCount: number;
};

type FeedbackRecoveryAction =
  | 'retry-zotero-import'
  | 'reload-overview';
type InlineFeedbackModel = {
  slot: 'header' | 'auto-import' | 'manual-import' | 'overview';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  recoveryAction?: FeedbackRecoveryAction;
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
    min_quality_score: number;
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
const APP_MODE_STORAGE_KEY = 'pea.app.mode';

const initialModule = coreNavItems[0] ?? '';
const citationStatusOptions: CitationStatus[] = ['seeded', 'selected', 'used', 'cited', 'dropped'];
const rightsClassOptions: RightsClass[] = ['UNKNOWN', 'OA', 'USER_AUTH', 'RESTRICTED'];
const literatureTabs: Array<{ key: LiteratureTabKey; label: string }> = [
  { key: 'auto-import', label: '自动导入' },
  { key: 'manual-import', label: '手动导入' },
  { key: 'overview', label: '文献综览' },
];
const autoImportSubTabs: Array<{ key: AutoImportSubTabKey; label: string }> = [
  { key: 'topic-settings', label: '设置主题' },
  { key: 'runs-alerts', label: '执行详情' },
];
const manualImportSubTabs: Array<{ key: ManualImportSubTabKey; label: string }> = [
  { key: 'file-review', label: '本地文件' },
  { key: 'zotero-sync', label: 'Zotero' },
];
const autoPullWeekdayOptions: Array<{ value: AutoPullWeekday; label: string }> = [
  { value: 'MON', label: '周一' },
  { value: 'TUE', label: '周二' },
  { value: 'WED', label: '周三' },
  { value: 'THU', label: '周四' },
  { value: 'FRI', label: '周五' },
  { value: 'SAT', label: '周六' },
  { value: 'SUN', label: '周日' },
];
const autoPullHourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));
const autoPullQualityPresetOptions: Array<{ value: string; label: string }> = [
  { value: '60', label: '60（宽松）' },
  { value: '70', label: '70（标准，默认）' },
  { value: '80', label: '80（严格）' },
  { value: '90', label: '90（高严格）' },
];
const manualUploadFormatHint = [
  '可解析：JSON / CSV / BibTeX / TXT',
  '待解析支持：PDF / TeX / BBL / AUX / RIS',
].join('\n');
const autoPullQualityHint = [
  '质量检测流程：',
  '1) 完整性校验：标题、作者、年份、DOI/arXiv、来源链接必须齐全',
  '2) 评分前去重：过滤库内与本批次重复文献',
  '3) LLM 质量评分：输出 0-100 分',
  '4) 门槛过滤：仅保留 >= 质量门槛（默认 70）',
].join('\n');
const autoPullSortHint = [
  '大模型打分：直接按 LLM 质量分排序',
  '综合评分：0.70*质量 + 0.15*新近性 + 0.10*投稿/发表状态 + 0.05*引用量',
].join('\n');
const autoPullLookbackHint = [
  '仅影响后续增量抓取窗口（最近 N 天）。',
  '首次抓取或“全量重抓”会走主题时段全量。',
].join('\n');
const autoPullRunStatusLabels: Record<AutoPullRunStatus, string> = {
  PENDING: '待执行',
  RUNNING: '执行中',
  PARTIAL: '部分成功',
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '已跳过',
};
const autoPullLimitHint = [
  '上限规则：',
  '首次拉取：按配置上限的 5 倍执行',
  '后续拉取：按配置上限执行',
  '自动去重：先做全局去重',
  '取数方式：按当前排序规则选取 Top K 入库',
].join('\n');
const autoPullParseHint = [
  '开启：在摘要自动提取之外，系统会对排序后的文献做 LLM 结构化解析，预处理价值、观点、方法、图片等信息，便于进入后续自动流程。',
  '关闭：仅保留基础信息与摘要，文献仍可引用；如需进入后续流程，可后续手动注入或手动触发 LLM 整理。',
].join('\n');
const helpTooltipMaxWidthPx = 300;
const helpTooltipViewportPaddingPx = 12;

function updateHelpTooltipAlignment(target: HTMLSpanElement): void {
  if (typeof window === 'undefined') {
    return;
  }
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const boundaryElement = target.closest('.topic-profile-modal');
  const boundaryRect = boundaryElement?.getBoundingClientRect();
  const boundaryLeft = Math.max(
    helpTooltipViewportPaddingPx,
    (boundaryRect?.left ?? 0) + helpTooltipViewportPaddingPx,
  );
  const boundaryRight = Math.min(
    viewportWidth - helpTooltipViewportPaddingPx,
    (boundaryRect?.right ?? viewportWidth) - helpTooltipViewportPaddingPx,
  );
  const spaceRight = Math.max(0, boundaryRight - rect.left);
  const spaceLeft = Math.max(0, rect.right - boundaryLeft);
  const desiredWidth = Math.min(
    helpTooltipMaxWidthPx,
    Math.max(180, boundaryRight - boundaryLeft),
  );

  let shouldAlignRight = false;
  if (spaceRight >= desiredWidth) {
    shouldAlignRight = false;
  } else if (spaceLeft >= desiredWidth) {
    shouldAlignRight = true;
  } else {
    shouldAlignRight = spaceLeft > spaceRight;
  }

  const availableWidth = shouldAlignRight ? spaceLeft : spaceRight;
  const maxBubbleWidth = Math.max(
    180,
    Math.min(helpTooltipMaxWidthPx, Math.floor(availableWidth)),
  );

  target.dataset.tooltipAlign = shouldAlignRight ? 'right' : 'left';
  target.style.setProperty('--tooltip-max-width', `${maxBubbleWidth}px`);
}
const manualImportTestTopicProfiles: Array<{
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
}> = [
  {
    topic_id: 'DEV-TOPIC-RAG-EVAL',
    name: 'DEV RAG 评测',
    is_active: true,
    include_keywords: ['rag', 'retrieval', 'evaluation'],
    exclude_keywords: ['biology'],
    venue_filters: ['NeurIPS', 'ICML'],
    default_lookback_days: 30,
    default_min_year: 2020,
    default_max_year: null,
    rule_ids: [],
  },
  {
    topic_id: 'DEV-TOPIC-AGENT-TOOL',
    name: 'DEV Agent Tool Use',
    is_active: true,
    include_keywords: ['agent', 'tool use', 'planning'],
    exclude_keywords: ['robotics'],
    venue_filters: ['ACL', 'EMNLP'],
    default_lookback_days: 45,
    default_min_year: 2021,
    default_max_year: null,
    rule_ids: [],
  },
  {
    topic_id: 'DEV-TOPIC-LLM-SYSTEM',
    name: 'DEV LLM 系统工程',
    is_active: true,
    include_keywords: ['llm systems', 'serving', 'latency'],
    exclude_keywords: [],
    venue_filters: ['KDD', 'WWW'],
    default_lookback_days: 60,
    default_min_year: 2019,
    default_max_year: null,
    rule_ids: [],
  },
];
const devInjectedTopicIds = manualImportTestTopicProfiles.map((item) => item.topic_id);
const devAutoPullRuleSeeds: Array<{
  name: string;
  scope: AutoPullScope;
  include_keywords: string[];
  exclude_keywords: string[];
  venues: string[];
  lookback_days: number;
  min_year: number | null;
  max_year: number | null;
  min_quality_score: number;
}> = [
  {
    name: 'DEV 全局增量检索',
    scope: 'GLOBAL',
    include_keywords: ['llm', 'agent', 'retrieval'],
    exclude_keywords: ['biology'],
    venues: [],
    lookback_days: 30,
    min_year: 2020,
    max_year: null,
    min_quality_score: 70,
  },
  {
    name: 'DEV RAG 专项检索',
    scope: 'TOPIC',
    include_keywords: ['rag', 'retrieval', 'evaluation'],
    exclude_keywords: ['biology'],
    venues: ['NeurIPS', 'ICML'],
    lookback_days: 21,
    min_year: 2020,
    max_year: null,
    min_quality_score: 70,
  },
  {
    name: 'DEV Agent 专项检索',
    scope: 'TOPIC',
    include_keywords: ['agent', 'tool use', 'planning'],
    exclude_keywords: ['robotics'],
    venues: ['ACL', 'EMNLP'],
    lookback_days: 30,
    min_year: 2021,
    max_year: null,
    min_quality_score: 70,
  },
  {
    name: 'DEV 系统工程专项检索',
    scope: 'TOPIC',
    include_keywords: ['llm systems', 'serving', 'latency'],
    exclude_keywords: [],
    venues: ['KDD', 'WWW'],
    lookback_days: 45,
    min_year: 2019,
    max_year: null,
    min_quality_score: 70,
  },
];
const devTopicRuleBindingsByTopicId: Record<string, string[]> = {
  'DEV-TOPIC-RAG-EVAL': ['DEV RAG 专项检索'],
  'DEV-TOPIC-AGENT-TOOL': ['DEV Agent 专项检索'],
  'DEV-TOPIC-LLM-SYSTEM': ['DEV 系统工程专项检索'],
};
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
  'manual-import': manualImportSubTabs.map((tab) => ({ key: tab.key, label: tab.label })),
};
const querySortOptions: Array<{ value: QuerySort; label: string }> = [
  { value: 'updated_desc', label: '按更新时间（新->旧）' },
  { value: 'year_desc', label: '按年份（新->旧）' },
  { value: 'year_asc', label: '按年份（旧->新）' },
  { value: 'title_asc', label: '按标题（A->Z）' },
  { value: 'title_desc', label: '按标题（Z->A）' },
];
const manualImportTestItems: ManualImportPayload[] = [
  {
    provider: 'manual',
    external_id: 'demo-doi-1',
    title: 'Benchmarking RAG Systems with Real-World Constraints',
    abstract: 'Evaluates retrieval and answer quality under realistic latency and cost budgets.',
    authors: ['Lin Zhou', 'Marta Chen'],
    year: 2024,
    doi: '10.1145/3700000.3700123',
    tags: ['survey', 'baseline'],
    source_url: '',
  },
  {
    provider: 'manual',
    external_id: 'demo-arxiv-1',
    title: 'LLM Agent Evaluation in Multi-Step Tool Use',
    authors: ['A. Kumar'],
    year: 2025,
    arxiv_id: '2501.01234',
    tags: ['agent', 'evaluation'],
    source_url: '',
  },
  {
    provider: 'manual',
    external_id: 'demo-missing-authors',
    title: 'Missing Author Example',
    authors: [],
    year: 2023,
    doi: '10.1000/demo.missing-authors',
    tags: ['invalid'],
    source_url: '',
  },
  {
    provider: 'manual',
    external_id: 'demo-invalid-year',
    title: 'Invalid Year Example',
    authors: ['Debug Bot'],
    year: 1888,
    source_url: 'https://example.org/invalid-year',
    tags: ['invalid', 'year'],
  },
  {
    provider: 'manual',
    external_id: 'demo-invalid-url',
    title: 'Invalid URL Example',
    authors: ['QA Bot'],
    year: 2022,
    source_url: 'ftp://example.org/not-http',
    tags: ['invalid', 'url'],
  },
  {
    provider: 'manual',
    external_id: 'demo-url-1',
    title: 'Fast Re-ranking Pipelines for Dense Retrieval',
    authors: ['Nina Park', 'Tom Li'],
    year: 2021,
    source_url: 'https://openreview.net/forum?id=demo-reranker',
    tags: ['retrieval', 'reranker'],
  },
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

const emptyZoteroLinkResult: ZoteroLinkResult = {
  tested: false,
  connected: false,
  totalCount: 0,
  duplicateCount: 0,
  unparsedCount: 0,
  importableCount: 0,
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

function readStoredAppMode(): AppMode {
  if (typeof window === 'undefined') {
    return 'standard';
  }
  try {
    const value = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
    return value === 'dev' ? 'dev' : 'standard';
  } catch {
    return 'standard';
  }
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

function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toOptionalYear(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeManualDedupDoi(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, '')
    .replace(/^doi:/, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeManualDedupArxivId(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
    .replace(/^arxiv:/, '')
    .trim()
    .replace(/v\d+$/, '');
  return normalized.length > 0 ? normalized : null;
}

function normalizeManualDedupToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseManualDedupAuthors(value: string): string[] {
  return value
    .split(/\s+and\s+|,|;/i)
    .map((author) => normalizeManualDedupToken(author))
    .filter((author) => author.length > 0)
    .sort();
}

function buildManualDraftRowDedupKey(row: ManualDraftRow): string | null {
  const doi = normalizeManualDedupDoi(row.doi);
  if (doi) {
    return `doi:${doi}`;
  }

  const arxivId = normalizeManualDedupArxivId(row.arxiv_id);
  if (arxivId) {
    return `arxiv:${arxivId}`;
  }

  const year = Number.parseInt(row.year_text.trim(), 10);
  if (!Number.isFinite(year)) {
    return null;
  }

  const normalizedTitle = normalizeManualDedupToken(row.title);
  const normalizedAuthors = parseManualDedupAuthors(row.authors_text);
  if (!normalizedTitle || normalizedAuthors.length === 0) {
    return null;
  }

  return `tay:${normalizedTitle}|${normalizedAuthors.join('|')}|${year}`;
}

function mergeManualDraftRows(existingRows: ManualDraftRow[], incomingRows: ManualDraftRow[]) {
  const rows = [...existingRows];
  const seenKeys = new Set<string>();

  for (const row of existingRows) {
    const key = buildManualDraftRowDedupKey(row);
    if (key) {
      seenKeys.add(key);
    }
  }

  let skippedDuplicates = 0;
  let appendedCount = 0;

  for (const row of incomingRows) {
    const key = buildManualDraftRowDedupKey(row);
    if (key && seenKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    if (key) {
      seenKeys.add(key);
    }
    rows.push(row);
    appendedCount += 1;
  }

  return {
    rows,
    appendedCount,
    skippedDuplicates,
  };
}

type ManualFieldErrorKey =
  | 'title'
  | 'authors_text'
  | 'year_text'
  | 'doi'
  | 'arxiv_id'
  | 'source_url'
  | 'tags_text';

type ManualFieldErrorMap = Partial<Record<ManualFieldErrorKey, string[]>>;

function pushManualFieldError(map: ManualFieldErrorMap, key: ManualFieldErrorKey, message: string): void {
  const bucket = map[key] ?? [];
  if (!bucket.includes(message)) {
    bucket.push(message);
  }
  map[key] = bucket;
}

function mapManualValidationErrors(validation?: ManualRowValidation): ManualFieldErrorMap {
  const map: ManualFieldErrorMap = {};
  if (!validation || validation.is_valid) {
    return map;
  }

  for (const message of validation.errors) {
    if (message.includes('标题')) {
      pushManualFieldError(map, 'title', message);
    }
    if (message.includes('作者')) {
      pushManualFieldError(map, 'authors_text', message);
    }
    if (message.includes('年份')) {
      pushManualFieldError(map, 'year_text', message);
    }
    if (message.includes('需要 DOI / arXiv ID / 来源链接 其中之一')) {
      pushManualFieldError(map, 'doi', message);
      pushManualFieldError(map, 'arxiv_id', message);
      pushManualFieldError(map, 'source_url', message);
    }
    if (message.includes('来源链接')) {
      pushManualFieldError(map, 'source_url', message);
    }
  }

  return map;
}

function getManualFieldErrorText(map: ManualFieldErrorMap, key: ManualFieldErrorKey): string {
  return (map[key] ?? []).join('；');
}

function parseZoteroPreviewItems(payload: unknown): ManualImportPayload[] {
  const root = asRecord(payload);
  const items = Array.isArray(root?.items) ? root.items : [];
  const parsedItems: ManualImportPayload[] = [];
  items.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) {
      return;
    }
    const title = toText(record.title)?.trim() ?? '';
    if (!title) {
      return;
    }
    const provider = normalizeLiteratureProvider(record.provider);
    const normalizedProvider = provider === 'zotero' ? 'zotero' : 'manual';
    const sourceUrl = toText(record.source_url)?.trim() ?? '';
    const externalIdFromPayload = toText(record.external_id)?.trim() ?? '';
    const externalId = externalIdFromPayload || sourceUrl || `zotero-preview-${index + 1}`;
    if (!externalId) {
      return;
    }

    parsedItems.push({
      provider: normalizedProvider,
      external_id: externalId,
      title,
      abstract: toText(record.abstract)?.trim() ?? undefined,
      authors: toTextArray(record.authors),
      year: toOptionalYear(record.year),
      doi: toText(record.doi)?.trim() || undefined,
      arxiv_id: toText(record.arxiv_id)?.trim() || undefined,
      source_url: sourceUrl,
      tags: toTextArray(record.tags),
    });
  });

  return parsedItems;
}

function computeZoteroPreviewResult(
  payload: unknown,
  existingRows: ManualDraftRow[],
): {
  rows: ManualDraftRow[];
  fetchedCount: number;
  duplicateCount: number;
  unparsedCount: number;
  importableCount: number;
} {
  const root = asRecord(payload);
  const fetchedCountRaw = typeof root?.fetched_count === 'number'
    ? root.fetched_count
    : Array.isArray(root?.items)
      ? root.items.length
      : 0;
  const fetchedCount = Number.isFinite(fetchedCountRaw) ? Math.max(0, Math.trunc(fetchedCountRaw)) : 0;
  const previewItems = parseZoteroPreviewItems(payload);
  const rows = convertImportItemsToDraftRows(previewItems);
  const merged = mergeManualDraftRows(existingRows, rows);
  const appendedRows = merged.rows.slice(existingRows.length);
  const importableCount = validateManualDraftRows(appendedRows).filter((item) => item.is_valid).length;

  return {
    rows,
    fetchedCount,
    duplicateCount: merged.skippedDuplicates,
    unparsedCount: Math.max(0, fetchedCount - previewItems.length),
    importableCount,
  };
}

function isAutoImportSubTabKey(value: string): value is AutoImportSubTabKey {
  return value === 'topic-settings' || value === 'runs-alerts';
}

function isManualImportSubTabKey(value: string): value is ManualImportSubTabKey {
  return value === 'file-review' || value === 'zotero-sync';
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

function normalizeWeekdayToken(value: string | undefined): AutoPullWeekday {
  const token = (value ?? '').trim().toUpperCase();
  const matched = autoPullWeekdayOptions.find((option) => option.value === token);
  return matched?.value ?? 'MON';
}

function normalizeScheduleHourValue(hourInput: string): string {
  const hour = Number.parseInt(hourInput.trim(), 10);
  const normalizedHour = Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 9;
  return String(normalizedHour);
}

function normalizeQualityPresetValue(input: number): string {
  if (!Number.isFinite(input)) {
    return '70';
  }
  const candidates = [60, 70, 80, 90];
  const nearest = candidates.reduce((best, current) =>
    Math.abs(current - input) < Math.abs(best - input) ? current : best,
  candidates[0] ?? 70);
  return String(nearest);
}

function resolveSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
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
          min_quality_score:
            typeof qualitySpec.min_quality_score === 'number'
              ? qualitySpec.min_quality_score
              : 70,
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

function normalizeComparableText(value: string): string {
  return value.trim().toLowerCase();
}

function isPaperNotFoundMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized.includes('not_found') && normalized.includes('paper') && normalized.includes('not found');
}

function applyOverviewQuickFilters(
  items: LiteratureOverviewItem[],
  filters: {
    keyword: string;
    scopeStatus: OverviewScopeFilter;
    citationStatus: OverviewCitationFilter;
    rightsClass: OverviewRightsFilter;
  },
): LiteratureOverviewItem[] {
  const keyword = normalizeComparableText(filters.keyword);
  return items.filter((item) => {
    if (keyword) {
      const hit = [
        item.title,
        item.authors.join(' '),
        item.tags.join(' '),
        item.providers.join(' '),
        item.doi ?? '',
        item.arxiv_id ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
      if (!hit) {
        return false;
      }
    }

    if (filters.scopeStatus !== 'all' && item.topic_scope_status !== filters.scopeStatus) {
      return false;
    }
    if (filters.citationStatus !== 'all' && item.citation_status !== filters.citationStatus) {
      return false;
    }
    if (filters.rightsClass !== 'all' && item.rights_class !== filters.rightsClass) {
      return false;
    }

    return true;
  });
}

function projectOverviewItems(
  items: LiteratureOverviewItem[],
  options: {
    sort: QuerySort;
    keyword: string;
    scopeStatus: OverviewScopeFilter;
    citationStatus: OverviewCitationFilter;
    rightsClass: OverviewRightsFilter;
  },
): LiteratureOverviewItem[] {
  const quickFilteredItems = applyOverviewQuickFilters(items, {
    keyword: options.keyword,
    scopeStatus: options.scopeStatus,
    citationStatus: options.citationStatus,
    rightsClass: options.rightsClass,
  });
  return sortOverviewItems(quickFilteredItems, options.sort);
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

function detectManualUploadFileFormat(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) {
    return 'JSON';
  }
  if (lower.endsWith('.csv')) {
    return 'CSV';
  }
  if (lower.endsWith('.bib') || lower.endsWith('.bibtex')) {
    return 'BibTeX';
  }
  if (lower.endsWith('.pdf')) {
    return 'PDF';
  }
  if (lower.endsWith('.txt')) {
    return 'TXT';
  }
  if (lower.endsWith('.tex') || lower.endsWith('.ltx')) {
    return 'TeX';
  }
  if (lower.endsWith('.bbl')) {
    return 'BBL';
  }
  if (lower.endsWith('.aux')) {
    return 'AUX';
  }
  if (lower.endsWith('.ris')) {
    return 'RIS';
  }
  return '其他';
}

function isManualUploadParseSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.json')
    || lower.endsWith('.csv')
    || lower.endsWith('.bib')
    || lower.endsWith('.bibtex')
    || lower.endsWith('.txt')
  );
}

function isManualUploadLlmSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.pdf')
    || lower.endsWith('.tex')
    || lower.endsWith('.ltx')
    || lower.endsWith('.bbl')
    || lower.endsWith('.aux')
    || lower.endsWith('.ris')
  );
}

function buildManualUploadDuplicateKey(value: string): string | null {
  const normalized = normalizeManualDedupToken(
    value.replace(/\.(json|csv|bib|bibtex|txt|pdf|tex|ltx|bbl|aux|ris)$/i, ''),
  );
  return normalized.length > 0 ? normalized : null;
}

function formatManualUploadFileStatusLabel(item: ManualUploadFileItem): string {
  if (item.status === 'processing') {
    return '处理中';
  }
  if (item.status === 'parsed') {
    return '已解析';
  }
  if (item.status === 'duplicate') {
    return '重复';
  }
  if (item.status === 'accepted') {
    return '已接收';
  }
  if (item.status === 'empty') {
    return '已接收';
  }
  return '解析失败';
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

function resolveRunSortTimestamp(run: AutoPullRun): string {
  return run.finished_at ?? run.started_at ?? run.updated_at ?? run.created_at;
}

function resolveRunSortTimeMs(run: AutoPullRun): number {
  const timestamp = resolveRunSortTimestamp(run);
  const parsedMs = new Date(timestamp).getTime();
  return Number.isNaN(parsedMs) ? 0 : parsedMs;
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
  const [appMode, setAppMode] = useState<AppMode>(() => readStoredAppMode());
  const [settingsPanelOpen, setSettingsPanelOpen] = useState<boolean>(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
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
  const [autoImportSubTab, setAutoImportSubTab] = useState<AutoImportSubTabKey>('topic-settings');
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
  const [ruleFormName, setRuleFormName] = useState<string>('');
  const [ruleFormMaxResultsInput, setRuleFormMaxResultsInput] = useState<string>('20');
  const [ruleFormLookbackInput, setRuleFormLookbackInput] = useState<string>('30');
  const [ruleFormMinCompletenessInput, setRuleFormMinCompletenessInput] = useState<string>('70');
  const [ruleFormFrequency, setRuleFormFrequency] = useState<AutoPullFrequency>('DAILY');
  const [ruleFormWeekday, setRuleFormWeekday] = useState<AutoPullWeekday>('MON');
  const [ruleFormHourInput, setRuleFormHourInput] = useState<string>('9');
  const [ruleFormMinuteInput, setRuleFormMinuteInput] = useState<string>('0');
  const [ruleFormSortMode, setRuleFormSortMode] = useState<AutoPullSortMode>('llm_score');
  const [ruleFormParseAndIngest, setRuleFormParseAndIngest] = useState<boolean>(false);
  const [ruleSourceCrossref, setRuleSourceCrossref] = useState<boolean>(true);
  const [ruleSourceArxiv, setRuleSourceArxiv] = useState<boolean>(true);
  const scheduleHourValue = normalizeScheduleHourValue(ruleFormHourInput);

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
  const [scopeReasonInput] = useState<string>('初筛保留');
  const [manualUploadLoading, setManualUploadLoading] = useState<boolean>(false);
  const [manualUploadStatus, setManualUploadStatus] = useState<UiOperationStatus>('idle');
  const [manualUploadError, setManualUploadError] = useState<string | null>(null);
  const [literatureAutoParseDocuments, setLiteratureAutoParseDocuments] = useState<boolean>(false);
  const [literatureAutoExtractAbstracts, setLiteratureAutoExtractAbstracts] = useState<boolean>(false);
  const [manualUploadFiles, setManualUploadFiles] = useState<ManualUploadFileItem[]>([]);
  const [manualImportSession, setManualImportSession] = useState<ManualImportSession | null>(null);
  const [manualImportSubTab, setManualImportSubTab] = useState<ManualImportSubTabKey>('file-review');
  const [manualShowImportableOnly, setManualShowImportableOnly] = useState<boolean>(false);
  const [manualShowErrorOnly, setManualShowErrorOnly] = useState<boolean>(false);
  const [manualOpenRowId, setManualOpenRowId] = useState<string | null>(null);
  const [manualOpenRowPanel, setManualOpenRowPanel] = useState<'expand' | 'summary' | null>(null);
  const [manualDropActive, setManualDropActive] = useState<boolean>(false);
  const [zoteroLibraryType, setZoteroLibraryType] = useState<'users' | 'groups'>('users');
  const [zoteroLibraryId, setZoteroLibraryId] = useState<string>('');
  const [zoteroApiKey, setZoteroApiKey] = useState<string>('');
  const [zoteroLoading, setZoteroLoading] = useState<boolean>(false);
  const [zoteroAction, setZoteroAction] = useState<ZoteroAction>('idle');
  const [zoteroStatus, setZoteroStatus] = useState<UiOperationStatus>('idle');
  const [zoteroError, setZoteroError] = useState<string | null>(null);
  const [zoteroLinkResult, setZoteroLinkResult] = useState<ZoteroLinkResult>(emptyZoteroLinkResult);
  const [overviewPanel, setOverviewPanel] = useState<PanelState<LiteratureOverviewData>>({
    status: 'idle',
    data: emptyLiteratureOverviewData,
    error: null,
  });
  const [querySort, setQuerySort] = useState<QuerySort>('updated_desc');
  const [overviewKeyword, setOverviewKeyword] = useState<string>('');
  const [overviewScopeFilter, setOverviewScopeFilter] = useState<OverviewScopeFilter>('all');
  const [overviewCitationFilter, setOverviewCitationFilter] = useState<OverviewCitationFilter>('all');
  const [overviewRightsFilter, setOverviewRightsFilter] = useState<OverviewRightsFilter>('all');
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(APP_MODE_STORAGE_KEY, appMode);
    } catch {
      // Ignore storage write failures and keep runtime state.
    }
  }, [appMode]);

  useEffect(() => {
    if (isSidebarCollapsed) {
      setSettingsPanelOpen(false);
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!settingsPanelOpen || typeof window === 'undefined') {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!settingsPanelRef.current || settingsPanelRef.current.contains(target)) {
        return;
      }
      setSettingsPanelOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [settingsPanelOpen]);

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
      return;
    }

    setOverviewPanel((current) => ({ ...current, status: 'loading', error: null }));
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
        return;
      }

      const sortedItems = projectOverviewItems(normalized.items, {
        sort: querySort,
        keyword: overviewKeyword,
        scopeStatus: overviewScopeFilter,
        citationStatus: overviewCitationFilter,
        rightsClass: overviewRightsFilter,
      });

      setOverviewPanel({
        status: normalized.items.length > 0 ? 'ready' : 'empty',
        data: normalized,
        error: null,
      });
      setOverviewResultItems(sortedItems);
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载文献综览失败。';
      if (isPaperNotFoundMessage(message)) {
        setOverviewPanel({
          status: 'empty',
          data: emptyLiteratureOverviewData,
          error: null,
        });
        setOverviewResultItems([]);
        return;
      }
      setOverviewPanel({
        status: 'error',
        data: emptyLiteratureOverviewData,
        error: message,
      });
      setOverviewResultItems([]);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `综览加载失败：${message}`,
        recoveryAction: 'reload-overview',
      });
    }
  }, [
    overviewCitationFilter,
    overviewKeyword,
    overviewRightsFilter,
    overviewScopeFilter,
    pushLiteratureFeedback,
    querySort,
  ]);

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
    const sortedItems = projectOverviewItems(sourceItems, {
      sort: querySort,
      keyword: overviewKeyword,
      scopeStatus: overviewScopeFilter,
      citationStatus: overviewCitationFilter,
      rightsClass: overviewRightsFilter,
    });
    setOverviewResultItems(sortedItems);
  }, [
    overviewCitationFilter,
    overviewKeyword,
    overviewPanel.data.items,
    overviewPanel.status,
    overviewRightsFilter,
    overviewScopeFilter,
    querySort,
  ]);

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
      const payload = await requestGovernance({
        method: 'GET',
        path: '/auto-pull/rules',
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
  }, [pushLiteratureFeedback]);

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
    resetRuleForm();
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
    setTopicFormRuleIds(profile.rule_ids.slice(0, 1));
    resetRuleForm();
    setRuleFormName(`${profile.name} 自动拉取`);
    setTopicFormModalOpen(true);
    setAutoImportSubTab('topic-settings');
  };

  const handleToggleTopicRuleSelection = (ruleId: string) => {
    setTopicFormRuleIds((current) => (current[0] === ruleId ? [] : [ruleId]));
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

  const handleResetTopicRuleComposer = () => {
    resetRuleForm();
    setRuleFormName(topicFormName.trim() ? `${topicFormName.trim()} 自动拉取` : '');
  };

  const handleEditRule = (rule: AutoPullRule) => {
    const primarySchedule = rule.schedules[0] ?? null;
    const sourceConfig = asRecord(rule.sources.find((source) => source.enabled)?.config) ?? {};
    const sortModeRaw = toText(sourceConfig.sort_mode);
    setRuleEditingId(rule.rule_id);
    setRuleFormName(rule.name);
    setRuleFormMaxResultsInput(String(rule.query_spec.max_results_per_source));
    setRuleFormLookbackInput(String(rule.time_spec.lookback_days));
    setRuleFormMinCompletenessInput(normalizeQualityPresetValue(rule.quality_spec.min_quality_score));
    setRuleFormFrequency(primarySchedule?.frequency ?? 'DAILY');
    setRuleFormWeekday(normalizeWeekdayToken(primarySchedule?.days_of_week[0]));
    setRuleFormHourInput(String(primarySchedule?.hour ?? 9));
    setRuleFormMinuteInput('0');
    setRuleFormSortMode(sortModeRaw === 'hybrid_score' ? 'hybrid_score' : 'llm_score');
    setRuleFormParseAndIngest(sourceConfig.parse_and_ingest === true);
    setRuleSourceCrossref(rule.sources.some((source) => source.source === 'CROSSREF' && source.enabled));
    setRuleSourceArxiv(rule.sources.some((source) => source.source === 'ARXIV' && source.enabled));
  };

  const resetRuleForm = () => {
    setRuleEditingId(null);
    setRuleFormName('');
    setRuleFormMaxResultsInput('20');
    setRuleFormLookbackInput('30');
    setRuleFormMinCompletenessInput('70');
    setRuleFormFrequency('DAILY');
    setRuleFormWeekday('MON');
    setRuleFormHourInput('9');
    setRuleFormMinuteInput('0');
    setRuleFormSortMode('llm_score');
    setRuleFormParseAndIngest(false);
    setRuleSourceCrossref(true);
    setRuleSourceArxiv(true);
  };

  const handleSubmitRule = async (options?: {
    bindToTopicDraft?: boolean;
  }) => {
    const nameText = ruleFormName.trim();
    if (!nameText) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '规则名称不能为空。',
      });
      return;
    }

    const sources: Array<{
      source: AutoPullSource;
      enabled: boolean;
      priority: number;
      config?: Record<string, unknown>;
    }> = [];
    const ruleSourceConfig = {
      sort_mode: ruleFormSortMode,
      parse_and_ingest: ruleFormParseAndIngest,
    } satisfies Record<string, unknown>;
    if (ruleSourceCrossref) {
      sources.push({ source: 'CROSSREF', enabled: true, priority: 10, config: ruleSourceConfig });
    }
    if (ruleSourceArxiv) {
      sources.push({ source: 'ARXIV', enabled: true, priority: 20, config: ruleSourceConfig });
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
    const minCompleteness = Number.parseInt(ruleFormMinCompletenessInput.trim(), 10);
    const scheduleTimezone = resolveSystemTimezone();

    const payload = {
      scope: 'TOPIC' as const,
      name: nameText,
      query_spec: {
        include_keywords: [],
        exclude_keywords: [],
        authors: [],
        venues: [],
        max_results_per_source: Number.isFinite(maxResults) ? maxResults : 20,
      },
      time_spec: {
        lookback_days: Number.isFinite(lookbackDays) ? lookbackDays : 30,
        min_year: null,
        max_year: null,
      },
      quality_spec: {
        min_quality_score: Number.isFinite(minCompleteness) ? minCompleteness : 70,
      },
      sources,
      schedules: [
        {
          frequency: ruleFormFrequency,
          days_of_week: ruleFormFrequency === 'WEEKLY' ? [ruleFormWeekday] : [],
          hour,
          minute,
          timezone: scheduleTimezone,
          active: true,
        },
      ],
    };

    setRulesStatus('saving');
    try {
      let resolvedRuleId: string | null = ruleEditingId;
      if (ruleEditingId) {
        await requestGovernance({
          method: 'PATCH',
          path: `/auto-pull/rules/${encodeURIComponent(ruleEditingId)}`,
          body: payload,
        });
      } else {
        const createPayload = await requestGovernance({
          method: 'POST',
          path: '/auto-pull/rules',
          body: payload,
        });
        const createRoot = asRecord(createPayload);
        const createdRuleId = toText(createRoot?.rule_id)?.trim() ?? '';
        if (createdRuleId) {
          resolvedRuleId = createdRuleId;
        }
      }

      if (options?.bindToTopicDraft && resolvedRuleId) {
        setTopicFormRuleIds([resolvedRuleId]);
      }
      resetRuleForm();
      if (options?.bindToTopicDraft) {
        setRuleFormName(topicFormName.trim() ? `${topicFormName.trim()} 自动拉取` : '');
      }
      await loadAutoPullRules();
      await loadAutoPullRuns();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message:
          options?.bindToTopicDraft
            ? ruleEditingId
              ? '规则已更新并保留在当前主题绑定中。'
              : '规则已创建并加入当前主题绑定。'
            : ruleEditingId
              ? '规则已更新。'
              : '规则已创建。',
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

  const handleRunRuleFullRefresh = async (rule: AutoPullRule) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/auto-pull/rules/${encodeURIComponent(rule.rule_id)}/runs`,
        body: {
          trigger_type: 'MANUAL',
          full_refresh: true,
        },
      });
      await loadAutoPullRuns();
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: `已触发全量重抓：${rule.name}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '触发全量重抓失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `触发全量重抓失败：${message}`,
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

  const applyManualImportSessionRows = (
    fileName: string,
    rows: ManualDraftRow[],
    source: 'upload' | 'seed' | 'zotero-preview',
  ) => {
    const baseRows = source === 'seed' ? [] : manualImportSession?.rows ?? [];
    const merged = mergeManualDraftRows(baseRows, rows);
    const nextSession: ManualImportSession | null = merged.rows.length > 0
      ? {
        file_name: source === 'seed' ? fileName : manualImportSession?.file_name ?? fileName,
        rows: merged.rows,
      }
      : null;
    const validations = validateManualDraftRows(merged.rows);
    const invalidCount = validations.filter((item) => !item.is_valid).length;

    if (!nextSession) {
      return;
    }

    const appended = source === 'seed' ? merged.rows.length : merged.appendedCount;
    const duplicateSkipped = source === 'seed' ? 0 : merged.skippedDuplicates;
    const level =
      appended === 0
        ? 'warning'
        : invalidCount > 0 || duplicateSkipped > 0
          ? 'warning'
          : 'success';
    const statusText = `当前检查表 ${merged.rows.length} 行，错误 ${invalidCount} 行。`;

    setManualImportSession(nextSession);
    setManualShowImportableOnly(false);
    setManualShowErrorOnly(false);
    setManualOpenRowId(null);
    setManualOpenRowPanel(null);
    setManualUploadStatus('ready');
    setManualUploadError(null);
    pushLiteratureFeedback({
      slot: 'manual-import',
      level,
      message:
        source === 'seed'
          ? `已注入测试数据 ${merged.rows.length} 行，其中 ${invalidCount} 行待修复后可导入。`
          : source === 'zotero-preview'
            ? `Zotero 新增 ${appended} 行，去重跳过 ${duplicateSkipped} 行。${statusText}`
            : `本地上传新增 ${appended} 行，去重跳过 ${duplicateSkipped} 行。${statusText}`,
    });
  };

  const invokeManualUploadLlmReserved = async (
    action: 'parse' | 'abstract',
    fileName: string,
  ): Promise<void> => {
    // Placeholder hook for future LLM integration.
    void action;
    void fileName;
    await Promise.resolve();
  };

  const pushManualUploadLlmFeedback = (
    action: 'parse' | 'abstract',
    fileName: string,
    trigger: 'manual' | 'auto',
  ) => {
    const actionLabel = action === 'parse' ? '解析' : '提取摘要';
    pushLiteratureFeedback({
      slot: 'manual-import',
      level: 'info',
      message:
        trigger === 'auto'
          ? `已按设置触发「${actionLabel}」：${fileName}（LLM 接口预留）。`
          : `已触发「${actionLabel}」：${fileName}（LLM 接口预留）。`,
    });
  };

  const handleManualUploadFileLlmAction = async (
    fileId: string,
    action: 'parse' | 'abstract',
  ) => {
    const fileItem = manualUploadFiles.find((item) => item.id === fileId);
    if (!fileItem || fileItem.status === 'duplicate' || !isManualUploadLlmSupported(fileItem.fileName)) {
      return;
    }

    await invokeManualUploadLlmReserved(action, fileItem.fileName);
    pushManualUploadLlmFeedback(action, fileItem.fileName, 'manual');
  };

  const importManualFilesIntoSession = async (files: File[]) => {
    setManualUploadLoading(true);
    setManualUploadStatus('loading');
    setManualUploadError(null);
    const batchIdPrefix = `manual-upload-${Date.now()}`;
    const batchFiles = files.map((file, index) => ({
      id: `${batchIdPrefix}-${index + 1}`,
      fileName: file.name,
      format: detectManualUploadFileFormat(file.name),
      status: 'processing' as const,
      rowCount: 0,
    }));
    setManualUploadFiles((current) => [...batchFiles, ...current]);

    const updateBatchFile = (id: string, patch: Partial<ManualUploadFileItem>) => {
      setManualUploadFiles((current) =>
        current.map((item) =>
          item.id === id
            ? {
              ...item,
              ...patch,
            }
            : item),
      );
    };

    const existingUploadNameKeys = new Set(
      manualUploadFiles
        .map((item) => buildManualUploadDuplicateKey(item.fileName))
        .filter((value): value is string => Boolean(value)),
    );
    const existingManualTitleKeys = new Set(
      (manualImportSession?.rows ?? [])
        .map((row) => buildManualUploadDuplicateKey(row.title))
        .filter((value): value is string => Boolean(value)),
    );
    const seenBatchUnsupportedKeys = new Set<string>();

    try {
      const parsedRows: ManualDraftRow[] = [];
      let emptyFiles = 0;
      let failedFiles = 0;
      let acceptedPendingFiles = 0;
      let duplicateFiles = 0;
      const acceptedPendingFileNames: string[] = [];

      const triggerAutoLlmActions = () => {
        if (acceptedPendingFileNames.length === 0) {
          return;
        }
        if (literatureAutoParseDocuments) {
          for (const fileName of acceptedPendingFileNames) {
            void invokeManualUploadLlmReserved('parse', fileName);
            pushManualUploadLlmFeedback('parse', fileName, 'auto');
          }
        }
        if (literatureAutoExtractAbstracts) {
          for (const fileName of acceptedPendingFileNames) {
            void invokeManualUploadLlmReserved('abstract', fileName);
            pushManualUploadLlmFeedback('abstract', fileName, 'auto');
          }
        }
      };

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const batchItem = batchFiles[index];
        if (!isManualUploadParseSupported(file.name)) {
          const duplicateKey = buildManualUploadDuplicateKey(file.name);
          const isDuplicate = Boolean(
            duplicateKey
            && (
              existingUploadNameKeys.has(duplicateKey)
              || existingManualTitleKeys.has(duplicateKey)
              || seenBatchUnsupportedKeys.has(duplicateKey)
            ),
          );
          if (isDuplicate) {
            duplicateFiles += 1;
            updateBatchFile(batchItem.id, {
              status: 'duplicate',
              rowCount: 0,
            });
            continue;
          }
          if (duplicateKey) {
            existingUploadNameKeys.add(duplicateKey);
            seenBatchUnsupportedKeys.add(duplicateKey);
          }
          acceptedPendingFiles += 1;
          acceptedPendingFileNames.push(file.name);
          updateBatchFile(batchItem.id, {
            status: 'accepted',
            rowCount: 0,
          });
          continue;
        }

        try {
          const content = await file.text();
          const rows = parseManualUploadToDraftRows(file.name, content);
          if (rows.length === 0) {
            emptyFiles += 1;
            updateBatchFile(batchItem.id, {
              status: 'empty',
              rowCount: 0,
            });
            continue;
          }
          parsedRows.push(...rows);
          updateBatchFile(batchItem.id, {
            status: 'parsed',
            rowCount: rows.length,
          });
        } catch {
          failedFiles += 1;
          updateBatchFile(batchItem.id, {
            status: 'failed',
            rowCount: 0,
          });
        }
      }

      if (parsedRows.length === 0) {
        if (acceptedPendingFiles > 0 || duplicateFiles > 0) {
          setManualUploadStatus('ready');
          setManualUploadError(null);
          triggerAutoLlmActions();
          pushLiteratureFeedback({
            slot: 'manual-import',
            level: duplicateFiles > 0 ? 'warning' : 'info',
            message:
              duplicateFiles > 0
                ? `已接收 ${acceptedPendingFiles} 个文件待后续解析支持，检测到重复 ${duplicateFiles} 个文件（仅允许移除）。`
                : `已接收 ${acceptedPendingFiles} 个文件，当前版本暂不支持其自动解析（如 PDF / TeX / BBL / AUX / RIS）。`,
          });
          return;
        }
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

      applyManualImportSessionRows(files[0]?.name ?? 'manual-upload', parsedRows, 'upload');
      triggerAutoLlmActions();
      if (emptyFiles > 0 || failedFiles > 0 || acceptedPendingFiles > 0 || duplicateFiles > 0) {
        pushLiteratureFeedback({
          slot: 'manual-import',
          level: 'warning',
          message: `额外提示：${emptyFiles} 个文件未解析到条目，${failedFiles} 个文件解析失败，${acceptedPendingFiles} 个文件已接收待后续解析支持，重复 ${duplicateFiles} 个。`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件解析失败。';
      setManualUploadStatus('error');
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `文件解析失败：${message}`,
      });
    } finally {
      setManualUploadLoading(false);
      setManualDropActive(false);
    }
  };

  const handleManualUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }
    await importManualFilesIntoSession(files);
    event.target.value = '';
  };

  const handleManualUploadDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) {
      return;
    }
    await importManualFilesIntoSession(files);
  };

  const upsertDevTopicProfiles = async (): Promise<{ created: number; updated: number; failed: number }> => {
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const payload of manualImportTestTopicProfiles) {
      try {
        await requestGovernance({
          method: 'POST',
          path: '/topics/settings',
          body: payload,
        });
        created += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const shouldPatch = message.includes('already exists') || message.includes('VERSION_CONFLICT');
        if (!shouldPatch) {
          failed += 1;
          continue;
        }
        try {
          await requestGovernance({
            method: 'PATCH',
            path: `/topics/settings/${encodeURIComponent(payload.topic_id)}`,
            body: {
              name: payload.name,
              is_active: payload.is_active,
              include_keywords: payload.include_keywords,
              exclude_keywords: payload.exclude_keywords,
              venue_filters: payload.venue_filters,
              default_lookback_days: payload.default_lookback_days,
              default_min_year: payload.default_min_year,
              default_max_year: payload.default_max_year,
              rule_ids: payload.rule_ids,
            },
          });
          updated += 1;
        } catch {
          failed += 1;
        }
      }
    }

    return { created, updated, failed };
  };

  const upsertDevAutoPullRules = async (): Promise<{
    created: number;
    updated: number;
    failed: number;
    ruleIdByName: Map<string, string>;
  }> => {
    let created = 0;
    let updated = 0;
    let failed = 0;
    const ruleIdByName = new Map<string, string>();
    const scheduleTimezone = resolveSystemTimezone();
    const existingRuleIdByName = new Map<string, string>();

    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: '/auto-pull/rules',
      });
      const existingRules = normalizeAutoPullRulePayload(payload);
      existingRules.forEach((rule) => {
        existingRuleIdByName.set(rule.name, rule.rule_id);
      });
    } catch {
      // Best effort: continue and try create flow.
    }

    for (const seed of devAutoPullRuleSeeds) {
      const body = {
        scope: seed.scope,
        name: seed.name,
        query_spec: {
          include_keywords: seed.include_keywords,
          exclude_keywords: seed.exclude_keywords,
          authors: [],
          venues: seed.venues,
          max_results_per_source: 20,
        },
        time_spec: {
          lookback_days: seed.lookback_days,
          min_year: seed.min_year,
          max_year: seed.max_year,
        },
        quality_spec: {
          min_quality_score: seed.min_quality_score,
        },
        sources: [
          {
            source: 'CROSSREF' as const,
            enabled: true,
            priority: 10,
          },
          {
            source: 'ARXIV' as const,
            enabled: true,
            priority: 20,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY' as const,
            days_of_week: [],
            hour: 9,
            minute: 0,
            timezone: scheduleTimezone,
            active: true,
          },
        ],
      };

      const existingRuleId = existingRuleIdByName.get(seed.name);
      if (existingRuleId) {
        try {
          await requestGovernance({
            method: 'PATCH',
            path: `/auto-pull/rules/${encodeURIComponent(existingRuleId)}`,
            body,
          });
          updated += 1;
          ruleIdByName.set(seed.name, existingRuleId);
        } catch {
          failed += 1;
        }
        continue;
      }

      try {
        const createPayload = await requestGovernance({
          method: 'POST',
          path: '/auto-pull/rules',
          body,
        });
        const root = asRecord(createPayload);
        const createdRuleId =
          toText(root?.rule_id)
          ?? toText(asRecord(root?.item)?.rule_id)
          ?? toText(asRecord(root?.rule)?.rule_id)
          ?? null;
        if (!createdRuleId) {
          failed += 1;
          continue;
        }
        created += 1;
        existingRuleIdByName.set(seed.name, createdRuleId);
        ruleIdByName.set(seed.name, createdRuleId);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const shouldResolveAgain = message.includes('already exists') || message.includes('VERSION_CONFLICT');
        if (!shouldResolveAgain) {
          failed += 1;
          continue;
        }
        try {
          const refetchPayload = await requestGovernance({
            method: 'GET',
            path: '/auto-pull/rules',
          });
          const matchedRuleId = normalizeAutoPullRulePayload(refetchPayload).find((rule) => rule.name === seed.name)?.rule_id;
          if (!matchedRuleId) {
            failed += 1;
            continue;
          }
          await requestGovernance({
            method: 'PATCH',
            path: `/auto-pull/rules/${encodeURIComponent(matchedRuleId)}`,
            body,
          });
          existingRuleIdByName.set(seed.name, matchedRuleId);
          ruleIdByName.set(seed.name, matchedRuleId);
          updated += 1;
        } catch {
          failed += 1;
        }
      }
    }

    return {
      created,
      updated,
      failed,
      ruleIdByName,
    };
  };

  const bindDevRulesToTopics = async (
    ruleIdByName: Map<string, string>,
  ): Promise<{ updated: number; failed: number }> => {
    let updated = 0;
    let failed = 0;

    for (const topic of manualImportTestTopicProfiles) {
      const ruleNames = devTopicRuleBindingsByTopicId[topic.topic_id] ?? [];
      const ruleIds = ruleNames
        .map((name) => ruleIdByName.get(name))
        .filter((ruleId): ruleId is string => Boolean(ruleId));
      try {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(topic.topic_id)}`,
          body: {
            rule_ids: ruleIds,
          },
        });
        updated += 1;
      } catch {
        failed += 1;
      }
    }

    return { updated, failed };
  };

  const triggerDevRuleRuns = async (
    ruleIds: string[],
  ): Promise<{ triggered: number; failed: number }> => {
    let triggered = 0;
    let failed = 0;
    const uniqueRuleIds = [...new Set(ruleIds)];

    for (const ruleId of uniqueRuleIds) {
      try {
        await requestGovernance({
          method: 'POST',
          path: `/auto-pull/rules/${encodeURIComponent(ruleId)}/runs`,
          body: {
            trigger_type: 'MANUAL',
            full_refresh: false,
          },
        });
        triggered += 1;
      } catch {
        failed += 1;
      }
    }

    return { triggered, failed };
  };

  const handleInjectManualImportTestData = async () => {
    const rows = parseManualUploadToDraftRows('manual-import-test.json', JSON.stringify(manualImportTestItems));
    if (rows.length === 0) {
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: '测试数据注入失败，请检查样例数据。',
      });
      return;
    }

    applyManualImportSessionRows('manual-import-test.json', rows, 'seed');
    const topicSyncResult = await upsertDevTopicProfiles();
    const ruleSyncResult = await upsertDevAutoPullRules();
    const topicRuleBindingResult = await bindDevRulesToTopics(ruleSyncResult.ruleIdByName);
    const runTriggerResult = await triggerDevRuleRuns([...ruleSyncResult.ruleIdByName.values()]);
    await loadTopicProfiles();
    await loadAutoPullRules();
    await loadAutoPullRuns();
    pushLiteratureFeedback({
      slot: 'auto-import',
      level:
        topicSyncResult.failed > 0
        || ruleSyncResult.failed > 0
        || topicRuleBindingResult.failed > 0
        || runTriggerResult.failed > 0
          ? 'warning'
          : 'success',
      message: `DEV 注入完成：主题 新增 ${topicSyncResult.created}/更新 ${topicSyncResult.updated}/失败 ${topicSyncResult.failed}；规则 新增 ${ruleSyncResult.created}/更新 ${ruleSyncResult.updated}/失败 ${ruleSyncResult.failed}；主题绑定 成功 ${topicRuleBindingResult.updated}/失败 ${topicRuleBindingResult.failed}；运行触发 成功 ${runTriggerResult.triggered}/失败 ${runTriggerResult.failed}。`,
    });
  };

  const handleClearInjectedManualImportData = async () => {
    setManualImportSession(null);
    setManualUploadFiles([]);
    setManualShowImportableOnly(false);
    setManualShowErrorOnly(false);
    setManualOpenRowId(null);
    setManualOpenRowPanel(null);
    setManualUploadStatus('idle');
    setManualUploadError(null);

    let deactivated = 0;
    for (const topicId of devInjectedTopicIds) {
      try {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(topicId)}`,
          body: {
            is_active: false,
          },
        });
        deactivated += 1;
      } catch {
        // Ignore missing DEV topics on clear.
      }
    }
    if (deactivated > 0) {
      await loadTopicProfiles();
    }

    pushLiteratureFeedback({
      slot: 'manual-import',
      level: 'info',
      message: `已取消注入数据并清空当前手动导入草稿。DEV 主题停用 ${deactivated} 个。`,
    });
  };

  const handleRemoveManualUploadFile = (fileId: string) => {
    setManualUploadFiles((current) => current.filter((item) => item.id !== fileId));
  };

  const handleManualDraftFieldChange = (
    rowId: string,
    field:
      | 'title'
      | 'abstract'
      | 'authors_text'
      | 'year_text'
      | 'doi'
      | 'arxiv_id'
      | 'source_url'
      | 'tags_text',
    value: string,
  ) => {
    setManualImportSession((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          return {
            ...row,
            [field]: value,
          };
        }),
      };
    });
  };

  const handleToggleManualRowInclude = (rowId: string, include: boolean) => {
    setManualImportSession((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        rows: current.rows.map((row) =>
          row.id === rowId
            ? {
              ...row,
              include,
            }
            : row),
      };
    });
  };

  const handleRemoveManualRow = (rowId: string) => {
    setManualImportSession((current) => {
      if (!current) {
        return current;
      }
      const nextRows = current.rows.filter((row) => row.id !== rowId);
      if (nextRows.length === 0) {
        return null;
      }
      return {
        ...current,
        rows: nextRows,
      };
    });
  };

  const handleToggleManualRowPanel = (rowId: string, panel: 'expand' | 'summary') => {
    if (manualOpenRowId === rowId && manualOpenRowPanel === panel) {
      setManualOpenRowId(null);
      setManualOpenRowPanel(null);
      return;
    }
    setManualOpenRowId(rowId);
    setManualOpenRowPanel(panel);
  };

  const handleCopyManualCellValue = async (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // fall through to execCommand fallback
    }

    try {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    } catch {
      // no-op
    }
  };

  const handleSubmitManualReviewedRows = async () => {
    if (!manualImportSession || manualImportSession.rows.length === 0) {
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'warning',
        message: '请先上传并审阅文献，再执行导入。',
      });
      return;
    }

    const selectedValidRows = manualImportSession.rows
      .map((row) => ({
        row,
        validation: manualValidationByRowId.get(row.id),
      }))
      .filter(
        (entry): entry is { row: ManualDraftRow; validation: ManualRowValidation & { normalized: ManualImportPayload } } =>
          entry.row.include && Boolean(entry.validation?.is_valid && entry.validation.normalized),
      );

    if (selectedValidRows.length === 0) {
      setManualUploadStatus('empty');
      const message = '没有已勾选且通过校验的行可导入。';
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'warning',
        message,
      });
      return;
    }

    setManualUploadLoading(true);
    setManualUploadStatus('saving');
    setManualUploadError(null);

    try {
      const importItems = selectedValidRows.map((entry) => entry.validation.normalized);

      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/import',
        body: {
          items: importItems,
        },
      });
      const root = asRecord(payload);
      const results = Array.isArray(root?.results) ? root.results : [];
      const normalizedResults = results
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => row !== null);

      const newCount = normalizedResults.filter((row) => row.is_new === true).length;
      const dedupCount = normalizedResults.filter((row) => row.is_new === false).length;
      const failedCount = Math.max(0, selectedValidRows.length - normalizedResults.length);
      const fullSuccess = normalizedResults.length === selectedValidRows.length;

      if (fullSuccess) {
        const selectedRowIds = new Set(selectedValidRows.map((entry) => entry.row.id));
        setManualImportSession((current) => {
          if (!current) {
            return current;
          }
          const nextRows = current.rows.filter((row) => !selectedRowIds.has(row.id));
          if (nextRows.length === 0) {
            return null;
          }
          return {
            ...current,
            rows: nextRows,
          };
        });
      }

      setManualUploadStatus('ready');
      setManualUploadError(null);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: failedCount > 0 ? 'warning' : 'success',
        message: `入库完成：新增 ${newCount}，去重 ${dedupCount}，失败 ${failedCount}${fullSuccess ? '' : '。存在失败行，已保留在表格中供继续修正。'}`,
      });

      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '手动导入失败。';
      setManualUploadStatus('error');
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `手动导入失败：${message}`,
      });
    } finally {
      setManualUploadLoading(false);
    }
  };

  const prepareZoteroRequestContext = () => {
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
      return null;
    }

    return { libraryId };
  };

  const requestZoteroPreview = async (libraryId: string) => {
    return requestGovernance({
      method: 'POST',
      path: '/literature/zotero-preview',
      body: {
        library_type: zoteroLibraryType,
        library_id: libraryId,
        api_key: zoteroApiKey.trim() || undefined,
      },
    });
  };

  const handleTestZoteroConnection = async () => {
    const context = prepareZoteroRequestContext();
    if (!context) {
      return;
    }

    setZoteroLoading(true);
    setZoteroAction('test-link');
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestZoteroPreview(context.libraryId);
      const previewResult = computeZoteroPreviewResult(payload, manualImportSession?.rows ?? []);

      setZoteroLinkResult({
        tested: true,
        connected: true,
        totalCount: previewResult.fetchedCount,
        duplicateCount: previewResult.duplicateCount,
        unparsedCount: previewResult.unparsedCount,
        importableCount: previewResult.importableCount,
      });
      setZoteroStatus(previewResult.fetchedCount > 0 ? 'ready' : 'empty');
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: previewResult.fetchedCount > 0 ? 'success' : 'warning',
        message: previewResult.fetchedCount > 0
          ? `链接测试成功：总数 ${previewResult.fetchedCount}，可导入 ${previewResult.importableCount}。`
          : '链接测试成功，但当前未拉取到文献。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zotero 链接测试失败。';
      setZoteroStatus('error');
      setZoteroError(message);
      setZoteroLinkResult({
        ...emptyZoteroLinkResult,
        tested: true,
        connected: false,
      });
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `Zotero 链接测试失败：${message}`,
      });
    } finally {
      setZoteroLoading(false);
      setZoteroAction('idle');
    }
  };

  const handleLoadZoteroToReview = async () => {
    const context = prepareZoteroRequestContext();
    if (!context) {
      return;
    }

    setZoteroLoading(true);
    setZoteroAction('load-to-list');
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestZoteroPreview(context.libraryId);
      const previewResult = computeZoteroPreviewResult(payload, manualImportSession?.rows ?? []);
      setZoteroLinkResult({
        tested: true,
        connected: true,
        totalCount: previewResult.fetchedCount,
        duplicateCount: previewResult.duplicateCount,
        unparsedCount: previewResult.unparsedCount,
        importableCount: previewResult.importableCount,
      });

      if (previewResult.rows.length === 0) {
        setZoteroStatus('empty');
        pushLiteratureFeedback({
          slot: 'manual-import',
          level: 'warning',
          message: '未从 Zotero 拉取到可审阅条目。',
        });
        return;
      }

      const sessionName = `zotero:${zoteroLibraryType}/${context.libraryId}`;
      applyManualImportSessionRows(sessionName, previewResult.rows, 'zotero-preview');
      setZoteroStatus('ready');
      setZoteroError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zotero 预览失败。';
      setZoteroStatus('error');
      setZoteroError(message);
      setZoteroLinkResult({
        ...emptyZoteroLinkResult,
        tested: true,
        connected: false,
      });
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `Zotero 预览失败：${message}`,
      });
    } finally {
      setZoteroLoading(false);
      setZoteroAction('idle');
    }
  };

  const handleImportFromZotero = async () => {
    const context = prepareZoteroRequestContext();
    if (!context) {
      return;
    }

    setZoteroLoading(true);
    setZoteroAction('sync-import');
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/zotero-import',
        body: {
          library_type: zoteroLibraryType,
          library_id: context.libraryId,
          api_key: zoteroApiKey.trim() || undefined,
        },
      });

      const root = asRecord(payload);
      const importedCount = typeof root?.imported_count === 'number' ? root.imported_count : 0;
      setZoteroStatus(importedCount > 0 ? 'ready' : 'empty');
      setZoteroLinkResult((current) => ({
        ...current,
        tested: true,
        connected: true,
      }));
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: importedCount > 0 ? 'success' : 'warning',
        message: `Zotero 同步完成：导入 ${importedCount} 条。`,
      });
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
      setZoteroAction('idle');
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

  const handleTopFeedbackRecovery = () => {
    if (!topFeedback?.recoveryAction) {
      return;
    }

    if (topFeedback.recoveryAction === 'retry-zotero-import') {
      void handleImportFromZotero();
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

  const handleResetLightweightFilters = () => {
    setOverviewKeyword('');
    setOverviewScopeFilter('all');
    setOverviewCitationFilter('all');
    setOverviewRightsFilter('all');
    pushLiteratureFeedback({
      slot: 'overview',
      level: 'info',
      message: '已重置轻量筛选。',
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

  const manualDraftRows = manualImportSession?.rows ?? [];
  const isDevMode = appMode === 'dev';
  const manualRowValidations = useMemo<ManualRowValidation[]>(
    () => validateManualDraftRows(manualDraftRows),
    [manualDraftRows],
  );
  const manualValidationByRowId = useMemo(
    () => new Map(manualRowValidations.map((item) => [item.row_id, item])),
    [manualRowValidations],
  );
  const manualVisibleRows = useMemo(
    () => {
      if (manualShowImportableOnly === manualShowErrorOnly) {
        return manualDraftRows;
      }
      if (manualShowImportableOnly) {
        return manualDraftRows.filter((row) => Boolean(manualValidationByRowId.get(row.id)?.is_valid));
      }
      return manualDraftRows.filter((row) => !manualValidationByRowId.get(row.id)?.is_valid);
    },
    [manualDraftRows, manualShowErrorOnly, manualShowImportableOnly, manualValidationByRowId],
  );
  const manualRowStats = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    let selectedValidCount = 0;
    let selectedInvalidCount = 0;

    for (const row of manualDraftRows) {
      const validation = manualValidationByRowId.get(row.id);
      if (validation?.is_valid) {
        validCount += 1;
        if (row.include) {
          selectedValidCount += 1;
        }
      } else {
        invalidCount += 1;
        if (row.include) {
          selectedInvalidCount += 1;
        }
      }
    }

    return {
      totalCount: manualDraftRows.length,
      validCount,
      invalidCount,
      selectedValidCount,
      selectedInvalidCount,
    };
  }, [manualDraftRows, manualValidationByRowId]);
  const hasManualSession = manualDraftRows.length > 0;

  useEffect(() => {
    if (!manualImportSession) {
      return;
    }

    const invalidSelectedIds = manualDraftRows
      .filter((row) => row.include && !manualValidationByRowId.get(row.id)?.is_valid)
      .map((row) => row.id);

    if (invalidSelectedIds.length === 0) {
      return;
    }

    const invalidIdSet = new Set(invalidSelectedIds);
    setManualImportSession((current) => {
      if (!current) {
        return current;
      }
      let changed = false;
      const nextRows = current.rows.map((row) => {
        if (!row.include || !invalidIdSet.has(row.id)) {
          return row;
        }
        changed = true;
        return {
          ...row,
          include: false,
        };
      });
      if (!changed) {
        return current;
      }
      return {
        ...current,
        rows: nextRows,
      };
    });
  }, [manualDraftRows, manualImportSession, manualValidationByRowId]);

  useEffect(() => {
    if (!manualOpenRowId) {
      return;
    }
    const exists = manualDraftRows.some((row) => row.id === manualOpenRowId);
    if (exists) {
      return;
    }
    setManualOpenRowId(null);
    setManualOpenRowPanel(null);
  }, [manualDraftRows, manualOpenRowId]);

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
  const autoPullRuleById = useMemo(
    () => new Map(autoPullRules.map((rule) => [rule.rule_id, rule])),
    [autoPullRules],
  );
  const latestRunByRuleId = useMemo(() => {
    const latestRuns = new Map<string, AutoPullRun>();
    autoPullRuns.forEach((run) => {
      const current = latestRuns.get(run.rule_id);
      if (!current || resolveRunSortTimeMs(run) > resolveRunSortTimeMs(current)) {
        latestRuns.set(run.rule_id, run);
      }
    });
    return latestRuns;
  }, [autoPullRuns]);
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
      return;
    }
    if (tabKey === 'manual-import' && isManualImportSubTabKey(subTabKey)) {
      setManualImportSubTab(subTabKey);
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
                  const activeSubTabKey =
                    tab.key === 'auto-import'
                      ? autoImportSubTab
                      : tab.key === 'manual-import'
                        ? manualImportSubTab
                        : null;
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
            <>
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
              <div className="sidebar-footer-settings" ref={settingsPanelRef}>
                {settingsPanelOpen ? (
                  <div id="sidebar-settings-panel" className="sidebar-settings-popover" role="dialog" aria-label="侧栏设置">
                    <div className="sidebar-settings-item">
                      <span className="sidebar-settings-item-label">开发模式</span>
                      <button
                        type="button"
                        className={`sidebar-settings-mode-switch${isDevMode ? ' is-dev' : ''}`}
                        role="switch"
                        aria-checked={isDevMode}
                        aria-label="开发模式开关"
                        onClick={() => setAppMode((current) => (current === 'dev' ? 'standard' : 'dev'))}
                      >
                        <span className="sidebar-settings-mode-track" aria-hidden="true">
                          <span className="sidebar-settings-mode-thumb" />
                        </span>
                      </button>
                    </div>
                    <div className="sidebar-settings-divider" aria-hidden="true" />
                    <section className="sidebar-settings-group" aria-label="文献管理设置">
                      <p className="sidebar-settings-group-title">文献管理</p>
                      <label className="sidebar-settings-check">
                        <input
                          type="checkbox"
                          checked={literatureAutoParseDocuments}
                          onChange={(event) => setLiteratureAutoParseDocuments(event.target.checked)}
                        />
                        <span>自动解析文档</span>
                      </label>
                      <label className="sidebar-settings-check">
                        <input
                          type="checkbox"
                          checked={literatureAutoExtractAbstracts}
                          onChange={(event) => setLiteratureAutoExtractAbstracts(event.target.checked)}
                        />
                        <span>自动提取摘要</span>
                      </label>
                    </section>
                    <div className="sidebar-settings-divider" aria-hidden="true" />
                    <button
                      type="button"
                      className="sidebar-settings-item sidebar-settings-item-button"
                      onClick={() => void handleInjectManualImportTestData()}
                      disabled={!isDevMode}
                    >
                      <span>注入测试数据</span>
                      <span className="sidebar-settings-item-arrow" aria-hidden="true">›</span>
                    </button>
                    <button
                      type="button"
                      className="sidebar-settings-item sidebar-settings-item-button"
                      onClick={() => void handleClearInjectedManualImportData()}
                      disabled={!isDevMode}
                    >
                      <span>取消注入数据</span>
                      <span className="sidebar-settings-item-arrow" aria-hidden="true">›</span>
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={`sidebar-settings-trigger${settingsPanelOpen ? ' is-active' : ''}`}
                  onClick={() => setSettingsPanelOpen((current) => !current)}
                  aria-expanded={settingsPanelOpen}
                  aria-controls="sidebar-settings-panel"
                >
                  <span>设置</span>
                </button>
              </div>
            </>
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
                        <div className="topic-settings-table-wrap">
                          {topicProfiles.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无主题设置。</p>
                          ) : (
                            <table className="topic-settings-table">
                              <thead>
                                <tr>
                                  <th className="topic-col-name">名称</th>
                                  <th className="topic-col-range">检索范围</th>
                                  <th className="topic-col-filter">筛选</th>
                                  <th className="topic-col-run">运行记录</th>
                                  <th className="topic-col-rule">生效规则</th>
                                  <th className="topic-col-actions">选项</th>
                                </tr>
                              </thead>
                              <tbody>
                                {topicProfiles.map((profile) => {
                                  const yearStart = profile.default_min_year ?? topicYearMinBound;
                                  const yearEnd = profile.default_max_year ?? topicYearMaxBound;
                                  const venuePreview = profile.venue_filters.length === 0
                                    ? '不限会议与期刊'
                                    : `${profile.venue_filters.slice(0, 3).join('、')}${profile.venue_filters.length > 3 ? '...' : ''}`;
                                  const venueFull = profile.venue_filters.length === 0
                                    ? '不限会议与期刊'
                                    : profile.venue_filters.join('、');
                                  const rangeTooltip = `发布年份：${yearStart} - ${yearEnd}\n期刊范围：${venueFull}`;
                                  const includePreview = profile.include_keywords.length === 0
                                    ? '--'
                                    : `${profile.include_keywords.slice(0, 3).join('、')}${profile.include_keywords.length > 3 ? '...' : ''}`;
                                  const includeFull = profile.include_keywords.length === 0 ? '--' : profile.include_keywords.join('、');
                                  const excludePreview = profile.exclude_keywords.length === 0
                                    ? '--'
                                    : `${profile.exclude_keywords.slice(0, 3).join('、')}${profile.exclude_keywords.length > 3 ? '...' : ''}`;
                                  const excludeFull = profile.exclude_keywords.length === 0 ? '--' : profile.exclude_keywords.join('、');
                                  const filterTooltip = `包含：${includeFull}\n排除：${excludeFull}`;
                                  const effectiveRuleId = profile.rule_ids[0] ?? null;
                                  const effectiveRule = effectiveRuleId ? autoPullRuleById.get(effectiveRuleId) ?? null : null;
                                  const latestRun = effectiveRuleId ? (latestRunByRuleId.get(effectiveRuleId) ?? null) : null;

                                  return (
                                    <tr key={profile.topic_id}>
                                      <td className="topic-col-name">
                                        <div className="topic-settings-name">
                                          <button
                                            type="button"
                                            className="topic-settings-name-trigger"
                                            onClick={() => handleEditTopicProfile(profile)}
                                          >
                                            {profile.name}
                                          </button>
                                          {!profile.is_active ? <span className="topic-settings-muted-tag">已关闭</span> : null}
                                        </div>
                                      </td>
                                      <td className="topic-col-range">
                                        <div className="topic-settings-range" title={rangeTooltip}>
                                          <span>{yearStart} - {yearEnd}</span>
                                          <span>{venuePreview}</span>
                                        </div>
                                      </td>
                                      <td className="topic-col-filter">
                                        <div className="topic-settings-filter" title={filterTooltip}>
                                          <span>包含：{includePreview}</span>
                                          <span>排除：{excludePreview}</span>
                                        </div>
                                      </td>
                                      <td className="topic-col-run">
                                        <div className="topic-settings-run-record">
                                          <span>{latestRun ? formatTimestamp(resolveRunSortTimestamp(latestRun)) : '--'}</span>
                                          <span className={`topic-settings-run-status${latestRun ? ` is-${latestRun.status.toLowerCase()}` : ''}`}>
                                            {latestRun ? autoPullRunStatusLabels[latestRun.status] : '未执行'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="topic-col-rule">
                                        <div className="topic-settings-rule-text">
                                          {effectiveRule?.status !== 'ACTIVE' ? (
                                            <span className="topic-settings-muted-text">--</span>
                                          ) : (
                                            <span>
                                              {effectiveRule.name}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="topic-col-actions">
                                        <div className="topic-settings-options">
                                          <label className="topic-list-active-toggle">
                                            <input
                                              type="checkbox"
                                              checked={profile.is_active}
                                              onChange={() => void handleToggleTopicProfileActive(profile)}
                                            />
                                            <span>参与检索</span>
                                          </label>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
                                <div className="topic-rule-binding-column">
                                    <div className="topic-rule-binding-header-row">
                                      <h4 className="topic-modal-section-title">规则绑定</h4>
                                      <div className="topic-rule-header-actions" data-ui="toolbar" data-gap="1">
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          className="topic-rule-header-action"
                                          onClick={() => void handleSubmitRule({
                                            bindToTopicDraft: true,
                                          })}
                                        >
                                          保存
                                        </button>
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          className="topic-rule-header-action"
                                          onClick={handleResetTopicRuleComposer}
                                        >
                                          重置
                                        </button>
                                      </div>
                                    </div>
                                    <div className="topic-rule-binding-card">
                                      {topicScopedRules.length === 0 ? null : (
                                        <div className="topic-rule-selector-list">
                                          {topicScopedRules.map((rule) => (
                                            <div key={rule.rule_id} className="topic-rule-selector-item">
                                              <label className="auto-pull-source-toggle">
                                                <input
                                                  type="checkbox"
                                                  checked={topicFormRuleIds.includes(rule.rule_id)}
                                                  onChange={() => handleToggleTopicRuleSelection(rule.rule_id)}
                                                />
                                                {rule.name}
                                              </label>
                                              <div data-ui="toolbar" data-gap="2">
                                                <button
                                                  data-ui="button"
                                                  data-variant="ghost"
                                                  data-size="sm"
                                                  type="button"
                                                  onClick={() => {
                                                    handleEditRule(rule);
                                                  }}
                                                >
                                                  编辑
                                                </button>
                                                <button
                                                  data-ui="button"
                                                  data-variant="secondary"
                                                  data-size="sm"
                                                  type="button"
                                                  onClick={() => void handleRunRuleFullRefresh(rule)}
                                                >
                                                  全量重抓
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      <section className="topic-rule-inline-editor">
                                        <div className="topic-rule-row-primary">
                                          <label data-ui="field" className="topic-rule-name-field">
                                            <span data-slot="label">规则名称</span>
                                            <input
                                              data-ui="input"
                                              data-size="sm"
                                              value={ruleFormName}
                                              onChange={(event) => setRuleFormName(event.target.value)}
                                              placeholder="例如 每日增量拉取"
                                            />
                                          </label>
                                          <div data-ui="field" className="topic-rule-plan-field">
                                            <span data-slot="label">调度计划</span>
                                            <div className="topic-rule-plan-box">
                                              <div className="topic-rule-plan-item">
                                                <div className="rule-frequency-toggle" role="group" aria-label="调度频率">
                                                  <button
                                                    type="button"
                                                    className={`rule-frequency-toggle-button${ruleFormFrequency === 'DAILY' ? ' is-active' : ''}`}
                                                    onClick={() => setRuleFormFrequency('DAILY')}
                                                    aria-pressed={ruleFormFrequency === 'DAILY'}
                                                  >
                                                    按日
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className={`rule-frequency-toggle-button${ruleFormFrequency === 'WEEKLY' ? ' is-active' : ''}`}
                                                    onClick={() => setRuleFormFrequency('WEEKLY')}
                                                    aria-pressed={ruleFormFrequency === 'WEEKLY'}
                                                  >
                                                    按周
                                                  </button>
                                                </div>
                                              </div>
                                              <label className="topic-rule-plan-item">
                                                <select
                                                  data-ui="select"
                                                  data-size="sm"
                                                  aria-label="按整点执行时间"
                                                  value={scheduleHourValue}
                                                  onChange={(event) => {
                                                    setRuleFormHourInput(event.target.value);
                                                    setRuleFormMinuteInput('0');
                                                  }}
                                                >
                                                  {autoPullHourOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                  ))}
                                                </select>
                                              </label>
                                              <label className="topic-rule-plan-item">
                                                <select
                                                  data-ui="select"
                                                  data-size="sm"
                                                  aria-label="按周执行星期"
                                                  value={ruleFormWeekday}
                                                  onChange={(event) => setRuleFormWeekday(event.target.value as AutoPullWeekday)}
                                                  disabled={ruleFormFrequency !== 'WEEKLY'}
                                                >
                                                  {autoPullWeekdayOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                  ))}
                                                </select>
                                              </label>
                                            </div>
                                          </div>
                                          <div data-ui="field" className="topic-rule-source-field">
                                            <span data-slot="label">来源</span>
                                            <div className="topic-rule-source-box">
                                              <label className={`topic-rule-source-option${ruleSourceCrossref ? ' is-active' : ''}`}>
                                                <input type="checkbox" checked={ruleSourceCrossref} onChange={(event) => setRuleSourceCrossref(event.target.checked)} />
                                                <span>CROSSREF</span>
                                              </label>
                                              <label className={`topic-rule-source-option${ruleSourceArxiv ? ' is-active' : ''}`}>
                                                <input type="checkbox" checked={ruleSourceArxiv} onChange={(event) => setRuleSourceArxiv(event.target.checked)} />
                                                <span>ARXIV</span>
                                              </label>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="topic-rule-row-secondary">
                                          <label data-ui="field">
                                            <span data-slot="label" className="field-label-with-help">
                                              质量门槛
                                              <span
                                                className="field-label-help"
                                                data-help={autoPullQualityHint}
                                                aria-label="质量门槛说明"
                                                tabIndex={0}
                                                onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                                onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                              >
                                                ?
                                              </span>
                                            </span>
                                            <select
                                              data-ui="select"
                                              data-size="sm"
                                              value={ruleFormMinCompletenessInput}
                                              onChange={(event) => setRuleFormMinCompletenessInput(event.target.value)}
                                            >
                                              {autoPullQualityPresetOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                              ))}
                                            </select>
                                          </label>
                                          <label data-ui="field">
                                            <span data-slot="label" className="field-label-with-help">
                                              滑动窗口（天）
                                              <span
                                                className="field-label-help"
                                                data-help={autoPullLookbackHint}
                                                aria-label="滑动窗口说明"
                                                tabIndex={0}
                                                onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                                onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                              >
                                                ?
                                              </span>
                                            </span>
                                            <input
                                              data-ui="input"
                                              data-size="sm"
                                              value={ruleFormLookbackInput}
                                              onChange={(event) => setRuleFormLookbackInput(event.target.value)}
                                            />
                                          </label>
                                          <label data-ui="field">
                                            <span data-slot="label" className="field-label-with-help">
                                              每次拉取上限
                                              <span
                                                className="field-label-help"
                                                data-help={autoPullLimitHint}
                                                aria-label="每次拉取上限说明"
                                                tabIndex={0}
                                                onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                                onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                              >
                                                ?
                                              </span>
                                            </span>
                                            <input
                                              data-ui="input"
                                              data-size="sm"
                                              value={ruleFormMaxResultsInput}
                                              onChange={(event) => setRuleFormMaxResultsInput(event.target.value)}
                                            />
                                          </label>
                                          <div data-ui="field" className="topic-rule-toggle-field">
                                            <span data-slot="label" className="field-label-with-help">
                                              排序规则
                                              <span
                                                className="field-label-help"
                                                data-help={autoPullSortHint}
                                                aria-label="排序规则说明"
                                                tabIndex={0}
                                                onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                                onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                              >
                                                ?
                                              </span>
                                            </span>
                                            <div className="rule-option-toggle" role="group" aria-label="排序规则">
                                              <button
                                                type="button"
                                                className={`rule-option-toggle-button${ruleFormSortMode === 'llm_score' ? ' is-active' : ''}`}
                                                onClick={() => setRuleFormSortMode('llm_score')}
                                                aria-pressed={ruleFormSortMode === 'llm_score'}
                                              >
                                                大模型打分
                                              </button>
                                              <button
                                                type="button"
                                                className={`rule-option-toggle-button${ruleFormSortMode === 'hybrid_score' ? ' is-active' : ''}`}
                                                onClick={() => setRuleFormSortMode('hybrid_score')}
                                                aria-pressed={ruleFormSortMode === 'hybrid_score'}
                                              >
                                                综合评分
                                              </button>
                                            </div>
                                          </div>
                                          <div data-ui="field" className="topic-rule-toggle-field">
                                            <span data-slot="label" className="field-label-with-help">
                                              解析内容并入库
                                              <span
                                                className="field-label-help"
                                                data-help={autoPullParseHint}
                                                aria-label="解析内容并入库说明"
                                                tabIndex={0}
                                                onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                                onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                              >
                                                ?
                                              </span>
                                            </span>
                                            <div className="rule-option-toggle" role="group" aria-label="解析内容并入库">
                                              <button
                                                type="button"
                                                className={`rule-option-toggle-button${!ruleFormParseAndIngest ? ' is-active' : ''}`}
                                                onClick={() => setRuleFormParseAndIngest(false)}
                                                aria-pressed={!ruleFormParseAndIngest}
                                              >
                                                关闭
                                              </button>
                                              <button
                                                type="button"
                                                className={`rule-option-toggle-button${ruleFormParseAndIngest ? ' is-active' : ''}`}
                                                onClick={() => setRuleFormParseAndIngest(true)}
                                                aria-pressed={ruleFormParseAndIngest}
                                              >
                                                开启
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        {rulesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{rulesError}</p> : null}
                                      </section>
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
                              {(selectedRunDetail.source_attempts ?? []).map((attempt) => {
                                const meta = asRecord(attempt.meta) ?? {};
                                const incompleteRejectedCount =
                                  typeof meta.incomplete_rejected_count === 'number' ? meta.incomplete_rejected_count : 0;
                                const duplicateSkippedCount =
                                  typeof meta.duplicate_skipped_count === 'number' ? meta.duplicate_skipped_count : 0;
                                const belowThresholdCount =
                                  typeof meta.below_threshold_count === 'number' ? meta.below_threshold_count : 0;
                                const eligibleCount =
                                  typeof meta.eligible_count === 'number' ? meta.eligible_count : 0;
                                const importedNewCount =
                                  typeof meta.imported_new_count === 'number' ? meta.imported_new_count : 0;
                                const importedExistingCount =
                                  typeof meta.imported_existing_count === 'number' ? meta.imported_existing_count : 0;
                                const llmScoreAvg =
                                  typeof meta.llm_score_avg === 'number' ? meta.llm_score_avg : null;

                                return (
                                  <div key={`${selectedRunDetail.run_id}-${attempt.source}`} className="literature-list-item">
                                    <div>
                                      <p data-ui="text" data-variant="body" data-tone="primary">
                                        {attempt.source} · {attempt.status}
                                      </p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        fetched:{attempt.fetched_count} / imported:{attempt.imported_count} / failed:{attempt.failed_count}
                                      </p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        不完整:{incompleteRejectedCount} / 去重跳过:{duplicateSkippedCount} / 低于门槛:{belowThresholdCount} / 可导入:{eligibleCount}
                                      </p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        新增:{importedNewCount} / 命中既有:{importedExistingCount}
                                        {llmScoreAvg !== null ? ` / 平均质量分:${llmScoreAvg}` : ''}
                                      </p>
                                    </div>
                                    {attempt.error_message ? (
                                      <p data-ui="text" data-variant="caption" data-tone="danger">{attempt.error_message}</p>
                                    ) : null}
                                  </div>
                                );
                              })}
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
                  <section className="literature-tab-panel manual-import-panel">
                    <section className="manual-import-top-pane">
                      {manualImportSubTab === 'file-review' ? (
                        <section
                          className="literature-section-block manual-upload-card"
                          data-upload-status={manualUploadStatus}
                        >
                          <div className="manual-upload-workbench">
                            <label
                              className={`manual-upload-dropzone${manualDropActive ? ' is-drag-active' : ''}${manualUploadLoading ? ' is-loading' : ''}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDragEnter={(event) => {
                                event.preventDefault();
                                setManualDropActive(true);
                              }}
                              onDragLeave={(event) => {
                                event.preventDefault();
                                setManualDropActive(false);
                              }}
                              onDrop={(event) => void handleManualUploadDrop(event)}
                            >
                              <input
                                className="manual-upload-input"
                                type="file"
                                multiple
                                accept=".json,.csv,.bib,.bibtex,.txt,.pdf,.tex,.ltx,.bbl,.aux,.ris"
                                onChange={(event) => void handleManualUpload(event)}
                              />
                              <span className="manual-upload-dropzone-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                  <path d="M4.5 7.2h15a1.8 1.8 0 0 1 1.8 1.8v6a2.3 2.3 0 0 1-2.3 2.3H4.9A2.3 2.3 0 0 1 2.6 15V9a1.8 1.8 0 0 1 1.9-1.8Z" />
                                  <path d="m3.3 8.2 8.7 6 8.7-6" />
                                </svg>
                              </span>
                              {manualUploadLoading ? (
                                <span className="manual-upload-dropzone-title">文件解析中...</span>
                              ) : null}
                              <span className="manual-upload-dropzone-action">选择或拖拽文件</span>
                            </label>

                            <section className="manual-upload-files-pane" aria-label="已接收上传文件">
                              <div className="manual-upload-files-pane-scroll">
                                <table className="manual-upload-files-table">
                                  <thead>
                                    <tr>
                                      <th>文件名称</th>
                                      <th>
                                        <span className="manual-upload-format-heading">
                                          格式
                                          <span
                                            className="manual-upload-format-help"
                                            data-help={manualUploadFormatHint}
                                            aria-label="查看支持文件格式"
                                            tabIndex={0}
                                            onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                            onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                          >
                                            ?
                                          </span>
                                        </span>
                                      </th>
                                      <th>处理状态</th>
                                      <th>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {manualUploadFiles.length === 0 ? (
                                      <tr>
                                        <td colSpan={4}>暂无上传文件。</td>
                                      </tr>
                                    ) : (
                                      manualUploadFiles.map((fileItem) => {
                                        const canRunLlmActions = isManualUploadLlmSupported(fileItem.fileName)
                                          && fileItem.status !== 'duplicate'
                                          && fileItem.status !== 'processing';
                                        return (
                                          <tr key={fileItem.id}>
                                            <td title={fileItem.fileName}>{fileItem.fileName}</td>
                                            <td>{fileItem.format}</td>
                                            <td>
                                              <span
                                                className={`manual-upload-file-status is-${fileItem.status}`}
                                              >
                                                {formatManualUploadFileStatusLabel(fileItem)}
                                              </span>
                                            </td>
                                            <td>
                                              <div className="manual-upload-file-actions">
                                                {canRunLlmActions ? (
                                                  <>
                                                    <button
                                                      className="manual-upload-file-action"
                                                      type="button"
                                                      onClick={() => void handleManualUploadFileLlmAction(fileItem.id, 'parse')}
                                                    >
                                                      解析
                                                    </button>
                                                    <button
                                                      className="manual-upload-file-action"
                                                      type="button"
                                                      onClick={() => void handleManualUploadFileLlmAction(fileItem.id, 'abstract')}
                                                    >
                                                      提取摘要
                                                    </button>
                                                  </>
                                                ) : null}
                                                <button
                                                  className="manual-upload-file-action is-danger"
                                                  type="button"
                                                  onClick={() => handleRemoveManualUploadFile(fileItem.id)}
                                                  disabled={fileItem.status === 'processing'}
                                                >
                                                  移除
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          </div>
                          {manualUploadError ? (
                            <p data-ui="text" data-variant="caption" data-tone="danger">
                              {manualUploadError}
                            </p>
                          ) : null}
                        </section>
                      ) : (
                        <section className="literature-section-block manual-zotero-card">
                          <div className="zotero-workbench">
                            <div className="zotero-config-pane">
                              <div className="zotero-config-card">
                                <p className="zotero-result-title">连接配置</p>
                                <label data-ui="field">
                                  <span data-slot="label">文库类型</span>
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
                              </div>
                            </div>

                            <div className="zotero-result-pane" data-zotero-status={zoteroStatus}>
                              <div className="zotero-result-header">
                                <p className="zotero-result-title">链接测试结果</p>
                                <button
                                  data-ui="button"
                                  data-variant="secondary"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => void handleTestZoteroConnection()}
                                  disabled={zoteroLoading}
                                >
                                  {zoteroLoading && zoteroAction === 'test-link' ? '测试中...' : '测试链接'}
                                </button>
                              </div>

                              <div className="zotero-result-grid">
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">是否连接成功</span>
                                  <span className={`zotero-result-value ${zoteroLinkResult.tested ? (zoteroLinkResult.connected ? 'is-success' : 'is-error') : ''}`.trim()}>
                                    {zoteroLinkResult.tested ? (zoteroLinkResult.connected ? '成功' : '失败') : '未测试'}
                                  </span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">文献总数</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.totalCount : '--'}</span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">重复文献</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.duplicateCount : '--'}</span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">未解析文献</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.unparsedCount : '--'}</span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">可导入文献</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.importableCount : '--'}</span>
                                </div>
                              </div>

                              {zoteroError ? <p data-ui="text" data-variant="caption" data-tone="danger">{zoteroError}</p> : null}

                              <div className="zotero-result-actions">
                                <button
                                  data-ui="button"
                                  data-variant="secondary"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => void handleLoadZoteroToReview()}
                                  disabled={zoteroLoading}
                                >
                                  {zoteroLoading && zoteroAction === 'load-to-list' ? '拉取中...' : '拉取到列表'}
                                </button>
                                <button
                                  data-ui="button"
                                  data-variant="primary"
                                  data-size="sm"
                                  type="button"
                                  onClick={handleImportFromZotero}
                                  disabled={zoteroLoading}
                                >
                                  {zoteroLoading && zoteroAction === 'sync-import' ? '同步中...' : '一键同步导入'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                    </section>

                    <section className="literature-section-block manual-import-bottom-pane">
                      <div className="manual-import-actions-scroll">
                        <div className="manual-import-actions-row">
                          <div className="manual-actions-group">
                            <label className="manual-check-toggle">
                              <input
                                type="checkbox"
                                checked={manualShowImportableOnly}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setManualShowImportableOnly(checked);
                                  if (checked) {
                                    setManualShowErrorOnly(false);
                                  }
                                }}
                                disabled={!hasManualSession}
                              />
                              可导入行
                            </label>
                            <label className="manual-check-toggle">
                              <input
                                type="checkbox"
                                checked={manualShowErrorOnly}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setManualShowErrorOnly(checked);
                                  if (checked) {
                                    setManualShowImportableOnly(false);
                                  }
                                }}
                                disabled={!hasManualSession}
                              />
                              错误行
                            </label>
                          </div>

                          <div className="manual-actions-group manual-actions-group-status">
                            <span className="manual-status-plain">
                              可导入 {manualRowStats.selectedValidCount}
                            </span>
                            <span className="manual-status-plain manual-status-error">
                              错误 {manualRowStats.invalidCount}
                            </span>
                            {manualRowStats.selectedInvalidCount > 0 ? (
                              <span className="manual-status-plain manual-status-skip" title="提交时将自动跳过未通过校验行。">
                                跳过 {manualRowStats.selectedInvalidCount}
                              </span>
                            ) : null}
                          </div>

                          <button
                            className="manual-import-submit-button"
                            data-ui="button"
                            data-variant="primary"
                            data-size="sm"
                            type="button"
                            onClick={() => void handleSubmitManualReviewedRows()}
                            disabled={!hasManualSession || manualUploadLoading || manualRowStats.selectedValidCount === 0}
                          >
                            {manualUploadLoading ? '导入中...' : '导入'}
                          </button>
                        </div>
                      </div>

                      <div className="manual-import-table-shell">
                        <table className="manual-import-table">
                          <colgroup>
                            <col className="manual-col-select" />
                            <col className="manual-col-title" />
                            <col className="manual-col-authors" />
                            <col className="manual-col-year" />
                            <col className="manual-col-doi" />
                            <col className="manual-col-arxiv" />
                            <col className="manual-col-source" />
                            <col className="manual-col-tags" />
                            <col className="manual-col-actions" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th aria-label="导入选择" />
                              <th>标题</th>
                              <th>作者</th>
                              <th>年份</th>
                              <th>DOI</th>
                              <th>arXiv ID</th>
                              <th>来源链接</th>
                              <th>标签</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manualVisibleRows.length === 0 ? (
                              <tr>
                                <td colSpan={9}>
                                  {manualShowImportableOnly && !manualShowErrorOnly
                                    ? '暂无可导入行。'
                                    : manualShowErrorOnly && !manualShowImportableOnly
                                      ? '暂无错误行。'
                                      : '当前没有待审阅行。'}
                                </td>
                              </tr>
                            ) : (
                              manualVisibleRows.map((row) => {
                                const validation = manualValidationByRowId.get(row.id);
                                const isRowValid = Boolean(validation?.is_valid);
                                const isRowOpened = manualOpenRowId === row.id;
                                const isSummaryOpened = isRowOpened && manualOpenRowPanel === 'summary';
                                const isExpandOpened = isRowOpened && manualOpenRowPanel === 'expand';
                                const fieldErrors = mapManualValidationErrors(validation);
                                const titleError = getManualFieldErrorText(fieldErrors, 'title');
                                const authorsError = getManualFieldErrorText(fieldErrors, 'authors_text');
                                const yearError = getManualFieldErrorText(fieldErrors, 'year_text');
                                const doiError = getManualFieldErrorText(fieldErrors, 'doi');
                                const arxivError = getManualFieldErrorText(fieldErrors, 'arxiv_id');
                                const sourceUrlError = getManualFieldErrorText(fieldErrors, 'source_url');
                                return (
                                  <Fragment key={row.id}>
                                    <tr className={isRowOpened ? 'is-row-opened' : ''}>
                                      <td className="manual-select-cell">
                                        <input
                                          type="checkbox"
                                          checked={isRowValid ? row.include : false}
                                          disabled={!isRowValid}
                                          onChange={(event) =>
                                            handleToggleManualRowInclude(row.id, event.target.checked)
                                          }
                                        />
                                      </td>
                                      <td
                                        className={`manual-cell${titleError ? ' has-error' : ''}`}
                                        data-error-text={titleError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.title}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'title', event.target.value)
                                            }
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.title}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'title', event.target.value)
                                            }
                                          />
                                        )}
                                        {!titleError && row.title.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.title)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${authorsError ? ' has-error' : ''}`}
                                        data-error-text={authorsError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.authors_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'authors_text', event.target.value)
                                            }
                                            placeholder="Alice, Bob"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.authors_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'authors_text', event.target.value)
                                            }
                                            placeholder="Alice, Bob"
                                          />
                                        )}
                                        {!authorsError && row.authors_text.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.authors_text)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell manual-cell-year${yearError ? ' has-error' : ''}`}
                                        data-error-text={yearError || undefined}
                                      >
                                        <input
                                          className="manual-field-input"
                                          data-ui="input"
                                          data-size="sm"
                                          value={row.year_text}
                                          onChange={(event) =>
                                            handleManualDraftFieldChange(row.id, 'year_text', event.target.value)
                                          }
                                          placeholder="2024"
                                        />
                                        {!yearError && row.year_text.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.year_text)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${doiError ? ' has-error' : ''}`}
                                        data-error-text={doiError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.doi}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'doi', event.target.value)
                                            }
                                            placeholder="10.1000/xyz"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.doi}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'doi', event.target.value)
                                            }
                                            placeholder="10.1000/xyz"
                                          />
                                        )}
                                        {!doiError && row.doi.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.doi)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${arxivError ? ' has-error' : ''}`}
                                        data-error-text={arxivError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.arxiv_id}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'arxiv_id', event.target.value)
                                            }
                                            placeholder="2401.00001"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.arxiv_id}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'arxiv_id', event.target.value)
                                            }
                                            placeholder="2401.00001"
                                          />
                                        )}
                                        {!arxivError && row.arxiv_id.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.arxiv_id)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${sourceUrlError ? ' has-error' : ''}`}
                                        data-error-text={sourceUrlError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.source_url}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'source_url', event.target.value)
                                            }
                                            placeholder="https://..."
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.source_url}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'source_url', event.target.value)
                                            }
                                            placeholder="https://..."
                                          />
                                        )}
                                        {!sourceUrlError && row.source_url.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.source_url)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td className="manual-cell">
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.tags_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'tags_text', event.target.value)
                                            }
                                            placeholder="survey, baseline"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.tags_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'tags_text', event.target.value)
                                            }
                                            placeholder="survey, baseline"
                                          />
                                        )}
                                        {row.tags_text.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.tags_text)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td className="manual-ops-cell">
                                        <div className="manual-ops-actions">
                                          <button
                                            className="manual-row-action"
                                            type="button"
                                            onClick={() => handleToggleManualRowPanel(row.id, 'expand')}
                                          >
                                            {isExpandOpened ? '收起' : '展开'}
                                          </button>
                                          <button
                                            className="manual-row-action"
                                            type="button"
                                            onClick={() => handleToggleManualRowPanel(row.id, 'summary')}
                                          >
                                            {isSummaryOpened ? '收起摘要' : '摘要'}
                                          </button>
                                          <button
                                            className="manual-row-action is-danger"
                                            type="button"
                                            onClick={() => handleRemoveManualRow(row.id)}
                                          >
                                            删除
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    {isSummaryOpened ? (
                                      <tr className="manual-abstract-row">
                                        <td colSpan={9}>
                                          <div className="manual-abstract-editor">
                                            <div className="manual-abstract-header">
                                              <span>摘要</span>
                                              {row.abstract.trim() ? (
                                                <button
                                                  className="manual-copy-action is-visible"
                                                  type="button"
                                                  onClick={() => void handleCopyManualCellValue(row.abstract)}
                                                >
                                                  复制
                                                </button>
                                              ) : null}
                                            </div>
                                            <textarea
                                              className="manual-abstract-textarea"
                                              value={row.abstract}
                                              placeholder="可在此补充或修改摘要..."
                                              onChange={(event) =>
                                                handleManualDraftFieldChange(row.id, 'abstract', event.target.value)
                                              }
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    ) : null}
                                  </Fragment>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </section>
                ) : null}

                {activeLiteratureTab === 'overview' ? (
                  <section className="literature-overview-panel">
                    <section className="literature-query-builder">
                      <div className="literature-quick-filters">
                        <div className="literature-quick-row">
                          <label data-ui="field">
                            <span data-slot="label">Topic</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={topicIdInput}
                              onChange={(event) => setTopicIdInput(event.target.value)}
                              placeholder="TOPIC-001"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">Paper</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={paperIdInput}
                              onChange={(event) => setPaperIdInput(event.target.value)}
                              placeholder="P001"
                            />
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">关键词</span>
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={overviewKeyword}
                              onChange={(event) => setOverviewKeyword(event.target.value)}
                              placeholder="标题 / 作者 / DOI / arXiv"
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
                        </div>
                        <div className="literature-quick-row">
                          <label data-ui="field">
                            <span data-slot="label">范围状态</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={overviewScopeFilter}
                              onChange={(event) => setOverviewScopeFilter(event.target.value as OverviewScopeFilter)}
                            >
                              <option value="all">全部</option>
                              <option value="in_scope">in_scope</option>
                              <option value="excluded">excluded</option>
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">引用状态</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={overviewCitationFilter}
                              onChange={(event) => setOverviewCitationFilter(event.target.value as OverviewCitationFilter)}
                            >
                              <option value="all">全部</option>
                              {citationStatusOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">权限</span>
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={overviewRightsFilter}
                              onChange={(event) => setOverviewRightsFilter(event.target.value as OverviewRightsFilter)}
                            >
                              <option value="all">全部</option>
                              {rightsClassOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label data-ui="field">
                            <span data-slot="label">排序</span>
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
                          <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleResetLightweightFilters}>
                            重置筛选
                          </button>
                        </div>
                      </div>
                    </section>

                    {topicScopeLoading ? <p data-ui="text" data-variant="caption" data-tone="muted">正在同步选题范围状态...</p> : null}
                    {topicScopeError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicScopeError}</p> : null}
                    {overviewPanel.status === 'loading' ? (
                      <p data-ui="text" data-variant="caption" data-tone="muted">正在加载综览...</p>
                    ) : null}
                    {overviewPanel.status === 'error' ? (
                      <p data-ui="text" data-variant="caption" data-tone="danger">{overviewPanel.error ?? '综览加载失败。'}</p>
                    ) : null}

                    <section className="literature-overview-table-wrap">
                      <table className="literature-overview-table">
                        <thead>
                          <tr className="literature-overview-table-summary-row">
                            <th colSpan={6}>
                              <div className="literature-overview-table-summary">
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
                                  Top Tags{' '}
                                  <strong>
                                    {overviewPanel.data.summary.top_tags.slice(0, 2).map((tag) => tag.tag).join(' / ') || '--'}
                                  </strong>
                                </span>
                              </div>
                            </th>
                          </tr>
                          <tr>
                            <th>标题与来源</th>
                            <th>作者 / 年份</th>
                            <th>状态</th>
                            <th>标签</th>
                            <th>权限</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewResultItems.length === 0 ? (
                            <tr>
                              <td colSpan={6}>
                                <p data-ui="text" data-variant="caption" data-tone="muted" className="literature-overview-table-empty">
                                  暂无可展示文献，请先导入或调整筛选。
                                </p>
                              </td>
                            </tr>
                          ) : (
                            overviewResultItems.map((item) => {
                              const draft = metadataDrafts[item.literature_id] ?? {
                                tagsInput: item.tags.join(', '),
                                rightsClass: item.rights_class,
                              };

                              return (
                                <tr key={item.literature_id}>
                                  <td>
                                    <div className="literature-overview-main">
                                      <p data-ui="text" data-variant="body" data-tone="primary">{item.title}</p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        doi: {item.doi ?? '--'} · arxiv: {item.arxiv_id ?? '--'}
                                      </p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        provider: {item.providers.join(', ') || '--'}
                                      </p>
                                      {item.source_url ? (
                                        <a className="literature-source-link" href={item.source_url} target="_blank" rel="noreferrer">
                                          来源链接
                                        </a>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="literature-overview-main">
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        {item.authors.join(', ') || '--'}
                                      </p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        年份: {item.year ?? '--'}
                                      </p>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="literature-overview-main">
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        scope: {item.topic_scope_status ?? '--'}
                                      </p>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        citation: {item.citation_status ?? '--'}
                                      </p>
                                    </div>
                                  </td>
                                  <td>
                                    <input
                                      data-ui="input"
                                      data-size="sm"
                                      value={draft.tagsInput}
                                      onChange={(event) =>
                                        handleChangeMetadataDraft(item.literature_id, 'tagsInput', event.target.value)
                                      }
                                      placeholder="标签：survey, baseline, method:nlp"
                                    />
                                  </td>
                                  <td>
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
                                  </td>
                                  <td>
                                    <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-overview-actions">
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
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
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
