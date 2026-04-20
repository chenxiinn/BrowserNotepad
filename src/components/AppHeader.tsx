import type { AppMode } from '../hooks/useMode';
import type { Theme } from '../hooks/useTheme';

interface AppHeaderProps {
  viewMode: 'list' | 'editor';
  setViewMode: (mode: 'list' | 'editor') => void;
  theme: Theme;
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
  onBackToList: () => void;
}

export function AppHeader({
  viewMode, setViewMode, theme,
  onNewNote, onExportAll, onExportSingle,
  onOpenFloating, onOpenSidePanel, onCloseWindow,
  onSettingsToggle, hasSelectedNote,
  mode, isSaving, lastSaved, onBackToList,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-left">
        {viewMode === 'editor' && hasSelectedNote ? (
          <button className="icon-btn" onClick={onBackToList} title="返回列表">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        ) : null}
        <h1>备忘录</h1>
      </div>
      <div className="header-right">
        {isSaving && <span className="save-indicator">保存中...</span>}
        {lastSaved && !isSaving && <span className="save-indicator saved">✓</span>}
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
        <button className="icon-btn" onClick={onSettingsToggle} title="设置">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        {mode === 'floating' && (
          <button className="icon-btn" onClick={onCloseWindow} title="关闭窗口">
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
        <button className="btn-primary" onClick={onNewNote}>
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建
        </button>
      </div>
    </header>
  );
}