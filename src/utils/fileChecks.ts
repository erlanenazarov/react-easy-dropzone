import type { DropzoneFile, RemoteFile } from '../types';

export const isFileInstance = (value: DropzoneFile): value is File =>
  typeof File !== 'undefined' && value instanceof File;

export const getFileName = (file: DropzoneFile): string =>
  isFileInstance(file) ? file.name : file.name ?? extractNameFromUrl(file.url);

export const getFileType = (file: DropzoneFile): string => {
  if (isFileInstance(file)) return file.type ?? '';
  return file.type ?? guessTypeFromUrl(file.url);
};

export const isImage = (file: DropzoneFile): boolean => {
  const type = getFileType(file);
  if (type.startsWith('image/')) return true;
  if (isFileInstance(file)) return false;
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(file.url);
};

export const matchesAllowedTypes = (
  file: File,
  allowedTypes?: string[],
): boolean => {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  return allowedTypes.some(pattern => {
    const normalized = pattern.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith('.')) return fileName.endsWith(normalized);
    if (normalized.endsWith('/*')) {
      const prefix = normalized.slice(0, -1);
      return fileType.toLowerCase().startsWith(prefix);
    }
    return fileType.toLowerCase() === normalized;
  });
};

const extractNameFromUrl = (url: string): string => {
  try {
    const path = new URL(url, 'http://x').pathname;
    const segment = path.split('/').filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : url;
  } catch {
    return url;
  }
};

const guessTypeFromUrl = (url: string): string => {
  const match = url.match(/\.([a-z0-9]+)(\?.*)?$/i);
  if (!match) return '';
  const ext = match[1].toLowerCase();
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    avif: 'image/avif',
    pdf: 'application/pdf',
  };
  return map[ext] ?? '';
};

export const sameRemote = (a: RemoteFile, b: RemoteFile): boolean =>
  a.url === b.url && a.name === b.name && a.type === b.type;
