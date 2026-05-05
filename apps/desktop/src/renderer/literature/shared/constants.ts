import type { ThemeMode } from '../../theme';
import type { ManualImportPayload } from '../manual-import-types';
import type {
  ArtifactBundle,
  AutoImportSubTabKey,
  AutoPullRunStatus,
  AutoPullScope,
  AutoPullWeekday,
  CitationStatus,
  ContentProcessingSubTabKey,
  LiteratureOverviewData,
  LiteratureOverviewSummary,
  LiteratureTabKey,
  ManualImportSubTabKey,
  QuerySortPreset,
  RuntimeMetric,
  TitleCardPrimaryTabKey,
  ZoteroLinkResult,
} from './types';

export const coreNavItems = ['文献管理', '选题管理', '论文管理'];
export const writingNavItems = ['写作中心', '投稿检查'];
export const themeModeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];
export const APP_MODE_STORAGE_KEY = 'pea.app.mode';

export const initialModule = coreNavItems[0] ?? '';
export const citationStatusOptions: CitationStatus[] = ['seeded', 'selected', 'used', 'cited', 'dropped'];
export const literatureTabs: Array<{ key: LiteratureTabKey; label: string }> = [
  { key: 'auto-import', label: '自动导入' },
  { key: 'manual-import', label: '手动导入' },
  { key: 'overview', label: '文献综览' },
  { key: 'content-processing', label: '内容处理' },
];
export const titleCardTabs: Array<{ key: TitleCardPrimaryTabKey; label: string }> = [
  { key: 'overview', label: '总揽' },
  { key: 'evidence', label: '证据' },
  { key: 'need', label: '需求' },
  { key: 'research-question', label: '研究问题' },
  { key: 'value', label: '价值' },
  { key: 'package', label: '方案' },
  { key: 'promotion', label: '晋升' },
];
export const autoImportSubTabs: Array<{ key: AutoImportSubTabKey; label: string }> = [
  { key: 'topic-settings', label: '设置主题' },
  { key: 'rule-center', label: '规则中心' },
  { key: 'runs-alerts', label: '执行详情' },
];
export const manualImportSubTabs: Array<{ key: ManualImportSubTabKey; label: string }> = [
  { key: 'file-review', label: '本地文件' },
  { key: 'zotero-sync', label: 'Zotero' },
];
export const contentProcessingSubTabs: Array<{ key: ContentProcessingSubTabKey; label: string }> = [
  { key: 'operations', label: '操作' },
  { key: 'settings', label: '设置' },
];
export const autoPullWeekdayOptions: Array<{ value: AutoPullWeekday; label: string }> = [
  { value: 'MON', label: '周一' },
  { value: 'TUE', label: '周二' },
  { value: 'WED', label: '周三' },
  { value: 'THU', label: '周四' },
  { value: 'FRI', label: '周五' },
  { value: 'SAT', label: '周六' },
  { value: 'SUN', label: '周日' },
];
export const autoPullHourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));
export const autoPullQualityPresetOptions: Array<{ value: string; label: string }> = [
  { value: '60', label: '60（宽松）' },
  { value: '70', label: '70（标准，默认）' },
  { value: '80', label: '80（严格）' },
  { value: '90', label: '90（高严格）' },
];
export const manualUploadFormatHint = [
  '可解析：JSON / CSV / BibTeX / TXT',
  '待解析支持：PDF / TeX / BBL / AUX / RIS',
].join('\n');
export const autoPullQualityHint = [
  '质量检测流程：',
  '1) 完整性校验：标题、作者、年份、DOI/arXiv、来源链接必须齐全',
  '2) 评分前去重：过滤库内与本批次重复文献',
  '3) LLM 质量评分：输出 0-100 分',
  '4) 门槛过滤：仅保留 >= 质量门槛（默认 70）',
].join('\n');
export const autoPullSortHint = [
  '大模型打分：直接按 LLM 质量分排序',
  '综合评分：0.70*质量 + 0.15*新近性 + 0.10*投稿/发表状态 + 0.05*引用量',
].join('\n');
export const autoPullLookbackHint = [
  '仅影响后续增量抓取窗口（最近 N 天）。',
  '首次抓取会走主题时段全量。',
].join('\n');
export const autoPullRunStatusLabels: Record<AutoPullRunStatus, string> = {
  PENDING: '待执行',
  RUNNING: '执行中',
  PARTIAL: '部分成功',
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '已跳过',
};
export const autoPullLimitHint = [
  '上限规则：',
  '首次拉取：按配置上限的 5 倍执行',
  '后续拉取：按配置上限执行',
  '自动去重：先做全局去重',
  '取数方式：按当前排序规则选取 Top K 入库',
].join('\n');
export const helpTooltipMaxWidthPx = 300;
export const helpTooltipViewportPaddingPx = 12;

export function updateHelpTooltipAlignment(target: HTMLSpanElement): void {
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
export const manualImportTestTopicProfiles: Array<{
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
export const devInjectedTopicIds = manualImportTestTopicProfiles.map((item) => item.topic_id);
export const devAutoPullRuleSeeds: Array<{
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
export const devTopicRuleBindingsByTopicId: Record<string, string[]> = {
  'DEV-TOPIC-RAG-EVAL': ['DEV RAG 专项检索'],
  'DEV-TOPIC-AGENT-TOOL': ['DEV Agent 专项检索'],
  'DEV-TOPIC-LLM-SYSTEM': ['DEV 系统工程专项检索'],
};
export const topicPresetVenueOptions = [
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
export const topicYearMinBound = 1990;
export const topicYearMaxBound = new Date().getFullYear() + 1;
export const overviewYearDefaultStart = 1900;
export const overviewYearDefaultEnd = 2100;
export const literatureSubTabsByTab: Partial<Record<LiteratureTabKey, Array<{ key: string; label: string }>>> = {
  'auto-import': autoImportSubTabs.map((tab) => ({ key: tab.key, label: tab.label })),
  'manual-import': manualImportSubTabs.map((tab) => ({ key: tab.key, label: tab.label })),
  'content-processing': contentProcessingSubTabs.map((tab) => ({ key: tab.key, label: tab.label })),
};
export const titleCardSubTabsByTab: Partial<Record<TitleCardPrimaryTabKey, Array<{ key: string; label: string }>>> = {
  evidence: [
    { key: 'candidates', label: '候选证据' },
    { key: 'basket', label: '证据篮' },
    { key: 'inspector', label: '检查器' },
  ],
  need: [
    { key: 'list', label: '列表' },
    { key: 'editor', label: '表单/检查器' },
  ],
  'research-question': [
    { key: 'list', label: '列表' },
    { key: 'editor', label: '表单/检查器' },
  ],
  value: [
    { key: 'list', label: '列表' },
    { key: 'editor', label: '表单/检查器' },
  ],
  package: [
    { key: 'list', label: '列表' },
    { key: 'editor', label: '表单/检查器' },
  ],
  promotion: [
    { key: 'decision', label: '决策' },
    { key: 'promotion', label: '晋升' },
  ],
};
export const querySortPresetOptions: Array<{ value: QuerySortPreset; label: string }> = [
  { value: 'importance|desc', label: '重要度评分倒序' },
  { value: 'importance|asc', label: '重要度评分正序' },
  { value: 'updated_at|desc', label: '更新时间倒序' },
  { value: 'updated_at|asc', label: '更新时间正序' },
  { value: 'published_at|desc', label: '发布时间倒序' },
  { value: 'published_at|asc', label: '发布时间正序' },
  { value: 'title_initial|asc', label: '标题首字母正序' },
  { value: 'title_initial|desc', label: '标题首字母倒序' },
];
export const manualImportTestItems: ManualImportPayload[] = [
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

export const emptyMetric: RuntimeMetric = {
  tokens: null,
  cost_usd: null,
  gpu_requested: null,
  gpu_total: null,
  updated_at: '',
};

export const emptyArtifactBundle: ArtifactBundle = {
  proposal_url: null,
  paper_url: null,
  repo_url: null,
  review_url: null,
};

export const emptyLiteratureOverviewSummary: LiteratureOverviewSummary = {
  total_literatures: 0,
  topic_scope_total: 0,
  in_scope_count: 0,
  excluded_count: 0,
  paper_link_total: 0,
  cited_count: 0,
  used_count: 0,
  provider_counts: [],
  top_tags: [],
};

export const emptyLiteratureOverviewData: LiteratureOverviewData = {
  summary: emptyLiteratureOverviewSummary,
  items: [],
};

export const emptyZoteroLinkResult: ZoteroLinkResult = {
  tested: false,
  connected: false,
  totalCount: 0,
  duplicateCount: 0,
  unparsedCount: 0,
  importableCount: 0,
};
