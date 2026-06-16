import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass,
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

export type TopicSelectionV1bEarlySemanticSupportSlotId = Extract<
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
  'n2_constraint_profile_semantic_support'
  | 'n3_readiness_classification'
  | 'n5_slice_selection_review'
>;

export type TopicSelectionV1bEarlySemanticSupportAdmissionBlockerCode =
  | 'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_MISSING'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_PROFILE_DRIFT'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'V1B_EARLY_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED';

export interface TopicSelectionV1bEarlySemanticSupportAdmissionIssue {
  code: TopicSelectionV1bEarlySemanticSupportAdmissionBlockerCode;
  message: string;
}

export interface TopicSelectionV1bEarlySemanticSupportAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1bEarlySemanticSupportSlotId;
  allowed_effect: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['allowed_effect'];
  output_contract: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  prompt_variant_key: string;
  prompt_packet_hash: string | null;
  runtime_invocation_context_hash: string;
  run_mode: TopicSelectionAgentRunMode;
  redaction_policy: string;
  source_hashes: Record<string, string>;
  normalized_payload_hash: string;
}

export interface TopicSelectionV1bEarlySemanticSupportAdmissionInput {
  artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
  expected: TopicSelectionV1bEarlySemanticSupportAdmissionExpectedIdentity;
  allow_fixture_replay: boolean;
}

export type TopicSelectionV1bEarlySemanticSupportAdmissionResult =
  | {
    admitted: true;
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    runtime_provenance_class: TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bEarlySemanticSupportAdmissionIssue;
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

export class TopicSelectionV1bEarlySemanticSupportAdmissionService {
  admit(
    input: TopicSelectionV1bEarlySemanticSupportAdmissionInput,
  ): TopicSelectionV1bEarlySemanticSupportAdmissionResult {
    const artifact = input.artifact;
    if (
      artifact.slot_id !== input.expected.slot_id
      || artifact.allowed_effect !== input.expected.allowed_effect
      || artifact.output_contract !== input.expected.output_contract
    ) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROFILE_DRIFT',
        'v1b early semantic support artifact slot, effect, or output contract does not match the expected runtime slot.',
      );
    }

    if (
      artifact.normalized_output_hash !== input.expected.normalized_payload_hash
      || artifact.structured_output_hash !== input.expected.normalized_payload_hash
      || artifact.support_artifact_hash !== input.expected.normalized_payload_hash
    ) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'v1b early semantic support artifact payload hash does not match the normalized output hash.',
      );
    }

    if (!artifact.runtime_provenance_class) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_MISSING',
        'v1b early semantic support artifact is missing runtime provenance class.',
      );
    }

    if (artifact.runtime_provenance_class === 'legacy_unverified') {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED',
        'legacy_unverified early semantic support artifacts cannot enter promoted v1b N2/N3/N5 admission: the artifact has no runtime-verified v1b provenance (it predates promotion or was produced outside the v1b runtime). Re-produce it through the v1b harness so it is admitted as runtime_verified — a v1a or legacy artifact cannot be reused directly; v1a outputs must re-enter via v1b N1 (create-intake-snapshot).',
      );
    }

    const fixtureReplay = artifact.runtime_provenance_class === 'fixture_replay';
    const runtimeVerified = artifact.runtime_provenance_class === 'runtime_verified';
    if (fixtureReplay && !input.allow_fixture_replay) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'fixture_replay early semantic support artifacts are allowed only in test or acceptance fixture mode.',
      );
    }
    if (!fixtureReplay && !runtimeVerified) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'v1b early semantic support artifact runtime provenance class is not recognized.',
      );
    }
    if (artifact.execution_mode !== 'codex_assisted' && artifact.execution_mode !== 'mocked_llm') {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'runtime_verified v1b early semantic support artifacts must be generated by the early semantic runtime.',
      );
    }
    if (artifact.run_mode !== input.expected.run_mode) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b early semantic support artifact run_mode does not match the current runtime admission.',
      );
    }

    const profileDrift =
      artifact.context_policy_profile_id !== input.expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== input.expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== input.expected.context_policy_profile_hash
      || artifact.redaction_policy !== input.expected.redaction_policy;
    if (profileDrift) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROFILE_DRIFT',
        'v1b early semantic support artifact profile identity does not match the current runtime profile.',
      );
    }

    if (
      artifact.prompt_variant_key !== input.expected.prompt_variant_key
      || !input.expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== input.expected.prompt_packet_hash
      || PLACEHOLDER_HASHES.has(artifact.prompt_packet_hash)
    ) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b early semantic support artifact prompt identity does not match the current runtime prompt identity.',
      );
    }

    if (runtimeVerified && (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    )) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b early semantic support artifact provenance must point to the runtime audit artifact.',
      );
    }

    if (artifact.runtime_invocation_context_hash !== input.expected.runtime_invocation_context_hash) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b early semantic support artifact runtime invocation identity does not match current runtime context.',
      );
    }

    if (runtimeVerified && (!artifact.runtime_audit_ref || !artifact.runtime_audit_hash)) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b early semantic support artifact runtime audit identity is incomplete.',
      );
    }

    if (!artifact.source_hashes || !this.sourceHashesMatch(artifact.source_hashes, input.expected.source_hashes)) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT',
        'v1b early semantic support artifact source hashes do not match current frozen lineage.',
      );
    }

    if (!this.compressionIdentityIsCoherent(artifact)) {
      return this.block(
        'V1B_EARLY_SUPPORT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b early semantic support artifact compression identity is incomplete.',
      );
    }

    return {
      admitted: true,
      artifact,
      runtime_provenance_class: artifact.runtime_provenance_class,
      warnings: fixtureReplay ? ['fixture_replay_v1b_early_support_admitted'] : [],
    };
  }

  private sourceHashesMatch(actual: Record<string, string>, expected: Record<string, string>): boolean {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }
    return expectedKeys.every((key, index) => key === actualKeys[index] && actual[key] === expected[key]);
  }

  private compressionIdentityIsCoherent(artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef): boolean {
    const hasReportRef = artifact.compression_report_ref !== null;
    const hasReportHash = artifact.compression_report_hash !== null;
    const hasContextHash = artifact.compressed_context_hash !== null;
    return (hasReportRef === hasReportHash && hasReportHash === hasContextHash);
  }

  private refsEqual(
    left: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['provenance_ref'] | null,
    right: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['provenance_ref'] | null,
  ): boolean {
    if (!left || !right) return false;
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.title_card_id ?? null) === (right.title_card_id ?? null)
      && (left.version_id ?? null) === (right.version_id ?? null);
  }

  private block(
    code: TopicSelectionV1bEarlySemanticSupportAdmissionBlockerCode,
    message: string,
  ): TopicSelectionV1bEarlySemanticSupportAdmissionResult {
    return {
      admitted: false,
      blocker: { code, message },
    };
  }
}
