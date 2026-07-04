import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  SNAPSHOT_ID_PATTERN,
  isSnapshotId,
  writingPackageBuildRequestSchema,
} from './paper-project-contracts.js';

test('snapshot id validators accept post-overflow 5-digit ids, not just the 4-digit pad width', () => {
  // The generator zero-pads to 4 digits but keeps counting past SP-9999
  // (mints SP-10000); validators must accept everything minting can produce,
  // otherwise the 10000th snapshot exists and holds the active pointer but can
  // never source a writing package.
  assert.equal(isSnapshotId('SP-0001'), true);
  assert.equal(isSnapshotId('SP-9999'), true);
  assert.equal(isSnapshotId('SP-10000'), true);
  assert.equal(SNAPSHOT_ID_PATTERN.test('SP-10000'), true);

  assert.equal(isSnapshotId('SP-999'), false);
  assert.equal(isSnapshotId('SP-'), false);
  assert.equal(isSnapshotId('sp-0001'), false);
  assert.equal(isSnapshotId('SP-0001x'), false);
});

test('writing package build schema accepts a post-overflow source_snapshot_id', async () => {
  const app = Fastify();
  app.post('/probe', { schema: { body: writingPackageBuildRequestSchema } }, async () => ({ ok: true }));

  const buildBody = (sourceSnapshotId: string) => ({
    source_snapshot_id: sourceSnapshotId,
    writing_mode: 'draft',
    target_release_tag: 'R1.0.0',
    sections: ['intro'],
  });

  const fiveDigit = await app.inject({ method: 'POST', url: '/probe', payload: buildBody('SP-10000') });
  assert.equal(fiveDigit.statusCode, 200);

  const fourDigit = await app.inject({ method: 'POST', url: '/probe', payload: buildBody('SP-0001') });
  assert.equal(fourDigit.statusCode, 200);

  const threeDigit = await app.inject({ method: 'POST', url: '/probe', payload: buildBody('SP-999') });
  assert.equal(threeDigit.statusCode, 400);

  await app.close();
});
