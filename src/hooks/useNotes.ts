import { useState, useCallback, useEffect, useRef } from 'react';
import { storageService } from '../services/storage';
import type { Note } from '../types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const persistedIds = useRef<Set<string>>(new Set());

  const loadNotes = useCallback(async () => {
    try {
      const data = await storageService.getNotes();
      data.forEach(n => persistedIds.current.add(n.id));
      setNotes(data.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {
      console.error('Failed to load notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback((title: string, content: string): Note => {
    const now = Date.now();
    const note: Note = {
      id: now.toString(36) + Math.random().toString(36).substr(2),
      title,
      content,
      categoryId: '',
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isArchived: false,
      color: '#FFFFFF',
    };
    setNotes(prev => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<Note> => {
    const updated = await storageService.updateNote(id, updates);
    persistedIds.current.add(id);
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
    return updated;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    if (persistedIds.current.has(id)) {
      await storageService.deleteNote(id);
    }
    persistedIds.current.delete(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const removeLocalNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const filteredNotes = useCallback((query: string): Note[] => {
    if (!query) return notes;
    const q = query.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes]);

  return { notes, loading, loadNotes, createNote, updateNote, deleteNote, filteredNotes, removeLocalNote };
}