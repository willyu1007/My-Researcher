#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  assertScientificEvidenceP5PreparedAuthorizationV3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from '../src/services/scientific-evidence-p5-authorization-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1,
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
  exactScientificEvidenceP5ResultAnalysisRecoveryEffectsV1,
  preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-result-analysis-recovery-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from '../src/services/topic-selection-model-profile-registry-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const SOURCE_PREPARED_PATH = path.join(MANIFEST_DIRECTORY, 'prepared-authorization-v19.json');
const SOURCE_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-scifact-attempt-17.json',
);
const OUTPUT_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-result-analysis-recovery-v1.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const RECOVERY_MANIFEST_PATH = path.join(
  RECOVERY_ROOT,
  'result-analysis-recovery-20260815-0920/t136-p5-result-analysis-recovery-point.json',
);
const ORCHESTRATOR_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/src/services/topic-selection-agent-orchestrator-service.ts',
);
const RUNTIME_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts',
);
const EXECUTOR_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/scripts/run-scientific-evidence-p5-result-analysis-recovery.ts',
);

const RECOVERY_ATTEMPT_ID = 't136-p5-result-analysis-recovery-3';
const SOURCE_ATTEMPT_ID = 't136-p5-scifact-attempt-17';
const SOURCE_PACKAGE_HASH =
  'sha256:0e2b3286be99947cc5a38521e5421fed286d8a4150b9da52a212b64aea75245f';
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const VALIDATION_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v4';
const RUN_ID = 'ef_run_v2_t136_p5_scifact_v4_1';
const RUN_MANIFEST_HASH =
  'sha256:72d5aa100f4663ae490946c7e7dcb3e4d36f56333dca5768625d61ce12f4a65a';
const PACKET_TRACE_ID = 'trace_manifest_t136_p5_scifact_v4_result_packet';
const PACKET_ID = 'result_interpretation_packet_t136_p5_scifact_v4';
const RUNTIME_RUN_ID = 'pi_result_analysis_runtime_t136_p5_scifact_v4_recovery_2';
const INPUT_SNAPSHOT_REF_ID = 'implementation_input_snapshot_t136_p5_scifact_v4_recovery_2';
const DEBUG_RUN_ID = 'dbg-20260815-010050-126f';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

interface RecoveryPointManifest {
  schema: 'ScientificEvidenceP5ResultAnalysisRecoveryPoint@v1';
  created_at: string;
  target_fingerprint: string;
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

interface SourceTerminalRecord {
  schema_version: 'ScientificEvidenceP5AttemptTerminal@v1';
  status: 'terminal';
  p5_attempt_id: string;
  package_hash: string;
  failed_stage: 'close';
  reason_code: 'T136_P5_CLOSE_FAILED';
  terminal_at: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  assertNoAlibabaCredentialMaterial();
  const preparedAt = await resolvePreparedAt(options.writeManifest);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_RESULT_ANALYSIS_RECOVERY_TARGET_MISMATCH',
  );

  const [sourcePreparedBytes, terminalBytes, recoveryPoint] = await Promise.all([
    fs.readFile(SOURCE_PREPARED_PATH, 'utf8'),
    fs.readFile(SOURCE_TERMINAL_PATH, 'utf8'),
    readRecoveryPoint(),
  ]);
  const sourcePrepared = JSON.parse(sourcePreparedBytes) as ScientificEvidenceP5PreparedAuthorizationV3;
  assertScientificEvidenceP5PreparedAuthorizationV3(sourcePrepared);
  assert.equal(sourcePrepared.execution_package.p5_attempt_id, SOURCE_ATTEMPT_ID);
  assert.equal(sourcePrepared.execution_package.package_hash, SOURCE_PACKAGE_HASH);
  const terminal = JSON.parse(terminalBytes) as SourceTerminalRecord;
  assertSourceTerminal(terminal);

  const resolvedProfile = new TopicSelectionModelProfileRegistryService().resolveProfile({
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: null,
  });
  const selectedOption = resolvedProfile.selected_model_option;
  assert.ok(selectedOption, 'T136_P5_RESULT_ANALYSIS_RECOVERY_MODEL_OPTION_MISSING');
  assert.equal(selectedOption.provider_id, 'openai');
  assert.equal(selectedOption.model_id, 'gpt-5.6-sol');
  const normalizedParamsHash = resolvedProfile.normalized_params_hash;
  assert.ok(normalizedParamsHash);

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const readiness = await new PaperImplementationCycleReadinessV2Service({
      repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
    }).evaluate(VALIDATION_CYCLE_ID);
    assert.equal(readiness.status, 'ready_with_evidence');
    assert.equal(readiness.eligible_run_evidence_unit_count, 1);
    assert.equal(readiness.watermark.active_real_attempt_count, 0);

    const [
      project,
      resultRows,
      validationReport,
      runEvidenceUnit,
      runtimeArtifacts,
      runtimeAdmissions,
      closures,
      packets,
    ] = await Promise.all([
      prisma.paperImplementationProject.findUnique({
        where: { id: PROJECT_ID },
        select: { titleCardId: true },
      }),
      prisma.experimentFoundationExperimentResultV2.findMany({
        where: { runId: RUN_ID },
        select: {
          id: true,
          contentHash: true,
          runCellId: true,
          cellKey: true,
          runManifestHash: true,
          runCell: { select: { ordinal: true } },
        },
      }),
      prisma.experimentFoundationScientificValidationReportV2.findUnique({
        where: { runId: RUN_ID },
        select: { id: true, validationHash: true, status: true, runManifestHash: true },
      }),
      prisma.paperImplementationRunEvidenceUnitV2.findUnique({
        where: { runId: RUN_ID },
        include: { traceManifest: true },
      }),
      prisma.paperImplementationRuntimeArtifact.count({
        where: {
          implementationProjectId: PROJECT_ID,
          slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
          targetRefId: VALIDATION_CYCLE_ID,
        },
      }),
      prisma.paperImplementationRuntimeAdmissionRecord.count({
        where: {
          implementationProjectId: PROJECT_ID,
          slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
          targetRefId: VALIDATION_CYCLE_ID,
        },
      }),
      prisma.paperImplementationValidationCycleClosureV2.count({
        where: { validationCycleId: VALIDATION_CYCLE_ID },
      }),
      prisma.paperImplementationResultInterpretationPacket.count({
        where: { validationCycleId: VALIDATION_CYCLE_ID },
      }),
    ]);
    assert.ok(project);
    const titleCardId = project.titleCardId;
    assert.ok(titleCardId);
    assert.equal(resultRows.length, 2);
    assert.ok(validationReport);
    assert.equal(validationReport.status, 'passed');
    assert.equal(validationReport.runManifestHash, RUN_MANIFEST_HASH);
    assert.ok(runEvidenceUnit?.traceManifest);
    assert.equal(runEvidenceUnit.validationReportId, validationReport.id);
    assert.equal(runEvidenceUnit.runManifestHash, RUN_MANIFEST_HASH);
    assert.deepEqual(
      { runtimeArtifacts, runtimeAdmissions, closures, packets },
      { runtimeArtifacts: 0, runtimeAdmissions: 0, closures: 0, packets: 0 },
    );

    const orderedResults = [...resultRows].sort(
      (left, right) => left.runCell.ordinal - right.runCell.ordinal,
    );
    assert.deepEqual(orderedResults.map((result) => result.runCell.ordinal), [1, 2]);
    assert.equal(orderedResults.every((result) => result.runManifestHash === RUN_MANIFEST_HASH), true);

    const authorizationNotAfter = new Date(Date.parse(preparedAt) + 6 * 60 * 60 * 1_000).toISOString();
    const executeNotAfter = new Date(Date.parse(authorizationNotAfter) + 30 * 60 * 1_000).toISOString();
    const content: ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PACKAGE_SCHEMA_V1,
      recovery_attempt_id: RECOVERY_ATTEMPT_ID,
      source_execution: {
        p5_attempt_id: SOURCE_ATTEMPT_ID,
        package_hash: SOURCE_PACKAGE_HASH,
        terminal_record_sha256: sha256(terminalBytes),
        terminal_failed_stage: terminal.failed_stage,
        terminal_reason_code: terminal.reason_code,
      },
      authority: {
        target_fingerprint: TARGET.fingerprint,
        implementation_project_id: PROJECT_ID,
        title_card_id: titleCardId,
        validation_cycle_id: VALIDATION_CYCLE_ID,
        expected_cycle_version: readiness.watermark.expected_cycle_version,
        closure_watermark_hash: readiness.watermark.closure_input_hash,
        run_id: RUN_ID,
        run_manifest_hash: RUN_MANIFEST_HASH,
        scientific_results: orderedResults.map((result, index) => ({
          ordinal: (index + 1) as 1 | 2,
          id: result.id,
          content_hash: result.contentHash,
          run_cell_id: result.runCellId,
          cell_key: result.cellKey,
        })) as ScientificEvidenceP5ResultAnalysisRecoveryPackageContentV1['authority']['scientific_results'],
        validation_report: {
          id: validationReport.id,
          content_hash: validationReport.validationHash,
          status: 'passed',
        },
        run_evidence_unit: {
          id: runEvidenceUnit.id,
          content_hash: runEvidenceUnit.contentHash,
        },
        trace_manifest: {
          id: runEvidenceUnit.traceManifest.id,
          content_hash: runEvidenceUnit.traceManifest.contentHash,
        },
        current_effects: {
          runtime_artifacts: 0,
          runtime_admissions: 0,
          closures: 0,
          packets: 0,
        },
      },
      runtime_request: {
        run_mode: 'product',
        execution_mode: 'provider_llm',
        runtime_run_id: RUNTIME_RUN_ID,
        model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
        model_option_id: selectedOption.option_id,
        model_profile_hash: prefixedHash(resolvedProfile.profile_hash),
        normalized_params_hash: prefixedHash(normalizedParamsHash),
        provider_id: 'openai',
        model_id: 'gpt-5.6-sol',
        max_provider_call_count: 2,
        target_version_id: RUN_MANIFEST_HASH,
        input_snapshot_ref_id: INPUT_SNAPSHOT_REF_ID,
        input_snapshot_hash: semanticHash('P5ResultAnalysisRecoveryInput', {
          recovery_attempt_id: RECOVERY_ATTEMPT_ID,
          source_package_hash: SOURCE_PACKAGE_HASH,
          run_id: RUN_ID,
          run_manifest_hash: RUN_MANIFEST_HASH,
          closure_watermark_hash: readiness.watermark.closure_input_hash,
        }),
        result_interpretation_packet_ref_id: PACKET_ID,
        trace_manifest_ref_id: PACKET_TRACE_ID,
        source_hashes: [
          legacySemanticHash('P5FutureResultPacket', { packet_id: PACKET_ID }),
          legacySemanticHash('P5TraceManifestRef', { trace_manifest_id: PACKET_TRACE_ID }),
        ],
      },
      executor: {
        mode: 'result_analysis_only',
        path: path.relative(REPO_ROOT, EXECUTOR_SOURCE_PATH),
        sha256: await sha256File(EXECUTOR_SOURCE_PATH),
      },
      instrumentation: {
        debug_run_id: DEBUG_RUN_ID,
        environment_key: 'T136_P5_DEBUG_RUN_ID',
        required_environment_value: DEBUG_RUN_ID,
        log_marker: `[DBG:${DEBUG_RUN_ID}]`,
        source_files: [
          {
            path: path.relative(REPO_ROOT, ORCHESTRATOR_SOURCE_PATH),
            sha256: await sha256File(ORCHESTRATOR_SOURCE_PATH),
          },
          {
            path: path.relative(REPO_ROOT, RUNTIME_SOURCE_PATH),
            sha256: await sha256File(RUNTIME_SOURCE_PATH),
          },
        ],
      },
      recovery_point: {
        manifest_ref: path.relative(RECOVERY_ROOT, RECOVERY_MANIFEST_PATH),
        created_at: recoveryPoint.created_at,
        target_fingerprint: recoveryPoint.target_fingerprint,
        recovery_fingerprint: recoveryPoint.recovery_fingerprint,
        schema_dump_sha256: recoveryPoint.schema_dump.sha256,
        authority_data_dump_sha256: recoveryPoint.authority_data_dump.sha256,
        authority_table_count: 114,
      },
      authorized_effects: exactScientificEvidenceP5ResultAnalysisRecoveryEffectsV1(),
      operational_window: {
        prepared_at: preparedAt,
        authorization_not_after: authorizationNotAfter,
        execute_not_after: executeNotAfter,
      },
    };
    const recoveryPackage = buildScientificEvidenceP5ResultAnalysisRecoveryPackageV1(content);
    const eligibility = preflightScientificEvidenceP5ResultAnalysisRecoveryPackageV1(
      recoveryPackage,
    );
    assert.equal(eligibility.status, 'eligible', eligibility.reason_codes.join(', '));
    assert.deepEqual(eligibility.reason_codes, []);
    const prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1 = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_RESULT_ANALYSIS_RECOVERY_PREPARED_SCHEMA_V1,
      status: 'eligible',
      recovery_package: recoveryPackage,
      eligibility,
      preparation_effect_census: {
        database_writes: 0,
        external_calls: 0,
        create_job_calls: 0,
        capability_changes: 0,
        provider_credentials_read: 0,
      },
    };
    assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(prepared);
    const serialized = `${JSON.stringify(prepared, null, 2)}\n`;
    if (options.writeManifest) await writeNewExactManifest(OUTPUT_PATH, serialized);
    process.stdout.write(serialized);
  } finally {
    await prisma.$disconnect();
  }
}

function parseOptions(args: string[]): { writeManifest: boolean } {
  const normalized = args[0] === '--' ? args.slice(1) : args;
  const writeManifest = normalized.includes('--write-manifest');
  if (normalized.length !== (writeManifest ? 1 : 0)) {
    throw new Error(
      'Usage: prepare-scientific-evidence-p5-result-analysis-recovery-package '
      + '[--write-manifest]',
    );
  }
  return { writeManifest };
}

async function resolvePreparedAt(writeManifest: boolean): Promise<string> {
  try {
    const existing = JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')) as
      ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1;
    assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(existing);
    return existing.recovery_package.operational_window.prepared_at;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (!writeManifest) {
      throw new Error('T136_P5_RESULT_ANALYSIS_RECOVERY_REQUIRES_FIRST_WRITE_MANIFEST');
    }
    return new Date().toISOString();
  }
}

async function readRecoveryPoint(): Promise<RecoveryPointManifest> {
  const bytes = await fs.readFile(RECOVERY_MANIFEST_PATH, 'utf8');
  const point = JSON.parse(bytes) as RecoveryPointManifest;
  assert.equal(point.schema, 'ScientificEvidenceP5ResultAnalysisRecoveryPoint@v1');
  assert.equal(point.target_fingerprint, TARGET.fingerprint);
  assert.equal(point.authority_data_dump.table_data_entries, 114);
  const directory = path.dirname(RECOVERY_MANIFEST_PATH);
  const schemaDumpPath = path.join(directory, point.schema_dump.file);
  const authorityDumpPath = path.join(directory, point.authority_data_dump.file);
  assert.equal(await sha256File(schemaDumpPath), point.schema_dump.sha256);
  assert.equal(await sha256File(authorityDumpPath), point.authority_data_dump.sha256);
  assert.equal((await fs.stat(schemaDumpPath)).size, point.schema_dump.byte_size);
  assert.equal((await fs.stat(authorityDumpPath)).size, point.authority_data_dump.byte_size);
  for (const filePath of [RECOVERY_MANIFEST_PATH, schemaDumpPath, authorityDumpPath]) {
    assert.equal((await fs.stat(filePath)).mode & 0o777, 0o600);
  }
  return point;
}

function assertSourceTerminal(terminal: SourceTerminalRecord): void {
  assert.deepEqual(Object.keys(terminal).sort(), [
    'failed_stage',
    'p5_attempt_id',
    'package_hash',
    'reason_code',
    'schema_version',
    'status',
    'terminal_at',
  ]);
  assert.equal(terminal.schema_version, 'ScientificEvidenceP5AttemptTerminal@v1');
  assert.equal(terminal.status, 'terminal');
  assert.equal(terminal.p5_attempt_id, SOURCE_ATTEMPT_ID);
  assert.equal(terminal.package_hash, SOURCE_PACKAGE_HASH);
  assert.equal(terminal.failed_stage, 'close');
  assert.equal(terminal.reason_code, 'T136_P5_CLOSE_FAILED');
  assert.equal(new Date(terminal.terminal_at).toISOString(), terminal.terminal_at);
}

async function writeNewExactManifest(filePath: string, serialized: string): Promise<void> {
  try {
    const existing = await fs.readFile(filePath, 'utf8');
    assert.equal(
      existing,
      serialized,
      'Existing ResultAnalysis recovery manifest differs from generated output.',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.writeFile(filePath, serialized, { encoding: 'utf8', flag: 'wx' });
  }
}

function assertNoAlibabaCredentialMaterial(): void {
  for (const key of [
    'ALIBABA_CLOUD_ACCESS_KEY_ID',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'ALIBABA_CLOUD_SECURITY_TOKEN',
    'ALIBABA_CLOUD_SESSION_TOKEN',
    'ALIBABA_CLOUD_STS_ISSUED_AT',
    'ALIBABA_CLOUD_STS_EXPIRATION',
    'ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID',
  ]) {
    assert.equal(process.env[key], undefined, `${key} must be absent during recovery preparation.`);
  }
}

async function sha256File(filePath: string): Promise<string> {
  return sha256(await fs.readFile(filePath));
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function semanticHash(recordKind: string, content: unknown): string {
  return sha256(canonicalizeExperimentV2Json({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }));
}

function legacySemanticHash(recordKind: string, content: Record<string, unknown>): string {
  return sha256(JSON.stringify({
    record_kind: recordKind,
    schema_version: 'v1',
    content,
  }));
}

function prefixedHash(value: string): string {
  assert.match(value, /^[a-f0-9]{64}$/);
  return `sha256:${value}`;
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5ResultAnalysisRecoveryPreparationFailure@v1',
    status: 'failed',
    reason: stableFailureCode(error),
  })}\n`);
  process.exitCode = 1;
});

function stableFailureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'T136_P5_RESULT_ANALYSIS_RECOVERY_PREPARATION_FAILED';
  return /^((?:T136_P5|P5_RA_RECOVERY)_[A-Z0-9_]+)/.exec(error.message)?.[1]
    ?? 'T136_P5_RESULT_ANALYSIS_RECOVERY_PREPARATION_FAILED';
}
