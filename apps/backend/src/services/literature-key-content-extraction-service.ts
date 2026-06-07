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
import {
  BackendLlmGateway,
  DEFAULT_HIGH_REASONING_JSON_SCHEMA_PARAMS,
  LlmGatewayError,
  type LlmCallTelemetry,
} from './llm-gateway.js';

const KEY_CONTENT_SCHEMA_VERSION = 'key_content.v1' as const;
const KEY_CONTENT_EXTRACTION_PROFILE = 'paper_semantic_dossier.v1' as const;
const KEY_CONTENT_SECTION_JSON_SCHEMA_PARAMS = {
  ...DEFAULT_HIGH_REASONING_JSON_SCHEMA_PARAMS,
  reasoning_depth: 'low',
} as const;

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

type SectionExtractionOutcome =
  | {
      ok: true;
      unit: ExtractionUnit;
      payload: Partial<LiteratureKeyContentDossierPayload>;
      telemetry: LlmCallTelemetry;
    }
  | {
      ok: false;
      unit: ExtractionUnit;
      diagnostics: Record<string, unknown>[];
      telemetry: LlmCallTelemetry | null;
    };

export class LiteratureKeyContentExtractionService {
  private readonly llmGateway: BackendLlmGateway;

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly settingsService?: LiteratureContentProcessingSettingsService,
    llmGateway?: BackendLlmGateway,
  ) {
    this.llmGateway = llmGateway ?? new BackendLlmGateway({ settingsService });
  }

  async extract(literature: LiteratureRecord): Promise<KeyContentExtractionResult> {
    const config = await this.settingsService?.resolveExtractionConfig();
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

    const telemetry: LlmCallTelemetry[] = [];
    const extractedPayloads: Array<Partial<LiteratureKeyContentDossierPayload>> = [];
    const diagnostics: Record<string, unknown>[] = [];
    const extracted = await this.mapWithConcurrency(
      units,
      config.runtime.section_concurrency,
      async (unit) => this.extractSectionSafely(literature, bundle, unit, config),
    );
    for (const item of extracted) {
      if (item.ok) {
        extractedPayloads.push(item.payload);
        telemetry.push(item.telemetry);
      } else {
        diagnostics.push(...item.diagnostics);
        if (item.telemetry) {
          telemetry.push(item.telemetry);
        }
      }
    }
    if (extractedPayloads.length === 0) {
      return {
        ready: false,
        reasonCode: 'KEY_CONTENT_EXTRACTION_FAILED',
        reasonMessage: this.readString(diagnostics[0]?.message)
          ?? 'OpenAI key-content extraction failed for every fulltext section.',
        diagnostics: diagnostics.length > 0
          ? diagnostics.map((item) => ({ ...item, severity: 'blocker' }))
          : [{ code: 'KEY_CONTENT_EXTRACTION_FAILED', severity: 'blocker' }],
      };
    }

    const generatedAt = new Date().toISOString();
    const inputRefs = this.buildInputRefs(bundle, config);
    let categories = this.emptyCategories();
    for (const payload of extractedPayloads) {
      const normalized = this.normalizeCategories(payload.categories, bundle, diagnostics);
      for (const category of CATEGORY_KEYS) {
        categories[category].push(...normalized[category]);
      }
      diagnostics.push(...this.readDiagnostics(payload, config));
    }

    try {
      const consolidation = await this.consolidatePaperLevel(literature, bundle, categories, config, diagnostics);
      categories = consolidation.categories;
      telemetry.push(consolidation.telemetry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI paper-level key-content consolidation failed.';
      categories = this.deterministicConsolidateCategories(categories);
      diagnostics.push({
        code: 'KEY_CONTENT_PAPER_LEVEL_CONSOLIDATION_FALLBACK',
        severity: 'warning',
        message: `Paper-level LLM consolidation failed; used deterministic source-preserving consolidation. ${message}`,
      });
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
    payload.quality_report.extraction_diagnostics.push(this.buildLlmTelemetryDiagnostic(telemetry));
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

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const limit = Math.max(1, Math.min(items.length, concurrency));
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    await Promise.all(Array.from({ length: limit }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index]!, index);
      }
    }));
    return results;
  }

  private buildLlmTelemetryDiagnostic(telemetry: LlmCallTelemetry[]): Record<string, unknown> {
    return {
      code: 'KEY_CONTENT_LLM_TELEMETRY',
      severity: 'info',
      message: `LLM calls=${telemetry.reduce((sum, item) => sum + item.request_count, 0)}, retries=${telemetry.reduce((sum, item) => sum + item.retry_count, 0)}, elapsed_ms=${telemetry.reduce((sum, item) => sum + item.elapsed_ms, 0)}.`,
      request_count: telemetry.reduce((sum, item) => sum + item.request_count, 0),
      retry_count: telemetry.reduce((sum, item) => sum + item.retry_count, 0),
      timeout_count: telemetry.reduce((sum, item) => sum + item.timeout_count, 0),
      rate_limit_count: telemetry.reduce((sum, item) => sum + item.rate_limit_count, 0),
      elapsed_ms_total: telemetry.reduce((sum, item) => sum + item.elapsed_ms, 0),
      input_tokens_total: this.sumTelemetryValues(telemetry, 'input_tokens'),
      output_tokens_total: this.sumTelemetryValues(telemetry, 'output_tokens'),
      embedding_input_tokens_total: this.sumTelemetryValues(telemetry, 'embedding_input_tokens'),
      total_tokens: this.sumTelemetryValues(telemetry, 'total_tokens'),
      cost_usd: this.sumTelemetryValues(telemetry, 'cost_usd'),
      prompt_templates: [...new Set(telemetry.map((item) =>
        `${item.prompt_template_id ?? 'embedding'}@${item.prompt_template_version ?? 'none'}`,
      ))],
    };
  }

  private sumTelemetryValues(
    telemetry: LlmCallTelemetry[],
    key: 'input_tokens' | 'output_tokens' | 'embedding_input_tokens' | 'total_tokens' | 'cost_usd',
  ): number | null {
    let total = 0;
    let seen = false;
    for (const item of telemetry) {
      const value = item[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        total += value;
        seen = true;
      }
    }
    return seen ? total : null;
  }

  private emptyTelemetry(
    config: OpenAIExtractionConfig,
    promptTemplateId: string,
    promptTemplateVersion: string,
  ): LlmCallTelemetry {
    return {
      provider_id: config.provider,
      model_id: config.model,
      profile_id: config.profileId,
      prompt_template_id: promptTemplateId,
      prompt_template_version: promptTemplateVersion,
      elapsed_ms: 0,
      request_count: 0,
      retry_count: 0,
      timeout_count: 0,
      rate_limit_count: 0,
      input_tokens: null,
      output_tokens: null,
      embedding_input_tokens: null,
      total_tokens: null,
      cost_usd: null,
      provider_side_cache_hit: null,
      provider_side_cache_read_tokens: null,
      provider_side_cache_write_tokens: null,
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
  ): Promise<{ payload: Partial<LiteratureKeyContentDossierPayload>; telemetry: LlmCallTelemetry }> {
    const response = await this.llmGateway.createStructuredOutput<Partial<LiteratureKeyContentDossierPayload>>({
      executionContext: {
        feature: 'literature_content_processing',
        operation: 'key_content_section',
        literatureId: literature.id,
        metadata: {
          section_id: unit.section.sectionId,
          paragraph_count: unit.paragraphs.length,
        },
      },
      model: {
        providerId: config.provider,
        modelId: config.model,
        profileId: config.profileId,
      },
      prompt: {
        promptTemplateId: 'literature-key-content-section',
        version: config.runtime.prompt_profile_id,
      },
      messages: [
        {
          role: 'system',
          content: [
            'Extract a source-grounded semantic dossier section for a CS paper.',
            'Return JSON only through the provided schema.',
            'Every evidence-bearing item must cite source_refs by copying an exact ref_type and bare ref_id from source_refs_json.',
            'Do not output concatenated refs, bibliography text, labels, or quoted source text as ref_id.',
            'Do not invent claims not supported by the supplied source text.',
          ].join(' '),
        },
        {
          role: 'user',
          content: this.buildSectionPrompt(literature, bundle, unit),
        },
      ],
      schemaName: 'literature_key_content_section',
      schema: this.openAIOutputSchema(),
      normalizedParams: KEY_CONTENT_SECTION_JSON_SCHEMA_PARAMS,
      policy: {
        timeoutMs: config.runtime.request_timeout_ms,
        maxRetries: config.runtime.max_retries,
      },
    });
    return { payload: response.parsed, telemetry: response.telemetry };
  }

  private async extractSectionSafely(
    literature: LiteratureRecord,
    bundle: ExtractionSourceBundle,
    unit: ExtractionUnit,
    config: OpenAIExtractionConfig,
  ): Promise<SectionExtractionOutcome> {
    try {
      const extracted = await this.extractSection(literature, bundle, unit, config);
      return {
        ok: true,
        unit,
        payload: extracted.payload,
        telemetry: extracted.telemetry,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI key-content section extraction failed.';
      return {
        ok: false,
        unit,
        diagnostics: [{
          code: 'KEY_CONTENT_SECTION_EXTRACTION_FAILED',
          severity: 'warning',
          message,
          section_id: unit.section.sectionId,
        }],
        telemetry: error instanceof LlmGatewayError ? error.telemetry ?? null : null,
      };
    }
  }

  private async consolidatePaperLevel(
    literature: LiteratureRecord,
    bundle: ExtractionSourceBundle,
    categories: CategoryMap,
    config: OpenAIExtractionConfig,
    diagnostics: Record<string, unknown>[],
  ): Promise<{ categories: CategoryMap; telemetry: LlmCallTelemetry }> {
    const inputItemCount = this.countCategoryItems(categories);
    if (inputItemCount === 0) {
      return {
        categories,
        telemetry: this.emptyTelemetry(config, 'literature-key-content-consolidation', config.runtime.prompt_profile_id),
      };
    }

    const response = await this.llmGateway.createStructuredOutput<Partial<LiteratureKeyContentDossierPayload>>({
      executionContext: {
        feature: 'literature_content_processing',
        operation: 'key_content_consolidation',
        literatureId: literature.id,
        metadata: {
          input_item_count: inputItemCount,
        },
      },
      model: {
        providerId: config.provider,
        modelId: config.model,
        profileId: config.profileId,
      },
      prompt: {
        promptTemplateId: 'literature-key-content-consolidation',
        version: config.runtime.prompt_profile_id,
      },
      messages: [
        {
          role: 'system',
          content: [
            'Consolidate section-level CS paper dossier items into a paper-level semantic dossier.',
            'Deduplicate equivalent claims, preserve distinct nuanced claims, reconcile conflicts explicitly, and keep source_refs for every evidence-bearing item.',
            'Preserve existing source_refs from the section-level items; do not invent new source refs.',
            'Return JSON only through the provided schema.',
          ].join(' '),
        },
        {
          role: 'user',
          content: this.buildConsolidationPrompt(literature, bundle, categories),
        },
      ],
      schemaName: 'literature_key_content_consolidation',
      schema: this.openAIOutputSchema(),
      normalizedParams: DEFAULT_HIGH_REASONING_JSON_SCHEMA_PARAMS,
      policy: {
        timeoutMs: config.runtime.request_timeout_ms,
        maxRetries: config.runtime.max_retries,
      },
    });
    const structured = response.parsed;
    const consolidationDiagnostics = this.readDiagnostics(structured, config);
    diagnostics.push(...consolidationDiagnostics);
    const consolidated = this.normalizeCategories(structured.categories, bundle, diagnostics);
    if (this.countCategoryItems(consolidated) === 0) {
      throw new Error('OpenAI key-content consolidation removed all category items.');
    }
    diagnostics.push({
      code: 'KEY_CONTENT_PAPER_LEVEL_CONSOLIDATED',
      severity: 'info',
      message: `Consolidated ${inputItemCount} section-level items into ${this.countCategoryItems(consolidated)} paper-level items.`,
    });
    return { categories: consolidated, telemetry: response.telemetry };
  }

  private buildSectionPrompt(
    literature: LiteratureRecord,
    bundle: ExtractionSourceBundle,
    unit: ExtractionUnit,
  ): string {
    const abstractText = bundle.abstractProfile?.abstractText?.trim() ?? '';
    const sourceRefs = this.buildSourceRefInventory(bundle, unit);
    return [
      `Title: ${literature.title}`,
      `Authors: ${literature.authors.join(', ') || 'unknown'}`,
      `Year: ${literature.year ?? 'unknown'}`,
      `Abstract ref: ${bundle.abstractProfile?.id ?? 'abstract'}`,
      abstractText ? `Abstract: ${abstractText}` : 'Abstract: unavailable',
      `Document id: ${bundle.document.id}`,
      `Section id: ${unit.section.sectionId}`,
      `Section title: ${unit.section.title}`,
      'source_refs_json:',
      stableStringify(sourceRefs),
      'Source-ref rule: every source_refs item in your output must copy ref_type and bare ref_id exactly from source_refs_json.',
      'Section text:',
      unit.text,
    ].join('\n\n');
  }

  private buildConsolidationPrompt(
    literature: LiteratureRecord,
    bundle: ExtractionSourceBundle,
    categories: CategoryMap,
  ): string {
    const sourceInventory = this.buildSourceRefInventory(bundle).slice(0, 240);
    const compactCategories = this.buildCompactConsolidationCategories(categories);
    return [
      `Title: ${literature.title}`,
      `Authors: ${literature.authors.join(', ') || 'unknown'}`,
      `Year: ${literature.year ?? 'unknown'}`,
      `Abstract: ${bundle.abstractProfile?.abstractText ?? 'unavailable'}`,
      `Document id: ${bundle.document.id}`,
      'valid_source_refs_json:',
      stableStringify(sourceInventory),
      'Section-level dossier categories to consolidate:',
      stableStringify({ categories: compactCategories }),
      'Consolidation rules:',
      '- Merge semantically equivalent duplicate claims.',
      '- Keep fine-grained distinctions when they matter for cross-paper comparison, methods, formulas, datasets, metrics, limitations, and evidence.',
      '- If claims conflict, keep the canonical claim and add the conflict context in notes while preserving the conflicting source_refs.',
      '- Preserve source_refs already attached to section-level items whenever possible.',
      '- If you add a new source_ref, it must copy ref_type and bare ref_id exactly from valid_source_refs_json.',
    ].join('\n\n');
  }

  private buildCompactConsolidationCategories(categories: CategoryMap): Record<CategoryKey, Array<Record<string, unknown>>> {
    return Object.fromEntries(CATEGORY_KEYS.map((category) => [
      category,
      categories[category].slice(0, 40).map((item) => ({
        id: item.id,
        type: item.type,
        statement: this.truncateForPrompt(item.statement, 700),
        details: this.truncateForPrompt(item.details, 500),
        source_refs: item.source_refs.slice(0, 6).map((ref) => ({
          ref_type: ref.ref_type,
          ref_id: ref.ref_id,
        })),
        confidence: item.confidence,
        evidence_strength: item.evidence_strength,
        notes: item.notes ? this.truncateForPrompt(item.notes, 300) : null,
      })),
    ])) as unknown as Record<CategoryKey, Array<Record<string, unknown>>>;
  }

  private truncateForPrompt(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
  }

  private deterministicConsolidateCategories(categories: CategoryMap): CategoryMap {
    const consolidated = this.emptyCategories();
    for (const category of CATEGORY_KEYS) {
      const byStatement = new Map<string, LiteratureKeyContentItem>();
      for (const item of categories[category]) {
        const key = normalizeWhitespace(item.statement).toLowerCase();
        const existing = byStatement.get(key);
        if (!existing) {
          byStatement.set(key, item);
          continue;
        }
        byStatement.set(key, {
          ...existing,
          details: existing.details.length >= item.details.length ? existing.details : item.details,
          source_refs: this.mergeSourceRefs(existing.source_refs, item.source_refs),
          confidence: Math.max(existing.confidence, item.confidence),
          evidence_strength: this.maxEvidenceStrength(existing.evidence_strength, item.evidence_strength),
          notes: existing.notes ?? item.notes,
        });
      }
      consolidated[category] = [...byStatement.values()];
    }
    return consolidated;
  }

  private mergeSourceRefs(
    left: LiteratureKeyContentSourceRef[],
    right: LiteratureKeyContentSourceRef[],
  ): LiteratureKeyContentSourceRef[] {
    const byKey = new Map<string, LiteratureKeyContentSourceRef>();
    for (const ref of [...left, ...right]) {
      byKey.set(`${ref.ref_type}:${ref.ref_id}`, ref);
    }
    return [...byKey.values()];
  }

  private maxEvidenceStrength(
    left: LiteratureKeyContentEvidenceStrength,
    right: LiteratureKeyContentEvidenceStrength,
  ): LiteratureKeyContentEvidenceStrength {
    const order: Record<LiteratureKeyContentEvidenceStrength, number> = {
      unknown: 0,
      low: 1,
      medium: 2,
      high: 3,
    };
    return order[right] > order[left] ? right : left;
  }

  private buildSourceRefInventory(
    bundle: ExtractionSourceBundle,
    unit?: ExtractionUnit,
  ): Array<Record<string, unknown>> {
    const sectionIds = new Set(unit ? [unit.section.sectionId] : bundle.sections.map((section) => section.sectionId));
    const paragraphIds = new Set(unit ? unit.paragraphs.map((paragraph) => paragraph.paragraphId) : bundle.paragraphs.map((paragraph) => paragraph.paragraphId));
    const refs: Array<Record<string, unknown>> = [];
    if (bundle.abstractProfile) {
      refs.push({
        ref_type: 'abstract',
        ref_id: bundle.abstractProfile.id,
        aliases: ['abstract'],
      });
    }
    for (const section of bundle.sections) {
      if (!sectionIds.has(section.sectionId)) {
        continue;
      }
      refs.push({
        ref_type: 'section',
        ref_id: section.sectionId,
        title: section.title,
      });
    }
    for (const paragraph of bundle.paragraphs) {
      if (!paragraphIds.has(paragraph.paragraphId)) {
        continue;
      }
      refs.push({
        ref_type: 'paragraph',
        ref_id: paragraph.paragraphId,
        section_id: paragraph.sectionId,
      });
    }
    for (const anchor of bundle.anchors.slice(0, unit ? 60 : 180)) {
      refs.push({
        ref_type: 'anchor',
        ref_id: anchor.anchorId,
        anchor_type: anchor.anchorType,
        label: anchor.label ?? null,
      });
    }
    return refs;
  }

  private tryReadObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
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
    const unresolved: Array<{ ref_type: unknown; ref_id: string }> = [];
    for (const item of value) {
      const row = this.tryReadObject(item);
      if (!row) {
        continue;
      }
      const candidate = this.repairSourceRefCandidate(row.ref_type, normalizeWhitespace(this.readString(row.ref_id) ?? ''), bundle);
      const resolved = candidate ? this.resolveSourceRef(candidate.refType, candidate.refId, bundle) : null;
      if (resolved) {
        refs.push(resolved);
      } else if (candidate?.refId) {
        unresolved.push({ ref_type: candidate.refType, ref_id: candidate.refId });
      }
    }
    if (refs.length === 0) {
      for (const item of unresolved) {
        diagnostics.push({
          code: 'SOURCE_REF_UNRESOLVED',
          severity: 'warning',
          ref_type: item.ref_type,
          ref_id: item.ref_id,
        });
      }
    }
    return refs;
  }

  private repairSourceRefCandidate(
    rawRefType: unknown,
    rawRefId: string,
    bundle: ExtractionSourceBundle,
  ): { refType: string; refId: string } | null {
    const refType = typeof rawRefType === 'string' ? rawRefType.trim().toLowerCase() : '';
    const refId = rawRefId.trim();
    if (!refId) {
      return null;
    }

    const direct = this.findResolvableSourceRef(refType, refId, bundle);
    if (direct) {
      return direct;
    }

    const prefixed = refId.match(/^(abstract|section|paragraph|anchor|manual)\s*[:#]\s*(.+)$/i);
    if (prefixed) {
      const prefixType = prefixed[1]!.toLowerCase();
      const prefixId = normalizeWhitespace(prefixed[2] ?? '').split(/\s+/)[0] ?? '';
      const resolved = this.findResolvableSourceRef(prefixType, prefixId, bundle);
      if (resolved) {
        return resolved;
      }
    }

    const colonParts = refId.split(':').map((item) => item.trim()).filter(Boolean);
    if (colonParts.length >= 2) {
      const [prefix, id] = colonParts;
      if (prefix && id) {
        const anchorByType = bundle.anchors.find((anchor) =>
          anchor.anchorType.toLowerCase() === prefix.toLowerCase() && anchor.anchorId === id,
        );
        if (anchorByType) {
          return { refType: 'anchor', refId: anchorByType.anchorId };
        }
        const resolved = this.findResolvableSourceRef(refType || prefix, id, bundle);
        if (resolved) {
          return resolved;
        }
      }
    }

    const normalizedLabel = this.normalizedLookupKey(refId);
    const anchorByLabel = bundle.anchors.find((anchor) =>
      this.normalizedLookupKey(anchor.label ?? '') === normalizedLabel
        || this.normalizedLookupKey(anchor.text ?? '') === normalizedLabel,
    );
    if (anchorByLabel) {
      return { refType: 'anchor', refId: anchorByLabel.anchorId };
    }

    const inferred = this.findResolvableSourceRef('', refId, bundle);
    return inferred ?? { refType: refType || 'unknown', refId };
  }

  private findResolvableSourceRef(
    refType: string,
    refId: string,
    bundle: ExtractionSourceBundle,
  ): { refType: string; refId: string } | null {
    if ((refType === 'abstract' || refType === '') && bundle.abstractProfile && (refId === 'abstract' || refId === bundle.abstractProfile.id)) {
      return { refType: 'abstract', refId: bundle.abstractProfile.id };
    }
    if ((refType === 'section' || refType === '') && bundle.sections.some((item) => item.sectionId === refId)) {
      return { refType: 'section', refId };
    }
    if ((refType === 'paragraph' || refType === '') && bundle.paragraphs.some((item) => item.paragraphId === refId)) {
      return { refType: 'paragraph', refId };
    }
    if ((refType === 'anchor' || refType === '') && bundle.anchors.some((item) => item.anchorId === refId)) {
      return { refType: 'anchor', refId };
    }
    if (refType === 'manual' && refId) {
      return { refType: 'manual', refId };
    }
    return null;
  }

  private normalizedLookupKey(value: string): string {
    return normalizeWhitespace(value).toLowerCase();
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

  private readDiagnostics(
    payload: Partial<LiteratureKeyContentDossierPayload>,
    config: OpenAIExtractionConfig,
  ): Record<string, unknown>[] {
    const diagnostics = payload.quality_report?.extraction_diagnostics;
    if (!Array.isArray(diagnostics)) {
      return [];
    }
    return diagnostics
      .map((item) => this.normalizeDiagnostic(item, config.runtime.diagnostic_policy))
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  private normalizeDiagnostic(value: unknown, policy: string): Record<string, unknown> | null {
    const row = this.tryReadObject(value);
    if (!row) {
      return null;
    }
    const code = this.readString(row.code) ?? 'MODEL_DIAGNOSTIC';
    const rawSeverity = this.readString(row.severity) ?? 'info';
    let severity = rawSeverity === 'warning' || rawSeverity === 'blocker' ? rawSeverity : 'info';
    if (policy === 'actionable_v1' && severity === 'warning' && this.isGenericLimitedSourceDiagnostic(code)) {
      severity = 'info';
    }
    return {
      code,
      severity,
      message: this.readString(row.message) ?? '',
    };
  }

  private isGenericLimitedSourceDiagnostic(code: string): boolean {
    const normalized = code.toLowerCase();
    return normalized.includes('limited_source')
      || normalized.includes('limited_context')
      || normalized.includes('limited_scope')
      || normalized.includes('scope_limited')
      || normalized.includes('source_scope_limited')
      || normalized.includes('no_numeric_result')
      || normalized.includes('no_experiment')
      || normalized.includes('no_dataset')
      || normalized.includes('scope_warning');
  }

  private emptyCategories(): CategoryMap {
    return Object.fromEntries(CATEGORY_KEYS.map((category) => [category, []])) as unknown as CategoryMap;
  }

  private countCategoryItems(categories: CategoryMap): number {
    return CATEGORY_KEYS.reduce((sum, category) => sum + categories[category].length, 0);
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
