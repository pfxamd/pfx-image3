import { Image3CoreError } from '../errors/core-error.js';

export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 2;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('maxAttempts must be an integer >= 1');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      const finalAttempt = attempt === maxAttempts;
      const allowed =
        options.shouldRetry?.(error, attempt) ?? defaultShouldRetry(error);

      if (finalAttempt || !allowed) throw error;
    }
  }

  throw new Error('Unreachable retry state.');
}

function defaultShouldRetry(error: unknown): boolean {
  return (
    !(error instanceof Image3CoreError) ||
    error.code === 'INTERNAL_ERROR'
  );
}
