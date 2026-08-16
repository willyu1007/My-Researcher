import { createHash } from 'node:crypto';

import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

export const SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1 =
  'ScientificEvidenceP5ClosurePacketContinuationPackage@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ELIGIBILITY_SCHEMA_V1 =
  'ScientificEvidenceP5ClosurePacketContinuationEligibility@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1 =
  'ScientificEvidenceP5ClosurePacketContinuationPrepared@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ACCEPTANCE_SCHEMA_V1 =
  'ScientificEvidenceP5ClosurePacketContinuationAcceptance@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_REASON_CODES = [
  'P5_CP_PACKAGE_HASH_MISMATCH',
  'P5_CP_SOURCE_RESULT_ANALYSIS_INVALID',
  'P5_CP_AUTHORITY_INVALID',
  'P5_CP_CLOSURE_REQUEST_INVALID',
  'P5_CP_EFFECT_BOUNDARY_INVALID',
  'P5_CP_RECOVERY_POINT_INVALID',
  'P5_CP_SOURCE_BINDING_INVALID',
  'P5_CP_WINDOW_INVALID',
  'P5_CP_FORBIDDEN_FIELD_PRESENT',
] as const;

export type ScientificEvidenceP5ClosurePacketReasonCode =
  (typeof SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_REASON_CODES)[number];

export interface ScientificEvidenceP5ClosurePacketEffectsV1 {
  operation: 'closure_packet_continuation';
  external_provider_call_count: 0;
  create_job_call_count: 0;
  alibaba_cloud_call_count: 0;
  runtime_artifact_write_count: 0;
  runtime_admission_write_count: 0;
  validation_cycle_update_count_max: 1;
  closure_write_count_max: 1;
  integration_outbox_write_count_max: 1;
  projection_inbox_write_count_max: 1;
  packet_write_count_max: 1;
  outbox_delivery_count_max: 1;
  claim_write_count: 0;
  dossier_write_count: 0;
  persistent_capability_change_count: 0;
}

interface ScientificEvidenceP5ClosurePacketFinalArtifactBindingV1 {
  id: string;
  artifact_identity_hash: string;
  runtime_identity_hash: string;
  final_artifact_hash: string;
}

interface ScientificEvidenceP5ClosurePacketFinalAdmissionBindingV1 {
  id: string;
  admission_identity_hash: string;
  runtime_artifact_hash: string;
  admitted_artifact_hash: string;
  status: 'admitted';
}

interface ScientificEvidenceP5ClosurePacketLegacyResultAnalysisSourceV1 {
  recovery_attempt_id: string;
  package_hash: string;
  prepared_record_sha256: string;
  acceptance_record_sha256: string;
  completion_record_sha256: string;
  final_artifact: ScientificEvidenceP5ClosurePacketFinalArtifactBindingV1;
  final_admission: ScientificEvidenceP5ClosurePacketFinalAdmissionBindingV1;
}

export interface ScientificEvidenceP5ClosurePacketSuccessorSourceV1 {
  source_stage: 'packet_trace_result_analysis_successor';
  successor_attempt_id: string;
  package_hash: string;
  prepared_record_sha256: string;
  acceptance_record_sha256: string;
  claim_record_sha256: string;
  completion_record_sha256: string;
  final_artifact: ScientificEvidenceP5ClosurePacketFinalArtifactBindingV1;
  final_admission: ScientificEvidenceP5ClosurePacketFinalAdmissionBindingV1;
}

export type ScientificEvidenceP5ClosurePacketResultAnalysisSourceV1 =
  | ScientificEvidenceP5ClosurePacketLegacyResultAnalysisSourceV1
  | ScientificEvidenceP5ClosurePacketSuccessorSourceV1;

interface ScientificEvidenceP5ClosurePacketLegacyCurrentEffectsV1 {
  runtime_artifacts: 2;
  runtime_admissions: 2;
  closures: 0;
  packets: 0;
  validation_cycle_closed_outboxes: 0;
  validation_cycle_closed_inboxes: 0;
  undelivered_integration_outboxes: 0;
}

interface ScientificEvidenceP5ClosurePacketSuccessorCurrentEffectsV1 {
  packet_trace_manifests: 1;
  packet_trace_repair_queue_items: 0;
  runtime_artifacts: 4;
  runtime_admissions: 4;
  closures: 0;
  packets: 0;
  validation_cycle_closed_outboxes: 0;
  validation_cycle_closed_inboxes: 0;
  undelivered_integration_outboxes: 0;
}

export interface ScientificEvidenceP5ClosurePacketPackageContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1;
  continuation_attempt_id: string;
  source_result_analysis: ScientificEvidenceP5ClosurePacketResultAnalysisSourceV1;
  authority: {
    target_fingerprint: string;
    implementation_project_id: string;
    title_card_id: string;
    validation_cycle_id: string;
    expected_cycle_version: number;
    closure_watermark_hash: string;
    run_id: string;
    run_manifest_hash: string;
    result_interpretation_packet_id: string;
    packet_trace?: {
      id: string;
      target_ref_type: 'result_interpretation_packet';
      target_ref_id: string;
      target_version_id: null;
      expected_status: 'complete';
    };
    current_effects:
      | ScientificEvidenceP5ClosurePacketLegacyCurrentEffectsV1
      | ScientificEvidenceP5ClosurePacketSuccessorCurrentEffectsV1;
  };
  closure_request: {
    closure_kind: 'scientific_evidence_assessed';
    accepted_proposal_id: string;
    expected_proposal_hash: string;
    idempotency_key: string;
  };
  executor: {
    mode: 'closure_packet_only';
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
  authorized_effects: ScientificEvidenceP5ClosurePacketEffectsV1;
  operational_window: {
    prepared_at: string;
    authorization_not_after: string;
    execute_not_after: string;
  };
}

export interface ScientificEvidenceP5ClosurePacketPackageV1
  extends ScientificEvidenceP5ClosurePacketPackageContentV1 {
  package_hash: string;
}

export interface ScientificEvidenceP5ClosurePacketEligibilityV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ELIGIBILITY_SCHEMA_V1;
  package_hash: string;
  status: 'eligible' | 'ineligible';
  reason_codes: ScientificEvidenceP5ClosurePacketReasonCode[];
  eligibility_record_hash: string;
}

export interface ScientificEvidenceP5ClosurePacketPreparedV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1;
  status: 'eligible';
  continuation_package: ScientificEvidenceP5ClosurePacketPackageV1;
  eligibility: ScientificEvidenceP5ClosurePacketEligibilityV1;
  preparation_effect_census: {
    database_writes: 0;
    external_calls: 0;
    create_job_calls: 0;
    capability_changes: 0;
    provider_credentials_read: 0;
  };
}

export interface ScientificEvidenceP5ClosurePacketAcceptanceV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ACCEPTANCE_SCHEMA_V1;
  status: 'authorized_pending_execute';
  continuation_attempt_id: string;
  package_hash: string;
  authorization: {
    source: 'current_codex_task_user';
    received_at: string;
    text_utf8_sha256: string;
    text_utf8_bytes: number;
    user_authorized: true;
    authorized_effects: ScientificEvidenceP5ClosurePacketEffectsV1;
  };
}

export function buildScientificEvidenceP5ClosurePacketPackageV1(
  content: ScientificEvidenceP5ClosurePacketPackageContentV1 | ScientificEvidenceP5ClosurePacketPackageV1,
): ScientificEvidenceP5ClosurePacketPackageV1 {
  const { package_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5ClosurePacketPackageV1;
  return {
    ...snapshot,
    package_hash: semanticHash('ScientificEvidenceP5ClosurePacketContinuationPackage', snapshot),
  };
}

export function preflightScientificEvidenceP5ClosurePacketPackageV1(
  continuationPackage: ScientificEvidenceP5ClosurePacketPackageV1,
): ScientificEvidenceP5ClosurePacketEligibilityV1 {
  const reasons = new Set<ScientificEvidenceP5ClosurePacketReasonCode>();
  addReasonUnless(reasons, 'P5_CP_PACKAGE_HASH_MISMATCH', () => {
    const { package_hash: _storedHash, ...content } = continuationPackage;
    return continuationPackage.schema_version === SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PACKAGE_SCHEMA_V1
      && continuationPackage.package_hash
        === semanticHash('ScientificEvidenceP5ClosurePacketContinuationPackage', content);
  });
  addReasonUnless(reasons, 'P5_CP_SOURCE_RESULT_ANALYSIS_INVALID', () => {
    const source = continuationPackage.source_result_analysis;
    const artifact = source.final_artifact;
    const admission = source.final_admission;
    const attemptBindingValid = isScientificEvidenceP5ClosurePacketSuccessorSourceV1(source)
      ? isNonEmpty(source.successor_attempt_id) && isHash(source.claim_record_sha256)
      : isNonEmpty(source.recovery_attempt_id);
    return attemptBindingValid
      && isHash(source.package_hash)
      && isHash(source.prepared_record_sha256)
      && isHash(source.acceptance_record_sha256)
      && isHash(source.completion_record_sha256)
      && [artifact.id, admission.id].every(isNonEmpty)
      && [
        artifact.artifact_identity_hash,
        artifact.runtime_identity_hash,
        artifact.final_artifact_hash,
        admission.admission_identity_hash,
        admission.runtime_artifact_hash,
        admission.admitted_artifact_hash,
      ].every(isBareHash)
      && admission.status === 'admitted'
      && admission.runtime_artifact_hash === artifact.artifact_identity_hash
      && admission.admitted_artifact_hash === artifact.final_artifact_hash;
  });
  addReasonUnless(reasons, 'P5_CP_AUTHORITY_INVALID', () => {
    const authority = continuationPackage.authority;
    const successorSource = isScientificEvidenceP5ClosurePacketSuccessorSourceV1(
      continuationPackage.source_result_analysis,
    );
    const packetTraceValid = successorSource
      ? authority.packet_trace?.target_ref_type === 'result_interpretation_packet'
        && isNonEmpty(authority.packet_trace.id)
        && authority.packet_trace.target_ref_id === authority.result_interpretation_packet_id
        && authority.packet_trace.target_version_id === null
        && authority.packet_trace.expected_status === 'complete'
      : authority.packet_trace === undefined;
    return isHash(authority.target_fingerprint)
      && [
        authority.implementation_project_id,
        authority.title_card_id,
        authority.validation_cycle_id,
        authority.run_id,
        authority.result_interpretation_packet_id,
      ].every(isNonEmpty)
      && Number.isSafeInteger(authority.expected_cycle_version)
      && authority.expected_cycle_version >= 0
      && isHash(authority.closure_watermark_hash)
      && isHash(authority.run_manifest_hash)
      && packetTraceValid
      && canonicalEqual(authority.current_effects, exactCurrentEffects(successorSource));
  });
  addReasonUnless(reasons, 'P5_CP_CLOSURE_REQUEST_INVALID', () => {
    const request = continuationPackage.closure_request;
    return request.closure_kind === 'scientific_evidence_assessed'
      && request.accepted_proposal_id
        === continuationPackage.source_result_analysis.final_artifact.id
      && request.expected_proposal_hash
        === continuationPackage.source_result_analysis.final_artifact.final_artifact_hash
      && isNonEmpty(request.idempotency_key);
  });
  addReasonUnless(reasons, 'P5_CP_EFFECT_BOUNDARY_INVALID', () => (
    canonicalEqual(continuationPackage.authorized_effects, exactAuthorizedEffects())
  ));
  addReasonUnless(reasons, 'P5_CP_RECOVERY_POINT_INVALID', () => {
    const point = continuationPackage.recovery_point;
    return isNonEmpty(point.manifest_ref)
      && isIsoTimestamp(point.created_at)
      && point.target_fingerprint === continuationPackage.authority.target_fingerprint
      && [
        point.recovery_fingerprint,
        point.schema_dump_sha256,
        point.authority_data_dump_sha256,
      ].every(isHash)
      && point.authority_table_count === 114;
  });
  addReasonUnless(reasons, 'P5_CP_SOURCE_BINDING_INVALID', () => (
    continuationPackage.executor.mode === 'closure_packet_only'
    && isNonEmpty(continuationPackage.executor.path)
    && isHash(continuationPackage.executor.sha256)
    && [4, 5].includes(continuationPackage.source_binding.source_files.length)
    && continuationPackage.source_binding.source_files.every((source) => (
      isNonEmpty(source.path) && isHash(source.sha256)
    ))
  ));
  addReasonUnless(reasons, 'P5_CP_WINDOW_INVALID', () => {
    const window = continuationPackage.operational_window;
    const preparedAt = Date.parse(window.prepared_at);
    const authorizationNotAfter = Date.parse(window.authorization_not_after);
    const executeNotAfter = Date.parse(window.execute_not_after);
    return [window.prepared_at, window.authorization_not_after, window.execute_not_after]
      .every(isIsoTimestamp)
      && preparedAt < authorizationNotAfter
      && authorizationNotAfter < executeNotAfter;
  });
  addReasonUnless(reasons, 'P5_CP_FORBIDDEN_FIELD_PRESENT', () => (
    !containsForbiddenField(continuationPackage)
  ));

  const reasonCodes = SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_REASON_CODES.filter(
    (reason) => reasons.has(reason),
  );
  const content = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ELIGIBILITY_SCHEMA_V1,
    package_hash: continuationPackage.package_hash,
    status: reasonCodes.length === 0 ? 'eligible' as const : 'ineligible' as const,
    reason_codes: reasonCodes,
  };
  return {
    ...content,
    eligibility_record_hash: semanticHash(
      'ScientificEvidenceP5ClosurePacketContinuationEligibility',
      content,
    ),
  };
}

export function assertScientificEvidenceP5ClosurePacketPreparedV1(
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1,
): void {
  const continuationPackage = buildScientificEvidenceP5ClosurePacketPackageV1(
    prepared.continuation_package,
  );
  const eligibility = preflightScientificEvidenceP5ClosurePacketPackageV1(continuationPackage);
  if (
    !hasExactKeys(prepared, [
      'schema_version',
      'status',
      'continuation_package',
      'eligibility',
      'preparation_effect_census',
    ])
    || prepared.schema_version !== SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_PREPARED_SCHEMA_V1
    || prepared.status !== 'eligible'
    || continuationPackage.package_hash !== prepared.continuation_package.package_hash
    || eligibility.status !== 'eligible'
    || eligibility.reason_codes.length !== 0
    || !canonicalEqual(eligibility, prepared.eligibility)
    || !canonicalEqual(prepared.preparation_effect_census, exactPreparationEffects())
  ) throw new Error('T136_P5_CLOSURE_PACKET_PREPARED_INVALID');
}

export function assertScientificEvidenceP5ClosurePacketAcceptanceV1(input: {
  prepared: ScientificEvidenceP5ClosurePacketPreparedV1;
  acceptance: ScientificEvidenceP5ClosurePacketAcceptanceV1;
}): void {
  assertScientificEvidenceP5ClosurePacketPreparedV1(input.prepared);
  const continuationPackage = input.prepared.continuation_package;
  const acceptance = input.acceptance;
  if (
    !hasExactKeys(acceptance, [
      'schema_version',
      'status',
      'continuation_attempt_id',
      'package_hash',
      'authorization',
    ])
    || !hasExactKeys(acceptance.authorization, [
      'source',
      'received_at',
      'text_utf8_sha256',
      'text_utf8_bytes',
      'user_authorized',
      'authorized_effects',
    ])
    || acceptance.schema_version !== SCIENTIFIC_EVIDENCE_P5_CLOSURE_PACKET_ACCEPTANCE_SCHEMA_V1
    || acceptance.status !== 'authorized_pending_execute'
    || acceptance.continuation_attempt_id !== continuationPackage.continuation_attempt_id
    || acceptance.package_hash !== continuationPackage.package_hash
    || acceptance.authorization.source !== 'current_codex_task_user'
    || !isIsoTimestamp(acceptance.authorization.received_at)
    || !isHash(acceptance.authorization.text_utf8_sha256)
    || !Number.isSafeInteger(acceptance.authorization.text_utf8_bytes)
    || acceptance.authorization.text_utf8_bytes <= 0
    || acceptance.authorization.user_authorized !== true
    || Date.parse(acceptance.authorization.received_at)
      < Date.parse(continuationPackage.operational_window.prepared_at)
    || Date.parse(acceptance.authorization.received_at)
      > Date.parse(continuationPackage.operational_window.authorization_not_after)
    || !canonicalEqual(acceptance.authorization.authorized_effects, continuationPackage.authorized_effects)
  ) throw new Error('T136_P5_CLOSURE_PACKET_ACCEPTANCE_INVALID');
}

export function assertScientificEvidenceP5ClosurePacketWindow(
  continuationPackage: ScientificEvidenceP5ClosurePacketPackageV1,
  nowMs = Date.now(),
): void {
  if (
    nowMs < Date.parse(continuationPackage.operational_window.prepared_at)
    || nowMs > Date.parse(continuationPackage.operational_window.execute_not_after)
  ) throw new Error('T136_P5_CLOSURE_PACKET_WINDOW_CLOSED');
}

export function exactScientificEvidenceP5ClosurePacketEffectsV1():
ScientificEvidenceP5ClosurePacketEffectsV1 {
  return exactAuthorizedEffects();
}

export function isScientificEvidenceP5ClosurePacketSuccessorSourceV1(
  source: ScientificEvidenceP5ClosurePacketResultAnalysisSourceV1,
): source is ScientificEvidenceP5ClosurePacketSuccessorSourceV1 {
  return 'source_stage' in source
    && source.source_stage === 'packet_trace_result_analysis_successor';
}

function exactAuthorizedEffects(): ScientificEvidenceP5ClosurePacketEffectsV1 {
  return {
    operation: 'closure_packet_continuation',
    external_provider_call_count: 0,
    create_job_call_count: 0,
    alibaba_cloud_call_count: 0,
    runtime_artifact_write_count: 0,
    runtime_admission_write_count: 0,
    validation_cycle_update_count_max: 1,
    closure_write_count_max: 1,
    integration_outbox_write_count_max: 1,
    projection_inbox_write_count_max: 1,
    packet_write_count_max: 1,
    outbox_delivery_count_max: 1,
    claim_write_count: 0,
    dossier_write_count: 0,
    persistent_capability_change_count: 0,
  };
}

function exactCurrentEffects(successorSource: boolean) {
  if (successorSource) {
    return {
      packet_trace_manifests: 1,
      packet_trace_repair_queue_items: 0,
      runtime_artifacts: 4,
      runtime_admissions: 4,
      closures: 0,
      packets: 0,
      validation_cycle_closed_outboxes: 0,
      validation_cycle_closed_inboxes: 0,
      undelivered_integration_outboxes: 0,
    } as const;
  }
  return {
    runtime_artifacts: 2,
    runtime_admissions: 2,
    closures: 0,
    packets: 0,
    validation_cycle_closed_outboxes: 0,
    validation_cycle_closed_inboxes: 0,
    undelivered_integration_outboxes: 0,
  } as const;
}

function exactPreparationEffects() {
  return {
    database_writes: 0,
    external_calls: 0,
    create_job_calls: 0,
    capability_changes: 0,
    provider_credentials_read: 0,
  } as const;
}

function addReasonUnless(
  reasons: Set<ScientificEvidenceP5ClosurePacketReasonCode>,
  reason: ScientificEvidenceP5ClosurePacketReasonCode,
  predicate: () => boolean,
): void {
  try {
    if (!predicate()) reasons.add(reason);
  } catch {
    reasons.add(reason);
  }
}

function semanticHash(recordKind: string, content: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalizeExperimentV2Json({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }), 'utf8').digest('hex')}`;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  try {
    return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
  } catch {
    return false;
  }
}

function hasExactKeys(value: unknown, expected: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function containsForbiddenField(value: unknown): boolean {
  const forbiddenKeys = new Set([
    'accesskeyid',
    'accesskeysecret',
    'apikey',
    'authorizationheader',
    'credential',
    'password',
    'privatekey',
    'providerresponse',
    'securitytoken',
    'sessiontoken',
  ]);
  if (Array.isArray(value)) return value.some(containsForbiddenField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => (
    forbiddenKeys.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''))
    || containsForbiddenField(child)
  ));
}

function isHash(value: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}

function isBareHash(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
