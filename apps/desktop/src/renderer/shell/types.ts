import type { RefObject } from 'react';
import type { ThemeMode } from '../theme';
import type {
  AutoImportSubTabKey,
  ContentProcessingSubTabKey,
  LiteratureTabKey,
  ManualImportSubTabKey,
  TitleCardPrimaryTabKey,
} from '../literature/shared/types';

export type TopbarProps = {
  activeModule: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeLiteratureTab: LiteratureTabKey;
  autoImportSubTab: AutoImportSubTabKey;
  manualImportSubTab: ManualImportSubTabKey;
  contentProcessingSubTab: ContentProcessingSubTabKey;
  literatureTabs: Array<{ key: LiteratureTabKey; label: string }>;
  literatureSubTabsByTab: Partial<Record<LiteratureTabKey, Array<{ key: string; label: string }>>>;
  onSelectLiteratureTab: (tab: LiteratureTabKey) => void;
  onSelectLiteratureSubTab: (tab: LiteratureTabKey, subTab: string) => void;
  activeTitleCardTab: TitleCardPrimaryTabKey;
  activeTitleCardSubTab: string | null;
  titleCardTabs: Array<{ key: TitleCardPrimaryTabKey; label: string }>;
  titleCardSubTabsByTab: Partial<Record<TitleCardPrimaryTabKey, Array<{ key: string; label: string }>>>;
  onSelectTitleCardTab: (tab: TitleCardPrimaryTabKey) => void;
  onSelectTitleCardSubTab: (tab: TitleCardPrimaryTabKey, subTab: string) => void;
  toolbarSearchInput: string;
  onToolbarSearchInputChange: (value: string) => void;
  themeModeOptions: Array<{ value: ThemeMode; label: string }>;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
};

export type SidebarProps = {
  isSidebarCollapsed: boolean;
  coreNavItems: string[];
  writingNavItems: string[];
  activeModule: string;
  onModuleSelect: (moduleName: string) => void;
  settingsPanelOpen: boolean;
  settingsPanelRef: RefObject<HTMLDivElement>;
  isDevMode: boolean;
  onToggleAppMode: () => void;
  onInjectManualImportTestData: () => Promise<void>;
  onClearInjectedManualImportData: () => Promise<void>;
  onToggleSettingsPanel: () => void;
};
