// DEBUG-MODE: BEGIN dbg-20260729-142414-8438

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  observeExperimentFoundationM7L1CreateJobError,
} from './experiment-foundation-m7-l1-create-job-error-observation.js';

test('observes exact safe top-level CreateJob diagnostics', () => {
  assert.deepEqual(
    observeExperimentFoundationM7L1CreateJobError({
      statusCode: 400,
      code: 'BadRequest',
      requestId: '019FAB35-11B0-518B-ADE8-B6833097FD32',
    }),
    {
      status_code: 400,
      status_source: 'top_level',
      provider_code: 'BadRequest',
      provider_code_source: 'top_level',
      request_id: '019FAB35-11B0-518B-ADE8-B6833097FD32',
      request_id_source: 'top_level',
    },
  );
});

test('observes bounded nested and response-header diagnostics', () => {
  assert.deepEqual(
    observeExperimentFoundationM7L1CreateJobError({
      data: { ErrorCode: 'NoPermission' },
      response: {
        status: '403',
        headers: {
          'content-type': 'application/json',
          'x-acs-request-id': '019FAC00-AAAA-BBBB-CCCC-0123456789AB',
        },
      },
    }),
    {
      status_code: 403,
      status_source: 'response',
      provider_code: 'NoPermission',
      provider_code_source: 'data',
      request_id: '019FAC00-AAAA-BBBB-CCCC-0123456789AB',
      request_id_source: 'headers',
    },
  );
});

test('prefers direct safe diagnostics over nested alternatives', () => {
  assert.deepEqual(
    observeExperimentFoundationM7L1CreateJobError({
      StatusCode: 400,
      ErrorCode: 'TopCode',
      RequestId: 'top-request-id',
      data: {
        StatusCode: 401,
        ErrorCode: 'NestedCode',
        RequestId: 'nested-request-id',
      },
    }),
    {
      status_code: 400,
      status_source: 'top_level',
      provider_code: 'TopCode',
      provider_code_source: 'top_level',
      request_id: 'top-request-id',
      request_id_source: 'top_level',
    },
  );
});

test('returns nulls when the SDK error has no safe diagnostic metadata', () => {
  assert.deepEqual(
    observeExperimentFoundationM7L1CreateJobError(new Error('opaque provider failure')),
    {
      status_code: null,
      status_source: null,
      provider_code: null,
      provider_code_source: null,
      request_id: null,
      request_id_source: null,
    },
  );
});

test('does not read getters or emit hostile request and credential values', () => {
  let getterReadCount = 0;
  const hostile = {
    statusCode: 999,
    code: 'Bad Request AccessKeySecret=must-not-leak',
    requestId: { secret: 'SecurityToken=must-not-leak' },
    message: 'oss://private-bucket/private-key',
    stack: 'RoleArn=acs:ram::secret',
    request: {
      userCommand: 'must-not-leak-command',
      envs: { ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'must-not-leak-secret' },
    },
  };
  Object.defineProperty(hostile, 'data', {
    enumerable: true,
    get() {
      getterReadCount += 1;
      return { RequestId: 'must-not-be-read' };
    },
  });

  const observation = observeExperimentFoundationM7L1CreateJobError(hostile);
  const serialized = JSON.stringify(observation);
  assert.equal(getterReadCount, 0);
  assert.deepEqual(observation, {
    status_code: null,
    status_source: null,
    provider_code: null,
    provider_code_source: null,
    request_id: null,
    request_id_source: null,
  });
  for (const forbidden of [
    'AccessKeySecret',
    'SecurityToken',
    'oss://',
    'RoleArn',
    'userCommand',
    'must-not-leak',
    'private-bucket',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

// DEBUG-MODE: END dbg-20260729-142414-8438
