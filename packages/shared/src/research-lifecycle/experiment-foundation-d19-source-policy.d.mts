import type {
  ExperimentFoundationV2ChecksumManifestSnapshotV1,
  ExperimentFoundationV2DataPolicyAccessLevel,
  ExperimentFoundationV2DatasetRole,
  ExperimentFoundationV2SplitProtocolSnapshotV1,
} from './experiment-foundation-v2-contracts.js';

export const EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SCHEMA_VERSION:
  'd19-source-policy-attestation@v2';

export const EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST:
  'sha256:48dd3546bcf314c478f80a5bc6ba5bcc0ecc57b848ac0d83fd7d5c9b8ac3bb6e';

export const EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS: readonly [
  'wikipedia_corpus',
  'natural_questions_query_workload',
];

export type ExperimentFoundationD19SourcePolicySlot =
  (typeof EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SLOTS)[number];

export interface ExperimentFoundationD19SourceDataset {
  dataset_key: string;
  dataset_role: ExperimentFoundationV2DatasetRole;
  source_name: string;
  source_revision: string;
  source_uri: string;
  version_label: string;
  checksum_manifest: ExperimentFoundationV2ChecksumManifestSnapshotV1;
  split_protocol: ExperimentFoundationV2SplitProtocolSnapshotV1;
}

export interface ExperimentFoundationD19SourcePolicy {
  policy_key: string;
  display_name: string;
  license_expression: string;
  access_level: ExperimentFoundationV2DataPolicyAccessLevel;
  source_terms_uri: string;
  redistribution_allowed: boolean;
  commercial_use_allowed: boolean;
  use_constraints: string[];
}

export interface ExperimentFoundationD19SourcePolicyProvenance {
  verified_by: string;
  verified_at: string;
  evidence_uri: string;
  evidence_sha256: string;
}

export interface ExperimentFoundationD19SourcePolicyEntry {
  fixture_slot: ExperimentFoundationD19SourcePolicySlot;
  dataset: ExperimentFoundationD19SourceDataset;
  policy: ExperimentFoundationD19SourcePolicy;
  provenance: ExperimentFoundationD19SourcePolicyProvenance;
}

export interface ExperimentFoundationD19SourcePolicyAttestation {
  schema_version: typeof EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_SCHEMA_VERSION;
  dataset_policies: ExperimentFoundationD19SourcePolicyEntry[];
}

export function parseExperimentFoundationD19SourcePolicy(
  value: unknown,
  options?: { now?: Date },
): ExperimentFoundationD19SourcePolicyAttestation;

export function digestExperimentFoundationD19SourcePolicy(value: unknown): string;
