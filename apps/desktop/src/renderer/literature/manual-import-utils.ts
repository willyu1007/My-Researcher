import {
  MANUAL_RIGHTS_CLASSES,
  type ManualDraftRow,
  type ManualImportPayload,
  type ManualRightsClass,
  type ManualRowValidation,
} from './manual-import-types';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

function parseAuthorsText(value: string): string[] {
  return value
    .split(/\s+and\s+|,|;/i)
    .map((author) => author.trim())
    .filter((author) => author.length > 0);
}

function parseTagTokens(value: string): string[] {
  return [...new Set(value
    .split(/,|;/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0))];
}

function normalizeRightsClass(value?: string): ManualRightsClass {
  if (!value) {
    return 'UNKNOWN';
  }
  if (MANUAL_RIGHTS_CLASSES.includes(value as ManualRightsClass)) {
    return value as ManualRightsClass;
  }
  return 'UNKNOWN';
}

function normalizeDoi(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//, '')
    .replace(/^doi:/, '')
    .trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeArxivId(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
    .replace(/^arxiv:/, '')
    .trim()
    .replace(/v\d+$/, '');
  return normalized.length > 0 ? normalized : undefined;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

function normalizeImportItem(raw: Record<string, unknown>, fallbackExternalId: string): ManualImportPayload | null {
  const title = toText(raw.title);
  if (!title) {
    return null;
  }

  const authors = (() => {
    if (Array.isArray(raw.authors)) {
      return raw.authors.filter((author): author is string => typeof author === 'string' && author.trim().length > 0);
    }
    const authorText = toText(raw.authors) ?? toText(raw.author);
    if (!authorText) {
      return [];
    }
    return parseAuthorsText(authorText);
  })();

  const year = (() => {
    if (typeof raw.year === 'number' && Number.isFinite(raw.year)) {
      return Math.floor(raw.year);
    }
    const yearText = toText(raw.year);
    if (!yearText) {
      return undefined;
    }
    const parsed = Number.parseInt(yearText, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  })();

  const doi = normalizeDoi(toText(raw.doi));
  const arxivId = normalizeArxivId(toText(raw.arxiv_id) ?? toText(raw.arxivId) ?? toText(raw.eprint));
  const sourceUrl = toText(raw.source_url) ?? toText(raw.url) ?? undefined;
  const abstractText = toText(raw.abstract) ?? toText(raw.abstractText);
  const tags = (() => {
    if (Array.isArray(raw.tags)) {
      return raw.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
    }
    return parseTagTokens(toText(raw.tags) ?? toText(raw.keywords) ?? '');
  })();

  return {
    provider: 'manual',
    external_id: toText(raw.external_id) ?? doi ?? arxivId ?? fallbackExternalId,
    title,
    abstract: abstractText,
    authors,
    year,
    doi,
    arxiv_id: arxivId,
    source_url: sourceUrl ?? '',
    rights_class: normalizeRightsClass(toText(raw.rights_class)),
    tags,
  };
}

function parseManualJson(text: string): ManualImportPayload[] {
  const parsed = JSON.parse(text) as unknown;
  const root = Array.isArray(parsed) ? parsed : asRecord(parsed)?.items;
  if (!Array.isArray(root)) {
    return [];
  }

  return root
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item, index) => normalizeImportItem(item, `manual-json-${index + 1}`))
    .filter((item): item is ManualImportPayload => item !== null);
}

function parseManualCsv(text: string): ManualImportPayload[] {
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
      return normalizeImportItem(row, `manual-csv-${index + 1}`);
    })
    .filter((item): item is ManualImportPayload => item !== null);
}

function parseManualBibText(text: string): ManualImportPayload[] {
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

      return normalizeImportItem(
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
    .filter((item): item is ManualImportPayload => item !== null);
}

function toDraftRow(item: ManualImportPayload, index: number): ManualDraftRow {
  return {
    id: `manual-row-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
    include: true,
    provider: 'manual',
    external_id: item.external_id,
    title: item.title,
    abstract: item.abstract ?? '',
    authors_text: (item.authors ?? []).join(', '),
    year_text: typeof item.year === 'number' ? String(item.year) : '',
    doi: item.doi ?? '',
    arxiv_id: item.arxiv_id ?? '',
    source_url: item.source_url,
    rights_class: normalizeRightsClass(item.rights_class),
    tags_text: (item.tags ?? []).join(', '),
  };
}

export function parseManualUploadToDraftRows(fileName: string, text: string): ManualDraftRow[] {
  const lowerName = fileName.toLowerCase();
  const items = (() => {
    if (lowerName.endsWith('.json')) {
      return parseManualJson(text);
    }
    if (lowerName.endsWith('.csv')) {
      return parseManualCsv(text);
    }
    return parseManualBibText(text);
  })();

  return items.map((item, index) => toDraftRow(item, index));
}

export function validateManualDraftRow(row: ManualDraftRow): ManualRowValidation {
  const errors: string[] = [];
  const title = row.title.trim();
  const authors = parseAuthorsText(row.authors_text);

  const yearText = row.year_text.trim();
  const parsedYear = Number.parseInt(yearText, 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : Number.NaN;

  let doi = normalizeDoi(row.doi);
  let arxivId = normalizeArxivId(row.arxiv_id);
  let sourceUrl = row.source_url.trim();

  if (!sourceUrl && doi) {
    sourceUrl = `https://doi.org/${doi}`;
  }
  if (!sourceUrl && arxivId) {
    sourceUrl = `https://arxiv.org/abs/${arxivId}`;
  }

  if (sourceUrl && !isHttpUrl(sourceUrl)) {
    if (doi) {
      sourceUrl = `https://doi.org/${doi}`;
    } else if (arxivId) {
      sourceUrl = `https://arxiv.org/abs/${arxivId}`;
    }
  }

  if (!title) {
    errors.push('标题不能为空。');
  }
  if (authors.length === 0) {
    errors.push('至少需要 1 位作者。');
  }
  if (!yearText || !Number.isFinite(year) || year < 1900 || year > 2100) {
    errors.push('年份需为 1900-2100 的整数。');
  }

  const hasLocator = Boolean(doi || arxivId || sourceUrl);
  if (!hasLocator) {
    errors.push('需要 DOI / arXiv ID / 来源链接 其中之一。');
  }

  if (!doi && !arxivId && (!sourceUrl || !isHttpUrl(sourceUrl))) {
    errors.push('当无 DOI/arXiv ID 时，来源链接必须是 http(s) URL。');
  }

  if (sourceUrl && !isHttpUrl(sourceUrl)) {
    errors.push('来源链接必须是合法的 http(s) URL。');
  }

  const isValid = errors.length === 0;
  const normalized = isValid
    ? {
      provider: 'manual' as const,
      external_id: row.external_id.trim() || doi || arxivId || row.id,
      title,
      ...(row.abstract.trim() ? { abstract: row.abstract.trim() } : {}),
      authors,
      year,
      ...(doi ? { doi } : {}),
      ...(arxivId ? { arxiv_id: arxivId } : {}),
      source_url: sourceUrl,
      rights_class: normalizeRightsClass(row.rights_class),
      tags: parseTagTokens(row.tags_text),
    }
    : undefined;

  return {
    row_id: row.id,
    is_valid: isValid,
    errors,
    normalized,
  };
}

export function validateManualDraftRows(rows: ManualDraftRow[]): ManualRowValidation[] {
  return rows.map((row) => validateManualDraftRow(row));
}

export function applyBatchTags(rows: ManualDraftRow[], tagText: string, onlyIncluded = true): ManualDraftRow[] {
  const tagsToAdd = parseTagTokens(tagText);
  if (tagsToAdd.length === 0) {
    return rows;
  }

  return rows.map((row) => {
    if (onlyIncluded && !row.include) {
      return row;
    }
    const merged = [...new Set([...parseTagTokens(row.tags_text), ...tagsToAdd])];
    return {
      ...row,
      tags_text: merged.join(', '),
    };
  });
}

export function applyBatchRightsClass(
  rows: ManualDraftRow[],
  rightsClass: ManualRightsClass,
  onlyIncluded = true,
): ManualDraftRow[] {
  return rows.map((row) => {
    if (onlyIncluded && !row.include) {
      return row;
    }
    return {
      ...row,
      rights_class: normalizeRightsClass(rightsClass),
    };
  });
}

export function normalizeManualRightsClass(value?: string): ManualRightsClass {
  return normalizeRightsClass(value);
}
