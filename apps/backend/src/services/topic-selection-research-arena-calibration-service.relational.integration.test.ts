import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaCalibrationMemberRecipe,
  TopicSelectionResearchArenaCalibrationProtocolV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-calibration-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { PrismaTopicSelectionOfflineEvaluationReplayRepository } from '../repositories/prisma/prisma-topic-selection-offline-evaluation-replay-repository.js';
import { sha256Text } from './literature-content-processing-utils.js';
import { TopicSelectionOfflineEvaluationReplayService } from './topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionResearchArenaCalibrationService } from './topic-selection-research-arena-calibration-service.js';

const RUN_PRISMA = process.env.TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_PRISMA === '1'
  && Boolean(process.env.DATABASE_URL);
const NOW = '2026-08-31T08:00:00.000Z';

const ref = (
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef => ({
  ref_type: refType,
  ref_id: refId,
  version_id: versionId,
  title_card_id: titleCardId,
});

function phase10bRelationalProtocol(suffix: string): TopicSelectionResearchArenaCalibrationProtocolV2 {
  const member = (
    memberRole: TopicSelectionResearchArenaCalibrationMemberRecipe['member_role'],
    key: string,
    titleKey = key,
    loopDelta: TopicSelectionResearchArenaCalibrationMemberRecipe['loop_delta'] = null,
  ): TopicSelectionResearchArenaCalibrationMemberRecipe => {
    const titleCardId = `title_${suffix}_${titleKey}`;
    return {
      member_role: memberRole,
      session_key: `session-${suffix}-${key}`,
      title_card_id: titleCardId,
      input_snapshot_ref: ref(
        'input_snapshot',
        `snapshot_${suffix}_${key}`,
        titleCardId,
        sha256Text(`snapshot:${suffix}:${key}`),
      ),
      candidate_refs: [ref('need_candidate', `candidate_${suffix}_${titleKey}`, titleCardId, 'v1')],
      evidence_refs: [ref('evidence_map', `evidence_${suffix}_${key}`, titleCardId, 'v1')],
      label_slot_key: `label-${suffix}-${key}`,
      label_actor: { actor_type: 'human', actor_id: 'researcher_1' },
      loop_delta: loopDelta,
    };
  };
  const causalControl = member('control', 'causal-control', 'causal');
  const causalDelta = ref('evidence_map', `evidence_${suffix}_causal-delta`, causalControl.title_card_id, 'v2');
  const causalVariant = member('variant', 'causal-variant', 'causal', {
    delta_type: 'evidence',
    ref: causalDelta,
    classification: 'causal',
    rationale: 'Add the predeclared causal evidence only.',
  });
  causalVariant.evidence_refs = [...causalControl.evidence_refs, causalDelta];
  const irrelevantControl = member('control', 'irrelevant-control', 'irrelevant');
  const irrelevantDelta = ref(
    'evidence_map',
    `evidence_${suffix}_irrelevant-delta`,
    irrelevantControl.title_card_id,
    'v2',
  );
  const irrelevantVariant = member('variant', 'irrelevant-variant', 'irrelevant', {
    delta_type: 'evidence',
    ref: irrelevantDelta,
    classification: 'irrelevant',
    rationale: 'Add the predeclared irrelevant evidence only.',
  });
  irrelevantVariant.evidence_refs = [...irrelevantControl.evidence_refs, irrelevantDelta];
  return {
    schema_version: 'TopicSelectionResearchArenaCalibrationProtocol@v2',
    slots: [{
      slot_key: 'dominance-1',
      case_type: 'arena_dominance_pair',
      tranche: 'first',
      members: [member('baseline', 'dominance-1-baseline'), member('preferred', 'dominance-1-preferred')],
      expected_relation: {
        relation_kind: 'dominance',
        rationale: 'First declared dominance relation.',
        dominance_axes: ['mechanism'],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'causal',
      case_type: 'arena_causal_perturbation',
      tranche: 'first',
      members: [causalControl, causalVariant],
      expected_relation: {
        relation_kind: 'causal_perturbation',
        rationale: 'Declared causal evidence relation.',
        dominance_axes: [],
        sole_delta_ref: causalDelta,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'non-advance',
      case_type: 'arena_successful_non_advance',
      tranche: 'first',
      members: [member('subject', 'non-advance')],
      expected_relation: {
        relation_kind: 'successful_non_advance',
        rationale: 'Accepted stop relation.',
        dominance_axes: [],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: ['research_question', 'value_feasibility', 'topic_package', 'promotion_review'],
    }, {
      slot_key: 'dominance-2',
      case_type: 'arena_dominance_pair',
      tranche: 'second',
      members: [member('baseline', 'dominance-2-baseline'), member('preferred', 'dominance-2-preferred')],
      expected_relation: {
        relation_kind: 'dominance',
        rationale: 'Second declared dominance relation.',
        dominance_axes: ['evidence'],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'irrelevant',
      case_type: 'arena_irrelevant_perturbation',
      tranche: 'second',
      members: [irrelevantControl, irrelevantVariant],
      expected_relation: {
        relation_kind: 'irrelevant_perturbation',
        rationale: 'Declared irrelevant evidence relation.',
        dominance_axes: [],
        sole_delta_ref: irrelevantDelta,
      },
      work_avoided_stage_keys: [],
    }, {
      slot_key: 'advancing',
      case_type: 'arena_advancing_case',
      tranche: 'second',
      members: [member('subject', 'advancing')],
      expected_relation: {
        relation_kind: 'advancing',
        rationale: 'Declared advancing relation.',
        dominance_axes: [],
        sole_delta_ref: null,
      },
      work_avoided_stage_keys: [],
    }],
    selection_rule: 'ordered_exact_member_recipes',
    measurement_window: {
      start_event: 'case_registration_before_role_output',
      end_event: 'calibration_run_evaluation',
    },
    accounting_sources: {
      runtime: 'arena_transcript',
      authorization_pause: 'designated_advisory_review_operation_group',
      work_avoided: 'research_stage_manifest',
    },
    decision_difference_rule: 'advisory_outcome_changed',
    override_categories: [
      'explained_repair',
      'human_objective_difference',
      'possible_false_drop',
      'possible_false_continue',
    ],
    stop_rules: {
      hard_blocker: 'stop_immediately',
      first_tranche_redundancy: 'stop_when_no_decision_difference_and_no_work_avoided',
    },
    budgets: {
      max_case_count: 6,
      max_session_count: 10,
      max_role_invocation_count: 20,
      max_review_points_per_tranche: 2,
    },
    support_only: true,
  };
}

test('Prisma OfflineEvaluation owners converge under concurrent v2 Arena case registration', {
  skip: RUN_PRISMA
    ? false
    : 'set TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_PRISMA=1 and DATABASE_URL to run the relational replay',
}, async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const offlineRepository = new PrismaTopicSelectionOfflineEvaluationReplayRepository(prisma);
  const offlineService = new TopicSelectionOfflineEvaluationReplayService(offlineRepository, {
    now: () => NOW,
  });
  let clockTick = 0;
  const service = new TopicSelectionResearchArenaCalibrationService({
    offlineRepository,
    offlineService,
    arenaRepository,
    controlPlaneRepository,
    advisoryReviewHistoryReader: {
      getArenaAdvisoryReviewHistory: async () => {
        throw new Error('This relational fixture intentionally has no human label.');
      },
      getArenaAdvisoryReviewHistoryForSession: async () => null,
      getStageManifest: async (titleCardId) => ({
        schema_version: 'TopicSelectionResearchStageManifest@v1',
        title_card_id: titleCardId,
        current_stage: null,
        next_human_decision_stage: null,
        stages: [],
        manifest_hash: sha256Text(`manifest:${titleCardId}`),
      }),
    },
  }, {
    now: () => new Date(Date.parse(NOW) + clockTick++ * 1_000).toISOString(),
  });
  const datasetIds: string[] = [];

  try {
    const protocol = phase10bRelationalProtocol(suffix);
    const registeredSlot = protocol.slots[0]!;
    for (const recipe of registeredSlot.members) {
      await controlPlaneRepository.createInputSnapshot({
        input_snapshot_id: recipe.input_snapshot_ref.ref_id,
        workspace_id: null,
        title_card_id: recipe.title_card_id,
        target_ref: recipe.candidate_refs[0]!,
        context_policy_version_id: null,
        policy_version: 'topic-selection-research-arena@v1',
        snapshot_hash: recipe.input_snapshot_ref.version_id!,
        source_refs: [...recipe.candidate_refs, ...recipe.evidence_refs],
        permission_refs: [],
        payload: {},
        created_by: 'system',
        created_at: NOW,
      });
    }
    const phase10bDataset = await service.createDataset({
      schema_version: 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2',
      workspace_id: null,
      dataset_key: `phase10b-relational-${suffix}`,
      dataset_version: 'v2',
      description: 'Disposable Phase 10B pre-registration proof.',
      protocol_manifest: protocol,
    });
    datasetIds.push(phase10bDataset.offline_evaluation_dataset_id);
    const caseRequest = {
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2' as const,
      dataset_id: phase10bDataset.offline_evaluation_dataset_id,
      case_key: registeredSlot.slot_key,
      slot_key: registeredSlot.slot_key,
      tags: ['relational', 'phase10b'],
    };
    const registrations = await Promise.all(Array.from(
      { length: 8 },
      () => service.addCase(caseRequest),
    ));
    for (const registration of registrations.slice(1)) {
      assert.equal(registration.offline_evaluation_case_id, registrations[0]!.offline_evaluation_case_id);
    }
    const persistedDataset = await offlineRepository.findDatasetById(
      phase10bDataset.offline_evaluation_dataset_id,
    );
    assert.equal(persistedDataset?.payload.schema_version, 'TopicSelectionResearchArenaCalibrationDataset@v2');
    const persistedCases = await offlineRepository.listCasesByDatasetId(
      phase10bDataset.offline_evaluation_dataset_id,
    );
    assert.equal(persistedCases.length, 1);
    assert.equal(
      persistedCases[0]?.frozen_input_bundle.payload.schema_version,
      'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2',
    );
  } finally {
    for (const datasetId of datasetIds) {
      await prisma.topicSelectionOfflineEvaluationMetricResult.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationCaseResult.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionReplayDiff.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationRun.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationCase.deleteMany({ where: { datasetId } });
      await prisma.topicSelectionOfflineEvaluationDataset.deleteMany({ where: { id: datasetId } });
    }
    await prisma.$disconnect();
  }
});
