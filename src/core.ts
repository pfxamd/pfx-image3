import { defaultCodecRegistry, type CodecRegistry } from './codecs/registry.js';
import {
  DEFAULT_MEMORY_BUDGET_BYTES,
  recommendedWorkerCount,
} from './memory/estimator.js';
import { estimateInputWorkingSet } from './memory/preflight.js';
import { convertInline } from './pipeline/convert.js';
import { WeightedScheduler } from './queue/scheduler.js';
import { withRetry, type RetryOptions } from './retry/retry.js';
import type {
  BatchConvertRequest,
  ConvertRequest,
  ConversionResult,
} from './types/core.js';

export interface Image3CoreOptions {
  readonly registry?: CodecRegistry;
  readonly concurrency?: number;
  readonly memoryBudgetBytes?: number;
}

export class Image3Core {
  readonly registry: CodecRegistry;
  private readonly scheduler: WeightedScheduler;

  constructor(options: Image3CoreOptions = {}) {
    this.registry = options.registry ?? defaultCodecRegistry;
    const concurrency =
      options.concurrency ??
      recommendedWorkerCount(
        typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency,
      );

    this.scheduler = new WeightedScheduler({
      concurrency,
      memoryBudgetBytes:
        options.memoryBudgetBytes ?? DEFAULT_MEMORY_BUDGET_BYTES,
    });
  }

  async convert(request: ConvertRequest): Promise<ConversionResult> {
    const weightBytes = await estimateInputWorkingSet(request.input);

    return this.scheduler.enqueue(
      weightBytes,
      () =>
        convertInline({
          input: request.input,
          options: request.options,
          registry: this.registry,
          ...(request.signal ? { signal: request.signal } : {}),
          ...(request.onProgress ? { onProgress: request.onProgress } : {}),
        }),
      request.signal,
    );
  }

  convertWithRetry(
    request: ConvertRequest,
    retryOptions: RetryOptions = {},
  ): Promise<ConversionResult> {
    return withRetry(() => this.convert(request), retryOptions);
  }

  async convertBatch(
    request: BatchConvertRequest,
  ): Promise<readonly PromiseSettledResult<ConversionResult>[]> {
    const jobs = request.inputs.map((input, index) =>
      this.convert({
        input,
        options: request.options,
        ...(request.signal ? { signal: request.signal } : {}),
        ...(request.onItemProgress
          ? {
              onProgress: (progress) => request.onItemProgress?.(index, progress),
            }
          : {}),
      }),
    );

    return Promise.allSettled(jobs);
  }

  pause(): void {
    this.scheduler.pause();
  }

  resume(): void {
    this.scheduler.resume();
  }

  getCapabilities() {
    return this.registry.getCapabilities();
  }

  getSupportedFormats() {
    return this.registry.getSupportedFormats();
  }
}
