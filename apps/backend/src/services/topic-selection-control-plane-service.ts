import crypto from 'node:crypto';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type {
  TopicSelectionActorRef,
  TopicSelectionActorType,
  TopicSelectionArtifactKind,
  TopicSelectionArtifactRefRecord,
  TopicSelectionArtifactStorageKind,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalLineageLinkRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
  TopicSelectionGateVerdict,
  TopicSelectionHumanConfirmedDecisionRecord,
  TopicSelectionHumanDecisionType,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLineageRelationType,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionQualitySignalRecord,
  TopicSelectionQualitySignalVerdict,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionStateWriteIntent,
  TopicSelectionTraceSnapshotRecord,
  TopicSelectionTransitionResult,
  TopicSelectionWorkflowRunStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionControlPlaneRepository } from '../repositories/topic-selection-control-plane.repository.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
};

type CompileInputSnapshotInput = {
  input_snapshot_id?: string;
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  source_refs?: TopicSelectionFunctionalRef[];
  permission_refs?: TopicSelectionFunctionalRef[];
  payload?: Record<string, unknown>;
  context_policy_version_id?: string | null;
  policy_version?: string | null;
  created_by?: TopicSelectionActorType;
};

type ArtifactInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  artifact_kind: TopicSelectionArtifactKind;
  storage_kind?: TopicSelectionArtifactStorageKind;
  uri?: string | null;
  payload?: Record<string, unknown> | null;
  checksum?: string | null;
  byte_size?: number | null;
  mime_type?: string | null;
  workflow_run_id?: string | null;
  input_snapshot_id?: string | null;
  created_by?: TopicSelectionActorType;
};

type RecordWorkflowRunInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  workflow_key: string;
  workflow_profile_key: string;
  workflow_profile_version?: string | null;
  input_snapshot_id?: string | null;
  status?: TopicSelectionWorkflowRunStatus;
  provider_id?: string | null;
  model_id?: string | null;
  prompt_template_id?: string | null;
  prompt_template_version?: string | null;
  started_at?: string;
  finished_at?: string | null;
  telemetry?: Record<string, unknown>;
  output_summary?: Record<string, unknown>;
  error_code?: string | null;
  error_message?: string | null;
  created_by?: TopicSelectionActorType;
  artifacts?: ArtifactInput[];
};

type RecordWorkflowRunResult = {
  workflow_run: TopicSelectionLlmWorkflowRunRecord;
  artifact_refs: TopicSelectionArtifactRefRecord[];
};

type DeterministicGateInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  gate_key: string;
  target_ref: TopicSelectionFunctionalRef;
  input_snapshot_id?: string | null;
  workflow_run_id?: string | null;
  policy_version_id?: string | null;
  verdict?: TopicSelectionGateVerdict;
  blockers?: TopicSelectionGateIssue[];
  warnings?: TopicSelectionGateIssue[];
  required_actions?: string[];
  loopback_target?: TopicSelectionFunctionalRef | null;
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  quality_signal_refs?: TopicSelectionFunctionalRef[];
  created_by?: TopicSelectionActorType;
};

type EmitQualitySignalInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  stage: string;
  check_type: string;
  verdict: TopicSelectionQualitySignalVerdict;
  issue_codes?: string[];
  recommended_action?: string | null;
  blocking_transition_keys?: string[];
  refs?: TopicSelectionFunctionalRef[];
  confidence?: number | null;
  workflow_run_id?: string | null;
  artifact_refs?: TopicSelectionFunctionalRef[];
  emitted_by?: TopicSelectionActorType;
};

type HumanDecisionInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  decision_type: TopicSelectionHumanDecisionType;
  actor: TopicSelectionActorRef;
  rationale?: string | null;
  artifact_refs?: TopicSelectionFunctionalRef[];
  policy_version_id?: string | null;
  resulting_authority_refs?: TopicSelectionFunctionalRef[];
};

type LineageInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  source_ref: TopicSelectionFunctionalRef;
  target_ref: TopicSelectionFunctionalRef;
  relation_type: TopicSelectionLineageRelationType;
  artifact_refs?: TopicSelectionFunctionalRef[];
  created_by?: TopicSelectionActorType;
};

type TraceSnapshotInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  object_refs?: TopicSelectionFunctionalRef[];
  lineage_link_refs?: TopicSelectionFunctionalRef[];
  artifact_refs?: TopicSelectionFunctionalRef[];
  quality_signal_refs?: TopicSelectionFunctionalRef[];
  transition_attempt_refs?: TopicSelectionFunctionalRef[];
  payload?: Record<string, unknown>;
  created_by?: TopicSelectionActorType;
};

type TransitionAttemptInput = {
  workspace_id?: string | null;
  title_card_id?: string | null;
  transition_key: string;
  source_ref: TopicSelectionFunctionalRef;
  target_ref?: TopicSelectionFunctionalRef | null;
  gate_result_id?: string | null;
  workflow_run_id?: string | null;
  input_snapshot_id?: string | null;
  policy_version_id?: string | null;
  actor: TopicSelectionActorRef;
  reason?: string;
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  human_decision_refs?: TopicSelectionFunctionalRef[];
  state_write_intents?: TopicSelectionStateWriteIntent[];
  created_authority_refs?: TopicSelectionFunctionalRef[];
  allow_audit_authority_refs_on_blocked?: boolean;
};

export class TopicSelectionControlPlaneService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(
    private readonly repository: TopicSelectionControlPlaneRepository,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async compileInputSnapshot(input: CompileInputSnapshotInput): Promise<TopicSelectionInputSnapshotRecord> {
    const sourceRefs = input.source_refs ?? [];
    const permissionRefs = input.permission_refs ?? [];
    const payload = input.payload ?? {};
    const snapshotHash = sha256Text(stableStringify({
      context_policy_version_id: input.context_policy_version_id ?? null,
      payload,
      permission_refs: permissionRefs,
      policy_version: input.policy_version ?? null,
      source_refs: sourceRefs,
      target_ref: input.target_ref,
    }));
    const persisted = await this.repository.createInputSnapshot({
      input_snapshot_id: input.input_snapshot_id ?? this.idFactory('input_snapshot'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      target_ref: input.target_ref,
      context_policy_version_id: input.context_policy_version_id ?? null,
      policy_version: input.policy_version ?? null,
      snapshot_hash: snapshotHash,
      source_refs: sourceRefs,
      permission_refs: permissionRefs,
      payload,
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    });
    if (persisted.snapshot_hash !== snapshotHash) {
      throw new Error(`InputSnapshot ${persisted.input_snapshot_id} already identifies different content.`);
    }
    return persisted;
  }

  async getInputSnapshot(inputSnapshotId: string): Promise<TopicSelectionInputSnapshotRecord | null> {
    return this.repository.findInputSnapshotById(inputSnapshotId);
  }

  async recordArtifactRef(input: ArtifactInput): Promise<TopicSelectionArtifactRefRecord> {
    return this.repository.createArtifactRef(this.buildArtifactRefRecord(input));
  }

  async getArtifactRef(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null> {
    return this.repository.findArtifactRefById(artifactRefId);
  }

  async listArtifactRefsByWorkflowRunId(workflowRunId: string): Promise<TopicSelectionArtifactRefRecord[]> {
    return this.repository.listArtifactRefsByWorkflowRunId(workflowRunId);
  }

  async recordWorkflowRun(input: RecordWorkflowRunInput): Promise<RecordWorkflowRunResult> {
    const now = this.now();
    const status = input.status ?? 'succeeded';
    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: this.idFactory('workflow_run'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_key: input.workflow_key,
      workflow_profile_key: input.workflow_profile_key,
      workflow_profile_version: input.workflow_profile_version ?? null,
      input_snapshot_id: input.input_snapshot_id ?? null,
      status,
      provider_id: input.provider_id ?? null,
      model_id: input.model_id ?? null,
      prompt_template_id: input.prompt_template_id ?? null,
      prompt_template_version: input.prompt_template_version ?? null,
      started_at: input.started_at ?? now,
      finished_at: input.finished_at ?? (status === 'queued' || status === 'running' ? null : now),
      telemetry: input.telemetry ?? {},
      output_summary: input.output_summary ?? {},
      error_code: input.error_code ?? null,
      error_message: input.error_message ?? null,
      created_by: input.created_by ?? 'system',
    };
    const artifactRefs = (input.artifacts ?? []).map((artifact) => this.buildArtifactRefRecord({
      ...artifact,
      workspace_id: artifact.workspace_id ?? input.workspace_id ?? null,
      title_card_id: artifact.title_card_id ?? input.title_card_id ?? null,
      workflow_run_id: workflowRun.workflow_run_id,
      input_snapshot_id: artifact.input_snapshot_id ?? input.input_snapshot_id ?? null,
      created_by: artifact.created_by ?? input.created_by ?? 'system',
    }));

    return this.repository.createWorkflowRunWithArtifactRefs(workflowRun, artifactRefs);
  }

  async updateWorkflowRun(
    workflowRunId: string,
    patch: Partial<Omit<TopicSelectionLlmWorkflowRunRecord, 'workflow_run_id' | 'started_at' | 'created_by'>>,
  ): Promise<TopicSelectionLlmWorkflowRunRecord> {
    return this.repository.updateWorkflowRun(workflowRunId, patch);
  }

  async runDeterministicGate(input: DeterministicGateInput): Promise<TopicSelectionReadinessGateResultRecord> {
    const blockers = input.blockers ?? [];
    if (blockers.length > 0 && input.verdict && input.verdict !== 'block') {
      throw new Error('Readiness gate verdict must be block when blockers are present.');
    }
    const verdict = blockers.length > 0 ? 'block' : input.verdict ?? 'pass';
    return this.repository.createReadinessGateResult({
      readiness_gate_result_id: this.idFactory('gate_result'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      gate_key: input.gate_key,
      target_ref: input.target_ref,
      input_snapshot_id: input.input_snapshot_id ?? null,
      workflow_run_id: input.workflow_run_id ?? null,
      policy_version_id: input.policy_version_id ?? null,
      verdict,
      blockers,
      warnings: input.warnings ?? [],
      required_actions: input.required_actions ?? [],
      loopback_target: input.loopback_target ?? null,
      accepted_risk_refs: input.accepted_risk_refs ?? [],
      quality_signal_refs: input.quality_signal_refs ?? [],
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    });
  }

  private buildArtifactRefRecord(input: ArtifactInput): TopicSelectionArtifactRefRecord {
    const payloadText = input.payload === null || input.payload === undefined ? null : stableStringify(input.payload);
    return {
      artifact_ref_id: this.idFactory('artifact_ref'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: input.artifact_kind,
      storage_kind: input.storage_kind ?? (input.uri ? 'uri' : 'inline'),
      uri: input.uri ?? null,
      payload: input.payload ?? null,
      checksum: input.checksum ?? (payloadText ? sha256Text(payloadText) : null),
      byte_size: input.byte_size ?? (payloadText ? Buffer.byteLength(payloadText, 'utf8') : null),
      mime_type: input.mime_type ?? (payloadText ? 'application/json' : null),
      workflow_run_id: input.workflow_run_id ?? null,
      input_snapshot_id: input.input_snapshot_id ?? null,
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    };
  }

  async emitQualitySignal(input: EmitQualitySignalInput): Promise<TopicSelectionQualitySignalRecord> {
    return this.repository.createQualitySignal({
      quality_signal_id: this.idFactory('quality_signal'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      target_ref: input.target_ref,
      stage: input.stage,
      check_type: input.check_type,
      verdict: input.verdict,
      issue_codes: input.issue_codes ?? [],
      recommended_action: input.recommended_action ?? null,
      blocking_transition_keys: input.blocking_transition_keys ?? [],
      refs: input.refs ?? [],
      confidence: input.confidence ?? null,
      workflow_run_id: input.workflow_run_id ?? null,
      artifact_refs: input.artifact_refs ?? [],
      emitted_by: input.emitted_by ?? 'system',
      created_at: this.now(),
    });
  }

  async getQualitySignal(qualitySignalId: string): Promise<TopicSelectionQualitySignalRecord | null> {
    return this.repository.findQualitySignalById(qualitySignalId);
  }

  async getReadinessGateResult(
    readinessGateResultId: string,
  ): Promise<TopicSelectionReadinessGateResultRecord | null> {
    return this.repository.findReadinessGateResultById(readinessGateResultId);
  }

  async getWorkflowRun(workflowRunId: string): Promise<TopicSelectionLlmWorkflowRunRecord | null> {
    return this.repository.findWorkflowRunById(workflowRunId);
  }

  async getTraceSnapshot(traceSnapshotId: string): Promise<TopicSelectionTraceSnapshotRecord | null> {
    return this.repository.findTraceSnapshotById(traceSnapshotId);
  }

  async getHumanDecision(
    humanConfirmedDecisionId: string,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord | null> {
    return this.repository.findHumanConfirmedDecisionById(humanConfirmedDecisionId);
  }

  async listHumanDecisionsByTargetRef(
    targetRef: TopicSelectionFunctionalRef,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord[]> {
    return this.repository.listHumanConfirmedDecisionsByTargetRef({
      ref_type: targetRef.ref_type,
      ref_id: targetRef.ref_id,
    });
  }

  async recordHumanDecision(input: HumanDecisionInput): Promise<TopicSelectionHumanConfirmedDecisionRecord> {
    return this.repository.createHumanConfirmedDecision({
      human_confirmed_decision_id: this.idFactory('human_decision'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      target_ref: input.target_ref,
      decision_type: input.decision_type,
      actor: input.actor,
      rationale: input.rationale ?? null,
      artifact_refs: input.artifact_refs ?? [],
      policy_version_id: input.policy_version_id ?? null,
      resulting_authority_refs: input.resulting_authority_refs ?? [],
      created_at: this.now(),
    });
  }

  async linkLineage(input: LineageInput): Promise<TopicSelectionFunctionalLineageLinkRecord> {
    return this.repository.createFunctionalLineageLink({
      functional_lineage_link_id: this.idFactory('lineage_link'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? input.source_ref.title_card_id ?? null,
      source_ref: input.source_ref,
      target_ref: input.target_ref,
      relation_type: input.relation_type,
      artifact_refs: input.artifact_refs ?? [],
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    });
  }

  async buildTraceSnapshot(input: TraceSnapshotInput): Promise<TopicSelectionTraceSnapshotRecord> {
    const payload = input.payload ?? {};
    const objectRefs = input.object_refs ?? [];
    const lineageLinkRefs = input.lineage_link_refs ?? [];
    const artifactRefs = input.artifact_refs ?? [];
    const qualitySignalRefs = input.quality_signal_refs ?? [];
    const transitionAttemptRefs = input.transition_attempt_refs ?? [];
    const snapshotHash = sha256Text(stableStringify({
      artifact_refs: artifactRefs,
      lineage_link_refs: lineageLinkRefs,
      object_refs: objectRefs,
      payload,
      quality_signal_refs: qualitySignalRefs,
      target_ref: input.target_ref,
      transition_attempt_refs: transitionAttemptRefs,
    }));
    return this.repository.createTraceSnapshot({
      trace_snapshot_id: this.idFactory('trace_snapshot'),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? input.target_ref.title_card_id ?? null,
      target_ref: input.target_ref,
      snapshot_hash: snapshotHash,
      object_refs: objectRefs,
      lineage_link_refs: lineageLinkRefs,
      artifact_refs: artifactRefs,
      quality_signal_refs: qualitySignalRefs,
      transition_attempt_refs: transitionAttemptRefs,
      payload,
      created_by: input.created_by ?? 'system',
      created_at: this.now(),
    });
  }

  async attemptTransition(input: TransitionAttemptInput): Promise<TopicSelectionChainTransitionAttemptRecord> {
    if (!input.gate_result_id) {
      throw new Error('Transition attempts require a readiness gate result.');
    }
    const gateResult = await this.repository.findReadinessGateResultById(input.gate_result_id);
    if (!gateResult) {
      throw new Error(`Gate result ${input.gate_result_id} not found.`);
    }

    const acceptedRiskRefs = [...gateResult.accepted_risk_refs, ...(input.accepted_risk_refs ?? [])];
    const humanDecisionValidation = gateResult.verdict === 'needs_human_review'
      ? await this.validateHumanDecisionRefs(input.human_decision_refs ?? [], gateResult)
      : { confirmed: false, required_actions: [] };
    const transitionResult = this.resolveTransitionResult(
      gateResult.verdict,
      acceptedRiskRefs,
      humanDecisionValidation.confirmed,
    );
    const canWriteState = transitionResult === 'passed' || transitionResult === 'passed_with_risk';
    const canRecordCreatedAuthorityRefs = canWriteState || input.allow_audit_authority_refs_on_blocked === true;
    const blockers = gateResult.blockers ?? [];
    const requiredActions = this.uniqueStrings([
      ...(gateResult.required_actions ?? []),
      ...humanDecisionValidation.required_actions,
      ...this.requiredActionsForResult(transitionResult),
    ]);

    return this.repository.createChainTransitionAttempt({
      chain_transition_attempt_id: this.idFactory('transition_attempt'),
      workspace_id: input.workspace_id ?? gateResult.workspace_id ?? null,
      title_card_id: input.title_card_id ?? gateResult.title_card_id ?? input.source_ref.title_card_id ?? null,
      transition_key: input.transition_key,
      source_ref: input.source_ref,
      target_ref: input.target_ref ?? null,
      gate_result_id: gateResult.readiness_gate_result_id,
      workflow_run_id: input.workflow_run_id ?? gateResult.workflow_run_id ?? null,
      input_snapshot_id: input.input_snapshot_id ?? gateResult.input_snapshot_id ?? null,
      policy_version_id: input.policy_version_id ?? gateResult.policy_version_id ?? null,
      actor: input.actor,
      result: transitionResult,
      reason: input.reason ?? this.defaultReasonForResult(transitionResult),
      required_actions: requiredActions,
      blockers,
      accepted_risk_refs: acceptedRiskRefs,
      state_write_intents: canWriteState ? (input.state_write_intents ?? []) : [],
      created_authority_refs: canRecordCreatedAuthorityRefs ? (input.created_authority_refs ?? []) : [],
      created_at: this.now(),
    });
  }

  private resolveTransitionResult(
    gateVerdict: TopicSelectionGateVerdict,
    acceptedRiskRefs: TopicSelectionFunctionalRef[],
    hasValidHumanDecision: boolean,
  ): TopicSelectionTransitionResult {
    if (gateVerdict === 'block') {
      return 'blocked';
    }
    if (gateVerdict === 'needs_human_review') {
      return hasValidHumanDecision ? 'passed' : 'needs_human_review';
    }
    if (gateVerdict === 'pass_with_risk') {
      return acceptedRiskRefs.length > 0 ? 'passed_with_risk' : 'requires_accepted_risk';
    }
    return 'passed';
  }

  private requiredActionsForResult(result: TopicSelectionTransitionResult): string[] {
    if (result === 'requires_accepted_risk') {
      return ['accepted_risk_ref_required'];
    }
    if (result === 'needs_human_review') {
      return ['human_confirmed_decision_required'];
    }
    return [];
  }

  private defaultReasonForResult(result: TopicSelectionTransitionResult): string {
    switch (result) {
      case 'passed':
        return 'Transition passed deterministic gate.';
      case 'passed_with_risk':
        return 'Transition passed with accepted risk refs.';
      case 'blocked':
        return 'Transition blocked by readiness gate.';
      case 'needs_human_review':
        return 'Transition requires human confirmation.';
      case 'requires_accepted_risk':
        return 'Transition requires accepted risk refs.';
      case 'failed':
        return 'Transition failed.';
    }
  }

  private async validateHumanDecisionRefs(
    humanDecisionRefs: TopicSelectionFunctionalRef[],
    gateResult: TopicSelectionReadinessGateResultRecord,
  ): Promise<{ confirmed: boolean; required_actions: string[] }> {
    if (humanDecisionRefs.length === 0) {
      return { confirmed: false, required_actions: [] };
    }

    const requiredActions: string[] = [];
    for (const humanDecisionRef of humanDecisionRefs) {
      if (!this.isHumanDecisionRef(humanDecisionRef)) {
        requiredActions.push('human_confirmed_decision_ref_type_invalid');
        continue;
      }
      const humanDecision = await this.repository.findHumanConfirmedDecisionById(humanDecisionRef.ref_id);
      if (!humanDecision) {
        requiredActions.push('human_confirmed_decision_ref_not_found');
        continue;
      }
      if (humanDecision.decision_type !== 'confirm') {
        requiredActions.push('human_confirmed_decision_confirm_required');
      }
      if (!this.isHumanActor(humanDecision.actor)) {
        requiredActions.push('human_confirmed_decision_human_actor_required');
      }
      if (!this.functionalRefsMatch(humanDecision.target_ref, gateResult.target_ref)) {
        requiredActions.push('human_confirmed_decision_target_mismatch');
      }
      if (
        gateResult.policy_version_id
        && humanDecision.policy_version_id !== gateResult.policy_version_id
      ) {
        requiredActions.push('human_confirmed_decision_policy_mismatch');
      }
    }

    return {
      confirmed: requiredActions.length === 0,
      required_actions: this.uniqueStrings(requiredActions),
    };
  }

  private isHumanDecisionRef(ref: TopicSelectionFunctionalRef): boolean {
    return ref.ref_type === 'human_confirmed_decision' || ref.ref_type === 'human_decision';
  }

  private isHumanActor(actor: TopicSelectionActorRef): boolean {
    return actor.actor_type === 'human' || actor.actor_type === 'hybrid';
  }

  private functionalRefsMatch(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }
}
