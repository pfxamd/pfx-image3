import { createOutputBlob, type ConversionResult } from '../../src/index.js';

export function downloadResult(result: ConversionResult): void {
  const blob = createOutputBlob(result);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = result.outputName ?? `converted.${result.extension}`;
  // Keep downloads in the current browsing context, including in Firefox.
  anchor.target = '_self';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadResults(results: readonly ConversionResult[]): void {
  results.forEach((result, index) => {
    window.setTimeout(() => downloadResult(result), index * 180);
  });
}
