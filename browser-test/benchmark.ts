import { convertInline, detectImageFormat } from '../src/index.ts';

declare global {
  interface Window {
    runImage3Benchmark: () => Promise<
      Readonly<Record<'jpeg' | 'png' | 'webp', {
        durationMs: number;
        outputBytes: number;
      }>>
    >;
  }
}

window.runImage3Benchmark = async () => {
  const source = await makePngSource(640, 480);
  const targets = {
    jpeg: { format: 'jpeg', quality: 82, background: [255, 255, 255] as const },
    png: { format: 'png', compressionLevel: 2 as const },
    webp: { format: 'webp', quality: 82, lossless: false },
  } as const;

  const report = {} as Record<'jpeg' | 'png' | 'webp', {
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

    assert(converted.outputBytes > 0, 'Benchmark output is empty');
    assert(
      detectImageFormat(converted.buffer) === target,
      'Benchmark output format mismatch',
    );

    report[target] = {
      durationMs: Math.round(durationMs * 100) / 100,
      outputBytes: converted.outputBytes,
    };
  }

  return report;
};

async function makePngSource(width: number, height: number): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  assert(context, '2D canvas is unavailable');

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f73359');
  gradient.addColorStop(0.5, '#2a7af4');
  gradient.addColorStop(1, '#31cf91');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 12) {
    for (let x = 0; x < width; x += 12) {
      const value = (x * 11 + y * 23) % 255;
      context.fillStyle = `rgb(${value}, ${255 - value}, ${(value * 7) % 255})`;
      context.fillRect(x, y, 5, 5);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('Browser could not create benchmark source'));
    }, 'image/png');
  });

  return blob.arrayBuffer();
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
