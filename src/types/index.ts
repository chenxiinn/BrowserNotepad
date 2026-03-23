export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  tagIds: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isArchived: boolean;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppConfig {
  theme: 'light' | 'dark';
  defaultCategoryId: string;
  searchHistory: string[];
  autoSaveInterval: number;
}

export interface NoteFilters {
  categoryId?: string;
  tagIds?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
  searchQuery?: string;
}

export type CreateNoteData = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateNoteData = Partial<Note>;
export type CreateCategoryData = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCategoryData = Partial<Category>;
export type CreateTagData = Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTagData = Partial<Tag>;
export type UpdateConfigData = Partial<AppConfig>;
