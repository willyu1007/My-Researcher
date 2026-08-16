import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TraceLineageBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';

import {
  SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1,
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1,
  buildScientificEvidenceP5PacketTraceLineageV1,
  buildScientificEvidenceP5PacketTraceSuccessorPackageV1,
  exactScientificEvidenceP5PacketTraceSuccessorEffectsV1,
  preflightScientificEvidenceP5PacketTraceSuccessorPackageV1,
  type ScientificEvidenceP5PacketTraceSuccessorPackageContentV1,
  type ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
} from './scientific-evidence-p5-packet-trace-result-analysis-successor-service.js';

test('packet-trace successor binds the authoritative RunEvidenceUnit into experiment lineage', () => {
  const sourceLineage = emptyLineage();
  const runEvidenceRef = {
    ref_type: 'run_evidence_unit',
    ref_id: 'run-evidence-1',
    title_card_id: 'title-card-1',
    version_id: hash('run-evidence'),
  };
  const lineage = buildScientificEvidenceP5PacketTraceLineageV1({
    source_lineage: sourceLineage,
    authoritative_run_evidence_refs: [runEvidenceRef],
    title_card_id: 'title-card-1',
  });

  assert.deepEqual(lineage.experiment.run_evidence_refs, [runEvidenceRef]);
  assert.deepEqual(sourceLineage.experiment.run_evidence_refs, []);
  assert.throws(() => buildScientificEvidenceP5PacketTraceLineageV1({
    source_lineage: sourceLineage,
    authoritative_run_evidence_refs: [],
    title_card_id: 'title-card-1',
  }), /T136_P5_PACKET_TRACE_SUCCESSOR_EXPERIMENT_LINEAGE_INVALID/);
  assert.throws(() => buildScientificEvidenceP5PacketTraceLineageV1({
    source_lineage: sourceLineage,
    authoritative_run_evidence_refs: [{ ...runEvidenceRef, version_id: 'v1' }],
    title_card_id: 'title-card-1',
  }), /T136_P5_PACKET_TRACE_SUCCESSOR_EXPERIMENT_LINEAGE_INVALID/);
});

test('packet-trace successor binds one trace write, one ResultAnalysis run, and no Closure', () => {
  const prepared = preparedFixture();
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(prepared);
  assert.deepEqual(prepared.eligibility.reason_codes, []);
  assert.equal(prepared.successor_package.authorized_effects.trace_manifest_write_count_max, 1);
  assert.equal(prepared.successor_package.authorized_effects.provider_call_count_max, 2);
  assert.equal(prepared.successor_package.authorized_effects.closure_write_count, 0);
  assert.equal(prepared.successor_package.authorized_effects.packet_write_count, 0);
});

test('packet-trace successor rejects effect expansion', () => {
  const prepared = preparedFixture();
  for (const mutation of [
    { trace_manifest_write_count_max: 2 },
    { provider_call_count_max: 3 },
    { closure_write_count: 1 },
    { packet_write_count: 1 },
    { claim_write_count: 1 },
  ]) {
    const candidate = buildScientificEvidenceP5PacketTraceSuccessorPackageV1({
      ...prepared.successor_package,
      authorized_effects: {
        ...prepared.successor_package.authorized_effects,
        ...mutation,
      } as typeof prepared.successor_package.authorized_effects,
    });
    assert.deepEqual(
      preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(candidate).reason_codes,
      ['P5_PTRAS_EFFECT_BOUNDARY_INVALID'],
    );
  }
});

test('packet-trace successor rejects a Cycle-targeted replacement trace', () => {
  const prepared = preparedFixture();
  const candidate = buildScientificEvidenceP5PacketTraceSuccessorPackageV1({
    ...prepared.successor_package,
    authority: {
      ...prepared.successor_package.authority,
      packet_trace: {
        ...prepared.successor_package.authority.packet_trace,
        target_ref_type: 'validation_cycle',
      } as unknown as typeof prepared.successor_package.authority.packet_trace,
    },
  });
  assert.deepEqual(
    preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(candidate).reason_codes,
    ['P5_PTRAS_AUTHORITY_INVALID'],
  );
});

test('packet-trace successor accepts historical and lineage-fix source bindings only', () => {
  const historical = preparedFixture().successor_package;
  const lineageFix = buildScientificEvidenceP5PacketTraceSuccessorPackageV1({
    ...historical,
    source_binding: {
      source_files: [
        ...historical.source_binding.source_files,
        { path: 'successor-service.ts', sha256: hash('successor-service') },
      ],
    },
  });
  assert.deepEqual(
    preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(lineageFix).reason_codes,
    [],
  );

  for (const sourceFiles of [
    historical.source_binding.source_files.slice(0, 4),
    [
      ...lineageFix.source_binding.source_files,
      { path: 'unexpected-seventh-source.ts', sha256: hash('unexpected-seventh-source') },
    ],
  ]) {
    const candidate = buildScientificEvidenceP5PacketTraceSuccessorPackageV1({
      ...historical,
      source_binding: { source_files: sourceFiles },
    });
    assert.deepEqual(
      preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(candidate).reason_codes,
      ['P5_PTRAS_SOURCE_BINDING_INVALID'],
    );
  }
});

test('packet-trace successor acceptance binds exact package, window, and effects', () => {
  const prepared = preparedFixture();
  const acceptance = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_SCHEMA_V1,
    status: 'authorized_pending_execute' as const,
    successor_attempt_id: prepared.successor_package.successor_attempt_id,
    package_hash: prepared.successor_package.package_hash,
    authorization: {
      source: 'current_codex_task_user' as const,
      received_at: '2026-08-15T12:30:00.000Z',
      text_utf8_sha256: hash('authorization'),
      text_utf8_bytes: 128,
      user_authorized: true as const,
      authorized_effects: prepared.successor_package.authorized_effects,
    },
  };
  assert.doesNotThrow(() => assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1({
    prepared,
    acceptance,
  }));
  assert.throws(() => assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1({
    prepared,
    acceptance: { ...acceptance, package_hash: hash('different') },
  }), /T136_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_INVALID/);
});

function preparedFixture(): ScientificEvidenceP5PacketTraceSuccessorPreparedV1 {
  const successorPackage = buildScientificEvidenceP5PacketTraceSuccessorPackageV1(packageFixture());
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1,
    status: 'eligible',
    successor_package: successorPackage,
    eligibility: preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(successorPackage),
    preparation_effect_census: {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    },
  };
}

function packageFixture(): ScientificEvidenceP5PacketTraceSuccessorPackageContentV1 {
  const artifactHash = bareHash('artifact');
  const artifactIdentityHash = bareHash('artifact-identity');
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1,
    successor_attempt_id: 't136-p5-packet-trace-result-analysis-successor-1',
    source_result_analysis: {
      recovery_attempt_id: 't136-p5-result-analysis-recovery-3',
      package_hash: hash('ra-package'),
      prepared_record_sha256: hash('ra-prepared'),
      acceptance_record_sha256: hash('ra-acceptance'),
      claim_record_sha256: hash('ra-claim'),
      completion_record_sha256: hash('ra-completion'),
      final_artifact: {
        id: 'old-final-artifact',
        artifact_identity_hash: artifactIdentityHash,
        runtime_identity_hash: bareHash('runtime-identity'),
        final_artifact_hash: artifactHash,
      },
      final_admission: {
        id: 'old-final-admission',
        admission_identity_hash: bareHash('admission-identity'),
        runtime_artifact_hash: artifactIdentityHash,
        admitted_artifact_hash: artifactHash,
        status: 'admitted',
      },
    },
    source_continuation: {
      continuation_attempt_id: 't136-p5-closure-packet-continuation-1',
      package_hash: hash('continuation-package'),
      prepared_record_sha256: hash('continuation-prepared'),
      acceptance_record_sha256: hash('continuation-acceptance'),
      claim_record_sha256: hash('continuation-claim'),
      terminal_record_sha256: hash('continuation-terminal'),
      terminal_reason_code: 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED',
    },
    authority: {
      target_fingerprint: hash('target'),
      implementation_project_id: 'project-1',
      title_card_id: 'title-card-1',
      validation_cycle_id: 'cycle-1',
      expected_cycle_version: 0,
      closure_watermark_hash: hash('watermark'),
      run_id: 'run-1',
      run_manifest_hash: hash('run-manifest'),
      result_interpretation_packet_id: 'packet-1',
      source_cycle_trace: {
        id: 'cycle-trace-1',
        identity_hash: hash('cycle-trace'),
        target_ref_type: 'validation_cycle',
        target_ref_id: 'cycle-1',
        trace_status: 'complete',
      },
      packet_trace: {
        id: 'packet-trace-1',
        target_ref_type: 'result_interpretation_packet',
        target_ref_id: 'packet-1',
        target_version_id: null,
        expected_status: 'complete',
      },
      current_effects: {
        packet_trace_manifests: 0,
        runtime_artifacts: 2,
        runtime_admissions: 2,
        closures: 0,
        packets: 0,
        validation_cycle_closed_outboxes: 0,
        validation_cycle_closed_inboxes: 0,
        undelivered_integration_outboxes: 0,
      },
    },
    runtime_request: {
      run_mode: 'product',
      execution_mode: 'provider_llm',
      runtime_run_id: 'runtime-successor-1',
      model_profile_id: 'profile-1',
      model_option_id: 'option-1',
      model_profile_hash: hash('profile'),
      normalized_params_hash: hash('params'),
      provider_id: 'openai',
      model_id: 'gpt-5.6-sol',
      max_provider_call_count: 2,
      target_version_id: hash('run-manifest'),
      input_snapshot_ref_id: 'input-successor-1',
      input_snapshot_hash: hash('input'),
      source_hashes: [hash('packet-source'), hash('trace-source')],
    },
    executor: {
      mode: 'packet_trace_then_result_analysis',
      path: 'apps/backend/scripts/run-packet-trace-successor.ts',
      sha256: hash('executor'),
    },
    source_binding: {
      source_files: [
        { path: 'trace-kernel.ts', sha256: hash('trace-kernel') },
        { path: 'trace-repository.ts', sha256: hash('trace-repository') },
        { path: 'runtime.ts', sha256: hash('runtime') },
        { path: 'orchestrator.ts', sha256: hash('orchestrator') },
        { path: 'closure-repository.ts', sha256: hash('closure-repository') },
      ],
    },
    recovery_point: {
      manifest_ref: 'packet-trace-successor/point.json',
      created_at: '2026-08-15T12:00:00.000Z',
      target_fingerprint: hash('target'),
      recovery_fingerprint: hash('recovery'),
      schema_dump_sha256: hash('schema'),
      authority_data_dump_sha256: hash('data'),
      authority_table_count: 114,
    },
    authorized_effects: exactScientificEvidenceP5PacketTraceSuccessorEffectsV1(),
    operational_window: {
      prepared_at: '2026-08-15T12:15:00.000Z',
      authorization_not_after: '2026-08-15T18:15:00.000Z',
      execute_not_after: '2026-08-15T18:45:00.000Z',
    },
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function hash(seed: string): string {
  return `sha256:${bareHash(seed)}`;
}

function bareHash(seed: string): string {
  return seed.padEnd(64, '0').slice(0, 64).replace(/[^a-f0-9]/g, 'a');
}
