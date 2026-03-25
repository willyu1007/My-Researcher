import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  SetStateAction,
} from 'react';
import type {
  ManualFieldErrorKey,
  ManualFieldErrorMap,
} from '../shared/normalizers';
import type {
  InlineFeedbackModel,
  ManualImportSubTabKey,
  ManualUploadFileItem,
  UiOperationStatus,
  ZoteroAction,
  ZoteroLinkResult,
} from '../shared/types';
import type {
  ManualDraftRow,
  ManualImportPayload,
  ManualImportSession,
  ManualRowValidation,
} from '../manual-import-types';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type ManualImportControllerInput = {
  manualImportSession: ManualImportSession | null;
  setManualImportSession: StateSetter<ManualImportSession | null>;
  manualUploadFiles: ManualUploadFileItem[];
  setManualUploadFiles: StateSetter<ManualUploadFileItem[]>;
  manualShowImportableOnly: boolean;
  manualShowErrorOnly: boolean;
  setManualShowImportableOnly: StateSetter<boolean>;
  setManualShowErrorOnly: StateSetter<boolean>;
  setManualOpenRowId: StateSetter<string | null>;
  setManualOpenRowPanel: StateSetter<'expand' | 'summary' | null>;
  setManualUploadStatus: StateSetter<UiOperationStatus>;
  setManualUploadError: StateSetter<string | null>;
  setManualUploadLoading: StateSetter<boolean>;
  setManualDropActive: StateSetter<boolean>;
  literatureAutoParseDocuments: boolean;
  literatureAutoExtractAbstracts: boolean;
  pushLiteratureFeedback: (feedback: InlineFeedbackModel) => void;
  topicIdInput: string;
  topicId: string;
  paperId: string;
  setTopicId: StateSetter<string>;
  setTopicIdInput: StateSetter<string>;
  setPaperId: StateSetter<string>;
  setPaperIdInput: StateSetter<string>;
  loadTopicScope: (targetTopicId: string) => Promise<void>;
  loadLiteratureOverview: (targetTopicId: string, targetPaperId: string) => Promise<void>;
  loadTopicProfiles: () => Promise<void>;
  loadAutoPullRules: () => Promise<void>;
  loadAutoPullRuns: () => Promise<void>;
  zoteroLibraryId: string;
  zoteroLibraryType: 'users' | 'groups';
  zoteroApiKey: string;
  manualOpenRowId: string | null;
  manualOpenRowPanel: 'expand' | 'summary' | null;
  setZoteroStatus: StateSetter<UiOperationStatus>;
  setZoteroError: StateSetter<string | null>;
  setZoteroLoading: StateSetter<boolean>;
  setZoteroAction: StateSetter<ZoteroAction>;
  setZoteroLinkResult: StateSetter<ZoteroLinkResult>;
  notifyWorkbenchRefresh: () => void;
};

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

export type ManualImportNavigationProps = {
  activeSubTab: ManualImportSubTabKey;
  manualDropActive: boolean;
  setManualDropActive: StateSetter<boolean>;
  manualShowImportableOnly: boolean;
  setManualShowImportableOnly: StateSetter<boolean>;
  manualShowErrorOnly: boolean;
  setManualShowErrorOnly: StateSetter<boolean>;
  manualOpenRowId: string | null;
  manualOpenRowPanel: 'expand' | 'summary' | null;
};

export type ManualImportUploadProps = {
  manualUploadStatus: UiOperationStatus;
  manualUploadLoading: boolean;
  manualUploadError: string | null;
  manualUploadFiles: ManualUploadFileItem[];
};

export type ManualImportZoteroProps = {
  zoteroLibraryType: 'users' | 'groups';
  setZoteroLibraryType: StateSetter<'users' | 'groups'>;
  zoteroLibraryId: string;
  setZoteroLibraryId: StateSetter<string>;
  zoteroApiKey: string;
  setZoteroApiKey: StateSetter<string>;
  zoteroStatus: UiOperationStatus;
  zoteroLoading: boolean;
  zoteroAction: ZoteroAction;
  zoteroLinkResult: ZoteroLinkResult;
  zoteroError: string | null;
};

export type ManualImportSharedProps = {
  manualUploadFormatHint: string;
  updateHelpTooltipAlignment: (target: HTMLElement) => void;
  isManualUploadLlmSupported: (fileName: string) => boolean;
  formatManualUploadFileStatusLabel: (file: ManualUploadFileItem) => string;
  mapManualValidationErrors: (validation?: ManualRowValidation) => ManualFieldErrorMap;
  getManualFieldErrorText: (map: ManualFieldErrorMap, key: ManualFieldErrorKey) => string;
};

export type ManualImportTabProps = {
  active: boolean;
  navigation: ManualImportNavigationProps;
  controller: ManualImportControllerOutput;
  upload: ManualImportUploadProps;
  zotero: ManualImportZoteroProps;
  shared: ManualImportSharedProps;
};

export type ManualImportSessionSource = 'upload' | 'seed' | 'zotero-preview';

export type ApplyManualImportSessionRowsArgs = {
  fileName: string;
  rows: ManualDraftRow[];
  source: ManualImportSessionSource;
};

export type ManualImportSessionMutators = {
  manualImportSession: ManualImportSession | null;
  setManualImportSession: StateSetter<ManualImportSession | null>;
  setManualShowImportableOnly: StateSetter<boolean>;
  setManualShowErrorOnly: StateSetter<boolean>;
  setManualOpenRowId: StateSetter<string | null>;
  setManualOpenRowPanel: StateSetter<'expand' | 'summary' | null>;
  setManualUploadStatus: StateSetter<UiOperationStatus>;
  setManualUploadError: StateSetter<string | null>;
  pushLiteratureFeedback: (feedback: InlineFeedbackModel) => void;
};

export type ManualImportSelectedValidRow = {
  row: ManualDraftRow;
  validation: ManualRowValidation & { normalized: ManualImportPayload };
};
