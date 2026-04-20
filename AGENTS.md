# AGENTS.md

## Commands

```bash
npm run dev       # Vite dev server (hot reload) — no Chrome extension context, storage fallbacks to localStorage
npm run build     # tsc && vite build — outputs to dist/
npm run preview   # Preview production build locally
```

No test runner or linter is configured.

## Build & Load as Extension

1. `npm run build`
2. `chrome://extensions/` → enable Developer mode → Load unpacked → select `dist/`

The Vite config uses a custom plugin to copy `public/manifest.json`, `public/popup.html`, and `public/popup.js` into `dist/` after bundling. The background script is a separate Rollup entry (`src/background/background.ts`) that outputs as `dist/background.js`.

## Architecture

- **Entry**: `src/optimizedMain.tsx` → `OptimizedApp.tsx` (single 900-line component)
- **Two storage layers** that coexist but use different keys:
  - `simpleStorage.ts` — flat array under key `chrome-notes`, used by OptimizedApp for CRUD. Falls back to `localStorage` when `chrome.storage` is unavailable (dev mode).
  - `services/storage.ts` (`StorageService`) — separate keys (`chrome-note-app-notes`, `-categories`, `-tags`, `-config`), in-memory cache with 5-min TTL, batch ops, import validation. Used by category/tag/config services.
- **Background**: `src/background/background.ts` — Manifest V3 service worker. Handles side panel open, message routing, `openMode` preference.
- **Popup**: `public/popup.html` + `popup.js` — separate non-React entry, not built by Vite.

## Key Constraints

- `tsconfig.json` has `strict: false`, `noUnusedLocals: false`, `noUnusedParameters: false` — don't add strictness without asking.
- Theme stored in `localStorage` (key `chrome-note-app-theme`); open mode stored in `chrome.storage.local` (key `openMode`).
- `simpleStorage` and `StorageService` write to different keys — data is not shared between them.
- No tests exist. Don't assume a test framework.
- `marked` library is the Markdown renderer; `_renderMarkdownLegacy` is the fallback inside OptimizedApp.