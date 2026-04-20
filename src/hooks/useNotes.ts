import { useState, useCallback, useEffect } from 'react';
import { storageService } from '../services/storage';
import type { Note } from '../types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      const data = await storageService.getNotes();
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

  const createNote = useCallback(async (title: string, content: string): Promise<Note> => {
    const note = await storageService.createNote(title, content);
    setNotes(prev => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<Note> => {
    const updated = await storageService.updateNote(id, updates);
    setNotes(prev => prev.map(n => n.id === id ? updated : n));
    return updated;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await storageService.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const filteredNotes = useCallback((query: string): Note[] => {
    if (!query) return notes;
    const q = query.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes]);

  return { notes, loading, loadNotes, createNote, updateNote, deleteNote, filteredNotes };
}