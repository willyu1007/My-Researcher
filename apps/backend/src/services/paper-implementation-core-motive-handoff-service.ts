import {
  PAPER_IMPLEMENTATION_CORE_MOTIVE_HANDOFF_RESUME_POLICY,
  PAPER_IMPLEMENTATION_CORE_MOTIVE_HANDOFF_SCHEMA_VERSION,
  type CoreMotiveBootstrapProposal,
  type CreatePaperImplementationCoreMotiveHandoffRequest,
  type ImplementationIntakeSnapshot,
  type ImplementationProject,
  type PaperImplementationCoreMotiveHandoffBlocker,
  type PaperImplementationCoreMotiveHandoffEffect,
  type PaperImplementationCoreMotiveHandoffResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CoreMotiveVersion,
  CreateCoreMotiveDraftRequest,
  MotiveAssertion,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import { stableStringify } from './literature-content-processing-utils.js';
import type {
  CoreMotiveBootstrapProposalRuntimeResult,
  PaperImplementationCoreMotiveBootstrapProposalService,
} from './paper-implementation-core-motive-bootstrap-proposal-service.js';
import type { PaperImplementationMotiveEvidenceBoardService } from './paper-implementation-motive-evidence-board-service.js';
import type { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';

type ProposalRuntime = Pick<
  PaperImplementationCoreMotiveBootstrapProposalService,
  'identity' | 'getOrCreate'
>;

type MotiveService = Pick<
  PaperImplementationMotiveEvidenceBoardService,
  'createCoreMotiveDraft' | 'admitCoreMotiveVersion'
>;

type TraceKernel = Pick<PaperImplementationTraceKernelService, 'ensureTraceManifest'>;

export interface PaperImplementationCoreMotiveHandoffServiceOptions {
  projectRepository: PaperImplementationRepository;
  motiveRepository: PaperImplementationMotiveRepository;
  proposalRuntime: ProposalRuntime;
  motiveService: MotiveService;
  traceKernel: TraceKernel;
}

interface OwnerContext {
  project: ImplementationProject;
  snapshot: ImplementationIntakeSnapshot;
  literatureRefs: TopicSelectionFunctionalRef[];
}

interface ResponseState {
  performed: PaperImplementationCoreMotiveHandoffEffect[];
  reused: PaperImplementationCoreMotiveHandoffEffect[];
  proposalRuntime: CoreMotiveBootstrapProposalRuntimeResult | null;
  version: CoreMotiveVersion | null;
  assertions: MotiveAssertion[];
  traceManifestId: string | null;
  admissionGateResultId: string | null;
}

export class PaperImplementationCoreMotiveHandoffService {
  private readonly inFlight = new Map<
    string,
    Promise<PaperImplementationCoreMotiveHandoffResponse>
  >();

  constructor(
    private readonly options: PaperImplementationCoreMotiveHandoffServiceOptions,
  ) {}

  async continue(
    request: CreatePaperImplementationCoreMotiveHandoffRequest,
  ): Promise<PaperImplementationCoreMotiveHandoffResponse> {
    const implementationProjectId = request.implementation_project_id?.trim();
    if (!implementationProjectId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const active = this.inFlight.get(implementationProjectId);
    if (active) {
      const result = await active;
      return result.status === 'blocked'
        ? structuredClone(result)
        : this.execute(implementationProjectId);
    }
    const execution = this.execute(implementationProjectId);
    this.inFlight.set(implementationProjectId, execution);
    try {
      return await execution;
    } finally {
      if (this.inFlight.get(implementationProjectId) === execution) {
        this.inFlight.delete(implementationProjectId);
      }
    }
  }

  private async execute(
    implementationProjectId: string,
  ): Promise<PaperImplementationCoreMotiveHandoffResponse> {
    const owner = await this.readOwner(implementationProjectId);
    const identity = this.options.proposalRuntime.identity(owner.project, owner.snapshot);
    const state: ResponseState = {
      performed: [],
      reused: [],
      proposalRuntime: null,
      version: null,
      assertions: [],
      traceManifestId: null,
      admissionGateResultId: null,
    };

    const primaryConflict = await this.primaryConflict(owner, identity.motiveId);
    if (primaryConflict) {
      return this.blocked(owner, state, 'admission', primaryConflict);
    }
    if (owner.literatureRefs.length === 0) {
      return this.blocked(owner, state, 'proposal', {
        code: 'CORE_MOTIVE_BOOTSTRAP_LITERATURE_EVIDENCE_REQUIRED',
        message: 'The accepted intake snapshot has no literature evidence ref that can support a complete CoreMotive trace.',
        source: 'bootstrap',
        retryable: false,
      });
    }

    const proposalRuntime = await this.options.proposalRuntime.getOrCreate(
      owner.project,
      owner.snapshot,
    );
    state.proposalRuntime = proposalRuntime;
    if (proposalRuntime.status === 'blocked' || !proposalRuntime.proposal || !proposalRuntime.artifact) {
      return this.blocked(owner, state, 'proposal', {
        code: proposalRuntime.blocker?.code ?? 'CORE_MOTIVE_BOOTSTRAP_PROPOSAL_BLOCKED',
        message: proposalRuntime.blocker?.message ?? 'CoreMotive bootstrap proposal is unavailable.',
        source: 'provider',
        retryable: proposalRuntime.blocker?.retryable ?? true,
      });
    }
    this.effect(state, 'proposal_artifact', proposalRuntime.status === 'created');

    const proposal = proposalRuntime.proposal;
    if (!proposal.assertions.some((assertion) => assertion.importance.role === 'core')) {
      return this.blocked(owner, state, 'motive_draft', {
        code: 'CORE_MOTIVE_BOOTSTRAP_CORE_ASSERTION_REQUIRED',
        message: 'The semantic proposal must contain at least one core assertion.',
        source: 'domain',
        retryable: false,
      });
    }
    const artifactHash = proposalRuntime.artifact.final_artifact_hash;
    if (!artifactHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Bootstrap proposal artifact is missing final_artifact_hash.');
    }
    const draftRequest = this.buildDraftRequest(
      owner,
      proposal,
      proposalRuntime.artifact.runtime_artifact_id,
      artifactHash,
      identity.motiveId,
      identity.coreMotiveVersionId,
      identity.bootstrapKey,
    );
    let version = await this.options.motiveRepository.findCoreMotiveVersionById(
      implementationProjectId,
      identity.coreMotiveVersionId,
    );
    let draftCreated = false;
    if (!version) {
      try {
        const draft = await this.options.motiveService.createCoreMotiveDraft(
          implementationProjectId,
          draftRequest,
        );
        version = draft.core_motive_version;
        state.assertions = draft.assertions;
        draftCreated = true;
      } catch (error) {
        if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') {
          throw error;
        }
        version = await this.options.motiveRepository.findCoreMotiveVersionById(
          implementationProjectId,
          identity.coreMotiveVersionId,
        );
        if (!version) throw error;
      }
    }
    state.version = version;
    state.assertions = state.assertions.length > 0
      ? state.assertions
      : await this.options.motiveRepository.listAssertionsByVersion(
        implementationProjectId,
        identity.coreMotiveVersionId,
      );
    this.assertExpectedDraft(version, state.assertions, draftRequest);
    this.effect(state, 'core_motive_draft', draftCreated);

    const traceManifestId = `trace_manifest_${identity.bootstrapKey.slice(0, 32)}`;
    const trace = await this.options.traceKernel.ensureTraceManifest(
      implementationProjectId,
      traceManifestId,
      {
        target_ref: this.ref(
          'core_motive_version',
          identity.coreMotiveVersionId,
          owner.project.title_card_id,
        ),
        lineage: {
          literature: {
            literature_evidence_refs: owner.literatureRefs,
            source_locator_refs: [],
            citation_candidate_refs: [],
          },
          experiment: {
            experiment_plan_refs: [],
            work_order_refs: [],
            run_refs: [],
            run_evidence_refs: [],
            result_packet_refs: [],
            metric_refs: [],
          },
          artifact: {
            dataset_refs: [],
            baseline_refs: [],
            code_version_refs: [],
            model_checkpoint_refs: [],
            config_refs: [],
            log_artifact_refs: [],
          },
          decision: {
            validation_cycle_refs: [],
            motive_evolution_decision_refs: [],
            gate_result_refs: [],
            human_decision_refs: this.humanJudgmentRefs(owner.snapshot),
            accepted_risk_refs: owner.snapshot.accepted_risk_refs,
          },
          internal_interpretation: {
            result_interpretation_refs: [],
            llm_rationale_refs: [],
            board_summary_refs: [],
            non_citable_refs: [],
          },
        },
        created_by: 'system',
      },
    );
    if (trace.manifest.trace_status !== 'complete') {
      return this.blocked(owner, state, 'trace', {
        code: 'CORE_MOTIVE_BOOTSTRAP_TRACE_INCOMPLETE',
        message: 'The deterministic CoreMotive trace is incomplete and cannot be admitted.',
        source: 'domain',
        retryable: false,
      });
    }
    state.traceManifestId = trace.manifest.trace_manifest_id;
    this.effect(state, 'trace_manifest', trace.created);

    const admissionGateResultId = `motive_admission_gate_${identity.bootstrapKey.slice(0, 32)}`;
    let admitted = version.version_status === 'admitted';
    if (!admitted) {
      try {
        const result = await this.options.motiveService.admitCoreMotiveVersion(
          implementationProjectId,
          identity.motiveId,
          identity.coreMotiveVersionId,
          {
            trace_manifest_id: traceManifestId,
            admission_gate_result_id: admissionGateResultId,
            portfolio_role: 'primary',
            confirmation_level: 'not_required',
            created_by: 'system',
          },
        );
        version = result.core_motive_version;
        state.version = version;
        state.assertions = result.assertions;
        admitted = true;
        this.effect(state, 'core_motive_admission', true);
      } catch (error) {
        if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') {
          throw error;
        }
        version = await this.options.motiveRepository.findCoreMotiveVersionById(
          implementationProjectId,
          identity.coreMotiveVersionId,
        );
        state.version = version;
        admitted = version?.version_status === 'admitted';
        if (!admitted) throw error;
        this.effect(state, 'core_motive_admission', false);
      }
    } else {
      this.effect(state, 'core_motive_admission', false);
    }
    if (!version || !admitted) {
      return this.blocked(owner, state, 'admission', {
        code: 'CORE_MOTIVE_BOOTSTRAP_ADMISSION_INCOMPLETE',
        message: 'CoreMotive admission did not produce an admitted version.',
        source: 'domain',
        retryable: true,
      });
    }
    state.admissionGateResultId = version.admission_gate_result_id ?? admissionGateResultId;
    await this.assertAdmittedPrimary(owner, identity.motiveId, identity.coreMotiveVersionId);
    return this.success(owner, state);
  }

  private async readOwner(implementationProjectId: string): Promise<OwnerContext> {
    const project = await this.options.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    const snapshot = await this.options.projectRepository.findIntakeSnapshotByProjectId(
      implementationProjectId,
    );
    if (!snapshot) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ImplementationProject has no persisted intake snapshot.');
    }
    if (
      project.lifecycle_status !== 'active'
      || project.freshness_status !== 'fresh'
      || project.source_status !== 'active'
      || snapshot.source_status !== 'active'
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CoreMotive bootstrap requires an active, fresh ImplementationProject and intake snapshot.',
      );
    }
    return {
      project,
      snapshot,
      literatureRefs: snapshot.source_refs.filter((ref) => this.isLiteratureRef(ref)),
    };
  }

  private buildDraftRequest(
    owner: OwnerContext,
    proposal: CoreMotiveBootstrapProposal,
    runtimeArtifactId: string,
    runtimeArtifactHash: string,
    motiveId: string,
    coreMotiveVersionId: string,
    bootstrapKey: string,
  ): CreateCoreMotiveDraftRequest {
    const topic = owner.snapshot.working_copy_payload;
    const unique = (values: string[]): string[] => [
      ...new Set(values.map((value) => value.trim()).filter(Boolean)),
    ];
    return {
      motive_id: motiveId,
      core_motive_version_id: coreMotiveVersionId,
      origin: {
        source_topic_package_id: owner.snapshot.topic_package_id,
        source_validated_need_ids: [],
        source_topic_question_contract_id: this.firstRefId(
          owner.snapshot.source_refs,
          'topicquestioncontract',
        ),
        created_from_motive_ids: [],
      },
      portfolio_role: 'parked',
      motive_contract: {
        ...proposal.motive_contract,
        motivation_claim: topic.contribution_summary,
        problem_pressure: topic.problem_statement,
        expected_contribution_path: topic.contribution_summary,
      },
      scope_contract: {
        ...proposal.scope_contract,
        excluded_scope: unique([
          ...proposal.scope_contract.excluded_scope,
          ...topic.prohibited_claims,
        ]),
        non_goals: unique([
          ...proposal.scope_contract.non_goals,
          ...topic.prohibited_claims,
        ]),
        evaluation_scope: topic.evaluation_plan,
      },
      boundary_to_upstream: {
        topic_question_contract_id: this.firstRefId(
          owner.snapshot.source_refs,
          'topicquestioncontract',
        ),
        within_upstream_boundary: true,
        boundary_risk_notes: unique([
          ...topic.conditions.flatMap((condition) => [
            condition.condition_code,
            condition.required_action.reason,
            ...condition.early_check_obligations,
          ]),
          ...owner.snapshot.early_check_obligations,
        ]),
        upstream_recheck_required: false,
      },
      falsification_contract: {
        ...proposal.falsification_contract,
        minimum_evidence_to_continue: unique([
          ...proposal.falsification_contract.minimum_evidence_to_continue,
          ...owner.snapshot.early_check_obligations,
        ]),
      },
      claim_boundary: {
        maximum_allowed_claim: topic.claim_ceiling,
        minimum_defensible_contribution_claim:
          proposal.claim_boundary.minimum_defensible_contribution_claim,
        forbidden_overclaims: unique(topic.prohibited_claims),
        claim_types_allowed: unique(proposal.claim_boundary.claim_types_allowed),
      },
      route_interface: proposal.route_interface,
      source_refs: [...owner.snapshot.source_refs],
      source_result_packet_refs: [],
      source_human_judgment_refs: this.humanJudgmentRefs(owner.snapshot),
      assertions: proposal.assertions.map((assertion, index) => ({
        ...assertion,
        assertion_id: `motive_assertion_${bootstrapKey.slice(0, 24)}_${index + 1}`,
        expected_initial_status: 'untested',
      })),
      hypothesis_only: true,
      policy_version_id: owner.project.policy_version_id ?? null,
      source_proposal_artifact_ref: this.ref(
        'paper_implementation_runtime_artifact',
        runtimeArtifactId,
        owner.project.title_card_id,
      ),
      source_proposal_artifact_hash: runtimeArtifactHash,
      created_by: 'system',
    };
  }

  private assertExpectedDraft(
    version: CoreMotiveVersion,
    assertions: MotiveAssertion[],
    request: CreateCoreMotiveDraftRequest,
  ): void {
    const expectedVersionSemantics = {
      motive_id: request.motive_id,
      core_motive_version_id: request.core_motive_version_id,
      motive_contract: request.motive_contract,
      scope_contract: request.scope_contract,
      boundary_to_upstream: {
        topic_question_contract_id:
          request.boundary_to_upstream?.topic_question_contract_id ?? null,
        research_slice_id: request.boundary_to_upstream?.research_slice_id ?? null,
        within_upstream_boundary:
          request.boundary_to_upstream?.within_upstream_boundary ?? true,
        boundary_risk_notes: request.boundary_to_upstream?.boundary_risk_notes ?? [],
        upstream_recheck_required:
          request.boundary_to_upstream?.upstream_recheck_required ?? false,
      },
      falsification_contract: request.falsification_contract,
      claim_boundary: request.claim_boundary,
      route_interface: {
        plausible_route_families: request.route_interface?.plausible_route_families ?? [],
        disallowed_route_families: request.route_interface?.disallowed_route_families ?? [],
        required_route_properties: request.route_interface?.required_route_properties ?? [],
        cheapest_validation_route_hint:
          request.route_interface?.cheapest_validation_route_hint ?? null,
      },
      source_refs: request.source_refs ?? [],
      source_result_packet_refs: request.source_result_packet_refs ?? [],
      source_human_judgment_refs: request.source_human_judgment_refs ?? [],
      hypothesis_only: request.hypothesis_only ?? false,
      policy_version_id: request.policy_version_id ?? null,
      source_proposal_artifact_ref: request.source_proposal_artifact_ref ?? null,
      source_proposal_artifact_hash: request.source_proposal_artifact_hash ?? null,
    };
    const actualVersionSemantics = {
      motive_id: version.motive_id,
      core_motive_version_id: version.core_motive_version_id,
      motive_contract: version.motive_contract,
      scope_contract: version.scope_contract,
      boundary_to_upstream: version.boundary_to_upstream,
      falsification_contract: version.falsification_contract,
      claim_boundary: version.claim_boundary,
      route_interface: version.route_interface,
      source_refs: version.source_refs,
      source_result_packet_refs: version.source_result_packet_refs,
      source_human_judgment_refs: version.source_human_judgment_refs,
      hypothesis_only: version.hypothesis_only,
      policy_version_id: version.policy_version_id,
      source_proposal_artifact_ref: version.source_proposal_artifact_ref,
      source_proposal_artifact_hash: version.source_proposal_artifact_hash,
    };
    const expectedAssertionSemantics = request.assertions.map((assertion) => ({
      assertion_id: assertion.assertion_id,
      assertion_type: assertion.assertion_type,
      assertion_text: assertion.assertion_text.trim(),
      importance: assertion.importance,
      validation_requirements: assertion.validation_requirements,
      falsification: assertion.falsification,
    }));
    const actualAssertionSemantics = assertions.map((assertion) => ({
      assertion_id: assertion.assertion_id,
      assertion_type: assertion.assertion_type,
      assertion_text: assertion.assertion_text,
      importance: assertion.importance,
      validation_requirements: assertion.validation_requirements,
      falsification: assertion.falsification,
    }));
    const matches = stableStringify(actualVersionSemantics)
        === stableStringify(expectedVersionSemantics)
      && stableStringify(actualAssertionSemantics)
        === stableStringify(expectedAssertionSemantics);
    if (!matches) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `CoreMotiveVersion ${version.core_motive_version_id} exists with different bootstrap semantics.`,
      );
    }
  }

  private async primaryConflict(
    owner: OwnerContext,
    expectedMotiveId: string,
  ): Promise<PaperImplementationCoreMotiveHandoffBlocker | null> {
    const set = await this.options.motiveRepository.findMotiveSet(
      owner.project.implementation_project_id,
    );
    if (
      !set
      || set.primary_motive_ids.length === 0
      || set.primary_motive_ids.every((motiveId) => motiveId === expectedMotiveId)
    ) {
      return null;
    }
    return {
      code: 'CORE_MOTIVE_BOOTSTRAP_PRIMARY_ALREADY_EXISTS',
      message: 'ImplementationProject already has a different primary CoreMotive; bootstrap will not replace scientific authority.',
      source: 'domain',
      retryable: false,
    };
  }

  private async assertAdmittedPrimary(
    owner: OwnerContext,
    motiveId: string,
    versionId: string,
  ): Promise<void> {
    const [motive, set] = await Promise.all([
      this.options.motiveRepository.findMotiveIdentityById(
        owner.project.implementation_project_id,
        motiveId,
      ),
      this.options.motiveRepository.findMotiveSet(owner.project.implementation_project_id),
    ]);
    if (
      !motive
      || motive.current_version_id !== versionId
      || motive.portfolio_role.role !== 'primary'
      || !set?.primary_motive_ids.includes(motiveId)
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Persisted CoreMotive admission does not reconcile to the expected first primary owner state.',
      );
    }
  }

  private success(
    owner: OwnerContext,
    state: ResponseState,
  ): PaperImplementationCoreMotiveHandoffResponse {
    const version = state.version;
    if (!version) throw new AppError(500, 'INTERNAL_ERROR', 'Missing admitted CoreMotiveVersion.');
    return {
      schema_version: PAPER_IMPLEMENTATION_CORE_MOTIVE_HANDOFF_SCHEMA_VERSION,
      status: state.performed.length > 0 ? 'created' : 'resumed',
      semantic_stage: 'core_motive_admitted',
      effects: this.effects(state),
      next_action: {
        action: 'continue_validation_planning',
        description: 'The first primary CoreMotive is admitted; validation planning may start in the downstream coordinator boundary.',
        requires_human_confirmation: false,
      },
      blocker: null,
      semantic_context: {
        topic: structuredClone(owner.snapshot.working_copy_payload),
        admitted_core_motive: {
          short_name: version.motive_contract.short_name,
          motivation_claim: version.motive_contract.motivation_claim,
          problem_pressure: version.motive_contract.problem_pressure,
          expected_contribution_path: version.motive_contract.expected_contribution_path,
          maximum_allowed_claim: version.claim_boundary.maximum_allowed_claim,
          forbidden_overclaims: [...version.claim_boundary.forbidden_overclaims],
          assertion_count: state.assertions.length,
        },
      },
      lineage: this.lineage(owner, state),
      resume_policy: PAPER_IMPLEMENTATION_CORE_MOTIVE_HANDOFF_RESUME_POLICY,
    };
  }

  private blocked(
    owner: OwnerContext,
    state: ResponseState,
    semanticStage: PaperImplementationCoreMotiveHandoffResponse['semantic_stage'],
    blocker: PaperImplementationCoreMotiveHandoffBlocker,
  ): PaperImplementationCoreMotiveHandoffResponse {
    return {
      schema_version: PAPER_IMPLEMENTATION_CORE_MOTIVE_HANDOFF_SCHEMA_VERSION,
      status: 'blocked',
      semantic_stage: semanticStage,
      effects: this.effects(state),
      next_action: {
        action: blocker.retryable ? 'repeat_handoff' : 'resolve_blocker',
        description: blocker.message,
        requires_human_confirmation: false,
      },
      blocker,
      semantic_context: {
        topic: structuredClone(owner.snapshot.working_copy_payload),
        admitted_core_motive: null,
      },
      lineage: this.lineage(owner, state),
      resume_policy: PAPER_IMPLEMENTATION_CORE_MOTIVE_HANDOFF_RESUME_POLICY,
    };
  }

  private lineage(
    owner: OwnerContext,
    state: ResponseState,
  ): PaperImplementationCoreMotiveHandoffResponse['lineage'] {
    return {
      implementation_project_id: owner.project.implementation_project_id,
      intake_snapshot_id: owner.snapshot.intake_snapshot_id,
      proposal_runtime_artifact_id: state.proposalRuntime?.artifact?.runtime_artifact_id ?? null,
      motive_id: state.version?.motive_id ?? null,
      core_motive_version_id: state.version?.core_motive_version_id ?? null,
      assertion_ids: state.assertions.map((assertion) => assertion.assertion_id),
      trace_manifest_id: state.traceManifestId,
      admission_gate_result_id: state.admissionGateResultId,
    };
  }

  private effects(state: ResponseState): PaperImplementationCoreMotiveHandoffResponse['effects'] {
    return {
      performed: [...new Set(state.performed)],
      reused: [...new Set(state.reused)],
    };
  }

  private effect(
    state: ResponseState,
    effect: PaperImplementationCoreMotiveHandoffEffect,
    performed: boolean,
  ): void {
    (performed ? state.performed : state.reused).push(effect);
  }

  private humanJudgmentRefs(snapshot: ImplementationIntakeSnapshot): TopicSelectionFunctionalRef[] {
    const refs = [
      ...snapshot.source_refs,
      ...snapshot.accepted_risk_refs,
      ...snapshot.condition_refs,
    ];
    return refs.filter((ref, index) => {
      const type = this.normalizedType(ref.ref_type);
      const isHuman = type.includes('human')
        || type.includes('promotiondecision')
        || type.includes('acceptedrisk')
        || type.includes('condition');
      return isHuman && refs.findIndex((item) => (
        item.ref_type === ref.ref_type && item.ref_id === ref.ref_id
      )) === index;
    });
  }

  private firstRefId(refs: TopicSelectionFunctionalRef[], normalizedType: string): string | null {
    return refs.find((ref) => this.normalizedType(ref.ref_type) === normalizedType)?.ref_id ?? null;
  }

  private isLiteratureRef(ref: TopicSelectionFunctionalRef): boolean {
    return [
      'evidenceunit',
      'literature',
      'literaturerecord',
      'literatureevidence',
    ].includes(this.normalizedType(ref.ref_type));
  }

  private normalizedType(refType: string): string {
    return refType.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private ref(refType: string, refId: string, titleCardId: string): TopicSelectionFunctionalRef {
    return { ref_type: refType, ref_id: refId, title_card_id: titleCardId };
  }
}
