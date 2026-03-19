import { validateManualDraftRows } from '../../manual-import-utils';
import { mergeManualDraftRows } from '../../shared/normalizers';
import type { ManualDraftRow } from '../../manual-import-types';
import type {
  ApplyManualImportSessionRowsArgs,
  ManualImportSessionMutators,
} from '../types';

export function applyManualImportSessionRows(
  mutators: ManualImportSessionMutators,
  args: ApplyManualImportSessionRowsArgs,
): void {
  const {
    manualImportSession,
    pushLiteratureFeedback,
    setManualImportSession,
    setManualOpenRowId,
    setManualOpenRowPanel,
    setManualShowErrorOnly,
    setManualShowImportableOnly,
    setManualUploadError,
    setManualUploadStatus,
  } = mutators;
  const { fileName, rows, source } = args;

  const baseRows = source === 'seed' ? [] : manualImportSession?.rows ?? [];
  const merged = mergeManualDraftRows(baseRows, rows);
  const nextSession = merged.rows.length > 0
    ? {
      file_name: source === 'seed' ? fileName : manualImportSession?.file_name ?? fileName,
      rows: merged.rows,
    }
    : null;
  const validations = validateManualDraftRows(merged.rows);
  const invalidCount = validations.filter((item) => !item.is_valid).length;

  if (!nextSession) {
    return;
  }

  const appended = source === 'seed' ? merged.rows.length : merged.appendedCount;
  const duplicateSkipped = source === 'seed' ? 0 : merged.skippedDuplicates;
  const level =
    appended === 0
      ? 'warning'
      : invalidCount > 0 || duplicateSkipped > 0
        ? 'warning'
        : 'success';
  const statusText = `当前检查表 ${merged.rows.length} 行，错误 ${invalidCount} 行。`;

  setManualImportSession(nextSession);
  setManualShowImportableOnly(false);
  setManualShowErrorOnly(false);
  setManualOpenRowId(null);
  setManualOpenRowPanel(null);
  setManualUploadStatus('ready');
  setManualUploadError(null);
  pushLiteratureFeedback({
    slot: 'manual-import',
    level,
    message:
      source === 'seed'
        ? `已注入测试数据 ${merged.rows.length} 行，其中 ${invalidCount} 行待修复后可导入。`
        : source === 'zotero-preview'
          ? `Zotero 新增 ${appended} 行，去重跳过 ${duplicateSkipped} 行。${statusText}`
          : `本地上传新增 ${appended} 行，去重跳过 ${duplicateSkipped} 行。${statusText}`,
  });
}

export function getManualDraftRows(session: { rows: ManualDraftRow[] } | null): ManualDraftRow[] {
  return session?.rows ?? [];
}
