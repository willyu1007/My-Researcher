import { useEffect, useMemo } from 'react';
import type {
  ManualImportSession,
  ManualRowValidation,
} from '../../manual-import-types';
import { validateManualDraftRows } from '../../manual-import-utils';
import type {
  ManualImportControllerInput,
  ManualImportControllerOutput,
} from '../types';
import { getManualDraftRows } from './manualImportSession';

type ManualImportReviewOutput = Pick<
  ManualImportControllerOutput,
  | 'manualDraftRows'
  | 'manualRowValidations'
  | 'manualValidationByRowId'
  | 'manualVisibleRows'
  | 'manualRowStats'
  | 'hasManualSession'
  | 'handleManualDraftFieldChange'
  | 'handleToggleManualRowInclude'
  | 'handleRemoveManualRow'
  | 'handleToggleManualRowPanel'
  | 'handleCopyManualCellValue'
>;

export function useManualImportReviewController(input: ManualImportControllerInput): ManualImportReviewOutput {
  const {
    manualImportSession,
    manualOpenRowId,
    manualOpenRowPanel,
    manualShowErrorOnly,
    manualShowImportableOnly,
    setManualImportSession,
    setManualOpenRowId,
    setManualOpenRowPanel,
  } = input;

  const manualDraftRows = useMemo(
    () => getManualDraftRows(manualImportSession),
    [manualImportSession],
  );
  const manualRowValidations = useMemo<ManualRowValidation[]>(
    () => validateManualDraftRows(manualDraftRows),
    [manualDraftRows],
  );
  const manualValidationByRowId = useMemo(
    () => new Map<string, ManualRowValidation>(manualRowValidations.map((item) => [item.row_id, item])),
    [manualRowValidations],
  );
  const manualVisibleRows = useMemo(
    () => {
      if (manualShowImportableOnly === manualShowErrorOnly) {
        return manualDraftRows;
      }
      if (manualShowImportableOnly) {
        return manualDraftRows.filter((row) => Boolean(manualValidationByRowId.get(row.id)?.is_valid));
      }
      return manualDraftRows.filter((row) => !manualValidationByRowId.get(row.id)?.is_valid);
    },
    [manualDraftRows, manualShowErrorOnly, manualShowImportableOnly, manualValidationByRowId],
  );
  const manualRowStats = useMemo(() => {
    let validCount = 0;
    let invalidCount = 0;
    let selectedValidCount = 0;
    let selectedInvalidCount = 0;

    for (const row of manualDraftRows) {
      const validation = manualValidationByRowId.get(row.id);
      if (validation?.is_valid) {
        validCount += 1;
        if (row.include) {
          selectedValidCount += 1;
        }
      } else {
        invalidCount += 1;
        if (row.include) {
          selectedInvalidCount += 1;
        }
      }
    }

    return {
      totalCount: manualDraftRows.length,
      validCount,
      invalidCount,
      selectedValidCount,
      selectedInvalidCount,
    };
  }, [manualDraftRows, manualValidationByRowId]);
  const hasManualSession = manualDraftRows.length > 0;

  useEffect(() => {
    if (!manualImportSession) {
      return;
    }

    const invalidSelectedIds = manualDraftRows
      .filter((row) => row.include && !manualValidationByRowId.get(row.id)?.is_valid)
      .map((row) => row.id);

    if (invalidSelectedIds.length === 0) {
      return;
    }

    const invalidIdSet = new Set(invalidSelectedIds);
    setManualImportSession((current) => {
      if (!current) {
        return current;
      }
      let changed = false;
      const nextRows = current.rows.map((row) => {
        if (!row.include || !invalidIdSet.has(row.id)) {
          return row;
        }
        changed = true;
        return {
          ...row,
          include: false,
        };
      });
      if (!changed) {
        return current;
      }
      return {
        ...current,
        rows: nextRows,
      };
    });
  }, [manualDraftRows, manualImportSession, manualValidationByRowId, setManualImportSession]);

  useEffect(() => {
    if (!manualOpenRowId) {
      return;
    }
    const exists = manualDraftRows.some((row) => row.id === manualOpenRowId);
    if (exists) {
      return;
    }
    setManualOpenRowId(null);
    setManualOpenRowPanel(null);
  }, [manualDraftRows, manualOpenRowId, setManualOpenRowId, setManualOpenRowPanel]);

  const handleManualDraftFieldChange = (
    rowId: string,
    field:
      | 'title'
      | 'abstract'
      | 'authors_text'
      | 'year_text'
      | 'doi'
      | 'arxiv_id'
      | 'source_url'
      | 'tags_text',
    value: string,
  ) => {
    setManualImportSession((current: ManualImportSession | null) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }
          return {
            ...row,
            [field]: value,
          };
        }),
      };
    });
  };

  const handleToggleManualRowInclude = (rowId: string, include: boolean) => {
    setManualImportSession((current: ManualImportSession | null) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        rows: current.rows.map((row) =>
          row.id === rowId
            ? {
              ...row,
              include,
            }
            : row),
      };
    });
  };

  const handleRemoveManualRow = (rowId: string) => {
    setManualImportSession((current: ManualImportSession | null) => {
      if (!current) {
        return current;
      }
      const nextRows = current.rows.filter((row) => row.id !== rowId);
      if (nextRows.length === 0) {
        return null;
      }
      return {
        ...current,
        rows: nextRows,
      };
    });
  };

  const handleToggleManualRowPanel = (rowId: string, panel: 'expand' | 'summary') => {
    if (manualOpenRowId === rowId && manualOpenRowPanel === panel) {
      setManualOpenRowId(null);
      setManualOpenRowPanel(null);
      return;
    }
    setManualOpenRowId(rowId);
    setManualOpenRowPanel(panel);
  };

  const handleCopyManualCellValue = async (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // fall through to execCommand fallback
    }

    try {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    } catch {
      // no-op
    }
  };

  return {
    manualDraftRows,
    manualRowValidations,
    manualValidationByRowId,
    manualVisibleRows,
    manualRowStats,
    hasManualSession,
    handleManualDraftFieldChange,
    handleToggleManualRowInclude,
    handleRemoveManualRow,
    handleToggleManualRowPanel,
    handleCopyManualCellValue,
  };
}
