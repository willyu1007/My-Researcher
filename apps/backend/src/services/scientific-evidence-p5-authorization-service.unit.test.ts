import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  SCIENTIFIC_EVIDENCE_P5_AUTHORIZATION_ACCEPTANCE_SCHEMA_V3,
  SCIENTIFIC_EVIDENCE_P5_CLEANUP_CONFIRMATION_HASH,
  assertScientificEvidenceP5AuthorizationAcceptanceV3,
  assertScientificEvidenceP5PreparedAuthorizationV3,
  type ScientificEvidenceP5AuthorizationAcceptanceV3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from './scientific-evidence-p5-authorization-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1,
  assertScientificEvidenceP5CredentialQualificationV1,
  buildScientificEvidenceP5AssumedRoleSessionArn,
  buildScientificEvidenceP5CredentialQualificationV1,
  hashScientificEvidenceP5SensitiveRef,
} from './scientific-evidence-p5-credential-qualification-service.js';

const IMAGE_ID = 'image-liuxvj7p2qcnflha84';
const ACCESS_KEY_ID = 'STS.example-controller-session';

async function preparedFixture(): Promise<ScientificEvidenceP5PreparedAuthorizationV3> {
  const prepared = JSON.parse(await fs.readFile(new URL(
    '../../../../workloads/scifact-recall-p5/manifests/prepared-authorization-v12.json',
    import.meta.url,
  ), 'utf8')) as ScientificEvidenceP5PreparedAuthorizationV3;
  assertScientificEvidenceP5PreparedAuthorizationV3(prepared);
  return prepared;
}

function acceptanceFixture(
  prepared: ScientificEvidenceP5PreparedAuthorizationV3,
): ScientificEvidenceP5AuthorizationAcceptanceV3 {
  const executionPackage = prepared.execution_package;
  const policy = executionPackage.credential_policy;
  return {
    schema: SCIENTIFIC_EVIDENCE_P5_AUTHORIZATION_ACCEPTANCE_SCHEMA_V3,
    status: 'authorized_pending_issuance',
    p5_attempt_id: executionPackage.p5_attempt_id,
    package_hash: executionPackage.package_hash,
    authority_snapshot_hash: prepared.authority_snapshot.authority_snapshot_hash,
    eligibility_record_hash: prepared.eligibility.eligibility_record_hash,
    authorization: {
      source: 'current_codex_task_user',
      received_at: '2026-08-10T00:00:00.000Z',
      text_utf8_sha256: `sha256:${'a'.repeat(64)}`,
      text_utf8_bytes: 100,
      user_authorized: true,
      qualification: structuredClone(policy.qualification) as
        ScientificEvidenceP5AuthorizationAcceptanceV3['authorization']['qualification'],
      authorized_operations: structuredClone(executionPackage.authorized_operations),
      cost_ceiling: structuredClone(executionPackage.cost_ceiling),
      operational_timeline: {
        ...structuredClone(executionPackage.operational_timeline),
        timezone_note: '2026-08-11 10:00-11:30 Asia/Shanghai',
      },
      credential_policy_binding: {
        schema_version: policy.schema_version,
        source_principal_arn: policy.source_principal.arn,
        controller_role_arn: policy.controller_role.arn,
        runtime_role_arn: executionPackage.provider.profile.workload_binding.runtime_role_arn,
        role_session_name: policy.role_session_name,
        session_policy_hash: policy.session_policy_hash,
        issued_duration_seconds: 3_600,
        minimum_remaining_at_live_start_seconds:
          policy.minimum_remaining_at_live_start_seconds as 2_400,
        credential_operations_stop_before_earliest_expiration_seconds: 360,
        automatic_expiration_not_after: policy.automatic_expiration_not_after,
      },
      cleanup_confirmation: {
        confirmed: true,
        text_utf8_sha256: SCIENTIFIC_EVIDENCE_P5_CLEANUP_CONFIRMATION_HASH,
        prohibits_ram_role_or_policy_mutation: true,
      },
    },
  };
}

async function qualificationFixture() {
  const prepared = await preparedFixture();
  const executionPackage = prepared.execution_package;
  const policy = executionPackage.credential_policy;
  return {
    prepared,
    qualification: buildScientificEvidenceP5CredentialQualificationV1({
      schema_version: SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_QUALIFICATION_SCHEMA_V1,
      status: 'passed',
      p5_attempt_id: executionPackage.p5_attempt_id,
      package_hash: executionPackage.package_hash,
      qualified_at: '2026-08-12T00:04:00.000Z',
      issuance: {
        assume_role_request_id: 'assume-role-request',
        occurred_at: '2026-08-12T00:00:20.000Z',
      },
      credential: {
        access_key_id_hash: hashScientificEvidenceP5SensitiveRef(ACCESS_KEY_ID),
        issued_at: '2026-08-12T00:00:20.000Z',
        expiration: '2026-08-12T01:00:20.000Z',
        controller_role_arn: policy.controller_role.arn,
        role_session_name: policy.role_session_name,
      },
      caller_identity: {
        account_id: '1183869713036194',
        identity_type: 'AssumedRoleUser',
        arn: buildScientificEvidenceP5AssumedRoleSessionArn({
          controller_role_arn: policy.controller_role.arn,
          role_session_name: policy.role_session_name,
        }),
        principal_id_hash: `sha256:${'b'.repeat(64)}`,
      },
      observations: {
        workspace: { workspace_id: '1450165', status: 'ENABLED' },
        image: {
          image_id: IMAGE_ID,
          image_uri: executionPackage.provider.profile.image_uri,
          workspace_id: null,
          accessibility: 'PUBLIC',
        },
      },
      operation_ledger: [
        {
          ordinal: 1,
          operation: 'Sts.GetCallerIdentity',
          endpoint: 'sts.aliyuncs.com',
          request_id: 'caller-request',
          outcome: 'succeeded',
        },
        {
          ordinal: 2,
          operation: 'AIWorkspace.GetWorkspace',
          endpoint: 'aiworkspace.cn-shanghai.aliyuncs.com',
          request_id: 'workspace-request',
          outcome: 'succeeded',
        },
        {
          ordinal: 3,
          operation: 'PaiImage.GetImage',
          endpoint: 'aiworkspace.cn-shanghai.aliyuncs.com',
          request_id: 'image-request',
          outcome: 'succeeded',
        },
      ],
      effect_census: {
        assume_role_calls: 1,
        read_only_provider_calls: 3,
        create_job_calls: 0,
        provider_write_calls: 0,
        database_writes: 0,
        capability_changes: 0,
        local_credential_config_writes: 0,
      },
    }),
  };
}

test('current prepared and authorization records bind the exact package', async () => {
  const prepared = await preparedFixture();
  assert.doesNotThrow(() => assertScientificEvidenceP5PreparedAuthorizationV3(prepared));
  assert.doesNotThrow(() => assertScientificEvidenceP5AuthorizationAcceptanceV3({
    prepared,
    acceptance: acceptanceFixture(prepared),
  }));
});

test('prepared authorization rejects a tampered eligibility projection', async () => {
  const prepared = await preparedFixture();
  const tampered = structuredClone(prepared);
  tampered.eligibility.status = 'ineligible';
  assert.throws(
    () => assertScientificEvidenceP5PreparedAuthorizationV3(tampered),
    /T136_P5_PREPARED_AUTHORIZATION_INVALID/,
  );
});

test('authorization rejects controller/runtime role conflation', async () => {
  const prepared = await preparedFixture();
  const acceptance = acceptanceFixture(prepared);
  acceptance.authorization.credential_policy_binding.controller_role_arn =
    acceptance.authorization.credential_policy_binding.runtime_role_arn;
  assert.throws(
    () => assertScientificEvidenceP5AuthorizationAcceptanceV3({ prepared, acceptance }),
    /T136_P5_AUTHORIZATION_ACCEPTANCE_INVALID/,
  );
});

test('qualification binds the same temporary credential and exact controller identity', async () => {
  const { prepared, qualification } = await qualificationFixture();
  assert.doesNotThrow(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification,
    expected_image_id: IMAGE_ID,
    current_credential: {
      access_key_id: ACCESS_KEY_ID,
      issued_at: qualification.credential.issued_at,
      expiration: qualification.credential.expiration,
    },
  }));
});

test('qualification keeps optional image ownership separate from the Job workspace', async () => {
  const { prepared, qualification } = await qualificationFixture();
  assert.equal(qualification.observations.image.workspace_id, null);
  assert.doesNotThrow(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification,
    expected_image_id: IMAGE_ID,
  }));

  const differentlyOwned = structuredClone(qualification);
  differentlyOwned.observations.image.workspace_id = '15945';
  const rebound = buildScientificEvidenceP5CredentialQualificationV1(differentlyOwned);
  assert.doesNotThrow(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification: rebound,
    expected_image_id: IMAGE_ID,
  }));

  const malformed = structuredClone(qualification);
  malformed.observations.image.workspace_id = '';
  const invalid = buildScientificEvidenceP5CredentialQualificationV1(malformed);
  assert.throws(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification: invalid,
    expected_image_id: IMAGE_ID,
  }), /T136_P5_QUALIFICATION_PROVIDER_OBSERVATION_INVALID/);
});

test('qualification derives the canonical STS assumed-role session ARN', async () => {
  const { prepared } = await qualificationFixture();
  const policy = prepared.execution_package.credential_policy;
  assert.equal(
    buildScientificEvidenceP5AssumedRoleSessionArn({
      controller_role_arn: policy.controller_role.arn,
      role_session_name: policy.role_session_name,
    }),
    'acs:ram::1183869713036194:assumed-role/'
      + 'pea-m7-canary-controller/t136-p5-scifact-20260811-r12',
  );
  assert.throws(
    () => buildScientificEvidenceP5AssumedRoleSessionArn({
      controller_role_arn: 'acs:ram::1183869713036194:assumed-role/pea-m7-canary-controller',
      role_session_name: policy.role_session_name,
    }),
    /T136_P5_QUALIFICATION_CONTROLLER_ROLE_INVALID/,
  );
  assert.throws(
    () => buildScientificEvidenceP5AssumedRoleSessionArn({
      controller_role_arn: policy.controller_role.arn,
      role_session_name: 'invalid/session',
    }),
    /T136_P5_QUALIFICATION_ROLE_SESSION_NAME_INVALID/,
  );
});

test('qualification rejects caller identity drift across every canonical ARN component', async () => {
  const { prepared, qualification } = await qualificationFixture();
  const cases: Array<{
    name: string;
    mutate: (value: typeof qualification) => void;
  }> = [
    {
      name: 'account field',
      mutate: (value) => { value.caller_identity.account_id = '1183869713036195'; },
    },
    {
      name: 'ARN account',
      mutate: (value) => {
        value.caller_identity.arn = value.caller_identity.arn.replace(
          '1183869713036194',
          '1183869713036195',
        );
      },
    },
    {
      name: 'role name',
      mutate: (value) => {
        value.caller_identity.arn = value.caller_identity.arn.replace(
          'pea-m7-canary-controller',
          'pea-m7-canary-runtime',
        );
      },
    },
    {
      name: 'session name',
      mutate: (value) => {
        value.caller_identity.arn = value.caller_identity.arn.replace('-r12', '-r13');
      },
    },
    {
      name: 'source role resource type',
      mutate: (value) => {
        value.caller_identity.arn = value.caller_identity.arn.replace(
          ':assumed-role/',
          ':role/',
        );
      },
    },
  ];

  for (const scenario of cases) {
    const tampered = structuredClone(qualification);
    scenario.mutate(tampered);
    const rebound = buildScientificEvidenceP5CredentialQualificationV1(tampered);
    assert.throws(
      () => assertScientificEvidenceP5CredentialQualificationV1({
        execution_package: prepared.execution_package,
        qualification: rebound,
        expected_image_id: IMAGE_ID,
      }),
      /T136_P5_QUALIFICATION_CALLER_IDENTITY_INVALID/,
      scenario.name,
    );
  }
});

test('qualification rejects a record from another credential', async () => {
  const { prepared, qualification } = await qualificationFixture();
  assert.throws(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification,
    expected_image_id: IMAGE_ID,
    current_credential: {
      access_key_id: 'STS.different',
      issued_at: qualification.credential.issued_at,
      expiration: qualification.credential.expiration,
    },
  }), /T136_P5_QUALIFICATION_CREDENTIAL_BINDING_INVALID/);
});

test('qualification hash detects a claimed non-zero CreateJob census', async () => {
  const { prepared, qualification } = await qualificationFixture();
  const tampered = structuredClone(qualification);
  (tampered.effect_census as { create_job_calls: number }).create_job_calls = 1;
  assert.throws(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification: tampered,
    expected_image_id: IMAGE_ID,
  }), /T136_P5_QUALIFICATION_RECORD_BINDING_INVALID/);
});

test('qualification rejects any unexpected secret-bearing field', async () => {
  const { prepared, qualification } = await qualificationFixture();
  const tampered = structuredClone(qualification) as typeof qualification &
    Record<string, unknown>;
  tampered.access_key_secret = 'must-not-be-stored';
  assert.throws(() => assertScientificEvidenceP5CredentialQualificationV1({
    execution_package: prepared.execution_package,
    qualification: tampered,
    expected_image_id: IMAGE_ID,
  }), /T136_P5_QUALIFICATION_RECORD_SHAPE_INVALID/);
});
