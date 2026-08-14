#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  assertScientificEvidenceP5PreparedAuthorizationV3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from '../src/services/scientific-evidence-p5-authorization-service.js';
import {
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';

import {
  buildScientificEvidenceP5CredentialIntegrityReceiptV1,
  clearScientificEvidenceP5TemporaryCredential,
  readScientificEvidenceP5TemporaryCredentialEnvironment,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY,
} from '../src/services/scientific-evidence-p5-credential-integrity-service.js';

const CAPABILITY_KEYS = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/prepared-authorization-v15.json',
);
let localAttemptTerminalWriteCount = 0;

async function main(): Promise<void> {
  assertNoArguments();
  const prepared = await readPreparedAuthorization();
  const binding = attemptBinding(prepared);
  const result = await runScientificEvidenceP5ClaimedStageV1({
    manifest_directory: path.dirname(PREPARED_PATH),
    binding,
    stage: 'credential_integrity',
    on_terminalized: (created) => {
      localAttemptTerminalWriteCount = Math.max(localAttemptTerminalWriteCount, created ? 1 : 0);
    },
    operation: async () => {
      assertCapabilitiesDisabled();
      if (process.env[SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY] !== undefined) {
        throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_ALREADY_PRESENT');
      }
      const credential = readScientificEvidenceP5TemporaryCredentialEnvironment(process.env);
      try {
        const receipt = buildScientificEvidenceP5CredentialIntegrityReceiptV1(credential);
        return {
          schema_version: 'ScientificEvidenceP5CredentialIntegrityCheck@v1',
          status: 'passed_local_only',
          p5_attempt_id: binding.p5_attempt_id,
          package_hash: binding.package_hash,
          receipt,
          cloud_call_count: 0,
          database_write_count: 0,
          capability_change_count: 0,
          local_credential_config_write_count: 0,
          local_attempt_terminal_write_count: 0,
        };
      } finally {
        clearScientificEvidenceP5TemporaryCredential(credential);
        clearCredentialEnvironment();
      }
    },
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function readPreparedAuthorization(): Promise<ScientificEvidenceP5PreparedAuthorizationV3> {
  const prepared = JSON.parse(
    await fs.readFile(PREPARED_PATH, 'utf8'),
  ) as ScientificEvidenceP5PreparedAuthorizationV3;
  assertScientificEvidenceP5PreparedAuthorizationV3(prepared);
  return prepared;
}

function attemptBinding(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.execution_package.p5_attempt_id,
    package_hash: prepared.execution_package.package_hash,
  };
}

function assertNoArguments(): void {
  if (process.argv.length !== 2) {
    throw new Error('T136_P5_CREDENTIAL_INTEGRITY_ARGUMENTS_INVALID');
  }
}

function assertCapabilitiesDisabled(): void {
  for (const key of CAPABILITY_KEYS) {
    const value = process.env[key]?.trim().toLowerCase();
    if (value !== undefined && !['false', '0', ''].includes(value)) {
      throw new Error('T136_P5_CREDENTIAL_INTEGRITY_CAPABILITY_ENABLED');
    }
  }
}

function clearCredentialEnvironment(): void {
  for (const key of SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1) {
    delete process.env[key];
  }
}

main().catch((error: unknown) => {
  clearCredentialEnvironment();
  const reason = scientificEvidenceP5TerminalReasonCode(
    error,
    'T136_P5_CREDENTIAL_INTEGRITY_FAILED',
  );
  process.stderr.write(`${JSON.stringify({
    schema_version: 'ScientificEvidenceP5CredentialIntegrityFailure@v1',
    status: 'failed_local_only',
    reason,
    cloud_call_count: 0,
    database_write_count: 0,
    capability_change_count: 0,
    local_credential_config_write_count: 0,
    local_attempt_terminal_write_count: localAttemptTerminalWriteCount,
  })}\n`);
  process.exitCode = 1;
});
