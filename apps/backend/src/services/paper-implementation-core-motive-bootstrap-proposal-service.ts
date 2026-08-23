import { Ajv, type ValidateFunction } from 'ajv';
import {
  CORE_MOTIVE_BOOTSTRAP_PROPOSAL_SCHEMA_VERSION,
  coreMotiveBootstrapProposalSchema,
  type CoreMotiveBootstrapProposal,
  type ImplementationIntakeSnapshot,
  type ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import {
  PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROFILE_ID,
  PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID,
  PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type {
  TopicSelectionAgentInvocationResult,
  TopicSelectionAgentOrchestratorService,
} from './topic-selection-agent-orchestrator-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';

export const CORE_MOTIVE_BOOTSTRAP_PROFILE_VERSION = 'v1' as const;

export interface CoreMotiveBootstrapProposalRuntimeResult {
  status: 'created' | 'reused' | 'blocked';
  proposal: CoreMotiveBootstrapProposal | null;
  artifact: PaperImplementationRuntimeArtifactEnvelope | null;
  admission: PaperImplementationRuntimeAdmissionRecord | null;
  blocker: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
}

type BootstrapAgentOrchestrator = Pick<
  TopicSelectionAgentOrchestratorService,
  'invokeStructuredOutput'
>;

export interface PaperImplementationCoreMotiveBootstrapProposalServiceOptions {
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  agentOrchestrator: BootstrapAgentOrchestrator;
  now?: () => string;
}

export interface CoreMotiveBootstrapIdentity {
  bootstrapKey: string;
  roleRuntimeArtifactId: string;
  roleRuntimeIdentityHash: string;
  runtimeArtifactId: string;
  runtimeIdentityHash: string;
  motiveId: string;
  coreMotiveVersionId: string;
}

export class PaperImplementationCoreMotiveBootstrapProposalService {
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly agentOrchestrator: BootstrapAgentOrchestrator;
  private readonly now: () => string;
  private readonly proposalValidator: ValidateFunction;

  constructor(options: PaperImplementationCoreMotiveBootstrapProposalServiceOptions) {
    this.runtimeAdmission = options.runtimeAdmission;
    this.agentOrchestrator = options.agentOrchestrator;
    this.now = options.now ?? (() => new Date().toISOString());
    this.proposalValidator = new Ajv({ allErrors: true, strict: false }).compile(
      coreMotiveBootstrapProposalSchema,
    );
  }

  identity(project: ImplementationProject, snapshot: ImplementationIntakeSnapshot): CoreMotiveBootstrapIdentity {
    const bootstrapKey = sha256Text(stableStringify({
      implementation_project_id: project.implementation_project_id,
      intake_snapshot_hash: snapshot.intake_snapshot_hash,
      bootstrap_profile_version: CORE_MOTIVE_BOOTSTRAP_PROFILE_VERSION,
    }));
    const suffix = bootstrapKey.slice(0, 32);
    return {
      bootstrapKey,
      roleRuntimeArtifactId: `pi_runtime_core_motive_bootstrap_role_${suffix}`,
      roleRuntimeIdentityHash: sha256Text(stableStringify({
        bootstrap_key: bootstrapKey,
        workflow_type: 'core_motive_bootstrap',
        slot_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID,
        artifact_scope: 'role',
        profile_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROFILE_ID,
        prompt_version: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_VERSION,
        output_schema_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID,
      })),
      runtimeArtifactId: `pi_runtime_core_motive_bootstrap_${suffix}`,
      runtimeIdentityHash: sha256Text(stableStringify({
        bootstrap_key: bootstrapKey,
        workflow_type: 'core_motive_bootstrap',
        slot_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID,
        artifact_scope: 'final',
        profile_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROFILE_ID,
        prompt_version: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_VERSION,
        output_schema_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID,
      })),
      motiveId: `core_motive_${suffix}`,
      coreMotiveVersionId: `core_motive_version_${suffix}`,
    };
  }

  async getOrCreate(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
  ): Promise<CoreMotiveBootstrapProposalRuntimeResult> {
    const identity = this.identity(project, snapshot);
    const existing = await this.runtimeAdmission.findRuntimeArtifact(
      project.implementation_project_id,
      identity.runtimeArtifactId,
    );
    if (existing) {
      return this.reuseExisting(existing, identity);
    }

    const existingRole = await this.runtimeAdmission.findRuntimeArtifact(
      project.implementation_project_id,
      identity.roleRuntimeArtifactId,
    );
    if (existingRole) {
      return this.finalizeRole(project, snapshot, identity, existingRole);
    }

    const invocation = await this.invoke(project, snapshot, identity);
    if (invocation.status !== 'succeeded' || !invocation.structured_output) {
      return {
        status: 'blocked',
        proposal: null,
        artifact: null,
        admission: null,
        blocker: {
          code: invocation.error_code ?? invocation.blocker_codes[0] ?? 'CORE_MOTIVE_BOOTSTRAP_LLM_BLOCKED',
          message: 'CoreMotive bootstrap proposal could not be produced by the configured LLM runtime.',
          retryable: invocation.status !== 'blocked',
        },
      };
    }

    const proposal = invocation.structured_output;
    this.assertProposal(proposal);
    const roleArtifact = this.buildRoleArtifact(project, snapshot, identity, proposal, invocation);
    let storedRole: PaperImplementationRuntimeArtifactEnvelope;
    try {
      storedRole = await this.runtimeAdmission.recordRuntimeArtifact(roleArtifact);
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') {
        throw error;
      }
      const raced = await this.runtimeAdmission.findRuntimeArtifact(
        project.implementation_project_id,
        identity.roleRuntimeArtifactId,
      );
      if (!raced) {
        throw error;
      }
      return this.finalizeRole(project, snapshot, identity, raced);
    }
    const roleAdmission = await this.admit(storedRole, 'role');
    this.assertAdmitted(roleAdmission, storedRole);
    return this.finalizeRole(project, snapshot, identity, storedRole);
  }

  private async reuseExisting(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    identity: CoreMotiveBootstrapIdentity,
  ): Promise<CoreMotiveBootstrapProposalRuntimeResult> {
    if (
      artifact.runtime_identity_hash !== identity.runtimeIdentityHash
      || artifact.workflow_type !== 'core_motive_bootstrap'
      || artifact.slot_id !== PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID
      || artifact.artifact_scope !== 'final'
      || artifact.runtime_status !== 'passed'
      || artifact.output_schema_id !== PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `RuntimeArtifact ${artifact.runtime_artifact_id} does not match the stable CoreMotive bootstrap identity.`,
      );
    }
    const proposal = this.proposalFromPayload(artifact.artifact_payload);
    const existingAdmissions = await this.runtimeAdmission.listAdmissionRecords(
      artifact.implementation_project_id,
      { runtime_artifact_id: artifact.runtime_artifact_id, admission_scope: 'final' },
    );
    let admission = existingAdmissions.find((record) => record.admission_status === 'admitted') ?? null;
    if (!admission) {
      admission = await this.admit(artifact, 'final');
    }
    this.assertAdmitted(admission, artifact);
    return {
      status: 'reused',
      proposal,
      artifact,
      admission,
      blocker: null,
    };
  }

  private async finalizeRole(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
    identity: CoreMotiveBootstrapIdentity,
    roleArtifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Promise<CoreMotiveBootstrapProposalRuntimeResult> {
    if (
      roleArtifact.runtime_identity_hash !== identity.roleRuntimeIdentityHash
      || roleArtifact.workflow_type !== 'core_motive_bootstrap'
      || roleArtifact.slot_id !== PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID
      || roleArtifact.artifact_scope !== 'role'
      || roleArtifact.runtime_status !== 'passed'
      || roleArtifact.output_schema_id !== PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID
    ) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `RuntimeArtifact ${roleArtifact.runtime_artifact_id} does not match the stable CoreMotive bootstrap role identity.`,
      );
    }
    const proposal = this.proposalFromPayload(roleArtifact.artifact_payload);
    const roleAdmissions = await this.runtimeAdmission.listAdmissionRecords(
      project.implementation_project_id,
      { runtime_artifact_id: roleArtifact.runtime_artifact_id, admission_scope: 'role' },
    );
    let roleAdmission = roleAdmissions.find((record) => record.admission_status === 'admitted') ?? null;
    if (!roleAdmission) {
      roleAdmission = await this.admit(roleArtifact, 'role');
    }
    this.assertAdmitted(roleAdmission, roleArtifact);

    const finalArtifact = this.buildFinalArtifact(
      project,
      snapshot,
      identity,
      proposal,
      roleArtifact,
    );
    let storedFinal: PaperImplementationRuntimeArtifactEnvelope;
    try {
      storedFinal = await this.runtimeAdmission.recordRuntimeArtifact(finalArtifact);
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') {
        throw error;
      }
      const raced = await this.runtimeAdmission.findRuntimeArtifact(
        project.implementation_project_id,
        identity.runtimeArtifactId,
      );
      if (!raced) throw error;
      return this.reuseExisting(raced, identity);
    }
    const finalAdmission = await this.admit(storedFinal, 'final');
    this.assertAdmitted(finalAdmission, storedFinal);
    return {
      status: 'created',
      proposal,
      artifact: storedFinal,
      admission: finalAdmission,
      blocker: null,
    };
  }

  private async invoke(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
    identity: CoreMotiveBootstrapIdentity,
  ): Promise<TopicSelectionAgentInvocationResult<CoreMotiveBootstrapProposal>> {
    const bootstrapInput = {
      problem_statement: snapshot.working_copy_payload.problem_statement,
      contribution_summary: snapshot.working_copy_payload.contribution_summary,
      evaluation_plan: snapshot.working_copy_payload.evaluation_plan,
      initial_planning_notes: snapshot.working_copy_payload.initial_planning_notes,
      claim_ceiling: snapshot.working_copy_payload.claim_ceiling,
      prohibited_claims: snapshot.working_copy_payload.prohibited_claims,
      conditions: snapshot.working_copy_payload.conditions,
      accepted_risk_refs: snapshot.accepted_risk_refs,
      early_check_obligations: snapshot.early_check_obligations,
      literature_source_refs: snapshot.source_refs.filter((ref) => this.isLiteratureRef(ref)),
      source_lineage_summary: snapshot.working_copy_payload.source_lineage_summary,
    };
    const messages = [
      {
        role: 'system' as const,
        content: [
          'Return only CoreMotiveBootstrapProposal@v1 JSON.',
          'Propose scientific semantics for one CoreMotive while preserving every supplied Topic constraint.',
          'Do not output ids, refs, hashes, authority state, provider settings, credentials, workflow commands, or PAI instructions.',
          'Do not weaken the claim ceiling, prohibited claims, evaluation plan, risks, or early-check obligations.',
        ].join(' '),
      },
      {
        role: 'user' as const,
        content: stableStringify({ bootstrap_input_json: bootstrapInput }),
      },
    ];
    return this.agentOrchestrator.invokeStructuredOutput<CoreMotiveBootstrapProposal>({
      workspace_id: project.workspace_id ?? null,
      feature_id: 'paper_implementation',
      title_card_id: project.title_card_id,
      node_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID,
      workflow_run_id: `core_motive_bootstrap_${identity.bootstrapKey.slice(0, 32)}`,
      node_attempt_id: `core_motive_bootstrap_${identity.bootstrapKey.slice(0, 32)}.proposal.attempt-0`,
      invocation_attempt_id: `core_motive_bootstrap_${identity.bootstrapKey.slice(0, 32)}.proposal.call-1`,
      execution_mode: 'provider_llm',
      executor_kind: 'single_agent',
      run_mode: 'product',
      profile_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROFILE_ID,
      output_contract: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID,
      prompt: {
        promptTemplateId: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_ID,
        version: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_VERSION,
      },
      prompt_variant_key: 'proposal-v1',
      schema_name: 'core_motive_bootstrap_proposal',
      schema: coreMotiveBootstrapProposalSchema as unknown as Record<string, unknown>,
      messages,
      input_refs: [...snapshot.source_refs],
      context_packet_refs: [{
        ref_type: 'artifact_ref',
        ref_id: snapshot.intake_snapshot_id,
        title_card_id: project.title_card_id,
      }],
      context_packet_hashes: [snapshot.intake_snapshot_hash],
      runtime_token_budget: null,
      debate_extension: null,
      created_by: 'system',
    });
  }

  private buildRoleArtifact(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
    identity: CoreMotiveBootstrapIdentity,
    proposal: CoreMotiveBootstrapProposal,
    invocation: TopicSelectionAgentInvocationResult<CoreMotiveBootstrapProposal>,
  ): PaperImplementationRuntimeArtifactEnvelope {
    const proposalHash = sha256Text(stableStringify(proposal));
    const payload = {
      proposal,
      semantic_input_hash: snapshot.working_copy_payload_hash,
      bootstrap_key: identity.bootstrapKey,
      bootstrap_profile_version: CORE_MOTIVE_BOOTSTRAP_PROFILE_VERSION,
    };
    const payloadHash = sha256Text(stableStringify(payload));
    const contextPacketHash = sha256Text(stableStringify({
      intake_snapshot_hash: snapshot.intake_snapshot_hash,
      working_copy_payload_hash: snapshot.working_copy_payload_hash,
    }));
    const tokenBudgetGate = invocation.token_budget_gate_result ?? {
      runtime_gate_status: 'not_applicable',
      context_packet_hash: contextPacketHash,
      prompt_packet_hash: invocation.provenance.prompt_packet_hash,
    };
    const ref = (refType: string, refId: string): TopicSelectionFunctionalRef => ({
      ref_type: refType,
      ref_id: refId,
      title_card_id: project.title_card_id,
    });
    const roleRef = ref(
      'core_motive_bootstrap_proposal_role',
      `${identity.roleRuntimeArtifactId}.proposal`,
    );
    const artifactWithoutIdentity: Omit<
      PaperImplementationRuntimeArtifactEnvelope,
      'artifact_identity_hash'
    > = {
      schema_version: PAPER_IMPLEMENTATION_RUNTIME_ARTIFACT_ENVELOPE_SCHEMA_VERSION,
      runtime_artifact_id: identity.roleRuntimeArtifactId,
      runtime_identity_hash: identity.roleRuntimeIdentityHash,
      implementation_project_id: project.implementation_project_id,
      workflow_type: 'core_motive_bootstrap',
      slot_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID,
      artifact_scope: 'role',
      artifact_contract_id: 'CoreMotiveBootstrapProposalRole',
      artifact_contract_version: 'v1',
      target_ref: ref('core_motive_version', identity.coreMotiveVersionId),
      target_version_id: identity.coreMotiveVersionId,
      input_snapshot_ref: ref('implementation_intake_snapshot', snapshot.intake_snapshot_id),
      input_snapshot_hash: snapshot.intake_snapshot_hash,
      source_hash_bundle_hash: sha256Text(stableStringify({
        intake_snapshot_hash: snapshot.intake_snapshot_hash,
        source_refs: snapshot.source_refs,
      })),
      created_by: 'llm',
      created_at: this.now(),
      role_slot_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_SLOT_ID,
      call_index: 1,
      prior_role_artifact_refs: [],
      prior_role_artifact_hashes: [],
      role_chain_hash: sha256Text(stableStringify([])),
      final_artifact_ref: null,
      final_artifact_hash: null,
      run_mode: 'product',
      execution_mode: 'provider_llm',
      executor_kind: 'single_agent',
      model_profile_id: invocation.provenance.profile_id,
      model_option_id: invocation.provenance.model_option_id,
      runtime_status: 'passed',
      runtime_failure_code: null,
      retry_attempt_index: 0,
      provider_call_count: invocation.provenance.non_provider
        ? 0
        : invocation.provenance.telemetry?.request_count ?? 1,
      response_reuse_status: invocation.provenance.response_reuse_ref
        ? 'hit_non_provider'
        : 'miss',
      response_reuse_decision_ref: invocation.provenance.response_reuse_ref
        ? ref('response_reuse_decision', invocation.provenance.response_reuse_ref)
        : null,
      response_reuse_decision_hash: invocation.provenance.response_reuse_ref
        ? sha256Text(invocation.provenance.response_reuse_ref)
        : null,
      allowed_side_effects: [],
      retrieval_packet_ref: null,
      retrieval_packet_hash: null,
      reviewed_statement_packet_ref: null,
      reviewed_statement_packet_hash: null,
      context_packet_ref: ref('runtime_context_packet', `${identity.roleRuntimeArtifactId}.context`),
      context_packet_hash: contextPacketHash,
      runtime_invocation_context_hash: identity.roleRuntimeIdentityHash,
      context_policy_profile_hash: sha256Text('core-motive-bootstrap-context-policy-v1'),
      cache_policy_profile_hash: sha256Text('core-motive-bootstrap-cache-policy-v1'),
      source_refs: [...snapshot.source_refs],
      source_hashes: [
        this.hashValue(snapshot.intake_snapshot_hash),
        this.hashValue(snapshot.working_copy_payload_hash),
      ],
      prompt_packet_ref: ref('runtime_prompt_packet', `${identity.roleRuntimeArtifactId}.prompt`),
      prompt_packet_hash: invocation.provenance.prompt_packet_hash,
      prompt_template_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_ID,
      prompt_template_version_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_PROMPT_TEMPLATE_VERSION,
      prompt_variant_id: 'proposal-v1',
      prompt_redaction_policy_hash: sha256Text('core-motive-bootstrap-redaction-v1'),
      output_schema_id: PAPER_IMPLEMENTATION_CORE_MOTIVE_BOOTSTRAP_OUTPUT_SCHEMA_ID,
      context_cache_key_hash: sha256Text(`context:${contextPacketHash}`),
      context_cache_status: 'not_applicable',
      context_cache_result_ref: null,
      context_cache_result_hash: null,
      prompt_packet_cache_key_hash: sha256Text(`prompt:${invocation.provenance.prompt_packet_hash}`),
      prompt_packet_cache_status: invocation.provenance.prompt_packet_cache_status ?? 'not_applicable',
      prompt_packet_cache_result_ref: invocation.provenance.prompt_packet_cache_result_ref ?? null,
      prompt_packet_cache_result_hash: invocation.provenance.prompt_packet_cache_result_hash ?? null,
      token_budget_gate_result_ref: ref(
        'token_budget_gate_result',
        `${identity.roleRuntimeArtifactId}.token-budget`,
      ),
      token_budget_gate_result_hash: sha256Text(stableStringify(tokenBudgetGate)),
      compression_policy_profile_hash: sha256Text('core-motive-bootstrap-compression-policy-v1'),
      compression_status: 'not_needed',
      compression_report_ref: null,
      compression_report_hash: null,
      compressed_context_packet_ref: null,
      compressed_context_packet_hash: null,
      artifact_payload: payload,
      artifact_payload_ref: roleRef,
      artifact_payload_hash: payloadHash,
      output_hash: invocation.provenance.structured_output_hash ?? proposalHash,
      runtime_audit_ref: ref('runtime_audit_envelope', `${identity.roleRuntimeArtifactId}.audit`),
      runtime_audit_hash: sha256Text(stableStringify(invocation.audit_snapshot)),
      blocker_codes: [],
      warning_codes: [...invocation.warning_codes],
    };
    return {
      ...artifactWithoutIdentity,
      artifact_identity_hash: sha256Text(stableStringify(artifactWithoutIdentity)),
    };
  }

  private buildFinalArtifact(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
    identity: CoreMotiveBootstrapIdentity,
    proposal: CoreMotiveBootstrapProposal,
    roleArtifact: PaperImplementationRuntimeArtifactEnvelope,
  ): PaperImplementationRuntimeArtifactEnvelope {
    const { artifact_identity_hash: ignoredIdentityHash, ...roleWithoutIdentity } = roleArtifact;
    void ignoredIdentityHash;
    const proposalHash = sha256Text(stableStringify(proposal));
    const finalRef: TopicSelectionFunctionalRef = {
      ref_type: 'core_motive_bootstrap_proposal',
      ref_id: `${identity.runtimeArtifactId}.proposal`,
      title_card_id: project.title_card_id,
    };
    const finalWithoutIdentity: Omit<
      PaperImplementationRuntimeArtifactEnvelope,
      'artifact_identity_hash'
    > = {
      ...roleWithoutIdentity,
      runtime_artifact_id: identity.runtimeArtifactId,
      runtime_identity_hash: identity.runtimeIdentityHash,
      artifact_scope: 'final',
      artifact_contract_id: 'CoreMotiveBootstrapProposal',
      created_by: 'system',
      created_at: this.now(),
      role_slot_id: null,
      call_index: null,
      prior_role_artifact_refs: [roleArtifact.artifact_payload_ref],
      prior_role_artifact_hashes: [roleArtifact.artifact_payload_hash],
      role_chain_hash: sha256Text(stableStringify([roleArtifact.artifact_payload_hash])),
      final_artifact_ref: finalRef,
      final_artifact_hash: proposalHash,
      context_packet_ref: {
        ref_type: 'runtime_context_packet',
        ref_id: `${identity.runtimeArtifactId}.context`,
        title_card_id: project.title_card_id,
      },
      context_packet_hash: sha256Text(stableStringify({
        intake_snapshot_hash: snapshot.intake_snapshot_hash,
        admitted_role_artifact_hash: roleArtifact.artifact_payload_hash,
      })),
      runtime_invocation_context_hash: identity.runtimeIdentityHash,
      prompt_packet_ref: {
        ref_type: 'runtime_prompt_packet',
        ref_id: `${identity.runtimeArtifactId}.prompt`,
        title_card_id: project.title_card_id,
      },
      prompt_variant_id: 'final-v1',
      token_budget_gate_result_ref: {
        ref_type: 'token_budget_gate_result',
        ref_id: `${identity.runtimeArtifactId}.token-budget`,
        title_card_id: project.title_card_id,
      },
      artifact_payload_ref: finalRef,
      output_hash: proposalHash,
      runtime_audit_ref: {
        ref_type: 'runtime_audit_envelope',
        ref_id: `${identity.runtimeArtifactId}.audit`,
        title_card_id: project.title_card_id,
      },
      runtime_audit_hash: sha256Text(stableStringify({
        runtime_identity_hash: identity.runtimeIdentityHash,
        proposal_hash: proposalHash,
        role_artifact_hash: roleArtifact.artifact_identity_hash,
      })),
    };
    return {
      ...finalWithoutIdentity,
      artifact_identity_hash: sha256Text(stableStringify(finalWithoutIdentity)),
    };
  }

  private async admit(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    admissionScope: 'role' | 'final',
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    if (admissionScope === 'final' && !artifact.final_artifact_hash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'CoreMotive bootstrap final artifact is missing its hash.');
    }
    const request = {
      implementation_project_id: artifact.implementation_project_id,
      runtime_artifact_id: artifact.runtime_artifact_id,
      admission_policy_id: `paper-implementation.core-motive-bootstrap.${admissionScope}-admission`,
      admission_policy_version: 'v1',
      expected_runtime_identity_hash: artifact.runtime_identity_hash,
      expected_source_hash_bundle_hash: artifact.source_hash_bundle_hash,
      expected_retrieval_packet_hash: null,
      expected_prompt_packet_hash: artifact.prompt_packet_hash,
      expected_output_schema_id: artifact.output_schema_id,
      expected_prior_role_artifact_hashes: artifact.prior_role_artifact_hashes,
    };
    if (admissionScope === 'final') {
      return this.runtimeAdmission.admitRuntimeArtifact({
        ...request,
        admission_scope: 'final',
        expected_final_artifact_hash: artifact.final_artifact_hash!,
      });
    }
    return this.runtimeAdmission.admitRuntimeArtifact({
      ...request,
      admission_scope: 'role',
      expected_final_artifact_hash: null,
    });
  }

  private assertAdmitted(
    admission: PaperImplementationRuntimeAdmissionRecord,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): void {
    const expectedHash = artifact.artifact_scope === 'final'
      ? artifact.final_artifact_hash
      : artifact.artifact_payload_hash;
    if (
      admission.admission_status !== 'admitted'
      || admission.admitted_artifact_hash !== expectedHash
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CoreMotive bootstrap proposal runtime artifact was not admitted.',
      );
    }
  }

  private proposalFromPayload(payload: Record<string, unknown>): CoreMotiveBootstrapProposal {
    const proposal = payload.proposal;
    this.assertProposal(proposal);
    return proposal;
  }

  private assertProposal(value: unknown): asserts value is CoreMotiveBootstrapProposal {
    if (!this.proposalValidator(value)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Persisted CoreMotive bootstrap proposal no longer matches CoreMotiveBootstrapProposal@v1.',
        { errors: this.proposalValidator.errors ?? [] },
      );
    }
    if ((value as CoreMotiveBootstrapProposal).schema_version
      !== CORE_MOTIVE_BOOTSTRAP_PROPOSAL_SCHEMA_VERSION) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotive bootstrap proposal schema version drifted.');
    }
  }

  private isLiteratureRef(ref: TopicSelectionFunctionalRef): boolean {
    const type = ref.ref_type.toLowerCase().replace(/[^a-z0-9]/g, '');
    return [
      'evidenceunit',
      'literature',
      'literaturerecord',
      'literatureevidence',
    ].includes(type);
  }

  private hashValue(value: string): string {
    return /^[a-f0-9]{64}$/.test(value) ? value : sha256Text(value);
  }
}
