import type { SidebarProps } from '../types';

export function Sidebar({
  isSidebarCollapsed,
  coreNavItems,
  writingNavItems,
  activeModule,
  onModuleSelect,
  settingsPanelOpen,
  settingsPanelRef,
  isDevMode,
  onToggleAppMode,
  onInjectManualImportTestData,
  onClearInjectedManualImportData,
  onToggleSettingsPanel,
}: SidebarProps) {
  return (
    <aside className="sidebar-pane">
      {!isSidebarCollapsed ? (
        <>
          <nav className="sidebar-nav-zones" aria-label="模块导航">
            <section className="sidebar-nav-zone sidebar-nav-zone-core">
              <div className="module-nav-list">
                {coreNavItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`module-nav-item${activeModule === item ? ' is-active' : ''}`}
                    onClick={() => onModuleSelect(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
            <section className="sidebar-nav-zone sidebar-nav-zone-writing">
              <div className="module-nav-list">
                {writingNavItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`module-nav-item${activeModule === item ? ' is-active' : ''}`}
                    onClick={() => onModuleSelect(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          </nav>
          <div className="sidebar-footer-settings" ref={settingsPanelRef}>
            {settingsPanelOpen ? (
              <div id="sidebar-settings-panel" className="sidebar-settings-popover" role="dialog" aria-label="侧栏设置">
                <div className="sidebar-settings-item">
                  <span className="sidebar-settings-item-label">开发模式</span>
                  <button
                    type="button"
                    className={`sidebar-settings-mode-switch${isDevMode ? ' is-dev' : ''}`}
                    role="switch"
                    aria-checked={isDevMode}
                    aria-label="开发模式开关"
                    onClick={onToggleAppMode}
                  >
                    <span className="sidebar-settings-mode-track" aria-hidden="true">
                      <span className="sidebar-settings-mode-thumb" />
                    </span>
                  </button>
                </div>
                <div className="sidebar-settings-divider" aria-hidden="true" />
                <button
                  type="button"
                  className="sidebar-settings-item sidebar-settings-item-button"
                  onClick={() => void onInjectManualImportTestData()}
                  disabled={!isDevMode}
                >
                  <span>注入测试数据</span>
                  <span className="sidebar-settings-item-arrow" aria-hidden="true">›</span>
                </button>
                <button
                  type="button"
                  className="sidebar-settings-item sidebar-settings-item-button"
                  onClick={() => void onClearInjectedManualImportData()}
                  disabled={!isDevMode}
                >
                  <span>取消注入数据</span>
                  <span className="sidebar-settings-item-arrow" aria-hidden="true">›</span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className={`sidebar-settings-trigger${settingsPanelOpen ? ' is-active' : ''}`}
              onClick={onToggleSettingsPanel}
              aria-expanded={settingsPanelOpen}
              aria-controls="sidebar-settings-panel"
            >
              <span>设置</span>
            </button>
          </div>
        </>
      ) : null}
    </aside>
  );
}
