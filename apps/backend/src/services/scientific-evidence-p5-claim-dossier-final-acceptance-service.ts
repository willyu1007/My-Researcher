import { createHash } from 'node:crypto';

import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ClaimCandidate,
  CreateClaimCandidateRequest,
  CreateImplementationDossierRequest,
  ImplementationDossier,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  ClaimTracePacket,
  CreateClaimTracePacketRequest,
  CreateTraceManifestRequest,
  EvaluateTraceGateRequest,
  TraceGateResult,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';

import type { PaperImplementationResultClaimDossierService } from './paper-implementation-result-claim-dossier-service.js';
import type { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';

export const SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1 =
  'ScientificEvidenceP5ClaimDossierFinalAcceptancePackage@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1 =
  'ScientificEvidenceP5ClaimDossierFinalAcceptancePrepared@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ELIGIBILITY_SCHEMA_V1 =
  'ScientificEvidenceP5ClaimDossierFinalAcceptanceEligibility@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ACCEPTANCE_SCHEMA_V1 =
  'ScientificEvidenceP5ClaimDossierFinalAcceptanceAuthorization@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1 =
  'ScientificEvidenceP5M0SciAcceptance@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_REASON_CODES = [
  'P5_CDF_PACKAGE_HASH_MISMATCH',
  'P5_CDF_PREDECESSOR_INVALID',
  'P5_CDF_AUTHORITY_INVALID',
  'P5_CDF_PLAN_INVALID',
  'P5_CDF_EFFECT_BOUNDARY_INVALID',
  'P5_CDF_EXECUTOR_INVALID',
  'P5_CDF_SOURCE_BINDING_INVALID',
  'P5_CDF_RECOVERY_POINT_INVALID',
  'P5_CDF_WINDOW_INVALID',
  'P5_CDF_FORBIDDEN_FIELD_PRESENT',
] as const;

export type ScientificEvidenceP5ClaimDossierFinalReasonCode =
  (typeof SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_REASON_CODES)[number];

export interface ScientificEvidenceP5ClaimDossierFinalEffectsV1 {
  operation: 'claim_dossier_final_acceptance';
  external_provider_call_count: 0;
  create_job_call_count: 0;
  alibaba_cloud_call_count: 0;
  runtime_artifact_write_count: 0;
  runtime_admission_write_count: 0;
  validation_cycle_update_count: 0;
  closure_write_count: 0;
  integration_outbox_write_count: 0;
  projection_inbox_write_count: 0;
  packet_write_count: 0;
  trace_manifest_write_count_max: 2;
  trace_repair_queue_write_count: 0;
  claim_trace_packet_write_count_max: 1;
  trace_gate_result_write_count_max: 1;
  claim_write_count_max: 1;
  dossier_write_count_max: 1;
  writing_entry_packet_write_count: 0;
  human_confirmation_write_count: 0;
  m0_sci_acceptance_record_write_count_max: 1;
  persistent_capability_change_count: 0;
}

export interface ScientificEvidenceP5ClaimDossierFinalPlanV1 {
  created_at: string;
  claim_trace_manifest_id: string;
  claim_trace_manifest_request: CreateTraceManifestRequest;
  claim_trace_packet_id: string;
  claim_trace_packet_request: CreateClaimTracePacketRequest;
  claim_request: CreateClaimCandidateRequest;
  dossier_trace_manifest_id: string;
  dossier_trace_manifest_request: CreateTraceManifestRequest;
  dossier_gate_result_id: string;
  dossier_gate_request: EvaluateTraceGateRequest;
  dossier_request: CreateImplementationDossierRequest;
}

export interface ScientificEvidenceP5ClaimDossierFinalRecordsV1 {
  claim_trace_manifest: TraceManifest;
  claim_trace_packet: ClaimTracePacket;
  claim: ClaimCandidate;
  dossier_trace_manifest: TraceManifest;
  dossier_gate_result: TraceGateResult;
  dossier: ImplementationDossier;
}

export interface ScientificEvidenceP5ClaimDossierFinalRecordHashesV1 {
  claim_trace_manifest_hash: string;
  claim_trace_packet_hash: string;
  claim_hash: string;
  dossier_trace_manifest_hash: string;
  dossier_gate_result_hash: string;
  dossier_hash: string;
}

export interface ScientificEvidenceP5ClaimDossierFinalPackageContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1;
  acceptance_attempt_id: string;
  predecessor: {
    packet_recovery_attempt_id: string;
    package_hash: string;
    prepared_record_sha256: string;
    acceptance_record_sha256: string;
    claim_record_sha256: string;
    completion_record_sha256: string;
    terminal_absent: true;
  };
  authority: {
    target_fingerprint: string;
    implementation_project_id: string;
    title_card_id: string;
    validation_cycle_id: string;
    packet: {
      result_interpretation_packet_id: string;
      packet_content_hash: string;
      trace_manifest_id: string;
      interpretation_gate_status: 'passed';
      allowed_claim_ceiling: 'moderate';
      created_at: string;
    };
    closure: {
      closure_id: string;
      closure_snapshot_hash: string;
      scientific_disposition: 'positive';
      accepted_proposal_id: string;
      accepted_proposal_hash: string;
    };
    run_evidence_unit: {
      run_evidence_unit_id: string;
      content_hash: string;
      run_id: string;
      validation_report_id: string;
      validation_hash: string;
    };
    literature_evidence: {
      evidence_unit_id: string;
      evidence_map_version: string;
      literature_id: string;
      review_status: 'machine_checked';
      freshness_status: 'current';
      authority_hash: string;
    };
    scientific_chain_counts: {
      real_provider_attempts: 2;
      succeeded_real_provider_attempts: 2;
      create_job_commands: 2;
      experiment_results: 2;
      passed_validation_reports: 1;
      evidence_candidates: 1;
      run_evidence_units: 1;
      runtime_artifacts: 4;
      runtime_admissions: 4;
      closures: 1;
      packets: 1;
      undelivered_integration_outboxes: 0;
      claim_trace_manifests: 0;
      dossier_trace_manifests: 0;
      claim_trace_packets: 0;
      dossier_trace_gate_results: 0;
      claims: 0;
      dossiers: 0;
    };
    final_plan: ScientificEvidenceP5ClaimDossierFinalPlanV1;
    expected_record_hashes: ScientificEvidenceP5ClaimDossierFinalRecordHashesV1;
  };
  executor: {
    mode: 'claim_dossier_final_acceptance';
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
  authorized_effects: ScientificEvidenceP5ClaimDossierFinalEffectsV1;
  operational_window: {
    prepared_at: string;
    authorization_not_after: string;
    execute_not_after: string;
  };
}

export interface ScientificEvidenceP5ClaimDossierFinalPackageV1
extends ScientificEvidenceP5ClaimDossierFinalPackageContentV1 {
  package_hash: string;
}

export interface ScientificEvidenceP5ClaimDossierFinalEligibilityV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ELIGIBILITY_SCHEMA_V1;
  package_hash: string;
  status: 'eligible' | 'ineligible';
  reason_codes: ScientificEvidenceP5ClaimDossierFinalReasonCode[];
  eligibility_record_hash: string;
}

export interface ScientificEvidenceP5ClaimDossierFinalPreparedV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1;
  status: 'eligible';
  acceptance_package: ScientificEvidenceP5ClaimDossierFinalPackageV1;
  eligibility: ScientificEvidenceP5ClaimDossierFinalEligibilityV1;
  preparation_effect_census: {
    database_writes: 0;
    external_calls: 0;
    create_job_calls: 0;
    capability_changes: 0;
    provider_credentials_read: 0;
  };
}

export interface ScientificEvidenceP5ClaimDossierFinalAcceptanceV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ACCEPTANCE_SCHEMA_V1;
  status: 'authorized_pending_execute';
  acceptance_attempt_id: string;
  package_hash: string;
  authorization: {
    source: 'current_codex_task_user';
    received_at: string;
    text_utf8_sha256: string;
    text_utf8_bytes: number;
    user_authorized: true;
    authorized_effects: ScientificEvidenceP5ClaimDossierFinalEffectsV1;
  };
}

export interface ScientificEvidenceP5M0SciAcceptanceV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1;
  status: 'passed';
  gate: 'M0-SCI';
  acceptance_attempt_id: string;
  package_hash: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  result_interpretation_packet_id: string;
  packet_content_hash: string;
  claim_candidate_id: string;
  claim_hash: string;
  dossier_id: string;
  dossier_hash: string;
  create_job_call_count: 2;
  replay_new_row_count: 0;
  undelivered_integration_outbox_count: 0;
  persistent_capability_change_count: 0;
  capabilities_resting_state: 'disabled';
  accepted_at: string;
  acceptance_record_hash: string;
}

export type ScientificEvidenceP5ClaimDossierTraceKernel = Pick<
  PaperImplementationTraceKernelService,
  'createTraceManifest' | 'createClaimTracePacket' | 'evaluateTraceGate'
>;

export type ScientificEvidenceP5ClaimDossierWriter = Pick<
  PaperImplementationResultClaimDossierService,
  'createClaimCandidate' | 'createImplementationDossier'
>;

export function exactScientificEvidenceP5ClaimDossierFinalEffectsV1():
ScientificEvidenceP5ClaimDossierFinalEffectsV1 {
  return {
    operation: 'claim_dossier_final_acceptance',
    external_provider_call_count: 0,
    create_job_call_count: 0,
    alibaba_cloud_call_count: 0,
    runtime_artifact_write_count: 0,
    runtime_admission_write_count: 0,
    validation_cycle_update_count: 0,
    closure_write_count: 0,
    integration_outbox_write_count: 0,
    projection_inbox_write_count: 0,
    packet_write_count: 0,
    trace_manifest_write_count_max: 2,
    trace_repair_queue_write_count: 0,
    claim_trace_packet_write_count_max: 1,
    trace_gate_result_write_count_max: 1,
    claim_write_count_max: 1,
    dossier_write_count_max: 1,
    writing_entry_packet_write_count: 0,
    human_confirmation_write_count: 0,
    m0_sci_acceptance_record_write_count_max: 1,
    persistent_capability_change_count: 0,
  };
}

export async function materializeScientificEvidenceP5ClaimDossierFinalPlanV1(input: {
  implementation_project_id: string;
  plan: ScientificEvidenceP5ClaimDossierFinalPlanV1;
  trace_kernel: ScientificEvidenceP5ClaimDossierTraceKernel;
  claim_dossier: ScientificEvidenceP5ClaimDossierWriter;
}): Promise<ScientificEvidenceP5ClaimDossierFinalRecordsV1> {
  const plan = input.plan;
  const claimTraceManifest = await input.trace_kernel.createTraceManifest(
    input.implementation_project_id,
    plan.claim_trace_manifest_request,
  );
  assertId(claimTraceManifest.trace_manifest_id, plan.claim_trace_manifest_id, 'CLAIM_TRACE_MANIFEST');
  const claimTracePacket = await input.trace_kernel.createClaimTracePacket(
    input.implementation_project_id,
    plan.claim_trace_packet_request,
  );
  assertId(claimTracePacket.claim_trace_packet_id, plan.claim_trace_packet_id, 'CLAIM_TRACE_PACKET');
  const claim = await input.claim_dossier.createClaimCandidate(
    input.implementation_project_id,
    plan.claim_request,
  );
  assertId(claim.claim_candidate_id, plan.claim_request.claim_candidate_id, 'CLAIM');
  const dossierTraceManifest = await input.trace_kernel.createTraceManifest(
    input.implementation_project_id,
    plan.dossier_trace_manifest_request,
  );
  assertId(dossierTraceManifest.trace_manifest_id, plan.dossier_trace_manifest_id, 'DOSSIER_TRACE_MANIFEST');
  const dossierGateResult = await input.trace_kernel.evaluateTraceGate(
    input.implementation_project_id,
    plan.dossier_gate_request,
  );
  assertId(dossierGateResult.gate_result_id, plan.dossier_gate_result_id, 'DOSSIER_GATE_RESULT');
  const dossier = await input.claim_dossier.createImplementationDossier(
    input.implementation_project_id,
    plan.dossier_request,
  );
  assertId(dossier.dossier_id, plan.dossier_request.dossier_id, 'DOSSIER');
  return {
    claim_trace_manifest: claimTraceManifest,
    claim_trace_packet: claimTracePacket,
    claim,
    dossier_trace_manifest: dossierTraceManifest,
    dossier_gate_result: dossierGateResult,
    dossier,
  };
}

export function scientificEvidenceP5ClaimDossierFinalRecordHashesV1(
  records: ScientificEvidenceP5ClaimDossierFinalRecordsV1,
): ScientificEvidenceP5ClaimDossierFinalRecordHashesV1 {
  return {
    claim_trace_manifest_hash: recordHash('ClaimTraceManifest', records.claim_trace_manifest),
    claim_trace_packet_hash: recordHash('ClaimTracePacket', records.claim_trace_packet),
    claim_hash: recordHash('ClaimCandidate', records.claim),
    dossier_trace_manifest_hash: recordHash('DossierTraceManifest', records.dossier_trace_manifest),
    dossier_gate_result_hash: recordHash('DossierTraceGateResult', records.dossier_gate_result),
    dossier_hash: records.dossier.dossier_hash,
  };
}

export function buildScientificEvidenceP5ClaimDossierFinalPackageV1(
  content:
    | ScientificEvidenceP5ClaimDossierFinalPackageContentV1
    | ScientificEvidenceP5ClaimDossierFinalPackageV1,
): ScientificEvidenceP5ClaimDossierFinalPackageV1 {
  const { package_hash: _priorHash, ...snapshot } = structuredClone(content) as
    ScientificEvidenceP5ClaimDossierFinalPackageV1;
  return {
    ...snapshot,
    package_hash: semanticHash('ScientificEvidenceP5ClaimDossierFinalAcceptancePackage', snapshot),
  };
}

export function preflightScientificEvidenceP5ClaimDossierFinalPackageV1(
  acceptancePackage: ScientificEvidenceP5ClaimDossierFinalPackageV1,
): ScientificEvidenceP5ClaimDossierFinalEligibilityV1 {
  const reasons = new Set<ScientificEvidenceP5ClaimDossierFinalReasonCode>();
  addUnless(reasons, 'P5_CDF_PACKAGE_HASH_MISMATCH', () => {
    const { package_hash: _stored, ...content } = acceptancePackage;
    return acceptancePackage.schema_version
        === SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1
      && acceptancePackage.package_hash
        === semanticHash('ScientificEvidenceP5ClaimDossierFinalAcceptancePackage', content);
  });
  addUnless(reasons, 'P5_CDF_PREDECESSOR_INVALID', () => {
    const predecessor = acceptancePackage.predecessor;
    return isNonEmpty(predecessor.packet_recovery_attempt_id)
      && [
        predecessor.package_hash,
        predecessor.prepared_record_sha256,
        predecessor.acceptance_record_sha256,
        predecessor.claim_record_sha256,
        predecessor.completion_record_sha256,
      ].every(isHash)
      && predecessor.terminal_absent === true;
  });
  addUnless(reasons, 'P5_CDF_AUTHORITY_INVALID', () => {
    const authority = acceptancePackage.authority;
    const counts = authority.scientific_chain_counts;
    return isHash(authority.target_fingerprint)
      && [
        authority.implementation_project_id,
        authority.title_card_id,
        authority.validation_cycle_id,
        authority.packet.result_interpretation_packet_id,
        authority.packet.trace_manifest_id,
        authority.closure.closure_id,
        authority.closure.accepted_proposal_id,
        authority.run_evidence_unit.run_evidence_unit_id,
        authority.run_evidence_unit.run_id,
        authority.run_evidence_unit.validation_report_id,
        authority.literature_evidence.evidence_unit_id,
        authority.literature_evidence.evidence_map_version,
        authority.literature_evidence.literature_id,
      ].every(isNonEmpty)
      && [
        authority.packet.packet_content_hash,
        authority.closure.closure_snapshot_hash,
        authority.run_evidence_unit.content_hash,
        authority.run_evidence_unit.validation_hash,
        authority.literature_evidence.authority_hash,
      ].every(isHash)
      && isBareHash(authority.closure.accepted_proposal_hash)
      && authority.packet.interpretation_gate_status === 'passed'
      && authority.packet.allowed_claim_ceiling === 'moderate'
      && authority.closure.scientific_disposition === 'positive'
      && authority.literature_evidence.review_status === 'machine_checked'
      && authority.literature_evidence.freshness_status === 'current'
      && isIsoTimestamp(authority.packet.created_at)
      && canonicalEqual(counts, exactPreExecutionCounts());
  });
  addUnless(reasons, 'P5_CDF_PLAN_INVALID', () => {
    const authority = acceptancePackage.authority;
    const plan = authority.final_plan;
    return isIsoTimestamp(plan.created_at)
      && [
        plan.claim_trace_manifest_id,
        plan.claim_trace_packet_id,
        plan.claim_request.claim_candidate_id,
        plan.dossier_trace_manifest_id,
        plan.dossier_gate_result_id,
        plan.dossier_request.dossier_id,
      ].every(isNonEmpty)
      && plan.claim_request.claim_strength === 'moderate'
      && plan.claim_request.claim_trace_packet_id === plan.claim_trace_packet_id
      && plan.claim_request.trace_manifest_id === plan.claim_trace_manifest_id
      && plan.claim_request.result_interpretation_packet_ids.length === 1
      && plan.claim_request.result_interpretation_packet_ids[0]
        === authority.packet.result_interpretation_packet_id
      && plan.dossier_request.dossier_status === 'ready_for_writing'
      && plan.dossier_request.trace_manifest_id === plan.dossier_trace_manifest_id
      && plan.dossier_request.readiness.readiness_gate_result_id === plan.dossier_gate_result_id
      && plan.dossier_request.claim_candidate_ids.length === 1
      && plan.dossier_request.claim_candidate_ids[0] === plan.claim_request.claim_candidate_id
      && plan.dossier_request.claim_trace_packet_ids.length === 1
      && plan.dossier_request.claim_trace_packet_ids[0] === plan.claim_trace_packet_id
      && plan.dossier_request.closed_validation_cycle_snapshot_refs.length === 1
      && plan.dossier_request.closed_validation_cycle_snapshot_refs[0]?.closure_id
        === authority.closure.closure_id
      && Object.values(authority.expected_record_hashes).every(isHash);
  });
  addUnless(reasons, 'P5_CDF_EFFECT_BOUNDARY_INVALID', () => canonicalEqual(
    acceptancePackage.authorized_effects,
    exactScientificEvidenceP5ClaimDossierFinalEffectsV1(),
  ));
  addUnless(reasons, 'P5_CDF_EXECUTOR_INVALID', () => (
    acceptancePackage.executor.mode === 'claim_dossier_final_acceptance'
      && isNonEmpty(acceptancePackage.executor.path)
      && isHash(acceptancePackage.executor.sha256)
  ));
  addUnless(reasons, 'P5_CDF_SOURCE_BINDING_INVALID', () => (
    acceptancePackage.source_binding.source_files.length >= 6
      && new Set(acceptancePackage.source_binding.source_files.map((file) => file.path)).size
        === acceptancePackage.source_binding.source_files.length
      && acceptancePackage.source_binding.source_files.every((file) => (
        isNonEmpty(file.path) && isHash(file.sha256)
      ))
  ));
  addUnless(reasons, 'P5_CDF_RECOVERY_POINT_INVALID', () => {
    const point = acceptancePackage.recovery_point;
    return isNonEmpty(point.manifest_ref)
      && isIsoTimestamp(point.created_at)
      && point.target_fingerprint === acceptancePackage.authority.target_fingerprint
      && [
        point.target_fingerprint,
        point.recovery_fingerprint,
        point.schema_dump_sha256,
        point.authority_data_dump_sha256,
      ].every(isHash)
      && point.authority_table_count === 114;
  });
  addUnless(reasons, 'P5_CDF_WINDOW_INVALID', () => {
    const window = acceptancePackage.operational_window;
    return [window.prepared_at, window.authorization_not_after, window.execute_not_after]
      .every(isIsoTimestamp)
      && Date.parse(window.prepared_at) < Date.parse(window.authorization_not_after)
      && Date.parse(window.authorization_not_after) < Date.parse(window.execute_not_after);
  });
  addUnless(reasons, 'P5_CDF_FORBIDDEN_FIELD_PRESENT', () => {
    const serialized = canonicalizeExperimentV2Json(acceptancePackage).toLowerCase();
    return ![
      'access_key_id',
      'access_key_secret',
      'security_token',
      'credential_payload',
      'provider_response',
    ].some((field) => serialized.includes(`\"${field}\"`));
  });
  const reasonCodes = SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_REASON_CODES
    .filter((code) => reasons.has(code));
  const core = {
    package_hash: acceptancePackage.package_hash,
    status: reasonCodes.length === 0 ? 'eligible' : 'ineligible',
    reason_codes: reasonCodes,
  } as const;
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ELIGIBILITY_SCHEMA_V1,
    ...core,
    eligibility_record_hash: semanticHash(
      'ScientificEvidenceP5ClaimDossierFinalAcceptanceEligibility',
      core,
    ),
  };
}

export function assertScientificEvidenceP5ClaimDossierFinalPreparedV1(
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1,
): void {
  const eligibility = preflightScientificEvidenceP5ClaimDossierFinalPackageV1(
    prepared.acceptance_package,
  );
  if (
    prepared.schema_version !== SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1
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
  ) throw new Error('T136_P5_CLAIM_DOSSIER_FINAL_PREPARED_INVALID');
}

export function assertScientificEvidenceP5ClaimDossierFinalAcceptanceV1(input: {
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1;
  acceptance: ScientificEvidenceP5ClaimDossierFinalAcceptanceV1;
}): void {
  assertScientificEvidenceP5ClaimDossierFinalPreparedV1(input.prepared);
  const acceptancePackage = input.prepared.acceptance_package;
  const acceptance = input.acceptance;
  if (
    acceptance.schema_version !== SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_ACCEPTANCE_SCHEMA_V1
    || acceptance.status !== 'authorized_pending_execute'
    || acceptance.acceptance_attempt_id !== acceptancePackage.acceptance_attempt_id
    || acceptance.package_hash !== acceptancePackage.package_hash
    || acceptance.authorization.source !== 'current_codex_task_user'
    || acceptance.authorization.user_authorized !== true
    || !isIsoTimestamp(acceptance.authorization.received_at)
    || !isHash(acceptance.authorization.text_utf8_sha256)
    || !Number.isSafeInteger(acceptance.authorization.text_utf8_bytes)
    || acceptance.authorization.text_utf8_bytes <= 0
    || !canonicalEqual(
      acceptance.authorization.authorized_effects,
      acceptancePackage.authorized_effects,
    )
    || Date.parse(acceptance.authorization.received_at)
      > Date.parse(acceptancePackage.operational_window.authorization_not_after)
  ) throw new Error('T136_P5_CLAIM_DOSSIER_FINAL_ACCEPTANCE_INVALID');
}

export function assertScientificEvidenceP5ClaimDossierFinalWindow(
  acceptancePackage: ScientificEvidenceP5ClaimDossierFinalPackageV1,
  now = new Date().toISOString(),
): void {
  if (
    !isIsoTimestamp(now)
    || Date.parse(now) > Date.parse(acceptancePackage.operational_window.execute_not_after)
  ) throw new Error('T136_P5_CLAIM_DOSSIER_FINAL_WINDOW_EXPIRED');
}

export function buildScientificEvidenceP5M0SciAcceptanceV1(
  content: Omit<ScientificEvidenceP5M0SciAcceptanceV1, 'acceptance_record_hash'>,
): ScientificEvidenceP5M0SciAcceptanceV1 {
  return {
    ...structuredClone(content),
    acceptance_record_hash: semanticHash('ScientificEvidenceP5M0SciAcceptance', content),
  };
}

export function assertScientificEvidenceP5M0SciAcceptanceV1(
  acceptance: ScientificEvidenceP5M0SciAcceptanceV1,
): void {
  const { acceptance_record_hash: _stored, ...content } = acceptance;
  if (
    acceptance.schema_version !== SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1
    || acceptance.status !== 'passed'
    || acceptance.gate !== 'M0-SCI'
    || !isHash(acceptance.package_hash)
    || !isHash(acceptance.packet_content_hash)
    || !isHash(acceptance.claim_hash)
    || !isHash(acceptance.dossier_hash)
    || acceptance.create_job_call_count !== 2
    || acceptance.replay_new_row_count !== 0
    || acceptance.undelivered_integration_outbox_count !== 0
    || acceptance.persistent_capability_change_count !== 0
    || acceptance.capabilities_resting_state !== 'disabled'
    || !isIsoTimestamp(acceptance.accepted_at)
    || acceptance.acceptance_record_hash
      !== semanticHash('ScientificEvidenceP5M0SciAcceptance', content)
  ) throw new Error('T136_P5_M0_SCI_ACCEPTANCE_INVALID');
}

function exactPreExecutionCounts() {
  return {
    real_provider_attempts: 2,
    succeeded_real_provider_attempts: 2,
    create_job_commands: 2,
    experiment_results: 2,
    passed_validation_reports: 1,
    evidence_candidates: 1,
    run_evidence_units: 1,
    runtime_artifacts: 4,
    runtime_admissions: 4,
    closures: 1,
    packets: 1,
    undelivered_integration_outboxes: 0,
    claim_trace_manifests: 0,
    dossier_trace_manifests: 0,
    claim_trace_packets: 0,
    dossier_trace_gate_results: 0,
    claims: 0,
    dossiers: 0,
  } as const;
}

function assertId(actual: string, expected: string, label: string): void {
  if (actual !== expected) throw new Error(`T136_P5_CLAIM_DOSSIER_FINAL_${label}_ID_DRIFT`);
}

function recordHash(domain: string, value: unknown): string {
  return semanticHash(`ScientificEvidenceP5${domain}`, value);
}

function addUnless(
  reasons: Set<ScientificEvidenceP5ClaimDossierFinalReasonCode>,
  code: ScientificEvidenceP5ClaimDossierFinalReasonCode,
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
