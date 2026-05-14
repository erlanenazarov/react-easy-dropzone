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
