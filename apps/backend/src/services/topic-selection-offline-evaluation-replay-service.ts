import crypto from 'node:crypto';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS,
  createTopicSelectionOfflineFrozenInputBundle,
  type TopicSelectionOfflineEvaluationCaseRecord,
  type TopicSelectionOfflineEvaluationCaseResultRecord,
  type TopicSelectionOfflineEvaluationCaseType,
  type TopicSelectionOfflineEvaluationDatasetRecord,
  type TopicSelectionOfflineEvaluationDatasetSource,
  type TopicSelectionOfflineEvaluationGoldExpectation,
  type TopicSelectionOfflineEvaluationMetricKey,
  type TopicSelectionOfflineEvaluationMetricResultRecord,
  type TopicSelectionOfflineEvaluationObservedOutput,
  type TopicSelectionOfflineEvaluationStage,
  type TopicSelectionOfflineEvaluationRunRecord,
  type TopicSelectionReplayDiffDimension,
  type TopicSelectionReplayDiffRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionOfflineEvaluationReplayRepository } from '../repositories/topic-selection-offline-evaluation-replay.repository.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
};

type CreateDatasetInput = {
  workspace_id?: string | null;
  dataset_key?: string;
  dataset_version?: string;
  stage?: TopicSelectionOfflineEvaluationStage;
  source?: TopicSelectionOfflineEvaluationDatasetSource;
  status?: TopicSelectionOfflineEvaluationDatasetRecord['status'];
  description?: string | null;
  payload?: Record<string, unknown>;
  created_by?: TopicSelectionOfflineEvaluationDatasetRecord['created_by'];
};

type AddCaseInput = {
  workspace_id?: string | null;
  dataset_id: string;
  title_card_id?: string | null;
  case_key: string;
  case_type: TopicSelectionOfflineEvaluationCaseType;
  frozen_input_bundle: TopicSelectionOfflineEvaluationCaseRecord['frozen_input_bundle'];
  gold_expectation: TopicSelectionOfflineEvaluationGoldExpectation;
  tags?: string[];
};

type StartRunInput = {
  workspace_id?: string | null;
  dataset_id: string;
  run_key?: string;
  workflow_profile_key: string;
  workflow_profile_version?: string | null;
  model_profile_key?: string | null;
  search_profile_key?: string | null;
  policy_version_id?: string | null;
  metric_keys?: TopicSelectionOfflineEvaluationMetricKey[];
  run_payload?: Record<string, unknown>;
  created_by?: TopicSelectionOfflineEvaluationRunRecord['created_by'];
};

type SyntheticCaseSpec = {
  case_key: string;
  case_type: TopicSelectionOfflineEvaluationCaseType;
  tags: string[];
  gold: TopicSelectionOfflineEvaluationGoldExpectation;
  observed: TopicSelectionOfflineEvaluationObservedOutput;
};

type MetricComputation = {
  numerator: number;
  denominator: number;
  contributing_case_refs: TopicSelectionFunctionalRef[];
  failure_case_refs: TopicSelectionFunctionalRef[];
  notes: string[];
  metric_payload: Record<string, unknown>;
};

export class TopicSelectionOfflineEvaluationReplayService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(
    private readonly repository: TopicSelectionOfflineEvaluationReplayRepository,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createDataset(input: CreateDatasetInput = {}): Promise<TopicSelectionOfflineEvaluationDatasetRecord> {
    if ((input.stage ?? 'v1a') === 'research_arena') {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Research-arena datasets must be created by the dedicated Arena calibration owner.',
      );
    }
    return this.createDatasetOwned(input);
  }

  async createDatasetForStage(
    input: CreateDatasetInput,
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionOfflineEvaluationDatasetRecord> {
    if (input.stage !== undefined && input.stage !== stage) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Offline evaluation dataset stage must be ${stage}.`);
    }
    return this.createDatasetOwned({ ...input, stage });
  }

  private async createDatasetOwned(input: CreateDatasetInput): Promise<TopicSelectionOfflineEvaluationDatasetRecord> {
    const now = this.now();
    const record: TopicSelectionOfflineEvaluationDatasetRecord = {
      offline_evaluation_dataset_id: this.idFactory('offline_eval_dataset'),
      workspace_id: input.workspace_id ?? null,
      dataset_key: input.dataset_key ?? 'topic-selection-v1a-synthetic-baseline',
      dataset_version: input.dataset_version ?? 'v1',
      stage: input.stage ?? 'v1a',
      source: input.source ?? 'synthetic_fixture',
      status: input.status ?? 'draft',
      description: input.description ?? null,
      case_count: 0,
      case_type_coverage: [],
      payload: input.payload ?? {},
      created_by: input.created_by ?? 'system',
      created_at: now,
      updated_at: now,
    };
    return this.repository.createDataset(record);
  }

  async createSyntheticV1aBaselineDataset(input: CreateDatasetInput = {}): Promise<{
    dataset: TopicSelectionOfflineEvaluationDatasetRecord;
    cases: TopicSelectionOfflineEvaluationCaseRecord[];
  }> {
    const dataset = await this.createDataset({
      ...input,
      stage: 'v1a',
      source: 'synthetic_fixture',
      status: input.status ?? 'active',
      description: input.description ?? 'Synthetic v1a offline evaluation baseline covering required case types.',
      payload: {
        fixture_family: 'topic-selection-v1a-minimum',
        replay_mode: 'frozen_snapshot_evaluation',
        ...(input.payload ?? {}),
      },
    });
    const specs = this.syntheticCaseSpecs(this.now());
    for (const spec of specs) {
      await this.addCase({
        workspace_id: input.workspace_id ?? null,
        dataset_id: dataset.offline_evaluation_dataset_id,
        title_card_id: `title_card_${spec.case_key}`,
        case_key: spec.case_key,
        case_type: spec.case_type,
        tags: spec.tags,
        gold_expectation: spec.gold,
        frozen_input_bundle: createTopicSelectionOfflineFrozenInputBundle({
          frozen_at: this.now(),
          source_refs: this.uniqueRefs([
            ...spec.gold.expected_key_evidence_refs,
            ...spec.gold.expected_counter_evidence_refs,
            ...spec.gold.required_trace_refs,
            ...spec.gold.expected_recheck_action_refs,
            ...spec.gold.expected_negative_memory_refs,
          ]),
          stage_snapshots: {
            control_plane: { fixture_case_key: spec.case_key },
            search_resource: { fixture_case_key: spec.case_key },
            evidence_map: { fixture_case_key: spec.case_key },
            need_validation: { fixture_case_key: spec.case_key },
            recheck_risk_memory: { fixture_case_key: spec.case_key },
            downstream_feedback: { causes: spec.gold.expected_downstream_rework_causes },
          },
          payload: {
            fixture_observed_output: spec.observed,
          },
        }),
      });
    }

    return {
      dataset: await this.requireDataset(dataset.offline_evaluation_dataset_id),
      cases: await this.repository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id),
    };
  }

  async createSyntheticV1bBaselineDataset(input: CreateDatasetInput = {}): Promise<{
    dataset: TopicSelectionOfflineEvaluationDatasetRecord;
    cases: TopicSelectionOfflineEvaluationCaseRecord[];
  }> {
    const dataset = await this.createDataset({
      ...input,
      dataset_key: input.dataset_key ?? 'topic-selection-v1b-synthetic-baseline',
      stage: 'v1b',
      source: 'synthetic_fixture',
      status: input.status ?? 'active',
      description: input.description ?? 'Synthetic v1b offline evaluation baseline covering need-to-draft-topic quality risks.',
      payload: {
        fixture_family: 'topic-selection-v1b-minimum',
        replay_mode: 'frozen_snapshot_evaluation',
        ...(input.payload ?? {}),
      },
    });
    const specs = this.syntheticV1bCaseSpecs(this.now());
    for (const spec of specs) {
      await this.addCase({
        workspace_id: input.workspace_id ?? null,
        dataset_id: dataset.offline_evaluation_dataset_id,
        title_card_id: `title_card_${spec.case_key}`,
        case_key: spec.case_key,
        case_type: spec.case_type,
        tags: spec.tags,
        gold_expectation: spec.gold,
        frozen_input_bundle: createTopicSelectionOfflineFrozenInputBundle({
          stage: 'v1b',
          frozen_at: this.now(),
          source_refs: this.uniqueRefs([
            ...spec.gold.required_trace_refs,
            ...(spec.gold.required_package_trace_refs ?? []),
          ]),
          stage_snapshots: {
            v1b_intake: { fixture_case_key: spec.case_key },
            research_slice: { fixture_case_key: spec.case_key },
            topic_question_contract: { fixture_case_key: spec.case_key },
            topic_value_assessment: { fixture_case_key: spec.case_key },
            topic_package: { fixture_case_key: spec.case_key },
            v1c_input_bundle: { fixture_case_key: spec.case_key },
            downstream_feedback: { causes: spec.gold.expected_downstream_loopback_causes ?? [] },
          },
          payload: {
            fixture_observed_output: spec.observed,
          },
        }),
      });
    }

    return {
      dataset: await this.requireDataset(dataset.offline_evaluation_dataset_id),
      cases: await this.repository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id),
    };
  }

  async createSyntheticV1cBaselineDataset(input: CreateDatasetInput = {}): Promise<{
    dataset: TopicSelectionOfflineEvaluationDatasetRecord;
    cases: TopicSelectionOfflineEvaluationCaseRecord[];
  }> {
    const dataset = await this.createDataset({
      ...input,
      dataset_key: input.dataset_key ?? 'topic-selection-v1c-synthetic-baseline',
      stage: 'v1c',
      source: 'synthetic_fixture',
      status: input.status ?? 'active',
      description: input.description ?? 'Synthetic v1c offline evaluation baseline covering promotion and bridge quality risks.',
      payload: {
        fixture_family: 'topic-selection-v1c-minimum',
        replay_mode: 'frozen_snapshot_evaluation',
        ...(input.payload ?? {}),
      },
    });
    const specs = this.syntheticV1cCaseSpecs(this.now());
    for (const spec of specs) {
      await this.addCase({
        workspace_id: input.workspace_id ?? null,
        dataset_id: dataset.offline_evaluation_dataset_id,
        title_card_id: `title_card_${spec.case_key}`,
        case_key: spec.case_key,
        case_type: spec.case_type,
        tags: spec.tags,
        gold_expectation: spec.gold,
        frozen_input_bundle: createTopicSelectionOfflineFrozenInputBundle({
          stage: 'v1c',
          frozen_at: this.now(),
          source_refs: this.uniqueRefs([
            ...spec.gold.required_trace_refs,
            ...(spec.gold.required_package_trace_refs ?? []),
            ...(spec.gold.required_bridge_trace_refs ?? []),
            ...spec.gold.expected_recheck_action_refs,
          ]),
          stage_snapshots: {
            promotion_input_snapshot: { fixture_case_key: spec.case_key },
            promotion_decision_support: { fixture_case_key: spec.case_key },
            promotion_dossier: { fixture_case_key: spec.case_key },
            promotion_gate_check: { fixture_case_key: spec.case_key },
            argument_readiness_mini_check: { fixture_case_key: spec.case_key },
            human_promotion_decision: { fixture_case_key: spec.case_key },
            promotion_decision: { fixture_case_key: spec.case_key },
            promotion_commitment_profile: { fixture_case_key: spec.case_key },
            paper_project_bridge: { fixture_case_key: spec.case_key },
            downstream_feedback: {
              loopback_target: spec.gold.expected_loopback_target ?? null,
              loopback_cause: spec.gold.expected_loopback_cause ?? null,
            },
            downstream_recheck: { fixture_case_key: spec.case_key },
          },
          payload: {
            fixture_observed_output: spec.observed,
          },
        }),
      });
    }

    return {
      dataset: await this.requireDataset(dataset.offline_evaluation_dataset_id),
      cases: await this.repository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id),
    };
  }

  async addCase(input: AddCaseInput): Promise<TopicSelectionOfflineEvaluationCaseRecord> {
    const dataset = await this.requireDataset(input.dataset_id);
    this.assertGenericDatasetOwner(dataset);
    return this.addCaseOwned(input, dataset);
  }

  async addCaseForStage(
    input: AddCaseInput,
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionOfflineEvaluationCaseRecord> {
    const dataset = await this.requireDatasetForStage(input.dataset_id, stage);
    return this.addCaseOwned(input, dataset);
  }

  private async addCaseOwned(
    input: AddCaseInput,
    dataset: TopicSelectionOfflineEvaluationDatasetRecord,
  ): Promise<TopicSelectionOfflineEvaluationCaseRecord> {
    this.assertCaseCompatibleWithDataset(dataset, input);
    const now = this.now();
    const record: TopicSelectionOfflineEvaluationCaseRecord = {
      offline_evaluation_case_id: this.idFactory('offline_eval_case'),
      workspace_id: input.workspace_id ?? dataset.workspace_id ?? null,
      dataset_id: dataset.offline_evaluation_dataset_id,
      title_card_id: input.title_card_id ?? null,
      case_key: input.case_key,
      case_type: input.case_type,
      status: 'active',
      frozen_input_bundle: input.frozen_input_bundle,
      gold_expectation: input.gold_expectation,
      tags: input.tags ?? [],
      created_at: now,
      updated_at: now,
    };
    const created = await this.repository.createCase(record);
    const cases = await this.repository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id);
    await this.repository.updateDataset(dataset.offline_evaluation_dataset_id, {
      case_count: cases.length,
      case_type_coverage: this.caseTypeCoverage(cases),
      updated_at: now,
    });
    return created;
  }

  async startRun(input: StartRunInput): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const dataset = await this.requireDataset(input.dataset_id);
    this.assertGenericDatasetOwner(dataset);
    return this.startRunOwned(input, dataset);
  }

  private async startRunOwned(
    input: StartRunInput,
    dataset: TopicSelectionOfflineEvaluationDatasetRecord,
  ): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const cases = await this.repository.listCasesByDatasetId(dataset.offline_evaluation_dataset_id);
    const now = this.now();
    const metricKeys = this.uniqueMetricKeys(input.metric_keys ?? this.defaultMetricKeysForStage(dataset.stage));
    if (metricKeys.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Offline evaluation runs require at least one metric key.');
    }
    this.assertMetricKeysCompatibleWithDataset(dataset, metricKeys);
    const record: TopicSelectionOfflineEvaluationRunRecord = {
      offline_evaluation_run_id: this.idFactory('offline_eval_run'),
      workspace_id: input.workspace_id ?? dataset.workspace_id ?? null,
      dataset_id: dataset.offline_evaluation_dataset_id,
      run_key: input.run_key ?? `${dataset.dataset_key}:${dataset.dataset_version}:${now}`,
      status: 'running',
      workflow_profile_key: input.workflow_profile_key,
      workflow_profile_version: input.workflow_profile_version ?? null,
      model_profile_key: input.model_profile_key ?? null,
      search_profile_key: input.search_profile_key ?? null,
      policy_version_id: input.policy_version_id ?? null,
      metric_keys: metricKeys,
      case_count: cases.length,
      run_payload: {
        replay_mode: 'frozen_snapshot_evaluation',
        stage: dataset.stage,
        ...(input.run_payload ?? {}),
      },
      created_by: input.created_by ?? 'system',
      started_at: now,
      finished_at: null,
    };
    return this.repository.createRun(record);
  }

  async startRunForStage(
    input: StartRunInput,
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const dataset = await this.requireDatasetForStage(input.dataset_id, stage);
    return this.startRunOwned(input, dataset);
  }

  async recordFrozenCaseResult(input: {
    workspace_id?: string | null;
    run_id: string;
    case_id: string;
    observed_output: TopicSelectionOfflineEvaluationObservedOutput;
  }): Promise<{
    case_result: TopicSelectionOfflineEvaluationCaseResultRecord;
    replay_diff: TopicSelectionReplayDiffRecord;
  }> {
    const run = await this.requireRun(input.run_id);
    const dataset = await this.requireDataset(run.dataset_id);
    this.assertGenericDatasetOwner(dataset);
    return this.recordFrozenCaseResultOwned(input, run);
  }

  private async recordFrozenCaseResultOwned(
    input: {
      workspace_id?: string | null;
      run_id: string;
      case_id: string;
      observed_output: TopicSelectionOfflineEvaluationObservedOutput;
    },
    run: TopicSelectionOfflineEvaluationRunRecord,
  ): Promise<{
    case_result: TopicSelectionOfflineEvaluationCaseResultRecord;
    replay_diff: TopicSelectionReplayDiffRecord;
  }> {
    if (run.status !== 'running') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Frozen case results can only be recorded for running offline evaluation runs.');
    }
    const evaluationCase = await this.requireCase(input.case_id);
    if (evaluationCase.status !== 'active') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Frozen case results can only be recorded for active offline evaluation cases.');
    }
    if (evaluationCase.dataset_id !== run.dataset_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Case does not belong to the run dataset.');
    }
    const existingResult = await this.repository.findCaseResultByRunAndCaseId(
      run.offline_evaluation_run_id,
      evaluationCase.offline_evaluation_case_id,
    );
    if (existingResult) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Offline evaluation run already has a result for this case.');
    }

    const now = this.now();
    const replayDiff = await this.repository.createReplayDiff(
      this.buildReplayDiff({
        workspace_id: input.workspace_id ?? run.workspace_id ?? evaluationCase.workspace_id ?? null,
        run,
        evaluationCase,
        observed_output: input.observed_output,
        created_at: now,
      }),
    );
    const caseResult = await this.repository.createCaseResult({
      offline_evaluation_case_result_id: this.idFactory('offline_eval_case_result'),
      workspace_id: input.workspace_id ?? run.workspace_id ?? evaluationCase.workspace_id ?? null,
      run_id: run.offline_evaluation_run_id,
      dataset_id: run.dataset_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      case_type: evaluationCase.case_type,
      status: 'evaluated',
      observed_output: input.observed_output,
      replay_diff_ref: this.ref('offline_evaluation_replay_diff', replayDiff.replay_diff_id, evaluationCase.title_card_id),
      metric_contribution_payload: this.caseContributionPayload(evaluationCase, input.observed_output, replayDiff),
      failure_examples: this.failureExamples(evaluationCase, input.observed_output, replayDiff),
      created_at: now,
    });

    return { case_result: caseResult, replay_diff: replayDiff };
  }

  async recordFrozenCaseResultForStage(
    input: Parameters<TopicSelectionOfflineEvaluationReplayService['recordFrozenCaseResult']>[0],
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<{
    case_result: TopicSelectionOfflineEvaluationCaseResultRecord;
    replay_diff: TopicSelectionReplayDiffRecord;
  }> {
    const run = await this.requireRunForStage(input.run_id, stage);
    return this.recordFrozenCaseResultOwned(input, run);
  }

  async completeRunAndCalculateMetrics(input: { run_id: string }): Promise<{
    run: TopicSelectionOfflineEvaluationRunRecord;
    metric_results: TopicSelectionOfflineEvaluationMetricResultRecord[];
  }> {
    const run = await this.requireRun(input.run_id);
    const dataset = await this.requireDataset(run.dataset_id);
    this.assertGenericDatasetOwner(dataset);
    return this.completeRunAndCalculateMetricsOwned(run);
  }

  private async completeRunAndCalculateMetricsOwned(
    run: TopicSelectionOfflineEvaluationRunRecord,
  ): Promise<{
    run: TopicSelectionOfflineEvaluationRunRecord;
    metric_results: TopicSelectionOfflineEvaluationMetricResultRecord[];
  }> {
    const existing = await this.repository.listMetricResultsByRunId(run.offline_evaluation_run_id);
    if (existing.length > 0) {
      const expectedMetricKeys = new Set(run.metric_keys);
      const existingMetricKeys = new Set(existing.map((record) => record.metric_key));
      const hasAllMetrics = run.metric_keys.every((metricKey) => existingMetricKeys.has(metricKey));
      const hasUnexpectedMetrics = existing.some((record) => !expectedMetricKeys.has(record.metric_key));
      if (hasAllMetrics && !hasUnexpectedMetrics && existing.length === run.metric_keys.length) {
        if (run.status === 'completed') {
          return { run, metric_results: existing };
        }
        if (run.status === 'running') {
          const recoveredRun = await this.repository.updateRun(run.offline_evaluation_run_id, {
            status: 'completed',
            finished_at: this.now(),
          });
          return { run: recoveredRun, metric_results: existing };
        }
      }
      throw new AppError(409, 'VERSION_CONFLICT', 'Offline evaluation run already has partial or inconsistent metric results.');
    }
    if (run.status !== 'running') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only running offline evaluation runs can calculate metrics.');
    }

    const cases = (await this.repository.listCasesByDatasetId(run.dataset_id))
      .filter((record) => record.status === 'active');
    if (cases.length === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Offline evaluation run cannot complete without active cases.');
    }
    const caseResults = await this.repository.listCaseResultsByRunId(run.offline_evaluation_run_id);
    const caseIds = new Set(cases.map((record) => record.offline_evaluation_case_id));
    const resultCounts = new Map<string, number>();
    for (const caseResult of caseResults) {
      if (!caseIds.has(caseResult.case_id)) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Offline evaluation run has a case result outside its active dataset cases.');
      }
      resultCounts.set(caseResult.case_id, (resultCounts.get(caseResult.case_id) ?? 0) + 1);
    }
    const missingCaseIds = [...caseIds].filter((caseId) => !resultCounts.has(caseId));
    const duplicateCaseIds = [...resultCounts].filter(([, count]) => count > 1).map(([caseId]) => caseId);
    if (missingCaseIds.length > 0 || duplicateCaseIds.length > 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Offline evaluation run cannot complete before every active case has a result.');
    }

    const resultByCaseId = new Map(caseResults.map((record) => [record.case_id, record]));
    for (const metricKey of run.metric_keys) {
      const computation = this.computeMetric(metricKey, cases, resultByCaseId);
      await this.repository.createMetricResult({
        offline_evaluation_metric_result_id: this.idFactory('offline_eval_metric_result'),
        workspace_id: run.workspace_id ?? null,
        run_id: run.offline_evaluation_run_id,
        dataset_id: run.dataset_id,
        metric_key: metricKey,
        numerator: computation.numerator,
        denominator: computation.denominator,
        value: computation.denominator === 0 ? null : computation.numerator / computation.denominator,
        contributing_case_refs: computation.contributing_case_refs,
        failure_case_refs: computation.failure_case_refs,
        notes: computation.notes,
        metric_payload: computation.metric_payload,
        created_at: this.now(),
      });
    }

    const completedRun = await this.repository.updateRun(run.offline_evaluation_run_id, {
      status: 'completed',
      finished_at: this.now(),
      case_count: cases.length,
    });
    const persisted = await this.repository.listMetricResultsByRunId(run.offline_evaluation_run_id);
    return { run: completedRun, metric_results: persisted };
  }

  async completeRunAndCalculateMetricsForStage(input: {
    run_id: string;
    stage: TopicSelectionOfflineEvaluationStage;
  }): Promise<{
    run: TopicSelectionOfflineEvaluationRunRecord;
    metric_results: TopicSelectionOfflineEvaluationMetricResultRecord[];
  }> {
    const run = await this.requireRunForStage(input.run_id, input.stage);
    return this.completeRunAndCalculateMetricsOwned(run);
  }

  async listMetricResults(runId: string): Promise<TopicSelectionOfflineEvaluationMetricResultRecord[]> {
    return this.repository.listMetricResultsByRunId(runId);
  }

  async listMetricResultsForStage(
    runId: string,
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionOfflineEvaluationMetricResultRecord[]> {
    const run = await this.requireRunForStage(runId, stage);
    return this.repository.listMetricResultsByRunId(run.offline_evaluation_run_id);
  }

  async listReplayDiffs(runId: string): Promise<TopicSelectionReplayDiffRecord[]> {
    return this.repository.listReplayDiffsByRunId(runId);
  }

  async listReplayDiffsForStage(
    runId: string,
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionReplayDiffRecord[]> {
    const run = await this.requireRunForStage(runId, stage);
    return this.repository.listReplayDiffsByRunId(run.offline_evaluation_run_id);
  }

  private async requireDataset(datasetId: string): Promise<TopicSelectionOfflineEvaluationDatasetRecord> {
    const dataset = await this.repository.findDatasetById(datasetId);
    if (!dataset) {
      throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationDataset ${datasetId} not found.`);
    }
    return dataset;
  }

  private async requireDatasetForStage(
    datasetId: string,
    stage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionOfflineEvaluationDatasetRecord> {
    const dataset = await this.requireDataset(datasetId);
    if (dataset.stage !== stage) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `OfflineEvaluationDataset ${datasetId} not found for stage ${stage}.`,
      );
    }
    return dataset;
  }

  private assertGenericDatasetOwner(dataset: TopicSelectionOfflineEvaluationDatasetRecord): void {
    if (dataset.stage === 'research_arena') {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Research-arena evaluation writes belong to the dedicated Arena calibration owner.',
      );
    }
  }

  private async requireCase(caseId: string): Promise<TopicSelectionOfflineEvaluationCaseRecord> {
    const evaluationCase = await this.repository.findCaseById(caseId);
    if (!evaluationCase) {
      throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationCase ${caseId} not found.`);
    }
    return evaluationCase;
  }

  private async requireRun(runId: string): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const run = await this.repository.findRunById(runId);
    if (!run) {
      throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationRun ${runId} not found.`);
    }
    return run;
  }

  private async requireRunForStage(
    runId: string,
    expectedStage: TopicSelectionOfflineEvaluationStage,
  ): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const run = await this.requireRun(runId);
    const dataset = await this.requireDataset(run.dataset_id);
    if (dataset.stage !== expectedStage) {
      throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationRun ${runId} not found for stage ${expectedStage}.`);
    }
    return run;
  }

  private buildReplayDiff(input: {
    workspace_id?: string | null;
    run: TopicSelectionOfflineEvaluationRunRecord;
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord;
    observed_output: TopicSelectionOfflineEvaluationObservedOutput;
    created_at: string;
  }): TopicSelectionReplayDiffRecord {
    const gold = input.evaluationCase.gold_expectation;
    const observed = input.observed_output;
    const finalDecisionChanged = gold.expected_final_decision !== undefined
      && (observed.final_decision ?? null) !== (gold.expected_final_decision ?? null);
    const keyEvidenceSetChanged = !this.sameRefSet(gold.expected_key_evidence_refs, observed.key_evidence_refs);
    const blockerSetChanged = !this.sameStringSet(gold.expected_blocker_codes, observed.blocker_codes);
    const traceVerdictChanged = !this.traceComplete(gold, observed);
    const sliceBoundaryChanged = this.unexpectedSliceBoundaryDriftCodes(input.evaluationCase, observed).length > 0;
    const answerabilityChanged = gold.expected_answerability_passed !== undefined
      && gold.expected_answerability_passed !== null
      && this.observedAnswerabilityPassed(observed) !== gold.expected_answerability_passed;
    const valueClaimChanged = this.unexpectedValueOverclaimCodes(input.evaluationCase, observed).length > 0;
    const packageTraceChanged = this.isV1bCase(input.evaluationCase)
      && !this.packageTraceComplete(gold, observed);
    const packageReadinessChanged = gold.expected_package_ready !== undefined
      && gold.expected_package_ready !== null
      && this.observedPackageReady(observed) !== gold.expected_package_ready;
    const loopbackCauseChanged = this.loopbackCauseChanged(gold, observed);
    const promotionInputCurrentnessChanged = this.promotionInputCurrentnessChanged(gold, observed);
    const promotionGateBlockerChanged = gold.expected_promotion_gate_promote_allowed === false
      && this.observedPromotionGateReady(observed);
    const humanAuthorizationChanged = gold.expected_human_authorized !== undefined
      && gold.expected_human_authorized !== null
      && (observed.human_promotion_authorized ?? null) !== gold.expected_human_authorized;
    const promotionGateChanged = gold.expected_promotion_bridge_eligible !== undefined
      && gold.expected_promotion_bridge_eligible !== null
      && this.observedPromotionBridgeEligible(observed) !== gold.expected_promotion_bridge_eligible;
    const bridgeTraceChanged = this.isV1cCase(input.evaluationCase)
      && !this.bridgeTraceComplete(gold, observed);
    const commitmentProfileChanged = this.isV1cCase(input.evaluationCase)
      && !this.commitmentProfileComplete(gold, observed);
    const loopbackTargetChanged = this.loopbackTargetChanged(gold, observed);
    const downstreamFeedbackChanged = this.downstreamFeedbackChanged(gold, observed);
    const changedDimensions: TopicSelectionReplayDiffDimension[] = [];
    if (finalDecisionChanged) changedDimensions.push('final_decision');
    if (keyEvidenceSetChanged) changedDimensions.push('key_evidence_set');
    if (blockerSetChanged) changedDimensions.push('blocker_set');
    if (traceVerdictChanged) changedDimensions.push('trace_verdict');
    if (sliceBoundaryChanged) changedDimensions.push('slice_boundary');
    if (answerabilityChanged) changedDimensions.push('answerability_verdict');
    if (valueClaimChanged) changedDimensions.push('value_claim');
    if (packageTraceChanged) changedDimensions.push('package_trace');
    if (packageReadinessChanged) changedDimensions.push('package_readiness');
    if (loopbackCauseChanged) changedDimensions.push('loopback_cause');
    if (promotionInputCurrentnessChanged) changedDimensions.push('promotion_input_currentness');
    if (promotionGateBlockerChanged) changedDimensions.push('promotion_gate_blocker');
    if (humanAuthorizationChanged) changedDimensions.push('human_authorization');
    if (promotionGateChanged) changedDimensions.push('promotion_gate');
    if (bridgeTraceChanged) changedDimensions.push('bridge_trace');
    if (commitmentProfileChanged) changedDimensions.push('commitment_profile');
    if (loopbackTargetChanged) changedDimensions.push('loopback_target');
    if (downstreamFeedbackChanged) changedDimensions.push('downstream_feedback');

    return {
      replay_diff_id: this.idFactory('replay_diff'),
      workspace_id: input.workspace_id ?? null,
      run_id: input.run.offline_evaluation_run_id,
      dataset_id: input.run.dataset_id,
      case_id: input.evaluationCase.offline_evaluation_case_id,
      status: changedDimensions.length === 0 ? 'match' : 'mismatch',
      changed_dimensions: changedDimensions,
      final_decision_changed: finalDecisionChanged,
      key_evidence_set_changed: keyEvidenceSetChanged,
      blocker_set_changed: blockerSetChanged,
      trace_verdict_changed: traceVerdictChanged,
      expected_snapshot: {
        expected_final_decision: gold.expected_final_decision ?? null,
        expected_key_evidence_refs: gold.expected_key_evidence_refs,
        expected_blocker_codes: gold.expected_blocker_codes,
        expected_trace_verdict: gold.expected_trace_verdict ?? null,
        required_trace_refs: gold.required_trace_refs,
        allowed_slice_boundary_drift_codes: gold.allowed_slice_boundary_drift_codes ?? [],
        expected_answerability_passed: gold.expected_answerability_passed ?? null,
        allowed_value_overclaim_codes: gold.allowed_value_overclaim_codes ?? [],
        required_package_trace_refs: gold.required_package_trace_refs ?? [],
        expected_package_ready: gold.expected_package_ready ?? null,
        expected_package_readiness_status: gold.expected_package_readiness_status ?? null,
        expected_downstream_loopback_causes: gold.expected_downstream_loopback_causes ?? [],
        expected_promotion_input_current: gold.expected_promotion_input_current ?? null,
        expected_promotion_input_closure_status: gold.expected_promotion_input_closure_status ?? null,
        expected_promotion_gate_disposition: gold.expected_promotion_gate_disposition ?? null,
        expected_promotion_gate_promote_allowed: gold.expected_promotion_gate_promote_allowed ?? null,
        expected_human_authorized: gold.expected_human_authorized ?? null,
        expected_promotion_bridge_eligible: gold.expected_promotion_bridge_eligible ?? null,
        required_bridge_trace_refs: gold.required_bridge_trace_refs ?? [],
        required_commitment_profile_fields: gold.required_commitment_profile_fields ?? [],
        expected_loopback_target: gold.expected_loopback_target ?? null,
        expected_loopback_cause: gold.expected_loopback_cause ?? null,
        expected_downstream_mutation_blocked: gold.expected_downstream_mutation_blocked ?? null,
      },
      observed_snapshot: observed,
      baseline_snapshot: observed.baseline_observed_output ?? null,
      diff_payload: {
        changed_dimensions: changedDimensions,
        case_key: input.evaluationCase.case_key,
        case_type: input.evaluationCase.case_type,
        unexpected_slice_boundary_drift_codes: this.unexpectedSliceBoundaryDriftCodes(input.evaluationCase, observed),
        unexpected_value_overclaim_codes: this.unexpectedValueOverclaimCodes(input.evaluationCase, observed),
        package_trace_complete: this.packageTraceComplete(gold, observed),
        bridge_trace_complete: this.bridgeTraceComplete(gold, observed),
        commitment_profile_complete: this.commitmentProfileComplete(gold, observed),
        observed_package_readiness_passed: this.observedPackageReady(observed),
        observed_promotion_gate_ready: this.observedPromotionGateReady(observed),
        observed_promotion_bridge_eligible: this.observedPromotionBridgeEligible(observed),
        observed_answerability_passed: this.observedAnswerabilityPassed(observed),
        observed_downstream_loopback_causes: observed.downstream_loopback_causes ?? [],
        observed_loopback_target: observed.loopback_target ?? null,
        observed_loopback_cause: observed.loopback_cause ?? null,
        downstream_mutation_attempted: observed.downstream_mutation_attempted ?? null,
        downstream_mutation_blocked: observed.downstream_mutation_blocked ?? null,
      },
      created_at: input.created_at,
    };
  }

  private computeMetric(
    metricKey: TopicSelectionOfflineEvaluationMetricKey,
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
  ): MetricComputation {
    switch (metricKey) {
      case 'false_gap_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => !record.gold_expectation.expected_unmet_need),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedSuggestsValidatedNeed(observed),
          'Non-unmet-need cases that replay advanced as validate/ready.',
        );
      case 'baseline_miss_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) =>
            record.case_type === 'strong_baseline_solved' || record.gold_expectation.expected_baseline_solved === true),
          resultByCaseId,
          (evaluationCase, observed) =>
            !this.includesEveryString(observed.blocker_codes, evaluationCase.gold_expectation.expected_blocker_codes)
            || this.observedSuggestsValidatedNeed(observed),
          'Strong-baseline-solved cases missing expected baseline blockers.',
        );
      case 'counter_evidence_recall':
        return this.computeRefRecallMetric(
          cases,
          resultByCaseId,
          (evaluationCase) => evaluationCase.gold_expectation.expected_counter_evidence_refs,
          (observed) => observed.counter_evidence_refs,
          'Expected counter-evidence refs recovered by frozen replay.',
        );
      case 'trace_completeness':
        return this.computeCaseRateMetric(
          cases,
          resultByCaseId,
          (evaluationCase, observed) => this.traceComplete(evaluationCase.gold_expectation, observed),
          'Cases with required trace refs and expected trace verdict present.',
          { predicate_indicates_failure: false },
        );
      case 'readiness_false_pass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_readiness_passed === false),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedSuggestsValidatedNeed(observed),
          'Gold-blocked readiness cases that replay passed as ready/validate.',
        );
      case 'human_override_rate':
        return this.computeCaseRateMetric(
          cases,
          resultByCaseId,
          (_evaluationCase, observed) => observed.human_override_refs.length > 0,
          'Cases containing human override refs in observed frozen output.',
        );
      case 'rerun_instability':
        return this.computeCaseRateMetric(
          cases.filter((record) => resultByCaseId.get(record.offline_evaluation_case_id)?.observed_output.baseline_observed_output),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedOutputChangedFromBaseline(observed),
          'Cases where repeated replay changed final decision, key evidence, blockers, or trace verdict.',
        );
      case 'recheck_precision':
        return this.computeRefPrecisionMetric(
          cases,
          resultByCaseId,
          (evaluationCase) => evaluationCase.gold_expectation.expected_recheck_action_refs,
          (observed) => observed.recheck_action_refs,
          'Observed recheck actions that match expected recheck actions.',
        );
      case 'negative_memory_usefulness':
        return this.computeNegativeMemoryUsefulness(cases, resultByCaseId);
      case 'downstream_rework_cause':
        return this.computeDownstreamReworkCause(cases, resultByCaseId);
      case 'slice_boundary_drift_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => this.isV1bCase(record)),
          resultByCaseId,
          (evaluationCase, observed) => this.unexpectedSliceBoundaryDriftCodes(evaluationCase, observed).length > 0,
          'v1b cases where observed ResearchSlice boundary drift exceeds allowed drift codes.',
        );
      case 'answerability_false_pass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_answerability_passed === false),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedAnswerabilityPassed(observed),
          'v1b gold answerability-blocked cases that replay passed answerability.',
        );
      case 'value_overclaim_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => this.isV1bCase(record)),
          resultByCaseId,
          (evaluationCase, observed) => this.unexpectedValueOverclaimCodes(evaluationCase, observed).length > 0,
          'v1b cases where observed value claims exceed allowed overclaim codes.',
        );
      case 'package_trace_completeness':
        return this.computeRefRecallMetric(
          cases.filter((record) => this.isV1bCase(record)),
          resultByCaseId,
          (evaluationCase) => evaluationCase.gold_expectation.required_package_trace_refs ?? [],
          (observed) => observed.package_trace_refs ?? [],
          'Required v1b package trace refs recovered by frozen replay.',
        );
      case 'package_readiness_false_pass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_package_ready === false),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedPackageReady(observed),
          'v1b gold package-blocked cases that replay became promotion-review ready.',
        );
      case 'downstream_loopback_cause_distribution':
        return this.computeDownstreamLoopbackCause(cases, resultByCaseId);
      case 'promotion_input_staleness_false_pass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_promotion_input_current === false),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedPromotionInputReadyForGate(observed),
          'v1c stale or non-current promotion inputs that replay passed as ready_for_gate.',
        );
      case 'promotion_gate_blocker_false_pass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_promotion_gate_promote_allowed === false),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedPromotionGateReady(observed),
          'v1c blocked promotion gates that replay allowed human promotion decision.',
        );
      case 'human_promotion_bypass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => this.isV1cCase(record)),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedPromotedWithoutHumanAuthorization(observed),
          'v1c cases where bridge-eligible promotion appeared without explicit human authorization.',
        );
      case 'promotion_false_pass_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_promotion_bridge_eligible === false),
          resultByCaseId,
          (_evaluationCase, observed) => this.observedPromotionBridgeEligible(observed),
          'v1c gold non-promote cases that replay became bridge eligible.',
        );
      case 'bridge_trace_completeness':
        return this.computeRefRecallMetric(
          cases.filter((record) => this.isV1cCase(record)),
          resultByCaseId,
          (evaluationCase) => evaluationCase.gold_expectation.required_bridge_trace_refs ?? [],
          (observed) => observed.bridge_trace_refs ?? [],
          'Required v1c bridge lineage refs recovered by frozen replay.',
        );
      case 'commitment_profile_completeness':
        return this.computeStringRecallMetric(
          cases.filter((record) => this.isV1cCase(record)),
          resultByCaseId,
          (evaluationCase) => evaluationCase.gold_expectation.required_commitment_profile_fields ?? [],
          (observed) => observed.commitment_profile_fields ?? [],
          'Required v1c commitment profile fields recovered by frozen replay.',
        );
      case 'loopback_target_accuracy':
        return this.computeLoopbackTargetAccuracy(cases, resultByCaseId);
      case 'downstream_mutation_guard_rate':
        return this.computeCaseRateMetric(
          cases.filter((record) => record.gold_expectation.expected_downstream_mutation_blocked !== undefined
            && record.gold_expectation.expected_downstream_mutation_blocked !== null),
          resultByCaseId,
          (_evaluationCase, observed) => observed.downstream_mutation_blocked === true,
          'v1c downstream mutation attempts blocked by replay guard expectations.',
          { predicate_indicates_failure: false },
        );
      case 'arena_evidence_grounding_rate':
      case 'arena_execution_independence_rate':
      case 'arena_replay_integrity_rate':
      case 'arena_human_label_coverage_rate':
      case 'arena_cost_latency_accounting_rate':
      case 'arena_work_avoided_rate':
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Research Arena metrics must be calculated by the canonical-owner calibration service.',
        );
    }
  }

  private computeCaseRateMetric(
    denominatorCases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
    predicate: (
      evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
      observed: TopicSelectionOfflineEvaluationObservedOutput,
    ) => boolean,
    note: string,
    options: { predicate_indicates_failure?: boolean } = {},
  ): MetricComputation {
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    let numerator = 0;
    for (const evaluationCase of denominatorCases) {
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      const caseRef = this.caseRef(evaluationCase);
      contributing.push(caseRef);
      const predicateMatched = predicate(evaluationCase, observed);
      if (predicateMatched) {
        numerator += 1;
      }
      const isFailure = options.predicate_indicates_failure === false ? !predicateMatched : predicateMatched;
      if (isFailure) {
        failures.push(caseRef);
      }
    }
    return {
      numerator,
      denominator: contributing.length,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: [note],
      metric_payload: {},
    };
  }

  private computeRefRecallMetric(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
    expectedRefs: (evaluationCase: TopicSelectionOfflineEvaluationCaseRecord) => TopicSelectionFunctionalRef[],
    observedRefs: (observed: TopicSelectionOfflineEvaluationObservedOutput) => TopicSelectionFunctionalRef[],
    note: string,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    for (const evaluationCase of cases) {
      const expected = expectedRefs(evaluationCase);
      if (expected.length === 0) continue;
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      contributing.push(this.caseRef(evaluationCase));
      const expectedKeys = new Set(expected.map((record) => this.refKey(record)));
      const observedSet = new Set(observedRefs(observed).map((record) => this.refKey(record)));
      const found = [...expectedKeys].filter((record) => observedSet.has(record)).length;
      numerator += found;
      denominator += expectedKeys.size;
      if (found < expectedKeys.size) {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: [note],
      metric_payload: {},
    };
  }

  private computeRefPrecisionMetric(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
    expectedRefs: (evaluationCase: TopicSelectionOfflineEvaluationCaseRecord) => TopicSelectionFunctionalRef[],
    observedRefs: (observed: TopicSelectionOfflineEvaluationObservedOutput) => TopicSelectionFunctionalRef[],
    note: string,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    for (const evaluationCase of cases) {
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      const observedValues = new Map(observedRefs(observed).map((record) => [this.refKey(record), record]));
      if (observedValues.size === 0) continue;
      contributing.push(this.caseRef(evaluationCase));
      const expectedSet = new Set(expectedRefs(evaluationCase).map((record) => this.refKey(record)));
      const matched = [...observedValues.keys()].filter((record) => expectedSet.has(record)).length;
      numerator += matched;
      denominator += observedValues.size;
      if (matched < observedValues.size) {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: [note],
      metric_payload: {},
    };
  }

  private computeStringRecallMetric(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
    expectedValues: (evaluationCase: TopicSelectionOfflineEvaluationCaseRecord) => string[],
    observedValues: (observed: TopicSelectionOfflineEvaluationObservedOutput) => string[],
    note: string,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    for (const evaluationCase of cases) {
      const expected = expectedValues(evaluationCase);
      if (expected.length === 0) continue;
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      contributing.push(this.caseRef(evaluationCase));
      const expectedSet = new Set(expected);
      const observedSet = new Set(observedValues(observed));
      const found = [...expectedSet].filter((record) => observedSet.has(record)).length;
      numerator += found;
      denominator += expectedSet.size;
      if (found < expectedSet.size) {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: [note],
      metric_payload: {},
    };
  }

  private computeNegativeMemoryUsefulness(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    for (const evaluationCase of cases) {
      const expected = evaluationCase.gold_expectation.expected_negative_memory_refs;
      if (expected.length === 0) continue;
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      contributing.push(this.caseRef(evaluationCase));
      const memorySet = new Set(observed.memory_refs.map((record) => this.refKey(record)));
      const memoryAsEvidenceSet = new Set(observed.memory_used_as_evidence_refs.map((record) => this.refKey(record)));
      const expectedKeys = new Set(expected.map((record) => this.refKey(record)));
      let caseFailed = false;
      for (const key of expectedKeys) {
        denominator += 1;
        if (memorySet.has(key) && !memoryAsEvidenceSet.has(key)) {
          numerator += 1;
        } else {
          caseFailed = true;
        }
      }
      if (caseFailed) {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: ['Negative decision memory must be used as constraint/routing context, never evidence.'],
      metric_payload: { evidence_policy: 'not_evidence' },
    };
  }

  private computeDownstreamReworkCause(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    const causeDistribution: Record<string, number> = {};
    for (const evaluationCase of cases) {
      const expected = evaluationCase.gold_expectation.expected_downstream_rework_causes;
      const isDownstreamCase = evaluationCase.case_type === 'downstream_failure_feedback' || expected.length > 0;
      if (!isDownstreamCase) continue;
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      contributing.push(this.caseRef(evaluationCase));
      denominator += 1;
      for (const cause of observed.downstream_rework_causes) {
        causeDistribution[cause] = (causeDistribution[cause] ?? 0) + 1;
      }
      if (observed.downstream_rework_causes.some((cause) => expected.includes(cause))) {
        numerator += 1;
      } else {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: ['Downstream rework cause classification coverage for feedback cases.'],
      metric_payload: { cause_distribution: causeDistribution },
    };
  }

  private computeDownstreamLoopbackCause(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    const causeDistribution: Record<string, number> = {};
    for (const evaluationCase of cases) {
      const expected = evaluationCase.gold_expectation.expected_downstream_loopback_causes ?? [];
      const isDownstreamCase = evaluationCase.case_type === 'downstream_loopback_feedback' || expected.length > 0;
      if (!isDownstreamCase) continue;
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      contributing.push(this.caseRef(evaluationCase));
      denominator += 1;
      for (const cause of observed.downstream_loopback_causes ?? []) {
        causeDistribution[cause] = (causeDistribution[cause] ?? 0) + 1;
      }
      if ((observed.downstream_loopback_causes ?? []).some((cause) => expected.includes(cause))) {
        numerator += 1;
      } else {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: ['v1b downstream loopback cause classification distribution for feedback cases.'],
      metric_payload: { cause_distribution: causeDistribution },
    };
  }

  private computeLoopbackTargetAccuracy(
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    resultByCaseId: Map<string, { observed_output: TopicSelectionOfflineEvaluationObservedOutput }>,
  ): MetricComputation {
    let numerator = 0;
    let denominator = 0;
    const contributing: TopicSelectionFunctionalRef[] = [];
    const failures: TopicSelectionFunctionalRef[] = [];
    const targetDistribution: Record<string, number> = {};
    for (const evaluationCase of cases) {
      const gold = evaluationCase.gold_expectation;
      const hasLoopbackExpectation = gold.expected_loopback_target !== undefined
        && gold.expected_loopback_target !== null;
      if (!hasLoopbackExpectation) continue;
      const observed = resultByCaseId.get(evaluationCase.offline_evaluation_case_id)?.observed_output;
      if (!observed) continue;
      contributing.push(this.caseRef(evaluationCase));
      denominator += 1;
      const target = observed.loopback_target ?? 'none';
      targetDistribution[target] = (targetDistribution[target] ?? 0) + 1;
      if (
        (observed.loopback_target ?? null) === (gold.expected_loopback_target ?? null)
        && (observed.loopback_cause ?? null) === (gold.expected_loopback_cause ?? null)
      ) {
        numerator += 1;
      } else {
        failures.push(this.caseRef(evaluationCase));
      }
    }
    return {
      numerator,
      denominator,
      contributing_case_refs: contributing,
      failure_case_refs: failures,
      notes: ['v1c downstream loopback target and cause accuracy for feedback/recheck snapshots.'],
      metric_payload: { target_distribution: targetDistribution },
    };
  }

  private caseContributionPayload(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
    replayDiff: TopicSelectionReplayDiffRecord,
  ): Record<string, unknown> {
    return {
      false_gap_candidate: !evaluationCase.gold_expectation.expected_unmet_need && this.observedSuggestsValidatedNeed(observed),
      baseline_missed: evaluationCase.gold_expectation.expected_baseline_solved === true
        && !this.includesEveryString(observed.blocker_codes, evaluationCase.gold_expectation.expected_blocker_codes),
      trace_complete: this.traceComplete(evaluationCase.gold_expectation, observed),
      memory_used_as_evidence: observed.memory_used_as_evidence_refs.length > 0,
      slice_boundary_drift: this.unexpectedSliceBoundaryDriftCodes(evaluationCase, observed),
      answerability_false_pass: evaluationCase.gold_expectation.expected_answerability_passed === false
        && this.observedAnswerabilityPassed(observed),
      value_overclaim: this.unexpectedValueOverclaimCodes(evaluationCase, observed),
      package_trace_complete: this.packageTraceComplete(evaluationCase.gold_expectation, observed),
      package_readiness_false_pass: evaluationCase.gold_expectation.expected_package_ready === false
        && this.observedPackageReady(observed),
      downstream_loopback_causes: observed.downstream_loopback_causes ?? [],
      promotion_input_staleness_false_pass: evaluationCase.gold_expectation.expected_promotion_input_current === false
        && this.observedPromotionInputReadyForGate(observed),
      promotion_gate_blocker_false_pass: evaluationCase.gold_expectation.expected_promotion_gate_promote_allowed === false
        && this.observedPromotionGateReady(observed),
      human_promotion_bypass: this.observedPromotedWithoutHumanAuthorization(observed),
      promotion_false_pass: evaluationCase.gold_expectation.expected_promotion_bridge_eligible === false
        && this.observedPromotionBridgeEligible(observed),
      bridge_trace_complete: this.bridgeTraceComplete(evaluationCase.gold_expectation, observed),
      commitment_profile_complete: this.commitmentProfileComplete(evaluationCase.gold_expectation, observed),
      loopback_target: observed.loopback_target ?? null,
      loopback_cause: observed.loopback_cause ?? null,
      downstream_mutation_attempted: observed.downstream_mutation_attempted ?? null,
      downstream_mutation_blocked: observed.downstream_mutation_blocked ?? null,
      replay_diff_status: replayDiff.status,
      changed_dimensions: replayDiff.changed_dimensions,
    };
  }

  private failureExamples(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
    replayDiff: TopicSelectionReplayDiffRecord,
  ): string[] {
    const examples = replayDiff.changed_dimensions.map((dimension) =>
      `${evaluationCase.case_key}:${dimension}`);
    if (observed.memory_used_as_evidence_refs.length > 0) {
      examples.push(`${evaluationCase.case_key}:memory_used_as_evidence`);
    }
    if (!evaluationCase.gold_expectation.expected_unmet_need && this.observedSuggestsValidatedNeed(observed)) {
      examples.push(`${evaluationCase.case_key}:false_gap_candidate`);
    }
    if (this.observedPromotedWithoutHumanAuthorization(observed)) {
      examples.push(`${evaluationCase.case_key}:human_promotion_bypass`);
    }
    if (observed.downstream_mutation_attempted === true && observed.downstream_mutation_blocked !== true) {
      examples.push(`${evaluationCase.case_key}:downstream_mutation_not_blocked`);
    }
    return examples;
  }

  private observedSuggestsValidatedNeed(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    return observed.final_decision === 'validate'
      || observed.readiness_passed === true
      || observed.readiness_recommendation === 'ready_for_validation';
  }

  private observedOutputChangedFromBaseline(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    const baseline = observed.baseline_observed_output;
    if (!baseline) return false;
    return (observed.final_decision ?? null) !== (baseline.final_decision ?? null)
      || !this.sameRefSet(observed.key_evidence_refs, baseline.key_evidence_refs)
      || !this.sameStringSet(observed.blocker_codes, baseline.blocker_codes)
      || (observed.trace_verdict ?? null) !== (baseline.trace_verdict ?? null)
      || !this.sameStringSet(observed.slice_boundary_drift_codes ?? [], baseline.slice_boundary_drift_codes ?? [])
      || (observed.answerability_verdict ?? null) !== (baseline.answerability_verdict ?? null)
      || !this.sameStringSet(observed.value_overclaim_codes ?? [], baseline.value_overclaim_codes ?? [])
      || !this.sameRefSet(observed.package_trace_refs ?? [], baseline.package_trace_refs ?? [])
      || (observed.package_readiness_status ?? null) !== (baseline.package_readiness_status ?? null)
      || !this.sameStringSet(observed.downstream_loopback_causes ?? [], baseline.downstream_loopback_causes ?? [])
      || (observed.promotion_input_closure_status ?? null) !== (baseline.promotion_input_closure_status ?? null)
      || (observed.promotion_gate_disposition ?? null) !== (baseline.promotion_gate_disposition ?? null)
      || (observed.promotion_gate_promote_allowed ?? null) !== (baseline.promotion_gate_promote_allowed ?? null)
      || (observed.human_promotion_authorized ?? null) !== (baseline.human_promotion_authorized ?? null)
      || (observed.promotion_decision_bridge_eligible ?? null) !== (baseline.promotion_decision_bridge_eligible ?? null)
      || !this.sameRefSet(observed.bridge_trace_refs ?? [], baseline.bridge_trace_refs ?? [])
      || !this.sameStringSet(observed.commitment_profile_fields ?? [], baseline.commitment_profile_fields ?? [])
      || (observed.loopback_target ?? null) !== (baseline.loopback_target ?? null)
      || (observed.loopback_cause ?? null) !== (baseline.loopback_cause ?? null)
      || (observed.downstream_mutation_blocked ?? null) !== (baseline.downstream_mutation_blocked ?? null);
  }

  private traceComplete(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    const hasRequiredTraceRefs = this.includesEveryRef(observed.trace_refs, gold.required_trace_refs);
    const verdictMatches = gold.expected_trace_verdict === undefined
      || (observed.trace_verdict ?? null) === (gold.expected_trace_verdict ?? null);
    return hasRequiredTraceRefs && verdictMatches;
  }

  private packageTraceComplete(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    return this.includesEveryRef(observed.package_trace_refs ?? [], gold.required_package_trace_refs ?? []);
  }

  private bridgeTraceComplete(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    return this.includesEveryRef(observed.bridge_trace_refs ?? [], gold.required_bridge_trace_refs ?? []);
  }

  private commitmentProfileComplete(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    const required = gold.required_commitment_profile_fields ?? [];
    if (required.length === 0) return true;
    if (observed.commitment_profile_present === false) return false;
    return this.includesEveryString(observed.commitment_profile_fields ?? [], required);
  }

  private observedAnswerabilityPassed(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    return observed.answerability_passed === true
      || observed.answerability_verdict === 'answerable'
      || observed.answerability_verdict === 'answerable_with_risk';
  }

  private observedPackageReady(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    return observed.package_readiness_passed === true
      || observed.package_readiness_status === 'ready_for_promotion_review';
  }

  private observedPromotionInputReadyForGate(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    return observed.promotion_input_current === true
      || observed.promotion_input_closure_status === 'ready_for_gate';
  }

  private observedPromotionGateReady(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    return observed.promotion_gate_promote_allowed === true
      || observed.promotion_gate_disposition === 'ready_for_human_decision';
  }

  private observedPromotionBridgeEligible(observed: TopicSelectionOfflineEvaluationObservedOutput): boolean {
    return observed.promotion_decision_bridge_eligible === true;
  }

  private observedPromotedWithoutHumanAuthorization(
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    return this.observedPromotionBridgeEligible(observed)
      && observed.human_promotion_authorized !== true;
  }

  private unexpectedSliceBoundaryDriftCodes(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): string[] {
    const allowed = new Set(evaluationCase.gold_expectation.allowed_slice_boundary_drift_codes ?? []);
    return (observed.slice_boundary_drift_codes ?? []).filter((code) => !allowed.has(code));
  }

  private unexpectedValueOverclaimCodes(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): string[] {
    const allowed = new Set(evaluationCase.gold_expectation.allowed_value_overclaim_codes ?? []);
    return (observed.value_overclaim_codes ?? []).filter((code) => !allowed.has(code));
  }

  private loopbackCauseChanged(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    const expected = gold.expected_downstream_loopback_causes ?? [];
    const actual = observed.downstream_loopback_causes ?? [];
    return expected.length > 0 || actual.length > 0
      ? !this.sameStringSet(expected, actual)
      : false;
  }

  private promotionInputCurrentnessChanged(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    const currentChanged = gold.expected_promotion_input_current !== undefined
      && gold.expected_promotion_input_current !== null
      && (observed.promotion_input_current ?? null) !== gold.expected_promotion_input_current;
    const closureChanged = gold.expected_promotion_input_closure_status !== undefined
      && (observed.promotion_input_closure_status ?? null) !== (gold.expected_promotion_input_closure_status ?? null);
    return currentChanged || closureChanged;
  }

  private loopbackTargetChanged(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    const hasTarget = gold.expected_loopback_target !== undefined || observed.loopback_target !== undefined;
    const hasCause = gold.expected_loopback_cause !== undefined || observed.loopback_cause !== undefined;
    return hasTarget || hasCause
      ? (observed.loopback_target ?? null) !== (gold.expected_loopback_target ?? null)
        || (observed.loopback_cause ?? null) !== (gold.expected_loopback_cause ?? null)
      : false;
  }

  private downstreamFeedbackChanged(
    gold: TopicSelectionOfflineEvaluationGoldExpectation,
    observed: TopicSelectionOfflineEvaluationObservedOutput,
  ): boolean {
    const hasExpectation = gold.expected_downstream_mutation_blocked !== undefined
      && gold.expected_downstream_mutation_blocked !== null;
    return hasExpectation
      ? (observed.downstream_mutation_blocked ?? null) !== gold.expected_downstream_mutation_blocked
      : observed.downstream_mutation_attempted === true && observed.downstream_mutation_blocked !== true;
  }

  private caseTypeCoverage(cases: TopicSelectionOfflineEvaluationCaseRecord[]): TopicSelectionOfflineEvaluationCaseType[] {
    const present = new Set(cases.map((record) => record.case_type));
    return TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES.filter((caseType) => present.has(caseType));
  }

  private includesEveryRef(values: TopicSelectionFunctionalRef[], required: TopicSelectionFunctionalRef[]): boolean {
    const valueSet = new Set(values.map((record) => this.refKey(record)));
    return required.every((record) => valueSet.has(this.refKey(record)));
  }

  private includesEveryString(values: string[], required: string[]): boolean {
    const valueSet = new Set(values);
    return required.every((record) => valueSet.has(record));
  }

  private sameRefSet(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
    return this.sameStringSet(left.map((record) => this.refKey(record)), right.map((record) => this.refKey(record)));
  }

  private sameStringSet(left: string[], right: string[]): boolean {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    if (leftSet.size !== rightSet.size) return false;
    return [...rightSet].every((record) => leftSet.has(record));
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const records = new Map<string, TopicSelectionFunctionalRef>();
    for (const ref of refs) {
      records.set(this.refKey(ref), ref);
    }
    return [...records.values()];
  }

  private uniqueMetricKeys(
    metricKeys: TopicSelectionOfflineEvaluationMetricKey[],
  ): TopicSelectionOfflineEvaluationMetricKey[] {
    return TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS.filter((metricKey) => metricKeys.includes(metricKey));
  }

  private defaultMetricKeysForStage(
    stage: TopicSelectionOfflineEvaluationStage,
  ): TopicSelectionOfflineEvaluationMetricKey[] {
    switch (stage) {
      case 'v1a':
        return [...TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS];
      case 'v1b':
        return [...TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS];
      case 'v1c':
        return [...TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS];
      case 'research_arena':
        return [...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS];
    }
  }

  private caseTypesForStage(
    stage: TopicSelectionOfflineEvaluationStage,
  ): readonly TopicSelectionOfflineEvaluationCaseType[] {
    switch (stage) {
      case 'v1a':
        return TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES;
      case 'v1b':
        return TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES;
      case 'v1c':
        return TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES;
      case 'research_arena':
        return TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES;
    }
  }

  private metricKeysForStage(
    stage: TopicSelectionOfflineEvaluationStage,
  ): readonly TopicSelectionOfflineEvaluationMetricKey[] {
    switch (stage) {
      case 'v1a':
        return TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS;
      case 'v1b':
        return TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS;
      case 'v1c':
        return TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS;
      case 'research_arena':
        return TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS;
    }
  }

  private assertCaseCompatibleWithDataset(
    dataset: TopicSelectionOfflineEvaluationDatasetRecord,
    input: AddCaseInput,
  ): void {
    if (input.frozen_input_bundle.stage !== dataset.stage) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Frozen input bundle stage ${input.frozen_input_bundle.stage} does not match dataset stage ${dataset.stage}.`,
      );
    }
    const allowedCaseTypes = new Set(this.caseTypesForStage(dataset.stage));
    if (!allowedCaseTypes.has(input.case_type)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Case type ${input.case_type} is not compatible with ${dataset.stage} offline evaluation datasets.`,
      );
    }
  }

  private assertMetricKeysCompatibleWithDataset(
    dataset: TopicSelectionOfflineEvaluationDatasetRecord,
    metricKeys: TopicSelectionOfflineEvaluationMetricKey[],
  ): void {
    const allowedMetricKeys = new Set(this.metricKeysForStage(dataset.stage));
    const incompatibleMetricKeys = metricKeys.filter((metricKey) => !allowedMetricKeys.has(metricKey));
    if (incompatibleMetricKeys.length > 0) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Metric keys are not compatible with ${dataset.stage} offline evaluation datasets: ${incompatibleMetricKeys.join(', ')}.`,
      );
    }
  }

  private isV1bCase(evaluationCase: TopicSelectionOfflineEvaluationCaseRecord): boolean {
    return evaluationCase.frozen_input_bundle.stage === 'v1b';
  }

  private isV1cCase(evaluationCase: TopicSelectionOfflineEvaluationCaseRecord): boolean {
    return evaluationCase.frozen_input_bundle.stage === 'v1c';
  }

  private caseRef(evaluationCase: TopicSelectionOfflineEvaluationCaseRecord): TopicSelectionFunctionalRef {
    return this.ref(
      'offline_evaluation_case',
      evaluationCase.offline_evaluation_case_id,
      evaluationCase.title_card_id ?? null,
    );
  }

  private ref(refType: string, refId: string, titleCardId?: string | null): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId ?? null,
    };
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.version_id ?? '',
      ref.title_card_id ?? '',
    ].join(':');
  }

  private syntheticV1cCaseSpecs(frozenAt: string): SyntheticCaseSpec[] {
    const makeRef = (caseKey: string, refType: string, suffix: string): TopicSelectionFunctionalRef => ({
      ref_type: refType,
      ref_id: `${caseKey}_${suffix}`,
      title_card_id: `title_card_${caseKey}`,
    });
    const bridgeTraceRefs = (caseKey: string): TopicSelectionFunctionalRef[] => [
      makeRef(caseKey, 'promotion_input_snapshot', 'input'),
      makeRef(caseKey, 'promotion_gate_check', 'gate'),
      makeRef(caseKey, 'human_promotion_decision', 'human'),
      makeRef(caseKey, 'promotion_decision', 'decision'),
      makeRef(caseKey, 'promotion_commitment_profile', 'commitment'),
      makeRef(caseKey, 'paper_project_bridge', 'bridge'),
      makeRef(caseKey, 'topic_package', 'draft'),
      makeRef(caseKey, 'validated_need', 'need'),
      makeRef(caseKey, 'evidence_unit', 'support'),
    ];
    const commitmentFields = [
      'scope',
      'claim_ceiling',
      'accepted_risk_refs',
      'conditions',
      'early_check_obligations',
      'stop_conditions',
      'reopen_conditions',
    ];
    const observed = (
      caseKey: string,
      overrides: Partial<TopicSelectionOfflineEvaluationObservedOutput>,
    ): TopicSelectionOfflineEvaluationObservedOutput => ({
      final_decision: null,
      readiness_recommendation: null,
      readiness_passed: null,
      key_evidence_refs: [],
      counter_evidence_refs: [],
      evidence_refs: [],
      blocker_codes: [],
      trace_refs: [],
      trace_verdict: null,
      human_override_refs: [],
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      slice_boundary_drift_codes: [],
      answerability_verdict: null,
      answerability_passed: null,
      value_overclaim_codes: [],
      package_trace_refs: [],
      package_trace_verdict: null,
      package_readiness_status: null,
      package_readiness_passed: null,
      downstream_loopback_causes: [],
      promotion_input_current: true,
      promotion_input_closure_status: 'ready_for_gate',
      promotion_gate_disposition: 'ready_for_human_decision',
      promotion_gate_promote_allowed: true,
      human_promotion_authorized: true,
      human_promotion_decision: 'promote_to_paper_project',
      promotion_decision_bridge_eligible: true,
      bridge_trace_refs: bridgeTraceRefs(caseKey),
      bridge_trace_verdict: 'complete',
      commitment_profile_present: true,
      commitment_profile_fields: commitmentFields,
      loopback_target: null,
      loopback_cause: null,
      downstream_mutation_attempted: false,
      downstream_mutation_blocked: true,
      payload: { frozen_at: frozenAt, stage: 'v1c' },
      ...overrides,
    });
    const gold = (
      caseKey: string,
      overrides: Partial<TopicSelectionOfflineEvaluationGoldExpectation>,
    ): TopicSelectionOfflineEvaluationGoldExpectation => ({
      expected_unmet_need: true,
      expected_final_decision: null,
      expected_readiness_passed: null,
      expected_key_evidence_refs: [],
      expected_counter_evidence_refs: [],
      expected_blocker_codes: [],
      required_trace_refs: [],
      expected_trace_verdict: null,
      expected_recheck_action_refs: [],
      expected_negative_memory_refs: [],
      expected_downstream_rework_causes: [],
      expected_baseline_solved: false,
      allowed_slice_boundary_drift_codes: [],
      expected_answerability_passed: null,
      allowed_value_overclaim_codes: [],
      required_package_trace_refs: [],
      expected_package_ready: null,
      expected_package_readiness_status: null,
      expected_downstream_loopback_causes: [],
      expected_promotion_input_current: true,
      expected_promotion_input_closure_status: 'ready_for_gate',
      expected_promotion_gate_disposition: 'ready_for_human_decision',
      expected_promotion_gate_promote_allowed: true,
      expected_human_authorized: true,
      expected_promotion_bridge_eligible: true,
      required_bridge_trace_refs: bridgeTraceRefs(caseKey),
      required_commitment_profile_fields: commitmentFields,
      expected_loopback_target: null,
      expected_loopback_cause: null,
      notes: [],
      ...overrides,
    });

    return [
      {
        case_key: 'promotion_input_staleness_false_pass',
        case_type: 'promotion_input_staleness_false_pass',
        tags: ['synthetic', 'v1c', 'input-currentness'],
        gold: gold('promotion_input_staleness_false_pass', {
          expected_promotion_input_current: false,
          expected_promotion_input_closure_status: 'needs_upstream_refresh',
          expected_promotion_gate_promote_allowed: false,
          expected_promotion_bridge_eligible: false,
          notes: ['Stale v1c input snapshots must not pass into promotion gate support.'],
        }),
        observed: observed('promotion_input_staleness_false_pass', {
          promotion_input_current: true,
          promotion_input_closure_status: 'ready_for_gate',
          promotion_gate_disposition: 'blocked',
          promotion_gate_promote_allowed: false,
          promotion_decision_bridge_eligible: false,
        }),
      },
      {
        case_key: 'promotion_gate_blocker_false_pass',
        case_type: 'promotion_gate_blocker_false_pass',
        tags: ['synthetic', 'v1c', 'gate'],
        gold: gold('promotion_gate_blocker_false_pass', {
          expected_promotion_gate_disposition: 'blocked',
          expected_promotion_gate_promote_allowed: false,
          expected_promotion_bridge_eligible: false,
          notes: ['Blocking promotion gate checks must not become ready_for_human_decision.'],
        }),
        observed: observed('promotion_gate_blocker_false_pass', {
          promotion_gate_disposition: 'ready_for_human_decision',
          promotion_gate_promote_allowed: true,
          promotion_decision_bridge_eligible: false,
          blocker_codes: ['gate_blocker_ignored'],
        }),
      },
      {
        case_key: 'human_promotion_bypass',
        case_type: 'human_promotion_bypass',
        tags: ['synthetic', 'v1c', 'human-authorization'],
        gold: gold('human_promotion_bypass', {
          notes: ['Bridge-eligible promotion must have explicit human authorization.'],
        }),
        observed: observed('human_promotion_bypass', {
          human_promotion_authorized: false,
          human_promotion_decision: null,
          promotion_decision_bridge_eligible: true,
        }),
      },
      {
        case_key: 'promotion_false_pass',
        case_type: 'promotion_false_pass',
        tags: ['synthetic', 'v1c', 'promotion'],
        gold: gold('promotion_false_pass', {
          expected_promotion_bridge_eligible: false,
          notes: ['Gold non-promote or blocked promotion cases must not become bridge eligible.'],
        }),
        observed: observed('promotion_false_pass', {
          human_promotion_authorized: true,
          human_promotion_decision: 'promote_to_paper_project',
          promotion_decision_bridge_eligible: true,
        }),
      },
      {
        case_key: 'bridge_trace_gap',
        case_type: 'bridge_trace_gap',
        tags: ['synthetic', 'v1c', 'bridge-trace'],
        gold: gold('bridge_trace_gap', {
          notes: ['PaperProjectBridge must preserve promotion, package, need, and evidence lineage.'],
        }),
        observed: observed('bridge_trace_gap', {
          bridge_trace_refs: bridgeTraceRefs('bridge_trace_gap').filter((ref) => ref.ref_type !== 'evidence_unit'),
          bridge_trace_verdict: 'incomplete',
        }),
      },
      {
        case_key: 'commitment_profile_gap',
        case_type: 'commitment_profile_gap',
        tags: ['synthetic', 'v1c', 'commitment'],
        gold: gold('commitment_profile_gap', {
          notes: ['PromotionCommitmentProfile must freeze claim ceiling and early checks.'],
        }),
        observed: observed('commitment_profile_gap', {
          commitment_profile_fields: commitmentFields.filter((field) => field !== 'claim_ceiling'),
        }),
      },
      {
        case_key: 'loopback_target_misroute',
        case_type: 'loopback_target_misroute',
        tags: ['synthetic', 'v1c', 'loopback'],
        gold: gold('loopback_target_misroute', {
          expected_loopback_target: 'topic_question',
          expected_loopback_cause: 'unanswerable_question',
          notes: ['Downstream feedback must preserve typed loopback target and cause.'],
        }),
        observed: observed('loopback_target_misroute', {
          loopback_target: 'research_slice',
          loopback_cause: 'boundary_drift',
          baseline_observed_output: {
            final_decision: null,
            readiness_recommendation: null,
            readiness_passed: null,
            key_evidence_refs: [],
            counter_evidence_refs: [],
            evidence_refs: [],
            blocker_codes: [],
            trace_refs: [],
            trace_verdict: null,
            human_override_refs: [],
            recheck_action_refs: [],
            memory_refs: [],
            memory_used_as_evidence_refs: [],
            downstream_rework_causes: [],
            promotion_input_current: true,
            promotion_input_closure_status: 'ready_for_gate',
            promotion_gate_disposition: 'ready_for_human_decision',
            promotion_gate_promote_allowed: true,
            human_promotion_authorized: true,
            human_promotion_decision: 'promote_to_paper_project',
            promotion_decision_bridge_eligible: true,
            bridge_trace_refs: bridgeTraceRefs('loopback_target_misroute'),
            bridge_trace_verdict: 'complete',
            commitment_profile_present: true,
            commitment_profile_fields: commitmentFields,
            loopback_target: 'topic_question',
            loopback_cause: 'unanswerable_question',
            downstream_mutation_attempted: false,
            downstream_mutation_blocked: true,
            payload: { frozen_at: frozenAt, stage: 'v1c', prior_run: true },
          },
        }),
      },
      {
        case_key: 'downstream_mutation_attempt',
        case_type: 'downstream_mutation_attempt',
        tags: ['synthetic', 'v1c', 'downstream-guard'],
        gold: gold('downstream_mutation_attempt', {
          expected_downstream_mutation_blocked: true,
          notes: ['Downstream feedback/recheck must not mutate upstream authority artifacts.'],
        }),
        observed: observed('downstream_mutation_attempt', {
          downstream_mutation_attempted: true,
          downstream_mutation_blocked: false,
        }),
      },
    ];
  }

  private syntheticV1bCaseSpecs(frozenAt: string): SyntheticCaseSpec[] {
    const makeRef = (caseKey: string, refType: string, suffix: string): TopicSelectionFunctionalRef => ({
      ref_type: refType,
      ref_id: `${caseKey}_${suffix}`,
      title_card_id: `title_card_${caseKey}`,
    });
    const packageTraceRefs = (caseKey: string): TopicSelectionFunctionalRef[] => [
      makeRef(caseKey, 'topic_package', 'draft'),
      makeRef(caseKey, 'package_trace_boundary_check', 'check'),
    ];
    const observed = (
      caseKey: string,
      overrides: Partial<TopicSelectionOfflineEvaluationObservedOutput>,
    ): TopicSelectionOfflineEvaluationObservedOutput => ({
      final_decision: null,
      readiness_recommendation: null,
      readiness_passed: null,
      key_evidence_refs: [],
      counter_evidence_refs: [],
      evidence_refs: [],
      blocker_codes: [],
      trace_refs: [],
      trace_verdict: null,
      human_override_refs: [],
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      slice_boundary_drift_codes: [],
      answerability_verdict: 'answerable',
      answerability_passed: true,
      value_overclaim_codes: [],
      package_trace_refs: packageTraceRefs(caseKey),
      package_trace_verdict: 'complete',
      package_readiness_status: 'ready_for_promotion_review',
      package_readiness_passed: true,
      downstream_loopback_causes: [],
      payload: { frozen_at: frozenAt, stage: 'v1b' },
      ...overrides,
    });
    const gold = (
      caseKey: string,
      overrides: Partial<TopicSelectionOfflineEvaluationGoldExpectation>,
    ): TopicSelectionOfflineEvaluationGoldExpectation => ({
      expected_unmet_need: true,
      expected_final_decision: null,
      expected_readiness_passed: null,
      expected_key_evidence_refs: [],
      expected_counter_evidence_refs: [],
      expected_blocker_codes: [],
      required_trace_refs: [],
      expected_trace_verdict: null,
      expected_recheck_action_refs: [],
      expected_negative_memory_refs: [],
      expected_downstream_rework_causes: [],
      expected_baseline_solved: false,
      allowed_slice_boundary_drift_codes: [],
      expected_answerability_passed: true,
      allowed_value_overclaim_codes: [],
      required_package_trace_refs: packageTraceRefs(caseKey),
      expected_package_ready: true,
      expected_package_readiness_status: 'ready_for_promotion_review',
      expected_downstream_loopback_causes: [],
      notes: [],
      ...overrides,
    });

    return [
      {
        case_key: 'slice_boundary_drift',
        case_type: 'slice_boundary_drift',
        tags: ['synthetic', 'v1b', 'boundary'],
        gold: gold('slice_boundary_drift', {
          notes: ['ResearchSlice must preserve inherited target community and claim ceiling.'],
        }),
        observed: observed('slice_boundary_drift', {
          slice_boundary_drift_codes: ['target_community_expanded'],
          payload: { frozen_at: frozenAt, stage: 'v1b', drift: 'target_community_expanded' },
        }),
      },
      {
        case_key: 'answerability_false_pass',
        case_type: 'answerability_false_pass',
        tags: ['synthetic', 'v1b', 'answerability'],
        gold: gold('answerability_false_pass', {
          expected_answerability_passed: false,
          expected_package_ready: false,
          expected_package_readiness_status: 'blocked',
          notes: ['Question contract lacks required evaluation resources.'],
        }),
        observed: observed('answerability_false_pass', {
          answerability_verdict: 'answerable',
          answerability_passed: true,
          package_readiness_status: 'blocked',
          package_readiness_passed: false,
          blocker_codes: ['answerability_gap_carried_forward'],
        }),
      },
      {
        case_key: 'value_overclaim',
        case_type: 'value_overclaim',
        tags: ['synthetic', 'v1b', 'value'],
        gold: gold('value_overclaim', {
          notes: ['Value assessment must stay below the question claim ceiling.'],
        }),
        observed: observed('value_overclaim', {
          value_overclaim_codes: ['production_superiority'],
          payload: { frozen_at: frozenAt, stage: 'v1b', overclaim: 'production_superiority' },
        }),
      },
      {
        case_key: 'package_trace_gap',
        case_type: 'package_trace_gap',
        tags: ['synthetic', 'v1b', 'trace'],
        gold: gold('package_trace_gap', {
          expected_package_ready: false,
          expected_package_readiness_status: 'blocked',
          notes: ['Package must carry trace/boundary check refs into the draft.'],
        }),
        observed: observed('package_trace_gap', {
          package_trace_refs: [makeRef('package_trace_gap', 'topic_package', 'draft')],
          package_trace_verdict: 'incomplete',
          package_readiness_status: 'blocked',
          package_readiness_passed: false,
          blocker_codes: ['package_trace_missing'],
        }),
      },
      {
        case_key: 'package_readiness_false_pass',
        case_type: 'package_readiness_false_pass',
        tags: ['synthetic', 'v1b', 'readiness'],
        gold: gold('package_readiness_false_pass', {
          expected_package_ready: false,
          expected_package_readiness_status: 'blocked',
          notes: ['Explicit blockers must prevent v1c bundle publication.'],
        }),
        observed: observed('package_readiness_false_pass', {
          package_readiness_status: 'ready_for_promotion_review',
          package_readiness_passed: true,
          blocker_codes: ['blocker_carried_forward_but_ignored'],
        }),
      },
      {
        case_key: 'downstream_loopback_feedback',
        case_type: 'downstream_loopback_feedback',
        tags: ['synthetic', 'v1b', 'downstream'],
        gold: gold('downstream_loopback_feedback', {
          expected_downstream_loopback_causes: ['refine_question'],
          notes: ['Downstream feedback should preserve the loopback cause classification.'],
        }),
        observed: observed('downstream_loopback_feedback', {
          downstream_loopback_causes: ['refine_slice'],
          baseline_observed_output: {
            final_decision: null,
            readiness_recommendation: null,
            readiness_passed: null,
            key_evidence_refs: [],
            counter_evidence_refs: [],
            evidence_refs: [],
            blocker_codes: [],
            trace_refs: [],
            trace_verdict: null,
            human_override_refs: [],
            recheck_action_refs: [],
            memory_refs: [],
            memory_used_as_evidence_refs: [],
            downstream_rework_causes: [],
            slice_boundary_drift_codes: [],
            answerability_verdict: 'answerable',
            answerability_passed: true,
            value_overclaim_codes: [],
            package_trace_refs: packageTraceRefs('downstream_loopback_feedback'),
            package_trace_verdict: 'complete',
            package_readiness_status: 'ready_for_promotion_review',
            package_readiness_passed: true,
            downstream_loopback_causes: ['refine_question'],
            payload: { frozen_at: frozenAt, stage: 'v1b', prior_run: true },
          },
        }),
      },
    ];
  }

  private syntheticCaseSpecs(frozenAt: string): SyntheticCaseSpec[] {
    const makeRef = (caseKey: string, refType: string, suffix: string): TopicSelectionFunctionalRef => ({
      ref_type: refType,
      ref_id: `${caseKey}_${suffix}`,
      title_card_id: `title_card_${caseKey}`,
    });
    const observed = (
      caseKey: string,
      overrides: Partial<TopicSelectionOfflineEvaluationObservedOutput>,
    ): TopicSelectionOfflineEvaluationObservedOutput => ({
      final_decision: null,
      readiness_recommendation: null,
      readiness_passed: null,
      key_evidence_refs: [],
      counter_evidence_refs: [],
      evidence_refs: [],
      blocker_codes: [],
      trace_refs: [makeRef(caseKey, 'trace_snapshot', 'trace')],
      trace_verdict: 'complete',
      human_override_refs: [],
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      payload: { frozen_at: frozenAt },
      ...overrides,
    });
    const gold = (
      caseKey: string,
      overrides: Partial<TopicSelectionOfflineEvaluationGoldExpectation>,
    ): TopicSelectionOfflineEvaluationGoldExpectation => ({
      expected_unmet_need: false,
      expected_final_decision: 'reject',
      expected_readiness_passed: false,
      expected_key_evidence_refs: [],
      expected_counter_evidence_refs: [],
      expected_blocker_codes: [],
      required_trace_refs: [makeRef(caseKey, 'trace_snapshot', 'trace')],
      expected_trace_verdict: 'complete',
      expected_recheck_action_refs: [],
      expected_negative_memory_refs: [],
      expected_downstream_rework_causes: [],
      expected_baseline_solved: false,
      notes: [],
      ...overrides,
    });

    return [
      {
        case_key: 'true_unmet_need',
        case_type: 'true_unmet_need',
        tags: ['synthetic', 'positive'],
        gold: gold('true_unmet_need', {
          expected_unmet_need: true,
          expected_final_decision: 'validate',
          expected_readiness_passed: true,
          expected_key_evidence_refs: [makeRef('true_unmet_need', 'evidence_unit', 'support')],
        }),
        observed: observed('true_unmet_need', {
          final_decision: 'validate',
          readiness_recommendation: 'ready_for_validation',
          readiness_passed: true,
          key_evidence_refs: [makeRef('true_unmet_need', 'evidence_unit', 'support')],
          evidence_refs: [makeRef('true_unmet_need', 'evidence_unit', 'support')],
        }),
      },
      {
        case_key: 'pseudo_gap',
        case_type: 'pseudo_gap',
        tags: ['synthetic', 'negative'],
        gold: gold('pseudo_gap', {
          expected_counter_evidence_refs: [makeRef('pseudo_gap', 'evidence_unit', 'counter')],
          expected_blocker_codes: ['PSEUDO_GAP'],
        }),
        observed: observed('pseudo_gap', {
          final_decision: 'validate',
          readiness_recommendation: 'ready_for_validation',
          readiness_passed: true,
          key_evidence_refs: [makeRef('pseudo_gap', 'evidence_unit', 'weak_support')],
          evidence_refs: [makeRef('pseudo_gap', 'evidence_unit', 'weak_support')],
        }),
      },
      {
        case_key: 'strong_baseline_solved',
        case_type: 'strong_baseline_solved',
        tags: ['synthetic', 'baseline'],
        gold: gold('strong_baseline_solved', {
          expected_counter_evidence_refs: [makeRef('strong_baseline_solved', 'evidence_unit', 'baseline')],
          expected_blocker_codes: ['ALREADY_SOLVED'],
          expected_baseline_solved: true,
        }),
        observed: observed('strong_baseline_solved', {
          final_decision: 'validate',
          readiness_recommendation: 'ready_for_validation',
          readiness_passed: true,
          key_evidence_refs: [makeRef('strong_baseline_solved', 'evidence_unit', 'weak_support')],
          evidence_refs: [makeRef('strong_baseline_solved', 'evidence_unit', 'weak_support')],
        }),
      },
      {
        case_key: 'author_future_work_misleading',
        case_type: 'author_future_work_misleading',
        tags: ['synthetic', 'future_work'],
        gold: gold('author_future_work_misleading', {
          expected_blocker_codes: ['AUTHOR_FUTURE_WORK_ONLY'],
        }),
        observed: observed('author_future_work_misleading', {
          final_decision: 'reject',
          readiness_passed: false,
          blocker_codes: ['AUTHOR_FUTURE_WORK_ONLY'],
        }),
      },
      {
        case_key: 'abstract_overclaim_body_unsupported',
        case_type: 'abstract_overclaim_body_unsupported',
        tags: ['synthetic', 'source_locator'],
        gold: gold('abstract_overclaim_body_unsupported', {
          expected_counter_evidence_refs: [
            makeRef('abstract_overclaim_body_unsupported', 'evidence_unit', 'body_challenge'),
          ],
          expected_blocker_codes: ['BODY_UNSUPPORTED'],
        }),
        observed: observed('abstract_overclaim_body_unsupported', {
          final_decision: 'reject',
          readiness_passed: false,
          blocker_codes: ['BODY_UNSUPPORTED'],
          trace_refs: [],
          trace_verdict: 'incomplete',
        }),
      },
      {
        case_key: 'terminology_shift_same_task',
        case_type: 'terminology_shift_same_task',
        tags: ['synthetic', 'terminology'],
        gold: gold('terminology_shift_same_task', {
          expected_blocker_codes: ['TERMINOLOGY_SHIFT_DUPLICATE'],
        }),
        observed: observed('terminology_shift_same_task', {
          final_decision: 'reject',
          readiness_passed: false,
          blocker_codes: ['TERMINOLOGY_SHIFT_DUPLICATE'],
        }),
      },
      {
        case_key: 'same_team_duplicate_claim',
        case_type: 'same_team_duplicate_claim',
        tags: ['synthetic', 'memory'],
        gold: gold('same_team_duplicate_claim', {
          expected_blocker_codes: ['SAME_TEAM_DUPLICATE'],
          expected_negative_memory_refs: [makeRef('same_team_duplicate_claim', 'decision_memory_entry', 'duplicate')],
        }),
        observed: observed('same_team_duplicate_claim', {
          final_decision: 'reject',
          readiness_passed: false,
          blocker_codes: ['SAME_TEAM_DUPLICATE'],
          human_override_refs: [makeRef('same_team_duplicate_claim', 'human_override', 'override')],
          memory_refs: [makeRef('same_team_duplicate_claim', 'decision_memory_entry', 'duplicate')],
          memory_used_as_evidence_refs: [makeRef('same_team_duplicate_claim', 'decision_memory_entry', 'duplicate')],
        }),
      },
      {
        case_key: 'source_health_or_missing_fulltext',
        case_type: 'source_health_or_missing_fulltext',
        tags: ['synthetic', 'recheck'],
        gold: gold('source_health_or_missing_fulltext', {
          expected_final_decision: 'request_searchplan_recheck',
          expected_blocker_codes: ['MISSING_FULLTEXT'],
          expected_recheck_action_refs: [makeRef('source_health_or_missing_fulltext', 'recheck_impact', 'fulltext')],
        }),
        observed: observed('source_health_or_missing_fulltext', {
          final_decision: 'request_searchplan_recheck',
          readiness_passed: false,
          blocker_codes: ['MISSING_FULLTEXT'],
          recheck_action_refs: [makeRef('source_health_or_missing_fulltext', 'recheck_impact', 'fulltext')],
        }),
      },
      {
        case_key: 'downstream_failure_feedback',
        case_type: 'downstream_failure_feedback',
        tags: ['synthetic', 'downstream'],
        gold: gold('downstream_failure_feedback', {
          expected_unmet_need: true,
          expected_final_decision: 'return_to_candidate',
          expected_negative_memory_refs: [makeRef('downstream_failure_feedback', 'decision_memory_entry', 'downstream')],
          expected_downstream_rework_causes: ['weak_counter_evidence_recall'],
        }),
        observed: observed('downstream_failure_feedback', {
          final_decision: 'return_to_candidate',
          readiness_passed: false,
          memory_refs: [makeRef('downstream_failure_feedback', 'decision_memory_entry', 'downstream')],
          downstream_rework_causes: ['weak_counter_evidence_recall'],
          baseline_observed_output: {
            final_decision: 'validate',
            readiness_recommendation: 'ready_for_validation',
            readiness_passed: true,
            key_evidence_refs: [makeRef('downstream_failure_feedback', 'evidence_unit', 'old_support')],
            counter_evidence_refs: [],
            evidence_refs: [makeRef('downstream_failure_feedback', 'evidence_unit', 'old_support')],
            blocker_codes: [],
            trace_refs: [makeRef('downstream_failure_feedback', 'trace_snapshot', 'trace')],
            trace_verdict: 'complete',
            human_override_refs: [],
            recheck_action_refs: [],
            memory_refs: [],
            memory_used_as_evidence_refs: [],
            downstream_rework_causes: [],
            payload: { frozen_at: frozenAt, prior_run: true },
          },
        }),
      },
    ];
  }
}
