import { useCallback, useRef, useState } from 'react';

interface DragHandlers {
  isDragOver: boolean;
  onDragEnter: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  reset: () => void;
}

const hasFiles = (event: React.DragEvent): boolean => {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i += 1) {
    if (types[i] === 'Files') return true;
  }
  return false;
};

export const useDragState = (disabled: boolean): DragHandlers => {
  const counter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const onDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      event.preventDefault();
      counter.current += 1;
      setIsDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      counter.current = Math.max(0, counter.current - 1);
      if (counter.current === 0) setIsDragOver(false);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    },
    [disabled],
  );

  const reset = useCallback(() => {
    counter.current = 0;
    setIsDragOver(false);
  }, []);

  return { isDragOver, onDragEnter, onDragLeave, onDragOver, reset };
};
