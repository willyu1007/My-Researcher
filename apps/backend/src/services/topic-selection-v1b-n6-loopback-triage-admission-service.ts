import type {
  TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass,
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

export type TopicSelectionV1bN6LoopbackTriageSlotId = Extract<
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
  'n6_loopback_triage'
>;

export type TopicSelectionV1bN6LoopbackTriageAdmissionBlockerCode =
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_MISSING'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_PROMPT_IDENTITY_DRIFT'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_PROFILE_DRIFT'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_SOURCE_HASH_DRIFT'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N6_LOOPBACK_TRIAGE_ARTIFACT_LEGACY_UNVERIFIED';

export interface TopicSelectionV1bN6LoopbackTriageAdmissionIssue {
  code: TopicSelectionV1bN6LoopbackTriageAdmissionBlockerCode;
  message: string;
}

export interface TopicSelectionV1bN6LoopbackTriageAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1bN6LoopbackTriageSlotId;
  output_contract: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  normalized_payload_hash: string;
}

export interface TopicSelectionV1bN6LoopbackTriageAdmissionInput {
  artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
  expected: TopicSelectionV1bN6LoopbackTriageAdmissionExpectedIdentity;
  allow_fixture_replay: boolean;
}

export type TopicSelectionV1bN6LoopbackTriageAdmissionResult =
  | {
    admitted: true;
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    runtime_provenance_class: TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bN6LoopbackTriageAdmissionIssue;
  };

const PLACEHOLDER_HASHES = new Set([
  'a'.repeat(64),
  'b'.repeat(64),
  'c'.repeat(64),
  'd'.repeat(64),
  'e'.repeat(64),
  'f'.repeat(64),
  '0'.repeat(64),
]);

export class TopicSelectionV1bN6LoopbackTriageAdmissionService {
  admit(input: TopicSelectionV1bN6LoopbackTriageAdmissionInput):
    TopicSelectionV1bN6LoopbackTriageAdmissionResult {
    const artifact = input.artifact;
    if (artifact.slot_id !== input.expected.slot_id || artifact.output_contract !== input.expected.output_contract) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROFILE_DRIFT',
        'v1b N6 loopback triage artifact slot or output contract does not match the expected runtime slot.',
      );
    }

    if (
      artifact.normalized_output_hash !== input.expected.normalized_payload_hash
      || artifact.structured_output_hash !== input.expected.normalized_payload_hash
      || artifact.support_artifact_hash !== input.expected.normalized_payload_hash
    ) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'v1b N6 loopback triage artifact payload hash does not match the normalized output hash.',
      );
    }

    if (!artifact.runtime_provenance_class) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_MISSING',
        'v1b N6 loopback triage artifact is missing runtime provenance class.',
      );
    }

    if (artifact.runtime_provenance_class === 'legacy_unverified') {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_LEGACY_UNVERIFIED',
        'legacy_unverified loopback triage artifacts cannot enter promoted v1b N6 admission: the artifact has no runtime-verified v1b provenance (it predates promotion or was produced outside the v1b runtime). Re-run the triage through the v1b harness so it is admitted as runtime_verified — a v1a or legacy artifact cannot be reused directly; v1a outputs must re-enter via v1b N1 (create-intake-snapshot).',
      );
    }

    if (artifact.runtime_provenance_class === 'fixture_replay') {
      if (!input.allow_fixture_replay) {
        return this.block(
          'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID',
          'fixture_replay loopback triage artifacts are allowed only in test or acceptance fixture mode.',
        );
      }
      return {
        admitted: true,
        artifact,
        runtime_provenance_class: 'fixture_replay',
        warnings: ['fixture_replay_loopback_triage_admitted'],
      };
    }

    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'v1b N6 loopback triage artifact runtime provenance class is not recognized.',
      );
    }
    if (artifact.execution_mode !== 'codex_assisted' && artifact.execution_mode !== 'mocked_llm') {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'runtime_verified v1b N6 loopback triage artifacts must be generated by the N6 loopback triage runtime.',
      );
    }

    const profileDrift =
      artifact.context_policy_profile_id !== input.expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== input.expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== input.expected.context_policy_profile_hash
      || artifact.redaction_policy !== input.expected.redaction_policy;
    if (profileDrift) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROFILE_DRIFT',
        'v1b N6 loopback triage artifact profile identity does not match the current runtime profile.',
      );
    }

    if (
      artifact.prompt_variant_key !== input.expected.prompt_variant_key
      || !input.expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== input.expected.prompt_packet_hash
      || PLACEHOLDER_HASHES.has(artifact.prompt_packet_hash)
    ) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b N6 loopback triage artifact prompt identity does not match the current runtime prompt identity.',
      );
    }

    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N6 loopback triage artifact provenance must point to the runtime audit artifact.',
      );
    }

    if (
      artifact.runtime_invocation_context_hash !== input.expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
    ) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N6 loopback triage artifact runtime invocation or audit identity does not match current runtime context.',
      );
    }

    if (!this.sourceHashesMatch(artifact.source_hashes, input.expected.source_hashes)) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_SOURCE_HASH_DRIFT',
        'v1b N6 loopback triage artifact source hashes do not match the current failed draft lineage.',
      );
    }

    if (!this.compressionIdentityIsCoherent(artifact)) {
      return this.block(
        'N6_LOOPBACK_TRIAGE_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b N6 loopback triage artifact compression identity is incomplete.',
      );
    }

    return {
      admitted: true,
      artifact,
      runtime_provenance_class: 'runtime_verified',
      warnings: [],
    };
  }

  private sourceHashesMatch(actual: Record<string, string>, expected: Record<string, string>): boolean {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }
    return expectedKeys.every((key, index) => actualKeys[index] === key && actual[key] === expected[key]);
  }

  private refsEqual(
    left: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['provenance_ref'],
    right: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['provenance_ref'],
  ): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private compressionIdentityIsCoherent(
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): boolean {
    const hasReportRef = Boolean(artifact.compression_report_ref);
    const hasReportHash = Boolean(artifact.compression_report_hash);
    const hasCompressedContextHash = Boolean(artifact.compressed_context_hash);
    const hasAnyCompressionIdentity = hasReportRef || hasReportHash || hasCompressedContextHash;
    return !hasAnyCompressionIdentity || (hasReportRef && hasReportHash && hasCompressedContextHash);
  }

  private block(
    code: TopicSelectionV1bN6LoopbackTriageAdmissionBlockerCode,
    message: string,
  ): TopicSelectionV1bN6LoopbackTriageAdmissionResult {
    return {
      admitted: false,
      blocker: { code, message },
    };
  }
}
