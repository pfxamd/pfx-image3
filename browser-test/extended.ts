import {
  Image3Core,
  Image3CoreError,
  convertInline,
  detectImageFormat,
  estimateInputWorkingSet,
  withRetry,
} from '../src/index.ts';

type EdgeStressReport = {
  readonly corrupted: readonly string[];
  readonly cancelled: boolean;
  readonly retryAttempts: number;
  readonly stress: {
    readonly items: number;
    readonly width: number;
    readonly height: number;
    readonly estimatedWorkingSetBytes: number;
  };
  readonly benchmark: Readonly<Record<'jpeg' | 'png' | 'webp', {
    readonly durationMs: number;
    readonly outputBytes: number;
  }>>;
};

declare global {
  interface Window {
    runImage3EdgeStressSuite: () => Promise<EdgeStressReport>;
  }
}

window.runImage3EdgeStressSuite = async () => {
  const corrupted = await testCorruptedInputs();
  const cancelled = await testCancellation();
  const retryAttempts = await testRetry();
  const stress = await testStressBatch();
  const benchmark = await runBenchmark();

  return { corrupted, cancelled, retryAttempts, stress, benchmark };
};

async function testCorruptedInputs(): Promise<string[]> {
  const codes: string[] = [];

  try {
    await convertInline({
      input: { data: Uint8Array.from([1, 2, 3, 4, 5]).buffer },
      options: { format: 'webp', quality: 80 },
    });
    throw new Error('Unknown data unexpectedly converted');
  } catch (error) {
    assert(error instanceof Image3CoreError, 'Unknown data returned an untyped error');
    assert(error.code === 'UNSUPPORTED_FORMAT', `Unexpected unknown-data code: ${error.code}`);
    codes.push(error.code);
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
    assert(error.code === 'DECODE_FAILED', `Unexpected corrupt-JPEG code: ${error.code}`);
    codes.push(error.code);
  }

  return codes;
}

async function testCancellation(): Promise<boolean> {
  const source = await makePngSource(512, 384);
  const core = new Image3Core({ concurrency: 1 });
  const controller = new AbortController();
  controller.abort();

  try {
    await core.convert({
      input: { data: source },
      options: { format: 'webp', quality: 80 },
      signal: controller.signal,
    });
  } catch (error) {
    assert(error instanceof Image3CoreError, 'Cancellation returned an untyped error');
    assert(error.code === 'CANCELLED', `Unexpected cancellation code: ${error.code}`);
    return true;
  }

  throw new Error('Cancelled conversion unexpectedly completed');
}

async function testRetry(): Promise<number> {
  let attempts = 0;

  const value = await withRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Image3CoreError('INTERNAL_ERROR', 'Simulated transient failure');
    }
    return 'recovered';
  });

  assert(value === 'recovered', 'Retry did not recover');
  assert(attempts === 2, `Unexpected retry attempts: ${attempts}`);
  return attempts;
}

async function testStressBatch() {
  const width = 1280;
  const height = 960;
  const source = await makePngSource(width, height);
  const estimatedWorkingSetBytes = await estimateInputWorkingSet({ data: source });

  assert(
    estimatedWorkingSetBytes >= width * height * 4 * 3,
    'Dimension-aware memory estimate is too small',
  );

  const core = new Image3Core({
    concurrency: 3,
    memoryBudgetBytes: 24 * 1024 * 1024,
  });

  const inputs = Array.from({ length: 6 }, (_, index) => ({
    data: source.slice(0),
    name: `stress-${index}.png`,
  }));

  const results = await core.convertBatch({
    inputs,
    options: { format: 'webp', quality: 76, lossless: false },
  });

  assert(results.length === inputs.length, 'Stress batch result count mismatch');

  for (const result of results) {
    assert(result.status === 'fulfilled', 'Stress batch item failed');
    assert(detectImageFormat(result.value.buffer) === 'webp', 'Stress output is not WebP');
    await assertDecodable(result.value.buffer, result.value.mimeType, width, height);
  }

  return {
    items: results.length,
    width,
    height,
    estimatedWorkingSetBytes,
  };
}

async function runBenchmark(): Promise<EdgeStressReport['benchmark']> {
  const source = await makePngSource(640, 480);
  const targets = {
    jpeg: { format: 'jpeg', quality: 82, background: [255, 255, 255] as const },
    png: { format: 'png', compressionLevel: 2 as const },
    webp: { format: 'webp', quality: 82, lossless: false },
  } as const;

  const result = {} as Record<'jpeg' | 'png' | 'webp', {
    durationMs: number;
    outputBytes: number;
  }>;

  for (const target of ['jpeg', 'png', 'webp'] as const) {
    const start = performance.now();
    const converted = await convertInline({
      input: { data: source.slice(0), name: 'benchmark.png' },
      options: targets[target],
    });
    const durationMs = performance.now() - start;

    assert(durationMs >= 0, 'Benchmark duration is invalid');
    assert(converted.outputBytes > 0, 'Benchmark output is empty');
    assert(detectImageFormat(converted.buffer) === target, 'Benchmark output format mismatch');

    result[target] = {
      durationMs: Math.round(durationMs * 100) / 100,
      outputBytes: converted.outputBytes,
    };
  }

  return result;
}

async function makePngSource(width: number, height: number): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  assert(context, '2D canvas is unavailable');

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#ff355e');
  gradient.addColorStop(0.5, '#2678f6');
  gradient.addColorStop(1, '#2cd28e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const step = Math.max(8, Math.floor(width / 64));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const value = (x * 13 + y * 31) % 255;
      context.fillStyle = `rgba(${value}, ${255 - value}, ${(value * 5) % 255}, 0.35)`;
      context.fillRect(x, y, Math.max(2, step / 2), Math.max(2, step / 2));
    }
  }

  const blob = await canvasToBlob(canvas, 'image/png');
  return blob.arrayBuffer();
}

async function assertDecodable(
  buffer: ArrayBuffer,
  mimeType: string,
  width: number,
  height: number,
): Promise<void> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));
  try {
    assert(bitmap.width === width, `Width mismatch: ${bitmap.width}`);
    assert(bitmap.height === height, `Height mismatch: ${bitmap.height}`);
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Browser could not encode ${mimeType}`));
    }, mimeType);
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
