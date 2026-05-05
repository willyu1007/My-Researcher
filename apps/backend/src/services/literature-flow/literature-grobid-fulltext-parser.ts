import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type {
  LiteratureContentAssetRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
} from '../../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';
import { normalizeWhitespace, sha256Text } from '../literature-content-processing-utils.js';

type ParsedSection = Omit<LiteratureFulltextSectionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParsedParagraph = Omit<LiteratureFulltextParagraphRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParsedAnchor = Omit<LiteratureFulltextAnchorRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;

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

  constructor(private readonly settingsService?: LiteratureContentProcessingSettingsService) {}

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

    let response: Response;
    try {
      response = await fetch(`${endpointUrl}/api/processFulltextDocument`, {
        method: 'POST',
        headers: { Accept: 'application/xml' },
        body,
      });
    } catch (error) {
      return {
        ready: false,
        reasonCode: 'FULLTEXT_PARSER_UNAVAILABLE',
        reasonMessage: `GROBID is not reachable at ${endpointUrl}.`,
        diagnostics: [{
          code: 'FULLTEXT_PARSER_UNAVAILABLE',
          severity: 'blocker',
          endpoint_url: endpointUrl,
          message: error instanceof Error ? error.message : 'GROBID request failed.',
        }],
      };
    }

    if (response.status === 204) {
      return this.ocrRequired(sourceAsset, endpointUrl, 'GROBID returned no extractable content.');
    }
    const teiXml = await response.text();
    if (!response.ok) {
      const code = this.grobidErrorCode(teiXml);
      if (code === 'NO_BLOCKS') {
        return this.ocrRequired(sourceAsset, endpointUrl, 'GROBID found no text blocks in the PDF.');
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
          grobid_error_code: code,
          body: teiXml.slice(0, 1000),
        }],
      };
    }

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
      diagnostics: [{
        code: 'GROBID_TEI_PARSED',
        severity: 'info',
        endpoint_url: endpointUrl,
        section_count: parsed.sections.length,
        paragraph_count: parsed.paragraphs.length,
        anchor_count: parsed.anchors.length,
      }],
    };
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
