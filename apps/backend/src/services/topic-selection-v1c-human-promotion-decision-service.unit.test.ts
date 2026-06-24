import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { Prisma } from '@prisma/client';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPromotionCondition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionArgumentReadinessMiniCheckRecord,
  TopicSelectionPromotionDecisionSupportRecord,
  TopicSelectionPromotionDossierRecord,
  TopicSelectionPromotionGateCheckRecord,
  TopicSelectionPromotionGateHandoff,
  TopicSelectionPromotionGateRequiredAction,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionV1cHumanPromotionDecisionRepository } from '../repositories/in-memory-topic-selection-v1c-human-promotion-decision-repository.js';
import { PrismaTopicSelectionV1cHumanPromotionDecisionRepository } from '../repositories/prisma/prisma-topic-selection-v1c-human-promotion-decision-repository.js';
import {
  TopicSelectionV1cHumanPromotionDecisionService,
  type RecordHumanPromotionDecisionInput,
} from './topic-selection-v1c-human-promotion-decision-service.js';

const NOW = '2026-05-15T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
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

function requiredAction(
  actionCode = 'refine_package_summary',
  loopbackTarget: TopicSelectionPromotionGateRequiredAction['loopback_target'] = 'package',
): TopicSelectionPromotionGateRequiredAction {
  return {
    action_code: actionCode,
    severity: 'blocking',
    loopback_target: loopbackTarget,
    refs: [ref(loopbackTarget === 'evidence_or_search' ? 'recheck_request' : 'topic_package', `${actionCode}_ref`)],
    reason: `Required action ${actionCode}.`,
  };
}

function makeGateHandoff(
  overrides: Partial<TopicSelectionPromotionGateHandoff> = {},
): TopicSelectionPromotionGateHandoff {
  const promotionInputSnapshotRef = ref('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const sourceRefs = [
    promotionInputSnapshotRef,
    ref('topic_package', 'topic_package_001', 'v1'),
    ref('topic_question', 'topic_question_001'),
  ];
  const support: TopicSelectionPromotionDecisionSupportRecord = {
    promotion_decision_support_id: 'promotion_decision_support_001',
    support_run_key: 'support_run_key_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    support_generation_mode: 'deterministic',
    support_status: 'succeeded',
    summary: 'Ready for human promotion decision.',
    reviewer_questions: [],
    risk_notes: [],
    recheck_notes: [],
    source_refs: sourceRefs,
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    warnings: [],
    llm_draft_payload: null,
    input_snapshot_id: 'input_snapshot_gate_001',
    workflow_run_id: 'workflow_run_gate_001',
    artifact_refs: [ref('artifact_ref', 'artifact_ref_support_001')],
    created_by: 'system',
    created_at: NOW,
  };
  const dossier: TopicSelectionPromotionDossierRecord = {
    promotion_dossier_id: 'promotion_dossier_001',
    support_run_key: support.support_run_key,
    workspace_id: support.workspace_id,
    title_card_id: support.title_card_id,
    promotion_decision_support_id: support.promotion_decision_support_id,
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    topic_package_id: support.topic_package_id,
    package_version: support.package_version,
    summary: 'Reviewer packet.',
    reviewer_packet_artifact_ref: ref('artifact_ref', 'artifact_ref_dossier_001'),
    dossier_payload: {
      source_snapshot_excerpt: {
        topic_package_id: 'topic_package_001',
        package_version: 'v1',
        contribution_summary: 'A focused contribution summary.',
        evaluation_plan: 'A bounded evaluation plan.',
        claim_ceiling: 'Correlation and mechanism claims only.',
        prohibited_claims: ['Do not claim causal proof.'],
        selected_literature_evidence_ids: ['literature_evidence_001'],
        selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
      },
    },
    source_refs: sourceRefs,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_dossier_001')],
    created_by: 'system',
    created_at: NOW,
  };
  const mini: TopicSelectionArgumentReadinessMiniCheckRecord = {
    argument_readiness_mini_check_id: 'argument_readiness_mini_check_001',
    support_run_key: support.support_run_key,
    workspace_id: support.workspace_id,
    title_card_id: support.title_card_id,
    promotion_decision_support_id: support.promotion_decision_support_id,
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    check_status: 'passed',
    check_items: [
      {
        check_key: 'claim_ceiling_visible',
        status: 'passed',
        message: 'Claim ceiling is visible.',
        refs: [ref('topic_question_contract', 'topic_question_contract_001')],
      },
    ],
    blockers: [],
    warnings: [],
    required_actions: [],
    early_check_obligations: ['Re-check claim wording before outline lock.'],
    source_refs: sourceRefs,
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  };
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: support.promotion_input_snapshot_hash,
  };
  const gate: TopicSelectionPromotionGateCheckRecord = {
    promotion_gate_check_id: 'promotion_gate_check_001',
    support_run_key: support.support_run_key,
    workspace_id: support.workspace_id,
    title_card_id: support.title_card_id,
    promotion_decision_support_id: support.promotion_decision_support_id,
    promotion_dossier_id: dossier.promotion_dossier_id,
    argument_readiness_mini_check_id: mini.argument_readiness_mini_check_id,
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    promotion_input_snapshot_hash: support.promotion_input_snapshot_hash,
    disposition: 'ready_for_human_decision',
    promote_allowed: true,
    blockers: [],
    warnings: [],
    required_actions: [],
    loopback_hints: [],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    input_snapshot_id: 'input_snapshot_gate_001',
    workflow_run_id: 'workflow_run_gate_001',
    gate_result_id: 'readiness_gate_result_gate_001',
    transition_attempt_id: 'transition_attempt_gate_001',
    trace_snapshot_id: 'trace_snapshot_gate_001',
    artifact_refs: [ref('artifact_ref', 'artifact_ref_gate_001')],
    created_by: 'system',
    created_at: NOW,
  };
  const base: TopicSelectionPromotionGateHandoff = {
    promotion_gate_check_id: gate.promotion_gate_check_id,
    promotion_gate_check_ref: ref('promotion_gate_check', gate.promotion_gate_check_id),
    promotion_decision_support_ref: ref('promotion_decision_support', support.promotion_decision_support_id),
    promotion_dossier_ref: ref('promotion_dossier', dossier.promotion_dossier_id),
    argument_readiness_mini_check_ref: ref('argument_readiness_mini_check', mini.argument_readiness_mini_check_id),
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    promotion_input_snapshot_hash: support.promotion_input_snapshot_hash,
    topic_package_id: support.topic_package_id,
    package_version: support.package_version,
    disposition: gate.disposition,
    promote_allowed: gate.promote_allowed,
    required_actions: gate.required_actions,
    loopback_hints: gate.loopback_hints,
    accepted_risk_refs: gate.accepted_risk_refs,
    blocker_refs: gate.blocker_refs,
    recheck_request_refs: gate.recheck_request_refs,
    memory_suggestion_refs: gate.memory_suggestion_refs,
    snapshot_hashes: snapshotHashes,
    support,
    dossier,
    argument_readiness_mini_check: mini,
    gate_check: gate,
  };
  const next = {
    ...base,
    ...overrides,
  };
  return {
    ...next,
    gate_check: {
      ...gate,
      ...(overrides.gate_check ?? {}),
    },
    support: {
      ...support,
      ...(overrides.support ?? {}),
    },
    dossier: {
      ...dossier,
      ...(overrides.dossier ?? {}),
    },
    argument_readiness_mini_check: {
      ...mini,
      ...(overrides.argument_readiness_mini_check ?? {}),
    },
  };
}

function makeCondition(): TopicSelectionPromotionCondition {
  const action = requiredAction('clarify_contribution_claim', 'package');
  return {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: action,
    refs: action.refs,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    verification_note: 'Human-visible condition.',
  };
}

class StubPromotionGateService {
  private readonly latestByInputSnapshotId = new Map<string, TopicSelectionPromotionGateHandoff>();
  readonly handoffsByGateCheckId = new Map<string, TopicSelectionPromotionGateHandoff>();

  constructor(handoff: TopicSelectionPromotionGateHandoff = makeGateHandoff()) {
    this.addHandoff(handoff, true);
  }

  addHandoff(handoff: TopicSelectionPromotionGateHandoff, latest: boolean): void {
    this.handoffsByGateCheckId.set(handoff.promotion_gate_check_id, handoff);
    if (latest) {
      this.latestByInputSnapshotId.set(handoff.promotion_input_snapshot_id, handoff);
    }
  }

  async getPromotionGateHandoff(
    promotionGateCheckId: string,
  ): Promise<TopicSelectionPromotionGateHandoff> {
    const handoff = this.handoffsByGateCheckId.get(promotionGateCheckId);
    if (!handoff) {
      throw new AppError(404, 'NOT_FOUND', `PromotionGateCheck ${promotionGateCheckId} not found.`);
    }
    return handoff;
  }

  async getLatestPromotionGateHandoffByPromotionInputSnapshotId(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionGateHandoff> {
    const handoff = this.latestByInputSnapshotId.get(promotionInputSnapshotId);
    if (!handoff) {
      throw new AppError(404, 'NOT_FOUND', `PromotionGateCheck for ${promotionInputSnapshotId} not found.`);
    }
    return handoff;
  }
}

function makeSubject(handoff: TopicSelectionPromotionGateHandoff = makeGateHandoff()) {
  const repository = new InMemoryTopicSelectionV1cHumanPromotionDecisionRepository();
  const promotionGateService = new StubPromotionGateService(handoff);
  const service = new TopicSelectionV1cHumanPromotionDecisionService({
    repository,
    promotionGateService,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return {
    repository,
    promotionGateService,
    service,
  };
}

test('ready gate and human promote decision create commitment profile and T-064 handoff', async () => {
  const { service, repository } = makeSubject();

  const result = await service.recordHumanPromotionDecision({
    promotion_gate_check_id: 'promotion_gate_check_001',
    decision: 'promote_to_paper_project',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready to promote.',
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
  });
  const stored = await repository.findBundleByPromotionDecisionId(
    result.promotion_decision.promotion_decision_id,
  );
  const bridgeHandoff = await service.getPromotionBridgeHandoff(
    result.promotion_decision.promotion_decision_id,
  );

  assert.equal(result.promotion_decision.bridge_eligible, true);
  assert.equal(result.promotion_commitment_profile?.claim_ceiling, 'Correlation and mechanism claims only.');
  assert.deepEqual(
    result.promotion_commitment_profile?.scope.selected_literature_evidence_ids,
    ['literature_evidence_001'],
  );
  assert.equal(result.bridge_handoff?.promotion_decision_id, result.promotion_decision.promotion_decision_id);
  assert.equal(bridgeHandoff.topic_package_id, 'topic_package_001');
  assert.equal(stored?.human_promotion_decision.human_confirmed_decision_id, 'human_confirmed_decision_001');
});

test('promote_with_conditions requires and freezes conditions in commitment handoff', async () => {
  const { service } = makeSubject();
  const condition = makeCondition();

  const result = await service.recordHumanPromotionDecision({
    promotion_gate_check_id: 'promotion_gate_check_001',
    decision: 'promote_with_conditions',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready with a condition.',
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    conditions: [condition],
    allowed_refinements: [
      {
        refinement_code: 'wording_only',
        scope: 'title_and_abstract_claim_wording',
        refs: [ref('topic_package', 'topic_package_001')],
      },
    ],
  });

  assert.equal(result.promotion_commitment_profile?.conditions[0]?.condition_code, 'clarify_contribution_claim');
  assert.equal(
    result.bridge_handoff?.early_check_obligations.includes('Re-check contribution claim before outline lock.'),
    true,
  );

  await assert.rejects(
    () => makeSubject().service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_with_conditions',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Missing condition.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('promote_with_conditions rejects malformed condition details', async () => {
  const condition = makeCondition();
  const baseInput = {
    promotion_gate_check_id: 'promotion_gate_check_001',
    decision: 'promote_with_conditions' as const,
    human_actor: {
      actor_type: 'human' as const,
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready with condition details.',
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
  };

  await assert.rejects(
    () => makeSubject().service.recordHumanPromotionDecision({
      ...baseInput,
      conditions: [
        {
          ...condition,
          owner: null,
        } as unknown as TopicSelectionPromotionCondition,
      ],
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => makeSubject().service.recordHumanPromotionDecision({
      ...baseInput,
      conditions: [
        {
          ...condition,
          refs: [],
        },
      ],
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => makeSubject().service.recordHumanPromotionDecision({
      ...baseInput,
      conditions: [
        {
          ...condition,
          early_check_obligations: [],
        },
      ],
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('promote decisions require claim ceiling from gate dossier', async () => {
  const handoff = makeGateHandoff({
    dossier: {
      dossier_payload: {
        source_snapshot_excerpt: {
          topic_package_id: 'topic_package_001',
          package_version: 'v1',
          contribution_summary: 'A focused contribution summary.',
          evaluation_plan: 'A bounded evaluation plan.',
          prohibited_claims: ['Do not claim causal proof.'],
          selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
        },
      },
    } as never,
  });
  const { service, repository } = makeSubject(handoff);

  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Ready to promote.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && /claim ceiling/.test(error.message),
  );
  assert.equal(await repository.findCurrentBundleByPromotionInputSnapshotId('promotion_input_snapshot_001'), null);
});

test('non-ready gates reject promote decisions and accept typed non-promote loopback', async () => {
  const action = requiredAction('resolve_recheck_before_promotion', 'evidence_or_search');
  const blockedHandoff = makeGateHandoff({
    disposition: 'recheck_required',
    promote_allowed: false,
    required_actions: [action],
    gate_check: {
      disposition: 'recheck_required',
      promote_allowed: false,
      required_actions: [action],
    } as never,
  });
  const { service, repository } = makeSubject(blockedHandoff);

  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Trying to promote blocked gate.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const result = await service.recordHumanPromotionDecision({
    promotion_gate_check_id: 'promotion_gate_check_001',
    decision: 'recheck_evidence_or_search',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Route back to recheck.',
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
  });

  assert.equal(result.promotion_decision.bridge_eligible, false);
  assert.equal(result.promotion_decision.loopback_target, 'evidence_or_search');
  assert.equal(result.promotion_decision.required_actions[0]?.action_code, 'resolve_recheck_before_promotion');
  assert.equal(result.bridge_handoff, null);
  await assert.rejects(
    () => service.getPromotionBridgeHandoff(result.promotion_decision.promotion_decision_id),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(await repository.findCurrentBundleByPromotionInputSnapshotId('promotion_input_snapshot_001') !== null, true);
});

test('actor, snapshot hash, workspace, and stale gate checks reject before persistence', async () => {
  const { service, repository, promotionGateService } = makeSubject();

  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'system',
      },
      rationale: 'Not a human actor.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Wrong hash.',
      confirmed_snapshot_hash: 'other_hash',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Workspace mismatch.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
      workspace_id: 'workspace_other',
    }),
    (error) => error instanceof AppError && /workspace mismatch/.test(error.message),
  );
  const latest = makeGateHandoff({
    promotion_gate_check_id: 'promotion_gate_check_002',
    promotion_gate_check_ref: ref('promotion_gate_check', 'promotion_gate_check_002'),
    gate_check: {
      promotion_gate_check_id: 'promotion_gate_check_002',
    } as never,
  });
  promotionGateService.addHandoff(latest, true);
  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Stale gate.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    }),
    (error) => error instanceof AppError && /stale/.test(error.message),
  );
  assert.equal(await repository.findCurrentBundleByPromotionInputSnapshotId('promotion_input_snapshot_001'), null);
});

test('same human decision key is idempotent while same snapshot different decision conflicts', async () => {
  const { service } = makeSubject();
  const input = {
    promotion_gate_check_id: 'promotion_gate_check_001',
    decision: 'promote_to_paper_project' as const,
    human_actor: {
      actor_type: 'human' as const,
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready to promote.',
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
  };

  const first = await service.recordHumanPromotionDecision(input);
  const second = await service.recordHumanPromotionDecision(input);

  assert.equal(second.promotion_decision.promotion_decision_id, first.promotion_decision.promotion_decision_id);
  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      ...input,
      decision: 'park',
      rationale: 'Different decision.',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('Prisma human promotion repository round-trips all records and control-plane refs', async () => {
  const fake = new FakeHumanPromotionPrismaClient();
  const repository = new PrismaTopicSelectionV1cHumanPromotionDecisionRepository(fake.client);
  const service = new TopicSelectionV1cHumanPromotionDecisionService({
    repository,
    promotionGateService: new StubPromotionGateService(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const result = await service.recordHumanPromotionDecision({
    promotion_gate_check_id: 'promotion_gate_check_001',
    decision: 'promote_with_conditions',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready with conditions.',
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    conditions: [makeCondition()],
  });
  const decision = await repository.findPromotionDecisionById(result.promotion_decision.promotion_decision_id);
  const commitment = await repository.findCommitmentProfileById(
    result.promotion_commitment_profile?.promotion_commitment_profile_id ?? '',
  );
  const bridge = await service.getPromotionBridgeHandoff(result.promotion_decision.promotion_decision_id);

  assert.equal(decision?.decision, 'promote_with_conditions');
  assert.equal(commitment?.conditions[0]?.condition_code, 'clarify_contribution_claim');
  assert.equal(bridge.promotion_commitment_profile.claim_ceiling, 'Correlation and mechanism claims only.');
  assert.equal(fake.humanConfirmedDecisions.size, 1);
  assert.equal(fake.traceSnapshots.size, 1);
});

test('Prisma current snapshot unique conflict maps to VERSION_CONFLICT', async () => {
  const fake = new FakeHumanPromotionPrismaClient({
    promotionDecisionUniqueConflictFieldOnCreate: 'currentPromotionInputSnapshotKey',
  });
  const repository = new PrismaTopicSelectionV1cHumanPromotionDecisionRepository(fake.client);
  const service = new TopicSelectionV1cHumanPromotionDecisionService({
    repository,
    promotionGateService: new StubPromotionGateService(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  await assert.rejects(
    () => service.recordHumanPromotionDecision({
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Ready to promote.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'VERSION_CONFLICT'
      && /already has a current PromotionDecision/.test(error.message),
  );
});

test('human promotion migration declares tables, unique current snapshot key, and lookups', async () => {
  const sql = await fs.readFile(
    new URL('../../../../prisma/migrations/20260515143000_add_topic_selection_v1c_human_promotion_decision_profile/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE "TopicSelectionHumanPromotionDecision"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionPromotionDecision"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionPromotionCommitmentProfile"/);
  assert.match(sql, /tshpd_decision_key_key/);
  assert.match(sql, /tspd_current_input_snapshot_key/);
  assert.match(sql, /tspcp_promotion_decision_key/);
});

// T-128 W-13 provenance-integrity guard. The pure-human POST /topic-selection/v1c/promotion-decisions route uses
// additionalProperties:true, so an unknown body field survives schema validation and reaches the controller, which
// passes request.body straight into recordHumanPromotionDecision. This proves a caller-smuggled
// `delegated_decision_provenance` on the decision input is NOT persisted — a fully-human decision can never be
// falsely stamped as agent-delegated (the inverse of impersonation; this protects audit trust). The guard must hold
// regardless of decision class, so it is exercised on both a promote (bridge-eligible) and a non-promote (park)
// decision — each in a fresh subject, since one promotion input snapshot can carry only one current decision.
for (const decision of ['promote_to_paper_project', 'park'] as const) {
  test(`pure-human writer ignores a spoofed delegated_decision_provenance on a ${decision} decision (not persisted)`, async () => {
    const { service, repository } = makeSubject();

    // A hostile HTTP client smuggling a fabricated provenance marker through the additionalProperties:true body.
    const spoofedBody = {
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision,
      human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
      rationale: 'Fully human decision.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
      delegated_decision_provenance: {
        source: 'codex_delegated',
        admission_identity_hash: 'forged_admission_identity_hash',
      },
    } as unknown as RecordHumanPromotionDecisionInput;

    const result = await service.recordHumanPromotionDecision(spoofedBody);
    const stored = await repository.findPromotionDecisionById(result.promotion_decision.promotion_decision_id);

    assert.equal(
      result.promotion_decision.delegated_decision_provenance ?? null,
      null,
      'a fully-human decision must never be stamped as agent-delegated from a request-body field',
    );
    assert.equal(stored?.delegated_decision_provenance ?? null, null);
  });
}

// The legitimate delegated path (the N4 service) stamps the marker via the writer's internal-options channel —
// proving the guard narrows the write surface WITHOUT weakening real delegated-provenance stamping.
test('delegated path stamps delegated_decision_provenance via the internal-options channel', async () => {
  const { service, repository } = makeSubject();
  const provenance = {
    source: 'codex_delegated' as const,
    admission_identity_hash: 'admission_identity_hash_001',
  };

  const result = await service.recordHumanPromotionDecision(
    {
      promotion_gate_check_id: 'promotion_gate_check_001',
      decision: 'promote_to_paper_project',
      human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
      rationale: 'Human-authorized, agent-drafted decision.',
      confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    },
    { delegatedDecisionProvenance: provenance },
  );
  const stored = await repository.findPromotionDecisionById(result.promotion_decision.promotion_decision_id);

  assert.deepEqual(result.promotion_decision.delegated_decision_provenance, provenance);
  assert.deepEqual(stored?.delegated_decision_provenance, provenance);
});

class FakeModel {
  readonly rows = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly uniqueFields: string[] = [],
    private readonly uniqueConflictFieldOnCreate: string | null = null,
  ) {}

  async create({ data }: { data: Record<string, unknown> }) {
    if (this.uniqueConflictFieldOnCreate) {
      throw new Prisma.PrismaClientKnownRequestError(
        `duplicate ${this.uniqueConflictFieldOnCreate}`,
        {
          clientVersion: 'test',
          code: 'P2002',
          meta: { target: [this.uniqueConflictFieldOnCreate] },
        },
      );
    }
    for (const field of this.uniqueFields) {
      if (data[field] !== null && data[field] !== undefined) {
        const duplicate = [...this.rows.values()].some((row) => row[field] === data[field]);
        if (duplicate) {
          throw new Prisma.PrismaClientKnownRequestError(`duplicate ${field}`, {
            clientVersion: 'test',
            code: 'P2002',
            meta: { target: [field] },
          });
        }
      }
    }
    this.rows.set(String(data.id), data);
    return data;
  }

  async findUnique({ where }: { where: Record<string, unknown> }) {
    return [...this.rows.values()].find((row) => this.matches(row, where)) ?? null;
  }

  async findFirst(input: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> } = {}) {
    const rows = [...this.rows.values()]
      .filter((row) => this.matches(row, input.where ?? {}))
      .sort((left, right) => {
        if (!input.orderBy || !('createdAt' in input.orderBy)) {
          return 0;
        }
        const leftDate = left.createdAt instanceof Date ? left.createdAt.toISOString() : String(left.createdAt);
        const rightDate = right.createdAt instanceof Date ? right.createdAt.toISOString() : String(right.createdAt);
        return rightDate.localeCompare(leftDate);
      });
    return rows[0] ?? null;
  }

  private matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => row[key] === value);
  }
}

type FakeHumanPromotionPrismaClientOptions = {
  promotionDecisionUniqueConflictFieldOnCreate?: string;
};

class FakeHumanPromotionPrismaClient {
  readonly inputSnapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  readonly workflowRuns = new Map<string, TopicSelectionLlmWorkflowRunRecord>();
  readonly artifactRefs = new Map<string, TopicSelectionArtifactRefRecord>();
  readonly gateResults = new Map<string, TopicSelectionReadinessGateResultRecord>();
  readonly transitionAttempts = new Map<string, TopicSelectionChainTransitionAttemptRecord>();
  readonly traceSnapshots = new Map<string, TopicSelectionTraceSnapshotRecord>();
  readonly humanConfirmedDecisions = new Map<string, TopicSelectionHumanConfirmedDecisionRecord>();
  readonly humanPromotionModel: FakeModel;
  readonly promotionDecisionModel: FakeModel;
  readonly commitmentProfileModel: FakeModel;
  readonly client: any;

  constructor(options: FakeHumanPromotionPrismaClientOptions = {}) {
    this.humanPromotionModel = new FakeModel(['humanPromotionDecisionKey']);
    this.promotionDecisionModel = new FakeModel(
      ['currentPromotionInputSnapshotKey'],
      options.promotionDecisionUniqueConflictFieldOnCreate ?? null,
    );
    this.commitmentProfileModel = new FakeModel(['promotionDecisionId']);
    this.client = {
      $transaction: async (callback: (tx: any) => Promise<void>) => callback(this.client),
      topicSelectionInputSnapshot: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.inputSnapshots.set(String(data.id), data as unknown as TopicSelectionInputSnapshotRecord);
          return data;
        },
      },
      topicSelectionLlmWorkflowRun: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.workflowRuns.set(String(data.id), data as unknown as TopicSelectionLlmWorkflowRunRecord);
          return data;
        },
      },
      topicSelectionArtifactRef: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.artifactRefs.set(String(data.id), data as unknown as TopicSelectionArtifactRefRecord);
          return data;
        },
      },
      topicSelectionReadinessGateResult: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.gateResults.set(String(data.id), data as unknown as TopicSelectionReadinessGateResultRecord);
          return data;
        },
      },
      topicSelectionChainTransitionAttempt: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.transitionAttempts.set(String(data.id), data as unknown as TopicSelectionChainTransitionAttemptRecord);
          return data;
        },
      },
      topicSelectionTraceSnapshot: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.traceSnapshots.set(String(data.id), data as unknown as TopicSelectionTraceSnapshotRecord);
          return data;
        },
      },
      topicSelectionHumanConfirmedDecision: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.humanConfirmedDecisions.set(String(data.id), data as unknown as TopicSelectionHumanConfirmedDecisionRecord);
          return data;
        },
      },
      topicSelectionHumanPromotionDecision: this.humanPromotionModel,
      topicSelectionPromotionDecision: this.promotionDecisionModel,
      topicSelectionPromotionCommitmentProfile: this.commitmentProfileModel,
    };
  }
}
