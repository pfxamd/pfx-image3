import { describe, expect, it } from 'vitest';
import { CodecRegistry } from '../src/codecs/registry.js';

describe('CodecRegistry', () => {
  it('registers the three Image3 formats', () => {
    const registry = new CodecRegistry();
    expect(registry.getSupportedFormats()).toEqual(['jpeg', 'png', 'webp']);
  });

  it('reports format capabilities', () => {
    const registry = new CodecRegistry();
    const capabilities = registry.getCapabilities();

    expect(capabilities.find((item) => item.format === 'jpeg')?.supportsAlpha).toBe(false);
    expect(capabilities.find((item) => item.format === 'png')?.lossless).toBe(true);
    expect(capabilities.find((item) => item.format === 'webp')?.lossless).toBe('optional');
  });
});
