import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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

type DedupMatchType = 'none' | 'doi' | 'arxiv_id' | 'title_authors_year';
type CitationStatus = 'seeded' | 'selected' | 'used' | 'cited' | 'dropped';
type ScopeStatus = 'in_scope' | 'excluded';
type RightsClass = 'OA' | 'USER_AUTH' | 'RESTRICTED' | 'UNKNOWN';
type LiteratureProvider = 'crossref' | 'arxiv' | 'manual' | 'web' | 'zotero';
type LiteratureTabKey = 'auto-import' | 'manual-import' | 'overview';
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

type FeedbackRecoveryAction = 'retry-web-import' | 'retry-zotero-import' | 'retry-query' | 'reload-overview';
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

type LiteratureSearchItem = {
  import_payload: LiteratureImportPayload;
  dedup: {
    is_existing: boolean;
    literature_id?: string;
    matched_by: DedupMatchType;
  };
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

function normalizeLiteratureSearchPayload(payload: unknown): LiteratureSearchItem[] {
  const root = asRecord(payload);
  const itemsRaw = root?.items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item): LiteratureSearchItem | null => {
      const row = asRecord(item);
      const importPayload = row ? asRecord(row.import_payload) : null;
      const dedup = row ? asRecord(row.dedup) : null;
      if (!importPayload || !dedup) {
        return null;
      }

      const provider = toText(importPayload.provider);
      const externalId = toText(importPayload.external_id);
      const title = toText(importPayload.title);
      const sourceUrl = toText(importPayload.source_url);
      if (!provider || !externalId || !title || !sourceUrl) {
        return null;
      }

      const dedupMatchedBy = toText(dedup.matched_by);
      const isExisting = dedup.is_existing;
      if (typeof isExisting !== 'boolean' || !dedupMatchedBy) {
        return null;
      }

      return {
        import_payload: {
          provider: normalizeLiteratureProvider(provider),
          external_id: externalId,
          title,
          abstract: toText(importPayload.abstract),
          authors: Array.isArray(importPayload.authors)
            ? importPayload.authors.filter((author): author is string => typeof author === 'string')
            : [],
          year: typeof importPayload.year === 'number' ? importPayload.year : undefined,
          doi: toText(importPayload.doi),
          arxiv_id: toText(importPayload.arxiv_id),
          source_url: sourceUrl,
          rights_class: normalizeRightsClass(toText(importPayload.rights_class)),
          tags: Array.isArray(importPayload.tags)
            ? importPayload.tags.filter((tag): tag is string => typeof tag === 'string')
            : [],
        },
        dedup: {
          is_existing: isExisting,
          literature_id: toText(dedup.literature_id),
          matched_by:
            dedupMatchedBy === 'doi' ||
            dedupMatchedBy === 'arxiv_id' ||
            dedupMatchedBy === 'title_authors_year'
              ? dedupMatchedBy
              : 'none',
        },
      };
    })
    .filter((row): row is LiteratureSearchItem => row !== null);
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

function parseBatchUrls(value: string): string[] {
  return [...new Set(
    value
      .split(/\r?\n|,|;/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  )];
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
  const [literatureQuery, setLiteratureQuery] = useState<string>('large language model evaluation');
  const [searchItems, setSearchItems] = useState<LiteratureSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, boolean>>({});
  const [topicScopeItems, setTopicScopeItems] = useState<TopicScopeItem[]>([]);
  const [topicScopeLoading, setTopicScopeLoading] = useState<boolean>(false);
  const [topicScopeError, setTopicScopeError] = useState<string | null>(null);
  const [paperLiteratureItems, setPaperLiteratureItems] = useState<PaperLiteratureItem[]>([]);
  const [paperLiteratureLoading, setPaperLiteratureLoading] = useState<boolean>(false);
  const [paperLiteratureError, setPaperLiteratureError] = useState<string | null>(null);
  const [activeLiteratureTab, setActiveLiteratureTab] = useState<LiteratureTabKey>('auto-import');
  const [topFeedback, setTopFeedback] = useState<InlineFeedbackModel | null>(null);
  const [literatureActionMessage, setLiteratureActionMessage] = useState<string>('');
  const [scopeReasonInput, setScopeReasonInput] = useState<string>('初筛保留');
  const [batchTagsInput, setBatchTagsInput] = useState<string>('survey, baseline');
  const [webImportUrlsInput, setWebImportUrlsInput] = useState<string>('');
  const [webImportLoading, setWebImportLoading] = useState<boolean>(false);
  const [webImportStatus, setWebImportStatus] = useState<UiOperationStatus>('idle');
  const [webImportError, setWebImportError] = useState<string | null>(null);
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

  const handleSearchLiterature = async () => {
    const query = literatureQuery.trim();
    if (!query) {
      const message = '请输入检索关键词。';
      setSearchError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message,
      });
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setLiteratureActionMessage('');
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/search',
        body: {
          query,
          providers: ['crossref', 'arxiv'],
          limit: 8,
        },
      });
      const items = normalizeLiteratureSearchPayload(payload);
      setSearchItems(items);
      setSelectedCandidates({});
      setActionHint(`文献检索完成，共 ${items.length} 条候选。`);
      if (items.length === 0) {
        pushLiteratureFeedback({
          slot: 'auto-import',
          level: 'warning',
          message: '未检索到候选文献，可尝试更换关键词。',
          recoveryAction: 'retry-query',
        });
      } else {
        pushLiteratureFeedback({
          slot: 'auto-import',
          level: 'success',
          message: `检索完成，共 ${items.length} 条候选文献。`,
        });
      }
    } catch (error) {
      setSearchItems([]);
      const message = error instanceof Error ? error.message : '检索失败。';
      setSearchError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `检索失败：${message}`,
        recoveryAction: 'retry-query',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleToggleCandidate = (key: string) => {
    setSelectedCandidates((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleImportSelectedCandidates = async () => {
    const selectedItems = searchItems.filter((item) =>
      selectedCandidates[item.import_payload.external_id],
    );
    if (selectedItems.length === 0) {
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message: '请至少选择一条候选文献。',
      });
      return;
    }

    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/import',
        body: {
          items: selectedItems.map((item) => item.import_payload),
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

      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'success',
        message: `已导入 ${selectedItems.length} 条文献，并加入当前选题范围。`,
      });
      setActionHint(`文献导入完成：${selectedItems.length} 条。`);
      await loadTopicScope(topicId);
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入失败。';
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `检索结果导入失败：${message}`,
        recoveryAction: 'retry-query',
      });
    }
  };

  const handleAutoImportFromWeb = async () => {
    const urls = parseBatchUrls(webImportUrlsInput);
    if (urls.length === 0) {
      const message = '请至少输入一个 URL。';
      setWebImportStatus('error');
      setWebImportError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'warning',
        message,
      });
      return;
    }

    setWebImportLoading(true);
    setWebImportStatus('loading');
    setWebImportError(null);
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/web-import',
        body: {
          urls,
          topic_id: topicId.trim() || undefined,
          scope_status: 'in_scope',
          scope_reason: scopeReasonInput.trim() || undefined,
          tags: parseTagsInput(batchTagsInput),
          rights_class: 'UNKNOWN',
        },
      });
      const root = asRecord(payload);
      const importedCount = typeof root?.imported_count === 'number' ? root.imported_count : 0;
      const scopedCount = typeof root?.scope_upserted_count === 'number' ? root.scope_upserted_count : 0;
      setWebImportStatus(importedCount > 0 ? 'ready' : 'empty');
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: importedCount > 0 ? 'success' : 'warning',
        message: `网页导入完成：成功 ${importedCount} 条，加入范围 ${scopedCount} 条。`,
      });
      setWebImportUrlsInput('');
      await loadTopicScope(topicId);
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '网页导入失败。';
      setWebImportStatus('error');
      setWebImportError(message);
      pushLiteratureFeedback({
        slot: 'auto-import',
        level: 'error',
        message: `网页导入失败：${message}`,
        recoveryAction: 'retry-web-import',
      });
    } finally {
      setWebImportLoading(false);
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

    if (topFeedback.recoveryAction === 'retry-web-import') {
      void handleAutoImportFromWeb();
      return;
    }
    if (topFeedback.recoveryAction === 'retry-zotero-import') {
      void handleImportFromZotero();
      return;
    }
    if (topFeedback.recoveryAction === 'retry-query') {
      if (activeLiteratureTab === 'overview') {
        handleApplyAdvancedQuery();
      } else {
        void handleSearchLiterature();
      }
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
  const excludedScopeCount = topicScopeItems.filter((item) => item.scope_status === 'excluded').length;
  const citedCount = paperLiteratureItems.filter((item) => item.citation_status === 'cited').length;
  const usedCount = paperLiteratureItems.filter((item) => item.citation_status === 'used').length;

  const metricCards = useMemo(() => {
    if (activeModule === '文献管理' || activeModule === '选题管理') {
      return [
        { label: '检索候选', value: String(searchItems.length) },
        { label: '综览总量', value: String(overviewPanel.data.summary.total_literatures) },
        { label: '选题范围（保留）', value: String(overviewPanel.data.summary.in_scope_count) },
        { label: '已引用（cited）', value: String(overviewPanel.data.summary.cited_count) },
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
    citedCount,
    excludedScopeCount,
    inScopeCount,
    overviewPanel.data.summary.cited_count,
    overviewPanel.data.summary.in_scope_count,
    overviewPanel.data.summary.total_literatures,
    paperId,
    paperLiteratureItems.length,
    searchItems.length,
    selectedCandidates,
    topicId,
    usedCount,
  ]);

  const handleModuleSelect = (moduleName: string) => {
    setActiveModule(moduleName);
    setActionHint(`已切换到「${moduleName}」模块。`);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((current) => !current);
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
                {literatureTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    className={`topbar-tab-button${activeLiteratureTab === tab.key ? ' is-active' : ''}`}
                    aria-selected={activeLiteratureTab === tab.key}
                    onClick={() => setActiveLiteratureTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
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
                {topFeedback ? (
                  <div className={`literature-top-feedback is-${topFeedback.level}`}>
                    <p data-ui="text" data-variant="caption" data-tone={topFeedback.level === 'error' ? 'danger' : 'primary'}>
                      {topFeedback.message}
                    </p>
                    {topFeedback.recoveryAction ? (
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        onClick={handleTopFeedbackRecovery}
                      >
                        执行恢复动作
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {activeLiteratureTab === 'auto-import' ? (
                  <section className="literature-tab-panel">
                    <div data-ui="toolbar" data-align="between" data-wrap="wrap">
                      <p data-ui="text" data-variant="label" data-tone="secondary">自动联网导入（网页 + Crossref/arXiv）</p>
                      <span data-ui="badge" data-variant="subtle" data-tone="neutral">
                        状态：{formatUiOperationStatus(webImportStatus)}
                      </span>
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
                        <label data-ui="field">
                          <span data-slot="label">检索关键词（Crossref + arXiv）</span>
                          <div data-ui="toolbar" data-wrap="nowrap" className="literature-input-group">
                            <input
                              data-ui="input"
                              data-size="sm"
                              value={literatureQuery}
                              onChange={(event) => setLiteratureQuery(event.target.value)}
                              placeholder="输入关键词"
                            />
                            <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={handleSearchLiterature}>
                              {searchLoading ? '检索中...' : '检索'}
                            </button>
                          </div>
                        </label>
                        <div className="literature-list">
                          {searchItems.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无候选，先执行联网检索。</p>
                          ) : (
                            searchItems.map((item) => {
                              const key = item.import_payload.external_id;
                              return (
                                <label key={key} className="literature-list-item selectable">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selectedCandidates[key])}
                                    onChange={() => handleToggleCandidate(key)}
                                  />
                                  <div>
                                    <p data-ui="text" data-variant="body" data-tone="primary">{item.import_payload.title}</p>
                                    <p data-ui="text" data-variant="caption" data-tone="muted">
                                      {item.import_payload.provider} · {item.import_payload.year ?? '--'} · dedup:{' '}
                                      {item.dedup.matched_by}
                                    </p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <button
                          data-ui="button"
                          data-variant="primary"
                          data-size="sm"
                          type="button"
                          onClick={handleImportSelectedCandidates}
                        >
                          导入已选候选并加入选题范围
                        </button>
                        {searchError ? <p data-ui="text" data-variant="caption" data-tone="danger">{searchError}</p> : null}
                    </section>

                    <section className="literature-section-block">
                        <label data-ui="field">
                          <span data-slot="label">URL 列表（换行/逗号分隔）</span>
                          <textarea
                            data-ui="textarea"
                            value={webImportUrlsInput}
                            onChange={(event) => setWebImportUrlsInput(event.target.value)}
                            placeholder={'https://arxiv.org/abs/2401.00001\nhttps://doi.org/10.xxxx/xxxx'}
                          />
                        </label>
                        <button
                          data-ui="button"
                          data-variant="secondary"
                          data-size="sm"
                          type="button"
                          onClick={handleAutoImportFromWeb}
                        >
                          {webImportLoading ? '导入中...' : '网页抓取并导入'}
                        </button>
                        {webImportError ? <p data-ui="text" data-variant="caption" data-tone="danger">{webImportError}</p> : null}
                    </section>
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
        </main>
      </div>
    </div>
  );
}
