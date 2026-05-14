import { useEffect, useRef, useState } from 'react';

import type { DropzoneFileEntry } from '../types';
import { isFileInstance } from '../utils/fileChecks';

export const usePreviewUrls = (
  entries: DropzoneFileEntry[],
): Map<string, string> => {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map());
  const createdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const created = createdRef.current;
    const next = new Map<string, string>();
    const keepCreated = new Set<string>();

    for (const entry of entries) {
      if (isFileInstance(entry.file)) {
        const existing = created.get(entry.id);
        if (existing) {
          next.set(entry.id, existing);
          keepCreated.add(entry.id);
        } else {
          const objectUrl = URL.createObjectURL(entry.file);
          created.set(entry.id, objectUrl);
          keepCreated.add(entry.id);
          next.set(entry.id, objectUrl);
        }
      } else {
        next.set(entry.id, entry.file.url);
      }
    }

    for (const [id, url] of created) {
      if (!keepCreated.has(id)) {
        URL.revokeObjectURL(url);
        created.delete(id);
      }
    }

    setUrls(next);
  }, [entries]);

  useEffect(
    () => () => {
      for (const url of createdRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      createdRef.current.clear();
    },
    [],
  );

  return urls;
};
