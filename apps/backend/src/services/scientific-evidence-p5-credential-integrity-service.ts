import { createHash, timingSafeEqual } from 'node:crypto';

export const SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_SCHEMA_V1 =
  'ScientificEvidenceP5CredentialIntegrityReceipt@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY =
  'ALIBABA_CLOUD_STS_INTEGRITY_RECEIPT' as const;

export const SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_ENV_KEYS_V1 = Object.freeze([
  'ALIBABA_CLOUD_ACCESS_KEY_ID',
  'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
  'ALIBABA_CLOUD_SECURITY_TOKEN',
  'ALIBABA_CLOUD_SESSION_TOKEN',
  'ALIBABA_CLOUD_STS_ISSUED_AT',
  'ALIBABA_CLOUD_STS_EXPIRATION',
  'ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID',
  SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_ENV_KEY,
] as const);

export interface ScientificEvidenceP5TemporaryCredentialV1 {
  access_key_id: string;
  access_key_secret: string;
  security_token: string;
  issued_at: string;
  expiration: string;
  assume_role_request_id: string;
}

export interface ScientificEvidenceP5CredentialIntegrityReceiptV1 {
  schema_version:
    typeof SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_SCHEMA_V1;
  encoding: 'visible-ascii-exact@v1';
  utf8_byte_lengths: {
    access_key_id: number;
    access_key_secret: number;
    security_token: number;
    issued_at: number;
    expiration: number;
    assume_role_request_id: number;
  };
  credential_tuple_hash: string;
}

type CredentialEnvironment = Readonly<Record<string, string | undefined>>;

export function readScientificEvidenceP5TemporaryCredentialEnvironment(
  environment: CredentialEnvironment,
): ScientificEvidenceP5TemporaryCredentialV1 {
  const securityToken = readTokenEnvironment(environment);
  return {
    access_key_id: readExactEnvironment(environment, 'ALIBABA_CLOUD_ACCESS_KEY_ID'),
    access_key_secret: readExactEnvironment(
      environment,
      'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
    ),
    security_token: securityToken,
    issued_at: readExactEnvironment(environment, 'ALIBABA_CLOUD_STS_ISSUED_AT'),
    expiration: readExactEnvironment(environment, 'ALIBABA_CLOUD_STS_EXPIRATION'),
    assume_role_request_id: readExactEnvironment(
      environment,
      'ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID',
    ),
  };
}

export function buildScientificEvidenceP5CredentialIntegrityReceiptV1(
  credential: ScientificEvidenceP5TemporaryCredentialV1,
): ScientificEvidenceP5CredentialIntegrityReceiptV1 {
  assertScientificEvidenceP5TemporaryCredentialShapeV1(credential);
  return {
    schema_version:
      SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_SCHEMA_V1,
    encoding: 'visible-ascii-exact@v1',
    utf8_byte_lengths: {
      access_key_id: byteLength(credential.access_key_id),
      access_key_secret: byteLength(credential.access_key_secret),
      security_token: byteLength(credential.security_token),
      issued_at: byteLength(credential.issued_at),
      expiration: byteLength(credential.expiration),
      assume_role_request_id: byteLength(credential.assume_role_request_id),
    },
    credential_tuple_hash: hashCredentialTuple(credential),
  };
}

export function parseScientificEvidenceP5CredentialIntegrityReceiptV1(
  serialized: string,
): ScientificEvidenceP5CredentialIntegrityReceiptV1 {
  if (serialized.length === 0 || serialized.trim() !== serialized) {
    throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_SERIALIZATION_INVALID');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_SERIALIZATION_INVALID');
  }
  if (!isReceiptShape(parsed)) {
    throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_SHAPE_INVALID');
  }
  return parsed;
}

export function assertScientificEvidenceP5CredentialIntegrityReceiptV1(input: {
  credential: ScientificEvidenceP5TemporaryCredentialV1;
  receipt: ScientificEvidenceP5CredentialIntegrityReceiptV1;
}): void {
  if (!isReceiptShape(input.receipt)) {
    throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_SHAPE_INVALID');
  }
  const expected = buildScientificEvidenceP5CredentialIntegrityReceiptV1(input.credential);
  if (
    input.receipt.schema_version !== expected.schema_version
    || input.receipt.encoding !== expected.encoding
    || !equalLengths(input.receipt.utf8_byte_lengths, expected.utf8_byte_lengths)
    || !safeHashEqual(
      input.receipt.credential_tuple_hash,
      expected.credential_tuple_hash,
    )
  ) {
    throw new Error('T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_BINDING_INVALID');
  }
}

export function clearScientificEvidenceP5TemporaryCredential(
  credential: ScientificEvidenceP5TemporaryCredentialV1,
): void {
  credential.access_key_id = '';
  credential.access_key_secret = '';
  credential.security_token = '';
  credential.issued_at = '';
  credential.expiration = '';
  credential.assume_role_request_id = '';
}

function assertScientificEvidenceP5TemporaryCredentialShapeV1(
  credential: ScientificEvidenceP5TemporaryCredentialV1,
): void {
  if (
    !/^STS\.[A-Za-z0-9]{16,124}$/.test(credential.access_key_id)
    || !isExactVisibleAscii(credential.access_key_id)
  ) throw new Error('T136_P5_CREDENTIAL_ACCESS_KEY_ID_FORMAT_INVALID');
  if (
    credential.access_key_secret.length < 30
    || credential.access_key_secret.length > 128
    || !isOpaqueVisibleAscii(credential.access_key_secret)
  ) throw new Error('T136_P5_CREDENTIAL_ACCESS_KEY_SECRET_FORMAT_INVALID');
  if (
    credential.security_token.length < 128
    || credential.security_token.length > 8_192
    || !isOpaqueVisibleAscii(credential.security_token)
  ) throw new Error('T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID');
  if (
    !isUtcTimestamp(credential.issued_at)
    || !isUtcTimestamp(credential.expiration)
    || !/^[A-Za-z0-9-]{16,128}$/.test(credential.assume_role_request_id)
    || !isExactVisibleAscii(credential.assume_role_request_id)
  ) throw new Error('T136_P5_CREDENTIAL_METADATA_FORMAT_INVALID');
}

function readTokenEnvironment(environment: CredentialEnvironment): string {
  const securityToken = environment.ALIBABA_CLOUD_SECURITY_TOKEN;
  const sessionToken = environment.ALIBABA_CLOUD_SESSION_TOKEN;
  if (
    securityToken !== undefined
    && sessionToken !== undefined
    && securityToken !== sessionToken
  ) throw new Error('T136_P5_CREDENTIAL_TOKEN_ENV_CONFLICT');
  if (securityToken !== undefined) {
    return assertExactEnvironmentValue(securityToken);
  }
  if (sessionToken !== undefined) {
    return assertExactEnvironmentValue(sessionToken);
  }
  throw new Error('T136_P5_CREDENTIAL_TOKEN_ENV_MISSING');
}

function readExactEnvironment(
  environment: CredentialEnvironment,
  key: string,
): string {
  const value = environment[key];
  if (value === undefined) throw new Error(`T136_P5_CREDENTIAL_ENV_MISSING:${key}`);
  return assertExactEnvironmentValue(value);
}

function assertExactEnvironmentValue(value: string): string {
  if (value.length === 0 || value.trim() !== value) {
    throw new Error('T136_P5_CREDENTIAL_ENV_VALUE_INVALID');
  }
  return value;
}

function isExactVisibleAscii(value: string): boolean {
  return value.trim() === value && /^[\x21-\x7E]+$/.test(value);
}

function isOpaqueVisibleAscii(value: string): boolean {
  return isExactVisibleAscii(value)
    && !/[\\'"{}\[\]]/.test(value)
    && !value.includes('\\n')
    && !value.includes('\\r')
    && !value.includes('\\t');
}

function isUtcTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function hashCredentialTuple(
  credential: ScientificEvidenceP5TemporaryCredentialV1,
): string {
  const fields = [
    ['access_key_id', credential.access_key_id],
    ['access_key_secret', credential.access_key_secret],
    ['security_token', credential.security_token],
    ['issued_at', credential.issued_at],
    ['expiration', credential.expiration],
    ['assume_role_request_id', credential.assume_role_request_id],
  ] as const;
  const canonical = [
    'scientific-evidence-p5-credential-integrity-v1',
    ...fields.map(([key, value]) => `${key}:${byteLength(value)}:${value}`),
  ].join('\n');
  return `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
}

function isReceiptShape(
  value: unknown,
): value is ScientificEvidenceP5CredentialIntegrityReceiptV1 {
  if (!hasExactKeys(value, [
    'schema_version',
    'encoding',
    'utf8_byte_lengths',
    'credential_tuple_hash',
  ])) return false;
  const receipt = value as Record<string, unknown>;
  if (!hasExactKeys(receipt.utf8_byte_lengths, [
    'access_key_id',
    'access_key_secret',
    'security_token',
    'issued_at',
    'expiration',
    'assume_role_request_id',
  ])) return false;
  const lengths = receipt.utf8_byte_lengths as Record<string, unknown>;
  return receipt.schema_version
      === SCIENTIFIC_EVIDENCE_P5_CREDENTIAL_INTEGRITY_RECEIPT_SCHEMA_V1
    && receipt.encoding === 'visible-ascii-exact@v1'
    && typeof receipt.credential_tuple_hash === 'string'
    && /^sha256:[a-f0-9]{64}$/.test(receipt.credential_tuple_hash)
    && Object.values(lengths).every(
      (length) => Number.isSafeInteger(length) && Number(length) > 0,
    );
}

function equalLengths(
  left: ScientificEvidenceP5CredentialIntegrityReceiptV1['utf8_byte_lengths'],
  right: ScientificEvidenceP5CredentialIntegrityReceiptV1['utf8_byte_lengths'],
): boolean {
  return Object.keys(left).every((key) => (
    left[key as keyof typeof left] === right[key as keyof typeof right]
  ));
}

function safeHashEqual(left: string, right: string): boolean {
  if (!/^sha256:[a-f0-9]{64}$/.test(left) || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function hasExactKeys(value: unknown, expectedKeys: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}
