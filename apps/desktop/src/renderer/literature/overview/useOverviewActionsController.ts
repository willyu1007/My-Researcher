import { requestGovernance } from '../shared/api';
import { overviewYearDefaultEnd, overviewYearDefaultStart } from '../shared/constants';
import { asRecord, parseQuerySortPreset, parseYearFilterInput } from '../shared/normalizers';
import type {
  CitationStatus,
  MetadataIntakeOpenContext,
  MetadataIntakeTabKey,
  PipelineStageCode,
  ScopeStatus,
} from '../shared/types';

export type OverviewActionsControllerInput = Record<string, any>;

export type OverviewActionsControllerOutput = {
  handleScopeStatusChange: (literatureId: string, scopeStatus: ScopeStatus) => Promise<void>;
  handleSyncPaperFromTopic: () => Promise<void>;
  handleUpdateCitationStatus: (linkId: string, status: CitationStatus) => Promise<void>;
  handleTopFeedbackRecovery: () => void;
  handleApplyLiteratureFilters: () => void;
  handleResetLightweightFilters: () => void;
  handleToggleOverviewTagKeyword: (tag: string) => void;
  handleSelectAllOverviewTags: () => void;
  handleClearOverviewTagSelection: () => void;
  handleRunOverviewContentAction: (
    literatureId: string,
    requestedStages: PipelineStageCode[],
    actionLabel: string,
  ) => Promise<void>;
  handleOpenMetadataIntake: (
    literatureId: string,
    tab?: MetadataIntakeTabKey,
    context?: MetadataIntakeOpenContext,
  ) => void;
};

export function useOverviewActionsController(
  input: OverviewActionsControllerInput,
): OverviewActionsControllerOutput {
  const {
    topicId,
    paperId,
    scopeReasonInput,
    pushLiteratureFeedback,
    loadTopicScope,
    loadLiteratureOverview,
    loadPaperLiterature,
    setOverviewKeyword,
    overviewKeywordInput,
    setOverviewYearStart,
    overviewYearStartInput,
    setOverviewYearEnd,
    overviewYearEndInput,
    setOverviewTagKeywords,
    overviewTagKeywordsInput,
    setOverviewStatusFilter,
    overviewScopeFilterInput,
    setQuerySort,
    setSortDirection,
    querySortPresetInput,
    setOverviewTagPickerOpen,
    setOverviewPageIndex,
    setOverviewKeywordInput,
    setOverviewYearStartInput,
    setOverviewYearEndInput,
    setOverviewTagKeywordsInput,
    setOverviewScopeFilterInput,
    setQuerySortPresetInput,
    overviewTagOptions,
    topFeedback,
    handleImportFromZotero,
    openMetadataIntakePanel,
  } = input;

  const handleScopeStatusChange = async (literatureId: string, scopeStatus: ScopeStatus) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/topics/${encodeURIComponent(topicId.trim())}/literature-scope`,
        body: {
          actions: [
            {
              literature_id: literatureId,
              scope_status: scopeStatus,
              reason: scopeReasonInput.trim() || undefined,
            },
          ],
        },
      });
      await loadTopicScope(topicId);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: scopeStatus === 'in_scope' ? '文献已加入选题范围。' : '文献已从选题范围排除。',
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新选题范围失败。';
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `更新选题范围失败：${message}`,
      });
    }
  };

  const handleSyncPaperFromTopic = async () => {
    const normalizedPaperId = paperId.trim();
    const normalizedTopicId = topicId.trim();
    if (!normalizedPaperId || !normalizedTopicId) {
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'warning',
        message: '请先填写 Paper ID 与 Topic ID。',
      });
      return;
    }

    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/literature-links/from-topic`,
        body: {
          topic_id: normalizedTopicId,
        },
      });
      const root = asRecord(payload);
      const linkedCount = typeof root?.linked_count === 'number' ? root.linked_count : 0;
      const skippedCount = typeof root?.skipped_count === 'number' ? root.skipped_count : 0;
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `已同步到论文管理：新增 ${linkedCount} 条，跳过 ${skippedCount} 条。`,
      });
      await loadPaperLiterature(normalizedPaperId);
      await loadLiteratureOverview(topicId, normalizedPaperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步论文文献失败。';
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `同步论文文献失败：${message}`,
      });
    }
  };

  const handleUpdateCitationStatus = async (linkId: string, status: CitationStatus) => {
    try {
      await requestGovernance({
        method: 'PATCH',
        path: `/paper-projects/${encodeURIComponent(paperId.trim())}/literature-links/${encodeURIComponent(linkId)}`,
        body: {
          citation_status: status,
        },
      });
      await loadPaperLiterature(paperId);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `引用状态已更新为 ${status}。`,
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新引用状态失败。';
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `更新引用状态失败：${message}`,
      });
    }
  };

  const handleTopFeedbackRecovery = () => {
    if (!topFeedback?.recoveryAction) {
      return;
    }

    if (topFeedback.recoveryAction === 'retry-zotero-import') {
      void handleImportFromZotero();
      return;
    }
    if (topFeedback.recoveryAction === 'reload-overview') {
      void loadLiteratureOverview(topicId, paperId);
    }
  };

  const handleApplyLiteratureFilters = () => {
    let yearStart = parseYearFilterInput(overviewYearStartInput);
    let yearEnd = parseYearFilterInput(overviewYearEndInput);
    if (yearStart === null) {
      yearStart = overviewYearDefaultStart;
    }
    if (yearEnd === null) {
      yearEnd = overviewYearDefaultEnd;
    }
    if (yearStart > yearEnd) {
      [yearStart, yearEnd] = [yearEnd, yearStart];
    }
    setOverviewKeyword(overviewKeywordInput.trim());
    setOverviewYearStart(yearStart);
    setOverviewYearEnd(yearEnd);
    setOverviewTagKeywords(overviewTagKeywordsInput);
    setOverviewStatusFilter(overviewScopeFilterInput);
    const nextSortPreset = parseQuerySortPreset(querySortPresetInput);
    setQuerySort(nextSortPreset.sort);
    setSortDirection(nextSortPreset.direction);
    setOverviewTagPickerOpen(false);
    setOverviewPageIndex(1);
    pushLiteratureFeedback({
      slot: 'overview',
      level: 'info',
      message: '已应用筛选。',
    });
  };

  const handleResetLightweightFilters = () => {
    setOverviewKeywordInput('');
    setOverviewYearStartInput('');
    setOverviewYearEndInput('');
    setOverviewTagKeywordsInput([]);
    setOverviewTagPickerOpen(false);
    setOverviewScopeFilterInput('all');
    setQuerySortPresetInput('importance|desc');
    setOverviewKeyword('');
    setOverviewYearStart(overviewYearDefaultStart);
    setOverviewYearEnd(overviewYearDefaultEnd);
    setOverviewTagKeywords([]);
    setOverviewStatusFilter('all');
    setQuerySort('importance');
    setSortDirection('desc');
    setOverviewPageIndex(1);
    pushLiteratureFeedback({
      slot: 'overview',
      level: 'info',
      message: '已重置轻量筛选。',
    });
  };

  const handleToggleOverviewTagKeyword = (tag: string) => {
    setOverviewTagKeywordsInput((current: string[]) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
  };

  const handleSelectAllOverviewTags = () => {
    setOverviewTagKeywordsInput(overviewTagOptions);
  };

  const handleClearOverviewTagSelection = () => {
    setOverviewTagKeywordsInput([]);
  };

  const handleRunOverviewContentAction = async (
    literatureId: string,
    requestedStages: PipelineStageCode[],
    actionLabel: string,
  ) => {
    try {
      await requestGovernance({
        method: 'POST',
        path: `/literature/${encodeURIComponent(literatureId)}/pipeline/runs`,
        body: {
          requested_stages: requestedStages,
        },
      });
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `${actionLabel}任务已提交，系统将异步执行。`,
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${actionLabel}任务提交失败。`;
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `${actionLabel}任务提交失败：${message}`,
      });
    }
  };

  const handleOpenMetadataIntake = (
    literatureId: string,
    tab: MetadataIntakeTabKey = 'abstract',
    context?: MetadataIntakeOpenContext,
  ) => {
    openMetadataIntakePanel(literatureId, tab, context);
  };

  return {
    handleScopeStatusChange,
    handleSyncPaperFromTopic,
    handleUpdateCitationStatus,
    handleTopFeedbackRecovery,
    handleApplyLiteratureFilters,
    handleResetLightweightFilters,
    handleToggleOverviewTagKeyword,
    handleSelectAllOverviewTags,
    handleClearOverviewTagSelection,
    handleRunOverviewContentAction,
    handleOpenMetadataIntake,
  };
}
