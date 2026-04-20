import { useState, useRef, useEffect } from 'react';
import type { Note } from '../types';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string) {
  if (!text) return { __html: '<p class="empty-hint">输入 Markdown 内容开始编辑...</p>' };
  try {
    return { __html: marked.parse(text) as string };
  } catch {
    return { __html: `<pre>${text}</pre>` };
  }
}

interface NoteEditorProps {
  note: Note;
  onEditTitleChange: (title: string) => void;
  onEditContentChange: (content: string) => void;
  editTitle: string;
  editContent: string;
}

export function NoteEditor({
  onEditTitleChange, onEditContentChange,
  editTitle, editContent,
}: NoteEditorProps) {
  const [editField, setEditField] = useState<'title' | 'content' | null>(null);
  const [renderedContent, setRenderedContent] = useState({ __html: '' });
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editField === 'title' && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editField]);

  useEffect(() => {
    if (editField === 'content' && contentRef.current) {
      contentRef.current.focus();
      const len = contentRef.current.value.length;
      contentRef.current.setSelectionRange(len, len);
    }
  }, [editField]);

  useEffect(() => {
    if (editField !== 'content') {
      setRenderedContent(renderMarkdown(editContent));
    }
  }, [editContent, editField]);

  return (
    <div className="note-editor">
      <div className="editor-title-area">
        {editField === 'title' ? (
          <input
            ref={titleRef}
            type="text"
            className="title-input"
            value={editTitle}
            onChange={e => onEditTitleChange(e.target.value)}
            onBlur={() => setEditField(null)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setEditField('content');
              }
              if (e.key === 'Escape') {
                setEditField(null);
              }
            }}
            placeholder="输入标题..."
          />
        ) : (
          <h2
            className="editable-title"
            onClick={() => setEditField('title')}
          >
            {editTitle || '无标题'}
          </h2>
        )}
      </div>
      <div className="editor-content">
        {editField === 'content' ? (
          <textarea
            ref={contentRef}
            className="content-textarea"
            value={editContent}
            onChange={e => onEditContentChange(e.target.value)}
            onBlur={() => setEditField(null)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setEditField(null);
              }
              if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
              }
            }}
            placeholder="支持 Markdown: # 标题, **粗体**, *斜体*, `代码`"
          />
        ) : (
          <div
            className="preview-content editable-preview"
            onClick={() => setEditField('content')}
            dangerouslySetInnerHTML={editField === null ? renderedContent : renderMarkdown(editContent)}
          />
        )}
      </div>
    </div>
  );
}