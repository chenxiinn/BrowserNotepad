import { useState, useCallback, useEffect, useRef } from 'react';

export function useDividerResize(initialWidthPercent: number = 42) {
  const [listWidthPercent, setListWidthPercent] = useState(initialWidthPercent);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setListWidthPercent(Math.max(20, Math.min(70, percent)));
    };
    const onMouseUp = () => { isDragging.current = false; };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { listWidthPercent, onMouseDown, containerRef };
}

export function useCornerResize(initWidth: number = 500, initHeight: number = 700) {
  const [width, setWidth] = useState(initWidth);
  const [height, setHeight] = useState(initHeight);
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(Math.max(350, e.clientX));
      setHeight(Math.max(350, e.clientY));
    };
    const onMouseUp = () => { isDragging.current = false; };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { width, height, onMouseDown };
}