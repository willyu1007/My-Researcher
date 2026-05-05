import crypto from 'node:crypto';
import type {
  LiteratureCitationProfileRecord,
  LiteratureRecord,
  LiteratureRepository,
  LiteratureSourceRecord,
} from '../repositories/literature-repository.js';
import { normalizeWhitespace, sha256Text, stableStringify } from './literature-content-processing-utils.js';

const MISSING_TITLE = 'MISSING_TITLE';
const MISSING_AUTHORS = 'MISSING_AUTHORS';
const MISSING_YEAR = 'MISSING_YEAR';
const MISSING_LOCATOR = 'MISSING_LOCATOR';

export class LiteratureCitationNormalizationService {
  constructor(private readonly repository: LiteratureRepository) {}

  async normalizeAndPersist(
    literature: LiteratureRecord,
    sources: LiteratureSourceRecord[],
  ): Promise<LiteratureCitationProfileRecord> {
    const existing = await this.repository.findCitationProfileByLiteratureId(literature.id);
    const normalizedTitle = this.normalizeTitle(literature.title);
    const normalizedAuthors = this.normalizeAuthors(literature.authors);
    const parsedYear = this.parseYear(literature.year);
    const normalizedDoi = this.normalizeDoi(literature.doiNormalized ?? undefined);
    const normalizedArxivId = this.normalizeArxivId(literature.arxivId ?? undefined);
    const normalizedSourceUrl = this.chooseSourceUrl(sources);
    const titleAuthorsYearHash = this.buildTitleAuthorsYearHash(normalizedTitle, normalizedAuthors, parsedYear);
    const incompleteReasonCodes = this.buildIncompleteReasonCodes({
      normalizedTitle,
      normalizedAuthors,
      parsedYear,
      normalizedDoi,
      normalizedArxivId,
      normalizedSourceUrl,
    });
    const inputChecksum = sha256Text(stableStringify({
      title: literature.title,
      authors: literature.authors,
      year: literature.year,
      doi: literature.doiNormalized,
      arxiv_id: literature.arxivId,
      sources: sources.map((source) => ({
        id: source.id,
        provider: source.provider,
        source_item_id: source.sourceItemId,
        source_url: source.sourceUrl,
        fetched_at: source.fetchedAt,
      })),
    }));
    const now = new Date().toISOString();
    const record: LiteratureCitationProfileRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      literatureId: literature.id,
      normalizedDoi,
      normalizedArxivId,
      normalizedTitle,
      normalizedAuthors,
      parsedYear,
      normalizedSourceUrl,
      titleAuthorsYearHash,
      citationComplete: incompleteReasonCodes.length === 0,
      incompleteReasonCodes,
      sourceRefs: this.buildSourceRefs(sources),
      inputChecksum,
      confidence: incompleteReasonCodes.length === 0 ? 1 : 0.6,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    return (await this.repository.upsertCitationProfile(record)).record;
  }

  normalizeDoi(value?: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
      .replace(/^doi:/, '')
      .trim();
    return normalized || null;
  }

  normalizeArxivId(value?: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
      .replace(/^arxiv:/, '')
      .trim()
      .replace(/v\d+$/, '');
    return normalized || null;
  }

  normalizeTitle(value: string): string {
    return normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeAuthors(authors: string[]): string[] {
    return authors
      .map((name) =>
        normalizeWhitespace(name)
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((name) => name.length > 0)
      .sort();
  }

  normalizeSourceUrl(value?: string): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const url = new URL(trimmed);
      url.protocol = url.protocol.toLowerCase();
      url.hostname = url.hostname.toLowerCase();
      const serialized = url.toString().replace(/\/$/, '');
      return serialized || null;
    } catch {
      return trimmed.replace(/\/$/, '') || null;
    }
  }

  private parseYear(value: number | null): number | null {
    if (!Number.isInteger(value) || value === null || value < 1900 || value > 2100) {
      return null;
    }
    return value;
  }

  private chooseSourceUrl(sources: LiteratureSourceRecord[]): string | null {
    for (const source of sources) {
      const normalized = this.normalizeSourceUrl(source.sourceUrl);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  }

  private buildTitleAuthorsYearHash(
    normalizedTitle: string,
    normalizedAuthors: string[],
    parsedYear: number | null,
  ): string | null {
    if (!normalizedTitle || normalizedAuthors.length === 0 || !parsedYear) {
      return null;
    }
    return crypto
      .createHash('sha1')
      .update(`${normalizedTitle}|${normalizedAuthors.join('|')}|${parsedYear}`)
      .digest('hex');
  }

  private buildIncompleteReasonCodes(input: {
    normalizedTitle: string;
    normalizedAuthors: string[];
    parsedYear: number | null;
    normalizedDoi: string | null;
    normalizedArxivId: string | null;
    normalizedSourceUrl: string | null;
  }): string[] {
    const reasons: string[] = [];
    if (!input.normalizedTitle) {
      reasons.push(MISSING_TITLE);
    }
    if (input.normalizedAuthors.length === 0) {
      reasons.push(MISSING_AUTHORS);
    }
    if (!input.parsedYear) {
      reasons.push(MISSING_YEAR);
    }
    if (!input.normalizedDoi && !input.normalizedArxivId && !input.normalizedSourceUrl) {
      reasons.push(MISSING_LOCATOR);
    }
    return reasons;
  }

  private buildSourceRefs(sources: LiteratureSourceRecord[]): Record<string, unknown>[] {
    return sources.map((source) => ({
      ref_type: 'literature_source',
      source_id: source.id,
      provider: source.provider,
      source_item_id: source.sourceItemId,
      source_url: source.sourceUrl,
      fetched_at: source.fetchedAt,
    }));
  }
}
