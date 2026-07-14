import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_POSTGRES_IMAGE,
  bindSourcePolicyStatus,
  buildSafeChildEnv,
  canonicalSourcePolicyAttestationDigest,
  describeEnvironmentIsolation,
  inspectFoundationCleanupMigration,
  inspectEventStorageHardeningMigration,
  isDirectRun,
  parseArgs,
  sourcePolicyStatus,
  validateSourcePolicyAttestation,
} from './experiment-foundation-d19-spine-gate.mjs';

const NOW = new Date('2026-07-13T12:00:00.000Z');
const sha256 = (character) => character.repeat(64);
const sha256Ref = (character) => `sha256:${sha256(character)}`;
const REVIEWED_ATTESTATION = JSON.parse(await fs.readFile(
  new URL(
    '../../dev-docs/active/experiment-foundation-productization-closure/artifacts/source-policy/00-d19-source-policy-attestation.json',
    import.meta.url,
  ),
  'utf8',
));

test('D-19 gate accepts only safe run ids and the reviewed digest-pinned image', () => {
  assert.deepEqual(parseArgs(['--run-id', 'd19-final']), {
    runId: 'd19-final',
    postgresImage: DEFAULT_POSTGRES_IMAGE,
  });
  assert.throws(() => parseArgs([]), /--run-id is required/);
  assert.throws(() => parseArgs(['--run-id', '../escape']), /safe filename/);
  assert.throws(
    () => parseArgs(['--run-id', 'safe', '--postgres-image', 'pgvector/pgvector:0.8.0-pg16']),
    /digest-pinned/,
  );
  assert.throws(
    () => parseArgs([
      '--run-id', 'safe', '--postgres-image',
      `other/postgres@sha256:${'a'.repeat(64)}`,
    ]),
    /pgvector\/pgvector/,
  );
});

test('D-19 child environment strips host DB, provider, cloud, and credential keys', () => {
  const host = {
    PATH: '/safe/bin',
    HOME: '/safe/home',
    DATABASE_URL: 'postgresql://should-not-leak',
    EXPERIMENT_FOUNDATION_REPOSITORY: 'prisma',
    CLOUD_TOKEN: 'should-not-leak',
    PROVIDER_API_KEY: 'should-not-leak',
  };
  assert.deepEqual(buildSafeChildEnv({}, host), {
    HOME: '/safe/home',
    PATH: '/safe/bin',
  });
  assert.deepEqual(buildSafeChildEnv({ DATABASE_URL: 'disposable' }, host), {
    HOME: '/safe/home',
    PATH: '/safe/bin',
    DATABASE_URL: 'disposable',
  });
  assert.deepEqual(describeEnvironmentIsolation(host), {
    policy: 'explicit_allowlist@v1',
    inherited_key_allowlist: [
      'CI', 'HOME', 'LANG', 'LC_ALL', 'PATH', 'PNPM_HOME', 'TEMP', 'TERM', 'TMP', 'TMPDIR',
    ],
    host_sensitive_key_count: 4,
    stripped_sensitive_key_count: 4,
    exposed_sensitive_keys: [],
    existing_database_url_present_but_ignored: true,
  });
});

test('D-19 gate requires removal of every reviewed never-read foundation placeholder', async () => {
  const sql = await fs.readFile(
    new URL(
      '../../prisma/migrations/20260714190000_remove_experiment_foundation_v2_placeholders/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.deepEqual(inspectFoundationCleanupMigration(sql), {
    removed_placeholder_columns: {
      ExperimentFoundationVersionLockV2: ['lockSchemaVersion', 'resolvedLockJson'],
      ExperimentFoundationDatasetV2: ['draftSchemaVersion', 'draftHash'],
      ExperimentFoundationDataPolicyV2: ['draftSchemaVersion', 'draftHash'],
      ExperimentFoundationMetricDefinitionV2: ['draftSchemaVersion', 'draftHash'],
      ExperimentFoundationBenchmarkV2: ['draftSchemaVersion', 'draftHash'],
      ExperimentFoundationEvaluationProtocolV2: ['draftSchemaVersion', 'draftHash'],
    },
    removed_indexes: [
      'ef_dataset_v2_draft_hash_idx',
      'ef_data_policy_v2_draft_hash_idx',
      'ef_metric_definition_v2_draft_hash_idx',
      'ef_benchmark_v2_draft_hash_idx',
      'ef_evaluation_protocol_v2_draft_hash_idx',
    ],
  });
  assert.throws(
    () => inspectFoundationCleanupMigration(
      sql.replace('DROP COLUMN "resolvedLockJson"', 'DROP COLUMN "unexpectedColumn"'),
    ),
    /remove exactly/,
  );
});

test('D-19 gate locks payload-only event storage, immutable FKs and fixed versions', async () => {
  const sql = await fs.readFile(
    new URL(
      '../../prisma/migrations/20260714210000_normalize_experiment_v2_event_payloads/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  assert.deepEqual(inspectEventStorageHardeningMigration(sql), {
    payload_only_event_table_count: 4,
    added_structural_column_count: 8,
    hardened_pack_a_foreign_key_count: 38,
    fixed_version_check_count: 9,
    cascade_operation_count: 0,
  });
  assert.throws(
    () => inspectEventStorageHardeningMigration(sql.replace(
      'ON UPDATE RESTRICT',
      'ON UPDATE CASCADE',
    )),
    /forbidden|double RESTRICT/,
  );
  assert.throws(
    () => inspectEventStorageHardeningMigration(sql.replace(
      '"eventEnvelopeHash" TEXT NOT NULL',
      '"eventEnvelopeHash" TEXT',
    )),
    /missing exact columns/,
  );
  assert.throws(
    () => inspectEventStorageHardeningMigration(sql.replace(
      '"branchFrameSchemaVersion" = \'v1\'',
      '"branchFrameSchemaVersion" = \'v2\'',
    )),
    /fixed version check/,
  );
  assert.throws(
    () => inspectEventStorageHardeningMigration(
      `${sql}\nUPDATE "PaperImplementationExperimentIntegrationOutboxV2" SET "eventPayloadJson" = '{}';`,
    ),
    /forbidden table, data, or cascade operation/,
  );
});

function validAttestation() {
  return structuredClone(REVIEWED_ATTESTATION);
}

function exactRef(assetType, logicalId, character) {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: `${logicalId}-revision-1`,
    revision_sequence: 1,
    content_hash: sha256Ref(character),
  };
}

function pendingStatus(attestation) {
  const normalized = validateSourcePolicyAttestation(attestation, { now: NOW });
  return {
    status: 'pending_exact_binding',
    reason_code: null,
    evidence_path: 'evidence/source-policy.json',
    attestation_digest: canonicalSourcePolicyAttestationDigest(normalized),
    candidate_entries: normalized.dataset_policies,
  };
}

function boundFixture(attestation) {
  const status = pendingStatus(attestation);
  const datasets = [
    exactRef('Dataset', 'ragperf-wikipedia-corpus', 'e'),
    exactRef('Dataset', 'ragperf-natural-questions-workload', 'f'),
  ];
  const dataPolicies = [
    exactRef('DataPolicy', 'ragperf-wikipedia-source-policy-v1', '1'),
    exactRef('DataPolicy', 'ragperf-natural-questions-source-policy-v1', '2'),
  ];
  return {
    datasets,
    data_policies: dataPolicies,
    source_policy_evidence: {
      mode: 'attested',
      attestation_digest: status.attestation_digest,
      bindings: status.candidate_entries.map((entry, index) => ({
        slot: entry.fixture_slot,
        dataset_ref: structuredClone(datasets[index]),
        data_policy_ref: structuredClone(dataPolicies[index]),
        dataset: structuredClone(entry.dataset),
        policy: structuredClone(entry.policy),
        provenance: structuredClone(entry.provenance),
      })),
    },
  };
}

test('accepts the closed ordered v2 attestation and hashes canonical JSON', () => {
  const attestation = validAttestation();
  const normalized = validateSourcePolicyAttestation(attestation, { now: NOW });
  const keyReordered = {
    dataset_policies: structuredClone(attestation.dataset_policies),
    schema_version: attestation.schema_version,
  };

  assert.deepEqual(normalized, attestation);
  assert.match(canonicalSourcePolicyAttestationDigest(normalized), /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    canonicalSourcePolicyAttestationDigest(normalized),
    'sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e',
  );
  assert.equal(
    canonicalSourcePolicyAttestationDigest(normalized),
    canonicalSourcePolicyAttestationDigest(keyReordered),
  );
});

test('rejects legacy schema, caller-authored refs/hashes, and unknown fields', () => {
  const legacy = validAttestation();
  legacy.schema_version = 'd19-source-policy-attestation@v1';
  assert.throws(
    () => validateSourcePolicyAttestation(legacy, { now: NOW }),
    /schema_version must be d19-source-policy-attestation@v2/,
  );

  for (const field of ['dataset_ref', 'content_hash', 'unexpected']) {
    const candidate = validAttestation();
    candidate.dataset_policies[0][field] = 'caller-authored';
    assert.throws(
      () => validateSourcePolicyAttestation(candidate, { now: NOW }),
      /has unknown fields/,
    );
  }
});

test('rejects reordered/duplicate slots and dataset key, role, or source-name drift', () => {
  const reordered = validAttestation();
  reordered.dataset_policies.reverse();
  assert.throws(
    () => validateSourcePolicyAttestation(reordered, { now: NOW }),
    /ordered slot wikipedia_corpus/,
  );

  const duplicate = validAttestation();
  duplicate.dataset_policies[1] = structuredClone(duplicate.dataset_policies[0]);
  assert.throws(
    () => validateSourcePolicyAttestation(duplicate, { now: NOW }),
    /ordered slot natural_questions_query_workload/,
  );

  const drifts = [
    ['dataset_key', 'another-dataset'],
    ['dataset_role', 'query_workload'],
    ['source_name', 'another-source'],
  ];
  for (const [field, value] of drifts) {
    const candidate = validAttestation();
    candidate.dataset_policies[0].dataset[field] = value;
    assert.throws(() => validateSourcePolicyAttestation(candidate, { now: NOW }));
  }
});

test('rejects mutable/placeholding sources, local URLs, future timestamps, and malformed manifests', () => {
  const mutations = [
    (value) => { value.dataset_policies[0].dataset.source_revision = 'latest'; },
    (value) => { value.dataset_policies[0].dataset.source_revision = 'release synthetic candidate'; },
    (value) => { value.dataset_policies[0].dataset.source_revision = ' release-2026 '; },
    (value) => { value.dataset_policies[0].dataset.version_label = 'main'; },
    (value) => { value.dataset_policies[1].dataset.source_revision = 'head'; },
    (value) => { value.dataset_policies[0].dataset.source_uri = 'https://source.invalid/data'; },
    (value) => { value.dataset_policies[0].dataset.source_uri = 'https://user:secret@dumps.wikimedia.org/data'; },
    (value) => { value.dataset_policies[0].dataset.source_uri = 'https://dumps.wikimedia.org/test/data'; },
    (value) => { value.dataset_policies[0].dataset.source_uri = 'https://dumps.wikimedia.org/%74est/data'; },
    (value) => { value.dataset_policies[0].dataset.source_uri = 'https://dumps.wikimedia.org/data?revision=latest'; },
    (value) => { value.dataset_policies[0].policy.source_terms_uri = 'https://localhost/terms'; },
    (value) => { value.dataset_policies[0].policy.source_terms_uri = 'https://example.com/terms'; },
    (value) => { value.dataset_policies[0].policy.use_constraints[0] = 'placeholder'; },
    (value) => { value.dataset_policies[0].provenance.verified_at = '2026-07-14T00:00:00.000Z'; },
    (value) => { value.dataset_policies[0].provenance.evidence_sha256 = sha256('a'); },
    (value) => { value.dataset_policies[0].dataset.checksum_manifest.entries[0].checksum = 'ABC'; },
    (value) => { value.dataset_policies[0].dataset.checksum_manifest.aggregate_checksum = sha256('0'); },
    (value) => { value.dataset_policies[0].dataset.split_protocol.splits[0].ordinal = 2; },
    (value) => { value.dataset_policies[0].dataset.split_protocol.splits[0].split_role = 'query'; },
    (value) => {
      value.dataset_policies[0].dataset.split_protocol.splits.push({
        ordinal: 2,
        split_key: 'corpus-extra',
        split_role: 'corpus',
        source_selector: 'remaining-records',
      });
    },
    (value) => { value.dataset_policies[0].policy.access_level = 'public'; },
    (value) => { value.dataset_policies[0].policy.extra = true; },
  ];

  for (const mutate of mutations) {
    const candidate = validAttestation();
    mutate(candidate);
    assert.throws(() => validateSourcePolicyAttestation(candidate, { now: NOW }));
  }
});

test('passes only full exact ordered fixture bindings', () => {
  const attestation = validAttestation();
  const result = bindSourcePolicyStatus(
    pendingStatus(attestation),
    boundFixture(attestation),
  );

  assert.deepEqual(result, {
    status: 'passed',
    reason_code: null,
    summary: 'Two source-backed policies bind both exact D-19 Dataset/DataPolicy revisions.',
    evidence_path: 'evidence/source-policy.json',
    attestation_digest: pendingStatus(attestation).attestation_digest,
  });
});

test('blocks missing or synthetic fixture evidence', () => {
  const status = pendingStatus(validAttestation());
  assert.equal(
    bindSourcePolicyStatus(status, { source_policy_evidence: false }).reason_code,
    'SOURCE_POLICY_FIXTURE_UNRESOLVED',
  );
  assert.equal(
    bindSourcePolicyStatus(status, {}).reason_code,
    'SOURCE_POLICY_FIXTURE_UNRESOLVED',
  );
});

test('blocks digest, exact-ref, order, full-field, and closed-output drift', () => {
  const attestation = validAttestation();
  const cases = [
    (fixture) => { fixture.source_policy_evidence.attestation_digest = sha256Ref('9'); },
    (fixture) => {
      fixture.source_policy_evidence.bindings[1].dataset_ref = structuredClone(
        fixture.source_policy_evidence.bindings[0].dataset_ref,
      );
      fixture.datasets[1] = structuredClone(fixture.datasets[0]);
    },
    (fixture) => {
      fixture.source_policy_evidence.bindings.reverse();
      fixture.datasets.reverse();
      fixture.data_policies.reverse();
    },
    (fixture) => {
      fixture.source_policy_evidence.bindings[0].dataset.source_revision = '2026-07-02';
    },
    (fixture) => {
      fixture.source_policy_evidence.bindings[0].policy.redistribution_allowed = false;
    },
    (fixture) => { fixture.source_policy_evidence.bindings[0].extra = true; },
  ];

  for (const mutate of cases) {
    const fixture = boundFixture(attestation);
    mutate(fixture);
    const result = bindSourcePolicyStatus(pendingStatus(attestation), fixture);
    assert.equal(result.status, 'blocked');
    assert.equal(result.reason_code, 'SOURCE_POLICY_EXACT_BINDING_MISMATCH');
  }
});

test('loads only repository-relative attestation paths and keeps no-input blocked', async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'd19-source-policy-'));
  try {
    await fs.mkdir(path.join(repoRoot, 'evidence'));
    const evidencePath = path.join(repoRoot, 'evidence/source-policy.json');
    await fs.writeFile(evidencePath, `${JSON.stringify(validAttestation())}\n`, 'utf8');

    const loaded = await sourcePolicyStatus({
      repoRoot,
      now: NOW,
      policyPath: 'evidence/source-policy.json',
    });
    assert.equal(loaded.status, 'pending_exact_binding');
    assert.equal(loaded.evidence_path, 'evidence/source-policy.json');

    const wrongLicense = validAttestation();
    wrongLicense.dataset_policies[1].policy.license_expression = 'Apache-2.0';
    await fs.writeFile(evidencePath, `${JSON.stringify(wrongLicense)}\n`, 'utf8');
    const semanticDrift = await sourcePolicyStatus({
      repoRoot,
      now: NOW,
      policyPath: 'evidence/source-policy.json',
    });
    assert.equal(semanticDrift.reason_code, 'SOURCE_POLICY_ATTESTATION_INVALID');
    assert.match(semanticDrift.summary, /reviewed Pack A semantic digest/);

    const absolute = await sourcePolicyStatus({ repoRoot, now: NOW, policyPath: evidencePath });
    assert.equal(absolute.reason_code, 'SOURCE_POLICY_PATH_INVALID');

    const missing = await sourcePolicyStatus({ repoRoot, now: NOW, policyPath: '' });
    assert.equal(missing.status, 'blocked');
    assert.equal(missing.reason_code, 'SOURCE_POLICY_UNRESOLVED');
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test('reviewed semantic digest rejects host, license, checksum, and evidence-hash substitution', async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'd19-source-policy-semantic-'));
  try {
    await fs.mkdir(path.join(repoRoot, 'evidence'));
    const evidencePath = path.join(repoRoot, 'evidence/source-policy.json');
    const mutations = [
      (value) => { value.dataset_policies[0].dataset.source_uri = 'https://example.com/frozen-source/'; },
      (value) => { value.dataset_policies[1].policy.license_expression = 'Apache-2.0'; },
      (value) => { value.dataset_policies[0].dataset.checksum_manifest.entries[0].checksum = sha256('0'); },
      (value) => { value.dataset_policies[1].provenance.evidence_sha256 = sha256Ref('9'); },
    ];
    for (const mutate of mutations) {
      const candidate = validAttestation();
      mutate(candidate);
      await fs.writeFile(evidencePath, `${JSON.stringify(candidate)}\n`, 'utf8');
      const status = await sourcePolicyStatus({
        repoRoot,
        now: NOW,
        policyPath: 'evidence/source-policy.json',
      });
      assert.equal(status.status, 'blocked');
      assert.equal(status.reason_code, 'SOURCE_POLICY_ATTESTATION_INVALID');
    }
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test('module import is side-effect free and direct-run detection is exact', () => {
  const gatePath = fileURLToPath(new URL('./experiment-foundation-d19-spine-gate.mjs', import.meta.url));
  assert.equal(isDirectRun(), false);
  assert.equal(isDirectRun(new URL('./experiment-foundation-d19-spine-gate.mjs', import.meta.url).href, gatePath), true);
  assert.equal(isDirectRun(import.meta.url, gatePath), false);
});

test('D-19 gate delegates disposable PostgreSQL plumbing to the shared helper', async () => {
  const source = await fs.readFile(
    new URL('./experiment-foundation-d19-spine-gate.mjs', import.meta.url),
    'utf8',
  );
  assert.match(source, /from '\.\/lib\/disposable-postgres\.mjs'/);
  assert.match(source, /startSharedDisposablePostgres/);
  assert.match(source, /markSharedDisposableDatabase/);
  assert.match(source, /resetDisposablePostgresPublicSchema/);
  assert.match(source, /stopSharedDisposablePostgres/);
  assert.match(source, /EXPERIMENT_FOUNDATION_V2_LIFECYCLE_PRISMA: '1'/);
  assert.match(source, /EXPERIMENT_FOUNDATION_V2_RELATIONAL_PRISMA: '1'/);
  assert.match(source, /PAPER_IMPLEMENTATION_EXPERIMENT_V2_RELATIONAL_PRISMA: '1'/);
  assert.match(source, /if \(!tap\.executedWithoutSkip\)/);
  assert.doesNotMatch(source, /DROP SCHEMA public CASCADE/);
  assert.doesNotMatch(source, /from 'node:child_process'/);
  assert.doesNotMatch(source, /from 'node:net'/);
});

test('Pack A D-19 census includes every Pack B family and asserts zero writes', async () => {
  const runner = await fs.readFile(
    new URL('../../apps/backend/scripts/run-experiment-foundation-d19-spine.ts', import.meta.url),
    'utf8',
  );
  const families = [
    ['ExperimentFoundationProviderPayloadV2', 'provider_payload'],
    ['ExperimentFoundationExecutionAttemptV2', 'execution_attempt'],
    ['ExperimentFoundationExecutionAttemptEventV2', 'execution_attempt_event'],
    ['ExperimentFoundationProviderCommandV2', 'provider_command'],
    ['ExperimentFoundationCollectionAttemptV2', 'collection_attempt'],
    ['ExperimentFoundationProvisionalOutputV2', 'provisional_output'],
  ];

  for (const [modelName, censusKey] of families) {
    assert.match(runner, new RegExp(`'${modelName}'`));
    assert.match(runner, new RegExp(`${censusKey}: 0`));
  }
  assert.match(runner, /assertPackBZeroCensus\(offBefore\)/);
  assert.match(runner, /assertPackBZeroCensus\(finalCensus\)/);
  assert.match(runner, /pack_b_zero_census: packBZeroCensus/);
});
