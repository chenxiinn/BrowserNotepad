import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

type Block = { type: 'code'; lang: string; lines: string[] } | { type: 'lines'; start: number; end: number };

function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('```')) {
      const lang = lines[i].slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, lines: codeLines });
      if (i < lines.length) i++;
    } else {
      const start = i;
      while (i < lines.length && !lines[i].startsWith('```')) i++;
      blocks.push({ type: 'lines', start, end: i });
    }
  }
  return blocks;
}

function renderLineGroup(text: string): string {
  if (!text.trim()) return '';
  try {
    const html = marked.parse(text) as string;
    return html.replace(/<\/?p>/g, '').trim();
  } catch {
    return text;
  }
}

function renderCodeBlock(lang: string, code: string): string {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
  return `${langLabel}<pre><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
}

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
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const inputRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const blurringRef = useRef(false);

  const lines = useMemo(() => editContent.split('\n'), [editContent]);
  const safeActive = (activeBlock !== null && activeBlock < lines.length) ? activeBlock : null;

  const blocks = useMemo(() => groupBlocks(lines), [lines]);

  useEffect(() => {
    if (safeActive === null) return;
    const el = inputRefs.current.get(safeActive);
    if (el) {
      el.focus();
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [safeActive]);

  const handleChange = useCallback((index: number, value: string) => {
    const newLines = [...lines];
    newLines[index] = value;
    onEditContentChange(newLines.join('\n'));
  }, [lines, onEditContentChange]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const pos = textarea.selectionStart;
    const val = textarea.value;

    if (e.key === 'Enter' && !e.shiftKey && !textarea.closest('.code-block-textarea')) {
      e.preventDefault();
      const before = val.slice(0, pos);
      const after = val.slice(pos);
      const newLines = [...lines];
      newLines[index] = before;
      newLines.splice(index + 1, 0, after);
      onEditContentChange(newLines.join('\n'));
      setActiveBlock(index + 1);
      requestAnimationFrame(() => {
        const el = inputRefs.current.get(index + 1);
        if (el) {
          el.focus();
          el.setSelectionRange(0, 0);
        }
      });
      return;
    }

    if (e.key === 'Backspace' && pos === 0 && textarea.selectionEnd === 0 && index > 0) {
      e.preventDefault();
      const prevLen = lines[index - 1].length;
      const newLines = [...lines];
      newLines[index - 1] = newLines[index - 1] + lines[index];
      newLines.splice(index, 1);
      onEditContentChange(newLines.join('\n'));
      setActiveBlock(index - 1);
      requestAnimationFrame(() => {
        const el = inputRefs.current.get(index - 1);
        if (el) {
          el.focus();
          el.setSelectionRange(prevLen, prevLen);
        }
      });
      return;
    }

    if (e.key === 'ArrowUp' && pos === 0 && index > 0) {
      e.preventDefault();
      setActiveBlock(index - 1);
      requestAnimationFrame(() => {
        const el = inputRefs.current.get(index - 1);
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
      return;
    }

    if (e.key === 'ArrowDown' && pos === val.length && index < lines.length - 1) {
      e.preventDefault();
      setActiveBlock(index + 1);
      requestAnimationFrame(() => {
        const el = inputRefs.current.get(index + 1);
        if (el) { el.focus(); el.setSelectionRange(0, 0); }
      });
      return;
    }

    if (e.key === 'Escape') { setActiveBlock(null); return; }
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSave(); }
  }, [lines, onEditContentChange, onSave]);

  const handleBlur = useCallback(() => {
    blurringRef.current = true;
    setTimeout(() => {
      if (blurringRef.current && !document.activeElement?.closest('.block-edit')) {
        setActiveBlock(null);
      }
      blurringRef.current = false;
    }, 50);
  }, []);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      const newLines = [...lines, ''];
      onEditContentChange(newLines.join('\n'));
      setActiveBlock(newLines.length - 1);
    }
  }, [lines, onEditContentChange]);

  let lineOffset = 0;

  const rendered = blocks.map((block, bi) => {
    if (block.type === 'code') {
      const codeStart = lineOffset;
      const codeEnd = lineOffset + block.lines.length;
      const closeLine = codeEnd;
      const totalLines = closeLine + 1;
      lineOffset = totalLines + 1;

      const hasActive = safeActive !== null && safeActive >= codeStart && safeActive <= closeLine;

      if (hasActive) {
        const openLineRaw = '```' + block.lang;
        return (
          <div key={`code-${bi}`} className="block-edit code-block-container">
            <div className="code-block-open">{openLineRaw}</div>
            {block.lines.map((cl, ci) => (
              <textarea
                key={ci}
                ref={el => { if (el && codeStart + ci === safeActive) inputRefs.current.set(codeStart + ci, el); }}
                className="block-input code-block-textarea"
                value={cl}
                onChange={e => {
                  const newLines = [...lines];
                  newLines[codeStart + 1 + ci] = e.target.value;
                  onEditContentChange(newLines.join('\n'));
                }}
                onKeyDown={e => handleKeyDown(codeStart + 1 + ci, e)}
                onBlur={handleBlur}
                rows={1}
              />
            ))}
            <div className="code-block-close">{'```'}</div>
          </div>
        );
      }

      return (
        <div
          key={`code-${bi}`}
          className="block-view block-code"
          onClick={() => setActiveBlock(codeStart)}
          dangerouslySetInnerHTML={{ __html: renderCodeBlock(block.lang, block.lines.join('\n')) }}
        />
      );
    }

    const { start, end } = block;
    lineOffset = end;

    const elements = [];
    for (let i = start; i < end; i++) {
      if (i === safeActive) {
        elements.push(
          <div key={i} className="block-edit">
            <textarea
              ref={el => { if (el) inputRefs.current.set(i, el); }}
              value={lines[i]}
              onChange={e => { handleChange(i, e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onKeyDown={e => handleKeyDown(i, e)}
              onBlur={handleBlur}
              className="block-input"
              rows={1}
            />
          </div>
        );
        continue;
      }

      const line = lines[i];
      if (!line.trim()) {
        elements.push(
          <div key={i} className="block-empty" onClick={() => setActiveBlock(i)} />
        );
        continue;
      }

      const rendered = renderLineGroup(line);
      if (rendered) {
        elements.push(
          <div
            key={i}
            className="block-view"
            onClick={() => setActiveBlock(i)}
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        );
      } else {
        elements.push(
          <div key={i} className="block-empty" onClick={() => setActiveBlock(i)} />
        );
      }
    }
    return <>{elements}</>;
  });

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
      <div className="editor-content" ref={containerRef} onClick={handleContentClick}>
        {rendered}
        {lines.length === 0 && (
          <div className="block-empty block-empty-hint" onClick={() => setActiveBlock(0)}>
            点击开始编写，支持 Markdown 格式...
          </div>
        )}
      </div>
    </div>
  );
}