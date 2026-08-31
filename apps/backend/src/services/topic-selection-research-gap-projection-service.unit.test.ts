import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionNeedCandidateRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionResearchArenaAdvisoryCandidateDisposition,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionResearchGapProjectionService } from './topic-selection-research-gap-projection-service.js';

const NOW = '2026-08-31T00:00:00.000Z';

function ref(
  refType: string,
  refId: string,
  titleCardId = 'title_1',
  versionId?: string,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

function candidate(
  candidateRef: TopicSelectionFunctionalRef,
  transcriptRef: TopicSelectionFunctionalRef,
  transcriptHash: string,
  disposition: TopicSelectionResearchArenaAdvisoryCandidateDisposition,
): TopicSelectionNeedCandidateRecord {
  return {
    need_candidate_id: candidateRef.ref_id,
    workspace_id: null,
    title_card_id: 'title_1',
    evidence_map_id: 'evidence_map_1',
    candidate_version: candidateRef.version_id!,
    lifecycle_status: 'hypothesis',
    decision_status: 'ready_for_validation',
    review_status: 'needs_human_review',
    freshness_status: 'current',
    candidate_need: `Need ${candidateRef.ref_id}`,
    unmet_need_statement: `Unmet need ${candidateRef.ref_id}`,
    mechanism_type: 'workflow_gap',
    mechanism_summary: 'A distinct workflow mechanism.',
    mechanism_payload: {},
    semantic_group_key: `semantic_${candidateRef.ref_id}`,
    current_arena_advisory: {
      schema_version: 'TopicSelectionNeedCandidateArenaAdvisory@v1',
      arena_session_id: 'arena_1',
      arena_synthesis_ref: transcriptRef,
      arena_synthesis_hash: transcriptHash,
      disposition: disposition.disposition,
      rationale: disposition.rationale,
      drop_reason_code: disposition.drop_reason_code,
      reopening_conditions: disposition.reopening_conditions,
      selected_against_candidate_ref: disposition.selected_against_candidate_ref,
      support_only: true,
    },
    scope_notes: null,
    non_goal_notes: null,
    prior_art_status: 'no_strong_solution_found',
    evidence_map_ref: ref('evidence_map', 'evidence_map_1'),
    search_run_ref: ref('search_run', 'search_run_1'),
    search_plan_ref: ref('search_plan', 'search_plan_1'),
    literature_snapshot_ref: ref('literature_snapshot', 'literature_snapshot_1'),
    evidence_role_bundle: {
      support_unit_refs: [],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [],
    },
    conflict_refs: [],
    strength_assessment_refs: [],
    open_recheck_request_refs: [],
    unresolved_challenge_refs: [],
    accepted_risk_refs: [],
    gap_codes: [],
    speculative: false,
    confidence: 0.8,
    input_snapshot_id: null,
    workflow_run_id: null,
    gate_result_id: null,
    transition_attempt_id: null,
    trace_snapshot_id: null,
    artifact_refs: [],
    result_adjudication_id: null,
    result_validated_need_id: null,
    merged_into_need_candidate_ref: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

async function fixture() {
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_${++sequence}`, now: () => NOW },
  );
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const candidateRepository = new InMemoryTopicSelectionNeedValidationRepository();
  const checkpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const checkpointService = new TopicSelectionResearchCheckpointService(
    checkpointRepository,
    controlPlane,
    {
      arenaRepository,
      idFactory: (prefix) => `${prefix}_${++sequence}`,
      now: () => NOW,
    },
  );
  const candidateRefs = [
    ref('need_candidate', 'candidate_1', 'title_1', 'v1'),
    ref('need_candidate', 'candidate_2', 'title_1', 'v2'),
  ];
  const inputSnapshot = await controlPlane.compileInputSnapshot({
    input_snapshot_id: 'arena_input_1',
    title_card_id: 'title_1',
    target_ref: ref('need_candidate_arena', 'candidate_arena_1'),
    source_refs: candidateRefs,
    payload: { candidate_refs: candidateRefs },
    created_by: 'system',
  });
  const rolePositions = (recommended: 'selected' | 'parked') => [
    { participant_role: 'opportunity_scout' as const, recommended_disposition: recommended },
    { participant_role: 'prior_art_topic_killer' as const, recommended_disposition: recommended },
  ];
  const dispositions: TopicSelectionResearchArenaAdvisoryCandidateDisposition[] = [
    {
      candidate_ref: candidateRefs[0]!,
      disposition: 'selected',
      rationale: 'The strongest current path.',
      drop_reason_code: null,
      reopening_conditions: [],
      selected_against_candidate_ref: null,
      role_positions: rolePositions('selected'),
    },
    {
      candidate_ref: candidateRefs[1]!,
      disposition: 'parked',
      rationale: 'Retain as a distinct alternative.',
      drop_reason_code: null,
      reopening_conditions: ['The selected mechanism fails.'],
      selected_against_candidate_ref: candidateRefs[0]!,
      role_positions: rolePositions('parked'),
    },
  ];
  const transcriptPayload = {
    schema_version: 'TopicSelectionResearchArenaLoopTranscript@v2',
    arena_session_id: 'arena_1',
    input_snapshot_id: inputSnapshot.input_snapshot_id,
    independent_first_pass: [],
    advisory_synthesis: {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome: 'selected',
      summary: 'Select one path and retain one alternative.',
      candidate_dispositions: dispositions,
      preserved_finding_ids: [],
      unresolved_dissent: [],
      required_next_delta: null,
      support_only: true,
    },
    risk_finding_refs: [],
    execution_accounting: {
      non_provider_role_invocation_count: 2,
      provider_call_count: 0,
      retrieval_run_count: 2,
      retrieval_hit_count: 2,
      evidence_excerpt_chars: 120,
      duration_ms: 25,
    },
    support_only: true,
  };
  const transcriptHash = sha256Text(stableStringify(transcriptPayload));
  const transcript = await controlPlane.recordArtifactRef({
    title_card_id: 'title_1',
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    payload: transcriptPayload,
    checksum: transcriptHash,
    mime_type: 'application/json',
    input_snapshot_id: inputSnapshot.input_snapshot_id,
    created_by: 'system',
  });
  const transcriptRef = ref('artifact_ref', transcript.artifact_ref_id);
  for (const [index, candidateRef] of candidateRefs.entries()) {
    await candidateRepository.createNeedCandidate(
      candidate(candidateRef!, transcriptRef, transcriptHash, dispositions[index]!),
    );
  }
  const session: TopicSelectionResearchArenaSessionRecord = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_1',
    session_key: 'arena_session_key_1',
    current_arena_key: 'title_1:gap_portfolio',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: inputSnapshot.target_ref,
    input_snapshot_id: inputSnapshot.input_snapshot_id,
    input_snapshot_hash: inputSnapshot.snapshot_hash,
    participant_plan_hash: 'b'.repeat(64),
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: ref('artifact_ref', 'execution_plan_1'),
    status: 'synthesized',
    termination_reason: 'recommendation_ready',
    loop_transcript_ref: transcriptRef,
    loop_transcript_hash: transcriptHash,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    synthesized_at: NOW,
    superseded_at: null,
  };
  await arenaRepository.replaceCurrentSession(session);
  const service = new TopicSelectionResearchGapProjectionService({
    arenaRepository,
    candidateRepository,
    checkpointService,
    controlPlane,
  });
  return {
    arenaRepository,
    candidateRepository,
    checkpointRepository,
    checkpointService,
    controlPlane,
    candidateRefs,
    service,
    session,
    transcript,
  };
}

test('recovers a gap checkpoint from the exact current synthesized Arena session', async () => {
  const { checkpointService, service } = await fixture();

  const recovered = await service.recoverSynthesizedSession('arena_1');
  const packet = await checkpointService.getPacket(recovered.research_checkpoint_id);
  const advisory = packet.packet_payload.arena_advisory;
  const issueCodes = packet.packet_payload.arena_advisory_issue_codes;

  assert.equal(recovered.checkpoint_kind, 'gap_selection');
  assert.ok(advisory && typeof advisory === 'object' && !Array.isArray(advisory));
  assert.equal(Reflect.get(advisory, 'outcome'), 'selected');
  assert.ok(Array.isArray(issueCodes));
  assert.equal(issueCodes.length, 0);
});

test('exact and concurrent gap projection recovery converges on one checkpoint', async () => {
  const { service } = await fixture();

  const recovered = await Promise.all(
    Array.from({ length: 8 }, () => service.recoverSynthesizedSession('arena_1')),
  );

  assert.equal(new Set(recovered.map((checkpoint) => checkpoint.research_checkpoint_id)).size, 1);
  const replay = await service.recoverSynthesizedSession('arena_1');
  assert.equal(replay.research_checkpoint_id, recovered[0]!.research_checkpoint_id);
});

test('support-only recovery preserves an already decided current gap checkpoint', async () => {
  const { checkpointRepository, checkpointService, service } = await fixture();
  const decided = await service.recoverSynthesizedSession('arena_1');
  await checkpointRepository.advanceWithExistingAuthority({
    ...decided,
    decision_authority_ref: ref('human_confirmed_decision', 'human_decision_1'),
    status: 'decided',
    decided_at: NOW,
    updated_at: NOW,
  });

  const replay = await service.projectCurrentGapSelectionCheckpoint({
    title_card_id: 'title_1',
    candidate_refs: [ref('need_candidate', 'candidate_1', 'title_1', 'v1')],
    preserve_decided_current: true,
  });
  const current = (await checkpointService.listCheckpoints('title_1'))
    .find((checkpoint) => checkpoint.current_checkpoint_key !== null);

  assert.equal(replay.research_checkpoint_id, decided.research_checkpoint_id);
  assert.equal(current?.research_checkpoint_id, decided.research_checkpoint_id);
  assert.equal(current?.status, 'decided');
  assert.equal((await checkpointService.listCheckpoints('title_1')).length, 1);
});

test('support-only recovery returns the decided current checkpoint before an older exact-key replay', async () => {
  const { checkpointRepository, checkpointService, service } = await fixture();
  const original = await service.recoverSynthesizedSession('arena_1');
  const replacement = await checkpointService.materializeCheckpoint({
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection',
    target_ref: ref('need_candidate_arena', 'replacement_arena', 'title_1', 'v2'),
    target_snapshot_hash: 'd'.repeat(64),
    allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
    packet_payload: { replacement: true },
  });
  await checkpointRepository.advanceWithExistingAuthority({
    ...replacement,
    decision_authority_ref: ref('human_confirmed_decision', 'human_decision_2'),
    status: 'decided',
    decided_at: NOW,
    updated_at: NOW,
  });

  const replay = await service.projectCurrentGapSelectionCheckpoint({
    title_card_id: 'title_1',
    candidate_refs: [ref('need_candidate', 'candidate_1', 'title_1', 'v1')],
    preserve_decided_current: true,
  });
  const history = await checkpointService.listCheckpoints('title_1');
  const current = history.find((checkpoint) => checkpoint.current_checkpoint_key !== null);

  assert.equal(original.status, 'pending');
  assert.equal(replay.research_checkpoint_id, replacement.research_checkpoint_id);
  assert.equal(replay.status, 'decided');
  assert.equal(current?.research_checkpoint_id, replacement.research_checkpoint_id);
  assert.equal(history.length, 2);
});

test('shared projection preserves policy identity and rejects a repeated candidate ref', async () => {
  const { candidateRefs, service } = await fixture();

  const checkpoint = await service.projectCurrentGapSelectionCheckpoint({
    title_card_id: 'title_1',
    candidate_refs: candidateRefs,
    policy_version_id: 'topic-selection-gap-selection@test',
  });
  assert.equal(checkpoint.policy_version_id, 'topic-selection-gap-selection@test');

  await assert.rejects(
    service.projectCurrentGapSelectionCheckpoint({
      title_card_id: 'title_1',
      candidate_refs: [candidateRefs[0]!, candidateRefs[0]!],
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('recovery rejects a synthesized session after a replacement Arena supersedes it', async () => {
  const { arenaRepository, service, session } = await fixture();
  await arenaRepository.replaceCurrentSession({
    ...session,
    arena_session_id: 'arena_2',
    session_key: 'arena_session_key_2',
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    synthesized_at: null,
  });

  await assert.rejects(
    service.recoverSynthesizedSession('arena_1'),
    (error: unknown) => error instanceof Error
      && 'statusCode' in error
      && error.statusCode === 409,
  );
});

test('post-synthesis projection failure recovers without changing Arena evidence identities', async () => {
  const {
    arenaRepository,
    candidateRepository,
    checkpointService,
    controlPlane,
    service,
    transcript,
  } = await fixture();
  assert.equal((await checkpointService.listCheckpoints('title_1')).length, 0);
  const before = stableStringify({
    candidates: await candidateRepository.listNeedCandidatesByTitleCardId('title_1'),
    session: await arenaRepository.findSessionById('arena_1'),
    transcript: await controlPlane.getArtifactRef(transcript.artifact_ref_id),
  });

  await service.recoverSynthesizedSession('arena_1');
  const humanView = await checkpointService.getStageView('title_1', 'research_gap', 'human');
  const llmView = await checkpointService.getStageView('title_1', 'research_gap', 'llm');

  assert.equal((await checkpointService.listCheckpoints('title_1')).length, 1);
  assert.match(humanView.markdown, /多视角评议/u);
  assert.equal(
    Reflect.get(llmView.working_set.related_records, 'arena_advisory') !== null,
    true,
  );
  assert.equal(stableStringify({
    candidates: await candidateRepository.listNeedCandidatesByTitleCardId('title_1'),
    session: await arenaRepository.findSessionById('arena_1'),
    transcript: await controlPlane.getArtifactRef(transcript.artifact_ref_id),
  }), before);
});

test('recovery fails closed on session, snapshot, transcript, and candidate-advisory drift', async () => {
  const expectConflict = async (service: TopicSelectionResearchGapProjectionService) => {
    await assert.rejects(
      service.recoverSynthesizedSession('arena_1'),
      (error: unknown) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'VERSION_CONFLICT',
    );
  };

  const missingFixture = await fixture();
  await assert.rejects(
    missingFixture.service.recoverSynthesizedSession('arena_missing'),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );

  const openFixture = await fixture();
  const openSession = await openFixture.arenaRepository.findSessionById('arena_1');
  assert.ok(openSession);
  openSession.status = 'open';
  await expectConflict(openFixture.service);

  const wrongKindFixture = await fixture();
  const wrongKindSession = await wrongKindFixture.arenaRepository.findSessionById('arena_1');
  assert.ok(wrongKindSession);
  wrongKindSession.arena_kind = 'question_design';
  await expectConflict(wrongKindFixture.service);

  const crossTitleFixture = await fixture();
  const crossTitleSession = await crossTitleFixture.arenaRepository.findSessionById('arena_1');
  assert.ok(crossTitleSession);
  crossTitleSession.title_card_id = 'title_2';
  await expectConflict(crossTitleFixture.service);

  const snapshotFixture = await fixture();
  const snapshotSession = await snapshotFixture.arenaRepository.findSessionById('arena_1');
  assert.ok(snapshotSession);
  snapshotSession.input_snapshot_hash = 'd'.repeat(64);
  await expectConflict(snapshotFixture.service);

  const snapshotCandidateFixture = await fixture();
  const boundSnapshot = await snapshotCandidateFixture.controlPlane.getInputSnapshot('arena_input_1');
  assert.ok(boundSnapshot);
  boundSnapshot.source_refs = [];
  await expectConflict(snapshotCandidateFixture.service);

  const transcriptFixture = await fixture();
  const transcriptArtifact = await transcriptFixture.controlPlane.getArtifactRef(
    transcriptFixture.transcript.artifact_ref_id,
  );
  assert.ok(transcriptArtifact?.payload);
  transcriptArtifact.payload.support_only = false;
  await expectConflict(transcriptFixture.service);

  const candidateFixture = await fixture();
  const changedCandidate = await candidateFixture.candidateRepository.findNeedCandidateById('candidate_1');
  assert.ok(changedCandidate?.current_arena_advisory);
  changedCandidate.current_arena_advisory.arena_synthesis_hash = 'e'.repeat(64);
  await expectConflict(candidateFixture.service);

  const candidateVersionFixture = await fixture();
  const versionChangedCandidate = await candidateVersionFixture.candidateRepository
    .findNeedCandidateById('candidate_1');
  assert.ok(versionChangedCandidate);
  versionChangedCandidate.candidate_version = 'v99';
  await expectConflict(candidateVersionFixture.service);
});
