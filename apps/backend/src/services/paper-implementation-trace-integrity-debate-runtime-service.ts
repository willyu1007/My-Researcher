import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_FINAL_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_PREFLIGHT_ROLE_SLOT_ID,
  paperImplementationTraceIntegrityRoleOutputSchema,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeExecutorKind,
  type PaperImplementationTraceIntegrityDebateArtifact,
  type PaperImplementationTraceIntegrityDebateRoleSlotId,
  type PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
  type PaperImplementationTraceIntegrityRoleOutput,
  type RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  PaperImplementationAgentExecutionMode,
  PaperImplementationAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-agent-common-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionRuntimeCacheResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type {
  TopicSelectionAgentDebateExtension,
  TopicSelectionAgentTokenBudgetGateResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import {
  PaperImplementationRuntimeAdmissionService,
} from './paper-implementation-runtime-admission-service.js';
import {
  assertResumeRunIdConsistency,
  PaperImplementationRuntimeResumeEngine,
  RESUME_ISSUE_CODES,
  type ResumeRequestIdentity,
} from './paper-implementation-runtime-resume.js';
import { requireActiveImplementationProject } from './paper-implementation-runtime-preflight.js';
import {
  PAPER_IMPLEMENTATION_DEBATE_RETRYABLE_RUNTIME_FAILURE_CODES,
  PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
  recordSlotProviderCallTelemetry,
} from './paper-implementation-runtime-utils.js';
import type {
  PaperImplementationRuntimeTelemetryCollector,
} from './paper-implementation-runtime-telemetry-service.js';
import {
  assessPaperImplementationDebateComplexityShadow,
  type PaperImplementationDebateComplexityTier,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-debate-complexity-shadow';
import {
  evaluatePaperImplementationTraceIntegrityRoleSemantics,
} from './paper-implementation-trace-debate-semantics.js';
import {
  PaperImplementationTraceIntegrityRetrievalService,
  type PaperImplementationTraceIntegrityRetrievalResult,
} from './paper-implementation-trace-integrity-retrieval-service.js';
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
  type PaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';

export interface PaperImplementationTraceIntegrityDebateRuntimeResult {
  run_id: string;
  slot_id: typeof PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID;
  workflow_type: 'trace_integrity_review';
  status: 'passed' | 'blocked' | 'failed_runtime';
  provider_call_count: number;
  runtime_artifacts: PaperImplementationRuntimeArtifactEnvelope[];
  admission_records: PaperImplementationRuntimeAdmissionRecord[];
  final_runtime_artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  final_admission_record: PaperImplementationRuntimeAdmissionRecord | null;
  blocker_codes: string[];
  warning_codes: string[];
  operational_telemetry: PaperImplementationRuntimeOperationalTelemetry;
}

export type PaperImplementationTraceIntegrityAgentOrchestrator =
  Pick<TopicSelectionAgentOrchestratorService, 'invokeStructuredOutput'>;

interface RuntimeServiceOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: PaperImplementationTraceIntegrityAgentOrchestrator;
  retrievalService?: PaperImplementationTraceIntegrityRetrievalService;
  telemetryCollector?: PaperImplementationRuntimeTelemetryCollector | null;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

interface RecordedRuntimeArtifact {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
  output: PaperImplementationTraceIntegrityRoleOutput | null;
}

interface RoleInvocationOutcome {
  result: TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>;
  retryAttemptIndex: number;
  providerCallCount: number;
  runtimeFailureCode: string | null;
}

interface RoleSpec {
  slotId: PaperImplementationTraceIntegrityDebateSemanticRoleSlotId;
  executorKind: PaperImplementationRuntimeExecutorKind;
  promptVariantId: string;
}

const ROLE_SPECS: RoleSpec[] = [
  {
    slotId: 'trace_integrity_review.support_mapper_map',
    executorKind: 'semantic_support_mapper',
    promptVariantId: 'support-map.main',
  },
  {
    slotId: 'trace_integrity_review.skeptic_challenge',
    executorKind: 'semantic_skeptic',
    promptVariantId: 'skeptic-challenge.main',
  },
  {
    slotId: 'trace_integrity_review.support_mapper_reconcile',
    executorKind: 'semantic_reconcile',
    promptVariantId: 'support-map.reconcile',
  },
  {
    slotId: 'trace_integrity_review.arbiter_final',
    executorKind: 'semantic_arbiter',
    promptVariantId: 'arbiter.final',
  },
];

const MAX_TECHNICAL_RETRY_ATTEMPT_INDEX = 1;
const RETRYABLE_RUNTIME_FAILURE_CODES = new Set<string>([
  ...PAPER_IMPLEMENTATION_DEBATE_RETRYABLE_RUNTIME_FAILURE_CODES,
]);

export class PaperImplementationTraceIntegrityDebateRuntimeService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: PaperImplementationTraceIntegrityAgentOrchestrator;
  private readonly retrievalService: PaperImplementationTraceIntegrityRetrievalService;
  private readonly telemetryCollector: PaperImplementationRuntimeTelemetryCollector | null;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: RuntimeServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.retrievalService = options.retrievalService ?? new PaperImplementationTraceIntegrityRetrievalService();
    this.telemetryCollector = options.telemetryCollector ?? null;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${cryptoId()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runBoundaryDebate(
    implementationProjectId: string,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
  ): Promise<PaperImplementationTraceIntegrityDebateRuntimeResult> {
    this.assertRequest(request);
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    // D9 resume (T-124 S3-α1): a resume continues the ORIGINAL run identity —
    // the same run_id, the same retrieval packet identity, the same profile and
    // prompt identity. Already-admitted role artifacts are reused as the
    // executed prefix (no provider re-issue); newly executed roles take the
    // run's next call indexes so re-executing a previously failed role never
    // collides with its recorded failed artifact on runtime identity.
    const resumeRunId = request.resume_from_run_id?.trim() || null;
    const runId = resumeRunId ?? (request.run_id?.trim() || this.idFactory('pi_trace_debate_run'));
    const retrievalResult = this.retrievalService.buildRetrievalPacket(
      implementationProjectId,
      runId,
      request,
    );
    const runtimeBase = this.runtimeBase(implementationProjectId, request, runId, retrievalResult);
    const artifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    const admissions: PaperImplementationRuntimeAdmissionRecord[] = [];
    const preflightBlockerCodes = this.uniqueStrings([
      ...(request.preflight_blocker_codes ?? []),
      ...retrievalResult.blocker_codes,
    ]);
    const preflightWarningCodes = this.uniqueStrings(retrievalResult.warning_codes);

    let resume: TraceResumeState | null = null;
    if (resumeRunId) {
      const engine = this.resumeEngine();
      const resumeIdentity = this.resumeIdentity(runtimeBase, request);
      const idempotent = await engine.idempotentResumeChain(resumeIdentity);
      if (idempotent) {
        return this.result(
          runId,
          idempotent.status,
          idempotent.providerCallCount,
          idempotent.artifacts,
          idempotent.admissions,
          idempotent.finalArtifact,
          idempotent.finalAdmission,
        );
      }
      if (preflightBlockerCodes.length > 0) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Resume of run ${runId} rejected: deterministic preflight is no longer clean for the original run identity.`,
          { resume_issue_codes: [RESUME_ISSUE_CODES.PREFLIGHT_NO_LONGER_CLEAN], blocker_codes: preflightBlockerCodes },
        );
      }
      const loaded = await engine.loadResumeState(resumeIdentity);
      // F1-2: when the resume request omits model_option_id, pin the recorded run's
      // option so newly executed roles inherit it instead of drifting to null.
      if (
        request.execution_mode === 'provider_llm'
        && !request.model_option_id?.trim()
        && loaded.recordedModelOptionId
      ) {
        runtimeBase.modelOptionId = loaded.recordedModelOptionId;
      }
      resume = { reused: loaded.reused, nextCallIndex: loaded.nextCallIndex };
    }

    if (preflightBlockerCodes.length > 0) {
      const preflight = await this.recordPreflightBlockedArtifact(
        runtimeBase,
        request,
        preflightBlockerCodes,
        preflightWarningCodes,
      );
      artifacts.push(preflight.artifact);
      admissions.push(preflight.admission);
      const final = await this.recordFinalArtifact(runtimeBase, request, {
        roleArtifacts: [preflight],
        status: 'blocked',
        runtimeFailureCode: null,
        providerCallCount: 0,
        blockerCodes: preflightBlockerCodes,
        warningCodes: preflightWarningCodes,
      });
      artifacts.push(final.artifact);
      admissions.push(final.admission);
      return this.result(runId, 'blocked', 0, artifacts, admissions, final.artifact, final.admission);
    }

    const roleArtifacts: RecordedRuntimeArtifact[] = [];
    for (const reused of resume?.reused ?? []) {
      artifacts.push(reused.artifact);
      admissions.push(reused.admission);
      roleArtifacts.push(reused);
    }
    let nextCallIndex = resume?.nextCallIndex ?? 1;
    for (const [index, spec] of ROLE_SPECS.entries()) {
      if (index < roleArtifacts.length) {
        // Admitted prefix reused from the resumed run — no provider re-issue.
        continue;
      }
      const callIndex = nextCallIndex;
      nextCallIndex += 1;
      const roleInvocation = await this.invokeRoleWithBoundedRetry(
        runtimeBase,
        request,
        spec,
        callIndex,
        roleArtifacts,
      );
      const recorded = await this.recordRoleArtifact(runtimeBase, request, spec, callIndex, roleArtifacts, roleInvocation);
      artifacts.push(recorded.artifact);
      admissions.push(recorded.admission);
      roleArtifacts.push(recorded);

      if (recorded.admission.admission_status !== 'admitted' || recorded.artifact.runtime_status === 'failed_runtime') {
        return this.result(
          runId,
          'failed_runtime',
          this.totalProviderCalls(artifacts),
          artifacts,
          admissions,
          null,
          null,
        );
      }
    }

    const blockerCodes = this.uniqueStrings(roleArtifacts.flatMap((item) => item.output?.blocker_codes ?? []));
    const warningCodes = this.uniqueStrings([
      ...runtimeBase.retrievalWarningCodes,
      ...roleArtifacts.flatMap((item) => item.output?.warning_codes ?? []),
      ...roleArtifacts.flatMap((item) => item.artifact.warning_codes),
    ]);
    const finalStatus = blockerCodes.length > 0 ? 'blocked' : 'passed';
    const final = await this.recordFinalArtifact(runtimeBase, request, {
      roleArtifacts,
      status: finalStatus,
      runtimeFailureCode: null,
      providerCallCount: this.totalProviderCalls(roleArtifacts.map((item) => item.artifact)),
      blockerCodes,
      warningCodes,
    });
    artifacts.push(final.artifact);
    admissions.push(final.admission);
    return this.result(
      runId,
      finalStatus,
      final.artifact.provider_call_count,
      artifacts,
      admissions,
      final.artifact,
      final.admission,
    );
  }

  private async invokeRoleWithBoundedRetry(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    spec: RoleSpec,
    callIndex: number,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): Promise<RoleInvocationOutcome> {
    let providerCallCount = 0;
    for (let retryAttemptIndex = 0; retryAttemptIndex <= MAX_TECHNICAL_RETRY_ATTEMPT_INDEX; retryAttemptIndex += 1) {
      const result = await this.invokeRole(
        runtimeBase,
        request,
        spec,
        callIndex,
        priorArtifacts,
        retryAttemptIndex,
      );
      providerCallCount += this.providerCallCount(result);
      const runtimeFailureCode = this.roleInvocationFailureCode(runtimeBase, spec, result, priorArtifacts);
      const shouldRetry = request.execution_mode === 'provider_llm'
        && retryAttemptIndex < MAX_TECHNICAL_RETRY_ATTEMPT_INDEX
        && runtimeFailureCode !== null
        && RETRYABLE_RUNTIME_FAILURE_CODES.has(runtimeFailureCode);
      // S4 复审 FA-3: the telemetry call_index is the per-(role, attempt)
      // ordinal — NOT the artifact-level role call ordinal (`callIndex`) that
      // retries used to share, which double-counted one retry as repaid twice.
      await recordSlotProviderCallTelemetry(this.telemetryCollector, {
        implementationProjectId: runtimeBase.implementationProjectId,
        runId: runtimeBase.runId,
        slotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
        roleSlotId: spec.slotId,
        retryAttemptIndex,
        executionMode: request.execution_mode,
        result,
        shouldRetry,
        runtimeFailureCode,
        shadowTier: runtimeBase.shadowTier,
      });
      if (!shouldRetry) {
        return {
          result,
          retryAttemptIndex,
          providerCallCount,
          runtimeFailureCode,
        };
      }
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'Trace integrity runtime retry loop exhausted unexpectedly.');
  }

  private async invokeRole(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    spec: RoleSpec,
    callIndex: number,
    priorArtifacts: RecordedRuntimeArtifact[],
    retryAttemptIndex: number,
  ): Promise<TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>> {
    const output = this.fixtureOutputForMode(request, spec.slotId);
    const messages = this.roleMessages(runtimeBase, request, spec, priorArtifacts);
    const baseInvocationAttemptId = `${runtimeBase.runId}.${this.safeId(spec.slotId)}.call-${callIndex}`;
    const invocationAttemptId = retryAttemptIndex === 0
      ? baseInvocationAttemptId
      : `${baseInvocationAttemptId}.retry-${retryAttemptIndex}`;
    return this.agentOrchestrator.invokeStructuredOutput<PaperImplementationTraceIntegrityRoleOutput>({
      title_card_id: runtimeBase.titleCardId,
      feature_id: 'paper_implementation',
      node_id: spec.slotId,
      workflow_run_id: runtimeBase.runId,
      node_attempt_id: `${runtimeBase.runId}.${this.safeId(spec.slotId)}.attempt-0`,
      invocation_attempt_id: invocationAttemptId,
      execution_mode: request.execution_mode,
      executor_kind: 'multi_agent_debate',
      run_mode: this.topicRunMode(request.run_mode),
      profile_id: runtimeBase.modelProfileId,
      output_contract: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_OUTPUT_SCHEMA_ID,
      model_option_id: request.execution_mode === 'provider_llm' ? runtimeBase.modelOptionId : null,
      prompt: {
        promptTemplateId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID,
        version: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
      },
      prompt_variant_key: spec.promptVariantId,
      schema_name: 'paper_implementation_trace_integrity_role_output',
      schema: paperImplementationTraceIntegrityRoleOutputSchema as unknown as Record<string, unknown>,
      messages,
      input_refs: [
        request.target_ref,
        request.reviewed_statement_packet_ref,
        ...request.source_refs,
      ],
      context_packet_refs: [{
        ref_type: 'artifact_ref',
        ref_id: runtimeBase.retrievalPacketRef.ref_id,
        title_card_id: runtimeBase.titleCardId,
      }],
      context_packet_hashes: [runtimeBase.retrievalPacketHash],
      runtime_token_budget: this.runtimeTokenBudget(runtimeBase, request, spec, priorArtifacts, messages),
      debate_extension: this.debateExtension(runtimeBase, spec, callIndex, priorArtifacts),
      mocked_output: request.execution_mode === 'mocked_llm' && output
        ? {
          fixture_id: `${runtimeBase.runId}.${this.safeId(spec.slotId)}.fixture`,
          output,
          mock_profile: 'trace_integrity_boundary_debate',
        }
        : null,
      codex_response: request.execution_mode === 'codex_assisted' && output
        ? {
          output,
          operator_label: 'codex-local',
          response_source: 'operator_supplied',
        }
        : null,
      created_by: this.createdBy(request.execution_mode),
    });
  }

  private async recordPreflightBlockedArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    blockerCodes: string[],
    warningCodes: string[],
  ): Promise<RecordedRuntimeArtifact> {
    const output: PaperImplementationTraceIntegrityRoleOutput = {
      role_slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_PREFLIGHT_ROLE_SLOT_ID,
      role_status: 'blocked',
      summary: 'Deterministic trace-integrity preflight found blockers before semantic role execution.',
      reviewed_statement_refs: [...request.reviewed_statement_refs],
      cited_source_refs: [...request.source_refs],
      blocker_codes: blockerCodes,
      warning_codes: warningCodes,
    };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, output, []);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_PREFLIGHT_ROLE_SLOT_ID,
      callIndex: 1,
      executorKind: 'deterministic_preflight',
      artifactContractId: 'TraceIntegrityRoleArtifact',
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: 'trace_integrity_role_artifact',
      artifactPayloadSeed: 'preflight_blocked',
      promptPacketHash: this.hash({
        run_id: runtimeBase.runId,
        role_slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_PREFLIGHT_ROLE_SLOT_ID,
        retrieval_packet_hash: runtimeBase.retrievalPacketHash,
      }),
      promptVariantId: 'deterministic-preflight',
      runtimeStatus: 'blocked',
      runtimeFailureCode: null,
      providerCallCount: 0,
      blockerCodes: output.blocker_codes,
      warningCodes: output.warning_codes,
      output,
      artifactPayload,
      priorRoleArtifacts: [],
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(artifact);
    const admission = await this.admit(stored, 'role');
    return { artifact: stored, admission, output };
  }

  private async recordRoleArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    spec: RoleSpec,
    callIndex: number,
    priorArtifacts: RecordedRuntimeArtifact[],
    roleInvocation: RoleInvocationOutcome,
  ): Promise<RecordedRuntimeArtifact> {
    const roleResult = roleInvocation.result;
    const output = roleResult.structured_output;
    // S2-C C1: the role-level failure code is classified once in the bounded
    // retry loop (echo mismatch / blocked-without-codes included); an exhausted
    // retry lands here as a terminal failed_runtime artifact — never an HTTP
    // exception that would orphan the already-admitted prior roles.
    const runtimeFailureCode = roleInvocation.runtimeFailureCode;
    const runtimeStatus = runtimeFailureCode
      ? 'failed_runtime'
      : output?.role_status === 'blocked' ? 'blocked' : 'passed';
    const artifactOutput = runtimeFailureCode
      ? {
        status: 'failed_runtime',
        error_code: runtimeFailureCode,
        blocker_codes: [runtimeFailureCode],
      }
      : output ?? {
        status: 'failed_runtime',
        error_code: 'AGENT_EXECUTION_FAILED',
        blocker_codes: roleResult.blocker_codes,
      };
    const warningCodes = this.uniqueStrings([
      ...runtimeBase.retrievalWarningCodes,
      ...(output?.warning_codes ?? roleResult.warning_codes),
      ...this.retryWarningCodes(roleInvocation, runtimeFailureCode),
    ]);
    const artifactPayload = this.roleArtifactPayload(
      runtimeBase,
      request,
      artifactOutput,
      priorArtifacts,
    );

    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: spec.slotId,
      callIndex,
      executorKind: spec.executorKind,
      artifactContractId: 'TraceIntegrityRoleArtifact',
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: 'trace_integrity_role_artifact',
      artifactPayloadSeed: spec.slotId,
      promptPacketHash: roleResult.provenance.prompt_packet_hash,
      promptVariantId: spec.promptVariantId,
      runtimeStatus,
      runtimeFailureCode,
      retryAttemptIndex: roleInvocation.retryAttemptIndex,
      providerCallCount: roleInvocation.providerCallCount,
      blockerCodes: runtimeFailureCode ? [runtimeFailureCode] : output?.blocker_codes ?? [],
      warningCodes,
      output: artifactOutput,
      artifactPayload,
      priorRoleArtifacts: priorArtifacts,
      modelOptionId: roleResult.provenance.model_option_id,
      responseReuseRef: roleResult.provenance.response_reuse_ref,
      responseHash: roleResult.provenance.structured_output_hash,
      tokenBudgetGateResult: roleResult.token_budget_gate_result,
      promptPacketCacheStatus: roleResult.provenance.prompt_packet_cache_status,
      promptPacketCacheResultRef: roleResult.provenance.prompt_packet_cache_result_ref,
      promptPacketCacheResultHash: roleResult.provenance.prompt_packet_cache_result_hash,
      compressionReportRef: roleResult.provenance.compression_report_ref,
      compressionReportHash: roleResult.provenance.compression_report_hash,
      compressedContextHash: roleResult.provenance.compressed_context_hash,
      auditHash: this.hash(roleResult.audit_snapshot),
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(artifact);
    const admission = await this.admit(stored, 'role');
    return { artifact: stored, admission, output: runtimeFailureCode ? null : output ?? null };
  }

  private async recordFinalArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    input: {
      roleArtifacts: RecordedRuntimeArtifact[];
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      providerCallCount: number;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): Promise<{ artifact: PaperImplementationRuntimeArtifactEnvelope; admission: PaperImplementationRuntimeAdmissionRecord }> {
    const finalPayload = this.finalPayload(runtimeBase, request, input);
    const lastRole = input.roleArtifacts[input.roleArtifacts.length - 1]?.artifact ?? null;
    const finalArtifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'final',
      roleSlotId: null,
      callIndex: null,
      executorKind: 'bounded_semantic_debate',
      artifactContractId: 'TraceIntegrityDebateArtifact',
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_FINAL_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: 'trace_integrity_debate_artifact',
      artifactPayloadSeed: 'final',
      promptPacketHash: lastRole?.prompt_packet_hash ?? this.hash({ final: runtimeBase.runId }),
      promptVariantId: 'arbiter.final',
      runtimeStatus: input.status,
      runtimeFailureCode: input.runtimeFailureCode,
      retryAttemptIndex: 0,
      providerCallCount: input.providerCallCount,
      blockerCodes: input.blockerCodes,
      warningCodes: this.uniqueStrings([
        ...runtimeBase.retrievalWarningCodes,
        ...input.warningCodes,
      ]),
      output: finalPayload,
      artifactPayload: finalPayload as unknown as Record<string, unknown>,
      priorRoleArtifacts: input.roleArtifacts,
      finalArtifactHash: this.hash(finalPayload),
      finalArtifactRefType: 'trace_integrity_debate_artifact',
      modelOptionId: lastRole?.model_option_id ?? runtimeBase.modelOptionId,
      auditHash: this.hash({
        run_id: runtimeBase.runId,
        final_payload_hash: this.hash(finalPayload),
        role_artifact_hashes: input.roleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      }),
    });
    const stored = await this.runtimeAdmission.recordRuntimeArtifact(finalArtifact);
    const admission = await this.admit(stored, 'final');
    return { artifact: stored, admission };
  }

  private buildRuntimeArtifact(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    input: BuildArtifactInput,
  ): PaperImplementationRuntimeArtifactEnvelope {
    const artifactPayload = this.jsonSafeObject(input.artifactPayload ?? this.outputArtifactPayload(input.output));
    const payloadHash = this.hash(artifactPayload);
    const promptPacketHash = input.promptPacketHash;
    const promptPacketRef = this.ref('runtime_prompt_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.prompt`, request);
    const contextPacketHash = this.hash({
      run_id: runtimeBase.runId,
      role_slot_id: input.roleSlotId,
      retrieval_packet_hash: runtimeBase.retrievalPacketHash,
      prior_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
    });
    const sourceHashBundleHash = runtimeBase.sourceHashBundleHash;
    const runtimeIdentity = {
      // S2-C C2: run_id pins the identity granularity explicitly to one runtime
      // run — replaying the same run_id (idempotent double-submit) collides on
      // the runtimeIdentityHash unique constraint (409), while a legitimate
      // re-advance/new run always carries a fresh run_id and never collides.
      run_id: runtimeBase.runId,
      implementation_project_id: runtimeBase.implementationProjectId,
      workflow_type: 'trace_integrity_review',
      slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      artifact_scope: input.artifactScope,
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      target_ref: request.target_ref,
      retrieval_packet_hash: runtimeBase.retrievalPacketHash,
      reviewed_statement_packet_hash: request.reviewed_statement_packet_hash,
      prompt_packet_hash: promptPacketHash,
      output_schema_id: input.outputSchemaId,
      execution_mode: request.execution_mode,
      model_profile_id: runtimeBase.modelProfileId,
      model_option_id: input.modelOptionId ?? runtimeBase.modelOptionId,
      prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      source_hash_bundle_hash: sourceHashBundleHash,
    };
    const runtimeIdentityHash = this.hash(runtimeIdentity);
    const artifactPayloadRef = this.ref(
      input.artifactPayloadRefType,
      `${runtimeBase.runId}.${this.safeId(input.artifactPayloadSeed)}`,
      request,
      payloadHash,
    );
    const finalArtifactRef = input.artifactScope === 'final'
      ? this.ref(
        input.finalArtifactRefType ?? input.artifactPayloadRefType,
        `${runtimeBase.runId}.final`,
        request,
        input.finalArtifactHash ?? payloadHash,
      )
      : null;
    const tokenBudgetGateResult = input.tokenBudgetGateResult ?? {
      runtime_gate_status: 'not_applicable',
      role_slot_id: input.roleSlotId,
      context_packet_hash: contextPacketHash,
      prompt_packet_hash: promptPacketHash,
    };
    const tokenBudgetHash = this.hash(tokenBudgetGateResult);
    const promptPacketCacheStatus = this.promptPacketCacheStatus(input.promptPacketCacheStatus);
    const compressionApplied = Boolean(input.compressionReportRef && input.compressionReportHash && input.compressedContextHash);
    const artifactWithoutIdentity: Omit<PaperImplementationRuntimeArtifactEnvelope, 'artifact_identity_hash'> = {
      schema_version: PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
      runtime_artifact_id: this.idFactory(`pi_runtime_${input.artifactScope}`),
      runtime_identity_hash: runtimeIdentityHash,
      implementation_project_id: runtimeBase.implementationProjectId,
      workflow_type: 'trace_integrity_review',
      slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      artifact_scope: input.artifactScope,
      artifact_contract_id: input.artifactContractId,
      artifact_contract_version: input.artifactContractVersion,
      target_ref: request.target_ref,
      target_version_id: request.target_version_id ?? null,
      input_snapshot_ref: request.input_snapshot_ref,
      input_snapshot_hash: request.input_snapshot_hash,
      source_hash_bundle_hash: sourceHashBundleHash,
      created_by: this.createdBy(request.execution_mode),
      created_at: this.now(),
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      prior_role_artifact_refs: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_ref),
      prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      role_chain_hash: this.hash(input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash)),
      final_artifact_ref: finalArtifactRef,
      final_artifact_hash: input.artifactScope === 'final' ? input.finalArtifactHash ?? payloadHash : null,
      run_mode: request.run_mode,
      execution_mode: request.execution_mode,
      executor_kind: input.executorKind,
      model_profile_id: runtimeBase.modelProfileId,
      model_option_id: input.modelOptionId ?? runtimeBase.modelOptionId,
      runtime_status: input.runtimeStatus,
      runtime_failure_code: input.runtimeFailureCode,
      retry_attempt_index: input.retryAttemptIndex ?? 0,
      provider_call_count: input.providerCallCount,
      response_reuse_status: this.responseReuseStatus(request.execution_mode, input.responseReuseRef),
      response_reuse_decision_ref: input.responseReuseRef
        ? this.ref('response_reuse_decision', input.responseReuseRef, request)
        : null,
      response_reuse_decision_hash: input.responseReuseRef ? this.hash(input.responseReuseRef) : null,
      allowed_side_effects: [],
      retrieval_packet_ref: runtimeBase.retrievalPacketRef,
      retrieval_packet_hash: runtimeBase.retrievalPacketHash,
      reviewed_statement_packet_ref: request.reviewed_statement_packet_ref,
      reviewed_statement_packet_hash: request.reviewed_statement_packet_hash,
      context_packet_ref: this.ref('runtime_context_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.context`, request),
      context_packet_hash: contextPacketHash,
      runtime_invocation_context_hash: this.hash(runtimeIdentity),
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      cache_policy_profile_hash: runtimeBase.cachePolicyProfileHash,
      source_refs: [...request.source_refs],
      source_hashes: [...request.source_hashes],
      prompt_packet_ref: promptPacketRef,
      prompt_packet_hash: promptPacketHash,
      prompt_template_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID,
      prompt_template_version_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
      prompt_variant_id: input.promptVariantId,
      prompt_redaction_policy_hash: runtimeBase.promptRedactionPolicyHash,
      output_schema_id: input.outputSchemaId,
      context_cache_key_hash: this.hash({
        cache: 'context',
        retrieval_packet_hash: runtimeBase.retrievalPacketHash,
        source_hash_bundle_hash: sourceHashBundleHash,
      }),
      context_cache_status: 'miss',
      context_cache_result_ref: null,
      context_cache_result_hash: null,
      prompt_packet_cache_key_hash: this.hash({
        cache: 'prompt',
        prompt_packet_hash: promptPacketHash,
        role_slot_id: input.roleSlotId,
      }),
      prompt_packet_cache_status: promptPacketCacheStatus,
      prompt_packet_cache_result_ref: input.promptPacketCacheResultRef ?? null,
      prompt_packet_cache_result_hash: input.promptPacketCacheResultHash ?? null,
      token_budget_gate_result_ref: this.ref(
        'token_budget_gate_result',
        `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.token-budget`,
        request,
        tokenBudgetHash,
      ),
      token_budget_gate_result_hash: tokenBudgetHash,
      compression_policy_profile_hash: runtimeBase.compressionPolicyProfileHash,
      compression_status: compressionApplied ? 'applied' : 'not_needed',
      compression_report_ref: input.compressionReportRef ?? null,
      compression_report_hash: input.compressionReportHash ?? null,
      compressed_context_packet_ref: input.compressedContextHash
        ? this.ref(
          'compressed_context_packet',
          `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.compressed-context`,
          request,
          input.compressedContextHash,
        )
        : null,
      compressed_context_packet_hash: input.compressedContextHash ?? null,
      artifact_payload: artifactPayload,
      artifact_payload_ref: artifactPayloadRef,
      artifact_payload_hash: payloadHash,
      output_hash: input.responseHash ?? payloadHash,
      runtime_audit_ref: this.ref('runtime_audit_envelope', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.audit`, request),
      runtime_audit_hash: input.auditHash ?? this.hash({ runtime_identity: runtimeIdentityHash, payload_hash: payloadHash }),
      blocker_codes: this.uniqueStrings(input.blockerCodes),
      warning_codes: this.uniqueStrings(input.warningCodes),
    };
    return {
      ...artifactWithoutIdentity,
      artifact_identity_hash: this.hash(artifactWithoutIdentity),
    };
  }

  private finalPayload(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    input: {
      roleArtifacts: RecordedRuntimeArtifact[];
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      blockerCodes: string[];
    },
  ): PaperImplementationTraceIntegrityDebateArtifact {
    const roleArtifacts = input.roleArtifacts.map((item) => item.artifact);
    const roleOutputs = input.roleArtifacts.flatMap((item) => item.output ? [item.output] : []);
    const admittedRoleRefs = input.roleArtifacts
      .map((item) => item.admission.admitted_artifact_ref)
      .filter((item): item is TopicSelectionFunctionalRef => item !== null);
    const admittedRoleHashes = input.roleArtifacts
      .map((item) => item.admission.admitted_artifact_hash)
      .filter((item): item is string => item !== null);
    return {
      status: input.status,
      target_ref: request.target_ref,
      reviewed_statement_refs: [...request.reviewed_statement_refs],
      retrieval_packet: runtimeBase.retrievalPacket,
      retrieval_packet_ref: runtimeBase.retrievalPacketRef,
      retrieval_packet_hash: runtimeBase.retrievalPacketHash,
      preflight_blockers: this.uniqueStrings([
        ...(request.preflight_blocker_codes ?? []),
        ...runtimeBase.retrievalPacket.blocker_codes,
      ]),
      support_map: {
        role_outputs: roleOutputs.filter((item) => item.role_slot_id.includes('support_mapper')),
      },
      challenge_findings: roleOutputs
        .filter((item) => item.role_slot_id === 'trace_integrity_review.skeptic_challenge')
        .map((item) => ({
          summary: item.summary,
          blocker_codes: item.blocker_codes,
          cited_source_refs: item.cited_source_refs,
          // S3-α2: structured per-finding view carried into the final artifact.
          findings: item.challenge_findings ?? [],
        })),
      finding_resolution_map: {
        role_outputs: roleOutputs.filter((item) => item.role_slot_id.includes('reconcile')),
      },
      semantic_coverage_status: input.status === 'passed'
        ? 'complete'
        : input.status === 'blocked' ? 'blocked' : 'partial_with_warnings',
      arbiter_blocker_codes: roleOutputs
        .find((item) => item.role_slot_id === 'trace_integrity_review.arbiter_final')
        ?.blocker_codes ?? input.blockerCodes,
      blockers: this.uniqueStrings(input.blockerCodes),
      runtime_failure_code: input.runtimeFailureCode,
      role_artifact_refs: roleArtifacts.map((item) => item.artifact_payload_ref),
      role_artifact_hashes: roleArtifacts.map((item) => item.artifact_payload_hash),
      admitted_role_artifact_refs: admittedRoleRefs,
      admitted_role_artifact_hashes: admittedRoleHashes,
      role_prompt_packet_refs: roleArtifacts.map((item) => item.prompt_packet_ref),
      role_prompt_packet_hashes: roleArtifacts.map((item) => item.prompt_packet_hash),
      role_token_budget_gate_result_refs: roleArtifacts.map((item) => item.token_budget_gate_result_ref),
      role_compression_report_refs: roleArtifacts
        .map((item) => item.compression_report_ref)
        .filter((item): item is TopicSelectionFunctionalRef => item !== null),
      runtime_identity: {
        run_id: runtimeBase.runId,
        slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
        role_artifact_hashes: roleArtifacts.map((item) => item.artifact_payload_hash),
        retrieval_packet_hash: runtimeBase.retrievalPacketHash,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      },
      cache_identity: {
        context_cache_key_hashes: roleArtifacts.map((item) => item.context_cache_key_hash),
        prompt_packet_cache_key_hashes: roleArtifacts.map((item) => item.prompt_packet_cache_key_hash),
      },
      source_refs: [...request.source_refs],
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
    };
  }

  private async admit(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    admissionScope: 'role' | 'final',
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    const base = {
      implementation_project_id: artifact.implementation_project_id,
      runtime_artifact_id: artifact.runtime_artifact_id,
      admission_policy_id: admissionScope === 'final'
        ? 'paper-implementation.trace-integrity.final-admission'
        : 'paper-implementation.trace-integrity.role-admission',
      admission_policy_version: 'v1',
      expected_runtime_identity_hash: artifact.runtime_identity_hash,
      expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
      expected_retrieval_packet_hash: artifact.retrieval_packet_hash,
      expected_prompt_packet_hash: artifact.prompt_packet_hash,
      expected_output_schema_id: artifact.output_schema_id,
      expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    };
    if (admissionScope === 'final') {
      if (!artifact.final_artifact_hash) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Final runtime artifact is missing final_artifact_hash.');
      }
      return this.runtimeAdmission.admitRuntimeArtifact({
        ...base,
        admission_scope: 'final',
        expected_final_artifact_hash: artifact.final_artifact_hash,
      });
    }
    return this.runtimeAdmission.admitRuntimeArtifact({
      ...base,
      admission_scope: 'role',
      expected_final_artifact_hash: null,
    });
  }

  /**
   * D9 resume engine (T-124 S3 F1-0): the trace-integrity debate and P1 review
   * services share one implementation of idempotent replay, admitted prefix reuse,
   * and per-artifact identity pinning. This slot pins the boundary-debate slot
   * identity and adds the two trace-only identity facets (retrieval packet hash,
   * reviewed statement packet hash) via extraIdentityChecks.
   */
  private resumeEngine(): PaperImplementationRuntimeResumeEngine<PaperImplementationTraceIntegrityRoleOutput> {
    return new PaperImplementationRuntimeResumeEngine(this.runtimeAdmission, {
      slotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      finalArtifactRefType: 'trace_integrity_debate_artifact',
      promptTemplateId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID,
      promptTemplateVersion: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
      roleOutputSchemaId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_ROLE_OUTPUT_SCHEMA_ID,
      roleSlotIds: ROLE_SPECS.map((spec) => spec.slotId),
      extraIdentityChecks: (artifact, facets) => {
        const issues: string[] = [];
        if (artifact.retrieval_packet_hash !== facets.retrievalPacketHash) {
          issues.push(RESUME_ISSUE_CODES.RETRIEVAL_PACKET_HASH_DRIFT);
        }
        if (artifact.reviewed_statement_packet_hash !== facets.reviewedStatementPacketHash) {
          issues.push(RESUME_ISSUE_CODES.REVIEWED_STATEMENT_PACKET_DRIFT);
        }
        return issues;
      },
    });
  }

  private resumeIdentity(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
  ): ResumeRequestIdentity {
    return {
      implementationProjectId: runtimeBase.implementationProjectId,
      runId: runtimeBase.runId,
      sourceHashBundleHash: runtimeBase.sourceHashBundleHash,
      inputSnapshotHash: request.input_snapshot_hash,
      targetRef: request.target_ref,
      modelProfileId: runtimeBase.modelProfileId,
      modelOptionId: runtimeBase.modelOptionId,
      executionMode: request.execution_mode,
      extraFacets: {
        retrievalPacketHash: runtimeBase.retrievalPacketHash,
        reviewedStatementPacketHash: request.reviewed_statement_packet_hash,
      },
    };
  }

  private runtimeBase(
    implementationProjectId: string,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    runId: string,
    retrievalResult: PaperImplementationTraceIntegrityRetrievalResult,
  ): RuntimeBase {
    const contextPolicyProfile = this.contextPolicyProfile();
    const contextPolicyProfileHash = this.hash(contextPolicyProfile);
    const retrievalPacketHash = retrievalResult.packet_hash;
    const sourceHashBundleHash = this.hash({
      retrieval_packet_hash: retrievalPacketHash,
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
    });
    return {
      implementationProjectId,
      runId,
      titleCardId: this.titleCardId(request),
      retrievalPacket: retrievalResult.packet,
      retrievalPacketRef: retrievalResult.packet_ref,
      retrievalPacketHash,
      retrievalWarningCodes: retrievalResult.warning_codes,
      sourceHashBundleHash,
      modelProfileId: request.model_profile_id?.trim() || PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
      modelOptionId: request.execution_mode === 'provider_llm'
        ? request.model_option_id?.trim() || null
        : null,
      contextPolicyProfile,
      contextPolicyProfileHash,
      cachePolicyProfileHash: this.hash(contextPolicyProfile.cache_policy),
      promptRedactionPolicyHash: this.hash({
        policy_id: 'paper-implementation.trace-integrity.prompt-redaction.v1',
        store_rendered_prompt: false,
      }),
      compressionPolicyProfileHash: this.hash(contextPolicyProfile.compression_policy),
      // S4 复审 FA-5 shadow inputs: prior_blocker_density is a known degraded
      // axis, constant 0 (zero variance) until D2 wires coordinator context —
      // see the shadow contract header. The other two axes are real request
      // signals (statement refs / source refs).
      shadowTier: assessPaperImplementationDebateComplexityShadow({
        reviewed_statement_count: request.reviewed_statement_refs.length,
        retrieval_packet_ref_count: request.source_refs.length,
        prior_blocker_density: 0,
        target_kind: 'trace_integrity',
      }).recommended_tier,
    };
  }

  private roleMessages(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    spec: RoleSpec,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Return only structured JSON for the requested PaperImplementation trace integrity debate role.',
          'Do not write trace repairs, claims, dossier readiness, work orders, queue items, prompt text, or raw provider output.',
          'Cite only refs from the bounded retrieval packet; prior role artifacts are context and must not be used as cited refs.',
          // Prompt template v2 (T-124 S3-α2): role-specific structured section.
          this.roleStructuredOutputInstruction(spec.slotId),
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          role_slot_id: spec.slotId,
          target_ref: request.target_ref,
          retrieval_packet: runtimeBase.retrievalPacket,
          retrieval_packet_ref: runtimeBase.retrievalPacketRef,
          retrieval_packet_hash: runtimeBase.retrievalPacketHash,
          reviewed_statement_packet_ref: request.reviewed_statement_packet_ref,
          reviewed_statement_packet_hash: request.reviewed_statement_packet_hash,
          reviewed_statement_refs: request.reviewed_statement_refs,
          source_refs: request.source_refs,
          source_hashes: request.source_hashes,
          prior_role_artifact_refs: priorArtifacts.map((item) => item.admission.admitted_artifact_ref),
          prior_role_artifact_hashes: priorArtifacts.map((item) => item.admission.admitted_artifact_hash),
          prior_role_outputs: priorArtifacts.flatMap((item) => item.output ? [item.output] : []),
        }),
      },
    ];
  }

  private roleStructuredOutputInstruction(
    roleSlotId: PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
  ): string {
    switch (roleSlotId) {
      case 'trace_integrity_review.support_mapper_map':
        return 'Emit per_statement_support_map with one entry per reviewed statement '
          + '(support_kind: direct|partial|background_only|conflicting|missing); '
          + 'every non-missing entry must cite at least one packet ref in cited_refs.';
      case 'trace_integrity_review.skeptic_challenge':
        return 'Emit challenge_findings: one entry per distinct issue with a unique finding_id, '
          + 'severity (blocker|major|minor), a blocker_code from the trace-integrity taxonomy, '
          + 'a target_statement_ref from the reviewed statements, and cited_refs from the packet.';
      case 'trace_integrity_review.support_mapper_reconcile':
        return 'Emit finding_dispositions with exactly one disposition per skeptic finding_id '
          + '(accepted_blocker|resolved_with_refs|rebutted_with_refs|context_gap_blocker); '
          + 'resolved_with_refs and rebutted_with_refs require non-empty cited_refs from the packet.';
      case 'trace_integrity_review.arbiter_final':
        return 'Emit coverage listing every reviewed statement ref and every skeptic finding_id, '
          + 'and carry the blocker_code of every accepted_blocker/context_gap_blocker finding into blocker_codes.';
      default:
        return '';
    }
  }

  // S2-A boundary note: this debate slot deliberately does NOT wire the caller-side
  // compression attempt (PC-S1..S3). Its compression-aware recovery belongs to the
  // debate-path facts builder downstream of STEP-7 (D-T128-02: "跟其后做、不独立建"),
  // i.e. T-124 S3+. Over-budget retrieval context therefore still fail-closes
  // (L5 `trace_over_budget_zero_provider_calls`). The N3 token double-count fix
  // below applies here regardless.
  private runtimeTokenBudget(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    spec: RoleSpec,
    priorArtifacts: RecordedRuntimeArtifact[],
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    return {
      context_policy_profile: runtimeBase.contextPolicyProfile,
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      // N3 double-count fix: the retrieval packet and prior role outputs are already
      // embedded verbatim in `messages`; context_payloads must not re-carry them —
      // the estimate below is the single source of truth.
      context_payloads: [],
      extra_payloads: [{
        role_slot_id: spec.slotId,
        reviewed_statement_refs: request.reviewed_statement_refs,
        source_refs: request.source_refs,
        prior_role_artifact_hashes: priorArtifacts.map((item) => item.artifact.artifact_payload_hash),
      }],
      estimated_input_tokens_override: this.estimatedInputTokens({ messages }),
      schema_overhead_tokens_override: 800,
    };
  }

  private debateExtension(
    runtimeBase: RuntimeBase,
    spec: RoleSpec,
    callIndex: number,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): TopicSelectionAgentDebateExtension {
    return {
      debate_loop_id: runtimeBase.runId,
      debate_policy_id: 'paper-implementation.trace-integrity.boundary-debate.v1',
      round_index: callIndex,
      role: this.debateRole(spec.slotId),
      stage: spec.promptVariantId,
      agent_instance_id: spec.slotId,
      parent_invocation_attempt_ids: priorArtifacts.map((item) => (
        `${runtimeBase.runId}.${this.safeId(item.artifact.role_slot_id ?? 'role')}.call-${item.artifact.call_index ?? 0}`
      )),
    };
  }

  private contextPolicyProfile(): TopicSelectionContextPolicyProfile {
    return {
      schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
      context_policy_profile_id: 'paper-implementation.trace-integrity.context-policy.v1',
      context_policy_profile_version: 'v1',
      invocation_slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      functional_template: 'support_only_semantic',
      execution_modifiers: [
        'provider_required_live',
        'codex_exact_reuse_allowed',
        'mock_replay_allowed',
        'compression_allowed_with_quality_gate',
      ],
      context_family: 'paper_implementation_trace_integrity_review',
      allowed_source_kinds: [
        'authority_record',
        'ref_backed_artifact',
        'prior_llm_output',
      ],
      memory_policy: {
        allowed_memory_families: [],
        required_use_labels: [],
        stale_behavior: 'block',
        missing_required_memory_behavior: 'allow',
        durable_memory_as_standalone_evidence: false,
      },
      compression_policy: {
        compression_mode: 'required_when_over_budget',
        allowed_executor_kinds: ['deterministic_structural', 'codex_assisted'],
        compression_strategy_id: 'paper-implementation-trace-integrity-context-compression',
        compression_strategy_version: 'v1',
        preserved_fact_kinds: [
          'reviewed_statement_text',
          'source_family',
          'source_hash',
          'evidence_role',
          'support_mapping',
          'skeptic_challenge',
          'arbiter_blocker',
        ],
        forbidden_payload_classes: [
          'raw_provider_response',
          'provider_secret',
          'hidden_reasoning',
          'rendered_prompt_text',
        ],
        quality_gate_required: true,
      },
      cache_policy: {
        cache_enabled: true,
        cache_scope: 'context_identity_preprocessing',
        exact_key_fields: [
          'retrieval_packet_hash',
          'prompt_variant_id',
          'prior_role_artifact_hashes',
          'model_profile_id',
          'model_option_id',
          'context_policy_profile_hash',
        ],
        stale_behavior: 'block',
        post_cache_gates: [
          'schema_validation',
          'trace_integrity_admission',
          'authority_boundary',
        ],
      },
      token_budget_policy: {
        estimated_input_token_target: 24_000,
        estimated_output_token_budget: 1_800,
        context_window_tokens: 128_000,
        token_estimate_safety_margin: 1.25,
        unknown_estimate_behavior: 'blocked_over_budget',
      },
      reuse_policy: {
        provider_llm_response_reuse: 'blocked',
        codex_exact_reuse_requires_approval: true,
        mock_replay_allowed: true,
        provider_required_live_behavior: 'live_call_required',
      },
      post_reuse_gates: [
        'schema_validation',
        'trace_integrity_admission',
        'authority_boundary',
      ],
      provenance_policy: {
        runtime_audit_envelope_required: true,
        operator_audit_summary_required: false,
        human_trust_summary_required: false,
        forbidden_persisted_payload_classes: [
          'raw_provider_response',
          'provider_secret',
          'hidden_reasoning',
          'rendered_prompt_text',
        ],
      },
      redaction_policy: 'paper-implementation-trace-integrity-redaction-v1',
    };
  }

  private debateRole(
    roleSlotId: PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
  ): TopicSelectionAgentDebateExtension['role'] {
    if (roleSlotId === 'trace_integrity_review.skeptic_challenge') {
      return 'deep_critic';
    }
    if (roleSlotId === 'trace_integrity_review.arbiter_final') {
      return 'arbiter';
    }
    return 'explorer';
  }

  private roleArtifactPayload(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    output: unknown,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): Record<string, unknown> {
    const failedRuntime = this.isFailedRuntimeRolePayload(output);
    return {
      artifact_kind: 'trace_integrity_role_artifact_payload',
      target_ref: request.target_ref,
      reviewed_statement_refs: request.reviewed_statement_refs,
      retrieval_packet: failedRuntime ? null : runtimeBase.retrievalPacket,
      retrieval_packet_ref: runtimeBase.retrievalPacketRef,
      retrieval_packet_hash: runtimeBase.retrievalPacketHash,
      retrieval_packet_summary: failedRuntime ? this.retrievalPacketSummary(runtimeBase) : null,
      role_output: output,
      prior_role_outputs: priorArtifacts.flatMap((item) => item.output ? [item.output] : []),
      prior_role_artifact_refs: priorArtifacts.map((item) => item.admission.admitted_artifact_ref),
      prior_role_artifact_hashes: priorArtifacts.map((item) => item.admission.admitted_artifact_hash),
    };
  }

  private isFailedRuntimeRolePayload(output: unknown): boolean {
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      return false;
    }
    const record = output as Record<string, unknown>;
    return record.status === 'failed_runtime'
      || typeof record.error_code === 'string';
  }

  private retrievalPacketSummary(
    runtimeBase: RuntimeBase,
  ): Record<string, unknown> {
    return {
      retrieval_packet_id: runtimeBase.retrievalPacket.retrieval_packet_id,
      reviewed_statement_count: runtimeBase.retrievalPacket.reviewed_statements.length,
      source_count: runtimeBase.retrievalPacket.sources.length,
      source_family_coverage: runtimeBase.retrievalPacket.source_family_coverage,
      freshness_status: runtimeBase.retrievalPacket.freshness_status,
      blocker_codes: runtimeBase.retrievalPacket.blocker_codes,
      warning_codes: runtimeBase.retrievalPacket.warning_codes,
    };
  }

  private outputArtifactPayload(output: unknown): Record<string, unknown> {
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      return output as Record<string, unknown>;
    }
    return { output };
  }

  private jsonSafeObject(value: Record<string, unknown>): Record<string, unknown> {
    const jsonSafeValue = JSON.parse(JSON.stringify(value)) as unknown;
    if (jsonSafeValue && typeof jsonSafeValue === 'object' && !Array.isArray(jsonSafeValue)) {
      return jsonSafeValue as Record<string, unknown>;
    }
    return { output: jsonSafeValue ?? null };
  }

  private fixtureOutputForMode(
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    slotId: PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
  ): PaperImplementationTraceIntegrityRoleOutput | null {
    if (request.execution_mode === 'mocked_llm') {
      return request.mocked_role_outputs?.[slotId] ?? null;
    }
    if (request.execution_mode === 'codex_assisted') {
      return request.codex_role_outputs?.[slotId] ?? null;
    }
    return null;
  }

  private assertRequest(request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest): void {
    if (request.source_refs.length !== request.source_hashes.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_refs and source_hashes must have the same length.');
    }
    assertResumeRunIdConsistency(
      request.run_id?.trim() || null,
      request.resume_from_run_id?.trim() || null,
    );
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const requestedProfileId = request.model_profile_id?.trim() || null;
    if (requestedProfileId && requestedProfileId !== PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_profile_id must match runtime slot profile ${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.`,
      );
    }
    if (request.execution_mode !== 'provider_llm' && request.model_option_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires execution_mode=provider_llm.');
    }
    if (
      request.execution_mode === 'provider_llm'
      && (this.hasRoleOutputs(request.mocked_role_outputs) || this.hasRoleOutputs(request.codex_role_outputs))
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs.',
      );
    }
    const requestedModelOptionId = request.model_option_id?.trim() || null;
    if (
      request.execution_mode === 'provider_llm'
      && requestedModelOptionId
      && !requestedModelOptionId.startsWith(`${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.`)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_option_id must belong to runtime slot profile ${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.`,
      );
    }
    if (request.execution_mode === 'mocked_llm') {
      this.assertAllRoleOutputsPresent(request.mocked_role_outputs, 'mocked_role_outputs');
    }
    if (request.execution_mode === 'codex_assisted') {
      this.assertAllRoleOutputsPresent(request.codex_role_outputs, 'codex_role_outputs');
    }
  }

  private assertAllRoleOutputsPresent(
    outputs: Partial<Record<
      PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
      PaperImplementationTraceIntegrityRoleOutput
    >> | undefined,
    fieldName: string,
  ): void {
    for (const slotId of PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS) {
      if (!outputs?.[slotId]) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.${slotId} is required.`);
      }
    }
  }

  private hasRoleOutputs(
    outputs: Partial<Record<
      PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
      PaperImplementationTraceIntegrityRoleOutput
    >> | undefined,
  ): boolean {
    return Boolean(outputs && Object.keys(outputs).length > 0);
  }

  private result(
    runId: string,
    status: 'passed' | 'blocked' | 'failed_runtime',
    providerCallCount: number,
    artifacts: PaperImplementationRuntimeArtifactEnvelope[],
    admissions: PaperImplementationRuntimeAdmissionRecord[],
    finalArtifact: PaperImplementationRuntimeArtifactEnvelope | null,
    finalAdmission: PaperImplementationRuntimeAdmissionRecord | null,
  ): PaperImplementationTraceIntegrityDebateRuntimeResult {
    const workflowType = 'trace_integrity_review';
    return {
      run_id: runId,
      slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
      workflow_type: workflowType,
      status,
      provider_call_count: providerCallCount,
      runtime_artifacts: artifacts,
      admission_records: admissions,
      final_runtime_artifact: finalArtifact,
      final_admission_record: finalAdmission,
      blocker_codes: this.uniqueStrings(artifacts.flatMap((item) => item.blocker_codes)),
      warning_codes: this.uniqueStrings(artifacts.flatMap((item) => item.warning_codes)),
      operational_telemetry: buildPaperImplementationRuntimeOperationalTelemetry({
        runId,
        workflowType,
        slotId: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
        status,
        providerCallCount,
        artifacts,
        admissions,
        finalArtifact,
        finalAdmission,
      }),
    };
  }

  private responseReuseStatus(
    executionMode: PaperImplementationAgentExecutionMode,
    responseReuseRef?: string | null,
  ): PaperImplementationRuntimeArtifactEnvelope['response_reuse_status'] {
    if (executionMode === 'provider_llm') {
      return 'miss';
    }
    if (responseReuseRef) {
      return 'hit_non_provider';
    }
    return 'not_applicable';
  }

  private promptPacketCacheStatus(
    status: TopicSelectionRuntimeCacheResult | null | undefined,
  ): PaperImplementationRuntimeCacheStatus {
    return status ?? 'not_applicable';
  }

  private estimatedInputTokens(value: unknown): number {
    return Math.ceil(stableStringify(value).length / 4);
  }

  private providerCallCount(
    result: TopicSelectionAgentInvocationResult<unknown>,
  ): number {
    if (result.provenance.execution_mode !== 'provider_llm') {
      return 0;
    }
    return result.provenance.telemetry?.request_count ?? (result.status === 'succeeded' ? 1 : 0);
  }

  private runtimeFailureCode(
    result: TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>,
  ): string | null {
    return result.status === 'succeeded' && result.structured_output
      ? null
      : result.error_code ?? 'AGENT_EXECUTION_FAILED';
  }

  /**
   * S2-C C1 (review N3): besides orchestrator-reported failures, two
   * structurally legal role outputs are classified as retryable technical
   * failures (SCHEMA_VALIDATION_FAILED semantics — one same-profile retry,
   * then terminal failed_runtime) instead of an HTTP 400 or a hard admission
   * rejection that kills the whole chain:
   * - a wrong `role_slot_id` echo (the schema enum admits every role value),
   * - `role_status='blocked'` with an empty `blocker_codes` list.
   *
   * T-124 S3-α2/α3 (review N2): the deepened role contract is enforced here as
   * well — the role-specific structured field must be present and semantically
   * complete (refs ⊆ retrieval packet, one disposition per finding, arbiter
   * coverage, accepted blockers in the final blocker set). These checks run for
   * BOTH passed and blocked role outputs, closing the N2 blocked bypass.
   */
  private roleInvocationFailureCode(
    runtimeBase: RuntimeBase,
    spec: RoleSpec,
    result: TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): string | null {
    const runtimeFailureCode = this.runtimeFailureCode(result);
    if (runtimeFailureCode) {
      return runtimeFailureCode;
    }
    const output = result.structured_output;
    if (output && output.role_slot_id !== spec.slotId) {
      return PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE;
    }
    if (
      output
      && output.role_status === 'blocked'
      && output.blocker_codes.filter((code) => code.trim().length > 0).length === 0
    ) {
      return PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE;
    }
    if (output) {
      return evaluatePaperImplementationTraceIntegrityRoleSemantics({
        roleSlotId: spec.slotId,
        output,
        reviewedStatementRefs: runtimeBase.retrievalPacket.reviewed_statements
          .map((statement) => statement.statement_ref),
        sourceRefs: runtimeBase.retrievalPacket.sources.map((source) => source.source_ref),
        priorOutputs: priorArtifacts.flatMap((item) => item.output ? [item.output] : []),
      });
    }
    return null;
  }

  private retryWarningCodes(
    roleInvocation: RoleInvocationOutcome,
    runtimeFailureCode: string | null,
  ): string[] {
    if (roleInvocation.retryAttemptIndex === 0) {
      return [];
    }
    return runtimeFailureCode
      ? ['RUNTIME_TECHNICAL_RETRY_EXHAUSTED']
      : ['RUNTIME_TECHNICAL_RETRY_RECOVERED'];
  }

  private totalProviderCalls(artifacts: PaperImplementationRuntimeArtifactEnvelope[]): number {
    return artifacts.reduce((sum, artifact) => sum + artifact.provider_call_count, 0);
  }

  private topicRunMode(runMode: PaperImplementationAgentRunMode): 'test' | 'acceptance' | 'product' {
    if (runMode === 'mock') {
      return 'test';
    }
    if (runMode === 'product') {
      return 'product';
    }
    return 'acceptance';
  }

  private createdBy(executionMode: PaperImplementationAgentExecutionMode): TopicSelectionActorType {
    if (executionMode === 'provider_llm') {
      return 'llm';
    }
    if (executionMode === 'codex_assisted') {
      return 'hybrid';
    }
    return 'system';
  }

  private ref(
    refType: string,
    refId: string,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: versionId ?? undefined,
      title_card_id: this.titleCardId(request),
    };
  }

  private titleCardId(request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest): string | null {
    return request.target_ref.title_card_id
      ?? request.input_snapshot_ref.title_card_id
      ?? request.source_refs[0]?.title_card_id
      ?? null;
  }

  private safeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/gu, '_');
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}

interface TraceResumeState {
  /** Admitted role artifacts reused as the executed prefix, in role order. */
  reused: RecordedRuntimeArtifact[];
  /** Next call index of the resumed run (max recorded call index + 1). */
  nextCallIndex: number;
}

interface RuntimeBase {
  implementationProjectId: string;
  runId: string;
  titleCardId: string | null;
  retrievalPacket: PaperImplementationTraceIntegrityRetrievalResult['packet'];
  retrievalPacketRef: TopicSelectionFunctionalRef;
  retrievalPacketHash: string;
  retrievalWarningCodes: string[];
  sourceHashBundleHash: string;
  modelProfileId: string;
  modelOptionId: string | null;
  contextPolicyProfile: TopicSelectionContextPolicyProfile;
  contextPolicyProfileHash: string;
  cachePolicyProfileHash: string;
  promptRedactionPolicyHash: string;
  compressionPolicyProfileHash: string;
  // S4-C record-only shadow tier (zero execution-path effect).
  shadowTier: PaperImplementationDebateComplexityTier;
}

interface BuildArtifactInput {
  artifactScope: 'role' | 'final';
  roleSlotId: PaperImplementationTraceIntegrityDebateRoleSlotId | null;
  callIndex: number | null;
  executorKind: PaperImplementationRuntimeExecutorKind;
  artifactContractId: string;
  artifactContractVersion: string;
  outputSchemaId: string;
  artifactPayloadRefType: string;
  artifactPayloadSeed: string;
  promptPacketHash: string;
  promptVariantId: string;
  runtimeStatus: PaperImplementationRuntimeArtifactEnvelope['runtime_status'];
  runtimeFailureCode: string | null;
  retryAttemptIndex?: number;
  providerCallCount: number;
  blockerCodes: string[];
  warningCodes: string[];
  output: unknown;
  artifactPayload?: Record<string, unknown>;
  priorRoleArtifacts: RecordedRuntimeArtifact[];
  modelOptionId?: string | null;
  responseReuseRef?: string | null;
  responseHash?: string | null;
  tokenBudgetGateResult?: TopicSelectionAgentTokenBudgetGateResult | null;
  promptPacketCacheStatus?: TopicSelectionRuntimeCacheResult | null;
  promptPacketCacheResultRef?: TopicSelectionFunctionalRef | null;
  promptPacketCacheResultHash?: string | null;
  compressionReportRef?: TopicSelectionFunctionalRef | null;
  compressionReportHash?: string | null;
  compressedContextHash?: string | null;
  auditHash?: string | null;
  finalArtifactHash?: string | null;
  finalArtifactRefType?: string;
}

function cryptoId(): string {
  return crypto.randomUUID();
}
