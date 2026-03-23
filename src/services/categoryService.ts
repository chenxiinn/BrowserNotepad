import { Category, CreateCategoryData, UpdateCategoryData } from '../types';
import { storageService } from './storage';
import { noteService } from './noteService';

export class CategoryService {
  // 创建分类
  async createCategory(data: CreateCategoryData): Promise<Category> {
    const categories = await storageService.getCategories();
    const newCategory: Category = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    categories.push(newCategory);
    await storageService.setCategories(categories);
    return newCategory;
  }

  // 更新分类
  async updateCategory(id: string, updates: UpdateCategoryData): Promise<Category | null> {
    const categories = await storageService.getCategories();
    const categoryIndex = categories.findIndex(category => category.id === id);

    if (categoryIndex === -1) return null;

    const updatedCategory: Category = {
      ...categories[categoryIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    categories[categoryIndex] = updatedCategory;
    await storageService.setCategories(categories);
    return updatedCategory;
  }

  // 删除分类
  async deleteCategory(id: string): Promise<void> {
    const categories = await storageService.getCategories();
    const filteredCategories = categories.filter(category => category.id !== id);
    await storageService.setCategories(filteredCategories);

    // 将该分类下的笔记移动到默认分类
    const config = await storageService.getConfig();
    const notes = await noteService.getNotes({ categoryId: id });

    for (const note of notes) {
      await noteService.updateNote(note.id, {
        categoryId: config.defaultCategoryId,
      });
    }
  }

  // 获取分类列表
  async getCategories(): Promise<Category[]> {
    const categories = await storageService.getCategories();
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  // 获取单条分类
  async getCategoryById(id: string): Promise<Category | null> {
    const categories = await storageService.getCategories();
    return categories.find(category => category.id === id) || null;
  }

  // 获取笔记数量
  async getNoteCountByCategory(categoryId: string): Promise<number> {
    const notes = await noteService.getNotes({ categoryId });
    return notes.length;
  }
}

export const categoryService = new CategoryService();
