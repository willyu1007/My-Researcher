import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRuntimeRepository } from './in-memory-paper-implementation-runtime-repository.js';

test('InMemoryPaperImplementationRuntimeRepository stores runtime artifacts by project and filter', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  const role = runtimeArtifact();
  const final = finalRuntimeArtifact({
    runtime_artifact_id: 'runtime-artifact-final-1',
    slot_id: 'slot-final',
    artifact_identity_hash: hash('final-envelope'),
  });
  await repository.createRuntimeArtifact(role);
  await repository.createRuntimeArtifact(final);

  const projectArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID);
  assert.deepEqual(projectArtifacts.map((artifact) => artifact.runtime_artifact_id), [
    'runtime-artifact-role-1',
    'runtime-artifact-final-1',
  ]);

  const roleArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    artifact_scope: 'role',
  });
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.runtime_artifact_id), [
    'runtime-artifact-role-1',
  ]);

  const finalSlotArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: 'slot-final',
  });
  assert.deepEqual(finalSlotArtifacts.map((artifact) => artifact.runtime_artifact_id), [
    'runtime-artifact-final-1',
  ]);

  const otherProjectArtifacts = await repository.listRuntimeArtifacts('other-project');
  assert.deepEqual(otherProjectArtifacts, []);
});

test('InMemoryPaperImplementationRuntimeRepository returns cloned runtime artifacts', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  await repository.createRuntimeArtifact(runtimeArtifact());

  const firstRead = await repository.findRuntimeArtifactById(PROJECT_ID, 'runtime-artifact-role-1');
  assert.ok(firstRead);
  firstRead.warning_codes.push('MUTATED_OUTSIDE_REPOSITORY');

  const secondRead = await repository.findRuntimeArtifactById(PROJECT_ID, 'runtime-artifact-role-1');
  assert.ok(secondRead);
  assert.deepEqual(secondRead.warning_codes, []);
});

test('InMemoryPaperImplementationRuntimeRepository rejects duplicate runtime artifact ids', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  await repository.createRuntimeArtifact(runtimeArtifact());

  await assert.rejects(
    () => repository.createRuntimeArtifact(runtimeArtifact()),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('InMemoryPaperImplementationRuntimeRepository rejects a runtime identity replay with 409 (S2-C C2)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  await repository.createRuntimeArtifact(runtimeArtifact());

  // A fresh runtime_artifact_id with the same runtime_identity_hash is an
  // identity replay — it must conflict exactly like the Prisma unique index.
  await assert.rejects(
    () => repository.createRuntimeArtifact(runtimeArtifact({
      runtime_artifact_id: 'runtime-artifact-role-replayed-1',
      artifact_identity_hash: hash('replayed-envelope'),
    })),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && error.message.includes('runtime_identity_hash'),
  );

  // A distinct runtime identity is accepted.
  await repository.createRuntimeArtifact(runtimeArtifact({
    runtime_artifact_id: 'runtime-artifact-role-2',
    artifact_identity_hash: hash('second-envelope'),
    runtime_identity_hash: hash('second-runtime-identity'),
  }));
});

test('InMemoryPaperImplementationRuntimeRepository lists final artifacts by final_artifact_ref (S2-C C4 direct lookup)', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  await repository.createRuntimeArtifact(runtimeArtifact());
  const final = finalRuntimeArtifact();
  await repository.createRuntimeArtifact(final);

  const matches = await repository.listFinalRuntimeArtifactsByFinalArtifactRef(
    PROJECT_ID,
    final.final_artifact_ref!.ref_type,
    final.final_artifact_ref!.ref_id,
  );
  assert.deepEqual(matches.map((artifact) => artifact.runtime_artifact_id), ['runtime-artifact-final-1']);

  const wrongRef = await repository.listFinalRuntimeArtifactsByFinalArtifactRef(
    PROJECT_ID,
    final.final_artifact_ref!.ref_type,
    'missing-final-artifact',
  );
  assert.deepEqual(wrongRef, []);

  const wrongProject = await repository.listFinalRuntimeArtifactsByFinalArtifactRef(
    'other-project',
    final.final_artifact_ref!.ref_type,
    final.final_artifact_ref!.ref_id,
  );
  assert.deepEqual(wrongProject, []);
});

test('InMemoryPaperImplementationRuntimeRepository stores admission records by project and filter', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  const role = admissionRecord();
  const final = admissionRecord({
    admission_record_id: 'admission-final-1',
    admission_scope: 'final',
    runtime_artifact_id: 'runtime-artifact-final-1',
    slot_id: 'slot-final',
    expected_prior_role_artifact_hashes: [hash('role-payload')],
    expected_final_artifact_hash: hash('final-payload'),
    observed_prior_role_artifact_hashes: [hash('role-payload')],
    admitted_artifact_ref: ref('paper_implementation_final_artifact', 'final-artifact-1'),
    admitted_artifact_hash: hash('final-payload'),
  });
  await repository.createAdmissionRecord(role);
  await repository.createAdmissionRecord(final);

  const projectRecords = await repository.listAdmissionRecords(PROJECT_ID);
  assert.deepEqual(projectRecords.map((record) => record.admission_record_id), [
    'admission-role-1',
    'admission-final-1',
  ]);

  const finalRecords = await repository.listAdmissionRecords(PROJECT_ID, {
    admission_scope: 'final',
  });
  assert.deepEqual(finalRecords.map((record) => record.admission_record_id), [
    'admission-final-1',
  ]);

  const runtimeRecords = await repository.listAdmissionRecords(PROJECT_ID, {
    runtime_artifact_id: 'runtime-artifact-role-1',
  });
  assert.deepEqual(runtimeRecords.map((record) => record.admission_record_id), [
    'admission-role-1',
  ]);
  assert.equal(
    (await repository.findAdmissionRecordByIdentityHash(PROJECT_ID, role.admission_identity_hash))
      ?.admission_record_id,
    'admission-role-1',
  );
});

test('InMemoryPaperImplementationRuntimeRepository rejects duplicate admission record ids', async () => {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  await repository.createAdmissionRecord(admissionRecord());

  await assert.rejects(
    () => repository.createAdmissionRecord(admissionRecord()),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

const PROJECT_ID = 'implementation-project-1';
const TITLE_CARD_ID = 'title-card-1';

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
    // Real envelopes never share a runtime identity across scopes (the identity
    // includes artifact_scope); the fixture mirrors that so the S2-C C2
    // identity-uniqueness guard is not tripped by the final artifact.
    runtime_identity_hash: hash('runtime-identity-final'),
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
    output_hash: hash('final-output'),
    ...overrides,
  });
}

function admissionRecord(
  overrides: Partial<PaperImplementationRuntimeAdmissionRecord> = {},
): PaperImplementationRuntimeAdmissionRecord {
  return {
    schema_version: 'PaperImplementationRuntimeAdmissionRecord@v1',
    admission_record_id: 'admission-role-1',
    implementation_project_id: PROJECT_ID,
    workflow_type: 'result_analysis',
    slot_id: 'slot-role',
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    runtime_artifact_ref: ref('paper_implementation_runtime_artifact', 'runtime-artifact-role-1'),
    runtime_artifact_hash: hash('role-envelope'),
    runtime_artifact_id: 'runtime-artifact-role-1',
    artifact_contract_id: 'PaperImplementationResultAnalysisRoleArtifact',
    target_ref: ref('paper_implementation_project', PROJECT_ID),
    created_at: '2026-06-03T00:01:00.000Z',
    expected_runtime_identity_hash: hash('runtime-identity'),
    expected_source_hash_bundle_hash: hash('source-bundle'),
    expected_retrieval_packet_hash: null,
    expected_prompt_packet_hash: hash('prompt-packet'),
    expected_output_schema_id: 'PaperImplementationRoleOutput@v1',
    expected_prior_role_artifact_hashes: [],
    expected_final_artifact_hash: null,
    observed_runtime_identity_hash: hash('runtime-identity'),
    observed_source_hash_bundle_hash: hash('source-bundle'),
    observed_retrieval_packet_hash: null,
    observed_prompt_packet_hash: hash('prompt-packet'),
    observed_output_schema_id: 'PaperImplementationRoleOutput@v1',
    observed_prior_role_artifact_hashes: [],
    observed_output_hash: hash('role-output'),
    admission_status: 'admitted',
    admission_identity: {
      runtime_artifact_id: 'runtime-artifact-role-1',
    },
    admission_identity_hash: hash('admission-identity'),
    admitted_artifact_ref: ref('paper_implementation_role_artifact', 'role-artifact-1'),
    admitted_artifact_hash: hash('role-payload'),
    issue_codes: [],
    warning_codes: [],
    ...overrides,
  };
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
