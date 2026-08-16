#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-cycle-readiness-v2-repository.js';
import {
  PrismaPaperImplementationRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-repository.js';
import {
  PrismaPaperImplementationRuntimeRepository,
} from '../src/repositories/prisma/prisma-paper-implementation-runtime-repository.js';
import {
  PrismaPaperImplementationValidationCycleClosureV2Repository,
} from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  PaperImplementationCycleReadinessV2Service,
} from '../src/services/paper-implementation-cycle-readiness-v2-service.js';
import {
  PaperImplementationResultAnalysisRuntimeService,
} from '../src/services/paper-implementation-result-analysis-runtime-service.js';
import {
  PaperImplementationRuntimeAdmissionService,
} from '../src/services/paper-implementation-runtime-admission-service.js';
import {
  PaperImplementationScientificClosureContextService,
} from '../src/services/paper-implementation-scientific-closure-context-service.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5PreparedAuthorizationV3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from '../src/services/scientific-evidence-p5-authorization-service.js';
import {
  assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  assertScientificEvidenceP5ResultAnalysisRecoveryWindow,
  type ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1,
  type ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
} from '../src/services/scientific-evidence-p5-result-analysis-recovery-service.js';
import {
  TopicSelectionAgentOrchestratorService,
} from '../src/services/topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from '../src/services/topic-selection-model-profile-registry-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';

type RunnerMode = 'offline-preflight' | 'execute';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MANIFEST_DIRECTORY = path.join(REPO_ROOT, 'workloads/scifact-recall-p5/manifests');
const PREPARED_PATH = path.join(
  MANIFEST_DIRECTORY,
  'prepared-result-analysis-recovery-v1.json',
);
const ACCEPTANCE_PATH = path.join(
  MANIFEST_DIRECTORY,
  'authorization-acceptance-result-analysis-recovery-v1.json',
);
const SOURCE_PREPARED_PATH = path.join(MANIFEST_DIRECTORY, 'prepared-authorization-v19.json');
const SOURCE_TERMINAL_PATH = path.join(
  MANIFEST_DIRECTORY,
  'credential-attempt-terminal-t136-p5-scifact-attempt-17.json',
);
const RECOVERY_ROOT = '/Users/yurui/Desktop/My-Researcher-Recovery/T-136';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const CLOSURE_CAPABILITY = 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED';
const PAI_CAPABILITIES = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
] as const;

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readPrepared();
  if (mode === 'execute') {
    const acceptance = await readAcceptance(prepared);
    assertScientificEvidenceP5ResultAnalysisRecoveryWindow(prepared.recovery_package);
    assert.equal(
      process.env[prepared.recovery_package.instrumentation.environment_key],
      prepared.recovery_package.instrumentation.required_environment_value,
      'T136_P5_RESULT_ANALYSIS_RECOVERY_DEBUG_BINDING_MISSING',
    );
    const output = await runScientificEvidenceP5ClaimedStageV1({
      manifest_directory: MANIFEST_DIRECTORY,
      binding: attemptBinding(prepared),
      stage: 'result_analysis_recovery',
      operation: async () => runWindow(mode, prepared, acceptance),
    });
    writeOutput(output);
    return;
  }
  writeOutput(await runWindow(mode, prepared, null));
}

async function runWindow(
  mode: RunnerMode,
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  acceptance: ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1 | null,
): Promise<Record<string, unknown>> {
  const recoveryPackage = prepared.recovery_package;
  assertNoAlibabaCredentialMaterial();
  assertAllCapabilitiesDisabled();
  await assertBoundFiles(prepared);
  assertCurrentModelBinding(prepared);
  const databaseUrl = requireEnvironment('DATABASE_URL');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_RESULT_ANALYSIS_RECOVERY_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const before = await readAuthorityState(prisma, prepared);
    if (mode === 'offline-preflight') {
      return {
        schema_version: 'ScientificEvidenceP5ResultAnalysisRecoveryOfflinePreflight@v1',
        status: 'passed_awaiting_exact_authorization',
        recovery_attempt_id: recoveryPackage.recovery_attempt_id,
        package_hash: recoveryPackage.package_hash,
        target_fingerprint: target.fingerprint,
        current: before.counts,
        evidence_binding_verified: true,
        instrumentation_binding_verified: true,
        executor_binding_verified: true,
        acceptance_present: await fileExists(ACCEPTANCE_PATH),
        external_call_count: 0,
        database_write_count: 0,
        create_job_call_count: 0,
        capability_change_count: 0,
      };
    }

    assert.ok(acceptance);
    assert.ok(process.env.OPENAI_API_KEY?.trim(), 'T136_P5_OPENAI_API_KEY_MISSING');
    const closureRepository =
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
    const runtime = new PaperImplementationResultAnalysisRuntimeService({
      projectRepository: new PrismaPaperImplementationRepository(prisma),
      runtimeAdmission: new PaperImplementationRuntimeAdmissionService({
        repository: new PrismaPaperImplementationRuntimeRepository(prisma),
      }),
      agentOrchestrator: new TopicSelectionAgentOrchestratorService(),
      scientificClosureContextResolver:
        new PaperImplementationScientificClosureContextService(closureRepository),
    });
    const request = recoveryPackage.runtime_request;
    const authority = recoveryPackage.authority;
    const runtimeResult = await runtime.runInterpretationScenarios(
      authority.implementation_project_id,
      {
        run_id: request.runtime_run_id,
        run_mode: request.run_mode,
        execution_mode: request.execution_mode,
        model_profile_id: request.model_profile_id,
        model_option_id: request.model_option_id,
        target_ref: ref(
          'validation_cycle',
          authority.validation_cycle_id,
          authority.title_card_id,
        ),
        target_version_id: request.target_version_id,
        input_snapshot_ref: ref(
          'implementation_input_snapshot',
          request.input_snapshot_ref_id,
          authority.title_card_id,
        ),
        input_snapshot_hash: runtimeHash(request.input_snapshot_hash),
        source_refs: [
          ref(
            'result_interpretation_packet',
            request.result_interpretation_packet_ref_id,
            authority.title_card_id,
          ),
          ref('trace_manifest', request.trace_manifest_ref_id, authority.title_card_id),
        ],
        source_hashes: request.source_hashes.map(runtimeHash),
        scientific_closure_intent: {
          schema_version: 'PaperImplementationScientificClosureIntent@v1',
          expected_closure_watermark_hash: authority.closure_watermark_hash,
        },
      },
    );
    assert.ok(
      runtimeResult.provider_call_count <= request.max_provider_call_count,
      'T136_P5_RESULT_ANALYSIS_RECOVERY_PROVIDER_CALL_BOUND_EXCEEDED',
    );
    const after = await readAuthorityState(prisma, prepared, { allowRuntimeEffects: true });
    assert.equal(after.counts.closures, 0);
    assert.equal(after.counts.packets, 0);
    if (runtimeResult.status !== 'passed') {
      throw new Error('T136_P5_RESULT_ANALYSIS_RECOVERY_RUNTIME_NOT_PASSED');
    }
    assert.ok(runtimeResult.final_runtime_artifact);
    assert.ok(runtimeResult.final_admission_record);
    assert.equal(runtimeResult.final_admission_record.admission_status, 'admitted');
    assert.equal(after.counts.runtimeArtifacts, 2);
    assert.equal(after.counts.runtimeAdmissions, 2);
    return {
      schema_version: 'ScientificEvidenceP5ResultAnalysisRecoveryResult@v1',
      status: 'result_analysis_passed_stopped_before_closure',
      recovery_attempt_id: recoveryPackage.recovery_attempt_id,
      package_hash: recoveryPackage.package_hash,
      runtime_run_id: request.runtime_run_id,
      provider_call_count: runtimeResult.provider_call_count,
      runtime_artifact_count: after.counts.runtimeArtifacts,
      runtime_admission_count: after.counts.runtimeAdmissions,
      final_artifact_id: runtimeResult.final_runtime_artifact.runtime_artifact_id,
      final_artifact_hash: runtimeResult.final_runtime_artifact.final_artifact_hash,
      closure_write_count: 0,
      packet_write_count: 0,
      create_job_call_count: 0,
      alibaba_cloud_call_count: 0,
      persistent_capability_change_count: 0,
    };
  } finally {
    await prisma.$disconnect();
    assertAllCapabilitiesDisabled();
  }
}

async function readAuthorityState(
  prisma: PrismaClient,
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
  options: { allowRuntimeEffects?: boolean } = {},
) {
  const authority = prepared.recovery_package.authority;
  const readiness = await new PaperImplementationCycleReadinessV2Service({
    repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
  }).evaluate(authority.validation_cycle_id);
  assert.equal(readiness.status, 'ready_with_evidence');
  assert.equal(readiness.watermark.expected_cycle_version, authority.expected_cycle_version);
  assert.equal(readiness.watermark.closure_input_hash, authority.closure_watermark_hash);
  assert.equal(readiness.watermark.active_real_attempt_count, 0);

  const [results, validationReport, runEvidenceUnit, runtimeArtifacts, runtimeAdmissions, closures, packets] =
    await Promise.all([
      prisma.experimentFoundationExperimentResultV2.findMany({
        where: { runId: authority.run_id },
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
        where: { runId: authority.run_id },
        select: { id: true, validationHash: true, status: true, runManifestHash: true },
      }),
      prisma.paperImplementationRunEvidenceUnitV2.findUnique({
        where: { runId: authority.run_id },
        include: { traceManifest: true },
      }),
      prisma.paperImplementationRuntimeArtifact.count({
        where: {
          implementationProjectId: authority.implementation_project_id,
          slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
          targetRefId: authority.validation_cycle_id,
        },
      }),
      prisma.paperImplementationRuntimeAdmissionRecord.count({
        where: {
          implementationProjectId: authority.implementation_project_id,
          slotId: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
          targetRefId: authority.validation_cycle_id,
        },
      }),
      prisma.paperImplementationValidationCycleClosureV2.count({
        where: { validationCycleId: authority.validation_cycle_id },
      }),
      prisma.paperImplementationResultInterpretationPacket.count({
        where: { validationCycleId: authority.validation_cycle_id },
      }),
    ]);
  assert.ok(validationReport);
  assert.ok(runEvidenceUnit?.traceManifest);
  const orderedResults = [...results].sort(
    (left, right) => left.runCell.ordinal - right.runCell.ordinal,
  );
  assert.deepEqual(orderedResults.map((result, index) => ({
    ordinal: index + 1,
    id: result.id,
    content_hash: result.contentHash,
    run_cell_id: result.runCellId,
    cell_key: result.cellKey,
  })), authority.scientific_results);
  assert.equal(orderedResults.every((result) => (
    result.runManifestHash === authority.run_manifest_hash
  )), true);
  assert.deepEqual({
    id: validationReport.id,
    content_hash: validationReport.validationHash,
    status: validationReport.status,
  }, authority.validation_report);
  assert.equal(validationReport.runManifestHash, authority.run_manifest_hash);
  assert.deepEqual({
    id: runEvidenceUnit.id,
    content_hash: runEvidenceUnit.contentHash,
  }, authority.run_evidence_unit);
  assert.equal(runEvidenceUnit.runManifestHash, authority.run_manifest_hash);
  assert.deepEqual({
    id: runEvidenceUnit.traceManifest.id,
    content_hash: runEvidenceUnit.traceManifest.contentHash,
  }, authority.trace_manifest);
  const counts = { runtimeArtifacts, runtimeAdmissions, closures, packets };
  if (!options.allowRuntimeEffects) {
    assert.deepEqual({
      runtime_artifacts: runtimeArtifacts,
      runtime_admissions: runtimeAdmissions,
      closures,
      packets,
    }, authority.current_effects);
  }
  return { counts };
}

async function assertBoundFiles(
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
): Promise<void> {
  const recoveryPackage = prepared.recovery_package;
  const sourcePrepared = JSON.parse(
    await fs.readFile(SOURCE_PREPARED_PATH, 'utf8'),
  ) as ScientificEvidenceP5PreparedAuthorizationV3;
  assertScientificEvidenceP5PreparedAuthorizationV3(sourcePrepared);
  assert.equal(
    sourcePrepared.execution_package.package_hash,
    recoveryPackage.source_execution.package_hash,
  );
  assert.equal(
    await sha256File(SOURCE_TERMINAL_PATH),
    recoveryPackage.source_execution.terminal_record_sha256,
  );
  for (const source of recoveryPackage.instrumentation.source_files) {
    assert.equal(await sha256File(path.join(REPO_ROOT, source.path)), source.sha256);
  }
  assert.equal(
    await sha256File(path.join(REPO_ROOT, recoveryPackage.executor.path)),
    recoveryPackage.executor.sha256,
  );
  const recoveryManifestPath = path.join(
    RECOVERY_ROOT,
    recoveryPackage.recovery_point.manifest_ref,
  );
  const recoveryPoint = JSON.parse(await fs.readFile(recoveryManifestPath, 'utf8')) as {
    created_at: string;
    target_fingerprint: string;
    recovery_fingerprint: string;
    schema_dump: { file: string; sha256: string };
    authority_data_dump: { file: string; sha256: string; table_data_entries: number };
  };
  assert.equal(recoveryPoint.created_at, recoveryPackage.recovery_point.created_at);
  assert.equal(recoveryPoint.target_fingerprint, recoveryPackage.recovery_point.target_fingerprint);
  assert.equal(recoveryPoint.recovery_fingerprint, recoveryPackage.recovery_point.recovery_fingerprint);
  assert.equal(recoveryPoint.schema_dump.sha256, recoveryPackage.recovery_point.schema_dump_sha256);
  assert.equal(
    recoveryPoint.authority_data_dump.sha256,
    recoveryPackage.recovery_point.authority_data_dump_sha256,
  );
  assert.equal(recoveryPoint.authority_data_dump.table_data_entries, 114);
  const recoveryDirectory = path.dirname(recoveryManifestPath);
  assert.equal(
    await sha256File(path.join(recoveryDirectory, recoveryPoint.schema_dump.file)),
    recoveryPoint.schema_dump.sha256,
  );
  assert.equal(
    await sha256File(path.join(recoveryDirectory, recoveryPoint.authority_data_dump.file)),
    recoveryPoint.authority_data_dump.sha256,
  );
}

function assertCurrentModelBinding(
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
): void {
  const request = prepared.recovery_package.runtime_request;
  const resolved = new TopicSelectionModelProfileRegistryService().resolveProfile({
    profile_id: request.model_profile_id,
    execution_mode: request.execution_mode,
    run_mode: request.run_mode,
    model_option_id: request.model_option_id,
  });
  const option = resolved.selected_model_option;
  assert.ok(option, 'T136_P5_RESULT_ANALYSIS_RECOVERY_MODEL_OPTION_MISSING');
  assert.equal(option.option_id, request.model_option_id);
  assert.equal(option.provider_id, request.provider_id);
  assert.equal(option.model_id, request.model_id);
  assert.equal(prefixedHash(resolved.profile_hash), request.model_profile_hash);
  assert.ok(resolved.normalized_params_hash);
  assert.equal(prefixedHash(resolved.normalized_params_hash), request.normalized_params_hash);
}

async function readPrepared(): Promise<ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1> {
  const parsed = JSON.parse(await fs.readFile(PREPARED_PATH, 'utf8')) as
    ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1;
  assertScientificEvidenceP5ResultAnalysisRecoveryPreparedV1(parsed);
  return parsed;
}

async function readAcceptance(
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
): Promise<ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1> {
  const parsed = JSON.parse(await fs.readFile(ACCEPTANCE_PATH, 'utf8')) as
    ScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1;
  assertScientificEvidenceP5ResultAnalysisRecoveryAcceptanceV1({ prepared, acceptance: parsed });
  return parsed;
}

function attemptBinding(
  prepared: ScientificEvidenceP5ResultAnalysisRecoveryPreparedV1,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.recovery_package.recovery_attempt_id,
    package_hash: prepared.recovery_package.package_hash,
  };
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: 'v1',
  };
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
    assert.equal(process.env[key], undefined, `${key} must be absent from recovery execution.`);
  }
}

function assertAllCapabilitiesDisabled(): void {
  for (const key of [...PAI_CAPABILITIES, CLOSURE_CAPABILITY]) {
    const value = process.env[key]?.trim().toLowerCase();
    assert.ok(
      value === undefined || value === '' || value === 'false' || value === '0',
      `${key} must remain disabled during ResultAnalysis recovery.`,
    );
  }
}

function parseMode(args: string[]): RunnerMode {
  const index = args.indexOf('--mode');
  const mode = index >= 0 ? args[index + 1] : undefined;
  if (mode === 'offline-preflight' || mode === 'execute') return mode;
  throw new Error('Usage: --mode offline-preflight|execute');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function sha256File(filePath: string): Promise<string> {
  return `sha256:${createHash('sha256').update(await fs.readFile(filePath)).digest('hex')}`;
}

function prefixedHash(value: string): string {
  assert.match(value, /^[a-f0-9]{64}$/);
  return `sha256:${value}`;
}

function runtimeHash(value: string): string {
  assert.match(value, /^sha256:[a-f0-9]{64}$/);
  return value.slice('sha256:'.length);
}

function requireEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function writeOutput(output: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5ResultAnalysisRecoveryFailure@v1',
    status: 'failed',
    reason: scientificEvidenceP5TerminalReasonCode(
      error,
      'T136_P5_RESULT_ANALYSIS_RECOVERY_FAILED',
    ),
  })}\n`);
  process.exitCode = 1;
});
