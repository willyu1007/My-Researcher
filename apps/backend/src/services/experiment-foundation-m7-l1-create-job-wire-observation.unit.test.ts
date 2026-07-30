// DEBUG-MODE: BEGIN dbg-20260729-151747-2ddb

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  observeExperimentFoundationM7L1CreateJobThroughSdkOffline,
  observeExperimentFoundationM7L1CreateJobWire,
} from './experiment-foundation-m7-l1-create-job-wire-observation.js';
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from './experiment-foundation-real-provider-payload-v2-service.js';
import {
  createRealProviderV2TestFixture,
} from './experiment-foundation-real-provider-v2-test-fixture.js';

test('intercepts the official SDK final body before network and observes only structure', async () => {
  const fixture = createRealProviderV2TestFixture();
  const cell = fixture.prerequisite.cells[0]!;
  const materialized = new ExperimentFoundationRealProviderPayloadV2Service().materialize(
    {
      run: fixture.prerequisite.run,
      run_cell: cell.run_cell,
      task_spec: cell.task_spec,
      execution_bundle_revision: fixture.bundle,
      provider_idempotency_key: 'attempt-1:submit:1',
    },
    fixture.profile,
  );

  const observation =
    await observeExperimentFoundationM7L1CreateJobThroughSdkOffline(
      materialized.create_job_request,
    );

  assert.equal(observation.model_wire_byte_equal, true);
  assert.equal(observation.model_wire_semantically_equal, true);
  assert.equal(observation.wire_json_round_trip_equal, true);
  assert.equal(observation.model_body_sha256, observation.wire_body_sha256);
  assert.equal(observation.model_body_byte_count, observation.wire_body_byte_count);
  assert.equal(observation.model_recursive_src_key_count, 0);
  assert.equal(observation.wire_recursive_src_key_count, 0);
  assert.deepEqual(
    observation.wire_json_string_fields,
    [
      {
        path: 'DataSources[].Options',
        candidate_count: 3,
        string_count: 3,
        parsed_kinds: ['object'],
        parse_failure_count: 0,
      },
      {
        path: 'Envs.EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON',
        candidate_count: 1,
        string_count: 1,
        parsed_kinds: ['object'],
        parse_failure_count: 0,
      },
    ],
  );
  assert.deepEqual(observation.model_field_types, observation.wire_field_types);
  assert.deepEqual(
    observation.wire_field_types.find(
      ({ path }) => path === 'DataSources[].Options',
    ),
    {
      path: 'DataSources[].Options',
      count: 3,
      kinds: ['string'],
    },
  );
  assert.deepEqual(
    observation.wire_field_types.find(
      ({ path }) => (
        path === 'CredentialConfig.CredentialConfigItems[].Roles[].AssumeRoleFor'
      ),
    ),
    {
      path: 'CredentialConfig.CredentialConfigItems[].Roles[].AssumeRoleFor',
      count: 1,
      kinds: ['missing'],
    },
  );
});

test('never emits body values, credentials, roles, URIs, commands, or dynamic keys', () => {
  const hostileBody = {
    WorkspaceId: 'workspace-must-not-leak',
    CredentialConfig: {
      CredentialConfigItems: [{
        Key: 'role-key-must-not-leak',
        Type: 'Role',
        Roles: [{
          RoleArn: 'acs:ram::123:role/must-not-leak',
          RoleType: 'service',
        }],
      }],
    },
    DataSources: [{
      Uri: 'oss://private-bucket/must-not-leak',
      MountAccess: 'RO',
      MountPath: '/must-not-leak',
      Options: '{"secret":"must-not-leak"}',
    }],
    Envs: {
      ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'must-not-leak-secret',
      DYNAMIC_KEY_MUST_NOT_LEAK: 'must-not-leak-env',
      EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON:
        '{"private":"must-not-leak-source-binding"}',
    },
    JobSpecs: [{
      Image: 'registry.invalid/must-not-leak-image',
      Type: 'Worker',
      PodCount: 1,
    }],
    UserCommand: 'python must-not-leak-command.py',
    Settings: {
      Tags: {
        DYNAMIC_TAG_MUST_NOT_LEAK: 'must-not-leak-tag',
      },
    },
  };
  const wireBytes = Buffer.from(JSON.stringify(hostileBody), 'utf8');
  const serialized = JSON.stringify(
    observeExperimentFoundationM7L1CreateJobWire(hostileBody, wireBytes),
  );

  for (const forbidden of [
    'workspace-must-not-leak',
    'role-key-must-not-leak',
    'acs:ram::123',
    'oss://private-bucket',
    '/must-not-leak',
    'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    'DYNAMIC_KEY_MUST_NOT_LEAK',
    'DYNAMIC_TAG_MUST_NOT_LEAK',
    'registry.invalid',
    'must-not-leak-command',
    'must-not-leak-secret',
    'must-not-leak-source-binding',
    'must-not-leak-tag',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

// DEBUG-MODE: END dbg-20260729-151747-2ddb
