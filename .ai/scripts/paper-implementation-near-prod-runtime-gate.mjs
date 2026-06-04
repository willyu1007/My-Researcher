#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUN_ID = normalizeOptionalString(process.env.PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_RUN_ID)
  ?? `t114-paper-implementation-near-prod-runtime-gate-${Date.now()}`;
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-near-prod-runtime-gate', RUN_ID);
const CHILD_TIMEOUT_MS = positiveInt(process.env.PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_TIMEOUT_MS, 1200000);
const FORCE_KILL_AFTER_MS = positiveInt(process.env.PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_FORCE_KILL_AFTER_MS, 5000);
const ENV_FILE_PATH = path.resolve(
  REPO_ROOT,
  normalizeOptionalString(process.env.PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_ENV_FILE) ?? '.env.local',
);
const ROUTE_GATE_EVIDENCE_PATH = path.join(ARTIFACT_DIR, '02-near-prod-route-gate.evidence.json');

const steps = [
  {
    id: '00-script-syntax',
    status_on_failure: 'failed',
    command: process.execPath,
    args: ['--check', '.ai/scripts/paper-implementation-near-prod-runtime-gate.mjs'],
    cwd: REPO_ROOT,
  },
  {
    id: '01-prisma-migration-status',
    status_on_failure: 'blocked',
    command: process.execPath,
    args: ['./node_modules/prisma/build/index.js', 'migrate', 'status', '--schema', 'prisma/schema.prisma'],
    cwd: REPO_ROOT,
  },
  {
    id: '02-near-prod-route-gate',
    status_on_failure: 'failed',
    command: process.execPath,
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      'src/routes/paper-implementation-near-prod-runtime-gate.integration.test.ts',
    ],
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    env: {
      BACKEND_TEST_PRESERVE_REAL_ENV: '1',
      T114_NEAR_PROD_RUNTIME_GATE: '1',
      T114_NEAR_PROD_RUNTIME_GATE_EVIDENCE_PATH: ROUTE_GATE_EVIDENCE_PATH,
      PAPER_IMPLEMENTATION_REPOSITORY: 'prisma',
      AUTO_PULL_SCHEDULER_ENABLED: 'false',
      NODE_ENV: 'test',
    },
  },
];

export function normalizeOptionalString(value) {
  const normalized = value?.trim();
  return normalized || null;
}

export function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseDotEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  const normalized = trimmed.startsWith('export ')
    ? trimmed.slice('export '.length).trimStart()
    : trimmed;
  const separatorIndex = normalized.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }
  const key = normalized.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
    return null;
  }
  let value = normalized.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

export async function loadEnvFileIfPresent(filePath) {
  const relativePath = path.relative(REPO_ROOT, filePath);
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        status: 'missing',
        path: relativePath,
        loaded_key_count: 0,
        skipped_existing_key_count: 0,
        parsed_key_count: 0,
      };
    }
    throw error;
  }

  let parsedKeyCount = 0;
  let loadedKeyCount = 0;
  let skippedExistingKeyCount = 0;
  for (const line of content.split(/\r?\n/u)) {
    const parsed = parseDotEnvLine(line);
    if (!parsed) {
      continue;
    }
    parsedKeyCount += 1;
    const [key, value] = parsed;
    if (Object.hasOwn(process.env, key)) {
      skippedExistingKeyCount += 1;
      continue;
    }
    process.env[key] = value;
    loadedKeyCount += 1;
  }
  return {
    status: 'loaded',
    path: relativePath,
    loaded_key_count: loadedKeyCount,
    skipped_existing_key_count: skippedExistingKeyCount,
    parsed_key_count: parsedKeyCount,
  };
}

export function liveProviderId() {
  return process.env.PAPER_IMPLEMENTATION_PROVIDER_CANARY_PROVIDER_ID === 'dashscope'
    ? 'dashscope'
    : 'openai';
}

export function buildPreflight() {
  const providerId = liveProviderId();
  const providerKeyName = providerId === 'dashscope' ? 'DASHSCOPE_API_KEY' : 'OPENAI_API_KEY';
  const checks = [
    {
      id: 'database_url_present',
      status: Boolean(process.env.DATABASE_URL?.trim()) ? 'passed' : 'blocked',
      detail: 'DATABASE_URL must point at a migrated Postgres database.',
    },
    {
      id: 'provider_key_present',
      status: Boolean(process.env[providerKeyName]?.trim()) ? 'passed' : 'blocked',
      provider_id: providerId,
      key_name: providerKeyName,
      detail: 'Live provider key is required; the key value is never written to the summary.',
    },
  ];
  return {
    status: checks.every((check) => check.status === 'passed') ? 'passed' : 'blocked',
    provider_id: providerId,
    required_repository_strategy: 'prisma',
    checks,
  };
}

export function parseTapOutput(output) {
  const counters = {};
  for (const match of output.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/gmu)) {
    counters[match[1]] = Number.parseInt(match[2], 10);
  }
  const durationMatch = [...output.matchAll(/^# duration_ms ([0-9.]+)$/gmu)].at(-1);
  const subtests = [];
  for (const match of output.matchAll(/^(ok|not ok) \d+ - (.+?)(?: # (SKIP|TODO)\b.*)?$/gmu)) {
    subtests.push({
      name: match[2],
      status: match[1] === 'ok'
        ? match[3] === 'SKIP' ? 'skipped' : match[3] === 'TODO' ? 'todo' : 'passed'
        : 'failed',
    });
  }
  return {
    tests: counters.tests ?? null,
    suites: counters.suites ?? null,
    pass: counters.pass ?? null,
    fail: counters.fail ?? null,
    cancelled: counters.cancelled ?? null,
    skipped: counters.skipped ?? null,
    todo: counters.todo ?? null,
    duration_ms: durationMatch ? Number.parseFloat(durationMatch[1]) : null,
    subtests,
  };
}

export function aggregateTapTotals(results) {
  const totals = {
    tests: 0,
    pass: 0,
    fail: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
  };
  for (const result of results) {
    const summary = result.tap_summary;
    if (!summary) {
      continue;
    }
    for (const key of Object.keys(totals)) {
      totals[key] += summary[key] ?? 0;
    }
  }
  return totals;
}

export function sanitizedEnv(env) {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith('T114_')
        || key === 'BACKEND_TEST_PRESERVE_REAL_ENV'
        || key === 'PAPER_IMPLEMENTATION_REPOSITORY'
        || key === 'AUTO_PULL_SCHEDULER_ENABLED'
        || key === 'NODE_ENV'),
  );
}

export async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function runStep(step) {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const startedAt = new Date();
  const logPath = path.join(ARTIFACT_DIR, `${step.id}.log`);
  const outputChunks = [];
  let timedOut = false;
  let forceKillTimeout = null;
  const env = {
    ...process.env,
    ...(step.env ?? {}),
  };

  const child = spawn(step.command, step.args, {
    cwd: step.cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const timeout = setTimeout(() => {
    timedOut = true;
    const message = `\n[near-prod-runtime-gate] Step ${step.id} timed out after ${CHILD_TIMEOUT_MS}ms; sending SIGTERM.\n`;
    process.stderr.write(message);
    outputChunks.push(Buffer.from(message));
    child.kill('SIGTERM');
    forceKillTimeout = setTimeout(() => {
      const forceMessage = `[near-prod-runtime-gate] Step ${step.id} did not exit after ${FORCE_KILL_AFTER_MS}ms; sending SIGKILL.\n`;
      process.stderr.write(forceMessage);
      outputChunks.push(Buffer.from(forceMessage));
      child.kill('SIGKILL');
    }, FORCE_KILL_AFTER_MS);
  }, CHILD_TIMEOUT_MS);

  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      process.stdout.write(chunk);
      outputChunks.push(chunk);
    });
  }
  const exit = await new Promise((resolve) => {
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timeout);
  if (forceKillTimeout) {
    clearTimeout(forceKillTimeout);
  }

  const output = Buffer.concat(outputChunks).toString('utf8');
  await fs.writeFile(logPath, output);
  const finishedAt = new Date();
  const tapSummary = parseTapOutput(output);
  const hasTapFailure = (tapSummary.fail ?? 0) > 0
    || (tapSummary.cancelled ?? 0) > 0
    || (tapSummary.skipped ?? 0) > 0
    || (tapSummary.todo ?? 0) > 0
    || tapSummary.subtests.some((subtest) => subtest.status !== 'passed');
  return {
    id: step.id,
    status: !timedOut && exit.code === 0 && !hasTapFailure ? 'passed' : step.status_on_failure,
    status_on_failure: step.status_on_failure,
    command: [step.command, ...step.args].join(' '),
    cwd: path.relative(REPO_ROOT, step.cwd),
    env: sanitizedEnv(step.env ?? {}),
    exit_code: exit.code,
    signal: exit.signal,
    timed_out: timedOut,
    timeout_ms: CHILD_TIMEOUT_MS,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    elapsed_ms: finishedAt.getTime() - startedAt.getTime(),
    log_path: path.relative(REPO_ROOT, logPath),
    tap_summary: tapSummary.tests === null && tapSummary.subtests.length === 0 ? null : tapSummary,
  };
}

export function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateRouteGateEvidence(results, evidence) {
  const requiredStepId = '02-near-prod-route-gate';
  const validation = {
    status: 'not_applicable',
    required_when_step: requiredStepId,
    evidence_path: path.relative(REPO_ROOT, ROUTE_GATE_EVIDENCE_PATH),
    issue_codes: [],
  };
  const routeStep = results.find((result) => result.id === requiredStepId);
  if (!routeStep || routeStep.status !== 'passed') {
    return validation;
  }

  const issueCodes = [];
  if (!isRecord(evidence)) {
    return {
      ...validation,
      status: 'failed',
      issue_codes: ['ROUTE_GATE_EVIDENCE_MISSING'],
    };
  }

  const routeEvidence = evidence.route_evidence;
  const providerEvidence = evidence.provider_evidence;
  const prismaEvidence = evidence.prisma_evidence;
  const idempotencyEvidence = evidence.idempotency_evidence;
  const resultAnalysisDomainGateEvidence = evidence.result_analysis_domain_gate_evidence;
  const experimentPlanningBoundaryEvidence = evidence.experiment_planning_boundary_evidence;
  const noDualTrackEvidence = evidence.no_dual_track_evidence;
  const redactionGuardrails = evidence.redaction_guardrails;
  for (const [field, value] of Object.entries({
    route_evidence: routeEvidence,
    provider_evidence: providerEvidence,
    prisma_evidence: prismaEvidence,
    idempotency_evidence: idempotencyEvidence,
    result_analysis_domain_gate_evidence: resultAnalysisDomainGateEvidence,
    experiment_planning_boundary_evidence: experimentPlanningBoundaryEvidence,
    no_dual_track_evidence: noDualTrackEvidence,
    redaction_guardrails: redactionGuardrails,
  })) {
    if (!isRecord(value)) {
      issueCodes.push(`${field.toUpperCase()}_MISSING`);
    }
  }

  if (isRecord(routeEvidence)) {
    const routes = Array.isArray(routeEvidence.routes) ? routeEvidence.routes : [];
    const requiredRoutes = [
      'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/trace-integrity-boundary-debate/run',
      'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/claim-boundary-debate/run',
      'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/dossier-readiness-audit/run',
      'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/result-analysis-scenarios/run',
      'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-design-work-order-draft/run',
      'POST /paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-critique-plan-critique/run',
      'POST /paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/materialize-domain-gate',
      'GET /paper-implementation/projects/:implementation_project_id/runtime-artifacts',
      'GET /paper-implementation/projects/:implementation_project_id/runtime-admission-records',
    ];
    if (routeEvidence.build_app_path !== true || requiredRoutes.some((route) => !routes.includes(route))) {
      issueCodes.push('ROUTE_GATE_ROUTE_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(providerEvidence)) {
    if (
      !['openai', 'dashscope'].includes(providerEvidence.provider_id)
      || providerEvidence.gateway_path !== 'TopicSelectionAgentOrchestratorService -> BackendLlmGateway'
      || !isBoundedInteger(providerEvidence.trace_integrity_provider_call_count, 4, 8)
      || !isBoundedInteger(providerEvidence.claim_boundary_provider_call_count, 3, 6)
      || !isBoundedInteger(providerEvidence.dossier_readiness_provider_call_count, 3, 6)
      || !isBoundedInteger(providerEvidence.result_analysis_provider_call_count, 1, 2)
      || !isBoundedInteger(providerEvidence.experiment_design_provider_call_count, 1, 2)
      || !isBoundedInteger(providerEvidence.experiment_critique_provider_call_count, 1, 2)
      || providerEvidence.raw_provider_response_persisted !== false
    ) {
      issueCodes.push('PROVIDER_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(prismaEvidence)) {
    if (
      prismaEvidence.repository_strategy !== 'prisma'
      || prismaEvidence.runtime_artifact_query_hit !== true
      || !Number.isInteger(prismaEvidence.final_artifact_query_count)
      || prismaEvidence.final_artifact_query_count < 1
      || !Number.isInteger(prismaEvidence.final_admission_query_count)
      || prismaEvidence.final_admission_query_count < 1
    ) {
      issueCodes.push('PRISMA_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(idempotencyEvidence)) {
    const statuses = Array.isArray(idempotencyEvidence.concurrent_materialization_statuses)
      ? idempotencyEvidence.concurrent_materialization_statuses
      : [];
    if (
      statuses.length !== 2
      || !statuses.includes('materialized')
      || !statuses.includes('already_materialized')
      || idempotencyEvidence.replay_materialization_status !== 'already_materialized'
      || idempotencyEvidence.drift_materialization_error_code !== 'VERSION_CONFLICT'
      || !isRecord(idempotencyEvidence.domain_artifact_ref)
    ) {
      issueCodes.push('IDEMPOTENCY_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(resultAnalysisDomainGateEvidence)) {
    if (
      resultAnalysisDomainGateEvidence.materialization_status !== 'materialized'
      || resultAnalysisDomainGateEvidence.replay_materialization_status !== 'already_materialized'
      || resultAnalysisDomainGateEvidence.drift_materialization_error_code !== 'VERSION_CONFLICT'
      || !isRecord(resultAnalysisDomainGateEvidence.domain_artifact_ref)
      || resultAnalysisDomainGateEvidence.domain_artifact_ref.ref_type !== 'result_interpretation_packet'
    ) {
      issueCodes.push('RESULT_ANALYSIS_DOMAIN_GATE_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(experimentPlanningBoundaryEvidence)) {
    if (
      experimentPlanningBoundaryEvidence.design_status !== 'passed'
      || experimentPlanningBoundaryEvidence.critique_status !== 'passed'
      || experimentPlanningBoundaryEvidence.design_final_no_domain_gate_request !== true
      || experimentPlanningBoundaryEvidence.critique_final_no_domain_gate_request !== true
      || experimentPlanningBoundaryEvidence.design_materialization_error_code !== 'GATE_CONSTRAINT_FAILED'
      || experimentPlanningBoundaryEvidence.critique_materialization_error_code !== 'GATE_CONSTRAINT_FAILED'
    ) {
      issueCodes.push('EXPERIMENT_PLANNING_BOUNDARY_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(noDualTrackEvidence)) {
    if (
      noDualTrackEvidence.no_direct_provider_sdk !== true
      || noDualTrackEvidence.no_harness_proposal_artifact_substitution !== true
      || noDualTrackEvidence.no_runtime_envelope_write_route !== true
      || noDualTrackEvidence.domain_gate_called_via_http_route !== true
    ) {
      issueCodes.push('NO_DUAL_TRACK_EVIDENCE_INCOMPLETE');
    }
  }

  if (isRecord(redactionGuardrails)) {
    if (
      redactionGuardrails.provider_key_values_written !== false
      || redactionGuardrails.prompt_text_written_to_summary !== false
      || redactionGuardrails.raw_provider_response_written_to_summary !== false
      || redactionGuardrails.hidden_reasoning_written_to_summary !== false
    ) {
      issueCodes.push('REDACTION_GUARDRAILS_INCOMPLETE');
    }
  }

  return {
    ...validation,
    status: issueCodes.length > 0 ? 'failed' : 'passed',
    issue_codes: issueCodes,
  };
}

function isBoundedInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function statusFromResults(preflight, results, evidenceValidation) {
  if (preflight.status !== 'passed') {
    return 'blocked';
  }
  const failed = results.find((result) => result.status !== 'passed');
  if (!failed) {
    return evidenceValidation.status === 'failed' ? 'failed' : 'passed';
  }
  return failed.status;
}

export function exitCodeForStatus(status) {
  if (status === 'passed') {
    return 0;
  }
  if (status === 'blocked') {
    return 2;
  }
  return 1;
}

export async function writeSummary({
  startedAt,
  preflight,
  results,
  evidence,
  evidenceValidation,
  envFile,
}) {
  const status = statusFromResults(preflight, results, evidenceValidation);
  const summary = {
    schema_version: 'NearProdRuntimeGateSummary@v1',
    run_id: RUN_ID,
    scenario_id: 'paper-implementation.runtime.l6.near-prod-runtime-gate.v1',
    artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    status,
    exit_code: exitCodeForStatus(status),
    env_file: envFile,
    preflight,
    steps: results,
    tap_totals: aggregateTapTotals(results),
    evidence_validation: evidenceValidation,
    route_evidence: evidence?.route_evidence ?? null,
    provider_evidence: evidence?.provider_evidence ?? null,
    prisma_evidence: evidence?.prisma_evidence ?? null,
    idempotency_evidence: evidence?.idempotency_evidence ?? null,
    result_analysis_domain_gate_evidence: evidence?.result_analysis_domain_gate_evidence ?? null,
    experiment_planning_boundary_evidence: evidence?.experiment_planning_boundary_evidence ?? null,
    no_dual_track_evidence: evidence?.no_dual_track_evidence ?? null,
    redaction_guardrails: evidence?.redaction_guardrails ?? null,
  };
  const summaryPath = path.join(ARTIFACT_DIR, '90-summary.json');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

export async function main() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const startedAt = new Date();
  const envFile = await loadEnvFileIfPresent(ENV_FILE_PATH);
  const preflight = buildPreflight();
  const results = [];
  if (preflight.status === 'passed') {
    for (const step of steps) {
      const result = await runStep(step);
      results.push(result);
      if (result.status !== 'passed') {
        break;
      }
    }
  }
  const evidence = await readJsonIfPresent(ROUTE_GATE_EVIDENCE_PATH);
  const evidenceValidation = validateRouteGateEvidence(results, evidence);
  const summary = await writeSummary({
    startedAt,
    preflight,
    results,
    evidence,
    evidenceValidation,
    envFile,
  });
  process.exitCode = summary.exit_code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
