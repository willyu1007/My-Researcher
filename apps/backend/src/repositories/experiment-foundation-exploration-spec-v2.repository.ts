import type {
  ExperimentFoundationExplorationSpecIdentityV2,
  ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

export interface ExperimentFoundationExplorationSpecCommandReceiptV2Record {
  receipt_id: string;
  business_idempotency_key: string;
  command_hash: string;
  logical_id: string;
  expected_state_version: number;
  spec_content_hash: string;
  spec_revision_id: string;
  created_at: string;
}

export class ExperimentFoundationExplorationSpecV2RepositoryConstraintError extends Error {
  constructor(
    public readonly reasonCode:
      | 'EXPLORATION_SPEC_IDENTITY_CONFLICT'
      | 'EXPLORATION_SPEC_REVISION_CONFLICT'
      | 'EXPLORATION_SPEC_IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationExplorationSpecV2RepositoryConstraintError';
  }
}

export interface ExperimentFoundationExplorationSpecV2UnitOfWork {
  lockLogicalId(logicalId: string): Promise<void>;
  findIdentity(logicalId: string): Promise<ExperimentFoundationExplorationSpecIdentityV2 | null>;
  insertIdentity(identity: ExperimentFoundationExplorationSpecIdentityV2): Promise<void>;
  compareAndSwapIdentity(
    logicalId: string,
    expectedStateVersion: number,
    next: ExperimentFoundationExplorationSpecIdentityV2,
  ): Promise<boolean>;
  findRevisionById(
    revisionId: string,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null>;
  findRevisionByContentHash(
    specId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null>;
  insertRevision(revision: ExperimentFoundationExplorationSpecRevisionV2): Promise<void>;
  findCommandReceipt(
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExplorationSpecCommandReceiptV2Record | null>;
  insertCommandReceipt(
    receipt: ExperimentFoundationExplorationSpecCommandReceiptV2Record,
  ): Promise<void>;
}

export interface ExperimentFoundationExplorationSpecV2Repository {
  runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationExplorationSpecV2UnitOfWork) => Promise<T>,
  ): Promise<T>;
  findExactRevision(
    specId: string,
    specRevision: number,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null>;
}
