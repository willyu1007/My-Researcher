import { randomUUID } from 'node:crypto';

import {
  serverHashExperimentV2EventEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  PaperImplementationExperimentIntegrationInboxV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import {
  PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER,
  type PaperImplementationExperimentSpineV2Repository,
  type PaperImplementationProjectionFeedV2Event,
} from '../repositories/experiment-spine-v2.repository.js';

export interface PaperImplementationProjectionFeedV2ConsumerOptions {
  repository: Pick<PaperImplementationExperimentSpineV2Repository, 'recordInboxOutcome'>;
  now?: () => string;
  idFactory?: () => string;
}

/**
 * Durable pending-consumer boundary for Phase 5/scientific projections. A
 * processed inbox receipt means the event was durably accepted for those
 * future consumers; QR-1 intentionally performs zero projection/domain writes.
 */
export class PaperImplementationProjectionFeedV2Consumer {
  private readonly repository: Pick<
    PaperImplementationExperimentSpineV2Repository,
    'recordInboxOutcome'
  >;
  private readonly now: () => string;
  private readonly idFactory: () => string;

  constructor(options: PaperImplementationProjectionFeedV2ConsumerOptions) {
    this.repository = options.repository;
    this.now = options.now ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? (() => `pi_projection_feed_inbox_${randomUUID()}`);
  }

  async consume(
    event: PaperImplementationProjectionFeedV2Event,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2> {
    const processedAt = this.now();
    return this.repository.recordInboxOutcome({
      inbox_id: this.idFactory(),
      consumer_name: PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER,
      source_event_id: event.event_id,
      business_idempotency_key: event.business_idempotency_key,
      payload_hash: event.payload_hash,
      source_event_hash: serverHashExperimentV2EventEnvelope(event),
      scope: {
        implementation_project_id: event.implementation_project_id,
        validation_cycle_id: event.validation_cycle_id,
        branch_id: event.branch_id,
        branch_key: event.branch_key,
        work_order_revision_id: event.work_order_revision_id,
        work_order_revision_hash: event.work_order_revision_hash,
        branch_revision_sequence: event.branch_revision_sequence,
        cell_plan_hash: event.cell_plan_hash,
        approved_plan_hash: event.approved_plan_hash,
      },
      outcome: 'processed',
      reason_code: null,
      processed_at: processedAt,
    }, event);
  }
}
