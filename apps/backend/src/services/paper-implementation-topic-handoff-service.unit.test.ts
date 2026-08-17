import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  BootstrapImplementationProjectRequest,
  BootstrapImplementationProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeIntakeInput,
  TopicSelectionPaperProjectBridgeIntakeResult,
  TopicSelectionPaperProjectBridgeRecord,
  TopicSelectionPaperProjectBridgeWorkingCopyPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';

import { AppError } from '../errors/app-error.js';
import {
  PaperImplementationTopicHandoffService,
  type PaperImplementationTopicHandoffBootstrapService,
  type PaperImplementationTopicHandoffBridgeService,
} from './paper-implementation-topic-handoff-service.js';

const NOW = '2026-08-17T00:00:00.000Z';

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

function makeHandoff(): TopicSelectionPaperProjectBridgeHandoff {
  const workingCopy: TopicSelectionPaperProjectBridgeWorkingCopyPayload = {
    editable_title: 'Bounded retrieval study',
    problem_statement: 'Measure one retrieval-depth effect.',
    contribution_summary: 'Produce one traceable benchmark result.',
    evaluation_plan: 'Compare the admitted two-cell setup.',
    initial_planning_notes: ['Keep every non-treatment input fixed.'],
    claim_ceiling: 'Only claim the bounded benchmark comparison.',
    prohibited_claims: ['Do not generalize beyond the admitted setup.'],
    conditions: [],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    early_check_obligations: ['Verify the fixed metric before execution.'],
    source_lineage_summary: { source_count: 4 },
  };
  const bridge: TopicSelectionPaperProjectBridgeRecord = {
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_status: 'active',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    source_promotion_decision_id: 'promotion_decision_001',
    source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_001'),
    human_promotion_decision_ref: ref('human_promotion_decision', 'human_decision_001'),
    human_confirmed_decision_ref: ref('human_confirmed_decision', 'confirmed_decision_001'),
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_commitment_profile_ref: ref(
      'promotion_commitment_profile',
      'promotion_commitment_profile_001',
    ),
    promotion_gate_check_ref: ref('promotion_gate_check', 'promotion_gate_check_001'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_001'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    decision: 'promote_to_paper_project',
    conditions: [],
    accepted_risk_refs: workingCopy.accepted_risk_refs,
    allowed_refinements: [],
    early_check_obligations: workingCopy.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: [ref('topic_package', 'topic_package_001', 'v1')],
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_001',
      package_snapshot_hash: 'package_snapshot_hash_001',
      package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    },
    working_copy_payload: workingCopy,
    working_copy_payload_hash: 'working_copy_payload_hash_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    source_promotion_handoff: {} as never,
    artifact_refs: [],
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: ref(
      'paper_project_bridge',
      bridge.paper_project_bridge_id,
      bridge.bridge_payload_hash,
    ),
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
  };
}

function admittedHandoff(source: TopicSelectionPaperProjectBridgeHandoff) {
  const paperProjectIntakeRef = ref(
    'paper_project_intake',
    'paper_project_intake_001',
    source.bridge_payload_hash,
  );
  const paperProjectRef = ref('paper_project', 'P001', source.bridge_payload_hash);
  const bridge = {
    ...source.bridge,
    paper_project_intake_ref: paperProjectIntakeRef,
    target_paper_project_ref: paperProjectRef,
  };
  return {
    ...source,
    paper_project_intake_ref: paperProjectIntakeRef,
    target_paper_project_ref: paperProjectRef,
    bridge,
  };
}

class StatefulBridgeService implements PaperImplementationTopicHandoffBridgeService {
  readonly getCalls: string[] = [];
  readonly intakeCalls: TopicSelectionPaperProjectBridgeIntakeInput[] = [];
  private readonly source = makeHandoff();
  private admitted = false;

  async getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff> {
    this.getCalls.push(paperProjectBridgeId);
    if (paperProjectBridgeId !== this.source.paper_project_bridge_id) {
      throw new AppError(404, 'NOT_FOUND', 'PaperProjectBridge not found.');
    }
    return structuredClone(this.admitted ? admittedHandoff(this.source) : this.source);
  }

  async createPaperProjectIntakeFromBridge(
    input: TopicSelectionPaperProjectBridgeIntakeInput,
  ): Promise<TopicSelectionPaperProjectBridgeIntakeResult> {
    this.intakeCalls.push(structuredClone(input));
    const created = !this.admitted;
    this.admitted = true;
    const handoff = admittedHandoff(this.source);
    return {
      paper_project_bridge: handoff.bridge,
      handoff,
      paper_project_id: 'P001',
      paper_project_ref: handoff.target_paper_project_ref!,
      paper_project_intake_ref: handoff.paper_project_intake_ref!,
      paper_project_created: created,
      carried_literature_evidence_ids: ['LIT-001'],
      carried_accepted_risk_refs: handoff.accepted_risk_refs,
      carried_condition_refs: [],
    };
  }
}

class StatefulBootstrapService implements PaperImplementationTopicHandoffBootstrapService {
  readonly calls: BootstrapImplementationProjectRequest[] = [];
  private created = false;

  async bootstrapProject(
    request: BootstrapImplementationProjectRequest,
  ): Promise<BootstrapImplementationProjectResponse> {
    this.calls.push(structuredClone(request));
    const projectCreated = !this.created;
    this.created = true;
    const handoff = admittedHandoff(makeHandoff());
    return {
      implementation_project: {
        implementation_project_id: 'implementation_project_001',
        intake_snapshot_id: 'implementation_intake_snapshot_001',
        workspace_id: 'workspace_001',
        title_card_id: 'title_card_001',
        paper_project_bridge_id: handoff.paper_project_bridge_id,
        bridge_payload_hash: handoff.bridge_payload_hash,
        target_paper_project_ref: handoff.target_paper_project_ref,
        lifecycle_status: 'active',
        freshness_status: 'fresh',
        source_status: 'active',
        version_number: 1,
        policy_version_id: 'policy_v1',
        created_by: 'hybrid',
        created_at: NOW,
        updated_at: NOW,
      },
      intake_snapshot: {
        intake_snapshot_id: 'implementation_intake_snapshot_001',
        implementation_project_id: 'implementation_project_001',
        workspace_id: 'workspace_001',
        title_card_id: 'title_card_001',
        paper_project_bridge_id: handoff.paper_project_bridge_id,
        paper_project_bridge_ref: handoff.paper_project_bridge_ref,
        bridge_payload_hash: handoff.bridge_payload_hash,
        promotion_decision_id: handoff.source_promotion_decision_id,
        promotion_decision_ref: handoff.source_promotion_decision_ref,
        promotion_commitment_profile_id: handoff.bridge.promotion_commitment_profile_id,
        promotion_commitment_profile_ref: handoff.promotion_commitment_profile_ref,
        promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
        promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
        promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
        topic_package_id: handoff.topic_package_id,
        package_version: handoff.package_version,
        source_status: 'active',
        snapshot_hashes: handoff.snapshot_hashes,
        source_refs: handoff.source_refs,
        accepted_risk_refs: handoff.accepted_risk_refs,
        condition_refs: [],
        early_check_obligations: handoff.early_check_obligations,
        working_copy_payload: handoff.working_copy_payload,
        working_copy_payload_hash: handoff.working_copy_payload_hash,
        source_handoff: handoff,
        target_paper_project_ref: handoff.target_paper_project_ref,
        intake_snapshot_hash: 'implementation_intake_snapshot_hash_001',
        policy_version_id: 'policy_v1',
        created_by: 'hybrid',
        created_at: NOW,
      },
      project_created: projectCreated,
      handoff_to_motive: {
        implementation_project_id: 'implementation_project_001',
        intake_snapshot_id: 'implementation_intake_snapshot_001',
        title_card_id: handoff.bridge.title_card_id,
        topic_package_id: handoff.topic_package_id,
        package_version: handoff.package_version,
        source_refs: handoff.source_refs,
        accepted_risk_refs: handoff.accepted_risk_refs,
        condition_refs: [],
        early_check_obligations: handoff.early_check_obligations,
      },
    };
  }
}

test('topic handoff creates once, resumes on replay, and preserves owner semantics', async () => {
  const bridgeService = new StatefulBridgeService();
  const bootstrapService = new StatefulBootstrapService();
  const service = new PaperImplementationTopicHandoffService({
    bridgeService,
    bootstrapService,
  });

  const first = await service.continueFromTopic({
    paper_project_bridge_id: 'paper_project_bridge_001',
  });
  assert.equal(first.status, 'created');
  assert.deepEqual(first.effects, {
    paper_project_created: true,
    implementation_project_created: true,
  });
  assert.equal(first.semantic_context.problem_statement, 'Measure one retrieval-depth effect.');
  assert.equal(first.semantic_context.claim_ceiling, 'Only claim the bounded benchmark comparison.');
  assert.equal(first.lineage.paper_project_ref.ref_id, 'P001');
  assert.equal(first.lineage.implementation_project_id, 'implementation_project_001');

  const second = await service.continueFromTopic({
    paper_project_bridge_id: 'paper_project_bridge_001',
  });
  assert.equal(second.status, 'resumed');
  assert.deepEqual(second.effects, {
    paper_project_created: false,
    implementation_project_created: false,
  });
  assert.deepEqual(second.lineage, first.lineage);
  assert.deepEqual(second.semantic_context, first.semantic_context);

  assert.equal(bridgeService.getCalls.length, 2);
  assert.equal(bridgeService.intakeCalls.length, 2);
  assert.equal(bootstrapService.calls.length, 2);
  assert.deepEqual(bridgeService.intakeCalls[0], {
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    workspace_id: 'workspace_001',
    created_by: 'hybrid',
  });
  assert.deepEqual(bootstrapService.calls[0], {
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    workspace_id: 'workspace_001',
    created_by: 'hybrid',
  });
});

test('topic handoff rejects a blank bridge id before calling either owner', async () => {
  const bridgeService = new StatefulBridgeService();
  const bootstrapService = new StatefulBootstrapService();
  const service = new PaperImplementationTopicHandoffService({
    bridgeService,
    bootstrapService,
  });

  await assert.rejects(
    service.continueFromTopic({ paper_project_bridge_id: '  ' }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.equal(bridgeService.getCalls.length, 0);
  assert.equal(bridgeService.intakeCalls.length, 0);
  assert.equal(bootstrapService.calls.length, 0);
});

test('topic handoff preserves bridge-owner rejection and stops before downstream writes', async () => {
  const ownerError = new AppError(409, 'VERSION_CONFLICT', 'PaperProjectBridge is inactive.');
  let intakeCalls = 0;
  let bootstrapCalls = 0;
  const service = new PaperImplementationTopicHandoffService({
    bridgeService: {
      async getPaperProjectBridgeHandoff() {
        throw ownerError;
      },
      async createPaperProjectIntakeFromBridge() {
        intakeCalls += 1;
        throw new Error('unexpected intake call');
      },
    },
    bootstrapService: {
      async bootstrapProject() {
        bootstrapCalls += 1;
        throw new Error('unexpected bootstrap call');
      },
    },
  });

  await assert.rejects(
    service.continueFromTopic({ paper_project_bridge_id: 'paper_project_bridge_001' }),
    (error: unknown) => error === ownerError,
  );
  assert.equal(intakeCalls, 0);
  assert.equal(bootstrapCalls, 0);
});

test('topic handoff preserves bootstrap failure after accepted PaperProject progress', async () => {
  const bridgeService = new StatefulBridgeService();
  const ownerError = new AppError(409, 'VERSION_CONFLICT', 'ImplementationProject lineage conflicts.');
  const service = new PaperImplementationTopicHandoffService({
    bridgeService,
    bootstrapService: {
      async bootstrapProject() {
        throw ownerError;
      },
    },
  });

  await assert.rejects(
    service.continueFromTopic({ paper_project_bridge_id: 'paper_project_bridge_001' }),
    (error: unknown) => error === ownerError,
  );
  assert.equal(bridgeService.intakeCalls.length, 1);

  const handoff = await bridgeService.getPaperProjectBridgeHandoff('paper_project_bridge_001');
  assert.equal(handoff.target_paper_project_ref?.ref_id, 'P001');
  assert.equal(handoff.paper_project_intake_ref?.ref_id, 'paper_project_intake_001');
});
