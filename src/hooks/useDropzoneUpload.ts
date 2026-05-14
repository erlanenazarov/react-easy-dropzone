import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  DropzoneFileEntry,
  RemoteFile,
  UploadConfig,
  UploadConfigBatch,
  UploadConfigParallel,
  UploadConfigSingle,
  UploadEntryState,
} from '../types';
import { isFileInstance } from '../utils/fileChecks';

export type BatchRemoveStrategy = 'abort-all' | 'abort-and-restart' | 'ignore';

export interface UseDropzoneUploadOptions<T> {
  entries: DropzoneFileEntry[];
  upload: UploadConfig<T>;
  autoUpload?: boolean;
  enableRetry?: boolean;
  removeOnError?: boolean;
  batchRemoveStrategy?: BatchRemoveStrategy;
  onUploadStart?: (state: UploadEntryState<T>) => void;
  onUploaded?: (state: UploadEntryState<T>) => void;
  onUploadError?: (state: UploadEntryState<T>) => void;
  onAllSettled?: (states: UploadEntryState<T>[]) => void;
  onEntriesChange?: (next: DropzoneFileEntry[]) => void;
}

export interface UseDropzoneUploadResult<T> {
  states: Map<string, UploadEntryState<T>>;
  hasPending: boolean;
  start: (ids?: string[]) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  abortAll: () => void;
  awaitAll: () => Promise<void>;
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

const countPending = <T>(m: Map<string, UploadEntryState<T>>): number => {
  let n = 0;
  for (const v of m.values()) {
    if (v.status === 'uploading' || v.status === 'idle') n += 1;
  }
  return n;
};

export const useDropzoneUpload = <T>(
  options: UseDropzoneUploadOptions<T>,
): UseDropzoneUploadResult<T> => {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const entriesRef = useRef(options.entries);
  entriesRef.current = options.entries;

  const [states, setStates] = useState<Map<string, UploadEntryState<T>>>(
    () => new Map(),
  );
  const statesRef = useRef(states);
  statesRef.current = states;

  const startedRef = useRef<Set<string>>(new Set());
  const generationRef = useRef<Map<string, number>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const batchIdsRef = useRef<Set<string>>(new Set());
  const batchControllerRef = useRef<AbortController | null>(null);
  const batchGenRef = useRef(0);
  const singleQueueRef = useRef<string[]>([]);
  const singleRunningRef = useRef(false);
  const singleAbortedRef = useRef(false);

  const commitStates = (next: Map<string, UploadEntryState<T>>): void => {
    const wasPending = countPending(statesRef.current);
    statesRef.current = next;
    setStates(next);
    const nowPending = countPending(next);
    if (wasPending > 0 && nowPending === 0) {
      optionsRef.current.onAllSettled?.(Array.from(next.values()));
    }
  };

  const patchState = (
    id: string,
    patch: Partial<UploadEntryState<T>>,
  ): void => {
    const cur = statesRef.current.get(id);
    if (!cur) return;
    const next = new Map(statesRef.current);
    next.set(id, { ...cur, ...patch });
    commitStates(next);
  };

  const nextGen = (id: string): number => {
    const g = (generationRef.current.get(id) ?? 0) + 1;
    generationRef.current.set(id, g);
    return g;
  };
  const isStale = (id: string, gen: number): boolean =>
    generationRef.current.get(id) !== gen;

  // forward reference for retry inside error patches; reassigned below
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let apiRetry: (id: string) => void = () => {};

  const applyToRemoteFile = (id: string, file: File, result: T): void => {
    const opts = optionsRef.current;
    const mapper = (
      opts.upload as { toRemoteFile?: (r: T, f: File) => RemoteFile | null }
    ).toRemoteFile;
    if (!mapper) return;
    const remote = mapper(result, file);
    if (!remote) return;

    const emit = () => {
      // entry may have been removed while we were preloading
      if (!entriesRef.current.find(e => e.id === id)) return;
      const next = entriesRef.current.map(e =>
        e.id === id ? { ...e, file: remote } : e,
      );
      opts.onEntriesChange?.(next);
    };

    // Preload the remote image (if image) to avoid the blob→CDN flicker.
    // Same trick if mime hints image OR url looks like an image — fall back
    // to immediate emit otherwise.
    const looksLikeImage =
      remote.type?.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(remote.url);
    if (!looksLikeImage || typeof Image === 'undefined') {
      emit();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      emit();
    };
    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = remote.url;
    // safety: don't hold forever if the CDN never responds
    setTimeout(finish, 1500);
  };

  const buildErrorPatch = (
    error: Error,
    id: string,
  ): Partial<UploadEntryState<T>> => {
    const opts = optionsRef.current;
    return {
      status: 'error',
      error,
      cancel: undefined,
      retry:
        opts.enableRetry !== false && !opts.removeOnError
          ? () => apiRetry(id)
          : undefined,
    };
  };

  const runSingleUpload = async (id: string, file: File): Promise<void> => {
    const opts = optionsRef.current;
    const upload = opts.upload as
      | UploadConfigSingle<T>
      | UploadConfigParallel<T>;
    const gen = nextGen(id);
    const controller = new AbortController();
    controllersRef.current.set(id, controller);

    patchState(id, {
      status: 'uploading',
      progress: 0,
      error: undefined,
      result: undefined,
      cancel: () => controller.abort(),
      retry: undefined,
    });
    const starting = statesRef.current.get(id);
    if (starting) opts.onUploadStart?.(starting);

    try {
      const result = await upload.handler(file, {
        onProgress: p => {
          if (isStale(id, gen)) return;
          const cur = statesRef.current.get(id);
          if (cur?.status === 'uploading') {
            patchState(id, { progress: clamp01(p) });
          }
        },
        signal: controller.signal,
      });
      if (isStale(id, gen)) return;
      if (!entriesRef.current.find(e => e.id === id)) return;

      patchState(id, {
        status: 'success',
        progress: 1,
        result,
        cancel: undefined,
      });
      const ok = statesRef.current.get(id);
      if (ok) opts.onUploaded?.(ok);
      applyToRemoteFile(id, file, result);
    } catch (err) {
      if (isStale(id, gen)) return;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        if (entriesRef.current.find(e => e.id === id)) {
          patchState(id, { status: 'cancelled', cancel: undefined });
        }
      } else {
        if (!entriesRef.current.find(e => e.id === id)) return;
        const error = err instanceof Error ? err : new Error(String(err));
        patchState(id, buildErrorPatch(error, id));
        const bad = statesRef.current.get(id);
        if (bad) opts.onUploadError?.(bad);
        if (opts.removeOnError) {
          const filtered = entriesRef.current.filter(e => e.id !== id);
          opts.onEntriesChange?.(filtered);
        }
      }
    } finally {
      if (controllersRef.current.get(id) === controller) {
        controllersRef.current.delete(id);
      }
    }
  };

  const runBatchUpload = async (
    ids: string[],
    files: File[],
  ): Promise<void> => {
    const opts = optionsRef.current;
    const upload = opts.upload as UploadConfigBatch<T>;
    batchGenRef.current += 1;
    const myGen = batchGenRef.current;
    const controller = new AbortController();
    batchControllerRef.current = controller;
    for (const id of ids) batchIdsRef.current.add(id);

    const initial = new Map(statesRef.current);
    for (const id of ids) {
      const cur = initial.get(id);
      if (cur) {
        initial.set(id, {
          ...cur,
          status: 'uploading',
          progress: 0,
          error: undefined,
          result: undefined,
          cancel: () => controller.abort(),
          retry: undefined,
        });
      }
    }
    commitStates(initial);
    for (const id of ids) {
      const s = statesRef.current.get(id);
      if (s) opts.onUploadStart?.(s);
    }

    try {
      const results = await upload.handler(files, {
        onProgress: p => {
          if (myGen !== batchGenRef.current) return;
          const next = new Map(statesRef.current);
          let changed = false;
          for (const id of ids) {
            const cur = next.get(id);
            if (cur?.status === 'uploading') {
              next.set(id, { ...cur, progress: clamp01(p) });
              changed = true;
            }
          }
          if (changed) commitStates(next);
        },
        signal: controller.signal,
      });
      if (myGen !== batchGenRef.current) return;

      const next = new Map(statesRef.current);
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        if (!entriesRef.current.find(e => e.id === id)) continue;
        const cur = next.get(id);
        if (!cur) continue;
        next.set(id, {
          ...cur,
          status: 'success',
          progress: 1,
          result: results[i],
          cancel: undefined,
        });
      }
      commitStates(next);

      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        const s = statesRef.current.get(id);
        if (s?.status !== 'success') continue;
        opts.onUploaded?.(s);
        applyToRemoteFile(id, files[i], results[i]);
      }
    } catch (err) {
      if (myGen !== batchGenRef.current) return;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const next = new Map(statesRef.current);
      for (const id of ids) {
        const cur = next.get(id);
        if (!cur) continue;
        if (isAbort) {
          next.set(id, { ...cur, status: 'cancelled', cancel: undefined });
        } else {
          const error = err instanceof Error ? err : new Error(String(err));
          next.set(id, { ...cur, ...buildErrorPatch(error, id) });
        }
      }
      commitStates(next);

      if (!isAbort) {
        for (const id of ids) {
          const s = statesRef.current.get(id);
          if (s?.status === 'error') opts.onUploadError?.(s);
        }
        if (opts.removeOnError) {
          const filtered = entriesRef.current.filter(e => !ids.includes(e.id));
          opts.onEntriesChange?.(filtered);
        }
      } else if (opts.batchRemoveStrategy === 'abort-and-restart') {
        const remaining = ids
          .map(id => entriesRef.current.find(x => x.id === id))
          .filter((e): e is DropzoneFileEntry => !!e && isFileInstance(e.file));
        if (remaining.length > 0) {
          for (const id of ids) batchIdsRef.current.delete(id);
          await Promise.resolve();
          await runBatchUpload(
            remaining.map(e => e.id),
            remaining.map(e => e.file as File),
          );
          return;
        }
      }
    } finally {
      for (const id of ids) batchIdsRef.current.delete(id);
      if (batchControllerRef.current === controller) {
        batchControllerRef.current = null;
      }
    }
  };

  const dispatchSingle = (ids: string[]): void => {
    for (const id of ids) singleQueueRef.current.push(id);
    if (singleRunningRef.current) return;
    singleRunningRef.current = true;
    singleAbortedRef.current = false;
    void (async () => {
      try {
        while (singleQueueRef.current.length > 0) {
          const id = singleQueueRef.current.shift();
          if (!id) break;
          const entry = entriesRef.current.find(e => e.id === id);
          if (!entry || !isFileInstance(entry.file)) continue;
          const upload = optionsRef.current.upload as UploadConfigSingle<T>;
          if (singleAbortedRef.current && upload.failFast) {
            patchState(id, { status: 'cancelled' });
            continue;
          }
          await runSingleUpload(id, entry.file);
          const final = statesRef.current.get(id);
          if (final?.status === 'error' && upload.failFast) {
            singleAbortedRef.current = true;
          }
        }
      } finally {
        singleRunningRef.current = false;
      }
    })();
  };

  const dispatchParallel = (ids: string[]): void => {
    for (const id of ids) {
      const entry = entriesRef.current.find(e => e.id === id);
      if (!entry || !isFileInstance(entry.file)) continue;
      void runSingleUpload(id, entry.file);
    }
  };

  const dispatchBatch = (ids: string[]): void => {
    const upload = optionsRef.current.upload as UploadConfigBatch<T>;
    const chunkSize =
      upload.chunkSize && upload.chunkSize > 0 ? upload.chunkSize : Infinity;
    const valid: { id: string; file: File }[] = [];
    for (const id of ids) {
      const e = entriesRef.current.find(x => x.id === id);
      if (e && isFileInstance(e.file)) valid.push({ id, file: e.file });
    }
    if (valid.length === 0) return;
    if (chunkSize === Infinity || valid.length <= chunkSize) {
      void runBatchUpload(
        valid.map(v => v.id),
        valid.map(v => v.file),
      );
      return;
    }
    void (async () => {
      for (let i = 0; i < valid.length; i += chunkSize) {
        const slice = valid.slice(i, i + chunkSize);
        await runBatchUpload(
          slice.map(v => v.id),
          slice.map(v => v.file),
        );
      }
    })();
  };

  const dispatchByMode = (ids: string[]): void => {
    if (ids.length === 0) return;
    const mode = optionsRef.current.upload.mode;
    if (mode === 'single') dispatchSingle(ids);
    else if (mode === 'parallel') dispatchParallel(ids);
    else if (mode === 'batch') dispatchBatch(ids);
  };

  apiRetry = (id: string): void => {
    const entry = entriesRef.current.find(e => e.id === id);
    if (!entry || !isFileInstance(entry.file)) return;
    patchState(id, {
      status: 'idle',
      progress: 0,
      error: undefined,
      retry: undefined,
      cancel: undefined,
      result: undefined,
    });
    dispatchByMode([id]);
  };

  const cancel = (id: string): void => {
    const ctrl = controllersRef.current.get(id);
    if (ctrl) {
      ctrl.abort();
      return;
    }
    if (batchIdsRef.current.has(id) && batchControllerRef.current) {
      batchControllerRef.current.abort();
    }
  };

  const abortAll = (): void => {
    for (const c of controllersRef.current.values()) c.abort();
    controllersRef.current.clear();
    if (batchControllerRef.current) batchControllerRef.current.abort();
    batchControllerRef.current = null;
    batchIdsRef.current.clear();
    singleQueueRef.current = [];
    singleRunningRef.current = false;
    singleAbortedRef.current = false;
  };

  const start = (ids?: string[]): void => {
    const eligible = (
      ids
        ? entriesRef.current.filter(e => ids.includes(e.id))
        : entriesRef.current
    ).filter(e => {
      const s = statesRef.current.get(e.id);
      return isFileInstance(e.file) && (!s || s.status === 'idle');
    });
    if (eligible.length === 0) return;
    dispatchByMode(eligible.map(e => e.id));
  };

  const awaitAll = async (): Promise<void> => {
    while (countPending(statesRef.current) > 0) {
      await new Promise(r => setTimeout(r, 50));
    }
  };

  // Sync internal state with entries (mount + entries-change)
  useEffect(() => {
    const ents = entriesRef.current;
    const currentIds = new Set(ents.map(e => e.id));
    const known = startedRef.current;

    const removedIds: string[] = [];
    for (const id of known) {
      if (!currentIds.has(id)) removedIds.push(id);
    }
    if (removedIds.length > 0) {
      const next = new Map(statesRef.current);
      let mutated = false;
      for (const id of removedIds) {
        const ctrl = controllersRef.current.get(id);
        if (ctrl) ctrl.abort();
        if (batchIdsRef.current.has(id)) {
          const strat =
            optionsRef.current.batchRemoveStrategy ?? 'abort-and-restart';
          if (strat !== 'ignore' && batchControllerRef.current) {
            batchControllerRef.current.abort();
          }
        }
        known.delete(id);
        if (next.has(id)) {
          next.delete(id);
          mutated = true;
        }
      }
      if (mutated) commitStates(next);
    }

    const newEntries = ents.filter(e => !known.has(e.id));
    if (newEntries.length === 0) return;

    const initial = new Map(statesRef.current);
    const newUploadIds: string[] = [];
    for (const e of newEntries) {
      known.add(e.id);
      if (isFileInstance(e.file)) {
        initial.set(e.id, {
          id: e.id,
          file: e.file,
          status: 'idle',
          progress: 0,
        });
        newUploadIds.push(e.id);
      } else {
        initial.set(e.id, {
          id: e.id,
          file: e.file,
          status: 'success',
          progress: 1,
        });
      }
    }
    commitStates(initial);

    const autoUpload = optionsRef.current.autoUpload !== false;
    if (autoUpload && newUploadIds.length > 0) {
      dispatchByMode(newUploadIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.entries]);

  // Dev warning for incompatible flags
  useEffect(() => {
    const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
      .process?.env?.NODE_ENV;
    if (
      env !== 'production' &&
      options.enableRetry !== false &&
      options.removeOnError
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        '[react-easy-dropzone] enableRetry and removeOnError are both enabled; removeOnError takes precedence and retry will not be shown.',
      );
    }
  }, [options.enableRetry, options.removeOnError]);

  // Unmount cleanup
  useEffect(
    () => () => {
      abortAll();
      startedRef.current.clear();
      generationRef.current.clear();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const hasPending = useMemo(() => countPending(states) > 0, [states]);

  return {
    states,
    hasPending,
    start,
    cancel,
    retry: apiRetry,
    abortAll,
    awaitAll,
  };
};
