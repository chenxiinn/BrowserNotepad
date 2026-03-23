import type { Note } from './types';
import { generateId } from './utils';

const STORAGE_KEY = 'chrome-notes';

export const simpleStorage = {
  async getNotes(): Promise<Note[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || [];
      } else {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch {
      return [];
    }
  },

  async saveNotes(notes: Note[]): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [STORAGE_KEY]: notes });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      }
    } catch (e) {
      console.error('Failed to save notes:', e);
    }
  },

  async createNote(title: string, content: string): Promise<Note> {
    const notes = await this.getNotes();
    const now = Date.now();
    const note: Note = {
      id: generateId(),
      title,
      content,
      categoryId: '',
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isArchived: false,
      color: '#FFFFFF'
    };
    notes.unshift(note);
    await this.saveNotes(notes);
    return note;
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index === -1) throw new Error('Note not found');

    notes[index] = {
      ...notes[index],
      ...updates,
      updatedAt: Date.now()
    };
    await this.saveNotes(notes);
    return notes[index];
  },

  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    await this.saveNotes(filtered);
  },

  async exportData(): Promise<string> {
    const notes = await this.getNotes();
    return JSON.stringify({ notes, exportedAt: new Date().toISOString() }, null, 2);
  },

  async exportToMarkdown(): Promise<string> {
    const notes = await this.getNotes();
    const dateStr = new Date().toISOString().split('T')[0];
    let content = `# 备忘录导出\n\n`;
    content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    content += `---\n\n`;

    notes.forEach((note, index) => {
      content += `## ${index + 1}. ${note.title || '无标题'}\n\n`;
      content += `- ID: ${note.id}\n`;
      content += `- 创建时间: ${new Date(note.createdAt).toLocaleString('zh-CN')}\n`;
      content += `- 更新时间: ${new Date(note.updatedAt).toLocaleString('zh-CN')}\n\n`;
      content += `---\n\n`;
      content += `${note.content || '无内容'}\n\n`;
      content += `---\n\n`;
    });

    return content;
  }
};
