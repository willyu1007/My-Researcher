import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PACKC_CUTOVER_CHECK_REGISTRY,
  PACKC_CUTOVER_SEALED_COMMIT_PATHS,
  PACKC_CUTOVER_SUITE_REGISTRY,
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
      evidence_refs: [
        'packet_dossier_unit',
        'contracts_schema',
        'relay_routing_unit',
        'relay_crash_window_unit',
        'static_census',
      ],
    },
    {
      id: 'PC18',
      evidence_refs: [
        'bridge_unit',
        'closure_authority_unit',
        'contracts_schema',
        'route_integration',
        'relay_routing_unit',
        'relay_crash_window_unit',
        'static_census',
      ],
    },
  ]);
  assert.deepEqual(
    PACKC_CUTOVER_SEALED_COMMIT_PATHS.map((entry) => entry.function_name),
    ['commitAdmission', 'commitHeadAdvance', 'commitMaterialization', 'startExecution'],
  );
  assert.deepEqual(
    PACKC_CUTOVER_SUITE_REGISTRY.map((suite) => suite.evidence_key),
    [
      'packet_dossier_unit',
      'bridge_unit',
      'closure_authority_unit',
      'contracts_schema',
      'route_integration',
      'relay_routing_unit',
      'relay_crash_window_unit',
    ],
  );
  assert.deepEqual(
    PACKC_CUTOVER_SUITE_REGISTRY.find(
      (suite) => suite.evidence_key === 'relay_routing_unit',
    )?.files,
    ['src/services/experiment-v2-integration-relay-service.unit.test.ts'],
  );
  assert.deepEqual(
    PACKC_CUTOVER_SUITE_REGISTRY.find(
      (suite) => suite.evidence_key === 'relay_crash_window_unit',
    )?.files,
    ['src/services/experiment-v2-integration-spine.unit.test.ts'],
  );
  assert.deepEqual(
    PACKC_CUTOVER_SUITE_REGISTRY.find(
      (suite) => suite.evidence_key === 'relay_routing_unit',
    )?.required_subtests,
    [
      'relay delivers EvidenceCandidateQualified to the real trust gateway without terminalization',
      'relay durably receipts both PI projection-feed events with zero terminalization',
      'projection-feed redelivery converges to one exact inbox receipt',
    ],
  );
  assert.match(
    PACKC_CUTOVER_SUITE_REGISTRY.find(
      (suite) => suite.evidence_key === 'relay_crash_window_unit',
    )?.required_subtests.at(-1) ?? '',
    /consumer-committed marker failure through closure and exact redelivery/u,
  );
});

test('summary publisher has exact keysets and records the no-PostgreSQL decision', () => {
  const summary = buildInitialSummary(
    'packc-cutover-20260722-r3',
    '2026-07-22T00:00:00.000Z',
  );
  assert.doesNotThrow(() => assertExactSummaryKeysets(summary));
  assert.deepEqual(Object.values(summary.evidence), Array(8).fill(null));
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
    legacy_reu_prisma_mutation_files: [],
    v2_reu_create_files: [
      'apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.ts',
    ],
    v2_reu_create_files_outside_gateway_repository: [],
    dossier_legacy_reu_point_lookup_count: 0,
    legacy_complete_route_count: 1,
    legacy_complete_delegate_count: 1,
    legacy_completion_closed_below_http: true,
    legacy_completion_success_write_count: 0,
    caller_conclusion_write_contract_occurrences: 0,
    stored_cycle_assessment_occurrences: 2,
    stored_decision_exit_occurrences: 2,
    sealed_commit_path_checks: [
      {
        id: 'pi_admission',
        relative_path:
          'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts',
        function_name: 'commitAdmission',
        transaction_internal_closure_read: true,
        replay_before_closure_fence: true,
      },
      {
        id: 'pi_head_advance',
        relative_path:
          'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts',
        function_name: 'commitHeadAdvance',
        transaction_internal_closure_read: true,
        replay_before_closure_fence: true,
      },
      {
        id: 'ef_materialization',
        relative_path:
          'apps/backend/src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.ts',
        function_name: 'commitMaterialization',
        transaction_internal_closure_read: true,
        replay_before_closure_fence: true,
      },
      {
        id: 'ef_simulation_start',
        relative_path:
          'apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.ts',
        function_name: 'startExecution',
        transaction_internal_closure_read: true,
        replay_before_closure_fence: true,
      },
    ],
    missing_transaction_internal_closure_read_paths: [],
    missing_replay_before_closure_fence_paths: [],
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
