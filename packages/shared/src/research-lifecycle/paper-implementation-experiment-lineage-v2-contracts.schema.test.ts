import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  projectValidationCyclesLineageV2ResponseSchema,
  validationCycleExperimentLineageV2ResponseSchema,
  workOrderBranchRevisionHistoryV2ResponseSchema,
} from './paper-implementation-experiment-lineage-v2-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

const hash = (character: string) => `sha256:${character.repeat(64)}`;

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

test('project ValidationCycle lineage schema accepts accounting summaries without readiness', async () => {
  const response = {
    implementation_project_id: 'project-1',
    validation_cycles: [{
      validation_cycle_id: 'cycle-1',
      status: 'completed',
      target_ref: {
        type: 'paper_project',
        id: 'paper-1',
        version: 'v3',
      },
      created_at: '2026-07-24T01:00:00.000Z',
      closure: {
        closed: true,
        kind: 'scientific_evidence_assessed',
        disposition: 'positive',
        closed_at: '2026-07-24T02:00:00.000Z',
      },
      branch_count: 2,
      admitted_branch_count: 1,
      total_run_count: 3,
      active_real_attempt_count: 1,
    }],
  };
  assert.equal(await validates(projectValidationCyclesLineageV2ResponseSchema, response), true);
  assert.equal(await validates(projectValidationCyclesLineageV2ResponseSchema, {
    ...response,
    validation_cycles: [{
      ...response.validation_cycles[0],
      readiness: 'ready_with_evidence',
    }],
  }), false);
  assert.equal(await validates(projectValidationCyclesLineageV2ResponseSchema, {
    ...response,
    validation_cycles: [{
      ...response.validation_cycles[0],
      closure: {
        closed: false,
        kind: 'scientific_evidence_assessed',
        disposition: null,
        closed_at: null,
      },
    }],
  }), false);
});

test('cycle lineage schema requires either an effective head Run or the readiness blocker', async () => {
  const common = {
    implementation_project_id: 'project-1',
    validation_cycle: {
      validation_cycle_id: 'cycle-1',
      status: 'admitted',
      target_ref: {
        type: 'paper_project',
        id: 'paper-1',
        version: null,
      },
      created_at: '2026-07-24T01:00:00.000Z',
      closure: {
        closed: false,
        kind: null,
        disposition: null,
        closed_at: null,
      },
    },
  };
  const admittedRevision = {
    work_order_revision_id: 'revision-2',
    work_order_revision_hash: hash('a'),
    revision_sequence: 2,
  };
  const response = {
    ...common,
    branches: [{
      ordinal: 1,
      branch_id: 'branch-1',
      branch_key: 'main',
      parent_branch_key: null,
      current_admitted_revision: admittedRevision,
      effective_head_run: {
        run_id: 'run-2',
        run_manifest_hash: hash('b'),
        ordered_cells: [{
          ordinal: 1,
          cell_key: 'cell-a',
          training_task_spec_id: 'task-1',
          training_task_spec_hash: hash('c'),
        }],
        ordered_attempts: [{
          execution_attempt_id: 'attempt-1',
          attempt_sequence: 1,
          execution_mode: 'real_provider',
          lifecycle_state: 'succeeded',
          terminal_reason_code: null,
          updated_at: '2026-07-24T03:00:00.000Z',
        }],
        collection_summaries: [{
          execution_attempt_id: 'attempt-1',
          collection_state: 'collected',
          output_kinds: ['real_provider_result_envelope'],
        }],
      },
      head_blocker: null,
    }, {
      ordinal: 2,
      branch_id: 'branch-2',
      branch_key: 'variant',
      parent_branch_key: 'main',
      current_admitted_revision: {
        ...admittedRevision,
        work_order_revision_id: 'revision-variant-1',
      },
      effective_head_run: null,
      head_blocker: 'BRANCH_HEAD_NOT_FROZEN',
    }],
  };
  assert.equal(await validates(validationCycleExperimentLineageV2ResponseSchema, response), true);
  assert.equal(await validates(validationCycleExperimentLineageV2ResponseSchema, {
    ...response,
    branches: [{
      ...response.branches[1],
      head_blocker: null,
    }],
  }), false);
  assert.equal(await validates(validationCycleExperimentLineageV2ResponseSchema, {
    ...response,
    branches: [{
      ...response.branches[0],
      effective_head_run: {
        ...response.branches[0]!.effective_head_run,
        caller_run_ref: 'forbidden',
      },
    }],
  }), false);
});

test('revision history schema preserves superseded revisions and server-reported run refs', async () => {
  const response = {
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    branch_id: 'branch-1',
    branch_key: 'main',
    parent_branch_key: null,
    history_includes_superseded_revisions: true,
    revisions: [{
      work_order_revision_id: 'revision-1',
      revision_sequence: 1,
      content_hash: hash('d'),
      parent_revision_id: null,
      admission: {
        admitted_at: '2026-07-24T01:00:00.000Z',
        business_idempotency_key: 'admit-1',
      },
      is_current_admitted: false,
      is_head_run_source: false,
      run_ref: {
        run_id: 'run-1',
        run_manifest_hash: hash('e'),
      },
      cell_count: 2,
    }, {
      work_order_revision_id: 'revision-2',
      revision_sequence: 2,
      content_hash: hash('f'),
      parent_revision_id: 'revision-1',
      admission: {
        admitted_at: '2026-07-24T02:00:00.000Z',
        business_idempotency_key: 'admit-2',
      },
      is_current_admitted: true,
      is_head_run_source: true,
      run_ref: {
        run_id: 'run-2',
        run_manifest_hash: hash('0'),
      },
      cell_count: 2,
    }],
  };
  assert.equal(await validates(workOrderBranchRevisionHistoryV2ResponseSchema, response), true);
  assert.equal(await validates(workOrderBranchRevisionHistoryV2ResponseSchema, {
    ...response,
    history_includes_superseded_revisions: false,
  }), false);
  assert.equal(await validates(workOrderBranchRevisionHistoryV2ResponseSchema, {
    ...response,
    revisions: [{
      ...response.revisions[0],
      content_hash: 'caller-hash',
    }],
  }), false);
});
