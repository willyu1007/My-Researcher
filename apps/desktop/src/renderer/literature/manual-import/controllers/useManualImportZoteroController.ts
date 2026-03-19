import { requestGovernance } from '../../shared/api';
import { emptyZoteroLinkResult } from '../../shared/constants';
import {
  asRecord,
  computeZoteroPreviewResult,
} from '../../shared/normalizers';
import type {
  ManualImportControllerInput,
  ManualImportControllerOutput,
} from '../types';
import { applyManualImportSessionRows } from './manualImportSession';

type ManualImportZoteroOutput = Pick<
  ManualImportControllerOutput,
  'handleTestZoteroConnection' | 'handleLoadZoteroToReview' | 'handleImportFromZotero'
>;

export function useManualImportZoteroController(input: ManualImportControllerInput): ManualImportZoteroOutput {
  const {
    loadLiteratureOverview,
    manualImportSession,
    paperId,
    pushLiteratureFeedback,
    setManualImportSession,
    setManualOpenRowId,
    setManualOpenRowPanel,
    setManualShowErrorOnly,
    setManualShowImportableOnly,
    setManualUploadError,
    setManualUploadStatus,
    setZoteroAction,
    setZoteroError,
    setZoteroLinkResult,
    setZoteroLoading,
    setZoteroStatus,
    topicId,
    zoteroApiKey,
    zoteroLibraryId,
    zoteroLibraryType,
  } = input;

  const sessionMutators = {
    manualImportSession,
    setManualImportSession,
    setManualShowImportableOnly,
    setManualShowErrorOnly,
    setManualOpenRowId,
    setManualOpenRowPanel,
    setManualUploadStatus,
    setManualUploadError,
    pushLiteratureFeedback,
  } as const;

  const prepareZoteroRequestContext = () => {
    const libraryId = zoteroLibraryId.trim();
    if (!libraryId) {
      const message = '请填写 Zotero Library ID。';
      setZoteroStatus('error');
      setZoteroError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'warning',
        message,
      });
      return null;
    }

    return { libraryId };
  };

  const requestZoteroPreview = async (libraryId: string) => {
    return requestGovernance({
      method: 'POST',
      path: '/literature/zotero-preview',
      body: {
        library_type: zoteroLibraryType,
        library_id: libraryId,
        api_key: zoteroApiKey.trim() || undefined,
      },
    });
  };

  const handleTestZoteroConnection = async () => {
    const context = prepareZoteroRequestContext();
    if (!context) {
      return;
    }

    setZoteroLoading(true);
    setZoteroAction('test-link');
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestZoteroPreview(context.libraryId);
      const previewResult = computeZoteroPreviewResult(payload, manualImportSession?.rows ?? []);

      setZoteroLinkResult({
        tested: true,
        connected: true,
        totalCount: previewResult.fetchedCount,
        duplicateCount: previewResult.duplicateCount,
        unparsedCount: previewResult.unparsedCount,
        importableCount: previewResult.importableCount,
      });
      setZoteroStatus(previewResult.fetchedCount > 0 ? 'ready' : 'empty');
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: previewResult.fetchedCount > 0 ? 'success' : 'warning',
        message: previewResult.fetchedCount > 0
          ? `链接测试成功：总数 ${previewResult.fetchedCount}，可导入 ${previewResult.importableCount}。`
          : '链接测试成功，但当前未拉取到文献。',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zotero 链接测试失败。';
      setZoteroStatus('error');
      setZoteroError(message);
      setZoteroLinkResult({
        ...emptyZoteroLinkResult,
        tested: true,
        connected: false,
      });
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `Zotero 链接测试失败：${message}`,
      });
    } finally {
      setZoteroLoading(false);
      setZoteroAction('idle');
    }
  };

  const handleLoadZoteroToReview = async () => {
    const context = prepareZoteroRequestContext();
    if (!context) {
      return;
    }

    setZoteroLoading(true);
    setZoteroAction('load-to-list');
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestZoteroPreview(context.libraryId);
      const previewResult = computeZoteroPreviewResult(payload, manualImportSession?.rows ?? []);
      setZoteroLinkResult({
        tested: true,
        connected: true,
        totalCount: previewResult.fetchedCount,
        duplicateCount: previewResult.duplicateCount,
        unparsedCount: previewResult.unparsedCount,
        importableCount: previewResult.importableCount,
      });

      if (previewResult.rows.length === 0) {
        setZoteroStatus('empty');
        pushLiteratureFeedback({
          slot: 'manual-import',
          level: 'warning',
          message: '未从 Zotero 拉取到可审阅条目。',
        });
        return;
      }

      const sessionName = `zotero:${zoteroLibraryType}/${context.libraryId}`;
      applyManualImportSessionRows(sessionMutators, {
        fileName: sessionName,
        rows: previewResult.rows,
        source: 'zotero-preview',
      });
      setZoteroStatus('ready');
      setZoteroError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zotero 预览失败。';
      setZoteroStatus('error');
      setZoteroError(message);
      setZoteroLinkResult({
        ...emptyZoteroLinkResult,
        tested: true,
        connected: false,
      });
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `Zotero 预览失败：${message}`,
      });
    } finally {
      setZoteroLoading(false);
      setZoteroAction('idle');
    }
  };

  const handleImportFromZotero = async () => {
    const context = prepareZoteroRequestContext();
    if (!context) {
      return;
    }

    setZoteroLoading(true);
    setZoteroAction('sync-import');
    setZoteroStatus('loading');
    setZoteroError(null);
    try {
      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/zotero-import',
        body: {
          library_type: zoteroLibraryType,
          library_id: context.libraryId,
          api_key: zoteroApiKey.trim() || undefined,
        },
      });

      const root = asRecord(payload);
      const importedCount = typeof root?.imported_count === 'number' ? root.imported_count : 0;
      setZoteroStatus(importedCount > 0 ? 'ready' : 'empty');
      setZoteroLinkResult((current) => ({
        ...current,
        tested: true,
        connected: true,
      }));
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: importedCount > 0 ? 'success' : 'warning',
        message: `Zotero 同步完成：导入 ${importedCount} 条。`,
      });
      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zotero 导入失败。';
      setZoteroStatus('error');
      setZoteroError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `Zotero 导入失败：${message}`,
        recoveryAction: 'retry-zotero-import',
      });
    } finally {
      setZoteroLoading(false);
      setZoteroAction('idle');
    }
  };

  return {
    handleTestZoteroConnection,
    handleLoadZoteroToReview,
    handleImportFromZotero,
  };
}
