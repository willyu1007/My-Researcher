import { randomUUID } from 'node:crypto';

import {
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  verifyExperimentV2EventPayloadHash,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  BranchHeadAdvancedEventV1,
  PaperImplementationExperimentIntegrationInboxV2,
  PaperImplementationExperimentWorkOrderBranchV2,
  RunManifestFrozenEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentSpineV2RepositoryConstraintError,
  type PaperImplementationExperimentSpineV2Repository,
  type PaperImplementationExperimentV2AdmissionBundle,
} from '../repositories/experiment-spine-v2.repository.js';
import type {
  PaperImplementationValidationCycleClosureV2Lookup,
} from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
import { incrementExperimentV2Int32Counter } from './experiment-v2-int32.js';

const HEAD_CONSUMER = 'paper-implementation-experiment-v2-head-advancer';

export interface PaperImplementationExperimentV2HeadServiceOptions {
  repository: PaperImplementationExperimentSpineV2Repository;
  cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export interface PaperImplementationExperimentV2HeadOutcome {
  inbox: PaperImplementationExperimentIntegrationInboxV2;
  branch: PaperImplementationExperimentWorkOrderBranchV2 | null;
  emitted_branch_head_advanced: boolean;
}

function integrationError(message: string, reasonCode: string, retryable = false): AppError {
  return new AppError(
    retryable ? 422 : 409,
    retryable ? 'GATE_CONSTRAINT_FAILED' : 'VERSION_CONFLICT',
    message,
    { reason_code: reasonCode },
  );
}

function cycleAlreadyClosed(): AppError {
  return new AppError(
    409,
    'GATE_CONSTRAINT_FAILED',
    'A closed ValidationCycle cannot advance its branch head.',
    { reason_code: 'CYCLE_ALREADY_CLOSED' },
  );
}

function scopeFromEvent(event: RunManifestFrozenEventV1) {
  return {
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    branch_key: event.branch_key,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    cell_plan_hash: event.cell_plan_hash,
    approved_plan_hash: event.approved_plan_hash,
  };
}

function assertRunManifestFrozenEventV1(event: RunManifestFrozenEventV1): void {
  if ((event as { event_type?: string }).event_type !== 'RunManifestFrozen') {
    throw integrationError('Unsupported integration event type.', 'INTEGRATION_EVENT_TYPE_UNSUPPORTED');
  }
  if ((event as { schema_version?: string }).schema_version !== 'v1') {
    throw integrationError(
      'Unsupported integration event version.',
      'INTEGRATION_EVENT_VERSION_UNSUPPORTED',
    );
  }
  if ((event as { producer_domain?: string }).producer_domain !== 'ExperimentFoundation') {
    throw integrationError(
      'Integration event producer is invalid.',
      'INTEGRATION_EVENT_PRODUCER_INVALID',
    );
  }
  if (!verifyExperimentV2EventPayloadHash(event)) {
    throw integrationError(
      'Integration event payload hash does not match its payload.',
      'INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH',
    );
  }
}

function inboxFor(
  event: RunManifestFrozenEventV1,
  now: string,
  idFactory: (prefix: string) => string,
  outcome: PaperImplementationExperimentIntegrationInboxV2['outcome'],
  reasonCode: PaperImplementationExperimentIntegrationInboxV2['reason_code'],
): PaperImplementationExperimentIntegrationInboxV2 {
  return {
    inbox_id: idFactory('pi_integration_inbox_v2'),
    consumer_name: HEAD_CONSUMER,
    source_event_id: event.event_id,
    business_idempotency_key: event.business_idempotency_key,
    payload_hash: event.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(event),
    scope: scopeFromEvent(event),
    outcome,
    reason_code: reasonCode,
    processed_at: now,
  };
}

function branchScopeMatches(
  branch: PaperImplementationExperimentWorkOrderBranchV2,
  event: RunManifestFrozenEventV1,
): boolean {
  return branch.branch_id === event.branch_id
    && branch.implementation_project_id === event.implementation_project_id
    && branch.validation_cycle_id === event.validation_cycle_id
    && branch.branch_key === event.branch_key;
}

type ExactRunAuthorityMismatch =
  | 'BRANCH_HEAD_SCOPE_CONFLICT'
  | 'RUN_CELL_PARITY_MISMATCH'
  | 'RUN_MANIFEST_CONFLICT';

function exactRunAuthorityMismatch(
  revisionBundle: PaperImplementationExperimentV2AdmissionBundle,
  event: RunManifestFrozenEventV1,
): ExactRunAuthorityMismatch | null {
  const revisionMatches = revisionBundle.revision.revision_sequence === event.branch_revision_sequence
    && revisionBundle.revision.content_hash === event.work_order_revision_hash
    && revisionBundle.revision.cell_plan_hash === event.cell_plan_hash
    && revisionBundle.revision.approved_plan_hash === event.approved_plan_hash
    && revisionBundle.admission.approved_plan_hash === event.approved_plan_hash
    && revisionBundle.outbox.event.event_id === event.payload.source_event_id;
  if (!revisionMatches) {
    return 'BRANCH_HEAD_SCOPE_CONFLICT';
  }
  if (event.payload.task_spec_bindings.length !== revisionBundle.cells.length) {
    return 'RUN_CELL_PARITY_MISMATCH';
  }
  let bindingParityMismatch = false;
  const manifestRows = revisionBundle.cells.map((cell, index) => {
    const binding = event.payload.task_spec_bindings[index];
    if (
      !binding
      || binding.ordinal !== cell.ordinal
      || binding.work_order_cell_id !== cell.work_order_cell_id
      || binding.cell_key !== cell.cell_key
      || binding.cell_hash !== cell.cell_hash
    ) {
      bindingParityMismatch = true;
    }
    return {
      ordinal: cell.ordinal,
      cell_key: cell.cell_key,
      external_pi_cell_id: cell.work_order_cell_id,
      external_pi_cell_hash: cell.cell_hash,
      training_task_spec_id: binding?.training_task_spec_id ?? 'missing',
      training_task_spec_hash: binding?.training_task_spec_hash ?? 'missing',
      seed: cell.seed,
      repeat_index: cell.repeat_index,
    };
  });
  if (bindingParityMismatch) {
    return 'RUN_CELL_PARITY_MISMATCH';
  }
  return serverHashExperimentFoundationV2RunManifest(manifestRows) === event.payload.run_manifest_hash
    ? null
    : 'RUN_MANIFEST_CONFLICT';
}

function mapRepositoryError(error: ExperimentSpineV2RepositoryConstraintError): AppError {
  if (error.reasonCode === 'CYCLE_ALREADY_CLOSED') {
    return cycleAlreadyClosed();
  }
  return new AppError(
    409,
    error.reasonCode === 'BRANCH_HEAD_CAS_CONFLICT' ? 'CONCURRENT_ADVANCE' : 'VERSION_CONFLICT',
    error.message,
    { reason_code: error.reasonCode },
  );
}

export class PaperImplementationExperimentV2HeadService {
  private readonly repository: PaperImplementationExperimentSpineV2Repository;
  private readonly cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: PaperImplementationExperimentV2HeadServiceOptions) {
    this.repository = options.repository;
    this.cycleClosureLookup = options.cycleClosureLookup;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async consume(event: RunManifestFrozenEventV1): Promise<PaperImplementationExperimentV2HeadOutcome> {
    assertRunManifestFrozenEventV1(event);
    try {
      return await this.consumeValidated(event);
    } catch (error) {
      if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
        throw mapRepositoryError(error);
      }
      throw error;
    }
  }

  private async consumeValidated(
    event: RunManifestFrozenEventV1,
  ): Promise<PaperImplementationExperimentV2HeadOutcome> {
    const eventReplay = await this.repository.findInboxByEvent(HEAD_CONSUMER, event.event_id);
    if (eventReplay) {
      if (eventReplay.source_event_hash !== serverHashExperimentV2EventEnvelope(event)) {
        throw integrationError(
          'Integration event id was reused with a changed payload.',
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        );
      }
      const branch = eventReplay.outcome === 'processed'
        ? await this.repository.verifyProcessedHeadReplay(HEAD_CONSUMER, event)
        : await this.repository.findBranch(
          event.implementation_project_id,
          event.validation_cycle_id,
          event.branch_key,
        );
      return {
        inbox: eventReplay,
        branch,
        emitted_branch_head_advanced: eventReplay.outcome === 'processed',
      };
    }

    const businessReplay = await this.repository.findInboxByBusinessKey(
      HEAD_CONSUMER,
      event.implementation_project_id,
      event.validation_cycle_id,
      event.branch_id,
      event.business_idempotency_key,
    );
    if (businessReplay) {
      if (businessReplay.source_event_hash !== serverHashExperimentV2EventEnvelope(event)) {
        throw integrationError(
          'Integration business idempotency key was reused with a changed payload.',
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        );
      }
      const branch = businessReplay.outcome === 'processed'
        ? await this.repository.verifyProcessedHeadReplay(HEAD_CONSUMER, event)
        : await this.repository.findBranch(
          event.implementation_project_id,
          event.validation_cycle_id,
          event.branch_key,
        );
      return {
        inbox: businessReplay,
        branch,
        emitted_branch_head_advanced: businessReplay.outcome === 'processed',
      };
    }

    // A processed inbox is the replay authority even after Cycle closure.
    // New head mutations still take the cheap fence here and the authoritative
    // fence inside commitHeadAdvance's transaction.
    if (await this.cycleClosureLookup.isCycleClosed(event.validation_cycle_id)) {
      throw cycleAlreadyClosed();
    }

    const branch = await this.repository.findBranch(
      event.implementation_project_id,
      event.validation_cycle_id,
      event.branch_key,
    );
    if (!branch) {
      // Missing authoritative PI state is retryable and writes no inbox row.
      throw integrationError(
        'PI branch prerequisite is not visible yet.',
        'INTEGRATION_PREREQUISITE_NOT_READY',
        true,
      );
    }

    const processedAt = this.now();
    if (!branchScopeMatches(branch, event)) {
      const inbox = inboxFor(
        event,
        processedAt,
        this.idFactory,
        'terminal_conflict',
        'BRANCH_HEAD_SCOPE_CONFLICT',
      );
      const stored = await this.repository.recordInboxOutcome(inbox, event);
      return { inbox: stored, branch, emitted_branch_head_advanced: false };
    }

    const currentSequence = branch.current_admitted_revision_sequence;
    if (currentSequence === null || event.branch_revision_sequence > currentSequence) {
      throw integrationError(
        'PI admitted revision prerequisite is not visible yet.',
        'INTEGRATION_PREREQUISITE_NOT_READY',
        true,
      );
    }
    if (event.branch_revision_sequence < currentSequence) {
      const inbox = inboxFor(
        event,
        processedAt,
        this.idFactory,
        'ignored_stale',
        'BRANCH_HEAD_CAS_CONFLICT',
      );
      const stored = await this.repository.recordInboxOutcome(inbox, event);
      return { inbox: stored, branch, emitted_branch_head_advanced: false };
    }

    const revisionBundle = await this.repository.findRevisionBundle(
      branch.branch_id,
      event.work_order_revision_id,
    );
    if (!revisionBundle) {
      throw integrationError(
        'PI admitted revision prerequisite is not visible yet.',
        'INTEGRATION_PREREQUISITE_NOT_READY',
        true,
      );
    }
    const authorityMismatch = exactRunAuthorityMismatch(revisionBundle, event);
    if (authorityMismatch) {
      const inbox = inboxFor(
        event,
        processedAt,
        this.idFactory,
        'terminal_conflict',
        authorityMismatch,
      );
      const stored = await this.repository.recordInboxOutcome(inbox, event);
      return { inbox: stored, branch, emitted_branch_head_advanced: false };
    }

    if (branch.head_run_id !== null) {
      if (!branch.head_source_event_id) {
        throw integrationError(
          'PI head receipt prerequisite is not visible yet.',
          'INTEGRATION_PREREQUISITE_NOT_READY',
          true,
        );
      }
      const headReceipt = await this.repository.findInboxByEvent(
        HEAD_CONSUMER,
        branch.head_source_event_id,
      );
      if (!headReceipt) {
        throw integrationError(
          'PI head receipt prerequisite is not visible yet.',
          'INTEGRATION_PREREQUISITE_NOT_READY',
          true,
        );
      }
      const headSequence = headReceipt.scope.branch_revision_sequence;
      if (event.branch_revision_sequence < headSequence) {
        const inbox = inboxFor(
          event,
          processedAt,
          this.idFactory,
          'ignored_stale',
          'BRANCH_HEAD_CAS_CONFLICT',
        );
        const stored = await this.repository.recordInboxOutcome(inbox, event);
        return { inbox: stored, branch, emitted_branch_head_advanced: false };
      }
      if (event.branch_revision_sequence === headSequence) {
        const exactHead = branch.head_run_id === event.payload.run_id
          && branch.head_run_manifest_hash === event.payload.run_manifest_hash;
        const inbox = inboxFor(
          event,
          processedAt,
          this.idFactory,
          exactHead ? 'processed' : 'terminal_conflict',
          exactHead ? null : 'BRANCH_HEAD_SCOPE_CONFLICT',
        );
        const stored = await this.repository.recordInboxOutcome(inbox, event);
        return { inbox: stored, branch, emitted_branch_head_advanced: false };
      }
    }

    const nextBranchStateVersion = incrementExperimentV2Int32Counter(
      branch.state_version,
      'PI branch head state version',
      (message) => integrationError(message, 'BRANCH_HEAD_CAS_CONFLICT'),
    );
    const nextBranch = {
      ...branch,
      state_version: nextBranchStateVersion,
      head_run_id: event.payload.run_id,
      head_run_manifest_hash: event.payload.run_manifest_hash,
      head_source_event_id: event.event_id,
      updated_at: processedAt,
    };
    const inbox = inboxFor(event, processedAt, this.idFactory, 'processed', null);
    const advancedPayload: BranchHeadAdvancedEventV1['payload'] = {
      source_event_id: event.event_id,
      run_id: event.payload.run_id,
      run_manifest_hash: event.payload.run_manifest_hash,
      accepted_revision_sequence: event.branch_revision_sequence,
      branch_state_version: nextBranch.state_version,
    };
    const advancedEvent: BranchHeadAdvancedEventV1 = {
      event_id: this.idFactory('pi_integration_event_v2'),
      event_type: 'BranchHeadAdvanced',
      schema_version: 'v1',
      producer_domain: 'PaperImplementation',
      occurred_at: processedAt,
      correlation_id: event.correlation_id,
      causation_id: event.event_id,
      business_idempotency_key: event.business_idempotency_key,
      ...scopeFromEvent(event),
      payload_hash: serverHashExperimentV2EventPayload('BranchHeadAdvanced', 'v1', advancedPayload),
      payload: advancedPayload,
    };
    const committed = await this.repository.commitHeadAdvance(
      {
        expected_branch_state_version: branch.state_version,
        branch: nextBranch,
        inbox,
        outbox: {
          outbox_id: this.idFactory('pi_integration_outbox_v2'),
          aggregate_transition_key: `${branch.branch_id}:revision:${event.branch_revision_sequence}:head`,
          event: advancedEvent,
          created_at: processedAt,
        },
      },
      event,
    );
    return {
      inbox: committed.inbox,
      branch: committed.branch,
      emitted_branch_head_advanced: true,
    };
  }

}

export { HEAD_CONSUMER };
