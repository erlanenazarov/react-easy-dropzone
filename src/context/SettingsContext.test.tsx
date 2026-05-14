import { render, screen } from '@testing-library/react';

import { Dropzone } from '../components/Dropzone/Dropzone';

import { DropzoneSettingsProvider } from './SettingsContext';

describe('DropzoneSettingsProvider', () => {
  it('propagates texts to nested Dropzones', () => {
    render(
      <DropzoneSettingsProvider
        value={{ texts: { placeholder: 'From context' } }}
      >
        <Dropzone />
      </DropzoneSettingsProvider>,
    );
    expect(screen.getByText('From context')).toBeTruthy();
  });

  it('component props override context values', () => {
    render(
      <DropzoneSettingsProvider
        value={{ texts: { placeholder: 'From context' } }}
      >
        <Dropzone texts={{ placeholder: 'From props' }} />
      </DropzoneSettingsProvider>,
    );
    expect(screen.getByText('From props')).toBeTruthy();
    expect(screen.queryByText('From context')).toBeNull();
  });
});
