import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type {
  ScientificEvidenceP5PreparedAuthorizationV3,
} from './scientific-evidence-p5-authorization-service.js';
import {
  assertScientificEvidenceP5WorkloadSealabilityV1,
} from './scientific-evidence-p5-workload-preflight-service.js';

const PREPARED_PATH = fileURLToPath(new URL(
  '../../../../workloads/scifact-recall-p5/manifests/prepared-authorization-v16.json',
  import.meta.url,
));
const ENTRYPOINT_PATH = fileURLToPath(new URL(
  '../../../../workloads/scifact-recall-p5/entrypoint.py',
  import.meta.url,
));

test('P5 paid preflight seals the exact local workload outputs for both frozen cells', async () => {
  const executionPackage = await packageBoundToLocalEntrypoint();
  const result = await assertScientificEvidenceP5WorkloadSealabilityV1({
    execution_package: executionPackage,
    entrypoint_path: ENTRYPOINT_PATH,
  });
  assert.equal(result.status, 'sealed');
  assert.equal(result.sealed_cell_count, 2);
  assert.equal(result.source_output_hashes.length, 2);
  assert.equal(new Set(result.source_output_hashes).size, 2);
});

test('P5 paid preflight rejects a package bound to different workload bytes', async () => {
  const executionPackage = await packageBoundToLocalEntrypoint();
  executionPackage.execution_bundle_revision.revision_content.code_artifact.content_digest =
    `sha256:${'f'.repeat(64)}`;
  await assert.rejects(() => assertScientificEvidenceP5WorkloadSealabilityV1({
    execution_package: executionPackage,
    entrypoint_path: ENTRYPOINT_PATH,
  }), /T136_P5_WORKLOAD_ENTRYPOINT_IDENTITY_MISMATCH/);
});

test('P5 paid preflight rejects the historical unqualified observation key', async () => {
  const executionPackage = await packageBoundToLocalEntrypoint();
  const observationSlot = executionPackage.evaluation_protocol.revision_content
    .scientific_contract?.observation_slots[0];
  assert.ok(observationSlot);
  observationSlot.observation_key = 'micro_recall_ppm';
  await assert.rejects(() => assertScientificEvidenceP5WorkloadSealabilityV1({
    execution_package: executionPackage,
    entrypoint_path: ENTRYPOINT_PATH,
  }), /T136_P5_WORKLOAD_SCIENTIFIC_SOURCE_PREFLIGHT_OBSERVATION_SLOT_MISMATCH/);
});

async function packageBoundToLocalEntrypoint() {
  const prepared = JSON.parse(
    await fs.readFile(PREPARED_PATH, 'utf8'),
  ) as ScientificEvidenceP5PreparedAuthorizationV3;
  const executionPackage = structuredClone(prepared.execution_package);
  const bytes = await fs.readFile(ENTRYPOINT_PATH);
  executionPackage.execution_bundle_revision.revision_content.code_artifact = {
    ...executionPackage.execution_bundle_revision.revision_content.code_artifact,
    content_digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    byte_size: bytes.byteLength,
  };
  return executionPackage;
}
