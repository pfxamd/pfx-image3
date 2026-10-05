import { describe, expect, it } from 'vitest';
import { Image3CoreError } from '../src/errors/core-error.js';
import { withRetry } from '../src/retry/retry.js';

describe('withRetry', () => {
  it('retries transient failures', async () => {
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

  it('does not retry cancellation', async () => {
    let attempts = 0;

    await expect(
      withRetry(async () => {
        attempts += 1;
        throw new Image3CoreError('CANCELLED', 'cancelled');
      }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });

    expect(attempts).toBe(1);
  });
});
