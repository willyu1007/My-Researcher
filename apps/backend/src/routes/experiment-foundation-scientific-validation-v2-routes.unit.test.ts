import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import type {
  GenerateExperimentResultV2Request,
  ValidateScientificBatchV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';

import { ExperimentFoundationScientificValidationV2Controller } from '../controllers/experiment-foundation-scientific-validation-v2-controller.js';
import { registerExperimentFoundationScientificValidationV2Routes } from './experiment-foundation-scientific-validation-v2-routes.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
const generatedResult = {
  result_id: 'result-1',
  schema_version: 'v2' as const,
  run_id: 'run-1',
  run_manifest_hash: hash('1'),
  run_cell_id: 'cell-1',
  cell_key: 'cell-1',
  training_task_spec_id: 'task-1',
  training_task_spec_hash: hash('2'),
  execution_attempt_id: 'attempt-1',
  collection_attempt_id: 'collection-1',
  source_output_id: 'source-1',
  source_output_hash: hash('3'),
  source_output_kind: 'scientific_result_manifest' as const,
  source_output_class: 'scientific_source' as const,
  parser_profile_version: 'parser@v1',
  parser_profile_hash: hash('4'),
  evaluation_protocol: {
    asset_type: 'EvaluationProtocol' as const,
    logical_id: 'protocol-1',
    revision_id: 'protocol-revision-1',
    revision_sequence: 1,
    content_hash: hash('5'),
  },
  provenance: 'real_provider' as const,
  metric_observations: [{
    observation_id: 'observation-1', ordinal: 1, observation_key: 'quality',
    metric_key: 'quality', split_key: 'test', value: 0.8,
    value_type: 'number' as const, unit: 'score',
    statistic: { kind: 'mean' as const, sample_size: 10 },
    uncertainty: { kind: 'none' as const, reason: 'not_required_by_protocol' as const },
  }],
  artifact_observations: [],
  derivation_hash: hash('6'),
  content_hash: hash('7'),
};

const validation = {
  report: {
    report_id: 'report-1',
    schema_version: 'v1' as const,
    run_id: 'run-1',
    run_manifest_hash: hash('1'),
    ordered_cell_results: [{
      ordinal: 1, run_cell_id: 'cell-1', cell_key: 'cell-1',
      result_id: 'result-1', result_content_hash: hash('7'),
    }],
    evaluation_protocol: generatedResult.evaluation_protocol,
    validator_profile_version: 'scientific_validator_profile@v1' as const,
    validator_profile_hash: hash('8'),
    ordered_rule_results: [{
      ordinal: 1, rule_id: 'rule-1', rule_type: 'metric_contract@v1' as const,
      status: 'passed' as const, detail_code: null,
    }],
    ordered_comparison_results: [{
      ordinal: 1,
      comparison_key: 'primary-quality',
      rule_hash: hash('a'),
      status: 'passed' as const,
      detail_code: null,
      fact: {
        schema_version: 'ExperimentFoundationScientificComparisonFact@v1' as const,
        comparison_fact_id: 'comparison-fact-1',
        ordinal: 1,
        comparison_key: 'primary-quality',
        evaluation_protocol_revision_hash: hash('5'),
        rule_hash: hash('a'),
        rule_projection: {
          effect_kind: 'absolute_difference' as const,
          direction: 'higher_is_support' as const,
          support_min: 0.1,
          contradiction_max: -0.1,
          uncertainty_policy: {
            kind: 'confidence_interval_guard' as const,
            confidence_level: 0.95,
            method_key: 'bootstrap',
          },
        },
        left_observation_ref: {
          run_cell_id: 'cell-1', result_id: 'result-1', result_content_hash: hash('7'),
          observation_id: 'observation-1', observation_ordinal: 1,
          observation_key: 'quality', observation_hash: hash('b'),
        },
        right_observation_ref: {
          run_cell_id: 'cell-2', result_id: 'result-2', result_content_hash: hash('c'),
          observation_id: 'observation-2', observation_ordinal: 1,
          observation_key: 'quality', observation_hash: hash('d'),
        },
        raw_effect: { kind: 'absolute_difference' as const, value: 0.2, unit: 'score' },
        raw_effect_interval: { lower: 0.12, upper: 0.28, unit: 'score' },
        registered_relation: 'supports_registered_expectation' as const,
        relation_reason: 'support_band_met' as const,
        comparison_fact_hash: hash('e'),
      },
    }],
    status: 'passed' as const,
    validation_hash: hash('9'),
  },
  evidence_candidate: {
    candidate_id: 'candidate-1', schema_version: 'v1' as const, run_id: 'run-1',
    run_manifest_hash: hash('1'), validation_report_id: 'report-1',
    validation_hash: hash('9'), content_hash: hash('0'),
  },
};

test('scientific product routes expose only identity commands and durable reads', async () => {
  const generatedRequests: GenerateExperimentResultV2Request[] = [];
  const validationRequests: ValidateScientificBatchV2Request[] = [];
  const controller = new ExperimentFoundationScientificValidationV2Controller({
    generateExperimentResult: async (request) => {
      generatedRequests.push(request);
      return generatedResult;
    },
    validateScientificBatch: async (request) => {
      validationRequests.push(request);
      return validation;
    },
    getScientificValidation: async (runId) => runId === 'run-1' ? validation : null,
  });
  const app = Fastify();
  await registerExperimentFoundationScientificValidationV2Routes(app, controller);
  await app.ready();

  const injected = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/scientific-results',
    payload: {
      run_cell_id: 'cell-1',
      scientific_source_output_id: 'source-1',
      idempotency_key: 'source-1:generate-scientific-result@v1',
      metric_observations: [{ value: 999 }],
    },
  });
  assert.equal(injected.statusCode, 400);
  assert.equal(generatedRequests.length, 0);

  const generated = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/scientific-results',
    payload: {
      run_cell_id: 'cell-1',
      scientific_source_output_id: 'source-1',
      idempotency_key: 'source-1:generate-scientific-result@v1',
    },
  });
  assert.equal(generated.statusCode, 200);
  assert.equal(generatedRequests.length, 1);

  const validated = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/v2/scientific-validations',
    payload: {
      run_id: 'run-1', expected_run_manifest_hash: hash('1'),
      idempotency_key: 'run-1:scientific-validation@v1',
    },
  });
  assert.equal(validated.statusCode, 200);
  assert.equal(validationRequests.length, 1);
  assert.deepEqual(
    validated.json().report.ordered_comparison_results,
    validation.report.ordered_comparison_results,
  );
  const read = await app.inject({
    method: 'GET', url: '/experiment-foundation/v2/scientific-validations/run-1',
  });
  assert.equal(read.statusCode, 200);
  assert.deepEqual(
    read.json().report.ordered_comparison_results,
    validation.report.ordered_comparison_results,
  );
  assert.equal((await app.inject({
    method: 'GET', url: '/experiment-foundation/v2/scientific-validations/missing',
  })).statusCode, 404);

  await app.close();
});
