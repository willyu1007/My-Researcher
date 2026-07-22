import { randomUUID } from 'node:crypto';

import type {
  CloseValidationCycleV2Request,
  CloseValidationCycleV2Response,
  ValidationCycleClosedV1,
  ValidationCycleClosureV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2CycleClosure,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../errors/app-error.js';
import {
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationStoredValidationCycleClosureV2,
  type PaperImplementationValidationCycleClosableStatus,
  type PaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationValidationCycleClosureV2Transaction,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
  PaperImplementationCycleReadinessV2ServiceError,
} from './paper-implementation-cycle-readiness-v2-service.js';

export interface PaperImplementationValidationCycleClosureV2ServiceOptions {
  repository: PaperImplementationValidationCycleClosureV2Repository;
  enabled: () => boolean;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export class PaperImplementationValidationCycleClosureV2Service {
  private readonly repository: PaperImplementationValidationCycleClosureV2Repository;
  private readonly enabled: () => boolean;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: PaperImplementationValidationCycleClosureV2ServiceOptions) {
    this.repository = options.repository;
    this.enabled = options.enabled;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async close(request: CloseValidationCycleV2Request): Promise<CloseValidationCycleV2Response> {
    if (!this.enabled()) {
      throw closureDisabled('ValidationCycle v2 closure is disabled.');
    }
    if (request.closure_kind === 'scientific_evidence_assessed') {
      throw closureDisabled(
        'Scientific-evidence ValidationCycle closure is a later Pack C increment and is not implemented.',
      );
    }
    assertControlOnlyRequest(request);

    try {
      return await this.repository.withTransaction((transaction) => (
        this.closeInTransaction(transaction, request)
      ));
    } catch (error) {
      if (error instanceof PaperImplementationCycleReadinessV2ServiceError) {
        if (error.reasonCode === 'VALIDATION_CYCLE_NOT_FOUND') {
          throw new AppError(404, 'NOT_FOUND', error.message, {
            reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT',
          });
        }
        throw closureError('CYCLE_CLOSURE_SCOPE_DRIFT', error.message);
      }
      if (!(error instanceof PaperImplementationValidationCycleClosureV2RepositoryError)) {
        throw error;
      }
      if (
        error.reasonCode === 'CYCLE_ALREADY_CLOSED'
        || error.reasonCode === 'CLOSURE_IDEMPOTENCY_CONFLICT'
      ) {
        return this.resolveConcurrentReplay(request);
      }
      if (error.reasonCode === 'CLOSURE_CONCURRENT_CONFLICT') {
        throw closureError(
          'CYCLE_CLOSURE_SCOPE_DRIFT',
          'ValidationCycle closure scope changed during the closure transaction.',
        );
      }
      throw error;
    }
  }

  private async closeInTransaction(
    transaction: PaperImplementationValidationCycleClosureV2Transaction,
    request: CloseValidationCycleV2Request,
  ): Promise<CloseValidationCycleV2Response> {
    const readiness = await new PaperImplementationCycleReadinessV2Service({
      repository: transaction,
    }).evaluate(request.validation_cycle_id);

    const scopeBlocker = readiness.ordered_blockers.find((blocker) => (
      blocker.code === 'BRANCH_HEAD_NOT_FROZEN'
      || blocker.code === 'CYCLE_ACTIVE_REAL_ATTEMPT'
    ));
    if (scopeBlocker) {
      throw closureError(
        scopeBlocker.code,
        scopeBlocker.code === 'BRANCH_HEAD_NOT_FROZEN'
          ? 'Every admitted branch must have its exact frozen and acknowledged current head.'
          : 'A non-terminal real-provider Attempt blocks ValidationCycle closure.',
      );
    }

    const existing = await transaction.findStoredClosureByCycle(request.validation_cycle_id);
    if (existing) {
      return replayOrAlreadyClosed(existing, request);
    }
    const idempotencyReplay = await transaction.findStoredClosureByIdempotencyKey(
      request.idempotency_key,
    );
    if (idempotencyReplay) {
      return replayOrAlreadyClosed(idempotencyReplay, request);
    }

    if (
      request.expected_cycle_version !== readiness.watermark.expected_cycle_version
      || request.expected_closure_input_hash !== readiness.watermark.closure_input_hash
    ) {
      throw closureError(
        'CYCLE_CLOSURE_SCOPE_DRIFT',
        'ValidationCycle closure expectation does not match the transactionally rebuilt watermark.',
      );
    }
    if (readiness.eligible_run_evidence_unit_count !== 0) {
      throw closureError(
        'CLOSURE_PROPOSAL_STALE',
        'Control-only closure cannot discard eligible scientific evidence; a scientific proposal is required.',
      );
    }

    const cycle = await transaction.findValidationCycle(request.validation_cycle_id);
    if (!cycle) {
      throw new AppError(404, 'NOT_FOUND', 'ValidationCycle does not exist.', {
        reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT',
      });
    }
    if (!isClosableProductCycleStatus(cycle.lifecycle_status)) {
      if (isTerminalProductCycleStatus(cycle.lifecycle_status)) {
        throw closureError(
          'CYCLE_ALREADY_CLOSED',
          'ValidationCycle product row is already terminal.',
        );
      }
      throw closureError(
        'CYCLE_CLOSURE_SCOPE_DRIFT',
        'ValidationCycle product row is not in a closable lifecycle state.',
      );
    }
    const createdAt = this.now();
    const closureId = this.idFactory('pi_validation_cycle_closure_v2');
    const closureWithoutHash: Omit<ValidationCycleClosureV2, 'closure_snapshot_hash'> = {
      closure_id: closureId,
      schema_version: 'v1',
      validation_cycle_id: request.validation_cycle_id,
      cycle_version_at_closure: readiness.watermark.expected_cycle_version,
      closure_kind: 'control_flow_validated_no_paper_evidence',
      scientific_disposition: null,
      selected_exit_key: null,
      accepted_proposal_id: null,
      accepted_proposal_hash: null,
      closure_watermark: readiness.watermark,
    };
    const closure: ValidationCycleClosureV2 = {
      ...closureWithoutHash,
      closure_snapshot_hash: serverHashPaperImplementationV2CycleClosure(closureWithoutHash),
    };
    const payload: ValidationCycleClosedV1 = {
      event_schema: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
      validation_cycle_id: closure.validation_cycle_id,
      closure_id: closure.closure_id,
      closure_snapshot_hash: closure.closure_snapshot_hash,
      closure_kind: closure.closure_kind,
      scientific_disposition: closure.scientific_disposition,
      closure_input_hash: closure.closure_watermark.closure_input_hash,
    };
    const event = {
      event_id: this.idFactory('pi_validation_cycle_closed_event_v1'),
      event_type: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
      schema_version: 'v1' as const,
      producer_domain: 'PaperImplementation' as const,
      occurred_at: createdAt,
      correlation_id: closure.closure_id,
      causation_id: closure.closure_watermark.closure_input_hash,
      business_idempotency_key: request.idempotency_key,
      implementation_project_id: cycle.implementation_project_id,
      validation_cycle_id: closure.validation_cycle_id,
      branch_id: `validation-cycle:${closure.validation_cycle_id}`,
      branch_key: 'validation-cycle-closure-v2',
      work_order_revision_id: closure.closure_id,
      work_order_revision_hash: closure.closure_snapshot_hash,
      branch_revision_sequence: closure.cycle_version_at_closure + 1,
      cell_plan_hash: closure.closure_watermark.closure_input_hash,
      approved_plan_hash: closure.closure_snapshot_hash,
      payload_hash: serverHashExperimentV2EventPayload(
        PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE,
        'v1',
        payload,
      ),
      payload,
    };
    await transaction.completeProductValidationCycle({
      validation_cycle_id: closure.validation_cycle_id,
      expected_lifecycle_status: cycle.lifecycle_status,
      lifecycle_status: 'completed',
      execution_status: 'completed',
      completed_at: createdAt,
    });
    const stored = await transaction.commitClosure({
      stored_closure: {
        implementation_project_id: cycle.implementation_project_id,
        closure,
        idempotency_key: request.idempotency_key,
        created_at: createdAt,
      },
      outbox: {
        outbox_id: this.idFactory('pi_validation_cycle_closure_outbox_v2'),
        aggregate_transition_key: `${closure.closure_id}:closed@v1`,
        event,
        event_envelope_hash: serverHashExperimentV2EventEnvelope(event),
        created_at: createdAt,
      },
    });
    return { closure: stored.closure };
  }

  private async resolveConcurrentReplay(
    request: CloseValidationCycleV2Request,
  ): Promise<CloseValidationCycleV2Response> {
    return this.repository.withTransaction(async (transaction) => {
      const stored = await transaction.findStoredClosureByCycle(request.validation_cycle_id)
        ?? await transaction.findStoredClosureByIdempotencyKey(request.idempotency_key);
      if (stored) {
        return replayOrAlreadyClosed(stored, request);
      }
      throw closureError(
        'CYCLE_ALREADY_CLOSED',
        'ValidationCycle closure authority conflicted with another committed closure.',
      );
    });
  }
}

function isClosableProductCycleStatus(
  status: string,
): status is PaperImplementationValidationCycleClosableStatus {
  return status === 'admitted' || status === 'running' || status === 'interpreting';
}

function isTerminalProductCycleStatus(status: string): boolean {
  return status === 'completed' || status === 'aborted' || status === 'superseded';
}

function assertControlOnlyRequest(request: CloseValidationCycleV2Request): void {
  if (
    request.accepted_proposal_id !== null
    || request.expected_proposal_hash !== null
    || request.corrected_scientific_disposition !== null
  ) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      'Control-only closure requires null proposal, proposal hash, and corrected disposition.',
      { reason_code: 'CYCLE_CLOSURE_SCOPE_DRIFT' },
    );
  }
}

function replayOrAlreadyClosed(
  stored: PaperImplementationStoredValidationCycleClosureV2,
  request: CloseValidationCycleV2Request,
): CloseValidationCycleV2Response {
  if (
    stored.closure.validation_cycle_id === request.validation_cycle_id
    && stored.idempotency_key === request.idempotency_key
    && stored.closure.closure_watermark.closure_input_hash
      === request.expected_closure_input_hash
  ) {
    return { closure: stored.closure };
  }
  throw closureError(
    'CYCLE_ALREADY_CLOSED',
    'ValidationCycle already has an immutable v2 closure.',
  );
}

function closureDisabled(message: string): AppError {
  return new AppError(409, 'GATE_CONSTRAINT_FAILED', message, {
    reason_code: 'PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED',
  });
}

function closureError(
  reasonCode:
    | 'BRANCH_HEAD_NOT_FROZEN'
    | 'CYCLE_ACTIVE_REAL_ATTEMPT'
    | 'CYCLE_CLOSURE_SCOPE_DRIFT'
    | 'CYCLE_ALREADY_CLOSED'
    | 'CLOSURE_PROPOSAL_STALE',
  message: string,
): AppError {
  return new AppError(409, 'GATE_CONSTRAINT_FAILED', message, {
    reason_code: reasonCode,
  });
}
