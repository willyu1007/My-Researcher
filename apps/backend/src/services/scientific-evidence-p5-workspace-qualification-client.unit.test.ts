import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScientificEvidenceP5GetWorkspaceCallV1,
  readScientificEvidenceP5WorkspaceObservationV1,
  type ScientificEvidenceP5WorkspaceCallApiV1,
} from './scientific-evidence-p5-workspace-qualification-client.js';
import {
  normalizeScientificEvidenceP5WorkspaceObservationV1,
} from './scientific-evidence-p5-credential-qualification-service.js';

test('locks the raw GetWorkspace request to the generated SDK contract', () => {
  const call = buildScientificEvidenceP5GetWorkspaceCallV1('1450165');
  assert.deepEqual(call.params.toMap(), {
    action: 'GetWorkspace',
    version: '2021-02-04',
    protocol: 'HTTPS',
    pathname: '/api/v1/workspaces/1450165',
    method: 'GET',
    authType: 'AK',
    bodyType: 'json',
    reqBodyType: 'json',
    style: 'ROA',
  });
  assert.deepEqual(call.request.toMap(), { headers: {}, query: { Verbose: 'false' } });
  assert.deepEqual(call.runtime, { autoretry: false, maxAttempts: 1 });
});

test('calls raw GetWorkspace once and normalizes provider identity only', async () => {
  let callCount = 0;
  const callApi: ScientificEvidenceP5WorkspaceCallApiV1 = async () => {
    callCount += 1;
    return {
      statusCode: 200,
      body: {
        WorkspaceId: 1450165,
        Status: 'READY',
        RequestId: 'workspace-request-id',
      },
    };
  };
  assert.deepEqual(await readScientificEvidenceP5WorkspaceObservationV1({
    call_api: callApi,
    workspace_id: '1450165',
  }), {
    workspace_id: '1450165',
    status: 'READY',
    request_id: 'workspace-request-id',
  });
  assert.equal(callCount, 1);
});

test('rejects invalid configured workspace identifiers before transport', async () => {
  let callCount = 0;
  const callApi: ScientificEvidenceP5WorkspaceCallApiV1 = async () => {
    callCount += 1;
    return {};
  };
  await assert.rejects(
    () => readScientificEvidenceP5WorkspaceObservationV1({
      call_api: callApi,
      workspace_id: 'workspace/1450165',
    }),
    /T136_P5_QUALIFICATION_EXPECTED_WORKSPACE_ID_INVALID/,
  );
  assert.equal(callCount, 0);
});

test('normalizes either provider casing without using request-path fallback', () => {
  for (const responseBody of [
    { WorkspaceId: 1450165, Status: 'ENABLED', RequestId: 'workspace-request' },
    { workspaceId: '1450165', status: 'ENABLED', requestId: 'workspace-request' },
  ]) {
    assert.deepEqual(normalizeScientificEvidenceP5WorkspaceObservationV1({
      response_body: responseBody,
      expected_workspace_id: '1450165',
    }), {
      workspace_id: '1450165',
      status: 'ENABLED',
      request_id: 'workspace-request',
    });
  }
});

test('rejects missing, conflicting, malformed, and mismatched provider identity', () => {
  const required = { Status: 'ENABLED', RequestId: 'workspace-request' };
  const cases: Array<[string, unknown, RegExp]> = [
    ['missing', required, /T136_P5_QUALIFICATION_WORKSPACE_ID_MISSING/],
    ['conflicting', { ...required, WorkspaceId: '1450165', workspaceId: '1450166' },
      /T136_P5_QUALIFICATION_WORKSPACE_ID_CONFLICT/],
    ['unsafe number', { ...required, WorkspaceId: Number.MAX_SAFE_INTEGER + 1 },
      /T136_P5_QUALIFICATION_WORKSPACE_ID_INVALID/],
    ['zero', { ...required, WorkspaceId: 0 },
      /T136_P5_QUALIFICATION_WORKSPACE_ID_INVALID/],
    ['mismatch', { ...required, WorkspaceId: '1450166' },
      /T136_P5_QUALIFICATION_WORKSPACE_ID_MISMATCH/],
    ['status conflict', {
      WorkspaceId: '1450165', Status: 'ENABLED', status: 'DISABLED', RequestId: 'request',
    }, /T136_P5_QUALIFICATION_WORKSPACE_STATUS_CONFLICT/],
    ['request whitespace', {
      WorkspaceId: '1450165', Status: 'ENABLED', RequestId: ' request ',
    }, /T136_P5_QUALIFICATION_WORKSPACE_REQUESTID_INVALID/],
  ];
  for (const [name, responseBody, expected] of cases) {
    assert.throws(
      () => normalizeScientificEvidenceP5WorkspaceObservationV1({
        response_body: responseBody,
        expected_workspace_id: '1450165',
      }),
      expected,
      name,
    );
  }
});
