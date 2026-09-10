import assert from 'node:assert/strict';
import { createDefaultTopicSelectionContextPolicyProfileRegistry, TopicSelectionContextPolicyProfileRegistryService } from './topic-selection-context-policy-profile-registry-service.js';
import test, { type TestContext } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionCodexCliRunnerService } from './topic-selection-codex-cli-runner-service.js';
import { createDefaultTopicSelectionModelProfileRegistry, TopicSelectionModelProfileRegistryService } from './topic-selection-model-profile-registry-service.js';
import {
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bN1HarnessFrozenInputPayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN6LoopbackTriageSupportPayload,
  type TopicSelectionV1bN9QuestionRefinementPayload,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
  type TopicSelectionV1bCandidateGroupingSupportPayload,
  type TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  type TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bN8ToN7FeedbackPayload,
  type TopicSelectionV1bN9HarnessFrozenInputPayload,
  type TopicSelectionV1bN10HarnessFrozenInputPayload,
  type TopicSelectionV1bN11HarnessFrozenInputPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessNodePolicy,
  type TopicSelectionV1bWorkflowHarnessNodeId,
  type TopicSelectionV1bWorkflowHarnessHandoff,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionResearchSliceOptionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import {
  TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  type TopicSelectionActorRef,
  type TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceRoleBundle,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionNeedCandidateRecord,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAcceptedRiskRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionRecheckRiskMemoryRepository } from '../repositories/in-memory-topic-selection-recheck-risk-memory-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import { InMemoryTopicSelectionV1bIntakeRepository } from '../repositories/in-memory-topic-selection-v1b-intake-repository.js';
import { InMemoryTopicSelectionV1bResearchSliceRepository } from '../repositories/in-memory-topic-selection-v1b-research-slice-repository.js';
import { InMemoryTopicSelectionV1bTopicQuestionRepository } from '../repositories/in-memory-topic-selection-v1b-topic-question-repository.js';
import { InMemoryTopicSelectionV1bValueAssessmentRepository } from '../repositories/in-memory-topic-selection-v1b-value-assessment-repository.js';
import { InMemoryTopicSelectionV1bTopicPackageRepository } from '../repositories/in-memory-topic-selection-v1b-topic-package-repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionV1bRunCoordinatorService } from './topic-selection-v1b-run-coordinator-service.js';
import { TopicSelectionV1bWorkflowHarnessService } from './topic-selection-v1b-workflow-harness-service.js';
import {
  TopicSelectionV1bEarlySemanticSupportRuntimeService,
  type TopicSelectionV1bEarlySemanticSupportPayload,
  type TopicSelectionV1bIntakeReadinessClassificationSupportPayload,
} from './topic-selection-v1b-early-semantic-support-runtime-service.js';
import type {
  TopicSelectionV1bEarlySemanticSupportSlotId,
} from './topic-selection-v1b-early-semantic-support-admission-service.js';
import {
  TopicSelectionV1bN6DraftRuntimeService,
  type TopicSelectionV1bN6DraftGenerationMode,
} from './topic-selection-v1b-n6-draft-runtime-service.js';
import {
  TopicSelectionV1bN6DivergentDebateRuntimeService,
  type V1bN6DebateInputs,
} from './topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import { TopicSelectionV1bN4ResearchSliceRuntimeService } from './topic-selection-v1b-n4-research-slice-runtime-service.js';
import { TopicSelectionV1bN6LoopbackTriageRuntimeService } from './topic-selection-v1b-n6-loopback-triage-runtime-service.js';
import {
  TopicSelectionV1bN7SupportRuntimeService,
  type TopicSelectionV1bN7RuntimeSupportPayload,
} from './topic-selection-v1b-n7-support-runtime-service.js';
import type {
  TopicSelectionV1bN7SupportSlotId,
} from './topic-selection-v1b-n7-support-admission-service.js';
import { TopicSelectionV1bN8BoundedDebateRuntimeService } from './topic-selection-v1b-n8-bounded-debate-runtime-service.js';
import { TopicSelectionV1bN8ValueAssessmentRuntimeService } from './topic-selection-v1b-n8-value-assessment-runtime-service.js';
import { TopicSelectionV1bN6RefinementDeltaDebateRuntimeService } from './topic-selection-v1b-n6-refinement-delta-debate-runtime-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { classifyTopicSelectionV1bRefinementDelta } from './topic-selection-v1b-refinement-delta-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const NOW = '2026-05-26T00:00:00.000Z';
const TITLE_CARD_ID = 'title_card_v1b_harness';

async function n4CliFixture(t: TestContext, earlySupport = false, withRisks = false) {
  const home = mkdtempSync(join(tmpdir(), 't153-n4-cli-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const ctx = await seedHarnessV1aBundle(withRisks ? { openRecheck: true, acceptedRiskCoversRecheck: true } : {});
  const create = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
  ctx.controlPlaneRepository.createArtifactRef = record => create(JSON.parse(JSON.stringify(record)));
  const { n1, n2, n3 } = await runReadyN3(ctx, undefined, 'workflow_run_v1b_n4');
  const input = n4Request(n1, n2, n3, {
    execution_spec: { execution_mode: 'codex_cli', model_option_id: null }, run_mode: 'product',
  });
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  let calls = 0;
  const researchMessages: Array<Record<string, unknown>> = [];
  let draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload | TopicSelectionV1bEarlySemanticSupportPayload = n4Draft();
  let evidenceRevision = 0;
  let evidenceReads = 0;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls += 1;
    const packet: { slot_id: string; context_packet: { research_context: { frozen_domain: Record<string, unknown>; evidence_packets: unknown[] } } } = JSON.parse(options.stdin.split('[user]\n')[1]!);
    researchMessages.push(packet.context_packet.research_context.frozen_domain);
    assert.ok(packet.context_packet.research_context.frozen_domain.snapshot);
    if (!earlySupport) {
      assert.equal(packet.slot_id, 'n4_research_slice_option_draft');
      assert.ok(packet.context_packet.research_context.frozen_domain.profile);
      assert.ok(packet.context_packet.research_context.frozen_domain.readiness);
    }
    assert.equal(packet.context_packet.research_context.evidence_packets.length, 1);
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'n4-thread' }), JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(draft) } })].join('\n'),
      stderr: '', exit_code: 0, timed_out: false };
  });
  const makeService = (controlPlane = ctx.controlPlane) => new TopicSelectionV1bWorkflowHarnessService(controlPlane, {
    modelProfileRegistry,
    agentOrchestrator: new TopicSelectionAgentOrchestratorService({ controlPlane, modelProfileRegistry, codexCliRunner: runner, codexCliModelId: 'gpt-6-astra' }),
    evidencePacketResolver: { resolve: async request => {
      evidenceReads += 1;
      assert.equal(request.title_card_id, TITLE_CARD_ID);
      assert.deepEqual(request.evidence_unit_refs.map(ref => ref.ref_id).sort(), ['evidence_unit_baseline_1', 'evidence_unit_support_1']);
      return { schema_version: 'TopicSelectionResearchEvidencePacket@v1', title_card_id: TITLE_CARD_ID,
        participant_role: request.participant_role, query_intent: request.query_intent, items: [], source_refs: request.evidence_unit_refs,
        total_excerpt_chars: 0, packet_hash: canonicalHash([request, evidenceRevision]) };
    } },
    runnerDependencies: {
      evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository,
    },
  });
  t.after(() => runner.shutdown());
  return { ...ctx, n1, n2, n3, input, makeService, service: makeService(), researchMessages,
    get calls() { return calls; }, get evidenceReads() { return evidenceReads; },
    setDraft(value: TopicSelectionV1bResearchSliceOptionSetDraftPayload) { draft = value; },
    setEarlyOutput(value: TopicSelectionV1bEarlySemanticSupportPayload) { draft = value; },
    changeEvidence() { evidenceRevision += 1; },
  };
}

function earlyCliRequest(input: TopicSelectionV1bWorkflowHarnessRunRequest, workflowRunId: string) {
  const payload = { ...input.frozen_input.payload };
  if ('authority_input_provider' in payload) { payload.authority_input_provider = 'human_delegated'; payload.delegation_artifact_hash = null; }
  const frozen = { ...input.frozen_input, payload };
  return { ...input, workflow_run_id: workflowRunId, run_mode: 'product' as const, profile_id: null,
    created_by: 'human' as const, execution_spec: { execution_mode: 'codex_cli' as const, model_option_id: null },
    frozen_input: { ...frozen, frozen_input_hash: frozenInputHash(frozen) } };
}

for (const slot of ['n2', 'n3', 'n5'] as const) test(`Early CLI ${slot} reviews frozen bodies without replacing Human or deterministic authority`, async t => {
  const ctx = await n4CliFixture(t, true);
  let input: TopicSelectionV1bWorkflowHarnessRunRequest;
  let accepted: TopicSelectionV1bAcceptedConstraintProfilePayload | TopicSelectionV1bAcceptedSliceSelectionPayload | null = null;
  if (slot === 'n2') {
    accepted = acceptedConstraintProfilePayload();
    input = n2Request(ctx.bundle, ctx.n1, accepted);
    ctx.setEarlyOutput({ ...accepted, human_constraint_notes: 'Review commentary only.', feasibility_budget: {} });
  } else if (slot === 'n3') {
    input = n3Request(ctx.n1, ctx.n2);
    ctx.setEarlyOutput({ schema_version: 'IntakeReadinessClassificationSupport@v1', readiness_recommendation: 'blocked',
      blocker_codes: ['reviewer_requests_more_evidence'], warning_codes: [], loopback_target_code: 'n3_profile_repair',
      cited_refs: input.frozen_input.source_refs, rationale: 'Advisory concern; the deterministic readiness rule still decides.', no_authority_write_confirmed: true });
  } else {
    const n4 = await ctx.service.invokeNode(ctx.input);
    const option = await selectedN4Option(ctx, n4);
    accepted = acceptedSliceSelectionPayload(option);
    input = n5Request(n4, accepted);
    ctx.setEarlyOutput({ ...accepted, selection_rationale: 'Review commentary only.' });
  }
  input = earlyCliRequest(input, ctx.input.workflow_run_id);
  const result = await ctx.service.invokeNode(input);
  assert.equal(result.route_decision, 'invoke_next', JSON.stringify(result));
  const calls = ctx.calls;
  const replay = await ctx.makeService(new TopicSelectionControlPlaneService(ctx.controlPlaneRepository)).invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.deepEqual(replay.authority_ref, result.authority_ref);
  assert.equal(ctx.calls, calls);
  if (slot === 'n2') {
    const profile = await ctx.v1bRepository.findResearchConstraintProfileById(result.authority_ref!.ref_id);
    assert.equal(profile?.human_constraint_notes, (accepted as TopicSelectionV1bAcceptedConstraintProfilePayload).human_constraint_notes);
    assert.deepEqual(profile?.feasibility_budget, (accepted as TopicSelectionV1bAcceptedConstraintProfilePayload).feasibility_budget);
  } else if (slot === 'n5') {
    const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
    assert.equal(decision?.selection_rationale, (accepted as TopicSelectionV1bAcceptedSliceSelectionPayload).selection_rationale);
  }
});

test('Early CLI rejects unfrozen Human input, scoped references and invented selection authority', async t => {
  const ctx = await n4CliFixture(t, true);
  const accepted = acceptedConstraintProfilePayload();
  const input = earlyCliRequest(n2Request(ctx.bundle, ctx.n1, accepted), ctx.input.workflow_run_id);
  const unfrozen = structuredClone(input);
  unfrozen.frozen_input.payload.authority_input_provider = 'codex_delegated';
  unfrozen.frozen_input.frozen_input_hash = frozenInputHash(unfrozen.frozen_input);
  await assert.rejects(ctx.service.invokeNode(unfrozen), /codex_delegated authority input|accepted Human constraint/);
  assert.equal(ctx.calls, 0);
  ctx.setEarlyOutput({ ...accepted, claim_ceiling: 'Unbounded invented claim.' });
  await assert.rejects(ctx.service.invokeNode({ ...input, node_attempt_id: 'n2-cli-invented-boundary' }), /accepted Human community or claim/);
  const n3 = earlyCliRequest(n3Request(ctx.n1, ctx.n2), ctx.input.workflow_run_id);
  const original = n3ReadinessClassificationSupport(n3);
  const citation = original.cited_refs[0]!;
  for (const [index, changed] of [ { ...citation, title_card_id: 'foreign' }, { ...citation, version_id: 'forged' },
    { ...citation, ref_type: 'artifact_ref' }, { ...citation, ref_id: 'invented' }, { ...citation, legacy_ref: {} } ].entries()) {
    ctx.setEarlyOutput({ ...original, cited_refs: [changed] });
    await assert.rejects(ctx.service.invokeNode({ ...n3, node_attempt_id: `n3-cli-invented-ref-${index}` }), /reference.*scope\/version|Early CLI support did not succeed/);
  }
  ctx.setDraft(n4Draft());
  const n4 = await ctx.service.invokeNode(ctx.input);
  const option = await selectedN4Option(ctx, n4);
  const selection = acceptedSliceSelectionPayload(option);
  ctx.setEarlyOutput({ ...selection, decision: 'park', selected_option_ref: null, selected_option_hash: null });
  await assert.rejects(ctx.service.invokeNode(earlyCliRequest(n5Request(n4, selection), ctx.input.workflow_run_id)), /accepted Human decision/);
  assert.equal((await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id))?.selected_option_id, null);
});

test('Early CLI N3 reads actual open rechecks and usable risk acceptance under the same frozen refs', async t => {
  const ctx = await n4CliFixture(t, true, true);
  const input = earlyCliRequest(n3Request(ctx.n1, ctx.n2), ctx.input.workflow_run_id);
  ctx.setEarlyOutput(n3ReadinessClassificationSupport(input));
  const covered = await ctx.service.invokeNode(input);
  assert.equal(covered.route_decision, 'invoke_next');
  const context = () => ctx.researchMessages.at(-1)!.risk_context as {
    accepted_risks: Array<{ usable: boolean; record: TopicSelectionAcceptedRiskRecord }>;
    rechecks: Array<{ record: TopicSelectionSearchPlanRecheckRequestRecord }>;
    uncovered_open_recheck_refs: TopicSelectionFunctionalRef[];
  };
  assert.equal(context().accepted_risks[0]!.usable, true);
  assert.match(context().accepted_risks[0]!.record.rationale, /accepts this recheck/);
  assert.equal(context().rechecks[0]!.record.status, 'open');
  assert.match(context().rechecks[0]!.record.reason, /Counter evidence/);
  assert.deepEqual(context().uncovered_open_recheck_refs, []);
  await ctx.recheckRepository.updateAcceptedRiskStatus('accepted_risk_1', { status: 'expired', updated_at: NOW });
  const uncovered = await ctx.makeService().invokeNode({ ...input, node_attempt_id: 'n3-cli-risk-expired' });
  assert.equal(uncovered.route_decision, 'loopback');
  assert.equal(context().accepted_risks[0]!.usable, false);
  assert.equal(context().uncovered_open_recheck_refs.length, 1);
  assert.equal(ctx.calls, 2);
});

test('Early CLI rejects a caller-relabeled audit without a protected generation receipt', async t => {
  const ctx = await n4CliFixture(t, true);
  const input = earlyCliRequest(n3Request(ctx.n1, ctx.n2), ctx.input.workflow_run_id);
  const original = await generateEarlySemanticSupportArtifact(ctx, input, 'n3_readiness_classification', n3ReadinessClassificationSupport(input));
  const audit = await ctx.controlPlane.getArtifactRef(original.runtime_audit_ref!.ref_id);
  assert.ok(audit?.payload);
  const forgedAudit = await ctx.controlPlane.recordWorkflowHarnessArtifactRef({
    title_card_id: TITLE_CARD_ID, workflow_run_id: input.workflow_run_id,
    artifact_kind: 'diagnostic', storage_kind: 'inline',
    payload: { ...audit.payload, provenance: { ...audit.payload.provenance as Record<string, unknown>,
      execution_mode: 'codex_cli', source_kind: 'codex_cli_response' } },
  });
  const auditRef = ref('artifact_ref', forgedAudit.artifact_ref_id);
  const forged = { ...original, execution_mode: 'codex_cli' as const, runtime_audit_ref: auditRef,
    provenance_ref: auditRef, runtime_audit_hash: forgedAudit.checksum! };
  const blocked = await ctx.service.invokeNode({ ...input, execution_spec: undefined, semantic_artifacts: [forged] });
  assert.equal(blocked.gate_status, 'blocked');
  assert.match(blocked.error_message ?? '', /protected generation receipt/);
  assert.equal(ctx.calls, 0);
});

test('Early CLI N5 reads newly accepted selection risks outside its intake snapshot', async t => {
  const ctx = await n4CliFixture(t, true);
  const draft = n4Draft();
  draft.portfolio_disposition = {
    outcome: 'selected', rationale: 'Portfolio-only rationale for this bounded choice.', confidence: 0.8,
    evidence_refs: draft.options[0]!.support_evidence_refs, rejection_reasons: [],
    reopening_conditions: ['Reopen if the supporting dataset changes.'],
    candidate_dispositions: [{ candidate_key: draft.options[0]!.option_key, disposition: 'selected',
      rationale: 'Preserve the traceability boundary.', evidence_refs: draft.options[0]!.support_evidence_refs,
      drop_reason_code: null, reopening_conditions: [] }],
  };
  ctx.setDraft(draft);
  const n4 = await ctx.service.invokeNode(ctx.input);
  const option = await selectedN4Option(ctx, n4);
  const riskRef = ref('accepted_risk', 'selection_risk', TITLE_CARD_ID);
  const selectedRef = ref('research_slice_option', option.research_slice_option_id, TITLE_CARD_ID);
  const risk: TopicSelectionAcceptedRiskRecord = {
    accepted_risk_id: riskRef.ref_id, workspace_id: null, title_card_id: TITLE_CARD_ID,
    risk_type: 'bounded_selection', source_type: 'manual', source_ref: selectedRef, target_ref: selectedRef,
    scope_refs: [selectedRef], affected_object_refs: [selectedRef], severity: 'blocking', status: 'active',
    rationale: 'Accept the incomplete judgments only for historical replication.',
    accepted_by: { actor_type: 'human', actor_id: 'reviewer' },
    recheck_condition: 'New relevance judgments invalidate this choice.', expires_at: '2027-01-01T00:00:00.000Z',
    created_at: NOW, updated_at: NOW,
  };
  await ctx.recheckRepository.createAcceptedRisk(risk);
  const accepted = acceptedSliceSelectionPayload(option, { accepted_risk_refs: [riskRef] });
  ctx.setEarlyOutput(accepted);
  const result = await ctx.service.invokeNode(earlyCliRequest(n5Request(n4, accepted), ctx.input.workflow_run_id));
  assert.equal(result.route_decision, 'invoke_next');
  assert.deepEqual(ctx.researchMessages.at(-1)!.selection_risks, [{ ref: riskRef, record: risk }]);
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  const { options: _cachedOptions, ...portfolio } = optionSet!.options_payload;
  const contextOptionSet = ctx.researchMessages.at(-1)!.optionSet as { options_payload: Record<string, unknown> };
  assert.deepEqual(contextOptionSet.options_payload, portfolio);
  assert.deepEqual(contextOptionSet.options_payload.portfolio_disposition, draft.portfolio_disposition);
  const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
  const slice = await ctx.researchSliceRepository.findResearchSliceById(decision!.output_research_slice_ref!.ref_id);
  assert.deepEqual(slice?.accepted_risk_refs, [riskRef]);
});

test('Early CLI receipt interruption and concurrent retry reuse the completed model attempt', async t => {
  const ctx = await n4CliFixture(t, true);
  const input = earlyCliRequest(n3Request(ctx.n1, ctx.n2), ctx.input.workflow_run_id);
  ctx.setEarlyOutput(n3ReadinessClassificationSupport(input));
  const key = `early-cli-support:${canonicalHash([input.workflow_run_id, input.node_attempt_id, 'n3_readiness_classification'])}`;
  const create = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
  let failed = false;
  ctx.controlPlaneRepository.createArtifactRef = async record => {
    if (record.stable_key === key && !failed) { failed = true; throw new Error('Interrupted early support receipt'); }
    return create(record);
  };
  await assert.rejects(ctx.service.invokeNode(input), /Interrupted early support receipt/);
  assert.equal(ctx.calls, 1);
  const retries = await Promise.allSettled([ctx.makeService().invokeNode(input), ctx.makeService().invokeNode(input)]);
  assert.ok(retries.some(result => result.status === 'fulfilled'));
  for (const result of retries) if (result.status === 'rejected') assert.ok(result.reason instanceof AppError && result.reason.statusCode === 409);
  const completed = await ctx.makeService().invokeNode(input);
  assert.equal(completed.replay_provenance?.replayed, true);
  assert.equal(ctx.calls, 1);
  const drift = structuredClone(input);
  drift.frozen_input.payload.constraint_profile_hash = '1'.repeat(64);
  drift.frozen_input.frozen_input_hash = frozenInputHash(drift.frozen_input);
  await assert.rejects(ctx.service.invokeNode(drift), /identity drifted/);
  assert.equal(ctx.calls, 1);
});

test('N4 product CLI generates gated options from frozen evidence and replays before Human selection', async t => {
  const ctx = await n4CliFixture(t);
  const { service, input } = ctx;
  const draft = n4Draft({ missing_option_types: ['A second evaluation route needs review.'],
    unresolved_disagreements: ['Review the assumed corpus availability.'] });
  draft.options[0]!.requires_human_review = true;
  ctx.setDraft(draft);
  const result = await service.invokeNode(input);
  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next', JSON.stringify(result));
  assert.equal(result.authority_ref?.ref_type, 'research_slice_option_set');
  const handoff = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  assert.equal(handoff?.payload?.target_node_id, 'topic-selection.v1b.select-research-slice.v1');
  assert.ok(ctx.evidenceReads > 0);
  const sets = await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID);
  assert.equal(sets.length, 1);
  assert.equal(sets[0]!.selected_option_id, null);
  const replay = await ctx.makeService(new TopicSelectionControlPlaneService(ctx.controlPlaneRepository)).invokeNode(input);
  assert.deepEqual(replay.authority_ref, result.authority_ref);
  assert.equal(ctx.calls, 1);
  assert.equal((await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID)).length, 1);
  ctx.changeEvidence();
  await assert.rejects(service.invokeNode(input), /replay input or runtime identity drifted/);
  assert.equal(ctx.calls, 1, 'Changed source context cannot silently reuse a draft or launch another model call.');
});

test('N4 CLI gate refusal with optional undefined fields survives JSON persistence and exact replay', async t => {
  const ctx = await n4CliFixture(t);
  const draft = n4Draft();
  draft.options[0]!.hard_blockers = ['The required corpus is unavailable.'];
  ctx.setDraft(draft);
  const input = { ...ctx.input, actor: undefined };
  const result = await ctx.service.invokeNode(input);
  assert.equal(result.gate_status, 'blocked');
  const replay = await ctx.makeService().invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.deepEqual(replay.harness_trace_artifact_ref, result.harness_trace_artifact_ref);
  assert.equal(ctx.calls, 1);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('N4 CLI rejects scoped and nested invented refs before draft admission or authority writes', async t => {
  const ctx = await n4CliFixture(t);
  const valid = n4Draft();
  const citation = valid.options[0]!.support_evidence_refs[0]!;
  const drifts: TopicSelectionFunctionalRef[] = [
    { ...citation, title_card_id: 'foreign' }, { ...citation, version_id: 'forged' },
    { ...citation, ref_type: 'artifact_ref' }, { ...citation, ref_id: 'invented' },
    { ...citation, legacy_ref: {} },
  ];
  for (const [index, rejected] of drifts.entries()) {
    const draft = structuredClone(valid);
    draft.options[0]!.support_evidence_refs = [rejected];
    ctx.setDraft(draft);
    await assert.rejects(ctx.service.invokeNode({ ...ctx.input, node_attempt_id: `n4-invalid-ref-${index}` }), /reference.*scope\/version/);
  }
  const nested = structuredClone(valid);
  nested.options[0]!.details_payload = { nested: { cited_refs: [drifts[3]] } };
  ctx.setDraft(nested);
  await assert.rejects(ctx.service.invokeNode({ ...ctx.input, node_attempt_id: 'n4-invalid-nested-ref' }), /reference.*scope\/version/);
  assert.equal(ctx.calls, 6);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
  assert.equal(await ctx.controlPlane.getArtifactRefByStableKey(`n4-cli-draft:${canonicalHash([ctx.input.workflow_run_id, 'n4-invalid-nested-ref'])}`), null);
});

test('N4 CLI recovers a missing generation receipt from the completed model attempt', async t => {
  const ctx = await n4CliFixture(t);
  const key = `n4-cli-draft:${canonicalHash([ctx.input.workflow_run_id, ctx.input.node_attempt_id])}`;
  const create = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
  let failed = false;
  ctx.controlPlaneRepository.createArtifactRef = async record => {
    if (record.stable_key === key && !failed) { failed = true; throw new Error('Interrupted generation receipt write'); }
    return create(record);
  };
  await assert.rejects(ctx.service.invokeNode(ctx.input), /Interrupted generation receipt write/);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
  const result = await ctx.makeService().invokeNode(ctx.input);
  assert.equal(result.gate_status, 'admitted');
  assert.equal(ctx.calls, 1);
  assert.equal((await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID)).length, 1);
});

test('N4 CLI concurrent entry writes one option set and an interrupted domain commit stays closed', async t => {
  const ctx = await n4CliFixture(t);
  const attempts = await Promise.allSettled([ctx.service.invokeNode(ctx.input), ctx.makeService().invokeNode(ctx.input)]);
  assert.ok(attempts.some(attempt => attempt.status === 'fulfilled'));
  for (const attempt of attempts) {
    if (attempt.status === 'rejected') assert.ok(attempt.reason instanceof AppError && attempt.reason.statusCode === 409);
  }
  assert.equal(ctx.calls, 1);
  assert.equal((await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID)).length, 1);
  const next = { ...ctx.input, node_attempt_id: 'n4-domain-interruption' };
  const create = ctx.researchSliceRepository.createPlanRunWithOptionSet.bind(ctx.researchSliceRepository);
  let writes = 0;
  ctx.researchSliceRepository.createPlanRunWithOptionSet = async persistence => {
    writes += 1;
    await create(persistence);
    throw new Error('Interrupted after domain write');
  };
  await assert.rejects(ctx.service.invokeNode(next), /Interrupted after domain write/);
  await assert.rejects(ctx.makeService().invokeNode(next), error => error instanceof AppError && error.statusCode === 409);
  assert.equal(writes, 1, 'Uncertain domain persistence requires authority inspection, never an automatic duplicate write.');
  assert.equal(ctx.calls, 2);
});

test('N4 CLI rejects an external audit label and preserves an evidence-expansion result', async t => {
  const ctx = await n4CliFixture(t);
  const original = await generateN4RuntimeDraftArtifact(ctx, ctx.input, n4Draft());
  const audit = await ctx.controlPlane.getArtifactRef(original.runtime_audit_ref!.ref_id);
  assert.ok(audit?.payload);
  const forgedAudit = await ctx.controlPlane.recordWorkflowHarnessArtifactRef({
    title_card_id: TITLE_CARD_ID, workflow_run_id: ctx.input.workflow_run_id,
    artifact_kind: 'diagnostic', storage_kind: 'inline',
    payload: { ...audit.payload, provenance: { ...audit.payload.provenance as Record<string, unknown>,
      execution_mode: 'codex_cli', source_kind: 'codex_cli_response' } },
  });
  const auditRef = ref('artifact_ref', forgedAudit.artifact_ref_id);
  const forged = { ...original, execution_mode: 'codex_cli' as const, runtime_audit_ref: auditRef,
    provenance_ref: auditRef, runtime_audit_hash: forgedAudit.checksum! };
  const blocked = await ctx.service.invokeNode({ ...ctx.input, semantic_artifacts: [forged] });
  assert.equal(blocked.gate_status, 'blocked');
  assert.match(blocked.error_message ?? '', /protected generation receipt/);
  assert.equal(ctx.calls, 0);
  const evidence = n4Draft().options[0]!.support_evidence_refs;
  ctx.setDraft(n4Draft({ options: [], recommended_option_key: null, portfolio_disposition: {
    outcome: 'evidence_expansion_required', rationale: 'Source coverage cannot support a choice.', confidence: 0.8,
    evidence_refs: evidence, rejection_reasons: [{ reason_code: 'evidence_coverage_insufficient',
      summary: 'The existing evidence does not establish a distinct feasible option.', evidence_refs: evidence }],
    reopening_conditions: ['Inspect directly competing prior art.'], candidate_dispositions: [],
  } }));
  const input = { ...ctx.input, node_attempt_id: 'n4-expansion' };
  const result = await ctx.service.invokeNode(input);
  assert.equal(result.route_decision, 'expand_evidence', JSON.stringify(result));
  assert.equal((await ctx.makeService().invokeNode(input)).replay_provenance?.replayed, true);
  assert.equal(ctx.calls, 1);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

function n4Coordinator(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, harness: TopicSelectionV1bWorkflowHarnessService) {
  return new TopicSelectionV1bRunCoordinatorService({ harness, controlPlane: ctx.controlPlane,
    researchCheckpointStatus: ctx.researchCheckpointService, topicQuestionRepository: ctx.topicQuestionRepository,
    n6DivergentDebateRuntime: new TopicSelectionV1bN6DivergentDebateRuntimeService(ctx.controlPlane),
    n8BoundedDebateRuntime: new TopicSelectionV1bN8BoundedDebateRuntimeService(ctx.controlPlane),
    n6RefinementDeltaDebateRuntime: new TopicSelectionV1bN6RefinementDeltaDebateRuntimeService(ctx.controlPlane),
  });
}

test('N4 coordinator executes a CLI frontier then stops at Human slice selection', async t => {
  const ctx = await n4CliFixture(t);
  const coordinator = n4Coordinator(ctx, ctx.service);
  const advance = () => coordinator.advanceUntilBlocked({ workflow_run_id: ctx.input.workflow_run_id,
    node_inputs: { [ctx.input.node_id]: { execution_spec: ctx.input.execution_spec } } });
  const result = await advance();
  assert.deepEqual(result.steps.map(step => step.node_id), [ctx.input.node_id]);
  assert.equal(result.halt.reason, 'human_node');
  assert.equal(result.halt.node_id, 'topic-selection.v1b.select-research-slice.v1');
  assert.equal((await advance()).halt.reason, 'human_node');
  assert.equal(ctx.calls, 1);
});

function qualificationConstraint(availableArchives: boolean) {
  const constraint = acceptedConstraintProfilePayload({ target_community: 'Information retrieval researchers',
    intended_contribution_style: 'empirical_study',
    method_constraints: ['Historical replication and bounded error analysis using existing source-tested retrievers and BM25; no new model training'],
    resource_constraints: ['A bounded reproduction plan only; dataset/model access, annotation effort and hardware availability remain unverified'],
    available_assets: ['Versioned BEIR S5/S6 comparison and annotation-bias prose; full numerical tables, implementation artifacts and current prior art are not supplied'],
    claim_ceiling: 'A bounded historical replication or evaluation hypothesis. No established novelty, causal architecture claim, current-model failure, new measured gain or hardware-matched efficiency result.',
    human_constraint_notes: 'Controlled Human fixture for N4 role qualification, not actual project approval.',
    constraint_payload: { controlled_qualification: true } });
  if (availableArchives) {
    constraint.method_constraints = ['Evaluate fixed historical rankings against fixed qrels; no model training, new retrieval run, relabeling or extrapolation to current models'];
    constraint.resource_constraints = ['Controlled scenario assumption: the researcher can load and score the fixed archived files on an available workstation; do not run additional retrieval or build a ColBERT index'];
    constraint.available_assets = [
      'Controlled Human scenario assumption: complete ANCE, TAS-B and BM25 ranked lists for the source-tested BioASQ and Touché-2020 query sets, matching corpus/query IDs, qrels with judged-status metadata and historical evaluation settings are available and mutually aligned.',
      'Controlled Human scenario assumption: the historical result tables and scoring script are available for identity checks and bounded metric reproduction; permissions and workstation capacity for scoring these files have been checked within this hypothetical scenario.',
      'These availability statements are fixed test assumptions, not artifacts inspected by this qualification and not actual project resource verification. The supplied BEIR prose remains the only inspected original paper evidence.',
    ];
  }
  return constraint;
}

test('Codex N4 qualification uses original comparison evidence and retains Human selection', {
  skip: !['prepare', 'live'].includes(process.env.TOPIC_SELECTION_CODEX_N4_QUALIFICATION ?? ''),
}, async t => {
  const { qualificationBeirParagraphs } = await import('./test-fixtures/topic-selection-codex-qualification-sources.js');
  const { qualificationRunner, QualificationPreviewComplete } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const sourceFile = process.env.TOPIC_SELECTION_QUALIFICATION_ALTERNATIVE_FULLTEXT;
  const outputRoot = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  if (!sourceFile || !outputRoot || !model || !home || !runId || !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)
    || process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED !== '1') throw new Error('Explicit N4 qualification configuration is required.');
  const live = process.env.TOPIC_SELECTION_CODEX_N4_QUALIFICATION === 'live';
  const caseName = process.env.TOPIC_SELECTION_QUALIFICATION_CASE ?? 'missing_archives';
  assert.ok(['missing_archives', 'available_archives'].includes(caseName));
  const availableArchives = caseName === 'available_archives';
  const limits = live ? { attempts: null, tokens: null, duration_ms: null,
    attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) } : null;
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY,
    timeout_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) }, outputRoot, limits);
  t.after(() => runner.shutdown());
  t.after(() => budget?.close());
  const key = `n4_${runId}`;
  const save = (name: string, value: unknown) => writeFileSync(join(directory, `${key}-${name}.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  save('manifest', { role: 'n4_research_slice_option_draft', model, limits, source_file: sourceFile,
    case: caseName, controlled_upstream_and_human: true, controlled_extraction_and_readiness: true, original_paragraphs: true,
    shipped_profile: process.env.TOPIC_SELECTION_QUALIFICATION_SHIPPED === '1' });
  const sources = await qualificationBeirParagraphs(sourceFile, TITLE_CARD_ID);
  const ctx = await seedHarnessV1aBundle({ evidenceUnits: sources.units,
    needStatement: 'Bounded historical replication need: characterize the source-tested ANCE/TAS-B versus BM25 retrieval differences on BioASQ/Touché-2020, while distinguishing known BM25+CE/ColBERT tradeoffs and incomplete relevance judgments. The BEIR source already reports these observations; neither a novel repair nor current-model failure is established.' });
  // Exercise the JSON boundary used by persisted artifact payloads, without claiming a relational restart.
  const createArtifact = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
  ctx.controlPlaneRepository.createArtifactRef = record => createArtifact(JSON.parse(JSON.stringify(record)));
  const constraint = qualificationConstraint(availableArchives);
  const { n1, n2, n3 } = await runReadyN3(ctx, constraint, key);
  const input = n4Request(n1, n2, n3, { workflow_run_id: key, node_attempt_id: key,
    execution_spec: { execution_mode: 'codex_cli', model_option_id: null }, run_mode: 'product' });
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  if (process.env.TOPIC_SELECTION_QUALIFICATION_SHIPPED !== '1') {
    const profile = registry.profiles.find(profile => profile.profile_id === TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent)!;
    if (!profile.allowed_execution_modes.includes('codex_cli')) profile.allowed_execution_modes.push('codex_cli');
    profile.run_mode_eligibility.codex_cli = ['product'];
  }
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  const makeService = () => new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, { modelProfileRegistry,
    agentOrchestrator: new TopicSelectionAgentOrchestratorService({ controlPlane: ctx.controlPlane, modelProfileRegistry,
      codexCliRunner: runner, codexCliModelId: model }), evidencePacketResolver: sources.resolver(ctx.evidenceRepository),
    runnerDependencies: { evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository },
  });
  const service = makeService();
  save('research', await service.resolveCodexResearchContext(input));
  try {
    const result = await service.invokeNode(input);
    save('result', result);
    save('option-sets', await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID));
    const attempts = budget?.snapshot().attempts.length;
    const replay = await makeService().invokeNode(input);
    save('replay', replay);
    assert.equal(replay.replay_provenance?.replayed, true);
    assert.equal(budget?.snapshot().attempts.length, attempts);
    if (availableArchives) {
      assert.equal(result.route_decision, 'invoke_next', JSON.stringify(result));
      const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(result.authority_ref!.ref_id);
      save('options', options);
      assert.ok(options.some(option => option.status === 'recommended' && option.hard_blockers.length === 0));
    } else assert.ok(['expand_evidence', 'reframe_scope', 'stop_v1b_complete'].includes(result.route_decision), JSON.stringify(result));
    if (result.route_decision === 'invoke_next') {
      const coordinator = n4Coordinator(ctx, makeService());
      const stopped = await coordinator.advanceUntilBlocked({ workflow_run_id: key });
      save('human-stop', stopped);
      assert.equal(stopped.halt.reason, 'human_node');
      assert.equal(stopped.halt.node_id, 'topic-selection.v1b.select-research-slice.v1');
    }
    assert.ok(['invoke_next', 'expand_evidence', 'reframe_scope', 'stop_v1b_complete'].includes(result.route_decision), JSON.stringify(result));
  } catch (error) {
    if (!(error instanceof QualificationPreviewComplete) || live) throw error;
  } finally { save('artifacts', await ctx.controlPlane.listArtifactRefsByWorkflowRunId(key)); }
});

test('Codex early support qualification reviews original evidence and fixed Human input', {
  skip: !['prepare', 'live'].includes(process.env.TOPIC_SELECTION_CODEX_EARLY_QUALIFICATION ?? ''),
}, async t => {
  const { qualificationBeirParagraphs } = await import('./test-fixtures/topic-selection-codex-qualification-sources.js');
  const { qualificationRunner, QualificationPreviewComplete } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const source = process.env.TOPIC_SELECTION_QUALIFICATION_ALTERNATIVE_FULLTEXT;
  const output = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  const slot = process.env.TOPIC_SELECTION_QUALIFICATION_SLOT;
  const caseName = process.env.TOPIC_SELECTION_QUALIFICATION_CASE;
  if (!source || !output || !model || !home || !runId || !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)
    || !['n2', 'n3', 'n5'].includes(slot ?? '') || !['complete', 'incomplete'].includes(caseName ?? '')
    || process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED !== '1') throw new Error('Explicit early qualification configuration is required.');
  const live = process.env.TOPIC_SELECTION_CODEX_EARLY_QUALIFICATION === 'live';
  const limits = live ? { attempts: null, tokens: null, duration_ms: null,
    attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) } : null;
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY,
    timeout_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) }, output, limits);
  t.after(() => runner.shutdown()); t.after(() => budget?.close());
  const key = `early_${runId}`;
  const save = (name: string, value: unknown) => writeFileSync(join(directory, `${key}-${name}.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  save('manifest', { slot, case: caseName, model, limits, original_paragraphs: true,
    controlled_extraction_readiness_and_human: true, actual_research_approval: false,
    n5_upstream: slot === 'n5' ? 'Pinned original N4 model output, rematerialized as a controlled upstream fixture.' : null });
  const sources = await qualificationBeirParagraphs(source, TITLE_CARD_ID);
  const ctx = await seedHarnessV1aBundle({ evidenceUnits: sources.units,
    ...(slot === 'n3' ? { openRecheck: true, acceptedRiskCoversRecheck: caseName === 'complete' } : {}),
    needStatement: 'Bounded historical replication need: characterize the source-tested ANCE/TAS-B versus BM25 retrieval differences on BioASQ/Touché-2020, while distinguishing known BM25+CE/ColBERT tradeoffs and incomplete relevance judgments. The BEIR source already reports these observations; neither a novel repair nor current-model failure is established.' });
  const create = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
  ctx.controlPlaneRepository.createArtifactRef = record => create(JSON.parse(JSON.stringify(record)));
  const constraint = qualificationConstraint(caseName === 'complete' || slot === 'n5');
  const { n1, n2, n3 } = await runReadyN3(ctx, constraint, key);
  let input = slot === 'n2' ? n2Request(ctx.bundle, n1, constraint) : n3Request(n1, n2);
  if (slot === 'n5') {
    const outcomeFile = process.env.TOPIC_SELECTION_QUALIFICATION_N4_OUTCOME;
    if (!outcomeFile) throw new Error('N5 qualification requires the pinned original N4 outcome.');
    const outcome: { final_message: string } = JSON.parse(readFileSync(outcomeFile, 'utf8'));
    assert.equal(sha256Text(outcome.final_message), '24546627a94fd84183536c3bf12f84ce554624f71b61c0c0fd64509af898812d');
    const draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload = JSON.parse(outcome.final_message);
    const request = n4Request(n1, n2, n3, { workflow_run_id: key });
    const artifact = await generateN4RuntimeDraftArtifact(ctx, request, draft);
    const n4 = await ctx.service.invokeNode({ ...request, semantic_artifacts: [artifact] });
    assert.equal(n4.route_decision, 'invoke_next', JSON.stringify(n4));
    const option = await selectedN4Option(ctx, n4);
    const accepted = acceptedSliceSelectionPayload(option, caseName === 'complete' ? {} : {
      decision: 'request_more_options', selected_option_ref: null, selected_option_hash: null,
      selection_rationale: 'Controlled Human fixture: request alternatives before choosing; historical reproducibility alone does not settle research value.',
      loopback_target: 'plan_research_slice_run', loopback_target_ref: null, loopback_reason_code: 'need_more_options',
      required_actions: ['Compare a distinct bounded evaluation route without assuming novelty.'],
    });
    input = n5Request(n4, accepted);
    save('upstream-options', await ctx.researchSliceRepository.listOptionsByOptionSetId(n4.authority_ref!.ref_id));
  }
  input = { ...earlyCliRequest(input, key), node_attempt_id: key };
  save('request', input);
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  const makeService = () => new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, { modelProfileRegistry,
    agentOrchestrator: new TopicSelectionAgentOrchestratorService({ controlPlane: ctx.controlPlane, modelProfileRegistry,
      codexCliRunner: runner, codexCliModelId: model }), evidencePacketResolver: sources.resolver(ctx.evidenceRepository),
    runnerDependencies: { evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository },
  });
  try {
    const result = await makeService().invokeNode(input);
    save('result', result);
    assert.ok(['invoke_next', 'loopback', 'wait'].includes(result.route_decision), JSON.stringify(result));
    const count = budget?.snapshot().attempts.length;
    const replay = await makeService().invokeNode(input);
    save('replay', replay);
    assert.equal(replay.replay_provenance?.replayed, true);
    assert.equal(budget?.snapshot().attempts.length, count);
    if (slot === 'n2') {
      const profile = await ctx.v1bRepository.findResearchConstraintProfileById(result.authority_ref!.ref_id);
      save('authority', profile);
      assert.equal(profile?.human_constraint_notes, constraint.human_constraint_notes);
      assert.deepEqual(profile?.feasibility_budget, constraint.feasibility_budget);
    } else if (slot === 'n3') save('authority', await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id));
    else {
      const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
      save('authority', decision);
      const accepted = input.frozen_input.payload.accepted_selection_payload as TopicSelectionV1bAcceptedSliceSelectionPayload;
      assert.equal(decision?.decision, accepted.decision);
      assert.equal(decision?.selection_rationale, accepted.selection_rationale);
      assert.equal(result.route_decision, caseName === 'complete' ? 'invoke_next' : 'loopback');
    }
  } catch (error) {
    if (!(error instanceof QualificationPreviewComplete) || live) throw error;
  } finally { save('artifacts', await ctx.controlPlane.listArtifactRefsByWorkflowRunId(key)); }
});

test('Codex optional support qualification reads original evidence and failed trial bodies', {
  skip: !['prepare', 'live'].includes(process.env.TOPIC_SELECTION_CODEX_SUPPORT_QUALIFICATION ?? ''),
}, async t => {
  const { qualificationBeirParagraphs } = await import('./test-fixtures/topic-selection-codex-qualification-sources.js');
  const { qualificationRunner, QualificationPreviewComplete } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const source = process.env.TOPIC_SELECTION_QUALIFICATION_ALTERNATIVE_FULLTEXT;
  const output = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  const slot = process.env.TOPIC_SELECTION_QUALIFICATION_SLOT;
  const n4Outcome = process.env.TOPIC_SELECTION_QUALIFICATION_N4_OUTCOME;
  if (!source || !output || !model || !home || !n4Outcome || !runId || !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)
    || !['triage', 'grouping', 'synthesis', 'admission'].includes(slot ?? '')
    || process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED !== '1') throw new Error('Explicit support qualification configuration is required.');
  const live = process.env.TOPIC_SELECTION_CODEX_SUPPORT_QUALIFICATION === 'live';
  const limits = live ? { attempts: null, tokens: null, duration_ms: null,
    attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) } : null;
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY,
    timeout_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) }, output, limits);
  t.after(() => runner.shutdown()); t.after(() => budget?.close());
  const key = `support_${runId}`;
  const save = (name: string, value: unknown) => writeFileSync(join(directory, `${key}-${name}.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  save('manifest', { slot, model, limits, original_paragraphs: true, actual_research_approval: false,
    controlled_upstream: 'Pinned original N4 output rematerialized; N6 candidates, N8 assessments, semantic failure feedback and Human decisions are controlled fixtures.',
    target_role: 'Actual CLI output; N7 uses the canonical CLI entry. N6 triage uses its runtime then mixed-fixture gate admission; ordinary CLI opt-in is separately covered by service tests.' });
  const sources = await qualificationBeirParagraphs(source, TITLE_CARD_ID);
  const ctx = await seedHarnessV1aBundle({ evidenceUnits: sources.units,
    needStatement: 'Bounded historical replication of BEIR ANCE/TAS-B versus BM25 on BioASQ and Touché-2020; original reported differences, incomplete relevance judgments and limited scientific novelty must remain explicit.' });
  const constraint = qualificationConstraint(true);
  const { n1, n2, n3 } = await runReadyN3(ctx, constraint, key);
  const outcome: { final_message: string } = JSON.parse(readFileSync(n4Outcome, 'utf8'));
  assert.equal(sha256Text(outcome.final_message), '24546627a94fd84183536c3bf12f84ce554624f71b61c0c0fd64509af898812d');
  const n4Input = n4Request(n1, n2, n3);
  const n4 = await ctx.service.invokeNode({ ...n4Input,
    semantic_artifacts: [await generateN4RuntimeDraftArtifact(ctx, n4Input, JSON.parse(outcome.final_message))] });
  assert.equal(n4.route_decision, 'invoke_next', JSON.stringify(n4));
  const n5Input = earlyCliRequest(n5Request(n4, acceptedSliceSelectionPayload(await selectedN4Option(ctx, n4))), key);
  const n5 = await ctx.service.invokeNode({ ...n5Input, execution_spec: null, run_mode: null }); // Controlled exact Human selection.
  assert.equal(n5.route_decision, 'invoke_next', JSON.stringify(n5));
  const n6Input = await n6Request(ctx, n5, { workflow_run_id: key, node_attempt_id: `${key}_n6` });
  const draft = await n6Draft(ctx, n6Input);
  draft.question_frame = { ...draft.question_frame, target_setting: 'Fixed historical BEIR BioASQ and Touché-2020 rankings',
    target_community: 'Information retrieval researchers', object_scope: 'Archived ANCE, TAS-B and BM25 rankings with original qrels',
    task_scope: 'Historical nDCG@10 metric replication', intervention_or_approach: 'Rescore fixed historical rankings without retrieval or training',
    comparison_baseline: 'BM25', observable_outcome: 'Query-level nDCG@10 differences and uncertainty; not a new measured outcome',
    frame_payload: { controlled_predecessor_fixture: true } };
  draft.candidates = ['ANCE', 'TAS-B'].map((retriever, index) => ({ ...structuredClone(draft.candidates[0]!),
    candidate_key: `historical_${index}`, main_question: `What historical nDCG@10 differences between ${retriever} and BM25 are reproduced by the fixed BEIR BioASQ and Touché-2020 ranked lists?`,
    sub_questions: ['How do incomplete judgments limit interpretation of the historical differences?'],
    question_type: 'analysis', contribution_hypothesis: 'analysis',
    expected_claim: 'Historical metric replication only; neither novelty nor current-model behavior is established.',
    fallback_claim: 'Unreproduced or uncertain differences require reporting unresolved inputs and limitations.',
    max_claim_strength: constraint.claim_ceiling,
    answerability_plan: { datasets_or_resources: constraint.available_assets, metrics: ['Query-level nDCG@10 with judged-status reporting and uncertainty'],
      baselines: ['BM25 on matching historical corpus/query IDs'], ablations_or_comparisons: ['Report each source-tested dataset separately'],
      evaluation_setting: 'Reproduce fixed historical scores; no new retrieval, training or qrel construction.',
      dependency_risks: ['Availability is a controlled Human fixture, not independently inspected.'], open_dependencies: [],
      known_gaps: ['The original paper already reports this comparison; no new scientific contribution is established.'],
      required_evidence_refs: draft.question_frame.evidence_refs },
    answerability_verdict: slot === 'triage' ? 'not_answerable' : 'answerable_with_risk',
    objections: ['Repeating reported results does not establish scientific novelty.'],
    risk_notes: ['Historical incomplete relevance judgments constrain interpretation.'],
    human_review_triggers: ['A real researcher must assess whether replication warrants investment.'],
  }));
  draft.recommended_candidate_keys = draft.candidates.map(candidate => candidate.candidate_key);
  if (slot === 'triage') for (const candidate of draft.candidates) {
    candidate.main_question = `Does retriever architecture cause the historical ${candidate.candidate_key === 'historical_0' ? 'ANCE' : 'TAS-B'} versus BM25 differences across BioASQ and Touché-2020?`;
    candidate.expected_claim = 'A causal architecture explanation would require interventions; archived rankings alone do not identify it.';
    candidate.answerability_plan.open_dependencies = ['Architecture-controlled interventions are absent; historical rankings permit metric replication only.'];
    candidate.answerability_plan.known_gaps = ['The proposed causal question exceeds what the supplied archives and original observational comparison can answer.'];
  }
  draft.generation_notes = ['Controlled candidate proposals for isolated support-role qualification, not live N6 model output.'];
  save('controlled-candidates', draft);
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({ controlPlane: ctx.controlPlane, modelProfileRegistry,
    codexCliRunner: runner, codexCliModelId: model });
  const service = new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, { modelProfileRegistry, agentOrchestrator,
    evidencePacketResolver: sources.resolver(ctx.evidenceRepository),
    runnerDependencies: { evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository },
  });
  try {
    if (slot === 'triage') {
      const failedInput = { ...n6Input, node_attempt_id: `${key}_failed` };
      const failed = await ctx.service.invokeNode({ ...failedInput, semantic_artifacts: [await recordN6DraftArtifact(ctx, failedInput, draft)] });
      assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE', JSON.stringify(failed));
      const trace = await ctx.controlPlane.getTraceSnapshot(failed.trace_snapshot_ref!.ref_id);
      const artifact = await recordN6DraftArtifact(ctx, n6Input, draft);
      const runtime = new TopicSelectionV1bN6LoopbackTriageRuntimeService(ctx.controlPlane, { modelProfileRegistry, agentOrchestrator,
        resolveResearchContext: request => service.resolveCodexResearchContext(request) });
      const generateInput = { request: n6Input, failed_draft_artifact: artifact, failed_draft_hash: artifact.normalized_output_hash!,
        blocked_candidate_contexts: trace!.payload.blocked_candidate_context as Record<string, unknown>[],
        execution_mode: 'codex_cli' as const, run_mode: 'product' as const };
      save('request', generateInput);
      const generated = await runtime.generateSupportArtifact(generateInput);
      save('generation', generated);
      assert.equal(generated.status, 'succeeded', JSON.stringify(generated));
      if (generated.status !== 'succeeded') return;
      const result = await service.invokeNode({ ...n6Input, semantic_artifacts: [artifact, generated.semantic_artifact] });
      save('result', result);
      assert.equal(result.route_decision, 'loopback', JSON.stringify(result));
      const count = budget?.snapshot().attempts.length;
      assert.equal((await runtime.generateSupportArtifact(generateInput)).status, 'succeeded');
      assert.equal(budget?.snapshot().attempts.length, count);
    } else {
      const n6 = await ctx.service.invokeNode({ ...n6Input, semantic_artifacts: [await recordN6DraftArtifact(ctx, n6Input, draft)] });
      assert.ok(n6.authority_ref && n6.handoff_ref, JSON.stringify(n6));
      const initial = await n7Request(ctx, n6);
      let input = initial;
      if (slot !== 'grouping') {
        let trial = await ctx.service.invokeNode(initial);
        for (let index = 0; index < (slot === 'synthesis' ? 2 : 1); index += 1) {
          const assessmentInput = await n8Request(ctx, trial, { workflow_run_id: key, node_attempt_id: `${key}_value_${index}` });
          const value = n8ValueDraft(assessmentInput, { readiness_status: 'needs_refinement', recommended_disposition: 'refine_question',
            total_score: 35, confidence: 0.85,
            strongest_claim_if_success: 'Reproduce the fixed historical retrieval comparison within its original evaluation boundaries.',
            fallback_claim_if_success: 'Report unresolved historical input or judgment limitations without a performance conclusion.',
            hard_gates: n8ValueDraft(assessmentInput).hard_gates.map(gate => ({ ...gate,
              rationale: 'Controlled structural gate coverage for an explicitly bounded archival comparison does not establish new scientific value.' })),
            dimension_scores: n8ValueDraft(assessmentInput).dimension_scores.map(score => ({ ...score, score: 35,
              rationale: 'Controlled low-value judgment: the source already reports this comparison and no independent contribution is established.' })),
            risk_penalty: { penalty_summary: 'Historical replication has limited scientific novelty and inherits incomplete qrel judgments.' },
            reviewer_objections: ['The source already reports the comparison; repeating it does not establish a new contribution.'],
            ceiling_case: 'Reproducible historical scores with transparently bounded interpretation.',
            base_case: 'An archival scoring check that confirms known observations.',
            floor_case: 'Unresolved archival alignment prevents interpretation.',
            risk_notes: ['Availability is controlled scenario input, not independently inspected; scientific novelty remains unestablished.'],
            value_summary: 'Controlled value fixture: original BEIR prose already reports this historical comparison; new scientific value remains unestablished.',
            reasoning_memo: { ...n8ValueDraft(assessmentInput).reasoning_memo, recommendation: 'refine_question',
              value_thesis: 'Historical metric reproduction is bounded but is not a new algorithm or result.',
              originality: 'The proposed comparison is already reported in the supplied source.',
              significance: 'Useful as a historical reproducibility check; scientific impact beyond that is unestablished.',
              claim_leverage: 'Only fixed-model and dataset-specific historical comparisons are supportable.',
              reviewer_risks: ['Incomplete qrels and the absence of a new contribution constrain research value.'],
              effort_to_value: 'Archive scoring is bounded but its standalone paper value is weak.',
              strategic_fit: 'The scope matches the frozen archival slice, with an unresolved novelty objection.',
              negative_memory_check: 'No additional negative-memory evidence is claimed beyond the supplied trial feedback.',
              top_objections: ['Historical replication alone does not establish a novel method, mechanism or current-model result.'],
              uncertainty: 'Actual resource inspection and independent novelty assessment remain outside this fixture.',
              evidence_backed_rationale: 'BEIR reports retrieval tradeoffs and incomplete judgments; rerunning historical scores does not resolve the scientific novelty objection.',
              disposition_bridge: 'Controlled semantic-failure feedback requests another candidate; this is not a real researcher decision.' } });
          const assessed = await ctx.service.invokeNode({ ...assessmentInput,
            semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, assessmentInput, value)] });
          assert.ok(assessed.authority_ref && assessed.hashes.authority_hash, JSON.stringify(assessed));
          input = await n7FeedbackRequest(ctx, initial, trial, 'semantic_candidate_failure', undefined,
            { ref: assessed.authority_ref, hash: assessed.hashes.authority_hash });
          if (index === 0 && slot === 'synthesis') trial = await ctx.service.invokeNode(input);
        }
      }
      input = { ...input, workflow_run_id: key, node_attempt_id: `${key}_support`, run_mode: 'product',
        execution_spec: { execution_mode: 'codex_cli' }, cli_support_slots: [slot === 'grouping' ? 'n7_candidate_grouping'
          : slot === 'synthesis' ? 'n7_failed_trial_synthesis' : 'n7_n8_debate_admission_review'] };
      save('request', input); save('research', await service.resolveCodexResearchContext(input));
      const result = await service.invokeNode(input);
      save('result', result);
      assert.equal(result.route_decision, slot === 'synthesis' ? 'loopback' : 'invoke_next', JSON.stringify(result));
      const count = budget?.snapshot().attempts.length;
      assert.equal((await service.invokeNode(input)).replay_provenance?.replayed, true);
      assert.equal(budget?.snapshot().attempts.length, count);
    }
  } catch (error) {
    if (!(error instanceof QualificationPreviewComplete) || live) throw error;
  } finally { save('artifacts', await ctx.controlPlane.listArtifactRefsByWorkflowRunId(key)); }
});

// Opt-in here reuses the existing canonical setup without creating a second workflow simulator.
test('Codex product qualification with pinned research sources', {
  skip: !['prepare', 'live'].includes(process.env.TOPIC_SELECTION_CODEX_QUALIFICATION ?? ''),
}, async t => {
  const { qualificationSources, QUALIFICATION_SOURCE_PINS } = await import('./test-fixtures/topic-selection-codex-qualification-sources.js');
  const { qualificationRunner, QualificationPreviewComplete } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const sourceFile = process.env.TOPIC_SELECTION_QUALIFICATION_SOURCES;
  const outputRoot = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  if (!sourceFile || !outputRoot || !model || !home) throw new Error('Qualification needs explicit source/output paths and product CLI model/home.');
  const caseName = process.env.TOPIC_SELECTION_QUALIFICATION_CASE ?? 'ordinary';
  if (!['ordinary', 'insufficient', 'apparent-conflict', 'refinement-bounded', 'refinement-overclaim', 'regeneration-gate', 'regeneration-loopback'].includes(caseName)) throw new Error('Unknown qualification case.');
  const live = process.env.TOPIC_SELECTION_CODEX_QUALIFICATION === 'live';
  const shipped = process.env.TOPIC_SELECTION_QUALIFICATION_SHIPPED === '1';
  const downstreamFixture = process.env.TOPIC_SELECTION_QUALIFICATION_DOWNSTREAM_FIXTURE === '1';
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  if (runId && !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)) throw new Error('Invalid qualification run ID.');
  const runKey = `${shipped ? 'shipped' : 'staging'}_${downstreamFixture ? 'fixture_' : ''}${caseName}${runId ? `_${runId}` : ''}`;
  const uncapped = process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED === '1';
  const limits = live ? {
    attempts: uncapped ? null : Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPTS),
    tokens: uncapped ? null : Number(process.env.TOPIC_SELECTION_QUALIFICATION_TOKENS),
    duration_ms: uncapped ? null : Number(process.env.TOPIC_SELECTION_QUALIFICATION_DURATION_MS),
    attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS),
  } : null;
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY,
    timeout_ms: limits?.attempt_ms ?? 180_000 }, outputRoot, limits);
  t.after(() => runner.shutdown());
  t.after(() => budget?.close());
  if (live) {
    writeFileSync(join(directory, `${runKey}-manifest.json`), JSON.stringify({ run_key: runKey, model,
      limits, source_file: sourceFile, shipped_profiles: shipped, controlled_n6_fixture: downstreamFixture, controlled_regeneration_trigger: caseName.startsWith('regeneration-'), started_at: new Date().toISOString() }, null, 2),
    { mode: 0o600, flag: 'wx' }); // Refuse re-running a case before it can overwrite its retained evidence.
  }
  const sources = await qualificationSources(sourceFile, TITLE_CARD_ID, caseName === 'insufficient');
  const ctx = await seedHarnessV1aBundle({ evidenceUnits: sources.units,
    needStatement: 'Controlled qualification need: characterize dense versus lexical retrieval under domain shift and context placement. Novelty, dataset access and empirical benefits are not established by the supplied abstracts.' });
  const constraint = acceptedConstraintProfilePayload({ target_community: 'Information retrieval researchers',
    intended_contribution_style: 'empirical_study', method_constraints: ['One existing dense retriever and BM25; no foundation-model training'],
    resource_constraints: ['Fixed held-out evaluation; data and compute access require verification'],
    available_assets: sources.units.map(unit => `Versioned original abstract: ${unit.literature_ref.ref_id}`),
    claim_ceiling: 'A bounded hypothesis about retrieval robustness under specified evaluation conditions; no universal superiority or measured gains are established.',
    human_constraint_notes: 'Isolated test decision, not approval of an actual research direction.',
    constraint_payload: { source: 'isolated_qualification_fixture', case: caseName } });
  const draft = n4Draft();
  const option = draft.options[0]!;
  draft.recommended_option_key = 'bounded_retrieval_comparison';
  draft.comparison_axes = ['domain transfer', 'retrieval baseline', 'context placement'];
  draft.comparison_summary = 'Controlled retrieval slice for role qualification; scientific merit is unqualified.';
  draft.options[0] = { ...option, option_key: draft.recommended_option_key, contribution_type_candidate: 'empirical_study',
    dependency_risks: ['Dataset and compute access remain unverified'], main_risks: ['Abstract-only evidence does not establish novelty or empirical superiority'],
    slice_budget: { retriever_count: 1, lexical_baseline_count: 1, dataset_access: 'unverified' },
    slice_statement: 'Evaluate an existing dense retriever against BM25 under a fixed domain shift; separately vary relevant-passage placement.',
    problem_space: 'Retrieval generalization and context placement', target_setting: 'Held-out open-domain question answering',
    target_community: 'Information retrieval researchers', included_boundaries: ['One retriever, BM25 and a fixed held-out evaluation'],
    excluded_boundaries: [...constraint.non_goals, 'Universal cross-domain superiority', 'Foundation-model training', 'Claims beyond the supplied evidence'],
    support_evidence_refs: sources.units.filter(unit => unit.evidence_role === 'support').map(unit => ref('evidence_unit', unit.evidence_unit_id)),
    baseline_evidence_refs: sources.units.filter(unit => unit.evidence_role === 'baseline').map(unit => ref('evidence_unit', unit.evidence_unit_id)),
    context_evidence_refs: sources.units.filter(unit => unit.evidence_role === 'context').map(unit => ref('evidence_unit', unit.evidence_unit_id)),
    resource_assumptions: ['Use existing models; verify access before implementation'], data_assumptions: ['Only versioned abstracts are currently supplied'],
    evaluation_path: 'Specify held-out retrieval recall and QA outcome measurements; compare BM25 and context-position controls.',
    baseline_assumptions: ['BM25 is required; dense superiority is a hypothesis rather than an input fact'],
    expected_claim: 'A bounded comparison can characterize retrieval robustness under specified conditions.',
    fallback_claim: 'No reliable superiority conclusion; report uncertainty and missing evidence.',
    observable_success_criteria: ['Testable bounded questions and explicit evidence limitations'],
    claim_ceiling_alignment: { status: 'aligned', rationale: 'No observed gain or universal transfer claim.', confidence: 0.8 },
    details_payload: { isolated_qualification: true, case: caseName,
      apparent_conflict_to_examine: caseName === 'apparent-conflict' ? 'DPR reports QA improvements whereas BEIR reports limited zero-shot generalization. Do these observations conflict under the same conditions?' : null },
  };
  const setup = await runReadyN5(ctx, constraint, draft);
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  if (!shipped) {
    // Qualification staging only. A later run without these overrides is required for product activation.
    for (const profile of registry.profiles.filter(profile => profile.profile_id.startsWith('topic-selection.v1b.n6-debate.')
      || [TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
        TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
        TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
        TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support].some(id => id === profile.profile_id)
      || (caseName.startsWith('refinement-') && (profile.output_contract === TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION
        || profile.output_contract === 'N6RefinementDeltaDebateAdmission@v1')))) {
      if (!profile.allowed_execution_modes.includes('codex_cli')) profile.allowed_execution_modes.push('codex_cli');
      profile.run_mode_eligibility.codex_cli = ['product'];
    }
  }
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({ controlPlane: ctx.controlPlane, modelProfileRegistry,
    codexCliRunner: runner, codexCliModelId: model });
  const service = new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, { modelProfileRegistry,
    agentOrchestrator, evidencePacketResolver: sources.resolver(ctx.evidenceRepository),
    runnerDependencies: { evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository },
  });
  const qualificationWorkflows = new Set(['workflow_run_v1b_n6', 'workflow_run_v1b_n7', 'workflow_run_v1b_n8', 'workflow_run_v1b_n9', `qualification_${runKey}_refinement`]);
  let input = await n6Request(ctx, setup.n5, { execution_spec: { execution_mode: 'codex_cli', model_option_id: null },
    run_mode: 'product', node_attempt_id: `qualification_${runKey}_n6` });
  if (caseName.startsWith('regeneration-')) {
    assert.equal(downstreamFixture, false, 'Regeneration must execute N6 roles, not substitute their output.');
    input = await qualificationRegenerationInput(ctx, input, runKey, caseName === 'regeneration-loopback', qualificationWorkflows);
  }
  const research = await service.resolveCodexResearchContext(input);
  writeFileSync(join(directory, `${runKey}-research.json`), JSON.stringify({ research, isolated_upstream_and_human_fixtures: true,
    source_pins: QUALIFICATION_SOURCE_PINS.filter(pin => sources.units.some(unit => unit.evidence_unit_id === pin.unit)), shipped_profiles: shipped }, null, 2), { mode: 0o600 });
  const results: unknown[] = [];
  try {
    const fixtureInput = { ...input, execution_spec: null, run_mode: null };
    const n6 = downstreamFixture ? await ctx.service.invokeNode({ ...fixtureInput,
      semantic_artifacts: [await recordN6DraftArtifact(ctx, fixtureInput, await qualificationN6Fixture(ctx, fixtureInput))] })
      : await service.invokeNode(input);
    results.push({ node: downstreamFixture ? 'n6_controlled_fixture' : 'n6', result: n6 });
    if (downstreamFixture) assert.ok(n6.authority_ref && n6.handoff_ref, JSON.stringify(n6));
    if (n6.authority_ref && n6.handoff_ref && ['admitted', 'admitted_with_warnings'].includes(n6.gate_status)) {
      const calls = budget?.snapshot().attempts.length ?? 0;
      if (!downstreamFixture) assert.equal((await service.invokeNode(input)).replay_provenance?.replayed, true);
      assert.equal(budget?.snapshot().attempts.length ?? 0, calls);
      const n7Input = { ...await n7Request(ctx, n6), node_attempt_id: `qualification_${runKey}_n7`, execution_spec: input.execution_spec, run_mode: 'product' as const };
      const n7 = await service.invokeNode(n7Input);
      results.push({ node: 'n7', result: n7 });
      if (n7.authority_ref && n7.handoff_ref && ['admitted', 'admitted_with_warnings'].includes(n7.gate_status)) {
        const n8Input = await n8Request(ctx, n7, { execution_spec: input.execution_spec, run_mode: 'product', node_attempt_id: `qualification_${runKey}_n8` }, { confirmQuestionCheckpoint: false });
        await assert.rejects(service.invokeNode(n8Input), /checkpoint|advance|decision|confirmed/i);
        await confirmQuestionCheckpoint(ctx); // Isolated test decision, never a real research-project approval.
        if (!caseName.startsWith('refinement-')) results.push({ node: 'n8', result: await service.invokeNode(n8Input) });
        if (caseName.startsWith('refinement-')) {
          const deltaRuntime = new TopicSelectionV1bN6RefinementDeltaDebateRuntimeService(ctx.controlPlane, { modelProfileRegistry, agentOrchestrator,
            resolveResearchContext: input => service.resolveCodexResearchContext(input) });
          results.push(await qualifyExactRefinement(ctx, service, deltaRuntime, n7Input, n8Input, runKey, caseName === 'refinement-overclaim'));
        }
        if (caseName === 'ordinary') {
          const forced = await service.invokeNode({ ...n8Input, node_attempt_id: `qualification_${runKey}_n8_request_debate`,
            operator_debate_request: { reason: 'Isolated qualification requests the existing conditional review.', requested_by: 'qualification_fixture' } });
          results.push({ node: 'n8_operator_debate_request', result: forced });
          if (forced.error_code === 'N8_OPERATOR_FORCED_DEBATE_TRIGGER' && forced.authority_ref) {
            const feedback = await ctx.controlPlane.getArtifactRef(forced.authority_ref.ref_id);
            assert.ok(feedback?.payload);
            const feedbackInput = { ...await n7FeedbackRequest(ctx, n7Input, n7, 'gate_rejected', {
              artifact_ref: forced.authority_ref, artifact_hash: canonicalHash(feedback), payload_hash: canonicalHash(feedback.payload),
            }), execution_spec: input.execution_spec, run_mode: 'product' as const, node_attempt_id: `qualification_${runKey}_n7_feedback` };
            const readmitted = await service.invokeNode(feedbackInput);
            results.push({ node: 'n7_feedback', result: readmitted });
            if (readmitted.authority_ref && readmitted.handoff_ref) {
              results.push({ node: 'n8_conditional_debate', result: await service.invokeNode(await n8Request(ctx, readmitted,
                { execution_spec: input.execution_spec, run_mode: 'product', node_attempt_id: `qualification_${runKey}_n8_debate` })) });
            }
          }
        }
      }
    }
  } catch (error) {
    if (!live && error instanceof QualificationPreviewComplete) return;
    results.push({ failure: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    writeFileSync(join(directory, `${runKey}-results.json`), JSON.stringify(results, null, 2), { mode: 0o600 });
    for (const workflow of qualificationWorkflows) {
      writeFileSync(join(directory, `${runKey}-${workflow}.json`), JSON.stringify(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(workflow), null, 2), { mode: 0o600 });
    }
  }
});

// An independently controlled predecessor for later-role qualification; never presented as a live N6 verdict.
async function qualificationN6Fixture(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, input: TopicSelectionV1bWorkflowHarnessRunRequest) {
  const draft = await n6Draft(ctx, input);
  const candidate = draft.candidates[0]!;
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  const rows = await ctx.researchSliceRepository.listEvidenceRefsByResearchSliceId(payload.research_slice_ref.ref_id);
  const evidence = rows.map(row => row.evidence_ref);
  const support = evidence.filter(item => item.ref_id === 'evidence_unit_support_1');
  const baseline = evidence.filter(item => item.ref_id === 'evidence_unit_baseline_1');
  const context = evidence.filter(item => item.ref_id === 'evidence_unit_context_1');
  assert.ok(support.length && baseline.length && context.length, 'Controlled downstream setup requires all three pinned sources.');
  return {
    ...draft,
    question_frame: { target_setting: 'One fixed held-out open-domain QA evaluation', target_community: 'Information retrieval researchers',
      object_scope: 'One existing dense retriever, BM25 and a fixed reader', task_scope: 'Bounded paired retrieval and QA comparison',
      intervention_or_approach: 'Compare retrieval on identical questions and corpus with a fixed context policy', comparison_baseline: 'BM25',
      observable_outcome: 'Paired recall@20 and normalized QA exact match with uncertainty', assumption_refs: [], evidence_refs: evidence,
      frame_payload: { controlled_predecessor_fixture: true, resources_are_hypothetical: true } },
    generation_notes: ['Controlled N6 predecessor for independent downstream qualification; not a live Arbiter selection or evidence of research readiness.'],
    candidates: [{ ...candidate, main_question: 'Does one frozen dense retriever differ from BM25 in paired passage recall@20 on the same held-out QA questions?',
      sub_questions: ['Do retrieval differences accompany QA exact-match differences under a fixed reader and context policy?'],
      question_type: 'analysis' as const, contribution_hypothesis: 'analysis' as const,
      answerability_plan: { datasets_or_resources: ['Controlled operational fixture: a fixed corpus, held-out QA queries, relevance judgments and reference answers.',
        'One existing dense checkpoint, a reproducible BM25 implementation and one fixed reader are hypothetical resources in this fixture.'],
        metrics: ['Macro recall@20 over queries with judged relevant passages', 'Binary retrieval hit rate reported separately', 'Paired QA exact match and query-bootstrap uncertainty'],
        baselines: ['BM25 using the identical corpus and queries'], ablations_or_comparisons: ['Identical context-packing policy for the fixed reader'],
        evaluation_setting: 'Prespecified held-out comparison with no test-set tuning; it estimates a setting-specific difference, not causal transfer degradation.',
        dependency_risks: ['Actual data, model and compute access require verification; operational availability is controlled fixture input.'],
        open_dependencies: ['Verify access and label quality before real implementation.'], known_gaps: ['The three abstracts do not establish novelty or outcomes for this evaluation.'],
        required_evidence_refs: evidence }, answerability_verdict: 'answerable_with_risk' as const,
      expected_claim: 'A measured paired difference could characterize only the prespecified held-out evaluation and fixed models.',
      fallback_claim: 'A negligible or uncertain difference provides no support for superiority.',
      max_claim_strength: 'Bounded hypothesis; neither measured gains nor universal transfer nor novelty is established.',
      observable_success_criteria: ['Report denominators, paired differences and uncertainty without treating nonsignificance as equivalence.'],
      traceability_check: { support_evidence_refs: support, challenge_evidence_refs: baseline, baseline_evidence_refs: baseline,
        context_evidence_refs: context, mapped_evidence_refs: evidence, unmapped_assumptions: ['Target evaluation and resource access are controlled assumptions.'] },
      falsification_conditions: [{ ...candidate.falsification_conditions[0]!, condition_type: 'data_unavailable' as const,
        statement: 'If usable relevance judgments or the shared held-out corpus cannot be obtained, park this comparison before implementation.',
        trigger_evidence_refs: [], trigger_source_refs: [payload.research_slice_ref], related_contract_fields: ['answerability_plan.datasets_or_resources'],
        expected_action: 'park' as const }],
      risk_notes: ['Abstract-only evidence and hypothetical resource availability do not establish research readiness.'],
      objections: ['DPR and BEIR use different settings; their reported results are not a matched contradiction.'],
      human_review_triggers: ['A real researcher must verify resources, novelty and the exact protocol.'] }],
  } satisfies TopicSelectionV1bTopicQuestionCandidateSetDraftPayload;
}

// Materialize a labelled failed predecessor through canonical gates, then review its real projection.
async function qualificationRegenerationInput(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  runKey: string,
  fromN7: boolean,
  workflows: Set<string>,
) {
  const predecessor = { ...input, execution_spec: null, run_mode: null,
    node_attempt_id: `qualification_${runKey}_controlled_predecessor` };
  const draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = await qualificationN6Fixture(ctx, predecessor);
  if (!fromN7) {
    draft.candidates[0]!.answerability_verdict = 'not_answerable';
    draft.candidates[0]!.risk_notes.push('Controlled rejected predecessor: no usable target evaluation or resource access has been established.');
    const failed = await ctx.service.invokeNode({ ...predecessor,
      semantic_artifacts: [await generateN6RegularDebateDraftArtifact(ctx, predecessor, draft)] });
    assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE', JSON.stringify(failed));
    return n6InputWithN6GateFailureProjection(input, await n6GateFailureRetryProjectionRef(ctx, failed));
  }
  const n6 = await ctx.service.invokeNode({ ...predecessor,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, predecessor, draft)] });
  assert.ok(n6.authority_ref && n6.handoff_ref, JSON.stringify(n6));
  const n7Input = await n7Request(ctx, n6);
  const n7 = await ctx.service.invokeNode(n7Input);
  const feedbackInput = await n7FeedbackRequest(ctx, n7Input, n7);
  workflows.add(feedbackInput.workflow_run_id);
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref.ref_id);
  const exhausted = await ctx.service.invokeNode({ ...feedbackInput,
    semantic_artifacts: [await generateN7RuntimeSupportArtifact(ctx, feedbackInput, 'n7_failed_trial_synthesis', {
      exhausted_candidate_refs: candidates.map(candidate => ref('topic_question_candidate', candidate.topic_question_candidate_id)),
      failure_reason_codes: ['value_not_supported'],
      synthesis_summary: 'Controlled qualification feedback: the single bounded comparison has unverified novelty and resources; its trial is exhausted.',
      n6_regeneration_hints: ['Reconsider the frozen evidence and return evidence expansion if no answerable alternative exists. Do not invent availability or positive results.'],
      affected_refs: [n6.authority_ref],
    })] });
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED', JSON.stringify(exhausted));
  return n6InputWithN7LoopbackProjection(input, await n7LoopbackProjectionRef(ctx, exhausted));
}

// Control the refinement disposition and exact Human delta; the predecessor may also be a disclosed N6 fixture.
// Reuse its scoped question/evidence; the three review roles execute through the actual CLI.
async function qualifyExactRefinement(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  service: TopicSelectionV1bWorkflowHarnessService,
  runtime: TopicSelectionV1bN6RefinementDeltaDebateRuntimeService,
  n7Input: TopicSelectionV1bWorkflowHarnessRunRequest,
  n8Input: TopicSelectionV1bWorkflowHarnessRunRequest,
  runKey: string,
  overclaim: boolean,
) {
  const fixtureN8Input = { ...n8Input, node_attempt_id: `qualification_${runKey}_refinement_trigger`,
    execution_spec: undefined, run_mode: 'acceptance' as const };
  const fixtureDraft = n8ValueDraft(fixtureN8Input, { readiness_status: 'needs_refinement', recommended_disposition: 'refine_question',
    reasoning_memo: { ...n8ValueDraft(fixtureN8Input).reasoning_memo, recommendation: 'refine_question',
      disposition_bridge: 'Isolated fixture requests review of an exact claim-ceiling refinement; this is not a live value verdict.' } });
  const trigger = await ctx.service.invokeNode({ ...fixtureN8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, fixtureN8Input, fixtureDraft)] });
  assert.ok(trigger.authority_ref && trigger.handoff_ref, JSON.stringify(trigger));
  const n9 = await ctx.service.invokeNode(await n9Request(ctx, trigger));
  assert.ok(n9.handoff_ref, JSON.stringify(n9));
  const handoff = (await ctx.controlPlane.getArtifactRef(n9.handoff_ref.ref_id))!.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const source = handoff.payload as unknown as { previous_topic_question_contract_ref: TopicSelectionFunctionalRef;
    previous_topic_question_contract_hash: string; value_disposition_ref: TopicSelectionFunctionalRef; value_disposition_hash: string;
    topic_value_assessment_ref: TopicSelectionFunctionalRef; topic_value_assessment_hash: string };
  const previous = await ctx.topicQuestionRepository.findTopicQuestionContractById(source.previous_topic_question_contract_ref.ref_id);
  assert.ok(previous);
  const plan = await ctx.topicQuestionRepository.findAnswerabilityPlanByContractId(previous.topic_question_contract_id);
  assert.ok(plan);
  const refinement: TopicSelectionV1bN9QuestionRefinementPayload = { schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
    refinement_id: `qualification_${runKey}_human_delta`, actor: { actor_type: 'human', actor_id: 'isolated_qualification_fixture' },
    rationale: 'Controlled qualification of immutable claim-ceiling edits; no real research approval.',
    updates: { expected_claim: overclaim
      ? 'The supplied abstracts prove that dense retrieval universally outperforms BM25 across all domains and that context placement cannot affect answer quality.'
      : 'Any observed comparison applies only to the prespecified held-out evaluation and fixed models; superiority, transfer and novelty remain unestablished until measured.' } };
  const refinementRequest = request({ workflow_run_id: `qualification_${runKey}_refinement`,
    node_attempt_id: `qualification_${runKey}_materialize_delta`, node_id: n7Input.node_id, title_card_id: TITLE_CARD_ID, created_by: 'human',
    frozen_input: { input_contract: 'N9ToN7RefinementHandoff@v1', snapshot_kind: 'topic_question_candidate_set',
      source_refs: uniqueRefs([...n7Input.frozen_input.source_refs, n9.handoff_ref, ...handoff.required_refs]),
      payload: { ...n7Input.frozen_input.payload, input_mode: 'refinement_from_n9', n9_handoff_hash: n9.hashes.handoff_hash,
        previous_topic_question_contract_ref: source.previous_topic_question_contract_ref,
        previous_topic_question_contract_hash: source.previous_topic_question_contract_hash,
        value_disposition_ref: source.value_disposition_ref, value_disposition_hash: source.value_disposition_hash,
        topic_value_assessment_ref: source.topic_value_assessment_ref, topic_value_assessment_hash: source.topic_value_assessment_hash,
        question_refinement: refinement } } });
  const refined = await ctx.service.invokeNode(refinementRequest);
  assert.ok(refined.authority_ref && refined.handoff_ref, JSON.stringify(refined));
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(TITLE_CARD_ID, 'question_contract');
  assert.ok(checkpoint);
  const decision = await ctx.researchCheckpointService.recordDecision(checkpoint.research_checkpoint_id, {
    decision_key: `qualification_${runKey}_review_delta`, decision: 'loopback', actor: { actor_type: 'human', actor_id: 'isolated_qualification_fixture' },
    confirmed_snapshot_hash: checkpoint.target_snapshot_hash, rationale: 'Isolated Human fixture requests exact-delta review.',
    review_payload: { review_kind: 'question_contract', mechanism_identifiable: true, proxy_operationalized: true, confounds_reviewed: true,
      falsification_reviewed: true, claim_ceiling_reviewed: true, objections_reviewed: true, review_notes: ['Qualification fixture, not a real approval.'] },
    loopback_target: 'question_contract', loopback_refs: [refined.authority_ref],
  });
  const currentHandoff = (await ctx.controlPlane.getArtifactRef(refined.handoff_ref.ref_id))!.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const active = currentHandoff.payload as unknown as { active_candidate_ref: TopicSelectionFunctionalRef; active_candidate_hash: string;
    selected_research_slice_ref: TopicSelectionFunctionalRef; selected_research_slice_hash: string };
  const classification = classifyTopicSelectionV1bRefinementDelta({ main_question: previous.main_question,
    contribution_hypothesis: previous.contribution_hypothesis, expected_claim: previous.expected_claim, fallback_claim: previous.fallback_claim,
    evaluation_setting: plan.evaluation_setting, metrics: plan.metrics, baselines: plan.baselines, ablations_or_comparisons: plan.ablations_or_comparisons,
    dependency_risks: plan.dependency_risks, open_dependencies: plan.open_dependencies, known_gaps: plan.known_gaps, risk_notes: previous.risk_notes }, refinement);
  const checkpointRef = ref('research_checkpoint', checkpoint.research_checkpoint_id, TITLE_CARD_ID);
  const decisionRef = ref('research_checkpoint_decision', decision.research_checkpoint_decision_id, TITLE_CARD_ID);
  const reviewed = request({ ...refinementRequest, node_attempt_id: `qualification_${runKey}_reviewed_delta`, run_mode: 'product',
    frozen_input: { input_contract: 'N7ReviewedRefinement@v1', snapshot_kind: 'topic_question_candidate_set',
      source_refs: uniqueRefs([...refinementRequest.frozen_input.source_refs, ...currentHandoff.required_refs,
        refined.handoff_ref, refined.authority_ref, checkpointRef, decisionRef]),
      payload: { ...refinementRequest.frozen_input.payload, input_mode: 'reviewed_refinement',
        current_n7_handoff_ref: refined.handoff_ref, current_n7_handoff_hash: refined.hashes.handoff_hash,
        current_topic_question_contract_ref: refined.authority_ref, current_topic_question_contract_hash: refined.hashes.authority_hash,
        source_checkpoint_ref: checkpointRef, source_checkpoint_decision_ref: decisionRef,
        evidence_ceiling_refs: currentHandoff.required_refs, evidence_ceiling_hash: canonicalHash(currentHandoff.required_refs) } } });
  const before = await ctx.topicQuestionRepository.findTopicQuestionContractById(refined.authority_ref.ref_id);
  const context = {
    source_kind: 'question_checkpoint_loopback' as const, source_decision_ref: decisionRef, checkpoint_ref: checkpointRef,
    previous_topic_question_contract_ref: source.previous_topic_question_contract_ref,
    previous_topic_question_contract_hash: source.previous_topic_question_contract_hash,
    current_topic_question_contract_ref: refined.authority_ref, current_topic_question_contract_hash: refined.hashes.authority_hash!,
    proposed_contract_semantic_hash: refined.hashes.authority_hash!, refinement, refinement_hash: canonicalHash(refinement),
    delta_hash: classification.delta_hash, changed_fields: classification.changed_fields,
    selected_candidate_ref: active.active_candidate_ref, selected_candidate_hash: active.active_candidate_hash,
    selected_research_slice_ref: active.selected_research_slice_ref, selected_research_slice_hash: active.selected_research_slice_hash,
    evidence_ceiling_refs: currentHandoff.required_refs, evidence_ceiling_hash: canonicalHash(currentHandoff.required_refs), source_refs: reviewed.frozen_input.source_refs,
  };
  const debate = await runtime.runDebate({ request: reviewed, execution_mode: 'codex_cli', context });
  assert.ok(debate.status === 'completed' || debate.status === 'blocked', 'Qualification requires a terminal semantic review.');
  // A negative verdict and a binding failure share a gate code; prove the exact context first.
  const { refinement: _refinement, evidence_ceiling_refs: _ceilingRefs, source_refs: _sourceRefs, ...binding } = context;
  for (const key of Object.keys(binding) as (keyof typeof binding)[]) {
    assert.deepEqual(debate.admission[key], binding[key], `Refinement admission binding: ${key}`);
  }
  assert.equal(debate.admission.workflow_run_id, reviewed.workflow_run_id);
  assert.equal(debate.admission.policy_version, reviewed.policy_version);
  assert.equal(debate.admission.refinement_id, refinement.refinement_id);
  const gate = 'semantic_artifact' in debate ? await service.invokeNode({ ...reviewed, semantic_artifacts: [debate.semantic_artifact] }) : null;
  assert.ok(gate, 'Qualification must reach the final N7 gate, including blocked reviews.');
  if (overclaim) {
    assert.equal(debate.status, 'blocked');
    assert.equal(gate.gate_status, 'blocked');
    assert.equal(gate.authority_ref, null);
    assert.equal(gate.error_message, 'The exact refinement delta is blocked by its one-pass Debate; a new Human refinement hash is required.');
  } else {
    assert.equal(debate.status, 'completed');
    assert.ok(['admitted', 'admitted_with_warnings'].includes(gate.gate_status), JSON.stringify(gate));
  }
  const after = await ctx.topicQuestionRepository.findTopicQuestionContractById(refined.authority_ref.ref_id);
  assert.deepEqual(after, before, 'Review must not rewrite the exact Human-authored contract.');
  return { node: 'exact_refinement', controlled_disposition_and_human_fixture: true, overclaim, refinement, debate, gate };
}

test('N7 CLI explicitly groups candidates and synthesizes complete exhausted trial history', async t => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  draft.candidates.push({ ...structuredClone(draft.candidates[0]!), candidate_key: 'second_candidate',
    main_question: 'Can a bounded alternative make evidence review more reproducible?', expected_claim: 'The alternative evaluates reproducibility.' });
  draft.recommended_candidate_keys.push('second_candidate');
  const n6 = await ctx.service.invokeNode({ ...n6Input, semantic_artifacts: [await recordN6DraftArtifact(ctx, n6Input, draft)] });
  const initial = await n7Request(ctx, n6);
  const home = mkdtempSync(join(tmpdir(), 'n7-support-harness-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  let calls = 0;
  const contexts: Array<Record<string, unknown>> = [];
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls += 1;
    const packet = JSON.parse(options.stdin.split('[user]\n')[1]!) as { slot_id: string; context_packet: { research_context: Record<string, unknown> } };
    contexts.push(packet.context_packet.research_context);
    const output = packet.slot_id === 'n7_candidate_grouping' ? { ...n7GroupingPayload(initial), candidate_relationships: {} }
      : packet.slot_id === 'n7_n8_debate_admission_review' ? n7DebateAdmissionPayload()
      : { exhausted_candidate_refs: initial.frozen_input.payload.admissible_candidate_refs,
        failure_reason_codes: ['value_not_supported'], synthesis_summary: 'Both bounded candidates failed their recorded value trials.',
        n6_regeneration_hints: ['Address the recorded failure reasons before proposing another candidate.'],
        affected_refs: initial.frozen_input.payload.admissible_candidate_refs };
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'n7-support' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } })].join('\n'),
      stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const service = new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, { modelProfileRegistry,
    agentOrchestrator: new TopicSelectionAgentOrchestratorService({ controlPlane: ctx.controlPlane, modelProfileRegistry, codexCliRunner: runner, codexCliModelId: 'gpt-6-astra' }),
    evidencePacketResolver: { resolve: async input => ({ schema_version: 'TopicSelectionResearchEvidencePacket@v1',
      title_card_id: TITLE_CARD_ID, participant_role: input.participant_role, query_intent: input.query_intent,
      items: [], source_refs: input.evidence_unit_refs, total_excerpt_chars: 0, packet_hash: canonicalHash(input) }) },
    runnerDependencies: { evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository },
  });
  const groupInput: TopicSelectionV1bWorkflowHarnessRunRequest = { ...initial, run_mode: 'product',
    execution_spec: { execution_mode: 'codex_cli' }, cli_support_slots: ['n7_candidate_grouping', 'n7_n8_debate_admission_review'] };
  const record = ctx.controlPlane.recordArtifactRef.bind(ctx.controlPlane);
  ctx.controlPlane.recordArtifactRef = async input => {
    if (input.stable_key?.startsWith('n7-cli-input:')) throw new Error('Interrupted before the combined receipt.');
    return record(input);
  };
  await assert.rejects(service.invokeNode(groupInput), /Interrupted/);
  ctx.controlPlane.recordArtifactRef = record;
  assert.equal(calls, 2);
  await assert.rejects(service.invokeNode({ ...groupInput, cli_support_slots: undefined }), /existing attempt/);
  assert.equal(calls, 2, 'Changing slots after an interrupted attempt must stop before model work.');
  const first = await service.invokeNode(groupInput);
  assert.equal(first.route_decision, 'invoke_next', JSON.stringify(first));
  assert.equal(calls, 2, 'Recovery reuses both completed role receipts.');
  assert.equal((await service.invokeNode(groupInput)).replay_provenance?.replayed, true);
  await assert.rejects(service.invokeNode({ ...groupInput, cli_support_slots: undefined }), /existing attempt/);
  assert.equal(calls, 2);
  const technical = await n7FeedbackRequest(ctx, initial, first, 'technical_failure');
  await assert.rejects(service.invokeNode({ ...technical, run_mode: 'product', execution_spec: groupInput.execution_spec,
    cli_support_slots: ['n7_failed_trial_synthesis'] }), /technical/i);
  assert.equal(calls, 2);
  const assessmentInput = await n8Request(ctx, first);
  const assessmentDraft = n8ValueDraft(assessmentInput, { readiness_status: 'needs_refinement', recommended_disposition: 'refine_question',
    reasoning_memo: { ...n8ValueDraft(assessmentInput).reasoning_memo, recommendation: 'refine_question',
      evidence_backed_rationale: 'The recorded comparison lacks evidence for its proposed generalization.' } });
  const assessmentResult = await ctx.service.invokeNode({ ...assessmentInput,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, assessmentInput, assessmentDraft)] });
  assert.ok(assessmentResult.authority_ref && assessmentResult.hashes.authority_hash, JSON.stringify(assessmentResult));
  const feedback = await n7FeedbackRequest(ctx, initial, first, 'semantic_candidate_failure', undefined, {
    ref: assessmentResult.authority_ref, hash: assessmentResult.hashes.authority_hash,
  });
  const defaultInput = { ...feedback, run_mode: 'product' as const, execution_spec: groupInput.execution_spec };
  const readMemo = ctx.valueAssessmentRepository.findReasoningMemoById.bind(ctx.valueAssessmentRepository);
  ctx.valueAssessmentRepository.findReasoningMemoById = async id => {
    const memo = await readMemo(id);
    return memo ? { ...memo, title_card_id: 'foreign-title' } : null;
  };
  await assert.rejects(service.resolveCodexResearchContext(defaultInput), /bodies.*drifted/);
  ctx.valueAssessmentRepository.findReasoningMemoById = readMemo;
  const readSnapshot = ctx.valueAssessmentRepository.findInputSnapshotById.bind(ctx.valueAssessmentRepository);
  ctx.valueAssessmentRepository.findInputSnapshotById = async id => {
    const snapshot = await readSnapshot(id);
    return snapshot ? { ...snapshot, question_contract: { ...snapshot.question_contract, expected_claim: 'drifted original claim' } } : null;
  };
  await assert.rejects(service.resolveCodexResearchContext(defaultInput), /bodies.*drifted/);
  ctx.valueAssessmentRepository.findInputSnapshotById = readSnapshot;
  assert.equal(calls, 2);
  const legacyContextConfig = createDefaultTopicSelectionContextPolicyProfileRegistry();
  const legacyContext = legacyContextConfig.profiles.find(profile => profile.invocation_slot_id === 'n7_n8_debate_admission_review')!;
  legacyContext.token_budget_policy.estimated_input_token_target = 18000;
  const legacyRegistry = new TopicSelectionContextPolicyProfileRegistryService({ registry: legacyContextConfig });
  const resolve = TopicSelectionContextPolicyProfileRegistryService.prototype.resolveProfile;
  let legacyBudget = true;
  const profileMock = t.mock.method(TopicSelectionContextPolicyProfileRegistryService.prototype, 'resolveProfile',
    function (this: TopicSelectionContextPolicyProfileRegistryService, input: Parameters<typeof resolve>[0]) {
      return resolve.call(legacyBudget && input.context_policy_profile_id === legacyContext.context_policy_profile_id ? legacyRegistry : this, input);
    });
  ctx.controlPlane.recordArtifactRef = async input => {
    if (input.workflow_run_id === defaultInput.workflow_run_id && input.stable_key?.startsWith('cli-node-commit:')) {
      throw new Error('Interrupted before N7 authority commit.');
    }
    return record(input);
  };
  await assert.rejects(service.invokeNode(defaultInput), /Interrupted before N7 authority commit/);
  ctx.controlPlane.recordArtifactRef = record;
  legacyBudget = false;
  await assert.rejects(service.invokeNode(defaultInput), /drifted before a verified completion/);
  assert.equal(calls, 3, 'A new context policy cannot consume uncommitted old-policy output.');
  legacyBudget = true;
  const second = await service.invokeNode(defaultInput);
  legacyBudget = false;
  profileMock.mock.restore();
  assert.equal(second.route_decision, 'invoke_next', JSON.stringify(second));
  assert.equal(calls, 3);
  await assert.rejects(service.invokeNode({ ...defaultInput, cli_support_slots: ['n7_candidate_grouping'] }), /existing attempt/);
  assert.equal((await service.invokeNode(defaultInput)).replay_provenance?.replayed, true, 'A completed 18k-policy result replays under the new 32k default.');
  assert.equal(calls, 3);
  const exhausted = await n7FeedbackRequest(ctx, initial, second);
  const synthesisInput: TopicSelectionV1bWorkflowHarnessRunRequest = { ...exhausted, run_mode: 'product',
    execution_spec: groupInput.execution_spec, cli_support_slots: ['n7_failed_trial_synthesis'] };
  const result = await service.invokeNode(synthesisInput);
  assert.equal(result.route_decision, 'loopback', JSON.stringify(result));
  assert.equal(result.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  const history = contexts.at(-1)!.trial_history as Array<{ contract: { source_candidate_id: string }; feedback: { feedback_summary: string }; decision: unknown; answerability_plan: unknown }>;
  assert.equal(history.length, 2);
  assert.equal(new Set(history.map(trial => trial.contract.source_candidate_id)).size, 2);
  assert.ok(history.every(trial => trial.decision && trial.answerability_plan && trial.feedback.feedback_summary));
  assert.match(JSON.stringify(history), /The recorded comparison lacks evidence for its proposed generalization/);
  assert.equal(calls, 4);
  assert.equal((await service.invokeNode(synthesisInput)).replay_provenance?.replayed, true);
  assert.equal(calls, 4);
});

for (const [generationMode, triage] of [
  ['initial_from_n5', null], ['regeneration_after_n6_gate_failure', null], ['regeneration_after_n7_loopback', null],
  ['initial_from_n5', 'blocked'], ['initial_from_n5', 'admitted'],
] as const) {
test(`canonical N6/N7/N8 CLI composes ${generationMode}, triage=${triage}, recovery and Human stops`, async (t) => {
  const home = mkdtempSync(join(tmpdir(), 'harness-n6-cli-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const ctx = await seedHarnessV1aBundle();
  const setup = generationMode === 'regeneration_after_n7_loopback'
    ? await runN7ExhaustionLoopbackFixture(ctx, 'cli_regeneration') : await runReadyN5(ctx);
  let baseRequest = await n6Request(ctx, setup.n5, { node_attempt_id: `n6_cli_${generationMode}` });
  if ('projectionRef' in setup) baseRequest = n6InputWithN7LoopbackProjection(baseRequest, setup.projectionRef);
  if (generationMode === 'regeneration_after_n6_gate_failure') {
    const failedInput = await n6Request(ctx, setup.n5, { node_attempt_id: 'n6_fixture_gate_failure' });
    const failedDraft = await n6Draft(ctx, failedInput);
    failedDraft.candidates[0] = { ...failedDraft.candidates[0]!, answerability_verdict: 'not_answerable', main_question: 'How can AI improve research?' };
    const failed = await ctx.service.invokeNode({ ...failedInput,
      semantic_artifacts: [await generateN6RegularDebateDraftArtifact(ctx, failedInput, failedDraft)] });
    assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
    baseRequest = n6InputWithN6GateFailureProjection(baseRequest, await n6GateFailureRetryProjectionRef(ctx, failed));
  }
  const request: TopicSelectionV1bWorkflowHarnessRunRequest = { ...baseRequest,
    ...(triage ? { cli_support_slots: ['n6_loopback_triage'] } : {}),
    execution_spec: { execution_mode: 'codex_cli', model_option_id: null }, run_mode: 'product' };
  const draft = await n6Draft(ctx, request);
  if (triage === 'blocked') draft.candidates[0]!.answerability_verdict = 'not_answerable';
  if (generationMode !== 'initial_from_n5') {
    draft.candidates[0] = { ...draft.candidates[0]!, candidate_key: 'cli_regenerated_candidate' };
    draft.recommended_candidate_keys = ['cli_regenerated_candidate'];
  }
  const registry = createDefaultTopicSelectionModelProfileRegistry();
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
  let calls = 0;
  let evidenceReads = 0;
  let valueDraft: TopicSelectionV1bTopicValueAssessmentDraftPayload | null = null;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls += 1;
    const packet: { slot_id?: string; role_slot: string; context_packet: { generation_mode?: string; research_context: { frozen_domain: { researchSlice: unknown } }; prior_role_outputs: unknown[] } } = JSON.parse(options.stdin.split('[user]\n')[1]!);
    assert.ok(packet.context_packet.research_context.frozen_domain.researchSlice);
    if (packet.role_slot?.startsWith('n6_debate_')) assert.equal(packet.context_packet.generation_mode, generationMode);
    if (packet.role_slot) assert.equal(packet.context_packet.prior_role_outputs.length, calls <= 4 ? (calls < 3 ? 0 : calls - 1) : calls - 9);
    const output = packet.slot_id === 'n6_loopback_triage' ? n6LoopbackTriagePayload(request) : packet.slot_id === 'n7_n8_debate_admission_review' ? { debate_level: 'compact_assessment_debate',
      recommended_profile_id: 'topic-selection.v1b.assess-topic-value.compact.v1', high_value_signal_codes: [], risk_signal_codes: [], rationale: 'The frozen slice permits a bounded assessment.' } : packet.role_slot?.startsWith('n8_debate_') ? { schema_version: 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1', role_slot: packet.role_slot,
      ...(packet.role_slot === 'n8_debate_value_critic' ? { critic_findings: [] } : { assessment_draft: valueDraft,
        ...(packet.role_slot === 'n8_debate_assessor_draft' ? {} : { repair_actions: [] }) }),
    } : valueDraft ?? { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: packet.role_slot,
      ...(packet.role_slot === 'n6_debate_explorer' ? { candidate_seeds: [{ seed_id: `seed-${calls}`, question_framing: 'Measure retrieval errors.', evidence_refs: [] }] }
        : packet.role_slot === 'n6_debate_critic' ? { critic_findings: [] } : { synthesized_candidate_set: draft, repair_actions: [] }),
    };
    return { stdout: [
      { type: 'thread.started', thread_id: `n6-thread-${calls}` },
      { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } },
    ].map(event => JSON.stringify(event)).join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  const makeService = (controlPlane = ctx.controlPlane) => new TopicSelectionV1bWorkflowHarnessService(controlPlane, {
    modelProfileRegistry,
    agentOrchestrator: new TopicSelectionAgentOrchestratorService({ controlPlane, modelProfileRegistry, codexCliRunner: runner, codexCliModelId: 'gpt-6-astra' }),
    evidencePacketResolver: { resolve: async input => {
      evidenceReads += 1;
      assert.equal(input.title_card_id, TITLE_CARD_ID);
      assert.ok(input.evidence_unit_refs.length > 0 && input.evidence_unit_refs.every(ref => ref.ref_type === 'evidence_unit'));
      return { schema_version: 'TopicSelectionResearchEvidencePacket@v1', title_card_id: TITLE_CARD_ID,
        participant_role: input.participant_role, query_intent: input.query_intent, items: [], source_refs: input.evidence_unit_refs,
        total_excerpt_chars: 0, packet_hash: canonicalHash(input), };
    } },
    runnerDependencies: {
      evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
      recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
      researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
      topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository,
    },
  });
  const service = makeService();
  if (generationMode !== 'initial_from_n5') {
    const research = await service.resolveCodexResearchContext(request);
    assert.ok(research.regeneration_context, 'Regeneration must include failed question bodies, not just hashes.');
    assert.match(JSON.stringify(research.regeneration_context), /main_question/);
    assert.match(JSON.stringify(research.regeneration_context), generationMode === 'regeneration_after_n6_gate_failure'
      ? /How can AI improve research/ : /second candidate preserve N7 exhaustion/);
    const read = ctx.controlPlane.getArtifactRef.bind(ctx.controlPlane);
    ctx.controlPlane.getArtifactRef = async id => {
      const artifact = await read(id);
      return artifact?.payload && 'candidates' in artifact.payload
        ? { ...artifact, payload: { ...artifact.payload, generation_notes: ['drifted failed proposal'] } } : artifact;
    };
    try { await assert.rejects(service.resolveCodexResearchContext(request), /proposal or feedback body.*drifted/); }
    finally { ctx.controlPlane.getArtifactRef = read; }
    assert.equal(calls, 0, 'Regeneration body drift must stop before model work.');
  }
  if (triage === 'blocked') {
    const record = ctx.controlPlane.recordArtifactRef.bind(ctx.controlPlane);
    ctx.controlPlane.recordArtifactRef = async input => {
      if (input.stable_key?.startsWith('n6-cli-triage:') && !input.stable_key.includes(':context:')) {
        throw new Error('Interrupted before triage receipt.');
      }
      return record(input);
    };
    await assert.rejects(service.invokeNode(request), /Interrupted before triage receipt/);
    ctx.controlPlane.recordArtifactRef = record;
    assert.equal(calls, 5);
    const result = await service.invokeNode(request);
    assert.equal(result.route_decision, 'loopback', JSON.stringify(result));
    assert.equal(calls, 5, 'One requested triage follows the four actual Debate roles only after semantic gate failure.');
    assert.ok(result.trace_snapshot_ref);
    const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref.ref_id);
    assert.equal(typeof trace?.payload.triage_payload_hash, 'string');
    assert.ok(trace?.payload.triage_artifact_ref);
    const triageRef = trace.payload.triage_artifact_ref as TopicSelectionFunctionalRef;
    const triageArtifact = await ctx.controlPlane.getArtifactRef(triageRef.ref_id);
    assert.equal(canonicalHash(triageArtifact?.payload), trace.payload.triage_payload_hash);
    assert.equal((await makeService().invokeNode(request)).replay_provenance?.replayed, true);
    assert.equal(calls, 5);
    return;
  }
  let result: Awaited<ReturnType<typeof service.invokeNode>>;
  if (generationMode === 'initial_from_n5') {
    let releaseReceipt!: () => void;
    let reachedReceipt!: () => void;
    const receiptReached = new Promise<void>(resolve => { reachedReceipt = resolve; });
    const receiptRelease = new Promise<void>(resolve => { releaseReceipt = resolve; });
    t.after(() => releaseReceipt());
    let releaseAuthority!: () => void;
    let reachedAuthority!: () => void;
    const authorityReached = new Promise<void>(resolve => { reachedAuthority = resolve; });
    const authorityRelease = new Promise<void>(resolve => { releaseAuthority = resolve; });
    t.after(() => releaseAuthority());
    let authorityWrites = 0;
    const create = ctx.topicQuestionRepository.createFormationRunWithCandidates.bind(ctx.topicQuestionRepository);
    ctx.topicQuestionRepository.createFormationRunWithCandidates = async persistence => {
      authorityWrites += 1;
      if (authorityWrites === 1) { reachedAuthority(); await authorityRelease; }
      return create(persistence);
    };
    const record = ctx.controlPlane.recordArtifactRef.bind(ctx.controlPlane);
    ctx.controlPlane.recordArtifactRef = async artifact => {
      if (artifact.stable_key?.startsWith('topic-selection.v1b.n6-debate.')) {
        reachedReceipt(); await receiptRelease;
      }
      return record(artifact);
    };
    const late = service.invokeNode(request);
    await receiptReached;
    const winner = makeService(new TopicSelectionControlPlaneService(ctx.controlPlaneRepository)).invokeNode(request);
    await authorityReached;
    releaseReceipt();
    await assert.rejects(late, error => error instanceof AppError && error.statusCode === 409);
    assert.equal(authorityWrites, 1, 'Only the winning CLI request may enter domain persistence.');
    releaseAuthority();
    result = await winner;
  } else result = await service.invokeNode(request);
  assert.equal(result.gate_status, 'admitted', JSON.stringify(result));
  assert.equal(calls, 4); assert.ok(evidenceReads > 0);
  const replay = await service.invokeNode(request);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(calls, 4);
  assert.equal(replay.authority_ref?.ref_id, result.authority_ref?.ref_id);
  if (generationMode !== 'initial_from_n5') return;
  const n7Input = { ...await n7Request(ctx, result), execution_spec: request.execution_spec, run_mode: 'product' as const };
  const missingEvidenceRepository = new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, {
    runnerDependencies: { topicQuestionRepository: ctx.topicQuestionRepository, researchCheckpointService: ctx.researchCheckpointService },
  });
  await assert.rejects(missingEvidenceRepository.resolveCodexResearchContext(n7Input), /researchSliceRepository/);
  assert.equal(calls, 4, 'Missing evidence dependency stops before model work.');
  const n7 = await service.invokeNode(n7Input);
  assert.ok(['admitted', 'admitted_with_warnings'].includes(n7.gate_status), JSON.stringify(n7));
  assert.equal(calls, 5);
  assert.equal((await service.invokeNode(n7Input)).replay_provenance?.replayed, true);
  assert.equal(calls, 5);
  const n8Input = await n8Request(ctx, n7, { execution_spec: request.execution_spec, run_mode: 'product' }, { confirmQuestionCheckpoint: false });
  valueDraft = n8ValueDraft(n8Input);
  await assert.rejects(service.invokeNode(n8Input), /checkpoint|advance|decision|confirmed/i);
  assert.equal(calls, 5, 'An unconfirmed Human checkpoint must stop before model work.');
  await confirmQuestionCheckpoint(ctx);
  const research = await service.resolveCodexResearchContext(n8Input);
  const citationRefs = research.admissible_citation_refs as TopicSelectionFunctionalRef[];
  assert.ok(citationRefs?.length, 'The model must receive the exact refs accepted by its N8 gate.');
  const evidenceRows = await ctx.topicQuestionRepository.listEvidenceRefsByContractId(n7.authority_ref!.ref_id);
  for (const row of evidenceRows) assert.ok(citationRefs.some(item => item.ref_type === row.evidence_ref.ref_type
    && item.ref_id === row.evidence_ref.ref_id && (item.version_id ?? null) === (row.evidence_ref.version_id ?? null)
    && item.title_card_id === row.evidence_ref.title_card_id));
  assert.ok(citationRefs.every(item => item.ref_type !== 'artifact_ref' && item.ref_type !== 'trial_ledger'));
  const n8 = await service.invokeNode(n8Input);
  assert.equal(n8.gate_status, 'admitted_with_warnings', JSON.stringify(n8));
  assert.equal(calls, 6);
  const n8Replay = await service.invokeNode(n8Input);
  assert.equal(n8Replay.replay_provenance?.replayed, true);
  assert.equal(calls, 6);

  // Trigger the actual N8 producer, then consume its feedback and run the four-role CLI re-entry.
  const forcedInput = { ...n8Input, node_attempt_id: 'n8_cli_operator_debate',
    operator_debate_request: { reason: 'Fixture requests review of the value argument.', requested_by: 'fixture_researcher' } };
  const forced = await service.invokeNode(forcedInput);
  assert.equal(forced.route_decision, 'loopback', JSON.stringify(forced));
  assert.equal(forced.error_code, 'N8_OPERATOR_FORCED_DEBATE_TRIGGER');
  assert.equal(calls, 7);
  const feedbackArtifact = await ctx.controlPlane.getArtifactRef(forced.authority_ref!.ref_id);
  assert.ok(feedbackArtifact?.payload);
  const feedbackInput = { ...await n7FeedbackRequest(ctx, n7Input, n7, 'gate_rejected', {
    artifact_ref: forced.authority_ref!, artifact_hash: canonicalHash(feedbackArtifact), payload_hash: canonicalHash(feedbackArtifact.payload),
  }), execution_spec: request.execution_spec, run_mode: 'product' as const };
  const readmitted = await service.invokeNode(feedbackInput);
  assert.equal(readmitted.gate_status, 'admitted_with_warnings', JSON.stringify(readmitted));
  assert.equal(readmitted.authority_ref?.ref_id, n7.authority_ref?.ref_id);
  assert.equal(calls, 8);
  assert.equal((await service.invokeNode(feedbackInput)).replay_provenance?.replayed, true);
  assert.equal(calls, 8);
  const debateInput = await n8Request(ctx, readmitted, { execution_spec: request.execution_spec, run_mode: 'product',
    node_attempt_id: 'n8_cli_bounded_debate' });
  valueDraft = n8ValueDraft(debateInput);
  const debated = await service.invokeNode(debateInput);
  assert.equal(debated.gate_status, 'admitted_with_warnings', JSON.stringify(debated));
  assert.equal(calls, 12, 'The conditional Debate executes four roles and projects its final draft without a fifth call.');
  assert.equal((await service.invokeNode(debateInput)).replay_provenance?.replayed, true);
  assert.equal(calls, 12);
});
}

test('CLI replay ignores caller-authored trace artifacts', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN7(ctx);
  const trace = await ctx.controlPlane.getArtifactRef(n6.harness_trace_artifact_ref!.ref_id);
  assert.ok(trace?.payload);
  const original = trace.payload.request as TopicSelectionV1bWorkflowHarnessRunRequest;
  const input = { ...original, workflow_run_id: 'forged_cli_workflow',
    execution_spec: { execution_mode: 'codex_cli' as const, model_option_id: null } };
  await ctx.controlPlane.recordArtifactRef({
    workflow_run_id: input.workflow_run_id, title_card_id: input.title_card_id,
    artifact_kind: 'trace', storage_kind: 'inline', created_by: 'system',
    payload: { ...trace.payload, workflow_run_id: input.workflow_run_id, request: input },
  });
  const replay = await ctx.service['findReplay'](input, trace.payload.node_replay_key as string);
  assert.equal(replay.exact, null, 'Only a product-owned completion can authenticate a CLI replay.');
});

test('CLI blocked completion replays without writes and rejects changed input', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN7(ctx);
  const base = await n7Request(ctx, n6);
  const support = await generateN7RuntimeSupportArtifact(ctx, base, 'n7_n8_debate_admission_review', n7DebateAdmissionPayload());
  const input = { ...base, semantic_artifacts: [{ ...support, execution_mode: 'codex_cli' as const }] };
  const blocked = await ctx.service.invokeNode(input);
  assert.equal(blocked.gate_status, 'blocked');
  const before = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.gate_result_ref?.ref_id, blocked.gate_result_ref?.ref_id);
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id), before);
  const payload = { ...input.frozen_input.payload, changed: true };
  const changed = await ctx.service.invokeNode({ ...input,
    frozen_input: { ...input.frozen_input, payload, frozen_input_hash: null } });
  assert.equal(changed.gate_status, 'blocked');
  assert.match(changed.error_code ?? '', /REPLAY/);
});

for (const node of ['n7', 'n8'] as const) {
  test(`${node} CLI audit verification rejects externally relabeled output without a generation receipt`, async () => {
    const ctx = await seedHarnessV1aBundle();
    const { n6, n7 } = await runReadyN7(ctx);
    const input = node === 'n7' ? await n7Request(ctx, n6) : await n8Request(ctx, n7);
    const original = node === 'n7'
      ? await generateN7RuntimeSupportArtifact(ctx, input, 'n7_n8_debate_admission_review', n7DebateAdmissionPayload())
      : await generateN8RuntimeValueDraftArtifact(ctx, input, n8ValueDraft(input));
    const audit = await ctx.controlPlane.getArtifactRef(original.runtime_audit_ref!.ref_id);
    assert.ok(audit?.payload);
    const forgedAudit = await ctx.controlPlane.recordArtifactRef({
      title_card_id: TITLE_CARD_ID, workflow_run_id: input.workflow_run_id,
      artifact_kind: 'diagnostic', storage_kind: 'inline', created_by: 'system',
      payload: { ...audit.payload, provenance: { ...audit.payload.provenance as Record<string, unknown>,
        execution_mode: 'codex_cli', source_kind: 'codex_cli_response' } },
    });
    const forgedRef = ref('artifact_ref', forgedAudit.artifact_ref_id);
    const forged = { ...original, execution_mode: 'codex_cli' as const, runtime_audit_ref: forgedRef,
      provenance_ref: forgedRef, runtime_audit_hash: forgedAudit.checksum! };
    const verified = node === 'n7'
      ? await ctx.service['verifyN7RuntimeVerifiedSupportAuditArtifact'](input, forged)
      : await ctx.service['verifyN8RuntimeVerifiedDraftAuditArtifact'](input, forged);
    assert.equal(verified.ok, false, 'A self-reported CLI audit cannot prove that a model ran.');
  });
}

function makeContext(options: { withRunnerDependencies?: boolean } = {}) {
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const needRepository = new InMemoryTopicSelectionNeedValidationRepository();
  const recheckRepository = new InMemoryTopicSelectionRecheckRiskMemoryRepository();
  const researchCheckpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const searchRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const v1bRepository = new InMemoryTopicSelectionV1bIntakeRepository();
  const researchSliceRepository = new InMemoryTopicSelectionV1bResearchSliceRepository();
  const topicQuestionRepository = new InMemoryTopicSelectionV1bTopicQuestionRepository();
  const valueAssessmentRepository = new InMemoryTopicSelectionV1bValueAssessmentRepository();
  const topicPackageRepository = new InMemoryTopicSelectionV1bTopicPackageRepository(valueAssessmentRepository);
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    idFactory,
    now: () => NOW,
  });
  const researchCheckpointService = new TopicSelectionResearchCheckpointService(
    researchCheckpointRepository,
    controlPlane,
    { idFactory, now: () => NOW },
  );
  const service = new TopicSelectionV1bWorkflowHarnessService(controlPlane, {
    idFactory,
    now: () => NOW,
    runnerDependencies: options.withRunnerDependencies
      ? {
        evidenceMapRepository: evidenceRepository,
        needValidationRepository: needRepository,
        recheckRiskMemoryRepository: recheckRepository,
        researchCheckpointService,
        researchSliceRepository,
        searchResourceRepository: searchRepository,
        topicQuestionRepository,
        topicPackageRepository,
        valueAssessmentRepository,
        v1bIntakeRepository: v1bRepository,
      }
      : undefined,
  });

  return {
    controlPlane,
    controlPlaneRepository,
    evidenceRepository,
    needRepository,
    recheckRepository,
    researchCheckpointRepository,
    researchCheckpointService,
    researchSliceRepository,
    searchRepository,
    service,
    topicQuestionRepository,
    topicPackageRepository,
    valueAssessmentRepository,
    v1bRepository,
  };
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string | null = TITLE_CARD_ID,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId,
  };
}

function frozenInputHash(payload: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input']): string {
  return sha256Text(stableStringify({
    input_contract: payload.input_contract,
    payload: payload.payload,
    snapshot_kind: payload.snapshot_kind,
    source_refs: payload.source_refs,
  }));
}

function policyForNode(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): TopicSelectionV1bWorkflowHarnessNodePolicy {
  const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((item) => item.node_id === nodeId);
  if (!policy) {
    throw new Error(`Unknown test node policy: ${nodeId}.`);
  }
  return policy;
}

function slotSpecForNode(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): Pick<
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  'slot_id' | 'allowed_effect' | 'output_contract' | 'execution_mode' | 'profile_id'
> {
  const policy = policyForNode(nodeId);
  const slot = policy.semantic_support_slots.find((item) => item.required_for_progress)
    ?? policy.semantic_support_slots[0];
  if (!slot) {
    throw new Error(`No semantic slot fixture for ${nodeId}.`);
  }
  return {
    slot_id: slot.slot_id,
    allowed_effect: slot.allowed_effect,
    output_contract: slot.output_contract,
    execution_mode: slot.allowed_execution_modes.includes('codex_assisted') ? 'codex_assisted' : slot.allowed_execution_modes[0]!,
    profile_id: slot.default_profile_id,
  };
}

function requiredSlotForNode(
  nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
) {
  const policy = policyForNode(nodeId);
  return policy.semantic_support_slots.find((slot) => (
    slot.required_for_progress && slot.allowed_effect === 'model_draft_for_gate'
  )) ?? policy.semantic_support_slots[0] ?? null;
}

function providerModelOptionId(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): string {
  const slot = requiredSlotForNode(nodeId);
  if (!slot) {
    throw new Error(`No provider slot fixture for ${nodeId}.`);
  }
  return `${slot.default_profile_id}.openai-balanced`;
}

function semanticArtifact(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> = {},
): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  const slot = slotSpecForNode(input.node_id);
  return {
    ...slot,
    node_id: input.node_id,
    run_mode: input.run_mode ?? 'acceptance',
    support_artifact_ref: ref('artifact_ref', `${input.node_attempt_id}_support`),
    support_artifact_hash: 'a'.repeat(64),
    normalized_output_ref: ref('artifact_ref', `${input.node_attempt_id}_normalized`),
    normalized_output_hash: 'b'.repeat(64),
    profile_id: slot.profile_id,
    model_option_id: null,
    input_hash: input.frozen_input.frozen_input_hash!,
    prompt_packet_hash: 'c'.repeat(64),
    structured_output_hash: 'd'.repeat(64),
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: 'e'.repeat(64),
    provenance_ref: ref('artifact_ref', `${input.node_attempt_id}_provenance`),
    runtime_provenance_class: 'fixture_replay',
    context_policy_profile_id: null,
    context_policy_profile_version: null,
    context_policy_profile_hash: null,
    prompt_variant_key: null,
    runtime_invocation_context_hash: null,
    redaction_policy: null,
    source_hashes: {},
    runtime_audit_ref: null,
    runtime_audit_hash: null,
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  };
}

function request(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const nodeId = overrides.node_id ?? 'topic-selection.v1b.generate-research-slice-options.v1';
  const policy = policyForNode(nodeId);
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: policy.input_contract,
    snapshot_kind: policy.required_frozen_snapshot_kind,
    source_refs: [ref(policy.required_frozen_snapshot_kind, 'frozen_source_001')],
    payload: {
      source_object_id: 'frozen_source_001',
      warning_context: ['accepted_risk_carried_forward'],
    },
  };
  const selectedFrozenInput = overrides.frozen_input ?? frozenInput;
  const restOverrides = { ...overrides };
  delete restOverrides.frozen_input;
  delete restOverrides.node_id;
  const requiredSlot = requiredSlotForNode(nodeId);
  const runtimeDefaults: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = policy.execution_kind === 'model_like' && requiredSlot
    ? {
      run_mode: 'acceptance',
      profile_id: requiredSlot.default_profile_id,
      execution_spec: {
        execution_mode: 'codex_assisted',
        model_option_id: null,
      },
    }
    : {};
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_v1b_harness_001',
    node_attempt_id: 'node_attempt_v1b_harness_001',
    node_id: nodeId,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...selectedFrozenInput,
      frozen_input_hash: selectedFrozenInput.frozen_input_hash ?? frozenInputHash(selectedFrozenInput),
    },
    created_by: 'system',
    ...runtimeDefaults,
    ...restOverrides,
  };
}

function bundleRef(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef {
  return ref('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
}

function v1aBundleSourceRefs(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef[] {
  return uniqueRefs([
    bundleRef(bundle),
    bundle.validated_need_ref,
    bundle.source_need_candidate_ref,
    bundle.adjudication_result_ref,
    bundle.support_packet_ref,
    bundle.human_decision_ref,
    bundle.evidence_map_ref,
    bundle.search_run_ref,
    bundle.search_plan_ref,
    bundle.literature_snapshot_ref,
    ...bundle.trace_refs,
    ...bundle.risk_refs,
    ...bundle.memory_suggestion_refs,
    ...bundle.recheck_request_refs,
  ]);
}

function uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
  const seen = new Set<string>();
  const result: TopicSelectionFunctionalRef[] = [];
  for (const item of refs) {
    const key = [item.ref_type, item.ref_id, item.title_card_id ?? '', item.version_id ?? ''].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function acceptedConstraintProfilePayload(
  overrides: Partial<TopicSelectionV1bAcceptedConstraintProfilePayload> = {},
): TopicSelectionV1bAcceptedConstraintProfilePayload {
  return {
    target_community: 'CS paper engineering researchers',
    target_venue_class: null,
    intended_contribution_style: 'workflow_system',
    method_constraints: ['local-first workflow instrumentation'],
    resource_constraints: ['no live provider calls in fixture runs'],
    available_assets: ['v1a evidence map'],
    feasibility_budget: {
      maximum_slice_count: 3,
    },
    non_goals: ['promotion decision'],
    claim_ceiling: 'A bounded workflow claim about evidence-to-need traceability.',
    human_constraint_notes: null,
    constraint_payload: {
      source: 'fixture',
    },
    ...overrides,
  };
}

function n1Request(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const payload: TopicSelectionV1bN1HarnessFrozenInputPayload = {
    v1b_input_bundle_id: bundle.v1b_input_bundle_id,
    v1a_bundle_ref: bundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    source_refs_hash: sha256Text(stableStringify(v1aBundleSourceRefs(bundle))),
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n1',
    node_attempt_id: 'node_attempt_v1b_n1',
    node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    title_card_id: bundle.title_card_id,
    frozen_input: {
      input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
      snapshot_kind: 'v1a_valid_need_bundle',
      source_refs: [ref('v1a_valid_need_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version)],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n2Request(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  acceptedPayload: TopicSelectionV1bAcceptedConstraintProfilePayload = acceptedConstraintProfilePayload(),
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (!n1Result.authority_ref || !n1Result.hashes.authority_hash) {
    throw new Error('N2 fixture requires admitted N1 result.');
  }
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const payload: TopicSelectionV1bN2HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    v1a_bundle_ref: bundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    authority_input_provider: 'codex_delegated',
    accepted_constraint_profile_payload: acceptedPayload,
    accepted_constraint_profile_payload_hash: acceptedHash,
    delegation_artifact_hash: acceptedHash,
    previous_profile_ref: null,
    previous_profile_hash: null,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n2',
    node_attempt_id: 'node_attempt_v1b_n2',
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    title_card_id: bundle.title_card_id,
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support,
    frozen_input: {
      input_contract: 'N1ToN2Handoff@v1',
      snapshot_kind: 'v1b_intake_snapshot',
      source_refs: [n1Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n3Request(
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  n2Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null; handoff_hash: string | null } },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (!n1Result.authority_ref || !n1Result.hashes.authority_hash || !n2Result.authority_ref || !n2Result.hashes.authority_hash) {
    throw new Error('N3 fixture requires admitted N1/N2 results.');
  }
  const payload: TopicSelectionV1bN3HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash ?? 'f'.repeat(64),
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n3',
    node_attempt_id: 'node_attempt_v1b_n3',
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    title_card_id: n1Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N2ToN3Handoff@v1',
      snapshot_kind: 'research_constraint_profile',
      source_refs: [n2Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n3ReadinessClassificationSupport(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): TopicSelectionV1bIntakeReadinessClassificationSupportPayload {
  return {
    schema_version: 'IntakeReadinessClassificationSupport@v1',
    readiness_recommendation: 'ready',
    blocker_codes: [],
    warning_codes: [],
    loopback_target_code: null,
    cited_refs: input.frozen_input.source_refs,
    rationale: 'Unit-test runtime support mirrors deterministic readiness without writing authority.',
    no_authority_write_confirmed: true,
  };
}

function n4Request(
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  n2Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null; handoff_hash: string | null } },
  n3Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null; handoff_hash: string | null } },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (
    !n1Result.authority_ref
    || !n1Result.hashes.authority_hash
    || !n2Result.authority_ref
    || !n2Result.hashes.authority_hash
    || !n2Result.hashes.handoff_hash
    || !n3Result.authority_ref
    || !n3Result.hashes.authority_hash
    || !n3Result.hashes.handoff_hash
  ) {
    throw new Error('N4 fixture requires admitted N1/N2/N3 results.');
  }
  const payload: TopicSelectionV1bN4HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    intake_readiness_ref: n3Result.authority_ref,
    intake_readiness_hash: n3Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash,
    n3_handoff_hash: n3Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n4',
    node_attempt_id: 'node_attempt_v1b_n4',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    title_card_id: n1Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: {
      input_contract: 'N3ToN4Handoff@v1',
      snapshot_kind: 'v1b_intake_readiness_assessment',
      source_refs: [n3Result.authority_ref, n2Result.authority_ref, n1Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n4Draft(
  overrides: Partial<TopicSelectionV1bResearchSliceOptionSetDraftPayload> = {},
): TopicSelectionV1bResearchSliceOptionSetDraftPayload {
  const supportUnitRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const validatedNeedRef = ref('validated_need', 'validated_need_1', TITLE_CARD_ID);
  return {
    recommended_option_key: 'traceable_workflow_slice',
    comparison_axes: ['method feasibility', 'evidence traceability'],
    comparison_summary: 'The recommended slice keeps the claim bounded to workflow traceability.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [
      {
        option_key: 'traceable_workflow_slice',
        source_validated_need_refs: [validatedNeedRef],
        slice_statement: 'Build a bounded evidence-to-need traceability workflow for topic selection.',
        problem_space: 'Reviewer-aligned topic selection traceability.',
        target_setting: 'Local-first CS paper engineering assistant workflows.',
        target_community: 'CS paper engineering researchers',
        included_boundaries: ['v1a evidence-to-need trace preservation'],
        excluded_boundaries: ['promotion decision', 'full paper implementation'],
        contribution_type_candidate: 'workflow_system',
        support_evidence_refs: [supportUnitRef],
        challenge_evidence_refs: [],
        baseline_evidence_refs: [],
        context_evidence_refs: [],
        resource_assumptions: ['Fixture run uses existing v1a evidence map.'],
        data_assumptions: ['Evidence units remain frozen during slice generation.'],
        evaluation_path: 'Replay the harness and inspect deterministic trace hashes.',
        baseline_assumptions: ['Route-only smoke tests are insufficient as a baseline.'],
        hard_blockers: [],
        dependency_risks: ['Downstream selection may request more options.'],
        slice_budget: {
          max_nodes: 4,
        },
        expected_claim: 'A bounded workflow can preserve evidence-to-need traceability.',
        fallback_claim: 'A harness-native workflow improves traceability checks.',
        observable_success_criteria: ['N4 emits option set refs and hashes through handoff.'],
        main_risks: ['Evidence coverage may still need review.'],
        baseline_risk: 'medium',
        execution_risk: 'medium',
        scope_risk: 'low',
        claim_ceiling_alignment: {
          status: 'aligned',
          rationale: 'The claim is bounded to traceability workflow behavior.',
          confidence: 0.8,
        },
        confidence: 0.82,
        requires_human_review: false,
        human_review_triggers: [],
        details_payload: {
          fixture: true,
        },
      },
    ],
    ...overrides,
  };
}

async function recordN4DraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const draftHash = sha256Text(stableStringify(draft));
  return semanticArtifact(input, {
    slot_id: 'n4_research_slice_option_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    execution_mode: 'codex_assisted',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: draftHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: draftHash,
    structured_output_hash: draftHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function generateEarlySemanticSupportArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slotId: TopicSelectionV1bEarlySemanticSupportSlotId,
  payload: TopicSelectionV1bEarlySemanticSupportPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    slot_id: slotId,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output: payload,
      operator_label: 'unit-test-early-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error(`Expected early semantic runtime support generation to succeed for ${slotId}.`);
  }
  return generated.semantic_artifact;
}

async function invokeN2WithRuntimeSupport(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: TopicSelectionV1bAcceptedConstraintProfilePayload,
): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
  return ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await generateEarlySemanticSupportArtifact(
        ctx,
        input,
        'n2_constraint_profile_semantic_support',
        payload,
      ),
    ],
  });
}

async function n4RuntimePlanningInput(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
) {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN4HarnessFrozenInputPayload;
  const [snapshot, profile, readiness] = await Promise.all([
    ctx.v1bRepository.findIntakeSnapshotById(payload.intake_snapshot_ref.ref_id),
    ctx.v1bRepository.findResearchConstraintProfileById(payload.constraint_profile_ref.ref_id),
    ctx.v1bRepository.findReadinessAssessmentById(payload.intake_readiness_ref.ref_id),
  ]);
  if (!snapshot || !profile || !readiness) {
    throw new Error('N4 runtime fixture requires persisted N1/N2/N3 authorities.');
  }
  return {
    v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
    v1b_intake_snapshot_ref: ref(
      'v1b_intake_snapshot',
      snapshot.v1b_intake_snapshot_id,
      snapshot.title_card_id,
      snapshot.snapshot_version,
    ),
    research_constraint_profile_ref: ref(
      'research_constraint_profile',
      profile.research_constraint_profile_id,
      profile.title_card_id,
      profile.profile_version,
    ),
    readiness_assessment_ref: ref(
      'v1b_intake_readiness_assessment',
      readiness.v1b_intake_readiness_assessment_id,
      readiness.title_card_id,
    ),
    validated_need_ref: snapshot.validated_need_ref,
    evidence_map_ref: snapshot.evidence_map_ref,
    search_run_ref: snapshot.search_run_ref,
    search_plan_ref: snapshot.search_plan_ref,
    literature_snapshot_ref: snapshot.literature_snapshot_ref,
    evidence_role_bundle: snapshot.evidence_role_bundle,
    target_community: profile.target_community,
    target_venue_class: profile.target_venue_class ?? null,
    intended_contribution_style: profile.intended_contribution_style ?? null,
    method_constraints: profile.method_constraints,
    resource_constraints: profile.resource_constraints,
    available_assets: profile.available_assets,
    feasibility_budget: profile.feasibility_budget,
    non_goals: profile.non_goals,
    claim_ceiling: profile.claim_ceiling,
    accepted_risk_refs: readiness.accepted_risk_refs,
    gap_codes: snapshot.gap_codes,
    memory_suggestion_refs: snapshot.memory_suggestion_refs,
    recheck_request_refs: snapshot.recheck_request_refs,
    handoff_payload: snapshot.handoff_payload,
  };
}

async function generateN4RuntimeDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  options: {
    runMode?: NonNullable<TopicSelectionV1bWorkflowHarnessRunRequest['run_mode']>;
  } = {},
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN4ResearchSliceRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    planning_input: await n4RuntimePlanningInput(ctx, input),
    execution_mode: 'codex_assisted',
    run_mode: options.runMode ?? input.run_mode ?? 'acceptance',
    codex_response: {
      output: draft,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N4 runtime draft generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function runReadyN3(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, acceptedPayload = acceptedConstraintProfilePayload(), workflowRunId?: string) {
  const run = workflowRunId ? { workflow_run_id: workflowRunId } : {};
  const n1 = await ctx.service.invokeNode({ ...n1Request(ctx.bundle), ...run });
  const n2Input = { ...n2Request(ctx.bundle, n1, acceptedPayload), ...run };
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const n3Input = { ...n3Request(n1, n2), ...run };
  const n3 = await ctx.service.invokeNode({
    ...n3Input,
    semantic_artifacts: [
      await generateEarlySemanticSupportArtifact(
        ctx,
        n3Input,
        'n3_readiness_classification',
        n3ReadinessClassificationSupport(n3Input),
      ),
    ],
  });
  return { n1, n2, n3 };
}

async function runReadyN4(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, acceptedPayload = acceptedConstraintProfilePayload(), draft = n4Draft()) {
  const { n1, n2, n3 } = await runReadyN3(ctx, acceptedPayload);
  const input = n4Request(n1, n2, n3);
  const n4 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });
  return { n1, n2, n3, n4 };
}

function hashOptionForN5(option: TopicSelectionResearchSliceOptionRecord): string {
  return sha256Text(stableStringify({
    claim_ceiling_alignment: option.claim_ceiling_alignment,
    dependency_risks: option.dependency_risks,
    evaluation_path: option.evaluation_path,
    excluded_boundaries: option.excluded_boundaries,
    expected_claim: option.expected_claim,
    fallback_claim: option.fallback_claim,
    hard_blockers: option.hard_blockers,
    included_boundaries: option.included_boundaries,
    main_risks: option.main_risks,
    option_key: option.option_key,
    option_ref: ref('research_slice_option', option.research_slice_option_id, option.title_card_id),
    option_set_id: option.research_slice_option_set_id,
    problem_space: option.problem_space,
    risk_levels: {
      baseline: option.baseline_risk,
      execution: option.execution_risk,
      scope: option.scope_risk,
    },
    slice_statement: option.slice_statement,
    source_validated_need_refs: option.source_validated_need_refs,
    status: option.status,
    target_community: option.target_community,
    target_setting: option.target_setting,
  }));
}

function acceptedSliceSelectionPayload(
  option: TopicSelectionResearchSliceOptionRecord,
  overrides: Partial<TopicSelectionV1bAcceptedSliceSelectionPayload> = {},
): TopicSelectionV1bAcceptedSliceSelectionPayload {
  return {
    decision: 'select',
    selected_option_ref: ref('research_slice_option', option.research_slice_option_id, option.title_card_id),
    selected_option_hash: hashOptionForN5(option),
    selection_rationale: `Select the bounded slice: ${option.slice_statement}`,
    decision_basis: {
      selected_option_key: option.option_key,
    },
    rejected_option_reasons: [],
    required_actions: [],
    accepted_risk_refs: [],
    confidence: 0.82,
    requires_human_review: false,
    human_review_reason: null,
    loopback_target: null,
    loopback_target_ref: null,
    loopback_reason_code: null,
    ...overrides,
  };
}

async function selectedN4Option(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, n4: {
  authority_ref: TopicSelectionFunctionalRef | null;
}) {
  if (!n4.authority_ref) {
    throw new Error(`N5 fixture requires admitted N4 result: ${JSON.stringify(n4)}`);
  }
  const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(n4.authority_ref.ref_id);
  const selected = options.find((option) => option.status === 'recommended') ?? options[0];
  if (!selected) {
    throw new Error('N5 fixture requires at least one N4 option.');
  }
  return selected;
}

function n5Request(
  n4Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  acceptedPayload: TopicSelectionV1bAcceptedSliceSelectionPayload,
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (!n4Result.authority_ref || !n4Result.hashes.authority_hash || !n4Result.hashes.handoff_hash) {
    throw new Error('N5 fixture requires admitted N4 result.');
  }
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const authorityInputProvider = overrides.run_mode ? 'codex_delegated' : 'fixture';
  const payload: TopicSelectionV1bN5HarnessFrozenInputPayload = {
    research_slice_option_set_ref: n4Result.authority_ref,
    research_slice_option_set_hash: n4Result.hashes.authority_hash,
    n4_handoff_hash: n4Result.hashes.handoff_hash,
    authority_input_provider: authorityInputProvider,
    accepted_selection_payload: acceptedPayload,
    accepted_selection_payload_hash: acceptedHash,
    delegation_artifact_hash: authorityInputProvider === 'codex_delegated' ? acceptedHash : null,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n5',
    node_attempt_id: 'node_attempt_v1b_n5',
    node_id: 'topic-selection.v1b.select-research-slice.v1',
    title_card_id: n4Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N4ToN5Handoff@v1',
      snapshot_kind: 'research_slice_option_set',
      source_refs: [n4Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN5(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, acceptedPayload = acceptedConstraintProfilePayload(), draft = n4Draft()) {
  const { n1, n2, n3, n4 } = await runReadyN4(ctx, acceptedPayload, draft);
  const option = await selectedN4Option(ctx, n4);
  const n5 = await ctx.service.invokeNode(n5Request(n4, acceptedSliceSelectionPayload(option)));
  return { n1, n2, n3, n4, n5, option };
}

async function n6Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n5Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n5Result.authority_ref || !n5Result.handoff_ref || !n5Result.hashes.handoff_hash) {
    throw new Error('N6 fixture requires admitted N5 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n5Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N5ToN6Handoff') {
    throw new Error('N6 fixture requires N5ToN6 handoff artifact.');
  }
  const payload: TopicSelectionV1bN6HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN6HarnessFrozenInputPayload, 'n5_handoff_hash'>),
    n5_handoff_hash: n5Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n6',
    node_attempt_id: 'node_attempt_v1b_n6',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    title_card_id: n5Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: {
      input_contract: 'N5ToN6Handoff@v1',
      snapshot_kind: 'research_slice_selection_decision',
      source_refs: uniqueRefs([n5Result.authority_ref, n5Result.handoff_ref, ...handoff.required_refs]),
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function n6Draft(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> = {},
): Promise<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  const evidenceRows = await ctx.researchSliceRepository.listEvidenceRefsByResearchSliceId(payload.research_slice_ref.ref_id);
  const boundaries = await ctx.researchSliceRepository.listBoundariesByResearchSliceId(payload.research_slice_ref.ref_id);
  const evidenceRef = evidenceRows[0]?.evidence_ref ?? ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const includedBoundary = boundaries.find((boundary) => boundary.boundary_kind === 'included') ?? boundaries[0];
  const excludedBoundary = boundaries.find((boundary) => boundary.boundary_kind === 'excluded') ?? boundaries[0];
  const includedBoundaryRef = ref('research_slice_boundary', includedBoundary!.research_slice_boundary_id, TITLE_CARD_ID);
  const excludedBoundaryRef = ref('research_slice_boundary', excludedBoundary!.research_slice_boundary_id, TITLE_CARD_ID);
  const needRef = ref('validated_need', 'validated_need_1', TITLE_CARD_ID);
  return {
    question_frame: {
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'CS paper engineering researchers',
      object_scope: 'v1b harness-native topic selection candidate generation',
      task_scope: 'candidate generation, deterministic gates, and replay drift checks',
      intervention_or_approach: 'WorkflowHarness-native candidate-set gate with frozen semantic artifacts',
      comparison_baseline: 'route-only smoke tests without harness-level product acceptance',
      observable_outcome: 'stable candidate-set refs and replay hashes',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: {
        fixture: true,
      },
    },
    recommended_candidate_keys: ['harness_candidate'],
    generation_notes: ['Candidate stays inside the selected ResearchSlice and preserves N5 lineage.'],
    human_review_triggers: [],
    candidates: [
      {
        candidate_key: 'harness_candidate',
        main_question: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection?',
        sub_questions: ['Which N5 lineage hashes must remain frozen before N7 admission?'],
        question_type: 'system',
        contribution_hypothesis: 'system',
        source_validated_need_refs: [needRef],
        answerability_plan: {
          datasets_or_resources: ['v1b harness trace fixtures'],
          metrics: ['hash drift detection rate'],
          baselines: ['route-only smoke coverage'],
          ablations_or_comparisons: ['without frozen semantic artifact admission'],
          evaluation_setting: 'local deterministic harness acceptance tests',
          dependency_risks: ['provider canary behavior is not exercised in this fixture'],
          open_dependencies: [],
          known_gaps: [],
          required_evidence_refs: [evidenceRef],
        },
        answerability_verdict: 'answerable',
        expected_claim: 'A harness-native candidate gate improves replayable v1b topic selection.',
        fallback_claim: 'The gate preserves candidate lineage for downstream review.',
        max_claim_strength: 'Bounded workflow claim about candidate lineage and replay.',
        observable_success_criteria: ['N6 emits candidate set refs and hashes.'],
        boundary_check: {
          preserved_boundary_refs: [includedBoundaryRef],
          excluded_boundary_refs: [excludedBoundaryRef],
          boundary_violations: [],
          prohibited_claims: ['promotion decision'],
          allowed_refinements: ['tighten candidate wording'],
        },
        traceability_check: {
          support_evidence_refs: [evidenceRef],
          challenge_evidence_refs: [evidenceRef],
          baseline_evidence_refs: [evidenceRef],
          context_evidence_refs: [evidenceRef],
          mapped_evidence_refs: [evidenceRef],
          unmapped_assumptions: [],
        },
        falsification_conditions: [
          {
            condition_type: 'claim_overstrong',
            severity: 'hard',
            statement: 'If changed frozen N5 lineage hashes are not detected, the candidate claim must be lowered.',
            trigger_evidence_refs: [evidenceRef],
            trigger_source_refs: [payload.research_slice_ref],
            related_contract_fields: ['expected_claim'],
            expected_action: 'lower_claim_strength',
            check_timing: 'before_value_assessment',
            confidence: 'high',
          },
        ],
        risk_notes: [],
        blockers: [],
        objections: [],
        human_review_triggers: [],
        confidence: 0.84,
      },
    ],
    ...overrides,
  };
}

async function recordN6DraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const draftHash = sha256Text(stableStringify(draft));
  return semanticArtifact(input, {
    slot_id: 'n6_question_candidate_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicQuestionCandidateSetDraft@v1',
    execution_mode: 'codex_assisted',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: draftHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: draftHash,
    structured_output_hash: draftHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function generateN6RuntimeDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  generationMode: TopicSelectionV1bN6DraftGenerationMode = 'initial_from_n5',
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN6DraftRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    generation_mode: generationMode,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output: draft,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N6 runtime draft generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function generateN6RegularDebateDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const role = (slot: TopicSelectionV1bN6DivergentDebateRoleSlotId, body: Record<string, unknown>, index = 0): V1bN6DebateInputs => ({
    instance_index: index, mocked_output: null,
    codex_response: {
      operator_label: 'unit-test-regular-debate',
      output: { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot, ...body },
    },
  });
  const result = await new TopicSelectionV1bN6DivergentDebateRuntimeService(ctx.controlPlane).runDivergentDebate({
    request: input, generation_mode: 'initial_from_n5', execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    role_outputs: {
      n6_debate_explorer: [0, 1].map((index) => role('n6_debate_explorer', {
        candidate_seeds: [{ seed_id: `seed-${index}`, question_framing: `Evidence-bounded framing ${index}`, evidence_refs: [] }],
      }, index)),
      n6_debate_critic: [role('n6_debate_critic', {
        critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'Check evidence traceability.' }],
      })],
      n6_debate_arbiter: [role('n6_debate_arbiter', { synthesized_candidate_set: draft })],
    },
  });
  assert.equal(result.status, 'completed');
  if (result.status !== 'completed' || result.gate_draft.status !== 'succeeded') throw new Error('Expected the regular N6 Debate to produce a draft.');
  return result.gate_draft.semantic_artifact;
}

async function runReadyN6(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  draftOverrides: Partial<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> = {},
) {
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input, draftOverrides);
  const n6 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, draft)],
  });
  return { n5, n6, draft };
}

async function n7Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n6Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n6Result.authority_ref || !n6Result.handoff_ref || !n6Result.hashes.handoff_hash) {
    throw new Error('N7 fixture requires admitted N6 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n6Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N6ToN7Handoff') {
    throw new Error('N7 fixture requires N6ToN7 handoff artifact.');
  }
  const payload: TopicSelectionV1bN7HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN7HarnessFrozenInputPayload, 'input_mode' | 'n6_handoff_hash'>),
    input_mode: 'initial_from_n6',
    n6_handoff_hash: n6Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n7',
    node_attempt_id: 'node_attempt_v1b_n7',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    title_card_id: n6Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    run_mode: null,
    profile_id: null,
    execution_spec: null,
    frozen_input: {
      input_contract: 'N6ToN7Handoff@v1',
      snapshot_kind: 'topic_question_candidate_set',
      source_refs: [n6Result.authority_ref, n6Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function recordN7SupportArtifact<T extends Record<string, unknown>>(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slot: {
    slot_id: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['slot_id'];
    allowed_effect: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['allowed_effect'];
    output_contract: string;
    profile_id: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['profile_id'];
  },
  payload: T,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const payloadHash = sha256Text(stableStringify(payload));
  return semanticArtifact(input, {
    slot_id: slot.slot_id,
    allowed_effect: slot.allowed_effect,
    output_contract: slot.output_contract,
    execution_mode: 'codex_assisted',
    profile_id: slot.profile_id,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: payloadHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: payloadHash,
    structured_output_hash: payloadHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function recordN6LoopbackTriageArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  return recordN7SupportArtifact(ctx, input, {
    slot_id: 'n6_loopback_triage',
    allowed_effect: 'support_only',
    output_contract: 'N6LoopbackTriageSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support,
  }, payload as unknown as Record<string, unknown>);
}

async function generateN6RuntimeLoopbackTriageArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  failedDraftHash: string,
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN6LoopbackTriageRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    failed_draft_artifact: failedDraftArtifact,
    failed_draft_hash: failedDraftHash,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output: payload,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N6 loopback triage runtime support generation to succeed.');
  }
  return generated.semantic_artifact;
}

function n6LoopbackTriagePayload(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bN6LoopbackTriageSupportPayload> = {},
): TopicSelectionV1bN6LoopbackTriageSupportPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  return {
    loopback_target_code: 'n6_regenerate_candidates',
    failure_scope: 'candidate_level',
    dominant_reason_codes: ['not_answerable'],
    affected_refs: [payload.research_slice_ref],
    regeneration_hints: ['Regenerate a bounded candidate that stays inside the selected ResearchSlice.'],
    debate_escalation: null,
    upstream_rollback: null,
    rationale: 'All generated candidates failed N6 deterministic semantic admission.',
    ...overrides,
  };
}

async function invokeN6WithFailedDraftAndTriage(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  triagePayload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
) {
  const draft = await n6Draft(ctx, input);
  return ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, input, {
        ...draft,
        candidates: [
          {
            ...draft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      await recordN6LoopbackTriageArtifact(ctx, input, triagePayload),
    ],
  });
}

function n7GroupingPayload(input: TopicSelectionV1bWorkflowHarnessRunRequest): TopicSelectionV1bCandidateGroupingSupportPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload;
  return {
    selected_candidate_ref: payload.admissible_candidate_refs[1] ?? payload.admissible_candidate_refs[0]!,
    selected_candidate_hash: payload.admissible_candidate_hashes[1] ?? payload.admissible_candidate_hashes[0]!,
    priority_order: payload.admissible_candidate_refs.length > 1
      ? [payload.admissible_candidate_refs[1]!, payload.admissible_candidate_refs[0]!]
      : [payload.admissible_candidate_refs[0]!],
    duplicate_or_overlap_groups: [],
    candidate_relationships: {
      ordered_by: 'codex_fixture',
    },
    grouping_summary: 'Codex support prioritizes the higher-value non-overlapping candidate.',
  };
}

function n7DebateAdmissionPayload(
  overrides: Partial<TopicSelectionV1bN8DebateAdmissionReviewSupportPayload> = {},
): TopicSelectionV1bN8DebateAdmissionReviewSupportPayload {
  return {
    debate_level: 'compact_assessment_debate',
    recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    high_value_signal_codes: ['bounded_replay_claim'],
    risk_signal_codes: [],
    rationale: 'The candidate is bounded enough for compact assessment debate.',
    ...overrides,
  };
}

async function generateN7RuntimeSupportArtifact<T extends TopicSelectionV1bN7RuntimeSupportPayload>(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slotId: TopicSelectionV1bN7SupportSlotId,
  output: T,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN7SupportRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    slot_id: slotId,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N7 runtime support generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function recordN8FeedbackArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  feedback: TopicSelectionV1bN8ToN7FeedbackPayload,
): Promise<{
  artifact_ref: TopicSelectionFunctionalRef;
  artifact_hash: string;
  payload_hash: string;
}> {
  const artifact = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: feedback as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  return {
    artifact_ref: ref('artifact_ref', artifact.artifact_ref_id, TITLE_CARD_ID),
    artifact_hash: sha256Text(stableStringify(artifact)),
    payload_hash: sha256Text(stableStringify(feedback)),
  };
}

async function n7FeedbackRequest(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  initialInput: TopicSelectionV1bWorkflowHarnessRunRequest,
  n7Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  feedbackClass: TopicSelectionV1bN8ToN7FeedbackPayload['feedback_class'] = 'semantic_candidate_failure',
  producedFeedback?: { artifact_ref: TopicSelectionFunctionalRef; artifact_hash: string; payload_hash: string },
  assessment?: { ref: TopicSelectionFunctionalRef; hash: string },
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n7Result.authority_ref || !n7Result.handoff_ref || !n7Result.hashes.handoff_hash || !n7Result.hashes.authority_hash) {
    throw new Error('N7 feedback fixture requires admitted N7 result.');
  }
  const n7HandoffArtifact = await ctx.controlPlane.getArtifactRef(n7Result.handoff_ref.ref_id);
  const n7Handoff = n7HandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const n7HandoffPayload = n7Handoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    active_candidate_hash: string;
    topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
    topic_question_candidate_set_hash: string;
    trial_ledger_ref: TopicSelectionFunctionalRef;
    trial_ledger_hash: string;
  };
  const initialPayload = initialInput.frozen_input.payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload;
  const feedback: TopicSelectionV1bN8ToN7FeedbackPayload = {
    feedback_class: feedbackClass,
    failure_reason_code: feedbackClass === 'gate_rejected' ? 'debate_admission_too_weak' : 'value_not_supported',
    feedback_summary: 'Fixture N8 feedback rejected the active candidate trial.',
    affected_refs: [n7HandoffPayload.active_candidate_ref],
    previous_n7_handoff_ref: n7Result.handoff_ref,
    previous_n7_handoff_hash: n7Result.hashes.handoff_hash,
    previous_trial_ledger_ref: n7HandoffPayload.trial_ledger_ref,
    previous_trial_ledger_hash: n7HandoffPayload.trial_ledger_hash,
    failed_topic_question_contract_ref: n7Result.authority_ref,
    failed_topic_question_contract_hash: n7Result.hashes.authority_hash,
    failed_candidate_ref: n7HandoffPayload.active_candidate_ref,
    failed_candidate_hash: n7HandoffPayload.active_candidate_hash,
    topic_question_candidate_set_ref: n7HandoffPayload.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: n7HandoffPayload.topic_question_candidate_set_hash,
    n8_gate_result_hash: 'f'.repeat(64),
    value_assessment_ref: assessment?.ref ?? null,
    value_assessment_hash: assessment?.hash ?? null,
  };
  const feedbackArtifact = producedFeedback ?? await recordN8FeedbackArtifact(ctx, initialInput, feedback);
  const payload: TopicSelectionV1bN7HarnessFrozenInputPayload = {
    ...initialPayload,
    input_mode: 'feedback_from_n8',
    n8_feedback_ref: feedbackArtifact.artifact_ref,
    n8_feedback_hash: feedbackArtifact.artifact_hash,
    n8_feedback_payload_hash: feedbackArtifact.payload_hash,
  };
  return request({
    workflow_run_id: `workflow_run_v1b_n7_feedback_${n7Result.authority_ref.ref_id}`,
    node_attempt_id: `node_attempt_v1b_n7_feedback_${n7Result.authority_ref.ref_id}`,
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    title_card_id: TITLE_CARD_ID,
    run_mode: null,
    profile_id: null,
    execution_spec: null,
    frozen_input: {
      input_contract: 'N8ToN7Feedback@v1',
      snapshot_kind: 'topic_question_candidate_set',
      source_refs: [
        n7HandoffPayload.topic_question_candidate_set_ref,
        feedbackArtifact.artifact_ref,
        initialInput.frozen_input.source_refs.find((sourceRef) => sourceRef.ref_type === 'artifact_ref')!,
        n7Result.handoff_ref,
      ],
      payload: payload as unknown as Record<string, unknown>,
    },
  });
}

async function runReadyN7(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6);
  const n7 = await ctx.service.invokeNode(input);
  return { n6, n7 };
}

async function runN7ExhaustionLoopbackFixture(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  suffix: string,
) {
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: `workflow_run_v1b_n6_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n6_${suffix}`,
  });
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: `second_${suffix}_candidate`,
    main_question: 'How can a second candidate preserve N7 exhaustion context for N6 regeneration?',
    expected_claim: 'The second candidate lets N7 exhaust trials before N6 regenerates.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', second.candidate_key],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: `workflow_run_v1b_n7_${suffix}_first`,
    node_attempt_id: `node_attempt_v1b_n7_${suffix}_first`,
  });
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const exhaustedCandidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  const synthesis: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: exhaustedCandidates.map((candidate) =>
      ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'All current candidate trials failed value support and require N6 regeneration.',
    n6_regeneration_hints: ['Regenerate with a narrower value-support claim and stronger evidence linkage.'],
    affected_refs: [n6.authority_ref!],
  };
  const exhausted = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await generateN7RuntimeSupportArtifact(
        ctx,
        exhaustedInput,
        'n7_failed_trial_synthesis',
        synthesis,
      ),
    ],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  const projectionRef = await n7LoopbackProjectionRef(ctx, exhausted);
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef.ref_id);
  assert.ok(projectionArtifact);
  return {
    n5,
    n6,
    exhausted,
    projectionRef,
    projectionArtifact,
    projection: projectionArtifact.payload as unknown as TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
  };
}

async function n8Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n7Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    trace_snapshot_ref?: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
  options: { confirmQuestionCheckpoint?: boolean } = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n7Result.authority_ref || !n7Result.handoff_ref || !n7Result.hashes.handoff_hash) {
    throw new Error('N8 fixture requires admitted N7 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n7Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N7ToN8Handoff') {
    throw new Error('N8 fixture requires N7ToN8 handoff artifact.');
  }
  const payload: TopicSelectionV1bN8HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN8HarnessFrozenInputPayload, 'n7_handoff_hash'>),
    n7_handoff_hash: n7Result.hashes.handoff_hash,
  };
  if (options.confirmQuestionCheckpoint !== false) {
    await confirmQuestionCheckpoint(ctx, n7Result.authority_ref.title_card_id ?? TITLE_CARD_ID);
  }
  const projectionRef = await n7ToN8ProjectionRef(ctx, n7Result);
  return request({
    workflow_run_id: 'workflow_run_v1b_n8',
    node_attempt_id: 'node_attempt_v1b_n8',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    title_card_id: n7Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: {
      input_contract: 'N7ToN8Handoff@v1',
      snapshot_kind: 'topic_question_contract',
      source_refs: uniqueRefs([n7Result.authority_ref, n7Result.handoff_ref, projectionRef, ...handoff.required_refs]),
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function confirmQuestionCheckpoint(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  titleCardId = TITLE_CARD_ID,
): Promise<void> {
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(titleCardId, 'question_contract');
  if (!checkpoint) throw new Error('N8 fixture requires the N7 question checkpoint.');
  if (checkpoint.status === 'decided') return;
  await ctx.researchCheckpointService.recordDecision(checkpoint.research_checkpoint_id, {
    decision_key: `question_confirmation_${checkpoint.research_checkpoint_id}`,
    decision: 'advance',
    actor: { actor_type: 'human', actor_id: 'unit_test_researcher' },
    confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
    rationale: 'The researcher confirms the identifiable, operationalized, falsifiable, and bounded design.',
    review_payload: {
      review_kind: 'question_contract',
      mechanism_identifiable: true,
      proxy_operationalized: true,
      confounds_reviewed: true,
      falsification_reviewed: true,
      claim_ceiling_reviewed: true,
      objections_reviewed: true,
      review_notes: ['Qualified fixture confirmation for the exact N7 contract snapshot.'],
    },
  });
}

async function n7ToN8ProjectionRef(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n7Result: { trace_snapshot_ref?: TopicSelectionFunctionalRef | null },
): Promise<TopicSelectionFunctionalRef> {
  if (!n7Result.trace_snapshot_ref) {
    throw new Error('N8 fixture requires the N7 trace snapshot with runtime context projection.');
  }
  const trace = await ctx.controlPlane.getTraceSnapshot(n7Result.trace_snapshot_ref.ref_id);
  const projectionRef = trace?.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null | undefined;
  if (!projectionRef || projectionRef.ref_type !== 'artifact_ref') {
    throw new Error('N8 fixture requires the N7-to-N8 runtime context projection artifact.');
  }
  return projectionRef;
}

function n8ValueDraft(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bTopicValueAssessmentDraftPayload> = {},
): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN8HarnessFrozenInputPayload;
  const evidenceRef = payload.topic_question_contract_ref;
  const hardGates = TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
    gate_key: gateKey,
    verdict: 'pass' as const,
    severity: 'info' as const,
    overridable_with_risk: false,
    rationale: `${gateKey} passes in the deterministic value fixture.`,
    refs: [evidenceRef],
  }));
  const dimensionScores = TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
    dimension_key: dimensionKey,
    score: dimensionKey === 'reviewer_risk' ? 72 : 84,
    rationale: `${dimensionKey} is sufficiently supported for the fixture.`,
    evidence_refs: [evidenceRef],
    uncertainty: 'medium',
  }));
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: hardGates,
    dimension_scores: dimensionScores,
    risk_penalty: {
      residual_risk: 'bounded',
    },
    reviewer_objections: ['Provider canary behavior is outside this fixture run.'],
    ceiling_case: 'The topic can support a bounded workflow claim with deterministic trace evidence.',
    base_case: 'The topic supports harness-native acceptance and replay validation.',
    floor_case: 'The topic still yields useful negative gate coverage.',
    recommended_disposition: 'advance_to_package',
    total_score: 83,
    value_summary: 'The active TopicQuestionContract has enough value and answerability for draft packaging.',
    confidence: 0.82,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Provider canary and output quality review remain downstream checks.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'Harness-native v1b topic selection is valuable because it closes automation, replay, and authority boundaries.',
      significance: 'It turns route-testable workflow fragments into a product-level repeatable process.',
      originality: 'The contribution is a deterministic gate and handoff workflow around LLM-assisted semantic drafts.',
      claim_leverage: 'The claim remains bounded to workflow robustness and replay evidence.',
      reviewer_risks: ['The implementation needs downstream provider canary validation.'],
      effort_to_value: 'The fixture chain gives high value for moderate implementation effort.',
      strategic_fit: 'It aligns with reviewer-aligned paper engineering workflows.',
      negative_memory_check: 'No prior negative memory blocks this topic.',
      evidence_backed_rationale: 'The N7 contract and candidate lineage provide frozen trace evidence.',
      top_objections: ['The fixture does not prove live provider quality.'],
      uncertainty: 'Medium uncertainty until provider canary is added.',
      disposition_bridge: 'Advance to package with residual risks carried into v1c.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [evidenceRef],
    },
    ...overrides,
  };
}

async function recordN8ValueDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const draftHash = sha256Text(stableStringify(draft));
  return semanticArtifact(input, {
    slot_id: 'n8_value_assessment_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicValueAssessmentDraft@v1',
    execution_mode: 'codex_assisted',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: draftHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: draftHash,
    structured_output_hash: draftHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function generateN8RuntimeValueDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
  options: {
    runMode?: NonNullable<TopicSelectionV1bWorkflowHarnessRunRequest['run_mode']>;
  } = {},
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(ctx.controlPlane);
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateDraftArtifact({
    request: input,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: draft,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N8 runtime value draft generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function runReadyN8(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  draftOverrides: Partial<TopicSelectionV1bTopicValueAssessmentDraftPayload> = {},
) {
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7);
  const draft = n8ValueDraft(input, draftOverrides);
  const n8 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });
  return { n7, n8, draft };
}

function hashValueMemoForHarness(memo: {
  cited_refs: TopicSelectionFunctionalRef[];
  recommendation: string;
  requires_critic_review: boolean;
  topic_question_contract_id: string;
  topic_value_assessment_id: string;
  value_reasoning_memo_id: string;
  value_thesis: string;
}): string {
  return sha256Text(stableStringify({
    cited_refs: memo.cited_refs,
    recommendation: memo.recommendation,
    requires_critic_review: memo.requires_critic_review,
    topic_question_contract_id: memo.topic_question_contract_id,
    topic_value_assessment_id: memo.topic_value_assessment_id,
    value_reasoning_memo_id: memo.value_reasoning_memo_id,
    value_thesis: memo.value_thesis,
  }));
}

async function n9Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n8Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n8Result.authority_ref || !n8Result.handoff_ref || !n8Result.hashes.authority_hash || !n8Result.hashes.handoff_hash) {
    throw new Error('N9 fixture requires admitted N8 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n8Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N8ToN9Handoff') {
    throw new Error('N9 fixture requires N8ToN9 handoff artifact.');
  }
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8Result.authority_ref.ref_id);
  if (!assessment) {
    throw new Error('N9 fixture requires persisted assessment.');
  }
  const memo = await ctx.valueAssessmentRepository.findReasoningMemoById(assessment.value_reasoning_memo_id);
  if (!memo) {
    throw new Error('N9 fixture requires persisted value memo.');
  }
  const payload: TopicSelectionV1bN9HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN9HarnessFrozenInputPayload, 'n8_handoff_hash' | 'value_reasoning_memo_ref' | 'value_reasoning_memo_hash' | 'recommended_disposition'>),
    n8_handoff_hash: n8Result.hashes.handoff_hash,
    value_reasoning_memo_ref: ref('value_reasoning_memo', memo.value_reasoning_memo_id, memo.title_card_id),
    value_reasoning_memo_hash: hashValueMemoForHarness(memo),
    recommended_disposition: memo.recommendation,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n9',
    node_attempt_id: 'node_attempt_v1b_n9',
    node_id: 'topic-selection.v1b.decide-value-disposition.v1',
    title_card_id: n8Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N8ToN9Handoff@v1',
      snapshot_kind: 'topic_value_assessment',
      source_refs: [n8Result.authority_ref, payload.value_reasoning_memo_ref, n8Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN9(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n8 } = await runReadyN8(ctx);
  const input = await n9Request(ctx, n8);
  const n9 = await ctx.service.invokeNode(input);
  return { n8, n9 };
}

async function n10Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n9Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n9Result.authority_ref || !n9Result.handoff_ref || !n9Result.hashes.handoff_hash) {
    throw new Error('N10 fixture requires admitted N9 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n9Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N9ToN10Handoff') {
    throw new Error('N10 fixture requires N9ToN10 handoff artifact.');
  }
  const payload: TopicSelectionV1bN10HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN10HarnessFrozenInputPayload, 'n9_handoff_hash'>),
    n9_handoff_hash: n9Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n10',
    node_attempt_id: 'node_attempt_v1b_n10',
    node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
    title_card_id: n9Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N9ToN10Handoff@v1',
      snapshot_kind: 'value_disposition_decision',
      source_refs: [n9Result.authority_ref, n9Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN10(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n9 } = await runReadyN9(ctx);
  const input = await n10Request(ctx, n9);
  const n10 = await ctx.service.invokeNode(input);
  return { n9, n10 };
}

function hashPackageForHarness(pkg: {
  package_payload: Record<string, unknown>;
  package_readiness_status: string;
  package_version: string;
  research_slice_id: string;
  selected_evidence_refs: TopicSelectionFunctionalRef[];
  title_candidates: string[];
  topic_package_id: string;
  topic_question_contract_id: string;
  topic_value_assessment_id: string;
  value_disposition_decision_id: string;
  v1c_input_bundle_id?: string | null;
}): string {
  return sha256Text(stableStringify({
    package_payload: pkg.package_payload,
    package_readiness_status: pkg.package_readiness_status,
    package_version: pkg.package_version,
    research_slice_id: pkg.research_slice_id,
    selected_evidence_refs: pkg.selected_evidence_refs,
    title_candidates: pkg.title_candidates,
    topic_package_id: pkg.topic_package_id,
    topic_question_contract_id: pkg.topic_question_contract_id,
    topic_value_assessment_id: pkg.topic_value_assessment_id,
    value_disposition_decision_id: pkg.value_disposition_decision_id,
    v1c_input_bundle_id: pkg.v1c_input_bundle_id,
  }));
}

function hashV1cBundleForHarness(bundle: {
  bundle_hash: string;
  bundle_status: string;
  package_readiness_status: string;
  package_version: string;
  topic_package_id: string;
  v1b_to_v1c_input_bundle_id: string;
}): string {
  return sha256Text(stableStringify({
    bundle_hash: bundle.bundle_hash,
    bundle_status: bundle.bundle_status,
    package_readiness_status: bundle.package_readiness_status,
    package_version: bundle.package_version,
    topic_package_id: bundle.topic_package_id,
    v1b_to_v1c_input_bundle_id: bundle.v1b_to_v1c_input_bundle_id,
  }));
}

async function n11Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n10Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n10Result.authority_ref || !n10Result.handoff_ref || !n10Result.hashes.authority_hash || !n10Result.hashes.handoff_hash) {
    throw new Error('N11 fixture requires admitted N10 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n10Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N10ToN11Handoff') {
    throw new Error('N11 fixture requires N10ToN11 handoff artifact.');
  }
  const pkg = await ctx.topicPackageRepository.findPackageById(n10Result.authority_ref.ref_id);
  if (!pkg) {
    throw new Error('N11 fixture requires persisted draft package.');
  }
  const bundle = await ctx.topicPackageRepository.findV1cInputBundleByPackageId(pkg.topic_package_id);
  if (!bundle) {
    throw new Error('N11 fixture requires persisted v1c input bundle.');
  }
  const payload: TopicSelectionV1bN11HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN11HarnessFrozenInputPayload, 'n10_handoff_hash' | 'v1c_input_bundle_ref' | 'v1c_input_bundle_hash'>),
    n10_handoff_hash: n10Result.hashes.handoff_hash,
    v1c_input_bundle_ref: ref('v1b_to_v1c_input_bundle', bundle.v1b_to_v1c_input_bundle_id, bundle.title_card_id),
    v1c_input_bundle_hash: hashV1cBundleForHarness(bundle),
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n11',
    node_attempt_id: 'node_attempt_v1b_n11',
    node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
    title_card_id: n10Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N10ToN11Handoff@v1',
      snapshot_kind: 'topic_package',
      source_refs: [n10Result.authority_ref, payload.v1c_input_bundle_ref, n10Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN11(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n10 } = await runReadyN10(ctx);
  const input = await n11Request(ctx, n10);
  const n11 = await ctx.service.invokeNode(input);
  return { n10, n11 };
}

async function runTerminalPackageFromN8(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n8Result: TopicSelectionV1bWorkflowHarnessRunResult,
  suffix: string,
) {
  const n9 = await ctx.service.invokeNode(await n9Request(ctx, n8Result, {
    workflow_run_id: `workflow_run_v1b_n9_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n9_${suffix}`,
  }));
  assert.equal(n9.gate_status, 'admitted_with_warnings');
  assert.equal(n9.route_decision, 'invoke_next');

  const n10 = await ctx.service.invokeNode(await n10Request(ctx, n9, {
    workflow_run_id: `workflow_run_v1b_n10_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n10_${suffix}`,
  }));
  assert.equal(n10.gate_status, 'admitted_with_warnings');
  assert.equal(n10.route_decision, 'invoke_next');

  const n11 = await ctx.service.invokeNode(await n11Request(ctx, n10, {
    workflow_run_id: `workflow_run_v1b_n11_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n11_${suffix}`,
  }));
  assert.equal(n11.gate_status, 'admitted_with_warnings');
  assert.equal(n11.route_decision, 'stop_v1b_complete');
  assert.equal(n11.authority_ref?.ref_type, 'v1b_to_v1c_input_bundle');
  return { n9, n10, n11 };
}

async function assertTraceLoopbackTargetCode(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  result: TopicSelectionV1bWorkflowHarnessRunResult,
  expected: string,
  expectedTargetNodeId?: TopicSelectionV1bWorkflowHarnessNodeId,
) {
  assert.ok(result.trace_snapshot_ref);
  const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref.ref_id);
  assert.ok(trace);
  assert.equal(trace.payload.loopback_target_code, expected);
  if (expectedTargetNodeId) {
    assert.equal(trace.payload.route_target_node_id, expectedTargetNodeId);
  }
  assert.equal(trace.payload.loopback_target, undefined);
  const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((item) => item.node_id === result.node_id);
  assert.ok((policy?.loopback_target_codes as readonly string[] | undefined)?.includes(expected));
  return trace;
}

async function n7LoopbackProjectionRef(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  result: TopicSelectionV1bWorkflowHarnessRunResult,
): Promise<TopicSelectionFunctionalRef> {
  const trace = await assertTraceLoopbackTargetCode(ctx, result, 'n7_loopback_to_n6');
  const projectionRef = trace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  return projectionRef!;
}

async function n6GateFailureRetryProjectionRef(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  result: TopicSelectionV1bWorkflowHarnessRunResult,
): Promise<TopicSelectionFunctionalRef> {
  const trace = await assertTraceLoopbackTargetCode(ctx, result, 'n6_regenerate_candidates');
  const projectionRef = trace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  return projectionRef!;
}

function n6InputWithN7LoopbackProjection(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  projectionRef: TopicSelectionFunctionalRef,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const frozenInput = {
    ...input.frozen_input,
    source_refs: [...input.frozen_input.source_refs, projectionRef],
  };
  return {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
}

function n6InputWithN6GateFailureProjection(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  projectionRef: TopicSelectionFunctionalRef,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const frozenInput = {
    ...input.frozen_input,
    source_refs: [...input.frozen_input.source_refs, projectionRef],
  };
  return {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
}

async function assertNoTraceArtifactForAttempt(
  ctx: ReturnType<typeof makeContext>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): Promise<void> {
  const failedAttemptArtifacts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const failedTraceArtifacts = failedAttemptArtifacts.filter((artifact) =>
    artifact.artifact_kind === 'trace'
    && (artifact.payload as { node_id?: string } | null)?.node_id === input.node_id
  );
  assert.equal(failedTraceArtifacts.length, 0);
}

async function assertNoRuntimeContextProjectionForAttempt(
  ctx: ReturnType<typeof makeContext>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): Promise<void> {
  const artifacts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const projections = artifacts.filter((artifact) =>
    artifact.artifact_kind === 'diagnostic'
    && (artifact.payload as { schema_version?: string } | null)?.schema_version
      === TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION
    && (artifact.payload as { node_attempt_id?: string } | null)?.node_attempt_id === input.node_attempt_id);
  assert.equal(projections.length, 0);
}

async function assertAuthorityWriteFailureCanRetry(
  ctx: ReturnType<typeof makeContext>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  expectedError: RegExp,
  assertNoAuthority: () => Promise<void>,
): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
  await assert.rejects(
    () => ctx.service.invokeNode(input),
    expectedError,
  );
  await assertNoTraceArtifactForAttempt(ctx, input);
  await assertNoAuthority();

  const result = await ctx.service.invokeNode(input);
  assert.notEqual(result.gate_status, 'blocked');
  assert.equal(result.replay_provenance, null);
  assert.ok(result.authority_ref);

  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, result.authority_ref?.ref_id);
  return result;
}

async function seedHarnessV1aBundle(options: {
  openRecheck?: boolean;
  acceptedRiskCoversRecheck?: boolean;
  acceptedRiskExpiresAt?: string | null;
  evidenceUnits?: TopicSelectionEvidenceUnitRecord[];
  needStatement?: string;
} = {}) {
  const ctx = makeContext({ withRunnerDependencies: true });
  const literatureRefs = options.evidenceUnits ? uniqueRefs(options.evidenceUnits.map(unit => unit.literature_ref)) : [ref('literature_record', 'lit_1', TITLE_CARD_ID)];
  const qualification = Boolean(options.evidenceUnits);
  const priorArtStatus = qualification ? 'unknown' : 'no_strong_solution_found';
  const mechanism = { mechanism_type: qualification ? 'evaluation_gap' as const : 'workflow_gap' as const,
    mechanism_summary: qualification ? 'Controlled hypothesis: characterize retrieval generalization and placement effects; not a verified unmet need.' : 'Traceability is brittle.',
    mechanism_payload: qualification ? { isolated_upstream_fixture: true } : {},
    scope_notes: qualification ? 'Bounded retrieval evaluation with supplied abstracts only.' : 'CS paper engineering assistants.',
    non_goal_notes: qualification ? 'No universal superiority or established novelty claim.' : 'Do not solve final paper planning.' };
  const actor: TopicSelectionActorRef = { actor_type: 'human', actor_id: 'reviewer_1' };
  const evidenceMapRef = ref('evidence_map', 'evidence_map_1', TITLE_CARD_ID, 'v1');
  const searchRunRef = ref('search_run', 'search_run_1', TITLE_CARD_ID);
  const searchPlanRef = ref('search_plan', 'search_plan_1', TITLE_CARD_ID, 'v1');
  const literatureSnapshotRef = ref('literature_resource_pool_snapshot', 'literature_snapshot_1', TITLE_CARD_ID, 'v1');
  const supportUnitRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const roleBundle: TopicSelectionEvidenceRoleBundle = {
    support_unit_refs: options.evidenceUnits?.filter(unit => unit.evidence_role === 'support').map(unit => ref('evidence_unit', unit.evidence_unit_id)) ?? [supportUnitRef],
    challenge_unit_refs: options.evidenceUnits?.filter(unit => unit.evidence_role === 'challenge').map(unit => ref('evidence_unit', unit.evidence_unit_id)) ?? [],
    baseline_unit_refs: options.evidenceUnits?.filter(unit => unit.evidence_role === 'baseline').map(unit => ref('evidence_unit', unit.evidence_unit_id)) ?? [ref('evidence_unit', 'evidence_unit_baseline_1', TITLE_CARD_ID)],
    context_unit_refs: options.evidenceUnits?.filter(unit => unit.evidence_role === 'context').map(unit => ref('evidence_unit', unit.evidence_unit_id)) ?? [],
  };
  const humanDecisionRef = ref('human_confirmed_decision', 'human_decision_1', TITLE_CARD_ID);
  const validatedNeedRef = ref('validated_need', 'validated_need_1', TITLE_CARD_ID);
  const sourceCandidateRef = ref('need_candidate', 'need_candidate_1', TITLE_CARD_ID, 'v1');
  const supportPacketRef = ref('validation_decision_support_packet', 'support_packet_1', TITLE_CARD_ID);
  const adjudicationRef = ref('validate_need_adjudication_result', 'adjudication_1', TITLE_CARD_ID);
  const traceRef = ref('trace_snapshot', 'trace_1', TITLE_CARD_ID);
  const recheckRef = ref('search_plan_recheck_request', 'search_recheck_1', TITLE_CARD_ID);
  await ctx.controlPlaneRepository.createTraceSnapshot({
    trace_snapshot_id: traceRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    target_ref: validatedNeedRef,
    snapshot_hash: 'trace_hash_1',
    object_refs: [validatedNeedRef, sourceCandidateRef, supportPacketRef, adjudicationRef],
    lineage_link_refs: [],
    artifact_refs: [],
    quality_signal_refs: [],
    transition_attempt_refs: [],
    payload: { stage: 'v1a' },
    created_by: 'system',
    created_at: NOW,
  });
  await ctx.searchRepository.createLiteratureResourcePoolSnapshot({
    literature_resource_pool_snapshot_id: literatureSnapshotRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    snapshot_version: 'v1',
    source_scope: 'title_card_evidence_basket',
    topic_seed_ref: ref('topic_seed', 'topic_seed_1', TITLE_CARD_ID),
    literature_refs: literatureRefs,
    content_source_refs: [],
    source_health_summary: {
      total_literature_count: literatureRefs.length,
      missing_literature_ids: [],
      rights_class_counts: {},
      pipeline_ready_count: literatureRefs.length,
      abstract_ready_count: literatureRefs.length,
      key_content_ready_count: qualification ? 0 : 1,
      fulltext_ready_count: qualification ? 0 : 1,
      source_count: literatureRefs.length,
      stale_count: 0,
      blocked_count: 0,
      warning_codes: [],
    },
    snapshot_hash: 'snapshot_hash_1',
    created_by: 'system',
    created_at: NOW,
  } satisfies TopicSelectionLiteratureResourcePoolSnapshotRecord);
  await ctx.searchRepository.createSearchPlanWithCoverageIntents({
    search_plan_id: searchPlanRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    plan_version: 'v1',
    status: 'ready',
    topic_seed_ref: ref('topic_seed', 'topic_seed_1', TITLE_CARD_ID),
    literature_snapshot_ref: literatureSnapshotRef,
    query_intents: qualification ? ['Controlled pinned retrieval abstracts; no live search performed'] : ['reviewer traceability'],
    must_check_constraints: [],
    exclusion_rules: [],
    coverage_strategy: {},
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  } satisfies TopicSelectionSearchPlanRecord, []);
  await ctx.searchRepository.createSearchRunWithCoverageRecords({
    search_run_id: searchRunRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    run_kind: 'planned_search',
    run_status: 'succeeded',
    query_provenance: [],
    result_accounting: {
      total_result_count: literatureRefs.length,
      unique_literature_count: literatureRefs.length,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {},
    dedup_summary: {},
    evidence_map_input_refs: literatureRefs,
    artifact_refs: [],
    started_at: NOW,
    finished_at: NOW,
    created_by: 'system',
    created_at: NOW,
  } satisfies TopicSelectionSearchRunRecord, {
    observations: [],
    evidence_bindings: [],
    assessments: [],
    risk_acceptances: [],
  });
  await ctx.evidenceRepository.createEvidenceMapWithRecords({
    evidence_map: {
      evidence_map_id: evidenceMapRef.ref_id,
      workspace_id: null,
      title_card_id: TITLE_CARD_ID,
      evidence_map_version: 'v1',
      status: 'ready',
      review_status: 'machine_checked',
      freshness_status: 'current',
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      unit_count: options.evidenceUnits?.length ?? 1,
      support_unit_count: roleBundle.support_unit_refs.length,
      challenge_unit_count: roleBundle.challenge_unit_refs.length,
      baseline_unit_count: roleBundle.baseline_unit_refs.length,
      context_unit_count: roleBundle.context_unit_refs.length,
      digest_payload: {},
      stale_reason_codes: [],
      artifact_refs: [],
      created_by: 'system',
      created_at: NOW,
    } satisfies TopicSelectionEvidenceMapRecord,
    evidence_units: options.evidenceUnits ?? [],
    typed_links: [],
    clusters: [],
    patterns: [],
    conflict_sets: [],
  });
  const candidate: TopicSelectionNeedCandidateRecord = {
    need_candidate_id: sourceCandidateRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    evidence_map_id: evidenceMapRef.ref_id,
    candidate_version: 'v1',
    lifecycle_status: 'closed',
    decision_status: 'resulted_in_validated_need',
    review_status: 'human_confirmed',
    freshness_status: 'current',
    candidate_need: options.needStatement ?? 'Evidence-to-need traceability is hard to audit.',
    unmet_need_statement: options.needStatement ?? 'Reviewer-aligned topic selection needs stronger evidence-to-need traceability.',
    ...mechanism,
    semantic_group_key: 'a'.repeat(64),
    current_arena_advisory: null,
    prior_art_status: priorArtStatus,
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    evidence_role_bundle: roleBundle,
    conflict_refs: [],
    strength_assessment_refs: [],
    open_recheck_request_refs: options.openRecheck ? [recheckRef] : [],
    unresolved_challenge_refs: [],
    accepted_risk_refs: [],
    gap_codes: [],
    speculative: false,
    confidence: 0.8,
    artifact_refs: [],
    result_adjudication_id: adjudicationRef.ref_id,
    result_validated_need_id: validatedNeedRef.ref_id,
    merged_into_need_candidate_ref: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
  await ctx.needRepository.createNeedCandidate(candidate);
  const supportPacket: TopicSelectionValidationDecisionSupportPacketRecord = {
    validation_support_packet_id: supportPacketRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    need_candidate_id: sourceCandidateRef.ref_id,
    evidence_map_id: evidenceMapRef.ref_id,
    readiness_assessment_id: null,
    packet_status: 'ready',
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    need_candidate_ref: sourceCandidateRef,
    readiness_assessment_ref: null,
    evidence_role_bundle: roleBundle,
    conflict_refs: [],
    strength_assessment_refs: [],
    coverage_refs: [searchPlanRef, searchRunRef, literatureSnapshotRef],
    residual_risk_refs: [],
    open_gap_codes: [],
    required_human_checks: ['confirm_unmet_need'],
    prior_art_status: priorArtStatus,
    already_solved_review: {},
    packet_payload: {},
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  };
  await ctx.needRepository.createValidationDecisionSupportPacket(supportPacket);

  let riskRef: TopicSelectionFunctionalRef | null = null;
  if (options.acceptedRiskCoversRecheck) {
    riskRef = ref('accepted_risk', 'accepted_risk_1', TITLE_CARD_ID);
    await ctx.recheckRepository.createAcceptedRisk({
      accepted_risk_id: riskRef.ref_id,
      workspace_id: null,
      title_card_id: TITLE_CARD_ID,
      risk_type: 'open_recheck_accepted_for_v1b_intake',
      source_type: 'manual',
      source_ref: recheckRef,
      target_ref: validatedNeedRef,
      scope_refs: [recheckRef, searchPlanRef],
      affected_object_refs: [validatedNeedRef],
      severity: 'blocking',
      status: 'active',
      rationale: 'Reviewer accepts this recheck as bounded for slice planning.',
      accepted_by: actor,
      recheck_condition: 'new counter evidence appears',
      expires_at: options.acceptedRiskExpiresAt ?? null,
      created_at: NOW,
      updated_at: NOW,
    } satisfies TopicSelectionAcceptedRiskRecord);
  }
  if (options.openRecheck) {
    await ctx.searchRepository.createSearchPlanRecheckRequest({
      search_plan_recheck_request_id: recheckRef.ref_id,
      workspace_id: null,
      title_card_id: TITLE_CARD_ID,
      source_ref: sourceCandidateRef,
      target_search_plan_ref: searchPlanRef,
      target_literature_snapshot_ref: literatureSnapshotRef,
      reason: 'Counter evidence should be rechecked.',
      gap_codes: ['COUNTER_EVIDENCE_COVERAGE_GAP'],
      requested_by: 'human',
      status: 'open',
      decision_summary: null,
      accepted_risk_refs: riskRef ? [riskRef] : [],
      resulting_search_plan_ref: null,
      resulting_search_run_ref: null,
      created_at: NOW,
      resolved_at: null,
    } satisfies TopicSelectionSearchPlanRecheckRequestRecord);
  }
  const adjudication: TopicSelectionValidateNeedAdjudicationResultRecord = {
    adjudication_result_id: adjudicationRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    need_candidate_id: sourceCandidateRef.ref_id,
    support_packet_id: supportPacketRef.ref_id,
    final_decision: 'validate',
    output_validated_need_id: validatedNeedRef.ref_id,
    human_decision_id: humanDecisionRef.ref_id,
    loopback_target: 'none',
    rejected_reason: null,
    merge_target_need_candidate_ref: null,
    output_searchplan_recheck_request_ref: null,
    output_memory_suggestion_ref: null,
    rationale: 'Human confirmed the need.',
    required_actions: [],
    accepted_risk_refs: riskRef ? [riskRef] : [],
    residual_risk_refs: [],
    gap_codes: [],
    decision_payload: {},
    artifact_refs: [],
    adjudicated_by: actor,
    created_at: NOW,
  };
  await ctx.controlPlane.recordHumanDecision({
    title_card_id: TITLE_CARD_ID,
    target_ref: validatedNeedRef,
    decision_type: 'confirm',
    actor,
    rationale: 'Human confirmed the validated need.',
    resulting_authority_refs: [validatedNeedRef],
  });
  const validatedNeed: TopicSelectionValidatedNeedRecord = {
    validated_need_id: validatedNeedRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    source_need_candidate_id: sourceCandidateRef.ref_id,
    adjudication_result_id: adjudicationRef.ref_id,
    support_packet_id: supportPacketRef.ref_id,
    human_decision_id: humanDecisionRef.ref_id,
    validated_need_statement: options.needStatement ?? 'Reviewer-aligned topic selection needs stronger evidence-to-need traceability.',
    ...mechanism,
    prior_art_status: priorArtStatus,
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    support_packet_ref: supportPacketRef,
    adjudication_result_ref: adjudicationRef,
    human_decision_ref: humanDecisionRef,
    evidence_role_bundle: roleBundle,
    strength_assessment_refs: [],
    conflict_refs: [],
    residual_risk_refs: [],
    accepted_risk_refs: riskRef ? [riskRef] : [],
    trace_refs: [traceRef],
    created_by: 'human',
    created_at: NOW,
  };
  const bundle: TopicSelectionV1aToV1bInputBundleRecord = {
    v1b_input_bundle_id: 'v1b_input_bundle_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    validated_need_id: validatedNeedRef.ref_id,
    source_need_candidate_id: sourceCandidateRef.ref_id,
    adjudication_result_id: adjudicationRef.ref_id,
    support_packet_id: supportPacketRef.ref_id,
    bundle_version: 'v1',
    validated_need_ref: validatedNeedRef,
    source_need_candidate_ref: sourceCandidateRef,
    adjudication_result_ref: adjudicationRef,
    support_packet_ref: supportPacketRef,
    human_decision_ref: humanDecisionRef,
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    evidence_role_bundle: roleBundle,
    trace_refs: [traceRef],
    risk_refs: riskRef ? [riskRef] : [],
    gap_codes: [],
    memory_suggestion_refs: [],
    recheck_request_refs: options.openRecheck ? [recheckRef] : [],
    handoff_payload: {
      validated_need_statement: validatedNeed.validated_need_statement,
    },
    created_by: 'system',
    created_at: NOW,
  };
  await ctx.needRepository.adjudicateWithSideEffects({
    adjudication_result: adjudication,
    candidate_patch: {
      lifecycle_status: 'closed',
      decision_status: 'resulted_in_validated_need',
      review_status: 'human_confirmed',
      freshness_status: 'current',
      result_adjudication_id: adjudication.adjudication_result_id,
      result_validated_need_id: validatedNeed.validated_need_id,
      updated_at: NOW,
    },
    validated_need: validatedNeed,
    v1b_input_bundle: bundle,
  });

  return { ...ctx, bundle, riskRef };
}

test('v1b workflow harness node policy registry covers all N1-N11 nodes with expected execution classes', () => {
  const ctx = makeContext();
  const policies = ctx.service.getNodePolicies();
  assert.deepEqual(
    policies.map((policy) => policy.node_id),
    [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS],
  );
  assert.equal(policies.length, 11);

  const deterministic = policies.filter((policy) => policy.execution_kind === 'deterministic').map((policy) => policy.node_id);
  const delegated = policies.filter((policy) => policy.execution_kind === 'delegated').map((policy) => policy.node_id);
  const modelLike = policies.filter((policy) => policy.execution_kind === 'model_like').map((policy) => policy.node_id);

  assert.deepEqual(deterministic, [
    'topic-selection.v1b.create-intake-snapshot.v1',
    'topic-selection.v1b.assess-intake-readiness.v1',
    'topic-selection.v1b.decide-value-disposition.v1',
    'topic-selection.v1b.create-draft-topic-package.v1',
    'topic-selection.v1b.publish-v1c-input-bundle.v1',
  ]);
  assert.deepEqual(delegated, [
    'topic-selection.v1b.record-research-constraint-profile.v1',
    'topic-selection.v1b.select-research-slice.v1',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
  ]);
  assert.deepEqual(modelLike, [
    'topic-selection.v1b.generate-research-slice-options.v1',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
    'topic-selection.v1b.assess-topic-value.v1',
  ]);
  assert.equal(policies.every((policy) => policy.gate_id && policy.input_contract), true);
  assert.equal(policies.every((policy) => policy.replay_hash_components.includes('frozen_input_hash')), true);
  assert.deepEqual(
    policies.filter((policy) => policy.semantic_support_slots.length > 0).map((policy) => policy.node_id),
    [
      'topic-selection.v1b.record-research-constraint-profile.v1',
      'topic-selection.v1b.assess-intake-readiness.v1',
      'topic-selection.v1b.generate-research-slice-options.v1',
      'topic-selection.v1b.select-research-slice.v1',
      'topic-selection.v1b.generate-topic-question-candidates.v1',
      'topic-selection.v1b.materialize-topic-question-contract.v1',
      'topic-selection.v1b.assess-topic-value.v1',
    ],
  );
});

test('v1b workflow harness shell blocks before runner when dependencies are not configured', async () => {
  const ctx = makeContext();
  const result = await ctx.service.invokeNode(request({
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.ok(result.gate_result_ref);
  assert.ok(result.transition_attempt_ref);
  assert.ok(result.trace_snapshot_ref);
  assert.ok(result.harness_trace_artifact_ref);

  const transition = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref.ref_id);
  assert.ok(transition);
  const attempts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(result.workflow_run_id);
  assert.equal(attempts.some((artifact) => artifact.artifact_kind === 'trace'), true);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
});

test('v1b workflow harness N1 creates intake snapshot authority and N1 handoff from frozen v1a bundle', async () => {
  const ctx = await seedHarnessV1aBundle();
  const result = await ctx.service.invokeNode(n1Request(ctx.bundle));

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'v1b_intake_snapshot');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.equal(result.hashes.authority_hash?.length, 64);
  assert.equal(result.hashes.handoff_hash?.length, 64);

  const snapshot = await ctx.v1bRepository.findIntakeSnapshotById(result.authority_ref!.ref_id);
  assert.equal(snapshot?.trace_status, 'passed');
  assert.equal(snapshot?.v1b_input_bundle_id, ctx.bundle.v1b_input_bundle_id);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [result.authority_ref]);
});

test('v1b workflow harness N2 creates constraint profile from Codex delegated accepted payload with matching provenance', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const result = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'research_constraint_profile');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  const profile = await ctx.v1bRepository.findResearchConstraintProfileById(result.authority_ref!.ref_id);
  assert.equal(profile?.target_community, acceptedPayload.target_community);
  assert.deepEqual(profile?.method_constraints, acceptedPayload.method_constraints);
});

test('v1b workflow harness N2 blocks Codex support without accepted payload authority input', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const brokenPayload = { ...n2Input.frozen_input.payload };
  delete brokenPayload.accepted_constraint_profile_payload;
  const brokenInput: TopicSelectionV1bWorkflowHarnessRunRequest = {
    ...n2Input,
    run_mode: null,
    profile_id: null,
    frozen_input: {
      ...n2Input.frozen_input,
      payload: brokenPayload,
      frozen_input_hash: frozenInputHash({
        ...n2Input.frozen_input,
        payload: brokenPayload,
        frozen_input_hash: null,
      }),
    },
  };
  const result = await ctx.service.invokeNode(brokenInput);

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N3 ready profile emits readiness authority and N3 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const result = await ctx.service.invokeNode(n3Request(n1, n2));

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'v1b_intake_readiness_assessment');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  const readiness = await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id);
  assert.equal(readiness?.recommendation, 'ready_for_slice');
  assert.equal(readiness?.blockers.length, 0);
});

test('v1b workflow harness N3 blocks missing constraints without N4 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload({
    target_community: '',
    method_constraints: [],
    resource_constraints: [],
    non_goals: [],
    claim_ceiling: '',
  });
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const result = await ctx.service.invokeNode(n3Request(n1, n2));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.handoff_ref, null);
  assert.equal(result.error_code, 'RESEARCH_CONSTRAINT_PROFILE_INCOMPLETE');
  const readiness = await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id);
  assert.equal(readiness?.recommendation, 'needs_constraint_clarification');
  assert.ok(readiness?.missing_constraint_codes.includes('TARGET_COMMUNITY_REQUIRED'));
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [result.authority_ref]);
});

test('v1b workflow harness N3 blocks drifted frozen authority hash before N4 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const input = n3Request(n1, n2);
  const result = await ctx.service.invokeNode({
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        constraint_profile_hash: 'b'.repeat(64),
      },
      frozen_input_hash: null,
    },
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N3_CONSTRAINT_PROFILE_HASH_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N3 carries accepted risk warning into result and handoff evidence', async () => {
  const ctx = await seedHarnessV1aBundle({ openRecheck: true, acceptedRiskCoversRecheck: true });
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const result = await ctx.service.invokeNode(n3Request(n1, n2));

  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next');
  assert.ok(result.warnings.some((warning) => warning.code === 'ACCEPTED_RISK_CARRIED_FORWARD'));
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  const readiness = await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id);
  assert.equal(readiness?.accepted_risk_refs.length, 1);
});

test('v1b workflow harness N4 creates research slice option set from frozen semantic draft artifact', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const draft = n4Draft();
  const requestWithDraft = {
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  };
  const result = await ctx.service.invokeNode(requestWithDraft);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'research_slice_option_set');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.equal(result.hashes.authority_hash?.length, 64);
  assert.equal(result.hashes.handoff_hash?.length, 64);

  const optionSet = await ctx.researchSliceRepository.findOptionSetById(result.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'ready_for_selection');
  assert.equal(optionSet?.option_count, 1);
  assert.ok(optionSet?.recommended_option_id);
  const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(result.authority_ref!.ref_id);
  assert.equal(options.length, 1);
  assert.equal(options[0]?.option_key, 'traceable_workflow_slice');
  assert.equal(options[0]?.status, 'recommended');
  assert.equal('portfolio_disposition' in (options[0]?.details_payload ?? {}), false);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [result.authority_ref]);
});

test('v1b workflow harness N4 successfully stops an evidence-grounded no-viable portfolio without candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'Every visible research slice is defeated by the frozen evidence.',
      confidence: 0.86,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'claim_defeating_data_or_evaluation',
          summary: 'The available data cannot support the bounded claim.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Reopen when a claim-supporting dataset becomes available.'],
      candidate_dispositions: [],
    },
  });
  const requestWithDraft = {
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  };
  const result = await ctx.service.invokeNode(requestWithDraft);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'stop_v1b_complete');
  assert.equal(result.failure_class, null);
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
  const replay = await ctx.service.invokeNode(requestWithDraft);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.route_decision, 'stop_v1b_complete');
  assert.equal(replay.authority_ref, null);
});

test('v1b workflow harness N4 blocks an evidence-free no-viable portfolio before candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'No visible slice should advance.',
      confidence: 0.86,
      evidence_refs: [],
      rejection_reasons: [
        {
          reason_code: 'claim_defeating_data_or_evaluation',
          summary: 'The available data cannot support the bounded claim.',
          evidence_refs: [],
        },
      ],
      reopening_conditions: ['Reopen when a claim-supporting dataset becomes available.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N4_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 routes an evidence-expansion portfolio without manufacturing slice authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'evidence_expansion_required',
      rationale: 'The visible evidence cannot distinguish the plausible slice directions.',
      confidence: 0.78,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'evidence_coverage_insufficient',
          summary: 'Nearest-work coverage is insufficient for a bounded slice decision.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Re-enter N4 only after a new v1a evidence bundle is current.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'expand_evidence');
  assert.equal(result.failure_class, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 routes a scope-reframe portfolio without manufacturing slice authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'reframe_required',
      rationale: 'The inherited research scope cannot express a falsifiable contribution.',
      confidence: 0.81,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'research_scope_misaligned',
          summary: 'The current scope conflicts with the bounded claim and evaluation constraints.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Revise the N2 research constraint profile before generating slices again.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'reframe_scope');
  assert.equal(result.failure_class, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 blocks an expansion portfolio that leaves an option undisposed', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    portfolio_disposition: {
      outcome: 'evidence_expansion_required',
      rationale: 'The visible evidence cannot distinguish the existing option.',
      confidence: 0.78,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'evidence_coverage_insufficient',
          summary: 'Nearest-work coverage is insufficient for a bounded slice decision.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Re-enter N4 only after a new v1a evidence bundle is current.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 rejects a selected portfolio without exactly one selected option disposition', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'The visible portfolio contains one preferred slice.',
      confidence: 0.84,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'traceable_workflow_slice',
          disposition: 'dropped',
          rationale: 'The only option is incorrectly marked dropped for this negative fixture.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N4_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 preserves selected parked and dropped option dispositions', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const baseOption = n4Draft().options[0]!;
  const draft = n4Draft({
    options: [
      baseOption,
      {
        ...baseOption,
        option_key: 'parked_data_slice',
        slice_statement: 'Park a data-dependent traceability slice.',
      },
      {
        ...baseOption,
        option_key: 'dropped_duplicate_slice',
        slice_statement: 'Drop a strictly dominated traceability slice.',
      },
    ],
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'One slice dominates while two alternatives remain explicit.',
      confidence: 0.84,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'traceable_workflow_slice',
          disposition: 'selected',
          rationale: 'This slice best fits the bounded evidence and execution constraints.',
          evidence_refs: [evidenceRef],
          reopening_conditions: [],
        },
        {
          candidate_key: 'parked_data_slice',
          disposition: 'parked',
          rationale: 'The direction becomes useful only when the missing dataset is available.',
          evidence_refs: [evidenceRef],
          reopening_conditions: ['Reopen after the required dataset is current.'],
        },
        {
          candidate_key: 'dropped_duplicate_slice',
          disposition: 'dropped',
          rationale: 'The direction is strictly dominated by the selected slice.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(result.authority_ref!.ref_id);
  assert.equal(options.find((option) => option.option_key === 'traceable_workflow_slice')?.status, 'recommended');
  assert.equal(options.find((option) => option.option_key === 'parked_data_slice')?.status, 'deferred');
  assert.equal(options.find((option) => option.option_key === 'dropped_duplicate_slice')?.status, 'rejected');
  assert.equal(
    (options.find((option) => option.option_key === 'dropped_duplicate_slice')?.details_payload
      .portfolio_disposition as { drop_reason_code?: string } | undefined)?.drop_reason_code,
    'strictly_dominated_by_visible_candidate',
  );
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(result.authority_ref!.ref_id);
  assert.equal(
    (optionSet?.options_payload.portfolio_disposition as { outcome?: string } | undefined)?.outcome,
    'selected',
  );
});

test('v1b workflow harness N5 cannot select an option dropped by the N4 portfolio disposition', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const baseOption = n4Draft().options[0]!;
  const draft = n4Draft({
    options: [
      baseOption,
      {
        ...baseOption,
        option_key: 'dropped_duplicate_slice',
        slice_statement: 'Drop a strictly dominated traceability slice.',
      },
    ],
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'One slice dominates the alternative.',
      confidence: 0.84,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'traceable_workflow_slice',
          disposition: 'selected',
          rationale: 'This slice best fits the bounded evidence and execution constraints.',
          evidence_refs: [evidenceRef],
          reopening_conditions: [],
        },
        {
          candidate_key: 'dropped_duplicate_slice',
          disposition: 'dropped',
          rationale: 'The direction is strictly dominated by the selected slice.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  });
  const n4 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });
  const droppedOption = (await ctx.researchSliceRepository.listOptionsByOptionSetId(n4.authority_ref!.ref_id))
    .find((option) => option.option_key === 'dropped_duplicate_slice')!;
  const result = await ctx.service.invokeNode(n5Request(n4, acceptedSliceSelectionPayload(droppedOption)));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N5_SELECTED_OPTION_NON_SELECTABLE');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N4 admits runtime-verified Codex research-slice draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_runtime_product',
    node_attempt_id: 'node_attempt_v1b_n4_runtime_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'product',
  });
  const draft = n4Draft();
  const semanticArtifact = await generateN4RuntimeDraftArtifact(ctx, input, draft);

  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.prompt_variant_key, 'n4_research_slice_option_draft.initial_from_n3');
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n4.research-slice-options.context-runtime@v1',
  );
  assert.match(semanticArtifact.source_hashes.n3_handoff_hash ?? '', /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.source_hashes.planning_input_hash ?? '', /^[a-f0-9]{64}$/);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'research_slice_option_set');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
});

test('v1b workflow harness N4 blocks runtime research-slice draft source drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_runtime_source_drift',
    node_attempt_id: 'node_attempt_v1b_n4_runtime_source_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'product',
  });
  const semanticArtifact = await generateN4RuntimeDraftArtifact(ctx, input, n4Draft());
  const driftedArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef = {
    ...semanticArtifact,
    source_hashes: {
      ...semanticArtifact.source_hashes,
      planning_input_hash: '9'.repeat(64),
    },
  };

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [driftedArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b N4 runtime compression quality gate blocks dropped required planning facts before draft output', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_runtime_compression_blocked',
    node_attempt_id: 'node_attempt_v1b_n4_runtime_compression_blocked',
  });
  const runtime = new TopicSelectionV1bN4ResearchSliceRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    planning_input: await n4RuntimePlanningInput(ctx, input),
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 120_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    compression_attempt: {
      compression_executor_kind: 'deterministic_structural',
      compressed_context: {
        summary: 'Intentionally incomplete N4 compressed context for quality-gate regression.',
        raw_provider_logs: ['must not be persisted in compressed runtime context'],
      },
      summary: {
        preserved_fact_kinds: ['planning_input'],
      },
      compressed_preserved_facts: {
        planning_input: ['incomplete'],
      },
    },
    codex_response: {
      output: n4Draft(),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'blocked');
  assert.equal(generated.invocation_result.status, 'blocked');
  assert.equal(generated.invocation_result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_N3_HANDOFF_DROPPED'));
  assert.equal(generated.invocation_result.structured_output, null);
});

test('v1b workflow harness N4 blocks fixture replay research-slice draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_fixture_product',
    node_attempt_id: 'node_attempt_v1b_n4_fixture_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'product',
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, n4Draft())],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N4 requires frozen semantic draft artifact and never live-executes execution_spec alone', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'acceptance',
  });
  const result = await ctx.service.invokeNode(input);

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_FROZEN_DRAFT_ARTIFACT_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 blocks malformed option drafts before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const draft = n4Draft({
    options: [
      n4Draft().options[0]!,
      {
        ...n4Draft().options[0]!,
        included_boundaries: [],
      },
    ],
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_DUPLICATE_RESEARCH_SLICE_OPTION_KEY');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 blocks semantic artifact hash drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const artifact = await recordN4DraftArtifact(ctx, input, n4Draft());
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      {
        ...artifact,
        normalized_output_hash: 'f'.repeat(64),
      },
    ],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N4 blocks frozen readiness hash drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const driftedInput: TopicSelectionV1bWorkflowHarnessRunRequest = {
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        intake_readiness_hash: 'b'.repeat(64),
      },
      frozen_input_hash: frozenInputHash({
        ...input.frozen_input,
        payload: {
          ...input.frozen_input.payload,
          intake_readiness_hash: 'b'.repeat(64),
        },
        frozen_input_hash: null,
      }),
    },
  };
  const result = await ctx.service.invokeNode({
    ...driftedInput,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, driftedInput, n4Draft())],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_INTAKE_READINESS_HASH_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N5 selects a research slice and emits N5 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option);
  const result = await ctx.service.invokeNode(n5Request(n4, accepted));

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'slice_selection_decision');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');

  const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'select');
  assert.equal(decision?.selected_option_id, option.research_slice_option_id);
  assert.equal(decision?.output_research_slice_ref?.ref_type, 'research_slice');
  const researchSlice = await ctx.researchSliceRepository.findResearchSliceById(
    decision!.output_research_slice_ref!.ref_id,
  );
  assert.equal(researchSlice?.source_option_ref.ref_id, option.research_slice_option_id);
  assert.equal(researchSlice?.slice_selection_decision_ref.ref_id, result.authority_ref!.ref_id);

  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'selected');
  assert.equal(optionSet?.selected_option_id, option.research_slice_option_id);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [
    result.authority_ref,
    decision?.output_research_slice_ref,
  ]);
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoffPayload = handoffArtifact?.payload as {
    payload?: {
      constraint_profile_hash?: string;
      constraint_profile_ref?: TopicSelectionFunctionalRef;
      intake_readiness_hash?: string;
      intake_readiness_ref?: TopicSelectionFunctionalRef;
      research_slice_ref?: TopicSelectionFunctionalRef;
    };
  } | null;
  assert.equal(handoffPayload?.payload?.constraint_profile_ref?.ref_type, 'research_constraint_profile');
  assert.match(handoffPayload?.payload?.constraint_profile_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(handoffPayload?.payload?.intake_readiness_ref?.ref_type, 'v1b_intake_readiness_assessment');
  assert.match(handoffPayload?.payload?.intake_readiness_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(
    handoffPayload?.payload?.research_slice_ref?.ref_id,
    decision?.output_research_slice_ref?.ref_id,
  );
});

test('v1b workflow harness N5 authority write failure does not leave replayable admitted trace', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const input = n5Request(n4, acceptedSliceSelectionPayload(option));
  const originalCreate = ctx.researchSliceRepository.createSelectionDecisionWithSlice.bind(ctx.researchSliceRepository);
  let failNextWrite = true;
  ctx.researchSliceRepository.createSelectionDecisionWithSlice = async (creation) => {
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('injected N5 authority write failure');
    }
    return originalCreate(creation);
  };

  await assert.rejects(
    () => ctx.service.invokeNode(input),
    /injected N5 authority write failure/,
  );
  const failedAttemptArtifacts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const failedN5TraceArtifacts = failedAttemptArtifacts.filter((artifact) =>
    artifact.artifact_kind === 'trace'
    && (artifact.payload as { node_id?: string } | null)?.node_id === input.node_id
  );
  assert.equal(failedN5TraceArtifacts.length, 0);

  const result = await ctx.service.invokeNode(input);
  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.replay_provenance, null);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, result.authority_ref?.ref_id);
});

test('v1b workflow harness multi-record authority write failures do not leave replayable admitted traces', async () => {
  {
    const ctx = await seedHarnessV1aBundle();
    const { n1, n2, n3 } = await runReadyN3(ctx);
    const baseInput = n4Request(n1, n2, n3);
    const input = {
      ...baseInput,
      semantic_artifacts: [await recordN4DraftArtifact(ctx, baseInput, n4Draft())],
    };
    const originalCreate = ctx.researchSliceRepository.createPlanRunWithOptionSet.bind(ctx.researchSliceRepository);
    let captured: Parameters<typeof ctx.researchSliceRepository.createPlanRunWithOptionSet>[0] | null = null;
    let failNextWrite = true;
    ctx.researchSliceRepository.createPlanRunWithOptionSet = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N4 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N4 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(await ctx.researchSliceRepository.findPlanRunById(captured.plan_run.plan_research_slice_run_id), null);
      assert.equal(await ctx.researchSliceRepository.findOptionSetById(captured.option_set.research_slice_option_set_id), null);
      assert.equal((await ctx.researchSliceRepository.listOptionsByOptionSetId(captured.option_set.research_slice_option_set_id)).length, 0);
    });
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n5 } = await runReadyN5(ctx);
    const baseInput = await n6Request(ctx, n5);
    const draft = await n6Draft(ctx, baseInput);
    const input = {
      ...baseInput,
      semantic_artifacts: [await recordN6DraftArtifact(ctx, baseInput, draft)],
    };
    const originalCreate = ctx.topicQuestionRepository.createFormationRunWithCandidates.bind(ctx.topicQuestionRepository);
    let captured: Parameters<typeof ctx.topicQuestionRepository.createFormationRunWithCandidates>[0] | null = null;
    let failNextWrite = true;
    ctx.topicQuestionRepository.createFormationRunWithCandidates = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N6 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N6 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(await ctx.topicQuestionRepository.findFormationRunById(captured.form_topic_question_run.form_topic_question_run_id), null);
      assert.equal(await ctx.topicQuestionRepository.findQuestionFrameById(captured.question_frame.question_frame_id), null);
      assert.equal(await ctx.topicQuestionRepository.findCandidateSetById(captured.candidate_set.topic_question_candidate_set_id), null);
      assert.equal(await ctx.topicQuestionRepository.findCandidateById(captured.candidates[0]!.topic_question_candidate_id), null);
    });
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n6 } = await runReadyN6(ctx);
    const input = await n7Request(ctx, n6);
    const originalCreate = ctx.topicQuestionRepository.createSelectionDecisionWithMaterializations.bind(ctx.topicQuestionRepository);
    let captured: Parameters<typeof ctx.topicQuestionRepository.createSelectionDecisionWithMaterializations>[0] | null = null;
    let failNextWrite = true;
    ctx.topicQuestionRepository.createSelectionDecisionWithMaterializations = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N7 authority write failure');
      }
      return originalCreate(creation);
    };

    const recovered = await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N7 authority write failure/, async () => {
      assert.ok(captured);
      const materialization = captured.materializations[0]!;
      assert.equal(await ctx.topicQuestionRepository.findSelectionDecisionById(captured.decision.topic_question_selection_decision_id), null);
      assert.equal(await ctx.topicQuestionRepository.findTopicQuestionById(materialization.topic_question.topic_question_id), null);
      assert.equal(
        await ctx.topicQuestionRepository.findTopicQuestionContractById(
          materialization.topic_question_contract.topic_question_contract_id,
        ),
        null,
      );
      assert.equal(
        await ctx.topicQuestionRepository.findAnswerabilityPlanById(
          materialization.answerability_plan.topic_question_answerability_plan_id,
        ),
        null,
      );
      await assertNoRuntimeContextProjectionForAttempt(ctx, input);
    });
    const currentCheckpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(
      TITLE_CARD_ID,
      'question_contract',
    );
    assert.equal(currentCheckpoint?.target_ref.ref_id, recovered.authority_ref?.ref_id);
    const checkpointHistory = await ctx.researchCheckpointRepository.listCheckpointsByTitleCardId(TITLE_CARD_ID);
    assert.equal(checkpointHistory.filter((checkpoint) => checkpoint.checkpoint_kind === 'question_contract').length, 2);
    assert.equal(checkpointHistory[0]?.status, 'superseded');
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n7 } = await runReadyN7(ctx);
    const baseInput = await n8Request(ctx, n7);
    const draft = n8ValueDraft(baseInput);
    const input = {
      ...baseInput,
      semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, baseInput, draft)],
    };
    const originalCreate = ctx.valueAssessmentRepository.createAssessmentWithMemo.bind(ctx.valueAssessmentRepository);
    let captured: Parameters<typeof ctx.valueAssessmentRepository.createAssessmentWithMemo>[0] | null = null;
    let failNextWrite = true;
    ctx.valueAssessmentRepository.createAssessmentWithMemo = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N8 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N8 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(
        await ctx.valueAssessmentRepository.findAssessmentRunById(
          captured.assess_topic_value_run.assess_topic_value_run_id,
        ),
        null,
      );
      assert.equal(
        await ctx.valueAssessmentRepository.findInputSnapshotById(
          captured.topic_value_input_snapshot.topic_value_input_snapshot_id,
        ),
        null,
      );
      assert.equal(
        await ctx.valueAssessmentRepository.findAssessmentById(
          captured.topic_value_assessment.topic_value_assessment_id,
        ),
        null,
      );
      assert.equal(
        await ctx.valueAssessmentRepository.findReasoningMemoById(
          captured.value_reasoning_memo.value_reasoning_memo_id,
        ),
        null,
      );
    });
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n9 } = await runReadyN9(ctx);
    const input = await n10Request(ctx, n9);
    const originalCreate = ctx.topicPackageRepository.createDraftPackageAuthority.bind(ctx.topicPackageRepository);
    let captured: Parameters<typeof ctx.topicPackageRepository.createDraftPackageAuthority>[0] | null = null;
    let failNextWrite = true;
    ctx.topicPackageRepository.createDraftPackageAuthority = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N10 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N10 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(await ctx.topicPackageRepository.findPackageById(captured.topic_package.topic_package_id), null);
      assert.equal(
        await ctx.topicPackageRepository.findTraceBoundaryCheckById(
          captured.package_trace_boundary_check.package_trace_boundary_check_id,
        ),
        null,
      );
      assert.equal(
        await ctx.topicPackageRepository.findReadinessAssessmentById(
          captured.package_readiness_assessment.package_readiness_assessment_id,
        ),
        null,
      );
      if (captured.v1c_input_bundle) {
        assert.equal(
          await ctx.topicPackageRepository.findV1cInputBundleById(
            captured.v1c_input_bundle.v1b_to_v1c_input_bundle_id,
          ),
          null,
        );
      }
    });
  }
});

test('v1b workflow harness N5 accepts Codex delegated selection only with matching semantic provenance', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option);
  const input = n5Request(n4, accepted, {
    workflow_run_id: 'workflow_run_v1b_n5_codex',
    node_attempt_id: 'node_attempt_v1b_n5_codex',
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.slice_selection_support,
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await generateEarlySemanticSupportArtifact(
        ctx,
        input,
        'n5_slice_selection_review',
        accepted,
      ),
    ],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.error_code, null);
  assert.equal(result.hashes.semantic_artifact_hash?.length, 64);
});

test('v1b workflow harness N5 blocks Codex delegated payload without matching artifact before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option);
  const input = n5Request(n4, accepted);
  const acceptedHash = sha256Text(stableStringify(accepted));
  const result = await ctx.service.invokeNode({
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        authority_input_provider: 'codex_delegated',
        delegation_artifact_hash: acceptedHash,
      },
      frozen_input_hash: null,
    },
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N5 request_more_options writes only decision and loops back without N6 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option, {
    decision: 'request_more_options',
    selected_option_ref: null,
    selected_option_hash: null,
    selection_rationale: 'The option set is too narrow for downstream candidate generation.',
    required_actions: ['regenerate broader research slice options'],
    loopback_target: 'plan_research_slice_run',
    loopback_reason_code: 'insufficient_option_coverage',
  });
  const result = await ctx.service.invokeNode(n5Request(n4, accepted));

  assert.equal(result.gate_status, 'terminal_no_advance');
  assert.equal(result.failure_class, 'terminal_no_advance');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.authority_ref?.ref_type, 'slice_selection_decision');
  assert.equal(result.handoff_ref, null);
  const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'request_more_options');
  assert.equal(decision?.output_research_slice_ref, null);
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'needs_more_options');
  assert.equal(optionSet?.selected_option_id, null);
});

test('v1b workflow harness N5 blocks option hash drift and high-risk selection without delegation', async () => {
  const driftCtx = await seedHarnessV1aBundle();
  const { n4: driftN4 } = await runReadyN4(driftCtx);
  const option = await selectedN4Option(driftCtx, driftN4);
  const driftResult = await driftCtx.service.invokeNode(n5Request(driftN4, acceptedSliceSelectionPayload(option, {
    selected_option_hash: 'f'.repeat(64),
  })));
  assert.equal(driftResult.gate_status, 'blocked');
  assert.equal(driftResult.error_code, 'N5_SELECTED_OPTION_HASH_MISMATCH');
  assert.equal(driftResult.authority_ref, null);
  assert.equal(driftResult.handoff_ref, null);

  const riskCtx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(riskCtx);
  const n4Input = n4Request(n1, n2, n3);
  const highRiskDraft = n4Draft({
    options: [
      {
        ...n4Draft().options[0]!,
        baseline_risk: 'high',
        human_review_triggers: ['high baseline risk'],
      },
    ],
  });
  const highRiskN4 = await riskCtx.service.invokeNode({
    ...n4Input,
    semantic_artifacts: [await recordN4DraftArtifact(riskCtx, n4Input, highRiskDraft)],
  });
  const highRiskOption = await selectedN4Option(riskCtx, highRiskN4);
  const highRiskResult = await riskCtx.service.invokeNode(
    n5Request(highRiskN4, acceptedSliceSelectionPayload(highRiskOption)),
  );
  assert.equal(highRiskResult.gate_status, 'blocked');
  assert.equal(highRiskResult.error_code, 'N5_HIGH_RISK_SELECTION_REQUIRES_ACCEPTED_RISK');
  assert.equal(highRiskResult.authority_ref, null);
  assert.equal(highRiskResult.handoff_ref, null);
});

test('v1b workflow harness N6 consumes exact N5 refs without a caller-synthesized alias', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  assert.equal(n5.authority_ref?.ref_type, 'slice_selection_decision');
  assert.deepEqual(input.frozen_input.source_refs[0], n5.authority_ref);
  assert.deepEqual(input.frozen_input.payload.research_slice_selection_ref, n5.authority_ref);
  assert.equal(input.frozen_input.source_refs.some((sourceRef) => sourceRef.ref_type === 'research_slice_selection_decision'), false);
  const draft = await n6Draft(ctx, input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.error_code, null);
  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.match(result.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

  const candidateSet = await ctx.topicQuestionRepository.findCandidateSetById(result.authority_ref!.ref_id);
  assert.equal(candidateSet?.status, 'ready_for_selection');
  assert.equal(candidateSet?.candidate_count, 1);
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(result.authority_ref!.ref_id);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.candidate_key, 'harness_candidate');
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  const handoffPayload = handoff?.payload as {
    admissible_candidate_hashes?: string[];
    admissible_candidate_refs?: TopicSelectionFunctionalRef[];
    topic_question_candidate_set_hash?: string;
  } | null;
  assert.equal(handoffPayload?.topic_question_candidate_set_hash, result.hashes.authority_hash);
  assert.equal(handoffPayload?.admissible_candidate_refs?.length, handoffPayload?.admissible_candidate_hashes?.length);
  assert.equal(handoffPayload?.admissible_candidate_refs?.[0]?.ref_id, candidates[0]?.topic_question_candidate_id);
  assert.match(handoffPayload?.admissible_candidate_hashes?.[0] ?? '', /^[a-f0-9]{64}$/);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.equal(
    transitionRecord?.created_authority_refs.some((authorityRef) => authorityRef.ref_type === 'topic_question_contract') ?? false,
    false,
  );
});

test('v1b workflow harness N6 canonical refs still require exact N5 lineage', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  const draft = await n6Draft(ctx, input);
  const variants = [
    [{ research_slice_selection_ref: { ...payload.research_slice_selection_ref, ref_id: 'missing_selection' } }, 'N6_FROZEN_AUTHORITY_NOT_FOUND'],
    [{ research_slice_selection_ref: { ...payload.research_slice_selection_ref, title_card_id: 'other_title' } }, 'N6_SELECTION_DECISION_REF_MISMATCH'],
    [{ research_slice_selection_ref: { ...payload.research_slice_selection_ref, version_id: 'other_version' } }, 'N6_SELECTION_DECISION_REF_MISMATCH'],
    [{ research_slice_selection_hash: '0'.repeat(64) }, 'N6_N5_HANDOFF_PAYLOAD_MISMATCH'],
    [{ n5_handoff_hash: '0'.repeat(64) }, 'N6_N5_HANDOFF_HASH_MISMATCH'],
  ] as const;
  for (const [index, [patch, code]] of variants.entries()) {
    const frozenInput = { ...input.frozen_input, payload: { ...payload, ...patch } };
    const invalid = {
      ...input,
      node_attempt_id: `node_attempt_n6_bad_lineage_${index}`,
      frozen_input: { ...frozenInput, frozen_input_hash: frozenInputHash(frozenInput) },
    };
    const result = await ctx.service.invokeNode({
      ...invalid,
      semantic_artifacts: [await recordN6DraftArtifact(ctx, invalid, draft)],
    });
    assert.equal(result.error_code, code);
    assert.equal(result.authority_ref, null);
    assert.equal(result.handoff_ref, null);
  }
  const frozenInput = {
    ...input.frozen_input,
    source_refs: input.frozen_input.source_refs.filter((sourceRef) => sourceRef.ref_type !== 'slice_selection_decision'),
  };
  const missing = { ...input, node_attempt_id: 'node_attempt_n6_missing_selection_ref',
    frozen_input: { ...frozenInput, frozen_input_hash: frozenInputHash(frozenInput) } };
  const result = await ctx.service.invokeNode({
    ...missing, semantic_artifacts: [await recordN6DraftArtifact(ctx, missing, draft)],
  });
  assert.equal(result.error_code, 'FROZEN_INPUT_SOURCE_REF_KIND_MISMATCH');
  assert.equal(result.authority_ref, null);

  for (const ref_type of ['slice_selection_decision', 'research_slice_selection_decision']) {
    for (const [field, value] of [['ref_id', 'different_selection'], ['title_card_id', 'other_title'], ['version_id', 'other_version']] as const) {
      const wrongSourceFrozenInput = {
        ...input.frozen_input,
        source_refs: input.frozen_input.source_refs.map((sourceRef) => sourceRef.ref_type === 'slice_selection_decision'
          ? { ...sourceRef, ref_type, [field]: value } : sourceRef),
      };
      const wrongSourceInput = {
        ...input,
        node_attempt_id: `node_attempt_n6_wrong_source_${ref_type}_${field}`,
        frozen_input: { ...wrongSourceFrozenInput, frozen_input_hash: frozenInputHash(wrongSourceFrozenInput) },
      };
      const wrongSource = await ctx.service.invokeNode({
        ...wrongSourceInput, semantic_artifacts: [await recordN6DraftArtifact(ctx, wrongSourceInput, draft)],
      });
      assert.equal(wrongSource.error_code, 'N6_SELECTION_DECISION_SOURCE_REF_MISMATCH');
      assert.equal(wrongSource.authority_ref, null);
      assert.equal(wrongSource.handoff_ref, null);
    }
  }
});

test('v1b workflow harness N6 successfully stops an evidence-grounded no-viable portfolio without candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const noViableDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'Every visible question framing is defeated by the frozen evidence.',
      confidence: 0.87,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'unidentifiable_or_unfalsifiable_mechanism',
          summary: 'The selected slice cannot support a falsifiable research question.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Reopen when evidence supports a falsifiable mechanism.'],
      candidate_dispositions: [],
    },
  };
  const requestWithDraft = {
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, noViableDraft)],
  };
  const result = await ctx.service.invokeNode(requestWithDraft);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'stop_v1b_complete');
  assert.equal(result.failure_class, null);
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
  const replay = await ctx.service.invokeNode(requestWithDraft);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.route_decision, 'stop_v1b_complete');
  assert.equal(replay.authority_ref, null);
});

test('v1b workflow harness N6 blocks an evidence-free no-viable portfolio before candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const noViableDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'No visible question should advance.',
      confidence: 0.87,
      evidence_refs: [],
      rejection_reasons: [
        {
          reason_code: 'unidentifiable_or_unfalsifiable_mechanism',
          summary: 'The selected slice cannot support a falsifiable research question.',
          evidence_refs: [],
        },
      ],
      reopening_conditions: ['Reopen when evidence supports a falsifiable mechanism.'],
      candidate_dispositions: [],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, noViableDraft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N6_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 routes evidence expansion without manufacturing candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const expansionDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'evidence_expansion_required',
      rationale: 'The visible evidence cannot distinguish viable question framings.',
      confidence: 0.76,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'evidence_coverage_insufficient',
          summary: 'Nearest-work coverage is insufficient for a bounded question decision.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Re-enter N6 only after a refreshed v1a evidence bundle is current.'],
      candidate_dispositions: [],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, expansionDraft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'expand_evidence');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 routes question-scope reframe to slice selection without candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const reframeDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'reframe_required',
      rationale: 'The selected research slice cannot express a falsifiable question.',
      confidence: 0.83,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'research_scope_misaligned',
          summary: 'The selected slice conflicts with the bounded mechanism and evaluation constraints.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Select a different N5 research slice before regenerating questions.'],
      candidate_dispositions: [],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, reframeDraft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'reframe_scope');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 preserves selected parked and dropped candidate dispositions', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const baseCandidate = draft.candidates[0]!;
  const dispositionDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    candidates: [
      baseCandidate,
      {
        ...baseCandidate,
        candidate_key: 'parked_data_question',
        main_question: 'Can a data-dependent question improve replayable v1b topic selection?',
      },
      {
        ...baseCandidate,
        candidate_key: 'dropped_duplicate_question',
        main_question: 'Can a dominated question improve replayable v1b topic selection?',
      },
    ],
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'One question dominates while two alternatives remain explicitly classified.',
      confidence: 0.85,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'harness_candidate',
          disposition: 'selected',
          rationale: 'This question best fits the bounded evidence and execution constraints.',
          evidence_refs: [evidenceRef],
          reopening_conditions: [],
        },
        {
          candidate_key: 'parked_data_question',
          disposition: 'parked',
          rationale: 'This question becomes useful only when the missing dataset is available.',
          evidence_refs: [evidenceRef],
          reopening_conditions: ['Reopen after the required dataset is current.'],
        },
        {
          candidate_key: 'dropped_duplicate_question',
          disposition: 'dropped',
          rationale: 'This question is strictly dominated by the selected framing.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, dispositionDraft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(result.authority_ref!.ref_id);
  assert.equal(candidates.find((candidate) => candidate.candidate_key === 'harness_candidate')?.status, 'recommended');
  assert.equal(candidates.find((candidate) => candidate.candidate_key === 'parked_data_question')?.status, 'parked');
  assert.equal(candidates.find((candidate) => candidate.candidate_key === 'dropped_duplicate_question')?.status, 'rejected');
  const candidateSet = await ctx.topicQuestionRepository.findCandidateSetById(result.authority_ref!.ref_id);
  assert.equal(
    (candidateSet?.admission_readiness.portfolio_disposition as { outcome?: string } | undefined)?.outcome,
    'selected',
  );
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  const handoffPayload = handoff?.payload as {
    admissible_candidate_refs?: TopicSelectionFunctionalRef[];
  } | null;
  assert.deepEqual(
    handoffPayload?.admissible_candidate_refs?.map((candidateRef) => candidateRef.ref_id),
    [candidates.find((candidate) => candidate.candidate_key === 'harness_candidate')?.topic_question_candidate_id],
  );
});

test('v1b workflow harness N6 rejects ambiguous selected and incomplete non-selected portfolios', async () => {
  const selectedCtx = await seedHarnessV1aBundle();
  const { n5: selectedN5 } = await runReadyN5(selectedCtx);
  const selectedInput = await n6Request(selectedCtx, selectedN5);
  const selectedDraft = await n6Draft(selectedCtx, selectedInput);
  const selectedEvidenceRef = selectedDraft.question_frame.evidence_refs[0]!;
  const ambiguousResult = await selectedCtx.service.invokeNode({
    ...selectedInput,
    semantic_artifacts: [await recordN6DraftArtifact(selectedCtx, selectedInput, {
      ...selectedDraft,
      portfolio_disposition: {
        outcome: 'selected',
        rationale: 'The portfolio claims selection but does not classify a selected question.',
        confidence: 0.81,
        evidence_refs: [selectedEvidenceRef],
        rejection_reasons: [],
        reopening_conditions: [],
        candidate_dispositions: [
          {
            candidate_key: 'harness_candidate',
            disposition: 'dropped',
            rationale: 'This deliberately contradicts the set-level selected outcome.',
            evidence_refs: [selectedEvidenceRef],
            drop_reason_code: 'strictly_dominated_by_visible_candidate',
            reopening_conditions: [],
          },
        ],
      },
    })],
  });
  assert.equal(ambiguousResult.gate_status, 'blocked');
  assert.equal(ambiguousResult.error_code, 'N6_SELECTED_PORTFOLIO_INVALID');
  assert.equal(ambiguousResult.authority_ref, null);

  const expansionCtx = await seedHarnessV1aBundle();
  const { n5: expansionN5 } = await runReadyN5(expansionCtx);
  const expansionInput = await n6Request(expansionCtx, expansionN5);
  const expansionDraft = await n6Draft(expansionCtx, expansionInput);
  const expansionEvidenceRef = expansionDraft.question_frame.evidence_refs[0]!;
  const incompleteResult = await expansionCtx.service.invokeNode({
    ...expansionInput,
    semantic_artifacts: [await recordN6DraftArtifact(expansionCtx, expansionInput, {
      ...expansionDraft,
      recommended_candidate_keys: [],
      portfolio_disposition: {
        outcome: 'evidence_expansion_required',
        rationale: 'The current evidence cannot distinguish the existing question candidate.',
        confidence: 0.74,
        evidence_refs: [expansionEvidenceRef],
        rejection_reasons: [
          {
            reason_code: 'evidence_coverage_insufficient',
            summary: 'The visible evidence leaves the question candidate unresolved.',
            evidence_refs: [expansionEvidenceRef],
          },
        ],
        reopening_conditions: ['Refresh evidence before returning to the question portfolio.'],
        candidate_dispositions: [],
      },
    })],
  });
  assert.equal(incompleteResult.gate_status, 'blocked');
  assert.equal(incompleteResult.error_code, 'N6_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(incompleteResult.authority_ref, null);
});

test('v1b workflow harness N6 requires frozen draft artifact and does not live execute execution_spec alone', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    run_mode: 'acceptance',
  });
  const result = await ctx.service.invokeNode(input);

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N6_FROZEN_DRAFT_ARTIFACT_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 blocks malformed or structurally drifting candidate drafts', async () => {
  const duplicateCtx = await seedHarnessV1aBundle();
  const { n5: duplicateN5 } = await runReadyN5(duplicateCtx);
  const duplicateInput = await n6Request(duplicateCtx, duplicateN5);
  const baseDraft = await n6Draft(duplicateCtx, duplicateInput);
  const duplicateResult = await duplicateCtx.service.invokeNode({
    ...duplicateInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(duplicateCtx, duplicateInput, {
        ...baseDraft,
        candidates: [
          baseDraft.candidates[0]!,
          {
            ...baseDraft.candidates[0]!,
            main_question: 'How can a second candidate test duplicate candidate-key blocking in N6?',
          },
        ],
      }),
    ],
  });
  assert.equal(duplicateResult.gate_status, 'blocked');
  assert.equal(duplicateResult.error_code, 'N6_DUPLICATE_TOPIC_QUESTION_CANDIDATE_KEY');
  assert.equal(duplicateResult.authority_ref, null);

  const driftCtx = await seedHarnessV1aBundle();
  const { n5: driftN5 } = await runReadyN5(driftCtx);
  const driftInput = await n6Request(driftCtx, driftN5);
  const driftDraft = await n6Draft(driftCtx, driftInput);
  const driftResult = await driftCtx.service.invokeNode({
    ...driftInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(driftCtx, driftInput, {
        ...driftDraft,
        candidates: [
          {
            ...driftDraft.candidates[0]!,
            traceability_check: {
              ...driftDraft.candidates[0]!.traceability_check,
              support_evidence_refs: [ref('evidence_unit', 'unknown_evidence_unit', TITLE_CARD_ID)],
            },
          },
        ],
      }),
    ],
  });
  assert.equal(driftResult.gate_status, 'blocked');
  assert.equal(driftResult.error_code, 'N6_UNKNOWN_EVIDENCE_REF');
  assert.equal(driftResult.authority_ref, null);

  const hashCtx = await seedHarnessV1aBundle();
  const { n5: hashN5 } = await runReadyN5(hashCtx);
  const hashInput = await n6Request(hashCtx, hashN5);
  const hashDraft = await n6Draft(hashCtx, hashInput);
  const hashArtifact = await recordN6DraftArtifact(hashCtx, hashInput, hashDraft);
  const hashResult = await hashCtx.service.invokeNode({
    ...hashInput,
    semantic_artifacts: [
      {
        ...hashArtifact,
        structured_output_hash: 'f'.repeat(64),
      },
    ],
  });
  assert.equal(hashResult.gate_status, 'blocked');
  assert.equal(hashResult.error_code, 'N6_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH');
  assert.equal(hashResult.authority_ref, null);
});

test('v1b workflow harness N6 emits loopback with no authority when all candidates fail semantic gate', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, input, {
        ...draft,
        candidates: [
          {
            ...draft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
    ],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.failure_class, 'semantic_non_pass');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  await assertTraceLoopbackTargetCode(ctx, result, 'n6_regenerate_candidates');
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 applies loopback triage for debate escalation and upstream rollback', async () => {
  const debateCtx = await seedHarnessV1aBundle();
  const { n5: debateN5 } = await runReadyN5(debateCtx);
  const debateInput = await n6Request(debateCtx, debateN5, {
    workflow_run_id: 'workflow_run_v1b_n6_debate_triage',
    node_attempt_id: 'node_attempt_v1b_n6_debate_triage',
  });
  const debateDraft = await n6Draft(debateCtx, debateInput);
  const debateResult = await debateCtx.service.invokeNode({
    ...debateInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(debateCtx, debateInput, {
        ...debateDraft,
        candidates: [
          {
            ...debateDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      await recordN6LoopbackTriageArtifact(debateCtx, debateInput, n6LoopbackTriagePayload(debateInput, {
        loopback_target_code: 'n6_debate_escalation',
        debate_escalation: {
          debate_level: 'mixed_cost_control',
          recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
          sticky: true,
          rationale: 'Escalate the next candidate generation pass to debate-shaped review before retrying N6.',
        },
        upstream_rollback: null,
        rationale: 'Candidate failures look like prompt contention rather than a bad selected slice.',
      })),
    ],
  });
  assert.equal(debateResult.gate_status, 'blocked');
  assert.equal(debateResult.route_decision, 'loopback');
  assert.equal(debateResult.authority_ref, null);
  assert.equal(debateResult.handoff_ref, null);
  assert.ok(debateResult.warnings.some((warning) => warning.code === 'N6_DEBATE_ESCALATION_RECOMMENDED'));
  // D-30: no provisional tripwire on any escalation (retired; thresholds are advisory heuristics).
  assert.equal(debateResult.warnings.some((warning) => warning.code === 'N6_DEBATE_THRESHOLDS_PROVISIONAL'), false);
  const debateTrace = await assertTraceLoopbackTargetCode(
    debateCtx,
    debateResult,
    'n6_debate_escalation',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  assert.equal((debateTrace.payload.debate_escalation as { sticky?: boolean } | null)?.sticky, true);
  assert.equal(debateTrace.payload.upstream_rollback, null);

  const rollbackCtx = await seedHarnessV1aBundle();
  const { n5: rollbackN5 } = await runReadyN5(rollbackCtx);
  const rollbackInput = await n6Request(rollbackCtx, rollbackN5, {
    workflow_run_id: 'workflow_run_v1b_n6_upstream_rollback',
    node_attempt_id: 'node_attempt_v1b_n6_upstream_rollback',
  });
  const rollbackDraft = await n6Draft(rollbackCtx, rollbackInput);
  const rollbackResult = await rollbackCtx.service.invokeNode({
    ...rollbackInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(rollbackCtx, rollbackInput, {
        ...rollbackDraft,
        candidates: [
          {
            ...rollbackDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      await recordN6LoopbackTriageArtifact(rollbackCtx, rollbackInput, n6LoopbackTriagePayload(rollbackInput, {
        loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
        failure_scope: 'slice_level',
        debate_escalation: null,
        upstream_rollback: {
          target_node_id: 'topic-selection.v1b.select-research-slice.v1',
          repair_action: 'select_different_slice',
          rationale: 'The selected ResearchSlice is too broad to yield an admissible TopicQuestion.',
        },
        rationale: 'The failure is slice-level; retrying N6 against the same slice would repeat the same failure.',
      })),
    ],
  });
  assert.equal(rollbackResult.gate_status, 'blocked');
  assert.equal(rollbackResult.route_decision, 'loopback');
  assert.equal(rollbackResult.authority_ref, null);
  assert.equal(rollbackResult.handoff_ref, null);
  const rollbackTrace = await assertTraceLoopbackTargetCode(
    rollbackCtx,
    rollbackResult,
    'n6_loopback_to_n5_select_different_slice',
    'topic-selection.v1b.select-research-slice.v1',
  );
  assert.equal(
    (rollbackTrace.payload.upstream_rollback as { repair_action?: string } | null)?.repair_action,
    'select_different_slice',
  );
  assert.equal(rollbackTrace.payload.debate_escalation, null);
  assert.deepEqual(await rollbackCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 blocks inconsistent loopback triage before routing', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage',
  });
  const result = await invokeN6WithFailedDraftAndTriage(ctx, input, n6LoopbackTriagePayload(input, {
    loopback_target_code: 'n6_debate_escalation',
    debate_escalation: null,
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const scopeCtx = await seedHarnessV1aBundle();
  const { n5: scopeN5 } = await runReadyN5(scopeCtx);
  const scopeInput = await n6Request(scopeCtx, scopeN5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage_scope',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage_scope',
  });
  const scopeResult = await invokeN6WithFailedDraftAndTriage(scopeCtx, scopeInput, n6LoopbackTriagePayload(scopeInput, {
    loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
    failure_scope: 'candidate_level',
    debate_escalation: null,
    upstream_rollback: {
      target_node_id: 'topic-selection.v1b.select-research-slice.v1',
      repair_action: 'select_different_slice',
      rationale: 'The selected ResearchSlice is too broad to yield an admissible TopicQuestion.',
    },
  }));
  assert.equal(scopeResult.gate_status, 'blocked');
  assert.equal(scopeResult.route_decision, 'blocked');
  assert.equal(scopeResult.error_code, 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH');
  assert.equal(scopeResult.authority_ref, null);
  assert.equal(scopeResult.handoff_ref, null);
  assert.deepEqual(await scopeCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const lineageCtx = await seedHarnessV1aBundle();
  const { n5: lineageN5 } = await runReadyN5(lineageCtx);
  const lineageInput = await n6Request(lineageCtx, lineageN5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage_refs',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage_refs',
  });
  const lineageResult = await invokeN6WithFailedDraftAndTriage(
    lineageCtx,
    lineageInput,
    n6LoopbackTriagePayload(lineageInput, {
      affected_refs: [ref('research_slice', 'research_slice_outside_frozen_n6_lineage', TITLE_CARD_ID)],
    }),
  );
  assert.equal(lineageResult.gate_status, 'blocked');
  assert.equal(lineageResult.route_decision, 'blocked');
  assert.equal(lineageResult.error_code, 'N6_LOOPBACK_TRIAGE_AFFECTED_REFS_MISMATCH');
  assert.equal(lineageResult.authority_ref, null);
  assert.equal(lineageResult.handoff_ref, null);
  assert.deepEqual(await lineageCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const artifactCtx = await seedHarnessV1aBundle();
  const { n5: artifactN5 } = await runReadyN5(artifactCtx);
  const artifactInput = await n6Request(artifactCtx, artifactN5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage_artifact',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage_artifact',
  });
  const artifactDraft = await n6Draft(artifactCtx, artifactInput);
  const triageArtifact = await recordN6LoopbackTriageArtifact(
    artifactCtx,
    artifactInput,
    n6LoopbackTriagePayload(artifactInput),
  );
  const wrongSupportArtifact = await artifactCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: artifactInput.workflow_run_id,
    payload: { wrong_support: true },
    created_by: 'system',
  });
  const artifactResult = await artifactCtx.service.invokeNode({
    ...artifactInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(artifactCtx, artifactInput, {
        ...artifactDraft,
        candidates: [
          {
            ...artifactDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      {
        ...triageArtifact,
        support_artifact_ref: ref('artifact_ref', wrongSupportArtifact.artifact_ref_id, TITLE_CARD_ID),
      },
    ],
  });
  assert.equal(artifactResult.gate_status, 'blocked');
  assert.equal(artifactResult.route_decision, 'blocked');
  assert.equal(artifactResult.error_code, 'N6_LOOPBACK_TRIAGE_ARTIFACT_HASH_MISMATCH');
  assert.equal(artifactResult.authority_ref, null);
  assert.equal(artifactResult.handoff_ref, null);
  assert.deepEqual(await artifactCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 admits runtime-verified loopback triage in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_triage',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_triage',
  });
  const failedDraft = await n6Draft(ctx, input);
  failedDraft.candidates[0] = {
    ...failedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const draftArtifact = await generateN6RegularDebateDraftArtifact(ctx, input, failedDraft);
  const draftHash = sha256Text(stableStringify(failedDraft));
  const triageArtifact = await generateN6RuntimeLoopbackTriageArtifact(
    ctx,
    input,
    draftArtifact,
    draftHash,
    n6LoopbackTriagePayload(input, {
      loopback_target_code: 'n6_debate_escalation',
      debate_escalation: {
        debate_level: 'mixed_cost_control',
        recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
        sticky: true,
        rationale: 'Escalate the next candidate generation pass to runtime-supported debate before retrying N6.',
      },
      upstream_rollback: null,
      rationale: 'Runtime triage classifies the failed draft as candidate-level contention rather than a bad slice.',
    }),
  );
  assert.equal(triageArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(triageArtifact.prompt_variant_key, 'n6_loopback_triage');
  assert.equal(triageArtifact.source_hashes.failed_draft_hash, draftHash);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [draftArtifact, triageArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.ok(result.warnings.some((warning) => warning.code === 'N6_DEBATE_ESCALATION_RECOMMENDED'));
  // D-30 (2026-07-07): the former W-07 f6 provisional product tripwire is retired — thresholds are
  // advisory routing heuristics, so a product escalation carries no provisional warning any more.
  assert.equal(result.warnings.some((warning) => warning.code === 'N6_DEBATE_THRESHOLDS_PROVISIONAL'), false);
  await assertTraceLoopbackTargetCode(
    ctx,
    result,
    'n6_debate_escalation',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 runtime loopback triage drift and fixture product misuse block', async () => {
  const driftCtx = await seedHarnessV1aBundle();
  const { n5: driftN5 } = await runReadyN5(driftCtx);
  const driftInput = await n6Request(driftCtx, driftN5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_triage_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_triage_drift',
  });
  const driftFailedDraft = await n6Draft(driftCtx, driftInput);
  driftFailedDraft.candidates[0] = {
    ...driftFailedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const driftDraftArtifact = await generateN6RegularDebateDraftArtifact(driftCtx, driftInput, driftFailedDraft);
  const driftDraftHash = sha256Text(stableStringify(driftFailedDraft));
  const driftTriageArtifact = await generateN6RuntimeLoopbackTriageArtifact(
    driftCtx,
    driftInput,
    driftDraftArtifact,
    driftDraftHash,
    n6LoopbackTriagePayload(driftInput),
  );
  const driftResult = await driftCtx.service.invokeNode({
    ...driftInput,
    semantic_artifacts: [
      driftDraftArtifact,
      {
        ...driftTriageArtifact,
        source_hashes: {
          ...driftTriageArtifact.source_hashes,
          failed_draft_hash: '9'.repeat(64),
        },
      },
    ],
  });
  assert.equal(driftResult.gate_status, 'blocked');
  assert.equal(driftResult.route_decision, 'blocked');
  assert.equal(driftResult.error_code, 'N6_LOOPBACK_TRIAGE_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(driftResult.authority_ref, null);
  assert.equal(driftResult.handoff_ref, null);

  const fixtureCtx = await seedHarnessV1aBundle();
  const { n5: fixtureN5 } = await runReadyN5(fixtureCtx);
  const fixtureInput = await n6Request(fixtureCtx, fixtureN5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_triage_fixture_misuse',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_triage_fixture_misuse',
  });
  const fixtureFailedDraft = await n6Draft(fixtureCtx, fixtureInput);
  fixtureFailedDraft.candidates[0] = {
    ...fixtureFailedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const fixtureDraftArtifact = await generateN6RegularDebateDraftArtifact(fixtureCtx, fixtureInput, fixtureFailedDraft);
  const fixtureTriageArtifact = await recordN6LoopbackTriageArtifact(
    fixtureCtx,
    fixtureInput,
    n6LoopbackTriagePayload(fixtureInput),
  );
  const fixtureResult = await fixtureCtx.service.invokeNode({
    ...fixtureInput,
    semantic_artifacts: [fixtureDraftArtifact, fixtureTriageArtifact],
  });
  assert.equal(fixtureResult.gate_status, 'blocked');
  assert.equal(fixtureResult.route_decision, 'blocked');
  assert.equal(fixtureResult.error_code, 'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(fixtureResult.authority_ref, null);
  assert.equal(fixtureResult.handoff_ref, null);
});

test('v1b workflow harness N6 preserves legacy alias requests and detects replay drift', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_replay',
    node_attempt_id: 'node_attempt_v1b_n6_replay',
  });
  // Previously callers prepended this synthetic alias to N5's unchanged required refs.
  input.frozen_input.source_refs.unshift({
    ...n5.authority_ref!, ref_type: 'research_slice_selection_decision',
  });
  input.frozen_input.frozen_input_hash = frozenInputHash(input.frozen_input);
  const draft = await n6Draft(ctx, input, {
    human_review_triggers: ['review candidate risk note'],
  });
  draft.candidates[0] = {
    ...draft.candidates[0]!,
    risk_notes: ['Evidence coverage should be checked before value assessment.'],
  };
  const semanticArtifactRef = await recordN6DraftArtifact(ctx, input, draft);
  const first = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifactRef],
  });
  assert.equal(first.gate_status, 'admitted_with_warnings');
  assert.ok(first.warnings.some((warning) => warning.code === 'CANDIDATE_RISK_NOTE_PRESENT'));

  const replay = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifactRef],
  });
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);

  assert.deepEqual(replay.hashes, first.hashes);
  const canonicalFrozenInput = { ...input.frozen_input,
    source_refs: input.frozen_input.source_refs.filter((sourceRef) => sourceRef.ref_type !== 'research_slice_selection_decision') };
  const changedRefs = await ctx.service.invokeNode({
    ...input,
    frozen_input: { ...canonicalFrozenInput, frozen_input_hash: frozenInputHash(canonicalFrozenInput) },
    semantic_artifacts: [semanticArtifactRef],
  });
  assert.equal(changedRefs.gate_status, 'blocked');
  assert.match(changedRefs.error_code ?? '', /^REPLAY_/);
  assert.equal(changedRefs.authority_ref, null);

  const driftDraft = await n6Draft(ctx, input, {
    generation_notes: ['Changed semantic artifact should drift replay identity.'],
  });
  const drift = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, driftDraft)],
  });
  assert.equal(drift.gate_status, 'blocked');
  assert.equal(drift.error_code, 'REPLAY_SEMANTIC_ARTIFACT_HASH_MISMATCH');
});

test('FIND-018 product N6 rejects an unreviewed runtime draft before candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_verified_draft',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_verified_draft',
  });
  const draft = await n6Draft(ctx, input);
  const runtime = new TopicSelectionV1bN6DraftRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    generation_mode: 'initial_from_n5',
    execution_mode: 'codex_assisted',
    run_mode: 'product',
    codex_response: {
      output: draft,
      operator_label: 'test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected runtime N6 draft generation to succeed.');
  }
  assert.equal(generated.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(generated.semantic_artifact.prompt_variant_key, 'n6_question_candidate_draft.initial_from_n5');
  assert.equal(
    generated.semantic_artifact.context_policy_profile_id,
    'topic-selection.v1b.n6.question-candidate-draft.context-runtime@v1',
  );
  assert.notEqual(generated.semantic_artifact.prompt_packet_hash, 'c'.repeat(64));
  assert.ok(generated.semantic_artifact.runtime_audit_ref);
  assert.ok(generated.semantic_artifact.runtime_audit_hash);
  assert.equal(generated.semantic_artifact.source_hashes.n5_handoff_hash, input.frozen_input.payload.n5_handoff_hash);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [generated.semantic_artifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N6_REGULAR_DEBATE_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  for (const runMode of [undefined, null]) {
    const variant = { ...input, node_attempt_id: `${input.node_attempt_id}_${String(runMode)}`, run_mode: runMode };
    const unreviewed = await runtime.generateDraftArtifact({
      request: variant, generation_mode: 'initial_from_n5', execution_mode: 'codex_assisted', run_mode: 'product',
      codex_response: { output: draft, operator_label: 'test-runtime' },
    });
    assert.equal(unreviewed.status, 'succeeded');
    if (unreviewed.status !== 'succeeded') throw new Error('Expected the low-level draft primitive to remain available.');
    const blocked = await ctx.service.invokeNode({ ...variant, semantic_artifacts: [unreviewed.semantic_artifact] });
    assert.equal(blocked.error_code, 'N6_REGULAR_DEBATE_REQUIRED');
    assert.equal(blocked.authority_ref, null);
    assert.equal(blocked.handoff_ref, null);
  }

});

// ---- T-127 W-07 loop closure (the SINGLE spanning end-to-end test): the v1b N6 divergent debate is
// asserted to close back onto the harness N6 gate "by construction" (the gate bridge funnels the arbiter's
// synthesized draft through the SAME single-agent draft path the harness admits). This proves it as one
// run: a mocked_llm fan-out debate (mirroring the runtime f5 e2e) shares THIS harness's control plane, so
// the bridged gate_draft.semantic_artifact resolves through resolveN6DraftPayload and ADMITS — identical to
// the non-debate single-agent admit path above. ----
function mockedDebateRole(
  slot: TopicSelectionV1bN6DivergentDebateRoleSlotId,
  idx: number,
  body: Record<string, unknown>,
): V1bN6DebateInputs {
  return {
    codex_response: null,
    mocked_output: {
      fixture_id: `n6_debate_${slot}_${idx}`,
      output: { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot, ...body },
    } as never,
    instance_index: idx,
  };
}

test('v1b workflow harness N6 admits a divergent-debate-bridged gate draft (T-127 W-07 loop closure)', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'test',
    workflow_run_id: 'workflow_run_v1b_n6_divergent_debate_loop_closure',
    node_attempt_id: 'node_attempt_v1b_n6_divergent_debate_loop_closure',
  });
  // The arbiter synthesizes the harness-aligned candidate-set draft (same fixture the non-debate gate admits),
  // so its bridged gate draft passes the N6 product-acceptance content checks against the seeded slice.
  const draft = await n6Draft(ctx, input);

  // The debate shares THIS harness's control plane so the gate bridge's recorded ArtifactRefs resolve in N6.
  const debate = new TopicSelectionV1bN6DivergentDebateRuntimeService(ctx.controlPlane);
  const result = await debate.runDivergentDebate({
    request: input,
    generation_mode: 'initial_from_n5',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    role_outputs: {
      n6_debate_explorer: [
        mockedDebateRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedDebateRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedDebateRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedDebateRole('n6_debate_arbiter', 0, { synthesized_candidate_set: draft }),
      ],
    },
    created_by: 'system',
  });

  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') {
    throw new Error('Expected the divergent debate run to complete.');
  }
  assert.equal(result.gate_draft.status, 'succeeded');
  if (result.gate_draft.status !== 'succeeded') {
    throw new Error('Expected the bridged single-agent gate draft to succeed.');
  }
  // The bridge funnels the arbiter's synthesized set through byte-for-byte (not a substitute), and carries
  // single-agent runtime identity — so what the harness admits below is provably THIS debate's draft.
  assert.deepEqual(result.gate_draft.structured_output, draft);
  assert.equal(result.gate_draft.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(result.gate_draft.semantic_artifact.execution_mode, 'mocked_llm');

  // Loop closure: the debate-produced gate draft, fed back through the harness N6 node, earns the same admit
  // verdict (gate_status / route_decision / authority ref_type) the non-debate single-agent draft earns above.
  const n6 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [result.gate_draft.semantic_artifact],
  });
  assert.equal(n6.gate_status, 'admitted');
  assert.equal(n6.route_decision, 'invoke_next');
  assert.equal(n6.authority_ref?.ref_type, 'topic_question_candidate_set');
});

test('v1b workflow harness N6 runtime draft exact replay does not rewrite authority artifacts', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_replay',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_replay',
  });
  const draft = await n6Draft(ctx, input);
  const semanticArtifact = await generateN6RuntimeDraftArtifact(ctx, input, draft);
  const first = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  const artifactRefsBeforeReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const replay = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  const artifactRefsAfterReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);

  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);
  assert.equal(replay.handoff_ref?.ref_id, first.handoff_ref?.ref_id);
  assert.equal(artifactRefsAfterReplay.length, artifactRefsBeforeReplay.length);
});

test('v1b workflow harness N6 runtime draft drift blocks before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_source_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_source_drift',
  });
  const draft = await n6Draft(ctx, input);
  const semanticArtifact = await generateN6RuntimeDraftArtifact(ctx, input, draft);
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [{
      ...semanticArtifact,
      source_hashes: {
        ...semanticArtifact.source_hashes,
        n5_handoff_hash: '9'.repeat(64),
      },
    }],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N6 runtime draft audit drift and legacy artifacts block before authority write', async () => {
  const auditCtx = await seedHarnessV1aBundle();
  const { n5: auditN5 } = await runReadyN5(auditCtx);
  const auditInput = await n6Request(auditCtx, auditN5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_audit_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_audit_drift',
  });
  const auditDraft = await n6Draft(auditCtx, auditInput);
  const runtimeArtifact = await generateN6RuntimeDraftArtifact(auditCtx, auditInput, auditDraft);
  const auditBlocked = await auditCtx.service.invokeNode({
    ...auditInput,
    semantic_artifacts: [{
      ...runtimeArtifact,
      runtime_audit_hash: '6'.repeat(64),
    }],
  });

  assert.equal(auditBlocked.gate_status, 'blocked');
  assert.equal(auditBlocked.error_code, 'N6_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT');
  assert.equal(auditBlocked.authority_ref, null);
  assert.equal(auditBlocked.handoff_ref, null);

  const legacyCtx = await seedHarnessV1aBundle();
  const { n5: legacyN5 } = await runReadyN5(legacyCtx);
  const legacyInput = await n6Request(legacyCtx, legacyN5, {
    workflow_run_id: 'workflow_run_v1b_n6_legacy_draft',
    node_attempt_id: 'node_attempt_v1b_n6_legacy_draft',
  });
  const legacyDraft = await n6Draft(legacyCtx, legacyInput);
  const legacyArtifact = await recordN6DraftArtifact(legacyCtx, legacyInput, legacyDraft);
  const legacyBlocked = await legacyCtx.service.invokeNode({
    ...legacyInput,
    semantic_artifacts: [{
      ...legacyArtifact,
      runtime_provenance_class: 'legacy_unverified',
    }],
  });

  assert.equal(legacyBlocked.gate_status, 'blocked');
  assert.equal(legacyBlocked.error_code, 'N6_DRAFT_ARTIFACT_LEGACY_UNVERIFIED');
  assert.equal(legacyBlocked.authority_ref, null);
  assert.equal(legacyBlocked.handoff_ref, null);
});

test('v1b workflow harness N6 runtime draft cannot bypass deterministic candidate gates', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_no_authority_bypass',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_no_authority_bypass',
  });
  const draft = await n6Draft(ctx, input);
  const invalidDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    candidates: [{
      ...draft.candidates[0]!,
      traceability_check: {
        ...draft.candidates[0]!.traceability_check,
        support_evidence_refs: [ref('research_slice_evidence_ref', 'unknown_runtime_evidence', TITLE_CARD_ID)],
      },
    }],
  };
  const semanticArtifact = await generateN6RegularDebateDraftArtifact(ctx, input, invalidDraft);
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N6_UNKNOWN_EVIDENCE_REF');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N6 partial semantic failure admits only passing candidates without upstream rollback', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4, n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_partial_semantic_failure',
    node_attempt_id: 'node_attempt_v1b_n6_partial_semantic_failure',
  });
  const draft = await n6Draft(ctx, input);
  const failedCandidate = {
    ...draft.candidates[0]!,
    answerability_verdict: 'not_answerable' as const,
    candidate_key: 'blocked_broad_candidate',
    main_question: 'How can AI improve research?',
  };
  const admittedCandidate = {
    ...draft.candidates[0]!,
    candidate_key: 'admitted_specific_candidate',
    expected_claim: 'Partial semantic gating preserves only answerable v1b topic-question candidates.',
    main_question: 'How can partial N6 semantic gating preserve only an answerable v1b topic-question candidate?',
  };

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, input, {
        ...draft,
        candidates: [failedCandidate, admittedCandidate],
        recommended_candidate_keys: ['blocked_broad_candidate', 'admitted_specific_candidate'],
      }),
    ],
  });

  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.ok(result.warnings.some((warning) => warning.code === 'BLOCKED_CANDIDATES_PRESENT'));
  assert.equal(result.warnings.some((warning) => warning.code === 'debate_escalation_recommended'), false);

  const candidateSet = await ctx.topicQuestionRepository.findCandidateSetById(result.authority_ref!.ref_id);
  assert.equal(candidateSet?.candidate_count, 1);
  assert.equal(candidateSet?.recommended_candidate_ids.length, 1);
  const readiness = candidateSet?.admission_readiness as {
    blocked_candidate_context?: Array<{ candidate_key?: string; dominant_reason?: string }>;
  } | undefined;
  assert.equal(readiness?.blocked_candidate_context?.length, 1);
  assert.equal(readiness?.blocked_candidate_context?.[0]?.candidate_key, 'blocked_broad_candidate');
  assert.equal(readiness?.blocked_candidate_context?.[0]?.dominant_reason, 'answerability_weak');

  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(result.authority_ref!.ref_id);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.candidate_key, 'admitted_specific_candidate');

  const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref!.ref_id);
  assert.equal(trace?.payload.loopback_target_code, undefined);
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'selected');
  const selectionDecision = await ctx.researchSliceRepository.findSelectionDecisionById(n5.authority_ref!.ref_id);
  assert.equal(selectionDecision?.decision, 'select');
  assert.equal(selectionDecision?.output_research_slice_ref?.ref_type, 'research_slice');
});

test('v1b workflow harness N6 rejects debate execution config before persistence', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    execution_spec: {
      debate_config: {
        profile_id: 'topic-selection.question-candidates.debate.unimplemented',
      },
      execution_mode: 'codex_assisted',
      model_option_id: null,
    } as unknown as TopicSelectionV1bWorkflowHarnessRunRequest['execution_spec'],
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    run_mode: 'acceptance',
    workflow_run_id: 'workflow_run_v1b_n6_reject_debate_config',
    node_attempt_id: 'node_attempt_v1b_n6_reject_debate_config',
  });

  await assert.rejects(
    () => ctx.service.invokeNode(input),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id), []);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N7 materializes an active TopicQuestionContract from N6 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6);
  const result = await ctx.service.invokeNode(input);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_question_contract');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');

  const contract = await ctx.topicQuestionRepository.findTopicQuestionContractById(result.authority_ref!.ref_id);
  assert.equal(contract?.status, 'active');
  const question = contract ? await ctx.topicQuestionRepository.findTopicQuestionById(contract.topic_question_id) : null;
  const plan = contract
    ? await ctx.topicQuestionRepository.findAnswerabilityPlanByContractId(contract.topic_question_contract_id)
    : null;
  const decision = contract
    ? await ctx.topicQuestionRepository.findSelectionDecisionById(contract.selection_decision_id)
    : null;
  assert.equal(question?.active_question_contract_id, result.authority_ref!.ref_id);
  assert.equal(plan?.answerability_verdict, 'answerable');
  assert.equal(decision?.decision, 'admit');
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(TITLE_CARD_ID, 'question_contract');
  assert.equal(checkpoint?.status, 'pending');
  assert.equal(checkpoint?.target_ref.ref_id, contract?.topic_question_contract_id);
  const packet = await ctx.researchCheckpointService.getPacket(checkpoint!.research_checkpoint_id);
  assert.equal(packet.packet_payload.policy_result, 'eligible_for_human_review');
  assert.equal(packet.allowed_actions.includes('advance'), true);
  const viewService = new TopicSelectionResearchCheckpointService(ctx.researchCheckpointRepository, ctx.controlPlane, {
    stageProjectionSources: {
      questionRepository: ctx.topicQuestionRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository,
      topicPackageRepository: ctx.topicPackageRepository,
    },
  });
  const human = await viewService.getStageView(TITLE_CARD_ID, 'research_question', 'human');
  assert.ok(human.markdown.includes(contract!.main_question));
  assert.deepEqual(await viewService.getPacket(checkpoint!.research_checkpoint_id), packet);

  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  const handoffPayload = handoff?.payload as {
    answerability_plan_ref?: TopicSelectionFunctionalRef;
    n8_debate_admission_ref?: TopicSelectionFunctionalRef;
    topic_question_contract_ref?: TopicSelectionFunctionalRef;
    trial_ledger_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(handoff?.envelope.handoff_kind, 'N7ToN8Handoff');
  assert.equal(handoffPayload?.topic_question_contract_ref?.ref_id, result.authority_ref!.ref_id);
  assert.equal(handoffPayload?.answerability_plan_ref?.ref_id, plan?.topic_question_answerability_plan_id);
  assert.equal(handoffPayload?.trial_ledger_ref?.ref_id, decision?.topic_question_selection_decision_id);
  assert.equal(handoffPayload?.n8_debate_admission_ref?.ref_type, 'artifact_ref');

  const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref!.ref_id);
  const projectionRef = trace?.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef!.ref_id);
  const projection = projectionArtifact?.payload as {
    n7_handoff_hash?: string;
    n7_handoff_ref?: TopicSelectionFunctionalRef;
    non_authority?: boolean;
    projection_kind?: string;
    topic_question_contract_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(projectionArtifact?.artifact_kind, 'diagnostic');
  assert.equal(projection?.projection_kind, 'v1b_n7_to_n8_topic_question_contract_context');
  assert.equal(projection?.non_authority, true);
  assert.equal(projection?.n7_handoff_ref?.ref_id, result.handoff_ref!.ref_id);
  assert.equal(projection?.n7_handoff_hash, result.hashes.handoff_hash);
  assert.equal(projection?.topic_question_contract_ref?.ref_id, result.authority_ref!.ref_id);

  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.equal(
    transitionRecord?.created_authority_refs.some((authorityRef) => authorityRef.ref_type === 'topic_value_assessment') ?? false,
    false,
  );
});

test('v1b workflow harness N8 cannot begin before strict-human question confirmation', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {}, { confirmQuestionCheckpoint: false });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, n8ValueDraft(input))],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N8_QUESTION_CHECKPOINT_NOT_ADVANCED');
  assert.equal(result.authority_ref, null);
  assert.deepEqual(await ctx.valueAssessmentRepository.listAssessmentsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b N7 question checkpoint requires explicit confound or alternative-explanation material', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_no_confounds',
    node_attempt_id: 'node_attempt_v1b_n6_no_confounds',
  });
  const draft = await n6Draft(ctx, n6Input);
  const candidate = draft.candidates[0]!;
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, n6Input, {
      ...draft,
      candidates: [{
        ...candidate,
        answerability_plan: {
          ...candidate.answerability_plan,
          dependency_risks: [],
        },
        objections: [],
        risk_notes: [],
      }],
    })],
  });
  assert.notEqual(n6.gate_status, 'blocked');
  const n7 = await ctx.service.invokeNode(await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_no_confounds',
    node_attempt_id: 'node_attempt_v1b_n7_no_confounds',
  }));
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(TITLE_CARD_ID, 'question_contract');
  assert.ok(checkpoint);
  const packet = await ctx.researchCheckpointService.getPacket(checkpoint.research_checkpoint_id);
  assert.equal(packet.allowed_actions.includes('advance'), false);
  assert.deepEqual(packet.packet_payload.policy_issue_codes, ['MATERIAL_CONFOUND_REVIEW_REQUIRED']);
  assert.equal(n7.authority_ref?.ref_type, 'topic_question_contract');
});

test('v1b workflow harness N7 accepts Codex grouping support but blocks unknown grouping refs', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can a second WorkflowHarness candidate improve N7 grouping robustness?',
    expected_claim: 'A second candidate exercises deterministic grouping selection.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const input = await n7Request(ctx, n6);
  const grouping = n7GroupingPayload(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, input, {
        allowed_effect: 'support_only',
        output_contract: 'CandidateGroupingSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
        slot_id: 'n7_candidate_grouping',
      }, grouping as unknown as Record<string, unknown>),
      await recordN7SupportArtifact(ctx, input, {
        allowed_effect: 'support_only',
        output_contract: 'N8DebateAdmissionReviewSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
        slot_id: 'n7_n8_debate_admission_review',
      }, n7DebateAdmissionPayload({
        debate_level: 'provider_diverse_deep_debate',
        rationale: 'Escalate valuable second candidate to deep debate.',
      }) as unknown as Record<string, unknown>),
    ],
  });
  const contract = await ctx.topicQuestionRepository.findTopicQuestionContractById(result.authority_ref!.ref_id);
  assert.equal(contract?.source_candidate_id, grouping.selected_candidate_ref.ref_id);
  assert.ok(result.warnings.some((warning) => warning.code === 'candidate_grouping_preserved'));
  assert.ok(result.warnings.some((warning) => warning.code === 'n8_debate_level_selected'));

  const badCtx = await seedHarnessV1aBundle();
  const { n6: badN6 } = await runReadyN6(badCtx);
  const badInput = await n7Request(badCtx, badN6);
  const badGrouping: TopicSelectionV1bCandidateGroupingSupportPayload = {
    ...n7GroupingPayload(badInput),
    selected_candidate_ref: ref('topic_question_candidate', 'unknown_candidate', TITLE_CARD_ID),
    priority_order: [ref('topic_question_candidate', 'unknown_candidate', TITLE_CARD_ID)],
  };
  const blocked = await badCtx.service.invokeNode({
    ...badInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(badCtx, badInput, {
        allowed_effect: 'support_only',
        output_contract: 'CandidateGroupingSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
        slot_id: 'n7_candidate_grouping',
      }, badGrouping as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_GROUPING_UNKNOWN_CANDIDATE_REF');
  assert.equal(blocked.authority_ref, null);
});

test('v1b workflow harness N7 support admission blocks fixture replay in product mode and legacy provenance', async () => {
  const productCtx = await seedHarnessV1aBundle();
  const { n6: productN6 } = await runReadyN6(productCtx);
  const productInput = await n7Request(productCtx, productN6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_product_fixture_support',
    node_attempt_id: 'node_attempt_v1b_n7_product_fixture_support',
  });
  const fixtureSupport = await recordN7SupportArtifact(productCtx, productInput, {
    allowed_effect: 'support_only',
    output_contract: 'CandidateGroupingSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
    slot_id: 'n7_candidate_grouping',
  }, n7GroupingPayload(productInput) as unknown as Record<string, unknown>);
  const productBlocked = await productCtx.service.invokeNode({
    ...productInput,
    semantic_artifacts: [fixtureSupport],
  });
  assert.equal(productBlocked.gate_status, 'blocked');
  assert.equal(productBlocked.error_code, 'N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(productBlocked.authority_ref, null);

  const legacyCtx = await seedHarnessV1aBundle();
  const { n6: legacyN6 } = await runReadyN6(legacyCtx);
  const legacyInput = await n7Request(legacyCtx, legacyN6, {
    workflow_run_id: 'workflow_run_v1b_n7_legacy_support',
    node_attempt_id: 'node_attempt_v1b_n7_legacy_support',
  });
  const legacySupport = await recordN7SupportArtifact(legacyCtx, legacyInput, {
    allowed_effect: 'support_only',
    output_contract: 'CandidateGroupingSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
    slot_id: 'n7_candidate_grouping',
  }, n7GroupingPayload(legacyInput) as unknown as Record<string, unknown>);
  const legacyBlocked = await legacyCtx.service.invokeNode({
    ...legacyInput,
    semantic_artifacts: [{
      ...legacySupport,
      runtime_provenance_class: 'legacy_unverified',
    }],
  });
  assert.equal(legacyBlocked.gate_status, 'blocked');
  assert.equal(legacyBlocked.error_code, 'N7_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED');
  assert.equal(legacyBlocked.authority_ref, null);
});

test('v1b workflow harness N7 admits runtime-verified Codex support in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_verified_support',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_verified_support',
  });
  const runtime = new TopicSelectionV1bN7SupportRuntimeService(ctx.controlPlane);
  const grouping = n7GroupingPayload(input);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    slot_id: 'n7_candidate_grouping',
    execution_mode: 'codex_assisted',
    run_mode: 'product',
    codex_response: {
      output: grouping,
      operator_label: 'test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected runtime N7 support generation to succeed.');
  }
  assert.equal(generated.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(generated.semantic_artifact.prompt_variant_key, 'n7_candidate_grouping');
  assert.equal(
    generated.semantic_artifact.context_policy_profile_id,
    'topic-selection.v1b.n7.candidate-grouping.context-runtime@v1',
  );
  assert.notEqual(generated.semantic_artifact.prompt_packet_hash, 'c'.repeat(64));
  assert.ok(generated.semantic_artifact.runtime_audit_ref);
  assert.ok(generated.semantic_artifact.runtime_audit_hash);
  assert.equal(generated.semantic_artifact.source_hashes.n6_handoff_hash, input.frozen_input.payload.n6_handoff_hash);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [generated.semantic_artifact],
  });
  assert.ok(['admitted', 'admitted_with_warnings'].includes(result.gate_status));
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'topic_question_contract');
  assert.ok(result.warnings.some((warning) => warning.code === 'candidate_grouping_preserved'));
});

test('v1b workflow harness N7 runtime support exact replay does not rewrite authority artifacts', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_replay',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_replay',
  });
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    n7GroupingPayload(input),
  );
  const first = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [support],
  });
  const artifactRefsBeforeReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const replay = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [support],
  });
  const artifactRefsAfterReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);

  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);
  assert.equal(replay.handoff_ref?.ref_id, first.handoff_ref?.ref_id);
  assert.equal(artifactRefsAfterReplay.length, artifactRefsBeforeReplay.length);
});

test('v1b workflow harness N7 runtime support drift blocks before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_source_drift',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_source_drift',
  });
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    n7GroupingPayload(input),
  );
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [{
      ...support,
      source_hashes: {
        ...support.source_hashes,
        n6_handoff_hash: '9'.repeat(64),
      },
    }],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N7 runtime support audit drift blocks before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_audit_drift',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_audit_drift',
  });
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    n7GroupingPayload(input),
  );
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [{
      ...support,
      runtime_audit_hash: '6'.repeat(64),
    }],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N7 runtime support cannot bypass deterministic candidate gates', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_no_authority_bypass',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_no_authority_bypass',
  });
  const unknownCandidateRef = ref('topic_question_candidate', 'unknown_runtime_candidate', TITLE_CARD_ID);
  const invalidGrouping: TopicSelectionV1bCandidateGroupingSupportPayload = {
    ...n7GroupingPayload(input),
    priority_order: [unknownCandidateRef],
    selected_candidate_hash: '8'.repeat(64),
    selected_candidate_ref: unknownCandidateRef,
  };
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    invalidGrouping,
  );
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [support],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_GROUPING_UNKNOWN_CANDIDATE_REF');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N7 blocks duplicate grouping priority and initial failed-trial synthesis', async () => {
  const duplicateCtx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(duplicateCtx);
  const n6Input = await n6Request(duplicateCtx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_duplicate_grouping_priority',
    node_attempt_id: 'node_attempt_v1b_n6_duplicate_grouping_priority',
  });
  const draft = await n6Draft(duplicateCtx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can duplicate grouping priority be blocked before N7 materialization?',
    expected_claim: 'N7 blocks duplicate candidate priority before writing a contract.',
  };
  const n6 = await duplicateCtx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(duplicateCtx, n6Input, {
        ...draft,
        candidates: [draft.candidates[0]!, second],
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
      }),
    ],
  });
  const input = await n7Request(duplicateCtx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_duplicate_grouping_priority',
    node_attempt_id: 'node_attempt_v1b_n7_duplicate_grouping_priority',
  });
  const grouping = n7GroupingPayload(input);
  const duplicate = await duplicateCtx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN7SupportArtifact(duplicateCtx, input, {
        allowed_effect: 'support_only',
        output_contract: 'CandidateGroupingSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
        slot_id: 'n7_candidate_grouping',
      }, {
        ...grouping,
        priority_order: [grouping.selected_candidate_ref, grouping.selected_candidate_ref],
      } as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(duplicate.gate_status, 'blocked');
  assert.equal(duplicate.error_code, 'N7_DUPLICATE_PRIORITY_CANDIDATE');
  assert.equal(duplicate.authority_ref, null);

  const synthesisCtx = await seedHarnessV1aBundle();
  const { n6: synthesisN6 } = await runReadyN6(synthesisCtx);
  const synthesisInput = await n7Request(synthesisCtx, synthesisN6, {
    workflow_run_id: 'workflow_run_v1b_n7_initial_failed_trial_synthesis',
    node_attempt_id: 'node_attempt_v1b_n7_initial_failed_trial_synthesis',
  });
  const candidates = await synthesisCtx.topicQuestionRepository.listCandidatesByCandidateSetId(synthesisN6.authority_ref!.ref_id);
  const initialSynthesis = await synthesisCtx.service.invokeNode({
    ...synthesisInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(synthesisCtx, synthesisInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, {
        affected_refs: [synthesisN6.authority_ref!],
        exhausted_candidate_refs: candidates.map((candidate) =>
          ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
        failure_reason_codes: ['value_not_supported'],
        n6_regeneration_hints: ['This support is illegal before any N8 feedback exists.'],
        synthesis_summary: 'Initial N7 trials cannot consume failed-trial synthesis.',
      } satisfies TopicSelectionV1bN8FailedTrialSynthesisSupportPayload as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(initialSynthesis.gate_status, 'blocked');
  assert.equal(initialSynthesis.error_code, 'N7_FAILED_TRIAL_SYNTHESIS_NOT_ALLOWED_FOR_INITIAL_TRIAL');
  assert.equal(initialSynthesis.authority_ref, null);
});

test('v1b workflow harness N7 consumes N8 feedback to select next candidate or loop back to N6', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can N7 select a second candidate after N8 semantic failure feedback?',
    expected_claim: 'N7 can preserve failed feedback and select another admissible candidate.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6);
  const first = await ctx.service.invokeNode(initialInput);
  const feedbackInput = await n7FeedbackRequest(ctx, initialInput, first);
  const secondTrial = await ctx.service.invokeNode(feedbackInput);

  assert.equal(secondTrial.gate_status, 'admitted');
  assert.equal(secondTrial.route_decision, 'invoke_next');
  assert.equal(secondTrial.authority_ref?.ref_type, 'topic_question_contract');
  const firstHandoffArtifact = await ctx.controlPlane.getArtifactRef(first.handoff_ref!.ref_id);
  const firstHandoff = firstHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const firstHandoffPayload = firstHandoff.payload as { active_candidate_ref: TopicSelectionFunctionalRef };
  const secondContract = await ctx.topicQuestionRepository.findTopicQuestionContractById(secondTrial.authority_ref!.ref_id);
  assert.notEqual(secondContract?.source_candidate_id, firstHandoffPayload.active_candidate_ref.ref_id);
  const secondDecision = secondContract
    ? await ctx.topicQuestionRepository.findSelectionDecisionById(secondContract.selection_decision_id)
    : null;
  assert.equal(secondDecision?.blocking_contexts[0]?.feedback_class, 'semantic_candidate_failure');
  assert.equal(secondDecision?.blocking_contexts[0]?.failure_reason_code, 'value_not_supported');
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 1);

  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const synthesisPayload: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: candidates.map((candidate) =>
      ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'Both N8 trials failed value support and should regenerate candidates.',
    n6_regeneration_hints: ['Add stronger value evidence before regenerating candidates.'],
    affected_refs: [n6.authority_ref!],
  };
  const exhausted = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, synthesisPayload as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  assert.equal(exhausted.failure_class, 'semantic_non_pass');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.handoff_ref, null);
  assert.equal(exhausted.authority_ref?.ref_type, 'topic_question_selection_decision');
  await assertTraceLoopbackTargetCode(ctx, exhausted, 'n7_loopback_to_n6');
  const exhaustedTrace = await ctx.controlPlane.getTraceSnapshot(exhausted.trace_snapshot_ref!.ref_id);
  const loopbackProjectionRef = exhaustedTrace?.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(loopbackProjectionRef?.ref_type, 'artifact_ref');
  const loopbackProjectionArtifact = await ctx.controlPlane.getArtifactRef(loopbackProjectionRef!.ref_id);
  const loopbackProjection = loopbackProjectionArtifact?.payload as {
    failed_trial_synthesis_hash?: string;
    loopback_target_code?: string;
    non_authority?: boolean;
    projection_kind?: string;
    topic_question_candidate_set_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(loopbackProjectionArtifact?.artifact_kind, 'diagnostic');
  assert.equal(loopbackProjection?.projection_kind, 'v1b_n7_to_n6_failed_trial_loopback_context');
  assert.equal(loopbackProjection?.non_authority, true);
  assert.equal(loopbackProjection?.loopback_target_code, 'n7_loopback_to_n6');
  assert.equal(loopbackProjection?.topic_question_candidate_set_ref?.ref_id, n6.authority_ref!.ref_id);
  assert.equal(loopbackProjection?.failed_trial_synthesis_hash, exhaustedTrace?.payload.synthesis_hash);
  const exhaustedDecision = await ctx.topicQuestionRepository.findSelectionDecisionById(exhausted.authority_ref!.ref_id);
  assert.equal(exhaustedDecision?.admission_review.loopback_target_code, 'n7_loopback_to_n6');
});

test('v1b workflow harness N7 readmits gate-rejected feedback with updated debate admission only', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const initialInput = await n7Request(ctx, n6);
  const first = await ctx.service.invokeNode(initialInput);
  const firstHandoffArtifact = await ctx.controlPlane.getArtifactRef(first.handoff_ref!.ref_id);
  const firstHandoff = firstHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const firstHandoffPayload = firstHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };
  const feedbackInput = await n7FeedbackRequest(ctx, initialInput, first, 'gate_rejected');
  const missingAdmission = await ctx.service.invokeNode(feedbackInput);
  assert.equal(missingAdmission.gate_status, 'blocked');
  assert.equal(missingAdmission.error_code, 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING');
  assert.equal(missingAdmission.authority_ref, null);
  assert.equal(missingAdmission.handoff_ref, null);

  const readmitted = await ctx.service.invokeNode({
    ...feedbackInput,
    node_attempt_id: 'node_attempt_v1b_n7_gate_readmission_with_support',
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, feedbackInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8DebateAdmissionReviewSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
        slot_id: 'n7_n8_debate_admission_review',
      }, n7DebateAdmissionPayload({
        debate_level: 'provider_diverse_deep_debate',
        rationale: 'Gate rejection requires bounded deep readmission without consuming the candidate trial.',
        risk_signal_codes: ['debate_admission_too_weak'],
      }) as unknown as Record<string, unknown>),
    ],
  });

  assert.equal(readmitted.gate_status, 'admitted_with_warnings');
  assert.equal(readmitted.route_decision, 'invoke_next');
  assert.equal(readmitted.authority_ref?.ref_id, first.authority_ref?.ref_id);
  assert.equal(readmitted.error_code, null);
  assert.ok(readmitted.warnings.some((warning) => warning.code === 'n8_debate_level_selected'));

  const readmittedHandoffArtifact = await ctx.controlPlane.getArtifactRef(readmitted.handoff_ref!.ref_id);
  const readmittedHandoff = readmittedHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const readmittedPayload = readmittedHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };
  assert.equal(readmittedPayload.active_candidate_ref.ref_id, firstHandoffPayload.active_candidate_ref.ref_id);
  assert.notEqual(readmittedPayload.n8_debate_admission_hash, firstHandoffPayload.n8_debate_admission_hash);

  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 0);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);
});

test('v1b workflow harness N7 blocks incomplete failed-trial synthesis before N6 loopback', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can incomplete failed-trial synthesis be detected before N6 regeneration?',
    expected_claim: 'N7 should require synthesis coverage for every failed candidate trial.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6);
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const missingSynthesis = await ctx.service.invokeNode({
    ...exhaustedInput,
    node_attempt_id: 'node_attempt_v1b_n7_exhausted_missing_synthesis',
  });
  assert.equal(missingSynthesis.gate_status, 'blocked');
  assert.equal(missingSynthesis.error_code, 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING');
  assert.equal(missingSynthesis.route_decision, 'blocked');
  assert.equal(missingSynthesis.authority_ref, null);
  assert.equal(missingSynthesis.handoff_ref, null);

  const unknownCandidateRef = ref('topic_question_candidate', 'unknown_failed_trial_candidate', TITLE_CARD_ID);
  const unknownRefSynthesis: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: [
      ...candidates.map((candidate) => ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
      unknownCandidateRef,
    ],
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'This synthesis carries an unknown exhausted candidate and must not route to N6.',
    n6_regeneration_hints: ['Unknown failed candidates must not enter N6 regeneration context.'],
    affected_refs: [n6.authority_ref!, unknownCandidateRef],
  };
  const unknownRefResult = await ctx.service.invokeNode({
    ...exhaustedInput,
    node_attempt_id: 'node_attempt_v1b_n7_exhausted_unknown_synthesis_ref',
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, unknownRefSynthesis as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(unknownRefResult.gate_status, 'blocked');
  assert.equal(unknownRefResult.error_code, 'N7_FAILED_TRIAL_SYNTHESIS_UNKNOWN_REF');
  assert.equal(unknownRefResult.authority_ref, null);
  assert.equal(unknownRefResult.handoff_ref, null);

  const incompleteSynthesis: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: [
      ref('topic_question_candidate', candidates[0]!.topic_question_candidate_id, TITLE_CARD_ID),
    ],
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'This synthesis intentionally omits one failed trial and must not route to N6.',
    n6_regeneration_hints: ['The missing failed trial should block regeneration.'],
    affected_refs: [n6.authority_ref!],
  };
  const result = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, incompleteSynthesis as unknown as Record<string, unknown>),
    ],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N7_FAILED_TRIAL_SYNTHESIS_INCOMPLETE');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N7 blocks technical N8 feedback and replays exact admitted result', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_replay',
    node_attempt_id: 'node_attempt_v1b_n7_replay',
  });
  const first = await ctx.service.invokeNode(input);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);

  const technicalInput = await n7FeedbackRequest(ctx, input, first, 'technical_failure');
  const technical = await ctx.service.invokeNode(technicalInput);
  assert.equal(technical.gate_status, 'blocked');
  assert.equal(technical.error_code, 'N7_TECHNICAL_FEEDBACK_WRONG_TARGET');
  assert.equal(technical.authority_ref, null);
});

test('v1b workflow harness N8 creates value assessment from frozen value draft artifact', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7);
  const draft = n8ValueDraft(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_value_assessment');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.match(result.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(result.authority_ref!.ref_id);
  assert.equal(assessment?.readiness_status, 'ready');
  assert.equal(assessment?.legacy_verdict, 'promote');
  assert.equal(assessment?.hard_gates.length, TOPIC_SELECTION_VALUE_GATE_KEYS.length);
  assert.equal(assessment?.dimension_scores.length, TOPIC_SELECTION_VALUE_DIMENSIONS.length);
  const memo = assessment ? await ctx.valueAssessmentRepository.findReasoningMemoById(assessment.value_reasoning_memo_id) : null;
  assert.equal(memo?.recommendation, 'advance_to_package');

  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  assert.equal(handoff?.envelope.handoff_kind, 'N8ToN9Handoff');
  assert.equal((handoff?.payload as { topic_value_assessment_ref?: TopicSelectionFunctionalRef }).topic_value_assessment_ref?.ref_id, result.authority_ref!.ref_id);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.equal(
    transitionRecord?.created_authority_refs.some((authorityRef) => authorityRef.ref_type === 'value_disposition_decision') ?? false,
    false,
  );
});

// D-30 (2026-07-07): operator_debate_request is the third N8 trigger source (T-OP) — it arms the
// SAME n8_feedback_to_n7 loopback the deterministic T1/T3 triggers arm, on a draft those triggers
// would admit (the canonical fixture: total 83, conf 0.82 — outside every band).
test('v1b workflow harness N8 operator_debate_request arms the debate loopback on a clean first pass', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    operator_debate_request: { reason: 'value story reads optimistic; stress-test before advancing', requested_by: 'reviewer_yu' },
  });
  const draft = n8ValueDraft(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'loopback');
  // The loopback attempt records the N8ToN7 feedback packet as its artifact authority; no handoff.
  assert.equal(result.authority_ref?.ref_type, 'artifact_ref');
  assert.equal(result.handoff_ref, null);
  assert.equal(result.error_code, 'N8_OPERATOR_FORCED_DEBATE_TRIGGER');
  assert.ok(result.blockers.some((issue) => issue.code === 'N8_OPERATOR_FORCED_DEBATE_TRIGGER'));
  // No deterministic trigger fired — the operator request alone armed the loopback.
  assert.equal(result.blockers.some((issue) => issue.code === 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER'), false);
  assert.equal(result.blockers.some((issue) => issue.code === 'N8_DIMENSION_CONFLICT_DEBATE_TRIGGER'), false);
  await assertTraceLoopbackTargetCode(
    ctx,
    result,
    'n8_feedback_to_n7',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
  );
  // No authority was written on the loopback attempt.
  assert.deepEqual(await ctx.valueAssessmentRepository.listAssessmentsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness rejects operator_debate_request off N8 and with empty fields', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n8 } = await runReadyN8(ctx);
  const n9Input = await n9Request(ctx, n8, {
    operator_debate_request: { reason: 'wrong node', requested_by: 'reviewer_yu' },
  });
  await assert.rejects(
    () => ctx.service.invokeNode(n9Input),
    (error: unknown) => error instanceof AppError && error.statusCode === 400
      && /only supported on the N8/.test(error.message),
  );

  const ctx2 = await seedHarnessV1aBundle();
  const ready2 = await runReadyN7(ctx2);
  const badInput = await n8Request(ctx2, ready2.n7, {
    operator_debate_request: { reason: '   ', requested_by: 'reviewer_yu' },
  });
  await assert.rejects(
    () => ctx2.service.invokeNode(badInput),
    (error: unknown) => error instanceof AppError && error.statusCode === 400
      && /non-empty reason and requested_by/.test(error.message),
  );
});

test('v1b workflow harness N8 admits runtime-verified Codex value draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_product',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const draft = n8ValueDraft(input);
  const semanticArtifact = await generateN8RuntimeValueDraftArtifact(ctx, input, draft);

  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.prompt_variant_key, 'n8_value_assessment_draft.initial_from_n7');
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n8.topic-value-assessment.context-runtime@v1',
  );
  assert.match(semanticArtifact.source_hashes.n7_handoff_hash ?? '', /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.source_hashes.n7_to_n8_projection_hash ?? '', /^[a-f0-9]{64}$/);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_value_assessment');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
});

test('v1b workflow harness N8 blocks runtime value draft run-mode drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_run_mode_drift',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_run_mode_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const semanticArtifact = await generateN8RuntimeValueDraftArtifact(
    ctx,
    input,
    n8ValueDraft(input),
    { runMode: 'acceptance' },
  );

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'RUNTIME_ADMISSION_ARTIFACT_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N8 blocks runtime value draft source drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_drift',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const draft = n8ValueDraft(input);
  const semanticArtifact = await generateN8RuntimeValueDraftArtifact(ctx, input, draft);
  const driftedArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef = {
    ...semanticArtifact,
    source_hashes: {
      ...semanticArtifact.source_hashes,
      n7_to_n8_projection_hash: '9'.repeat(64),
    },
  };

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [driftedArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b N8 runtime compression quality gate blocks dropped required facts before draft output', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_compression_blocked',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_compression_blocked',
  });
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 120_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    compression_attempt: {
      compression_executor_kind: 'deterministic_structural',
      compressed_context: {
        summary: 'Intentionally incomplete N8 compressed context for quality-gate regression.',
        raw_provider_logs: ['must not be persisted in compressed runtime context'],
      },
      summary: {
        preserved_fact_kinds: ['topic_question_contract'],
      },
      compressed_preserved_facts: {
        topic_question_contract: ['incomplete'],
      },
    },
    codex_response: {
      output: n8ValueDraft(input),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'blocked');
  assert.equal(generated.invocation_result.status, 'blocked');
  assert.equal(generated.invocation_result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_N7_HANDOFF_DROPPED'));
  assert.equal(generated.invocation_result.structured_output, null);
});

test('v1b N8 runtime generation blocks missing N7-to-N8 context projection', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_missing_projection',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_missing_projection',
  });
  const projectionRef = await n7ToN8ProjectionRef(ctx, n7);
  const frozenInput = {
    ...input.frozen_input,
    source_refs: input.frozen_input.source_refs.filter((sourceRef) => (
      sourceRef.ref_type !== projectionRef.ref_type || sourceRef.ref_id !== projectionRef.ref_id
    )),
  };
  const missingProjectionInput = {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(ctx.controlPlane);
  await assert.rejects(
    () => runtime.generateDraftArtifact({
      request: missingProjectionInput,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: n8ValueDraft(missingProjectionInput),
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /requires exactly one N7-to-N8 runtime context projection/u.test(error.message),
  );
});

test('v1b workflow harness N8 blocks fixture replay value draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_fixture_product',
    node_attempt_id: 'node_attempt_v1b_n8_fixture_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const draft = n8ValueDraft(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N8 blocks missing value draft and risk-dropping drafts before authority write', async () => {
  const noDraftCtx = await seedHarnessV1aBundle();
  const { n7: noDraftN7 } = await runReadyN7(noDraftCtx);
  const noDraftInput = await n8Request(noDraftCtx, noDraftN7, {
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'acceptance',
  });
  const noDraft = await noDraftCtx.service.invokeNode(noDraftInput);
  assert.equal(noDraft.gate_status, 'blocked');
  assert.equal(noDraft.error_code, 'N8_FROZEN_VALUE_DRAFT_ARTIFACT_REQUIRED');
  assert.equal(noDraft.authority_ref, null);

  const riskCtx = await seedHarnessV1aBundle({ openRecheck: true, acceptedRiskCoversRecheck: true });
  const { n7 } = await runReadyN7(riskCtx);
  const input = await n8Request(riskCtx, n7);
  const draft = n8ValueDraft(input, {
    accepted_risk_refs: [],
  });
  const riskDropped = await riskCtx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(riskCtx, input, draft)],
  });
  assert.equal(riskDropped.gate_status, 'blocked');
  assert.equal(riskDropped.error_code, 'N8_VALUE_ASSESSMENT_DROPS_RISKS');
  assert.equal(riskDropped.authority_ref, null);
});

test('v1b workflow harness N8 rejects schema-valid-looking value drafts with extra gate or dimension drift', async () => {
  const gateCtx = await seedHarnessV1aBundle();
  const { n7: gateN7 } = await runReadyN7(gateCtx);
  const gateInput = await n8Request(gateCtx, gateN7);
  const gateBaseDraft = n8ValueDraft(gateInput);
  const gateDriftDraft = {
    ...gateBaseDraft,
    hard_gates: [
      ...gateBaseDraft.hard_gates,
      {
        gate_key: 'unsupported_value_gate',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'This extra gate must not be admitted into authority.',
        refs: [gateBaseDraft.reasoning_memo.cited_refs[0]!],
      },
    ],
  } as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload;
  const gateDrift = await gateCtx.service.invokeNode({
    ...gateInput,
    semantic_artifacts: [await recordN8ValueDraftArtifact(gateCtx, gateInput, gateDriftDraft)],
  });
  assert.equal(gateDrift.gate_status, 'blocked');
  assert.equal(gateDrift.error_code, 'N8_VALUE_GATE_COVERAGE_INVALID');
  assert.equal(gateDrift.authority_ref, null);

  const dimensionCtx = await seedHarnessV1aBundle();
  const { n7: dimensionN7 } = await runReadyN7(dimensionCtx);
  const dimensionInput = await n8Request(dimensionCtx, dimensionN7);
  const dimensionBaseDraft = n8ValueDraft(dimensionInput);
  const dimensionDriftDraft = {
    ...dimensionBaseDraft,
    dimension_scores: [
      ...dimensionBaseDraft.dimension_scores,
      {
        dimension_key: 'unsupported_value_dimension',
        score: 77,
        rationale: 'This extra dimension must not be admitted into authority.',
        evidence_refs: [dimensionBaseDraft.reasoning_memo.cited_refs[0]!],
        uncertainty: 'medium',
      },
    ],
  } as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload;
  const dimensionDrift = await dimensionCtx.service.invokeNode({
    ...dimensionInput,
    semantic_artifacts: [await recordN8ValueDraftArtifact(dimensionCtx, dimensionInput, dimensionDriftDraft)],
  });
  assert.equal(dimensionDrift.gate_status, 'blocked');
  assert.equal(dimensionDrift.error_code, 'N8_VALUE_DIMENSION_COVERAGE_INVALID');
  assert.equal(dimensionDrift.authority_ref, null);
});

test('v1b workflow harness N8 blocks disposition, readiness, score, citation, and ref variants before authority', async () => {
  async function assertN8DraftBlock(
    suffix: string,
    expectedErrorCode: string,
    mutate: (
      draft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
    ) => TopicSelectionV1bTopicValueAssessmentDraftPayload,
  ) {
    const ctx = await seedHarnessV1aBundle();
    const { n7 } = await runReadyN7(ctx);
    const input = await n8Request(ctx, n7, {
      workflow_run_id: `workflow_run_v1b_n8_${suffix}`,
      node_attempt_id: `node_attempt_v1b_n8_${suffix}`,
    });
    const result = await ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, mutate(n8ValueDraft(input)))],
    });
    assert.equal(result.gate_status, 'blocked');
    assert.equal(result.error_code, expectedErrorCode);
    assert.equal(result.authority_ref, null);
    assert.equal(result.handoff_ref, null);
  }

  await assertN8DraftBlock('memo_disposition_mismatch', 'N8_VALUE_MEMO_DISPOSITION_MISMATCH', (draft) => ({
    ...draft,
    reasoning_memo: {
      ...draft.reasoning_memo,
      recommendation: 'park',
    },
  }));

  await assertN8DraftBlock('advance_blocking_gate', 'N8_ADVANCE_WITH_BLOCKING_GATE', (draft) => ({
    ...draft,
    hard_gates: [
      {
        ...draft.hard_gates[0]!,
        severity: 'blocking' as const,
        verdict: 'fail' as const,
      },
      ...draft.hard_gates.slice(1),
    ],
  }));

  await assertN8DraftBlock('advance_non_ready', 'N8_ADVANCE_WITH_NON_READY_VALUE', (draft) => ({
    ...draft,
    readiness_status: 'needs_refinement',
  }));

  await assertN8DraftBlock('advance_low_score', 'N8_ADVANCE_SCORE_TOO_LOW', (draft) => ({
    ...draft,
    total_score: 59,
  }));

  await assertN8DraftBlock('memo_citations_missing', 'N8_VALUE_MEMO_CITATIONS_REQUIRED', (draft) => ({
    ...draft,
    reasoning_memo: {
      ...draft.reasoning_memo,
      cited_refs: [],
    },
  }));

  await assertN8DraftBlock('unknown_value_ref', 'N8_UNKNOWN_VALUE_TRACE_REF', (draft) => ({
    ...draft,
    reasoning_memo: {
      ...draft.reasoning_memo,
      cited_refs: [ref('artifact_ref', 'not_allowed_in_n8_value_refs', TITLE_CARD_ID)],
    },
  }));
});

test('v1b workflow harness N6 semantic loopback can regenerate candidates and close through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const failedInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_loopback_first',
    node_attempt_id: 'node_attempt_v1b_n6_loopback_first',
  });
  const failedDraft = await n6Draft(ctx, failedInput);
  const failed = await ctx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, failedInput, {
        ...failedDraft,
        candidates: [
          {
            ...failedDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
    ],
  });

  assert.equal(failed.gate_status, 'blocked');
  assert.equal(failed.route_decision, 'loopback');
  assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
  await assertTraceLoopbackTargetCode(ctx, failed, 'n6_regenerate_candidates');
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const retryInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_loopback_retry',
    node_attempt_id: 'node_attempt_v1b_n6_loopback_retry',
  });
  const retryDraft = await n6Draft(ctx, retryInput, {
    generation_notes: ['Regenerated after N6 semantic loopback with a bounded answerable candidate.'],
  });
  retryDraft.recommended_candidate_keys = ['regenerated_harness_candidate'];
  retryDraft.candidates[0] = {
    ...retryDraft.candidates[0]!,
    candidate_key: 'regenerated_harness_candidate',
    main_question: 'How can a regenerated WorkflowHarness candidate restore v1b topic-question viability after loopback?',
    expected_claim: 'Regenerated candidates can restore a viable v1b topic-question path after semantic loopback.',
  };
  const n6 = await ctx.service.invokeNode({
    ...retryInput,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, retryInput, retryDraft)],
  });
  assert.equal(n6.gate_status, 'admitted');
  assert.equal(n6.route_decision, 'invoke_next');

  const n7 = await ctx.service.invokeNode(await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_after_n6_regen',
    node_attempt_id: 'node_attempt_v1b_n7_after_n6_regen',
  }));
  assert.equal(n7.gate_status, 'admitted');
  const n8Input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_after_n6_regen',
    node_attempt_id: 'node_attempt_v1b_n8_after_n6_regen',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const terminal = await runTerminalPackageFromN8(ctx, n8, 'after_n6_regen');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
  assert.equal((await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID)).length, 1);
});

test('v1b workflow harness N7 semantic trial switch can close on the next candidate through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_trial_switch',
    node_attempt_id: 'node_attempt_v1b_n6_trial_switch',
  });
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can N7 close the v1b workflow on a second candidate after N8 semantic feedback?',
    expected_claim: 'N7 can preserve failed feedback and close on the next viable candidate.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });

  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_trial_switch_first',
    node_attempt_id: 'node_attempt_v1b_n7_trial_switch_first',
  });
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  assert.equal(secondTrial.gate_status, 'admitted');

  const n8Input = await n8Request(ctx, secondTrial, {
    workflow_run_id: 'workflow_run_v1b_n8_trial_switch_second',
    node_attempt_id: 'node_attempt_v1b_n8_trial_switch_second',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  assert.equal(assessment?.topic_question_contract_id, secondTrial.authority_ref?.ref_id);
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 1);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);

  const terminal = await runTerminalPackageFromN8(ctx, n8, 'trial_switch_second');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
});

test('v1b workflow harness N8 gate rejection can readmit through N7 and close the same candidate through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_gate_readmission_first',
    node_attempt_id: 'node_attempt_v1b_n7_gate_readmission_first',
  });
  const first = await ctx.service.invokeNode(initialInput);
  const firstHandoffArtifact = await ctx.controlPlane.getArtifactRef(first.handoff_ref!.ref_id);
  const firstHandoff = firstHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const firstHandoffPayload = firstHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };

  const rejectedN8Input = await n8Request(ctx, first, {
    workflow_run_id: 'workflow_run_v1b_n8_gate_rejected_before_readmission',
    node_attempt_id: 'node_attempt_v1b_n8_gate_rejected_before_readmission',
  });
  const rejectedDraft = n8ValueDraft(rejectedN8Input);
  const rejectedN8 = await ctx.service.invokeNode({
    ...rejectedN8Input,
    semantic_artifacts: [
      await recordN8ValueDraftArtifact(ctx, rejectedN8Input, {
        ...rejectedDraft,
        hard_gates: [
          ...rejectedDraft.hard_gates,
          {
            gate_key: 'unsupported_value_gate',
            verdict: 'pass',
            severity: 'info',
            overridable_with_risk: false,
            rationale: 'This gate rejection triggers N7 readmission coverage.',
            refs: [rejectedDraft.reasoning_memo.cited_refs[0]!],
          },
        ],
      } as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload),
    ],
  });
  assert.equal(rejectedN8.gate_status, 'blocked');
  assert.equal(rejectedN8.error_code, 'N8_VALUE_GATE_COVERAGE_INVALID');
  assert.equal(rejectedN8.authority_ref, null);

  const feedbackInput = await n7FeedbackRequest(ctx, initialInput, first, 'gate_rejected');
  const readmitted = await ctx.service.invokeNode({
    ...feedbackInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, feedbackInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8DebateAdmissionReviewSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
        slot_id: 'n7_n8_debate_admission_review',
      }, n7DebateAdmissionPayload({
        debate_level: 'provider_diverse_deep_debate',
        rationale: 'Gate rejection requires readmission before the same candidate can be reassessed.',
        risk_signal_codes: ['debate_admission_too_weak'],
      }) as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(readmitted.gate_status, 'admitted_with_warnings');
  assert.equal(readmitted.authority_ref?.ref_id, first.authority_ref?.ref_id);
  const readmittedHandoffArtifact = await ctx.controlPlane.getArtifactRef(readmitted.handoff_ref!.ref_id);
  const readmittedHandoff = readmittedHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const readmittedPayload = readmittedHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };
  assert.equal(readmittedPayload.active_candidate_ref.ref_id, firstHandoffPayload.active_candidate_ref.ref_id);
  assert.notEqual(readmittedPayload.n8_debate_admission_hash, firstHandoffPayload.n8_debate_admission_hash);

  const n8Input = await n8Request(ctx, readmitted, {
    workflow_run_id: 'workflow_run_v1b_n8_after_gate_readmission',
    node_attempt_id: 'node_attempt_v1b_n8_after_gate_readmission',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  assert.equal(assessment?.topic_question_contract_id, first.authority_ref?.ref_id);

  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 0);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);
  const terminal = await runTerminalPackageFromN8(ctx, n8, 'after_gate_readmission');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
});

test('v1b workflow harness N7 exhausted trials can loop back to regenerated N6 and close through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_exhaust_then_regen',
    node_attempt_id: 'node_attempt_v1b_n6_exhaust_then_regen',
  });
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can a second trial exercise N7 exhaustion before N6 regeneration?',
    expected_claim: 'Multiple trials can exhaust and route back to N6 with synthesis context.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_exhaust_first',
    node_attempt_id: 'node_attempt_v1b_n7_exhaust_first',
  });
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const exhaustedCandidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  const exhausted = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, {
        exhausted_candidate_refs: exhaustedCandidates.map((candidate) =>
          ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
        failure_reason_codes: ['value_not_supported'],
        synthesis_summary: 'Both candidate trials failed value support and should regenerate N6 candidates.',
        n6_regeneration_hints: ['Add a narrower method and stronger evidence link before retrying N6.'],
        affected_refs: [n6.authority_ref!],
      } satisfies TopicSelectionV1bN8FailedTrialSynthesisSupportPayload as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  await assertTraceLoopbackTargetCode(ctx, exhausted, 'n7_loopback_to_n6');
  const exhaustedDecision = await ctx.topicQuestionRepository.findSelectionDecisionById(exhausted.authority_ref!.ref_id);
  assert.equal(exhaustedDecision?.admission_review.loopback_target_code, 'n7_loopback_to_n6');

  const regenInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_after_n7_exhaustion',
    node_attempt_id: 'node_attempt_v1b_n6_after_n7_exhaustion',
  });
  const regenDraft = await n6Draft(ctx, regenInput, {
    generation_notes: ['Regenerated after N7 exhausted all prior candidate trials.'],
  });
  regenDraft.recommended_candidate_keys = ['regenerated_after_exhaustion_candidate'];
  regenDraft.candidates[0] = {
    ...regenDraft.candidates[0]!,
    candidate_key: 'regenerated_after_exhaustion_candidate',
    main_question: 'How can regenerated N6 candidates recover value support after exhausted N7 trials?',
    expected_claim: 'Regenerated candidates can recover value support after exhausted N7 trials.',
  };
  const regeneratedN6 = await ctx.service.invokeNode({
    ...regenInput,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, regenInput, regenDraft)],
  });
  assert.equal(regeneratedN6.gate_status, 'admitted');
  assert.equal(regeneratedN6.route_decision, 'invoke_next');

  const n7 = await ctx.service.invokeNode(await n7Request(ctx, regeneratedN6, {
    workflow_run_id: 'workflow_run_v1b_n7_after_exhaustion_regen',
    node_attempt_id: 'node_attempt_v1b_n7_after_exhaustion_regen',
  }));
  assert.equal(n7.gate_status, 'admitted');
  const n8Input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_after_exhaustion_regen',
    node_attempt_id: 'node_attempt_v1b_n8_after_exhaustion_regen',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const terminal = await runTerminalPackageFromN8(ctx, n8, 'after_exhaustion_regen');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
  assert.equal((await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID)).length, 2);
});

test('v1b workflow harness N6 admits runtime regeneration from N7 loopback projection', async () => {
  const ctx = await seedHarnessV1aBundle();
  const loopback = await runN7ExhaustionLoopbackFixture(ctx, 'runtime_regen');
  const regenInputBase = await n6Request(ctx, loopback.n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_after_n7',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_after_n7',
  });
  const regenInput = n6InputWithN7LoopbackProjection(regenInputBase, loopback.projectionRef);
  const regenDraft = await n6Draft(ctx, regenInput, {
    generation_notes: ['Runtime regeneration consumed N7 failed-trial projection context.'],
  });
  regenDraft.recommended_candidate_keys = ['runtime_regenerated_after_n7_candidate'];
  regenDraft.candidates[0] = {
    ...regenDraft.candidates[0]!,
    candidate_key: 'runtime_regenerated_after_n7_candidate',
    main_question: 'How can runtime-regenerated N6 candidates recover after N7 failed-trial exhaustion?',
    expected_claim: 'Runtime-regenerated candidates can recover the v1b path after N7 trial exhaustion.',
  };

  const semanticArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    regenInput,
    regenDraft,
    'regeneration_after_n7_loopback',
  );
  assert.equal(semanticArtifact.prompt_variant_key, 'n6_question_candidate_draft.regeneration_after_n7_loopback');
  assert.equal(semanticArtifact.source_hashes.n7_loopback_projection_hash, loopback.projectionArtifact.checksum);
  assert.equal(
    semanticArtifact.source_hashes.n7_loopback_failed_trial_synthesis_hash,
    loopback.projection.failed_trial_synthesis_hash,
  );

  const regenerated = await ctx.service.invokeNode({
    ...regenInput,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(regenerated.gate_status, 'admitted');
  assert.equal(regenerated.route_decision, 'invoke_next');
  assert.equal(regenerated.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(regenerated.handoff_ref?.ref_type, 'artifact_ref');

  const promptMismatchBase = await n6Request(ctx, loopback.n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_prompt_mismatch',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_prompt_mismatch',
  });
  const promptMismatchInput = n6InputWithN7LoopbackProjection(promptMismatchBase, loopback.projectionRef);
  const promptMismatchArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    promptMismatchInput,
    await n6Draft(ctx, promptMismatchInput),
    'regeneration_after_n7_loopback',
  );
  const promptMismatch = await ctx.service.invokeNode({
    ...promptMismatchInput,
    semantic_artifacts: [{
      ...promptMismatchArtifact,
      prompt_variant_key: 'n6_question_candidate_draft.initial_from_n5',
    }],
  });
  assert.equal(promptMismatch.gate_status, 'blocked');
  assert.equal(promptMismatch.error_code, 'N6_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT');

  const sourceDriftBase = await n6Request(ctx, loopback.n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_source_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_source_drift',
  });
  const sourceDriftInput = n6InputWithN7LoopbackProjection(sourceDriftBase, loopback.projectionRef);
  const sourceDriftArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    sourceDriftInput,
    await n6Draft(ctx, sourceDriftInput),
    'regeneration_after_n7_loopback',
  );
  const sourceDrift = await ctx.service.invokeNode({
    ...sourceDriftInput,
    semantic_artifacts: [{
      ...sourceDriftArtifact,
      source_hashes: {
        ...sourceDriftArtifact.source_hashes,
        n7_loopback_projection_hash: '9'.repeat(64),
      },
    }],
  });
  assert.equal(sourceDrift.gate_status, 'blocked');
  assert.equal(sourceDrift.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
});

test('v1b N6 runtime regeneration blocks orphan and malformed N7 loopback projections', async () => {
  const orphanCtx = await seedHarnessV1aBundle();
  const { n5: orphanN5 } = await runReadyN5(orphanCtx);
  const orphanInput = await n6Request(orphanCtx, orphanN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_orphan',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_orphan',
  });
  const orphanDraft = await n6Draft(orphanCtx, orphanInput);
  const orphanRuntime = new TopicSelectionV1bN6DraftRuntimeService(orphanCtx.controlPlane);
  await assert.rejects(
    () => orphanRuntime.generateDraftArtifact({
      request: orphanInput,
      generation_mode: 'regeneration_after_n7_loopback',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: orphanDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('requires an N7 failed-trial loopback projection'),
  );

  const malformedCtx = await seedHarnessV1aBundle();
  const loopback = await runN7ExhaustionLoopbackFixture(malformedCtx, 'runtime_regen_malformed_projection');
  const projection = loopback.projection;
  const firstExhaustedRef = projection.exhausted_candidate_refs[0]!;
  const malformedProjection = {
    ...projection,
    source_refs: projection.source_refs.filter((sourceRef) =>
      sourceRef.ref_id !== firstExhaustedRef.ref_id || sourceRef.ref_type !== firstExhaustedRef.ref_type),
  };
  const malformedProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_malformed_projection',
    payload: malformedProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(malformedProjection)),
    created_by: 'system',
  });
  const malformedInputBase = await n6Request(malformedCtx, loopback.n5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_bad_projection',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_bad_projection',
  });
  const malformedInput = n6InputWithN7LoopbackProjection(
    malformedInputBase,
    ref('artifact_ref', malformedProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const malformedDraft = await n6Draft(malformedCtx, malformedInput);
  const malformedRuntime = new TopicSelectionV1bN6DraftRuntimeService(malformedCtx.controlPlane);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: malformedInput,
      generation_mode: 'regeneration_after_n7_loopback',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: malformedDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('unknown exhausted candidate ref'),
  );
});

test('v1b workflow harness N6 admits runtime regeneration from N6 gate-failure retry projection', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const failedInput = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_first',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_first',
  });
  const failedDraft = await n6Draft(ctx, failedInput);
  failedDraft.candidates[0] = {
    ...failedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const failedDraftArtifact = await generateN6RegularDebateDraftArtifact(ctx, failedInput, failedDraft);
  const failedDraftHash = sha256Text(stableStringify(failedDraft));
  const failed = await ctx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [failedDraftArtifact],
  });
  assert.equal(failed.gate_status, 'blocked');
  assert.equal(failed.route_decision, 'loopback');
  assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
  const projectionRef = await n6GateFailureRetryProjectionRef(ctx, failed);
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef.ref_id);
  assert.ok(projectionArtifact);
  const projectionPayload = projectionArtifact.payload;
  assert.ok(projectionPayload);
  assert.equal(projectionPayload.projection_kind, 'v1b_n6_gate_failure_retry_context');
  assert.equal(projectionPayload.failed_draft_hash, failedDraftHash);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const retryInputBase = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_retry',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_retry',
  });
  const retryInput = n6InputWithN6GateFailureProjection(retryInputBase, projectionRef);
  const retryDraft = await n6Draft(ctx, retryInput, {
    generation_notes: ['Runtime regeneration consumed N6 gate-failure retry context.'],
  });
  retryDraft.recommended_candidate_keys = ['runtime_regenerated_after_n6_gate_failure'];
  retryDraft.candidates[0] = {
    ...retryDraft.candidates[0]!,
    candidate_key: 'runtime_regenerated_after_n6_gate_failure',
    main_question: 'How can runtime-regenerated N6 candidates recover after an N6 deterministic gate failure?',
    expected_claim: 'Runtime-regenerated candidates can recover the v1b path after an N6 gate failure.',
  };
  const retryArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    retryInput,
    retryDraft,
    'regeneration_after_n6_gate_failure',
  );
  assert.equal(retryArtifact.prompt_variant_key, 'n6_question_candidate_draft.regeneration_after_n6_gate_failure');
  assert.equal(retryArtifact.source_hashes.n6_gate_failure_projection_hash, projectionArtifact.checksum);
  assert.equal(retryArtifact.source_hashes.n6_gate_failure_failed_draft_hash, failedDraftHash);
  assert.equal(
    retryArtifact.source_hashes.n6_gate_failure_blocked_candidate_context_hash,
    projectionPayload.blocked_candidate_context_hash,
  );

  const regenerated = await ctx.service.invokeNode({
    ...retryInput,
    semantic_artifacts: [retryArtifact],
  });
  assert.equal(regenerated.gate_status, 'admitted');
  assert.equal(regenerated.route_decision, 'invoke_next');
  assert.equal(regenerated.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(regenerated.handoff_ref?.ref_type, 'artifact_ref');

  const promptMismatchBase = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_prompt_mismatch',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_prompt_mismatch',
  });
  const promptMismatchInput = n6InputWithN6GateFailureProjection(promptMismatchBase, projectionRef);
  const promptMismatchArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    promptMismatchInput,
    await n6Draft(ctx, promptMismatchInput),
    'regeneration_after_n6_gate_failure',
  );
  const promptMismatch = await ctx.service.invokeNode({
    ...promptMismatchInput,
    semantic_artifacts: [{
      ...promptMismatchArtifact,
      prompt_variant_key: 'n6_question_candidate_draft.initial_from_n5',
    }],
  });
  assert.equal(promptMismatch.gate_status, 'blocked');
  assert.equal(promptMismatch.error_code, 'N6_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT');

  const sourceDriftBase = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_source_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_source_drift',
  });
  const sourceDriftInput = n6InputWithN6GateFailureProjection(sourceDriftBase, projectionRef);
  const sourceDriftArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    sourceDriftInput,
    await n6Draft(ctx, sourceDriftInput),
    'regeneration_after_n6_gate_failure',
  );
  const sourceDrift = await ctx.service.invokeNode({
    ...sourceDriftInput,
    semantic_artifacts: [{
      ...sourceDriftArtifact,
      source_hashes: {
        ...sourceDriftArtifact.source_hashes,
        n6_gate_failure_projection_hash: '9'.repeat(64),
      },
    }],
  });
  assert.equal(sourceDrift.gate_status, 'blocked');
  assert.equal(sourceDrift.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
});

// Local mirror of the divergent-debate test's mockedRole (that helper lives in the runtime test file).
function mockedN6DebateRole(
  slot: TopicSelectionV1bN6DivergentDebateRoleSlotId,
  idx: number,
  body: Record<string, unknown>,
): V1bN6DebateInputs {
  return {
    codex_response: null,
    mocked_output: {
      fixture_id: `n6_debate_${slot}_${idx}`,
      output: { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot, ...body },
    } as never,
    instance_index: idx,
  };
}

// T-127 W-07 item (a) follow-up: the N6 divergent-debate escalation now runs END-TO-END against the
// REAL harness + runtime. Previously the harness recorded the gate-failure retry projection only on
// the n6_regenerate_candidates loopback, so runDivergentDebate (regeneration_after_n6_gate_failure)
// threw AppError(400) on the escalation route. This proves: harness records the projection on the
// escalation loopback → the real divergent debate consumes it → the gate admits the bridged draft.
test('v1b N6 divergent-debate escalation runs end-to-end: harness records the gate-failure projection, the real runtime consumes it, and the gate admits the debate draft', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);

  // 1. Drive the real harness N6 gate to an n6_debate_escalation loopback (failed draft + triage).
  //    run_mode stays at the n6Request default so the triage artifact's identity matches the request
  //    (an explicit run_mode here mismatches the recorded triage and blocks before routing).
  const failedInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_debate_escalation_e2e_first',
    node_attempt_id: 'node_attempt_v1b_n6_debate_escalation_e2e_first',
  });
  const failedDraft = await n6Draft(ctx, failedInput);
  const escalation = await ctx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, failedInput, {
        ...failedDraft,
        candidates: [{
          ...failedDraft.candidates[0]!,
          answerability_verdict: 'not_answerable',
          main_question: 'How can AI improve research?',
        }],
      }),
      await recordN6LoopbackTriageArtifact(ctx, failedInput, n6LoopbackTriagePayload(failedInput, {
        loopback_target_code: 'n6_debate_escalation',
        debate_escalation: {
          debate_level: 'mixed_cost_control',
          recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
          sticky: true,
          rationale: 'Escalate candidate generation to a divergent debate before retrying N6.',
        },
        upstream_rollback: null,
        rationale: 'Candidate failures look like prompt contention rather than a bad selected slice.',
      })),
    ],
  });
  assert.equal(escalation.route_decision, 'loopback');
  assert.ok(escalation.warnings.some((warning) => warning.code === 'N6_DEBATE_ESCALATION_RECOMMENDED'));

  // 2. The harness now records a gate-failure retry projection on the escalation loopback (NEW —
  //    previously only n6_regenerate_candidates did), tagged with the escalation target code.
  const escalationTrace = await assertTraceLoopbackTargetCode(
    ctx, escalation, 'n6_debate_escalation', 'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  const projectionRef = escalationTrace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref', 'escalation loopback must record a runtime context projection');
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef!.ref_id);
  assert.equal(projectionArtifact?.payload?.projection_kind, 'v1b_n6_gate_failure_retry_context');
  assert.equal(projectionArtifact?.payload?.loopback_target_code, 'n6_debate_escalation');

  // 3. Run the REAL divergent debate in regeneration_after_n6_gate_failure mode, with the escalation
  //    projection threaded into source_refs — resolveModeContext must now accept it (was throwing).
  const retryBase = await n6Request(ctx, n5, {
    run_mode: 'test',
    workflow_run_id: 'workflow_run_v1b_n6_debate_escalation_e2e_retry',
    node_attempt_id: 'node_attempt_v1b_n6_debate_escalation_e2e_retry',
  });
  const retryInput = n6InputWithN6GateFailureProjection(retryBase, projectionRef!);
  const arbiterDraft = await n6Draft(ctx, retryInput); // a valid, admissible 5-key candidate set
  const debateRuntime = new TopicSelectionV1bN6DivergentDebateRuntimeService(ctx.controlPlane);
  const debate = await debateRuntime.runDivergentDebate({
    request: retryInput,
    generation_mode: 'regeneration_after_n6_gate_failure',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    role_outputs: {
      n6_debate_explorer: [
        mockedN6DebateRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedN6DebateRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedN6DebateRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedN6DebateRole('n6_debate_arbiter', 0, { synthesized_candidate_set: arbiterDraft }),
      ],
    },
    created_by: 'system',
  });
  assert.equal(debate.status, 'completed', 'the divergent debate must complete with the escalation projection');
  if (debate.status !== 'completed') return;
  assert.equal(debate.gate_draft.status, 'succeeded');
  if (debate.gate_draft.status !== 'succeeded') return;
  // The bridged gate-facing draft carries single-agent runtime_verified identity under the gate-failure mode.
  assert.equal(debate.gate_draft.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(debate.gate_draft.semantic_artifact.allowed_effect, 'model_draft_for_gate');
  assert.equal(debate.gate_draft.semantic_artifact.prompt_variant_key, 'n6_question_candidate_draft.regeneration_after_n6_gate_failure');

  // 4. Feed the debate's bridged runtime_verified draft back through the real harness N6 gate → admit.
  const regenerated = await ctx.service.invokeNode({
    ...retryInput,
    semantic_artifacts: [debate.gate_draft.semantic_artifact],
  });
  assert.equal(regenerated.gate_status, 'admitted');
  assert.equal(regenerated.route_decision, 'invoke_next');
  assert.equal(regenerated.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(regenerated.handoff_ref?.ref_type, 'artifact_ref');
});

test('v1b N6 runtime regeneration blocks orphan and malformed N6 gate-failure retry projections', async () => {
  const orphanCtx = await seedHarnessV1aBundle();
  const { n5: orphanN5 } = await runReadyN5(orphanCtx);
  const orphanInput = await n6Request(orphanCtx, orphanN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_orphan',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_orphan',
  });
  const orphanDraft = await n6Draft(orphanCtx, orphanInput);
  const orphanRuntime = new TopicSelectionV1bN6DraftRuntimeService(orphanCtx.controlPlane);
  await assert.rejects(
    () => orphanRuntime.generateDraftArtifact({
      request: orphanInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: orphanDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('requires exactly one N6 gate-failure retry projection'),
  );

  const malformedCtx = await seedHarnessV1aBundle();
  const { n5: malformedN5 } = await runReadyN5(malformedCtx);
  const failedInput = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_malformed_first',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_malformed_first',
  });
  const failedDraft = await n6Draft(malformedCtx, failedInput);
  failedDraft.candidates[0] = {
    ...failedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const failedArtifact = await generateN6RuntimeDraftArtifact(malformedCtx, failedInput, failedDraft);
  const failed = await malformedCtx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [failedArtifact],
  });
  const projectionRef = await n6GateFailureRetryProjectionRef(malformedCtx, failed);
  const projectionArtifact = await malformedCtx.controlPlane.getArtifactRef(projectionRef.ref_id);
  assert.ok(projectionArtifact);
  const projectionPayload = projectionArtifact.payload;
  assert.ok(projectionPayload);
  const malformedProjection = {
    ...projectionPayload,
    source_refs: (projectionPayload.source_refs as TopicSelectionFunctionalRef[]).filter((sourceRef) =>
      sourceRef.ref_id !== (projectionPayload.failed_draft_ref as TopicSelectionFunctionalRef).ref_id),
  };
  const malformedProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_malformed_projection',
    payload: malformedProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(malformedProjection)),
    created_by: 'system',
  });
  const malformedInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_bad_projection',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_bad_projection',
  });
  const malformedInput = n6InputWithN6GateFailureProjection(
    malformedInputBase,
    ref('artifact_ref', malformedProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const malformedDraft = await n6Draft(malformedCtx, malformedInput);
  const malformedRuntime = new TopicSelectionV1bN6DraftRuntimeService(malformedCtx.controlPlane);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: malformedInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: malformedDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('does not preserve required N6 lineage refs'),
  );

  const sourceHashDriftProjection = {
    ...projectionPayload,
    source_hashes: {
      ...(projectionPayload.source_hashes as Record<string, string>),
      failed_draft_prompt_packet_hash: '8'.repeat(64),
    },
  };
  const sourceHashDriftProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_source_hash_drift_projection',
    payload: sourceHashDriftProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(sourceHashDriftProjection)),
    created_by: 'system',
  });
  const sourceHashDriftInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_bad_projection_hashes',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_bad_projection_hashes',
  });
  const sourceHashDriftInput = n6InputWithN6GateFailureProjection(
    sourceHashDriftInputBase,
    ref('artifact_ref', sourceHashDriftProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const sourceHashDriftDraft = await n6Draft(malformedCtx, sourceHashDriftInput);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: sourceHashDriftInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: sourceHashDriftDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('source hashes drift from frozen N6 lineage'),
  );

  const selectedSliceRefDriftProjection = {
    ...projectionPayload,
    selected_research_slice_ref: ref('research_slice', 'research_slice_outside_retry_projection', TITLE_CARD_ID),
  };
  const selectedSliceRefDriftProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_selected_slice_ref_drift_projection',
    payload: selectedSliceRefDriftProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(selectedSliceRefDriftProjection)),
    created_by: 'system',
  });
  const selectedSliceRefDriftInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_selected_slice_ref_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_selected_slice_ref_drift',
  });
  const selectedSliceRefDriftInput = n6InputWithN6GateFailureProjection(
    selectedSliceRefDriftInputBase,
    ref('artifact_ref', selectedSliceRefDriftProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const selectedSliceRefDriftDraft = await n6Draft(malformedCtx, selectedSliceRefDriftInput);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: selectedSliceRefDriftInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: selectedSliceRefDriftDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('source hashes drift from frozen N6 lineage'),
  );

  const rawHashMapProjection = {
    ...projectionPayload,
    source_hashes: {
      ...(projectionPayload.source_hashes as Record<string, unknown>),
      raw_context_payload: { forbidden: 'raw payload in projection hash map' },
    },
  };
  const rawHashMapProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_raw_hash_map_projection',
    payload: rawHashMapProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(rawHashMapProjection)),
    created_by: 'system',
  });
  const rawHashMapInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_raw_hash_map',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_raw_hash_map',
  });
  const rawHashMapInput = n6InputWithN6GateFailureProjection(
    rawHashMapInputBase,
    ref('artifact_ref', rawHashMapProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const rawHashMapDraft = await n6Draft(malformedCtx, rawHashMapInput);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: rawHashMapInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: rawHashMapDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('hash maps contain non-hash or unexpected keys'),
  );
});

test('v1b workflow harness N9 creates advance disposition and N10 creates draft package plus v1c bundle', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n8 } = await runReadyN8(ctx);
  const n9Input = await n9Request(ctx, n8);
  const n9 = await ctx.service.invokeNode(n9Input);

  assert.equal(n9.gate_status, 'admitted_with_warnings');
  assert.equal(n9.route_decision, 'invoke_next');
  assert.equal(n9.authority_ref?.ref_type, 'value_disposition_decision');
  const decision = await ctx.valueAssessmentRepository.findDispositionDecisionById(n9.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'advance_to_package');
  assert.ok(decision?.package_draft_input);
  assert.equal(n9.handoff_ref?.ref_type, 'artifact_ref');
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  const findingRefs = assessment?.artifact_refs.filter(
    (candidate) => candidate.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  ) ?? [];
  assert.ok(findingRefs.length >= 4);
  assert.deepEqual(
    decision?.artifact_refs.filter((candidate) => candidate.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION),
    findingRefs,
  );

  const n10Input = await n10Request(ctx, n9);
  const n10 = await ctx.service.invokeNode(n10Input);
  assert.equal(n10.gate_status, 'admitted_with_warnings');
  assert.equal(n10.route_decision, 'invoke_next');
  assert.equal(n10.authority_ref?.ref_type, 'topic_package');
  const pkg = await ctx.topicPackageRepository.findPackageById(n10.authority_ref!.ref_id);
  assert.equal(pkg?.package_readiness_status, 'ready_for_promotion_review');
  assert.ok(pkg?.title_candidates.every((title) => title.length <= 180 && !/[?？]$/.test(title)));
  assert.ok(pkg?.title_candidates.every((title) => !/^(?:method|system)\s*:/i.test(title)));
  assert.notEqual(
    pkg?.title_candidates[0]?.toLowerCase(),
    decision?.package_draft_input?.question_contract.main_question.replace(/[?？]$/u, '').toLowerCase(),
  );
  assert.deepEqual(pkg?.non_goals, decision?.package_draft_input?.question_contract.prohibited_claims);
  assert.doesNotMatch(pkg?.research_background ?? '', /[.!?。！？]{2,}/);
  assert.doesNotMatch(pkg?.contribution_summary ?? '', /[.!?。！？]{2,}/);
  assert.doesNotMatch(pkg?.evaluation_plan ?? '', /[.!?。！？]{2,}/);
  assert.equal(pkg ? hashPackageForHarness(pkg) : null, n10.hashes.authority_hash);
  const bundle = pkg ? await ctx.topicPackageRepository.findV1cInputBundleByPackageId(pkg.topic_package_id) : null;
  assert.equal(bundle?.bundle_status, 'ready_for_promotion_review');
  assert.deepEqual(
    pkg?.artifact_refs.filter((candidate) => candidate.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION),
    findingRefs,
  );
  assert.deepEqual(
    bundle?.artifact_refs.filter((candidate) => candidate.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION),
    findingRefs,
  );
  assert.equal(decision ? (await ctx.valueAssessmentRepository.findDispositionDecisionById(decision.value_disposition_decision_id))?.output_topic_package_id : null, pkg?.topic_package_id);
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n10.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  assert.equal(handoff?.envelope.handoff_kind, 'N10ToN11Handoff');

  const duplicateInput = await n10Request(ctx, n9, {
    workflow_run_id: 'workflow_run_v1b_n10_duplicate',
    node_attempt_id: 'node_attempt_v1b_n10_duplicate',
  });
  const duplicate = await ctx.service.invokeNode(duplicateInput);
  assert.equal(duplicate.gate_status, 'admitted_with_warnings');
  assert.equal(duplicate.authority_ref?.ref_id, n10.authority_ref?.ref_id);
  assert.equal(duplicate.warnings.some((warning) => warning.code === 'N10_PACKAGE_EXISTING_RETURNED'), true);
  assert.equal((await ctx.topicPackageRepository.listPackagesByTitleCardId(TITLE_CARD_ID)).length, 1);
});

test('v1b workflow harness N9 rejects a risk finding from a stale N8 source snapshot', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n8 } = await runReadyN8(ctx);
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  const findingRef = assessment?.artifact_refs.find(
    (candidate) => candidate.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  );
  assert.ok(findingRef);
  const artifact = await ctx.controlPlane.getArtifactRef(findingRef.ref_id);
  assert.ok(artifact?.payload);
  artifact.payload.source_snapshot_hash = 'f'.repeat(64);

  const result = await ctx.service.invokeNode(await n9Request(ctx, n8));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N9_RISK_FINDING_STALE');
  assert.equal(result.authority_ref, null);
});

test('v1b workflow harness N9 rejects material N8 narrative when stable findings are missing', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n8 } = await runReadyN8(ctx);
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  assert.ok(assessment);
  assessment.artifact_refs = assessment.artifact_refs.filter(
    (candidate) => candidate.version_id !== TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  );
  assessment.risk_finding_refs = [];

  const result = await ctx.service.invokeNode(await n9Request(ctx, n8));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N9_MATERIAL_RISK_FINDINGS_MISSING');
  assert.equal(result.authority_ref, null);
});

for (const deltaMode of ['mocked_llm', 'codex_cli'] as const) {
test(`v1b workflow harness N9 refine_question prevents package creation and emits N7 recovery handoff (${deltaMode})`, async t => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const candidateDraft = await n6Draft(ctx, n6Input);
  const resolvedReviewTriggers = [
    'Choose the primary calibration and harmful-routing metrics before N8 value assessment.',
    'Confirm whether task-quality improvement is required or only non-worsening.',
  ];
  const independentRisks = [
    'Benchmark construction may dominate the project scope.',
    'Calibration drift may be too small for a meaningful repair claim.',
    'The contribution may collapse to a well-tuned calibration baseline.',
  ];
  const reviewTrigger = 'Review benchmark validity before advancement.';
  candidateDraft.candidates[0]!.risk_notes = independentRisks;
  candidateDraft.candidates[0]!.human_review_triggers = [...resolvedReviewTriggers, reviewTrigger];
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, n6Input, candidateDraft)],
  });
  const initialN7Input = await n7Request(ctx, n6);
  const n7 = await ctx.service.invokeNode(initialN7Input);
  for (const trigger of resolvedReviewTriggers) {
    assert.ok(n7.warnings.some((warning) => warning.code === trigger));
  }
  for (const risk of independentRisks) {
    assert.ok(n7.warnings.some((warning) => warning.message === risk));
  }
  const n8Input = await n8Request(ctx, n7);
  const draft = n8ValueDraft(n8Input, {
    readiness_status: 'needs_refinement',
    recommended_disposition: 'refine_question',
    reasoning_memo: {
      ...n8ValueDraft(n8Input).reasoning_memo,
      recommendation: 'refine_question',
      disposition_bridge: 'Refine the question before package creation.',
    },
    total_score: 58,
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, draft)],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const n9Input = await n9Request(ctx, n8);
  const n9 = await ctx.service.invokeNode(n9Input);
  assert.equal(n9.gate_status, 'terminal_no_advance');
  assert.equal(n9.failure_class, 'terminal_no_advance');
  assert.equal(n9.route_decision, 'loopback');
  assert.equal(n9.handoff_ref?.ref_type, 'artifact_ref');
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n9.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as unknown as {
    envelope: { handoff_kind: string };
    target_node_id: string;
    required_refs: TopicSelectionFunctionalRef[];
    payload: {
      value_disposition_ref: TopicSelectionFunctionalRef;
      value_disposition_hash: string;
      topic_value_assessment_ref: TopicSelectionFunctionalRef;
      topic_value_assessment_hash: string;
      previous_topic_question_contract_ref: TopicSelectionFunctionalRef;
      previous_topic_question_contract_hash: string;
    };
  };
  assert.equal(handoff.envelope.handoff_kind, 'N9ToN7RefinementHandoff');
  assert.equal(handoff.target_node_id, 'topic-selection.v1b.materialize-topic-question-contract.v1');
  const decision = await ctx.valueAssessmentRepository.findDispositionDecisionById(n9.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'refine_question');
  assert.equal(decision?.package_draft_input, null);
  assert.equal(handoff.payload.value_disposition_ref.ref_id, decision?.value_disposition_decision_id);
  assert.equal(handoff.payload.previous_topic_question_contract_ref.ref_id, decision?.topic_question_contract_id);
  assert.equal(handoff.payload.previous_topic_question_contract_hash, n9Input.frozen_input.payload.topic_question_contract_hash);
  assert.deepEqual(await ctx.topicPackageRepository.listPackagesByTitleCardId(TITLE_CARD_ID), []);

  const previousContract = await ctx.topicQuestionRepository.findTopicQuestionContractById(
    handoff.payload.previous_topic_question_contract_ref.ref_id,
  );
  assert.ok(previousContract);
  const refinementPayload: TopicSelectionV1bN9QuestionRefinementPayload = {
    schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
    refinement_id: 'refinement_fixed_coverage_calibration',
    actor: {
      actor_type: 'human',
      actor_id: 'researcher_phase_5',
    },
    rationale: 'Freeze the accepted calibration and harmful-routing constraints before reassessment.',
    resolved_review_triggers: resolvedReviewTriggers.map((trigger) => ({
      trigger,
      resolved_by_fields: ['metrics', 'risk_notes'],
      rationale: 'The Human confirms the explicit metric choices and non-inferiority margin in these fields.',
    })),
    updates: {
      main_question: 'How can low-label recalibration with abstention preserve calibration while limiting harmful routing under replacement shifts?',
      contribution_hypothesis: 'method',
      expected_claim: 'At 90% frozen-router coverage, the method improves Brier Score and does not materially degrade harmful-routing rate.',
      fallback_claim: 'The study identifies the shift conditions under which recalibration should abstain.',
      evaluation_setting: 'Two real replacement environments with paired same-query evaluation and disjoint calibration/test splits.',
      metrics: ['Brier Score', 'ECE', 'NLL', 'harmful-routing rate at fixed coverage', 'AURC'],
      baselines: ['matched-budget strong recalibration baselines', 'no-shift control'],
      ablations_or_comparisons: ['without abstention', 'without shift descriptors'],
      dependency_risks: ['replacement environments may not expose enough harmful-routing events'],
      known_gaps: ['external validity beyond the two replacement environments'],
      risk_notes: ['Task-quality degradation must remain within one percentage point.'],
    },
  };
  const initialPayload = initialN7Input.frozen_input.payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload;
  const refinementRequest = request({
    workflow_run_id: 'workflow_run_v1b_n7_refinement',
    node_attempt_id: 'node_attempt_v1b_n7_refinement',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    title_card_id: TITLE_CARD_ID,
    created_by: 'human',
    frozen_input: {
      input_contract: 'N9ToN7RefinementHandoff@v1',
      snapshot_kind: 'topic_question_candidate_set',
      source_refs: [
        ...initialN7Input.frozen_input.source_refs,
        n9.handoff_ref!,
        ...handoff.required_refs,
      ],
      payload: {
        ...initialPayload,
        input_mode: 'refinement_from_n9',
        n9_handoff_hash: n9.hashes.handoff_hash,
        value_disposition_ref: handoff.payload.value_disposition_ref,
        value_disposition_hash: handoff.payload.value_disposition_hash,
        topic_value_assessment_ref: handoff.payload.topic_value_assessment_ref,
        topic_value_assessment_hash: handoff.payload.topic_value_assessment_hash,
        previous_topic_question_contract_ref: handoff.payload.previous_topic_question_contract_ref,
        previous_topic_question_contract_hash: handoff.payload.previous_topic_question_contract_hash,
        question_refinement: refinementPayload,
      },
    },
  });
  const invalidHandoffHash = await ctx.service.invokeNode(request({
    ...refinementRequest,
    workflow_run_id: 'workflow_run_v1b_n7_refinement_bad_handoff',
    node_attempt_id: 'node_attempt_v1b_n7_refinement_bad_handoff',
    frozen_input: {
      ...refinementRequest.frozen_input,
      frozen_input_hash: undefined,
      payload: {
        ...refinementRequest.frozen_input.payload,
        n9_handoff_hash: '0'.repeat(64),
      },
    },
  }));
  assert.equal(invalidHandoffHash.gate_status, 'blocked');
  assert.match(invalidHandoffHash.error_code ?? '', /HASH_MISMATCH/);

  const wrongTarget = await ctx.service.invokeNode(request({
    ...refinementRequest,
    workflow_run_id: 'workflow_run_v1b_n7_refinement_wrong_target',
    node_attempt_id: 'node_attempt_v1b_n7_refinement_wrong_target',
    frozen_input: {
      ...refinementRequest.frozen_input,
      frozen_input_hash: undefined,
      payload: {
        ...refinementRequest.frozen_input.payload,
        previous_topic_question_contract_ref: ref(
          'topic_question_contract',
          'topic_question_contract_wrong_target',
          TITLE_CARD_ID,
        ),
      },
    },
  }));
  assert.equal(wrongTarget.gate_status, 'blocked');
  assert.equal(wrongTarget.error_code, 'N7_REFINEMENT_N9_HANDOFF_PAYLOAD_MISMATCH');

  const unauthorized = await ctx.service.invokeNode({
    ...refinementRequest,
    workflow_run_id: 'workflow_run_v1b_n7_refinement_nonhuman',
    node_attempt_id: 'node_attempt_v1b_n7_refinement_nonhuman',
    created_by: 'system',
  });
  assert.equal(unauthorized.gate_status, 'blocked');
  assert.equal(unauthorized.error_code, 'N7_REFINEMENT_HUMAN_ACTOR_REQUIRED');
  for (const [suffix, resolutions, expectedCode] of [
    ['unknown', [{ ...refinementPayload.resolved_review_triggers![0]!, trigger: 'Unrelated trigger.' }], 'N7_REFINEMENT_REVIEW_TRIGGER_MISMATCH'],
    ['duplicate', [refinementPayload.resolved_review_triggers![0]!, refinementPayload.resolved_review_triggers![0]!], 'N7_REFINEMENT_PAYLOAD_INVALID'],
    ['unsupplied_field', [{ ...refinementPayload.resolved_review_triggers![0]!, resolved_by_fields: ['open_dependencies'] }], 'N7_REFINEMENT_PAYLOAD_INVALID'],
    ['empty_rationale', [{ ...refinementPayload.resolved_review_triggers![0]!, rationale: ' ' }], 'N7_REFINEMENT_PAYLOAD_INVALID'],
  ] as const) {
    const invalidResolution = await ctx.service.invokeNode(request({
      ...refinementRequest,
      node_attempt_id: `node_attempt_v1b_n7_refinement_${suffix}`,
      frozen_input: {
        ...refinementRequest.frozen_input,
        frozen_input_hash: undefined,
        payload: {
          ...refinementRequest.frozen_input.payload,
          question_refinement: { ...refinementPayload, resolved_review_triggers: resolutions },
        },
      },
    }));
    assert.equal(invalidResolution.error_code, expectedCode, invalidResolution.error_message ?? undefined);
    assert.equal(invalidResolution.authority_ref, null);
  }
  assert.equal(
    (await ctx.topicQuestionRepository.findTopicQuestionContractById(previousContract.topic_question_contract_id))?.status,
    'active',
  );

  const refinedN7 = await ctx.service.invokeNode(refinementRequest);

  assert.equal(refinedN7.error_code, null, refinedN7.error_message ?? undefined);
  assert.equal(refinedN7.gate_status, 'admitted_with_warnings');
  assert.equal(refinedN7.route_decision, 'invoke_next');
  assert.notEqual(refinedN7.authority_ref?.ref_id, previousContract.topic_question_contract_id);
  const refinedContract = await ctx.topicQuestionRepository.findTopicQuestionContractById(refinedN7.authority_ref!.ref_id);
  assert.equal(refinedContract?.main_question, refinementPayload.updates.main_question);
  assert.equal(refinedContract?.expected_claim, refinementPayload.updates.expected_claim);
  assert.equal(refinedContract?.evaluation_route, refinementPayload.updates.evaluation_setting);
  assert.deepEqual(refinedContract?.risk_notes, refinementPayload.updates.risk_notes);
  assert.equal(refinedN7.warnings.some((warning) => resolvedReviewTriggers.includes(warning.code)), false);
  for (const risk of independentRisks) {
    assert.ok(refinedN7.warnings.some((warning) => warning.message === risk));
  }
  assert.deepEqual(
    refinedN7.warnings.filter((warning) => warning.code === 'N7_ACTIVE_CONTRACT_RISK_NOTE')
      .map((warning) => ({ message: warning.message, refs: warning.refs })),
    refinementPayload.updates.risk_notes!.map((message) => ({ message, refs: [refinedN7.authority_ref] })),
  );
  assert.ok(refinedN7.warnings.some((warning) => warning.code === reviewTrigger));
  const refinedDecision = await ctx.topicQuestionRepository.findSelectionDecisionById(refinedContract!.selection_decision_id);
  assert.deepEqual(refinedDecision?.human_review_triggers, [reviewTrigger]);
  assert.deepEqual(refinedDecision?.admission_review.resolved_review_triggers, refinementPayload.resolved_review_triggers);
  const refinedAnswerability = await ctx.topicQuestionRepository.findAnswerabilityPlanByContractId(
    refinedN7.authority_ref!.ref_id,
  );
  assert.deepEqual(refinedAnswerability?.metrics, refinementPayload.updates.metrics);
  assert.deepEqual(refinedAnswerability?.baselines, refinementPayload.updates.baselines);
  assert.equal(
    (await ctx.topicQuestionRepository.findTopicQuestionContractById(previousContract.topic_question_contract_id))?.status,
    'superseded',
  );
  assert.equal(
    (await ctx.topicQuestionRepository.findTopicQuestionById(previousContract.topic_question_id))?.status,
    'superseded',
  );

  const replay = await ctx.service.invokeNode(refinementRequest);
  assert.equal(replay.authority_ref?.ref_id, refinedN7.authority_ref?.ref_id);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.deepEqual(replay.warnings, refinedN7.warnings);
  const historicalReplay = await ctx.service.invokeNode(initialN7Input);
  assert.equal(historicalReplay.replay_provenance?.replayed, true);
  assert.deepEqual(historicalReplay.warnings, n7.warnings);
  const feedbackInput = await n7FeedbackRequest(ctx, initialN7Input, refinedN7, 'gate_rejected');
  const readmitted = await ctx.service.invokeNode({
    ...feedbackInput,
    semantic_artifacts: [await recordN7SupportArtifact(ctx, feedbackInput, {
      allowed_effect: 'support_only',
      output_contract: 'N8DebateAdmissionReviewSupport@v1',
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
      slot_id: 'n7_n8_debate_admission_review',
    }, n7DebateAdmissionPayload({
      debate_level: 'provider_diverse_deep_debate',
      rationale: 'Reassess the same refined contract with the required debate support.',
      risk_signal_codes: ['debate_admission_too_weak'],
    }) as unknown as Record<string, unknown>)],
  });
  assert.equal(readmitted.error_code, null, readmitted.error_message ?? undefined);
  assert.deepEqual(readmitted.authority_ref, refinedN7.authority_ref);
  assert.deepEqual(
    readmitted.warnings.filter((warning) => warning.code === 'N7_ACTIVE_CONTRACT_RISK_NOTE'),
    refinedN7.warnings.filter((warning) => warning.code === 'N7_ACTIVE_CONTRACT_RISK_NOTE'),
  );
  assert.equal(readmitted.warnings.some((warning) => resolvedReviewTriggers.includes(warning.code)), false);
  for (const risk of independentRisks) {
    assert.ok(readmitted.warnings.some((warning) => warning.message === risk));
  }
  const staleRetry = await ctx.service.invokeNode(request({
    ...refinementRequest,
    workflow_run_id: 'workflow_run_v1b_n7_refinement_stale_retry',
    node_attempt_id: 'node_attempt_v1b_n7_refinement_stale_retry',
    frozen_input: {
      ...refinementRequest.frozen_input,
      frozen_input_hash: undefined,
    },
  }));
  assert.equal(staleRetry.gate_status, 'blocked');
  assert.equal(staleRetry.error_code, 'N7_REFINEMENT_PREVIOUS_CONTRACT_STALE');

  const currentCheckpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(
    TITLE_CARD_ID,
    'question_contract',
  );
  assert.ok(currentCheckpoint);
  const packetBeforeView = await ctx.researchCheckpointService.getPacket(currentCheckpoint.research_checkpoint_id);
  const viewService = new TopicSelectionResearchCheckpointService(ctx.researchCheckpointRepository, ctx.controlPlane, {
    stageProjectionSources: {
      questionRepository: ctx.topicQuestionRepository,
      valueAssessmentRepository: ctx.valueAssessmentRepository,
      topicPackageRepository: ctx.topicPackageRepository,
    },
  });
  const human = await viewService.getStageView(TITLE_CARD_ID, 'research_question', 'human');
  for (const risk of independentRisks) assert.ok(human.markdown.includes(risk));
  assert.ok(human.markdown.includes(reviewTrigger));
  assert.ok(human.markdown.includes('Task-quality degradation must remain within one percentage point.'));
  assert.equal(resolvedReviewTriggers.some((trigger) => human.markdown.includes(trigger)), false);
  assert.deepEqual(await viewService.getPacket(currentCheckpoint.research_checkpoint_id), packetBeforeView);
  const checkpointDecision = await ctx.researchCheckpointService.recordDecision(
    currentCheckpoint.research_checkpoint_id,
    {
      decision_key: 'reviewed_refinement_loopback_001',
      decision: 'loopback',
      actor: { actor_type: 'human', actor_id: 'researcher_phase_5' },
      confirmed_snapshot_hash: currentCheckpoint.target_snapshot_hash,
      rationale: 'Run the bounded delta Debate before reopening this exact contract checkpoint.',
      review_payload: {
        review_kind: 'question_contract',
        mechanism_identifiable: true,
        proxy_operationalized: true,
        confounds_reviewed: true,
        falsification_reviewed: true,
        claim_ceiling_reviewed: true,
        objections_reviewed: true,
        review_notes: ['The accepted Human refinement must be adversarially reviewed without mutation.'],
      },
      loopback_target: 'question_contract',
      loopback_refs: [refinedN7.authority_ref!],
    },
  );
  const currentHandoffArtifact = await ctx.controlPlane.getArtifactRef(refinedN7.handoff_ref!.ref_id);
  const currentHandoff = currentHandoffArtifact!.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const currentHandoffPayload = currentHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    active_candidate_hash: string;
    selected_research_slice_ref: TopicSelectionFunctionalRef;
    selected_research_slice_hash: string;
  };
  const previousAnswerability = await ctx.topicQuestionRepository.findAnswerabilityPlanByContractId(
    previousContract.topic_question_contract_id,
  );
  assert.ok(previousAnswerability);
  const deltaClassification = classifyTopicSelectionV1bRefinementDelta({
    main_question: previousContract.main_question,
    contribution_hypothesis: previousContract.contribution_hypothesis,
    expected_claim: previousContract.expected_claim,
    fallback_claim: previousContract.fallback_claim,
    evaluation_setting: previousAnswerability.evaluation_setting,
    metrics: previousAnswerability.metrics,
    baselines: previousAnswerability.baselines,
    ablations_or_comparisons: previousAnswerability.ablations_or_comparisons,
    dependency_risks: previousAnswerability.dependency_risks,
    open_dependencies: previousAnswerability.open_dependencies,
    known_gaps: previousAnswerability.known_gaps,
    risk_notes: previousContract.risk_notes,
  }, refinementPayload);
  const reviewedPayload = {
    ...refinementRequest.frozen_input.payload,
    input_mode: 'reviewed_refinement',
    current_n7_handoff_ref: refinedN7.handoff_ref!,
    current_n7_handoff_hash: refinedN7.hashes.handoff_hash!,
    current_topic_question_contract_ref: refinedN7.authority_ref!,
    current_topic_question_contract_hash: refinedN7.hashes.authority_hash!,
    source_checkpoint_ref: ref('research_checkpoint', currentCheckpoint.research_checkpoint_id, TITLE_CARD_ID),
    source_checkpoint_decision_ref: ref(
      'research_checkpoint_decision',
      checkpointDecision.research_checkpoint_decision_id,
      TITLE_CARD_ID,
    ),
    evidence_ceiling_refs: currentHandoff.required_refs,
    evidence_ceiling_hash: canonicalHash(currentHandoff.required_refs),
  };
  const reviewedRequest = request({
    ...refinementRequest,
    node_attempt_id: 'node_attempt_v1b_n7_reviewed_refinement',
    frozen_input: {
      input_contract: 'N7ReviewedRefinement@v1',
      snapshot_kind: 'topic_question_candidate_set',
      source_refs: uniqueRefs([
        ...refinementRequest.frozen_input.source_refs,
        ...reviewedPayload.evidence_ceiling_refs,
        refinedN7.handoff_ref!,
        refinedN7.authority_ref!,
        reviewedPayload.source_checkpoint_ref,
        reviewedPayload.source_checkpoint_decision_ref,
      ]),
      payload: reviewedPayload,
    },
  });
  let deltaRuntime = new TopicSelectionV1bN6RefinementDeltaDebateRuntimeService(ctx.controlPlane);
  let reviewService = ctx.service;
  const deltaContext = {
    source_kind: 'question_checkpoint_loopback' as const,
    source_decision_ref: reviewedPayload.source_checkpoint_decision_ref,
    checkpoint_ref: reviewedPayload.source_checkpoint_ref,
    previous_topic_question_contract_ref: handoff.payload.previous_topic_question_contract_ref,
    previous_topic_question_contract_hash: handoff.payload.previous_topic_question_contract_hash,
    current_topic_question_contract_ref: refinedN7.authority_ref!,
    current_topic_question_contract_hash: refinedN7.hashes.authority_hash!,
    proposed_contract_semantic_hash: refinedN7.hashes.authority_hash!,
    refinement: refinementPayload,
    refinement_hash: canonicalHash(refinementPayload),
    delta_hash: deltaClassification.delta_hash,
    changed_fields: deltaClassification.changed_fields,
    selected_candidate_ref: currentHandoffPayload.active_candidate_ref,
    selected_candidate_hash: currentHandoffPayload.active_candidate_hash,
    selected_research_slice_ref: currentHandoffPayload.selected_research_slice_ref,
    selected_research_slice_hash: currentHandoffPayload.selected_research_slice_hash,
    evidence_ceiling_refs: reviewedPayload.evidence_ceiling_refs,
    evidence_ceiling_hash: reviewedPayload.evidence_ceiling_hash,
    source_refs: reviewedRequest.frozen_input.source_refs,
  };
  const role_outputs = Object.fromEntries(
    TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER.map((slot) => {
      const output = slot === 'n6_refinement_delta_explorer'
        ? {
          schema_version: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
          role_slot: slot,
          review_points: deltaClassification.changed_fields.map((field) => ({
            field,
            statement: `${field} is explicit and remains frozen.`,
          })),
        }
        : slot === 'n6_refinement_delta_critic'
          ? {
            schema_version: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
            role_slot: slot,
            critic_findings: [{ finding_code: 'C1', severity: 'note', field: 'evaluation_setting', statement: 'The paired design stays within the frozen evidence ceiling.' }],
          }
          : {
            schema_version: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
            role_slot: slot,
            decision: 'admit_unchanged',
            findings: [],
            summary: 'The exact Human-authored refinement is coherent and remains unchanged.',
          };
      return [slot, { mocked_output: { fixture_id: `reviewed_${slot}`, output }, codex_response: null }];
    }),
  );
  if (deltaMode === 'codex_cli') {
    reviewedRequest.run_mode = 'product';
    const home = mkdtempSync(join(tmpdir(), 'harness-delta-cli-'));
    t.after(() => rmSync(home, { recursive: true, force: true }));
    const registry = createDefaultTopicSelectionModelProfileRegistry();
    const modelProfileRegistry = new TopicSelectionModelProfileRegistryService({ registry });
    let calls = 0;
    const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
      if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
      const packet = JSON.parse(options.stdin.split('[user]\n')[1]!) as {
        role_slot: string; context_packet: { prior_role_outputs: unknown[]; research_context: { frozen_domain: { reviewedRefinement: unknown } } };
      };
      assert.equal(packet.context_packet.prior_role_outputs.length, calls++);
      assert.ok(packet.context_packet.research_context.frozen_domain.reviewedRefinement);
      return { stdout: [
        { type: 'thread.started', thread_id: `reviewed-delta-${calls}` },
        { type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(role_outputs[packet.role_slot]!.mocked_output.output) } },
      ].map(event => JSON.stringify(event)).join('\n'), stderr: '', exit_code: 0, timed_out: false };
    });
    const agentOrchestrator = new TopicSelectionAgentOrchestratorService({ controlPlane: ctx.controlPlane, modelProfileRegistry, codexCliRunner: runner, codexCliModelId: 'gpt-6-astra' });
    reviewService = new TopicSelectionV1bWorkflowHarnessService(ctx.controlPlane, {
      modelProfileRegistry, agentOrchestrator,
      evidencePacketResolver: { resolve: async input => ({ schema_version: 'TopicSelectionResearchEvidencePacket@v1', title_card_id: TITLE_CARD_ID,
        participant_role: input.participant_role, query_intent: input.query_intent, items: [], source_refs: input.evidence_unit_refs,
        total_excerpt_chars: 0, packet_hash: canonicalHash(input) }) },
      runnerDependencies: { evidenceMapRepository: ctx.evidenceRepository, needValidationRepository: ctx.needRepository,
        recheckRiskMemoryRepository: ctx.recheckRepository, researchCheckpointService: ctx.researchCheckpointService,
        researchSliceRepository: ctx.researchSliceRepository, searchResourceRepository: ctx.searchRepository,
        topicQuestionRepository: ctx.topicQuestionRepository, topicPackageRepository: ctx.topicPackageRepository,
        valueAssessmentRepository: ctx.valueAssessmentRepository, v1bIntakeRepository: ctx.v1bRepository },
    });
    deltaRuntime = new TopicSelectionV1bN6RefinementDeltaDebateRuntimeService(ctx.controlPlane, { modelProfileRegistry, agentOrchestrator,
      resolveResearchContext: request => reviewService.resolveCodexResearchContext(request) });
  }
  const debate = await deltaRuntime.runDebate({
    request: reviewedRequest,
    context: deltaContext,
    execution_mode: deltaMode,
    role_outputs: deltaMode === 'codex_cli' ? undefined : role_outputs,
  });
  assert.equal(debate.status, 'completed', debate.status === 'role_blocked' ? JSON.stringify(debate.loop.status === 'blocked' ? debate.loop.turn.invocation_result.token_budget_gate_result ?? debate.loop.turn.invocation_result.blocker_codes : debate.loop.status) : JSON.stringify(debate.status));
  if (debate.status !== 'completed') throw new Error('Expected refinement delta Debate admission.');

  const evidenceCeilingDrift = await ctx.service.invokeNode(request({
    ...reviewedRequest,
    node_attempt_id: 'node_attempt_v1b_n7_reviewed_refinement_evidence_drift',
    run_mode: undefined, semantic_artifacts: undefined,
    frozen_input: {
      ...reviewedRequest.frozen_input,
      frozen_input_hash: undefined,
      payload: {
        ...reviewedPayload,
        evidence_ceiling_hash: '0'.repeat(64),
      },
    },
  }));
  assert.equal(evidenceCeilingDrift.gate_status, 'blocked');
  assert.equal(evidenceCeilingDrift.error_code, 'N7_REFINEMENT_DELTA_EVIDENCE_CEILING_MISMATCH');

  const reviewedN7 = await reviewService.invokeNode({
    ...reviewedRequest,
    semantic_artifacts: [debate.semantic_artifact],
  });

  assert.equal(reviewedN7.error_code, null, reviewedN7.error_message ?? undefined);
  assert.equal(reviewedN7.gate_status, 'admitted_with_warnings');
  assert.equal(reviewedN7.authority_ref?.ref_id, refinedN7.authority_ref?.ref_id);
  assert.equal(reviewedN7.hashes.authority_hash, refinedN7.hashes.authority_hash);
  const reopenedCheckpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(
    TITLE_CARD_ID,
    'question_contract',
  );
  assert.ok(reopenedCheckpoint);
  assert.notEqual(reopenedCheckpoint.research_checkpoint_id, currentCheckpoint.research_checkpoint_id);
  assert.equal(reopenedCheckpoint.status, 'pending');
  const reopenedPacket = await viewService.getPacket(reopenedCheckpoint.research_checkpoint_id);
  assert.deepEqual(reopenedPacket.packet_payload.human_review_triggers, [reviewTrigger]);
  for (const risk of independentRisks) assert.ok(reviewedN7.warnings.some((warning) => warning.message === risk));

  async function refineAgain(
    sourceN7: typeof reviewedN7,
    suffix: string,
    updates: TopicSelectionV1bN9QuestionRefinementPayload['updates'],
  ) {
    const secondN8Input = await n8Request(ctx, sourceN7, {
      workflow_run_id: `${suffix}_run_n8`,
      node_attempt_id: `${suffix}_attempt_n8`,
    });
    const secondDraft = n8ValueDraft(secondN8Input, {
      readiness_status: 'needs_refinement',
      recommended_disposition: 'refine_question',
      reasoning_memo: { ...n8ValueDraft(secondN8Input).reasoning_memo, recommendation: 'refine_question' },
      total_score: 58,
    });
    const secondN8 = await ctx.service.invokeNode({
      ...secondN8Input,
      semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, secondN8Input, secondDraft)],
    });
    const secondN9 = await ctx.service.invokeNode(await n9Request(ctx, secondN8, {
      workflow_run_id: `${suffix}_run_n9`,
      node_attempt_id: `${suffix}_attempt_n9`,
    }));
    assert.equal(secondN9.gate_status, 'terminal_no_advance');
    const secondHandoff = (await ctx.controlPlane.getArtifactRef(secondN9.handoff_ref!.ref_id))!
      .payload as unknown as typeof handoff;
    return ctx.service.invokeNode(request({
      ...refinementRequest,
      node_attempt_id: `${suffix}_attempt_n7`,
      frozen_input: {
        ...refinementRequest.frozen_input,
        frozen_input_hash: undefined,
        source_refs: [...initialN7Input.frozen_input.source_refs, secondN9.handoff_ref!, ...secondHandoff.required_refs],
        payload: {
          ...initialPayload,
          ...secondHandoff.payload,
          input_mode: 'refinement_from_n9',
          n9_handoff_hash: secondN9.hashes.handoff_hash,
          question_refinement: {
            schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
            refinement_id: suffix,
            actor: refinementPayload.actor,
            rationale: 'Tighten the fallback claim while preserving the accepted experiment design and reviews.',
            updates,
          },
        },
      },
    }));
  }
  const secondRefined = await refineAgain(reviewedN7, 'claim_only', {
    fallback_claim: 'The claim remains limited to the two tested replacement environments.',
  });
  assert.equal(secondRefined.error_code, null, secondRefined.error_message ?? undefined);
  const secondContract = await ctx.topicQuestionRepository.findTopicQuestionContractById(secondRefined.authority_ref!.ref_id);
  const secondPlan = await ctx.topicQuestionRepository.findAnswerabilityPlanByContractId(secondRefined.authority_ref!.ref_id);
  assert.deepEqual(secondPlan?.metrics, refinementPayload.updates.metrics);
  assert.deepEqual(secondContract?.risk_notes, refinementPayload.updates.risk_notes);
  assert.equal(secondRefined.warnings.some((warning) => resolvedReviewTriggers.includes(warning.code)), false);
  const secondDecision = await ctx.topicQuestionRepository.findSelectionDecisionById(secondContract!.selection_decision_id);
  assert.deepEqual(secondDecision?.admission_review.resolved_review_triggers, refinementPayload.resolved_review_triggers);
  const changedMetrics = await refineAgain(secondRefined, 'changed_metrics', { metrics: ['NLL only'] });
  assert.equal(changedMetrics.error_code, null, changedMetrics.error_message ?? undefined);
  for (const trigger of resolvedReviewTriggers) {
    assert.ok(changedMetrics.warnings.some((warning) => warning.code === trigger));
  }
  for (const risk of independentRisks) assert.ok(changedMetrics.warnings.some((warning) => warning.message === risk));

});
}

test('v1b workflow harness N11 publishes v1c input bundle and closes N1-N11 service-level E2E', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n10, n11 } = await runReadyN11(ctx);

  assert.equal(n11.gate_status, 'admitted_with_warnings');
  assert.equal(n11.route_decision, 'stop_v1b_complete');
  assert.equal(n11.error_code, null);
  assert.equal(n11.authority_ref?.ref_type, 'v1b_to_v1c_input_bundle');
  assert.equal(n11.handoff_ref?.ref_type, 'artifact_ref');
  assert.match(n11.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

  const pkg = await ctx.topicPackageRepository.findPackageById(n10.authority_ref!.ref_id);
  const bundle = await ctx.topicPackageRepository.findV1cInputBundleById(n11.authority_ref!.ref_id);
  assert.equal(bundle?.topic_package_id, pkg?.topic_package_id);
  assert.equal(bundle ? hashV1cBundleForHarness(bundle) : null, n11.hashes.authority_hash);
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n11.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  assert.equal(handoff?.envelope.handoff_kind, 'V1cInputBundle');
  assert.equal(handoff?.target_node_id, 'v1c.entry');
  const payload = handoff?.payload as {
    draft_topic_package_ref?: TopicSelectionFunctionalRef;
    v1c_input_bundle_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(payload?.draft_topic_package_ref?.ref_id, pkg?.topic_package_id);
  assert.equal(payload?.v1c_input_bundle_ref?.ref_id, bundle?.v1b_to_v1c_input_bundle_id);
  assert.equal(JSON.stringify(bundle).includes('paper_project'), false);
  assert.equal(JSON.stringify(bundle).includes('promotion_decision'), false);

  const replay = await ctx.service.invokeNode(await n11Request(ctx, n10));
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, n11.authority_ref?.ref_id);

  const sideEffectInput = await n11Request(ctx, n10, {
    workflow_run_id: 'workflow_run_v1b_n11_side_effect',
    node_attempt_id: 'node_attempt_v1b_n11_side_effect',
  });
  const sideEffectFrozenInput = {
    ...sideEffectInput.frozen_input,
    frozen_input_hash: null,
    payload: {
      ...sideEffectInput.frozen_input.payload,
      paper_project_ref: ref('paper_project', 'paper_project_001', TITLE_CARD_ID),
    },
  };
  const sideEffectResult = await ctx.service.invokeNode(request({
    ...sideEffectInput,
    frozen_input: sideEffectFrozenInput,
  }));
  assert.equal(sideEffectResult.gate_status, 'blocked');
  assert.equal(sideEffectResult.error_code, 'N11_FROZEN_PAYLOAD_INVALID');
  assert.equal(sideEffectResult.authority_ref, null);
});

test('v1b workflow harness N1 admitted replay is exact and changed frozen input detects drift', async () => {
  const ctx = await seedHarnessV1aBundle();
  const input = n1Request(ctx.bundle, {
    workflow_run_id: 'workflow_run_v1b_n1_replay',
    node_attempt_id: 'node_attempt_v1b_n1_replay',
  });
  const first = await ctx.service.invokeNode(input);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.hashes.authority_hash, first.hashes.authority_hash);

  const drift = await ctx.service.invokeNode({
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        source_refs_hash: 'b'.repeat(64),
      },
      frozen_input_hash: null,
    },
  });
  assert.equal(drift.error_code, 'REPLAY_INPUT_HASH_MISMATCH');
});

test('v1b workflow harness blocks model-like execution specs on deterministic nodes', async () => {
  const ctx = makeContext();
  const result = await ctx.service.invokeNode(request({
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: 'topic-selection.v1b.readiness.invalid-provider',
    },
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'INVALID_NODE_PROVIDER_SPEC');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
});

test('v1b workflow harness rejects raw provider fields by request schema before persistence', async () => {
  const ctx = makeContext();
  const invalid = {
    ...request({
      node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    }),
    provider_id: 'openai',
  };

  await assert.rejects(
    () => ctx.service.invokeNode(invalid as TopicSelectionV1bWorkflowHarnessRunRequest),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_001'), []);
});

test('v1b workflow harness rejects invalid actor metadata before persistence', async () => {
  const ctx = makeContext();
  const invalidCreatedBy = request({
    created_by: 'provider' as TopicSelectionV1bWorkflowHarnessRunRequest['created_by'],
  });
  const invalidActor = request({
    workflow_run_id: 'workflow_run_v1b_harness_invalid_actor',
    actor: {
      actor_type: 'provider' as NonNullable<TopicSelectionV1bWorkflowHarnessRunRequest['actor']>['actor_type'],
    },
  });

  await assert.rejects(
    () => ctx.service.invokeNode(invalidCreatedBy),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => ctx.service.invokeNode(invalidActor),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_001'), []);
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_invalid_actor'), []);
});

test('v1b workflow harness rejects malformed frozen source refs before persistence', async () => {
  const ctx = makeContext();
  const malformedFrozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N3ToN4Handoff@v1',
    snapshot_kind: 'v1b_intake_readiness_assessment',
    source_refs: [
      {
        ref_type: '',
        ref_id: 'readiness_001',
        title_card_id: TITLE_CARD_ID,
      },
    ],
    payload: {
      readiness_assessment_id: 'readiness_001',
    },
  };

  await assert.rejects(
    () => ctx.service.invokeNode(request({
      frozen_input: {
        ...malformedFrozenInput,
        frozen_input_hash: frozenInputHash(malformedFrozenInput),
      },
    })),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_001'), []);
});

test('v1b workflow harness blocks frozen input contract and snapshot drift before runner execution', async () => {
  const ctx = makeContext();
  const contractMismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_contract_mismatch',
    node_attempt_id: 'node_attempt_v1b_contract_mismatch',
    frozen_input: {
      ...request().frozen_input,
      input_contract: 'N8ToN9Handoff@v1',
      frozen_input_hash: null,
    },
  }));
  assert.equal(contractMismatch.error_code, 'FROZEN_INPUT_CONTRACT_MISMATCH');
  assert.equal(contractMismatch.authority_ref, null);
  assert.equal(contractMismatch.handoff_ref, null);

  const snapshotMismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_snapshot_mismatch',
    node_attempt_id: 'node_attempt_v1b_snapshot_mismatch',
    frozen_input: {
      ...request().frozen_input,
      snapshot_kind: 'topic_value_assessment',
      source_refs: [ref('topic_value_assessment', 'value_001')],
      frozen_input_hash: null,
    },
  }));
  assert.equal(snapshotMismatch.error_code, 'FROZEN_INPUT_SNAPSHOT_KIND_MISMATCH');

  const sourceRefMismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_source_ref_mismatch',
    node_attempt_id: 'node_attempt_v1b_source_ref_mismatch',
    frozen_input: {
      ...request().frozen_input,
      source_refs: [ref('wrong_snapshot_kind', 'wrong_001')],
      frozen_input_hash: null,
    },
  }));
  assert.equal(sourceRefMismatch.error_code, 'FROZEN_INPUT_SOURCE_REF_KIND_MISMATCH');
});

test('v1b workflow harness rejects semantic artifact legacy refs before persistence', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_semantic_legacy_ref',
    node_attempt_id: 'node_attempt_v1b_semantic_legacy_ref',
  });

  await assert.rejects(
    () => ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [
        semanticArtifact(input, {
          support_artifact_ref: {
            ...ref('artifact_ref', 'support_with_legacy'),
            legacy_ref: { raw_provider_response: true },
          },
        }),
      ],
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id), []);
});

test('v1b workflow harness accepts provider-mode execution spec shape on model-like nodes without invoking providers', async () => {
  const ctx = makeContext();
  const result = await ctx.service.invokeNode(request({
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: providerModelOptionId('topic-selection.v1b.assess-topic-value.v1'),
    },
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(result.hashes.execution_spec_hash.length, 64);
});

test('v1b workflow harness admits model-like codex mocked and provider specs through registry-backed runtime shell', async () => {
  const ctx = makeContext();
  const nodeId: TopicSelectionV1bWorkflowHarnessNodeId = 'topic-selection.v1b.assess-topic-value.v1';
  const providerOptionId = providerModelOptionId(nodeId);

  const codex = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_codex_runtime_admission',
    node_attempt_id: 'node_attempt_v1b_codex_runtime_admission',
    node_id: nodeId,
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
  }));
  assert.equal(codex.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(codex.hashes.runtime_admission_hash?.length, 64);

  const mocked = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_mock_runtime_admission',
    node_attempt_id: 'node_attempt_v1b_mock_runtime_admission',
    node_id: nodeId,
    run_mode: 'test',
    execution_spec: {
      execution_mode: 'mocked_llm',
      model_option_id: null,
    },
  }));
  assert.equal(mocked.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(mocked.hashes.runtime_admission_hash?.length, 64);

  const provider = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_provider_runtime_admission',
    node_attempt_id: 'node_attempt_v1b_provider_runtime_admission',
    node_id: nodeId,
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: providerOptionId,
    },
  }));
  assert.equal(provider.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(provider.hashes.runtime_admission_hash?.length, 64);
});

test('v1b workflow harness blocks missing model-like invocation and invalid provider/profile admission', async () => {
  const ctx = makeContext();
  const missingInvocation = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_missing_invocation',
    node_attempt_id: 'node_attempt_v1b_missing_invocation',
    execution_spec: null,
    run_mode: null,
    profile_id: null,
  }));
  assert.equal(missingInvocation.error_code, 'MISSING_INVOCATION_SLOT_INPUT');

  const artifactOnlyInput = request({
    workflow_run_id: 'workflow_run_v1b_artifact_only_invocation',
    node_attempt_id: 'node_attempt_v1b_artifact_only_invocation',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    execution_spec: null,
    run_mode: null,
    profile_id: null,
  });
  const artifactOnly = await ctx.service.invokeNode({
    ...artifactOnlyInput,
    semantic_artifacts: [semanticArtifact(artifactOnlyInput)],
  });
  assert.equal(artifactOnly.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');

  const missingModelOption = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_missing_model_option',
    node_attempt_id: 'node_attempt_v1b_missing_model_option',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: null,
    },
  }));
  assert.equal(missingModelOption.error_code, 'RUNTIME_MODEL_OPTION_REQUIRED');

  const disallowedProfile = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_disallowed_profile',
    node_attempt_id: 'node_attempt_v1b_disallowed_profile',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
  }));
  assert.equal(disallowedProfile.error_code, 'RUNTIME_PROFILE_NOT_ALLOWED');
});

test('v1b workflow harness deterministic-only nodes reject semantic artifacts and execution specs', async () => {
  const ctx = makeContext();
  const semanticSourceInput = request({
    workflow_run_id: 'workflow_run_v1b_semantic_source',
    node_attempt_id: 'node_attempt_v1b_semantic_source',
  });
  const deterministicOnlyNodes: TopicSelectionV1bWorkflowHarnessNodeId[] = [
    'topic-selection.v1b.create-intake-snapshot.v1',
    'topic-selection.v1b.decide-value-disposition.v1',
    'topic-selection.v1b.create-draft-topic-package.v1',
    'topic-selection.v1b.publish-v1c-input-bundle.v1',
  ];

  for (const nodeId of deterministicOnlyNodes) {
    const base = request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_deterministic_only`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_deterministic_only`,
      node_id: nodeId,
    });
    const semanticResult = await ctx.service.invokeNode({
      ...base,
      semantic_artifacts: [
        semanticArtifact(semanticSourceInput, {
          node_id: nodeId,
          input_hash: base.frozen_input.frozen_input_hash!,
        }),
      ],
    });
    assert.equal(semanticResult.error_code, 'SEMANTIC_ARTIFACT_NOT_ALLOWED');

    const executionResult = await ctx.service.invokeNode({
      ...base,
      workflow_run_id: `${base.workflow_run_id}_execution_spec`,
      node_attempt_id: `${base.node_attempt_id}_execution_spec`,
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: 'topic-selection.v1b.invalid-provider',
      },
    });
    assert.equal(executionResult.error_code, 'INVALID_NODE_PROVIDER_SPEC');

    const runtimeResult = await ctx.service.invokeNode({
      ...base,
      workflow_run_id: `${base.workflow_run_id}_runtime_profile`,
      node_attempt_id: `${base.node_attempt_id}_runtime_profile`,
      run_mode: 'acceptance',
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    });
    assert.equal(runtimeResult.error_code, 'INVALID_NODE_RUNTIME_SPEC');
  }
});

test('v1b workflow harness delegated and support nodes reject provider specs but accept allowed Codex semantic artifacts', async () => {
  const ctx = makeContext();
  const nodes: TopicSelectionV1bWorkflowHarnessNodeId[] = [
    'topic-selection.v1b.record-research-constraint-profile.v1',
    'topic-selection.v1b.assess-intake-readiness.v1',
    'topic-selection.v1b.select-research-slice.v1',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
  ];

  for (const nodeId of nodes) {
    const providerResult = await ctx.service.invokeNode(request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_provider_reject`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_provider_reject`,
      node_id: nodeId,
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: 'topic-selection.v1b.invalid-provider',
      },
    }));
    assert.equal(providerResult.error_code, 'INVALID_NODE_PROVIDER_SPEC');

    const input = request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_codex_accept`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_codex_accept`,
      node_id: nodeId,
      run_mode: 'acceptance',
      profile_id: slotSpecForNode(nodeId).profile_id,
    });
    const accepted = await ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [semanticArtifact(input)],
    });
    assert.equal(accepted.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
    assert.equal(accepted.hashes.semantic_artifact_hash?.length, 64);
    assert.equal(accepted.authority_ref, null);
  }
});

test('v1b workflow harness model-like nodes accept allowed execution specs and semantic artifacts', async () => {
  const ctx = makeContext();
  const nodes: TopicSelectionV1bWorkflowHarnessNodeId[] = [
    'topic-selection.v1b.generate-research-slice-options.v1',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
    'topic-selection.v1b.assess-topic-value.v1',
  ];

  for (const nodeId of nodes) {
    const modelOptionId = providerModelOptionId(nodeId);
    const input = request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_model_like`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_model_like`,
      node_id: nodeId,
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: modelOptionId,
      },
    });
    const result = await ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [
        semanticArtifact(input, {
          execution_mode: 'provider_llm',
          model_option_id: modelOptionId,
        }),
      ],
    });
    assert.ok([
      'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
    ].includes(result.error_code ?? ''));
    assert.equal(result.hashes.execution_spec_hash.length, 64);
    assert.equal(result.hashes.semantic_artifact_hash?.length, 64);
  }
});

test('v1b workflow harness blocks wrong semantic slot node and effect with specific policy codes', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_wrong_semantic_slot',
    node_attempt_id: 'node_attempt_v1b_wrong_semantic_slot',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
  });

  const wrongSlot = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      semanticArtifact(input, {
        slot_id: 'n8_value_assessment_draft',
      }),
    ],
  });
  assert.equal(wrongSlot.error_code, 'UNKNOWN_SEMANTIC_SUPPORT_SLOT');

  const wrongNode = await ctx.service.invokeNode({
    ...input,
    workflow_run_id: 'workflow_run_v1b_wrong_semantic_node',
    node_attempt_id: 'node_attempt_v1b_wrong_semantic_node',
    semantic_artifacts: [
      semanticArtifact(input, {
        node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
      }),
    ],
  });
  assert.equal(wrongNode.error_code, 'SEMANTIC_ARTIFACT_NODE_MISMATCH');

  const wrongEffect = await ctx.service.invokeNode({
    ...input,
    workflow_run_id: 'workflow_run_v1b_wrong_semantic_effect',
    node_attempt_id: 'node_attempt_v1b_wrong_semantic_effect',
    semantic_artifacts: [
      semanticArtifact(input, {
        allowed_effect: 'support_only',
      }),
    ],
  });
  assert.equal(wrongEffect.error_code, 'SEMANTIC_ARTIFACT_EFFECT_NOT_ALLOWED');
});

test('v1b workflow harness exact replay returns existing trace result without writing a new trace', async () => {
  const ctx = makeContext();
  const input = request();
  const first = await ctx.service.invokeNode(input);
  const traceCountAfterFirst = (await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id)).length;
  const replay = await ctx.service.invokeNode(input);
  const traceCountAfterReplay = (await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id)).length;

  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.replay_identity.node_replay_key, first.replay_identity.node_replay_key);
  assert.equal(replay.harness_trace_artifact_ref?.ref_id, first.harness_trace_artifact_ref?.ref_id);
  assert.equal(traceCountAfterReplay, traceCountAfterFirst);
});

test('v1b workflow harness blocks changed input for an existing node attempt id', async () => {
  const ctx = makeContext();
  const input = request();
  const first = await ctx.service.invokeNode(input);

  const changedFrozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: input.frozen_input.input_contract,
    snapshot_kind: input.frozen_input.snapshot_kind,
    source_refs: input.frozen_input.source_refs,
    payload: {
      readiness_assessment_id: 'readiness_001',
      warning_context: ['accepted_risk_carried_forward', 'changed_input'],
    },
  };
  const mismatch = await ctx.service.invokeNode(request({
    frozen_input: {
      ...changedFrozenInput,
      frozen_input_hash: frozenInputHash(changedFrozenInput),
    },
  }));

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_INPUT_HASH_MISMATCH');
  assert.notEqual(mismatch.replay_identity.node_replay_key, first.replay_identity.node_replay_key);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    mismatch.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
});

test('v1b workflow harness distinguishes execution spec replay drift from input drift', async () => {
  const ctx = makeContext();
  const input = request({
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-balanced`,
    },
  });
  await ctx.service.invokeNode(input);

  const mismatch = await ctx.service.invokeNode(request({
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-quality`,
    },
  }));

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_EXECUTION_SPEC_HASH_MISMATCH');
  assert.match(mismatch.error_message ?? '', /execution_spec_hash/);
});

test('v1b workflow harness distinguishes runtime admission replay drift from input drift', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_runtime_replay_drift',
    node_attempt_id: 'node_attempt_v1b_runtime_replay_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
  });
  await ctx.service.invokeNode(input);

  const mismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_runtime_replay_drift',
    node_attempt_id: 'node_attempt_v1b_runtime_replay_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
  }));

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_RUNTIME_ADMISSION_HASH_MISMATCH');
  assert.match(mismatch.error_message ?? '', /runtime_admission_hash/);
});

test('v1b workflow harness distinguishes semantic artifact replay drift from input drift', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_semantic_replay_drift',
    node_attempt_id: 'node_attempt_v1b_semantic_replay_drift',
  });
  await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact(input)],
  });

  const mismatch = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      semanticArtifact(input, {
        normalized_output_hash: 'f'.repeat(64),
      }),
    ],
  });

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_SEMANTIC_ARTIFACT_HASH_MISMATCH');
  assert.match(mismatch.error_message ?? '', /semantic_artifact_hash/);
});

test('v1b workflow harness semantic hashes are stable across fresh persistence ids', async () => {
  const ctx = makeContext();
  const first = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_harness_stable_hash_a',
  }));
  const second = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_harness_stable_hash_b',
  }));

  assert.notEqual(first.gate_result_ref?.ref_id, second.gate_result_ref?.ref_id);
  assert.equal(first.replay_identity.node_replay_key, second.replay_identity.node_replay_key);
  assert.equal(first.hashes.gate_result_hash, second.hashes.gate_result_hash);
  assert.equal(first.hashes.route_hash, second.hashes.route_hash);
});

test('v1b workflow harness validates every node id through the shell without authority writes', async () => {
  const ctx = makeContext();
  for (const nodeId of TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS) {
    const result = await ctx.service.invokeNode(request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}`,
      node_id: nodeId as TopicSelectionV1bWorkflowHarnessNodeId,
    }));
    assert.equal(result.authority_ref, null);
    assert.equal(result.handoff_ref, null);
    assert.ok([
      'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
      'INVALID_NODE_PROVIDER_SPEC',
    ].includes(result.error_code ?? ''));
  }
});

// T-123 Phase 5.1 (F-11) REPLAY-IDENTITY GUARD: the harness split is a pure mechanical refactor that
// must keep every byte-bearing hash identical. The chain tests above thread hashes node-to-node, so a
// CONSISTENT shift in the hash machinery (hashContext / outcomeGateResultHash / authority+handoff
// hashing) would still pass them. This test pins GOLDEN literal values for a fully deterministic
// N1->N3 chain (fixed idFactory counter + fixed NOW), so any extraction that perturbs the hashing
// drifts these and fails. Re-baseline ONLY for an intentional, separately-justified hash change.
// N1 is the fully deterministic node (no semantic-support artifact generation, which on N2/N3 pulls a
// non-idFactory random element). Its byte-bearing hashes therefore pin the SHARED hash machinery the
// split most endangers: hashContext (-> node_replay_key), outcomeGateResultHash (-> gate_result_hash /
// route_hash), frozen_input_hash, the N1 authority hash, and the handoff hashing.
const GUARD_GOLDEN_N1: Record<string, string | null> = {
  frozen_input_hash: 'bd34adc0946b45ba010dea78d44b946fb36503a8cd9bf2a35710dd933c175211',
  gate_result_hash: '50587f791937d5a5beafb2c8a3804f8ebe62f41eed9052c0def921ae65554d06',
  route_hash: '15dbf67aef2d370873c6d1606f4977ef1701097494ade5bd1588ced2d4fe18dd',
  authority_hash: 'b07db403253f032c67edc21a47bb717cd48fd36e44df63d6ba7310d5de95dbab',
  handoff_hash: '64d38ce4c1056bd65fa3bceaa19ec50bb91b69c120fbaeddc38b43fd2ee95dba',
  node_replay_key: '1068d98fb5cd1fe59159384b1e98a3458872ba9e9c498e0acd078cb402a79534',
};
test('replay-identity guard: deterministic N1 pins golden byte-bearing hashes (F-11 split safety net)', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const actual = {
    frozen_input_hash: n1.hashes.frozen_input_hash,
    gate_result_hash: n1.hashes.gate_result_hash,
    route_hash: n1.hashes.route_hash,
    authority_hash: n1.hashes.authority_hash,
    handoff_hash: n1.hashes.handoff_hash,
    node_replay_key: n1.replay_identity.node_replay_key,
  };
  // Re-baseline ONLY for an intentional, separately-justified hash change — NEVER for a Phase-5.1
  // extraction, which is pure mechanical relocation and must preserve every value byte-for-byte.
  assert.deepEqual(actual, GUARD_GOLDEN_N1);
});
