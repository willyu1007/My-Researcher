import {
  digestExperimentFoundationD19SourcePolicy,
  EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
  parseExperimentFoundationD19SourcePolicy,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-d19-source-policy';
import type {
  ExperimentFoundationD19SourceDataset as PortableSourceDataset,
  ExperimentFoundationD19SourcePolicy as PortableSourcePolicy,
  ExperimentFoundationD19SourcePolicyAttestation as PortableSourcePolicyAttestation,
  ExperimentFoundationD19SourcePolicyEntry as PortableSourcePolicyEntry,
  ExperimentFoundationD19SourcePolicyProvenance as PortableSourcePolicyProvenance,
  ExperimentFoundationD19SourcePolicySlot as PortableSourcePolicySlot,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-d19-source-policy';

export { EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST };

export type ExperimentFoundationD19SourcePolicySlot = PortableSourcePolicySlot;
export type ExperimentFoundationD19SourceDataset = PortableSourceDataset;
export type ExperimentFoundationD19SourcePolicy = PortableSourcePolicy;
export type ExperimentFoundationD19SourcePolicyProvenance =
  PortableSourcePolicyProvenance;
export type ExperimentFoundationD19SourcePolicyEntry = PortableSourcePolicyEntry;
export type ExperimentFoundationD19SourcePolicyAttestation =
  PortableSourcePolicyAttestation;

export function parseExperimentFoundationD19SourcePolicyAttestation(
  value: unknown,
  options: { now?: Date } = {},
): ExperimentFoundationD19SourcePolicyAttestation {
  return parseExperimentFoundationD19SourcePolicy(value, options);
}

export function digestExperimentFoundationD19SourcePolicyAttestation(
  attestation: ExperimentFoundationD19SourcePolicyAttestation,
): string {
  return digestExperimentFoundationD19SourcePolicy(attestation);
}

export function requireExperimentFoundationD19SourcePolicyEntry(
  attestation: ExperimentFoundationD19SourcePolicyAttestation,
  slot: ExperimentFoundationD19SourcePolicySlot,
): ExperimentFoundationD19SourcePolicyEntry {
  const entry = attestation.dataset_policies.find((candidate) => (
    candidate.fixture_slot === slot
  ));
  if (!entry) throw new Error(`Missing D-19 source-policy slot: ${slot}`);
  return entry;
}
