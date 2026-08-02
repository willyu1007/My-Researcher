import {
  Prisma,
  type ExperimentFoundationExplorationSpecCommandReceiptV2 as ReceiptRow,
  type ExperimentFoundationExplorationSpecRevisionV2 as RevisionRow,
  type ExperimentFoundationExplorationSpecV2 as IdentityRow,
  type PrismaClient,
} from '@prisma/client';
import { Ajv, type ValidateFunction } from 'ajv';
import {
  experimentFoundationExplorationSpecContentV1Schema,
  type ExperimentFoundationExplorationSpecContentV1,
  type ExperimentFoundationExplorationSpecIdentityV2,
  type ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';
import {
  serverExperimentFoundationExplorationSpecV2Id,
  serverHashExperimentFoundationExplorationSpecCommandV2,
  serverHashExperimentFoundationExplorationSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationExplorationSpecV2RepositoryConstraintError,
  type ExperimentFoundationExplorationSpecCommandReceiptV2Record,
  type ExperimentFoundationExplorationSpecV2Repository,
  type ExperimentFoundationExplorationSpecV2UnitOfWork,
} from '../experiment-foundation-exploration-spec-v2.repository.js';

const validateStoredSpecification: ValidateFunction<ExperimentFoundationExplorationSpecContentV1> =
  new Ajv({ allErrors: true, strict: false })
    .compile(experimentFoundationExplorationSpecContentV1Schema);

export class PrismaExperimentFoundationExplorationSpecV2Repository
implements ExperimentFoundationExplorationSpecV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationExplorationSpecV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => (
      operation(new PrismaExplorationSpecUnitOfWork(transaction))
    ));
  }

  async findExactRevision(
    specId: string,
    specRevision: number,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null> {
    return this.prisma.$transaction(async (transaction) => {
      const unitOfWork = new PrismaExplorationSpecUnitOfWork(transaction);
      const row = await transaction.experimentFoundationExplorationSpecRevisionV2.findFirst({
        where: { specId, specRevision },
      });
      if (!row) return null;
      const revision = mapRevision(row);
      const identity = await unitOfWork.findIdentity(revision.logical_id);
      if (
        !identity
        || identity.spec_id !== specId
        || identity.latest_revision < specRevision
      ) {
        throw constraint(
          'EXPLORATION_SPEC_REVISION_CONFLICT',
          `Exploration spec revision no longer matches its identity: ${row.id}`,
        );
      }
      return revision;
    });
  }
}

class PrismaExplorationSpecUnitOfWork
implements ExperimentFoundationExplorationSpecV2UnitOfWork {
  constructor(private readonly transaction: Prisma.TransactionClient) {}

  async lockLogicalId(logicalId: string): Promise<void> {
    const rows = await this.transaction.$queryRaw<Array<{ locked: number }>>`
      SELECT 1::int AS locked
      FROM (
        SELECT pg_advisory_xact_lock(hashtextextended(${logicalId}, 0))
      ) AS exploration_spec_lock
    `;
    if (rows.length !== 1 || rows[0]?.locked !== 1) {
      throw constraint(
        'EXPLORATION_SPEC_IDENTITY_CONFLICT',
        `Exploration spec lock could not be acquired: ${logicalId}`,
      );
    }
  }

  async findIdentity(
    logicalId: string,
  ): Promise<ExperimentFoundationExplorationSpecIdentityV2 | null> {
    const row = await this.transaction.experimentFoundationExplorationSpecV2.findUnique({
      where: { logicalId },
    });
    return row ? mapIdentity(row) : null;
  }

  async insertIdentity(identity: ExperimentFoundationExplorationSpecIdentityV2): Promise<void> {
    try {
      await this.transaction.experimentFoundationExplorationSpecV2.create({
        data: {
          id: identity.spec_id,
          logicalId: identity.logical_id,
          latestRevision: identity.latest_revision,
          stateVersion: identity.state_version,
          createdAt: new Date(identity.created_at),
          updatedAt: new Date(identity.updated_at),
        },
      });
    } catch (error) {
      throw mapConstraint(
        error,
        'EXPLORATION_SPEC_IDENTITY_CONFLICT',
        `Exploration spec identity conflicts: ${identity.logical_id}`,
      );
    }
  }

  async compareAndSwapIdentity(
    logicalId: string,
    expectedStateVersion: number,
    next: ExperimentFoundationExplorationSpecIdentityV2,
  ): Promise<boolean> {
    const result = await this.transaction.experimentFoundationExplorationSpecV2.updateMany({
      where: { logicalId, stateVersion: expectedStateVersion },
      data: {
        latestRevision: next.latest_revision,
        stateVersion: next.state_version,
        updatedAt: new Date(next.updated_at),
      },
    });
    return result.count === 1;
  }

  async findRevisionById(
    revisionId: string,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null> {
    const row = await this.transaction.experimentFoundationExplorationSpecRevisionV2.findUnique({
      where: { id: revisionId },
    });
    return row ? mapRevision(row) : null;
  }

  async findRevisionByContentHash(
    specId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExplorationSpecRevisionV2 | null> {
    const row = await this.transaction.experimentFoundationExplorationSpecRevisionV2.findFirst({
      where: { specId, contentHash },
    });
    return row ? mapRevision(row) : null;
  }

  async insertRevision(revision: ExperimentFoundationExplorationSpecRevisionV2): Promise<void> {
    try {
      await this.transaction.experimentFoundationExplorationSpecRevisionV2.create({
        data: {
          id: revision.revision_id,
          specId: revision.spec_id,
          logicalId: revision.logical_id,
          specRevision: revision.spec_revision,
          schemaVersion: revision.specification.schema_version,
          specJson: structuredClone(revision.specification) as unknown as Prisma.InputJsonValue,
          contentHash: revision.content_hash,
          createdAt: new Date(revision.created_at),
        },
      });
    } catch (error) {
      throw mapConstraint(
        error,
        'EXPLORATION_SPEC_REVISION_CONFLICT',
        `Exploration spec revision conflicts: ${revision.revision_id}`,
      );
    }
  }

  async findCommandReceipt(
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExplorationSpecCommandReceiptV2Record | null> {
    const row = await this.transaction.experimentFoundationExplorationSpecCommandReceiptV2
      .findUnique({ where: { businessIdempotencyKey } });
    if (!row) return null;
    const revision = await this.findRevisionById(row.specRevisionId);
    const expectedReceiptId = serverExperimentFoundationExplorationSpecV2Id('receipt', {
      business_idempotency_key: row.businessIdempotencyKey,
    });
    const expectedCommandHash = serverHashExperimentFoundationExplorationSpecCommandV2({
      logical_id: row.logicalId,
      expected_state_version: row.expectedStateVersion,
      spec_content_hash: row.specContentHash,
    });
    if (
      !revision
      || row.id !== expectedReceiptId
      || row.commandHash !== expectedCommandHash
      || row.logicalId !== revision.logical_id
      || row.specContentHash !== revision.content_hash
    ) {
      throw constraint(
        'EXPLORATION_SPEC_IDEMPOTENCY_CONFLICT',
        `Exploration spec receipt no longer matches its exact revision: ${row.id}`,
      );
    }
    return mapReceipt(row);
  }

  async insertCommandReceipt(
    receipt: ExperimentFoundationExplorationSpecCommandReceiptV2Record,
  ): Promise<void> {
    try {
      await this.transaction.experimentFoundationExplorationSpecCommandReceiptV2.create({
        data: {
          id: receipt.receipt_id,
          businessIdempotencyKey: receipt.business_idempotency_key,
          commandHash: receipt.command_hash,
          logicalId: receipt.logical_id,
          expectedStateVersion: receipt.expected_state_version,
          specContentHash: receipt.spec_content_hash,
          specRevisionId: receipt.spec_revision_id,
          createdAt: new Date(receipt.created_at),
        },
      });
    } catch (error) {
      throw mapConstraint(
        error,
        'EXPLORATION_SPEC_IDEMPOTENCY_CONFLICT',
        `Exploration spec receipt conflicts: ${receipt.business_idempotency_key}`,
      );
    }
  }
}

function mapIdentity(row: IdentityRow): ExperimentFoundationExplorationSpecIdentityV2 {
  const expectedId = serverExperimentFoundationExplorationSpecV2Id('spec', {
    logical_id: row.logicalId,
  });
  if (
    row.id !== expectedId
    || row.latestRevision < 1
    || row.stateVersion !== row.latestRevision
  ) {
    throw constraint(
      'EXPLORATION_SPEC_IDENTITY_CONFLICT',
      `Exploration spec identity integrity has drifted: ${row.id}`,
    );
  }
  return {
    spec_id: row.id,
    logical_id: row.logicalId,
    latest_revision: row.latestRevision,
    state_version: row.stateVersion,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapRevision(row: RevisionRow): ExperimentFoundationExplorationSpecRevisionV2 {
  let specification: ExperimentFoundationExplorationSpecContentV1;
  let expectedHash: string;
  try {
    const storedSpecification: unknown = structuredClone(row.specJson);
    if (!validateStoredSpecification(storedSpecification)) {
      throw new Error('stored exploration specification failed schema validation');
    }
    specification = storedSpecification;
    expectedHash = serverHashExperimentFoundationExplorationSpecV2(specification);
  } catch {
    throw constraint(
      'EXPLORATION_SPEC_REVISION_CONFLICT',
      `Exploration spec revision content is unreadable: ${row.id}`,
    );
  }
  const expectedSpecId = serverExperimentFoundationExplorationSpecV2Id('spec', {
    logical_id: row.logicalId,
  });
  const expectedId = serverExperimentFoundationExplorationSpecV2Id('revision', {
    spec_id: row.specId,
    spec_revision: row.specRevision,
    content_hash: expectedHash,
  });
  if (
    row.schemaVersion !== 'v1'
    || specification.schema_version !== row.schemaVersion
    || row.specRevision < 1
    || row.specId !== expectedSpecId
    || row.contentHash !== expectedHash
    || row.id !== expectedId
  ) {
    throw constraint(
      'EXPLORATION_SPEC_REVISION_CONFLICT',
      `Exploration spec revision integrity has drifted: ${row.id}`,
    );
  }
  return {
    revision_id: row.id,
    spec_id: row.specId,
    logical_id: row.logicalId,
    spec_revision: row.specRevision,
    content_hash: row.contentHash,
    specification,
    created_at: row.createdAt.toISOString(),
  };
}

function mapReceipt(row: ReceiptRow): ExperimentFoundationExplorationSpecCommandReceiptV2Record {
  return {
    receipt_id: row.id,
    business_idempotency_key: row.businessIdempotencyKey,
    command_hash: row.commandHash,
    logical_id: row.logicalId,
    expected_state_version: row.expectedStateVersion,
    spec_content_hash: row.specContentHash,
    spec_revision_id: row.specRevisionId,
    created_at: row.createdAt.toISOString(),
  };
}

function mapConstraint(
  error: unknown,
  reasonCode: ExperimentFoundationExplorationSpecV2RepositoryConstraintError['reasonCode'],
  message: string,
): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2002' || error.code === 'P2003')
  ) {
    return constraint(reasonCode, message);
  }
  return error;
}

function constraint(
  reasonCode: ExperimentFoundationExplorationSpecV2RepositoryConstraintError['reasonCode'],
  message: string,
): ExperimentFoundationExplorationSpecV2RepositoryConstraintError {
  return new ExperimentFoundationExplorationSpecV2RepositoryConstraintError(reasonCode, message);
}
