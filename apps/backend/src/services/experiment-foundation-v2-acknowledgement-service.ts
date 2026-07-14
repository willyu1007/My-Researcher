import { randomUUID } from 'node:crypto';

import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2EventEnvelope,
  verifyExperimentV2EventPayloadHash,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  BranchHeadAdvancedEventV1,
  ExperimentFoundationIntegrationInboxV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentFoundationExperimentSpineV2Repository,
} from '../repositories/experiment-spine-v2.repository.js';

const ACKNOWLEDGEMENT_CONSUMER =
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER;

export interface ExperimentFoundationV2AcknowledgementServiceOptions {
  repository: ExperimentFoundationExperimentSpineV2Repository;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

function integrationError(message: string, reasonCode: string, retryable = false): AppError {
  return new AppError(
    retryable ? 422 : 409,
    retryable ? 'GATE_CONSTRAINT_FAILED' : 'VERSION_CONFLICT',
    message,
    { reason_code: reasonCode },
  );
}

function scopeFromEvent(event: BranchHeadAdvancedEventV1) {
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

function assertBranchHeadAdvancedEventV1(event: BranchHeadAdvancedEventV1): void {
  if ((event as { event_type?: string }).event_type !== 'BranchHeadAdvanced') {
    throw integrationError('Unsupported integration event type.', 'INTEGRATION_EVENT_TYPE_UNSUPPORTED');
  }
  if ((event as { schema_version?: string }).schema_version !== 'v1') {
    throw integrationError(
      'Unsupported integration event version.',
      'INTEGRATION_EVENT_VERSION_UNSUPPORTED',
    );
  }
  if ((event as { producer_domain?: string }).producer_domain !== 'PaperImplementation') {
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
  if (event.payload.accepted_revision_sequence !== event.branch_revision_sequence) {
    throw integrationError(
      'Branch-head acknowledgement sequence drifted.',
      'BRANCH_HEAD_SCOPE_CONFLICT',
    );
  }
}

function exactScopeMatches(
  event: BranchHeadAdvancedEventV1,
  sourceEvent: {
    implementation_project_id: string;
    validation_cycle_id: string;
    branch_id: string;
    branch_key: string;
    work_order_revision_id: string;
    work_order_revision_hash: string;
    branch_revision_sequence: number;
    cell_plan_hash: string;
    approved_plan_hash: string;
  },
): boolean {
  return canonicalizeExperimentV2Json(scopeFromEvent(event))
    === canonicalizeExperimentV2Json({
      implementation_project_id: sourceEvent.implementation_project_id,
      validation_cycle_id: sourceEvent.validation_cycle_id,
      branch_id: sourceEvent.branch_id,
      branch_key: sourceEvent.branch_key,
      work_order_revision_id: sourceEvent.work_order_revision_id,
      work_order_revision_hash: sourceEvent.work_order_revision_hash,
      branch_revision_sequence: sourceEvent.branch_revision_sequence,
      cell_plan_hash: sourceEvent.cell_plan_hash,
      approved_plan_hash: sourceEvent.approved_plan_hash,
    });
}

export class ExperimentFoundationV2AcknowledgementService {
  private readonly repository: ExperimentFoundationExperimentSpineV2Repository;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: ExperimentFoundationV2AcknowledgementServiceOptions) {
    this.repository = options.repository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async consume(
    event: BranchHeadAdvancedEventV1,
  ): Promise<ExperimentFoundationIntegrationInboxV2> {
    assertBranchHeadAdvancedEventV1(event);

    const eventReplay = await this.repository.findInboxByEvent(
      ACKNOWLEDGEMENT_CONSUMER,
      event.event_id,
    );
    if (eventReplay) {
      if (eventReplay.source_event_hash !== serverHashExperimentV2EventEnvelope(event)) {
        throw integrationError(
          'Integration event id was reused with a changed payload.',
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        );
      }
      return eventReplay;
    }
    const businessReplay = await this.repository.findInboxByBusinessKey(
      ACKNOWLEDGEMENT_CONSUMER,
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
      return businessReplay;
    }

    const materialization = await this.repository.findMaterializationByRevision(
      event.work_order_revision_id,
    );
    if (!materialization) {
      // T4 must not leave a receipt until T2 is durably visible.
      throw integrationError(
        'EF materialization prerequisite is not visible yet.',
        'INTEGRATION_PREREQUISITE_NOT_READY',
        true,
      );
    }
    const frozenEvent = materialization.outbox.event;
    const exactPrerequisite = frozenEvent.event_id === event.payload.source_event_id
      && exactScopeMatches(event, frozenEvent)
      && materialization.run.run_id === event.payload.run_id
      && materialization.run.run_manifest_hash === event.payload.run_manifest_hash
      && frozenEvent.payload.run_id === event.payload.run_id
      && frozenEvent.payload.run_manifest_hash === event.payload.run_manifest_hash;
    if (!exactPrerequisite) {
      throw integrationError(
        'Branch-head acknowledgement does not match the exact frozen Run.',
        'BRANCH_HEAD_SCOPE_CONFLICT',
      );
    }

    const processedAt = this.now();
    const inbox: ExperimentFoundationIntegrationInboxV2 = {
      inbox_id: this.idFactory('ef_integration_inbox_v2'),
      consumer_name: ACKNOWLEDGEMENT_CONSUMER,
      source_event_id: event.event_id,
      business_idempotency_key: event.business_idempotency_key,
      payload_hash: event.payload_hash,
      source_event_hash: serverHashExperimentV2EventEnvelope(event),
      scope: scopeFromEvent(event),
      outcome: 'processed',
      reason_code: null,
      processed_at: processedAt,
    };
    try {
      // This receipt is the only durable acknowledgement. T4 emits no outbox.
      return await this.repository.commitAcknowledgement(inbox, event);
    } catch (error) {
      if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message, {
          reason_code: error.reasonCode,
        });
      }
      throw error;
    }
  }
}

export { ACKNOWLEDGEMENT_CONSUMER };
