import { AppConfig, UpdateConfigData } from '../types';
import { storageService } from './storage';

export class ConfigService {
  // 获取配置
  async getConfig(): Promise<AppConfig> {
    return storageService.getConfig();
  }

  // 更新配置
  async updateConfig(data: UpdateConfigData): Promise<AppConfig> {
    const config = await storageService.getConfig();
    const updatedConfig = {
      ...config,
      ...data,
    };
    await storageService.setConfig(updatedConfig);
    return updatedConfig;
  }

  // 主题设置
  async setTheme(theme: 'light' | 'dark'): Promise<AppConfig> {
    return this.updateConfig({ theme });
  }

  // 设置默认分类
  async setDefaultCategory(categoryId: string): Promise<AppConfig> {
    return this.updateConfig({ defaultCategoryId: categoryId });
  }

  // 添加搜索历史
  async addSearchHistory(query: string): Promise<AppConfig> {
    const config = await storageService.getConfig();
    const searchHistory = [...new Set([query, ...config.searchHistory])].slice(0, 20);
    return this.updateConfig({ searchHistory });
  }

  // 清空搜索历史
  async clearSearchHistory(): Promise<AppConfig> {
    return this.updateConfig({ searchHistory: [] });
  }

  // 设置自动保存间隔
  async setAutoSaveInterval(interval: number): Promise<AppConfig> {
    return this.updateConfig({ autoSaveInterval: interval });
  }
}

export const configService = new ConfigService();
