import { Note, Category, Tag, AppConfig } from '../types';

const STORAGE_KEYS = {
  NOTES: 'chrome-note-app-notes',
  CATEGORIES: 'chrome-note-app-categories',
  TAGS: 'chrome-note-app-tags',
  CONFIG: 'chrome-note-app-config',
};

// 内存缓存
interface Cache {
  notes: Note[] | null;
  categories: Category[] | null;
  tags: Tag[] | null;
  config: AppConfig | null;
}

const cache: Cache = {
  notes: null,
  categories: null,
  tags: null,
  config: null,
};

// 缓存过期时间（毫秒）
const CACHE_TTL = 5 * 60 * 1000; // 5分钟
const cacheTimestamps: Record<string, number> = {};

// 导入数据选项
interface ImportOptions {
  mode: 'replace' | 'merge'; // replace: 替换所有数据; merge: 合并导入
  skipValidation?: boolean;
}

// 导入数据结果
interface ImportResult {
  success: boolean;
  imported: { notes: number; categories: number; tags: number };
  errors: string[];
}

export class StorageService {
  // 检查缓存是否过期
  private isCacheExpired(key: string): boolean {
    const timestamp = cacheTimestamps[key];
    return !timestamp || (Date.now() - timestamp > CACHE_TTL);
  }

  // 通用存储方法
  private async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  }

  private async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  // 清空缓存
  private clearCache(key?: string): void {
    if (key) {
      // @ts-ignore
      cache[key] = null;
      delete cacheTimestamps[key];
    } else {
      Object.keys(cache).forEach(k => {
        // @ts-ignore
        cache[k] = null;
        delete cacheTimestamps[k];
      });
    }
  }

  // 笔记操作
  async getNotes(filters?: any): Promise<Note[]> {
    // 使用缓存
    let notes: Note[];
    if (cache.notes && !this.isCacheExpired('notes')) {
      notes = cache.notes;
    } else {
      notes = (await this.get<Note[]>(STORAGE_KEYS.NOTES)) || [];
      cache.notes = notes;
      cacheTimestamps['notes'] = Date.now();
    }

    if (filters) {
      if (filters.categoryId) {
        notes = notes.filter(note => note.categoryId === filters.categoryId);
      }
      if (filters.tagIds && filters.tagIds.length > 0) {
        notes = notes.filter(note =>
          filters.tagIds.some((tagId: string) => note.tagIds.includes(tagId))
        );
      }
      if (filters.isFavorite !== undefined) {
        notes = notes.filter(note => note.isFavorite === filters.isFavorite);
      }
      if (filters.isArchived !== undefined) {
        notes = notes.filter(note => note.isArchived === filters.isArchived);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        if (query) {
          notes = notes.filter(note =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
          );
        }
      }
    }

    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async setNotes(notes: Note[]): Promise<void> {
    await this.set(STORAGE_KEYS.NOTES, notes);
    cache.notes = notes;
    cacheTimestamps['notes'] = Date.now();
  }

  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const notes = await this.getNotes();
    const newNote: Note = {
      ...note,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    notes.push(newNote);
    await this.setNotes(notes);
    return newNote;
  }

  // 批量创建笔记
  async createNotes(notesData: Array<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Note[]> {
    const notes = await this.getNotes();
    const now = Date.now();
    const newNotes: Note[] = notesData.map((note, index) => ({
      ...note,
      id: (now + index).toString(),
      createdAt: now,
      updatedAt: now,
    }));
    notes.push(...newNotes);
    await this.setNotes(notes);
    return newNotes;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    const notes = await this.getNotes();
    const index = notes.findIndex(note => note.id === id);

    if (index === -1) return null;

    const updatedNote: Note = {
      ...notes[index],
      ...updates,
      updatedAt: Date.now(),
    };
    notes[index] = updatedNote;
    await this.setNotes(notes);
    return updatedNote;
  }

  // 批量更新笔记
  async updateNotes(updates: Array<{ id: string; updates: Partial<Note> }>): Promise<Note[]> {
    const notes = await this.getNotes();
    const now = Date.now();
    const updatedNotes: Note[] = [];

    for (const { id, updates: noteUpdates } of updates) {
      const index = notes.findIndex(note => note.id === id);
      if (index !== -1) {
        const updatedNote: Note = {
          ...notes[index],
          ...noteUpdates,
          updatedAt: now,
        };
        notes[index] = updatedNote;
        updatedNotes.push(updatedNote);
      }
    }

    await this.setNotes(notes);
    return updatedNotes;
  }

  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    await this.setNotes(filteredNotes);
  }

  // 批量删除笔记
  async deleteNotes(ids: string[]): Promise<void> {
    const notes = await this.getNotes();
    const filteredNotes = notes.filter(note => !ids.includes(note.id));
    await this.setNotes(filteredNotes);
  }

  async searchNotes(query: string): Promise<Note[]> {
    return this.getNotes({ searchQuery: query });
  }

  // 分类操作
  async getCategories(): Promise<Category[]> {
    // 使用缓存
    if (cache.categories && !this.isCacheExpired('categories')) {
      return cache.categories;
    }
    const categories = (await this.get<Category[]>(STORAGE_KEYS.CATEGORIES)) || [];
    cache.categories = categories;
    cacheTimestamps['categories'] = Date.now();
    return categories;
  }

  async setCategories(categories: Category[]): Promise<void> {
    await this.set(STORAGE_KEYS.CATEGORIES, categories);
    cache.categories = categories;
    cacheTimestamps['categories'] = Date.now();
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const categories = await this.getCategories();
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    categories.push(newCategory);
    await this.setCategories(categories);
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    const categories = await this.getCategories();
    const index = categories.findIndex(category => category.id === id);

    if (index === -1) return null;

    const updatedCategory: Category = {
      ...categories[index],
      ...updates,
      updatedAt: Date.now(),
    };
    categories[index] = updatedCategory;
    await this.setCategories(categories);
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = await this.getCategories();
    const filteredCategories = categories.filter(category => category.id !== id);
    await this.setCategories(filteredCategories);
  }

  // 标签操作
  async getTags(): Promise<Tag[]> {
    // 使用缓存
    if (cache.tags && !this.isCacheExpired('tags')) {
      return cache.tags;
    }
    const tags = (await this.get<Tag[]>(STORAGE_KEYS.TAGS)) || [];
    cache.tags = tags;
    cacheTimestamps['tags'] = Date.now();
    return tags;
  }

  async setTags(tags: Tag[]): Promise<void> {
    await this.set(STORAGE_KEYS.TAGS, tags);
    cache.tags = tags;
    cacheTimestamps['tags'] = Date.now();
  }

  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const tags = await this.getTags();
    const newTag: Tag = {
      ...tag,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    tags.push(newTag);
    await this.setTags(tags);
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null> {
    const tags = await this.getTags();
    const index = tags.findIndex(tag => tag.id === id);

    if (index === -1) return null;

    const updatedTag: Tag = {
      ...tags[index],
      ...updates,
      updatedAt: Date.now(),
    };
    tags[index] = updatedTag;
    await this.setTags(tags);
    return updatedTag;
  }

  async deleteTag(id: string): Promise<void> {
    const tags = await this.getTags();
    const filteredTags = tags.filter(tag => tag.id !== id);
    await this.setTags(filteredTags);
  }

  // 配置操作
  async getConfig(): Promise<AppConfig> {
    // 使用缓存
    if (cache.config && !this.isCacheExpired('config')) {
      return cache.config;
    }
    const defaultConfig: AppConfig = {
      theme: 'light',
      defaultCategoryId: '',
      searchHistory: [],
      autoSaveInterval: 30,
    };
    const config = (await this.get<AppConfig>(STORAGE_KEYS.CONFIG)) || defaultConfig;
    cache.config = config;
    cacheTimestamps['config'] = Date.now();
    return config;
  }

  async setConfig(config: AppConfig): Promise<void> {
    await this.set(STORAGE_KEYS.CONFIG, config);
    cache.config = config;
    cacheTimestamps['config'] = Date.now();
  }

  async updateAppConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
    const config = await this.getConfig();
    const updatedConfig = { ...config, ...updates };
    await this.setConfig(updatedConfig);
    return updatedConfig;
  }

  // 导出所有数据
  async exportData(): Promise<string> {
    const notes = await this.getNotes();
    const categories = await this.getCategories();
    const tags = await this.getTags();
    const config = await this.getConfig();

    const data = {
      notes,
      categories,
      tags,
      config,
      exportDate: new Date().toISOString(),
      version: '1.1.0',
    };

    return JSON.stringify(data, null, 2);
  }

  // 验证笔记数据
  private validateNote(note: any): note is Note {
    return (
      typeof note === 'object' &&
      note !== null &&
      typeof note.id === 'string' &&
      typeof note.title === 'string' &&
      typeof note.content === 'string' &&
      typeof note.categoryId === 'string' &&
      Array.isArray(note.tagIds) &&
      typeof note.createdAt === 'number' &&
      typeof note.updatedAt === 'number' &&
      typeof note.isFavorite === 'boolean' &&
      typeof note.isArchived === 'boolean' &&
      typeof note.color === 'string'
    );
  }

  // 验证分类数据
  private validateCategory(category: any): category is Category {
    return (
      typeof category === 'object' &&
      category !== null &&
      typeof category.id === 'string' &&
      typeof category.name === 'string' &&
      typeof category.color === 'string' &&
      typeof category.createdAt === 'number' &&
      typeof category.updatedAt === 'number'
    );
  }

  // 验证标签数据
  private validateTag(tag: any): tag is Tag {
    return (
      typeof tag === 'object' &&
      tag !== null &&
      typeof tag.id === 'string' &&
      typeof tag.name === 'string' &&
      typeof tag.color === 'string' &&
      typeof tag.createdAt === 'number' &&
      typeof tag.updatedAt === 'number'
    );
  }

  // 导入数据
  async importData(jsonString: string, options: ImportOptions = { mode: 'merge' }): Promise<ImportResult> {
    const errors: string[] = [];
    let importedNotes = 0;
    let importedCategories = 0;
    let importedTags = 0;

    try {
      const data = JSON.parse(jsonString);

      // 验证数据结构
      if (!data || typeof data !== 'object') {
        throw new Error('无效的数据格式');
      }

      // 处理分类
      if (data.categories && Array.isArray(data.categories)) {
        const validCategories: Category[] = [];
        for (const category of data.categories) {
          if (options.skipValidation || this.validateCategory(category)) {
            validCategories.push(category);
          } else {
            errors.push(`无效的分类数据: ${JSON.stringify(category).substring(0, 50)}...`);
          }
        }

        if (options.mode === 'replace') {
          await this.setCategories(validCategories);
        } else {
          // 合并模式：保留现有分类，只添加新的
          const existingCategories = await this.getCategories();
          const existingIds = new Set(existingCategories.map(c => c.id));
          const newCategories = validCategories.filter(c => !existingIds.has(c.id));
          await this.setCategories([...existingCategories, ...newCategories]);
          importedCategories = newCategories.length;
        }
        if (options.mode === 'replace') {
          importedCategories = validCategories.length;
        }
      }

      // 处理标签
      if (data.tags && Array.isArray(data.tags)) {
        const validTags: Tag[] = [];
        for (const tag of data.tags) {
          if (options.skipValidation || this.validateTag(tag)) {
            validTags.push(tag);
          } else {
            errors.push(`无效的标签数据: ${JSON.stringify(tag).substring(0, 50)}...`);
          }
        }

        if (options.mode === 'replace') {
          await this.setTags(validTags);
        } else {
          // 合并模式：保留现有标签，只添加新的
          const existingTags = await this.getTags();
          const existingIds = new Set(existingTags.map(t => t.id));
          const newTags = validTags.filter(t => !existingIds.has(t.id));
          await this.setTags([...existingTags, ...newTags]);
          importedTags = newTags.length;
        }
        if (options.mode === 'replace') {
          importedTags = validTags.length;
        }
      }

      // 处理笔记
      if (data.notes && Array.isArray(data.notes)) {
        const validNotes: Note[] = [];
        for (const note of data.notes) {
          if (options.skipValidation || this.validateNote(note)) {
            validNotes.push(note);
          } else {
            errors.push(`无效的笔记数据: ${JSON.stringify(note).substring(0, 50)}...`);
          }
        }

        if (options.mode === 'replace') {
          await this.setNotes(validNotes);
        } else {
          // 合并模式：保留现有笔记，只添加新的
          const existingNotes = await this.getNotes();
          const existingIds = new Set(existingNotes.map(n => n.id));
          const newNotes = validNotes.filter(n => !existingIds.has(n.id));
          await this.setNotes([...existingNotes, ...newNotes]);
          importedNotes = newNotes.length;
        }
        if (options.mode === 'replace') {
          importedNotes = validNotes.length;
        }
      }

      // 处理配置（只在替换模式下导入）
      if (data.config && options.mode === 'replace') {
        await this.setConfig(data.config);
      }

      return {
        success: true,
        imported: {
          notes: importedNotes,
          categories: importedCategories,
          tags: importedTags,
        },
        errors,
      };
    } catch (error) {
      console.error('Import data failed:', error);
      errors.push(error instanceof Error ? error.message : '导入数据失败');
      return {
        success: false,
        imported: { notes: 0, categories: 0, tags: 0 },
        errors,
      };
    }
  }

  // 批量获取所有数据（一次性获取，减少 API 调用）
  async getAllData(): Promise<{
    notes: Note[];
    categories: Category[];
    tags: Tag[];
    config: AppConfig;
  }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        [
          STORAGE_KEYS.NOTES,
          STORAGE_KEYS.CATEGORIES,
          STORAGE_KEYS.TAGS,
          STORAGE_KEYS.CONFIG,
        ],
        (result) => {
          const defaultConfig: AppConfig = {
            theme: 'light',
            defaultCategoryId: '',
            searchHistory: [],
            autoSaveInterval: 30,
          };

          const data = {
            notes: (result[STORAGE_KEYS.NOTES] as Note[]) || [],
            categories: (result[STORAGE_KEYS.CATEGORIES] as Category[]) || [],
            tags: (result[STORAGE_KEYS.TAGS] as Tag[]) || [],
            config: (result[STORAGE_KEYS.CONFIG] as AppConfig) || defaultConfig,
          };

          // 更新缓存
          cache.notes = data.notes;
          cache.categories = data.categories;
          cache.tags = data.tags;
          cache.config = data.config;
          Object.keys(cache).forEach(key => {
            cacheTimestamps[key] = Date.now();
          });

          resolve(data);
        }
      );
    });
  }

  // 批量设置所有数据（一次性设置，减少 API 调用）
  async setAllData(data: {
    notes?: Note[];
    categories?: Category[];
    tags?: Tag[];
    config?: AppConfig;
  }): Promise<void> {
    const updateData: Record<string, any> = {};

    if (data.notes !== undefined) {
      updateData[STORAGE_KEYS.NOTES] = data.notes;
      cache.notes = data.notes;
      cacheTimestamps['notes'] = Date.now();
    }
    if (data.categories !== undefined) {
      updateData[STORAGE_KEYS.CATEGORIES] = data.categories;
      cache.categories = data.categories;
      cacheTimestamps['categories'] = Date.now();
    }
    if (data.tags !== undefined) {
      updateData[STORAGE_KEYS.TAGS] = data.tags;
      cache.tags = data.tags;
      cacheTimestamps['tags'] = Date.now();
    }
    if (data.config !== undefined) {
      updateData[STORAGE_KEYS.CONFIG] = data.config;
      cache.config = data.config;
      cacheTimestamps['config'] = Date.now();
    }

    return new Promise((resolve) => {
      chrome.storage.local.set(updateData, () => {
        resolve();
      });
    });
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(
        [
          STORAGE_KEYS.NOTES,
          STORAGE_KEYS.CATEGORIES,
          STORAGE_KEYS.TAGS,
          STORAGE_KEYS.CONFIG,
        ],
        () => {
          this.clearCache();
          resolve();
        }
      );
    });
  }
}

export const storageService = new StorageService();
