import { Image3CoreError, toCoreError } from '../errors/core-error.js';
import { flattenAlpha } from '../pipeline/alpha.js';
import type { ConversionOptions } from '../types/core.js';
import {
  clampQuality,
  fromImageData,
  type ImageCodec,
  toImageData,
} from './codec.js';

export const jpegCodec: ImageCodec = {
  format: 'jpeg',
  capabilities: {
    format: 'jpeg',
    mimeType: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    supportsAlpha: false,
    lossless: false,
    qualityRange: [1, 100],
  },

  async decode(input) {
    try {
      const { decode } = await import('@jsquash/jpeg');
      const image = await decode(input, { preserveOrientation: true });
      return fromImageData(image);
    } catch (error) {
      throw toCoreError(error, 'DECODE_FAILED', 'JPEG decoding failed.');
    }
  },

  async encode(image, options) {
    if (options.format !== 'jpeg') {
      throw new Image3CoreError('INTERNAL_ERROR', 'JPEG codec received invalid options.');
    }

    const prepared = flattenAlpha(image, options.background);

    try {
      const { encode } = await import('@jsquash/jpeg');
      return await encode(toImageData(prepared), {
        quality: clampQuality(options.quality),
        progressive: options.progressive ?? true,
      });
    } catch (error) {
      throw toCoreError(error, 'ENCODE_FAILED', 'JPEG encoding failed.');
    }
  },
};
