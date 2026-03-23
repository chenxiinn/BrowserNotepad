import { storageService } from '../services/storage';
import { categoryService } from '../services/categoryService';
import { configService } from '../services/configService';
import { INITIAL_CATEGORIES } from './constants';

// 初始化应用数据
export async function initializeApp(): Promise<void> {
  try {
    // 检查是否需要初始化分类
    const categories = await storageService.getCategories();
    if (categories.length === 0) {
      for (const category of INITIAL_CATEGORIES) {
        await categoryService.createCategory(category);
      }
    }

    // 确保默认分类已设置
    const config = await configService.getConfig();
    if (!config.defaultCategoryId) {
      const allCategories = await categoryService.getCategories();
      const defaultCategory = allCategories.find(c => c.id === 'default') || allCategories[0];
      if (defaultCategory) {
        await configService.setDefaultCategory(defaultCategory.id);
      }
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}
