import {
  Image3Core,
  Image3WorkerPool,
  type ConversionOptions,
  type ImageFormat,
} from '../src/index.ts';
import { convertInline } from '../src/pipeline/convert.ts';
import { detectImageFormat } from '../src/pipeline/detect-format.ts';

type BrowserSuiteReport = {
  readonly matrix: readonly string[];
  readonly workerTargets: readonly string[];
  readonly batchCount: number;
  readonly alpha: {
    readonly png: number;
    readonly webp: number;
    readonly jpegBackgroundDistance: number;
  };
  readonly quality: {
    readonly jpegLow: number;
    readonly jpegHigh: number;
    readonly webpLow: number;
    readonly webpHigh: number;
  };
};

declare global {
  interface Window {
    runImage3BrowserSuite: () => Promise<BrowserSuiteReport>;
  }
}

const formats: readonly ImageFormat[] = ['jpeg', 'png', 'webp'];

window.runImage3BrowserSuite = async () => {
  const sources = new Map<ImageFormat, ArrayBuffer>();

  for (const format of formats) {
    const source = await makeSource(format);
    assert(detectImageFormat(source) === format, `native ${format} source detection failed`);
    sources.set(format, source);
  }

  const matrix: string[] = [];
  for (const sourceFormat of formats) {
    const source = sources.get(sourceFormat);
    assert(source, `missing ${sourceFormat} source`);

    for (const targetFormat of formats) {
      const result = await convertInline({
        input: {
          data: source.slice(0),
          name: `source.${sourceFormat === 'jpeg' ? 'jpg' : sourceFormat}`,
        },
        options: optionsFor(targetFormat),
      });

      assert(result.sourceFormat === sourceFormat, 'source format mismatch');
      assert(result.targetFormat === targetFormat, 'target format mismatch');
      assert(detectImageFormat(result.buffer) === targetFormat, 'output signature mismatch');
      await assertDecodable(result.buffer, result.mimeType, 96, 64);
      matrix.push(`${sourceFormat}->${targetFormat}`);
    }
  }

  const alpha = await testAlphaPolicies(sources.get('png')!);
  const quality = await testQualityControls(sources.get('png')!);
  const workerTargets = await testWorkerPool(sources.get('png')!);
  const batchCount = await testBatch(sources);

  return { matrix, workerTargets, batchCount, alpha, quality };
};

async function makeSource(format: ImageFormat): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 64;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  assert(context, '2D canvas is unavailable');

  context.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(24, 0, 96, 64);
  gradient.addColorStop(0, 'rgb(245, 52, 82)');
  gradient.addColorStop(0.5, 'rgb(42, 122, 246)');
  gradient.addColorStop(1, 'rgb(44, 210, 142)');
  context.fillStyle = gradient;
  context.fillRect(24, 0, 72, 64);

  context.fillStyle = 'rgba(255, 220, 30, 0.45)';
  context.fillRect(32, 12, 38, 38);

  for (let y = 0; y < 64; y += 4) {
    for (let x = 24; x < 96; x += 4) {
      const value = (x * 17 + y * 29) % 255;
      context.fillStyle = `rgba(${value},${255 - value},${(value * 3) % 255},0.2)`;
      context.fillRect(x, y, 2, 2);
    }
  }

  const mime = mimeFor(format);
  const blob = await canvasToBlob(canvas, mime, 0.92);
  const buffer = await blob.arrayBuffer();

  assert(detectImageFormat(buffer) === format, `browser failed to encode ${format}`);
  return buffer;
}

async function testAlphaPolicies(pngSource: ArrayBuffer) {
  const png = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'png', compressionLevel: 2 },
  });
  const pngAlpha = await alphaAt(png.buffer, png.mimeType, 2, 2);
  assert(pngAlpha === 0, `PNG alpha was not preserved: ${pngAlpha}`);

  const webp = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'webp', lossless: true, quality: 100 },
  });
  const webpAlpha = await alphaAt(webp.buffer, webp.mimeType, 2, 2);
  assert(webpAlpha === 0, `WebP alpha was not preserved: ${webpAlpha}`);

  const background = [12, 34, 56] as const;
  const jpeg = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'jpeg', quality: 95, background },
  });
  const pixel = await pixelAt(jpeg.buffer, jpeg.mimeType, 2, 2);
  const distance =
    Math.abs(pixel[0] - background[0]) +
    Math.abs(pixel[1] - background[1]) +
    Math.abs(pixel[2] - background[2]);
  assert(distance <= 45, `JPEG alpha flattening drifted too far: ${distance}`);

  return {
    png: pngAlpha,
    webp: webpAlpha,
    jpegBackgroundDistance: distance,
  };
}

async function testQualityControls(pngSource: ArrayBuffer) {
  const jpegLow = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'jpeg', quality: 20 },
  });
  const jpegHigh = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'jpeg', quality: 92 },
  });
  assert(jpegLow.outputBytes < jpegHigh.outputBytes, 'JPEG quality does not affect output size');

  const webpLow = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'webp', quality: 20, lossless: false },
  });
  const webpHigh = await convertInline({
    input: { data: pngSource.slice(0) },
    options: { format: 'webp', quality: 92, lossless: false },
  });
  assert(webpLow.outputBytes < webpHigh.outputBytes, 'WebP quality does not affect output size');

  return {
    jpegLow: jpegLow.outputBytes,
    jpegHigh: jpegHigh.outputBytes,
    webpLow: webpLow.outputBytes,
    webpHigh: webpHigh.outputBytes,
  };
}

async function testWorkerPool(pngSource: ArrayBuffer): Promise<string[]> {
  const pool = new Image3WorkerPool({
    workerFactory: () =>
      new Worker(new URL('../src/workers/conversion.worker.ts', import.meta.url), {
        type: 'module',
      }),
    size: 2,
    memoryBudgetBytes: 64 * 1024 * 1024,
  });

  const passed: string[] = [];
  try {
    for (const target of formats) {
      const original = pngSource.slice(0);
      const originalBytes = original.byteLength;
      const result = await pool.convert(
        { data: original, name: 'worker-source.png' },
        optionsFor(target),
      );

      assert(original.byteLength === originalBytes, 'worker detached caller-owned input');
      assert(detectImageFormat(result.buffer) === target, 'worker output format mismatch');
      passed.push(target);
    }
  } finally {
    pool.terminate();
  }

  return passed;
}

async function testBatch(sources: ReadonlyMap<ImageFormat, ArrayBuffer>): Promise<number> {
  const core = new Image3Core({
    concurrency: 2,
    memoryBudgetBytes: 64 * 1024 * 1024,
  });

  const progress = new Set<number>();
  const results = await core.convertBatch({
    inputs: formats.map((format) => ({
      data: sources.get(format)!.slice(0),
      name: `batch.${format}`,
    })),
    options: { format: 'webp', quality: 80 },
    onItemProgress: (index, item) => {
      if (item.stage === 'completed') progress.add(index);
    },
  });

  assert(results.every((result) => result.status === 'fulfilled'), 'batch conversion failed');
  assert(progress.size === formats.length, 'batch progress did not complete');
  return results.length;
}

function optionsFor(format: ImageFormat): ConversionOptions {
  switch (format) {
    case 'jpeg':
      return { format: 'jpeg', quality: 82, background: [250, 250, 250] };
    case 'png':
      return { format: 'png', compressionLevel: 2 };
    case 'webp':
      return { format: 'webp', quality: 82, lossless: false };
  }
}

async function assertDecodable(
  buffer: ArrayBuffer,
  mimeType: string,
  width: number,
  height: number,
): Promise<void> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));
  try {
    assert(bitmap.width === width, `decoded width mismatch: ${bitmap.width}`);
    assert(bitmap.height === height, `decoded height mismatch: ${bitmap.height}`);
  } finally {
    bitmap.close();
  }
}

async function alphaAt(
  buffer: ArrayBuffer,
  mimeType: string,
  x: number,
  y: number,
): Promise<number> {
  return (await pixelAt(buffer, mimeType, x, y))[3];
}

async function pixelAt(
  buffer: ArrayBuffer,
  mimeType: string,
  x: number,
  y: number,
): Promise<[number, number, number, number]> {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    assert(context, '2D canvas is unavailable');
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(x, y, 1, 1).data;
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0];
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error(`Browser could not encode ${mimeType}`));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function mimeFor(format: ImageFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  return `image/${format}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
