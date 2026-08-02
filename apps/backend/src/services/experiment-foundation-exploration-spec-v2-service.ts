import { Ajv, type ValidateFunction } from 'ajv';
import {
  experimentFoundationExplorationSpecV2CreateRevisionRequestSchema,
  type ExperimentFoundationExplorationSpecIdentityV2,
  type ExperimentFoundationExplorationSpecRevisionV2,
  type ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
  type ExperimentFoundationExplorationSpecV2CreateRevisionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';
import {
  serverExperimentFoundationExplorationSpecV2Id,
  serverHashExperimentFoundationExplorationSpecCommandV2,
  serverHashExperimentFoundationExplorationSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationExplorationSpecV2RepositoryConstraintError,
  type ExperimentFoundationExplorationSpecCommandReceiptV2Record,
  type ExperimentFoundationExplorationSpecV2Repository,
  type ExperimentFoundationExplorationSpecV2UnitOfWork,
} from '../repositories/experiment-foundation-exploration-spec-v2.repository.js';
import { nextExperimentV2Int32Sequence } from './experiment-v2-int32.js';

export interface ExperimentFoundationExplorationSpecV2ServiceOptions {
  enabled: () => boolean;
  now?: () => string;
  failpoint?: (point: 'after-revision' | 'before-commit') => void;
}

export class ExperimentFoundationExplorationSpecV2Service {
  private readonly now: () => string;
  private readonly validateRequest: ValidateFunction;

  constructor(
    private readonly repository: ExperimentFoundationExplorationSpecV2Repository,
    private readonly options: ExperimentFoundationExplorationSpecV2ServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.validateRequest = new Ajv({ allErrors: true, strict: false })
      .compile(experimentFoundationExplorationSpecV2CreateRevisionRequestSchema);
  }

  async createRevision(
    logicalId: string,
    request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
  ): Promise<ExperimentFoundationExplorationSpecV2CreateRevisionResponse> {
    this.assertEnabled();
    assertLogicalId(logicalId);
    if (!this.validateRequest(request)) {
      throw invalid('EXPLORATION_SPEC_COMMAND_INVALID', 'Exploration spec command is invalid.');
    }
    assertSemanticUniqueness(request);

    const contentHash = serverHashExperimentFoundationExplorationSpecV2(request.specification);
    const commandHash = serverHashExperimentFoundationExplorationSpecCommandV2({
      logical_id: logicalId,
      expected_state_version: request.expected_state_version,
      spec_content_hash: contentHash,
    });

    try {
      return await this.repository.runInTransaction(async (unitOfWork) => {
        const receiptReplay = await this.resolveReceiptReplay(
          unitOfWork,
          logicalId,
          request,
          contentHash,
          commandHash,
        );
        if (receiptReplay) return receiptReplay;

        await unitOfWork.lockLogicalId(logicalId);
        const current = await unitOfWork.findIdentity(logicalId);
        const existingRevision = current
          ? await unitOfWork.findRevisionByContentHash(current.spec_id, contentHash)
          : null;
        if (current && existingRevision) {
          await unitOfWork.insertCommandReceipt(createReceipt(
            request,
            logicalId,
            contentHash,
            commandHash,
            existingRevision.revision_id,
            this.now(),
          ));
          return response(current, existingRevision, true);
        }

        const now = this.now();
        const created = current
          ? await this.createNextRevision(unitOfWork, current, request, contentHash, now)
          : await this.createFirstRevision(unitOfWork, logicalId, request, contentHash, now);
        this.options.failpoint?.('after-revision');
        await unitOfWork.insertCommandReceipt(createReceipt(
          request,
          logicalId,
          contentHash,
          commandHash,
          created.revision.revision_id,
          now,
        ));
        this.options.failpoint?.('before-commit');
        return response(created.identity, created.revision, false);
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof ExperimentFoundationExplorationSpecV2RepositoryConstraintError) {
        throw conflict(error.reasonCode, error.message);
      }
      throw error;
    }
  }

  private async createFirstRevision(
    unitOfWork: ExperimentFoundationExplorationSpecV2UnitOfWork,
    logicalId: string,
    request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
    contentHash: string,
    now: string,
  ): Promise<{
    identity: ExperimentFoundationExplorationSpecIdentityV2;
    revision: ExperimentFoundationExplorationSpecRevisionV2;
  }> {
    if (request.expected_state_version !== 0) {
      throw conflict(
        'EXPLORATION_SPEC_STATE_CONFLICT',
        'A new exploration spec requires expected_state_version=0.',
      );
    }
    const specId = serverExperimentFoundationExplorationSpecV2Id('spec', {
      logical_id: logicalId,
    });
    const identity: ExperimentFoundationExplorationSpecIdentityV2 = {
      spec_id: specId,
      logical_id: logicalId,
      latest_revision: 1,
      state_version: 1,
      created_at: now,
      updated_at: now,
    };
    const revision = createRevision(identity, 1, request, contentHash, now);
    await unitOfWork.insertIdentity(identity);
    await unitOfWork.insertRevision(revision);
    return { identity, revision };
  }

  private async createNextRevision(
    unitOfWork: ExperimentFoundationExplorationSpecV2UnitOfWork,
    current: ExperimentFoundationExplorationSpecIdentityV2,
    request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
    contentHash: string,
    now: string,
  ): Promise<{
    identity: ExperimentFoundationExplorationSpecIdentityV2;
    revision: ExperimentFoundationExplorationSpecRevisionV2;
  }> {
    if (current.state_version !== request.expected_state_version) {
      throw conflict(
        'EXPLORATION_SPEC_STATE_CONFLICT',
        'Exploration spec state changed before revision creation.',
      );
    }
    const nextRevision = nextExperimentV2Int32Sequence(
      [current.latest_revision],
      'Exploration spec revision sequence',
      (message) => conflict('EXPLORATION_SPEC_STATE_CONFLICT', message),
    );
    const identity: ExperimentFoundationExplorationSpecIdentityV2 = {
      ...current,
      latest_revision: nextRevision,
      state_version: nextRevision,
      updated_at: now,
    };
    const advanced = await unitOfWork.compareAndSwapIdentity(
      current.logical_id,
      request.expected_state_version,
      identity,
    );
    if (!advanced) {
      throw conflict(
        'EXPLORATION_SPEC_STATE_CONFLICT',
        'Exploration spec state changed concurrently.',
      );
    }
    const revision = createRevision(identity, nextRevision, request, contentHash, now);
    await unitOfWork.insertRevision(revision);
    return { identity, revision };
  }

  private async resolveReceiptReplay(
    unitOfWork: ExperimentFoundationExplorationSpecV2UnitOfWork,
    logicalId: string,
    request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
    contentHash: string,
    commandHash: string,
  ): Promise<ExperimentFoundationExplorationSpecV2CreateRevisionResponse | null> {
    const receipt = await unitOfWork.findCommandReceipt(request.business_idempotency_key);
    if (!receipt) return null;
    if (
      receipt.command_hash !== commandHash
      || receipt.logical_id !== logicalId
      || receipt.expected_state_version !== request.expected_state_version
      || receipt.spec_content_hash !== contentHash
    ) {
      throw conflict(
        'EXPLORATION_SPEC_IDEMPOTENCY_CONFLICT',
        'Exploration spec idempotency key was reused with different input.',
      );
    }
    const revision = await unitOfWork.findRevisionById(receipt.spec_revision_id);
    const identity = await unitOfWork.findIdentity(logicalId);
    if (
      !identity
      || !revision
      || revision.spec_id !== identity.spec_id
      || revision.content_hash !== contentHash
    ) {
      throw conflict(
        'EXPLORATION_SPEC_REPLAY_DRIFT',
        'Exploration spec receipt no longer resolves to its exact revision.',
      );
    }
    return response(identity, revision, true);
  }

  private assertEnabled(): void {
    if (!this.options.enabled()) {
      throw conflict(
        'EF_V2_EXPLORATION_SPEC_DISABLED',
        'Experiment Foundation v2 exploration spec intake is disabled.',
      );
    }
  }
}

function createRevision(
  identity: ExperimentFoundationExplorationSpecIdentityV2,
  specRevision: number,
  request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
  contentHash: string,
  now: string,
): ExperimentFoundationExplorationSpecRevisionV2 {
  return {
    revision_id: serverExperimentFoundationExplorationSpecV2Id('revision', {
      spec_id: identity.spec_id,
      spec_revision: specRevision,
      content_hash: contentHash,
    }),
    spec_id: identity.spec_id,
    logical_id: identity.logical_id,
    spec_revision: specRevision,
    content_hash: contentHash,
    specification: structuredClone(request.specification),
    created_at: now,
  };
}

function createReceipt(
  request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
  logicalId: string,
  contentHash: string,
  commandHash: string,
  revisionId: string,
  now: string,
): ExperimentFoundationExplorationSpecCommandReceiptV2Record {
  return {
    receipt_id: serverExperimentFoundationExplorationSpecV2Id('receipt', {
      business_idempotency_key: request.business_idempotency_key,
    }),
    business_idempotency_key: request.business_idempotency_key,
    command_hash: commandHash,
    logical_id: logicalId,
    expected_state_version: request.expected_state_version,
    spec_content_hash: contentHash,
    spec_revision_id: revisionId,
    created_at: now,
  };
}

function response(
  identity: ExperimentFoundationExplorationSpecIdentityV2,
  revision: ExperimentFoundationExplorationSpecRevisionV2,
  replayed: boolean,
): ExperimentFoundationExplorationSpecV2CreateRevisionResponse {
  return {
    identity: structuredClone(identity),
    revision: structuredClone(revision),
    replayed,
  };
}

function assertLogicalId(logicalId: string): void {
  if (typeof logicalId !== 'string' || logicalId.length === 0) {
    throw invalid('EXPLORATION_SPEC_COMMAND_INVALID', 'Exploration spec logical id is invalid.');
  }
}

function assertSemanticUniqueness(
  request: ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
): void {
  const cellKeys = new Set<string>();
  for (const cell of request.specification.exact_cells) {
    if (cellKeys.has(cell.cell_key)) {
      throw invalid('EXPLORATION_SPEC_COMMAND_INVALID', 'Exact cell keys must be unique.');
    }
    cellKeys.add(cell.cell_key);
    const parameterNames = new Set<string>();
    for (const parameter of cell.parameters) {
      if (parameterNames.has(parameter.name)) {
        throw invalid('EXPLORATION_SPEC_COMMAND_INVALID', 'Cell parameter names must be unique.');
      }
      parameterNames.add(parameter.name);
    }
  }
  const dependencies = new Set<string>();
  for (const dependency of request.specification.work_order_revision.asset_dependencies) {
    const key = `${dependency.asset_type}\u0000${dependency.logical_id}\u0000${dependency.revision_id}`;
    if (dependencies.has(key)) {
      throw invalid('EXPLORATION_SPEC_COMMAND_INVALID', 'Asset dependencies must be unique.');
    }
    dependencies.add(key);
  }
}

function invalid(reasonCode: string, message: string): AppError {
  return new AppError(400, 'INVALID_PAYLOAD', message, { reason_code: reasonCode });
}

function conflict(reasonCode: string, message: string): AppError {
  return new AppError(409, 'VERSION_CONFLICT', message, { reason_code: reasonCode });
}
