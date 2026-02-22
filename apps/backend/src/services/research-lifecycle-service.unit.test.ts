import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryResearchLifecycleRepository } from '../repositories/in-memory-research-lifecycle-repository.js';
import { ResearchLifecycleService } from './research-lifecycle-service.js';

test('createPaperProject uses default LLM direction when omitted', async () => {
  const service = new ResearchLifecycleService(new InMemoryResearchLifecycleRepository());

  const result = await service.createPaperProject({
    topic_id: 'TOPIC-UNIT-1',
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
    topic_id: 'TOPIC-UNIT-2',
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
    topic_id: 'TOPIC-UNIT-3',
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
    topic_id: 'TOPIC-UNIT-4',
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
