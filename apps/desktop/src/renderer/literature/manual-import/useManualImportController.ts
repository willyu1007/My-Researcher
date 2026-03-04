import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
} from 'react';
import { requestGovernance } from '../shared/api';
import {
  parseManualUploadToDraftRows,
  validateManualDraftRows,
} from '../manual-import-utils';
import {
  devAutoPullRuleSeeds,
  devInjectedTopicIds,
  devTopicRuleBindingsByTopicId,
  emptyZoteroLinkResult,
  manualImportTestItems,
  manualImportTestTopicProfiles,
} from '../shared/constants';
import {
  asRecord,
  buildManualUploadDuplicateKey,
  computeZoteroPreviewResult,
  detectManualUploadFileFormat,
  isManualUploadLlmSupported,
  isManualUploadParseSupported,
  mergeManualDraftRows,
  normalizeAutoPullRulePayload,
  resolveSystemTimezone,
  toText,
} from '../shared/normalizers';
import type { ManualUploadFileItem } from '../shared/types';
import type {
  ManualDraftRow,
  ManualImportPayload,
  ManualImportSession,
  ManualRowValidation,
} from '../manual-import-types';

export type ManualImportControllerInput = Record<string, any>;
export type ManualImportControllerOutput = {
  manualDraftRows: ManualDraftRow[];
  manualRowValidations: ManualRowValidation[];
  manualValidationByRowId: Map<string, ManualRowValidation>;
  manualVisibleRows: ManualDraftRow[];
  manualRowStats: {
    totalCount: number;
    validCount: number;
    invalidCount: number;
    selectedValidCount: number;
    selectedInvalidCount: number;
  };
  hasManualSession: boolean;
  handleManualUploadFileLlmAction: (fileId: string, action: 'parse' | 'abstract') => Promise<void>;
  handleManualUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleManualUploadDrop: (event: DragEvent<HTMLLabelElement>) => Promise<void>;
  handleInjectManualImportTestData: () => Promise<void>;
  handleClearInjectedManualImportData: () => Promise<void>;
  handleRemoveManualUploadFile: (fileId: string) => void;
  handleManualDraftFieldChange: (
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
  ) => void;
  handleToggleManualRowInclude: (rowId: string, include: boolean) => void;
  handleRemoveManualRow: (rowId: string) => void;
  handleToggleManualRowPanel: (rowId: string, panel: 'expand' | 'summary') => void;
  handleCopyManualCellValue: (rawValue: string) => Promise<void>;
  handleSubmitManualReviewedRows: () => Promise<void>;
  handleTestZoteroConnection: () => Promise<void>;
  handleLoadZoteroToReview: () => Promise<void>;
  handleImportFromZotero: () => Promise<void>;
};

export function useManualImportController(input: ManualImportControllerInput): ManualImportControllerOutput {
  const {
    manualImportSession,
    setManualImportSession,
    manualUploadFiles,
    setManualUploadFiles,
    manualShowImportableOnly,
    manualShowErrorOnly,
    setManualShowImportableOnly,
    setManualShowErrorOnly,
    setManualOpenRowId,
    setManualOpenRowPanel,
    setManualUploadStatus,
    setManualUploadError,
    setManualUploadLoading,
    setManualDropActive,
    literatureAutoParseDocuments,
    literatureAutoExtractAbstracts,
    pushLiteratureFeedback,
    topicIdInput,
    topicId,
    paperId,
    setTopicId,
    setTopicIdInput,
    setPaperId,
    setPaperIdInput,
    loadTopicScope,
    loadLiteratureOverview,
    loadTopicProfiles,
    loadAutoPullRules,
    loadAutoPullRuns,
    zoteroLibraryId,
    zoteroLibraryType,
    zoteroApiKey,
    manualOpenRowId,
    manualOpenRowPanel,
    setZoteroStatus,
    setZoteroError,
    setZoteroLoading,
    setZoteroAction,
    setZoteroLinkResult,
  } = input;

  const manualDraftRows: ManualDraftRow[] = manualImportSession?.rows ?? [];
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
    setManualImportSession((current: ManualImportSession | null) => {
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

  const applyManualImportSessionRows = (
    fileName: string,
    rows: ManualDraftRow[],
    source: 'upload' | 'seed' | 'zotero-preview',
  ) => {
    const baseRows = source === 'seed' ? [] : manualImportSession?.rows ?? [];
    const merged = mergeManualDraftRows(baseRows, rows);
    const nextSession: ManualImportSession | null = merged.rows.length > 0
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
  };

  const invokeManualUploadLlmReserved = async (
    action: 'parse' | 'abstract',
    fileName: string,
  ): Promise<void> => {
    // Placeholder hook for future LLM integration.
    void action;
    void fileName;
    await Promise.resolve();
  };

  const pushManualUploadLlmFeedback = (
    action: 'parse' | 'abstract',
    fileName: string,
    trigger: 'manual' | 'auto',
  ) => {
    const actionLabel = action === 'parse' ? '解析' : '提取摘要';
    pushLiteratureFeedback({
      slot: 'manual-import',
      level: 'info',
      message:
        trigger === 'auto'
          ? `已按设置触发「${actionLabel}」：${fileName}（LLM 接口预留）。`
          : `已触发「${actionLabel}」：${fileName}（LLM 接口预留）。`,
    });
  };

  const handleManualUploadFileLlmAction = async (
    fileId: string,
    action: 'parse' | 'abstract',
  ) => {
    const fileItem = manualUploadFiles.find((item: any) => item.id === fileId);
    if (!fileItem || fileItem.status === 'duplicate' || !isManualUploadLlmSupported(fileItem.fileName)) {
      return;
    }

    await invokeManualUploadLlmReserved(action, fileItem.fileName);
    pushManualUploadLlmFeedback(action, fileItem.fileName, 'manual');
  };

  const importManualFilesIntoSession = async (files: File[]) => {
    setManualUploadLoading(true);
    setManualUploadStatus('loading');
    setManualUploadError(null);
    const batchIdPrefix = `manual-upload-${Date.now()}`;
    const batchFiles = files.map((file, index) => ({
      id: `${batchIdPrefix}-${index + 1}`,
      fileName: file.name,
      format: detectManualUploadFileFormat(file.name),
      status: 'processing' as const,
      rowCount: 0,
    }));
    setManualUploadFiles((current: ManualUploadFileItem[]) => [...batchFiles, ...current]);

    const updateBatchFile = (id: string, patch: Partial<ManualUploadFileItem>) => {
      setManualUploadFiles((current: ManualUploadFileItem[]) =>
        current.map((item) =>
          item.id === id
            ? {
              ...item,
              ...patch,
            }
            : item),
      );
    };

    const existingUploadNameKeys = new Set(
      manualUploadFiles
        .map((item: ManualUploadFileItem) => buildManualUploadDuplicateKey(item.fileName))
        .filter((value: string | null): value is string => Boolean(value)),
    );
    const existingManualTitleKeys = new Set(
      (manualImportSession?.rows ?? [])
        .map((row: ManualDraftRow) => buildManualUploadDuplicateKey(row.title))
        .filter((value: string | null): value is string => Boolean(value)),
    );
    const seenBatchUnsupportedKeys = new Set<string>();

    try {
      const parsedRows: ManualDraftRow[] = [];
      let emptyFiles = 0;
      let failedFiles = 0;
      let acceptedPendingFiles = 0;
      let duplicateFiles = 0;
      const acceptedPendingFileNames: string[] = [];

      const triggerAutoLlmActions = () => {
        if (acceptedPendingFileNames.length === 0) {
          return;
        }
        if (literatureAutoParseDocuments) {
          for (const fileName of acceptedPendingFileNames) {
            void invokeManualUploadLlmReserved('parse', fileName);
            pushManualUploadLlmFeedback('parse', fileName, 'auto');
          }
        }
        if (literatureAutoExtractAbstracts) {
          for (const fileName of acceptedPendingFileNames) {
            void invokeManualUploadLlmReserved('abstract', fileName);
            pushManualUploadLlmFeedback('abstract', fileName, 'auto');
          }
        }
      };

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const batchItem = batchFiles[index];
        if (!isManualUploadParseSupported(file.name)) {
          const duplicateKey = buildManualUploadDuplicateKey(file.name);
          const isDuplicate = Boolean(
            duplicateKey
            && (
              existingUploadNameKeys.has(duplicateKey)
              || existingManualTitleKeys.has(duplicateKey)
              || seenBatchUnsupportedKeys.has(duplicateKey)
            ),
          );
          if (isDuplicate) {
            duplicateFiles += 1;
            updateBatchFile(batchItem.id, {
              status: 'duplicate',
              rowCount: 0,
            });
            continue;
          }
          if (duplicateKey) {
            existingUploadNameKeys.add(duplicateKey);
            seenBatchUnsupportedKeys.add(duplicateKey);
          }
          acceptedPendingFiles += 1;
          acceptedPendingFileNames.push(file.name);
          updateBatchFile(batchItem.id, {
            status: 'accepted',
            rowCount: 0,
          });
          continue;
        }

        try {
          const content = await file.text();
          const rows = parseManualUploadToDraftRows(file.name, content);
          if (rows.length === 0) {
            emptyFiles += 1;
            updateBatchFile(batchItem.id, {
              status: 'empty',
              rowCount: 0,
            });
            continue;
          }
          parsedRows.push(...rows);
          updateBatchFile(batchItem.id, {
            status: 'parsed',
            rowCount: rows.length,
          });
        } catch {
          failedFiles += 1;
          updateBatchFile(batchItem.id, {
            status: 'failed',
            rowCount: 0,
          });
        }
      }

      if (parsedRows.length === 0) {
        if (acceptedPendingFiles > 0 || duplicateFiles > 0) {
          setManualUploadStatus('ready');
          setManualUploadError(null);
          triggerAutoLlmActions();
          pushLiteratureFeedback({
            slot: 'manual-import',
            level: duplicateFiles > 0 ? 'warning' : 'info',
            message:
              duplicateFiles > 0
                ? `已接收 ${acceptedPendingFiles} 个文件待后续解析支持，检测到重复 ${duplicateFiles} 个文件（仅允许移除）。`
                : `已接收 ${acceptedPendingFiles} 个文件，当前版本暂不支持其自动解析（如 PDF / TeX / BBL / AUX / RIS）。`,
          });
          return;
        }
        const message = '未解析到可导入文献，请检查文件格式（JSON/CSV/BibTeX）。';
        setManualUploadStatus('empty');
        setManualUploadError(message);
        pushLiteratureFeedback({
          slot: 'manual-import',
          level: 'warning',
          message,
        });
        return;
      }

      applyManualImportSessionRows(files[0]?.name ?? 'manual-upload', parsedRows, 'upload');
      triggerAutoLlmActions();
      if (emptyFiles > 0 || failedFiles > 0 || acceptedPendingFiles > 0 || duplicateFiles > 0) {
        pushLiteratureFeedback({
          slot: 'manual-import',
          level: 'warning',
          message: `额外提示：${emptyFiles} 个文件未解析到条目，${failedFiles} 个文件解析失败，${acceptedPendingFiles} 个文件已接收待后续解析支持，重复 ${duplicateFiles} 个。`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件解析失败。';
      setManualUploadStatus('error');
      setManualUploadError(message);
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: `文件解析失败：${message}`,
      });
    } finally {
      setManualUploadLoading(false);
      setManualDropActive(false);
    }
  };

  const handleManualUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }
    await importManualFilesIntoSession(files);
    event.target.value = '';
  };

  const handleManualUploadDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) {
      return;
    }
    await importManualFilesIntoSession(files);
  };

  const upsertDevTopicProfiles = async (): Promise<{ created: number; updated: number; failed: number }> => {
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const payload of manualImportTestTopicProfiles) {
      try {
        await requestGovernance({
          method: 'POST',
          path: '/topics/settings',
          body: payload,
        });
        created += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const shouldPatch = message.includes('already exists') || message.includes('VERSION_CONFLICT');
        if (!shouldPatch) {
          failed += 1;
          continue;
        }
        try {
          await requestGovernance({
            method: 'PATCH',
            path: `/topics/settings/${encodeURIComponent(payload.topic_id)}`,
            body: {
              name: payload.name,
              is_active: payload.is_active,
              include_keywords: payload.include_keywords,
              exclude_keywords: payload.exclude_keywords,
              venue_filters: payload.venue_filters,
              default_lookback_days: payload.default_lookback_days,
              default_min_year: payload.default_min_year,
              default_max_year: payload.default_max_year,
              rule_ids: payload.rule_ids,
            },
          });
          updated += 1;
        } catch {
          failed += 1;
        }
      }
    }

    return { created, updated, failed };
  };

  const upsertDevAutoPullRules = async (): Promise<{
    created: number;
    updated: number;
    failed: number;
    ruleIdByName: Map<string, string>;
  }> => {
    let created = 0;
    let updated = 0;
    let failed = 0;
    const ruleIdByName = new Map<string, string>();
    const scheduleTimezone = resolveSystemTimezone();
    const existingRuleIdByName = new Map<string, string>();

    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: '/auto-pull/rules',
      });
      const existingRules = normalizeAutoPullRulePayload(payload);
      existingRules.forEach((rule) => {
        existingRuleIdByName.set(rule.name, rule.rule_id);
      });
    } catch {
      // Best effort: continue and try create flow.
    }

    for (const seed of devAutoPullRuleSeeds) {
      const body = {
        scope: seed.scope,
        name: seed.name,
        query_spec: {
          include_keywords: seed.include_keywords,
          exclude_keywords: seed.exclude_keywords,
          authors: [],
          venues: seed.venues,
          max_results_per_source: 20,
        },
        time_spec: {
          lookback_days: seed.lookback_days,
          min_year: seed.min_year,
          max_year: seed.max_year,
        },
        quality_spec: {
          min_quality_score: seed.min_quality_score,
        },
        sources: [
          {
            source: 'CROSSREF' as const,
            enabled: true,
            priority: 10,
          },
          {
            source: 'ARXIV' as const,
            enabled: true,
            priority: 20,
          },
        ],
        schedules: [
          {
            frequency: 'DAILY' as const,
            days_of_week: [],
            hour: 9,
            minute: 0,
            timezone: scheduleTimezone,
            active: true,
          },
        ],
      };

      const existingRuleId = existingRuleIdByName.get(seed.name);
      if (existingRuleId) {
        try {
          await requestGovernance({
            method: 'PATCH',
            path: `/auto-pull/rules/${encodeURIComponent(existingRuleId)}`,
            body,
          });
          updated += 1;
          ruleIdByName.set(seed.name, existingRuleId);
        } catch {
          failed += 1;
        }
        continue;
      }

      try {
        const createPayload = await requestGovernance({
          method: 'POST',
          path: '/auto-pull/rules',
          body,
        });
        const root = asRecord(createPayload);
        const createdRuleId =
          toText(root?.rule_id)
          ?? toText(asRecord(root?.item)?.rule_id)
          ?? toText(asRecord(root?.rule)?.rule_id)
          ?? null;
        if (!createdRuleId) {
          failed += 1;
          continue;
        }
        created += 1;
        existingRuleIdByName.set(seed.name, createdRuleId);
        ruleIdByName.set(seed.name, createdRuleId);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const shouldResolveAgain = message.includes('already exists') || message.includes('VERSION_CONFLICT');
        if (!shouldResolveAgain) {
          failed += 1;
          continue;
        }
        try {
          const refetchPayload = await requestGovernance({
            method: 'GET',
            path: '/auto-pull/rules',
          });
          const matchedRuleId = normalizeAutoPullRulePayload(refetchPayload).find((rule) => rule.name === seed.name)?.rule_id;
          if (!matchedRuleId) {
            failed += 1;
            continue;
          }
          await requestGovernance({
            method: 'PATCH',
            path: `/auto-pull/rules/${encodeURIComponent(matchedRuleId)}`,
            body,
          });
          existingRuleIdByName.set(seed.name, matchedRuleId);
          ruleIdByName.set(seed.name, matchedRuleId);
          updated += 1;
        } catch {
          failed += 1;
        }
      }
    }

    return {
      created,
      updated,
      failed,
      ruleIdByName,
    };
  };

  const bindDevRulesToTopics = async (
    ruleIdByName: Map<string, string>,
  ): Promise<{ updated: number; failed: number }> => {
    let updated = 0;
    let failed = 0;

    for (const topic of manualImportTestTopicProfiles) {
      const ruleNames = devTopicRuleBindingsByTopicId[topic.topic_id] ?? [];
      const ruleIds = ruleNames
        .map((name) => ruleIdByName.get(name))
        .filter((ruleId): ruleId is string => Boolean(ruleId));
      try {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(topic.topic_id)}`,
          body: {
            rule_ids: ruleIds,
          },
        });
        updated += 1;
      } catch {
        failed += 1;
      }
    }

    return { updated, failed };
  };

  const triggerDevRuleRuns = async (
    ruleIds: string[],
  ): Promise<{ triggered: number; failed: number }> => {
    let triggered = 0;
    let failed = 0;
    const uniqueRuleIds = [...new Set(ruleIds)];

    for (const ruleId of uniqueRuleIds) {
      try {
        await requestGovernance({
          method: 'POST',
          path: `/auto-pull/rules/${encodeURIComponent(ruleId)}/runs`,
          body: {
            trigger_type: 'MANUAL',
            full_refresh: false,
          },
        });
        triggered += 1;
      } catch {
        failed += 1;
      }
    }

    return { triggered, failed };
  };

  const handleInjectManualImportTestData = async () => {
    const rows = parseManualUploadToDraftRows('manual-import-test.json', JSON.stringify(manualImportTestItems));
    if (rows.length === 0) {
      pushLiteratureFeedback({
        slot: 'manual-import',
        level: 'error',
        message: '测试数据注入失败，请检查样例数据。',
      });
      return;
    }

    applyManualImportSessionRows('manual-import-test.json', rows, 'seed');
    const validSeedItems = validateManualDraftRows(rows)
      .filter((entry): entry is ManualRowValidation & { normalized: ManualImportPayload } =>
        entry.is_valid && Boolean(entry.normalized),
      )
      .map((entry) => entry.normalized);
    const activeTopicId = topicIdInput.trim() || topicId.trim();
    let seedImportNewCount = 0;
    let seedImportDedupCount = 0;
    let seedImportFailedCount = 0;
    let seedScopedCount = 0;
    let seedImportError: string | null = null;
    let seedScopeError: string | null = null;

    if (validSeedItems.length > 0) {
      try {
        const importPayload = await requestGovernance({
          method: 'POST',
          path: '/literature/import',
          body: {
            items: validSeedItems,
          },
        });
        const importRoot = asRecord(importPayload);
        const importResults = Array.isArray(importRoot?.results) ? importRoot.results : [];
        const normalizedImportResults = importResults
          .map((item) => asRecord(item))
          .filter((item): item is Record<string, unknown> => item !== null);

        seedImportNewCount = normalizedImportResults.filter((item) => item.is_new === true).length;
        seedImportDedupCount = normalizedImportResults.filter((item) => item.is_new === false).length;
        seedImportFailedCount = Math.max(0, validSeedItems.length - normalizedImportResults.length);

        const importedLiteratureIds = normalizedImportResults
          .map((item) => toText(item.literature_id))
          .filter((item): item is string => Boolean(item));

        if (activeTopicId && importedLiteratureIds.length > 0) {
          try {
            await requestGovernance({
              method: 'POST',
              path: `/topics/${encodeURIComponent(activeTopicId)}/literature-scope`,
              body: {
                actions: importedLiteratureIds.map((literatureId) => ({
                  literature_id: literatureId,
                  scope_status: 'in_scope',
                  reason: 'DEV 注入测试数据',
                })),
              },
            });
            seedScopedCount = importedLiteratureIds.length;
            setTopicId(activeTopicId);
            setTopicIdInput(activeTopicId);
            setPaperId('');
            setPaperIdInput('');
            await loadTopicScope(activeTopicId);
            await loadLiteratureOverview(activeTopicId, '');
          } catch (error) {
            seedScopeError = error instanceof Error ? error.message : '注入后写入选题范围失败。';
          }
        }
      } catch (error) {
        seedImportError = error instanceof Error ? error.message : '注入后自动入库失败。';
      }
    }

    const topicSyncResult = await upsertDevTopicProfiles();
    const ruleSyncResult = await upsertDevAutoPullRules();
    const topicRuleBindingResult = await bindDevRulesToTopics(ruleSyncResult.ruleIdByName);
    const runTriggerResult = await triggerDevRuleRuns([...ruleSyncResult.ruleIdByName.values()]);
    await loadTopicProfiles();
    await loadAutoPullRules();
    await loadAutoPullRuns();
    pushLiteratureFeedback({
      slot: 'auto-import',
      level:
        topicSyncResult.failed > 0
        || ruleSyncResult.failed > 0
        || topicRuleBindingResult.failed > 0
        || runTriggerResult.failed > 0
        || seedImportFailedCount > 0
        || seedImportError !== null
        || seedScopeError !== null
          ? 'warning'
          : 'success',
      message: `DEV 注入完成：手动入库 新增 ${seedImportNewCount}/去重 ${seedImportDedupCount}/失败 ${seedImportFailedCount}；写入选题范围 ${seedScopedCount}${seedImportError ? `（入库异常：${seedImportError}）` : ''}${seedScopeError ? `（范围异常：${seedScopeError}）` : ''}；主题 新增 ${topicSyncResult.created}/更新 ${topicSyncResult.updated}/失败 ${topicSyncResult.failed}；规则 新增 ${ruleSyncResult.created}/更新 ${ruleSyncResult.updated}/失败 ${ruleSyncResult.failed}；主题绑定 成功 ${topicRuleBindingResult.updated}/失败 ${topicRuleBindingResult.failed}；运行触发 成功 ${runTriggerResult.triggered}/失败 ${runTriggerResult.failed}。`,
    });
  };

  const handleClearInjectedManualImportData = async () => {
    setManualImportSession(null);
    setManualUploadFiles([]);
    setManualShowImportableOnly(false);
    setManualShowErrorOnly(false);
    setManualOpenRowId(null);
    setManualOpenRowPanel(null);
    setManualUploadStatus('idle');
    setManualUploadError(null);

    let deactivated = 0;
    for (const topicId of devInjectedTopicIds) {
      try {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(topicId)}`,
          body: {
            is_active: false,
          },
        });
        deactivated += 1;
      } catch {
        // Ignore missing DEV topics on clear.
      }
    }
    if (deactivated > 0) {
      await loadTopicProfiles();
    }

    pushLiteratureFeedback({
      slot: 'manual-import',
      level: 'info',
      message: `已取消注入数据并清空当前手动导入草稿。DEV 主题停用 ${deactivated} 个。`,
    });
  };

  const handleRemoveManualUploadFile = (fileId: string) => {
    setManualUploadFiles((current: ManualUploadFileItem[]) => current.filter((item) => item.id !== fileId));
  };

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
      .map((row: ManualDraftRow) => ({
        row,
        validation: manualValidationByRowId.get(row.id),
      }))
      .filter(
        (entry: any): entry is { row: ManualDraftRow; validation: ManualRowValidation & { normalized: ManualImportPayload } } =>
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
      const importItems = selectedValidRows.map(
        (entry: { validation: ManualRowValidation & { normalized: ManualImportPayload } }) =>
          entry.validation.normalized,
      );

      const payload = await requestGovernance({
        method: 'POST',
        path: '/literature/import',
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
        const selectedRowIds = new Set(
          selectedValidRows.map((entry: { row: ManualDraftRow }) => entry.row.id),
        );
        setManualImportSession((current: ManualImportSession | null) => {
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
      applyManualImportSessionRows(sessionName, previewResult.rows, 'zotero-preview');
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
      setZoteroLinkResult((current: any) => ({
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
    manualDraftRows,
    manualRowValidations,
    manualValidationByRowId,
    manualVisibleRows,
    manualRowStats,
    hasManualSession,
    handleManualUploadFileLlmAction,
    handleManualUpload,
    handleManualUploadDrop,
    handleInjectManualImportTestData,
    handleClearInjectedManualImportData,
    handleRemoveManualUploadFile,
    handleManualDraftFieldChange,
    handleToggleManualRowInclude,
    handleRemoveManualRow,
    handleToggleManualRowPanel,
    handleCopyManualCellValue,
    handleSubmitManualReviewedRows,
    handleTestZoteroConnection,
    handleLoadZoteroToReview,
    handleImportFromZotero,
  };
}
