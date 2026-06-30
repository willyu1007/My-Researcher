import crypto from 'node:crypto';

import type {
  TopicSelectionActorType,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
  TopicSelectionGateVerdict,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
  TopicSelectionTransitionResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_V1C_NODE_ID } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-node-ids';
import type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
  TopicSelectionAgentInvocationTelemetrySummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type {
  TopicSelectionArgumentReadinessMiniCheckRecord,
  TopicSelectionArgumentReadinessMiniCheckStatus,
  TopicSelectionPromotionDecisionSupportLlmDraft,
  TopicSelectionPromotionDecisionSupportRecord,
  TopicSelectionPromotionDossierRecord,
  TopicSelectionPromotionGateCheckRecord,
  TopicSelectionPromotionGateDisposition,
  TopicSelectionPromotionGateHandoff,
  TopicSelectionPromotionGateLoopbackHint,
  TopicSelectionPromotionGateLoopbackTarget,
  TopicSelectionPromotionGateRequiredAction,
  TopicSelectionPromotionSupportGenerationMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import {
  topicSelectionPromotionDecisionSupportLlmDraftSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionPromotionInputSnapshotHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1cPromotionGateCheckControlPlanePersistence,
  TopicSelectionV1cPromotionGateRecordBundle,
  TopicSelectionV1cPromotionGateRepository,
  TopicSelectionV1cPromotionSupportControlPlanePersistence,
  TopicSelectionV1cPromotionSupportRecordBundle,
} from '../repositories/topic-selection-v1c-promotion-gate.repository.js';
import type {
  BackendLlmGateway,
  LlmModelRef,
} from './llm-gateway.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import {
  TOPIC_SELECTION_V1C_N2_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N2_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import type {
  TopicSelectionV1cN2BoundedDebateAdmissionIdentity,
} from './topic-selection-v1c-n2-bounded-debate-admission-service.js';

const WORKFLOW_KEY = 'topic-selection.v1c-promotion-gate-support';
const GATE_KEY = 'topic-selection.v1c-promotion-gate-check';
const TRANSITION_KEY = 'v1c-promotion-input-to-gate-support';
const WORKFLOW_PROFILE_KEY = TOPIC_SELECTION_V1C_PROMOTION_DECISION_SUPPORT_PROFILE_ID;
const PROMPT_TEMPLATE_ID = 'topic-selection-promotion-decision-support';
const DEFAULT_PROMPT_TEMPLATE_VERSION = '1';
const DEFAULT_WORKFLOW_PROFILE_VERSION = '1';

type IdFactory = (prefix: string) => string;

export type CreatePromotionGateSupportInput = {
  promotion_input_snapshot_id: string;
  workspace_id?: string | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
  support_generation_mode?: TopicSelectionPromotionSupportGenerationMode;
  workflow_profile_version?: string | null;
  prompt_template_version?: string | null;
  model?: LlmModelRef | null;
};

export type CreatePromotionDecisionSupportInput = CreatePromotionGateSupportInput;

export type CreatePromotionDecisionSupportFromVerifiedRuntimeDraftInput =
  Omit<CreatePromotionGateSupportInput, 'support_generation_mode'> & {
    verified_runtime_draft: {
      draft: TopicSelectionPromotionDecisionSupportLlmDraft;
      provenance: TopicSelectionAgentInvocationProvenance;
      telemetry?: TopicSelectionAgentInvocationTelemetrySummary | null;
      audit_snapshot: TopicSelectionAgentInvocationAuditSnapshot;
      admission_identity: TopicSelectionV1cN2BoundedDebateAdmissionIdentity;
      admission_identity_hash: string;
    };
  };

export type CreatePromotionGateCheckFromSupportInput = {
  promotion_decision_support_id?: string | null;
  support_run_key?: string | null;
  workspace_id?: string | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

export type TopicSelectionPromotionInputHandoffProvider = {
  getPromotionInputHandoff(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotHandoff>;
};

export type TopicSelectionV1cPromotionGateCreationResult =
  TopicSelectionV1cPromotionGateRecordBundle & {
    handoff: TopicSelectionPromotionGateHandoff;
  };

export type TopicSelectionV1cPromotionDecisionSupportCreationResult =
  TopicSelectionV1cPromotionSupportRecordBundle;

export type TopicSelectionV1cPromotionGateCheckCreationResult =
  TopicSelectionV1cPromotionGateRecordBundle & {
    handoff: TopicSelectionPromotionGateHandoff;
  };

export type TopicSelectionV1cPromotionGateServiceOptions = {
  repository: TopicSelectionV1cPromotionGateRepository;
  promotionInputService: TopicSelectionPromotionInputHandoffProvider;
  llmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'> | null;
  agentOrchestrator?: TopicSelectionAgentOrchestratorService | null;
  contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
  modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
  idFactory?: IdFactory;
  now?: () => string;
};

type MiniCheckEvaluation = {
  record: TopicSelectionArgumentReadinessMiniCheckRecord;
  requiredActions: TopicSelectionPromotionGateRequiredAction[];
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
};

type GateEvaluation = {
  disposition: TopicSelectionPromotionGateDisposition;
  promoteAllowed: boolean;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  requiredActions: TopicSelectionPromotionGateRequiredAction[];
  loopbackHints: TopicSelectionPromotionGateLoopbackHint[];
};

type LlmDraftResult = {
  draft: TopicSelectionPromotionDecisionSupportLlmDraft | null;
  raw: Record<string, unknown> | null;
  telemetry: TopicSelectionAgentInvocationTelemetrySummary | null;
  provenance: TopicSelectionAgentInvocationProvenance | null;
  auditSnapshot: TopicSelectionAgentInvocationAuditSnapshot | null;
  runtimeIdentity: TopicSelectionV1cN2BoundedDebateAdmissionIdentity | null;
  runtimeIdentityHash: string | null;
  fallbackWarning: TopicSelectionGateIssue | null;
};

export function buildV1cPromotionDecisionSupportSystemContent(): string {
  return [
    'You are drafting non-authority, reviewer-facing promotion-decision support prose for a Topic Selection v1c promotion review, working only from a frozen PromotionInputSnapshotHandoff so that a human reviewer and the deterministic N3 promotion gate can later decide the disposition.',
    'Use only the supplied promotion input handoff together with its refs and hashes; cite only refs already present in the handoff and never invent refs, hashes, evidence, or package facts.',
    'Every field is optional; populate only the fields the handoff supports and omit the rest.',
    'Write summary as a concise reviewer-facing overview of the promotion readiness grounded in the handoff package snapshot, contribution summary, and claim ceiling.',
    'List reviewer_questions as the open questions a human promotion reviewer should resolve before deciding, and list risk_notes as the accepted or outstanding risks carried in the handoff that the reviewer must weigh.',
    'List recheck_notes as the recheck obligations or follow-up checks implied by the handoff, and write dossier_markdown as a reviewer-facing markdown dossier that organizes the above without asserting any decision.',
    'Do not decide the gate disposition, authorize or recommend promotion, set promote_allowed, or create HumanPromotionDecision, PromotionDecision, PromotionCommitmentProfile, PaperProjectBridge, downstream feedback, recheck requests, gate patches, or workflow automation commands.',
    'Return only JSON matching TopicSelectionPromotionDecisionSupportLlmDraft@v1.',
  ].join(' ');
}

export class TopicSelectionV1cPromotionGateService {
  private readonly repository: TopicSelectionV1cPromotionGateRepository;
  private readonly promotionInputService: TopicSelectionPromotionInputHandoffProvider;
  private readonly agentOrchestrator: TopicSelectionAgentOrchestratorService | null;
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: TopicSelectionV1cPromotionGateServiceOptions) {
    this.repository = options.repository;
    this.promotionInputService = options.promotionInputService;
    const modelProfileRegistry = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    this.modelProfileRegistry = modelProfileRegistry;
    this.contextPolicyProfileRegistry =
      options.contextPolicyProfileRegistry ?? new TopicSelectionContextPolicyProfileRegistryService();
    this.agentOrchestrator = options.agentOrchestrator
      ?? (options.llmGateway
        ? new TopicSelectionAgentOrchestratorService({
            llmGateway: options.llmGateway,
            modelProfileRegistry,
          })
        : null);
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createPromotionDecisionSupport(
    input: CreatePromotionDecisionSupportInput,
  ): Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> {
    return this.createPromotionDecisionSupportInternal(input, null);
  }

  async createPromotionDecisionSupportFromVerifiedRuntimeDraft(
    input: CreatePromotionDecisionSupportFromVerifiedRuntimeDraftInput,
  ): Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> {
    this.assertVerifiedRuntimeDraft(input.verified_runtime_draft);
    return this.createPromotionDecisionSupportInternal(
      {
        ...input,
        support_generation_mode: 'llm_draft',
      },
      {
        draft: input.verified_runtime_draft.draft,
        raw: null,
        telemetry: input.verified_runtime_draft.telemetry
          ?? input.verified_runtime_draft.provenance?.telemetry
          ?? null,
        provenance: input.verified_runtime_draft.provenance,
        auditSnapshot: input.verified_runtime_draft.audit_snapshot,
        runtimeIdentity: input.verified_runtime_draft.admission_identity,
        runtimeIdentityHash: input.verified_runtime_draft.admission_identity_hash,
        fallbackWarning: null,
      },
    );
  }

  private async createPromotionDecisionSupportInternal(
    input: CreatePromotionDecisionSupportInput,
    verifiedRuntimeDraft: LlmDraftResult | null,
  ): Promise<TopicSelectionV1cPromotionDecisionSupportCreationResult> {
    const handoff = await this.promotionInputService.getPromotionInputHandoff(
      input.promotion_input_snapshot_id,
    );
    this.assertWorkspace(input.workspace_id ?? null, handoff);

    const mode = input.support_generation_mode ?? 'deterministic';
    const promptTemplateVersion = input.prompt_template_version ?? DEFAULT_PROMPT_TEMPLATE_VERSION;
    const workflowProfileVersion = input.workflow_profile_version ?? DEFAULT_WORKFLOW_PROFILE_VERSION;
    const model = input.model ?? this.defaultPromotionSupportModel();
    const supportRunKey = this.computeSupportRunKey({
      promotionInputSnapshotId: handoff.promotion_input_snapshot_id,
      promotionInputSnapshotHash: handoff.snapshot_hashes.promotion_input_snapshot_hash,
      policyVersionId: input.policy_version_id ?? null,
      supportGenerationMode: mode,
      workflowProfileVersion,
      promptTemplateVersion,
      model,
      verifiedRuntimeDraftIdentityHash: verifiedRuntimeDraft?.runtimeIdentityHash ?? null,
    });
    const existing = await this.repository.findSupportBundleBySupportRunKey(supportRunKey);
    if (existing) {
      return existing;
    }

    const createdBy = input.created_by ?? 'system';
    const now = this.now();
    const supportId = this.idFactory('promotion_decision_support');
    const dossierId = this.idFactory('promotion_dossier');
    const inputSnapshotId = this.idFactory('input_snapshot');
    const workflowRunId = this.idFactory('workflow_run');
    const supportArtifactId = this.idFactory('artifact_ref');
    const dossierArtifactId = this.idFactory('artifact_ref');
    const llmDraft = verifiedRuntimeDraft ?? (mode === 'llm_draft'
      ? await this.createLlmDraft({ handoff, model, promptTemplateVersion, supportRunKey, workflowRunId })
	      : {
	          draft: null,
	          raw: null,
	          telemetry: null,
	          provenance: null,
	          auditSnapshot: null,
	          runtimeIdentity: null,
	          runtimeIdentityHash: null,
	          fallbackWarning: null,
	        });
    const sourceRefs = this.compileSourceRefs(handoff);
    const supportArtifactRef = this.ref('artifact_ref', supportArtifactId, handoff.snapshot.title_card_id, null);
    const dossierArtifactRef = this.ref('artifact_ref', dossierArtifactId, handoff.snapshot.title_card_id, null);
    const supportWarnings = this.compileSupportWarnings(handoff, llmDraft.fallbackWarning);
    const support: TopicSelectionPromotionDecisionSupportRecord = {
      promotion_decision_support_id: supportId,
      support_run_key: supportRunKey,
      workspace_id: handoff.snapshot.workspace_id ?? null,
      title_card_id: handoff.snapshot.title_card_id,
      promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: handoff.snapshot_hashes.promotion_input_snapshot_hash,
      topic_package_id: handoff.topic_package_id,
      package_version: handoff.package_version,
      support_generation_mode: mode,
      support_status: llmDraft.fallbackWarning ? 'succeeded_with_fallback' : 'succeeded',
      summary: this.resolveSupportSummary(handoff, llmDraft.draft),
      reviewer_questions: llmDraft.draft?.reviewer_questions ?? this.deterministicReviewerQuestions(handoff),
      risk_notes: llmDraft.draft?.risk_notes ?? this.deterministicRiskNotes(handoff),
      recheck_notes: llmDraft.draft?.recheck_notes ?? this.deterministicRecheckNotes(handoff),
      source_refs: sourceRefs,
      accepted_risk_refs: handoff.accepted_risk_refs,
      blocker_refs: handoff.blocker_refs,
      recheck_request_refs: handoff.recheck_request_refs,
      memory_suggestion_refs: handoff.memory_suggestion_refs,
      warnings: supportWarnings,
      llm_draft_payload: llmDraft.draft,
      input_snapshot_id: inputSnapshotId,
      workflow_run_id: workflowRunId,
      artifact_refs: [supportArtifactRef],
      created_by: createdBy,
      created_at: now,
    };
    const dossier: TopicSelectionPromotionDossierRecord = {
      promotion_dossier_id: dossierId,
      support_run_key: supportRunKey,
      workspace_id: handoff.snapshot.workspace_id ?? null,
      title_card_id: handoff.snapshot.title_card_id,
      promotion_decision_support_id: supportId,
      promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
      topic_package_id: handoff.topic_package_id,
      package_version: handoff.package_version,
      summary: this.resolveDossierSummary(handoff, support),
      reviewer_packet_artifact_ref: dossierArtifactRef,
      dossier_payload: this.buildDossierPayload(handoff, support, llmDraft.draft),
      source_refs: sourceRefs,
      artifact_refs: [dossierArtifactRef],
      created_by: createdBy,
      created_at: now,
    };
    const controlPlane = this.buildSupportControlPlaneRecords({
      handoff,
      support,
      dossier,
      inputSnapshotId,
      workflowRunId,
      supportArtifactId,
      dossierArtifactId,
      policyVersionId: input.policy_version_id ?? null,
      promptTemplateVersion,
      workflowProfileVersion,
      model,
      mode,
      llmDraft,
      createdBy,
      now,
    });

    return this.repository.createSupportBundle({
      promotion_decision_support: support,
      promotion_dossier: dossier,
      control_plane: controlPlane,
    });
  }

  async createPromotionGateCheckFromSupport(
    input: CreatePromotionGateCheckFromSupportInput,
  ): Promise<TopicSelectionV1cPromotionGateCheckCreationResult> {
    const supportBundle = input.promotion_decision_support_id
      ? await this.repository.findSupportBundleByDecisionSupportId(input.promotion_decision_support_id)
      : input.support_run_key
        ? await this.repository.findSupportBundleBySupportRunKey(input.support_run_key)
        : null;
    if (!supportBundle) {
      throw new AppError(
        404,
        'NOT_FOUND',
        input.promotion_decision_support_id || input.support_run_key
          ? 'PromotionDecisionSupport for gate check was not found.'
          : 'promotion_decision_support_id or support_run_key is required to create a promotion gate check.',
      );
    }

    const { promotion_decision_support: support, promotion_dossier: dossier } = supportBundle;
    const existingGate = await this.repository.findGateCheckBundleBySupportRunKey(support.support_run_key);
    if (existingGate) {
      const bundle = {
        ...supportBundle,
        ...existingGate,
      };
      return {
        ...bundle,
        handoff: this.toHandoff(bundle),
      };
    }

    const handoff = await this.promotionInputService.getPromotionInputHandoff(
      support.promotion_input_snapshot_id,
    );
    this.assertWorkspace(input.workspace_id ?? support.workspace_id ?? null, handoff);
    if (handoff.snapshot_hashes.promotion_input_snapshot_hash !== support.promotion_input_snapshot_hash) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'PromotionDecisionSupport snapshot hash does not match the current PromotionInputSnapshot handoff.',
      );
    }

    const createdBy = input.created_by ?? support.created_by;
    const now = this.now();
    const miniCheckId = this.idFactory('argument_readiness_mini_check');
    const gateCheckId = this.idFactory('promotion_gate_check');
    const inputSnapshotId = this.idFactory('input_snapshot');
    const workflowRunId = this.idFactory('workflow_run');
    const artifactRefs = this.uniqueRefs([
      ...support.artifact_refs,
      ...dossier.artifact_refs,
    ]);
    const miniCheckEvaluation = this.buildMiniCheck({
      handoff,
      support,
      supportRunKey: support.support_run_key,
      miniCheckId,
      artifactRefs,
      createdBy,
      now,
    });
    const gateEvaluation = this.evaluateGate({
      handoff,
      support,
      dossier,
      miniCheck: miniCheckEvaluation.record,
      miniRequiredActions: miniCheckEvaluation.requiredActions,
      miniBlockers: miniCheckEvaluation.blockers,
      miniWarnings: miniCheckEvaluation.warnings,
    });
    const gateCheck: TopicSelectionPromotionGateCheckRecord = {
      promotion_gate_check_id: gateCheckId,
      support_run_key: support.support_run_key,
      workspace_id: handoff.snapshot.workspace_id ?? null,
      title_card_id: handoff.snapshot.title_card_id,
      promotion_decision_support_id: support.promotion_decision_support_id,
      promotion_dossier_id: dossier.promotion_dossier_id,
      argument_readiness_mini_check_id: miniCheckId,
      promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: handoff.snapshot_hashes.promotion_input_snapshot_hash,
      disposition: gateEvaluation.disposition,
      promote_allowed: gateEvaluation.promoteAllowed,
      blockers: gateEvaluation.blockers,
      warnings: gateEvaluation.warnings,
      required_actions: gateEvaluation.requiredActions,
      loopback_hints: gateEvaluation.loopbackHints,
      accepted_risk_refs: handoff.accepted_risk_refs,
      blocker_refs: handoff.blocker_refs,
      recheck_request_refs: handoff.recheck_request_refs,
      memory_suggestion_refs: handoff.memory_suggestion_refs,
      source_refs: support.source_refs,
      snapshot_hashes: handoff.snapshot_hashes,
      input_snapshot_id: inputSnapshotId,
      workflow_run_id: workflowRunId,
      gate_result_id: null,
      transition_attempt_id: null,
      trace_snapshot_id: null,
      artifact_refs: artifactRefs,
      created_by: createdBy,
      created_at: now,
    };
    const controlPlane = this.buildGateCheckControlPlaneRecords({
      handoff,
      support,
      dossier,
      miniCheck: miniCheckEvaluation.record,
      gateCheck,
      inputSnapshotId,
      workflowRunId,
      policyVersionId: input.policy_version_id ?? null,
      createdBy,
      now,
    });
    gateCheck.gate_result_id = controlPlane.readiness_gate_result.readiness_gate_result_id;
    gateCheck.transition_attempt_id = controlPlane.transition_attempt.chain_transition_attempt_id;
    gateCheck.trace_snapshot_id = controlPlane.trace_snapshot.trace_snapshot_id;

    const gateBundle = await this.repository.createGateCheckBundle({
      argument_readiness_mini_check: miniCheckEvaluation.record,
      promotion_gate_check: gateCheck,
      control_plane: controlPlane,
    });
    const bundle = {
      ...supportBundle,
      ...gateBundle,
    };
    return {
      ...bundle,
      handoff: this.toHandoff(bundle),
    };
  }

  async createPromotionGateSupport(
    input: CreatePromotionGateSupportInput,
  ): Promise<TopicSelectionV1cPromotionGateCreationResult> {
    const supportBundle = await this.createPromotionDecisionSupport(input);
    return this.createPromotionGateCheckFromSupport({
      promotion_decision_support_id: supportBundle.promotion_decision_support.promotion_decision_support_id,
      workspace_id: input.workspace_id ?? null,
      created_by: input.created_by,
      policy_version_id: input.policy_version_id ?? null,
    });
  }

  async getPromotionDecisionSupport(
    promotionDecisionSupportId: string,
  ): Promise<TopicSelectionPromotionDecisionSupportRecord> {
    const support = await this.repository.findDecisionSupportById(promotionDecisionSupportId);
    if (!support) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecisionSupport ${promotionDecisionSupportId} not found.`);
    }
    return support;
  }

  async getPromotionDossier(
    promotionDossierId: string,
  ): Promise<TopicSelectionPromotionDossierRecord> {
    const dossier = await this.repository.findDossierById(promotionDossierId);
    if (!dossier) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDossier ${promotionDossierId} not found.`);
    }
    return dossier;
  }

  async getArgumentReadinessMiniCheck(
    argumentReadinessMiniCheckId: string,
  ): Promise<TopicSelectionArgumentReadinessMiniCheckRecord> {
    const miniCheck = await this.repository.findArgumentReadinessMiniCheckById(argumentReadinessMiniCheckId);
    if (!miniCheck) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `ArgumentReadinessMiniCheck ${argumentReadinessMiniCheckId} not found.`,
      );
    }
    return miniCheck;
  }

  async getPromotionGateCheck(
    promotionGateCheckId: string,
  ): Promise<TopicSelectionPromotionGateCheckRecord> {
    const gateCheck = await this.repository.findGateCheckById(promotionGateCheckId);
    if (!gateCheck) {
      throw new AppError(404, 'NOT_FOUND', `PromotionGateCheck ${promotionGateCheckId} not found.`);
    }
    return gateCheck;
  }

  async getPromotionGateHandoff(
    promotionGateCheckId: string,
  ): Promise<TopicSelectionPromotionGateHandoff> {
    const bundle = await this.repository.findBundleByGateCheckId(promotionGateCheckId);
    if (!bundle) {
      throw new AppError(404, 'NOT_FOUND', `PromotionGateCheck ${promotionGateCheckId} not found.`);
    }
    return this.toHandoff(bundle);
  }

  async getLatestPromotionGateHandoffByPromotionInputSnapshotId(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionGateHandoff> {
    const bundle = await this.repository.findLatestBundleByPromotionInputSnapshotId(
      promotionInputSnapshotId,
    );
    if (!bundle) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `PromotionGateCheck for PromotionInputSnapshot ${promotionInputSnapshotId} not found.`,
      );
    }
    return this.toHandoff(bundle);
  }

  private async createLlmDraft(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    model: LlmModelRef;
    promptTemplateVersion: string;
    supportRunKey: string;
    workflowRunId: string;
  }): Promise<LlmDraftResult> {
    if (!this.agentOrchestrator) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'LLM draft mode requires an explicitly configured LLM runtime; default deterministic fallback is disabled.',
      );
    }
    try {
      const runtimeProfile = this.contextPolicyProfileRegistry.resolveProfile({
        context_policy_profile_id:
          TOPIC_SELECTION_V1C_N2_CONTEXT_RUNTIME_PROFILE_IDS.promotion_support_llm_draft,
        invocation_slot_id:
          TOPIC_SELECTION_V1C_N2_INVOCATION_SLOT_IDS.promotion_support_llm_draft,
      });
      const runtimeInvocationContextHash = this.promotionSupportRuntimeInvocationContextHash({
        handoff: input.handoff,
        supportRunKey: input.supportRunKey,
      });
      const response = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionPromotionDecisionSupportLlmDraft>({
        workspace_id: input.handoff.snapshot.workspace_id ?? null,
        title_card_id: input.handoff.snapshot.title_card_id,
        node_id: TOPIC_SELECTION_V1C_NODE_ID.n2_generate_promotion_support,
        workflow_run_id: input.workflowRunId,
        node_attempt_id: `node_attempt_${input.supportRunKey}`,
        invocation_attempt_id: `${input.supportRunKey}.promotion_support_generation.llm_draft`,
        execution_mode: 'provider_llm',
        executor_kind: 'single_agent',
        run_mode: 'acceptance',
        profile_id: WORKFLOW_PROFILE_KEY,
        model_option_id: this.promotionSupportModelOptionId(input.model),
        output_contract: 'TopicSelectionPromotionDecisionSupportLlmDraft@v1',
        prompt: {
          promptTemplateId: PROMPT_TEMPLATE_ID,
          version: input.promptTemplateVersion,
        },
        prompt_variant_key: TOPIC_SELECTION_V1C_N2_INVOCATION_SLOT_IDS.promotion_support_llm_draft,
        schema_name: 'TopicSelectionPromotionDecisionSupportLlmDraft',
        schema: topicSelectionPromotionDecisionSupportLlmDraftSchema as unknown as Record<string, unknown>,
        messages: [
          {
            role: 'system',
            content: buildV1cPromotionDecisionSupportSystemContent(),
          },
          {
            role: 'user',
            content: stableStringify({
              promotion_input_handoff_json: input.handoff,
            }),
          },
        ],
        input_refs: this.compileSourceRefs(input.handoff),
        runtime_token_budget: {
          context_policy_profile: runtimeProfile.profile,
          context_policy_profile_hash: runtimeProfile.profile_hash,
          runtime_invocation_context_hash: runtimeInvocationContextHash,
          context_payloads: [input.handoff],
        },
        created_by: 'system',
      });
      if (response.status !== 'succeeded' || !response.structured_output) {
        throw new AppError(
          502,
          'INTERNAL_ERROR',
          'LLM draft generation failed; default deterministic fallback is disabled.',
          {
            failure_code: 'LLM_INVOCATION_FAILED',
            invocation_error_code: response.error_code ?? null,
            support_run_key: input.supportRunKey,
            blocker_codes: response.blocker_codes,
            warning_codes: response.warning_codes,
          },
        );
      }
	      return {
	        draft: response.structured_output,
	        raw: null,
	        telemetry: response.provenance.telemetry,
	        provenance: response.provenance,
	        auditSnapshot: response.audit_snapshot,
	        runtimeIdentity: null,
	        runtimeIdentityHash: null,
	        fallbackWarning: null,
	      };
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 502) {
        throw error;
      }
      throw new AppError(
        502,
        'INTERNAL_ERROR',
        'LLM draft generation failed; default deterministic fallback is disabled.',
        {
          cause: error instanceof Error ? error.message : String(error),
          failure_code: 'LLM_INVOCATION_FAILED',
          support_run_key: input.supportRunKey,
        },
      );
    }
  }

  private assertVerifiedRuntimeDraft(
    runtimeDraft: CreatePromotionDecisionSupportFromVerifiedRuntimeDraftInput['verified_runtime_draft'],
  ): void {
    const {
      draft,
      provenance,
      audit_snapshot: auditSnapshot,
      admission_identity: admissionIdentity,
      admission_identity_hash: admissionIdentityHash,
    } = runtimeDraft;
    const hasUsableSummary = this.hasText(draft.summary);
    const hasReviewerQuestions = Array.isArray(draft.reviewer_questions)
      && draft.reviewer_questions.some((item) => this.hasText(item));
    const hasDossier = this.hasText(draft.dossier_markdown);
    if (!hasUsableSummary && !hasReviewerQuestions && !hasDossier) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Verified runtime draft must contain reviewer-usable support text before N2 support persistence.',
      );
    }
    const recomputedAdmissionHash = sha256Text(stableStringify(admissionIdentity));
    if (admissionIdentityHash !== recomputedAdmissionHash) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Verified runtime draft admission identity hash drift detected.',
      );
    }
    if (
      admissionIdentity.allowed_effect !== 'support_only'
      || admissionIdentity.final_slot_id !== 'n2_bounded_micro_debate.synthesizer_final'
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Verified runtime draft admission identity is outside the N2 support-only boundary.',
      );
    }
    if (
      admissionIdentity.final_prompt_packet_hash !== provenance.prompt_packet_hash
      || admissionIdentity.final_structured_output_hash !== provenance.structured_output_hash
      || admissionIdentity.final_output_contract !== provenance.output_contract
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Verified runtime draft provenance does not match admitted final artifact identity.',
      );
    }
    if (
      !admissionIdentity.final_runtime_audit_ref
      || !admissionIdentity.final_runtime_audit_hash
      || stableStringify(admissionIdentity.final_runtime_audit_ref)
        !== stableStringify(admissionIdentity.final_provenance_ref)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Verified runtime draft admission identity is missing runtime audit provenance.',
      );
    }
    if (
      auditSnapshot.status !== 'succeeded'
      || auditSnapshot.provenance.prompt_packet_hash !== provenance.prompt_packet_hash
      || auditSnapshot.provenance.structured_output_hash !== provenance.structured_output_hash
      || stableStringify(auditSnapshot.provenance) !== stableStringify(provenance)
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Verified runtime draft audit snapshot does not match final invocation provenance.',
      );
    }
  }

  private promotionSupportRuntimeInvocationContextHash(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    supportRunKey: string;
  }): string {
    return sha256Text(stableStringify({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: TOPIC_SELECTION_V1C_N2_INVOCATION_SLOT_IDS.promotion_support_llm_draft,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1c_promotion_support_generation',
        scenario_case_id: 'llm_draft',
        semantic_scenario_key: sha256Text(stableStringify({
          support_run_key: input.supportRunKey,
          promotion_input_snapshot_id: input.handoff.promotion_input_snapshot_id,
          snapshot_hashes: input.handoff.snapshot_hashes,
        })),
      },
      loop_context: {
        loop_kind: 'initial',
        loop_stage: 'v1c_n2_promotion_support',
        current_round_index: 1,
        remaining_round_budget: null,
        loopback_source_node_id: null,
        repair_origin_ref: null,
        repair_origin_hash: null,
      },
      debate_context: {
        debate_loop_id: null,
        debate_policy_id: null,
        round_index: null,
        role: null,
        stage: null,
        agent_instance_id: null,
        parent_invocation_attempt_ids_hash: null,
        dynamic_material_refs_hash: null,
      },
    }));
  }

  private defaultPromotionSupportModel(): LlmModelRef {
    const resolved = this.modelProfileRegistry.resolveProfile({
      profile_id: WORKFLOW_PROFILE_KEY,
      execution_mode: 'provider_llm',
      run_mode: 'product',
      model_option_id: null,
    });
    const option = resolved.selected_model_option;
    if (!option) {
      throw new AppError(500, 'INTERNAL_ERROR', 'promotion support model profile did not resolve a provider model option.');
    }
    return {
      providerId: option.provider_id,
      modelId: option.model_id,
      profileId: resolved.profile.profile_id,
    };
  }

  private promotionSupportModelOptionId(model: LlmModelRef): string {
    if (model.providerId === 'openai') {
      return `${WORKFLOW_PROFILE_KEY}.openai-balanced`;
    }
    if (model.providerId === 'dashscope') {
      return `${WORKFLOW_PROFILE_KEY}.dashscope-thinking-budget`;
    }
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      `Unsupported v1c N2 promotion-support provider: ${model.providerId}.`,
    );
  }

  private buildMiniCheck(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    support: TopicSelectionPromotionDecisionSupportRecord;
    supportRunKey: string;
    miniCheckId: string;
    artifactRefs: TopicSelectionFunctionalRef[];
    createdBy: TopicSelectionActorType;
    now: string;
  }): MiniCheckEvaluation {
    const checkItems: TopicSelectionArgumentReadinessMiniCheckRecord['check_items'] = [];
    const requiredActions: TopicSelectionPromotionGateRequiredAction[] = [];
    const blockers: TopicSelectionGateIssue[] = [];
    const warnings: TopicSelectionGateIssue[] = [];
    const packageSnapshot = this.asRecord(input.handoff.snapshot.package_snapshot);
    const packageDraftInput = this.asRecord(input.handoff.snapshot.package_draft_input_snapshot);

    this.addMiniItem({
      key: 'claim_ceiling_visible',
      present: this.hasClaimCeiling(packageSnapshot, packageDraftInput),
      message: 'Claim ceiling is visible in the package/question contract lineage.',
      missingMessage: 'Claim ceiling is missing from the package/question contract lineage.',
      refs: [input.handoff.topic_question_contract_ref],
      loopbackTarget: 'question',
      actionCode: 'revise_question_claim_ceiling',
      checkItems,
      requiredActions,
      blockers,
    });
    this.addMiniItem({
      key: 'contribution_summary_present',
      present: this.hasTextAtAnyPath(packageSnapshot, [
        ['contribution_summary'],
        ['package_payload', 'contribution_summary'],
        ['summary'],
      ]),
      message: 'Contribution summary is visible.',
      missingMessage: 'Contribution summary is missing from the package narrative.',
      refs: [input.handoff.topic_package_ref],
      loopbackTarget: 'package',
      actionCode: 'refine_package_contribution_summary',
      checkItems,
      requiredActions,
      blockers,
    });
    this.addMiniItem({
      key: 'evaluation_plan_present',
      present: this.hasTextAtAnyPath(packageSnapshot, [
        ['evaluation_plan'],
        ['package_payload', 'evaluation_plan'],
        ['evaluation_plan_summary'],
      ]) || this.hasTextAtAnyPath(packageDraftInput, [
        ['evaluation_plan'],
        ['value_assessment_input', 'evaluation_plan'],
      ]),
      message: 'Evaluation plan is visible.',
      missingMessage: 'Evaluation plan is missing from the package narrative.',
      refs: [input.handoff.topic_package_ref, input.handoff.answerability_plan_ref],
      loopbackTarget: 'package',
      actionCode: 'refine_package_evaluation_plan',
      checkItems,
      requiredActions,
      blockers,
    });
    this.addMiniItem({
      key: 'selected_evidence_visible',
      present: input.handoff.evidence_refs.length > 0,
      message: 'Selected evidence refs are visible.',
      missingMessage: 'Selected evidence refs are missing from the promotion input handoff.',
      refs: [input.handoff.topic_question_ref],
      loopbackTarget: 'evidence_or_search',
      actionCode: 'repair_selected_evidence_refs',
      checkItems,
      requiredActions,
      blockers,
    });

    if (input.handoff.accepted_risk_refs.length > 0) {
      warnings.push(this.issue(
        'accepted_risks_visible_for_human_review',
        'Accepted upstream risks are visible and must be reviewed by the human promoter.',
        'warning',
        input.handoff.accepted_risk_refs,
      ));
    }
    checkItems.push({
      check_key: 'accepted_risk_visibility',
      status: 'passed',
      message: input.handoff.accepted_risk_refs.length > 0
        ? 'Accepted risks are carried into promotion review warnings.'
        : 'No accepted upstream risks were carried into promotion review.',
      refs: input.handoff.accepted_risk_refs,
    });

    const earlyCheckObligations = input.handoff.recheck_request_refs.length > 0
      ? ['Resolve carried recheck requests before any promote-class human decision.']
      : [];
    checkItems.push({
      check_key: 'early_check_obligations_visible',
      status: 'passed',
      message: earlyCheckObligations.length > 0
        ? 'Early-check obligations are visible.'
        : 'No early-check obligations were carried into promotion review.',
      refs: input.handoff.recheck_request_refs,
    });

    const checkStatus: TopicSelectionArgumentReadinessMiniCheckStatus =
      blockers.length > 0 ? 'blocking' : warnings.length > 0 ? 'warning' : 'passed';
    const record: TopicSelectionArgumentReadinessMiniCheckRecord = {
      argument_readiness_mini_check_id: input.miniCheckId,
      support_run_key: input.supportRunKey,
      workspace_id: input.handoff.snapshot.workspace_id ?? null,
      title_card_id: input.handoff.snapshot.title_card_id,
      promotion_decision_support_id: input.support.promotion_decision_support_id,
      promotion_input_snapshot_id: input.handoff.promotion_input_snapshot_id,
      check_status: checkStatus,
      check_items: checkItems,
      blockers,
      warnings,
      required_actions: requiredActions,
      early_check_obligations: earlyCheckObligations,
      source_refs: input.support.source_refs,
      artifact_refs: input.artifactRefs,
      created_by: input.createdBy,
      created_at: input.now,
    };
    return {
      record,
      requiredActions,
      blockers,
      warnings,
    };
  }

  private evaluateGate(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    support: TopicSelectionPromotionDecisionSupportRecord;
    dossier: TopicSelectionPromotionDossierRecord;
    miniCheck: TopicSelectionArgumentReadinessMiniCheckRecord;
    miniRequiredActions: TopicSelectionPromotionGateRequiredAction[];
    miniBlockers: TopicSelectionGateIssue[];
    miniWarnings: TopicSelectionGateIssue[];
  }): GateEvaluation {
    const blockers: TopicSelectionGateIssue[] = [];
    const warnings: TopicSelectionGateIssue[] = [...input.support.warnings, ...input.miniWarnings];
    const requiredActions: TopicSelectionPromotionGateRequiredAction[] = [];
    const loopbackHints: TopicSelectionPromotionGateLoopbackHint[] = [];
    const lineageIssues = this.findLineageIssues(input.handoff, input.support, input.dossier, input.miniCheck);
    if (lineageIssues.length > 0) {
      blockers.push(...lineageIssues);
      const action = this.requiredAction(
        'repair_promotion_gate_lineage',
        'blocking',
        'package',
        lineageIssues.flatMap((issue) => issue.refs ?? []),
        'Promotion gate support lineage is incomplete or malformed.',
      );
      requiredActions.push(action);
      loopbackHints.push(this.loopbackHint('package', 'malformed_gate_lineage', [action]));
    }
    if (input.handoff.blocker_refs.length > 0 || input.handoff.snapshot.blockers.length > 0) {
      blockers.push(this.issue(
        'carried_blockers_present',
        'Promotion input carries unresolved blockers.',
        'blocking',
        [...input.handoff.blocker_refs, ...input.handoff.snapshot.blockers.flatMap((issue) => issue.refs ?? [])],
      ));
      const action = this.requiredAction(
        'resolve_blockers_before_promotion',
        'blocking',
        'package',
        input.handoff.blocker_refs,
        'Resolve carried blockers before promotion review can proceed.',
      );
      requiredActions.push(action);
      loopbackHints.push(this.loopbackHint('package', 'carried_blocker_refs', [action]));
    }
    if (blockers.length > 0) {
      return {
        disposition: 'blocked',
        promoteAllowed: false,
        blockers,
        warnings,
        requiredActions: this.uniqueActions([...requiredActions, ...input.miniRequiredActions]),
        loopbackHints: this.uniqueLoopbackHints([...loopbackHints, ...this.loopbackHintsFromActions(input.miniRequiredActions)]),
      };
    }

    if (input.handoff.recheck_request_refs.length > 0) {
      const action = this.requiredAction(
        'resolve_recheck_before_promotion',
        'blocking',
        'evidence_or_search',
        input.handoff.recheck_request_refs,
        'Resolve carried recheck requests before a promote-class human decision.',
      );
      return {
        disposition: 'recheck_required',
        promoteAllowed: false,
        blockers: [],
        warnings,
        requiredActions: [action],
        loopbackHints: [this.loopbackHint('evidence_or_search', 'carried_recheck_request_refs', [action])],
      };
    }

    if (input.miniRequiredActions.length > 0) {
      return {
        disposition: 'needs_revision',
        promoteAllowed: false,
        blockers: [],
        warnings,
        requiredActions: this.uniqueActions(input.miniRequiredActions),
        loopbackHints: this.loopbackHintsFromActions(input.miniRequiredActions),
      };
    }

    if (this.readString(input.handoff.snapshot.package_snapshot, ['promotion_actionability']) === 'park') {
      const action = this.requiredAction(
        'park_package_until_actionable',
        'blocking',
        'park',
        [input.handoff.topic_package_ref],
        'Deterministic policy marks this package as not actionable for revision or recheck.',
      );
      return {
        disposition: 'park',
        promoteAllowed: false,
        blockers: [],
        warnings,
        requiredActions: [action],
        loopbackHints: [this.loopbackHint('park', 'not_actionable_for_revision_or_recheck', [action])],
      };
    }

    return {
      disposition: 'ready_for_human_decision',
      promoteAllowed: true,
      blockers: [],
      warnings,
      requiredActions: [],
      loopbackHints: [],
    };
  }

  private buildSupportControlPlaneRecords(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    support: TopicSelectionPromotionDecisionSupportRecord;
    dossier: TopicSelectionPromotionDossierRecord;
    inputSnapshotId: string;
    workflowRunId: string;
    supportArtifactId: string;
    dossierArtifactId: string;
    policyVersionId: string | null;
    promptTemplateVersion: string;
    workflowProfileVersion: string;
    model: LlmModelRef;
    mode: TopicSelectionPromotionSupportGenerationMode;
    llmDraft: LlmDraftResult;
    createdBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionV1cPromotionSupportControlPlanePersistence {
    const sourceRefs = input.support.source_refs;
	    const snapshotPayload = {
	      promotion_input_snapshot_handoff: input.handoff,
	      support_generation_mode: input.mode,
	      policy_version_id: input.policyVersionId,
	      prompt_template_version: input.promptTemplateVersion,
	      workflow_profile_version: input.workflowProfileVersion,
	      model: input.model,
	      llm_runtime_admission_identity_hash: input.llmDraft.runtimeIdentityHash,
	    };
    const inputSnapshot: TopicSelectionInputSnapshotRecord = {
      input_snapshot_id: input.inputSnapshotId,
      workspace_id: input.support.workspace_id ?? null,
      title_card_id: input.support.title_card_id,
      target_ref: input.handoff.promotion_input_snapshot_ref,
      context_policy_version_id: input.policyVersionId,
      policy_version: input.policyVersionId,
      snapshot_hash: sha256Text(stableStringify(snapshotPayload)),
      source_refs: sourceRefs,
      permission_refs: [],
      payload: snapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
	    const providerInvolved = input.mode === 'llm_draft'
	      && input.llmDraft.provenance?.non_provider === false;
	    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: input.workflowRunId,
      workspace_id: input.support.workspace_id ?? null,
      title_card_id: input.support.title_card_id,
      workflow_key: WORKFLOW_KEY,
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: input.workflowProfileVersion,
      input_snapshot_id: input.inputSnapshotId,
      status: 'succeeded',
	      provider_id: providerInvolved
	        ? input.llmDraft.provenance?.provider_id ?? null
	        : null,
	      model_id: providerInvolved
	        ? input.llmDraft.provenance?.model_id ?? null
	        : null,
      prompt_template_id: input.mode === 'llm_draft'
        ? input.llmDraft.provenance?.prompt_template_id ?? PROMPT_TEMPLATE_ID
        : null,
      prompt_template_version: input.mode === 'llm_draft'
        ? input.llmDraft.provenance?.prompt_template_version ?? input.promptTemplateVersion
        : null,
      started_at: input.now,
      finished_at: input.now,
      telemetry: {
        deterministic_gate_authoritative: false,
	        llm_draft_telemetry: input.llmDraft.telemetry,
	        llm_runtime_provenance: input.llmDraft.provenance,
	        llm_runtime_audit: input.llmDraft.auditSnapshot,
	        llm_runtime_admission_identity: input.llmDraft.runtimeIdentity,
	        llm_runtime_admission_identity_hash: input.llmDraft.runtimeIdentityHash,
	      },
      output_summary: {
        support_status: input.support.support_status,
        reviewer_question_count: input.support.reviewer_questions.length,
      },
      error_code: null,
      error_message: null,
      created_by: input.createdBy,
    };
	    const supportArtifactPayload = {
	      support: input.support,
	      llm_draft_raw: null,
	      llm_runtime_provenance: input.llmDraft.provenance,
	      llm_runtime_admission_identity: input.llmDraft.runtimeIdentity,
	      llm_runtime_admission_identity_hash: input.llmDraft.runtimeIdentityHash,
	      deterministic_gate_authoritative: false,
	    };
    const dossierArtifactPayload = {
      dossier: input.dossier,
      packet: input.dossier.dossier_payload,
    };
    return {
      input_snapshot: inputSnapshot,
      workflow_run: workflowRun,
      artifact_refs: [
        {
          artifact_ref_id: input.supportArtifactId,
          workspace_id: input.support.workspace_id ?? null,
          title_card_id: input.support.title_card_id,
          artifact_kind: 'structured_output',
          storage_kind: 'inline',
          uri: null,
          payload: supportArtifactPayload,
          checksum: sha256Text(stableStringify(supportArtifactPayload)),
          byte_size: null,
          mime_type: 'application/json',
          workflow_run_id: input.workflowRunId,
          input_snapshot_id: input.inputSnapshotId,
          created_by: input.createdBy,
          created_at: input.now,
        },
        {
          artifact_ref_id: input.dossierArtifactId,
          workspace_id: input.support.workspace_id ?? null,
          title_card_id: input.support.title_card_id,
          artifact_kind: 'other',
          storage_kind: 'inline',
          uri: null,
          payload: dossierArtifactPayload,
          checksum: sha256Text(stableStringify(dossierArtifactPayload)),
          byte_size: null,
          mime_type: 'application/json',
          workflow_run_id: input.workflowRunId,
          input_snapshot_id: input.inputSnapshotId,
          created_by: input.createdBy,
          created_at: input.now,
        },
      ],
    };
  }

  private buildGateCheckControlPlaneRecords(input: {
    handoff: TopicSelectionPromotionInputSnapshotHandoff;
    support: TopicSelectionPromotionDecisionSupportRecord;
    dossier: TopicSelectionPromotionDossierRecord;
    miniCheck: TopicSelectionArgumentReadinessMiniCheckRecord;
    gateCheck: TopicSelectionPromotionGateCheckRecord;
    inputSnapshotId: string;
    workflowRunId: string;
    policyVersionId: string | null;
    createdBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionV1cPromotionGateCheckControlPlanePersistence {
    const gateRef = this.ref(
      'promotion_gate_check',
      input.gateCheck.promotion_gate_check_id,
      input.gateCheck.title_card_id,
      input.gateCheck.promotion_input_snapshot_hash,
    );
    const supportRef = this.ref(
      'promotion_decision_support',
      input.support.promotion_decision_support_id,
      input.gateCheck.title_card_id,
      null,
    );
    const dossierRef = this.ref(
      'promotion_dossier',
      input.dossier.promotion_dossier_id,
      input.gateCheck.title_card_id,
      null,
    );
    const miniCheckRef = this.ref(
      'argument_readiness_mini_check',
      input.miniCheck.argument_readiness_mini_check_id,
      input.gateCheck.title_card_id,
      null,
    );
    const snapshotPayload = {
      promotion_decision_support_ref: supportRef,
      promotion_dossier_ref: dossierRef,
      promotion_input_snapshot_ref: input.handoff.promotion_input_snapshot_ref,
      policy_version_id: input.policyVersionId,
    };
    const inputSnapshot: TopicSelectionInputSnapshotRecord = {
      input_snapshot_id: input.inputSnapshotId,
      workspace_id: input.gateCheck.workspace_id ?? null,
      title_card_id: input.gateCheck.title_card_id,
      target_ref: supportRef,
      context_policy_version_id: input.policyVersionId,
      policy_version: input.policyVersionId,
      snapshot_hash: sha256Text(stableStringify(snapshotPayload)),
      source_refs: input.gateCheck.source_refs,
      permission_refs: [],
      payload: snapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: input.workflowRunId,
      workspace_id: input.gateCheck.workspace_id ?? null,
      title_card_id: input.gateCheck.title_card_id,
      workflow_key: GATE_KEY,
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: null,
      input_snapshot_id: input.inputSnapshotId,
      status: 'succeeded',
      provider_id: null,
      model_id: null,
      prompt_template_id: null,
      prompt_template_version: null,
      started_at: input.now,
      finished_at: input.now,
      telemetry: {
        deterministic_gate_authoritative: true,
        consumed_support_run_key: input.support.support_run_key,
      },
      output_summary: {
        disposition: input.gateCheck.disposition,
        required_action_codes: input.gateCheck.required_actions.map((action) => action.action_code),
      },
      error_code: null,
      error_message: null,
      created_by: input.createdBy,
    };
    const gateResultId = this.idFactory('readiness_gate_result');
    const transitionAttemptId = this.idFactory('chain_transition_attempt');
    const traceSnapshotId = this.idFactory('trace_snapshot');
    const readinessGateResult: TopicSelectionReadinessGateResultRecord = {
      readiness_gate_result_id: gateResultId,
      workspace_id: input.gateCheck.workspace_id ?? null,
      title_card_id: input.gateCheck.title_card_id,
      gate_key: GATE_KEY,
      target_ref: gateRef,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: input.workflowRunId,
      policy_version_id: input.policyVersionId,
      verdict: this.toGateVerdict(input.gateCheck.disposition),
      blockers: input.gateCheck.blockers,
      warnings: input.gateCheck.warnings,
      required_actions: input.gateCheck.required_actions.map((action) => action.action_code),
      loopback_target: input.gateCheck.loopback_hints[0]?.refs[0] ?? null,
      accepted_risk_refs: input.gateCheck.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: input.createdBy,
      created_at: input.now,
    };
    const transitionAttempt: TopicSelectionChainTransitionAttemptRecord = {
      chain_transition_attempt_id: transitionAttemptId,
      workspace_id: input.gateCheck.workspace_id ?? null,
      title_card_id: input.gateCheck.title_card_id,
      transition_key: TRANSITION_KEY,
      source_ref: supportRef,
      target_ref: gateRef,
      gate_result_id: gateResultId,
      workflow_run_id: input.workflowRunId,
      input_snapshot_id: input.inputSnapshotId,
      policy_version_id: input.policyVersionId,
      actor: {
        actor_type: input.createdBy,
      },
      result: this.toTransitionResult(input.gateCheck.disposition),
      reason: `Promotion gate check created with disposition ${input.gateCheck.disposition}.`,
      required_actions: input.gateCheck.required_actions.map((action) => action.action_code),
      blockers: input.gateCheck.blockers,
      accepted_risk_refs: input.gateCheck.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: [miniCheckRef, gateRef],
      created_at: input.now,
    };
    const traceSnapshotPayload = {
      support_run_key: input.gateCheck.support_run_key,
      disposition: input.gateCheck.disposition,
      promote_allowed: input.gateCheck.promote_allowed,
      required_actions: input.gateCheck.required_actions,
      loopback_hints: input.gateCheck.loopback_hints,
      source_snapshot_hashes: input.gateCheck.snapshot_hashes,
    };
    const traceSnapshot: TopicSelectionTraceSnapshotRecord = {
      trace_snapshot_id: traceSnapshotId,
      workspace_id: input.gateCheck.workspace_id ?? null,
      title_card_id: input.gateCheck.title_card_id,
      target_ref: gateRef,
      snapshot_hash: sha256Text(stableStringify(traceSnapshotPayload)),
      object_refs: [
        input.handoff.promotion_input_snapshot_ref,
        supportRef,
        dossierRef,
        miniCheckRef,
        gateRef,
        ...input.gateCheck.source_refs,
      ],
      lineage_link_refs: [],
      artifact_refs: input.gateCheck.artifact_refs,
      quality_signal_refs: [],
      transition_attempt_refs: [
        this.ref('chain_transition_attempt', transitionAttemptId, input.gateCheck.title_card_id, null),
      ],
      payload: traceSnapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    return {
      input_snapshot: inputSnapshot,
      workflow_run: workflowRun,
      readiness_gate_result: readinessGateResult,
      transition_attempt: transitionAttempt,
      trace_snapshot: traceSnapshot,
    };
  }

  private toHandoff(bundle: TopicSelectionV1cPromotionGateRecordBundle): TopicSelectionPromotionGateHandoff {
    const gateCheck = bundle.promotion_gate_check;
    return {
      promotion_gate_check_id: gateCheck.promotion_gate_check_id,
      promotion_gate_check_ref: this.ref(
        'promotion_gate_check',
        gateCheck.promotion_gate_check_id,
        gateCheck.title_card_id,
        gateCheck.promotion_input_snapshot_hash,
      ),
      promotion_decision_support_ref: this.ref(
        'promotion_decision_support',
        bundle.promotion_decision_support.promotion_decision_support_id,
        gateCheck.title_card_id,
        null,
      ),
      promotion_dossier_ref: this.ref(
        'promotion_dossier',
        bundle.promotion_dossier.promotion_dossier_id,
        gateCheck.title_card_id,
        null,
      ),
      argument_readiness_mini_check_ref: this.ref(
        'argument_readiness_mini_check',
        bundle.argument_readiness_mini_check.argument_readiness_mini_check_id,
        gateCheck.title_card_id,
        null,
      ),
      promotion_input_snapshot_id: gateCheck.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: gateCheck.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: gateCheck.promotion_input_snapshot_hash,
      topic_package_id: bundle.promotion_decision_support.topic_package_id,
      package_version: bundle.promotion_decision_support.package_version,
      disposition: gateCheck.disposition,
      promote_allowed: gateCheck.promote_allowed,
      required_actions: gateCheck.required_actions,
      loopback_hints: gateCheck.loopback_hints,
      accepted_risk_refs: gateCheck.accepted_risk_refs,
      blocker_refs: gateCheck.blocker_refs,
      recheck_request_refs: gateCheck.recheck_request_refs,
      memory_suggestion_refs: gateCheck.memory_suggestion_refs,
      snapshot_hashes: gateCheck.snapshot_hashes,
      support: bundle.promotion_decision_support,
      dossier: bundle.promotion_dossier,
      argument_readiness_mini_check: bundle.argument_readiness_mini_check,
      gate_check: gateCheck,
    };
  }

  private addMiniItem(input: {
    key: string;
    present: boolean;
    message: string;
    missingMessage: string;
    refs: TopicSelectionFunctionalRef[];
    loopbackTarget: TopicSelectionPromotionGateLoopbackTarget;
    actionCode: string;
    checkItems: TopicSelectionArgumentReadinessMiniCheckRecord['check_items'];
    requiredActions: TopicSelectionPromotionGateRequiredAction[];
    blockers: TopicSelectionGateIssue[];
  }): void {
    if (input.present) {
      input.checkItems.push({
        check_key: input.key,
        status: 'passed',
        message: input.message,
        refs: input.refs,
      });
      return;
    }
    input.checkItems.push({
      check_key: input.key,
      status: 'blocking',
      message: input.missingMessage,
      refs: input.refs,
    });
    input.blockers.push(this.issue(input.actionCode, input.missingMessage, 'blocking', input.refs));
    input.requiredActions.push(this.requiredAction(
      input.actionCode,
      'blocking',
      input.loopbackTarget,
      input.refs,
      input.missingMessage,
    ));
  }

  private findLineageIssues(
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    support: TopicSelectionPromotionDecisionSupportRecord,
    dossier: TopicSelectionPromotionDossierRecord,
    miniCheck: TopicSelectionArgumentReadinessMiniCheckRecord,
  ): TopicSelectionGateIssue[] {
    const issues: TopicSelectionGateIssue[] = [];
    const requiredRefs: Array<[string, TopicSelectionFunctionalRef | null | undefined]> = [
      ['promotion_input_snapshot_ref', handoff.promotion_input_snapshot_ref],
      ['topic_package_ref', handoff.topic_package_ref],
      ['package_trace_boundary_check_ref', handoff.package_trace_boundary_check_ref],
      ['package_readiness_assessment_ref', handoff.package_readiness_assessment_ref],
      ['topic_value_assessment_ref', handoff.topic_value_assessment_ref],
      ['topic_question_ref', handoff.topic_question_ref],
      ['topic_question_contract_ref', handoff.topic_question_contract_ref],
      ['answerability_plan_ref', handoff.answerability_plan_ref],
      ['research_slice_ref', handoff.research_slice_ref],
    ];
    for (const [key, ref] of requiredRefs) {
      if (!this.hasRef(ref)) {
        issues.push(this.issue(`missing_${key}`, `Promotion gate handoff is missing ${key}.`, 'blocking'));
      }
    }
    if (handoff.validated_need_refs.length === 0) {
      issues.push(this.issue('missing_validated_need_refs', 'Promotion gate handoff is missing validated need refs.', 'blocking'));
    }
    if (handoff.evidence_refs.length === 0) {
      issues.push(this.issue('missing_evidence_refs', 'Promotion gate handoff is missing selected evidence refs.', 'blocking'));
    }
    if (handoff.readiness_check_refs.length === 0) {
      issues.push(this.issue('missing_readiness_check_refs', 'Promotion gate handoff is missing readiness check refs.', 'blocking'));
    }
    if (!this.hasText(support.summary)) {
      issues.push(this.issue('missing_support_summary', 'PromotionDecisionSupport summary is missing.', 'blocking'));
    }
    if (!this.hasRef(dossier.reviewer_packet_artifact_ref)) {
      issues.push(this.issue('missing_dossier_artifact_ref', 'PromotionDossier reviewer packet artifact ref is missing.', 'blocking'));
    }
    if (miniCheck.check_items.length === 0) {
      issues.push(this.issue('missing_argument_mini_check_items', 'ArgumentReadinessMiniCheck has no check items.', 'blocking'));
    }
    return issues;
  }

  private compileSourceRefs(handoff: TopicSelectionPromotionInputSnapshotHandoff): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      handoff.promotion_input_snapshot_ref,
      handoff.topic_package_ref,
      handoff.package_trace_boundary_check_ref,
      handoff.package_readiness_assessment_ref,
      handoff.topic_value_assessment_ref,
      handoff.value_reasoning_memo_ref,
      handoff.value_disposition_decision_ref,
      handoff.topic_question_ref,
      handoff.topic_question_contract_ref,
      handoff.answerability_plan_ref,
      handoff.research_slice_ref,
      ...handoff.validated_need_refs,
      ...handoff.accepted_risk_refs,
      ...handoff.blocker_refs,
      ...handoff.memory_suggestion_refs,
      ...handoff.recheck_request_refs,
      ...handoff.readiness_check_refs,
    ]);
  }

  private compileSupportWarnings(
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    fallbackWarning: TopicSelectionGateIssue | null,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (handoff.accepted_risk_refs.length > 0) {
      warnings.push(this.issue(
        'accepted_risks_carried_forward',
        'Accepted upstream risks are carried forward for human review.',
        'warning',
        handoff.accepted_risk_refs,
      ));
    }
    if (handoff.memory_suggestion_refs.length > 0) {
      warnings.push(this.issue(
        'memory_suggestions_carried_forward',
        'Upstream memory suggestions are visible but not resolved in T-062.',
        'warning',
        handoff.memory_suggestion_refs,
      ));
    }
    if (fallbackWarning) {
      warnings.push(fallbackWarning);
    }
    return warnings;
  }

  private deterministicReviewerQuestions(handoff: TopicSelectionPromotionInputSnapshotHandoff): string[] {
    return [
      `Does package ${handoff.topic_package_id} stay within the carried claim ceiling and selected evidence?`,
      'Are accepted risks acceptable for the intended paper project intake?',
    ];
  }

  private deterministicRiskNotes(handoff: TopicSelectionPromotionInputSnapshotHandoff): string[] {
    return handoff.accepted_risk_refs.length > 0
      ? handoff.accepted_risk_refs.map((ref) => `Accepted risk carried forward: ${ref.ref_type}:${ref.ref_id}.`)
      : [];
  }

  private deterministicRecheckNotes(handoff: TopicSelectionPromotionInputSnapshotHandoff): string[] {
    return handoff.recheck_request_refs.length > 0
      ? handoff.recheck_request_refs.map((ref) => `Recheck required before promotion: ${ref.ref_type}:${ref.ref_id}.`)
      : [];
  }

  private resolveSupportSummary(
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    draft: TopicSelectionPromotionDecisionSupportLlmDraft | null,
  ): string {
    if (this.hasText(draft?.summary)) {
      return draft.summary.trim();
    }
    return `Promotion input snapshot ${handoff.promotion_input_snapshot_id} is compiled for deterministic v1c gate review.`;
  }

  private resolveDossierSummary(
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    support: TopicSelectionPromotionDecisionSupportRecord,
  ): string {
    return `Reviewer packet for topic package ${handoff.topic_package_id} using promotion input snapshot ${support.promotion_input_snapshot_id}.`;
  }

  private buildDossierPayload(
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
    support: TopicSelectionPromotionDecisionSupportRecord,
    draft: TopicSelectionPromotionDecisionSupportLlmDraft | null,
  ): Record<string, unknown> {
    const packageSnapshot = this.asRecord(handoff.snapshot.package_snapshot);
    const packageDraftInputSnapshot = this.asRecord(handoff.snapshot.package_draft_input_snapshot);
    const claimCeiling = this.resolveClaimCeiling(packageSnapshot, packageDraftInputSnapshot);
    const contributionSummary = this.readStringAtAnyPath(packageSnapshot, [
      ['contribution_summary'],
      ['package_payload', 'contribution_summary'],
      ['summary'],
    ]);
    const evaluationPlan = this.readStringAtAnyPath(packageSnapshot, [
      ['evaluation_plan'],
      ['package_payload', 'evaluation_plan'],
      ['evaluation_plan_summary'],
    ]) ?? this.readStringAtAnyPath(packageDraftInputSnapshot, [
      ['evaluation_plan'],
      ['value_assessment_input', 'evaluation_plan'],
    ]);
    return {
      summary: support.summary,
      dossier_markdown: draft?.dossier_markdown ?? null,
      reviewer_questions: support.reviewer_questions,
      risk_notes: support.risk_notes,
      recheck_notes: support.recheck_notes,
      n3_semantic_layer: {
        claim_ceiling_alignment: {
          status: claimCeiling ? 'addressed' : 'missing',
          refs: [handoff.topic_question_contract_ref],
          rationale: claimCeiling ?? 'Claim ceiling is missing from the frozen promotion input.',
        },
        contribution_summary: {
          status: contributionSummary ? 'addressed' : 'missing',
          refs: [handoff.topic_package_ref],
          rationale: contributionSummary ?? 'Contribution summary is missing from the frozen promotion input.',
        },
        evaluation_plan_summary: {
          status: evaluationPlan ? 'addressed' : 'missing',
          refs: [handoff.topic_package_ref, handoff.answerability_plan_ref],
          rationale: evaluationPlan ?? 'Evaluation plan is missing from the frozen promotion input.',
        },
        evidence_support_map: {
          status: handoff.evidence_refs.length > 0 ? 'addressed' : 'missing',
          refs: handoff.evidence_refs.map((record) => record.evidence_ref),
          rationale: handoff.evidence_refs.length > 0
            ? 'Selected evidence refs are present in the frozen promotion input.'
            : 'Selected evidence refs are missing from the frozen promotion input.',
        },
        accepted_risk_acknowledgements: {
          status: 'addressed',
          refs: handoff.accepted_risk_refs,
          rationale: handoff.accepted_risk_refs.length > 0
            ? 'Accepted risks are carried forward for human review.'
            : 'No accepted risks are carried forward.',
        },
        recheck_obligation_summary: {
          status: handoff.recheck_request_refs.length > 0 ? 'weak' : 'addressed',
          refs: handoff.recheck_request_refs,
          rationale: handoff.recheck_request_refs.length > 0
            ? 'Carried recheck requests must be resolved before promotion.'
            : 'No carried recheck requests are present.',
        },
        critic_finding_resolution_map: [],
        readiness_coverage_items: support.reviewer_questions.map((question, index) => ({
          item_id: `readiness_coverage_${String(index + 1).padStart(3, '0')}`,
          status: 'addressed',
          refs: [handoff.promotion_input_snapshot_ref],
          rationale: question,
        })),
      },
      source_lineage: {
        promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
        topic_package_ref: handoff.topic_package_ref,
        topic_value_assessment_ref: handoff.topic_value_assessment_ref,
        topic_question_ref: handoff.topic_question_ref,
        research_slice_ref: handoff.research_slice_ref,
        validated_need_refs: handoff.validated_need_refs,
        evidence_refs: handoff.evidence_refs,
      },
      carried_forward: {
        accepted_risk_refs: handoff.accepted_risk_refs,
        blocker_refs: handoff.blocker_refs,
        memory_suggestion_refs: handoff.memory_suggestion_refs,
        recheck_request_refs: handoff.recheck_request_refs,
      },
      source_snapshot_excerpt: {
        topic_package_id: handoff.topic_package_id,
        package_version: handoff.package_version,
        contribution_summary: contributionSummary,
        evaluation_plan: evaluationPlan,
        claim_ceiling: claimCeiling,
        prohibited_claims: this.readStringArrayAtAnyPath(packageSnapshot, [
          ['prohibited_claims'],
          ['package_payload', 'prohibited_claims'],
          ['topic_question_contract', 'prohibited_claims'],
        ]),
        selected_literature_evidence_ids: this.readStringArrayAtAnyPath(packageSnapshot, [
          ['selected_literature_evidence_ids'],
          ['package_payload', 'selected_literature_evidence_ids'],
        ]),
        selected_evidence_refs: handoff.evidence_refs,
      },
      source_snapshot_hashes: handoff.snapshot_hashes,
      reviewer_facing_read_model_only: true,
    };
  }

  private assertWorkspace(
    requestedWorkspaceId: string | null,
    handoff: TopicSelectionPromotionInputSnapshotHandoff,
  ): void {
    const sourceWorkspaceId = handoff.snapshot.workspace_id ?? null;
    if (requestedWorkspaceId && sourceWorkspaceId && requestedWorkspaceId !== sourceWorkspaceId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PromotionInputSnapshot workspace mismatch: requested ${requestedWorkspaceId}, source ${sourceWorkspaceId}.`,
      );
    }
  }

	  private computeSupportRunKey(input: {
	    promotionInputSnapshotId: string;
	    promotionInputSnapshotHash: string;
	    policyVersionId: string | null;
	    supportGenerationMode: TopicSelectionPromotionSupportGenerationMode;
	    workflowProfileVersion: string | null;
	    promptTemplateVersion: string | null;
	    model: LlmModelRef | null;
	    verifiedRuntimeDraftIdentityHash: string | null;
	  }): string {
	    return sha256Text(stableStringify({
	      promotion_input_snapshot_id: input.promotionInputSnapshotId,
	      promotion_input_snapshot_hash: input.promotionInputSnapshotHash,
	      policy_version_id: input.policyVersionId,
	      support_generation_mode: input.supportGenerationMode,
	      workflow_profile_version: input.workflowProfileVersion,
	      prompt_template_version: input.promptTemplateVersion,
	      model: input.model,
	      verified_runtime_draft_identity_hash: input.verifiedRuntimeDraftIdentityHash,
	    }));
	  }

  private hasClaimCeiling(
    packageSnapshot: Record<string, unknown>,
    packageDraftInput: Record<string, unknown>,
  ): boolean {
    return this.resolveClaimCeiling(packageSnapshot, packageDraftInput) !== null;
  }

  private resolveClaimCeiling(
    packageSnapshot: Record<string, unknown>,
    packageDraftInput: Record<string, unknown>,
  ): string | null {
    return this.readStringAtAnyPath(packageSnapshot, [
      ['claim_ceiling'],
      ['claim_ceiling_summary'],
      ['package_payload', 'claim_ceiling'],
      ['package_payload', 'claim_ceiling_summary'],
      ['package_payload', 'claim_ceiling_fit'],
      ['topic_question_contract', 'claim_ceiling'],
    ]) ?? this.readStringAtAnyPath(packageDraftInput, [
      ['claim_ceiling'],
      ['claim_ceiling_summary'],
      ['question_contract', 'claim_ceiling'],
      ['topic_question_contract', 'claim_ceiling'],
      ['topic_value_assessment', 'claim_ceiling'],
      ['value_assessment_input', 'claim_ceiling'],
    ]);
  }

  private readStringAtAnyPath(record: Record<string, unknown>, paths: string[][]): string | null {
    for (const path of paths) {
      const value = this.readString(record, path);
      if (this.hasText(value)) {
        return value;
      }
    }
    return null;
  }

  private readStringArrayAtAnyPath(record: Record<string, unknown>, paths: string[][]): string[] {
    for (const path of paths) {
      const value = this.readUnknown(record, path);
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        return value;
      }
    }
    return [];
  }

  private hasTextAtAnyPath(record: Record<string, unknown>, paths: string[][]): boolean {
    return paths.some((path) => this.hasText(this.readUnknown(record, path)));
  }

  private readString(value: unknown, path: string[]): string | null {
    const found = this.readUnknown(value, path);
    return typeof found === 'string' ? found : null;
  }

  private readUnknown(value: unknown, path: string[]): unknown {
    let current = value;
    for (const segment of path) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private hasRef(ref: TopicSelectionFunctionalRef | null | undefined): boolean {
    return Boolean(ref?.ref_type && ref.ref_id);
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId?: string | null,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: versionId ?? null,
      title_card_id: titleCardId ?? null,
    };
  }

  private issue(
    code: string,
    message: string,
    severity: TopicSelectionGateIssue['severity'],
    refs: TopicSelectionFunctionalRef[] = [],
  ): TopicSelectionGateIssue {
    return {
      code,
      message,
      severity,
      refs,
    };
  }

  private requiredAction(
    actionCode: string,
    severity: TopicSelectionPromotionGateRequiredAction['severity'],
    loopbackTarget: TopicSelectionPromotionGateLoopbackTarget,
    refs: TopicSelectionFunctionalRef[],
    reason: string,
  ): TopicSelectionPromotionGateRequiredAction {
    return {
      action_code: actionCode,
      severity,
      loopback_target: loopbackTarget,
      refs,
      reason,
    };
  }

  private loopbackHint(
    loopbackTarget: TopicSelectionPromotionGateLoopbackTarget,
    loopbackCause: string,
    actions: TopicSelectionPromotionGateRequiredAction[],
  ): TopicSelectionPromotionGateLoopbackHint {
    return {
      loopback_target: loopbackTarget,
      loopback_cause: loopbackCause,
      required_actions: actions,
      refs: this.uniqueRefs(actions.flatMap((action) => action.refs)),
    };
  }

  private loopbackHintsFromActions(
    actions: TopicSelectionPromotionGateRequiredAction[],
  ): TopicSelectionPromotionGateLoopbackHint[] {
    const byTarget = new Map<TopicSelectionPromotionGateLoopbackTarget, TopicSelectionPromotionGateRequiredAction[]>();
    for (const action of actions) {
      const bucket = byTarget.get(action.loopback_target) ?? [];
      bucket.push(action);
      byTarget.set(action.loopback_target, bucket);
    }
    return [...byTarget.entries()].map(([target, targetActions]) => this.loopbackHint(
      target,
      'argument_mini_check_gap',
      targetActions,
    ));
  }

  private uniqueActions(
    actions: TopicSelectionPromotionGateRequiredAction[],
  ): TopicSelectionPromotionGateRequiredAction[] {
    const seen = new Set<string>();
    const unique: TopicSelectionPromotionGateRequiredAction[] = [];
    for (const action of actions) {
      const key = `${action.action_code}:${action.loopback_target}:${stableStringify(action.refs)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(action);
      }
    }
    return unique;
  }

  private uniqueLoopbackHints(
    hints: TopicSelectionPromotionGateLoopbackHint[],
  ): TopicSelectionPromotionGateLoopbackHint[] {
    const seen = new Set<string>();
    const unique: TopicSelectionPromotionGateLoopbackHint[] = [];
    for (const hint of hints) {
      const key = `${hint.loopback_target}:${hint.loopback_cause}:${stableStringify(hint.refs)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(hint);
      }
    }
    return unique;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const unique: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!this.hasRef(ref)) {
        continue;
      }
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ref);
      }
    }
    return unique;
  }

  private toGateVerdict(disposition: TopicSelectionPromotionGateDisposition): TopicSelectionGateVerdict {
    if (disposition === 'ready_for_human_decision') {
      return 'needs_human_review';
    }
    return 'block';
  }

  private toTransitionResult(
    disposition: TopicSelectionPromotionGateDisposition,
  ): TopicSelectionTransitionResult {
    if (disposition === 'ready_for_human_decision') {
      return 'needs_human_review';
    }
    return 'blocked';
  }

  /**
   * T-087 Phase 4 read-only projection — list PromotionGateChecks under a
   * title-card. Pure repository delegation.
   */
  async listGateChecksByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionPromotionGateCheckRecord[]> {
    return this.repository.listGateChecksByTitleCardId(titleCardId);
  }
}
