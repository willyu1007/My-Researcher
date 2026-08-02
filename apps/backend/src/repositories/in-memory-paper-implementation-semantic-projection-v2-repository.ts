import {
  assertPaperImplementationSemanticProjectionQueryV2,
  assertPaperImplementationSemanticProjectionReplacementV2,
  PaperImplementationSemanticProjectionV2RepositoryError,
  type PaperImplementationSemanticProjectionRecordV2,
  type PaperImplementationSemanticProjectionV2Repository,
  type ReplacePaperImplementationSemanticProjectProjectionV2Input,
  type SearchPaperImplementationSemanticProjectProjectionV2Input,
} from './paper-implementation-semantic-projection-v2.repository.js';

export interface InMemoryPaperImplementationSemanticProjectionV2RepositoryOptions {
  projects?: readonly string[];
  records?: readonly PaperImplementationSemanticProjectionRecordV2[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function recordEqualsWrite(
  record: PaperImplementationSemanticProjectionRecordV2,
  write: ReplacePaperImplementationSemanticProjectProjectionV2Input['documents'][number],
): boolean {
  return record.document_hash === write.document_hash
    && record.source.source_version === write.source.source_version
    && record.source.source_hash === write.source.source_hash
    && record.embedding_hash === write.embedding_hash;
}

export class InMemoryPaperImplementationSemanticProjectionV2Repository
implements PaperImplementationSemanticProjectionV2Repository {
  private readonly projects: ReadonlySet<string>;
  private records: PaperImplementationSemanticProjectionRecordV2[];

  constructor(
    options: InMemoryPaperImplementationSemanticProjectionV2RepositoryOptions = {},
  ) {
    this.projects = new Set(options.projects ?? []);
    this.records = [...clone(options.records ?? [])];
  }

  async replaceProjectProjection(
    input: ReplacePaperImplementationSemanticProjectProjectionV2Input,
  ) {
    if (!this.projects.has(input.implementation_project_id)) {
      throw new PaperImplementationSemanticProjectionV2RepositoryError(
        'IMPLEMENTATION_PROJECT_NOT_FOUND',
        `ImplementationProject does not exist: ${input.implementation_project_id}`,
      );
    }
    assertPaperImplementationSemanticProjectionReplacementV2(input);

    const existing = this.records.filter((record) => (
      record.implementation_project_id === input.implementation_project_id
    ));
    const existingById = new Map(existing.map((record) => [record.document_id, record]));
    let changedCount = 0;
    let unchangedCount = 0;
    const replacement = input.documents.map((write) => {
      const current = existingById.get(write.document_id);
      if (current && recordEqualsWrite(current, write)) {
        unchangedCount += 1;
        return current;
      }
      changedCount += 1;
      return {
        ...clone(write),
        created_at: current?.created_at ?? write.indexed_at,
        updated_at: write.indexed_at,
      };
    });
    const retainedIds = new Set(input.documents.map((document) => document.document_id));
    const deletedCount = existing.filter((record) => !retainedIds.has(record.document_id)).length;
    this.records = [
      ...this.records.filter((record) => (
        record.implementation_project_id !== input.implementation_project_id
      )),
      ...replacement,
    ];
    return {
      changed_count: changedCount,
      unchanged_count: unchangedCount,
      deleted_count: deletedCount,
      total_count: replacement.length,
    };
  }

  async listProjectProjection(implementationProjectId: string) {
    return clone(this.records
      .filter((record) => record.implementation_project_id === implementationProjectId)
      .sort((left, right) => left.document_id.localeCompare(right.document_id)));
  }

  async searchProjectProjection(
    input: SearchPaperImplementationSemanticProjectProjectionV2Input,
  ) {
    assertPaperImplementationSemanticProjectionQueryV2(input);
    const matching = this.records
      .filter((record) => (
        record.implementation_project_id === input.implementation_project_id
        && record.embedding_profile.profile_id === input.embedding_profile.profile_id
        && record.embedding_profile.provider === input.embedding_profile.provider
        && record.embedding_profile.model === input.embedding_profile.model
        && record.embedding_profile.dimension === input.embedding_profile.dimension
      ));
    const coverage = matching
      .map((record) => ({
        document_id: record.document_id,
        implementation_project_id: record.implementation_project_id,
        source: clone(record.source),
        document_hash: record.document_hash,
        embedding_hash: record.embedding_hash,
      }))
      .sort((left, right) => left.document_id.localeCompare(right.document_id));
    const hits = matching
      .map((record) => ({
        document_id: record.document_id,
        implementation_project_id: record.implementation_project_id,
        source: clone(record.source),
        document_hash: record.document_hash,
        embedding_hash: record.embedding_hash,
        semantic_score: record.normalized_vector.reduce(
          (score, value, index) => (
            score + (value * input.normalized_query_vector[index]!)
          ),
          0,
        ),
      }))
      .sort((left, right) => (
        right.semantic_score - left.semantic_score
        || left.document_id.localeCompare(right.document_id)
      ))
      .slice(0, input.limit);
    return { coverage, hits };
  }
}
