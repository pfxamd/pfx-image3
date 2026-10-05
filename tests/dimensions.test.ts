import { describe, expect, it } from 'vitest';
import { readImageDimensions } from '../src/memory/dimensions.js';

describe('readImageDimensions', () => {
  it('reads PNG IHDR dimensions', () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    new DataView(bytes.buffer).setUint32(16, 1920);
    new DataView(bytes.buffer).setUint32(20, 1080);

    expect(readImageDimensions(bytes.buffer)).toEqual({ width: 1920, height: 1080 });
  });

  it('reads JPEG SOF dimensions', () => {
    const bytes = Uint8Array.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x0b, 0x08,
      0x04, 0x38,
      0x07, 0x80,
      0x03, 0x01, 0x11, 0x00,
      0xff, 0xd9,
    ]);

    expect(readImageDimensions(bytes.buffer)).toEqual({ width: 1920, height: 1080 });
  });

  it('reads WebP VP8X dimensions', () => {
    const bytes = new Uint8Array(30);
    bytes.set(new TextEncoder().encode('RIFF'), 0);
    bytes.set(new TextEncoder().encode('WEBP'), 8);
    bytes.set(new TextEncoder().encode('VP8X'), 12);

    const widthMinusOne = 1919;
    const heightMinusOne = 1079;
    bytes[24] = widthMinusOne & 0xff;
    bytes[25] = (widthMinusOne >>> 8) & 0xff;
    bytes[26] = (widthMinusOne >>> 16) & 0xff;
    bytes[27] = heightMinusOne & 0xff;
    bytes[28] = (heightMinusOne >>> 8) & 0xff;
    bytes[29] = (heightMinusOne >>> 16) & 0xff;

    expect(readImageDimensions(bytes.buffer)).toEqual({ width: 1920, height: 1080 });
  });
});
