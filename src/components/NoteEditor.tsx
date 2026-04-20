import type { Note } from '../types';

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

import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string) {
  if (!text) return { __html: '' };
  try {
    return { __html: marked.parse(text) as string };
  } catch {
    return { __html: text };
  }
}

export function NoteEditor({
  note, isEditing, onStartEditing, onCancelEditing, onSave,
  onEditTitleChange, onEditContentChange, editTitle, editContent,
  showPreview, onTogglePreview,
}: NoteEditorProps) {
  return (
    <div className="note-editor">
      <div className="editor-header">
        {isEditing ? (
          <input type="text" className="title-input" value={editTitle} onChange={e => onEditTitleChange(e.target.value)} placeholder="输入标题..." autoFocus />
        ) : (
          <h2>{note.title || '无标题'}</h2>
        )}
        <div className="editor-actions">
          {isEditing && (
            <button className={`icon-btn ${showPreview ? 'active' : ''}`} onClick={onTogglePreview} title="预览">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          )}
          {isEditing ? (
            <>
              <button className="btn-secondary" onClick={onCancelEditing}>取消</button>
              <button className="btn-primary" onClick={onSave}>保存</button>
            </>
          ) : (
            <button className="btn-primary" onClick={onStartEditing}>编辑</button>
          )}
        </div>
      </div>
      <div className="editor-content">
        {isEditing ? (
          <div className="edit-area">
            <div className="editor-pane">
              <div className="pane-header">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                编辑
              </div>
              <textarea value={editContent} onChange={e => onEditContentChange(e.target.value)} placeholder="支持 Markdown: # 标题, **粗体**, *斜体*, `代码`" className="content-textarea" />
            </div>
            {showPreview && (
              <div className="preview-pane">
                <div className="pane-header">
                  <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  预览
                </div>
                <div className="preview-content" dangerouslySetInnerHTML={renderMarkdown(editContent)} />
              </div>
            )}
          </div>
        ) : (
          <div className="note-display">
            {note.content ? (
              <div className="note-content" dangerouslySetInnerHTML={renderMarkdown(note.content)} />
            ) : (
              <div className="empty-display">
                点击"编辑"开始添加内容
                <div className="markdown-hint">
                  <p>支持 Markdown 格式</p>
                  <code># 标题</code>
                  <code>**粗体**</code>
                  <code>*斜体*</code>
                  <code>`代码`</code>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}