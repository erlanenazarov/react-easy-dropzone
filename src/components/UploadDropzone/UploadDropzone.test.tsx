import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import type {
  UploadConfig,
  UploadManyContext,
  UploadOneContext,
} from '../../types';

import { UploadDropzone } from './UploadDropzone';

const createDataTransfer = (files: File[]) => ({
  files,
  items: files.map(file => ({
    kind: 'file',
    type: file.type,
    getAsFile: () => file,
  })),
  types: ['Files'],
});

const makeFile = (name: string, type = 'text/plain'): File =>
  new File([name], name, { type });

interface PromiseControl<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
const createPromiseControl = <T,>(): PromiseControl<T> => {
  let resolve!: (v: T) => void;
  let reject!: (r: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = () =>
  act(async () => {
    await Promise.resolve();
  });

beforeAll(() => {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = jest.fn(() => 'blob:mock');
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = jest.fn();
  }
});

const dropFiles = (container: HTMLElement, files: File[]) => {
  const root = container.querySelector('.rzd-root') as HTMLElement;
  fireEvent.drop(root, { dataTransfer: createDataTransfer(files) });
};

describe('UploadDropzone', () => {
  it('uploads a single file successfully (mode: single)', async () => {
    const onUploadStart = jest.fn();
    const onUploaded = jest.fn();
    const ctrl = createPromiseControl<{ url: string }>();
    const handler = jest.fn(async (_file: File, _ctx: UploadOneContext) => {
      _ctx.onProgress(0.5);
      return ctrl.promise;
    });

    const upload: UploadConfig<{ url: string }> = {
      mode: 'single',
      handler,
    };

    const { container } = render(
      <UploadDropzone
        multi
        upload={upload}
        onUploadStart={onUploadStart}
        onUploaded={onUploaded}
      />,
    );
    const f = makeFile('a.png', 'image/png');
    await act(async () => {
      dropFiles(container, [f]);
    });
    await flushMicrotasks();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(onUploadStart).toHaveBeenCalledTimes(1);
    expect(onUploadStart.mock.calls[0][0].status).toBe('uploading');

    await act(async () => {
      ctrl.resolve({ url: 'https://cdn/a.png' });
    });

    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(onUploaded.mock.calls[0][0].status).toBe('success');
    expect(onUploaded.mock.calls[0][0].result).toEqual({
      url: 'https://cdn/a.png',
    });
  });

  it('mode single: runs handlers sequentially (one active at a time)', async () => {
    let active = 0;
    let peak = 0;
    const callOrder: string[] = [];
    const handler = jest.fn(async (file: File) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(r => setTimeout(r, 10));
      callOrder.push(file.name);
      active -= 1;
      return { ok: file.name };
    });
    const onUploaded = jest.fn();

    const { container } = render(
      <UploadDropzone
        multi
        upload={{ mode: 'single', handler }}
        onUploaded={onUploaded}
      />,
    );
    const files = [makeFile('1.txt'), makeFile('2.txt'), makeFile('3.txt')];
    await act(async () => {
      dropFiles(container, files);
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 60));
    });

    expect(peak).toBe(1);
    expect(callOrder).toEqual(['1.txt', '2.txt', '3.txt']);
    expect(onUploaded).toHaveBeenCalledTimes(3);
    expect(onUploaded.mock.calls.map(c => c[0].file.name)).toEqual([
      '1.txt',
      '2.txt',
      '3.txt',
    ]);
  });

  it('mode parallel: all handlers start before first resolves', async () => {
    const controls = [
      createPromiseControl<{ ok: true }>(),
      createPromiseControl<{ ok: true }>(),
      createPromiseControl<{ ok: true }>(),
    ];
    let started = 0;
    const handler = jest.fn(async (file: File) => {
      const idx = Number(file.name[0]) - 1;
      started += 1;
      return controls[idx].promise;
    });

    const { container } = render(
      <UploadDropzone multi upload={{ mode: 'parallel', handler }} />,
    );
    await act(async () => {
      dropFiles(container, [
        makeFile('1.txt'),
        makeFile('2.txt'),
        makeFile('3.txt'),
      ]);
    });
    await flushMicrotasks();

    expect(started).toBe(3);
    expect(handler).toHaveBeenCalledTimes(3);

    await act(async () => {
      controls.forEach(c => c.resolve({ ok: true }));
    });
  });

  it('mode single + failFast: cancels remaining after first error', async () => {
    const calls: string[] = [];
    const handler = jest.fn(async (file: File) => {
      calls.push(file.name);
      if (file.name === '1.txt') throw new Error('boom');
      return { ok: true };
    });
    const onAllSettled = jest.fn();

    const { container } = render(
      <UploadDropzone
        multi
        upload={{ mode: 'single', handler, failFast: true }}
        onAllSettled={onAllSettled}
      />,
    );
    await act(async () => {
      dropFiles(container, [
        makeFile('1.txt'),
        makeFile('2.txt'),
        makeFile('3.txt'),
      ]);
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(calls).toEqual(['1.txt']);
    expect(onAllSettled).toHaveBeenCalled();
    const lastStates = onAllSettled.mock.calls.at(-1)?.[0];
    const byName = new Map(
      (lastStates as Array<{ file: File; status: string }>).map(s => [
        s.file.name,
        s.status,
      ]),
    );
    expect(byName.get('1.txt')).toBe('error');
    expect(byName.get('2.txt')).toBe('cancelled');
    expect(byName.get('3.txt')).toBe('cancelled');
  });

  it('mode batch: one handler call for all files', async () => {
    const handler = jest.fn(
      async (
        files: File[],
        ctx: UploadManyContext,
      ): Promise<{ url: string }[]> => {
        ctx.onProgress(0.5);
        return files.map(f => ({ url: `cdn/${f.name}` }));
      },
    );

    const upload: UploadConfig<{ url: string }> = {
      mode: 'batch',
      handler,
    };

    const { container } = render(<UploadDropzone multi upload={upload} />);
    await act(async () => {
      dropFiles(container, [makeFile('a.txt'), makeFile('b.txt')]);
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 5));
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const passedFiles = handler.mock.calls[0][0] as File[];
    expect(passedFiles.map(f => f.name)).toEqual(['a.txt', 'b.txt']);
  });

  it('mode batch + chunkSize: splits into multiple handler calls', async () => {
    const handler = jest.fn(
      async (files: File[]): Promise<{ url: string }[]> =>
        files.map(f => ({ url: f.name })),
    );

    const upload: UploadConfig<{ url: string }> = {
      mode: 'batch',
      handler,
      chunkSize: 2,
    };

    const { container } = render(<UploadDropzone multi upload={upload} />);
    await act(async () => {
      dropFiles(container, [
        makeFile('1'),
        makeFile('2'),
        makeFile('3'),
        makeFile('4'),
        makeFile('5'),
      ]);
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    expect(handler).toHaveBeenCalledTimes(3);
    expect((handler.mock.calls[0][0] as File[]).length).toBe(2);
    expect((handler.mock.calls[1][0] as File[]).length).toBe(2);
    expect((handler.mock.calls[2][0] as File[]).length).toBe(1);
  });

  it('aborts upload when entry removed mid-flight', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const handler = jest.fn(
      (_f: File, ctx: UploadOneContext) =>
        new Promise<{ ok: true }>((_, reject) => {
          ctx.signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );

    const { container } = render(
      <UploadDropzone multi upload={{ mode: 'parallel', handler }} />,
    );
    const f = makeFile('a.txt');
    await act(async () => {
      dropFiles(container, [f]);
    });
    await flushMicrotasks();

    abortSpy.mockClear();

    const removeBtn = container.querySelector(
      '.rzd-tile__remove',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('aborts everything on unmount', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const handler = jest.fn(() => new Promise<{ ok: true }>(() => undefined));

    const { container, unmount } = render(
      <UploadDropzone multi upload={{ mode: 'parallel', handler }} />,
    );
    await act(async () => {
      dropFiles(container, [makeFile('a'), makeFile('b')]);
    });
    await flushMicrotasks();
    abortSpy.mockClear();

    await act(async () => {
      unmount();
    });

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('retries failed upload to success', async () => {
    let attempt = 0;
    const handler = jest.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('flaky');
      return { ok: true };
    });
    const onUploadError = jest.fn();
    const onUploaded = jest.fn();

    render(
      <UploadDropzone
        multi
        defaultFiles={[makeFile('only.txt')]}
        upload={{ mode: 'parallel', handler }}
        onUploadError={onUploadError}
        onUploaded={onUploaded}
      />,
    );
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    expect(onUploadError).toHaveBeenCalledTimes(1);
    const retry = onUploadError.mock.calls[0][0].retry;
    expect(retry).toBeInstanceOf(Function);

    await act(async () => {
      retry();
      await new Promise(r => setTimeout(r, 10));
    });
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('removeOnError removes entry from list', async () => {
    const handler = jest.fn(async () => {
      throw new Error('nope');
    });
    const onSelected = jest.fn();

    render(
      <UploadDropzone
        multi
        defaultFiles={[makeFile('x.txt')]}
        upload={{ mode: 'parallel', handler }}
        removeOnError
        enableRetry={false}
        onSelected={onSelected}
      />,
    );
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    // entry filtered out → onSelected received the post-removal list
    expect(onSelected).toHaveBeenCalled();
    const lastCall = onSelected.mock.calls.at(-1);
    expect(lastCall?.[0]).toHaveLength(0);
  });

  it('treats RemoteFile defaultFiles as already uploaded', async () => {
    const handler = jest.fn(async () => ({ ok: true }));
    const onUploaded = jest.fn();

    render(
      <UploadDropzone
        multi
        defaultFiles={[
          { url: 'https://x/a.png', name: 'a.png', type: 'image/png' },
        ]}
        upload={{ mode: 'parallel', handler }}
        onUploaded={onUploaded}
      />,
    );
    await flushMicrotasks();
    expect(handler).not.toHaveBeenCalled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('toRemoteFile replaces File with RemoteFile in entries', async () => {
    const handler = jest.fn(async () => ({ url: 'https://cdn/x' }));
    const onSelected = jest.fn();

    render(
      <UploadDropzone
        multi
        defaultFiles={[makeFile('one.png', 'image/png')]}
        upload={{
          mode: 'parallel',
          handler,
          toRemoteFile: (r, f) => ({
            url: r.url,
            name: f.name,
            type: f.type,
          }),
        }}
        onSelected={onSelected}
      />,
    );
    // wait long enough for safety-timeout to fire in jsdom
    // (Image preload events don't fire for fake URLs in jsdom)
    await act(async () => {
      await new Promise(r => setTimeout(r, 1700));
    });
    expect(onSelected).toHaveBeenCalled();
    const lastFiles = onSelected.mock.calls.at(-1)?.[0];
    expect(lastFiles?.[0]).toEqual({
      url: 'https://cdn/x',
      name: 'one.png',
      type: 'image/png',
    });
  });

  it('does not set success when entry was removed during handler', async () => {
    const ctrl = createPromiseControl<{ url: string }>();
    const handler = jest.fn(async () => ctrl.promise);
    const onUploaded = jest.fn();

    const { container } = render(
      <UploadDropzone
        multi
        upload={{ mode: 'parallel', handler }}
        onUploaded={onUploaded}
      />,
    );
    await act(async () => {
      dropFiles(container, [makeFile('a.txt')]);
    });
    await flushMicrotasks();

    // remove tile before resolving
    const removeBtn = container.querySelector(
      '.rzd-tile__remove',
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    await act(async () => {
      ctrl.resolve({ url: 'too-late' });
    });

    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('StrictMode: uploads still complete to success', async () => {
    const handler = jest.fn(async () => {
      await new Promise(r => setTimeout(r, 5));
      return { ok: true };
    });
    const onUploaded = jest.fn();

    render(
      <StrictMode>
        <UploadDropzone
          multi
          defaultFiles={[makeFile('s.txt')]}
          upload={{ mode: 'parallel', handler }}
          onUploaded={onUploaded}
        />
      </StrictMode>,
    );
    await act(async () => {
      await new Promise(r => setTimeout(r, 30));
    });
    // final upload must succeed regardless of double-mount semantics in dev
    expect(onUploaded).toHaveBeenCalled();
    expect(onUploaded.mock.calls.at(-1)?.[0].status).toBe('success');
  });

  it('onPendingChange transitions false→true→false', async () => {
    const ctrl = createPromiseControl<{ ok: true }>();
    const handler = jest.fn(async () => ctrl.promise);
    const onPendingChange = jest.fn();

    const { container } = render(
      <UploadDropzone
        multi
        upload={{ mode: 'parallel', handler }}
        onPendingChange={onPendingChange}
      />,
    );
    await act(async () => {
      dropFiles(container, [makeFile('a.txt')]);
    });
    await flushMicrotasks();
    // After dispatch we are pending
    expect(onPendingChange.mock.calls.some(c => c[0] === true)).toBe(true);

    await act(async () => {
      ctrl.resolve({ ok: true });
    });
    expect(onPendingChange.mock.calls.at(-1)?.[0]).toBe(false);
  });
});
