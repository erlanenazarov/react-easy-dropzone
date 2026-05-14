import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { defaultTexts } from '../defaultTexts';
import type {
  DropzoneSettings,
  DropzoneTexts,
  ResolvedSettings,
} from '../types';

const SettingsContext = createContext<DropzoneSettings | null>(null);

interface ProviderProps {
  value?: DropzoneSettings;
  children?: ReactNode;
}

export const DropzoneSettingsProvider = ({
  value,
  children,
}: ProviderProps) => (
  <SettingsContext.Provider value={value ?? null}>
    {children}
  </SettingsContext.Provider>
);

const mergeTexts = (
  ...sources: (Partial<DropzoneTexts> | undefined)[]
): DropzoneTexts => {
  const result = { ...defaultTexts };
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source) as (keyof DropzoneTexts)[]) {
      const value = source[key];
      if (typeof value === 'string') {
        result[key] = value;
      }
    }
  }
  return result;
};

export const useResolvedSettings = (
  overrides: DropzoneSettings,
): ResolvedSettings => {
  const fromContext = useContext(SettingsContext);

  return useMemo<ResolvedSettings>(() => {
    const ctx = fromContext ?? {};
    const pick = <K extends keyof DropzoneSettings>(
      key: K,
    ): DropzoneSettings[K] =>
      overrides[key] !== undefined ? overrides[key] : ctx[key];

    return {
      texts: mergeTexts(ctx.texts, overrides.texts),
      allowedTypes: pick('allowedTypes') as string[] | undefined,
      maxSize: pick('maxSize') as number | undefined,
      multi: (pick('multi') as boolean | undefined) ?? false,
      enableFullscreenGallery:
        (pick('enableFullscreenGallery') as boolean | undefined) ?? false,
      renderGallery: pick('renderGallery') as
        | ResolvedSettings['renderGallery']
        | undefined,
      renderTile: pick('renderTile') as
        | ResolvedSettings['renderTile']
        | undefined,
    };
  }, [fromContext, overrides]);
};
