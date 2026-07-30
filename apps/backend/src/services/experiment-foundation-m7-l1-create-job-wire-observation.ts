// DEBUG-MODE: BEGIN dbg-20260729-151747-2ddb

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';

import { $OpenApiUtil } from '@alicloud/openapi-core';
import { CreateJobRequest } from '@alicloud/pai-dlc20201203';

export const T132_CREATE_JOB_WIRE_DEBUG_RUN_ID = 'dbg-20260729-151747-2ddb';

type ObservedValueKind =
  | 'array'
  | 'boolean'
  | 'missing'
  | 'null'
  | 'number'
  | 'object'
  | 'string';

interface FieldTypeObservation {
  path: string;
  count: number;
  kinds: ObservedValueKind[];
}

interface JsonStringObservation {
  path: string;
  candidate_count: number;
  string_count: number;
  parsed_kinds: ObservedValueKind[];
  parse_failure_count: number;
}

export interface ExperimentFoundationM7L1CreateJobWireObservation {
  model_body_sha256: string;
  model_body_byte_count: number;
  wire_body_sha256: string;
  wire_body_byte_count: number;
  model_wire_byte_equal: boolean;
  model_wire_semantically_equal: boolean;
  wire_json_round_trip_equal: boolean;
  model_recursive_src_key_count: number;
  wire_recursive_src_key_count: number;
  model_field_types: FieldTypeObservation[];
  wire_field_types: FieldTypeObservation[];
  wire_json_string_fields: JsonStringObservation[];
}

interface DarabonbaCoreModule {
  doAction: (request: unknown, runtime?: unknown) => Promise<unknown>;
}

const localRequire = createRequire(import.meta.url);
const openApiDependencyRequire = createRequire(
  localRequire.resolve('@alicloud/openapi-core'),
);
const PaiDlcClientConstructor = localRequire('@alicloud/pai-dlc20201203').default as
  typeof import('@alicloud/pai-dlc20201203').default;
const darabonbaCore = openApiDependencyRequire(
  '@darabonba/typescript/dist/core',
) as DarabonbaCoreModule;
const OFFLINE_INTERCEPT_ERROR = new Error(
  'T132_M7_L1_OFFLINE_CREATE_JOB_NETWORK_BLOCKED',
);

const TOP_LEVEL_FIELDS = [
  'WorkspaceId',
  'ResourceId',
  'CredentialConfig',
  'DataSources',
  'DisplayName',
  'Envs',
  'JobType',
  'JobSpecs',
  'UserCommand',
  'JobMaxRunningTimeMinutes',
  'Accessibility',
  'Settings',
] as const;

export function observeExperimentFoundationM7L1CreateJobWire(
  modelBody: unknown,
  wireBodyBytes: Uint8Array,
): ExperimentFoundationM7L1CreateJobWireObservation {
  const modelBytes = Buffer.from(JSON.stringify(modelBody), 'utf8');
  const wireBytes = Buffer.from(wireBodyBytes);
  const wireBody = JSON.parse(wireBytes.toString('utf8')) as unknown;
  const wireRoundTripBytes = Buffer.from(JSON.stringify(wireBody), 'utf8');

  return {
    model_body_sha256: sha256(modelBytes),
    model_body_byte_count: modelBytes.byteLength,
    wire_body_sha256: sha256(wireBytes),
    wire_body_byte_count: wireBytes.byteLength,
    model_wire_byte_equal: modelBytes.equals(wireBytes),
    model_wire_semantically_equal: isDeepStrictEqual(modelBody, wireBody),
    wire_json_round_trip_equal: wireRoundTripBytes.equals(wireBytes),
    model_recursive_src_key_count: countRecursiveKey(modelBody, 'src'),
    wire_recursive_src_key_count: countRecursiveKey(wireBody, 'src'),
    model_field_types: observeFieldTypes(modelBody),
    wire_field_types: observeFieldTypes(wireBody),
    wire_json_string_fields: observeJsonStringFields(wireBody),
  };
}

export async function observeExperimentFoundationM7L1CreateJobThroughSdkOffline(
  request: CreateJobRequest,
): Promise<ExperimentFoundationM7L1CreateJobWireObservation> {
  const modelBody = request.toMap();
  const client = new PaiDlcClientConstructor(new $OpenApiUtil.Config({
    accessKeyId: 'offline-debug-access-key-id',
    accessKeySecret: 'offline-debug-access-key-secret',
    endpoint: 'offline.invalid',
    regionId: 'cn-shanghai',
    protocol: 'https',
  }));
  const originalDoAction = darabonbaCore.doAction;
  let interceptedBody: Buffer | null = null;
  let interceptedCallCount = 0;

  darabonbaCore.doAction = async (teaRequest: unknown): Promise<never> => {
    interceptedCallCount += 1;
    if (interceptedCallCount !== 1) {
      throw new Error('T132_M7_L1_OFFLINE_CREATE_JOB_INTERCEPT_COUNT_EXCEEDED');
    }
    interceptedBody = exactRequestBodyBytes(teaRequest);
    throw OFFLINE_INTERCEPT_ERROR;
  };

  try {
    await client.createJob(request);
  } catch {
    if (interceptedBody === null) {
      throw new Error('T132_M7_L1_OFFLINE_CREATE_JOB_WAS_NOT_INTERCEPTED');
    }
  } finally {
    darabonbaCore.doAction = originalDoAction;
  }

  if (interceptedBody === null || interceptedCallCount !== 1) {
    throw new Error('T132_M7_L1_OFFLINE_CREATE_JOB_INTERCEPT_INVALID');
  }
  return observeExperimentFoundationM7L1CreateJobWire(modelBody, interceptedBody);
}

function exactRequestBodyBytes(request: unknown): Buffer {
  const body = asRecord(request)?.body;
  const value = asRecord(body)?.value;
  if (!Buffer.isBuffer(value)) {
    throw new Error('T132_M7_L1_OFFLINE_CREATE_JOB_BODY_NOT_BYTES');
  }
  return Buffer.from(value);
}

function observeFieldTypes(root: unknown): FieldTypeObservation[] {
  const rootRecord = asRecord(root);
  const observations: Array<{ path: string; values: unknown[] }> =
    TOP_LEVEL_FIELDS.map((field) => ({
      path: field,
      values: [rootRecord?.[field]],
    }));
  const dataSources = asArray(rootRecord?.DataSources);
  for (const field of ['Uri', 'MountAccess', 'MountPath', 'Options'] as const) {
    observations.push({
      path: `DataSources[].${field}`,
      values: dataSources.map((entry) => asRecord(entry)?.[field]),
    });
  }
  const credentialConfig = asRecord(rootRecord?.CredentialConfig);
  const credentialItems = asArray(credentialConfig?.CredentialConfigItems);
  observations.push(
    {
      path: 'CredentialConfig.EnableCredentialInject',
      values: [credentialConfig?.EnableCredentialInject],
    },
    {
      path: 'CredentialConfig.AliyunEnvRoleKey',
      values: [credentialConfig?.AliyunEnvRoleKey],
    },
    {
      path: 'CredentialConfig.CredentialConfigItems',
      values: [credentialConfig?.CredentialConfigItems],
    },
  );
  for (const field of ['Key', 'Type', 'Roles'] as const) {
    observations.push({
      path: `CredentialConfig.CredentialConfigItems[].${field}`,
      values: credentialItems.map((entry) => asRecord(entry)?.[field]),
    });
  }
  const roles = credentialItems.flatMap(
    (entry) => asArray(asRecord(entry)?.Roles),
  );
  for (const field of ['RoleArn', 'RoleType', 'AssumeRoleFor'] as const) {
    observations.push({
      path: `CredentialConfig.CredentialConfigItems[].Roles[].${field}`,
      values: roles.map((role) => asRecord(role)?.[field]),
    });
  }
  const jobSpecs = asArray(rootRecord?.JobSpecs);
  for (
    const field of ['Type', 'Image', 'PodCount', 'EcsSpec', 'ResourceConfig'] as const
  ) {
    observations.push({
      path: `JobSpecs[].${field}`,
      values: jobSpecs.map((spec) => asRecord(spec)?.[field]),
    });
  }
  observations.push(
    {
      path: 'Settings.Tags',
      values: [asRecord(rootRecord?.Settings)?.Tags],
    },
    {
      path: 'Envs.EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON',
      values: [
        asRecord(rootRecord?.Envs)?.EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON,
      ],
    },
  );

  return observations.map(({ path, values }) => ({
    path,
    count: values.length,
    kinds: uniqueSorted(values.map(valueKind)),
  }));
}

function observeJsonStringFields(root: unknown): JsonStringObservation[] {
  const rootRecord = asRecord(root);
  const dataSourceOptions = asArray(rootRecord?.DataSources).map(
    (entry) => asRecord(entry)?.Options,
  );
  const sourceBinding = [
    asRecord(rootRecord?.Envs)?.EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON,
  ];
  return [
    observeJsonStringField('DataSources[].Options', dataSourceOptions),
    observeJsonStringField(
      'Envs.EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON',
      sourceBinding,
    ),
  ];
}

function observeJsonStringField(
  path: string,
  values: unknown[],
): JsonStringObservation {
  const parsedKinds: ObservedValueKind[] = [];
  let stringCount = 0;
  let parseFailureCount = 0;
  for (const value of values) {
    if (typeof value !== 'string') continue;
    stringCount += 1;
    try {
      parsedKinds.push(valueKind(JSON.parse(value) as unknown));
    } catch {
      parseFailureCount += 1;
    }
  }
  return {
    path,
    candidate_count: values.length,
    string_count: stringCount,
    parsed_kinds: uniqueSorted(parsedKinds),
    parse_failure_count: parseFailureCount,
  };
}

function countRecursiveKey(value: unknown, key: string): number {
  if (Array.isArray(value)) {
    return value.reduce(
      (count, entry) => count + countRecursiveKey(entry, key),
      0,
    );
  }
  const record = asRecord(value);
  if (record === null) return 0;
  return Object.entries(record).reduce(
    (count, [entryKey, entryValue]) => (
      count
      + (entryKey === key ? 1 : 0)
      + countRecursiveKey(entryValue, key)
    ),
    0,
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function valueKind(value: unknown): ObservedValueKind {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return 'object';
}

function uniqueSorted(values: ObservedValueKind[]): ObservedValueKind[] {
  return [...new Set(values)].sort();
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

// DEBUG-MODE: END dbg-20260729-151747-2ddb
