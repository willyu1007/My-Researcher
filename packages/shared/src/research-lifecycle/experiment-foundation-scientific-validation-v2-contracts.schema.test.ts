import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_REASON_CODES_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  evidenceCandidateQualifiedV1Schema,
  evidenceCandidateV2Schema,
  experimentResultCellV2Schema,
  scientificValidationReportV2Schema,
  validateScientificBatchV2RequestSchema,
} from './experiment-foundation-scientific-validation-v2-contracts.js';

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

const resultCell = {
  result_id: 'result-001',
  schema_version: 'v1',
  run_id: 'run-001',
  run_manifest_hash: hash('1'),
  run_cell_id: 'run-cell-001',
  cell_key: 'cell-a',
  training_task_spec_id: 'task-spec-001',
  training_task_spec_hash: hash('2'),
  execution_attempt_id: 'attempt-001',
  provenance: 'real_provider',
  metric_observations: [
    {
      metric_key: 'faithfulness',
      split_key: 'test',
      value: 0.91,
      value_type: 'number',
      unit: 'score',
    },
  ],
  artifact_observations: [
    {
      artifact_kind: 'metrics_json',
      file_name: 'metrics.json',
      content_hash: hash('3'),
      byte_size: 2048,
      parser_binding: 'metrics_json_parser@v1',
    },
  ],
  content_hash: hash('4'),
};

const report = {
  report_id: 'report-001',
  schema_version: 'v1',
  run_id: resultCell.run_id,
  run_manifest_hash: resultCell.run_manifest_hash,
  ordered_cell_results: [
    {
      ordinal: 1,
      run_cell_id: resultCell.run_cell_id,
      cell_key: resultCell.cell_key,
      result_id: resultCell.result_id,
      result_content_hash: resultCell.content_hash,
    },
  ],
  evaluation_protocol: {
    asset_type: 'EvaluationProtocol',
    logical_id: 'protocol-001',
    revision_id: 'protocol-rev-001',
    revision_sequence: 1,
    content_hash: hash('5'),
  },
  validator_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  validator_profile_hash: hash('6'),
  ordered_rule_results: [
    {
      ordinal: 1,
      rule_id: 'rule-001',
      rule_type: 'metric_contract@v1',
      status: 'passed',
      detail_code: null,
    },
  ],
  status: 'passed',
  validation_hash: hash('7'),
};

const candidate = {
  candidate_id: 'candidate-001',
  schema_version: 'v1',
  run_id: report.run_id,
  run_manifest_hash: report.run_manifest_hash,
  validation_report_id: report.report_id,
  validation_hash: report.validation_hash,
  content_hash: hash('8'),
};

test('experiment result cell v2 schema accepts a complete real-provider envelope', async () => {
  assert.equal(await validates(experimentResultCellV2Schema, resultCell), true);
});

test('experiment result cell v2 schema rejects simulation provenance', async () => {
  assert.equal(
    await validates(experimentResultCellV2Schema, {
      ...resultCell,
      provenance: 'non_production_fake_provider',
    }),
    false,
  );
});

test('experiment result cell v2 schema rejects a malformed content hash', async () => {
  assert.equal(
    await validates(experimentResultCellV2Schema, { ...resultCell, content_hash: 'sha256:short' }),
    false,
  );
});

test('scientific validation report v2 schema accepts a passed batch report', async () => {
  assert.equal(await validates(scientificValidationReportV2Schema, report), true);
});

test('scientific validation report v2 schema rejects an empty cell-result list', async () => {
  assert.equal(
    await validates(scientificValidationReportV2Schema, { ...report, ordered_cell_results: [] }),
    false,
  );
});

test('scientific validation report v2 schema rejects an unknown status', async () => {
  assert.equal(
    await validates(scientificValidationReportV2Schema, { ...report, status: 'accepted_partial' }),
    false,
  );
});

test('scientific validation report v2 schema rejects a caller-authored validator profile', async () => {
  assert.equal(
    await validates(scientificValidationReportV2Schema, {
      ...report,
      validator_profile_version: 'custom_profile@v9',
    }),
    false,
  );
});

test('scientific validation report v2 schema rejects an unknown rule type', async () => {
  assert.equal(
    await validates(scientificValidationReportV2Schema, {
      ...report,
      ordered_rule_results: [
        { ...report.ordered_rule_results[0], rule_type: 'statistical_test@v1' },
      ],
    }),
    false,
  );
});

test('evidence candidate v2 schema accepts a report-bound candidate and rejects extra trust fields', async () => {
  assert.equal(await validates(evidenceCandidateV2Schema, candidate), true);
  assert.equal(
    await validates(evidenceCandidateV2Schema, { ...candidate, trusted: true }),
    false,
  );
});

test('evidence candidate qualified event schema binds exact scope identities', async () => {
  const event = {
    event_schema: EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
    candidate_id: candidate.candidate_id,
    candidate_content_hash: candidate.content_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    evaluation_protocol_revision_id: report.evaluation_protocol.revision_id,
    evaluation_protocol_content_hash: report.evaluation_protocol.content_hash,
  };
  assert.equal(await validates(evidenceCandidateQualifiedV1Schema, event), true);
  assert.equal(
    await validates(evidenceCandidateQualifiedV1Schema, {
      ...event,
      event_schema: 'EvidenceCandidateQualified@v2',
    }),
    false,
  );
});

test('validate scientific batch request schema is identity-only', async () => {
  assert.equal(
    await validates(validateScientificBatchV2RequestSchema, {
      run_id: 'run-001',
      expected_run_manifest_hash: hash('1'),
      idempotency_key: 'validate-run-001-1',
    }),
    true,
  );
  assert.equal(
    await validates(validateScientificBatchV2RequestSchema, {
      run_id: 'run-001',
      expected_run_manifest_hash: hash('1'),
      idempotency_key: 'validate-run-001-1',
      validation_status: 'passed',
    }),
    false,
  );
});

test('reason-code registry matches the Pack C frozen baseline', () => {
  assert.deepEqual(EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_REASON_CODES_V2, [
    'EF_V2_SCIENTIFIC_VALIDATION_DISABLED',
    'UNSUPPORTED_RULE',
    'VALIDATION_SUBJECT_INCOMPLETE',
    'VALIDATION_SCOPE_DRIFT',
    'VALIDATION_RESULT_CONFLICT',
    'VALIDATION_IDEMPOTENCY_CONFLICT',
    'EVIDENCE_CANDIDATE_NOT_ELIGIBLE',
    'EVIDENCE_PROVENANCE_REJECTED',
  ]);
});
