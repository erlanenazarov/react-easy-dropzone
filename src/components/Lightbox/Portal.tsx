import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: ReactNode;
}

export const Portal = ({ children }: Props) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const node = document.createElement('div');
    node.className = 'rzd-portal';
    document.body.appendChild(node);
    setContainer(node);
    return () => {
      document.body.removeChild(node);
    };
  }, []);

  if (!container) return null;
  return createPortal(children, container);
};
