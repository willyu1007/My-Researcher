#!/usr/bin/env node

/**
 * Pack C C-cutover is a source-and-targeted-suite gate only. It deliberately
 * does not provision another disposable PostgreSQL database: the C-EF and
 * C-PI sub-gates already force the two relational lanes, and packc-final runs
 * both of those gates before accepting this cutover result. Duplicating either
 * relational lane here would add no independent PC17/PC18 evidence.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  assertSanitizedJson,
  exactPassingTapOutcome,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import { runCommand, safeCommandTail } from './lib/disposable-postgres.mjs';
import { describeEnvironmentIsolation } from './lib/hermetic-child-env.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'apps/backend');
const SHARED_ROOT = path.join(REPO_ROOT, 'packages/shared');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');

export const PACKC_CUTOVER_CHECK_REGISTRY = Object.freeze([
  {
    id: 'PC17',
    evidence_refs: [
      'packet_dossier_unit',
      'contracts_schema',
      'relay_routing_unit',
      'relay_crash_window_unit',
      'static_census',
    ],
  },
  {
    id: 'PC18',
    evidence_refs: [
      'bridge_unit',
      'closure_authority_unit',
      'contracts_schema',
      'route_integration',
      'relay_routing_unit',
      'relay_crash_window_unit',
      'static_census',
    ],
  },
]);

const EVIDENCE_KEYS = Object.freeze([
  'packet_dossier_unit',
  'bridge_unit',
  'closure_authority_unit',
  'contracts_schema',
  'route_integration',
  'relay_routing_unit',
  'relay_crash_window_unit',
  'static_census',
]);
const SUMMARY_KEYS = Object.freeze([
  'gate_id', 'status', 'started_at', 'finished_at', 'check_registry',
  'suite_totals', 'postgres_decision', 'evidence', 'zero_census',
  'redaction', 'environment_isolation', 'blockers', 'canonical_summary_sha256',
]);
const CHECK_KEYS = Object.freeze(['status', 'evidence_refs', 'details']);
const GATEWAY_EVIDENCE_REPOSITORY =
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-evidence-v2-repository.ts';

export const PACKC_CUTOVER_SEALED_COMMIT_PATHS = Object.freeze([
  {
    id: 'pi_admission',
    relative_path:
      'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts',
    function_name: 'commitAdmission',
    replay_marker: 'const replay =',
    closure_read_marker: 'await assertCycleOpen(transaction, input.branch.validation_cycle_id)',
    helper_read_marker: 'client.paperImplementationValidationCycleClosureV2.findUnique',
  },
  {
    id: 'pi_head_advance',
    relative_path:
      'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts',
    function_name: 'commitHeadAdvance',
    replay_marker: 'const existingInbox =',
    closure_read_marker: 'await assertCycleOpen(transaction, sourceEvent.validation_cycle_id)',
    helper_read_marker: 'client.paperImplementationValidationCycleClosureV2.findUnique',
  },
  {
    id: 'ef_materialization',
    relative_path:
      'apps/backend/src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.ts',
    function_name: 'commitMaterialization',
    replay_marker: 'const existing =',
    closure_read_marker: 'await assertCycleOpen(transaction, sourceEvent.validation_cycle_id)',
    helper_read_marker: 'client.paperImplementationValidationCycleClosureV2.findUnique',
  },
  {
    id: 'ef_simulation_start',
    relative_path:
      'apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.ts',
    function_name: 'startWorkflowSimulation',
    replay_marker: 'const replayRows =',
    closure_read_marker:
      'transaction.paperImplementationValidationCycleClosureV2.findUnique',
    helper_read_marker: null,
  },
]);

export const PACKC_CUTOVER_SUITE_REGISTRY = Object.freeze([
  {
    evidence_key: 'packet_dossier_unit',
    command_id: 'packet-dossier-unit',
    workspace: 'backend',
    files: [
      'src/services/paper-implementation-result-claim-dossier-service.unit.test.ts',
      'src/services/paper-implementation-runtime-domain-gate-service.unit.test.ts',
      'src/services/paper-implementation-contract-evaluation-suite.unit.test.ts',
    ],
    required_subtests: [],
  },
  {
    evidence_key: 'bridge_unit',
    command_id: 'bridge-unit',
    workspace: 'backend',
    files: [
      'src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts',
      'src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts',
    ],
    required_subtests: [],
  },
  {
    evidence_key: 'closure_authority_unit',
    command_id: 'closure-authority-unit',
    workspace: 'backend',
    files: [
      'src/services/paper-implementation-validation-cycle-planning-service.unit.test.ts',
      'src/services/paper-implementation-validation-cycle-closure-v2-service.unit.test.ts',
      'src/services/experiment-foundation-execution-v2-service.unit.test.ts',
    ],
    required_subtests: [
      'workflow simulation exact idempotency-key replay converges after Cycle closure',
    ],
  },
  {
    evidence_key: 'contracts_schema',
    command_id: 'contracts-schema',
    workspace: 'shared',
    files: [
      'src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.schema.test.ts',
      'src/research-lifecycle/paper-implementation-validation-contracts.schema.test.ts',
    ],
    required_subtests: [],
  },
  {
    evidence_key: 'route_integration',
    command_id: 'route-integration',
    workspace: 'backend',
    files: ['src/routes/paper-implementation-routes.integration.test.ts'],
    required_subtests: [],
  },
  {
    evidence_key: 'relay_routing_unit',
    command_id: 'relay-routing-unit',
    workspace: 'backend',
    files: ['src/services/experiment-v2-integration-relay-service.unit.test.ts'],
    required_subtests: [
      'relay delivers EvidenceCandidateQualified to the real trust gateway without terminalization',
      'relay durably receipts both PI projection-feed events with zero terminalization',
      'projection-feed redelivery converges to one exact inbox receipt',
    ],
  },
  {
    evidence_key: 'relay_crash_window_unit',
    command_id: 'relay-crash-window-unit',
    workspace: 'backend',
    files: ['src/services/experiment-v2-integration-spine.unit.test.ts'],
    required_subtests: [
      'PI admission exact business-key replay converges after Cycle closure',
      'EF materialization exact inbox replay converges after Cycle closure',
      'PI head-advance exact processed receipt replay converges after Cycle closure',
      'relay converges consumer-committed marker failure through closure and exact redelivery without terminalization',
    ],
  },
]);

export function parseArgs(argv) {
  let gateId = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run-id') {
      gateId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!gateId || !/^packc-cutover-\d{8}-r[1-9]\d*$/.test(gateId)) {
    throw new Error('--run-id must match packc-cutover-<YYYYMMDD>-r<N>');
  }
  return { gateId };
}

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
  ).join(',')}}`;
}

export function canonicalSummarySha256(summary) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson({
    ...summary,
    canonical_summary_sha256: null,
  })).digest('hex')}`;
}

export function buildInitialSummary(gateId, startedAt = new Date().toISOString()) {
  return {
    gate_id: gateId,
    status: 'running',
    started_at: startedAt,
    finished_at: null,
    check_registry: Object.fromEntries(PACKC_CUTOVER_CHECK_REGISTRY.map((check) => [
      check.id,
      { status: 'not_run', evidence_refs: [...check.evidence_refs], details: null },
    ])),
    suite_totals: {
      suites: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      blocked: 0,
    },
    postgres_decision: {
      required: false,
      rationale:
        'Pack C EF and PI sub-gates already force both relational lanes; cutover adds only static and targeted-suite evidence.',
      existing_database_url_used: false,
      database_connections: 0,
    },
    evidence: Object.fromEntries(EVIDENCE_KEYS.map((key) => [key, null])),
    zero_census: {
      preclosure_packet_repository_calls: 0,
      closure_event_other_producers: 0,
      dossier_project_accounting_markers: 0,
      legacy_reu_prisma_mutation_files: 0,
      v2_reu_create_files_outside_gateway_repository: 0,
      dossier_legacy_reu_point_lookups: 0,
      legacy_completion_success_writes: 0,
      caller_conclusion_write_contract_occurrences: 0,
      missing_transaction_internal_closure_reads: 0,
      missing_replay_before_closure_fences: 0,
      never_closed_defaults: 0,
      dual_read_fallback_markers: 0,
      existing_database_connections: 0,
    },
    redaction: {
      database_url_stored: false,
      database_password_stored: false,
      command_stdout_stored_in_summary: false,
      credential_values_loaded: false,
      output_tails_sanitized: true,
    },
    environment_isolation: describeEnvironmentIsolation(),
    blockers: [],
    canonical_summary_sha256: null,
  };
}

export function assertExactSummaryKeysets(summary) {
  assertExactKeys(summary, SUMMARY_KEYS, 'summary');
  assertExactKeys(summary.evidence, EVIDENCE_KEYS, 'summary.evidence');
  assertExactKeys(
    summary.check_registry,
    PACKC_CUTOVER_CHECK_REGISTRY.map((row) => row.id),
    'summary.check_registry',
  );
  for (const [id, check] of Object.entries(summary.check_registry)) {
    assertExactKeys(check, CHECK_KEYS, `summary.check_registry.${id}`);
  }
  assertExactKeys(summary.postgres_decision, [
    'required', 'rationale', 'existing_database_url_used', 'database_connections',
  ], 'summary.postgres_decision');
  assertExactKeys(summary.zero_census, [
    'preclosure_packet_repository_calls', 'closure_event_other_producers',
    'dossier_project_accounting_markers', 'legacy_reu_prisma_mutation_files',
    'v2_reu_create_files_outside_gateway_repository',
    'dossier_legacy_reu_point_lookups',
    'legacy_completion_success_writes',
    'caller_conclusion_write_contract_occurrences',
    'missing_transaction_internal_closure_reads',
    'missing_replay_before_closure_fences', 'never_closed_defaults',
    'dual_read_fallback_markers', 'existing_database_connections',
  ], 'summary.zero_census');
  assertExactKeys(summary.redaction, [
    'database_url_stored', 'database_password_stored',
    'command_stdout_stored_in_summary', 'credential_values_loaded',
    'output_tails_sanitized',
  ], 'summary.redaction');
  return summary;
}

export async function inspectStaticCensus(options = {}) {
  const readFile = options.readFile ?? fs.readFile;
  const execute = options.runCommand ?? runCommand;
  const source = (relativePath) => readFile(path.join(REPO_ROOT, relativePath), 'utf8');
  const [dossier, runtimeGate, closureService, validationContracts, dossierContracts,
    planning, routes, controller, bridge, liveAdapter, ...sealedServiceSources] = await Promise.all([
    source('apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts'),
    source('apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts'),
    source('apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts'),
    source('packages/shared/src/research-lifecycle/paper-implementation-validation-contracts.ts'),
    source('packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts'),
    source('apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts'),
    source('apps/backend/src/routes/paper-implementation-routes.ts'),
    source('apps/backend/src/controllers/paper-implementation-controller.ts'),
    source('apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts'),
    source('apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts'),
    source('apps/backend/src/services/paper-implementation-experiment-v2-admission-service.ts'),
    source('apps/backend/src/services/paper-implementation-experiment-v2-head-service.ts'),
    source('apps/backend/src/services/experiment-foundation-v2-materialization-service.ts'),
    source('apps/backend/src/services/experiment-foundation-execution-v2-service.ts'),
  ]);
  const sealedCommitSources = Object.fromEntries(await Promise.all(
    [...new Set(PACKC_CUTOVER_SEALED_COMMIT_PATHS.map((entry) => entry.relative_path))]
      .map(async (relativePath) => [relativePath, await source(relativePath)]),
  ));

  const directPacketWindow = sliceBetween(
    dossier,
    'async createResultInterpretationPacket(',
    'async listResultInterpretationPackets(',
  );
  const runtimePacketWindow = sliceBetween(
    runtimeGate,
    'async materializeFinalRuntimeArtifact(',
    'private async materializeClaimCandidate(',
  );
  const packetClosureEntrances = [directPacketWindow, runtimePacketWindow].filter((window) => (
    window.includes('RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED_REASON_CODE')
      && window.includes('throw new AppError(')
      && !window.includes('.createResultInterpretationPacket(')
  )).length;

  const packetRepositoryCalls = await grepLines(execute, [
    'rg', '-n', '\\.createResultInterpretationPacket\\(',
    'apps/backend/src/services',
    '--glob', '!*.test.ts', '--glob', '!*.unit.test.ts', '--glob', '!*.integration.test.ts',
  ]);
  const closureProducers = await grepLines(execute, [
    'rg', '-n', 'event_type:\\s*PAPER_IMPLEMENTATION_VALIDATION_CYCLE_CLOSED_EVENT_TYPE',
    'apps/backend/src',
    '--glob', '!*.test.ts', '--glob', '!*.unit.test.ts', '--glob', '!*.integration.test.ts',
  ]);
  const dossierForbidden = await grepLines(execute, [
    'rg', '-n',
    'PROJECT_ACCOUNTABLE_RUN_STATUSES|assertProjectRunEvidenceAccounting|resolveProvablyInvalidatedExclusions|supersededByNewerTrustedRun|not_superseded_excluded_run_evidence_unit_ids',
    'apps/backend/src', 'packages/shared/src',
    '--glob', '!*.test.ts', '--glob', '!*.unit.test.ts', '--glob', '!*.integration.test.ts',
  ]);
  const legacyReuPrismaMutationFiles = await grepFiles(execute, [
    'rg', '-l', '-U',
    'paperImplementationRunEvidenceUnit\\s*\\.\\s*(create|update|upsert)\\s*\\(',
    'apps/backend/src',
    '--glob', '!*.test.ts', '--glob', '!*.unit.test.ts', '--glob', '!*.integration.test.ts',
  ]);
  const v2ReuCreateFiles = await grepFiles(execute, [
    'rg', '-l', '-U',
    'paperImplementationRunEvidenceUnitV2\\s*\\.\\s*create\\s*\\(',
    'apps/backend/src',
    '--glob', '!*.test.ts', '--glob', '!*.unit.test.ts', '--glob', '!*.integration.test.ts',
  ]);
  const v2ReuCreateFilesOutsideGatewayRepository = v2ReuCreateFiles.filter(
    (file) => file !== GATEWAY_EVIDENCE_REPOSITORY,
  );
  const dossierLegacyReuPointLookups = (
    dossier.match(/findRunEvidenceUnitById\s*\(/g) ?? []
  ).length;

  const dossierSnapshotContractPassed = (
    dossierContracts.match(/closed_validation_cycle_snapshot_refs/g) ?? []
  ).length >= 4
    && dossier.includes('request.closed_validation_cycle_snapshot_refs')
    && dossier.includes('findStoredClosureByCycle(')
    && dossier.includes('stored.closure.closure_snapshot_hash !== ref.closure_snapshot_hash');

  const completionWindow = sliceBetween(
    planning,
    'async completeValidationCycle(',
    'async listValidationCycles(',
  );
  const legacyCompleteRouteCount = (
    routes.match(/validation-cycles\/:validation_cycle_id\/complete/g) ?? []
  ).length;
  const legacyCompleteDelegateCount = (
    controller.match(/validationCyclePlanning\.completeValidationCycle\(/g) ?? []
  ).length;
  const legacyCompletionSuccessWrites = (
    completionWindow.match(/await |updateValidationCycle\(|completeProductValidationCycle\(/g) ?? []
  ).length;
  const legacyCompletionClosed = completionWindow.includes('LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE')
    && completionWindow.includes('Legacy ValidationCycle completion is permanently closed')
    && legacyCompletionSuccessWrites === 0;

  const writeInterfaceWindow = sliceBetween(
    validationContracts,
    'export interface CreateValidationCycleDraftRequest',
    'export interface CreateTechnicalRouteCandidateRequest',
  );
  const writeSchemaWindow = sliceBetween(
    validationContracts,
    'export const createValidationCycleDraftRequestSchema',
    'export const validationCycleSchema',
  );
  const callerConclusionWriteContractOccurrences = (
    `${writeInterfaceWindow}\n${writeSchemaWindow}`.match(/cycle_assessment|decision_exit/g) ?? []
  ).length;
  const storedCycleAssessmentOccurrences = (
    validationContracts.match(/cycle_assessment/g) ?? []
  ).length;
  const storedDecisionExitOccurrences = (
    validationContracts.match(/decision_exit/g) ?? []
  ).length;

  const neverClosedDefaults = sealedServiceSources.reduce(
    (count, text) => count + (text.match(/NEVER_CLOSED|cycleClosureLookup\?/g) ?? []).length,
    0,
  );
  const sealedCommitPathChecks = PACKC_CUTOVER_SEALED_COMMIT_PATHS.map((entry) => {
    const repositorySource = sealedCommitSources[entry.relative_path];
    const methodSource = sliceMethod(repositorySource, entry.function_name);
    const transactionIndex = methodSource.indexOf('this.prisma.$transaction(async (transaction) =>');
    const replayIndex = methodSource.indexOf(entry.replay_marker);
    const closureReadIndex = methodSource.indexOf(entry.closure_read_marker);
    const helperReadsClosure = entry.helper_read_marker === null
      || repositorySource.includes(entry.helper_read_marker);
    return {
      id: entry.id,
      relative_path: entry.relative_path,
      function_name: entry.function_name,
      transaction_internal_closure_read: transactionIndex >= 0
        && closureReadIndex > transactionIndex
        && helperReadsClosure,
      replay_before_closure_fence: replayIndex > transactionIndex
        && closureReadIndex > replayIndex,
    };
  });
  const missingTransactionInternalClosureReads = sealedCommitPathChecks.filter(
    (entry) => !entry.transaction_internal_closure_read,
  );
  const missingReplayBeforeClosureFences = sealedCommitPathChecks.filter(
    (entry) => !entry.replay_before_closure_fence,
  );

  const dualReadFallbackMarkers = (
    `${dossier}\n${runtimeGate}\n${bridge}\n${liveAdapter}`.match(
      /findExistingRunEvidence|findOrCreateRunEvidenceTrace|loadFinalEvidenceRefs|resolveProvablyInvalidatedExclusions|supersededByNewerTrustedRun|deferred_to_cutover/g,
    ) ?? []
  ).length;

  const passed = packetClosureEntrances === 2
    && packetRepositoryCalls.length === 0
    && closureProducers.length === 1
    && closureProducers[0].includes(
      'paper-implementation-validation-cycle-closure-v2-service.ts',
    )
    && dossierForbidden.length === 0
    && dossierSnapshotContractPassed
    && legacyReuPrismaMutationFiles.length === 0
    && JSON.stringify(v2ReuCreateFiles) === JSON.stringify([GATEWAY_EVIDENCE_REPOSITORY])
    && v2ReuCreateFilesOutsideGatewayRepository.length === 0
    && dossierLegacyReuPointLookups === 0
    && legacyCompleteRouteCount === 1
    && legacyCompleteDelegateCount === 1
    && legacyCompletionClosed
    && callerConclusionWriteContractOccurrences === 0
    && storedCycleAssessmentOccurrences === 2
    && storedDecisionExitOccurrences === 2
    && neverClosedDefaults === 0
    && missingTransactionInternalClosureReads.length === 0
    && missingReplayBeforeClosureFences.length === 0
    && dualReadFallbackMarkers === 0;

  return {
    status: passed ? 'passed' : 'failed',
    packet_closure_entrance_count: packetClosureEntrances,
    preclosure_packet_repository_call_count: packetRepositoryCalls.length,
    validation_cycle_closed_producer_count: closureProducers.length,
    validation_cycle_closed_other_producer_count: Math.max(0, closureProducers.length - 1),
    dossier_project_accounting_marker_count: dossierForbidden.length,
    dossier_closed_snapshot_contract_only: dossierSnapshotContractPassed,
    legacy_reu_prisma_mutation_files: legacyReuPrismaMutationFiles,
    v2_reu_create_files: v2ReuCreateFiles,
    v2_reu_create_files_outside_gateway_repository: v2ReuCreateFilesOutsideGatewayRepository,
    dossier_legacy_reu_point_lookup_count: dossierLegacyReuPointLookups,
    legacy_complete_route_count: legacyCompleteRouteCount,
    legacy_complete_delegate_count: legacyCompleteDelegateCount,
    legacy_completion_closed_below_http: legacyCompletionClosed,
    legacy_completion_success_write_count: legacyCompletionSuccessWrites,
    caller_conclusion_write_contract_occurrences: callerConclusionWriteContractOccurrences,
    stored_cycle_assessment_occurrences: storedCycleAssessmentOccurrences,
    stored_decision_exit_occurrences: storedDecisionExitOccurrences,
    sealed_commit_path_checks: sealedCommitPathChecks,
    missing_transaction_internal_closure_read_paths:
      missingTransactionInternalClosureReads.map((entry) => entry.id),
    missing_replay_before_closure_fence_paths:
      missingReplayBeforeClosureFences.map((entry) => entry.id),
    never_closed_default_occurrences: neverClosedDefaults,
    dual_read_fallback_marker_occurrences: dualReadFallbackMarkers,
  };
}

async function grepLines(execute, argv) {
  const result = await execute(argv, { cwd: REPO_ROOT, timeoutMs: 30_000 });
  if (result.exit_code !== 0 && result.exit_code !== 1) {
    throw new Error(`Static census command failed: ${safeCommandTail(result.stderr, 2_000)}`);
  }
  return result.exit_code === 0
    ? result.stdout.trim().split('\n').filter(Boolean).sort()
    : [];
}

async function grepFiles(execute, argv) {
  return grepLines(execute, argv);
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return '';
  return source.slice(start, end);
}

function sliceMethod(source, functionName) {
  const startMarker = `  async ${functionName}(`;
  const start = source.indexOf(startMarker);
  if (start < 0) return '';
  const nextMethod = source.indexOf('\n  async ', start + startMarker.length);
  return source.slice(start, nextMethod < 0 ? source.length : nextMethod);
}

async function runTapSuite(name, cwd, files, artifactDir, requiredSubtests = []) {
  const result = await runCommand([
    'pnpm', 'exec', 'node', '--test', '--loader', 'ts-node/esm', ...files,
  ], { cwd, timeoutMs: 300_000 });
  const outcome = exactPassingTapOutcome(result);
  const unavailable = result.exit_code === null || outcome.tests === null;
  const missingRequiredSubtests = requiredSubtests.filter(
    (subtest) => !outcome.combinedOutput.includes(`# Subtest: ${subtest}`),
  );
  const evidence = {
    status: unavailable ? 'blocked'
      : outcome.executedWithoutSkip && missingRequiredSubtests.length === 0
        ? 'passed'
        : 'failed',
    command_id: name,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    tests: outcome.tests,
    passed: outcome.passed,
    failed: outcome.failed,
    skipped: outcome.skipped,
    required_subtests: [...requiredSubtests],
    missing_required_subtests: missingRequiredSubtests,
    output_sha256: `sha256:${crypto.createHash('sha256').update(outcome.combinedOutput).digest('hex')}`,
    sanitized_output_tail: safeCommandTail(outcome.combinedOutput, 4_000),
  };
  await writeJsonAtomic(path.join(artifactDir, `${name}.json`), assertSanitizedJson(evidence, name));
  return evidence;
}

function accumulateSuite(summary, evidence) {
  summary.suite_totals.suites += 1;
  if (evidence.status === 'blocked') {
    summary.suite_totals.blocked += 1;
    return;
  }
  summary.suite_totals.tests += evidence.tests ?? 0;
  summary.suite_totals.passed += evidence.passed ?? 0;
  summary.suite_totals.failed += evidence.failed ?? 0;
  summary.suite_totals.skipped += evidence.skipped ?? 0;
}

export function updateChecks(summary) {
  for (const registry of PACKC_CUTOVER_CHECK_REGISTRY) {
    const evidence = registry.evidence_refs.map((ref) => summary.evidence[ref]);
    const failed = evidence.some((item) => item?.status === 'failed');
    const blocked = evidence.some((item) => item === null || item?.status === 'blocked');
    summary.check_registry[registry.id] = {
      status: failed ? 'failed' : blocked ? 'blocked' : 'passed',
      evidence_refs: [...registry.evidence_refs],
      details: failed ? 'required cutover evidence failed'
        : blocked ? 'required cutover evidence could not execute'
          : 'all required cutover evidence passed',
    };
  }
  const statuses = Object.values(summary.check_registry).map((check) => check.status);
  summary.status = statuses.includes('failed') ? 'failed'
    : statuses.includes('blocked') ? 'blocked'
      : 'passed';
}

async function main() {
  const { gateId } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, gateId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });
  const summary = buildInitialSummary(gateId);
  try {
    for (const suite of PACKC_CUTOVER_SUITE_REGISTRY) {
      const cwd = suite.workspace === 'shared' ? SHARED_ROOT : BACKEND_ROOT;
      summary.evidence[suite.evidence_key] = await runTapSuite(
        suite.command_id,
        cwd,
        suite.files,
        artifactDir,
        suite.required_subtests,
      );
      accumulateSuite(summary, summary.evidence[suite.evidence_key]);
    }
    summary.evidence.static_census = await inspectStaticCensus();
    await writeJsonAtomic(
      path.join(artifactDir, 'static-census.json'),
      assertSanitizedJson(summary.evidence.static_census),
    );
    summary.zero_census.preclosure_packet_repository_calls =
      summary.evidence.static_census.preclosure_packet_repository_call_count;
    summary.zero_census.closure_event_other_producers =
      summary.evidence.static_census.validation_cycle_closed_other_producer_count;
    summary.zero_census.dossier_project_accounting_markers =
      summary.evidence.static_census.dossier_project_accounting_marker_count;
    summary.zero_census.legacy_reu_prisma_mutation_files =
      summary.evidence.static_census.legacy_reu_prisma_mutation_files.length;
    summary.zero_census.v2_reu_create_files_outside_gateway_repository =
      summary.evidence.static_census.v2_reu_create_files_outside_gateway_repository.length;
    summary.zero_census.dossier_legacy_reu_point_lookups =
      summary.evidence.static_census.dossier_legacy_reu_point_lookup_count;
    summary.zero_census.legacy_completion_success_writes =
      summary.evidence.static_census.legacy_completion_success_write_count;
    summary.zero_census.caller_conclusion_write_contract_occurrences =
      summary.evidence.static_census.caller_conclusion_write_contract_occurrences;
    summary.zero_census.missing_transaction_internal_closure_reads =
      summary.evidence.static_census.missing_transaction_internal_closure_read_paths.length;
    summary.zero_census.missing_replay_before_closure_fences =
      summary.evidence.static_census.missing_replay_before_closure_fence_paths.length;
    summary.zero_census.never_closed_defaults =
      summary.evidence.static_census.never_closed_default_occurrences;
    summary.zero_census.dual_read_fallback_markers =
      summary.evidence.static_census.dual_read_fallback_marker_occurrences;
  } catch (error) {
    summary.blockers.push({
      reason_code: 'PACKC_CUTOVER_GATE_EXECUTION_FAILED',
      summary: error instanceof Error ? error.message : String(error),
    });
  } finally {
    updateChecks(summary);
    if (summary.blockers.some(
      (item) => item.reason_code === 'PACKC_CUTOVER_GATE_EXECUTION_FAILED',
    )) {
      summary.status = 'failed';
    }
    summary.finished_at = new Date().toISOString();
    assertExactSummaryKeysets(summary);
    summary.canonical_summary_sha256 = canonicalSummarySha256(summary);
    assertSanitizedJson(summary, 'Pack C cutover summary');
    await writeJsonAtomic(summaryPath, summary);
  }
  process.stdout.write(`${JSON.stringify({
    gate_id: gateId,
    status: summary.status,
    summary_path: path.relative(REPO_ROOT, summaryPath),
    canonical_summary_sha256: summary.canonical_summary_sha256,
  })}\n`);
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

function assertExactKeys(value, expectedKeys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} keyset drift: expected ${expected.join(',')}; got ${actual.join(',')}`);
  }
}

export function isDirectRun(metaUrl = import.meta.url, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(argvEntry);
}

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
