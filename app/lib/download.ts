import type { ConversionResult } from '../../src/index.js';
import { createDownloadArchive } from './downloadArchive.js';

export function downloadResult(result: ConversionResult): void {
  // Deliver the encoded bytes as a download rather than a previewable image.
  const blob = new Blob([result.buffer], { type: 'application/octet-stream' });
  downloadBlob(blob, result.outputName ?? `converted.${result.extension}`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  // Keep downloads in the current browsing context, including in Firefox.
  anchor.target = '_self';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadResults(results: readonly ConversionResult[]): void {
  if (results.length === 0) return;
  downloadBlob(createDownloadArchive(results), 'pfx-image-studio-images.zip');
}
