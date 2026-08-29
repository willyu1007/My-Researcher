import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Prisma } from '@prisma/client';

import type {
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
  TopicSelectionArtifactRefRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
  TopicSelectionV1bTopicPackageCreationResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import type {
  TopicSelectionV1bTopicPackageAuthorityPersistence,
  TopicSelectionV1bTopicPackagePersistence,
  TopicSelectionV1bTopicPackageRepository,
} from '../repositories/topic-selection-v1b-topic-package.repository.js';
import { InMemoryTopicSelectionV1cPromotionInputRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-input-repository.js';
import { PrismaTopicSelectionV1cPromotionInputRepository } from '../repositories/prisma/prisma-topic-selection-v1c-promotion-input-repository.js';
import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionV1cPromotionInputService,
} from './topic-selection-v1c-promotion-input-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const NOW = '2026-05-15T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

function makeEvidenceRef() {
  return {
    topic_question_evidence_ref_id: 'topic_question_evidence_ref_001',
    workspace_id: null,
    title_card_id: 'title_card_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    evidence_ref: ref('evidence_unit', 'evidence_unit_001'),
    evidence_role: 'support' as const,
    mapped_question_part: 'main_question',
    rationale: 'supports the package',
    source_locator_snapshot: {},
    created_at: NOW,
  };
}

function expectedBundleHash(bundle: Pick<
TopicSelectionV1bToV1cInputBundleRecord,
'package_trace_boundary_check_ref'
| 'topic_package_ref'
| 'package_version'
| 'package_readiness_assessment_ref'
| 'value_disposition_decision_ref'
>): string {
  return sha256Text(stableStringify({
    check_ref: bundle.package_trace_boundary_check_ref,
    package_ref: bundle.topic_package_ref,
    package_version: bundle.package_version,
    readiness_ref: bundle.package_readiness_assessment_ref,
    value_disposition_decision_ref: bundle.value_disposition_decision_ref,
  }));
}

function makePackage(overrides: Partial<TopicSelectionTopicPackageRecord> = {}): TopicSelectionTopicPackageRecord {
  const riskFindingRef = ref(
    'artifact_ref',
    'risk_finding_001',
    TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  );
  return {
    topic_package_id: 'topic_package_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    research_record_id: 'topic_research_record_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    topic_value_assessment_id: 'topic_value_assessment_001',
    value_reasoning_memo_id: 'value_reasoning_memo_001',
    value_disposition_decision_id: 'value_disposition_decision_001',
    research_slice_id: 'research_slice_001',
    research_slice_version: 'v1',
    package_version: 'v1',
    package_readiness_status: 'ready_for_promotion_review',
    topic_package_ref: ref('topic_package', 'topic_package_001', 'v1'),
    topic_value_assessment_ref: ref('topic_value_assessment', 'topic_value_assessment_001'),
    value_reasoning_memo_ref: ref('value_reasoning_memo', 'value_reasoning_memo_001'),
    value_disposition_decision_ref: ref('value_disposition_decision', 'value_disposition_decision_001'),
    topic_question_ref: ref('topic_question', 'topic_question_001'),
    topic_question_contract_ref: ref('topic_question_contract', 'topic_question_contract_001'),
    answerability_plan_ref: ref('topic_question_answerability_plan', 'answerability_plan_001'),
    research_slice_ref: ref('research_slice', 'research_slice_001', 'v1'),
    validated_need_refs: [ref('validated_need', 'validated_need_001')],
    evidence_refs: [makeEvidenceRef()],
    selected_evidence_refs: [ref('evidence_unit', 'evidence_unit_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    blocker_refs: [],
    memory_suggestion_refs: [ref('memory_suggestion', 'memory_suggestion_001')],
    recheck_request_refs: [ref('recheck_request', 'recheck_request_001')],
    title_candidates: ['Trace ready package'],
    research_background: 'background',
    contribution_summary: 'contribution',
    candidate_methods: ['method'],
    evaluation_plan: 'evaluation',
    key_risks: ['risk'],
    non_goals: ['non-goal'],
    selected_literature_evidence_ids: ['evidence_unit_001'],
    package_payload: {},
    trace_boundary_check_id: 'package_trace_boundary_check_001',
    readiness_assessment_id: 'package_readiness_assessment_001',
    v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    trace_snapshot_id: 'trace_snapshot_001',
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: [riskFindingRef, ref('artifact_ref', 'artifact_ref_001')],
    risk_finding_refs: [riskFindingRef],
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeTraceCheck(
  overrides: Partial<TopicSelectionPackageTraceBoundaryCheckRecord> = {},
): TopicSelectionPackageTraceBoundaryCheckRecord {
  const pkg = makePackage();
  return {
    package_trace_boundary_check_id: 'package_trace_boundary_check_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_package_id: pkg.topic_package_id,
    value_disposition_decision_id: pkg.value_disposition_decision_id,
    topic_value_assessment_id: pkg.topic_value_assessment_id,
    topic_question_contract_id: pkg.topic_question_contract_id,
    research_slice_id: pkg.research_slice_id,
    check_status: 'passed',
    package_ref: pkg.topic_package_ref,
    topic_value_assessment_ref: pkg.topic_value_assessment_ref,
    value_reasoning_memo_ref: pkg.value_reasoning_memo_ref,
    value_disposition_decision_ref: pkg.value_disposition_decision_ref,
    topic_question_ref: pkg.topic_question_ref,
    topic_question_contract_ref: pkg.topic_question_contract_ref,
    answerability_plan_ref: pkg.answerability_plan_ref,
    research_slice_ref: pkg.research_slice_ref,
    validated_need_refs: pkg.validated_need_refs,
    evidence_refs: pkg.selected_evidence_refs,
    accepted_risk_refs: pkg.accepted_risk_refs,
    blocker_refs: pkg.blocker_refs,
    recheck_request_refs: pkg.recheck_request_refs,
    missing_ref_codes: [],
    new_ref_codes: [],
    boundary_conflict_codes: [],
    carry_forward_codes: [],
    trace_issues: [],
    boundary_issues: [],
    narrative_consistency: {},
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: pkg.artifact_refs,
    created_at: NOW,
    ...overrides,
  };
}

function makeReadiness(
  overrides: Partial<TopicSelectionTopicPackageReadinessAssessmentRecord> = {},
): TopicSelectionTopicPackageReadinessAssessmentRecord {
  const pkg = makePackage();
  return {
    package_readiness_assessment_id: 'package_readiness_assessment_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_package_id: pkg.topic_package_id,
    value_disposition_decision_id: pkg.value_disposition_decision_id,
    package_trace_boundary_check_id: 'package_trace_boundary_check_001',
    package_version: 'v1',
    package_readiness_status: 'ready_for_promotion_review',
    blockers: [],
    warnings: [],
    required_actions: [],
    accepted_risk_refs: pkg.accepted_risk_refs,
    blocker_refs: pkg.blocker_refs,
    recheck_request_refs: pkg.recheck_request_refs,
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: pkg.artifact_refs,
    assessed_by: 'system',
    created_at: NOW,
    ...overrides,
  };
}

function makeBundle(
  overrides: Partial<TopicSelectionV1bToV1cInputBundleRecord> = {},
): TopicSelectionV1bToV1cInputBundleRecord {
  const pkg = makePackage();
  const bundle: TopicSelectionV1bToV1cInputBundleRecord = {
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_package_id: pkg.topic_package_id,
    package_version: 'v1',
    package_readiness_status: 'ready_for_promotion_review',
    bundle_status: 'ready_for_promotion_review',
    topic_package_ref: pkg.topic_package_ref,
    package_trace_boundary_check_ref: ref('package_trace_boundary_check', 'package_trace_boundary_check_001'),
    package_readiness_assessment_ref: ref('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    topic_value_assessment_ref: pkg.topic_value_assessment_ref,
    value_reasoning_memo_ref: pkg.value_reasoning_memo_ref,
    value_disposition_decision_ref: pkg.value_disposition_decision_ref,
    topic_question_ref: pkg.topic_question_ref,
    topic_question_contract_ref: pkg.topic_question_contract_ref,
    answerability_plan_ref: pkg.answerability_plan_ref,
    research_slice_ref: pkg.research_slice_ref,
    validated_need_refs: pkg.validated_need_refs,
    evidence_refs: pkg.evidence_refs,
    accepted_risk_refs: pkg.accepted_risk_refs,
    blocker_refs: pkg.blocker_refs,
    memory_suggestion_refs: pkg.memory_suggestion_refs,
    recheck_request_refs: pkg.recheck_request_refs,
    readiness_check_refs: [
      ref('package_trace_boundary_check', 'package_trace_boundary_check_001'),
      ref('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    ],
    package_snapshot: pkg,
    package_draft_input_snapshot: {
      value_disposition_decision_ref: pkg.value_disposition_decision_ref,
      topic_value_assessment_ref: pkg.topic_value_assessment_ref,
      value_reasoning_memo_ref: pkg.value_reasoning_memo_ref,
      topic_question_ref: pkg.topic_question_ref,
      topic_question_contract_ref: pkg.topic_question_contract_ref,
      answerability_plan_ref: pkg.answerability_plan_ref,
      research_slice_ref: pkg.research_slice_ref,
      validated_need_refs: pkg.validated_need_refs,
      evidence_refs: pkg.evidence_refs,
      accepted_risk_refs: pkg.accepted_risk_refs,
      memory_suggestion_refs: pkg.memory_suggestion_refs,
      recheck_request_refs: pkg.recheck_request_refs,
      boundary_refs: [],
      assumption_refs: [],
      falsification_conditions: [],
      topic_value_assessment: {} as never,
      value_reasoning_memo: {} as never,
      value_disposition_decision: {} as never,
      question_contract: {} as never,
      answerability_plan: {} as never,
      research_slice_snapshot: {},
    },
    bundle_hash: '',
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: pkg.artifact_refs,
    created_at: NOW,
    ...overrides,
  };
  return {
    ...bundle,
    bundle_hash: overrides.bundle_hash ?? expectedBundleHash(bundle),
  };
}

class StubTopicPackageRepository implements TopicSelectionV1bTopicPackageRepository {
  readonly packages = new Map<string, TopicSelectionTopicPackageRecord>();
  readonly checks = new Map<string, TopicSelectionPackageTraceBoundaryCheckRecord>();
  readonly readiness = new Map<string, TopicSelectionTopicPackageReadinessAssessmentRecord>();
  readonly bundles = new Map<string, TopicSelectionV1bToV1cInputBundleRecord>();
  latestBundleByPackageId = new Map<string, string>();

  constructor(input: {
    pkg?: TopicSelectionTopicPackageRecord;
    check?: TopicSelectionPackageTraceBoundaryCheckRecord;
    readiness?: TopicSelectionTopicPackageReadinessAssessmentRecord;
    bundle?: TopicSelectionV1bToV1cInputBundleRecord;
  } = {}) {
    const pkg = input.pkg ?? makePackage();
    const check = input.check ?? makeTraceCheck();
    const readiness = input.readiness ?? makeReadiness();
    const bundle = input.bundle ?? makeBundle();
    this.packages.set(pkg.topic_package_id, pkg);
    this.checks.set(check.package_trace_boundary_check_id, check);
    this.readiness.set(readiness.package_readiness_assessment_id, readiness);
    this.bundles.set(bundle.v1b_to_v1c_input_bundle_id, bundle);
    this.latestBundleByPackageId.set(bundle.topic_package_id, bundle.v1b_to_v1c_input_bundle_id);
  }

  async createDraftPackage(
    _persistence: TopicSelectionV1bTopicPackagePersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    throw new Error('not implemented in test stub');
  }

  async createDraftPackageAuthority(
    _persistence: TopicSelectionV1bTopicPackageAuthorityPersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    throw new Error('not implemented in test stub');
  }

  async findPackageById(topicPackageId: string): Promise<TopicSelectionTopicPackageRecord | null> {
    return this.packages.get(topicPackageId) ?? null;
  }

  async listPackagesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicPackageRecord[]> {
    return [...this.packages.values()].filter((pkg) => pkg.title_card_id === titleCardId);
  }

  async findPackageByValueDispositionDecisionId(
    _valueDispositionDecisionId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    return null;
  }

  async findTraceBoundaryCheckById(
    traceBoundaryCheckId: string,
  ): Promise<TopicSelectionPackageTraceBoundaryCheckRecord | null> {
    return this.checks.get(traceBoundaryCheckId) ?? null;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionTopicPackageReadinessAssessmentRecord | null> {
    return this.readiness.get(readinessAssessmentId) ?? null;
  }

  async findV1cInputBundleById(
    v1bToV1cInputBundleId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    return this.bundles.get(v1bToV1cInputBundleId) ?? null;
  }

  async findV1cInputBundleByPackageId(
    topicPackageId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    const id = this.latestBundleByPackageId.get(topicPackageId);
    return id ? this.bundles.get(id) ?? null : null;
  }
}

function makeSubject(input: ConstructorParameters<typeof StubTopicPackageRepository>[0] = {}) {
  const topicPackageRepository = new StubTopicPackageRepository(input);
  const repository = new InMemoryTopicSelectionV1cPromotionInputRepository();
  const service = new TopicSelectionV1cPromotionInputService({
    repository,
    topicPackageRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { service, repository, topicPackageRepository };
}

test('ready current v1b bundle creates ready promotion input snapshot and handoff', async () => {
  const { service, repository } = makeSubject();

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });
  const stored = await repository.findSnapshotByBundleId('v1b_to_v1c_input_bundle_001');
  const handoff = await service.getPromotionInputHandoff(snapshot.promotion_input_snapshot_id);

  assert.equal(snapshot.closure_status, 'ready_for_gate');
  assert.equal(stored?.promotion_input_snapshot_id, snapshot.promotion_input_snapshot_id);
  assert.equal(handoff.closure_status, 'ready_for_gate');
  assert.deepEqual(snapshot.accepted_risk_refs, [ref('accepted_risk', 'accepted_risk_001')]);
  assert.deepEqual(snapshot.risk_finding_refs, [
    ref('artifact_ref', 'risk_finding_001', TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION),
  ]);
  assert.deepEqual(handoff.risk_finding_refs, snapshot.risk_finding_refs);
  assert.equal(
    snapshot.warnings.some((warning) => warning.code === 'material_risk_findings_carried_forward'),
    true,
  );
  assert.deepEqual(snapshot.memory_suggestion_refs, [ref('memory_suggestion', 'memory_suggestion_001')]);
  assert.deepEqual(snapshot.recheck_request_refs, [ref('recheck_request', 'recheck_request_001')]);
  assert.equal(snapshot.workflow_run_id, 'workflow_run_001');
  assert.equal(snapshot.trace_snapshot_id, 'trace_snapshot_001');
});

test('same current bundle and hash returns existing snapshot idempotently', async () => {
  const { service } = makeSubject();

  const first = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });
  const second = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(second.promotion_input_snapshot_id, first.promotion_input_snapshot_id);
  assert.equal(second.promotion_input_snapshot_hash, first.promotion_input_snapshot_hash);
});

test('superseded bundle persists superseded snapshot and rejects handoff', async () => {
  const source = makeBundle({
    bundle_status: 'superseded',
  });
  const replacement = makeBundle({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_002',
    bundle_hash: 'bundle_hash_002',
  });
  const { service, topicPackageRepository } = makeSubject({ bundle: source });
  topicPackageRepository.bundles.set(replacement.v1b_to_v1c_input_bundle_id, replacement);
  topicPackageRepository.latestBundleByPackageId.set(source.topic_package_id, replacement.v1b_to_v1c_input_bundle_id);

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: source.v1b_to_v1c_input_bundle_id,
  });

  assert.equal(snapshot.closure_status, 'superseded');
  assert.equal(snapshot.replacement_bundle_ref?.ref_id, replacement.v1b_to_v1c_input_bundle_id);
  await assert.rejects(
    () => service.getPromotionInputHandoff(snapshot.promotion_input_snapshot_id),
    (error) => error instanceof AppError && /not ready for gate handoff/.test(error.message),
  );
});

test('package readiness drift persists needs_upstream_refresh snapshot', async () => {
  const pkg = makePackage({
    package_readiness_status: 'needs_revision',
  });
  const { service } = makeSubject({ pkg });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(snapshot.closure_status, 'needs_upstream_refresh');
  assert.equal(snapshot.stop_condition_code, 'topic_package_not_ready_for_promotion_review');
});

test('package snapshot hash drift persists needs_upstream_refresh snapshot', async () => {
  const pkg = makePackage({
    contribution_summary: 'changed after v1c bundle publication',
  });
  const { service } = makeSubject({ pkg });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(snapshot.closure_status, 'needs_upstream_refresh');
  assert.equal(snapshot.stop_condition_code, 'package_snapshot_hash_drift');
});

test('bundle hash drift persists needs_upstream_refresh snapshot', async () => {
  const bundle = makeBundle({
    bundle_hash: 'stale_bundle_hash',
  });
  const { service } = makeSubject({ bundle });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(snapshot.closure_status, 'needs_upstream_refresh');
  assert.equal(snapshot.stop_condition_code, 'v1b_to_v1c_bundle_hash_drift');
});

test('trace boundary lineage drift persists needs_upstream_refresh snapshot', async () => {
  const check = makeTraceCheck({
    topic_package_id: 'topic_package_other',
  });
  const { service } = makeSubject({ check });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(snapshot.closure_status, 'needs_upstream_refresh');
  assert.equal(snapshot.stop_condition_code, 'package_trace_boundary_check_lineage_drift');
});

test('missing required refs persists blocked snapshot', async () => {
  const bundle = makeBundle({
    readiness_check_refs: [],
  });
  const { service } = makeSubject({ bundle });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(snapshot.closure_status, 'blocked');
  assert.equal(snapshot.stop_condition_code, 'missing_required_refs');
});

test('malformed evidence refs persist blocked snapshot', async () => {
  const bundle = makeBundle({
    evidence_refs: [
      {
        ...makeEvidenceRef(),
        evidence_ref: {} as never,
      },
    ],
  });
  const { service } = makeSubject({ bundle });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });

  assert.equal(snapshot.closure_status, 'blocked');
  assert.equal(snapshot.blockers.some((blocker) => blocker.code === 'malformed_evidence_refs'), true);
});

test('workspace drift is rejected before snapshot creation', async () => {
  const { service, repository } = makeSubject();

  await assert.rejects(
    () => service.createPromotionInputSnapshot({
      v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
      workspace_id: 'workspace_other',
    }),
    (error) => error instanceof AppError && /workspace drifts/.test(error.message),
  );
  assert.equal(await repository.findSnapshotByBundleId('v1b_to_v1c_input_bundle_001'), null);
});

class FakePromotionInputPrismaClient {
  readonly inputSnapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  readonly workflowRuns = new Map<string, TopicSelectionLlmWorkflowRunRecord>();
  readonly artifactRefs = new Map<string, TopicSelectionArtifactRefRecord>();
  readonly gateResults = new Map<string, TopicSelectionReadinessGateResultRecord>();
  readonly transitionAttempts = new Map<string, TopicSelectionChainTransitionAttemptRecord>();
  readonly traceSnapshots = new Map<string, TopicSelectionTraceSnapshotRecord>();
  readonly snapshots = new Map<string, Record<string, unknown>>();
  readonly snapshotIdsByBundleId = new Map<string, string>();

  readonly client: any;

  constructor() {
    this.client = {
      $transaction: async (callback: (tx: any) => Promise<void>) => callback(this.client),
      topicSelectionInputSnapshot: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.inputSnapshots.set(String(data.id), data as unknown as TopicSelectionInputSnapshotRecord);
        return data;
      },
      },
      topicSelectionLlmWorkflowRun: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.workflowRuns.set(String(data.id), data as unknown as TopicSelectionLlmWorkflowRunRecord);
        return data;
      },
      },
      topicSelectionArtifactRef: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.artifactRefs.set(String(data.id), data as unknown as TopicSelectionArtifactRefRecord);
        return data;
      },
      },
      topicSelectionReadinessGateResult: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.gateResults.set(String(data.id), data as unknown as TopicSelectionReadinessGateResultRecord);
        return data;
      },
      },
      topicSelectionChainTransitionAttempt: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.transitionAttempts.set(String(data.id), data as unknown as TopicSelectionChainTransitionAttemptRecord);
        return data;
      },
      },
      topicSelectionTraceSnapshot: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.traceSnapshots.set(String(data.id), data as unknown as TopicSelectionTraceSnapshotRecord);
        return data;
      },
      },
      topicSelectionPromotionInputSnapshot: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const id = String(data.id);
        const bundleId = String(data.v1bToV1cInputBundleId);
        if (this.snapshotIdsByBundleId.has(bundleId)) {
          throw new Prisma.PrismaClientKnownRequestError('duplicate bundle id', {
            clientVersion: 'test',
            code: 'P2002',
            meta: { target: ['v1bToV1cInputBundleId'] },
          });
        }
        this.snapshots.set(id, data);
        this.snapshotIdsByBundleId.set(bundleId, id);
        return data;
      },
      findUnique: async ({ where }: { where: { id?: string; v1bToV1cInputBundleId?: string } }) => {
        if (where.id) return this.snapshots.get(where.id) ?? null;
        if (where.v1bToV1cInputBundleId) {
          const id = this.snapshotIdsByBundleId.get(where.v1bToV1cInputBundleId);
          return id ? this.snapshots.get(id) ?? null : null;
        }
        return null;
      },
      findFirst: async ({ where }: { where: { id?: string; closureStatus?: string } }) => {
        const row = where.id ? this.snapshots.get(where.id) : null;
        if (!row) return null;
        return row.closureStatus === where.closureStatus ? row : null;
      },
      },
    };
  }
}

function makeControlPlaneForSnapshot(
  snapshot: Awaited<ReturnType<TopicSelectionV1cPromotionInputService['createPromotionInputSnapshot']>>,
  suffix: string,
) {
  return {
    input_snapshot: {
      input_snapshot_id: `input_snapshot_${suffix}`,
      workspace_id: snapshot.workspace_id,
      title_card_id: snapshot.title_card_id,
      target_ref: snapshot.promotion_input_snapshot_ref,
      context_policy_version_id: null,
      policy_version: null,
      snapshot_hash: `input_snapshot_hash_${suffix}`,
      source_refs: [snapshot.source_bundle_ref],
      permission_refs: [],
      payload: {},
      created_by: 'system' as const,
      created_at: NOW,
    },
    workflow_run: {
      workflow_run_id: `workflow_run_${suffix}`,
      workspace_id: snapshot.workspace_id,
      title_card_id: snapshot.title_card_id,
      workflow_key: 'topic-selection.v1c-create-promotion-input-snapshot',
      workflow_profile_key: 'deterministic-promotion-input-snapshot',
      workflow_profile_version: null,
      input_snapshot_id: `input_snapshot_${suffix}`,
      status: 'succeeded' as const,
      provider_id: null,
      model_id: null,
      prompt_template_id: null,
      prompt_template_version: null,
      started_at: NOW,
      finished_at: NOW,
      telemetry: {},
      output_summary: {},
      error_code: null,
      error_message: null,
      created_by: 'system' as const,
    },
    artifact_refs: [],
    readiness_gate_result: {
      readiness_gate_result_id: `gate_result_${suffix}`,
      workspace_id: snapshot.workspace_id,
      title_card_id: snapshot.title_card_id,
      gate_key: 'topic-selection.v1c-promotion-input-snapshot-readiness',
      target_ref: snapshot.promotion_input_snapshot_ref,
      input_snapshot_id: `input_snapshot_${suffix}`,
      workflow_run_id: `workflow_run_${suffix}`,
      policy_version_id: null,
      verdict: 'pass' as const,
      blockers: [],
      warnings: [],
      required_actions: [],
      loopback_target: null,
      accepted_risk_refs: snapshot.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: 'system' as const,
      created_at: NOW,
    },
    transition_attempt: {
      chain_transition_attempt_id: `transition_attempt_${suffix}`,
      workspace_id: snapshot.workspace_id,
      title_card_id: snapshot.title_card_id,
      transition_key: 'v1c-v1b-input-bundle-to-promotion-input-snapshot',
      source_ref: snapshot.source_bundle_ref,
      target_ref: snapshot.promotion_input_snapshot_ref,
      gate_result_id: `gate_result_${suffix}`,
      workflow_run_id: `workflow_run_${suffix}`,
      input_snapshot_id: `input_snapshot_${suffix}`,
      policy_version_id: null,
      actor: { actor_type: 'system' as const },
      result: 'passed' as const,
      reason: 'duplicate test',
      required_actions: [],
      blockers: [],
      accepted_risk_refs: snapshot.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: [snapshot.promotion_input_snapshot_ref],
      created_at: NOW,
    },
    trace_snapshot: {
      trace_snapshot_id: `trace_snapshot_${suffix}`,
      workspace_id: snapshot.workspace_id,
      title_card_id: snapshot.title_card_id,
      target_ref: snapshot.promotion_input_snapshot_ref,
      snapshot_hash: `trace_snapshot_hash_${suffix}`,
      object_refs: [snapshot.promotion_input_snapshot_ref, snapshot.source_bundle_ref],
      lineage_link_refs: [],
      artifact_refs: [],
      quality_signal_refs: [],
      transition_attempt_refs: [ref('chain_transition_attempt', `transition_attempt_${suffix}`)],
      payload: {},
      created_by: 'system' as const,
      created_at: NOW,
    },
  };
}

test('Prisma repository round-trips promotion input snapshot and returns existing row on bundle uniqueness conflict', async () => {
  const fakePrisma = new FakePromotionInputPrismaClient();
  const repository = new PrismaTopicSelectionV1cPromotionInputRepository(fakePrisma.client as never);
  const topicPackageRepository = new StubTopicPackageRepository();
  const service = new TopicSelectionV1cPromotionInputService({
    repository,
    topicPackageRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const snapshot = await service.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
  });
  const byId = await repository.findSnapshotById(snapshot.promotion_input_snapshot_id);
  const byBundle = await repository.findSnapshotByBundleId('v1b_to_v1c_input_bundle_001');
  const ready = await repository.findReadySnapshotById(snapshot.promotion_input_snapshot_id);

  assert.equal(byId?.promotion_input_snapshot_id, snapshot.promotion_input_snapshot_id);
  assert.equal(byBundle?.promotion_input_snapshot_id, snapshot.promotion_input_snapshot_id);
  assert.equal(ready?.closure_status, 'ready_for_gate');
  assert.equal(fakePrisma.inputSnapshots.size, 1);
  const duplicate = await repository.createSnapshot({
    promotion_input_snapshot: {
      ...snapshot,
      promotion_input_snapshot_id: 'promotion_input_snapshot_duplicate',
    },
    control_plane: makeControlPlaneForSnapshot(snapshot, 'duplicate'),
  });
  assert.equal(duplicate.promotion_input_snapshot_id, snapshot.promotion_input_snapshot_id);
});

test('Prisma migration adds promotion input snapshot table and unique bundle guard', async () => {
  const migration = await fs.readFile(
    new URL('../../../../prisma/migrations/20260515100000_add_topic_selection_v1c_promotion_input_snapshot/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /CREATE TABLE "TopicSelectionPromotionInputSnapshot"/);
  assert.match(migration, /CREATE UNIQUE INDEX "TopicSelectionPromotionInputSnapshot_v1bToV1cInputBundleId_key"/);
  assert.match(migration, /"promotionInputSnapshotHash" TEXT NOT NULL/);
});
