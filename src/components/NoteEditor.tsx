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
            <button className={`icon-btn ${showPreview ? 'active' : ''}`} onClick={onTogglePreview} title="预览">👁️</button>
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
              <div className="pane-header">📝 编辑 (Markdown)</div>
              <textarea value={editContent} onChange={e => onEditContentChange(e.target.value)} placeholder="支持 Markdown 格式: # 标题, **粗体**, *斜体*, `代码`" className="content-textarea" />
            </div>
            {showPreview && (
              <div className="preview-pane">
                <div className="pane-header">👁️ 预览</div>
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
                  <p>💡 支持 Markdown 格式：</p>
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