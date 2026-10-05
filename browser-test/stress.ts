import {
  Image3Core,
  detectImageFormat,
  estimateInputWorkingSet,
} from '../src/index.ts';

declare global {
  interface Window {
    runImage3StressSuite: () => Promise<{
      items: number;
      width: number;
      height: number;
      estimatedWorkingSetBytes: number;
    }>;
  }
}

window.runImage3StressSuite = async () => {
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
    assert(
      detectImageFormat(result.value.buffer) === 'webp',
      'Stress output is not WebP',
    );
    await assertDecodable(result.value.buffer, result.value.mimeType, width, height);
  }

  return {
    items: results.length,
    width,
    height,
    estimatedWorkingSetBytes,
  };
};

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
    assert(bitmap.width === width, 'Stress output width mismatch');
    assert(bitmap.height === height, 'Stress output height mismatch');
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
      else reject(new Error('Browser could not encode stress source'));
    }, mimeType);
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
