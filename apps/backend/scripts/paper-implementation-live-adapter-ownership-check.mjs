#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const SERVICES_DIR = path.join(REPO_ROOT, 'apps/backend/src/services');
const CONTROLLER_PATH = path.join(REPO_ROOT, 'apps/backend/src/controllers/paper-implementation-controller.ts');
const ROUTES_PATH = path.join(REPO_ROOT, 'apps/backend/src/routes/paper-implementation-routes.ts');
const LIVE_ADAPTER_PATH = path.join(
  SERVICES_DIR,
  'paper-implementation-live-experiment-adapter-service.ts',
);
const SUBTEST_NAME = 'PaperImplementation live adapter ownership scan keeps runtime admission and harness out of live experiment execution';

const REQUIRED_OWNER_MARKERS = new Map([
  [LIVE_ADAPTER_PATH, [
    'class PaperImplementationLiveExperimentAdapterService',
    'submitLiveExperimentRun(',
    'syncLiveExperimentRun(',
    'collectLiveExperimentRun(',
    'cancelLiveExperimentRun(',
  ]],
  [CONTROLLER_PATH, [
    'requireLiveExperimentAdapter()',
    'this.requireLiveExperimentAdapter().submitLiveExperimentRun(',
    'this.requireLiveExperimentAdapter().syncLiveExperimentRun(',
    'this.requireLiveExperimentAdapter().collectLiveExperimentRun(',
    'this.requireLiveExperimentAdapter().cancelLiveExperimentRun(',
  ]],
  [ROUTES_PATH, [
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/submit',
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/sync',
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/collect',
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/cancel',
  ]],
]);

const FORBIDDEN_SERVICE_REF_RE = /\b(PaperImplementationLiveExperimentAdapterService|ExperimentFoundationExecutionService)\b/g;
const FORBIDDEN_CALL_RE = /\b[A-Za-z0-9_$]+\.(submitLiveExperimentRun|syncLiveExperimentRun|collectLiveExperimentRun|cancelLiveExperimentRun|submitJob|syncJob|collectJob|cancelJob|submitHarnessRun|recordRunMonitorIntake)\s*\(/g;
const FORBIDDEN_ROUTE_RE = /live-experiment-runs/g;

function emitTap(passed, details) {
  console.log('TAP version 13');
  console.log(`${passed ? 'ok' : 'not ok'} 1 - ${SUBTEST_NAME}`);
  for (const line of JSON.stringify(details, null, 2).split('\n')) {
    console.log(`# ${line}`);
  }
  console.log('1..1');
  console.log('# tests 1');
  console.log(`# pass ${passed ? 1 : 0}`);
  console.log(`# fail ${passed ? 0 : 1}`);
  console.log('# cancelled 0');
  console.log('# skipped 0');
  console.log('# todo 0');
}

function collectMatches(source, regex) {
  return [...source.matchAll(regex)].map((match) => match[0]);
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function serviceFilesToScan() {
  const names = await fs.readdir(SERVICES_DIR);
  return names
    .filter((name) =>
      /^paper-implementation-.*-runtime-service\.ts$/.test(name)
      || name === 'paper-implementation-runtime-admission-service.ts'
      || name === 'paper-implementation-ai-workflow-harness-service.ts'
      || name === 'paper-implementation-runtime-domain-gate-service.ts')
    .filter((name) => name !== 'paper-implementation-live-experiment-adapter-service.ts')
    .map((name) => path.join(SERVICES_DIR, name))
    .sort();
}

const missingOwnerMarkers = [];
for (const [filePath, markers] of REQUIRED_OWNER_MARKERS.entries()) {
  const source = await readText(filePath);
  for (const marker of markers) {
    if (!source.includes(marker)) {
      missingOwnerMarkers.push({
        file: path.relative(REPO_ROOT, filePath),
        marker,
      });
    }
  }
}

const forbiddenFindings = [];
const scannedFiles = await serviceFilesToScan();
for (const filePath of scannedFiles) {
  const source = await readText(filePath);
  const serviceRefs = collectMatches(source, FORBIDDEN_SERVICE_REF_RE);
  const calls = collectMatches(source, FORBIDDEN_CALL_RE);
  const routeRefs = collectMatches(source, FORBIDDEN_ROUTE_RE);
  if (serviceRefs.length > 0 || calls.length > 0 || routeRefs.length > 0) {
    forbiddenFindings.push({
      file: path.relative(REPO_ROOT, filePath),
      service_refs: [...new Set(serviceRefs)].sort(),
      calls: [...new Set(calls)].sort(),
      route_refs: [...new Set(routeRefs)].sort(),
    });
  }
}

const passed = missingOwnerMarkers.length === 0 && forbiddenFindings.length === 0;
emitTap(passed, {
  status: passed ? 'passed' : 'failed',
  owner_files: [...REQUIRED_OWNER_MARKERS.keys()].map((filePath) => path.relative(REPO_ROOT, filePath)),
  scanned_files: scannedFiles.map((filePath) => path.relative(REPO_ROOT, filePath)),
  missing_owner_markers: missingOwnerMarkers,
  forbidden_findings: forbiddenFindings,
});

if (!passed) {
  process.exitCode = 1;
}
