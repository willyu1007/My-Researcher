import { randomUUID } from 'node:crypto';

import type {
  BranchHeadAdvancedEventV1,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ExperimentFoundationExperimentSpineV2Repository,
  ExperimentV2RelayClaim,
  PaperImplementationExperimentSpineV2Repository,
} from '../repositories/experiment-spine-v2.repository.js';

export interface ExperimentV2WorkOrderRevisionAdmittedConsumer {
  consume(event: WorkOrderRevisionAdmittedEventV1): Promise<unknown>;
}

export interface ExperimentV2RunManifestFrozenConsumer {
  consume(event: RunManifestFrozenEventV1): Promise<unknown>;
}

export interface ExperimentV2BranchHeadAdvancedConsumer {
  consume(event: BranchHeadAdvancedEventV1): Promise<unknown>;
}

export interface ExperimentV2IntegrationRelayServiceOptions {
  paperImplementationRepository: PaperImplementationExperimentSpineV2Repository;
  experimentFoundationRepository: ExperimentFoundationExperimentSpineV2Repository;
  materializationConsumer: ExperimentV2WorkOrderRevisionAdmittedConsumer;
  headConsumer: ExperimentV2RunManifestFrozenConsumer;
  acknowledgementConsumer: ExperimentV2BranchHeadAdvancedConsumer;
  workerId?: string;
  now?: () => string;
  leaseDurationMs?: number;
  retryDelayMs?: number;
}

export interface ExperimentV2RelayDrainOptions {
  limit_per_domain?: number;
}

export interface ExperimentV2RelayFailure {
  owner_domain: ExperimentV2RelayClaim['owner_domain'];
  outbox_id: string;
  event_id: string;
  event_type: string;
  error_code: string;
  disposition: 'released_retry' | 'terminal';
  release_error_code: string | null;
}

export interface ExperimentV2RelayDrainOutcome {
  claimed: number;
  delivered: number;
  released: number;
  terminalized: number;
  failures: ExperimentV2RelayFailure[];
}

export interface ExperimentV2RelayDrainUntilIdleOptions extends ExperimentV2RelayDrainOptions {
  max_passes?: number;
}

export interface ExperimentV2RelayDrainUntilIdleOutcome extends ExperimentV2RelayDrainOutcome {
  passes: number;
  idle: boolean;
}

function addMilliseconds(timestamp: string, milliseconds: number): string {
  return new Date(new Date(timestamp).getTime() + milliseconds).toISOString();
}

function errorCode(error: unknown): string {
  if (error instanceof AppError) {
    const reasonCode = error.details?.reason_code;
    return typeof reasonCode === 'string' ? reasonCode : error.errorCode;
  }
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return 'INTEGRATION_RELAY_FAILURE';
}

function isTerminalIntegrationError(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    // Unknown errors include infrastructure failures and remain retryable.
    return false;
  }
  return error.details?.reason_code !== 'INTEGRATION_PREREQUISITE_NOT_READY';
}

export class ExperimentV2IntegrationRelayService {
  private readonly paperImplementationRepository: PaperImplementationExperimentSpineV2Repository;
  private readonly experimentFoundationRepository: ExperimentFoundationExperimentSpineV2Repository;
  private readonly materializationConsumer: ExperimentV2WorkOrderRevisionAdmittedConsumer;
  private readonly headConsumer: ExperimentV2RunManifestFrozenConsumer;
  private readonly acknowledgementConsumer: ExperimentV2BranchHeadAdvancedConsumer;
  private readonly workerId: string;
  private readonly now: () => string;
  private readonly leaseDurationMs: number;
  private readonly retryDelayMs: number;

  constructor(options: ExperimentV2IntegrationRelayServiceOptions) {
    this.paperImplementationRepository = options.paperImplementationRepository;
    this.experimentFoundationRepository = options.experimentFoundationRepository;
    this.materializationConsumer = options.materializationConsumer;
    this.headConsumer = options.headConsumer;
    this.acknowledgementConsumer = options.acknowledgementConsumer;
    this.workerId = options.workerId ?? `experiment-v2-relay-${randomUUID()}`;
    this.now = options.now ?? (() => new Date().toISOString());
    this.leaseDurationMs = options.leaseDurationMs ?? 30_000;
    this.retryDelayMs = options.retryDelayMs ?? 1_000;
  }

  async drainOnce(options: ExperimentV2RelayDrainOptions = {}): Promise<ExperimentV2RelayDrainOutcome> {
    const claimedAt = this.now();
    const limit = Math.max(1, options.limit_per_domain ?? 100);
    const claimInput = {
      lease_owner: this.workerId,
      claimed_at: claimedAt,
      lease_expires_at: addMilliseconds(claimedAt, this.leaseDurationMs),
      limit,
    };
    const piClaims = await this.paperImplementationRepository.claimOutbox(claimInput);
    const efClaims = await this.experimentFoundationRepository.claimOutbox(claimInput);
    const claims = [...piClaims, ...efClaims];
    const outcome: ExperimentV2RelayDrainOutcome = {
      claimed: claims.length,
      delivered: 0,
      released: 0,
      terminalized: 0,
      failures: [],
    };

    for (const claim of claims) {
      const repository = claim.owner_domain === 'PaperImplementation'
        ? this.paperImplementationRepository
        : this.experimentFoundationRepository;
      try {
        await this.deliver(claim);
        // The consumer's domain commit has completed before this marker write.
        await repository.markOutboxDelivered(claim.outbox_id, claim.lease_owner, this.now());
        outcome.delivered += 1;
      } catch (error) {
        let releaseErrorCode: string | null = null;
        let disposition: ExperimentV2RelayFailure['disposition'] = 'released_retry';
        const failedAt = this.now();
        if (isTerminalIntegrationError(error)) {
          try {
            await repository.markOutboxTerminal({
              outbox_id: claim.outbox_id,
              lease_owner: claim.lease_owner,
              error_code: errorCode(error),
              terminal_at: failedAt,
            });
            disposition = 'terminal';
            outcome.terminalized += 1;
          } catch (terminalError) {
            releaseErrorCode = errorCode(terminalError);
          }
        }
        if (disposition !== 'terminal') {
          try {
            await repository.releaseOutbox({
              outbox_id: claim.outbox_id,
              lease_owner: claim.lease_owner,
              error_code: errorCode(error),
              next_attempt_at: addMilliseconds(failedAt, this.retryDelayMs),
              released_at: failedAt,
            });
            outcome.released += 1;
          } catch (releaseError) {
            releaseErrorCode = errorCode(releaseError);
          }
        }
        outcome.failures.push({
          owner_domain: claim.owner_domain,
          outbox_id: claim.outbox_id,
          event_id: claim.event.event_id,
          event_type: claim.event.event_type,
          error_code: errorCode(error),
          disposition,
          release_error_code: releaseErrorCode,
        });
      }
    }
    return outcome;
  }

  async drainUntilIdle(
    options: ExperimentV2RelayDrainUntilIdleOptions = {},
  ): Promise<ExperimentV2RelayDrainUntilIdleOutcome> {
    const maxPasses = Math.max(1, options.max_passes ?? 100);
    const aggregate: ExperimentV2RelayDrainUntilIdleOutcome = {
      claimed: 0,
      delivered: 0,
      released: 0,
      terminalized: 0,
      failures: [],
      passes: 0,
      idle: false,
    };
    // Deliberately no admission capability check: committed sagas must drain.
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const outcome = await this.drainOnce(options);
      aggregate.passes += 1;
      aggregate.claimed += outcome.claimed;
      aggregate.delivered += outcome.delivered;
      aggregate.released += outcome.released;
      aggregate.terminalized += outcome.terminalized;
      aggregate.failures.push(...outcome.failures);
      if (outcome.claimed === 0) {
        aggregate.idle = true;
        return aggregate;
      }
    }
    return aggregate;
  }

  private async deliver(claim: ExperimentV2RelayClaim): Promise<void> {
    if (
      claim.owner_domain === 'PaperImplementation'
      && claim.event.event_type === 'WorkOrderRevisionAdmitted'
    ) {
      await this.materializationConsumer.consume(claim.event);
      return;
    }
    if (
      claim.owner_domain === 'ExperimentFoundation'
      && claim.event.event_type === 'RunManifestFrozen'
    ) {
      await this.headConsumer.consume(claim.event);
      return;
    }
    if (
      claim.owner_domain === 'PaperImplementation'
      && claim.event.event_type === 'BranchHeadAdvanced'
    ) {
      await this.acknowledgementConsumer.consume(claim.event);
      return;
    }
    throw new AppError(400, 'INVALID_PAYLOAD', 'Unsupported owner/event relay route.', {
      reason_code: 'INTEGRATION_EVENT_TYPE_UNSUPPORTED',
    });
  }
}
