import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ForwardedRef,
  type ReactElement,
} from 'react';

import {
  useDropzoneUpload,
  type BatchRemoveStrategy,
  type UseDropzoneUploadResult,
} from '../../hooks/useDropzoneUpload';
import type {
  DropzoneFile,
  DropzoneFileEntry,
  DropzoneProps,
  RenderTile,
  TileRenderProps,
  TileUploadState,
  UploadConfig,
  UploadEntryState,
} from '../../types';
import { uid } from '../../utils/uid';
import { Dropzone } from '../Dropzone/Dropzone';

import { UploadingTile } from './UploadingTile';

export interface UploadDropzoneHandle<T = unknown> {
  getStates: () => Map<string, UploadEntryState<T>>;
  hasPending: () => boolean;
  start: (ids?: string[]) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  abortAll: () => void;
  awaitAll: () => Promise<void>;
}

export interface UploadDropzoneProps<T = unknown>
  extends Omit<DropzoneProps, 'renderTile'> {
  upload: UploadConfig<T>;
  autoUpload?: boolean;
  enableRetry?: boolean;
  removeOnError?: boolean;
  batchRemoveStrategy?: BatchRemoveStrategy;
  onUploadStart?: (state: UploadEntryState<T>) => void;
  onUploaded?: (state: UploadEntryState<T>) => void;
  onUploadError?: (state: UploadEntryState<T>) => void;
  onAllSettled?: (states: UploadEntryState<T>[]) => void;
  onPendingChange?: (hasPending: boolean) => void;
  renderTile?: RenderTile;
  formatUploadError?: (error: Error) => string;
}

const toEntries = (files: DropzoneFile[]): DropzoneFileEntry[] =>
  files.map(file => ({ id: uid(), file }));

const sameEntries = (
  a: DropzoneFileEntry[],
  files: DropzoneFile[],
): boolean => {
  if (a.length !== files.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].file !== files[i]) return false;
  }
  return true;
};

const UploadDropzoneInner = <T,>(
  props: UploadDropzoneProps<T>,
  ref: ForwardedRef<UploadDropzoneHandle<T>>,
): ReactElement => {
  const {
    files,
    defaultFiles,
    onSelected,
    onRemove,
    upload,
    autoUpload = true,
    enableRetry = true,
    removeOnError = false,
    batchRemoveStrategy = 'abort-and-restart',
    onUploadStart,
    onUploaded,
    onUploadError,
    onAllSettled,
    onPendingChange,
    renderTile: userRenderTile,
    formatUploadError,
    ...passthrough
  } = props;

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
      if (sameEntries(prev, next)) return prev;
      const previousByFile = new Map(prev.map(entry => [entry.file, entry]));
      return next.map(file => previousByFile.get(file) ?? { id: uid(), file });
    });
  }, [files, isControlled]);

  const entries = isControlled ? controlledEntries : internalEntries;

  const handleEntriesChange = useCallback(
    (next: DropzoneFileEntry[]) => {
      if (!isControlled) setInternalEntries(next);
      if (onSelected) {
        onSelected(
          next.map(e => e.file),
          [],
        );
      }
    },
    [isControlled, onSelected],
  );

  const uploadApi: UseDropzoneUploadResult<T> = useDropzoneUpload<T>({
    entries,
    upload,
    autoUpload,
    enableRetry,
    removeOnError,
    batchRemoveStrategy,
    onUploadStart,
    onUploaded,
    onUploadError,
    onAllSettled,
    onEntriesChange: handleEntriesChange,
  });

  useEffect(() => {
    onPendingChange?.(uploadApi.hasPending);
  }, [uploadApi.hasPending, onPendingChange]);

  useImperativeHandle(
    ref,
    () => ({
      getStates: () => uploadApi.states,
      hasPending: () => uploadApi.hasPending,
      start: uploadApi.start,
      cancel: uploadApi.cancel,
      retry: uploadApi.retry,
      abortAll: uploadApi.abortAll,
      awaitAll: uploadApi.awaitAll,
    }),
    [uploadApi],
  );

  // Dropzone generates its own internal entry ids that don't match ours.
  // Map our upload states by File reference so the tile can look them up.
  const stateByFile = useMemo(() => {
    const map = new Map<DropzoneFile, UploadEntryState<T>>();
    for (const entry of entries) {
      const s = uploadApi.states.get(entry.id);
      if (s) map.set(entry.file, s);
    }
    return map;
  }, [entries, uploadApi.states]);

  const tileRender: RenderTile = useMemo(
    // eslint-disable-next-line react/display-name
    () => (tileProps: TileRenderProps) => {
      const rawState = stateByFile.get(tileProps.file);
      const tileUploadState: TileUploadState | undefined = rawState
        ? {
            status: rawState.status,
            progress: rawState.progress,
            error: rawState.error,
            result: rawState.result,
            cancel: rawState.cancel,
            retry: rawState.retry,
          }
        : undefined;

      if (userRenderTile) {
        return userRenderTile({ ...tileProps, uploadState: tileUploadState });
      }

      return (
        <UploadingTile
          file={tileProps.file}
          previewUrl={tileProps.previewUrl}
          uploadState={tileUploadState}
          texts={tileProps.texts}
          disabled={Boolean(passthrough.disabled)}
          onRemove={tileProps.remove}
          onOpen={tileProps.openInGallery}
          formatError={formatUploadError}
        />
      );
    },
    [stateByFile, userRenderTile, passthrough.disabled, formatUploadError],
  );

  const handleSelected = useCallback(
    (next: DropzoneFile[], added: DropzoneFile[]) => {
      // mutate our entries snapshot; ids are derived from existing entries
      // and new ones get fresh uids via the controlled-mode sync effect above
      // (uncontrolled) or via the parent's update (controlled).
      if (!isControlled) {
        setInternalEntries(prev => {
          if (sameEntries(prev, next)) return prev;
          const previousByFile = new Map(prev.map(e => [e.file, e]));
          return next.map(
            file => previousByFile.get(file) ?? { id: uid(), file },
          );
        });
      }
      onSelected?.(next, added);
    },
    [isControlled, onSelected],
  );

  return (
    <Dropzone
      {...passthrough}
      files={entries.map(e => e.file)}
      onSelected={handleSelected}
      onRemove={onRemove}
      renderTile={tileRender}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(UploadDropzoneInner as unknown as { displayName: string }).displayName =
  'UploadDropzone';

export const UploadDropzone = forwardRef(UploadDropzoneInner) as <T = unknown>(
  props: UploadDropzoneProps<T> & {
    ref?: ForwardedRef<UploadDropzoneHandle<T>>;
  },
) => ReactElement;
