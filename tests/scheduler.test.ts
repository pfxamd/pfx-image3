import { describe, expect, it } from 'vitest';
import { WeightedScheduler } from '../src/queue/scheduler.js';

describe('WeightedScheduler', () => {
  it('respects pause and resume', async () => {
    const scheduler = new WeightedScheduler({ concurrency: 1, memoryBudgetBytes: 100 });
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
    const scheduler = new WeightedScheduler({ concurrency: 2, memoryBudgetBytes: 10 });
    await expect(scheduler.enqueue(100, async () => 'ok')).resolves.toBe('ok');
  });
});
