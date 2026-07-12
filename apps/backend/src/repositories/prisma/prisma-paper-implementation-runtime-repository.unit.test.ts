import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import { PrismaPaperImplementationRuntimeRepository } from './prisma-paper-implementation-runtime-repository.js';

const PROJECT_ID = 'implementation-project-1';
const TITLE_CARD_ID = 'title-card-1';
const NOW = '2026-06-03T00:00:00.000Z';

type StoredRow = Record<string, unknown> & { id: string };

function makeModel(rows: StoredRow[], uniqueColumns: string[] = []) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      if (rows.some((row) => row.id === data.id)) {
        throw new Prisma.PrismaClientKnownRequestError('duplicate runtime row', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      for (const column of uniqueColumns) {
        if (data[column] !== undefined && rows.some((row) => row[column] === data[column])) {
          throw new Prisma.PrismaClientKnownRequestError('duplicate unique column', {
            code: 'P2002',
            clientVersion: 'test',
            meta: { target: [column] },
          });
        }
      }
      const row = normalizeRow(data);
      rows.push(row);
      return row;
    },
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where }: { where?: Record<string, unknown> }) =>
      rows.filter((row) => matchesWhere(row, where ?? {})),
  };
}

function makeFakePrismaClient(): {
  prisma: PrismaClient;
  runtimeArtifactRows: StoredRow[];
  admissionRecordRows: StoredRow[];
} {
  const runtimeArtifactRows: StoredRow[] = [];
  const admissionRecordRows: StoredRow[] = [];
  return {
    runtimeArtifactRows,
    admissionRecordRows,
    prisma: {
      // S2-C C2: mirrors the runtimeIdentityHash unique constraint.
      paperImplementationRuntimeArtifact: makeModel(runtimeArtifactRows, ['runtimeIdentityHash']),
      paperImplementationRuntimeAdmissionRecord: makeModel(admissionRecordRows),
    } as unknown as PrismaClient,
  };
}

function normalizeRow(row: StoredRow): StoredRow {
  const normalized: StoredRow = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if (key.endsWith('At') && typeof value === 'string') {
      normalized[key] = new Date(value);
    }
  }
  return normalized;
}

function matchesWhere(row: StoredRow, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND' && Array.isArray(value)) {
      return value.every((clause) => matchesWhere(row, clause as Record<string, unknown>));
    }
    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && Array.isArray((value as { path?: unknown }).path)
    ) {
      // Prisma JSON path filter: { path: [...segments], equals: expected }.
      const { path, equals } = value as { path: string[]; equals: unknown };
      let current: unknown = row[key];
      for (const segment of path) {
        if (!current || typeof current !== 'object') {
          return false;
        }
        current = (current as Record<string, unknown>)[segment];
      }
      return current === equals;
    }
    return row[key] === value;
  });
}

test('Prisma PaperImplementationRuntime repository round-trips runtime artifacts and admission records', async () => {
  const fixture = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationRuntimeRepository(fixture.prisma);
  const artifact = await repository.createRuntimeArtifact(runtimeArtifact());

  assert.equal(artifact.runtime_artifact_id, 'runtime-artifact-role-1');
  assert.equal(artifact.prompt_packet_hash, hash('prompt-packet'));
  assert.equal(fixture.runtimeArtifactRows[0]?.artifactContractId, 'PaperImplementationResultAnalysisRoleArtifact');
  assert.equal(fixture.runtimeArtifactRows[0]?.targetRefType, 'paper_implementation_project');
  assert.equal(fixture.runtimeArtifactRows[0]?.promptPacketHash, hash('prompt-packet'));
  assert.equal(Object.hasOwn(fixture.runtimeArtifactRows[0] ?? {}, 'promptText'), false);
  assert.equal(Object.hasOwn(fixture.runtimeArtifactRows[0] ?? {}, 'providerResponse'), false);

  assert.equal(
    (await repository.findRuntimeArtifactById(PROJECT_ID, 'runtime-artifact-role-1'))?.runtime_status,
    'passed',
  );
  assert.equal(
    (await repository.listRuntimeArtifacts(PROJECT_ID, { slot_id: 'slot-role', artifact_scope: 'role' }))[0]
      ?.runtime_artifact_id,
    'runtime-artifact-role-1',
  );
  assert.deepEqual(await repository.listRuntimeArtifacts(PROJECT_ID, { artifact_scope: 'final' }), []);

  const admission = await repository.createAdmissionRecord(admissionRecord(artifact));

  assert.equal(admission.admission_record_id, 'admission-role-1');
  assert.equal(admission.admission_status, 'admitted');
  assert.equal(fixture.admissionRecordRows[0]?.runtimeArtifactId, 'runtime-artifact-role-1');
  assert.equal(fixture.admissionRecordRows[0]?.admissionIdentityHash, hash('admission-identity'));
  assert.equal(Object.hasOwn(fixture.admissionRecordRows[0] ?? {}, 'queueItemPayload'), false);
  assert.equal(Object.hasOwn(fixture.admissionRecordRows[0] ?? {}, 'rawProviderResponse'), false);

  assert.equal(
    (await repository.findAdmissionRecordById(PROJECT_ID, 'admission-role-1'))?.admitted_artifact_hash,
    hash('role-payload'),
  );
  assert.equal(
    (await repository.findAdmissionRecordByIdentityHash(PROJECT_ID, hash('admission-identity')))
      ?.admission_record_id,
    'admission-role-1',
  );
  assert.equal(
    (await repository.listAdmissionRecords(PROJECT_ID, {
      runtime_artifact_id: 'runtime-artifact-role-1',
      admission_scope: 'role',
    }))[0]?.admission_record_id,
    'admission-role-1',
  );
});

test('Prisma PaperImplementationRuntime repository maps duplicate ids to VERSION_CONFLICT', async () => {
  const fixture = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationRuntimeRepository(fixture.prisma);
  await repository.createRuntimeArtifact(runtimeArtifact());

  await assert.rejects(
    () => repository.createRuntimeArtifact(runtimeArtifact()),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('Prisma PaperImplementationRuntime repository maps a runtime identity replay to 409 VERSION_CONFLICT (S2-C C2)', async () => {
  const fixture = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationRuntimeRepository(fixture.prisma);
  await repository.createRuntimeArtifact(runtimeArtifact());

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

  const distinct = await repository.createRuntimeArtifact(runtimeArtifact({
    runtime_artifact_id: 'runtime-artifact-role-2',
    artifact_identity_hash: hash('second-envelope'),
    runtime_identity_hash: hash('second-runtime-identity'),
  }));
  assert.equal(distinct.runtime_artifact_id, 'runtime-artifact-role-2');
});

test('Prisma PaperImplementationRuntime repository lists final artifacts by final_artifact_ref (S2-C C4 direct lookup)', async () => {
  const fixture = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationRuntimeRepository(fixture.prisma);
  await repository.createRuntimeArtifact(runtimeArtifact());
  const finalRef = ref('paper_implementation_final_artifact', 'final-artifact-1');
  await repository.createRuntimeArtifact(runtimeArtifact({
    runtime_artifact_id: 'runtime-artifact-final-1',
    artifact_identity_hash: hash('final-envelope'),
    runtime_identity_hash: hash('final-runtime-identity'),
    slot_id: 'slot-final',
    artifact_scope: 'final',
    role_slot_id: null,
    call_index: null,
    final_artifact_ref: finalRef,
    final_artifact_hash: hash('final-payload'),
  }));

  const matches = await repository.listFinalRuntimeArtifactsByFinalArtifactRef(
    PROJECT_ID,
    finalRef.ref_type,
    finalRef.ref_id,
  );
  assert.deepEqual(matches.map((artifact) => artifact.runtime_artifact_id), ['runtime-artifact-final-1']);

  assert.deepEqual(
    await repository.listFinalRuntimeArtifactsByFinalArtifactRef(PROJECT_ID, finalRef.ref_type, 'missing'),
    [],
  );
});

test('runtime admission migration declares queryable identity indexes without provider payload columns', async () => {
  const sql = await readFile(
    new URL(
      '../../../../../prisma/migrations/20260603100000_add_paper_implementation_runtime_admission/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  for (const expected of [
    'PaperImplementationRuntimeArtifact',
    'PaperImplementationRuntimeAdmissionRecord',
    'pi_runtime_artifact_slot_scope_idx',
    'pi_runtime_artifact_workflow_status_idx',
    'pi_runtime_artifact_prompt_hash_idx',
    'pi_runtime_admission_scope_status_idx',
    'pi_runtime_admission_artifact_idx',
    'pi_runtime_admission_identity_idx',
    'pi_runtime_admission_identity_unique',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
  assert.doesNotMatch(sql, /promptText|renderedPromptText|providerResponse|rawProviderResponse|queueItemPayload/);
});

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
    created_at: NOW,
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

function admissionRecord(
  artifact: PaperImplementationRuntimeArtifactEnvelope,
): PaperImplementationRuntimeAdmissionRecord {
  return {
    schema_version: 'PaperImplementationRuntimeAdmissionRecord@v1',
    admission_record_id: 'admission-role-1',
    implementation_project_id: PROJECT_ID,
    workflow_type: artifact.workflow_type,
    slot_id: artifact.slot_id,
    admission_scope: 'role',
    admission_policy_id: 'runtime-admission-policy',
    admission_policy_version: 'v1',
    runtime_artifact_ref: ref('paper_implementation_runtime_artifact', artifact.runtime_artifact_id),
    runtime_artifact_hash: artifact.artifact_identity_hash,
    runtime_artifact_id: artifact.runtime_artifact_id,
    artifact_contract_id: artifact.artifact_contract_id,
    target_ref: artifact.target_ref,
    created_at: '2026-06-03T00:01:00.000Z',
    expected_runtime_identity_hash: artifact.runtime_identity_hash,
    expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
    expected_prompt_packet_hash: artifact.prompt_packet_hash,
    expected_output_schema_id: artifact.output_schema_id,
    expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    expected_final_artifact_hash: null,
    observed_runtime_identity_hash: artifact.runtime_identity_hash,
    observed_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
    observed_retrieval_packet_hash: artifact.retrieval_packet_hash,
    observed_prompt_packet_hash: artifact.prompt_packet_hash,
    observed_output_schema_id: artifact.output_schema_id,
    observed_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    observed_output_hash: artifact.output_hash,
    admission_status: 'admitted',
    admission_identity: {
      runtime_artifact_id: artifact.runtime_artifact_id,
      runtime_status: artifact.runtime_status,
    },
    admission_identity_hash: hash('admission-identity'),
    admitted_artifact_ref: artifact.artifact_payload_ref,
    admitted_artifact_hash: artifact.artifact_payload_hash,
    issue_codes: [],
    warning_codes: [],
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
