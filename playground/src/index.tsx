import { StrictMode, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dropzone,
  DropzoneSettingsProvider,
  UploadDropzone,
  type UploadConfig,
  type UploadDropzoneHandle,
  type UploadManyContext,
  type UploadOneContext,
} from 'react-easy-dropzone';
import 'react-easy-dropzone/style.css';

import './playground.css';

interface ImgBBResult {
  data: {
    display_url: string;
    url: string;
    delete_url?: string;
  };
}

const IMGBB_KEY = process.env.IMGBB_KEY || '';

const uploadOneToImgBB = (file: File, ctx: UploadOneContext) =>
  new Promise<ImgBBResult>((resolve, reject) => {
    if (!IMGBB_KEY) {
      reject(new Error('Set IMGBB_KEY in .env to enable uploads'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `https://api.imgbb.com/1/upload?expiration=86400&key=${encodeURIComponent(
        IMGBB_KEY,
      )}`,
    );
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) ctx.onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ImgBBResult);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    ctx.signal.addEventListener('abort', () => {
      xhr.abort();
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
    const fd = new FormData();
    fd.append('image', file);
    xhr.send(fd);
  });

// ImgBB has no batch endpoint — we fan out internally and report aggregate
// progress as a stand-in for a real batch API.
const uploadManyToImgBB = async (
  files: File[],
  ctx: UploadManyContext,
): Promise<ImgBBResult[]> => {
  const perFile = new Array(files.length).fill(0);
  const emit = () =>
    ctx.onProgress(perFile.reduce((a, b) => a + b, 0) / files.length);
  return Promise.all(
    files.map((file, i) =>
      uploadOneToImgBB(file, {
        signal: ctx.signal,
        onProgress: p => {
          perFile[i] = p;
          emit();
        },
      }),
    ),
  );
};

const toRemoteFile = (res: ImgBBResult, file: File) => ({
  url: res.data.display_url,
  name: file.name,
  type: file.type,
});

interface ExampleProps {
  title: string;
  hint?: string;
  code: string;
  children: ReactNode;
}
const Example = ({ title, hint, code, children }: ExampleProps) => (
  <section className="example">
    <h3>{title}</h3>
    {hint && <p className="example__hint">{hint}</p>}
    {children}
    <pre className="example__code">
      <code>{code}</code>
    </pre>
  </section>
);

const App = () => (
  <DropzoneSettingsProvider
    value={{
      texts: { placeholder: 'Choose files or drop them here' },
      maxSize: 10 * 1024 * 1024,
    }}
  >
    <main className="page">
      <h1>react-easy-dropzone (dev playground)</h1>

      <h2>Plain Dropzone</h2>

      <Example
        title="Single file"
        code={`<Dropzone allowedTypes={['image/*']} />`}
      >
        <Dropzone allowedTypes={['image/*']} />
      </Example>

      <Example
        title="Multi + fullscreen gallery"
        code={`<Dropzone multi enableFullscreenGallery />`}
      >
        <Dropzone multi enableFullscreenGallery />
      </Example>

      <Example
        title="Custom texts"
        hint="Strings are passed via the texts prop and merge with defaults."
        code={`<Dropzone
  multi
  texts={{
    placeholder: 'Файлы тут (overridden)',
    dragOverlay: 'Отпускай!',
  }}
/>`}
      >
        <Dropzone
          multi
          texts={{
            placeholder: 'Файлы тут (overridden)',
            dragOverlay: 'Отпускай!',
          }}
        />
      </Example>

      <Example
        title="Pre-served remote files"
        hint="defaultFiles accepts RemoteFile entries — useful for edit screens."
        code={`<Dropzone
  multi
  enableFullscreenGallery
  defaultFiles={[
    { url: 'https://picsum.photos/seed/1/400/300', type: 'image/jpeg' },
    { url: 'https://picsum.photos/seed/2/400/300', type: 'image/jpeg' },
  ]}
/>`}
      >
        <Dropzone
          multi
          enableFullscreenGallery
          defaultFiles={[
            {
              url: 'https://picsum.photos/seed/1/400/300',
              name: 'photo-1.jpg',
              type: 'image/jpeg',
            },
            {
              url: 'https://picsum.photos/seed/2/400/300',
              name: 'photo-2.jpg',
              type: 'image/jpeg',
            },
          ]}
        />
      </Example>

      <h2>Auto-upload to ImgBB</h2>
      {!IMGBB_KEY && (
        <p className="warn">
          ⚠️ <code>IMGBB_KEY</code> not set — uploads fail with a clear error
          plus retry. Drop a <code>.env</code> with <code>IMGBB_KEY=…</code> in
          the repo root and restart Parcel to enable real uploads.
        </p>
      )}

      <ParallelExample />
      <SingleExample />
      <BatchExample />
      <ManualStartExample />
      <InteractiveExample />
    </main>
  </DropzoneSettingsProvider>
);

const ParallelExample = () => {
  const upload: UploadConfig<ImgBBResult> = {
    mode: 'parallel',
    handler: uploadOneToImgBB,
    toRemoteFile,
  };
  return (
    <Example
      title="mode: parallel — all files start at once"
      hint="Best for many small files. Browser caps concurrent connections per host."
      code={`<UploadDropzone
  multi
  allowedTypes={['image/*']}
  upload={{
    mode: 'parallel',
    handler: uploadOneToImgBB,
    toRemoteFile,
  }}
/>`}
    >
      <UploadDropzone
        multi
        allowedTypes={['image/*']}
        enableFullscreenGallery
        upload={upload}
      />
    </Example>
  );
};

const SingleExample = () => {
  const upload: UploadConfig<ImgBBResult> = {
    mode: 'single',
    handler: uploadOneToImgBB,
    toRemoteFile,
  };
  return (
    <Example
      title="mode: single — one by one"
      hint="Strict order, one in-flight at a time. Add failFast to abort the queue on the first error."
      code={`<UploadDropzone
  multi
  allowedTypes={['image/*']}
  upload={{
    mode: 'single',
    handler: uploadOneToImgBB,
    toRemoteFile,
  }}
/>`}
    >
      <UploadDropzone
        multi
        allowedTypes={['image/*']}
        enableFullscreenGallery
        upload={upload}
      />
    </Example>
  );
};

const BatchExample = () => {
  const upload: UploadConfig<ImgBBResult> = {
    mode: 'batch',
    handler: uploadManyToImgBB,
    chunkSize: 3,
    toRemoteFile,
  };
  return (
    <Example
      title="mode: batch — one request (or chunked)"
      hint="ImgBB has no batch API, so this demo fans out internally. chunkSize=3 → max 3 files per batch call."
      code={`<UploadDropzone
  multi
  allowedTypes={['image/*']}
  upload={{
    mode: 'batch',
    handler: uploadManyToImgBB,
    chunkSize: 3,
    toRemoteFile,
  }}
/>`}
    >
      <UploadDropzone
        multi
        allowedTypes={['image/*']}
        enableFullscreenGallery
        upload={upload}
      />
    </Example>
  );
};

const ManualStartExample = () => {
  const ref = useRef<UploadDropzoneHandle<ImgBBResult>>(null);
  const [pending, setPending] = useState(false);
  const upload: UploadConfig<ImgBBResult> = {
    mode: 'parallel',
    handler: uploadOneToImgBB,
    toRemoteFile,
  };
  return (
    <Example
      title="autoUpload=false — kick off by button"
      hint="Files queue as idle. Click Upload to dispatch. The ref exposes start, cancel, retry, abortAll, awaitAll."
      code={`const ref = useRef<UploadDropzoneHandle<ImgBBResult>>(null);
const [pending, setPending] = useState(false);

<UploadDropzone
  ref={ref}
  multi
  autoUpload={false}
  upload={{ mode: 'parallel', handler: uploadOneToImgBB, toRemoteFile }}
  onPendingChange={setPending}
/>
<button onClick={() => ref.current?.start()}>Upload</button>
<button onClick={() => ref.current?.abortAll()}>Cancel all</button>`}
    >
      <div className="controls">
        <button onClick={() => ref.current?.start()} disabled={pending}>
          start()
        </button>
        <button onClick={() => ref.current?.abortAll()} disabled={!pending}>
          abortAll()
        </button>
        <span className="status">
          {pending ? 'Uploading…' : 'Idle (drop files, then press start)'}
        </span>
      </div>
      <UploadDropzone
        ref={ref}
        multi
        autoUpload={false}
        allowedTypes={['image/*']}
        enableFullscreenGallery
        upload={upload}
        onPendingChange={setPending}
      />
    </Example>
  );
};

const InteractiveExample = () => {
  const [autoUpload, setAutoUpload] = useState(true);
  const [multi, setMulti] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [removeOnError, setRemoveOnError] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<UploadDropzoneHandle<ImgBBResult>>(null);
  const upload: UploadConfig<ImgBBResult> = {
    mode: 'parallel',
    handler: uploadOneToImgBB,
    toRemoteFile,
  };
  return (
    <Example
      title="Interactive — toggle props live"
      hint="Flip props on the fly to see how the component reacts. Imperative methods are exposed via ref."
      code={`<UploadDropzone
  ref={ref}
  multi={multi}
  autoUpload={autoUpload}
  disabled={disabled}
  removeOnError={removeOnError}
  enableRetry={!removeOnError}
  upload={{ mode: 'parallel', handler: uploadOneToImgBB, toRemoteFile }}
  onPendingChange={setPending}
/>`}
    >
      <div className="controls">
        <label>
          <input
            type="checkbox"
            checked={autoUpload}
            onChange={e => setAutoUpload(e.target.checked)}
          />
          autoUpload
        </label>
        <label>
          <input
            type="checkbox"
            checked={multi}
            onChange={e => setMulti(e.target.checked)}
          />
          multi
        </label>
        <label>
          <input
            type="checkbox"
            checked={disabled}
            onChange={e => setDisabled(e.target.checked)}
          />
          disabled
        </label>
        <label>
          <input
            type="checkbox"
            checked={removeOnError}
            onChange={e => setRemoveOnError(e.target.checked)}
          />
          removeOnError
        </label>
        {!autoUpload && (
          <button onClick={() => ref.current?.start()}>start()</button>
        )}
        <button onClick={() => ref.current?.abortAll()} disabled={!pending}>
          abortAll()
        </button>
        <span className="status">pending: {String(pending)}</span>
      </div>
      <UploadDropzone
        ref={ref}
        multi={multi}
        autoUpload={autoUpload}
        disabled={disabled}
        removeOnError={removeOnError}
        enableRetry={!removeOnError}
        allowedTypes={['image/*']}
        enableFullscreenGallery
        upload={upload}
        onPendingChange={setPending}
      />
    </Example>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
