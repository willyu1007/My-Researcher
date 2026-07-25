import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseArgs,
  deriveChildRunId,
  inspectChildSummary,
  inspectGoldenClosureRecord,
  inspectUsageFitEvidence,
  buildProductizationStatuses,
  evaluateM6Checks,
  GOLDEN_CLOSURE_EXPECTATIONS,
  DURABLE_RECORD_PINS,
} from './experiment-foundation-m6-release-gate.mjs';

test('M6 gate parseArgs accepts only a safe run id', () => {
  assert.deepEqual(parseArgs(['--run-id', 't132-m6-x']), { runId: 't132-m6-x' });
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(['--run-id', '../evil']));
  assert.throws(() => parseArgs(['--unknown']));
});

test('M6 gate derives child run ids including the packc-final grammar', () => {
  assert.equal(
    deriveChildRunId('m5_agent', 't132-m6-release-20260725-v1'),
    't132-m6-release-20260725-v1-m5-agent',
  );
  assert.equal(
    deriveChildRunId('packc_final', 't132-m6-release-20260725-v2'),
    'packc-final-20260725-r902',
  );
  assert.throws(() => deriveChildRunId('packc_final', 'no-date-here'));
});

test('M6 gate child inspection requires passed status and all-passed checks', () => {
  const good = inspectChildSummary('m5_agent', {
    status: 'passed',
    checks: { 'M5-01': { status: 'passed' } },
  });
  assert.equal(good.check_count, 1);
  assert.throws(() => inspectChildSummary('x', { status: 'blocked', checks: {} }));
  assert.throws(() => inspectChildSummary('x', {
    status: 'passed',
    checks: { A: { status: 'passed' }, B: { status: 'failed' } },
  }));
});

function goldenRecordFixture() {
  return {
    validation_cycle_id: GOLDEN_CLOSURE_EXPECTATIONS.validation_cycle_id,
    submitted_request: {
      closure_kind: GOLDEN_CLOSURE_EXPECTATIONS.closure_kind,
      expected_closure_input_hash: GOLDEN_CLOSURE_EXPECTATIONS.input_hash,
      idempotency_key: GOLDEN_CLOSURE_EXPECTATIONS.idempotency_key,
      corrected_scientific_disposition: null,
    },
    closure_response: { closure: { closure_id: GOLDEN_CLOSURE_EXPECTATIONS.closure_id } },
  };
}

test('M6 gate golden-closure inspection pins the frozen expectations', () => {
  const inspection = inspectGoldenClosureRecord(goldenRecordFixture());
  assert.equal(inspection.exact, true);
  assert.equal(inspection.snapshot_hash, GOLDEN_CLOSURE_EXPECTATIONS.snapshot_hash);
  const drift = goldenRecordFixture();
  drift.submitted_request.closure_kind = 'scientific_evidence_assessed';
  assert.throws(() => inspectGoldenClosureRecord(drift));
  const wrongId = goldenRecordFixture();
  wrongId.closure_response.closure.closure_id = 'pi_validation_cycle_closure_v2_other';
  assert.throws(() => inspectGoldenClosureRecord(wrongId));
});

function usageFitFixture() {
  return {
    assessment: 't132-m6-usage-fit@v1',
    call_count: 5,
    manually_assembled_identities: [],
    reverse_trace_fully_resolved: true,
    preparation: {
      prepared_request_present: true,
      derived_closure_kind: 'control_flow_validated_no_paper_evidence',
    },
  };
}

const RUBRIC_FIXTURE = [
  '| D1 preparation cost | **5** | x |',
  '| D2 decision clarity | **5** | x |',
  '| D3 traceability | **5** | x |',
  'Verdict: **usage-fit passed**',
].join('\n');

test('M6 gate usage-fit inspection requires the scored rubric and exact evidence', () => {
  const inspection = inspectUsageFitEvidence(usageFitFixture(), RUBRIC_FIXTURE);
  assert.deepEqual(inspection.scores, { d1: 5, d2: 5, d3: 5 });
  const badTrace = usageFitFixture();
  badTrace.reverse_trace_fully_resolved = false;
  assert.throws(() => inspectUsageFitEvidence(badTrace, RUBRIC_FIXTURE));
  assert.throws(() => inspectUsageFitEvidence(usageFitFixture(), 'no verdict here'));
});

test('M6 gate productization statuses stay inside the frozen vocabulary', () => {
  const statuses = buildProductizationStatuses(
    { checks: { workflow_simulation_status: 'workflow_simulation_passed' } },
    { closure_kind: 'control_flow_validated_no_paper_evidence' },
  );
  assert.equal(statuses.cloud_preflight, 'cloud_preflight_passed');
  const nested = buildProductizationStatuses(
    { workflow_simulation_status: { run_id: 'r', workflow_simulation_status: 'workflow_simulation_passed' } },
    { closure_kind: 'control_flow_validated_no_paper_evidence' },
  );
  assert.equal(nested.workflow_simulation, 'workflow_simulation_passed');
  assert.throws(() => buildProductizationStatuses(
    { checks: { workflow_simulation_status: 'workflow_simulation_failed' } },
    { closure_kind: 'control_flow_validated_no_paper_evidence' },
  ));
});

test('M6 gate evaluates every check over named concrete fields', () => {
  const summary = {
    children: {
      packb_simulation: { status: 'passed' },
      packc_final: { status: 'passed' },
      m5_agent: { status: 'passed' },
      m7_provider: { status: 'passed' },
    },
    durable_records: {
      verified_count: DURABLE_RECORD_PINS.length,
      mismatch_count: 0,
      cloud_preflight_doc_pinned: true,
    },
    lit0204_import_lane: { tap: { passed: 1, failed: 0, skipped: 0 } },
    api_docs: { openapi_quality_exit: 0, api_index_verify_exit: 0, path_coverage_tap_failed: 0 },
    usage_fit: { exact: true, reverse_trace_fully_resolved: true },
    golden_closure: { exact: true, closure_kind: 'control_flow_validated_no_paper_evidence' },
    productization_statuses: {
      workflow_simulation: 'workflow_simulation_passed',
      cloud_preflight: 'cloud_preflight_passed',
      cycle_closure_kind: 'control_flow_validated_no_paper_evidence',
    },
  };
  const checks = evaluateM6Checks(summary);
  assert.equal(Object.keys(checks).length, 10);
  assert.equal(Object.values(checks).every((check) => check.status === 'passed'), true);
  const broken = evaluateM6Checks({ ...summary, durable_records: { ...summary.durable_records, mismatch_count: 1 } });
  assert.equal(broken['M6-05'].status, 'failed');
});
