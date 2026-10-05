import { describe, expect, it } from 'vitest';
import { WeightedScheduler } from '../src/queue/scheduler.js';

describe('WeightedScheduler memory budget', () => {
  it('does not overlap jobs whose combined weights exceed the budget', async () => {
    const scheduler = new WeightedScheduler({
      concurrency: 3,
      memoryBudgetBytes: 100,
    });

    let active = 0;
    let maxActive = 0;

    const run = (weight: number) =>
      scheduler.enqueue(weight, async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
      });

    await Promise.all([run(60), run(60), run(60)]);
    expect(maxActive).toBe(1);
  });

  it('allows safe jobs to use concurrency within the budget', async () => {
    const scheduler = new WeightedScheduler({
      concurrency: 3,
      memoryBudgetBytes: 100,
    });

    let active = 0;
    let maxActive = 0;

    const run = () =>
      scheduler.enqueue(30, async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
      });

    await Promise.all([run(), run(), run()]);
    expect(maxActive).toBe(3);
  });
});
