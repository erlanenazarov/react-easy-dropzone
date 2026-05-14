import { type MouseEvent } from 'react';

import type { DropzoneFile, DropzoneTexts, TileUploadState } from '../../types';
import { getFileName, isImage } from '../../utils/fileChecks';
import { FileIcon } from '../Dropzone/FileIcon';

import { DropzoneUploadOverlay } from './DropzoneUploadOverlay';

interface Props {
  file: DropzoneFile;
  previewUrl: string | null;
  uploadState: TileUploadState | undefined;
  texts: DropzoneTexts;
  disabled: boolean;
  onRemove: () => void;
  onOpen?: () => void;
  formatError?: (error: Error) => string;
}

export const UploadingTile = ({
  file,
  previewUrl,
  uploadState,
  texts,
  disabled,
  onRemove,
  onOpen,
  formatError,
}: Props) => {
  const image = isImage(file);
  const name = getFileName(file);
  const status = uploadState?.status ?? 'idle';
  const isUploading = status === 'uploading';
  const isError = status === 'error';
  const clickable = image && Boolean(onOpen) && !isUploading && !isError;

  const handleRemove = (event: MouseEvent) => {
    event.stopPropagation();
    if (disabled && !isUploading) return;
    onRemove();
  };

  const handleOpen = (event: MouseEvent) => {
    event.stopPropagation();
    if (onOpen) onOpen();
  };

  const tileModifier = isUploading
    ? ' rzd-tile--uploading'
    : isError
    ? ' rzd-tile--upload-error'
    : status === 'success'
    ? ' rzd-tile--upload-success'
    : '';

  const showRemove = !disabled || isUploading;

  return (
    <div
      className={`rzd-tile${
        clickable ? ' rzd-tile--clickable' : ''
      }${tileModifier}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleOpen : undefined}
      onKeyDown={
        clickable
          ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleOpen(event as unknown as MouseEvent);
              }
            }
          : undefined
      }
      title={name}
    >
      {image && previewUrl ? (
        <img className="rzd-tile__image" src={previewUrl} alt={name} />
      ) : (
        <div className="rzd-tile__placeholder">
          <FileIcon />
          <span className="rzd-tile__name">{name}</span>
        </div>
      )}
      {uploadState && (
        <DropzoneUploadOverlay
          state={uploadState}
          texts={texts}
          formatError={formatError}
        />
      )}
      {showRemove && (
        <button
          type="button"
          className="rzd-tile__remove"
          aria-label={isUploading ? texts.uploadCancel : texts.removeFile}
          onClick={handleRemove}
        >
          ×
        </button>
      )}
    </div>
  );
};
