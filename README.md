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

## License

MIT
