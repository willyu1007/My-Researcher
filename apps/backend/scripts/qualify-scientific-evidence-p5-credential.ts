#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  GetImageRequest,
} from '@alicloud/aiworkspace20210204';
import { $OpenApiUtil } from '@alicloud/openapi-core';

import {
  assertScientificEvidenceP5AuthorizationAcceptanceV3,
  assertScientificEvidenceP5PreparedAuthorizationV3,
  type ScientificEvidenceP5AuthorizationAcceptanceV3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from '../src/services/scientific-evidence-p5-authorization-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1,
  buildScientificEvidenceP5AssumedRoleSessionArn,
  buildScientificEvidenceP5CredentialQualificationV1,
  hashScientificEvidenceP5SensitiveRef,
  type ScientificEvidenceP5QualificationOperationV1,
} from '../src/services/scientific-evidence-p5-credential-qualification-service.js';
import {
  readScientificEvidenceP5AttemptTerminalV1,
  resolveScientificEvidenceP5AttemptTerminalPath,
  runScientificEvidenceP5ClaimedStageV1,
  scientificEvidenceP5TerminalReasonCode,
  type ScientificEvidenceP5AttemptBindingV1,
} from '../src/services/scientific-evidence-p5-attempt-terminal-service.js';
import {
  assertScientificEvidenceP5CredentialIntegrityReceiptV1,
  clearScientificEvidenceP5TemporaryCredential,
  parseScientificEvidenceP5CredentialIntegrityReceiptV1,
  readScientificEvidenceP5TemporaryCredentialEnvironment,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1,
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY,
  type ScientificEvidenceP5TemporaryCredentialV1,
} from '../src/services/scientific-evidence-p5-credential-integrity-service.js';
import {
  assertScientificEvidenceP5QualificationWindow,
} from '../src/services/scientific-evidence-p5-operational-timeline-service.js';
import {
  readScientificEvidenceP5WorkspaceObservationV1,
} from '../src/services/scientific-evidence-p5-workspace-qualification-client.js';

type RunnerMode = 'offline-preflight' | 'execute';

type TemporaryCredential = ScientificEvidenceP5TemporaryCredentialV1;

interface CallerIdentity {
  account_id: string;
  identity_type: 'AssumedRoleUser';
  arn: string;
  principal_id: string;
  request_id: string;
}

const require = createRequire(import.meta.url);
const AIWorkspaceClientConstructor = require('@alicloud/aiworkspace20210204').default as
  typeof import('@alicloud/aiworkspace20210204').default;
const OpenApiClientConstructor = require('@alicloud/openapi-core').default as
  typeof import('@alicloud/openapi-core').default;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/prepared-authorization-v17.json',
);
const AUTHORIZATION_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/authorization-acceptance-v17.json',
);
const QUALIFICATION_PATH = path.join(
  REPO_ROOT,
  'workloads/scifact-recall-p5/manifests/credential-qualification-v1.json',
);
const IMAGE_ID = 'image-liuxvj7p2qcnflha84';
const CAPABILITY_KEYS = [
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED',
] as const;
let localAttemptTerminalWriteCount = 0;

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const prepared = await readJson<ScientificEvidenceP5PreparedAuthorizationV3>(PREPARED_PATH);
  assertScientificEvidenceP5PreparedAuthorizationV3(prepared);
  const binding = attemptBinding(prepared);
  const terminalPath = resolveScientificEvidenceP5AttemptTerminalPath({
    manifest_directory: path.dirname(PREPARED_PATH),
    binding,
  });

  if (mode === 'offline-preflight') {
    assertCapabilitiesDisabled();
    const existingQualification = await fileExists(QUALIFICATION_PATH);
    const terminal = await readScientificEvidenceP5AttemptTerminalV1({
      terminal_path: terminalPath,
      binding,
    });
    assert.equal(existingQualification, false, 'Qualification record must be fresh.');
    console.log(JSON.stringify({
      schema_version: 'ScientificEvidenceP5CredentialQualificationOfflinePreflight@v1',
      status: terminal
        ? 'passed_terminal_attempt_no_execute'
        : 'passed_waiting_for_exact_authorization_and_operational_window',
      package_hash: prepared.execution_package.package_hash,
      attempt_terminal_record_exists: terminal !== null,
      controller_role_arn: prepared.execution_package.credential_policy.controller_role.arn,
      runtime_role_arn:
        prepared.execution_package.provider.profile.workload_binding.runtime_role_arn,
      issuance_window: prepared.execution_package.operational_timeline.issuance,
      qualification_window: prepared.execution_package.operational_timeline.qualification,
      live_window: prepared.execution_package.operational_timeline.live,
      qualification_record_exists: false,
      credential_read_count: 0,
      cloud_call_count: 0,
      create_job_call_count: 0,
      database_write_count: 0,
      capability_change_count: 0,
    }, null, 2));
    return;
  }

  const serialized = await runScientificEvidenceP5ClaimedStageV1({
    manifest_directory: path.dirname(PREPARED_PATH),
    binding,
    stage: 'credential_qualification',
    on_terminalized: (created) => {
      localAttemptTerminalWriteCount = Math.max(localAttemptTerminalWriteCount, created ? 1 : 0);
    },
    operation: async () => {
      assertCapabilitiesDisabled();
      assert.equal(
        await fileExists(QUALIFICATION_PATH),
        false,
        'T136_P5_QUALIFICATION_RECORD_ALREADY_EXISTS',
      );
      const acceptance = await readJson<ScientificEvidenceP5AuthorizationAcceptanceV3>(
        AUTHORIZATION_PATH,
      );
      assertScientificEvidenceP5AuthorizationAcceptanceV3({ prepared, acceptance });
      assertScientificEvidenceP5QualificationWindow(
        prepared.execution_package.operational_timeline,
        Date.now(),
      );
      const credential = readTemporaryCredential(prepared);
      try {
        const result = await executeReadOnlyQualification(prepared, credential);
        assertScientificEvidenceP5QualificationWindow(
          prepared.execution_package.operational_timeline,
          Date.now(),
        );
        const output = `${JSON.stringify(result, null, 2)}\n`;
        await fs.writeFile(QUALIFICATION_PATH, output, { encoding: 'utf8', flag: 'wx' });
        return output;
      } finally {
        clearCredentialMaterial(credential);
      }
    },
  });
  process.stdout.write(serialized);
}

async function executeReadOnlyQualification(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
  credential: TemporaryCredential,
) {
  const executionPackage = prepared.execution_package;
  const profile = executionPackage.provider.profile;
  const endpoint = `aiworkspace.${profile.region_id}.aliyuncs.com`;
  const config = new $OpenApiUtil.Config({
    accessKeyId: credential.access_key_id,
    accessKeySecret: credential.access_key_secret,
    securityToken: credential.security_token,
    endpoint,
    regionId: profile.region_id,
    protocol: 'https',
    connectTimeout: 10_000,
    readTimeout: 15_000,
  });
  const workspaceClient = new AIWorkspaceClientConstructor(config);
  const caller = await getCallerIdentity(credential);
  assert.equal(
    caller.arn,
    buildScientificEvidenceP5AssumedRoleSessionArn({
      controller_role_arn: executionPackage.credential_policy.controller_role.arn,
      role_session_name: executionPackage.credential_policy.role_session_name,
    }),
  );
  const runtime = { autoretry: false, maxAttempts: 1 } as Parameters<
    InstanceType<typeof AIWorkspaceClientConstructor>['callApi']
  >[2];
  const workspaceObservation = await readScientificEvidenceP5WorkspaceObservationV1({
    call_api: (params, request, noRetryRuntime) => workspaceClient.callApi(
      params,
      request,
      noRetryRuntime as typeof runtime,
    ),
    workspace_id: profile.workspace_id,
  });
  const imageResponse = await workspaceClient.getImageWithOptions(
    IMAGE_ID,
    new GetImageRequest({ verbose: false }),
    {},
    runtime,
  );
  assert.equal(imageResponse.statusCode, 200);
  assert.equal(imageResponse.body?.imageUri, profile.image_uri);
  assert.equal(imageResponse.body?.accessibility, 'PUBLIC');
  assert.ok(imageResponse.body?.requestId);
  const imageWorkspaceId = imageResponse.body.workspaceId ?? null;
  assert.ok(imageWorkspaceId === null || /^[1-9]\d*$/.test(imageWorkspaceId));

  const operationLedger: [
    ScientificEvidenceP5QualificationOperationV1,
    ScientificEvidenceP5QualificationOperationV1,
    ScientificEvidenceP5QualificationOperationV1,
  ] = [
    operation(1, 'Sts.GetCallerIdentity', 'sts.aliyuncs.com', caller.request_id),
    operation(2, 'AIWorkspace.GetWorkspace', endpoint, workspaceObservation.request_id),
    operation(3, 'PaiImage.GetImage', endpoint, imageResponse.body.requestId),
  ];
  return buildScientificEvidenceP5CredentialQualificationV1({
    schema_version: SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1,
    status: 'passed',
    p5_attempt_id: executionPackage.p5_attempt_id,
    package_hash: executionPackage.package_hash,
    qualified_at: new Date().toISOString(),
    issuance: {
      assume_role_request_id: credential.assume_role_request_id,
      occurred_at: credential.issued_at,
    },
    credential: {
      access_key_id_hash: hashScientificEvidenceP5SensitiveRef(credential.access_key_id),
      issued_at: credential.issued_at,
      expiration: credential.expiration,
      controller_role_arn: executionPackage.credential_policy.controller_role.arn,
      role_session_name: executionPackage.credential_policy.role_session_name,
    },
    caller_identity: {
      account_id: caller.account_id,
      identity_type: caller.identity_type,
      arn: caller.arn,
      principal_id_hash: hashScientificEvidenceP5SensitiveRef(caller.principal_id),
    },
    observations: {
      workspace: {
        workspace_id: workspaceObservation.workspace_id,
        status: workspaceObservation.status,
      },
      image: {
        image_id: IMAGE_ID,
        image_uri: imageResponse.body.imageUri,
        workspace_id: imageWorkspaceId,
        accessibility: imageResponse.body.accessibility,
      },
    },
    operation_ledger: operationLedger,
    effect_census: {
      assume_role_calls: 1,
      read_only_provider_calls: 3,
      create_job_calls: 0,
      provider_write_calls: 0,
      database_writes: 0,
      capability_changes: 0,
      local_credential_config_writes: 0,
    },
  });
}

async function getCallerIdentity(credential: TemporaryCredential): Promise<CallerIdentity> {
  const client = new OpenApiClientConstructor(new $OpenApiUtil.Config({
    accessKeyId: credential.access_key_id,
    accessKeySecret: credential.access_key_secret,
    securityToken: credential.security_token,
    endpoint: 'sts.aliyuncs.com',
    protocol: 'https',
    connectTimeout: 10_000,
    readTimeout: 15_000,
  }));
  const request = new $OpenApiUtil.OpenApiRequest({});
  const runtime = { autoretry: false, maxAttempts: 1 } as Parameters<
    InstanceType<typeof OpenApiClientConstructor>['doRPCRequest']
  >[7];
  const raw: unknown = await client.doRPCRequest(
    'GetCallerIdentity',
    '2015-04-01',
    'HTTPS',
    'POST',
    'AK',
    'json',
    request,
    runtime,
  );
  const response = asRecord(raw, 'T136_P5_STS_RESPONSE_INVALID');
  assert.equal(response.statusCode, 200);
  const body = asRecord(response.body, 'T136_P5_STS_RESPONSE_BODY_INVALID');
  assert.equal(readString(body, 'IdentityType'), 'AssumedRoleUser');
  return {
    account_id: readString(body, 'AccountId'),
    identity_type: 'AssumedRoleUser',
    arn: readString(body, 'Arn'),
    principal_id: readString(body, 'PrincipalId'),
    request_id: readString(body, 'RequestId'),
  };
}

function operation(
  ordinal: 1 | 2 | 3,
  operationName: ScientificEvidenceP5QualificationOperationV1['operation'],
  endpoint: string,
  requestId: string,
): ScientificEvidenceP5QualificationOperationV1 {
  return { ordinal, operation: operationName, endpoint, request_id: requestId, outcome: 'succeeded' };
}

function attemptBinding(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): ScientificEvidenceP5AttemptBindingV1 {
  return {
    p5_attempt_id: prepared.execution_package.p5_attempt_id,
    package_hash: prepared.execution_package.package_hash,
  };
}

function readTemporaryCredential(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): TemporaryCredential {
  const credential = readScientificEvidenceP5TemporaryCredentialEnvironment(process.env);
  try {
    const serializedReceipt =
      process.env[SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY];
    if (serializedReceipt === undefined) {
      throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_MISSING');
    }
    assertScientificEvidenceP5CredentialIntegrityReceiptV1({
      credential,
      receipt: parseScientificEvidenceP5CredentialIntegrityReceiptV1(serializedReceipt),
    });
    const policy = prepared.execution_package.credential_policy;
    const issuance = prepared.execution_package.operational_timeline.issuance;
    const issuedAt = Date.parse(credential.issued_at);
    const expiration = Date.parse(credential.expiration);
    assert.ok(Number.isFinite(issuedAt) && Number.isFinite(expiration));
    assert.ok(issuedAt >= Date.parse(issuance.not_before));
    assert.ok(issuedAt <= Date.parse(issuance.dispatch_not_after));
    assert.equal(expiration - issuedAt, policy.issued_duration_seconds * 1_000);
    assert.ok(expiration <= Date.parse(policy.automatic_expiration_not_after));
    assert.equal(process.env.ALIBABA_CLOUD_CONFIG_FILE, undefined);
    return credential;
  } catch (error) {
    clearCredentialMaterial(credential);
    throw error;
  }
}

function assertCapabilitiesDisabled(): void {
  for (const key of CAPABILITY_KEYS) {
    const value = process.env[key]?.trim().toLowerCase();
    if (value !== undefined && !['false', '0', ''].includes(value)) {
      throw new Error(`${key} must remain disabled during credential qualification.`);
    }
  }
}

function clearCredentialMaterial(credential: TemporaryCredential): void {
  clearScientificEvidenceP5TemporaryCredential(credential);
  clearCredentialEnvironment();
}

function clearCredentialEnvironment(): void {
  for (const key of SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1) {
    delete process.env[key];
  }
}

function parseMode(args: string[]): RunnerMode {
  const normalized = args[0] === '--' ? args.slice(1) : args;
  const index = normalized.indexOf('--mode');
  const value = index >= 0 ? normalized[index + 1] : undefined;
  if (
    normalized.length !== 2
    || index !== 0
    || !['offline-preflight', 'execute'].includes(value ?? '')
  ) {
    throw new Error('Usage: qualify-scientific-evidence-p5-credential --mode <offline-preflight|execute>');
  }
  return value as RunnerMode;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function asRecord(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`T136_P5_STS_${key.toUpperCase()}_INVALID`);
  }
  return value;
}

main().catch((error: unknown) => {
  clearCredentialEnvironment();
  const reason = scientificEvidenceP5TerminalReasonCode(
    error,
    'T136_P5_CREDENTIAL_QUALIFICATION_FAILED',
  );
  console.error(JSON.stringify({
    schema_version: 'ScientificEvidenceP5CredentialQualificationFailure@v1',
    status: 'failed_without_paid_execution',
    reason,
    create_job_call_count: 0,
    provider_write_call_count: 0,
    database_write_count: 0,
    capability_change_count: 0,
    local_attempt_terminal_write_count: localAttemptTerminalWriteCount,
  }));
  process.exitCode = 1;
});
