import type {
  LiteratureKeyContentDossierPayload,
  LiteratureKeyContentEvidenceStrength,
  LiteratureKeyContentItem,
  LiteratureKeyContentReadinessStatus,
  LiteratureKeyContentSourceRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  LiteratureAbstractProfileRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteraturePipelineArtifactRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService, OpenAIExtractionConfig } from './literature-content-processing-settings-service.js';
import { normalizeWhitespace, sha256Text, stableStringify } from './literature-content-processing-utils.js';

const KEY_CONTENT_SCHEMA_VERSION = 'key_content.v1' as const;
const KEY_CONTENT_EXTRACTION_PROFILE = 'paper_semantic_dossier.v1' as const;

const CATEGORY_KEYS = [
  'research_problem',
  'contributions',
  'method',
  'datasets_and_benchmarks',
  'experiments',
  'key_findings',
  'limitations',
  'reproducibility',
  'related_work_positioning',
  'evidence_candidates',
  'figure_insights',
  'table_insights',
  'claim_evidence_map',
  'automation_signals',
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];
type CategoryMap = LiteratureKeyContentDossierPayload['categories'];

type KeyContentExtractionResult =
  | {
      ready: true;
      payload: LiteratureKeyContentDossierPayload;
      readinessStatus: Extract<LiteratureKeyContentReadinessStatus, 'READY' | 'PARTIAL_READY'>;
      checksum: string;
      displayDigest: string;
      diagnostics: Record<string, unknown>[];
    }
  | {
      ready: false;
      reasonCode: string;
      reasonMessage: string;
      diagnostics: Record<string, unknown>[];
    };

type ExtractionSourceBundle = {
  abstractProfile: LiteratureAbstractProfileRecord | null;
  document: LiteratureFulltextDocumentRecord;
  sections: LiteratureFulltextSectionRecord[];
  paragraphs: LiteratureFulltextParagraphRecord[];
  anchors: LiteratureFulltextAnchorRecord[];
};

type ExtractionUnit = {
  section: LiteratureFulltextSectionRecord;
  paragraphs: LiteratureFulltextParagraphRecord[];
  text: string;
};

export class LiteratureKeyContentExtractionService {
  constructor(
    private readonly repository: LiteratureRepository,
    private readonly settingsService?: LiteratureContentProcessingSettingsService,
  ) {}

  async extract(literature: LiteratureRecord): Promise<KeyContentExtractionResult> {
    const config = await this.settingsService?.resolveOpenAIExtractionConfig();
    if (!config) {
      return {
        ready: false,
        reasonCode: 'KEY_CONTENT_PROVIDER_MISSING',
        reasonMessage: 'OpenAI extraction settings are required before KEY_CONTENT_READY can complete.',
        diagnostics: [{ code: 'KEY_CONTENT_PROVIDER_MISSING', severity: 'blocker' }],
      };
    }

    const bundle = await this.loadSourceBundle(literature.id);
    if (!bundle) {
      return {
        ready: false,
        reasonCode: 'KEY_CONTENT_SOURCE_MISSING',
        reasonMessage: 'A preprocessed fulltext document is required before KEY_CONTENT_READY can complete.',
        diagnostics: [{ code: 'KEY_CONTENT_SOURCE_MISSING', severity: 'blocker' }],
      };
    }

    const units = this.buildExtractionUnits(bundle);
    if (units.length === 0) {
      return {
        ready: false,
        reasonCode: 'KEY_CONTENT_SOURCE_MISSING',
        reasonMessage: 'Fulltext sections do not contain extractable paragraph text.',
        diagnostics: [{ code: 'KEY_CONTENT_SOURCE_MISSING', severity: 'blocker' }],
      };
    }

    const existingArtifact = await this.repository.findPipelineArtifact(
      literature.id,
      'KEY_CONTENT_READY',
      'KEY_CONTENT_DOSSIER',
    );

    const extractedPayloads = [];
    try {
      for (const unit of units) {
        extractedPayloads.push(await this.extractSection(literature, bundle, unit, config));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI key-content extraction failed.';
      return {
        ready: false,
        reasonCode: 'KEY_CONTENT_EXTRACTION_FAILED',
        reasonMessage: message,
        diagnostics: [{ code: 'KEY_CONTENT_EXTRACTION_FAILED', severity: 'blocker', message }],
      };
    }

    const generatedAt = new Date().toISOString();
    const inputRefs = this.buildInputRefs(bundle, config);
    const diagnostics: Record<string, unknown>[] = [];
    const categories = this.emptyCategories();
    for (const payload of extractedPayloads) {
      const normalized = this.normalizeCategories(payload.categories, bundle, diagnostics);
      for (const category of CATEGORY_KEYS) {
        categories[category].push(...normalized[category]);
      }
      diagnostics.push(...this.readDiagnostics(payload));
    }

    this.mergeUserEditedItems(categories, existingArtifact);
    this.rekeyItems(categories);

    const quality = this.buildQualityReport(categories, diagnostics);
    const displayDigest = this.buildDisplayDigest(categories, literature.keyContentDigest);
    const readinessStatus = this.resolveReadiness(categories, quality.blockers);
    const payload: LiteratureKeyContentDossierPayload = {
      schema_version: KEY_CONTENT_SCHEMA_VERSION,
      extraction_profile: KEY_CONTENT_EXTRACTION_PROFILE,
      readiness_status: readinessStatus,
      input_refs: inputRefs,
      categories,
      quality_report: quality,
      display_digest: displayDigest,
      generated_at: generatedAt,
    };
    const checksum = sha256Text(stableStringify(payload));

    if (readinessStatus === 'FAILED') {
      return {
        ready: false,
        reasonCode: 'KEY_CONTENT_VALIDATION_FAILED',
        reasonMessage: 'OpenAI key-content output did not pass source-ref validation.',
        diagnostics: payload.quality_report.extraction_diagnostics,
      };
    }

    return {
      ready: true,
      payload,
      readinessStatus,
      checksum,
      displayDigest,
      diagnostics: payload.quality_report.extraction_diagnostics,
    };
  }

  private async loadSourceBundle(literatureId: string): Promise<ExtractionSourceBundle | null> {
    const [abstractProfile, documents] = await Promise.all([
      this.repository.findAbstractProfileByLiteratureId(literatureId),
      this.repository.listFulltextDocumentsByLiteratureId(literatureId),
    ]);
    const document = documents
      .filter((item) => item.status === 'READY')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!document) {
      return null;
    }

    const [sections, paragraphs, anchors] = await Promise.all([
      this.repository.listFulltextSectionsByDocumentId(document.id),
      this.repository.listFulltextParagraphsByDocumentId(document.id),
      this.repository.listFulltextAnchorsByDocumentId(document.id),
    ]);

    return {
      abstractProfile,
      document,
      sections,
      paragraphs,
      anchors,
    };
  }

  private buildExtractionUnits(bundle: ExtractionSourceBundle): ExtractionUnit[] {
    const paragraphsBySection = new Map<string, LiteratureFulltextParagraphRecord[]>();
    for (const paragraph of bundle.paragraphs) {
      const rows = paragraphsBySection.get(paragraph.sectionId) ?? [];
      rows.push(paragraph);
      paragraphsBySection.set(paragraph.sectionId, rows);
    }

    return bundle.sections
      .map((section) => {
        const paragraphs = (paragraphsBySection.get(section.sectionId) ?? [])
          .sort((left, right) => left.orderIndex - right.orderIndex);
        const text = paragraphs
          .map((paragraph) => `[${paragraph.paragraphId}] ${paragraph.text}`)
          .join('\n\n')
          .slice(0, 12000);
        return { section, paragraphs, text };
      })
      .filter((unit) => unit.text.trim().length > 0);
  }

  private async extractSection(
    literature: LiteratureRecord,
    bundle: ExtractionSourceBundle,
    unit: ExtractionUnit,
    config: OpenAIExtractionConfig,
  ): Promise<Partial<LiteratureKeyContentDossierPayload>> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: 'system',
            content: [
              'Extract a source-grounded semantic dossier section for a CS paper.',
              'Return JSON only through the provided schema.',
              'Every evidence-bearing item must cite source_refs using paragraph ids, section ids, anchors, or the abstract ref.',
              'Do not invent claims not supported by the supplied source text.',
            ].join(' '),
          },
          {
            role: 'user',
            content: this.buildSectionPrompt(literature, bundle, unit),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'literature_key_content_section',
            strict: true,
            schema: this.openAIOutputSchema(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI key-content extraction failed with status ${response.status}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    return this.readStructuredPayload(payload);
  }

  private buildSectionPrompt(
    literature: LiteratureRecord,
    bundle: ExtractionSourceBundle,
    unit: ExtractionUnit,
  ): string {
    const abstractText = bundle.abstractProfile?.abstractText?.trim() ?? '';
    const anchorSummary = bundle.anchors
      .slice(0, 40)
      .map((anchor) => `${anchor.anchorType}:${anchor.anchorId}:${normalizeWhitespace(anchor.text ?? anchor.label ?? '')}`)
      .join('\n');
    return [
      `Title: ${literature.title}`,
      `Authors: ${literature.authors.join(', ') || 'unknown'}`,
      `Year: ${literature.year ?? 'unknown'}`,
      `Abstract ref: ${bundle.abstractProfile?.id ?? 'abstract'}`,
      abstractText ? `Abstract: ${abstractText}` : 'Abstract: unavailable',
      `Document id: ${bundle.document.id}`,
      `Section id: ${unit.section.sectionId}`,
      `Section title: ${unit.section.title}`,
      'Available source refs:',
      `- section:${unit.section.sectionId}`,
      ...unit.paragraphs.map((paragraph) => `- paragraph:${paragraph.paragraphId}`),
      anchorSummary ? `Anchors:\n${anchorSummary}` : 'Anchors: none',
      'Section text:',
      unit.text,
    ].join('\n\n');
  }

  private readStructuredPayload(payload: Record<string, unknown>): Partial<LiteratureKeyContentDossierPayload> {
    const parsed = this.tryReadObject(payload.output_parsed)
      ?? this.tryParseJsonObject(payload.output_text)
      ?? this.tryReadFromResponsesOutput(payload.output)
      ?? this.tryReadFromChatOutput(payload);
    if (!parsed) {
      throw new Error('OpenAI key-content response did not include parseable structured output.');
    }
    return parsed as Partial<LiteratureKeyContentDossierPayload>;
  }

  private tryReadObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  }

  private tryParseJsonObject(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'string') {
      return null;
    }
    try {
      return this.tryReadObject(JSON.parse(value));
    } catch {
      return null;
    }
  }

  private tryReadFromResponsesOutput(value: unknown): Record<string, unknown> | null {
    if (!Array.isArray(value)) {
      return null;
    }
    for (const item of value) {
      const row = this.tryReadObject(item);
      const content = Array.isArray(row?.content) ? row.content : [];
      for (const contentItem of content) {
        const contentRow = this.tryReadObject(contentItem);
        const parsed = this.tryParseJsonObject(contentRow?.text) ?? this.tryReadObject(contentRow?.parsed);
        if (parsed) {
          return parsed;
        }
      }
    }
    return null;
  }

  private tryReadFromChatOutput(payload: Record<string, unknown>): Record<string, unknown> | null {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    for (const choice of choices) {
      const row = this.tryReadObject(choice);
      const message = this.tryReadObject(row?.message);
      const parsed = this.tryParseJsonObject(message?.content);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  private normalizeCategories(
    rawCategories: unknown,
    bundle: ExtractionSourceBundle,
    diagnostics: Record<string, unknown>[],
  ): CategoryMap {
    const categories = this.emptyCategories();
    const root = this.tryReadObject(rawCategories);
    if (!root) {
      diagnostics.push({ code: 'KEY_CONTENT_CATEGORIES_MISSING', severity: 'blocker' });
      return categories;
    }

    for (const category of CATEGORY_KEYS) {
      const rows = Array.isArray(root[category]) ? root[category] : [];
      for (const item of rows) {
        const normalized = this.normalizeItem(category, item, bundle, diagnostics);
        if (normalized) {
          categories[category].push(normalized);
        }
      }
    }

    return categories;
  }

  private normalizeItem(
    category: CategoryKey,
    value: unknown,
    bundle: ExtractionSourceBundle,
    diagnostics: Record<string, unknown>[],
  ): LiteratureKeyContentItem | null {
    const row = this.tryReadObject(value);
    if (!row) {
      return null;
    }
    const statement = normalizeWhitespace(this.readString(row.statement) ?? '');
    if (!statement) {
      return null;
    }
    const sourceRefs = this.normalizeSourceRefs(row.source_refs, bundle, diagnostics);
    const confidence = this.readNumber(row.confidence, 0.5);
    const evidenceStrength = this.readEvidenceStrength(row.evidence_strength);
    const rawId = normalizeWhitespace(this.readString(row.id) ?? '');
    return {
      id: rawId || `${category}-${sha256Text(`${category}:${statement}`).slice(0, 16)}`,
      type: normalizeWhitespace(this.readString(row.type) ?? category),
      statement,
      details: normalizeWhitespace(this.readString(row.details) ?? ''),
      source_refs: sourceRefs,
      confidence,
      evidence_strength: evidenceStrength,
      notes: this.readString(row.notes),
      provenance: row.provenance === 'user_edited' ? 'user_edited' : 'model_generated',
    };
  }

  private normalizeSourceRefs(
    value: unknown,
    bundle: ExtractionSourceBundle,
    diagnostics: Record<string, unknown>[],
  ): LiteratureKeyContentSourceRef[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const refs: LiteratureKeyContentSourceRef[] = [];
    for (const item of value) {
      const row = this.tryReadObject(item);
      if (!row) {
        continue;
      }
      const refType = row.ref_type;
      const refId = normalizeWhitespace(this.readString(row.ref_id) ?? '');
      const resolved = this.resolveSourceRef(refType, refId, bundle);
      if (resolved) {
        refs.push(resolved);
      } else if (refId) {
        diagnostics.push({
          code: 'SOURCE_REF_UNRESOLVED',
          severity: 'warning',
          ref_type: refType,
          ref_id: refId,
        });
      }
    }
    return refs;
  }

  private resolveSourceRef(
    refType: unknown,
    refId: string,
    bundle: ExtractionSourceBundle,
  ): LiteratureKeyContentSourceRef | null {
    if (refType === 'abstract' && bundle.abstractProfile && (refId === 'abstract' || refId === bundle.abstractProfile.id)) {
      return {
        ref_type: 'abstract',
        ref_id: bundle.abstractProfile.id,
        checksum: bundle.abstractProfile.checksum,
      };
    }
    if (refType === 'section') {
      const section = bundle.sections.find((item) => item.sectionId === refId);
      return section ? {
        ref_type: 'section',
        ref_id: section.sectionId,
        document_id: bundle.document.id,
        section_id: section.sectionId,
        checksum: section.checksum,
        start_offset: section.startOffset,
        end_offset: section.endOffset,
      } : null;
    }
    if (refType === 'paragraph') {
      const paragraph = bundle.paragraphs.find((item) => item.paragraphId === refId);
      return paragraph ? {
        ref_type: 'paragraph',
        ref_id: paragraph.paragraphId,
        document_id: bundle.document.id,
        section_id: paragraph.sectionId,
        paragraph_id: paragraph.paragraphId,
        checksum: paragraph.checksum,
        start_offset: paragraph.startOffset,
        end_offset: paragraph.endOffset,
      } : null;
    }
    if (refType === 'anchor') {
      const anchor = bundle.anchors.find((item) => item.anchorId === refId);
      return anchor ? {
        ref_type: 'anchor',
        ref_id: anchor.anchorId,
        document_id: bundle.document.id,
        anchor_id: anchor.anchorId,
        checksum: anchor.checksum,
      } : null;
    }
    if (refType === 'manual' && refId) {
      return {
        ref_type: 'manual',
        ref_id: refId,
      };
    }
    return null;
  }

  private mergeUserEditedItems(categories: CategoryMap, existingArtifact: LiteraturePipelineArtifactRecord | null): void {
    const existingCategories = this.tryReadObject(existingArtifact?.payload.categories);
    if (!existingCategories) {
      return;
    }
    for (const category of CATEGORY_KEYS) {
      const rows = Array.isArray(existingCategories[category]) ? existingCategories[category] : [];
      const preserved = rows
        .map((item) => this.tryReadObject(item))
        .filter((item): item is Record<string, unknown> => item !== null && item.provenance === 'user_edited');
      for (const item of preserved) {
        const normalized = this.normalizeExistingUserEditedItem(item);
        if (!normalized) {
          continue;
        }
        const existingIndex = categories[category].findIndex((row) => row.id === normalized.id);
        if (existingIndex >= 0) {
          categories[category][existingIndex] = normalized;
        } else {
          categories[category].push(normalized);
        }
      }
    }
  }

  private normalizeExistingUserEditedItem(row: Record<string, unknown>): LiteratureKeyContentItem | null {
    const statement = this.readString(row.statement);
    const sourceRefs = Array.isArray(row.source_refs)
      ? row.source_refs.filter((item): item is LiteratureKeyContentSourceRef =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
        )
      : [];
    if (!statement || sourceRefs.length === 0) {
      return null;
    }
    return {
      id: this.readString(row.id) ?? `user-edited-${sha256Text(statement).slice(0, 16)}`,
      type: this.readString(row.type) ?? 'user_edited',
      statement,
      details: this.readString(row.details) ?? '',
      source_refs: sourceRefs,
      confidence: this.readNumber(row.confidence, 1),
      evidence_strength: this.readEvidenceStrength(row.evidence_strength),
      notes: this.readString(row.notes),
      provenance: 'user_edited',
    };
  }

  private rekeyItems(categories: CategoryMap): void {
    for (const category of CATEGORY_KEYS) {
      const seen = new Set<string>();
      categories[category] = categories[category].map((item, index) => {
        const baseId = this.slugId(item.id || `${category}-${index + 1}`) || `${category}-${index + 1}`;
        const id = seen.has(baseId)
          ? `${category}-${String(index + 1).padStart(4, '0')}`
          : baseId;
        seen.add(id);
        return { ...item, id };
      });
    }
  }

  private buildQualityReport(categories: CategoryMap, diagnostics: Record<string, unknown>[]): LiteratureKeyContentDossierPayload['quality_report'] {
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (categories.research_problem.length === 0) {
      blockers.push('MISSING_RESEARCH_PROBLEM');
    }
    if (categories.contributions.length === 0) {
      blockers.push('MISSING_CONTRIBUTIONS');
    }
    for (const category of CATEGORY_KEYS) {
      for (const item of categories[category]) {
        if (item.source_refs.length === 0) {
          const code = `MISSING_SOURCE_REF:${category}:${item.id}`;
          if (category === 'research_problem' || category === 'contributions' || category === 'key_findings') {
            blockers.push(code);
          } else {
            warnings.push(code);
          }
        }
      }
    }
    if (categories.method.length === 0) {
      warnings.push('MISSING_METHOD');
    }
    if (categories.key_findings.length === 0) {
      warnings.push('MISSING_KEY_FINDINGS');
    }
    const populatedCategories = CATEGORY_KEYS.filter((category) => categories[category].length > 0).length;
    const allConfidences = CATEGORY_KEYS.flatMap((category) => categories[category].map((item) => item.confidence));
    const averageConfidence = allConfidences.length > 0
      ? allConfidences.reduce((sum, item) => sum + item, 0) / allConfidences.length
      : 0;
    return {
      completeness_score: Number((populatedCategories / CATEGORY_KEYS.length).toFixed(3)),
      confidence: Number(averageConfidence.toFixed(3)),
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
      conflicts: [],
      extraction_diagnostics: diagnostics,
    };
  }

  private resolveReadiness(
    categories: CategoryMap,
    blockers: string[],
  ): LiteratureKeyContentReadinessStatus {
    if (blockers.length > 0) {
      return 'FAILED';
    }
    const hasMissingRecommended = categories.method.length === 0
      || categories.key_findings.length === 0
      || categories.evidence_candidates.length === 0;
    return hasMissingRecommended ? 'PARTIAL_READY' : 'READY';
  }

  private buildDisplayDigest(categories: CategoryMap, existingDigest: string | null): string {
    const existing = normalizeWhitespace(existingDigest ?? '');
    if (existing) {
      return existing;
    }
    const statements = [
      categories.research_problem[0]?.statement,
      categories.contributions[0]?.statement,
      categories.key_findings[0]?.statement,
    ].filter((item): item is string => Boolean(item));
    return statements.join(' ').slice(0, 600);
  }

  private buildInputRefs(bundle: ExtractionSourceBundle, config: OpenAIExtractionConfig): Record<string, unknown> {
    return {
      abstract_profile_id: bundle.abstractProfile?.id ?? null,
      abstract_checksum: bundle.abstractProfile?.checksum ?? null,
      fulltext_document_id: bundle.document.id,
      fulltext_checksum: bundle.document.normalizedTextChecksum,
      extraction_provider: 'openai',
      extraction_model: config.model,
      extraction_profile_id: config.profileId,
      source_section_count: bundle.sections.length,
      source_paragraph_count: bundle.paragraphs.length,
      source_anchor_count: bundle.anchors.length,
    };
  }

  private readDiagnostics(payload: Partial<LiteratureKeyContentDossierPayload>): Record<string, unknown>[] {
    const diagnostics = payload.quality_report?.extraction_diagnostics;
    return Array.isArray(diagnostics) ? diagnostics : [];
  }

  private emptyCategories(): CategoryMap {
    return Object.fromEntries(CATEGORY_KEYS.map((category) => [category, []])) as unknown as CategoryMap;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readNumber(value: unknown, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    return Math.max(0, Math.min(1, value));
  }

  private readEvidenceStrength(value: unknown): LiteratureKeyContentEvidenceStrength {
    return value === 'low' || value === 'medium' || value === 'high' || value === 'unknown'
      ? value
      : 'unknown';
  }

  private slugId(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private openAIOutputSchema(): Record<string, unknown> {
    const sourceRefSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['ref_type', 'ref_id'],
      properties: {
        ref_type: { type: 'string', enum: ['abstract', 'section', 'paragraph', 'anchor', 'manual'] },
        ref_id: { type: 'string' },
      },
    };
    const itemSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'type', 'statement', 'details', 'source_refs', 'confidence', 'evidence_strength', 'notes'],
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        statement: { type: 'string' },
        details: { type: 'string' },
        source_refs: { type: 'array', items: sourceRefSchema },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        evidence_strength: { type: 'string', enum: ['unknown', 'low', 'medium', 'high'] },
        notes: { type: ['string', 'null'] },
      },
    };
    return {
      type: 'object',
      additionalProperties: false,
      required: ['categories', 'quality_report', 'display_digest'],
      properties: {
        categories: {
          type: 'object',
          additionalProperties: false,
          required: [...CATEGORY_KEYS],
          properties: Object.fromEntries(CATEGORY_KEYS.map((category) => [
            category,
            { type: 'array', items: itemSchema },
          ])),
        },
        quality_report: {
          type: 'object',
          additionalProperties: false,
          required: ['extraction_diagnostics'],
          properties: {
            extraction_diagnostics: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['code', 'severity', 'message'],
                properties: {
                  code: { type: 'string' },
                  severity: { type: 'string', enum: ['info', 'warning', 'blocker'] },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        display_digest: { type: 'string' },
      },
    };
  }
}

export type { KeyContentExtractionResult };
