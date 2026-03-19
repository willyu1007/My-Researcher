import {
  convertImportItemsToDraftRows,
  validateManualDraftRows,
} from '../../manual-import-utils';
import type {
  ManualDraftRow,
  ManualImportPayload,
  ManualRowValidation,
} from '../../manual-import-types';
import type { ManualUploadFileItem } from '../types';
import {
  asRecord,
  normalizeLiteratureProvider,
  toOptionalYear,
  toText,
  toTextArray,
} from './common';

export function normalizeManualDedupDoi(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, '')
    .replace(/^doi:/, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeManualDedupArxivId(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
    .replace(/^arxiv:/, '')
    .trim()
    .replace(/v\d+$/, '');
  return normalized.length > 0 ? normalized : null;
}

export function normalizeManualDedupToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseManualDedupAuthors(value: string): string[] {
  return value
    .split(/\s+and\s+|,|;/i)
    .map((author) => normalizeManualDedupToken(author))
    .filter((author) => author.length > 0)
    .sort();
}

export function buildManualDraftRowDedupKey(row: ManualDraftRow): string | null {
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

export function mergeManualDraftRows(existingRows: ManualDraftRow[], incomingRows: ManualDraftRow[]) {
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

export type ManualFieldErrorKey =
  | 'title'
  | 'authors_text'
  | 'year_text'
  | 'doi'
  | 'arxiv_id'
  | 'source_url'
  | 'tags_text';

export type ManualFieldErrorMap = Partial<Record<ManualFieldErrorKey, string[]>>;

export function pushManualFieldError(map: ManualFieldErrorMap, key: ManualFieldErrorKey, message: string): void {
  const bucket = map[key] ?? [];
  if (!bucket.includes(message)) {
    bucket.push(message);
  }
  map[key] = bucket;
}

export function mapManualValidationErrors(validation?: ManualRowValidation): ManualFieldErrorMap {
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

export function getManualFieldErrorText(map: ManualFieldErrorMap, key: ManualFieldErrorKey): string {
  return (map[key] ?? []).join('；');
}

export function parseZoteroPreviewItems(payload: unknown): ManualImportPayload[] {
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

export function computeZoteroPreviewResult(
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

export function detectManualUploadFileFormat(fileName: string): string {
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

export function isManualUploadParseSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.json')
    || lower.endsWith('.csv')
    || lower.endsWith('.bib')
    || lower.endsWith('.bibtex')
    || lower.endsWith('.txt')
  );
}

export function isManualUploadLlmSupported(fileName: string): boolean {
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

export function buildManualUploadDuplicateKey(value: string): string | null {
  const normalized = normalizeManualDedupToken(
    value.replace(/\.(json|csv|bib|bibtex|txt|pdf|tex|ltx|bbl|aux|ris)$/i, ''),
  );
  return normalized.length > 0 ? normalized : null;
}

export function formatManualUploadFileStatusLabel(item: ManualUploadFileItem): string {
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
