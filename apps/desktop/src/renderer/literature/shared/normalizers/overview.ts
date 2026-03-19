import { citationStatusOptions } from '../constants';
import type {
  CitationStatus,
  LiteratureOverviewData,
  LiteratureOverviewItem,
  LiteratureOverviewStatus,
  LiteratureOverviewSummary,
  OverviewContentStatus,
  OverviewScopeFilterInput,
  PipelineActionSet,
  PipelineStageStatusMap,
  QuerySort,
  ScopeStatus,
  SortDirection,
} from '../types';
import {
  asRecord,
  normalizeComparableText,
  normalizeLiteratureProvider,
  toText,
} from './common';

function normalizeCitationStatus(value: unknown): CitationStatus | undefined {
  return citationStatusOptions.find((status) => status === value);
}

function normalizePipelineStageStatusMap(
  root: Record<string, unknown> | null,
): PipelineStageStatusMap {
  return {
    CITATION_NORMALIZED: readPipelineStageStatus(root?.CITATION_NORMALIZED),
    ABSTRACT_READY: readPipelineStageStatus(root?.ABSTRACT_READY),
    KEY_CONTENT_READY: readPipelineStageStatus(root?.KEY_CONTENT_READY),
    FULLTEXT_PREPROCESSED: readPipelineStageStatus(root?.FULLTEXT_PREPROCESSED),
    CHUNKED: readPipelineStageStatus(root?.CHUNKED),
    EMBEDDED: readPipelineStageStatus(root?.EMBEDDED),
    INDEXED: readPipelineStageStatus(root?.INDEXED),
  };
}

function readPipelineStageStatus(value: unknown): PipelineStageStatusMap['CITATION_NORMALIZED'] {
  return value === 'NOT_STARTED'
    || value === 'PENDING'
    || value === 'RUNNING'
    || value === 'SUCCEEDED'
    || value === 'FAILED'
    || value === 'BLOCKED'
    || value === 'SKIPPED'
    ? value
    : 'NOT_STARTED';
}

function normalizePipelineActions(root: Record<string, unknown> | null): PipelineActionSet {
  return {
    extract_abstract: normalizePipelineActionItem(root?.extract_abstract, 'EXTRACT_ABSTRACT', ['ABSTRACT_READY']),
    preprocess_fulltext: normalizePipelineActionItem(
      root?.preprocess_fulltext,
      'PREPROCESS_FULLTEXT',
      ['FULLTEXT_PREPROCESSED'],
    ),
    vectorize: normalizePipelineActionItem(root?.vectorize, 'VECTORIZE', ['CHUNKED', 'EMBEDDED', 'INDEXED']),
  };
}

function normalizePipelineActionItem(
  value: unknown,
  fallbackCode: PipelineActionSet['extract_abstract']['action_code'],
  fallbackStages: PipelineActionSet['extract_abstract']['requested_stages'],
): PipelineActionSet['extract_abstract'] {
  const row = asRecord(value);
  const actionCode = toText(row?.action_code);
  const reasonCode = toText(row?.reason_code);
  const reasonMessage = toText(row?.reason_message) ?? null;
  const requestedStages = Array.isArray(row?.requested_stages)
    ? row.requested_stages
        .map((item) => toText(item))
        .filter((item): item is PipelineActionSet['extract_abstract']['requested_stages'][number] =>
          item === 'CITATION_NORMALIZED'
          || item === 'ABSTRACT_READY'
          || item === 'KEY_CONTENT_READY'
          || item === 'FULLTEXT_PREPROCESSED'
          || item === 'CHUNKED'
          || item === 'EMBEDDED'
          || item === 'INDEXED')
    : fallbackStages;

  return {
    action_code:
      actionCode === 'EXTRACT_ABSTRACT' || actionCode === 'PREPROCESS_FULLTEXT' || actionCode === 'VECTORIZE'
        ? actionCode
        : fallbackCode,
    enabled: typeof row?.enabled === 'boolean' ? row.enabled : true,
    reason_code:
      reasonCode === 'READY'
      || reasonCode === 'EXCLUDED_BY_SCOPE'
      || reasonCode === 'RIGHTS_RESTRICTED'
      || reasonCode === 'USER_AUTH_DISABLED'
      || reasonCode === 'PREREQUISITE_NOT_READY'
      || reasonCode === 'STAGE_ALREADY_READY'
      || reasonCode === 'RUN_IN_FLIGHT'
        ? reasonCode
        : null,
    reason_message: reasonMessage,
    requested_stages: requestedStages.length > 0 ? requestedStages : fallbackStages,
  };
}

export function normalizeOverviewStatus(value: string | null | undefined): LiteratureOverviewStatus | null {
  if (value === 'automation_ready' || value === 'citable' || value === 'not_citable' || value === 'excluded') {
    return value;
  }
  return null;
}

export function deriveOverviewStatusFromSignals(input: {
  topic_scope_status?: ScopeStatus;
  citation_complete: boolean;
  abstract_ready: boolean;
  key_content_ready: boolean;
}): LiteratureOverviewStatus {
  if (input.topic_scope_status === 'excluded') {
    return 'excluded';
  }
  if (input.abstract_ready && input.key_content_ready) {
    return 'automation_ready';
  }
  if (input.citation_complete) {
    return 'citable';
  }
  return 'not_citable';
}

export function normalizeLiteratureOverviewPayload(payload: unknown): LiteratureOverviewData | null {
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
      const pipelineStateRoot = asRecord(row.pipeline_state);
      const citationComplete = typeof pipelineStateRoot?.citation_complete === 'boolean'
        ? pipelineStateRoot.citation_complete
        : false;
      const abstractReady = typeof pipelineStateRoot?.abstract_ready === 'boolean'
        ? pipelineStateRoot.abstract_ready
        : false;
      const keyContentReady = typeof pipelineStateRoot?.key_content_ready === 'boolean'
        ? pipelineStateRoot.key_content_ready
        : false;
      const fulltextPreprocessed = typeof pipelineStateRoot?.fulltext_preprocessed === 'boolean'
        ? pipelineStateRoot.fulltext_preprocessed
        : false;
      const chunked = typeof pipelineStateRoot?.chunked === 'boolean'
        ? pipelineStateRoot.chunked
        : false;
      const embedded = typeof pipelineStateRoot?.embedded === 'boolean'
        ? pipelineStateRoot.embedded
        : false;
      const indexed = typeof pipelineStateRoot?.indexed === 'boolean'
        ? pipelineStateRoot.indexed
        : false;
      const pipelineStageStatus = normalizePipelineStageStatusMap(asRecord(row.pipeline_stage_status));
      const pipelineActions = normalizePipelineActions(asRecord(row.pipeline_actions));
      const overviewStatusRaw = toText(row.overview_status);
      const overviewStatus = normalizeOverviewStatus(overviewStatusRaw)
        ?? deriveOverviewStatusFromSignals({
          topic_scope_status:
            topicScopeStatus === 'excluded'
              ? 'excluded'
              : topicScopeStatus === 'in_scope'
                ? 'in_scope'
                : undefined,
          citation_complete: citationComplete,
          abstract_ready: abstractReady,
          key_content_ready: keyContentReady,
        });

      return {
        literature_id: literatureId,
        title,
        authors: Array.isArray(row.authors)
          ? row.authors.filter((author): author is string => typeof author === 'string')
          : [],
        year: typeof row.year === 'number' ? row.year : null,
        doi: toText(row.doi) ?? null,
        arxiv_id: toText(row.arxiv_id) ?? null,
        tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        providers: Array.isArray(row.providers)
          ? row.providers
              .map((provider) => normalizeLiteratureProvider(provider))
              .filter((provider, index, array) => array.indexOf(provider) === index)
          : [],
        source_url: toText(row.source_url) ?? null,
        source_updated_at: toText(row.source_updated_at) ?? null,
        topic_scope_status:
          topicScopeStatus === 'excluded'
            ? 'excluded'
            : topicScopeStatus === 'in_scope'
              ? 'in_scope'
              : undefined,
        citation_status: normalizeCitationStatus(citationStatus),
        overview_status: overviewStatus,
        pipeline_state: {
          citation_complete: citationComplete,
          abstract_ready: abstractReady,
          key_content_ready: keyContentReady,
          fulltext_preprocessed: fulltextPreprocessed,
          chunked,
          embedded,
          indexed,
        },
        pipeline_stage_status: pipelineStageStatus,
        pipeline_actions: pipelineActions,
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

export function isOverviewExcluded(item: LiteratureOverviewItem): boolean {
  return item.overview_status === 'excluded';
}

export function isOverviewAutomationReady(item: LiteratureOverviewItem): boolean {
  return item.overview_status === 'automation_ready';
}

export function isOverviewCitable(item: LiteratureOverviewItem): boolean {
  return item.overview_status === 'citable';
}

export function resolveLiteratureOverviewStatus(item: LiteratureOverviewItem): LiteratureOverviewStatus {
  return item.overview_status;
}

export function formatLiteratureOverviewStatus(status: LiteratureOverviewStatus): string {
  if (status === 'automation_ready') {
    return '自动化就绪';
  }
  if (status === 'citable') {
    return '可被引用';
  }
  if (status === 'excluded') {
    return '已排除';
  }
  return '不可引用';
}

export function formatOverviewContentStatus(status: OverviewContentStatus): string {
  if (status === 'abstract_ready') {
    return '摘要就绪';
  }
  if (status === 'key_content_ready') {
    return '关键内容就绪';
  }
  return '未就绪';
}

export function resolveOverviewContentStatus(item: LiteratureOverviewItem): OverviewContentStatus {
  if (item.pipeline_state.key_content_ready) {
    return 'key_content_ready';
  }
  if (item.pipeline_state.abstract_ready) {
    return 'abstract_ready';
  }
  return 'not_ready';
}

export function resolveOverviewPublicationLabel(item: LiteratureOverviewItem): string {
  const providers = new Set(item.providers);
  if (providers.has('crossref')) {
    return '已发表/已收录';
  }
  if (providers.has('arxiv')) {
    return '预印本';
  }
  return '--';
}

export function parseCitationCountFromTags(tags: string[]): number | null {
  for (const tag of tags) {
    const matched = tag.match(/(?:cite|cites|citation|citations|引用|引用量)[\s:_=-]*(\d+)/i);
    if (!matched) {
      continue;
    }
    const parsed = Number.parseInt(matched[1] ?? '', 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

export function getLiteratureImportanceScore(item: LiteratureOverviewItem): number {
  let score = 0;
  if (item.citation_status === 'cited') {
    score += 50;
  } else if (item.citation_status === 'used') {
    score += 40;
  } else if (item.citation_status === 'selected') {
    score += 30;
  } else if (item.citation_status === 'seeded') {
    score += 20;
  } else if (item.citation_status === 'dropped') {
    score += 5;
  }

  if (item.topic_scope_status === 'in_scope') {
    score += 20;
  } else if (item.topic_scope_status === 'excluded') {
    score -= 20;
  }

  if (typeof item.year === 'number') {
    score += Math.max(0, Math.min(20, item.year - 2005));
  }

  if (item.source_updated_at) {
    const deltaMs = Date.now() - new Date(item.source_updated_at).getTime();
    const deltaDays = Number.isFinite(deltaMs) ? Math.max(0, Math.floor(deltaMs / 86_400_000)) : 365;
    score += Math.max(0, 10 - Math.floor(deltaDays / 30));
  }

  return score;
}

export function applyOverviewQuickFilters(
  items: LiteratureOverviewItem[],
  filters: {
    keyword: string;
    yearStart: number | null;
    yearEnd: number | null;
    tagKeywords: string[];
    statusFilter: OverviewScopeFilterInput;
  },
): LiteratureOverviewItem[] {
  const keyword = normalizeComparableText(filters.keyword);
  const normalizedTagKeywords = new Set(
    filters.tagKeywords
      .map((tag) => normalizeComparableText(tag))
      .filter((tag) => tag.length > 0),
  );

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

    if (filters.yearStart !== null) {
      if (item.year === null || item.year < filters.yearStart) {
        return false;
      }
    }

    if (filters.yearEnd !== null) {
      if (item.year === null || item.year > filters.yearEnd) {
        return false;
      }
    }

    if (normalizedTagKeywords.size > 0) {
      const hit = item.tags.some((tag) => normalizedTagKeywords.has(normalizeComparableText(tag)));
      if (!hit) {
        return false;
      }
    }

    if (filters.statusFilter !== 'all') {
      const currentStatus = resolveLiteratureOverviewStatus(item);
      if (currentStatus !== filters.statusFilter) {
        return false;
      }
    }

    return true;
  });
}

export function projectOverviewItems(
  items: LiteratureOverviewItem[],
  options: {
    sort: QuerySort;
    direction: SortDirection;
    keyword: string;
    yearStart: number | null;
    yearEnd: number | null;
    tagKeywords: string[];
    statusFilter: OverviewScopeFilterInput;
  },
): LiteratureOverviewItem[] {
  const quickFilteredItems = applyOverviewQuickFilters(items, {
    keyword: options.keyword,
    yearStart: options.yearStart,
    yearEnd: options.yearEnd,
    tagKeywords: options.tagKeywords,
    statusFilter: options.statusFilter,
  });
  return sortOverviewItems(quickFilteredItems, options.sort, options.direction);
}

export function sortOverviewItems(items: LiteratureOverviewItem[], sort: QuerySort, direction: SortDirection): LiteratureOverviewItem[] {
  const sorted = [...items];
  const factor = direction === 'asc' ? 1 : -1;
  sorted.sort((a, b) => {
    if (sort === 'importance') {
      return (getLiteratureImportanceScore(a) - getLiteratureImportanceScore(b)) * factor;
    }
    if (sort === 'updated_at') {
      const left = a.source_updated_at ? new Date(a.source_updated_at).getTime() : 0;
      const right = b.source_updated_at ? new Date(b.source_updated_at).getTime() : 0;
      return (left - right) * factor;
    }
    if (sort === 'published_at') {
      return ((a.year ?? 0) - (b.year ?? 0)) * factor;
    }
    return a.title.localeCompare(b.title, 'zh-CN') * factor;
  });
  return sorted;
}
