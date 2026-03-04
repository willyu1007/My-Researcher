import { isAutoImportSubTabKey, isManualImportSubTabKey } from '../literature/shared/normalizers';
import type { LiteratureTabKey, TimelineEvent } from '../literature/shared/types';

export type ShellHandlersInput = Record<string, any>;

export type ShellHandlersOutput = {
  handleModuleSelect: (moduleName: string) => void;
  handleToggleSidebar: () => void;
  handleSelectLiteratureSubTab: (tabKey: LiteratureTabKey, subTabKey: string) => void;
  handleToggleGovernance: () => void;
  handleApplyPaperId: () => void;
  handleRefreshPanels: () => void;
  handleEvidenceTrace: (event: TimelineEvent) => void;
};

export function useShellHandlers(input: ShellHandlersInput): ShellHandlersOutput {
  const {
    setActiveModule,
    setActionHint,
    setIsSidebarCollapsed,
    setActiveLiteratureTab,
    setAutoImportSubTab,
    setManualImportSubTab,
    setGovernanceEnabled,
    paperIdInput,
    setPaperId,
    setReviewSubmitState,
    setReviewSubmitMessage,
    loadPaperLiterature,
    loadLiteratureOverview,
    topicId,
    setRefreshTick,
    tryGetSnapshotId,
  } = input;

  const handleModuleSelect = (moduleName: string) => {
    setActiveModule(moduleName);
    setActionHint(`已切换到「${moduleName}」模块。`);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((current: boolean) => !current);
  };

  const handleSelectLiteratureSubTab = (tabKey: LiteratureTabKey, subTabKey: string) => {
    setActiveLiteratureTab(tabKey);
    if (tabKey === 'auto-import' && isAutoImportSubTabKey(subTabKey)) {
      setAutoImportSubTab(subTabKey);
      return;
    }
    if (tabKey === 'manual-import' && isManualImportSubTabKey(subTabKey)) {
      setManualImportSubTab(subTabKey);
    }
  };

  const handleToggleGovernance = () => {
    setGovernanceEnabled((current: boolean) => {
      const next = !current;
      setActionHint(next ? '治理面板已启用（当前会话）。' : '治理面板已关闭，主流程不受影响。');
      return next;
    });
  };

  const handleApplyPaperId = () => {
    const normalized = paperIdInput.trim();
    if (!normalized) {
      setActionHint('Paper ID 不能为空。');
      return;
    }

    setPaperId(normalized);
    setReviewSubmitState('idle');
    setReviewSubmitMessage('');
    setActionHint(`已加载治理项目 ${normalized}。`);
    void loadPaperLiterature(normalized);
    void loadLiteratureOverview(topicId, normalized);
  };

  const handleRefreshPanels = () => {
    setRefreshTick((value: number) => value + 1);
    setActionHint('治理面板已刷新。');
  };

  const handleEvidenceTrace = (event: TimelineEvent) => {
    const snapshotId = tryGetSnapshotId(event.summary);
    const evidence = [
      event.node_id ? `node:${event.node_id}` : 'node:none',
      snapshotId ? `snapshot:${snapshotId}` : 'snapshot:none',
      event.module_id ? `module:${event.module_id}` : 'module:none',
    ].join(' · ');
    setActionHint(`证据链定位：${evidence}`);
  };

  return {
    handleModuleSelect,
    handleToggleSidebar,
    handleSelectLiteratureSubTab,
    handleToggleGovernance,
    handleApplyPaperId,
    handleRefreshPanels,
    handleEvidenceTrace,
  };
}
