import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDisposablePostgresTestDatabaseMarker,
  requireDisposablePostgresDatabaseIdentity,
  requireDisposablePostgresTestDatabaseIdentity,
} from './disposable-postgres-test-database.js';

const NONCE = '0123456789abcdef'.repeat(4);
const DATABASE_NAME = `d19_${NONCE.slice(0, 12)}`;
const DATABASE_PASSWORD = 'a'.repeat(48);
const DATABASE_URL =
  `postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:55432/${DATABASE_NAME}?schema=public`;

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL,
    EXPERIMENT_V2_TEST_DATABASE_URL: DATABASE_URL,
    EXPERIMENT_V2_TEST_DATABASE_NAME: DATABASE_NAME,
    EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: NONCE,
  };
}

test('accepts an exact randomized disposable identity and derives the trusted marker', () => {
  assert.deepEqual(
    requireDisposablePostgresTestDatabaseIdentity(validEnvironment(), 'd19'),
    {
      database_url: DATABASE_URL,
      database_name: DATABASE_NAME,
      nonce: NONCE,
      marker: `experiment-foundation-d19-disposable:${NONCE}`,
    },
  );
});

test('rejects named local and nonce-unbound database identities', () => {
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_V2_TEST_DATABASE_NAME: 'paper_engineering_assistant',
      DATABASE_URL: DATABASE_URL.replace(DATABASE_NAME, 'paper_engineering_assistant'),
      EXPERIMENT_V2_TEST_DATABASE_URL:
        DATABASE_URL.replace(DATABASE_NAME, 'paper_engineering_assistant'),
    }, 'd19'),
    /randomized identity/,
  );
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_V2_TEST_DATABASE_NAME: 'd19_ffffffffffff',
      DATABASE_URL: DATABASE_URL.replace(DATABASE_NAME, 'd19_ffffffffffff'),
      EXPERIMENT_V2_TEST_DATABASE_URL:
        DATABASE_URL.replace(DATABASE_NAME, 'd19_ffffffffffff'),
    }, 'd19'),
    /randomized identity/,
  );
});

test('rejects absent explicit identity, malformed nonce, and DATABASE_URL drift', () => {
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_V2_TEST_DATABASE_URL: '',
    }, 'd19'),
    /no DATABASE_URL fallback/,
  );
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: 'A'.repeat(64),
    }, 'd19'),
    /64 lowercase hex/,
  );
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: `${DATABASE_URL}#drift`,
    }, 'd19'),
    /exactly match/,
  );
});

test('rejects non-loopback, non-public, fragment, and wrong-suite targets', () => {
  const remoteUrl = DATABASE_URL.replace('127.0.0.1', 'db.internal');
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: remoteUrl,
      EXPERIMENT_V2_TEST_DATABASE_URL: remoteUrl,
    }, 'd19'),
    /loopback host/,
  );
  const extraQueryUrl = `${DATABASE_URL}&application_name=test`;
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: extraQueryUrl,
      EXPERIMENT_V2_TEST_DATABASE_URL: extraQueryUrl,
    }, 'd19'),
    /only the public schema/,
  );
  const fragmentUrl = `${DATABASE_URL}#unsafe`;
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: fragmentUrl,
      EXPERIMENT_V2_TEST_DATABASE_URL: fragmentUrl,
    }, 'd19'),
    /must not include a fragment/,
  );
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity(validEnvironment(), 'packb'),
    /randomized identity/,
  );
});

test('rejects protocol, port, credential, and self-consistent URL/name drift', () => {
  const withoutPort = DATABASE_URL.replace(':55432/', '/');
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: withoutPort,
      EXPERIMENT_V2_TEST_DATABASE_URL: withoutPort,
    }, 'd19'),
    /explicit public container port/,
  );

  const wrongProtocol = DATABASE_URL.replace('postgresql:', 'http:');
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: wrongProtocol,
      EXPERIMENT_V2_TEST_DATABASE_URL: wrongProtocol,
    }, 'd19'),
    /postgresql protocol and a loopback host/,
  );

  const wrongCredentials = DATABASE_URL.replace('postgres:', 'root:');
  assert.throws(
    () => requireDisposablePostgresTestDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: wrongCredentials,
      EXPERIMENT_V2_TEST_DATABASE_URL: wrongCredentials,
    }, 'd19'),
    /credentials must use postgres/,
  );

  const changedDatabaseName = 'packb_ffffffffffff';
  const changedUrl = DATABASE_URL.replace(DATABASE_NAME, changedDatabaseName);
  assert.throws(
    () => requireDisposablePostgresDatabaseIdentity({
      DATABASE_URL: changedUrl,
      EXPERIMENT_FOUNDATION_PACKB_DATABASE_URL: changedUrl,
      EXPERIMENT_FOUNDATION_PACKB_DISPOSABLE_NONCE: NONCE,
    }, 'packb', {
      databaseUrlKey: 'EXPERIMENT_FOUNDATION_PACKB_DATABASE_URL',
      nonceKey: 'EXPERIMENT_FOUNDATION_PACKB_DISPOSABLE_NONCE',
    }),
    /exact nonce-derived database name/,
  );
});

test('requires the live database name and COMMENT marker to match the disposable identity', () => {
  const identity = requireDisposablePostgresTestDatabaseIdentity(validEnvironment(), 'd19');
  assert.doesNotThrow(() => assertDisposablePostgresTestDatabaseMarker(identity, [{
    database_name: DATABASE_NAME,
    marker: `experiment-foundation-d19-disposable:${NONCE}`,
  }]));
  assert.throws(
    () => assertDisposablePostgresTestDatabaseMarker(identity, [{
      database_name: DATABASE_NAME,
      marker: 'named-local-database',
    }]),
    /identity marker does not match/,
  );
  assert.throws(
    () => assertDisposablePostgresTestDatabaseMarker(identity, [{
      database_name: 'paper_engineering_assistant',
      marker: `experiment-foundation-d19-disposable:${NONCE}`,
    }]),
    /identity marker does not match/,
  );
  assert.throws(
    () => assertDisposablePostgresTestDatabaseMarker(identity, []),
    /identity marker does not match/,
  );
});

test('accepts the Pack C dedicated identity keys and marker', () => {
  const databaseName = `packc_${NONCE.slice(0, 12)}`;
  const databaseUrl = DATABASE_URL.replace(DATABASE_NAME, databaseName);
  assert.deepEqual(
    requireDisposablePostgresDatabaseIdentity({
      DATABASE_URL: databaseUrl,
      EXPERIMENT_FOUNDATION_PACKC_DATABASE_URL: databaseUrl,
      EXPERIMENT_FOUNDATION_PACKC_DISPOSABLE_NONCE: NONCE,
    }, 'packc', {
      databaseUrlKey: 'EXPERIMENT_FOUNDATION_PACKC_DATABASE_URL',
      nonceKey: 'EXPERIMENT_FOUNDATION_PACKC_DISPOSABLE_NONCE',
    }),
    {
      database_url: databaseUrl,
      database_name: databaseName,
      nonce: NONCE,
      marker: `experiment-foundation-packc-disposable:${NONCE}`,
    },
  );
});

test('accepts the Pack C-PI dedicated identity keys and marker', () => {
  const databaseName = `packc_pi_${NONCE.slice(0, 12)}`;
  const databaseUrl = DATABASE_URL.replace(DATABASE_NAME, databaseName);
  assert.deepEqual(
    requireDisposablePostgresDatabaseIdentity({
      DATABASE_URL: databaseUrl,
      PAPER_IMPLEMENTATION_PACKC_PI_DATABASE_URL: databaseUrl,
      PAPER_IMPLEMENTATION_PACKC_PI_DISPOSABLE_NONCE: NONCE,
    }, 'packc_pi', {
      databaseUrlKey: 'PAPER_IMPLEMENTATION_PACKC_PI_DATABASE_URL',
      nonceKey: 'PAPER_IMPLEMENTATION_PACKC_PI_DISPOSABLE_NONCE',
    }),
    {
      database_url: databaseUrl,
      database_name: databaseName,
      nonce: NONCE,
      marker: `experiment-foundation-packc-pi-disposable:${NONCE}`,
    },
  );
});
