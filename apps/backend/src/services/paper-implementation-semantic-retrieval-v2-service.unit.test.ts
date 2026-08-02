import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
  type PaperImplementationSemanticDocumentV2,
  type PaperImplementationSemanticRankingInputV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashPaperImplementationSemanticDocumentV2,
  serverHashPaperImplementationSemanticSourceV2,
  serverPaperImplementationSemanticDocumentV2Id,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  PaperImplementationSemanticProjectionV2RepositoryError,
  type PaperImplementationSemanticProjectionHitV2,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';
import {
  PaperImplementationSemanticRetrievalV2Service,
  PaperImplementationSemanticRetrievalV2ServiceError,
  type PaperImplementationSemanticQueryEmbeddingV2Port,
  type PaperImplementationSemanticRankingInputV2Reader,
} from './paper-implementation-semantic-retrieval-v2-service.js';

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';
const PROFILE = {
  profile_id: 'pi-semantic-test-v1',
  provider: 'deterministic-test',
  model: 'query-vector-v1',
  dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
} as const;

function semanticDocument(
  implementationProjectId: string,
  cycleId: string,
): PaperImplementationSemanticDocumentV2 {
  const content = {
    source_type: 'validation_cycle' as const,
    validation_cycle: {
      validation_cycle_id: cycleId,
      status: 'admitted',
      target_ref: {
        type: 'paper_project' as const,
        id: `${cycleId}-paper`,
        version: null,
      },
      created_at: '2026-08-03T07:00:00.000Z',
      closure: {
        closed: false as const,
        kind: null,
        disposition: null,
        closed_at: null,
      },
      branch_count: 0,
      admitted_branch_count: 0,
      total_run_count: 0,
      active_real_attempt_count: 0,
    },
  };
  const sourceHash = serverHashPaperImplementationSemanticSourceV2(content);
  const source = {
    source_type: content.source_type,
    source_id: cycleId,
    source_version: `content:${sourceHash}`,
    source_hash: sourceHash,
  };
  const semanticText = canonicalizeExperimentV2Json(content);
  const documentId = serverPaperImplementationSemanticDocumentV2Id({
    implementation_project_id: implementationProjectId,
    source_type: source.source_type,
    source_id: source.source_id,
  });
  return {
    schema_version: 'v1',
    document_id: documentId,
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

function hit(
  document: PaperImplementationSemanticDocumentV2,
  semanticScore: number,
): PaperImplementationSemanticProjectionHitV2 {
  return {
    document_id: document.document_id,
    implementation_project_id: document.implementation_project_id,
    source: structuredClone(document.source),
    document_hash: document.document_hash,
    embedding_hash: `sha256:${'e'.repeat(64)}`,
    semantic_score: semanticScore,
  };
}

function queryVector(): number[] {
  const vector = Array<number>(PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2).fill(0);
  vector[0] = 2;
  return vector;
}

function rankingInput(
  implementationProjectId: string,
  candidates: PaperImplementationSemanticDocumentV2[],
): PaperImplementationSemanticRankingInputV2 {
  return {
    schema_version: 'v1',
    implementation_project_id: implementationProjectId,
    query: 'compare current experiment lineage',
    candidates,
  };
}

function readerFor(
  value: PaperImplementationSemanticRankingInputV2,
  events: string[] = [],
): PaperImplementationSemanticRankingInputV2Reader {
  return {
    async prepareAuthorizedRankingInput(projectId, query) {
      events.push('structured');
      assert.equal(projectId, value.implementation_project_id);
      assert.equal(query.trim(), value.query);
      return structuredClone(value);
    },
  };
}

function embeddingPort(
  events: string[] = [],
): PaperImplementationSemanticQueryEmbeddingV2Port {
  return {
    async embedQuery({ query, profile, signal }) {
      events.push('embedding');
      assert.equal(query, 'compare current experiment lineage');
      assert.deepEqual(profile, PROFILE);
      assert.equal(signal.aborted, false);
      return queryVector();
    },
  };
}

test('retrieval authorizes first and orders complete-index ties deterministically', async () => {
  const documentA = semanticDocument(PROJECT_A, 'cycle-a');
  const documentB = semanticDocument(PROJECT_A, 'cycle-b');
  const events: string[] = [];
  const service = new PaperImplementationSemanticRetrievalV2Service({
    rankingInputReader: readerFor(rankingInput(PROJECT_A, [documentB, documentA]), events),
    queryEmbeddingPort: embeddingPort(events),
    projectionRepository: {
      async searchProjectProjection(input) {
        events.push('index');
        assert.equal(input.implementation_project_id, PROJECT_A);
        assert.equal(input.limit, 2);
        assert.deepEqual(input.embedding_profile, PROFILE);
        assert.equal(input.normalized_query_vector[0], 1);
        return [
          hit(documentB, 0.75),
          hit(documentA, 0.75),
        ];
      },
    },
    embeddingProfile: PROFILE,
  });

  const result = await service.retrieve({
    implementation_project_id: PROJECT_A,
    query: '  compare current experiment lineage  ',
    result_limit: 2,
  });
  assert.deepEqual(events, ['structured', 'embedding', 'index']);
  assert.equal(result.retrieval_mode, 'semantic');
  assert.equal(result.semantic_hits_considered, 2);
  assert.equal(result.stale_hits_dropped, 0);
  assert.deepEqual(
    result.results.map((item) => item.document.document_id),
    [documentA.document_id, documentB.document_id].sort(),
  );
  assert.deepEqual(result.results.map((item) => item.rank), [1, 2]);
});

test('partial stale/foreign index returns the complete structured fallback', async () => {
  const documents = [
    semanticDocument(PROJECT_A, 'cycle-a'),
    semanticDocument(PROJECT_A, 'cycle-b'),
  ];
  const staleDocument = semanticDocument(PROJECT_A, 'cycle-stale');
  const foreignDocument = semanticDocument(PROJECT_B, 'cycle-foreign');
  const service = new PaperImplementationSemanticRetrievalV2Service({
    rankingInputReader: readerFor(rankingInput(PROJECT_A, documents)),
    queryEmbeddingPort: embeddingPort(),
    projectionRepository: {
      async searchProjectProjection() {
        return [hit(staleDocument, 0.9), hit(foreignDocument, 0.8)];
      },
    },
    embeddingProfile: PROFILE,
  });
  const result = await service.retrieve({
    implementation_project_id: PROJECT_A,
    query: 'compare current experiment lineage',
    result_limit: 1,
  });
  assert.equal(result.retrieval_mode, 'structured_fallback');
  assert.equal(result.fallback_reason, 'SEMANTIC_INDEX_INCOMPLETE');
  assert.equal(result.stale_hits_dropped, 2);
  assert.deepEqual(
    result.results.map((item) => item.document.document_id),
    documents.map((document) => document.document_id),
  );
  assert.equal(result.results.length, 2, 'fallback remains complete despite result_limit=1');
});

test('missing projection rows return complete fallback instead of partial semantic results', async () => {
  const documents = [
    semanticDocument(PROJECT_A, 'cycle-a'),
    semanticDocument(PROJECT_A, 'cycle-b'),
  ];
  const service = new PaperImplementationSemanticRetrievalV2Service({
    rankingInputReader: readerFor(rankingInput(PROJECT_A, documents)),
    queryEmbeddingPort: embeddingPort(),
    projectionRepository: {
      async searchProjectProjection() { return [hit(documents[0]!, 0.9)]; },
    },
    embeddingProfile: PROFILE,
  });
  const result = await service.retrieve({
    implementation_project_id: PROJECT_A,
    query: 'compare current experiment lineage',
  });
  assert.equal(result.retrieval_mode, 'structured_fallback');
  assert.equal(result.fallback_reason, 'SEMANTIC_INDEX_INCOMPLETE');
  assert.equal(result.semantic_hits_considered, 1);
  assert.equal(result.stale_hits_dropped, 0);
  assert.deepEqual(result.results.map((item) => item.document), documents);
});

test('embedding/index failures and corrupt duplicate hits fail open to structured lineage', async (t) => {
  const documents = [semanticDocument(PROJECT_A, 'cycle-a')];
  const source = rankingInput(PROJECT_A, documents);
  const cases: Array<{
    name: string;
    queryEmbeddingPort: PaperImplementationSemanticQueryEmbeddingV2Port;
    search: () => Promise<PaperImplementationSemanticProjectionHitV2[]>;
    expectedReason: string;
  }> = [
    {
      name: 'embedding unavailable',
      queryEmbeddingPort: { async embedQuery() { throw new Error('offline'); } },
      search: async () => [],
      expectedReason: 'QUERY_EMBEDDING_UNAVAILABLE',
    },
    {
      name: 'embedding invalid',
      queryEmbeddingPort: { async embedQuery() { return [0]; } },
      search: async () => [],
      expectedReason: 'QUERY_EMBEDDING_INVALID',
    },
    {
      name: 'index unavailable',
      queryEmbeddingPort: embeddingPort(),
      search: async () => { throw new Error('index offline'); },
      expectedReason: 'SEMANTIC_INDEX_UNAVAILABLE',
    },
    {
      name: 'index corrupt',
      queryEmbeddingPort: embeddingPort(),
      search: async () => {
        throw new PaperImplementationSemanticProjectionV2RepositoryError(
          'PROJECTION_STORED_INTEGRITY_ERROR',
          'corrupt row',
        );
      },
      expectedReason: 'SEMANTIC_INDEX_CORRUPT',
    },
    {
      name: 'duplicate hit',
      queryEmbeddingPort: embeddingPort(),
      search: async () => [hit(documents[0]!, 0.8), hit(documents[0]!, 0.7)],
      expectedReason: 'SEMANTIC_INDEX_CORRUPT',
    },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const service = new PaperImplementationSemanticRetrievalV2Service({
        rankingInputReader: readerFor(source),
        queryEmbeddingPort: scenario.queryEmbeddingPort,
        projectionRepository: { searchProjectProjection: scenario.search },
        embeddingProfile: PROFILE,
      });
      const result = await service.retrieve({
        implementation_project_id: PROJECT_A,
        query: source.query,
      });
      assert.equal(result.retrieval_mode, 'structured_fallback');
      assert.equal(result.fallback_reason, scenario.expectedReason);
      assert.deepEqual(result.results.map((item) => item.document), documents);
    });
  }
});

test('semantic timeout aborts the adapter and returns complete structured fallback', async () => {
  const documents = [semanticDocument(PROJECT_A, 'cycle-a')];
  let aborted = false;
  const service = new PaperImplementationSemanticRetrievalV2Service({
    rankingInputReader: readerFor(rankingInput(PROJECT_A, documents)),
    queryEmbeddingPort: {
      async embedQuery({ signal }) {
        return new Promise<number[]>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          }, { once: true });
        });
      },
    },
    projectionRepository: { async searchProjectProjection() { return []; } },
    embeddingProfile: PROFILE,
    semanticTimeoutMs: 5,
  });
  const result = await service.retrieve({
    implementation_project_id: PROJECT_A,
    query: 'compare current experiment lineage',
  });
  assert.equal(aborted, true);
  assert.equal(result.retrieval_mode, 'structured_fallback');
  assert.equal(result.fallback_reason, 'SEMANTIC_ATTEMPT_TIMEOUT');
  assert.deepEqual(result.results.map((item) => item.document), documents);
});

test('invalid result limit stops before structured or semantic reads', async () => {
  let read = false;
  const service = new PaperImplementationSemanticRetrievalV2Service({
    rankingInputReader: {
      async prepareAuthorizedRankingInput() {
        read = true;
        return rankingInput(PROJECT_A, []);
      },
    },
    queryEmbeddingPort: embeddingPort(),
    projectionRepository: { async searchProjectProjection() { return []; } },
    embeddingProfile: PROFILE,
  });
  await assert.rejects(
    service.retrieve({
      implementation_project_id: PROJECT_A,
      query: 'compare current experiment lineage',
      result_limit: 101,
    }),
    (error) => (
      error instanceof PaperImplementationSemanticRetrievalV2ServiceError
      && error.reasonCode === 'SEMANTIC_RESULT_LIMIT_INVALID'
    ),
  );
  assert.equal(read, false);
});

test('mismatched structured project scope stops before semantic dependencies', async () => {
  let semanticCalled = false;
  const service = new PaperImplementationSemanticRetrievalV2Service({
    rankingInputReader: {
      async prepareAuthorizedRankingInput() {
        return rankingInput(PROJECT_B, [semanticDocument(PROJECT_B, 'cycle-b')]);
      },
    },
    queryEmbeddingPort: {
      async embedQuery() {
        semanticCalled = true;
        return queryVector();
      },
    },
    projectionRepository: {
      async searchProjectProjection() {
        semanticCalled = true;
        return [];
      },
    },
    embeddingProfile: PROFILE,
  });
  await assert.rejects(
    service.retrieve({
      implementation_project_id: PROJECT_A,
      query: 'compare current experiment lineage',
    }),
    (error) => (
      error instanceof PaperImplementationSemanticRetrievalV2ServiceError
      && error.reasonCode === 'SEMANTIC_AUTHORIZED_INPUT_INVALID'
    ),
  );
  assert.equal(semanticCalled, false);
});
