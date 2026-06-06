import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1a-workflow-harness-contracts';
import { buildApp } from '../app.js';
import type { LlmCallTelemetry, LlmStructuredOutputRequest } from '../services/llm-gateway.js';
import { TopicSelectionEvidenceMapMaterializationService } from '../services/topic-selection-evidence-map-materialization-service.js';
import {
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
} from '../services/topic-selection-model-profile-registry-service.js';

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  };
}

function assertStatus(response: { statusCode: number; body: string }, expected: number): void {
  if (response.statusCode !== expected) {
    assert.fail(`Expected HTTP ${expected}, received ${response.statusCode}: ${response.body}`);
  }
}

function manualLocator(input: {
  titleCardId: string;
  literatureRef: TopicSelectionFunctionalRef;
  sourceRef: TopicSelectionFunctionalRef;
  key: string;
}) {
  return {
    locator_type: 'manual',
    locator_ref: ref('manual_locator', input.key, input.titleCardId),
    literature_ref: input.literatureRef,
    source_ref: input.sourceRef,
    content_ref: null,
    section_ref: null,
    paragraph_ref: null,
    anchor_ref: null,
    manual_label: `Manual locator ${input.key}`,
  };
}

type V1aNativeHarnessHttpResult = {
  route_decision: string;
  route_signal: string;
  route_target_node_id: string | null;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef | null;
  scenario_result: any;
};

async function invokeV1aNativeHarnessNode(
  app: ReturnType<typeof buildApp>,
  nodeId: string,
  scenarioInput: Record<string, any>,
  expectedRoute: {
    route_decision: string;
    route_signal: string;
    route_target_node_id: string | null;
  },
): Promise<V1aNativeHarnessHttpResult> {
  const res = await app.inject({
    method: 'POST',
    url: `/topic-selection/v1a/workflow-harness/nodes/${encodeURIComponent(nodeId)}/invocations`,
    payload: {
      schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
      node_id: nodeId,
      workflow_run_id: scenarioInput.workflow_run_id,
      node_attempt_id: scenarioInput.node_attempt_id,
      policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
      title_card_id: scenarioInput.title_card_id ?? null,
      scenario_input: scenarioInput,
      created_by: scenarioInput.created_by ?? 'system',
    },
  });
  assertStatus(res, 201);
  const body = res.json() as V1aNativeHarnessHttpResult;
  const routeDebug = JSON.stringify({
    route_signal: body.route_signal,
    error_code: body.scenario_result.adapter_result?.error_code ?? body.scenario_result.node_result?.error_code ?? null,
    blocker_codes: body.scenario_result.adapter_result?.blocker_codes ?? body.scenario_result.node_result?.blocker_codes ?? [],
    assertions: body.scenario_result.assertions ?? [],
  });
  assert.equal(body.route_decision, expectedRoute.route_decision, `${nodeId} route_decision ${routeDebug}`);
  assert.equal(body.route_signal, expectedRoute.route_signal, `${nodeId} route_signal ${routeDebug}`);
  assert.equal(body.route_target_node_id, expectedRoute.route_target_node_id, `${nodeId} route_target_node_id ${routeDebug}`);
  assert.equal(body.scenario_result.scenario_status, 'passed', `${nodeId} scenario_status`);
  return body;
}

function roleCoverageRef(
  handoff: { coverage_role_expectations?: Array<{ expected_evidence_role: string; coverage_row_intent_ref: TopicSelectionFunctionalRef }> },
  role: string,
): TopicSelectionFunctionalRef {
  const row = handoff.coverage_role_expectations?.find((entry) => entry.expected_evidence_role === role);
  assert.ok(row, `missing ${role} coverage row in search-run handoff`);
  return row.coverage_row_intent_ref;
}

function searchRunInputRefsHash(searchRunHandoff: any): string {
  return new TopicSelectionEvidenceMapMaterializationService().inputRefsHashForSearchRunHandoff(searchRunHandoff);
}

function buildNativeEvidenceMapDraft(input: {
  titleCardId: string;
  searchRunHandoff: any;
  literatureRef: TopicSelectionFunctionalRef;
  sourceRef: TopicSelectionFunctionalRef;
}) {
  const roles = ['support', 'challenge', 'baseline', 'context'];
  const draftUnits = roles.map((role) => ({
    client_unit_key: role,
    coverage_row_intent_ref: roleCoverageRef(input.searchRunHandoff, role),
    evidence_role: role,
    literature_ref: input.literatureRef,
    source_refs: [input.sourceRef],
    locator: manualLocator({
      titleCardId: input.titleCardId,
      literatureRef: input.literatureRef,
      sourceRef: input.sourceRef,
      key: `native-${role}`,
    }),
    source_statement: `Native v1a ${role} evidence supports a reviewer-auditable topic-selection workflow.`,
    source_attribution_kind: role === 'challenge' ? 'counter_evidence' : 'source_claim',
    normalized_statement: `Normalized ${role} evidence for v1a native runner.`,
    interpretation_payload: { role },
    confidence: 0.82,
    issue_codes: [],
  }));
  return {
    schema_version: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
    title_card_ref: ref('title_card', input.titleCardId, input.titleCardId),
    search_run_ref: input.searchRunHandoff.search_run_ref,
    search_plan_ref: input.searchRunHandoff.search_plan_ref,
    literature_resource_pool_snapshot_ref: input.searchRunHandoff.literature_resource_pool_snapshot_ref,
    literature_snapshot_hash: input.searchRunHandoff.literature_snapshot_hash,
    producer_kind: 'fixture',
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    input_refs_hash: searchRunInputRefsHash(input.searchRunHandoff),
    draft_units: draftUnits,
    draft_links: [],
    draft_clusters: roles.map((role) => ({
      cluster_type: role === 'challenge' ? 'limitation_family' : role === 'baseline' ? 'baseline_family' : 'method_family',
      cluster_key: `${role}-cluster`,
      unit_keys: [role],
      label: `${role} evidence`,
      rationale: `Native runner fixture cluster for ${role}.`,
      confidence: 0.82,
    })),
    draft_patterns: roles.map((role) => ({
      pattern_type: role === 'challenge' ? 'limitation' : role === 'baseline' ? 'baseline' : role === 'context' ? 'context' : 'solution',
      evidence_role: role,
      unit_keys: [role],
      pattern_statement: `${role} evidence is present for v1a validation.`,
      confidence: 0.82,
    })),
    draft_conflicts: [
      {
        conflict_type: 'claim_conflict',
        severity: 'moderate',
        support_unit_keys: ['support'],
        challenge_unit_keys: ['challenge'],
        baseline_unit_keys: ['baseline'],
        context_unit_keys: ['context'],
        issue_codes: ['risk_carry_forward_required'],
      },
    ],
    warning_codes: [],
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    output_schema_version: 'v1',
  };
}

function refsByEvidenceRole(evidenceMapRecords: any, role: string, titleCardId: string): TopicSelectionFunctionalRef[] {
  return evidenceMapRecords.evidence_units
    .filter((unit: { evidence_role: string }) => unit.evidence_role === role)
    .map((unit: { evidence_unit_id: string; evidence_map_version?: string | null }) =>
      ref('evidence_unit', unit.evidence_unit_id, titleCardId, unit.evidence_map_version ?? null)
    );
}

function buildNativeRankedBatch(input: {
  titleCardId: string;
  nodeAttemptId: string;
  evidenceMapRecords: any;
  strengthRef: TopicSelectionFunctionalRef;
}) {
  const conflictRefs = input.evidenceMapRecords.conflict_sets.map((record: { evidence_conflict_set_id: string; evidence_map_version: string }) =>
    ref('evidence_conflict', record.evidence_conflict_set_id, input.titleCardId, record.evidence_map_version)
  );
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: `draft_batch_${input.nodeAttemptId}`,
      node_attempt_id: input.nodeAttemptId,
      terminal_result: 'finalize',
      ranking_rationale: 'Native HTTP harness fixture has complete role evidence.',
      max_persisted_candidates: 5,
    },
    drafts: [
      {
        draft_id: `draft_${input.nodeAttemptId}`,
        rank: 1,
        candidate_need: 'Reviewer-aligned topic selection needs traceable evidence-to-need decisions.',
        unmet_need_statement: 'Topic decisions need auditable evidence, risk, and handoff boundaries.',
        mechanism_type: 'workflow_gap',
        mechanism_summary: 'Native harness route policy must preserve evidence lineage across v1a nodes.',
        mechanism_payload: { native_http_harness: true },
        scope_notes: 'Local-first CS paper engineering workflows.',
        non_goal_notes: 'No production deployment claim.',
        prior_art_status: 'partial_solution_known',
        evidence_role_bundle: {
          support_unit_refs: refsByEvidenceRole(input.evidenceMapRecords, 'support', input.titleCardId),
          challenge_unit_refs: refsByEvidenceRole(input.evidenceMapRecords, 'challenge', input.titleCardId),
          baseline_unit_refs: refsByEvidenceRole(input.evidenceMapRecords, 'baseline', input.titleCardId),
          context_unit_refs: refsByEvidenceRole(input.evidenceMapRecords, 'context', input.titleCardId),
        },
        conflict_refs: conflictRefs,
        strength_assessment_refs: [input.strengthRef],
        accepted_risk_refs: [],
        gap_codes: ['traceability_gap'],
        speculative: false,
        confidence: 0.82,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function buildNativeExplorationPayload() {
  return {
    topic_scope: { domain: 'topic-selection native HTTP harness' },
    evidence_signal_digest: { support_count: 1, challenge_count: 1 },
    resource_sample_digest: { sample_set_id: 'native-http-sample', role_counts: { support: 1, challenge: 1, baseline: 1, context: 1 } },
    search_coverage_digest: { coverage: 'complete', method_family_targets: ['workflow_orchestration'] },
    sibling_candidate_digest: { candidate_count: 0 },
    decision_memory_digest: { required_challenges: [] },
    exploration_prompts: ['Generate one traceable candidate need.'],
    challenge_prompts: ['Carry counter-evidence into validation.'],
    allowed_outputs: ['ranked_candidate_draft_batch'],
    forbidden_outputs: ['authority_write_outside_harness'],
  };
}

function buildNativeArbiterPayload(input: {
  evidenceMapRecords: any;
  titleCardId: string;
  strengthRef: TopicSelectionFunctionalRef;
}) {
  const evidenceRefRows = input.evidenceMapRecords.evidence_units.map(
    (unit: { evidence_unit_id: string; evidence_role: string; evidence_map_version?: string | null }) => ({
      evidence_ref: ref('evidence_unit', unit.evidence_unit_id, input.titleCardId, unit.evidence_map_version ?? null),
      role: unit.evidence_role,
    }),
  );
  const conflictRefRows = input.evidenceMapRecords.conflict_sets.map(
    (record: { evidence_conflict_set_id: string; evidence_map_version: string }) => ({
      evidence_ref: ref('evidence_conflict', record.evidence_conflict_set_id, input.titleCardId, record.evidence_map_version),
      role: 'conflict',
    }),
  );
  return {
    node_policy_ref: ref('node_policy', 'generate_need_candidate_v1', input.titleCardId),
    output_schema_ref: ref('schema', 'ranked_candidate_draft_batch_v1', input.titleCardId),
    authority_boundary: {
      authority_object: 'NeedCandidate',
      forbidden: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract'],
    },
    max_persisted_candidates: 5,
    deterministic_gate_checklist: ['schema_validation', 'admission_gates'],
    role_level_summaries: [{ role: 'single_agent', summary: 'native-http-ready' }],
    candidate_pool_digest: { candidate_count: 0 },
    evidence_ref_table: [
      ...evidenceRefRows,
      ...conflictRefRows,
      {
        evidence_ref: input.strengthRef,
        role: 'strength_assessment',
      },
    ],
    rejected_framing_table: [],
    unresolved_points: [],
    batch_ranking_rules: ['rank grounded drafts first'],
    persistence_rules: ['persist only admitted candidates'],
    failure_rules: ['block malformed drafts'],
  };
}

function v1aTelemetry(schemaName: string): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-5.5',
    profile_id: schemaName,
    prompt_template_id: schemaName,
    prompt_template_version: '1',
    elapsed_ms: 1,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: 100,
    output_tokens: 100,
    embedding_input_tokens: null,
    total_tokens: 200,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}

class FakeTopicSelectionV1aLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(request: LlmStructuredOutputRequest): Promise<{
    parsed: T;
    raw: Record<string, unknown>;
    telemetry: LlmCallTelemetry;
  }> {
    this.calls.push(request);
    const userPayload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      node?: {
        workflow_run_id: string;
        node_attempt_id: string;
        execution_mode: string;
        profile_id: string;
        policy_version: string;
        output_schema_version: string;
      };
      candidate?: {
        need_candidate_ref: TopicSelectionFunctionalRef;
        gap_codes?: string[];
      };
      readiness?: {
        readiness_assessment_ref: TopicSelectionFunctionalRef;
      };
      support_packet?: {
        validation_support_packet_ref: TopicSelectionFunctionalRef;
        open_gap_codes?: string[];
        residual_risk_refs?: TopicSelectionFunctionalRef[];
      };
    };
    if (request.schemaName !== TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION) {
      throw new Error(`Unsupported fake v1a harness schema: ${request.schemaName}`);
    }
    const parsed = {
      schema_version: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
      workflow_run_id: userPayload.node?.workflow_run_id,
      node_attempt_id: userPayload.node?.node_attempt_id,
      recommendation_packet_id: `${userPayload.node?.node_attempt_id ?? 'node_attempt'}_recommendation`,
      need_candidate_ref: userPayload.candidate?.need_candidate_ref,
      validation_support_packet_ref: userPayload.support_packet?.validation_support_packet_ref,
      readiness_assessment_ref: userPayload.readiness?.readiness_assessment_ref,
      execution_mode: userPayload.node?.execution_mode,
      profile_id: userPayload.node?.profile_id,
      final_decision: 'validate',
      rationale: 'Fake provider validates the native HTTP harness candidate while carrying residual risks.',
      required_actions: [
        'route result according to deterministic node policy',
        ...(userPayload.support_packet?.open_gap_codes?.includes('METHOD_FAMILY_COVERAGE_GAP')
          ? ['carry METHOD_FAMILY_COVERAGE_GAP into v1b intake']
          : []),
      ],
      gap_codes: userPayload.support_packet?.open_gap_codes ?? userPayload.candidate?.gap_codes ?? [],
      accepted_risk_refs: [],
      residual_risk_refs: userPayload.support_packet?.residual_risk_refs ?? [],
      rejected_reason: null,
      merge_target_need_candidate_ref: null,
      searchplan_recheck_reason: null,
      searchplan_recheck_gap_codes: [],
      source_refs: [
        userPayload.candidate?.need_candidate_ref,
        userPayload.readiness?.readiness_assessment_ref,
        userPayload.support_packet?.validation_support_packet_ref,
      ].filter(Boolean),
      recommendation_payload: { fake_provider: true },
      policy_version: userPayload.node?.policy_version,
      output_schema_version: userPayload.node?.output_schema_version,
    };
    return {
      parsed: parsed as T,
      raw: { schemaName: request.schemaName, parsed },
      telemetry: v1aTelemetry(request.schemaName),
    };
  }
}

async function createLiterature(app: ReturnType<typeof buildApp>, suffix: string): Promise<string> {
  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [
        {
          provider: 'manual',
          external_id: `topic-selection-v1a-api-${suffix}`,
          title: `Topic Selection API Evidence ${suffix}`,
          abstract: 'Evidence workflows miss reviewer-facing traceability from claims to decisions.',
          authors: ['API Route Author'],
          year: 2026,
          doi: `10.1000/topic-selection-api-${suffix.toLowerCase()}`,
          source_url: `https://example.com/topic-selection-api/${suffix.toLowerCase()}`,
        },
      ],
    },
  });
  assertStatus(importRes, 200);
  const body = importRes.json() as { results: Array<{ literature_id: string }> };
  const literatureId = body.results[0]?.literature_id;
  assert.ok(literatureId);
  return literatureId;
}

async function createTitleCard(app: ReturnType<typeof buildApp>, suffix: string): Promise<string> {
  const titleCardRes = await app.inject({
    method: 'POST',
    url: '/title-cards',
    payload: {
      working_title: `Topic Selection API Title ${suffix}`,
      brief: 'Validate evidence-to-need traceability through HTTP routes.',
    },
  });
  assertStatus(titleCardRes, 201);
  const body = titleCardRes.json() as { title_card_id: string };
  return body.title_card_id;
}

test('topic-selection v1a HTTP routes drive evidence-to-need validation through buildApp', async () => {
  const app = buildApp();
  try {
    const suffix = uniqueId('v1a-api');
    const literatureId = await createLiterature(app, suffix);
    const titleCardId = await createTitleCard(app, suffix);

    const basketRes = await app.inject({
      method: 'PATCH',
      url: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
      payload: {
        add_literature_ids: [literatureId],
      },
    });
    assertStatus(basketRes, 200);

    const seedRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/topic-seeds/from-title-card',
      payload: {
        title_card_id: titleCardId,
        created_by: 'system',
      },
    });
    assertStatus(seedRes, 201);
    const seed = seedRes.json() as { topic_seed_id: string };
    assert.ok(seed.topic_seed_id);

    const snapshotRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/literature-resource-pool-snapshots',
      payload: {
        title_card_id: titleCardId,
        topic_seed_id: seed.topic_seed_id,
        created_by: 'system',
      },
    });
    assertStatus(snapshotRes, 201);
    const snapshot = snapshotRes.json() as {
      literature_resource_pool_snapshot_id: string;
      literature_refs: TopicSelectionFunctionalRef[];
      content_source_refs: TopicSelectionFunctionalRef[];
    };
    const literatureRef = snapshot.literature_refs[0] ?? ref('literature_record', literatureId, titleCardId);
    const sourceRef = snapshot.content_source_refs[0] ?? ref('literature_source', `manual-source-${suffix}`, titleCardId);

    const planRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/search-plans',
      payload: {
        title_card_id: titleCardId,
        topic_seed_id: seed.topic_seed_id,
        literature_resource_pool_snapshot_id: snapshot.literature_resource_pool_snapshot_id,
        query_intents: [
          'support reviewer-facing traceability gap',
          'baseline decision chain misses provenance',
          'context local CS paper engineering workflow',
        ],
        coverage_intents: [
          {
            coverage_key: 'support-traceability',
            intent_type: 'support',
            query: 'support reviewer-facing traceability gap',
            expected_evidence_role: 'support',
          },
          {
            coverage_key: 'baseline-provenance',
            intent_type: 'baseline',
            query: 'baseline decision chain misses provenance',
            expected_evidence_role: 'baseline',
          },
          {
            coverage_key: 'context-workflow',
            intent_type: 'context',
            query: 'context local CS paper engineering workflow',
            expected_evidence_role: 'context',
          },
        ],
        created_by: 'system',
      },
    });
    assertStatus(planRes, 201);
    const plan = planRes.json() as {
      search_plan: { search_plan_id: string; plan_version: string };
      coverage_row_intents: Array<{ coverage_row_intent_id: string }>;
    };
    const [supportRow, baselineRow, contextRow] = plan.coverage_row_intents;
    assert.ok(supportRow);
    assert.ok(baselineRow);
    assert.ok(contextRow);

    const runRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/search-runs',
      payload: {
        title_card_id: titleCardId,
        search_plan_id: plan.search_plan.search_plan_id,
        result_accounting: {
          total_result_count: 3,
          unique_literature_count: 1,
          duplicate_result_count: 0,
          failed_source_count: 0,
          skipped_source_count: 0,
        },
        source_health_summary: {
          source_count: 1,
          warning_codes: [],
        },
        dedup_summary: {
          canonical_work_refs: [literatureRef],
        },
        evidence_map_input_refs: [literatureRef, sourceRef],
        coverage_observations: plan.coverage_row_intents.map((row) => ({
          coverage_row_intent_id: row.coverage_row_intent_id,
          status: 'succeeded',
          result_count: 1,
          source_count: 1,
        })),
        evidence_bindings: plan.coverage_row_intents.map((row, index) => ({
          coverage_row_intent_id: row.coverage_row_intent_id,
          literature_ref: literatureRef,
          source_refs: [sourceRef],
          binding_kind: 'retrieval_hit',
          result_rank: index + 1,
        })),
        coverage_assessments: plan.coverage_row_intents.map((row) => ({
          coverage_row_intent_id: row.coverage_row_intent_id,
          verdict: 'satisfied',
          confidence: 0.88,
          assessed_by: 'system',
        })),
        created_by: 'system',
      },
    });
    assertStatus(runRes, 201);
    const run = runRes.json() as { search_run: { search_run_id: string } };

    const matrixRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/search-plans/${encodeURIComponent(plan.search_plan.search_plan_id)}/coverage-matrix`,
    });
    assertStatus(matrixRes, 200);
    const matrix = matrixRes.json() as { summary: { satisfied_count: number } };
    assert.equal(matrix.summary.satisfied_count, 3);

    const evidenceMapRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/evidence-maps',
      payload: {
        title_card_id: titleCardId,
        search_run_id: run.search_run.search_run_id,
        evidence_units: [
          {
            client_unit_key: 'support',
            coverage_row_intent_id: supportRow.coverage_row_intent_id,
            evidence_role: 'support',
            literature_ref: literatureRef,
            locator: manualLocator({
              titleCardId,
              literatureRef,
              sourceRef,
              key: `support-${suffix}`,
            }),
            source_statement: 'Reviewers need traceability from source claims to topic-selection decisions.',
          },
          {
            client_unit_key: 'baseline',
            coverage_row_intent_id: baselineRow.coverage_row_intent_id,
            evidence_role: 'baseline',
            literature_ref: literatureRef,
            locator: manualLocator({
              titleCardId,
              literatureRef,
              sourceRef,
              key: `baseline-${suffix}`,
            }),
            source_statement: 'Baseline decision chains often collapse provenance into a single opaque status.',
          },
          {
            client_unit_key: 'context',
            coverage_row_intent_id: contextRow.coverage_row_intent_id,
            evidence_role: 'context',
            literature_ref: literatureRef,
            locator: manualLocator({
              titleCardId,
              literatureRef,
              sourceRef,
              key: `context-${suffix}`,
            }),
            source_statement: 'The workflow is scoped to local CS paper engineering and reviewer-aligned evidence review.',
          },
        ],
        created_by: 'system',
      },
    });
    assertStatus(evidenceMapRes, 201);
    const evidenceMap = evidenceMapRes.json() as {
      evidence_map: { evidence_map_id: string; support_unit_count: number };
    };
    assert.equal(evidenceMap.evidence_map.support_unit_count, 1);

    // T-087 Phase 2.3 — EvidenceUnit list by evidence-map drives the drilldown UI.
    const unitsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/evidence-maps/${encodeURIComponent(evidenceMap.evidence_map.evidence_map_id)}/units`,
    });
    assertStatus(unitsRes, 200);
    const unitsList = unitsRes.json() as {
      items: Array<{ evidence_unit_id: string; evidence_map_id: string; evidence_role: string }>;
    };
    assert.ok(unitsList.items.length > 0);
    assert.ok(unitsList.items.every((unit) => unit.evidence_map_id === evidenceMap.evidence_map.evidence_map_id));

    const bundleRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/evidence-maps/${encodeURIComponent(evidenceMap.evidence_map.evidence_map_id)}/need-validation-bundle`,
    });
    assertStatus(bundleRes, 200);

    const candidateRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/need-candidates',
      payload: {
        title_card_id: titleCardId,
        evidence_map_id: evidenceMap.evidence_map.evidence_map_id,
        candidate_need: 'Reviewer-aligned topic selection needs traceable evidence-to-need decisions.',
        mechanism_type: 'workflow_gap',
        mechanism_summary: 'The decision chain is hard to audit without explicit gates and evidence refs.',
        scope_notes: 'Local-first CS paper engineering workflows that prepare reviewer-facing topic decisions.',
        prior_art_status: 'no_strong_solution_found',
        created_by: 'system',
      },
    });
    assertStatus(candidateRes, 201);
    const candidate = candidateRes.json() as { need_candidate_id: string };

    const readinessRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/need-candidates/${encodeURIComponent(candidate.need_candidate_id)}/readiness-assessments`,
      payload: {
        assessed_by: 'system',
      },
    });
    assertStatus(readinessRes, 201);
    const readiness = readinessRes.json() as { readiness_assessment_id: string; recommendation: string };
    assert.equal(readiness.recommendation, 'ready_for_validation');

    const packetRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/validation-support-packets',
      payload: {
        need_candidate_id: candidate.need_candidate_id,
        readiness_assessment_id: readiness.readiness_assessment_id,
        created_by: 'system',
      },
    });
    assertStatus(packetRes, 201);
    const packet = packetRes.json() as { validation_support_packet_id: string };

    // T-087 Phase 2.5 — packet picker driver: assert candidate-scoped list.
    const packetListRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/need-candidates/${encodeURIComponent(candidate.need_candidate_id)}/validation-support-packets`,
    });
    assertStatus(packetListRes, 200);
    const packetList = packetListRes.json() as { items: Array<{ validation_support_packet_id: string; need_candidate_id: string }> };
    assert.ok(packetList.items.some((item) => item.validation_support_packet_id === packet.validation_support_packet_id));
    assert.ok(packetList.items.every((item) => item.need_candidate_id === candidate.need_candidate_id));

    const adjudicationRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/need-candidates/${encodeURIComponent(candidate.need_candidate_id)}/adjudications`,
      payload: {
        support_packet_id: packet.validation_support_packet_id,
        final_decision: 'validate',
        rationale: 'Human reviewer confirms the need and trace boundary.',
        adjudicated_by: { actor_type: 'human', actor_id: 'route-test-reviewer' },
      },
    });
    assertStatus(adjudicationRes, 201);
    const adjudication = adjudicationRes.json() as {
      adjudication_result: { adjudication_result_id: string; output_validated_need_id: string | null };
      validated_need: null;
      v1b_input_bundle: null;
    };
    assert.ok(adjudication.adjudication_result.output_validated_need_id);
    assert.equal(adjudication.validated_need, null);
    assert.equal(adjudication.v1b_input_bundle, null);

    const confirmationRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/adjudications/${encodeURIComponent(
        adjudication.adjudication_result.adjudication_result_id,
      )}/human-confirmations`,
      payload: {
        human_actor: { actor_type: 'human', actor_id: 'route-test-reviewer' },
        human_rationale: 'Support, baseline, context, and handoff refs are sufficient for v1b input.',
      },
    });
    assertStatus(confirmationRes, 201);
    const confirmation = confirmationRes.json() as {
      validated_need: { validated_need_id: string };
    };
    assert.equal(adjudication.adjudication_result.output_validated_need_id, confirmation.validated_need.validated_need_id);

    const v1bBundleRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/v1b-input-bundles',
      payload: { validated_need_id: confirmation.validated_need.validated_need_id, created_by: 'system' },
    });
    assertStatus(v1bBundleRes, 201);
    const v1bBundle = v1bBundleRes.json() as { validated_need_id: string };
    assert.equal(v1bBundle.validated_need_id, confirmation.validated_need.validated_need_id);

    const qualitySignalRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/quality-signals',
      payload: {
        title_card_id: titleCardId,
        target_ref: ref('validated_need', confirmation.validated_need.validated_need_id, titleCardId),
        stage: 'v1a',
        check_type: 'trace_review',
        verdict: 'warn',
        issue_codes: ['TRACE_REVIEW_REQUIRED'],
        recommended_action: 'inspect_trace',
        refs: [ref('evidence_map', evidenceMap.evidence_map.evidence_map_id, titleCardId)],
      },
    });
    assertStatus(qualitySignalRes, 201);
    const qualitySignal = qualitySignalRes.json() as { quality_signal_id: string };

    const interpretSignalRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/quality-signals/${encodeURIComponent(qualitySignal.quality_signal_id)}/interpret`,
    });
    assertStatus(interpretSignalRes, 201);
    const interpretedSignal = interpretSignalRes.json() as { queue_item: { queue_item_type: string } };
    assert.equal(interpretedSignal.queue_item.queue_item_type, 'recheck');

    const acceptedRiskRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/accepted-risks',
      payload: {
        title_card_id: titleCardId,
        risk_type: 'residual_coverage_gap',
        target_ref: ref('validated_need', confirmation.validated_need.validated_need_id, titleCardId),
        scope_refs: [ref('search_plan', plan.search_plan.search_plan_id, titleCardId, plan.search_plan.plan_version)],
        affected_object_refs: [ref('validated_need', confirmation.validated_need.validated_need_id, titleCardId)],
        rationale: 'Residual route-test coverage risk is bounded.',
        accepted_by: { actor_type: 'human', actor_id: 'route-test-reviewer' },
        recheck_condition: 'new counter-evidence appears',
      },
    });
    assertStatus(acceptedRiskRes, 201);
    const acceptedRisk = acceptedRiskRes.json() as { status: string; accepted_risk_id: string };
    assert.equal(acceptedRisk.status, 'active');

    // Phase 5 — the accepted-risk read projection returns the recorded risk for the title-card.
    const acceptedRiskListRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/title-cards/${titleCardId}/accepted-risks`,
    });
    assertStatus(acceptedRiskListRes, 200);
    const acceptedRiskList = acceptedRiskListRes.json() as {
      items: Array<{ accepted_risk_id: string }>;
    };
    assert.ok(
      acceptedRiskList.items.some((item) => item.accepted_risk_id === acceptedRisk.accepted_risk_id),
      'accepted-risk list projection returns the recorded risk',
    );

    const recheckCandidateRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/need-candidates',
      payload: {
        title_card_id: titleCardId,
        evidence_map_id: evidenceMap.evidence_map.evidence_map_id,
        candidate_need: 'Counter-evidence search should be rechecked before validating a secondary candidate.',
        mechanism_type: 'workflow_gap',
        scope_notes: 'Secondary route coverage candidate within topic-selection v1a.',
        prior_art_status: 'no_strong_solution_found',
        created_by: 'system',
      },
    });
    assertStatus(recheckCandidateRes, 201);
    const recheckCandidate = recheckCandidateRes.json() as { need_candidate_id: string };

    const recheckReadinessRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/need-candidates/${encodeURIComponent(recheckCandidate.need_candidate_id)}/readiness-assessments`,
      payload: {
        assessed_by: 'system',
      },
    });
    assertStatus(recheckReadinessRes, 201);
    const recheckReadiness = recheckReadinessRes.json() as { readiness_assessment_id: string };

    const recheckPacketRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/validation-support-packets',
      payload: {
        need_candidate_id: recheckCandidate.need_candidate_id,
        readiness_assessment_id: recheckReadiness.readiness_assessment_id,
        created_by: 'system',
      },
    });
    assertStatus(recheckPacketRes, 201);
    const recheckPacket = recheckPacketRes.json() as { validation_support_packet_id: string };

    const recheckAdjudicationRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/need-candidates/${encodeURIComponent(recheckCandidate.need_candidate_id)}/adjudications`,
      payload: {
        support_packet_id: recheckPacket.validation_support_packet_id,
        final_decision: 'request_searchplan_recheck',
        rationale: 'Counter-evidence coverage should be expanded.',
        searchplan_recheck_gap_codes: ['COUNTER_EVIDENCE_COVERAGE_GAP'],
        memory_suggestion: {
          suggestion_type: 'recheck_learning',
          rationale: 'Remember to expand counter-evidence before validating similar candidates.',
          suggestion_payload: { gap_code: 'COUNTER_EVIDENCE_COVERAGE_GAP' },
        },
        adjudicated_by: { actor_type: 'human', actor_id: 'route-test-reviewer' },
      },
    });
    assertStatus(recheckAdjudicationRes, 201);
    const recheckAdjudication = recheckAdjudicationRes.json() as {
      adjudication_result: {
        output_searchplan_recheck_request_ref: TopicSelectionFunctionalRef;
        output_memory_suggestion_ref: TopicSelectionFunctionalRef;
      };
    };

    const queuedRecheckRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/search-plan-recheck-requests/${encodeURIComponent(recheckAdjudication.adjudication_result.output_searchplan_recheck_request_ref.ref_id)}/queue`,
    });
    assertStatus(queuedRecheckRes, 201);
    const queuedRecheck = queuedRecheckRes.json() as { queue_item: { handler_key: string } };
    assert.equal(queuedRecheck.queue_item.handler_key, 'revise_search_plan');

    // T-087 Phase 2.2 — list SearchPlanRecheckRequests for the title-card.
    const recheckListRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/search-plan-recheck-requests`,
    });
    assertStatus(recheckListRes, 200);
    const recheckList = recheckListRes.json() as {
      items: Array<{ search_plan_recheck_request_id: string; title_card_id: string }>;
    };
    assert.ok(recheckList.items.length > 0);
    assert.ok(recheckList.items.every((item) => item.title_card_id === titleCardId));

    const memoryRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1a/candidate-memory-suggestions/${encodeURIComponent(recheckAdjudication.adjudication_result.output_memory_suggestion_ref.ref_id)}/materialize`,
      payload: {},
    });
    assertStatus(memoryRes, 201);
    const memory = memoryRes.json() as { memory_entry: { effect_policy: string } };
    assert.equal(memory.memory_entry.effect_policy, 'warn');

    // T-087 Phase 2.4 — list candidate memory suggestions for the recheck candidate.
    const memoryListRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/need-candidates/${encodeURIComponent(recheckCandidate.need_candidate_id)}/memory-suggestions`,
    });
    assertStatus(memoryListRes, 200);
    const memoryList = memoryListRes.json() as {
      items: Array<{ source_need_candidate_id: string; suggestion_type: string }>;
    };
    assert.ok(memoryList.items.length > 0);
    assert.ok(memoryList.items.every((item) => item.source_need_candidate_id === recheckCandidate.need_candidate_id));

    const queueRes = await app.inject({
      method: 'GET',
      url: '/topic-selection/v1a/work-queue/open',
    });
    assertStatus(queueRes, 200);
    const queue = queueRes.json() as { items: Array<{ title_card_id: string | null }> };
    assert.ok(queue.items.some((item) => item.title_card_id === titleCardId));

    // T-087 D1 read-only projections — assert the 4 list-by-title-card endpoints
    // expose what the reviewer workbench needs, without changing decision-chain
    // semantics. Each endpoint returns `{ items: [...] }` newest first.
    const listSearchPlansRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/search-plans`,
    });
    assertStatus(listSearchPlansRes, 200);
    const searchPlanList = listSearchPlansRes.json() as { items: Array<{ title_card_id: string; search_plan_id: string }> };
    assert.ok(searchPlanList.items.length > 0);
    assert.ok(searchPlanList.items.every((item) => item.title_card_id === titleCardId));

    const listEvidenceMapsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/evidence-maps`,
    });
    assertStatus(listEvidenceMapsRes, 200);
    const evidenceMapList = listEvidenceMapsRes.json() as { items: Array<{ title_card_id: string; evidence_map_id: string }> };
    assert.ok(evidenceMapList.items.length > 0);
    assert.ok(evidenceMapList.items.every((item) => item.title_card_id === titleCardId));

    const listNeedCandidatesRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/need-candidates`,
    });
    assertStatus(listNeedCandidatesRes, 200);
    const needCandidateList = listNeedCandidatesRes.json() as { items: Array<{ title_card_id: string; need_candidate_id: string }> };
    assert.ok(needCandidateList.items.length > 0);
    assert.ok(needCandidateList.items.every((item) => item.title_card_id === titleCardId));

    const listValidatedNeedsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/validated-needs`,
    });
    assertStatus(listValidatedNeedsRes, 200);
    const validatedNeedList = listValidatedNeedsRes.json() as { items: Array<{ title_card_id: string; validated_need_id: string }> };
    // ValidatedNeed creation depends on adjudication outcome; just assert shape.
    assert.ok(Array.isArray(validatedNeedList.items));
    assert.ok(validatedNeedList.items.every((item) => item.title_card_id === titleCardId));

    const offlineRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/offline-evaluation/datasets/synthetic-baseline',
      payload: {
        dataset_key: `topic-selection-v1a-api-${suffix}`,
      },
    });
    assertStatus(offlineRes, 201);
    const offline = offlineRes.json() as { dataset: { case_count: number }; cases: unknown[] };
    assert.equal(offline.dataset.case_count, offline.cases.length);
    assert.ok(offline.cases.length > 0);
  } finally {
    await app.close();
  }
});

test('topic-selection v1a native workflow harness invokes N1 and exposes trace artifacts', async () => {
  const app = buildApp();
  try {
    const suffix = uniqueId('v1a-native');
    const titleCardId = await createTitleCard(app, suffix);
    const runRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/workflow-harness/nodes/topic-selection.v1a.create-topic-seed.v1/invocations',
      payload: {
        schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
        node_id: 'topic-selection.v1a.create-topic-seed.v1',
        workflow_run_id: `workflow_run_${suffix}`,
        node_attempt_id: `node_attempt_${suffix}`,
        policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
        title_card_id: titleCardId,
        scenario_input: {
          scenario_id: 'topic-selection.native-http.canary.v1',
          scenario_case_id: 'n1-topic-seed',
          title_card_id: titleCardId,
          seed_version: 'v1',
          intent_summary: 'Native HTTP runner should create a topic seed through the harness service.',
          scope_notes: 'HTTP native v1a runner smoke.',
          policy_version: 'v1',
          output_schema_version: 'v1',
          expectations: {
            status: 'succeeded',
            seed_version: 'v1',
          },
        },
      },
    });
    assertStatus(runRes, 201);
    const run = runRes.json() as {
      route_decision: string;
      route_signal: string;
      route_target_node_id: string;
      harness_trace_artifact_ref: TopicSelectionFunctionalRef;
      scenario_result: {
        node_input: { policy_version_id: string };
        node_result: { topic_seed_ref: TopicSelectionFunctionalRef };
      };
    };
    assert.equal(run.route_decision, 'invoke_next');
    assert.equal(run.route_signal, 'topic_seed_created');
    assert.equal(run.route_target_node_id, 'topic-selection.v1a.snapshot-literature-resource-pool.v1');
    assert.equal(run.scenario_result.node_result.topic_seed_ref.ref_type, 'topic_seed');
    assert.equal(run.scenario_result.node_input.policy_version_id, TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION);

    const artifactRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1a/workflow-harness/artifacts/${encodeURIComponent(run.harness_trace_artifact_ref.ref_id)}`,
    });
    assertStatus(artifactRes, 200);
    const artifact = artifactRes.json() as { artifact_kind: string; workflow_run_id: string | null };
    assert.equal(artifact.artifact_kind, 'trace');
    assert.equal(artifact.workflow_run_id, `workflow_run_${suffix}`);

    const mismatchRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/workflow-harness/nodes/topic-selection.v1a.create-topic-seed.v1/invocations',
      payload: {
        schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
        node_id: 'topic-selection.v1a.create-search-plan.v1',
        workflow_run_id: `workflow_run_${suffix}_mismatch`,
        node_attempt_id: `node_attempt_${suffix}_mismatch`,
        policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
        title_card_id: titleCardId,
        scenario_input: {},
      },
    });
    assert.equal(mismatchRes.statusCode, 400);
    const mismatch = mismatchRes.json() as { error: { code: string } };
    assert.equal(mismatch.error.code, 'INVALID_PAYLOAD');

    const unsupportedPolicyRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/workflow-harness/nodes/topic-selection.v1a.create-topic-seed.v1/invocations',
      payload: {
        schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
        node_id: 'topic-selection.v1a.create-topic-seed.v1',
        workflow_run_id: `workflow_run_${suffix}_unsupported_policy`,
        node_attempt_id: `node_attempt_${suffix}_unsupported_policy`,
        policy_version: 'topic-selection-v1a-workflow-route-policy-v0',
        title_card_id: titleCardId,
        scenario_input: {},
      },
    });
    assert.equal(unsupportedPolicyRes.statusCode, 400);

    const directWriteAutomationRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/search-plans',
      payload: {
        scenario_id: 'topic-selection.native-http.canary.v1',
        node_attempt_id: `node_attempt_${suffix}_direct_write`,
        title_card_id: titleCardId,
        topic_seed_id: run.scenario_result.node_result.topic_seed_ref.ref_id,
        literature_resource_pool_snapshot_id: 'snapshot-not-used',
        query_intents: ['should be rejected before direct write execution'],
      },
    });
    assert.equal(directWriteAutomationRes.statusCode, 409);
    const directWriteAutomation = directWriteAutomationRes.json() as { error: { code: string } };
    assert.equal(directWriteAutomation.error.code, 'AUTOMATIC_HARNESS_PATH_REQUIRES_NATIVE_RUNNER');

    const automaticHarnessMarkerPayload = {
      scenario_id: 'topic-selection.native-http.canary.v1',
      node_attempt_id: `node_attempt_${suffix}_auxiliary_direct_write`,
    };
    for (const url of [
      '/topic-selection/v1a/resource-samples',
      '/topic-selection/v1a/search-plan-recheck-requests',
      '/topic-selection/v1a/search-plan-recheck-requests/recheck_request_guard/resolve',
      '/topic-selection/v1a/evidence-strength-assessments',
      '/topic-selection/v1a/evidence-maps/evidence_map_guard/stale',
      '/topic-selection/v1a/quality-signals',
      '/topic-selection/v1a/quality-signals/quality_signal_guard/interpret',
      '/topic-selection/v1a/search-plan-recheck-requests/recheck_request_guard/queue',
      '/topic-selection/v1a/candidate-memory-suggestions/memory_suggestion_guard/materialize',
      '/topic-selection/v1a/accepted-risks',
      '/topic-selection/v1a/offline-evaluation/datasets',
      '/topic-selection/v1a/offline-evaluation/datasets/synthetic-baseline',
      '/topic-selection/v1a/offline-evaluation/cases',
      '/topic-selection/v1a/offline-evaluation/runs',
      '/topic-selection/v1a/offline-evaluation/case-results',
      '/topic-selection/v1a/offline-evaluation/runs/offline_run_guard/complete',
    ]) {
      const guardedRes = await app.inject({
        method: 'POST',
        url,
        payload: automaticHarnessMarkerPayload,
      });
      assert.equal(guardedRes.statusCode, 409, `${url} must reject automatic harness markers`);
      const guarded = guardedRes.json() as { error: { code: string } };
      assert.equal(guarded.error.code, 'AUTOMATIC_HARNESS_PATH_REQUIRES_NATIVE_RUNNER');
    }
  } finally {
    await app.close();
  }
});

test('topic-selection v1a native workflow harness drives N1-N9 without direct automatic write routes', async () => {
  const app = buildApp({ topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway() });
  try {
    const suffix = uniqueId('v1a-native-full');
    const literatureId = await createLiterature(app, suffix);
    const titleCardId = await createTitleCard(app, suffix);
    const basketRes = await app.inject({
      method: 'PATCH',
      url: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
      payload: { add_literature_ids: [literatureId] },
    });
    assertStatus(basketRes, 200);

    const n1 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.create-topic-seed.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n1',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n1_${suffix}`,
        node_attempt_id: `node_attempt_n1_${suffix}`,
        intent_summary: 'Native HTTP N1-N9 runner validates production orchestration.',
        scope_notes: 'Full v1a native HTTP route smoke.',
        policy_version: 'v1',
        output_schema_version: 'v1',
        expectations: { status: 'succeeded' },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'topic_seed_created',
        route_target_node_id: 'topic-selection.v1a.snapshot-literature-resource-pool.v1',
      },
    );
    const n2 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.snapshot-literature-resource-pool.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n2',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n2_${suffix}`,
        node_attempt_id: `node_attempt_n2_${suffix}`,
        topic_seed_ref: n1.scenario_result.node_result.topic_seed_ref,
        source_scope: 'title_card_evidence_basket',
        policy_version: 'v1',
        output_schema_version: 'v1',
        expectations: { status: 'succeeded', included_literature_count: 1 },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'literature_resource_pool_snapshot_created',
        route_target_node_id: 'topic-selection.v1a.create-search-plan.v1',
      },
    );
    const literatureRef = n2.scenario_result.node_result.included_literature_refs[0] ?? ref('literature_record', literatureId, titleCardId);
    const sourceRef = n2.scenario_result.node_result.content_source_refs[0] ?? ref('literature_source', `source-${suffix}`, titleCardId);
    const coverageIntents = [
      ['support-native', 'support', 'support native v1a orchestration'],
      ['challenge-native', 'challenge', 'challenge native v1a orchestration'],
      ['baseline-native', 'baseline', 'baseline native v1a orchestration'],
      ['context-native', 'context', 'context native v1a orchestration'],
    ].map(([coverageKey, role, query], index) => ({
      coverage_key: coverageKey,
      intent_type: role,
      query,
      expected_evidence_role: role,
      rationale: `Native ${role} coverage.`,
      required: true,
      priority: index,
      target_source_types: ['paper'],
      refs: [literatureRef],
    }));
    const blueprint = {
      schema_version: TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
      blueprint_origin: 'workflow_scenario_fixture',
      blueprint_provenance_refs: [],
      title_card_ref: ref('title_card', titleCardId, titleCardId),
      topic_seed_ref: n1.scenario_result.node_result.topic_seed_ref,
      literature_resource_pool_snapshot_ref: n2.scenario_result.node_result.literature_resource_pool_snapshot_ref,
      expected_snapshot_hash: n2.scenario_result.node_result.snapshot_hash,
      plan_version: 'v1',
      parent_search_plan_ref: null,
      recheck_request_ref: null,
      query_intents: coverageIntents.map((intent) => intent.query),
      coverage_intents: coverageIntents,
      must_check_constraints: ['Keep v1a native route policy as the only automatic orchestration path.'],
      exclusion_rules: ['Do not drive automatic v1a orchestration through direct write routes.'],
      coverage_strategy: { breadth: 'role_balanced_fixture', sequencing: ['support', 'challenge', 'baseline', 'context'] },
      role_coverage_expectation: { support: 1, challenge: 1, baseline: 1, context: 1 },
      method_family_targets: ['workflow_orchestration'],
      policy_version: 'v1',
      output_schema_version: 'v1',
    };
    const n3 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.create-search-plan.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n3',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n3_${suffix}`,
        node_attempt_id: `node_attempt_n3_${suffix}`,
        blueprint,
        expectations: { status: 'succeeded', coverage_row_count: 4, plan_version: 'v1' },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'search_plan_created',
        route_target_node_id: 'topic-selection.v1a.record-search-run.v1',
      },
    );
    const coverageRowRefs = n3.scenario_result.node_result.coverage_row_intent_refs as TopicSelectionFunctionalRef[];
    const searchRunBundle = {
      schema_version: TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
      title_card_ref: ref('title_card', titleCardId, titleCardId),
      search_plan_ref: n3.scenario_result.node_result.search_plan_ref,
      literature_resource_pool_snapshot_ref: n2.scenario_result.node_result.literature_resource_pool_snapshot_ref,
      expected_literature_snapshot_hash: n2.scenario_result.node_result.snapshot_hash,
      run_kind: 'planned_search',
      run_status: 'succeeded',
      query_provenance: coverageIntents.map((intent) => ({ query: intent.query, coverage_key: intent.coverage_key, source: 'native_http_fixture' })),
      result_accounting: {
        total_result_count: 4,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: { source_count: 1, failed_source_count: 0, warning_codes: [] },
      dedup_summary: { duplicate_groups: 0, canonical_work_refs: [literatureRef] },
      evidence_map_input_refs: [literatureRef, sourceRef],
      coverage_observations: coverageRowRefs.map((rowRef) => ({
        coverage_row_intent_ref: rowRef,
        status: 'succeeded',
        result_count: 1,
        source_count: 1,
        missing_reason_codes: [],
      })),
      evidence_bindings: coverageRowRefs.map((rowRef, index) => ({
        coverage_row_intent_ref: rowRef,
        literature_ref: literatureRef,
        source_refs: [sourceRef],
        binding_kind: 'retrieval_hit',
        result_rank: index + 1,
      })),
      coverage_assessments: coverageRowRefs.map((rowRef) => ({
        coverage_row_intent_ref: rowRef,
        verdict: 'satisfied',
        issue_codes: [],
        confidence: 0.88,
        assessed_by: 'system',
      })),
      coverage_risk_acceptances: [],
      raw_log_artifact_ref: ref('raw_search_log', `raw_search_${suffix}`, titleCardId),
      raw_log_artifact_payload: { fixture: 'native_http' },
      policy_version: 'v1',
      output_schema_version: 'v1',
    };
    const n4 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.record-search-run.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n4',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n4_${suffix}`,
        node_attempt_id: `node_attempt_n4_${suffix}`,
        bundle: searchRunBundle,
        expectations: { status: 'succeeded', consumable_for_evidence_map: true, downstream_handoff_present: true },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'search_run_consumable',
        route_target_node_id: 'topic-selection.v1a.build-evidence-map.v1',
      },
    );
    const n5 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.build-evidence-map.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n5',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n5_${suffix}`,
        node_attempt_id: `node_attempt_n5_${suffix}`,
        search_run_handoff: n4.scenario_result.node_result.downstream_handoff,
        extraction_draft: buildNativeEvidenceMapDraft({
          titleCardId,
          searchRunHandoff: n4.scenario_result.node_result.downstream_handoff,
          literatureRef,
          sourceRef,
        }),
        execution_mode: 'none',
        policy_version: 'v1',
        output_schema_version: 'v1',
        expectations: { status: 'succeeded', materialization_status: 'ready', evidence_unit_count: 4, downstream_handoff_present: true },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'evidence_map_ready',
        route_target_node_id: 'topic-selection.v1a.generate-need-candidate.v1',
      },
    );
    const n6AttemptId = `node_attempt_n6_${suffix}`;
    const n6StrengthRef = ref('evidence_strength_assessment', `strength_${suffix}`, titleCardId);
    const n6 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.generate-need-candidate.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n6',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n6_${suffix}`,
        node_attempt_id: n6AttemptId,
        topic_scope_ref: ref('topic_scope', `topic_${suffix}`, titleCardId),
        evidence_map_ref: n5.scenario_result.node_result.evidence_map_ref,
        evidence_strength_ref: n6StrengthRef,
        resource_sample_set_ref: ref('resource_sample_set', `sample_${suffix}`, titleCardId),
        search_snapshot_refs: [n4.scenario_result.node_result.search_run_ref],
        resource_snapshot_refs: [n2.scenario_result.node_result.literature_resource_pool_snapshot_ref],
        policy_version: 'v1',
        output_schema_version: 'v1',
        profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
        execution_mode: 'mocked_llm',
        run_mode: 'acceptance',
        exploration_payload: buildNativeExplorationPayload(),
        arbiter_payload: buildNativeArbiterPayload({
          evidenceMapRecords: n5.scenario_result.node_result.evidence_map_records,
          titleCardId,
          strengthRef: n6StrengthRef,
        }),
        mocked_output: {
          fixture_id: `ranked_batch_${suffix}`,
          output: buildNativeRankedBatch({
            titleCardId,
            nodeAttemptId: n6AttemptId,
            evidenceMapRecords: n5.scenario_result.node_result.evidence_map_records,
            strengthRef: n6StrengthRef,
          }),
        },
        current_round_index: 1,
        remaining_round_budget: 0,
        persist_admitted_candidates: true,
        persistence_context: {
          search_run_ref: n4.scenario_result.node_result.search_run_ref,
          search_plan_ref: n3.scenario_result.node_result.search_plan_ref,
          literature_snapshot_ref: n2.scenario_result.node_result.literature_resource_pool_snapshot_ref,
        },
        expectations: {
          status: 'succeeded',
          routing_decision: 'finalize_with_admitted_batch',
          admitted_draft_count: 1,
          persisted_candidate_count: 1,
          persistence: 'required',
        },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'need_candidate_batch_finalized',
        route_target_node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
      },
    );
    const candidate = n6.scenario_result.adapter_result.persist_need_candidate_batch_result.persisted_candidates[0];
    const candidateRef = ref('need_candidate', candidate.need_candidate_id, titleCardId, candidate.candidate_version);
    const n7 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.validate-need-adjudication.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n7',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n7_${suffix}`,
        node_attempt_id: `node_attempt_n7_${suffix}`,
        need_candidate_ref: candidateRef,
        evidence_map_ref: candidate.evidence_map_ref,
        search_run_ref: candidate.search_run_ref,
        search_plan_ref: candidate.search_plan_ref,
        literature_snapshot_ref: candidate.literature_snapshot_ref,
        execution_mode: 'provider_llm',
        run_mode: 'acceptance',
        executor_kind: 'single_agent',
        profile_id: TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
        fixture_human_decision: true,
        policy_version: 'v1',
        output_schema_version: 'v1',
        expectations: {
          status: 'ready',
          route_outcome: 'advance_to_human_confirmation',
          final_decision: 'validate',
          adjudication_created: true,
        },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'need_adjudication_validated',
        route_target_node_id: 'topic-selection.v1a.human-confirm-need.v1',
      },
    );
    const n8 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.human-confirm-need.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n8',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n8_${suffix}`,
        node_attempt_id: `node_attempt_n8_${suffix}`,
        adjudication_result_ref: n7.scenario_result.node_result.adjudication_result_ref,
        need_candidate_ref: candidateRef,
        validation_support_packet_ref: n7.scenario_result.node_result.validation_support_packet_ref,
        reserved_validated_need_ref: n7.scenario_result.node_result.reserved_validated_need_ref,
        confirmation_input: {
          schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
          actor_mode: 'human',
          accountable_human_ref: { actor_type: 'human', actor_id: 'native-route-reviewer' },
          rationale: 'Native HTTP route test confirms v1a validation handoff.',
          accepted_risk_refs: n7.scenario_result.node_result.residual_risk_refs,
          required_check_results: [
            'confirm_unmet_need',
            'review_prior_art_status',
            'review_counter_evidence',
            'confirm_scope_and_non_goals',
            'confirm_v1b_handoff_readiness',
          ].map((checkId) => ({ check_id: checkId, result: 'accepted' })),
          delegated_executor: null,
        },
        execution_mode: 'deterministic_parser',
        policy_version: 'v1',
        output_schema_version: 'v1',
        profile_id: TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
        expectations: {
          status: 'ready',
          route_outcome: 'advance_to_publish_v1b_input_bundle',
          validated_need_created: true,
          v1b_bundle_created: false,
        },
        created_by: 'system',
      },
      {
        route_decision: 'invoke_next',
        route_signal: 'human_confirmation_ready',
        route_target_node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1',
      },
    );
    const n9 = await invokeV1aNativeHarnessNode(
      app,
      'topic-selection.v1a.publish-v1b-input-bundle.v1',
      {
        scenario_id: 'topic-selection.native-http.full.v1',
        scenario_case_id: 'n9',
        title_card_id: titleCardId,
        workflow_run_id: `workflow_run_n9_${suffix}`,
        node_attempt_id: `node_attempt_n9_${suffix}`,
        validated_need_ref: n8.scenario_result.node_result.validated_need_ref,
        source_need_candidate_ref: candidateRef,
        adjudication_result_ref: n8.scenario_result.node_result.adjudication_result_ref,
        support_packet_ref: n8.scenario_result.node_result.validation_support_packet_ref,
        human_decision_ref: n8.scenario_result.node_result.human_decision_ref,
        evidence_map_ref: candidate.evidence_map_ref,
        search_run_ref: candidate.search_run_ref,
        search_plan_ref: candidate.search_plan_ref,
        literature_snapshot_ref: candidate.literature_snapshot_ref,
        evidence_role_bundle: candidate.evidence_role_bundle,
        risk_refs: [...n8.scenario_result.node_result.residual_risk_refs, ...n8.scenario_result.node_result.accepted_risk_refs],
        memory_suggestion_refs: [],
        recheck_request_refs: [],
        expected_bundle_version: 'v1a-to-v1b-input-bundle-v1',
        policy_version: 'v1',
        output_schema_version: 'v1',
        expectations: {
          status: 'ready',
          route_outcome: 'published_v1b_input_bundle',
          idempotency_result: 'created_new_bundle',
          bundle_published: true,
        },
        created_by: 'system',
      },
      {
        route_decision: 'stop_v1a_complete',
        route_signal: 'v1b_input_bundle_published',
        route_target_node_id: 'v1b.entry',
      },
    );

    assert.equal(n9.scenario_result.node_result.v1b_input_bundle_ref.ref_type, 'v1b_input_bundle');
    assert.equal(n9.harness_trace_artifact_ref?.ref_type, 'artifact_ref');
  } finally {
    await app.close();
  }
});

test('topic-selection v1a routes reject malformed search-plan payloads before service execution', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/search-plans',
      payload: {
        title_card_id: 'title-card-missing-query-intents',
        topic_seed_id: 'topic-seed-missing-query-intents',
        literature_resource_pool_snapshot_id: 'snapshot-missing-query-intents',
      },
    });
    assert.equal(res.statusCode, 400);
    const body = res.json() as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'INVALID_PAYLOAD');
    assert.match(body.error.message, /query_intents/);
  } finally {
    await app.close();
  }
});

test('topic-selection v1a routes accept omitted bodies for optional requestBody endpoints', async () => {
  const app = buildApp();
  try {
    const datasetRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/offline-evaluation/datasets',
    });
    assertStatus(datasetRes, 201);
    const dataset = datasetRes.json() as { offline_evaluation_dataset_id: string; dataset_key: string };
    assert.ok(dataset.offline_evaluation_dataset_id);
    assert.equal(dataset.dataset_key, 'topic-selection-v1a-synthetic-baseline');

    const syntheticRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1a/offline-evaluation/datasets/synthetic-baseline',
    });
    assertStatus(syntheticRes, 201);
    const synthetic = syntheticRes.json() as { dataset: { case_count: number }; cases: unknown[] };
    assert.equal(synthetic.dataset.case_count, synthetic.cases.length);
    assert.ok(synthetic.cases.length > 0);
  } finally {
    await app.close();
  }
});
