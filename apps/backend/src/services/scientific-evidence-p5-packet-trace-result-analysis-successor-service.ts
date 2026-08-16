import { createHash } from 'node:crypto';

import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  TraceLineageBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

export const SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1 =
  'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorPackage@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ELIGIBILITY_SCHEMA_V1 =
  'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorEligibility@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1 =
  'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorPrepared@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_SCHEMA_V1 =
  'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorAcceptance@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_REASON_CODES = [
  'P5_PTRAS_PACKAGE_HASH_MISMATCH',
  'P5_PTRAS_SOURCE_RESULT_ANALYSIS_INVALID',
  'P5_PTRAS_SOURCE_CONTINUATION_INVALID',
  'P5_PTRAS_AUTHORITY_INVALID',
  'P5_PTRAS_RUNTIME_BOUNDARY_INVALID',
  'P5_PTRAS_EFFECT_BOUNDARY_INVALID',
  'P5_PTRAS_SOURCE_BINDING_INVALID',
  'P5_PTRAS_RECOVERY_POINT_INVALID',
  'P5_PTRAS_WINDOW_INVALID',
  'P5_PTRAS_FORBIDDEN_FIELD_PRESENT',
] as const;

export type ScientificEvidenceP5PacketTraceSuccessorReasonCode =
  (typeof SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_REASON_CODES)[number];

interface FinalArtifactBinding {
  id: string;
  artifact_identity_hash: string;
  runtime_identity_hash: string;
  final_artifact_hash: string;
}

interface FinalAdmissionBinding {
  id: string;
  admission_identity_hash: string;
  runtime_artifact_hash: string;
  admitted_artifact_hash: string;
  status: 'admitted';
}

export interface ScientificEvidenceP5PacketTraceSuccessorEffectsV1 {
  operation: 'packet_trace_result_analysis_successor';
  external_provider: 'openai';
  provider_call_count_max: 2;
  create_job_call_count: 0;
  alibaba_cloud_call_count: 0;
  trace_manifest_write_count_max: 1;
  trace_repair_queue_write_count: 0;
  runtime_artifact_write_count_max: 2;
  runtime_admission_write_count_max: 2;
  validation_cycle_update_count: 0;
  closure_write_count: 0;
  packet_write_count: 0;
  claim_write_count: 0;
  dossier_write_count: 0;
  persistent_capability_change_count: 0;
}

export interface ScientificEvidenceP5PacketTraceSuccessorPackageContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1;
  successor_attempt_id: string;
  source_result_analysis: {
    recovery_attempt_id: string;
    package_hash: string;
    prepared_record_sha256: string;
    acceptance_record_sha256: string;
    claim_record_sha256: string;
    completion_record_sha256: string;
    final_artifact: FinalArtifactBinding;
    final_admission: FinalAdmissionBinding;
  };
  source_continuation: {
    continuation_attempt_id: string;
    package_hash: string;
    prepared_record_sha256: string;
    acceptance_record_sha256: string;
    claim_record_sha256: string;
    terminal_record_sha256: string;
    terminal_reason_code: 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED';
  };
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
    source_cycle_trace: {
      id: string;
      identity_hash: string;
      target_ref_type: 'validation_cycle';
      target_ref_id: string;
      trace_status: 'complete';
    };
    packet_trace: {
      id: string;
      target_ref_type: 'result_interpretation_packet';
      target_ref_id: string;
      target_version_id: null;
      expected_status: 'complete';
    };
    current_effects: {
      packet_trace_manifests: 0;
      runtime_artifacts: 2;
      runtime_admissions: 2;
      closures: 0;
      packets: 0;
      validation_cycle_closed_outboxes: 0;
      validation_cycle_closed_inboxes: 0;
      undelivered_integration_outboxes: 0;
    };
  };
  runtime_request: {
    run_mode: 'product';
    execution_mode: 'provider_llm';
    runtime_run_id: string;
    model_profile_id: string;
    model_option_id: string;
    model_profile_hash: string;
    normalized_params_hash: string;
    provider_id: 'openai';
    model_id: 'gpt-5.6-sol';
    max_provider_call_count: 2;
    target_version_id: string;
    input_snapshot_ref_id: string;
    input_snapshot_hash: string;
    source_hashes: [string, string];
  };
  executor: {
    mode: 'packet_trace_then_result_analysis';
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
  authorized_effects: ScientificEvidenceP5PacketTraceSuccessorEffectsV1;
  operational_window: {
    prepared_at: string;
    authorization_not_after: string;
    execute_not_after: string;
  };
}

export interface ScientificEvidenceP5PacketTraceSuccessorPackageV1
  extends ScientificEvidenceP5PacketTraceSuccessorPackageContentV1 {
  package_hash: string;
}

export interface ScientificEvidenceP5PacketTraceSuccessorEligibilityV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ELIGIBILITY_SCHEMA_V1;
  package_hash: string;
  status: 'eligible' | 'ineligible';
  reason_codes: ScientificEvidenceP5PacketTraceSuccessorReasonCode[];
  eligibility_record_hash: string;
}

export interface ScientificEvidenceP5PacketTraceSuccessorPreparedV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1;
  status: 'eligible';
  successor_package: ScientificEvidenceP5PacketTraceSuccessorPackageV1;
  eligibility: ScientificEvidenceP5PacketTraceSuccessorEligibilityV1;
  preparation_effect_census: {
    database_writes: 0;
    external_calls: 0;
    create_job_calls: 0;
    capability_changes: 0;
    provider_credentials_read: 0;
  };
}

export interface ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_SCHEMA_V1;
  status: 'authorized_pending_execute';
  successor_attempt_id: string;
  package_hash: string;
  authorization: {
    source: 'current_codex_task_user';
    received_at: string;
    text_utf8_sha256: string;
    text_utf8_bytes: number;
    user_authorized: true;
    authorized_effects: ScientificEvidenceP5PacketTraceSuccessorEffectsV1;
  };
}

export function buildScientificEvidenceP5PacketTraceLineageV1(input: {
  source_lineage: TraceLineageBundle;
  authoritative_run_evidence_refs: TopicSelectionFunctionalRef[];
  title_card_id: string;
}): TraceLineageBundle {
  const refs = input.authoritative_run_evidence_refs;
  if (
    refs.length !== 1
    || refs.some((ref) => (
      ref.ref_type !== 'run_evidence_unit'
      || !isNonEmpty(ref.ref_id)
      || ref.title_card_id !== input.title_card_id
      || typeof ref.version_id !== 'string'
      || !isHash(ref.version_id)
    ))
  ) {
    throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_EXPERIMENT_LINEAGE_INVALID');
  }
  return {
    ...structuredClone(input.source_lineage),
    experiment: {
      ...structuredClone(input.source_lineage.experiment),
      run_evidence_refs: refs.map((ref) => ({
        ref_type: 'run_evidence_unit',
        ref_id: ref.ref_id,
        title_card_id: ref.title_card_id,
        version_id: ref.version_id,
      })),
    },
  };
}

export function buildScientificEvidenceP5PacketTraceSuccessorPackageV1(
  content:
    | ScientificEvidenceP5PacketTraceSuccessorPackageContentV1
    | ScientificEvidenceP5PacketTraceSuccessorPackageV1,
): ScientificEvidenceP5PacketTraceSuccessorPackageV1 {
  const { package_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5PacketTraceSuccessorPackageV1;
  return {
    ...snapshot,
    package_hash: semanticHash('ScientificEvidenceP5PacketTraceResultAnalysisSuccessorPackage', snapshot),
  };
}

export function preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(
  successorPackage: ScientificEvidenceP5PacketTraceSuccessorPackageV1,
): ScientificEvidenceP5PacketTraceSuccessorEligibilityV1 {
  const reasons = new Set<ScientificEvidenceP5PacketTraceSuccessorReasonCode>();
  addReasonUnless(reasons, 'P5_PTRAS_PACKAGE_HASH_MISMATCH', () => {
    const { package_hash: _storedHash, ...content } = successorPackage;
    return successorPackage.schema_version
      === SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PACKAGE_SCHEMA_V1
      && successorPackage.package_hash === semanticHash(
        'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorPackage',
        content,
      );
  });
  addReasonUnless(reasons, 'P5_PTRAS_SOURCE_RESULT_ANALYSIS_INVALID', () => {
    const source = successorPackage.source_result_analysis;
    const artifact = source.final_artifact;
    const admission = source.final_admission;
    return isNonEmpty(source.recovery_attempt_id)
      && [
        source.package_hash,
        source.prepared_record_sha256,
        source.acceptance_record_sha256,
        source.claim_record_sha256,
        source.completion_record_sha256,
      ].every(isHash)
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
  addReasonUnless(reasons, 'P5_PTRAS_SOURCE_CONTINUATION_INVALID', () => {
    const source = successorPackage.source_continuation;
    return isNonEmpty(source.continuation_attempt_id)
      && [
        source.package_hash,
        source.prepared_record_sha256,
        source.acceptance_record_sha256,
        source.claim_record_sha256,
        source.terminal_record_sha256,
      ].every(isHash)
      && source.terminal_reason_code === 'T136_P5_CLOSURE_PACKET_CONTINUATION_FAILED';
  });
  addReasonUnless(reasons, 'P5_PTRAS_AUTHORITY_INVALID', () => {
    const authority = successorPackage.authority;
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
      && [authority.closure_watermark_hash, authority.run_manifest_hash].every(isHash)
      && isNonEmpty(authority.source_cycle_trace.id)
      && isHash(authority.source_cycle_trace.identity_hash)
      && authority.source_cycle_trace.target_ref_type === 'validation_cycle'
      && authority.source_cycle_trace.target_ref_id === authority.validation_cycle_id
      && authority.source_cycle_trace.trace_status === 'complete'
      && isNonEmpty(authority.packet_trace.id)
      && authority.packet_trace.target_ref_type === 'result_interpretation_packet'
      && authority.packet_trace.target_ref_id === authority.result_interpretation_packet_id
      && authority.packet_trace.target_version_id === null
      && authority.packet_trace.expected_status === 'complete'
      && canonicalEqual(authority.current_effects, exactCurrentEffects());
  });
  addReasonUnless(reasons, 'P5_PTRAS_RUNTIME_BOUNDARY_INVALID', () => {
    const request = successorPackage.runtime_request;
    return [
      request.runtime_run_id,
      request.model_profile_id,
      request.model_option_id,
      request.input_snapshot_ref_id,
    ].every(isNonEmpty)
      && request.run_mode === 'product'
      && request.execution_mode === 'provider_llm'
      && [
        request.model_profile_hash,
        request.normalized_params_hash,
        request.target_version_id,
        request.input_snapshot_hash,
        ...request.source_hashes,
      ].every(isHash)
      && request.provider_id === 'openai'
      && request.model_id === 'gpt-5.6-sol'
      && request.max_provider_call_count === 2
      && request.target_version_id === successorPackage.authority.run_manifest_hash
      && request.source_hashes.length === 2
      && successorPackage.executor.mode === 'packet_trace_then_result_analysis'
      && isNonEmpty(successorPackage.executor.path)
      && isHash(successorPackage.executor.sha256);
  });
  addReasonUnless(reasons, 'P5_PTRAS_EFFECT_BOUNDARY_INVALID', () => (
    canonicalEqual(successorPackage.authorized_effects, exactAuthorizedEffects())
  ));
  addReasonUnless(reasons, 'P5_PTRAS_SOURCE_BINDING_INVALID', () => (
    [5, 6].includes(successorPackage.source_binding.source_files.length)
    && successorPackage.source_binding.source_files.every((source) => (
      isNonEmpty(source.path) && isHash(source.sha256)
    ))
  ));
  addReasonUnless(reasons, 'P5_PTRAS_RECOVERY_POINT_INVALID', () => {
    const point = successorPackage.recovery_point;
    return isNonEmpty(point.manifest_ref)
      && isIsoTimestamp(point.created_at)
      && point.target_fingerprint === successorPackage.authority.target_fingerprint
      && [
        point.recovery_fingerprint,
        point.schema_dump_sha256,
        point.authority_data_dump_sha256,
      ].every(isHash)
      && point.authority_table_count === 114;
  });
  addReasonUnless(reasons, 'P5_PTRAS_WINDOW_INVALID', () => {
    const window = successorPackage.operational_window;
    const preparedAt = Date.parse(window.prepared_at);
    const authorizationNotAfter = Date.parse(window.authorization_not_after);
    const executeNotAfter = Date.parse(window.execute_not_after);
    return [window.prepared_at, window.authorization_not_after, window.execute_not_after]
      .every(isIsoTimestamp)
      && preparedAt < authorizationNotAfter
      && authorizationNotAfter < executeNotAfter;
  });
  addReasonUnless(reasons, 'P5_PTRAS_FORBIDDEN_FIELD_PRESENT', () => (
    !containsForbiddenField(successorPackage)
  ));

  const reasonCodes = SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_REASON_CODES.filter(
    (reason) => reasons.has(reason),
  );
  const content = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ELIGIBILITY_SCHEMA_V1,
    package_hash: successorPackage.package_hash,
    status: reasonCodes.length === 0 ? 'eligible' as const : 'ineligible' as const,
    reason_codes: reasonCodes,
  };
  return {
    ...content,
    eligibility_record_hash: semanticHash(
      'ScientificEvidenceP5PacketTraceResultAnalysisSuccessorEligibility',
      content,
    ),
  };
}

export function assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1,
): void {
  const successorPackage = buildScientificEvidenceP5PacketTraceSuccessorPackageV1(
    prepared.successor_package,
  );
  const eligibility = preflightScientificEvidenceP5PacketTraceSuccessorPackageV1(successorPackage);
  if (
    !hasExactKeys(prepared, [
      'schema_version',
      'status',
      'successor_package',
      'eligibility',
      'preparation_effect_census',
    ])
    || prepared.schema_version !== SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_PREPARED_SCHEMA_V1
    || prepared.status !== 'eligible'
    || successorPackage.package_hash !== prepared.successor_package.package_hash
    || eligibility.status !== 'eligible'
    || eligibility.reason_codes.length !== 0
    || !canonicalEqual(eligibility, prepared.eligibility)
    || !canonicalEqual(prepared.preparation_effect_census, exactPreparationEffects())
  ) throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_PREPARED_INVALID');
}

export function assertScientificEvidenceP5PacketTraceSuccessorAcceptanceV1(input: {
  prepared: ScientificEvidenceP5PacketTraceSuccessorPreparedV1;
  acceptance: ScientificEvidenceP5PacketTraceSuccessorAcceptanceV1;
}): void {
  assertScientificEvidenceP5PacketTraceSuccessorPreparedV1(input.prepared);
  const successorPackage = input.prepared.successor_package;
  const acceptance = input.acceptance;
  if (
    !hasExactKeys(acceptance, [
      'schema_version',
      'status',
      'successor_attempt_id',
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
    || acceptance.schema_version !== SCIENTIFIC_EVIDENCE_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_SCHEMA_V1
    || acceptance.status !== 'authorized_pending_execute'
    || acceptance.successor_attempt_id !== successorPackage.successor_attempt_id
    || acceptance.package_hash !== successorPackage.package_hash
    || acceptance.authorization.source !== 'current_codex_task_user'
    || !isIsoTimestamp(acceptance.authorization.received_at)
    || !isHash(acceptance.authorization.text_utf8_sha256)
    || !Number.isSafeInteger(acceptance.authorization.text_utf8_bytes)
    || acceptance.authorization.text_utf8_bytes <= 0
    || acceptance.authorization.user_authorized !== true
    || Date.parse(acceptance.authorization.received_at)
      < Date.parse(successorPackage.operational_window.prepared_at)
    || Date.parse(acceptance.authorization.received_at)
      > Date.parse(successorPackage.operational_window.authorization_not_after)
    || !canonicalEqual(
      acceptance.authorization.authorized_effects,
      successorPackage.authorized_effects,
    )
  ) throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_ACCEPTANCE_INVALID');
}

export function assertScientificEvidenceP5PacketTraceSuccessorWindow(
  successorPackage: ScientificEvidenceP5PacketTraceSuccessorPackageV1,
  nowMs = Date.now(),
): void {
  if (
    nowMs < Date.parse(successorPackage.operational_window.prepared_at)
    || nowMs > Date.parse(successorPackage.operational_window.execute_not_after)
  ) throw new Error('T136_P5_PACKET_TRACE_SUCCESSOR_WINDOW_CLOSED');
}

export function exactScientificEvidenceP5PacketTraceSuccessorEffectsV1():
ScientificEvidenceP5PacketTraceSuccessorEffectsV1 {
  return exactAuthorizedEffects();
}

function exactAuthorizedEffects(): ScientificEvidenceP5PacketTraceSuccessorEffectsV1 {
  return {
    operation: 'packet_trace_result_analysis_successor',
    external_provider: 'openai',
    provider_call_count_max: 2,
    create_job_call_count: 0,
    alibaba_cloud_call_count: 0,
    trace_manifest_write_count_max: 1,
    trace_repair_queue_write_count: 0,
    runtime_artifact_write_count_max: 2,
    runtime_admission_write_count_max: 2,
    validation_cycle_update_count: 0,
    closure_write_count: 0,
    packet_write_count: 0,
    claim_write_count: 0,
    dossier_write_count: 0,
    persistent_capability_change_count: 0,
  };
}

function exactCurrentEffects() {
  return {
    packet_trace_manifests: 0,
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
  reasons: Set<ScientificEvidenceP5PacketTraceSuccessorReasonCode>,
  reason: ScientificEvidenceP5PacketTraceSuccessorReasonCode,
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
