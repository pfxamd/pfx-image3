import { Image3CoreError } from '../errors/core-error.js';
import type { CodecCapabilities, ImageFormat } from '../types/core.js';
import type { ImageCodec } from './codec.js';
import { jpegCodec } from './jpeg.js';
import { pngCodec } from './png.js';
import { webpCodec } from './webp.js';

export class CodecRegistry {
  private readonly codecs = new Map<ImageFormat, ImageCodec>();

  constructor(codecs: readonly ImageCodec[] = [jpegCodec, pngCodec, webpCodec]) {
    for (const codec of codecs) this.register(codec);
  }

  register(codec: ImageCodec): void {
    this.codecs.set(codec.format, codec);
  }

  get(format: ImageFormat): ImageCodec {
    const codec = this.codecs.get(format);
    if (!codec) {
      throw new Image3CoreError(
        'UNSUPPORTED_FORMAT',
        `No codec registered for ${format}.`,
      );
    }
    return codec;
  }

  getCapabilities(): readonly CodecCapabilities[] {
    return [...this.codecs.values()].map((codec) => codec.capabilities);
  }

  getSupportedFormats(): readonly ImageFormat[] {
    return [...this.codecs.keys()];
  }
}

export const defaultCodecRegistry = new CodecRegistry();
