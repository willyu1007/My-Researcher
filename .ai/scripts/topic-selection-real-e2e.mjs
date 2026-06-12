import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import { buildApp } from '../../apps/backend/src/app.ts';
import { BackendLlmGateway } from '../../apps/backend/src/services/llm-gateway.ts';
import { PrismaTopicSelectionControlPlaneRepository } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-control-plane-repository.ts';
import { PrismaTopicSelectionNeedValidationRepository } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-need-validation-repository.ts';
import { TopicSelectionAgentOrchestratorService } from '../../apps/backend/src/services/topic-selection-agent-orchestrator-service.ts';
import { TopicSelectionControlPlaneService } from '../../apps/backend/src/services/topic-selection-control-plane-service.ts';
import { TopicSelectionGenerateNeedCandidateOrchestratorAdapterService } from '../../apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts';
import {
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
} from '../../apps/backend/src/services/topic-selection-model-profile-registry-service.ts';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from '../../apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts';
import { TopicSelectionNeedDiscoveryContextCompilerService } from '../../apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.ts';
import { TopicSelectionPersistNeedCandidateBatchService } from '../../apps/backend/src/services/topic-selection-persist-need-candidate-batch-service.ts';
import { TopicSelectionWorkflowHarnessService } from '../../apps/backend/src/services/topic-selection-workflow-harness-service.ts';

const TOPIC_ID = process.env.TOPIC_SELECTION_REAL_TOPIC_ID ?? 'ai-rag-finetuning-2022-2026';
const PROVIDER_ID = process.env.TOPIC_SELECTION_REAL_PROVIDER_ID === 'dashscope' ? 'dashscope' : 'openai';
const MODEL_ID = process.env.TOPIC_SELECTION_REAL_MODEL_ID ?? 'gpt-5.5';
const LITERATURE_LIMIT = Number.parseInt(process.env.TOPIC_SELECTION_REAL_LITERATURE_LIMIT ?? '16', 10);
const LLM_TIMEOUT_MS = Number.parseInt(process.env.TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS ?? '180000', 10);
const LLM_MAX_RETRIES = Number.parseInt(process.env.TOPIC_SELECTION_REAL_LLM_MAX_RETRIES ?? '3', 10);
const USE_MOCK_LLM = process.env.TOPIC_SELECTION_REAL_FLOW_MOCK_LLM === '1';
const V1A_GENERATE_EXECUTION_MODE = normalizeExecutionMode(
  process.env.TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE,
  USE_MOCK_LLM ? 'mocked_llm' : 'provider_llm',
);
const ALLOW_NON_ADVANCE_V1B = process.env.TOPIC_SELECTION_REAL_ALLOW_NON_ADVANCE_V1B === '1';
const QUALITY_NEGATIVE_MODE = process.env.TOPIC_SELECTION_REAL_QUALITY_NEGATIVE_MODE === '1';
const EXISTING_RESOURCE_SAMPLE_SET_ID = process.env.TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID?.trim() || null;
const RUN_ID = process.env.TOPIC_SELECTION_REAL_RUN_ID ?? uniqueId('real-e2e');
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/topic-selection-real-e2e', RUN_ID);

const ROLE_ORDER = ['support', 'challenge', 'baseline', 'context'];
const VALUE_GATE_KEYS = [
  'value_signal',
  'non_solved_sanity',
  'answerability_sanity',
  'feasibility_sanity',
  'evidence_sanity',
  'claim_ceiling_fit',
];
const VALUE_DIMENSION_KEYS = [
  'significance',
  'originality',
  'answerability',
  'feasibility',
  'claim_ceiling_fit',
  'reviewer_risk',
  'effort_to_value_fit',
  'strategic_fit',
  'negative_memory_check',
];
const MOCK_RESOURCE_RISK_PATTERN = /poison|adversarial|attack|leak|hallucination|conflict|verification|source verification|failure|robust|safety/u;
const REAL_E2E_CANARY_SCENARIO_ID = 'topic-selection.real-e2e.canary.v1';
const REAL_E2E_SCENARIO_ID = process.env.TOPIC_SELECTION_WORKFLOW_SCENARIO_ID?.trim()
  || process.env.TOPIC_SELECTION_REAL_SCENARIO_ID?.trim()
  || REAL_E2E_CANARY_SCENARIO_ID;
const GENERATE_NEED_CANDIDATE_NODE_ID = 'topic-selection.v1a.generate-need-candidate.v1';

let currentStage = 'bootstrap';

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeExecutionMode(value, fallback) {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }
  if (['mocked_llm', 'codex_assisted', 'provider_llm'].includes(normalized)) {
    return normalized;
  }
  throw new Error(`Unsupported TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE: ${value}`);
}

function ref(refType, refId, titleCardId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  };
}

function manualLocator(input) {
  return {
    locator_type: 'manual',
    locator_ref: ref('manual_locator', input.key, input.titleCardId),
    literature_ref: input.literatureRef,
    source_ref: input.sourceRef,
    content_ref: null,
    section_ref: null,
    paragraph_ref: null,
    anchor_ref: null,
    manual_label: input.label,
  };
}

function requiredAction(actionCode, refs) {
  return {
    action_code: actionCode,
    severity: 'blocking',
    loopback_target: 'package',
    refs,
    reason: `${actionCode} must be checked before the draft moves downstream.`,
  };
}

function stableBridgeFields(bridge) {
  return {
    bridge_status: bridge.bridge_status,
    bridge_payload_hash: bridge.bridge_payload_hash,
    working_copy_payload_hash: bridge.working_copy_payload_hash,
    source_promotion_decision_id: bridge.source_promotion_decision_id,
    promotion_input_snapshot_id: bridge.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
    paper_project_intake_ref: bridge.paper_project_intake_ref ?? null,
    target_paper_project_ref: bridge.target_paper_project_ref ?? null,
  };
}

function makeTopicQuestionCandidateRef(candidate, titleCardId) {
  return ref('topic_question_candidate', candidate.topic_question_candidate_id, titleCardId);
}

function makeResearchSliceRef(researchSlice, titleCardId) {
  return ref('research_slice', researchSlice.research_slice_id, titleCardId, researchSlice.version ?? null);
}

function valueDispositionForAssessment(valueAssessment) {
  const assessment = valueAssessment.topic_value_assessment;
  const memo = valueAssessment.value_reasoning_memo;
  const readiness = assessment.readiness_status;
  const recommendation = memo?.recommendation;
  if ((readiness === 'ready' || readiness === 'ready_with_accepted_risk') && recommendation === 'advance_to_package') {
    return { decision: 'advance_to_package', loopback_target_ref: null };
  }
  const nonAdvance = recommendation && recommendation !== 'advance_to_package'
    ? recommendation
    : readiness === 'recheck_required'
      ? 'recheck_evidence_or_search'
      : readiness === 'parked'
        ? 'park'
        : readiness === 'blocked' || readiness === 'dropped'
          ? 'drop'
          : 'refine_question';
  const snapshot = valueAssessment.topic_value_input_snapshot;
  if (nonAdvance === 'refine_question') {
    return { decision: nonAdvance, loopback_target_ref: snapshot.topic_question_contract_ref };
  }
  if (nonAdvance === 'refine_slice') {
    return { decision: nonAdvance, loopback_target_ref: snapshot.research_slice_ref };
  }
  if (nonAdvance === 'recheck_evidence_or_search') {
    return {
      decision: nonAdvance,
      loopback_target_ref: snapshot.recheck_request_refs?.[0] ?? ref('recheck_request', 'pending', assessment.title_card_id),
    };
  }
  return { decision: nonAdvance, loopback_target_ref: null };
}

function realFlowModel(profileId) {
  return {
    providerId: PROVIDER_ID,
    modelId: MODEL_ID,
    profileId,
  };
}

function parseJsonMessage(request, key) {
  const content = request.messages.at(-1)?.content ?? '{}';
  const parsed = JSON.parse(content);
  return key ? parsed[key] : parsed;
}

function mockTelemetry(request) {
  return {
    provider_id: 'mock',
    model_id: request.model?.modelId ?? MODEL_ID,
    profile_id: request.model?.profileId ?? null,
    prompt_template_id: request.prompt?.promptTemplateId ?? null,
    prompt_template_version: request.prompt?.version ?? null,
    elapsed_ms: 1,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: 0,
    output_tokens: 0,
    embedding_input_tokens: null,
    total_tokens: 0,
    cost_usd: null,
  };
}

function roleScores(primaryRole) {
  return {
    support: primaryRole === 'support' ? 0.92 : 0.12,
    challenge: primaryRole === 'challenge' ? 0.92 : 0.12,
    baseline: primaryRole === 'baseline' ? 0.92 : 0.12,
    context: primaryRole === 'context' ? 0.92 : 0.12,
    review: primaryRole === 'review' ? 0.92 : 0.02,
    excluded: primaryRole === 'excluded' ? 0.92 : 0.02,
  };
}

function resourceCandidateText(candidate) {
  return `${candidate.title ?? ''} ${candidate.abstract ?? ''} ${candidate.key_content_digest ?? ''} ${(candidate.tags ?? []).join(' ')}`.toLowerCase();
}

function classifyResourceCandidate(candidate) {
  const text = resourceCandidateText(candidate);
  if (MOCK_RESOURCE_RISK_PATTERN.test(text)) {
    return {
      role: 'challenge',
      polarity: 'risk_or_failure',
      rationale: 'Risk or failure-mode evidence for the topic-selection challenge role.',
      methodFamilies: ['risk_analysis'],
    };
  }
  if (/benchmark|evaluat|comparison|compare|baseline|dataset|leaderboard|metric|ablation|empirical/u.test(text)) {
    return {
      role: 'baseline',
      polarity: 'evaluation_baseline',
      rationale: 'Benchmark or comparison evidence for baseline calibration.',
      methodFamilies: ['evaluation'],
    };
  }
  if (/attention is all you need|transformer|bert|word representations|foundation|background|context|representation|optimization/u.test(text)) {
    return {
      role: 'context',
      polarity: 'foundation_context',
      rationale: 'Foundational or background evidence for context framing.',
      methodFamilies: ['foundation_model_context'],
    };
  }
  return {
    role: 'support',
    polarity: 'positive_method',
    rationale: 'Positive method evidence for RAG, fine-tuning, retrieval, or attribution workflow support.',
    methodFamilies: /fine[- ]?tuning|finetun|lora|adapter/u.test(text) ? ['fine_tuning'] : ['retrieval_augmented_generation'],
  };
}

function roleTargetFor(role, roleTargets) {
  return roleTargets?.[role] ?? 1;
}

function assignResourceRole(entry, role) {
  entry.draft.primary_role = role;
  entry.draft.evidence_polarity = {
    support: 'positive_method',
    challenge: 'risk_or_failure',
    baseline: 'evaluation_baseline',
    context: 'foundation_context',
  }[role];
  entry.draft.role_scores = roleScores(role);
  entry.draft.classification_rationale = `Deterministic mock assigned ${role} to satisfy role-balanced E2E coverage.`;
  entry.draft.method_families = role === 'support' ? ['fine_tuning'] : entry.draft.method_families;
}

function forceRoleCoverage(entries, roleTargets) {
  const roleCounts = () => ROLE_ORDER.reduce((counts, role) => {
    counts[role] = entries.filter((entry) => entry.draft.primary_role === role).length;
    return counts;
  }, {});
  for (const role of ROLE_ORDER) {
    let counts = roleCounts();
    while ((counts[role] ?? 0) < roleTargetFor(role, roleTargets)) {
      const donor = entries.find((entry) => {
        const donorRole = entry.draft.primary_role;
        const donorSurplus = (counts[donorRole] ?? 0) > roleTargetFor(donorRole, roleTargets);
        const supportSafe = role !== 'support' || !MOCK_RESOURCE_RISK_PATTERN.test(entry.text);
        return donorRole !== role && donorSurplus && supportSafe;
      });
      if (!donor) {
        break;
      }
      assignResourceRole(donor, role);
      counts = roleCounts();
    }
  }
}

function makeResourceSamplingOutput(request) {
  const payload = parseJsonMessage(request);
  const candidates = payload.eligible_candidates ?? [];
  const entries = candidates.map((candidate) => {
    const classified = classifyResourceCandidate(candidate);
    return {
      text: resourceCandidateText(candidate),
      draft: {
        literature_ref: candidate.literature_ref,
        primary_role: classified.role,
        topic_relevance: 0.86,
        evidence_polarity: classified.polarity,
        role_scores: roleScores(classified.role),
        confidence: 0.84,
        classification_rationale: classified.rationale,
        exclusion_reason: null,
        review_reason: null,
        method_families: classified.methodFamilies,
      },
    };
  });
  forceRoleCoverage(entries, payload.role_targets ?? {});
  return { classifications: entries.map((entry) => entry.draft) };
}

function makeResearchSliceOutput(request) {
  const planningInput = parseJsonMessage(request, 'planning_input_json');
  const roleBundle = planningInput.evidence_role_bundle ?? {};
  const option = {
    option_key: 'rag-finetuning-decision-boundary',
    source_validated_need_refs: [planningInput.validated_need_ref],
    slice_statement:
      'Bound the topic to an auditable decision boundary for when RAG, fine-tuning, or hybrid adaptation is justified.',
    problem_space: 'Reviewer-auditable RAG and fine-tuning decision workflows.',
    target_setting: 'Local-first paper engineering over imported CS literature.',
    target_community: planningInput.target_community,
    included_boundaries: [
      'Offline evidence synthesis over the imported RAG and fine-tuning resource pool.',
      'Decision criteria for answer quality, attribution, and residual risk.',
    ],
    excluded_boundaries: planningInput.non_goals ?? [],
    contribution_type_candidate: planningInput.intended_contribution_style ?? 'evaluation framework and decision protocol',
    support_evidence_refs: roleBundle.support_unit_refs ?? [],
    challenge_evidence_refs: roleBundle.challenge_unit_refs ?? [],
    baseline_evidence_refs: roleBundle.baseline_unit_refs ?? [],
    context_evidence_refs: roleBundle.context_unit_refs ?? [],
    resource_assumptions: planningInput.resource_constraints ?? [],
    data_assumptions: ['Imported key-content records are sufficient for offline rehearsal.'],
    evaluation_path: 'Compare evidence-linked decision quality against a manual topic-selection baseline.',
    baseline_assumptions: ['Manual spreadsheet evidence triage is the comparison baseline.'],
    hard_blockers: [],
    dependency_risks: ['Evidence freshness and benchmark comparability require reviewer attention.'],
    slice_budget: planningInput.feasibility_budget ?? { person_weeks: 2 },
    expected_claim:
      'A role-balanced evidence workflow can make RAG versus fine-tuning topic decisions more auditable in offline rehearsal.',
    fallback_claim:
      'The workflow exposes evidence gaps and risk boundaries earlier than unstructured topic selection.',
    observable_success_criteria: [
      'Every decision has support, challenge, baseline, and context evidence refs.',
      'Residual risks are carried forward explicitly.',
    ],
    main_risks: ['Resource pool coverage may still underrepresent some fine-tuning benchmarks.'],
    baseline_risk: 'medium',
    execution_risk: 'medium',
    scope_risk: 'low',
    claim_ceiling_alignment: {
      status: 'aligned',
      rationale: 'Claims remain limited to offline topic-selection rehearsal and evidence traceability.',
      confidence: 0.84,
    },
    confidence: 0.84,
    requires_human_review: false,
    human_review_triggers: [],
    details_payload: { mock_llm: true, run_id: RUN_ID },
  };
  return {
    recommended_option_key: option.option_key,
    comparison_axes: ['traceability', 'answerability', 'risk carry-forward'],
    comparison_summary: 'The recommended slice is bounded and covers support, challenge, baseline, and context evidence.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [option],
  };
}

function evidenceRefsByRole(formationInput, role) {
  return (formationInput.evidence_refs ?? [])
    .filter((item) => item.evidence_role === role)
    .map((item) => item.evidence_ref);
}

function firstEvidenceRef(formationInput) {
  return formationInput.evidence_refs?.[0]?.evidence_ref
    ?? ref('evidence_unit', 'mock_evidence_unit', formationInput.research_slice_ref.title_card_id);
}

function boundaryRefs(formationInput, kind) {
  return (formationInput.boundaries ?? [])
    .filter((item) => item.boundary_kind === kind)
    .map((item) => ref('research_slice_boundary', item.research_slice_boundary_id, item.title_card_id));
}

function assumptionRefs(formationInput) {
  return (formationInput.assumptions ?? [])
    .map((item) => ref('research_slice_assumption', item.research_slice_assumption_id, item.title_card_id));
}

function makeTopicQuestionOutput(request) {
  const formationInput = parseJsonMessage(request, 'topic_question_formation_input_json');
  const supportRefs = evidenceRefsByRole(formationInput, 'support');
  const challengeRefs = evidenceRefsByRole(formationInput, 'challenge');
  const baselineRefs = evidenceRefsByRole(formationInput, 'baseline');
  const contextRefs = evidenceRefsByRole(formationInput, 'context');
  const mappedRefs = [
    ...supportRefs,
    ...challengeRefs,
    ...baselineRefs,
    ...contextRefs,
  ];
  const preservedBoundaryRefs = boundaryRefs(formationInput, 'included');
  const excludedBoundaryRefs = boundaryRefs(formationInput, 'excluded');
  const candidate = {
    candidate_key: 'rag-finetuning-answerability-risk',
    main_question:
      'When does role-balanced evidence justify RAG, fine-tuning, or hybrid adaptation for auditable answer quality and attribution improvements?',
    sub_questions: [
      'Which benchmark or comparison evidence supports the decision boundary?',
      'Which poisoning, leakage, or source-verification risks must be accepted or mitigated?',
    ],
    question_type: 'analysis',
    contribution_hypothesis: 'analysis',
    source_validated_need_refs: [formationInput.validated_need_ref],
    answerability_plan: {
      datasets_or_resources: formationInput.value_assessment_inputs ?? ['Imported RAG and fine-tuning literature resources'],
      metrics: ['trace completeness', 'risk coverage', 'claim-ceiling fit'],
      baselines: ['manual topic-selection triage'],
      ablations_or_comparisons: ['with versus without challenge evidence carry-forward'],
      evaluation_setting: formationInput.evaluation_path,
      dependency_risks: formationInput.dependency_risks ?? [],
      open_dependencies: ['Reviewer must confirm benchmark comparability before claim strengthening.'],
      known_gaps: formationInput.gap_codes ?? [],
      required_evidence_refs: mappedRefs.length > 0 ? mappedRefs : [firstEvidenceRef(formationInput)],
    },
    answerability_verdict: 'answerable_with_risk',
    expected_claim: formationInput.expected_claim,
    fallback_claim: formationInput.fallback_claim,
    max_claim_strength: 'Offline topic-selection auditability over imported evidence only.',
    observable_success_criteria: formationInput.observable_success_criteria ?? [],
    boundary_check: {
      preserved_boundary_refs: preservedBoundaryRefs,
      excluded_boundary_refs: excludedBoundaryRefs,
      boundary_violations: [],
      prohibited_claims: formationInput.non_goals ?? [],
      allowed_refinements: ['Narrow to one venue class or one evaluation substrate if evidence coverage is weak.'],
    },
    traceability_check: {
      support_evidence_refs: supportRefs,
      challenge_evidence_refs: challengeRefs,
      baseline_evidence_refs: baselineRefs,
      context_evidence_refs: contextRefs,
      mapped_evidence_refs: mappedRefs.length > 0 ? mappedRefs : [firstEvidenceRef(formationInput)],
      unmapped_assumptions: (formationInput.assumptions ?? []).map((item) => item.statement),
    },
    falsification_conditions: [
      {
        condition_type: 'solved_by_baseline',
        severity: 'hard',
        statement: 'Manual triage matches the same trace completeness and risk-carry-forward quality.',
        trigger_evidence_refs: baselineRefs.length > 0 ? baselineRefs : [firstEvidenceRef(formationInput)],
        trigger_source_refs: challengeRefs.length > 0 ? challengeRefs : [firstEvidenceRef(formationInput)],
        related_contract_fields: ['expected_claim', 'max_claim_strength'],
        expected_action: 'lower_claim_strength',
        check_timing: 'before_value_assessment',
        confidence: 'medium',
      },
    ],
    risk_notes: ['Residual benchmark comparability and risk coverage uncertainty remain explicit.'],
    blockers: [],
    objections: ['A reviewer may ask whether the resource pool covers enough fine-tuning benchmarks.'],
    human_review_triggers: [],
    confidence: 0.82,
  };
  return {
    question_frame: {
      target_setting: formationInput.research_slice_ref.title_card_id ? 'Local-first title-card evidence workflow.' : 'Local-first topic-selection workflow.',
      target_community: formationInput.target_community,
      object_scope: formationInput.problem_space,
      task_scope: formationInput.slice_statement,
      intervention_or_approach: 'Role-balanced evidence sampling before v1a decision-chain execution.',
      comparison_baseline: 'Manual topic-selection triage over the same literature pool.',
      observable_outcome: 'Trace completeness, risk carry-forward, and claim-ceiling fit.',
      assumption_refs: assumptionRefs(formationInput),
      evidence_refs: mappedRefs.length > 0 ? mappedRefs : [firstEvidenceRef(formationInput)],
      frame_payload: { mock_llm: true, run_id: RUN_ID },
    },
    recommended_candidate_keys: [candidate.candidate_key],
    generation_notes: ['Deterministic mock LLM produced one answerable-with-risk candidate for E2E validation.'],
    human_review_triggers: [],
    candidates: [candidate],
  };
}

function makeGate(gateKey, refs) {
  if (QUALITY_NEGATIVE_MODE && (gateKey === 'answerability_sanity' || gateKey === 'claim_ceiling_fit')) {
    return {
      gate_key: gateKey,
      verdict: 'fail',
      severity: 'blocking',
      overridable_with_risk: false,
      rationale: `${gateKey} fails in quality-negative mode because the question is too broad for package advancement.`,
      refs,
    };
  }
  return {
    gate_key: gateKey,
    verdict: 'pass',
    severity: 'info',
    overridable_with_risk: false,
    rationale: `${gateKey} passed under bounded real-flow rehearsal assumptions.`,
    refs,
  };
}

function makeDimension(dimensionKey, evidenceRefs) {
  const negativeScoreByDimension = {
    answerability: 48,
    feasibility: 55,
    claim_ceiling_fit: 44,
    reviewer_risk: 42,
  };
  const score = QUALITY_NEGATIVE_MODE
    ? negativeScoreByDimension[dimensionKey] ?? 62
    : dimensionKey === 'reviewer_risk' ? 72 : 84;
  return {
    dimension_key: dimensionKey,
    score,
    rationale: QUALITY_NEGATIVE_MODE
      ? `${dimensionKey} exposes a quality-negative boundary; the topic must be refined before package advancement.`
      : `${dimensionKey} is sufficient for advancing to a draft package, with residual risk carried forward.`,
    evidence_refs: evidenceRefs,
    uncertainty: QUALITY_NEGATIVE_MODE
      ? 'High uncertainty from over-broad question framing and claim-ceiling mismatch.'
      : 'Moderate uncertainty from a small but role-balanced resource pool.',
  };
}

function makeTopicValueOutput(request) {
  const payload = parseJsonMessage(request);
  const valueInput = payload.topic_value_assessment_input_json;
  const evidenceRefs = (valueInput.evidence_refs ?? []).map((item) => item.evidence_ref);
  const citedRefs = evidenceRefs.length > 0 ? evidenceRefs : [valueInput.topic_question_contract_ref];
  if (QUALITY_NEGATIVE_MODE) {
    return {
      readiness_status: 'needs_refinement',
      strongest_claim_if_success:
        'The current broad RAG-versus-fine-tuning question is not ready for a downstream topic package.',
      fallback_claim_if_success:
        'A narrower question could become package-ready after tightening answerability and claim ceiling.',
      hard_gates: VALUE_GATE_KEYS.map((gateKey) => makeGate(gateKey, [valueInput.topic_question_contract_ref])),
      dimension_scores: VALUE_DIMENSION_KEYS.map((dimensionKey) => makeDimension(dimensionKey, citedRefs)),
      risk_penalty: { overbroad_question: 18, claim_ceiling_mismatch: 16, evidence_specificity_gap: 12 },
      reviewer_objections: [
        'The question spans too many RAG, fine-tuning, and hybrid adaptation settings for a bounded package.',
        'The claim ceiling is too high for the currently selected evidence.',
      ],
      ceiling_case: 'No package-level claim should be made until the question is narrowed.',
      base_case: 'Refine the question around one evaluation substrate and one decision boundary.',
      floor_case: 'Stop before package creation and request a narrower topic-question contract.',
      recommended_disposition: 'refine_question',
      total_score: 56,
      value_summary: 'The value signal is present but not package-ready; v1b must loop back to question refinement.',
      confidence: 0.81,
      accepted_risk_refs: valueInput.accepted_risk_refs ?? [],
      blocker_refs: [],
      risk_notes: ['Do not override this negative into package advancement.'],
      reasoning_memo: {
        recommendation: 'refine_question',
        value_thesis: 'The selected evidence is useful, but the current question is too broad to support a package.',
        significance: 'The area remains significant, but the research object must be narrower.',
        originality: 'The proposed decision boundary needs clearer contrast against existing evaluation work.',
        claim_leverage: 'The claim ceiling currently exceeds the supportable evidence.',
        reviewer_risks: ['Overclaiming and weak answerability would be likely reviewer objections.'],
        effort_to_value: 'A narrower question is cheaper and safer than forcing package advancement.',
        strategic_fit: 'Looping back protects the topic-management workflow from low-quality promotion.',
        negative_memory_check: 'No negative memory blocks refinement; the issue is current framing quality.',
        evidence_backed_rationale: 'Evidence refs are present but do not support the broad package claim.',
        top_objections: ['Question scope is too broad.', 'Claim ceiling is too high.'],
        uncertainty: 'Refinement should reduce uncertainty before any package handoff.',
        disposition_bridge: 'Return to TopicQuestionContract refinement.',
        requires_critic_review: true,
        critic_triggers: ['overbroad_question', 'claim_ceiling_mismatch'],
        cited_refs: citedRefs,
      },
    };
  }
  return {
    readiness_status: (valueInput.accepted_risk_refs ?? []).length > 0 ? 'ready_with_accepted_risk' : 'ready',
    strongest_claim_if_success:
      'A role-balanced resource-sampling workflow improves auditability of RAG versus fine-tuning topic decisions in offline rehearsal.',
    fallback_claim_if_success:
      'The workflow exposes evidence gaps and residual risks earlier than manual topic-selection triage.',
    hard_gates: VALUE_GATE_KEYS.map((gateKey) => makeGate(gateKey, [valueInput.topic_question_contract_ref])),
    dimension_scores: VALUE_DIMENSION_KEYS.map((dimensionKey) => makeDimension(dimensionKey, citedRefs)),
    risk_penalty: { small_sample: 5, benchmark_comparability: 6 },
    reviewer_objections: ['The imported pool may not fully cover fine-tuning benchmark diversity.'],
    ceiling_case: valueInput.question_contract?.claim_ceiling ?? 'Offline evidence traceability claim only.',
    base_case: 'Traceable, role-balanced evidence supports a bounded topic package.',
    floor_case: 'Even if value is weaker, the flow surfaces risk and coverage gaps explicitly.',
    recommended_disposition: 'advance_to_package',
    total_score: 82,
    value_summary: 'The topic has enough bounded value to advance to package while carrying residual risks.',
    confidence: 0.82,
    accepted_risk_refs: valueInput.accepted_risk_refs ?? [],
    blocker_refs: [],
    risk_notes: ['Accepted risk propagation must remain visible in v1c bridge inputs.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'The workflow targets a concrete topic-selection failure: unstable evidence-role sampling.',
      significance: 'Reviewer-facing traceability and risk carry-forward are material to paper topic quality.',
      originality: 'The contribution is an auditable resource-sampling policy integrated before v1a.',
      claim_leverage: 'The claim stays bounded to offline rehearsal and decision auditability.',
      reviewer_risks: ['Resource-pool breadth and benchmark freshness require continued checks.'],
      effort_to_value: 'The work reuses existing literature and control-plane artifacts, so effort is proportional.',
      strategic_fit: 'It advances the selected topic-management workflow without changing v1a/v1b/v1c contracts.',
      negative_memory_check: 'No inherited negative memory blocks this bounded topic package.',
      evidence_backed_rationale: 'Support, challenge, baseline, and context refs are available and cited.',
      top_objections: ['The pool may need more fine-tuning-specific benchmark evidence.'],
      uncertainty: 'A larger real pool would reduce sampling variance.',
      disposition_bridge: 'Advance to package, then let v1c enforce promotion conditions.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: citedRefs,
    },
  };
}

class DeterministicRealFlowLlmGateway {
  async createStructuredOutput(request) {
    const parsed = {
      topic_selection_resource_sampling_classification: () => makeResourceSamplingOutput(request),
      topic_selection_research_slice_option_set: () => makeResearchSliceOutput(request),
      topic_selection_topic_question_candidate_set: () => makeTopicQuestionOutput(request),
      topic_selection_topic_value_assessment: () => makeTopicValueOutput(request),
    }[request.schemaName]?.();
    if (!parsed) {
      throw new Error(`Unsupported mock LLM schemaName: ${request.schemaName}`);
    }
    return {
      parsed,
      raw: { mock_llm: true, schemaName: request.schemaName, run_id: RUN_ID },
      telemetry: mockTelemetry(request),
    };
  }
}

function makeRealFlowLlmGateway() {
  if (USE_MOCK_LLM) {
    return new DeterministicRealFlowLlmGateway();
  }
  return new BackendLlmGateway({
    defaultTimeoutMs: LLM_TIMEOUT_MS,
    defaultMaxRetries: LLM_MAX_RETRIES,
  });
}

function makeV1aGenerateLlmGateway() {
  if (V1A_GENERATE_EXECUTION_MODE === 'provider_llm') {
    return new BackendLlmGateway({
      defaultTimeoutMs: LLM_TIMEOUT_MS,
      defaultMaxRetries: LLM_MAX_RETRIES,
    });
  }
  return new DeterministicRealFlowLlmGateway();
}

function makeWorkflowHarness(prisma, llmGateway) {
  const controlPlaneRepository = new PrismaTopicSelectionControlPlaneRepository(prisma);
  const needValidationRepository = new PrismaTopicSelectionNeedValidationRepository(prisma);
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository);
  const artifactBoundary = new TopicSelectionNeedDiscoveryArtifactBoundaryService(controlPlane);
  const contextCompiler = new TopicSelectionNeedDiscoveryContextCompilerService(artifactBoundary);
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway,
  });
  const generateNeedCandidateAdapter = new TopicSelectionGenerateNeedCandidateOrchestratorAdapterService({
    contextCompiler,
    agentOrchestrator,
    artifactBoundary,
    needCandidateBatchPersistence: new TopicSelectionPersistNeedCandidateBatchService(needValidationRepository),
  });
  return new TopicSelectionWorkflowHarnessService({
    contextCompiler,
    generateNeedCandidateAdapter,
    artifactBoundary,
    controlPlane,
  });
}

function v1aGenerateModelOptionId() {
  if (V1A_GENERATE_EXECUTION_MODE !== 'provider_llm') {
    return null;
  }
  return PROVIDER_ID === 'dashscope'
    ? `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.dashscope-thinking-budget`
    : `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-balanced`;
}

function assertStatus(response, expected, label) {
  if (response.statusCode !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, received ${response.statusCode}: ${response.body}`);
  }
}

async function requestJson(app, method, url, expected, payload, label = `${method} ${url}`) {
  currentStage = label;
  const response = await app.inject({ method, url, payload });
  assertStatus(response, expected, label);
  return response.json();
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function snippet(value, maxLength = 420) {
  const text = normalizeText(value);
  if (text.length <= maxLength) {
    return text;
  }
  const limit = Math.max(1, maxLength - 3);
  const boundaryWindow = text.slice(0, limit);
  const sentenceBoundary = Math.max(
    boundaryWindow.lastIndexOf('. '),
    boundaryWindow.lastIndexOf('? '),
    boundaryWindow.lastIndexOf('! '),
  );
  if (sentenceBoundary >= Math.floor(limit * 0.55)) {
    return `${boundaryWindow.slice(0, sentenceBoundary + 1).trim()}...`;
  }
  const wordBoundary = boundaryWindow.lastIndexOf(' ');
  const end = wordBoundary >= Math.floor(limit * 0.65) ? wordBoundary : limit;
  return `${boundaryWindow.slice(0, end).trim()}...`;
}

function stripLeadingTitle(title, value) {
  const text = normalizeText(value);
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) {
    return text;
  }
  const lowerText = text.toLowerCase();
  const lowerTitle = normalizedTitle.toLowerCase();
  if (lowerText === lowerTitle) {
    return '';
  }
  for (const separator of [':', '--', '-', '|']) {
    const prefix = `${lowerTitle}${separator}`;
    if (lowerText.startsWith(prefix)) {
      return text.slice(normalizedTitle.length + separator.length).trim();
    }
  }
  if (lowerText.startsWith(`${lowerTitle} `)) {
    return text.slice(normalizedTitle.length).trim();
  }
  return text;
}

function metadataBucket(resource) {
  for (const asset of resource.contentAssets) {
    const bucket = asset.metadata && typeof asset.metadata === 'object'
      ? asset.metadata.selection_bucket
      : null;
    if (typeof bucket === 'string' && bucket.trim()) {
      return bucket.trim();
    }
  }
  return null;
}

function titleAndDigest(resource) {
  return `${resource.title} ${resource.keyContentDigest ?? ''}`.toLowerCase();
}

function titleOnly(resource) {
  return String(resource.title ?? '').toLowerCase();
}

function hasCoreTopicSignal(resource) {
  const text = titleAndDigest(resource);
  return /\brag\b|retrieval-augmented|retrieval augmented|retrieval|fine-tun|finetun|source attribution|knowledge base/u.test(text);
}

function hasPrimaryApproachSignal(resource) {
  const text = titleAndDigest(resource);
  return /\brag\b|retrieval-augmented|retrieval augmented|fine-tun|finetun|agentic retrieval|source attribution|knowledge base/u.test(text);
}

function hasSpecificRiskSignal(resource) {
  const text = titleAndDigest(resource);
  const risk = /poison|wrong|conflict|not verified|leak|adversarial|hijack|stress|robust|attack|exfiltration|source verification/u.test(text);
  const surface = /\brag\b|retrieval|embedding|vector|knowledge base|source attribution|llm deep research/u.test(text);
  return risk && surface;
}

function isCanonicalContextResource(resource) {
  const title = titleOnly(resource);
  const text = titleAndDigest(resource);
  return /attention is all you need|bert:|word representations|transformer|adam:|batch normalization|deep residual learning/u.test(title)
    || /context optimization|deduplication|retrieval evaluation/u.test(text);
}

function isRealFlowCandidate(resource) {
  return hasCoreTopicSignal(resource)
    || hasSpecificRiskSignal(resource)
    || isCanonicalContextResource(resource);
}

function rolePredicate(role) {
  return (resource) => {
    const text = titleAndDigest(resource);
    const bucket = metadataBucket(resource);
    if (role === 'challenge') {
      return hasSpecificRiskSignal(resource);
    }
    if (role === 'baseline') {
      return hasCoreTopicSignal(resource)
        && /benchmark|evaluat|assessment|empirical|deduplication|deepchecks|dataset|comparison|public benchmark/u.test(text);
    }
    if (role === 'context') {
      return bucket === 'primary'
        || bucket === 'context'
        || isCanonicalContextResource(resource);
    }
    return hasPrimaryApproachSignal(resource) && !hasSpecificRiskSignal(resource);
  };
}

function sortResources(a, b) {
  const scoreDelta = (b.activationScore ?? 0) - (a.activationScore ?? 0);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }
  const yearDelta = (b.year ?? 0) - (a.year ?? 0);
  if (yearDelta !== 0) {
    return yearDelta;
  }
  return a.title.localeCompare(b.title);
}

function pickRoleBalancedResources(resources) {
  const selected = [];
  const selectedIds = new Set();
  const perRole = new Map();
  const perRoleTarget = Math.max(1, Math.floor(LITERATURE_LIMIT / ROLE_ORDER.length));

  for (const role of ROLE_ORDER) {
    const picks = resources
      .filter(rolePredicate(role))
      .filter((resource) => !selectedIds.has(resource.id))
      .slice(0, perRoleTarget);
    if (picks.length === 0) {
      const fallback = resources.find((resource) => !selectedIds.has(resource.id));
      if (fallback) {
        picks.push(fallback);
      }
    }
    perRole.set(role, picks);
    for (const resource of picks) {
      selected.push({ ...resource, evidenceRole: role });
      selectedIds.add(resource.id);
    }
  }

  for (const resource of resources) {
    if (selected.length >= LITERATURE_LIMIT) {
      break;
    }
    if (!selectedIds.has(resource.id)) {
      selected.push({ ...resource, evidenceRole: 'support' });
      selectedIds.add(resource.id);
    }
  }

  for (const role of ROLE_ORDER) {
    assert.ok((perRole.get(role) ?? []).length > 0, `no selected literature for ${role}`);
  }
  assert.ok(selected.length >= ROLE_ORDER.length, 'not enough role-balanced literature for real flow');

  return selected;
}

async function loadSampledResources(prisma, sampleResult) {
  currentStage = 'load resource sample details';
  if (sampleResult.sample_set.status === 'blocked') {
    throw new Error(`resource sample set blocked: ${JSON.stringify(sampleResult.sample_set.warnings)}`);
  }
  const selectedItems = sampleResult.selected_items
    .filter((item) => ROLE_ORDER.includes(item.selected_role));
  if (selectedItems.length < ROLE_ORDER.length) {
    throw new Error(`resource sample set underfilled target roles: ${JSON.stringify(sampleResult.sample_set.role_counts)}`);
  }
  const selectedIds = selectedItems.map((item) => item.literature_ref.ref_id);
  const rows = await prisma.topicLiteratureScope.findMany({
    where: {
      topicId: TOPIC_ID,
      literatureId: { in: selectedIds },
    },
    include: {
      literature: {
        include: {
          sources: true,
          contentAssets: {
            where: { status: { in: ['ready', 'READY'] } },
          },
          pipelineState: true,
        },
      },
    },
  });
  const rowByLiteratureId = new Map(rows.map((row) => [row.literatureId, row]));

  const resources = selectedItems.map((item) => {
    const row = rowByLiteratureId.get(item.literature_ref.ref_id);
    if (!row) {
      throw new Error(`sampled literature ${item.literature_ref.ref_id} not found in topic scope`);
    }
    return {
      id: row.literatureId,
      topicId: row.topicId,
      scopeStatus: row.scopeStatus,
      activationStatus: row.activationStatus,
      activationScore: row.activationScore,
      scopeReason: row.reason,
      evidenceRole: item.selected_role,
      sampleSetId: sampleResult.sample_set.resource_sample_set_id,
      sampleItemId: item.resource_sample_item_id,
      sampleRank: item.rank,
      evidencePolarity: item.evidence_polarity,
      classificationRationale: item.classification_rationale,
      samplingGuardrails: item.guardrail_codes,
      title: row.literature.title,
      year: row.literature.year,
      abstractText: row.literature.abstractText,
      keyContentDigest: row.literature.keyContentDigest,
      sources: row.literature.sources,
      contentAssets: row.literature.contentAssets,
      pipelineState: row.literature.pipelineState,
    };
  });

  for (const role of ROLE_ORDER) {
    assert.ok(resources.some((resource) => resource.evidenceRole === role), `sample did not select literature for ${role}`);
  }
  return resources;
}

async function createRealTitleCard(app, selectedResources) {
  currentStage = 'create title card';
  const card = await requestJson(app, 'POST', '/title-cards', 201, {
    working_title: `Real Topic Selection Flow: RAG vs Fine-Tuning Evidence ${RUN_ID}`,
    brief:
      'Actual topic-selection rehearsal over the ai-rag-finetuning-2022-2026 literature pool, using role-balanced evidence from real imported resources.',
  });
  assert.ok(card.title_card_id, 'title card creation did not return title_card_id');

  await requestJson(
    app,
    'PATCH',
    `/title-cards/${encodeURIComponent(card.title_card_id)}/evidence-basket`,
    200,
    { add_literature_ids: selectedResources.map((resource) => resource.id) },
    'attach real literature to title-card evidence basket',
  );

  return card.title_card_id;
}

function buildCoverageIntents(selectedResources) {
  const titleCardRefs = selectedResources.map((resource) => ({
    role: resource.evidenceRole,
    ref: resource.literatureRef,
  }));
  return ROLE_ORDER.map((role, index) => ({
    coverage_key: `${role}-real-evidence`,
    intent_type: role,
    query: {
      support:
        'RAG fine-tuning adaptation evidence for answer quality, attribution, or retrieval control in AI systems',
      challenge:
        'failure modes for RAG and fine-tuned LLM systems including poisoning, source verification, retrieval conflict, leakage, or robustness',
      baseline:
        'benchmarks and empirical comparisons for RAG, fine-tuning, retrieval evaluation, deduplication, or source attribution',
      context:
        'foundational model, transformer, representation learning, and optimization context that constrains RAG versus fine-tuning claims',
    }[role],
    expected_evidence_role: role,
    rationale: `Real-flow ${role} coverage over ${TOPIC_ID}.`,
    required: true,
    priority: index,
    refs: titleCardRefs.filter((item) => item.role === role).map((item) => item.ref),
  }));
}

function firstByRole(selectedResources, role) {
  const resource = selectedResources.find((item) => item.evidenceRole === role);
  assert.ok(resource, `missing selected resource for ${role}`);
  return resource;
}

function sourceStatement(resource) {
  const title = normalizeText(resource.title);
  const body = snippet(stripLeadingTitle(title, resource.keyContentDigest ?? resource.abstractText), 520);
  return title && body ? `${title}: ${body}` : title || body;
}

function evidenceUnitRefsByRole(evidenceMap, role, titleCardId) {
  return evidenceMap.evidence_units
    .filter((unit) => unit.evidence_role === role)
    .map((unit) => ref('evidence_unit', unit.evidence_unit_id, titleCardId, unit.evidence_map_version ?? null));
}

function evidenceRefTableEntries(evidenceMap, titleCardId) {
  return evidenceMap.evidence_units.map((unit) => ({
    evidence_ref: ref(
      'evidence_unit',
      unit.evidence_unit_id,
      titleCardId,
      unit.evidence_map_version ?? null,
    ),
    role: unit.evidence_role,
    evidence_role: unit.evidence_role,
  }));
}

function buildRealFlowRankedCandidateDraftBatch(input) {
  const {
    nodeAttemptId,
    titleCardId,
    evidenceMap,
    evidenceStrengthRef,
    conflictRef,
  } = input;
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: `ranked_candidate_batch_${RUN_ID}`,
      node_attempt_id: nodeAttemptId,
      terminal_result: 'finalize',
      ranking_rationale:
        'The candidate is grounded in role-balanced support, challenge, baseline, and context evidence from the real E2E resource sample.',
      max_persisted_candidates: 5,
    },
    drafts: [
      {
        draft_id: `draft_real_flow_need_${RUN_ID}`,
        rank: 1,
        candidate_need:
          'AI systems researchers need a bounded decision framework for when RAG, fine-tuning, or hybrid adaptation improves answer quality and source attribution without introducing unacceptable retrieval-conflict, poisoning, or leakage risks.',
        unmet_need_statement:
          'The current literature contains many RAG and fine-tuning variants, but the actionable boundary conditions for choosing among them remain hard to audit from evidence alone.',
        mechanism_type: 'evaluation_gap',
        mechanism_summary:
          'Benchmarks, attribution checks, and failure-mode evidence are fragmented across RAG, fine-tuning, and agentic retrieval papers.',
        mechanism_payload: {
          decision_boundary: 'RAG versus fine-tuning versus hybrid adaptation',
          evaluation_axes: ['answer_quality', 'source_attribution', 'retrieval_conflict_risk'],
          real_e2e_run_id: RUN_ID,
        },
        scope_notes:
          'Scope is limited to AI/RAG/fine-tuning literature in ai-rag-finetuning-2022-2026; no production deployment or universal superiority claims.',
        non_goal_notes:
          'Do not claim universal RAG superiority, universal fine-tuning superiority, or production deployment readiness.',
        prior_art_status: 'partial_solution_known',
        evidence_role_bundle: {
          support_unit_refs: evidenceUnitRefsByRole(evidenceMap, 'support', titleCardId),
          challenge_unit_refs: evidenceUnitRefsByRole(evidenceMap, 'challenge', titleCardId),
          baseline_unit_refs: evidenceUnitRefsByRole(evidenceMap, 'baseline', titleCardId),
          context_unit_refs: evidenceUnitRefsByRole(evidenceMap, 'context', titleCardId),
        },
        conflict_refs: [conflictRef],
        strength_assessment_refs: [evidenceStrengthRef],
        accepted_risk_refs: [],
        gap_codes: ['decision_boundary_evidence_fragmentation', 'risk_carry_forward_gap'],
        speculative: false,
        confidence: 0.82,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function buildExplorationPayload(input) {
  const roleCounts = ROLE_ORDER.reduce((counts, role) => {
    counts[role] = input.evidenceMap.evidence_units.filter((unit) => unit.evidence_role === role).length;
    return counts;
  }, {});
  return {
    topic_scope: {
      title_card_id: input.titleCardId,
      topic_id: TOPIC_ID,
      domain: 'RAG, fine-tuning, and hybrid adaptation decision boundaries for AI systems papers',
    },
    evidence_signal_digest: {
      role_counts: roleCounts,
      support_count: roleCounts.support ?? 0,
      challenge_count: roleCounts.challenge ?? 0,
      baseline_count: roleCounts.baseline ?? 0,
      context_count: roleCounts.context ?? 0,
    },
    resource_sample_digest: {
      sample_set_id: input.resourceSampleSetId,
      selected_literature_count: input.selectedResources.length,
      role_counts: roleCounts,
    },
    search_coverage_digest: {
      search_run_id: input.searchRunId,
      coverage: 'role_balanced_real_flow_sample',
    },
    sibling_candidate_digest: {
      candidate_count: 0,
    },
    decision_memory_digest: {
      required_challenges: [
        'avoid universal RAG or fine-tuning superiority claims',
        'carry poisoning, leakage, and source-verification risks forward',
      ],
    },
    exploration_prompts: [
      'Generate bounded, evidence-grounded need candidates that explain why the selected literature supports a topic-management decision.',
    ],
    challenge_prompts: [
      'Pressure-test whether challenge and baseline evidence prevent overclaiming.',
    ],
    allowed_outputs: ['ranked_candidate_draft_batch'],
    forbidden_outputs: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract', 'SearchPlan mutation'],
  };
}

function buildArbiterPayload(input) {
  return {
    node_policy_ref: ref('node_policy', GENERATE_NEED_CANDIDATE_NODE_ID, input.titleCardId, 'v1'),
    output_schema_ref: ref('schema', 'RankedCandidateDraftBatch@v1', input.titleCardId),
    authority_boundary: {
      authority_object: 'NeedCandidate',
      forbidden: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract', 'SearchPlan'],
    },
    max_persisted_candidates: 5,
    deterministic_gate_checklist: [
      'ranked_candidate_draft_batch_schema',
      'candidate_draft_admission',
      'supplemental_round_routing',
      'admitted_only_batch_persistence',
    ],
    role_level_summaries: [
      {
        role: 'single_agent',
        summary:
          'Real E2E canary uses the unified generate-need-candidate harness and persists only admitted drafts.',
      },
    ],
    candidate_pool_digest: {
      candidate_count: 0,
      candidate_entries: [],
    },
    evidence_ref_table: [
      ...evidenceRefTableEntries(input.evidenceMap, input.titleCardId),
      { evidence_ref: input.evidenceStrengthRef, role: 'strength' },
      { evidence_ref: input.conflictRef, role: 'challenge' },
    ],
    rejected_framing_table: [],
    unresolved_points: [],
    batch_ranking_rules: ['rank grounded, bounded, reviewer-auditable candidates first'],
    persistence_rules: ['persist only admitted drafts through NeedCandidate batch boundary'],
    failure_rules: ['block when ranked batch is malformed or no draft passes admission gates'],
  };
}

async function runGenerateNeedCandidateHarness(workflowHarness, input) {
  const nodeAttemptId = `node_attempt_generate_need_candidate_${RUN_ID}`;
  const workflowRunId = `workflow_run_generate_need_candidate_${RUN_ID}`;
  const evidenceMapRef = ref(
    'evidence_map',
    input.evidenceMap.evidence_map.evidence_map_id,
    input.titleCardId,
    input.evidenceMap.evidence_map.evidence_map_version ?? null,
  );
  const evidenceStrengthRef = ref('evidence_strength_assessment', `real_flow_strength_${RUN_ID}`, input.titleCardId);
  const conflictRef = ref('evidence_conflict', `real_flow_conflict_${RUN_ID}`, input.titleCardId);
  const rankedBatch = buildRealFlowRankedCandidateDraftBatch({
    nodeAttemptId,
    titleCardId: input.titleCardId,
    evidenceMap: input.evidenceMap,
    evidenceStrengthRef,
    conflictRef,
  });
  const topicScopeRef = ref('topic_scope', TOPIC_ID, input.titleCardId);
  const searchRunRef = ref('search_run', input.searchRunId, input.titleCardId);
  const searchPlanRef = ref('search_plan', input.searchPlanId, input.titleCardId, input.searchPlanVersion ?? null);
  const literatureSnapshotRef = ref(
    'literature_resource_pool_snapshot',
    input.resourcePoolSnapshotId,
    input.titleCardId,
    input.resourcePoolSnapshotVersion ?? null,
  );
  const resourceSampleSetRef = ref('resource_sample_set', input.resourceSampleSetId, input.titleCardId);
  const harnessInput = {
    scenario_id: REAL_E2E_SCENARIO_ID,
    scenario_case_id: `real-e2e-v1a-generate-need-candidate-${RUN_ID}`,
    title_card_id: input.titleCardId,
    workflow_run_id: workflowRunId,
    input_snapshot_id: null,
    node_attempt_id: nodeAttemptId,
    topic_scope_ref: topicScopeRef,
    evidence_map_ref: evidenceMapRef,
    evidence_strength_ref: evidenceStrengthRef,
    resource_sample_set_ref: resourceSampleSetRef,
    candidate_pool_projection_ref: null,
    search_snapshot_refs: [searchRunRef],
    resource_snapshot_refs: [literatureSnapshotRef],
    policy_version: 'v1',
    output_schema_version: 'v1',
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    execution_mode: V1A_GENERATE_EXECUTION_MODE,
    run_mode: V1A_GENERATE_EXECUTION_MODE === 'provider_llm' ? 'product' : 'acceptance',
    executor_kind: V1A_GENERATE_EXECUTION_MODE === 'codex_assisted' ? 'codex_assisted' : 'single_agent',
    exploration_payload: buildExplorationPayload({
      ...input,
      evidenceStrengthRef,
      conflictRef,
    }),
    arbiter_payload: buildArbiterPayload({
      ...input,
      evidenceStrengthRef,
      conflictRef,
    }),
    mocked_output: V1A_GENERATE_EXECUTION_MODE === 'mocked_llm'
      ? {
        fixture_id: `real_flow_ranked_candidate_batch_${RUN_ID}`,
        output: rankedBatch,
      }
      : null,
    codex_response: V1A_GENERATE_EXECUTION_MODE === 'codex_assisted'
      ? {
        operator_label: 'codex-real-e2e',
        output: rankedBatch,
      }
      : null,
    model_option_id: v1aGenerateModelOptionId(),
    current_round_index: 1,
    remaining_round_budget: 0,
    persist_admitted_candidates: true,
    persistence_context: {
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
    },
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      admitted_draft_count: 1,
      persisted_candidate_count: 1,
      persistence: 'required',
    },
    created_by: 'system',
  };
  const result = await workflowHarness.runGenerateNeedCandidateScenario(harnessInput);
  if (result.scenario_status !== 'passed') {
    throw new Error(`generate-need-candidate harness scenario failed: ${JSON.stringify(result.assertions)}`);
  }
  const persisted = result.adapter_result.persist_need_candidate_batch_result?.persisted_candidates ?? [];
  if (persisted.length === 0) {
    throw new Error('generate-need-candidate harness did not persist any NeedCandidate.');
  }
  return {
    result,
    selectedCandidate: persisted[0],
  };
}

async function runV1a(app, workflowHarness, selectedResources, resourceSample) {
  const titleCardId = await createRealTitleCard(app, selectedResources);
  const sourceRefs = selectedResources.map((resource) => ref('literature_source', resource.sources[0].id, titleCardId));
  selectedResources.forEach((resource, index) => {
    resource.literatureRef = ref('literature_record', resource.id, titleCardId);
    resource.sourceRef = sourceRefs[index];
  });

  const seed = await requestJson(app, 'POST', '/topic-selection/v1a/topic-seeds/from-title-card', 201, {
    title_card_id: titleCardId,
    intent_summary:
      'Evaluate whether the current RAG/fine-tuning literature pool supports a bounded, reviewer-auditable research topic about when retrieval, fine-tuning, or hybrid adaptation is justified.',
    scope_notes: `Real literature scope: ${TOPIC_ID}; selected ${selectedResources.length} key-content-ready records.`,
    created_by: 'system',
  });

  const snapshot = await requestJson(app, 'POST', '/topic-selection/v1a/literature-resource-pool-snapshots', 201, {
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    source_scope: 'title_card_evidence_basket',
    created_by: 'system',
  });

  const coverageIntents = buildCoverageIntents(selectedResources);
  const plan = await requestJson(app, 'POST', '/topic-selection/v1a/search-plans', 201, {
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    literature_resource_pool_snapshot_id: snapshot.literature_resource_pool_snapshot_id,
    query_intents: coverageIntents.map((intent) => intent.query),
    coverage_intents: coverageIntents,
    must_check_constraints: [
      'Do not claim RAG or fine-tuning superiority without benchmark-backed evidence.',
      'Separate source-attribution reliability from answer-quality improvement.',
      'Treat poisoning, leakage, and retrieval-conflict evidence as possible blockers.',
    ],
    exclusion_rules: [
      'Exclude claims about production deployment readiness.',
      'Exclude multimodal-only claims unless they generalize to textual RAG/fine-tuning decisions.',
    ],
    created_by: 'system',
  });

  const rowsByRole = new Map(plan.coverage_row_intents.map((row) => [row.expected_evidence_role, row]));
  const evidenceMapInputRefs = [
    ...selectedResources.flatMap((resource) => [resource.literatureRef, resource.sourceRef]),
  ];

  const searchRun = await requestJson(app, 'POST', '/topic-selection/v1a/search-runs', 201, {
    title_card_id: titleCardId,
    search_plan_id: plan.search_plan.search_plan_id,
    run_kind: 'planned_search',
    run_status: 'succeeded',
    result_accounting: {
      total_result_count: selectedResources.length,
      unique_literature_count: selectedResources.length,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: { source_count: selectedResources.length, warning_codes: [] },
    dedup_summary: { canonical_work_refs: selectedResources.map((resource) => resource.literatureRef) },
    evidence_map_input_refs: evidenceMapInputRefs,
    coverage_observations: plan.coverage_row_intents.map((row) => {
      const roleCount = selectedResources.filter((resource) => resource.evidenceRole === row.expected_evidence_role).length;
      return {
        coverage_row_intent_id: row.coverage_row_intent_id,
        status: 'succeeded',
        result_count: roleCount,
        source_count: roleCount,
      };
    }),
    evidence_bindings: selectedResources.map((resource, index) => ({
      coverage_row_intent_id: rowsByRole.get(resource.evidenceRole).coverage_row_intent_id,
      literature_ref: resource.literatureRef,
      source_refs: [resource.sourceRef],
      binding_kind: 'retrieval_hit',
      result_rank: index + 1,
    })),
    coverage_assessments: plan.coverage_row_intents.map((row) => ({
      coverage_row_intent_id: row.coverage_row_intent_id,
      verdict: 'satisfied',
      confidence: 0.82,
      assessed_by: 'system',
    })),
    created_by: 'system',
  });

  const evidenceUnits = selectedResources.map((resource, index) => ({
    client_unit_key: `${resource.evidenceRole}-${index + 1}-${resource.id}`,
    coverage_row_intent_id: rowsByRole.get(resource.evidenceRole).coverage_row_intent_id,
    evidence_role: resource.evidenceRole,
    literature_ref: resource.literatureRef,
    locator: manualLocator({
      titleCardId,
      literatureRef: resource.literatureRef,
      sourceRef: resource.sourceRef,
      key: `${resource.evidenceRole}-${resource.id}-${RUN_ID}`,
      label: `${resource.evidenceRole}: ${resource.title}`,
    }),
    source_statement: sourceStatement(resource),
    source_refs: [resource.sourceRef],
  }));

  const evidenceMap = await requestJson(app, 'POST', '/topic-selection/v1a/evidence-maps', 201, {
    title_card_id: titleCardId,
    search_run_id: searchRun.search_run.search_run_id,
    evidence_units: evidenceUnits,
    created_by: 'system',
  });

  const generateNeedCandidate = await runGenerateNeedCandidateHarness(workflowHarness, {
    titleCardId,
    selectedResources,
    evidenceMap,
    resourceSampleSetId: resourceSample.sample_set.resource_sample_set_id,
    resourcePoolSnapshotId: snapshot.literature_resource_pool_snapshot_id,
    resourcePoolSnapshotVersion: snapshot.snapshot_version,
    searchPlanId: plan.search_plan.search_plan_id,
    searchPlanVersion: plan.search_plan.plan_version,
    searchRunId: searchRun.search_run.search_run_id,
  });
  const candidate = generateNeedCandidate.selectedCandidate;

  const readiness = await requestJson(
    app,
    'POST',
    `/topic-selection/v1a/need-candidates/${encodeURIComponent(candidate.need_candidate_id)}/readiness-assessments`,
    201,
    { assessed_by: 'system' },
  );
  assert.equal(readiness.recommendation, 'ready_for_validation');

  const packet = await requestJson(app, 'POST', '/topic-selection/v1a/validation-support-packets', 201, {
    need_candidate_id: candidate.need_candidate_id,
    readiness_assessment_id: readiness.readiness_assessment_id,
    created_by: 'system',
  });

  const adjudication = await requestJson(
    app,
    'POST',
    `/topic-selection/v1a/need-candidates/${encodeURIComponent(candidate.need_candidate_id)}/adjudications`,
    201,
    {
      support_packet_id: packet.validation_support_packet_id,
      final_decision: 'validate',
      rationale: 'Real-flow reviewer confirms this is a valid bounded need for v1b drafting rehearsal.',
      adjudicated_by: { actor_type: 'human', actor_id: 'real-flow-reviewer' },
    },
  );
  const confirmation = await requestJson(
    app,
    'POST',
    `/topic-selection/v1a/adjudications/${encodeURIComponent(adjudication.adjudication_result.adjudication_result_id)}/human-confirmations`,
    201,
    {
      human_actor: { actor_type: 'human', actor_id: 'real-flow-reviewer' },
      human_rationale:
        'Role-balanced support, challenge, baseline, and context evidence are sufficient to test the downstream decision chain.',
    },
  );
  const v1bInputBundle = await requestJson(app, 'POST', '/topic-selection/v1a/v1b-input-bundles', 201, {
    validated_need_id: confirmation.validated_need.validated_need_id,
    created_by: 'system',
  });

  return {
    titleCardId,
    topicSeedId: seed.topic_seed_id,
    resourcePoolSnapshotId: snapshot.literature_resource_pool_snapshot_id,
    searchPlanId: plan.search_plan.search_plan_id,
    searchRunId: searchRun.search_run.search_run_id,
    evidenceMapId: evidenceMap.evidence_map.evidence_map_id,
    needCandidateId: candidate.need_candidate_id,
    generateNeedCandidate: {
      scenario_id: generateNeedCandidate.result.scenario_id,
      scenario_case_id: generateNeedCandidate.result.scenario_case_id,
      scenario_status: generateNeedCandidate.result.scenario_status,
      execution_mode: generateNeedCandidate.result.node_input.execution_mode,
      run_mode: generateNeedCandidate.result.harness_trace_snapshot.run_mode,
      workflow_run_id: generateNeedCandidate.result.workflow_run_id,
      node_attempt_id: generateNeedCandidate.result.node_attempt_id,
      adapter_status: generateNeedCandidate.result.adapter_result.status,
      routing_decision: generateNeedCandidate.result.adapter_result.supplemental_round_routing_decision?.routing_decision ?? null,
      persisted_candidate_refs:
        generateNeedCandidate.result.adapter_result.persist_need_candidate_batch_result?.persisted_candidate_refs ?? [],
      candidate_pool_projection_ref:
        generateNeedCandidate.result.adapter_result.persist_need_candidate_batch_result?.candidate_pool_projection_ref ?? null,
      harness_trace_artifact_ref: generateNeedCandidate.result.harness_trace_artifact.artifact_ref,
    },
    validationSupportPacketId: packet.validation_support_packet_id,
    validatedNeedId: confirmation.validated_need.validated_need_id,
    v1bInputBundleId: v1bInputBundle.v1b_input_bundle_id,
  };
}

async function runNodeScript(input) {
  const stdoutChunks = [];
  const stderrChunks = [];
  const child = spawn(process.execPath, [
    '--env-file=.env.local',
    '--loader',
    './apps/backend/node_modules/ts-node/esm.mjs',
    input.script,
  ], {
    cwd: REPO_ROOT,
    env: input.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });
  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');
  await fs.writeFile(input.stdoutPath, stdout, 'utf8');
  await fs.writeFile(input.stderrPath, stderr, 'utf8');
  return { exitCode, stdout, stderr };
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function authorityRefId(run, nodeKey) {
  return run?.nodes?.[nodeKey]?.authority_ref?.ref_id ?? null;
}

async function runV1b(_app, v1a) {
  if (QUALITY_NEGATIVE_MODE || ALLOW_NON_ADVANCE_V1B) {
    throw new Error(
      'topic-selection:real-e2e quality-negative direct v1b mode was retired with legacy v1b write routes; '
      + 'use pnpm topic-selection:v1b-runtime-stress for deterministic loopback coverage and '
      + 'pnpm topic-selection:v1b-provider-canary for provider-required-live slot coverage.',
    );
  }

  const v1bRunId = `${RUN_ID}-v1b-harness`;
  const summaryPath = path.join(
    REPO_ROOT,
    '.ai/.tmp/topic-selection-v1b-harness-e2e',
    v1bRunId,
    'result.json',
  );
  const env = {
    ...process.env,
    TOPIC_SELECTION_V1B_HARNESS_RUN_ID: v1bRunId,
    TOPIC_SELECTION_V1B_HARNESS_INPUT_BUNDLE_ID: v1a.v1bInputBundleId,
    TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE: 'fixture',
  };
  const child = await runNodeScript({
    script: '.ai/scripts/topic-selection-v1b-harness-e2e.mjs',
    env,
    stdoutPath: path.join(ARTIFACT_DIR, '03-v1b-harness.stdout.log'),
    stderrPath: path.join(ARTIFACT_DIR, '03-v1b-harness.stderr.log'),
  });
  const summary = await readJsonIfExists(summaryPath);
  if (child.exitCode !== 0 || summary?.status !== 'passed') {
    throw new Error(
      `v1b WorkflowHarness runner failed for ${v1bRunId}; `
      + `exit=${child.exitCode}; summary_status=${summary?.status ?? 'missing'}; stderr=${child.stderr.slice(-1000)}`,
    );
  }
  const run = summary.runs?.[0];
  if (!run?.nodes?.n11?.authority_ref?.ref_id) {
    throw new Error(`v1b WorkflowHarness runner ${v1bRunId} did not publish a v1c input bundle.`);
  }
  return {
    v1bHarnessRunId: v1bRunId,
    v1bHarnessSummaryPath: path.relative(REPO_ROOT, summaryPath),
    v1bHarnessSemanticMode: summary.semantic_mode,
    v1bHarnessProviderId: summary.provider_id,
    v1bIntakeSnapshotId: authorityRefId(run, 'n1'),
    researchConstraintProfileId: authorityRefId(run, 'n2'),
    readinessAssessmentId: authorityRefId(run, 'n3'),
    researchSliceOptionSetId: authorityRefId(run, 'n4'),
    selectedResearchSliceOptionId: run.selected_option_id ?? null,
    researchSliceSelectionDecisionId: authorityRefId(run, 'n5'),
    topicQuestionCandidateSetId: authorityRefId(run, 'n6'),
    topicQuestionContractId: authorityRefId(run, 'n7'),
    topicValueAssessmentId: authorityRefId(run, 'n8'),
    valueDispositionDecisionId: authorityRefId(run, 'n9'),
    valueDisposition: 'advance_to_package',
    advancedToPackage: true,
    topicPackageId: authorityRefId(run, 'n10'),
    v1cInputBundleId: authorityRefId(run, 'n11'),
    candidateCount: run.candidate_count ?? null,
    valueAssessmentCount: run.value_assessment_count ?? null,
    nodes: run.nodes,
  };
}

async function runV1c(app, v1b) {
  const snapshot = await requestJson(app, 'POST', '/topic-selection/v1c/promotion-input-snapshots', 201, {
    v1b_to_v1c_input_bundle_id: v1b.v1cInputBundleId,
    created_by: 'system',
  });

  const gateBundle = await requestJson(app, 'POST', '/topic-selection/v1c/promotion-gate-checks', 201, {
    promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
    created_by: 'system',
    support_generation_mode: 'deterministic',
  });
  assert.equal(gateBundle.promotion_gate_check.promote_allowed, true);

  const conditionRefs = [gateBundle.promotion_gate_check.promotion_input_snapshot_ref];
  const human = await requestJson(app, 'POST', '/topic-selection/v1c/promotion-decisions', 201, {
    promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
    decision: 'promote_with_conditions',
    human_actor: { actor_type: 'human', actor_id: 'real-flow-reviewer' },
    rationale: 'Explicitly authorize promotion with bounded claim obligations for real-flow rehearsal.',
    confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
    conditions: [
      {
        condition_id: `real_flow_condition_verify_claim_ceiling_${RUN_ID}`,
        condition_code: 'verify_claim_ceiling',
        owner: { actor_type: 'human', actor_id: 'real-flow-owner' },
        required_action: requiredAction('verify_claim_ceiling', conditionRefs),
        refs: conditionRefs,
        early_check_obligations: ['Verify claim ceiling before outline lock.'],
      },
    ],
  });
  assert.equal(human.promotion_decision.bridge_eligible, true);

  const bridge = await requestJson(app, 'POST', '/topic-selection/v1c/paper-project-bridges', 201, {
    promotion_decision_id: human.promotion_decision.promotion_decision_id,
    created_by: 'system',
  });
  assert.equal(bridge.paper_project_bridge.bridge_status, 'active');

  return {
    promotionInputSnapshotId: snapshot.promotion_input_snapshot_id,
    promotionInputSnapshotHash: snapshot.promotion_input_snapshot_hash,
    promotionGateCheckId: gateBundle.promotion_gate_check.promotion_gate_check_id,
    promotionDecisionId: human.promotion_decision.promotion_decision_id,
    paperProjectBridgeId: bridge.paper_project_bridge.paper_project_bridge_id,
    paperProjectBridge: {
      titleCardId: bridge.paper_project_bridge.title_card_id,
      ...stableBridgeFields(bridge.paper_project_bridge),
    },
  };
}

async function runPaperProjectIntake(app, prisma, v1c) {
  const bridgeId = v1c.paperProjectBridgeId;
  const intakeUrl = `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}/paper-project-intake`;
  const bridgeBefore = await requestJson(
    app,
    'GET',
    `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    200,
    undefined,
    'read bridge before PaperProject intake',
  );
  const bridgePayloadHash = bridgeBefore.bridge_payload_hash;

  const malformedRes = await app.inject({
    method: 'POST',
    url: intakeUrl,
    payload: {
      created_by: 'human',
    },
  });
  assertStatus(malformedRes, 400, 'reject malformed PaperProject intake');
  assert.equal(malformedRes.json().error?.code, 'INVALID_PAYLOAD');

  const staleHashRes = await app.inject({
    method: 'POST',
    url: intakeUrl,
    payload: {
      bridge_payload_hash: 'stale_bridge_payload_hash',
      created_by: 'hybrid',
    },
  });
  assertStatus(staleHashRes, 409, 'reject stale PaperProject intake bridge hash');
  assert.equal(staleHashRes.json().error?.code, 'VERSION_CONFLICT');

  const workspaceDriftRes = await app.inject({
    method: 'POST',
    url: intakeUrl,
    payload: {
      bridge_payload_hash: bridgePayloadHash,
      workspace_id: 'workspace_other',
      created_by: 'hybrid',
    },
  });
  assertStatus(workspaceDriftRes, 409, 'reject PaperProject intake workspace drift');
  assert.equal(workspaceDriftRes.json().error?.code, 'VERSION_CONFLICT');

  const intake = await requestJson(app, 'POST', intakeUrl, 201, {
    bridge_payload_hash: bridgePayloadHash,
    title: `Real E2E PaperProject from ${RUN_ID}`,
    research_direction: 'RAG and fine-tuning topic-selection evidence workflow',
    created_by: 'hybrid',
  }, 'create PaperProject intake from active bridge');
  assert.equal(intake.paper_project_created, true);
  assert.equal(intake.paper_project_ref.ref_id, intake.paper_project_id);
  assert.equal(intake.paper_project_ref.version_id, bridgePayloadHash);
  assert.equal(intake.paper_project_intake_ref.version_id, bridgePayloadHash);
  assert.ok(
    intake.carried_literature_evidence_ids.length > 0,
    'PaperProject intake did not carry selected literature evidence ids',
  );
  assert.ok(
    intake.carried_condition_refs.length > 0,
    'PaperProject intake did not carry promotion condition refs',
  );

  const bridgeAfterIntake = await requestJson(
    app,
    'GET',
    `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    200,
    undefined,
    'read bridge after PaperProject intake',
  );
  assert.deepEqual(bridgeAfterIntake.paper_project_intake_ref, intake.paper_project_intake_ref);
  assert.deepEqual(bridgeAfterIntake.target_paper_project_ref, intake.paper_project_ref);

  const duplicate = await requestJson(app, 'POST', intakeUrl, 200, {
    bridge_payload_hash: bridgePayloadHash,
    title: `Duplicate PaperProject intake should be idempotent ${RUN_ID}`,
    research_direction: 'ignored duplicate intake direction',
    created_by: 'human',
  }, 'duplicate PaperProject intake is idempotent');
  assert.equal(duplicate.paper_project_created, false);
  assert.equal(duplicate.paper_project_id, intake.paper_project_id);
  assert.deepEqual(duplicate.paper_project_ref, intake.paper_project_ref);
  assert.deepEqual(duplicate.paper_project_intake_ref, intake.paper_project_intake_ref);

  await prisma.topicSelectionPaperProjectBridge.update({
    where: { id: bridgeId },
    data: { bridgeStatus: 'superseded' },
  });
  let inactiveStatus;
  let inactiveErrorCode;
  try {
    const inactiveRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        bridge_payload_hash: bridgePayloadHash,
        title: `Inactive bridge intake should fail ${RUN_ID}`,
        research_direction: 'ignored inactive bridge direction',
        created_by: 'hybrid',
      },
    });
    inactiveStatus = inactiveRes.statusCode;
    inactiveErrorCode = inactiveRes.json().error?.code;
    assertStatus(inactiveRes, 409, 'reject non-active PaperProject bridge intake');
    assert.equal(inactiveErrorCode, 'GATE_CONSTRAINT_FAILED');
  } finally {
    await prisma.topicSelectionPaperProjectBridge.update({
      where: { id: bridgeId },
      data: { bridgeStatus: bridgeBefore.bridge_status },
    });
  }

  const bridgeAfterRestore = await requestJson(
    app,
    'GET',
    `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    200,
    undefined,
    'read bridge after non-active negative restore',
  );
  assert.equal(bridgeAfterRestore.bridge_status, bridgeBefore.bridge_status);
  assert.deepEqual(bridgeAfterRestore.paper_project_intake_ref, intake.paper_project_intake_ref);
  assert.deepEqual(bridgeAfterRestore.target_paper_project_ref, intake.paper_project_ref);

  return {
    paperProjectBridgeId: bridgeId,
    paperProjectId: intake.paper_project_id,
    paperProjectCreated: intake.paper_project_created,
    duplicatePaperProjectCreated: duplicate.paper_project_created,
    paperProjectRef: intake.paper_project_ref,
    paperProjectIntakeRef: intake.paper_project_intake_ref,
    carriedLiteratureEvidenceIds: intake.carried_literature_evidence_ids,
    carriedAcceptedRiskRefs: intake.carried_accepted_risk_refs,
    carriedConditionRefs: intake.carried_condition_refs,
    malformedStatus: malformedRes.statusCode,
    malformedErrorCode: malformedRes.json().error?.code,
    staleHashStatus: staleHashRes.statusCode,
    staleHashErrorCode: staleHashRes.json().error?.code,
    workspaceDriftStatus: workspaceDriftRes.statusCode,
    workspaceDriftErrorCode: workspaceDriftRes.json().error?.code,
    inactiveStatus,
    inactiveErrorCode,
    restoredBridgeStatus: bridgeAfterRestore.bridge_status,
  };
}

async function runDownstreamFeedback(app, v1c) {
  const bridgeId = v1c.paperProjectBridgeId;
  const bridgeBefore = await requestJson(
    app,
    'GET',
    `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    200,
    undefined,
    'read bridge before downstream feedback',
  );
  const bridgeBeforeStable = stableBridgeFields(bridgeBefore);
  const titleCardId = bridgeBefore.title_card_id;

  const invalidMissingAction = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1c/downstream-feedback',
    payload: {
      paper_project_bridge_id: bridgeId,
      downstream_source_kind: 'reviewer_check',
      downstream_source_ref: ref('reviewer_check', `missing_required_action_${RUN_ID}`, titleCardId),
      feedback_signal: 'stale_evidence',
      severity: 'blocking',
      summary: 'Real-flow downstream feedback missing a required action should be rejected.',
      created_by: 'human',
    },
  });
  assertStatus(invalidMissingAction, 400, 'reject downstream feedback missing required_action');
  assert.equal(invalidMissingAction.json().error?.code, 'INVALID_PAYLOAD');

  const workspaceDrift = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1c/downstream-feedback',
    payload: {
      paper_project_bridge_id: bridgeId,
      workspace_id: 'workspace_other',
      downstream_source_kind: 'reviewer_check',
      downstream_source_ref: ref('reviewer_check', `workspace_drift_${RUN_ID}`, titleCardId),
      feedback_signal: 'stale_evidence',
      severity: 'blocking',
      summary: 'Real-flow downstream feedback with workspace drift should be rejected.',
      required_action: 'Recheck stale evidence inside the owning workspace only.',
      created_by: 'human',
    },
  });
  assertStatus(workspaceDrift, 409, 'reject downstream feedback workspace drift');
  assert.equal(workspaceDrift.json().error?.code, 'VERSION_CONFLICT');

  const cases = [
    ['stale_evidence', 'evidence_or_search', 'warning', 'stale'],
    ['overclaim', 'value_assessment', 'blocking', 'recheck_required'],
    ['unanswerable_question', 'topic_question', 'blocking', 'recheck_required'],
    ['boundary_drift', 'research_slice', 'blocking', 'recheck_required'],
    ['need_invalidated', 'validated_need', 'critical', 'invalidated'],
    ['package_narrative_gap', 'package', 'blocking', 'recheck_required'],
    ['promotion_authorization_gap', 'promotion', 'blocking', 'recheck_required'],
    ['bridge_trace_gap', 'paper_project_bridge', 'blocking', 'recheck_required'],
    ['commitment_gap', 'paper_project_bridge', 'blocking', 'recheck_required'],
    ['merge_candidate_conflict', 'merge_candidate', 'blocking', 'recheck_required'],
    ['paper_project_constraint_conflict', 'paper_project_intake', 'blocking', 'recheck_required'],
    ['downstream_mutation_attempt', 'paper_project_bridge', 'critical', 'invalidated'],
    ['no_recheck_needed', 'paper_project_bridge', 'info', 'no_impact'],
  ];
  const feedbackResults = [];
  const recheckIds = [];

  for (const [signal, expectedTarget, severity, expectedImpact] of cases) {
    const requiresRecheck = signal !== 'no_recheck_needed';
    const feedback = await requestJson(app, 'POST', '/topic-selection/v1c/downstream-feedback', 201, {
      paper_project_bridge_id: bridgeId,
      downstream_source_kind: 'reviewer_check',
      downstream_source_ref: ref('reviewer_check', `real_flow_${signal}_${RUN_ID}`, titleCardId),
      source_feedback_refs: [ref('review_comment', `real_flow_${signal}_${RUN_ID}`, titleCardId)],
      observed_blocker_refs: [ref('topic_selection_blocker', `real_flow_${signal}_${RUN_ID}`, titleCardId)],
      feedback_signal: signal,
      severity,
      summary: `Real-flow downstream feedback for ${signal}.`,
      required_action: requiresRecheck
        ? `Resolve ${signal} before continuing PaperProject drafting.`
        : null,
      feedback_payload: {
        real_flow_run_id: RUN_ID,
        signal,
      },
      created_by: 'human',
    }, `create downstream feedback ${signal}`);

    assert.equal(feedback.downstream_topic_feedback.paper_project_bridge_id, bridgeId);
    assert.equal(
      feedback.downstream_topic_feedback.source_promotion_decision_ref.ref_id,
      bridgeBefore.source_promotion_decision_id,
    );
    assert.equal(feedback.classification.loopback_target, expectedTarget);
    assert.equal(feedback.classification.loopback_cause, signal);
    assert.equal(feedback.classification.requires_recheck, requiresRecheck);
    assert.equal(feedback.impact_summary.impact_level, expectedImpact);

    await requestJson(
      app,
      'GET',
      `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(feedback.downstream_topic_feedback.downstream_topic_feedback_id)}`,
      200,
      undefined,
      `read downstream feedback ${signal}`,
    );

    const recheckByFeedback = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(feedback.downstream_topic_feedback.downstream_topic_feedback_id)}/recheck-request`,
    });
    if (requiresRecheck) {
      assertStatus(recheckByFeedback, 200, `read downstream recheck by feedback ${signal}`);
      assert.ok(feedback.recheck_request?.downstream_recheck_request_id);
      recheckIds.push(feedback.recheck_request.downstream_recheck_request_id);
      await requestJson(
        app,
        'GET',
        `/topic-selection/v1c/recheck-requests/${encodeURIComponent(feedback.recheck_request.downstream_recheck_request_id)}`,
        200,
        undefined,
        `read downstream recheck by id ${signal}`,
      );
    } else {
      assertStatus(recheckByFeedback, 404, `no downstream recheck for ${signal}`);
      assert.equal(feedback.recheck_request, null);
    }

    feedbackResults.push({
      feedback_signal: signal,
      downstream_topic_feedback_id: feedback.downstream_topic_feedback.downstream_topic_feedback_id,
      loopback_target: feedback.classification.loopback_target,
      impact_level: feedback.impact_summary.impact_level,
      requires_recheck: feedback.classification.requires_recheck,
      recheck_request_id: feedback.recheck_request?.downstream_recheck_request_id ?? null,
    });
  }

  const list = await requestJson(
    app,
    'GET',
    `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}/downstream-feedback`,
    200,
    undefined,
    'list downstream feedback by bridge',
  );
  assert.equal(list.items.length, cases.length);
  assert.deepEqual(
    new Set(list.items.map((item) => item.downstream_topic_feedback_id)),
    new Set(feedbackResults.map((item) => item.downstream_topic_feedback_id)),
  );

  const bridgeAfter = await requestJson(
    app,
    'GET',
    `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    200,
    undefined,
    'read bridge after downstream feedback',
  );
  assert.deepEqual(stableBridgeFields(bridgeAfter), bridgeBeforeStable);

  return {
    paperProjectBridgeId: bridgeId,
    feedbackCount: feedbackResults.length,
    recheckCount: recheckIds.length,
    invalidMissingActionStatus: invalidMissingAction.statusCode,
    workspaceDriftStatus: workspaceDrift.statusCode,
    bridgeStableFields: bridgeBeforeStable,
    feedbackResults,
  };
}

function summarizeSelectedLiterature(selectedResources) {
  return selectedResources.map((resource) => ({
    id: resource.id,
    role: resource.evidenceRole,
    sample_set_id: resource.sampleSetId,
    sample_item_id: resource.sampleItemId,
    sample_rank: resource.sampleRank,
    evidence_polarity: resource.evidencePolarity,
    sampling_guardrails: resource.samplingGuardrails,
    title: resource.title,
    year: resource.year,
    activation_score: resource.activationScore,
    source_id: resource.sources[0]?.id ?? null,
    bucket: metadataBucket(resource),
    key_content_digest: snippet(resource.keyContentDigest, 500),
  }));
}

function sanitizeError(error) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

await fs.mkdir(ARTIFACT_DIR, { recursive: true });

const prisma = new PrismaClient();
let app;
try {
  const workflowHarness = makeWorkflowHarness(prisma, makeV1aGenerateLlmGateway());
  app = buildApp({
    topicSelectionResourceSamplingLlmGateway: makeRealFlowLlmGateway(),
  });

  currentStage = EXISTING_RESOURCE_SAMPLE_SET_ID ? 'load existing resource sample set' : 'create resource sample set';
  const resourceSample = EXISTING_RESOURCE_SAMPLE_SET_ID
    ? await requestJson(
      app,
      'GET',
      `/topic-selection/v1a/resource-samples/${encodeURIComponent(EXISTING_RESOURCE_SAMPLE_SET_ID)}`,
      200,
      undefined,
      'load existing resource sample set',
    )
    : await requestJson(app, 'POST', '/topic-selection/v1a/resource-samples', 201, {
      topic_id: TOPIC_ID,
      sample_size: LITERATURE_LIMIT,
      model: {
        provider_id: PROVIDER_ID,
        model_id: MODEL_ID,
        profile_id: 'topic-selection-resource-sampling-classification',
      },
      created_by: 'system',
    }, 'create resource sample set');
  await fs.writeFile(
    path.join(ARTIFACT_DIR, '00-resource-sample.json'),
    `${JSON.stringify(resourceSample, null, 2)}\n`,
  );

  currentStage = 'load sampled resources';
  const selectedResources = await loadSampledResources(prisma, resourceSample);
  const selectedLiterature = summarizeSelectedLiterature(selectedResources);
  await fs.writeFile(
    path.join(ARTIFACT_DIR, '01-selected-literature.json'),
    `${JSON.stringify({
      run_id: RUN_ID,
      topic_id: TOPIC_ID,
      resource_sample_set_id: resourceSample.sample_set.resource_sample_set_id,
      resource_sample_status: resourceSample.sample_set.status,
      resource_sample_warnings: resourceSample.sample_set.warnings,
      selected_literature: selectedLiterature,
    }, null, 2)}\n`,
  );

  const v1a = await runV1a(app, workflowHarness, selectedResources, resourceSample);
  await fs.writeFile(path.join(ARTIFACT_DIR, '02-v1a.json'), `${JSON.stringify(v1a, null, 2)}\n`);

  const v1b = await runV1b(app, v1a);
  await fs.writeFile(path.join(ARTIFACT_DIR, '03-v1b.json'), `${JSON.stringify(v1b, null, 2)}\n`);

  const v1c = v1b.v1cInputBundleId ? await runV1c(app, v1b) : null;
  if (v1c) {
    await fs.writeFile(path.join(ARTIFACT_DIR, '04-v1c.json'), `${JSON.stringify(v1c, null, 2)}\n`);
  }
  const paperProjectIntake = v1c ? await runPaperProjectIntake(app, prisma, v1c) : null;
  if (paperProjectIntake) {
    await fs.writeFile(
      path.join(ARTIFACT_DIR, '05-paper-project-intake.json'),
      `${JSON.stringify(paperProjectIntake, null, 2)}\n`,
    );
  }
  const downstream = v1c ? await runDownstreamFeedback(app, v1c) : null;
  if (downstream) {
    await fs.writeFile(
      path.join(ARTIFACT_DIR, '06-downstream-feedback.json'),
      `${JSON.stringify(downstream, null, 2)}\n`,
    );
  }

  const summary = {
    status: v1c ? 'passed' : 'passed_v1b_non_advance',
    scenario_id: REAL_E2E_SCENARIO_ID,
    scenario_type: QUALITY_NEGATIVE_MODE ? 'negative' : 'real_e2e_canary',
    run_id: RUN_ID,
    artifact_dir: ARTIFACT_DIR,
    topic_id: TOPIC_ID,
    model_id: MODEL_ID,
    provider_id: PROVIDER_ID,
    llm_mode: USE_MOCK_LLM ? 'deterministic_mock' : 'provider',
    v1a_generate_execution_mode: V1A_GENERATE_EXECUTION_MODE,
    resource_sample_source: EXISTING_RESOURCE_SAMPLE_SET_ID ? 'existing_provider_sample_set' : 'created_in_run',
    resource_sample_set_id: resourceSample.sample_set.resource_sample_set_id,
    resource_sample_status: resourceSample.sample_set.status,
    resource_sample_warnings: resourceSample.sample_set.warnings,
    resource_sample_hash: resourceSample.sample_set.sample_hash,
    literature_count: selectedResources.length,
    selected_literature: selectedLiterature.map(({ key_content_digest: _digest, ...item }) => item),
    v1a,
    v1b,
    v1c,
    paper_project_intake: paperProjectIntake,
    downstream,
  };
  await fs.writeFile(path.join(ARTIFACT_DIR, '90-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  const failure = {
    status: 'failed',
    scenario_id: REAL_E2E_SCENARIO_ID,
    scenario_type: QUALITY_NEGATIVE_MODE ? 'negative' : 'real_e2e_canary',
    run_id: RUN_ID,
    artifact_dir: ARTIFACT_DIR,
    topic_id: TOPIC_ID,
    model_id: MODEL_ID,
    current_stage: currentStage,
    error: sanitizeError(error),
  };
  await fs.writeFile(path.join(ARTIFACT_DIR, '90-summary.json'), `${JSON.stringify(failure, null, 2)}\n`);
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  if (app) {
    await app.close();
  }
  await prisma.$disconnect();
}
