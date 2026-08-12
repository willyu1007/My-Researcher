import {
  buildScientificEvidenceP5AuthoritySnapshotV1,
  buildScientificEvidenceP5ExecutionPackageV3,
  preflightScientificEvidenceP5PackageV3,
  type ScientificEvidenceP5AuthoritySnapshotV1,
  type ScientificEvidenceP5EligibilityRecordV3,
  type ScientificEvidenceP5ExecutionPackageV3,
} from './scientific-evidence-p5-eligibility-service.js';

export const SCIENTIFIC_EVIDENCE_P5_PREPARED_AUTHORIZATION_SCHEMA_V3 =
  'ScientificEvidenceP5PreparedAuthorization@v3' as const;
export const SCIENTIFIC_EVIDENCE_P5_AUTHORIZATION_ACCEPTANCE_SCHEMA_V3 =
  'ScientificEvidenceP5AuthorizationAcceptance@v3' as const;
export const SCIENTIFIC_EVIDENCE_P5_CLEANUP_CONFIRMATION_HASH =
  'sha256:ff88f3c9090afcd139c5618749e768487c34148689f24d02981c97f945fe23c0' as const;

export interface ScientificEvidenceP5PreparedAuthorizationV3 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_PREPARED_AUTHORIZATION_SCHEMA_V3;
  status: 'eligible';
  execution_package: ScientificEvidenceP5ExecutionPackageV3;
  authority_snapshot: ScientificEvidenceP5AuthoritySnapshotV1;
  eligibility: ScientificEvidenceP5EligibilityRecordV3;
  effect_census: {
    database_writes: 0;
    cloud_calls: 0;
    create_job_calls: 0;
    capability_changes: 0;
    credentials_read: 0;
  };
}

export interface ScientificEvidenceP5AuthorizationAcceptanceV3 {
  schema: typeof SCIENTIFIC_EVIDENCE_P5_AUTHORIZATION_ACCEPTANCE_SCHEMA_V3;
  status: 'authorized_pending_issuance';
  p5_attempt_id: string;
  package_hash: string;
  authority_snapshot_hash: string;
  eligibility_record_hash: string;
  authorization: {
    source: 'current_codex_task_user';
    received_at: string;
    text_utf8_sha256: string;
    text_utf8_bytes: number;
    user_authorized: true;
    qualification: {
      required: true;
      allowed_operations: [
        'Sts.AssumeRole',
        'Sts.GetCallerIdentity',
        'AIWorkspace.GetWorkspace',
        'PaiImage.GetImage',
      ];
      create_job_forbidden: true;
      product_capabilities_must_remain_disabled: true;
      grants_paid_execution_authority: false;
    };
    authorized_operations: ScientificEvidenceP5ExecutionPackageV3['authorized_operations'];
    cost_ceiling: ScientificEvidenceP5ExecutionPackageV3['cost_ceiling'];
    operational_timeline: ScientificEvidenceP5ExecutionPackageV3['operational_timeline'] & {
      timezone_note: string;
    };
    credential_policy_binding: {
      schema_version: 'ScientificEvidenceP5ControlPlaneCredential@v2';
      source_principal_arn: string;
      controller_role_arn: string;
      runtime_role_arn: string;
      role_session_name: string;
      session_policy_hash: string;
      issued_duration_seconds: 3600;
      minimum_remaining_at_live_start_seconds: 2400;
      credential_operations_stop_before_earliest_expiration_seconds: 360;
      automatic_expiration_not_after: string;
    };
    cleanup_confirmation: {
      confirmed: true;
      text_utf8_sha256: typeof SCIENTIFIC_EVIDENCE_P5_CLEANUP_CONFIRMATION_HASH;
      prohibits_ram_role_or_policy_mutation: true;
    };
  };
}

export function assertScientificEvidenceP5PreparedAuthorizationV3(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): void {
  const executionPackage = buildScientificEvidenceP5ExecutionPackageV3(
    prepared.execution_package,
  );
  const authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1(
    prepared.authority_snapshot,
  );
  const eligibility = preflightScientificEvidenceP5PackageV3({
    execution_package: executionPackage,
    authority_snapshot: authoritySnapshot,
  });
  if (
    !hasExactKeys(prepared, [
      'schema_version',
      'status',
      'execution_package',
      'authority_snapshot',
      'eligibility',
      'effect_census',
    ])
    || !hasExactKeys(prepared.effect_census, [
      'database_writes',
      'cloud_calls',
      'create_job_calls',
      'capability_changes',
      'credentials_read',
    ])
    || !canonicalEqual(prepared.eligibility, eligibility)
    || !canonicalEqual(prepared.effect_census, {
      database_writes: 0,
      cloud_calls: 0,
      create_job_calls: 0,
      capability_changes: 0,
      credentials_read: 0,
    })
    ||
    prepared.schema_version !== SCIENTIFIC_EVIDENCE_P5_PREPARED_AUTHORIZATION_SCHEMA_V3
    || prepared.status !== 'eligible'
    || executionPackage.package_hash !== prepared.execution_package.package_hash
    || authoritySnapshot.authority_snapshot_hash
      !== prepared.authority_snapshot.authority_snapshot_hash
    || eligibility.status !== 'eligible'
    || eligibility.reason_codes.length !== 0
    || eligibility.eligibility_record_hash !== prepared.eligibility.eligibility_record_hash
  ) throw new Error('T136_P5_PREPARED_AUTHORIZATION_INVALID');
}

export function assertScientificEvidenceP5AuthorizationAcceptanceV3(input: {
  prepared: ScientificEvidenceP5PreparedAuthorizationV3;
  acceptance: ScientificEvidenceP5AuthorizationAcceptanceV3;
}): void {
  assertScientificEvidenceP5PreparedAuthorizationV3(input.prepared);
  const { execution_package: executionPackage } = input.prepared;
  const { acceptance } = input;
  const policy = executionPackage.credential_policy;
  const authorization = acceptance.authorization;
  if (
    !hasExactKeys(acceptance, [
      'schema',
      'status',
      'p5_attempt_id',
      'package_hash',
      'authority_snapshot_hash',
      'eligibility_record_hash',
      'authorization',
    ])
    || !hasExactKeys(authorization, [
      'source',
      'received_at',
      'text_utf8_sha256',
      'text_utf8_bytes',
      'user_authorized',
      'qualification',
      'authorized_operations',
      'cost_ceiling',
      'operational_timeline',
      'credential_policy_binding',
      'cleanup_confirmation',
    ])
    || !hasExactKeys(authorization.credential_policy_binding, [
      'schema_version',
      'source_principal_arn',
      'controller_role_arn',
      'runtime_role_arn',
      'role_session_name',
      'session_policy_hash',
      'issued_duration_seconds',
      'minimum_remaining_at_live_start_seconds',
      'credential_operations_stop_before_earliest_expiration_seconds',
      'automatic_expiration_not_after',
    ])
    ||
    acceptance.schema !== SCIENTIFIC_EVIDENCE_P5_AUTHORIZATION_ACCEPTANCE_SCHEMA_V3
    || acceptance.status !== 'authorized_pending_issuance'
    || acceptance.p5_attempt_id !== executionPackage.p5_attempt_id
    || acceptance.package_hash !== executionPackage.package_hash
    || acceptance.authority_snapshot_hash
      !== input.prepared.authority_snapshot.authority_snapshot_hash
    || acceptance.eligibility_record_hash
      !== input.prepared.eligibility.eligibility_record_hash
    || authorization.source !== 'current_codex_task_user'
    || authorization.user_authorized !== true
    || !isIsoTimestamp(authorization.received_at)
    || !isHash(authorization.text_utf8_sha256)
    || !Number.isSafeInteger(authorization.text_utf8_bytes)
    || authorization.text_utf8_bytes <= 0
    || !canonicalEqual(authorization.qualification, policy.qualification)
    || !canonicalEqual(authorization.authorized_operations, executionPackage.authorized_operations)
    || !canonicalEqual(authorization.cost_ceiling, executionPackage.cost_ceiling)
    || !canonicalEqual(
      {
        schema_version: authorization.operational_timeline.schema_version,
        issuance: authorization.operational_timeline.issuance,
        qualification: authorization.operational_timeline.qualification,
        live: authorization.operational_timeline.live,
        closure: authorization.operational_timeline.closure,
      },
      executionPackage.operational_timeline,
    )
    || !isNonEmpty(authorization.operational_timeline.timezone_note)
    || !canonicalEqual(authorization.credential_policy_binding, {
      schema_version: policy.schema_version,
      source_principal_arn: policy.source_principal.arn,
      controller_role_arn: policy.controller_role.arn,
      runtime_role_arn: executionPackage.provider.profile.workload_binding.runtime_role_arn,
      role_session_name: policy.role_session_name,
      session_policy_hash: policy.session_policy_hash,
      issued_duration_seconds: policy.issued_duration_seconds,
      minimum_remaining_at_live_start_seconds:
        policy.minimum_remaining_at_live_start_seconds,
      credential_operations_stop_before_earliest_expiration_seconds:
        policy.credential_operations_stop_before_earliest_expiration_seconds,
      automatic_expiration_not_after: policy.automatic_expiration_not_after,
    })
    || !canonicalEqual(authorization.cleanup_confirmation, {
      confirmed: true,
      text_utf8_sha256: SCIENTIFIC_EVIDENCE_P5_CLEANUP_CONFIRMATION_HASH,
      prohibits_ram_role_or_policy_mutation: true,
    })
  ) throw new Error('T136_P5_AUTHORIZATION_ACCEPTANCE_INVALID');
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortJson(left)) === JSON.stringify(sortJson(right));
}

function hasExactKeys(value: unknown, expected: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(
      ([key, child]) => [key, sortJson(child)],
    ),
  );
}

function isHash(value: string): boolean {
  return /^sha256:[a-f0-9]{64}$/.test(value);
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
