// 默认笔记颜色
export const DEFAULT_NOTE_COLOR = '#ffffff';

// 笔记颜色选项
export const NOTE_COLORS = [
  '#ffffff',
  '#ffd7dc',
  '#ffe0b2',
  '#fff9c4',
  '#dcedc8',
  '#b2ebf2',
  '#d1c4e9',
  '#f8bbd0',
];

// 默认分类颜色
export const DEFAULT_CATEGORY_COLOR = '#2196f3';

// 分类颜色选项
export const CATEGORY_COLORS = [
  '#2196f3',
  '#4caf50',
  '#ff9800',
  '#f44336',
  '#9c27b0',
  '#00bcd4',
  '#8bc34a',
  '#e91e63',
];

// 默认标签颜色
export const DEFAULT_TAG_COLOR = '#607d8b';

// 标签颜色选项
export const TAG_COLORS = [
  '#607d8b',
  '#ff5722',
  '#795548',
  '#3f51b5',
  '#009688',
  '#cddc39',
  '#ffc107',
  '#ff5252',
];

// 存储键
export const STORAGE_KEYS = {
  NOTES: 'chrome-note-app-notes',
  CATEGORIES: 'chrome-note-app-categories',
  TAGS: 'chrome-note-app-tags',
  CONFIG: 'chrome-note-app-config',
};

// 应用配置默认值
export const DEFAULT_CONFIG = {
  theme: 'light',
  defaultCategoryId: '',
  searchHistory: [],
  autoSaveInterval: 30,
};

// 主题
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

// 初始数据
export const INITIAL_CATEGORIES = [
  { id: 'default', name: '默认分类', color: DEFAULT_CATEGORY_COLOR },
  { id: 'work', name: '工作', color: '#4caf50' },
  { id: 'personal', name: '个人', color: '#ff9800' },
];

// 窗口大小预设
export const WINDOW_SIZES = {
  SMALL: { width: 420, height: 560 },
  MEDIUM: { width: 600, height: 700 },
  LARGE: { width: 800, height: 800 }
};
