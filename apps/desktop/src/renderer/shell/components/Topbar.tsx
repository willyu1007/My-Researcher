import type { TopbarProps } from '../types';

export function Topbar({
  activeModule,
  isSidebarCollapsed,
  onToggleSidebar,
  activeLiteratureTab,
  autoImportSubTab,
  manualImportSubTab,
  literatureTabs,
  literatureSubTabsByTab,
  onSelectLiteratureTab,
  onSelectLiteratureSubTab,
  activeTitleCardTab,
  activeTitleCardSubTab,
  titleCardTabs,
  titleCardSubTabsByTab,
  onSelectTitleCardTab,
  onSelectTitleCardSubTab,
  toolbarSearchInput,
  onToolbarSearchInputChange,
  themeModeOptions,
  themeMode,
  onThemeModeChange,
}: TopbarProps) {
  return (
    <header className="topbar">
      <span className="topbar-region topbar-region-left" aria-hidden="true" />
      <span className="topbar-region topbar-region-right" aria-hidden="true" />
      <div className="topbar-inner">
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? '展开导航栏' : '折叠导航栏'}
            title={isSidebarCollapsed ? '展开导航栏' : '折叠导航栏'}
          >
            <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
              <rect x="2.5" y="3.5" width="15" height="13" rx="3.4" />
              {isSidebarCollapsed ? (
                <line x1="12.4" y1="7" x2="12.4" y2="13" />
              ) : (
                <line x1="7.6" y1="7" x2="7.6" y2="13" />
              )}
            </svg>
          </button>
        </div>
        <div className="topbar-center">
          {activeModule === '文献管理' ? (
            <div className="topbar-literature-tabs" role="tablist" aria-label="文献管理标签页">
              {literatureTabs.map((tab) => {
                const subTabs = literatureSubTabsByTab[tab.key] ?? [];
                const activeSubTabKey =
                  tab.key === 'auto-import'
                    ? autoImportSubTab
                    : tab.key === 'manual-import'
                      ? manualImportSubTab
                      : null;
                const shouldShowSubTabs = activeLiteratureTab === tab.key && subTabs.length > 0;
                return (
                  <div
                    key={tab.key}
                    className={`topbar-tab-cluster${activeLiteratureTab === tab.key ? ' is-active' : ''}`}
                  >
                    <button
                      type="button"
                      role="tab"
                      className={`topbar-tab-button${activeLiteratureTab === tab.key ? ' is-active' : ''}`}
                      aria-selected={activeLiteratureTab === tab.key}
                      onClick={() => onSelectLiteratureTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                    {shouldShowSubTabs ? (
                      <div className="topbar-inline-subtabs" role="group" aria-label={`${tab.label} 子标签`}>
                        {subTabs.map((subTab) => {
                          const isSubTabActive =
                            activeLiteratureTab === tab.key && activeSubTabKey === subTab.key;
                          return (
                            <button
                              key={`${tab.key}-${subTab.key}`}
                              type="button"
                              className={`topbar-subtab-button${isSubTabActive ? ' is-active' : ''}`}
                              aria-pressed={isSubTabActive}
                              onClick={() => onSelectLiteratureSubTab(tab.key, subTab.key)}
                            >
                              {subTab.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {activeModule === '选题管理' ? (
            <div className="topbar-literature-tabs" role="tablist" aria-label="选题管理标签页">
              {titleCardTabs.map((tab) => {
                const subTabs = titleCardSubTabsByTab[tab.key] ?? [];
                const shouldShowSubTabs = activeTitleCardTab === tab.key && subTabs.length > 0;
                return (
                  <div
                    key={tab.key}
                    className={`topbar-tab-cluster${activeTitleCardTab === tab.key ? ' is-active' : ''}`}
                  >
                    <button
                      type="button"
                      role="tab"
                      className={`topbar-tab-button${activeTitleCardTab === tab.key ? ' is-active' : ''}`}
                      aria-selected={activeTitleCardTab === tab.key}
                      onClick={() => onSelectTitleCardTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                    {shouldShowSubTabs ? (
                      <div className="topbar-inline-subtabs" role="group" aria-label={`${tab.label} 子标签`}>
                        {subTabs.map((subTab) => {
                          const isSubTabActive =
                            activeTitleCardTab === tab.key && activeTitleCardSubTab === subTab.key;
                          return (
                            <button
                              key={`${tab.key}-${subTab.key}`}
                              type="button"
                              className={`topbar-subtab-button${isSubTabActive ? ' is-active' : ''}`}
                              aria-pressed={isSubTabActive}
                              onClick={() => onSelectTitleCardSubTab(tab.key, subTab.key)}
                            >
                              {subTab.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="topbar-right">
          <label
            className={`topbar-search${toolbarSearchInput.trim().length > 0 ? ' has-value' : ''}`}
            aria-label="搜索（占位）"
          >
            <span className="topbar-search-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" focusable="false">
                <circle cx="8.25" cy="8.25" r="5.25" />
                <line x1="12.3" y1="12.3" x2="17" y2="17" />
              </svg>
            </span>
            <input
              type="text"
              value={toolbarSearchInput}
              onChange={(event) => onToolbarSearchInputChange(event.target.value)}
              placeholder="搜索（占位）"
            />
          </label>
          <span className="topbar-divider" aria-hidden="true" />
          <div className="topbar-theme-switch" role="group" aria-label="配色方案">
            {themeModeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`topbar-theme-switch-item${themeMode === option.value ? ' is-active' : ''}`}
                onClick={() => onThemeModeChange(option.value)}
                aria-pressed={themeMode === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
