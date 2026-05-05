import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../../errors/app-error.js';
import type {
  LiteratureContentAssetRecord,
  LiteratureEmbeddingVersionRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteraturePipelineArtifactRecord,
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureRepository,
} from '../../repositories/literature-repository.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';
import { sha256Text } from '../literature-content-processing-utils.js';
import { LiteratureKeyContentExtractionService } from '../literature-key-content-extraction-service.js';
import { LiteratureContentProcessingFileStore } from './literature-content-processing-file-store.js';
import { LiteratureGrobidFulltextParser, type GrobidFulltextParseResult } from './literature-grobid-fulltext-parser.js';

type ChunkRecord = {
  chunk_id: string;
  index: number;
  chunk_type: string;
  text: string;
  start_offset: number;
  end_offset: number;
  source_refs: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  content_checksum: string;
};

type EmbeddingRecord = {
  chunk_id: string;
  index: number;
  vector: number[];
};

type EmbeddingArtifactResult =
  | {
      ready: true;
      artifact: LiteraturePipelineArtifactRecord;
    }
  | {
      ready: false;
      reasonCode: string;
      reasonMessage: string;
      diagnostics: Record<string, unknown>[];
    };

type FulltextPreprocessingResult =
  | {
      ready: true;
      id: string;
      artifactType: string;
      textLength: number;
      documentId: string;
      sourceAssetId: string;
      normalizedTextChecksum: string;
      sectionCount: number;
      paragraphCount: number;
      anchorCount: number;
      diagnostics: Record<string, unknown>[];
    }
  | {
      ready: false;
      reasonCode: string;
      reasonMessage: string;
      diagnostics: Record<string, unknown>[];
    };

type ParsedSection = Omit<LiteratureFulltextSectionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParsedParagraph = Omit<LiteratureFulltextParagraphRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;
type ParsedAnchor = Omit<LiteratureFulltextAnchorRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>;

export class LiteratureFlowArtifactRuntime {
  private readonly keyContentExtractionService: LiteratureKeyContentExtractionService;
  private readonly fileStore: LiteratureContentProcessingFileStore;
  private readonly grobidParser: LiteratureGrobidFulltextParser;

  constructor(
    private readonly repository: LiteratureRepository,
    private readonly options: {
      refreshPipelineState: (literatureId: string) => Promise<LiteraturePipelineStateRecord>;
      settingsService?: LiteratureContentProcessingSettingsService;
    },
  ) {
    this.keyContentExtractionService = new LiteratureKeyContentExtractionService(repository, options.settingsService);
    this.fileStore = new LiteratureContentProcessingFileStore(options.settingsService);
    this.grobidParser = new LiteratureGrobidFulltextParser(options.settingsService);
  }

  async ensureKeyContentReady(literature: LiteratureRecord): Promise<{
    keyContentReady: true;
    readinessStatus: 'READY' | 'PARTIAL_READY';
    artifactId: string;
    checksum: string;
    displayDigest: string;
    diagnostics: Record<string, unknown>[];
    generated: true;
    source: 'openai_structured_output';
  } | {
    keyContentReady: false;
    reasonCode: string;
    reasonMessage: string;
    diagnostics: Record<string, unknown>[];
    generated: false;
    source: null;
  }> {
    const extraction = await this.keyContentExtractionService.extract(literature);
    if (!extraction.ready) {
      await this.options.refreshPipelineState(literature.id);
      return {
        keyContentReady: false,
        reasonCode: extraction.reasonCode,
        reasonMessage: extraction.reasonMessage,
        diagnostics: extraction.diagnostics,
        generated: false,
        source: null,
      };
    }

    const artifact = await this.upsertPipelineArtifact({
      literatureId: literature.id,
      stageCode: 'KEY_CONTENT_READY',
      artifactType: 'KEY_CONTENT_DOSSIER',
      payload: extraction.payload as unknown as Record<string, unknown>,
      checksum: extraction.checksum,
    });

    const existingDigest = (literature.keyContentDigest ?? '').trim();
    if (!existingDigest && extraction.displayDigest.trim()) {
      await this.repository.updateLiterature({
        ...literature,
        keyContentDigest: extraction.displayDigest.trim(),
        updatedAt: new Date().toISOString(),
      });
    }

    await this.options.refreshPipelineState(literature.id);
    return {
      keyContentReady: true,
      readinessStatus: extraction.readinessStatus,
      artifactId: artifact.id,
      checksum: extraction.checksum,
      displayDigest: extraction.displayDigest,
      diagnostics: extraction.diagnostics,
      generated: true,
      source: 'openai_structured_output',
    };
  }

  async ensureFulltextPreprocessed(literature: LiteratureRecord): Promise<FulltextPreprocessingResult> {
    const sourceAsset = (await this.repository.listContentAssetsByLiteratureId(literature.id))
      .filter((asset) => asset.assetKind === 'raw_fulltext')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!sourceAsset) {
      return {
        ready: false,
        reasonCode: 'FULLTEXT_SOURCE_MISSING',
        reasonMessage: 'A registered raw fulltext asset is required before FULLTEXT_PREPROCESSED can complete.',
        diagnostics: [{ code: 'FULLTEXT_SOURCE_MISSING', severity: 'blocker' }],
      };
    }

    if (this.isPdfAsset(sourceAsset.mimeType, sourceAsset.localPath)) {
      let parsed: GrobidFulltextParseResult;
      try {
        parsed = await this.grobidParser.parse(sourceAsset);
      } catch {
        await this.repository.upsertContentAsset({
          ...sourceAsset,
          status: 'missing',
          updatedAt: new Date().toISOString(),
        });
        return {
          ready: false,
          reasonCode: 'FULLTEXT_SOURCE_MISSING',
          reasonMessage: `Registered fulltext asset is not readable: ${sourceAsset.localPath}`,
          diagnostics: [{
            code: 'FULLTEXT_SOURCE_MISSING',
            severity: 'blocker',
            local_path: sourceAsset.localPath,
          }],
        };
      }
      if (!parsed.ready) {
        await this.repository.upsertContentAsset({
          ...sourceAsset,
          status: parsed.reasonCode === 'FULLTEXT_PARSER_UNAVAILABLE' ? 'registered' : 'failed',
          updatedAt: new Date().toISOString(),
        });
        return parsed;
      }
      return this.persistFulltextPreprocessingResult({
        literature,
        sourceAsset,
        normalizedText: parsed.normalizedText,
        parserName: parsed.parserName,
        parserVersion: parsed.parserVersion,
        sections: parsed.sections,
        paragraphs: parsed.paragraphs,
        anchors: parsed.anchors,
        diagnostics: parsed.diagnostics,
        parserArtifact: {
          text: parsed.teiXml,
          mimeType: 'application/xml',
          extension: 'tei.xml',
        },
      });
    }

    if (!this.isTextLikeAsset(sourceAsset.mimeType, sourceAsset.localPath)) {
      await this.repository.upsertContentAsset({
        ...sourceAsset,
        status: 'unsupported',
        updatedAt: new Date().toISOString(),
      });
      return {
        ready: false,
        reasonCode: 'FULLTEXT_PARSER_UNSUPPORTED',
        reasonMessage: `No v1 fulltext parser is available for ${sourceAsset.mimeType}.`,
        diagnostics: [{
          code: 'FULLTEXT_PARSER_UNSUPPORTED',
          severity: 'blocker',
          mime_type: sourceAsset.mimeType,
          local_path: sourceAsset.localPath,
        }],
      };
    }

    let rawText: string;
    try {
      rawText = await fs.readFile(sourceAsset.localPath, 'utf8');
    } catch {
      await this.repository.upsertContentAsset({
        ...sourceAsset,
        status: 'missing',
        updatedAt: new Date().toISOString(),
      });
      return {
        ready: false,
        reasonCode: 'FULLTEXT_SOURCE_MISSING',
        reasonMessage: `Registered fulltext asset is not readable: ${sourceAsset.localPath}`,
        diagnostics: [{
          code: 'FULLTEXT_SOURCE_MISSING',
          severity: 'blocker',
          local_path: sourceAsset.localPath,
        }],
      };
    }

    const preprocessedText = this.normalizeFulltext(rawText);
    if (!preprocessedText) {
      return {
        ready: false,
        reasonCode: 'FULLTEXT_EMPTY',
        reasonMessage: 'Registered fulltext asset does not contain readable text.',
        diagnostics: [{
          code: 'FULLTEXT_EMPTY',
          severity: 'blocker',
          local_path: sourceAsset.localPath,
        }],
      };
    }

    const parserName = this.isMarkdownAsset(sourceAsset.mimeType, sourceAsset.localPath)
      ? 'markdown-v1'
      : 'plain-text-v1';
    const parsed = this.parseNormalizedText(preprocessedText);
    return this.persistFulltextPreprocessingResult({
      literature,
      sourceAsset,
      normalizedText: preprocessedText,
      parserName,
      parserVersion: '1',
      sections: parsed.sections,
      paragraphs: parsed.paragraphs,
      anchors: parsed.anchors,
      diagnostics: parsed.diagnostics,
      parserArtifact: null,
    });
  }

  private async persistFulltextPreprocessingResult(input: {
    literature: LiteratureRecord;
    sourceAsset: LiteratureContentAssetRecord;
    normalizedText: string;
    parserName: string;
    parserVersion: string;
    sections: ParsedSection[];
    paragraphs: ParsedParagraph[];
    anchors: ParsedAnchor[];
    diagnostics: Record<string, unknown>[];
    parserArtifact: { text: string; mimeType: string; extension: string } | null;
  }): Promise<FulltextPreprocessingResult> {
    const { literature, sourceAsset, normalizedText, parserName, parserVersion } = input;
    const now = new Date().toISOString();
    const existingDocument = await this.repository.findFulltextDocumentBySourceAssetId(sourceAsset.id);
    const documentId = existingDocument?.id ?? crypto.randomUUID();
    const normalizedTextChecksum = sha256Text(normalizedText);
    const normalizedTextFile = await this.fileStore.writeTextArtifact({
      root: 'normalized_text',
      literatureId: literature.id,
      fileName: `${sourceAsset.id}-${normalizedTextChecksum.slice(0, 12)}.normalized.txt`,
      text: normalizedText,
    });
    const parserArtifactFile = input.parserArtifact
      ? await this.fileStore.writeTextArtifact({
          root: 'artifacts_cache',
          literatureId: literature.id,
          fileName: `${sourceAsset.id}-${normalizedTextChecksum.slice(0, 12)}.${input.parserArtifact.extension}`,
          text: input.parserArtifact.text,
        })
      : null;
    const document: LiteratureFulltextDocumentRecord = {
      id: documentId,
      literatureId: literature.id,
      sourceAssetId: sourceAsset.id,
      normalizedText: null,
      normalizedTextPath: normalizedTextFile.path,
      normalizedTextChecksum,
      parserName,
      parserVersion,
      parserArtifactPath: parserArtifactFile?.path ?? null,
      parserArtifactMimeType: input.parserArtifact?.mimeType ?? null,
      status: 'READY',
      diagnostics: input.diagnostics,
      createdAt: existingDocument?.createdAt ?? now,
      updatedAt: now,
    };

    const bundle = await this.repository.upsertFulltextExtractionBundle({
      document,
      sections: input.sections.map((section) => ({
        ...section,
        id: crypto.randomUUID(),
        documentId,
        createdAt: now,
        updatedAt: now,
      })),
      paragraphs: input.paragraphs.map((paragraph) => ({
        ...paragraph,
        id: crypto.randomUUID(),
        documentId,
        createdAt: now,
        updatedAt: now,
      })),
      anchors: input.anchors.map((anchor) => ({
        ...anchor,
        id: crypto.randomUUID(),
        documentId,
        createdAt: now,
        updatedAt: now,
      })),
    });

    await this.repository.upsertContentAsset({
      ...sourceAsset,
      status: 'ready',
      updatedAt: now,
    });

    const payload = {
      normalized_text_ref: {
        path: normalizedTextFile.path,
        checksum: normalizedTextChecksum,
        byte_size: normalizedTextFile.byteSize,
      },
      parser_artifact_ref: parserArtifactFile
        ? {
            path: parserArtifactFile.path,
            checksum: parserArtifactFile.checksum,
            mime_type: input.parserArtifact?.mimeType ?? null,
            byte_size: parserArtifactFile.byteSize,
          }
        : null,
      document_id: bundle.document.id,
      source_asset_id: sourceAsset.id,
      normalized_text_checksum: normalizedTextChecksum,
      parser_name: parserName,
      parser_version: parserVersion,
      sections: bundle.sections.map((section) => ({
        section_id: section.sectionId,
        title: section.title,
        level: section.level,
        start_offset: section.startOffset,
        end_offset: section.endOffset,
        checksum: section.checksum,
      })),
      paragraphs: bundle.paragraphs.map((paragraph) => ({
        paragraph_id: paragraph.paragraphId,
        section_id: paragraph.sectionId,
        text: paragraph.text,
        start_offset: paragraph.startOffset,
        end_offset: paragraph.endOffset,
        page_number: paragraph.pageNumber,
        checksum: paragraph.checksum,
      })),
      anchors: bundle.anchors.map((anchor) => ({
        anchor_id: anchor.anchorId,
        anchor_type: anchor.anchorType,
        label: anchor.label,
        text: anchor.text,
        page_number: anchor.pageNumber,
        bbox: anchor.bbox,
        checksum: anchor.checksum,
      })),
      diagnostics: input.diagnostics,
      generated_at: now,
    };
    const payloadFile = await this.fileStore.writeJsonArtifact({
      root: 'artifacts_cache',
      literatureId: literature.id,
      fileName: `${sourceAsset.id}-${normalizedTextChecksum.slice(0, 12)}.preprocessed-manifest.json`,
      payload,
    });

    const artifact = await this.upsertPipelineArtifact({
      literatureId: literature.id,
      stageCode: 'FULLTEXT_PREPROCESSED',
      artifactType: 'PREPROCESSED_TEXT',
      payload,
      payloadPath: payloadFile.path,
      checksum: normalizedTextChecksum,
    });

    return {
      ready: true,
      id: artifact.id,
      artifactType: artifact.artifactType,
      textLength: normalizedText.length,
      documentId: bundle.document.id,
      sourceAssetId: sourceAsset.id,
      normalizedTextChecksum,
      sectionCount: bundle.sections.length,
      paragraphCount: bundle.paragraphs.length,
      anchorCount: bundle.anchors.length,
      diagnostics: input.diagnostics,
    };
  }

  async ensureChunked(
    literatureId: string,
    preprocessed: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const chunks = await this.buildClassifiedChunks(literatureId, preprocessed);

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'CHUNKED',
      artifactType: 'CHUNKS',
      payload: {
        chunks,
        chunking_profile: 'flat-classified-v1',
        chunk_count: chunks.length,
        source_artifacts: {
          fulltext_artifact_id: preprocessed.id,
          fulltext_checksum: preprocessed.checksum,
          key_content_artifact_type: 'KEY_CONTENT_DOSSIER',
        },
      },
      checksum: this.sha256(JSON.stringify(chunks)),
    });
  }

  async ensureEmbedded(
    literatureId: string,
    chunkArtifact: LiteraturePipelineArtifactRecord,
  ): Promise<EmbeddingArtifactResult> {
    const chunks = this.readChunks(chunkArtifact);
    if (chunks.length === 0) {
      return {
        ready: false,
        reasonCode: 'CHUNKS_EMPTY',
        reasonMessage: 'CHUNKED artifact does not contain embeddable chunks.',
        diagnostics: [{ code: 'CHUNKS_EMPTY', severity: 'blocker' }],
      };
    }

    const embedded = await this.embedChunks(chunks);
    if (!embedded.ready) {
      return embedded;
    }

    const artifact = await this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'EMBEDDED',
      artifactType: 'EMBEDDINGS',
      payload: {
        provider: embedded.provider,
        profile_id: embedded.profileId,
        model: embedded.model,
        dimension: embedded.dimension,
        vectors: embedded.vectors,
      },
      checksum: this.sha256(JSON.stringify(embedded.vectors)),
    });
    return { ready: true, artifact };
  }

  async ensureIndexed(
    literatureId: string,
    chunkArtifact: LiteraturePipelineArtifactRecord,
    embeddedArtifact: LiteraturePipelineArtifactRecord,
  ): Promise<LiteraturePipelineArtifactRecord> {
    const chunks = this.readChunks(chunkArtifact);
    const vectors = Array.isArray(embeddedArtifact.payload.vectors)
      ? embeddedArtifact.payload.vectors.length
      : 0;
    if (chunks.length === 0 || vectors !== chunks.length) {
      throw new Error(`Index smoke check failed: chunk/vector count mismatch (${chunks.length}/${vectors}).`);
    }

    const tokenToChunkIds = new Map<string, string[]>();
    for (const chunk of chunks) {
      const tokens = this.tokenize(chunk.text);
      for (const token of tokens) {
        const existing = tokenToChunkIds.get(token) ?? [];
        if (!existing.includes(chunk.chunk_id)) {
          tokenToChunkIds.set(token, [...existing, chunk.chunk_id]);
        }
      }
    }

    const tokenIndexObject = Object.fromEntries(tokenToChunkIds.entries());
    if (tokenToChunkIds.size === 0) {
      throw new Error('Index smoke check failed: token index is empty.');
    }

    return this.upsertPipelineArtifact({
      literatureId,
      stageCode: 'INDEXED',
      artifactType: 'LOCAL_INDEX',
      payload: {
        index_version: 'local-v1',
        token_count: tokenToChunkIds.size,
        chunk_count: chunks.length,
        vector_count: vectors,
        token_to_chunk_ids: tokenIndexObject,
      },
      checksum: this.sha256(JSON.stringify(tokenIndexObject)),
    });
  }

  async persistEmbeddingVersionSnapshot(input: {
    literatureId: string;
    chunkArtifact: LiteraturePipelineArtifactRecord;
    embeddedArtifact: LiteraturePipelineArtifactRecord;
  }): Promise<LiteratureEmbeddingVersionRecord> {
    if (!(await this.repository.findLiteratureById(input.literatureId))) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${input.literatureId} not found.`);
    }

    const latestVersion = await this.repository.findLatestEmbeddingVersionByLiteratureId(input.literatureId);
    const now = new Date().toISOString();
    const chunks = this.readChunks(input.chunkArtifact);
    const vectors = this.readEmbeddings(input.embeddedArtifact);
    const vectorByChunkId = new Map(vectors.map((vector) => [vector.chunk_id, vector.vector]));
    const provider = typeof input.embeddedArtifact.payload.provider === 'string'
      ? input.embeddedArtifact.payload.provider
      : 'openai';
    const model = typeof input.embeddedArtifact.payload.model === 'string'
      ? input.embeddedArtifact.payload.model
      : 'unknown';
    const profileId = typeof input.embeddedArtifact.payload.profile_id === 'string'
      ? input.embeddedArtifact.payload.profile_id
      : null;
    const dimension = vectors[0]?.vector.length ?? 0;

    const version = await this.repository.createEmbeddingVersion({
      id: crypto.randomUUID(),
      literatureId: input.literatureId,
      versionNo: (latestVersion?.versionNo ?? 0) + 1,
      status: 'READY',
      profileId,
      provider,
      model,
      dimension,
      chunkCount: chunks.length,
      vectorCount: vectors.length,
      tokenCount: 0,
      inputChecksum: this.sha256(`${input.chunkArtifact.checksum ?? ''}:${input.embeddedArtifact.checksum ?? ''}`),
      chunkArtifactChecksum: input.chunkArtifact.checksum,
      embeddingArtifactChecksum: input.embeddedArtifact.checksum,
      indexArtifactChecksum: null,
      indexedAt: null,
      activatedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const embeddingChunks = chunks.map((chunk) => ({
      id: crypto.randomUUID(),
      embeddingVersionId: version.id,
      literatureId: input.literatureId,
      chunkId: chunk.chunk_id,
      chunkIndex: chunk.index,
      text: chunk.text,
      startOffset: chunk.start_offset,
      endOffset: chunk.end_offset,
      chunkType: chunk.chunk_type,
      sourceRefs: chunk.source_refs,
      metadata: chunk.metadata,
      contentChecksum: chunk.content_checksum,
      vector: vectorByChunkId.get(chunk.chunk_id) ?? [],
      createdAt: now,
      updatedAt: now,
    }));
    await this.repository.createEmbeddingChunks(embeddingChunks);

    return version;
  }

  async activateLatestReadyEmbeddingVersion(input: {
    literatureId: string;
    chunkArtifact: LiteraturePipelineArtifactRecord;
    embeddedArtifact: LiteraturePipelineArtifactRecord;
    indexedArtifact: LiteraturePipelineArtifactRecord;
  }): Promise<LiteratureEmbeddingVersionRecord> {
    const literature = await this.repository.findLiteratureById(input.literatureId);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${input.literatureId} not found.`);
    }

    const versions = await this.repository.listEmbeddingVersionsByLiteratureIds([input.literatureId]);
    const matchesCurrentArtifacts = (item: LiteratureEmbeddingVersionRecord) =>
      item.chunkArtifactChecksum === input.chunkArtifact.checksum
      && item.embeddingArtifactChecksum === input.embeddedArtifact.checksum;
    const readyVersion = versions
      .filter((item) =>
        item.status === 'READY'
        && matchesCurrentArtifacts(item),
      )
      .sort((left, right) => right.versionNo - left.versionNo)[0];
    const activeIndexedVersion = literature.activeEmbeddingVersionId
      ? versions.find((item) =>
          item.id === literature.activeEmbeddingVersionId
          && item.status === 'INDEXED'
          && matchesCurrentArtifacts(item),
        )
      : undefined;
    const version = readyVersion ?? activeIndexedVersion;
    if (!version) {
      throw new Error('A READY or active INDEXED embedding version matching the current CHUNKED and EMBEDDED artifacts is required before INDEXED can activate.');
    }

    const tokenEntries = [...this.readTokenToChunkIds(input.indexedArtifact).entries()];
    const now = new Date().toISOString();
    const tokenIndexes = tokenEntries.map(([token, chunkIds]) => ({
      id: crypto.randomUUID(),
      embeddingVersionId: version.id,
      literatureId: input.literatureId,
      token,
      chunkIds,
      createdAt: now,
      updatedAt: now,
    }));
    await this.repository.replaceEmbeddingTokenIndexes(version.id, tokenIndexes);

    const updated = await this.repository.updateEmbeddingVersion(version.id, {
      status: 'INDEXED',
      tokenCount: tokenEntries.length,
      indexArtifactChecksum: input.indexedArtifact.checksum,
      indexedAt: now,
      activatedAt: now,
      updatedAt: now,
    });

    await this.repository.updateLiterature({
      ...literature,
      activeEmbeddingVersionId: version.id,
      updatedAt: now,
    });

    return updated;
  }

  readTokenToChunkIds(indexedArtifact: LiteraturePipelineArtifactRecord): Map<string, string[]> {
    const payload = indexedArtifact.payload.token_to_chunk_ids;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Map();
    }
    return new Map(
      Object.entries(payload).flatMap(([token, rawChunkIds]) => {
        if (!Array.isArray(rawChunkIds)) {
          return [];
        }
        const chunkIds = rawChunkIds
          .map((value) => (typeof value === 'string' ? value : null))
          .filter((value): value is string => value !== null);
        return chunkIds.length > 0 ? [[token, [...new Set(chunkIds)]]] : [];
      }),
    );
  }

  private async upsertPipelineArtifact(input: {
    literatureId: string;
    stageCode: LiteraturePipelineArtifactRecord['stageCode'];
    artifactType: LiteraturePipelineArtifactRecord['artifactType'];
    payload: Record<string, unknown>;
    payloadPath?: string | null;
    checksum: string;
  }): Promise<LiteraturePipelineArtifactRecord> {
    const existing = await this.repository.findPipelineArtifact(input.literatureId, input.stageCode, input.artifactType);
    const now = new Date().toISOString();

    const upserted = await this.repository.upsertPipelineArtifact({
      id: existing?.id ?? crypto.randomUUID(),
      literatureId: input.literatureId,
      stageCode: input.stageCode,
      artifactType: input.artifactType,
      payload: input.payload,
      payloadPath: input.payloadPath ?? null,
      checksum: input.checksum,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return upserted.record;
  }

  private isTextLikeAsset(mimeType: string, localPath: string): boolean {
    return this.isPlainTextAsset(mimeType, localPath) || this.isMarkdownAsset(mimeType, localPath);
  }

  private isPdfAsset(mimeType: string, localPath: string): boolean {
    const lowerMime = mimeType.toLowerCase();
    const extension = path.extname(localPath).toLowerCase();
    return lowerMime === 'application/pdf' || extension === '.pdf';
  }

  private isPlainTextAsset(mimeType: string, localPath: string): boolean {
    const lowerMime = mimeType.toLowerCase();
    const extension = path.extname(localPath).toLowerCase();
    return lowerMime === 'text/plain' || extension === '.txt';
  }

  private isMarkdownAsset(mimeType: string, localPath: string): boolean {
    const lowerMime = mimeType.toLowerCase();
    const extension = path.extname(localPath).toLowerCase();
    return lowerMime === 'text/markdown'
      || lowerMime === 'text/x-markdown'
      || extension === '.md'
      || extension === '.markdown';
  }

  private normalizeFulltext(value: string): string {
    return value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private parseNormalizedText(text: string): {
    sections: ParsedSection[];
    paragraphs: ParsedParagraph[];
    anchors: ParsedAnchor[];
    diagnostics: Record<string, unknown>[];
  } {
    const sections = this.extractSections(text);
    const paragraphs = this.extractParagraphs(text, sections);
    const anchors = this.extractMarkdownAnchors(text);
    const diagnostics: Record<string, unknown>[] = [
      {
        code: 'VISUAL_EXTRACTION_NOT_AVAILABLE',
        severity: 'info',
        message: 'v1 text/markdown parser does not extract figures, tables, formulas, OCR, or layout boxes.',
      },
    ];
    return {
      sections,
      paragraphs,
      anchors,
      diagnostics,
    };
  }

  private extractSections(text: string): ParsedSection[] {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [...text.matchAll(headingRegex)]
      .map((match) => ({
        index: match.index ?? 0,
        marker: match[1] ?? '#',
        title: (match[2] ?? '').trim(),
      }))
      .filter((heading) => heading.title.length > 0);

    if (headings.length === 0) {
      return [{
        sectionId: 'section-0001',
        title: 'Full text',
        level: 1,
        orderIndex: 0,
        startOffset: 0,
        endOffset: text.length,
        pageStart: null,
        pageEnd: null,
        checksum: sha256Text(text),
      }];
    }

    const sections: ParsedSection[] = [];
    if (headings[0]!.index > 0 && text.slice(0, headings[0]!.index).trim().length > 0) {
      sections.push({
        sectionId: 'section-0001',
        title: 'Front matter',
        level: 1,
        orderIndex: 0,
        startOffset: 0,
        endOffset: headings[0]!.index,
        pageStart: null,
        pageEnd: null,
        checksum: sha256Text(text.slice(0, headings[0]!.index)),
      });
    }

    for (const [headingIndex, heading] of headings.entries()) {
      const startOffset = heading.index;
      const endOffset = headings[headingIndex + 1]?.index ?? text.length;
      const sectionIndex = sections.length;
      sections.push({
        sectionId: `section-${String(sectionIndex + 1).padStart(4, '0')}`,
        title: heading.title,
        level: heading.marker.length,
        orderIndex: sectionIndex,
        startOffset,
        endOffset,
        pageStart: null,
        pageEnd: null,
        checksum: sha256Text(text.slice(startOffset, endOffset)),
      });
    }

    return sections;
  }

  private extractParagraphs(text: string, sections: ParsedSection[]): ParsedParagraph[] {
    const paragraphs: ParsedParagraph[] = [];
    for (const section of sections) {
      const sectionStart = this.skipHeadingLine(text, section.startOffset, section.endOffset);
      const spans = this.extractParagraphSpans(text, sectionStart, section.endOffset);
      for (const span of spans) {
        const paragraphIndex = paragraphs.length;
        const paragraphText = text.slice(span.start, span.end);
        paragraphs.push({
          paragraphId: `para-${String(paragraphIndex + 1).padStart(4, '0')}`,
          sectionId: section.sectionId,
          orderIndex: paragraphIndex,
          text: paragraphText,
          startOffset: span.start,
          endOffset: span.end,
          pageNumber: null,
          checksum: sha256Text(paragraphText),
          confidence: 1,
        });
      }
    }
    return paragraphs;
  }

  private skipHeadingLine(text: string, startOffset: number, endOffset: number): number {
    const firstLineEnd = text.indexOf('\n', startOffset);
    const lineEnd = firstLineEnd === -1 || firstLineEnd > endOffset ? endOffset : firstLineEnd;
    const firstLine = text.slice(startOffset, lineEnd);
    if (/^#{1,6}\s+/.test(firstLine)) {
      return Math.min(endOffset, lineEnd + 1);
    }
    return startOffset;
  }

  private extractParagraphSpans(text: string, startOffset: number, endOffset: number): Array<{ start: number; end: number }> {
    const spans: Array<{ start: number; end: number }> = [];
    let cursor = startOffset;
    const blankLineRegex = /\n\s*\n/g;

    while (cursor < endOffset) {
      while (cursor < endOffset && /\s/.test(text[cursor] ?? '')) {
        cursor += 1;
      }
      if (cursor >= endOffset) {
        break;
      }

      blankLineRegex.lastIndex = cursor;
      const match = blankLineRegex.exec(text);
      const blockEnd = match && match.index < endOffset ? match.index : endOffset;
      let trimmedEnd = blockEnd;
      while (trimmedEnd > cursor && /\s/.test(text[trimmedEnd - 1] ?? '')) {
        trimmedEnd -= 1;
      }
      if (trimmedEnd > cursor) {
        spans.push({ start: cursor, end: trimmedEnd });
      }
      cursor = match && match.index < endOffset ? match.index + match[0].length : endOffset;
    }

    return spans;
  }

  private extractMarkdownAnchors(text: string): ParsedAnchor[] {
    const candidates = [
      ...this.extractMarkdownImageAnchors(text),
      ...this.extractMarkdownFormulaAnchors(text),
      ...this.extractMarkdownTableAnchors(text),
    ].sort((left, right) => {
      const leftStart = typeof left.metadata.start_offset === 'number' ? left.metadata.start_offset : 0;
      const rightStart = typeof right.metadata.start_offset === 'number' ? right.metadata.start_offset : 0;
      return leftStart - rightStart;
    });

    return candidates.map((anchor, index) => ({
      ...anchor,
      anchorId: `anchor-${String(index + 1).padStart(4, '0')}`,
    }));
  }

  private extractMarkdownImageAnchors(text: string): ParsedAnchor[] {
    const anchors: ParsedAnchor[] = [];
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    for (const match of text.matchAll(imageRegex)) {
      const startOffset = match.index ?? 0;
      const raw = match[0] ?? '';
      const label = (match[1] ?? '').trim() || null;
      const target = (match[2] ?? '').trim();
      anchors.push({
        anchorId: '',
        anchorType: 'figure',
        label,
        text: raw,
        pageNumber: null,
        bbox: null,
        targetRefs: target ? [{ ref_type: 'markdown_target', target }] : [],
        metadata: {
          syntax: 'markdown_image',
          start_offset: startOffset,
          end_offset: startOffset + raw.length,
        },
        checksum: sha256Text(raw),
      });
    }
    return anchors;
  }

  private extractMarkdownFormulaAnchors(text: string): ParsedAnchor[] {
    const anchors: ParsedAnchor[] = [];
    const formulaRegex = /\$\$([\s\S]+?)\$\$/g;
    for (const match of text.matchAll(formulaRegex)) {
      const startOffset = match.index ?? 0;
      const raw = match[0] ?? '';
      anchors.push({
        anchorId: '',
        anchorType: 'formula',
        label: null,
        text: (match[1] ?? '').trim() || raw,
        pageNumber: null,
        bbox: null,
        targetRefs: [],
        metadata: {
          syntax: 'markdown_block_math',
          start_offset: startOffset,
          end_offset: startOffset + raw.length,
        },
        checksum: sha256Text(raw),
      });
    }
    return anchors;
  }

  private extractMarkdownTableAnchors(text: string): ParsedAnchor[] {
    const anchors: ParsedAnchor[] = [];
    const lines = this.splitLinesWithOffsets(text);
    let index = 0;

    while (index < lines.length - 1) {
      const header = lines[index]!;
      const separator = lines[index + 1]!;
      if (!header.text.includes('|') || !this.isMarkdownTableSeparator(separator.text)) {
        index += 1;
        continue;
      }

      let endIndex = index + 2;
      while (endIndex < lines.length && lines[endIndex]!.text.includes('|') && lines[endIndex]!.text.trim().length > 0) {
        endIndex += 1;
      }

      const startOffset = header.startOffset;
      const endOffset = lines[endIndex - 1]!.endOffset;
      const raw = text.slice(startOffset, endOffset);
      anchors.push({
        anchorId: '',
        anchorType: 'table',
        label: null,
        text: raw,
        pageNumber: null,
        bbox: null,
        targetRefs: [],
        metadata: {
          syntax: 'markdown_table',
          start_offset: startOffset,
          end_offset: endOffset,
          row_count: endIndex - index - 1,
        },
        checksum: sha256Text(raw),
      });
      index = endIndex;
    }

    return anchors;
  }

  private splitLinesWithOffsets(text: string): Array<{ text: string; startOffset: number; endOffset: number }> {
    const lines: Array<{ text: string; startOffset: number; endOffset: number }> = [];
    let startOffset = 0;
    for (const line of text.split('\n')) {
      const endOffset = startOffset + line.length;
      lines.push({ text: line, startOffset, endOffset });
      startOffset = endOffset + 1;
    }
    return lines;
  }

  private isMarkdownTableSeparator(value: string): boolean {
    const trimmed = value.trim();
    return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmed);
  }

  private async buildClassifiedChunks(
    literatureId: string,
    preprocessed: LiteraturePipelineArtifactRecord,
  ): Promise<ChunkRecord[]> {
    const chunks: Omit<ChunkRecord, 'index'>[] = [];
    const abstractProfile = await this.repository.findAbstractProfileByLiteratureId(literatureId);
    if (abstractProfile?.abstractText?.trim()) {
      chunks.push(this.buildChunk({
        chunkType: 'abstract',
        text: abstractProfile.abstractText,
        startOffset: 0,
        endOffset: abstractProfile.abstractText.length,
        sourceRefs: [{
          ref_type: 'abstract',
          ref_id: abstractProfile.id,
          checksum: abstractProfile.checksum,
        }],
        metadata: {
          origin_stage: 'ABSTRACT_READY',
          abstract_source: abstractProfile.abstractSource,
        },
      }));
    }

    const sections = Array.isArray(preprocessed.payload.sections) ? preprocessed.payload.sections : [];
    const paragraphs = Array.isArray(preprocessed.payload.paragraphs) ? preprocessed.payload.paragraphs : [];
    const paragraphTextBySection = new Map<string, string[]>();
    for (const paragraph of paragraphs) {
      const row = this.readRecord(paragraph);
      if (!row) {
        continue;
      }
      const sectionId = this.readString(row.section_id);
      const text = this.readString(row.text);
      if (sectionId && text) {
        paragraphTextBySection.set(sectionId, [...(paragraphTextBySection.get(sectionId) ?? []), text]);
      }
    }
    for (const section of sections) {
      const row = this.readRecord(section);
      if (!row) {
        continue;
      }
      const startOffset = this.readNumber(row.start_offset, 0);
      const endOffset = this.readNumber(row.end_offset, startOffset);
      const sectionId = this.readString(row.section_id) ?? 'section';
      const sectionText = (paragraphTextBySection.get(sectionId) ?? []).join('\n\n').trim();
      if (!sectionText) {
        continue;
      }
      chunks.push(this.buildChunk({
        chunkType: 'fulltext_section',
        text: sectionText.slice(0, 4000),
        startOffset,
        endOffset,
        sourceRefs: [{
          ref_type: 'section',
          ref_id: sectionId,
          section_id: sectionId,
          checksum: this.readString(row.checksum),
          start_offset: startOffset,
          end_offset: endOffset,
        }],
        metadata: {
          origin_stage: 'FULLTEXT_PREPROCESSED',
          section_id: sectionId,
          title: this.readString(row.title),
        },
      }));
    }

    for (const paragraph of paragraphs) {
      const row = this.readRecord(paragraph);
      if (!row) {
        continue;
      }
      const paragraphText = this.readString(row.text);
      if (!paragraphText) {
        continue;
      }
      const paragraphId = this.readString(row.paragraph_id) ?? 'paragraph';
      const sectionId = this.readString(row.section_id) ?? null;
      const startOffset = this.readNumber(row.start_offset, 0);
      const endOffset = this.readNumber(row.end_offset, startOffset + paragraphText.length);
      chunks.push(this.buildChunk({
        chunkType: 'fulltext_paragraph',
        text: paragraphText,
        startOffset,
        endOffset,
        sourceRefs: [{
          ref_type: 'paragraph',
          ref_id: paragraphId,
          paragraph_id: paragraphId,
          section_id: sectionId,
          checksum: this.readString(row.checksum),
          start_offset: startOffset,
          end_offset: endOffset,
        }],
        metadata: {
          origin_stage: 'FULLTEXT_PREPROCESSED',
          paragraph_id: paragraphId,
          section_id: sectionId,
        },
      }));
    }

    const keyContent = await this.repository.findPipelineArtifact(literatureId, 'KEY_CONTENT_READY', 'KEY_CONTENT_DOSSIER');
    if (keyContent) {
      chunks.push(...this.buildDossierChunks(keyContent));
    }

    return this.dedupeAndIndexChunks(chunks);
  }

  private buildDossierChunks(artifact: LiteraturePipelineArtifactRecord): Omit<ChunkRecord, 'index'>[] {
    const categories = this.readRecord(artifact.payload.categories);
    if (!categories) {
      return [];
    }
    const chunks: Omit<ChunkRecord, 'index'>[] = [];
    for (const [category, rawItems] of Object.entries(categories)) {
      if (!Array.isArray(rawItems)) {
        continue;
      }
      for (const item of rawItems) {
        const row = this.readRecord(item);
        if (!row) {
          continue;
        }
        const statement = this.readString(row.statement);
        if (!statement) {
          continue;
        }
        const details = this.readString(row.details) ?? '';
        const text = [statement, details].filter((value) => value.trim().length > 0).join('\n');
        const sourceRefs = Array.isArray(row.source_refs)
          ? row.source_refs.filter((ref): ref is Record<string, unknown> => Boolean(ref) && typeof ref === 'object' && !Array.isArray(ref))
          : [];
        const chunkType = category === 'evidence_candidates' || category === 'claim_evidence_map'
          ? 'evidence'
          : category === 'figure_insights'
            ? 'figure'
            : category === 'table_insights'
              ? 'table'
              : 'semantic_dossier';
        chunks.push(this.buildChunk({
          chunkType,
          text,
          startOffset: 0,
          endOffset: text.length,
          sourceRefs,
          metadata: {
            origin_stage: 'KEY_CONTENT_READY',
            artifact_id: artifact.id,
            category,
            item_id: this.readString(row.id),
            evidence_strength: this.readString(row.evidence_strength),
            confidence: typeof row.confidence === 'number' ? row.confidence : null,
          },
        }));
      }
    }
    return chunks;
  }

  private buildChunk(input: {
    chunkType: string;
    text: string;
    startOffset: number;
    endOffset: number;
    sourceRefs: Record<string, unknown>[];
    metadata: Record<string, unknown>;
  }): Omit<ChunkRecord, 'index'> {
    const normalized = input.text.replace(/\s+/g, ' ').trim();
    const contentChecksum = sha256Text(normalized);
    const refKey = JSON.stringify(input.sourceRefs);
    return {
      chunk_id: `${input.chunkType}-${sha256Text(`${input.chunkType}:${refKey}:${contentChecksum}`).slice(0, 16)}`,
      chunk_type: input.chunkType,
      text: normalized,
      start_offset: input.startOffset,
      end_offset: input.endOffset,
      source_refs: input.sourceRefs,
      metadata: input.metadata,
      content_checksum: contentChecksum,
    };
  }

  private dedupeAndIndexChunks(chunks: Array<Omit<ChunkRecord, 'index'>>): ChunkRecord[] {
    const byId = new Map<string, Omit<ChunkRecord, 'index'>>();
    for (const chunk of chunks) {
      if (chunk.text.length === 0) {
        continue;
      }
      byId.set(chunk.chunk_id, chunk);
    }
    return [...byId.values()]
      .sort((left, right) => {
        if (left.chunk_type !== right.chunk_type) {
          return left.chunk_type.localeCompare(right.chunk_type);
        }
        return left.chunk_id.localeCompare(right.chunk_id);
      })
      .map((chunk, index) => ({
        ...chunk,
        index,
      }));
  }

  private readChunks(chunkArtifact: LiteraturePipelineArtifactRecord): ChunkRecord[] {
    const payloadChunks = chunkArtifact.payload.chunks;
    if (!Array.isArray(payloadChunks)) {
      return [];
    }

    return payloadChunks
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const row = item as Record<string, unknown>;
        const text = typeof row.text === 'string' ? row.text : '';
        if (!text) {
          return null;
        }
        const chunkId = typeof row.chunk_id === 'string' ? row.chunk_id : `chunk-${String(index + 1).padStart(4, '0')}`;
        const sourceRefs = Array.isArray(row.source_refs)
          ? row.source_refs.filter((ref): ref is Record<string, unknown> => Boolean(ref) && typeof ref === 'object' && !Array.isArray(ref))
          : [];
        const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? row.metadata as Record<string, unknown>
          : {};
        return {
          chunk_id: chunkId,
          index: typeof row.index === 'number' ? row.index : index,
          chunk_type: typeof row.chunk_type === 'string' ? row.chunk_type : 'fulltext_paragraph',
          text,
          start_offset: typeof row.start_offset === 'number' ? row.start_offset : 0,
          end_offset: typeof row.end_offset === 'number' ? row.end_offset : text.length,
          source_refs: sourceRefs,
          metadata,
          content_checksum: typeof row.content_checksum === 'string' ? row.content_checksum : sha256Text(text),
        } satisfies ChunkRecord;
      })
      .filter((row): row is ChunkRecord => row !== null);
  }

  private readEmbeddings(embeddedArtifact: LiteraturePipelineArtifactRecord): EmbeddingRecord[] {
    const payloadVectors = embeddedArtifact.payload.vectors;
    if (!Array.isArray(payloadVectors)) {
      return [];
    }
    return payloadVectors
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const row = item as Record<string, unknown>;
        const rawVector = Array.isArray(row.vector)
          ? row.vector.map((value) => Number(value)).filter((value) => Number.isFinite(value))
          : [];
        const chunkId = typeof row.chunk_id === 'string' ? row.chunk_id : `chunk-${String(index + 1).padStart(4, '0')}`;
        const chunkIndex = typeof row.index === 'number' ? row.index : index;
        return {
          chunk_id: chunkId,
          index: chunkIndex,
          vector: rawVector,
        } satisfies EmbeddingRecord;
      })
      .filter((row): row is EmbeddingRecord => row !== null);
  }

  private async embedChunks(chunks: ChunkRecord[]): Promise<{
    ready: true;
    provider: 'openai';
    profileId: string;
    model: string;
    dimension: number;
    vectors: EmbeddingRecord[];
  } | {
    ready: false;
    reasonCode: string;
    reasonMessage: string;
    diagnostics: Record<string, unknown>[];
  }> {
    const openAIConfig = await this.options.settingsService?.resolveOpenAIEmbeddingConfig();
    if (!openAIConfig) {
      return {
        ready: false,
        reasonCode: 'EMBEDDING_PROVIDER_MISSING',
        reasonMessage: 'OpenAI embedding settings are required before EMBEDDED can complete.',
        diagnostics: [{ code: 'EMBEDDING_PROVIDER_MISSING', severity: 'blocker' }],
      };
    }

    const openAIVectors = await this.embedChunksViaOpenAI(chunks, openAIConfig);
    return {
      ready: true,
      provider: 'openai',
      profileId: openAIConfig.profileId,
      model: openAIConfig.model,
      dimension: openAIVectors[0]?.vector.length ?? 0,
      vectors: openAIVectors,
    };
  }

  private async embedChunksViaOpenAI(
    chunks: ChunkRecord[],
    config: { apiKey: string; model: string; dimensions: number | null },
  ): Promise<EmbeddingRecord[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    const body: Record<string, unknown> = {
      model: config.model,
      input: chunks.map((chunk) => chunk.text),
      encoding_format: 'float',
    };
    if (config.dimensions !== null) {
      body.dimensions = config.dimensions;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding request failed: ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;

    let rawVectors: number[][] = [];
    if (Array.isArray(payload.vectors)) {
      rawVectors = payload.vectors
        .map((item) => (Array.isArray(item) ? item.map((value) => Number(value)).filter((v) => Number.isFinite(v)) : null))
        .filter((item): item is number[] => Array.isArray(item));
    } else if (Array.isArray(payload.data)) {
      rawVectors = payload.data
        .map((row) => {
          if (!row || typeof row !== 'object') {
            return null;
          }
          const embedding = (row as Record<string, unknown>).embedding;
          if (!Array.isArray(embedding)) {
            return null;
          }
          const vector = embedding.map((value) => Number(value)).filter((v) => Number.isFinite(v));
          return vector.length > 0 ? vector : null;
        })
        .filter((item): item is number[] => item !== null);
    }

    if (rawVectors.length !== chunks.length || rawVectors.some((vector) => vector.length === 0)) {
      throw new Error('OpenAI embedding response shape mismatch.');
    }

    return chunks.map((chunk, index) => ({
      chunk_id: chunk.chunk_id,
      index: chunk.index,
      vector: rawVectors[index]!,
    }));
  }

  private tokenize(text: string): string[] {
    return [...new Set(
      (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
        .filter((token) => token.length > 1),
    )];
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private sha256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
