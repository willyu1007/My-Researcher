import {
  requireDisposablePostgresDatabaseIdentity,
} from '../src/test-support/disposable-postgres-test-database.js';

export interface ExperimentFoundationD19DisposableDatabaseIdentity {
  databaseUrl: string;
  databaseName: string;
  nonce: string;
  marker: string;
}

export function requireExperimentFoundationD19DisposableDatabaseIdentity(
  environment: NodeJS.ProcessEnv,
): ExperimentFoundationD19DisposableDatabaseIdentity {
  const identity = requireDisposablePostgresDatabaseIdentity(environment, 'd19', {
    databaseUrlKey: 'EXPERIMENT_FOUNDATION_D19_DATABASE_URL',
    databaseNameKey: 'EXPERIMENT_FOUNDATION_D19_DATABASE_NAME',
    nonceKey: 'EXPERIMENT_FOUNDATION_D19_DISPOSABLE_NONCE',
  });
  return {
    databaseUrl: identity.database_url,
    databaseName: identity.database_name,
    nonce: identity.nonce,
    marker: identity.marker,
  };
}
