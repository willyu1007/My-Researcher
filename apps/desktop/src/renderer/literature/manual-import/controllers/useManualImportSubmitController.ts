import { requestGovernance } from '../../shared/api';
import { asRecord } from '../../shared/normalizers';
import type { ManualRowValidation } from '../../manual-import-types';
import type {
  ManualImportControllerInput,
  ManualImportControllerOutput,
  ManualImportSelectedValidRow,
} from '../types';

type ManualImportSubmitOutput = Pick<ManualImportControllerOutput, 'handleSubmitManualReviewedRows'>;

type ManualImportSubmitDependencies = {
  manualValidationByRowId: Map<string, ManualRowValidation>;
};

export function useManualImportSubmitController(
  input: ManualImportControllerInput,
  dependencies: ManualImportSubmitDependencies,
): ManualImportSubmitOutput {
  const {
    loadLiteratureOverview,
    manualImportSession,
    paperId,
    pushLiteratureFeedback,
    setManualImportSession,
    setManualUploadError,
    setManualUploadLoading,
    setManualUploadStatus,
    topicId,
  } = input;
  const { manualValidationByRowId } = dependencies;

  const handleSubmitManualReviewedRows = async () => {
    if (!manualImportSession || manualImportSession.rows.length === 0) {
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'warning',
        message: '请先上传并审阅文献，再执行导入。',
      });
      return;
    }

    const selectedValidRows = manualImportSession.rows
      .map((row) => ({
        row,
        validation: manualValidationByRowId.get(row.id),
      }))
      .filter(
        (entry): entry is ManualImportSelectedValidRow =>
          entry.row.include && Boolean(entry.validation?.is_valid && entry.validation.normalized),
      );

    if (selectedValidRows.length === 0) {
      setManualUploadStatus('empty');
      const message = '没有已勾选且通过校验的行可导入。';
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'warning',
        message,
      });
      return;
    }

    setManualUploadLoading(true);
    setManualUploadStatus('saving');
    setManualUploadError(null);

    try {
      const importItems = selectedValidRows.map((entry) => entry.validation.normalized);

      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/collections/import',
        body: {
          items: importItems,
        },
      });
      const root = asRecord(payload);
      const results = Array.isArray(root?.results) ? root.results : [];
      const normalizedResults = results
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => row !== null);

      const newCount = normalizedResults.filter((row) => row.is_new === true).length;
      const dedupCount = normalizedResults.filter((row) => row.is_new === false).length;
      const failedCount = Math.max(0, selectedValidRows.length - normalizedResults.length);
      const fullSuccess = normalizedResults.length === selectedValidRows.length;

      if (fullSuccess) {
        const selectedRowIds = new Set(selectedValidRows.map((entry) => entry.row.id));
        setManualImportSession((current) => {
          if (!current) {
            return current;
          }
          const nextRows = current.rows.filter((row) => !selectedRowIds.has(row.id));
          if (nextRows.length === 0) {
            return null;
          }
          return {
            ...current,
            rows: nextRows,
          };
        });
      }

      setManualUploadStatus('ready');
      setManualUploadError(null);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: failedCount > 0 ? 'warning' : 'success',
        message: `入库完成：新增 ${newCount}，去重 ${dedupCount}，失败 ${failedCount}${fullSuccess ? '' : '。存在失败行，已保留在表格中供继续修正。'}`,
      });

      await loadLiteratureOverview(topicId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '手动导入失败。';
      setManualUploadStatus('error');
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `手动导入失败：${message}`,
      });
    } finally {
      setManualUploadLoading(false);
    }
  };

  return {
    handleSubmitManualReviewedRows,
  };
}
