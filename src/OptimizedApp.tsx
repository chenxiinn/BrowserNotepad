import { useState, useCallback } from 'react';
import { useMode } from './hooks/useMode';
import { useTheme } from './hooks/useTheme';
import { useNotes } from './hooks/useNotes';
import { useAutoSave } from './hooks/useAutoSave';
import { useDividerResize, useCornerResize } from './hooks/useResize';
import { AppHeader, NoteEditor, SettingsPanel, DividerResizeHandle, CornerResizeHandle } from './components';
import { exportNotesToMarkdown, exportSingleNoteToMarkdown, exportToFile, formatRelativeTime, truncateText } from './utils';
import type { Note } from './types';
import './styles/optimized.css';

type ViewMode = 'list' | 'editor';

function OptimizedApp() {
  const { mode, isFloating, isSidePanel } = useMode();
  const { theme } = useTheme();
  const { notes, loading, loadNotes, createNote, updateNote, deleteNote, filteredNotes } = useNotes();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { listWidthPercent, onMouseDown: onDividerDown, containerRef: listContainerRef } = useDividerResize(42);
  const { width: floatW, height: floatH, onMouseDown: onCornerDown } = useCornerResize(500, 700);

  const { isSaving, lastSaved } = useAutoSave(true, selectedNote, editTitle, editContent, updateNote);

  const displayNotes = filteredNotes(searchQuery);

  const handleNewNote = useCallback(async () => {
    const note = await createNote('', '');
    setSelectedNote(note);
    setEditTitle('');
    setEditContent('');
    setViewMode('editor');
  }, [createNote]);

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setViewMode('editor');
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedNote) return;
    const updated = await updateNote(selectedNote.id, { title: editTitle, content: editContent });
    setSelectedNote(updated);
  }, [selectedNote, editTitle, editContent, updateNote]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (confirm('确定要删除这条笔记吗？')) {
      await deleteNote(id);
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setViewMode('list');
      }
    }
  }, [deleteNote, selectedNote]);

  const handleExportAll = useCallback(async () => {
    const markdown = exportNotesToMarkdown(notes);
    const filename = `notes-export-${new Date().toISOString().split('T')[0]}.md`;
    await exportToFile(markdown, filename, 'text/markdown');
  }, [notes]);

  const handleExportSingle = useCallback(async () => {
    if (!selectedNote) return;
    const markdown = exportSingleNoteToMarkdown(selectedNote);
    const title = (selectedNote.title || '无标题').trim().replace(/[\\/:*?"<>|]/g, '_');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    await exportToFile(markdown, `${title}-${dateStr}-${timeStr}.md`, 'text/markdown');
  }, [selectedNote]);

  const handleOpenFloating = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'openFloatingWindow', width: 420, height: 650 });
    }
  }, []);

  const handleOpenSidePanel = useCallback(async () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      (chrome.sidePanel.open as (options?: { windowId?: number }) => Promise<void>)().catch(console.error);
    }
  }, []);

  const handleCloseWindow = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'closeFloatingWindow' });
    }
  }, []);

  const handleModeChange = useCallback((newMode: 'sidePanel' | 'floating') => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ openMode: newMode });
    }
    if (newMode === 'sidePanel') {
      handleOpenSidePanel();
    } else {
      handleOpenFloating();
    }
  }, [handleOpenSidePanel, handleOpenFloating]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedNote(null);
  }, []);

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
      ref={isSidePanel ? listContainerRef : undefined}
      className="optimized-app"
      style={isFloating ? { width: `${floatW}px`, height: `${floatH}px` } : undefined}
    >
      <AppHeader
        viewMode={viewMode} setViewMode={setViewMode}
        theme={theme}
        onNewNote={handleNewNote}
        onExportAll={handleExportAll} onExportSingle={handleExportSingle}
        onOpenFloating={handleOpenFloating} onOpenSidePanel={handleOpenSidePanel}
        onCloseWindow={handleCloseWindow}
        onSettingsToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        hasSelectedNote={!!selectedNote}
        mode={mode} isSaving={isSaving} lastSaved={lastSaved}
        onBackToList={handleBackToList}
      />
      {isSettingsOpen && <SettingsPanel mode={mode} onModeChange={handleModeChange} onClose={() => setIsSettingsOpen(false)} onImportComplete={loadNotes} />}
      <div className={`app-content ${viewMode}`}>
        <div
          className={`notes-list ${viewMode === 'editor' ? 'hidden' : ''}`}
          style={isSidePanel ? { width: `${listWidthPercent}%` } : undefined}
        >
          <div className="search-bar">
            <span className="search-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" placeholder="搜索笔记..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
          </div>
          {displayNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <p>{searchQuery ? '没有找到匹配的笔记' : '还没有笔记'}</p>
              {!searchQuery && <button className="btn-secondary" onClick={handleNewNote}>创建第一条笔记</button>}
            </div>
          ) : (
            displayNotes.map(note => (
              <div key={note.id} className={`note-card ${selectedNote?.id === note.id ? 'selected' : ''}`} onClick={() => handleNoteClick(note)}>
                <div className="note-card-header">
                  <h3 className="note-title">{note.title || <span className="untitled">无标题</span>}</h3>
                  <button className="btn-delete" onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }} title="删除">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                <p className="note-preview">{truncateText(note.content, 80) || <span className="no-content">无内容</span>}</p>
                <div className="note-meta">
                  <span className="note-date">{formatRelativeTime(note.updatedAt)}</span>
                  {note.content.includes('#') && <span className="tag">MD</span>}
                </div>
              </div>
            ))
          )}
        </div>
        {isSidePanel && selectedNote && <DividerResizeHandle onMouseDown={onDividerDown} />}
        {selectedNote && (
          <div
            className={`note-editor ${viewMode === 'list' ? 'hidden' : ''}`}
            style={isSidePanel ? { width: `${100 - listWidthPercent}%` } : undefined}
          >
            <NoteEditor
              note={selectedNote} isEditing={true}
              onStartEditing={() => {}}
              onCancelEditing={() => {}}
              onSave={handleSave}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              editTitle={editTitle} editContent={editContent}
              showPreview={true}
              onTogglePreview={() => {}}
            />
          </div>
        )}
      </div>
      {isFloating && <CornerResizeHandle onMouseDown={onCornerDown} />}
    </div>
  );
}

export default OptimizedApp;