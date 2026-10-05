import { describe, expect, it } from 'vitest';
import { Image3CoreError } from '../src/errors/core-error.js';
import { WeightedScheduler } from '../src/queue/scheduler.js';

describe('WeightedScheduler', () => {
  it('respects pause and resume', async () => {
    const scheduler = new WeightedScheduler({
      concurrency: 1,
      memoryBudgetBytes: 100,
    });
    scheduler.pause();

    let ran = false;
    const job = scheduler.enqueue(10, async () => {
      ran = true;
      return 42;
    });

    await Promise.resolve();
    expect(ran).toBe(false);

    scheduler.resume();
    await expect(job).resolves.toBe(42);
  });

  it('allows an oversized job to run alone', async () => {
    const scheduler = new WeightedScheduler({
      concurrency: 2,
      memoryBudgetBytes: 10,
    });

    await expect(
      scheduler.enqueue(100, async () => 'ok'),
    ).resolves.toBe('ok');
  });

  it('rejects pending and future jobs after close', async () => {
    const scheduler = new WeightedScheduler({
      concurrency: 1,
      memoryBudgetBytes: 100,
    });
    scheduler.pause();

    const error = new Image3CoreError('CANCELLED', 'closed');
    const pending = scheduler.enqueue(10, async () => 'never');

    scheduler.close(error);

    await expect(pending).rejects.toBe(error);
    await expect(
      scheduler.enqueue(10, async () => 'never'),
    ).rejects.toBe(error);

    expect(scheduler.stats.closed).toBe(true);
  });
});
