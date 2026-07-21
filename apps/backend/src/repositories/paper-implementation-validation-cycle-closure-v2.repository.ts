import type {
  ValidationCycleClosedV1,
  ValidationCycleClosureV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import type {
  PaperImplementationValidationCycleStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationV2CycleClosure,
  serverHashPaperImplementationV2ClosureWatermark,
  type ExperimentV2EventEnvelopeForHash,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  PaperImplementationCycleReadinessV2Repository,
} from './paper-implementation-cycle-readiness-v2.repository.js';
import type {
  PaperImplementationValidationCycleClosureV2Lookup,
} from './paper-implementation-validation-cycle-closure-v2-lookup.js';

export const PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE =
  'ValidationCycleClosed@v1' as const;

export interface PaperImplementationValidationCycleClosedEventV1
extends ExperimentV2EventEnvelopeForHash<ValidationCycleClosedV1> {
  event_type: typeof PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE;
  schema_version: 'v1';
  producer_domain: 'PaperImplementation';
}

export interface PaperImplementationStoredValidationCycleClosureV2 {
  implementation_project_id: string;
  closure: ValidationCycleClosureV2;
  idempotency_key: string;
  created_at: string;
}

export interface PaperImplementationValidationCycleClosureOutboxV2 {
  outbox_id: string;
  aggregate_transition_key: string;
  event: PaperImplementationValidationCycleClosedEventV1;
  event_envelope_hash: string;
  created_at: string;
}

export interface PaperImplementationValidationCycleClosureCommitV2 {
  stored_closure: PaperImplementationStoredValidationCycleClosureV2;
  outbox: PaperImplementationValidationCycleClosureOutboxV2;
}

export type PaperImplementationValidationCycleClosableStatus = Extract<
  PaperImplementationValidationCycleStatus,
  'admitted' | 'running' | 'interpreting'
>;

export interface PaperImplementationValidationCycleProductCompletionV2 {
  validation_cycle_id: string;
  expected_lifecycle_status: PaperImplementationValidationCycleClosableStatus;
  lifecycle_status: 'completed';
  execution_status: 'completed';
  completed_at: string;
}

export type PaperImplementationValidationCycleClosureV2RepositoryReasonCode =
  | 'CYCLE_ALREADY_CLOSED'
  | 'CLOSURE_IDEMPOTENCY_CONFLICT'
  | 'CLOSURE_CONCURRENT_CONFLICT'
  | 'CLOSURE_INVARIANT_INVALID';

export class PaperImplementationValidationCycleClosureV2RepositoryError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationValidationCycleClosureV2RepositoryReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationValidationCycleClosureV2RepositoryError';
  }
}

export interface PaperImplementationValidationCycleClosureV2Transaction
extends PaperImplementationCycleReadinessV2Repository {
  findStoredClosureByCycle(
    validationCycleId: string,
  ): Promise<PaperImplementationStoredValidationCycleClosureV2 | null>;

  findStoredClosureByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaperImplementationStoredValidationCycleClosureV2 | null>;

  completeProductValidationCycle(
    input: PaperImplementationValidationCycleProductCompletionV2,
  ): Promise<void>;

  commitClosure(
    input: PaperImplementationValidationCycleClosureCommitV2,
  ): Promise<PaperImplementationStoredValidationCycleClosureV2>;
}

export interface PaperImplementationValidationCycleClosureV2Repository
extends PaperImplementationValidationCycleClosureV2Lookup {
  withTransaction<T>(
    operation: (transaction: PaperImplementationValidationCycleClosureV2Transaction) => Promise<T>,
  ): Promise<T>;
}

export interface InMemoryPaperImplementationValidationCycleClosureV2RepositoryOptions {
  readinessRepository: PaperImplementationCycleReadinessV2Repository;
  closures?: readonly PaperImplementationStoredValidationCycleClosureV2[];
  outboxes?: readonly PaperImplementationValidationCycleClosureOutboxV2[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryPaperImplementationValidationCycleClosureV2Repository
implements PaperImplementationValidationCycleClosureV2Repository {
  private closures: PaperImplementationStoredValidationCycleClosureV2[];
  private outboxes: PaperImplementationValidationCycleClosureOutboxV2[];
  private productCycleCompletions = new Map<
    string,
    PaperImplementationValidationCycleProductCompletionV2
  >();
  private readonly readinessRepository: PaperImplementationCycleReadinessV2Repository;

  constructor(options: InMemoryPaperImplementationValidationCycleClosureV2RepositoryOptions) {
    this.readinessRepository = options.readinessRepository;
    this.closures = clone([...(options.closures ?? [])]);
    this.outboxes = clone([...(options.outboxes ?? [])]);
  }

  async isCycleClosed(validationCycleId: string): Promise<boolean> {
    return this.closures.some((stored) => (
      stored.closure.validation_cycle_id === validationCycleId
    ));
  }

  async withTransaction<T>(
    operation: (transaction: PaperImplementationValidationCycleClosureV2Transaction) => Promise<T>,
  ): Promise<T> {
    const closureSnapshot = clone(this.closures);
    const outboxSnapshot = clone(this.outboxes);
    const productCycleCompletionSnapshot = clone([...this.productCycleCompletions.entries()]);
    const transaction = this.createTransaction();
    try {
      return await operation(transaction);
    } catch (error) {
      this.closures = closureSnapshot;
      this.outboxes = outboxSnapshot;
      this.productCycleCompletions = new Map(productCycleCompletionSnapshot);
      throw error;
    }
  }

  snapshot(): {
    closures: PaperImplementationStoredValidationCycleClosureV2[];
    outboxes: PaperImplementationValidationCycleClosureOutboxV2[];
  } {
    return clone({ closures: this.closures, outboxes: this.outboxes });
  }

  productCycleCompletion(
    validationCycleId: string,
  ): PaperImplementationValidationCycleProductCompletionV2 | null {
    return clone(this.productCycleCompletions.get(validationCycleId) ?? null);
  }

  private createTransaction(): PaperImplementationValidationCycleClosureV2Transaction {
    return {
      findValidationCycle: async (validationCycleId) => {
        const cycle = await this.readinessRepository.findValidationCycle(validationCycleId);
        const completion = this.productCycleCompletions.get(validationCycleId);
        return cycle && completion
          ? { ...cycle, lifecycle_status: completion.lifecycle_status }
          : cycle;
      },
      listAdmittedBranches: (validationCycleId) => (
        this.readinessRepository.listAdmittedBranches(validationCycleId)
      ),
      listHeadRunAccounting: (references) => (
        this.readinessRepository.listHeadRunAccounting(references)
      ),
      listCycleActiveRealAttempts: (validationCycleId) => (
        this.readinessRepository.listCycleActiveRealAttempts(validationCycleId)
      ),
      listEligibleRunEvidenceUnits: (validationCycleId) => (
        this.readinessRepository.listEligibleRunEvidenceUnits(validationCycleId)
      ),
      findCycleClosure: async (validationCycleId) => {
        const stored = this.closures.find((candidate) => (
          candidate.closure.validation_cycle_id === validationCycleId
        ));
        if (stored) {
          return {
            closure_id: stored.closure.closure_id,
            validation_cycle_id: stored.closure.validation_cycle_id,
            cycle_version_at_closure: stored.closure.cycle_version_at_closure,
            closure_input_hash: stored.closure.closure_watermark.closure_input_hash,
          };
        }
        return this.readinessRepository.findCycleClosure(validationCycleId);
      },
      findStoredClosureByCycle: async (validationCycleId) => clone(
        this.closures.find((stored) => (
          stored.closure.validation_cycle_id === validationCycleId
        )) ?? null,
      ),
      findStoredClosureByIdempotencyKey: async (idempotencyKey) => clone(
        this.closures.find((stored) => stored.idempotency_key === idempotencyKey) ?? null,
      ),
      completeProductValidationCycle: async (input) => {
        const current = await this.readinessRepository.findValidationCycle(
          input.validation_cycle_id,
        );
        const priorCompletion = this.productCycleCompletions.get(input.validation_cycle_id);
        const currentStatus = priorCompletion?.lifecycle_status ?? current?.lifecycle_status;
        if (currentStatus === 'completed' || currentStatus === 'aborted' || currentStatus === 'superseded') {
          throw new PaperImplementationValidationCycleClosureV2RepositoryError(
            'CYCLE_ALREADY_CLOSED',
            `ValidationCycle product row is already terminal: ${input.validation_cycle_id}`,
          );
        }
        if (!current || currentStatus !== input.expected_lifecycle_status) {
          throw new PaperImplementationValidationCycleClosureV2RepositoryError(
            'CLOSURE_CONCURRENT_CONFLICT',
            `ValidationCycle product row changed during closure: ${input.validation_cycle_id}`,
          );
        }
        this.productCycleCompletions.set(input.validation_cycle_id, clone(input));
      },
      commitClosure: async (input) => {
        assertValidationCycleClosureCommit(input);
        if (this.closures.some((stored) => (
          stored.closure.validation_cycle_id === input.stored_closure.closure.validation_cycle_id
        ))) {
          throw new PaperImplementationValidationCycleClosureV2RepositoryError(
            'CYCLE_ALREADY_CLOSED',
            `ValidationCycle already has a v2 closure: ${input.stored_closure.closure.validation_cycle_id}`,
          );
        }
        if (this.closures.some((stored) => (
          stored.idempotency_key === input.stored_closure.idempotency_key
        ))) {
          throw new PaperImplementationValidationCycleClosureV2RepositoryError(
            'CLOSURE_IDEMPOTENCY_CONFLICT',
            'Cycle closure idempotency key is already bound to another closure.',
          );
        }
        this.closures.push(clone(input.stored_closure));
        this.outboxes.push(clone(input.outbox));
        return clone(input.stored_closure);
      },
    };
  }
}

export function assertValidationCycleClosureCommit(
  input: PaperImplementationValidationCycleClosureCommitV2,
): void {
  const stored = input.stored_closure;
  const closure = stored.closure;
  const watermark = closure.closure_watermark;
  const event = input.outbox.event;
  const { closure_snapshot_hash: closureSnapshotHash, ...closureHashInput } = closure;
  const { closure_input_hash: closureInputHash, ...watermarkHashInput } = watermark;
  const isControlOnly = closure.closure_kind === 'control_flow_validated_no_paper_evidence';
  const invalidControlAuthority = isControlOnly && (
    closure.scientific_disposition !== null
    || closure.selected_exit_key !== null
    || closure.accepted_proposal_id !== null
    || closure.accepted_proposal_hash !== null
  );
  const branchesAreOrdered = watermark.ordered_branches.length > 0
    && watermark.ordered_branches.every((branch, index) => branch.ordinal === index + 1);

  if (
    stored.implementation_project_id.length === 0
    || stored.idempotency_key.length === 0
    || closure.schema_version !== 'v1'
    || closure.validation_cycle_id !== watermark.validation_cycle_id
    || closure.cycle_version_at_closure !== watermark.expected_cycle_version
    || !branchesAreOrdered
    || invalidControlAuthority
    || closureInputHash !== serverHashPaperImplementationV2ClosureWatermark(watermarkHashInput)
    || closureSnapshotHash !== serverHashPaperImplementationV2CycleClosure(closureHashInput)
    || input.outbox.aggregate_transition_key !== `${closure.closure_id}:closed@v1`
    || event.event_type !== PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE
    || event.schema_version !== 'v1'
    || event.producer_domain !== 'PaperImplementation'
    || event.business_idempotency_key !== stored.idempotency_key
    || event.payload.event_schema !== PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE
    || event.payload.validation_cycle_id !== closure.validation_cycle_id
    || event.payload.closure_id !== closure.closure_id
    || event.payload.closure_snapshot_hash !== closure.closure_snapshot_hash
    || event.payload.closure_kind !== closure.closure_kind
    || event.payload.scientific_disposition !== closure.scientific_disposition
    || event.payload.closure_input_hash !== watermark.closure_input_hash
    || event.payload_hash !== serverHashExperimentV2EventPayload(
      event.event_type,
      event.schema_version,
      event.payload,
    )
    || input.outbox.event_envelope_hash !== serverHashExperimentV2EventEnvelope(event)
  ) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      'Cycle closure, watermark, and outbox bindings must be exact and server-derived.',
    );
  }
}
