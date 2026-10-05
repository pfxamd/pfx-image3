import { Image3CoreError } from '../errors/core-error.js';

interface QueueItem<T> {
  readonly weightBytes: number;
  readonly task: () => Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
  readonly signal?: AbortSignal;
}

export interface WeightedSchedulerOptions {
  readonly concurrency: number;
  readonly memoryBudgetBytes: number;
}

export class WeightedScheduler {
  private readonly pending: QueueItem<unknown>[] = [];
  private activeCount = 0;
  private activeBytes = 0;
  private paused = false;
  private closedError: unknown;

  constructor(private readonly options: WeightedSchedulerOptions) {
    if (options.concurrency < 1) throw new RangeError('concurrency must be >= 1');
    if (options.memoryBudgetBytes < 1) {
      throw new RangeError('memoryBudgetBytes must be >= 1');
    }
  }

  enqueue<T>(
    weightBytes: number,
    task: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (this.closedError !== undefined) {
      return Promise.reject(this.closedError);
    }

    if (signal?.aborted) {
      return Promise.reject(new Image3CoreError('CANCELLED', 'Job was cancelled.'));
    }

    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        weightBytes: Math.max(1, weightBytes),
        task,
        resolve,
        reject,
        ...(signal ? { signal } : {}),
      };

      this.pending.push(item as QueueItem<unknown>);
      this.pump();
    });
  }

  pause(): void {
    if (this.closedError === undefined) this.paused = true;
  }

  resume(): void {
    if (this.closedError !== undefined) return;
    this.paused = false;
    this.pump();
  }

  close(
    error: unknown = new Image3CoreError('CANCELLED', 'Scheduler was closed.'),
  ): void {
    if (this.closedError !== undefined) return;

    this.closedError = error;
    this.paused = true;

    const pending = this.pending.splice(0);
    for (const item of pending) item.reject(error);
  }

  get stats(): Readonly<{
    pending: number;
    active: number;
    activeBytes: number;
    paused: boolean;
    closed: boolean;
  }> {
    return {
      pending: this.pending.length,
      active: this.activeCount,
      activeBytes: this.activeBytes,
      paused: this.paused,
      closed: this.closedError !== undefined,
    };
  }

  private pump(): void {
    if (this.paused || this.closedError !== undefined) return;

    while (this.activeCount < this.options.concurrency) {
      const index = this.findRunnableIndex();
      if (index < 0) return;

      const [item] = this.pending.splice(index, 1);
      if (!item) return;

      if (item.signal?.aborted) {
        item.reject(new Image3CoreError('CANCELLED', 'Job was cancelled.'));
        continue;
      }

      this.activeCount += 1;
      this.activeBytes += item.weightBytes;

      void item
        .task()
        .then(item.resolve, item.reject)
        .finally(() => {
          this.activeCount -= 1;
          this.activeBytes -= item.weightBytes;
          this.pump();
        });
    }
  }

  private findRunnableIndex(): number {
    for (let index = 0; index < this.pending.length; index += 1) {
      const item = this.pending[index];
      if (!item) continue;

      const fitsBudget =
        this.activeBytes + item.weightBytes <= this.options.memoryBudgetBytes;
      const allowOversizedSoloJob = this.activeCount === 0;

      if (fitsBudget || allowOversizedSoloJob) return index;
    }

    return -1;
  }
}
