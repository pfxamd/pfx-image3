import { describe, expect, it } from 'vitest';
import { Image3CoreError } from '../src/errors/core-error.js';
import { withRetry } from '../src/retry/retry.js';

describe('withRetry', () => {
  it('retries transient internal failures', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Image3CoreError('INTERNAL_ERROR', 'transient');
      }
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it.each([
    'CANCELLED',
    'INVALID_FILE',
    'UNSUPPORTED_FORMAT',
    'DECODE_FAILED',
    'ENCODE_FAILED',
    'OUT_OF_MEMORY',
  ] as const)('does not retry %s errors by default', async (code) => {
    let attempts = 0;

    await expect(
      withRetry(async () => {
        attempts += 1;
        throw new Image3CoreError(code, 'deterministic');
      }),
    ).rejects.toMatchObject({ code });

    expect(attempts).toBe(1);
  });
});
