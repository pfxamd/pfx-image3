import { Image3CoreError } from '../errors/core-error.js';
import type { ImageFormat, ImageMimeType } from '../types/core.js';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function detectImageFormat(buffer: ArrayBuffer): ImageFormat {
  const bytes = new Uint8Array(buffer);

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'jpeg';
  }

  if (
    bytes.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    return 'png';
  }

  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  throw new Image3CoreError(
    'UNSUPPORTED_FORMAT',
    'Only JPEG, PNG and WebP images are supported.',
  );
}

export function mimeForFormat(format: ImageFormat): ImageMimeType {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
  }
}

export function extensionForFormat(format: ImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let result = '';
  for (let index = start; index < end; index += 1) {
    result += String.fromCharCode(bytes[index] ?? 0);
  }
  return result;
}
