# BrowserNotepad 修复 + 全面重构设计

## 问题概述

Chrome 备忘录插件存在以下问题：
1. 悬浮窗功能完全无法工作（background.ts 缺少处理器）
2. 两套存储系统写入不同 key，数据互不可见
3. 914 行单组件，维护困难
4. 导出不支持文件选择器
5. 缩放按钮（S/M/L）冗余，且不区分模式
6. CSS 有语法错误和大量重复

## 设计决策

### 1. 存储层统一

**现状**：`simpleStorage.ts` 用 key `chrome-notes`，`StorageService` 用 `chrome-note-app-notes` 等。主应用用 `simpleStorage`，导入导出用 `StorageService`，数据不互通。

**方案**：
- 保留 `StorageService`（已有缓存、验证、批量操作）作为唯一存储入口
- 删除 `simpleStorage.ts`
- 新增 `migration.ts`，首次加载时检查旧 key `chrome-notes`，如存在则迁移数据到新 key 并删除旧 key
- `OptimizedApp` 所有调用改为 `storageService`

数据迁移逻辑：
```ts
async function migrateOldData(): Promise<void> {
  const old = await chrome.storage.local.get('chrome-notes');
  if (old['chrome-notes']) {
    const existing = await storageService.getNotes();
    const merged = [...old['chrome-notes'], ...existing];
    await storageService.setNotes(merged);
    await chrome.storage.local.remove('chrome-notes');
  }
}
```

### 2. 组件拆分

**目标结构**：
```
src/
  components/
    AppHeader.tsx        — 顶部栏（mode-aware：弹窗显示关闭按钮）
    NoteList.tsx         — 笔记列表（搜索、卡片、空状态）
    NoteEditor.tsx       — 编辑器（标题、内容、Markdown预览）
    SettingsPanel.tsx    — 设置面板（导入导出、模式切换）
    ResizeHandle.tsx      — 缩放手柄（CornerResizeHandle + DividerResizeHandle）
  hooks/
    useNotes.ts          — 笔记 CRUD + 搜索过滤
    useTheme.ts          — 主题切换
    useAutoSave.ts       — 自动保存（2秒延迟）
    useResize.ts          — 弹窗拖动缩放
    useMode.ts            — sidePanel / floating 模式检测
  services/
    storage.ts           — 统一存储（保留，微调接口）
    categoryService.ts   — 保留
    tagService.ts         — 保留
    configService.ts     — 保留
    dataExportImportService.ts — 保留，增加 File System Access API
    migration.ts          — 新增，一次性数据迁移
  OptimizedApp.tsx       — 瘦身为 ~100 行布局壳
  optimizedMain.tsx      — 入口（不变）
```

**关键**：
- `NoteEditor` 接收 `note` 和回调，不直接管存储
- `useMode` 检测 URL 参数 `?mode=floating` 或 `chrome.windows.getCurrent` 判断模式
- `OptimizedApp` 仅做组件组装和 mode 感知

### 3. 悬浮窗与模式管理

**background.ts 补全**：
```ts
case 'openFloatingWindow':
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html') + '?mode=floating',
    type: 'popup',
    width: request.width || 500,
    height: request.height || 700,
    focused: true
  }, (win) => sendResponse({ status: 'opened', windowId: win?.id }));
  return true;

case 'closeFloatingWindow':
  chrome.windows.getCurrent((win) => {
    if (win) chrome.windows.remove(win.id);
  });
  return true;
```

**useMode hook**：
- 检测 URL 参数 `?mode=floating` 或 `chrome.windows.getCurrent` 返回的窗口类型
- 返回 `{ mode, isFloating, isSidePanel }`

**模式感知 UI**：
- 侧边栏模式：全宽填充，无窗口大小按钮，无关闭按钮，可拖动分栏调整列表/编辑器宽度
- 弹窗模式：显示关闭按钮，显示右下角拖动缩放手柄，可调整宽高

### 4. 导出文件选择器

优先使用 File System Access API（`showSaveFilePicker`），不支持时降级为 Blob 下载：

```ts
async function exportToFile(content: string, filename: string, type: string) {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: type.includes('markdown') ? 'Markdown' : 'JSON',
                   accept: { [type]: [filename.endsWith('.md') ? '.md' : '.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, method: 'picker' };
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, method: 'aborted' };
    }
  }
  // 降级：自动下载
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  return { success: true, method: 'download' };
}
```

### 5. 缩放交互

- **删除** S/M/L 预设按钮和 `WINDOW_SIZES` 常量
- **侧边栏模式**：笔记列表与编辑器之间的分割线可拖动，调整列表宽度
- **弹窗模式**：右下角拖动角可同时调整宽高，并调用 `window.resizeTo()` 同步窗口大小
- `AppHeader` 不再显示大小按钮，只保留：标题、视图切换、主题、导出、新建，弹窗模式额外显示关闭按钮

### 6. CSS 清理 & 冗余代码删除

**CSS**：
- 修复 `rgba102, 241(99, , 0.4)` → `rgba(99, 102, 241, 0.4)`（第1682行）
- 删除 `.size-buttons` 相关样式
- 重命名 `.resize-handle` → `.corner-resize-handle`
- 新增 `.divider-resize-handle` 用于分栏拖动
- 合并重复的 `.app-header` 定义

**删除**：
- `simpleStorage.ts`（存储统一到 StorageService）
- `_renderMarkdownLegacy` 函数（已用 marked 替代）
- `WINDOW_SIZES` 常量和 `setWindowPreset` 相关代码
- `windowSize` / `customWidth` / `customHeight` state
- S/M/L 按钮相关 JSX

**保留但不重构**：
- `public/popup.html` + `public/popup.js`（独立非 React 入口）

## 不在范围内

- popup.html / popup.js 的重构
- 性能优化（虚拟列表等）
- 国际化
- 单元测试框架搭建