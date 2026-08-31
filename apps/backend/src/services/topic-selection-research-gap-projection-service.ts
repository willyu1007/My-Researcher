import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES,
  type TopicSelectionNeedCandidateRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionResearchArenaAdvisorySynthesis,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchCheckpointRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionNeedValidationRepository } from '../repositories/topic-selection-need-validation.repository.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

type CandidateRepository = Pick<
  TopicSelectionNeedValidationRepository,
  'findNeedCandidateById'
>;

type ArenaRepository = Pick<
  TopicSelectionResearchArenaRepository,
  'findSessionById' | 'findCurrentSession'
>;

type ControlPlane = Pick<
  TopicSelectionControlPlaneService,
  'getArtifactRef' | 'getInputSnapshot'
>;

type CheckpointService = Pick<
  TopicSelectionResearchCheckpointService,
  'getPacket' | 'materializeGapSelectionCheckpoint'
>;

export type TopicSelectionResearchGapProjectionInput = {
  title_card_id: string;
  candidate_refs: TopicSelectionFunctionalRef[];
  policy_version_id?: string | null;
};

/**
 * Owns deterministic projection of an already-persisted gap Arena into the current gap checkpoint.
 * This service has no agent, retrieval, synthesis, or provider dependency by construction.
 */
export class TopicSelectionResearchGapProjectionService {
  constructor(private readonly dependencies: {
    arenaRepository: ArenaRepository;
    candidateRepository: CandidateRepository;
    checkpointService: CheckpointService;
    controlPlane: ControlPlane;
  }) {}

  async projectCurrentGapSelectionCheckpoint(
    input: TopicSelectionResearchGapProjectionInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const candidateKeys = input.candidate_refs.map((candidateRef) => this.refKey(candidateRef));
    if (!input.title_card_id.trim()
      || input.candidate_refs.length === 0
      || new Set(candidateKeys).size !== candidateKeys.length) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Gap projection requires a title card and a non-empty unique candidate-ref set.',
      );
    }
    const candidates = await Promise.all(
      input.candidate_refs.map((candidateRef) => this.requireCandidate(candidateRef, input.title_card_id)),
    );
    const firstCandidate = candidates[0]!;
    if (candidates.some((candidate) => candidate.evidence_map_id !== firstCandidate.evidence_map_id
      || !this.sameRef(candidate.evidence_map_ref, firstCandidate.evidence_map_ref)
      || (candidate.workspace_id ?? null) !== (firstCandidate.workspace_id ?? null))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap projection candidate pool spans multiple EvidenceMaps.');
    }
    return this.dependencies.checkpointService.materializeGapSelectionCheckpoint({
      workspace_id: firstCandidate.workspace_id ?? null,
      title_card_id: input.title_card_id,
      evidence_map_ref: firstCandidate.evidence_map_ref,
      candidates,
      policy_version_id: input.policy_version_id ?? null,
    });
  }

  async recoverSynthesizedSession(
    arenaSessionId: string,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    if (!arenaSessionId.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena session id is required for gap projection recovery.');
    }
    const session = await this.dependencies.arenaRepository.findSessionById(arenaSessionId);
    if (!session) {
      throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${arenaSessionId} was not found.`);
    }
    this.assertRecoverableSession(session);
    const current = await this.dependencies.arenaRepository.findCurrentSession(
      session.title_card_id,
      'gap_portfolio',
    );
    if (!current || current.arena_session_id !== session.arena_session_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap projection recovery requires the exact current Arena session.');
    }
    const snapshot = await this.requireSnapshot(session);
    const transcript = await this.requireTranscript(session, snapshot);
    const synthesis = this.requireSynthesis(session, transcript);
    const candidateRefs = synthesis.candidate_dispositions.map((disposition) => disposition.candidate_ref);
    this.assertCandidatesBoundToSnapshot(candidateRefs, snapshot);
    const candidates = await Promise.all(
      candidateRefs.map((candidateRef) => this.requireCandidate(candidateRef, session.title_card_id)),
    );
    this.assertCandidateAdvisories(session, synthesis, candidates);
    const checkpoint = await this.projectCurrentGapSelectionCheckpoint({
      title_card_id: session.title_card_id,
      candidate_refs: candidateRefs,
    });
    const packet = await this.dependencies.checkpointService.getPacket(checkpoint.research_checkpoint_id);
    const issueCodes = packet.packet_payload.arena_advisory_issue_codes;
    if (!packet.packet_payload.arena_advisory
      || !Array.isArray(issueCodes)
      || issueCodes.length > 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap checkpoint did not recover exact current Arena advice.', {
        issue_codes: Array.isArray(issueCodes) ? issueCodes : ['ARENA_ADVISORY_INVALID'],
      });
    }
    return checkpoint;
  }

  private assertRecoverableSession(session: TopicSelectionResearchArenaSessionRecord): void {
    if (session.arena_kind !== 'gap_portfolio'
      || session.status !== 'synthesized'
      || !session.current_arena_key
      || !session.support_only
      || session.superseded_by_arena_session_id
      || session.superseded_at) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Gap projection recovery requires a current synthesized support-only gap Arena.',
      );
    }
    if (!session.loop_transcript_ref || !session.loop_transcript_hash || !session.synthesized_at) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Synthesized Arena is missing its durable transcript identity.');
    }
  }

  private async requireSnapshot(
    session: TopicSelectionResearchArenaSessionRecord,
  ): Promise<TopicSelectionInputSnapshotRecord> {
    const snapshot = await this.dependencies.controlPlane.getInputSnapshot(session.input_snapshot_id);
    if (!snapshot
      || snapshot.title_card_id !== session.title_card_id
      || snapshot.snapshot_hash !== session.input_snapshot_hash
      || !this.sameRef(snapshot.target_ref, session.target_ref)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena InputSnapshot no longer matches the synthesized session.');
    }
    return snapshot;
  }

  private async requireTranscript(
    session: TopicSelectionResearchArenaSessionRecord,
    snapshot: TopicSelectionInputSnapshotRecord,
  ): Promise<TopicSelectionArtifactRefRecord> {
    const transcriptRef = session.loop_transcript_ref!;
    const transcript = await this.dependencies.controlPlane.getArtifactRef(transcriptRef.ref_id);
    if (!transcript
      || transcriptRef.ref_type !== 'artifact_ref'
      || transcript.title_card_id !== session.title_card_id
      || transcript.input_snapshot_id !== snapshot.input_snapshot_id
      || transcript.checksum !== session.loop_transcript_hash
      || !transcript.payload
      || sha256Text(stableStringify(transcript.payload)) !== session.loop_transcript_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena transcript no longer matches the synthesized session.');
    }
    return transcript;
  }

  private requireSynthesis(
    session: TopicSelectionResearchArenaSessionRecord,
    transcript: TopicSelectionArtifactRefRecord,
  ): TopicSelectionResearchArenaAdvisorySynthesis {
    const payload = transcript.payload!;
    const synthesis = this.asRecord(payload.advisory_synthesis);
    if (payload.schema_version !== 'TopicSelectionResearchArenaLoopTranscript@v2'
      || payload.arena_session_id !== session.arena_session_id
      || payload.input_snapshot_id !== session.input_snapshot_id
      || payload.support_only !== true
      || synthesis?.schema_version !== 'TopicSelectionResearchArenaAdvisorySynthesis@v1'
      || synthesis.support_only !== true
      || !TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES.includes(
        synthesis.outcome as (typeof TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES)[number],
      )
      || !Array.isArray(synthesis.candidate_dispositions)
      || synthesis.candidate_dispositions.length === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena transcript has an invalid advisory synthesis.');
    }
    const expectedTermination = synthesis.outcome === 'selected' ? 'recommendation_ready' : synthesis.outcome;
    if (session.termination_reason !== expectedTermination) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena termination does not match its advisory synthesis.');
    }
    const refs = synthesis.candidate_dispositions.map((value) => this.asRecord(value)?.candidate_ref);
    if (refs.some((value) => !this.isCandidateRef(value, session.title_card_id))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena synthesis has an invalid candidate portfolio.');
    }
    const keys = refs.map((value) => this.refKey(value as TopicSelectionFunctionalRef));
    if (new Set(keys).size !== keys.length) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena synthesis repeats a candidate ref.');
    }
    return synthesis as unknown as TopicSelectionResearchArenaAdvisorySynthesis;
  }

  private async requireCandidate(
    candidateRef: TopicSelectionFunctionalRef,
    titleCardId: string,
  ): Promise<TopicSelectionNeedCandidateRecord> {
    if (!this.isCandidateRef(candidateRef, titleCardId)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap projection has an invalid NeedCandidate ref.');
    }
    const candidate = await this.dependencies.candidateRepository.findNeedCandidateById(candidateRef.ref_id);
    if (!candidate
      || candidate.title_card_id !== titleCardId
      || candidate.candidate_version !== candidateRef.version_id) {
      throw new AppError(409, 'VERSION_CONFLICT', `NeedCandidate ${candidateRef.ref_id} changed before gap projection.`);
    }
    return candidate;
  }

  private assertCandidatesBoundToSnapshot(
    candidateRefs: TopicSelectionFunctionalRef[],
    snapshot: TopicSelectionInputSnapshotRecord,
  ): void {
    const boundRefs = new Set([...snapshot.source_refs, snapshot.target_ref].map((ref) => this.refKey(ref)));
    if (candidateRefs.some((candidateRef) => !boundRefs.has(this.refKey(candidateRef)))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena synthesis candidate is outside the bound InputSnapshot.');
    }
  }

  private assertCandidateAdvisories(
    session: TopicSelectionResearchArenaSessionRecord,
    synthesis: TopicSelectionResearchArenaAdvisorySynthesis,
    candidates: TopicSelectionNeedCandidateRecord[],
  ): void {
    const dispositionByRef = new Map(
      synthesis.candidate_dispositions.map((disposition) => [this.refKey(disposition.candidate_ref), disposition]),
    );
    for (const candidate of candidates) {
      const candidateRef: TopicSelectionFunctionalRef = {
        ref_type: 'need_candidate',
        ref_id: candidate.need_candidate_id,
        title_card_id: candidate.title_card_id,
        version_id: candidate.candidate_version,
      };
      const disposition = dispositionByRef.get(this.refKey(candidateRef));
      const advisory = candidate.current_arena_advisory;
      if (!disposition
        || !advisory
        || !advisory.support_only
        || advisory.arena_session_id !== session.arena_session_id
        || !this.sameRef(advisory.arena_synthesis_ref, session.loop_transcript_ref!)
        || advisory.arena_synthesis_hash !== session.loop_transcript_hash
        || stableStringify({
          disposition: advisory.disposition,
          drop_reason_code: advisory.drop_reason_code,
          rationale: advisory.rationale,
          reopening_conditions: advisory.reopening_conditions,
          selected_against_candidate_ref: advisory.selected_against_candidate_ref,
        }) !== stableStringify({
          disposition: disposition.disposition,
          drop_reason_code: disposition.drop_reason_code,
          rationale: disposition.rationale,
          reopening_conditions: disposition.reopening_conditions,
          selected_against_candidate_ref: disposition.selected_against_candidate_ref,
        })) {
        throw new AppError(409, 'VERSION_CONFLICT', 'NeedCandidate advisory no longer matches the Arena synthesis.');
      }
    }
  }

  private isCandidateRef(value: unknown, titleCardId: string): value is TopicSelectionFunctionalRef {
    const record = this.asRecord(value);
    return record?.ref_type === 'need_candidate'
      && typeof record.ref_id === 'string'
      && Boolean(record.ref_id)
      && record.title_card_id === titleCardId
      && typeof record.version_id === 'string'
      && Boolean(record.version_id);
  }

  private sameRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.title_card_id ?? ''}:${ref.version_id ?? ''}`;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }
}
