import { describe, expect, it } from 'vitest';
import { flattenAlpha } from '../src/pipeline/alpha.js';

describe('flattenAlpha', () => {
  it('composites transparency onto the requested background', () => {
    const result = flattenAlpha(
      {
        data: new Uint8ClampedArray([255, 0, 0, 128]),
        width: 1,
        height: 1,
      },
      [0, 0, 0],
    );

    expect([...result.data]).toEqual([128, 0, 0, 255]);
  });

  it('preserves opaque pixels', () => {
    const result = flattenAlpha({
      data: new Uint8ClampedArray([5, 10, 15, 255]),
      width: 1,
      height: 1,
    });

    expect([...result.data]).toEqual([5, 10, 15, 255]);
  });
});
