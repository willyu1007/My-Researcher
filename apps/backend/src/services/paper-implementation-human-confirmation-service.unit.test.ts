import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationIntakeSnapshot,
  ImplementationProject,
  ImplementationFeedbackEvent,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CreateHumanConfirmationRecordRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';

import {
  InMemoryPaperImplementationHumanConfirmationRepository,
} from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import {
  PaperImplementationHumanConfirmationService,
} from './paper-implementation-human-confirmation-service.js';

const PROJECT_ID = 'implementation_project_confirmation_001';
const NOW = '2026-07-10T12:00:00.000Z';

class StaticProjectRepository implements PaperImplementationRepository {
  lifecycleStatus: ImplementationProject['lifecycle_status'] = 'active';

  private get project(): ImplementationProject {
    return {
      implementation_project_id: PROJECT_ID,
      intake_snapshot_id: 'intake_snapshot_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'bridge_hash_001',
      target_paper_project_ref: null,
      lifecycle_status: this.lifecycleStatus,
      freshness_status: 'fresh',
      source_status: 'active',
      version_number: 1,
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
      updated_at: NOW,
    };
  }

  async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    return { ...persistence, created: true };
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return implementationProjectId === PROJECT_ID ? structuredClone(this.project) : null;
  }

  async findProjectByBridgeId(): Promise<ImplementationProject | null> {
    return structuredClone(this.project);
  }

  async findIntakeSnapshotById(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    return event;
  }
}

function serviceFixture() {
  const projectRepository = new StaticProjectRepository();
  const confirmationRepository = new InMemoryPaperImplementationHumanConfirmationRepository();
  const service = new PaperImplementationHumanConfirmationService({
    projectRepository,
    confirmationRepository,
    idFactory: (prefix) => `${prefix}_fixed_001`,
    now: () => NOW,
  });
  return { service, projectRepository, confirmationRepository };
}

function validRequest(): CreateHumanConfirmationRecordRequest {
  return {
    confirmation_scope: 'strong_claim_acceptance',
    target_refs: [
      {
        ref_type: 'claim_candidate',
        ref_id: 'claim_candidate_001',
        title_card_id: 'title_card_001',
        version_id: null,
      },
    ],
    rationale: 'Reviewed the run evidence and claim boundary before accepting the strong claim.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
  };
}

test('human confirmation service creates and lists active records', async () => {
  const { service } = serviceFixture();
  const record = await service.createHumanConfirmationRecord(PROJECT_ID, validRequest());
  assert.equal(record.confirmation_record_id, 'pi_human_confirmation_fixed_001');
  assert.equal(record.status, 'active');
  assert.equal(record.created_at, NOW);

  const items = await service.listHumanConfirmationRecords(PROJECT_ID);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.confirmation_scope, 'strong_claim_acceptance');
});

test('human confirmation service rejects non-human actors and missing projects', async () => {
  const { service } = serviceFixture();

  await assert.rejects(
    () => service.createHumanConfirmationRecord(PROJECT_ID, {
      ...validRequest(),
      confirmed_by_actor_type: 'llm',
    }),
    /must be confirmed by a human actor/,
  );

  await assert.rejects(
    () => service.createHumanConfirmationRecord('implementation_project_missing', validRequest()),
    /not found/,
  );
});

test('human confirmation service rejects inactive projects and blank rationale', async () => {
  const { service, projectRepository } = serviceFixture();

  projectRepository.lifecycleStatus = 'archived';
  await assert.rejects(
    () => service.createHumanConfirmationRecord(PROJECT_ID, validRequest()),
    /active ImplementationProject/,
  );

  projectRepository.lifecycleStatus = 'active';
  await assert.rejects(
    () => service.createHumanConfirmationRecord(PROJECT_ID, {
      ...validRequest(),
      rationale: '   ',
    }),
    /rationale is required/,
  );
});
