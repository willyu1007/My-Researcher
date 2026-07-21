#!/usr/bin/env node

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
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');

const singleOwner = (id, evidenceKey, ownerCheck = id) => ({
  id,
  owner_sub_gates: [evidenceKey],
  owner_checks: [ownerCheck],
});

export const PACKC_FINAL_CHECK_REGISTRY = Object.freeze([
  ...Array.from({ length: 7 }, (_, index) => singleOwner(
    `PC${String(index + 1).padStart(2, '0')}`,
    'packc_ef',
  )),
  ...Array.from({ length: 9 }, (_, index) => singleOwner(
    `PC${String(index + 8).padStart(2, '0')}`,
    'packc_pi',
  )),
  singleOwner('PC17', 'packc_cutover'),
  singleOwner('PC18', 'packc_cutover'),
  {
    id: 'PC19',
    owner_sub_gates: ['packc_ef', 'packc_pi'],
    owner_checks: ['PC19-EF', 'PC19-PI'],
  },
  singleOwner('PC20', 'packc_pi'),
]);

const EVIDENCE_KEYS = Object.freeze([
  'packc_ef', 'packc_pi', 'packc_cutover', 'backend_full_suite',
]);
const SUB_GATE_KEYS = Object.freeze(['packc_ef', 'packc_pi', 'packc_cutover']);
const SUB_GATE_CHECK_KEYS = Object.freeze({
  packc_ef: ['PC01', 'PC02', 'PC03', 'PC04', 'PC05', 'PC06', 'PC07', 'PC19-EF'],
  packc_pi: [
    'PC08', 'PC09', 'PC10', 'PC11', 'PC12', 'PC13', 'PC14', 'PC15',
    'PC16', 'PC17', 'PC19-PI', 'PC20',
  ],
  packc_cutover: ['PC17', 'PC18'],
});
const SUMMARY_KEYS = Object.freeze([
  'gate_id', 'status', 'started_at', 'finished_at', 'check_registry',
  'suite_totals', 'sub_gate_summary_sha256s', 'evidence', 'redaction',
  'environment_isolation', 'blockers', 'canonical_summary_sha256',
]);
const CHECK_KEYS = Object.freeze([
  'status', 'owner_sub_gates', 'owner_checks', 'details',
]);
const SUB_GATE_EVIDENCE_KEYS = Object.freeze([
  'gate_id', 'status', 'exit_code', 'duration_ms', 'summary_path',
  'canonical_summary_sha256', 'canonical_sha256_verified', 'check_statuses',
  'suite_totals',
]);
const BACKEND_EVIDENCE_KEYS = Object.freeze([
  'status', 'command_id', 'exit_code', 'duration_ms', 'tests', 'passed',
  'failed', 'skipped', 'conditional_skips', 'output_sha256',
  'sanitized_output_tail',
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
  if (!gateId || !/^packc-final-\d{8}-r[1-9]\d*$/.test(gateId)) {
    throw new Error('--run-id must match packc-final-<YYYYMMDD>-r<N>');
  }
  return { gateId };
}

export function deriveSubGateRuns(finalGateId) {
  const match = finalGateId.match(/^packc-final-(\d{8})-(r[1-9]\d*)$/);
  if (!match) throw new Error('Cannot derive sub-gate ids from invalid final gate id');
  const [, date, revision] = match;
  return {
    packc_ef: {
      gate_id: `packc-ef-${date}-${revision}`,
      script_path: '.ai/scripts/experiment-foundation-packc-ef-gate.mjs',
    },
    packc_pi: {
      gate_id: `packc-pi-${date}-${revision}`,
      script_path: '.ai/scripts/experiment-foundation-packc-pi-gate.mjs',
    },
    packc_cutover: {
      gate_id: `packc-cutover-${date}-${revision}`,
      script_path: '.ai/scripts/experiment-foundation-packc-cutover-gate.mjs',
    },
  };
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
    check_registry: Object.fromEntries(PACKC_FINAL_CHECK_REGISTRY.map((check) => [
      check.id,
      {
        status: 'not_run',
        owner_sub_gates: [...check.owner_sub_gates],
        owner_checks: [...check.owner_checks],
        details: null,
      },
    ])),
    suite_totals: {
      suites: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      blocked: 0,
    },
    sub_gate_summary_sha256s: Object.fromEntries(SUB_GATE_KEYS.map((key) => [key, null])),
    evidence: Object.fromEntries(EVIDENCE_KEYS.map((key) => [key, null])),
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
  assertExactKeys(summary.sub_gate_summary_sha256s, SUB_GATE_KEYS,
    'summary.sub_gate_summary_sha256s');
  assertExactKeys(summary.suite_totals, [
    'suites', 'tests', 'passed', 'failed', 'skipped', 'blocked',
  ], 'summary.suite_totals');
  assertExactKeys(
    summary.check_registry,
    PACKC_FINAL_CHECK_REGISTRY.map((row) => row.id),
    'summary.check_registry',
  );
  for (const [id, check] of Object.entries(summary.check_registry)) {
    assertExactKeys(check, CHECK_KEYS, `summary.check_registry.${id}`);
  }
  for (const key of SUB_GATE_KEYS) {
    if (summary.evidence[key] !== null) {
      assertExactKeys(summary.evidence[key], SUB_GATE_EVIDENCE_KEYS,
        `summary.evidence.${key}`);
      assertExactKeys(summary.evidence[key].suite_totals, [
        'suites', 'tests', 'passed', 'failed', 'skipped', 'blocked',
      ], `summary.evidence.${key}.suite_totals`);
      assertExactKeys(
        summary.evidence[key].check_statuses,
        SUB_GATE_CHECK_KEYS[key],
        `summary.evidence.${key}.check_statuses`,
      );
    }
  }
  if (summary.evidence.backend_full_suite !== null) {
    assertExactKeys(
      summary.evidence.backend_full_suite,
      BACKEND_EVIDENCE_KEYS,
      'summary.evidence.backend_full_suite',
    );
  }
  assertExactKeys(summary.redaction, [
    'database_url_stored', 'database_password_stored',
    'command_stdout_stored_in_summary', 'credential_values_loaded',
    'output_tails_sanitized',
  ], 'summary.redaction');
  return summary;
}

export function updateConvergence(summary) {
  for (const registry of PACKC_FINAL_CHECK_REGISTRY) {
    const ownerStatuses = registry.owner_sub_gates.map((owner, index) => {
      const gateEvidence = summary.evidence[owner];
      if (!gateEvidence) return 'blocked';
      if (gateEvidence.status === 'blocked') return 'blocked';
      if (!gateEvidence.canonical_sha256_verified) return 'failed';
      const checkStatus = gateEvidence.check_statuses[registry.owner_checks[index]];
      if (checkStatus === 'passed') return 'passed';
      if (checkStatus === 'blocked') return 'blocked';
      return 'failed';
    });
    const status = ownerStatuses.includes('failed') ? 'failed'
      : ownerStatuses.includes('blocked') ? 'blocked'
        : 'passed';
    summary.check_registry[registry.id] = {
      status,
      owner_sub_gates: [...registry.owner_sub_gates],
      owner_checks: [...registry.owner_checks],
      details: status === 'passed'
        ? 'all owning sub-gate checks passed'
        : status === 'blocked'
          ? 'an owning sub-gate check is blocked'
          : 'an owning sub-gate check did not pass',
    };
  }

  const subGateStatuses = SUB_GATE_KEYS.map((key) => summary.evidence[key]?.status ?? 'blocked');
  const registryStatuses = Object.values(summary.check_registry).map((check) => check.status);
  const backendStatus = summary.evidence.backend_full_suite?.status ?? 'blocked';
  if (subGateStatuses.includes('failed') || registryStatuses.includes('failed')) {
    summary.status = 'failed';
  } else if (subGateStatuses.includes('blocked') || registryStatuses.includes('blocked')) {
    // A missing relational lane remains blocked even when the independently
    // recorded backend full suite also has environment-dependent failures.
    summary.status = 'blocked';
  } else if (backendStatus === 'failed') {
    summary.status = 'failed';
  } else if (backendStatus === 'blocked') {
    summary.status = 'blocked';
  } else {
    summary.status = 'passed';
  }
}

async function runSubGate(evidenceKey, definition) {
  const result = await runCommand([
    process.execPath,
    path.join(REPO_ROOT, definition.script_path),
    '--run-id', definition.gate_id,
  ], { cwd: REPO_ROOT, timeoutMs: 900_000 });
  const summaryPath = path.join(ARTIFACT_ROOT, definition.gate_id, 'summary.json');
  const relativeSummaryPath = path.relative(REPO_ROOT, summaryPath);
  let childSummary = null;
  try {
    childSummary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
  } catch {
    return {
      evidence: emptySubGateEvidence({
        evidenceKey,
        gateId: definition.gate_id,
        status: result.exit_code === null ? 'blocked' : 'failed',
        exitCode: result.exit_code,
        durationMs: result.duration_ms,
        summaryPath: relativeSummaryPath,
      }),
      blocker: {
        reason_code: result.exit_code === null
          ? `${evidenceKey.toUpperCase()}_UNAVAILABLE`
          : `${evidenceKey.toUpperCase()}_SUMMARY_MISSING`,
        summary: safeCommandTail(result.stderr || result.stdout || 'Sub-gate summary missing', 2_000),
      },
    };
  }

  const computedSha = canonicalSummarySha256(childSummary);
  const shaVerified = childSummary.canonical_summary_sha256 === computedSha;
  const validIdentity = childSummary.gate_id === definition.gate_id;
  const validExit = (childSummary.status === 'passed' && result.exit_code === 0)
    || (childSummary.status === 'blocked' && result.exit_code === 2)
    || (childSummary.status === 'failed' && result.exit_code === 1);
  const checkStatuses = Object.fromEntries(SUB_GATE_CHECK_KEYS[evidenceKey].map((id) => [
    id,
    childSummary.check_registry?.[id]?.status ?? 'invalid',
  ]));
  const suiteTotals = normalizeSuiteTotals(childSummary.suite_totals);
  const evidenceStatus = shaVerified && validIdentity && validExit
    && ['passed', 'blocked', 'failed'].includes(childSummary.status)
    ? childSummary.status
    : 'failed';
  const evidence = {
    gate_id: definition.gate_id,
    status: evidenceStatus,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    summary_path: relativeSummaryPath,
    canonical_summary_sha256: childSummary.canonical_summary_sha256 ?? null,
    canonical_sha256_verified: shaVerified,
    check_statuses: checkStatuses,
    suite_totals: suiteTotals,
  };
  const blocker = evidenceStatus === 'passed' ? null : {
    reason_code: evidenceStatus === 'blocked'
      ? `${evidenceKey.toUpperCase()}_BLOCKED`
      : `${evidenceKey.toUpperCase()}_FAILED`,
    summary: evidenceStatus === childSummary.status
      ? `Sub-gate ${definition.gate_id} reported ${evidenceStatus}.`
      : `Sub-gate ${definition.gate_id} identity, exit code, or canonical SHA verification failed.`,
  };
  return { evidence, blocker };
}

function emptySubGateEvidence({ evidenceKey, gateId, status, exitCode, durationMs, summaryPath }) {
  return {
    gate_id: gateId,
    status,
    exit_code: exitCode,
    duration_ms: durationMs,
    summary_path: summaryPath,
    canonical_summary_sha256: null,
    canonical_sha256_verified: false,
    check_statuses: Object.fromEntries(SUB_GATE_CHECK_KEYS[evidenceKey].map((id) => [id, 'not_run'])),
    suite_totals: normalizeSuiteTotals(null),
  };
}

function normalizeSuiteTotals(value) {
  return {
    suites: integerOrZero(value?.suites),
    tests: integerOrZero(value?.tests),
    passed: integerOrZero(value?.passed),
    failed: integerOrZero(value?.failed),
    skipped: integerOrZero(value?.skipped),
    blocked: integerOrZero(value?.blocked),
  };
}

function integerOrZero(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function classifyBackendFullSuite(result) {
  const outcome = exactPassingTapOutcome(result);
  const unavailable = result.exit_code === null || outcome.tests === null;
  const passed = result.exit_code === 0
    && outcome.tests !== null
    && outcome.tests > 0
    && outcome.failed === 0
    && (outcome.passed ?? 0) + (outcome.skipped ?? 0) === outcome.tests;
  return {
    status: unavailable ? 'blocked' : passed ? 'passed' : 'failed',
    command_id: 'backend-full-suite',
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    tests: outcome.tests,
    passed: outcome.passed,
    failed: outcome.failed,
    skipped: outcome.skipped,
    conditional_skips: outcome.skipped,
    output_sha256: `sha256:${crypto.createHash('sha256').update(outcome.combinedOutput).digest('hex')}`,
    sanitized_output_tail: safeCommandTail(outcome.combinedOutput, 4_000),
  };
}

async function runBackendFullSuite(artifactDir) {
  const result = await runCommand(['pnpm', 'test'], {
    cwd: BACKEND_ROOT,
    timeoutMs: 1_200_000,
    timeoutMessage: 'Backend full suite timed out.',
  });
  const evidence = classifyBackendFullSuite(result);
  await writeJsonAtomic(
    path.join(artifactDir, 'backend-full-suite.json'),
    assertSanitizedJson(evidence, 'backend full suite'),
  );
  return evidence;
}

function accumulateAllSuites(summary) {
  const totals = normalizeSuiteTotals(null);
  for (const key of SUB_GATE_KEYS) {
    const childTotals = summary.evidence[key]?.suite_totals ?? normalizeSuiteTotals(null);
    for (const field of Object.keys(totals)) totals[field] += childTotals[field];
  }
  const backend = summary.evidence.backend_full_suite;
  totals.suites += 1;
  if (backend?.status === 'blocked') {
    totals.blocked += 1;
  } else if (backend) {
    totals.tests += backend.tests ?? 0;
    totals.passed += backend.passed ?? 0;
    totals.failed += backend.failed ?? 0;
    totals.skipped += backend.skipped ?? 0;
  }
  summary.suite_totals = totals;
}

async function main() {
  const { gateId } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, gateId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });
  const summary = buildInitialSummary(gateId);
  const definitions = deriveSubGateRuns(gateId);
  try {
    for (const key of SUB_GATE_KEYS) {
      const { evidence, blocker } = await runSubGate(key, definitions[key]);
      summary.evidence[key] = evidence;
      summary.sub_gate_summary_sha256s[key] = evidence.canonical_summary_sha256;
      if (blocker) summary.blockers.push(blocker);
    }
    summary.evidence.backend_full_suite = await runBackendFullSuite(artifactDir);
    if (summary.evidence.backend_full_suite.status !== 'passed') {
      summary.blockers.push({
        reason_code: summary.evidence.backend_full_suite.status === 'blocked'
          ? 'BACKEND_FULL_SUITE_UNAVAILABLE'
          : 'BACKEND_FULL_SUITE_FAILED',
        summary: `Backend full suite reported ${summary.evidence.backend_full_suite.status}.`,
      });
    }
  } catch (error) {
    summary.blockers.push({
      reason_code: 'PACKC_FINAL_GATE_EXECUTION_FAILED',
      summary: error instanceof Error ? error.message : String(error),
    });
  } finally {
    accumulateAllSuites(summary);
    updateConvergence(summary);
    if (summary.blockers.some(
      (item) => item.reason_code === 'PACKC_FINAL_GATE_EXECUTION_FAILED',
    )) {
      summary.status = 'failed';
    }
    summary.finished_at = new Date().toISOString();
    assertExactSummaryKeysets(summary);
    summary.canonical_summary_sha256 = canonicalSummarySha256(summary);
    assertSanitizedJson(summary, 'Pack C final summary');
    await writeJsonAtomic(summaryPath, summary);
  }
  process.stdout.write(`${JSON.stringify({
    gate_id: gateId,
    status: summary.status,
    summary_path: path.relative(REPO_ROOT, summaryPath),
    canonical_summary_sha256: summary.canonical_summary_sha256,
    sub_gate_summary_sha256s: summary.sub_gate_summary_sha256s,
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
