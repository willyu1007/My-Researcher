import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryResearchArgumentRepository } from '../repositories/in-memory-research-argument-repository.js';
import { ResearchArgumentService } from './research-argument-service.js';

function createService(): ResearchArgumentService {
  return new ResearchArgumentService(new InMemoryResearchArgumentRepository());
}

function now(): string {
  return '2026-03-31T00:00:00.000Z';
}

test('createWorkspaceSkeleton initializes workspace, branch, snapshot, and core projections', async () => {
  const service = createService();

  const result = await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_001',
    branch_id: 'ra_branch_001',
    title_card_id: 'title_card_001',
  });

  assert.equal(result.workspace.workspace_id, 'ra_ws_001');
  assert.equal(result.branch.branch_id, 'ra_branch_001');
  assert.equal(result.snapshot.stage, 'Stage1_WorthContinuing');
  assert.deepEqual(
    result.report_projections.map((projection) => projection.report_kind).sort(),
    ['coverage', 'decision_timeline', 'readiness'],
  );
});

test('graph mutations synchronously recompute into Stage2 readiness when the branch is fully grounded', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_002',
    branch_id: 'ra_branch_002',
    title_card_id: 'title_card_002',
  });

  await seedReadyBranch(service, 'ra_ws_002', 'ra_branch_002');

  const snapshot = await service.getLatestAbstractStateSnapshot('ra_ws_002', 'ra_branch_002');
  const summary = await service.getWorkspaceSummary('ra_ws_002');
  const readiness = await service.getProtocolBaselineReproReadiness(
    'ra_ws_002',
    'ra_branch_002',
  );
  const coverage = await service.listClaimEvidenceCoverageRows(
    'ra_ws_002',
    'ra_branch_002',
  );

  assert(snapshot);
  assert.equal(snapshot.stage, 'Stage2_ReadyForWritingEntry');
  assert.equal(snapshot.derived.current_goal_satisfied, true);
  assert.equal(summary.current_stage, 'Stage2_ReadyForWritingEntry');
  assert.equal(readiness.baseline_set_ids.length, 1);
  assert.equal(coverage[0]?.missing_requirement_count, 0);
});

test('critical issue findings reopen blockers and regress readiness after a successful branch', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_003',
    branch_id: 'ra_branch_003',
    title_card_id: 'title_card_003',
  });
  await seedReadyBranch(service, 'ra_ws_003', 'ra_branch_003');

  const result = await service.upsertGraphObject('issue_finding', {
    issue_finding_id: 'issue_001',
    workspace_id: 'ra_ws_003',
    branch_id: 'ra_branch_003',
    severity: 'critical',
    dimension_names: ['EvaluationSoundness'],
    detail: 'The evaluation omits a required fairness comparison.',
    pointers: [{ pointer_kind: 'baseline_set', object_id: 'baseline_001' }],
    created_at: now(),
    updated_at: now(),
  });

  assert.equal(result.snapshot.global_flags.has_critical_blocker, true);
  assert.equal(
    result.snapshot.dimensions.EvaluationSoundness.level,
    'Blocked',
  );
  assert.equal(result.snapshot.derived.current_goal_satisfied, false);
});

test('decision and lesson logs are queryable and decision actions update branch/workspace state', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_004',
    branch_id: 'ra_branch_004',
    title_card_id: 'title_card_004',
  });
  await service.upsertGraphObject('claim', {
    claim_id: 'claim_001',
    workspace_id: 'ra_ws_004',
    branch_id: 'ra_branch_004',
    claim_type: 'performance_claim',
    text: 'Archive-worthy claim.',
    claim_status: 'active',
    claim_strength: 'strong',
    linked_evidence_requirement_ids: [],
    created_at: now(),
    updated_at: now(),
  });

  const decisionResult = await service.recordDecision({
    decision_id: 'decision_001',
    workspace_id: 'ra_ws_004',
    branch_id: 'ra_branch_004',
    action: 'archive',
    reason: 'Freeze the branch until new evidence arrives.',
    actor: 'human',
    human_confirmed: true,
    linked_object_ids: ['claim_001'],
  });

  await service.recordLesson({
    lesson_record_id: 'lesson_001',
    workspace_id: 'ra_ws_004',
    branch_id: 'ra_branch_004',
    lesson_type: 'blocker_pattern',
    summary: 'Archiving without a follow-up baseline review tends to stall progress.',
    origin_decision_id: 'decision_001',
  });

  const timeline = await service.listDecisionTimelineEntries(
    'ra_ws_004',
    'ra_branch_004',
  );
  const lessons = await service.listLessonRecords('ra_ws_004', 'ra_branch_004');

  assert.equal(decisionResult.result.workspace.workspace_status, 'archived');
  assert.equal(decisionResult.result.branch.branch_status, 'archived');
  assert.equal(timeline[0]?.action, 'archive');
  assert.equal(timeline[0]?.linked_object_pointers[0]?.pointer_kind, 'claim');
  assert.equal(lessons[0]?.origin_decision_id, 'decision_001');
});

test('createBranch initializes branch snapshot and does not let inactive branch recompute overwrite workspace surface', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_005',
    branch_id: 'ra_branch_005_main',
    title_card_id: 'title_card_005',
  });
  await seedReadyBranch(service, 'ra_ws_005', 'ra_branch_005_main');

  await service.createBranch({
    workspace_id: 'ra_ws_005',
    branch_id: 'ra_branch_005_alt',
    branch_name: 'alternative',
  });

  const altSnapshot = await service.getLatestAbstractStateSnapshot(
    'ra_ws_005',
    'ra_branch_005_alt',
  );
  const summary = await service.getWorkspaceSummary('ra_ws_005');

  assert.equal(altSnapshot?.stage, 'Stage1_WorthContinuing');
  assert.equal(summary.active_branch_id, 'ra_branch_005_main');
  assert.equal(summary.current_stage, 'Stage2_ReadyForWritingEntry');
  assert(summary.report_pointers.every((pointer) =>
    pointer.report_id.startsWith('ra_branch_005_main:'),
  ));
});

test('workspace active branch switching rewires workspace summary to the target branch surface', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_006',
    branch_id: 'ra_branch_006_main',
    title_card_id: 'title_card_006',
  });
  await seedReadyBranch(service, 'ra_ws_006', 'ra_branch_006_main');
  await service.createBranch({
    workspace_id: 'ra_ws_006',
    branch_id: 'ra_branch_006_alt',
    branch_name: 'alternative',
  });

  await service.updateWorkspace('ra_ws_006', {
    active_branch_id: 'ra_branch_006_alt',
  });

  const summary = await service.getWorkspaceSummary('ra_ws_006');
  assert.equal(summary.active_branch_id, 'ra_branch_006_alt');
  assert.equal(summary.current_stage, 'Stage1_WorthContinuing');
  assert(summary.report_pointers.every((pointer) =>
    pointer.report_id.startsWith('ra_branch_006_alt:'),
  ));
});

test('service rejects graph mutations when workspace and branch do not match', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_007a',
    branch_id: 'ra_branch_007a',
    title_card_id: 'title_card_007a',
  });
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_007b',
    branch_id: 'ra_branch_007b',
    title_card_id: 'title_card_007b',
  });

  await assert.rejects(
    service.upsertGraphObject('claim', {
      claim_id: 'claim_007',
      workspace_id: 'ra_ws_007a',
      branch_id: 'ra_branch_007b',
      claim_type: 'performance_claim',
      text: 'Cross-workspace mutation should fail.',
      claim_status: 'active',
      claim_strength: 'strong',
      linked_evidence_requirement_ids: [],
      created_at: now(),
      updated_at: now(),
    }),
    /does not belong to workspace/,
  );
});

test('readiness projection keeps run, artifact, and analysis finding pointers for downstream traceability', async () => {
  const service = createService();
  await service.createWorkspaceSkeleton({
    workspace_id: 'ra_ws_008',
    branch_id: 'ra_branch_008',
    title_card_id: 'title_card_008',
  });
  await seedReadyBranch(service, 'ra_ws_008', 'ra_branch_008');

  const projections = await service.listReportProjections('ra_ws_008', 'ra_branch_008');
  const readinessProjection = projections.find(
    (projection) => projection.report_kind === 'readiness',
  );

  assert(readinessProjection);
  assert(readinessProjection.object_pointers.some((pointer) =>
    pointer.pointer_kind === 'run' && pointer.object_id === 'run_001',
  ));
  assert(readinessProjection.object_pointers.some((pointer) =>
    pointer.pointer_kind === 'artifact' && pointer.object_id === 'artifact_001',
  ));
  assert(readinessProjection.object_pointers.some((pointer) =>
    pointer.pointer_kind === 'analysis_finding' && pointer.object_id === 'finding_001',
  ));
});

async function seedReadyBranch(
  service: ResearchArgumentService,
  workspaceId: string,
  branchId: string,
) {
  const trace = [{ source_kind: 'title_card' as const, source_id: 'title_card_seed' }];

  await service.upsertGraphObject('problem', {
    problem_id: 'problem_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    statement: 'Long-context retrieval remains unstable for literature reasoning.',
    target_domain: 'retrieval-augmented generation',
    audience: 'research engineers',
    pain_point: 'Evidence retrieval degrades as contexts get longer.',
    importance_rationale: 'This blocks robust paper engineering workflows.',
    scope: 'CS literature reasoning',
    non_goals: ['general web search'],
    source_trace_refs: trace,
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('value_hypothesis', {
    value_hypothesis_id: 'value_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    value_type: 'reliability',
    expected_impact: 'Stabler retrieval under long-context reasoning.',
    target_users_or_community: 'paper engineering teams',
    success_condition: 'Retrieval stays accurate as context length grows.',
    failure_condition: 'Robustness collapses under realistic baselines.',
    source_trace_refs: trace,
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('contribution_delta', {
    contribution_delta_id: 'delta_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    anchor_work_ids: ['paper_a'],
    delta_type: 'new_method',
    delta_summary: 'Adds adaptive retrieval and compression.',
    novelty_risk_notes: ['Needs stronger baseline comparison.'],
    closest_competitors: ['paper_b'],
    source_trace_refs: trace,
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('claim', {
    claim_id: 'claim_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    claim_type: 'performance_claim',
    text: 'The method improves long-context retrieval robustness.',
    claim_status: 'active',
    claim_strength: 'strong',
    scope: 'long-context retrieval',
    linked_evidence_requirement_ids: ['er_001'],
    linked_boundary_ids: ['boundary_001'],
    source_trace_refs: trace,
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('evidence_requirement', {
    evidence_requirement_id: 'er_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    claim_id: 'claim_001',
    required_evidence_type: 'main_result',
    is_mandatory: true,
    priority: 'high',
    status: 'satisfied',
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('evidence_item', {
    evidence_item_id: 'evidence_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    evidence_type: 'table',
    source_type: 'run',
    source_ref: 'run_001',
    summary: 'Main results table shows robustness gains.',
    support_direction: 'supports',
    confidence: 0.9,
    linked_requirement_ids: ['er_001'],
    linked_claim_ids: ['claim_001'],
    provenance: trace,
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('baseline_set', {
    baseline_set_id: 'baseline_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    baselines: ['baseline_a', 'baseline_b'],
    selection_policy: 'Compare against strongest available baselines.',
    coverage_notes: 'Covers lexical and dense retrieval.',
    fairness_risks: [],
    linked_protocol_ids: ['protocol_001'],
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('protocol', {
    protocol_id: 'protocol_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    protocol_type: 'evaluation',
    dataset_info: 'Long-context CS literature QA benchmark',
    split_info: 'train/dev/test',
    metrics: ['accuracy', 'robustness'],
    comparison_rules: ['same context budget'],
    statistical_checks: ['bootstrap CI'],
    repro_requirements: ['config', 'seed'],
    status: 'active',
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('repro_item', {
    repro_item_id: 'repro_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    item_type: 'config',
    description: 'Published config for the main run.',
    status: 'ready',
    artifact_ids: ['artifact_001'],
    run_ids: ['run_001'],
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('run', {
    run_id: 'run_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    run_type: 'full',
    status: 'succeeded',
    config_ref: 'cfg://main',
    executor_ref: 'local',
    inputs: ['dataset_v1'],
    outputs: ['artifact_001'],
    cost: 1.2,
    duration_sec: 120,
    artifact_ids: ['artifact_001'],
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('artifact', {
    artifact_id: 'artifact_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    artifact_type: 'report',
    location: 'file:///tmp/report.md',
    is_reusable: true,
    sync_eligibility: 'eligible',
    authorization_metadata: {
      policy_label: 'local',
      requires_explicit_enable: false,
    },
    git_weak_mapping_refs: [{ mapping_kind: 'path', ref_value: 'artifacts/report.md' }],
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('boundary', {
    boundary_id: 'boundary_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    boundary_type: 'limitation',
    statement: 'The method currently targets CS literature corpora only.',
    severity: 'medium',
    linked_claim_ids: ['claim_001'],
    created_at: now(),
    updated_at: now(),
  });

  await service.upsertGraphObject('analysis_finding', {
    analysis_finding_id: 'finding_001',
    workspace_id: workspaceId,
    branch_id: branchId,
    finding_type: 'limitation',
    summary: 'Performance drops outside the target corpus.',
    linked_evidence_item_ids: ['evidence_001'],
    suggested_claim_updates: ['narrow scope'],
    risk_flags: ['external-validity'],
    created_at: now(),
    updated_at: now(),
  });
}
