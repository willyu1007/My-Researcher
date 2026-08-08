import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_POSTGRES_IMAGE,
  PACKC_PI_CHECK_REGISTRY,
  PACKC_PI_RELATIONAL_TEST_FILES,
  PACKC_PI_REQUIRED_SUBTEST_REGISTRY,
  assertExactSummaryKeysets,
  buildInitialSummary,
  canonicalJson,
  canonicalSummarySha256,
  inspectStaticCensus,
  parseArgs,
  updateChecks,
} from './experiment-foundation-packc-pi-gate.mjs';

test('Pack C-PI gate accepts only the frozen id scheme and digest-pinned image', () => {
  assert.deepEqual(parseArgs(['--run-id', 'packc-pi-20260721-r1']), {
    gateId: 'packc-pi-20260721-r1',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.throws(() => parseArgs(['--run-id', 'packc-pi-local']), /must match/u);
  assert.throws(
    () => parseArgs([
      '--run-id', 'packc-pi-20260721-r2',
      '--postgres-image', 'pgvector/pgvector:latest',
    ]),
    /digest-pinned/u,
  );
});

test('Pack C-PI check registry is exact and PC17 remains an explicit cutover deferral', () => {
  assert.deepEqual(PACKC_PI_CHECK_REGISTRY, [
    { id: 'PC08', evidence_refs: ['gateway_unit', 'contracts_schema'] },
    { id: 'PC09', evidence_refs: ['gateway_unit', 'relational'] },
    { id: 'PC10', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
    { id: 'PC11', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
    { id: 'PC12', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
    { id: 'PC13', evidence_refs: ['evaluator_unit', 'closure_unit', 'relational'] },
    { id: 'PC14', evidence_refs: ['closure_unit', 'contracts_schema'] },
    { id: 'PC15', evidence_refs: ['closure_unit', 'relational'] },
    { id: 'PC16', evidence_refs: ['seal_unit', 'relational', 'static_census'] },
    { id: 'PC17', evidence_refs: ['static_census'] },
    { id: 'PC19-PI', evidence_refs: ['sidecar_unit', 'static_census'] },
    { id: 'PC20', evidence_refs: ['evaluator_unit', 'static_census'] },
    { id: 'P4-PI', evidence_refs: ['contracts_schema', 'packet_unit', 'relational', 'static_census'] },
  ]);
  assert.deepEqual(PACKC_PI_REQUIRED_SUBTEST_REGISTRY, {
    closure_unit: [
      'production default derivation reconstructs identical closure, snapshot, event, and outbox ids',
    ],
    relational: [
      'Pack C-PI two-client Serializable races preserve closure-vs-writer final-state invariants',
      'P3 scientific Closure and P4 Packet materialization reread exact authority in PostgreSQL',
    ],
    packet_unit: [
      'P4 materializes one closure-bound Packet and exact replay returns it',
    ],
  });
  assert.deepEqual(PACKC_PI_RELATIONAL_TEST_FILES, [
    'src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts',
  ]);
});

test('summary publisher initializes exact evidence, migration, zero-census and redaction keysets', () => {
  const summary = buildInitialSummary(
    'packc-pi-20260721-r3',
    DEFAULT_POSTGRES_IMAGE,
    '2026-07-21T00:00:00.000Z',
  );
  assert.doesNotThrow(() => assertExactSummaryKeysets(summary));
  assert.deepEqual(Object.values(summary.evidence), Array(9).fill(null));
  assert.ok(Object.values(summary.zero_census).every((value) => value === 0));
  assert.equal(
    summary.migrations['20260720141000_harden_paper_implementation_pack_c_closure_v2']
      .named_local_status,
    'UNAPPLIED_TO_NAMED_LOCAL_INFORMATIONAL',
  );
  assert.deepEqual(summary.redaction, {
    database_url_stored: false,
    database_password_stored: false,
    command_stdout_stored_in_summary: false,
    credential_values_loaded: false,
    output_tails_sanitized: true,
  });
  assert.throws(() => assertExactSummaryKeysets({ ...summary, extra: true }), /keyset drift/u);
});

test('canonical summary SHA-256 is key-order independent and excludes its own value', () => {
  assert.equal(
    canonicalJson({ z: 1, a: [2, { b: true, a: null }] }),
    '{"a":[2,{"a":null,"b":true}],"z":1}',
  );
  const summary = buildInitialSummary('packc-pi-20260721-r4', DEFAULT_POSTGRES_IMAGE);
  const first = canonicalSummarySha256(summary);
  summary.canonical_summary_sha256 = `sha256:${'f'.repeat(64)}`;
  assert.equal(canonicalSummarySha256(summary), first);
  assert.match(first, /^sha256:[0-9a-f]{64}$/u);
});

test('static census proves P4 Packet ownership, four closure lookups, evaluator zero-write, PC17 negative space, Sidecar guard, and untouched legacy complete', async () => {
  assert.deepEqual(await inspectStaticCensus(), {
    status: 'passed',
    composition_wired_services: [
      'ExperimentFoundationExecutionV2Service',
      'PaperImplementationExperimentV2AdmissionService',
      'ExperimentFoundationV2MaterializationService',
      'PaperImplementationExperimentV2HeadService',
    ],
    missing_closure_lookup_wirings: 0,
    evaluator_mutation_call_count: 0,
    authorized_v2_packet_writer_files: [
      'apps/backend/src/repositories/in-memory-paper-implementation-result-claim-dossier-repository.ts',
      'apps/backend/src/repositories/paper-implementation-result-claim-dossier.repository.ts',
      'apps/backend/src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.ts',
      'apps/backend/src/services/paper-implementation-result-packet-v2-materializer.ts',
    ],
    missing_v2_packet_writer_files: [],
    v2_packet_writer_files: [],
    packet_materializer_composition_wired: true,
    validation_cycle_closed_producer_count: 1,
    validation_cycle_closed_other_producer_count: 0,
    closed_legacy_record_kinds: [
      'experiment_result',
      'result_validation_report',
      'evidence_candidate',
      'paper_experiment_sidecar',
    ],
    legacy_guard_call_count: 4,
    sidecar_generic_write_path_count: 0,
    legacy_complete_route_count: 1,
    legacy_complete_delegate_count: 1,
    legacy_complete_v2_reference_count: 0,
    pc17_cutover_claim: 'deferred_to_cutover',
  });
});

test('PC17 reports deferred_to_cutover only after its v2 negative-space census passes', () => {
  const summary = buildInitialSummary('packc-pi-20260721-r5', DEFAULT_POSTGRES_IMAGE);
  for (const key of Object.keys(summary.evidence)) summary.evidence[key] = { status: 'passed' };
  updateChecks(summary);
  assert.equal(summary.status, 'passed');
  assert.equal(summary.check_registry.PC17.status, 'deferred_to_cutover');
  assert.match(summary.check_registry.PC17.details, /legacy Packet\/dossier removal/u);

  summary.evidence.static_census = { status: 'failed' };
  updateChecks(summary);
  assert.equal(summary.status, 'failed');
  assert.equal(summary.check_registry.PC17.status, 'failed');
});

test('PostgreSQL unavailability blocks every relational check and can never publish passed', () => {
  const summary = buildInitialSummary('packc-pi-20260721-r6', DEFAULT_POSTGRES_IMAGE);
  for (const key of Object.keys(summary.evidence).filter((key) => key !== 'relational')) {
    summary.evidence[key] = { status: 'passed' };
  }
  summary.evidence.relational = {
    status: 'blocked',
    reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  updateChecks(summary);
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.check_registry.PC09.status, 'blocked');
  assert.equal(summary.check_registry.PC10.status, 'blocked');
  assert.equal(summary.check_registry.PC15.status, 'blocked');
  assert.equal(summary.check_registry.PC16.status, 'blocked');
  assert.equal(summary.check_registry.PC08.status, 'passed');
  assert.equal(summary.check_registry.PC17.status, 'deferred_to_cutover');
  assert.notEqual(summary.status, 'passed');
});
