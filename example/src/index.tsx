import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dropzone,
  DropzoneSettingsProvider,
  type DropzoneFile,
} from 'react-easy-dropzone';
import 'react-easy-dropzone/style.css';

import './playground.css';

const App = () => {
  const [single, setSingle] = useState<DropzoneFile[]>([]);
  const [multi, setMulti] = useState<DropzoneFile[]>([]);

  return (
    <DropzoneSettingsProvider
      value={{
        texts: { placeholder: 'Choose files or drop them here' },
        maxSize: 10 * 1024 * 1024,
      }}
    >
      <main className="page">
        <h1>react-easy-dropzone</h1>

        <section>
          <h2>Single file</h2>
          <Dropzone
            files={single}
            onSelected={files => setSingle(files)}
            allowedTypes={['image/*']}
          />
          <pre>{summarize(single)}</pre>
        </section>

        <section>
          <h2>Multi + fullscreen gallery</h2>
          <Dropzone
            multi
            enableFullscreenGallery
            files={multi}
            onSelected={files => setMulti(files)}
          />
          <pre>{summarize(multi)}</pre>
        </section>

        <section>
          <h2>Custom texts via prop</h2>
          <Dropzone
            multi
            texts={{
              placeholder: 'Файлы тут (overridden)',
              dragOverlay: 'Отпускай!',
            }}
          />
        </section>

        <section>
          <h2>Pre-served remote files</h2>
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
        </section>
      </main>
    </DropzoneSettingsProvider>
  );
};

const summarize = (files: DropzoneFile[]): string =>
  JSON.stringify(
    files.map(file =>
      file instanceof File
        ? { name: file.name, size: file.size, type: file.type }
        : file,
    ),
    null,
    2,
  );

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
