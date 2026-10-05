import type { ImageInput } from '../types/core.js';
import { readImageDimensions } from './dimensions.js';
import { estimateWorkingSetBytes } from './estimator.js';

const HEADER_SCAN_BYTES = 256 * 1024;

export async function estimateInputWorkingSet(input: ImageInput): Promise<number> {
  const inputBytes =
    input.data instanceof ArrayBuffer ? input.data.byteLength : input.data.size;

  const header =
    input.data instanceof ArrayBuffer
      ? input.data
      : await input.data.slice(0, HEADER_SCAN_BYTES).arrayBuffer();

  const dimensions = readImageDimensions(header);

  return estimateWorkingSetBytes({
    inputBytes,
    ...(dimensions ?? {}),
  });
}
