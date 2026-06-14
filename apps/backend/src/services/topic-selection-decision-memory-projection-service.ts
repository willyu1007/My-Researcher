import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_DECISION_MEMORY_PACKET_SCHEMA_VERSION,
  type TopicSelectionDecisionMemoryPacket,
  type TopicSelectionDecisionMemoryPacketEntry,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-decision-memory-packet-contracts';
import type {
  TopicSelectionNeedCandidateRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';

import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type {
  TopicSelectionNeedValidationRepository,
} from '../repositories/topic-selection-need-validation.repository.js';
import type {
  TopicSelectionRecheckRiskMemoryRepository,
} from '../repositories/topic-selection-recheck-risk-memory.repository.js';
import type {
  TopicSelectionV1bTopicQuestionRepository,
} from '../repositories/topic-selection-v1b-topic-question.repository.js';
import type {
  TopicSelectionV1bValueAssessmentRepository,
} from '../repositories/topic-selection-v1b-value-assessment.repository.js';

// Decision Memory projection (T-123 Phase 4.1).
//
// Read-only aggregation over existing authority objects — it creates NO new authority and
// never writes. The packet is non-authority input material for LLM slots (v1b N6 dedup
// material, v1b N8 negative-memory input) and for deterministic gate WARNING computation.
// v1 matching is exact-key only (normalized text); semantic similarity is out of scope.

export const TOPIC_SELECTION_DECISION_MEMORY_DEFAULT_MAX_ENTRIES = 24;

const NEGATIVE_CANDIDATE_DECISION_STATUSES = new Set(['rejected', 'parked', 'merged']);

export type TopicSelectionDecisionMemoryProjectionDeps = {
  recheckRiskMemoryRepository: Pick<
    TopicSelectionRecheckRiskMemoryRepository,
    | 'listAcceptedRisksByTitleCardId'
    | 'listDecisionMemoryEntriesByTitleCardId'
    | 'listCandidateDecisionMemoriesByTitleCardId'
  >;
  needValidationRepository: Pick<
    TopicSelectionNeedValidationRepository,
    'listNeedCandidatesByTitleCardId' | 'listAdjudicationResultsByTitleCardId'
  >;
  valueAssessmentRepository: Pick<
    TopicSelectionV1bValueAssessmentRepository,
    'listDispositionDecisionsByTitleCardId'
  >;
  topicQuestionRepository: Pick<
    TopicSelectionV1bTopicQuestionRepository,
    'listCandidateSetsByTitleCardId' | 'listCandidatesByCandidateSetId'
  >;
  controlPlaneService?: Pick<TopicSelectionControlPlaneService, 'recordArtifactRef'>;
};

export type BuildTopicSelectionDecisionMemoryPacketInput = {
  title_card_id: string;
  max_entries?: number;
};

/**
 * Exact-match dedup key: lowercase, letters/digits only, single-space collapsed.
 * Shared by the projection (entry keys) and the v1b N6 deterministic gate warning.
 */
export function normalizeDecisionMemoryTextKey(value: string): string | null {
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export class TopicSelectionDecisionMemoryProjectionService {
  constructor(private readonly deps: TopicSelectionDecisionMemoryProjectionDeps) {}

  async buildPacket(
    input: BuildTopicSelectionDecisionMemoryPacketInput,
  ): Promise<TopicSelectionDecisionMemoryPacket> {
    const titleCardId = input.title_card_id;
    const maxEntries = input.max_entries ?? TOPIC_SELECTION_DECISION_MEMORY_DEFAULT_MAX_ENTRIES;

    const [needCandidates, adjudications, dispositions, acceptedRisks, memoryEntries, candidateMemories] =
      await Promise.all([
        this.deps.needValidationRepository.listNeedCandidatesByTitleCardId(titleCardId),
        this.deps.needValidationRepository.listAdjudicationResultsByTitleCardId(titleCardId),
        this.deps.valueAssessmentRepository.listDispositionDecisionsByTitleCardId(titleCardId),
        this.deps.recheckRiskMemoryRepository.listAcceptedRisksByTitleCardId(titleCardId),
        this.deps.recheckRiskMemoryRepository.listDecisionMemoryEntriesByTitleCardId(titleCardId),
        this.deps.recheckRiskMemoryRepository.listCandidateDecisionMemoriesByTitleCardId(titleCardId),
      ]);

    const candidateById = new Map<string, TopicSelectionNeedCandidateRecord>(
      needCandidates.map((candidate) => [candidate.need_candidate_id, candidate]),
    );
    const latestAdjudicationByCandidate = new Map<string, (typeof adjudications)[number]>();
    for (const adjudication of adjudications) {
      const existing = latestAdjudicationByCandidate.get(adjudication.need_candidate_id);
      if (!existing || adjudication.created_at > existing.created_at) {
        latestAdjudicationByCandidate.set(adjudication.need_candidate_id, adjudication);
      }
    }

    const entries: TopicSelectionDecisionMemoryPacketEntry[] = [];

    // S1 — rejected / parked / merged need candidates (+ adjudication rationale).
    for (const candidate of needCandidates) {
      if (!NEGATIVE_CANDIDATE_DECISION_STATUSES.has(candidate.decision_status)) {
        continue;
      }
      const adjudication = latestAdjudicationByCandidate.get(candidate.need_candidate_id) ?? null;
      entries.push({
        source_type: candidate.decision_status === 'rejected'
          ? 'rejected_need_candidate'
          : candidate.decision_status === 'parked'
            ? 'parked_need_candidate'
            : 'merged_need_candidate',
        source_ref: this.ref('need_candidate', candidate.need_candidate_id, titleCardId),
        title_card_id: titleCardId,
        summary: this.clip(candidate.candidate_need),
        reason: this.clip(
          adjudication
            ? [adjudication.rationale, adjudication.rejected_reason].filter(Boolean).join(' | ')
            : candidate.unmet_need_statement,
        ),
        decision_kind: candidate.decision_status,
        severity: null,
        status: candidate.decision_status,
        created_at: adjudication?.created_at ?? candidate.created_at,
        normalized_text_key: normalizeDecisionMemoryTextKey(candidate.candidate_need),
        related_refs: adjudication
          ? [this.ref('adjudication_result', adjudication.adjudication_result_id, titleCardId)]
          : [],
      });
    }

    // S2 — non-advance value dispositions (negative memory for N8).
    for (const disposition of dispositions) {
      if (disposition.decision === 'advance_to_package') {
        continue;
      }
      entries.push({
        source_type: 'non_advance_value_disposition',
        source_ref: this.ref('value_disposition_decision', disposition.value_disposition_decision_id, titleCardId),
        title_card_id: titleCardId,
        summary: this.clip(
          `value disposition "${disposition.decision}" for topic question contract ${disposition.topic_question_contract_id}`,
        ),
        reason: this.clip(disposition.decision_rationale),
        decision_kind: disposition.decision,
        severity: null,
        status: disposition.status,
        created_at: disposition.created_at,
        normalized_text_key: null,
        related_refs: [
          this.ref('topic_question_contract', disposition.topic_question_contract_id, titleCardId),
          ...disposition.blocker_refs.slice(0, 3),
          ...disposition.accepted_risk_refs.slice(0, 3),
        ],
      });
    }

    // S3 — accepted risks.
    for (const risk of acceptedRisks) {
      entries.push({
        source_type: 'accepted_risk',
        source_ref: this.ref('accepted_risk', risk.accepted_risk_id, titleCardId),
        title_card_id: titleCardId,
        summary: this.clip(`accepted risk (${risk.risk_type}) on ${risk.target_ref.ref_type}/${risk.target_ref.ref_id}`),
        reason: this.clip(risk.rationale),
        decision_kind: 'risk_acceptance',
        severity: risk.severity,
        status: risk.status,
        created_at: risk.created_at,
        normalized_text_key: null,
        related_refs: [risk.target_ref],
      });
    }

    // S4 — decision memory entries (+ candidate links resolved to candidate text).
    const memoryEntryRefIds = new Set(memoryEntries.map((entry) => entry.decision_memory_entry_id));
    for (const entry of memoryEntries) {
      entries.push({
        source_type: 'decision_memory_entry',
        source_ref: this.ref('decision_memory_entry', entry.decision_memory_entry_id, titleCardId),
        title_card_id: titleCardId,
        summary: this.clip(entry.rationale),
        reason: this.clip(entry.rationale),
        decision_kind: `memory_${entry.memory_type}`,
        severity: entry.severity,
        status: entry.status,
        created_at: entry.created_at,
        normalized_text_key: null,
        related_refs: [entry.source_ref],
      });
    }
    for (const link of candidateMemories) {
      if (memoryEntryRefIds.has(link.decision_memory_entry_ref.ref_id)) {
        continue; // already represented by its memory entry
      }
      const candidate = candidateById.get(link.need_candidate_ref.ref_id) ?? null;
      entries.push({
        source_type: 'decision_memory_entry',
        source_ref: this.ref('candidate_decision_memory', link.candidate_decision_memory_id, titleCardId),
        title_card_id: titleCardId,
        summary: this.clip(candidate ? candidate.candidate_need : `candidate memory ${link.candidate_decision_memory_id}`),
        reason: this.clip(link.reason_codes.join(', ') || 'candidate decision memory'),
        decision_kind: 'memory_candidate_link',
        severity: null,
        status: link.status,
        created_at: link.created_at,
        normalized_text_key: candidate ? normalizeDecisionMemoryTextKey(candidate.candidate_need) : null,
        related_refs: [link.decision_memory_entry_ref, link.need_candidate_ref],
      });
    }

    // S5 — previously generated topic-question candidates (dedup material for v1b N6).
    // Batch the per-set candidate loads (was O(S) sequential awaits). Promise.all preserves array
    // order, so the set + candidate iteration order is unchanged — the packet stays byte-identical
    // (it is part of the N6/N8 frozen-input lineage; order feeds the stable created_at sort below).
    const candidateSets = await this.deps.topicQuestionRepository.listCandidateSetsByTitleCardId(titleCardId);
    const priorCandidatesBySet = await Promise.all(
      candidateSets.map((set) => this.deps.topicQuestionRepository.listCandidatesByCandidateSetId(
        set.topic_question_candidate_set_id,
      )),
    );
    for (const [setIndex, set] of candidateSets.entries()) {
      for (const prior of priorCandidatesBySet[setIndex]!) {
        entries.push({
          source_type: 'prior_topic_question_candidate',
          source_ref: this.ref('topic_question_candidate', prior.topic_question_candidate_id, titleCardId),
          title_card_id: titleCardId,
          summary: this.clip(prior.main_question),
          reason: this.clip(`previously generated in candidate set ${set.topic_question_candidate_set_id} (status: ${prior.status})`),
          decision_kind: 'prior_generation',
          severity: null,
          status: prior.status,
          created_at: prior.created_at,
          normalized_text_key: normalizeDecisionMemoryTextKey(prior.main_question),
          related_refs: [this.ref('topic_question_candidate_set', set.topic_question_candidate_set_id, titleCardId)],
        });
      }
    }

    entries.sort((left, right) => right.created_at.localeCompare(left.created_at));
    const entryCountsBySource: Record<string, number> = {};
    for (const entry of entries) {
      entryCountsBySource[entry.source_type] = (entryCountsBySource[entry.source_type] ?? 0) + 1;
    }
    const truncated = entries.length > maxEntries;

    return {
      schema_version: TOPIC_SELECTION_DECISION_MEMORY_PACKET_SCHEMA_VERSION,
      title_card_id: titleCardId,
      scope: 'title_card',
      entries: entries.slice(0, maxEntries),
      entry_counts_by_source: entryCountsBySource,
      truncated,
      non_authority: true,
      evidence_policy: 'not_evidence',
    };
  }

  /**
   * Persist the packet as a control-plane artifact so callers can reference it from
   * harness frozen_input.source_refs (projection-artifact pattern — keeps generation,
   * admission expected-identity, and gate resolution deterministic over the same ref).
   */
  async recordPacketArtifact(input: BuildTopicSelectionDecisionMemoryPacketInput & {
    workspace_id?: string | null;
    workflow_run_id?: string | null;
    created_by?: 'llm' | 'human' | 'hybrid' | 'system';
  }): Promise<{
    packet: TopicSelectionDecisionMemoryPacket;
    ref: TopicSelectionFunctionalRef;
    hash: string;
  }> {
    if (!this.deps.controlPlaneService) {
      throw new AppError(500, 'INTERNAL_ERROR', 'decision-memory projection has no control-plane service configured.');
    }
    const packet = await this.buildPacket(input);
    const hash = sha256Text(stableStringify(packet));
    const artifact = await this.deps.controlPlaneService.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id ?? null,
      payload: packet as unknown as Record<string, unknown>,
      checksum: hash,
      created_by: input.created_by ?? 'system',
    });
    return {
      packet,
      ref: {
        ref_type: 'artifact_ref',
        ref_id: artifact.artifact_ref_id,
        title_card_id: input.title_card_id,
      },
      hash,
    };
  }

  private ref(refType: string, refId: string, titleCardId: string): TopicSelectionFunctionalRef {
    return { ref_type: refType, ref_id: refId, title_card_id: titleCardId };
  }

  private clip(value: string): string {
    const trimmed = value.trim();
    return trimmed.length <= 280 ? trimmed : `${trimmed.slice(0, 277)}...`;
  }
}

export type ResolvedTopicSelectionDecisionMemoryPacket = {
  ref: TopicSelectionFunctionalRef;
  hash: string;
  packet: TopicSelectionDecisionMemoryPacket;
  /** Persistence timestamp of the packet artifact (control-plane record created_at). */
  artifact_created_at: string | null;
};

/**
 * Resolve an optional decision-memory packet artifact from harness frozen_input.source_refs
 * (mirrors the v1b runtime-context projection resolution: artifact_ref scan, checksum check,
 * at most one). Shared by N6/N8 runtime services and the N6 deterministic gate so all three
 * read the same frozen reference.
 */
export async function resolveDecisionMemoryPacketFromSourceRefs(input: {
  sourceRefs: readonly TopicSelectionFunctionalRef[];
  getArtifactRef: (refId: string) => Promise<{
    payload?: unknown;
    checksum?: string | null;
    created_at?: string;
  } | null>;
  expectedTitleCardId?: string | null;
  /**
   * Opt-in staleness guard for frozen-input ASSEMBLY time (e.g. a coordinator validating
   * a packet before referencing it). Deterministic harness paths (N6/N8 runtime, gate)
   * MUST NOT pass this - a time-dependent check there would break the generation/admission
   * expected-identity equation and replay determinism.
   */
  maxAgeMs?: number;
  now?: () => Date;
}): Promise<ResolvedTopicSelectionDecisionMemoryPacket | null> {
  let resolved: ResolvedTopicSelectionDecisionMemoryPacket | null = null;
  for (const sourceRef of input.sourceRefs) {
    if (sourceRef.ref_type !== 'artifact_ref') {
      continue;
    }
    const artifact = await input.getArtifactRef(sourceRef.ref_id);
    const payload = artifact?.payload;
    if (
      typeof payload !== 'object'
      || payload === null
      || (payload as { schema_version?: unknown }).schema_version !== TOPIC_SELECTION_DECISION_MEMORY_PACKET_SCHEMA_VERSION
    ) {
      continue;
    }
    if (resolved) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen input accepts at most one decision-memory packet artifact.');
    }
    const packet = payload as TopicSelectionDecisionMemoryPacket;
    const packetHash = sha256Text(stableStringify(packet));
    if (!artifact?.checksum || artifact.checksum !== packetHash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'decision-memory packet checksum is missing or drifted.');
    }
    if (packet.non_authority !== true) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'decision-memory packet must be non-authority.');
    }
    if (input.expectedTitleCardId && packet.title_card_id !== input.expectedTitleCardId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'decision-memory packet title card does not match the run.');
    }
    const artifactCreatedAt = artifact?.created_at ?? null;
    if (input.maxAgeMs !== undefined) {
      if (!artifactCreatedAt) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'decision-memory packet artifact has no created_at; cannot enforce max age.');
      }
      const ageMs = (input.now?.() ?? new Date()).getTime() - new Date(artifactCreatedAt).getTime();
      if (!Number.isFinite(ageMs) || ageMs > input.maxAgeMs) {
        throw new AppError(400, 'INVALID_PAYLOAD', `decision-memory packet is stale (age ${Math.round(ageMs / 1000)}s exceeds max).`);
      }
    }
    resolved = { ref: sourceRef, hash: packetHash, packet, artifact_created_at: artifactCreatedAt };
  }
  return resolved;
}

export type DecisionMemoryDedupWarning = {
  code: 'decision_memory_duplicate_candidate';
  message: string;
  refs: TopicSelectionFunctionalRef[];
};

/**
 * Deterministic exact-key dedup between generated candidate texts and memory entries.
 * Pure function so the v1b N6 gate stays replay-deterministic and unit-testable.
 */
export function computeDecisionMemoryDedupWarnings(
  packet: TopicSelectionDecisionMemoryPacket,
  candidates: ReadonlyArray<{ candidate_key: string; main_question: string }>,
): DecisionMemoryDedupWarning[] {
  const entriesByKey = new Map<string, TopicSelectionDecisionMemoryPacket['entries']>();
  for (const entry of packet.entries) {
    if (!entry.normalized_text_key) {
      continue;
    }
    const bucket = entriesByKey.get(entry.normalized_text_key) ?? [];
    bucket.push(entry);
    entriesByKey.set(entry.normalized_text_key, bucket);
  }
  const warnings: DecisionMemoryDedupWarning[] = [];
  for (const candidate of candidates) {
    const key = normalizeDecisionMemoryTextKey(candidate.main_question);
    if (!key) {
      continue;
    }
    const matches = entriesByKey.get(key);
    if (!matches || matches.length === 0) {
      continue;
    }
    warnings.push({
      code: 'decision_memory_duplicate_candidate',
      message: `candidate "${candidate.candidate_key}" duplicates ${matches.length} decision-memory entr${matches.length === 1 ? 'y' : 'ies'} (${matches.map((m) => `${m.source_type}:${m.source_ref.ref_id}`).join(', ')}).`,
      refs: matches.map((m) => m.source_ref),
    });
  }
  return warnings;
}
