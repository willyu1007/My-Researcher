import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
  type TopicSelectionPromotionCondition,
  type TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPromotionGateHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import {
  InMemoryTopicSelectionV1cHumanPromotionDecisionRepository,
} from '../repositories/in-memory-topic-selection-v1c-human-promotion-decision-repository.js';
import type {
  TopicSelectionV1cHumanPromotionDecisionPersistenceBundle,
} from '../repositories/topic-selection-v1c-human-promotion-decision.repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  createTopicSelectionV1cAcceptanceIdFactory,
  topicSelectionV1cAcceptanceRef,
} from './topic-selection-v1c-acceptance-scenario-fixtures.js';
import {
  TopicSelectionV1cHumanPromotionDecisionService,
} from './topic-selection-v1c-human-promotion-decision-service.js';
import {
  TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService,
} from './topic-selection-v1c-n4-delegated-promotion-decision-admission-service.js';
import {
  TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService,
  buildV1cN4DelegatedPromotionDecisionSystemContent,
} from './topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.js';
import {
  sha256Text,
} from './literature-content-processing-utils.js';

const NOW = TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP;

class RecordingHumanPromotionDecisionRepository
  extends InMemoryTopicSelectionV1cHumanPromotionDecisionRepository {
  readonly writes: TopicSelectionV1cHumanPromotionDecisionPersistenceBundle[] = [];

  override async createBundle(
    persistence: TopicSelectionV1cHumanPromotionDecisionPersistenceBundle,
  ): ReturnType<InMemoryTopicSelectionV1cHumanPromotionDecisionRepository['createBundle']> {
    this.writes.push(persistence);
    return super.createBundle(persistence);
  }
}

class GateHandoffProvider {
  constructor(private readonly handoff: TopicSelectionPromotionGateHandoff) {}

  async getPromotionGateHandoff(promotionGateCheckId: string): Promise<TopicSelectionPromotionGateHandoff> {
    assert.equal(promotionGateCheckId, this.handoff.promotion_gate_check_id);
    return this.handoff;
  }

  async getLatestPromotionGateHandoffByPromotionInputSnapshotId(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionGateHandoff> {
    assert.equal(promotionInputSnapshotId, this.handoff.promotion_input_snapshot_id);
    return this.handoff;
  }
}

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return topicSelectionV1cAcceptanceRef(refType, refId, versionId);
}

function makeCondition(): TopicSelectionPromotionCondition {
  const sourceRef = ref('topic_package', 'topic_package_001', 'v1');
  return {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: {
      action_code: 'clarify_contribution_claim_before_outline_lock',
      severity: 'warning',
      loopback_target: 'package',
      refs: [sourceRef],
      reason: 'Clarify the contribution claim before outline lock.',
    },
    refs: [sourceRef],
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    verification_note: 'Condition is reviewer-visible.',
  };
}

function makeGateHandoff(): TopicSelectionPromotionGateHandoff {
  const gateRef = ref('promotion_gate_check', 'promotion_gate_check_001');
  const supportRef = ref('promotion_decision_support', 'promotion_decision_support_001');
  const dossierRef = ref('promotion_dossier', 'promotion_dossier_001');
  const readinessRef = ref('argument_readiness_mini_check', 'argument_readiness_mini_check_001');
  const inputRef = ref('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const topicPackageRef = ref('topic_package', 'topic_package_001', 'v1');
  const acceptedRiskRef = ref('accepted_risk', 'accepted_risk_001');
  const artifactRef = ref('artifact_ref', 'artifact_ref_001');
  return {
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_gate_check_ref: gateRef,
    promotion_decision_support_ref: supportRef,
    promotion_dossier_ref: dossierRef,
    argument_readiness_mini_check_ref: readinessRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    disposition: 'ready_for_human_decision',
    promote_allowed: true,
    required_actions: [],
    loopback_hints: [],
    accepted_risk_refs: [acceptedRiskRef],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_001',
      package_snapshot_hash: 'package_snapshot_hash_001',
      package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    },
    support: {
      promotion_decision_support_id: 'promotion_decision_support_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      promotion_input_snapshot_ref: inputRef,
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      support_generation_mode: 'llm_draft',
      support_status: 'succeeded',
      summary: 'Ready for human promotion decision.',
      reviewer_questions: [],
      risk_notes: [],
      recheck_notes: [],
      source_refs: [inputRef, topicPackageRef],
      accepted_risk_refs: [acceptedRiskRef],
      blocker_refs: [],
      recheck_request_refs: [],
      memory_suggestion_refs: [],
      warnings: [],
      llm_draft_payload: {
        summary: 'Ready for human promotion decision.',
      },
      input_snapshot_id: 'input_snapshot_support_001',
      workflow_run_id: 'workflow_run_support_001',
      artifact_refs: [supportRef, artifactRef],
      created_by: 'llm',
      created_at: NOW,
    },
    dossier: {
      promotion_dossier_id: 'promotion_dossier_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_decision_support_id: 'promotion_decision_support_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      summary: 'Reviewer packet is ready.',
      reviewer_packet_artifact_ref: artifactRef,
      dossier_payload: {
        source_snapshot_excerpt: {
          contribution_summary: 'A bounded workflow contribution.',
          evaluation_plan: 'A bounded evaluation plan.',
          claim_ceiling: 'Correlation and mechanism claims only.',
          prohibited_claims: ['Do not claim causal proof.'],
          selected_literature_evidence_ids: ['evidence_unit_001'],
          selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
        },
      },
      source_refs: [inputRef, topicPackageRef],
      artifact_refs: [dossierRef, artifactRef],
      created_by: 'system',
      created_at: NOW,
    },
    argument_readiness_mini_check: {
      argument_readiness_mini_check_id: 'argument_readiness_mini_check_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_decision_support_id: 'promotion_decision_support_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      check_status: 'passed',
      check_items: [],
      blockers: [],
      warnings: [],
      required_actions: [],
      early_check_obligations: ['Re-check contribution claim before outline lock.'],
      source_refs: [inputRef, topicPackageRef],
      artifact_refs: [readinessRef, artifactRef],
      created_by: 'system',
      created_at: NOW,
    },
    gate_check: {
      promotion_gate_check_id: 'promotion_gate_check_001',
      support_run_key: 'support_run_key_001',
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      promotion_decision_support_id: 'promotion_decision_support_001',
      promotion_dossier_id: 'promotion_dossier_001',
      argument_readiness_mini_check_id: 'argument_readiness_mini_check_001',
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      promotion_input_snapshot_ref: inputRef,
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      disposition: 'ready_for_human_decision',
      promote_allowed: true,
      blockers: [],
      warnings: [],
      required_actions: [],
      loopback_hints: [],
      accepted_risk_refs: [acceptedRiskRef],
      blocker_refs: [],
      recheck_request_refs: [],
      memory_suggestion_refs: [],
      source_refs: [inputRef, topicPackageRef],
      snapshot_hashes: {
        bundle_hash: 'bundle_hash_001',
        package_snapshot_hash: 'package_snapshot_hash_001',
        package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      },
      input_snapshot_id: 'input_snapshot_gate_001',
      workflow_run_id: 'workflow_run_gate_001',
      gate_result_id: 'gate_result_001',
      transition_attempt_id: 'transition_attempt_001',
      trace_snapshot_id: 'trace_snapshot_001',
      artifact_refs: [gateRef, artifactRef],
      created_by: 'system',
      created_at: NOW,
    },
  };
}

function candidateOutput(
  handoff: TopicSelectionPromotionGateHandoff,
  overrides: Partial<TopicSelectionV1cDelegatedPromotionDecisionCandidate> = {},
): TopicSelectionV1cDelegatedPromotionDecisionCandidate {
  const condition = makeCondition();
  return {
    schema_version: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
    promotion_gate_check_id: handoff.promotion_gate_check_id,
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
    workspace_id: 'workspace_001',
    title_card_id: handoff.gate_check.title_card_id,
    decision: 'promote_with_conditions',
    rationale: 'Ready for bridge authorization with one explicit condition.',
    confirmed_snapshot_hash: handoff.promotion_input_snapshot_hash,
    conditions: [condition],
    required_actions: [],
    loopback_target: null,
    allowed_refinements: [],
    stop_conditions: [],
    reopen_conditions: [],
    cited_refs: [
      handoff.promotion_gate_check_ref,
      handoff.promotion_input_snapshot_ref,
      ...condition.refs,
    ],
    decision_support_refs: [
      handoff.promotion_gate_check_ref,
      handoff.promotion_input_snapshot_ref,
      handoff.promotion_decision_support_ref,
    ],
    no_authority_write_confirmed: true,
    no_bridge_creation_confirmed: true,
    human_review_required: true,
    ...overrides,
  };
}

async function makeSubject() {
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    {
      idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
      now: () => NOW,
    },
  );
  const runtime = new TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService(controlPlane);
  const admission = new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(runtime);
  return {
    admission,
    controlPlane,
    runtime,
  };
}

test('v1c N4 runtime emits candidate and admission prepares human decision input without authority write', async () => {
  const handoff = makeGateHandoff();
  const { admission, runtime } = await makeSubject();
  const generated = await runtime.generateCandidate({
    gate_handoff: handoff,
    workflow_run_id: 'workflow_run_n4_delegated_001',
    node_attempt_id: 'node_attempt_n4_delegated_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(handoff),
      fixture_id: 'fixture_n4_delegated_candidate_001',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N4 delegated decision candidate generation to succeed.');
  }
  assert.equal(generated.candidate_artifact.allowed_effect, 'delegated_promotion_decision_candidate_only');
  assert.equal(generated.candidate_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(generated.candidate_artifact.output_contract, 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1');

  const humanRepository = new RecordingHumanPromotionDecisionRepository();
  const admitted = admission.admit({
    gate_handoff: handoff,
    candidate_artifact: generated.candidate_artifact,
    candidate: generated.structured_output,
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    policy_version_id: 'policy_v1',
  });
  assert.equal(admitted.admitted, true);
  if (!admitted.admitted) {
    throw new Error('Expected N4 delegated decision admission to pass.');
  }
  assert.equal(admitted.admission_identity.allowed_effect, 'human_review_input_candidate_only');
  assert.equal(admitted.create_input.decision, 'promote_with_conditions');
  assert.equal(admitted.create_input.promotion_gate_check_id, handoff.promotion_gate_check_id);
  assert.equal(humanRepository.writes.length, 0);

  const humanDecisionService = new TopicSelectionV1cHumanPromotionDecisionService({
    repository: humanRepository,
    promotionGateService: new GateHandoffProvider(handoff),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => NOW,
  });
  const accepted = await humanDecisionService.recordHumanPromotionDecision(admitted.create_input);
  assert.equal(humanRepository.writes.length, 1);
  assert.equal(accepted.promotion_decision.decision, 'promote_with_conditions');
  assert.ok(accepted.bridge_handoff, 'Explicit human acceptance may emit an N5 bridge handoff.');
});

test('v1c N4 admission blocks prompt drift before human decision input', async () => {
  const handoff = makeGateHandoff();
  const { admission, runtime } = await makeSubject();
  const generated = await runtime.generateCandidate({
    gate_handoff: handoff,
    workflow_run_id: 'workflow_run_n4_delegated_drift_001',
    node_attempt_id: 'node_attempt_n4_delegated_drift_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(handoff),
      fixture_id: 'fixture_n4_delegated_candidate_drift_001',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N4 delegated decision candidate generation to succeed.');
  }

  const admitted = admission.admit({
    gate_handoff: handoff,
    candidate_artifact: {
      ...generated.candidate_artifact,
      prompt_packet_hash: '0'.repeat(64),
    },
    candidate: generated.structured_output,
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
  });
  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected prompt drift to block N4 admission.');
  }
  assert.equal(admitted.blocker.code, 'N4_DELEGATED_DECISION_ARTIFACT_PROMPT_DRIFT');
});

test('v1c N4 admission blocks out-of-bounds candidate refs before human authority', async () => {
  const handoff = makeGateHandoff();
  const { admission, runtime } = await makeSubject();
  const generated = await runtime.generateCandidate({
    gate_handoff: handoff,
    workflow_run_id: 'workflow_run_n4_delegated_ref_001',
    node_attempt_id: 'node_attempt_n4_delegated_ref_001',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      output: candidateOutput(handoff, {
        cited_refs: [
          handoff.promotion_gate_check_ref,
          handoff.promotion_input_snapshot_ref,
          ref('paper_project_bridge', 'paper_project_bridge_unauthorized_001'),
        ],
      }),
      fixture_id: 'fixture_n4_delegated_candidate_ref_001',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N4 delegated decision candidate generation to succeed.');
  }

  const admitted = admission.admit({
    gate_handoff: handoff,
    candidate_artifact: generated.candidate_artifact,
    candidate: generated.structured_output,
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
  });
  assert.equal(admitted.admitted, false);
  if (admitted.admitted) {
    throw new Error('Expected out-of-bounds ref to block N4 admission.');
  }
  assert.equal(admitted.blocker.code, 'N4_DELEGATED_DECISION_REF_OUT_OF_BOUNDS');
});

const DELEGATED_PROMOTION_DECISION_SYSTEM_BODY_GOLDEN =
  '271c75b557b668a792fc531e356fc6243665b76013aa51ce88e90776369e5738';

test('v1c N4 delegated-promotion-decision system prompt is product-grade and byte-stable (golden anchor)', () => {
  const body = buildV1cN4DelegatedPromotionDecisionSystemContent();
  assert.equal(buildV1cN4DelegatedPromotionDecisionSystemContent(), body);
  assert.equal(sha256Text(body), DELEGATED_PROMOTION_DECISION_SYSTEM_BODY_GOLDEN);

  assert.match(body, /TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1/);

  assert.match(body, /Set decision to one of promote_to_paper_project, promote_with_conditions, merge_packages, refine_package, reassess_value, revise_question, revise_slice, recheck_evidence_or_search, park, or drop/);

  assert.match(body, /For a promote-class decision \(promote_to_paper_project or promote_with_conditions\) set loopback_target to null and leave required_actions empty/);
  assert.match(body, /at least one conditions entry when the decision is promote_with_conditions and leaving conditions empty when the decision is promote_to_paper_project/);
  assert.match(body, /For a non-promote decision leave conditions empty and set loopback_target to the single value fixed by that decision/);
  assert.match(body, /merge_packages and refine_package use package, reassess_value uses value, revise_question uses question, revise_slice uses slice, recheck_evidence_or_search uses evidence_or_search, park uses park, and drop uses none/);
  assert.match(body, /supply at least one required_actions entry for every non-promote decision except park and drop/);

  for (const field of ['schema_version', 'no_authority_write_confirmed', 'no_bridge_creation_confirmed', 'human_review_required']) {
    assert.ok(body.includes(field), `system prompt must mirror const field ${field}`);
  }

  assert.match(body, /Populate required_actions, allowed_refinements, stop_conditions, reopen_conditions, cited_refs, and decision_support_refs/);

  assert.match(body, /Do not create HumanPromotionDecision/);
  assert.match(body, /cannot supply a human actor/);
  assert.match(body, /explicit human acceptance through the N4 authority writer is required/);

  assert.match(body, /never inventing refs or hashes/);
});
