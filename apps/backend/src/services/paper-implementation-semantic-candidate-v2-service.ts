import {
  PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
  PAPER_IMPLEMENTATION_SEMANTIC_QUERY_MAX_LENGTH_V2,
  type PaperImplementationEffectiveBranchHeadSemanticContentV2,
  type PaperImplementationSemanticDocumentContentV2,
  type PaperImplementationSemanticDocumentSourceRefV2,
  type PaperImplementationSemanticDocumentV2,
  type PaperImplementationSemanticRankingInputV2,
  type PaperImplementationValidationCycleSemanticDocumentContentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashPaperImplementationSemanticDocumentV2,
  serverHashPaperImplementationSemanticSourceV2,
  serverPaperImplementationSemanticDocumentV2Id,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ProjectValidationCyclesLineageV2Response,
  ValidationCycleExperimentLineageV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';

export type PaperImplementationSemanticCandidateV2ServiceReasonCode =
  | 'SEMANTIC_QUERY_INVALID'
  | 'SEMANTIC_SOURCE_INTEGRITY_ERROR';

export class PaperImplementationSemanticCandidateV2ServiceError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationSemanticCandidateV2ServiceReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationSemanticCandidateV2ServiceError';
  }
}

/**
 * This is deliberately the structured lineage boundary, not a semantic index.
 * Its implementation must resolve project scope before returning candidate ids.
 */
export interface PaperImplementationSemanticStructuredLineageV2Reader {
  listProjectValidationCycles(
    implementationProjectId: string,
  ): Promise<ProjectValidationCyclesLineageV2Response>;

  getValidationCycleExperimentLineage(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycleExperimentLineageV2Response>;
}

export interface PaperImplementationSemanticCandidateV2ServiceOptions {
  structuredLineageReader: PaperImplementationSemanticStructuredLineageV2Reader;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function documentSourceOrder(
  source: PaperImplementationSemanticDocumentSourceRefV2,
): number {
  return source.source_type === 'validation_cycle' ? 0 : 1;
}

function sourceVersion(
  content: PaperImplementationSemanticDocumentContentV2,
  sourceHash: string,
): string {
  if (content.source_type === 'validation_cycle') {
    // ValidationCycle has no persisted monotonic revision. Its current snapshot
    // therefore uses a content-addressed version token.
    return `content:${sourceHash}`;
  }
  const revision = content.branch.current_admitted_revision;
  return [
    `revision:${revision.revision_sequence}`,
    revision.work_order_revision_id,
    `run:${content.branch.effective_head_run.run_id}`,
  ].join(':');
}

function buildDocument(
  implementationProjectId: string,
  sourceId: string,
  content: PaperImplementationSemanticDocumentContentV2,
): PaperImplementationSemanticDocumentV2 {
  const sourceHash = serverHashPaperImplementationSemanticSourceV2(content);
  const source: PaperImplementationSemanticDocumentSourceRefV2 = {
    source_type: content.source_type,
    source_id: sourceId,
    source_version: sourceVersion(content, sourceHash),
    source_hash: sourceHash,
  };
  const semanticText = canonicalizeExperimentV2Json(content);
  return {
    schema_version: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
    document_id: serverPaperImplementationSemanticDocumentV2Id({
      implementation_project_id: implementationProjectId,
      source_type: source.source_type,
      source_id: source.source_id,
    }),
    implementation_project_id: implementationProjectId,
    source,
    semantic_text: semanticText,
    document_hash: serverHashPaperImplementationSemanticDocumentV2({
      implementation_project_id: implementationProjectId,
      source,
      semantic_text: semanticText,
      content,
    }),
    content,
  };
}

function assertCycleHeaderParity(
  summary: ProjectValidationCyclesLineageV2Response['validation_cycles'][number],
  lineage: ValidationCycleExperimentLineageV2Response,
): void {
  const expected = {
    validation_cycle_id: summary.validation_cycle_id,
    status: summary.status,
    target_ref: summary.target_ref,
    created_at: summary.created_at,
    closure: summary.closure,
  };
  if (canonicalizeExperimentV2Json(expected)
    !== canonicalizeExperimentV2Json(lineage.validation_cycle)) {
    throw new PaperImplementationSemanticCandidateV2ServiceError(
      'SEMANTIC_SOURCE_INTEGRITY_ERROR',
      `Structured ValidationCycle snapshots disagree: ${summary.validation_cycle_id}`,
    );
  }
}

/**
 * Phase 4A boundary: prepares a deterministic, authorized candidate batch.
 * It does not read an index, call an embedding/ranking provider, or expose HTTP.
 */
export class PaperImplementationSemanticCandidateV2Service {
  constructor(
    private readonly options: PaperImplementationSemanticCandidateV2ServiceOptions,
  ) {}

  async prepareAuthorizedRankingInput(
    implementationProjectId: string,
    query: string,
  ): Promise<PaperImplementationSemanticRankingInputV2> {
    const normalizedQuery = query.trim();
    if (
      normalizedQuery.length === 0
      || normalizedQuery.length > PAPER_IMPLEMENTATION_SEMANTIC_QUERY_MAX_LENGTH_V2
    ) {
      throw new PaperImplementationSemanticCandidateV2ServiceError(
        'SEMANTIC_QUERY_INVALID',
        'Semantic query must be non-empty and within the v2 length limit',
      );
    }

    // This first call is the project authorization/candidate boundary. No
    // semantic adapter can run before it succeeds.
    const projectLineage = await this.options.structuredLineageReader
      .listProjectValidationCycles(implementationProjectId);
    if (projectLineage.implementation_project_id !== implementationProjectId) {
      throw new PaperImplementationSemanticCandidateV2ServiceError(
        'SEMANTIC_SOURCE_INTEGRITY_ERROR',
        `Structured project scope mismatch: ${implementationProjectId}`,
      );
    }

    const seenCycleIds = new Set<string>();
    const seenDocumentSources = new Set<string>();
    const documents: PaperImplementationSemanticDocumentV2[] = [];
    const cycles = [...projectLineage.validation_cycles].sort((left, right) => (
      compareText(left.validation_cycle_id, right.validation_cycle_id)
    ));
    for (const cycle of cycles) {
      if (seenCycleIds.has(cycle.validation_cycle_id)) {
        throw new PaperImplementationSemanticCandidateV2ServiceError(
          'SEMANTIC_SOURCE_INTEGRITY_ERROR',
          `Structured project returned a duplicate ValidationCycle: ${cycle.validation_cycle_id}`,
        );
      }
      seenCycleIds.add(cycle.validation_cycle_id);
      seenDocumentSources.add(`validation_cycle:${cycle.validation_cycle_id}`);

      const cycleContent: PaperImplementationValidationCycleSemanticDocumentContentV2 = {
        source_type: 'validation_cycle',
        validation_cycle: cycle,
      };
      documents.push(buildDocument(
        implementationProjectId,
        cycle.validation_cycle_id,
        cycleContent,
      ));

      const lineage = await this.options.structuredLineageReader
        .getValidationCycleExperimentLineage(
          implementationProjectId,
          cycle.validation_cycle_id,
        );
      if (
        lineage.implementation_project_id !== implementationProjectId
        || lineage.validation_cycle.validation_cycle_id !== cycle.validation_cycle_id
      ) {
        throw new PaperImplementationSemanticCandidateV2ServiceError(
          'SEMANTIC_SOURCE_INTEGRITY_ERROR',
          `Structured ValidationCycle scope mismatch: ${cycle.validation_cycle_id}`,
        );
      }
      assertCycleHeaderParity(cycle, lineage);

      for (const branch of lineage.branches) {
        if (branch.effective_head_run === null) continue;
        const branchSourceKey = `effective_branch_head:${branch.branch_id}`;
        if (seenDocumentSources.has(branchSourceKey)) {
          throw new PaperImplementationSemanticCandidateV2ServiceError(
            'SEMANTIC_SOURCE_INTEGRITY_ERROR',
            `Structured project returned a duplicate effective branch head: ${branch.branch_id}`,
          );
        }
        seenDocumentSources.add(branchSourceKey);
        const branchContent: PaperImplementationEffectiveBranchHeadSemanticContentV2 = {
          source_type: 'effective_branch_head',
          validation_cycle: lineage.validation_cycle,
          branch: {
            branch_id: branch.branch_id,
            branch_key: branch.branch_key,
            parent_branch_key: branch.parent_branch_key,
            current_admitted_revision: branch.current_admitted_revision,
            effective_head_run: branch.effective_head_run,
          },
        };
        documents.push(buildDocument(
          implementationProjectId,
          branch.branch_id,
          branchContent,
        ));
      }
    }

    documents.sort((left, right) => (
      documentSourceOrder(left.source) - documentSourceOrder(right.source)
      || compareText(left.source.source_id, right.source.source_id)
      || compareText(left.document_id, right.document_id)
    ));
    return {
      schema_version: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
      implementation_project_id: implementationProjectId,
      query: normalizedQuery,
      candidates: documents,
    };
  }
}
