import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  PAPER_IMPLEMENTATION_EVIDENCE_V2_REASON_CODES,
  closeValidationCycleV2RequestSchema,
  closeValidationCycleV2ResponseSchema,
  ingestQualifiedEvidenceCandidateV2RequestSchema,
  paperImplementationEvidenceTraceManifestV2Schema,
  paperImplementationRunEvidenceUnitV2Schema,
  validationCycleClosedV1Schema,
  validationCycleClosureV2Schema,
  validationCycleClosureWatermarkV2Schema,
  validationCycleReadinessEvaluationV2Schema,
} from './paper-implementation-evidence-v2-contracts.js';

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

const reu = {
  run_evidence_unit_id: 'reu-001',
  schema_version: 'v1',
  implementation_project_id: 'project-001',
  validation_cycle_id: 'cycle-001',
  branch_id: 'branch-001',
  work_order_revision_id: 'revision-001',
  work_order_revision_hash: hash('1'),
  branch_revision_sequence: 1,
  run_id: 'run-001',
  run_manifest_hash: hash('2'),
  evidence_candidate_id: 'candidate-001',
  evidence_candidate_content_hash: hash('3'),
  validation_report_id: 'report-001',
  validation_hash: hash('4'),
  evaluation_protocol_revision_id: 'protocol-rev-001',
  evaluation_protocol_content_hash: hash('5'),
  content_hash: hash('6'),
};

const watermark = {
  schema_version: 'v1',
  validation_cycle_id: 'cycle-001',
  expected_cycle_version: 3,
  ordered_branches: [
    {
      ordinal: 1,
      branch_id: 'branch-001',
      branch_key: 'main-line',
      current_admitted_revision_id: 'revision-001',
      current_admitted_revision_hash: hash('1'),
      branch_revision_sequence: 1,
      effective_head_run_id: 'run-001',
      effective_head_run_manifest_hash: hash('2'),
      head_blocker: null,
      ordered_cells: [
        {
          ordinal: 1,
          run_cell_id: 'run-cell-001',
          cell_key: 'cell-a',
          ordered_attempts: [
            {
              ordinal: 1,
              execution_attempt_id: 'attempt-001',
              lifecycle_state: 'succeeded',
              execution_mode: 'simulation',
              provenance: 'non_production_fake_provider',
            },
          ],
          complete_result_ref: null,
          eligibility_code: 'SCIENTIFIC_EXECUTION_NOT_STARTED',
        },
      ],
      eligible_run_evidence_unit_refs: [],
    },
  ],
  active_real_attempt_count: 0,
  closure_input_hash: hash('7'),
};

const closure = {
  closure_id: 'closure-001',
  schema_version: 'v1',
  validation_cycle_id: 'cycle-001',
  cycle_version_at_closure: 3,
  closure_kind: 'control_flow_validated_no_paper_evidence',
  scientific_disposition: null,
  selected_exit_key: null,
  accepted_proposal_id: null,
  accepted_proposal_hash: null,
  closure_watermark: watermark,
  closure_snapshot_hash: hash('8'),
};

test('run evidence unit v2 schema accepts identity/lineage and rejects status axes', async () => {
  assert.equal(await validates(paperImplementationRunEvidenceUnitV2Schema, reu), true);
  for (const forbidden of [
    { run_status: 'succeeded' },
    { run_status: 'failed' },
    { scientific_disposition: 'positive' },
    { trusted: true },
    { failure_summary: 'x' },
  ]) {
    assert.equal(
      await validates(paperImplementationRunEvidenceUnitV2Schema, { ...reu, ...forbidden }),
      false,
    );
  }
});

test('trace manifest v2 schema requires ordered exact refs with closed kinds', async () => {
  const manifest = {
    trace_manifest_id: 'trace-001',
    schema_version: 'v1',
    run_evidence_unit_id: reu.run_evidence_unit_id,
    ordered_trace_refs: [
      { ordinal: 1, ref_kind: 'evidence_candidate', ref_id: 'candidate-001', ref_hash: hash('3') },
      { ordinal: 2, ref_kind: 'run', ref_id: 'run-001', ref_hash: hash('2') },
    ],
    content_hash: hash('9'),
  };
  assert.equal(await validates(paperImplementationEvidenceTraceManifestV2Schema, manifest), true);
  assert.equal(
    await validates(paperImplementationEvidenceTraceManifestV2Schema, {
      ...manifest,
      ordered_trace_refs: [
        { ordinal: 1, ref_kind: 'legacy_record', ref_id: 'x', ref_hash: hash('3') },
      ],
    }),
    false,
  );
  assert.equal(
    await validates(paperImplementationEvidenceTraceManifestV2Schema, {
      ...manifest,
      ordered_trace_refs: [],
    }),
    false,
  );
});

test('gateway ingress request is identity-only', async () => {
  const request = {
    evidence_candidate_id: 'candidate-001',
    expected_candidate_content_hash: hash('3'),
    idempotency_key: 'ingest-candidate-001',
  };
  assert.equal(await validates(ingestQualifiedEvidenceCandidateV2RequestSchema, request), true);
  for (const forbidden of [
    { run_status: 'succeeded' },
    { validation_status: 'passed' },
    { trusted_evidence: true },
    { run_evidence_unit_id: 'reu-custom' },
  ]) {
    assert.equal(
      await validates(ingestQualifiedEvidenceCandidateV2RequestSchema, {
        ...request,
        ...forbidden,
      }),
      false,
    );
  }
});

test('closure watermark v2 schema accepts current-effective scope with null-head blocker branches', async () => {
  assert.equal(await validates(validationCycleClosureWatermarkV2Schema, watermark), true);
  const blockedBranch = {
    ...watermark.ordered_branches[0],
    effective_head_run_id: null,
    effective_head_run_manifest_hash: null,
    head_blocker: 'BRANCH_HEAD_NOT_FROZEN',
    ordered_cells: [],
  };
  assert.equal(
    await validates(validationCycleClosureWatermarkV2Schema, {
      ...watermark,
      ordered_branches: [blockedBranch],
    }),
    true,
  );
  assert.equal(
    await validates(validationCycleClosureWatermarkV2Schema, {
      ...watermark,
      ordered_branches: [],
    }),
    false,
  );
});

test('readiness evaluation v2 schema is server-derived and closed', async () => {
  const evaluation = {
    schema_version: 'v1',
    validation_cycle_id: 'cycle-001',
    status: 'ready_no_evidence',
    ordered_blockers: [],
    watermark,
    eligible_run_evidence_unit_count: 0,
  };
  assert.equal(await validates(validationCycleReadinessEvaluationV2Schema, evaluation), true);
  assert.equal(
    await validates(validationCycleReadinessEvaluationV2Schema, {
      ...evaluation,
      status: 'ready_for_interpretation',
    }),
    false,
  );
});

test('close request carries identity, CAS expectations and the human decision only', async () => {
  const request = {
    validation_cycle_id: 'cycle-001',
    expected_cycle_version: 3,
    expected_closure_input_hash: hash('7'),
    closure_kind: 'control_flow_validated_no_paper_evidence',
    accepted_proposal_id: null,
    expected_proposal_hash: null,
    corrected_scientific_disposition: null,
    idempotency_key: 'close-cycle-001-v3',
  };
  assert.equal(await validates(closeValidationCycleV2RequestSchema, request), true);
  for (const forbidden of [
    { cycle_assessment: { disposition: 'positive' } },
    { decision_exit: 'proceed' },
    { outputs: [{ kind: 'free_form' }] },
    { scientific_disposition: 'positive' },
    { closure_snapshot_hash: hash('8') },
  ]) {
    assert.equal(
      await validates(closeValidationCycleV2RequestSchema, { ...request, ...forbidden }),
      false,
    );
  }
});

test('closure v2 schema binds embedded watermark and nullable disposition/exit pairs', async () => {
  assert.equal(await validates(validationCycleClosureV2Schema, closure), true);
  assert.equal(await validates(closeValidationCycleV2ResponseSchema, { closure }), true);
  assert.equal(
    await validates(validationCycleClosureV2Schema, {
      ...closure,
      scientific_disposition: 'not_started',
    }),
    false,
  );
  assert.equal(
    await validates(validationCycleClosureV2Schema, {
      ...closure,
      result_interpretation_packet_id: 'packet-001',
    }),
    false,
  );
});

test('validation cycle closed event v1 schema binds exact closure identity', async () => {
  const event = {
    event_schema: 'ValidationCycleClosed@v1',
    validation_cycle_id: 'cycle-001',
    closure_id: 'closure-001',
    closure_snapshot_hash: hash('8'),
    closure_kind: 'control_flow_validated_no_paper_evidence',
    scientific_disposition: null,
    closure_input_hash: hash('7'),
  };
  assert.equal(await validates(validationCycleClosedV1Schema, event), true);
  assert.equal(
    await validates(validationCycleClosedV1Schema, { ...event, event_schema: 'ValidationCycleClosed@v2' }),
    false,
  );
});

test('PI evidence reason-code registry matches the Pack C frozen baseline subset', () => {
  assert.deepEqual(PAPER_IMPLEMENTATION_EVIDENCE_V2_REASON_CODES, [
    'EVIDENCE_CANDIDATE_NOT_ELIGIBLE',
    'EVIDENCE_PROVENANCE_REJECTED',
    'BRANCH_HEAD_NOT_FROZEN',
    'CYCLE_ACTIVE_REAL_ATTEMPT',
    'CYCLE_CLOSURE_SCOPE_DRIFT',
    'CYCLE_ALREADY_CLOSED',
    'CLOSURE_PROPOSAL_STALE',
  ]);
});
