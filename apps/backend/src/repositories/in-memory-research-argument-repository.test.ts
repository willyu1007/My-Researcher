import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryResearchArgumentRepository } from './in-memory-research-argument-repository.js';

test('in-memory research-argument repository rolls back failed transactions', async () => {
  const repository = new InMemoryResearchArgumentRepository();

  await assert.rejects(
    repository.withTransaction(async (transaction) => {
      await transaction.createWorkspace({
        workspace_id: 'ra_ws_001',
        title_card_id: 'title_card_001',
        workspace_status: 'active',
        active_branch_id: 'ra_branch_001',
        current_stage: 'Stage1_WorthContinuing',
        source_trace_refs: [],
        report_pointers: [],
        sync_eligibility: 'local_only',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      throw new Error('force rollback');
    }),
  );

  const workspace = await repository.findWorkspaceById('ra_ws_001');
  assert.equal(workspace, null);
});

test('in-memory research-argument repository stores graph objects and report projections by branch', async () => {
  const repository = new InMemoryResearchArgumentRepository();
  const now = new Date().toISOString();

  await repository.createWorkspace({
    workspace_id: 'ra_ws_002',
    title_card_id: 'title_card_002',
    workspace_status: 'active',
    active_branch_id: 'ra_branch_002',
    current_stage: 'Stage1_WorthContinuing',
    source_trace_refs: [],
    report_pointers: [],
    sync_eligibility: 'local_only',
    created_at: now,
    updated_at: now,
  });
  await repository.createBranch({
    branch_id: 'ra_branch_002',
    workspace_id: 'ra_ws_002',
    branch_name: 'main',
    branch_status: 'active',
    decision_refs: [],
    created_at: now,
    updated_at: now,
  });

  await repository.upsertGraphObject('claim', {
    claim_id: 'claim_001',
    workspace_id: 'ra_ws_002',
    branch_id: 'ra_branch_002',
    claim_type: 'performance_claim',
    text: 'The method improves retrieval robustness.',
    claim_status: 'active',
    claim_strength: 'strong',
    scope: 'long-context retrieval',
    linked_evidence_requirement_ids: ['er_001'],
    linked_boundary_ids: ['boundary_001'],
    created_at: now,
    updated_at: now,
  });

  const objects = await repository.listGraphObjects({
    workspace_id: 'ra_ws_002',
    branch_id: 'ra_branch_002',
  });
  assert.equal(objects.length, 1);

  await repository.replaceReportProjections('ra_ws_002', 'ra_branch_002', [
    {
      report_projection_id: 'ra_branch_002:coverage',
      workspace_id: 'ra_ws_002',
      branch_id: 'ra_branch_002',
      report_kind: 'coverage',
      summary: '1/1 claims covered.',
      object_pointers: [{ pointer_kind: 'claim', object_id: 'claim_001' }],
      source_trace_refs: [],
      created_at: now,
      updated_at: now,
    },
  ]);

  const projections = await repository.listReportProjections({
    workspace_id: 'ra_ws_002',
    branch_id: 'ra_branch_002',
  });
  assert.deepEqual(projections.map((projection) => projection.report_kind), ['coverage']);
});

test('in-memory research-argument repository isolates same object id across branches', async () => {
  const repository = new InMemoryResearchArgumentRepository();
  const now = new Date().toISOString();

  await repository.createWorkspace({
    workspace_id: 'ra_ws_003',
    title_card_id: 'title_card_003',
    workspace_status: 'active',
    active_branch_id: 'ra_branch_003a',
    current_stage: 'Stage1_WorthContinuing',
    source_trace_refs: [],
    report_pointers: [],
    sync_eligibility: 'local_only',
    created_at: now,
    updated_at: now,
  });
  await repository.createBranch({
    branch_id: 'ra_branch_003a',
    workspace_id: 'ra_ws_003',
    branch_name: 'main',
    branch_status: 'active',
    decision_refs: [],
    created_at: now,
    updated_at: now,
  });
  await repository.createBranch({
    branch_id: 'ra_branch_003b',
    workspace_id: 'ra_ws_003',
    branch_name: 'alt',
    branch_status: 'active',
    decision_refs: [],
    created_at: now,
    updated_at: now,
  });

  await repository.upsertGraphObject('claim', {
    claim_id: 'claim_shared',
    workspace_id: 'ra_ws_003',
    branch_id: 'ra_branch_003a',
    claim_type: 'performance_claim',
    text: 'Main branch claim.',
    claim_status: 'active',
    claim_strength: 'strong',
    linked_evidence_requirement_ids: [],
    created_at: now,
    updated_at: now,
  });
  await repository.upsertGraphObject('claim', {
    claim_id: 'claim_shared',
    workspace_id: 'ra_ws_003',
    branch_id: 'ra_branch_003b',
    claim_type: 'scope_claim',
    text: 'Alternate branch claim.',
    claim_status: 'active',
    claim_strength: 'moderate',
    linked_evidence_requirement_ids: [],
    created_at: now,
    updated_at: now,
  });

  const mainClaim = await repository.findGraphObjectById({
    workspace_id: 'ra_ws_003',
    branch_id: 'ra_branch_003a',
    object_kind: 'claim',
    object_id: 'claim_shared',
  });
  const altClaim = await repository.findGraphObjectById({
    workspace_id: 'ra_ws_003',
    branch_id: 'ra_branch_003b',
    object_kind: 'claim',
    object_id: 'claim_shared',
  });

  assert.equal(mainClaim?.text, 'Main branch claim.');
  assert.equal(altClaim?.text, 'Alternate branch claim.');
});

test('in-memory research-argument repository breaks snapshot ties by version', async () => {
  const repository = new InMemoryResearchArgumentRepository();
  const timestamp = '2026-03-31T00:00:00.000Z';

  await repository.appendStateSnapshot({
    snapshot_id: 'snapshot_001',
    workspace_id: 'ra_ws_004',
    branch_id: 'ra_branch_004',
    stage: 'Stage1_WorthContinuing',
    dimensions: {} as never,
    global_flags: {
      has_critical_blocker: false,
      is_plateauing: false,
      is_oscillating: false,
      has_dominated_branch: false,
    },
    derived: {
      current_goal_satisfied: false,
      next_best_targets: [],
    },
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
  });
  await repository.appendStateSnapshot({
    snapshot_id: 'snapshot_002',
    workspace_id: 'ra_ws_004',
    branch_id: 'ra_branch_004',
    stage: 'Stage2_ReadyForWritingEntry',
    dimensions: {} as never,
    global_flags: {
      has_critical_blocker: false,
      is_plateauing: false,
      is_oscillating: false,
      has_dominated_branch: false,
    },
    derived: {
      current_goal_satisfied: true,
      next_best_targets: [],
    },
    version: 2,
    created_at: timestamp,
    updated_at: timestamp,
  });

  const snapshot = await repository.findLatestStateSnapshot('ra_ws_004', 'ra_branch_004');
  assert.equal(snapshot?.snapshot_id, 'snapshot_002');
});
