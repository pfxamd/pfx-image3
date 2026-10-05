import {
  Image3Core,
  Image3CoreError,
  convertInline,
  detectImageFormat,
  withRetry,
} from '../src/index.ts';

declare global {
  interface Window {
    runImage3EdgeSuite: () => Promise<{
      corrupted: readonly string[];
      cancelled: boolean;
      retryAttempts: number;
    }>;
  }
}

window.runImage3EdgeSuite = async () => {
  const corrupted: string[] = [];

  try {
    await convertInline({
      input: { data: Uint8Array.from([1, 2, 3, 4, 5]).buffer },
      options: { format: 'webp', quality: 80 },
    });
    throw new Error('Unknown data unexpectedly converted');
  } catch (error) {
    assert(error instanceof Image3CoreError, 'Unknown data returned an untyped error');
    assert(error.code === 'UNSUPPORTED_FORMAT', 'Unexpected unknown-data code');
    corrupted.push(error.code);
  }

  const fakeJpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xd9,
  ]).buffer;

  assert(detectImageFormat(fakeJpeg) === 'jpeg', 'Fake JPEG signature was not detected');

  try {
    await convertInline({
      input: { data: fakeJpeg },
      options: { format: 'png', compressionLevel: 2 },
    });
    throw new Error('Corrupted JPEG unexpectedly converted');
  } catch (error) {
    assert(error instanceof Image3CoreError, 'Corrupted JPEG returned an untyped error');
    assert(error.code === 'DECODE_FAILED', 'Unexpected corrupted-JPEG code');
    corrupted.push(error.code);
  }

  const controller = new AbortController();
  controller.abort();
  let cancelled = false;

  try {
    await new Image3Core().convert({
      input: { data: fakeJpeg },
      options: { format: 'webp', quality: 80 },
      signal: controller.signal,
    });
  } catch (error) {
    assert(error instanceof Image3CoreError, 'Cancellation returned an untyped error');
    assert(error.code === 'CANCELLED', 'Unexpected cancellation code');
    cancelled = true;
  }

  let retryAttempts = 0;
  const value = await withRetry(async () => {
    retryAttempts += 1;
    if (retryAttempts === 1) {
      throw new Image3CoreError('INTERNAL_ERROR', 'Simulated transient failure');
    }
    return 'recovered';
  });

  assert(value === 'recovered', 'Retry did not recover');

  return { corrupted, cancelled, retryAttempts };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
