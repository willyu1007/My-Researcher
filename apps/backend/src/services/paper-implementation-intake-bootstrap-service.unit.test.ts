import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationFeedbackEvent,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeRecord,
  TopicSelectionPaperProjectBridgeWorkingCopyPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionDownstreamTopicFeedbackCreateInput,
  TopicSelectionDownstreamTopicFeedbackRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
} from '../repositories/paper-implementation.repository.js';
import {
  PaperImplementationIntakeBootstrapService,
  type PaperImplementationDownstreamFeedbackService,
} from './paper-implementation-intake-bootstrap-service.js';
import type {
  TopicSelectionV1cDownstreamFeedbackRecheckResult,
} from './topic-selection-v1c-downstream-feedback-recheck-service.js';

const NOW = '2026-05-20T00:00:00.000Z';

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
  ];
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
  };
  const paperProjectIntakeRef = ref(
    'paper_project_intake',
    'paper_project_intake_001',
    'bridge_payload_hash_001',
  );
  const targetPaperProjectRef = ref(
    'paper_project',
    'paper_project_001',
    'bridge_payload_hash_001',
  );
  const workingCopy: TopicSelectionPaperProjectBridgeWorkingCopyPayload = {
    editable_title: 'Working paper title',
    problem_statement: 'A concise problem statement.',
    contribution_summary: 'A focused contribution summary.',
    evaluation_plan: 'Run early feasibility checks.',
    initial_planning_notes: ['Preserve accepted risks during implementation intake.'],
    claim_ceiling: 'Correlation and mechanism claims only.',
    prohibited_claims: ['Do not claim causal proof.'],
    conditions: [
      {
        condition_id: 'condition_001',
        condition_code: 'verify_claim_ceiling',
        owner: { actor_type: 'human', actor_id: 'paper-owner' },
        required_action: {
          action_code: 'verify_claim_ceiling',
          severity: 'blocking',
          loopback_target: 'value',
          refs: [ref('topic_value_assessment', 'topic_value_assessment_001')],
          reason: 'Verify the claim ceiling before validation cycles.',
        },
        refs: [ref('topic_value_assessment', 'topic_value_assessment_001')],
        early_check_obligations: ['Verify claim ceiling before validation cycles.'],
      },
    ],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    early_check_obligations: ['Verify claim ceiling before validation cycles.'],
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
    conditions: workingCopy.conditions,
    accepted_risk_refs: workingCopy.accepted_risk_refs,
    allowed_refinements: [],
    early_check_obligations: workingCopy.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    working_copy_payload: workingCopy,
    working_copy_payload_hash: 'working_copy_payload_hash_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    paper_project_intake_ref: paperProjectIntakeRef,
    target_paper_project_ref: targetPaperProjectRef,
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
    source_promotion_handoff: bridge.source_promotion_handoff,
    ...overrides.handoff,
  };
}

class StubBridgeService {
  constructor(private readonly handoff: TopicSelectionPaperProjectBridgeHandoff) {}

  async getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff> {
    if (paperProjectBridgeId !== this.handoff.paper_project_bridge_id) {
      throw new AppError(404, 'NOT_FOUND', `PaperProjectBridge ${paperProjectBridgeId} not found.`);
    }
    return structuredClone(this.handoff);
  }
}

class RecordingDownstreamFeedbackService implements PaperImplementationDownstreamFeedbackService {
  readonly calls: TopicSelectionDownstreamTopicFeedbackCreateInput[] = [];

  async recordDownstreamTopicFeedback(
    input: TopicSelectionDownstreamTopicFeedbackCreateInput,
  ): Promise<TopicSelectionV1cDownstreamFeedbackRecheckResult> {
    this.calls.push(structuredClone(input));
    const feedbackId = `downstream_topic_feedback_${String(this.calls.length).padStart(3, '0')}`;
    const downstreamTopicFeedback: TopicSelectionDownstreamTopicFeedbackRecord = {
      downstream_topic_feedback_id: feedbackId,
      feedback_fingerprint: `fingerprint_${this.calls.length}`,
      workspace_id: input.workspace_id ?? null,
      title_card_id: 'title_card_001',
      paper_project_bridge_id: input.paper_project_bridge_id,
      paper_project_bridge_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
      source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_001'),
      promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_001'),
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_001'),
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      downstream_source_kind: input.downstream_source_kind,
      downstream_source_ref: input.downstream_source_ref,
      source_feedback_refs: input.source_feedback_refs ?? [],
      observed_blocker_refs: input.observed_blocker_refs ?? [],
      feedback_signal: input.feedback_signal,
      severity: input.severity,
      summary: input.summary,
      required_action: input.required_action ?? null,
      classification: {
        loopback_target: input.feedback_signal === 'paper_project_constraint_conflict'
          ? 'paper_project_intake'
          : 'evidence_or_search',
        loopback_cause: input.feedback_signal,
        severity: input.severity,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
        affected_stage: 'paper_project_bridge',
        source_refs: [input.downstream_source_ref],
        rationale: 'test classification',
        required_actions: input.required_action ? [input.required_action] : [],
      },
      recheck_request: {
        downstream_recheck_request_id: `downstream_recheck_request_${this.calls.length}`,
        feedback_ref: ref('downstream_topic_feedback', feedbackId),
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
        required_actions: input.required_action ? [input.required_action] : [],
        reason_codes: [input.feedback_signal],
        source_refs: [input.downstream_source_ref],
        created_at: NOW,
      },
      impact_summary: {
        impact_level: 'recheck_required',
        severity: input.severity,
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
        summary: 'test impact',
      },
      recheck_event_ref: null,
      recheck_impact_ref: null,
      decision_work_queue_item_ref: null,
      artifact_refs: input.artifact_refs ?? [],
      payload: input.feedback_payload ?? {},
      policy_version_id: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
      created_at: NOW,
    };
    return {
      downstream_topic_feedback: downstreamTopicFeedback,
      classification: downstreamTopicFeedback.classification,
      recheck_request: downstreamTopicFeedback.recheck_request ?? null,
      impact_summary: downstreamTopicFeedback.impact_summary,
    };
  }
}

class FailingDownstreamFeedbackService implements PaperImplementationDownstreamFeedbackService {
  async recordDownstreamTopicFeedback(): Promise<TopicSelectionV1cDownstreamFeedbackRecheckResult> {
    throw new AppError(503, 'INTERNAL_ERROR', 'Downstream feedback write failed.');
  }
}

class RecordingPaperImplementationRepository extends InMemoryPaperImplementationRepository {
  readonly createdFeedbackEvents: ImplementationFeedbackEvent[] = [];

  override async createFeedbackEvent(
    event: ImplementationFeedbackEvent,
  ): Promise<ImplementationFeedbackEvent> {
    this.createdFeedbackEvents.push(structuredClone(event));
    return super.createFeedbackEvent(event);
  }
}

class RaceReturningExistingBootstrapRepository extends InMemoryPaperImplementationRepository {
  override async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    const created = await super.createBootstrap(persistence);
    return {
      ...created,
      created: false,
    };
  }
}

function makeSubject(
  handoff: TopicSelectionPaperProjectBridgeHandoff = makeBridgeHandoff(),
  options: {
    repository?: InMemoryPaperImplementationRepository;
    downstreamFeedback?: PaperImplementationDownstreamFeedbackService;
  } = {},
) {
  const repository = options.repository ?? new InMemoryPaperImplementationRepository();
  const downstreamFeedback = options.downstreamFeedback ?? new RecordingDownstreamFeedbackService();
  const service = new PaperImplementationIntakeBootstrapService({
    repository,
    paperProjectBridgeService: new StubBridgeService(handoff),
    downstreamFeedbackService: downstreamFeedback,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return {
    downstreamFeedback: downstreamFeedback as RecordingDownstreamFeedbackService,
    repository,
    service,
  };
}

test('bootstrap from active PaperProjectBridge creates immutable intake snapshot and project', async () => {
  const { service } = makeSubject();

  const result = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    workspace_id: 'workspace_001',
    created_by: 'system',
  });

  assert.equal(result.project_created, true);
  assert.equal(result.implementation_project.paper_project_bridge_id, 'paper_project_bridge_001');
  assert.equal(result.implementation_project.bridge_payload_hash, 'bridge_payload_hash_001');
  assert.equal(result.implementation_project.lifecycle_status, 'active');
  assert.equal(result.implementation_project.freshness_status, 'fresh');
  assert.equal(result.intake_snapshot.implementation_project_id, result.implementation_project.implementation_project_id);
  assert.equal(result.intake_snapshot.promotion_commitment_profile_id, 'promotion_commitment_profile_001');
  assert.equal(result.intake_snapshot.source_refs.length > 0, true);
  assert.equal(result.intake_snapshot.condition_refs[0]?.ref_id, 'verify_claim_ceiling');
  assert.equal(result.handoff_to_motive.intake_snapshot_id, result.intake_snapshot.intake_snapshot_id);
  assert.equal(result.intake_snapshot.source_handoff.paper_project_intake_ref?.ref_type, 'paper_project_intake');
  assert.equal(result.implementation_project.target_paper_project_ref?.ref_type, 'paper_project');
  assert.deepEqual(
    result.implementation_project.target_paper_project_ref,
    result.intake_snapshot.target_paper_project_ref,
  );
});

test('duplicate bootstrap with same bridge/hash returns existing project idempotently', async () => {
  const { service } = makeSubject();
  const first = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });
  const second = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });

  assert.equal(second.project_created, false);
  assert.equal(
    second.implementation_project.implementation_project_id,
    first.implementation_project.implementation_project_id,
  );
  assert.equal(second.intake_snapshot.intake_snapshot_id, first.intake_snapshot.intake_snapshot_id);
});

test('bootstrap respects repository-level race-safe idempotency result', async () => {
  const { service } = makeSubject(makeBridgeHandoff(), {
    repository: new RaceReturningExistingBootstrapRepository(),
  });

  const result = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });

  assert.equal(result.project_created, false);
  assert.equal(result.implementation_project.paper_project_bridge_id, 'paper_project_bridge_001');
});

test('inactive handoff blocks bootstrap before implementation state is created', async () => {
  const handoff = makeBridgeHandoff({
    bridge: { bridge_status: 'superseded' },
    handoff: { bridge_status: 'superseded' as never },
  });
  const { service } = makeSubject(handoff);

  await assert.rejects(
    () => service.bootstrapProject({
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'bridge_payload_hash_001',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  await assert.rejects(
    () => service.getProjectByBridge('paper_project_bridge_001'),
    (error: unknown) => error instanceof AppError && error.errorCode === 'NOT_FOUND',
  );
});

test('hash mismatch and changed upstream hash block without mutating admitted implementation state', async () => {
  const { service } = makeSubject();

  await assert.rejects(
    () => service.bootstrapProject({
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'stale_hash',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  const admitted = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });
  await assert.rejects(
    () => service.bootstrapProject({
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'changed_hash',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  const readBack = await service.getProjectByBridge('paper_project_bridge_001');
  assert.equal(
    readBack.implementation_project.implementation_project_id,
    admitted.implementation_project.implementation_project_id,
  );
  assert.equal(readBack.implementation_project.bridge_payload_hash, 'bridge_payload_hash_001');
});

test('missing source refs blocks PaperImplementation intake', async () => {
  const handoff = makeBridgeHandoff({
    bridge: { source_refs: [] },
    handoff: { source_refs: [] },
  });
  const { service } = makeSubject(handoff);

  await assert.rejects(
    () => service.bootstrapProject({
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'bridge_payload_hash_001',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('unbound PaperProjectBridge fails before PaperImplementation writes', async () => {
  const handoff = makeBridgeHandoff({
    bridge: {
      paper_project_intake_ref: null,
      target_paper_project_ref: null,
    },
    handoff: {
      paper_project_intake_ref: null,
      target_paper_project_ref: null,
    },
  });
  const { repository, service } = makeSubject(handoff);

  await assert.rejects(
    () => service.bootstrapProject({
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'bridge_payload_hash_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.details?.reason_code === 'PAPER_PROJECT_BINDING_REQUIRED',
  );
  assert.equal(await repository.findProjectByBridgeId('paper_project_bridge_001'), null);
});

test('partial and mismatched PaperProject bindings fail closed before writes', async (t) => {
  const intakeRef = ref(
    'paper_project_intake',
    'paper_project_intake_001',
    'bridge_payload_hash_001',
  );
  const targetRef = ref('paper_project', 'paper_project_001', 'bridge_payload_hash_001');
  const cases: Array<{
    name: string;
    handoff: TopicSelectionPaperProjectBridgeHandoff;
  }> = [
    {
      name: 'intake-only half binding',
      handoff: makeBridgeHandoff({
        bridge: { paper_project_intake_ref: intakeRef, target_paper_project_ref: null },
        handoff: { paper_project_intake_ref: intakeRef, target_paper_project_ref: null },
      }),
    },
    {
      name: 'target-only half binding',
      handoff: makeBridgeHandoff({
        bridge: { paper_project_intake_ref: null, target_paper_project_ref: targetRef },
        handoff: { paper_project_intake_ref: null, target_paper_project_ref: targetRef },
      }),
    },
    {
      name: 'handoff and bridge ref drift',
      handoff: makeBridgeHandoff({
        handoff: {
          target_paper_project_ref: ref(
            'paper_project',
            'paper_project_drifted',
            'bridge_payload_hash_001',
          ),
        },
      }),
    },
    {
      name: 'cross-title-card target',
      handoff: makeBridgeHandoff({
        bridge: {
          target_paper_project_ref: {
            ...targetRef,
            title_card_id: 'title_card_foreign',
          },
        },
        handoff: {
          target_paper_project_ref: {
            ...targetRef,
            title_card_id: 'title_card_foreign',
          },
        },
      }),
    },
    {
      name: 'wrong intake ref type',
      handoff: makeBridgeHandoff({
        bridge: {
          paper_project_intake_ref: ref(
            'paper_project',
            'paper_project_intake_001',
            'bridge_payload_hash_001',
          ),
        },
        handoff: {
          paper_project_intake_ref: ref(
            'paper_project',
            'paper_project_intake_001',
            'bridge_payload_hash_001',
          ),
        },
      }),
    },
    {
      name: 'stale bridge-hash binding',
      handoff: makeBridgeHandoff({
        bridge: {
          target_paper_project_ref: {
            ...targetRef,
            version_id: 'stale_bridge_hash',
          },
        },
        handoff: {
          target_paper_project_ref: {
            ...targetRef,
            version_id: 'stale_bridge_hash',
          },
        },
      }),
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const { repository, service } = makeSubject(scenario.handoff);
      await assert.rejects(
        () => service.bootstrapProject({
          paper_project_bridge_id: 'paper_project_bridge_001',
          bridge_payload_hash: 'bridge_payload_hash_001',
        }),
        (error: unknown) => error instanceof AppError
          && error.statusCode === 409
          && error.errorCode === 'VERSION_CONFLICT'
          && error.details?.reason_code === 'PAPER_PROJECT_BINDING_CONFLICT',
      );
      assert.equal(await repository.findProjectByBridgeId('paper_project_bridge_001'), null);
    });
  }
});

test('legacy null-bound project is diagnostics-only on replay and project reads', async () => {
  const source = makeSubject();
  const admitted = await source.service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });
  const legacyRepository = new InMemoryPaperImplementationRepository();
  const legacySourceHandoff = structuredClone(admitted.intake_snapshot.source_handoff);
  legacySourceHandoff.paper_project_intake_ref = null;
  legacySourceHandoff.target_paper_project_ref = null;
  legacySourceHandoff.bridge.paper_project_intake_ref = null;
  legacySourceHandoff.bridge.target_paper_project_ref = null;
  await legacyRepository.createBootstrap({
    implementation_project: {
      ...admitted.implementation_project,
      target_paper_project_ref: null,
    },
    intake_snapshot: {
      ...admitted.intake_snapshot,
      source_handoff: legacySourceHandoff,
      target_paper_project_ref: null,
    },
  });
  const { service } = makeSubject(makeBridgeHandoff(), { repository: legacyRepository });
  const isLegacyRejection = (error: unknown) => error instanceof AppError
    && error.statusCode === 409
    && error.errorCode === 'GATE_CONSTRAINT_FAILED'
    && error.details?.reason_code === 'LEGACY_RECORD_NOT_ELIGIBLE'
    && error.details?.recovery === 'diagnostics_only';

  await assert.rejects(
    () => service.bootstrapProject({
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'bridge_payload_hash_001',
    }),
    isLegacyRejection,
  );
  await assert.rejects(
    () => service.getProject(admitted.implementation_project.implementation_project_id),
    isLegacyRejection,
  );
  await assert.rejects(
    () => service.getProjectByBridge('paper_project_bridge_001'),
    isLegacyRejection,
  );
  assert.equal(
    (await legacyRepository.findProjectByBridgeId('paper_project_bridge_001'))
      ?.target_paper_project_ref,
    null,
  );
});

test('target PaperProject ref is copied as link-only lineage', async () => {
  const targetPaperProjectRef = ref('paper_project', 'paper_project_existing', 'bridge_payload_hash_001');
  const handoff = makeBridgeHandoff({
    bridge: { target_paper_project_ref: targetPaperProjectRef },
    handoff: { target_paper_project_ref: targetPaperProjectRef },
  });
  const { service } = makeSubject(handoff);

  const result = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });

  assert.deepEqual(result.implementation_project.target_paper_project_ref, targetPaperProjectRef);
  assert.deepEqual(result.intake_snapshot.target_paper_project_ref, targetPaperProjectRef);
  assert.equal(result.project_created, true);
});

test('feedback event is append-only and calls downstream recheck as paper_implementation', async () => {
  const { downstreamFeedback, service } = makeSubject();
  const bootstrap = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });

  const first = await service.recordFeedbackEvent(
    bootstrap.implementation_project.implementation_project_id,
    {
      feedback_type: 'infeasible_route',
      severity: 'blocking',
      summary: 'The implementation route conflicts with a frozen paper project condition.',
      source_object_refs: [ref('implementation_plan', 'implementation_plan_001')],
      evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
      run_refs: [ref('experiment_run', 'experiment_run_001')],
      artifact_refs: [ref('artifact_ref', 'implementation_note_001')],
      created_by: 'system',
    },
  );
  const second = await service.recordFeedbackEvent(
    bootstrap.implementation_project.implementation_project_id,
    {
      feedback_type: 'lower_claim_ceiling',
      severity: 'warning',
      summary: 'The observed result lowers the admissible claim ceiling.',
      created_by: 'system',
    },
  );

  assert.notEqual(first.feedback_event.feedback_event_id, second.feedback_event.feedback_event_id);
  assert.equal(first.feedback_event.feedback_status, 'recheck_requested');
  assert.equal(first.feedback_event.paper_project_bridge_id, 'paper_project_bridge_001');
  assert.equal(downstreamFeedback.calls.length, 2);
  assert.equal(downstreamFeedback.calls[0]?.downstream_source_kind, 'paper_implementation');
  assert.equal(downstreamFeedback.calls[0]?.feedback_signal, 'paper_project_constraint_conflict');
  assert.equal(downstreamFeedback.calls[1]?.feedback_signal, 'overclaim');
  assert.equal((downstreamFeedback.calls[0]?.observed_blocker_refs ?? []).length, 2);
});

test('feedback event is persisted before downstream feedback is dispatched', async () => {
  const repository = new RecordingPaperImplementationRepository();
  const { service } = makeSubject(makeBridgeHandoff(), {
    repository,
    downstreamFeedback: new FailingDownstreamFeedbackService(),
  });
  const bootstrap = await service.bootstrapProject({
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
  });

  await assert.rejects(
    () => service.recordFeedbackEvent(
      bootstrap.implementation_project.implementation_project_id,
      {
        feedback_type: 'unavailable_data',
        severity: 'warning',
        summary: 'Required validation data is not available.',
        created_by: 'system',
      },
    ),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INTERNAL_ERROR',
  );

  assert.equal(repository.createdFeedbackEvents.length, 1);
  const persistedEvent = repository.createdFeedbackEvents[0];
  assert.equal(persistedEvent?.feedback_status, 'recheck_requested');
  assert.equal(persistedEvent?.downstream_topic_feedback_ref, null);
  assert.equal(persistedEvent?.payload.downstream_dispatch_status, 'requested');
  assert.equal(persistedEvent?.payload.source_kind, 'paper_implementation');
});
