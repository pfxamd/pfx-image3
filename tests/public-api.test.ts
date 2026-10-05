import { describe, expect, it } from 'vitest';
import * as publicApi from '../src/index.js';

describe('PFx Image3 v0.1 public API', () => {
  it('exposes only the stable runtime surface', () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      'CodecRegistry',
      'Image3Core',
      'Image3CoreError',
      'Image3WorkerPool',
      'createOutputBlob',
    ]);
  });
});
