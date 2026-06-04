#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUN_ID = normalizeOptionalString(process.env.PAPER_IMPLEMENTATION_RUNTIME_STRESS_RUN_ID)
  ?? `t114-paper-implementation-runtime-stress-${Date.now()}`;
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-runtime-stress', RUN_ID);
const CHILD_TIMEOUT_MS = positiveInt(process.env.PAPER_IMPLEMENTATION_RUNTIME_STRESS_CHILD_TIMEOUT_MS, 900000);
const L5_STEP_ID = '00-l5-stress-compression-adversarial';

const REQUIRED_L5_CASES = [
  {
    key: 'trace_over_budget_zero_provider_calls',
    subtest: 'L5 trace stress blocks over-budget retrieval context before provider calls',
  },
  {
    key: 'trace_adversarial_prompt_zero_provider_calls',
    subtest: 'L5 trace adversarial prompt payload is blocked before provider calls and not persisted',
  },
  {
    key: 'trace_forbidden_provider_output_no_final_artifact',
    subtest: 'L5 trace forbidden provider output field fails closed without final artifact',
  },
  {
    key: 'trace_provider_failure_retry_exhausted_no_fallback_no_final_artifact',
    subtest: 'L5 trace provider gateway failure retries once and fails closed without fallback or final artifact',
  },
  {
    key: 'trace_transient_provider_failure_retry_recovered_no_fallback',
    subtest: 'L5 trace transient provider failure retries the same profile and recovers without fallback',
  },
  {
    key: 'p1_over_budget_zero_provider_calls',
    subtest: 'L5 P1 stress blocks over-budget source bundles before provider calls',
  },
  {
    key: 'p1_compression_provenance_recorded',
    subtest: 'L5 P1 compression provenance is carried into role and final artifacts',
  },
  {
    key: 'p1_forbidden_provider_output_no_domain_gate_payload',
    subtest: 'L5 P1 forbidden provider output does not create final or domain-gate payloads',
  },
  {
    key: 'p1_provider_failure_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 P1 provider gateway failure retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'result_analysis_provider_failure_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 result-analysis provider gateway failure retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'result_analysis_incomplete_scenario_set_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 result-analysis incomplete scenario set retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'experiment_planning_provider_failure_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 experiment planning provider gateway failure retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'experiment_critique_incomplete_dimension_set_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 experiment critique incomplete dimension set retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'p1_current_role_retry_no_prior_role_rerun',
    subtest: 'L5 P1 current-role retry does not rerun admitted prior roles',
  },
  {
    key: 'p1_schema_invalid_provider_output_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 P1 schema-invalid provider output retries once and does not create final or domain-gate payloads',
  },
];

const steps = [
  {
    id: L5_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      'src/services/paper-implementation-runtime-l5-stress.unit.test.ts',
    ],
  },
  {
    id: '01-runtime-service-and-route-regression',
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      'src/services/paper-implementation-trace-integrity-debate-runtime-service.unit.test.ts',
      'src/services/paper-implementation-p1-runtime-review-service.unit.test.ts',
      'src/services/paper-implementation-result-analysis-runtime-service.unit.test.ts',
      'src/services/paper-implementation-experiment-planning-runtime-service.unit.test.ts',
      'src/services/paper-implementation-runtime-domain-gate-service.unit.test.ts',
      'src/routes/paper-implementation-runtime-routes.integration.test.ts',
    ],
  },
];

function normalizeOptionalString(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function deterministicTestEnv() {
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    AUTO_PULL_SCHEDULER_ENABLED: 'false',
    T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE: '',
    T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE: '',
    T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE: '',
    T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE: '',
    T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE: '',
    T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE: '',
    T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE: '',
    T114_RUNTIME_PRISMA_SMOKE: '',
  };
  for (const key of [
    'OPENAI_API_KEY',
    'DASHSCOPE_API_KEY',
    'DASHSCOPE_API_KEY_CODING',
    'DEEPSEEK_API_KEY',
    'TITLE_CARD_REPOSITORY',
    'RESEARCH_LIFECYCLE_REPOSITORY',
    'PAPER_IMPLEMENTATION_REPOSITORY',
    'AUTO_PULL_REPOSITORY',
    'APPLICATION_SETTINGS_REPOSITORY',
    'EXPERIMENT_FOUNDATION_REPOSITORY',
  ]) {
    delete env[key];
  }
  return env;
}

function parseTapOutput(output) {
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

function buildRequiredL5CaseCoverage(results) {
  const l5Step = results.find((result) => result.id === L5_STEP_ID);
  const subtestsByName = new Map(
    (l5Step?.tap_summary?.subtests ?? []).map((subtest) => [subtest.name, subtest]),
  );
  const cases = REQUIRED_L5_CASES.map((item) => {
    const subtest = subtestsByName.get(item.subtest);
    return {
      key: item.key,
      required_subtest: item.subtest,
      observed_status: subtest?.status ?? 'missing',
      passed: subtest?.status === 'passed',
    };
  });
  return {
    source: 'parsed_tap_subtests',
    source_step_id: L5_STEP_ID,
    status: cases.every((item) => item.passed) ? 'passed' : 'failed',
    cases,
  };
}

function aggregateTapTotals(results) {
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

async function runStep(step) {
  const startedAt = new Date();
  const logPath = path.join(ARTIFACT_DIR, `${step.id}.log`);
  const outputChunks = [];
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await fs.writeFile(logPath, '');

  const child = spawn(step.command, step.args, {
    cwd: step.cwd,
    env: deterministicTestEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
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

  const output = Buffer.concat(outputChunks).toString('utf8');
  const tapSummary = parseTapOutput(output);
  await fs.writeFile(logPath, output);
  const finishedAt = new Date();
  return {
    id: step.id,
    status: exit.code === 0 ? 'passed' : 'failed',
    command: [step.command, ...step.args].join(' '),
    cwd: path.relative(REPO_ROOT, step.cwd),
    exit_code: exit.code,
    signal: exit.signal,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    elapsed_ms: finishedAt.getTime() - startedAt.getTime(),
    log_path: path.relative(REPO_ROOT, logPath),
    tap_summary: tapSummary,
  };
}

async function main() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const results = [];
  for (const step of steps) {
    results.push(await runStep(step));
    if (results[results.length - 1].status !== 'passed') {
      break;
    }
  }
  const requiredL5Cases = buildRequiredL5CaseCoverage(results);
  const stepStatus = results.every((result) => result.status === 'passed') ? 'passed' : 'failed';
  const summary = {
    schema_version: 'paper-implementation-runtime-stress-summary-v0',
    run_id: RUN_ID,
    scenario_id: 'paper-implementation.runtime.l5.stress-compression-adversarial.v1',
    artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
    started_at: results[0]?.started_at ?? new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: stepStatus === 'passed' && requiredL5Cases.status === 'passed' ? 'passed' : 'failed',
    steps: results,
    tap_totals: aggregateTapTotals(results),
    required_l5_cases: requiredL5Cases,
    runner_guardrails: {
      source: 'runner_configuration',
      no_parallel_harness_entrypoint: 'runner only spawns node --test commands and does not create runtime artifacts itself',
      deterministic_no_live_provider_keys: {
        unset_keys: [
          'OPENAI_API_KEY',
          'DASHSCOPE_API_KEY',
          'DASHSCOPE_API_KEY_CODING',
          'DEEPSEEK_API_KEY',
        ],
        disabled_flags: [
        'T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE',
        'T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE',
        'T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE',
        'T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE',
        'T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE',
        'T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE',
        'T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE',
        'T114_RUNTIME_PRISMA_SMOKE',
      ],
      },
    },
  };
  const summaryPath = path.join(ARTIFACT_DIR, '90-summary.json');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
