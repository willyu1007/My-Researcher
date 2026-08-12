import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertScientificEvidenceP5CredentialIntegrityReceiptV1,
  buildScientificEvidenceP5CredentialIntegrityReceiptV1,
  clearScientificEvidenceP5TemporaryCredential,
  parseScientificEvidenceP5CredentialIntegrityReceiptV1,
  readScientificEvidenceP5TemporaryCredentialEnvironment,
  type ScientificEvidenceP5TemporaryCredentialV1,
} from './scientific-evidence-p5-credential-integrity-service.js';

function credentialFixture(): ScientificEvidenceP5TemporaryCredentialV1 {
  return {
    access_key_id: `STS.${'A1b2C3d4E5f6G7h8I9j0K1l2M'}`,
    access_key_secret: 'aB3dE5fG7hI9jK1mN3pQ5rS7tU9vW1xY3zA5bC7dE9f',
    security_token: 'Aa0+/=_-.'.repeat(47) + 'Tail',
    issued_at: '2026-08-11T14:42:45.000Z',
    expiration: '2026-08-11T15:42:45Z',
    assume_role_request_id: '019FF146-A180-5EB6-9CCB-0A073A0A80F8',
  };
}

function environmentFixture(): Record<string, string> {
  const credential = credentialFixture();
  return {
    ALIBABA_CLOUD_ACCESS_KEY_ID: credential.access_key_id,
    ALIBABA_CLOUD_ACCESS_KEY_SECRET: credential.access_key_secret,
    ALIBABA_CLOUD_SECURITY_TOKEN: credential.security_token,
    ALIBABA_CLOUD_STS_ISSUED_AT: credential.issued_at,
    ALIBABA_CLOUD_STS_EXPIRATION: credential.expiration,
    ALIBABA_CLOUD_STS_ASSUME_ROLE_REQUEST_ID: credential.assume_role_request_id,
  };
}

test('builds a secret-free receipt and verifies the exact credential tuple', () => {
  const credential = credentialFixture();
  const receipt = buildScientificEvidenceP5CredentialIntegrityReceiptV1(credential);
  const serialized = JSON.stringify(receipt);

  assert.doesNotThrow(() => assertScientificEvidenceP5CredentialIntegrityReceiptV1({
    credential,
    receipt: parseScientificEvidenceP5CredentialIntegrityReceiptV1(serialized),
  }));
  assert.equal(serialized.includes(credential.access_key_id), false);
  assert.equal(serialized.includes(credential.access_key_secret), false);
  assert.equal(serialized.includes(credential.security_token), false);
  assert.equal(receipt.utf8_byte_lengths.security_token, credential.security_token.length);
});

test('rejects token truncation and serialization artifacts before any provider call', () => {
  const truncated = credentialFixture();
  truncated.security_token = truncated.security_token.slice(0, 64);
  assert.throws(
    () => buildScientificEvidenceP5CredentialIntegrityReceiptV1(truncated),
    /T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID/,
  );

  const escaped = credentialFixture();
  escaped.security_token = `${escaped.security_token}\\n`;
  assert.throws(
    () => buildScientificEvidenceP5CredentialIntegrityReceiptV1(escaped),
    /T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID/,
  );
});

test('rejects whitespace normalization and conflicting token aliases', () => {
  const whitespace = environmentFixture();
  whitespace.ALIBABA_CLOUD_ACCESS_KEY_SECRET =
    ` ${whitespace.ALIBABA_CLOUD_ACCESS_KEY_SECRET}`;
  assert.throws(
    () => readScientificEvidenceP5TemporaryCredentialEnvironment(whitespace),
    /T136_P5_CREDENTIAL_ENV_VALUE_INVALID/,
  );

  const aliases = environmentFixture();
  aliases.ALIBABA_CLOUD_SESSION_TOKEN = `${aliases.ALIBABA_CLOUD_SECURITY_TOKEN}changed`;
  assert.throws(
    () => readScientificEvidenceP5TemporaryCredentialEnvironment(aliases),
    /T136_P5_CREDENTIAL_TOKEN_ENV_CONFLICT/,
  );
});

test('detects credential drift between receipt issuance and qualification handoff', () => {
  const credential = credentialFixture();
  const receipt = buildScientificEvidenceP5CredentialIntegrityReceiptV1(credential);
  credential.security_token = `${credential.security_token.slice(0, -1)}Z`;
  assert.throws(
    () => assertScientificEvidenceP5CredentialIntegrityReceiptV1({ credential, receipt }),
    /T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_BINDING_INVALID/,
  );
});

test('rejects receipt fields that could smuggle credential material', () => {
  const credential = credentialFixture();
  const receipt = buildScientificEvidenceP5CredentialIntegrityReceiptV1(credential);
  const expanded = {
    ...receipt,
    security_token: credential.security_token,
  };
  assert.throws(
    () => assertScientificEvidenceP5CredentialIntegrityReceiptV1({
      credential,
      receipt: expanded as typeof receipt,
    }),
    /T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_SHAPE_INVALID/,
  );
});

test('rejects non-canonical receipt serialization and clears in-memory values', () => {
  const credential = credentialFixture();
  const serialized = `${JSON.stringify(
    buildScientificEvidenceP5CredentialIntegrityReceiptV1(credential),
  )}\n`;
  assert.throws(
    () => parseScientificEvidenceP5CredentialIntegrityReceiptV1(serialized),
    /T136_P5_CREDENTIAL_INTEGRITY_RECEIPT_SERIALIZATION_INVALID/,
  );

  clearScientificEvidenceP5TemporaryCredential(credential);
  assert.deepEqual(credential, {
    access_key_id: '',
    access_key_secret: '',
    security_token: '',
    issued_at: '',
    expiration: '',
    assume_role_request_id: '',
  });
});
