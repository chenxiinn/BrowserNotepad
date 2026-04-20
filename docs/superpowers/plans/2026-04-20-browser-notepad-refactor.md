# BrowserNotepad 修复 + 全面重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken floating window, unify storage, refactor 914-line monolith into focused components, add file picker export, and simplify resize UX.

**Architecture:** Preserve the existing Chrome Extension V3 structure (manifest, background worker, React SPA). Unify storage to `StorageService` only. Split `OptimizedApp.tsx` into 5 components + 5 hooks. Add floating window handlers to background.ts. Switch export to File System Access API with fallback.

**Tech Stack:** React 18, TypeScript, Vite, Chrome Extension Manifest V3, marked (Markdown), @reduxjs/toolkit (installed but unused — we won't use it), Chrome Storage API, Chrome Windows API

---

## File Structure

```
src/
  components/
    AppHeader.tsx          — Top bar (title, view toggle, theme, export, new-note, conditional close btn)
    NoteList.tsx            — Note list (search, cards, empty state)
    NoteEditor.tsx          — Editor (title input, content textarea, markdown preview, auto-save indicator)
    SettingsPanel.tsx        — Settings panel (import/export, mode toggle)
    DividerResizeHandle.tsx  — Drag handle for sidebar split resize
    CornerResizeHandle.tsx    — Drag handle for floating window corner resize
  hooks/
    useNotes.ts            — Note CRUD, search filter, data loading
    useTheme.ts            — Theme toggle, localStorage persistence
    useAutoSave.ts          — 2-second debounce auto-save
    useResize.ts            — Corner resize logic for floating mode
    useMode.ts              — Detect sidePanel vs floating mode
  services/
    storage.ts             — UNIFIED storage (keep, add createNote/updateNote/deleteNote convenience methods)
    categoryService.ts     — Keep as-is
    tagService.ts           — Keep as-is
    configService.ts        — Keep as-is
    dataExportImportService.ts — Keep, add exportToFile utility
    migration.ts            — NEW: one-time data migration from chrome-notes key
  OptimizedApp.tsx          — Slim layout shell (~100 lines)
  optimizedMain.tsx          — Entry point (add migration call here)
  simpleStorage.ts           — DELETE
  background/
    background.ts           — Add openFloatingWindow + closeFloatingWindow handlers
  styles/
    optimized.css            — Clean up: fix rgba bug, remove .size-buttons styles, rename .resize-handle, add .divider-resize-handle
  types/
    index.ts                — Add ViewMode, AppMode type exports
  utils/
    constants.ts             — Remove WINDOW_SIZES export
    helpers.ts              — Add exportToFile function
    init.ts                 — Remove (migration.ts replaces)
    index.ts                — Update re-exports
```

---

### Task 1: Create migration utility

**Files:**
- Create: `src/services/migration.ts`

This task creates the migration function that moves data from the old `chrome-notes` key to the `StorageService` keys. It must run before any other storage access.

- [ ] **Step 1: Create `src/services/migration.ts`**

```ts
import { storageService } from './storage';

const OLD_KEY = 'chrome-notes';
const MIGRATION_FLAG = 'chrome-notes-migrated';

export async function migrateOldData(): Promise<void> {
  const flag = await chrome.storage.local.get(MIGRATION_FLAG);
  if (flag[MIGRATION_FLAG]) return;

  const result = await chrome.storage.local.get(OLD_KEY);
  const oldNotes = result[OLD_KEY];

  if (oldNotes && Array.isArray(oldNotes) && oldNotes.length > 0) {
    const existing = await storageService.getNotes();
    const merged = [...oldNotes, ...existing];
    await storageService.setNotes(merged);
    await chrome.storage.local.remove(OLD_KEY);
  }

  await chrome.storage.local.set({ [MIGRATION_FLAG]: true });
}
```

- [ ] **Step 2: Call migration in `src/optimizedMain.tsx`**

Update `optimizedMain.tsx` to call `migrateOldData()` before rendering:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import OptimizedApp from './OptimizedApp';
import { migrateOldData } from './services/migration';
import './styles/optimized.css';

async function bootstrap() {
  await migrateOldData();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <OptimizedApp />
    </React.StrictMode>
  );
}

bootstrap();
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/migration.ts src/optimizedMain.tsx
git commit -m "feat: add data migration from old chrome-notes key"
```

---

### Task 2: Add convenience CRUD methods to StorageService

**Files:**
- Modify: `src/services/storage.ts`

The current `OptimizedApp` uses `simpleStorage.createNote(title, content)` convenience method. `StorageService` only has the lower-level `setNotes`/`getNotes`. We add matching convenience methods so the component migration is straightforward.

- [ ] **Step 1: Add `createNote`, `updateNote`, `deleteNote` convenience methods to `StorageService`**

Add these methods to the `StorageService` class in `src/services/storage.ts`, after the existing `searchNotes` method:

```ts
  async createNote(title: string, content: string): Promise<Note> {
    const notes = await this.getNotes();
    const now = Date.now();
    const note: Note = {
      id: now.toString(36) + Math.random().toString(36).substr(2),
      title,
      content,
      categoryId: '',
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isArchived: false,
      color: '#FFFFFF',
    };
    notes.unshift(note);
    await this.setNotes(notes);
    return note;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) throw new Error('Note not found');
    notes[index] = { ...notes[index], ...updates, updatedAt: Date.now() };
    await this.setNotes(notes);
    return notes[index];
  }

  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    await this.setNotes(filtered);
  }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/services/storage.ts
git commit -m "feat: add createNote/updateNote/deleteNote convenience methods to StorageService"
```

---

### Task 3: Add exportToFile utility to helpers

**Files:**
- Modify: `src/utils/helpers.ts`

Add the File System Access API export function with Blob download fallback.

- [ ] **Step 1: Add `exportToFile` function to `src/utils/helpers.ts`**

Append at the end of the file:

```ts
export type ExportResult = { success: boolean; method: 'picker' | 'download' | 'aborted' };

export async function exportToFile(content: string, filename: string, mimeType: string): Promise<ExportResult> {
  if ('showSaveFilePicker' in window) {
    try {
      const types = mimeType.includes('markdown')
        ? [{ description: 'Markdown', accept: { [mimeType]: ['.md'] } }]
        : [{ description: 'JSON', accept: { [mimeType]: ['.json'] } }];
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types,
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, method: 'picker' };
    } catch (e: any) {
      if (e.name === 'AbortError') return { success: false, method: 'aborted' };
    }
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: 'download' };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/helpers.ts
git commit -m "feat: add exportToFile with File System Access API and fallback"
```

---

### Task 4: Add useMode and useTheme hooks

**Files:**
- Create: `src/hooks/useMode.ts`
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create `src/hooks/useMode.ts`**

```ts
import { useState, useEffect } from 'react';

export type AppMode = 'sidePanel' | 'floating';

export function useMode(): { mode: AppMode; isFloating: boolean; isSidePanel: boolean } {
  const [mode, setMode] = useState<AppMode>('sidePanel');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'floating') {
      setMode('floating');
      return;
    }
    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.getCurrent((win) => {
        if (win && win.type === 'popup') {
          setMode('floating');
        }
      });
    }
  }, []);

  return {
    mode,
    isFloating: mode === 'floating',
    isSidePanel: mode === 'sidePanel',
  };
}
```

- [ ] **Step 2: Create `src/hooks/useTheme.ts`**

```ts
import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'chrome-note-app-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return { theme, toggleTheme };
}
```

- [ ] **Step 3: Create `src/hooks/index.ts` barrel export**

```ts
export { useMode } from './useMode';
export type { AppMode } from './useMode';
export { useTheme } from './useTheme';
export type { Theme } from './useTheme';
export { useNotes } from './useNotes';
export { useAutoSave } from './useAutoSave';
export { useResize } from './useResize';
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (note: `useNotes`, `useAutoSave`, `useResize` don't exist yet — only create this barrel after those hooks are created in later tasks, OR create placeholder versions).

Actually, create the barrel **after** all hooks exist. Skip this step for now and create it in Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMode.ts src/hooks/useTheme.ts
git commit -m "feat: add useMode and useTheme hooks"
```

---

### Task 5: Add useNotes, useAutoSave, useResize hooks

**Files:**
- Create: `src/hooks/useNotes.ts`
- Create: `src/hooks/useAutoSave.ts`
- Create: `src/hooks/useResize.ts`

- [ ] **Step 1: Create `src/hooks/useNotes.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storage';
import type { Note } from '../types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const data = await storageService.getNotes();
      setNotes(data.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {
      console.error('Failed to load notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async (title: string, content: string): Promise<Note> => {
    const note = await storageService.createNote(title, content);
    setNotes(prev => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<Note> => {
    const updated = await storageService.updateNote(id, updates);
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
    return updated;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await storageService.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const filteredNotes = useCallback((query: string): Note[] => {
    if (!query) return notes;
    const q = query.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes]);

  return { notes, loading, loadNotes, createNote, updateNote, deleteNote, filteredNotes };
}
```

- [ ] **Step 2: Create `src/hooks/useAutoSave.ts`**

```ts
import { useEffect, useRef, useCallback } from 'react';
import type { Note } from '../types';

export function useAutoSave(
  isEditing: boolean,
  selectedNote: Note | null,
  editTitle: string,
  editContent: string,
  onSave: (id: string, updates: Partial<Note>) => Promise<Note>,
  enabled: boolean = true,
  delayMs: number = 2000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  const save = useCallback(async () => {
    if (!selectedNote || !enabled) return;
    if (editTitle === selectedNote.title && editContent === selectedNote.content) return;
    setIsSaving(true);
    try {
      await onSave(selectedNote.id, { title: editTitle, content: editContent });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Auto-save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editTitle, editContent, onSave, enabled]);

  useEffect(() => {
    if (!isEditing || !enabled || !selectedNote) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isEditing, selectedNote, editTitle, editContent, enabled, save, delayMs]);

  return { isSaving, lastSaved };
}
```

Wait — this file uses `React` but only imports from 'react' at the top. Let me fix:

```ts
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Note } from '../types';

export function useAutoSave(
  isEditing: boolean,
  selectedNote: Note | null,
  editTitle: string,
  editContent: string,
  onSave: (id: string, updates: Partial<Note>) => Promise<Note>,
  enabled: boolean = true,
  delayMs: number = 2000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = React.useState… 
```

Actually let me just do it properly without React namespace:

```ts
import { useEffect, useRef, useCallback, useState } from 'react';
import type { Note } from '../types';

export function useAutoSave(
  isEditing: boolean,
  selectedNote: Note | null,
  editTitle: string,
  editContent: string,
  onSave: (id: string, updates: Partial<Note>) => Promise<Note>,
  enabled: boolean = true,
  delayMs: number = 2000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = useCallback(async () => {
    if (!selectedNote || !enabled) return;
    if (editTitle === selectedNote.title && editContent === selectedNote.content) return;
    setIsSaving(true);
    try {
      await onSave(selectedNote.id, { title: editTitle, content: editContent });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Auto-save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editTitle, editContent, onSave, enabled]);

  useEffect(() => {
    if (!isEditing || !enabled || !selectedNote) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isEditing, selectedNote, editTitle, editContent, enabled, save, delayMs]);

  return { isSaving, lastSaved };
}
```

- [ ] **Step 3: Create `src/hooks/useResize.ts`**

```ts
import { useState, useCallback, useEffect, useRef } from 'react';

export function useDividerResize(initialWidthPercent: number = 42) {
  const [listWidthPercent, setListWidthPercent] = useState(initialWidthPercent);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setListWidthPercent(Math.max(20, Math.min(70, percent)));
    };
    const onMouseUp = () => { isDragging.current = false; };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { listWidthPercent, onMouseDown, containerRef };
}

export function useCornerResize(initWidth: number = 500, initHeight: number = 700) {
  const [width, setWidth] = useState(initWidth);
  const [height, setHeight] = useState(initHeight);
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(Math.max(350, e.clientX));
      setHeight(Math.max(350, e.clientY));
    };
    const onMouseUp = () => { isDragging.current = false; };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { width, height, onMouseDown };
}
```

- [ ] **Step 4: Create `src/hooks/index.ts` barrel**

```ts
export { useMode } from './useMode';
export type { AppMode } from './useMode';
export { useTheme } from './useTheme';
export type { Theme } from './useTheme';
export { useNotes } from './useNotes';
export { useAutoSave } from './useAutoSave';
export { useDividerResize, useCornerResize } from './useResize';
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useNotes, useAutoSave, useResize hooks"
```

---

### Task 6: Fix background.ts — add floating window handlers

**Files:**
- Modify: `src/background/background.ts`

- [ ] **Step 1: Add `openFloatingWindow` and `closeFloatingWindow` handlers to the switch statement in `background.ts`**

Replace the entire `chrome.runtime.onMessage.addListener` block with:

```ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);

  switch (request.action) {
    case 'openSidePanel':
      chrome.sidePanel.open({ windowId: sender.tab?.windowId })
        .then(() => sendResponse({ status: 'opened' }))
        .catch(err => {
          console.error('Open sidepanel error:', err);
          sendResponse({ error: err.message });
        });
      return true;

    case 'getOpenMode':
      chrome.storage.local.get('openMode', (result) => {
        sendResponse({ openMode: result.openMode || 'sidePanel' });
      });
      return true;

    case 'setOpenMode':
      chrome.storage.local.set({ openMode: request.mode });
      sendResponse({ status: 'saved' });
      break;

    case 'openFloatingWindow':
      chrome.windows.create({
        url: chrome.runtime.getURL('index.html') + '?mode=floating',
        type: 'popup',
        width: request.width || 500,
        height: request.height || 700,
        focused: true,
      }, (win) => {
        sendResponse({ status: 'opened', windowId: win?.id });
      });
      return true;

    case 'closeFloatingWindow':
      chrome.windows.getCurrent((win) => {
        if (win) {
          chrome.windows.remove(win.id, () => {
            sendResponse({ status: 'closed' });
          });
        } else {
          sendResponse({ error: 'No current window' });
        }
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/background/background.ts
git commit -m "fix: add openFloatingWindow and closeFloatingWindow handlers"
```

---

### Task 7: Create component files — AppHeader, NoteList, NoteEditor, SettingsPanel, resize handles

**Files:**
- Create: `src/components/AppHeader.tsx`
- Create: `src/components/NoteList.tsx`
- Create: `src/components/NoteEditor.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/DividerResizeHandle.tsx`
- Create: `src/components/CornerResizeHandle.tsx`
- Create: `src/components/index.ts`

These components are extracted from `OptimizedApp.tsx`. Each receives props from the parent. They should be self-contained and not import `simpleStorage`.

- [ ] **Step 1: Create `src/components/AppHeader.tsx`**

```tsx
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
  isSettingsOpen: boolean;
  hasSelectedNote: boolean;
  mode: AppMode;
  isSaving: boolean;
  lastSaved: Date | null;
}

export function AppHeader({
  viewMode, setViewMode, theme, onToggleTheme,
  onNewNote, onExportAll, onExportSingle,
  onOpenFloating, onOpenSidePanel, onCloseWindow,
  onSettingsToggle, isSettingsOpen, hasSelectedNote,
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
```

- [ ] **Step 2: Create `src/components/NoteList.tsx`**

```tsx
import type { Note } from '../types';
import { formatRelativeTime, truncateText } from '../utils';

interface NoteListProps {
  notes: Note[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedNoteId: string | null;
  onNoteClick: (note: Note) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
}

export function NoteList({ notes, searchQuery, onSearchChange, selectedNoteId, onNoteClick, onNewNote, onDeleteNote }: NoteListProps) {
  const filtered = searchQuery
    ? notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  return (
    <div className="notes-list-wrapper">
      <div className="search-bar">
        <input type="text" placeholder="🔍 搜索笔记标题或内容..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="search-input" />
      </div>
      <div className="notes-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>{searchQuery ? '没有找到匹配的笔记' : '还没有笔记'}</p>
            {!searchQuery && <button className="btn-secondary" onClick={onNewNote}>创建第一条笔记</button>}
          </div>
        ) : (
          filtered.map(note => (
            <div key={note.id} className={`note-card ${selectedNoteId === note.id ? 'selected' : ''}`} onClick={() => onNoteClick(note)}>
              <div className="note-card-header">
                <h3 className="note-title">{note.title || <span className="untitled">无标题</span>}</h3>
                <button className="btn-delete" onClick={e => { e.stopPropagation(); onDeleteNote(note.id); }} title="删除">🗑️</button>
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
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/NoteEditor.tsx`**

```tsx
import { useState } from 'react';
import type { Note } from '../types';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

interface NoteEditorProps {
  note: Note;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: (id: string, updates: Partial<Note>) => Promise<Note>;
  onEditTitleChange: (title: string) => void;
  onEditContentChange: (content: string) => void;
  editTitle: string;
  editContent: string;
}

export function NoteEditor({ note, isEditing, onStartEditing, onCancelEditing, onSave, onEditTitleChange, onEditContentChange, editTitle, editContent }: NoteEditorProps) {
  const [showPreview, setShowPreview] = useState(true);

  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };
    try {
      return { __html: marked.parse(text) as string };
    } catch {
      return { __html: text };
    }
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        {isEditing ? (
          <input type="text" className="title-input" value={editTitle} onChange={e => onEditTitleChange(e.target.value)} placeholder="输入标题..." autoFocus />
        ) : (
          <h2>{note.title || '无标题'}</h2>
        )}
        <div className="editor-actions">
          {isEditing && (
            <button className={`icon-btn ${showPreview ? 'active' : ''}`} onClick={() => setShowPreview(!showPreview)} title="预览">👁️</button>
          )}
          {isEditing ? (
            <>
              <button className="btn-secondary" onClick={onCancelEditing}>取消</button>
              <button className="btn-primary" onClick={() => onSave(note.id, { title: editTitle, content: editContent })}>保存</button>
            </>
          ) : (
            <button className="btn-primary" onClick={onStartEditing}>编辑</button>
          )}
        </div>
      </div>
      <div className="editor-content">
        {isEditing ? (
          <div className="edit-area">
            <div className="editor-pane">
              <div className="pane-header">📝 编辑 (Markdown)</div>
              <textarea value={editContent} onChange={e => onEditContentChange(e.target.value)} placeholder="支持 Markdown 格式: # 标题, **粗体**, *斜体*, `代码`" className="content-textarea" />
            </div>
            {showPreview && (
              <div className="preview-pane">
                <div className="pane-header">👁️ 预览</div>
                <div className="preview-content" dangerouslySetInnerHTML={renderMarkdown(editContent)} />
              </div>
            )}
          </div>
        ) : (
          <div className="note-display">
            {note.content ? (
              <div className="note-content" dangerouslySetInnerHTML={renderMarkdown(note.content)} />
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
  );
}
```

- [ ] **Step 4: Create `src/components/SettingsPanel.tsx`**

Extract the settings panel from OptimizedApp — import/export, mode toggle. This is a direct extraction keeping the same functionality but using `storageService` and `dataExportImportService` instead of `simpleStorage`.

```tsx
import { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { dataExportImportService } from '../services/dataExportImportService';
import type { AppMode } from '../hooks/useMode';
import { exportToFile } from '../utils/helpers';

interface SettingsPanelProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onClose: () => void;
}

export function SettingsPanel({ mode, onModeChange, onClose }: SettingsPanelProps) {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importPreview, setImportPreview] = useState<{ notesCount: number; categoriesCount: number; tagsCount: number; exportDate?: string } | null>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    try {
      const jsonString = await storageService.exportData();
      const filename = `chrome-notes-export-${new Date().toISOString().split('T')[0]}.json`;
      await exportToFile(jsonString, filename, 'application/json');
    } catch (error) {
      setImportStatus({ type: 'error', message: '导出失败，请重试' });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const content = await dataExportImportService.importFromFile(file);
        setImportFileContent(content);
        const preview = dataExportImportService.previewImportData(content);
        if (preview) {
          setImportPreview(preview);
          setImportStatus({ type: 'warning', message: '文件解析成功，可以导入' });
        } else {
          setImportStatus({ type: 'error', message: '文件格式无效' });
        }
      } catch {
        setImportStatus({ type: 'error', message: '文件读取失败' });
      }
    }
  };

  const handleImport = async () => {
    if (!importFileContent) return;
    try {
      const result = await dataExportImportService.importData(importFileContent, { mode: importMode, skipValidation: false });
      if (result.success) {
        setImportStatus({ type: 'success', message: `导入成功：${result.imported.notes}个笔记` });
        setImportFileContent(null);
        setImportPreview(null);
      } else {
        setImportStatus({ type: 'error', message: result.errors.join('; ') });
      }
    } catch {
      setImportStatus({ type: 'error', message: '导入失败' });
    }
  };

  return (
    <div className="settings-panel">
      <h3>⚙️ 设置</h3>
      <div className="import-export-section">
        <h4>打开模式</h4>
        <p className="setting-description">选择插件的打开方式</p>
        <div className="open-mode-buttons">
          <button className={`btn-mode ${mode === 'sidePanel' ? 'active' : ''}`} onClick={() => onModeChange('sidePanel')}>📐 侧边栏</button>
          <button className={`btn-mode ${mode === 'floating' ? 'active' : ''}`} onClick={() => onModeChange('floating')}>🪟 悬浮窗</button>
        </div>
      </div>
      <div className="import-export-section">
        <h4>导出数据</h4>
        <button className="btn-export" onClick={handleExportJSON} title="导出为 JSON 格式">📥 导出数据</button>
        <h4>导入数据</h4>
        <div className="file-input-wrapper">
          <label className="file-input-label">📁 选择文件<input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelect} /></label>
        </div>
        {importFileContent && (
          <>
            <div className="import-options">
              <label>导入模式</label>
              <div className="option-item"><input type="radio" id="merge" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /><label htmlFor="merge">合并导入</label></div>
              <div className="option-item"><input type="radio" id="replace" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /><label htmlFor="replace">完全替换</label></div>
            </div>
            {importPreview && (<div className="import-preview"><strong>预览数据：</strong><div>笔记数量: {importPreview.notesCount}</div><div>分类数量: {importPreview.categoriesCount}</div><div>标签数量: {importPreview.tagsCount}</div>{importPreview.exportDate && <div>导出日期: {new Date(importPreview.exportDate).toLocaleString()}</div>}</div>)}
            <button className="btn-import" onClick={handleImport} title="执行导入">📤 开始导入</button>
          </>
        )}
        {importStatus.message && <div className={`import-status ${importStatus.type}`}>{importStatus.message}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/DividerResizeHandle.tsx`**

```tsx
interface DividerResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export function DividerResizeHandle({ onMouseDown }: DividerResizeHandleProps) {
  return (
    <div className="divider-resize-handle" onMouseDown={onMouseDown} title="拖动调整宽度" />
  );
}
```

- [ ] **Step 6: Create `src/components/CornerResizeHandle.tsx`**

```tsx
interface CornerResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export function CornerResizeHandle({ onMouseDown }: CornerResizeHandleProps) {
  return (
    <div className="corner-resize-handle" onMouseDown={onMouseDown} title="拖动调整大小" />
  );
}
```

- [ ] **Step 7: Create `src/components/index.ts`**

```ts
export { AppHeader } from './AppHeader';
export { NoteList } from './NoteList';
export { NoteEditor } from './NoteEditor';
export { SettingsPanel } from './SettingsPanel';
export { DividerResizeHandle } from './DividerResizeHandle';
export { CornerResizeHandle } from './CornerResizeHandle';
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds (may have unused warnings for now — these components aren't wired yet).

- [ ] **Step 9: Commit**

```bash
git add src/components/
git commit -m "feat: add extracted component files (AppHeader, NoteList, NoteEditor, SettingsPanel, resize handles)"
```

---

### Task 8: Rewrite OptimizedApp.tsx as slim layout shell

**Files:**
- Modify: `src/OptimizedApp.tsx` — complete rewrite

This is the big one. Replace the 914-line monolith with a ~100-line layout shell that composes the new components and hooks.

- [ ] **Step 1: Rewrite `src/OptimizedApp.tsx`**

```tsx
import { useState, useCallback, useEffect } from 'react';
import { useMode } from './hooks/useMode';
import { useTheme } from './hooks/useTheme';
import { useNotes } from './hooks/useNotes';
import { useAutoSave } from './hooks/useAutoSave';
import { useDividerResize, useCornerResize } from './hooks/useResize';
import { AppHeader, NoteList, NoteEditor, SettingsPanel, DividerResizeHandle, CornerResizeHandle } from './components';
import { storageService } from './services/storage';
import { exportNotesToMarkdown, exportSingleNoteToMarkdown, exportToFile } from './utils';
import type { Note } from './types';
import './styles/optimized.css';

type ViewMode = 'list' | 'split' | 'editor';

function OptimizedApp() {
  const { mode, isFloating, isSidePanel } = useMode();
  const { theme, toggleTheme } = useTheme();
  const { notes, loading, loadNotes, createNote, updateNote, deleteNote, filteredNotes } = useNotes();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { listWidthPercent, onMouseDown: onDividerDown, containerRef: listContainerRef } = useDividerResize(42);
  const { width: floatW, height: floatH, onMouseDown: onCornerDown } = useCornerResize(500, 700);

  const { isSaving, lastSaved } = useAutoSave(
    isEditing, selectedNote, editTitle, editContent, updateNote
  );

  const displayNotes = filteredNotes(searchQuery);

  const handleNewNote = useCallback(async () => {
    const note = await createNote('', '');
    setSelectedNote(note);
    setIsEditing(true);
    setEditTitle('');
    setEditContent('');
    setViewMode('editor');
  }, [createNote]);

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.content);
    setViewMode('split');
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedNote) return;
    const updated = await updateNote(selectedNote.id, { title: editTitle, content: editContent });
    setSelectedNote(updated);
    setIsEditing(false);
  }, [selectedNote, editTitle, editContent, updateNote]);

  const handleCancelEdit = useCallback(() => {
    if (!selectedNote) return;
    setIsEditing(false);
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content);
  }, [selectedNote]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (confirm('确定要删除这条笔记吗？')) {
      await deleteNote(id);
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setIsEditing(false);
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
    chrome.runtime.sendMessage({ action: 'openFloatingWindow', width: 500, height: 700 });
  }, []);

  const handleOpenSidePanel = useCallback(async () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      (chrome.sidePanel.open as (options?: { windowId?: number }) => Promise<void>)().catch(console.error);
    }
  }, []);

  const handleCloseWindow = useCallback(() => {
    chrome.runtime.sendMessage({ action: 'closeFloatingWindow' });
  }, []);

  const handleModeChange = useCallback((newMode: 'sidePanel' | 'floating') => {
    chrome.storage.local.set({ openMode: newMode });
    if (newMode === 'sidePanel') {
      handleOpenSidePanel();
    } else {
      handleOpenFloating();
    }
  }, [handleOpenSidePanel, handleOpenFloating]);

  if (loading) {
    return <div className="app-loading"><div className="spinner"></div><p>加载中...</p></div>;
  }

  return (
    <div
      ref={isFloating ? undefined : listContainerRef}
      className="optimized-app"
      style={isFloating ? { width: `${floatW}px`, height: `${floatH}px` } : undefined}
    >
      <AppHeader
        viewMode={viewMode} setViewMode={setViewMode}
        theme={theme} onToggleTheme={toggleTheme}
        onNewNote={handleNewNote}
        onExportAll={handleExportAll} onExportSingle={handleExportSingle}
        onOpenFloating={handleOpenFloating} onOpenSidePanel={handleOpenSidePanel}
        onCloseWindow={handleCloseWindow}
        onSettingsToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
        hasSelectedNote={!!selectedNote}
        mode={mode} isSaving={isSaving} lastSaved={lastSaved}
      />
      {isSettingsOpen && <SettingsPanel mode={mode} onModeChange={handleModeChange} onClose={() => setIsSettingsOpen(false)} />}
      <div className={`app-content ${viewMode}`}>
        <div className={`notes-list ${viewMode === 'editor' ? 'hidden' : ''}`} style={isSidePanel ? { width: `${listWidthPercent}%` } : undefined}>
          <div className="search-bar">
            <input type="text" placeholder="🔍 搜索笔记标题或内容..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
          </div>
          <div className="notes-list-inner">
            {displayNotes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>{searchQuery ? '没有找到匹配的笔记' : '还没有笔记'}</p>
                {!searchQuery && <button className="btn-secondary" onClick={handleNewNote}>创建第一条笔记</button>}
              </div>
            ) : (
              displayNotes.map(note => (
                <div key={note.id} className={`note-card ${selectedNote?.id === note.id ? 'selected' : ''}`} onClick={() => handleNoteClick(note)}>
                  <div className="note-card-header">
                    <h3 className="note-title">{note.title || <span className="untitled">无标题</span>}</h3>
                    <button className="btn-delete" onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }} title="删除">🗑️</button>
                  </div>
                  <p className="note-preview">{(note.content || '').substring(0, 80) || <span className="no-content">无内容</span>}</p>
                  <div className="note-meta">
                    <span className="note-date">{new Date(note.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    {note.content.includes('#') && <span className="tag">MD</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {isSidePanel && viewMode === 'split' && <DividerResizeHandle onMouseDown={onDividerDown} />}
        {selectedNote && (
          <div className={`note-editor ${viewMode === 'list' ? 'hidden' : ''}`} style={isSidePanel ? { width: `${100 - listWidthPercent}%` } : undefined}>
            <NoteEditor
              note={selectedNote} isEditing={isEditing}
              onStartEditing={() => setIsEditing(true)}
              onCancelEditing={handleCancelEdit}
              onSave={handleSave}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              editTitle={editTitle} editContent={editContent}
            />
          </div>
        )}
      </div>
      {isFloating && <CornerResizeHandle onMouseDown={onCornerDown} />}
    </div>
  );
}

export default OptimizedApp;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Fix any import or type errors.

- [ ] **Step 3: Commit**

```bash
git add src/OptimizedApp.tsx
git commit -m "feat: rewrite OptimizedApp as slim layout shell using extracted components and hooks"
```

---

### Task 9: Delete simpleStorage.ts and update imports

**Files:**
- Delete: `src/simpleStorage.ts`
- Modify: `src/services/index.ts` (remove simpleStorage export if present)
- Verify: `src/OptimizedApp.tsx` no longer imports simpleStorage

- [ ] **Step 1: Delete `src/simpleStorage.ts`**

```bash
rm src/simpleStorage.ts
```

- [ ] **Step 2: Check no imports of simpleStorage remain**

Run: `grep -r "simpleStorage" src/ --include="*.ts" --include="*.tsx"`
Expected: No results.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete simpleStorage.ts, storage is now unified via StorageService"
```

---

### Task 10: Delete dead code — WINDOW_SIZES, setWindowPreset, legacy render

**Files:**
- Modify: `src/utils/constants.ts` — remove `WINDOW_SIZES`
- Modify: `src/utils/index.ts` — update re-exports if needed
- Verify: no references to WINDOW_SIZES, `_renderMarkdownLegacy`, `windowSize`, `customWidth`, `customHeight` remain

- [ ] **Step 1: Remove `WINDOW_SIZES` export from `src/utils/constants.ts`**

Delete these lines from constants.ts:

```ts
export const WINDOW_SIZES = {
  SMALL: { width: 420, height: 560 },
  MEDIUM: { width: 600, height: 700 },
  LARGE: { width: 800, height: 800 }
};
```

- [ ] **Step 2: Verify no references to WINDOW_SIZES**

Run: `grep -r "WINDOW_SIZES" src/ --include="*.ts" --include="*.tsx"`
Expected: No results.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/utils/constants.ts
git commit -m "chore: remove WINDOW_SIZES constant (no longer used)"
```

---

### Task 11: Fix CSS — rgba bug, remove size-buttons, rename resize classes, add divider-resize

**Files:**
- Modify: `src/styles/optimized.css`

- [ ] **Step 1: Fix the rgba bug on line 1682**

Find `rgba102, 241(99, , 0.4)` and replace with `rgba(99, 102, 241, 0.4)`.

- [ ] **Step 2: Remove `.size-buttons` and related styles**

Delete this CSS block:
```css
.size-buttons {
  display: flex;
  gap: 3px;
  background-color: var(--bg-tertiary);
  padding: 4px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-xs) inset;
}

.size-btn {
  ...
}

.size-btn:hover {
  ...
}

.size-btn:active {
  ...
}

.size-btn.active {
  ...
}
```

And the `.mode-btn.active, .size-btn.active` combined selector — split it to only `.mode-btn.active`.

- [ ] **Step 3: Rename `.resize-handle` to `.corner-resize-handle`**

Find all `.resize-handle` references and rename to `.corner-resize-handle`.

- [ ] **Step 4: Add `.divider-resize-handle` styles**

```css
.divider-resize-handle {
  width: 4px;
  cursor: col-resize;
  background-color: var(--border-color);
  transition: background-color var(--transition-fast);
  flex-shrink: 0;
}

.divider-resize-handle:hover {
  background-color: var(--primary-color);
}

.divider-resize-handle:active {
  background-color: var(--primary-hover);
}
```

- [ ] **Step 5: Remove the `<div className="header-center">` block from AppHeader**

Since S/M/L buttons are removed, there's no center section needed. Verify this was already done in the component extraction (Task 7). If not, remove it.

- [ ] **Step 6: Verify build and visual check**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/styles/optimized.css
git commit -m "fix: CSS rgba bug, remove size-buttons styles, rename resize-handle, add divider-resize-handle"
```

---

### Task 12: Update dataExportImportService — add File System Access API for export

**Files:**
- Modify: `src/services/dataExportImportService.ts`

This is already handled by the `exportToFile` utility in `helpers.ts` which was added in Task 3. The `dataExportImportService.ts` itself can stay as-is since `OptimizedApp` now calls `exportToFile` directly for markdown exports. The JSON export in SettingsPanel also calls `exportToFile`.

No additional changes needed — this was covered in Task 3 and Task 8.

- [ ] **Step 1: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 2: Commit if any changes were needed**

This step is a verification gate. If no changes were needed, skip the commit.

---

### Task 13: Final integration test — build and manual verification

**Files:**
- No new files

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Load extension and test**

1. Open `chrome://extensions/`
2. Load `dist/` as unpacked extension
3. Verify sidebar mode opens correctly
4. Verify clicking popup "悬浮窗" button opens a popup window
5. Verify notes can be created, edited, auto-saved
6. Verify Markdown preview works
7. Verify export opens file picker (in Chrome) or downloads file
8. Verify closing floating window works
9. Verify divider resize works in sidebar mode
10. Verify corner resize works in floating mode

- [ ] **Step 3: Final commit if any last fixes were needed**

```bash
git add -A
git commit -m "fix: final integration fixes"
```