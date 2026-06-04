import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type {
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import {
  PaperImplementationRuntimeAdmissionService,
  type AdmitPaperImplementationRuntimeArtifactRequest,
} from './paper-implementation-runtime-admission-service.js';

test('PaperImplementationRuntimeAdmissionService validates and stores runtime artifacts', async () => {
  const { service, repository } = serviceFixture();
  const stored = await service.recordRuntimeArtifact(runtimeArtifact());

  assert.equal(stored.runtime_artifact_id, 'runtime-artifact-role-1');
  const persisted = await repository.findRuntimeArtifactById(PROJECT_ID, 'runtime-artifact-role-1');
  assert.equal(persisted?.artifact_contract_id, 'PaperImplementationResultAnalysisRoleArtifact');
});

test('PaperImplementationRuntimeAdmissionService rejects legacy harness/proposal wrappers before persistence', async () => {
  const { service, repository } = serviceFixture();
  const legacyArtifact = runtimeArtifact({
    artifact_contract_id: 'PaperImplementationProposalArtifact',
  });

  await assert.rejects(
    () => service.recordRuntimeArtifact(legacyArtifact),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await repository.listRuntimeArtifacts(PROJECT_ID), []);
});

test('PaperImplementationRuntimeAdmissionService rejects legacy runtime artifact ref types before persistence', async () => {
  const { service, repository } = serviceFixture();
  const legacyArtifact = runtimeArtifact({
    artifact_payload_ref: ref('paper_implementation_proposal_artifact', 'proposal-artifact-1'),
  });

  await assert.rejects(
    () => service.recordRuntimeArtifact(legacyArtifact),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await repository.listRuntimeArtifacts(PROJECT_ID), []);
});

test('PaperImplementationRuntimeAdmissionService admits matching role runtime artifacts', async () => {
  const { service, repository } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(runtimeArtifact());

  const admission = await service.admitRuntimeArtifact({
    admission_record_id: 'admission-role-1',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
  });

  assert.equal(admission.admission_status, 'admitted');
  assert.deepEqual(admission.issue_codes, []);
  assert.equal(admission.runtime_artifact_ref.ref_type, 'paper_implementation_runtime_artifact');
  assert.equal(admission.runtime_artifact_ref.version_id, undefined);
  assert.equal(admission.runtime_artifact_hash, artifact.artifact_identity_hash);
  assert.deepEqual(admission.admitted_artifact_ref, artifact.artifact_payload_ref);
  assert.equal(admission.admitted_artifact_hash, artifact.artifact_payload_hash);
  assert.equal(admission.created_at, FIXED_NOW);

  const persisted = await repository.findAdmissionRecordById(PROJECT_ID, 'admission-role-1');
  assert.equal(persisted?.admission_status, 'admitted');
});

test('PaperImplementationRuntimeAdmissionService returns existing admission for the same admission identity', async () => {
  const { service, repository } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(runtimeArtifact());
  const request: AdmitPaperImplementationRuntimeArtifactRequest = {
    admission_record_id: 'admission-role-first',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
  };

  const first = await service.admitRuntimeArtifact(request);
  const second = await service.admitRuntimeArtifact({
    ...request,
    admission_record_id: 'admission-role-retry',
  });

  assert.equal(second.admission_record_id, first.admission_record_id);
  assert.equal(second.admission_identity_hash, first.admission_identity_hash);
  const persisted = await repository.listAdmissionRecords(PROJECT_ID);
  assert.equal(persisted.length, 1);
});

test('PaperImplementationRuntimeAdmissionService admits matching final runtime artifacts', async () => {
  const { service } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(finalRuntimeArtifact());
  const expectedFinalArtifactHash = requireHash(artifact.final_artifact_hash);

  const admission = await service.admitRuntimeArtifact({
    admission_record_id: 'admission-final-1',
    implementation_project_id: PROJECT_ID,
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
    expected_final_artifact_hash: expectedFinalArtifactHash,
  });

  assert.equal(admission.admission_status, 'admitted');
  assert.deepEqual(admission.issue_codes, []);
  assert.deepEqual(admission.admitted_artifact_ref, artifact.final_artifact_ref);
  assert.equal(admission.admitted_artifact_hash, artifact.final_artifact_hash);
  assert.deepEqual(admission.observed_prior_role_artifact_hashes, [hash('role-payload')]);
});

test('PaperImplementationRuntimeAdmissionService admits blocked runtime artifacts with typed blockers', async () => {
  const { service } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(runtimeArtifact({
    runtime_status: 'blocked',
    blocker_codes: ['TRACE_MANIFEST_STALE'],
    artifact_payload_ref: ref('paper_implementation_runtime_blocker_packet', 'blocker-packet-1'),
    artifact_payload_hash: hash('blocked-payload'),
    output_hash: hash('blocked-output'),
  }));

  const admission = await service.admitRuntimeArtifact({
    admission_record_id: 'admission-blocked-runtime',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
  });

  assert.equal(admission.admission_status, 'admitted');
  assert.deepEqual(admission.issue_codes, []);
  assert.deepEqual(admission.admitted_artifact_ref, artifact.artifact_payload_ref);
  assert.equal(admission.admitted_artifact_hash, artifact.artifact_payload_hash);
  assert.equal(admission.admission_identity.runtime_status, 'blocked');
  assert.deepEqual(admission.admission_identity.blocker_codes, ['TRACE_MANIFEST_STALE']);
});

test('PaperImplementationRuntimeAdmissionService rejects hash and schema drift without exposing queue payloads', async () => {
  const { service, repository } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(finalRuntimeArtifact());

  const admission = await service.admitRuntimeArtifact({
    admission_record_id: 'admission-final-drift',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'final',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: hash('wrong-source-bundle'),
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: hash('wrong-prompt-packet'),
    expected_output_schema_id: 'WrongOutputSchema@v1',
    expected_prior_role_artifact_hashes: [hash('wrong-role-payload')],
    expected_final_artifact_hash: hash('wrong-final-payload'),
  });

  assert.equal(admission.admission_status, 'rejected');
  assert.equal(admission.admitted_artifact_ref, null);
  assert.equal(admission.admitted_artifact_hash, null);
  assert.deepEqual(admission.issue_codes, [
    'SOURCE_HASH_BUNDLE_HASH_MISMATCH',
    'PROMPT_PACKET_HASH_MISMATCH',
    'OUTPUT_SCHEMA_ID_MISMATCH',
    'PRIOR_ROLE_ARTIFACT_HASHES_MISMATCH',
    'FINAL_ARTIFACT_HASH_MISMATCH',
  ]);
  assert.ok(!Object.hasOwn(admission.admission_identity, 'queue_item_payload'));
  assert.ok(!Object.hasOwn(admission.admission_identity, 'raw_provider_response'));

  const persisted = await repository.findAdmissionRecordById(PROJECT_ID, 'admission-final-drift');
  assert.equal(persisted?.admission_status, 'rejected');
});

test('PaperImplementationRuntimeAdmissionService rejects blocked runtime artifacts without blocker codes', async () => {
  const { service } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(runtimeArtifact({
    runtime_status: 'blocked',
    blocker_codes: [],
  }));

  const admission = await service.admitRuntimeArtifact({
    admission_record_id: 'admission-blocked-without-codes',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
  });

  assert.equal(admission.admission_status, 'rejected');
  assert.deepEqual(admission.issue_codes, ['RUNTIME_BLOCKER_CODES_MISSING']);
});

test('PaperImplementationRuntimeAdmissionService rejects runtime artifacts that did not pass', async () => {
  const { service } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(runtimeArtifact({
    runtime_status: 'failed_runtime',
    runtime_failure_code: 'PROVIDER_TIMEOUT',
    blocker_codes: ['PROVIDER_TIMEOUT'],
  }));

  const admission = await service.admitRuntimeArtifact({
    admission_record_id: 'admission-failed-runtime',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
  });

  assert.equal(admission.admission_status, 'rejected');
  assert.deepEqual(admission.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
});

test('PaperImplementationRuntimeAdmissionService returns existing rejected admission for the same failed-runtime identity', async () => {
  const { service, repository } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(runtimeArtifact({
    runtime_status: 'failed_runtime',
    runtime_failure_code: 'TimeoutError',
    blocker_codes: ['TimeoutError'],
    provider_call_count: 2,
    retry_attempt_index: 1,
    warning_codes: ['RUNTIME_TECHNICAL_RETRY_EXHAUSTED'],
  }));
  const request: AdmitPaperImplementationRuntimeArtifactRequest = {
    admission_record_id: 'admission-failed-runtime-first',
    implementation_project_id: PROJECT_ID,
    runtime_artifact_id: artifact.runtime_artifact_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
  };

  const first = await service.admitRuntimeArtifact(request);
  const second = await service.admitRuntimeArtifact({
    ...request,
    admission_record_id: 'admission-failed-runtime-replay',
  });

  assert.equal(first.admission_status, 'rejected');
  assert.equal(second.admission_record_id, first.admission_record_id);
  assert.equal(second.admission_identity_hash, first.admission_identity_hash);
  assert.deepEqual(second.issue_codes, ['RUNTIME_STATUS_FAILED_RUNTIME']);
  const persisted = await repository.listAdmissionRecords(PROJECT_ID);
  assert.equal(persisted.length, 1);
});

test('PaperImplementationRuntimeAdmissionService rejects missing final expected hash before persistence', async () => {
  const { service, repository } = serviceFixture();
  const artifact = await service.recordRuntimeArtifact(finalRuntimeArtifact());
  const request = {
    admission_record_id: 'admission-final-missing-expected-hash',
    implementation_project_id: PROJECT_ID,
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
    expected_final_artifact_hash: null,
  } as unknown as AdmitPaperImplementationRuntimeArtifactRequest;

  await assert.rejects(
    () => service.admitRuntimeArtifact(request),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await repository.listAdmissionRecords(PROJECT_ID), []);
});

test('PaperImplementationRuntimeAdmissionService reports missing runtime artifacts as NOT_FOUND', async () => {
  const { service } = serviceFixture();

  await assert.rejects(
    () => service.admitRuntimeArtifact({
      admission_record_id: 'admission-missing',
      implementation_project_id: PROJECT_ID,
      runtime_artifact_id: 'missing-runtime-artifact',
      admission_scope: 'role',
      admission_policy_id: 'runtime-admission-policy',
      admission_policy_version: 'v1',
      expected_runtime_identity_hash: hash('runtime-identity'),
      expected_source_hash_bundle_hash: hash('source-bundle'),
      expected_retrieval_packet_hash: null,
      expected_prompt_packet_hash: hash('prompt-packet'),
      expected_output_schema_id: 'PaperImplementationRoleOutput@v1',
      expected_prior_role_artifact_hashes: [],
      expected_final_artifact_hash: null,
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'NOT_FOUND',
  );
});

const PROJECT_ID = 'implementation-project-1';
const TITLE_CARD_ID = 'title-card-1';
const FIXED_NOW = '2026-06-03T00:02:00.000Z';

function serviceFixture(): {
  repository: InMemoryPaperImplementationRuntimeRepository;
  service: PaperImplementationRuntimeAdmissionService;
} {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  const service = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory: (prefix) => `${prefix}_fixed`,
    now: () => FIXED_NOW,
  });
  return {
    repository,
    service,
  };
}

function runtimeArtifact(
  overrides: Partial<PaperImplementationRuntimeArtifactEnvelope> = {},
): PaperImplementationRuntimeArtifactEnvelope {
  return {
    schema_version: 'PaperImplementationRuntimeArtifactEnvelope@v1',
    runtime_artifact_id: 'runtime-artifact-role-1',
    artifact_identity_hash: hash('role-envelope'),
    runtime_identity_hash: hash('runtime-identity'),
    implementation_project_id: PROJECT_ID,
    workflow_type: 'result_analysis',
    slot_id: 'slot-role',
    artifact_scope: 'role',
    artifact_contract_id: 'PaperImplementationResultAnalysisRoleArtifact',
    artifact_contract_version: 'v1',
    target_ref: ref('paper_implementation_project', PROJECT_ID),
    target_version_id: 'target-version-1',
    input_snapshot_ref: ref('paper_implementation_input_snapshot', 'input-snapshot-1'),
    input_snapshot_hash: hash('input-snapshot'),
    source_hash_bundle_hash: hash('source-bundle'),
    created_by: 'system',
    created_at: '2026-06-03T00:00:00.000Z',
    role_slot_id: 'role-analyst',
    call_index: 1,
    prior_role_artifact_refs: [],
    prior_role_artifact_hashes: [],
    role_chain_hash: hash('role-chain'),
    final_artifact_ref: null,
    final_artifact_hash: null,
    run_mode: 'dry_run',
    execution_mode: 'codex_assisted',
    executor_kind: 'single_agent',
    model_profile_id: 'codex-default',
    model_option_id: null,
    runtime_status: 'passed',
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
    context_packet_ref: ref('paper_implementation_context_packet', 'context-packet-1'),
    context_packet_hash: hash('context-packet'),
    runtime_invocation_context_hash: hash('runtime-invocation-context'),
    context_policy_profile_hash: hash('context-policy-profile'),
    cache_policy_profile_hash: hash('cache-policy-profile'),
    source_refs: [ref('paper_implementation_source', 'source-1')],
    source_hashes: [hash('source-1')],
    prompt_packet_ref: ref('paper_implementation_prompt_packet', 'prompt-packet-1'),
    prompt_packet_hash: hash('prompt-packet'),
    prompt_template_id: 'pi-result-analysis-role',
    prompt_template_version_id: 'prompt-template-v1',
    prompt_variant_id: 'default',
    prompt_redaction_policy_hash: hash('prompt-redaction-policy'),
    output_schema_id: 'PaperImplementationRoleOutput@v1',
    context_cache_key_hash: hash('context-cache-key'),
    context_cache_status: 'miss',
    context_cache_result_ref: null,
    context_cache_result_hash: null,
    prompt_packet_cache_key_hash: hash('prompt-cache-key'),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    token_budget_gate_result_ref: ref('paper_implementation_token_budget_gate', 'budget-gate-1'),
    token_budget_gate_result_hash: hash('budget-gate'),
    compression_policy_profile_hash: hash('compression-policy-profile'),
    compression_status: 'not_needed',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_packet_ref: null,
    compressed_context_packet_hash: null,
    artifact_payload: { artifact_kind: 'test_runtime_artifact_payload' },
    artifact_payload_ref: ref('paper_implementation_role_artifact', 'role-artifact-1'),
    artifact_payload_hash: hash('role-payload'),
    output_hash: hash('role-output'),
    runtime_audit_ref: ref('paper_implementation_runtime_audit', 'runtime-audit-1'),
    runtime_audit_hash: hash('runtime-audit'),
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function finalRuntimeArtifact(
  overrides: Partial<PaperImplementationRuntimeArtifactEnvelope> = {},
): PaperImplementationRuntimeArtifactEnvelope {
  return runtimeArtifact({
    runtime_artifact_id: 'runtime-artifact-final-1',
    artifact_identity_hash: hash('final-envelope'),
    slot_id: 'slot-final',
    artifact_scope: 'final',
    artifact_contract_id: 'PaperImplementationResultAnalysisFinalArtifact',
    role_slot_id: null,
    call_index: null,
    prior_role_artifact_refs: [ref('paper_implementation_role_artifact', 'role-artifact-1')],
    prior_role_artifact_hashes: [hash('role-payload')],
    final_artifact_ref: ref('paper_implementation_final_artifact', 'final-artifact-1'),
    final_artifact_hash: hash('final-payload'),
    artifact_payload: { artifact_kind: 'test_runtime_final_artifact_payload' },
    artifact_payload_ref: ref('paper_implementation_final_artifact_payload', 'final-payload-1'),
    artifact_payload_hash: hash('final-payload'),
    output_schema_id: 'PaperImplementationFinalOutput@v1',
    output_hash: hash('final-output'),
    ...overrides,
  });
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: `${refId}@v1`,
    title_card_id: TITLE_CARD_ID,
  };
}

function hash(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

function requireHash(value: string | null): string {
  if (value === null) {
    throw new Error('Expected fixture hash.');
  }
  return value;
}
