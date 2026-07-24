import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  validationCycleAvailableActionsV2ResponseSchema,
  validationCycleClosurePreparationV2ResponseSchema,
} from './paper-implementation-closure-preparation-v2-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

const HASH = `sha256:${'a'.repeat(64)}`;

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload: payload as object,
  });
  await app.close();
  return response.statusCode === 200;
}

test('closure preparation schema accepts the exact no-evidence POST body template', async () => {
  const response = {
    readiness: {
      outcome: 'ready',
      blockers: [],
    },
    derived_closure_kind: 'control_flow_validated_no_paper_evidence',
    prepared_request: {
      body: {
        validation_cycle_id: 'cycle-1',
        expected_cycle_version: 3,
        expected_closure_input_hash: HASH,
        closure_kind: 'control_flow_validated_no_paper_evidence',
        accepted_proposal_id: null,
        expected_proposal_hash: null,
        corrected_scientific_disposition: null,
        idempotency_key: null,
      },
      required_template_fields: [{
        field: 'idempotency_key',
        semantic: 'business_idempotency_key',
        required: true,
      }],
    },
  };

  assert.equal(
    await validates(validationCycleClosurePreparationV2ResponseSchema, response),
    true,
  );
  assert.equal(
    await validates(validationCycleClosurePreparationV2ResponseSchema, {
      ...response,
      prepared_request: {
        ...response.prepared_request,
        body: {
          ...response.prepared_request.body,
          closure_watermark: { caller_authored: true },
        },
      },
    }),
    false,
  );
});

test('closure preparation schema accepts blocked and scientific-gated outcomes', async () => {
  assert.equal(
    await validates(validationCycleClosurePreparationV2ResponseSchema, {
      readiness: {
        outcome: 'blocked',
        blockers: [{
          ordinal: 1,
          code: 'CYCLE_ACTIVE_REAL_ATTEMPT',
          branch_id: null,
        }],
      },
      derived_closure_kind: null,
      prepared_request: null,
    }),
    true,
  );
  assert.equal(
    await validates(validationCycleClosurePreparationV2ResponseSchema, {
      readiness: {
        outcome: 'ready',
        blockers: [],
      },
      derived_closure_kind: {
        marker: 'scientific_closure_blocked',
        available: false,
        gate: 'M7-L2',
      },
      prepared_request: null,
    }),
    true,
  );
});

test('available-actions schema accepts typed paths, subjects, gates, and closure summary', async () => {
  const response = {
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    actions: [{
      action_kind: 'admit_work_order_revision',
      method: 'POST',
      path: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
      capability_gated: true,
      required_human_confirmation_scope: 'work_order_admission',
      subject: {},
    }, {
      action_kind: 'start_real_provider_execution',
      method: 'POST',
      path: '/experiment-foundation/v2/runs/run-1/real-provider-executions',
      capability_gated: true,
      required_human_confirmation_scope: null,
      subject: {
        branch_id: 'branch-1',
        run_id: 'run-1',
      },
    }, {
      action_kind: 'cancel_execution_attempt',
      method: 'POST',
      path: '/experiment-foundation/v2/execution-attempts/attempt-1/cancel',
      capability_gated: false,
      required_human_confirmation_scope: null,
      subject: {
        branch_id: 'branch-1',
        run_id: 'run-1',
        execution_attempt_id: 'attempt-1',
      },
    }],
    closure: {
      closed: false,
      kind: null,
      disposition: null,
      closed_at: null,
    },
  };
  assert.equal(
    await validates(validationCycleAvailableActionsV2ResponseSchema, response),
    true,
  );
  assert.equal(
    await validates(validationCycleAvailableActionsV2ResponseSchema, {
      ...response,
      actions: [{
        ...response.actions[0],
        subject: {
          caller_authority_hash: HASH,
        },
      }],
    }),
    false,
  );
});
