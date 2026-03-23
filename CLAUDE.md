# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Memo (Chrome 备忘录) - A Chrome browser extension (Manifest V3) for quick note-taking with sidebar mode, Markdown support, and data import/export.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server (hot reload for development)
npm run build     # Build for production (tsc && vite build)
npm run preview   # Preview production build
```

## Loading the Extension in Chrome

1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` directory

## Architecture

### Two Storage Layers

The codebase has two parallel storage implementations:

1. **`simpleStorage.ts`** - Basic notes CRUD, stores notes under key `'chrome-notes'`. Used by `OptimizedApp` for simple operations.

2. **`services/storage.ts`** (StorageService class) - Advanced storage with:
   - In-memory caching with 5-minute TTL
   - Separate storage keys for notes, categories, tags, and config
   - Batch operations (`getAllData`, `setAllData`)
   - Data validation on import
   - Note filtering (by category, tags, favorites, search)

The `OptimizedApp` uses `simpleStorage` directly, while other services may use `storageService`.

### Entry Points and Build Output

- **`index.html`** → renders the React app (side panel mode)
- **`public/popup.html`** → separate popup window UI
- **`src/optimizedMain.tsx`** → React entry point
- **`src/OptimizedApp.tsx`** → main app component
- **`src/background/background.ts`** → Chrome service worker (Manifest V3)

Vite build:
- Outputs to `dist/`
- Custom plugin copies `manifest.json`, `popup.html`, and `popup.js` to dist
- Background script outputs as `background.js`
- App assets output to `assets/[name]-[hash].js`

### Background Script Responsibilities

The service worker (`background.ts`) handles:
- Side panel configuration and opening
- Message routing between popup and main app
- Storing `openMode` preference ('sidePanel' or 'floating')

### View Modes

`OptimizedApp` supports three view modes controlled by state:
- `'list'` - notes list only
- `'split'` - list + editor side by side
- `'editor'` - editor only

## Key Types (`src/types/index.ts`)

```typescript
Note { id, title, content, categoryId, tagIds, createdAt, updatedAt, isFavorite, isArchived, color }
Category { id, name, color, createdAt, updatedAt }
Tag { id, name, color, createdAt, updatedAt }
AppConfig { theme, defaultCategoryId, searchHistory, autoSaveInterval }
```

## Important Notes

- Theme is stored in `localStorage` (key: `'chrome-note-app-theme'`) and as `'openMode'` in `chrome.storage.local`
- Auto-save triggers after 2 seconds of inactivity when editing
- `chrome.sidePanel` API is used for sidebar mode (Manifest V3)
- The legacy `_renderMarkdownLegacy` function exists as fallback but `marked` library is the primary renderer
