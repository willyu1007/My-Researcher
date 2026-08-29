import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';

import {
  TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  type TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionRiskFindingService } from './topic-selection-risk-finding-service.js';

const TITLE_CARD_ID = 'title_card_t147_phase9a';
const SNAPSHOT_HASH = 'a'.repeat(64);

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: TITLE_CARD_ID };
}

function makeSubject() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => '2026-08-29T18:00:00.000Z',
  });
  return {
    repository,
    service: new TopicSelectionRiskFindingService(controlPlane),
  };
}

function materialInput(snapshotHash = SNAPSHOT_HASH) {
  return {
    title_card_id: TITLE_CARD_ID,
    source_snapshot_ref: ref('topic_value_input_snapshot', 'topic_value_input_snapshot_001'),
    source_snapshot_hash: snapshotHash,
    source_ref: ref('topic_question_contract', 'topic_question_contract_001'),
    evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
    risk_notes: ['The fixed local benchmark limits external validity.'],
    reviewer_objections: ['A near-isomorphic baseline may absorb the claimed gain.'],
    reviewer_risks: ['The fixed local benchmark limits external validity.'],
    top_objections: [],
    critic_triggers: ['Check baseline absorption before promotion.'],
    requires_critic_review: true,
    hard_gates: [{
      gate_key: 'novelty',
      verdict: 'pass_with_risk' as const,
      rationale: 'Nearest work leaves only a narrow mechanism distinction.',
      refs: [ref('evidence_unit', 'evidence_unit_001')],
    }],
    dimension_scores: [
      {
        dimension_key: 'originality',
        score: 68,
        rationale: 'The contribution remains close to prior adaptive retrieval work.',
        evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
      },
      {
        dimension_key: 'reviewer_risk',
        score: 64,
        rationale: 'Labels, subgroups, and the fixed local pipeline still bound the claim.',
        evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
      },
    ],
    risk_penalty_summary: 'Nearest-work pressure and narrow benchmark scope remain material.',
  };
}

test('material N8 findings are immutable, deduplicated, and exactly replayable', async () => {
  const { repository, service } = makeSubject();

  const [first, concurrentReplay] = await Promise.all([
    service.recordN8Findings(materialInput()),
    service.recordN8Findings(materialInput()),
  ]);
  const replay = await service.recordN8Findings(materialInput());

  assert.ok(first.length >= 5);
  assert.deepEqual(
    replay.map((finding) => finding.artifact_ref.artifact_ref_id),
    first.map((finding) => finding.artifact_ref.artifact_ref_id),
  );
  assert.deepEqual(
    concurrentReplay.map((finding) => finding.artifact_ref.artifact_ref_id),
    first.map((finding) => finding.artifact_ref.artifact_ref_id),
  );
  assert.equal(new Set(first.map((finding) => finding.payload.summary)).size, first.length);
  assert.equal(
    first.every((finding) =>
      finding.ref.version_id === TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION
      && finding.payload.materiality === 'advancement_relevant'
      && finding.payload.source_snapshot_hash === SNAPSHOT_HASH
      && finding.artifact_ref.stable_key?.startsWith('topic-selection-risk-finding:')
    ),
    true,
  );
  assert.equal((await repository.listArtifactRefsByInputSnapshotId('missing')).length, 0);
});

test('a changed source snapshot receives new identities and stale refs fail validation', async () => {
  const { service } = makeSubject();
  const first = await service.recordN8Findings(materialInput());
  const changed = await service.recordN8Findings(materialInput('b'.repeat(64)));

  assert.notDeepEqual(
    changed.map((finding) => finding.artifact_ref.artifact_ref_id),
    first.map((finding) => finding.artifact_ref.artifact_ref_id),
  );
  await assert.rejects(
    () => service.resolveCurrentFindings({
      refs: first.map((finding) => finding.ref),
      source_snapshot_ref: materialInput('b'.repeat(64)).source_snapshot_ref,
      source_snapshot_hash: 'b'.repeat(64),
    }),
    /stale source snapshot/u,
  );
});

test('admitted arena material and minority findings reuse stable identities without gaining authority', async () => {
  const { service } = makeSubject();
  const input = {
    title_card_id: TITLE_CARD_ID,
    source_snapshot_ref: {
      ...ref('input_snapshot', 'arena_input_001'),
      version_id: SNAPSHOT_HASH,
    },
    source_snapshot_hash: SNAPSHOT_HASH,
    source_ref: {
      ...ref('research_arena_session', 'arena_session_001'),
      version_id: SNAPSHOT_HASH,
    },
    findings: [{
      source_finding_id: 'killer_material_001',
      participant_role: 'prior_art_topic_killer',
      severity: 'critical' as const,
      statement: 'The claimed distinction may collapse into near-isomorphic prior art.',
      evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
    }],
  };

  const first = await service.recordArenaFindings(input);
  const replay = await service.recordArenaFindings(input);

  assert.equal(first.length, 1);
  assert.equal(first[0]?.payload.finding_kind, 'arena_minority_finding');
  assert.equal(first[0]?.payload.severity, 'blocking');
  assert.equal(first[0]?.ref.ref_type, 'artifact_ref');
  assert.deepEqual(replay.map((finding) => finding.ref), first.map((finding) => finding.ref));
});

test('risk finding migration adds one nullable deterministic identity without a second risk table', async () => {
  const sql = await fs.readFile(
    new URL('../../../../prisma/migrations/20260829183000_add_topic_selection_risk_finding_identity/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /ALTER TABLE "TopicSelectionArtifactRef"/u);
  assert.match(sql, /ADD COLUMN "stableKey" TEXT/u);
  assert.match(sql, /CREATE UNIQUE INDEX "tsar_stable_key_key"/u);
  assert.doesNotMatch(sql, /CREATE TABLE/u);
});
