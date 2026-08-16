import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1,
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
  buildScientificEvidenceP5PacketOnlyRecoveryPackageV1,
  exactScientificEvidenceP5PacketOnlyRecoveryEffectsV1,
  preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1,
  type ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1,
  type ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
} from './scientific-evidence-p5-packet-only-recovery-service.js';

test('Packet-only recovery binds exact terminal outbox and permits only Packet/delivery effects', () => {
  const prepared = preparedFixture();
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(prepared);
  assert.equal(prepared.eligibility.status, 'eligible');
  assert.equal(prepared.recovery_package.authorized_effects.packet_write_count_max, 1);
  assert.equal(
    prepared.recovery_package.authorized_effects.terminal_outbox_delivery_count_max,
    1,
  );
  assert.equal(prepared.recovery_package.authorized_effects.terminal_outbox_reset_count, 0);
});

test('Packet-only recovery rejects outbox identity drift', () => {
  const prepared = preparedFixture();
  const candidate = buildScientificEvidenceP5PacketOnlyRecoveryPackageV1({
    ...prepared.recovery_package,
    authority: {
      ...prepared.recovery_package.authority,
      terminal_outbox: {
        ...prepared.recovery_package.authority.terminal_outbox,
        event_id: 'different-event',
      },
    },
  });
  assert.deepEqual(
    preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1(candidate).reason_codes,
    ['P5_POR_AUTHORITY_INVALID'],
  );
});

test('Packet-only recovery rejects reset, Closure, provider, Claim, and Dossier expansion', () => {
  const prepared = preparedFixture();
  for (const mutation of [
    { terminal_outbox_reset_count: 1 },
    { closure_write_count: 1 },
    { external_provider_call_count: 1 },
    { claim_write_count: 1 },
    { dossier_write_count: 1 },
  ]) {
    const candidate = buildScientificEvidenceP5PacketOnlyRecoveryPackageV1({
      ...prepared.recovery_package,
      authorized_effects: {
        ...prepared.recovery_package.authorized_effects,
        ...mutation,
      } as typeof prepared.recovery_package.authorized_effects,
    });
    assert.deepEqual(
      preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1(candidate).reason_codes,
      ['P5_POR_EFFECT_BOUNDARY_INVALID'],
    );
  }
});

test('Packet-only recovery acceptance binds exact package and effects', () => {
  const prepared = preparedFixture();
  const acceptance = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_SCHEMA_V1,
    status: 'authorized_pending_execute' as const,
    recovery_attempt_id: prepared.recovery_package.recovery_attempt_id,
    package_hash: prepared.recovery_package.package_hash,
    authorization: {
      source: 'current_codex_task_user' as const,
      received_at: '2026-08-16T02:30:00.000Z',
      text_utf8_sha256: hash('authorization'),
      text_utf8_bytes: 128,
      user_authorized: true as const,
      authorized_effects: prepared.recovery_package.authorized_effects,
    },
  };
  assert.doesNotThrow(() => assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1({
    prepared,
    acceptance,
  }));
  assert.throws(() => assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1({
    prepared,
    acceptance: { ...acceptance, package_hash: hash('different') },
  }), /T136_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_INVALID/);
});

function preparedFixture(): ScientificEvidenceP5PacketOnlyRecoveryPreparedV1 {
  const recoveryPackage = buildScientificEvidenceP5PacketOnlyRecoveryPackageV1(packageFixture());
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1,
    status: 'eligible',
    recovery_package: recoveryPackage,
    eligibility: preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1(recoveryPackage),
    preparation_effect_census: {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    },
  };
}

function packageFixture(): ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1 {
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1,
    recovery_attempt_id: 't136-p5-packet-only-recovery-1',
    predecessor: {
      continuation_attempt_id: 't136-p5-closure-packet-continuation-2',
      package_hash: hash('continuation-package'),
      prepared_record_sha256: hash('continuation-prepared'),
      acceptance_record_sha256: hash('continuation-acceptance'),
      claim_record_sha256: hash('continuation-claim'),
      terminal_record_sha256: hash('continuation-terminal'),
      completion_absent: true,
      terminal_reason_code: 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED',
      source_successor: {
        successor_attempt_id: 't136-p5-packet-trace-result-analysis-successor-3',
        package_hash: hash('successor-package'),
        prepared_record_sha256: hash('successor-prepared'),
        acceptance_record_sha256: hash('successor-acceptance'),
        claim_record_sha256: hash('successor-claim'),
        completion_record_sha256: hash('successor-completion'),
      },
    },
    authority: {
      target_fingerprint: hash('target'),
      implementation_project_id: 'project-1',
      title_card_id: 'title-card-1',
      validation_cycle_id: 'cycle-1',
      closure: {
        closure_id: 'closure-1',
        closure_snapshot_hash: hash('closure'),
        closure_kind: 'scientific_evidence_assessed',
        accepted_proposal_id: 'proposal-1',
        accepted_proposal_hash: bareHash('proposal'),
        scientific_disposition: 'positive',
        created_at: '2026-08-16T02:00:00.000Z',
      },
      terminal_outbox: {
        outbox_id: 'outbox-1',
        event_id: 'event-1',
        event_envelope_hash: hash('event'),
        payload_hash: hash('payload'),
        relay_status: 'terminal',
        relay_attempt_count: 1,
        last_relay_error_code: 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT',
        terminal_updated_at: '2026-08-16T02:00:00.100Z',
      },
      processed_inbox: {
        inbox_id: 'inbox-1',
        consumer_name: 'pi-projection-feed-v2',
        event_id: 'event-1',
        event_envelope_hash: hash('event'),
        payload_hash: hash('payload'),
        status: 'processed',
        outcome: 'processed',
        processed_at: '2026-08-16T02:00:00.050Z',
      },
      packet: {
        result_interpretation_packet_id: 'packet-1',
        packet_content_hash: hash('packet'),
        trace_manifest_id: 'trace-1',
        created_at: '2026-08-16T02:00:00.000Z',
      },
      current_effects: {
        packet_trace_manifests: 1,
        packet_trace_repair_queue_items: 0,
        runtime_artifacts: 4,
        runtime_admissions: 4,
        closures: 1,
        packets: 0,
        validation_cycle_closed_outboxes: 1,
        validation_cycle_closed_inboxes: 1,
        undelivered_integration_outboxes: 1,
        claims: 0,
        dossiers: 0,
      },
    },
    executor: {
      mode: 'packet_only_terminal_outbox_recovery',
      path: 'apps/backend/scripts/run-scientific-evidence-p5-packet-only-recovery.ts',
      sha256: hash('executor'),
    },
    source_binding: {
      source_files: [
        { path: 'materializer.ts', sha256: hash('materializer') },
        { path: 'repository.ts', sha256: hash('repository') },
        { path: 'contract.ts', sha256: hash('contract') },
        { path: 'terminal.ts', sha256: hash('terminal') },
      ],
    },
    recovery_point: {
      manifest_ref: 'packet-only/point.json',
      created_at: '2026-08-16T02:10:00.000Z',
      target_fingerprint: hash('target'),
      recovery_fingerprint: hash('recovery'),
      schema_dump_sha256: hash('schema'),
      authority_data_dump_sha256: hash('data'),
      authority_table_count: 114,
    },
    authorized_effects: exactScientificEvidenceP5PacketOnlyRecoveryEffectsV1(),
    operational_window: {
      prepared_at: '2026-08-16T02:15:00.000Z',
      authorization_not_after: '2026-08-16T08:15:00.000Z',
      execute_not_after: '2026-08-16T08:45:00.000Z',
    },
  };
}

function hash(seed: string): string {
  return `sha256:${bareHash(seed)}`;
}

function bareHash(seed: string): string {
  return seed.padEnd(64, '0').slice(0, 64).replace(/[^a-f0-9]/g, 'a');
}
