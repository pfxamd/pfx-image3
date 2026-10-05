export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export type RGB = readonly [red: number, green: number, blue: number];

export interface RawImage {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
}

export interface ImageInput {
  readonly data: Blob | ArrayBuffer;
  readonly name?: string;
  readonly mimeType?: string;
}

export interface JpegTargetOptions {
  readonly format: 'jpeg';
  readonly quality?: number;
  readonly background?: RGB;
  readonly progressive?: boolean;
}

export interface PngTargetOptions {
  readonly format: 'png';
  readonly compressionLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly optimiseAlpha?: boolean;
  readonly interlace?: boolean;
}

export interface WebpTargetOptions {
  readonly format: 'webp';
  readonly quality?: number;
  readonly lossless?: boolean;
  readonly method?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export type ConversionOptions =
  | JpegTargetOptions
  | PngTargetOptions
  | WebpTargetOptions;

export interface CodecCapabilities {
  readonly format: ImageFormat;
  readonly mimeType: ImageMimeType;
  readonly extensions: readonly string[];
  readonly supportsAlpha: boolean;
  readonly lossless: boolean | 'optional';
  readonly qualityRange?: readonly [min: number, max: number];
}

export type ConversionStage =
  | 'validating'
  | 'decoding'
  | 'processing'
  | 'encoding'
  | 'completed';

export interface ConversionProgress {
  readonly stage: ConversionStage;
  readonly ratio: number;
}

export interface ConversionResult {
  readonly buffer: ArrayBuffer;
  readonly sourceFormat: ImageFormat;
  readonly targetFormat: ImageFormat;
  readonly mimeType: ImageMimeType;
  readonly extension: string;
  readonly width: number;
  readonly height: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly outputName?: string;
}

export interface ConvertRequest {
  readonly input: ImageInput;
  readonly options: ConversionOptions;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: ConversionProgress) => void;
}

export interface BatchConvertRequest {
  readonly inputs: readonly ImageInput[];
  readonly options: ConversionOptions;
  readonly signal?: AbortSignal;
  readonly onItemProgress?: (
    index: number,
    progress: ConversionProgress,
  ) => void;
}
