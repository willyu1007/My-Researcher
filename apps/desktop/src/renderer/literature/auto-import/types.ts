import type {
  CSSProperties,
  Dispatch,
  SetStateAction,
} from 'react';
import type {
  AutoImportSubTabKey,
  AutoPullFrequency,
  AutoPullRule,
  AutoPullRun,
  AutoPullRunStatus,
  AutoPullSortMode,
  AutoPullTopicProfile,
  AutoPullWeekday,
  InlineFeedbackModel,
  UiOperationStatus,
} from '../shared/types';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export type AutoImportSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

export type AutoImportRecordReader = (value: unknown) => Record<string, unknown> | null;
export type AutoImportTextReader = (value: unknown) => string | undefined;
export type AutoImportRuleSubmitOptions = {
  resetOnSuccess?: boolean;
  notifyOnSuccess?: boolean;
};

export type AutoImportControllerInput = {
  runsFilterStatus: '' | AutoPullRunStatus | 'EXCEPTION';
  pushLiteratureFeedback: (feedback: InlineFeedbackModel) => void;
  setTopicProfilesStatus: StateSetter<UiOperationStatus>;
  setTopicProfilesError: StateSetter<string | null>;
  setTopicProfiles: StateSetter<AutoPullTopicProfile[]>;
  setRulesStatus: StateSetter<UiOperationStatus>;
  setRulesError: StateSetter<string | null>;
  setAutoPullRules: StateSetter<AutoPullRule[]>;
  setRunsStatus: StateSetter<UiOperationStatus>;
  setRunsError: StateSetter<string | null>;
  setAutoPullRuns: StateSetter<AutoPullRun[]>;
  setSelectedRunDetail: StateSetter<AutoPullRun | null>;
  setRunDetailError: StateSetter<string | null>;
  setRunDetailLoading: StateSetter<boolean>;
  setTopicEditingId: StateSetter<string | null>;
  setTopicFormTopicId: StateSetter<string>;
  setTopicFormName: StateSetter<string>;
  setTopicFormIsActive: StateSetter<boolean>;
  setTopicFormInitialPullPending: StateSetter<boolean>;
  setTopicFormIncludeKeywords: StateSetter<string[]>;
  setTopicFormIncludeDraft: StateSetter<string>;
  setTopicFormExcludeKeywords: StateSetter<string[]>;
  setTopicFormExcludeDraft: StateSetter<string>;
  setTopicFormVenueSelections: StateSetter<string[]>;
  setTopicVenuePickerOpen: StateSetter<boolean>;
  setTopicFormLookbackInput: StateSetter<string>;
  setTopicFormYearStart: StateSetter<number>;
  setTopicFormYearEnd: StateSetter<number>;
  setTopicFormRuleIds: StateSetter<string[]>;
  setTopicFormModalOpen: StateSetter<boolean>;
  setAutoImportSubTab: StateSetter<AutoImportSubTabKey>;
  setRuleEditingId: StateSetter<string | null>;
  setRuleFormMaxResultsInput: StateSetter<string>;
  setRuleFormLookbackInput: StateSetter<string>;
  setRuleFormMinCompletenessInput: StateSetter<string>;
  setRuleFormFrequency: StateSetter<AutoPullFrequency>;
  setRuleFormWeekday: StateSetter<AutoPullWeekday>;
  setRuleFormHourInput: StateSetter<string>;
  setRuleFormSortMode: StateSetter<AutoPullSortMode>;
  setRuleSourceCrossref: StateSetter<boolean>;
  setRuleSourceArxiv: StateSetter<boolean>;
  autoPullRules: AutoPullRule[];
  autoPullRuns: AutoPullRun[];
  runsPageIndex: number;
  setRunsPageIndex: StateSetter<number>;
  selectedRunDetail: AutoPullRun | null;
  topicFormIncludeDraft: string;
  topicFormExcludeDraft: string;
  topicFormYearStart: number;
  topicFormYearEnd: number;
  topicFormName: string;
  topicFormTopicId: string;
  topicFormRuleIds: string[];
  topicFormIsActive: boolean;
  topicFormInitialPullPending: boolean;
  topicFormIncludeKeywords: string[];
  topicFormExcludeKeywords: string[];
  topicFormVenueSelections: string[];
  topicFormLookbackInput: string;
  topicEditingId: string | null;
  topicProfiles: AutoPullTopicProfile[];
  topicProfilesStatus: UiOperationStatus;
  rulesStatus: UiOperationStatus;
  runsStatus: UiOperationStatus;
  ruleFormHourInput: string;
  ruleFormMaxResultsInput: string;
  ruleFormLookbackInput: string;
  ruleFormMinCompletenessInput: string;
  ruleFormFrequency: AutoPullFrequency;
  ruleFormWeekday: AutoPullWeekday;
  ruleFormSortMode: AutoPullSortMode;
  ruleSourceCrossref: boolean;
  ruleSourceArxiv: boolean;
  ruleEditingId: string | null;
  topicPresetVenueOptions: readonly string[];
  asRecord?: AutoImportRecordReader;
  toText?: AutoImportTextReader;
};

export type AutoImportControllerOutput = {
  topicScopedRules: AutoPullRule[];
  topicSettingsSummaryStats: { totalCount: number; activeCount: number };
  autoPullRuleById: Map<string, AutoPullRule>;
  latestRunByRuleId: Map<string, AutoPullRun>;
  runsTotalPages: number;
  runsPageItems: AutoPullRun[];
  selectedRunTopicLabel: string;
  selectedRunPulledAtLabel: string;
  selectedRunDurationLabel: string;
  topicVenueOptions: string[];
  topicAutoIdPreview: string;
  topicYearLowerBound: number;
  topicYearUpperBound: number;
  topicYearRangeTrackStyle: CSSProperties;
  topicVenueSelectionLabel: string;
  autoPullStatusDigest: string;
  loadTopicProfiles: () => Promise<void>;
  loadAutoPullRules: () => Promise<void>;
  loadAutoPullRuns: () => Promise<void>;
  loadAutoPullRunDetail: (runId: string) => Promise<void>;
  handleOpenCreateTopicProfile: () => void;
  handleCloseTopicModal: () => void;
  handleOpenRuleCenter: () => void;
  handleEditTopicProfile: (profile: AutoPullTopicProfile) => void;
  handleSetTopicRuleBinding: (ruleId: string) => void;
  handleAddTopicIncludeKeyword: () => void;
  handleRemoveTopicIncludeKeyword: (value: string) => void;
  handleAddTopicExcludeKeyword: () => void;
  handleRemoveTopicExcludeKeyword: (value: string) => void;
  handleToggleTopicVenueSelection: (venue: string) => void;
  applyTopicYearPreset: (preset: 'recent-5' | 'recent-10' | 'all') => void;
  handleSubmitTopicProfile: () => Promise<void>;
  handleToggleTopicProfileActive: (profile: AutoPullTopicProfile) => Promise<void>;
  handleResetRuleComposer: () => void;
  handleEditRule: (rule: AutoPullRule) => void;
  handleSubmitRule: (options?: AutoImportRuleSubmitOptions) => Promise<boolean>;
  handleDeleteRule: (rule: AutoPullRule) => Promise<void>;
  handleRetryRun: (runId: string) => Promise<void>;
};

export type AutoImportNavigationProps = {
  activeSubTab: AutoImportSubTabKey;
};

export type AutoImportTopicFormProps = {
  topicProfiles: AutoPullTopicProfile[];
  topicProfilesError: string | null;
  topicFormModalOpen: boolean;
  topicEditingId: string | null;
  topicFormTopicId: string;
  topicFormName: string;
  setTopicFormName: StateSetter<string>;
  topicFormInitialPullPending: boolean;
  setTopicFormInitialPullPending: StateSetter<boolean>;
  topicFormIncludeDraft: string;
  setTopicFormIncludeDraft: StateSetter<string>;
  topicFormIncludeKeywords: string[];
  topicFormExcludeDraft: string;
  setTopicFormExcludeDraft: StateSetter<string>;
  topicFormExcludeKeywords: string[];
  topicFormVenueSelections: string[];
  setTopicFormVenueSelections: StateSetter<string[]>;
  topicVenuePickerOpen: boolean;
  setTopicVenuePickerOpen: StateSetter<boolean>;
  topicFormYearStart: number;
  setTopicFormYearStart: StateSetter<number>;
  topicFormYearEnd: number;
  setTopicFormYearEnd: StateSetter<number>;
  topicFormRuleIds: string[];
};

export type AutoImportRuleFormProps = {
  ruleFormFrequency: AutoPullFrequency;
  setRuleFormFrequency: StateSetter<AutoPullFrequency>;
  ruleFormHourInput: string;
  setRuleFormHourInput: StateSetter<string>;
  ruleFormLookbackInput: string;
  setRuleFormLookbackInput: StateSetter<string>;
  ruleFormMaxResultsInput: string;
  setRuleFormMaxResultsInput: StateSetter<string>;
  ruleFormMinCompletenessInput: string;
  setRuleFormMinCompletenessInput: StateSetter<string>;
  ruleFormSortMode: AutoPullSortMode;
  setRuleFormSortMode: StateSetter<AutoPullSortMode>;
  ruleFormWeekday: AutoPullWeekday;
  setRuleFormWeekday: StateSetter<AutoPullWeekday>;
  ruleSourceArxiv: boolean;
  setRuleSourceArxiv: StateSetter<boolean>;
  ruleSourceCrossref: boolean;
  setRuleSourceCrossref: StateSetter<boolean>;
  rulesError: string | null;
};

export type AutoImportRunsProps = {
  runsFilterStatus: '' | AutoPullRunStatus | 'EXCEPTION';
  setRunsFilterStatus: StateSetter<'' | AutoPullRunStatus | 'EXCEPTION'>;
  runsPageIndex: number;
  setRunsPageIndex: StateSetter<number>;
  autoPullRuns: AutoPullRun[];
  runsError: string | null;
  runDetailError: string | null;
  runDetailLoading: boolean;
  selectedRunDetail: AutoPullRun | null;
};

export type AutoImportSharedProps = {
  autoPullStatusDigest: string;
  asRecord: AutoImportRecordReader;
  autoPullHourOptions: AutoImportSelectOption[];
  autoPullLimitHint: string;
  autoPullLookbackHint: string;
  autoPullQualityHint: string;
  autoPullQualityPresetOptions: AutoImportSelectOption[];
  autoPullRunStatusLabels: Record<AutoPullRunStatus, string>;
  autoPullSortHint: string;
  autoPullWeekdayOptions: AutoImportSelectOption<AutoPullWeekday>[];
  formatTimestamp: (value: string) => string;
  resolveRunSortTimestamp: (run: AutoPullRun) => string;
  topicYearMinBound: number;
  topicYearMaxBound: number;
  updateHelpTooltipAlignment: (target: HTMLElement) => void;
};

export type AutoImportTabProps = {
  active: boolean;
  navigation: AutoImportNavigationProps;
  controller: AutoImportControllerOutput;
  topicForm: AutoImportTopicFormProps;
  ruleForm: AutoImportRuleFormProps;
  runs: AutoImportRunsProps;
  shared: AutoImportSharedProps;
};

export type AutoImportRuleEditorMode = 'schedule' | 'source' | 'advanced';
export type AutoImportRuleEditorState = {
  ruleId: string | null;
  mode: AutoImportRuleEditorMode;
  name: string;
};
