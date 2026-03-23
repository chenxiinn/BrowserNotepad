import { Note, CreateNoteData, UpdateNoteData, NoteFilters } from '../types';
import { storageService } from './storage';

export class NoteService {
  // 创建笔记
  async createNote(data: CreateNoteData): Promise<Note> {
    const notes = await storageService.getNotes();
    const newNote: Note = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    notes.push(newNote);
    await storageService.setNotes(notes);
    return newNote;
  }

  // 更新笔记
  async updateNote(id: string, updates: UpdateNoteData): Promise<Note | null> {
    const notes = await storageService.getNotes();
    const noteIndex = notes.findIndex(note => note.id === id);

    if (noteIndex === -1) return null;

    const updatedNote: Note = {
      ...notes[noteIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    notes[noteIndex] = updatedNote;
    await storageService.setNotes(notes);
    return updatedNote;
  }

  // 删除笔记
  async deleteNote(id: string): Promise<void> {
    const notes = await storageService.getNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    await storageService.setNotes(filteredNotes);
  }

  // 获取笔记列表
  async getNotes(filters?: NoteFilters): Promise<Note[]> {
    let notes = await storageService.getNotes();

    // 应用过滤器
    if (filters) {
      if (filters.categoryId) {
        notes = notes.filter(note => note.categoryId === filters.categoryId);
      }

      if (filters.tagIds && filters.tagIds.length > 0) {
        notes = notes.filter(note =>
          filters.tagIds!.some(tagId => note.tagIds.includes(tagId))
        );
      }

      if (filters.isFavorite !== undefined) {
        notes = notes.filter(note => note.isFavorite === filters.isFavorite);
      }

      if (filters.isArchived !== undefined) {
        notes = notes.filter(note => note.isArchived === filters.isArchived);
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        notes = notes.filter(note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
        );
      }
    }

    // 按更新时间降序排序
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // 搜索笔记
  async searchNotes(query: string): Promise<Note[]> {
    return this.getNotes({
      searchQuery: query,
    });
  }

  // 获取单条笔记
  async getNoteById(id: string): Promise<Note | null> {
    const notes = await storageService.getNotes();
    return notes.find(note => note.id === id) || null;
  }
}

export const noteService = new NoteService();
