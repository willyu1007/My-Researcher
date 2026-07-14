import crypto from 'node:crypto';

export const EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SCHEMA_VERSION =
  'd19-source-policy-attestation@v2';

export const EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST =
  'sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e';

export const EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS = Object.freeze([
  'wikipedia_corpus',
  'natural_questions_query_workload',
]);

const SLOT_EXPECTATIONS = {
  wikipedia_corpus: {
    dataset_key: 'ragperf-wikipedia-corpus',
    dataset_role: 'corpus',
    source_name: 'wikimedia-mediawiki-content-current-enwiki',
    split_key: 'corpus',
    split_role: 'corpus',
  },
  natural_questions_query_workload: {
    dataset_key: 'ragperf-natural-questions-workload',
    dataset_role: 'query_workload',
    source_name: 'google-research-datasets-natural-questions-nq-open',
    split_key: 'query',
    split_role: 'query',
  },
};

const ROOT_KEYS = ['schema_version', 'dataset_policies'];
const ENTRY_KEYS = ['fixture_slot', 'dataset', 'policy', 'provenance'];
const DATASET_KEYS = [
  'dataset_key',
  'dataset_role',
  'source_name',
  'source_revision',
  'source_uri',
  'version_label',
  'checksum_manifest',
  'split_protocol',
];
const POLICY_KEYS = [
  'policy_key',
  'display_name',
  'license_expression',
  'access_level',
  'source_terms_uri',
  'redistribution_allowed',
  'commercial_use_allowed',
  'use_constraints',
];
const PROVENANCE_KEYS = [
  'verified_by',
  'verified_at',
  'evidence_uri',
  'evidence_sha256',
];
const CHECKSUM_MANIFEST_KEYS = [
  'manifest_version',
  'algorithm',
  'entries',
  'aggregate_checksum',
];
const CHECKSUM_ENTRY_KEYS = ['path', 'byte_size', 'checksum'];
const SPLIT_PROTOCOL_KEYS = ['protocol_version', 'splits'];
const SPLIT_KEYS = ['ordinal', 'split_key', 'split_role', 'source_selector'];
const ACCESS_LEVELS = new Set(['open', 'restricted', 'private']);
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const SHA256_REF_PATTERN = /^sha256:[0-9a-f]{64}$/;
const PLACEHOLDER_TOKEN =
  /(?:^|[^a-z0-9])(?:test|synthetic|unresolved|unknown|tbd|placeholder|latest|main|master|head)(?=$|[^a-z0-9])/i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function parseExperimentFoundationD19SourcePolicy(value, options = {}) {
  const now = options.now ?? new Date();
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('now must be a valid Date');
  }
  const root = closedObject(value, ROOT_KEYS, 'source policy attestation');
  if (root.schema_version !== EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SCHEMA_VERSION) {
    throw new Error(
      `schema_version must be ${EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SCHEMA_VERSION}`,
    );
  }
  if (
    !Array.isArray(root.dataset_policies)
    || root.dataset_policies.length !== EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS.length
  ) {
    throw new Error('dataset_policies must contain exactly two ordered fixture slots');
  }

  return {
    schema_version: EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SCHEMA_VERSION,
    dataset_policies: root.dataset_policies.map((candidate, index) => (
      parseEntry(candidate, EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS[index], now)
    )),
  };
}

export function digestExperimentFoundationD19SourcePolicy(value) {
  return `sha256:${crypto
    .createHash('sha256')
    .update(canonicalJson(value))
    .digest('hex')}`;
}

function parseEntry(value, expectedSlot, now) {
  const entry = closedObject(value, ENTRY_KEYS, `dataset_policies.${expectedSlot}`);
  if (entry.fixture_slot !== expectedSlot) {
    throw new Error(
      `fixture slots must be ordered; expected ordered slot ${expectedSlot}`,
    );
  }
  return {
    fixture_slot: expectedSlot,
    dataset: parseDataset(entry.dataset, expectedSlot),
    policy: parsePolicy(entry.policy, expectedSlot),
    provenance: parseProvenance(entry.provenance, expectedSlot, now),
  };
}

function parseDataset(value, slot) {
  const dataset = closedObject(value, DATASET_KEYS, `${slot}.dataset`);
  const expected = SLOT_EXPECTATIONS[slot];
  for (const key of ['dataset_key', 'dataset_role', 'source_name']) {
    if (dataset[key] !== expected[key]) {
      throw new Error(`${slot}.dataset.${key} must be ${expected[key]}`);
    }
  }
  return {
    dataset_key: expected.dataset_key,
    dataset_role: expected.dataset_role,
    source_name: expected.source_name,
    source_revision: sourceText(
      dataset.source_revision,
      `${slot}.dataset.source_revision`,
    ),
    source_uri: httpsUrl(dataset.source_uri, `${slot}.dataset.source_uri`),
    version_label: sourceText(dataset.version_label, `${slot}.dataset.version_label`),
    checksum_manifest: parseChecksumManifest(dataset.checksum_manifest, slot),
    split_protocol: parseSplitProtocol(dataset.split_protocol, slot),
  };
}

function parsePolicy(value, slot) {
  const policy = closedObject(value, POLICY_KEYS, `${slot}.policy`);
  if (!ACCESS_LEVELS.has(policy.access_level)) {
    throw new Error(`${slot}.policy.access_level must be open, restricted, or private`);
  }
  if (typeof policy.redistribution_allowed !== 'boolean') {
    throw new Error(`${slot}.policy.redistribution_allowed must be boolean`);
  }
  if (typeof policy.commercial_use_allowed !== 'boolean') {
    throw new Error(`${slot}.policy.commercial_use_allowed must be boolean`);
  }
  const useConstraints = sourceTextArray(
    policy.use_constraints,
    `${slot}.policy.use_constraints`,
  );
  if (new Set(useConstraints).size !== useConstraints.length) {
    throw new Error(`${slot}.policy.use_constraints must be unique and ordered`);
  }
  return {
    policy_key: sourceText(policy.policy_key, `${slot}.policy.policy_key`),
    display_name: sourceText(policy.display_name, `${slot}.policy.display_name`),
    license_expression: sourceText(
      policy.license_expression,
      `${slot}.policy.license_expression`,
    ),
    access_level: policy.access_level,
    source_terms_uri: httpsUrl(
      policy.source_terms_uri,
      `${slot}.policy.source_terms_uri`,
    ),
    redistribution_allowed: policy.redistribution_allowed,
    commercial_use_allowed: policy.commercial_use_allowed,
    use_constraints: useConstraints,
  };
}

function parseProvenance(value, slot, now) {
  const provenance = closedObject(value, PROVENANCE_KEYS, `${slot}.provenance`);
  const verifiedAt = trimmedText(provenance.verified_at, `${slot}.provenance.verified_at`);
  const verifiedTime = Date.parse(verifiedAt);
  if (
    Number.isNaN(verifiedTime)
    || new Date(verifiedTime).toISOString() !== verifiedAt
  ) {
    throw new Error(`${slot}.provenance.verified_at must be a canonical ISO-8601 timestamp`);
  }
  if (verifiedTime > now.getTime()) {
    throw new Error(`${slot}.provenance.verified_at must not be in the future`);
  }
  const evidenceSha256 = trimmedText(
    provenance.evidence_sha256,
    `${slot}.provenance.evidence_sha256`,
  );
  if (!SHA256_REF_PATTERN.test(evidenceSha256)) {
    throw new Error(`${slot}.provenance.evidence_sha256 must be sha256:<64 lowercase hex>`);
  }
  return {
    verified_by: sourceText(provenance.verified_by, `${slot}.provenance.verified_by`),
    verified_at: verifiedAt,
    evidence_uri: httpsUrl(provenance.evidence_uri, `${slot}.provenance.evidence_uri`),
    evidence_sha256: evidenceSha256,
  };
}

function parseChecksumManifest(value, slot) {
  const label = `${slot}.dataset.checksum_manifest`;
  const manifest = closedObject(value, CHECKSUM_MANIFEST_KEYS, label);
  if (manifest.manifest_version !== 'v1') {
    throw new Error(`${label}.manifest_version must be v1`);
  }
  if (manifest.algorithm !== 'sha256') {
    throw new Error(`${label}.algorithm must be sha256`);
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error(`${label}.entries must be non-empty`);
  }
  const paths = new Set();
  const entries = manifest.entries.map((candidate, index) => {
    const entryLabel = `${label}.entries[${index}]`;
    const entry = closedObject(candidate, CHECKSUM_ENTRY_KEYS, entryLabel);
    const checksumPath = trimmedText(entry.path, `${entryLabel}.path`);
    if (paths.has(checksumPath)) {
      throw new Error(`${label}.entries paths must be unique`);
    }
    paths.add(checksumPath);
    if (!Number.isSafeInteger(entry.byte_size) || entry.byte_size < 0) {
      throw new Error(`${entryLabel}.byte_size must be a non-negative safe integer`);
    }
    const checksum = trimmedText(entry.checksum, `${entryLabel}.checksum`);
    if (!SHA256_HEX_PATTERN.test(checksum)) {
      throw new Error(`${entryLabel}.checksum must be 64 lowercase hex`);
    }
    return { path: checksumPath, byte_size: entry.byte_size, checksum };
  });
  const aggregateChecksum = trimmedText(
    manifest.aggregate_checksum,
    `${label}.aggregate_checksum`,
  );
  if (!SHA256_HEX_PATTERN.test(aggregateChecksum)) {
    throw new Error(`${label}.aggregate_checksum must be 64 lowercase hex`);
  }
  const expectedAggregateChecksum = crypto
    .createHash('sha256')
    .update(canonicalJson(entries))
    .digest('hex');
  if (aggregateChecksum !== expectedAggregateChecksum) {
    throw new Error(`${label}.aggregate_checksum must be server-derived from ordered entries`);
  }
  return {
    manifest_version: 'v1',
    algorithm: 'sha256',
    entries,
    aggregate_checksum: aggregateChecksum,
  };
}

function parseSplitProtocol(value, slot) {
  const label = `${slot}.dataset.split_protocol`;
  const protocol = closedObject(value, SPLIT_PROTOCOL_KEYS, label);
  if (protocol.protocol_version !== 'v1') {
    throw new Error(`${label}.protocol_version must be v1`);
  }
  if (!Array.isArray(protocol.splits) || protocol.splits.length !== 1) {
    throw new Error(`${label} must contain exactly one split`);
  }
  const split = closedObject(protocol.splits[0], SPLIT_KEYS, `${label}.splits[0]`);
  const expected = SLOT_EXPECTATIONS[slot];
  if (
    split.ordinal !== 1
    || split.split_key !== expected.split_key
    || split.split_role !== expected.split_role
  ) {
    throw new Error(
      `${label}.splits[0] must use ordinal 1 and ${expected.split_key} key/role`,
    );
  }
  return {
    protocol_version: 'v1',
    splits: [{
      ordinal: 1,
      split_key: sourceText(split.split_key, `${label}.splits[0].split_key`),
      split_role: expected.split_role,
      source_selector: sourceText(
        split.source_selector,
        `${label}.splits[0].source_selector`,
      ),
    }],
  };
}

function closedObject(value, allowedKeys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actualKeys = Object.keys(value);
  const unknownKeys = actualKeys.filter((key) => !allowedKeys.includes(key));
  const missingKeys = allowedKeys.filter((key) => !Object.hasOwn(value, key));
  if (unknownKeys.length > 0) {
    throw new Error(`${label} has unknown fields: ${unknownKeys.join(', ')}`);
  }
  if (missingKeys.length > 0) {
    throw new Error(`${label} is missing fields: ${missingKeys.join(', ')}`);
  }
  return value;
}

function trimmedText(value, label) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value !== value.trim()
    || CONTROL_CHARACTER.test(value)
  ) {
    throw new Error(`${label} must be a non-empty trimmed string without control characters`);
  }
  return value;
}

function sourceText(value, label) {
  const text = trimmedText(value, label);
  if (PLACEHOLDER_TOKEN.test(text)) {
    throw new Error(`${label} contains a forbidden placeholder or floating revision`);
  }
  return text;
}

function sourceTextArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  return value.map((candidate, index) => sourceText(candidate, `${label}[${index}]`));
}

function httpsUrl(value, label) {
  const raw = trimmedText(value, label);
  if (/\s/.test(raw)) {
    throw new Error(`${label} must not contain whitespace`);
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL`);
  }
  const host = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== 'https:'
    || parsed.username !== ''
    || parsed.password !== ''
    || isLocalOrPlaceholderHost(host)
  ) {
    throw new Error(`${label} must be a credential-free, non-local HTTPS URL`);
  }
  const inspectedComponents = [host, parsed.pathname, parsed.search, parsed.hash]
    .map(decodeUrlComponent)
    .join(' ');
  if (PLACEHOLDER_TOKEN.test(inspectedComponents)) {
    throw new Error(`${label} contains a forbidden placeholder or floating URL token`);
  }
  if (parsed.toString() !== raw) {
    throw new Error(`${label} must use canonical URL serialization`);
  }
  return raw;
}

function decodeUrlComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLocalOrPlaceholderHost(host) {
  if (
    host === 'localhost'
    || host.endsWith('.localhost')
    || host === 'example.com'
    || host.endsWith('.example')
    || host.endsWith('.invalid')
    || host.endsWith('.test')
    || host === '[::1]'
    || /^\[(?:fc|fd|fe8|fe9|fea|feb)/i.test(host)
  ) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const octets = ipv4.slice(1).map(Number);
  return octets.some((octet) => octet > 255)
    || octets[0] === 0
    || octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}
