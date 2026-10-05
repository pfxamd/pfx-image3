import type { ConversionResult, ImageFormat, ImageMimeType } from '../types/core.js';
import { extensionForFormat, mimeForFormat } from '../pipeline/detect-format.js';

export function createOutputBlob(result: ConversionResult): Blob {
  return new Blob([result.buffer], { type: result.mimeType });
}

export function buildOutputName(
  inputName: string | undefined,
  targetFormat: ImageFormat,
): string | undefined {
  if (!inputName) return undefined;

  const extension = extensionForFormat(targetFormat);
  const withoutExtension = inputName.replace(/\.[^./\\]+$/, '');
  return `${withoutExtension}.${extension}`;
}

export function outputDescriptor(format: ImageFormat): {
  mimeType: ImageMimeType;
  extension: string;
} {
  return {
    mimeType: mimeForFormat(format),
    extension: extensionForFormat(format),
  };
}
