import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionNeedCandidateRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAcceptedRiskRecord,
  TopicSelectionCandidateDecisionMemoryRecord,
  TopicSelectionDecisionMemoryEntryRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionCandidateSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionValueDispositionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';

import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { AppError } from '../errors/app-error.js';
import {
  computeDecisionMemoryDedupWarnings,
  normalizeDecisionMemoryTextKey,
  resolveDecisionMemoryPacketFromSourceRefs,
  TopicSelectionDecisionMemoryProjectionService,
} from './topic-selection-decision-memory-projection-service.js';
import type { TopicSelectionDecisionMemoryPacket } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-decision-memory-packet-contracts';

const CARD = 'title_card_memory_1';
const OTHER_CARD = 'title_card_other';

function needCandidate(
  id: string,
  decisionStatus: string,
  candidateNeed: string,
  createdAt: string,
): TopicSelectionNeedCandidateRecord {
  return {
    need_candidate_id: id,
    title_card_id: CARD,
    decision_status: decisionStatus,
    candidate_need: candidateNeed,
    unmet_need_statement: `${candidateNeed} (unmet)`,
    created_at: createdAt,
  } as unknown as TopicSelectionNeedCandidateRecord;
}

function adjudication(
  id: string,
  candidateId: string,
  decision: string,
  createdAt: string,
): TopicSelectionValidateNeedAdjudicationResultRecord {
  return {
    adjudication_result_id: id,
    title_card_id: CARD,
    need_candidate_id: candidateId,
    final_decision: decision,
    rejected_reason: decision === 'reject' ? 'duplicate_of_prior_art' : null,
    rationale: `adjudicated ${decision} for ${candidateId}`,
    created_at: createdAt,
  } as unknown as TopicSelectionValidateNeedAdjudicationResultRecord;
}

function disposition(id: string, decision: string, createdAt: string): TopicSelectionValueDispositionDecisionRecord {
  return {
    value_disposition_decision_id: id,
    title_card_id: CARD,
    topic_question_contract_id: 'tqc_1',
    decision,
    decision_rationale: `disposition ${decision} rationale`,
    status: 'active',
    blocker_refs: [],
    accepted_risk_refs: [],
    created_at: createdAt,
  } as unknown as TopicSelectionValueDispositionDecisionRecord;
}

function acceptedRisk(id: string, createdAt: string): TopicSelectionAcceptedRiskRecord {
  return {
    accepted_risk_id: id,
    title_card_id: CARD,
    risk_type: 'coverage_gap',
    target_ref: { ref_type: 'evidence_map', ref_id: 'em_1', title_card_id: CARD },
    severity: 'warning',
    status: 'active',
    rationale: 'accepted because baseline coverage is thin',
    created_at: createdAt,
  } as unknown as TopicSelectionAcceptedRiskRecord;
}

function memoryEntry(id: string, createdAt: string): TopicSelectionDecisionMemoryEntryRecord {
  return {
    decision_memory_entry_id: id,
    title_card_id: CARD,
    source_ref: { ref_type: 'adjudication_result', ref_id: 'adj_x', title_card_id: CARD },
    memory_type: 'duplicate_candidate',
    severity: 'warning',
    status: 'active',
    rationale: 'previously rejected as duplicate framing',
    created_at: createdAt,
  } as unknown as TopicSelectionDecisionMemoryEntryRecord;
}

function candidateMemory(id: string, candidateId: string, createdAt: string): TopicSelectionCandidateDecisionMemoryRecord {
  return {
    candidate_decision_memory_id: id,
    title_card_id: CARD,
    decision_memory_entry_ref: { ref_type: 'decision_memory_entry', ref_id: 'dme_external', title_card_id: CARD },
    need_candidate_ref: { ref_type: 'need_candidate', ref_id: candidateId, title_card_id: CARD },
    status: 'active',
    reason_codes: ['duplicate_candidate'],
    created_at: createdAt,
  } as unknown as TopicSelectionCandidateDecisionMemoryRecord;
}

function questionSet(id: string): TopicSelectionTopicQuestionCandidateSetRecord {
  return { topic_question_candidate_set_id: id, title_card_id: CARD } as unknown as TopicSelectionTopicQuestionCandidateSetRecord;
}

function questionCandidate(id: string, setId: string, mainQuestion: string, createdAt: string): TopicSelectionTopicQuestionCandidateRecord {
  return {
    topic_question_candidate_id: id,
    title_card_id: CARD,
    candidate_set_id: setId,
    status: 'rejected',
    main_question: mainQuestion,
    created_at: createdAt,
  } as unknown as TopicSelectionTopicQuestionCandidateRecord;
}

function makeSubject(data: {
  candidates?: TopicSelectionNeedCandidateRecord[];
  adjudications?: TopicSelectionValidateNeedAdjudicationResultRecord[];
  dispositions?: TopicSelectionValueDispositionDecisionRecord[];
  risks?: TopicSelectionAcceptedRiskRecord[];
  memoryEntries?: TopicSelectionDecisionMemoryEntryRecord[];
  candidateMemories?: TopicSelectionCandidateDecisionMemoryRecord[];
  questionSets?: TopicSelectionTopicQuestionCandidateSetRecord[];
  questionCandidates?: TopicSelectionTopicQuestionCandidateRecord[];
} = {}) {
  const byCard = <T extends { title_card_id?: string | null }>(records: T[], titleCardId: string) =>
    records.filter((record) => record.title_card_id === titleCardId);
  return new TopicSelectionDecisionMemoryProjectionService({
    needValidationRepository: {
      listNeedCandidatesByTitleCardId: async (id) => byCard(data.candidates ?? [], id),
      listAdjudicationResultsByTitleCardId: async (id) => byCard(data.adjudications ?? [], id),
    },
    valueAssessmentRepository: {
      listDispositionDecisionsByTitleCardId: async (id) => byCard(data.dispositions ?? [], id),
    },
    recheckRiskMemoryRepository: {
      listAcceptedRisksByTitleCardId: async (id) => byCard(data.risks ?? [], id),
      listDecisionMemoryEntriesByTitleCardId: async (id) => byCard(data.memoryEntries ?? [], id),
      listCandidateDecisionMemoriesByTitleCardId: async (id) => byCard(data.candidateMemories ?? [], id),
    },
    topicQuestionRepository: {
      listCandidateSetsByTitleCardId: async (id) => byCard(data.questionSets ?? [], id),
      listCandidatesByCandidateSetId: async (setId) =>
        (data.questionCandidates ?? []).filter((record) => record.candidate_set_id === setId),
    },
  });
}

const FULL_DATA = {
  candidates: [
    needCandidate('nc_rejected', 'rejected', 'Adaptive retrieval for long-tail queries', '2026-06-01T00:00:00Z'),
    needCandidate('nc_parked', 'parked', 'Latency-aware reranking', '2026-06-02T00:00:00Z'),
    needCandidate('nc_merged', 'merged', 'Merged framing', '2026-06-03T00:00:00Z'),
    needCandidate('nc_active', 'ready_for_validation', 'Active framing must not appear', '2026-06-04T00:00:00Z'),
    needCandidate('nc_linked', 'resulted_in_validated_need', 'Linked candidate text', '2026-05-30T00:00:00Z'),
  ],
  adjudications: [adjudication('adj_1', 'nc_rejected', 'reject', '2026-06-05T00:00:00Z')],
  dispositions: [
    disposition('vdd_drop', 'drop', '2026-06-06T00:00:00Z'),
    disposition('vdd_advance', 'advance_to_package', '2026-06-07T00:00:00Z'),
  ],
  risks: [acceptedRisk('ar_1', '2026-06-08T00:00:00Z')],
  memoryEntries: [memoryEntry('dme_1', '2026-06-09T00:00:00Z')],
  candidateMemories: [candidateMemory('cdm_1', 'nc_linked', '2026-06-10T00:00:00Z')],
  questionSets: [questionSet('qcs_1')],
  questionCandidates: [
    questionCandidate('tqc_prior', 'qcs_1', 'Does adaptive retrieval improve long-tail recall?', '2026-06-11T00:00:00Z'),
  ],
};

test('projection aggregates all six source families and excludes non-negative records', async () => {
  const packet = await makeSubject(FULL_DATA).buildPacket({ title_card_id: CARD });

  const types = packet.entries.map((entry) => entry.source_type);
  assert.ok(types.includes('rejected_need_candidate'));
  assert.ok(types.includes('parked_need_candidate'));
  assert.ok(types.includes('merged_need_candidate'));
  assert.ok(types.includes('non_advance_value_disposition'));
  assert.ok(types.includes('accepted_risk'));
  assert.ok(types.includes('decision_memory_entry'));
  assert.ok(types.includes('prior_topic_question_candidate'));

  assert.ok(!packet.entries.some((entry) => entry.summary.includes('Active framing')));
  assert.ok(!packet.entries.some((entry) => entry.decision_kind === 'advance_to_package'));

  const rejected = packet.entries.find((entry) => entry.source_type === 'rejected_need_candidate')!;
  assert.match(rejected.reason, /adjudicated reject/);
  assert.match(rejected.reason, /duplicate_of_prior_art/);
  assert.equal(rejected.normalized_text_key, 'adaptive retrieval for long tail queries');

  const linked = packet.entries.find((entry) => entry.decision_kind === 'memory_candidate_link')!;
  assert.equal(linked.normalized_text_key, 'linked candidate text');

  assert.equal(packet.non_authority, true);
  assert.equal(packet.evidence_policy, 'not_evidence');
  assert.equal(packet.truncated, false);
  assert.equal(packet.entry_counts_by_source.prior_topic_question_candidate, 1);
});

test('projection is title-card isolated and degrades to empty packet', async () => {
  const subject = makeSubject(FULL_DATA);
  const other = await subject.buildPacket({ title_card_id: OTHER_CARD });
  assert.deepEqual(other.entries, []);
  assert.equal(other.truncated, false);
  assert.deepEqual(other.entry_counts_by_source, {});
});

test('packet hash is stable across rebuilds for identical history', async () => {
  const first = await makeSubject(FULL_DATA).buildPacket({ title_card_id: CARD });
  const second = await makeSubject(FULL_DATA).buildPacket({ title_card_id: CARD });
  assert.equal(sha256Text(stableStringify(first)), sha256Text(stableStringify(second)));
});

test('max_entries caps newest-first with truncated flag and full counts preserved', async () => {
  const packet = await makeSubject(FULL_DATA).buildPacket({ title_card_id: CARD, max_entries: 2 });
  assert.equal(packet.entries.length, 2);
  assert.equal(packet.truncated, true);
  assert.equal(packet.entries[0]!.source_type, 'prior_topic_question_candidate');
  assert.equal(packet.entries[1]!.decision_kind, 'memory_candidate_link');
  const total = Object.values(packet.entry_counts_by_source).reduce((sum, count) => sum + count, 0);
  assert.ok(total > 2);
});

test('normalizeDecisionMemoryTextKey collapses case, punctuation, and whitespace', () => {
  assert.equal(
    normalizeDecisionMemoryTextKey('  Does Adaptive—Retrieval improve   Long-Tail recall??  '),
    'does adaptive retrieval improve long tail recall',
  );
  assert.equal(normalizeDecisionMemoryTextKey('!!!'), null);
});

function packetFixture(overrides: Partial<TopicSelectionDecisionMemoryPacket> = {}): TopicSelectionDecisionMemoryPacket {
  return {
    schema_version: 'TopicSelectionDecisionMemoryPacket@v1',
    title_card_id: CARD,
    scope: 'title_card',
    entries: [{
      source_type: 'prior_topic_question_candidate',
      source_ref: { ref_type: 'topic_question_candidate', ref_id: 'tqc_prior', title_card_id: CARD },
      title_card_id: CARD,
      summary: 'Does adaptive retrieval improve long-tail recall?',
      reason: 'parked in earlier run',
      decision_kind: 'prior_generation',
      severity: null,
      status: 'parked',
      created_at: '2026-06-01T00:00:00Z',
      normalized_text_key: 'does adaptive retrieval improve long tail recall',
      related_refs: [],
    }],
    entry_counts_by_source: { prior_topic_question_candidate: 1 },
    truncated: false,
    non_authority: true,
    evidence_policy: 'not_evidence',
    ...overrides,
  };
}

function artifactStore(packets: Array<{ id: string; packet: TopicSelectionDecisionMemoryPacket; checksum?: string | null }>) {
  return async (refId: string) => {
    const found = packets.find((item) => item.id === refId);
    if (!found) {
      return null;
    }
    return {
      payload: found.packet as unknown as Record<string, unknown>,
      checksum: found.checksum === undefined
        ? sha256Text(stableStringify(found.packet))
        : found.checksum,
    };
  };
}

test('resolveDecisionMemoryPacketFromSourceRefs resolves at most one verified packet', async () => {
  const packet = packetFixture();
  const getArtifactRef = artifactStore([{ id: 'art_mem_1', packet }]);
  const resolved = await resolveDecisionMemoryPacketFromSourceRefs({
    sourceRefs: [
      { ref_type: 'research_slice_selection_decision', ref_id: 'sel_1', title_card_id: CARD },
      { ref_type: 'artifact_ref', ref_id: 'art_mem_1', title_card_id: CARD },
    ],
    getArtifactRef,
    expectedTitleCardId: CARD,
  });
  assert.ok(resolved);
  assert.equal(resolved.ref.ref_id, 'art_mem_1');
  assert.equal(resolved.packet.entries.length, 1);
  assert.equal(resolved.hash, sha256Text(stableStringify(packet)));

  const none = await resolveDecisionMemoryPacketFromSourceRefs({
    sourceRefs: [{ ref_type: 'artifact_ref', ref_id: 'art_unknown', title_card_id: CARD }],
    getArtifactRef,
    expectedTitleCardId: CARD,
  });
  assert.equal(none, null);
});

test('resolveDecisionMemoryPacketFromSourceRefs rejects drifted checksum, duplicates, and wrong title card', async () => {
  const packet = packetFixture();
  await assert.rejects(
    () => resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs: [{ ref_type: 'artifact_ref', ref_id: 'art_bad', title_card_id: CARD }],
      getArtifactRef: artifactStore([{ id: 'art_bad', packet, checksum: 'f'.repeat(64) }]),
      expectedTitleCardId: CARD,
    }),
    (error: unknown) => error instanceof AppError && /checksum/.test(error.message),
  );
  await assert.rejects(
    () => resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs: [
        { ref_type: 'artifact_ref', ref_id: 'art_mem_1', title_card_id: CARD },
        { ref_type: 'artifact_ref', ref_id: 'art_mem_2', title_card_id: CARD },
      ],
      getArtifactRef: artifactStore([
        { id: 'art_mem_1', packet },
        { id: 'art_mem_2', packet },
      ]),
      expectedTitleCardId: CARD,
    }),
    (error: unknown) => error instanceof AppError && /at most one/.test(error.message),
  );
  await assert.rejects(
    () => resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs: [{ ref_type: 'artifact_ref', ref_id: 'art_mem_1', title_card_id: CARD }],
      getArtifactRef: artifactStore([{ id: 'art_mem_1', packet }]),
      expectedTitleCardId: OTHER_CARD,
    }),
    (error: unknown) => error instanceof AppError && /title card/.test(error.message),
  );
});

test('computeDecisionMemoryDedupWarnings matches normalized candidate text exactly', () => {
  const packet = packetFixture();
  const warnings = computeDecisionMemoryDedupWarnings(packet, [
    { candidate_key: 'cand_dup', main_question: '  DOES Adaptive-Retrieval improve long—tail RECALL?! ' },
    { candidate_key: 'cand_fresh', main_question: 'A completely different framing of the problem' },
  ]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]!.code, 'decision_memory_duplicate_candidate');
  assert.match(warnings[0]!.message, /cand_dup/);
  assert.equal(warnings[0]!.refs[0]!.ref_id, 'tqc_prior');

  const noKeyPacket = packetFixture({
    entries: [{ ...packetFixture().entries[0]!, normalized_text_key: null }],
  });
  assert.deepEqual(computeDecisionMemoryDedupWarnings(noKeyPacket, [
    { candidate_key: 'cand_dup', main_question: 'Does adaptive retrieval improve long tail recall' },
  ]), []);
});

test('resolver enforces opt-in max-age via artifact created_at (assembly-time guard only)', async () => {
  const packet = packetFixture();
  const checksum = sha256Text(stableStringify(packet));
  const getArtifactRef = async () => ({
    payload: packet as unknown as Record<string, unknown>,
    checksum,
    created_at: '2026-06-12T00:00:00.000Z',
  });
  const sourceRefs = [{ ref_type: 'artifact_ref', ref_id: 'art_aged', title_card_id: CARD }];
  const now = () => new Date('2026-06-12T02:00:00.000Z'); // age = 2h

  const fresh = await resolveDecisionMemoryPacketFromSourceRefs({
    sourceRefs, getArtifactRef, expectedTitleCardId: CARD, maxAgeMs: 3 * 60 * 60 * 1000, now,
  });
  assert.ok(fresh);
  assert.equal(fresh.artifact_created_at, '2026-06-12T00:00:00.000Z');

  await assert.rejects(
    () => resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs, getArtifactRef, expectedTitleCardId: CARD, maxAgeMs: 60 * 60 * 1000, now,
    }),
    (error: unknown) => error instanceof AppError && /stale/.test(error.message),
  );

  // without maxAgeMs the deterministic path ignores age entirely
  const deterministic = await resolveDecisionMemoryPacketFromSourceRefs({
    sourceRefs, getArtifactRef, expectedTitleCardId: CARD,
  });
  assert.ok(deterministic);
});
