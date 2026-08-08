import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PACKC_FINAL_CHECK_REGISTRY,
  assertExactSummaryKeysets,
  buildInitialSummary,
  canonicalJson,
  canonicalSummarySha256,
  classifyBackendFullSuite,
  deriveSubGateRuns,
  parseArgs,
  updateConvergence,
} from './experiment-foundation-packc-final-gate.mjs';
import { PACKC_EF_REQUIRED_MIGRATIONS } from './experiment-foundation-packc-ef-gate.mjs';
import { PACKC_PI_REQUIRED_SUBTEST_REGISTRY } from './experiment-foundation-packc-pi-gate.mjs';
import {
  PACKC_CUTOVER_CHECK_REGISTRY,
  PACKC_CUTOVER_SUITE_REGISTRY,
} from './experiment-foundation-packc-cutover-gate.mjs';

test('Pack C final gate accepts only the frozen id and derives fresh sub-gate ids', () => {
  assert.deepEqual(parseArgs(['--run-id', 'packc-final-20260722-r1']), {
    gateId: 'packc-final-20260722-r1',
  });
  assert.throws(() => parseArgs(['--run-id', 'packc-final-local']), /must match/u);
  assert.deepEqual(deriveSubGateRuns('packc-final-20260722-r7'), {
    packc_ef: {
      gate_id: 'packc-ef-20260722-r7',
      script_path: '.ai/scripts/experiment-foundation-packc-ef-gate.mjs',
    },
    packc_pi: {
      gate_id: 'packc-pi-20260722-r7',
      script_path: '.ai/scripts/experiment-foundation-packc-pi-gate.mjs',
    },
    packc_cutover: {
      gate_id: 'packc-cutover-20260722-r7',
      script_path: '.ai/scripts/experiment-foundation-packc-cutover-gate.mjs',
    },
  });
});

test('final registry is exactly PC01-PC20 and assigns PC17/PC18 to cutover', () => {
  assert.deepEqual(
    PACKC_FINAL_CHECK_REGISTRY.map((row) => row.id),
    Array.from({ length: 20 }, (_, index) => `PC${String(index + 1).padStart(2, '0')}`),
  );
  assert.deepEqual(PACKC_FINAL_CHECK_REGISTRY[16], {
    id: 'PC17',
    owner_sub_gates: ['packc_cutover'],
    owner_checks: ['PC17'],
  });
  assert.deepEqual(PACKC_FINAL_CHECK_REGISTRY[17], {
    id: 'PC18',
    owner_sub_gates: ['packc_cutover'],
    owner_checks: ['PC18'],
  });
  assert.deepEqual(PACKC_FINAL_CHECK_REGISTRY[18], {
    id: 'PC19',
    owner_sub_gates: ['packc_ef', 'packc_pi'],
    owner_checks: ['PC19-EF', 'PC19-PI'],
  });
  assert.deepEqual(PACKC_EF_REQUIRED_MIGRATIONS, [
    '20260718224543_add_experiment_foundation_pack_c_scientific_validation_v2',
    '20260808090000_add_scientific_source_and_packet_closure_binding',
  ]);
  assert.deepEqual(Object.keys(PACKC_PI_REQUIRED_SUBTEST_REGISTRY), [
    'closure_unit',
    'relational',
  ]);
  assert.ok(PACKC_CUTOVER_CHECK_REGISTRY.every((check) => (
    check.evidence_refs.includes('relay_routing_unit')
      && check.evidence_refs.includes('relay_crash_window_unit')
  )));
  assert.deepEqual(
    PACKC_CUTOVER_SUITE_REGISTRY.slice(-2).map((suite) => suite.evidence_key),
    ['relay_routing_unit', 'relay_crash_window_unit'],
  );
});

test('final summary initializes exact evidence, SHA and registry keysets', () => {
  const summary = buildInitialSummary(
    'packc-final-20260722-r2',
    '2026-07-22T00:00:00.000Z',
  );
  assert.doesNotThrow(() => assertExactSummaryKeysets(summary));
  assert.deepEqual(Object.values(summary.evidence), Array(4).fill(null));
  assert.deepEqual(Object.keys(summary.check_registry),
    Array.from({ length: 20 }, (_, index) => `PC${String(index + 1).padStart(2, '0')}`));
  assert.throws(() => assertExactSummaryKeysets({ ...summary, extra: true }), /keyset drift/u);
  assert.equal(
    canonicalJson({ z: 1, a: [2, { b: true, a: null }] }),
    '{"a":[2,{"a":null,"b":true}],"z":1}',
  );
  const first = canonicalSummarySha256(summary);
  summary.canonical_summary_sha256 = `sha256:${'f'.repeat(64)}`;
  assert.equal(canonicalSummarySha256(summary), first);
  assert.match(first, /^sha256:[0-9a-f]{64}$/u);
});

test('convergence maps all owning checks and requires both PC19 halves', () => {
  const summary = convergedSummary();
  updateConvergence(summary);
  assert.equal(summary.status, 'passed');
  assert.ok(Object.values(summary.check_registry).every((row) => row.status === 'passed'));

  summary.evidence.packc_pi.check_statuses['PC19-PI'] = 'failed';
  updateConvergence(summary);
  assert.equal(summary.status, 'failed');
  assert.equal(summary.check_registry.PC19.status, 'failed');
  assert.equal(summary.check_registry.PC18.status, 'passed');
});

test('blocked sub-gate propagation remains blocked even if backend full suite fails', () => {
  const summary = convergedSummary();
  summary.evidence.packc_ef.status = 'blocked';
  summary.evidence.packc_ef.canonical_sha256_verified = false;
  summary.evidence.packc_ef.check_statuses.PC06 = 'blocked';
  summary.evidence.backend_full_suite.status = 'failed';
  summary.evidence.backend_full_suite.failed = 1;
  updateConvergence(summary);
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.check_registry.PC06.status, 'blocked');
  assert.equal(summary.check_registry.PC01.status, 'blocked');
  assert.notEqual(summary.status, 'passed');
});

test('backend full-suite classifier accepts recorded conditional skips but never failures', () => {
  const passed = classifyBackendFullSuite({
    exit_code: 0,
    duration_ms: 10,
    stdout: '# tests 10\n# pass 8\n# fail 0\n# skipped 2\n',
    stderr: '',
  });
  assert.equal(passed.status, 'passed');
  assert.equal(passed.conditional_skips, 2);

  const failed = classifyBackendFullSuite({
    exit_code: 1,
    duration_ms: 11,
    stdout: '# tests 10\n# pass 7\n# fail 1\n# skipped 2\n',
    stderr: '',
  });
  assert.equal(failed.status, 'failed');

  const blocked = classifyBackendFullSuite({
    exit_code: null,
    duration_ms: 12,
    stdout: '',
    stderr: 'not executed',
  });
  assert.equal(blocked.status, 'blocked');
});

function convergedSummary() {
  const summary = buildInitialSummary('packc-final-20260722-r3');
  summary.evidence.packc_ef = subGateEvidence({
    PC01: 'passed', PC02: 'passed', PC03: 'passed', PC04: 'passed',
    PC05: 'passed', PC06: 'passed', PC07: 'passed', 'PC19-EF': 'passed',
  });
  summary.evidence.packc_pi = subGateEvidence({
    PC08: 'passed', PC09: 'passed', PC10: 'passed', PC11: 'passed',
    PC12: 'passed', PC13: 'passed', PC14: 'passed', PC15: 'passed',
    PC16: 'passed', PC17: 'deferred_to_cutover', 'PC19-PI': 'passed', PC20: 'passed',
  });
  summary.evidence.packc_cutover = subGateEvidence({ PC17: 'passed', PC18: 'passed' });
  summary.evidence.backend_full_suite = {
    status: 'passed',
    command_id: 'backend-full-suite',
    exit_code: 0,
    duration_ms: 10,
    tests: 10,
    passed: 9,
    failed: 0,
    skipped: 1,
    conditional_skips: 1,
    output_sha256: `sha256:${'1'.repeat(64)}`,
    sanitized_output_tail: '',
  };
  return summary;
}

function subGateEvidence(checkStatuses) {
  return {
    gate_id: 'test-sub-gate',
    status: 'passed',
    exit_code: 0,
    duration_ms: 1,
    summary_path: 'summary.json',
    canonical_summary_sha256: `sha256:${'2'.repeat(64)}`,
    canonical_sha256_verified: true,
    check_statuses: checkStatuses,
    suite_totals: {
      suites: 1,
      tests: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      blocked: 0,
    },
  };
}
