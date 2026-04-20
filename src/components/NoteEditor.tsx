import { useState, useRef, useEffect, useCallback } from 'react';
import type { Note } from '../types';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string) {
  if (!text) return { __html: '<p style="color:var(--cc-text-muted);font-style:italic">点击开始编辑...</p>' };
  try {
    return { __html: marked.parse(text) as string };
  } catch {
    return { __html: text };
  }
}

interface NoteEditorProps {
  note: Note;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onEditTitleChange: (title: string) => void;
  onEditContentChange: (content: string) => void;
  editTitle: string;
  editContent: string;
  showPreview: boolean;
  onTogglePreview: () => void;
}

export function NoteEditor({
  note, isEditing, onStartEditing, onCancelEditing, onSave,
  onEditTitleChange, onEditContentChange, editTitle, editContent,
}: NoteEditorProps) {
  const [editingField, setEditingField] = useState<'title' | 'content' | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  const handleTitleClick = useCallback(() => {
    setEditingField('title');
    onStartEditing();
  }, [onStartEditing]);

  const handleContentClick = useCallback(() => {
    setEditingField('content');
    onStartEditing();
  }, [onStartEditing]);

  const handleBlur = useCallback(() => {
    if (editingField === 'title') {
      setTimeout(() => {
        const active = document.activeElement;
        if (active !== contentRef.current) {
          setEditingField(null);
          onSave();
        }
      }, 100);
    } else if (editingField === 'content') {
      setTimeout(() => {
        const active = document.activeElement;
        if (active !== contentRef.current) {
          setEditingField(null);
          onSave();
        }
      }, 100);
    }
  }, [editingField, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingField(null);
      onCancelEditing();
    }
    if (editingField === 'title' && e.key === 'Enter') {
      e.preventDefault();
      setEditingField('content');
    }
    if (editingField === 'content' && e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    }
  }, [editingField, onCancelEditing, onSave]);

  useEffect(() => {
    if (editingField === 'title') {
      // title input gets focus via autoFocus
    }
    if (editingField === 'content' && contentRef.current) {
      contentRef.current.focus();
      const len = contentRef.current.value.length;
      contentRef.current.setSelectionRange(len, len);
    }
  }, [editingField]);

  return (
    <div className="note-editor">
      {/* Title - always visible, click to edit */}
      <div className="editor-title-area">
        {editingField === 'title' ? (
          <input
            type="text"
            className="title-input"
            value={editTitle}
            onChange={e => onEditTitleChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="输入标题..."
            autoFocus
          />
        ) : (
          <h2
            className="editable-title"
            onClick={handleTitleClick}
            title="点击编辑标题"
          >
            {editTitle || '无标题'}
          </h2>
        )}
      </div>

      {/* Content - Typora-style: click to edit markdown, blur to render */}
      <div className="editor-content">
        {editingField === 'content' ? (
          <textarea
            ref={contentRef}
            className="content-textarea"
            value={editContent}
            onChange={e => {
              if (!isComposing) {
                onEditContentChange(e.target.value);
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              onEditContentChange((e.target as HTMLTextAreaElement).value);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="支持 Markdown: # 标题, **粗体**, *斜体*, `代码`"
            autoFocus
          />
        ) : (
          <div
            ref={displayRef}
            className="preview-content editable-preview"
            onClick={handleContentClick}
            dangerouslySetInnerHTML={renderMarkdown(editContent)}
            title="点击编辑内容"
          />
        )}
      </div>
    </div>
  );
}