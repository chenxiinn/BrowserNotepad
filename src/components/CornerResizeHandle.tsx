interface CornerResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export function CornerResizeHandle({ onMouseDown }: CornerResizeHandleProps) {
  return (
    <div className="corner-resize-handle" onMouseDown={onMouseDown} title="拖动调整大小" />
  );
}