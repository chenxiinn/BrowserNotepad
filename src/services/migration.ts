import { storageService } from './storage';

const OLD_KEY = 'chrome-notes';
const MIGRATION_FLAG = 'chrome-notes-migrated';

export async function migrateOldData(): Promise<void> {
  const flag = await chrome.storage.local.get(MIGRATION_FLAG);
  if (flag[MIGRATION_FLAG]) return;

  const result = await chrome.storage.local.get(OLD_KEY);
  const oldNotes = result[OLD_KEY];

  if (oldNotes && Array.isArray(oldNotes) && oldNotes.length > 0) {
    const existing = await storageService.getNotes();
    const merged = [...oldNotes, ...existing];
    await storageService.setNotes(merged);
    await chrome.storage.local.remove(OLD_KEY);
  }

  await chrome.storage.local.set({ [MIGRATION_FLAG]: true });
}