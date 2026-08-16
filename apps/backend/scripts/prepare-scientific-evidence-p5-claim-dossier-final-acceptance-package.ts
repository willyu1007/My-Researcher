#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5ClaimDossierFinalPreparedV1,
  buildScientificEvidenceP5ClaimDossierFinalPackageV1,
  exactScientificEvidenceP5ClaimDossierFinalEffectsV1,
  preflightScientificEvidenceP5ClaimDossierFinalPackageV1,
  scientificEvidenceP5ClaimDossierFinalRecordHashesV1,
  type ScientificEvidenceP5ClaimDossierFinalPackageContentV1,
  type ScientificEvidenceP5ClaimDossierFinalPreparedV1,
} from '../src/services/scientific-evidence-p5-claim-dossier-final-acceptance-service.js';
import {
  assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1,
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
  type ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1,
  type ScientificEvidenceP5PacketOnlyRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-packet-only-recovery-service.js';
import {
  FINAL_ACCEPTANCE_ATTEMPT_ID,
  FINAL_ACCEPTANCE_PROJECT_ID,
  FINAL_ACCEPTANCE_TITLE_CARD_ID,
  FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
  assembleScientificEvidenceP5ClaimDossierFinalReadOnlyV1,
  assertScientificEvidenceP5ClaimDossierExpectedRecordsV1,
  buildScientificEvidenceP5ClaimDossierFinalPlanV1,
  readScientificEvidenceP5ClaimDossierAuthorityV1,
} from './scientific-evidence-p5-claim-dossier-final-runtime.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const OUTPUT_PATH = path.join(
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
const ATTEMPT_CLAIM_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-claim-dossier-final-acceptance-1-claim_dossier_final_acceptance-claim.json',
);
const ATTEMPT_COMPLETION_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-t136-p5-claim-dossier-final-acceptance-1-claim_dossier_final_acceptance-completion.json',
);
const ATTEMPT_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-claim-dossier-final-acceptance-1.json',
);
const RECOVERY_MANIFEST_PATH =
  '/Users/yurui/Desktop/My-Researcher-Recovery/T-136/claim-dossier-final-acceptance-20260816-1125/t136-p5-claim-dossier-final-acceptance-point.json';
const EXECUTOR_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/scripts/run-scientific-evidence-p5-claim-dossier-final-acceptance.ts',
);
const SOURCE_BINDING_PATHS = [
  'apps/backend/src/repositories/paper-implementation-result-claim-dossier.repository.ts',
  'apps/backend/src/repositories/paper-implementation-trace.repository.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-trace-repository.ts',
  'apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts',
  'apps/backend/src/services/paper-implementation-result-packet-v2-materializer.ts',
  'apps/backend/src/services/paper-implementation-trace-kernel-service.ts',
  'apps/backend/src/services/scientific-evidence-p5-attempt-terminal-service.ts',
  'apps/backend/src/services/scientific-evidence-p5-claim-dossier-final-acceptance-service.ts',
  'apps/backend/scripts/scientific-evidence-p5-claim-dossier-final-runtime.ts',
] as const;
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const PREDECESSOR_PACKAGE_HASH =
  'sha256:a77279e3f6878648fe8d929fa5730c7c77fc6509d1939500dce4dd266f420e69';
const PREDECESSOR_PREPARED_SHA256 =
  'sha256:5ba6f8dc4f75a74dd4bb8b025c78fbf70184b59c7a2a8060c54eecc5a3b407f8';
const PREDECESSOR_ACCEPTANCE_SHA256 =
  'sha256:2c36253ba3c18e3e472dbd92219ed66c1ef058c27a0619a1440de95bc673311b';
const PREDECESSOR_CLAIM_SHA256 =
  'sha256:80b9eed542ec81339d220a9ef03b5b2eb1de0ed715e4f0d54b54d0504bea13c9';
const PREDECESSOR_COMPLETION_SHA256 =
  'sha256:b34b3b1357612c419b8d0a465c5b4365904e84a5943b1aeb6627f9ce4f144456';
const CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;

interface RecoveryPointManifest {
  schema: 'ScientificEvidenceP5ClaimDossierFinalAcceptancePoint@v1';
  created_at: string;
  target_fingerprint: string;
  restore_order: ['schema_pre_data', 'authority_data', 'schema_post_data'];
  schema_dump: {
    file: string;
    sha256: string;
    byte_size: number;
    selected_toc_entries: number;
  };
  authority_data_dump: {
    file: string;
    sha256: string;
    byte_size: number;
    table_data_entries: number;
  };
  recovery_fingerprint: string;
}

async function main(): Promise<void> {
  const writeManifest = parseOptions(process.argv.slice(2));
  assertNoProviderCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertPreparationArtifactsAbsent();
  const predecessor = await readPredecessor();
  const recoveryPoint = await readRecoveryPoint();
  const preparedAt = await resolvePreparedAt(writeManifest);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_CLAIM_DOSSIER_FINAL_TARGET_MISMATCH',
  );
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const authority = await readScientificEvidenceP5ClaimDossierAuthorityV1(prisma);
    const plan = buildScientificEvidenceP5ClaimDossierFinalPlanV1({
      authority,
      created_at: preparedAt,
    });
    const expectedRecords = await assembleScientificEvidenceP5ClaimDossierFinalReadOnlyV1({
      prisma,
      plan,
    });
    const expectedRecordHashes = scientificEvidenceP5ClaimDossierFinalRecordHashesV1(
      expectedRecords,
    );
    assertScientificEvidenceP5ClaimDossierExpectedRecordsV1({
      records: expectedRecords,
      expected: expectedRecordHashes,
    });
    const authorizationNotAfter = new Date(Date.parse(preparedAt) + 6 * 60 * 60 * 1_000)
      .toISOString();
    const executeNotAfter = new Date(Date.parse(authorizationNotAfter) + 30 * 60 * 1_000)
      .toISOString();
    const content: ScientificEvidenceP5ClaimDossierFinalPackageContentV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PACKAGE_SCHEMA_V1,
      acceptance_attempt_id: FINAL_ACCEPTANCE_ATTEMPT_ID,
      predecessor: {
        packet_recovery_attempt_id: predecessor.prepared.recovery_package.recovery_attempt_id,
        package_hash: PREDECESSOR_PACKAGE_HASH,
        prepared_record_sha256: PREDECESSOR_PREPARED_SHA256,
        acceptance_record_sha256: PREDECESSOR_ACCEPTANCE_SHA256,
        claim_record_sha256: PREDECESSOR_CLAIM_SHA256,
        completion_record_sha256: PREDECESSOR_COMPLETION_SHA256,
        terminal_absent: true,
      },
      authority: {
        target_fingerprint: TARGET.fingerprint,
        implementation_project_id: FINAL_ACCEPTANCE_PROJECT_ID,
        title_card_id: FINAL_ACCEPTANCE_TITLE_CARD_ID,
        validation_cycle_id: FINAL_ACCEPTANCE_VALIDATION_CYCLE_ID,
        packet: {
          result_interpretation_packet_id: authority.packet.result_interpretation_packet_id,
          packet_content_hash: authority.packet.packet_content_hash,
          trace_manifest_id: authority.packet.trace_manifest_id,
          interpretation_gate_status: 'passed',
          allowed_claim_ceiling: 'moderate',
          created_at: authority.packet.created_at,
        },
        closure: authority.closure,
        run_evidence_unit: authority.run_evidence_unit,
        literature_evidence: authority.literature_evidence,
        scientific_chain_counts: {
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
        },
        final_plan: plan,
        expected_record_hashes: expectedRecordHashes,
      },
      executor: {
        mode: 'claim_dossier_final_acceptance',
        path: relativePath(EXECUTOR_SOURCE_PATH),
        sha256: await fileHash(EXECUTOR_SOURCE_PATH),
      },
      source_binding: {
        source_files: await Promise.all(SOURCE_BINDING_PATHS.map(async (sourcePath) => ({
          path: sourcePath,
          sha256: await fileHash(path.join(REPO_ROOT, sourcePath)),
        }))),
      },
      recovery_point: {
        manifest_ref: RECOVERY_MANIFEST_PATH,
        created_at: recoveryPoint.created_at,
        target_fingerprint: recoveryPoint.target_fingerprint,
        recovery_fingerprint: recoveryPoint.recovery_fingerprint,
        schema_dump_sha256: recoveryPoint.schema_dump.sha256,
        authority_data_dump_sha256: recoveryPoint.authority_data_dump.sha256,
        authority_table_count: 114,
      },
      authorized_effects: exactScientificEvidenceP5ClaimDossierFinalEffectsV1(),
      operational_window: {
        prepared_at: preparedAt,
        authorization_not_after: authorizationNotAfter,
        execute_not_after: executeNotAfter,
      },
    };
    const acceptancePackage = buildScientificEvidenceP5ClaimDossierFinalPackageV1(content);
    const eligibility = preflightScientificEvidenceP5ClaimDossierFinalPackageV1(acceptancePackage);
    assert.equal(eligibility.status, 'eligible');
    const prepared: ScientificEvidenceP5ClaimDossierFinalPreparedV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_CLAIM_DOSSIER_FINAL_PREPARED_SCHEMA_V1,
      status: 'eligible',
      acceptance_package: acceptancePackage,
      eligibility,
      preparation_effect_census: {
        database_writes: 0,
        external_calls: 0,
        create_job_calls: 0,
        capability_changes: 0,
        provider_credentials_read: 0,
      },
    };
    assertScientificEvidenceP5ClaimDossierFinalPreparedV1(prepared);
    const serialized = `${JSON.stringify(prepared, null, 2)}\n`;
    if (writeManifest) await writeFirst(OUTPUT_PATH, serialized);
    process.stdout.write(serialized);
  } finally {
    await prisma.$disconnect();
  }
}

async function readPredecessor(): Promise<{
  prepared: ScientificEvidenceP5PacketOnlyRecoveryPreparedV1;
  acceptance: ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1;
}> {
  assert.equal(await fileHash(PREDECESSOR_PREPARED_PATH), PREDECESSOR_PREPARED_SHA256);
  assert.equal(await fileHash(PREDECESSOR_ACCEPTANCE_PATH), PREDECESSOR_ACCEPTANCE_SHA256);
  assert.equal(await fileHash(PREDECESSOR_CLAIM_PATH), PREDECESSOR_CLAIM_SHA256);
  assert.equal(await fileHash(PREDECESSOR_COMPLETION_PATH), PREDECESSOR_COMPLETION_SHA256);
  assert.equal(await fileExists(PREDECESSOR_TERMINAL_PATH), false);
  const prepared = await readJson<ScientificEvidenceP5PacketOnlyRecoveryPreparedV1>(
    PREDECESSOR_PREPARED_PATH,
  );
  const acceptance = await readJson<ScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1>(
    PREDECESSOR_ACCEPTANCE_PATH,
  );
  assertScientificEvidenceP5PacketOnlyRecoveryPreparedV1(prepared);
  assertScientificEvidenceP5PacketOnlyRecoveryAcceptanceV1({ prepared, acceptance });
  assert.equal(prepared.recovery_package.package_hash, PREDECESSOR_PACKAGE_HASH);
  return { prepared, acceptance };
}

async function readRecoveryPoint(): Promise<RecoveryPointManifest> {
  const recovery = await readJson<RecoveryPointManifest>(RECOVERY_MANIFEST_PATH);
  assert.equal(recovery.schema, 'ScientificEvidenceP5ClaimDossierFinalAcceptancePoint@v1');
  assert.equal(recovery.target_fingerprint, TARGET.fingerprint);
  assert.deepEqual(recovery.restore_order, ['schema_pre_data', 'authority_data', 'schema_post_data']);
  assert.equal(recovery.schema_dump.selected_toc_entries, 2046);
  assert.equal(recovery.authority_data_dump.table_data_entries, 114);
  const directory = path.dirname(RECOVERY_MANIFEST_PATH);
  for (const artifact of [recovery.schema_dump, recovery.authority_data_dump]) {
    const artifactPath = path.join(directory, artifact.file);
    assert.equal(await fileHash(artifactPath), artifact.sha256);
    assert.equal((await fs.stat(artifactPath)).size, artifact.byte_size);
  }
  return recovery;
}

async function assertPreparationArtifactsAbsent(): Promise<void> {
  for (const filePath of [
    ACCEPTANCE_PATH,
    ATTEMPT_CLAIM_PATH,
    ATTEMPT_COMPLETION_PATH,
    ATTEMPT_TERMINAL_PATH,
    M0_SCI_ACCEPTANCE_PATH,
  ]) assert.equal(await fileExists(filePath), false, `${path.basename(filePath)} must be absent`);
}

async function resolvePreparedAt(writeManifest: boolean): Promise<string> {
  if (writeManifest) {
    assert.equal(await fileExists(OUTPUT_PATH), false, 'prepared final-acceptance package already exists');
    return new Date().toISOString();
  }
  const prepared = await readJson<ScientificEvidenceP5ClaimDossierFinalPreparedV1>(OUTPUT_PATH);
  assertScientificEvidenceP5ClaimDossierFinalPreparedV1(prepared);
  return prepared.acceptance_package.operational_window.prepared_at;
}

function parseOptions(args: string[]): boolean {
  if (args.length === 1 && args[0] === '--write') return true;
  if (args.length === 1 && args[0] === '--no-write') return false;
  throw new Error('Usage: prepare-scientific-evidence-p5-claim-dossier-final-acceptance-package.ts --write|--no-write');
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function writeFirst(filePath: string, serialized: string): Promise<void> {
  const handle = await fs.open(filePath, 'wx', 0o600);
  try {
    await handle.writeFile(serialized, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function relativePath(filePath: string): string {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
}

await main();
