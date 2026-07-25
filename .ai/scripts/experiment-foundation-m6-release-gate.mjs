#!/usr/bin/env node
// T-132 M6 release convergence gate. Re-runs the re-runnable offline gates as
// children, asserts the non-re-runnable named-local/live records by exact
// SHA-256, executes the LIT-0204 source-import lane on disposable PostgreSQL,
// asserts API/docs freshness and the usage-fit + golden-closure artifacts, and
// emits the machine-readable productization summary under the frozen status
// vocabulary. Evidence style follows the QR-1 standard: per-check executable
// predicates, transcript hashes only, no absolute machine paths.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  durableCommandEvidence,
  normalizeSummaryPaths,
  assertDurableSummaryRedaction,
  DEFAULT_POSTGRES_IMAGE,
} from './experiment-foundation-m5-agent-gate.mjs';
import { sha256Bytes, sha256File, writeJsonAtomic, exactPassingTapOutcome } from './lib/experiment-v2-evidence.mjs';
import { describeEnvironmentIsolation } from './lib/hermetic-child-env.mjs';
import {
  markDisposableDatabase,
  runCommand,
  safeCommandTail,
  startDisposablePostgres,
  stopDisposablePostgres,
} from './lib/disposable-postgres.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const T132_ARTIFACTS = 'dev-docs/active/experiment-foundation-productization-closure/artifacts';

export const FROZEN_STATUS_VOCABULARY = Object.freeze([
  'workflow_simulation_passed',
  'cloud_preflight_passed',
  'control_flow_validated_no_paper_evidence',
]);

export const DURABLE_RECORD_PINS = Object.freeze([
  {
    id: 'packa_product_verify_r5',
    relative_path: `${T132_ARTIFACTS}/product-pack-a-local-20260715/04-product-landing-verify.json`,
    sha256: '341eba9ae1e38ce282947d9d9554102f04ff5c93fa7cb5564a7152b0c245ee48',
  },
  {
    id: 'packb_product_verify_r2',
    relative_path: `${T132_ARTIFACTS}/product-pack-b-local-20260715/04-product-execution-verify.json`,
    sha256: '7cc6044bc3822e4197f99638b09b7a4f9e90640bb205cde929f98df2b998e9c7',
  },
  {
    id: 'm7_offline_gate_v3',
    relative_path: `${T132_ARTIFACTS}/implementation/12-m7-qr-gate-summary-v3.json`,
    sha256: 'de4b39855db87557f1ef220c6d2d4bddaf61d7c94c30aca8ecda8e1f63679882',
  },
  {
    id: 'm5_agent_gate_v1',
    relative_path: `${T132_ARTIFACTS}/implementation/13-m5-agent-gate-summary-v1.json`,
    sha256: '0c840205c866747cca8e2124a0b79118a79c8be7394e8ffb60e5a91313496d51',
  },
  {
    id: 'usage_fit_evidence_v1',
    relative_path: `${T132_ARTIFACTS}/implementation/15-m6-usage-fit-evidence-v1.json`,
    sha256: '5c9cf61efc4fff625137f9f9b74b1999309f3dac462f6f5167a36a546fc6c501',
  },
  {
    id: 'golden_closure_apply',
    relative_path: `${T132_ARTIFACTS}/implementation/16-m6-golden-closure-apply.json`,
    sha256: 'a3460326c607f8e84756cb1e57a613ed4e5c61f7b07166826a19c5e262139b21',
  },
]);

export const CLOUD_PREFLIGHT_DOC = {
  relative_path: `${T132_ARTIFACTS}/implementation/10-cloud-preflight-live-closure.md`,
  summary_sha256: 'ae524752ef64f658ddfb796e8c0834bf0903baadf1c8e79cfbc392887c516053',
  verdict: 'cloud_preflight_passed',
};

export const GOLDEN_CLOSURE_EXPECTATIONS = Object.freeze({
  closure_id: 'pi_validation_cycle_closure_v2_ec9e5603fedf8753e51a8ad57961c7cfcd7792924df355284bf4217af30ff434',
  closure_kind: 'control_flow_validated_no_paper_evidence',
  snapshot_hash: 'sha256:cba742d8e7571ebd6b6de651738ede5f96429dd52ebaec6d704c8c90ed521654',
  input_hash: 'sha256:786e226799f22b1f74e17c0b48bb39d80447ace8ffe43f25ed126820f8eb67f3',
  idempotency_key: 'm6-golden-closure-p313-v1',
  validation_cycle_id: 'validation_cycle_t132_packa_product_p313_v1',
});

// packc-final enforces its own run-id grammar packc-final-<YYYYMMDD>-r<N>;
// deriveChildRunId maps the m6 run id (…-<YYYYMMDD>-v<N>) into that grammar
// with an offset high above hand-issued r-numbers to avoid collisions.
export function deriveChildRunId(childId, runId) {
  if (childId !== 'packc_final') return `${runId}-${childId.replace(/_/gu, '-')}`;
  const date = runId.match(/(\d{8})/u)?.[1];
  const version = runId.match(/v(\d+)$/u)?.[1];
  if (!date || !version) {
    throw new Error('M6 run id must contain <YYYYMMDD> and end with v<N> to derive the packc-final child id');
  }
  return `packc-final-${date}-r${900 + Number(version)}`;
}

const CHILD_GATES = [
  { id: 'packb_simulation', script: '.ai/scripts/experiment-foundation-packb-simulation-gate.mjs', timeoutMs: 1_500_000 },
  { id: 'packc_final', script: '.ai/scripts/experiment-foundation-packc-final-gate.mjs', timeoutMs: 3_000_000 },
  { id: 'm5_agent', script: '.ai/scripts/experiment-foundation-m5-agent-gate.mjs', timeoutMs: 1_500_000 },
  {
    id: 'm7_provider',
    script: '.ai/scripts/experiment-foundation-m7-provider-gate.mjs',
    timeoutMs: 1_500_000,
    // The bilateral T-106 handoff was imported for the recorded v3 run; the
    // composite child re-run verifies against that named import.
    extraArgs: ['--imported-run-id', 't132-m7-offline-20260724-v3'],
  },
];

const REQUIRED_CHECK_IDS = Array.from({ length: 10 }, (_, index) => `M6-${String(index + 1).padStart(2, '0')}`);

const SOURCE_POPULATION = [
  '.ai/scripts/experiment-foundation-m6-release-gate.mjs',
  'apps/backend/scripts/run-m6-usage-fit-assessment.ts',
  'apps/backend/scripts/run-m6-golden-closure.ts',
  'apps/backend/src/services/experiment-foundation-lit0204-protocol-import-service.ts',
  'apps/backend/src/routes/experiment-v2-openapi-path-coverage.test.ts',
  'docs/context/api/openapi.yaml',
  `${T132_ARTIFACTS}/implementation/14-m6-release-closure-plan.md`,
  `${T132_ARTIFACTS}/implementation/15-m6-usage-fit-rubric.md`,
  `${T132_ARTIFACTS}/implementation/16-m6-golden-closure-record.md`,
];

export function parseArgs(argv) {
  let runId = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id must contain 1..64 safe filename characters');
  }
  return { runId };
}

export function inspectChildSummary(childId, summary) {
  if (summary?.status !== 'passed') {
    throw new Error(`Child gate ${childId} did not pass: ${summary?.status}`);
  }
  const checks = summary.checks ?? {};
  const nonPassed = Object.entries(checks)
    .filter(([, value]) => value?.status !== 'passed')
    .map(([key]) => key);
  if (nonPassed.length > 0) {
    throw new Error(`Child gate ${childId} has non-passed checks: ${nonPassed.join(',')}`);
  }
  return {
    child: childId,
    status: 'passed',
    check_count: Object.keys(checks).length,
    summary_sha256: null,
  };
}

export function inspectGoldenClosureRecord(record) {
  const submitted = record?.submitted_request;
  const closure = record?.closure_response?.closure
    ?? record?.closure_response;
  const closureId = closure?.closure_id ?? closure?.id;
  const exact = record?.validation_cycle_id === GOLDEN_CLOSURE_EXPECTATIONS.validation_cycle_id
    && submitted?.closure_kind === GOLDEN_CLOSURE_EXPECTATIONS.closure_kind
    && submitted?.expected_closure_input_hash === GOLDEN_CLOSURE_EXPECTATIONS.input_hash
    && submitted?.idempotency_key === GOLDEN_CLOSURE_EXPECTATIONS.idempotency_key
    && submitted?.corrected_scientific_disposition === null
    && closureId === GOLDEN_CLOSURE_EXPECTATIONS.closure_id;
  if (!exact) {
    throw new Error('Golden closure apply record does not match the frozen expectations');
  }
  return {
    exact: true,
    closure_id: closureId,
    closure_kind: submitted.closure_kind,
    input_hash: submitted.expected_closure_input_hash,
    snapshot_hash: GOLDEN_CLOSURE_EXPECTATIONS.snapshot_hash,
  };
}

export function inspectUsageFitEvidence(evidence, rubricText) {
  const exact = evidence?.assessment === 't132-m6-usage-fit@v1'
    && evidence?.call_count === 5
    && Array.isArray(evidence?.manually_assembled_identities)
    && evidence.manually_assembled_identities.length === 0
    && evidence?.reverse_trace_fully_resolved === true
    && evidence?.preparation?.prepared_request_present === true
    && evidence?.preparation?.derived_closure_kind === 'control_flow_validated_no_paper_evidence'
    && /usage-fit passed/u.test(rubricText)
    && /\| D1 preparation cost \| \*\*5\*\*/u.test(rubricText)
    && /\| D2 decision clarity \| \*\*5\*\*/u.test(rubricText)
    && /\| D3 traceability \| \*\*5\*\*/u.test(rubricText);
  if (!exact) throw new Error('Usage-fit evidence/rubric assertions failed');
  return {
    exact: true,
    call_count: evidence.call_count,
    reverse_trace_fully_resolved: true,
    scores: { d1: 5, d2: 5, d3: 5 },
  };
}

export function buildProductizationStatuses(packbVerify, goldenClosure) {
  // The packb product verify record nests the status one level down:
  // workflow_simulation_status: { run_id, ..., workflow_simulation_status }.
  const workflowStatusNode = packbVerify?.workflow_simulation_status;
  const statuses = {
    workflow_simulation: typeof workflowStatusNode === 'string'
      ? workflowStatusNode
      : workflowStatusNode?.workflow_simulation_status
        ?? findNestedValue(packbVerify?.checks, 'workflow_simulation_status'),
    cloud_preflight: CLOUD_PREFLIGHT_DOC.verdict,
    cycle_closure_kind: goldenClosure.closure_kind,
  };
  if (
    statuses.workflow_simulation !== 'workflow_simulation_passed'
    || statuses.cloud_preflight !== 'cloud_preflight_passed'
    || statuses.cycle_closure_kind !== 'control_flow_validated_no_paper_evidence'
  ) {
    throw new Error(`Productization statuses drifted: ${JSON.stringify(statuses)}`);
  }
  const forbidden = ['cloud_training_passed', 'evidence_ready', 'scientific_passed'];
  const serialized = JSON.stringify(statuses);
  if (forbidden.some((label) => serialized.includes(label))) {
    throw new Error('Productization statuses contain a forbidden claim label');
  }
  return statuses;
}

function findNestedValue(value, key) {
  if (value === null || typeof value !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
  for (const child of Object.values(value)) {
    const found = findNestedValue(child, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function evaluateM6Check(id, summary) {
  const exact = (entries) => {
    const failures = entries.filter(([, actual, expected]) => actual !== expected);
    return {
      status: failures.length === 0 ? 'passed' : 'failed',
      evidence: entries.map(([label, actual, expected]) => `${label} === ${JSON.stringify(expected)}${actual === expected ? '' : ` (actual ${JSON.stringify(actual)})`}`),
    };
  };
  switch (id) {
    case 'M6-01':
      return exact([['children.packb_simulation.status', summary.children?.packb_simulation?.status, 'passed']]);
    case 'M6-02':
      return exact([['children.packc_final.status', summary.children?.packc_final?.status, 'passed']]);
    case 'M6-03':
      return exact([['children.m5_agent.status', summary.children?.m5_agent?.status, 'passed']]);
    case 'M6-04':
      return exact([['children.m7_provider.status', summary.children?.m7_provider?.status, 'passed']]);
    case 'M6-05':
      return exact([
        ['durable_records.verified_count', summary.durable_records?.verified_count, DURABLE_RECORD_PINS.length],
        ['durable_records.mismatch_count', summary.durable_records?.mismatch_count, 0],
        ['durable_records.cloud_preflight_doc_pinned', summary.durable_records?.cloud_preflight_doc_pinned, true],
      ]);
    case 'M6-06':
      return exact([
        ['lit0204_import_lane.tap.failed', summary.lit0204_import_lane?.tap?.failed, 0],
        ['lit0204_import_lane.tap.skipped', summary.lit0204_import_lane?.tap?.skipped, 0],
        ['lit0204_import_lane.tap.passed', summary.lit0204_import_lane?.tap?.passed, 1],
      ]);
    case 'M6-07':
      return exact([
        ['api_docs.openapi_quality_exit', summary.api_docs?.openapi_quality_exit, 0],
        ['api_docs.api_index_verify_exit', summary.api_docs?.api_index_verify_exit, 0],
        ['api_docs.path_coverage_tap_failed', summary.api_docs?.path_coverage_tap_failed, 0],
      ]);
    case 'M6-08':
      return exact([
        ['usage_fit.exact', summary.usage_fit?.exact, true],
        ['usage_fit.reverse_trace_fully_resolved', summary.usage_fit?.reverse_trace_fully_resolved, true],
      ]);
    case 'M6-09':
      return exact([
        ['golden_closure.exact', summary.golden_closure?.exact, true],
        ['golden_closure.closure_kind', summary.golden_closure?.closure_kind, 'control_flow_validated_no_paper_evidence'],
      ]);
    case 'M6-10':
      return exact([
        ['productization_statuses.workflow_simulation', summary.productization_statuses?.workflow_simulation, 'workflow_simulation_passed'],
        ['productization_statuses.cloud_preflight', summary.productization_statuses?.cloud_preflight, 'cloud_preflight_passed'],
        ['productization_statuses.cycle_closure_kind', summary.productization_statuses?.cycle_closure_kind, 'control_flow_validated_no_paper_evidence'],
      ]);
    default:
      return { status: 'failed', evidence: [`unknown check ${id}`] };
  }
}

export function evaluateM6Checks(summary) {
  return Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, evaluateM6Check(id, summary)]));
}

async function run(argv, options = {}) {
  return runCommand(argv, { ...options, cwd: options.cwd ?? REPO_ROOT, timeoutMessage: 'Timed out.' });
}

async function main() {
  const { runId } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  await fs.mkdir(artifactDir, { recursive: true });
  const summaryPath = path.join(artifactDir, 'summary.json');
  const summary = {
    run_id: runId,
    phase: 'M6-release-convergence',
    status: 'running',
    started_at: new Date().toISOString(),
    finished_at: null,
    environment_isolation: describeEnvironmentIsolation(),
    source_population: null,
    children: {},
    durable_records: null,
    lit0204_import_lane: null,
    api_docs: null,
    usage_fit: null,
    golden_closure: null,
    productization_statuses: null,
    checks: Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, { status: 'not_run', evidence: [] }])),
    blockers: [],
  };
  let disposable = null;
  try {
    const files = [];
    for (const relativePath of SOURCE_POPULATION) {
      files.push({ path: relativePath, sha256: await sha256File(path.join(REPO_ROOT, relativePath)) });
    }
    summary.source_population = {
      profile: 'experiment-foundation-m6-source-population@v1',
      file_count: files.length,
      digest: sha256Bytes(JSON.stringify(files)),
      files,
    };

    for (const child of CHILD_GATES) {
      const childRunId = deriveChildRunId(child.id, runId);
      const result = await run(
        ['node', child.script, '--run-id', childRunId, ...(child.extraArgs ?? [])],
        { timeoutMs: child.timeoutMs },
      );
      const evidence = durableCommandEvidence(result, result.exit_code === 0 ? 'passed' : 'failed');
      const childSummaryPath = path.join(ARTIFACT_ROOT, childRunId, 'summary.json');
      let inspection = null;
      if (result.exit_code === 0) {
        const childSummary = JSON.parse(await fs.readFile(childSummaryPath, 'utf8'));
        inspection = inspectChildSummary(child.id, childSummary);
        inspection.summary_sha256 = await sha256File(childSummaryPath);
        inspection.run_id = childRunId;
      }
      summary.children[child.id] = { ...(inspection ?? { child: child.id, status: 'failed' }), command: evidence };
      if (result.exit_code !== 0) throw new Error(`Child gate failed: ${child.id}`);
    }

    let mismatches = 0;
    const records = [];
    for (const pin of DURABLE_RECORD_PINS) {
      const actual = await sha256File(path.join(REPO_ROOT, pin.relative_path));
      const matched = actual === pin.sha256;
      if (!matched) mismatches += 1;
      records.push({ id: pin.id, relative_path: pin.relative_path, expected_sha256: pin.sha256, matched });
    }
    const preflightDoc = await fs.readFile(path.join(REPO_ROOT, CLOUD_PREFLIGHT_DOC.relative_path), 'utf8');
    const preflightPinned = preflightDoc.includes(CLOUD_PREFLIGHT_DOC.summary_sha256)
      && preflightDoc.includes('`cloud_preflight_passed`');
    summary.durable_records = {
      verified_count: records.filter((record) => record.matched).length,
      mismatch_count: mismatches,
      cloud_preflight_doc_pinned: preflightPinned,
      records,
    };
    if (mismatches > 0 || !preflightPinned) throw new Error('Durable record pin verification failed');

    disposable = await startDisposablePostgres({
      runId,
      postgresImage: DEFAULT_POSTGRES_IMAGE,
      runCommand: run,
      safeTail: (value) => safeCommandTail(value, 6_000),
      databasePrefixes: ['d19'],
      containerNamePrefix: 'pea-m6',
      portResolutionErrorMessage: 'Cannot resolve M6 PostgreSQL port',
      portWaitErrorMessage: 'Disposable M6 PostgreSQL port did not become reachable',
      postgresWaitErrorMessage: 'Disposable M6 PostgreSQL did not become ready',
      startupFailureMessage: 'Disposable M6 PostgreSQL startup failed',
      pgIsReadyArguments: (databaseName) => ['pg_isready', '-U', 'postgres', '-d', databaseName],
    });
    await markDisposableDatabase({
      runCommand: run,
      safeTail: (value) => safeCommandTail(value, 6_000),
      containerName: disposable.containerName,
      databaseName: disposable.databaseNames.d19,
      marker: `experiment-foundation-d19-disposable:${disposable.nonce}`,
      failureMessage: 'Cannot mark disposable M6 database',
    });
    const deploy = await run(
      ['pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
      { env: { DATABASE_URL: disposable.databaseUrls.d19 }, timeoutMs: 300_000 },
    );
    if (deploy.exit_code !== 0) throw new Error('M6 disposable migrate deploy failed');
    const importLane = await run(
      ['node', '--test', '--loader', 'ts-node/esm',
        'src/services/experiment-foundation-lit0204-protocol-import-service.relational.integration.test.ts'],
      {
        cwd: path.join(REPO_ROOT, 'apps/backend'),
        env: {
          DATABASE_URL: disposable.databaseUrls.d19,
          EXPERIMENT_V2_TEST_DATABASE_URL: disposable.databaseUrls.d19,
          EXPERIMENT_V2_TEST_DATABASE_NAME: disposable.databaseNames.d19,
          EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
          EXPERIMENT_FOUNDATION_LIT0204_IMPORT_RELATIONAL_PRISMA: '1',
        },
        timeoutMs: 420_000,
      },
    );
    const importTap = exactPassingTapOutcome(importLane);
    summary.lit0204_import_lane = {
      command: durableCommandEvidence(importLane, importTap.executedWithoutSkip ? 'passed' : 'failed'),
      tap: { tests: importTap.tests, passed: importTap.passed, failed: importTap.failed, skipped: importTap.skipped },
    };
    if (!importTap.executedWithoutSkip) throw new Error('LIT-0204 import lane failed or skipped');

    const quality = await run(['node', '.ai/scripts/ctl-openapi-quality.mjs'], { timeoutMs: 120_000 });
    const indexVerify = await run(['node', '.ai/scripts/ctl-api-index.mjs', 'verify'], { timeoutMs: 120_000 });
    const coverage = await run(
      ['node', '--test', '--loader', 'ts-node/esm', 'src/routes/experiment-v2-openapi-path-coverage.test.ts'],
      { cwd: path.join(REPO_ROOT, 'apps/backend'), timeoutMs: 300_000 },
    );
    const coverageTap = exactPassingTapOutcome(coverage);
    summary.api_docs = {
      openapi_quality_exit: quality.exit_code,
      api_index_verify_exit: indexVerify.exit_code,
      path_coverage_tap_failed: coverageTap.failed,
      commands: {
        quality: durableCommandEvidence(quality, quality.exit_code === 0 ? 'passed' : 'failed'),
        index_verify: durableCommandEvidence(indexVerify, indexVerify.exit_code === 0 ? 'passed' : 'failed'),
        coverage: durableCommandEvidence(coverage, coverageTap.executedWithoutSkip ? 'passed' : 'failed'),
      },
    };
    if (quality.exit_code !== 0 || indexVerify.exit_code !== 0 || !coverageTap.executedWithoutSkip) {
      throw new Error('API/docs freshness checks failed');
    }

    const usageFitEvidence = JSON.parse(await fs.readFile(
      path.join(REPO_ROOT, `${T132_ARTIFACTS}/implementation/15-m6-usage-fit-evidence-v1.json`),
      'utf8',
    ));
    const rubricText = await fs.readFile(
      path.join(REPO_ROOT, `${T132_ARTIFACTS}/implementation/15-m6-usage-fit-rubric.md`),
      'utf8',
    );
    summary.usage_fit = inspectUsageFitEvidence(usageFitEvidence, rubricText);

    const closureRecord = JSON.parse(await fs.readFile(
      path.join(REPO_ROOT, `${T132_ARTIFACTS}/implementation/16-m6-golden-closure-apply.json`),
      'utf8',
    ));
    summary.golden_closure = inspectGoldenClosureRecord(closureRecord);

    const packbVerify = JSON.parse(await fs.readFile(
      path.join(REPO_ROOT, `${T132_ARTIFACTS}/product-pack-b-local-20260715/04-product-execution-verify.json`),
      'utf8',
    ));
    summary.productization_statuses = buildProductizationStatuses(packbVerify, summary.golden_closure);

    summary.checks = evaluateM6Checks(summary);
    const failed = Object.entries(summary.checks).filter(([, check]) => check.status !== 'passed');
    summary.status = failed.length === 0 ? 'passed' : 'failed';
    if (failed.length > 0) {
      summary.blockers.push({ reason_code: 'M6_CHECKS_FAILED', message: failed.map(([id]) => id).join(',') });
    }
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE') {
      summary.status = 'blocked';
      summary.blockers.push({ reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE', message: error.message });
    } else {
      summary.status = 'failed';
      summary.blockers.push({
        reason_code: 'M6_GATE_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(disposable.containerName, { runCommand: run });
      if (cleanup.exit_code !== 0) {
        summary.status = 'failed';
        summary.blockers.push({ reason_code: 'DISPOSABLE_POSTGRES_CLEANUP_FAILED', message: safeCommandTail(cleanup.stderr, 2_000) });
      }
    }
    summary.finished_at = new Date().toISOString();
    const durable = normalizeSummaryPaths(summary, REPO_ROOT);
    assertDurableSummaryRedaction(durable);
    await writeJsonAtomic(summaryPath, durable);
  }
  console.log(JSON.stringify({
    status: summary.status,
    run_id: runId,
    summary_path: path.relative(REPO_ROOT, summaryPath),
  }));
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
