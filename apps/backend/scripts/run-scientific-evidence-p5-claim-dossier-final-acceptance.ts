#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1,
  assertScientificEvidenceP5ClaimDossierFinalAcceptanceV1,
  assertScientificEvidenceP5ClaimDossierFinalPreparedV1,
  assertScientificEvidenceP5ClaimDossierFinalWindow,
  assertScientificEvidenceP5M0SciAcceptanceV1,
  buildScientificEvidenceP5M0SciAcceptanceV1,
  type ScientificEvidenceP5ClaimDossierFinalAcceptanceV1,
  type ScientificEvidenceP5ClaimDossierFinalPreparedV1,
} from '../src/services/scientific-evidence-p5-claim-dossier-final-acceptance-service.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  FINAL_ACCEPTANCE_ATTEMPT_ID,
  FINAL_ACCEPTANCE_CLAIM_ID,
  FINAL_ACCEPTANCE_DOSSIER_ID,
  FINAL_ACCEPTANCE_PACKET_ID,
  FINAL_ACCEPTANCE_PROJECT_ID,
  FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
  assembleScientificEvidenceP5ClaimDossierFinalReadOnlyV1,
  assertScientificEvidenceP5ClaimDossierExpectedRecordsV1,
  assertScientificEvidenceP5ClaimDossierPostExecutionCountsV1,
  assertScientificEvidenceP5ClaimDossierPreExecutionCountsV1,
  materializeScientificEvidenceP5ClaimDossierFinalNamedLocalV1,
  readScientificEvidenceP5ClaimDossierAuthorityV1,
  readScientificEvidenceP5ClaimDossierCountsV1,
} from './scientific-evidence-p5-claim-dossier-final-runtime.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-claim-dossier-final-acceptance-v1.json',
);
const ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-claim-dossier-final-acceptance-v1.json',
);
const M0_SCI_ACCEPTANCE_PATH = path.join(MANIFEST_DIRECTORY, 'm0-sci-acceptance-v1.json');
const PREDECESSOR_PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-packet-only-recovery-v1.json',
);
const PREDECESSOR_ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-packet-only-recovery-v1.json',
);
const PREDECESSOR_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-packet-only-recovery-1-packet_only_recovery-claim.json',
);
const PREDECESSOR_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-packet-only-recovery-1-packet_only_recovery-completion.json',
);
const PREDECESSOR_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-packet-only-recovery-1.json',
);
const CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readPrepared();
  if (mode === 'execute') {
    const acceptance = await readAcceptance(prepared);
    assertScientificEvidenceP5ClaimDossierFinalWindow(prepared.acceptance_package);
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: MANIFEST_DIRECTORY,
      binding: attemptBinding(prepared),
      stage: 'claim_dossier_final_acceptance',
      operation: async () => runWindow(mode, prepared, acceptance),
    });
    writeOutput(output);
    return;
  }
  writeOutput(await runWindow(mode, prepared, null));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1,
  acceptance: ScientificEvidenceP5ClaimDossierFinalAcceptanceV1 | null,
): Promise<Record<string, unknown>> {
  assertNoProviderCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertBoundFiles(prepared);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_CLAIM_DOSSIER_FINAL_TARGET_MISMATCH',
  );
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const authority = await readScientificEvidenceP5ClaimDossierAuthorityV1(prisma);
    assertAuthorityMatches(prepared, authority);
    const plan = prepared.acceptance_package.authority.final_plan;
    const expected = prepared.acceptance_package.authority.expected_record_hashes;
    const assembled = await assembleScientificEvidenceP5ClaimDossierFinalReadOnlyV1({ prisma, plan });
    assertScientificEvidenceP5ClaimDossierExpectedRecordsV1({ records: assembled, expected });
    if (mode === 'offline-preflight') {
      return {
        schema_version: 'ScientificEvidenceP5ClaimDossierFinalOfflinePreflight@v1',
        status: 'passed_awaiting_exact_authorization',
        acceptance_attempt_id: FINAL_ACCEPTANCE_ATTEMPT_ID,
        package_hash: prepared.acceptance_package.package_hash,
        target_fingerprint: target.fingerprint,
        canonical_packet_verified: true,
        closure_snapshot_verified: true,
        run_evidence_unit_verified: true,
        literature_authority_verified: true,
        production_service_assembly_verified: true,
        expected_record_hashes: expected,
        acceptance_present: await fileExists(ACCEPTANCE_PATH),
        current: authority.scientific_chain_counts,
        database_write_count: 0,
        external_call_count: 0,
        create_job_call_count: 0,
        capability_change_count: 0,
      };
    }
    assert.ok(acceptance);
    const records = await materializeScientificEvidenceP5ClaimDossierFinalNamedLocalV1({
      prisma,
      plan,
    });
    assertScientificEvidenceP5ClaimDossierExpectedRecordsV1({ records, expected });
    const postCounts = await readScientificEvidenceP5ClaimDossierCountsV1(prisma);
    assertScientificEvidenceP5ClaimDossierPostExecutionCountsV1(postCounts);
    const replayCountsBefore = structuredClone(postCounts);
    const replay = await assembleScientificEvidenceP5ClaimDossierFinalReadOnlyV1({ prisma, plan });
    assertScientificEvidenceP5ClaimDossierExpectedRecordsV1({ records: replay, expected });
    const replayCountsAfter = await readScientificEvidenceP5ClaimDossierCountsV1(prisma);
    assert.deepEqual(replayCountsAfter, replayCountsBefore);
    const acceptedAt = new Date().toISOString();
    const m0Acceptance = buildScientificEvidenceP5M0SciAcceptanceV1({
      schema_version: SCIENTIFIC_EVIDENCE_P5_M0_SCI_ACCEPTANCE_SCHEMA_V1,
      status: 'passed',
      gate: 'M0-SCI',
      acceptance_attempt_id: FINAL_ACCEPTANCE_ATTEMPT_ID,
      package_hash: prepared.acceptance_package.package_hash,
      implementation_project_id: FINAL_ACCEPTANCE_PROJECT_ID,
      validation_cycle_id: FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
      result_interpretation_packet_id: FINAL_ACCEPTANCE_PACKET_ID,
      packet_content_hash: prepared.acceptance_package.authority.packet.packet_content_hash,
      claim_candidate_id: FINAL_ACCEPTANCE_CLAIM_ID,
      claim_hash: expected.claim_hash,
      dossier_id: FINAL_ACCEPTANCE_DOSSIER_ID,
      dossier_hash: records.dossier.dossier_hash,
      create_job_call_count: 2,
      replay_new_row_count: 0,
      undelivered_integration_outbox_count: 0,
      persistent_capability_change_count: 0,
      capabilities_resting_state: 'disabled',
      accepted_at: acceptedAt,
    });
    assertScientificEvidenceP5M0SciAcceptanceV1(m0Acceptance);
    await publishExclusiveJson(M0_SCI_ACCEPTANCE_PATH, m0Acceptance);
    return {
      schema_version: 'ScientificEvidenceP5ClaimDossierFinalResult@v1',
      status: 'm0_sci_passed',
      gate: 'M0-SCI',
      package_hash: prepared.acceptance_package.package_hash,
      target_fingerprint: target.fingerprint,
      claim_candidate_id: records.claim.claim_candidate_id,
      claim_hash: expected.claim_hash,
      dossier_id: records.dossier.dossier_id,
      dossier_hash: records.dossier.dossier_hash,
      trace_manifest_write_count: 2,
      claim_trace_packet_write_count: 1,
      trace_gate_result_write_count: 1,
      claim_write_count: 1,
      dossier_write_count: 1,
      m0_sci_acceptance_record_write_count: 1,
      replay_new_row_count: 0,
      external_call_count: 0,
      create_job_call_count: 0,
      capability_change_count: 0,
      resting_capabilities: 'disabled',
      current: replayCountsAfter,
      acceptance_record_hash: m0Acceptance.acceptance_record_hash,
    };
  } finally {
    await prisma.$disconnect();
  }
}

function assertAuthorityMatches(
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1,
  current: Awaited<ReturnType<typeof readScientificEvidenceP5ClaimDossierAuthorityV1>>,
): void {
  const expected = prepared.acceptance_package.authority;
  assert.equal(current.project.implementation_project_id, expected.implementation_project_id);
  assert.equal(current.project.title_card_id, expected.title_card_id);
  assert.equal(current.packet.result_interpretation_packet_id, expected.packet.result_interpretation_packet_id);
  assert.equal(current.packet.packet_content_hash, expected.packet.packet_content_hash);
  assert.equal(current.packet.trace_manifest_id, expected.packet.trace_manifest_id);
  assert.equal(current.packet.created_at, expected.packet.created_at);
  assert.deepEqual(current.closure, expected.closure);
  assert.deepEqual(current.run_evidence_unit, expected.run_evidence_unit);
  assert.deepEqual(current.literature_evidence, expected.literature_evidence);
  assertScientificEvidenceP5ClaimDossierPreExecutionCountsV1(current.scientific_chain_counts);
}

async function assertBoundFiles(
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1,
): Promise<void> {
  const acceptancePackage = prepared.acceptance_package;
  assert.equal(await fileHash(PREDECESSOR_PREPARED_PATH), acceptancePackage.predecessor.prepared_record_sha256);
  assert.equal(await fileHash(PREDECESSOR_ACCEPTANCE_PATH), acceptancePackage.predecessor.acceptance_record_sha256);
  assert.equal(await fileHash(PREDECESSOR_CLAIM_PATH), acceptancePackage.predecessor.claim_record_sha256);
  assert.equal(await fileHash(PREDECESSOR_COMPLETION_PATH), acceptancePackage.predecessor.completion_record_sha256);
  assert.equal(await fileExists(PREDECESSOR_TERMINAL_PATH), false);
  assert.equal(await fileHash(path.join(REPO_ROOT, acceptancePackage.executor.path)), acceptancePackage.executor.sha256);
  for (const source of acceptancePackage.source_binding.source_files) {
    assert.equal(await fileHash(path.join(REPO_ROOT, source.path)), source.sha256);
  }
  const recovery = JSON.parse(
    await fs.readFile(acceptancePackage.recovery_point.manifest_ref, 'utf8'),
  ) as Record<string, unknown>;
  assert.equal(recovery.target_fingerprint, acceptancePackage.recovery_point.target_fingerprint);
  assert.equal(recovery.recovery_fingerprint, acceptancePackage.recovery_point.recovery_fingerprint);
}

async function readPrepared(): Promise<ScientificEvidenceP5ClaimDossierFinalPreparedV1> {
  const prepared = JSON.parse(
    await fs.readFile(PREPARED_PATH, 'utf8'),
  ) as ScientificEvidenceP5ClaimDossierFinalPreparedV1;
  assertScientificEvidenceP5ClaimDossierFinalPreparedV1(prepared);
  return prepared;
}

async function readAcceptance(
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1,
): Promise<ScientificEvidenceP5ClaimDossierFinalAcceptanceV1> {
  const acceptance = JSON.parse(
    await fs.readFile(ACCEPTANCE_PATH, 'utf8'),
  ) as ScientificEvidenceP5ClaimDossierFinalAcceptanceV1;
  assertScientificEvidenceP5ClaimDossierFinalAcceptanceV1({ prepared, acceptance });
  return acceptance;
}

function attemptBinding(
  prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.acceptance_package.acceptance_attempt_id,
    package_hash: prepared.acceptance_package.package_hash,
  };
}

function parseMode(args: string[]): RunnerMode {
  if (args.length !== 2 || args[0] !== '--mode') {
    throw new Error('Usage: run-scientific-evidence-p5-claim-dossier-final-acceptance.ts --mode offline-preflight|execute');
  }
  if (args[1] === 'offline-preflight' || args[1] === 'execute') return args[1];
  throw new Error(`Unsupported mode: ${args[1] ?? ''}`);
}

function assertNoProviderCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_STS_ISSUED_AT',
  ]) assert.equal(process.env[key], undefined, `${key} must be absent`);
  assert.ok(
    process.env.OPENAI_API_KEY === undefined || process.env.OPENAI_API_KEY === '',
    'OPENAI_API_KEY must contain no credential material',
  );
}

function assertAllCapabilitiesDisabled(): void {
  for (const key of CAPABILITIES) assert.notEqual(process.env[key], 'true', `${key} must be disabled`);
}

function requireEnvironment(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

async function fileHash(filePath: string): Promise<string> {
  return `sha256:${createHash('sha256').update(await fs.readFile(filePath)).digest('hex')}`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function publishExclusiveJson(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.link(temporaryPath, filePath);
    const directory = await fs.open(path.dirname(filePath), 'r');
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } finally {
    await handle?.close().catch(() => undefined);
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

function writeOutput(output: unknown): void {
  process.stdout.write(`${canonicalizeExperimentV2Json(output)}\n`);
}

await main();
