import assert from 'node:assert/strict';
import test from 'node:test';
import {
  asRecord,
  toEmbeddingChunkRecord,
  toPaperLinkRecord,
  toPipelineArtifactRecord,
  toPipelineRunStepRecord,
} from './prisma-literature-record-mappers.js';

test('asRecord only accepts plain object payloads', () => {
  const payload = { ok: true };

  assert.equal(asRecord(payload), payload);
  assert.deepEqual(asRecord(['not', 'a', 'record']), {});
  assert.deepEqual(asRecord('nope'), {});
  assert.deepEqual(asRecord(null), {});
});

test('toEmbeddingChunkRecord coerces vectors to finite numbers and preserves offsets', () => {
  const record = toEmbeddingChunkRecord({
    id: 'chunk-row-1',
    embeddingVersionId: 'version-1',
    literatureId: 'lit-1',
    chunkId: 'chunk-0001',
    chunkIndex: 0,
    text: 'Chunk text',
    startOffset: 12,
    endOffset: 42,
    vector: [1, '2.5', null, Number.NaN, Infinity, '-3'],
    createdAt: new Date('2026-03-19T00:00:00.000Z'),
    updatedAt: new Date('2026-03-19T01:00:00.000Z'),
  });

  assert.deepEqual(record.vector, [1, 2.5, 0, -3]);
  assert.equal(record.startOffset, 12);
  assert.equal(record.endOffset, 42);
  assert.equal(record.createdAt, '2026-03-19T00:00:00.000Z');
  assert.equal(record.updatedAt, '2026-03-19T01:00:00.000Z');
});

test('pipeline and paper-link mappers preserve nullable fields and normalize json payloads', () => {
  const paperLink = toPaperLinkRecord({
    id: 'link-1',
    paperId: 'paper-1',
    topicId: null,
    literatureId: 'lit-1',
    citationStatus: 'used',
    note: null,
    createdAt: new Date('2026-03-19T02:00:00.000Z'),
    updatedAt: new Date('2026-03-19T03:00:00.000Z'),
  });
  assert.equal(paperLink.topicId, null);
  assert.equal(paperLink.citationStatus, 'used');
  assert.equal(paperLink.updatedAt, '2026-03-19T03:00:00.000Z');

  const artifact = toPipelineArtifactRecord({
    id: 'artifact-1',
    literatureId: 'lit-1',
    stageCode: 'INDEXED',
    artifactType: 'LOCAL_INDEX',
    payload: ['unexpected-array'],
    checksum: 'abc123',
    createdAt: new Date('2026-03-19T04:00:00.000Z'),
    updatedAt: new Date('2026-03-19T05:00:00.000Z'),
  });
  assert.deepEqual(artifact.payload, {});

  const step = toPipelineRunStepRecord({
    id: 'step-1',
    runId: 'run-1',
    stageCode: 'CHUNKED',
    status: 'SUCCEEDED',
    inputRef: { source: 'preprocessed' },
    outputRef: ['bad-shape'],
    errorCode: null,
    errorMessage: null,
    startedAt: new Date('2026-03-19T06:00:00.000Z'),
    finishedAt: new Date('2026-03-19T07:00:00.000Z'),
  });
  assert.deepEqual(step.inputRef, { source: 'preprocessed' });
  assert.deepEqual(step.outputRef, {});
});
