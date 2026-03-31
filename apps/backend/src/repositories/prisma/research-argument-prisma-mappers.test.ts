import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toGraphObjectWrite,
  toReportProjectionRecord,
  toWorkspaceRecord,
} from './research-argument-prisma-mappers.js';

test('toWorkspaceRecord preserves local/sync/git metadata hooks', () => {
  const workspace = toWorkspaceRecord({
    id: 'ra_ws_101',
    titleCardId: 'title_card_101',
    workspaceStatus: 'active',
    activeBranchId: 'ra_branch_101',
    currentStage: 'Stage1_WorthContinuing',
    sourceTraceRefs: [{ source_kind: 'title_card', source_id: 'title_card_101' }],
    reportPointers: [],
    paperId: null,
    syncEligibility: 'conditional',
    authorizationMetadata: {
      policy_label: 'restricted',
      requires_explicit_enable: true,
    },
    gitWeakMappingRefs: [{ mapping_kind: 'branch', ref_value: 'feature/research-argument' }],
    auditRef: 'audit_101',
    createdAt: new Date('2026-03-31T00:00:00.000Z'),
    updatedAt: new Date('2026-03-31T00:10:00.000Z'),
  });

  assert.equal(workspace.sync_eligibility, 'conditional');
  assert.equal(workspace.authorization_metadata?.policy_label, 'restricted');
  assert.equal(workspace.git_weak_mapping_refs?.[0]?.mapping_kind, 'branch');
});

test('toGraphObjectWrite maps mixed-storage graph objects to shared object store row', () => {
  const write = toGraphObjectWrite('artifact', {
    artifact_id: 'artifact_101',
    workspace_id: 'ra_ws_101',
    branch_id: 'ra_branch_101',
    artifact_type: 'report',
    location: 'file:///tmp/report.md',
    is_reusable: true,
    sync_eligibility: 'eligible',
    authorization_metadata: {
      policy_label: 'local',
      requires_explicit_enable: false,
    },
    git_weak_mapping_refs: [{ mapping_kind: 'path', ref_value: 'artifacts/report.md' }],
    created_at: '2026-03-31T00:00:00.000Z',
    updated_at: '2026-03-31T00:05:00.000Z',
  });

  assert.equal(write.objectId, 'artifact_101');
  assert.equal(write.objectKind, 'artifact');
  assert.equal(write.workspaceId, 'ra_ws_101');
});

test('toReportProjectionRecord preserves projection payloads', () => {
  const projection = toReportProjectionRecord({
    id: 'ra_branch_101:readiness',
    workspaceId: 'ra_ws_101',
    branchId: 'ra_branch_101',
    reportKind: 'readiness',
    summary: 'Stage 2 blocked by missing repro items.',
    objectPointers: [{ pointer_kind: 'repro_item', object_id: 'repro_001' }],
    sourceTraceRefs: [{ source_kind: 'claim', source_id: 'claim_001' }],
    reportPointers: [],
    createdAt: new Date('2026-03-31T00:00:00.000Z'),
    updatedAt: new Date('2026-03-31T00:05:00.000Z'),
  });

  assert.equal(projection.report_kind, 'readiness');
  assert.equal(projection.object_pointers[0]?.pointer_kind, 'repro_item');
});
