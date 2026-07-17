import crypto from 'node:crypto';

import type {
  AgentWorkflowHarnessSpec,
  AgentWorkflowHarnessRun,
  CreateAgentWorkflowHarnessRunRequest,
  CreateAgentWorkflowHarnessRunResponse,
  CreateImplementationHarnessRequest,
  CreateImplementationInputSnapshotRequest,
  DecisionWorkQueueItem,
  ImplementationGateCheck,
  ImplementationGateResult,
  ImplementationHarness,
  ImplementationInputSnapshot,
  ImplementationProposalArtifact,
  ImplementationQualitySignal,
  ImplementationQualitySignalInput,
  ImplementationTransitionAttempt,
  ResolveDecisionWorkQueueItemRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { normalizedPaperImplementationRefType } from './paper-implementation-runtime-utils.js';
// T-124 G5 FIX-A item 11: single-source the memo/summary ref-type discipline
// from the dossier service (the exported set is the union of the former copies).
import { MEMO_OR_SUMMARY_REF_TYPES } from './paper-implementation-result-claim-dossier-service.js';
import type {
  PaperImplementationAiWorkflowHarnessRepository,
} from '../repositories/paper-implementation-ai-workflow-harness.repository.js';
import type {
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import type {
  PaperImplementationTraceRepository,
} from '../repositories/paper-implementation-trace.repository.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationAiWorkflowHarnessServiceOptions = {
  projectRepository: PaperImplementationRepository;
  traceRepository: PaperImplementationTraceRepository;
  harnessRepository: PaperImplementationAiWorkflowHarnessRepository;
  idFactory?: IdFactory;
  now?: () => string;
};

const TRACE_MANIFEST_REF_TYPES = new Set(['tracemanifest']);

export class PaperImplementationAiWorkflowHarnessService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly harnessRepository: PaperImplementationAiWorkflowHarnessRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationAiWorkflowHarnessServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.traceRepository = options.traceRepository;
    this.harnessRepository = options.harnessRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createImplementationHarness(
    implementationProjectId: string,
    request: CreateImplementationHarnessRequest,
  ): Promise<ImplementationHarness> {
    const project = await this.requireActiveProject(implementationProjectId);
    this.assertAllHarnessInvariantsEnabled(request.invariants);
    const now = this.now();
    const harness: ImplementationHarness = {
      harness_id: request.harness_id ?? this.idFactory('pi_harness'),
      implementation_project_id: project.implementation_project_id,
      harness_status: 'active',
      policy_pack: request.policy_pack,
      runtime_bindings: request.runtime_bindings,
      invariants: request.invariants,
      audit: {
        harness_run_refs: [],
        quality_signal_refs: [],
        evaluation_run_refs: [],
      },
      created_by: request.created_by ?? 'system',
      created_at: now,
      updated_at: now,
    };
    return this.harnessRepository.createHarness(harness);
  }

  async listImplementationHarnesses(
    implementationProjectId: string,
  ): Promise<ImplementationHarness[]> {
    await this.requireProject(implementationProjectId);
    return this.harnessRepository.listHarnesses(implementationProjectId);
  }

  async createImplementationInputSnapshot(
    implementationProjectId: string,
    request: CreateImplementationInputSnapshotRequest,
  ): Promise<ImplementationInputSnapshot> {
    const project = await this.requireActiveProject(implementationProjectId);
    this.assertInputSnapshotPolicy(request);
    const now = this.now();
    const snapshot: ImplementationInputSnapshot = {
      input_snapshot_id: request.input_snapshot_id ?? this.idFactory('pi_input_snapshot'),
      implementation_project_id: project.implementation_project_id,
      target_ref: request.target_ref,
      workflow_type: request.workflow_type,
      context_policy_version_id: request.context_policy_version_id,
      included_context: request.included_context,
      excluded_context: request.excluded_context,
      freshness_constraints: request.freshness_constraints,
      evidence_rules: request.evidence_rules,
      source_hashes: [...request.source_hashes],
      snapshot_hash: this.computeSnapshotHash(project.implementation_project_id, request),
      freshness_status: 'fresh',
      created_by: request.created_by ?? 'system',
      created_at: now,
    };
    return this.harnessRepository.createInputSnapshot(snapshot);
  }

  async listImplementationInputSnapshots(
    implementationProjectId: string,
  ): Promise<ImplementationInputSnapshot[]> {
    await this.requireProject(implementationProjectId);
    return this.harnessRepository.listInputSnapshots(implementationProjectId);
  }

  async createAgentWorkflowHarnessRun(
    implementationProjectId: string,
    request: CreateAgentWorkflowHarnessRunRequest,
  ): Promise<CreateAgentWorkflowHarnessRunResponse> {
    const project = await this.requireActiveProject(implementationProjectId);
    const harness = await this.harnessRepository.findHarnessById(
      project.implementation_project_id,
      request.harness_id,
    );
    if (!harness) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationHarness ${request.harness_id} not found.`);
    }
    if (harness.harness_status !== 'active') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ImplementationHarness must be active.');
    }
    const inputSnapshot = await this.harnessRepository.findInputSnapshotById(
      project.implementation_project_id,
      request.input_snapshot_id,
    );
    if (!inputSnapshot) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `ImplementationInputSnapshot ${request.input_snapshot_id} not found.`,
      );
    }

    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const targetRef = request.proposal_artifacts[0]?.target_ref ?? inputSnapshot.target_ref;
    const blockers = new Set<string>(request.blocked_reason_overrides ?? []);
    const warnings = new Set<string>();
    this.collectHarnessRunPolicyBlockers(request, harness, inputSnapshot, blockers, warnings);
    await this.collectProposalTraceBlockers(project, request.proposal_artifacts, blockers);
    this.collectMemoAsEvidenceBlockers(request, blockers);

    const gateResultId = this.idFactory('pi_gate_result');
    const transitionId = this.idFactory('pi_transition');
    const harnessRunId = request.harness_run_id ?? this.idFactory('pi_harness_run');
    const blockedReasons = [...blockers];
    const proposalStatus = blockedReasons.length > 0 ? 'blocked' : 'proposed';
    const proposalArtifacts = request.proposal_artifacts.map((proposal): ImplementationProposalArtifact => ({
      ...proposal,
      proposal_artifact_id: proposal.proposal_artifact_id ?? this.idFactory('pi_proposal_artifact'),
      implementation_project_id: project.implementation_project_id,
      harness_run_id: harnessRunId,
      artifact_ref: proposal.artifact_ref ?? null,
      proposal_status: proposalStatus,
      created_by: createdBy,
      created_at: createdAt,
    }));
    const generatedSignals = this.buildGeneratedQualitySignals({
      implementationProjectId: project.implementation_project_id,
      harnessRunId,
      targetRef,
      blockers: blockedReasons,
      policyVersionId: harness.policy_pack.context_policy_version_id,
      createdBy,
      createdAt,
    });
    const qualitySignals = [
      ...this.materializeQualitySignalCandidates(
        project.implementation_project_id,
        harnessRunId,
        request.quality_signal_candidates ?? [],
        createdBy,
        createdAt,
      ),
      ...generatedSignals,
    ];
    const gateChecks = this.buildGateChecks(blockedReasons, [...warnings]);
    const gateResult: ImplementationGateResult = {
      gate_result_id: gateResultId,
      implementation_project_id: project.implementation_project_id,
      gate_type: 'paper_implementation_agent_workflow_harness',
      target_ref: targetRef,
      result: blockedReasons.length > 0 ? 'blocked' : 'pass',
      checks: gateChecks,
      blockers: blockedReasons,
      warnings: [...warnings],
      accepted_risk_refs: [],
      required_actions: blockedReasons.length > 0
        ? ['resolve_decision_work_queue_before_authority_write']
        : [],
      policy_version_id: harness.policy_pack.context_policy_version_id,
      created_at: createdAt,
    };
    const runRef = this.functionalRef('agent_workflow_harness_run', harnessRunId);
    const gateRef = this.functionalRef('implementation_gate_result', gateResultId);
    const transitionAttempt: ImplementationTransitionAttempt = {
      transition_id: transitionId,
      implementation_project_id: project.implementation_project_id,
      transition_key: `agent_workflow_harness.${request.workflow_type}`,
      target_ref: targetRef,
      input_refs: [
        this.functionalRef('implementation_harness', harness.harness_id),
        this.functionalRef('implementation_input_snapshot', inputSnapshot.input_snapshot_id),
        request.raw_output_artifact_ref,
      ],
      output_refs: proposalArtifacts.map((proposal) =>
        this.functionalRef('implementation_proposal_artifact', proposal.proposal_artifact_id)),
      actor_type: createdBy,
      actor_id: null,
      transition_policy_version_id: harness.policy_pack.context_policy_version_id,
      context_policy_version_id: harness.policy_pack.context_policy_version_id,
      trace_policy_version_id: harness.policy_pack.trace_policy_version_id,
      gate_result_refs: [gateRef],
      outcome: blockedReasons.length > 0 ? 'blocked' : 'pass',
      blockers: blockedReasons,
      accepted_risk_refs: [],
      harness_run_refs: [runRef],
      trace_manifest_refs: this.uniqueTraceRefs(request.proposal_artifacts),
      created_at: createdAt,
    };
    const harnessRun: AgentWorkflowHarnessRun = {
      harness_run_id: harnessRunId,
      implementation_project_id: project.implementation_project_id,
      harness_id: harness.harness_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_type: request.workflow_type,
      workflow_version: request.workflow_version,
      run_mode: request.run_mode,
      execution_mode: request.execution_mode,
      model_profile_id: request.model_profile_id,
      prompt_template_version_id: request.prompt_template_version_id,
      output_schema_version_id: request.output_schema_version_id,
      raw_output_artifact_ref: request.raw_output_artifact_ref,
      parsed_output_artifact_ref: request.parsed_output_artifact_ref ?? null,
      schema_validation_status: this.hasSchemaFailure(blockedReasons) ? 'failed' : 'passed',
      reference_validation_status: this.hasReferenceFailure(blockedReasons) ? 'failed' : 'passed',
      trace_validation_status: this.hasTraceFailure(blockedReasons) ? 'failed' : 'passed',
      nl_field_role_validation_status: this.hasMemoFailure(blockedReasons) ? 'failed' : 'passed',
      memo_as_evidence_detected: request.memo_as_evidence_detected ?? false,
      direct_state_mutation_detected: (request.direct_authority_mutation_refs ?? []).length > 0,
      blocked_reasons: blockedReasons,
      run_status: blockedReasons.length > 0 ? 'blocked' : 'completed',
      proposal_artifact_ids: proposalArtifacts.map((proposal) => proposal.proposal_artifact_id),
      quality_signal_ids: qualitySignals.map((signal) => signal.quality_signal_id),
      gate_result_id: gateResult.gate_result_id,
      transition_attempt_id: transitionAttempt.transition_id,
      created_by: createdBy,
      created_at: createdAt,
    };
    const queueItems = blockedReasons.length > 0
      ? [this.buildQueueItem({
        implementationProjectId: project.implementation_project_id,
        harnessRunId,
        transitionKey: transitionAttempt.transition_key,
        targetRef,
        blockers: blockedReasons,
        policyVersionId: harness.policy_pack.context_policy_version_id,
        createdAt,
      })]
      : [];

    return this.harnessRepository.createAgentWorkflowHarnessRun({
      spec: request.spec,
      harness_run: harnessRun,
      proposal_artifacts: proposalArtifacts,
      quality_signals: qualitySignals,
      gate_result: gateResult,
      transition_attempt: transitionAttempt,
      queue_items: queueItems,
    });
  }

  async listAgentWorkflowHarnessRuns(
    implementationProjectId: string,
  ): Promise<AgentWorkflowHarnessRun[]> {
    await this.requireProject(implementationProjectId);
    return this.harnessRepository.listAgentWorkflowHarnessRuns(implementationProjectId);
  }

  async listImplementationProposalArtifacts(
    implementationProjectId: string,
  ): Promise<ImplementationProposalArtifact[]> {
    await this.requireProject(implementationProjectId);
    return this.harnessRepository.listProposalArtifacts(implementationProjectId);
  }

  async listDecisionWorkQueueItems(
    implementationProjectId: string,
  ): Promise<DecisionWorkQueueItem[]> {
    await this.requireProject(implementationProjectId);
    return this.harnessRepository.listDecisionWorkQueueItems(implementationProjectId);
  }

  async getDecisionWorkQueueItem(
    implementationProjectId: string,
    queueItemId: string,
  ): Promise<DecisionWorkQueueItem> {
    await this.requireProject(implementationProjectId);
    const item = await this.harnessRepository.findDecisionWorkQueueItemById(
      implementationProjectId,
      queueItemId,
    );
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', `DecisionWorkQueueItem ${queueItemId} not found.`);
    }
    return item;
  }

  async resolveDecisionWorkQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    request: ResolveDecisionWorkQueueItemRequest,
  ): Promise<DecisionWorkQueueItem> {
    await this.requireProject(implementationProjectId);
    return this.harnessRepository.resolveDecisionWorkQueueItem(
      implementationProjectId,
      queueItemId,
      {
        ...request,
        resolved_at: this.now(),
      },
    );
  }

  private async requireProject(implementationProjectId: string): Promise<ImplementationProject> {
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    return project;
  }

  private async requireActiveProject(implementationProjectId: string): Promise<ImplementationProject> {
    const project = await this.requireProject(implementationProjectId);
    if (project.lifecycle_status !== 'active') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ImplementationProject must be active.');
    }
    return project;
  }

  private assertAllHarnessInvariantsEnabled(
    invariants: CreateImplementationHarnessRequest['invariants'],
  ): void {
    const disabled = Object.entries(invariants)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);
    if (disabled.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ImplementationHarness invariants must all be enabled: ${disabled.join(', ')}.`,
      );
    }
  }

  private assertInputSnapshotPolicy(request: CreateImplementationInputSnapshotRequest): void {
    if (
      !request.freshness_constraints.exclude_stale_evidence
      || !request.freshness_constraints.exclude_invalidated_refs
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ImplementationInputSnapshot must exclude stale and invalidated refs.',
      );
    }
    if (
      !request.evidence_rules.memo_as_evidence_forbidden
      || !request.evidence_rules.citation_requires_source_locator
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ImplementationInputSnapshot must forbid memo-as-evidence and require source locators.',
      );
    }
    if (
      request.excluded_context.excluded_refs.length
      !== request.excluded_context.exclusion_reasons.length
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Excluded context refs and reasons must be aligned one-to-one.',
      );
    }
    const evidenceRefs = [
      ...request.included_context.evidence_binding_refs,
      ...request.included_context.run_evidence_refs,
    ];
    const memoEvidenceRef = evidenceRefs.find((ref) => this.isMemoLikeRef(ref));
    if (memoEvidenceRef) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Memo/summary ref ${memoEvidenceRef.ref_type}:${memoEvidenceRef.ref_id} cannot enter evidence-bearing input context.`,
      );
    }
  }

  private collectHarnessRunPolicyBlockers(
    request: CreateAgentWorkflowHarnessRunRequest,
    harness: ImplementationHarness,
    inputSnapshot: ImplementationInputSnapshot,
    blockers: Set<string>,
    warnings: Set<string>,
  ): void {
    if (!harness.invariants.require_input_snapshot) {
      blockers.add('harness_invariant_input_snapshot_disabled');
    }
    if (!harness.invariants.require_trace_manifest) {
      blockers.add('harness_invariant_trace_manifest_disabled');
    }
    if (!harness.invariants.require_artifact_refs) {
      blockers.add('harness_invariant_artifact_refs_disabled');
    }
    if (!harness.invariants.forbid_untraced_claims || !harness.invariants.forbid_memo_as_evidence) {
      blockers.add('harness_invariant_trace_or_memo_policy_disabled');
    }
    if (request.workflow_type !== inputSnapshot.workflow_type) {
      blockers.add('input_snapshot_workflow_type_mismatch');
    }
    this.collectInputSnapshotReferenceBlockers(request, inputSnapshot, blockers);
    this.collectSpecMismatchBlockers(request, request.spec, blockers);
    if (request.run_mode === 'mock') {
      if (request.execution_mode !== 'mocked_llm') {
        blockers.add('mock_run_mode_requires_mocked_llm_execution');
      }
      if (!request.model_profile_id.startsWith('mock.')) {
        blockers.add('mock_run_mode_requires_mock_model_profile');
      }
    }
    if (request.run_mode === 'product') {
      if (request.execution_mode === 'mocked_llm') {
        blockers.add('product_run_mode_rejects_mocked_llm_execution');
      }
      if (request.model_profile_id.startsWith('mock.')) {
        blockers.add('product_run_mode_rejects_mock_model_profile');
      }
    }
    if (request.proposal_artifacts.length === 0) {
      blockers.add('proposal_artifact_required');
    }
    if (request.direct_authority_mutation_refs && request.direct_authority_mutation_refs.length > 0) {
      blockers.add('direct_authority_mutation_forbidden');
    }
    if (!request.parsed_output_artifact_ref) {
      warnings.add('parsed_output_artifact_ref_missing');
    }
  }

  private collectInputSnapshotReferenceBlockers(
    request: CreateAgentWorkflowHarnessRunRequest,
    inputSnapshot: ImplementationInputSnapshot,
    blockers: Set<string>,
  ): void {
    const includedRefKeys = this.inputSnapshotIncludedRefKeys(inputSnapshot);
    const traceRefKeys = new Set(
      inputSnapshot.included_context.trace_manifest_refs.map((ref) => this.refKey(ref)),
    );
    const excludedRefKeys = new Set(
      inputSnapshot.excluded_context.excluded_refs.map((ref) => this.refKey(ref)),
    );

    for (const proposal of request.proposal_artifacts) {
      if (!this.sameFunctionalRef(proposal.target_ref, inputSnapshot.target_ref)) {
        blockers.add('proposal_target_ref_input_snapshot_mismatch');
      }
      for (const sourceRef of proposal.source_refs) {
        const sourceKey = this.refKey(sourceRef);
        if (excludedRefKeys.has(sourceKey)) {
          blockers.add('proposal_source_ref_excluded_by_input_snapshot');
        }
        if (!includedRefKeys.has(sourceKey)) {
          blockers.add('proposal_source_ref_not_in_input_snapshot');
        }
      }
      for (const traceRef of proposal.trace_manifest_refs) {
        const traceKey = this.refKey(traceRef);
        if (excludedRefKeys.has(traceKey)) {
          blockers.add('proposal_trace_manifest_ref_excluded_by_input_snapshot');
        }
        if (!traceRefKeys.has(traceKey)) {
          blockers.add('proposal_trace_manifest_ref_not_in_input_snapshot');
        }
      }
    }
  }

  private inputSnapshotIncludedRefKeys(inputSnapshot: ImplementationInputSnapshot): Set<string> {
    const groups: TopicSelectionFunctionalRef[][] = [
      inputSnapshot.included_context.motive_version_refs,
      inputSnapshot.included_context.board_version_refs,
      inputSnapshot.included_context.assertion_refs,
      inputSnapshot.included_context.evidence_binding_refs,
      inputSnapshot.included_context.route_refs,
      inputSnapshot.included_context.probe_refs,
      inputSnapshot.included_context.experiment_plan_refs,
      inputSnapshot.included_context.work_order_refs,
      inputSnapshot.included_context.run_evidence_refs,
      inputSnapshot.included_context.result_packet_refs,
      inputSnapshot.included_context.accepted_risk_refs,
      inputSnapshot.included_context.human_decision_refs,
      inputSnapshot.included_context.trace_manifest_refs,
    ];
    return new Set(groups.flat().map((ref) => this.refKey(ref)));
  }

  private collectSpecMismatchBlockers(
    request: CreateAgentWorkflowHarnessRunRequest,
    spec: AgentWorkflowHarnessSpec,
    blockers: Set<string>,
  ): void {
    if (spec.workflow_type !== request.workflow_type) {
      blockers.add('spec_workflow_type_mismatch');
    }
    if (spec.workflow_version !== request.workflow_version) {
      blockers.add('spec_workflow_version_mismatch');
    }
    if (!spec.input_policy.required_input_snapshot) {
      blockers.add('spec_input_snapshot_not_required');
    }
    if (spec.prompt_policy.prompt_template_version_id !== request.prompt_template_version_id) {
      blockers.add('spec_prompt_template_mismatch');
    }
    if (spec.prompt_policy.output_schema_version_id !== request.output_schema_version_id) {
      blockers.add('spec_output_schema_mismatch');
    }
    if (spec.model_policy.model_profile_id !== request.model_profile_id) {
      blockers.add('spec_model_profile_mismatch');
    }
    if (
      !spec.validation_policy.schema_validation
      || !spec.validation_policy.reference_validation
      || !spec.validation_policy.trace_validation
      || !spec.validation_policy.claim_boundary_validation
    ) {
      blockers.add('spec_required_validation_disabled');
    }
    if (
      !spec.audit_policy.save_prompt
      || !spec.audit_policy.save_input_snapshot
      || !spec.audit_policy.save_raw_output
      || !spec.audit_policy.save_parsed_output
      || !spec.audit_policy.save_validator_results
    ) {
      blockers.add('spec_required_audit_disabled');
    }
  }

  private async collectProposalTraceBlockers(
    project: ImplementationProject,
    proposals: CreateAgentWorkflowHarnessRunRequest['proposal_artifacts'],
    blockers: Set<string>,
  ): Promise<void> {
    for (const proposal of proposals) {
      if (!proposal.artifact_ref) {
        blockers.add('proposal_artifact_ref_required');
      }
      if (proposal.trace_manifest_refs.length === 0) {
        blockers.add('proposal_trace_manifest_required');
        continue;
      }
      for (const traceRef of proposal.trace_manifest_refs) {
        if (!TRACE_MANIFEST_REF_TYPES.has(this.normalizedRefType(traceRef))) {
          blockers.add('proposal_trace_manifest_ref_type_invalid');
          continue;
        }
        const manifest = await this.traceRepository.findTraceManifestById(
          project.implementation_project_id,
          traceRef.ref_id,
        );
        if (!manifest) {
          blockers.add('proposal_trace_manifest_missing');
          continue;
        }
        this.collectTraceManifestStatusBlockers(manifest, proposal.target_ref, blockers);
      }
    }
  }

  private collectTraceManifestStatusBlockers(
    manifest: TraceManifest,
    targetRef: TopicSelectionFunctionalRef,
    blockers: Set<string>,
  ): void {
    if (manifest.trace_status !== 'complete') {
      blockers.add(`proposal_trace_manifest_${manifest.trace_status}`);
    }
    if (!this.sameFunctionalRef(manifest.target_ref, targetRef)) {
      blockers.add('proposal_trace_manifest_target_mismatch');
    }
  }

  private collectMemoAsEvidenceBlockers(
    request: CreateAgentWorkflowHarnessRunRequest,
    blockers: Set<string>,
  ): void {
    if (request.memo_as_evidence_detected) {
      blockers.add('memo_as_evidence_detected');
    }
    for (const proposal of request.proposal_artifacts) {
      const memoSource = proposal.source_refs.find((ref) => this.isMemoLikeRef(ref));
      if (memoSource) {
        blockers.add('memo_or_summary_source_ref_forbidden');
      }
    }
  }

  private materializeQualitySignalCandidates(
    implementationProjectId: string,
    harnessRunId: string,
    candidates: ImplementationQualitySignalInput[],
    createdBy: TopicSelectionActorType,
    createdAt: string,
  ): ImplementationQualitySignal[] {
    return candidates.map((candidate): ImplementationQualitySignal => ({
      ...candidate,
      quality_signal_id: candidate.quality_signal_id ?? this.idFactory('pi_quality_signal'),
      implementation_project_id: implementationProjectId,
      harness_run_id: harnessRunId,
      payload: candidate.payload ?? {},
      policy_version_id: candidate.policy_version_id ?? null,
      created_by: createdBy,
      created_at: createdAt,
    }));
  }

  private buildGeneratedQualitySignals(input: {
    implementationProjectId: string;
    harnessRunId: string;
    targetRef: TopicSelectionFunctionalRef;
    blockers: string[];
    policyVersionId: string;
    createdBy: TopicSelectionActorType;
    createdAt: string;
  }): ImplementationQualitySignal[] {
    return input.blockers.map((blocker): ImplementationQualitySignal => ({
      quality_signal_id: this.idFactory('pi_quality_signal'),
      implementation_project_id: input.implementationProjectId,
      harness_run_id: input.harnessRunId,
      signal_type: this.blockerSignalType(blocker),
      severity: blocker.includes('direct_authority_mutation') ? 'critical' : 'error',
      target_ref: input.targetRef,
      summary: blocker,
      source_refs: [this.functionalRef('agent_workflow_harness_run', input.harnessRunId)],
      payload: { blocker_code: blocker },
      policy_version_id: input.policyVersionId,
      created_by: input.createdBy,
      created_at: input.createdAt,
    }));
  }

  private buildGateChecks(blockers: string[], warnings: string[]): ImplementationGateCheck[] {
    if (blockers.length === 0 && warnings.length === 0) {
      return [{
        check_id: 'proposal_only_trace_ready',
        check_name: 'Proposal-only output is trace-ready',
        result: 'pass',
        message: 'AI workflow harness output stayed proposal-only and trace-ready.',
        blocking: false,
      }];
    }
    return [
      ...blockers.map((blocker): ImplementationGateCheck => ({
        check_id: blocker,
        check_name: blocker,
        result: 'fail',
        message: blocker,
        blocking: true,
      })),
      ...warnings.map((warning): ImplementationGateCheck => ({
        check_id: warning,
        check_name: warning,
        result: 'warning',
        message: warning,
        blocking: false,
      })),
    ];
  }

  private buildQueueItem(input: {
    implementationProjectId: string;
    harnessRunId: string;
    transitionKey: string;
    targetRef: TopicSelectionFunctionalRef;
    blockers: string[];
    policyVersionId: string;
    createdAt: string;
  }): DecisionWorkQueueItem {
    const queueType = this.queueTypeForBlockers(input.blockers);
    return {
      queue_item_id: this.idFactory('pi_decision_queue_item'),
      implementation_project_id: input.implementationProjectId,
      queue_type: queueType,
      stage: 'agent_workflow_harness_validation',
      target_ref: input.targetRef,
      priority: input.blockers.some((blocker) => blocker.includes('direct_authority_mutation'))
        ? 'critical'
        : 'high',
      status: 'open',
      blocking_transition_keys: [input.transitionKey],
      dedup_key: [
        'agent_workflow_harness',
        input.transitionKey,
        queueType,
        this.refKey(input.targetRef),
        ...[...input.blockers].sort(),
      ].join(':'),
      allowed_handlers: ['human', 'system'],
      recommended_actions: ['inspect_harness_output', 'repair_trace_or_context', 'rerun_after_gate_fix'],
      created_from_refs: [this.functionalRef('agent_workflow_harness_run', input.harnessRunId)],
      policy_version_id: input.policyVersionId,
      retry_count: 0,
      retry_budget: 1,
      cooldown_until: null,
      // Harness-lane items have no coordinator lineage; resolve re_advance
      // is a no-op for them (W4).
      source_coordinator_run_ref: null,
      source_step_index: null,
      resolved_at: null,
      created_at: input.createdAt,
      updated_at: input.createdAt,
    };
  }

  private queueTypeForBlockers(blockers: string[]): DecisionWorkQueueItem['queue_type'] {
    if (blockers.some((blocker) => blocker.includes('trace'))) {
      return 'trace_repair';
    }
    if (blockers.some((blocker) => blocker.includes('run_mode'))) {
      return 'failed_workflow';
    }
    return 'gate_blocker';
  }

  private blockerSignalType(blocker: string): ImplementationQualitySignal['signal_type'] {
    if (blocker.includes('trace')) {
      return 'trace_failure';
    }
    if (blocker.includes('memo')) {
      return 'memo_as_evidence';
    }
    if (blocker.includes('direct_authority_mutation')) {
      return 'forbidden_state_mutation';
    }
    if (blocker.includes('run_mode')) {
      return 'run_mode_isolation_failure';
    }
    if (blocker.includes('spec') || blocker.includes('proposal_artifact')) {
      return 'schema_failure';
    }
    if (blocker.includes('ref') || blocker.includes('snapshot')) {
      return 'reference_failure';
    }
    return 'gate_blocker';
  }

  private hasSchemaFailure(blockers: string[]): boolean {
    return blockers.some((blocker) =>
      blocker.includes('spec')
      || blocker.includes('schema')
      || blocker.includes('proposal_artifact'));
  }

  private hasReferenceFailure(blockers: string[]): boolean {
    return blockers.some((blocker) =>
      blocker.includes('ref')
      || blocker.includes('snapshot')
      || blocker.includes('target_mismatch'));
  }

  private hasTraceFailure(blockers: string[]): boolean {
    return blockers.some((blocker) => blocker.includes('trace'));
  }

  private hasMemoFailure(blockers: string[]): boolean {
    return blockers.some((blocker) => blocker.includes('memo') || blocker.includes('summary'));
  }

  private uniqueTraceRefs(
    proposals: CreateAgentWorkflowHarnessRunRequest['proposal_artifacts'],
  ): TopicSelectionFunctionalRef[] {
    const refs = new Map<string, TopicSelectionFunctionalRef>();
    for (const proposal of proposals) {
      for (const ref of proposal.trace_manifest_refs) {
        refs.set(this.refKey(ref), ref);
      }
    }
    return [...refs.values()];
  }

  private computeSnapshotHash(
    implementationProjectId: string,
    request: CreateImplementationInputSnapshotRequest,
  ): string {
    const hashInput = {
      implementation_project_id: implementationProjectId,
      target_ref: request.target_ref,
      workflow_type: request.workflow_type,
      context_policy_version_id: request.context_policy_version_id,
      included_context: request.included_context,
      excluded_context: request.excluded_context,
      freshness_constraints: request.freshness_constraints,
      evidence_rules: request.evidence_rules,
      source_hashes: request.source_hashes,
    };
    return `sha256:${crypto.createHash('sha256').update(stableStringify(hashInput)).digest('hex')}`;
  }

  private functionalRef(refType: string, refId: string): TopicSelectionFunctionalRef {
    return { ref_type: refType, ref_id: refId };
  }

  private isMemoLikeRef(ref: TopicSelectionFunctionalRef): boolean {
    return MEMO_OR_SUMMARY_REF_TYPES.has(this.normalizedRefType(ref));
  }

  private normalizedRefType(ref: TopicSelectionFunctionalRef): string {
    return normalizedPaperImplementationRefType(ref.ref_type);
  }

  private sameFunctionalRef(a: TopicSelectionFunctionalRef, b: TopicSelectionFunctionalRef): boolean {
    return this.normalizedRefType(a) === this.normalizedRefType(b)
      && a.ref_id === b.ref_id
      && (a.version_id ?? null) === (b.version_id ?? null);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      this.normalizedRefType(ref),
      ref.ref_id,
      ref.version_id ?? '',
    ].join(':');
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}
