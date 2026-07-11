import { createHash } from 'node:crypto';

import type {
  PaperImplementationAgentWorkflowType,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-agent-common-contracts';
import type {
  PaperImplementationRuntimeArtifactEnvelope,
  PaperImplementationRuntimeStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';

/**
 * Test-only acceptance-bridge seeding (S1-W1).
 *
 * Builds a synthetic final runtime artifact envelope, records it through the
 * real PaperImplementationRuntimeAdmissionService, and admits it at final
 * scope. Returns the lineage ref/hash pair a Create* request would carry.
 */

export interface PaperImplementationAcceptedProposalFixture {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  sourceProposalArtifactRef: TopicSelectionFunctionalRef;
  sourceProposalArtifactHash: string;
}

export interface PaperImplementationAcceptedProposalFixtureOptions {
  admissionService: PaperImplementationRuntimeAdmissionService;
  implementationProjectId: string;
  workflowType: PaperImplementationAgentWorkflowType;
  runtimeArtifactId: string;
  titleCardId?: string | null;
  runtimeStatus?: Extract<PaperImplementationRuntimeStatus, 'passed' | 'blocked'>;
}

function sha(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

function fixtureRef(
  refType: string,
  refId: string,
  titleCardId: string | null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: `${refId}@v1`,
    title_card_id: titleCardId,
  };
}

export function buildFinalRuntimeArtifactEnvelope(
  options: PaperImplementationAcceptedProposalFixtureOptions,
): PaperImplementationRuntimeArtifactEnvelope {
  const {
    implementationProjectId,
    workflowType,
    runtimeArtifactId,
  } = options;
  const titleCardId = options.titleCardId ?? 'title_card_001';
  const runtimeStatus = options.runtimeStatus ?? 'passed';
  const seed = runtimeArtifactId;
  return {
    schema_version: 'PaperImplementationRuntimeArtifactEnvelope@v1',
    runtime_artifact_id: runtimeArtifactId,
    artifact_identity_hash: sha(`${seed}:envelope`),
    runtime_identity_hash: sha(`${seed}:runtime-identity`),
    implementation_project_id: implementationProjectId,
    workflow_type: workflowType,
    slot_id: `${workflowType}.final`,
    artifact_scope: 'final',
    artifact_contract_id: 'PaperImplementationAcceptanceBridgeFixtureFinalArtifact',
    artifact_contract_version: 'v1',
    target_ref: fixtureRef('paper_implementation_project', implementationProjectId, titleCardId),
    target_version_id: 'target-version-1',
    input_snapshot_ref: fixtureRef('paper_implementation_input_snapshot', `${seed}-input-snapshot`, titleCardId),
    input_snapshot_hash: sha(`${seed}:input-snapshot`),
    source_hash_bundle_hash: sha(`${seed}:source-bundle`),
    created_by: 'system',
    created_at: '2026-05-21T00:00:00.000Z',
    role_slot_id: null,
    call_index: null,
    prior_role_artifact_refs: [fixtureRef('paper_implementation_role_artifact', `${seed}-role-artifact`, titleCardId)],
    prior_role_artifact_hashes: [sha(`${seed}:role-payload`)],
    role_chain_hash: sha(`${seed}:role-chain`),
    final_artifact_ref: fixtureRef('paper_implementation_final_artifact', `${seed}-final-artifact`, titleCardId),
    final_artifact_hash: sha(`${seed}:final-payload`),
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    executor_kind: 'single_agent',
    model_profile_id: 'codex-default',
    model_option_id: null,
    runtime_status: runtimeStatus,
    runtime_failure_code: null,
    retry_attempt_index: 0,
    provider_call_count: 0,
    response_reuse_status: 'not_applicable',
    response_reuse_decision_ref: null,
    response_reuse_decision_hash: null,
    allowed_side_effects: [],
    retrieval_packet_ref: null,
    retrieval_packet_hash: null,
    reviewed_statement_packet_ref: null,
    reviewed_statement_packet_hash: null,
    context_packet_ref: fixtureRef('paper_implementation_context_packet', `${seed}-context-packet`, titleCardId),
    context_packet_hash: sha(`${seed}:context-packet`),
    runtime_invocation_context_hash: sha(`${seed}:runtime-invocation-context`),
    context_policy_profile_hash: sha(`${seed}:context-policy-profile`),
    cache_policy_profile_hash: sha(`${seed}:cache-policy-profile`),
    source_refs: [fixtureRef('paper_implementation_source', `${seed}-source`, titleCardId)],
    source_hashes: [sha(`${seed}:source`)],
    prompt_packet_ref: fixtureRef('paper_implementation_prompt_packet', `${seed}-prompt-packet`, titleCardId),
    prompt_packet_hash: sha(`${seed}:prompt-packet`),
    prompt_template_id: 'pi-acceptance-bridge-fixture',
    prompt_template_version_id: 'prompt-template-v1',
    prompt_variant_id: 'default',
    prompt_redaction_policy_hash: sha(`${seed}:prompt-redaction-policy`),
    output_schema_id: 'PaperImplementationFinalOutput@v1',
    context_cache_key_hash: sha(`${seed}:context-cache-key`),
    context_cache_status: 'miss',
    context_cache_result_ref: null,
    context_cache_result_hash: null,
    prompt_packet_cache_key_hash: sha(`${seed}:prompt-cache-key`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    token_budget_gate_result_ref: fixtureRef('paper_implementation_token_budget_gate', `${seed}-budget-gate`, titleCardId),
    token_budget_gate_result_hash: sha(`${seed}:budget-gate`),
    compression_policy_profile_hash: sha(`${seed}:compression-policy-profile`),
    compression_status: 'not_needed',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_packet_ref: null,
    compressed_context_packet_hash: null,
    artifact_payload: { artifact_kind: 'acceptance_bridge_fixture_final_payload' },
    artifact_payload_ref: fixtureRef('paper_implementation_final_artifact_payload', `${seed}-final-payload`, titleCardId),
    artifact_payload_hash: sha(`${seed}:final-payload`),
    output_hash: sha(`${seed}:final-output`),
    runtime_audit_ref: fixtureRef('paper_implementation_runtime_audit', `${seed}-runtime-audit`, titleCardId),
    runtime_audit_hash: sha(`${seed}:runtime-audit`),
    blocker_codes: runtimeStatus === 'blocked' ? ['TRACE_MANIFEST_STALE'] : [],
    warning_codes: [],
  };
}

export async function seedAcceptedProposalFixture(
  options: PaperImplementationAcceptedProposalFixtureOptions,
): Promise<PaperImplementationAcceptedProposalFixture> {
  const { admissionService, implementationProjectId } = options;
  const artifact = await admissionService.recordRuntimeArtifact(
    buildFinalRuntimeArtifactEnvelope(options),
  );
  const finalHash = artifact.final_artifact_hash;
  if (finalHash === null) {
    throw new Error('Acceptance bridge fixture expected final_artifact_hash.');
  }
  const admission = await admissionService.admitRuntimeArtifact({
    admission_record_id: `admission_${artifact.runtime_artifact_id}`,
    implementation_project_id: implementationProjectId,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'final',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: finalHash,
  });
  if (admission.admission_status !== 'admitted') {
    throw new Error(
      `Acceptance bridge fixture expected admitted final artifact, got ${admission.admission_status}: ${admission.issue_codes.join(', ')}`,
    );
  }
  return {
    artifact,
    sourceProposalArtifactRef: {
      ref_type: 'paper_implementation_runtime_artifact',
      ref_id: artifact.runtime_artifact_id,
      title_card_id: options.titleCardId ?? 'title_card_001',
      version_id: null,
    },
    sourceProposalArtifactHash: finalHash,
  };
}
