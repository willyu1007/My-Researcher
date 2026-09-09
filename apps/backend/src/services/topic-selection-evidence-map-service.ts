import crypto from 'node:crypto';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
  TopicSelectionStateWriteIntent,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION,
  TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION,
  type TopicSelectionEvidenceConvergenceClaimAdmission,
  type TopicSelectionEvidenceDeltaArtifact,
  type TopicSelectionResolutionRouteArtifact,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionCoverageEvidenceBindingRecord,
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionEvidenceRole,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionEvidenceAssessmentGranularity,
  TopicSelectionEvidenceAssessmentPurpose,
  TopicSelectionEvidenceAttributionKind,
  TopicSelectionEvidenceClusterRecord,
  TopicSelectionEvidenceClusterType,
  TopicSelectionEvidenceConflictSetRecord,
  TopicSelectionEvidenceConflictSeverity,
  TopicSelectionEvidenceConflictType,
  TopicSelectionEvidenceFreshnessStatus,
  TopicSelectionEvidenceLinkType,
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidencePatternRecord,
  TopicSelectionEvidencePatternType,
  TopicSelectionEvidenceReviewStatus,
  TopicSelectionEvidenceRoleBundle,
  TopicSelectionEvidenceSourceLocator,
  TopicSelectionEvidenceStrengthAssessmentRecord,
  TopicSelectionEvidenceStrengthVerdict,
  TopicSelectionEvidenceTypedLinkRecord,
  TopicSelectionEvidenceUnitRecord,
  TopicSelectionNeedValidationEvidenceBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import { AppError } from '../errors/app-error.js';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import type {
  TopicSelectionEvidenceMapCreateRecords,
  TopicSelectionEvidenceMapRepository,
  TopicSelectionInitialEvidenceMapRecord,
} from '../repositories/topic-selection-evidence-map.repository.js';
import type { TopicSelectionSearchResourceRepository } from '../repositories/topic-selection-search-resource.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
  checkpointControl?: Pick<TopicSelectionResearchCheckpointService, 'materializeEvidenceLandscapeCheckpoint'>;
};

type EvidenceRole = Exclude<TopicSelectionEvidenceRole, 'unknown'>;

export type TopicSelectionEvidenceMapEvidenceUnitInput = {
  client_unit_key?: string;
  coverage_row_intent_id?: string | null;
  evidence_role: EvidenceRole;
  literature_ref: TopicSelectionFunctionalRef;
  source_refs?: TopicSelectionFunctionalRef[];
  locator: TopicSelectionEvidenceSourceLocator;
  source_attribution_kind?: TopicSelectionEvidenceAttributionKind;
  source_statement: string;
  normalized_statement?: string | null;
  interpretation_payload?: Record<string, unknown>;
  extraction_confidence?: number | null;
  review_status?: TopicSelectionEvidenceReviewStatus;
};

export type TopicSelectionEvidenceMapTypedLinkInput = {
  link_type: TopicSelectionEvidenceLinkType;
  source_unit_key: string;
  target_unit_key: string;
  rationale?: string | null;
  confidence?: number | null;
};

export type TopicSelectionEvidenceMapClusterInput = {
  cluster_type: TopicSelectionEvidenceClusterType;
  cluster_key: string;
  unit_keys: string[];
  label: string;
  rationale?: string | null;
  confidence?: number | null;
};

export type TopicSelectionEvidenceMapPatternInput = {
  pattern_type: TopicSelectionEvidencePatternType;
  evidence_role: EvidenceRole;
  unit_keys: string[];
  pattern_statement: string;
  confidence?: number | null;
};

export type TopicSelectionEvidenceMapConflictSetInput = {
  conflict_type: TopicSelectionEvidenceConflictType;
  severity: TopicSelectionEvidenceConflictSeverity;
  support_unit_keys?: string[];
  challenge_unit_keys?: string[];
  baseline_unit_keys?: string[];
  context_unit_keys?: string[];
  issue_codes?: string[];
};

export type TopicSelectionCreateEvidenceMapFromSearchRunInput = {
  workspace_id?: string | null;
  title_card_id: string;
  search_run_id: string;
  evidence_map_version?: string;
  evidence_units: TopicSelectionEvidenceMapEvidenceUnitInput[];
  typed_links?: TopicSelectionEvidenceMapTypedLinkInput[];
  clusters?: TopicSelectionEvidenceMapClusterInput[];
  patterns?: TopicSelectionEvidenceMapPatternInput[];
  conflict_sets?: TopicSelectionEvidenceMapConflictSetInput[];
  digest_payload?: Record<string, unknown>;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

export type TopicSelectionPublishEvidenceConvergenceSuccessorInput = {
  workspace_id?: string | null;
  title_card_id: string;
  predecessor_evidence_map_id: string;
  search_run_id: string;
  issue_ref: TopicSelectionFunctionalRef;
  decision_relevance: string;
  claim_admissions: TopicSelectionEvidenceConvergenceClaimAdmission[];
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

export type TopicSelectionPublishEvidenceConvergenceSuccessorResult = {
  status: 'no_material_delta' | 'successor_published';
  evidence_delta: TopicSelectionEvidenceDeltaArtifact;
  evidence_delta_ref: TopicSelectionFunctionalRef;
  resolution_route: TopicSelectionResolutionRouteArtifact;
  resolution_route_ref: TopicSelectionFunctionalRef;
  successor: TopicSelectionEvidenceMapCreateRecords | null;
};

type PersistedEvidenceConvergenceHit = {
  query: string;
  literature_ref: TopicSelectionFunctionalRef;
  embedding_version_id: string;
  chunk_ref: TopicSelectionFunctionalRef;
  chunk_hash: string;
  source_text: string;
  rank: number;
};

type RoleBundleInput = {
  support_unit_ids?: string[];
  challenge_unit_ids?: string[];
  baseline_unit_ids?: string[];
  context_unit_ids?: string[];
};

type AssessEvidenceStrengthInput = {
  workspace_id?: string | null;
  evidence_map_id: string;
  target_ref: TopicSelectionFunctionalRef;
  purpose: TopicSelectionEvidenceAssessmentPurpose;
  granularity?: TopicSelectionEvidenceAssessmentGranularity;
  role_bundle: RoleBundleInput;
  assessment_workflow_version: string;
  policy_version_id?: string | null;
  created_by?: TopicSelectionActorType;
};

type MarkStaleInput = {
  evidence_map_id: string;
  stale_reason_codes: string[];
  freshness_status?: Extract<TopicSelectionEvidenceFreshnessStatus, 'stale' | 'recheck_required'>;
};

const CONSUMABLE_SEARCH_RUN_STATUSES = new Set<TopicSelectionSearchRunRecord['run_status']>(['succeeded', 'partial']);
const EVIDENCE_AUTHORITY_ATTRIBUTION_KINDS = new Set<TopicSelectionEvidenceAttributionKind>([
  'source_claim',
  'counter_evidence',
  'human_judgment',
]);

export class TopicSelectionEvidenceMapService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly checkpointControl?: Pick<TopicSelectionResearchCheckpointService, 'materializeEvidenceLandscapeCheckpoint'>;

  constructor(
    private readonly repository: TopicSelectionEvidenceMapRepository,
    private readonly controlPlane: TopicSelectionControlPlaneService,
    private readonly searchResources: TopicSelectionSearchResourceRepository,
    private readonly literature: LiteratureRepository,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.checkpointControl = options.checkpointControl;
  }

  async createEvidenceMapFromSearchRun(
    input: TopicSelectionCreateEvidenceMapFromSearchRunInput,
  ): Promise<TopicSelectionEvidenceMapCreateRecords> {
    if (input.evidence_units.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'EvidenceMap requires at least one claim-level EvidenceUnit.');
    }

    const searchRun = await this.requireSearchRun(input.search_run_id);
    this.assertSameTitleCard(input.title_card_id, searchRun.title_card_id, 'SearchRun');
    if (!CONSUMABLE_SEARCH_RUN_STATUSES.has(searchRun.run_status)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'EvidenceMap requires a succeeded or partial SearchRun.');
    }
    const searchPlan = await this.requireSearchPlan(searchRun.search_plan_ref.ref_id);
    const literatureSnapshot = await this.searchResources.findLiteratureResourcePoolSnapshotById(
      searchRun.literature_snapshot_ref.ref_id,
    );
    if (!literatureSnapshot) {
      throw new AppError(404, 'NOT_FOUND', `LiteratureResourcePoolSnapshot ${searchRun.literature_snapshot_ref.ref_id} not found.`);
    }
    if (searchPlan.search_plan_id !== searchRun.search_plan_ref.ref_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'SearchRun does not trace to the resolved SearchPlan.');
    }
    if (searchPlan.literature_snapshot_ref.ref_id !== literatureSnapshot.literature_resource_pool_snapshot_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'SearchRun literature snapshot does not match SearchPlan lineage.');
    }

    const [coverageRows, coverageAssessments, allCoverageBindings] = await Promise.all([
      this.searchResources.listCoverageRowIntentsBySearchPlanId(searchPlan.search_plan_id),
      this.searchResources.listCoverageAssessmentsBySearchPlanId(searchPlan.search_plan_id),
      this.searchResources.listCoverageEvidenceBindingsBySearchPlanId(searchPlan.search_plan_id),
    ]);
    const coverageBindings = allCoverageBindings
      .filter((binding) => binding.search_run_id === searchRun.search_run_id);
    const allowedRefs = this.buildAllowedEvidenceRefs(searchRun, coverageBindings);
    await this.validateEvidenceUnitInputs(input.evidence_units, coverageRows, allowedRefs);

    const evidenceMapId = this.idFactory('evidence_map');
    const evidenceMapVersion = input.evidence_map_version ?? this.versionFromId(evidenceMapId);
    const evidenceMapRef = this.ref('evidence_map', evidenceMapId, input.title_card_id, evidenceMapVersion);
    const searchRunRef = this.ref('search_run', searchRun.search_run_id, input.title_card_id);
    const searchPlanRef = this.ref('search_plan', searchPlan.search_plan_id, input.title_card_id, searchPlan.plan_version);
    const literatureSnapshotRef = this.ref(
      'literature_resource_pool_snapshot',
      literatureSnapshot.literature_resource_pool_snapshot_id,
      input.title_card_id,
      literatureSnapshot.snapshot_version,
    );
    const createdAt = this.now();
    const unitKeyToRef = new Map<string, TopicSelectionFunctionalRef>();
    const evidenceUnits = input.evidence_units.map<TopicSelectionEvidenceUnitRecord>((unitInput, index) => {
      const unitId = this.idFactory('evidence_unit');
      const unitRef = this.ref('evidence_unit', unitId, input.title_card_id, evidenceMapVersion);
      const unitKey = unitInput.client_unit_key ?? String(index);
      unitKeyToRef.set(unitKey, unitRef);
      const abstractOnly = unitInput.locator.locator_type === 'abstract';
      const issueCodes = abstractOnly && unitInput.evidence_role === 'support' ? ['ABSTRACT_ONLY_SUPPORT'] : [];
      return {
        evidence_unit_id: unitId,
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        evidence_map_id: evidenceMapId,
        evidence_map_version: evidenceMapVersion,
        search_run_ref: searchRunRef,
        search_plan_ref: searchPlanRef,
        literature_snapshot_ref: literatureSnapshotRef,
        coverage_row_intent_ref: unitInput.coverage_row_intent_id
          ? this.ref('coverage_row_intent', unitInput.coverage_row_intent_id, input.title_card_id)
          : null,
        literature_ref: unitInput.literature_ref,
        source_refs: this.evidenceUnitSourceRefs(unitInput),
        locator: unitInput.locator,
        evidence_role: unitInput.evidence_role,
        source_attribution_kind: unitInput.source_attribution_kind ?? 'source_claim',
        source_statement: unitInput.source_statement,
        normalized_statement: unitInput.normalized_statement ?? null,
        interpretation_payload: unitInput.interpretation_payload ?? {},
        extraction_confidence: unitInput.extraction_confidence ?? null,
        abstract_only: abstractOnly,
        review_status: unitInput.review_status ?? 'machine_checked',
        freshness_status: 'current',
        issue_codes: issueCodes,
        created_by: input.created_by ?? 'system',
        created_at: createdAt,
      };
    });

    const typedLinks = this.buildTypedLinks(input, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const clusters = this.buildClusters(input, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const patterns = this.buildPatterns(input, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const conflictSets = this.buildConflictSets(input, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: evidenceMapRef,
      source_refs: [
        searchRunRef,
        searchPlanRef,
        literatureSnapshotRef,
        ...evidenceUnits.map((unit) => unit.literature_ref),
        ...evidenceUnits.flatMap((unit) => unit.source_refs),
      ],
      payload: {
        search_run_ref: searchRunRef,
        unit_count: evidenceUnits.length,
        digest_payload: input.digest_payload ?? {},
        evidence_unit_refs: evidenceUnits.map((unit) => this.ref('evidence_unit', unit.evidence_unit_id, input.title_card_id)),
      },
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_key: 'topic-selection.evidence-map-build',
      workflow_profile_key: 'deterministic-contract',
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      output_summary: this.roleCounts(evidenceUnits),
      artifacts: [
        {
          artifact_kind: 'structured_output',
          payload: {
            evidence_unit_count: evidenceUnits.length,
            typed_link_count: typedLinks.length,
            cluster_count: clusters.length,
            pattern_count: patterns.length,
            conflict_set_count: conflictSets.length,
          },
        },
      ],
      created_by: input.created_by ?? 'system',
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      gate_key: 'topic-selection.evidence-map-ready',
      target_ref: evidenceMapRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policy_version_id ?? null,
      blockers: this.evidenceMapBlockers(evidenceUnits),
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      transition_key: 'search-run-to-evidence-map',
      source_ref: searchRunRef,
      target_ref: evidenceMapRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(evidenceMapRef, 'execution', 'evidence_map', 'ready')],
      created_authority_refs: [evidenceMapRef, ...evidenceUnits.map((unit) => this.ref('evidence_unit', unit.evidence_unit_id, input.title_card_id))],
    });
    this.assertTransitionPassed(transition.result, 'EvidenceMap');
    const lineage = await this.controlPlane.linkLineage({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      source_ref: searchRunRef,
      target_ref: evidenceMapRef,
      relation_type: 'derived_from',
      artifact_refs: workflow.artifact_refs.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id)),
      created_by: input.created_by ?? 'system',
    });
    const trace = await this.controlPlane.buildTraceSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: evidenceMapRef,
      object_refs: [
        evidenceMapRef,
        searchRunRef,
        searchPlanRef,
        literatureSnapshotRef,
        ...evidenceUnits.map((unit) => this.ref('evidence_unit', unit.evidence_unit_id, input.title_card_id)),
      ],
      lineage_link_refs: [this.ref('functional_lineage_link', lineage.functional_lineage_link_id, input.title_card_id)],
      artifact_refs: workflow.artifact_refs.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id)),
      transition_attempt_refs: [this.ref('chain_transition_attempt', transition.chain_transition_attempt_id, input.title_card_id)],
      payload: {
        role_counts: this.roleCounts(evidenceUnits),
        abstract_only_support_count: evidenceUnits.filter((unit) => unit.issue_codes.includes('ABSTRACT_ONLY_SUPPORT')).length,
      },
      created_by: input.created_by ?? 'system',
    });

    const roleCounts = this.roleCounts(evidenceUnits);
    const evidenceMap: TopicSelectionInitialEvidenceMapRecord = {
      evidence_map_id: evidenceMapId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_version: evidenceMapVersion,
      status: 'ready',
      review_status: 'machine_checked',
      freshness_status: 'current',
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      unit_count: evidenceUnits.length,
      support_unit_count: roleCounts.support_unit_count,
      challenge_unit_count: roleCounts.challenge_unit_count,
      baseline_unit_count: roleCounts.baseline_unit_count,
      context_unit_count: roleCounts.context_unit_count,
      digest_payload: input.digest_payload ?? {},
      stale_reason_codes: [],
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      trace_snapshot_id: trace.trace_snapshot_id,
      artifact_refs: workflow.artifact_refs.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id)),
      created_by: input.created_by ?? 'system',
      created_at: createdAt,
    };

    const persisted = await this.repository.createEvidenceMapWithRecords({
      evidence_map: evidenceMap,
      evidence_units: evidenceUnits,
      typed_links: typedLinks,
      clusters,
      patterns,
      conflict_sets: conflictSets,
    });
    await this.checkpointControl?.materializeEvidenceLandscapeCheckpoint({
      evidence_map: persisted.evidence_map,
      evidence_units: persisted.evidence_units,
      conflict_sets: persisted.conflict_sets,
      coverage_row_intents: coverageRows,
      coverage_assessments: coverageAssessments,
      policy_version_id: input.policy_version_id ?? null,
    });
    return persisted;
  }

  async publishEvidenceConvergenceSuccessor(
    input: TopicSelectionPublishEvidenceConvergenceSuccessorInput,
  ): Promise<TopicSelectionPublishEvidenceConvergenceSuccessorResult> {
    if (!input.title_card_id.trim() || !input.predecessor_evidence_map_id.trim()
      || !input.search_run_id.trim() || !input.decision_relevance.trim()
      || input.claim_admissions.length === 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Evidence convergence successor requires a predecessor, SearchRun, decision relevance, and claim admission.',
      );
    }
    const predecessor = await this.requireEvidenceMap(input.predecessor_evidence_map_id);
    this.assertSameTitleCard(input.title_card_id, predecessor.title_card_id, 'predecessor EvidenceMap');
    if (input.workspace_id !== undefined
      && (input.workspace_id ?? null) !== (predecessor.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence workspace scope does not match the predecessor EvidenceMap.');
    }
    if (predecessor.status !== 'ready' || predecessor.freshness_status !== 'current'
      || predecessor.successor_evidence_map_ref) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence requires the current predecessor EvidenceMap head.');
    }
    if (input.issue_ref.ref_type !== 'coverage_row_intent'
      || input.issue_ref.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence issue is outside the title card.');
    }

    const searchRun = await this.requireSearchRun(input.search_run_id);
    this.assertSameTitleCard(input.title_card_id, searchRun.title_card_id, 'SearchRun');
    if ((searchRun.workspace_id ?? null) !== (predecessor.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence SearchRun is outside the predecessor workspace scope.');
    }
    if (!CONSUMABLE_SEARCH_RUN_STATUSES.has(searchRun.run_status)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Evidence convergence requires a consumable SearchRun.');
    }
    const searchPlan = await this.requireSearchPlan(searchRun.search_plan_ref.ref_id);
    if ((searchPlan.workspace_id ?? null) !== (predecessor.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence SearchPlan is outside the predecessor workspace scope.');
    }
    if (searchPlan.parent_search_plan_ref?.ref_id !== predecessor.search_plan_ref.ref_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Successor SearchRun does not extend the predecessor SearchPlan.');
    }
    const [predecessorRows, coverageRows, coverageAssessments, coverageBindings] = await Promise.all([
      this.searchResources.listCoverageRowIntentsBySearchPlanId(predecessor.search_plan_ref.ref_id),
      this.searchResources.listCoverageRowIntentsBySearchPlanId(searchPlan.search_plan_id),
      this.searchResources.listCoverageAssessmentsBySearchPlanId(searchPlan.search_plan_id),
      this.searchResources.listCoverageEvidenceBindingsBySearchPlanId(searchPlan.search_plan_id),
    ]);
    const predecessorIssueRow = predecessorRows.find((row) => (
      row.coverage_row_intent_id === input.issue_ref.ref_id
    ));
    const issueRow = predecessorIssueRow
      ? coverageRows.find((row) => row.coverage_key === predecessorIssueRow.coverage_key)
      : null;
    if (!predecessorIssueRow || !issueRow) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence convergence issue did not survive into the child SearchPlan.');
    }

    const persistedHits = this.persistedEvidenceConvergenceHits(searchRun);
    const admittedInputs = input.claim_admissions.map((admission, index) => {
      this.assertEvidenceConvergenceAdmission(
        admission,
        input,
        searchPlan.recheck_request_ref,
        searchRun,
        issueRow,
        persistedHits,
      );
      return this.evidenceConvergenceAdmissionUnitInput(admission, issueRow, `admission:${index}`);
    });
    const [predecessorUnits, predecessorLinks, predecessorClusters, predecessorPatterns, predecessorConflicts] =
      await Promise.all([
        this.repository.listEvidenceUnitsByEvidenceMapId(predecessor.evidence_map_id),
        this.repository.listTypedLinksByEvidenceMapId(predecessor.evidence_map_id),
        this.repository.listClustersByEvidenceMapId(predecessor.evidence_map_id),
        this.repository.listPatternsByEvidenceMapId(predecessor.evidence_map_id),
        this.repository.listConflictSetsByEvidenceMapId(predecessor.evidence_map_id),
      ]);
    const existingClaimKeys = new Set(predecessorUnits.map((unit) => this.evidenceClaimKey({
      evidence_role: unit.evidence_role,
      literature_ref: unit.literature_ref,
      locator: unit.locator,
      source_statement: unit.source_statement,
      normalized_statement: unit.normalized_statement ?? null,
    })));
    const materialAdmissions = admittedInputs.filter((unit) => {
      const key = this.evidenceClaimKey(unit);
      if (existingClaimKeys.has(key)) return false;
      existingClaimKeys.add(key);
      return true;
    });
    const predecessorRef = this.ref(
      'evidence_map',
      predecessor.evidence_map_id,
      predecessor.title_card_id,
      predecessor.evidence_map_version,
    );
    const resolutionRoute: TopicSelectionResolutionRouteArtifact = {
      schema_version: TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION,
      issue_ref: input.issue_ref,
      owning_stage: 'evidence_landscape',
      route_kind: 'retrieve_and_recheck',
      target_ref: this.ref('search_plan', searchPlan.search_plan_id, input.title_card_id, searchPlan.plan_version),
      required_delta: input.decision_relevance.trim(),
      recheck_gate_key: 'topic-selection.evidence-landscape-ready',
      authority_boundary: 'deterministic_gate_then_strict_human',
    };
    const routeArtifact = await this.controlPlane.recordEvidenceConvergenceArtifact({
      workspace_id: input.workspace_id ?? predecessor.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_run_id: searchRun.workflow_run_id ?? null,
      input_snapshot_id: searchRun.input_snapshot_id ?? null,
      artifact_type: 'resolution_route',
      payload: resolutionRoute,
    });
    const routeRef = this.ref(
      'artifact_ref',
      routeArtifact.artifact_ref_id,
      input.title_card_id,
      routeArtifact.checksum,
    );

    if (materialAdmissions.length === 0) {
      const evidenceDelta: TopicSelectionEvidenceDeltaArtifact = {
        schema_version: TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION,
        issue_refs: [input.issue_ref],
        predecessor_evidence_map_ref: predecessorRef,
        admitted_evidence_unit_refs: [],
        changed_claim_refs: [],
        negative_coverage_changes: [],
        source_health_changes: [],
        conflict_changes: [],
        decision_relevance: input.decision_relevance.trim(),
        material: false,
      };
      const deltaArtifact = await this.recordEvidenceDelta(input, predecessor, searchRun, evidenceDelta);
      return {
        status: 'no_material_delta',
        evidence_delta: evidenceDelta,
        evidence_delta_ref: this.artifactRef(deltaArtifact, input.title_card_id),
        resolution_route: resolutionRoute,
        resolution_route_ref: routeRef,
        successor: null,
      };
    }

    const childRowByParentRowId = new Map(predecessorRows.map((row) => [
      row.coverage_row_intent_id,
      coverageRows.find((candidate) => candidate.coverage_key === row.coverage_key)?.coverage_row_intent_id ?? null,
    ]));
    const predecessorUnitKeyById = new Map(predecessorUnits.map((unit) => [
      unit.evidence_unit_id,
      `predecessor:${unit.evidence_unit_id}`,
    ]));
    const preservedInputs: TopicSelectionEvidenceMapEvidenceUnitInput[] = predecessorUnits.map((unit) => {
      const mappedCoverageRowId = unit.coverage_row_intent_ref
        ? childRowByParentRowId.get(unit.coverage_row_intent_ref.ref_id)
        : null;
      if (unit.coverage_row_intent_ref && !mappedCoverageRowId) {
        throw new AppError(409, 'VERSION_CONFLICT', 'The child SearchPlan dropped predecessor coverage lineage.');
      }
      return {
        client_unit_key: predecessorUnitKeyById.get(unit.evidence_unit_id),
        coverage_row_intent_id: mappedCoverageRowId,
        evidence_role: unit.evidence_role,
        literature_ref: unit.literature_ref,
        source_refs: unit.source_refs,
        locator: unit.locator,
        source_attribution_kind: unit.source_attribution_kind,
        source_statement: unit.source_statement,
        normalized_statement: unit.normalized_statement ?? null,
        interpretation_payload: unit.interpretation_payload,
        extraction_confidence: unit.extraction_confidence ?? null,
        review_status: unit.review_status,
      };
    });
    const structureInput: TopicSelectionCreateEvidenceMapFromSearchRunInput = {
      workspace_id: input.workspace_id ?? predecessor.workspace_id ?? null,
      title_card_id: input.title_card_id,
      search_run_id: searchRun.search_run_id,
      evidence_units: [...preservedInputs, ...materialAdmissions],
      typed_links: predecessorLinks.map((link) => ({
        link_type: link.link_type,
        source_unit_key: this.requirePredecessorUnitKey(predecessorUnitKeyById, link.source_unit_ref.ref_id),
        target_unit_key: this.requirePredecessorUnitKey(predecessorUnitKeyById, link.target_unit_ref.ref_id),
        rationale: link.rationale ?? null,
        confidence: link.confidence ?? null,
      })),
      clusters: predecessorClusters.map((cluster) => ({
        cluster_type: cluster.cluster_type,
        cluster_key: cluster.cluster_key,
        unit_keys: cluster.unit_refs.map((unitRef) => (
          this.requirePredecessorUnitKey(predecessorUnitKeyById, unitRef.ref_id)
        )),
        label: cluster.label,
        rationale: cluster.rationale ?? null,
        confidence: cluster.confidence ?? null,
      })),
      patterns: predecessorPatterns.map((pattern) => ({
        pattern_type: pattern.pattern_type,
        evidence_role: pattern.evidence_role,
        unit_keys: pattern.unit_refs.map((unitRef) => (
          this.requirePredecessorUnitKey(predecessorUnitKeyById, unitRef.ref_id)
        )),
        pattern_statement: pattern.pattern_statement,
        confidence: pattern.confidence ?? null,
      })),
      conflict_sets: predecessorConflicts.map((conflict) => ({
        conflict_type: conflict.conflict_type,
        severity: conflict.severity,
        support_unit_keys: conflict.support_unit_refs.map((unitRef) => (
          this.requirePredecessorUnitKey(predecessorUnitKeyById, unitRef.ref_id)
        )),
        challenge_unit_keys: conflict.challenge_unit_refs.map((unitRef) => (
          this.requirePredecessorUnitKey(predecessorUnitKeyById, unitRef.ref_id)
        )),
        baseline_unit_keys: conflict.baseline_unit_refs.map((unitRef) => (
          this.requirePredecessorUnitKey(predecessorUnitKeyById, unitRef.ref_id)
        )),
        context_unit_keys: conflict.context_unit_refs.map((unitRef) => (
          this.requirePredecessorUnitKey(predecessorUnitKeyById, unitRef.ref_id)
        )),
        issue_codes: conflict.issue_codes,
      })),
      digest_payload: {
        ...predecessor.digest_payload,
        evidence_convergence: {
          predecessor_evidence_map_ref: predecessorRef,
          search_run_ref: this.ref('search_run', searchRun.search_run_id, input.title_card_id),
          admitted_claim_count: materialAdmissions.length,
        },
      },
      created_by: input.created_by ?? 'system',
      policy_version_id: input.policy_version_id ?? null,
    };
    const allowedRefs = this.buildAllowedEvidenceRefs(
      searchRun,
      coverageBindings.filter((binding) => binding.search_run_id === searchRun.search_run_id),
    );
    await this.validateEvidenceUnitInputs(structureInput.evidence_units, coverageRows, allowedRefs);

    const evidenceMapId = this.idFactory('evidence_map');
    const evidenceMapVersion = this.versionFromId(evidenceMapId);
    const evidenceMapRef = this.ref('evidence_map', evidenceMapId, input.title_card_id, evidenceMapVersion);
    const searchRunRef = this.ref('search_run', searchRun.search_run_id, input.title_card_id);
    const searchPlanRef = this.ref('search_plan', searchPlan.search_plan_id, input.title_card_id, searchPlan.plan_version);
    const literatureSnapshotRef = searchRun.literature_snapshot_ref;
    const createdAt = this.now();
    const unitKeyToRef = new Map<string, TopicSelectionFunctionalRef>();
    const evidenceUnits = structureInput.evidence_units.map<TopicSelectionEvidenceUnitRecord>((unitInput, index) => {
      const unitId = this.idFactory('evidence_unit');
      const unitRef = this.ref('evidence_unit', unitId, input.title_card_id, evidenceMapVersion);
      unitKeyToRef.set(unitInput.client_unit_key ?? String(index), unitRef);
      const abstractOnly = unitInput.locator.locator_type === 'abstract';
      return {
        evidence_unit_id: unitId,
        workspace_id: structureInput.workspace_id ?? null,
        title_card_id: input.title_card_id,
        evidence_map_id: evidenceMapId,
        evidence_map_version: evidenceMapVersion,
        search_run_ref: searchRunRef,
        search_plan_ref: searchPlanRef,
        literature_snapshot_ref: literatureSnapshotRef,
        coverage_row_intent_ref: unitInput.coverage_row_intent_id
          ? this.ref('coverage_row_intent', unitInput.coverage_row_intent_id, input.title_card_id)
          : null,
        literature_ref: unitInput.literature_ref,
        source_refs: this.evidenceUnitSourceRefs(unitInput),
        locator: unitInput.locator,
        evidence_role: unitInput.evidence_role,
        source_attribution_kind: unitInput.source_attribution_kind ?? 'source_claim',
        source_statement: unitInput.source_statement,
        normalized_statement: unitInput.normalized_statement ?? null,
        interpretation_payload: unitInput.interpretation_payload ?? {},
        extraction_confidence: unitInput.extraction_confidence ?? null,
        abstract_only: abstractOnly,
        review_status: unitInput.review_status ?? 'machine_checked',
        freshness_status: 'current',
        issue_codes: abstractOnly && unitInput.evidence_role === 'support' ? ['ABSTRACT_ONLY_SUPPORT'] : [],
        created_by: input.created_by ?? 'system',
        created_at: createdAt,
      };
    });
    const admittedRefs = materialAdmissions.map((admission) => (
      this.requireUnitKey(unitKeyToRef, admission.client_unit_key!)
    ));
    const evidenceDelta: TopicSelectionEvidenceDeltaArtifact = {
      schema_version: TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION,
      issue_refs: [input.issue_ref],
      predecessor_evidence_map_ref: predecessorRef,
      admitted_evidence_unit_refs: admittedRefs,
      changed_claim_refs: admittedRefs,
      negative_coverage_changes: [],
      source_health_changes: [],
      conflict_changes: [],
      decision_relevance: input.decision_relevance.trim(),
      material: true,
    };
    const deltaArtifact = await this.recordEvidenceDelta(input, predecessor, searchRun, evidenceDelta);
    const deltaRef = this.artifactRef(deltaArtifact, input.title_card_id);
    const typedLinks = this.buildTypedLinks(structureInput, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const clusters = this.buildClusters(structureInput, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const patterns = this.buildPatterns(structureInput, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const conflictSets = this.buildConflictSets(structureInput, evidenceMapId, evidenceMapVersion, unitKeyToRef, createdAt);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: structureInput.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: evidenceMapRef,
      source_refs: this.uniqueRefs([
        predecessorRef,
        searchRunRef,
        searchPlanRef,
        literatureSnapshotRef,
        deltaRef,
        routeRef,
        ...evidenceUnits.map((unit) => unit.literature_ref),
        ...evidenceUnits.flatMap((unit) => unit.source_refs),
      ]),
      payload: {
        predecessor_evidence_map_ref: predecessorRef,
        material_evidence_delta_ref: deltaRef,
        search_run_ref: searchRunRef,
        evidence_unit_refs: evidenceUnits.map((unit) => (
          this.ref('evidence_unit', unit.evidence_unit_id, input.title_card_id, evidenceMapVersion)
        )),
        digest_payload: structureInput.digest_payload ?? {},
      },
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: structureInput.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_key: 'topic-selection.evidence-convergence-successor',
      workflow_profile_key: 'deterministic-claim-admission',
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      output_summary: {
        admitted_claim_count: admittedRefs.length,
        total_unit_count: evidenceUnits.length,
      },
      created_by: input.created_by ?? 'system',
    });
    const blockers = this.evidenceMapBlockers(evidenceUnits);
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: structureInput.workspace_id ?? null,
      title_card_id: input.title_card_id,
      gate_key: 'topic-selection.evidence-convergence-claim-admission',
      target_ref: evidenceMapRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policy_version_id ?? null,
      blockers,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: structureInput.workspace_id ?? null,
      title_card_id: input.title_card_id,
      transition_key: 'search-run-to-evidence-map-successor',
      source_ref: searchRunRef,
      target_ref: evidenceMapRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(evidenceMapRef, 'execution', 'evidence_map', 'ready')],
      created_authority_refs: [evidenceMapRef, ...admittedRefs],
    });
    this.assertTransitionPassed(transition.result, 'EvidenceMap successor');
    const [runLineage, predecessorLineage] = await Promise.all([
      this.controlPlane.linkLineage({
        workspace_id: structureInput.workspace_id ?? null,
        title_card_id: input.title_card_id,
        source_ref: searchRunRef,
        target_ref: evidenceMapRef,
        relation_type: 'derived_from',
        artifact_refs: [deltaRef, routeRef],
        created_by: input.created_by ?? 'system',
      }),
      this.controlPlane.linkLineage({
        workspace_id: structureInput.workspace_id ?? null,
        title_card_id: input.title_card_id,
        source_ref: predecessorRef,
        target_ref: evidenceMapRef,
        relation_type: 'supersedes',
        artifact_refs: [deltaRef],
        created_by: input.created_by ?? 'system',
      }),
    ]);
    const trace = await this.controlPlane.buildTraceSnapshot({
      workspace_id: structureInput.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: evidenceMapRef,
      object_refs: [evidenceMapRef, predecessorRef, searchRunRef, searchPlanRef, literatureSnapshotRef, ...admittedRefs],
      lineage_link_refs: [runLineage, predecessorLineage].map((lineage) => (
        this.ref('functional_lineage_link', lineage.functional_lineage_link_id, input.title_card_id)
      )),
      artifact_refs: [deltaRef, routeRef],
      transition_attempt_refs: [
        this.ref('chain_transition_attempt', transition.chain_transition_attempt_id, input.title_card_id),
      ],
      payload: { material_evidence_delta_ref: deltaRef, admitted_claim_count: admittedRefs.length },
      created_by: input.created_by ?? 'system',
    });
    const roleCounts = this.roleCounts(evidenceUnits);
    const successorRecord: TopicSelectionEvidenceMapRecord = {
      evidence_map_id: evidenceMapId,
      workspace_id: structureInput.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_version: evidenceMapVersion,
      status: 'ready',
      review_status: 'machine_checked',
      freshness_status: 'current',
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      unit_count: evidenceUnits.length,
      support_unit_count: roleCounts.support_unit_count,
      challenge_unit_count: roleCounts.challenge_unit_count,
      baseline_unit_count: roleCounts.baseline_unit_count,
      context_unit_count: roleCounts.context_unit_count,
      digest_payload: structureInput.digest_payload ?? {},
      stale_reason_codes: [],
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      trace_snapshot_id: trace.trace_snapshot_id,
      artifact_refs: [deltaRef, routeRef],
      predecessor_evidence_map_ref: predecessorRef,
      successor_evidence_map_ref: null,
      material_evidence_delta_ref: deltaRef,
      lineage_revision: 0,
      created_by: input.created_by ?? 'system',
      created_at: createdAt,
    };
    const assessmentIdentity = sha256Text(stableStringify({
      search_run_id: searchRun.search_run_id,
      coverage_row_intent_id: issueRow.coverage_row_intent_id,
      admitted_evidence_unit_refs: admittedRefs,
    }));
    const assessmentId = `coverage_assessment_${assessmentIdentity.slice(0, 24)}`;
    // Coverage belongs to the child SearchPlan/SearchRun; keep the EvidenceMap head CAS last so
    // a failed adjunct write cannot strand a published successor that the caller cannot retry.
    if (!coverageAssessments.some((assessment) => assessment.coverage_assessment_id === assessmentId)) {
      await this.searchResources.createCoverageAssessment({
        coverage_assessment_id: assessmentId,
        search_plan_id: searchPlan.search_plan_id,
        coverage_row_intent_id: issueRow.coverage_row_intent_id,
        verdict: 'satisfied',
        issue_codes: [],
        confidence: Math.min(...materialAdmissions.map((admission) => admission.extraction_confidence ?? 1)),
        assessed_by: input.created_by ?? 'system',
        created_at: this.now(),
      });
    }
    let successor: TopicSelectionEvidenceMapCreateRecords;
    try {
      successor = await this.repository.publishEvidenceMapSuccessorWithRecords({
        expected_predecessor_id: predecessor.evidence_map_id,
        expected_lineage_revision: predecessor.lineage_revision ?? 0,
        material_evidence_delta_ref: deltaRef,
        successor_records: {
          evidence_map: successorRecord,
          evidence_units: evidenceUnits,
          typed_links: typedLinks,
          clusters,
          patterns,
          conflict_sets: conflictSets,
        },
      });
    } catch (error) {
      throw new AppError(409, 'VERSION_CONFLICT', error instanceof Error ? error.message : 'EvidenceMap successor publication failed.');
    }
    return {
      status: 'successor_published',
      evidence_delta: evidenceDelta,
      evidence_delta_ref: deltaRef,
      resolution_route: resolutionRoute,
      resolution_route_ref: routeRef,
      successor,
    };
  }

  async getNeedValidationEvidenceBundle(evidenceMapId: string): Promise<TopicSelectionNeedValidationEvidenceBundle> {
    const evidenceMap = await this.requireEvidenceMap(evidenceMapId);
    const units = await this.repository.listEvidenceUnitsByEvidenceMapId(evidenceMapId);
    const conflicts = await this.repository.listConflictSetsByEvidenceMapId(evidenceMapId);
    const assessments = await this.repository.listEvidenceStrengthAssessmentsByEvidenceMapId(evidenceMapId);
    return {
      evidence_map_ref: this.ref('evidence_map', evidenceMap.evidence_map_id, evidenceMap.title_card_id, evidenceMap.evidence_map_version),
      search_run_ref: evidenceMap.search_run_ref,
      search_plan_ref: evidenceMap.search_plan_ref,
      literature_snapshot_ref: evidenceMap.literature_snapshot_ref,
      generated_at: this.now(),
      freshness_status: evidenceMap.freshness_status,
      support_units: units.filter((unit) => unit.evidence_role === 'support'),
      challenge_units: units.filter((unit) => unit.evidence_role === 'challenge'),
      baseline_units: units.filter((unit) => unit.evidence_role === 'baseline'),
      context_units: units.filter((unit) => unit.evidence_role === 'context'),
      conflict_set_refs: conflicts.map((conflict) => this.ref('evidence_conflict_set', conflict.evidence_conflict_set_id, evidenceMap.title_card_id)),
      strength_assessment_refs: assessments
        .filter((assessment) => assessment.freshness_status === 'current')
        .map((assessment) => this.ref('evidence_strength_assessment', assessment.evidence_strength_assessment_id, evidenceMap.title_card_id)),
    };
  }

  async assessEvidenceStrength(
    input: AssessEvidenceStrengthInput,
  ): Promise<TopicSelectionEvidenceStrengthAssessmentRecord> {
    const evidenceMap = await this.requireEvidenceMap(input.evidence_map_id);
    const units = await this.repository.listEvidenceUnitsByEvidenceMapId(input.evidence_map_id);
    const unitById = new Map(units.map((unit) => [unit.evidence_unit_id, unit]));
    const roleBundle = this.resolveRoleBundle(input.role_bundle, unitById);
    const selectedUnitRefs = this.sortedRefs([
      ...roleBundle.support_unit_refs,
      ...roleBundle.challenge_unit_refs,
      ...roleBundle.baseline_unit_refs,
      ...roleBundle.context_unit_refs,
    ]);
    if (selectedUnitRefs.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'EvidenceStrengthAssessment requires at least one EvidenceUnit ref.');
    }
    const conflictSets = await this.repository.listConflictSetsByEvidenceMapId(input.evidence_map_id);
    const conflictRefs = conflictSets.map((conflict) => this.ref('evidence_conflict_set', conflict.evidence_conflict_set_id, evidenceMap.title_card_id));
    const cacheKey = this.assessmentCacheKey({
      target_ref: input.target_ref,
      purpose: input.purpose,
      granularity: input.granularity ?? 'bundle',
      unit_refs: selectedUnitRefs,
      evidence_map_version: evidenceMap.evidence_map_version,
      search_run_ref: evidenceMap.search_run_ref,
      search_plan_ref: evidenceMap.search_plan_ref,
      policy_version_id: input.policy_version_id ?? null,
      assessment_workflow_version: input.assessment_workflow_version,
    });
    const cached = await this.repository.findFreshEvidenceStrengthAssessmentByCacheKey(cacheKey);
    if (cached) {
      return cached;
    }

    const selectedUnits = selectedUnitRefs.map((unitRef) => unitById.get(unitRef.ref_id)).filter((unit): unit is TopicSelectionEvidenceUnitRecord => Boolean(unit));
    const verdict = this.classifyEvidenceStrength(selectedUnits, evidenceMap.freshness_status);
    const gapCodes = this.assessmentGapCodes(selectedUnits, roleBundle, evidenceMap.freshness_status);
    const assessmentId = this.idFactory('evidence_strength');
    const assessmentRef = this.ref('evidence_strength_assessment', assessmentId, evidenceMap.title_card_id);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: evidenceMap.title_card_id,
      target_ref: assessmentRef,
      source_refs: [
        this.ref('evidence_map', evidenceMap.evidence_map_id, evidenceMap.title_card_id, evidenceMap.evidence_map_version),
        ...selectedUnitRefs,
        ...conflictRefs,
      ],
      payload: {
        target_ref: input.target_ref,
        purpose: input.purpose,
        granularity: input.granularity ?? 'bundle',
        role_bundle: roleBundle,
        cache_key: cacheKey,
      },
      policy_version: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const workflow = await this.controlPlane.recordWorkflowRun({
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: evidenceMap.title_card_id,
      workflow_key: 'topic-selection.evidence-strength-assessment',
      workflow_profile_key: 'deterministic-bundle-classifier',
      workflow_profile_version: input.assessment_workflow_version,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      output_summary: {
        strength_verdict: verdict,
        gap_codes: gapCodes,
        unit_count: selectedUnitRefs.length,
      },
      created_by: input.created_by ?? 'system',
    });
    const qualitySignals = [];
    if (gapCodes.includes('ABSTRACT_ONLY_SUPPORT')) {
      qualitySignals.push(await this.controlPlane.emitQualitySignal({
        workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
        title_card_id: evidenceMap.title_card_id,
        target_ref: assessmentRef,
        stage: 'topic-selection.evidence-strength',
        check_type: 'abstract-only-support',
        verdict: 'warn',
        issue_codes: ['ABSTRACT_ONLY_SUPPORT'],
        recommended_action: 'Request section/paragraph/anchor-backed support before strong support is allowed.',
        refs: selectedUnitRefs,
        workflow_run_id: workflow.workflow_run.workflow_run_id,
        emitted_by: input.created_by ?? 'system',
      }));
    }
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: evidenceMap.title_card_id,
      gate_key: 'topic-selection.evidence-strength-assessment-ready',
      target_ref: assessmentRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      policy_version_id: input.policy_version_id ?? null,
      warnings: gapCodes.map((code) => ({
        code,
        message: `Evidence strength assessment flagged ${code}.`,
        severity: 'warning',
      })),
      quality_signal_refs: qualitySignals.map((signal) => this.ref('quality_signal', signal.quality_signal_id, evidenceMap.title_card_id)),
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: evidenceMap.title_card_id,
      transition_key: 'evidence-map-to-strength-assessment',
      source_ref: this.ref('evidence_map', evidenceMap.evidence_map_id, evidenceMap.title_card_id, evidenceMap.evidence_map_version),
      target_ref: assessmentRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version_id ?? null,
      actor: { actor_type: input.created_by ?? 'system' },
      state_write_intents: [this.stateWriteIntent(assessmentRef, 'decision', 'evidence_strength_assessment', verdict)],
      created_authority_refs: [assessmentRef],
    });
    this.assertTransitionPassed(transition.result, 'EvidenceStrengthAssessment');

    const record: TopicSelectionEvidenceStrengthAssessmentRecord = {
      evidence_strength_assessment_id: assessmentId,
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: evidenceMap.title_card_id,
      evidence_map_id: evidenceMap.evidence_map_id,
      evidence_map_version: evidenceMap.evidence_map_version,
      search_run_ref: evidenceMap.search_run_ref,
      search_plan_ref: evidenceMap.search_plan_ref,
      literature_snapshot_ref: evidenceMap.literature_snapshot_ref,
      target_ref: input.target_ref,
      purpose: input.purpose,
      granularity: input.granularity ?? 'bundle',
      role_bundle: roleBundle,
      unit_refs: selectedUnitRefs,
      conflict_refs: conflictRefs,
      cache_key: cacheKey,
      strength_verdict: verdict,
      confidence: this.confidenceForVerdict(verdict),
      gap_codes: gapCodes,
      quality_signal_refs: qualitySignals.map((signal) => this.ref('quality_signal', signal.quality_signal_id, evidenceMap.title_card_id)),
      stale_reason_codes: [],
      freshness_status: 'current',
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      transition_attempt_id: transition.chain_transition_attempt_id,
      policy_version_id: input.policy_version_id ?? null,
      assessment_workflow_version: input.assessment_workflow_version,
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    };
    return this.repository.createEvidenceStrengthAssessment(record);
  }

  async markEvidenceMapStale(input: MarkStaleInput): Promise<TopicSelectionEvidenceMapRecord> {
    return this.repository.updateEvidenceMapFreshness(
      input.evidence_map_id,
      input.freshness_status ?? 'stale',
      input.stale_reason_codes,
    );
  }

  async markEvidenceStrengthAssessmentsStale(input: MarkStaleInput): Promise<number> {
    return this.repository.markEvidenceStrengthAssessmentsStaleByEvidenceMapId(
      input.evidence_map_id,
      input.stale_reason_codes,
      input.freshness_status ?? 'recheck_required',
    );
  }

  private persistedEvidenceConvergenceHits(
    searchRun: TopicSelectionSearchRunRecord,
  ): PersistedEvidenceConvergenceHit[] {
    return searchRun.query_provenance.flatMap((entry) => {
      const hits = entry.hits;
      if (!Array.isArray(hits)) return [];
      return hits.filter((value): value is PersistedEvidenceConvergenceHit => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const hit = value as Partial<PersistedEvidenceConvergenceHit>;
        return typeof hit.query === 'string'
          && typeof hit.embedding_version_id === 'string'
          && typeof hit.chunk_hash === 'string'
          && typeof hit.source_text === 'string'
          && typeof hit.rank === 'number'
          && Boolean(hit.literature_ref)
          && Boolean(hit.chunk_ref);
      });
    });
  }

  private assertEvidenceConvergenceAdmission(
    admission: TopicSelectionEvidenceConvergenceClaimAdmission,
    input: TopicSelectionPublishEvidenceConvergenceSuccessorInput,
    recheckRequestRef: TopicSelectionFunctionalRef | null | undefined,
    searchRun: TopicSelectionSearchRunRecord,
    issueRow: TopicSelectionCoverageRowIntentRecord,
    persistedHits: PersistedEvidenceConvergenceHit[],
  ): void {
    if (admission.schema_version !== TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION
      || admission.request_ref.ref_type !== 'search_plan_recheck_request'
      || admission.search_run_ref.ref_type !== 'search_run'
      || admission.literature_ref.ref_type !== 'literature_record'
      || admission.request_ref.title_card_id !== input.title_card_id
      || admission.search_run_ref.title_card_id !== input.title_card_id
      || admission.literature_ref.title_card_id !== input.title_card_id
      || admission.chunk_ref.title_card_id !== input.title_card_id
      || admission.request_ref.ref_id !== recheckRequestRef?.ref_id
      || admission.search_run_ref.ref_id !== searchRun.search_run_id
      || admission.evidence_role !== issueRow.expected_evidence_role
      || !admission.query.trim()
      || !admission.source_statement.trim()) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Claim admission does not match the exact request, run, issue row, and title lineage.');
    }
    const hit = persistedHits.find((candidate) => (
      candidate.query === admission.query
      && this.refKey(candidate.literature_ref) === this.refKey(admission.literature_ref)
      && this.refKey(candidate.chunk_ref) === this.refKey(admission.chunk_ref)
      && candidate.chunk_hash === admission.chunk_hash
    ));
    const sourceText = hit?.source_text.trim().replace(/\s+/gu, ' ');
    const statement = admission.source_statement.trim().replace(/\s+/gu, ' ');
    if (!hit || sha256Text(hit.source_text) !== admission.chunk_hash
      || !sourceText?.includes(statement)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Claim admission is not an exact quote-bearing persisted retrieval hit.');
    }
  }

  private evidenceConvergenceAdmissionUnitInput(
    admission: TopicSelectionEvidenceConvergenceClaimAdmission,
    issueRow: TopicSelectionCoverageRowIntentRecord,
    clientUnitKey: string,
  ): TopicSelectionEvidenceMapEvidenceUnitInput {
    const locatorType = this.evidenceConvergenceLocatorType(admission.chunk_ref.ref_type);
    return {
      client_unit_key: clientUnitKey,
      coverage_row_intent_id: issueRow.coverage_row_intent_id,
      evidence_role: admission.evidence_role,
      literature_ref: admission.literature_ref,
      source_refs: [admission.chunk_ref],
      locator: {
        locator_type: locatorType,
        locator_ref: admission.chunk_ref,
        literature_ref: admission.literature_ref,
        source_ref: admission.chunk_ref,
        content_ref: admission.chunk_ref,
        document_ref: null,
        section_ref: locatorType === 'section' ? admission.chunk_ref : null,
        paragraph_ref: locatorType === 'paragraph' ? admission.chunk_ref : null,
        anchor_ref: locatorType === 'anchor' ? admission.chunk_ref : null,
        manual_label: null,
        quote_hash: admission.chunk_hash,
        start_offset: null,
        end_offset: null,
        page_number: null,
      },
      source_attribution_kind: admission.evidence_role === 'challenge' ? 'counter_evidence' : 'source_claim',
      source_statement: admission.source_statement.trim(),
      normalized_statement: admission.normalized_statement,
      interpretation_payload: admission.interpretation_payload,
      extraction_confidence: admission.extraction_confidence,
      review_status: 'machine_checked',
    };
  }

  private evidenceConvergenceLocatorType(
    refType: string,
  ): Extract<TopicSelectionEvidenceSourceLocator['locator_type'], 'abstract' | 'section' | 'paragraph' | 'anchor'> {
    const byRefType = {
      literature_abstract: 'abstract',
      fulltext_section: 'section',
      fulltext_paragraph: 'paragraph',
      fulltext_anchor: 'anchor',
    } as const;
    const locatorType = byRefType[refType as keyof typeof byRefType];
    if (!locatorType) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Unsupported convergence claim locator ${refType}.`);
    }
    return locatorType;
  }

  private evidenceClaimKey(input: Pick<
    TopicSelectionEvidenceMapEvidenceUnitInput,
    'evidence_role' | 'literature_ref' | 'locator' | 'source_statement' | 'normalized_statement'
  >): string {
    return sha256Text(stableStringify({
      evidence_role: input.evidence_role,
      literature_ref: input.literature_ref,
      locator_ref: input.locator.locator_ref,
      statement: (input.normalized_statement ?? input.source_statement).trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US'),
    }));
  }

  private requirePredecessorUnitKey(keys: Map<string, string>, evidenceUnitId: string): string {
    const key = keys.get(evidenceUnitId);
    if (!key) {
      throw new AppError(409, 'VERSION_CONFLICT', `Predecessor evidence structure references missing unit ${evidenceUnitId}.`);
    }
    return key;
  }

  private async recordEvidenceDelta(
    input: TopicSelectionPublishEvidenceConvergenceSuccessorInput,
    predecessor: TopicSelectionEvidenceMapRecord,
    searchRun: TopicSelectionSearchRunRecord,
    evidenceDelta: TopicSelectionEvidenceDeltaArtifact,
  ) {
    return this.controlPlane.recordEvidenceConvergenceArtifact({
      workspace_id: input.workspace_id ?? predecessor.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_run_id: searchRun.workflow_run_id ?? null,
      input_snapshot_id: searchRun.input_snapshot_id ?? null,
      artifact_type: 'evidence_delta',
      payload: evidenceDelta,
    });
  }

  private artifactRef(
    artifact: Awaited<ReturnType<TopicSelectionControlPlaneService['recordEvidenceConvergenceArtifact']>>,
    titleCardId: string,
  ): TopicSelectionFunctionalRef {
    return this.ref('artifact_ref', artifact.artifact_ref_id, titleCardId, artifact.checksum);
  }

  private buildTypedLinks(
    input: TopicSelectionCreateEvidenceMapFromSearchRunInput,
    evidenceMapId: string,
    evidenceMapVersion: string,
    unitKeyToRef: Map<string, TopicSelectionFunctionalRef>,
    createdAt: string,
  ): TopicSelectionEvidenceTypedLinkRecord[] {
    return (input.typed_links ?? []).map((link) => ({
      evidence_typed_link_id: this.idFactory('evidence_link'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_id: evidenceMapId,
      evidence_map_version: evidenceMapVersion,
      link_type: link.link_type,
      source_unit_ref: this.requireUnitKey(unitKeyToRef, link.source_unit_key),
      target_unit_ref: this.requireUnitKey(unitKeyToRef, link.target_unit_key),
      rationale: link.rationale ?? null,
      confidence: link.confidence ?? null,
      created_at: createdAt,
    }));
  }

  private buildClusters(
    input: TopicSelectionCreateEvidenceMapFromSearchRunInput,
    evidenceMapId: string,
    evidenceMapVersion: string,
    unitKeyToRef: Map<string, TopicSelectionFunctionalRef>,
    createdAt: string,
  ): TopicSelectionEvidenceClusterRecord[] {
    return (input.clusters ?? []).map((cluster) => ({
      evidence_cluster_id: this.idFactory('evidence_cluster'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_id: evidenceMapId,
      evidence_map_version: evidenceMapVersion,
      cluster_type: cluster.cluster_type,
      cluster_key: cluster.cluster_key,
      unit_refs: cluster.unit_keys.map((unitKey) => this.requireUnitKey(unitKeyToRef, unitKey)),
      label: cluster.label,
      rationale: cluster.rationale ?? null,
      confidence: cluster.confidence ?? null,
      created_at: createdAt,
    }));
  }

  private buildPatterns(
    input: TopicSelectionCreateEvidenceMapFromSearchRunInput,
    evidenceMapId: string,
    evidenceMapVersion: string,
    unitKeyToRef: Map<string, TopicSelectionFunctionalRef>,
    createdAt: string,
  ): TopicSelectionEvidencePatternRecord[] {
    return (input.patterns ?? []).map((pattern) => ({
      evidence_pattern_id: this.idFactory('evidence_pattern'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_id: evidenceMapId,
      evidence_map_version: evidenceMapVersion,
      pattern_type: pattern.pattern_type,
      evidence_role: pattern.evidence_role,
      unit_refs: pattern.unit_keys.map((unitKey) => this.requireUnitKey(unitKeyToRef, unitKey)),
      pattern_statement: pattern.pattern_statement,
      confidence: pattern.confidence ?? null,
      created_at: createdAt,
    }));
  }

  private buildConflictSets(
    input: TopicSelectionCreateEvidenceMapFromSearchRunInput,
    evidenceMapId: string,
    evidenceMapVersion: string,
    unitKeyToRef: Map<string, TopicSelectionFunctionalRef>,
    createdAt: string,
  ): TopicSelectionEvidenceConflictSetRecord[] {
    return (input.conflict_sets ?? []).map((conflict) => ({
      evidence_conflict_set_id: this.idFactory('evidence_conflict'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_id: evidenceMapId,
      evidence_map_version: evidenceMapVersion,
      conflict_type: conflict.conflict_type,
      severity: conflict.severity,
      support_unit_refs: (conflict.support_unit_keys ?? []).map((unitKey) => this.requireUnitKey(unitKeyToRef, unitKey)),
      challenge_unit_refs: (conflict.challenge_unit_keys ?? []).map((unitKey) => this.requireUnitKey(unitKeyToRef, unitKey)),
      baseline_unit_refs: (conflict.baseline_unit_keys ?? []).map((unitKey) => this.requireUnitKey(unitKeyToRef, unitKey)),
      context_unit_refs: (conflict.context_unit_keys ?? []).map((unitKey) => this.requireUnitKey(unitKeyToRef, unitKey)),
      issue_codes: conflict.issue_codes ?? [],
      created_at: createdAt,
    }));
  }

  private async validateEvidenceUnitInputs(
    units: TopicSelectionEvidenceMapEvidenceUnitInput[],
    coverageRows: TopicSelectionCoverageRowIntentRecord[],
    allowedRefs: Set<string>,
  ): Promise<void> {
    const coverageRowIds = new Set(coverageRows.map((row) => row.coverage_row_intent_id));
    for (const [unitIndex, unit] of units.entries()) {
      const unitPath = `evidence_units[${unitIndex}]`;
      if (!EVIDENCE_AUTHORITY_ATTRIBUTION_KINDS.has(unit.source_attribution_kind ?? 'source_claim')) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'LLM inference cannot be stored as an EvidenceUnit source claim.');
      }
      if (typeof unit.source_statement !== 'string' || unit.source_statement.trim().length === 0) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'EvidenceUnit source_statement cannot be empty.');
      }
      if (!unit.locator) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'EvidenceUnit requires a source locator.');
      }
      if (!unit.locator.source_ref) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'EvidenceUnit locator requires a source_ref.');
      }
      if (unit.coverage_row_intent_id && !coverageRowIds.has(unit.coverage_row_intent_id)) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `EvidenceUnit references coverage row outside SearchPlan: ${unit.coverage_row_intent_id}.`,
        );
      }
      this.assertAllowedEvidenceRef(unit.literature_ref, allowedRefs, `${unitPath}.literature_ref`);
      this.assertAllowedEvidenceRef(unit.locator.literature_ref, allowedRefs, `${unitPath}.locator.literature_ref`);
      for (const [sourceIndex, sourceRef] of (unit.source_refs ?? []).entries()) {
        this.assertAllowedEvidenceRef(sourceRef, allowedRefs, `${unitPath}.source_refs[${sourceIndex}]`);
      }
      this.assertAllowedEvidenceRef(unit.locator.source_ref, allowedRefs, `${unitPath}.locator.source_ref`);
      const primaryContentRef = this.primaryLocatorContentRef(unit.locator);
      if (primaryContentRef) {
        this.assertAllowedEvidenceRef(primaryContentRef, allowedRefs, `${unitPath}.locator.locator_ref`);
      }
      for (const field of ['content_ref', 'section_ref', 'paragraph_ref', 'anchor_ref'] as const) {
        const locatorRef = unit.locator[field];
        if (locatorRef) {
          this.assertAllowedEvidenceRef(locatorRef, allowedRefs, `${unitPath}.locator.${field}`);
        }
      }
      if (unit.locator.literature_ref.ref_id !== unit.literature_ref.ref_id) {
        throw new AppError(409, 'VERSION_CONFLICT', 'EvidenceUnit locator literature_ref must match unit literature_ref.');
      }
      await this.validateLiteratureLocator(unit);
    }
  }

  private primaryLocatorContentRef(locator: TopicSelectionEvidenceSourceLocator): TopicSelectionFunctionalRef | null {
    if (locator.locator_type === 'section' || locator.locator_type === 'paragraph' || locator.locator_type === 'anchor') {
      return locator.locator_ref;
    }
    return null;
  }

  private evidenceUnitSourceRefs(unit: TopicSelectionEvidenceMapEvidenceUnitInput): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...(unit.source_refs ?? []),
      unit.locator.source_ref,
      this.primaryLocatorContentRef(unit.locator),
      unit.locator.content_ref,
      unit.locator.document_ref,
      unit.locator.section_ref,
      unit.locator.paragraph_ref,
      unit.locator.anchor_ref,
    ]);
  }

  private async validateLiteratureLocator(unit: TopicSelectionEvidenceMapEvidenceUnitInput): Promise<void> {
    const literature = await this.literature.findLiteratureById(unit.literature_ref.ref_id);
    if (!literature) {
      throw new AppError(404, 'NOT_FOUND', `Literature ${unit.literature_ref.ref_id} not found.`);
    }
    const sources = await this.literature.listSourcesByLiteratureId(unit.literature_ref.ref_id);
    const sourceIds = new Set(sources.map((source) => source.id));
    for (const sourceRef of unit.source_refs ?? []) {
      if (sourceRef.ref_type === 'literature_source' && !sourceIds.has(sourceRef.ref_id)) {
        throw new AppError(404, 'NOT_FOUND', `Literature source ${sourceRef.ref_id} not found.`);
      }
    }
    const locator = unit.locator;
    if (locator.locator_type === 'abstract') {
      return;
    }
    if (locator.locator_type === 'manual') {
      if (!locator.manual_label && !locator.locator_ref.ref_id) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Manual EvidenceUnit locator requires a locator_ref or manual_label.');
      }
      return;
    }

    const documents = await this.literature.listFulltextDocumentsByLiteratureId(unit.literature_ref.ref_id);
    if (documents.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Section/paragraph/anchor EvidenceUnit locator requires fulltext document refs.');
    }
    if (locator.locator_type === 'section') {
      const sectionRef = locator.section_ref ?? locator.locator_ref;
      const exists = await this.fulltextSectionExists(documents.map((document) => document.id), sectionRef.ref_id);
      if (!exists) {
        throw new AppError(404, 'NOT_FOUND', `Fulltext section ${sectionRef.ref_id} not found.`);
      }
      return;
    }
    if (locator.locator_type === 'paragraph') {
      const paragraphRef = locator.paragraph_ref ?? locator.locator_ref;
      const exists = await this.fulltextParagraphExists(documents.map((document) => document.id), paragraphRef.ref_id);
      if (!exists) {
        throw new AppError(404, 'NOT_FOUND', `Fulltext paragraph ${paragraphRef.ref_id} not found.`);
      }
      return;
    }
    const anchorRef = locator.anchor_ref ?? locator.locator_ref;
    const exists = await this.fulltextAnchorExists(documents.map((document) => document.id), anchorRef.ref_id);
    if (!exists) {
      throw new AppError(404, 'NOT_FOUND', `Fulltext anchor ${anchorRef.ref_id} not found.`);
    }
  }

  private async fulltextSectionExists(documentIds: string[], sectionRefId: string): Promise<boolean> {
    for (const documentId of documentIds) {
      const sections = await this.literature.listFulltextSectionsByDocumentId(documentId);
      if (sections.some((section) => section.id === sectionRefId || section.sectionId === sectionRefId)) {
        return true;
      }
    }
    return false;
  }

  private async fulltextParagraphExists(documentIds: string[], paragraphRefId: string): Promise<boolean> {
    for (const documentId of documentIds) {
      const paragraphs = await this.literature.listFulltextParagraphsByDocumentId(documentId);
      if (paragraphs.some((paragraph) => paragraph.id === paragraphRefId || paragraph.paragraphId === paragraphRefId)) {
        return true;
      }
    }
    return false;
  }

  private async fulltextAnchorExists(documentIds: string[], anchorRefId: string): Promise<boolean> {
    for (const documentId of documentIds) {
      const anchors = await this.literature.listFulltextAnchorsByDocumentId(documentId);
      if (anchors.some((anchor) => anchor.id === anchorRefId || anchor.anchorId === anchorRefId)) {
        return true;
      }
    }
    return false;
  }

  private buildAllowedEvidenceRefs(
    searchRun: TopicSelectionSearchRunRecord,
    coverageBindings: TopicSelectionCoverageEvidenceBindingRecord[],
  ): Set<string> {
    const refs = new Set<string>();
    const inputRefs = [
      ...searchRun.evidence_map_input_refs,
      ...coverageBindings.flatMap((binding) => [binding.literature_ref, ...binding.source_refs]),
    ];
    for (const ref of inputRefs) {
      // Only optional title scope is equivalent at this admission boundary. Keep type,
      // ID and version exact, exclude foreign scopes, and never rewrite persisted refs.
      if (ref.title_card_id != null && ref.title_card_id !== searchRun.title_card_id) {
        continue;
      }
      refs.add(this.refKey({ ...ref, title_card_id: null }));
      refs.add(this.refKey({ ...ref, title_card_id: searchRun.title_card_id }));
    }
    return refs;
  }

  private assertAllowedEvidenceRef(ref: TopicSelectionFunctionalRef, allowedRefs: Set<string>, label: string): void {
    if (!allowedRefs.has(this.refKey(ref))) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${label} is outside SearchRun EvidenceMap input refs: ${JSON.stringify(ref)}.`,
        { field: label, rejected_ref: ref },
      );
    }
  }

  private evidenceMapBlockers(units: TopicSelectionEvidenceUnitRecord[]): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    if (units.length === 0) {
      blockers.push(this.blocker('EVIDENCE_UNIT_REQUIRED', 'EvidenceMap requires at least one EvidenceUnit.'));
    }
    if (units.some((unit) => unit.source_attribution_kind === 'llm_inference')) {
      blockers.push(this.blocker('LLM_INFERENCE_NOT_SOURCE_CLAIM', 'LLM inference cannot be source-claim authority.'));
    }
    return blockers;
  }

  private resolveRoleBundle(
    input: RoleBundleInput,
    unitById: Map<string, TopicSelectionEvidenceUnitRecord>,
  ): TopicSelectionEvidenceRoleBundle {
    const support = this.resolveUnitsForRole(input.support_unit_ids ?? [], 'support', unitById);
    const challenge = this.resolveUnitsForRole(input.challenge_unit_ids ?? [], 'challenge', unitById);
    const baseline = this.resolveUnitsForRole(input.baseline_unit_ids ?? [], 'baseline', unitById);
    const context = this.resolveUnitsForRole(input.context_unit_ids ?? [], 'context', unitById);
    return {
      support_unit_refs: support,
      challenge_unit_refs: challenge,
      baseline_unit_refs: baseline,
      context_unit_refs: context,
    };
  }

  private resolveUnitsForRole(
    unitIds: string[],
    role: EvidenceRole,
    unitById: Map<string, TopicSelectionEvidenceUnitRecord>,
  ): TopicSelectionFunctionalRef[] {
    return unitIds.map((unitId) => {
      const unit = unitById.get(unitId);
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', `EvidenceUnit ${unitId} not found.`);
      }
      if (unit.evidence_role !== role) {
        throw new AppError(409, 'VERSION_CONFLICT', `EvidenceUnit ${unitId} is ${unit.evidence_role}, not ${role}.`);
      }
      return this.ref('evidence_unit', unit.evidence_unit_id, unit.title_card_id, unit.evidence_map_version);
    });
  }

  private classifyEvidenceStrength(
    selectedUnits: TopicSelectionEvidenceUnitRecord[],
    mapFreshness: TopicSelectionEvidenceFreshnessStatus,
  ): TopicSelectionEvidenceStrengthVerdict {
    if (mapFreshness !== 'current') {
      return 'stale';
    }
    const supportUnits = selectedUnits.filter((unit) => unit.evidence_role === 'support');
    const challengeUnits = selectedUnits.filter((unit) => unit.evidence_role === 'challenge');
    if (supportUnits.length === 0) {
      return challengeUnits.length > 0 ? 'mixed' : 'insufficient';
    }
    if (challengeUnits.length > 0) {
      return 'mixed';
    }
    const nonAbstractSupportCount = supportUnits.filter((unit) => !unit.abstract_only).length;
    if (nonAbstractSupportCount === 0) {
      return 'weak_support';
    }
    return supportUnits.length >= 2 ? 'strong_support' : 'moderate_support';
  }

  private assessmentGapCodes(
    selectedUnits: TopicSelectionEvidenceUnitRecord[],
    roleBundle: TopicSelectionEvidenceRoleBundle,
    mapFreshness: TopicSelectionEvidenceFreshnessStatus,
  ): string[] {
    const codes = new Set<string>();
    if (mapFreshness !== 'current') {
      codes.add('EVIDENCE_MAP_STALE');
    }
    const supportUnits = selectedUnits.filter((unit) => unit.evidence_role === 'support');
    if (supportUnits.length === 0) {
      codes.add('SUPPORT_EVIDENCE_MISSING');
    }
    if (supportUnits.length > 0 && supportUnits.every((unit) => unit.abstract_only)) {
      codes.add('ABSTRACT_ONLY_SUPPORT');
    }
    if (roleBundle.context_unit_refs.length > 0 && roleBundle.support_unit_refs.length === 0) {
      codes.add('CONTEXT_NOT_SUPPORT');
    }
    return [...codes].sort();
  }

  private confidenceForVerdict(verdict: TopicSelectionEvidenceStrengthVerdict): number {
    switch (verdict) {
      case 'strong_support':
        return 0.82;
      case 'moderate_support':
        return 0.68;
      case 'weak_support':
      case 'mixed':
        return 0.45;
      case 'stale':
      case 'blocked':
      case 'insufficient':
        return 0.2;
    }
  }

  private assessmentCacheKey(input: {
    target_ref: TopicSelectionFunctionalRef;
    purpose: TopicSelectionEvidenceAssessmentPurpose;
    granularity: TopicSelectionEvidenceAssessmentGranularity;
    unit_refs: TopicSelectionFunctionalRef[];
    evidence_map_version: string;
    search_run_ref: TopicSelectionFunctionalRef;
    search_plan_ref: TopicSelectionFunctionalRef;
    policy_version_id: string | null;
    assessment_workflow_version: string;
  }): string {
    return sha256Text(stableStringify({
      assessment_workflow_version: input.assessment_workflow_version,
      evidence_map_version: input.evidence_map_version,
      granularity: input.granularity,
      policy_version_id: input.policy_version_id,
      purpose: input.purpose,
      search_plan_ref: input.search_plan_ref,
      search_run_ref: input.search_run_ref,
      target_ref: input.target_ref,
      unit_refs: this.sortedRefs(input.unit_refs),
    }));
  }

  private roleCounts(units: TopicSelectionEvidenceUnitRecord[]): {
    support_unit_count: number;
    challenge_unit_count: number;
    baseline_unit_count: number;
    context_unit_count: number;
  } {
    return {
      support_unit_count: units.filter((unit) => unit.evidence_role === 'support').length,
      challenge_unit_count: units.filter((unit) => unit.evidence_role === 'challenge').length,
      baseline_unit_count: units.filter((unit) => unit.evidence_role === 'baseline').length,
      context_unit_count: units.filter((unit) => unit.evidence_role === 'context').length,
    };
  }

  private sortedRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...refs].sort((left, right) => this.refKey(left).localeCompare(this.refKey(right)));
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const unique = new Map<string, TopicSelectionFunctionalRef>();
    for (const ref of refs) {
      if (ref) {
        unique.set(this.refKey(ref), ref);
      }
    }
    return this.sortedRefs([...unique.values()]);
  }

  private requireUnitKey(unitKeyToRef: Map<string, TopicSelectionFunctionalRef>, unitKey: string): TopicSelectionFunctionalRef {
    const unitRef = unitKeyToRef.get(unitKey);
    if (!unitRef) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unknown EvidenceUnit client key ${unitKey}.`);
    }
    return unitRef;
  }

  private async requireSearchRun(searchRunId: string): Promise<TopicSelectionSearchRunRecord> {
    const record = await this.searchResources.findSearchRunById(searchRunId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `SearchRun ${searchRunId} not found.`);
    }
    return record;
  }

  private async requireSearchPlan(searchPlanId: string): Promise<TopicSelectionSearchPlanRecord> {
    const record = await this.searchResources.findSearchPlanById(searchPlanId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `SearchPlan ${searchPlanId} not found.`);
    }
    return record;
  }

  private async requireEvidenceMap(evidenceMapId: string): Promise<TopicSelectionEvidenceMapRecord> {
    const record = await this.repository.findEvidenceMapById(evidenceMapId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `EvidenceMap ${evidenceMapId} not found.`);
    }
    return record;
  }

  private assertSameTitleCard(expected: string, actual: string, label: string): void {
    if (expected !== actual) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} belongs to a different title card.`);
    }
  }

  private assertTransitionPassed(result: string, label: string): void {
    if (result !== 'passed' && result !== 'passed_with_risk') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `${label} did not pass its readiness transition.`);
    }
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

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
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

  private versionFromId(id: string): string {
    const suffix = id.split('_').at(-1) ?? 'v1';
    return `v-${suffix}`;
  }

  /**
   * T-087 D1 read-only projection — list EvidenceMaps under a title-card.
   * Pure repository delegation; no decision-chain semantics changed.
   */
  async listEvidenceMapsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionEvidenceMapRecord[]> {
    return this.repository.listEvidenceMapsByTitleCardId(titleCardId);
  }

  /**
   * T-087 Phase 2.3 read-only projection — list EvidenceUnits for an
   * EvidenceMap so the reviewer workbench can drill into support / challenge
   * / baseline / context groups.
   */
  async listEvidenceUnitsByEvidenceMapId(
    evidenceMapId: string,
  ): Promise<TopicSelectionEvidenceUnitRecord[]> {
    return this.repository.listEvidenceUnitsByEvidenceMapId(evidenceMapId);
  }

  async listEvidenceStrengthAssessmentsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceStrengthAssessmentRecord[]> {
    return this.repository.listEvidenceStrengthAssessmentsByEvidenceMapId(evidenceMapId);
  }

  async listConflictSetsByEvidenceMapId(evidenceMapId: string): Promise<TopicSelectionEvidenceConflictSetRecord[]> {
    return this.repository.listConflictSetsByEvidenceMapId(evidenceMapId);
  }
}
