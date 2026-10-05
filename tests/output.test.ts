import { describe, expect, it } from 'vitest';
import { buildOutputName } from '../src/output/output.js';

describe('buildOutputName', () => {
  it('replaces the existing extension', () => {
    expect(buildOutputName('photo.png', 'webp')).toBe('photo.webp');
  });

  it('uses jpg for JPEG output', () => {
    expect(buildOutputName('photo.webp', 'jpeg')).toBe('photo.jpg');
  });
});
