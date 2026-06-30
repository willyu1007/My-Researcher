import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
  type TopicSelectionV1cDownstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionPromotionBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository } from '../repositories/in-memory-topic-selection-v1c-downstream-feedback-recheck-repository.js';
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
  TopicSelectionV1cDownstreamFeedbackRecheckService,
  type TopicSelectionDownstreamRecheckSink,
} from './topic-selection-v1c-downstream-feedback-recheck-service.js';
import {
  TopicSelectionV1cN6FeedbackNormalizationAdmissionService,
  type TopicSelectionV1cN6FeedbackNormalizationSourceInput,
} from './topic-selection-v1c-n6-feedback-normalization-admission-service.js';
import {
  TopicSelectionV1cN6FeedbackNormalizationRuntimeService,
  buildV1cN6FeedbackNormalizationSystemContent,
} from './topic-selection-v1c-n6-feedback-normalization-runtime-service.js';
import {
  sha256Text,
} from './literature-content-processing-utils.js';
import {
  TopicSelectionV1cPaperProjectBridgeService,
} from './topic-selection-v1c-paper-project-bridge-service.js';

const NOW = TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP;

class BridgeHandoffProvider {
  constructor(private readonly handoff: TopicSelectionPaperProjectBridgeHandoff) {}

  async getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff> {
    assert.equal(paperProjectBridgeId, this.handoff.paper_project_bridge_id);
    return this.handoff;
  }
}

class RecordingRecheckSink implements TopicSelectionDownstreamRecheckSink {
  readonly calls: Parameters<TopicSelectionDownstreamRecheckSink['recordDownstreamFeedback']>[0][] = [];

  async recordDownstreamFeedback(
    input: Parameters<TopicSelectionDownstreamRecheckSink['recordDownstreamFeedback']>[0],
  ): ReturnType<TopicSelectionDownstreamRecheckSink['recordDownstreamFeedback']> {
    this.calls.push(input);
    return {
      event: {
        recheck_event_id: `recheck_event_${this.calls.length}`,
        title_card_id: input.title_card_id ?? input.source_ref.title_card_id ?? null,
        severity: input.severity ?? 'blocking',
      } as TopicSelectionRecheckEventRecord,
      impact: {
        recheck_impact_id: `recheck_impact_${this.calls.length}`,
        title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? null,
        impact_level: input.impact_level ?? 'recheck_required',
      } as TopicSelectionRecheckImpactRecord,
      queue_item: {
        decision_work_queue_item_id: `decision_work_queue_item_${this.calls.length}`,
        title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? null,
        queue_item_type: 'downstream_feedback',
      } as TopicSelectionDecisionWorkQueueItemRecord,
    };
  }
}

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
  const admission = new TopicSelectionV1cN6FeedbackNormalizationAdmissionService(runtime);
  return {
    admission,
    bridge,
    bridgeService,
    controlPlane,
    runtime,
  };
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

test('v1c N6 runtime emits record-only candidate and admission prepares deterministic feedback input', async () => {
  const { admission, bridge, bridgeService, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const generated = await runtime.generateCandidate({
    bridge_handoff: bridge.handoff,
    source,
    workflow_run_id: 'workflow_run_n6_feedback_001',
    node_attempt_id: 'node_attempt_n6_feedback_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(bridge.handoff, source),
      fixture_id: 'fixture_n6_feedback_candidate_001',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N6 feedback normalization candidate generation to succeed.');
  }
  assert.equal(generated.candidate_artifact.allowed_effect, 'feedback_candidate_only');
  assert.equal(generated.candidate_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(generated.candidate_artifact.output_contract, 'TopicSelectionV1cDownstreamFeedbackCandidate@v1');
  assert.equal(generated.structured_output.no_upstream_mutation_confirmed, true);

  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: generated.candidate_artifact,
    candidate: generated.structured_output,
  });
  assert.equal(admitted.admitted, true);
  if (!admitted.admitted) {
    throw new Error('Expected N6 candidate admission to pass.');
  }
  assert.equal(admitted.admission_identity.allowed_effect, 'record_only_feedback_candidate');
  assert.equal(admitted.create_input.feedback_signal, 'need_invalidated');
  assert.equal(admitted.create_input.required_action, 'Recheck the validated need before continuing downstream work.');

  const recheckSink = new RecordingRecheckSink();
  const feedbackRepository = new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository();
  const feedbackService = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository: feedbackRepository,
    paperProjectBridgeService: new BridgeHandoffProvider(bridge.handoff),
    recheckRiskMemoryService: recheckSink,
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => NOW,
  });
  const first = await feedbackService.recordDownstreamTopicFeedback(admitted.create_input);
  const second = await feedbackService.recordDownstreamTopicFeedback(admitted.create_input);
  const storedBridge = await bridgeService.getPaperProjectBridge(bridge.handoff.paper_project_bridge_id);

  assert.equal(first.classification.loopback_target, 'validated_need');
  assert.equal(second.downstream_topic_feedback.downstream_topic_feedback_id, first.downstream_topic_feedback.downstream_topic_feedback_id);
  assert.equal(recheckSink.calls.length, 1);
  assert.equal(storedBridge.bridge_payload_hash, bridge.paper_project_bridge.bridge_payload_hash);
  assert.equal(storedBridge.paper_project_intake_ref, null);
  assert.equal(storedBridge.target_paper_project_ref, null);
});

test('v1c N6 admission blocks forbidden authority fields carried inside feedback payload', async () => {
  const { admission, bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const generated = await runtime.generateCandidate({
    bridge_handoff: bridge.handoff,
    source,
    workflow_run_id: 'workflow_run_n6_feedback_forbidden_001',
    node_attempt_id: 'node_attempt_n6_feedback_forbidden_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(bridge.handoff, source, {
        feedback_payload: {
          recheck_request: {
            downstream_recheck_request_id: 'forbidden_recheck_request_001',
          },
        },
      }),
      fixture_id: 'fixture_n6_feedback_candidate_forbidden_001',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected schema-valid forbidden-payload candidate generation to succeed before admission.');
  }
  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: generated.candidate_artifact,
    candidate: generated.structured_output,
  });

  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected forbidden authority payload to block.');
  }
  assert.equal(admitted.blocker.code, 'N6_FEEDBACK_NORMALIZATION_FORBIDDEN_AUTHORITY_FIELD');
});

test('v1c N6 admission blocks source mismatch and missing no-upstream-mutation boundary', async () => {
  const { admission, bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const generated = await runtime.generateCandidate({
    bridge_handoff: bridge.handoff,
    source,
    workflow_run_id: 'workflow_run_n6_feedback_source_mismatch_001',
    node_attempt_id: 'node_attempt_n6_feedback_source_mismatch_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(bridge.handoff, source, {
        downstream_source_ref: topicSelectionV1cAcceptanceRef('reviewer_check', 'reviewer_check_other'),
        no_upstream_mutation_confirmed: false,
      }),
      fixture_id: 'fixture_n6_feedback_candidate_source_mismatch_001',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected schema-valid source-mismatch candidate generation to succeed before admission.');
  }
  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: generated.candidate_artifact,
    candidate: generated.structured_output,
  });

  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected source mismatch to block.');
  }
  assert.equal(admitted.blocker.code, 'N6_FEEDBACK_NORMALIZATION_SOURCE_MISMATCH');

  const boundaryGenerated = await runtime.generateCandidate({
    bridge_handoff: bridge.handoff,
    source,
    workflow_run_id: 'workflow_run_n6_feedback_boundary_missing_001',
    node_attempt_id: 'node_attempt_n6_feedback_boundary_missing_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(bridge.handoff, source, {
        no_upstream_mutation_confirmed: false,
      }),
      fixture_id: 'fixture_n6_feedback_candidate_boundary_missing_001',
    },
    created_by: 'system',
  });
  assert.equal(boundaryGenerated.status, 'succeeded');
  if (boundaryGenerated.status !== 'succeeded') {
    throw new Error('Expected schema-valid no-mutation-boundary candidate generation to succeed before admission.');
  }
  const boundaryOnly = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: boundaryGenerated.candidate_artifact,
    candidate: boundaryGenerated.structured_output,
  });
  assert.equal(boundaryOnly.admitted, false);
  if (boundaryOnly.admitted) {
    throw new Error('Expected missing no-upstream-mutation boundary to block.');
  }
  assert.equal(boundaryOnly.blocker.code, 'N6_FEEDBACK_NORMALIZATION_UPSTREAM_MUTATION_BOUNDARY_MISSING');
});

test('v1c N6 admission shares downstream policy and blocks missing affected lineage before recheck', async () => {
  const promotionBridgeHandoff = createTopicSelectionV1cPromotionBridgeHandoffFixture();
  const sourceRefsWithoutNeed = promotionBridgeHandoff.source_refs.filter((sourceRef) =>
    sourceRef.ref_type !== 'validated_need');
  promotionBridgeHandoff.source_refs = sourceRefsWithoutNeed;
  const { admission, bridge, runtime } = await makeSubject({ promotionBridgeHandoff });
  const source = makeSource(bridge.handoff);

  const generated = await runtime.generateCandidate({
    bridge_handoff: bridge.handoff,
    source,
    workflow_run_id: 'workflow_run_n6_feedback_missing_affected_ref_001',
    node_attempt_id: 'node_attempt_n6_feedback_missing_affected_ref_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(bridge.handoff, source, {
        normalization_hints: {
          requires_recheck_hint: true,
          loopback_target_hint: 'validated_need',
          affected_ref_hint: null,
          reason_codes: ['need_invalidated'],
        },
      }),
      fixture_id: 'fixture_n6_feedback_candidate_missing_affected_ref_001',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected schema-valid missing-affected-lineage candidate to reach admission.');
  }
  const admitted = admission.admit({
    bridge_handoff: bridge.handoff,
    source,
    candidate_artifact: generated.candidate_artifact,
    candidate: generated.structured_output,
  });
  const recheckSink = new RecordingRecheckSink();

  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected missing affected lineage to block before deterministic recheck.');
  }
  assert.equal(admitted.blocker.code, 'N6_FEEDBACK_NORMALIZATION_AFFECTED_REF_UNRESOLVED');
  assert.equal(admitted.blocker.details?.error_code, 'GATE_CONSTRAINT_FAILED');
  assert.equal(recheckSink.calls.length, 0);
});

test('v1c N6 runtime compression quality gate blocks dropped feedback facts before output', async () => {
  const { bridge, runtime } = await makeSubject();
  const source = makeSource(bridge.handoff);
  const generated = await runtime.generateCandidate({
    bridge_handoff: bridge.handoff,
    source,
    workflow_run_id: 'workflow_run_n6_feedback_compression_001',
    node_attempt_id: 'node_attempt_n6_feedback_compression_001',
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 120_000,
      estimated_input_tokens_after_compression_override: 10_000,
    },
    compression_attempt: {
      compression_executor_kind: 'deterministic_structural',
      compressed_context: {
        summary: 'Intentionally incomplete v1c N6 compressed feedback context.',
        raw_provider_logs: ['provider request body must never persist in compressed runtime context'],
      },
      summary: {
        preserved_fact_kinds: ['paper_project_bridge'],
      },
      compressed_preserved_facts: {
        paper_project_bridge: [bridge.handoff.bridge_payload_hash],
      },
    },
    codex_response: {
      output: candidateOutput(bridge.handoff, source),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'blocked');
  assert.equal(generated.invocation_result.status, 'blocked');
  assert.equal(generated.invocation_result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_FEEDBACK_SIGNAL_DROPPED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_REQUIRED_ACTION_DROPPED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_ALLOWED_REF_MANIFEST_DROPPED'));
  assert.equal(generated.invocation_result.structured_output, null);
});

const DOWNSTREAM_FEEDBACK_NORMALIZATION_SYSTEM_BODY_GOLDEN =
  'e16ced58fefc889f2f041facd3a32fbeb921c4d4ad7ca3e56e45908c6cd02363';

test('v1c N6 downstream-feedback-normalization system prompt is product-grade and byte-stable (golden anchor)', () => {
  const body = buildV1cN6FeedbackNormalizationSystemContent();
  assert.equal(buildV1cN6FeedbackNormalizationSystemContent(), body);
  assert.equal(sha256Text(body), DOWNSTREAM_FEEDBACK_NORMALIZATION_SYSTEM_BODY_GOLDEN);

  assert.match(body, /TopicSelectionV1cDownstreamFeedbackCandidate@v1/);

  assert.match(body, /Set downstream_source_kind to one of paper_project, paper_implementation, writing, research_argument, reviewer_check, or manual/);
  assert.match(body, /set severity to one of info, warning, blocking, or critical/);
  assert.match(body, /Set feedback_signal to one of stale_evidence, overclaim, unanswerable_question, boundary_drift, need_invalidated, package_narrative_gap, promotion_authorization_gap, bridge_trace_gap, commitment_gap, merge_candidate_conflict, paper_project_constraint_conflict, downstream_mutation_attempt, or no_recheck_needed/);

  for (const hint of ['requires_recheck_hint', 'loopback_target_hint', 'affected_ref_hint', 'reason_codes']) {
    assert.ok(body.includes(hint), `system prompt must mirror normalization hint ${hint}`);
  }

  assert.match(body, /no_upstream_mutation_confirmed to true/);
  assert.match(body, /N6 is record-only downstream ingress: never advance the workflow and never re-enter N1 through N5 automatically/);
  assert.match(body, /Do not create downstream_topic_feedback, recheck_request, recheck_event/);

  assert.match(body, /never inventing refs or hashes/);
});
