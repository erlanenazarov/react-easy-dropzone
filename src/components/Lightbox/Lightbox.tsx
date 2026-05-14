import { useCallback, useEffect, type MouseEvent } from 'react';

import type { GalleryRenderProps } from '../../types';

import { Portal } from './Portal';

export const Lightbox = ({
  items,
  activeIndex,
  onChange,
  onClose,
  texts,
}: GalleryRenderProps) => {
  const total = items.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));
  const current = items[safeIndex];

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    onChange((safeIndex - 1 + total) % total);
  }, [onChange, safeIndex, total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    onChange((safeIndex + 1) % total);
  }, [onChange, safeIndex, total]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!current) return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Portal>
      <div
        className="rzd-lightbox"
        role="dialog"
        aria-modal="true"
        onClick={handleBackdropClick}
      >
        <button
          type="button"
          className="rzd-lightbox__btn rzd-lightbox__btn--close"
          aria-label={texts.galleryClose}
          onClick={onClose}
        >
          ×
        </button>
        {total > 1 && (
          <button
            type="button"
            className="rzd-lightbox__btn rzd-lightbox__btn--prev"
            aria-label={texts.galleryPrev}
            onClick={goPrev}
          >
            ‹
          </button>
        )}
        <img
          className="rzd-lightbox__img"
          src={current.src}
          alt={current.alt ?? ''}
        />
        {total > 1 && (
          <button
            type="button"
            className="rzd-lightbox__btn rzd-lightbox__btn--next"
            aria-label={texts.galleryNext}
            onClick={goNext}
          >
            ›
          </button>
        )}
        {total > 1 && (
          <div className="rzd-lightbox__counter" aria-live="polite">
            {safeIndex + 1} / {total}
          </div>
        )}
      </div>
    </Portal>
  );
};
