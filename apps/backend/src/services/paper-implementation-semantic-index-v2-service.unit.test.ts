import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
  type PaperImplementationSemanticDocumentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashPaperImplementationSemanticDocumentV2,
  serverHashPaperImplementationSemanticSourceV2,
  serverPaperImplementationSemanticDocumentV2Id,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  PaperImplementationSemanticProjectionV2RepositoryError,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';
import {
  InMemoryPaperImplementationSemanticProjectionV2Repository,
} from '../repositories/in-memory-paper-implementation-semantic-projection-v2-repository.js';
import {
  PaperImplementationSemanticIndexV2Service,
  PaperImplementationSemanticIndexV2ServiceError,
  type PaperImplementationSemanticEmbeddingV2Port,
} from './paper-implementation-semantic-index-v2-service.js';

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';
const PROFILE = {
  profile_id: 'pi-semantic-test-v1',
  provider: 'deterministic-test',
  model: 'basis-vector-v1',
  dimension: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2,
} as const;
const OPEN_CLOSURE = {
  closed: false,
  kind: null,
  disposition: null,
  closed_at: null,
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
        type: 'paper_project',
        id: `${cycleId}-paper`,
        version: null,
      },
      created_at: '2026-08-03T07:00:00.000Z',
      closure: OPEN_CLOSURE,
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

function deterministicVector(documentId: string): number[] {
  const seed = [...documentId].reduce((sum, character) => (
    (sum + character.charCodeAt(0)) % PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2
  ), 0);
  return Array.from(
    { length: PAPER_IMPLEMENTATION_SEMANTIC_VECTOR_DIMENSION_V2 },
    (_, index) => ((index + seed) % 251) + 1 + ((index % 7) * 0.001_234_567),
  );
}

function deterministicEmbeddingPort(
  calls: string[][] = [],
): PaperImplementationSemanticEmbeddingV2Port {
  return {
    async embedDocuments(input) {
      calls.push(input.documents.map((document) => document.document_id));
      return input.documents.map((document) => ({
        document_id: document.document_id,
        vector: deterministicVector(document.document_id),
      }));
    },
  };
}

test('semantic index rebuild persists only authorized documents and exact replay is zero-change', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A, PROJECT_B],
  });
  const documents = [
    semanticDocument(PROJECT_A, 'cycle-2'),
    semanticDocument(PROJECT_A, 'cycle-1'),
  ];
  const embeddingCalls: string[][] = [];
  let now = '2026-08-03T07:01:00.000Z';
  const service = new PaperImplementationSemanticIndexV2Service({
    documentReader: {
      async listAuthorizedDocuments(projectId) {
        assert.equal(projectId, PROJECT_A);
        return structuredClone(documents);
      },
    },
    embeddingPort: deterministicEmbeddingPort(embeddingCalls),
    repository,
    embeddingProfile: PROFILE,
    now: () => now,
  });

  assert.deepEqual(await service.rebuildProjectProjection(PROJECT_A), {
    changed_count: 2,
    unchanged_count: 0,
    deleted_count: 0,
    total_count: 2,
  });
  const first = await repository.listProjectProjection(PROJECT_A);
  assert.equal(first.length, 2);
  assert.equal(await repository.listProjectProjection(PROJECT_B).then((rows) => rows.length), 0);
  assert.deepEqual(embeddingCalls[0], documents.map((document) => document.document_id));
  for (const row of first) {
    const norm = Math.sqrt(row.normalized_vector.reduce(
      (sum, value) => sum + (value * value),
      0,
    ));
    assert.ok(Math.abs(norm - 1) < 1e-5);
    assert.equal(
      row.normalized_vector.every((value) => Object.is(value, Math.fround(value))),
      true,
    );
    assert.deepEqual(row.embedding_profile, PROFILE);
  }

  now = '2026-08-03T08:00:00.000Z';
  assert.deepEqual(await service.rebuildProjectProjection(PROJECT_A), {
    changed_count: 0,
    unchanged_count: 2,
    deleted_count: 0,
    total_count: 2,
  });
  assert.deepEqual(await repository.listProjectProjection(PROJECT_A), first);
  assert.equal(embeddingCalls.length, 1);
});

test('semantic index rebuild prunes stale rows only inside the authorized project', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A, PROJECT_B],
  });
  let documents = [
    semanticDocument(PROJECT_A, 'cycle-1'),
    semanticDocument(PROJECT_A, 'cycle-stale'),
  ];
  const serviceA = new PaperImplementationSemanticIndexV2Service({
    documentReader: { async listAuthorizedDocuments() { return structuredClone(documents); } },
    embeddingPort: deterministicEmbeddingPort(),
    repository,
    embeddingProfile: PROFILE,
  });
  const serviceB = new PaperImplementationSemanticIndexV2Service({
    documentReader: {
      async listAuthorizedDocuments() {
        return [semanticDocument(PROJECT_B, 'cycle-b')];
      },
    },
    embeddingPort: deterministicEmbeddingPort(),
    repository,
    embeddingProfile: PROFILE,
  });
  await serviceA.rebuildProjectProjection(PROJECT_A);
  await serviceB.rebuildProjectProjection(PROJECT_B);

  documents = [semanticDocument(PROJECT_A, 'cycle-1')];
  assert.deepEqual(await serviceA.rebuildProjectProjection(PROJECT_A), {
    changed_count: 0,
    unchanged_count: 1,
    deleted_count: 1,
    total_count: 1,
  });
  assert.equal((await repository.listProjectProjection(PROJECT_A)).length, 1);
  assert.equal((await repository.listProjectProjection(PROJECT_B)).length, 1);
});

test('embedding failure or incomplete output preserves the prior projection', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A],
  });
  const initialDocument = semanticDocument(PROJECT_A, 'cycle-initial');
  await new PaperImplementationSemanticIndexV2Service({
    documentReader: { async listAuthorizedDocuments() { return [initialDocument]; } },
    embeddingPort: deterministicEmbeddingPort(),
    repository,
    embeddingProfile: PROFILE,
  }).rebuildProjectProjection(PROJECT_A);
  const initial = await repository.listProjectProjection(PROJECT_A);

  const failingService = new PaperImplementationSemanticIndexV2Service({
    documentReader: {
      async listAuthorizedDocuments() {
        return [semanticDocument(PROJECT_A, 'cycle-new')];
      },
    },
    embeddingPort: {
      async embedDocuments() {
        throw new Error('injected embedding outage');
      },
    },
    repository,
    embeddingProfile: PROFILE,
  });
  await assert.rejects(
    failingService.rebuildProjectProjection(PROJECT_A),
    /injected embedding outage/,
  );
  assert.deepEqual(await repository.listProjectProjection(PROJECT_A), initial);

  const incompleteService = new PaperImplementationSemanticIndexV2Service({
    documentReader: {
      async listAuthorizedDocuments() {
        return [semanticDocument(PROJECT_A, 'cycle-new')];
      },
    },
    embeddingPort: { async embedDocuments() { return []; } },
    repository,
    embeddingProfile: PROFILE,
  });
  await assert.rejects(
    incompleteService.rebuildProjectProjection(PROJECT_A),
    (error) => (
      error instanceof PaperImplementationSemanticIndexV2ServiceError
      && error.reasonCode === 'SEMANTIC_EMBEDDING_INVALID'
    ),
  );
  assert.deepEqual(await repository.listProjectProjection(PROJECT_A), initial);
});

test('empty authorized source prunes the project without invoking embedding', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A],
  });
  let embeddingCalled = false;
  const service = new PaperImplementationSemanticIndexV2Service({
    documentReader: { async listAuthorizedDocuments() { return []; } },
    embeddingPort: {
      async embedDocuments() {
        embeddingCalled = true;
        return [];
      },
    },
    repository,
    embeddingProfile: PROFILE,
  });
  assert.deepEqual(await service.rebuildProjectProjection(PROJECT_A), {
    changed_count: 0,
    unchanged_count: 0,
    deleted_count: 0,
    total_count: 0,
  });
  assert.equal(embeddingCalled, false);
});

test('source drift during replacement retries and leaves only the stabilized snapshot', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A],
  });
  const first = semanticDocument(PROJECT_A, 'cycle-first');
  const stable = semanticDocument(PROJECT_A, 'cycle-stable');
  const snapshots = [[first], [first], [stable], [stable], [stable], [stable]];
  let readIndex = 0;
  const service = new PaperImplementationSemanticIndexV2Service({
    documentReader: {
      async listAuthorizedDocuments() {
        const snapshot = snapshots[Math.min(readIndex, snapshots.length - 1)]!;
        readIndex += 1;
        return structuredClone(snapshot);
      },
    },
    embeddingPort: deterministicEmbeddingPort(),
    repository,
    embeddingProfile: PROFILE,
  });

  assert.deepEqual(await service.rebuildProjectProjection(PROJECT_A), {
    changed_count: 1,
    unchanged_count: 0,
    deleted_count: 1,
    total_count: 1,
  });
  const stored = await repository.listProjectProjection(PROJECT_A);
  assert.deepEqual(stored.map((document) => document.document_id), [stable.document_id]);
});

test('continuously drifting source fails closed without replacing the projection', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A],
  });
  const first = semanticDocument(PROJECT_A, 'cycle-first');
  const second = semanticDocument(PROJECT_A, 'cycle-second');
  let readCount = 0;
  const service = new PaperImplementationSemanticIndexV2Service({
    documentReader: {
      async listAuthorizedDocuments() {
        readCount += 1;
        return [structuredClone(readCount % 2 === 1 ? first : second)];
      },
    },
    embeddingPort: deterministicEmbeddingPort(),
    repository,
    embeddingProfile: PROFILE,
  });

  await assert.rejects(
    service.rebuildProjectProjection(PROJECT_A),
    (error: unknown) => error instanceof PaperImplementationSemanticIndexV2ServiceError
      && error.reasonCode === 'SEMANTIC_SOURCE_DRIFT',
  );
  assert.deepEqual(await repository.listProjectProjection(PROJECT_A), []);
});

test('all index write boundaries reject non-canonical embedding profiles', async () => {
  const repository = new InMemoryPaperImplementationSemanticProjectionV2Repository({
    projects: [PROJECT_A],
  });
  let embeddingCalled = false;
  assert.throws(
    () => new PaperImplementationSemanticIndexV2Service({
      documentReader: { async listAuthorizedDocuments() { return []; } },
      embeddingPort: {
        async embedDocuments() {
          embeddingCalled = true;
          return [];
        },
      },
      repository,
      embeddingProfile: { ...PROFILE, model: ' basis-vector-v1 ' },
    }),
    (error) => (
      error instanceof PaperImplementationSemanticIndexV2ServiceError
      && error.reasonCode === 'SEMANTIC_EMBEDDING_INVALID'
    ),
  );
  assert.equal(embeddingCalled, false);

  const validDocument = semanticDocument(PROJECT_A, 'cycle-profile');
  await new PaperImplementationSemanticIndexV2Service({
    documentReader: { async listAuthorizedDocuments() { return [validDocument]; } },
    embeddingPort: deterministicEmbeddingPort(),
    repository,
    embeddingProfile: PROFILE,
  }).rebuildProjectProjection(PROJECT_A);
  const [record] = await repository.listProjectProjection(PROJECT_A);
  await assert.rejects(
    repository.replaceProjectProjection({
      implementation_project_id: PROJECT_A,
      documents: [{
        ...record!,
        embedding_profile: { ...PROFILE, provider: '   ' },
      }],
    }),
    (error) => (
      error instanceof PaperImplementationSemanticProjectionV2RepositoryError
      && error.reasonCode === 'PROJECTION_INPUT_INVALID'
    ),
  );
  await assert.rejects(
    repository.searchProjectProjection({
      implementation_project_id: PROJECT_A,
      embedding_profile: { ...PROFILE, provider: 'deterministic-test ' },
      normalized_query_vector: record!.normalized_vector,
      limit: 1,
      query_timeout_ms: 100,
    }),
    (error) => (
      error instanceof PaperImplementationSemanticProjectionV2RepositoryError
      && error.reasonCode === 'PROJECTION_QUERY_INVALID'
    ),
  );
});
