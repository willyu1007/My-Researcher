import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import {
  TopicSelectionV1cN4DelegatedPromotionDecisionService,
  type RecordDelegatedPromotionDecisionInput,
} from './topic-selection-v1c-n4-delegated-promotion-decision-service.js';

// Lightweight stubs for the runtime / admission / gate / human writer — this test pins the N4 SERVICE's new
// orchestration logic (authority boundary, promote-class re-confirmation, provenance stamping). That the REAL
// runtime + admission are reached is proven end-to-end by the S5 HTTP integration test.

function candidate(decision: TopicSelectionV1cDelegatedPromotionDecisionCandidate['decision']): TopicSelectionV1cDelegatedPromotionDecisionCandidate {
  return { decision } as TopicSelectionV1cDelegatedPromotionDecisionCandidate;
}

function makeSubject(opts: {
  generated?: TopicSelectionV1cDelegatedPromotionDecisionCandidate;
  generateBlocked?: boolean;
  admitBlocked?: boolean;
} = {}) {
  const calls = { generate: 0, admit: 0, record: 0 as number, getHandoff: 0 };
  let recordedInput: any = null;
  let recordedInternalOptions: any = null;
  const generatedCandidate = opts.generated ?? candidate('park');

  const controlPlane = new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository());
  const runtime = {
    cliExecutionIdentity: { runner: 'controlled-runner', profile: 'controlled-profile' },
    generateCandidate: async () => {
      calls.generate += 1;
      if (opts.generateBlocked) {
        return { status: 'blocked', invocation_result: { blocker_codes: ['N4_BLOCKED'], error_code: null }, context_packet_ref: {}, context_packet_hash: 'h' };
      }
      return {
        status: 'succeeded',
        candidate_artifact: { workflow_run_id: 'wr', node_attempt_id: 'na' },
        structured_output: generatedCandidate,
        invocation_result: { blocker_codes: [], error_code: null },
        context_packet_ref: {},
        context_packet_hash: 'h',
      };
    },
  };
  const admission = {
    validateCandidateForReview: () => null,
    admit: (input: any) => {
      calls.admit += 1;
      if (opts.admitBlocked) {
        return { admitted: false, blocker: { code: 'N4_DELEGATED_DECISION_FORBIDDEN_AUTHORITY_FIELD', message: 'forbidden', details: {} } };
      }
      return {
        admitted: true,
        candidate_artifact: input.candidate_artifact,
        candidate: input.candidate,
        create_input: {
          promotion_gate_check_id: 'promotion_gate_check_001',
          decision: input.candidate.decision,
          human_actor: input.human_actor,
          rationale: 'delegated rationale',
          confirmed_snapshot_hash: 'snapshot_hash_001',
        },
        admission_identity: {},
        admission_identity_hash: 'admission_identity_hash_001',
        warnings: [],
      };
    },
  };
  const gateService = {
    getPromotionGateHandoff: async (id: string) => {
      calls.getHandoff += 1;
      return { promotion_gate_check_id: id, gate_check: { title_card_id: 'title_card_001', workspace_id: null } };
    },
  };
  const humanPromotionDecisionService = {
    // The real writer's signature: (input, internalOptions). The delegated-provenance marker is read ONLY from the
    // internal-options channel — mirror that here so the test pins the marker arriving off the public input.
    recordHumanPromotionDecision: async (input: any, internalOptions: any) => {
      calls.record += 1;
      recordedInput = input;
      recordedInternalOptions = internalOptions ?? null;
      return { promotion_decision: { promotion_decision_id: 'pd_001', delegated_decision_provenance: internalOptions?.delegatedDecisionProvenance ?? null } };
    },
  };

  const service = new TopicSelectionV1cN4DelegatedPromotionDecisionService({
    controlPlane,
    runtime: runtime as any,
    admission: admission as any,
    gateService: gateService as any,
    humanPromotionDecisionService: humanPromotionDecisionService as any,
  });
  return { service, calls, recordedInput: () => recordedInput, recordedInternalOptions: () => recordedInternalOptions };
}

function baseInput(overrides: Partial<RecordDelegatedPromotionDecisionInput> = {}): RecordDelegatedPromotionDecisionInput {
  return {
    promotion_gate_check_id: 'promotion_gate_check_001',
    workflow_run_id: 'workflow_run_n4_001',
    node_attempt_id: 'node_attempt_n4_001',
    human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
    codex_response: { output: candidate('park'), operator_label: 'unit-test' },
    ...overrides,
  };
}

test('v1c N4 delegated: a non-human authorizer is rejected before any runtime call (the agent never supplies the actor)', async () => {
  const { service, calls } = makeSubject();
  await assert.rejects(
    () => service.recordDelegatedPromotionDecision(baseInput({ human_actor: { actor_type: 'llm', actor_id: 'agent_x' } })),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal((err as AppError).errorCode, 'GATE_CONSTRAINT_FAILED');
      return true;
    },
  );
  assert.equal(calls.generate, 0, 'fails fast — no runtime call');
  assert.equal(calls.record, 0);
});

test('v1c N4 delegated: a non-promote candidate (park) is admitted + recorded with the delegated-provenance marker', async () => {
  const { service, calls, recordedInput, recordedInternalOptions } = makeSubject({ generated: candidate('park') });
  const result = await service.recordDelegatedPromotionDecision(baseInput());
  assert.equal(calls.generate, 1);
  assert.equal(calls.admit, 1);
  assert.equal(calls.record, 1);
  // the provenance marker is stamped via the writer's INTERNAL-ONLY channel (auditable, non-impersonation)...
  assert.deepEqual(recordedInternalOptions().delegatedDecisionProvenance, { source: 'codex_delegated', admission_identity_hash: 'admission_identity_hash_001' });
  // ...and NEVER on the public decision input (the writer ignores any marker arriving on the request body).
  assert.equal(recordedInput().delegated_decision_provenance, undefined);
  // the human_actor flows from the request through admission's create_input.
  assert.deepEqual(recordedInput().human_actor, { actor_type: 'human', actor_id: 'reviewer_001' });
  assert.equal((result as { promotion_decision: { delegated_decision_provenance?: unknown } }).promotion_decision.delegated_decision_provenance !== undefined, true);
});

test('v1c N4 delegated: a PROMOTE-class candidate without promote_reconfirmed is rejected (409) before admit/record', async () => {
  const { service, calls } = makeSubject({ generated: candidate('promote_to_paper_project') });
  await assert.rejects(
    () => service.recordDelegatedPromotionDecision(baseInput()),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal((err as AppError).statusCode, 409);
      assert.equal((err as AppError).errorCode, 'GATE_CONSTRAINT_FAILED');
      return true;
    },
  );
  assert.equal(calls.generate, 1, 'generated, then gated');
  assert.equal(calls.admit, 0, 'never admitted/recorded without re-confirmation');
  assert.equal(calls.record, 0);
});

test('v1c N4 delegated: a PROMOTE-class candidate WITH promote_reconfirmed=true is admitted + recorded with the marker', async () => {
  const { service, calls, recordedInternalOptions } = makeSubject({ generated: candidate('promote_to_paper_project') });
  await service.recordDelegatedPromotionDecision(baseInput({ promote_reconfirmed: true }));
  assert.equal(calls.admit, 1);
  assert.equal(calls.record, 1);
  assert.deepEqual(recordedInternalOptions().delegatedDecisionProvenance, { source: 'codex_delegated', admission_identity_hash: 'admission_identity_hash_001' });
});

test('v1c N4 delegated: an admit blocker surfaces as a GATE_CONSTRAINT_FAILED AppError, nothing recorded', async () => {
  const { service, calls } = makeSubject({ admitBlocked: true });
  await assert.rejects(
    () => service.recordDelegatedPromotionDecision(baseInput()),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal((err as AppError).errorCode, 'GATE_CONSTRAINT_FAILED');
      assert.equal(String((err as AppError).details?.blocker_code), 'N4_DELEGATED_DECISION_FORBIDDEN_AUTHORITY_FIELD');
      return true;
    },
  );
  assert.equal(calls.record, 0);
});


test('CLI delegated candidate is reviewable and requires its exact Human confirmation before authority writes', async () => {
  const { service, calls } = makeSubject();
  const input = { promotion_gate_check_id: 'promotion_gate_check_001', workflow_run_id: 'wr', node_attempt_id: 'na', execution_spec: { execution_mode: 'codex_cli' as const } };
  const draft = await service.generateDelegatedPromotionCandidate(input);
  assert.equal(calls.record, 0);
  assert.equal(calls.generate, 1);
  assert.deepEqual(await service.generateDelegatedPromotionCandidate(input), draft);
  assert.equal(calls.generate, 1);
  await assert.rejects(service.generateDelegatedPromotionCandidate({ ...input, policy_version_id: 'changed' }), /different|changed/);
  const acceptance = { promotion_gate_check_id: input.promotion_gate_check_id, workflow_run_id: 'wr', node_attempt_id: 'na',
    human_actor: { actor_type: 'human' as const, actor_id: 'reviewer_001' },
    candidate_receipt_ref: draft.candidate_receipt_ref, confirmed_candidate_hash: draft.candidate_hash };
  await assert.rejects(service.recordDelegatedPromotionDecision({ ...acceptance, confirmed_candidate_hash: 'different' }), /candidate|confirmation/);
  assert.equal(calls.record, 0);
  await service.recordDelegatedPromotionDecision(acceptance);
  assert.equal(calls.record, 1);
  assert.equal(calls.generate, 1, 'Human acceptance consumes the reviewed candidate without invoking the model again.');
});
