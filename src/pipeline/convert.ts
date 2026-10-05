import { defaultCodecRegistry, type CodecRegistry } from '../codecs/registry.js';
import { Image3CoreError, throwIfAborted } from '../errors/core-error.js';
import { buildOutputName, outputDescriptor } from '../output/output.js';
import type {
  ConversionOptions,
  ConversionProgress,
  ConversionResult,
  ImageInput,
} from '../types/core.js';
import { detectImageFormat } from './detect-format.js';

export interface ConvertInlineRequest {
  readonly input: ImageInput;
  readonly options: ConversionOptions;
  readonly registry?: CodecRegistry;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: ConversionProgress) => void;
}

export async function convertInline(
  request: ConvertInlineRequest,
): Promise<ConversionResult> {
  const registry = request.registry ?? defaultCodecRegistry;

  report(request, 'validating', 0.05);
  throwIfAborted(request.signal);

  const inputBuffer = await toArrayBuffer(request.input.data);
  if (inputBuffer.byteLength === 0) {
    throw new Image3CoreError('INVALID_FILE', 'Input file is empty.');
  }

  const sourceFormat = detectImageFormat(inputBuffer);
  const sourceCodec = registry.get(sourceFormat);
  const targetCodec = registry.get(request.options.format);

  report(request, 'decoding', 0.2);
  throwIfAborted(request.signal);
  const decoded = await sourceCodec.decode(inputBuffer);

  validateDimensions(decoded.width, decoded.height);
  report(request, 'processing', 0.55);
  throwIfAborted(request.signal);

  report(request, 'encoding', 0.7);
  const encoded = await targetCodec.encode(decoded, request.options);
  throwIfAborted(request.signal);

  const descriptor = outputDescriptor(request.options.format);
  const outputName = buildOutputName(request.input.name, request.options.format);
  const result: ConversionResult = {
    buffer: encoded,
    sourceFormat,
    targetFormat: request.options.format,
    mimeType: descriptor.mimeType,
    extension: descriptor.extension,
    width: decoded.width,
    height: decoded.height,
    inputBytes: inputBuffer.byteLength,
    outputBytes: encoded.byteLength,
    ...(outputName !== undefined ? { outputName } : {}),
  };

  report(request, 'completed', 1);
  return result;
}

async function toArrayBuffer(input: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) return input;
  return input.arrayBuffer();
}

function report(
  request: ConvertInlineRequest,
  stage: ConversionProgress['stage'],
  ratio: number,
): void {
  request.onProgress?.({ stage, ratio });
}

function validateDimensions(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Image3CoreError('DECODE_FAILED', 'Decoded image dimensions are invalid.');
  }
}
