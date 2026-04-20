interface DividerResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export function DividerResizeHandle({ onMouseDown }: DividerResizeHandleProps) {
  return (
    <div className="divider-resize-handle" onMouseDown={onMouseDown} title="拖动调整宽度" />
  );
}