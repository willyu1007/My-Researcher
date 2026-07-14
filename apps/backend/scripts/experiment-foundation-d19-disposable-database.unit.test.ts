import assert from 'node:assert/strict';
import test from 'node:test';

import {
  requireExperimentFoundationD19DisposableDatabaseIdentity,
} from './experiment-foundation-d19-disposable-database.js';

const NONCE = 'a'.repeat(64);
const DATABASE_NAME = `d19_${NONCE.slice(0, 12)}`;
const DATABASE_PASSWORD = 'b'.repeat(48);
const DATABASE_URL =
  `postgresql://postgres:${DATABASE_PASSWORD}@127.0.0.1:55432/${DATABASE_NAME}?schema=public`;

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL,
    EXPERIMENT_FOUNDATION_D19_DATABASE_URL: DATABASE_URL,
    EXPERIMENT_FOUNDATION_D19_DATABASE_NAME: DATABASE_NAME,
    EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE: NONCE,
  };
}

test('accepts an exact randomized D-19 database identity and nonce marker', () => {
  assert.deepEqual(
    requireExperimentFoundationD19DisposableDatabaseIdentity(validEnvironment()),
    {
      databaseUrl: DATABASE_URL,
      databaseName: DATABASE_NAME,
      nonce: NONCE,
      marker: `experiment-foundation-d19-disposable:${NONCE}`,
    },
  );
});

test('rejects a fixed or mismatched database name', () => {
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_FOUNDATION_D19_DATABASE_NAME: 'd19',
    }),
    /must equal randomized identity d19_/,
  );
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_FOUNDATION_D19_DATABASE_NAME: 'd19_bbbbbbbbbbbb',
    }),
    /must equal randomized identity d19_/,
  );
  const changedName = 'd19_bbbbbbbbbbbb';
  const changedUrl = DATABASE_URL.replace(DATABASE_NAME, changedName);
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: changedUrl,
      EXPERIMENT_FOUNDATION_D19_DATABASE_URL: changedUrl,
      EXPERIMENT_FOUNDATION_D19_DATABASE_NAME: changedName,
    }),
    /must equal randomized identity d19_/,
  );
});

test('rejects absent or malformed nonce evidence', () => {
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE: '',
    }),
    /64 lowercase hex/,
  );
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE: 'A'.repeat(64),
    }),
    /64 lowercase hex/,
  );
});

test('rejects non-loopback, mismatched URL, or non-public schema targets', () => {
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: DATABASE_URL.replace('127.0.0.1', 'db.internal'),
      EXPERIMENT_FOUNDATION_D19_DATABASE_URL:
        DATABASE_URL.replace('127.0.0.1', 'db.internal'),
    }),
    /loopback host/,
  );
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: `${DATABASE_URL}&application_name=unreviewed`,
      EXPERIMENT_FOUNDATION_D19_DATABASE_URL: `${DATABASE_URL}&application_name=unreviewed`,
    }),
    /only the public schema/,
  );
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: `${DATABASE_URL}#drift`,
      EXPERIMENT_FOUNDATION_D19_DATABASE_URL: `${DATABASE_URL}#drift`,
    }),
    /must not include a fragment/,
  );
  const withoutPort = DATABASE_URL.replace(':55432/', '/');
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: withoutPort,
      EXPERIMENT_FOUNDATION_D19_DATABASE_URL: withoutPort,
    }),
    /explicit public container port/,
  );
  const wrongCredentials = DATABASE_URL.replace('postgres:', 'root:');
  assert.throws(
    () => requireExperimentFoundationD19DisposableDatabaseIdentity({
      ...validEnvironment(),
      DATABASE_URL: wrongCredentials,
      EXPERIMENT_FOUNDATION_D19_DATABASE_URL: wrongCredentials,
    }),
    /credentials must use postgres/,
  );
});
