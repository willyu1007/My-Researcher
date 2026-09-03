import crypto from 'node:crypto';
import type {
  TopicSelectionActorRef,
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
  TopicSelectionStateWriteIntent,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
  canonicalizeEvidenceConvergenceRequest,
  type TopicSelectionEvidenceConvergenceRetrievalRequestIntent,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionCoverageAssessmentVerdict,
  TopicSelectionCoverageBindingKind,
  TopicSelectionCoverageExecutionStatus,
  TopicSelectionCoverageIntentType,
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionCorpusManifestMember,
  TopicSelectionEvidenceRole,
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionRetrievalStackIdentity,
  TopicSelectionResourcePoolSource,
  TopicSelectionSearchPlanBlueprint,
  TopicSelectionSearchPlanCoverageMatrix,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchPlanRecheckRequestStatus,
  TopicSelectionSearchRunKind,
  TopicSelectionSearchRunRecord,
  TopicSelectionSearchRunResultAccounting,
  TopicSelectionSearchRunStatus,
  TopicSelectionSourceHealthSummary,
  TopicSelectionTopicSeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { AppError } from '../errors/app-error.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import type { TitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import type {
  TopicSelectionSearchResourceRepository,
  TopicSelectionSearchRunCoverageRecords,
  TopicSelectionSearchRunWithCoverageRecordsResult,
} from '../repositories/topic-selection-search-resource.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
  managedLibraryEligibilityResolver?: {
    resolveManagedLibraryEligibility(): Promise<{
      eligible_embedding_versions: Array<{
        embedding_version_id: string;
        literature_id: string;
        input_checksum: string | null;
        index_artifact_checksum: string | null;
      }>;
      retrieval_stack_identity: TopicSelectionRetrievalStackIdentity;
    }>;
  };
};

type CreateTopicSeedFromTitleCardInput = {
  workspace_id?: string | null;
  title_card_id: string;
  seed_version?: string;
  intent_summary?: string;
  scope_notes?: string | null;
  intent_preparation_refs?: TopicSelectionFunctionalRef[];
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

type CreateLiteratureResourcePoolSnapshotInput = {
  workspace_id?: string | null;
  title_card_id: string;
  topic_seed_id: string;
  snapshot_version?: string;
  source_scope?: TopicSelectionResourcePoolSource;
  resource_sample_set_provenance_ref?: TopicSelectionFunctionalRef | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

type CoverageIntentInput = {
  coverage_key?: string;
  intent_type?: TopicSelectionCoverageIntentType;
  query: string;
  rationale?: string;
  required?: boolean;
  priority?: number;
  target_source_types?: string[];
  expected_evidence_role?: TopicSelectionEvidenceRole;
  refs?: TopicSelectionFunctionalRef[];
};

type CreateSearchPlanInput = {
  workspace_id?: string | null;
  title_card_id: string;
  topic_seed_id: string;
  literature_resource_pool_snapshot_id: string;
  plan_version?: string;
  query_intents: string[];
  must_check_constraints?: string[];
  exclusion_rules?: string[];
  coverage_strategy?: Record<string, unknown>;
  coverage_intents?: CoverageIntentInput[];
  search_plan_blueprint?: TopicSelectionSearchPlanBlueprint | null;
  parent_search_plan_ref?: TopicSelectionFunctionalRef | null;
  recheck_request_ref?: TopicSelectionFunctionalRef | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

type CoverageExecutionObservationInput = {
  coverage_row_intent_id: string;
  status: TopicSelectionCoverageExecutionStatus;
  result_count?: number;
  source_count?: number;
  missing_reason_codes?: string[];
  notes?: string | null;
};

type CoverageEvidenceBindingInput = {
  coverage_row_intent_id: string;
  literature_ref: TopicSelectionFunctionalRef;
  source_refs?: TopicSelectionFunctionalRef[];
  binding_kind?: TopicSelectionCoverageBindingKind;
  result_rank?: number | null;
};

type CoverageAssessmentInput = {
  coverage_row_intent_id: string;
  verdict: TopicSelectionCoverageAssessmentVerdict;
  issue_codes?: string[];
  confidence?: number | null;
  assessed_by?: TopicSelectionActorType;
};

type CoverageRiskAcceptanceInput = {
  coverage_row_intent_id: string;
  accepted_risk_ref: TopicSelectionFunctionalRef;
  accepted_by: TopicSelectionActorRef;
  rationale: string;
  expires_at?: string | null;
};

type RecordSearchRunInput = {
  workspace_id?: string | null;
  title_card_id: string;
  search_plan_id: string;
  literature_resource_pool_snapshot_id?: string;
  search_plan_ref?: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref?: TopicSelectionFunctionalRef;
  expected_literature_snapshot_hash?: string;
  run_kind?: TopicSelectionSearchRunKind;
  run_status?: TopicSelectionSearchRunStatus;
  query_provenance?: Array<Record<string, unknown>>;
  result_accounting: TopicSelectionSearchRunResultAccounting;
  source_health_summary: Record<string, unknown>;
  dedup_summary?: Record<string, unknown>;
  evidence_map_input_refs: TopicSelectionFunctionalRef[];
  raw_log_artifact_ref?: TopicSelectionFunctionalRef | null;
  raw_log_artifact?: Record<string, unknown> | null;
  coverage_observations?: CoverageExecutionObservationInput[];
  evidence_bindings?: CoverageEvidenceBindingInput[];
  coverage_assessments?: CoverageAssessmentInput[];
  coverage_risk_acceptances?: CoverageRiskAcceptanceInput[];
  started_at?: string;
  finished_at?: string | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

type CreateSearchPlanRecheckRequestInput = {
  workspace_id?: string | null;
  title_card_id: string;
  source_ref: TopicSelectionFunctionalRef;
  target_search_plan_id: string;
  reason: string;
  gap_codes?: string[];
  requested_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
  evidence_convergence_intent?: TopicSelectionEvidenceConvergenceRetrievalRequestIntent;
};

type ResolveSearchPlanRecheckRequestInput = {
  request_id: string;
  outcome: Extract<TopicSelectionSearchPlanRecheckRequestStatus, 'accepted' | 'rejected' | 'accepted_risk' | 'materialized'>;
  decision_summary: string;
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  revised_search_plan?: Omit<CreateSearchPlanInput, 'title_card_id' | 'topic_seed_id' | 'literature_resource_pool_snapshot_id' | 'parent_search_plan_ref' | 'recheck_request_ref'>;
  follow_up_search_run?: Omit<RecordSearchRunInput, 'title_card_id' | 'search_plan_id' | 'literature_resource_pool_snapshot_id' | 'run_kind'>;
};

type ResolveSearchPlanRecheckRequestResult = {
  request: TopicSelectionSearchPlanRecheckRequestRecord;
  revised_search_plan?: TopicSelectionSearchPlanRecord;
  follow_up_search_run?: TopicSelectionSearchRunRecord;
};

const CONSUMABLE_SEARCH_RUN_STATUSES = new Set<TopicSelectionSearchRunStatus>(['succeeded', 'partial']);
const SEARCH_RUN_LOCATOR_PROVENANCE_REF_TYPES = new Set([
  'literature_abstract',
  'fulltext_document',
  'fulltext_section',
  'fulltext_paragraph',
  'fulltext_anchor',
  'manual_locator',
]);
const SEARCH_RUN_COVERAGE_RISK_REF_TYPES = new Set([
  'accepted_risk',
  'search_coverage_risk',
]);

export class TopicSelectionSearchResourceService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly managedLibraryEligibilityResolver: ServiceOptions['managedLibraryEligibilityResolver'];

  constructor(
    private readonly repository: TopicSelectionSearchResourceRepository,
    private readonly controlPlane: TopicSelectionControlPlaneService,
    private readonly titleCards: TitleCardManagementRepository,
    private readonly literature: LiteratureRepository,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.managedLibraryEligibilityResolver = options.managedLibraryEligibilityResolver;
  }

  async createTopicSeedFromTitleCard(
    input: CreateTopicSeedFromTitleCardInput,
  ): Promise<TopicSelectionTopicSeedRecord> {
    const titleCard = await this.titleCards.getTitleCard(input.title_card_id);
    if (!titleCard) {
      throw new AppError(404, 'NOT_FOUND', `Title card ${input.title_card_id} not found.`);
    }

    const seedVersion = input.seed_version ?? 'v1';
    if (seedVersion.trim().length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'seed_version cannot be empty.');
    }
    const intentSummary = input.intent_summary ?? titleCard.brief;
    if (intentSummary.trim().length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'TopicSeed requires a non-empty intent_summary or source TitleCard brief.',
      );
    }

    const topicSeedId = this.idFactory('topic_seed');
    const topicSeedRef = this.ref('topic_seed', topicSeedId, input.title_card_id, seedVersion);
    const titleCardRef = this.ref('title_card', titleCard.title_card_id, titleCard.title_card_id);
    const intentPreparationRefs = input.intent_preparation_refs ?? [];
    const topicSeedSourceRefs = [titleCardRef, ...intentPreparationRefs];
    const snapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: topicSeedRef,
      source_refs: topicSeedSourceRefs,
      payload: {
        title_card: {
          working_title: titleCard.working_title,
          brief: titleCard.brief,
          status: titleCard.status,
          updated_at: titleCard.updated_at,
        },
        intent_summary: intentSummary,
        scope_notes: input.scope_notes ?? null,
        seed_version: seedVersion,
        intent_preparation_refs: intentPreparationRefs,
      },
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      gate_key: 'topic-selection.topic-seed-ready',
      target_ref: topicSeedRef,
      input_snapshot_id: snapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      transition_key: 'title-card-to-topic-seed',
      source_ref: titleCardRef,
      target_ref: topicSeedRef,
      gate_result_id: gate.readiness_gate_result_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(topicSeedRef, 'execution', 'topic_seed', 'ready')],
      created_authority_refs: [topicSeedRef],
    });
    this.assertTransitionPassed(transition.result, 'TopicSeed');

    const record: TopicSelectionTopicSeedRecord = {
      topic_seed_id: topicSeedId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      seed_version: seedVersion,
      seed_kind: 'title_card',
      working_title: titleCard.working_title,
      intent_summary: intentSummary,
      scope_notes: input.scope_notes ?? null,
      source_title_card_ref: titleCardRef,
      source_refs: topicSeedSourceRefs,
      input_snapshot_id: snapshot.input_snapshot_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      trace_snapshot_id: null,
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    };
    return this.repository.createTopicSeed(record);
  }

  async createLiteratureResourcePoolSnapshot(
    input: CreateLiteratureResourcePoolSnapshotInput,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord> {
    const topicSeed = await this.requireTopicSeed(input.topic_seed_id);
    if (topicSeed.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'TopicSeed belongs to a different title card.');
    }

    const sourceScope = input.source_scope ?? 'title_card_evidence_basket';
    const basket = sourceScope === 'managed_library'
      ? null
      : await this.titleCards.getEvidenceBasket(input.title_card_id);
    if (basket && basket.items.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Literature snapshot requires at least one basket item.');
    }
    if (sourceScope === 'managed_library' && !this.managedLibraryEligibilityResolver) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Managed-library snapshot requires the canonical retrieval eligibility resolver.',
      );
    }
    const managedEligibility = sourceScope === 'managed_library'
      ? await this.managedLibraryEligibilityResolver!.resolveManagedLibraryEligibility()
      : null;
    const corpusManifestMembers: TopicSelectionCorpusManifestMember[] = managedEligibility
      ? managedEligibility.eligible_embedding_versions
        .map((version) => ({
          literature_ref: this.ref('literature_record', version.literature_id, input.title_card_id),
          embedding_version_ref: this.ref('literature_embedding_version', version.embedding_version_id, input.title_card_id),
          input_checksum: version.input_checksum,
          index_artifact_checksum: version.index_artifact_checksum,
        }))
        .sort((left, right) => {
          const literatureOrder = left.literature_ref.ref_id.localeCompare(right.literature_ref.ref_id);
          return literatureOrder !== 0
            ? literatureOrder
            : left.embedding_version_ref.ref_id.localeCompare(right.embedding_version_ref.ref_id);
        })
      : [];
    const literatureIds = managedEligibility
      ? [...new Set(corpusManifestMembers.map((member) => member.literature_ref.ref_id))]
      : basket!.items.map((item) => item.literature_id);
    if (literatureIds.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Literature snapshot requires at least one eligible resource.');
    }
    const literatures = await this.literature.listLiteraturesByIds(literatureIds);
    const literatureById = new Map(literatures.map((item) => [item.id, item]));
    const pipelineStates = await this.literature.listPipelineStatesByLiteratureIds(literatureIds);
    const pipelineByLiteratureId = new Map(pipelineStates.map((item) => [item.literatureId, item]));
    const contentSourceRefs: TopicSelectionFunctionalRef[] = [];
    let sourceCount = 0;
    for (const literatureId of literatureIds) {
      const sources = await this.literature.listSourcesByLiteratureId(literatureId);
      sourceCount += sources.length;
      contentSourceRefs.push(...sources.map((source) => this.ref('literature_source', source.id, input.title_card_id)));
    }

    const missingLiteratureIds = literatureIds.filter((literatureId) => !literatureById.has(literatureId));
    const topicSeedRef = this.ref('topic_seed', topicSeed.topic_seed_id, input.title_card_id, topicSeed.seed_version);
    const sourceHealthSummary = this.buildLiteratureSourceHealthSummary(
      literatureIds,
      literatureById,
      pipelineByLiteratureId,
      sourceCount,
      missingLiteratureIds,
    );
    const literatureRefs = literatureIds
      .filter((literatureId) => literatureById.has(literatureId))
      .map((literatureId) => this.ref('literature_record', literatureId, input.title_card_id));
    const managedManifestHashPayload = managedEligibility
      ? {
        corpus_manifest_members: corpusManifestMembers,
        retrieval_stack_identity: managedEligibility.retrieval_stack_identity,
      }
      : {};
    const snapshotHashPayload = {
      title_card_id: input.title_card_id,
      topic_seed_ref: topicSeedRef,
      source_scope: sourceScope,
      basket_updated_at: basket?.updated_at ?? null,
      literature_refs: literatureRefs,
      content_source_refs: contentSourceRefs,
      source_health_summary: sourceHealthSummary,
      policy_version_id: input.policy_version_id ?? null,
      ...managedManifestHashPayload,
    };
    const inputSnapshotPayload = {
      ...snapshotHashPayload,
      resource_sample_set_provenance_ref: input.resource_sample_set_provenance_ref ?? null,
    };
    const snapshotHash = sha256Text(stableStringify(snapshotHashPayload));
    const snapshotId = this.idFactory('literature_snapshot');
    const snapshotVersion = input.snapshot_version ?? this.versionFromId(snapshotId);
    const snapshotRef = this.ref(
      'literature_resource_pool_snapshot',
      snapshotId,
      input.title_card_id,
      snapshotVersion,
    );
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: snapshotRef,
      source_refs: [
        topicSeedRef,
        ...(input.resource_sample_set_provenance_ref ? [input.resource_sample_set_provenance_ref] : []),
        ...literatureRefs,
        ...contentSourceRefs,
      ],
      payload: inputSnapshotPayload,
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const blockers = missingLiteratureIds.length > 0
      ? [this.blocker('MISSING_LITERATURE_RECORD', 'Snapshot contains basket ids that cannot be resolved.')]
      : [];
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      gate_key: 'topic-selection.literature-snapshot-ready',
      target_ref: snapshotRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      blockers,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      transition_key: 'topic-seed-to-literature-snapshot',
      source_ref: topicSeedRef,
      target_ref: snapshotRef,
      gate_result_id: gate.readiness_gate_result_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(snapshotRef, 'freshness', 'literature_snapshot', 'current')],
      created_authority_refs: [snapshotRef],
    });
    this.assertTransitionPassed(transition.result, 'LiteratureResourcePoolSnapshot', blockers, {
      gate_result_id: gate.readiness_gate_result_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      source_health_summary: sourceHealthSummary,
      title_card_id: input.title_card_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
    });

    return this.repository.createLiteratureResourcePoolSnapshot({
      literature_resource_pool_snapshot_id: snapshotId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      snapshot_version: snapshotVersion,
      source_scope: sourceScope,
      topic_seed_ref: topicSeedRef,
      literature_refs: literatureRefs,
      content_source_refs: contentSourceRefs,
      source_health_summary: sourceHealthSummary,
      corpus_manifest_members: corpusManifestMembers,
      retrieval_stack_identity: managedEligibility?.retrieval_stack_identity ?? null,
      snapshot_hash: snapshotHash,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    });
  }

  async getTopicSeedById(topicSeedId: string): Promise<TopicSelectionTopicSeedRecord | null> {
    return this.repository.findTopicSeedById(topicSeedId);
  }

  async getLiteratureResourcePoolSnapshotById(
    snapshotId: string,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord | null> {
    return this.repository.findLiteratureResourcePoolSnapshotById(snapshotId);
  }

  async getSearchPlanById(searchPlanId: string): Promise<TopicSelectionSearchPlanRecord | null> {
    return this.repository.findSearchPlanById(searchPlanId);
  }

  async createSearchPlan(input: CreateSearchPlanInput): Promise<{
    search_plan: TopicSelectionSearchPlanRecord;
    coverage_row_intents: TopicSelectionCoverageRowIntentRecord[];
  }> {
    const topicSeed = await this.requireTopicSeed(input.topic_seed_id);
    const literatureSnapshot = await this.requireLiteratureSnapshot(input.literature_resource_pool_snapshot_id);
    this.assertSameTitleCard(input.title_card_id, topicSeed.title_card_id, 'TopicSeed');
    this.assertSameTitleCard(input.title_card_id, literatureSnapshot.title_card_id, 'LiteratureResourcePoolSnapshot');
    if (literatureSnapshot.topic_seed_ref.ref_id !== topicSeed.topic_seed_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'SearchPlan snapshot does not trace to the requested TopicSeed.');
    }

    const searchPlanId = this.idFactory('search_plan');
    const planVersion = input.plan_version ?? this.versionFromId(searchPlanId);
    const searchPlanRef = this.ref('search_plan', searchPlanId, input.title_card_id, planVersion);
    const topicSeedRef = this.ref('topic_seed', topicSeed.topic_seed_id, input.title_card_id, topicSeed.seed_version);
    const literatureSnapshotRef = this.ref(
      'literature_resource_pool_snapshot',
      literatureSnapshot.literature_resource_pool_snapshot_id,
      input.title_card_id,
      literatureSnapshot.snapshot_version,
    );
    const coverageInputs = this.normalizeCoverageIntents(input.query_intents, input.coverage_intents);
    const coverageStrategy = this.searchPlanCoverageStrategy(input.coverage_strategy ?? {}, input.search_plan_blueprint ?? null);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: searchPlanRef,
      source_refs: [topicSeedRef, literatureSnapshotRef],
      payload: {
        search_plan_blueprint: input.search_plan_blueprint ?? null,
        query_intents: input.query_intents,
        must_check_constraints: input.must_check_constraints ?? [],
        exclusion_rules: input.exclusion_rules ?? [],
        coverage_strategy: coverageStrategy,
        coverage_intents: coverageInputs,
      },
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_key: 'topic-selection.search-plan-draft',
      workflow_profile_key: 'deterministic-contract',
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      output_summary: { coverage_row_count: coverageInputs.length },
      artifacts: [
        {
          artifact_kind: 'structured_output',
          payload: {
            query_intents: input.query_intents,
            coverage_intents: coverageInputs,
          },
        },
      ],
      created_by: input.created_by ?? 'system',
    });
    const blockers = this.searchPlanBlockers(input.query_intents, coverageInputs);
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      gate_key: 'topic-selection.search-plan-ready',
      target_ref: searchPlanRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policy_version_id ?? null,
      blockers,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      transition_key: 'literature-snapshot-to-search-plan',
      source_ref: literatureSnapshotRef,
      target_ref: searchPlanRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(searchPlanRef, 'execution', 'search_plan', 'ready')],
      created_authority_refs: [searchPlanRef],
    });
    this.assertTransitionPassed(transition.result, 'SearchPlan');

    const artifactRefs = workflow.artifact_refs.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id));
    const createdAt = this.now();
    const searchPlan: TopicSelectionSearchPlanRecord = {
      search_plan_id: searchPlanId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      plan_version: planVersion,
      status: 'ready',
      topic_seed_ref: topicSeedRef,
      literature_snapshot_ref: literatureSnapshotRef,
      parent_search_plan_ref: input.parent_search_plan_ref ?? null,
      recheck_request_ref: input.recheck_request_ref ?? null,
      query_intents: input.query_intents,
      must_check_constraints: input.must_check_constraints ?? [],
      exclusion_rules: input.exclusion_rules ?? [],
      coverage_strategy: coverageStrategy,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      artifact_refs: artifactRefs,
      created_by: input.created_by ?? 'system',
      created_at: createdAt,
    };
    const coverageRowIntents = coverageInputs.map<TopicSelectionCoverageRowIntentRecord>((coverageInput, index) => ({
      coverage_row_intent_id: this.idFactory('coverage_intent'),
      search_plan_id: searchPlanId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      coverage_key: coverageInput.coverage_key ?? `query-${index + 1}`,
      intent_type: coverageInput.intent_type ?? 'support',
      query: coverageInput.query,
      rationale: coverageInput.rationale ?? 'Derived from SearchPlan query intent.',
      required: coverageInput.required ?? true,
      priority: coverageInput.priority ?? index,
      target_source_types: coverageInput.target_source_types ?? [],
      expected_evidence_role: coverageInput.expected_evidence_role ?? 'support',
      refs: coverageInput.refs ?? [],
      created_at: createdAt,
    }));
    return this.repository.createSearchPlanWithCoverageIntents(searchPlan, coverageRowIntents);
  }

  async recordSearchRun(input: RecordSearchRunInput): Promise<TopicSelectionSearchRunWithCoverageRecordsResult> {
    const searchPlan = await this.requireSearchPlan(input.search_plan_id);
    this.assertSameTitleCard(input.title_card_id, searchPlan.title_card_id, 'SearchPlan');
    const snapshotId = input.literature_resource_pool_snapshot_id ?? searchPlan.literature_snapshot_ref.ref_id;
    const literatureSnapshot = await this.requireLiteratureSnapshot(snapshotId);
    this.assertSameTitleCard(input.title_card_id, literatureSnapshot.title_card_id, 'LiteratureResourcePoolSnapshot');
    if (searchPlan.literature_snapshot_ref.ref_id !== literatureSnapshot.literature_resource_pool_snapshot_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'SearchRun snapshot does not match SearchPlan snapshot.');
    }
    this.assertRecordSearchRunRefGuards(input, searchPlan, literatureSnapshot);
    const coverageRowIntents = await this.repository.listCoverageRowIntentsBySearchPlanId(searchPlan.search_plan_id);
    this.assertCoverageRecordsBelongToSearchPlan(input, coverageRowIntents);

    const searchRunId = this.idFactory('search_run');
    const searchRunRef = this.ref('search_run', searchRunId, input.title_card_id);
    const searchPlanRef = this.ref('search_plan', searchPlan.search_plan_id, input.title_card_id, searchPlan.plan_version);
    const literatureSnapshotRef = this.ref(
      'literature_resource_pool_snapshot',
      literatureSnapshot.literature_resource_pool_snapshot_id,
      input.title_card_id,
      literatureSnapshot.snapshot_version,
    );
    const blockers = this.searchRunBlockers(input, literatureSnapshot);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: searchRunRef,
      source_refs: [
        searchPlanRef,
        literatureSnapshotRef,
        ...input.evidence_map_input_refs,
        ...(input.raw_log_artifact_ref ? [input.raw_log_artifact_ref] : []),
      ],
      payload: {
        run_kind: input.run_kind ?? 'planned_search',
        run_status: input.run_status ?? 'succeeded',
        query_provenance: input.query_provenance ?? [],
        result_accounting: input.result_accounting,
        source_health_summary: input.source_health_summary,
        dedup_summary: input.dedup_summary ?? {},
        evidence_map_input_refs: input.evidence_map_input_refs,
      },
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_key: 'topic-selection.search-run',
      workflow_profile_key: 'retrieval-provenance',
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      status: blockers.length > 0 ? 'blocked' : 'succeeded',
      output_summary: {
        run_status: input.run_status ?? 'succeeded',
        total_result_count: input.result_accounting.total_result_count,
        unique_literature_count: input.result_accounting.unique_literature_count,
      },
      artifacts: input.raw_log_artifact
        ? [{ artifact_kind: 'raw_output', payload: input.raw_log_artifact }]
        : [],
      created_by: input.created_by ?? 'system',
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      gate_key: 'topic-selection.search-run-consumable',
      target_ref: searchRunRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policy_version_id ?? null,
      blockers,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      transition_key: 'search-plan-to-search-run',
      source_ref: searchPlanRef,
      target_ref: searchRunRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(
        searchRunRef,
        'execution',
        'search_run',
        this.isConsumableSearchRunStatus(input.run_status ?? 'succeeded') ? 'consumable' : 'audit_only',
      )],
      created_authority_refs: [searchRunRef],
    });
    this.assertTransitionPassed(transition.result, 'SearchRun', blockers);

    const artifactRefs = [
      ...workflow.artifact_refs.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id)),
      ...(input.raw_log_artifact_ref ? [input.raw_log_artifact_ref] : []),
    ];
    const createdAt = this.now();
    const searchRun: TopicSelectionSearchRunRecord = {
      search_run_id: searchRunId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      run_kind: input.run_kind ?? 'planned_search',
      run_status: input.run_status ?? 'succeeded',
      query_provenance: input.query_provenance ?? [],
      result_accounting: input.result_accounting,
      source_health_summary: input.source_health_summary,
      dedup_summary: input.dedup_summary ?? {},
      evidence_map_input_refs: input.evidence_map_input_refs,
      artifact_refs: artifactRefs,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      started_at: input.started_at ?? createdAt,
      finished_at: input.finished_at ?? createdAt,
      created_by: input.created_by ?? 'system',
      created_at: createdAt,
    };
    const coverageRecords = this.buildSearchRunCoverageRecords(searchPlan.search_plan_id, searchRunId, input, createdAt);
    return this.repository.createSearchRunWithCoverageRecords(searchRun, coverageRecords);
  }

  async getCoverageMatrix(searchPlanId: string): Promise<TopicSelectionSearchPlanCoverageMatrix> {
    const searchPlan = await this.requireSearchPlan(searchPlanId);
    const intents = await this.repository.listCoverageRowIntentsBySearchPlanId(searchPlanId);
    const observations = await this.repository.listCoverageExecutionObservationsBySearchPlanId(searchPlanId);
    const bindings = await this.repository.listCoverageEvidenceBindingsBySearchPlanId(searchPlanId);
    const assessments = await this.repository.listCoverageAssessmentsBySearchPlanId(searchPlanId);
    const riskAcceptances = await this.repository.listCoverageRiskAcceptancesBySearchPlanId(searchPlanId);
    const rows = intents.map((intent) => {
      const latestObservation = observations.find((item) => item.coverage_row_intent_id === intent.coverage_row_intent_id) ?? null;
      const latestAssessment = assessments.find((item) => item.coverage_row_intent_id === intent.coverage_row_intent_id) ?? null;
      return {
        coverage_row_intent: intent,
        latest_observation: latestObservation,
        latest_assessment: latestAssessment,
        evidence_bindings: bindings.filter((item) => item.coverage_row_intent_id === intent.coverage_row_intent_id),
        risk_acceptances: riskAcceptances.filter((item) => item.coverage_row_intent_id === intent.coverage_row_intent_id),
      };
    });
    return {
      search_plan_ref: this.ref('search_plan', searchPlan.search_plan_id, searchPlan.title_card_id, searchPlan.plan_version),
      generated_at: this.now(),
      rows,
      summary: {
        row_count: rows.length,
        satisfied_count: rows.filter((row) => row.latest_assessment?.verdict === 'satisfied').length,
        partial_count: rows.filter((row) => row.latest_assessment?.verdict === 'partial').length,
        missing_count: rows.filter((row) => row.latest_assessment?.verdict === 'missing').length,
        accepted_risk_count: rows.filter((row) => row.latest_assessment?.verdict === 'accepted_risk').length,
        unassessed_count: rows.filter((row) => !row.latest_assessment).length,
      },
    };
  }

  async createSearchPlanRecheckRequest(
    input: CreateSearchPlanRecheckRequestInput,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
    const searchPlan = await this.requireSearchPlan(input.target_search_plan_id);
    this.assertSameTitleCard(input.title_card_id, searchPlan.title_card_id, 'SearchPlan');
    const convergenceIntent = input.evidence_convergence_intent;
    if (convergenceIntent && (
      convergenceIntent.issue_ref.ref_type !== input.source_ref.ref_type
      || convergenceIntent.issue_ref.ref_id !== input.source_ref.ref_id
    )) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence issue must match the recheck source ref.');
    }
    const convergenceManifest = convergenceIntent
      ? await this.requireLiteratureSnapshot(convergenceIntent.corpus_manifest_ref.ref_id)
      : null;
    if (convergenceIntent && (
      convergenceManifest?.title_card_id !== input.title_card_id
      || convergenceManifest.source_scope !== 'managed_library'
      || convergenceManifest.snapshot_hash !== convergenceIntent.corpus_manifest_hash
    )) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Evidence-convergence request requires the exact managed-library corpus manifest.',
      );
    }
    const canonical = input.evidence_convergence_intent
      ? canonicalizeEvidenceConvergenceRequest(input.evidence_convergence_intent)
      : null;
    if (canonical && (
      !canonical.strategy_identity_payload.search_intent
      || canonical.strategy_identity_payload.candidate_queries.length === 0
      || !canonical.request_identity_payload.expected_decision_effect
    )) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Evidence-convergence intent requires a search intent, candidate query, and expected decision effect.',
      );
    }
    const strategyKey = canonical
      ? sha256Text(stableStringify(canonical.strategy_identity_payload))
      : null;
    const requestKey = canonical
      ? sha256Text(stableStringify({
        ...canonical.request_identity_payload,
        strategy_key: strategyKey,
      }))
      : null;
    if (requestKey) {
      const replay = await this.repository.findSearchPlanRecheckRequestByRequestKey(requestKey);
      if (replay) {
        return replay;
      }
    }
    return this.repository.createSearchPlanRecheckRequest({
      search_plan_recheck_request_id: this.idFactory('search_recheck'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      source_ref: input.source_ref,
      target_search_plan_ref: this.ref('search_plan', searchPlan.search_plan_id, input.title_card_id, searchPlan.plan_version),
      target_literature_snapshot_ref: convergenceManifest
        ? this.ref(
          'literature_resource_pool_snapshot',
          convergenceManifest.literature_resource_pool_snapshot_id,
          convergenceManifest.title_card_id,
          convergenceManifest.snapshot_version,
        )
        : searchPlan.literature_snapshot_ref,
      request_key: requestKey,
      strategy_key: strategyKey,
      issue_ref: input.evidence_convergence_intent?.issue_ref ?? null,
      originating_arena_session_ref: input.evidence_convergence_intent?.originating_arena_session_ref ?? null,
      retrieval_intent: canonical?.strategy_identity_payload ?? null,
      expected_decision_effect: canonical?.request_identity_payload.expected_decision_effect ?? null,
      execution_policy: canonical ? TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY : null,
      corpus_manifest_ref: convergenceManifest
        ? this.ref(
          'literature_resource_pool_snapshot',
          convergenceManifest.literature_resource_pool_snapshot_id,
          convergenceManifest.title_card_id,
          convergenceManifest.snapshot_version,
        )
        : null,
      corpus_manifest_hash: convergenceManifest?.snapshot_hash ?? null,
      supporting_artifact_refs: [],
      reason: input.reason,
      gap_codes: input.gap_codes ?? [],
      requested_by: input.requested_by ?? 'system',
      status: 'open',
      decision_summary: null,
      policy_version_id: input.policy_version_id ?? null,
      accepted_risk_refs: [],
      resulting_search_plan_ref: null,
      resulting_search_run_ref: null,
      created_at: this.now(),
      resolved_at: null,
    });
  }

  async resolveSearchPlanRecheckRequest(
    input: ResolveSearchPlanRecheckRequestInput,
  ): Promise<ResolveSearchPlanRecheckRequestResult> {
    const request = await this.requireRecheckRequest(input.request_id);
    if (request.status !== 'open') {
      throw new AppError(409, 'VERSION_CONFLICT', 'SearchPlanRecheckRequest has already been resolved.');
    }
    if (input.outcome === 'accepted_risk' && (input.accepted_risk_refs ?? []).length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Accepted-risk recheck outcome requires risk refs.');
    }

    if (input.outcome !== 'materialized') {
      return {
        request: await this.repository.updateSearchPlanRecheckRequest(input.request_id, {
          status: input.outcome,
          decision_summary: input.decision_summary,
          accepted_risk_refs: input.accepted_risk_refs ?? [],
          resolved_at: this.now(),
        }),
      };
    }

    if (!input.revised_search_plan) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Materialized recheck requires a revised SearchPlan.');
    }
    const targetPlan = await this.requireSearchPlan(request.target_search_plan_ref.ref_id);
    const targetLiteratureSnapshotId = request.target_literature_snapshot_ref?.ref_id
      ?? targetPlan.literature_snapshot_ref.ref_id;
    const revised = await this.createSearchPlan({
      ...input.revised_search_plan,
      workspace_id: input.revised_search_plan.workspace_id ?? request.workspace_id ?? null,
      title_card_id: request.title_card_id,
      topic_seed_id: targetPlan.topic_seed_ref.ref_id,
      literature_resource_pool_snapshot_id: targetLiteratureSnapshotId,
      parent_search_plan_ref: request.target_search_plan_ref,
      recheck_request_ref: this.ref('search_plan_recheck_request', request.search_plan_recheck_request_id, request.title_card_id),
    });
    const followUpRun = input.follow_up_search_run
      ? await this.recordSearchRun({
          ...input.follow_up_search_run,
          workspace_id: input.follow_up_search_run.workspace_id ?? request.workspace_id ?? null,
          title_card_id: request.title_card_id,
          search_plan_id: revised.search_plan.search_plan_id,
          literature_resource_pool_snapshot_id: targetLiteratureSnapshotId,
          run_kind: 'recheck_followup',
        })
      : null;

    const resolvedRequest = await this.repository.updateSearchPlanRecheckRequest(input.request_id, {
      status: 'materialized',
      decision_summary: input.decision_summary,
      accepted_risk_refs: input.accepted_risk_refs ?? [],
      resulting_search_plan_ref: this.ref(
        'search_plan',
        revised.search_plan.search_plan_id,
        revised.search_plan.title_card_id,
        revised.search_plan.plan_version,
      ),
      resulting_search_run_ref: followUpRun
        ? this.ref('search_run', followUpRun.search_run.search_run_id, followUpRun.search_run.title_card_id)
        : null,
      resolved_at: this.now(),
    });

    return {
      request: resolvedRequest,
      revised_search_plan: revised.search_plan,
      follow_up_search_run: followUpRun?.search_run,
    };
  }

  private normalizeCoverageIntents(
    queryIntents: string[],
    coverageIntents: CoverageIntentInput[] | undefined,
  ): CoverageIntentInput[] {
    if (coverageIntents && coverageIntents.length > 0) {
      return coverageIntents;
    }
    return queryIntents.map((query, index) => ({
      coverage_key: `query-${index + 1}`,
      intent_type: 'support',
      query,
      rationale: 'Derived from query intent.',
      required: true,
      priority: index,
      expected_evidence_role: 'support',
    }));
  }

  private searchPlanCoverageStrategy(
    coverageStrategy: Record<string, unknown>,
    blueprint: TopicSelectionSearchPlanBlueprint | null,
  ): Record<string, unknown> {
    const normalized = { ...coverageStrategy };
    const methodFamilyTargets = this.normalizedStringArray(blueprint?.method_family_targets ?? normalized.method_family_targets);
    if (methodFamilyTargets.length > 0) {
      normalized.method_family_targets = methodFamilyTargets;
    }
    return normalized;
  }

  private normalizedStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return [...new Set(value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim()))]
      .sort((left, right) => left.localeCompare(right));
  }

  private searchPlanBlockers(
    queryIntents: string[],
    coverageInputs: CoverageIntentInput[],
  ): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    if (queryIntents.length === 0 || queryIntents.every((query) => query.trim().length === 0)) {
      blockers.push(this.blocker('SEARCH_PLAN_QUERY_INTENT_REQUIRED', 'SearchPlan requires at least one query intent.'));
    }
    if (coverageInputs.length === 0 || coverageInputs.some((intent) => intent.query.trim().length === 0)) {
      blockers.push(this.blocker('COVERAGE_ROW_QUERY_REQUIRED', 'Coverage row intents require non-empty queries.'));
    }
    return blockers;
  }

  private searchRunBlockers(
    input: RecordSearchRunInput,
    literatureSnapshot: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    if (!this.hasCompleteResultAccounting(input.result_accounting)) {
      blockers.push(this.blocker('SEARCH_RUN_RESULT_ACCOUNTING_REQUIRED', 'SearchRun requires complete result accounting.'));
    }
    blockers.push(...this.searchRunAccountingBlockers(input));
    if (!input.source_health_summary || Object.keys(input.source_health_summary).length === 0) {
      blockers.push(this.blocker('SEARCH_RUN_SOURCE_HEALTH_REQUIRED', 'SearchRun requires source-health summary.'));
    }
    const status = input.run_status ?? 'succeeded';
    if (this.isConsumableSearchRunStatus(status) && input.evidence_map_input_refs.length === 0) {
      blockers.push(this.blocker('SEARCH_RUN_STABLE_INPUT_REFS_REQUIRED', 'Consumable SearchRun requires stable EvidenceMap input refs.'));
    }
    blockers.push(...this.searchRunAuthorityRefBlockers(input, literatureSnapshot));
    blockers.push(...this.searchRunStatusSemanticsBlockers(input));
    return blockers;
  }

  private searchRunAccountingBlockers(input: RecordSearchRunInput): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    const accounting = input.result_accounting;
    if (!accounting) {
      return blockers;
    }
    const counts = [
      accounting.total_result_count,
      accounting.unique_literature_count,
      accounting.duplicate_result_count,
      accounting.failed_source_count,
      accounting.skipped_source_count,
    ];
    if (counts.some((count) => !Number.isFinite(count) || count < 0)) {
      blockers.push(this.blocker('SEARCH_RUN_RESULT_ACCOUNTING_INVALID', 'SearchRun result counts must be finite and non-negative.'));
      return blockers;
    }
    if (accounting.total_result_count < accounting.unique_literature_count
      || accounting.total_result_count < accounting.unique_literature_count + accounting.duplicate_result_count) {
      blockers.push(this.blocker('SEARCH_RUN_RESULT_ACCOUNTING_INCONSISTENT', 'SearchRun result accounting must reconcile total, unique, and duplicate counts.'));
    }
    const distinctBindingLiteratureCount = new Set(
      (input.evidence_bindings ?? []).map((binding) => binding.literature_ref.ref_id),
    ).size;
    if (distinctBindingLiteratureCount > accounting.unique_literature_count) {
      blockers.push(this.blocker('SEARCH_RUN_BINDING_COUNT_EXCEEDS_UNIQUE_RESULTS', 'Evidence bindings exceed unique literature count.'));
    }
    return blockers;
  }

  private searchRunStatusSemanticsBlockers(input: RecordSearchRunInput): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    const status = input.run_status ?? 'succeeded';
    const accounting = input.result_accounting;
    if (status === 'succeeded') {
      if (accounting.failed_source_count > 0) {
        blockers.push(this.blocker('SEARCH_RUN_SUCCEEDED_WITH_FAILED_SOURCES', 'Succeeded SearchRun cannot include failed sources.'));
      }
      if (accounting.total_result_count > 0
        && (input.coverage_observations ?? []).length === 0
        && (input.evidence_bindings ?? []).length === 0) {
        blockers.push(this.blocker('SEARCH_RUN_SUCCEEDED_WITHOUT_COVERAGE_EVIDENCE', 'Non-empty succeeded SearchRun requires coverage observations or evidence bindings.'));
      }
    }
    if (status === 'partial'
      && (accounting.failed_source_count > 0 || accounting.skipped_source_count > 0)
      && !this.sourceHealthHasDegradedCondition(input.source_health_summary)) {
      blockers.push(this.blocker('SEARCH_RUN_PARTIAL_SOURCE_HEALTH_REQUIRED', 'Partial SearchRun requires source-health warning or error evidence.'));
    }
    if (status === 'failed' && !this.sourceHealthHasFailureSummary(input.source_health_summary)) {
      blockers.push(this.blocker('SEARCH_RUN_FAILED_SOURCE_HEALTH_REQUIRED', 'Failed SearchRun requires source-health failure summary.'));
    }
    return blockers;
  }

  private searchRunAuthorityRefBlockers(
    input: RecordSearchRunInput,
    literatureSnapshot: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    const literatureRefIds = new Set(literatureSnapshot.literature_refs.map((ref) => ref.ref_id));
    const sourceRefIds = new Set(literatureSnapshot.content_source_refs.map((ref) => ref.ref_id));
    const authorityRefs = [
      ...input.evidence_map_input_refs,
      ...(input.evidence_bindings ?? []).flatMap((binding) => [binding.literature_ref, ...(binding.source_refs ?? [])]),
    ];
    if (authorityRefs.some((ref) => this.isRawArtifactAuthorityRef(ref))) {
      blockers.push(this.blocker('RAW_SEARCH_LOG_NOT_AUTHORITY', 'Raw search logs cannot be EvidenceMap authority refs.'));
    }
    if (input.raw_log_artifact_ref && !this.isRawArtifactAuthorityRef(input.raw_log_artifact_ref)) {
      blockers.push(this.blocker('RAW_LOG_ARTIFACT_REF_INVALID', 'SearchRun raw_log_artifact_ref must be an audit-only artifact ref.'));
    }
    for (const ref of input.evidence_map_input_refs) {
      if (ref.ref_type === 'literature_record' && !literatureRefIds.has(ref.ref_id)) {
        blockers.push(this.blocker('SNAPSHOT_OUTSIDE_LITERATURE_REF', `Literature ref ${ref.ref_id} is outside the resolved snapshot.`));
      } else if (ref.ref_type === 'literature_source' && !sourceRefIds.has(ref.ref_id)) {
        blockers.push(this.blocker('SNAPSHOT_OUTSIDE_SOURCE_REF', `Source ref ${ref.ref_id} is outside the resolved snapshot.`));
      } else if (ref.ref_type !== 'literature_record'
        && ref.ref_type !== 'literature_source'
        && !this.isSearchRunLocatorProvenanceRef(ref)) {
        blockers.push(this.blocker('SEARCH_RUN_UNSUPPORTED_EVIDENCE_MAP_INPUT_REF', `Unsupported EvidenceMap input ref type: ${ref.ref_type}.`));
      }
    }
    for (const binding of input.evidence_bindings ?? []) {
      if (binding.literature_ref.ref_type !== 'literature_record' || !literatureRefIds.has(binding.literature_ref.ref_id)) {
        blockers.push(this.blocker('SNAPSHOT_OUTSIDE_LITERATURE_REF', `Evidence binding literature ref ${binding.literature_ref.ref_id} is outside the resolved snapshot.`));
      }
      for (const sourceRef of binding.source_refs ?? []) {
        if (sourceRef.ref_type === 'literature_source' && !sourceRefIds.has(sourceRef.ref_id)) {
          blockers.push(this.blocker('SNAPSHOT_OUTSIDE_SOURCE_REF', `Evidence binding source ref ${sourceRef.ref_id} is outside the resolved snapshot.`));
        } else if (sourceRef.ref_type !== 'literature_source' && !this.isSearchRunLocatorProvenanceRef(sourceRef)) {
          blockers.push(this.blocker('SEARCH_RUN_UNSUPPORTED_EVIDENCE_BINDING_SOURCE_REF', `Unsupported evidence binding source ref type: ${sourceRef.ref_type}.`));
        }
      }
    }
    for (const riskAcceptance of input.coverage_risk_acceptances ?? []) {
      if (!this.isSearchCoverageRiskRef(riskAcceptance.accepted_risk_ref)) {
        blockers.push(this.blocker('SEARCH_COVERAGE_RISK_REF_REQUIRED', 'Coverage risk acceptances must cite search-coverage risk refs only.'));
      }
    }
    return blockers;
  }

  private assertRecordSearchRunRefGuards(
    input: RecordSearchRunInput,
    searchPlan: TopicSelectionSearchPlanRecord,
    literatureSnapshot: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): void {
    if (input.search_plan_ref) {
      this.assertConcreteRefMatches(input.search_plan_ref, {
        refType: 'search_plan',
        refId: searchPlan.search_plan_id,
        titleCardId: input.title_card_id,
        versionId: searchPlan.plan_version,
        label: 'SearchRun search_plan_ref',
      });
    }
    if (input.literature_resource_pool_snapshot_ref) {
      this.assertConcreteRefMatches(input.literature_resource_pool_snapshot_ref, {
        refType: 'literature_resource_pool_snapshot',
        refId: literatureSnapshot.literature_resource_pool_snapshot_id,
        titleCardId: input.title_card_id,
        versionId: literatureSnapshot.snapshot_version,
        label: 'SearchRun literature_resource_pool_snapshot_ref',
      });
    }
    if (input.expected_literature_snapshot_hash !== undefined
      && input.expected_literature_snapshot_hash !== literatureSnapshot.snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'SearchRun expected literature snapshot hash does not match resolved snapshot.');
    }
  }

  private assertConcreteRefMatches(
    ref: TopicSelectionFunctionalRef,
    expected: {
      refType: string;
      refId: string;
      titleCardId: string;
      versionId: string;
      label: string;
    },
  ): void {
    if (ref.ref_type !== expected.refType
      || ref.ref_id !== expected.refId
      || ref.title_card_id !== expected.titleCardId
      || ref.version_id !== expected.versionId) {
      throw new AppError(409, 'VERSION_CONFLICT', `${expected.label} does not match the resolved authority.`);
    }
  }

  private isConsumableSearchRunStatus(status: TopicSelectionSearchRunStatus): boolean {
    return CONSUMABLE_SEARCH_RUN_STATUSES.has(status);
  }

  private isRawArtifactAuthorityRef(ref: TopicSelectionFunctionalRef): boolean {
    return ref.ref_type === 'artifact_ref' || ref.ref_type === 'raw_search_log';
  }

  private isSearchRunLocatorProvenanceRef(ref: TopicSelectionFunctionalRef): boolean {
    return SEARCH_RUN_LOCATOR_PROVENANCE_REF_TYPES.has(ref.ref_type);
  }

  private isSearchCoverageRiskRef(ref: TopicSelectionFunctionalRef): boolean {
    return SEARCH_RUN_COVERAGE_RISK_REF_TYPES.has(ref.ref_type);
  }

  private sourceHealthHasDegradedCondition(sourceHealth: Record<string, unknown>): boolean {
    return this.sourceHealthHasAnySignal(sourceHealth, [
      'warning',
      'warn',
      'error',
      'failed',
      'failure',
      'degraded',
      'partial',
      'skipped',
    ]);
  }

  private sourceHealthHasFailureSummary(sourceHealth: Record<string, unknown>): boolean {
    return this.sourceHealthHasAnySignal(sourceHealth, ['error', 'failed', 'failure']);
  }

  private sourceHealthHasAnySignal(sourceHealth: Record<string, unknown> | null | undefined, tokens: string[]): boolean {
    if (!sourceHealth || Object.keys(sourceHealth).length === 0) {
      return false;
    }
    const stack: Array<{ key: string; value: unknown }> = Object.entries(sourceHealth)
      .map(([key, value]) => ({ key, value }));
    while (stack.length > 0) {
      const { key, value } = stack.pop()!;
      const normalizedKey = key.toLowerCase();
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (tokens.some((token) => normalized.includes(token) || normalizedKey.includes(token))) {
          return true;
        }
      } else if (typeof value === 'number'
        && value > 0
        && tokens.some((token) => normalizedKey.includes(token))) {
        return true;
      } else if (Array.isArray(value)) {
        stack.push(...value.map((item) => ({ key, value: item })));
      } else if (value && typeof value === 'object') {
        stack.push(...Object.entries(value as Record<string, unknown>)
          .map(([nestedKey, nestedValue]) => ({ key: `${key}.${nestedKey}`, value: nestedValue })));
      }
    }
    return false;
  }

  private buildSearchRunCoverageRecords(
    searchPlanId: string,
    searchRunId: string,
    input: RecordSearchRunInput,
    createdAt: string,
  ): TopicSelectionSearchRunCoverageRecords {
    return {
      observations: (input.coverage_observations ?? []).map((observation) => ({
        coverage_execution_observation_id: this.idFactory('coverage_observation'),
        search_plan_id: searchPlanId,
        coverage_row_intent_id: observation.coverage_row_intent_id,
        search_run_id: searchRunId,
        status: observation.status,
        result_count: observation.result_count ?? 0,
        source_count: observation.source_count ?? 0,
        missing_reason_codes: observation.missing_reason_codes ?? [],
        notes: observation.notes ?? null,
        created_at: createdAt,
      })),
      evidence_bindings: (input.evidence_bindings ?? []).map((binding) => ({
        coverage_evidence_binding_id: this.idFactory('coverage_binding'),
        search_plan_id: searchPlanId,
        coverage_row_intent_id: binding.coverage_row_intent_id,
        search_run_id: searchRunId,
        literature_ref: binding.literature_ref,
        source_refs: binding.source_refs ?? [],
        binding_kind: binding.binding_kind ?? 'retrieval_hit',
        result_rank: binding.result_rank ?? null,
        created_at: createdAt,
      })),
      assessments: (input.coverage_assessments ?? []).map((assessment) => ({
        coverage_assessment_id: this.idFactory('coverage_assessment'),
        search_plan_id: searchPlanId,
        coverage_row_intent_id: assessment.coverage_row_intent_id,
        verdict: assessment.verdict,
        issue_codes: assessment.issue_codes ?? [],
        confidence: assessment.confidence ?? null,
        assessed_by: assessment.assessed_by ?? 'system',
        created_at: createdAt,
      })),
      risk_acceptances: (input.coverage_risk_acceptances ?? []).map((riskAcceptance) => ({
        coverage_risk_acceptance_id: this.idFactory('coverage_risk'),
        search_plan_id: searchPlanId,
        coverage_row_intent_id: riskAcceptance.coverage_row_intent_id,
        accepted_risk_ref: riskAcceptance.accepted_risk_ref,
        accepted_by: riskAcceptance.accepted_by,
        rationale: riskAcceptance.rationale,
        expires_at: riskAcceptance.expires_at ?? null,
        created_at: createdAt,
      })),
    };
  }

  private assertCoverageRecordsBelongToSearchPlan(
    input: RecordSearchRunInput,
    coverageRowIntents: TopicSelectionCoverageRowIntentRecord[],
  ): void {
    const allowedRowIds = new Set(coverageRowIntents.map((intent) => intent.coverage_row_intent_id));
    const referencedRowIds = new Set<string>();
    for (const observation of input.coverage_observations ?? []) {
      referencedRowIds.add(observation.coverage_row_intent_id);
    }
    for (const binding of input.evidence_bindings ?? []) {
      referencedRowIds.add(binding.coverage_row_intent_id);
    }
    for (const assessment of input.coverage_assessments ?? []) {
      referencedRowIds.add(assessment.coverage_row_intent_id);
    }
    for (const riskAcceptance of input.coverage_risk_acceptances ?? []) {
      referencedRowIds.add(riskAcceptance.coverage_row_intent_id);
    }

    const invalidRowIds = [...referencedRowIds].filter((rowId) => !allowedRowIds.has(rowId));
    if (invalidRowIds.length > 0) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Coverage records reference rows outside SearchPlan: ${invalidRowIds.join(', ')}.`,
      );
    }
  }

  private buildLiteratureSourceHealthSummary(
    literatureIds: string[],
    literatureById: Map<string, { rightsClass: string; abstractText: string | null; keyContentDigest: string | null }>,
    pipelineByLiteratureId: Map<string, { abstractReady: boolean; keyContentReady: boolean; dedupStatus: string }>,
    sourceCount: number,
    missingLiteratureIds: string[],
  ): TopicSelectionSourceHealthSummary {
    const rightsClassCounts: Record<string, number> = {};
    let pipelineReadyCount = 0;
    let abstractReadyCount = 0;
    let keyContentReadyCount = 0;
    let fulltextReadyCount = 0;
    let staleCount = 0;
    for (const literatureId of literatureIds) {
      const literature = literatureById.get(literatureId);
      if (!literature) {
        continue;
      }
      rightsClassCounts[literature.rightsClass] = (rightsClassCounts[literature.rightsClass] ?? 0) + 1;
      const pipeline = pipelineByLiteratureId.get(literatureId);
      if (pipeline?.abstractReady || literature.abstractText) {
        abstractReadyCount += 1;
      }
      if (pipeline?.keyContentReady || literature.keyContentDigest) {
        keyContentReadyCount += 1;
      }
      if (pipeline?.abstractReady && pipeline?.keyContentReady) {
        pipelineReadyCount += 1;
      }
      if (pipeline?.dedupStatus === 'duplicate') {
        staleCount += 1;
      }
      if (literature.keyContentDigest) {
        fulltextReadyCount += 1;
      }
    }
    const resolvedLiteratureCount = literatureById.size;
    const warningCodes = this.uniqueStrings([
      ...(missingLiteratureIds.length > 0 ? ['MISSING_LITERATURE_RECORD'] : []),
      ...(resolvedLiteratureCount > 0 && keyContentReadyCount < resolvedLiteratureCount
        ? ['INCOMPLETE_KEY_CONTENT_READY']
        : []),
      ...(resolvedLiteratureCount > 0 && abstractReadyCount < resolvedLiteratureCount
        ? ['INCOMPLETE_ABSTRACT_READY']
        : []),
      ...(resolvedLiteratureCount > 0 && sourceCount < resolvedLiteratureCount
        ? ['LOW_SOURCE_COUNT']
        : []),
      ...(resolvedLiteratureCount > 0 && pipelineReadyCount < resolvedLiteratureCount
        ? ['INCOMPLETE_PIPELINE_READY']
        : []),
      ...(staleCount > 0 ? ['STALE_OR_DUPLICATE_PIPELINE_STATUS'] : []),
      ...(resolvedLiteratureCount > 0 && fulltextReadyCount < resolvedLiteratureCount
        ? ['INCOMPLETE_FULLTEXT_READY']
        : []),
    ]);
    return {
      total_literature_count: literatureIds.length,
      missing_literature_ids: missingLiteratureIds,
      rights_class_counts: rightsClassCounts,
      pipeline_ready_count: pipelineReadyCount,
      abstract_ready_count: abstractReadyCount,
      key_content_ready_count: keyContentReadyCount,
      fulltext_ready_count: fulltextReadyCount,
      source_count: sourceCount,
      stale_count: staleCount,
      blocked_count: missingLiteratureIds.length,
      warning_codes: warningCodes,
    };
  }

  private async requireTopicSeed(topicSeedId: string): Promise<TopicSelectionTopicSeedRecord> {
    const record = await this.repository.findTopicSeedById(topicSeedId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `TopicSeed ${topicSeedId} not found.`);
    }
    return record;
  }

  private async requireLiteratureSnapshot(
    snapshotId: string,
  ): Promise<TopicSelectionLiteratureResourcePoolSnapshotRecord> {
    const record = await this.repository.findLiteratureResourcePoolSnapshotById(snapshotId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `LiteratureResourcePoolSnapshot ${snapshotId} not found.`);
    }
    return record;
  }

  private async requireSearchPlan(searchPlanId: string): Promise<TopicSelectionSearchPlanRecord> {
    const record = await this.repository.findSearchPlanById(searchPlanId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `SearchPlan ${searchPlanId} not found.`);
    }
    return record;
  }

  private async requireRecheckRequest(requestId: string): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
    const record = await this.repository.findSearchPlanRecheckRequestById(requestId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `SearchPlanRecheckRequest ${requestId} not found.`);
    }
    return record;
  }

  private assertSameTitleCard(expected: string, actual: string, label: string): void {
    if (expected !== actual) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} belongs to a different title card.`);
    }
  }

  private assertTransitionPassed(
    result: string,
    label: string,
    blockers: Array<{ code: string }> = [],
    details: Record<string, unknown> = {},
  ): void {
    if (result !== 'passed' && result !== 'passed_with_risk') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `${label} did not pass its readiness transition.`, {
        ...details,
        blocker_codes: blockers.map((blocker) => blocker.code),
      });
    }
  }

  private hasCompleteResultAccounting(accounting: TopicSelectionSearchRunResultAccounting): boolean {
    return Number.isFinite(accounting.total_result_count)
      && Number.isFinite(accounting.unique_literature_count)
      && Number.isFinite(accounting.duplicate_result_count)
      && Number.isFinite(accounting.failed_source_count)
      && Number.isFinite(accounting.skipped_source_count);
  }

  private ref(
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

  private blocker(code: string, message: string): TopicSelectionGateIssue {
    return {
      code,
      message,
      severity: 'blocking',
    };
  }

  private stateWriteIntent(
    targetRef: TopicSelectionFunctionalRef,
    axis: TopicSelectionStateWriteIntent['axis'],
    stateKey: string,
    nextValue: string,
  ): TopicSelectionStateWriteIntent {
    return {
      axis,
      target_ref: targetRef,
      state_key: stateKey,
      next_value: nextValue,
    };
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }

  private versionFromId(id: string): string {
    const suffix = id.split('_').at(-1) ?? 'v1';
    return `v-${suffix}`;
  }

  /**
   * T-087 D1 read-only projection — list SearchPlans under a title-card.
   * Pure repository delegation; no decision-chain semantics changed.
   */
  async listSearchPlansByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecord[]> {
    return this.repository.listSearchPlansByTitleCardId(titleCardId);
  }

  /**
   * T-087 Phase 2.2 read-only projection — list SearchPlanRecheckRequests
   * under a title-card; pure repository delegation.
   */
  async listSearchPlanRecheckRequestsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionSearchPlanRecheckRequestRecord[]> {
    return this.repository.listSearchPlanRecheckRequestsByTitleCardId(titleCardId);
  }
}
