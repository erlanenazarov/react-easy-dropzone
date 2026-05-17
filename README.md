# react-easy-dropzone

A small, dependency-free React dropzone that handles file selection, drag & drop, image previews and an optional fullscreen gallery — without forcing you to wire up the boring bits yourself.

- Zero runtime dependencies. `react` and `react-dom` are peer deps.
- Written in TypeScript, ships ESM + CJS + `.d.ts`.
- Native HTML5 drag & drop; no third-party DnD libraries.
- Plain CSS with CSS variables for theming. No styled-components, no Emotion.
- Built-in minimal lightbox, replaceable via the `renderGallery` prop.
- All strings are exposed for translation through a single `texts` object.
- Shared defaults via `DropzoneSettingsProvider`, per-instance overrides via props.
- Optional `<UploadDropzone>` + `useDropzoneUpload` hook with built-in progress, retry, cancel and configurable upload modes (`single` / `parallel` / `batch`).

## Demo

👉 **[Live playground](https://erlanenazarov.github.io/react-easy-dropzone/)** — interactive examples of every mode, with toggles for `autoUpload`, `multi`, `disabled`, `removeOnError`, plus imperative `start()` / `abortAll()` controls.

## Install

```bash
npm install react-easy-dropzone
# or
yarn add react-easy-dropzone
```

Then import the stylesheet once at the top of your app:

```tsx
import 'react-easy-dropzone/style.css';
```

## Quick start

```tsx
import { useState } from 'react';
import { Dropzone, type DropzoneFile } from 'react-easy-dropzone';
import 'react-easy-dropzone/style.css';

export const Uploader = () => {
  const [files, setFiles] = useState<DropzoneFile[]>([]);

  return (
    <Dropzone
      multi
      enableFullscreenGallery
      files={files}
      onSelected={setFiles}
      allowedTypes={['image/*', '.pdf']}
      maxSize={5 * 1024 * 1024}
    />
  );
};
```

Files can be either native `File` objects (from the user's machine) or remote references:

```tsx
type RemoteFile = { url: string; name?: string; type?: string };
type DropzoneFile = File | RemoteFile;
```

Pass an array of remote files to render tiles for content the server already has.

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `files` | `DropzoneFile[]` | — | Controlled value. If provided, the component does not store files internally. |
| `defaultFiles` | `DropzoneFile[]` | `[]` | Initial files for the uncontrolled mode. |
| `onSelected` | `(files, added) => void` | — | Fired when the file list changes. `added` is the set just appended. |
| `onRejected` | `(rejected) => void` | — | Fired when files fail type/size validation. |
| `onRemove` | `(file, index) => void` | — | Fired before a tile's × button removes a file. |
| `multi` | `boolean` | `false` | Allow multiple files. Otherwise the new selection replaces the previous one. |
| `allowedTypes` | `string[]` | — | MIME types (`image/png`), wildcards (`image/*`), or extensions (`.pdf`). |
| `maxSize` | `number` | — | Maximum size per file, in bytes. |
| `enableFullscreenGallery` | `boolean` | `false` | Click an image tile to open the fullscreen viewer. |
| `renderGallery` | `(props) => ReactNode` | — | Replace the built-in lightbox. |
| `renderTile` | `(props) => ReactNode` | — | Replace the built-in tile renderer. |
| `texts` | `Partial<DropzoneTexts>` | English defaults | Override any of the visible strings. |
| `disabled` | `boolean` | `false` | Disable input, drag & drop, and remove buttons. |
| `className` | `string` | — | Extra class names for the root element. |
| `style` | `CSSProperties` | — | Inline styles for the root element. |

## Customisation

### Theming via CSS variables

The component does not ship a heavy theming system — it just exposes CSS variables on `.rzd-root`. Override them in your stylesheet:

```css
.rzd-root {
  --rzd-border-color: #cbd5f5;
  --rzd-border-color-active: #6366f1;
  --rzd-border-radius: 16px;
  --rzd-padding: 32px;
  --rzd-tile-size: 120px;
  --rzd-overlay-bg: rgba(99, 102, 241, 0.15);
  --rzd-overlay-text-color: #312e81;
}
```

### Replacing strings

All visible text comes from a single `DropzoneTexts` object. Override per-instance:

```tsx
<Dropzone
  texts={{
    placeholder: 'Перетащите файлы сюда',
    dragOverlay: 'Отпустите для загрузки',
    removeFile: 'Удалить',
  }}
/>
```

…or globally through the provider:

```tsx
import { DropzoneSettingsProvider } from 'react-easy-dropzone';

<DropzoneSettingsProvider value={{ texts: yourTranslations }}>
  <App />
</DropzoneSettingsProvider>;
```

`texts` from props always wins over `texts` from the provider, which always wins over the English defaults exported as `defaultTexts`.

### Shared settings

`DropzoneSettingsProvider` accepts any of the props listed under `DropzoneSettings` (everything except `files`, `defaultFiles`, and the event handlers). Children can still override anything they want by passing the prop directly.

```tsx
<DropzoneSettingsProvider
  value={{
    multi: true,
    allowedTypes: ['image/*'],
    maxSize: 5 * 1024 * 1024,
    enableFullscreenGallery: true,
  }}
>
  <Dropzone /> {/* inherits all of the above */}
  <Dropzone multi={false} /> {/* opts out of multi */}
</DropzoneSettingsProvider>;
```

### Custom tiles

```tsx
<Dropzone
  multi
  renderTile={({ file, previewUrl, isImage, remove, openInGallery, texts }) => (
    <div className="my-tile">
      {isImage && previewUrl ? <img src={previewUrl} /> : <MyIcon />}
      <button onClick={remove}>{texts.removeFile}</button>
      {openInGallery && <button onClick={openInGallery}>Preview</button>}
    </div>
  )}
/>
```

### Custom gallery

```tsx
import { Dropzone, type RenderGallery } from 'react-easy-dropzone';
import MyFancyLightbox from 'my-fancy-lightbox';

const renderGallery: RenderGallery = ({ items, activeIndex, onChange, onClose }) => (
  <MyFancyLightbox
    slides={items}
    index={activeIndex}
    onIndexChange={onChange}
    onClose={onClose}
  />
);

<Dropzone enableFullscreenGallery renderGallery={renderGallery} />;
```

## UploadDropzone

`UploadDropzone` wraps `Dropzone` with progress, cancel, retry, and a swappable upload strategy. You provide an `upload` config that describes *how* to push a file to your server; the component handles the rest — per-tile progress bars, error overlays, abort wiring, retry buttons, and success/error callbacks.

It accepts every `Dropzone` prop, so theming, translations, custom tiles and `DropzoneSettingsProvider` all carry over.

### Quick start

```tsx
import { useState } from 'react';
import {
  UploadDropzone,
  type DropzoneFile,
  type UploadConfig,
} from 'react-easy-dropzone';
import 'react-easy-dropzone/style.css';

interface UploadResult {
  url: string;
}

const upload: UploadConfig<UploadResult> = {
  mode: 'parallel',
  handler: async (file, { onProgress, signal }) => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onProgress(1);
    return (await res.json()) as UploadResult;
  },
  toRemoteFile: (result, file) => ({
    url: result.url,
    name: file.name,
    type: file.type,
  }),
};

export const Uploader = () => {
  const [files, setFiles] = useState<DropzoneFile[]>([]);
  return (
    <UploadDropzone
      multi
      allowedTypes={['image/*']}
      files={files}
      onSelected={setFiles}
      upload={upload}
    />
  );
};
```

The `handler` receives each `File` plus a context with:

- `onProgress(p: number)` — report a value between `0` and `1`. Drives the per-tile progress bar.
- `signal: AbortSignal` — fires when the user cancels the tile or you call `abortAll()`. Wire it into `fetch` / `XMLHttpRequest.abort()` so cancellation actually stops the request.

If `toRemoteFile` is provided, every successful upload's local `File` entry is replaced with the returned `RemoteFile`. For images, the component preloads the new URL first to avoid a `blob:` → CDN flicker. This is how you persist uploads across re-renders without managing two parallel lists.

### Upload modes

`upload.mode` controls *how* files in the current selection are dispatched.

#### `mode: 'single'` — one at a time, in order

Files upload sequentially. The next one starts only after the previous one finishes (succeeds, fails, or is cancelled). Use this when the server can't handle concurrent uploads (rate limits, shared state, strict ordering).

```tsx
const upload: UploadConfig<UploadResult> = {
  mode: 'single',
  handler: uploadOne,
  failFast: true, // optional — abort the queue on the first error
  toRemoteFile,
};
```

- `failFast` (default `false`): on the first non-cancellation error, every remaining queued file is marked `cancelled` without ever calling `handler`. With `failFast: false`, each file is tried independently.

#### `mode: 'parallel'` — fire all at once

Every file in the current selection starts immediately. Best for many small files. Throughput is bounded by the browser's per-host connection cap (typically ~6) and your server.

```tsx
const upload: UploadConfig<UploadResult> = {
  mode: 'parallel',
  handler: uploadOne,
  toRemoteFile,
};
```

Each upload owns its own `AbortController`, so cancelling or retrying one tile does not affect the others.

#### `mode: 'batch'` — one request for many files

The handler receives the entire group at once and must return a `T[]` aligned by input index. Use this when the server exposes a real bulk endpoint, or when packing files into one multipart request is cheaper than N round trips.

```tsx
const upload: UploadConfig<UploadResult> = {
  mode: 'batch',
  handler: async (files, { onProgress, signal }) => {
    const body = new FormData();
    files.forEach(f => body.append('files', f));
    const res = await fetch('/api/upload-many', {
      method: 'POST',
      body,
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    onProgress(1);
    return (await res.json()) as UploadResult[];
  },
  chunkSize: 5, // optional — process at most 5 files per batch call
  toRemoteFile,
};
```

- `onProgress(p)` in batch mode applies uniformly to every file in the batch — there is no per-file progress.
- `chunkSize` splits the selection into sequential chunks of up to N files. Each chunk is its own `handler` call; the next chunk starts after the previous one settles.
- A single `AbortController` is shared across the batch. Cancelling any tile aborts the whole request — what happens next is controlled by `batchRemoveStrategy`:
  - `'abort-and-restart'` (default) — abort the request, then re-fire with the remaining files.
  - `'abort-all'` — abort and mark every file in the batch as `cancelled`.
  - `'ignore'` — let the in-flight request finish even though some tiles were removed.

### Choosing a mode

| Mode | Concurrency | Endpoint shape | Progress | Cancellation |
| ---- | ----------- | -------------- | -------- | ------------ |
| `single` | 1 in flight | One file per request | Per-file | Per-file |
| `parallel` | All at once | One file per request | Per-file | Per-file |
| `batch` | One request per chunk | Bulk / multi-file endpoint | One value for the batch | Whole batch (or chunk) |

### UploadDropzone props

In addition to every `Dropzone` prop:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `upload` | `UploadConfig<T>` | — | Required. Mode + handler described above. |
| `autoUpload` | `boolean` | `true` | Upload as soon as files arrive. Set `false` to keep them `idle` and dispatch via `ref.current.start()`. |
| `enableRetry` | `boolean` | `true` | Show a retry button on errored tiles. Ignored when `removeOnError` is set. |
| `removeOnError` | `boolean` | `false` | Drop a failed file from the list instead of offering retry. Takes precedence over `enableRetry`. |
| `batchRemoveStrategy` | `'abort-all' \| 'abort-and-restart' \| 'ignore'` | `'abort-and-restart'` | What happens when a tile is removed during an in-flight batch upload. |
| `formatUploadError` | `(error: Error) => string` | — | Map a thrown error to the message shown inside the failed tile. Falls back to `texts.uploadFailed`. |
| `onUploadStart` | `(state) => void` | — | A file just entered `uploading`. |
| `onUploaded` | `(state) => void` | — | Per-file success. |
| `onUploadError` | `(state) => void` | — | Per-file error (not fired on abort). |
| `onAllSettled` | `(states[]) => void` | — | Fires once when the last in-flight upload finishes (no more `idle` / `uploading`). |
| `onPendingChange` | `(hasPending) => void` | — | Fires when the "any work in flight" flag flips. Useful for disabling submit buttons. |

Each `state` argument is an `UploadEntryState<T>`:

```ts
interface UploadEntryState<T> {
  id: string;
  file: DropzoneFile;
  status: 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';
  progress: number; // 0..1
  result?: T;
  error?: Error;
  retry?: () => void;
  cancel?: () => void;
}
```

### Imperative API

`UploadDropzone` forwards a ref:

```ts
interface UploadDropzoneHandle<T> {
  getStates(): Map<string, UploadEntryState<T>>;
  hasPending(): boolean;
  start(ids?: string[]): void;   // dispatch idle entries (all, or a subset by id)
  cancel(id: string): void;      // abort one entry's upload
  retry(id: string): void;       // re-run a failed entry
  abortAll(): void;              // abort every in-flight upload
  awaitAll(): Promise<void>;     // resolves when nothing is pending
}
```

Typical pattern — defer dispatch until the user submits a form:

```tsx
const ref = useRef<UploadDropzoneHandle<UploadResult>>(null);

<UploadDropzone ref={ref} autoUpload={false} upload={upload} />;

<button
  onClick={async () => {
    ref.current?.start();
    await ref.current?.awaitAll();
    submitForm();
  }}
>
  Save
</button>;
```

### Headless: `useDropzoneUpload`

If you want the upload state machine without `Dropzone`'s UI, the underlying hook is exported. It takes the same `upload` config plus an `entries: { id; file }[]` array and returns `{ states, hasPending, start, cancel, retry, abortAll, awaitAll }` — same shape as the ref above.

```tsx
import { useDropzoneUpload } from 'react-easy-dropzone';

const { states, hasPending, start, abortAll } = useDropzoneUpload({
  entries,
  upload,
  autoUpload: false,
  onUploaded: ({ result }) => console.log('done', result),
});
```

## License

MIT
