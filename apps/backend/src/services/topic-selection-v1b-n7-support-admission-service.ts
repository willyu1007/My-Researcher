import type {
  TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass,
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

export type TopicSelectionV1bN7SupportSlotId = Extract<
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
  'n7_candidate_grouping' | 'n7_failed_trial_synthesis' | 'n7_n8_debate_admission_review'
>;

export type TopicSelectionV1bN7SupportAdmissionBlockerCode =
  | 'N7_SUPPORT_ARTIFACT_PROVENANCE_MISSING'
  | 'N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID'
  | 'N7_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT'
  | 'N7_SUPPORT_ARTIFACT_PROFILE_DRIFT'
  | 'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N7_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT'
  | 'N7_SUPPORT_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING'
  | 'N7_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED';

export interface TopicSelectionV1bN7SupportAdmissionIssue {
  code: TopicSelectionV1bN7SupportAdmissionBlockerCode;
  message: string;
}

export interface TopicSelectionV1bN7SupportAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1bN7SupportSlotId;
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

export interface TopicSelectionV1bN7SupportAdmissionInput {
  artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef | null;
  expected: TopicSelectionV1bN7SupportAdmissionExpectedIdentity;
  required: boolean;
  allow_fixture_replay: boolean;
}

export type TopicSelectionV1bN7SupportAdmissionResult =
  | {
    admitted: true;
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef | null;
    runtime_provenance_class: TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass | 'absent';
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bN7SupportAdmissionIssue;
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

export class TopicSelectionV1bN7SupportAdmissionService {
  admit(input: TopicSelectionV1bN7SupportAdmissionInput): TopicSelectionV1bN7SupportAdmissionResult {
    if (!input.artifact) {
      if (input.required) {
        return this.block(
          'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING',
          'Required v1b N7 support artifact is absent on its required path.',
        );
      }
      return {
        admitted: true,
        artifact: null,
        runtime_provenance_class: 'absent',
        warnings: ['support_absent'],
      };
    }

    const artifact = input.artifact;
    if (artifact.slot_id !== input.expected.slot_id || artifact.output_contract !== input.expected.output_contract) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROFILE_DRIFT',
        'v1b N7 support artifact slot or output contract does not match the expected runtime slot.',
      );
    }

    if (
      artifact.normalized_output_hash !== input.expected.normalized_payload_hash
      || artifact.structured_output_hash !== input.expected.normalized_payload_hash
      || artifact.support_artifact_hash !== input.expected.normalized_payload_hash
    ) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'v1b N7 support artifact payload hash does not match the normalized output hash.',
      );
    }

    if (!artifact.runtime_provenance_class) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROVENANCE_MISSING',
        'v1b N7 support artifact is missing runtime provenance class.',
      );
    }

    if (artifact.runtime_provenance_class === 'legacy_unverified') {
      return this.block(
        'N7_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED',
        'legacy_unverified support artifacts cannot enter promoted v1b N7 admission: the artifact has no runtime-verified v1b provenance (it predates promotion or was produced outside the v1b runtime). Re-produce it through the v1b harness so it is admitted as runtime_verified — a v1a or legacy artifact cannot be reused directly; v1a outputs must re-enter via v1b N1 (create-intake-snapshot).',
      );
    }

    if (artifact.runtime_provenance_class === 'fixture_replay') {
      if (!input.allow_fixture_replay) {
        return this.block(
          'N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
          'fixture_replay support artifacts are allowed only in test or acceptance fixture mode.',
        );
      }
      return {
        admitted: true,
        artifact,
        runtime_provenance_class: 'fixture_replay',
        warnings: ['fixture_replay_support_admitted'],
      };
    }

    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'v1b N7 support artifact runtime provenance class is not recognized.',
      );
    }
    if (artifact.execution_mode !== 'codex_assisted' && artifact.execution_mode !== 'mocked_llm') {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'runtime_verified v1b N7 support artifacts must be generated by the N7 support runtime.',
      );
    }

    const profileDrift =
      artifact.context_policy_profile_id !== input.expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== input.expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== input.expected.context_policy_profile_hash
      || artifact.redaction_policy !== input.expected.redaction_policy;
    if (profileDrift) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROFILE_DRIFT',
        'v1b N7 support artifact profile identity does not match the current runtime profile.',
      );
    }

    if (
      artifact.prompt_variant_key !== input.expected.prompt_variant_key
      || !input.expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== input.expected.prompt_packet_hash
      || PLACEHOLDER_HASHES.has(artifact.prompt_packet_hash)
    ) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b N7 support artifact prompt identity does not match the current runtime prompt identity.',
      );
    }

    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N7 runtime support artifact provenance must point to the runtime audit artifact.',
      );
    }

    if (
      artifact.runtime_invocation_context_hash !== input.expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
    ) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N7 support artifact runtime invocation or audit identity does not match current runtime context.',
      );
    }

    if (!this.sourceHashesMatch(artifact.source_hashes, input.expected.source_hashes)) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT',
        'v1b N7 support artifact source hashes do not match the current frozen input lineage.',
      );
    }

    if (!this.compressionIdentityIsCoherent(artifact)) {
      return this.block(
        'N7_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b N7 support artifact compression identity is incomplete.',
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
    code: TopicSelectionV1bN7SupportAdmissionBlockerCode,
    message: string,
  ): TopicSelectionV1bN7SupportAdmissionResult {
    return {
      admitted: false,
      blocker: { code, message },
    };
  }
}
