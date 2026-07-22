import assert from 'node:assert/strict';
import test from 'node:test';

import {
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  EvidenceCandidateQualifiedEventV1,
  ExperimentFoundationIntegrationOutboxV2,
  PaperImplementationExperimentIntegrationOutboxV2,
  RunEvidenceUnitRegisteredEventV1,
  ValidationCycleClosedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { InMemoryExperimentFoundationScientificValidationV2Repository } from '../repositories/in-memory-experiment-foundation-scientific-validation-v2-repository.js';
import {
  InMemoryExperimentFoundationExperimentSpineV2Repository,
  InMemoryPaperImplementationExperimentSpineV2Repository,
} from '../repositories/in-memory-experiment-spine-v2-repository.js';
import { InMemoryPaperImplementationEvidenceV2Repository } from '../repositories/in-memory-paper-implementation-evidence-v2-repository.js';
import {
  PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER,
} from '../repositories/experiment-spine-v2.repository.js';
import { PaperImplementationEvidenceTrustGatewayService } from './paper-implementation-evidence-trust-gateway-service.js';
import { PaperImplementationProjectionFeedV2Consumer } from './paper-implementation-projection-feed-v2-consumer.js';
import { ExperimentV2IntegrationRelayService } from './experiment-v2-integration-relay-service.js';

const NOW = '2026-07-22T00:00:00.000Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const HASH_C = `sha256:${'c'.repeat(64)}`;

function scope() {
  return {
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    branch_id: 'branch-1',
    branch_key: 'primary',
    work_order_revision_id: 'revision-1',
    work_order_revision_hash: HASH_A,
    branch_revision_sequence: 1,
    cell_plan_hash: HASH_B,
    approved_plan_hash: HASH_C,
  };
}

function qualifiedEvent(): EvidenceCandidateQualifiedEventV1 {
  const payload = {
    event_schema: 'EvidenceCandidateQualified@v1' as const,
    candidate_id: 'candidate-1',
    candidate_content_hash: HASH_A,
    validation_report_id: 'report-1',
    validation_hash: HASH_B,
    run_id: 'run-1',
    run_manifest_hash: HASH_C,
    evaluation_protocol_revision_id: 'protocol-revision-1',
    evaluation_protocol_content_hash: HASH_A,
  };
  return {
    event_id: 'qualified-event-1',
    event_type: 'EvidenceCandidateQualified',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: NOW,
    correlation_id: 'correlation-1',
    causation_id: 'head-event-1',
    business_idempotency_key: 'qualified-business-1',
    ...scope(),
    payload_hash: serverHashExperimentV2EventPayload(
      'EvidenceCandidateQualified',
      'v1',
      payload,
    ),
    payload,
  };
}

function registeredEvent(): RunEvidenceUnitRegisteredEventV1 {
  const payload = {
    run_evidence_unit_id: 'reu-1',
    content_hash: HASH_A,
    validation_cycle_id: 'cycle-1',
    run_id: 'run-1',
    run_manifest_hash: HASH_C,
    evidence_candidate_id: 'candidate-1',
  };
  return {
    event_id: 'registered-event-1',
    event_type: 'RunEvidenceUnitRegistered',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: NOW,
    correlation_id: 'correlation-1',
    causation_id: 'qualified-event-1',
    business_idempotency_key: 'registered-business-1',
    ...scope(),
    payload_hash: serverHashExperimentV2EventPayload(
      'RunEvidenceUnitRegistered',
      'v1',
      payload,
    ),
    payload,
  };
}

function closedEvent(): ValidationCycleClosedEventV1 {
  const payload = {
    event_schema: 'ValidationCycleClosed@v1' as const,
    validation_cycle_id: 'cycle-1',
    closure_id: 'closure-1',
    closure_snapshot_hash: HASH_A,
    closure_kind: 'control_flow_validated_no_paper_evidence' as const,
    scientific_disposition: null,
    closure_input_hash: HASH_B,
  };
  return {
    event_id: 'closed-event-1',
    event_type: 'ValidationCycleClosed@v1',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: NOW,
    correlation_id: 'closure-1',
    causation_id: HASH_B,
    business_idempotency_key: 'closed-business-1',
    ...scope(),
    payload_hash: serverHashExperimentV2EventPayload(
      'ValidationCycleClosed@v1',
      'v1',
      payload,
    ),
    payload,
  };
}

function piOutbox(
  event: RunEvidenceUnitRegisteredEventV1 | ValidationCycleClosedEventV1,
): PaperImplementationExperimentIntegrationOutboxV2 {
  return {
    outbox_id: `outbox-${event.event_id}`,
    aggregate_transition_key: `transition-${event.event_id}`,
    event,
    created_at: NOW,
  };
}

function relay(input: {
  pi: InMemoryPaperImplementationExperimentSpineV2Repository;
  ef: InMemoryExperimentFoundationExperimentSpineV2Repository;
  evidenceRepository?: InMemoryPaperImplementationEvidenceV2Repository;
  now?: () => string;
}) {
  const evidenceRepository = input.evidenceRepository
    ?? new InMemoryPaperImplementationEvidenceV2Repository();
  let projectionInboxSequence = 0;
  const projection = new PaperImplementationProjectionFeedV2Consumer({
    repository: input.pi,
    now: input.now ?? (() => NOW),
    idFactory: () => {
      projectionInboxSequence += 1;
      return `projection-inbox-${projectionInboxSequence}`;
    },
  });
  return {
    evidenceRepository,
    service: new ExperimentV2IntegrationRelayService({
      paperImplementationRepository: input.pi,
      experimentFoundationRepository: input.ef,
      materializationConsumer: { async consume() {} },
      headConsumer: { async consume() {} },
      acknowledgementConsumer: { async consume() {} },
      evidenceTrustGatewayConsumer: new PaperImplementationEvidenceTrustGatewayService({
        repository: evidenceRepository,
        scientificValidationReadRepository:
          new InMemoryExperimentFoundationScientificValidationV2Repository(),
        now: input.now ?? (() => NOW),
      }),
      runEvidenceProjectionConsumer: projection,
      validationCycleClosedProjectionConsumer: projection,
      workerId: 'relay-test',
      now: input.now ?? (() => NOW),
      retryDelayMs: 0,
    }),
  };
}

test('relay delivers EvidenceCandidateQualified to the real trust gateway without terminalization', async () => {
  const event = qualifiedEvent();
  const outbox: ExperimentFoundationIntegrationOutboxV2 = {
    outbox_id: 'outbox-qualified-1',
    aggregate_transition_key: 'candidate-1:qualified@v1',
    event,
    created_at: NOW,
  };
  const pi = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const ef = new InMemoryExperimentFoundationExperimentSpineV2Repository({
    initial_outboxes: [outbox],
  });
  const composed = relay({ pi, ef });

  const outcome = await composed.service.drainOnce();

  assert.equal(outcome.delivered, 1);
  assert.equal(outcome.terminalized, 0);
  assert.equal(ef.snapshot().outboxes[0]?.status, 'delivered');
  assert.equal(composed.evidenceRepository.snapshot().inboxes.length, 1);
  assert.equal(composed.evidenceRepository.snapshot().inboxes[0]?.outcome, 'terminal_conflict');
});

test('relay durably receipts both PI projection-feed events with zero terminalization', async () => {
  const pi = new InMemoryPaperImplementationExperimentSpineV2Repository({
    initial_outboxes: [piOutbox(registeredEvent()), piOutbox(closedEvent())],
  });
  const ef = new InMemoryExperimentFoundationExperimentSpineV2Repository();
  const composed = relay({ pi, ef });

  const outcome = await composed.service.drainOnce();

  assert.equal(outcome.delivered, 2);
  assert.equal(outcome.terminalized, 0);
  assert.deepEqual(
    pi.snapshot().inboxes.map((receipt) => receipt.consumer_name),
    [PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER,
      PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER],
  );
  assert.equal(pi.snapshot().outboxes.every((outbox) => outbox.status === 'delivered'), true);
});

test('projection-feed redelivery converges to one exact inbox receipt', async () => {
  const pi = new InMemoryPaperImplementationExperimentSpineV2Repository({
    initial_outboxes: [piOutbox(registeredEvent())],
  });
  const ef = new InMemoryExperimentFoundationExperimentSpineV2Repository();
  const composed = relay({ pi, ef });
  pi.failNext('markOutboxDelivered');

  const first = await composed.service.drainOnce();
  const replay = await composed.service.drainOnce();

  assert.equal(first.released, 1);
  assert.equal(first.terminalized, 0);
  assert.equal(replay.delivered, 1);
  assert.equal(replay.terminalized, 0);
  assert.equal(pi.snapshot().inboxes.length, 1);
  assert.equal(pi.snapshot().outboxes[0]?.status, 'delivered');
});
