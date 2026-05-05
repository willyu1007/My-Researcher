import type {
  ChangeEvent,
  DragEvent,
} from 'react';
import { requestGovernance } from '../../shared/api';
import {
  devAutoPullRuleSeeds,
  devInjectedTopicIds,
  devTopicRuleBindingsByTopicId,
  manualImportTestItems,
  manualImportTestTopicProfiles,
} from '../../shared/constants';
import {
  asRecord,
  buildManualUploadDuplicateKey,
  detectManualUploadFileFormat,
  isManualUploadParseSupported,
  normalizeAutoPullRulePayload,
  resolveSystemTimezone,
  toText,
} from '../../shared/normalizers';
import type { ManualUploadFileItem } from '../../shared/types';
import {
  parseManualUploadToDraftRows,
  validateManualDraftRows,
} from '../../manual-import-utils';
import type {
  ManualImportControllerInput,
  ManualImportControllerOutput,
} from '../types';
import { applyManualImportSessionRows } from './manualImportSession';
import { injectTitleCardDemoData } from './titleCardDemoInjection';

type ManualImportUploadOutput = Pick<
  ManualImportControllerOutput,
  | 'handleManualUpload'
  | 'handleManualUploadDrop'
  | 'handleInjectManualImportTestData'
  | 'handleClearInjectedManualImportData'
  | 'handleRemoveManualUploadFile'
>;

export function useManualImportUploadController(input: ManualImportControllerInput): ManualImportUploadOutput {
  const {
    loadAutoPullRules,
    loadAutoPullRuns,
    loadLiteratureOverview,
    loadTopicProfiles,
    loadTopicScope,
    manualImportSession,
    manualUploadFiles,
    pushLiteratureFeedback,
    setManualDropActive,
    setManualImportSession,
    setManualOpenRowId,
    setManualOpenRowPanel,
    setManualShowErrorOnly,
    setManualShowImportableOnly,
    setManualUploadError,
    setManualUploadFiles,
    setManualUploadLoading,
    setManualUploadStatus,
    setPaperId,
    setPaperIdInput,
    setTopicId,
    setTopicIdInput,
    topicId,
    topicIdInput,
    notifyWorkbenchRefresh,
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
    setManualUploadFiles((current) => [...batchFiles, ...current]);

    const updateBatchFile = (id: string, patch: Partial<ManualUploadFileItem>) => {
      setManualUploadFiles((current) =>
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
        .map((item) => buildManualUploadDuplicateKey(item.fileName))
        .filter((value): value is string => Boolean(value)),
    );
    const existingManualTitleKeys = new Set(
      (manualImportSession?.rows ?? [])
        .map((row) => buildManualUploadDuplicateKey(row.title))
        .filter((value): value is string => Boolean(value)),
    );
    const seenBatchUnsupportedKeys = new Set<string>();

    try {
      const parsedRows = [];
      let emptyFiles = 0;
      let failedFiles = 0;
      let acceptedPendingFiles = 0;
      let duplicateFiles = 0;

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

      applyManualImportSessionRows(sessionMutators, {
        fileName: files[0]?.name ?? 'manual-upload',
        rows: parsedRows,
        source: 'upload',
      });
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

    applyManualImportSessionRows(sessionMutators, {
      fileName: 'manual-import-test.json',
      rows,
      source: 'seed',
    });
    const validSeedItems = validateManualDraftRows(rows)
      .filter((entry): entry is typeof entry & { normalized: NonNullable<typeof entry.normalized> } =>
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
    let titleCardSeedError: string | null = null;
    let titleCardSeedResult: Awaited<ReturnType<typeof injectTitleCardDemoData>> | null = null;

    if (validSeedItems.length > 0) {
      try {
        const importPayload = await requestGovernance({
          method: 'POST',
          path: '/literature/collections/import',
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

    try {
      titleCardSeedResult = await injectTitleCardDemoData();
      if (titleCardSeedResult.errors.length > 0) {
        titleCardSeedError = titleCardSeedResult.errors.slice(0, 2).join('；');
      }
    } catch (error) {
      titleCardSeedError = error instanceof Error ? error.message : '题目卡测试数据注入失败。';
    }

    const topicSyncResult = await upsertDevTopicProfiles();
    const ruleSyncResult = await upsertDevAutoPullRules();
    const topicRuleBindingResult = await bindDevRulesToTopics(ruleSyncResult.ruleIdByName);
    const runTriggerResult = await triggerDevRuleRuns([...ruleSyncResult.ruleIdByName.values()]);
    await loadTopicProfiles();
    await loadAutoPullRules();
    await loadAutoPullRuns();
    notifyWorkbenchRefresh();
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
        || titleCardSeedError !== null
          ? 'warning'
          : 'success',
      message:
        `DEV 注入完成：手动入库 新增 ${seedImportNewCount}/去重 ${seedImportDedupCount}/失败 ${seedImportFailedCount}` +
        `；写入选题范围 ${seedScopedCount}` +
        `${seedImportError ? `（入库异常：${seedImportError}）` : ''}` +
        `${seedScopeError ? `（范围异常：${seedScopeError}）` : ''}` +
        `；题目卡 demo 文献 新增 ${titleCardSeedResult?.literatureCreated ?? 0}/复用 ${titleCardSeedResult?.literatureReused ?? 0}/失败 ${titleCardSeedResult?.literatureFailed ?? 0}` +
        `；题目卡 新建 ${titleCardSeedResult?.titleCardsCreated ?? 0}/复用 ${titleCardSeedResult?.titleCardsReused ?? 0}/失败 ${titleCardSeedResult?.titleCardsFailed ?? 0}` +
        `；证据补链 ${titleCardSeedResult?.evidenceLinksAdded ?? 0}` +
        `；流程记录新建 ${titleCardSeedResult?.workflowRecordsCreated ?? 0}` +
        `；晋升 新触发 ${titleCardSeedResult?.promotionsTriggered ?? 0}/已存在 ${titleCardSeedResult?.promotionsSkipped ?? 0}` +
        `${titleCardSeedError ? `（题目卡异常：${titleCardSeedError}）` : ''}` +
        `；主题 新增 ${topicSyncResult.created}/更新 ${topicSyncResult.updated}/失败 ${topicSyncResult.failed}` +
        `；规则 新增 ${ruleSyncResult.created}/更新 ${ruleSyncResult.updated}/失败 ${ruleSyncResult.failed}` +
        `；主题绑定 成功 ${topicRuleBindingResult.updated}/失败 ${topicRuleBindingResult.failed}` +
        `；运行触发 成功 ${runTriggerResult.triggered}/失败 ${runTriggerResult.failed}。`,
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
    for (const injectedTopicId of devInjectedTopicIds) {
      try {
        await requestGovernance({
          method: 'PATCH',
          path: `/topics/settings/${encodeURIComponent(injectedTopicId)}`,
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
    setManualUploadFiles((current) => current.filter((item) => item.id !== fileId));
  };

  return {
    handleManualUpload,
    handleManualUploadDrop,
    handleInjectManualImportTestData,
    handleClearInjectedManualImportData,
    handleRemoveManualUploadFile,
  };
}
