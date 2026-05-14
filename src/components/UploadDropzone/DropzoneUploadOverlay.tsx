import type { MouseEvent } from 'react';

import type { DropzoneTexts, TileUploadState } from '../../types';

interface Props {
  state: TileUploadState;
  texts: DropzoneTexts;
  formatError?: (error: Error) => string;
}

export const DropzoneUploadOverlay = ({ state, texts, formatError }: Props) => {
  const { status, progress, error, retry } = state;

  if (status === 'success') return null;
  if (status === 'idle' || status === 'cancelled') return null;

  const stop = (event: MouseEvent) => event.stopPropagation();

  if (status === 'uploading') {
    return (
      <>
        <div className="rzd-tile__upload-dim" aria-hidden="true" />
        <div
          className="rzd-tile__upload-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label={texts.uploadingLabel}
        >
          <div
            className="rzd-tile__upload-progress-bar"
            style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
          />
        </div>
      </>
    );
  }

  // status === 'error'
  return (
    <div className="rzd-tile__upload-error" role="alert">
      <span
        className="rzd-tile__upload-error-text"
        title={error ? error.message : undefined}
      >
        {error && formatError ? formatError(error) : texts.uploadFailed}
      </span>
      {retry && (
        <button
          type="button"
          className="rzd-tile__upload-action rzd-tile__upload-action--retry"
          aria-label={texts.uploadRetry}
          onClick={event => {
            stop(event);
            retry();
          }}
        >
          ↻
        </button>
      )}
    </div>
  );
};
