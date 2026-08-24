#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const DOMAIN_GATE_SERVICE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts',
);

const ALLOWED_SERVICE_CLASS_REFS = new Set([
  'PaperImplementationRuntimeAdmissionService',
  'PaperImplementationResultClaimDossierService',
  'PaperImplementationRuntimeDomainGateService',
]);

const REQUIRED_RESULT_CLAIM_DOSSIER_METHODS = new Set([
  'createClaimCandidate',
  'getClaimCandidate',
  'createImplementationDossier',
  'getImplementationDossier',
]);

const ALLOWED_WRITER_METHOD_CALLS = new Set([
  'this.resultClaimDossier.createClaimCandidate(',
  'this.resultClaimDossier.createImplementationDossier(',
]);

function collectMatches(source, regex) {
  return [...source.matchAll(regex)].map((match) => match[1]);
}

function fail(message, details = {}) {
  console.error(JSON.stringify({
    status: 'failed',
    message,
    ...details,
  }, null, 2));
  process.exitCode = 1;
}

const source = await fs.readFile(DOMAIN_GATE_SERVICE_PATH, 'utf8');

const serviceClassRefs = new Set(collectMatches(
  source,
  /\b(PaperImplementation[A-Za-z]+Service)\b/g,
));
const unexpectedServiceRefs = [...serviceClassRefs]
  .filter((name) => !ALLOWED_SERVICE_CLASS_REFS.has(name))
  .sort();
if (unexpectedServiceRefs.length > 0) {
  fail('Domain Gate service references non-allowed PaperImplementation services.', {
    unexpected_service_refs: unexpectedServiceRefs,
  });
}

const resultClaimDossierMethodRefs = new Set(collectMatches(
  source,
  /(?:\|\s*)?'((?:create|get)(?:ClaimCandidate|ImplementationDossier|ResultInterpretationPacket))'/g,
));
const missingResultClaimDossierMethods = [...REQUIRED_RESULT_CLAIM_DOSSIER_METHODS]
  .filter((name) => !resultClaimDossierMethodRefs.has(name))
  .sort();
const unexpectedResultClaimDossierMethods = [...resultClaimDossierMethodRefs]
  .filter((name) => !REQUIRED_RESULT_CLAIM_DOSSIER_METHODS.has(name))
  .sort();
if (missingResultClaimDossierMethods.length > 0 || unexpectedResultClaimDossierMethods.length > 0) {
  fail('Domain Gate result/claim/dossier dependency surface drifted.', {
    missing_result_claim_dossier_methods: missingResultClaimDossierMethods,
    unexpected_result_claim_dossier_methods: unexpectedResultClaimDossierMethods,
  });
}

const writerMethodCalls = new Set(
  [...source.matchAll(/\bthis\.[A-Za-z0-9_]+\.(create[A-Za-z0-9_]+|update[A-Za-z0-9_]+|apply[A-Za-z0-9_]+|submit[A-Za-z0-9_]+|sync[A-Za-z0-9_]+|collect[A-Za-z0-9_]+|cancel[A-Za-z0-9_]+|enqueue[A-Za-z0-9_]+)\(/g)]
    .map((match) => match[0]),
);
const missingAllowedWriterCalls = [...ALLOWED_WRITER_METHOD_CALLS]
  .filter((call) => !writerMethodCalls.has(call))
  .sort();
const unexpectedWriterCalls = [...writerMethodCalls]
  .filter((call) => !ALLOWED_WRITER_METHOD_CALLS.has(call))
  .sort();
if (missingAllowedWriterCalls.length > 0 || unexpectedWriterCalls.length > 0) {
  fail('Domain Gate writer call surface drifted.', {
    missing_allowed_writer_calls: missingAllowedWriterCalls,
    unexpected_writer_calls: unexpectedWriterCalls,
  });
}

console.log(JSON.stringify({
  status: 'passed',
  service_path: path.relative(REPO_ROOT, DOMAIN_GATE_SERVICE_PATH),
  allowed_service_class_refs: [...ALLOWED_SERVICE_CLASS_REFS].sort(),
  result_claim_dossier_methods: [...resultClaimDossierMethodRefs].sort(),
  writer_method_calls: [...writerMethodCalls].sort(),
}, null, 2));
