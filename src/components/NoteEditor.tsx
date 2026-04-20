import { useState, useRef, useEffect, useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

interface NoteEditorProps {
  onEditTitleChange: (title: string) => void;
  onEditContentChange: (content: string) => void;
  editTitle: string;
  editContent: string;
  onSave: () => void;
}

export function NoteEditor({
  onEditTitleChange, onEditContentChange,
  editTitle, editContent, onSave,
}: NoteEditorProps) {
  const [showPreview, setShowPreview] = useState(true);

  const renderedContent = useMemo(() => {
    if (!editContent) return '';
    try {
      return marked.parse(editContent) as string;
    } catch {
      return editContent;
    }
  }, [editContent]);

  return (
    <div className="note-editor">
      <div className="editor-title-area">
        <input
          type="text"
          className="title-input"
          value={editTitle}
          onChange={e => onEditTitleChange(e.target.value)}
          placeholder="输入标题..."
        />
      </div>
      <div className="editor-toolbar">
        <button
          className={`toolbar-btn ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? '隐藏预览' : '显示预览'}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {showPreview ? '预览开' : '预览关'}
        </button>
      </div>
      <div className={`editor-content ${showPreview ? 'with-preview' : ''}`}>
        <textarea
          className="content-textarea"
          value={editContent}
          onChange={e => onEditContentChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSave();
            }
          }}
          placeholder="支持 Markdown: # 标题, **粗体**, *斜体*, `代码`"
        />
        {showPreview && (
          <div className="preview-pane" dangerouslySetInnerHTML={{ __html: renderedContent }} />
        )}
      </div>
    </div>
  );
}