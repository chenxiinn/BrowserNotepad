import { Tag, CreateTagData, UpdateTagData } from '../types';
import { storageService } from './storage';
import { noteService } from './noteService';

export class TagService {
  // 创建标签
  async createTag(data: CreateTagData): Promise<Tag> {
    const tags = await storageService.getTags();
    const newTag: Tag = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    tags.push(newTag);
    await storageService.setTags(tags);
    return newTag;
  }

  // 更新标签
  async updateTag(id: string, updates: UpdateTagData): Promise<Tag | null> {
    const tags = await storageService.getTags();
    const tagIndex = tags.findIndex(tag => tag.id === id);

    if (tagIndex === -1) return null;

    const updatedTag: Tag = {
      ...tags[tagIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    tags[tagIndex] = updatedTag;
    await storageService.setTags(tags);
    return updatedTag;
  }

  // 删除标签
  async deleteTag(id: string): Promise<void> {
    const tags = await storageService.getTags();
    const filteredTags = tags.filter(tag => tag.id !== id);
    await storageService.setTags(filteredTags);

    // 从所有笔记中移除该标签
    const notes = await noteService.getNotes();
    for (const note of notes) {
      if (note.tagIds.includes(id)) {
        await noteService.updateNote(note.id, {
          tagIds: note.tagIds.filter(tagId => tagId !== id),
        });
      }
    }
  }

  // 获取标签列表
  async getTags(): Promise<Tag[]> {
    const tags = await storageService.getTags();
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  // 获取单条标签
  async getTagById(id: string): Promise<Tag | null> {
    const tags = await storageService.getTags();
    return tags.find(tag => tag.id === id) || null;
  }

  // 获取笔记数量
  async getNoteCountByTag(tagId: string): Promise<number> {
    const notes = await noteService.getNotes({ tagIds: [tagId] });
    return notes.length;
  }
}

export const tagService = new TagService();
