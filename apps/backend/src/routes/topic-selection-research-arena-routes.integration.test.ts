import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TopicSelectionResearchArenaController } from '../controllers/topic-selection-research-arena-controller.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { TopicSelectionResearchArenaService } from '../services/topic-selection-research-arena-service.js';
import type {
  TopicSelectionResearchGapProjectionService,
} from '../services/topic-selection-research-gap-projection-service.js';
import { sha256Text, stableStringify } from '../services/literature-content-processing-utils.js';
import { registerTopicSelectionResearchArenaRoutes } from './topic-selection-research-arena-routes.js';

const NOW = '2026-08-29T00:00:00.000Z';
const unusedGapRecoveryService = {
  recoverSynthesizedSession: async () => {
    throw new Error('not used');
  },
} satisfies Pick<TopicSelectionResearchGapProjectionService, 'recoverSynthesizedSession'>;

test('research arena session route opens one replayable support-only session', async () => {
  const targetRef = {
    ref_type: 'need_candidate_arena',
    ref_id: 'candidate_arena_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const snapshot: TopicSelectionInputSnapshotRecord = {
    input_snapshot_id: 'snapshot_1',
    workspace_id: null,
    title_card_id: 'title_1',
    target_ref: targetRef,
    context_policy_version_id: null,
    policy_version: 'v1',
    snapshot_hash: 'a'.repeat(64),
    source_refs: [],
    permission_refs: [],
    payload: {},
    created_by: 'system',
    created_at: NOW,
  };
  const planPayload = {
    schema_version: 'TopicSelectionResearchArenaExecutionPlan@v1',
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_mode: 'codex_assisted',
    support_only: true,
  };
  const plan: TopicSelectionArtifactRefRecord = {
    artifact_ref_id: 'plan_1',
    workspace_id: null,
    title_card_id: 'title_1',
    artifact_kind: 'input',
    storage_kind: 'inline',
    payload: planPayload,
    checksum: sha256Text(stableStringify(planPayload)),
    input_snapshot_id: snapshot.input_snapshot_id,
    created_by: 'system',
    created_at: NOW,
  };
  let id = 0;
  const service = new TopicSelectionResearchArenaService({
    arenaRepository: new InMemoryTopicSelectionResearchArenaRepository(),
    controlPlaneRepository: {
      findInputSnapshotById: async (snapshotId) => (
        snapshotId === snapshot.input_snapshot_id ? snapshot : null
      ),
      findArtifactRefById: async (artifactId) => (
        artifactId === plan.artifact_ref_id ? plan : null
      ),
    },
  }, { idFactory: (prefix) => `${prefix}_${++id}`, now: () => NOW });
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchArenaRoutes(
    app,
    new TopicSelectionResearchArenaController(service, unusedGapRecoveryService),
  );
  const request = {
    schema_version: 'TopicSelectionResearchArenaOpenSessionRequest@v1',
    session_key: 'shadow-af-1-attempt-1',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: targetRef,
    input_snapshot_id: snapshot.input_snapshot_id,
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: {
      ref_type: 'artifact_ref',
      ref_id: plan.artifact_ref_id,
      title_card_id: 'title_1',
    },
    loop_delta_refs: [],
  };

  const created = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/sessions',
    payload: request,
  });
  assert.equal(created.statusCode, 201, created.body);
  assert.equal(created.json().support_only, true);
  assert.equal(created.json().created_by, 'system');

  const replay = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/sessions',
    payload: request,
  });
  assert.equal(replay.statusCode, 201, replay.body);
  assert.equal(replay.json().arena_session_id, created.json().arena_session_id);

  const recovered = await app.inject({
    method: 'GET',
    url: `/topic-selection/research/arena/sessions/${created.json().arena_session_id}`,
  });
  assert.equal(recovered.statusCode, 200, recovered.body);
  assert.equal(recovered.json().session_key, request.session_key);

  await app.close();
});

test('research arena route exposes deterministic gap projection recovery by session id', async () => {
  const checkpoint = {
    research_checkpoint_id: 'research_checkpoint_1',
    checkpoint_key: 'a'.repeat(64),
    current_checkpoint_key: 'title_1:gap_selection',
    workspace_id: null,
    title_card_id: 'title_1',
    checkpoint_kind: 'gap_selection' as const,
    contract_version: 'v1' as const,
    provenance_class: 'native' as const,
    policy_version_id: null,
    target_ref: {
      ref_type: 'need_candidate_arena',
      ref_id: 'candidate_arena_1',
      title_card_id: 'title_1',
    },
    target_snapshot_hash: 'b'.repeat(64),
    packet_hash: 'c'.repeat(64),
    input_snapshot_id: 'input_snapshot_1',
    source_refs: [],
    allowed_actions: ['advance' as const],
    required_action_refs: [],
    decision_authority_ref: null,
    status: 'pending' as const,
    supersedes_checkpoint_id: null,
    superseded_by_checkpoint_id: null,
    created_at: NOW,
    updated_at: NOW,
    decided_at: null,
    superseded_at: null,
  };
  const recoveryService = {
    recoverSynthesizedSession: async (arenaSessionId: string) => {
      assert.equal(arenaSessionId, 'arena_1');
      return checkpoint;
    },
  } satisfies Pick<TopicSelectionResearchGapProjectionService, 'recoverSynthesizedSession'>;
  const arenaService = {
    openSession: async () => { throw new Error('not used'); },
    getSession: async () => { throw new Error('not used'); },
  } as unknown as TopicSelectionResearchArenaService;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchArenaRoutes(
    app,
    new TopicSelectionResearchArenaController(arenaService, recoveryService),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/sessions/arena_1/gap-projection/recover',
  });

  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().research_checkpoint_id, checkpoint.research_checkpoint_id);
  await app.close();
});
