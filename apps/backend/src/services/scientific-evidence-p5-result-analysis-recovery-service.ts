import { createHash } from 'node:crypto';

import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

export const SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1 =
  'ScientificEvidenceP5ResultAnalysisRecoveryPackage@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ELIGIBILITY_SCHEMA_V1 =
  'ScientificEvidenceP5ResultAnalysisRecoveryEligibility@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1 =
  'ScientificEvidenceP5ResultAnalysisRecoveryPrepared@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_SCHEMA_V1 =
  'ScientificEvidenceP5ResultAnalysisRecoveryAcceptance@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_REASON_CODES = [
  'P5_RA_RECOVERY_PACKAGE_HASH_MISMATCH',
  'P5_RA_RECOVERY_SOURCE_TERMINAL_INVALID',
  'P5_RA_RECOVERY_AUTHORITY_INVALID',
  'P5_RA_RECOVERY_RUNTIME_BOUNDARY_INVALID',
  'P5_RA_RECOVERY_EFFECT_BOUNDARY_INVALID',
  'P5_RA_RECOVERY_POINT_INVALID',
  'P5_RA_RECOVERY_INSTRUMENTATION_INVALID',
  'P5_RA_RECOVERY_WINDOW_INVALID',
  'P5_RA_RECOVERY_FORBIDDEN_FIELD_PRESENT',
] as const;

export type ScientificEvidenceP5ResultAnalysisRecoveryReasonCode =
  (typeof SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_REASON_CODES)[number];

interface ExactRef {
  id: string;
  content_hash: string;
}

export interface ScientificEvidenceP5ResultAnalysisRecoveryEffectsV1 {
  operation: 'result_analysis_diagnostic_recovery';
  external_provider: 'openai';
  provider_call_count_max: 2;
  create_job_call_count: 0;
  alibaba_cloud_call_count: 0;
  runtime_artifact_write_count_max: 2;
  runtime_admission_write_count_max: 2;
  closure_write_count: 0;
  packet_write_count: 0;
  persistent_capability_change_count: 0;
}

export interface ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1;
  recovery_attempt_id: string;
  source_execution: {
    p5_attempt_id: string;
    package_hash: string;
    terminal_record_sha256: string;
    terminal_failed_stage: 'close';
    terminal_reason_code: 'T136_P5_CLOSE_FAILED';
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
    scientific_results: [
      ExactRef & { ordinal: 1; run_cell_id: string; cell_key: string },
      ExactRef & { ordinal: 2; run_cell_id: string; cell_key: string },
    ];
    validation_report: ExactRef & { status: 'passed' };
    run_evidence_unit: ExactRef;
    trace_manifest: ExactRef;
    current_effects: {
      runtime_artifacts: 0;
      runtime_admissions: 0;
      closures: 0;
      packets: 0;
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
    result_interpretation_packet_ref_id: string;
    trace_manifest_ref_id: string;
    source_hashes: [string, string];
  };
  executor: {
    mode: 'result_analysis_only';
    path: string;
    sha256: string;
  };
  instrumentation: {
    debug_run_id: string;
    environment_key: 'T136_P5_DEBUG_RUN_ID';
    required_environment_value: string;
    log_marker: string;
    source_files: [
      { path: string; sha256: string },
      { path: string; sha256: string },
    ];
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
  authorized_effects: ScientificEvidenceP5ResultAnalysisRecoveryEffectsV1;
  operational_window: {
    prepared_at: string;
    authorization_not_after: string;
    execute_not_after: string;
  };
}

export interface ScientificEvidenceP5ResultAnalysisRecoveryPackageV1
  extends ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1 {
  package_hash: string;
}

export interface ScientificEvidenceP5ResultAnalysisRecoveryEligibilityV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ELIGIBILITY_SCHEMA_V1;
  package_hash: string;
  status: 'eligible' | 'ineligible';
  reason_codes: ScientificEvidenceP5ResultAnalysisRecoveryReasonCode[];
  eligibility_record_hash: string;
}

export interface ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1;
  status: 'eligible';
  recovery_package: ScientificEvidenceP5ResultAnalysisRecoveryPackageV1;
  eligibility: ScientificEvidenceP5ResultAnalysisRecoveryEligibilityV1;
  preparation_effect_census: {
    database_writes: 0;
    external_calls: 0;
    create_job_calls: 0;
    capability_changes: 0;
    provider_credentials_read: 0;
  };
}

export interface ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_SCHEMA_V1;
  status: 'authorized_pending_execute';
  recovery_attempt_id: string;
  package_hash: string;
  authorization: {
    source: 'current_codex_task_user';
    received_at: string;
    text_utf8_sha256: string;
    text_utf8_bytes: number;
    user_authorized: true;
    authorized_effects: ScientificEvidenceP5ResultAnalysisRecoveryEffectsV1;
  };
}

export function buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1(
  content:
    | ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1
    | ScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
): ScientificEvidenceP5ResultAnalysisRecoveryPackageV1 {
  const { package_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5ResultAnalysisRecoveryPackageV1;
  return {
    ...snapshot,
    package_hash: semanticHash('ScientificEvidenceP5ResultAnalysisRecoveryPackage', snapshot),
  };
}

export function preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1(
  recoveryPackage: ScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
): ScientificEvidenceP5ResultAnalysisRecoveryEligibilityV1 {
  const reasons = new Set<ScientificEvidenceP5ResultAnalysisRecoveryReasonCode>();
  addReasonUnless(reasons, 'P5_RA_RECOVERY_PACKAGE_HASH_MISMATCH', () => {
    const { package_hash: _storedHash, ...content } = recoveryPackage;
    return recoveryPackage.schema_version
      === SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1
      && recoveryPackage.package_hash
        === semanticHash('ScientificEvidenceP5ResultAnalysisRecoveryPackage', content);
  });
  addReasonUnless(reasons, 'P5_RA_RECOVERY_SOURCE_TERMINAL_INVALID', () => (
    isNonEmpty(recoveryPackage.recovery_attempt_id)
    && isNonEmpty(recoveryPackage.source_execution.p5_attempt_id)
    && isHash(recoveryPackage.source_execution.package_hash)
    && isHash(recoveryPackage.source_execution.terminal_record_sha256)
    && recoveryPackage.source_execution.terminal_failed_stage === 'close'
    && recoveryPackage.source_execution.terminal_reason_code === 'T136_P5_CLOSE_FAILED'
  ));
  addReasonUnless(reasons, 'P5_RA_RECOVERY_AUTHORITY_INVALID', () => (
    isHash(recoveryPackage.authority.target_fingerprint)
    && [
      recoveryPackage.authority.implementation_project_id,
      recoveryPackage.authority.title_card_id,
      recoveryPackage.authority.validation_cycle_id,
      recoveryPackage.authority.run_id,
    ].every(isNonEmpty)
    && Number.isSafeInteger(recoveryPackage.authority.expected_cycle_version)
    && recoveryPackage.authority.expected_cycle_version >= 0
    && isHash(recoveryPackage.authority.closure_watermark_hash)
    && isHash(recoveryPackage.authority.run_manifest_hash)
    && validScientificResults(recoveryPackage.authority.scientific_results)
    && validExactRef(recoveryPackage.authority.validation_report)
    && recoveryPackage.authority.validation_report.status === 'passed'
    && validExactRef(recoveryPackage.authority.run_evidence_unit)
    && validExactRef(recoveryPackage.authority.trace_manifest)
    && canonicalEqual(recoveryPackage.authority.current_effects, {
      runtime_artifacts: 0,
      runtime_admissions: 0,
      closures: 0,
      packets: 0,
    })
  ));
  addReasonUnless(reasons, 'P5_RA_RECOVERY_RUNTIME_BOUNDARY_INVALID', () => {
    const request = recoveryPackage.runtime_request;
    return [
      request.runtime_run_id,
      request.model_profile_id,
      request.model_option_id,
      request.input_snapshot_ref_id,
      request.result_interpretation_packet_ref_id,
      request.trace_manifest_ref_id,
    ].every(isNonEmpty)
      && request.run_mode === 'product'
      && request.execution_mode === 'provider_llm'
      && isHash(request.model_profile_hash)
      && isHash(request.normalized_params_hash)
      && request.provider_id === 'openai'
      && request.model_id === 'gpt-5.6-sol'
      && request.max_provider_call_count === 2
      && request.target_version_id === recoveryPackage.authority.run_manifest_hash
      && isHash(request.input_snapshot_hash)
      && request.source_hashes.length === 2
      && request.source_hashes.every(isHash)
      && recoveryPackage.executor.mode === 'result_analysis_only'
      && isNonEmpty(recoveryPackage.executor.path)
      && isHash(recoveryPackage.executor.sha256);
  });
  addReasonUnless(reasons, 'P5_RA_RECOVERY_EFFECT_BOUNDARY_INVALID', () => (
    canonicalEqual(recoveryPackage.authorized_effects, exactAuthorizedEffects())
  ));
  addReasonUnless(reasons, 'P5_RA_RECOVERY_POINT_INVALID', () => {
    const point = recoveryPackage.recovery_point;
    return isNonEmpty(point.manifest_ref)
      && isIsoTimestamp(point.created_at)
      && point.target_fingerprint === recoveryPackage.authority.target_fingerprint
      && isHash(point.recovery_fingerprint)
      && isHash(point.schema_dump_sha256)
      && isHash(point.authority_data_dump_sha256)
      && point.authority_table_count === 114;
  });
  addReasonUnless(reasons, 'P5_RA_RECOVERY_INSTRUMENTATION_INVALID', () => {
    const instrumentation = recoveryPackage.instrumentation;
    return isNonEmpty(instrumentation.debug_run_id)
      && instrumentation.environment_key === 'T136_P5_DEBUG_RUN_ID'
      && instrumentation.required_environment_value === instrumentation.debug_run_id
      && instrumentation.log_marker === `[DBG:${instrumentation.debug_run_id}]`
      && instrumentation.source_files.length === 2
      && instrumentation.source_files.every((source) => (
        isNonEmpty(source.path) && isHash(source.sha256)
      ));
  });
  addReasonUnless(reasons, 'P5_RA_RECOVERY_WINDOW_INVALID', () => {
    const window = recoveryPackage.operational_window;
    const preparedAt = Date.parse(window.prepared_at);
    const authorizationNotAfter = Date.parse(window.authorization_not_after);
    const executeNotAfter = Date.parse(window.execute_not_after);
    return isIsoTimestamp(window.prepared_at)
      && isIsoTimestamp(window.authorization_not_after)
      && isIsoTimestamp(window.execute_not_after)
      && preparedAt < authorizationNotAfter
      && authorizationNotAfter < executeNotAfter;
  });
  addReasonUnless(reasons, 'P5_RA_RECOVERY_FORBIDDEN_FIELD_PRESENT', () => (
    !containsForbiddenField(recoveryPackage)
  ));

  const reasonCodes = SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_REASON_CODES.filter(
    (reason) => reasons.has(reason),
  );
  const content = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ELIGIBILITY_SCHEMA_V1,
    package_hash: recoveryPackage.package_hash,
    status: reasonCodes.length === 0 ? 'eligible' as const : 'ineligible' as const,
    reason_codes: reasonCodes,
  };
  return {
    ...content,
    eligibility_record_hash: semanticHash(
      'ScientificEvidenceP5ResultAnalysisRecoveryEligibility',
      content,
    ),
  };
}

export function assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
): void {
  const recoveryPackage = buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1(
    prepared.recovery_package,
  );
  const eligibility = preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1(
    recoveryPackage,
  );
  if (
    !hasExactKeys(prepared, [
      'schema_version',
      'status',
      'recovery_package',
      'eligibility',
      'preparation_effect_census',
    ])
    || prepared.schema_version
      !== SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1
    || prepared.status !== 'eligible'
    || recoveryPackage.package_hash !== prepared.recovery_package.package_hash
    || eligibility.status !== 'eligible'
    || eligibility.reason_codes.length !== 0
    || !canonicalEqual(eligibility, prepared.eligibility)
    || !canonicalEqual(prepared.preparation_effect_census, {
      database_writes: 0,
      external_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      provider_credentials_read: 0,
    })
  ) throw new Error('T136_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_INVALID');
}

export function assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1(input: {
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1;
  acceptance: ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1;
}): void {
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(input.prepared);
  const { recovery_package: recoveryPackage } = input.prepared;
  const { acceptance } = input;
  if (
    !hasExactKeys(acceptance, [
      'schema_version',
      'status',
      'recovery_attempt_id',
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
    || acceptance.schema_version
      !== SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_SCHEMA_V1
    || acceptance.status !== 'authorized_pending_execute'
    || acceptance.recovery_attempt_id !== recoveryPackage.recovery_attempt_id
    || acceptance.package_hash !== recoveryPackage.package_hash
    || acceptance.authorization.source !== 'current_codex_task_user'
    || !isIsoTimestamp(acceptance.authorization.received_at)
    || !isHash(acceptance.authorization.text_utf8_sha256)
    || !Number.isSafeInteger(acceptance.authorization.text_utf8_bytes)
    || acceptance.authorization.text_utf8_bytes <= 0
    || acceptance.authorization.user_authorized !== true
    || Date.parse(acceptance.authorization.received_at)
      < Date.parse(recoveryPackage.operational_window.prepared_at)
    || Date.parse(acceptance.authorization.received_at)
      > Date.parse(recoveryPackage.operational_window.authorization_not_after)
    || !canonicalEqual(
      acceptance.authorization.authorized_effects,
      recoveryPackage.authorized_effects,
    )
  ) throw new Error('T136_P5_RESULT_ANALYSIS_RECOVERY_ACCEPTANCE_INVALID');
}

export function assertScientificEvidenceP5ResultAnalysisRecoveryWindow(
  recoveryPackage: ScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
  nowMs = Date.now(),
): void {
  if (
    nowMs < Date.parse(recoveryPackage.operational_window.prepared_at)
    || nowMs > Date.parse(recoveryPackage.operational_window.execute_not_after)
  ) throw new Error('T136_P5_RESULT_ANALYSIS_RECOVERY_WINDOW_CLOSED');
}

export function exactScientificEvidenceP5ResultAnalysisRecoveryEffectsV1():
ScientificEvidenceP5ResultAnalysisRecoveryEffectsV1 {
  return exactAuthorizedEffects();
}

function exactAuthorizedEffects(): ScientificEvidenceP5ResultAnalysisRecoveryEffectsV1 {
  return {
    operation: 'result_analysis_diagnostic_recovery',
    external_provider: 'openai',
    provider_call_count_max: 2,
    create_job_call_count: 0,
    alibaba_cloud_call_count: 0,
    runtime_artifact_write_count_max: 2,
    runtime_admission_write_count_max: 2,
    closure_write_count: 0,
    packet_write_count: 0,
    persistent_capability_change_count: 0,
  };
}

function validScientificResults(
  results: ScientificEvidenceP5ResultAnalysisRecoveryPackageV1['authority']['scientific_results'],
): boolean {
  return results.length === 2
    && results.every((result, index) => (
      result.ordinal === index + 1
      && validExactRef(result)
      && isNonEmpty(result.run_cell_id)
      && isNonEmpty(result.cell_key)
    ))
    && results[0].id !== results[1].id
    && results[0].run_cell_id !== results[1].run_cell_id
    && results[0].cell_key !== results[1].cell_key;
}

function validExactRef(value: ExactRef): boolean {
  return isNonEmpty(value.id) && isHash(value.content_hash);
}

function addReasonUnless(
  reasons: Set<ScientificEvidenceP5ResultAnalysisRecoveryReasonCode>,
  reason: ScientificEvidenceP5ResultAnalysisRecoveryReasonCode,
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

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
