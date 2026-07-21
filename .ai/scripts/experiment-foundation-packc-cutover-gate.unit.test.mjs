import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PACKC_CUTOVER_CHECK_REGISTRY,
  assertExactSummaryKeysets,
  buildInitialSummary,
  canonicalJson,
  canonicalSummarySha256,
  inspectStaticCensus,
  parseArgs,
  updateChecks,
} from './experiment-foundation-packc-cutover-gate.mjs';

test('Pack C cutover gate accepts only the frozen id scheme', () => {
  assert.deepEqual(parseArgs(['--run-id', 'packc-cutover-20260722-r1']), {
    gateId: 'packc-cutover-20260722-r1',
  });
  assert.throws(() => parseArgs(['--run-id', 'packc-cutover-local']), /must match/u);
  assert.throws(
    () => parseArgs(['--run-id', 'packc-cutover-20260722-r2', '--postgres-image', 'latest']),
    /Unknown argument/u,
  );
});

test('Pack C cutover registry closes PC17 and PC18 with exact evidence refs', () => {
  assert.deepEqual(PACKC_CUTOVER_CHECK_REGISTRY, [
    {
      id: 'PC17',
      evidence_refs: ['packet_dossier_unit', 'contracts_schema', 'static_census'],
    },
    {
      id: 'PC18',
      evidence_refs: [
        'bridge_unit',
        'closure_authority_unit',
        'contracts_schema',
        'route_integration',
        'static_census',
      ],
    },
  ]);
});

test('summary publisher has exact keysets and records the no-PostgreSQL decision', () => {
  const summary = buildInitialSummary(
    'packc-cutover-20260722-r3',
    '2026-07-22T00:00:00.000Z',
  );
  assert.doesNotThrow(() => assertExactSummaryKeysets(summary));
  assert.deepEqual(Object.values(summary.evidence), Array(6).fill(null));
  assert.ok(Object.values(summary.zero_census).every((value) => value === 0));
  assert.deepEqual(summary.postgres_decision, {
    required: false,
    rationale:
      'Pack C EF and PI sub-gates already force both relational lanes; cutover adds only static and targeted-suite evidence.',
    existing_database_url_used: false,
    database_connections: 0,
  });
  assert.throws(() => assertExactSummaryKeysets({ ...summary, extra: true }), /keyset drift/u);
});

test('canonical summary SHA-256 is key-order independent and excludes itself', () => {
  assert.equal(
    canonicalJson({ z: 1, a: [2, { b: true, a: null }] }),
    '{"a":[2,{"a":null,"b":true}],"z":1}',
  );
  const summary = buildInitialSummary('packc-cutover-20260722-r4');
  const first = canonicalSummarySha256(summary);
  summary.canonical_summary_sha256 = `sha256:${'f'.repeat(64)}`;
  assert.equal(canonicalSummarySha256(summary), first);
  assert.match(first, /^sha256:[0-9a-f]{64}$/u);
});

test('static census freezes PC17 and PC18 cutover negative space', async () => {
  assert.deepEqual(await inspectStaticCensus(), {
    status: 'passed',
    packet_closure_entrance_count: 2,
    preclosure_packet_repository_call_count: 0,
    validation_cycle_closed_producer_count: 1,
    validation_cycle_closed_other_producer_count: 0,
    dossier_project_accounting_marker_count: 0,
    dossier_closed_snapshot_contract_only: true,
    reu_constructor_files: [
      'apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.ts',
      'apps/backend/src/services/paper-implementation-evidence-trust-gateway-service.ts',
    ],
    reu_constructor_files_outside_v2_lane: [],
    legacy_complete_route_count: 1,
    legacy_complete_delegate_count: 1,
    legacy_completion_closed_below_http: true,
    legacy_completion_success_write_count: 0,
    caller_conclusion_write_contract_occurrences: 0,
    stored_cycle_assessment_occurrences: 2,
    stored_decision_exit_occurrences: 2,
    sealed_constructor_counts: {
      PaperImplementationExperimentV2AdmissionService: 13,
      PaperImplementationExperimentV2HeadService: 15,
      ExperimentFoundationV2MaterializationService: 15,
      ExperimentFoundationExecutionV2Service: 27,
    },
    sealed_constructor_population: 70,
    missing_closure_lookup_constructors: 0,
    never_closed_default_occurrences: 0,
    dual_read_fallback_marker_occurrences: 0,
  });
});

test('unavailable targeted evidence blocks and can never publish passed', () => {
  const summary = buildInitialSummary('packc-cutover-20260722-r5');
  for (const key of Object.keys(summary.evidence)) summary.evidence[key] = { status: 'passed' };
  summary.evidence.route_integration = { status: 'blocked' };
  updateChecks(summary);
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.check_registry.PC17.status, 'passed');
  assert.equal(summary.check_registry.PC18.status, 'blocked');
  assert.notEqual(summary.status, 'passed');
});

test('failed static census fails both cutover checks', () => {
  const summary = buildInitialSummary('packc-cutover-20260722-r6');
  for (const key of Object.keys(summary.evidence)) summary.evidence[key] = { status: 'passed' };
  summary.evidence.static_census = { status: 'failed' };
  updateChecks(summary);
  assert.equal(summary.status, 'failed');
  assert.equal(summary.check_registry.PC17.status, 'failed');
  assert.equal(summary.check_registry.PC18.status, 'failed');
});
