import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  GetWorkspaceRequest,
  ListResourcesRequest,
} from '@alicloud/aiworkspace20210204';
import { $OpenApiUtil } from '@alicloud/openapi-core';
import { ListEcsSpecsRequest } from '@alicloud/pai-dlc20201203';

import {
  EXPERIMENT_FOUNDATION_ALIYUN_FORBIDDEN_WRITE_OPERATION_V2,
  EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2,
  type ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  type ExperimentFoundationAliyunReadOnlyOperationV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';
import { serverHashExperimentV2SemanticContent } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_HASH_PATTERN } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

export const EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_V1 = Object.freeze({
  Version: '1',
  Statement: [
    {
      Effect: 'Allow',
      Action: [
        'paiworkspace:GetWorkspace',
        'paiworkspace:ListResources',
      ],
      Resource: ['*'],
    },
    {
      Effect: 'Deny',
      Action: ['paidlc:CreateJob'],
      Resource: ['*'],
    },
  ],
} as const);

export const EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_HASH_V1 =
  hashPreflightValue(
    'AliyunPaiDlcPreflightRamPolicy',
    'v1',
    EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_V1,
  );

export const EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REVIEWER_REF_V1 =
  'security-review:T-132-cloud-preflight' as const;
export const EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_EVIDENCE_MAX_LIFETIME_MS =
  24 * 60 * 60 * 1_000;

const REQUIRED_ALLOWED_ACTIONS = [
  'paiworkspace:GetWorkspace',
  'paiworkspace:ListResources',
] as const;
// The official PAI-DLC 2020-12-03 ListEcsSpecs page currently exposes no RAM
// authorization action. Keep the operation transport-allowlisted, but do not
// invent an undocumented paidlc action in the reviewed identity policy.
const REQUIRED_DENIED_ACTIONS = ['paidlc:CreateJob'] as const;
const HASH_PATTERN = new RegExp(EXPERIMENT_V2_HASH_PATTERN);
const UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const require = createRequire(import.meta.url);
const AIWorkspaceClientConstructor = require('@alicloud/aiworkspace20210204').default as
  typeof import('@alicloud/aiworkspace20210204').default;
const PaiDlcClientConstructor = require('@alicloud/pai-dlc20201203').default as
  typeof import('@alicloud/pai-dlc20201203').default;
const PROVIDER_LIST_PAGE_SIZE = 100;
const PROVIDER_LIST_MAX_PAGES = 100;

export interface ExperimentFoundationAliyunWorkspaceSdkClientV1 {
  getWorkspace: InstanceType<typeof AIWorkspaceClientConstructor>['getWorkspace'];
  listResources: InstanceType<typeof AIWorkspaceClientConstructor>['listResources'];
}

export interface ExperimentFoundationAliyunDlcSdkClientV1 {
  listEcsSpecs: InstanceType<typeof PaiDlcClientConstructor>['listEcsSpecs'];
}

export interface ExperimentFoundationAliyunReadOnlySdkClientsV1 {
  workspaceClient: ExperimentFoundationAliyunWorkspaceSdkClientV1;
  dlcClient: ExperimentFoundationAliyunDlcSdkClientV1;
}

export interface ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1 {
  schema_version: 'AliyunPaiDlcPreflightIdentityPolicyEvidence@v1';
  principal_ref_hash: string;
  credential_access_key_id_hash: string;
  policy_document_hash: string;
  verified_allowed_actions: typeof REQUIRED_ALLOWED_ACTIONS;
  verified_denied_actions: typeof REQUIRED_DENIED_ACTIONS;
  reviewer_ref: typeof EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REVIEWER_REF_V1;
  reviewed_at: string;
  expires_at: string;
}

export interface ExperimentFoundationAliyunPreflightCredentialV1 {
  access_key_id: string;
  access_key_secret: string;
  security_token: string;
}

export interface ExperimentFoundationAliyunReviewedPolicyEvidenceFileV1 {
  raw_json: string;
  real_path: string;
  sha256: string;
}

export interface ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1 {
  sequence: number;
  operation: ExperimentFoundationAliyunReadOnlyOperationV2;
  endpoint: string;
  request_id: string;
  outcome: 'succeeded' | 'failed';
  reason_code?: 'ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED';
  redacted_refs: Record<string, string>;
}

export interface ExperimentFoundationAliyunWorkspaceObservationV1 {
  request_id: string;
  endpoint: string;
  workspace_id_hash: string;
  status: string;
}

export interface ExperimentFoundationAliyunResourceObservationV1 {
  request_id: string;
  endpoint: string;
  resource_id_hash: string;
  resource_found: boolean;
  quota_type: string | null;
  quota_spec_count: number;
  quota_spec_manifest_hash: string | null;
}

export interface ExperimentFoundationAliyunDlcSpecObservationV1 {
  request_id: string;
  endpoint: string;
  total_count: number;
  visible_cpu_spec_count: number;
  available_cpu_spec_count: number;
}

export interface ExperimentFoundationAliyunReadOnlyCloudPreflightOutcomeV1 {
  status: 'cloud_preflight_passed';
  region_id: string;
  workspace: ExperimentFoundationAliyunWorkspaceObservationV1;
  resource: ExperimentFoundationAliyunResourceObservationV1;
  dlc_specs: ExperimentFoundationAliyunDlcSpecObservationV1;
  identity_policy: {
    principal_ref_hash: string;
    credential_access_key_id_hash: string;
    policy_document_hash: string;
    verified_allowed_actions: readonly string[];
    verified_denied_actions: readonly string[];
    reviewed_at: string;
    expires_at: string;
  };
  operation_ledger: ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1[];
  provider_write_attempts: 0;
  provider_writes: 0;
}

export interface ExperimentFoundationAliyunReadOnlyTransportV1 {
  getWorkspace(
    workspaceId: string,
  ): Promise<ExperimentFoundationAliyunWorkspaceObservationV1>;
  listResources(
    workspaceId: string,
    resourceId: string,
  ): Promise<ExperimentFoundationAliyunResourceObservationV1>;
  listEcsSpecs(): Promise<ExperimentFoundationAliyunDlcSpecObservationV1>;
  getOperationLedger(): ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1[];
}

export class ExperimentFoundationAliyunCloudPreflightError extends Error {
  constructor(
    public readonly disposition: 'blocked' | 'failed',
    public readonly reasonCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationAliyunCloudPreflightError';
  }
}

export class ExperimentFoundationV2AliyunReadOnlyPreflightService {
  async run(input: {
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1;
    credentialAccessKeyId: string;
    identityPolicyEvidence: ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1;
    transport: ExperimentFoundationAliyunReadOnlyTransportV1;
    now?: Date;
  }): Promise<ExperimentFoundationAliyunReadOnlyCloudPreflightOutcomeV1> {
    assertIdentityPolicyEvidence(
      input.identityPolicyEvidence,
      input.credentialAccessKeyId,
      input.now ?? new Date(),
    );

    const ledgerBeforeWriteProbe = input.transport.getOperationLedger().length;
    await this.invoke(
      EXPERIMENT_FOUNDATION_ALIYUN_FORBIDDEN_WRITE_OPERATION_V2,
      input.transport,
      input.profile,
    ).then(
      () => {
        throw new ExperimentFoundationAliyunCloudPreflightError(
          'failed',
          'ALIYUN_WRITE_HARD_DENY_BYPASSED',
          'The forbidden CreateJob operation reached the provider transport.',
        );
      },
      (error: unknown) => {
        if (
          !(error instanceof ExperimentFoundationAliyunCloudPreflightError)
          || error.reasonCode !== 'ALIYUN_WRITE_OPERATION_DENIED'
        ) {
          throw error;
        }
      },
    );
    if (input.transport.getOperationLedger().length !== ledgerBeforeWriteProbe) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'failed',
        'ALIYUN_WRITE_HARD_DENY_BYPASSED',
        'The write-deny probe changed the provider transport ledger.',
      );
    }

    const workspace = await this.invoke(
      'AIWorkspace.GetWorkspace',
      input.transport,
      input.profile,
    );
    const resource = await this.invoke(
      'AIWorkspace.ListResources',
      input.transport,
      input.profile,
    );
    const dlcSpecs = await this.invoke(
      'PaiDlc.ListEcsSpecs',
      input.transport,
      input.profile,
    );

    const expectedWorkspaceEndpoint = `aiworkspace.${input.profile.region_id}.aliyuncs.com`;
    const expectedDlcEndpoint = `pai-dlc.${input.profile.region_id}.aliyuncs.com`;
    if (
      workspace.endpoint !== expectedWorkspaceEndpoint
      || resource.endpoint !== expectedWorkspaceEndpoint
      || dlcSpecs.endpoint !== expectedDlcEndpoint
      || workspace.workspace_id_hash
        !== hashAliyunPreflightProviderRef('workspace_id', input.profile.workspace_id)
      || resource.resource_id_hash
        !== hashAliyunPreflightProviderRef('resource_id', input.profile.resource_id)
    ) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'failed',
        'ALIYUN_ENDPOINT_OR_REF_MISMATCH',
        'Read-only provider observations do not bind the exact configured region and refs.',
      );
    }

    if (workspace.status !== 'ENABLED') {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_WORKSPACE_NOT_ENABLED',
        'The exact Aliyun PAI workspace is not ENABLED.',
      );
    }
    if (
      !resource.resource_found
      || resource.quota_type !== 'DLC'
      || resource.quota_spec_count < 1
      || resource.quota_spec_manifest_hash === null
      || !HASH_PATTERN.test(resource.quota_spec_manifest_hash)
    ) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_DLC_RESOURCE_NOT_VISIBLE',
        'The exact DLC resource quota is not visible in the configured workspace.',
      );
    }
    if (dlcSpecs.visible_cpu_spec_count < 1 || dlcSpecs.available_cpu_spec_count < 1) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_DLC_CPU_SPEC_NOT_AVAILABLE',
        'No available CPU specification is visible through the DLC read-only endpoint.',
      );
    }

    const ledger = input.transport.getOperationLedger();
    assertExactReadOnlyLedger(ledger);
    return {
      status: 'cloud_preflight_passed',
      region_id: input.profile.region_id,
      workspace,
      resource,
      dlc_specs: dlcSpecs,
      identity_policy: {
        principal_ref_hash: input.identityPolicyEvidence.principal_ref_hash,
        credential_access_key_id_hash:
          input.identityPolicyEvidence.credential_access_key_id_hash,
        policy_document_hash: input.identityPolicyEvidence.policy_document_hash,
        verified_allowed_actions: [...input.identityPolicyEvidence.verified_allowed_actions],
        verified_denied_actions: [...input.identityPolicyEvidence.verified_denied_actions],
        reviewed_at: input.identityPolicyEvidence.reviewed_at,
        expires_at: input.identityPolicyEvidence.expires_at,
      },
      operation_ledger: ledger,
      provider_write_attempts: 0,
      provider_writes: 0,
    };
  }

  private invoke(
    operation: 'AIWorkspace.GetWorkspace',
    transport: ExperimentFoundationAliyunReadOnlyTransportV1,
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  ): Promise<ExperimentFoundationAliyunWorkspaceObservationV1>;
  private invoke(
    operation: 'AIWorkspace.ListResources',
    transport: ExperimentFoundationAliyunReadOnlyTransportV1,
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  ): Promise<ExperimentFoundationAliyunResourceObservationV1>;
  private invoke(
    operation: 'PaiDlc.ListEcsSpecs',
    transport: ExperimentFoundationAliyunReadOnlyTransportV1,
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  ): Promise<ExperimentFoundationAliyunDlcSpecObservationV1>;
  private invoke(
    operation: string,
    transport: ExperimentFoundationAliyunReadOnlyTransportV1,
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  ): Promise<
    | ExperimentFoundationAliyunWorkspaceObservationV1
    | ExperimentFoundationAliyunResourceObservationV1
    | ExperimentFoundationAliyunDlcSpecObservationV1
  >;
  private async invoke(
    operation: string,
    transport: ExperimentFoundationAliyunReadOnlyTransportV1,
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  ): Promise<
    | ExperimentFoundationAliyunWorkspaceObservationV1
    | ExperimentFoundationAliyunResourceObservationV1
    | ExperimentFoundationAliyunDlcSpecObservationV1
  > {
    assertAliyunPreflightProviderOperationAllowed(operation);
    switch (operation as ExperimentFoundationAliyunReadOnlyOperationV2) {
      case 'AIWorkspace.GetWorkspace':
        return transport.getWorkspace(profile.workspace_id);
      case 'AIWorkspace.ListResources':
        return transport.listResources(profile.workspace_id, profile.resource_id);
      case 'PaiDlc.ListEcsSpecs':
        return transport.listEcsSpecs();
    }
  }
}

export class AliyunSdkExperimentFoundationReadOnlyTransportV1
implements ExperimentFoundationAliyunReadOnlyTransportV1 {
  private readonly workspaceClient: ExperimentFoundationAliyunWorkspaceSdkClientV1;
  private readonly dlcClient: ExperimentFoundationAliyunDlcSdkClientV1;
  private readonly ledger: ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1[] = [];
  private readonly workspaceEndpoint: string;
  private readonly dlcEndpoint: string;

  constructor(
    regionId: string,
    credential: ExperimentFoundationAliyunPreflightCredentialV1,
    clients?: ExperimentFoundationAliyunReadOnlySdkClientsV1,
  ) {
    if (
      credential.access_key_id.length === 0
      || credential.access_key_secret.length === 0
      || credential.security_token.length === 0
    ) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_TEMPORARY_CREDENTIAL_REQUIRED',
        'The cloud preflight requires an exact temporary STS credential triplet.',
      );
    }
    this.workspaceEndpoint = `aiworkspace.${regionId}.aliyuncs.com`;
    this.dlcEndpoint = `pai-dlc.${regionId}.aliyuncs.com`;
    this.workspaceClient = clients?.workspaceClient ?? new AIWorkspaceClientConstructor(new $OpenApiUtil.Config({
      accessKeyId: credential.access_key_id,
      accessKeySecret: credential.access_key_secret,
      securityToken: credential.security_token,
      endpoint: this.workspaceEndpoint,
      regionId,
      protocol: 'https',
      connectTimeout: 10_000,
      readTimeout: 15_000,
    }));
    this.dlcClient = clients?.dlcClient ?? new PaiDlcClientConstructor(new $OpenApiUtil.Config({
      accessKeyId: credential.access_key_id,
      accessKeySecret: credential.access_key_secret,
      securityToken: credential.security_token,
      endpoint: this.dlcEndpoint,
      regionId,
      protocol: 'https',
      connectTimeout: 10_000,
      readTimeout: 15_000,
    }));
  }

  async getWorkspace(
    workspaceId: string,
  ): Promise<ExperimentFoundationAliyunWorkspaceObservationV1> {
    const redactedRefs = {
      workspace_id_hash: hashAliyunPreflightProviderRef('workspace_id', workspaceId),
    };
    try {
      const response = await this.workspaceClient.getWorkspace(
        workspaceId,
        new GetWorkspaceRequest({ verbose: false }),
      );
      const requestId = requiredProviderText(response.body?.requestId, 'GetWorkspace.RequestId');
      if (response.body?.workspaceId !== workspaceId) {
        throw new ExperimentFoundationAliyunCloudPreflightError(
          'failed',
          'ALIYUN_WORKSPACE_RESPONSE_MISMATCH',
          'GetWorkspace returned a different workspace identity.',
        );
      }
      const observation: ExperimentFoundationAliyunWorkspaceObservationV1 = {
        request_id: requestId,
        endpoint: this.workspaceEndpoint,
        workspace_id_hash: redactedRefs.workspace_id_hash,
        status: requiredProviderText(response.body.status, 'GetWorkspace.Status'),
      };
      this.recordSucceeded(
        'AIWorkspace.GetWorkspace',
        this.workspaceEndpoint,
        requestId,
        redactedRefs,
      );
      return observation;
    } catch (error) {
      this.recordFailed('AIWorkspace.GetWorkspace', this.workspaceEndpoint, redactedRefs);
      throw error;
    }
  }

  async listResources(
    workspaceId: string,
    resourceId: string,
  ): Promise<ExperimentFoundationAliyunResourceObservationV1> {
    const redactedRefs = {
      workspace_id_hash: hashAliyunPreflightProviderRef('workspace_id', workspaceId),
      resource_id_hash: hashAliyunPreflightProviderRef('resource_id', resourceId),
    };
    let lastRequestId = 'unavailable';
    for (let pageNumber = 1; pageNumber <= PROVIDER_LIST_MAX_PAGES; pageNumber += 1) {
      let response: Awaited<ReturnType<ExperimentFoundationAliyunWorkspaceSdkClientV1['listResources']>>;
      try {
        response = await this.workspaceClient.listResources(new ListResourcesRequest({
          option: 'ListResourceByWorkspace',
          workspaceId,
          pageNumber,
          pageSize: PROVIDER_LIST_PAGE_SIZE,
          verbose: true,
          verboseFields: 'Quota,IsDefault',
        }));
        lastRequestId = requiredProviderText(
          response.body?.requestId,
          'ListResources.RequestId',
        );
      } catch (error) {
        this.recordFailed('AIWorkspace.ListResources', this.workspaceEndpoint, redactedRefs);
        throw error;
      }
      this.recordSucceeded(
        'AIWorkspace.ListResources',
        this.workspaceEndpoint,
        lastRequestId,
        redactedRefs,
      );
      const resources = response.body?.resources ?? [];
      const match = resources.flatMap((resource) => resource.quotas ?? [])
        .find((quota) => quota.id === resourceId);
      if (match) {
        const quotaSpecs = (match.specs ?? []).map((spec) => ({
          name: spec.name ?? 'unknown',
          value: spec.value ?? 'unknown',
        })).sort((left, right) => (
          compareCanonicalText(left.name, right.name)
          || compareCanonicalText(left.value, right.value)
        ));
        const quotaSpecsComplete = quotaSpecs.length > 0
          && quotaSpecs.every((spec) => spec.name !== 'unknown' && spec.value !== 'unknown');
        return {
          request_id: lastRequestId,
          endpoint: this.workspaceEndpoint,
          resource_id_hash: redactedRefs.resource_id_hash,
          resource_found: true,
          quota_type: match.quotaType ?? null,
          quota_spec_count: quotaSpecs.length,
          quota_spec_manifest_hash: quotaSpecsComplete
            ? hashPreflightValue('AliyunPaiDlcQuotaSpecManifest', 'v1', quotaSpecs)
            : null,
        };
      }

      const totalCount = response.body?.totalCount;
      const hasNextPage = typeof totalCount === 'number'
        ? pageNumber * PROVIDER_LIST_PAGE_SIZE < totalCount
        : resources.length === PROVIDER_LIST_PAGE_SIZE;
      if (!hasNextPage) {
        return {
          request_id: lastRequestId,
          endpoint: this.workspaceEndpoint,
          resource_id_hash: redactedRefs.resource_id_hash,
          resource_found: false,
          quota_type: null,
          quota_spec_count: 0,
          quota_spec_manifest_hash: null,
        };
      }
    }
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_PROVIDER_PAGINATION_LIMIT_EXCEEDED',
      'ListResources exceeded the bounded read-only pagination limit.',
    );
  }

  async listEcsSpecs(): Promise<ExperimentFoundationAliyunDlcSpecObservationV1> {
    let lastRequestId = 'unavailable';
    let visibleCpuSpecCount = 0;
    let availableCpuSpecCount = 0;
    let reportedTotalCount = 0;
    for (let pageNumber = 1; pageNumber <= PROVIDER_LIST_MAX_PAGES; pageNumber += 1) {
      let response: Awaited<ReturnType<ExperimentFoundationAliyunDlcSdkClientV1['listEcsSpecs']>>;
      try {
        response = await this.dlcClient.listEcsSpecs(new ListEcsSpecsRequest({
          acceleratorType: 'CPU',
          pageNumber,
          pageSize: PROVIDER_LIST_PAGE_SIZE,
          resourceType: 'ECS',
          sortBy: 'CPU',
          order: 'asc',
        }));
        lastRequestId = requiredProviderText(response.body?.requestId, 'ListEcsSpecs.RequestId');
      } catch (error) {
        this.recordFailed('PaiDlc.ListEcsSpecs', this.dlcEndpoint, {});
        throw error;
      }
      this.recordSucceeded('PaiDlc.ListEcsSpecs', this.dlcEndpoint, lastRequestId, {});
      const specs = response.body?.ecsSpecs ?? [];
      visibleCpuSpecCount += specs.filter((spec) => spec.acceleratorType === 'CPU').length;
      availableCpuSpecCount += specs.filter((spec) => (
        spec.acceleratorType === 'CPU' && spec.isAvailable === true
      )).length;
      reportedTotalCount = response.body?.totalCount ?? visibleCpuSpecCount;
      const hasNextPage = typeof response.body?.totalCount === 'number'
        ? pageNumber * PROVIDER_LIST_PAGE_SIZE < response.body.totalCount
        : specs.length === PROVIDER_LIST_PAGE_SIZE;
      if (!hasNextPage) {
        return {
          request_id: lastRequestId,
          endpoint: this.dlcEndpoint,
          total_count: reportedTotalCount,
          visible_cpu_spec_count: visibleCpuSpecCount,
          available_cpu_spec_count: availableCpuSpecCount,
        };
      }
    }
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_PROVIDER_PAGINATION_LIMIT_EXCEEDED',
      'ListEcsSpecs exceeded the bounded read-only pagination limit.',
    );
  }

  getOperationLedger(): ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1[] {
    return structuredClone(this.ledger);
  }

  private recordSucceeded(
    operation: ExperimentFoundationAliyunReadOnlyOperationV2,
    endpoint: string,
    requestId: string,
    redactedRefs: Record<string, string>,
  ): void {
    this.ledger.push({
      sequence: this.ledger.length + 1,
      operation,
      endpoint,
      request_id: requestId,
      outcome: 'succeeded',
      redacted_refs: redactedRefs,
    });
  }

  private recordFailed(
    operation: ExperimentFoundationAliyunReadOnlyOperationV2,
    endpoint: string,
    redactedRefs: Record<string, string>,
  ): void {
    this.ledger.push({
      sequence: this.ledger.length + 1,
      operation,
      endpoint,
      request_id: 'unavailable',
      outcome: 'failed',
      reason_code: 'ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED',
      redacted_refs: redactedRefs,
    });
  }
}

export function parseAliyunPreflightIdentityPolicyEvidence(
  value: unknown,
): ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1 {
  if (!isPlainObject(value)) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID',
      'Identity policy evidence must be a JSON object.',
    );
  }
  const exactKeys = [
    'schema_version',
    'principal_ref_hash',
    'credential_access_key_id_hash',
    'policy_document_hash',
    'verified_allowed_actions',
    'verified_denied_actions',
    'reviewer_ref',
    'reviewed_at',
    'expires_at',
  ].sort();
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(exactKeys)) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID',
      'Identity policy evidence keys differ from the exact v1 contract.',
    );
  }
  const evidence = value as unknown as ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1;
  if (
    evidence.schema_version !== 'AliyunPaiDlcPreflightIdentityPolicyEvidence@v1'
    || typeof evidence.principal_ref_hash !== 'string'
    || !HASH_PATTERN.test(evidence.principal_ref_hash)
    || typeof evidence.credential_access_key_id_hash !== 'string'
    || !HASH_PATTERN.test(evidence.credential_access_key_id_hash)
    || typeof evidence.policy_document_hash !== 'string'
    || !HASH_PATTERN.test(evidence.policy_document_hash)
    || evidence.reviewer_ref !== EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REVIEWER_REF_V1
    || typeof evidence.reviewed_at !== 'string'
    || typeof evidence.expires_at !== 'string'
    || !Array.isArray(evidence.verified_allowed_actions)
    || !Array.isArray(evidence.verified_denied_actions)
    || JSON.stringify(evidence.verified_allowed_actions) !== JSON.stringify(REQUIRED_ALLOWED_ACTIONS)
    || JSON.stringify(evidence.verified_denied_actions) !== JSON.stringify(REQUIRED_DENIED_ACTIONS)
    || !UTC_INSTANT_PATTERN.test(evidence.reviewed_at)
    || !UTC_INSTANT_PATTERN.test(evidence.expires_at)
    || !isCanonicalUtcInstant(evidence.reviewed_at)
    || !isCanonicalUtcInstant(evidence.expires_at)
    || Date.parse(evidence.reviewed_at) >= Date.parse(evidence.expires_at)
    || Date.parse(evidence.expires_at) - Date.parse(evidence.reviewed_at)
      > EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_EVIDENCE_MAX_LIFETIME_MS
  ) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID',
      'Identity policy evidence failed exact value validation.',
    );
  }
  return structuredClone(evidence);
}

export async function readAliyunPreflightReviewedPolicyEvidenceFile(input: {
  filePath: string;
  repositoryRoot: string;
  expectedSha256: string;
}): Promise<ExperimentFoundationAliyunReviewedPolicyEvidenceFileV1> {
  if (!/^sha256:[0-9a-f]{64}$/.test(input.expectedSha256)) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_DIGEST_INVALID',
      'Identity-policy evidence SHA-256 must use the exact sha256:<lowercase-hex> form.',
    );
  }

  let suppliedStat;
  let repositoryRealPath: string;
  let evidenceRealPath: string;
  try {
    [suppliedStat, repositoryRealPath, evidenceRealPath] = await Promise.all([
      fs.lstat(input.filePath),
      fs.realpath(input.repositoryRoot),
      fs.realpath(input.filePath),
    ]);
  } catch {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_UNREADABLE',
      'Identity-policy evidence could not be resolved as a reviewed regular file.',
    );
  }
  if (suppliedStat.isSymbolicLink()) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_SYMLINK_FORBIDDEN',
      'Identity-policy evidence must not be supplied through a symbolic link.',
    );
  }
  if (
    evidenceRealPath === repositoryRealPath
    || evidenceRealPath.startsWith(`${repositoryRealPath}${path.sep}`)
  ) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_MUST_BE_REPO_EXTERNAL',
      'Identity-policy evidence must resolve outside the repository.',
    );
  }

  let handle: Awaited<ReturnType<typeof fs.open>> | null = null;
  try {
    handle = await fs.open(
      evidenceRealPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const openedStat = await handle.stat();
    if (
      !openedStat.isFile()
      || openedStat.dev !== suppliedStat.dev
      || openedStat.ino !== suppliedStat.ino
      || (openedStat.mode & 0o022) !== 0
    ) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_IDENTITY_POLICY_EVIDENCE_FILE_UNTRUSTED',
        'Identity-policy evidence must be the same non-writable regular file that was reviewed.',
      );
    }
    const rawJson = await handle.readFile({ encoding: 'utf8' });
    const actualSha256 = `sha256:${createHash('sha256').update(rawJson).digest('hex')}`;
    if (actualSha256 !== input.expectedSha256) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_IDENTITY_POLICY_EVIDENCE_DIGEST_MISMATCH',
        'Identity-policy evidence differs from the independently supplied reviewed digest.',
      );
    }
    return {
      raw_json: rawJson,
      real_path: evidenceRealPath,
      sha256: actualSha256,
    };
  } catch (error) {
    if (error instanceof ExperimentFoundationAliyunCloudPreflightError) throw error;
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_UNREADABLE',
      'Identity-policy evidence could not be opened as a reviewed regular file.',
    );
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export function hashAliyunPreflightCredentialAccessKeyId(accessKeyId: string): string {
  if (accessKeyId.length === 0) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_TEMPORARY_CREDENTIAL_REQUIRED',
      'A temporary credential AccessKey ID is required.',
    );
  }
  return hashPreflightValue('AliyunPaiDlcPreflightCredentialAccessKeyId', 'v1', {
    access_key_id: accessKeyId,
  });
}

export function assertAliyunPreflightProviderOperationAllowed(
  operation: string,
): asserts operation is ExperimentFoundationAliyunReadOnlyOperationV2 {
  if (!(EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2 as readonly string[])
    .includes(operation)) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_WRITE_OPERATION_DENIED',
      'The requested provider operation is outside the read-only preflight allowlist.',
    );
  }
}

function assertIdentityPolicyEvidence(
  evidence: ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1,
  accessKeyId: string,
  now: Date,
): void {
  const parsed = parseAliyunPreflightIdentityPolicyEvidence(evidence);
  if (parsed.policy_document_hash !== EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_HASH_V1) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_MISMATCH',
      'Identity policy evidence does not bind the reviewed read-only/explicit-deny policy.',
    );
  }
  if (parsed.credential_access_key_id_hash !== hashAliyunPreflightCredentialAccessKeyId(accessKeyId)) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_CREDENTIAL_MISMATCH',
      'Identity policy evidence does not bind the active temporary credential.',
    );
  }
  if (Date.parse(parsed.reviewed_at) > now.getTime() || Date.parse(parsed.expires_at) <= now.getTime()) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_EXPIRED',
      'Identity policy evidence is not currently valid.',
    );
  }
}

function isCanonicalUtcInstant(value: string): boolean {
  if (!UTC_INSTANT_PATTERN.test(value)) return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function assertExactReadOnlyLedger(
  ledger: ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1[],
): void {
  const operations = ledger.map((entry) => entry.operation);
  const firstDlcIndex = operations.indexOf('PaiDlc.ListEcsSpecs');
  if (
    operations[0] !== 'AIWorkspace.GetWorkspace'
    || firstDlcIndex < 2
    || operations.slice(1, firstDlcIndex)
      .some((operation) => operation !== 'AIWorkspace.ListResources')
    || operations.slice(firstDlcIndex)
      .some((operation) => operation !== 'PaiDlc.ListEcsSpecs')
    || ledger.some((entry, index) => (
      entry.sequence !== index + 1
      || entry.outcome !== 'succeeded'
      || !(EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2 as readonly string[])
        .includes(entry.operation)
      || entry.endpoint.length === 0
      || entry.request_id.length === 0
    ))
  ) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'failed',
      'ALIYUN_READ_ONLY_LEDGER_INVALID',
      'Cloud preflight transport ledger differs from the exact read-only allowlist.',
    );
  }
}

function requiredProviderText(value: string | undefined, label: string): string {
  if (!value) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'failed',
      'ALIYUN_PROVIDER_RESPONSE_INVALID',
      `${label} is missing from the read-only provider response.`,
    );
  }
  return value;
}

function compareCanonicalText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function hashAliyunPreflightProviderRef(kind: string, value: string): string {
  return hashPreflightValue('AliyunPaiDlcPreflightProviderRef', 'v1', {
    ref_kind: kind,
    ref_value: value,
  });
}

function hashPreflightValue(
  recordKind: string,
  schemaVersion: string,
  content: unknown,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: schemaVersion,
    hash_profile: 'ef-provider-control-json@v1',
    content,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
