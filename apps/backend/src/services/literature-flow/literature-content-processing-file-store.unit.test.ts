import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';
import { LiteratureContentProcessingFileStore } from './literature-content-processing-file-store.js';

const tempDirs = new Set<string>();

after(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function createSettingsService(root: string): LiteratureContentProcessingSettingsService {
  return {
    resolveStorageRoot: async (key: string) => {
      const directory = path.join(root, key);
      await fs.mkdir(directory, { recursive: true });
      return directory;
    },
  } as LiteratureContentProcessingSettingsService;
}

test('content-processing file store writes text artifacts under configured roots with checksum', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-file-store-'));
  tempDirs.add(root);
  const store = new LiteratureContentProcessingFileStore(createSettingsService(root));

  const artifact = await store.writeTextArtifact({
    root: 'normalized_text',
    literatureId: 'Lit With Spaces',
    fileName: 'paper normalized.txt',
    text: 'Normalized paper text.',
  });

  assert.equal(artifact.path.startsWith(path.join(root, 'normalized_text')), true);
  assert.equal(await fs.readFile(artifact.path, 'utf8'), 'Normalized paper text.');
  assert.equal(
    artifact.checksum,
    crypto.createHash('sha256').update('Normalized paper text.').digest('hex'),
  );
  assert.equal(path.basename(path.dirname(artifact.path)), 'Lit-With-Spaces');
  assert.equal(path.basename(artifact.path), 'paper-normalized.txt');
});

test('content-processing file store writes json artifacts with stable local path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pea-lit-file-store-'));
  tempDirs.add(root);
  const store = new LiteratureContentProcessingFileStore(createSettingsService(root));

  const artifact = await store.writeJsonArtifact({
    root: 'artifacts_cache',
    literatureId: 'LIT-JSON-1',
    fileName: 'manifest.json',
    payload: { document_id: 'doc-1', chunks: 3 },
  });

  assert.equal(artifact.path, path.join(root, 'artifacts_cache', 'LIT-JSON-1', 'manifest.json'));
  assert.deepEqual(JSON.parse(await fs.readFile(artifact.path, 'utf8')), {
    document_id: 'doc-1',
    chunks: 3,
  });
});
