import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
  type TopicSelectionV1cDownstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionPromotionBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionV1cPaperProjectBridgeRepository } from '../repositories/in-memory-topic-selection-v1c-paper-project-bridge-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  createTopicSelectionV1cAcceptanceIdFactory,
  createTopicSelectionV1cPromotionBridgeHandoffFixture,
  topicSelectionV1cAcceptanceRef,
  TopicSelectionV1cAcceptancePromotionBridgeHandoffProvider,
} from './topic-selection-v1c-acceptance-scenario-fixtures.js';
import {
  TopicSelectionV1cN6FeedbackNormalizationAdmissionService,
  type TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact,
  type TopicSelectionV1cN6FeedbackNormalizationSourceInput,
} from './topic-selection-v1c-n6-feedback-normalization-admission-service.js';
import {
  TopicSelectionV1cN6FeedbackNormalizationRuntimeService,
} from './topic-selection-v1c-n6-feedback-normalization-runtime-service.js';
import {
  TopicSelectionV1cPaperProjectBridgeService,
} from './topic-selection-v1c-paper-project-bridge-service.js';

const NOW = TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP;

async function makeSubject(options: {
  promotionBridgeHandoff?: TopicSelectionPromotionBridgeHandoff;
} = {}) {
  const promotionBridgeHandoff = options.promotionBridgeHandoff
    ?? createTopicSelectionV1cPromotionBridgeHandoffFixture();
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => NOW,
  });
  const bridgeService = new TopicSelectionV1cPaperProjectBridgeService({
    repository: new InMemoryTopicSelectionV1cPaperProjectBridgeRepository(),
    humanPromotionDecisionService: new TopicSelectionV1cAcceptancePromotionBridgeHandoffProvider(
      promotionBridgeHandoff,
    ),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => NOW,
  });
  const bridge = await bridgeService.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
    workspace_id: 'workspace_001',
  });
  const runtime = new TopicSelectionV1cN6FeedbackNormalizationRuntimeService(controlPlane);
  // The runtime service is also the deterministic expected-identity builder the
  // admission service depends on, so admission identity is checked against the
  // exact runtime lineage that minted the candidate artifact.
  const admission = new TopicSelectionV1cN6FeedbackNormalizationAdmissionService(runtime);
  return { admission, bridge, runtime };
}

function makeSource(
  handoff: TopicSelectionPaperProjectBridgeHandoff,
): TopicSelectionV1cN6FeedbackNormalizationSourceInput {
  return {
    paper_project_bridge_id: handoff.paper_project_bridge_id,
    workspace_id: 'workspace_001',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: topicSelectionV1cAcceptanceRef('reviewer_check', 'reviewer_check_001'),
    source_feedback_refs: [topicSelectionV1cAcceptanceRef('review_comment', 'review_comment_001')],
    observed_blocker_refs: [topicSelectionV1cAcceptanceRef('topic_selection_blocker', 'blocker_001')],
    artifact_refs: [topicSelectionV1cAcceptanceRef('artifact_ref', 'artifact_feedback_001')],
    raw_feedback_text:
      'Reviewer check invalidates the original validated need; update the need before continuing.',
    policy_version_id: 'policy_v1',
    created_by: 'system',
  };
}

function findOptionalRef(
  handoff: TopicSelectionPaperProjectBridgeHandoff,
  refType: string,
): TopicSelectionFunctionalRef | null {
  return handoff.source_refs.find((item) => item.ref_type === refType) ?? null;
}

function compactRefs(
  refs: Array<TopicSelectionFunctionalRef | null | undefined>,
): TopicSelectionFunctionalRef[] {
  return refs.filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref));
}

function candidateOutput(
  handoff: TopicSelectionPaperProjectBridgeHandoff,
  source: TopicSelectionV1cN6FeedbackNormalizationSourceInput,
  overrides: Partial<TopicSelectionV1cDownstreamFeedbackCandidate> = {},
): TopicSelectionV1cDownstreamFeedbackCandidate {
  const affectedRef = findOptionalRef(handoff, 'validated_need');
  return {
    schema_version: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
    paper_project_bridge_id: handoff.paper_project_bridge_id,
    workspace_id: 'workspace_001',
    downstream_source_kind: source.downstream_source_kind,
    downstream_source_ref: source.downstream_source_ref,
    source_feedback_refs: source.source_feedback_refs ?? [],
    observed_blocker_refs: source.observed_blocker_refs ?? [],
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary: 'The downstream reviewer check invalidates the currently promoted need.',
    required_action: 'Recheck the validated need before continuing downstream work.',
    artifact_refs: source.artifact_refs ?? [],
    feedback_payload: {
      normalized_from: 'reviewer_check',
      raw_feedback_hash_hint: 'raw_feedback_hash_hint_001',
    },
    normalization_hints: {
      requires_recheck_hint: true,
      loopback_target_hint: 'validated_need',
      affected_ref_hint: affectedRef,
      reason_codes: ['need_invalidated'],
    },
    cited_refs: compactRefs([
      handoff.paper_project_bridge_ref,
      source.downstream_source_ref,
      affectedRef,
    ]),
    no_upstream_mutation_confirmed: true,
    ...overrides,
  };
}

async function mintCandidate(
  runtime: TopicSelectionV1cN6FeedbackNormalizationRuntimeService,
  handoff: TopicSelectionPaperProjectBridgeHandoff,
  source: TopicSelectionV1cN6FeedbackNormalizationSourceInput,
  options: {
    workflowRunId?: string;
    nodeAttemptId?: string;
    overrides?: Partial<TopicSelectionV1cDownstreamFeedbackCandidate>;
  } = {},
): Promise<{
  candidate_artifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact;
  structured_output: TopicSelectionV1cDownstreamFeedbackCandidate;
}> {
  const generated = await runtime.generateCandidate({
    bridge_handoff: handoff,
    source,
    workflow_run_id: options.workflowRunId ?? 'workflow_run_n6_admission_001',
    node_attempt_id: options.nodeAttemptId ?? 'node_attempt_n6_admission_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(handoff, source, options.overrides),
      fixture_id: 'fixture_n6_admission_candidate_001',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N6 candidate generation to succeed before admission.');
  }
  return {
    candidate_artifact: generated.candidate_artifact,
    structured_output: generated.structured_output,
  };
}

test('v1c N6 admission accepts a runtime-verified candidate and emits a record-only feedback create input', async () => {
  const { admission, bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const { candidate_artifact, structured_output } = await mintCandidate(runtime, bridge.handoff, source);

  // Sanity: admission is validating against a genuinely runtime-verified artifact.
  assert.equal(candidate_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(candidate_artifact.allowed_effect, 'feedback_candidate_only');

  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact,
    candidate: structured_output,
  });

  assert.equal(admitted.admitted, true);
  if (!admitted.admitted) {
    throw new Error('Expected runtime-verified candidate to be admitted.');
  }
  assert.equal(admitted.admission_identity.schema_version,
    'topic-selection-v1c-n6-feedback-normalization-admission-identity-v1');
  assert.equal(admitted.admission_identity.admission_policy_id,
    'topic-selection.v1c.n6.feedback-normalization.admission.v1');
  assert.equal(admitted.admission_identity.allowed_effect, 'record_only_feedback_candidate');
  assert.equal(admitted.admission_identity.feedback_signal, 'need_invalidated');
  // Deterministic feedback policy routing is surfaced on the identity.
  assert.equal(admitted.admission_identity.expected_loopback_target, 'validated_need');
  assert.equal(admitted.admission_identity.expected_affected_ref.ref_type, 'validated_need');
  // The create input is record-only and carries the candidate fields verbatim.
  assert.equal(admitted.create_input.paper_project_bridge_id, bridge.handoff.paper_project_bridge_id);
  assert.equal(admitted.create_input.feedback_signal, 'need_invalidated');
  assert.equal(admitted.create_input.severity, 'critical');
  assert.equal(admitted.create_input.required_action,
    'Recheck the validated need before continuing downstream work.');
  assert.equal(admitted.create_input.created_by, 'system');
  assert.equal(admitted.create_input.policy_version_id, 'policy_v1');
  // admission_identity_hash is a real sha256 over the identity, not a placeholder.
  assert.match(admitted.admission_identity_hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(admitted.warnings, []);
});

test('v1c N6 admission rejects a candidate artifact whose runtime provenance class is not runtime_verified', async () => {
  const { admission, bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const { candidate_artifact, structured_output } = await mintCandidate(runtime, bridge.handoff, source);

  // Downgrade the provenance class on the otherwise-valid runtime artifact. This is
  // the admission layer's own provenance guard (analogous to a legacy_unverified reject):
  // a structurally complete candidate that does not carry runtime-verified provenance
  // must never be admitted.
  const unverifiedArtifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact = {
    ...candidate_artifact,
    runtime_provenance_class: 'legacy_unverified' as never,
  };

  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: unverifiedArtifact,
    candidate: structured_output,
  });

  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected a non-runtime-verified candidate artifact to be rejected.');
  }
  assert.equal(admitted.blocker.code, 'N6_FEEDBACK_NORMALIZATION_ARTIFACT_RUNTIME_CONTEXT_DRIFT');
});

test('v1c N6 admission rejects a candidate artifact whose payload hash does not match the normalized output', async () => {
  const { admission, bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const { candidate_artifact, structured_output } = await mintCandidate(runtime, bridge.handoff, source);

  // Tamper only with the recorded payload hash, leaving the candidate body intact.
  // The admission service recomputes the normalized payload hash from the candidate
  // and must detect the artifact/payload hash drift.
  const tamperedArtifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact = {
    ...candidate_artifact,
    normalized_output_hash: `${candidate_artifact.normalized_output_hash}_tampered`,
  };

  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: tamperedArtifact,
    candidate: structured_output,
  });

  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected payload hash drift to be rejected.');
  }
  assert.equal(admitted.blocker.code, 'N6_FEEDBACK_NORMALIZATION_ARTIFACT_PAYLOAD_HASH_MISMATCH');
});

test('v1c N6 admission blocks a candidate carrying a forbidden authority field', async () => {
  const { admission, bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  // N6 is record-only ingress: a candidate must never smuggle a workflow-authority
  // field (here recheck_request) inside its record-only feedback payload.
  const { candidate_artifact, structured_output } = await mintCandidate(runtime, bridge.handoff, source, {
    overrides: {
      feedback_payload: {
        recheck_request: {
          downstream_recheck_request_id: 'forbidden_recheck_request_001',
        },
      },
    },
  });

  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact,
    candidate: structured_output,
  });

  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected a forbidden authority field to block admission.');
  }
  assert.equal(admitted.blocker.code, 'N6_FEEDBACK_NORMALIZATION_FORBIDDEN_AUTHORITY_FIELD');
  assert.equal(admitted.blocker.details?.forbidden_key, 'recheck_request');
});
