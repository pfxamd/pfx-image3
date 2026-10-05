import { describe, expect, it } from 'vitest';
import {
  estimateWorkingSetBytes,
  recommendedWorkerCount,
} from '../src/memory/estimator.js';

describe('memory estimator', () => {
  it('uses decoded RGBA dimensions when known', () => {
    expect(
      estimateWorkingSetBytes({ inputBytes: 1_000, width: 100, height: 50 }),
    ).toBe(61_000);
  });

  it('keeps unknown estimates inside safety bounds', () => {
    expect(estimateWorkingSetBytes({ inputBytes: 100 })).toBe(16 * 1024 * 1024);
    expect(estimateWorkingSetBytes({ inputBytes: 100 * 1024 * 1024 })).toBe(
      256 * 1024 * 1024,
    );
  });

  it('leaves a logical processor free and caps workers', () => {
    expect(recommendedWorkerCount(8)).toBe(4);
    expect(recommendedWorkerCount(2)).toBe(1);
    expect(recommendedWorkerCount(undefined)).toBe(1);
  });
});
