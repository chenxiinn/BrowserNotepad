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
        <h1>📝 备忘录</h1>
        <div className="view-mode-buttons">
          <button className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="列表视图">📋</button>
          <button className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')} title="分栏视图">📖</button>
        </div>
      </div>
      <div className="header-right">
        {isSaving && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>保存中...</span>}
        {lastSaved && !isSaving && <span style={{ fontSize: '12px', color: 'var(--success-color)' }}>✓ 已保存</span>}
        {mode === 'sidePanel' && (
          <button className="icon-btn" onClick={onOpenFloating} title="在新窗口中打开">🪟</button>
        )}
        {mode === 'floating' && (
          <button className="icon-btn" onClick={onOpenSidePanel} title="在侧边栏中打开">📑</button>
        )}
        <button className="icon-btn" onClick={onToggleTheme} title={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button className="icon-btn" onClick={onSettingsToggle} title="设置">⚙️</button>
        {mode === 'floating' && (
          <button className="icon-btn" onClick={onCloseWindow} title="关闭当前窗口">✕</button>
        )}
        <button className="icon-btn" onClick={onExportAll} title="导出所有笔记 (Markdown)">📤</button>
        {hasSelectedNote && (
          <button className="icon-btn" onClick={onExportSingle} title="导出当前笔记 (Markdown)">📄</button>
        )}
        <button className="btn-primary" onClick={onNewNote}>+ 新建</button>
      </div>
    </header>
  );
}