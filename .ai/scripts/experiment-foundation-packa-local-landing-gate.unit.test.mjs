import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PACK_A_V2_TABLES,
  PACK_A_LOCAL_DATABASE,
  PACK_A_LOCAL_HOST,
  PACK_A_LOCAL_PORT,
  PACK_A_LOCAL_SCHEMA,
  PACK_A_LOCAL_TARGET_FINGERPRINT,
  canonicalJson,
  classifyLegacyExternalTrainingJobs,
  classifyLegacyHarnessRuns,
  compareV2TablePopulation,
  digestCanonicalJson,
  digestLegacyIdOrderedRows,
  deriveStatus,
  evaluateCutoverConfig,
  foreignKeyEvidence,
  fingerprintPackALocalTarget,
  isLoopbackHostname,
  sanitizeLocalDatabaseTarget,
  validateFamily,
  validateLifecyclePopulation,
} from './experiment-foundation-packa-local-landing-gate.mjs';

test('local target guard recognizes loopback variants but accepts only the reviewed endpoint', () => {
  for (const host of ['127.0.0.1', '127.9.8.7', 'localhost', 'db.localhost', '[::1]']) {
    assert.equal(isLoopbackHostname(host), true);
  }
  for (const host of ['0.0.0.0', '10.0.0.1', 'postgres.example.com', '::']) {
    assert.equal(isLoopbackHostname(host), false);
  }
  const target = sanitizeLocalDatabaseTarget(
    'postgresql://operator:super-secret@127.0.0.1:5432/postgres?schema=my_researcher_dev',
  );
  assert.deepEqual(target, {
    protocol: 'postgresql',
    host: '127.0.0.1',
    port: '5432',
    database: 'postgres',
    requested_schema: 'my_researcher_dev',
    loopback_enforced: true,
    username_stored: false,
    password_stored: false,
    database_url_stored: false,
  });
  assert.doesNotMatch(JSON.stringify(target), /operator|super-secret/);
  assert.throws(
    () => sanitizeLocalDatabaseTarget('postgresql://user:password@db.example.com/research'),
    /NON_LOOPBACK_DATABASE_REFUSED/,
  );
  for (const url of [
    'postgresql://user:password@localhost:5432/postgres?schema=my_researcher_dev',
    'postgresql://user:password@[::1]:5432/postgres?schema=my_researcher_dev',
    'postgresql://user:password@127.0.0.1:55432/postgres?schema=my_researcher_dev',
  ]) {
    assert.throws(() => sanitizeLocalDatabaseTarget(url), /ENDPOINT_MISMATCH/);
  }
  for (const url of [
    'postgresql://user:password@127.0.0.1/staging?schema=my_researcher_dev',
    'postgresql://user:password@127.0.0.1/postgres?schema=public',
    'postgresql://user:password@127.0.0.1/postgres',
  ]) {
    assert.throws(() => sanitizeLocalDatabaseTarget(url), /TARGET_MISMATCH/);
  }
  assert.equal(PACK_A_LOCAL_DATABASE, 'postgres');
  assert.equal(PACK_A_LOCAL_SCHEMA, 'my_researcher_dev');
  assert.equal(PACK_A_LOCAL_HOST, '127.0.0.1');
  assert.equal(PACK_A_LOCAL_PORT, '5432');
  assert.equal(
    fingerprintPackALocalTarget({
      system_identifier: '7603767034018223112',
      database_oid: '5',
      schema_oid: '16388',
    }),
    PACK_A_LOCAL_TARGET_FINGERPRINT,
  );
  assert.notEqual(
    fingerprintPackALocalTarget({
      system_identifier: 'remote-cluster',
      database_oid: '5',
      schema_oid: '16388',
    }),
    PACK_A_LOCAL_TARGET_FINGERPRINT,
  );
});

test('canonical digest is key-order independent while legacy digest preserves id row order', () => {
  assert.equal(canonicalJson({ z: 1, a: [2, { b: true, a: null }] }), '{"a":[2,{"a":null,"b":true}],"z":1}');
  assert.equal(digestCanonicalJson({ a: 1, b: 2 }), digestCanonicalJson({ b: 2, a: 1 }));

  const base = {
    PaperImplementationResearchWorkOrder: [{ id: 'a', payload: { y: 2, x: 1 } }, { id: 'b' }],
  };
  const same = {
    PaperImplementationResearchWorkOrder: [{ payload: { x: 1, y: 2 }, id: 'a' }, { id: 'b' }],
  };
  const reordered = {
    PaperImplementationResearchWorkOrder: [{ id: 'b' }, { id: 'a', payload: { x: 1, y: 2 } }],
  };
  assert.equal(digestLegacyIdOrderedRows(base).aggregate_digest, digestLegacyIdOrderedRows(same).aggregate_digest);
  assert.notEqual(
    digestLegacyIdOrderedRows(base).aggregate_digest,
    digestLegacyIdOrderedRows(reordered).aggregate_digest,
  );
  assert.match(digestLegacyIdOrderedRows(base).ordering, /id COLLATE C ascending/);
});

test('submitted HarnessRun is resolved only by matching trusted terminal monitor and evidence', () => {
  const harness = [{
    id: 'harness-1',
    work_order_id: 'work-order-1',
    run_status: 'submitted',
    external_job_ref_type: 'experiment_foundation_run',
    external_job_ref_id: 'job-1',
    external_job_version_id: null,
    external_job_hash: 'sha256:job',
  }];
  const monitor = {
    id: 'monitor-1',
    work_order_id: 'work-order-1',
    run_status: 'cancelled',
    trust_status: 'trusted',
    external_job_ref_type: 'experiment_foundation_run',
    external_job_ref_id: 'job-1',
    external_job_version_id: null,
    external_job_hash: 'sha256:job',
    received_at: '2026-07-13T00:00:00.000Z',
  };
  const evidence = {
    id: 'evidence-1',
    monitor_intake_id: 'monitor-1',
    work_order_id: 'work-order-1',
    run_status: 'cancelled',
    trusted_status: 'trusted',
    external_job_ref_type: 'experiment_foundation_run',
    external_job_ref_id: 'job-1',
    external_job_version_id: null,
    external_job_hash: 'sha256:job',
  };

  const missingEvidence = classifyLegacyHarnessRuns(harness, [monitor], []);
  assert.equal(missingEvidence.blocker_count, 1);
  assert.equal(missingEvidence.rows[0].reason_code, 'TRUSTED_TERMINAL_MONITOR_EVIDENCE_MISSING');

  const resolved = classifyLegacyHarnessRuns(harness, [monitor], [evidence]);
  assert.equal(resolved.blocker_count, 0);
  assert.equal(resolved.rows[0].classification, 'resolved_by_trusted_terminal_monitor_evidence');
});

test('running capability-test ExternalTrainingJob stays unclassified and blocking until terminal', () => {
  const running = {
    id: 'job-1',
    job_status: 'running',
    idempotency_key: 'submit-capability_aliyun_success-key',
    training_task_spec_id: 'training_task_spec_capability_aliyun_success',
    materialization_result_id: 'materialization_result_capability_aliyun_success',
    adapter_version: 'capability-aliyun-v1',
    platform_id: 'aliyun_pai_dlc_capability_aliyun_success',
  };
  const inflight = classifyLegacyExternalTrainingJobs([running]);
  assert.equal(inflight.blocker_count, 1);
  assert.equal(
    inflight.rows[0].classification,
    'unclassified_inflight_capability_test_until_cancelled',
  );

  const cancelled = classifyLegacyExternalTrainingJobs([{ ...running, job_status: 'cancelled' }]);
  assert.equal(cancelled.blocker_count, 0);
  assert.equal(cancelled.rows[0].classification, 'resolved_terminal_external_job');
});

test('cutover configuration follows the committed/admission truth table and repository fallbacks', () => {
  assert.equal(evaluateCutoverConfig({}).phase, 'pre_cutover');
  assert.equal(evaluateCutoverConfig({
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: 'true',
  }).valid, false);

  const enabled = evaluateCutoverConfig({
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: 'true',
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
    RESEARCH_LIFECYCLE_REPOSITORY: 'prisma',
    TITLE_CARD_REPOSITORY: 'prisma',
  });
  assert.equal(enabled.phase, 'v2_intake_legacy_mutations_closed');
  assert.equal(enabled.cutover_ready, true);

  const drainOnly = evaluateCutoverConfig({
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: 'false',
    PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: 'true',
    PAPER_IMPLEMENTATION_REPOSITORY: 'prisma',
    EXPERIMENT_FOUNDATION_REPOSITORY: 'prisma',
  });
  assert.equal(drainOnly.phase, 'drain_only_legacy_mutations_closed');
  assert.equal(drainOnly.cutover_ready, true);
  for (const invalid of ['1', '0', 'on', 'off', 'yes', 'tru']) {
    assert.equal(evaluateCutoverConfig({
      PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: invalid,
      PAPER_IMPLEMENTATION_REPOSITORY: 'prisma',
      EXPERIMENT_FOUNDATION_REPOSITORY: 'prisma',
    }).valid, false);
  }
});

test('landing status requires exact database/schema identity and verified read-only evidence', () => {
  const passing = {
    database_target: {
      loopback_enforced: true,
      database_name_matches_url: true,
      requested_schema: 'my_researcher_dev',
      effective_schema: 'my_researcher_dev',
      transaction_read_only_verified: true,
      target_fingerprint_matches: true,
    },
    migration: { source_digest_matches: true, applied: true },
    schema: {
      pack_a_v2_tables: { exact: true },
      cross_domain_foreign_keys: { cross_domain_fk_count: 0 },
    },
    fixture: { status: 'passed' },
    legacy_blockers: { total_blocker_count: 0 },
    cutover_config: { valid: true, cutover_ready: true },
  };
  assert.equal(deriveStatus(passing).status, 'passed');
  assert.deepEqual(
    deriveStatus({
      ...passing,
      database_target: { ...passing.database_target, transaction_read_only_verified: false },
    }).failures,
    ['PACK_A_LOCAL_GATE_READ_ONLY_NOT_VERIFIED'],
  );
  assert.deepEqual(
    deriveStatus({
      ...passing,
      database_target: { ...passing.database_target, effective_schema: 'public' },
    }).failures,
    ['PACK_A_LOCAL_GATE_SCHEMA_IDENTITY_MISMATCH'],
  );
  assert.deepEqual(
    deriveStatus({
      ...passing,
      database_target: { ...passing.database_target, database_name_matches_url: false },
    }).failures,
    ['PACK_A_LOCAL_GATE_DATABASE_IDENTITY_MISMATCH'],
  );
  assert.deepEqual(
    deriveStatus({
      ...passing,
      database_target: { ...passing.database_target, target_fingerprint_matches: false },
    }).failures,
    ['PACK_A_LOCAL_GATE_TARGET_FINGERPRINT_MISMATCH'],
  );
});

test('exact family validation rejects draft-state and freeze-receipt binding drift', () => {
  const logicalId = 'd19-data-policy-test';
  const revisionId = 'revision-test';
  const snapshot = {
    schema_version: 'v1',
    policy_key: 'policy-test',
    display_name: 'Policy test',
    license_expression: 'CC0-1.0',
    access_level: 'open',
    source_terms_uri: 'https://example.com/terms',
    redistribution_allowed: true,
    commercial_use_allowed: true,
    use_constraints: ['test-only'],
  };
  const semantic = (recordKind) => digestCanonicalJson({
    content: snapshot,
    hash_profile: 'ef-asset-semantic-json@v1',
    record_kind: recordKind,
    schema_version: 'v1',
  });
  const rows = {
    ExperimentFoundationDataPolicyV2: [{
      id: logicalId,
      dataPolicyKey: snapshot.policy_key,
      draftStateVersion: 2,
      dataPolicyDraftJson: snapshot,
      currentRevisionId: revisionId,
    }],
    ExperimentFoundationDataPolicyRevisionV2: [{
      id: revisionId,
      dataPolicyId: logicalId,
      revisionSequence: 1,
      schemaVersion: 'v1',
      hashProfile: 'ef-asset-semantic-json@v1',
      dataPolicySnapshotJson: snapshot,
      contentHash: semantic('ExperimentFoundationDataPolicyRevisionV2'),
    }],
    ExperimentFoundationDataPolicyFreezeCommandReceiptV2: [{
      id: 'receipt-test',
      dataPolicyId: logicalId,
      businessIdempotencyKey: `d19-freeze:DataPolicy:${logicalId}`,
      revisionId,
      contentHash: semantic('ExperimentFoundationDataPolicyRevisionV2'),
    }],
  };
  const exactRefs = new Map();
  const issues = [];
  validateFamily(rows, 'DataPolicy', new Map([[logicalId, snapshot]]), exactRefs, issues);
  assert.deepEqual(issues, []);

  const receiptTamperIssues = [];
  validateFamily({
    ...rows,
    ExperimentFoundationDataPolicyFreezeCommandReceiptV2: [{
      ...rows.ExperimentFoundationDataPolicyFreezeCommandReceiptV2[0],
      contentHash: `sha256:${'f'.repeat(64)}`,
    }],
  }, 'DataPolicy', new Map([[logicalId, snapshot]]), new Map(), receiptTamperIssues);
  assert.match(receiptTamperIssues.join('\n'), /freeze receipt exact binding mismatch/);

  const draftTamperIssues = [];
  validateFamily({
    ...rows,
    ExperimentFoundationDataPolicyV2: [{
      ...rows.ExperimentFoundationDataPolicyV2[0],
      draftStateVersion: 1,
    }],
  }, 'DataPolicy', new Map([[logicalId, snapshot]]), new Map(), draftTamperIssues);
  assert.match(draftTamperIssues.join('\n'), /current revision identity\/sequence mismatch/);
});

test('exact lifecycle validation binds ordered events and projection source event', () => {
  const ref = {
    asset_type: 'DataPolicy',
    logical_id: 'd19-data-policy-test',
    revision_id: 'revision-test',
    revision_sequence: 1,
    content_hash: `sha256:${'a'.repeat(64)}`,
  };
  const event = (sequence, eventType, reasonCode) => ({
    id: `event-${sequence}`,
    assetType: ref.asset_type,
    assetId: ref.logical_id,
    assetRevisionId: ref.revision_id,
    assetRevisionSequence: ref.revision_sequence,
    assetRevisionHash: ref.content_hash,
    eventSequence: sequence,
    eventType,
    eventSchemaVersion: 'v1',
    reasonCode,
    note: null,
    actorType: 'server',
    actorId: null,
  });
  const rows = {
    ExperimentFoundationAssetLifecycleEventV2: [
      event(1, 'registered', 'D19_FIXTURE_REGISTERED'),
      event(2, 'activated', 'D19_FIXTURE_ACTIVATED'),
    ],
    ExperimentFoundationAssetLifecycleProjectionV2: [{
      assetType: ref.asset_type,
      assetId: ref.logical_id,
      currentRevisionId: ref.revision_id,
      currentRevisionSequence: ref.revision_sequence,
      currentRevisionHash: ref.content_hash,
      lifecycleSequence: 2,
      stateVersion: 2,
      lifecycleStatus: 'active',
      locationAvailable: false,
      lastEventId: 'event-2',
    }],
  };
  const issues = [];
  validateLifecyclePopulation(rows, new Map([['ref', ref]]), issues);
  assert.deepEqual(issues, []);

  const tampered = structuredClone(rows);
  tampered.ExperimentFoundationAssetLifecycleProjectionV2[0].lastEventId = 'event-1';
  const tamperIssues = [];
  validateLifecyclePopulation(tampered, new Map([['ref', ref]]), tamperIssues);
  assert.match(tamperIssues.join('\n'), /projection\/source-event drift/);
});

test('Pack A table population requires exactly the 34 approved tables', () => {
  assert.equal(PACK_A_V2_TABLES.length, 34);
  assert.equal(compareV2TablePopulation(PACK_A_V2_TABLES).exact, true);
  const missing = compareV2TablePopulation(PACK_A_V2_TABLES.slice(1));
  assert.equal(missing.exact, false);
  assert.deepEqual(missing.missing, [PACK_A_V2_TABLES[0]]);
  const extra = compareV2TablePopulation([...PACK_A_V2_TABLES, 'UnexpectedV2']);
  assert.deepEqual(extra.extra, ['UnexpectedV2']);
});

test('cross-domain FK census catches Pack A links to both v2 and legacy opposite-domain tables', () => {
  const evidence = foreignKeyEvidence([
    {
      constraint_name: 'same_domain',
      source_table: 'ExperimentFoundationRunV2',
      target_table: 'ExperimentFoundationRunRecipeV2',
    },
    {
      constraint_name: 'pi_to_ef_v2',
      source_table: 'PaperImplementationExperimentWorkOrderBranchV2',
      target_table: 'ExperimentFoundationRunV2',
    },
    {
      constraint_name: 'ef_v2_to_pi_legacy',
      source_table: 'ExperimentFoundationRunV2',
      target_table: 'PaperImplementationResearchWorkOrder',
    },
  ]);
  assert.equal(evidence.inspected_fk_count, 3);
  assert.equal(evidence.cross_domain_fk_count, 2);
  assert.deepEqual(
    evidence.cross_domain_fks.map((row) => row.constraint_name),
    ['pi_to_ef_v2', 'ef_v2_to_pi_legacy'],
  );
});
