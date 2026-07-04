#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const SUPPORTED_MODES = new Set(['contract', 'preflight', 'deterministic', 'real-local-db', 'full']);
const RUNNER_VERSION = 't103-closure';
const DEFAULT_BACKEND_SMOKE_PORT = 3310;
const DEFAULT_DESKTOP_SMOKE_PORT = 5189;
const COMMAND_OUTPUT_TAIL_CHARS = 8_000;
const COMMAND_OUTPUT_MARKDOWN_CHARS = 2_000;
const COMMAND_TIMEOUT_GRACE_MS = 5_000;
const USE_PROCESS_GROUP_SIGNALS = process.platform !== 'win32';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const runId = args.runId ?? `experiment-foundation-full-flow-${timestamp()}`;
const artifactDir = path.resolve(args.artifactDir ?? path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-full-flow', runId));
const now = new Date().toISOString();
const manifest = buildLaneManifest({
  artifactDir,
  generatedAt: now,
  includeExternalCanary: args.includeExternalCanary,
  mode: args.mode,
  requireRealDb: args.requireRealDb,
  runId,
});

let preflightResult = null;
let deterministicResult = null;
let realLocalDbResult = null;
let externalCanaryResult = null;
let status = 'NOT_IMPLEMENTED';
let exitCode = 2;
await fs.mkdir(artifactDir, { recursive: true });

if (args.mode === 'contract') {
  status = 'CONTRACT_READY';
  exitCode = 0;
} else if (args.mode === 'preflight') {
  preflightResult = await runPreflight(args);
  status = preflightResult.status;
  exitCode = preflightResult.blockers.length > 0 ? 1 : 0;
} else if (args.mode === 'deterministic') {
  preflightResult = await runPreflight(args);
  if (preflightResult.blockers.length > 0) {
    status = 'DETERMINISTIC_BLOCKED_BY_PREFLIGHT';
    exitCode = 1;
  } else {
    deterministicResult = await runDeterministic(manifest);
    status = deterministicResult.status === 'DETERMINISTIC_PASSED' && preflightResult.warnings.length > 0
      ? 'DETERMINISTIC_PASSED_WITH_PREFLIGHT_WARNINGS'
      : deterministicResult.status;
    exitCode = deterministicResult.blockers.length > 0 ? 1 : 0;
  }
} else if (args.mode === 'real-local-db') {
  preflightResult = await runPreflight(args);
  if (preflightResult.blockers.length > 0) {
    status = 'REAL_LOCAL_DB_BLOCKED_BY_PREFLIGHT';
    exitCode = 1;
  } else {
    realLocalDbResult = await runRealLocalDbSmoke(runId);
    status = realLocalDbResult.status;
    exitCode = realLocalDbResult.blockers.length > 0 ? 1 : 0;
  }
} else if (args.mode === 'full') {
  preflightResult = await runPreflight(args);
  if (preflightResult.blockers.length > 0) {
    externalCanaryResult = await runExternalCanaryLane(args);
    status = 'FULL_BLOCKED_BY_PREFLIGHT';
    exitCode = 1;
  } else {
    deterministicResult = await runDeterministic(manifest);
    if (deterministicResult.blockers.length > 0) {
      externalCanaryResult = await runExternalCanaryLane(args);
      status = 'FULL_FAILED';
      exitCode = 1;
    } else {
      realLocalDbResult = await runRealLocalDbSmoke(runId);
      externalCanaryResult = await runExternalCanaryLane(args);
      const hasBlockers = realLocalDbResult.blockers.length > 0 || externalCanaryResult.blockers.length > 0;
      status = hasBlockers
        ? 'FULL_FAILED'
        : preflightResult.warnings.length > 0
          ? 'FULL_PASSED_WITH_PREFLIGHT_WARNINGS'
          : 'FULL_PASSED';
      exitCode = hasBlockers ? 1 : 0;
    }
  }
}

manifest.artifact_files = buildActualArtifactFiles({
  preflightResult,
  deterministicResult,
  realLocalDbResult,
  externalCanaryResult,
});

await fs.writeFile(path.join(artifactDir, '00-command-contract.md'), renderCommandContract(manifest), 'utf8');
await fs.writeFile(path.join(artifactDir, '01-lane-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await fs.writeFile(path.join(artifactDir, '02-validation-report.md'), renderValidationReport(manifest, status, preflightResult, deterministicResult, realLocalDbResult, externalCanaryResult), 'utf8');
await fs.writeFile(path.join(artifactDir, '03-blockers.md'), renderBlockers(manifest, status, preflightResult, deterministicResult, realLocalDbResult, externalCanaryResult), 'utf8');
if (preflightResult) {
  await fs.writeFile(path.join(artifactDir, '04-preflight.md'), renderPreflightMarkdown(preflightResult), 'utf8');
  await fs.writeFile(path.join(artifactDir, '05-preflight.json'), `${JSON.stringify(preflightResult, null, 2)}\n`, 'utf8');
}
if (deterministicResult) {
  await fs.writeFile(path.join(artifactDir, '06-deterministic.md'), renderDeterministicMarkdown(deterministicResult), 'utf8');
  await fs.writeFile(path.join(artifactDir, '07-deterministic.json'), `${JSON.stringify(deterministicResult, null, 2)}\n`, 'utf8');
}
if (realLocalDbResult) {
  await fs.writeFile(path.join(artifactDir, '08-real-local-db.md'), renderRealLocalDbMarkdown(realLocalDbResult), 'utf8');
  await fs.writeFile(path.join(artifactDir, '09-real-local-db.json'), `${JSON.stringify(realLocalDbResult, null, 2)}\n`, 'utf8');
}
if (externalCanaryResult) {
  await fs.writeFile(path.join(artifactDir, '10-external-canary.md'), renderExternalCanaryMarkdown(externalCanaryResult), 'utf8');
  await fs.writeFile(path.join(artifactDir, '11-external-canary.json'), `${JSON.stringify(externalCanaryResult, null, 2)}\n`, 'utf8');
}

const summary = {
  status,
  runner_version: RUNNER_VERSION,
  mode: args.mode,
  run_id: runId,
  artifact_dir: relativePath(artifactDir),
  report: relativePath(path.join(artifactDir, '02-validation-report.md')),
};
console.log(JSON.stringify(summary, null, 2));
process.exit(exitCode);

function parseArgs(rawArgs) {
  const parsed = {
    artifactDir: null,
    help: false,
    includeExternalCanary: false,
    mode: 'contract',
    requireRealDb: false,
    runId: null,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];
    if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--mode' && next) {
      parsed.mode = next;
      index += 1;
    } else if (arg.startsWith('--mode=')) {
      parsed.mode = arg.slice('--mode='.length);
    } else if (arg === '--run-id' && next) {
      parsed.runId = next;
      index += 1;
    } else if (arg.startsWith('--run-id=')) {
      parsed.runId = arg.slice('--run-id='.length);
    } else if (arg === '--artifact-dir' && next) {
      parsed.artifactDir = next;
      index += 1;
    } else if (arg.startsWith('--artifact-dir=')) {
      parsed.artifactDir = arg.slice('--artifact-dir='.length);
    } else if (arg === '--include-external-canary') {
      parsed.includeExternalCanary = true;
    } else if (arg === '--require-real-db') {
      parsed.requireRealDb = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!SUPPORTED_MODES.has(parsed.mode)) {
    throw new Error(`Unsupported --mode "${parsed.mode}".`);
  }
  if (parsed.runId !== null && !/^[A-Za-z0-9._-]+$/.test(parsed.runId)) {
    throw new Error('--run-id may only contain letters, numbers, dot, underscore, and hyphen.');
  }

  return parsed;
}

function buildLaneManifest(input) {
  return {
    runner_id: 'experiment-foundation-full-flow-runner',
    runner_version: RUNNER_VERSION,
    task_id: 'T-103',
    run_id: input.runId,
    generated_at: input.generatedAt,
    mode_requested: input.mode,
    artifact_dir: relativePath(input.artifactDir),
    runner_phase: 'phase_5_closure',
    flags: {
      include_external_canary: input.includeExternalCanary,
      require_real_db: input.requireRealDb,
    },
    artifact_files: buildActualArtifactFiles({}),
    lanes: [
      {
        lane_id: 'preflight',
        default_enabled: true,
        implementation_status: 'implemented',
        purpose: 'Verify local prerequisites before expensive checks.',
        checks: [
          '.env.local exists',
          'DATABASE_URL resolves through local env loading',
          'Postgres is reachable',
          'repo migrations are applied',
          'LocalScript execution root and allowlist are configured',
          'backend and desktop smoke ports are available or selectable',
        ],
        future_failure_semantics: 'blocker',
      },
      {
        lane_id: 'deterministic',
        default_enabled: true,
        implementation_status: 'implemented',
        purpose: 'Run repeatable repo-local validation without cloud credentials.',
        command_ids: [
          'shared-typecheck',
          'shared-test',
          'backend-typecheck',
          'backend-test',
          'desktop-typecheck',
          'desktop-build',
          'desktop-smoke-e2e',
          'backend-t090-capability-harness',
          'backend-adjacent-workorder-guard',
          'governance-sync-dry-run',
          'governance-lint',
          'diff-check',
        ],
        future_failure_semantics: 'blocker',
      },
      {
        lane_id: 'real-local-db',
        default_enabled: input.requireRealDb || ['real-local-db', 'full'].includes(input.mode),
        implementation_status: 'implemented',
        purpose: 'Prove local Postgres path with disposable schema or read-only smoke semantics.',
        checks: [
          'local DATABASE_URL is present',
          'disposable schema is created and dropped',
          'repo migrations apply to the disposable schema',
          'registry/readiness/execution records can round-trip safely',
        ],
        future_failure_semantics: input.requireRealDb || ['real-local-db', 'full'].includes(input.mode)
          ? 'blocker'
          : 'skipped_unless_requested',
      },
      {
        lane_id: 'external-opt-in',
        default_enabled: input.includeExternalCanary,
        implementation_status: 'implemented_gate_only',
        purpose: 'Record explicit external canary gate status without making real cloud submission part of the default suite.',
        checks: [
          'CLI opt-in is explicit',
          'environment opt-in is explicit',
          'credential key names are present when requested',
          'real external submit remains disabled in T-103 closure mode',
        ],
        future_failure_semantics: input.includeExternalCanary ? 'blocker' : 'skipped_unless_requested',
      },
    ],
    deterministic_command_inventory: [
      command('shared-typecheck', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/shared', 'typecheck'], '.', 120_000, input.mode),
      command('shared-test', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/shared', 'test'], '.', 180_000, input.mode),
      command('backend-typecheck', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/backend', 'typecheck'], '.', 180_000, input.mode),
      // 900s, not 300s: a solo full suite already runs ~286-294s, and the
      // suite runner's cross-process lock (run-node-tests.mjs) may queue this
      // step behind another session's run before it can even start.
      command('backend-test', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/backend', 'test'], '.', 900_000, input.mode),
      command('desktop-typecheck', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/desktop', 'typecheck'], '.', 180_000, input.mode),
      command('desktop-build', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/desktop', 'build'], '.', 180_000, input.mode),
      command('desktop-smoke-e2e', 'deterministic', ['pnpm', '--filter', '@paper-engineering-assistant/desktop', 'smoke:e2e'], '.', 120_000, input.mode),
      command(
        'backend-t090-capability-harness',
        'deterministic',
        ['node', '--test', '--loader', 'ts-node/esm', 'src/services/experiment-foundation-capability-harness.test.ts'],
        'apps/backend',
        180_000,
        input.mode,
      ),
      command(
        'backend-adjacent-workorder-guard',
        'deterministic',
        ['node', '--test', '--loader', 'ts-node/esm', 'src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts'],
        'apps/backend',
        120_000,
        input.mode,
      ),
      command(
        'governance-sync-dry-run',
        'deterministic',
        ['node', '.ai/scripts/ctl-project-governance.mjs', 'sync', '--dry-run', '--project', 'main'],
        '.',
        60_000,
        input.mode,
      ),
      command(
        'governance-lint',
        'deterministic',
        ['node', '.ai/scripts/ctl-project-governance.mjs', 'lint', '--check', '--project', 'main'],
        '.',
        60_000,
        input.mode,
      ),
      command('diff-check', 'deterministic', ['git', 'diff', '--check'], '.', 60_000, input.mode),
    ],
  };
}

function buildActualArtifactFiles({
  preflightResult = null,
  deterministicResult = null,
  realLocalDbResult = null,
  externalCanaryResult = null,
}) {
  return [
    '00-command-contract.md',
    '01-lane-manifest.json',
    '02-validation-report.md',
    '03-blockers.md',
    ...(preflightResult ? ['04-preflight.md', '05-preflight.json'] : []),
    ...(deterministicResult ? ['06-deterministic.md', '07-deterministic.json'] : []),
    ...(realLocalDbResult ? ['08-real-local-db.md', '09-real-local-db.json'] : []),
    ...(externalCanaryResult ? ['10-external-canary.md', '11-external-canary.json'] : []),
  ];
}

function command(commandId, laneId, argv, cwd = '.', timeoutMs = 120_000, mode = 'contract') {
  return {
    command_id: commandId,
    lane_id: laneId,
    cwd,
    argv,
    display: argv.join(' '),
    timeout_ms: timeoutMs,
    execution_policy: 'runs_in_deterministic_mode',
    execution_status: ['deterministic', 'full'].includes(mode)
      ? 'executed_in_this_run_with_results_in_07_deterministic_json'
      : 'not_executed_in_this_run',
  };
}

function renderCommandContract(manifest) {
  return `${[
    '# Experiment Foundation Full-flow Runner Command Contract',
    '',
    `- Runner: \`${manifest.runner_id}\``,
    `- Version: \`${manifest.runner_version}\``,
    `- Task: \`${manifest.task_id}\``,
    `- Run ID: \`${manifest.run_id}\``,
    `- Mode requested: \`${manifest.mode_requested}\``,
    `- Artifact dir: \`${manifest.artifact_dir}\``,
    '',
    '## CLI',
    '```bash',
    'node .ai/scripts/experiment-foundation-full-flow-runner.mjs --mode contract',
    'pnpm experiment-foundation:full-flow -- --mode contract',
    '```',
    '',
    'Supported modes: `contract`, `preflight`, `deterministic`, `real-local-db`, `full`.',
    '',
    '`contract` writes the command contract. `preflight` runs lightweight local prerequisite checks. `deterministic` runs preflight first, then the repeatable repo-local validation commands. `real-local-db` runs an explicit disposable-schema Postgres smoke. `full` runs the local closure sequence and records the external canary lane as skipped/blocked/passed.',
    '',
    '## Lanes',
    ...manifest.lanes.map((lane) => [
      `### ${lane.lane_id}`,
      '',
      `- Default enabled: \`${lane.default_enabled}\``,
      `- Implementation status: \`${lane.implementation_status}\``,
      `- Purpose: ${lane.purpose}`,
      `- Future failure semantics: \`${lane.future_failure_semantics}\``,
      '',
    ].join('\n')),
    '## Deterministic Command Inventory',
    '',
    ...manifest.deterministic_command_inventory.map((item) =>
      `- \`${item.command_id}\` (${item.cwd}): \`${item.display}\``
    ),
    '',
  ].join('\n')}\n`;
}

function renderValidationReport(manifest, reportStatus, preflightResult, deterministicResult, realLocalDbResult, externalCanaryResult) {
  const laneRows = manifest.lanes
    .map((lane) => `| \`${lane.lane_id}\` | \`${lane.implementation_status}\` | \`${lane.future_failure_semantics}\` |`)
    .join('\n');
  const executionSummary = externalCanaryResult
    ? 'Full-mode closure sequence was requested. External canary status is recorded separately from deterministic and real-local-DB results.'
    : realLocalDbResult
    ? 'Preflight and real-local-DB disposable-schema smoke were executed. Deterministic and external canary lanes were not executed.'
    : deterministicResult
      ? 'Preflight and deterministic validation commands were executed. Real DB smoke and external canary lanes were not executed.'
      : preflightResult
        ? 'Preflight checks were executed. Deterministic, real DB smoke, and external canary lanes were not executed.'
        : 'No validation commands were executed. This report records the runner command contract only.';
  return `${[
    '# Experiment Foundation Full-flow Validation Report',
    '',
    `- Status: \`${reportStatus}\``,
    `- Runner version: \`${manifest.runner_version}\``,
    `- Run ID: \`${manifest.run_id}\``,
    `- Mode requested: \`${manifest.mode_requested}\``,
    `- Artifact dir: \`${manifest.artifact_dir}\``,
    '',
    executionSummary,
    '',
    '| Lane | Implementation status | Future failure semantics |',
    '| --- | --- | --- |',
    laneRows,
    '',
    ...(preflightResult ? [
      '## Preflight Summary',
      '',
      `- Checks: \`${preflightResult.checks.length}\``,
      `- Passed: \`${preflightResult.summary.pass_count}\``,
      `- Warnings: \`${preflightResult.summary.warn_count}\``,
      `- Blockers: \`${preflightResult.summary.fail_count}\``,
      '',
    ] : []),
    ...(deterministicResult ? [
      '## Deterministic Summary',
      '',
      `- Commands: \`${deterministicResult.summary.command_count}\``,
      `- Passed: \`${deterministicResult.summary.pass_count}\``,
      `- Failed: \`${deterministicResult.summary.fail_count}\``,
      `- Timed out: \`${deterministicResult.summary.timeout_count}\``,
      `- Duration: \`${deterministicResult.summary.duration_ms}ms\``,
      '',
      '| Command | Status | Exit | Duration |',
      '| --- | --- | --- | --- |',
      ...deterministicResult.commands.map((commandResult) =>
        `| \`${commandResult.command_id}\` | \`${commandResult.status}\` | \`${commandResult.exit_code ?? 'signal'}\` | \`${commandResult.duration_ms}ms\` |`
      ),
      '',
    ] : []),
    ...(realLocalDbResult ? [
      '## Real Local DB Summary',
      '',
      `- Steps: \`${realLocalDbResult.steps.length}\``,
      `- Passed: \`${realLocalDbResult.summary.pass_count}\``,
      `- Failed: \`${realLocalDbResult.summary.fail_count}\``,
      `- Disposable schema dropped: \`${realLocalDbResult.cleanup.schema_dropped}\``,
      `- Duration: \`${realLocalDbResult.summary.duration_ms}ms\``,
      '',
      '| Step | Status | Duration |',
      '| --- | --- | --- |',
      ...realLocalDbResult.steps.map((step) =>
        `| \`${step.step_id}\` | \`${step.status}\` | \`${step.duration_ms}ms\` |`
      ),
      '',
    ] : []),
    ...(externalCanaryResult ? [
      '## External Canary Summary',
      '',
      `- Status: \`${externalCanaryResult.status}\``,
      `- Checks: \`${externalCanaryResult.checks.length}\``,
      `- Passed: \`${externalCanaryResult.summary.pass_count}\``,
      `- Skipped: \`${externalCanaryResult.summary.skip_count}\``,
      `- Blockers: \`${externalCanaryResult.summary.fail_count}\``,
      `- Real submission executed: \`${externalCanaryResult.real_submission_executed}\``,
      '',
    ] : []),
    '## Redaction',
    '',
    preflightResult
      ? '- Local environment files were read for key presence only; secret values are not stored.'
      : '- Environment variables were not loaded.',
    deterministicResult
      ? '- Deterministic command artifacts store only redacted output tails, not raw unbounded logs.'
      : '- Deterministic commands were not executed.',
    realLocalDbResult
      ? '- Real-local-DB artifacts store the disposable schema name and step statuses, not the raw database URL.'
      : '- Real-local-DB smoke was not executed.',
    externalCanaryResult
      ? '- External canary artifacts store only key presence, explicit opt-in status, and execution status.'
      : '- External canary lane was not materialized as a separate artifact in this mode.',
    '- No `DATABASE_URL`, provider key, credential path, SDK payload, raw data, checkpoint, or artifact payload value is stored.',
    '',
  ].join('\n')}\n`;
}

function renderBlockers(manifest, reportStatus, preflightResult, deterministicResult, realLocalDbResult, externalCanaryResult) {
  if (preflightResult?.blockers.length) {
    return `${[
      '# Blockers',
      '',
      ...preflightResult.blockers.map((item) => `- \`${item.code}\`: ${item.message}`),
      '',
      '## Required Actions',
      '',
      ...preflightResult.blockers.map((item) => `- ${item.action}`),
      '',
    ].join('\n')}\n`;
  }
  if (deterministicResult?.blockers.length) {
    return `${[
      '# Blockers',
      '',
      ...deterministicResult.blockers.map((item) => `- \`${item.code}\`: ${item.message}`),
      '',
      '## Required Actions',
      '',
      ...deterministicResult.blockers.map((item) => `- ${item.action}`),
      ...(preflightResult?.warnings.length ? ['', '## Warnings', '', ...preflightResult.warnings.map((item) => `- \`${item.code}\`: ${item.message}`)] : []),
      '',
    ].join('\n')}\n`;
  }
  if (realLocalDbResult?.blockers.length) {
    return `${[
      '# Blockers',
      '',
      ...realLocalDbResult.blockers.map((item) => `- \`${item.code}\`: ${item.message}`),
      '',
      '## Required Actions',
      '',
      ...realLocalDbResult.blockers.map((item) => `- ${item.action}`),
      ...(preflightResult?.warnings.length ? ['', '## Warnings', '', ...preflightResult.warnings.map((item) => `- \`${item.code}\`: ${item.message}`)] : []),
      '',
    ].join('\n')}\n`;
  }
  if (externalCanaryResult?.blockers.length) {
    return `${[
      '# Blockers',
      '',
      ...externalCanaryResult.blockers.map((item) => `- \`${item.code}\`: ${item.message}`),
      '',
      '## Required Actions',
      '',
      ...externalCanaryResult.blockers.map((item) => `- ${item.action}`),
      ...(preflightResult?.warnings.length ? ['', '## Warnings', '', ...preflightResult.warnings.map((item) => `- \`${item.code}\`: ${item.message}`)] : []),
      '',
    ].join('\n')}\n`;
  }
  if (preflightResult) {
    return `${[
      '# Blockers',
      '',
      '- None.',
      ...(preflightResult.warnings.length ? ['', '## Warnings', '', ...preflightResult.warnings.map((item) => `- \`${item.code}\`: ${item.message}`)] : []),
      '',
    ].join('\n')}\n`;
  }

  if (reportStatus === 'CONTRACT_READY') {
    return `${[
      '# Blockers',
      '',
      '- None for command-contract generation.',
      '- `preflight`, `deterministic`, `real-local-db`, and `full` are implemented.',
      '',
    ].join('\n')}\n`;
  }

  return `${[
    '# Blockers',
    '',
    `- Requested mode \`${manifest.mode_requested}\` did not produce a successful T-103 result.`,
    '- Re-run with `--mode contract`, `--mode preflight`, `--mode deterministic`, `--mode real-local-db`, or `--mode full`.',
    '',
  ].join('\n')}\n`;
}

async function runPreflight(options) {
  const startedAt = new Date().toISOString();
  const envResolution = await loadLocalEnvironment();
  const checks = [];
  const rootEnvLocal = envResolution.files.find((file) => file.relative_path === '.env.local');
  checks.push(checkFromCondition(
    'env-local-present',
    Boolean(rootEnvLocal?.exists),
    '.env.local is present',
    '.env.local is missing',
    'Run `pnpm env:dev:compile` or `pnpm backend:dev:prisma:setup` to generate the local env file.',
  ));

  const databaseUrlCheck = checkDatabaseUrl(envResolution);
  checks.push(databaseUrlCheck);

  if (databaseUrlCheck.status !== 'fail') {
    checks.push(await checkPostgresConnectivity(envResolution.database_url));
    checks.push(await checkPrismaMigrationStatus(envResolution.env));
  }

  checks.push(await checkLocalScriptConfiguration(envResolution.env));
  checks.push(await checkPortAvailability('desktop-smoke-backend-port', envResolution.env.DESKTOP_SMOKE_BACKEND_PORT, DEFAULT_BACKEND_SMOKE_PORT));
  checks.push(await checkPortAvailability('desktop-smoke-renderer-port', envResolution.env.DESKTOP_SMOKE_PORT, DEFAULT_DESKTOP_SMOKE_PORT));
  checks.push(checkExternalCanaryReadiness(envResolution.env, options.includeExternalCanary));

  const blockers = checks
    .filter((check) => check.status === 'fail')
    .map((check) => ({
      code: check.check_id,
      message: check.summary,
      action: check.action,
    }));
  const warnings = checks
    .filter((check) => check.status === 'warn')
    .map((check) => ({
      code: check.check_id,
      message: check.summary,
      action: check.action,
    }));
  const summary = {
    pass_count: checks.filter((check) => check.status === 'pass').length,
    warn_count: warnings.length,
    fail_count: blockers.length,
  };

  return {
    runner_version: RUNNER_VERSION,
    mode: 'preflight',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: blockers.length > 0
      ? 'PREFLIGHT_FAILED'
      : warnings.length > 0
        ? 'PREFLIGHT_PASSED_WITH_WARNINGS'
        : 'PREFLIGHT_PASSED',
    summary,
    environment: {
      env_files: envResolution.files,
      database_url: {
        present: Boolean(envResolution.database_url),
        source: envResolution.database_url_source,
        parse_status: databaseUrlCheck.status === 'fail' ? 'invalid_or_missing' : 'valid',
      },
      redaction: {
        database_url_value_stored: false,
        provider_key_values_stored: false,
        credential_paths_stored: false,
      },
    },
    checks,
    blockers,
    warnings,
  };
}

async function runDeterministic(manifest) {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  const commands = [];

  for (const commandSpec of manifest.deterministic_command_inventory) {
    const result = await runCommand(commandSpec.argv, {
      captureOutput: true,
      cwd: path.resolve(REPO_ROOT, commandSpec.cwd),
      timeoutMs: commandSpec.timeout_ms,
    });
    const status = result.timed_out
      ? 'timeout'
      : result.exit_code === 0
        ? 'pass'
        : 'fail';
    commands.push({
      command_id: commandSpec.command_id,
      lane_id: commandSpec.lane_id,
      cwd: commandSpec.cwd,
      display: commandSpec.display,
      timeout_ms: commandSpec.timeout_ms,
      status,
      exit_code: result.exit_code,
      signal: result.signal,
      timed_out: result.timed_out,
      duration_ms: result.duration_ms,
      output_summary: result.output_summary,
    });
  }

  const blockers = commands
    .filter((commandResult) => commandResult.status !== 'pass')
    .map((commandResult) => ({
      code: commandResult.command_id,
      message: `Deterministic command ${commandResult.display} ${commandResult.status === 'timeout' ? 'timed out' : `failed with exit code ${commandResult.exit_code}`}.`,
      action: `Inspect ${relativePath(path.join(artifactDir, '06-deterministic.md'))} and rerun \`${commandResult.display}\` from \`${commandResult.cwd}\`.`,
    }));

  const durationMs = Date.now() - startedAtMs;
  const timeoutCount = commands.filter((commandResult) => commandResult.status === 'timeout').length;
  const failCount = commands.filter((commandResult) => commandResult.status === 'fail').length;
  const passCount = commands.filter((commandResult) => commandResult.status === 'pass').length;

  return {
    runner_version: RUNNER_VERSION,
    mode: 'deterministic',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: blockers.length > 0 ? 'DETERMINISTIC_FAILED' : 'DETERMINISTIC_PASSED',
    summary: {
      command_count: commands.length,
      pass_count: passCount,
      fail_count: failCount,
      timeout_count: timeoutCount,
      duration_ms: durationMs,
    },
    commands,
    blockers,
    redaction: {
      raw_output_stored: false,
      redacted_output_tails_stored: true,
      database_url_values_stored: false,
      provider_key_values_stored: false,
      credential_paths_stored: false,
    },
  };
}

async function runRealLocalDbSmoke(runId) {
  const startedAtMs = Date.now();
  const startedAt = new Date().toISOString();
  const envResolution = await loadLocalEnvironment();
  const schemaName = disposableSchemaName(runId);
  const disposableDatabaseUrl = databaseUrlWithSchema(envResolution.database_url, schemaName);
  const steps = [];
  const blockers = [];
  let schemaCreated = false;
  let schemaDropped = false;

  const recordId = `real_local_db_dataset_${schemaName}`;
  const readinessId = `real_local_db_readiness_${schemaName}`;
  const jobId = `real_local_db_job_${schemaName}`;

  try {
    assertStepPassed(await runStep(steps, 'create-disposable-schema', async () => {
      const prisma = await createPrismaClient(envResolution.database_url);
      try {
        await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        schemaCreated = true;
      } finally {
        await prisma.$disconnect().catch(() => undefined);
      }
      return {
        disposable_schema: schemaName,
        database_url_value_stored: false,
      };
    }));

    assertStepPassed(await runStep(steps, 'apply-migrations-to-disposable-schema', async () => {
      const result = await runCommand(
        ['pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
        {
          env: { DATABASE_URL: disposableDatabaseUrl },
          timeoutMs: 120_000,
        },
      );
      if (result.exit_code !== 0) {
        throw new Error(`Prisma migrate deploy failed with exit code ${result.exit_code}.`);
      }
      return {
        raw_output_stored: false,
      };
    }));

    assertStepPassed(await runStep(steps, 'round-trip-experiment-foundation-record', async () => {
      const prisma = await createPrismaClient(disposableDatabaseUrl);
      const nowDate = new Date();
      try {
        await prisma.experimentFoundationRecord.create({
          data: {
            id: `ef_record_${schemaName}`,
            recordKind: 'dataset_asset',
            recordId,
            recordHash: `sha256:${schemaName}_record`,
            status: 'active',
            family: 'dataset',
            payload: {
              dataset_asset_id: recordId,
              name: 'Real Local DB Smoke Dataset',
              catalog_status: 'active',
            },
            sourceRefs: [{ ref_type: 't103_runner', ref_id: runId }],
            traceabilityRefs: [{ ref_type: 'full_flow_run', ref_id: runId }],
            createdAt: nowDate,
            updatedAt: nowDate,
          },
        });
        const stored = await prisma.experimentFoundationRecord.findUnique({
          where: {
            recordKind_recordId: {
              recordKind: 'dataset_asset',
              recordId,
            },
          },
        });
        if (!stored || stored.recordId !== recordId) {
          throw new Error('ExperimentFoundationRecord round-trip did not return the created record.');
        }
      } finally {
        await prisma.$disconnect().catch(() => undefined);
      }
      return {
        record_kind: 'dataset_asset',
        record_id: recordId,
      };
    }));

    assertStepPassed(await runStep(steps, 'round-trip-readiness-report', async () => {
      const prisma = await createPrismaClient(disposableDatabaseUrl);
      const nowDate = new Date();
      try {
        await prisma.experimentFoundationReadinessReport.create({
          data: {
            id: readinessId,
            targetKind: 'dataset_asset',
            targetId: recordId,
            readinessStatus: 'passed',
            readinessHash: `sha256:${schemaName}_readiness`,
            blockers: [],
            warnings: [],
            requiredActions: [],
            sourceRefs: [{ ref_type: 't103_runner', ref_id: runId }],
            checkedAt: nowDate,
            createdAt: nowDate,
          },
        });
        const stored = await prisma.experimentFoundationReadinessReport.findFirst({
          where: {
            targetKind: 'dataset_asset',
            targetId: recordId,
          },
          orderBy: { createdAt: 'desc' },
        });
        if (!stored || stored.id !== readinessId || stored.readinessStatus !== 'passed') {
          throw new Error('ExperimentFoundationReadinessReport round-trip did not return the created report.');
        }
      } finally {
        await prisma.$disconnect().catch(() => undefined);
      }
      return {
        readiness_report_id: readinessId,
        readiness_status: 'passed',
      };
    }));

    assertStepPassed(await runStep(steps, 'round-trip-external-training-job', async () => {
      const prisma = await createPrismaClient(disposableDatabaseUrl);
      const nowDate = new Date();
      try {
        await prisma.experimentFoundationExternalTrainingJob.create({
          data: {
            id: `ef_job_${schemaName}`,
            externalJobId: jobId,
            trainingTaskSpecId: `task_spec_${schemaName}`,
            trainingTaskSpecHash: `sha256:${schemaName}_task_spec`,
            materializationResultId: `materialization_${schemaName}`,
            materializationResultHash: `sha256:${schemaName}_materialization`,
            adapterKind: 'local_script',
            adapterVersion: 't103-real-local-db-smoke',
            platformKind: 'local',
            platformId: 'local_smoke',
            idempotencyKey: `idem_${schemaName}`,
            externalJobRef: { ref_type: 'local_script_job', ref_id: jobId },
            externalJobHash: `sha256:${schemaName}_external_job`,
            jobStatus: 'succeeded',
            submittedAt: nowDate,
            lastSyncedAt: nowDate,
            completedAt: nowDate,
            stageEventRefs: [],
            partialResultRefs: [],
            resultRefs: [],
            adapterMetadataRefs: [],
            adapterMetadataHashes: [],
            traceabilityRefs: [{ ref_type: 'full_flow_run', ref_id: runId }],
            payload: {},
            createdAt: nowDate,
            updatedAt: nowDate,
          },
        });
        const stored = await prisma.experimentFoundationExternalTrainingJob.findUnique({
          where: { externalJobId: jobId },
        });
        if (!stored || stored.externalJobId !== jobId || stored.jobStatus !== 'succeeded') {
          throw new Error('ExperimentFoundationExternalTrainingJob round-trip did not return the created job.');
        }
      } finally {
        await prisma.$disconnect().catch(() => undefined);
      }
      return {
        external_job_id: jobId,
        job_status: 'succeeded',
      };
    }));
  } catch (error) {
    blockers.push({
      code: 'real-local-db-smoke',
      message: safeErrorMessage(error),
      action: 'Inspect 08-real-local-db.md, confirm local Postgres permissions can create/drop disposable schemas, and rerun `--mode real-local-db`.',
    });
  } finally {
    if (schemaCreated) {
      const cleanupStep = await runStep(steps, 'drop-disposable-schema', async () => {
        const prisma = await createPrismaClient(envResolution.database_url);
        try {
          await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
          schemaDropped = true;
        } finally {
          await prisma.$disconnect().catch(() => undefined);
        }
        return {
          disposable_schema: schemaName,
        };
      });
      if (cleanupStep.status !== 'pass') {
        blockers.push({
          code: 'drop-disposable-schema',
          message: cleanupStep.summary,
          action: `Drop disposable schema "${schemaName}" manually after confirming it contains only T-103 smoke data.`,
        });
      }
    }
  }

  const passCount = steps.filter((step) => step.status === 'pass').length;
  const failCount = steps.filter((step) => step.status === 'fail').length;
  return {
    runner_version: RUNNER_VERSION,
    mode: 'real-local-db',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: blockers.length > 0 ? 'REAL_LOCAL_DB_FAILED' : 'REAL_LOCAL_DB_PASSED',
    disposable_schema: schemaName,
    summary: {
      pass_count: passCount,
      fail_count: failCount,
      duration_ms: Date.now() - startedAtMs,
    },
    steps,
    blockers,
    cleanup: {
      schema_created: schemaCreated,
      schema_dropped: schemaDropped,
    },
    redaction: {
      database_url_value_stored: false,
      raw_migration_output_stored: false,
      raw_payload_values_stored: false,
    },
  };
}

async function runExternalCanaryLane(options) {
  const startedAt = new Date().toISOString();
  const checks = [];

  if (!options.includeExternalCanary) {
    checks.push({
      check_id: 'external-canary-default-skip',
      status: 'skip',
      summary: 'External canary is skipped by default',
      detail: {
        include_external_canary: false,
        real_submission_executed: false,
      },
      action: 'Rerun with `--include-external-canary` only after the external canary environment is explicitly configured.',
    });
  } else {
    const envResolution = await loadLocalEnvironment();
    const externalEnabled = ['true', '1', 'yes'].includes((envResolution.env.EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED ?? '').trim().toLowerCase());
    const provider = envResolution.env.EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_PROVIDER?.trim() || 'aliyun_pai_dlc';
    const hasAliyunCredentialPair = Boolean(
      (envResolution.env.ALIYUN_ACCESS_KEY_ID && envResolution.env.ALIYUN_ACCESS_KEY_SECRET)
        || (envResolution.env.ALIBABA_CLOUD_ACCESS_KEY_ID && envResolution.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET),
    );

    checks.push(passCheck('external-canary-requested', 'External canary was explicitly requested by CLI flag', {
      include_external_canary: true,
    }));
    checks.push(checkFromCondition(
      'external-canary-explicit-enable',
      externalEnabled,
      'External canary environment opt-in is enabled',
      'External canary requires EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED=true',
      'Set EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED=true in the approved local env only when an external canary is intentionally allowed.',
      {
        env_key_present: Boolean(envResolution.env.EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED),
        env_value_stored: false,
      },
    ));
    checks.push(checkFromCondition(
      'external-canary-provider-supported',
      provider === 'aliyun_pai_dlc',
      'External canary provider is supported by the current contract',
      'External canary provider is not supported by the current contract',
      'Set EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_PROVIDER=aliyun_pai_dlc or run without `--include-external-canary`.',
      {
        provider_kind: provider || 'aliyun_pai_dlc',
      },
    ));
    checks.push(checkFromCondition(
      'external-canary-credentials',
      hasAliyunCredentialPair,
      'External canary credential key names are present',
      'External canary was requested but required Aliyun credential key names are missing',
      'Provide credential material through the approved local secret mechanism or rerun without `--include-external-canary`.',
      {
        credential_values_stored: false,
        credential_paths_stored: false,
      },
    ));
    checks.push(passCheck('external-canary-submit-boundary', 'No real external submission is executed by T-103 closure mode', {
      real_submission_executed: false,
      sdk_payload_stored: false,
      adapter_private_payload_stored: false,
    }));
  }

  const blockers = checks
    .filter((check) => check.status === 'fail')
    .map((check) => ({
      code: check.check_id,
      message: check.summary,
      action: check.action,
    }));
  const summary = {
    pass_count: checks.filter((check) => check.status === 'pass').length,
    skip_count: checks.filter((check) => check.status === 'skip').length,
    fail_count: blockers.length,
  };

  return {
    runner_version: RUNNER_VERSION,
    mode: 'external-canary',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: !options.includeExternalCanary
      ? 'EXTERNAL_CANARY_SKIPPED'
      : blockers.length > 0
        ? 'EXTERNAL_CANARY_BLOCKED'
        : 'EXTERNAL_CANARY_PASSED',
    include_external_canary: options.includeExternalCanary,
    real_submission_executed: false,
    summary,
    checks,
    blockers,
    redaction: {
      provider_key_values_stored: false,
      credential_paths_stored: false,
      sdk_payload_stored: false,
      adapter_private_payload_stored: false,
    },
  };
}

async function loadLocalEnvironment() {
  const env = { ...process.env };
  const sources = new Map(Object.keys(process.env).map((key) => [key, 'process.env']));
  const files = [
    path.join(REPO_ROOT, '.env.local'),
    path.join(REPO_ROOT, '.env'),
    path.join(REPO_ROOT, 'apps/backend/.env.local'),
    path.join(REPO_ROOT, 'apps/backend/.env'),
  ];
  const fileReports = [];

  for (const filePath of files) {
    let content = null;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }

    if (content === null) {
      fileReports.push({
        relative_path: relativePath(filePath),
        exists: false,
        loaded_key_count: 0,
      });
      continue;
    }

    let loadedKeyCount = 0;
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || env[parsed.key] !== undefined) {
        continue;
      }
      env[parsed.key] = parsed.value;
      sources.set(parsed.key, relativePath(filePath));
      loadedKeyCount += 1;
    }
    fileReports.push({
      relative_path: relativePath(filePath),
      exists: true,
      loaded_key_count: loadedKeyCount,
    });
  }

  return {
    env,
    files: fileReports,
    database_url: env.DATABASE_URL?.trim() || null,
    database_url_source: sources.get('DATABASE_URL') ?? null,
  };
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const declaration = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
  const separatorIndex = declaration.indexOf('=');
  if (separatorIndex <= 0) {
    return null;
  }

  const key = declaration.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }
  return {
    key,
    value: parseEnvValue(declaration.slice(separatorIndex + 1).trim()),
  };
}

function parseEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replaceAll('\\n', '\n')
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

function checkDatabaseUrl(envResolution) {
  if (!envResolution.database_url) {
    return failCheck(
      'database-url-present',
      'DATABASE_URL is missing after local env resolution',
      'Run `pnpm env:dev:compile` and ensure the database URL secret material exists.',
    );
  }

  try {
    const parsed = new URL(envResolution.database_url);
    if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
      return failCheck(
        'database-url-valid',
        'DATABASE_URL must use a PostgreSQL protocol',
        'Update the local database URL secret and re-run `pnpm env:dev:compile`.',
      );
    }
    return passCheck('database-url-valid', 'DATABASE_URL is present and parseable', {
      source: envResolution.database_url_source,
      protocol: parsed.protocol.replace(':', ''),
      raw_value_stored: false,
    });
  } catch {
    return failCheck(
      'database-url-valid',
      'DATABASE_URL is present but not parseable',
      'Update the local database URL secret and re-run `pnpm env:dev:compile`.',
    );
  }
}

async function checkPostgresConnectivity(databaseUrl) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await withTimeout(prisma.$queryRawUnsafe('SELECT 1'), 7_500, 'Postgres connectivity timed out.');
    return passCheck('postgres-connectivity', 'Postgres accepted a lightweight connectivity query');
  } catch (error) {
    return failCheck(
      'postgres-connectivity',
      `Postgres connectivity failed: ${safeErrorMessage(error)}`,
      'Start local Postgres, verify `.env.local`, and confirm the configured database is reachable.',
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function checkPrismaMigrationStatus(env) {
  const result = await runCommand(
    ['pnpm', 'exec', 'prisma', 'migrate', 'status', '--schema', 'prisma/schema.prisma'],
    { env, timeoutMs: 20_000 },
  );
  if (result.exit_code === 0) {
    return passCheck('prisma-migration-status', 'Prisma migration status completed successfully', {
      duration_ms: result.duration_ms,
      raw_output_stored: false,
    });
  }
  return failCheck(
    'prisma-migration-status',
    `Prisma migration status failed with exit code ${result.exit_code}`,
    'Inspect local migrations and run `pnpm db:dev:migrate` after confirming the target database.',
    {
      duration_ms: result.duration_ms,
      raw_output_stored: false,
    },
  );
}

async function checkLocalScriptConfiguration(env) {
  const root = env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT?.trim()
    || path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-local-execution');
  const enabled = ['true', '1', 'yes'].includes((env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED ?? '').trim().toLowerCase());
  const allowlist = (env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const rootExists = await pathExists(root);
  const details = {
    execution_root_source: env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT ? 'configured' : 'default',
    execution_root_exists: rootExists,
    execution_enabled: enabled,
    allowlist_configured: allowlist.length > 0,
    raw_paths_stored: false,
    allowlist_values_stored: false,
  };
  const warnings = [];
  if (!rootExists) {
    warnings.push('execution root does not exist yet');
  }
  if (!enabled) {
    warnings.push('local execution is not explicitly enabled outside test mode');
  }
  if (allowlist.length === 0) {
    warnings.push('local script command allowlist is empty');
  }
  if (warnings.length === 0) {
    return passCheck('localscript-configuration', 'LocalScript execution root and allowlist are configured', details);
  }
  return warnCheck(
    'localscript-configuration',
    `LocalScript configuration is incomplete: ${warnings.join('; ')}`,
    'Set EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT, EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED=true, and EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS before real LocalScript execution.',
    details,
  );
}

async function checkPortAvailability(checkId, rawPort, fallbackPort) {
  const requestedPort = parsePort(rawPort, fallbackPort);
  const requestedAvailable = await isPortAvailable(requestedPort);
  if (requestedAvailable) {
    return passCheck(checkId, `Port ${requestedPort} is available`, {
      requested_port: requestedPort,
      available: true,
    });
  }

  const alternativePort = await findAvailablePort(requestedPort + 1, 50);
  if (alternativePort !== null) {
    return warnCheck(
      checkId,
      `Port ${requestedPort} is occupied; alternative port ${alternativePort} is available`,
      `Set ${checkId === 'desktop-smoke-backend-port' ? 'DESKTOP_SMOKE_BACKEND_PORT' : 'DESKTOP_SMOKE_PORT'}=${alternativePort} for the smoke run.`,
      {
        requested_port: requestedPort,
        available: false,
        suggested_port: alternativePort,
      },
    );
  }

  return failCheck(
    checkId,
    `Port ${requestedPort} is occupied and no nearby alternative was found`,
    'Stop the conflicting process or set an explicit smoke port environment variable.',
    {
      requested_port: requestedPort,
      available: false,
      suggested_port: null,
    },
  );
}

function checkExternalCanaryReadiness(env, includeExternalCanary) {
  if (!includeExternalCanary) {
    return passCheck('external-canary-default-skip', 'External canary is skipped by default', {
      include_external_canary: false,
    });
  }
  const externalEnabled = ['true', '1', 'yes'].includes((env.EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED ?? '').trim().toLowerCase());
  const provider = env.EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_PROVIDER?.trim() || 'aliyun_pai_dlc';
  const providerSupported = provider === 'aliyun_pai_dlc';
  const hasAliyunCredentialPair = Boolean(
    (env.ALIYUN_ACCESS_KEY_ID && env.ALIYUN_ACCESS_KEY_SECRET)
      || (env.ALIBABA_CLOUD_ACCESS_KEY_ID && env.ALIBABA_CLOUD_ACCESS_KEY_SECRET),
  );
  if (externalEnabled && providerSupported && hasAliyunCredentialPair) {
    return passCheck('external-canary-readiness', 'External canary explicit opt-in, supported provider, and credential key names are present', {
      include_external_canary: true,
      explicit_env_enabled: true,
      provider_kind: provider,
      credential_values_stored: false,
    });
  }
  const missing = [
    ...(externalEnabled ? [] : ['EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED=true']),
    ...(providerSupported ? [] : ['EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_PROVIDER=aliyun_pai_dlc']),
    ...(hasAliyunCredentialPair ? [] : ['Aliyun credential key names']),
  ];
  return failCheck(
    'external-canary-readiness',
    `External canary was requested but required opt-in material is missing: ${missing.join(', ')}`,
    'Set EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_ENABLED=true, set EXPERIMENT_FOUNDATION_EXTERNAL_CANARY_PROVIDER=aliyun_pai_dlc, provide credential material through the approved local secret mechanism, or rerun without `--include-external-canary`.',
    {
      include_external_canary: true,
      explicit_env_enabled: externalEnabled,
      explicit_env_value_stored: false,
      provider_kind: provider,
      credential_values_stored: false,
    },
  );
}

function renderPreflightMarkdown(preflightResult) {
  const rows = preflightResult.checks
    .map((check) => `| \`${check.check_id}\` | \`${check.status}\` | ${check.summary} |`)
    .join('\n');
  return `${[
    '# Experiment Foundation Preflight',
    '',
    `- Status: \`${preflightResult.status}\``,
    `- Runner version: \`${preflightResult.runner_version}\``,
    `- Started: \`${preflightResult.started_at}\``,
    `- Finished: \`${preflightResult.finished_at}\``,
    `- Passed: \`${preflightResult.summary.pass_count}\``,
    `- Warnings: \`${preflightResult.summary.warn_count}\``,
    `- Blockers: \`${preflightResult.summary.fail_count}\``,
    '',
    '| Check | Status | Summary |',
    '| --- | --- | --- |',
    rows,
    '',
    '## Redaction',
    '',
    '- Raw `DATABASE_URL` values are not stored.',
    '- Provider key values and credential paths are not stored.',
    '- Prisma command output is summarized by exit status only.',
    '',
  ].join('\n')}\n`;
}

function renderDeterministicMarkdown(deterministicResult) {
  const commandRows = deterministicResult.commands
    .map((commandResult) =>
      `| \`${commandResult.command_id}\` | \`${commandResult.status}\` | \`${commandResult.exit_code ?? commandResult.signal ?? 'n/a'}\` | \`${commandResult.duration_ms}ms\` |`
    )
    .join('\n');
  const failedCommands = deterministicResult.commands.filter((commandResult) => commandResult.status !== 'pass');
  return `${[
    '# Experiment Foundation Deterministic Lane',
    '',
    `- Status: \`${deterministicResult.status}\``,
    `- Runner version: \`${deterministicResult.runner_version}\``,
    `- Started: \`${deterministicResult.started_at}\``,
    `- Finished: \`${deterministicResult.finished_at}\``,
    `- Commands: \`${deterministicResult.summary.command_count}\``,
    `- Passed: \`${deterministicResult.summary.pass_count}\``,
    `- Failed: \`${deterministicResult.summary.fail_count}\``,
    `- Timed out: \`${deterministicResult.summary.timeout_count}\``,
    `- Duration: \`${deterministicResult.summary.duration_ms}ms\``,
    '',
    '| Command | Status | Exit/Signal | Duration |',
    '| --- | --- | --- | --- |',
    commandRows,
    '',
    ...(failedCommands.length ? [
      '## Failed Command Output Tails',
      '',
      ...failedCommands.flatMap((commandResult) => [
        `### ${commandResult.command_id}`,
        '',
        `- CWD: \`${commandResult.cwd}\``,
        `- Command: \`${commandResult.display}\``,
        `- Status: \`${commandResult.status}\``,
        '',
        'Stdout tail:',
        '',
        '```text',
        markdownOutputTail(commandResult.output_summary.stdout_tail),
        '```',
        '',
        'Stderr tail:',
        '',
        '```text',
        markdownOutputTail(commandResult.output_summary.stderr_tail),
        '```',
        '',
      ]),
    ] : [
      '## Failed Command Output Tails',
      '',
      '- None.',
      '',
    ]),
    '## Redaction',
    '',
    '- Output tails are redacted and bounded.',
    '- Raw unbounded stdout/stderr are not stored.',
    '- `DATABASE_URL`, provider key values, credential paths, SDK payloads, raw datasets, checkpoints, and artifact payload values are not stored.',
    '',
  ].join('\n')}\n`;
}

function renderRealLocalDbMarkdown(realLocalDbResult) {
  const stepRows = realLocalDbResult.steps
    .map((step) => `| \`${step.step_id}\` | \`${step.status}\` | \`${step.duration_ms}ms\` | ${step.summary} |`)
    .join('\n');
  return `${[
    '# Experiment Foundation Real Local DB Lane',
    '',
    `- Status: \`${realLocalDbResult.status}\``,
    `- Runner version: \`${realLocalDbResult.runner_version}\``,
    `- Started: \`${realLocalDbResult.started_at}\``,
    `- Finished: \`${realLocalDbResult.finished_at}\``,
    `- Disposable schema: \`${realLocalDbResult.disposable_schema}\``,
    `- Disposable schema dropped: \`${realLocalDbResult.cleanup.schema_dropped}\``,
    `- Passed: \`${realLocalDbResult.summary.pass_count}\``,
    `- Failed: \`${realLocalDbResult.summary.fail_count}\``,
    `- Duration: \`${realLocalDbResult.summary.duration_ms}ms\``,
    '',
    '| Step | Status | Duration | Summary |',
    '| --- | --- | --- | --- |',
    stepRows,
    '',
    ...(realLocalDbResult.blockers.length ? [
      '## Blockers',
      '',
      ...realLocalDbResult.blockers.map((blocker) => `- \`${blocker.code}\`: ${blocker.message}`),
      '',
    ] : [
      '## Blockers',
      '',
      '- None.',
      '',
    ]),
    '## Redaction',
    '',
    '- Raw `DATABASE_URL` values are not stored.',
    '- Raw Prisma migration output is not stored.',
    '- Smoke payloads use synthetic refs/hashes only.',
    '',
  ].join('\n')}\n`;
}

function renderExternalCanaryMarkdown(externalCanaryResult) {
  const checkRows = externalCanaryResult.checks
    .map((check) => `| \`${check.check_id}\` | \`${check.status}\` | ${check.summary} |`)
    .join('\n');
  return `${[
    '# Experiment Foundation External Canary Lane',
    '',
    `- Status: \`${externalCanaryResult.status}\``,
    `- Runner version: \`${externalCanaryResult.runner_version}\``,
    `- Started: \`${externalCanaryResult.started_at}\``,
    `- Finished: \`${externalCanaryResult.finished_at}\``,
    `- Include external canary: \`${externalCanaryResult.include_external_canary}\``,
    `- Real submission executed: \`${externalCanaryResult.real_submission_executed}\``,
    `- Passed: \`${externalCanaryResult.summary.pass_count}\``,
    `- Skipped: \`${externalCanaryResult.summary.skip_count}\``,
    `- Blockers: \`${externalCanaryResult.summary.fail_count}\``,
    '',
    '| Check | Status | Summary |',
    '| --- | --- | --- |',
    checkRows,
    '',
    ...(externalCanaryResult.blockers.length ? [
      '## Blockers',
      '',
      ...externalCanaryResult.blockers.map((blocker) => `- \`${blocker.code}\`: ${blocker.message}`),
      '',
    ] : [
      '## Blockers',
      '',
      '- None.',
      '',
    ]),
    '## Redaction',
    '',
    '- Provider key values and credential paths are not stored.',
    '- SDK payloads and adapter-private payloads are not stored.',
    '- T-103 closure mode does not submit real external jobs.',
    '',
  ].join('\n')}\n`;
}

function checkFromCondition(checkId, condition, passSummary, failSummary, action, detail = {}) {
  return condition ? passCheck(checkId, passSummary, detail) : failCheck(checkId, failSummary, action, detail);
}

function passCheck(checkId, summary, detail = {}) {
  return {
    check_id: checkId,
    status: 'pass',
    summary,
    detail,
    action: null,
  };
}

function warnCheck(checkId, summary, action, detail = {}) {
  return {
    check_id: checkId,
    status: 'warn',
    summary,
    detail,
    action,
  };
}

function failCheck(checkId, summary, action, detail = {}) {
  return {
    check_id: checkId,
    status: 'fail',
    summary,
    detail,
    action,
  };
}

async function runStep(steps, stepId, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    const step = {
      step_id: stepId,
      status: 'pass',
      summary: `${stepId} completed`,
      duration_ms: Date.now() - startedAt,
      detail,
    };
    steps.push(step);
    return step;
  } catch (error) {
    const step = {
      step_id: stepId,
      status: 'fail',
      summary: safeErrorMessage(error),
      duration_ms: Date.now() - startedAt,
      detail: {
        raw_error_stored: false,
      },
    };
    steps.push(step);
    return step;
  }
}

function assertStepPassed(step) {
  if (step.status !== 'pass') {
    throw new Error(step.summary);
  }
}

async function createPrismaClient(databaseUrl) {
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

function databaseUrlWithSchema(rawDatabaseUrl, schemaName) {
  const parsed = new URL(rawDatabaseUrl);
  parsed.searchParams.set('schema', schemaName);
  return parsed.toString();
}

function disposableSchemaName(runId) {
  const base = runId
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'run';
  const suffix = Date.now().toString(36);
  return `ef_ff_${base}_${suffix}`.slice(0, 60);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parsePort(rawPort, fallbackPort) {
  const parsed = Number.parseInt(String(rawPort ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : fallbackPort;
}

async function findAvailablePort(startPort, maxAttempts) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    if (port >= 65_536) {
      return null;
    }
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function runCommand(argv, options = {}) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    let stdoutTail = '';
    let stderrTail = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const cwd = options.cwd ?? REPO_ROOT;
    const env = options.env
      ? {
        ...process.env,
        ...options.env,
      }
      : process.env;
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      detached: USE_PROCESS_GROUP_SIGNALS,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      stdoutBytes += Buffer.byteLength(text);
      if (options.captureOutput) {
        const appended = appendBoundedTail(stdoutTail, text);
        stdoutTail = appended.value;
        stdoutTruncated ||= appended.truncated;
      }
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      stderrBytes += Buffer.byteLength(text);
      if (options.captureOutput) {
        const appended = appendBoundedTail(stderrTail, text);
        stderrTail = appended.value;
        stderrTruncated ||= appended.truncated;
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      signalChildProcessTree(child, 'SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          signalChildProcessTree(child, 'SIGKILL');
        }
      }, COMMAND_TIMEOUT_GRACE_MS).unref();
    }, options.timeoutMs ?? 120_000);
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        exit_code: 1,
        signal: null,
        timed_out: timedOut,
        duration_ms: Date.now() - startedAt,
        output_summary: options.captureOutput
          ? buildOutputSummary(stdoutTail, stderrTail || safeErrorMessage(error), stdoutTruncated, stderrTruncated, stdoutBytes, stderrBytes)
          : undefined,
      });
    });
    child.on('exit', (code, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (!timedOut) {
        signalChildProcessTree(child, 'SIGTERM');
      }
      resolve({
        exit_code: code ?? 1,
        signal,
        timed_out: timedOut,
        duration_ms: Date.now() - startedAt,
        output_summary: options.captureOutput
          ? buildOutputSummary(stdoutTail, stderrTail, stdoutTruncated, stderrTruncated, stdoutBytes, stderrBytes)
          : undefined,
      });
    });
  });
}

function signalChildProcessTree(child, signal) {
  if (child.pid === undefined) {
    return;
  }
  if (!USE_PROCESS_GROUP_SIGNALS) {
    child.kill(signal);
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function appendBoundedTail(current, chunk) {
  const next = `${current}${chunk}`;
  if (next.length <= COMMAND_OUTPUT_TAIL_CHARS) {
    return { value: next, truncated: false };
  }
  return {
    value: next.slice(-COMMAND_OUTPUT_TAIL_CHARS),
    truncated: true,
  };
}

function buildOutputSummary(stdoutTail, stderrTail, stdoutTruncated, stderrTruncated, stdoutBytes, stderrBytes) {
  return {
    stdout_tail: redactSensitiveText(stdoutTail),
    stderr_tail: redactSensitiveText(stderrTail),
    stdout_truncated: stdoutTruncated,
    stderr_truncated: stderrTruncated,
    stdout_bytes: stdoutBytes,
    stderr_bytes: stderrBytes,
    redaction_applied: true,
  };
}

function markdownOutputTail(value) {
  if (!value) {
    return '[empty]';
  }
  const trimmed = value.length > COMMAND_OUTPUT_MARKDOWN_CHARS
    ? value.slice(-COMMAND_OUTPUT_MARKDOWN_CHARS)
    : value;
  return trimmed.replaceAll('```', '` ` `');
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s'"`<>]+/giu, '[REDACTED_DATABASE_URL]')
    .replace(/(password|passwd|pwd)=([^&\s'"`<>]+)/giu, '$1=[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9._-]{12,}\b/g, '[REDACTED_API_KEY]')
    .replace(/\b(AKIA|ASIA|LTAI)[A-Za-z0-9]{12,}\b/g, '[REDACTED_ACCESS_KEY]')
    .replace(/((?:OPENAI|DASHSCOPE|DEEPSEEK|ALIYUN|ALIBABA|AWS)[A-Z0-9_]*(?:KEY|SECRET|TOKEN|CREDENTIAL)[A-Z0-9_]*\s*[=:]\s*)[^\s'"`<>]+/giu, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|access[_-]?key|secret[_-]?key|token|credential)\s*[=:]\s*)[^\s'"`<>]+/giu, '$1[REDACTED]');
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function safeErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return rawMessage
    .replace(/postgres(?:ql)?:\/\/\S+/giu, '[REDACTED_DATABASE_URL]')
    .replace(/(password|passwd|pwd)=([^&\s]+)/giu, '$1=[REDACTED]')
    .slice(0, 220);
}

function printHelp() {
  console.log([
    'Usage:',
    '  node .ai/scripts/experiment-foundation-full-flow-runner.mjs [options]',
    '  pnpm experiment-foundation:full-flow -- [options]',
    '',
    'Options:',
    '  --mode <contract|preflight|deterministic|real-local-db|full>   Default: contract',
    '  --run-id <id>                                                   Evidence run id',
    '  --artifact-dir <path>                                           Default: .ai/.tmp/experiment-foundation-full-flow/<run-id>',
    '  --include-external-canary                                       Enable external canary gate checks; still no real submit in T-103',
    '  --require-real-db                                               Treat real-local-db lane as required in manifest/reporting',
    '  --help, -h                                                      Show help',
    '',
    'T-103 closure supports contract, lightweight preflight, deterministic validation, real-local-db smoke, and full local closure modes.',
  ].join('\n'));
}

function relativePath(value) {
  return path.relative(REPO_ROOT, value).replaceAll('\\', '/') || '.';
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
