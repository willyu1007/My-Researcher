import crypto from 'node:crypto';

import type {
  AgentWorkflowHarnessSpec,
  CreateAgentWorkflowHarnessRunResponse,
  ImplementationQualitySignalInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  ProviderVarianceCaseInput,
  ProviderVarianceCaseResult,
  ProviderVarianceMetricResult,
  ProviderVariancePreflightResult,
  ProviderVarianceProfile,
  ProviderVarianceRecommendation,
  RunProviderVarianceEvaluationRequest,
  RunProviderVarianceEvaluationResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-provider-variance-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { PaperImplementationAiWorkflowHarnessService } from './paper-implementation-ai-workflow-harness-service.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationProviderVarianceEvaluationServiceOptions = {
  aiWorkflowHarness: PaperImplementationAiWorkflowHarnessService;
  idFactory?: IdFactory;
  now?: () => string;
};

type MetricConsumer = {
  consumer: string;
  decision: string;
};

const METRIC_CONSUMERS: Record<ProviderVarianceMetricResult['metric'], MetricConsumer> = {
  contract_validity_rate: {
    consumer: 'T-099 harness / EvaluationHarness',
    decision: 'Accept as proposal artifact or reject as invalid provider output.',
  },
  handoff_readiness_rate: {
    consumer: 'Workflow scheduler / DecisionWorkQueue',
    decision: 'Auto-advance to next node or create missing-input queue item.',
  },
  authority_violation_rate: {
    consumer: 'GateService / DecisionWorkQueue',
    decision: 'Create critical blocker and prevent direct authority mutation.',
  },
  traceability_violation_rate: {
    consumer: 'TraceHarness / GateService',
    decision: 'Block or repair outputs with missing lineage, invalid refs, or evidence misuse.',
  },
  claim_safety_violation_rate: {
    consumer: 'ClaimBoundaryGate / human review queue',
    decision: 'Block overclaim or require human review.',
  },
  workflow_stability_rate: {
    consumer: 'Workflow scheduler / PortfolioCoordinator',
    decision: 'Allow repeated automation or downgrade provider/profile to human-reviewed mode.',
  },
  human_review_burden_rate: {
    consumer: 'Product/workflow ops',
    decision: 'Decide whether automation is useful enough or needs tuning.',
  },
  provider_operability_rate: {
    consumer: 'Runtime/config owner',
    decision: 'Enable, pause, or demote a provider/profile.',
  },
};

export class PaperImplementationProviderVarianceEvaluationService {
  private readonly aiWorkflowHarness: PaperImplementationAiWorkflowHarnessService;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationProviderVarianceEvaluationServiceOptions) {
    this.aiWorkflowHarness = options.aiWorkflowHarness;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runProviderVarianceEvaluation(
    implementationProjectId: string,
    request: RunProviderVarianceEvaluationRequest,
  ): Promise<RunProviderVarianceEvaluationResponse> {
    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const evaluationRunId = request.evaluation_run_id ?? this.idFactory('pi_provider_variance_eval');
    const preflightResults = request.profiles.map((profile) => this.preflight(profile));
    const caseResults: ProviderVarianceCaseResult[] = [];

    for (const profile of request.profiles) {
      const preflight = preflightResults.find((candidate) => candidate.profile_id === profile.profile_id);
      for (const testCase of request.cases) {
        for (let repeatIndex = 1; repeatIndex <= request.repeat_count; repeatIndex += 1) {
          if (!preflight || preflight.status !== 'passed') {
            caseResults.push(this.skippedCaseResult(testCase, profile, repeatIndex, preflight));
            continue;
          }
          const harnessRun = await this.runFakeProviderCase(
            implementationProjectId,
            evaluationRunId,
            request,
            profile,
            testCase,
            repeatIndex,
            createdBy,
          );
          caseResults.push(this.caseResultFromHarness(testCase, profile, repeatIndex, harnessRun));
        }
      }
    }

    const metrics = this.computeMetrics(caseResults, preflightResults);
    return {
      evaluation_run_id: evaluationRunId,
      implementation_project_id: implementationProjectId,
      input_snapshot_id: request.input_snapshot_id,
      workflow_type: request.workflow_type,
      profiles: request.profiles,
      preflight_results: preflightResults,
      case_results: caseResults,
      metrics,
      recommendations: this.recommendations(request.profiles, caseResults, preflightResults),
      created_by: createdBy,
      created_at: createdAt,
    };
  }

  private async runFakeProviderCase(
    implementationProjectId: string,
    evaluationRunId: string,
    request: RunProviderVarianceEvaluationRequest,
    profile: ProviderVarianceProfile,
    testCase: ProviderVarianceCaseInput,
    repeatIndex: number,
    createdBy: TopicSelectionActorType,
  ): Promise<CreateAgentWorkflowHarnessRunResponse> {
    const blockedReasonOverrides = this.blockedReasonsForCase(testCase);
    const proposalArtifacts = testCase.case_kind === 'invalid_contract'
      ? []
      : [{
        artifact_kind: 'evaluation_report' as const,
        target_ref: testCase.target_ref,
        artifact_ref: testCase.artifact_ref ?? this.ref('provider_variance_output', [
          evaluationRunId,
          profile.profile_id,
          testCase.case_id,
          String(repeatIndex),
        ].join('_')),
        source_refs: testCase.source_refs,
        trace_manifest_refs: testCase.case_kind === 'missing_trace' ? [] : testCase.trace_manifest_refs,
        payload: this.fakeProviderPayload(profile, testCase, repeatIndex),
      }];
    return this.aiWorkflowHarness.createAgentWorkflowHarnessRun(implementationProjectId, {
      harness_run_id: this.idFactory('pi_provider_variance_harness_run'),
      harness_id: request.harness_id,
      input_snapshot_id: request.input_snapshot_id,
      workflow_type: request.workflow_type,
      workflow_version: request.workflow_version,
      run_mode: profile.run_mode,
      execution_mode: profile.execution_mode,
      model_profile_id: profile.model_profile_id,
      prompt_template_version_id: request.prompt_template_version_id,
      output_schema_version_id: request.output_schema_version_id,
      raw_output_artifact_ref: this.ref('provider_variance_raw_output', [
        evaluationRunId,
        profile.profile_id,
        testCase.case_id,
        String(repeatIndex),
      ].join('_')),
      parsed_output_artifact_ref: proposalArtifacts[0]?.artifact_ref ?? null,
      spec: this.spec(request, profile),
      proposal_artifacts: proposalArtifacts,
      quality_signal_candidates: this.qualitySignalsForCase(testCase, profile, evaluationRunId),
      direct_authority_mutation_refs: testCase.case_kind === 'direct_authority_mutation'
        ? [testCase.target_ref]
        : [],
      blocked_reason_overrides: blockedReasonOverrides,
      created_by: createdBy,
    });
  }

  private preflight(profile: ProviderVarianceProfile): ProviderVariancePreflightResult {
    if (profile.profile_mode === 'deterministic_fake') {
      return {
        profile_id: profile.profile_id,
        status: 'passed',
        reason: 'Deterministic fake provider profile is credential-free.',
      };
    }
    if (!profile.live_provider_enabled) {
      return {
        profile_id: profile.profile_id,
        status: 'skipped',
        reason: 'Live provider profile is opt-in and was not enabled.',
      };
    }
    return {
      profile_id: profile.profile_id,
      status: 'blocked',
      reason: 'Live provider execution is intentionally not implemented in the default T-105 lane.',
    };
  }

  private skippedCaseResult(
    testCase: ProviderVarianceCaseInput,
    profile: ProviderVarianceProfile,
    repeatIndex: number,
    preflight: ProviderVariancePreflightResult | undefined,
  ): ProviderVarianceCaseResult {
    return {
      case_id: testCase.case_id,
      case_kind: testCase.case_kind,
      profile_id: profile.profile_id,
      repeat_index: repeatIndex,
      run_status: 'skipped',
      harness_run_ref: null,
      proposal_artifact_refs: [],
      quality_signal_refs: [],
      queue_item_refs: [],
      contract_valid: false,
      handoff_ready: false,
      authority_violation: false,
      traceability_violation: false,
      claim_safety_violation: false,
      provider_operable: false,
      blocked_reasons: [preflight?.reason ?? 'Provider preflight did not pass.'],
      output_signature: 'skipped',
    };
  }

  private caseResultFromHarness(
    testCase: ProviderVarianceCaseInput,
    profile: ProviderVarianceProfile,
    repeatIndex: number,
    response: CreateAgentWorkflowHarnessRunResponse,
  ): ProviderVarianceCaseResult {
    const blockedReasons = response.harness_run.blocked_reasons;
    const authorityViolation = response.harness_run.direct_state_mutation_detected
      || blockedReasons.some((reason) => reason.includes('direct_authority_mutation')
        || reason.includes('authority_mutation'));
    const traceabilityViolation = response.harness_run.trace_validation_status === 'failed'
      || blockedReasons.some((reason) => reason.includes('trace'));
    const claimSafetyViolation = testCase.case_kind === 'overclaim_drift'
      || blockedReasons.some((reason) => reason.includes('overclaim') || reason.includes('claim_safety'));
    const handoffReady = response.harness_run.run_status === 'completed'
      && response.queue_items.length === 0
      && (testCase.expected_handoff_ready ?? true);
    return {
      case_id: testCase.case_id,
      case_kind: testCase.case_kind,
      profile_id: profile.profile_id,
      repeat_index: repeatIndex,
      run_status: response.harness_run.run_status === 'completed' ? 'completed' : 'blocked',
      harness_run_ref: this.ref('agent_workflow_harness_run', response.harness_run.harness_run_id),
      proposal_artifact_refs: response.proposal_artifacts
        .map((artifact) => this.ref('implementation_proposal_artifact', artifact.proposal_artifact_id)),
      quality_signal_refs: response.quality_signals
        .map((signal) => this.ref('implementation_quality_signal', signal.quality_signal_id)),
      queue_item_refs: response.queue_items
        .map((item) => this.ref('decision_work_queue_item', item.queue_item_id)),
      contract_valid: response.harness_run.schema_validation_status === 'passed',
      handoff_ready: handoffReady,
      authority_violation: authorityViolation,
      traceability_violation: traceabilityViolation,
      claim_safety_violation: claimSafetyViolation,
      provider_operable: true,
      blocked_reasons: blockedReasons,
      output_signature: this.outputSignature(response),
    };
  }

  private computeMetrics(
    caseResults: ProviderVarianceCaseResult[],
    preflightResults: ProviderVariancePreflightResult[],
  ): ProviderVarianceMetricResult[] {
    const attempted = caseResults.filter((result) => result.run_status !== 'skipped');
    const stabilityGroups = new Map<string, Set<string>>();
    for (const result of attempted) {
      const key = [result.profile_id, result.case_id].join(':');
      const signatures = stabilityGroups.get(key) ?? new Set<string>();
      signatures.add(result.output_signature);
      stabilityGroups.set(key, signatures);
    }
    const stableGroupCount = [...stabilityGroups.values()].filter((signatures) => signatures.size === 1).length;
    return [
      this.metric('contract_validity_rate', attempted.filter((result) => result.contract_valid).length, attempted.length),
      this.metric('handoff_readiness_rate', attempted.filter((result) => result.handoff_ready).length, attempted.length),
      this.metric('authority_violation_rate', attempted.filter((result) => result.authority_violation).length, attempted.length),
      this.metric('traceability_violation_rate', attempted.filter((result) => result.traceability_violation).length, attempted.length),
      this.metric('claim_safety_violation_rate', attempted.filter((result) => result.claim_safety_violation).length, attempted.length),
      this.metric('workflow_stability_rate', stableGroupCount, stabilityGroups.size),
      this.metric('human_review_burden_rate', attempted.filter((result) => result.queue_item_refs.length > 0).length, attempted.length),
      this.metric(
        'provider_operability_rate',
        preflightResults.filter((result) => result.status === 'passed').length,
        preflightResults.length,
      ),
    ];
  }

  private recommendations(
    profiles: ProviderVarianceProfile[],
    caseResults: ProviderVarianceCaseResult[],
    preflightResults: ProviderVariancePreflightResult[],
  ): ProviderVarianceRecommendation[] {
    return profiles.map((profile): ProviderVarianceRecommendation => {
      const preflight = preflightResults.find((result) => result.profile_id === profile.profile_id);
      const profileResults = caseResults.filter((result) => result.profile_id === profile.profile_id);
      const reasons: string[] = [];
      if (preflight?.status === 'blocked') {
        reasons.push(preflight.reason);
        return { profile_id: profile.profile_id, recommendation: 'pause', reasons };
      }
      if (preflight?.status === 'skipped') {
        reasons.push(preflight.reason);
        return { profile_id: profile.profile_id, recommendation: 'tune_before_use', reasons };
      }
      if (profileResults.some((result) => result.authority_violation || result.claim_safety_violation)) {
        reasons.push('Provider output attempted authority mutation or claim-safety drift.');
        return { profile_id: profile.profile_id, recommendation: 'demote_to_human_review', reasons };
      }
      if (profileResults.some((result) => !result.contract_valid || result.traceability_violation || !result.handoff_ready)) {
        reasons.push('Provider output is not consistently contract-valid, trace-ready, and handoff-ready.');
        return { profile_id: profile.profile_id, recommendation: 'tune_before_use', reasons };
      }
      if (!this.hasStableRepeatedOutputs(profileResults)) {
        reasons.push('Repeated runs produced unstable outputs.');
        return { profile_id: profile.profile_id, recommendation: 'tune_before_use', reasons };
      }
      reasons.push('Deterministic evaluation lane passed provider variance gates; this does not satisfy product runtime/provider canary or Domain Gate admission.');
      return { profile_id: profile.profile_id, recommendation: 'enable', reasons };
    });
  }

  private hasStableRepeatedOutputs(caseResults: ProviderVarianceCaseResult[]): boolean {
    const groups = new Map<string, Set<string>>();
    for (const result of caseResults.filter((candidate) => candidate.run_status !== 'skipped')) {
      const signatures = groups.get(result.case_id) ?? new Set<string>();
      signatures.add(result.output_signature);
      groups.set(result.case_id, signatures);
    }
    return [...groups.values()].every((signatures) => signatures.size === 1);
  }

  private metric(
    metric: ProviderVarianceMetricResult['metric'],
    numerator: number,
    denominator: number,
  ): ProviderVarianceMetricResult {
    const metadata = METRIC_CONSUMERS[metric];
    return {
      metric,
      value: denominator === 0 ? 1 : numerator / denominator,
      numerator,
      denominator,
      consumer: metadata.consumer,
      decision: metadata.decision,
    };
  }

  private spec(
    request: RunProviderVarianceEvaluationRequest,
    profile: ProviderVarianceProfile,
  ): AgentWorkflowHarnessSpec {
    return {
      workflow_type: request.workflow_type,
      workflow_version: request.workflow_version,
      input_policy: {
        required_input_snapshot: true,
        allowed_context_types: ['trace_manifest', 'run_evidence_unit', 'claim_candidate', 'result_interpretation_packet'],
        forbidden_context_types: ['memo', 'display_summary', 'publication_ready_text'],
        max_context_tokens: null,
      },
      prompt_policy: {
        prompt_template_version_id: request.prompt_template_version_id,
        system_instruction_version_id: 'paper_implementation_provider_variance_v1',
        output_schema_version_id: request.output_schema_version_id,
      },
      model_policy: {
        model_profile_id: profile.model_profile_id,
        temperature: 0,
        allowed_tools: [],
      },
      output_policy: {
        required_schema: request.output_schema_version_id,
        natural_language_field_contract_version_id: 'paper_implementation_nl_roles_v1',
        required_ref_fields: ['target_ref', 'source_refs', 'trace_manifest_refs'],
        forbidden_outputs: ['authority_state_mutation', 'publication_ready_claim', 'untraced_claim'],
      },
      validation_policy: {
        schema_validation: true,
        reference_validation: true,
        trace_validation: true,
        claim_boundary_validation: true,
      },
      retry_policy: {
        max_retries: 0,
        retry_on_schema_failure: false,
        retry_on_missing_refs: false,
      },
      audit_policy: {
        save_prompt: true,
        save_input_snapshot: true,
        save_raw_output: true,
        save_parsed_output: true,
        save_validator_results: true,
      },
    };
  }

  private blockedReasonsForCase(testCase: ProviderVarianceCaseInput): string[] {
    if (testCase.case_kind === 'overclaim_drift') {
      return ['provider_variance_overclaim_drift'];
    }
    if (testCase.case_kind === 'handoff_gap') {
      return ['provider_variance_handoff_gap'];
    }
    return [];
  }

  private qualitySignalsForCase(
    testCase: ProviderVarianceCaseInput,
    profile: ProviderVarianceProfile,
    evaluationRunId: string,
  ): ImplementationQualitySignalInput[] {
    if (testCase.case_kind === 'overclaim_drift') {
      return [this.qualitySignal(
        'provider_variance_claim_safety_violation',
        'critical',
        testCase,
        profile,
        evaluationRunId,
        'Provider output broadened the claim beyond traced support.',
      )];
    }
    if (testCase.case_kind === 'handoff_gap') {
      return [this.qualitySignal(
        'provider_variance_handoff_gap',
        'error',
        testCase,
        profile,
        evaluationRunId,
        'Provider output omitted required handoff fields.',
      )];
    }
    if (testCase.case_kind === 'direct_authority_mutation') {
      return [this.qualitySignal(
        'provider_variance_authority_violation',
        'critical',
        testCase,
        profile,
        evaluationRunId,
        'Provider output attempted direct authority mutation.',
      )];
    }
    return [];
  }

  private qualitySignal(
    signalType: ImplementationQualitySignalInput['signal_type'],
    severity: ImplementationQualitySignalInput['severity'],
    testCase: ProviderVarianceCaseInput,
    profile: ProviderVarianceProfile,
    evaluationRunId: string,
    summary: string,
  ): ImplementationQualitySignalInput {
    return {
      signal_type: signalType,
      severity,
      target_ref: testCase.target_ref,
      summary,
      source_refs: [
        this.ref('provider_variance_evaluation', evaluationRunId),
        this.ref('provider_profile', profile.profile_id),
      ],
      payload: {
        case_id: testCase.case_id,
        case_kind: testCase.case_kind,
        profile_id: profile.profile_id,
      },
      policy_version_id: 'paper_implementation_provider_variance_v1',
    };
  }

  private fakeProviderPayload(
    profile: ProviderVarianceProfile,
    testCase: ProviderVarianceCaseInput,
    repeatIndex: number,
  ): Record<string, unknown> {
    return {
      provider_mode: profile.profile_mode,
      model_profile_id: profile.model_profile_id,
      case_id: testCase.case_id,
      case_kind: testCase.case_kind,
      repeat_observed: repeatIndex > 0,
      output_kind: 'proposal_only_evaluation_report',
      proposed_handoff_ready: testCase.case_kind === 'happy_path',
    };
  }

  private outputSignature(response: CreateAgentWorkflowHarnessRunResponse): string {
    return crypto
      .createHash('sha256')
      .update(this.stableStringify({
        blocked_reasons: [...response.harness_run.blocked_reasons].sort(),
        validations: {
          schema: response.harness_run.schema_validation_status,
          reference: response.harness_run.reference_validation_status,
          trace: response.harness_run.trace_validation_status,
          nl_field_role: response.harness_run.nl_field_role_validation_status,
          memo_as_evidence_detected: response.harness_run.memo_as_evidence_detected,
          direct_state_mutation_detected: response.harness_run.direct_state_mutation_detected,
          run_status: response.harness_run.run_status,
        },
        proposals: response.proposal_artifacts
          .map((artifact) => ({
            artifact_kind: artifact.artifact_kind,
            proposal_status: artifact.proposal_status,
            target_ref: this.refSignature(artifact.target_ref),
            source_refs: this.refSignatures(artifact.source_refs),
            trace_manifest_refs: this.refSignatures(artifact.trace_manifest_refs),
            payload: artifact.payload,
          }))
          .sort((a, b) => this.stableStringify(a).localeCompare(this.stableStringify(b))),
        quality_signals: response.quality_signals
          .map((signal) => ({
            signal_type: signal.signal_type,
            severity: signal.severity,
            target_ref: this.refSignature(signal.target_ref),
            summary: signal.summary,
            payload: signal.payload,
            policy_version_id: signal.policy_version_id ?? null,
          }))
          .sort((a, b) => this.stableStringify(a).localeCompare(this.stableStringify(b))),
        queue_items: response.queue_items
          .map((item) => ({
            queue_type: item.queue_type,
            stage: item.stage,
            priority: item.priority,
            status: item.status,
            target_ref: this.refSignature(item.target_ref),
            blocking_transition_keys: [...item.blocking_transition_keys].sort(),
            recommended_actions: [...item.recommended_actions].sort(),
          }))
          .sort((a, b) => this.stableStringify(a).localeCompare(this.stableStringify(b))),
      }))
      .digest('hex');
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.normalizeForSignature(value));
  }

  private normalizeForSignature(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeForSignature(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, this.normalizeForSignature(nested)]),
    );
  }

  private refSignatures(refs: TopicSelectionFunctionalRef[]): string[] {
    return refs.map((ref) => this.refSignature(ref)).sort();
  }

  private refSignature(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.title_card_id ?? '',
      ref.version_id ?? '',
    ].join(':');
  }

  private ref(refType: string, refId: string): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: null,
    };
  }
}
