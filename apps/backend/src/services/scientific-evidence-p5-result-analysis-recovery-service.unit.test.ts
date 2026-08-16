import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
  exactScientificEvidenceP5ResultAnalysisRecoveryEffectsV1,
  preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
} from './scientific-evidence-p5-result-analysis-recovery-service.js';

test('result-analysis recovery package binds the terminal source, evidence, instrumentation, and zero-PAI effects', () => {
  const prepared = preparedFixture();
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(prepared);
  assert.equal(prepared.eligibility.status, 'eligible');
  assert.deepEqual(prepared.eligibility.reason_codes, []);
  assert.equal(prepared.recovery_package.authorized_effects.create_job_call_count, 0);
  assert.equal(prepared.recovery_package.authorized_effects.closure_write_count, 0);
});

test('result-analysis recovery package rejects an expanded provider or closure boundary', () => {
  const prepared = preparedFixture();
  const expandedProvider = structuredClone(prepared.recovery_package);
  expandedProvider.authorized_effects.provider_call_count_max = 3 as 2;
  let eligibility = preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1(expandedProvider);
  assert.equal(eligibility.status, 'ineligible');
  assert.equal(eligibility.reason_codes.includes('P5_RA_RECOVERY_PACKAGE_HASH_MISMATCH'), true);
  assert.equal(eligibility.reason_codes.includes('P5_RA_RECOVERY_EFFECT_BOUNDARY_INVALID'), true);

  const closureWrite = buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1({
    ...prepared.recovery_package,
    authorized_effects: {
      ...prepared.recovery_package.authorized_effects,
      closure_write_count: 1 as 0,
    },
  });
  eligibility = preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1(closureWrite);
  assert.equal(eligibility.status, 'ineligible');
  assert.deepEqual(eligibility.reason_codes, ['P5_RA_RECOVERY_EFFECT_BOUNDARY_INVALID']);
});

test('result-analysis recovery acceptance must bind the exact immutable package and effects', () => {
  const prepared = preparedFixture();
  assert.doesNotThrow(() => assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1({
    prepared,
    acceptance: {
      schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_SCHEMA_V1,
      status: 'authorized_pending_execute',
      recovery_attempt_id: prepared.recovery_package.recovery_attempt_id,
      package_hash: prepared.recovery_package.package_hash,
      authorization: {
        source: 'current_codex_task_user',
        received_at: '2026-08-15T01:30:00.000Z',
        text_utf8_sha256: hash('authorization'),
        text_utf8_bytes: 128,
        user_authorized: true,
        authorized_effects: prepared.recovery_package.authorized_effects,
      },
    },
  }));

  assert.throws(() => assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1({
    prepared,
    acceptance: {
      schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_SCHEMA_V1,
      status: 'authorized_pending_execute',
      recovery_attempt_id: prepared.recovery_package.recovery_attempt_id,
      package_hash: hash('different-package'),
      authorization: {
        source: 'current_codex_task_user',
        received_at: '2026-08-15T01:30:00.000Z',
        text_utf8_sha256: hash('authorization'),
        text_utf8_bytes: 128,
        user_authorized: true,
        authorized_effects: prepared.recovery_package.authorized_effects,
      },
    },
  }), /T136_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_INVALID/);
});

function preparedFixture(): ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1 {
  const recoveryPackage = buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1(
    packageContentFixture(),
  );
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1,
    status: 'eligible',
    recovery_package: recoveryPackage,
    eligibility: preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1(recoveryPackage),
    preparation_effect_census: {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    },
  };
}

function packageContentFixture(): ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1 {
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1,
    recovery_attempt_id: 't136-p5-result-analysis-recovery-1',
    source_execution: {
      p5_attempt_id: 't136-p5-scifact-attempt-17',
      package_hash: hash('source-package'),
      terminal_record_sha256: hash('terminal-record'),
      terminal_failed_stage: 'close',
      terminal_reason_code: 'T136_P5_CLOSE_FAILED',
    },
    authority: {
      target_fingerprint: hash('target'),
      implementation_project_id: 'implementation-project-1',
      title_card_id: 'title-card-1',
      validation_cycle_id: 'validation-cycle-1',
      expected_cycle_version: 7,
      closure_watermark_hash: hash('watermark'),
      run_id: 'run-1',
      run_manifest_hash: hash('run-manifest'),
      scientific_results: [
        { ordinal: 1, id: 'result-1', content_hash: hash('result-1'), run_cell_id: 'cell-1', cell_key: 'top-k-10' },
        { ordinal: 2, id: 'result-2', content_hash: hash('result-2'), run_cell_id: 'cell-2', cell_key: 'top-k-5' },
      ],
      validation_report: { id: 'report-1', content_hash: hash('report'), status: 'passed' },
      run_evidence_unit: { id: 'reu-1', content_hash: hash('reu') },
      trace_manifest: { id: 'trace-1', content_hash: hash('trace') },
      current_effects: {
        runtime_artifacts: 0,
        runtime_admissions: 0,
        closures: 0,
        packets: 0,
      },
    },
    runtime_request: {
      run_mode: 'product',
      execution_mode: 'provider_llm',
      runtime_run_id: 'runtime-recovery-1',
      model_profile_id: 'result-analysis-profile',
      model_option_id: 'openai-balanced',
      model_profile_hash: hash('profile'),
      normalized_params_hash: hash('params'),
      provider_id: 'openai',
      model_id: 'gpt-5.6-sol',
      max_provider_call_count: 2,
      target_version_id: hash('run-manifest'),
      input_snapshot_ref_id: 'input-snapshot-recovery-1',
      input_snapshot_hash: hash('input-snapshot'),
      result_interpretation_packet_ref_id: 'packet-v4',
      trace_manifest_ref_id: 'logical-trace-ref-v4',
      source_hashes: [hash('packet-source'), hash('trace-source')],
    },
    executor: {
      mode: 'result_analysis_only',
      path: 'apps/backend/scripts/run-result-analysis-recovery.ts',
      sha256: hash('executor'),
    },
    instrumentation: {
      debug_run_id: 'dbg-20260815-010050-126f',
      environment_key: 'T136_P5_DEBUG_RUN_ID',
      required_environment_value: 'dbg-20260815-010050-126f',
      log_marker: '[DBG:dbg-20260815-010050-126f]',
      source_files: [
        { path: 'apps/backend/src/services/topic-selection-agent-orchestrator-service.ts', sha256: hash('orchestrator') },
        { path: 'apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts', sha256: hash('runtime') },
      ],
    },
    recovery_point: {
      manifest_ref: 'result-analysis-recovery/point.json',
      created_at: '2026-08-15T01:20:00.000Z',
      target_fingerprint: hash('target'),
      recovery_fingerprint: hash('recovery'),
      schema_dump_sha256: hash('schema-dump'),
      authority_data_dump_sha256: hash('data-dump'),
      authority_table_count: 114,
    },
    authorized_effects: exactScientificEvidenceP5ResultAnalysisRecoveryEffectsV1(),
    operational_window: {
      prepared_at: '2026-08-15T01:25:00.000Z',
      authorization_not_after: '2026-08-15T05:25:00.000Z',
      execute_not_after: '2026-08-15T05:55:00.000Z',
    },
  };
}

function hash(seed: string): string {
  return `sha256:${seed.padEnd(64, '0').slice(0, 64).replace(/[^a-f0-9]/g, 'a')}`;
}
