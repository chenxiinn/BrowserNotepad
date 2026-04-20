# BrowserNotepad — Chrome 侧边栏笔记

轻量级 Chrome 侧边栏笔记扩展，支持 Markdown 逐行渲染，自动保存，深色/浅色主题。

## 功能

- **逐行 Markdown 渲染** — 按 Enter 提交当前行，即刻渲染为格式化文本；点击任意行回到源码编辑
- **侧边栏模式** — 仅支持 Chrome Side Panel，浏览网页时随时记录
- **自动保存** — 编辑后 2 秒自动持久化到 `chrome.storage`；空白笔记不会被保存
- **系统主题跟随** — 深色/浅色自动适配系统偏好，深色模式使用 Catppuccin Mocha 配色
- **数据导入/导出** — 支持 Markdown 和 JSON 格式
- **内联 SVG 图标** — 无外部图标依赖

## 安装与开发

```bash
npm install
npm run dev       # Vite 开发服务器（无 Chrome 扩展上下文，storage 回退到 localStorage）
npm run build     # tsc && vite build → dist/
```

加载到 Chrome：`chrome://extensions/` → 开发者模式 → 加载已解压扩展 → 选择 `dist/`

## 编辑器交互

| 操作 | 行为 |
|------|------|
| 点击渲染行 | 进入该行源码编辑 |
| Enter | 提交当前行并渲染，光标移到下一新行 |
| Shift+Enter | 在编辑区内换行（同 textarea 默认） |
| Backspace（行首、空行） | 与上一行合并 |
| ↑ / ↓（行首/行尾） | 在块之间跳转 |
| Escape | 退出编辑，回到全览模式 |
| 点击空白区域 | 末尾追加空行并进入编辑 |
| Ctrl/Cmd+S | 手动保存 |

代码块（` ``` `）作为整体渲染区域，点击后进入逐行编辑。

## 项目结构

```
src/
  OptimizedApp.tsx           # 主组件（列表 + 编辑器视图切换）
  optimizedMain.tsx          # 入口
  components/
    AppHeader.tsx             # 顶部栏
    NoteEditor.tsx            # 逐行块编辑器（marked 渲染）
    NoteListItem.tsx          # 笔记列表项
    SettingsPanel.tsx         # 设置面板
    index.ts
  hooks/
    useNotes.ts              # 笔记 CRUD（createNote 仅本地，upsert on save）
    useAutoSave.ts            # 2 秒延迟自动保存
    useTheme.ts               # 系统主题跟随
  services/
    storage.ts                # StorageService（chrome.storage / localStorage 降级）
    categoryService.ts
    tagService.ts
    configService.ts
    exportService.ts          # Markdown / JSON 导出
  styles/
    optimized.css             # Claude Code 风格主题
  types/
    index.ts                  # Note 等类型定义
  utils/
    index.ts
  background/
    background.ts             # Manifest V3 service worker（sidePanel）
public/
  manifest.json              # sidePanel + storage 权限
  images/                    # icon16/48/128.png
```

## 关键设计

- **空白笔记不持久化**：`createNote` 仅写入本地状态，首次 auto-save 时 `storageService.updateNote` 以 upsert 模式写入 storage；返回列表时空笔记由 `removeLocalNote` 清除
- **双存储层**：`simpleStorage`（key `chrome-notes`）供 OptimizedApp CRUD；`StorageService`（keys `chrome-note-app-*`）供分类/标签/配置；两者数据不互通
- **主题**：`useTheme` 监听 `prefers-color-scheme`，通过 `data-theme` 属性切换 CSS 变量；无手动切换按钮
- **Markdown 渲染**：使用 `marked` 库逐行渲染，代码块作为整体渲染区域

## 技术栈

- React 18 · TypeScript · Vite · marked · Chrome Extension Manifest V3

## 版本

v1.0.0