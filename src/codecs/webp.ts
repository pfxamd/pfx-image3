import { Image3CoreError, toCoreError } from '../errors/core-error.js';
import type { ConversionOptions } from '../types/core.js';
import {
  clampQuality,
  fromImageData,
  type ImageCodec,
  toImageData,
} from './codec.js';

export const webpCodec: ImageCodec = {
  format: 'webp',
  capabilities: {
    format: 'webp',
    mimeType: 'image/webp',
    extensions: ['webp'],
    supportsAlpha: true,
    lossless: 'optional',
    qualityRange: [1, 100],
  },

  async decode(input) {
    try {
      const { decode } = await import('@jsquash/webp');
      const image = await decode(input);
      return fromImageData(image);
    } catch (error) {
      throw toCoreError(error, 'DECODE_FAILED', 'WebP decoding failed.');
    }
  },

  async encode(image, options) {
    if (options.format !== 'webp') {
      throw new Image3CoreError('INTERNAL_ERROR', 'WebP codec received invalid options.');
    }

    try {
      const { encode } = await import('@jsquash/webp');
      return await encode(toImageData(image), {
        quality: clampQuality(options.quality),
        lossless: options.lossless ? 1 : 0,
        method: options.method ?? 4,
      });
    } catch (error) {
      throw toCoreError(error, 'ENCODE_FAILED', 'WebP encoding failed.');
    }
  },
};
