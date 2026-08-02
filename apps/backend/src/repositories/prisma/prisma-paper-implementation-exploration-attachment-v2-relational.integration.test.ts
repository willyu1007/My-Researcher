import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type {
  ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';
import {
  serverHashExperimentFoundationExplorationSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { PaperImplementationExperimentV2AdmissionService } from '../../services/paper-implementation-experiment-v2-admission-service.js';
import { openVerifiedDisposablePostgresTestDatabase } from '../../test-support/disposable-postgres-test-database.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from './prisma-paper-implementation-experiment-spine-v2-repository.js';

const RUN_REAL_POSTGRES =
  process.env.PAPER_IMPLEMENTATION_EXPLORATION_ATTACHMENT_V2_RELATIONAL_PRISMA === '1';
const SKIP_REASON =
  'set PAPER_IMPLEMENTATION_EXPLORATION_ATTACHMENT_V2_RELATIONAL_PRISMA=1 with explicit randomized disposable database identity variables';
const NOW = '2026-08-02T14:30:00.000Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;

test(
  'Prisma exploration attachment admission is atomic and converges concurrent replay',
  { skip: RUN_REAL_POSTGRES ? false : SKIP_REASON, timeout: 120_000 },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const nonce = randomUUID();
    const projectId = `project-${nonce}`;
    const cycleId = `cycle-${nonce}`;
    const repository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
    const service = admissionService(repository, projectId, cycleId);

    try {
      const crashingRepository = new PrismaPaperImplementationExperimentSpineV2Repository(
        prisma,
        { attachmentFailpoint() { throw new Error('injected attachment transaction crash'); } },
      );
      const crashingService = admissionService(crashingRepository, projectId, cycleId);
      await assert.rejects(crashingService.admitExplorationAttachment({
        implementation_project_id: projectId,
        validation_cycle_id: cycleId,
        branch_key: 'crash-branch',
        business_idempotency_key: `crash-${nonce}`,
        source_revision: sourceRevision(`crash-${nonce}`, 1),
        admitted_by: 'system:paper-implementation-experiment-v2-admission',
      }), /injected attachment transaction crash/);
      assert.deepEqual(await counts(prisma, projectId), {
        branches: 0,
        revisions: 0,
        admissions: 0,
        outboxes: 0,
        attachments: 0,
        receipts: 0,
      });

      const revision = sourceRevision(nonce, 1);
      const input = (businessIdempotencyKey: string) => ({
        implementation_project_id: projectId,
        validation_cycle_id: cycleId,
        branch_key: 'attached-branch',
        business_idempotency_key: businessIdempotencyKey,
        source_revision: revision,
        admitted_by: 'system:paper-implementation-experiment-v2-admission',
      });
      const [left, right] = await Promise.all([
        service.admitExplorationAttachment(input(`left-${nonce}`)),
        service.admitExplorationAttachment(input(`right-${nonce}`)),
      ]);
      assert.equal(left.attachment.attachment_id, right.attachment.attachment_id);
      assert.deepEqual(new Set([left.replayed, right.replayed]), new Set([false, true]));
      assert.deepEqual(await counts(prisma, projectId), {
        branches: 1,
        revisions: 1,
        admissions: 1,
        outboxes: 1,
        attachments: 1,
        receipts: 2,
      });

      const exactReplay = await service.replayExplorationAttachment(input(`third-${nonce}`));
      assert.equal(exactReplay?.replayed, true);
      assert.deepEqual(await counts(prisma, projectId), {
        branches: 1,
        revisions: 1,
        admissions: 1,
        outboxes: 1,
        attachments: 1,
        receipts: 3,
      });

      await prisma.paperImplementationExplorationSpecAttachmentV2.update({
        where: { id: left.attachment.attachment_id },
        data: { specContentHash: `sha256:${'b'.repeat(64)}` },
      });
      await assert.rejects(
        service.replayExplorationAttachment(input(`third-${nonce}`)),
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);

function admissionService(
  repository: PrismaPaperImplementationExperimentSpineV2Repository,
  projectId: string,
  cycleId: string,
) {
  return new PaperImplementationExperimentV2AdmissionService({
    repository,
    explorationAttachmentRepository: repository,
    scopeReader: {
      async resolveExactScope(candidateProjectId, candidateCycleId) {
        return candidateProjectId === projectId && candidateCycleId === cycleId
          ? {
            implementation_project_id: projectId,
            implementation_project_lifecycle_status: 'active',
            validation_cycle_id: cycleId,
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

function sourceRevision(nonce: string, specRevision: number): ExperimentFoundationExplorationSpecRevisionV2 {
  const specification = {
    schema_version: 'v1' as const,
    proposed_branch_frame: {
      frame_schema_version: 'v1' as const,
      display_name: 'Relational attachment',
      scientific_intent: 'Verify one atomic PI attachment and admission.',
      comparison_role: 'primary' as const,
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1' as const,
      title: 'Relational attachment work order',
      objective: 'Verify durable attachment semantics.',
      readiness_attestation_id: `readiness-${nonce}`,
      readiness_attestation_hash: HASH_A,
      asset_dependencies: [
        assetRef('DataPolicy', `policy-${nonce}`),
        assetRef('EvaluationProtocol', `protocol-${nonce}`),
      ],
      run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
    },
    exact_cells: [{
      cell_key: 'cell-relational-attachment',
      seed: 7,
      repeat_index: 0,
      parameters: [],
      required_result_contract: { metrics: [], artifacts: [] },
    }],
  };
  return {
    revision_id: `spec-revision-${nonce}`,
    spec_id: `spec-${nonce}`,
    logical_id: `logical-${nonce}`,
    spec_revision: specRevision,
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

async function counts(
  prisma: Awaited<ReturnType<typeof openVerifiedDisposablePostgresTestDatabase>>['prisma'],
  projectId: string,
) {
  return {
    branches: await prisma.paperImplementationExperimentWorkOrderBranchV2.count({
      where: { implementationProjectId: projectId },
    }),
    revisions: await prisma.paperImplementationExperimentWorkOrderRevisionV2.count({
      where: { branch: { implementationProjectId: projectId } },
    }),
    admissions: await prisma.paperImplementationExperimentWorkOrderAdmissionV2.count({
      where: { branch: { implementationProjectId: projectId } },
    }),
    outboxes: await prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { implementationProjectId: projectId },
    }),
    attachments: await prisma.paperImplementationExplorationSpecAttachmentV2.count({
      where: { implementationProjectId: projectId },
    }),
    receipts: await prisma.paperImplementationExplorationSpecAttachmentReceiptV2.count({
      where: { attachment: { implementationProjectId: projectId } },
    }),
  };
}
