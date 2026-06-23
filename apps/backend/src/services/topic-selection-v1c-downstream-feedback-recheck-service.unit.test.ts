import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import type {
  PrismaClient,
} from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionImpactLevel,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionDownstreamLoopbackCause,
  TopicSelectionDownstreamLoopbackTarget,
  TopicSelectionDownstreamTopicFeedbackCreateInput,
  TopicSelectionDownstreamTopicFeedbackRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository } from '../repositories/in-memory-topic-selection-v1c-downstream-feedback-recheck-repository.js';
import { PrismaTopicSelectionV1cDownstreamFeedbackRecheckRepository } from '../repositories/prisma/prisma-topic-selection-v1c-downstream-feedback-recheck-repository.js';
import {
  TopicSelectionV1cDownstreamFeedbackRecheckService,
  type TopicSelectionDownstreamRecheckSink,
} from './topic-selection-v1c-downstream-feedback-recheck-service.js';

const NOW = '2026-05-16T00:00:00.000Z';

function ref(
  refType: string,
  refId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

function makeBridgeHandoff(
  overrides: {
    bridge?: Partial<TopicSelectionPaperProjectBridgeRecord>;
    handoff?: Partial<TopicSelectionPaperProjectBridgeHandoff>;
  } = {},
): TopicSelectionPaperProjectBridgeHandoff {
  const sourceRefs = [
    ref('topic_package', 'topic_package_001', 'v1'),
    ref('topic_value_assessment', 'topic_value_assessment_001'),
    ref('topic_question', 'topic_question_001'),
    ref('research_slice', 'research_slice_001'),
    ref('validated_need', 'validated_need_001'),
    ref('evidence_unit', 'evidence_unit_001'),
    ref('search_plan', 'search_plan_001'),
    ref('topic_selection_blocker', 'blocker_001'),
  ];
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
  };
  const workingCopy = {
    editable_title: 'Working paper title',
    problem_statement: 'A concise problem statement.',
    contribution_summary: 'A focused contribution summary.',
    evaluation_plan: 'Run early feasibility checks.',
    initial_planning_notes: ['Preserve accepted risks during intake.'],
    claim_ceiling: 'Correlation and mechanism claims only.',
    prohibited_claims: ['Do not claim causal proof.'],
    conditions: [],
    accepted_risk_refs: [],
    early_check_obligations: [],
    source_lineage_summary: {
      topic_package_id: 'topic_package_001',
    },
  };
  const bridge: TopicSelectionPaperProjectBridgeRecord = {
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_status: 'active',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    source_promotion_decision_id: 'promotion_decision_001',
    source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_001'),
    human_promotion_decision_ref: ref('human_promotion_decision', 'human_promotion_decision_001'),
    human_confirmed_decision_ref: ref('human_confirmed_decision', 'human_confirmed_decision_001'),
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_001'),
    promotion_gate_check_ref: ref('promotion_gate_check', 'promotion_gate_check_001'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_001'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    decision: 'promote_to_paper_project',
    conditions: [],
    accepted_risk_refs: [],
    allowed_refinements: [],
    early_check_obligations: [],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    working_copy_payload: workingCopy,
    working_copy_payload_hash: 'working_copy_payload_hash_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    source_promotion_handoff: {} as never,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_001')],
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    ...overrides.bridge,
  };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: ref('paper_project_bridge', bridge.paper_project_bridge_id, bridge.bridge_payload_hash),
    bridge_status: 'active',
    source_promotion_decision_id: bridge.source_promotion_decision_id,
    source_promotion_decision_ref: bridge.source_promotion_decision_ref,
    promotion_commitment_profile_ref: bridge.promotion_commitment_profile_ref,
    promotion_input_snapshot_id: bridge.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: bridge.promotion_input_snapshot_ref,
    promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
    topic_package_id: bridge.topic_package_id,
    package_version: bridge.package_version,
    decision: bridge.decision,
    working_copy_payload: bridge.working_copy_payload,
    working_copy_payload_hash: bridge.working_copy_payload_hash,
    bridge_payload_hash: bridge.bridge_payload_hash,
    conditions: bridge.conditions,
    accepted_risk_refs: bridge.accepted_risk_refs,
    allowed_refinements: bridge.allowed_refinements,
    early_check_obligations: bridge.early_check_obligations,
    stop_conditions: bridge.stop_conditions,
    reopen_conditions: bridge.reopen_conditions,
    source_refs: bridge.source_refs,
    snapshot_hashes: bridge.snapshot_hashes,
    paper_project_intake_ref: bridge.paper_project_intake_ref,
    target_paper_project_ref: bridge.target_paper_project_ref,
    bridge,
    source_promotion_handoff: {} as never,
    ...overrides.handoff,
  };
}

class StubBridgeService {
  constructor(
    private readonly handoff: TopicSelectionPaperProjectBridgeHandoff | null,
    private readonly error: Error | null = null,
  ) {}

  async getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff> {
    if (this.error) {
      throw this.error;
    }
    if (!this.handoff || paperProjectBridgeId !== this.handoff.paper_project_bridge_id) {
      throw new AppError(404, 'NOT_FOUND', `PaperProjectBridge ${paperProjectBridgeId} not found.`);
    }
    return this.handoff;
  }
}

class RecordingRecheckSink implements TopicSelectionDownstreamRecheckSink {
  readonly calls: Parameters<TopicSelectionDownstreamRecheckSink['recordDownstreamFeedback']>[0][] = [];

  async recordDownstreamFeedback(
    input: Parameters<TopicSelectionDownstreamRecheckSink['recordDownstreamFeedback']>[0],
  ): ReturnType<TopicSelectionDownstreamRecheckSink['recordDownstreamFeedback']> {
    this.calls.push(input);
    const event = {
      recheck_event_id: `recheck_event_${this.calls.length}`,
      title_card_id: input.title_card_id ?? input.source_ref.title_card_id ?? null,
      severity: input.severity ?? 'blocking',
    } as TopicSelectionRecheckEventRecord;
    const impact = {
      recheck_impact_id: `recheck_impact_${this.calls.length}`,
      title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? null,
      impact_level: input.impact_level ?? 'recheck_required',
    } as TopicSelectionRecheckImpactRecord;
    const queue = {
      decision_work_queue_item_id: `decision_work_queue_item_${this.calls.length}`,
      title_card_id: input.title_card_id ?? input.affected_ref.title_card_id ?? null,
      queue_item_type: 'downstream_feedback',
    } as TopicSelectionDecisionWorkQueueItemRecord;
    return { event, impact, queue_item: queue };
  }
}

function makeSubject(
  handoff: TopicSelectionPaperProjectBridgeHandoff = makeBridgeHandoff(),
) {
  const repository = new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository();
  const recheck = new RecordingRecheckSink();
  const service = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository,
    paperProjectBridgeService: new StubBridgeService(handoff),
    recheckRiskMemoryService: recheck,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { repository, recheck, service };
}

function makeCreateInput(
  overrides: Partial<TopicSelectionDownstreamTopicFeedbackCreateInput> = {},
): TopicSelectionDownstreamTopicFeedbackCreateInput {
  return {
    paper_project_bridge_id: 'paper_project_bridge_001',
    workspace_id: 'workspace_001',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: ref('reviewer_check', 'reviewer_check_001'),
    source_feedback_refs: [ref('review_comment', 'review_comment_001')],
    observed_blocker_refs: [ref('topic_selection_blocker', 'blocker_001')],
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary: 'Downstream reviewer check invalidated the claimed need.',
    required_action: 'Recheck the validated need against downstream counter-evidence.',
    artifact_refs: [ref('artifact_ref', 'artifact_ref_feedback_001')],
    feedback_payload: { quoted_feedback: 'Need is no longer supported.' },
    policy_version_id: 'policy_v1',
    created_by: 'system',
    ...overrides,
  };
}

const EXPECTED_LOOPBACK_TARGETS: Record<
  TopicSelectionDownstreamLoopbackCause,
  TopicSelectionDownstreamLoopbackTarget
> = {
  stale_evidence: 'evidence_or_search',
  overclaim: 'value_assessment',
  unanswerable_question: 'topic_question',
  boundary_drift: 'research_slice',
  need_invalidated: 'validated_need',
  package_narrative_gap: 'package',
  promotion_authorization_gap: 'promotion',
  bridge_trace_gap: 'paper_project_bridge',
  commitment_gap: 'paper_project_bridge',
  merge_candidate_conflict: 'merge_candidate',
  paper_project_constraint_conflict: 'paper_project_intake',
  downstream_mutation_attempt: 'paper_project_bridge',
  no_recheck_needed: 'paper_project_bridge',
};

const EXPECTED_AFFECTED_REF_TYPES: Record<TopicSelectionDownstreamLoopbackTarget, string> = {
  evidence_or_search: 'evidence_unit',
  value_assessment: 'topic_value_assessment',
  topic_question: 'topic_question',
  research_slice: 'research_slice',
  validated_need: 'validated_need',
  package: 'topic_package',
  promotion: 'promotion_decision',
  paper_project_bridge: 'paper_project_bridge',
  merge_candidate: 'merge_candidate',
  paper_project_intake: 'paper_project_intake',
};

test('downstream feedback deterministically maps every loopback cause to its target', async () => {
  for (const [signal, expectedTarget] of Object.entries(EXPECTED_LOOPBACK_TARGETS) as Array<[
    TopicSelectionDownstreamLoopbackCause,
    TopicSelectionDownstreamLoopbackTarget,
  ]>) {
    const { recheck, service } = makeSubject();
    const result = await service.recordDownstreamTopicFeedback(makeCreateInput({
      feedback_signal: signal,
      severity: signal === 'no_recheck_needed' ? 'info' : 'blocking',
      required_action: signal === 'no_recheck_needed'
        ? null
        : `Resolve ${signal} before continuing PaperProject intake.`,
    }));

    assert.equal(result.classification.loopback_target, expectedTarget);
    assert.equal(result.classification.loopback_cause, signal);
    assert.equal(result.downstream_topic_feedback.feedback_signal, signal);
    assert.equal(
      recheck.calls.length,
      signal === 'no_recheck_needed' ? 0 : 1,
      `${signal} recheck call count`,
    );
    assert.equal(result.classification.affected_ref.ref_type, EXPECTED_AFFECTED_REF_TYPES[expectedTarget]);

    if (signal === 'no_recheck_needed') {
      assert.equal(result.recheck_request, null);
      continue;
    }

    assert.equal(result.recheck_request?.loopback_target, expectedTarget);
    assert.equal(result.recheck_request?.loopback_cause, signal);
    assert.equal(result.recheck_request?.affected_ref.ref_type, EXPECTED_AFFECTED_REF_TYPES[expectedTarget]);
    assert.deepEqual(result.recheck_request?.required_actions, [
      `Resolve ${signal} before continuing PaperProject intake.`,
    ]);
    assert.deepEqual(result.recheck_request?.reason_codes, [signal]);
    assert.ok(
      result.recheck_request?.source_refs.some((sourceRef) => sourceRef.ref_type === 'paper_project_bridge'),
      `${signal} source refs include bridge`,
    );
    assert.ok(
      result.recheck_request?.source_refs.some((sourceRef) => sourceRef.ref_type === 'promotion_decision'),
      `${signal} source refs include promotion decision`,
    );
    assert.ok(
      result.recheck_request?.source_refs.some((sourceRef) => sourceRef.ref_type === 'promotion_input_snapshot'),
      `${signal} source refs include promotion input snapshot`,
    );

    const sinkCall = recheck.calls[0];
    assert.ok(sinkCall);
    assert.equal(sinkCall.affected_ref.ref_type, EXPECTED_AFFECTED_REF_TYPES[expectedTarget]);
    const sinkClassification = sinkCall.payload?.classification as { affected_stage?: string; loopback_target?: string } | undefined;
    assert.equal(sinkClassification?.loopback_target, expectedTarget);
    assert.equal(sinkClassification?.affected_stage, result.classification.affected_stage);
  }
});

test('no-recheck feedback is append-only and does not create generic recheck artifacts', async () => {
  const { repository, recheck, service } = makeSubject();

  const result = await service.recordDownstreamTopicFeedback(makeCreateInput({
    feedback_signal: 'no_recheck_needed',
    severity: 'info',
    required_action: null,
  }));
  const stored = await repository.findFeedbackById(
    result.downstream_topic_feedback.downstream_topic_feedback_id,
  );

  assert.equal(result.recheck_request, null);
  assert.equal(result.impact_summary.impact_level, 'no_impact');
  assert.equal(result.downstream_topic_feedback.recheck_event_ref, null);
  assert.equal(result.downstream_topic_feedback.recheck_impact_ref, null);
  assert.equal(result.downstream_topic_feedback.decision_work_queue_item_ref, null);
  assert.equal(recheck.calls.length, 0);
  assert.equal(stored?.impact_summary.impact_level, 'no_impact');
});

test('warning blocking and critical severity propagate into impact summary and generic recheck calls', async () => {
  const cases: Array<[TopicSelectionSeverity, TopicSelectionImpactLevel]> = [
    ['warning', 'stale'],
    ['blocking', 'recheck_required'],
    ['critical', 'invalidated'],
  ];

  for (const [severity, expectedImpactLevel] of cases) {
    const { recheck, service } = makeSubject();
    const result = await service.recordDownstreamTopicFeedback(makeCreateInput({
      feedback_signal: severity === 'warning' ? 'stale_evidence' : 'need_invalidated',
      severity,
      required_action: `Handle ${severity} downstream feedback.`,
    }));

    assert.equal(result.impact_summary.severity, severity);
    assert.equal(result.impact_summary.impact_level, expectedImpactLevel);
    assert.equal(recheck.calls[0]?.severity, severity);
    assert.equal(recheck.calls[0]?.impact_level, expectedImpactLevel);
    assert.equal(result.downstream_topic_feedback.recheck_event_ref?.ref_type, 'recheck_event');
    assert.equal(result.downstream_topic_feedback.recheck_impact_ref?.ref_type, 'recheck_impact');
    assert.equal(result.downstream_topic_feedback.decision_work_queue_item_ref?.ref_type, 'decision_work_queue_item');
  }
});

test('downstream feedback ranks recheck advisories deterministically and flows the score to the queue item (W-08)', async () => {
  const { recheck, service } = makeSubject();
  // critical + need_invalidated (impact invalidated) = 60 + 30 + 9 = 99.
  const high = await service.recordDownstreamTopicFeedback(makeCreateInput({
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary: 'Downstream reviewer invalidated the claimed need.',
  }));
  // warning + stale_evidence (impact stale) = 25 + 8 + 3 = 36. Distinct fingerprint (signal+severity+summary differ).
  const low = await service.recordDownstreamTopicFeedback(makeCreateInput({
    feedback_signal: 'stale_evidence',
    severity: 'warning',
    summary: 'Downstream reviewer flagged stale supporting evidence.',
  }));

  // Both required a recheck -> both carry a deterministic advisory score + human-readable reason.
  assert.equal(high.impact_summary.advisory_priority, 99);
  assert.equal(high.impact_summary.advisory_rank_reason, 'critical+invalidated+need_invalidated');
  assert.equal(low.impact_summary.advisory_priority, 36);
  assert.equal(low.impact_summary.advisory_rank_reason, 'warning+stale+stale_evidence');
  // The critical/invalidating feedback strictly outranks the warning/stale one.
  assert.ok((high.impact_summary.advisory_priority ?? 0) > (low.impact_summary.advisory_priority ?? 0));

  // The SAME score flows to the queue item via the sink (replaces the prior binary 100/85 default).
  assert.equal(recheck.calls.length, 2);
  assert.equal(recheck.calls[0]!.priority, 99);
  assert.equal(recheck.calls[1]!.priority, 36);
});

test('downstream feedback ranking is record-only: a no-recheck feedback carries no advisory and emits no queue item (W-08)', async () => {
  const { recheck, service } = makeSubject();
  const result = await service.recordDownstreamTopicFeedback(makeCreateInput({
    feedback_signal: 'no_recheck_needed',
    severity: 'info',
    summary: 'Downstream reviewer confirmed no recheck needed.',
  }));
  // No recheck -> no advisory score, no rank reason, and NO sink/queue emission (record-only, no routing).
  assert.equal(result.impact_summary.requires_recheck, false);
  assert.equal(result.impact_summary.advisory_priority ?? null, null);
  assert.equal(result.impact_summary.advisory_rank_reason ?? null, null);
  assert.equal(recheck.calls.length, 0);
});

test('downstream recheck advisories are scoped + ranked priority-desc and exclude no-recheck records (W-08 S3)', async () => {
  const { service } = makeSubject();
  const bridgeId = 'paper_project_bridge_001';
  // Insert OUT of priority order; distinct signal+severity+summary -> distinct fingerprints (no dedup).
  await service.recordDownstreamTopicFeedback(makeCreateInput({ feedback_signal: 'stale_evidence', severity: 'warning', summary: 'C stale evidence' })); // 25+8+3=36
  await service.recordDownstreamTopicFeedback(makeCreateInput({ feedback_signal: 'no_recheck_needed', severity: 'info', summary: 'D no recheck' })); // excluded (no recheck)
  await service.recordDownstreamTopicFeedback(makeCreateInput({ feedback_signal: 'need_invalidated', severity: 'critical', summary: 'A invalidated need' })); // 60+30+9=99
  await service.recordDownstreamTopicFeedback(makeCreateInput({ feedback_signal: 'overclaim', severity: 'blocking', summary: 'B overclaim' })); // 45+18+6=69

  const advisories = await service.listDownstreamRecheckAdvisoriesByBridge(bridgeId);
  // The no-recheck record is excluded, and the rest are ranked by advisory_priority (desc).
  assert.equal(advisories.length, 3);
  assert.deepEqual(advisories.map((advisory) => advisory.impact_summary.advisory_priority), [99, 69, 36]);
  // Pure record-only read: every returned record requires a recheck; nothing was mutated to produce it.
  assert.ok(advisories.every((advisory) => advisory.impact_summary.requires_recheck));
  // A bridge with no feedback returns an empty advisory list (no throw).
  assert.deepEqual(await service.listDownstreamRecheckAdvisoriesByBridge('paper_project_bridge_absent'), []);
});

test('downstream feedback rejects missing bridge inactive bridge workspace drift and malformed input', async () => {
  const missingBridge = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository: new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository(),
    paperProjectBridgeService: new StubBridgeService(
      null,
      new AppError(404, 'NOT_FOUND', 'PaperProjectBridge missing.'),
    ),
    recheckRiskMemoryService: new RecordingRecheckSink(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  await assert.rejects(
    () => missingBridge.recordDownstreamTopicFeedback(makeCreateInput()),
    (error) => error instanceof AppError && error.errorCode === 'NOT_FOUND',
  );

  const inactiveHandoff = makeBridgeHandoff({
    bridge: { bridge_status: 'blocked' },
  }) as unknown as TopicSelectionPaperProjectBridgeHandoff;
  await assert.rejects(
    () => makeSubject(inactiveHandoff).service.recordDownstreamTopicFeedback(makeCreateInput()),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  await assert.rejects(
    () => makeSubject().service.recordDownstreamTopicFeedback(makeCreateInput({
      workspace_id: 'workspace_other',
    })),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  await assert.rejects(
    () => makeSubject().service.recordDownstreamTopicFeedback(makeCreateInput({
      downstream_source_ref: { ref_type: 'reviewer_check', ref_id: '' },
    })),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => makeSubject().service.recordDownstreamTopicFeedback(makeCreateInput({
      downstream_source_kind: 'email',
    } as unknown as Partial<TopicSelectionDownstreamTopicFeedbackCreateInput>)),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => makeSubject().service.recordDownstreamTopicFeedback(makeCreateInput({
      created_by: 'automation',
    } as unknown as Partial<TopicSelectionDownstreamTopicFeedbackCreateInput>)),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => makeSubject().service.recordDownstreamTopicFeedback(makeCreateInput({
      feedback_signal: 'need_invalidated',
      required_action: ' ',
    })),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('downstream feedback rejects upstream authority loopbacks when bridge lineage is missing', async () => {
  const cases: Array<[
    TopicSelectionDownstreamLoopbackCause,
    (sourceRef: TopicSelectionFunctionalRef) => boolean,
  ]> = [
    ['overclaim', (sourceRef) =>
      sourceRef.ref_type === 'topic_value_assessment' || sourceRef.ref_type === 'value_assessment'],
    ['unanswerable_question', (sourceRef) => sourceRef.ref_type === 'topic_question'],
    ['boundary_drift', (sourceRef) => sourceRef.ref_type === 'research_slice'],
    ['need_invalidated', (sourceRef) => sourceRef.ref_type === 'validated_need'],
    ['stale_evidence', (sourceRef) =>
      sourceRef.ref_type.includes('evidence') || sourceRef.ref_type.includes('search')],
  ];

  for (const [feedbackSignal, shouldRemove] of cases) {
    const handoff = makeBridgeHandoff();
    const filteredSourceRefs = handoff.source_refs.filter((sourceRef) => !shouldRemove(sourceRef));
    handoff.source_refs = filteredSourceRefs;
    handoff.bridge.source_refs = filteredSourceRefs;

    await assert.rejects(
      () => makeSubject(handoff).service.recordDownstreamTopicFeedback(makeCreateInput({
        feedback_signal: feedbackSignal,
        severity: 'blocking',
        required_action: `Resolve missing lineage for ${feedbackSignal}.`,
      })),
      (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
      `${feedbackSignal} should reject missing bridge source refs`,
    );
  }
});

test('downstream feedback preserves bridge lineage and does not mutate upstream bridge handoff', async () => {
  const handoff = makeBridgeHandoff();
  const before = structuredClone(handoff);
  const { repository, service } = makeSubject(handoff);

  const result = await service.recordDownstreamTopicFeedback(makeCreateInput());
  const listed = await repository.listFeedbackByBridgeId('paper_project_bridge_001');

  assert.deepEqual(handoff, before);
  assert.equal(result.downstream_topic_feedback.paper_project_bridge_id, 'paper_project_bridge_001');
  assert.equal(result.downstream_topic_feedback.source_promotion_decision_ref.ref_id, 'promotion_decision_001');
  assert.equal(result.downstream_topic_feedback.promotion_commitment_profile_ref.ref_id, 'promotion_commitment_profile_001');
  assert.equal(result.downstream_topic_feedback.promotion_input_snapshot_hash, 'promotion_input_snapshot_hash_001');
  assert.deepEqual(result.downstream_topic_feedback.source_feedback_refs, [ref('review_comment', 'review_comment_001')]);
  assert.equal(
    result.classification.source_refs.some((sourceRef) =>
      sourceRef.ref_type === 'validated_need' && sourceRef.ref_id === 'validated_need_001'),
    true,
  );
  assert.equal(listed.length, 1);
});

test('Prisma downstream feedback repository maps create read and list-by-bridge round trip', async () => {
  const fake = new FakeDownstreamFeedbackPrismaClient();
  const repository = new PrismaTopicSelectionV1cDownstreamFeedbackRecheckRepository(fake.client);
  const record = makeFeedbackRecord();

  await repository.createFeedback(record);
  await repository.createFeedback({
    ...record,
    downstream_topic_feedback_id: 'downstream_topic_feedback_002',
    paper_project_bridge_id: 'paper_project_bridge_other',
    created_at: '2026-05-16T01:00:00.000Z',
  });
  const found = await repository.findFeedbackById('downstream_topic_feedback_001');
  const listed = await repository.listFeedbackByBridgeId('paper_project_bridge_001');

  assert.equal(found?.downstream_topic_feedback_id, 'downstream_topic_feedback_001');
  assert.equal(found?.classification.loopback_target, 'validated_need');
  assert.equal(found?.impact_summary.recheck_event_ref?.ref_id, 'recheck_event_001');
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.paper_project_bridge_id, 'paper_project_bridge_001');
});

test('memory downstream feedback repository rejects duplicate ids instead of overwriting append-only records', async () => {
  const repository = new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository();
  const first = makeFeedbackRecord();
  const duplicate = {
    ...first,
    summary: 'This attempted overwrite must not replace the original feedback.',
  };

  await repository.createFeedback(first);
  await assert.rejects(
    () => repository.createFeedback(duplicate),
    /already exists/,
  );
  const stored = await repository.findFeedbackById(first.downstream_topic_feedback_id);

  assert.equal(stored?.summary, first.summary);
});

test('downstream feedback migration declares append-only table without PaperProject or upstream mutations', async () => {
  const sql = await fs.readFile(
    new URL('../../../../prisma/migrations/20260516100000_add_topic_selection_v1c_downstream_feedback_recheck/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE "TopicSelectionDownstreamTopicFeedback"/);
  assert.match(sql, /"feedbackFingerprint" TEXT NOT NULL/);
  assert.match(sql, /"paperProjectBridgeId" TEXT NOT NULL/);
  assert.match(sql, /"classification" JSONB NOT NULL/);
  assert.match(sql, /tsdtf_bridge_created_idx/);
  assert.doesNotMatch(sql, /CREATE TABLE "PaperProject"/);
  assert.doesNotMatch(sql, /ALTER TABLE "TopicSelectionPaperProjectBridge"/);
  assert.doesNotMatch(sql, /UPDATE "TopicSelectionPaperProjectBridge"/);
  assert.doesNotMatch(sql, /ALTER TABLE "TopicPackage"/);
  assert.doesNotMatch(sql, /ALTER TABLE "TopicQuestion"/);
  assert.doesNotMatch(sql, /ALTER TABLE "TopicNeedReview"/);
});

function makeFeedbackRecord(): TopicSelectionDownstreamTopicFeedbackRecord {
  const feedbackRef = ref('downstream_topic_feedback', 'downstream_topic_feedback_001');
  const affectedRef = ref('validated_need', 'validated_need_001');
  const recheckEventRef = ref('recheck_event', 'recheck_event_001');
  const recheckImpactRef = ref('recheck_impact', 'recheck_impact_001');
  const queueRef = ref('decision_work_queue_item', 'decision_work_queue_item_001');
  const classification = {
    loopback_target: 'validated_need' as const,
    loopback_cause: 'need_invalidated' as const,
    severity: 'critical' as const,
    requires_recheck: true,
    affected_ref: affectedRef,
    affected_stage: 'validated_need',
    source_refs: [ref('paper_project_bridge', 'paper_project_bridge_001')],
    rationale: 'Need invalidation routes to the validated need authority.',
    required_actions: ['Recheck the validated need.'],
  };
  const recheckRequest = {
    downstream_recheck_request_id: 'downstream_recheck_request_001',
    feedback_ref: feedbackRef,
    loopback_target: 'validated_need' as const,
    loopback_cause: 'need_invalidated' as const,
    affected_ref: affectedRef,
    required_actions: ['Recheck the validated need.'],
    reason_codes: ['need_invalidated'],
    source_refs: [ref('paper_project_bridge', 'paper_project_bridge_001')],
    created_at: NOW,
  };
  const impactSummary = {
    impact_level: 'invalidated' as const,
    severity: 'critical' as const,
    loopback_target: 'validated_need' as const,
    loopback_cause: 'need_invalidated' as const,
    requires_recheck: true,
    affected_ref: affectedRef,
    recheck_event_ref: recheckEventRef,
    recheck_impact_ref: recheckImpactRef,
    decision_work_queue_item_ref: queueRef,
    summary: 'Downstream feedback requires validated_need recheck.',
  };
  return {
    downstream_topic_feedback_id: 'downstream_topic_feedback_001',
    feedback_fingerprint: 'feedback_fingerprint_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    paper_project_bridge_id: 'paper_project_bridge_001',
    paper_project_bridge_ref: ref('paper_project_bridge', 'paper_project_bridge_001'),
    source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_001'),
    promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_001'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_001'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: ref('reviewer_check', 'reviewer_check_001'),
    source_feedback_refs: [ref('review_comment', 'review_comment_001')],
    observed_blocker_refs: [ref('topic_selection_blocker', 'blocker_001')],
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary: 'Downstream reviewer check invalidated the claimed need.',
    required_action: 'Recheck the validated need.',
    classification,
    recheck_request: recheckRequest,
    impact_summary: impactSummary,
    recheck_event_ref: recheckEventRef,
    recheck_impact_ref: recheckImpactRef,
    decision_work_queue_item_ref: queueRef,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_feedback_001')],
    payload: { feedback_payload: {} },
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

class FakeDownstreamFeedbackModel {
  readonly rows = new Map<string, Record<string, unknown>>();

  async create({ data }: { data: Record<string, unknown> }) {
    this.rows.set(data.id as string, data);
    return data;
  }

  async findUnique({ where }: { where: { id: string } }) {
    return this.rows.get(where.id) ?? null;
  }

  async findFirst({
    where,
  }: {
    where: {
      feedbackFingerprint?: string;
      recheckRequest?: { path: string[]; equals: string };
    };
    orderBy?: { createdAt: 'desc' };
  }) {
    const rows = [...this.rows.values()]
      .filter((row) => {
        if (where.feedbackFingerprint) {
          return row.feedbackFingerprint === where.feedbackFingerprint;
        }
        if (where.recheckRequest) {
          const recheckRequest = row.recheckRequest as { downstream_recheck_request_id?: string } | undefined;
          return recheckRequest?.downstream_recheck_request_id === where.recheckRequest.equals;
        }
        return false;
      })
      .sort((left, right) =>
        (right.createdAt as Date).getTime() - (left.createdAt as Date).getTime());
    return rows[0] ?? null;
  }

  async findMany({
    where,
  }: {
    where: { paperProjectBridgeId: string };
    orderBy?: { createdAt: 'desc' };
  }) {
    return [...this.rows.values()]
      .filter((row) => row.paperProjectBridgeId === where.paperProjectBridgeId)
      .sort((left, right) =>
        (right.createdAt as Date).getTime() - (left.createdAt as Date).getTime());
  }
}

class FakeDownstreamFeedbackPrismaClient {
  readonly topicSelectionDownstreamTopicFeedback = new FakeDownstreamFeedbackModel();

  get client(): PrismaClient {
    return this as unknown as PrismaClient;
  }
}
