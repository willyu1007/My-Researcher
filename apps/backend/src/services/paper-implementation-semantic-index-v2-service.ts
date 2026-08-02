import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
  type PaperImplementationSemanticDocumentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  serverHashPaperImplementationSemanticEmbeddingV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  PaperImplementationSemanticEmbeddingProfileV2,
  PaperImplementationSemanticProjectionV2Repository,
  PaperImplementationSemanticProjectionWriteV2,
  ReplacePaperImplementationSemanticProjectProjectionV2Result,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';
import {
  isPaperImplementationSemanticEmbeddingProfileV2Valid,
  PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2,
  PaperImplementationSemanticProjectionV2RepositoryError,
  type PaperImplementationSemanticProjectionRecordV2,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';

export interface PaperImplementationSemanticDocumentV2Reader {
  listAuthorizedDocuments(
    implementationProjectId: string,
  ): Promise<PaperImplementationSemanticDocumentV2[]>;
}

export interface PaperImplementationSemanticEmbeddingRequestDocumentV2 {
  document_id: string;
  document_hash: string;
  semantic_text: string;
}

export interface PaperImplementationSemanticEmbeddingResultV2 {
  document_id: string;
  vector: number[];
}

export interface PaperImplementationSemanticEmbeddingV2Port {
  embedDocuments(input: {
    profile: PaperImplementationSemanticEmbeddingProfileV2;
    documents: PaperImplementationSemanticEmbeddingRequestDocumentV2[];
  }): Promise<PaperImplementationSemanticEmbeddingResultV2[]>;
}

export type PaperImplementationSemanticIndexV2ServiceReasonCode =
  | 'SEMANTIC_DOCUMENT_LIMIT_EXCEEDED'
  | 'SEMANTIC_EMBEDDING_INVALID';

export class PaperImplementationSemanticIndexV2ServiceError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationSemanticIndexV2ServiceReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationSemanticIndexV2ServiceError';
  }
}

export interface PaperImplementationSemanticIndexV2ServiceOptions {
  documentReader: PaperImplementationSemanticDocumentV2Reader;
  embeddingPort: PaperImplementationSemanticEmbeddingV2Port;
  repository: PaperImplementationSemanticProjectionV2Repository;
  embeddingProfile: PaperImplementationSemanticEmbeddingProfileV2;
  now?: () => string;
}

function normalizeVector(values: readonly number[]): number[] {
  if (values.length !== PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2) {
    throw new PaperImplementationSemanticIndexV2ServiceError(
      'SEMANTIC_EMBEDDING_INVALID',
      `Semantic embedding dimension must be ${PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2}`,
    );
  }
  let squaredNorm = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new PaperImplementationSemanticIndexV2ServiceError(
        'SEMANTIC_EMBEDDING_INVALID',
        'Semantic embedding values must be finite',
      );
    }
    squaredNorm += value * value;
  }
  const norm = Math.sqrt(squaredNorm);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new PaperImplementationSemanticIndexV2ServiceError(
      'SEMANTIC_EMBEDDING_INVALID',
      'Semantic embedding must have a finite non-zero norm',
    );
  }
  // pgvector's `vector` stores float32 components. Quantize before hashing so
  // the persisted text representation hashes identically after a DB round trip.
  return values.map((value) => {
    const normalized = Math.fround(value / norm);
    return Object.is(normalized, -0) ? 0 : normalized;
  });
}

function sameEmbeddingProfile(
  record: PaperImplementationSemanticProjectionRecordV2,
  profile: PaperImplementationSemanticEmbeddingProfileV2,
): boolean {
  return record.embedding_profile.profile_id === profile.profile_id
    && record.embedding_profile.provider === profile.provider
    && record.embedding_profile.model === profile.model
    && record.embedding_profile.dimension === profile.dimension;
}

export class PaperImplementationSemanticIndexV2Service {
  private readonly now: () => string;

  constructor(private readonly options: PaperImplementationSemanticIndexV2ServiceOptions) {
    if (!isPaperImplementationSemanticEmbeddingProfileV2Valid(options.embeddingProfile)) {
      throw new PaperImplementationSemanticIndexV2ServiceError(
        'SEMANTIC_EMBEDDING_INVALID',
        'Semantic embedding profile must be canonical and use the supported dimension',
      );
    }
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async rebuildProjectProjection(
    implementationProjectId: string,
  ): Promise<ReplacePaperImplementationSemanticProjectProjectionV2Result> {
    const documents = await this.options.documentReader.listAuthorizedDocuments(
      implementationProjectId,
    );
    if (documents.length > PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2) {
      throw new PaperImplementationSemanticIndexV2ServiceError(
        'SEMANTIC_DOCUMENT_LIMIT_EXCEEDED',
        `Semantic project document count exceeds ${PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2}`,
      );
    }
    if (documents.length === 0) {
      return this.options.repository.replaceProjectProjection({
        implementation_project_id: implementationProjectId,
        documents: [],
      });
    }

    let currentProjection: PaperImplementationSemanticProjectionRecordV2[];
    try {
      currentProjection = await this.options.repository.listProjectProjection(
        implementationProjectId,
      );
    } catch (error) {
      if (
        error instanceof PaperImplementationSemanticProjectionV2RepositoryError
        && error.reasonCode === 'PROJECTION_STORED_INTEGRITY_ERROR'
      ) {
        currentProjection = [];
      } else {
        throw error;
      }
    }
    const currentByDocumentId = new Map(
      currentProjection.map((record) => [record.document_id, record]),
    );
    const documentsToEmbed = documents.filter((document) => {
      const current = currentByDocumentId.get(document.document_id);
      return !current
        || current.document_hash !== document.document_hash
        || !sameEmbeddingProfile(current, this.options.embeddingProfile);
    });
    const embedded = documentsToEmbed.length === 0
      ? []
      : await this.options.embeddingPort.embedDocuments({
        profile: this.options.embeddingProfile,
        documents: documentsToEmbed.map((document) => ({
          document_id: document.document_id,
          document_hash: document.document_hash,
          semantic_text: document.semantic_text,
        })),
      });
    const vectorsByDocumentId = new Map<string, number[]>();
    for (const result of embedded) {
      if (vectorsByDocumentId.has(result.document_id)) {
        throw new PaperImplementationSemanticIndexV2ServiceError(
          'SEMANTIC_EMBEDDING_INVALID',
          `Embedding adapter returned duplicate document: ${result.document_id}`,
        );
      }
      vectorsByDocumentId.set(result.document_id, normalizeVector(result.vector));
    }
    if (
      vectorsByDocumentId.size !== documentsToEmbed.length
      || documentsToEmbed.some((document) => !vectorsByDocumentId.has(document.document_id))
    ) {
      throw new PaperImplementationSemanticIndexV2ServiceError(
        'SEMANTIC_EMBEDDING_INVALID',
        'Embedding adapter result set must exactly match authorized documents',
      );
    }

    const indexedAt = this.now();
    const writes: PaperImplementationSemanticProjectionWriteV2[] = documents.map((document) => {
      const current = currentByDocumentId.get(document.document_id);
      if (
        current
        && current.document_hash === document.document_hash
        && sameEmbeddingProfile(current, this.options.embeddingProfile)
      ) {
        return {
          document_id: document.document_id,
          implementation_project_id: document.implementation_project_id,
          schema_version: document.schema_version,
          source: document.source,
          semantic_text: document.semantic_text,
          document_hash: document.document_hash,
          content: document.content,
          embedding_profile: current.embedding_profile,
          embedding_hash: current.embedding_hash,
          normalized_vector: current.normalized_vector,
          indexed_at: current.indexed_at,
        };
      }
      const normalizedVector = vectorsByDocumentId.get(document.document_id)!;
      return {
        document_id: document.document_id,
        implementation_project_id: document.implementation_project_id,
        schema_version: document.schema_version,
        source: document.source,
        semantic_text: document.semantic_text,
        document_hash: document.document_hash,
        content: document.content,
        embedding_profile: this.options.embeddingProfile,
        embedding_hash: serverHashPaperImplementationSemanticEmbeddingV2({
          document_id: document.document_id,
          document_hash: document.document_hash,
          profile_id: this.options.embeddingProfile.profile_id,
          provider: this.options.embeddingProfile.provider,
          model: this.options.embeddingProfile.model,
          dimension: this.options.embeddingProfile.dimension,
          normalized_vector: normalizedVector,
        }),
        normalized_vector: normalizedVector,
        indexed_at: indexedAt,
      };
    });
    return this.options.repository.replaceProjectProjection({
      implementation_project_id: implementationProjectId,
      documents: writes,
    });
  }
}
