import { type MouseEvent } from 'react';

import type { DropzoneFile, DropzoneTexts, RenderTile } from '../../types';
import { getFileName, isImage } from '../../utils/fileChecks';

import { FileIcon } from './FileIcon';

interface Props {
  id: string;
  file: DropzoneFile;
  previewUrl: string | null;
  texts: DropzoneTexts;
  disabled: boolean;
  onRemove: () => void;
  onOpen?: () => void;
  renderTile?: RenderTile;
}

export const FileTile = ({
  id,
  file,
  previewUrl,
  texts,
  disabled,
  onRemove,
  onOpen,
  renderTile,
}: Props) => {
  const image = isImage(file);

  if (renderTile) {
    return (
      <>
        {renderTile({
          id,
          file,
          isImage: image,
          previewUrl,
          remove: onRemove,
          openInGallery: onOpen,
          texts,
        })}
      </>
    );
  }

  const handleRemove = (event: MouseEvent) => {
    event.stopPropagation();
    if (!disabled) onRemove();
  };

  const handleOpen = (event: MouseEvent) => {
    event.stopPropagation();
    if (onOpen) onOpen();
  };

  const name = getFileName(file);
  const clickable = image && Boolean(onOpen);

  return (
    <div
      className={`rzd-tile${clickable ? ' rzd-tile--clickable' : ''}`}
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
      {!disabled && (
        <button
          type="button"
          className="rzd-tile__remove"
          aria-label={texts.removeFile}
          onClick={handleRemove}
        >
          ×
        </button>
      )}
    </div>
  );
};
