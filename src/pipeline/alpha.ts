import type { RGB, RawImage } from '../types/core.js';

export function flattenAlpha(
  image: RawImage,
  background: RGB = [255, 255, 255],
): RawImage {
  const output = new Uint8ClampedArray(image.data.length);
  const bgR = clampByte(background[0]);
  const bgG = clampByte(background[1]);
  const bgB = clampByte(background[2]);

  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index] ?? 0;
    const green = image.data[index + 1] ?? 0;
    const blue = image.data[index + 2] ?? 0;
    const alphaByte = image.data[index + 3] ?? 255;
    const alpha = alphaByte / 255;
    const inverse = 1 - alpha;

    output[index] = Math.round(red * alpha + bgR * inverse);
    output[index + 1] = Math.round(green * alpha + bgG * inverse);
    output[index + 2] = Math.round(blue * alpha + bgB * inverse);
    output[index + 3] = 255;
  }

  return {
    data: output,
    width: image.width,
    height: image.height,
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
