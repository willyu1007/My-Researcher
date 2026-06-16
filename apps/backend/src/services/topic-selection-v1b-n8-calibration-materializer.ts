/**
 * DP-3.3 N8 debate-threshold calibration — corpus materialize utility.
 *
 * Turns a hand-authored labeled corpus entry into a VALID N8 RunRequest that passes the N8
 * runtime's pre-model lineage gates (assertN8FrozenPayload → resolveN7ToN8Projection →
 * assertN7ToN8ProjectionPolicy → assertRequiredStructureManifest), so the calibration run can
 * invoke the real N8 path over the corpus and capture the resulting TopicValueAssessmentDraft.
 *
 * It does NOT run the N1→N7 chain (that needs real upstream authorities and starts from intake
 * bundles, not hand-authored bodies). Instead it hand-constructs against an in-memory control
 * plane, mirroring the SSOT projection builder
 * (TopicSelectionV1bWorkflowHarnessService.buildN7ToN8TopicQuestionContractContextProjection,
 * harness-service.ts:8236-8318). The harness is D3-sensitive, so we MIRROR rather than import it;
 * `verifyN8CalibrationRunRequest` is the drift guardrail — it runs the REAL generateDraftArtifact
 * (mocked executor, no provider call) and fails the moment the gates reject our construction.
 *
 * Calibration TOOLING — not wired into any product route. See
 * dev-docs/active/topic-selection-productization-hardening/evidence/dp33-n8-threshold-calibration/README.md.
 */
import {
  TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionV1bN8ValueAssessmentRuntimeService } from './topic-selection-v1b-n8-value-assessment-runtime-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;

export const N8_CALIBRATION_DISPOSITIONS = [
  'advance_to_package',
  'refine_question',
  'refine_slice',
  'recheck_evidence_or_search',
  'park',
  'drop',
] as const;
export type TopicSelectionN8CalibrationDisposition = (typeof N8_CALIBRATION_DISPOSITIONS)[number];

export const N8_CALIBRATION_EXPECTED_BANDS = [
  'clear_pass',
  'borderline',
  'clear_fail',
  'dimension_conflict',
] as const;
export type TopicSelectionN8CalibrationExpectedBand = (typeof N8_CALIBRATION_EXPECTED_BANDS)[number];

/** Free-form JSON body (the codex agent reads it via file access; the gates only check refs/hashes). */
type CorpusBody = Record<string, unknown>;

/**
 * The smallest unit that is both runnable through N8 and human-labelable.
 * (A) value-bearing bodies the labeler authors; (B) lineage stubs the materializer fills if omitted;
 * (C) ground-truth labels for the analysis harness.
 */
export interface TopicSelectionN8CalibrationCorpusEntry {
  corpus_entry_id: string;
  schema_version: 'TopicSelectionN8CalibrationCorpusEntry@v1';
  title_card_id: string;
  provenance: {
    author: string;
    created_at: string;
    source_note: string;
    derived_from?: string | null;
  };
  // (A) materialized N8 input bodies
  topic_question: CorpusBody;
  question_contract: CorpusBody;
  answerability_plan: CorpusBody;
  research_slice: CorpusBody;
  evidence: CorpusBody[];
  n8_debate_admission: CorpusBody;
  // (B) lineage-only stubs (minimal valid placeholders OK; filled if omitted)
  lineage_stubs?: {
    trial_ledger?: CorpusBody;
    topic_question_candidate_set?: CorpusBody;
    active_candidate?: CorpusBody;
    n7_handoff?: CorpusBody;
    candidate_grouping?: CorpusBody | null;
  };
  // (C) ground truth
  ground_truth_disposition: TopicSelectionN8CalibrationDisposition;
  expected_band: TopicSelectionN8CalibrationExpectedBand;
  labeler_notes: string;
}

export interface MaterializeN8CalibrationDeps {
  controlPlane?: TopicSelectionControlPlaneService;
  idFactory?: (prefix: string) => string;
  now?: () => string;
  workflowRunId?: string;
  nodeAttemptId?: string;
}

export interface MaterializeN8CalibrationResult {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  controlPlane: TopicSelectionControlPlaneService;
  projectionRef: TopicSelectionFunctionalRef;
  /** Maps each lineage slot → its recorded artifact ref (handy for the codex agent + debugging). */
  bodyRefs: Record<string, TopicSelectionFunctionalRef>;
}

function stubHash(seed: string): string {
  return sha256Text(`n8-calibration-stub:${seed}`);
}

const DEFAULT_LINEAGE_STUB: CorpusBody = { note: 'calibration lineage stub — content-irrelevant to the N8 gate' };

/**
 * Build a gate-passing N8 RunRequest from a corpus entry. Records the bodies + the N7→N8 projection
 * into the (in-memory) control plane and assembles the frozen input so the projection's lineage and
 * the frozen payload are byte-equal by construction.
 */
export async function materializeN8CalibrationRunRequest(
  entry: TopicSelectionN8CalibrationCorpusEntry,
  deps: MaterializeN8CalibrationDeps = {},
): Promise<MaterializeN8CalibrationResult> {
  let sequence = 0;
  const idFactory = deps.idFactory ?? ((prefix: string) => `${prefix}_calib_${entry.corpus_entry_id}_${++sequence}`);
  const now = deps.now ?? (() => '2026-06-15T00:00:00.000Z');
  const controlPlane = deps.controlPlane
    ?? new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository(), { idFactory, now });
  const titleCardId = entry.title_card_id;
  const workflowRunId = deps.workflowRunId ?? `workflow_run_calib_${entry.corpus_entry_id}`;
  const nodeAttemptId = deps.nodeAttemptId ?? `node_attempt_calib_${entry.corpus_entry_id}`;

  const recordInline = async (payload: CorpusBody): Promise<{ ref: TopicSelectionFunctionalRef; hash: string }> => {
    const artifact = await controlPlane.recordArtifactRef({
      title_card_id: titleCardId,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: workflowRunId,
      payload,
      created_by: 'system',
    });
    return {
      ref: { ref_type: 'artifact_ref', ref_id: artifact.artifact_ref_id, title_card_id: titleCardId, version_id: null },
      hash: sha256Text(stableStringify(payload)),
    };
  };

  const stubs = entry.lineage_stubs ?? {};
  // Record every lineage body (value-bearing + stub). candidate_grouping stays null (omitted from the 9 pairs).
  const topicQuestion = await recordInline(entry.topic_question);
  const questionContract = await recordInline(entry.question_contract);
  const answerabilityPlan = await recordInline(entry.answerability_plan);
  const researchSlice = await recordInline(entry.research_slice);
  const n8DebateAdmission = await recordInline(entry.n8_debate_admission);
  const trialLedger = await recordInline(stubs.trial_ledger ?? { ...DEFAULT_LINEAGE_STUB, slot: 'trial_ledger' });
  const candidateSet = await recordInline(stubs.topic_question_candidate_set ?? { ...DEFAULT_LINEAGE_STUB, slot: 'topic_question_candidate_set' });
  const activeCandidate = await recordInline(stubs.active_candidate ?? { ...DEFAULT_LINEAGE_STUB, slot: 'active_candidate' });
  const n7Handoff = await recordInline(stubs.n7_handoff ?? { ...DEFAULT_LINEAGE_STUB, slot: 'n7_handoff' });

  // The 9 ref/hash pairs (candidate_grouping nullable) shared by the frozen payload AND the projection.
  const lineage = {
    topic_question_ref: topicQuestion.ref,
    topic_question_hash: topicQuestion.hash,
    topic_question_contract_ref: questionContract.ref,
    topic_question_contract_hash: questionContract.hash,
    answerability_plan_ref: answerabilityPlan.ref,
    answerability_plan_hash: answerabilityPlan.hash,
    trial_ledger_ref: trialLedger.ref,
    trial_ledger_hash: trialLedger.hash,
    topic_question_candidate_set_ref: candidateSet.ref,
    topic_question_candidate_set_hash: candidateSet.hash,
    active_candidate_ref: activeCandidate.ref,
    active_candidate_hash: activeCandidate.hash,
    selected_research_slice_ref: researchSlice.ref,
    selected_research_slice_hash: researchSlice.hash,
    n8_debate_admission_ref: n8DebateAdmission.ref,
    n8_debate_admission_hash: n8DebateAdmission.hash,
    candidate_grouping_ref: null,
    candidate_grouping_hash: null,
  } as const;

  const n7HandoffHash = n7Handoff.hash;

  // The projection — byte-mirrors buildN7ToN8TopicQuestionContractContextProjection (harness-service.ts:8236).
  const projectionPayload: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection = {
    schema_version: TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
    projection_kind: 'v1b_n7_to_n8_topic_question_contract_context',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    route_decision: 'invoke_next',
    non_authority: true,
    context_cache_scope: 'process_local_runtime_only',
    context_authority: 'non_authority_runtime_context',
    source_refs: [
      n7Handoff.ref,
      lineage.topic_question_ref,
      lineage.topic_question_contract_ref,
      lineage.answerability_plan_ref,
      lineage.trial_ledger_ref,
      lineage.topic_question_candidate_set_ref,
      lineage.active_candidate_ref,
      lineage.selected_research_slice_ref,
      lineage.n8_debate_admission_ref,
    ],
    source_hashes: {
      // Not cross-checked against the frozen payload (only 64-hex + key-presence enforced), but the
      // EXACT key set is required (hasExactHashKeys) — frozen_input_hash + n6_handoff_hash included.
      frozen_input_hash: stubHash(`${entry.corpus_entry_id}:frozen_input`),
      n6_handoff_hash: stubHash(`${entry.corpus_entry_id}:n6_handoff`),
      n7_handoff_hash: n7HandoffHash,
      topic_question_hash: lineage.topic_question_hash,
      topic_question_contract_hash: lineage.topic_question_contract_hash,
      answerability_plan_hash: lineage.answerability_plan_hash,
      trial_ledger_hash: lineage.trial_ledger_hash,
      topic_question_candidate_set_hash: lineage.topic_question_candidate_set_hash,
      active_candidate_hash: lineage.active_candidate_hash,
      selected_research_slice_hash: lineage.selected_research_slice_hash,
      n8_debate_admission_hash: lineage.n8_debate_admission_hash,
    },
    support_refs: [],
    support_hashes: {},
    preserved_fact_kinds: [
      'topic_question_contract',
      'answerability_plan',
      'active_candidate_identity',
      'candidate_set_identity',
      'trial_ledger',
      'n8_debate_admission',
      'candidate_grouping',
      'accepted_risk_refs',
      'risk_gap_recheck_hints',
    ],
    n7_handoff_ref: n7Handoff.ref,
    n7_handoff_hash: n7HandoffHash,
    topic_question_ref: lineage.topic_question_ref,
    topic_question_hash: lineage.topic_question_hash,
    topic_question_contract_ref: lineage.topic_question_contract_ref,
    topic_question_contract_hash: lineage.topic_question_contract_hash,
    answerability_plan_ref: lineage.answerability_plan_ref,
    answerability_plan_hash: lineage.answerability_plan_hash,
    trial_ledger_ref: lineage.trial_ledger_ref,
    trial_ledger_hash: lineage.trial_ledger_hash,
    topic_question_candidate_set_ref: lineage.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: lineage.topic_question_candidate_set_hash,
    active_candidate_ref: lineage.active_candidate_ref,
    active_candidate_hash: lineage.active_candidate_hash,
    selected_research_slice_ref: lineage.selected_research_slice_ref,
    selected_research_slice_hash: lineage.selected_research_slice_hash,
    n8_debate_admission_ref: lineage.n8_debate_admission_ref,
    n8_debate_admission_hash: lineage.n8_debate_admission_hash,
    candidate_grouping_ref: lineage.candidate_grouping_ref,
    candidate_grouping_hash: lineage.candidate_grouping_hash,
  };

  // Record the projection with an explicit checksum === sha256Text(stableStringify(payload)) so
  // resolveN7ToN8Projection's recompute matches exactly (it rejects on drift).
  const projectionArtifact = await controlPlane.recordArtifactRef({
    title_card_id: titleCardId,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: workflowRunId,
    payload: projectionPayload as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(projectionPayload)),
    created_by: 'system',
  });
  const projectionRef: TopicSelectionFunctionalRef = {
    ref_type: 'artifact_ref',
    ref_id: projectionArtifact.artifact_ref_id,
    title_card_id: titleCardId,
    version_id: null,
  };

  // Frozen payload — the 9 pairs + n7_handoff_hash, copied off the projection so they are byte-equal.
  const frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload = {
    n7_handoff_hash: n7HandoffHash,
    topic_question_ref: lineage.topic_question_ref,
    topic_question_hash: lineage.topic_question_hash,
    topic_question_contract_ref: lineage.topic_question_contract_ref,
    topic_question_contract_hash: lineage.topic_question_contract_hash,
    answerability_plan_ref: lineage.answerability_plan_ref,
    answerability_plan_hash: lineage.answerability_plan_hash,
    trial_ledger_ref: lineage.trial_ledger_ref,
    trial_ledger_hash: lineage.trial_ledger_hash,
    topic_question_candidate_set_ref: lineage.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: lineage.topic_question_candidate_set_hash,
    active_candidate_ref: lineage.active_candidate_ref,
    active_candidate_hash: lineage.active_candidate_hash,
    selected_research_slice_ref: lineage.selected_research_slice_ref,
    selected_research_slice_hash: lineage.selected_research_slice_hash,
    n8_debate_admission_ref: lineage.n8_debate_admission_ref,
    n8_debate_admission_hash: lineage.n8_debate_admission_hash,
    candidate_grouping_ref: lineage.candidate_grouping_ref,
    candidate_grouping_hash: lineage.candidate_grouping_hash,
  };

  const sourceRefs: TopicSelectionFunctionalRef[] = [
    n7Handoff.ref,
    projectionRef,
    lineage.topic_question_ref,
    lineage.topic_question_contract_ref,
    lineage.answerability_plan_ref,
    lineage.trial_ledger_ref,
    lineage.topic_question_candidate_set_ref,
    lineage.active_candidate_ref,
    lineage.selected_research_slice_ref,
    lineage.n8_debate_admission_ref,
  ];

  const frozenInputBase = {
    input_contract: 'N7ToN8Handoff@v1',
    snapshot_kind: 'topic_question_contract',
    source_refs: sourceRefs,
    payload: frozenPayload as unknown as Record<string, unknown>,
  };
  const frozenInputHash = sha256Text(stableStringify(frozenInputBase));

  const request: TopicSelectionV1bWorkflowHarnessRunRequest = {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    node_id: N8_NODE_ID,
    policy_version: TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: { ...frozenInputBase, frozen_input_hash: frozenInputHash },
    created_by: 'system',
  };

  return {
    request,
    controlPlane,
    projectionRef,
    bodyRefs: {
      n7_handoff: n7Handoff.ref,
      topic_question: lineage.topic_question_ref,
      topic_question_contract: lineage.topic_question_contract_ref,
      answerability_plan: lineage.answerability_plan_ref,
      trial_ledger: lineage.trial_ledger_ref,
      topic_question_candidate_set: lineage.topic_question_candidate_set_ref,
      active_candidate: lineage.active_candidate_ref,
      selected_research_slice: lineage.selected_research_slice_ref,
      n8_debate_admission: lineage.n8_debate_admission_ref,
    },
  };
}

/**
 * Build a valid TopicValueAssessmentDraft@v1 to feed the MOCK executor (verification only —
 * the real calibration run produces this from codex/the live model). Scores are caller-supplied
 * so a test can assert capture reads the draft (not provenance).
 */
export function buildN8CalibrationMockDraft(
  evidenceRef: TopicSelectionFunctionalRef,
  scores: { total_score: number; confidence: number; reviewerRiskScore?: number; otherDimScore?: number },
): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const otherScore = scores.otherDimScore ?? 84;
  const reviewerRiskScore = scores.reviewerRiskScore ?? 72;
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'Calibration mock draft — runtime verification only.',
    fallback_claim_if_success: 'Calibration mock draft fallback.',
    hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
      gate_key: gateKey,
      verdict: 'pass' as const,
      severity: 'info' as const,
      overridable_with_risk: false,
      rationale: `${gateKey} passes in the calibration mock draft.`,
      refs: [evidenceRef],
    })),
    dimension_scores: TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
      dimension_key: dimensionKey,
      score: dimensionKey === 'reviewer_risk' ? reviewerRiskScore : otherScore,
      rationale: `${dimensionKey} score for the calibration mock draft.`,
      evidence_refs: [evidenceRef],
      uncertainty: 'medium',
    })),
    risk_penalty: { residual_risk: 'bounded' },
    reviewer_objections: ['Calibration mock — not a real assessment.'],
    ceiling_case: 'Calibration mock ceiling.',
    base_case: 'Calibration mock base.',
    floor_case: 'Calibration mock floor.',
    recommended_disposition: 'advance_to_package',
    total_score: scores.total_score,
    value_summary: 'Calibration mock draft used only to verify the materialized RunRequest passes the N8 gates.',
    confidence: scores.confidence,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Calibration mock draft.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'Calibration mock value thesis.',
      significance: 'Calibration mock significance.',
      originality: 'Calibration mock originality.',
      claim_leverage: 'Calibration mock claim leverage.',
      reviewer_risks: ['Calibration mock reviewer risk.'],
      effort_to_value: 'Calibration mock effort-to-value.',
      strategic_fit: 'Calibration mock strategic fit.',
      negative_memory_check: 'Calibration mock negative memory check.',
      evidence_backed_rationale: 'Calibration mock rationale.',
      top_objections: ['Calibration mock objection.'],
      uncertainty: 'Calibration mock uncertainty.',
      disposition_bridge: 'Calibration mock disposition bridge.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [evidenceRef],
    },
  };
}

export interface VerifyN8CalibrationResult {
  status: 'succeeded' | 'blocked';
  structured_output: TopicSelectionV1bTopicValueAssessmentDraftPayload | null;
  invocation_status: string;
  error_code: string | null;
  context_packet_hash: string | null;
}

/**
 * Verify a materialized RunRequest passes the N8 pre-model gates by invoking the REAL
 * generateDraftArtifact with a MOCK executor (no provider call). Throws (AppError INVALID_PAYLOAD)
 * if a lineage/manifest gate rejects; returns {status:'blocked'} if the gates pass but the mock
 * draft is bad. This is the drift guardrail for the hand-constructed projection.
 */
export async function verifyN8CalibrationRunRequest(
  materialized: MaterializeN8CalibrationResult,
  mockDraft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
): Promise<VerifyN8CalibrationResult> {
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(materialized.controlPlane);
  const result = await runtime.generateDraftArtifact({
    request: materialized.request,
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: { fixture_id: `n8-calib-${materialized.request.workflow_run_id}`, output: mockDraft },
    created_by: 'system',
  });
  if (result.status === 'succeeded') {
    return {
      status: 'succeeded',
      structured_output: result.structured_output,
      invocation_status: result.invocation_result.status,
      error_code: null,
      context_packet_hash: result.context_packet_hash,
    };
  }
  return {
    status: 'blocked',
    structured_output: null,
    invocation_status: result.invocation_result.status,
    error_code: result.invocation_result.error_code ?? null,
    context_packet_hash: null,
  };
}
