import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryResearchLifecycleRepository } from '../repositories/in-memory-research-lifecycle-repository.js';
import { ResearchLifecycleService } from './research-lifecycle-service.js';
import type { GovernanceEventDeliveryAdapter } from './event-delivery/governance-event-delivery-adapter.js';
import { InMemoryGovernanceDeliveryAuditStore } from './event-delivery/governance-delivery-audit-store.js';

test('createPaperProject uses default LLM direction when omitted', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());

  const result = await service.createPaperProject({
    title_card_id: 'title_card_unit_1',
    title: 'Unit Test Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-1'],
    },
  });

  assert.equal(result.paper_id, 'P001');
  assert.equal(result.status, 'active');
  assert.equal(result.paper_active_sp_full, null);
});

test('commitVersionSpine rejects candidate node without value judgement', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_unit_2',
    title: 'Unit Test Paper 2',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-2'],
    },
  });

  await assert.rejects(
    service.commitVersionSpine({
      lineage_meta: {
        paper_id: paper.paper_id,
        stage_id: 'S3',
        module_id: 'M5',
        version_id: 'P001-M5-B01-N0001',
        run_id: 'RUN-U-1',
        lane_id: 'LANE-U-1',
        attempt_id: 'ATT-U-1',
        created_by: 'llm',
        created_at: new Date().toISOString(),
      },
      payload_ref: 'experiment_plan_v:EXP-U-1',
      node_status: 'candidate',
    }),
    /Candidate node must include value_judgement_payload/,
  );
});

test('verifyStageGate enforces no_m6 override policy', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_unit_3',
    title: 'Unit Test Paper 3',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-3'],
    },
  });

  const node = await service.commitVersionSpine({
    lineage_meta: {
      paper_id: paper.paper_id,
      stage_id: 'S3',
      module_id: 'M5',
      version_id: 'P001-M5-B01-N0001',
      run_id: 'RUN-U-2',
      lane_id: 'LANE-U-2',
      attempt_id: 'ATT-U-2',
      created_by: 'llm',
      created_at: new Date().toISOString(),
    },
    payload_ref: 'experiment_plan_v:EXP-U-2',
    node_status: 'candidate',
    value_judgement_payload: {
      judgement_id: 'J-U-1',
      decision: 'promote',
      core_score_vector: { technical_soundness: 0.8 },
      extension_score_vector: { protocol_fairness: 0.8 },
      confidence: 0.9,
      reason_summary: 'candidate ok',
      reviewer: 'llm',
      timestamp: new Date().toISOString(),
    },
  });

  await assert.rejects(
    service.verifyStageGate(paper.paper_id, {
      candidate_node_ids: [node.node_id],
      config_version: 'llm-global-default-v1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
    }),
    /skip_m6_reason is required/,
  );
});

test('verifyStageGate creates partial snapshot and updates partial pointer', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_unit_4',
    title: 'Unit Test Paper 4',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-4'],
    },
  });

  const node = await service.commitVersionSpine({
    lineage_meta: {
      paper_id: paper.paper_id,
      stage_id: 'S3',
      module_id: 'M5',
      version_id: 'P001-M5-B01-N0001',
      run_id: 'RUN-U-3',
      lane_id: 'LANE-U-3',
      attempt_id: 'ATT-U-3',
      created_by: 'llm',
      created_at: new Date().toISOString(),
    },
    payload_ref: 'experiment_plan_v:EXP-U-3',
    node_status: 'candidate',
    value_judgement_payload: {
      judgement_id: 'J-U-2',
      decision: 'promote',
      core_score_vector: { technical_soundness: 0.8 },
      extension_score_vector: { protocol_fairness: 0.8 },
      confidence: 0.9,
      reason_summary: 'candidate ok',
      reviewer: 'llm',
      timestamp: new Date().toISOString(),
    },
  });

  const result = await service.verifyStageGate(paper.paper_id, {
    candidate_node_ids: [node.node_id],
    config_version: 'llm-global-default-v1',
    reviewer_mode: 'hybrid',
    analysis_contract: 'no_m6',
    override_context: {
      skip_m6_reason: 'no training path',
      training_claim_allowed: false,
    },
  });

  assert.equal(result.results.length, 1);
  assert.equal(result.snapshot?.snapshot_type, 'SP-partial');
  assert.equal(result.pointer_update?.paper_active_sp_partial, 'SP-0001');
  assert.equal(result.pointer_update?.paper_active_sp_full, undefined);
});

test('getResourceMetrics returns derived runtime metrics', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_unit_5',
    title: 'Metrics Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-5'],
    },
  });

  await service.commitVersionSpine({
    lineage_meta: {
      paper_id: paper.paper_id,
      stage_id: 'S3',
      module_id: 'M6',
      version_id: 'P001-M6-B01-N0001',
      run_id: 'RUN-U-4',
      lane_id: 'LANE-U-4',
      attempt_id: 'ATT-U-4',
      created_by: 'llm',
      created_at: new Date().toISOString(),
    },
    payload_ref: 'train_run_v:TR-U-1',
    node_status: 'draft',
  });

  const metrics = await service.getResourceMetrics(paper.paper_id);
  assert.equal(metrics.paper_id, paper.paper_id);
  assert.equal((metrics.paper_runtime_metric.tokens ?? 0) > 0, true);
  assert.equal(metrics.paper_runtime_metric.gpu_requested, 1);
});

test('reviewReleaseGate writes audit result and updates artifact bundle', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_unit_6',
    title: 'Release Review Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-6'],
    },
  });

  const review = await service.reviewReleaseGate(paper.paper_id, {
    reviewers: ['r1', 'r2'],
    decision: 'approve',
    risk_flags: ['policy-check'],
    label_policy: 'ai-generated-required',
    comment: 'ok',
  });

  assert.equal(review.gate_result.accepted, true);
  assert.equal(review.gate_result.review_id, 'RV-0001');
  assert.equal(review.gate_result.audit_ref, 'AUD-RV-0001');

  const bundle = await service.getArtifactBundle(paper.paper_id);
  assert.equal(typeof bundle.artifact_bundle.review_url, 'string');
});

test('delivery failure is persisted into audit store', async () => {
  const failingAdapter: GovernanceEventDeliveryAdapter = {
    mode: 'in-process',
    async deliver(envelope) {
      return {
        status: 'failed',
        mode: 'in-process',
        envelope,
        attempts: [
          {
            attempt: 1,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            ok: false,
            error_message: 'forced failure',
          },
        ],
        final_error: 'forced failure',
      };
    },
  };

  const auditStore = new InMemoryGovernanceDeliveryAuditStore();
  const service = new ResearchLifecycleService(
    new InMemoryResearchLifecycleRepository(),
    {
      deliveryAdapter: failingAdapter,
      deliveryAuditStore: auditStore,
    },
  );

  await assert.rejects(
    service.createPaperProject({
      title_card_id: 'title_card_unit_7',
      title: 'Delivery Failure Audit',
      created_by: 'human',
      initial_context: {
        literature_evidence_ids: ['LIT-7'],
      },
    }),
    /Timeline event delivery failed/,
  );

  const records = auditStore.getRecords();
  assert.equal(records.length > 0, true);
  assert.equal(records.some((record) => record.status === 'failed'), true);
});

test('paper id generation is max+1 over surviving ids, not count+1', async () => {
  // Regression for the count+1 defect class caught by the first product run (T-128 W-10):
  // after deletePaperProject removes rows the table count lags the highest surviving id,
  // so count+1 mints an id that collides with an existing primary key. The generator must
  // derive from the max surviving numeric id.
  const repository = new InMemoryResearchLifecycleRepository();
  const service = new ResearchLifecycleService(repository);

  // Model the post-deletion shape directly: one surviving paper whose numeric id (P009)
  // is far above the table count (1).
  await repository.createPaperProject({
    id: 'P009',
    titleCardId: 'title_card_id_regression_survivor',
    title: 'Surviving Paper',
    researchDirection: 'LLM',
    status: 'active',
    paperActiveSpFull: null,
    paperActiveSpPartial: null,
    createdAt: new Date().toISOString(),
  });

  const created = await service.createPaperProject({
    title_card_id: 'title_card_id_regression_new',
    title: 'Paper Created After Deletions',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-ID-REG-1'],
    },
  });

  assert.equal(created.paper_id, 'P010');
});

test('node id generation is max+1 over surviving ids, not count+1', async () => {
  // Same count+1 defect class as the paper id regression above: deletePaperProject also
  // removes the paper's nodes, so the node count lags surviving NODE- ids.
  const repository = new InMemoryResearchLifecycleRepository();
  const service = new ResearchLifecycleService(repository);
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_id_regression_node',
    title: 'Node Id Regression Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-ID-REG-2'],
    },
  });

  await repository.createNode({
    id: 'NODE-0009',
    paperId: paper.paper_id,
    stageId: 'S3',
    moduleId: 'M5',
    versionId: 'P001-M5-B01-N0008',
    parentNodeIds: [],
    runId: 'RUN-ID-REG-1',
    laneId: 'LANE-ID-REG-1',
    attemptId: 'ATT-ID-REG-1',
    createdBy: 'llm',
    createdAt: new Date().toISOString(),
    payloadRef: 'experiment_plan_v:EXP-ID-REG-1',
    nodeStatus: 'draft',
  });

  const node = await service.commitVersionSpine({
    lineage_meta: {
      paper_id: paper.paper_id,
      stage_id: 'S3',
      module_id: 'M5',
      version_id: 'P001-M5-B01-N0009',
      run_id: 'RUN-ID-REG-2',
      lane_id: 'LANE-ID-REG-2',
      attempt_id: 'ATT-ID-REG-2',
      created_by: 'llm',
      created_at: new Date().toISOString(),
    },
    payload_ref: 'experiment_plan_v:EXP-ID-REG-2',
    node_status: 'draft',
  });

  assert.equal(node.node_id, 'NODE-0010');
});

test('snapshot id generation is max+1 over surviving ids, not count+1', async () => {
  // Same count+1 defect class as the paper id regression above: deletePaperProject also
  // removes the paper's snapshots, so the snapshot count lags surviving SP- ids.
  const repository = new InMemoryResearchLifecycleRepository();
  const service = new ResearchLifecycleService(repository);
  const paper = await service.createPaperProject({
    title_card_id: 'title_card_id_regression_snapshot',
    title: 'Snapshot Id Regression Paper',
    created_by: 'human',
    initial_context: {
      literature_evidence_ids: ['LIT-ID-REG-3'],
    },
  });

  await repository.createSnapshot({
    id: 'SP-0009',
    paperId: paper.paper_id,
    snapshotType: 'SP-partial',
    nodeRefs: [],
    claimSetHash: 'hash-claim-reg',
    problemScopeHash: 'hash-scope-reg',
    datasetProtocolHash: 'hash-dataset-reg',
    evaluationProtocolHash: 'hash-eval-reg',
    createdAt: new Date().toISOString(),
    createdBy: 'llm',
  });

  const node = await service.commitVersionSpine({
    lineage_meta: {
      paper_id: paper.paper_id,
      stage_id: 'S3',
      module_id: 'M5',
      version_id: 'P001-M5-B01-N0010',
      run_id: 'RUN-ID-REG-3',
      lane_id: 'LANE-ID-REG-3',
      attempt_id: 'ATT-ID-REG-3',
      created_by: 'llm',
      created_at: new Date().toISOString(),
    },
    payload_ref: 'experiment_plan_v:EXP-ID-REG-3',
    node_status: 'candidate',
    value_judgement_payload: {
      judgement_id: 'J-ID-REG-1',
      decision: 'promote',
      core_score_vector: { technical_soundness: 0.8 },
      extension_score_vector: { protocol_fairness: 0.8 },
      confidence: 0.9,
      reason_summary: 'candidate ok',
      reviewer: 'llm',
      timestamp: new Date().toISOString(),
    },
  });

  const result = await service.verifyStageGate(paper.paper_id, {
    candidate_node_ids: [node.node_id],
    config_version: 'llm-global-default-v1',
    reviewer_mode: 'hybrid',
    analysis_contract: 'no_m6',
    override_context: {
      skip_m6_reason: 'no training path',
      training_claim_allowed: false,
    },
  });

  assert.equal(result.snapshot?.snapshot_id, 'SP-0010');
});
