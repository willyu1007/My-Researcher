import crypto from 'node:crypto';
import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_P1_REVIEW_FINAL_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_P1_REVIEW_ROLE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  paperImplementationP1RuntimeReviewRoleOutputSchema,
  type PaperImplementationP1RuntimeReviewArtifact,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type PaperImplementationP1RuntimeReviewRoleSlotId,
  type PaperImplementationP1RuntimeReviewSlotId,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeExecutorKind,
  type RunPaperImplementationP1RuntimeReviewRequest,
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
import { requireActiveImplementationProject } from './paper-implementation-runtime-preflight.js';
import {
  PAPER_IMPLEMENTATION_DEBATE_RETRYABLE_RUNTIME_FAILURE_CODES,
  PAPER_IMPLEMENTATION_ROLE_BLOCKED_CODES_MISSING_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_SLOT_ECHO_MISMATCH_FAILURE_CODE,
} from './paper-implementation-runtime-utils.js';
import {
  buildPaperImplementationRuntimeOperationalTelemetry,
  type PaperImplementationRuntimeOperationalTelemetry,
} from './paper-implementation-runtime-operational-telemetry.js';

export interface PaperImplementationP1RuntimeReviewResult {
  run_id: string;
  slot_id: PaperImplementationP1RuntimeReviewSlotId;
  workflow_type: 'claim_boundary_review' | 'dossier_readiness_prep';
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

export type PaperImplementationP1AgentOrchestrator =
  Pick<TopicSelectionAgentOrchestratorService, 'invokeStructuredOutput'>;

interface RuntimeServiceOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: PaperImplementationP1AgentOrchestrator;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

interface SlotProfile {
  slotId: PaperImplementationP1RuntimeReviewSlotId;
  workflowType: 'claim_boundary_review' | 'dossier_readiness_prep';
  profileId: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  contextPolicyId: string;
  roleSpecs: RoleSpec[];
  finalArtifactRefType: string;
  roleArtifactRefType: string;
  artifactContractId: string;
  promptPolicyId: string;
}

interface RoleSpec {
  slotId: PaperImplementationP1RuntimeReviewRoleSlotId;
  executorKind: PaperImplementationRuntimeExecutorKind;
  promptVariantId: string;
  debateRole: TopicSelectionAgentDebateExtension['role'];
}

interface RecordedRuntimeArtifact {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
  output: PaperImplementationP1RuntimeReviewRoleOutput | null;
}

interface RoleInvocationOutcome {
  result: TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>;
  retryAttemptIndex: number;
  providerCallCount: number;
  runtimeFailureCode: string | null;
}

interface RuntimeBase {
  implementationProjectId: string;
  runId: string;
  titleCardId: string | null;
  profile: SlotProfile;
  sourceHashBundleHash: string;
  modelProfileId: string;
  modelOptionId: string | null;
  contextPolicyProfile: TopicSelectionContextPolicyProfile;
  contextPolicyProfileHash: string;
  cachePolicyProfileHash: string;
  promptRedactionPolicyHash: string;
  compressionPolicyProfileHash: string;
}

interface BuildArtifactInput {
  artifactScope: 'role' | 'final';
  roleSlotId: string | null;
  callIndex: number | null;
  executorKind: PaperImplementationRuntimeExecutorKind;
  artifactContractId: string;
  artifactContractVersion: string;
  outputSchemaId: string;
  artifactPayloadRefType: string;
  artifactPayloadSeed: string;
  promptPacketHash: string;
  promptVariantId: string;
  runtimeStatus: 'passed' | 'blocked' | 'failed_runtime';
  runtimeFailureCode: string | null;
  retryAttemptIndex?: number;
  providerCallCount: number;
  blockerCodes: string[];
  warningCodes: string[];
  output: unknown;
  artifactPayload: Record<string, unknown>;
  priorRoleArtifacts: RecordedRuntimeArtifact[];
  finalArtifactHash?: string | null;
  finalArtifactRefType?: string;
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
}

const CLAIM_ROLE_SPECS: RoleSpec[] = [
  {
    slotId: 'claim_boundary_review.boundary_critic',
    executorKind: 'semantic_skeptic',
    promptVariantId: 'boundary-critic.main',
    debateRole: 'deep_critic',
  },
  {
    slotId: 'claim_boundary_review.evidence_skeptic',
    executorKind: 'semantic_skeptic',
    promptVariantId: 'evidence-skeptic.main',
    debateRole: 'deep_critic',
  },
  {
    slotId: 'claim_boundary_review.adjudicator_final',
    executorKind: 'semantic_arbiter',
    promptVariantId: 'adjudicator.final',
    debateRole: 'arbiter',
  },
];

const DOSSIER_ROLE_SPECS: RoleSpec[] = [
  {
    slotId: 'dossier_readiness_prep.readiness_reviewer',
    executorKind: 'semantic_support_mapper',
    promptVariantId: 'readiness-reviewer.main',
    debateRole: 'explorer',
  },
  {
    slotId: 'dossier_readiness_prep.blocker_skeptic',
    executorKind: 'semantic_skeptic',
    promptVariantId: 'blocker-skeptic.main',
    debateRole: 'deep_critic',
  },
  {
    slotId: 'dossier_readiness_prep.scenario_adjudicator_final',
    executorKind: 'semantic_arbiter',
    promptVariantId: 'scenario-adjudicator.final',
    debateRole: 'arbiter',
  },
];

const SLOT_PROFILES: Record<PaperImplementationP1RuntimeReviewSlotId, SlotProfile> = {
  [PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID]: {
    slotId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
    workflowType: 'claim_boundary_review',
    profileId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
    promptTemplateId: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROMPT_TEMPLATE_ID,
    promptTemplateVersion: PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION,
    contextPolicyId: 'paper-implementation.claim-boundary.context-policy.v1',
    roleSpecs: CLAIM_ROLE_SPECS,
    finalArtifactRefType: 'claim_boundary_review_artifact',
    roleArtifactRefType: 'claim_boundary_review_role_artifact',
    artifactContractId: 'ClaimBoundaryReviewArtifact',
    promptPolicyId: 'paper-implementation.claim-boundary.prompt-redaction.v1',
  },
  [PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID]: {
    slotId: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
    workflowType: 'dossier_readiness_prep',
    profileId: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
    promptTemplateId: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROMPT_TEMPLATE_ID,
    promptTemplateVersion: PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION,
    contextPolicyId: 'paper-implementation.dossier-readiness.context-policy.v1',
    roleSpecs: DOSSIER_ROLE_SPECS,
    finalArtifactRefType: 'dossier_readiness_audit_artifact',
    roleArtifactRefType: 'dossier_readiness_role_artifact',
    artifactContractId: 'DossierReadinessAuditArtifact',
    promptPolicyId: 'paper-implementation.dossier-readiness.prompt-redaction.v1',
  },
};

const MAX_TECHNICAL_RETRY_ATTEMPT_INDEX = 1;
const RETRYABLE_RUNTIME_FAILURE_CODES = new Set<string>([
  ...PAPER_IMPLEMENTATION_DEBATE_RETRYABLE_RUNTIME_FAILURE_CODES,
]);

export class PaperImplementationP1RuntimeReviewService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: PaperImplementationP1AgentOrchestrator;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: RuntimeServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async runClaimBoundaryDebate(
    implementationProjectId: string,
    request: RunPaperImplementationP1RuntimeReviewRequest,
  ): Promise<PaperImplementationP1RuntimeReviewResult> {
    return this.runReview(PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID, implementationProjectId, request);
  }

  async runDossierReadinessAudit(
    implementationProjectId: string,
    request: RunPaperImplementationP1RuntimeReviewRequest,
  ): Promise<PaperImplementationP1RuntimeReviewResult> {
    return this.runReview(PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID, implementationProjectId, request);
  }

  private async runReview(
    slotId: PaperImplementationP1RuntimeReviewSlotId,
    implementationProjectId: string,
    request: RunPaperImplementationP1RuntimeReviewRequest,
  ): Promise<PaperImplementationP1RuntimeReviewResult> {
    const profile = SLOT_PROFILES[slotId];
    this.assertRequest(profile, request);
    await requireActiveImplementationProject(this.projectRepository, implementationProjectId);
    const runId = request.run_id?.trim() || this.idFactory('pi_p1_runtime_run');
    const runtimeBase = this.runtimeBase(implementationProjectId, request, runId, profile);
    const artifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    const admissions: PaperImplementationRuntimeAdmissionRecord[] = [];
    const preflightBlockerCodes = this.uniqueStrings(request.preflight_blocker_codes ?? []);

    if (preflightBlockerCodes.length > 0) {
      const preflight = await this.recordPreflightBlockedArtifact(runtimeBase, request, preflightBlockerCodes);
      artifacts.push(preflight.artifact);
      admissions.push(preflight.admission);
      const final = await this.recordFinalArtifact(runtimeBase, request, {
        roleArtifacts: [preflight],
        status: 'blocked',
        runtimeFailureCode: null,
        providerCallCount: 0,
        blockerCodes: preflightBlockerCodes,
        warningCodes: [],
      });
      artifacts.push(final.artifact);
      admissions.push(final.admission);
      return this.result(runtimeBase, 'blocked', 0, artifacts, admissions, final.artifact, final.admission);
    }

    const roleArtifacts: RecordedRuntimeArtifact[] = [];
    for (const [index, spec] of profile.roleSpecs.entries()) {
      const roleInvocation = await this.invokeRoleWithBoundedRetry(
        runtimeBase,
        request,
        spec,
        index + 1,
        roleArtifacts,
      );
      const recorded = await this.recordRoleArtifact(runtimeBase, request, spec, index + 1, roleArtifacts, roleInvocation);
      artifacts.push(recorded.artifact);
      admissions.push(recorded.admission);
      roleArtifacts.push(recorded);

      if (recorded.admission.admission_status !== 'admitted' || recorded.artifact.runtime_status === 'failed_runtime') {
        return this.result(
          runtimeBase,
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
      runtimeBase,
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
    request: RunPaperImplementationP1RuntimeReviewRequest,
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
      const runtimeFailureCode = this.roleInvocationFailureCode(spec, result);
      const shouldRetry = request.execution_mode === 'provider_llm'
        && retryAttemptIndex < MAX_TECHNICAL_RETRY_ATTEMPT_INDEX
        && runtimeFailureCode !== null
        && RETRYABLE_RUNTIME_FAILURE_CODES.has(runtimeFailureCode);
      if (!shouldRetry) {
        return {
          result,
          retryAttemptIndex,
          providerCallCount,
          runtimeFailureCode,
        };
      }
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'P1 runtime retry loop exhausted unexpectedly.');
  }

  private async invokeRole(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationP1RuntimeReviewRequest,
    spec: RoleSpec,
    callIndex: number,
    priorArtifacts: RecordedRuntimeArtifact[],
    retryAttemptIndex: number,
  ): Promise<TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>> {
    const output = this.fixtureOutputForMode(request, spec.slotId);
    const messages = this.roleMessages(runtimeBase, request, spec, priorArtifacts);
    const baseInvocationAttemptId = `${runtimeBase.runId}.${this.safeId(spec.slotId)}.call-${callIndex}`;
    const invocationAttemptId = retryAttemptIndex === 0
      ? baseInvocationAttemptId
      : `${baseInvocationAttemptId}.retry-${retryAttemptIndex}`;
    return this.agentOrchestrator.invokeStructuredOutput<PaperImplementationP1RuntimeReviewRoleOutput>({
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
      output_contract: PAPER_IMPLEMENTATION_P1_REVIEW_ROLE_OUTPUT_SCHEMA_ID,
      model_option_id: request.execution_mode === 'provider_llm' ? runtimeBase.modelOptionId : null,
      prompt: {
        promptTemplateId: runtimeBase.profile.promptTemplateId,
        version: runtimeBase.profile.promptTemplateVersion,
      },
      prompt_variant_key: spec.promptVariantId,
      schema_name: 'paper_implementation_p1_runtime_review_role_output',
      schema: paperImplementationP1RuntimeReviewRoleOutputSchema as unknown as Record<string, unknown>,
      messages,
      input_refs: [
        request.target_ref,
        ...request.source_refs,
      ],
      context_packet_refs: [{
        ref_type: 'artifact_ref',
        ref_id: `${runtimeBase.runId}.source-bundle`,
        title_card_id: runtimeBase.titleCardId,
      }],
      context_packet_hashes: [runtimeBase.sourceHashBundleHash],
      runtime_token_budget: this.runtimeTokenBudget(runtimeBase, request, spec, priorArtifacts, messages),
      debate_extension: this.debateExtension(runtimeBase, spec, callIndex, priorArtifacts),
      mocked_output: request.execution_mode === 'mocked_llm' && output
        ? {
          fixture_id: `${runtimeBase.runId}.${this.safeId(spec.slotId)}.fixture`,
          output,
          mock_profile: runtimeBase.profile.slotId,
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
    request: RunPaperImplementationP1RuntimeReviewRequest,
    blockerCodes: string[],
  ): Promise<RecordedRuntimeArtifact> {
    const output: PaperImplementationP1RuntimeReviewRoleOutput = {
      role_slot_id: runtimeBase.profile.roleSpecs[0]!.slotId,
      role_status: 'blocked',
      summary: 'Deterministic P1 runtime preflight found blockers before semantic role execution.',
      cited_source_refs: [...request.source_refs],
      blocker_codes: blockerCodes,
      warning_codes: [],
      domain_gate_request: null,
      scenario_outputs: [],
    };
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, output, []);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: output.role_slot_id,
      callIndex: 1,
      executorKind: 'deterministic_preflight',
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_P1_REVIEW_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: 'preflight_blocked',
      promptPacketHash: this.hash({
        run_id: runtimeBase.runId,
        role_slot_id: output.role_slot_id,
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
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
    request: RunPaperImplementationP1RuntimeReviewRequest,
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
    const artifactPayload = this.roleArtifactPayload(runtimeBase, request, artifactOutput, priorArtifacts);
    const artifact = this.buildRuntimeArtifact(runtimeBase, request, {
      artifactScope: 'role',
      roleSlotId: spec.slotId,
      callIndex,
      executorKind: spec.executorKind,
      artifactContractId: `${runtimeBase.profile.artifactContractId}Role`,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_P1_REVIEW_ROLE_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.roleArtifactRefType,
      artifactPayloadSeed: spec.slotId,
      promptPacketHash: roleResult.provenance.prompt_packet_hash,
      promptVariantId: spec.promptVariantId,
      runtimeStatus,
      runtimeFailureCode,
      retryAttemptIndex: roleInvocation.retryAttemptIndex,
      providerCallCount: roleInvocation.providerCallCount,
      blockerCodes: runtimeFailureCode ? [runtimeFailureCode] : output?.blocker_codes ?? [],
      warningCodes: this.uniqueStrings([
        ...(output?.warning_codes ?? roleResult.warning_codes),
        ...this.retryWarningCodes(roleInvocation, runtimeFailureCode),
      ]),
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
    request: RunPaperImplementationP1RuntimeReviewRequest,
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
      artifactContractId: runtimeBase.profile.artifactContractId,
      artifactContractVersion: 'v1',
      outputSchemaId: PAPER_IMPLEMENTATION_P1_REVIEW_FINAL_OUTPUT_SCHEMA_ID,
      artifactPayloadRefType: runtimeBase.profile.finalArtifactRefType,
      artifactPayloadSeed: 'final',
      promptPacketHash: lastRole?.prompt_packet_hash ?? this.hash({ final: runtimeBase.runId }),
      promptVariantId: 'final',
      runtimeStatus: input.status,
      runtimeFailureCode: input.runtimeFailureCode,
      retryAttemptIndex: 0,
      providerCallCount: input.providerCallCount,
      blockerCodes: input.blockerCodes,
      warningCodes: input.warningCodes,
      output: finalPayload,
      artifactPayload: finalPayload as unknown as Record<string, unknown>,
      priorRoleArtifacts: input.roleArtifacts,
      finalArtifactHash: this.hash(finalPayload),
      finalArtifactRefType: runtimeBase.profile.finalArtifactRefType,
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
    request: RunPaperImplementationP1RuntimeReviewRequest,
    input: BuildArtifactInput,
  ): PaperImplementationRuntimeArtifactEnvelope {
    const artifactPayload = this.jsonSafeObject(input.artifactPayload);
    const payloadHash = this.hash(artifactPayload);
    const promptPacketHash = input.promptPacketHash;
    const promptPacketRef = this.ref('runtime_prompt_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.prompt`, request);
    const contextPacketHash = this.hash({
      run_id: runtimeBase.runId,
      role_slot_id: input.roleSlotId,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      prior_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
    });
    const runtimeIdentity = {
      // S2-C C2: run_id pins the identity granularity explicitly to one runtime
      // run — replaying the same run_id (idempotent double-submit) collides on
      // the runtimeIdentityHash unique constraint (409), while a legitimate
      // re-advance/new run always carries a fresh run_id and never collides.
      run_id: runtimeBase.runId,
      implementation_project_id: runtimeBase.implementationProjectId,
      workflow_type: runtimeBase.profile.workflowType,
      slot_id: runtimeBase.profile.slotId,
      artifact_scope: input.artifactScope,
      role_slot_id: input.roleSlotId,
      call_index: input.callIndex,
      target_ref: request.target_ref,
      prompt_packet_hash: promptPacketHash,
      output_schema_id: input.outputSchemaId,
      execution_mode: request.execution_mode,
      model_profile_id: runtimeBase.modelProfileId,
      model_option_id: input.modelOptionId ?? runtimeBase.modelOptionId,
      prior_role_artifact_hashes: input.priorRoleArtifacts.map((item) => item.artifact.artifact_payload_hash),
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
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
      workflow_type: runtimeBase.profile.workflowType,
      slot_id: runtimeBase.profile.slotId,
      artifact_scope: input.artifactScope,
      artifact_contract_id: input.artifactContractId,
      artifact_contract_version: input.artifactContractVersion,
      target_ref: request.target_ref,
      target_version_id: request.target_version_id ?? null,
      input_snapshot_ref: request.input_snapshot_ref,
      input_snapshot_hash: request.input_snapshot_hash,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
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
      retrieval_packet_ref: null,
      retrieval_packet_hash: null,
      reviewed_statement_packet_ref: null,
      reviewed_statement_packet_hash: null,
      context_packet_ref: this.ref('runtime_context_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.context`, request),
      context_packet_hash: contextPacketHash,
      runtime_invocation_context_hash: this.hash(runtimeIdentity),
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      cache_policy_profile_hash: runtimeBase.cachePolicyProfileHash,
      source_refs: [...request.source_refs],
      source_hashes: [...request.source_hashes],
      prompt_packet_ref: promptPacketRef,
      prompt_packet_hash: promptPacketHash,
      prompt_template_id: runtimeBase.profile.promptTemplateId,
      prompt_template_version_id: runtimeBase.profile.promptTemplateVersion,
      prompt_variant_id: input.promptVariantId,
      prompt_redaction_policy_hash: runtimeBase.promptRedactionPolicyHash,
      output_schema_id: input.outputSchemaId,
      context_cache_key_hash: this.hash({
        cache: 'context',
        source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
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
        ? this.ref('compressed_context_packet', `${runtimeBase.runId}.${this.safeId(input.roleSlotId ?? 'final')}.compressed-context`, request, input.compressedContextHash)
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
    request: RunPaperImplementationP1RuntimeReviewRequest,
    input: {
      roleArtifacts: RecordedRuntimeArtifact[];
      status: 'passed' | 'blocked' | 'failed_runtime';
      runtimeFailureCode: string | null;
      blockerCodes: string[];
      warningCodes: string[];
    },
  ): PaperImplementationP1RuntimeReviewArtifact {
    const roleArtifacts = input.roleArtifacts.map((item) => item.artifact);
    const roleOutputs = input.roleArtifacts.flatMap((item) => item.output ? [item.output] : []);
    const admittedRoleRefs = input.roleArtifacts
      .map((item) => item.admission.admitted_artifact_ref)
      .filter((item): item is TopicSelectionFunctionalRef => item !== null);
    const admittedRoleHashes = input.roleArtifacts
      .map((item) => item.admission.admitted_artifact_hash)
      .filter((item): item is string => item !== null);
    const finalRole = roleOutputs[roleOutputs.length - 1] ?? null;
    return {
      status: input.status,
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      target_ref: request.target_ref,
      preflight_blockers: this.uniqueStrings(request.preflight_blocker_codes ?? []),
      role_summaries: Object.fromEntries(roleOutputs.map((item) => [item.role_slot_id, item.summary])),
      role_blocker_codes: Object.fromEntries(roleOutputs.map((item) => [item.role_slot_id, item.blocker_codes])),
      role_warning_codes: Object.fromEntries(roleOutputs.map((item) => [item.role_slot_id, item.warning_codes])),
      blockers: this.uniqueStrings(input.blockerCodes),
      warnings: this.uniqueStrings(input.warningCodes),
      runtime_failure_code: input.runtimeFailureCode,
      domain_gate_request: input.status === 'passed' ? finalRole?.domain_gate_request ?? null : null,
      scenario_outputs: roleOutputs.flatMap((item) => item.scenario_outputs ?? []),
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
        slot_id: runtimeBase.profile.slotId,
        role_artifact_hashes: roleArtifacts.map((item) => item.artifact_payload_hash),
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
        ? `paper-implementation.${artifact.slot_id}.final-admission`
        : `paper-implementation.${artifact.slot_id}.role-admission`,
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

  private runtimeBase(
    implementationProjectId: string,
    request: RunPaperImplementationP1RuntimeReviewRequest,
    runId: string,
    profile: SlotProfile,
  ): RuntimeBase {
    const contextPolicyProfile = this.contextPolicyProfile(profile);
    const contextPolicyProfileHash = this.hash(contextPolicyProfile);
    const sourceHashBundleHash = this.hash({
      source_refs: request.source_refs,
      source_hashes: request.source_hashes,
      target_ref: request.target_ref,
      input_snapshot_hash: request.input_snapshot_hash,
    });
    return {
      implementationProjectId,
      runId,
      titleCardId: this.titleCardId(request),
      profile,
      sourceHashBundleHash,
      modelProfileId: request.model_profile_id?.trim() || profile.profileId,
      modelOptionId: request.execution_mode === 'provider_llm'
        ? request.model_option_id?.trim() || null
        : null,
      contextPolicyProfile,
      contextPolicyProfileHash,
      cachePolicyProfileHash: this.hash(contextPolicyProfile.cache_policy),
      promptRedactionPolicyHash: this.hash({
        policy_id: profile.promptPolicyId,
        store_rendered_prompt: false,
      }),
      compressionPolicyProfileHash: this.hash(contextPolicyProfile.compression_policy),
    };
  }

  private roleMessages(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationP1RuntimeReviewRequest,
    spec: RoleSpec,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Return only structured JSON for the requested PaperImplementation P1 runtime review role.',
          'Do not write claims, dossier readiness, writing packets, trace repairs, queue items, prompt text, or raw provider output.',
          'If this is the final adjudicator role and the review passes, include a domain_gate_request for the deterministic Domain Gate service.',
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          slot_id: runtimeBase.profile.slotId,
          role_slot_id: spec.slotId,
          target_ref: request.target_ref,
          input_snapshot_ref: request.input_snapshot_ref,
          input_snapshot_hash: request.input_snapshot_hash,
          source_refs: request.source_refs,
          source_hashes: request.source_hashes,
          source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
          prior_role_artifact_refs: priorArtifacts.map((item) => item.admission.admitted_artifact_ref),
          prior_role_artifact_hashes: priorArtifacts.map((item) => item.admission.admitted_artifact_hash),
          prior_role_outputs: priorArtifacts.flatMap((item) => item.output ? [item.output] : []),
        }),
      },
    ];
  }

  // S2-A boundary note: the P1 review slots deliberately do NOT wire the caller-side
  // compression attempt (PC-S1..S3) — like trace-integrity they are debate-shaped and
  // their compression recovery follows the STEP-7 facts-builder work (T-124 S3+,
  // D-T128-02). Over-budget source bundles still fail-close
  // (L5 `p1_over_budget_zero_provider_calls`). The N3 token double-count fix below
  // applies here regardless.
  private runtimeTokenBudget(
    runtimeBase: RuntimeBase,
    _request: RunPaperImplementationP1RuntimeReviewRequest,
    spec: RoleSpec,
    priorArtifacts: RecordedRuntimeArtifact[],
    messages: Array<{ role: 'system' | 'user'; content: string }>,
  ): TopicSelectionAgentRuntimeTokenBudgetInput {
    return {
      context_policy_profile: runtimeBase.contextPolicyProfile,
      context_policy_profile_hash: runtimeBase.contextPolicyProfileHash,
      // N3 double-count fix: the request refs and prior role outputs are already
      // embedded verbatim in `messages`; context_payloads must not re-carry them —
      // the estimate below is the single source of truth.
      context_payloads: [],
      extra_payloads: [{
        slot_id: runtimeBase.profile.slotId,
        role_slot_id: spec.slotId,
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
      debate_policy_id: `${runtimeBase.profile.slotId}.v1`,
      round_index: callIndex,
      role: spec.debateRole,
      stage: spec.promptVariantId,
      agent_instance_id: spec.slotId,
      parent_invocation_attempt_ids: priorArtifacts.map((item) => (
        `${runtimeBase.runId}.${this.safeId(item.artifact.role_slot_id ?? 'role')}.call-${item.artifact.call_index ?? 0}`
      )),
    };
  }

  private contextPolicyProfile(profile: SlotProfile): TopicSelectionContextPolicyProfile {
    return {
      schema_version: TOPIC_SELECTION_CONTEXT_POLICY_PROFILE_SCHEMA_VERSION,
      context_policy_profile_id: profile.contextPolicyId,
      context_policy_profile_version: 'v1',
      invocation_slot_id: profile.slotId,
      functional_template: 'support_only_semantic',
      execution_modifiers: [
        'provider_required_live',
        'codex_exact_reuse_allowed',
        'mock_replay_allowed',
        'compression_allowed_with_quality_gate',
      ],
      context_family: profile.workflowType === 'claim_boundary_review'
        ? 'paper_implementation_claim_boundary_review'
        : 'paper_implementation_dossier_readiness_prep',
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
        compression_strategy_id: `${profile.slotId}.context-compression`,
        compression_strategy_version: 'v1',
        preserved_fact_kinds: [
          'target_ref',
          'source_hash',
          'failed_run_accounting',
          'forbidden_overclaim',
          'claim_trace_ref',
          'dossier_readiness_blocker',
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
          'source_hash_bundle_hash',
          'prompt_variant_id',
          'prior_role_artifact_hashes',
          'model_profile_id',
          'model_option_id',
          'context_policy_profile_hash',
        ],
        stale_behavior: 'block',
        post_cache_gates: [
          'schema_validation',
          'runtime_admission',
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
        'runtime_admission',
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
      redaction_policy: `${profile.slotId}.redaction.v1`,
    };
  }

  private roleArtifactPayload(
    runtimeBase: RuntimeBase,
    request: RunPaperImplementationP1RuntimeReviewRequest,
    output: unknown,
    priorArtifacts: RecordedRuntimeArtifact[],
  ): Record<string, unknown> {
    return {
      artifact_kind: `${runtimeBase.profile.slotId}.role_artifact_payload`,
      target_ref: request.target_ref,
      source_refs: request.source_refs,
      source_hash_bundle_hash: runtimeBase.sourceHashBundleHash,
      role_output: output,
      prior_role_outputs: priorArtifacts.flatMap((item) => item.output ? [item.output] : []),
      prior_role_artifact_refs: priorArtifacts.map((item) => item.admission.admitted_artifact_ref),
      prior_role_artifact_hashes: priorArtifacts.map((item) => item.admission.admitted_artifact_hash),
    };
  }

  private fixtureOutputForMode(
    request: RunPaperImplementationP1RuntimeReviewRequest,
    slotId: PaperImplementationP1RuntimeReviewRoleSlotId,
  ): PaperImplementationP1RuntimeReviewRoleOutput | null {
    if (request.execution_mode === 'mocked_llm') {
      return request.mocked_role_outputs?.[slotId] ?? null;
    }
    if (request.execution_mode === 'codex_assisted') {
      return request.codex_role_outputs?.[slotId] ?? null;
    }
    return null;
  }

  private assertRequest(profile: SlotProfile, request: RunPaperImplementationP1RuntimeReviewRequest): void {
    if (request.source_refs.length !== request.source_hashes.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_refs and source_hashes must have the same length.');
    }
    if (request.run_mode === 'product' && request.execution_mode !== 'provider_llm') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'product run_mode requires execution_mode=provider_llm.');
    }
    const requestedProfileId = request.model_profile_id?.trim() || null;
    if (requestedProfileId && requestedProfileId !== profile.profileId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_profile_id must match runtime slot profile ${profile.profileId}.`,
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
      && !requestedModelOptionId.startsWith(`${profile.profileId}.`)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `model_option_id must belong to runtime slot profile ${profile.profileId}.`,
      );
    }
    if (request.execution_mode === 'mocked_llm') {
      this.assertAllRoleOutputsPresent(profile, request.mocked_role_outputs, 'mocked_role_outputs');
    }
    if (request.execution_mode === 'codex_assisted') {
      this.assertAllRoleOutputsPresent(profile, request.codex_role_outputs, 'codex_role_outputs');
    }
  }

  private hasRoleOutputs(
    outputs: Partial<Record<PaperImplementationP1RuntimeReviewRoleSlotId, PaperImplementationP1RuntimeReviewRoleOutput>> | undefined,
  ): boolean {
    return Boolean(outputs && Object.keys(outputs).length > 0);
  }

  private assertAllRoleOutputsPresent(
    profile: SlotProfile,
    outputs: Partial<Record<PaperImplementationP1RuntimeReviewRoleSlotId, PaperImplementationP1RuntimeReviewRoleOutput>> | undefined,
    fieldName: string,
  ): void {
    for (const spec of profile.roleSpecs) {
      if (!outputs?.[spec.slotId]) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.${spec.slotId} is required.`);
      }
    }
  }

  private result(
    runtimeBase: RuntimeBase,
    status: 'passed' | 'blocked' | 'failed_runtime',
    providerCallCount: number,
    artifacts: PaperImplementationRuntimeArtifactEnvelope[],
    admissions: PaperImplementationRuntimeAdmissionRecord[],
    finalArtifact: PaperImplementationRuntimeArtifactEnvelope | null,
    finalAdmission: PaperImplementationRuntimeAdmissionRecord | null,
  ): PaperImplementationP1RuntimeReviewResult {
    return {
      run_id: runtimeBase.runId,
      slot_id: runtimeBase.profile.slotId,
      workflow_type: runtimeBase.profile.workflowType,
      status,
      provider_call_count: providerCallCount,
      runtime_artifacts: artifacts,
      admission_records: admissions,
      final_runtime_artifact: finalArtifact,
      final_admission_record: finalAdmission,
      blocker_codes: this.uniqueStrings(artifacts.flatMap((item) => item.blocker_codes)),
      warning_codes: this.uniqueStrings(artifacts.flatMap((item) => item.warning_codes)),
      operational_telemetry: buildPaperImplementationRuntimeOperationalTelemetry({
        runId: runtimeBase.runId,
        workflowType: runtimeBase.profile.workflowType,
        slotId: runtimeBase.profile.slotId,
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

  private providerCallCount(result: TopicSelectionAgentInvocationResult<unknown>): number {
    if (result.provenance.execution_mode !== 'provider_llm') {
      return 0;
    }
    return result.provenance.telemetry?.request_count ?? (result.status === 'succeeded' ? 1 : 0);
  }

  private runtimeFailureCode(
    result: TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>,
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
   */
  private roleInvocationFailureCode(
    spec: RoleSpec,
    result: TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>,
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

  private titleCardId(request: RunPaperImplementationP1RuntimeReviewRequest): string | null {
    return request.target_ref.title_card_id
      ?? request.input_snapshot_ref.title_card_id
      ?? request.source_refs.find((ref) => ref.title_card_id)?.title_card_id
      ?? null;
  }

  private ref(
    refType: string,
    refId: string,
    request: RunPaperImplementationP1RuntimeReviewRequest,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: this.titleCardId(request),
      version_id: versionId,
    };
  }

  private jsonSafeObject(value: Record<string, unknown>): Record<string, unknown> {
    const jsonSafeValue = JSON.parse(JSON.stringify(value)) as unknown;
    if (jsonSafeValue && typeof jsonSafeValue === 'object' && !Array.isArray(jsonSafeValue)) {
      return jsonSafeValue as Record<string, unknown>;
    }
    return { output: jsonSafeValue ?? null };
  }

  private safeId(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }
}
