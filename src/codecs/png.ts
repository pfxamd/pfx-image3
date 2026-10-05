import { Image3CoreError, toCoreError } from '../errors/core-error.js';
import type { ConversionOptions } from '../types/core.js';
import { fromImageData, type ImageCodec, toImageData } from './codec.js';

export const pngCodec: ImageCodec = {
  format: 'png',
  capabilities: {
    format: 'png',
    mimeType: 'image/png',
    extensions: ['png'],
    supportsAlpha: true,
    lossless: true,
  },

  async decode(input) {
    try {
      const { decode } = await import('@jsquash/png');
      const image = await decode(input, { bitDepth: 8 });
      return fromImageData(image as ImageData);
    } catch (error) {
      throw toCoreError(error, 'DECODE_FAILED', 'PNG decoding failed.');
    }
  },

  async encode(image, options) {
    if (options.format !== 'png') {
      throw new Image3CoreError('INTERNAL_ERROR', 'PNG codec received invalid options.');
    }

    try {
      const { optimise } = await import('@jsquash/oxipng');
      return await optimise(toImageData(image), {
        level: options.compressionLevel ?? 2,
        interlace: options.interlace ?? false,
        optimiseAlpha: options.optimiseAlpha ?? false,
      });
    } catch (error) {
      throw toCoreError(error, 'ENCODE_FAILED', 'PNG encoding failed.');
    }
  },
};
