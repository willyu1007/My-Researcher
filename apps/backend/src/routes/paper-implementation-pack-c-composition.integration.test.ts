import assert from 'node:assert/strict';
import test from 'node:test';

import type { FastifyInstance } from 'fastify';
import {
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  RunEvidenceUnitRegisteredEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { buildApp } from '../app.js';
import {
  InMemoryExperimentFoundationExperimentSpineV2Repository,
  InMemoryPaperImplementationExperimentSpineV2Repository,
} from '../repositories/in-memory-experiment-spine-v2-repository.js';
import {
  InMemoryPaperImplementationCycleReadinessV2Repository,
} from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';
import {
  PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER,
} from '../repositories/experiment-spine-v2.repository.js';
import type {
  ExperimentV2IntegrationRelayService,
} from '../services/experiment-v2-integration-relay-service.js';

const NOW = '2026-07-22T00:00:00.000Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const HASH_C = `sha256:${'c'.repeat(64)}`;

type AppWithPackCRelay = FastifyInstance & {
  experimentV2IntegrationRelayService: ExperimentV2IntegrationRelayService;
};

function registeredEvent(): RunEvidenceUnitRegisteredEventV1 {
  const payload = {
    run_evidence_unit_id: 'reu-composed-1',
    content_hash: HASH_A,
    validation_cycle_id: 'cycle-empty',
    run_id: 'run-composed-1',
    run_manifest_hash: HASH_B,
    evidence_candidate_id: 'candidate-composed-1',
  };
  return {
    event_id: 'registered-composed-1',
    event_type: 'RunEvidenceUnitRegistered',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: NOW,
    correlation_id: 'correlation-composed-1',
    causation_id: 'qualified-composed-1',
    business_idempotency_key: 'registered-composed-business-1',
    implementation_project_id: 'project-composed-1',
    validation_cycle_id: 'cycle-empty',
    branch_id: 'branch-composed-1',
    branch_key: 'primary',
    work_order_revision_id: 'revision-composed-1',
    work_order_revision_hash: HASH_A,
    branch_revision_sequence: 1,
    cell_plan_hash: HASH_B,
    approved_plan_hash: HASH_C,
    payload_hash: serverHashExperimentV2EventPayload(
      'RunEvidenceUnitRegistered',
      'v1',
      payload,
    ),
    payload,
  };
}

test('buildApp composes Pack C services, readiness GET, and non-terminal relay delivery with all flags off', async () => {
  const event = registeredEvent();
  const pi = new InMemoryPaperImplementationExperimentSpineV2Repository({
    initial_outboxes: [{
      outbox_id: 'outbox-registered-composed-1',
      aggregate_transition_key: 'reu-composed-1:registered@v1',
      event,
      created_at: NOW,
    }],
  });
  const ef = new InMemoryExperimentFoundationExperimentSpineV2Repository();
  const readiness = new InMemoryPaperImplementationCycleReadinessV2Repository({
    cycles: [{
      validation_cycle_id: 'cycle-empty',
      implementation_project_id: 'project-composed-1',
      lifecycle_status: 'admitted',
      expected_cycle_version: 0,
    }],
  });
  const app = buildApp({
    paperImplementationExperimentSpineV2Repository: pi,
    experimentFoundationExperimentSpineV2Repository: ef,
    paperImplementationCycleReadinessV2Repository: readiness,
    paperImplementationExperimentV2AdmissionEnabled: () => false,
    paperImplementationValidationCycleClosureV2Enabled: () => false,
    paperImplementationExperimentV2CutoverCommitted: () => false,
    experimentFoundationV2WorkflowSimulationEnabled: () => false,
    experimentFoundationV2ScientificValidationEnabled: () => false,
    backgroundWorkEnabled: false,
  });

  try {
    await app.ready();
    assert.equal(app.hasDecorator('experimentFoundationScientificValidationV2Service'), true);
    assert.equal(app.hasDecorator('paperImplementationEvidenceTrustGatewayService'), true);
    assert.equal(app.hasDecorator('experimentV2IntegrationRelayService'), true);

    const readinessResponse = await app.inject({
      method: 'GET',
      url: '/paper-implementation/validation-cycles/cycle-empty/closure/v2/readiness',
    });
    assert.equal(readinessResponse.statusCode, 422, readinessResponse.body);
    assert.equal(readinessResponse.json().error.code, 'GATE_CONSTRAINT_FAILED');
    assert.equal(
      readinessResponse.json().error.details.reason_code,
      'CYCLE_CLOSURE_SCOPE_DRIFT',
    );

    const relay = (app as AppWithPackCRelay).experimentV2IntegrationRelayService;
    const delivery = await relay.drainOnce();
    assert.equal(delivery.delivered, 1);
    assert.equal(delivery.terminalized, 0);
    assert.equal(pi.snapshot().outboxes[0]?.status, 'delivered');
    assert.equal(pi.snapshot().inboxes.length, 1);
    assert.equal(
      pi.snapshot().inboxes[0]?.consumer_name,
      PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER,
    );
  } finally {
    await app.close();
  }
});
