import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';

import { useResolvedSettings } from '../../context/SettingsContext';
import { useDragState } from '../../hooks/useDragState';
import { usePreviewUrls } from '../../hooks/usePreviewUrls';
import type {
  DropzoneFile,
  DropzoneFileEntry,
  DropzoneProps,
  GalleryItem,
  RejectedFile,
} from '../../types';
import { cx } from '../../utils/classNames';
import {
  getFileName,
  isImage,
  matchesAllowedTypes,
} from '../../utils/fileChecks';
import { uid } from '../../utils/uid';
import { Lightbox } from '../Lightbox/Lightbox';

import { DragOverlay } from './DragOverlay';
import { FileTile } from './FileTile';

const toEntries = (files: DropzoneFile[]): DropzoneFileEntry[] =>
  files.map(file => ({ id: uid(), file }));

export const Dropzone = (props: DropzoneProps) => {
  const {
    files,
    defaultFiles,
    onSelected,
    onRejected,
    onRemove,
    disabled = false,
    className,
    style,
  } = props;

  const settings = useResolvedSettings(props);
  const {
    texts,
    allowedTypes,
    maxSize,
    multi,
    enableFullscreenGallery,
    renderGallery,
    renderTile,
  } = settings;

  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = files !== undefined;

  const [internalEntries, setInternalEntries] = useState<DropzoneFileEntry[]>(
    () => toEntries(defaultFiles ?? []),
  );
  const [controlledEntries, setControlledEntries] = useState<
    DropzoneFileEntry[]
  >(() => toEntries(files ?? []));

  useEffect(() => {
    if (!isControlled) return;
    setControlledEntries(prev => {
      const next = files ?? [];
      if (
        prev.length === next.length &&
        prev.every((entry, index) => entry.file === next[index])
      ) {
        return prev;
      }
      const previousByFile = new Map(prev.map(entry => [entry.file, entry]));
      return next.map(file => previousByFile.get(file) ?? { id: uid(), file });
    });
  }, [files, isControlled]);

  const entries = isControlled ? controlledEntries : internalEntries;

  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const previewUrls = usePreviewUrls(entries);
  const drag = useDragState(disabled);

  const acceptAttr = useMemo(
    () =>
      allowedTypes && allowedTypes.length ? allowedTypes.join(',') : undefined,
    [allowedTypes],
  );

  const commit = useCallback(
    (nextEntries: DropzoneFileEntry[], addedFiles: DropzoneFile[]) => {
      if (!isControlled) setInternalEntries(nextEntries);
      if (onSelected) {
        onSelected(
          nextEntries.map(entry => entry.file),
          addedFiles,
        );
      }
    },
    [isControlled, onSelected],
  );

  const ingest = useCallback(
    (incoming: FileList | File[] | null | undefined) => {
      if (!incoming || disabled) return;
      const list = Array.from(incoming as ArrayLike<File>);
      if (list.length === 0) return;

      const rejected: RejectedFile[] = [];
      const accepted: File[] = [];
      for (const file of list) {
        if (!matchesAllowedTypes(file, allowedTypes)) {
          rejected.push({ file, reason: 'type' });
          continue;
        }
        if (maxSize !== undefined && file.size > maxSize) {
          rejected.push({ file, reason: 'size' });
          continue;
        }
        accepted.push(file);
      }
      if (rejected.length && onRejected) onRejected(rejected);
      if (accepted.length === 0) return;

      const toAdd = multi ? accepted : accepted.slice(0, 1);
      const nextEntries = multi
        ? [...entries, ...toEntries(toAdd)]
        : toEntries(toAdd);
      commit(nextEntries, toAdd);
    },
    [allowedTypes, commit, disabled, entries, maxSize, multi, onRejected],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      drag.reset();
      if (disabled) return;
      ingest(event.dataTransfer?.files);
    },
    [disabled, drag, ingest],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      ingest(event.target.files);
      event.target.value = '';
    },
    [ingest],
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  const removeAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= entries.length) return;
      const removed = entries[index].file;
      const nextEntries = entries.filter((_, i) => i !== index);
      if (!isControlled) setInternalEntries(nextEntries);
      if (onRemove) onRemove(removed, index);
      if (onSelected) {
        onSelected(
          nextEntries.map(entry => entry.file),
          [],
        );
      }
    },
    [entries, isControlled, onRemove, onSelected],
  );

  const galleryMapping = useMemo(() => {
    const items: GalleryItem[] = [];
    const entryToGalleryIndex = new Map<number, number>();
    entries.forEach((entry, entryIndex) => {
      if (!isImage(entry.file)) return;
      const url = previewUrls.get(entry.id);
      if (!url) return;
      entryToGalleryIndex.set(entryIndex, items.length);
      items.push({ src: url, alt: getFileName(entry.file) });
    });
    return { items, entryToGalleryIndex };
  }, [entries, previewUrls]);

  const openGallery = useCallback(
    (entryIndex: number) => {
      if (!enableFullscreenGallery) return;
      const galleryPosition =
        galleryMapping.entryToGalleryIndex.get(entryIndex);
      if (galleryPosition !== undefined) setGalleryIndex(galleryPosition);
    },
    [enableFullscreenGallery, galleryMapping],
  );

  const closeGallery = useCallback(() => setGalleryIndex(null), []);

  const hasFiles = entries.length > 0;

  const galleryNode = (() => {
    if (!enableFullscreenGallery) return null;
    if (galleryIndex === null || galleryMapping.items.length === 0) return null;
    const galleryProps = {
      items: galleryMapping.items,
      activeIndex: galleryIndex,
      onChange: setGalleryIndex,
      onClose: closeGallery,
      texts,
    };
    if (renderGallery) return <>{renderGallery(galleryProps)}</>;
    return <Lightbox {...galleryProps} />;
  })();

  return (
    <>
      <div
        className={cx(
          'rzd-root',
          drag.isDragOver && 'rzd-root--drag-over',
          disabled && 'rzd-root--disabled',
          hasFiles && 'rzd-root--filled',
          className,
        )}
        style={style}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={drag.onDragEnter}
        onDragLeave={drag.onDragLeave}
        onDragOver={drag.onDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="rzd-input"
          multiple={multi}
          accept={acceptAttr}
          disabled={disabled}
          onChange={handleInputChange}
          tabIndex={-1}
        />
        {!hasFiles ? (
          <div className="rzd-placeholder">{texts.placeholder}</div>
        ) : (
          <div className="rzd-tiles" onClick={event => event.stopPropagation()}>
            {entries.map((entry, index) => (
              <FileTile
                key={entry.id}
                id={entry.id}
                file={entry.file}
                previewUrl={previewUrls.get(entry.id) ?? null}
                texts={texts}
                disabled={disabled}
                onRemove={() => removeAt(index)}
                onOpen={
                  enableFullscreenGallery &&
                  galleryMapping.entryToGalleryIndex.has(index)
                    ? () => openGallery(index)
                    : undefined
                }
                renderTile={renderTile}
              />
            ))}
          </div>
        )}
        {drag.isDragOver && <DragOverlay text={texts.dragOverlay} />}
      </div>
      {galleryNode}
    </>
  );
};
