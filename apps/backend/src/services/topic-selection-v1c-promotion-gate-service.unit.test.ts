import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { Prisma } from '@prisma/client';
import type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
  TopicSelectionAgentInvocationTelemetrySummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPromotionDecisionSupportLlmDraft,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionV1cN2BoundedDebateAdmissionIdentity,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
  TopicSelectionPromotionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionV1cPromotionGateRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-gate-repository.js';
import { PrismaTopicSelectionV1cPromotionGateRepository } from '../repositories/prisma/prisma-topic-selection-v1c-promotion-gate-repository.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
} from './llm-gateway.js';
import {
  TopicSelectionV1cPromotionGateService,
  buildV1cPromotionDecisionSupportSystemContent,
} from './topic-selection-v1c-promotion-gate-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

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

function makeEvidenceRef() {
  return {
    topic_question_evidence_ref_id: 'topic_question_evidence_ref_001',
    workspace_id: null,
    title_card_id: 'title_card_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    evidence_ref: ref('evidence_unit', 'evidence_unit_001'),
    evidence_role: 'support' as const,
    mapped_question_part: 'main_question',
    rationale: 'supports the package',
    source_locator_snapshot: {},
    created_at: NOW,
  };
}

function makeHandoff(
  overrides: Partial<TopicSelectionPromotionInputSnapshotHandoff> = {},
): TopicSelectionPromotionInputSnapshotHandoff {
  const promotionInputSnapshotRef = ref('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const snapshot: TopicSelectionPromotionInputSnapshotRecord = {
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    closure_status: 'ready_for_gate',
    stop_condition_code: null,
    required_actions: [],
    blockers: [],
    warnings: [],
    check_details: [],
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    source_bundle_ref: ref('v1b_to_v1c_input_bundle', 'v1b_to_v1c_input_bundle_001'),
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    topic_package_ref: ref('topic_package', 'topic_package_001', 'v1'),
    package_trace_boundary_check_ref: ref('package_trace_boundary_check', 'package_trace_boundary_check_001'),
    package_readiness_assessment_ref: ref('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    topic_value_assessment_ref: ref('topic_value_assessment', 'topic_value_assessment_001'),
    value_reasoning_memo_ref: ref('value_reasoning_memo', 'value_reasoning_memo_001'),
    value_disposition_decision_ref: ref('value_disposition_decision', 'value_disposition_decision_001'),
    topic_question_ref: ref('topic_question', 'topic_question_001'),
    topic_question_contract_ref: ref('topic_question_contract', 'topic_question_contract_001'),
    answerability_plan_ref: ref('topic_question_answerability_plan', 'answerability_plan_001'),
    research_slice_ref: ref('research_slice', 'research_slice_001', 'v1'),
    validated_need_refs: [ref('validated_need', 'validated_need_001')],
    evidence_refs: [makeEvidenceRef()],
    accepted_risk_refs: [],
    blocker_refs: [],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    readiness_check_refs: [
      ref('package_trace_boundary_check', 'package_trace_boundary_check_001'),
      ref('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    ],
    replacement_bundle_ref: null,
    source_bundle_snapshot: {} as never,
    package_snapshot: {
      topic_package_id: 'topic_package_001',
      title_card_id: 'title_card_001',
      package_version: 'v1',
      package_readiness_status: 'ready_for_promotion_review',
      contribution_summary: 'A focused contribution summary.',
      evaluation_plan: 'A bounded evaluation plan.',
      claim_ceiling: 'Correlation and mechanism claims only.',
      selected_literature_evidence_ids: ['literature_evidence_001'],
      selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
      package_payload: {
        claim_ceiling_summary: 'Correlation and mechanism claims only.',
      },
    } as never,
    package_draft_input_snapshot: {
      question_contract: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
    } as never,
    input_snapshot_id: 'input_snapshot_source_001',
    workflow_run_id: 'workflow_run_source_001',
    gate_result_id: 'gate_result_source_001',
    transition_attempt_id: 'transition_attempt_source_001',
    trace_snapshot_id: 'trace_snapshot_source_001',
    artifact_refs: [ref('artifact_ref', 'artifact_ref_source_001')],
    created_by: 'system',
    created_at: NOW,
  };
  const base: TopicSelectionPromotionInputSnapshotHandoff = {
    promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    v1b_to_v1c_input_bundle_id: snapshot.v1b_to_v1c_input_bundle_id,
    topic_package_id: snapshot.topic_package_id,
    package_version: snapshot.package_version,
    closure_status: 'ready_for_gate',
    topic_package_ref: snapshot.topic_package_ref,
    package_trace_boundary_check_ref: snapshot.package_trace_boundary_check_ref,
    package_readiness_assessment_ref: snapshot.package_readiness_assessment_ref,
    topic_value_assessment_ref: snapshot.topic_value_assessment_ref,
    value_reasoning_memo_ref: snapshot.value_reasoning_memo_ref,
    value_disposition_decision_ref: snapshot.value_disposition_decision_ref,
    topic_question_ref: snapshot.topic_question_ref,
    topic_question_contract_ref: snapshot.topic_question_contract_ref,
    answerability_plan_ref: snapshot.answerability_plan_ref,
    research_slice_ref: snapshot.research_slice_ref,
    validated_need_refs: snapshot.validated_need_refs,
    evidence_refs: snapshot.evidence_refs,
    accepted_risk_refs: snapshot.accepted_risk_refs,
    blocker_refs: snapshot.blocker_refs,
    memory_suggestion_refs: snapshot.memory_suggestion_refs,
    recheck_request_refs: snapshot.recheck_request_refs,
    readiness_check_refs: snapshot.readiness_check_refs,
    snapshot_hashes: {
      bundle_hash: snapshot.bundle_hash,
      package_snapshot_hash: snapshot.package_snapshot_hash,
      package_draft_input_snapshot_hash: snapshot.package_draft_input_snapshot_hash,
      promotion_input_snapshot_hash: snapshot.promotion_input_snapshot_hash,
    },
    snapshot,
  };
  return {
    ...base,
    ...overrides,
    snapshot: {
      ...snapshot,
      ...(overrides.snapshot ?? {}),
    },
  };
}

class StubPromotionInputService {
  calls = 0;

  constructor(
    private readonly result: TopicSelectionPromotionInputSnapshotHandoff | Error = makeHandoff(),
  ) {}

  async getPromotionInputHandoff(
    _promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotHandoff> {
    this.calls += 1;
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

function makeSubject(input: {
  handoff?: TopicSelectionPromotionInputSnapshotHandoff;
  handoffError?: Error;
  llmGateway?: any;
} = {}) {
  const repository = new InMemoryTopicSelectionV1cPromotionGateRepository();
  const promotionInputService = new StubPromotionInputService(input.handoffError ?? input.handoff ?? makeHandoff());
  const service = new TopicSelectionV1cPromotionGateService({
    repository,
    promotionInputService,
    llmGateway: input.llmGateway,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { service, repository, promotionInputService };
}

function makeVerifiedRuntimeDraft(input: {
  draft: TopicSelectionPromotionDecisionSupportLlmDraft;
  promptPacketHash?: string;
  outputHash?: string;
  auditRefId?: string;
}) {
  const promptPacketHash = input.promptPacketHash ?? 'a'.repeat(64);
  const outputHash = input.outputHash ?? 'b'.repeat(64);
  const auditRef = ref('artifact_ref', input.auditRefId ?? 'runtime_audit_artifact_001');
  const provenance: TopicSelectionAgentInvocationProvenance = {
    workflow_run_id: 'workflow_run_n2_bounded_001',
    node_id: 'topic-selection.v1c.generate-promotion-support.v1',
    node_attempt_id: 'node_attempt_n2_bounded_001',
    invocation_attempt_id: 'node_attempt_n2_bounded_001.n2_bounded_micro_debate.synthesizer_final.runtime_role',
    execution_mode: 'codex_assisted',
    executor_kind: 'codex_assisted',
    source_kind: 'codex_response',
    non_provider: true,
    run_mode: 'acceptance',
    profile_id: 'topic-selection.v1c.promotion-support.bounded-micro-debate.v1',
    profile_version: '1',
    profile_hash: 'profile_hash_001',
    model_option_id: null,
    normalized_params_hash: null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
    prompt_template_id: 'topic-selection-v1c-promotion-support-bounded-micro-debate',
    prompt_template_version: '1',
    schema_name: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
    prompt_packet_hash: promptPacketHash,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: null,
  };
  const auditSnapshot: TopicSelectionAgentInvocationAuditSnapshot = {
    schema_version: 'topic-selection-agent-invocation-audit-v1',
    node_id: provenance.node_id,
    workflow_run_id: provenance.workflow_run_id,
    node_attempt_id: provenance.node_attempt_id,
    status: 'succeeded',
    provenance,
    token_budget_gate_result: null,
    validation: {
      valid: true,
      error_count: 0,
      errors: [],
    },
    warning_codes: [],
    blocker_codes: [],
    created_at: NOW,
  };
  const admissionIdentity: TopicSelectionV1cN2BoundedDebateAdmissionIdentity = {
    schema_version: 'topic-selection-v1c-n2-bounded-debate-admission-identity-v1',
    admission_policy_id: 'topic-selection.v1c.n2.bounded-micro-debate.admission.v1',
    node_id: 'topic-selection.v1c.generate-promotion-support.v1',
    allowed_effect: 'support_only',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    final_slot_id: 'n2_bounded_micro_debate.synthesizer_final',
    final_role_artifact_ref: ref('artifact_ref', 'final_role_artifact_001'),
    final_role_artifact_hash: outputHash,
    final_prompt_packet_hash: promptPacketHash,
    final_runtime_invocation_context_hash: 'c'.repeat(64),
    final_runtime_audit_ref: auditRef,
    final_runtime_audit_hash: 'd'.repeat(64),
    final_provenance_ref: auditRef,
    final_structured_output_hash: outputHash,
    final_output_contract: 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1',
    final_context_policy_profile_id: 'topic-selection.v1c.n2.bounded-debate.synthesizer-final.context-runtime@v1',
    final_context_policy_profile_version: '1',
    final_context_policy_profile_hash: 'e'.repeat(64),
    role_artifact_hashes: {
      'n2_bounded_micro_debate.promotion_supporter_draft': '1'.repeat(64),
      'n2_bounded_micro_debate.reviewer_critic_review': '2'.repeat(64),
      'n2_bounded_micro_debate.promotion_supporter_repair': '3'.repeat(64),
      'n2_bounded_micro_debate.synthesizer_final': outputHash,
    },
    role_prompt_packet_hashes: {
      'n2_bounded_micro_debate.promotion_supporter_draft': '4'.repeat(64),
      'n2_bounded_micro_debate.reviewer_critic_review': '5'.repeat(64),
      'n2_bounded_micro_debate.promotion_supporter_repair': '6'.repeat(64),
      'n2_bounded_micro_debate.synthesizer_final': promptPacketHash,
    },
    source_hashes: {
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    },
    prior_role_artifact_hashes: {
      'n2_bounded_micro_debate.promotion_supporter_draft': '1'.repeat(64),
      'n2_bounded_micro_debate.reviewer_critic_review': '2'.repeat(64),
      'n2_bounded_micro_debate.promotion_supporter_repair': '3'.repeat(64),
    },
  };
  return {
    draft: input.draft,
    provenance,
    telemetry: null as TopicSelectionAgentInvocationTelemetrySummary | null,
    audit_snapshot: auditSnapshot,
    admission_identity: admissionIdentity,
    admission_identity_hash: sha256Text(stableStringify(admissionIdentity)),
  };
}

test('ready T-061 handoff creates support, dossier, mini-check, gate, and T-063 handoff', async () => {
  const { service, repository } = makeSubject();

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
  });
  const stored = await repository.findBundleBySupportRunKey(result.promotion_decision_support.support_run_key);
  const handoff = await service.getPromotionGateHandoff(result.promotion_gate_check.promotion_gate_check_id);

  assert.equal(result.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(result.promotion_gate_check.promote_allowed, true);
  assert.equal(stored?.promotion_dossier.promotion_dossier_id, result.promotion_dossier.promotion_dossier_id);
  assert.equal(handoff.promote_allowed, true);
  assert.equal(handoff.disposition, 'ready_for_human_decision');
  assert.equal(result.promotion_decision_support.workflow_run_id, 'workflow_run_001');
  assert.equal(result.promotion_gate_check.gate_result_id, 'readiness_gate_result_001');
  assert.deepEqual(
    (result.promotion_dossier.dossier_payload.source_snapshot_excerpt as {
      selected_literature_evidence_ids?: string[];
    }).selected_literature_evidence_ids,
    ['literature_evidence_001'],
  );
});

test('N2 decision support persists without N3 gate artifacts until gate check consumes it', async () => {
  const { service, repository, promotionInputService } = makeSubject();

  const supportOnly = await service.createPromotionDecisionSupport({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
  });
  const supportRunKey = supportOnly.promotion_decision_support.support_run_key;

  assert.equal(
    (await repository.findSupportBundleBySupportRunKey(supportRunKey))?.promotion_decision_support
      .promotion_decision_support_id,
    supportOnly.promotion_decision_support.promotion_decision_support_id,
  );
  assert.equal(await repository.findGateCheckBundleBySupportRunKey(supportRunKey), null);

  const gate = await service.createPromotionGateCheckFromSupport({
    promotion_decision_support_id: supportOnly.promotion_decision_support.promotion_decision_support_id,
  });
  const replay = await service.createPromotionGateCheckFromSupport({
    support_run_key: supportRunKey,
  });

  assert.equal(gate.promotion_decision_support.promotion_decision_support_id, supportOnly.promotion_decision_support.promotion_decision_support_id);
  assert.equal(gate.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(gate.handoff.promote_allowed, true);
  assert.equal(replay.promotion_gate_check.promotion_gate_check_id, gate.promotion_gate_check.promotion_gate_check_id);
  assert.equal(promotionInputService.calls, 2);
});

test('accepted risks are warnings and do not block promote handoff', async () => {
  const acceptedRiskRef = ref('accepted_risk', 'accepted_risk_001');
  const handoff = makeHandoff({
    accepted_risk_refs: [acceptedRiskRef],
    snapshot: {
      accepted_risk_refs: [acceptedRiskRef],
    } as never,
  });
  const { service } = makeSubject({ handoff });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
  });

  assert.equal(result.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(result.promotion_gate_check.promote_allowed, true);
  assert.equal(result.promotion_gate_check.warnings.some((warning) => warning.code === 'accepted_risks_carried_forward'), true);
});

test('blocker refs create blocked gate with typed required action', async () => {
  const blockerRef = ref('blocker', 'blocker_001');
  const handoff = makeHandoff({
    blocker_refs: [blockerRef],
    snapshot: {
      blocker_refs: [blockerRef],
    } as never,
  });
  const { service } = makeSubject({ handoff });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
  });

  assert.equal(result.promotion_gate_check.disposition, 'blocked');
  assert.equal(result.handoff.promote_allowed, false);
  assert.equal(result.promotion_gate_check.required_actions[0]?.action_code, 'resolve_blockers_before_promotion');
  assert.equal(result.promotion_gate_check.required_actions[0]?.loopback_target, 'package');
});

test('carried recheck refs create recheck_required gate with evidence/search loopback', async () => {
  const recheckRef = ref('recheck_request', 'recheck_request_001');
  const handoff = makeHandoff({
    recheck_request_refs: [recheckRef],
    snapshot: {
      recheck_request_refs: [recheckRef],
    } as never,
  });
  const { service } = makeSubject({ handoff });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
  });

  assert.equal(result.promotion_gate_check.disposition, 'recheck_required');
  assert.equal(result.handoff.promote_allowed, false);
  assert.equal(result.promotion_gate_check.required_actions[0]?.action_code, 'resolve_recheck_before_promotion');
  assert.equal(result.promotion_gate_check.loopback_hints[0]?.loopback_target, 'evidence_or_search');
});

test('deterministic park marker creates park gate without allowing promotion', async () => {
  const base = makeHandoff();
  const handoff = makeHandoff({
    snapshot: {
      package_snapshot: {
        ...base.snapshot.package_snapshot,
        promotion_actionability: 'park',
      } as never,
    } as never,
  });
  const { service } = makeSubject({ handoff });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
  });

  assert.equal(result.promotion_gate_check.disposition, 'park');
  assert.equal(result.handoff.promote_allowed, false);
  assert.equal(result.promotion_gate_check.required_actions[0]?.action_code, 'park_package_until_actionable');
  assert.equal(result.promotion_gate_check.loopback_hints[0]?.loopback_target, 'park');
});

test('argument gaps create needs_revision with package/question/slice/value loopback hints', async () => {
  const base = makeHandoff();
  const handoff = makeHandoff({
    snapshot: {
      package_snapshot: {
        ...base.snapshot.package_snapshot,
        claim_ceiling: '',
        claim_ceiling_summary: '',
        contribution_summary: '',
        evaluation_plan: '',
        package_payload: {},
      } as never,
      package_draft_input_snapshot: {
        question_contract: {},
      } as never,
    } as never,
  });
  const { service } = makeSubject({ handoff });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
  });

  assert.equal(result.promotion_gate_check.disposition, 'needs_revision');
  assert.equal(result.handoff.promote_allowed, false);
  assert.equal(
    result.promotion_gate_check.required_actions.some((action) => action.action_code === 'revise_question_claim_ceiling'),
    true,
  );
  assert.equal(
    result.promotion_gate_check.required_actions.some((action) => action.action_code === 'refine_package_contribution_summary'),
    true,
  );
});

test('non-ready T-061 snapshot is rejected before any T-062 persistence', async () => {
  const handoffError = new AppError(409, 'GATE_CONSTRAINT_FAILED', 'not ready for gate handoff');
  const { service, repository } = makeSubject({ handoffError });

  await assert.rejects(
    () => service.createPromotionGateSupport({ promotion_input_snapshot_id: 'promotion_input_snapshot_001' }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(await repository.findLatestBundleByPromotionInputSnapshotId('promotion_input_snapshot_001'), null);
});

test('workspace drift is rejected before any T-062 persistence', async () => {
  const { service, repository, promotionInputService } = makeSubject();

  await assert.rejects(
    () => service.createPromotionGateSupport({
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      workspace_id: 'workspace_other',
    }),
    (error) => error instanceof AppError && /workspace mismatch/.test(error.message),
  );
  assert.equal(promotionInputService.calls, 1);
  assert.equal(await repository.findLatestBundleByPromotionInputSnapshotId('promotion_input_snapshot_001'), null);
});

test('same support run key returns existing gate support idempotently', async () => {
  const { service } = makeSubject();

  const first = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    policy_version_id: 'policy_v1',
  });
  const second = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    policy_version_id: 'policy_v1',
  });

  assert.equal(second.promotion_decision_support.promotion_decision_support_id, first.promotion_decision_support.promotion_decision_support_id);
  assert.equal(second.promotion_gate_check.promotion_gate_check_id, first.promotion_gate_check.promotion_gate_check_id);
});

test('LLM draft success stores draft prose while deterministic gate remains authoritative', async () => {
  const draft: TopicSelectionPromotionDecisionSupportLlmDraft = {
    summary: 'LLM drafted reviewer summary.',
    reviewer_questions: ['What is the strongest evidence ref?'],
    risk_notes: ['Risk note.'],
    recheck_notes: [],
    dossier_markdown: '# Dossier',
  };
  const telemetry: LlmCallTelemetry = {
    provider_id: 'openai',
    model_id: 'gpt-5.5',
    profile_id: 'topic-selection-promotion-decision-support',
    prompt_template_id: 'topic-selection-promotion-decision-support',
    prompt_template_version: '1',
    elapsed_ms: 10,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: 10,
    output_tokens: 20,
    embedding_input_tokens: null,
    total_tokens: 30,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
  const gatewayCalls: LlmStructuredOutputRequest[] = [];
  const { service } = makeSubject({
    llmGateway: {
      createStructuredOutput: async (request: LlmStructuredOutputRequest) => {
        gatewayCalls.push(request);
        return {
          parsed: draft,
          raw: { ok: true },
          telemetry,
        };
      },
    },
  });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    support_generation_mode: 'llm_draft',
  });

  assert.equal(result.promotion_decision_support.summary, draft.summary);
  assert.deepEqual(result.promotion_decision_support.llm_draft_payload, draft);
  assert.equal(result.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(gatewayCalls.length, 1);
  assert.equal(gatewayCalls[0]?.model.profileId, 'topic-selection-promotion-decision-support');
  assert.equal(gatewayCalls[0]?.prompt.promptTemplateId, 'topic-selection-promotion-decision-support');
  assert.equal(gatewayCalls[0]?.schemaName, 'TopicSelectionPromotionDecisionSupportLlmDraft');
  assert.equal(gatewayCalls[0]?.executionContext.metadata?.profile_id, 'topic-selection-promotion-decision-support');
  assert.equal(gatewayCalls[0]?.executionContext.metadata?.model_option_id, 'topic-selection-promotion-decision-support.openai-balanced');
});

test('verified runtime draft creates N2 support without bypassing N3 gate', async () => {
  const { service, repository } = makeSubject();
  const draft: TopicSelectionPromotionDecisionSupportLlmDraft = {
    summary: 'Runtime-admitted bounded debate support summary.',
    reviewer_questions: ['Does the claim ceiling remain visible?'],
    risk_notes: ['Accepted risk was carried forward.'],
    recheck_notes: ['Recheck obligation was preserved.'],
    dossier_markdown: 'Runtime-admitted dossier markdown.',
  };

  const support = await service.createPromotionDecisionSupportFromVerifiedRuntimeDraft({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    verified_runtime_draft: makeVerifiedRuntimeDraft({ draft }),
  });

  assert.equal(support.promotion_decision_support.support_generation_mode, 'llm_draft');
  assert.equal(support.promotion_decision_support.summary, draft.summary);
  assert.deepEqual(support.promotion_decision_support.llm_draft_payload, draft);
  assert.equal(
    await repository.findGateCheckBundleBySupportRunKey(support.promotion_decision_support.support_run_key),
    null,
  );

  const replay = await service.createPromotionDecisionSupportFromVerifiedRuntimeDraft({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    verified_runtime_draft: makeVerifiedRuntimeDraft({ draft }),
  });
  assert.equal(
    replay.promotion_decision_support.promotion_decision_support_id,
    support.promotion_decision_support.promotion_decision_support_id,
  );

  const gate = await service.createPromotionGateCheckFromSupport({
    promotion_decision_support_id: support.promotion_decision_support.promotion_decision_support_id,
  });
  assert.equal(gate.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(
    gate.promotion_decision_support.promotion_decision_support_id,
    support.promotion_decision_support.promotion_decision_support_id,
  );
});

test('verified runtime draft run key is bound to admitted runtime identity', async () => {
  const { service } = makeSubject();
  const firstDraft: TopicSelectionPromotionDecisionSupportLlmDraft = {
    summary: 'First runtime-admitted summary.',
    reviewer_questions: ['Does the claim ceiling remain visible?'],
    risk_notes: [],
    recheck_notes: [],
    dossier_markdown: 'First runtime-admitted dossier.',
  };
  const secondDraft: TopicSelectionPromotionDecisionSupportLlmDraft = {
    summary: 'Second runtime-admitted summary.',
    reviewer_questions: ['Does the updated final artifact remain bounded?'],
    risk_notes: [],
    recheck_notes: [],
    dossier_markdown: 'Second runtime-admitted dossier.',
  };

  const first = await service.createPromotionDecisionSupportFromVerifiedRuntimeDraft({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    verified_runtime_draft: makeVerifiedRuntimeDraft({ draft: firstDraft }),
  });
  const second = await service.createPromotionDecisionSupportFromVerifiedRuntimeDraft({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    verified_runtime_draft: makeVerifiedRuntimeDraft({
      draft: secondDraft,
      promptPacketHash: '7'.repeat(64),
      outputHash: '8'.repeat(64),
      auditRefId: 'runtime_audit_artifact_002',
    }),
  });

  assert.notEqual(
    second.promotion_decision_support.promotion_decision_support_id,
    first.promotion_decision_support.promotion_decision_support_id,
  );
  assert.equal(second.promotion_decision_support.summary, secondDraft.summary);
});

test('verified runtime draft rejects missing audit/provenance identity', async () => {
  const { service, repository } = makeSubject();
  const draft: TopicSelectionPromotionDecisionSupportLlmDraft = {
    summary: 'Runtime-admitted bounded debate support summary.',
    reviewer_questions: ['Does the claim ceiling remain visible?'],
    risk_notes: [],
    recheck_notes: [],
    dossier_markdown: 'Runtime-admitted dossier markdown.',
  };
  const verifiedRuntimeDraft = makeVerifiedRuntimeDraft({ draft });

  await assert.rejects(
    () => service.createPromotionDecisionSupportFromVerifiedRuntimeDraft({
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      verified_runtime_draft: {
        ...verifiedRuntimeDraft,
        audit_snapshot: {
          ...verifiedRuntimeDraft.audit_snapshot,
          provenance: {
            ...verifiedRuntimeDraft.provenance,
            prompt_packet_hash: '9'.repeat(64),
          },
        },
      },
    }),
    (error) => error instanceof AppError && /audit snapshot/.test(error.message),
  );
  assert.equal(await repository.findLatestBundleByPromotionInputSnapshotId('promotion_input_snapshot_001'), null);
});

test('LLM draft failure fails closed without deterministic fallback persistence', async () => {
  const { service, repository } = makeSubject({
    llmGateway: {
      createStructuredOutput: async () => {
        throw new Error('upstream unavailable');
      },
    },
  });

  await assert.rejects(
    () => service.createPromotionGateSupport({
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      support_generation_mode: 'llm_draft',
    }),
    (error) =>
      error instanceof AppError
      && error.statusCode === 502
      && error.errorCode === 'INTERNAL_ERROR'
      && error.details?.failure_code === 'LLM_INVOCATION_FAILED',
  );
  assert.equal(await repository.findLatestBundleByPromotionInputSnapshotId('promotion_input_snapshot_001'), null);
});

test('Prisma promotion gate repository round-trips records and read lookups', async () => {
  const fake = new FakePromotionGatePrismaClient();
  const repository = new PrismaTopicSelectionV1cPromotionGateRepository(fake.client);
  const promotionInputService = new StubPromotionInputService(makeHandoff());
  const service = new TopicSelectionV1cPromotionGateService({
    repository,
    promotionInputService,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const result = await service.createPromotionGateSupport({
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
  });
  const support = await repository.findDecisionSupportById(result.promotion_decision_support.promotion_decision_support_id);
  const dossier = await repository.findDossierById(result.promotion_dossier.promotion_dossier_id);
  const mini = await repository.findArgumentReadinessMiniCheckById(
    result.argument_readiness_mini_check.argument_readiness_mini_check_id,
  );
  const gate = await repository.findGateCheckById(result.promotion_gate_check.promotion_gate_check_id);
  const handoff = await service.getPromotionGateHandoff(result.promotion_gate_check.promotion_gate_check_id);

  assert.equal(support?.promotion_input_snapshot_hash, 'promotion_input_snapshot_hash_001');
  assert.equal(dossier?.reviewer_packet_artifact_ref.ref_type, 'artifact_ref');
  assert.equal(mini?.check_status, 'passed');
  assert.equal(gate?.disposition, 'ready_for_human_decision');
  assert.equal(handoff.promote_allowed, true);
  assert.equal(fake.gateResults.size, 1);
  assert.equal(fake.traceSnapshots.size, 1);
});

test('promotion gate migration declares four tables and supportRunKey uniqueness', async () => {
  const sql = await fs.readFile(
    new URL('../../../../prisma/migrations/20260515113000_add_topic_selection_v1c_promotion_gate_support/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE "TopicSelectionPromotionDecisionSupport"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionPromotionDossier"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionArgumentReadinessMiniCheck"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionPromotionGateCheck"/);
  assert.match(sql, /tspds_support_run_key_key/);
  assert.match(sql, /tspgc_input_snapshot_id_idx/);
});

class FakeModel {
  readonly rows = new Map<string, Record<string, unknown>>();
  readonly idsBySupportRunKey = new Map<string, string>();

  async create({ data }: { data: Record<string, unknown> }) {
    const id = String(data.id);
    const supportRunKey = data.supportRunKey === undefined ? null : String(data.supportRunKey);
    if (supportRunKey && this.idsBySupportRunKey.has(supportRunKey)) {
      throw new Prisma.PrismaClientKnownRequestError('duplicate support run key', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['supportRunKey'] },
      });
    }
    this.rows.set(id, data);
    if (supportRunKey) {
      this.idsBySupportRunKey.set(supportRunKey, id);
    }
    return data;
  }

  async findUnique({ where }: { where: { id?: string; supportRunKey?: string } }) {
    if (where.id) {
      return this.rows.get(where.id) ?? null;
    }
    if (where.supportRunKey) {
      const id = this.idsBySupportRunKey.get(where.supportRunKey);
      return id ? this.rows.get(id) ?? null : null;
    }
    return null;
  }

  async findFirst({ where }: { where: { promotionInputSnapshotId?: string } }) {
    const rows = [...this.rows.values()]
      .filter((row) => !where.promotionInputSnapshotId || row.promotionInputSnapshotId === where.promotionInputSnapshotId)
      .sort((a, b) => {
        const bDate = b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt);
        const aDate = a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt);
        return bDate.localeCompare(aDate);
      });
    return rows[0] ?? null;
  }
}

class FakePromotionGatePrismaClient {
  readonly inputSnapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  readonly workflowRuns = new Map<string, TopicSelectionLlmWorkflowRunRecord>();
  readonly artifactRefs = new Map<string, TopicSelectionArtifactRefRecord>();
  readonly gateResults = new Map<string, TopicSelectionReadinessGateResultRecord>();
  readonly transitionAttempts = new Map<string, TopicSelectionChainTransitionAttemptRecord>();
  readonly traceSnapshots = new Map<string, TopicSelectionTraceSnapshotRecord>();
  readonly supportModel = new FakeModel();
  readonly dossierModel = new FakeModel();
  readonly miniCheckModel = new FakeModel();
  readonly gateCheckModel = new FakeModel();

  readonly client: any;

  constructor() {
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
      topicSelectionPromotionDecisionSupport: this.supportModel,
      topicSelectionPromotionDossier: this.dossierModel,
      topicSelectionArgumentReadinessMiniCheck: this.miniCheckModel,
      topicSelectionPromotionGateCheck: this.gateCheckModel,
    };
  }
}

const PROMOTION_DECISION_SUPPORT_SYSTEM_BODY_GOLDEN =
  'a164d8ac6e086860c85ad484ccbae6de1ce949e893d54c4715fe5fcde2b59ccc';

test('v1c promotion-decision-support system prompt is product-grade and byte-stable (golden anchor)', () => {
  const body = buildV1cPromotionDecisionSupportSystemContent();
  assert.equal(buildV1cPromotionDecisionSupportSystemContent(), body);
  assert.equal(sha256Text(body), PROMOTION_DECISION_SUPPORT_SYSTEM_BODY_GOLDEN);

  assert.match(body, /TopicSelectionPromotionDecisionSupportLlmDraft@v1/);

  for (const field of ['summary', 'reviewer_questions', 'risk_notes', 'recheck_notes', 'dossier_markdown']) {
    assert.ok(body.includes(field), `system prompt must mirror schema field ${field}`);
  }

  assert.match(body, /Do not decide the gate disposition/);
  assert.match(body, /authorize or recommend promotion/);
  assert.match(body, /HumanPromotionDecision/);
  assert.match(body, /PromotionCommitmentProfile/);
  assert.match(body, /PaperProjectBridge/);

  assert.match(body, /never invent refs, hashes/);
});
