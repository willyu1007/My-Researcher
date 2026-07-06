import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type {
  LiteratureContentAssetRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteratureRepository,
} from '../../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';
import { normalizeWhitespace, sha256Text } from '../literature-content-processing-utils.js';

// T-130 W-02 (D5): GROBID production posture — request timeout, bounded retry, health-probe gate,
// and a circuit breaker that reuses the shared LiteratureSourceRuntimeState cooldown mechanism
// (same exponential backoff as arxiv/unpaywall). Timeout is env-adjustable for now; moving these
// knobs into the content-processing settings face is W-10 scope.
const GROBID_SOURCE_KEY = 'grobid';
const DEFAULT_GROBID_REQUEST_TIMEOUT_MS = 120_000;
const GROBID_TIMEOUT_ENV = 'LITERATURE_GROBID_TIMEOUT_MS';
const GROBID_HEALTH_PROBE_TIMEOUT_MS = 5_000;
const GROBID_HEALTH_PROBE_CACHE_MS = 30_000;
const GROBID_MAX_RETRIES = 1;
const GROBID_RETRY_DELAY_MS = 500;

type GrobidRuntimeStateStore = Pick<LiteratureRepository, 'findSourceRuntimeState' | 'upsertSourceRuntimeState'>;

type ParsedSection = Omit<LiteratureFulltextSectionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParsedParagraph = Omit<LiteratureFulltextParagraphRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParsedAnchor = Omit<LiteratureFulltextAnchorRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParserQualityBucket = 'high' | 'medium' | 'low';

type ParserQualityAssessment = {
  score: number;
  bucket: ParserQualityBucket;
  inputs: {
    text_length: number;
    section_count: number;
    paragraph_count: number;
    anchor_count: number;
    average_paragraph_length: number;
    page_count: number;
  };
};

export type GrobidFulltextParseResult =
  | {
      ready: true;
      normalizedText: string;
      teiXml: string;
      parserName: 'grobid-tei-v1';
      parserVersion: string;
      sections: ParsedSection[];
      paragraphs: ParsedParagraph[];
      anchors: ParsedAnchor[];
      diagnostics: Record<string, unknown>[];
    }
  | {
      ready: false;
      reasonCode: string;
      reasonMessage: string;
      diagnostics: Record<string, unknown>[];
    };

type XmlNode = Record<string, unknown>;

export class LiteratureGrobidFulltextParser {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
  });

  private healthProbeHealthyUntil = 0;
  private healthProbeEndpoint: string | null = null;

  constructor(
    private readonly settingsService?: LiteratureContentProcessingSettingsService,
    private readonly runtimeStateStore?: GrobidRuntimeStateStore,
  ) {}

  async parse(sourceAsset: LiteratureContentAssetRecord): Promise<GrobidFulltextParseResult> {
    if (!this.settingsService) {
      return {
        ready: false,
        reasonCode: 'FULLTEXT_PARSER_UNAVAILABLE',
        reasonMessage: 'GROBID endpoint settings are not available.',
        diagnostics: [{ code: 'FULLTEXT_PARSER_UNAVAILABLE', severity: 'blocker' }],
      };
    }

    const endpointUrl = await this.settingsService.resolveGrobidEndpointUrl();

    // D5 gates activate when the runtime-state store is wired (production construction passes the
    // repository); bare construction keeps the legacy direct-call behavior for isolated tests.
    if (this.runtimeStateStore) {
      // Gate 1: circuit breaker — while the shared source cooldown is open, fail fast without
      // touching GROBID at all (recovering the endpoint clears via cooldown expiry).
      const circuitBlock = await this.checkCircuitOpen(endpointUrl);
      if (circuitBlock) {
        return circuitBlock;
      }

      // Gate 2: health probe (cached while healthy) — a down endpoint blocks the stage in ~5s
      // instead of hanging into the full request timeout, and records a breaker failure.
      const probeBlock = await this.probeHealthGate(endpointUrl);
      if (probeBlock) {
        return probeBlock;
      }
    }

    const body = new FormData();
    const fileBuffer = await fs.readFile(sourceAsset.localPath);
    const fileData = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;
    body.append('input', new Blob([fileData], { type: sourceAsset.mimeType || 'application/pdf' }), path.basename(sourceAsset.localPath));
    for (const coordinate of ['figure', 'table', 'formula', 'ref', 'biblStruct', 's']) {
      body.append('teiCoordinates', coordinate);
    }
    body.append('segmentSentences', '1');
    body.append('generateIDs', '1');
    body.append('includeRawCitations', '1');

    const timeoutMs = this.requestTimeoutMs();
    const maxAttempts = 1 + GROBID_MAX_RETRIES;
    let response: Response | null = null;
    let lastFailure: { failureClass: 'timeout' | 'connection' | 'http_503'; message: string } | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        response = await fetch(`${endpointUrl}/api/processFulltextDocument`, {
          method: 'POST',
          headers: { Accept: 'application/xml' },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const failureClass = this.isTimeoutError(error) ? 'timeout' as const : 'connection' as const;
        lastFailure = {
          failureClass,
          message: error instanceof Error ? error.message : 'GROBID request failed.',
        };
        response = null;
        if (attempt < maxAttempts) {
          await this.delay(GROBID_RETRY_DELAY_MS);
          continue;
        }
        break;
      }

      if (response.status === 503 && attempt < maxAttempts) {
        lastFailure = { failureClass: 'http_503', message: 'GROBID responded 503 (busy/unavailable).' };
        response = null;
        await this.delay(GROBID_RETRY_DELAY_MS);
        continue;
      }
      break;
    }

    if (!response) {
      await this.recordBreakerFailure(lastFailure?.failureClass === 'timeout' ? 'GROBID_TIMEOUT' : 'GROBID_UNREACHABLE', lastFailure?.message ?? null);
      return {
        ready: false,
        reasonCode: 'FULLTEXT_PARSER_UNAVAILABLE',
        reasonMessage: lastFailure?.failureClass === 'timeout'
          ? `GROBID timed out after ${timeoutMs}ms (with ${GROBID_MAX_RETRIES} retry).`
          : `GROBID is not reachable at ${endpointUrl}.`,
        diagnostics: [{
          code: 'FULLTEXT_PARSER_UNAVAILABLE',
          severity: 'blocker',
          endpoint_url: endpointUrl,
          failure_class: lastFailure?.failureClass ?? 'connection',
          attempts: maxAttempts,
          timeout_ms: timeoutMs,
          message: lastFailure?.message ?? 'GROBID request failed.',
        }],
      };
    }

    if (response.status === 204) {
      await this.recordBreakerSuccess();
      return this.ocrRequired(sourceAsset, endpointUrl, 'GROBID returned no extractable content.');
    }
    const teiXml = await response.text();
    if (!response.ok) {
      const code = this.grobidErrorCode(teiXml);
      if (code === 'NO_BLOCKS') {
        await this.recordBreakerSuccess();
        return this.ocrRequired(sourceAsset, endpointUrl, 'GROBID found no text blocks in the PDF.');
      }
      if (response.status === 503) {
        await this.recordBreakerFailure('GROBID_HTTP_503', 'GROBID responded 503 after retry.');
      } else {
        // Non-503 HTTP errors mean the service is reachable; do not open the breaker.
        await this.recordBreakerSuccess();
      }
      return {
        ready: false,
        reasonCode: response.status === 503 ? 'FULLTEXT_PARSER_UNAVAILABLE' : 'FULLTEXT_PARSER_FAILED',
        reasonMessage: `GROBID fulltext parsing failed with status ${response.status}.`,
        diagnostics: [{
          code: response.status === 503 ? 'FULLTEXT_PARSER_UNAVAILABLE' : 'FULLTEXT_PARSER_FAILED',
          severity: 'blocker',
          endpoint_url: endpointUrl,
          status: response.status,
          failure_class: response.status === 503 ? 'http_503' : 'http_error',
          grobid_error_code: code,
          body: teiXml.slice(0, 1000),
        }],
      };
    }

    await this.recordBreakerSuccess();
    const parsed = this.parseTei(teiXml);
    if (parsed.paragraphs.length === 0 || normalizeWhitespace(parsed.normalizedText).length === 0) {
      return this.ocrRequired(sourceAsset, endpointUrl, 'GROBID parsed the PDF but did not produce body text.');
    }

    return {
      ready: true,
      normalizedText: parsed.normalizedText,
      teiXml,
      parserName: 'grobid-tei-v1',
      parserVersion: '1',
      sections: parsed.sections,
      paragraphs: parsed.paragraphs,
      anchors: parsed.anchors,
      diagnostics: this.buildSuccessDiagnostics(endpointUrl, parsed),
    };
  }

  private requestTimeoutMs(): number {
    const raw = Number(process.env[GROBID_TIMEOUT_ENV]);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_GROBID_REQUEST_TIMEOUT_MS;
  }

  private isTimeoutError(error: unknown): boolean {
    return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async checkCircuitOpen(endpointUrl: string): Promise<GrobidFulltextParseResult | null> {
    if (!this.runtimeStateStore) {
      return null;
    }
    const state = await this.runtimeStateStore.findSourceRuntimeState(GROBID_SOURCE_KEY);
    if (!state || state.status !== 'COOLDOWN' || !state.cooldownUntil) {
      return null;
    }
    if (state.cooldownUntil <= new Date().toISOString()) {
      return null;
    }
    return {
      ready: false,
      reasonCode: 'FULLTEXT_PARSER_UNAVAILABLE',
      reasonMessage: `GROBID circuit is open until ${state.cooldownUntil} after ${state.failureCount} failure(s).`,
      diagnostics: [{
        code: 'FULLTEXT_PARSER_UNAVAILABLE',
        severity: 'blocker',
        endpoint_url: endpointUrl,
        failure_class: 'circuit_open',
        cooldown_until: state.cooldownUntil,
        failure_count: state.failureCount,
        last_error_code: state.lastErrorCode,
      }],
    };
  }

  private async probeHealthGate(endpointUrl: string): Promise<GrobidFulltextParseResult | null> {
    const now = Date.now();
    if (this.healthProbeEndpoint === endpointUrl && this.healthProbeHealthyUntil > now) {
      return null;
    }
    let healthy = false;
    let message = 'GROBID health probe failed.';
    try {
      const probe = await fetch(`${endpointUrl}/api/isalive`, {
        signal: AbortSignal.timeout(GROBID_HEALTH_PROBE_TIMEOUT_MS),
      });
      healthy = probe.ok;
      if (!probe.ok) {
        message = `GROBID health probe returned ${probe.status}.`;
      }
    } catch (error) {
      message = error instanceof Error ? error.message : message;
    }
    if (healthy) {
      this.healthProbeEndpoint = endpointUrl;
      this.healthProbeHealthyUntil = now + GROBID_HEALTH_PROBE_CACHE_MS;
      return null;
    }
    await this.recordBreakerFailure('GROBID_HEALTH_PROBE_FAILED', message);
    return {
      ready: false,
      reasonCode: 'FULLTEXT_PARSER_UNAVAILABLE',
      reasonMessage: `GROBID is not healthy at ${endpointUrl}; the stage was blocked before submitting the document.`,
      diagnostics: [{
        code: 'FULLTEXT_PARSER_UNAVAILABLE',
        severity: 'blocker',
        endpoint_url: endpointUrl,
        failure_class: 'health_probe_failed',
        message,
      }],
    };
  }

  private async recordBreakerSuccess(): Promise<void> {
    if (!this.runtimeStateStore) {
      return;
    }
    const existing = await this.runtimeStateStore.findSourceRuntimeState(GROBID_SOURCE_KEY);
    const now = new Date().toISOString();
    await this.runtimeStateStore.upsertSourceRuntimeState({
      id: existing?.id ?? crypto.randomUUID(),
      source: GROBID_SOURCE_KEY,
      status: 'READY',
      cooldownUntil: null,
      failureCount: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastRequestAt: now,
      lastSuccessAt: now,
      lastFailureAt: existing?.lastFailureAt ?? null,
      metadata: existing?.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private async recordBreakerFailure(errorCode: string, errorMessage: string | null): Promise<void> {
    this.healthProbeHealthyUntil = 0;
    if (!this.runtimeStateStore) {
      return;
    }
    const existing = await this.runtimeStateStore.findSourceRuntimeState(GROBID_SOURCE_KEY);
    const now = new Date().toISOString();
    const failureCount = (existing?.failureCount ?? 0) + 1;
    // Same exponential backoff shape as the arxiv/unpaywall source cooldowns.
    const cooldownUntil = new Date(Date.now() + Math.min(60_000 * failureCount, 900_000)).toISOString();
    await this.runtimeStateStore.upsertSourceRuntimeState({
      id: existing?.id ?? crypto.randomUUID(),
      source: GROBID_SOURCE_KEY,
      status: 'COOLDOWN',
      cooldownUntil,
      failureCount,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      lastRequestAt: now,
      lastSuccessAt: existing?.lastSuccessAt ?? null,
      lastFailureAt: now,
      metadata: existing?.metadata ?? {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  parseTei(teiXml: string): {
    normalizedText: string;
    sections: ParsedSection[];
    paragraphs: ParsedParagraph[];
    anchors: ParsedAnchor[];
  } {
    const root = this.parser.parse(teiXml) as XmlNode;
    const body = this.firstDescendant(root, 'body') ?? root;
    const normalizedParts: string[] = [];
    const sections: ParsedSection[] = [];
    const paragraphs: ParsedParagraph[] = [];
    const anchors = this.extractAnchors(root);
    const divs = this.descendants(body, 'div');
    const sectionNodes = divs.length > 0 ? divs : [body];

    for (const sectionNode of sectionNodes) {
      const title = this.readSectionTitle(sectionNode) ?? 'Body';
      const sectionId = this.xmlId(sectionNode) ?? `sec-${sections.length + 1}`;
      const startOffset = this.currentOffset(normalizedParts);
      this.appendPart(normalizedParts, `# ${title}`);
      const sectionParagraphs = this.directOrNestedParagraphs(sectionNode);
      for (const paragraphNode of sectionParagraphs) {
        const paragraphText = normalizeWhitespace(this.textContent(paragraphNode));
        if (!paragraphText) {
          continue;
        }
        const paragraphStart = this.currentOffset(normalizedParts);
        this.appendPart(normalizedParts, paragraphText);
        const paragraphEnd = paragraphStart + paragraphText.length;
        paragraphs.push({
          paragraphId: this.xmlId(paragraphNode) ?? `p-${paragraphs.length + 1}`,
          sectionId,
          orderIndex: paragraphs.length,
          text: paragraphText,
          startOffset: paragraphStart,
          endOffset: paragraphEnd,
          pageNumber: this.pageFromCoords(this.attr(paragraphNode, 'coords')),
          checksum: sha256Text(paragraphText),
          confidence: 0.95,
        });
      }
      const endOffset = this.currentOffset(normalizedParts);
      sections.push({
        sectionId,
        title,
        level: this.sectionLevel(sectionNode),
        orderIndex: sections.length,
        startOffset,
        endOffset,
        pageStart: this.pageFromCoords(this.attr(sectionNode, 'coords')),
        pageEnd: this.pageFromCoords(this.attr(sectionNode, 'coords')),
        checksum: sha256Text(`${title}:${startOffset}:${endOffset}`),
      });
    }

    return {
      normalizedText: normalizedParts.join('\n\n').trim(),
      sections,
      paragraphs,
      anchors,
    };
  }

  private ocrRequired(
    sourceAsset: LiteratureContentAssetRecord,
    endpointUrl: string,
    message: string,
  ): GrobidFulltextParseResult {
    return {
      ready: false,
      reasonCode: 'FULLTEXT_OCR_REQUIRED',
      reasonMessage: 'The PDF appears to be scanned or has no extractable text; OCR is required before preprocessing can complete.',
      diagnostics: [{
        code: 'FULLTEXT_OCR_REQUIRED',
        severity: 'blocker',
        endpoint_url: endpointUrl,
        local_path: sourceAsset.localPath,
        message,
      }],
    };
  }

  private buildSuccessDiagnostics(
    endpointUrl: string,
    parsed: {
      normalizedText: string;
      sections: ParsedSection[];
      paragraphs: ParsedParagraph[];
      anchors: ParsedAnchor[];
    },
  ): Record<string, unknown>[] {
    const textLength = normalizeWhitespace(parsed.normalizedText).length;
    const quality = this.assessParserQuality(parsed);
    const diagnostics: Record<string, unknown>[] = [{
      code: 'GROBID_TEI_PARSED',
      severity: 'info',
      endpoint_url: endpointUrl,
      text_length: textLength,
      section_count: parsed.sections.length,
      paragraph_count: parsed.paragraphs.length,
      anchor_count: parsed.anchors.length,
      parser_quality_score: quality.score,
      parser_quality_bucket: quality.bucket,
      parser_quality_inputs: quality.inputs,
    }];
    if (quality.bucket === 'low') {
      diagnostics.push({
        code: 'FULLTEXT_PARSER_QUALITY_LOW',
        severity: 'warning',
        message: 'GROBID succeeded but extracted content quality is low; review before relying on section-aware chunks or retrieval evidence.',
        parser_quality_score: quality.score,
        parser_quality_bucket: quality.bucket,
        parser_quality_inputs: quality.inputs,
      });
    } else if (quality.bucket === 'medium') {
      diagnostics.push({
        code: 'FULLTEXT_PARSER_QUALITY_MEDIUM',
        severity: 'info',
        message: 'GROBID extracted usable text with moderate structure; retrieval can proceed but section-aware evidence may be less precise.',
        parser_quality_score: quality.score,
        parser_quality_bucket: quality.bucket,
        parser_quality_inputs: quality.inputs,
      });
    }
    if (parsed.sections.length <= 1 && parsed.paragraphs.length >= 3) {
      diagnostics.push({
        code: 'FULLTEXT_SECTION_STRUCTURE_WEAK',
        severity: 'warning',
        message: 'GROBID extracted body text but little section hierarchy; downstream section-aware chunking may be less precise.',
        section_count: parsed.sections.length,
        paragraph_count: parsed.paragraphs.length,
      });
    }
    if (textLength < 1_000) {
      diagnostics.push({
        code: 'FULLTEXT_LOW_TEXT_VOLUME',
        severity: 'warning',
        message: 'GROBID extracted unusually little text for a PDF; verify this is not a scanned or publisher-restricted file.',
        text_length: textLength,
      });
    }
    if (parsed.anchors.length === 0) {
      diagnostics.push({
        code: 'FULLTEXT_NO_VISUAL_ANCHORS',
        severity: 'info',
        message: 'GROBID did not extract figure/table/formula anchors for this PDF.',
      });
    }
    return diagnostics;
  }

  private assessParserQuality(parsed: {
    normalizedText: string;
    sections: ParsedSection[];
    paragraphs: ParsedParagraph[];
    anchors: ParsedAnchor[];
  }): ParserQualityAssessment {
    const textLength = normalizeWhitespace(parsed.normalizedText).length;
    const paragraphLengths = parsed.paragraphs.map((paragraph) => normalizeWhitespace(paragraph.text).length);
    const averageParagraphLength = paragraphLengths.length > 0
      ? paragraphLengths.reduce((sum, value) => sum + value, 0) / paragraphLengths.length
      : 0;
    const pageNumbers = new Set<number>();
    for (const paragraph of parsed.paragraphs) {
      if (typeof paragraph.pageNumber === 'number') {
        pageNumbers.add(paragraph.pageNumber);
      }
    }
    for (const anchor of parsed.anchors) {
      if (typeof anchor.pageNumber === 'number') {
        pageNumbers.add(anchor.pageNumber);
      }
    }

    const textVolumeScore = this.clamp(textLength / 7_000);
    const paragraphScore = this.clamp(parsed.paragraphs.length / 20);
    const sectionScore = parsed.sections.length >= 4
      ? 1
      : parsed.sections.length === 3
        ? 0.85
        : parsed.sections.length === 2
          ? 0.65
          : parsed.paragraphs.length >= 5
            ? 0.35
            : 0.55;
    const paragraphShapeScore = averageParagraphLength >= 200
      ? 1
      : averageParagraphLength >= 120
        ? 0.8
        : averageParagraphLength >= 60
          ? 0.55
          : 0.3;
    const anchorScore = parsed.anchors.length > 0 ? 1 : 0.6;
    const score = this.roundQualityScore(
      (textVolumeScore * 0.35)
      + (paragraphScore * 0.20)
      + (sectionScore * 0.20)
      + (paragraphShapeScore * 0.15)
      + (anchorScore * 0.10),
    );

    return {
      score,
      bucket: score >= 0.8 ? 'high' : score >= 0.55 ? 'medium' : 'low',
      inputs: {
        text_length: textLength,
        section_count: parsed.sections.length,
        paragraph_count: parsed.paragraphs.length,
        anchor_count: parsed.anchors.length,
        average_paragraph_length: Math.round(averageParagraphLength),
        page_count: pageNumbers.size,
      },
    };
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, value));
  }

  private roundQualityScore(value: number): number {
    return Math.round(this.clamp(value) * 10_000) / 10_000;
  }

  private extractAnchors(root: XmlNode): ParsedAnchor[] {
    const anchors: ParsedAnchor[] = [];
    for (const tagName of ['figure', 'table', 'formula', 'ref', 'biblStruct']) {
      for (const node of this.descendants(root, tagName)) {
        const typeAttr = this.attr(node, 'type');
        const anchorType = tagName === 'figure' && typeAttr === 'table' ? 'table' : tagName;
        const text = normalizeWhitespace(this.textContent(node));
        const coords = this.attr(node, 'coords');
        const bbox = this.parseCoords(coords);
        anchors.push({
          anchorId: this.xmlId(node) ?? `${anchorType}-${anchors.length + 1}`,
          anchorType,
          label: this.textContent(this.firstChild(node, 'label')).trim() || this.textContent(this.firstChild(node, 'head')).trim() || null,
          text: text || null,
          pageNumber: this.pageFromCoords(coords),
          bbox,
          targetRefs: this.attr(node, 'target') ? [{ target: this.attr(node, 'target') }] : [],
          metadata: {
            tag_name: tagName,
            type: typeAttr,
          },
          checksum: text ? sha256Text(text) : null,
        });
      }
    }
    return anchors;
  }

  private directOrNestedParagraphs(node: XmlNode): XmlNode[] {
    const paragraphs = this.descendants(node, 'p');
    if (paragraphs.length > 0) {
      return paragraphs;
    }
    return this.descendants(node, 's');
  }

  private readSectionTitle(node: XmlNode): string | null {
    const head = this.firstChild(node, 'head');
    const title = head ? normalizeWhitespace(this.textContent(head)) : '';
    return title || null;
  }

  private sectionLevel(node: XmlNode): number {
    const raw = this.attr(node, 'subtype') ?? this.attr(node, 'type');
    const match = raw?.match(/level\s*(\d+)/i) ?? raw?.match(/(\d+)/);
    return match ? Number(match[1]) : 1;
  }

  private firstDescendant(node: unknown, tagName: string): XmlNode | null {
    return this.descendants(node, tagName)[0] ?? null;
  }

  private descendants(node: unknown, tagName: string): XmlNode[] {
    const rows: XmlNode[] = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') {
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item);
        }
        return;
      }
      const row = value as XmlNode;
      for (const [key, child] of Object.entries(row)) {
        if (key === tagName || key.endsWith(`:${tagName}`)) {
          if (Array.isArray(child)) {
            rows.push(...child.filter((item): item is XmlNode => Boolean(item) && typeof item === 'object' && !Array.isArray(item)));
          } else if (child && typeof child === 'object') {
            rows.push(child as XmlNode);
          }
        }
        visit(child);
      }
    };
    visit(node);
    return rows;
  }

  private firstChild(node: XmlNode, tagName: string): XmlNode | null {
    for (const [key, child] of Object.entries(node)) {
      if (key === tagName || key.endsWith(`:${tagName}`)) {
        if (Array.isArray(child)) {
          const objectChild = child.find((item): item is XmlNode => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
          if (objectChild) {
            return objectChild;
          }
          const primitiveChild = child.find((item) => typeof item === 'string' || typeof item === 'number');
          return primitiveChild === undefined ? null : { '#text': String(primitiveChild) };
        }
        if (child && typeof child === 'object') {
          return child as XmlNode;
        }
        return typeof child === 'string' || typeof child === 'number' ? { '#text': String(child) } : null;
      }
    }
    return null;
  }

  private textContent(node: unknown): string {
    if (node === null || node === undefined) {
      return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map((item) => this.textContent(item)).join(' ');
    }
    if (typeof node !== 'object') {
      return '';
    }
    const row = node as XmlNode;
    return Object.entries(row)
      .filter(([key]) => !key.startsWith('@_'))
      .map(([, value]) => this.textContent(value))
      .join(' ');
  }

  private xmlId(node: XmlNode): string | null {
    return this.attr(node, 'xml:id') ?? this.attr(node, 'id');
  }

  private attr(node: XmlNode, name: string): string | null {
    const direct = node[`@_${name}`];
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
    const localName = name.includes(':') ? name.split(':').at(-1) : name;
    if (!localName) {
      return null;
    }
    const fallback = node[`@_${localName}`];
    return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : null;
  }

  private parseCoords(raw: string | null): Record<string, unknown> | null {
    if (!raw) {
      return null;
    }
    const boxes = raw.split(';')
      .map((entry) => entry.split(',').map((value) => Number(value.trim())))
      .filter((values) => values.length >= 5 && values.every((value) => Number.isFinite(value)))
      .map(([page, x, y, width, height]) => ({ page, x, y, width, height }));
    return {
      raw,
      boxes,
    };
  }

  private pageFromCoords(raw: string | null): number | null {
    if (!raw) {
      return null;
    }
    const page = Number(raw.split(',')[0]);
    return Number.isFinite(page) ? page : null;
  }

  private appendPart(parts: string[], text: string): void {
    if (text.trim()) {
      parts.push(text.trim());
    }
  }

  private currentOffset(parts: string[]): number {
    return parts.length === 0 ? 0 : parts.join('\n\n').length + 2;
  }

  private grobidErrorCode(body: string): string | null {
    const match = body.match(/\b(NO_BLOCKS|BAD_INPUT_DATA|TOO_MANY_BLOCKS|TOO_MANY_TOKENS|TIMEOUT|TAGGING_ERROR|PARSING_ERROR|PDFALTO_CONVERSION_FAILURE|GENERAL)\b/);
    return match?.[1] ?? null;
  }
}
