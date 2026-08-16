import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ACCEPTANCE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5ClosurePacketAcceptanceV1,
  assertScientificEvidenceP5ClosurePacketPreparedV1,
  buildScientificEvidenceP5ClosurePacketPackageV1,
  exactScientificEvidenceP5ClosurePacketEffectsV1,
  preflightScientificEvidenceP5ClosurePacketPackageV1,
  type ScientificEvidenceP5ClosurePacketPackageContentV1,
  type ScientificEvidenceP5ClosurePacketPreparedV1,
} from './scientific-evidence-p5-closure-packet-continuation-service.js';

test('closure-packet package binds the admitted final artifact and exact zero-provider effects', () => {
  const prepared = preparedFixture();
  assertScientificEvidenceP5ClosurePacketPreparedV1(prepared);
  assert.equal(prepared.eligibility.status, 'eligible');
  assert.deepEqual(prepared.eligibility.reason_codes, []);
  assert.equal(prepared.continuation_package.authorized_effects.external_provider_call_count, 0);
  assert.equal(prepared.continuation_package.authorized_effects.packet_write_count_max, 1);
  assert.equal(prepared.continuation_package.authorized_effects.claim_write_count, 0);
});

test('closure-packet package rejects provider, runtime, claim, or dossier expansion', () => {
  const prepared = preparedFixture();
  for (const mutation of [
    { external_provider_call_count: 1 },
    { runtime_artifact_write_count: 1 },
    { claim_write_count: 1 },
    { dossier_write_count: 1 },
  ]) {
    const candidate = buildScientificEvidenceP5ClosurePacketPackageV1({
      ...prepared.continuation_package,
      authorized_effects: {
        ...prepared.continuation_package.authorized_effects,
        ...mutation,
      } as typeof prepared.continuation_package.authorized_effects,
    });
    const eligibility = preflightScientificEvidenceP5ClosurePacketPackageV1(candidate);
    assert.equal(eligibility.status, 'ineligible');
    assert.deepEqual(eligibility.reason_codes, ['P5_CP_EFFECT_BOUNDARY_INVALID']);
  }
});

test('closure-packet package binds the completed Packet-trace successor and exact current trace state', () => {
  const legacy = packageFixture();
  const successor = buildScientificEvidenceP5ClosurePacketPackageV1({
    ...legacy,
    continuation_attempt_id: 't136-p5-closure-packet-continuation-2',
    source_result_analysis: {
      source_stage: 'packet_trace_result_analysis_successor',
      successor_attempt_id: 't136-p5-packet-trace-result-analysis-successor-3',
      package_hash: hash('successor-package'),
      prepared_record_sha256: hash('successor-prepared'),
      acceptance_record_sha256: hash('successor-acceptance'),
      claim_record_sha256: hash('successor-claim'),
      completion_record_sha256: hash('successor-completion'),
      final_artifact: legacy.source_result_analysis.final_artifact,
      final_admission: legacy.source_result_analysis.final_admission,
    },
    authority: {
      ...legacy.authority,
      packet_trace: {
        id: 'packet-trace-1',
        target_ref_type: 'result_interpretation_packet',
        target_ref_id: legacy.authority.result_interpretation_packet_id,
        target_version_id: null,
        expected_status: 'complete',
      },
      current_effects: {
        packet_trace_manifests: 1,
        packet_trace_repair_queue_items: 0,
        runtime_artifacts: 4,
        runtime_admissions: 4,
        closures: 0,
        packets: 0,
        validation_cycle_closed_outboxes: 0,
        validation_cycle_closed_inboxes: 0,
        undelivered_integration_outboxes: 0,
      },
    },
    closure_request: {
      ...legacy.closure_request,
      idempotency_key: 't136-p5-closure-packet-continuation-2:scientific-close',
    },
    source_binding: {
      source_files: [
        ...legacy.source_binding.source_files,
        { path: 'continuation-contract.ts', sha256: hash('continuation-contract') },
      ],
    },
  });
  assert.deepEqual(
    preflightScientificEvidenceP5ClosurePacketPackageV1(successor).reason_codes,
    [],
  );

  const invalidSource = buildScientificEvidenceP5ClosurePacketPackageV1({
    ...successor,
    source_result_analysis: {
      ...successor.source_result_analysis,
      claim_record_sha256: 'missing-prefix',
    },
  });
  assert.deepEqual(
    preflightScientificEvidenceP5ClosurePacketPackageV1(invalidSource).reason_codes,
    ['P5_CP_SOURCE_RESULT_ANALYSIS_INVALID'],
  );
  const { packet_trace: _packetTrace, ...authorityWithoutPacketTrace } = successor.authority;
  const invalidTrace = buildScientificEvidenceP5ClosurePacketPackageV1({
    ...successor,
    authority: authorityWithoutPacketTrace,
  });
  assert.deepEqual(
    preflightScientificEvidenceP5ClosurePacketPackageV1(invalidTrace).reason_codes,
    ['P5_CP_AUTHORITY_INVALID'],
  );
});

test('closure-packet acceptance binds the exact package, window, and effects', () => {
  const prepared = preparedFixture();
  const acceptance = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ACCEPTANCE_SCHEMA_V1,
    status: 'authorized_pending_execute' as const,
    continuation_attempt_id: prepared.continuation_package.continuation_attempt_id,
    package_hash: prepared.continuation_package.package_hash,
    authorization: {
      source: 'current_codex_task_user' as const,
      received_at: '2026-08-15T10:30:00.000Z',
      text_utf8_sha256: hash('authorization'),
      text_utf8_bytes: 128,
      user_authorized: true as const,
      authorized_effects: prepared.continuation_package.authorized_effects,
    },
  };
  assert.doesNotThrow(() => assertScientificEvidenceP5ClosurePacketAcceptanceV1({
    prepared,
    acceptance,
  }));
  assert.throws(() => assertScientificEvidenceP5ClosurePacketAcceptanceV1({
    prepared,
    acceptance: { ...acceptance, package_hash: hash('different') },
  }), /T136_P5_CLOSURE_PACKET_ACCEPTANCE_INVALID/);
});

function preparedFixture(): ScientificEvidenceP5ClosurePacketPreparedV1 {
  const continuationPackage = buildScientificEvidenceP5ClosurePacketPackageV1(packageFixture());
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1,
    status: 'eligible',
    continuation_package: continuationPackage,
    eligibility: preflightScientificEvidenceP5ClosurePacketPackageV1(continuationPackage),
    preparation_effect_census: {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    },
  };
}

function packageFixture(): ScientificEvidenceP5ClosurePacketPackageContentV1 {
  const artifactHash = bareHash('artifact');
  const artifactIdentityHash = bareHash('artifact-identity');
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1,
    continuation_attempt_id: 't136-p5-closure-packet-continuation-1',
    source_result_analysis: {
      recovery_attempt_id: 't136-p5-result-analysis-recovery-3',
      package_hash: hash('source-package'),
      prepared_record_sha256: hash('prepared'),
      acceptance_record_sha256: hash('acceptance'),
      completion_record_sha256: hash('completion'),
      final_artifact: {
        id: 'final-artifact-1',
        artifact_identity_hash: artifactIdentityHash,
        runtime_identity_hash: bareHash('runtime-identity'),
        final_artifact_hash: artifactHash,
      },
      final_admission: {
        id: 'final-admission-1',
        admission_identity_hash: bareHash('admission-identity'),
        runtime_artifact_hash: artifactIdentityHash,
        admitted_artifact_hash: artifactHash,
        status: 'admitted',
      },
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
      current_effects: {
        runtime_artifacts: 2,
        runtime_admissions: 2,
        closures: 0,
        packets: 0,
        validation_cycle_closed_outboxes: 0,
        validation_cycle_closed_inboxes: 0,
        undelivered_integration_outboxes: 0,
      },
    },
    closure_request: {
      closure_kind: 'scientific_evidence_assessed',
      accepted_proposal_id: 'final-artifact-1',
      expected_proposal_hash: artifactHash,
      idempotency_key: 't136-p5-closure-packet-continuation-1:scientific-close',
    },
    executor: {
      mode: 'closure_packet_only',
      path: 'apps/backend/scripts/run-closure-packet-continuation.ts',
      sha256: hash('executor'),
    },
    source_binding: {
      source_files: [
        { path: 'closure-service.ts', sha256: hash('closure-service') },
        { path: 'packet-materializer.ts', sha256: hash('packet-materializer') },
        { path: 'relay-service.ts', sha256: hash('relay-service') },
        { path: 'projection-consumer.ts', sha256: hash('projection-consumer') },
      ],
    },
    recovery_point: {
      manifest_ref: 'closure-packet/point.json',
      created_at: '2026-08-15T10:00:00.000Z',
      target_fingerprint: hash('target'),
      recovery_fingerprint: hash('recovery'),
      schema_dump_sha256: hash('schema'),
      authority_data_dump_sha256: hash('data'),
      authority_table_count: 114,
    },
    authorized_effects: exactScientificEvidenceP5ClosurePacketEffectsV1(),
    operational_window: {
      prepared_at: '2026-08-15T10:15:00.000Z',
      authorization_not_after: '2026-08-15T14:15:00.000Z',
      execute_not_after: '2026-08-15T14:45:00.000Z',
    },
  };
}

function hash(seed: string): string {
  return `sha256:${bareHash(seed)}`;
}

function bareHash(seed: string): string {
  return seed.padEnd(64, '0').slice(0, 64).replace(/[^a-f0-9]/g, 'a');
}
