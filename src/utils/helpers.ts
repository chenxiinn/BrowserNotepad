export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return formatDate(timestamp);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Markdown 导出为单个文件 - 仅导出笔记内容
export const exportNotesToMarkdown = (notes: any[]): string => {
  let content = '';

  notes.forEach((note, index) => {
    if (index > 0) {
      content += '\n\n---\n\n';
    }
    if (note.title) {
      content += `# ${note.title}\n\n`;
    }
    content += `${note.content || ''}`;
  });

  return content;
};

// 单个笔记导出为 Markdown - 仅导出笔记内容
export const exportSingleNoteToMarkdown = (note: any): string => {
  let content = '';
  if (note.title) {
    content += `# ${note.title}\n\n`;
  }
  content += `${note.content || ''}`;
  return content;
};
