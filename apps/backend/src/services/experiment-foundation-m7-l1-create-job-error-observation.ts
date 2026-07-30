// DEBUG-MODE: BEGIN dbg-20260729-142414-8438

export const T132_CREATE_JOB_ERROR_DEBUG_RUN_ID = 'dbg-20260729-142414-8438';

type ObservationSource =
  | 'top_level'
  | 'data'
  | 'response'
  | 'response_data'
  | 'headers';

export interface ExperimentFoundationM7L1CreateJobErrorObservation {
  status_code: number | null;
  status_source: ObservationSource | null;
  provider_code: string | null;
  provider_code_source: ObservationSource | null;
  request_id: string | null;
  request_id_source: ObservationSource | null;
}

interface SourcedValue<T> {
  value: T;
  source: ObservationSource;
}

const DIAGNOSTIC_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export function observeExperimentFoundationM7L1CreateJobError(
  error: unknown,
): ExperimentFoundationM7L1CreateJobErrorObservation {
  try {
    const topLevel = asRecord(error);
    const data = asRecord(ownValue(topLevel, 'data'));
    const response = asRecord(ownValue(topLevel, 'response'));
    const responseData = asRecord(ownValue(response, 'data'));
    const headerRecords = [
      asRecord(ownValue(topLevel, 'headers')),
      asRecord(ownValue(topLevel, 'respHeaders')),
      asRecord(ownValue(topLevel, 'RespHeaders')),
      asRecord(ownValue(response, 'headers')),
    ];
    const records: Array<{
      record: Record<string, unknown> | null;
      source: Exclude<ObservationSource, 'headers'>;
    }> = [
      { record: topLevel, source: 'top_level' },
      { record: data, source: 'data' },
      { record: response, source: 'response' },
      { record: responseData, source: 'response_data' },
    ];
    const status = firstSafeStatus(records);
    const providerCode = firstSafeToken(records, [
      'code',
      'Code',
      'errorCode',
      'ErrorCode',
    ]);
    const directRequestId = firstSafeToken(records, ['requestId', 'RequestId']);
    const headerRequestId = directRequestId ?? firstSafeHeaderRequestId(headerRecords);
    return {
      status_code: status?.value ?? null,
      status_source: status?.source ?? null,
      provider_code: providerCode?.value ?? null,
      provider_code_source: providerCode?.source ?? null,
      request_id: headerRequestId?.value ?? null,
      request_id_source: headerRequestId?.source ?? null,
    };
  } catch {
    return emptyObservation();
  }
}

function emptyObservation(): ExperimentFoundationM7L1CreateJobErrorObservation {
  return {
    status_code: null,
    status_source: null,
    provider_code: null,
    provider_code_source: null,
    request_id: null,
    request_id_source: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function ownValue(
  record: Record<string, unknown> | null,
  key: string,
): unknown {
  if (record === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined && 'value' in descriptor
    ? descriptor.value
    : undefined;
}

function firstSafeStatus(
  records: Array<{
    record: Record<string, unknown> | null;
    source: Exclude<ObservationSource, 'headers'>;
  }>,
): SourcedValue<number> | null {
  for (const { record, source } of records) {
    for (const key of ['statusCode', 'StatusCode', 'status', 'Status']) {
      const value = safeStatus(ownValue(record, key));
      if (value !== null) return { value, source };
    }
  }
  return null;
}

function firstSafeToken(
  records: Array<{
    record: Record<string, unknown> | null;
    source: Exclude<ObservationSource, 'headers'>;
  }>,
  keys: string[],
): SourcedValue<string> | null {
  for (const { record, source } of records) {
    for (const key of keys) {
      const value = safeToken(ownValue(record, key));
      if (value !== null) return { value, source };
    }
  }
  return null;
}

function firstSafeHeaderRequestId(
  records: Array<Record<string, unknown> | null>,
): SourcedValue<string> | null {
  for (const record of records) {
    if (record === null) continue;
    for (const key of Object.getOwnPropertyNames(record)) {
      if (!['x-acs-request-id', 'x-acs-requestid'].includes(key.toLowerCase())) {
        continue;
      }
      const value = safeToken(ownValue(record, key));
      if (value !== null) return { value, source: 'headers' };
    }
  }
  return null;
}

function safeStatus(value: unknown): number | null {
  const candidate = typeof value === 'string' && /^[0-9]{3}$/.test(value)
    ? Number(value)
    : value;
  return typeof candidate === 'number'
    && Number.isInteger(candidate)
    && candidate >= 100
    && candidate <= 599
    ? candidate
    : null;
}

function safeToken(value: unknown): string | null {
  return typeof value === 'string' && DIAGNOSTIC_TOKEN_PATTERN.test(value)
    ? value
    : null;
}

// DEBUG-MODE: END dbg-20260729-142414-8438
