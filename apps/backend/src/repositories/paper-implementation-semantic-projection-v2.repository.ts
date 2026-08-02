import type {
  PaperImplementationSemanticDocumentContentV2,
  PaperImplementationSemanticDocumentSourceRefV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashPaperImplementationSemanticDocumentV2,
  serverHashPaperImplementationSemanticEmbeddingV2,
  serverHashPaperImplementationSemanticSourceV2,
  serverPaperImplementationSemanticDocumentV2Id,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

export const PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2 = 5_000;
export const PAPER_IMPLEMENTATION_SEMANTIC_NORMALIZED_VECTOR_TOLERANCE_V2 = 1e-5;

export interface PaperImplementationSemanticEmbeddingProfileV2 {
  profile_id: string;
  provider: string;
  model: string;
  dimension: number;
}

export interface PaperImplementationSemanticProjectionWriteV2 {
  document_id: string;
  implementation_project_id: string;
  schema_version: 'v1';
  source: PaperImplementationSemanticDocumentSourceRefV2;
  semantic_text: string;
  document_hash: string;
  content: PaperImplementationSemanticDocumentContentV2;
  embedding_profile: PaperImplementationSemanticEmbeddingProfileV2;
  embedding_hash: string;
  normalized_vector: number[];
  indexed_at: string;
}

export interface PaperImplementationSemanticProjectionRecordV2
  extends PaperImplementationSemanticProjectionWriteV2 {
  created_at: string;
  updated_at: string;
}

export interface ReplacePaperImplementationSemanticProjectProjectionV2Input {
  implementation_project_id: string;
  documents: PaperImplementationSemanticProjectionWriteV2[];
}

export interface ReplacePaperImplementationSemanticProjectProjectionV2Result {
  changed_count: number;
  unchanged_count: number;
  deleted_count: number;
  total_count: number;
}

export type PaperImplementationSemanticProjectionV2RepositoryReasonCode =
  | 'IMPLEMENTATION_PROJECT_NOT_FOUND'
  | 'PROJECTION_INPUT_INVALID'
  | 'PROJECTION_STORED_INTEGRITY_ERROR';

export class PaperImplementationSemanticProjectionV2RepositoryError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationSemanticProjectionV2RepositoryReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationSemanticProjectionV2RepositoryError';
  }
}

export function assertPaperImplementationSemanticProjectionReplacementV2(
  input: ReplacePaperImplementationSemanticProjectProjectionV2Input,
): void {
  if (input.documents.length > PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2) {
    throw new PaperImplementationSemanticProjectionV2RepositoryError(
      'PROJECTION_INPUT_INVALID',
      `Semantic projection exceeds ${PAPER_IMPLEMENTATION_SEMANTIC_MAX_PROJECT_DOCUMENTS_V2} documents`,
    );
  }
  const sourceKeys = new Set<string>();
  const documentIds = new Set<string>();
  for (const document of input.documents) {
    const sourceKey = `${document.source.source_type}:${document.source.source_id}`;
    const squaredNorm = document.normalized_vector.reduce(
      (sum, value) => sum + (value * value),
      0,
    );
    const expectedDocumentId = serverPaperImplementationSemanticDocumentV2Id({
      implementation_project_id: document.implementation_project_id,
      source_type: document.source.source_type,
      source_id: document.source.source_id,
    });
    const expectedEmbeddingHash = serverHashPaperImplementationSemanticEmbeddingV2({
      document_id: document.document_id,
      document_hash: document.document_hash,
      profile_id: document.embedding_profile.profile_id,
      provider: document.embedding_profile.provider,
      model: document.embedding_profile.model,
      dimension: document.embedding_profile.dimension,
      normalized_vector: document.normalized_vector,
    });
    if (
      document.implementation_project_id !== input.implementation_project_id
      || document.content.source_type !== document.source.source_type
      || document.document_id !== expectedDocumentId
      || canonicalizeExperimentV2Json(document.content) !== document.semantic_text
      || serverHashPaperImplementationSemanticSourceV2(document.content)
        !== document.source.source_hash
      || serverHashPaperImplementationSemanticDocumentV2({
        implementation_project_id: document.implementation_project_id,
        source: document.source,
        semantic_text: document.semantic_text,
        content: document.content,
      }) !== document.document_hash
      || document.embedding_profile.profile_id.length === 0
      || document.embedding_profile.provider.length === 0
      || document.embedding_profile.model.length === 0
      || document.normalized_vector.length !== PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2
      || document.embedding_profile.dimension !== PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2
      || document.normalized_vector.some((value) => !Number.isFinite(value))
      || !Number.isFinite(squaredNorm)
      || Math.abs(Math.sqrt(squaredNorm) - 1)
        > PAPER_IMPLEMENTATION_SEMANTIC_NORMALIZED_VECTOR_TOLERANCE_V2
      || document.embedding_hash !== expectedEmbeddingHash
      || Number.isNaN(new Date(document.indexed_at).getTime())
      || sourceKeys.has(sourceKey)
      || documentIds.has(document.document_id)
    ) {
      throw new PaperImplementationSemanticProjectionV2RepositoryError(
        'PROJECTION_INPUT_INVALID',
        `Semantic projection input is invalid: ${document.document_id}`,
      );
    }
    sourceKeys.add(sourceKey);
    documentIds.add(document.document_id);
  }
}

export interface PaperImplementationSemanticProjectionV2Repository {
  replaceProjectProjection(
    input: ReplacePaperImplementationSemanticProjectProjectionV2Input,
  ): Promise<ReplacePaperImplementationSemanticProjectProjectionV2Result>;

  listProjectProjection(
    implementationProjectId: string,
  ): Promise<PaperImplementationSemanticProjectionRecordV2[]>;
}
