import { storageService } from './storage';

export interface ImportResult {
  success: boolean;
  imported: { notes: number; categories: number; tags: number };
  errors: string[];
}

export interface ImportOptions {
  mode: 'replace' | 'merge';
  skipValidation?: boolean;
}

export class DataExportImportService {
  // 导出数据
  async exportData(): Promise<string> {
    try {
      return await storageService.exportData();
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Export failed');
    }
  }

  // 预览导入数据
  previewImportData(jsonString: string): {
    notesCount: number;
    categoriesCount: number;
    tagsCount: number;
    exportDate?: string;
    version?: string;
  } | null {
    try {
      const data = JSON.parse(jsonString);
      return {
        notesCount: Array.isArray(data.notes) ? data.notes.length : 0,
        categoriesCount: Array.isArray(data.categories) ? data.categories.length : 0,
        tagsCount: Array.isArray(data.tags) ? data.tags.length : 0,
        exportDate: data.exportDate,
        version: data.version,
      };
    } catch {
      return null;
    }
  }

  // 导入数据
  async importData(jsonString: string, options: ImportOptions = { mode: 'merge' }): Promise<ImportResult> {
    try {
      return await storageService.importData(jsonString, options);
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        imported: { notes: 0, categories: 0, tags: 0 },
        errors: [error instanceof Error ? error.message : '导入失败'],
      };
    }
  }

  // 下载导出文件
  downloadExportFile(data: string, fileName?: string): void {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `chrome-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 导入文件
  importFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      reader.readAsText(file);
    });
  }

  // 验证文件类型
  validateFileType(file: File): boolean {
    // 检查文件扩展名
    const validExtensions = ['.json', '.txt'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    // 检查 MIME 类型
    const validMimeTypes = ['application/json', 'text/plain', ''];
    const hasValidMimeType = validMimeTypes.includes(file.type);

    return hasValidExtension || hasValidMimeType;
  }

  // 导出为 Markdown 格式
  exportToMarkdown(): string {
    // 这个功能在主应用中已经有实现
    // 这里可以保留为空或者调用其他服务
    return '';
  }
}

export const dataExportImportService = new DataExportImportService();
