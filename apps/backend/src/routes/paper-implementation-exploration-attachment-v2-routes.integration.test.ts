import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type {
  PaperImplementationExplorationAttachmentV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-exploration-attachment-v2-contracts';

import { PaperImplementationExplorationAttachmentV2Controller } from '../controllers/paper-implementation-exploration-attachment-v2-controller.js';
import { registerPaperImplementationExplorationAttachmentV2Routes } from './paper-implementation-exploration-attachment-v2-routes.js';

const PATH = '/paper-implementation/projects/project-1/validation-cycles/cycle-1/exploration-specifications/spec-1/revisions/1/attach';
const HASH = `sha256:${'a'.repeat(64)}`;
const NOW = '2026-08-02T15:00:00.000Z';

test('exploration attachment route rejects caller-authored authority before dispatch', async () => {
  let calls = 0;
  const app = Fastify({ logger: false });
  await registerPaperImplementationExplorationAttachmentV2Routes(
    app,
    new PaperImplementationExplorationAttachmentV2Controller({
      async attach() { calls += 1; return response(false); },
    }),
  );
  const result = await app.inject({
    method: 'POST',
    url: PATH,
    payload: {
      branch_key: 'branch-1',
      business_idempotency_key: 'command-1',
      admission_id: 'caller-authored',
    },
  });
  assert.equal(result.statusCode, 400, result.body);
  assert.equal(result.json().error.details.reason_code, 'EXPLORATION_ATTACHMENT_COMMAND_INVALID');
  assert.equal(calls, 0);
  await app.close();
});

test('exploration attachment route returns 201 for commit and 200 for replay', async () => {
  let replayed = false;
  let observedParams: unknown;
  let observedRequest: unknown;
  const app = Fastify({ logger: false });
  await registerPaperImplementationExplorationAttachmentV2Routes(
    app,
    new PaperImplementationExplorationAttachmentV2Controller({
      async attach(params, request) {
        observedParams = params;
        observedRequest = request;
        const result = response(replayed);
        replayed = true;
        return result;
      },
    }),
  );
  const input = {
    method: 'POST' as const,
    url: PATH,
    payload: { branch_key: 'branch-1', business_idempotency_key: 'command-1' },
  };
  const created = await app.inject(input);
  const replay = await app.inject(input);
  assert.equal(created.statusCode, 201, created.body);
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal(replay.json().replayed, true);
  assert.deepEqual({ ...(observedParams as Record<string, unknown>) }, {
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    spec_id: 'spec-1',
    spec_revision: 1,
  });
  assert.deepEqual({ ...(observedRequest as Record<string, unknown>) }, {
    branch_key: 'branch-1',
    business_idempotency_key: 'command-1',
  });
  await app.close();
});

function response(replayed: boolean): PaperImplementationExplorationAttachmentV2Response {
  const branchFrame = {
    frame_schema_version: 'v1' as const,
    display_name: 'Attached branch',
    scientific_intent: 'Verify attachment route.',
    comparison_role: 'primary' as const,
    parent_branch_key: null,
  };
  const workOrder = {
    work_order_schema_version: 'v1' as const,
    title: 'Attached work order',
    objective: 'Verify attachment route.',
    readiness_attestation_id: 'readiness-1',
    readiness_attestation_hash: HASH,
    asset_dependencies: [{
      asset_type: 'EvaluationProtocol' as const,
      logical_id: 'protocol-1',
      revision_id: 'protocol-revision-1',
      revision_sequence: 1,
      content_hash: HASH,
    }],
    run_policy: { max_attempts_per_cell: 2, timeout_seconds: 300 },
  };
  const cell = {
    work_order_cell_id: 'cell-id-1',
    work_order_revision_id: 'revision-1',
    ordinal: 1,
    cell_key: 'cell-1',
    seed: 7,
    repeat_index: 0,
    parameters: [],
    required_result_contract: { metrics: [], artifacts: [] },
    cell_hash: HASH,
  };
  return {
    attachment: {
      attachment_id: 'attachment-1',
      spec_id: 'spec-1',
      spec_revision: 1,
      spec_revision_id: 'spec-revision-1',
      spec_content_hash: HASH,
      implementation_project_id: 'project-1',
      validation_cycle_id: 'cycle-1',
      branch_id: 'branch-id-1',
      branch_key: 'branch-1',
      work_order_revision_id: 'revision-1',
      admission_id: 'admission-1',
      approved_plan_hash: HASH,
      attached_at: NOW,
    },
    branch: {
      branch_id: 'branch-id-1',
      implementation_project_id: 'project-1',
      validation_cycle_id: 'cycle-1',
      branch_key: 'branch-1',
      branch_frame: branchFrame,
      branch_frame_hash: HASH,
      state_version: 1,
      current_admitted_revision_id: 'revision-1',
      current_admitted_revision_sequence: 1,
      head_run_id: null,
      head_run_manifest_hash: null,
      head_source_event_id: null,
      created_at: NOW,
      updated_at: NOW,
    },
    revision: {
      work_order_revision_id: 'revision-1',
      branch_id: 'branch-id-1',
      revision_sequence: 1,
      work_order_revision: workOrder,
      content_hash: HASH,
      cell_plan_hash: HASH,
      approved_plan_hash: HASH,
      created_at: NOW,
    },
    cells: [cell],
    admission: {
      admission_id: 'admission-1',
      work_order_revision_id: 'revision-1',
      approved_plan_hash: HASH,
      business_idempotency_key: 'command-1',
      admitted_by: 'system:paper-implementation-experiment-v2-admission',
      admitted_at: NOW,
    },
    replayed,
  };
}
