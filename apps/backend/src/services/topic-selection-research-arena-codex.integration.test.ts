import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionNeedCandidateRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TopicSelectionResearchArenaShadowRole, TopicSelectionResearchArenaShadowRunRequest, TopicSelectionResearchArenaRoleOutput } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';
import { TopicSelectionResearchArenaShadowRunnerService } from './topic-selection-research-arena-shadow-runner-service.js';
import { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import { TopicSelectionResearchGapProjectionService } from './topic-selection-research-gap-projection-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionRiskFindingService } from './topic-selection-risk-finding-service.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionCodexCliRunnerService } from './topic-selection-codex-cli-runner-service.js';
import { TopicSelectionModelProfileRegistryService } from './topic-selection-model-profile-registry-service.js';
import { qualificationSources } from './test-fixtures/topic-selection-codex-qualification-sources.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const roles = ['opportunity_scout', 'prior_art_topic_killer'] as const;
const now = () => '2026-09-10T00:00:00.000Z';
const hash = (value: unknown) => sha256Text(stableStringify(value));

for (const caseId of ['success', 'invalid_ref', 'timeout', 'source_drift', 'interrupted_receipt', 'live', 'live_insufficient'] as const) {
test(`Arena CLI ${caseId} preserves original evidence, independent roles and recovery`, {
  skip: caseId.startsWith('live') && process.env.TOPIC_SELECTION_CODEX_ARENA_QUALIFICATION !== 'live',
}, async t => {
  const live = caseId === 'live' || caseId === 'live_insufficient';
  const runId = live ? process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID : null;
  if (live) assert.ok(runId && /^[a-zA-Z0-9_-]{1,40}$/.test(runId));
  const workflow = runId ? `${runId}_${caseId}` : 'workflow_arena_cli';
  let sequence = 0;
  const idFactory = (prefix: string) => `${workflow}_${prefix}_${++sequence}`;
  const title = 'title_arena_cli';
  const ref = (ref_type: string, ref_id: string, version_id: string | null = null): TopicSelectionFunctionalRef =>
    ({ ref_type, ref_id, version_id, title_card_id: title });
  const controlRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const createArtifact = controlRepository.createArtifactRef.bind(controlRepository);
  controlRepository.createArtifactRef = input => {
    if (caseId === 'interrupted_receipt' && input.payload?.schema_version === 'ResearchArenaCodexResult@v1') throw new Error('receipt write interrupted');
    return createArtifact(JSON.parse(JSON.stringify(input)));
  };
  const control = new TopicSelectionControlPlaneService(controlRepository, { idFactory, now });
  const candidates = new InMemoryTopicSelectionNeedValidationRepository();
  const arenas = new InMemoryTopicSelectionResearchArenaRepository();
  // These in-memory repositories store projections separately; expose their persisted join just as
  // the production transaction updates NeedCandidate.currentArenaAdvisory in the same database.
  const readCandidate = candidates.findNeedCandidateById.bind(candidates);
  candidates.findNeedCandidateById = async id => {
    const record = await readCandidate(id);
    const projection = await arenas.findCandidateProjectionById(id);
    return record && projection ? { ...record, current_arena_advisory: projection.advisory } : record;
  };
  const checkpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const checkpoints = new TopicSelectionResearchCheckpointService(checkpointRepository, control, { idFactory, now });
  const arena = new TopicSelectionResearchArenaService({ arenaRepository: arenas, controlPlaneRepository: controlRepository }, { idFactory, now });
  const mapRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const literature = new InMemoryLiteratureRepository();
  const sourceText = 'Retrieval accuracy depends on passage position. This experiment does not demonstrate a position-invariant repair.';
  await literature.upsertAbstractProfile({ id: 'abstract_1', literatureId: 'lit_1', abstractText: sourceText,
    abstractSource: 'fixture', sourceRef: {}, checksum: sha256Text(sourceText), language: 'en', confidence: 1,
    reasonCodes: [], generated: false, createdAt: now(), updatedAt: now() });
  const sourceFile = process.env.TOPIC_SELECTION_QUALIFICATION_SOURCES;
  if (live) assert.ok(sourceFile);
  const originals = live ? await qualificationSources(sourceFile!, title, caseId === 'live_insufficient') : null;
  const evidenceUnits = originals?.units ?? [{ evidence_unit_id: 'unit_1', title_card_id: title, evidence_map_id: 'evidence_map_1', evidence_map_version: 'v1',
      search_run_ref: ref('search_run', 'search_1'), search_plan_ref: ref('search_plan', 'plan_1'),
      literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'pool_1'), literature_ref: ref('literature_record', 'lit_1'),
      source_refs: [], locator: { locator_type: 'abstract', locator_ref: ref('literature_abstract', 'abstract_1'),
        literature_ref: ref('literature_record', 'lit_1'), source_ref: ref('literature_source', 'source_1') },
      evidence_role: 'support', source_attribution_kind: 'source_claim', source_statement: sourceText,
      interpretation_payload: {}, abstract_only: true, review_status: 'machine_checked', freshness_status: 'current',
      issue_codes: [], created_by: 'system', created_at: now() }];
  const unitRefs = evidenceUnits.map(unit => ref('evidence_unit', unit.evidence_unit_id, unit.evidence_map_version));
  await mapRepository.createEvidenceMapWithRecords({
    evidence_map: { evidence_map_id: 'evidence_map_1', title_card_id: title, evidence_map_version: 'v1', status: 'ready',
      review_status: 'machine_checked', freshness_status: 'current', search_run_ref: ref('search_run', 'search_1'),
      search_plan_ref: ref('search_plan', 'plan_1'), literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'pool_1'),
      unit_count: evidenceUnits.length, support_unit_count: evidenceUnits.filter(unit => unit.evidence_role === 'support').length,
      challenge_unit_count: 0, baseline_unit_count: evidenceUnits.filter(unit => unit.evidence_role === 'baseline').length,
      context_unit_count: evidenceUnits.filter(unit => unit.evidence_role === 'context').length,
      digest_payload: {}, stale_reason_codes: [], artifact_refs: [], created_by: 'system', created_at: now() },
    evidence_units: evidenceUnits, typed_links: [], clusters: [], patterns: [], conflict_sets: [],
  });
  const evidence = originals?.resolver(mapRepository) ?? new TopicSelectionResearchEvidencePacketService({ evidenceMapRepository: mapRepository, literatureRepository: literature,
    directEvidenceReadinessResolver: async ids => new Map(ids.map(id => [id, { ready: true, reason: 'EVIDENCE_READY', freshness: 'fresh', freshness_detail: null }])) });
  const candidateRef = ref('need_candidate', 'candidate_1', 'v1');
  const unitRef = unitRefs[0]!;
  const candidate: TopicSelectionNeedCandidateRecord = {
    need_candidate_id: 'candidate_1', title_card_id: title, evidence_map_id: 'evidence_map_1', candidate_version: 'v1',
    lifecycle_status: 'hypothesis', decision_status: 'ready_for_validation', review_status: 'machine_checked', freshness_status: 'current',
    candidate_need: 'Measure sensitivity to passage position under matched retrieval settings.',
    unmet_need_statement: 'A controlled comparison must separate passage position from passage content.',
    mechanism_type: 'evaluation_gap', mechanism_summary: 'Matched passage permutations.', mechanism_payload: {},
    semantic_group_key: 'a'.repeat(64), current_arena_advisory: null, prior_art_status: 'partial_solution_known',
    evidence_map_ref: ref('evidence_map', 'evidence_map_1', 'v1'), search_run_ref: ref('search_run', 'search_1'),
    search_plan_ref: ref('search_plan', 'plan_1'), literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'pool_1'),
    evidence_role_bundle: { support_unit_refs: evidenceUnits.filter(unit => unit.evidence_role === 'support').map(unit => ref('evidence_unit', unit.evidence_unit_id, 'v1')),
      challenge_unit_refs: [], baseline_unit_refs: evidenceUnits.filter(unit => unit.evidence_role === 'baseline').map(unit => ref('evidence_unit', unit.evidence_unit_id, 'v1')),
      context_unit_refs: evidenceUnits.filter(unit => unit.evidence_role === 'context').map(unit => ref('evidence_unit', unit.evidence_unit_id, 'v1')) },
    conflict_refs: [], strength_assessment_refs: [], open_recheck_request_refs: [], unresolved_challenge_refs: [], accepted_risk_refs: [],
    gap_codes: [], speculative: false, artifact_refs: [], created_by: 'system', created_at: now(), updated_at: now(),
  };
  await candidates.createNeedCandidate(candidate);
  const candidateRefs = [candidateRef];
  if (live) {
    await candidates.createNeedCandidate({ ...candidate, need_candidate_id: 'candidate_universal', semantic_group_key: 'b'.repeat(64),
      candidate_need: 'Guarantee dense retrieval superiority and position-invariant QA across all domains with one learned passage reordering mechanism.',
      unmet_need_statement: 'A universal retrieval and positioning repair is claimed feasible from these abstracts.',
      mechanism_type: 'method_gap', mechanism_summary: 'Learned passage ordering with universal guarantees.',
      scope_notes: 'All domains and arbitrary context length; no additional source evidence is supplied.', prior_art_status: 'unknown' });
    candidateRefs.push(ref('need_candidate', 'candidate_universal', 'v1'));
  }
  const snapshot = await control.compileInputSnapshot({ title_card_id: title, target_ref: candidateRef,
    source_refs: [...candidateRefs, candidate.evidence_map_ref], payload: { candidate_refs: candidateRefs } });
  const planPayload = { participant_roles: roles, support_only: true };
  const plan = await control.recordArtifactRef({ title_card_id: title, workflow_run_id: workflow, artifact_kind: 'structured_output', storage_kind: 'inline',
    input_snapshot_id: snapshot.input_snapshot_id, payload: planPayload, checksum: hash(planPayload), created_by: 'system' });
  const session = await arena.openSession({ session_key: 'arena_cli', title_card_id: title, arena_kind: 'gap_portfolio',
    target_ref: candidateRef, input_snapshot_id: snapshot.input_snapshot_id, participant_roles: roles,
    execution_plan_ref: ref('artifact_ref', plan.artifact_ref_id) });
  const roleInputs: TopicSelectionResearchArenaShadowRunRequest['role_inputs'] = [];
  for (const role of roles) {
    const query = { intent_type: 'context' as const, query: 'Evaluate the candidate against position evidence.',
      rationale: 'Establish a bounded comparison and preserve missing evidence.', target_claim: candidate.candidate_need };
    const packet = await evidence.resolve({ schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1', title_card_id: title, participant_role: role, query_intent: query, evidence_unit_refs: unitRefs });
    const artifact = await control.recordArtifactRef({ title_card_id: title, workflow_run_id: workflow, artifact_kind: 'structured_output', storage_kind: 'inline',
      input_snapshot_id: snapshot.input_snapshot_id, payload: packet as unknown as Record<string, unknown>, checksum: packet.packet_hash, created_by: 'system' });
    const retrieval = { participant_role: role, query_intent: query, search_run_ref: ref('search_run', `search_${role}`),
      hits: packet.items.map((item, index) => ({ literature_ref: item.literature_ref, embedding_version_id: 'local_snapshot_lexical',
        chunk_id: item.resolved_locator.content_row_id, chunk_hash: item.excerpt_hash, rank: index + 1,
        hybrid_score: 1, vector_score: 0, lexical_score: 1, is_stale: false })) };
    roleInputs.push({ role_slot_id: role, participant_role: role, evidence_preparation: {
      schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1', status: 'ready', title_card_id: title,
      retrieval_execution_mode: 'local_snapshot_lexical', provider_call_count: 0, participant_role: role, query_intent: query,
      evidence_map_ref: candidate.evidence_map_ref, search_run_ref: retrieval.search_run_ref,
      retrieval_provenance: { ...retrieval, provenance_hash: hash(retrieval) }, selected_evidence_unit_refs: unitRefs,
      unresolved_literature_refs: [], evidence_packet_artifact_ref: ref('artifact_ref', artifact.artifact_ref_id), evidence_packet_hash: packet.packet_hash,
    } });
  }
  let calls = 0;
  const home = await fs.mkdtemp(join(tmpdir(), 'arena-cli-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  let runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls++;
    if (caseId === 'timeout') return { stdout: '', stderr: '', exit_code: null, timed_out: true };
    const context = JSON.parse(options.stdin.split('<research_arena_input>\n')[1]!.split('\n</research_arena_input>')[0]!);
    assert.equal(context.candidates[0].candidate_need, candidate.candidate_need);
    assert.equal(context.evidence_packet.items[0].resolved_excerpt, sourceText);
    assert.equal(context.prior_role_outputs, undefined);
    const role = context.participant_role as TopicSelectionResearchArenaShadowRole;
    const output: TopicSelectionResearchArenaRoleOutput = { schema_version: 'TopicSelectionResearchArenaRoleOutput@v1', participant_role: role,
      semantic_position: { recommended_set_outcome: 'evidence_expansion_required', summary: `${role}: insufficient comparative evidence`, confidence: 0.8 },
      candidate_reviews: [{ candidate_ref: { ...candidateRef, legacy_ref: null }, recommended_disposition: 'parked', rationale: 'Needs matched comparison.',
        evidence_unit_refs: [{ ...unitRef, legacy_ref: null }], drop_reason_code: null, reopening_conditions: ['Supply matched passage permutations.'] }],
      findings: [{ finding_id: `${role}:position`, kind: 'coverage', severity: 'material', statement: 'No position-invariant repair is established.',
        evidence_unit_refs: [unitRef], literature_refs: [ref('literature_record', 'lit_1')] }],
      new_candidate_proposals: [], concessions: [], unresolved_minority_report: null };
    if (caseId === 'invalid_ref') output.candidate_reviews[0]!.candidate_ref.legacy_ref = { id: 'wrong-identity' };
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: `arena-${calls}` }), JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  let liveBudget: import('./test-fixtures/topic-selection-codex-qualification-budget.js').CodexQualificationBudget | null = null;
  let liveDirectory: string | null = null;
  if (live) {
    const { qualificationRunner } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
    const outputRoot = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
    const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
    const codexHome = process.env.TOPIC_SELECTION_CODEX_HOME;
    assert.ok(outputRoot && model && codexHome && process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED === '1');
    const limits = { attempts: null, tokens: null, duration_ms: null, attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) };
    const qualification = qualificationRunner({ codex_home: codexHome, model, reasoning_effort: 'high', transport: 'app_server',
      binary: process.env.TOPIC_SELECTION_CODEX_BINARY, timeout_ms: limits.attempt_ms }, outputRoot, limits);
    runner = qualification.runner;
    liveBudget = qualification.budget;
    liveDirectory = qualification.directory;
    await fs.writeFile(join(liveDirectory, `${workflow}-manifest.json`), JSON.stringify({ candidate_refs: candidateRefs, arena_input_snapshot: snapshot,
      evidence_preparations: roleInputs.map(role => role.evidence_preparation), original_abstract_units: evidenceUnits, controlled_candidates_retrieval_and_readiness: true, actual_human_decision: false,
      real_repository_excerpt_resolution: true, model, limits }, null, 2), { mode: 0o600, flag: 'wx' });
    t.after(async () => {
      await fs.writeFile(join(liveDirectory!, `${workflow}-artifacts.json`), JSON.stringify(await control.listArtifactRefsByWorkflowRunId(workflow), null, 2), { mode: 0o600 });
      liveBudget?.close();
    });
  }
  t.after(() => runner.shutdown());
  const orchestrator = new TopicSelectionAgentOrchestratorService({ controlPlane: control, codexCliRunner: runner,
    codexCliModelId: runner.executionIdentity.model, modelProfileRegistry: new TopicSelectionModelProfileRegistryService() });
  const service = (agentInvoker = orchestrator) => new TopicSelectionResearchArenaShadowRunnerService({ arenaRepository: arenas, snapshotReader: control,
    candidateReader: candidates, artifactStore: control, agentInvoker, arenaService: arena,
    evidencePacketResolver: evidence, riskFindingRecorder: new TopicSelectionRiskFindingService(control),
    gapCheckpointProjector: new TopicSelectionResearchGapProjectionService({ arenaRepository: arenas, candidateRepository: candidates,
      checkpointService: checkpoints, controlPlane: control }) });
  const input: TopicSelectionResearchArenaShadowRunRequest = { schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: session.arena_session_id, workflow_run_id: workflow, node_attempt_id: `${workflow}:attempt`,
    execution_mode: 'codex_cli', candidate_refs: candidateRefs, role_inputs: roleInputs };
  await assert.rejects(() => service(new TopicSelectionAgentOrchestratorService({ controlPlane: control,
    codexCliModelId: 'gpt-6-astra' })).run(input));
  assert.equal((await arena.getSession(session.arena_session_id)).status, 'open');
  assert.equal(calls, 0, 'missing runner fails before claiming or model work');
  await assert.rejects(() => service().run({ ...input, role_inputs: input.role_inputs.map(role => ({ ...role, operator_label: 'caller-answer' })) }));
  assert.equal(calls, 0);
  if (caseId === 'source_drift') {
    const original = await literature.findAbstractProfileByLiteratureId('lit_1');
    assert.ok(original);
    await literature.upsertAbstractProfile({ ...original, abstractText: 'The original source was replaced.', checksum: sha256Text('replaced') });
  }
  if (caseId !== 'success' && !live) {
    await assert.rejects(() => service().run(input));
    const expectedCalls = caseId === 'source_drift' ? 0 : caseId === 'interrupted_receipt' ? 2 : 1;
    assert.equal(calls, expectedCalls);
    assert.equal((await arena.getSession(session.arena_session_id)).status,
      caseId === 'source_drift' ? 'open' : caseId === 'interrupted_receipt' ? 'synthesized' : 'executing');
    await assert.rejects(() => service().run(input));
    assert.equal(calls, expectedCalls, 'failure or partial domain commit must not restart model work');
    return;
  }
  const attempts = await Promise.allSettled([service().run(input), service().run(input)]);
  const completed = attempts.find(attempt => attempt.status === 'fulfilled');
  assert.ok(completed?.status === 'fulfilled', JSON.stringify(attempts.map(attempt => attempt.status === 'fulfilled'
    ? { status: attempt.status } : { status: attempt.status, error: String(attempt.reason) })));
  const result = completed.value;
  const actualCalls = () => liveBudget ? liveBudget.snapshot().attempts.filter(attempt => attempt.id.startsWith(workflow)).length : calls;
  assert.equal(actualCalls(), 2);
  assert.equal(result.support_only, true);
  if (!live) assert.equal(result.advisory_synthesis.outcome, 'evidence_expansion_required');
  assert.equal(result.role_executions.length, 2);
  if (!live) assert.equal(result.risk_finding_refs?.length, 2);
  assert.equal((await arena.getSession(session.arena_session_id)).status, 'synthesized');
  const checkpoint = await checkpointRepository.findCurrentCheckpoint(title, 'gap_selection');
  assert.ok(checkpoint);
  assert.equal(checkpoint.status, 'pending');
  if (liveDirectory) await fs.writeFile(join(liveDirectory, `${workflow}-result.json`), JSON.stringify({ result, checkpoint }, null, 2), { mode: 0o600 });
  assert.deepEqual(await service().run(input), result);
  assert.equal(actualCalls(), 2);
  await assert.rejects(() => service().run({ ...input, node_attempt_id: 'different-attempt' }));
  assert.equal(actualCalls(), 2);
});
}
