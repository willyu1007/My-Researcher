import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { AppError } from '../errors/app-error.js';
import type {
  ExperimentFoundationV2Repository,
  ExperimentFoundationV2UnitOfWork,
} from '../repositories/experiment-foundation-v2.repository.js';
import { InMemoryExperimentFoundationV2Repository } from '../repositories/in-memory-experiment-foundation-v2-repository.js';
import { buildExperimentFoundationD19TypedFixture } from './experiment-foundation-d19-fixture.js';
import {
  EXPERIMENT_FOUNDATION_D19_LOCAL_TARGET_FINGERPRINT,
  experimentFoundationD19FixtureImportHelp,
  fingerprintExperimentFoundationD19LocalTarget,
  parseExperimentFoundationD19FixtureImportArgs,
  redactExperimentFoundationD19CliError,
  requireExperimentFoundationD19LocalTargetFingerprint,
  requireLocalExperimentFoundationD19DatabaseUrl,
} from './experiment-foundation-d19-fixture-import-cli.js';
import {
  buildExperimentFoundationD19AdmissionRequestTemplate,
  EXPERIMENT_FOUNDATION_D19_FIXTURE_IMPORT_CONFLICT,
  importExperimentFoundationD19TypedFixture,
  summarizeExperimentFoundationD19FixtureImport,
} from './experiment-foundation-d19-fixture-import-service.js';
import {
  parseExperimentFoundationD19SourcePolicyAttestation,
  type ExperimentFoundationD19SourcePolicyAttestation,
} from './experiment-foundation-d19-source-policy.js';
import { ExperimentFoundationV2Service } from './experiment-foundation-v2-service.js';

const SOURCE_POLICY_URL = new URL(
  './test-fixtures/experiment-foundation-d19-source-policy-attestation.fixture.json',
  import.meta.url,
);
const REPO_ROOT = path.resolve('workspace/my-researcher');

test('D-19 importer CLI resolves output from repo root and documents its local DATABASE_URL contract', () => {
  const parsed = parseExperimentFoundationD19FixtureImportArgs([
    '--apply',
    '--output',
    'artifacts/experiment-foundation-productization/local-r1/fixture-import-summary.json',
  ], REPO_ROOT);
  assert.deepEqual(parsed, {
    help: false,
    apply: true,
    sourcePolicyPath:
      'apps/backend/src/services/test-fixtures/experiment-foundation-d19-source-policy-attestation.fixture.json',
    outputPath: path.join(
      REPO_ROOT,
      'artifacts/experiment-foundation-productization/local-r1/fixture-import-summary.json',
    ),
  });
  assert.deepEqual(
    parseExperimentFoundationD19FixtureImportArgs(['--help'], REPO_ROOT),
    { help: true },
  );
  assert.throws(
    () => parseExperimentFoundationD19FixtureImportArgs([
      '--apply',
      '--output',
      '../../artifacts/experiment-foundation-productization/wrong.json',
    ], REPO_ROOT),
    /must remain inside the repository/,
  );
  const help = experimentFoundationD19FixtureImportHelp();
  assert.match(help, /--output artifacts\/experiment-foundation-productization/);
  assert.match(help, /loads \.\.\/\.\.\/\.env\.local/);
  assert.doesNotMatch(help, /--output \.\.\/\.\.\/artifacts/);
});

test('D-19 importer CLI accepts only the reviewed named local PostgreSQL target without exposing credentials', () => {
  const reviewedUrl =
    'postgres://user:secret@127.0.0.1:5432/postgres?schema=my_researcher_dev';
  assert.equal(requireLocalExperimentFoundationD19DatabaseUrl(reviewedUrl), reviewedUrl);
  for (const url of [
    'postgresql://user:do-not-print@database.example.com:5432/postgres',
    'postgresql://user:do-not-print@localhost:5432/postgres?schema=my_researcher_dev',
    'postgresql://user:do-not-print@[::1]:5432/postgres?schema=my_researcher_dev',
    'postgresql://user:do-not-print@127.0.0.1:55432/postgres?schema=my_researcher_dev',
    'postgresql://user:do-not-print@127.0.0.1:5432/staging?schema=my_researcher_dev',
    'postgresql://user:do-not-print@127.0.0.1:5432/postgres?schema=public',
    'postgresql://user:do-not-print@127.0.0.1:5432/postgres',
    'mysql://user:do-not-print@localhost/database',
    'not-a-url-with-do-not-print',
  ]) {
    assert.throws(
      () => requireLocalExperimentFoundationD19DatabaseUrl(url),
      (error) => error instanceof Error
        && !error.message.includes('do-not-print')
        && !error.message.includes('database.example.com'),
    );
  }
  assert.equal(
    redactExperimentFoundationD19CliError(
      new Error('failed postgresql://operator:secret@127.0.0.1/postgres password=secret'),
    ),
    'failed [redacted-database-url] password=[redacted]',
  );
  const identity = {
    database_name: 'postgres',
    schema_name: 'my_researcher_dev',
    system_identifier: '7603767034018223112',
    database_oid: '5',
    schema_oid: '16388',
  };
  assert.equal(
    fingerprintExperimentFoundationD19LocalTarget(identity),
    EXPERIMENT_FOUNDATION_D19_LOCAL_TARGET_FINGERPRINT,
  );
  assert.equal(
    requireExperimentFoundationD19LocalTargetFingerprint(identity),
    EXPERIMENT_FOUNDATION_D19_LOCAL_TARGET_FINGERPRINT,
  );
  assert.throws(
    () => requireExperimentFoundationD19LocalTargetFingerprint({
      ...identity,
      system_identifier: 'remote-cluster',
    }),
    /fingerprint is not approved/,
  );
});

test('D-19 existing-environment importer exact-reuses every typed asset, lifecycle event, and readiness row', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const sourcePolicy = await reviewedSourcePolicy();

  const first = await importExperimentFoundationD19TypedFixture(repository, sourcePolicy);
  assert.deepEqual(first.counters, {
    asset_identities: { created: 23, exact_reused: 0 },
    asset_revisions: { created: 23, exact_reused: 0 },
    lifecycle_events: { created: 48, exact_reused: 0 },
    readiness_attestations: { created: 23, exact_reused: 0 },
  });
  const replay = await importExperimentFoundationD19TypedFixture(repository, sourcePolicy);
  assert.deepEqual(replay.counters, {
    asset_identities: { created: 0, exact_reused: 23 },
    asset_revisions: { created: 0, exact_reused: 23 },
    lifecycle_events: { created: 0, exact_reused: 48 },
    readiness_attestations: { created: 0, exact_reused: 23 },
  });
  assert.deepEqual(exactRefs(replay), exactRefs(first));
  assert.equal(
    replay.fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
    first.fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
  );

  for (const ref of exactRefs(first)) {
    await repository.runInTransaction(async (unitOfWork) => {
      assert.equal((await unitOfWork.listAssetRevisions(ref.asset_type, ref.logical_id)).length, 1);
      assert.equal(
        (await unitOfWork.listLifecycleEvents(ref)).length,
        ref.asset_type === 'Dataset' ? 3 : 2,
      );
      const receipt = await unitOfWork.findFreezeReplay(
        ref.asset_type,
        ref.logical_id,
        `d19-freeze:${ref.asset_type}:${ref.logical_id}`,
      );
      assert.equal(receipt?.revision_id, ref.revision_id);
      assert.equal(receipt?.content_hash, ref.content_hash);
    });
  }
});

test('D-19 importer resumes exact prefixes after failures at identity, freeze, and lifecycle boundaries', async () => {
  const sourcePolicy = await reviewedSourcePolicy();
  for (const failAt of [2, 4, 6, 8, 31, 73]) {
    const durable = new InMemoryExperimentFoundationV2Repository();
    const failOnce = failingOnceRepository(durable, failAt);
    await assert.rejects(
      importExperimentFoundationD19TypedFixture(failOnce, sourcePolicy),
      /injected importer crash/,
    );

    const resumed = await importExperimentFoundationD19TypedFixture(failOnce, sourcePolicy);
    assert.equal(resumed.fixture.evaluation_protocol_readiness.attestation.status, 'passed');
    assert.equal(exactRefs(resumed).length, 23);

    const replay = await importExperimentFoundationD19TypedFixture(durable, sourcePolicy);
    assert.deepEqual(replay.counters, {
      asset_identities: { created: 0, exact_reused: 23 },
      asset_revisions: { created: 0, exact_reused: 23 },
      lifecycle_events: { created: 0, exact_reused: 48 },
      readiness_attestations: { created: 0, exact_reused: 23 },
    });
  }
});

test('concurrent exact D-19 imports converge and a later replay observes one durable population', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const sourcePolicy = await reviewedSourcePolicy();
  const [left, right] = await Promise.all([
    importExperimentFoundationD19TypedFixture(repository, sourcePolicy),
    importExperimentFoundationD19TypedFixture(repository, sourcePolicy),
  ]);
  assert.deepEqual(exactRefs(left), exactRefs(right));
  assert.equal(
    left.fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
    right.fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
  );

  const replay = await importExperimentFoundationD19TypedFixture(repository, sourcePolicy);
  assert.deepEqual(replay.counters, {
    asset_identities: { created: 0, exact_reused: 23 },
    asset_revisions: { created: 0, exact_reused: 23 },
    lifecycle_events: { created: 0, exact_reused: 48 },
    readiness_attestations: { created: 0, exact_reused: 23 },
  });
});

test('D-19 importer fails closed when a reserved logical id has changed semantic content', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const service = new ExperimentFoundationV2Service(repository);
  await service.createAssetDraft({
    asset_type: 'DataPolicy',
    logical_id: 'd19-data-policy-wikipedia',
    draft_content: {
      schema_version: 'v1',
      policy_key: 'conflicting-policy',
      display_name: 'Conflicting policy',
      license_expression: 'LicenseRef-Conflict',
      access_level: 'restricted',
      source_terms_uri: 'https://example.com/conflict',
      redistribution_allowed: false,
      commercial_use_allowed: false,
      use_constraints: ['conflict'],
    },
  });

  await assertImportConflict(
    importExperimentFoundationD19TypedFixture(repository, await reviewedSourcePolicy()),
  );
});

test('D-19 importer rejects lifecycle history beyond the reviewed exact prefix', async () => {
  const repository = new InMemoryExperimentFoundationV2Repository();
  const sourcePolicy = await reviewedSourcePolicy();
  const baseService = new ExperimentFoundationV2Service(repository);
  const fixture = await buildExperimentFoundationD19TypedFixture(baseService, {
    sourcePolicyAttestation: sourcePolicy,
  });
  const metric = fixture.metric_definitions[0]!;
  await baseService.appendLifecycleEvent({
    asset: metric,
    expected_projection_state_version: 2,
    event_type: 'deprecated',
    reason_code: 'OUTSIDE_REVIEWED_FIXTURE',
  });

  await assertImportConflict(
    importExperimentFoundationD19TypedFixture(repository, sourcePolicy),
  );
});

test('D-19 import summary exposes exact readiness and the two admission cells without writing PI', async () => {
  const result = await importExperimentFoundationD19TypedFixture(
    new InMemoryExperimentFoundationV2Repository(),
    await reviewedSourcePolicy(),
  );
  const summary = summarizeExperimentFoundationD19FixtureImport(result);

  assert.equal(summary.schema_version, 'experiment-foundation-d19-fixture-import-summary@v1');
  assert.equal(summary.status, 'passed');
  assert.equal(summary.exact_asset_refs.data_policies.length, 2);
  assert.equal(summary.exact_asset_refs.datasets.length, 2);
  assert.equal(summary.exact_asset_refs.metric_definitions.length, 17);
  assert.equal(summary.exact_readiness.status, 'passed');
  assert.equal(summary.exact_readiness.ordered_dependencies.length, 22);
  assert.deepEqual(
    summary.admission_request_template.work_order_revision.asset_dependencies,
    [summary.exact_asset_refs.evaluation_protocol, ...summary.exact_readiness.ordered_dependencies],
  );
  assert.deepEqual(
    summary.admission_request_template.exact_cells.map((cell) => ({
      cell_key: cell.cell_key,
      seed: cell.seed,
      retriever_top_k: cell.parameters[0]?.value,
      metric_count: cell.required_result_contract.metrics.length,
    })),
    [
      { cell_key: 'retriever-top-k-5', seed: 7, retriever_top_k: 5, metric_count: 7 },
      { cell_key: 'retriever-top-k-10', seed: 11, retriever_top_k: 10, metric_count: 7 },
    ],
  );
});

test('D-19 admission template selects active metrics by identity rather than fixture array position', async () => {
  const result = await importExperimentFoundationD19TypedFixture(
    new InMemoryExperimentFoundationV2Repository(),
    await reviewedSourcePolicy(),
  );
  const reorderedFixture = {
    ...result.fixture,
    metric_definitions: [...result.fixture.metric_definitions].reverse(),
  };

  const template = buildExperimentFoundationD19AdmissionRequestTemplate(reorderedFixture);
  assert.deepEqual(
    template.exact_cells[0]?.required_result_contract.metrics.map(
      (metric) => metric.metric_definition.logical_id,
    ),
    [
      'd19-metric-embedding_time_ns',
      'd19-metric-generation_time_ns',
      'd19-metric-prompt_time_ns',
      'd19-metric-qps',
      'd19-metric-rerank_time_ns',
      'd19-metric-retrieval_time_ns',
      'd19-metric-total_pipeline_time_ns',
    ],
  );
});

test('D-19 importer rejects a typed but unreviewed source-policy digest', async () => {
  const sourcePolicy = structuredClone(await reviewedSourcePolicy());
  sourcePolicy.dataset_policies[0]!.provenance.verified_by = 'unreviewed-change';
  await assertImportConflict(
    importExperimentFoundationD19TypedFixture(
      new InMemoryExperimentFoundationV2Repository(),
      sourcePolicy,
    ),
  );
});

async function reviewedSourcePolicy(): Promise<ExperimentFoundationD19SourcePolicyAttestation> {
  return parseExperimentFoundationD19SourcePolicyAttestation(
    JSON.parse(await fs.readFile(SOURCE_POLICY_URL, 'utf8')) as unknown,
  );
}

function exactRefs(result: Awaited<ReturnType<typeof importExperimentFoundationD19TypedFixture>>) {
  return [
    ...result.fixture.data_policies,
    ...result.fixture.datasets,
    ...result.fixture.metric_definitions,
    result.fixture.benchmark,
    result.fixture.evaluation_protocol,
  ];
}

function failingOnceRepository(
  durable: ExperimentFoundationV2Repository,
  failAt: number,
): ExperimentFoundationV2Repository {
  let transactionCount = 0;
  let failed = false;
  return {
    async runInTransaction<T>(
      operation: (unitOfWork: ExperimentFoundationV2UnitOfWork) => Promise<T>,
    ): Promise<T> {
      transactionCount += 1;
      if (!failed && transactionCount === failAt) {
        failed = true;
        throw new Error(`injected importer crash at transaction ${failAt}`);
      }
      return durable.runInTransaction(operation);
    },
  };
}

async function assertImportConflict(promise: Promise<unknown>): Promise<void> {
  await assert.rejects(
    promise,
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.details?.reason_code === EXPERIMENT_FOUNDATION_D19_FIXTURE_IMPORT_CONFLICT,
  );
}
