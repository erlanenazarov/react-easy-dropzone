import { fireEvent, render, screen } from '@testing-library/react';

import { Dropzone } from './Dropzone';

const createDataTransfer = (files: File[]) => ({
  files,
  items: files.map(file => ({
    kind: 'file',
    type: file.type,
    getAsFile: () => file,
  })),
  types: ['Files'],
});

beforeAll(() => {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = jest.fn(() => 'blob:mock');
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = jest.fn();
  }
});

describe('Dropzone', () => {
  it('shows placeholder when there are no files', () => {
    render(<Dropzone />);
    expect(screen.getByText('Select or drop file(s)')).toBeTruthy();
  });

  it('renders custom placeholder from texts prop', () => {
    render(<Dropzone texts={{ placeholder: 'Choose now' }} />);
    expect(screen.getByText('Choose now')).toBeTruthy();
  });

  it('calls onSelected when a file is dropped', () => {
    const handle = jest.fn();
    const { container } = render(<Dropzone onSelected={handle} multi />);
    const root = container.querySelector('.rzd-root') as HTMLElement;

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    fireEvent.drop(root, { dataTransfer: createDataTransfer([file]) });

    expect(handle).toHaveBeenCalledTimes(1);
    const [files, added] = handle.mock.calls[0];
    expect(files).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect(files[0]).toBe(file);
  });

  it('replaces the previous file when multi=false', () => {
    const handle = jest.fn();
    const { container } = render(<Dropzone onSelected={handle} />);
    const root = container.querySelector('.rzd-root') as HTMLElement;

    const first = new File(['a'], 'a.txt', { type: 'text/plain' });
    const second = new File(['b'], 'b.txt', { type: 'text/plain' });

    fireEvent.drop(root, { dataTransfer: createDataTransfer([first]) });
    fireEvent.drop(root, { dataTransfer: createDataTransfer([second]) });

    const [filesAfterSecond] = handle.mock.calls[1];
    expect(filesAfterSecond).toHaveLength(1);
    expect(filesAfterSecond[0]).toBe(second);
  });

  it('rejects files that do not match allowedTypes', () => {
    const onSelected = jest.fn();
    const onRejected = jest.fn();
    const { container } = render(
      <Dropzone
        onSelected={onSelected}
        onRejected={onRejected}
        allowedTypes={['image/*']}
        multi
      />,
    );
    const root = container.querySelector('.rzd-root') as HTMLElement;

    const txt = new File(['x'], 'x.txt', { type: 'text/plain' });
    fireEvent.drop(root, { dataTransfer: createDataTransfer([txt]) });

    expect(onSelected).not.toHaveBeenCalled();
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0][0]).toEqual([
      { file: txt, reason: 'type' },
    ]);
  });
});
