import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  PaperImplementationExperimentV2AdmissionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  CloseValidationCycleV2Request,
  CloseValidationCycleV2Response,
  ValidationCycleReadinessEvaluationV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';

import { buildApp } from '../app.js';
import {
  PaperImplementationExperimentV2Controller,
  type PaperImplementationExperimentV2AdmissionUseCase,
  type PaperImplementationCycleReadinessV2UseCase,
  type PaperImplementationValidationCycleClosureV2UseCase,
} from '../controllers/paper-implementation-experiment-v2-controller.js';
import { AppError } from '../errors/app-error.js';
import type { PaperImplementationExperimentSpineV2Repository } from '../repositories/experiment-spine-v2.repository.js';
import type { PaperImplementationWorkOrderRepository } from '../repositories/paper-implementation-workorder.repository.js';
import type { PaperImplementationValidationCycleClosureV2Repository } from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import { registerPaperImplementationExperimentV2Routes } from './paper-implementation-experiment-v2-routes.js';

const HASH = `sha256:${'a'.repeat(64)}`;

function requestFixture(): PaperImplementationExperimentV2AdmissionRequest {
  return {
    branch_key: 'ragperf-primary',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'RAGPerf primary branch',
      scientific_intent: 'Measure an exact two-cell RAG evaluation plan.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'RAGPerf adapter-tier evaluation',
      objective: 'Freeze the exact D-19 two-cell control-plane lineage.',
      readiness_attestation_id: 'readiness-protocol-v2',
      readiness_attestation_hash: HASH,
      asset_dependencies: [{
        asset_type: 'EvaluationProtocol',
        logical_id: 'ragperf-protocol',
        revision_id: 'ragperf-protocol-v2-r1',
        revision_sequence: 1,
        content_hash: HASH,
      }],
      run_policy: {
        max_attempts_per_cell: 1,
        timeout_seconds: 300,
      },
    },
    exact_cells: [{
      cell_key: 'cell-1',
      seed: 7,
      repeat_index: 0,
      parameters: [{ name: 'retriever_top_k', value: 5 }],
      required_result_contract: {
        metrics: [],
        artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
      },
    }],
    business_idempotency_key: 'admit-ragperf-primary-r1',
  };
}

function responseFixture(): PaperImplementationExperimentV2AdmissionResponse {
  const request = requestFixture();
  return {
    branch: {
      branch_id: 'branch-1',
      implementation_project_id: 'project-1',
      validation_cycle_id: 'cycle-1',
      branch_key: request.branch_key,
      branch_frame: request.branch_frame,
      branch_frame_hash: HASH,
      state_version: 1,
      current_admitted_revision_id: 'revision-1',
      current_admitted_revision_sequence: 1,
      head_run_id: null,
      head_run_manifest_hash: null,
      head_source_event_id: null,
      created_at: '2026-07-13T00:00:00.000Z',
      updated_at: '2026-07-13T00:00:00.000Z',
    },
    revision: {
      work_order_revision_id: 'revision-1',
      branch_id: 'branch-1',
      revision_sequence: 1,
      work_order_revision: request.work_order_revision,
      content_hash: HASH,
      cell_plan_hash: HASH,
      approved_plan_hash: HASH,
      created_at: '2026-07-13T00:00:00.000Z',
    },
    cells: [{
      ...request.exact_cells[0],
      work_order_cell_id: 'cell-row-1',
      work_order_revision_id: 'revision-1',
      ordinal: 1,
      cell_hash: HASH,
    }],
    admission: {
      admission_id: 'admission-1',
      work_order_revision_id: 'revision-1',
      approved_plan_hash: HASH,
      business_idempotency_key: request.business_idempotency_key,
      admitted_by: 'system:paper-implementation-experiment-v2-admission',
      admitted_at: '2026-07-13T00:00:00.000Z',
    },
    replayed: false,
  };
}

function closureRequestFixture(): CloseValidationCycleV2Request {
  return {
    validation_cycle_id: 'cycle-1',
    expected_cycle_version: 0,
    expected_closure_input_hash: HASH,
    closure_kind: 'control_flow_validated_no_paper_evidence',
    accepted_proposal_id: null,
    expected_proposal_hash: null,
    corrected_scientific_disposition: null,
    idempotency_key: 'close-cycle-1-v1',
  };
}

function closureResponseFixture(): CloseValidationCycleV2Response {
  return {
    closure: {
      closure_id: 'closure-1',
      schema_version: 'v1',
      validation_cycle_id: 'cycle-1',
      cycle_version_at_closure: 0,
      closure_kind: 'control_flow_validated_no_paper_evidence',
      scientific_disposition: null,
      selected_exit_key: null,
      accepted_proposal_id: null,
      accepted_proposal_hash: null,
      closure_watermark: {
        schema_version: 'v1',
        validation_cycle_id: 'cycle-1',
        expected_cycle_version: 0,
        ordered_branches: [{
          ordinal: 1,
          branch_id: 'branch-1',
          branch_key: 'main',
          current_admitted_revision_id: 'revision-1',
          current_admitted_revision_hash: HASH,
          branch_revision_sequence: 1,
          effective_head_run_id: 'run-1',
          effective_head_run_manifest_hash: HASH,
          head_blocker: null,
          ordered_cells: [{
            ordinal: 1,
            run_cell_id: 'run-cell-1',
            cell_key: 'cell-1',
            ordered_attempts: [],
            complete_result_ref: null,
            eligibility_code: 'SCIENTIFIC_EXECUTION_NOT_STARTED',
          }],
          eligible_run_evidence_unit_refs: [],
        }],
        active_real_attempt_count: 0,
        closure_input_hash: HASH,
      },
      closure_snapshot_hash: HASH,
    },
  };
}

function readinessFixture(): ValidationCycleReadinessEvaluationV2 {
  return {
    schema_version: 'v1',
    validation_cycle_id: 'cycle-1',
    status: 'ready_no_evidence',
    ordered_blockers: [],
    watermark: closureResponseFixture().closure.closure_watermark,
    eligible_run_evidence_unit_count: 0,
  };
}

test('v2 admission route injects the server actor and delegates the validated exact scope', async () => {
  const captured: Array<Parameters<PaperImplementationExperimentV2AdmissionUseCase['admit']>[0]> = [];
  const useCase: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit(input) {
      captured.push(input);
      return responseFixture();
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(useCase),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: requestFixture(),
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().revision.work_order_revision_id, 'revision-1');
  assert.equal(captured[0]?.implementation_project_id, 'project-1');
  assert.equal(captured[0]?.validation_cycle_id, 'cycle-1');
  assert.equal(captured[0]?.admitted_by, 'system:paper-implementation-experiment-v2-admission');
  await app.close();
});

test('v2 closure route enforces strict cycle identity and maps the dedicated use case', async () => {
  const admission: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit() {
      return responseFixture();
    },
  };
  const captured: CloseValidationCycleV2Request[] = [];
  const closure: PaperImplementationValidationCycleClosureV2UseCase = {
    async close(request) {
      captured.push(request);
      return closureResponseFixture();
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(admission, closure),
  );

  const success = await app.inject({
    method: 'POST',
    url: '/paper-implementation/validation-cycles/cycle-1/closure/v2',
    payload: closureRequestFixture(),
  });
  assert.equal(success.statusCode, 201, success.body);
  assert.equal(success.json().closure.closure_id, 'closure-1');
  assert.deepEqual(captured, [closureRequestFixture()]);

  const mismatch = await app.inject({
    method: 'POST',
    url: '/paper-implementation/validation-cycles/cycle-other/closure/v2',
    payload: closureRequestFixture(),
  });
  assert.equal(mismatch.statusCode, 400, mismatch.body);
  assert.equal(mismatch.json().error.details.reason_code, 'V2_TYPED_SNAPSHOT_INVALID');
  assert.equal(captured.length, 1);

  const extraField = await app.inject({
    method: 'POST',
    url: '/paper-implementation/validation-cycles/cycle-1/closure/v2',
    payload: { ...closureRequestFixture(), decision_exit: 'proceed' },
  });
  assert.equal(extraField.statusCode, 400, extraField.body);
  assert.equal(captured.length, 1);
  await app.close();
});

test('v2 readiness GET exposes the strict server-derived closure input hash without a write gate', async () => {
  const admission: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit() {
      return responseFixture();
    },
  };
  const readiness: PaperImplementationCycleReadinessV2UseCase = {
    async evaluate(validationCycleId) {
      assert.equal(validationCycleId, 'cycle-1');
      return readinessFixture();
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(admission, undefined, readiness),
  );

  const response = await app.inject({
    method: 'GET',
    url: '/paper-implementation/validation-cycles/cycle-1/closure/v2/readiness',
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().status, 'ready_no_evidence');
  assert.equal(response.json().watermark.closure_input_hash, HASH);
  await app.close();
});

test('v2 admission route serializes the closed success schema and sanitizes validation/500 errors', async () => {
  let mode: 'success' | 'failure' = 'success';
  const useCase: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit() {
      if (mode === 'failure') {
        throw new Error('sensitive internal admission failure');
      }
      return {
        ...responseFixture(),
        server_only_leak: 'must-not-serialize',
      } as PaperImplementationExperimentV2AdmissionResponse;
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(useCase),
  );

  const success = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: requestFixture(),
  });
  assert.equal(success.statusCode, 201);
  assert.equal('server_only_leak' in success.json(), false);

  const invalid = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: {},
  });
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(invalid.json(), {
    error: {
      code: 'INVALID_PAYLOAD',
      message: 'Request payload failed schema validation.',
      details: { reason_code: 'V2_TYPED_SNAPSHOT_INVALID' },
    },
  });

  mode = 'failure';
  const unexpected = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: requestFixture(),
  });
  assert.equal(unexpected.statusCode, 500);
  assert.deepEqual(unexpected.json(), {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation experiment v2 failure.',
    },
  });
  assert.equal(unexpected.body.includes('sensitive internal admission failure'), false);
  await app.close();
});

test('v2 admission route preserves stable repository read-integrity conflict details', async () => {
  const useCase: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit() {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Stored PI revision canonical hash mismatch.',
        { reason_code: 'BRANCH_REVISION_CONFLICT' },
      );
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(useCase),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: requestFixture(),
  });
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), {
    error: {
      code: 'VERSION_CONFLICT',
      message: 'Stored PI revision canonical hash mismatch.',
      details: { reason_code: 'BRANCH_REVISION_CONFLICT' },
    },
  });
  await app.close();
});

test('v2 admission route rejects caller-authored authority fields before the service', async () => {
  let calls = 0;
  const useCase: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit() {
      calls += 1;
      return responseFixture();
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(useCase),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: {
      ...requestFixture(),
      approved_plan_hash: HASH,
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(calls, 0);

  const nestedResponse = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
    payload: {
      ...requestFixture(),
      work_order_revision: {
        ...requestFixture().work_order_revision,
        canonical_hash: HASH,
      },
    },
  });

  assert.equal(nestedResponse.statusCode, 400);
  assert.equal(calls, 0);
  await app.close();
});

test('v2 admission route rejects PostgreSQL Int overflow before the service', async () => {
  let calls = 0;
  const useCase: PaperImplementationExperimentV2AdmissionUseCase = {
    async admit() {
      calls += 1;
      return responseFixture();
    },
  };
  const app = Fastify({ logger: false });
  await registerPaperImplementationExperimentV2Routes(
    app,
    new PaperImplementationExperimentV2Controller(useCase),
  );

  const overflowPayloads = [
    {
      ...requestFixture(),
      exact_cells: [{ ...requestFixture().exact_cells[0], seed: 2_147_483_648 }],
    },
    {
      ...requestFixture(),
      exact_cells: [{ ...requestFixture().exact_cells[0], seed: -2_147_483_649 }],
    },
    {
      ...requestFixture(),
      exact_cells: [{ ...requestFixture().exact_cells[0], repeat_index: 2_147_483_648 }],
    },
    {
      ...requestFixture(),
      work_order_revision: {
        ...requestFixture().work_order_revision,
        run_policy: {
          ...requestFixture().work_order_revision.run_policy,
          max_attempts_per_cell: 2_147_483_648,
        },
      },
    },
  ];
  for (const payload of overflowPayloads) {
    const response = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
      payload,
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_PAYLOAD');
  }
  assert.equal(calls, 0);
  await app.close();
});

test('A01 app composition keeps admission default-off before scope, v2, or legacy repository work', async () => {
  const previousCapability = process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED;
  delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED;

  let scopeCalls = 0;
  let v2RepositoryCalls = 0;
  let legacyRepositoryCalls = 0;
  const forbiddenRepository = <T extends object>(onCall: () => void): T => new Proxy({} as T, {
    get() {
      return async () => {
        onCall();
        throw new Error('capability-off repository call');
      };
    },
  });
  const app = buildApp({
    paperImplementationExperimentSpineV2Repository:
      forbiddenRepository<PaperImplementationExperimentSpineV2Repository>(
        () => { v2RepositoryCalls += 1; },
      ),
    paperImplementationExperimentV2ScopeReader: {
      async resolveExactScope() {
        scopeCalls += 1;
        throw new Error('capability-off scope call');
      },
    },
    paperImplementationWorkOrderRepository:
      forbiddenRepository<PaperImplementationWorkOrderRepository>(
        () => { legacyRepositoryCalls += 1; },
      ),
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
      payload: requestFixture(),
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      response.json().error.details.reason_code,
      'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
    );
    assert.equal(scopeCalls, 0);
    assert.equal(v2RepositoryCalls, 0);
    assert.equal(legacyRepositoryCalls, 0);
  } finally {
    await app.close();
    if (previousCapability === undefined) {
      delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED;
    } else {
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED = previousCapability;
    }
  }
});

test('C-PI app composition keeps the dedicated closure lane default-off before repository work', async () => {
  let repositoryCalls = 0;
  const repository = new Proxy({} as PaperImplementationValidationCycleClosureV2Repository, {
    get() {
      return async () => {
        repositoryCalls += 1;
        throw new Error('closure capability-off repository call');
      };
    },
  });
  const app = buildApp({
    paperImplementationValidationCycleClosureV2Repository: repository,
  });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/paper-implementation/validation-cycles/cycle-1/closure/v2',
      payload: closureRequestFixture(),
    });
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(
      response.json().error.details.reason_code,
      'PI_EXPERIMENT_V2_CYCLE_CLOSURE_DISABLED',
    );
    assert.equal(repositoryCalls, 0);
  } finally {
    await app.close();
  }
});

test('app fails closed when the admission env is true but the v2 authority is not durable', async () => {
  const previousCapability = process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED;
  const previousCutover = process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED;
  process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED = 'true';
  process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = 'true';
  let scopeCalls = 0;
  let v2Calls = 0;
  const repository = new Proxy({} as PaperImplementationExperimentSpineV2Repository, {
    get() {
      return async () => {
        v2Calls += 1;
        throw new Error('non-durable v2 repository must not receive product intake');
      };
    },
  });
  const app = buildApp({
    paperImplementationExperimentSpineV2Repository: repository,
    paperImplementationExperimentV2ScopeReader: {
      async resolveExactScope() {
        scopeCalls += 1;
        throw new Error('non-durable scope must not be resolved');
      },
    },
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/project-1/validation-cycles/cycle-1/experiment-work-orders/v2/admissions',
      payload: requestFixture(),
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.details.reason_code, 'PI_EXPERIMENT_V2_ADMISSION_DISABLED');
    assert.equal(scopeCalls, 0);
    assert.equal(v2Calls, 0);
  } finally {
    await app.close();
    if (previousCapability === undefined) {
      delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED;
    } else {
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED = previousCapability;
    }
    if (previousCutover === undefined) {
      delete process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED;
    } else {
      process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = previousCutover;
    }
  }
});
