# Chrome 备忘录插件

一个轻量级的 Chrome 浏览器备忘录插件，支持侧边栏模式，用于快速记录和管理笔记。

## 功能特性

- ✅ **Markdown 支持**：完整 Markdown 语法支持，使用 marked 库渲染
- ✅ **自动保存**：编辑时自动保存（2秒延迟）
- ✅ **侧边栏模式**：支持在浏览器侧边栏中打开
- ✅ **可缩放窗口**：支持 S/M/L 预设尺寸和自定义拖动缩放
- ✅ **多视图模式**：列表视图、分栏视图、编辑器视图
- ✅ **深色/浅色主题**：主题切换并本地存储
- ✅ **数据导入导出**：支持 JSON 和 Markdown 格式
- ✅ **本地存储**：Chrome Storage API 安全保存

## 安装

```bash
npm install
```

## 开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

## 安装到 Chrome

1. 运行 `npm run build` 构建项目
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录

## 使用方法

### 基础操作
- 点击"+ 新建"创建新笔记
- 点击笔记卡片查看和编辑
- 点击删除按钮删除笔记
- 使用搜索框搜索笔记

### 侧边栏模式
- 点击标题栏的 📑 按钮在侧边栏中打开插件
- 侧边栏模式让您在浏览网页时随时记录

### Markdown 支持
支持完整的 Markdown 语法：
- `#` 标题
- `**粗体**` **粗体**
- `*斜体*` *斜体*
- `-` 无序列表
- `1.` 有序列表
- `> ` 引用
- `` `代码` ``
- ```代码块```

### 自动保存
编辑笔记时，系统会在 2 秒无操作后自动保存，无需手动点击保存按钮。

## 项目结构

```
chrome-note-app/
├── src/
│   ├── OptimizedApp.tsx      # 主应用组件
│   ├── optimizedMain.tsx      # 应用入口
│   ├── simpleStorage.ts       # 简单存储服务
│   ├── services/             # 存储和数据导出服务
│   ├── background/           # 后台脚本
│   ├── styles/               # 样式文件
│   ├── types/                # TypeScript 类型定义
│   └── utils/                # 工具函数
├── public/manifest.json      # 插件配置
├── dist/                     # 构建输出
└── package.json
```

## 技术栈

- React 18
- TypeScript
- Vite
- marked (Markdown 渲染)
- Chrome Extension API

## 版本

v1.0.0
