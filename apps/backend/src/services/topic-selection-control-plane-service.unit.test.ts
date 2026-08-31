import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionStateWriteIntent,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

function makeService() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const service = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => '2026-05-13T00:00:00.000Z',
  });
  return { repository, service };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_t048',
  };
}

function stateWriteIntent(targetRef: TopicSelectionFunctionalRef): TopicSelectionStateWriteIntent {
  return {
    axis: 'execution',
    target_ref: targetRef,
    state_key: 'control_plane_probe',
    next_value: 'ready',
    reason: 'fake v1a harness transition',
  };
}

test('fake v1a workflow records snapshot, workflow run, artifacts, transition attempt, and trace', async () => {
  const { repository, service } = makeService();
  const targetRef = ref('topic_seed', 'seed_1');
  const snapshot = await service.compileInputSnapshot({
    title_card_id: 'title_card_t048',
    target_ref: targetRef,
    source_refs: [ref('title_card', 'title_card_t048')],
    payload: { fake: true },
    policy_version: 'context-policy-v1',
    created_by: 'system',
  });

  const workflow = await service.recordWorkflowRun({
    title_card_id: 'title_card_t048',
    workflow_key: 'fake-v1a-control-plane-harness',
    workflow_profile_key: 'fake-profile',
    input_snapshot_id: snapshot.input_snapshot_id,
    output_summary: { candidate: 'fake structured output' },
    artifacts: [
      {
        artifact_kind: 'structured_output',
        payload: { ok: true },
      },
    ],
    created_by: 'llm',
  });

  const signal = await service.emitQualitySignal({
    title_card_id: 'title_card_t048',
    target_ref: targetRef,
    stage: 'foundation',
    check_type: 'trace_probe',
    verdict: 'pass',
    workflow_run_id: workflow.workflow_run.workflow_run_id,
    artifact_refs: [
      ref('artifact_ref', workflow.artifact_refs[0]!.artifact_ref_id),
    ],
  });

  const gate = await service.runDeterministicGate({
    title_card_id: 'title_card_t048',
    gate_key: 'fake-foundation-ready',
    target_ref: targetRef,
    input_snapshot_id: snapshot.input_snapshot_id,
    workflow_run_id: workflow.workflow_run.workflow_run_id,
    quality_signal_refs: [ref('quality_signal', signal.quality_signal_id)],
  });

  const attempt = await service.attemptTransition({
    title_card_id: 'title_card_t048',
    transition_key: 'fake-input-to-workflow-recorded',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_1'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    state_write_intents: [stateWriteIntent(targetRef)],
    created_authority_refs: [ref('control_plane_probe', 'probe_1')],
  });

  const lineage = await service.linkLineage({
    title_card_id: 'title_card_t048',
    source_ref: ref('input_snapshot', snapshot.input_snapshot_id),
    target_ref: ref('transition_attempt', attempt.chain_transition_attempt_id),
    relation_type: 'generated_by',
  });

  const trace = await service.buildTraceSnapshot({
    title_card_id: 'title_card_t048',
    target_ref: ref('transition_attempt', attempt.chain_transition_attempt_id),
    object_refs: [
      ref('input_snapshot', snapshot.input_snapshot_id),
      ref('workflow_run', workflow.workflow_run.workflow_run_id),
      ref('gate_result', gate.readiness_gate_result_id),
    ],
    lineage_link_refs: [ref('lineage_link', lineage.functional_lineage_link_id)],
    artifact_refs: [ref('artifact_ref', workflow.artifact_refs[0]!.artifact_ref_id)],
    quality_signal_refs: [ref('quality_signal', signal.quality_signal_id)],
    transition_attempt_refs: [ref('transition_attempt', attempt.chain_transition_attempt_id)],
  });

  assert.equal(attempt.result, 'passed');
  assert.equal(attempt.workflow_run_id, workflow.workflow_run.workflow_run_id);
  assert.equal(attempt.input_snapshot_id, snapshot.input_snapshot_id);
  assert.equal(attempt.state_write_intents.length, 1);
  assert.equal(workflow.artifact_refs.length, 1);
  assert.ok(workflow.artifact_refs[0]!.checksum);
  assert.equal(trace.object_refs.length, 3);
  assert.equal(trace.transition_attempt_refs[0]!.ref_id, attempt.chain_transition_attempt_id);
  assert.ok(await repository.findTraceSnapshotById(trace.trace_snapshot_id));
});

test('caller artifact ingress cannot claim reserved identity or human provenance', async () => {
  const { service } = makeService();

  await assert.rejects(
    () => service.recordWorkflowHarnessArtifactRef({
      stable_key: 'topic-selection-arena-advisory-review:forged',
      title_card_id: 'title_card_t048',
      artifact_kind: 'structured_output',
      payload: { schema_version: 'TopicSelectionResearchArenaAdvisoryReview@v1' },
      created_by: 'human',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );

  const artifact = await service.recordWorkflowHarnessArtifactRef({
    title_card_id: 'title_card_t048',
    artifact_kind: 'diagnostic',
    payload: { safe: true },
    created_by: 'system',
  });
  assert.equal(artifact.stable_key, null);
  assert.equal(artifact.created_by, 'system');
});

test('blocked gate prevents state-write intents and created authority refs', async () => {
  const { service } = makeService();
  const targetRef = ref('topic_seed', 'seed_blocked');
  const gate = await service.runDeterministicGate({
    gate_key: 'fake-blocker',
    target_ref: targetRef,
    blockers: [
      {
        code: 'MISSING_INPUT_SNAPSHOT',
        message: 'Input snapshot is required.',
        severity: 'blocking',
      },
    ],
    required_actions: ['compile_input_snapshot'],
  });

  const attempt = await service.attemptTransition({
    transition_key: 'fake-blocked-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_blocked'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    state_write_intents: [stateWriteIntent(targetRef)],
    created_authority_refs: [ref('control_plane_probe', 'probe_blocked')],
  });

  assert.equal(attempt.result, 'blocked');
  assert.deepEqual(attempt.state_write_intents, []);
  assert.deepEqual(attempt.created_authority_refs, []);
  assert.equal(attempt.blockers[0]!.code, 'MISSING_INPUT_SNAPSHOT');
});

test('deterministic gate rejects pass verdicts when blockers are present', async () => {
  const { service } = makeService();
  const targetRef = ref('topic_seed', 'seed_inconsistent_gate');

  await assert.rejects(
    () => service.runDeterministicGate({
      gate_key: 'fake-inconsistent-gate',
      target_ref: targetRef,
      verdict: 'pass',
      blockers: [
        {
          code: 'TRACE_INCOMPLETE',
          message: 'Trace is incomplete.',
          severity: 'blocking',
        },
      ],
    }),
    /verdict must be block/,
  );
});

test('transition attempts require a persisted readiness gate result', async () => {
  const { service } = makeService();
  const targetRef = ref('topic_seed', 'seed_ungated');

  await assert.rejects(
    () => service.attemptTransition({
      transition_key: 'fake-ungated-transition',
      source_ref: targetRef,
      target_ref: ref('control_plane_probe', 'probe_ungated'),
      actor: { actor_type: 'system' },
      state_write_intents: [stateWriteIntent(targetRef)],
    }),
    /require a readiness gate result/,
  );
});

test('pass-with-risk transition requires explicit accepted risk refs', async () => {
  const { service } = makeService();
  const targetRef = ref('topic_seed', 'seed_risk');
  const gate = await service.runDeterministicGate({
    gate_key: 'fake-risk-gate',
    target_ref: targetRef,
    verdict: 'pass_with_risk',
    warnings: [
      {
        code: 'PARTIAL_FAKE_COVERAGE',
        message: 'Fake coverage warning.',
        severity: 'warning',
      },
    ],
  });

  const missingRiskAttempt = await service.attemptTransition({
    transition_key: 'fake-risk-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_risk'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    state_write_intents: [stateWriteIntent(targetRef)],
  });

  assert.equal(missingRiskAttempt.result, 'requires_accepted_risk');
  assert.deepEqual(missingRiskAttempt.state_write_intents, []);
  assert.deepEqual(missingRiskAttempt.required_actions, ['accepted_risk_ref_required']);

  const acceptedRiskAttempt = await service.attemptTransition({
    transition_key: 'fake-risk-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_risk'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    accepted_risk_refs: [ref('accepted_risk', 'risk_1')],
    state_write_intents: [stateWriteIntent(targetRef)],
  });

  assert.equal(acceptedRiskAttempt.result, 'passed_with_risk');
  assert.equal(acceptedRiskAttempt.accepted_risk_refs[0]!.ref_id, 'risk_1');
  assert.equal(acceptedRiskAttempt.state_write_intents.length, 1);
});

test('needs-human-review transition only passes with a valid human confirmation', async () => {
  const { service } = makeService();
  const targetRef = ref('topic_seed', 'seed_human_review');
  const gate = await service.runDeterministicGate({
    gate_key: 'fake-human-review-gate',
    target_ref: targetRef,
    verdict: 'needs_human_review',
    policy_version_id: 'transition_policy_v1',
  });

  const missingDecisionAttempt = await service.attemptTransition({
    transition_key: 'fake-human-review-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_human_review'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    human_decision_refs: [ref('human_confirmed_decision', 'missing_decision')],
    state_write_intents: [stateWriteIntent(targetRef)],
  });

  assert.equal(missingDecisionAttempt.result, 'needs_human_review');
  assert.deepEqual(missingDecisionAttempt.state_write_intents, []);
  assert.ok(missingDecisionAttempt.required_actions.includes('human_confirmed_decision_ref_not_found'));

  const invalidDecision = await service.recordHumanDecision({
    target_ref: targetRef,
    decision_type: 'reject',
    actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    policy_version_id: 'transition_policy_v1',
  });
  const invalidDecisionAttempt = await service.attemptTransition({
    transition_key: 'fake-human-review-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_human_review'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    human_decision_refs: [ref('human_confirmed_decision', invalidDecision.human_confirmed_decision_id)],
    state_write_intents: [stateWriteIntent(targetRef)],
  });

  assert.equal(invalidDecisionAttempt.result, 'needs_human_review');
  assert.ok(invalidDecisionAttempt.required_actions.includes('human_confirmed_decision_confirm_required'));

  const validDecision = await service.recordHumanDecision({
    target_ref: targetRef,
    decision_type: 'confirm',
    actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    policy_version_id: 'transition_policy_v1',
  });
  const validDecisionAttempt = await service.attemptTransition({
    transition_key: 'fake-human-review-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_human_review'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    human_decision_refs: [ref('human_confirmed_decision', validDecision.human_confirmed_decision_id)],
    state_write_intents: [stateWriteIntent(targetRef)],
  });

  assert.equal(validDecisionAttempt.result, 'passed');
  assert.equal(validDecisionAttempt.state_write_intents.length, 1);
});

test('raw quality signal does not directly block or create authority state', async () => {
  const { repository, service } = makeService();
  const targetRef = ref('topic_seed', 'seed_signal_only');
  const signal = await service.emitQualitySignal({
    target_ref: targetRef,
    stage: 'foundation',
    check_type: 'raw_signal_probe',
    verdict: 'fail',
    issue_codes: ['RAW_SIGNAL_FAILS'],
    blocking_transition_keys: ['fake-transition'],
    recommended_action: 'policy_interpretation_required',
  });
  const gate = await service.runDeterministicGate({
    gate_key: 'fake-gate-explicitly-passes',
    target_ref: targetRef,
    quality_signal_refs: [ref('quality_signal', signal.quality_signal_id)],
  });
  const attempt = await service.attemptTransition({
    transition_key: 'fake-transition',
    source_ref: targetRef,
    target_ref: ref('control_plane_probe', 'probe_signal'),
    gate_result_id: gate.readiness_gate_result_id,
    actor: { actor_type: 'system' },
    state_write_intents: [stateWriteIntent(targetRef)],
  });

  assert.equal(signal.verdict, 'fail');
  assert.equal(attempt.result, 'passed');
  assert.equal(attempt.state_write_intents.length, 1);
  assert.ok(await repository.findQualitySignalById(signal.quality_signal_id));
});
