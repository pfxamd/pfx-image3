import type {
  CodecCapabilities,
  ConversionOptions,
  ImageFormat,
  RawImage,
} from '../types/core.js';

export interface ImageCodec {
  readonly format: ImageFormat;
  readonly capabilities: CodecCapabilities;
  decode(input: ArrayBuffer): Promise<RawImage>;
  encode(image: RawImage, options: ConversionOptions): Promise<ArrayBuffer>;
}

export function toImageData(image: RawImage): ImageData {
  return new ImageData(image.data, image.width, image.height);
}

export function fromImageData(image: ImageData): RawImage {
  return {
    data: new Uint8ClampedArray(image.data),
    width: image.width,
    height: image.height,
  };
}

export function clampQuality(value: number | undefined, fallback = 82): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return Math.max(1, Math.min(100, Math.round(value)));
}
