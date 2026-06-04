#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUNNER_PATH = path.join(SCRIPT_DIR, 'paper-implementation-near-prod-runtime-gate.mjs');
const META_TMP_DIR = path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-near-prod-runtime-gate-meta-tests');

const REQUIRED_ROUTES = [
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

test('near-prod runner fails passed TAP when route evidence is missing', async () => {
  const runId = 't114-meta-missing-evidence';
  const runner = await importRunner(runId);
  const results = [passedRouteStep()];
  const evidenceValidation = runner.validateRouteGateEvidence(results, null);
  const summary = await writeSummaryQuietly(runner, {
    startedAt: new Date('2026-06-04T00:00:00.000Z'),
    preflight: passedPreflight(),
    results,
    evidence: null,
    evidenceValidation,
    envFile: missingEnvFile(),
  });

  assert.equal(evidenceValidation.status, 'failed');
  assert.deepEqual(evidenceValidation.issue_codes, ['ROUTE_GATE_EVIDENCE_MISSING']);
  assert.equal(summary.status, 'failed');
  assert.equal(summary.exit_code, 1);
  assert.equal(summary.result_analysis_domain_gate_evidence, null);
  assert.equal(summary.experiment_planning_boundary_evidence, null);
  assert.equal(summary.no_dual_track_evidence, null);
  assert.equal(summary.redaction_guardrails, null);
});

test('near-prod runner fails passed TAP when route evidence is incomplete', async () => {
  const runId = 't114-meta-incomplete-evidence';
  const runner = await importRunner(runId);
  const results = [passedRouteStep()];
  const evidence = validEvidence();
  evidence.provider_evidence.claim_boundary_provider_call_count = 2;
  delete evidence.no_dual_track_evidence;
  const evidenceValidation = runner.validateRouteGateEvidence(results, evidence);
  const summary = await writeSummaryQuietly(runner, {
    startedAt: new Date('2026-06-04T00:00:00.000Z'),
    preflight: passedPreflight(),
    results,
    evidence,
    evidenceValidation,
    envFile: missingEnvFile(),
  });

  assert.equal(evidenceValidation.status, 'failed');
  assert.ok(evidenceValidation.issue_codes.includes('PROVIDER_EVIDENCE_INCOMPLETE'));
  assert.ok(evidenceValidation.issue_codes.includes('NO_DUAL_TRACK_EVIDENCE_MISSING'));
  assert.equal(summary.status, 'failed');
  assert.equal(summary.exit_code, 1);
});

test('near-prod runner marks timed out child steps failed and exits the child', async () => {
  const runId = 't114-meta-timeout';
  const runner = await importRunner(runId, {
    PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_TIMEOUT_MS: '50',
    PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_FORCE_KILL_AFTER_MS: '50',
  });
  const result = await runner.runStep({
    id: 'meta-timeout-child',
    status_on_failure: 'failed',
    command: process.execPath,
    args: ['-e', 'setTimeout(() => {}, 10000);'],
    cwd: REPO_ROOT,
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.timed_out, true);
  assert.equal(result.timeout_ms, 50);
  assert.ok(result.signal === 'SIGTERM' || result.signal === 'SIGKILL');
  const log = await fs.readFile(path.join(artifactDir(runId), 'meta-timeout-child.log'), 'utf8');
  assert.match(log, /timed out after 50ms/u);
});

test('near-prod package entry enters runner and writes blocked summary when env file is missing', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(
    packageJson.scripts['paper-implementation:near-prod-runtime-gate'],
    'node .ai/scripts/paper-implementation-near-prod-runtime-gate.mjs',
  );

  const runId = 't114-meta-package-missing-env';
  const result = await runProcess(process.execPath, [RUNNER_PATH], {
    cwd: REPO_ROOT,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      SHELL: process.env.SHELL ?? '',
      PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_RUN_ID: runId,
      PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_ENV_FILE: '.ai/.tmp/missing-near-prod-runtime-gate.env',
    },
    timeoutMs: 10000,
  });

  assert.equal(result.code, 2, result.stderr || result.stdout);
  const summary = JSON.parse(await fs.readFile(path.join(artifactDir(runId), '90-summary.json'), 'utf8'));
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.exit_code, 2);
  assert.equal(summary.env_file.status, 'missing');
  assert.deepEqual(summary.steps, []);
  assert.equal(summary.evidence_validation.status, 'not_applicable');
  assert.equal(summary.no_dual_track_evidence, null);
});

async function importRunner(runId, overrides = {}) {
  await fs.mkdir(META_TMP_DIR, { recursive: true });
  const envPatch = {
    PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_RUN_ID: runId,
    PAPER_IMPLEMENTATION_NEAR_PROD_RUNTIME_GATE_ENV_FILE: path.join(
      '.ai/.tmp/paper-implementation-near-prod-runtime-gate-meta-tests',
      `${runId}.env`,
    ),
    ...overrides,
  };
  const previous = new Map();
  for (const [key, value] of Object.entries(envPatch)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    const importId = `${runId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return await import(`${pathToFileURL(RUNNER_PATH).href}?${encodeURIComponent(importId)}`);
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
        continue;
      }
      process.env[key] = value;
    }
  }
}

function artifactDir(runId) {
  return path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-near-prod-runtime-gate', runId);
}

async function writeSummaryQuietly(runner, input) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await runner.writeSummary(input);
  } finally {
    console.log = originalLog;
  }
}

function passedPreflight() {
  return {
    status: 'passed',
    provider_id: 'openai',
    required_repository_strategy: 'prisma',
    checks: [
      { id: 'database_url_present', status: 'passed' },
      { id: 'provider_key_present', status: 'passed', provider_id: 'openai', key_name: 'OPENAI_API_KEY' },
    ],
  };
}

function missingEnvFile() {
  return {
    status: 'missing',
    path: '.ai/.tmp/missing-near-prod-runtime-gate.env',
    loaded_key_count: 0,
    skipped_existing_key_count: 0,
    parsed_key_count: 0,
  };
}

function passedRouteStep() {
  return {
    id: '02-near-prod-route-gate',
    status: 'passed',
    status_on_failure: 'failed',
    command: 'node --test fake-route-gate.test.mjs',
    cwd: 'apps/backend',
    env: {},
    exit_code: 0,
    signal: null,
    timed_out: false,
    timeout_ms: 1200000,
    started_at: '2026-06-04T00:00:00.000Z',
    finished_at: '2026-06-04T00:00:01.000Z',
    elapsed_ms: 1000,
    log_path: '.ai/.tmp/fake.log',
    tap_summary: {
      tests: 1,
      suites: 0,
      pass: 1,
      fail: 0,
      cancelled: 0,
      skipped: 0,
      todo: 0,
      duration_ms: 1000,
      subtests: [{
        name: 'T-114 near-prod runtime gate exercises live provider, Prisma admission, and Domain Gate replay',
        status: 'passed',
      }],
    },
  };
}

function validEvidence() {
  return {
    route_evidence: {
      build_app_path: true,
      routes: [...REQUIRED_ROUTES],
    },
    provider_evidence: {
      provider_id: 'openai',
      gateway_path: 'TopicSelectionAgentOrchestratorService -> BackendLlmGateway',
      trace_integrity_provider_call_count: 4,
      claim_boundary_provider_call_count: 3,
      dossier_readiness_provider_call_count: 3,
      result_analysis_provider_call_count: 1,
      experiment_design_provider_call_count: 1,
      experiment_critique_provider_call_count: 1,
      raw_provider_response_persisted: false,
    },
    prisma_evidence: {
      repository_strategy: 'prisma',
      runtime_artifact_query_hit: true,
      final_artifact_query_count: 1,
      final_admission_query_count: 1,
    },
    idempotency_evidence: {
      concurrent_materialization_statuses: ['already_materialized', 'materialized'],
      replay_materialization_status: 'already_materialized',
      drift_materialization_error_code: 'VERSION_CONFLICT',
      domain_artifact_ref: {
        ref_type: 'claim_candidate',
        ref_id: 'claim-001',
        title_card_id: null,
      },
    },
    result_analysis_domain_gate_evidence: {
      materialization_status: 'materialized',
      replay_materialization_status: 'already_materialized',
      drift_materialization_error_code: 'VERSION_CONFLICT',
      domain_artifact_ref: {
        ref_type: 'result_interpretation_packet',
        ref_id: 'result-packet-001',
        title_card_id: null,
      },
    },
    experiment_planning_boundary_evidence: {
      design_status: 'passed',
      critique_status: 'passed',
      design_final_no_domain_gate_request: true,
      critique_final_no_domain_gate_request: true,
      design_materialization_error_code: 'GATE_CONSTRAINT_FAILED',
      critique_materialization_error_code: 'GATE_CONSTRAINT_FAILED',
    },
    no_dual_track_evidence: {
      no_direct_provider_sdk: true,
      no_harness_proposal_artifact_substitution: true,
      no_runtime_envelope_write_route: true,
      domain_gate_called_via_http_route: true,
    },
    redaction_guardrails: {
      provider_key_values_written: false,
      prompt_text_written_to_summary: false,
      raw_provider_response_written_to_summary: false,
      hidden_reasoning_written_to_summary: false,
    },
  };
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Process timed out after ${options.timeoutMs}ms: ${command} ${args.join(' ')}`));
    }, options.timeoutMs);
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });
}
