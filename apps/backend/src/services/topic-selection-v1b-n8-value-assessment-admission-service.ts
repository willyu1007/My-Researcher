import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass,
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

export type TopicSelectionV1bN8ValueAssessmentSlotId = Extract<
  TopicSelectionV1bWorkflowHarnessSemanticSlotId,
  'n8_value_assessment_draft'
>;

export type TopicSelectionV1bN8ValueAssessmentAdmissionBlockerCode =
  | 'N8_DRAFT_ARTIFACT_PROVENANCE_MISSING'
  | 'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID'
  | 'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT'
  | 'N8_DRAFT_ARTIFACT_PROFILE_DRIFT'
  | 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT'
  | 'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT'
  | 'N8_DRAFT_ARTIFACT_PAYLOAD_HASH_MISMATCH'
  | 'N8_DRAFT_ARTIFACT_LEGACY_UNVERIFIED';

export interface TopicSelectionV1bN8ValueAssessmentAdmissionIssue {
  code: TopicSelectionV1bN8ValueAssessmentAdmissionBlockerCode;
  message: string;
}

export interface TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity {
  slot_id: TopicSelectionV1bN8ValueAssessmentSlotId;
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

export interface TopicSelectionV1bN8ValueAssessmentAdmissionInput {
  artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
  expected: TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity;
  allow_fixture_replay: boolean;
}

export type TopicSelectionV1bN8ValueAssessmentAdmissionResult =
  | {
    admitted: true;
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    runtime_provenance_class: TopicSelectionV1bWorkflowHarnessRuntimeProvenanceClass;
    warnings: string[];
  }
  | {
    admitted: false;
    blocker: TopicSelectionV1bN8ValueAssessmentAdmissionIssue;
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

export class TopicSelectionV1bN8ValueAssessmentAdmissionService {
  admit(
    input: TopicSelectionV1bN8ValueAssessmentAdmissionInput,
  ): TopicSelectionV1bN8ValueAssessmentAdmissionResult {
    const artifact = input.artifact;
    if (
      artifact.slot_id !== input.expected.slot_id
      || artifact.allowed_effect !== 'model_draft_for_gate'
      || artifact.output_contract !== input.expected.output_contract
    ) {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROFILE_DRIFT',
        'v1b N8 value draft artifact slot, effect, or output contract does not match the expected runtime slot.',
      );
    }

    if (
      artifact.normalized_output_hash !== input.expected.normalized_payload_hash
      || artifact.structured_output_hash !== input.expected.normalized_payload_hash
      || artifact.support_artifact_hash !== input.expected.normalized_payload_hash
    ) {
      return this.block(
        'N8_DRAFT_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        'v1b N8 value draft artifact payload hash does not match the normalized output hash.',
      );
    }

    if (!artifact.runtime_provenance_class) {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROVENANCE_MISSING',
        'v1b N8 value draft artifact is missing runtime provenance class.',
      );
    }

    if (artifact.runtime_provenance_class === 'legacy_unverified') {
      return this.block(
        'N8_DRAFT_ARTIFACT_LEGACY_UNVERIFIED',
        'legacy_unverified value draft artifacts cannot enter promoted v1b N8 admission: the draft has no runtime-verified v1b provenance (it predates promotion or was produced outside the v1b runtime). Re-run N8 through the v1b harness so the draft is admitted as runtime_verified — a v1a or legacy artifact cannot be reused directly; v1a outputs must re-enter via v1b N1 (create-intake-snapshot).',
      );
    }

    if (artifact.runtime_provenance_class === 'fixture_replay') {
      if (!input.allow_fixture_replay) {
        return this.block(
          'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
          'fixture_replay N8 value draft artifacts are allowed only in test or acceptance fixture mode.',
        );
      }
      return {
        admitted: true,
        artifact,
        runtime_provenance_class: 'fixture_replay',
        warnings: ['fixture_replay_n8_value_draft_admitted'],
      };
    }

    if (artifact.runtime_provenance_class !== 'runtime_verified') {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'v1b N8 value draft artifact runtime provenance class is not recognized.',
      );
    }
    if (artifact.execution_mode !== 'codex_assisted' && artifact.execution_mode !== 'mocked_llm') {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        'runtime_verified v1b N8 value draft artifacts must be generated by the N8 value runtime.',
      );
    }
    if (artifact.run_mode !== input.expected.run_mode) {
      return this.block(
        'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N8 value draft artifact run_mode does not match the current runtime admission.',
      );
    }

    const profileDrift =
      artifact.context_policy_profile_id !== input.expected.context_policy_profile_id
      || artifact.context_policy_profile_version !== input.expected.context_policy_profile_version
      || artifact.context_policy_profile_hash !== input.expected.context_policy_profile_hash
      || artifact.redaction_policy !== input.expected.redaction_policy;
    if (profileDrift) {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROFILE_DRIFT',
        'v1b N8 value draft artifact profile identity does not match the current runtime profile.',
      );
    }

    if (
      artifact.prompt_variant_key !== input.expected.prompt_variant_key
      || !input.expected.prompt_packet_hash
      || artifact.prompt_packet_hash !== input.expected.prompt_packet_hash
      || PLACEHOLDER_HASHES.has(artifact.prompt_packet_hash)
    ) {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b N8 value draft artifact prompt identity does not match the current runtime prompt identity.',
      );
    }

    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.block(
        'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N8 runtime value draft artifact provenance must point to the runtime audit artifact.',
      );
    }

    if (
      artifact.runtime_invocation_context_hash !== input.expected.runtime_invocation_context_hash
      || !artifact.runtime_audit_ref
      || !artifact.runtime_audit_hash
    ) {
      return this.block(
        'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
        'v1b N8 value draft artifact runtime invocation or audit identity does not match current runtime context.',
      );
    }

    if (!this.sourceHashesMatch(artifact.source_hashes, input.expected.source_hashes)) {
      return this.block(
        'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT',
        'v1b N8 value draft artifact source hashes do not match the current frozen input lineage.',
      );
    }

    if (!this.compressionIdentityIsCoherent(artifact)) {
      return this.block(
        'N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        'v1b N8 value draft artifact compression identity is incomplete.',
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
    code: TopicSelectionV1bN8ValueAssessmentAdmissionBlockerCode,
    message: string,
  ): TopicSelectionV1bN8ValueAssessmentAdmissionResult {
    return {
      admitted: false,
      blocker: { code, message },
    };
  }
}
