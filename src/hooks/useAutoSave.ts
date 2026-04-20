import { useEffect, useRef, useCallback, useState } from 'react';
import type { Note } from '../types';

export function useAutoSave(
  isEditing: boolean,
  selectedNote: Note | null,
  editTitle: string,
  editContent: string,
  onSave: (id: string, updates: Partial<Note>) => Promise<Note>,
  enabled: boolean = true,
  delayMs: number = 2000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = useCallback(async () => {
    if (!selectedNote || !enabled) return;
    if (editTitle === selectedNote.title && editContent === selectedNote.content) return;
    setIsSaving(true);
    try {
      await onSave(selectedNote.id, { title: editTitle, content: editContent });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Auto-save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editTitle, editContent, onSave, enabled]);

  useEffect(() => {
    if (!isEditing || !enabled || !selectedNote) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isEditing, selectedNote, editTitle, editContent, enabled, save, delayMs]);

  return { isSaving, lastSaved };
}