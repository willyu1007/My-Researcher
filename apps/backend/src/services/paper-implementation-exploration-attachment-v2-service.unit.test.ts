import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';
import {
  serverHashExperimentFoundationExplorationSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationExperimentSpineV2Repository } from '../repositories/in-memory-experiment-spine-v2-repository.js';
import { PaperImplementationExperimentV2AdmissionService } from './paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExplorationAttachmentV2Service } from './paper-implementation-exploration-attachment-v2-service.js';

const PROJECT_ID = 'implementation-project-attachment';
const CYCLE_ID = 'validation-cycle-attachment';
const NOW = '2026-08-02T14:00:00.000Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;

test('exploration attachment is default-off before any source read', async () => {
  let reads = 0;
  const service = new PaperImplementationExplorationAttachmentV2Service({
    specReader: { async findExactRevision() { reads += 1; return sourceRevision(); } },
    readinessRevalidator: { async revalidate() { return true; } },
    admission: unavailableAdmission(),
    enabled: () => false,
  });

  await assert.rejects(service.attach(params(), request()), reason('PI_EXPLORATION_ATTACHMENT_DISABLED'));
  assert.equal(reads, 0);
});

test('exploration attachment commits one PI authority bundle and replays without readiness drift', async () => {
  const repository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const admission = admissionService(repository);
  let readinessValid = true;
  let readinessCalls = 0;
  const service = new PaperImplementationExplorationAttachmentV2Service({
    specReader: { async findExactRevision() { return sourceRevision(); } },
    readinessRevalidator: {
      async revalidate() {
        readinessCalls += 1;
        return readinessValid;
      },
    },
    admission,
    enabled: () => true,
  });

  const created = await service.attach(params(), request());
  readinessValid = false;
  const replay = await service.attach(params(), request());
  const differentKeyReplay = await service.attach(params(), {
    ...request(),
    business_idempotency_key: 'attachment-command-2',
  });
  const snapshot = repository.snapshot();

  assert.equal(created.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(differentKeyReplay.replayed, true);
  assert.equal(replay.attachment.attachment_id, created.attachment.attachment_id);
  assert.equal(readinessCalls, 1);
  assert.equal(snapshot.branches.length, 1);
  assert.equal(snapshot.admission_bundles.length, 1);
  assert.equal(snapshot.exploration_attachments.length, 1);
  assert.equal(snapshot.exploration_attachment_receipts.length, 2);
  assert.equal(snapshot.outboxes.length, 1);
});

test('readiness drift and injected commit crash leave zero partial PI authority', async () => {
  const driftRepository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const driftService = serviceWith(driftRepository, false);
  await assert.rejects(
    driftService.attach(params(), request()),
    reason('EXPLORATION_ATTACHMENT_READINESS_DRIFT'),
  );
  assert.deepEqual(driftRepository.snapshot().exploration_attachments, []);
  assert.deepEqual(driftRepository.snapshot().admission_bundles, []);
  assert.deepEqual(driftRepository.snapshot().outboxes, []);

  const crashRepository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  crashRepository.failNext('commitAdmission', new Error('injected attachment crash'));
  await assert.rejects(
    serviceWith(crashRepository, true).attach(params(), request()),
    /injected attachment crash/,
  );
  const snapshot = crashRepository.snapshot();
  assert.equal(snapshot.branches.length, 0);
  assert.equal(snapshot.admission_bundles.length, 0);
  assert.equal(snapshot.exploration_attachments.length, 0);
  assert.equal(snapshot.exploration_attachment_receipts.length, 0);
  assert.equal(snapshot.outboxes.length, 0);
});

test('one exact exploration revision cannot attach to a different PI branch', async () => {
  const repository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const service = serviceWith(repository, true);
  await service.attach(params(), request());
  await assert.rejects(
    service.attach(params(), {
      branch_key: 'other-branch',
      business_idempotency_key: 'attachment-other-branch',
    }),
    reason('EXPLORATION_ATTACHMENT_SCOPE_CONFLICT'),
  );
  assert.equal(repository.snapshot().admission_bundles.length, 1);
});

function serviceWith(
  repository: InMemoryPaperImplementationExperimentSpineV2Repository,
  readinessValid: boolean,
) {
  return new PaperImplementationExplorationAttachmentV2Service({
    specReader: { async findExactRevision() { return sourceRevision(); } },
    readinessRevalidator: { async revalidate() { return readinessValid; } },
    admission: admissionService(repository),
    enabled: () => true,
  });
}

function admissionService(repository: InMemoryPaperImplementationExperimentSpineV2Repository) {
  return new PaperImplementationExperimentV2AdmissionService({
    repository,
    explorationAttachmentRepository: repository,
    scopeReader: {
      async resolveExactScope(projectId, cycleId) {
        return projectId === PROJECT_ID && cycleId === CYCLE_ID
          ? {
            implementation_project_id: PROJECT_ID,
            implementation_project_lifecycle_status: 'active',
            validation_cycle_id: CYCLE_ID,
            validation_cycle_lifecycle_status: 'admitted',
          }
          : null;
      },
    },
    admissionEnabled: () => true,
    cycleClosureLookup: { async isCycleClosed() { return false; } },
    now: () => NOW,
  });
}

function sourceRevision(): ExperimentFoundationExplorationSpecRevisionV2 {
  const specification = {
    schema_version: 'v1' as const,
    proposed_branch_frame: {
      frame_schema_version: 'v1' as const,
      display_name: 'Attached exploration',
      scientific_intent: 'Adopt one immutable exploration specification.',
      comparison_role: 'primary' as const,
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1' as const,
      title: 'Attached work order',
      objective: 'Verify atomic attachment admission.',
      readiness_attestation_id: 'readiness-attachment',
      readiness_attestation_hash: HASH_A,
      asset_dependencies: [
        assetRef('DataPolicy', 'policy-attachment'),
        assetRef('EvaluationProtocol', 'protocol-attachment'),
      ],
      run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
    },
    exact_cells: [{
      cell_key: 'cell-attachment',
      seed: 7,
      repeat_index: 0,
      parameters: [],
      required_result_contract: { metrics: [], artifacts: [] },
    }],
  };
  return {
    revision_id: 'exploration-spec-revision-1',
    spec_id: 'exploration-spec-1',
    logical_id: 'exploration-main',
    spec_revision: 1,
    content_hash: serverHashExperimentFoundationExplorationSpecV2(specification),
    specification,
    created_at: NOW,
  };
}

function assetRef(
  assetType: 'DataPolicy' | 'EvaluationProtocol',
  logicalId: string,
) {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: `${logicalId}-revision-1`,
    revision_sequence: 1,
    content_hash: HASH_A,
  };
}

function params() {
  return {
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: CYCLE_ID,
    spec_id: 'exploration-spec-1',
    spec_revision: 1,
  };
}

function request() {
  return {
    branch_key: 'attached-branch',
    business_idempotency_key: 'attachment-command-1',
  };
}

function unavailableAdmission() {
  return {
    async replayExplorationAttachment(): Promise<null> { return null; },
    async admitExplorationAttachment(): Promise<never> { throw new Error('unexpected admission'); },
  };
}

function reason(expected: string) {
  return (error: unknown): boolean => (
    error instanceof AppError && error.details?.reason_code === expected
  );
}
