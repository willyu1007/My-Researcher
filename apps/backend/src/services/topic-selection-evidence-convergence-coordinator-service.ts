import type {
  LiteratureRetrieveEvidenceChunk,
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
  canonicalizeEvidenceConvergenceRequest,
  evaluateEvidenceConvergenceBoundary,
  type TopicSelectionEvidenceConvergenceRetrievalRequestIntent,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceSourceLocator,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionResearchArenaParticipantRole,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

type SearchResources = Pick<TopicSelectionSearchResourceService,
  | 'createSearchPlanRecheckRequest'
  | 'getSearchPlanById'
  | 'getLiteratureResourcePoolSnapshotById'
  | 'getCoverageMatrix'
  | 'createSearchPlan'
  | 'recordSearchRun'
  | 'completeEvidenceConvergenceRecheckRequest'
  | 'getSearchRunById'
  | 'getSearchPlanRecheckRequestById'
  | 'listSearchPlanRecheckRequestsByTitleCardId'
>;

export type TopicSelectionEvidenceConvergenceRoleRetrievalRequest = {
  participant_role: TopicSelectionResearchArenaParticipantRole;
  intent: TopicSelectionEvidenceConvergenceRetrievalRequestIntent;
};

export type TopicSelectionEvidenceConvergenceRuntimeAccounting = {
  orchestration_steps: number;
  linked_rounds: number;
  elapsed_ms: number;
  accumulated_cost_microusd: number;
};

export type TopicSelectionEvidenceConvergenceRetrievalHit = {
  query: string;
  literature_ref: TopicSelectionFunctionalRef;
  embedding_version_id: string;
  chunk_ref: TopicSelectionFunctionalRef;
  chunk_id?: string;
  chunk_hash: string;
  /** Persisted so later claim admission can verify the exact quoted retrieval chunk. */
  source_text?: string;
  hybrid_score?: number;
  vector_score?: number;
  lexical_score?: number;
  is_stale?: boolean;
  rank: number;
};

export type TopicSelectionEvidenceConvergenceRetrievalExecution = {
  request_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  retrieval_hit_count: number;
  retrieval_hits: TopicSelectionEvidenceConvergenceRetrievalHit[];
  retrieval_cost_microusd: number;
  reused: boolean;
};

export type TopicSelectionEvidenceConvergenceRetrievalResult = {
  status: 'retrieval_ready' | 'saturated_unresolved' | 'boundary_exhausted_unresolved';
  reason_codes: string[];
  requests: TopicSelectionSearchPlanRecheckRequestRecord[];
  executions: TopicSelectionEvidenceConvergenceRetrievalExecution[];
  accounting: TopicSelectionEvidenceConvergenceRuntimeAccounting;
  role_distributions: Array<{
    participant_role: TopicSelectionResearchArenaParticipantRole;
    request_ref: TopicSelectionFunctionalRef;
    search_run_ref: TopicSelectionFunctionalRef;
    reused: boolean;
  }>;
};

export type TopicSelectionExecuteEvidenceConvergenceRetrievalInput = {
  workspace_id?: string | null;
  title_card_id: string;
  target_search_plan_id: string;
  predecessor_evidence_map_id: string;
  role_requests: TopicSelectionEvidenceConvergenceRoleRetrievalRequest[];
  accounting: TopicSelectionEvidenceConvergenceRuntimeAccounting;
  policy_version_id?: string | null;
};

type QueryExecution = {
  query: string;
  response: LiteratureRetrieveResponse;
  coverageRow: TopicSelectionCoverageRowIntentRecord;
};

export class TopicSelectionEvidenceConvergenceCoordinatorService {
  constructor(private readonly dependencies: {
    searchResources: SearchResources;
    retriever: { retrieve(request: LiteratureRetrieveRequest): Promise<LiteratureRetrieveResponse> };
    scopedRetriever: {
      retrieve(
        request: LiteratureRetrieveRequest,
        literatureIds: string[],
      ): Promise<LiteratureRetrieveResponse>;
    };
    evidenceMapReader: {
      findEvidenceMapById(evidenceMapId: string): Promise<TopicSelectionEvidenceMapRecord | null>;
      listEvidenceUnitsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceUnitRecord[]>;
    };
    nowMs?: () => number;
  }) {}

  async executeRoleRetrievalRequests(
    input: TopicSelectionExecuteEvidenceConvergenceRetrievalInput,
  ): Promise<TopicSelectionEvidenceConvergenceRetrievalResult> {
    if (!input.title_card_id.trim() || !input.target_search_plan_id.trim()
      || !input.predecessor_evidence_map_id.trim() || input.role_requests.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Evidence convergence requires a title, plan, and role request.');
    }
    const boundary = evaluateEvidenceConvergenceBoundary({
      policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
      ...input.accounting,
      execution_completed: false,
      material_delta: false,
      strategy_changed: false,
    });
    if (boundary.disposition === 'boundary_exhausted_unresolved') {
      return {
        status: 'boundary_exhausted_unresolved',
        reason_codes: boundary.reason_codes,
        requests: [],
        executions: [],
        accounting: input.accounting,
        role_distributions: [],
      };
    }

    const predecessor = await this.dependencies.evidenceMapReader.findEvidenceMapById(
      input.predecessor_evidence_map_id,
    );
    const currentPredecessor = predecessor?.status === 'ready'
      && predecessor.freshness_status === 'current'
      && !predecessor.successor_evidence_map_ref;
    const replayableHistoricalPredecessor = predecessor?.status === 'stale'
      && predecessor.freshness_status === 'superseded'
      && Boolean(predecessor.successor_evidence_map_ref);
    if (!predecessor || predecessor.title_card_id !== input.title_card_id
      || predecessor.search_plan_ref.ref_id !== input.target_search_plan_id
      || (!currentPredecessor && !replayableHistoricalPredecessor)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence requires a current predecessor or an exact durable replay.');
    }
    if (input.workspace_id !== undefined
      && (input.workspace_id ?? null) !== (predecessor.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence workspace scope does not match the predecessor EvidenceMap.');
    }
    const workspaceId = input.workspace_id ?? predecessor.workspace_id ?? null;
    const predecessorUnits = await this.dependencies.evidenceMapReader.listEvidenceUnitsByEvidenceMapId(
      predecessor.evidence_map_id,
    );
    const startedAt = (this.dependencies.nowMs ?? Date.now)();

    const requestByRole = predecessor.freshness_status === 'superseded'
      ? await this.historicalRequestReplays(input, workspaceId)
      : await Promise.all(input.role_requests.map(async (roleRequest) => ({
          participant_role: roleRequest.participant_role,
          request: await this.dependencies.searchResources.createSearchPlanRecheckRequest({
            workspace_id: workspaceId,
            title_card_id: input.title_card_id,
            source_ref: roleRequest.intent.issue_ref,
            target_search_plan_id: input.target_search_plan_id,
            reason: `Resolve evidence-landscape issue ${roleRequest.intent.issue_ref.ref_id}.`,
            gap_codes: ['REQUIRED_COVERAGE_MISSING'],
            requested_by: 'system',
            policy_version_id: input.policy_version_id ?? null,
            evidence_convergence_intent: roleRequest.intent,
          }),
        })));
    const uniqueRequests = [...new Map(requestByRole.map(({ request }) => [
      request.search_plan_recheck_request_id,
      request,
    ])).values()];
    const executions: TopicSelectionEvidenceConvergenceRetrievalExecution[] = [];
    for (const request of uniqueRequests) {
      executions.push(await this.executeOrReuseRequest(request, predecessorUnits));
    }
    const executionByRequestId = new Map(executions.map((execution) => [execution.request_ref.ref_id, execution]));
    const roleDistributions = requestByRole.map(({ participant_role, request }) => {
      const execution = executionByRequestId.get(request.search_plan_recheck_request_id);
      if (!execution) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Evidence-convergence execution distribution is incomplete.');
      }
      return {
        participant_role,
        request_ref: execution.request_ref,
        search_run_ref: execution.search_run_ref,
        reused: execution.reused,
      };
    });
    const completedRequests = await Promise.all(uniqueRequests.map(async (request) => {
      const completed = await this.dependencies.searchResources.getSearchPlanRecheckRequestById(
        request.search_plan_recheck_request_id,
      );
      if (!completed) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence request disappeared after execution.');
      }
      return completed;
    }));
    const hasHits = executions.some((execution) => execution.retrieval_hit_count > 0);
    const accounting = {
      ...input.accounting,
      orchestration_steps: input.accounting.orchestration_steps
        + (executions.some((execution) => !execution.reused) ? 1 : 0),
      elapsed_ms: input.accounting.elapsed_ms + Math.max(
        0,
        (this.dependencies.nowMs ?? Date.now)() - startedAt,
      ),
      accumulated_cost_microusd: input.accounting.accumulated_cost_microusd
        + executions.reduce((total, execution) => (
          total + (execution.reused ? 0 : execution.retrieval_cost_microusd)
        ), 0),
    };
    const completedBoundary = evaluateEvidenceConvergenceBoundary({
      policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
      ...accounting,
      execution_completed: false,
      material_delta: false,
      strategy_changed: false,
    });
    return {
      status: completedBoundary.disposition === 'boundary_exhausted_unresolved'
        ? 'boundary_exhausted_unresolved'
        : hasHits ? 'retrieval_ready' : 'saturated_unresolved',
      reason_codes: completedBoundary.disposition === 'boundary_exhausted_unresolved'
        ? completedBoundary.reason_codes
        : hasHits ? [] : ['UNCHANGED_STRATEGY_NO_RETRIEVAL_HITS'],
      requests: completedRequests,
      executions,
      accounting,
      role_distributions: roleDistributions,
    };
  }

  private async historicalRequestReplays(
    input: TopicSelectionExecuteEvidenceConvergenceRetrievalInput,
    workspaceId: string | null,
  ): Promise<Array<{
    participant_role: TopicSelectionResearchArenaParticipantRole;
    request: TopicSelectionSearchPlanRecheckRequestRecord;
  }>> {
    const persisted = await this.dependencies.searchResources
      .listSearchPlanRecheckRequestsByTitleCardId(input.title_card_id);
    return input.role_requests.map((roleRequest) => {
      const canonical = canonicalizeEvidenceConvergenceRequest(roleRequest.intent);
      const request = persisted.find((candidate) => candidate.status === 'materialized'
        && Boolean(candidate.resulting_search_plan_ref)
        && Boolean(candidate.resulting_search_run_ref)
        && candidate.target_search_plan_ref.ref_id === input.target_search_plan_id
        && (candidate.workspace_id ?? null) === workspaceId
        && stableStringify({
          issue_ref: candidate.issue_ref,
          originating_arena_session_ref: candidate.originating_arena_session_ref,
          expected_decision_effect: candidate.expected_decision_effect,
          strategy_identity_payload: candidate.retrieval_intent ? {
            search_intent: candidate.retrieval_intent.search_intent,
            candidate_queries: candidate.retrieval_intent.candidate_queries,
            corpus_manifest_ref: candidate.retrieval_intent.corpus_manifest_ref,
            corpus_manifest_hash: candidate.retrieval_intent.corpus_manifest_hash,
            retrieval_parameters: candidate.retrieval_intent.retrieval_parameters,
          } : null,
        }) === stableStringify(canonical.request_identity_payload));
      if (!request) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'A superseded predecessor permits only an exact materialized retrieval replay.',
        );
      }
      return { participant_role: roleRequest.participant_role, request };
    });
  }

  private async executeOrReuseRequest(
    request: TopicSelectionSearchPlanRecheckRequestRecord,
    predecessorUnits: TopicSelectionEvidenceUnitRecord[],
  ): Promise<TopicSelectionEvidenceConvergenceRetrievalExecution> {
    if (request.resulting_search_run_ref) {
      const run = await this.dependencies.searchResources.getSearchRunById(
        request.resulting_search_run_ref.ref_id,
      );
      if (!run || run.title_card_id !== request.title_card_id
        || (run.workspace_id ?? null) !== (request.workspace_id ?? null)
        || run.search_plan_ref.ref_id !== request.resulting_search_plan_ref?.ref_id) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Reusable retrieval execution has broken SearchRun lineage.');
      }
      return this.executionResult(
        request,
        run,
        this.readPersistedHits(run),
        this.persistedRetrievalCostMicrousd(run),
        true,
      );
    }
    if (request.status !== 'open' || !request.retrieval_intent || !request.corpus_manifest_ref
      || !request.issue_ref || !request.request_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence request is not executable.');
    }
    const [parentPlan, manifest, coverage] = await Promise.all([
      this.dependencies.searchResources.getSearchPlanById(request.target_search_plan_ref.ref_id),
      this.dependencies.searchResources.getLiteratureResourcePoolSnapshotById(
        request.corpus_manifest_ref.ref_id,
      ),
      this.dependencies.searchResources.getCoverageMatrix(request.target_search_plan_ref.ref_id),
    ]);
    if (!parentPlan || !manifest || manifest.snapshot_hash !== request.corpus_manifest_hash
      || (parentPlan.workspace_id ?? null) !== (request.workspace_id ?? null)
      || (manifest.workspace_id ?? null) !== (request.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence plan or corpus authority is missing.');
    }
    const issueRow = coverage.rows.find((row) =>
      row.coverage_row_intent.coverage_row_intent_id === request.issue_ref?.ref_id)?.coverage_row_intent;
    if (!issueRow) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence issue is outside the target SearchPlan.');
    }
    const child = await this.dependencies.searchResources.createSearchPlan({
      workspace_id: request.workspace_id ?? null,
      title_card_id: request.title_card_id,
      topic_seed_id: parentPlan.topic_seed_ref.ref_id,
      literature_resource_pool_snapshot_id: manifest.literature_resource_pool_snapshot_id,
      query_intents: request.retrieval_intent.candidate_queries,
      must_check_constraints: parentPlan.must_check_constraints,
      exclusion_rules: parentPlan.exclusion_rules,
      coverage_strategy: {
        ...parentPlan.coverage_strategy,
        evidence_convergence_request_key: request.request_key,
        evidence_convergence_strategy_key: request.strategy_key,
      },
      coverage_intents: coverage.rows.map(({ coverage_row_intent: row }) => ({
        coverage_key: row.coverage_key,
        intent_type: row.intent_type,
        query: row.query,
        rationale: row.rationale,
        required: row.required,
        priority: row.priority,
        target_source_types: row.target_source_types,
        expected_evidence_role: row.expected_evidence_role,
        refs: row.refs,
      })),
      parent_search_plan_ref: request.target_search_plan_ref,
      recheck_request_ref: this.ref(
        'search_plan_recheck_request',
        request.search_plan_recheck_request_id,
        request.title_card_id,
      ),
      created_by: 'system',
      policy_version_id: request.policy_version_id ?? null,
    });
    const childIssueRow = child.coverage_row_intents.find((row) => row.coverage_key === issueRow.coverage_key);
    if (!childIssueRow) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Evidence-convergence child plan lost the issue coverage row.');
    }
    const queryExecutions: QueryExecution[] = [];
    for (let index = 0; index < request.retrieval_intent.candidate_queries.length; index += 1) {
      const query = request.retrieval_intent.candidate_queries[index]!;
      const response = await this.retrieve(query, request, manifest);
      queryExecutions.push({ query, response, coverageRow: childIssueRow });
    }
    const hits = this.hits(queryExecutions, request.title_card_id);
    const uniqueLiteratureCount = new Set(hits.map((hit) => hit.literature_ref.ref_id)).size;
    const degraded = queryExecutions.some(({ response }) => response.meta.degraded_mode
      || response.meta.freshness_warnings.length > 0
      || response.meta.skipped_profiles.length > 0);
    const evidenceMapInputRefs = this.uniqueRefs([
      ...this.evidenceMapInputRefs(queryExecutions, request.title_card_id),
      ...predecessorUnits.flatMap((unit) => this.unitAuthorityRefs(unit)),
    ]);
    const runResult = await this.dependencies.searchResources.recordSearchRun({
      workspace_id: request.workspace_id ?? null,
      title_card_id: request.title_card_id,
      search_plan_id: child.search_plan.search_plan_id,
      literature_resource_pool_snapshot_id: manifest.literature_resource_pool_snapshot_id,
      literature_resource_pool_snapshot_ref: request.corpus_manifest_ref,
      expected_literature_snapshot_hash: request.corpus_manifest_hash ?? undefined,
      run_kind: 'recheck_followup',
      run_status: degraded ? 'partial' : 'succeeded',
      query_provenance: queryExecutions.map(({ query, response }) => ({
        schema_version: 'TopicSelectionEvidenceConvergenceQueryExecution@v1',
        request_key: request.request_key,
        strategy_key: request.strategy_key,
        query,
        retrieval_meta: response.meta,
        hits: hits.filter((hit) => hit.query === query),
      })),
      result_accounting: {
        total_result_count: queryExecutions.reduce((total, item) => total + item.response.items.length, 0),
        unique_literature_count: uniqueLiteratureCount,
        duplicate_result_count: Math.max(
          0,
          queryExecutions.reduce((total, item) => total + item.response.items.length, 0) - uniqueLiteratureCount,
        ),
        failed_source_count: 0,
        skipped_source_count: queryExecutions.reduce(
          (total, item) => total + item.response.meta.skipped_profiles.length,
          0,
        ),
      },
      source_health_summary: {
        degraded_mode: degraded,
        warning_codes: degraded ? ['RETRIEVAL_DEGRADED'] : [],
        freshness_warnings: queryExecutions.flatMap((item) => item.response.meta.freshness_warnings),
        skipped_profiles: queryExecutions.flatMap((item) => item.response.meta.skipped_profiles),
      },
      dedup_summary: {
        duplicate_result_count: Math.max(0, hits.length - new Set(hits.map((hit) => (
          `${hit.literature_ref.ref_id}:${hit.chunk_ref.ref_id}`
        ))).size),
      },
      evidence_map_input_refs: evidenceMapInputRefs,
      raw_log_artifact: {
        schema_version: 'TopicSelectionEvidenceConvergenceRetrievalLog@v1',
        request_key: request.request_key,
        strategy_key: request.strategy_key,
        corpus_manifest_ref: request.corpus_manifest_ref,
        corpus_manifest_hash: request.corpus_manifest_hash,
        query_executions: queryExecutions.map(({ query, response }) => ({ query, response })),
      },
      coverage_observations: queryExecutions.map(({ response, coverageRow }) => ({
        coverage_row_intent_id: coverageRow.coverage_row_intent_id,
        status: degraded ? 'partial' : 'succeeded',
        result_count: response.items.length,
        source_count: new Set(response.items.map((item) => item.literature_id)).size,
        missing_reason_codes: response.items.length === 0 ? ['NO_RETRIEVAL_HITS'] : [],
        notes: 'Coordinator-owned evidence-convergence retrieval execution.',
      })),
      evidence_bindings: this.evidenceBindings(queryExecutions, request.title_card_id),
      coverage_assessments: coverage.rows.flatMap(({ coverage_row_intent: row, latest_assessment: assessment }) => {
        const childRow = child.coverage_row_intents.find((candidate) => candidate.coverage_key === row.coverage_key);
        return childRow && assessment ? [{
          coverage_row_intent_id: childRow.coverage_row_intent_id,
          verdict: assessment.verdict,
          issue_codes: assessment.issue_codes,
          confidence: assessment.confidence ?? null,
          assessed_by: assessment.assessed_by,
        }] : [];
      }),
      created_by: 'system',
      policy_version_id: request.policy_version_id ?? null,
    });
    const completed = await this.dependencies.searchResources.completeEvidenceConvergenceRecheckRequest({
      request_id: request.search_plan_recheck_request_id,
      resulting_search_plan_id: child.search_plan.search_plan_id,
      resulting_search_run_id: runResult.search_run.search_run_id,
      decision_summary: 'Coordinator persisted the replayable managed-library retrieval execution.',
    });
    return this.executionResult(
      completed,
      runResult.search_run,
      hits,
      this.retrievalCostMicrousd(queryExecutions),
      false,
    );
  }

  private async retrieve(
    query: string,
    request: TopicSelectionSearchPlanRecheckRequestRecord,
    manifest: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): Promise<LiteratureRetrieveResponse> {
    const retrievalRequest = {
      query,
      ...request.retrieval_intent!.retrieval_parameters,
    } satisfies LiteratureRetrieveRequest;
    const literatureIds = manifest.literature_refs.map((candidate) => candidate.ref_id);
    const response = manifest.retrieval_stack_identity?.corpus_scope.mode === 'human_confirmed_subset'
      ? await this.dependencies.scopedRetriever.retrieve(retrievalRequest, literatureIds)
      : await this.dependencies.retriever.retrieve(retrievalRequest);
    const allowedVersions = new Set((manifest.corpus_manifest_members ?? []).map((member) => (
      `${member.literature_ref.ref_id}:${member.embedding_version_ref.ref_id}`
    )));
    const items = response.items.filter((item) => allowedVersions.has(
      `${item.literature_id}:${item.embedding_version_id}`,
    ));
    if (items.some((item) => item.is_stale)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Evidence-convergence retrieval returned stale evidence.');
    }
    return { ...response, items };
  }

  private hits(
    executions: QueryExecution[],
    titleCardId: string,
  ): TopicSelectionEvidenceConvergenceRetrievalHit[] {
    let rank = 0;
    return executions.flatMap(({ query, response }) => response.items.flatMap((item) =>
      item.evidence_chunks.map((chunk) => ({
        query,
        literature_ref: this.ref('literature_record', item.literature_id, titleCardId),
        embedding_version_id: item.embedding_version_id,
        chunk_ref: this.chunkRef(chunk, titleCardId),
        chunk_id: chunk.chunk_id,
        chunk_hash: sha256Text(chunk.text),
        source_text: chunk.text,
        hybrid_score: chunk.hybrid_score,
        vector_score: chunk.vector_score,
        lexical_score: chunk.lexical_score,
        is_stale: item.is_stale,
        rank: ++rank,
      }))));
  }

  private evidenceMapInputRefs(
    executions: QueryExecution[],
    titleCardId: string,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs(executions.flatMap(({ response }) => response.items.flatMap((item) => [
      this.ref('literature_record', item.literature_id, titleCardId),
      ...item.evidence_chunks.flatMap((chunk) => this.chunkSourceRefs(chunk, titleCardId)),
    ])));
  }

  private evidenceBindings(executions: QueryExecution[], titleCardId: string) {
    return executions.flatMap(({ response, coverageRow }) => response.items.map((item, index) => ({
      coverage_row_intent_id: coverageRow.coverage_row_intent_id,
      literature_ref: this.ref('literature_record', item.literature_id, titleCardId),
      source_refs: this.uniqueRefs(item.evidence_chunks.flatMap((chunk) => (
        this.chunkSourceRefs(chunk, titleCardId)
      ))),
      binding_kind: 'retrieval_hit' as const,
      result_rank: index + 1,
    })));
  }

  private chunkSourceRefs(
    chunk: LiteratureRetrieveEvidenceChunk,
    titleCardId: string,
  ): TopicSelectionFunctionalRef[] {
    const refs = chunk.source_refs.flatMap((raw) => {
      const refType = typeof raw.ref_type === 'string' ? this.locatorRefType(raw.ref_type) : null;
      const refId = typeof raw.ref_id === 'string' ? raw.ref_id : null;
      return refType && refId ? [this.ref(refType, refId, titleCardId)] : [];
    });
    return this.uniqueRefs([...refs, this.chunkRef(chunk, titleCardId)]);
  }

  private unitAuthorityRefs(unit: TopicSelectionEvidenceUnitRecord): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      unit.literature_ref,
      ...unit.source_refs,
      ...this.locatorRefs(unit.locator),
    ]);
  }

  private locatorRefs(locator: TopicSelectionEvidenceSourceLocator): TopicSelectionFunctionalRef[] {
    return [
      locator.source_ref,
      locator.locator_ref,
      locator.content_ref,
      locator.document_ref,
      locator.section_ref,
      locator.paragraph_ref,
      locator.anchor_ref,
    ].filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref));
  }

  private chunkRef(
    chunk: LiteratureRetrieveEvidenceChunk,
    titleCardId: string,
  ): TopicSelectionFunctionalRef {
    const sourceRef = chunk.source_refs.find((raw) =>
      typeof raw.ref_type === 'string'
      && typeof raw.ref_id === 'string'
      && Boolean(this.locatorRefType(raw.ref_type)));
    if (sourceRef && typeof sourceRef.ref_type === 'string' && typeof sourceRef.ref_id === 'string') {
      return this.ref(this.locatorRefType(sourceRef.ref_type)!, sourceRef.ref_id, titleCardId);
    }
    const refType = this.locatorRefType(chunk.chunk_type);
    if (!refType) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        `Retrieval chunk ${chunk.chunk_id} has no supported claim locator.`,
      );
    }
    return this.ref(refType, this.metadataLocatorId(chunk), titleCardId);
  }

  private metadataLocatorId(chunk: LiteratureRetrieveEvidenceChunk): string {
    const candidates = [
      chunk.metadata.paragraph_id,
      chunk.metadata.section_id,
      chunk.metadata.anchor_id,
      chunk.metadata.abstract_id,
      chunk.chunk_id,
    ];
    return candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)
      ?? chunk.chunk_id;
  }

  private locatorRefType(value: string): string | null {
    const normalized: Record<string, string> = {
      paragraph: 'fulltext_paragraph',
      fulltext_paragraph: 'fulltext_paragraph',
      section: 'fulltext_section',
      fulltext_section: 'fulltext_section',
      anchor: 'fulltext_anchor',
      fulltext_anchor: 'fulltext_anchor',
      abstract: 'literature_abstract',
      literature_abstract: 'literature_abstract',
    };
    return normalized[value] ?? null;
  }

  private readPersistedHits(
    run: TopicSelectionSearchRunRecord,
  ): TopicSelectionEvidenceConvergenceRetrievalHit[] {
    return run.query_provenance.flatMap((entry) => {
      const hits = entry.hits;
      if (!Array.isArray(hits)) return [];
      return hits.filter((hit): hit is TopicSelectionEvidenceConvergenceRetrievalHit => {
        if (!hit || typeof hit !== 'object' || Array.isArray(hit)) return false;
        const candidate = hit as Partial<TopicSelectionEvidenceConvergenceRetrievalHit>;
        return typeof candidate.query === 'string'
          && typeof candidate.embedding_version_id === 'string'
          && typeof candidate.chunk_hash === 'string'
          && typeof candidate.rank === 'number'
          && Boolean(candidate.literature_ref)
          && Boolean(candidate.chunk_ref);
      });
    });
  }

  private executionResult(
    request: TopicSelectionSearchPlanRecheckRequestRecord,
    run: TopicSelectionSearchRunRecord,
    hits: TopicSelectionEvidenceConvergenceRetrievalHit[],
    retrievalCostMicrousd: number,
    reused: boolean,
  ): TopicSelectionEvidenceConvergenceRetrievalExecution {
    return {
      request_ref: this.ref(
        'search_plan_recheck_request',
        request.search_plan_recheck_request_id,
        request.title_card_id,
      ),
      search_plan_ref: run.search_plan_ref,
      search_run_ref: this.ref('search_run', run.search_run_id, run.title_card_id),
      retrieval_hit_count: hits.length,
      retrieval_hits: hits,
      retrieval_cost_microusd: retrievalCostMicrousd,
      reused,
    };
  }

  private retrievalCostMicrousd(executions: QueryExecution[]): number {
    return executions.reduce((total, execution) => (
      total + this.costMicrousd(execution.response.meta.query_embedding_telemetry?.cost_usd)
    ), 0);
  }

  private persistedRetrievalCostMicrousd(run: TopicSelectionSearchRunRecord): number {
    return run.query_provenance.reduce((total, entry) => {
      const retrievalMeta = entry.retrieval_meta;
      if (!retrievalMeta || typeof retrievalMeta !== 'object' || Array.isArray(retrievalMeta)) return total;
      const telemetry = (retrievalMeta as { query_embedding_telemetry?: unknown }).query_embedding_telemetry;
      if (!telemetry || typeof telemetry !== 'object' || Array.isArray(telemetry)) return total;
      return total + this.costMicrousd((telemetry as { cost_usd?: unknown }).cost_usd);
    }, 0);
  }

  private costMicrousd(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.round(value * 1_000_000)
      : 0;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...new Map(refs.map((ref) => [this.refKey(ref), ref])).values()]
      .sort((left, right) => this.refKey(left).localeCompare(this.refKey(right)));
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return { ref_type: refType, ref_id: refId, title_card_id: titleCardId, version_id: versionId };
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }
}
