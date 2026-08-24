#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const SERVICES_DIR = path.join(REPO_ROOT, 'apps/backend/src/services');
const CONTROLLER_PATH = path.join(REPO_ROOT, 'apps/backend/src/controllers/paper-implementation-controller.ts');
const ROUTES_PATH = path.join(REPO_ROOT, 'apps/backend/src/routes/paper-implementation-routes.ts');
const APP_PATH = path.join(REPO_ROOT, 'apps/backend/src/app.ts');
const PROVIDER_VARIANCE_SERVICE_PATH = path.join(
  SERVICES_DIR,
  'paper-implementation-provider-variance-evaluation-service.ts',
);
const SUBTEST_NAME = 'PaperImplementation provider variance ownership scan keeps evaluation out of runtime admission Domain Gate and live execution';

const REQUIRED_OWNER_MARKERS = new Map([
  [PROVIDER_VARIANCE_SERVICE_PATH, [
    'class PaperImplementationProviderVarianceEvaluationService',
    'runProviderVarianceEvaluation(',
    "profile.profile_mode === 'deterministic_fake'",
    'this.aiWorkflowHarness.createAgentWorkflowHarnessRun(',
    'Live provider execution is intentionally not implemented in the default T-105 lane.',
    'does not satisfy product runtime/provider canary or Domain Gate admission',
  ]],
  [CONTROLLER_PATH, [
    'providerVarianceEvaluation?: PaperImplementationProviderVarianceEvaluationService',
    'runProviderVarianceEvaluation = async',
    'this.requireProviderVarianceEvaluation().runProviderVarianceEvaluation(',
    'requireProviderVarianceEvaluation()',
  ]],
  [ROUTES_PATH, [
    '/paper-implementation/projects/:implementation_project_id/provider-variance-evaluations/run',
    'runProviderVarianceEvaluationRequestSchema',
    'controller.runProviderVarianceEvaluation',
  ]],
  [APP_PATH, [
    'new PaperImplementationProviderVarianceEvaluationService({',
    'providerVarianceEvaluation: paperImplementationProviderVarianceEvaluationService',
  ]],
]);

const FORBIDDEN_PROVIDER_VARIANCE_REF_RE = /\b(PaperImplementationProviderVarianceEvaluationService|RunProviderVarianceEvaluationRequest|RunProviderVarianceEvaluationResponse|ProviderVariance[A-Za-z0-9_]*|runProviderVarianceEvaluation|provider-variance-evaluations|provider_variance|providerVariance)\b/g;

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
      name === 'paper-implementation-ai-workflow-harness-service.ts'
      || name === 'paper-implementation-runtime-admission-service.ts'
      || name === 'paper-implementation-runtime-domain-gate-service.ts'
      || name === 'paper-implementation-live-experiment-adapter-service.ts'
      || name === 'paper-implementation-workorder-experiment-bridge-service.ts'
      || name === 'paper-implementation-result-claim-dossier-service.ts'
      || /^paper-implementation-.*-runtime-service\.ts$/.test(name))
    .filter((name) => name !== 'paper-implementation-provider-variance-evaluation-service.ts')
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
  const providerVarianceRefs = collectMatches(source, FORBIDDEN_PROVIDER_VARIANCE_REF_RE);
  if (providerVarianceRefs.length > 0) {
    forbiddenFindings.push({
      file: path.relative(REPO_ROOT, filePath),
      provider_variance_refs: [...new Set(providerVarianceRefs)].sort(),
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
