import { $OpenApiUtil, OpenApiUtil } from '@alicloud/openapi-core';

import {
  normalizeScientificEvidenceP5WorkspaceObservationV1,
  type ScientificEvidenceP5WorkspaceObservationV1,
} from './scientific-evidence-p5-credential-qualification-service.js';

export interface ScientificEvidenceP5WorkspaceCallApiV1 {
  (
    params: $OpenApiUtil.Params,
    request: $OpenApiUtil.OpenApiRequest,
    runtime: ScientificEvidenceP5NoRetryRuntimeV1,
  ): Promise<unknown>;
}

export interface ScientificEvidenceP5NoRetryRuntimeV1 {
  autoretry: false;
  maxAttempts: 1;
}

export function buildScientificEvidenceP5GetWorkspaceCallV1(workspaceId: string): {
  params: $OpenApiUtil.Params;
  request: $OpenApiUtil.OpenApiRequest;
  runtime: ScientificEvidenceP5NoRetryRuntimeV1;
} {
  assertWorkspaceId(workspaceId);
  return {
    params: new $OpenApiUtil.Params({
      action: 'GetWorkspace',
      version: '2021-02-04',
      protocol: 'HTTPS',
      pathname: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}`,
      method: 'GET',
      authType: 'AK',
      style: 'ROA',
      reqBodyType: 'json',
      bodyType: 'json',
    }),
    request: new $OpenApiUtil.OpenApiRequest({
      headers: {},
      query: OpenApiUtil.query({ Verbose: false }),
    }),
    runtime: { autoretry: false, maxAttempts: 1 },
  };
}

export async function readScientificEvidenceP5WorkspaceObservationV1(input: {
  call_api: ScientificEvidenceP5WorkspaceCallApiV1;
  workspace_id: string;
}): Promise<ScientificEvidenceP5WorkspaceObservationV1> {
  const call = buildScientificEvidenceP5GetWorkspaceCallV1(input.workspace_id);
  const raw: unknown = await input.call_api(call.params, call.request, call.runtime);
  const response = asRecord(raw, 'T136_P5_QUALIFICATION_WORKSPACE_RESPONSE_INVALID');
  if (response.statusCode !== 200) {
    throw new Error('T136_P5_QUALIFICATION_WORKSPACE_RESPONSE_STATUS_INVALID');
  }
  return normalizeScientificEvidenceP5WorkspaceObservationV1({
    response_body: response.body,
    expected_workspace_id: input.workspace_id,
  });
}

function assertWorkspaceId(value: string): void {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error('T136_P5_QUALIFICATION_EXPECTED_WORKSPACE_ID_INVALID');
  }
}

function asRecord(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}
