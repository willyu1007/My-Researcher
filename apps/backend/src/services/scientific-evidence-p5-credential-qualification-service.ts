import { createHash } from 'node:crypto';

import {
  serverHashScientificEvidenceP5CredentialQualificationV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  ScientificEvidenceP5ExecutionPackageV3,
} from './scientific-evidence-p5-eligibility-service.js';

export const SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1 =
  'ScientificEvidenceP5CredentialQualification@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_QUALIFICATION_OPERATIONS_V1 = Object.freeze([
  'Sts.GetCallerIdentity',
  'AIWorkspace.GetWorkspace',
  'PaiImage.GetImage',
] as const);

export interface ScientificEvidenceP5QualificationOperationV1 {
  ordinal: 1 | 2 | 3;
  operation: (typeof SCIENTIFIC_EVIDENCE_P5_QUALIFICATION_OPERATIONS_V1)[number];
  endpoint: string;
  request_id: string;
  outcome: 'succeeded';
}

export interface ScientificEvidenceP5CredentialQualificationContentV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1;
  status: 'passed';
  p5_attempt_id: string;
  package_hash: string;
  qualified_at: string;
  issuance: {
    assume_role_request_id: string;
    occurred_at: string;
  };
  credential: {
    access_key_id_hash: string;
    issued_at: string;
    expiration: string;
    controller_role_arn: string;
    role_session_name: string;
  };
  caller_identity: {
    account_id: string;
    identity_type: 'AssumedRoleUser';
    arn: string;
    principal_id_hash: string;
  };
  observations: {
    workspace: {
      workspace_id: string;
      status: string;
    };
    image: {
      image_id: string;
      image_uri: string;
      workspace_id: string | null;
      accessibility: string;
    };
  };
  operation_ledger: [
    ScientificEvidenceP5QualificationOperationV1,
    ScientificEvidenceP5QualificationOperationV1,
    ScientificEvidenceP5QualificationOperationV1,
  ];
  effect_census: {
    assume_role_calls: 1;
    read_only_provider_calls: 3;
    create_job_calls: 0;
    provider_write_calls: 0;
    database_writes: 0;
    capability_changes: 0;
    local_credential_config_writes: 0;
  };
}

export interface ScientificEvidenceP5CredentialQualificationV1
  extends ScientificEvidenceP5CredentialQualificationContentV1 {
  qualification_record_hash: string;
}

export interface ScientificEvidenceP5WorkspaceObservationV1 {
  workspace_id: string;
  status: string;
  request_id: string;
}

export function normalizeScientificEvidenceP5WorkspaceObservationV1(input: {
  response_body: unknown;
  expected_workspace_id: string;
}): ScientificEvidenceP5WorkspaceObservationV1 {
  if (!/^[1-9][0-9]*$/.test(input.expected_workspace_id)) {
    throw new Error('T136_P5_QUALIFICATION_EXPECTED_WORKSPACE_ID_INVALID');
  }
  const body = asRecord(
    input.response_body,
    'T136_P5_QUALIFICATION_WORKSPACE_RESPONSE_BODY_INVALID',
  );
  const workspaceId = readAliasedWorkspaceId(body, 'WorkspaceId', 'workspaceId');
  if (workspaceId !== input.expected_workspace_id) {
    throw new Error('T136_P5_QUALIFICATION_WORKSPACE_ID_MISMATCH');
  }
  return {
    workspace_id: workspaceId,
    status: readAliasedString(body, 'Status', 'status'),
    request_id: readAliasedString(body, 'RequestId', 'requestId'),
  };
}

export function buildScientificEvidenceP5CredentialQualificationV1(
  value:
    | ScientificEvidenceP5CredentialQualificationContentV1
    | ScientificEvidenceP5CredentialQualificationV1,
): ScientificEvidenceP5CredentialQualificationV1 {
  const { qualification_record_hash: _ignored, ...content } = value as
    ScientificEvidenceP5CredentialQualificationV1;
  return {
    ...content,
    qualification_record_hash:
      serverHashScientificEvidenceP5CredentialQualificationV1(content),
  };
}

export function buildScientificEvidenceP5AssumedRoleSessionArn(input: {
  controller_role_arn: string;
  role_session_name: string;
}): string {
  const controller = parseControllerRoleArn(input.controller_role_arn);
  if (!/^[A-Za-z0-9+=,.@_-]{2,64}$/.test(input.role_session_name)) {
    throw new Error('T136_P5_QUALIFICATION_ROLE_SESSION_NAME_INVALID');
  }
  return `acs:ram::${controller.account_id}:assumed-role/`
    + `${controller.role_name}/${input.role_session_name}`;
}

export function assertScientificEvidenceP5CredentialQualificationV1(input: {
  execution_package: ScientificEvidenceP5ExecutionPackageV3;
  qualification: ScientificEvidenceP5CredentialQualificationV1;
  expected_image_id: string;
  current_credential?: {
    access_key_id: string;
    issued_at: string;
    expiration: string;
  };
}): void {
  const { execution_package: executionPackage, qualification } = input;
  if (!validQualificationShape(qualification)) {
    throw new Error('T136_P5_QUALIFICATION_RECORD_SHAPE_INVALID');
  }
  const policy = executionPackage.credential_policy;
  const controller = parseControllerRoleArn(policy.controller_role.arn);
  const content = qualificationContent(qualification);
  if (
    qualification.schema_version !== SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1
    || qualification.status !== 'passed'
    || qualification.p5_attempt_id !== executionPackage.p5_attempt_id
    || qualification.package_hash !== executionPackage.package_hash
    || qualification.qualification_record_hash
      !== serverHashScientificEvidenceP5CredentialQualificationV1(content)
  ) throw new Error('T136_P5_QUALIFICATION_RECORD_BINDING_INVALID');

  const issuedAt = Date.parse(qualification.credential.issued_at);
  const expiration = Date.parse(qualification.credential.expiration);
  const qualifiedAt = Date.parse(qualification.qualified_at);
  const issuanceOccurredAt = Date.parse(qualification.issuance.occurred_at);
  const timeline = executionPackage.operational_timeline;
  const issuanceNotBefore = Date.parse(timeline.issuance.not_before);
  const dispatchNotAfter = Date.parse(timeline.issuance.dispatch_not_after);
  const qualificationNotBefore = Date.parse(timeline.qualification.not_before);
  const qualificationExpiresAt = Date.parse(timeline.qualification.expires_at);
  if (
    ![issuedAt, expiration, qualifiedAt, issuanceOccurredAt].every(Number.isFinite)
    || issuedAt < issuanceNotBefore
    || issuedAt > dispatchNotAfter
    || issuanceOccurredAt < issuanceNotBefore
    || issuanceOccurredAt > dispatchNotAfter
    || expiration - issuedAt !== policy.issued_duration_seconds * 1_000
    || expiration > Date.parse(policy.automatic_expiration_not_after)
    || qualifiedAt < issuedAt
    || qualifiedAt < qualificationNotBefore
    || qualifiedAt >= qualificationExpiresAt
  ) throw new Error('T136_P5_QUALIFICATION_TIME_BOUND_INVALID');

  const expectedCallerArn = buildScientificEvidenceP5AssumedRoleSessionArn({
    controller_role_arn: policy.controller_role.arn,
    role_session_name: policy.role_session_name,
  });
  if (
    qualification.credential.controller_role_arn !== policy.controller_role.arn
    || qualification.credential.role_session_name !== policy.role_session_name
    || qualification.caller_identity.account_id !== controller.account_id
    || qualification.caller_identity.identity_type !== 'AssumedRoleUser'
    || qualification.caller_identity.arn !== expectedCallerArn
    || !isHash(qualification.caller_identity.principal_id_hash)
    || !isNonEmpty(qualification.issuance.assume_role_request_id)
  ) throw new Error('T136_P5_QUALIFICATION_CALLER_IDENTITY_INVALID');

  const profile = executionPackage.provider.profile;
  if (
    qualification.observations.workspace.workspace_id !== profile.workspace_id
    || !isNonEmpty(qualification.observations.workspace.status)
    || qualification.observations.image.image_id !== input.expected_image_id
    || qualification.observations.image.image_uri !== profile.image_uri
    || !isOptionalWorkspaceId(qualification.observations.image.workspace_id)
    || qualification.observations.image.accessibility !== 'PUBLIC'
  ) throw new Error('T136_P5_QUALIFICATION_PROVIDER_OBSERVATION_INVALID');

  const expectedEndpoints = [
    'sts.aliyuncs.com',
    `aiworkspace.${profile.region_id}.aliyuncs.com`,
    `aiworkspace.${profile.region_id}.aliyuncs.com`,
  ];
  const requestIds = new Set<string>();
  for (const [index, operation] of qualification.operation_ledger.entries()) {
    if (
      operation.ordinal !== index + 1
      || operation.operation !== SCIENTIFIC_EVIDENCE_P5_QUALIFICATION_OPERATIONS_V1[index]
      || operation.endpoint !== expectedEndpoints[index]
      || operation.outcome !== 'succeeded'
      || !isNonEmpty(operation.request_id)
      || requestIds.has(operation.request_id)
    ) throw new Error('T136_P5_QUALIFICATION_OPERATION_LEDGER_INVALID');
    requestIds.add(operation.request_id);
  }
  if (
    qualification.effect_census.assume_role_calls !== 1
    || qualification.effect_census.read_only_provider_calls !== 3
    || qualification.effect_census.create_job_calls !== 0
    || qualification.effect_census.provider_write_calls !== 0
    || qualification.effect_census.database_writes !== 0
    || qualification.effect_census.capability_changes !== 0
    || qualification.effect_census.local_credential_config_writes !== 0
  ) throw new Error('T136_P5_QUALIFICATION_EFFECT_CENSUS_INVALID');

  if (input.current_credential) {
    if (
      qualification.credential.access_key_id_hash
        !== hashSensitiveRef(input.current_credential.access_key_id)
      || qualification.credential.issued_at !== input.current_credential.issued_at
      || qualification.credential.expiration !== input.current_credential.expiration
    ) throw new Error('T136_P5_QUALIFICATION_CREDENTIAL_BINDING_INVALID');
  } else if (!isHash(qualification.credential.access_key_id_hash)) {
    throw new Error('T136_P5_QUALIFICATION_CREDENTIAL_HASH_INVALID');
  }

}

export function hashScientificEvidenceP5SensitiveRef(value: string): string {
  return hashSensitiveRef(value);
}

function qualificationContent(
  qualification: ScientificEvidenceP5CredentialQualificationV1,
): ScientificEvidenceP5CredentialQualificationContentV1 {
  const { qualification_record_hash: _ignored, ...content } = qualification;
  return content;
}

function hashSensitiveRef(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function parseControllerRoleArn(value: string): {
  account_id: string;
  role_name: string;
} {
  const match = /^acs:ram::(\d+):role\/([A-Za-z0-9+=,.@_-]+)$/.exec(value);
  if (!match) throw new Error('T136_P5_QUALIFICATION_CONTROLLER_ROLE_INVALID');
  return { account_id: match[1], role_name: match[2] };
}

function isHash(value: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function isOptionalWorkspaceId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && /^[1-9]\d*$/.test(value));
}

function readAliasedWorkspaceId(
  record: Record<string, unknown>,
  providerKey: string,
  normalizedKey: string,
): string {
  const values = [record[providerKey], record[normalizedKey]]
    .filter((value) => value !== undefined)
    .map(normalizeWorkspaceId);
  if (values.length === 0) {
    throw new Error('T136_P5_QUALIFICATION_WORKSPACE_ID_MISSING');
  }
  if (new Set(values).size !== 1) {
    throw new Error('T136_P5_QUALIFICATION_WORKSPACE_ID_CONFLICT');
  }
  return values[0]!;
}

function normalizeWorkspaceId(value: unknown): string {
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  throw new Error('T136_P5_QUALIFICATION_WORKSPACE_ID_INVALID');
}

function readAliasedString(
  record: Record<string, unknown>,
  providerKey: string,
  normalizedKey: string,
): string {
  const present = [record[providerKey], record[normalizedKey]]
    .filter((value) => value !== undefined);
  if (
    present.length === 0
    || present.some(
      (value) => typeof value !== 'string' || value.length === 0 || value.trim() !== value,
    )
  ) {
    throw new Error(`T136_P5_QUALIFICATION_WORKSPACE_${providerKey.toUpperCase()}_INVALID`);
  }
  const values = present as string[];
  if (new Set(values).size !== 1) {
    throw new Error(`T136_P5_QUALIFICATION_WORKSPACE_${providerKey.toUpperCase()}_CONFLICT`);
  }
  return values[0]!;
}

function asRecord(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function validQualificationShape(
  value: ScientificEvidenceP5CredentialQualificationV1,
): boolean {
  return hasExactKeys(value, [
    'schema_version',
    'status',
    'p5_attempt_id',
    'package_hash',
    'qualified_at',
    'issuance',
    'credential',
    'caller_identity',
    'observations',
    'operation_ledger',
    'effect_census',
    'qualification_record_hash',
  ])
    && hasExactKeys(value.issuance, ['assume_role_request_id', 'occurred_at'])
    && hasExactKeys(value.credential, [
      'access_key_id_hash',
      'issued_at',
      'expiration',
      'controller_role_arn',
      'role_session_name',
    ])
    && hasExactKeys(value.caller_identity, [
      'account_id',
      'identity_type',
      'arn',
      'principal_id_hash',
    ])
    && hasExactKeys(value.observations, ['workspace', 'image'])
    && hasExactKeys(value.observations.workspace, ['workspace_id', 'status'])
    && hasExactKeys(value.observations.image, [
      'image_id',
      'image_uri',
      'workspace_id',
      'accessibility',
    ])
    && value.operation_ledger.length === 3
    && value.operation_ledger.every((operation) => hasExactKeys(operation, [
      'ordinal',
      'operation',
      'endpoint',
      'request_id',
      'outcome',
    ]))
    && hasExactKeys(value.effect_census, [
      'assume_role_calls',
      'read_only_provider_calls',
      'create_job_calls',
      'provider_write_calls',
      'database_writes',
      'capability_changes',
      'local_credential_config_writes',
    ]);
}

function hasExactKeys(value: unknown, expected: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}
