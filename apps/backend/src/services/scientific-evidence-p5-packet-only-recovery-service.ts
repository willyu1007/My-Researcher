import { createHash } from 'node:crypto';

import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

export const SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1 =
  'ScientificEvidenceP5PacketOnlyRecoveryPackage@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1 =
  'ScientificEvidenceP5PacketOnlyRecoveryPrepared@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ELIGIBILITY_SCHEMA_V1 =
  'ScientificEvidenceP5PacketOnlyRecoveryEligibility@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_SCHEMA_V1 =
  'ScientificEvidenceP5PacketOnlyRecoveryAcceptance@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_REASON_CODES = [
  'P5_POR_PACKAGE_HASH_MISMATCH',
  'P5_POR_PREDECESSOR_INVALID',
  'P5_POR_AUTHORITY_INVALID',
  'P5_POR_EFFECT_BOUNDARY_INVALID',
  'P5_POR_EXECUTOR_INVALID',
  'P5_POR_SOURCE_BINDING_INVALID',
  'P5_POR_RECOVERY_POINT_INVALID',
  'P5_POR_WINDOW_INVALID',
  'P5_POR_FORBIDDEN_FIELD_PRESENT',
] as const;

export type ScientificEvidenceP5PacketOnlyRecoveryReasonCode =
  (typeof SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_REASON_CODES)[number];

export interface ScientificEvidenceP5PacketOnlyRecoveryEffectsV1 {
  operation: 'packet_only_terminal_outbox_recovery';
  external_provider_call_count: 0;
  create_job_call_count: 0;
  alibaba_cloud_call_count: 0;
  runtime_artifact_write_count: 0;
  runtime_admission_write_count: 0;
  validation_cycle_update_count: 0;
  closure_write_count: 0;
  integration_outbox_write_count: 0;
  projection_inbox_write_count: 0;
  packet_write_count_max: 1;
  terminal_outbox_delivery_count_max: 1;
  terminal_outbox_reset_count: 0;
  claim_write_count: 0;
  dossier_write_count: 0;
  persistent_capability_change_count: 0;
}

export interface ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1;
  recovery_attempt_id: string;
  predecessor: {
    continuation_attempt_id: string;
    package_hash: string;
    prepared_record_sha256: string;
    acceptance_record_sha256: string;
    claim_record_sha256: string;
    terminal_record_sha256: string;
    completion_absent: true;
    terminal_reason_code: string;
    source_successor: {
      successor_attempt_id: string;
      package_hash: string;
      prepared_record_sha256: string;
      acceptance_record_sha256: string;
      claim_record_sha256: string;
      completion_record_sha256: string;
    };
  };
  authority: {
    target_fingerprint: string;
    implementation_project_id: string;
    title_card_id: string;
    validation_cycle_id: string;
    closure: {
      closure_id: string;
      closure_snapshot_hash: string;
      closure_kind: 'scientific_evidence_assessed';
      accepted_proposal_id: string;
      accepted_proposal_hash: string;
      scientific_disposition: 'positive';
      created_at: string;
    };
    terminal_outbox: {
      outbox_id: string;
      event_id: string;
      event_envelope_hash: string;
      payload_hash: string;
      relay_status: 'terminal';
      relay_attempt_count: 1;
      last_relay_error_code: 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT';
      terminal_updated_at: string;
    };
    processed_inbox: {
      inbox_id: string;
      consumer_name: 'pi-projection-feed-v2';
      event_id: string;
      event_envelope_hash: string;
      payload_hash: string;
      status: 'processed';
      outcome: 'processed';
      processed_at: string;
    };
    packet: {
      result_interpretation_packet_id: string;
      packet_content_hash: string;
      trace_manifest_id: string;
      created_at: string;
    };
    current_effects: {
      packet_trace_manifests: 1;
      packet_trace_repair_queue_items: 0;
      runtime_artifacts: 4;
      runtime_admissions: 4;
      closures: 1;
      packets: 0;
      validation_cycle_closed_outboxes: 1;
      validation_cycle_closed_inboxes: 1;
      undelivered_integration_outboxes: 1;
      claims: 0;
      dossiers: 0;
    };
  };
  executor: {
    mode: 'packet_only_terminal_outbox_recovery';
    path: string;
    sha256: string;
  };
  source_binding: {
    source_files: Array<{ path: string; sha256: string }>;
  };
  recovery_point: {
    manifest_ref: string;
    created_at: string;
    target_fingerprint: string;
    recovery_fingerprint: string;
    schema_dump_sha256: string;
    authority_data_dump_sha256: string;
    authority_table_count: 114;
  };
  authorized_effects: ScientificEvidenceP5PacketOnlyRecoveryEffectsV1;
  operational_window: {
    prepared_at: string;
    authorization_not_after: string;
    execute_not_after: string;
  };
}

export interface ScientificEvidenceP5PacketOnlyRecoveryPackageV1
  extends ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1 {
  package_hash: string;
}

export interface ScientificEvidenceP5PacketOnlyRecoveryEligibilityV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ELIGIBILITY_SCHEMA_V1;
  package_hash: string;
  status: 'eligible' | 'ineligible';
  reason_codes: ScientificEvidenceP5PacketOnlyRecoveryReasonCode[];
  eligibility_record_hash: string;
}

export interface ScientificEvidenceP5PacketOnlyRecoveryPreparedV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1;
  status: 'eligible';
  recovery_package: ScientificEvidenceP5PacketOnlyRecoveryPackageV1;
  eligibility: ScientificEvidenceP5PacketOnlyRecoveryEligibilityV1;
  preparation_effect_census: {
    database_writes: 0;
    external_calls: 0;
    create_job_calls: 0;
    capability_changes: 0;
    provider_credentials_read: 0;
  };
}

export interface ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_SCHEMA_V1;
  status: 'authorized_pending_execute';
  recovery_attempt_id: string;
  package_hash: string;
  authorization: {
    source: 'current_codex_task_user';
    received_at: string;
    text_utf8_sha256: string;
    text_utf8_bytes: number;
    user_authorized: true;
    authorized_effects: ScientificEvidenceP5PacketOnlyRecoveryEffectsV1;
  };
}

export function exactScientificEvidenceP5PacketOnlyRecoveryEffectsV1():
ScientificEvidenceP5PacketOnlyRecoveryEffectsV1 {
  return {
    operation: 'packet_only_terminal_outbox_recovery',
    external_provider_call_count: 0,
    create_job_call_count: 0,
    alibaba_cloud_call_count: 0,
    runtime_artifact_write_count: 0,
    runtime_admission_write_count: 0,
    validation_cycle_update_count: 0,
    closure_write_count: 0,
    integration_outbox_write_count: 0,
    projection_inbox_write_count: 0,
    packet_write_count_max: 1,
    terminal_outbox_delivery_count_max: 1,
    terminal_outbox_reset_count: 0,
    claim_write_count: 0,
    dossier_write_count: 0,
    persistent_capability_change_count: 0,
  };
}

export function buildScientificEvidenceP5PacketOnlyRecoveryPackageV1(
  content:
    | ScientificEvidenceP5PacketOnlyRecoveryPackageContentV1
    | ScientificEvidenceP5PacketOnlyRecoveryPackageV1,
): ScientificEvidenceP5PacketOnlyRecoveryPackageV1 {
  const { package_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5PacketOnlyRecoveryPackageV1;
  return {
    ...snapshot,
    package_hash: semanticHash('ScientificEvidenceP5PacketOnlyRecoveryPackage', snapshot),
  };
}

export function preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1(
  recoveryPackage: ScientificEvidenceP5PacketOnlyRecoveryPackageV1,
): ScientificEvidenceP5PacketOnlyRecoveryEligibilityV1 {
  const reasons = new Set<ScientificEvidenceP5PacketOnlyRecoveryReasonCode>();
  addUnless(reasons, 'P5_POR_PACKAGE_HASH_MISMATCH', () => {
    const { package_hash: _stored, ...content } = recoveryPackage;
    return recoveryPackage.schema_version
        === SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PACKAGE_SCHEMA_V1
      && recoveryPackage.package_hash
        === semanticHash('ScientificEvidenceP5PacketOnlyRecoveryPackage', content);
  });
  addUnless(reasons, 'P5_POR_PREDECESSOR_INVALID', () => {
    const predecessor = recoveryPackage.predecessor;
    const source = predecessor.source_successor;
    return [
      predecessor.continuation_attempt_id,
      predecessor.terminal_reason_code,
      source.successor_attempt_id,
    ].every(isNonEmpty)
      && [
        predecessor.package_hash,
        predecessor.prepared_record_sha256,
        predecessor.acceptance_record_sha256,
        predecessor.claim_record_sha256,
        predecessor.terminal_record_sha256,
        source.package_hash,
        source.prepared_record_sha256,
        source.acceptance_record_sha256,
        source.claim_record_sha256,
        source.completion_record_sha256,
      ].every(isHash)
      && predecessor.completion_absent === true;
  });
  addUnless(reasons, 'P5_POR_AUTHORITY_INVALID', () => {
    const authority = recoveryPackage.authority;
    const closure = authority.closure;
    const outbox = authority.terminal_outbox;
    const inbox = authority.processed_inbox;
    const packet = authority.packet;
    return isHash(authority.target_fingerprint)
      && [
        authority.implementation_project_id,
        authority.title_card_id,
        authority.validation_cycle_id,
        closure.closure_id,
        closure.accepted_proposal_id,
        outbox.outbox_id,
        outbox.event_id,
        inbox.inbox_id,
        packet.result_interpretation_packet_id,
        packet.trace_manifest_id,
      ].every(isNonEmpty)
      && isHash(closure.closure_snapshot_hash)
      && isBareHash(closure.accepted_proposal_hash)
      && closure.closure_kind === 'scientific_evidence_assessed'
      && closure.scientific_disposition === 'positive'
      && [closure.created_at, outbox.terminal_updated_at, inbox.processed_at, packet.created_at]
        .every(isIsoTimestamp)
      && [
        outbox.event_envelope_hash,
        outbox.payload_hash,
        inbox.event_envelope_hash,
        inbox.payload_hash,
        packet.packet_content_hash,
      ].every(isHash)
      && outbox.event_id === inbox.event_id
      && outbox.event_envelope_hash === inbox.event_envelope_hash
      && outbox.payload_hash === inbox.payload_hash
      && outbox.relay_status === 'terminal'
      && outbox.relay_attempt_count === 1
      && outbox.last_relay_error_code
        === 'RESULT_INTERPRETATION_PACKET_AUTHORITY_CONFLICT'
      && inbox.consumer_name === 'pi-projection-feed-v2'
      && inbox.status === 'processed'
      && inbox.outcome === 'processed'
      && canonicalEqual(authority.current_effects, exactCurrentEffects());
  });
  addUnless(reasons, 'P5_POR_EFFECT_BOUNDARY_INVALID', () => (
    canonicalEqual(
      recoveryPackage.authorized_effects,
      exactScientificEvidenceP5PacketOnlyRecoveryEffectsV1(),
    )
  ));
  addUnless(reasons, 'P5_POR_EXECUTOR_INVALID', () => (
    recoveryPackage.executor.mode === 'packet_only_terminal_outbox_recovery'
      && isNonEmpty(recoveryPackage.executor.path)
      && isHash(recoveryPackage.executor.sha256)
  ));
  addUnless(reasons, 'P5_POR_SOURCE_BINDING_INVALID', () => (
    recoveryPackage.source_binding.source_files.length >= 4
      && new Set(recoveryPackage.source_binding.source_files.map((file) => file.path)).size
        === recoveryPackage.source_binding.source_files.length
      && recoveryPackage.source_binding.source_files.every((file) => (
        isNonEmpty(file.path) && isHash(file.sha256)
      ))
  ));
  addUnless(reasons, 'P5_POR_RECOVERY_POINT_INVALID', () => {
    const point = recoveryPackage.recovery_point;
    return isNonEmpty(point.manifest_ref)
      && isIsoTimestamp(point.created_at)
      && point.target_fingerprint === recoveryPackage.authority.target_fingerprint
      && [
        point.target_fingerprint,
        point.recovery_fingerprint,
        point.schema_dump_sha256,
        point.authority_data_dump_sha256,
      ].every(isHash)
      && point.authority_table_count === 114;
  });
  addUnless(reasons, 'P5_POR_WINDOW_INVALID', () => {
    const window = recoveryPackage.operational_window;
    return [window.prepared_at, window.authorization_not_after, window.execute_not_after]
      .every(isIsoTimestamp)
      && Date.parse(window.prepared_at) < Date.parse(window.authorization_not_after)
      && Date.parse(window.authorization_not_after) < Date.parse(window.execute_not_after);
  });
  addUnless(reasons, 'P5_POR_FORBIDDEN_FIELD_PRESENT', () => {
    const serialized = canonicalizeExperimentV2Json(recoveryPackage).toLowerCase();
    return ![
      'access_key_id',
      'access_key_secret',
      'security_token',
      'credential_payload',
      'provider_response',
    ].some((field) => serialized.includes(`\"${field}\"`));
  });
  const reasonCodes = SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_REASON_CODES
    .filter((code) => reasons.has(code));
  const core = {
    package_hash: recoveryPackage.package_hash,
    status: reasonCodes.length === 0 ? 'eligible' : 'ineligible',
    reason_codes: reasonCodes,
  } as const;
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ELIGIBILITY_SCHEMA_V1,
    ...core,
    eligibility_record_hash: semanticHash(
      'ScientificEvidenceP5PacketOnlyRecoveryEligibility',
      core,
    ),
  };
}

export function assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
): void {
  const eligibility = preflightScientificEvidenceP5PacketOnlyRecoveryPackageV1(
    prepared.recovery_package,
  );
  if (
    prepared.schema_version
      !== SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_PREPARED_SCHEMA_V1
    || prepared.status !== 'eligible'
    || eligibility.status !== 'eligible'
    || !canonicalEqual(prepared.eligibility, eligibility)
    || !canonicalEqual(prepared.preparation_effect_census, {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    })
  ) throw new Error('T136_P5_PACKET_ONLY_RECOVERY_PREPARED_INVALID');
}

export function assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1(input: {
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1;
  acceptance: ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1;
}): void {
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(input.prepared);
  const recoveryPackage = input.prepared.recovery_package;
  const acceptance = input.acceptance;
  if (
    acceptance.schema_version
      !== SCIENTIFIC_EVIDENCE_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_SCHEMA_V1
    || acceptance.status !== 'authorized_pending_execute'
    || acceptance.recovery_attempt_id !== recoveryPackage.recovery_attempt_id
    || acceptance.package_hash !== recoveryPackage.package_hash
    || acceptance.authorization.source !== 'current_codex_task_user'
    || acceptance.authorization.user_authorized !== true
    || !isIsoTimestamp(acceptance.authorization.received_at)
    || !isHash(acceptance.authorization.text_utf8_sha256)
    || !Number.isSafeInteger(acceptance.authorization.text_utf8_bytes)
    || acceptance.authorization.text_utf8_bytes <= 0
    || !canonicalEqual(
      acceptance.authorization.authorized_effects,
      recoveryPackage.authorized_effects,
    )
    || Date.parse(acceptance.authorization.received_at)
      > Date.parse(recoveryPackage.operational_window.authorization_not_after)
  ) throw new Error('T136_P5_PACKET_ONLY_RECOVERY_ACCEPTANCE_INVALID');
}

export function assertScientificEvidenceP5PacketOnlyRecoveryWindow(
  recoveryPackage: ScientificEvidenceP5PacketOnlyRecoveryPackageV1,
  now = new Date().toISOString(),
): void {
  if (
    !isIsoTimestamp(now)
    || Date.parse(now) > Date.parse(recoveryPackage.operational_window.execute_not_after)
  ) throw new Error('T136_P5_PACKET_ONLY_RECOVERY_WINDOW_EXPIRED');
}

function exactCurrentEffects() {
  return {
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
  } as const;
}

function addUnless(
  reasons: Set<ScientificEvidenceP5PacketOnlyRecoveryReasonCode>,
  code: ScientificEvidenceP5PacketOnlyRecoveryReasonCode,
  check: () => boolean,
): void {
  try {
    if (!check()) reasons.add(code);
  } catch {
    reasons.add(code);
  }
}

function semanticHash(domain: string, value: unknown): string {
  return `sha256:${createHash('sha256')
    .update(`${domain}\n${canonicalizeExperimentV2Json(value)}`)
    .digest('hex')}`;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isBareHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}
