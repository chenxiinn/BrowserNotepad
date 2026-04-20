import type { AppMode } from '../hooks/useMode';
import type { Theme } from '../hooks/useTheme';

interface AppHeaderProps {
  viewMode: 'list' | 'split' | 'editor';
  setViewMode: (mode: 'list' | 'split' | 'editor') => void;
  theme: Theme;
  onToggleTheme: () => void;
  onNewNote: () => void;
  onExportAll: () => void;
  onExportSingle: () => void;
  onOpenFloating: () => void;
  onOpenSidePanel: () => void;
  onCloseWindow: () => void;
  onSettingsToggle: () => void;
  hasSelectedNote: boolean;
  mode: AppMode;
  isSaving: boolean;
  lastSaved: Date | null;
}

export function AppHeader({
  viewMode, setViewMode, theme, onToggleTheme,
  onNewNote, onExportAll, onExportSingle,
  onOpenFloating, onOpenSidePanel, onCloseWindow,
  onSettingsToggle, hasSelectedNote,
  mode, isSaving, lastSaved,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-btn" style={{ color: 'var(--cc-accent)' }} onClick={onNewNote} title="新建笔记">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <h1>备忘录</h1>
        <div className="view-mode-buttons">
          <button className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="列表视图">
            <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')} title="分栏视图">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          </button>
        </div>
      </div>
      <div className="header-right">
        {isSaving && <span className="save-indicator">保存中...</span>}
        {lastSaved && !isSaving && <span className="save-indicator saved">✓ 已保存</span>}
        {mode === 'sidePanel' && (
          <button className="icon-btn" onClick={onOpenFloating} title="在新窗口中打开">
            <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        )}
        {mode === 'floating' && (
          <button className="icon-btn" onClick={onOpenSidePanel} title="在侧边栏中打开">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </button>
        )}
        <button className="icon-btn" onClick={onToggleTheme} title={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}>
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          )}
        </button>
        <button className="icon-btn" onClick={onSettingsToggle} title="设置">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        {mode === 'floating' && (
          <button className="icon-btn" onClick={onCloseWindow} title="关闭当前窗口">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
        <button className="icon-btn" onClick={onExportAll} title="导出所有笔记">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        {hasSelectedNote && (
          <button className="icon-btn" onClick={onExportSingle} title="导出当前笔记">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </button>
        )}
      </div>
    </header>
  );
}