import type { ReactNode } from 'react';

export interface RemoteFile {
  url: string;
  name?: string;
  type?: string;
}

export type DropzoneFile = File | RemoteFile;

export interface DropzoneFileEntry {
  id: string;
  file: DropzoneFile;
}

export interface DropzoneTexts {
  placeholder: string;
  dragOverlay: string;
  removeFile: string;
  galleryClose: string;
  galleryPrev: string;
  galleryNext: string;
  invalidType: string;
  invalidSize: string;
  uploadRetry: string;
  uploadCancel: string;
  uploadFailed: string;
  uploadingLabel: string;
}

export interface GalleryItem {
  src: string;
  alt?: string;
}

export interface GalleryRenderProps {
  items: GalleryItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  onClose: () => void;
  texts: DropzoneTexts;
}

export type RenderGallery = (props: GalleryRenderProps) => ReactNode;

export interface TileRenderProps {
  file: DropzoneFile;
  id: string;
  isImage: boolean;
  previewUrl: string | null;
  remove: () => void;
  openInGallery?: () => void;
  texts: DropzoneTexts;
  uploadState?: TileUploadState;
}

export type RenderTile = (props: TileRenderProps) => ReactNode;

export type RejectionReason = 'type' | 'size';

export interface RejectedFile {
  file: File;
  reason: RejectionReason;
}

export interface DropzoneSettings {
  texts?: Partial<DropzoneTexts>;
  allowedTypes?: string[];
  maxSize?: number;
  multi?: boolean;
  enableFullscreenGallery?: boolean;
  renderGallery?: RenderGallery;
  renderTile?: RenderTile;
}

export interface DropzoneProps extends DropzoneSettings {
  files?: DropzoneFile[];
  defaultFiles?: DropzoneFile[];
  onSelected?: (files: DropzoneFile[], added: DropzoneFile[]) => void;
  onRejected?: (rejected: RejectedFile[]) => void;
  onRemove?: (file: DropzoneFile, index: number) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface ResolvedSettings {
  texts: DropzoneTexts;
  allowedTypes?: string[];
  maxSize?: number;
  multi: boolean;
  enableFullscreenGallery: boolean;
  renderGallery?: RenderGallery;
  renderTile?: RenderTile;
}

export type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UploadOneContext {
  onProgress: (progress: number) => void;
  signal: AbortSignal;
}

export interface UploadManyContext {
  onProgress: (total: number) => void;
  signal: AbortSignal;
}

export type UploadOneHandler<T> = (
  file: File,
  ctx: UploadOneContext,
) => Promise<T>;

export type UploadManyHandler<T> = (
  files: File[],
  ctx: UploadManyContext,
) => Promise<T[]>;

export interface UploadConfigSingle<T> {
  mode: 'single';
  handler: UploadOneHandler<T>;
  failFast?: boolean;
  toRemoteFile?: (result: T, file: File) => RemoteFile | null;
}

export interface UploadConfigParallel<T> {
  mode: 'parallel';
  handler: UploadOneHandler<T>;
  toRemoteFile?: (result: T, file: File) => RemoteFile | null;
}

export interface UploadConfigBatch<T> {
  mode: 'batch';
  handler: UploadManyHandler<T>;
  chunkSize?: number;
  toRemoteFile?: (result: T, file: File) => RemoteFile | null;
}

export type UploadConfig<T> =
  | UploadConfigSingle<T>
  | UploadConfigParallel<T>
  | UploadConfigBatch<T>;

export interface UploadEntryState<T = unknown> {
  id: string;
  file: DropzoneFile;
  status: UploadStatus;
  progress: number;
  result?: T;
  error?: Error;
  retry?: () => void;
  cancel?: () => void;
}

export interface TileUploadState<T = unknown> {
  status: UploadStatus;
  progress: number;
  error?: Error;
  result?: T;
  retry?: () => void;
  cancel?: () => void;
}
