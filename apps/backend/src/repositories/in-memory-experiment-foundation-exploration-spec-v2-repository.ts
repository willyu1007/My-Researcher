import type {
  ExperimentFoundationExplorationSpecIdentityV2,
  ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

import {
  ExperimentFoundationExplorationSpecV2RepositoryConstraintError,
  type ExperimentFoundationExplorationSpecCommandReceiptV2Record,
  type ExperimentFoundationExplorationSpecV2Repository,
  type ExperimentFoundationExplorationSpecV2UnitOfWork,
} from './experiment-foundation-exploration-spec-v2.repository.js';

interface ExplorationSpecState {
  identitiesByLogicalId: Map<string, ExperimentFoundationExplorationSpecIdentityV2>;
  revisionsById: Map<string, ExperimentFoundationExplorationSpecRevisionV2>;
  revisionIdBySpecContent: Map<string, string>;
  receiptsByBusinessKey: Map<string, ExperimentFoundationExplorationSpecCommandReceiptV2Record>;
}

export class InMemoryExperimentFoundationExplorationSpecV2Repository
implements ExperimentFoundationExplorationSpecV2Repository {
  private state = emptyState();
  private transactionTail: Promise<void> = Promise.resolve();

  async runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationExplorationSpecV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const working = cloneState(this.state);
    try {
      const result = await operation(new InMemoryExplorationSpecUnitOfWork(working));
      this.state = working;
      return result;
    } finally {
      release();
    }
  }

  async findExactRevision(
    specId: string,
    specRevision: number,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null> {
    const revision = [...this.state.revisionsById.values()].find((candidate) => (
      candidate.spec_id === specId && candidate.spec_revision === specRevision
    ));
    return cloneNullable(revision);
  }
}

class InMemoryExplorationSpecUnitOfWork
implements ExperimentFoundationExplorationSpecV2UnitOfWork {
  constructor(private readonly state: ExplorationSpecState) {}

  async lockLogicalId(): Promise<void> {}

  async findIdentity(
    logicalId: string,
  ): Promise<ExperimentFoundationExplorationSpecIdentityV2 | null> {
    return cloneNullable(this.state.identitiesByLogicalId.get(logicalId));
  }

  async insertIdentity(identity: ExperimentFoundationExplorationSpecIdentityV2): Promise<void> {
    if (
      this.state.identitiesByLogicalId.has(identity.logical_id)
      || [...this.state.identitiesByLogicalId.values()].some((row) => row.spec_id === identity.spec_id)
    ) {
      throw constraint('EXPLORATION_SPEC_IDENTITY_CONFLICT', 'Exploration spec identity conflicts.');
    }
    this.state.identitiesByLogicalId.set(identity.logical_id, clone(identity));
  }

  async compareAndSwapIdentity(
    logicalId: string,
    expectedStateVersion: number,
    next: ExperimentFoundationExplorationSpecIdentityV2,
  ): Promise<boolean> {
    const current = this.state.identitiesByLogicalId.get(logicalId);
    if (!current || current.state_version !== expectedStateVersion) return false;
    this.state.identitiesByLogicalId.set(logicalId, clone(next));
    return true;
  }

  async findRevisionById(
    revisionId: string,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null> {
    return cloneNullable(this.state.revisionsById.get(revisionId));
  }

  async findRevisionByContentHash(
    specId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null> {
    const revisionId = this.state.revisionIdBySpecContent.get(specContentKey(specId, contentHash));
    return revisionId ? cloneNullable(this.state.revisionsById.get(revisionId)) : null;
  }

  async insertRevision(revision: ExperimentFoundationExplorationSpecRevisionV2): Promise<void> {
    const contentKey = specContentKey(revision.spec_id, revision.content_hash);
    if (
      this.state.revisionsById.has(revision.revision_id)
      || this.state.revisionIdBySpecContent.has(contentKey)
      || [...this.state.revisionsById.values()].some((row) => (
        row.spec_id === revision.spec_id && row.spec_revision === revision.spec_revision
      ))
    ) {
      throw constraint('EXPLORATION_SPEC_REVISION_CONFLICT', 'Exploration spec revision conflicts.');
    }
    this.state.revisionsById.set(revision.revision_id, clone(revision));
    this.state.revisionIdBySpecContent.set(contentKey, revision.revision_id);
  }

  async findCommandReceipt(
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExplorationSpecCommandReceiptV2Record | null> {
    return cloneNullable(this.state.receiptsByBusinessKey.get(businessIdempotencyKey));
  }

  async insertCommandReceipt(
    receipt: ExperimentFoundationExplorationSpecCommandReceiptV2Record,
  ): Promise<void> {
    if (this.state.receiptsByBusinessKey.has(receipt.business_idempotency_key)) {
      throw constraint(
        'EXPLORATION_SPEC_IDEMPOTENCY_CONFLICT',
        'Exploration spec idempotency receipt conflicts.',
      );
    }
    this.state.receiptsByBusinessKey.set(receipt.business_idempotency_key, clone(receipt));
  }
}

function emptyState(): ExplorationSpecState {
  return {
    identitiesByLogicalId: new Map(),
    revisionsById: new Map(),
    revisionIdBySpecContent: new Map(),
    receiptsByBusinessKey: new Map(),
  };
}

function cloneState(state: ExplorationSpecState): ExplorationSpecState {
  return {
    identitiesByLogicalId: cloneMap(state.identitiesByLogicalId),
    revisionsById: cloneMap(state.revisionsById),
    revisionIdBySpecContent: new Map(state.revisionIdBySpecContent),
    receiptsByBusinessKey: cloneMap(state.receiptsByBusinessKey),
  };
}

function cloneMap<K, V>(source: Map<K, V>): Map<K, V> {
  return new Map([...source.entries()].map(([key, value]) => [key, structuredClone(value)]));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneNullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : structuredClone(value);
}

function specContentKey(specId: string, contentHash: string): string {
  return `${specId}\u0000${contentHash}`;
}

function constraint(
  reasonCode: ExperimentFoundationExplorationSpecV2RepositoryConstraintError['reasonCode'],
  message: string,
): ExperimentFoundationExplorationSpecV2RepositoryConstraintError {
  return new ExperimentFoundationExplorationSpecV2RepositoryConstraintError(reasonCode, message);
}
