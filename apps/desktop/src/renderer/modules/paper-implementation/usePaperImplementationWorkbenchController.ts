import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  BootstrapImplementationProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ApplyMotivePortfolioDecisionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorRunWithSteps,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  PaperImplementationRuntimeTelemetryProjectRepaidRate,
  PaperImplementationRuntimeTelemetryRunDetail,
  PaperImplementationRuntimeTelemetryRunSummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';
import type {
  CreateHumanConfirmationRecordRequest,
  HumanConfirmationRecord,
  PaperImplementationHumanConfirmationScope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  PaperImplementationWorkbenchReadModels,
} from './api';
import {
  applyMotivePortfolioDecision,
  bootstrapImplementationProject,
  createEmptyPaperImplementationReadModels,
  createHumanConfirmationRecord,
  dispatchValidationUpstreamFeedbackCandidate,
  getCoordinatorRun,
  getImplementationProject,
  getImplementationProjectByBridge,
  getRuntimeTelemetryProjectRepaidRate,
  getRuntimeTelemetryRunDetail,
  listCoordinatorRunsByProject,
  listHumanConfirmationRecords,
  listRuntimeTelemetryRunSummaries,
  loadPaperImplementationReadModels,
  resolveDecisionWorkQueueItem,
  resolveTraceRepairQueueItem,
} from './api';
import type {
  PaperImplementationActionStatus,
  PaperImplementationLoadStatus,
  PaperImplementationQueueItem,
  PaperImplementationWorkbenchSnapshot,
} from './types';
import {
  buildPaperImplementationQueue,
  parseJsonObject,
  toErrorMessage,
} from './utils';

const defaultPortfolioDecisionPayload = [
  '{',
  '  "motive_roles_after_decision": {',
  '    "primary_motive_ids": [],',
  '    "secondary_motive_ids": [],',
  '    "fallback_motive_ids": [],',
  '    "supporting_motive_ids": [],',
  '    "parked_motive_ids": [],',
  '    "abandoned_motive_ids": []',
  '  },',
  '  "changes": {',
  '    "promoted_to_primary": [],',
  '    "demoted_from_primary": [],',
  '    "merged_motives": [],',
  '    "split_motives": [],',
  '    "newly_parked": [],',
  '    "newly_abandoned": []',
  '  },',
  '  "rationale": {},',
  '  "proposed_by": "human",',
  '  "confirmed_by": "human",',
  '  "confirmation_level": "human_confirmed"',
  '}',
].join('\n');

const defaultConfirmationTargetRefsPayload = [
  '[',
  '  { "ref_type": "claim_candidate", "ref_id": "" }',
  ']',
].join('\n');

const defaultConfirmationAdvancedPayload = [
  '{',
  '  "reviewed_sources": [],',
  '  "gate_result_refs": [],',
  '  "transition_attempt_ref": null,',
  '  "policy_version_id": null',
  '}',
].join('\n');

function parseFunctionalRefArray(input: string): TopicSelectionFunctionalRef[] {
  const parsed = JSON.parse(input) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('target_refs 必须是 functional ref 数组。');
  }
  return parsed as TopicSelectionFunctionalRef[];
}

export function usePaperImplementationWorkbenchController() {
  const [implementationProjectIdInput, setImplementationProjectIdInput] = useState<string>('');
  const [paperProjectBridgeIdInput, setPaperProjectBridgeIdInput] = useState<string>('');
  const [bridgePayloadHashInput, setBridgePayloadHashInput] = useState<string>('');
  const [projectResponse, setProjectResponse] = useState<BootstrapImplementationProjectResponse | null>(null);
  const [readModels, setReadModels] = useState<PaperImplementationWorkbenchReadModels>(
    () => createEmptyPaperImplementationReadModels(),
  );
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<PaperImplementationLoadStatus>('idle');
  const [readModelStatus, setReadModelStatus] = useState<PaperImplementationLoadStatus>('idle');
  const [projectError, setProjectError] = useState<string | null>(null);
  const [readModelError, setReadModelError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<PaperImplementationActionStatus>('idle');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [decisionResolutionNote, setDecisionResolutionNote] = useState<string>('');
  const [decisionResolutionStatus, setDecisionResolutionStatus] =
    useState<'resolved' | 'dismissed' | 'superseded'>('resolved');
  const [decisionReAdvance, setDecisionReAdvance] = useState<boolean>(false);
  const [decisionRetryBudgetOverride, setDecisionRetryBudgetOverride] = useState<string>('');
  const [traceResolutionNote, setTraceResolutionNote] = useState<string>('');
  const [upstreamRequiredAction, setUpstreamRequiredAction] = useState<string>('');
  const [portfolioDecisionPayload, setPortfolioDecisionPayload] = useState<string>(defaultPortfolioDecisionPayload);

  // S4-B runtime lane: coordinator run + step timeline. The project-level run
  // list drives selection; the run_id direct input stays as an auxiliary path.
  const [coordinatorRuns, setCoordinatorRuns] = useState<PaperImplementationCoordinatorRun[]>([]);
  const [coordinatorRunsStatus, setCoordinatorRunsStatus] = useState<PaperImplementationLoadStatus>('idle');
  const [coordinatorRunsError, setCoordinatorRunsError] = useState<string | null>(null);
  const [coordinatorRunIdInput, setCoordinatorRunIdInput] = useState<string>('');
  const [coordinatorRun, setCoordinatorRun] = useState<PaperImplementationCoordinatorRunWithSteps | null>(null);
  const [coordinatorRunStatus, setCoordinatorRunStatus] = useState<PaperImplementationLoadStatus>('idle');
  const [coordinatorRunError, setCoordinatorRunError] = useState<string | null>(null);
  // Mirror of the currently-loaded coordinator run id, readable synchronously
  // from refresh reconciliation without threading state through callback deps.
  const loadedCoordinatorRunIdRef = useRef<string | null>(null);

  // S4-A runtime telemetry read model.
  const [telemetryRuns, setTelemetryRuns] = useState<PaperImplementationRuntimeTelemetryRunSummary[]>([]);
  const [projectRepaidRate, setProjectRepaidRate] = useState<PaperImplementationRuntimeTelemetryProjectRepaidRate | null>(null);
  const [telemetryStatus, setTelemetryStatus] = useState<PaperImplementationLoadStatus>('idle');
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [selectedTelemetryRunId, setSelectedTelemetryRunId] = useState<string | null>(null);
  const [telemetryRunDetail, setTelemetryRunDetail] = useState<PaperImplementationRuntimeTelemetryRunDetail | null>(null);
  const [telemetryDetailStatus, setTelemetryDetailStatus] = useState<PaperImplementationLoadStatus>('idle');
  // Mirror of the currently-selected telemetry run id. Used as a last-write-wins
  // guard so a slow detail response can only be applied while its run is still
  // the selected one (survives project switches, which reset the ref to null).
  const selectedTelemetryRunIdRef = useRef<string | null>(null);

  // S0 hand-off: HumanConfirmationRecord list + create.
  const [confirmationRecords, setConfirmationRecords] = useState<HumanConfirmationRecord[]>([]);
  const [confirmationStatus, setConfirmationStatus] = useState<PaperImplementationLoadStatus>('idle');
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [confirmationScope, setConfirmationScope] = useState<PaperImplementationHumanConfirmationScope>('strong_claim_acceptance');
  const [confirmationActorType, setConfirmationActorType] = useState<TopicSelectionActorType>('human');
  const [confirmationRationale, setConfirmationRationale] = useState<string>('');
  const [confirmationActorId, setConfirmationActorId] = useState<string>('');
  const [confirmationTargetRefsPayload, setConfirmationTargetRefsPayload] = useState<string>(defaultConfirmationTargetRefsPayload);
  const [confirmationAdvancedPayload, setConfirmationAdvancedPayload] = useState<string>(defaultConfirmationAdvancedPayload);
  const [confirmationActionStatus, setConfirmationActionStatus] = useState<PaperImplementationActionStatus>('idle');
  const [confirmationActionMessage, setConfirmationActionMessage] = useState<string>('');

  const queueItems = useMemo(() => buildPaperImplementationQueue(readModels), [readModels]);
  const selectedQueueItem = useMemo<PaperImplementationQueueItem | null>(() => {
    if (!selectedQueueItemId) {
      return queueItems[0] ?? null;
    }
    return queueItems.find((item) => item.itemId === selectedQueueItemId) ?? queueItems[0] ?? null;
  }, [queueItems, selectedQueueItemId]);
  const activeImplementationProjectId = projectResponse?.implementation_project.implementation_project_id ?? '';
  const snapshot = useMemo<PaperImplementationWorkbenchSnapshot>(
    () => ({ projectResponse, readModels }),
    [projectResponse, readModels],
  );

  const refreshReadModels = useCallback(async (implementationProjectId: string) => {
    const normalizedProjectId = implementationProjectId.trim();
    if (!normalizedProjectId) {
      setReadModels(createEmptyPaperImplementationReadModels());
      setReadModelStatus('idle');
      return;
    }

    setReadModelStatus('loading');
    setReadModelError(null);
    try {
      const loaded = await loadPaperImplementationReadModels(normalizedProjectId);
      setReadModels(loaded);
      setReadModelStatus('ready');
      setSelectedQueueItemId((current) => {
        const nextQueue = buildPaperImplementationQueue(loaded);
        if (current && nextQueue.some((item) => item.itemId === current)) {
          return current;
        }
        return nextQueue[0]?.itemId ?? null;
      });
    } catch (error) {
      setReadModels(createEmptyPaperImplementationReadModels());
      setReadModelStatus('error');
      setReadModelError(toErrorMessage(error));
    }
  }, []);

  // Drop the telemetry-detail selection + its cached detail as one unit. Resets
  // the selection-mirror ref so any in-flight detail fetch is invalidated.
  const clearTelemetrySelection = useCallback(() => {
    selectedTelemetryRunIdRef.current = null;
    setSelectedTelemetryRunId(null);
    setTelemetryRunDetail(null);
    setTelemetryDetailStatus('idle');
  }, []);

  // Drop the loaded coordinator run + its status/error as one unit.
  const clearLoadedCoordinatorRun = useCallback(() => {
    loadedCoordinatorRunIdRef.current = null;
    setCoordinatorRun(null);
    setCoordinatorRunStatus('idle');
    setCoordinatorRunError(null);
  }, []);

  const refreshTelemetry = useCallback(async (implementationProjectId: string) => {
    const normalizedProjectId = implementationProjectId.trim();
    if (!normalizedProjectId) {
      setTelemetryRuns([]);
      setProjectRepaidRate(null);
      setTelemetryStatus('idle');
      clearTelemetrySelection();
      return;
    }

    setTelemetryStatus('loading');
    setTelemetryError(null);
    try {
      const [runs, repaidRate] = await Promise.all([
        listRuntimeTelemetryRunSummaries(normalizedProjectId),
        getRuntimeTelemetryProjectRepaidRate(normalizedProjectId),
      ]);
      setTelemetryRuns(runs);
      setProjectRepaidRate(repaidRate);
      setTelemetryStatus('ready');
      // Kill the stale detail pair: if the previously selected run is not in the
      // freshly loaded list (e.g. after a project switch), drop the selection.
      const selectedId = selectedTelemetryRunIdRef.current;
      if (selectedId && !runs.some((run) => run.run_id === selectedId)) {
        clearTelemetrySelection();
      }
    } catch (error) {
      setTelemetryRuns([]);
      setProjectRepaidRate(null);
      setTelemetryStatus('error');
      setTelemetryError(toErrorMessage(error));
      clearTelemetrySelection();
    }
  }, [clearTelemetrySelection]);

  const refreshCoordinatorRuns = useCallback(async (implementationProjectId: string) => {
    const normalizedProjectId = implementationProjectId.trim();
    if (!normalizedProjectId) {
      setCoordinatorRuns([]);
      setCoordinatorRunsStatus('idle');
      clearLoadedCoordinatorRun();
      setCoordinatorRunIdInput('');
      return;
    }

    setCoordinatorRunsStatus('loading');
    setCoordinatorRunsError(null);
    try {
      const runs = await listCoordinatorRunsByProject(normalizedProjectId);
      setCoordinatorRuns(runs);
      setCoordinatorRunsStatus('ready');
      // Kill the stale selection pair: drop the loaded run and the direct-input
      // id if they are no longer part of the freshly loaded list.
      const runIds = new Set(runs.map((run) => run.coordinator_run_id));
      const loadedId = loadedCoordinatorRunIdRef.current;
      if (loadedId && !runIds.has(loadedId)) {
        clearLoadedCoordinatorRun();
      }
      setCoordinatorRunIdInput((current) => (current && !runIds.has(current) ? '' : current));
    } catch (error) {
      setCoordinatorRuns([]);
      setCoordinatorRunsStatus('error');
      setCoordinatorRunsError(toErrorMessage(error));
    }
  }, [clearLoadedCoordinatorRun]);

  const refreshConfirmations = useCallback(async (implementationProjectId: string) => {
    const normalizedProjectId = implementationProjectId.trim();
    if (!normalizedProjectId) {
      setConfirmationRecords([]);
      setConfirmationStatus('idle');
      return;
    }

    setConfirmationStatus('loading');
    setConfirmationError(null);
    try {
      const records = await listHumanConfirmationRecords(normalizedProjectId);
      setConfirmationRecords(records);
      setConfirmationStatus('ready');
    } catch (error) {
      setConfirmationRecords([]);
      setConfirmationStatus('error');
      setConfirmationError(toErrorMessage(error));
    }
  }, []);

  const adoptProjectResponse = useCallback(async (response: BootstrapImplementationProjectResponse) => {
    const projectId = response.implementation_project.implementation_project_id;
    setProjectResponse(response);
    setImplementationProjectIdInput(projectId);
    setPaperProjectBridgeIdInput(response.implementation_project.paper_project_bridge_id);
    setBridgePayloadHashInput(response.implementation_project.bridge_payload_hash);
    await Promise.all([
      refreshReadModels(projectId),
      refreshTelemetry(projectId),
      refreshCoordinatorRuns(projectId),
      refreshConfirmations(projectId),
    ]);
  }, [refreshConfirmations, refreshCoordinatorRuns, refreshReadModels, refreshTelemetry]);

  const loadByProjectId = useCallback(async () => {
    const normalizedProjectId = implementationProjectIdInput.trim();
    if (!normalizedProjectId) {
      setProjectStatus('error');
      setProjectError('ImplementationProject ID 不能为空。');
      return;
    }

    setProjectStatus('loading');
    setProjectError(null);
    try {
      const response = await getImplementationProject(normalizedProjectId);
      setProjectStatus('ready');
      setActionMessage(`已加载 ${response.implementation_project.implementation_project_id}`);
      await adoptProjectResponse(response);
    } catch (error) {
      setProjectStatus('error');
      setProjectError(toErrorMessage(error));
    }
  }, [adoptProjectResponse, implementationProjectIdInput]);

  const loadByBridgeId = useCallback(async () => {
    const normalizedBridgeId = paperProjectBridgeIdInput.trim();
    if (!normalizedBridgeId) {
      setProjectStatus('error');
      setProjectError('PaperProjectBridge ID 不能为空。');
      return;
    }

    setProjectStatus('loading');
    setProjectError(null);
    try {
      const response = await getImplementationProjectByBridge(normalizedBridgeId);
      setProjectStatus('ready');
      setActionMessage(`已通过 bridge 加载 ${response.implementation_project.implementation_project_id}`);
      await adoptProjectResponse(response);
    } catch (error) {
      setProjectStatus('error');
      setProjectError(toErrorMessage(error));
    }
  }, [adoptProjectResponse, paperProjectBridgeIdInput]);

  const bootstrapFromBridge = useCallback(async () => {
    const normalizedBridgeId = paperProjectBridgeIdInput.trim();
    const normalizedBridgeHash = bridgePayloadHashInput.trim();
    if (!normalizedBridgeId || !normalizedBridgeHash) {
      setProjectStatus('error');
      setProjectError('PaperProjectBridge ID 和 bridge_payload_hash 均不能为空。');
      return;
    }

    setProjectStatus('loading');
    setProjectError(null);
    try {
      const response = await bootstrapImplementationProject({
        paper_project_bridge_id: normalizedBridgeId,
        bridge_payload_hash: normalizedBridgeHash,
        created_by: 'human',
      });
      setProjectStatus('ready');
      setActionMessage(response.project_created ? '已创建 ImplementationProject。' : '已返回既有 ImplementationProject。');
      await adoptProjectResponse(response);
    } catch (error) {
      setProjectStatus('error');
      setProjectError(toErrorMessage(error));
    }
  }, [adoptProjectResponse, bridgePayloadHashInput, paperProjectBridgeIdInput]);

  const reload = useCallback(async () => {
    if (!activeImplementationProjectId) {
      await loadByProjectId();
      return;
    }
    await Promise.all([
      refreshReadModels(activeImplementationProjectId),
      refreshTelemetry(activeImplementationProjectId),
      refreshCoordinatorRuns(activeImplementationProjectId),
      refreshConfirmations(activeImplementationProjectId),
    ]);
  }, [
    activeImplementationProjectId,
    loadByProjectId,
    refreshConfirmations,
    refreshCoordinatorRuns,
    refreshReadModels,
    refreshTelemetry,
  ]);

  const loadCoordinatorRun = useCallback(async (runIdOverride?: string) => {
    if (!activeImplementationProjectId) {
      setCoordinatorRunStatus('error');
      setCoordinatorRunError('请先加载 ImplementationProject。');
      return;
    }
    const normalizedRunId = (runIdOverride ?? coordinatorRunIdInput).trim();
    if (!normalizedRunId) {
      setCoordinatorRunStatus('error');
      setCoordinatorRunError('coordinator_run_id 不能为空。');
      return;
    }
    setCoordinatorRunStatus('loading');
    setCoordinatorRunError(null);
    try {
      const result = await getCoordinatorRun(activeImplementationProjectId, normalizedRunId);
      loadedCoordinatorRunIdRef.current = result.run.coordinator_run_id;
      setCoordinatorRun(result);
      setCoordinatorRunStatus('ready');
    } catch (error) {
      loadedCoordinatorRunIdRef.current = null;
      setCoordinatorRun(null);
      setCoordinatorRunStatus('error');
      setCoordinatorRunError(toErrorMessage(error));
    }
  }, [activeImplementationProjectId, coordinatorRunIdInput]);

  const resolveSelectedDecisionQueueItem = useCallback(async (status: 'resolved' | 'dismissed' | 'superseded') => {
    if (!activeImplementationProjectId || !selectedQueueItem || selectedQueueItem.source !== 'decision_work_queue') {
      return;
    }
    setActionStatus('loading');
    setActionMessage('');
    try {
      // Red line: re_advance / retry_budget_override drive a real coordinator
      // advance (real LLM consumption) and are only meaningful for `resolved`.
      // dismiss / superseded MUST NOT carry them, regardless of stale UI state.
      const canReAdvance = status === 'resolved';
      let retryBudgetOverride: number | null = null;
      if (canReAdvance) {
        const overrideRaw = decisionRetryBudgetOverride.trim();
        if (overrideRaw) {
          const parsed = Number(overrideRaw);
          if (!Number.isInteger(parsed) || parsed < 1) {
            throw new Error('retry_budget_override 必须是 >= 1 的整数。');
          }
          retryBudgetOverride = parsed;
        }
      }
      const reAdvance = canReAdvance && decisionReAdvance;
      const response = await resolveDecisionWorkQueueItem(
        activeImplementationProjectId,
        selectedQueueItem.itemId,
        {
          status,
          resolution_note: decisionResolutionNote.trim() || null,
          resolved_by: 'human',
          ...(reAdvance ? { re_advance: true } : {}),
          ...(retryBudgetOverride !== null ? { retry_budget_override: retryBudgetOverride } : {}),
        },
      );
      setActionStatus('success');
      if (response.coordinator_advance_error) {
        setActionMessage(
          `decision queue item 已${status}，但触发的 coordinator advance 失败：`
          + `${response.coordinator_advance_error.code}: ${response.coordinator_advance_error.message}`,
        );
      } else if (response.coordinator_advance) {
        setActionMessage(
          `decision queue item 已${status}，并触发 coordinator advance`
          + `（run ${response.coordinator_advance.run.coordinator_run_id} → ${response.coordinator_advance.run.run_status}）。`,
        );
      } else {
        setActionMessage(`decision queue item 已${status}。`);
      }
      setDecisionResolutionNote('');
      setDecisionResolutionStatus('resolved');
      setDecisionReAdvance(false);
      setDecisionRetryBudgetOverride('');
      // A successful re_advance mutates coordinator-run and telemetry state, so
      // refresh those lanes alongside the read models. If the advanced run is
      // the one currently loaded in the runtime lane, reload its step timeline.
      const advancedRunId = response.coordinator_advance?.run.coordinator_run_id ?? null;
      await Promise.all([
        refreshReadModels(activeImplementationProjectId),
        ...(response.coordinator_advance
          ? [
              refreshCoordinatorRuns(activeImplementationProjectId),
              refreshTelemetry(activeImplementationProjectId),
            ]
          : []),
      ]);
      if (advancedRunId && coordinatorRun?.run.coordinator_run_id === advancedRunId) {
        await loadCoordinatorRun(advancedRunId);
      }
    } catch (error) {
      setActionStatus('error');
      setActionMessage(toErrorMessage(error));
    }
  }, [
    activeImplementationProjectId,
    coordinatorRun,
    decisionReAdvance,
    decisionResolutionNote,
    decisionRetryBudgetOverride,
    loadCoordinatorRun,
    refreshCoordinatorRuns,
    refreshReadModels,
    refreshTelemetry,
    selectedQueueItem,
  ]);

  const resolveSelectedTraceRepairItem = useCallback(async () => {
    if (!activeImplementationProjectId || !selectedQueueItem || selectedQueueItem.source !== 'trace_repair_queue') {
      return;
    }
    setActionStatus('loading');
    setActionMessage('');
    try {
      await resolveTraceRepairQueueItem(
        activeImplementationProjectId,
        selectedQueueItem.itemId,
        {
          resolution_note: traceResolutionNote.trim() || null,
          resolved_by: 'human',
        },
      );
      setActionStatus('success');
      setActionMessage('trace repair queue item 已提交 resolve 命令。');
      setTraceResolutionNote('');
      await refreshReadModels(activeImplementationProjectId);
    } catch (error) {
      setActionStatus('error');
      setActionMessage(toErrorMessage(error));
    }
  }, [
    activeImplementationProjectId,
    refreshReadModels,
    selectedQueueItem,
    traceResolutionNote,
  ]);

  const dispatchSelectedUpstreamFeedbackCandidate = useCallback(async () => {
    if (!activeImplementationProjectId || !selectedQueueItem || selectedQueueItem.source !== 'upstream_feedback') {
      return;
    }
    setActionStatus('loading');
    setActionMessage('');
    try {
      await dispatchValidationUpstreamFeedbackCandidate(
        activeImplementationProjectId,
        selectedQueueItem.itemId,
        {
          required_action: upstreamRequiredAction.trim() || null,
          created_by: 'human',
        },
      );
      setActionStatus('success');
      setActionMessage('upstream feedback candidate 已通过 T-093 feedback event dispatch。');
      setUpstreamRequiredAction('');
      await refreshReadModels(activeImplementationProjectId);
    } catch (error) {
      setActionStatus('error');
      setActionMessage(toErrorMessage(error));
    }
  }, [
    activeImplementationProjectId,
    refreshReadModels,
    selectedQueueItem,
    upstreamRequiredAction,
  ]);

  const submitPortfolioDecision = useCallback(async () => {
    if (!activeImplementationProjectId) {
      setActionStatus('error');
      setActionMessage('请先加载 ImplementationProject。');
      return;
    }

    setActionStatus('loading');
    setActionMessage('');
    try {
      const payload = parseJsonObject(portfolioDecisionPayload) as unknown as ApplyMotivePortfolioDecisionRequest;
      await applyMotivePortfolioDecision(activeImplementationProjectId, payload);
      setActionStatus('success');
      setActionMessage('portfolio decision 已提交后端 StateWriter 路径。');
      await refreshReadModels(activeImplementationProjectId);
    } catch (error) {
      setActionStatus('error');
      setActionMessage(toErrorMessage(error));
    }
  }, [
    activeImplementationProjectId,
    portfolioDecisionPayload,
    refreshReadModels,
  ]);

  const selectCoordinatorRun = useCallback(async (coordinatorRunId: string) => {
    setCoordinatorRunIdInput(coordinatorRunId);
    await loadCoordinatorRun(coordinatorRunId);
  }, [loadCoordinatorRun]);

  const selectTelemetryRun = useCallback(async (runId: string) => {
    // Do not strand a selection with no project to resolve it against.
    if (!activeImplementationProjectId) {
      return;
    }
    selectedTelemetryRunIdRef.current = runId;
    setSelectedTelemetryRunId(runId);
    setTelemetryDetailStatus('loading');
    try {
      const detail = await getRuntimeTelemetryRunDetail(activeImplementationProjectId, runId);
      // Last-write-wins guard: a slower response for a previously-selected run
      // must not overwrite the detail of the run the user has since selected
      // (or land after a project switch cleared the selection).
      if (selectedTelemetryRunIdRef.current !== runId) {
        return;
      }
      setTelemetryRunDetail(detail);
      setTelemetryDetailStatus('ready');
    } catch (error) {
      if (selectedTelemetryRunIdRef.current !== runId) {
        return;
      }
      setTelemetryRunDetail(null);
      setTelemetryDetailStatus('error');
      setTelemetryError(toErrorMessage(error));
    }
  }, [activeImplementationProjectId]);

  const createConfirmation = useCallback(async () => {
    if (!activeImplementationProjectId) {
      setConfirmationActionStatus('error');
      setConfirmationActionMessage('请先加载 ImplementationProject。');
      return;
    }
    if (!confirmationRationale.trim()) {
      setConfirmationActionStatus('error');
      setConfirmationActionMessage('rationale 不能为空。');
      return;
    }
    setConfirmationActionStatus('loading');
    setConfirmationActionMessage('');
    try {
      const targetRefs = parseFunctionalRefArray(confirmationTargetRefsPayload);
      if (targetRefs.length === 0) {
        throw new Error('target_refs 至少需要一个绑定目标。');
      }
      const advanced = parseJsonObject(confirmationAdvancedPayload) as Partial<CreateHumanConfirmationRecordRequest>;
      const request: CreateHumanConfirmationRecordRequest = {
        confirmation_scope: confirmationScope,
        target_refs: targetRefs,
        rationale: confirmationRationale.trim(),
        confirmed_by_actor_type: confirmationActorType,
        confirmed_by_actor_id: confirmationActorId.trim() || null,
        ...(advanced.reviewed_sources ? { reviewed_sources: advanced.reviewed_sources } : {}),
        ...(advanced.gate_result_refs ? { gate_result_refs: advanced.gate_result_refs } : {}),
        ...(advanced.transition_attempt_ref !== undefined
          ? { transition_attempt_ref: advanced.transition_attempt_ref }
          : {}),
        ...(advanced.policy_version_id !== undefined
          ? { policy_version_id: advanced.policy_version_id }
          : {}),
      };
      const record = await createHumanConfirmationRecord(activeImplementationProjectId, request);
      setConfirmationActionStatus('success');
      setConfirmationActionMessage(`已创建确认记录 ${record.confirmation_record_id}。`);
      setConfirmationRationale('');
      setConfirmationActorId('');
      await refreshConfirmations(activeImplementationProjectId);
    } catch (error) {
      setConfirmationActionStatus('error');
      setConfirmationActionMessage(toErrorMessage(error));
    }
  }, [
    activeImplementationProjectId,
    confirmationActorId,
    confirmationActorType,
    confirmationAdvancedPayload,
    confirmationRationale,
    confirmationScope,
    confirmationTargetRefsPayload,
    refreshConfirmations,
  ]);

  return {
    implementationProjectIdInput,
    setImplementationProjectIdInput,
    paperProjectBridgeIdInput,
    setPaperProjectBridgeIdInput,
    bridgePayloadHashInput,
    setBridgePayloadHashInput,
    projectResponse,
    snapshot,
    readModels,
    queueItems,
    selectedQueueItem,
    selectedQueueItemId,
    setSelectedQueueItemId,
    projectStatus,
    readModelStatus,
    projectError,
    readModelError,
    actionStatus,
    actionMessage,
    decisionResolutionNote,
    setDecisionResolutionNote,
    decisionResolutionStatus,
    setDecisionResolutionStatus,
    decisionReAdvance,
    setDecisionReAdvance,
    decisionRetryBudgetOverride,
    setDecisionRetryBudgetOverride,
    traceResolutionNote,
    setTraceResolutionNote,
    upstreamRequiredAction,
    setUpstreamRequiredAction,
    portfolioDecisionPayload,
    setPortfolioDecisionPayload,
    // S4-B runtime lane.
    coordinatorRuns,
    coordinatorRunsStatus,
    coordinatorRunsError,
    selectCoordinatorRun,
    coordinatorRunIdInput,
    setCoordinatorRunIdInput,
    coordinatorRun,
    coordinatorRunStatus,
    coordinatorRunError,
    loadCoordinatorRun,
    // S4-A telemetry.
    telemetryRuns,
    projectRepaidRate,
    telemetryStatus,
    telemetryError,
    selectedTelemetryRunId,
    telemetryRunDetail,
    telemetryDetailStatus,
    selectTelemetryRun,
    // S0 confirmation entry.
    confirmationRecords,
    confirmationStatus,
    confirmationError,
    confirmationScope,
    setConfirmationScope,
    confirmationActorType,
    setConfirmationActorType,
    confirmationRationale,
    setConfirmationRationale,
    confirmationActorId,
    setConfirmationActorId,
    confirmationTargetRefsPayload,
    setConfirmationTargetRefsPayload,
    confirmationAdvancedPayload,
    setConfirmationAdvancedPayload,
    confirmationActionStatus,
    confirmationActionMessage,
    createConfirmation,
    loadByProjectId,
    loadByBridgeId,
    bootstrapFromBridge,
    reload,
    resolveSelectedDecisionQueueItem,
    resolveSelectedTraceRepairItem,
    dispatchSelectedUpstreamFeedbackCandidate,
    submitPortfolioDecision,
  };
}
