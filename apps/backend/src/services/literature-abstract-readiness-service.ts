import crypto from 'node:crypto';
import type {
  LiteratureAbstractProfileRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureRecord,
  LiteratureRepository,
  LiteratureSourceRecord,
} from '../repositories/literature-repository.js';
import { normalizeWhitespace, sha256Text, stableStringify } from './literature-content-processing-utils.js';

type AbstractCandidate = {
  text: string;
  source: 'collection_metadata' | 'parsed_fulltext' | 'user_entered' | 'trusted_external_metadata';
  sourceRef: Record<string, unknown>;
  confidence: number;
};

export class LiteratureAbstractReadinessService {
  constructor(private readonly repository: LiteratureRepository) {}

  async resolveAndPersist(
    literature: LiteratureRecord,
    sources: LiteratureSourceRecord[],
  ): Promise<LiteratureAbstractProfileRecord> {
    const existing = await this.repository.findAbstractProfileByLiteratureId(literature.id);
    const candidate = await this.chooseCandidate(literature, sources);
    const now = new Date().toISOString();

    const record: LiteratureAbstractProfileRecord = candidate
      ? {
          id: existing?.id ?? crypto.randomUUID(),
          literatureId: literature.id,
          abstractText: candidate.text,
          abstractSource: candidate.source,
          sourceRef: candidate.sourceRef,
          checksum: sha256Text(candidate.text),
          language: this.detectLanguage(candidate.text),
          confidence: candidate.confidence,
          reasonCodes: [],
          generated: false,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
      : {
          id: existing?.id ?? crypto.randomUUID(),
          literatureId: literature.id,
          abstractText: null,
          abstractSource: null,
          sourceRef: {},
          checksum: null,
          language: null,
          confidence: 0,
          reasonCodes: ['MISSING_TRUSTED_ABSTRACT'],
          generated: false,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

    return (await this.repository.upsertAbstractProfile(record)).record;
  }

  isReady(profile: LiteratureAbstractProfileRecord): boolean {
    return Boolean((profile.abstractText ?? '').trim()) && !profile.generated && profile.reasonCodes.length === 0;
  }

  private async chooseCandidate(
    literature: LiteratureRecord,
    sources: LiteratureSourceRecord[],
  ): Promise<AbstractCandidate | null> {
    return this.findCollectionMetadataAbstract(sources)
      ?? await this.findParsedFulltextAbstract(literature.id)
      ?? this.findUserEnteredAbstract(literature, sources)
      ?? this.findTrustedExternalAbstract(sources);
  }

  private findCollectionMetadataAbstract(sources: LiteratureSourceRecord[]): AbstractCandidate | null {
    for (const source of sources) {
      const text = this.readString(source.rawPayload.abstract);
      if (text) {
        return {
          text,
          source: 'collection_metadata',
          sourceRef: this.buildSourceRef(source, 'rawPayload.abstract'),
          confidence: 0.95,
        };
      }
    }
    return null;
  }

  private async findParsedFulltextAbstract(literatureId: string): Promise<AbstractCandidate | null> {
    const documents = await this.repository.listFulltextDocumentsByLiteratureId(literatureId);
    for (const document of documents) {
      const candidate = await this.extractAbstractFromDocument(document);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  private async extractAbstractFromDocument(document: LiteratureFulltextDocumentRecord): Promise<AbstractCandidate | null> {
    const sections = await this.repository.listFulltextSectionsByDocumentId(document.id);
    const abstractSection = sections.find((section) => /\babstract\b/i.test(section.title.trim()));
    if (!abstractSection) {
      return null;
    }
    const paragraphs = (await this.repository.listFulltextParagraphsByDocumentId(document.id))
      .filter((paragraph) => paragraph.sectionId === abstractSection.sectionId);
    const text = this.joinParagraphs(paragraphs);
    if (!text) {
      return null;
    }
    return {
      text,
      source: 'parsed_fulltext',
      sourceRef: {
        ref_type: 'fulltext_section',
        document_id: document.id,
        source_asset_id: document.sourceAssetId,
        section_id: abstractSection.sectionId,
        normalized_text_checksum: document.normalizedTextChecksum,
      },
      confidence: 0.9,
    };
  }

  private findUserEnteredAbstract(
    literature: LiteratureRecord,
    sources: LiteratureSourceRecord[],
  ): AbstractCandidate | null {
    const text = this.readString(literature.abstractText);
    if (!text) {
      return null;
    }
    const inputChecksum = sha256Text(stableStringify({
      literature_id: literature.id,
      abstract_text: text,
      source_checksums: sources.map((source) => sha256Text(stableStringify(source.rawPayload))),
    }));
    return {
      text,
      source: 'user_entered',
      sourceRef: {
        ref_type: 'literature_record',
        literature_id: literature.id,
        field: 'abstractText',
        input_checksum: inputChecksum,
      },
      confidence: 0.9,
    };
  }

  private findTrustedExternalAbstract(sources: LiteratureSourceRecord[]): AbstractCandidate | null {
    for (const source of sources) {
      if (!['crossref', 'arxiv', 'zotero'].includes(source.provider)) {
        continue;
      }
      const text = this.readString(source.rawPayload.abstractNote)
        ?? this.readString(source.rawPayload.summary)
        ?? this.readString(source.rawPayload.description);
      if (text) {
        return {
          text,
          source: 'trusted_external_metadata',
          sourceRef: this.buildSourceRef(source, 'rawPayload.abstractNote|summary|description'),
          confidence: 0.85,
        };
      }
    }
    return null;
  }

  private joinParagraphs(paragraphs: LiteratureFulltextParagraphRecord[]): string | null {
    const text = paragraphs
      .map((paragraph) => paragraph.text.trim())
      .filter((value) => value.length > 0)
      .join('\n\n')
      .trim();
    return text || null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && normalizeWhitespace(value).length > 0
      ? normalizeWhitespace(value)
      : null;
  }

  private detectLanguage(value: string): string {
    if (/[\u3400-\u9fff]/.test(value)) {
      return 'zh';
    }
    if (/[A-Za-z]/.test(value)) {
      return 'en';
    }
    return 'unknown';
  }

  private buildSourceRef(source: LiteratureSourceRecord, field: string): Record<string, unknown> {
    return {
      ref_type: 'literature_source',
      source_id: source.id,
      provider: source.provider,
      source_item_id: source.sourceItemId,
      source_url: source.sourceUrl,
      field,
      fetched_at: source.fetchedAt,
    };
  }
}
