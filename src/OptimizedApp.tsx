import React, { useState, useEffect, useRef, useCallback } from 'react';
import { simpleStorage } from './simpleStorage';
import { storageService } from './services/storage';
import { dataExportImportService } from './services/dataExportImportService';
import type { Note } from './types';
import {
  formatRelativeTime,
  truncateText,
  exportNotesToMarkdown,
  exportSingleNoteToMarkdown,
  WINDOW_SIZES
} from './utils';
import { marked } from 'marked';
import './styles/optimized.css';

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
});

type ViewMode = 'list' | 'split' | 'editor';
type WindowSize = 'small' | 'medium' | 'large' | 'custom';
type Theme = 'light' | 'dark';
type ImportMode = 'merge' | 'replace';
type OpenMode = 'sidePanel' | 'floating';

// 主题存储键
const THEME_STORAGE_KEY = 'chrome-note-app-theme';

interface ImportStatus {
  type: 'success' | 'error' | 'warning' | null;
  message: string;
}

function OptimizedApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [windowSize, setWindowSize] = useState<WindowSize>('medium');
  const [customWidth, setCustomWidth] = useState(600);
  const [customHeight, setCustomHeight] = useState(700);
  const [showPreview, setShowPreview] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importPreview, setImportPreview] = useState<{ notesCount: number; categoriesCount: number; tagsCount: number; exportDate?: string } | null>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>({ type: null, message: '' });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [openMode, setOpenMode] = useState<OpenMode>('floating');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 加载主题设置
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 加载打开模式设置
    chrome.storage.local.get('openMode', (result) => {
      if (result.openMode) {
        setOpenMode(result.openMode);
      }
    });

    loadNotes();

    // 点击外部关闭设置面板
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  // 切换打开模式并应用
  const handleToggleOpenMode = (mode: OpenMode) => {
    setOpenMode(mode);
    chrome.storage.local.set({ openMode: mode });

    // 根据模式打开
    if (mode === 'sidePanel') {
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
    } else {
      chrome.runtime.sendMessage({ action: 'openFloatingWindow', width: 400, height: 600 });
    }
  };

  // 打开悬浮窗（独立窗口，手动关闭）
  const handleOpenFloatingWindow = () => {
    chrome.runtime.sendMessage({ action: 'openFloatingWindow', width: 450, height: 700 });
  };

  // 关闭当前悬浮窗
  const handleCloseWindow = () => {
    chrome.runtime.sendMessage({ action: 'closeFloatingWindow' });
  };

  const loadNotes = async () => {
    const data = await simpleStorage.getNotes();
    setNotes(data);

    // 使用 chrome.storage.local 存储最后打开的笔记（跨窗口共享）
    chrome.storage.local.get('lastOpenedNoteId', (result) => {
      const lastNoteId = result.lastOpenedNoteId;
      if (lastNoteId && data.length > 0) {
        const lastNote = data.find(n => n.id === lastNoteId);
        if (lastNote) {
          setSelectedNote(lastNote);
          setEditTitle(lastNote.title);
          setEditContent(lastNote.content);
          setViewMode('split');
        }
      }
      setLoading(false);
    });
  };

  // 保存最后打开的笔记
  const saveLastOpenedNote = (noteId: string) => {
    chrome.storage.local.set({ lastOpenedNoteId: noteId });
  };

  const handleCreateNote = async () => {
    const newNote = await simpleStorage.createNote('', '');
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditTitle('');
    setEditContent('');
    setViewMode('editor');

    const event = new CustomEvent('note-created', { detail: { id: newNote.id } });
    document.dispatchEvent(event);
  };

  const handleSaveNote = async () => {
    if (selectedNote) {
      const updated = await simpleStorage.updateNote(selectedNote.id, {
        title: editTitle,
        content: editContent
      });
      setNotes(notes.map(n => n.id === selectedNote.id ? updated : n));
      setSelectedNote(updated);
      setIsEditing(false);
      setLastSaved(new Date());
    }
  };

  // 自动保存功能
  const autoSave = useCallback(async () => {
    if (selectedNote && autoSaveEnabled && (editTitle !== selectedNote.title || editContent !== selectedNote.content)) {
      setIsSaving(true);
      try {
        const updated = await simpleStorage.updateNote(selectedNote.id, {
          title: editTitle,
          content: editContent
        });
        setNotes(notes.map(n => n.id === selectedNote.id ? updated : n));
        setSelectedNote(updated);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [selectedNote, editTitle, editContent, autoSaveEnabled, notes]);

  // 自动保存监听
  useEffect(() => {
    if (autoSaveEnabled && selectedNote && isEditing) {
      // 清除之前的定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      // 2秒后自动保存
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave();
      }, 2000);
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editTitle, editContent, autoSaveEnabled, selectedNote, isEditing, autoSave]);

  // 打开侧边栏
  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      // 使用类型断言绕过 TypeScript 检查
      (chrome.sidePanel.open as (options?: { windowId?: number }) => Promise<void>)().catch(console.error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('确定要删除这条笔记吗？')) {
      await simpleStorage.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setIsEditing(false);
        setViewMode('list');
      }
    }
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.content);
    setViewMode('split');
    saveLastOpenedNote(note.id);
  };

  const handleExportAll = async () => {
    const markdown = exportNotesToMarkdown(notes);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-export-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSingle = async () => {
    if (!selectedNote) return;
    const markdown = exportSingleNoteToMarkdown(selectedNote);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 格式：笔记标题-日期时间，如"我的笔记-20240311-1530"
    const title = (selectedNote.title || '无标题').trim().replace(/[\\/:*?"<>|]/g, '_');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    a.download = `${title}-${dateStr}-${timeStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出为 JSON
  const handleExportJSON = async () => {
    try {
      const jsonString = await storageService.exportData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chrome-notes-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setImportStatus({
        type: 'error',
        message: '导出失败，请重试'
      });
    }
  };

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const content = await dataExportImportService.importFromFile(file);
        setImportFileContent(content);

        // 预览导入数据
        const preview = dataExportImportService.previewImportData(content);
        if (preview) {
          setImportPreview(preview);
          setImportStatus({ type: 'warning', message: '文件解析成功，可以导入' });
        } else {
          setImportStatus({ type: 'error', message: '文件格式无效，请选择有效的 JSON 文件' });
        }
      } catch (error) {
        console.error('File reading error:', error);
        setImportStatus({
          type: 'error',
          message: '文件读取失败，请重试'
        });
      }
    }
  };

  // 执行导入
  const handleImport = async () => {
    if (!importFileContent) return;

    try {
      const result = await dataExportImportService.importData(importFileContent, {
        mode: importMode,
        skipValidation: false
      });

      if (result.success) {
        setImportStatus({
          type: 'success',
          message: `导入成功：${result.imported.notes}个笔记，${result.imported.categories}个分类，${result.imported.tags}个标签`
        });

        // 重新加载笔记列表
        await loadNotes();
        setIsSettingsOpen(false);
      } else {
        setImportStatus({
          type: 'error',
          message: result.errors.join('; ')
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        type: 'error',
        message: '导入失败，请重试'
      });
    }
  };

  const setWindowPreset = (size: WindowSize) => {
    setWindowSize(size);
    if (size === 'small') {
      setCustomWidth(WINDOW_SIZES.SMALL.width);
      setCustomHeight(WINDOW_SIZES.SMALL.height);
    } else if (size === 'medium') {
      setCustomWidth(WINDOW_SIZES.MEDIUM.width);
      setCustomHeight(WINDOW_SIZES.MEDIUM.height);
    } else if (size === 'large') {
      setCustomWidth(WINDOW_SIZES.LARGE.width);
      setCustomHeight(WINDOW_SIZES.LARGE.height);
    }
  };

  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const newWidth = Math.max(400, Math.min(1200, e.clientX));
      const newHeight = Math.max(400, Math.min(900, e.clientY));

      setCustomWidth(newWidth);
      setCustomHeight(newHeight);
      setWindowSize('custom');
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 使用 marked 库渲染 Markdown
  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };
    try {
      const html = marked.parse(text) as string;
      return { __html: html };
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return { __html: text };
    }
  };

  // 旧的渲染函数保留作为备用
  const _renderMarkdownLegacy = (text: string) => {
    if (!text) return { __html: '' };

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');

    const lines = html.split('\n');
    let inUnorderedList = false;
    let inOrderedList = false;
    const processedLines: string[] = [];

    for (let line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (inOrderedList) {
          inOrderedList = false;
          processedLines.push('</ol>');
        }
        if (!inUnorderedList) {
          inUnorderedList = true;
          processedLines.push('<ul>');
        }
        const content = trimmedLine.startsWith('- ') ? trimmedLine.substring(2) : trimmedLine.substring(2);
        processedLines.push(`<li>${content}</li>`);
      } else if (trimmedLine.match(/^\d+\. /)) {
        if (inUnorderedList) {
          inUnorderedList = false;
          processedLines.push('</ul>');
        }
        if (!inOrderedList) {
          inOrderedList = true;
          processedLines.push('<ol>');
        }
        const content = trimmedLine.replace(/^\d+\. /, '');
        processedLines.push(`<li>${content}</li>`);
      } else {
        if (inUnorderedList) {
          inUnorderedList = false;
          processedLines.push('</ul>');
        }
        if (inOrderedList) {
          inOrderedList = false;
          processedLines.push('</ol>');
        }
        if (trimmedLine) {
          processedLines.push(line);
        }
      }
    }

    // 关闭最后可能未关闭的列表
    if (inUnorderedList) {
      processedLines.push('</ul>');
    }
    if (inOrderedList) {
      processedLines.push('</ol>');
    }

    // 换行
    html = processedLines.join('<br>');

    return {
      __html: html
    };
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="optimized-app"
      style={{
        width: `${customWidth}px`,
        height: `${customHeight}px`
      }}
    >
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>📝 备忘录</h1>
          <div className="view-mode-buttons">
            <button
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              📋
            </button>
            <button
              className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="分栏视图"
            >
              📖
            </button>
          </div>
        </div>

        <div className="header-center">
          <div className="size-buttons">
            <button
              className={`size-btn ${windowSize === 'small' ? 'active' : ''}`}
              onClick={() => setWindowPreset('small')}
              title="小窗口"
            >
              S
            </button>
            <button
              className={`size-btn ${windowSize === 'medium' ? 'active' : ''}`}
              onClick={() => setWindowPreset('medium')}
              title="中窗口"
            >
              M
            </button>
            <button
              className={`size-btn ${windowSize === 'large' ? 'active' : ''}`}
              onClick={() => setWindowPreset('large')}
              title="大窗口"
            >
              L
            </button>
          </div>
        </div>

        <div className="header-right">
          {/* 自动保存状态指示器 */}
          {isSaving && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>保存中...</span>}
          {lastSaved && !isSaving && (
            <span style={{ fontSize: '12px', color: 'var(--success-color)' }}>
              ✓ 已保存
            </span>
          )}
          {/* 悬浮窗按钮 - 手动关闭模式 */}
          <button
            className="icon-btn"
            onClick={handleOpenFloatingWindow}
            title="在新窗口中打开（手动关闭）"
          >
            🪟
          </button>
          {/* 侧边栏模式按钮 */}
          <button
            className="icon-btn"
            onClick={handleOpenSidePanel}
            title="在侧边栏中打开"
          >
            📑
          </button>
          <button
            className="icon-btn"
            onClick={handleToggleTheme}
            title={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {/* 关闭按钮 - 仅悬浮窗模式使用 */}
          <button
            className="icon-btn"
            onClick={handleCloseWindow}
            title="关闭当前窗口"
          >
            ✕
          </button>
          <button
            className="icon-btn"
            onClick={handleExportAll}
            title="导出所有笔记 (Markdown)"
          >
            📤
          </button>
          {selectedNote && (
            <button
              className="icon-btn"
              onClick={handleExportSingle}
              title="导出当前笔记 (Markdown)"
            >
              📄
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handleCreateNote}
          >
            + 新建
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div ref={settingsPanelRef} className="settings-panel">
          <h3>⚙️ 设置</h3>

          {/* Open Mode Section */}
          <div className="import-export-section">
            <h4>打开模式</h4>
            <p className="setting-description">选择插件的打开方式</p>
            <div className="open-mode-buttons">
              <button
                className={`btn-mode ${openMode === 'sidePanel' ? 'active' : ''}`}
                onClick={() => handleToggleOpenMode('sidePanel')}
                title="在浏览器侧边栏打开"
              >
                📐 侧边栏
              </button>
              <button
                className={`btn-mode ${openMode === 'floating' ? 'active' : ''}`}
                onClick={() => handleToggleOpenMode('floating')}
                title="以悬浮窗打开，需手动关闭"
              >
                🪟 悬浮窗
              </button>
            </div>
            <p className="setting-hint">
              {openMode === 'sidePanel'
                ? '当前：侧边栏模式 (点击浏览器右侧图标打开)'
                : '当前：悬浮窗模式 (点击图标打开，需手动关闭)'}
            </p>
          </div>

          {/* Import/Export Section */}
          <div className="import-export-section">
            <h4>导出数据</h4>
            <button
              className="btn-export"
              onClick={handleExportJSON}
              title="导出为 JSON 格式"
            >
              📥 导出数据
            </button>

            <h4>导入数据</h4>
            <div className="file-input-wrapper">
              <label className="file-input-label">
                📁 选择文件
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {/* Import Options */}
            {importFileContent && (
              <>
                <div className="import-options">
                  <label>导入模式</label>
                  <div className="option-item">
                    <input
                      type="radio"
                      id="merge"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                    />
                    <label htmlFor="merge">合并导入（保留现有数据）</label>
                  </div>
                  <div className="option-item">
                    <input
                      type="radio"
                      id="replace"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <label htmlFor="replace">完全替换（覆盖现有数据）</label>
                  </div>
                </div>

                {/* Import Preview */}
                {importPreview && (
                  <div className="import-preview">
                    <strong>预览数据：</strong>
                    <div>笔记数量: {importPreview.notesCount}</div>
                    <div>分类数量: {importPreview.categoriesCount}</div>
                    <div>标签数量: {importPreview.tagsCount}</div>
                    {importPreview.exportDate && (
                      <div>导出日期: {new Date(importPreview.exportDate).toLocaleString()}</div>
                    )}
                  </div>
                )}

                <button
                  className="btn-import"
                  onClick={handleImport}
                  title="执行导入"
                >
                  📤 开始导入
                </button>
              </>
            )}

            {/* Status Message */}
            {importStatus.message && (
              <div className={`import-status ${importStatus.type}`}>
                {importStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 搜索笔记标题或内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Content */}
      <div className={`app-content ${viewMode}`}>
        {/* Notes List */}
        <div className={`notes-list ${viewMode === 'editor' ? 'hidden' : ''}`}>
          {filteredNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>{searchQuery ? '没有找到匹配的笔记' : '还没有笔记'}</p>
              {!searchQuery && (
                <button
                  className="btn-secondary"
                  onClick={handleCreateNote}
                >
                  创建第一条笔记
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                className={`note-card ${selectedNote?.id === note.id ? 'selected' : ''}`}
                onClick={() => handleNoteClick(note)}
              >
                <div className="note-card-header">
                  <h3 className="note-title">
                    {note.title || <span className="untitled">无标题</span>}
                  </h3>
                  <button
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
                <p className="note-preview">
                  {truncateText(note.content, 80) || <span className="no-content">无内容</span>}
                </p>
                <div className="note-meta">
                  <span className="note-date">{formatRelativeTime(note.updatedAt)}</span>
                  {note.content.includes('#') && <span className="tag">MD</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Note Editor */}
        {selectedNote && (
          <div className={`note-editor ${viewMode === 'list' ? 'hidden' : ''}`}>
            <div className="editor-header">
              {isEditing ? (
                <input
                  type="text"
                  className="title-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="输入标题..."
                  autoFocus
                />
              ) : (
                <h2>{selectedNote.title || '无标题'}</h2>
              )}
              <div className="editor-actions">
                {isEditing && (
                  <button
                    className={`icon-btn ${showPreview ? 'active' : ''}`}
                    onClick={() => setShowPreview(!showPreview)}
                    title="预览"
                  >
                    👁️
                  </button>
                )}
                {isEditing ? (
                  <>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setEditTitle(selectedNote.title);
                        setEditContent(selectedNote.content);
                      }}
                    >
                      取消
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleSaveNote}
                    >
                      保存
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    编辑
                  </button>
                )}
              </div>
            </div>

            <div className="editor-content">
              {isEditing ? (
                <div className="edit-area">
                  <div className="editor-pane">
                    <div className="pane-header">📝 编辑 (Markdown)</div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="支持 Markdown 格式: # 标题, **粗体**, *斜体*, `代码`"
                      className="content-textarea"
                    />
                  </div>
                  {showPreview && (
                    <div className="preview-pane">
                      <div className="pane-header">👁️ 预览</div>
                      <div
                        className="preview-content"
                        dangerouslySetInnerHTML={renderMarkdown(editContent)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="note-display">
                  {selectedNote.content ? (
                    <div
                      className="note-content"
                      dangerouslySetInnerHTML={renderMarkdown(selectedNote.content)}
                    />
                  ) : (
                    <div className="empty-display">
                      点击"编辑"开始添加内容
                      <div className="markdown-hint">
                        <p>💡 支持 Markdown 格式：</p>
                        <code># 标题</code>
                        <code>**粗体**</code>
                        <code>*斜体*</code>
                        <code>`代码`</code>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle"
        onMouseDown={startResize}
        title="拖动调整大小"
      />
    </div>
  );
}

export default OptimizedApp;
