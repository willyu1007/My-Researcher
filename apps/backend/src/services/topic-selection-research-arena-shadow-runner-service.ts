import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  topicSelectionResearchArenaRoleOutputSchema,
  type TopicSelectionResearchArenaAdvisorySynthesis,
  type TopicSelectionResearchArenaRoleEvidencePreparation,
  type TopicSelectionResearchArenaRoleOutput,
  type TopicSelectionResearchArenaShadowRole,
  type TopicSelectionResearchArenaShadowRoleInput,
  type TopicSelectionResearchArenaShadowRunRequest,
  type TopicSelectionResearchArenaShadowRunResponse,
  type TopicSelectionResearchEvidencePacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
import type {
  TopicSelectionAgentInvocationRequest,
} from './topic-selection-agent-orchestrator-service.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_RESEARCH_ARENA_OPPORTUNITY_SCOUT_PROFILE_ID,
  TOPIC_SELECTION_RESEARCH_ARENA_PRIOR_ART_TOPIC_KILLER_PROFILE_ID,
} from './topic-selection-model-profile-registry-service.js';
import type { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import { defaultLlmConfig, type LlmConfigReader } from './llm-config-loader.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const OUTPUT_CONTRACT = 'TopicSelectionResearchArenaRoleOutput@v1' as const;
const ROLE_PROMPT_IDS: Record<TopicSelectionResearchArenaShadowRole, string> = {
  opportunity_scout: 'topic-selection-research-arena-opportunity-scout',
  prior_art_topic_killer: 'topic-selection-research-arena-prior-art-topic-killer',
};
const ROLE_PROFILE_IDS: Record<TopicSelectionResearchArenaShadowRole, string> = {
  opportunity_scout: TOPIC_SELECTION_RESEARCH_ARENA_OPPORTUNITY_SCOUT_PROFILE_ID,
  prior_art_topic_killer: TOPIC_SELECTION_RESEARCH_ARENA_PRIOR_ART_TOPIC_KILLER_PROFILE_ID,
};
const REQUIRED_ROLES: readonly TopicSelectionResearchArenaShadowRole[] = [
  'opportunity_scout',
  'prior_art_topic_killer',
];

type AgentInvoker = {
  invokeStructuredOutput<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
  ): Promise<{ status: string; structured_output: T | null }>;
};

type SnapshotReader = Pick<TopicSelectionControlPlaneService, 'getInputSnapshot'>;
type ArtifactStore = Pick<TopicSelectionControlPlaneService, 'getArtifactRef' | 'recordArtifactRef'>;
type ArenaRuntime = Pick<TopicSelectionResearchArenaService, 'recordRoleExecution' | 'synthesizeSession'>;

export class TopicSelectionResearchArenaShadowRunnerService {
  private readonly llmConfig: Pick<LlmConfigReader, 'getPrompt'>;

  constructor(private readonly dependencies: {
    arenaRepository: Pick<TopicSelectionResearchArenaRepository, 'findSessionById'>;
    snapshotReader: SnapshotReader;
    artifactStore: ArtifactStore;
    agentInvoker: AgentInvoker;
    arenaService: ArenaRuntime;
    llmConfig?: Pick<LlmConfigReader, 'getPrompt'>;
  }) {
    this.llmConfig = dependencies.llmConfig ?? defaultLlmConfig();
  }

  async run(
    input: TopicSelectionResearchArenaShadowRunRequest,
  ): Promise<TopicSelectionResearchArenaShadowRunResponse> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) {
      throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    }
    if (session.status !== 'open' || !session.current_arena_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Shadow execution requires the current open arena.');
    }
    if (!this.sameStringSet(session.participant_roles, REQUIRED_ROLES)) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'The v1 shadow runner requires exactly the opportunity scout and prior-art topic killer.',
      );
    }
    const snapshot = await this.requireSnapshot(session.input_snapshot_id, session.title_card_id);
    if (snapshot.snapshot_hash !== session.input_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena InputSnapshot hash no longer matches its bound identity.');
    }
    this.assertCandidatesBoundToSnapshot(input.candidate_refs, snapshot);
    const roleInputs = this.indexRoleInputs(input.role_inputs, session.title_card_id, input.execution_mode);
    const preparedRoles = await Promise.all(REQUIRED_ROLES.map(async (role) => {
      const roleInput = roleInputs.get(role)!;
      const packet = await this.requireEvidencePacket(roleInput.evidence_preparation, session.input_snapshot_id);
      return { role, roleInput, packet };
    }));

    // Both independent source invocations are started and completed before any role output is
    // persisted or admitted. This is the core first-pass non-exposure guarantee.
    const invocationResults = await Promise.all(preparedRoles.map(({ role, roleInput, packet }) => (
      this.invokeRole(input, role, roleInput, packet)
    )));
    const outputs = new Map<TopicSelectionResearchArenaShadowRole, TopicSelectionResearchArenaRoleOutput>();
    invocationResults.forEach((result, index) => {
      const prepared = preparedRoles[index]!;
      if (result.status !== 'succeeded' || !result.structured_output) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          `${prepared.role} did not produce an admissible independent first-pass output.`,
        );
      }
      this.assertRoleOutput(result.structured_output, prepared.role, input.candidate_refs, prepared.packet);
      outputs.set(prepared.role, result.structured_output);
    });
    this.assertFindingIdsUnique(outputs);

    const outputArtifacts = new Map<TopicSelectionResearchArenaShadowRole, TopicSelectionArtifactRefRecord>();
    for (const role of REQUIRED_ROLES) {
      const output = outputs.get(role)!;
      const payload = output as unknown as Record<string, unknown>;
      outputArtifacts.set(role, await this.dependencies.artifactStore.recordArtifactRef({
        workspace_id: session.workspace_id,
        title_card_id: session.title_card_id,
        artifact_kind: 'structured_output',
        storage_kind: 'inline',
        payload,
        checksum: sha256Text(stableStringify(payload)),
        mime_type: 'application/json',
        workflow_run_id: input.workflow_run_id,
        input_snapshot_id: session.input_snapshot_id,
        created_by: input.execution_mode === 'codex_assisted' ? 'hybrid' : 'system',
      }));
    }

    const roleExecutions = [];
    for (let index = 0; index < preparedRoles.length; index += 1) {
      const prepared = preparedRoles[index]!;
      const preparation = prepared.roleInput.evidence_preparation;
      const packetRef = preparation.evidence_packet_artifact_ref!;
      const outputRef = this.artifactRef(outputArtifacts.get(prepared.role)!);
      const { provenance_hash: _provenanceHash, ...retrievalProvenance } = preparation.retrieval_provenance!;
      roleExecutions.push(await this.dependencies.arenaService.recordRoleExecution({
        arena_session_id: session.arena_session_id,
        role_slot_id: prepared.roleInput.role_slot_id,
        instance_index: index,
        participant_role: prepared.role,
        pass_kind: 'first_pass',
        evidence_packet_artifact_ref: packetRef,
        retrieval_provenance: retrievalProvenance,
        exposure_artifact_refs: [packetRef],
        output_artifact_ref: outputRef,
        prior_role_hashes: [],
      }));
    }

    const advisorySynthesis = this.synthesize(input.candidate_refs, outputs);
    const transcriptPayload = {
      schema_version: 'TopicSelectionResearchArenaLoopTranscript@v1',
      arena_session_id: session.arena_session_id,
      input_snapshot_id: session.input_snapshot_id,
      independent_first_pass: roleExecutions.map((execution) => ({
        participant_role: execution.participant_role,
        evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
        evidence_packet_hash: execution.evidence_packet_hash,
        exposure_set_hash: execution.exposure_set_hash,
        output_artifact_ref: execution.output_artifact_ref,
        output_artifact_hash: execution.output_artifact_hash,
        prior_role_hashes: execution.prior_role_hashes,
      })),
      advisory_synthesis: advisorySynthesis,
      support_only: true,
    };
    const synthesisArtifactHash = sha256Text(stableStringify(transcriptPayload));
    const synthesisArtifact = await this.dependencies.artifactStore.recordArtifactRef({
      workspace_id: session.workspace_id,
      title_card_id: session.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: transcriptPayload,
      checksum: synthesisArtifactHash,
      mime_type: 'application/json',
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: session.input_snapshot_id,
      created_by: 'system',
    });
    const synthesisArtifactRef = this.artifactRef(synthesisArtifact);
    const synthesizedSession = await this.dependencies.arenaService.synthesizeSession({
      arena_session_id: session.arena_session_id,
      termination_reason: advisorySynthesis.outcome === 'selected'
        ? 'recommendation_ready'
        : advisorySynthesis.outcome,
      loop_transcript_artifact_ref: synthesisArtifactRef,
    });

    return {
      schema_version: 'TopicSelectionResearchArenaShadowRunResponse@v1',
      arena_session: synthesizedSession,
      role_executions: roleExecutions,
      synthesis_artifact_ref: synthesisArtifactRef,
      synthesis_artifact_hash: synthesisArtifactHash,
      advisory_synthesis: advisorySynthesis,
      support_only: true,
    };
  }

  private async invokeRole(
    input: TopicSelectionResearchArenaShadowRunRequest,
    role: TopicSelectionResearchArenaShadowRole,
    roleInput: TopicSelectionResearchArenaShadowRoleInput,
    packet: TopicSelectionResearchEvidencePacket,
  ) {
    const prompt = this.llmConfig.getPrompt('topic-selection', ROLE_PROMPT_IDS[role]);
    const packetRef = roleInput.evidence_preparation.evidence_packet_artifact_ref!;
    const userPayload = stableStringify({
      arena_session_id: input.arena_session_id,
      candidate_refs: input.candidate_refs,
      evidence_packet: packet,
      participant_role: role,
    });
    return this.dependencies.agentInvoker.invokeStructuredOutput<TopicSelectionResearchArenaRoleOutput>({
      title_card_id: roleInput.evidence_preparation.title_card_id,
      node_id: `topic_selection_research_arena_${role}`,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: `${input.node_attempt_id}:${role}`,
      execution_mode: input.execution_mode,
      executor_kind: 'multi_agent_debate',
      run_mode: 'acceptance',
      profile_id: ROLE_PROFILE_IDS[role],
      output_contract: OUTPUT_CONTRACT,
      prompt: { promptTemplateId: ROLE_PROMPT_IDS[role], version: prompt.version },
      schema_name: OUTPUT_CONTRACT,
      schema: topicSelectionResearchArenaRoleOutputSchema as unknown as Record<string, unknown>,
      messages: [
        { role: 'system', content: prompt.system },
        {
          role: 'user',
          content: `<research_arena_input>\n${userPayload}\n</research_arena_input>`,
        },
      ],
      input_refs: [...input.candidate_refs, packetRef],
      context_packet_refs: [packetRef as TopicSelectionArtifactFunctionalRef],
      ...(input.execution_mode === 'mocked_llm'
        ? {
            mocked_output: {
              fixture_id: roleInput.fixture_id!,
              output: roleInput.structured_output,
              mock_profile: 'research_arena_shadow_v1',
            },
          }
        : {
            codex_response: {
              output: roleInput.structured_output,
              operator_label: roleInput.operator_label!,
            },
          }),
      created_by: input.execution_mode === 'codex_assisted' ? 'hybrid' : 'system',
    });
  }

  private indexRoleInputs(
    roleInputs: TopicSelectionResearchArenaShadowRoleInput[],
    titleCardId: string,
    executionMode: TopicSelectionResearchArenaShadowRunRequest['execution_mode'],
  ): Map<TopicSelectionResearchArenaShadowRole, TopicSelectionResearchArenaShadowRoleInput> {
    if (roleInputs.length !== REQUIRED_ROLES.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Shadow run requires exactly two role inputs.');
    }
    const indexed = new Map(roleInputs.map((input) => [input.participant_role, input]));
    if (indexed.size !== REQUIRED_ROLES.length || REQUIRED_ROLES.some((role) => !indexed.has(role))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Shadow run requires one scout and one prior-art topic killer.');
    }
    for (const role of REQUIRED_ROLES) {
      const roleInput = indexed.get(role)!;
      const preparation = roleInput.evidence_preparation;
      if (!roleInput.role_slot_id.trim()
        || preparation.status !== 'ready'
        || preparation.title_card_id !== titleCardId
        || preparation.participant_role !== role
        || !preparation.retrieval_provenance
        || !preparation.evidence_packet_artifact_ref
        || !preparation.evidence_packet_hash
        || preparation.unresolved_literature_refs.length > 0) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${role} requires a complete ready evidence preparation.`);
      }
      const sourceIdentityValid = executionMode === 'mocked_llm'
        ? Boolean(roleInput.fixture_id && roleInput.operator_label === null)
        : Boolean(roleInput.operator_label && roleInput.fixture_id === null);
      if (roleInput.structured_output.participant_role !== role || !sourceIdentityValid) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${role} source identity or structured output role is invalid.`);
      }
    }
    return indexed;
  }

  private async requireSnapshot(
    snapshotId: string,
    titleCardId: string,
  ): Promise<TopicSelectionInputSnapshotRecord> {
    const snapshot = await this.dependencies.snapshotReader.getInputSnapshot(snapshotId);
    if (!snapshot) throw new AppError(404, 'NOT_FOUND', `InputSnapshot ${snapshotId} was not found.`);
    if (snapshot.title_card_id !== titleCardId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena InputSnapshot is outside the title card.');
    }
    return snapshot;
  }

  private assertCandidatesBoundToSnapshot(
    candidateRefs: TopicSelectionFunctionalRef[],
    snapshot: TopicSelectionInputSnapshotRecord,
  ): void {
    const candidateKeys = candidateRefs.map((ref) => this.refKey(ref));
    if (candidateKeys.length === 0 || new Set(candidateKeys).size !== candidateKeys.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Candidate refs must be non-empty and unique.');
    }
    const boundKeys = new Set([...snapshot.source_refs, snapshot.target_ref].map((ref) => this.refKey(ref)));
    if (candidateKeys.some((key) => !boundKeys.has(key))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Every shadow candidate must be bound to the exact arena InputSnapshot.');
    }
  }

  private async requireEvidencePacket(
    preparation: TopicSelectionResearchArenaRoleEvidencePreparation,
    inputSnapshotId: string,
  ): Promise<TopicSelectionResearchEvidencePacket> {
    const ref = preparation.evidence_packet_artifact_ref!;
    if (ref.ref_type !== 'artifact_ref') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'EvidencePacket requires an artifact_ref.');
    }
    const artifact = await this.dependencies.artifactStore.getArtifactRef(ref.ref_id);
    const value = artifact?.payload;
    if (!artifact || artifact.input_snapshot_id !== inputSnapshotId
      || artifact.checksum !== preparation.evidence_packet_hash
      || !value || value.schema_version !== 'TopicSelectionResearchEvidencePacket@v1'
      || value.packet_hash !== preparation.evidence_packet_hash
      || value.participant_role !== preparation.participant_role
      || !Array.isArray(value.items) || value.items.length === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'EvidencePacket artifact is missing or outside the exact role snapshot.');
    }
    return value as unknown as TopicSelectionResearchEvidencePacket;
  }

  private assertRoleOutput(
    output: TopicSelectionResearchArenaRoleOutput,
    role: TopicSelectionResearchArenaShadowRole,
    candidateRefs: TopicSelectionFunctionalRef[],
    packet: TopicSelectionResearchEvidencePacket,
  ): void {
    if (output.schema_version !== OUTPUT_CONTRACT || output.participant_role !== role) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${role} output identity is invalid.`);
    }
    const expectedCandidates = candidateRefs.map((ref) => this.refKey(ref)).sort();
    const reviewedCandidates = output.candidate_reviews.map((review) => this.refKey(review.candidate_ref)).sort();
    if (stableStringify(reviewedCandidates) !== stableStringify(expectedCandidates)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${role} must review every canonical candidate exactly once.`);
    }
    if (role === 'prior_art_topic_killer' && output.new_candidate_proposals.length > 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'The prior-art topic killer cannot propose or repair candidates.');
    }
    const dispositions = output.candidate_reviews.map((review) => review.recommended_disposition);
    const derivedSetOutcome = output.new_candidate_proposals.length > 0
      ? 'reframe_required'
      : dispositions.every((disposition) => disposition === 'dropped')
        ? 'none_viable'
        : dispositions.some((disposition) => disposition === 'selected')
          ? 'selected'
          : 'evidence_expansion_required';
    if (output.semantic_position.recommended_set_outcome !== derivedSetOutcome) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        `${role} set-level position contradicts its candidate dispositions or proposals.`,
      );
    }
    const evidenceKeys = new Set(packet.items.map((item) => this.refKey(item.evidence_unit_ref)));
    const literatureKeys = new Set(packet.items.map((item) => this.refKey(item.literature_ref)));
    const assertGrounded = (refs: TopicSelectionFunctionalRef[], allowed: Set<string>, label: string) => {
      if (refs.length === 0 || refs.some((ref) => !allowed.has(this.refKey(ref)))) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${role} ${label} cites evidence outside its own EvidencePacket.`);
      }
    };
    for (const review of output.candidate_reviews) {
      assertGrounded(review.evidence_unit_refs, evidenceKeys, 'candidate review');
      if ((review.recommended_disposition === 'dropped') !== (review.drop_reason_code !== null)) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${role} drop reason must appear if and only if the candidate is dropped.`);
      }
    }
    for (const finding of output.findings) {
      assertGrounded(finding.evidence_unit_refs, evidenceKeys, 'finding');
      assertGrounded(finding.literature_refs, literatureKeys, 'finding literature');
    }
    for (const proposal of output.new_candidate_proposals) {
      assertGrounded(proposal.evidence_unit_refs, evidenceKeys, 'candidate proposal');
    }
    if (output.unresolved_minority_report) {
      assertGrounded(output.unresolved_minority_report.evidence_unit_refs, evidenceKeys, 'minority report');
      assertGrounded(output.unresolved_minority_report.literature_refs, literatureKeys, 'minority report literature');
    }
  }

  private assertFindingIdsUnique(
    outputs: ReadonlyMap<TopicSelectionResearchArenaShadowRole, TopicSelectionResearchArenaRoleOutput>,
  ): void {
    const ids = [...outputs.values()].flatMap((output) => output.findings.map((finding) => finding.finding_id));
    if (new Set(ids).size !== ids.length) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Research Arena finding ids must be globally unique.');
    }
  }

  private synthesize(
    candidateRefs: TopicSelectionFunctionalRef[],
    outputs: ReadonlyMap<TopicSelectionResearchArenaShadowRole, TopicSelectionResearchArenaRoleOutput>,
  ): TopicSelectionResearchArenaAdvisorySynthesis {
    const reviewsByRole = new Map(REQUIRED_ROLES.map((role) => [
      role,
      new Map(outputs.get(role)!.candidate_reviews.map((review) => [this.refKey(review.candidate_ref), review])),
    ]));
    const unresolvedDissent: string[] = [];
    const candidateDispositions = candidateRefs.map((candidateRef) => {
      const scout = reviewsByRole.get('opportunity_scout')!.get(this.refKey(candidateRef))!;
      const killer = reviewsByRole.get('prior_art_topic_killer')!.get(this.refKey(candidateRef))!;
      const positions = [scout.recommended_disposition, killer.recommended_disposition];
      const disposition = positions.every((position) => position === 'selected')
        ? 'selected' as const
        : positions.every((position) => position === 'dropped')
          ? 'dropped' as const
          : 'parked' as const;
      if (scout.recommended_disposition !== killer.recommended_disposition) {
        unresolvedDissent.push(
          `${candidateRef.ref_id}: opportunity_scout=${scout.recommended_disposition}, prior_art_topic_killer=${killer.recommended_disposition}`,
        );
      }
      return {
        candidate_ref: candidateRef,
        disposition,
        rationale: disposition === 'selected'
          ? 'Both independent roles support selection.'
          : disposition === 'dropped'
            ? 'Both independent roles support a coded stop.'
            : 'The independent roles do not provide consensus-safe selection or rejection.',
        drop_reason_code: disposition === 'dropped'
          ? killer.drop_reason_code ?? scout.drop_reason_code
          : null,
        reopening_conditions: [...new Set([
          ...scout.reopening_conditions,
          ...killer.reopening_conditions,
        ])],
        role_positions: [
          { participant_role: 'opportunity_scout' as const, recommended_disposition: scout.recommended_disposition },
          { participant_role: 'prior_art_topic_killer' as const, recommended_disposition: killer.recommended_disposition },
        ],
      };
    });
    const hasNewProposals = outputs.get('opportunity_scout')!.new_candidate_proposals.length > 0;
    const allDropped = candidateDispositions.every((candidate) => candidate.disposition === 'dropped');
    const hasSelected = candidateDispositions.some((candidate) => candidate.disposition === 'selected');
    const consensusClosed = candidateDispositions.every((candidate) => candidate.disposition !== 'parked');
    const outcome = hasNewProposals
      ? 'reframe_required' as const
      : allDropped
        ? 'none_viable' as const
        : hasSelected && consensusClosed && unresolvedDissent.length === 0
          ? 'selected' as const
          : 'evidence_expansion_required' as const;
    if (hasNewProposals) {
      for (const candidate of candidateDispositions) {
        if (candidate.disposition === 'selected') candidate.disposition = 'parked';
      }
    }
    return {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome,
      summary: outcome === 'selected'
        ? 'Independent first passes provide consensus-safe advisory selection.'
        : outcome === 'none_viable'
          ? 'Both independent roles recommend coded stops for every canonical candidate.'
          : outcome === 'reframe_required'
            ? 'The scout exposed a provisional alternative that must be canonicalized and independently reviewed.'
            : 'Role conflict or unresolved coverage prevents advisory selection.',
      candidate_dispositions: candidateDispositions,
      preserved_finding_ids: REQUIRED_ROLES.flatMap((role) => (
        outputs.get(role)!.findings.map((finding) => finding.finding_id)
      )),
      unresolved_dissent: unresolvedDissent,
      required_next_delta: outcome === 'reframe_required'
        ? 'candidate'
        : outcome === 'evidence_expansion_required'
          ? 'evidence'
          : null,
      support_only: true,
    };
  }

  private artifactRef(artifact: TopicSelectionArtifactRefRecord): TopicSelectionFunctionalRef {
    return {
      ref_type: 'artifact_ref',
      ref_id: artifact.artifact_ref_id,
      title_card_id: artifact.title_card_id ?? null,
    };
  }

  private sameStringSet(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length
      && new Set(left).size === left.length
      && left.every((value) => right.includes(value));
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }
}
