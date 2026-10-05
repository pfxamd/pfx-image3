export type CoreErrorCode =
  | 'INVALID_FILE'
  | 'UNSUPPORTED_FORMAT'
  | 'DECODE_FAILED'
  | 'ENCODE_FAILED'
  | 'OUT_OF_MEMORY'
  | 'CANCELLED'
  | 'INTERNAL_ERROR';

export class Image3CoreError extends Error {
  readonly code: CoreErrorCode;
  readonly cause?: unknown;

  constructor(code: CoreErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'Image3CoreError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export function toCoreError(
  error: unknown,
  fallbackCode: CoreErrorCode,
  fallbackMessage: string,
): Image3CoreError {
  if (error instanceof Image3CoreError) return error;
  return new Image3CoreError(fallbackCode, fallbackMessage, error);
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Image3CoreError('CANCELLED', 'Conversion was cancelled.');
  }
}
