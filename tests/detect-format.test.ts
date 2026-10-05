import { describe, expect, it } from 'vitest';
import { detectImageFormat } from '../src/pipeline/detect-format.js';
import { Image3CoreError } from '../src/errors/core-error.js';

function buffer(bytes: number[]): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

describe('detectImageFormat', () => {
  it('detects JPEG from magic bytes', () => {
    expect(detectImageFormat(buffer([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
  });

  it('detects PNG from its signature', () => {
    expect(
      detectImageFormat(buffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('png');
  });

  it('detects WebP from RIFF and WEBP markers', () => {
    expect(
      detectImageFormat(
        buffer([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe('webp');
  });

  it('rejects unknown data', () => {
    expect(() => detectImageFormat(buffer([1, 2, 3, 4]))).toThrowError(
      Image3CoreError,
    );
  });
});
